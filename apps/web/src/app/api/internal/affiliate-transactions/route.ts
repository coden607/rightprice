import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allocateCommission } from "@rightprice/core";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  programId: z.string().uuid(),
  externalTransactionId: z.string().trim().min(1).max(200),
  status: z.enum(["pending", "confirmed", "reversed", "invalid"]),
  commissionAmount: z.number().finite().min(0),
  orderAmount: z.number().finite().min(0).optional(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  attributionRef: z.string().trim().min(1).max(300).optional(),
  clickId: z.string().uuid().optional(),
  occurredAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const RewardConfigSchema = z.object({
  buyerCashbackRate: z.number().min(0).max(1).default(0),
  directReferrerRate: z.number().min(0).max(1).default(0),
  secondLevelRate: z.number().min(0).max(1).default(0)
}).refine((value) => value.buyerCashbackRate + value.directReferrerRate + value.secondLevelRate <= 1, {
  message: "Configured reward rates cannot exceed 100%"
});

type ClickRow = { id: string; user_id: string | null; referral_code: string | null };
type ReferralRow = { referrer_user_id: string };

type AllocationRow = {
  user_id: string | null;
  event_type: "buyer_cashback_allocated" | "referrer_reward_allocated" | "rightprice_revenue_allocated";
  amount: number;
  label: string;
};

type AllocationSnapshot = {
  buyerUserId: string | null;
  directReferrerUserId: string | null;
  secondLevelUserId: string | null;
  buyerCashback: number;
  directReferrerReward: number;
  secondLevelReward: number;
  rightPriceRevenue: number;
};

function authorized(request: NextRequest): boolean {
  const secret = process.env.AFFILIATE_INGEST_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function findClick(admin: NonNullable<ReturnType<typeof createAdminClient>>, clickId?: string, attributionRef?: string): Promise<ClickRow | null> {
  if (clickId) {
    const { data } = await admin.from("affiliate_clicks").select("id,user_id,referral_code").eq("id", clickId).maybeSingle();
    return (data as ClickRow | null) ?? null;
  }
  if (attributionRef) {
    const { data } = await admin.from("affiliate_clicks").select("id,user_id,referral_code").eq("attribution_ref", attributionRef).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return (data as ClickRow | null) ?? null;
  }
  return null;
}

async function resolveReferrers(admin: NonNullable<ReturnType<typeof createAdminClient>>, click: ClickRow | null) {
  let direct: string | null = null;
  let second: string | null = null;
  if (click?.user_id) {
    const { data } = await admin.from("referral_edges").select("referrer_user_id").eq("referred_user_id", click.user_id).eq("status", "active").maybeSingle();
    direct = ((data as ReferralRow | null)?.referrer_user_id) ?? null;
  } else if (click?.referral_code) {
    const { data } = await admin.from("profiles").select("id").eq("referral_code", click.referral_code).maybeSingle();
    direct = (data as { id?: string } | null)?.id ?? null;
  }
  if (direct) {
    const { data } = await admin.from("referral_edges").select("referrer_user_id").eq("referred_user_id", direct).eq("status", "active").maybeSingle();
    second = ((data as ReferralRow | null)?.referrer_user_id) ?? null;
  }
  return { direct, second };
}

async function applyConfirmedAllocations(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  transactionId: string,
  currency: string,
  rows: AllocationRow[]
) {
  for (const row of rows) {
    if (row.amount <= 0) continue;
    const { error } = await admin.from("ledger_events").upsert({
      transaction_id: transactionId,
      user_id: row.user_id,
      event_type: row.event_type,
      amount: row.amount,
      currency,
      direction: "credit",
      idempotency_key: `allocation:${transactionId}:${row.label}`,
      metadata: { allocation: row.label }
    }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    if (error) throw error;
  }
}

async function applyReversal(admin: NonNullable<ReturnType<typeof createAdminClient>>, transactionId: string) {
  const { data, error } = await admin
    .from("ledger_events")
    .select("id,user_id,amount,currency,event_type")
    .eq("transaction_id", transactionId)
    .eq("direction", "credit")
    .in("event_type", ["buyer_cashback_allocated", "referrer_reward_allocated", "rightprice_revenue_allocated"]);
  if (error) throw error;
  for (const event of data ?? []) {
    const { error: reversalError } = await admin.from("ledger_events").upsert({
      transaction_id: transactionId,
      user_id: event.user_id,
      event_type: "return_reversal",
      amount: Number(event.amount),
      currency: event.currency,
      direction: "debit",
      idempotency_key: `reversal:${transactionId}:${event.id}`,
      metadata: { reverses_event_id: event.id, original_event_type: event.event_type }
    }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    if (reversalError) throw reversalError;
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 503 });

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid normalized affiliate transaction", details: body.error.flatten() }, { status: 400 });

  const { data: programData, error: programError } = await admin
    .from("affiliate_programs")
    .select("id,allows_cashback,allows_subaffiliate,max_referral_depth,status,config")
    .eq("id", body.data.programId)
    .maybeSingle();
  if (programError || !programData) return NextResponse.json({ error: "Affiliate program not found" }, { status: 404 });
  if (programData.status !== "approved") return NextResponse.json({ error: "Affiliate program is not approved for ingestion" }, { status: 409 });

  const rewardConfig = RewardConfigSchema.safeParse((programData.config as Record<string, unknown> | null)?.rewardRule ?? {});
  if (!rewardConfig.success) return NextResponse.json({ error: "Affiliate reward configuration is invalid", details: rewardConfig.error.flatten() }, { status: 409 });

  const click = await findClick(admin, body.data.clickId, body.data.attributionRef);
  const buyerId = click?.user_id ?? null;
  const referrers = await resolveReferrers(admin, click);

  const { data: existing } = await admin
    .from("affiliate_transactions")
    .select("id,status,commission_amount,currency,raw_metadata,confirmed_at")
    .eq("program_id", body.data.programId)
    .eq("external_transaction_id", body.data.externalTransactionId)
    .maybeSingle();

  const terminalStatus = existing?.status === "reversed" || existing?.status === "invalid";
  const incomingStatus = terminalStatus ? existing.status : (existing?.status === "confirmed" && body.data.status === "pending" ? "confirmed" : body.data.status);
  if (existing?.status === "confirmed" && body.data.status === "confirmed") {
    const amountChanged = Math.round(Number(existing.commission_amount) * 100) !== Math.round(body.data.commissionAmount * 100);
    const currencyChanged = String(existing.currency).toUpperCase() !== body.data.currency.toUpperCase();
    if (amountChanged || currencyChanged) {
      return NextResponse.json({ error: "A confirmed commission cannot be silently changed; reverse/correct the upstream transaction first" }, { status: 409 });
    }
  }

  const existingMeta = (existing?.raw_metadata && typeof existing.raw_metadata === "object" ? existing.raw_metadata : {}) as Record<string, unknown>;
  let allocationSnapshot = existingMeta.rightprice_allocation as AllocationSnapshot | undefined;
  if (incomingStatus === "confirmed" && !allocationSnapshot) {
    const levelTwoEnabled = process.env.ENABLE_LEVEL_TWO_REFERRALS === "true";
    const allocation = allocateCommission(body.data.commissionAmount, rewardConfig.data, {
      allowsCashback: programData.allows_cashback === true && process.env.ENABLE_CASHBACK === "true",
      allowsSubaffiliate: programData.allows_subaffiliate === true && process.env.ENABLE_REFERRALS !== "false",
      maxReferralDepth: levelTwoEnabled ? Number(programData.max_referral_depth ?? 0) : Math.min(1, Number(programData.max_referral_depth ?? 0))
    }, {
      hasBuyer: Boolean(buyerId),
      hasDirectReferrer: Boolean(referrers.direct),
      hasSecondLevelReferrer: Boolean(referrers.second)
    });
    allocationSnapshot = {
      buyerUserId: buyerId,
      directReferrerUserId: referrers.direct,
      secondLevelUserId: referrers.second,
      buyerCashback: allocation.buyerCashback,
      directReferrerReward: allocation.directReferrerReward,
      secondLevelReward: allocation.secondLevelReward,
      rightPriceRevenue: allocation.rightPriceRevenue
    };
  }

  const normalizedMetadata = { ...existingMeta, ...(body.data.metadata ?? {}), ...(allocationSnapshot ? { rightprice_allocation: allocationSnapshot } : {}) };

  const { data: transaction, error: transactionError } = await admin.from("affiliate_transactions").upsert({
    program_id: body.data.programId,
    user_id: buyerId,
    click_id: click?.id ?? null,
    external_transaction_id: body.data.externalTransactionId,
    order_amount: body.data.orderAmount ?? null,
    commission_amount: Math.round(body.data.commissionAmount * 100) / 100,
    currency: body.data.currency.toUpperCase(),
    status: incomingStatus,
    occurred_at: body.data.occurredAt ?? null,
    confirmed_at: incomingStatus === "confirmed" ? (existing?.confirmed_at ?? new Date().toISOString()) : (existing?.confirmed_at ?? null),
    raw_metadata: normalizedMetadata,
    updated_at: new Date().toISOString()
  }, { onConflict: "program_id,external_transaction_id" }).select("id,status").single();
  if (transactionError || !transaction) return NextResponse.json({ error: "Could not persist affiliate transaction" }, { status: 500 });

  if (incomingStatus === "confirmed" && allocationSnapshot) {
    await applyConfirmedAllocations(admin, transaction.id, body.data.currency.toUpperCase(), [
      { user_id: allocationSnapshot.buyerUserId, event_type: "buyer_cashback_allocated", amount: allocationSnapshot.buyerCashback, label: "buyer" },
      { user_id: allocationSnapshot.directReferrerUserId, event_type: "referrer_reward_allocated", amount: allocationSnapshot.directReferrerReward, label: "direct-referrer" },
      { user_id: allocationSnapshot.secondLevelUserId, event_type: "referrer_reward_allocated", amount: allocationSnapshot.secondLevelReward, label: "second-level-referrer" },
      { user_id: null, event_type: "rightprice_revenue_allocated", amount: allocationSnapshot.rightPriceRevenue, label: "rightprice" }
    ]);
  } else if (incomingStatus === "reversed") {
    await applyReversal(admin, transaction.id);
  }

  return NextResponse.json({
    ok: true,
    transactionId: transaction.id,
    status: transaction.status,
    attribution: { clickMatched: Boolean(click), buyerMatched: Boolean(buyerId), directReferrerMatched: Boolean(referrers.direct), secondLevelMatched: Boolean(referrers.second) }
  });
}

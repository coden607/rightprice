import { NextRequest, NextResponse } from "next/server";
import { parseSearchIntent } from "@rightprice/core";
import { searchAllConnectors } from "@rightprice/connectors";
import { createAdminClient } from "@/lib/supabase/admin";
import { configuredConnectors } from "@/lib/server/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlertRow = {
  id: string;
  user_id: string;
  target_price: number | null;
  local_only: boolean;
  last_triggered_at: string | null;
  saved_search_id: string | null;
};

type SavedSearchRow = { id: string; query: string };

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function shouldThrottle(lastTriggeredAt: string | null): boolean {
  if (!lastTriggeredAt) return false;
  const ageMs = Date.now() - Date.parse(lastTriggeredAt);
  return Number.isFinite(ageMs) && ageMs < 12 * 60 * 60 * 1000;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 503 });

  const { data: alertData, error: alertError } = await admin
    .from("price_alerts")
    .select("id,user_id,target_price,local_only,last_triggered_at,saved_search_id")
    .eq("enabled", true)
    .not("saved_search_id", "is", null)
    .not("target_price", "is", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (alertError) return NextResponse.json({ error: "Could not load price alerts" }, { status: 500 });

  const alerts = (alertData ?? []) as AlertRow[];
  const savedIds = [...new Set(alerts.map((alert) => alert.saved_search_id).filter((value): value is string => Boolean(value)))];
  const { data: savedData, error: savedError } = savedIds.length
    ? await admin.from("saved_searches").select("id,query").in("id", savedIds)
    : { data: [] as SavedSearchRow[], error: null };
  if (savedError) return NextResponse.json({ error: "Could not load saved searches" }, { status: 500 });
  const savedById = new Map(((savedData ?? []) as SavedSearchRow[]).map((row) => [row.id, row]));
  const connectors = configuredConnectors();

  let checked = 0;
  let triggered = 0;
  const failures: Array<{ alertId: string; message: string }> = [];

  for (const alert of alerts) {
    if (!alert.saved_search_id || alert.target_price == null || shouldThrottle(alert.last_triggered_at)) continue;
    const saved = savedById.get(alert.saved_search_id);
    if (!saved) continue;
    checked += 1;
    try {
      const intent = parseSearchIntent(saved.query);
      if (alert.local_only) intent.localPickup = true;
      const result = await searchAllConnectors(connectors, intent, {
        requestId: `alert:${alert.id}:${Date.now()}`,
        userId: alert.user_id
      });
      const best = result.offers[0];
      if (!best || best.effectiveCost.amount > Number(alert.target_price)) continue;
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const dedupeKey = `price-alert:${alert.id}:${day}`;
      const { error: noteError } = await admin.from("notifications").upsert({
        user_id: alert.user_id,
        notification_type: "price_alert",
        title: `Target reached: ${best.product.title}`,
        body: `${best.retailerName} is ${best.effectiveCost.currency} ${best.effectiveCost.amount.toFixed(2)} effective cost, at or below your ${Number(alert.target_price).toFixed(2)} target.`,
        href: `/search?q=${encodeURIComponent(saved.query)}`,
        dedupe_key: dedupeKey
      }, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (noteError) throw noteError;
      await admin.from("price_alerts").update({ last_triggered_at: now.toISOString() }).eq("id", alert.id);
      triggered += 1;
    } catch (cause) {
      failures.push({ alertId: alert.id, message: cause instanceof Error ? cause.message : "Alert check failed" });
    }
  }

  return NextResponse.json({ ok: true, checked, triggered, failures: failures.slice(0, 10) }, { headers: { "Cache-Control": "no-store" } });
}

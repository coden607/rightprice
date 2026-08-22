import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordAffiliateClick(input: {
  offerId: string;
  retailerId: string;
  referralCode?: string;
  userId?: string;
  attributionRef?: string;
  userAgent?: string;
  ip?: string;
}) {
  const client = createAdminClient();
  if (!client) return { persisted: false };
  const ipHash = input.ip
    ? crypto.createHash("sha256").update(`${input.ip}:${process.env.RIGHTPRICE_CLICKOUT_SECRET ?? "dev"}`).digest("hex")
    : null;
  const { error } = await client.from("affiliate_clicks").insert({
    user_id: input.userId ?? null,
    offer_external_id: input.offerId,
    retailer_id: input.retailerId,
    referral_code: input.referralCode ?? null,
    attribution_ref: input.attributionRef ?? null,
    user_agent: input.userAgent?.slice(0, 500) ?? null,
    ip_hash: ipHash
  });
  if (error) throw error;
  return { persisted: true };
}

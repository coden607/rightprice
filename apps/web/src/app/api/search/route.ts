import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { normalizeRankingWeights, parseSearchIntent, type RankedOffer, type RankingPreset } from "@rightprice/core";
import { searchAllConnectors } from "@rightprice/connectors";
import { configuredConnectors } from "@/lib/server/connectors";
import { createClickToken } from "@/lib/server/clickout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Weight = z.coerce.number().min(0).max(100).optional();
const QuerySchema = z.object({
  q: z.string().trim().min(2).max(300),
  preset: z.enum(["best_overall", "cheapest", "fastest", "trusted", "cashback", "local"]).optional(),
  wp: Weight,
  wd: Weight,
  wt: Weight,
  wr: Weight,
  wc: Weight,
  wl: Weight
});

function publicOffer(offer: RankedOffer, requestId: string) {
  const destination = offer.affiliateUrl ?? offer.sourceUrl;
  const clickToken = createClickToken({
    offerId: offer.id,
    retailerId: offer.retailerId,
    destination,
    attributionRef: requestId
  });
  return {
    id: offer.id,
    title: offer.product.title,
    imageUrl: offer.product.imageUrl ?? null,
    retailerId: offer.retailerId,
    retailerName: offer.retailerName,
    sellerName: offer.seller?.name ?? null,
    sellerRating: offer.seller?.rating ?? null,
    condition: offer.condition,
    itemPrice: offer.itemPrice,
    shipping: offer.shipping,
    cashback: offer.cashback ?? null,
    totalBeforeCashback: offer.totalBeforeCashback,
    effectiveCost: offer.effectiveCost,
    delivery: offer.delivery ?? null,
    returnDays: offer.returnDays ?? null,
    score: offer.score,
    rankReason: offer.rankReason,
    riskFlags: offer.riskFlags,
    isDemo: offer.metadata?.demo === true,
    affiliateEligible: Boolean(offer.affiliateUrl),
    clickUrl: `/api/clickout?token=${encodeURIComponent(clickToken)}`,
    sourceTimestamp: offer.sourceTimestamp
  };
}

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    preset: request.nextUrl.searchParams.get("preset") ?? undefined,
    wp: request.nextUrl.searchParams.get("wp") ?? undefined,
    wd: request.nextUrl.searchParams.get("wd") ?? undefined,
    wt: request.nextUrl.searchParams.get("wt") ?? undefined,
    wr: request.nextUrl.searchParams.get("wr") ?? undefined,
    wc: request.nextUrl.searchParams.get("wc") ?? undefined,
    wl: request.nextUrl.searchParams.get("wl") ?? undefined
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a product or shopping request of at least 2 characters." }, { status: 400 });
  }

  const requestId = randomUUID();
  const intent = parseSearchIntent(parsed.data.q);
  if (parsed.data.preset) intent.preset = parsed.data.preset as RankingPreset;

  const customWeightValues = [parsed.data.wp, parsed.data.wd, parsed.data.wt, parsed.data.wr, parsed.data.wc, parsed.data.wl];
  const customWeights = customWeightValues.some((value) => value != null)
    ? normalizeRankingWeights({
        price: parsed.data.wp ?? 0,
        delivery: parsed.data.wd ?? 0,
        trust: parsed.data.wt ?? 0,
        returns: parsed.data.wr ?? 0,
        cashback: parsed.data.wc ?? 0,
        local: parsed.data.wl ?? 0
      })
    : undefined;

  const connectors = configuredConnectors();

  const referralCode = request.cookies.get("rp_ref")?.value;
  const started = Date.now();
  const result = await searchAllConnectors(connectors, intent, {
    requestId,
    referralCode,
    locale: request.headers.get("accept-language") ?? undefined
  }, customWeights);

  return NextResponse.json({
    requestId,
    intent,
    offers: result.offers.map((offer) => publicOffer(offer, requestId)),
    connectorErrors: result.connectorErrors,
    searchedConnectors: connectors.filter((connector) => connector.isEnabled()).map((connector) => connector.id),
    durationMs: Date.now() - started,
    ranking: customWeights ? { mode: "custom", weights: customWeights } : { mode: "preset", preset: intent.preset ?? "best_overall" },
    disclosure: "RightPrice may earn compensation from qualifying purchases. Affiliate compensation is not used as a ranking input."
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}

import assert from "node:assert/strict";
import test from "node:test";
import { calculateOfferTotals, money, normalizeRankingWeights, rankOffers, weightsForPreset } from "./index.ts";
import type { Offer } from "./types.ts";

function offer(id: string, price: number, days: number, rating: number, cashback = 0): Offer {
  const totals = calculateOfferTotals({ itemPrice: money(price), shipping: money(0), cashback: money(cashback) });
  return {
    id,
    product: { id: "p", title: "Widget", normalizedTitle: "widget", identifiers: [] },
    retailerId: id,
    retailerName: id,
    seller: { name: id, rating },
    condition: "new",
    itemPrice: money(price),
    shipping: money(0),
    cashback: money(cashback),
    ...totals,
    delivery: { maxDays: days },
    returnDays: 30,
    sourceUrl: "https://example.com",
    sourceTimestamp: new Date().toISOString(),
    riskFlags: []
  };
}

test("cheapest preset prioritizes materially cheaper offer", () => {
  const results = rankOffers(
    [offer("cheap", 80, 5, 4.5), offer("fast", 110, 1, 4.9)],
    weightsForPreset("cheapest")
  );
  assert.equal(results[0]?.id, "cheap");
});

test("fastest preset prioritizes fast delivery", () => {
  const results = rankOffers(
    [offer("cheap", 80, 8, 4.5), offer("fast", 88, 1, 4.9)],
    weightsForPreset("fastest")
  );
  assert.equal(results[0]?.id, "fast");
});

test("affiliate commission is not part of ranking", () => {
  const a = offer("a", 90, 3, 4.5);
  const b = offer("b", 95, 3, 4.5);
  a.metadata = { affiliateCommission: 1 };
  b.metadata = { affiliateCommission: 100 };
  const results = rankOffers([a, b], weightsForPreset("cheapest"));
  assert.equal(results[0]?.id, "a");
});


test("custom ranking weights normalize shopper priorities", () => {
  const weights = normalizeRankingWeights({ price: 80, delivery: 20, trust: 0, returns: 0, cashback: 0, local: 0 });
  assert.equal(weights.price, 0.8);
  assert.equal(weights.delivery, 0.2);
  assert.equal(weights.trust, 0);
});

test("all-zero custom priorities safely fall back to defaults", () => {
  const weights = normalizeRankingWeights({ price: 0, delivery: 0, trust: 0, returns: 0, cashback: 0, local: 0 });
  assert.deepEqual(weights, { ...weightsForPreset("best_overall") });
});

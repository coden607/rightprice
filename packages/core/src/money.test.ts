import assert from "node:assert/strict";
import test from "node:test";
import { calculateOfferTotals, money } from "./money.ts";

test("separates pay-now total from cashback-adjusted effective cost", () => {
  const result = calculateOfferTotals({
    itemPrice: money(100),
    shipping: money(5),
    estimatedTax: money(8),
    couponDiscount: money(3),
    cashback: money(10)
  });
  assert.equal(result.totalBeforeCashback.amount, 110);
  assert.equal(result.effectiveCost.amount, 100);
});

test("rejects mixed currency arithmetic", () => {
  assert.throws(() => calculateOfferTotals({ itemPrice: money(10, "USD"), shipping: money(1, "CAD") }), /mixed currencies/i);
});

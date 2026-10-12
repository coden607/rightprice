import { test } from "node:test";
import assert from "node:assert/strict";
import type { Offer } from "@rightprice/core";
import { buildOfferPersistenceRows, strongIdentifier } from "./offer-rows.ts";

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "demo:offer-1",
    product: {
      id: "demo-product-1",
      title: "Insulated Water Bottle 32oz",
      normalizedTitle: "insulated water bottle 32oz",
      brand: "HydroTest",
      identifiers: [{ type: "upc", value: "012345678905" }],
      imageUrl: "https://example.com/bottle.png"
    },
    retailerId: "demo",
    retailerName: "Demo Retailer",
    condition: "new",
    itemPrice: { amount: 24.99, currency: "USD" },
    shipping: { amount: 0, currency: "USD" },
    totalBeforeCashback: { amount: 24.99, currency: "USD" },
    effectiveCost: { amount: 24.99, currency: "USD" },
    sourceUrl: "https://example.com/bottle",
    sourceTimestamp: "2026-10-12T00:00:00.000Z",
    riskFlags: [],
    ...overrides
  };
}

test("maps an offer to schema-shaped rows", () => {
  const rows = buildOfferPersistenceRows(makeOffer());

  assert.deepEqual(rows.retailer, {
    id: "demo",
    name: "Demo Retailer",
    connector_type: "search",
    enabled: true
  });
  assert.equal(rows.product.normalized_title, "insulated water bottle 32oz");
  assert.equal(rows.product.brand, "HydroTest");
  assert.deepEqual(rows.identifiers, [
    { identifier_type: "upc", identifier_value: "012345678905", confidence: 1 }
  ]);
  assert.equal(rows.offer.external_offer_id, "demo:offer-1");
  assert.equal(rows.offer.item_price, 24.99);
  assert.equal(rows.offer.currency, "USD");
  assert.equal(rows.offer.cashback, 0);
  assert.equal(rows.offer.coupon_discount, 0);
  assert.equal(rows.snapshot.effective_cost, 24.99);
  assert.equal(rows.snapshot.available, true);
});

test("carries optional seller, tax, coupon and cashback fields", () => {
  const rows = buildOfferPersistenceRows(
    makeOffer({
      seller: { name: "Trail Goods", rating: 4.7 },
      estimatedTax: { amount: 2.05, currency: "USD" },
      couponDiscount: { amount: 3, currency: "USD" },
      cashback: { amount: 1.5, currency: "USD" },
      returnDays: 30,
      riskFlags: ["used_like_new"]
    })
  );

  assert.equal(rows.offer.seller_name, "Trail Goods");
  assert.equal(rows.offer.seller_rating, 4.7);
  assert.equal(rows.offer.estimated_tax, 2.05);
  assert.equal(rows.offer.coupon_discount, 3);
  assert.equal(rows.offer.cashback, 1.5);
  assert.equal(rows.offer.return_days, 30);
  assert.deepEqual(rows.offer.risk_flags, ["used_like_new"]);
});

test("prefers strong identifiers in canonical order", () => {
  assert.deepEqual(
    strongIdentifier([
      { type: "sku", value: "ABC" },
      { type: "isbn", value: "9780132350884" },
      { type: "upc", value: "012345678905" }
    ]),
    { type: "upc", value: "012345678905" }
  );
  assert.equal(strongIdentifier([{ type: "mpn", value: "X1" }]), null);
  assert.equal(strongIdentifier([]), null);
});

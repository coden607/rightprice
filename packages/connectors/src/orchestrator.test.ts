import { test } from "node:test";
import assert from "node:assert/strict";
import { searchAllConnectors } from "./orchestrator.ts";
import type { CommerceConnector, Offer, SearchContext, SearchIntent } from "@rightprice/core";

function makeOffer(id: string, effectiveCost: number, retailer = `r-${id}`): Offer {
  return {
    id,
    product: {
      id: `p-${id}`,
      title: `Product ${id}`,
      normalizedTitle: `product ${id}`,
      identifiers: [],
    },
    retailerId: retailer,
    retailerName: retailer,
    condition: "new",
    itemPrice: { amount: effectiveCost, currency: "USD" },
    shipping: { amount: 0, currency: "USD" },
    totalBeforeCashback: { amount: effectiveCost, currency: "USD" },
    effectiveCost: { amount: effectiveCost, currency: "USD" },
    sourceUrl: `https://example.com/${id}`,
    sourceTimestamp: new Date(0).toISOString(),
    riskFlags: [],
  };
}

function makeConnector(
  id: string,
  offers: Offer[],
  opts: { enabled?: boolean; error?: unknown } = {}
): CommerceConnector {
  return {
    id,
    displayName: id,
    isEnabled: () => opts.enabled ?? true,
    search: async () => {
      if (opts.error) throw opts.error;
      return offers;
    },
    health: async () => ({ connectorId: id, ok: true, message: "ok", checkedAt: new Date(0).toISOString() }),
  };
}

const intent: SearchIntent = { rawQuery: "widget", query: "widget" };
const context: SearchContext = { requestId: "req-1" };

test("aggregates and ranks offers from all enabled connectors", async () => {
  const connectors = [
    makeConnector("a", [makeOffer("a1", 120), makeOffer("a2", 90)]),
    makeConnector("b", [makeOffer("b1", 100)]),
  ];
  const result = await searchAllConnectors(connectors, intent, context);
  assert.equal(result.offers.length, 3);
  assert.deepEqual(result.connectorErrors, []);
  // cheapest first under the default best_overall preset
  assert.equal(result.offers[0]?.effectiveCost.amount, 90);
});

test("a failed connector does not destroy working results", async () => {
  const connectors = [
    makeConnector("good", [makeOffer("g1", 100)]),
    makeConnector("bad", [], { error: new Error("retailer timeout") }),
  ];
  const result = await searchAllConnectors(connectors, intent, context);
  assert.equal(result.offers.length, 1);
  assert.equal(result.offers[0]?.id, "g1");
  assert.deepEqual(result.connectorErrors, [
    { connectorId: "bad", message: "retailer timeout" },
  ]);
});

test("non-Error rejection reasons are stringified", async () => {
  const connectors = [
    makeConnector("good", [makeOffer("g1", 50)]),
    makeConnector("weird", [], { error: "string failure" }),
  ];
  const result = await searchAllConnectors(connectors, intent, context);
  assert.deepEqual(result.connectorErrors, [
    { connectorId: "weird", message: "Connector search failed" },
  ]);
});

test("disabled connectors are skipped entirely", async () => {
  const skipped = makeConnector("off", [makeOffer("o1", 1)], { enabled: false });
  const active = makeConnector("on", [makeOffer("n1", 10)]);
  const result = await searchAllConnectors([skipped, active], intent, context);
  assert.equal(result.offers.length, 1);
  assert.equal(result.offers[0]?.id, "n1");
  assert.deepEqual(result.connectorErrors, []);
});

test("custom weights override the preset ranking", async () => {
  const connectors = [
    makeConnector("a", [makeOffer("cheap-slow", 50), makeOffer("pricey-fast", 90)]),
  ];
  const withDays = (offer: Offer, minDays: number, maxDays: number): Offer => ({
    ...offer,
    delivery: { minDays, maxDays },
  });
  const connectorsWithDelivery = [
    makeConnector("a", [
      withDays(makeOffer("cheap-slow", 50), 10, 14),
      withDays(makeOffer("pricey-fast", 90), 1, 2),
    ]),
  ];
  const cheapest = await searchAllConnectors(connectorsWithDelivery, intent, context, {
    price: 1, delivery: 0, trust: 0, returns: 0, cashback: 0, local: 0, riskPenalty: 0,
  });
  assert.equal(cheapest.offers[0]?.id, "cheap-slow");

  const fastest = await searchAllConnectors(connectorsWithDelivery, intent, context, {
    price: 0, delivery: 1, trust: 0, returns: 0, cashback: 0, local: 0, riskPenalty: 0,
  });
  assert.equal(fastest.offers[0]?.id, "pricey-fast");
  void connectors;
});

test("empty connector list returns empty result, no errors", async () => {
  const result = await searchAllConnectors([], intent, context);
  assert.deepEqual(result, { offers: [], connectorErrors: [] });
});

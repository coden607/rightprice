import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchIntent } from "./search-intent.ts";

test("parses price, local pickup and ranking preference", () => {
  const intent = parseSearchIntent("cheapest 55 inch Samsung TV under $400 local pickup");
  assert.equal(intent.maxPrice, 400);
  assert.equal(intent.localPickup, true);
  assert.equal(intent.preset, "cheapest");
  assert.match(intent.query.toLowerCase(), /samsung/);
});

test("rejects empty query", () => {
  assert.throws(() => parseSearchIntent("   "), /cannot be empty/i);
});

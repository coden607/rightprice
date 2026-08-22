import assert from "node:assert/strict";
import test from "node:test";
import { compareProducts, normalizeTitle } from "./index.ts";
import type { CanonicalProduct } from "./types.ts";

function product(id: string, title: string, upc?: string): CanonicalProduct {
  return {
    id,
    title,
    normalizedTitle: normalizeTitle(title),
    brand: "Acme",
    identifiers: upc ? [{ type: "upc", value: upc }] : []
  };
}

test("exact UPC auto-merges", () => {
  const result = compareProducts(product("a", "Acme Drill", "123456"), product("b", "Acme Drill Kit", "123456"));
  assert.equal(result.shouldAutoMerge, true);
  assert.ok(result.confidence >= 0.99);
});

test("conflicting UPC blocks merge", () => {
  const result = compareProducts(product("a", "Acme Drill", "111"), product("b", "Acme Drill", "222"));
  assert.equal(result.shouldAutoMerge, false);
  assert.ok(result.confidence < 0.1);
});

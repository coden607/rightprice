import type { CanonicalProduct, ProductIdentifier } from "./types.ts";

function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function identifierMap(items: ProductIdentifier[]): Map<string, string> {
  return new Map(items.map((item) => [item.type, normalizeIdentifier(item.value)]));
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeTitle(value).split(" ").filter((token) => token.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface ProductMatchResult {
  confidence: number;
  reason: string;
  shouldAutoMerge: boolean;
}

export function compareProducts(a: CanonicalProduct, b: CanonicalProduct): ProductMatchResult {
  const aIds = identifierMap(a.identifiers);
  const bIds = identifierMap(b.identifiers);

  for (const type of ["gtin", "upc", "ean", "isbn", "mpn"] as const) {
    const av = aIds.get(type);
    const bv = bIds.get(type);
    if (av && bv) {
      if (av === bv) {
        return { confidence: type === "mpn" ? 0.97 : 0.995, reason: `Exact ${type.toUpperCase()} match`, shouldAutoMerge: true };
      }
      if (type !== "mpn") {
        return { confidence: 0.05, reason: `Conflicting ${type.toUpperCase()} identifiers`, shouldAutoMerge: false };
      }
    }
  }

  const brandMatch = Boolean(
    a.brand && b.brand && normalizeTitle(a.brand) === normalizeTitle(b.brand)
  );
  const modelMatch = Boolean(
    a.model && b.model && normalizeIdentifier(a.model) === normalizeIdentifier(b.model)
  );
  if (brandMatch && modelMatch) {
    return { confidence: 0.96, reason: "Exact brand and model match", shouldAutoMerge: false };
  }

  const titleSimilarity = jaccard(tokenSet(a.title), tokenSet(b.title));
  let confidence = titleSimilarity * 0.82;
  if (brandMatch) confidence += 0.1;
  confidence = Math.min(0.92, confidence);

  return {
    confidence,
    reason: brandMatch ? "Brand and title similarity" : "Title similarity only",
    shouldAutoMerge: confidence >= 0.97
  };
}

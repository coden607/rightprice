import type { ProductCondition, RankingPreset, SearchIntent } from "./types.ts";

const CONDITION_PATTERNS: Array<[RegExp, ProductCondition]> = [
  [/\bopen[ -]?box\b/i, "open_box"],
  [/\brefurb(?:ished)?\b/i, "refurbished"],
  [/\blike new\b/i, "used_like_new"],
  [/\bused\b/i, "used_good"],
  [/\bnew only\b/i, "new"]
];

function inferPreset(value: string): RankingPreset | undefined {
  if (/\b(cheapest|lowest price|least expensive)\b/i.test(value)) return "cheapest";
  if (/\b(fastest|asap|soonest)\b/i.test(value)) return "fastest";
  if (/\b(local|pickup|pick up)\b/i.test(value)) return "local";
  if (/\b(trusted|reputable|best seller)\b/i.test(value)) return "trusted";
  if (/\b(cashback|cash back|rewards?)\b/i.test(value)) return "cashback";
  return undefined;
}

export function parseSearchIntent(rawQuery: string): SearchIntent {
  const trimmed = rawQuery.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new Error("Search query cannot be empty");

  const priceMatch = trimmed.match(/(?:under|below|less than|max(?:imum)?(?: of)?)\s*\$?([0-9]+(?:\.[0-9]{1,2})?)/i);
  const condition = CONDITION_PATTERNS.find(([pattern]) => pattern.test(trimmed))?.[1];
  const localPickup = /\b(local|pickup|pick up|near me|nearby)\b/i.test(trimmed) || undefined;

  let query = trimmed
    .replace(/(?:under|below|less than|max(?:imum)?(?: of)?)\s*\$?[0-9]+(?:\.[0-9]{1,2})?/gi, "")
    .replace(/\b(new only|open[ -]?box|refurb(?:ished)?|like new|used)\b/gi, "")
    .replace(/\b(cheapest|lowest price|least expensive|fastest|asap|soonest|local pickup|pick up|near me|nearby|reputable seller|best seller|cashback|cash back)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!query) query = trimmed;

  return {
    rawQuery: trimmed,
    query,
    maxPrice: priceMatch ? Number(priceMatch[1]) : undefined,
    condition,
    localPickup,
    preset: inferPreset(trimmed)
  };
}

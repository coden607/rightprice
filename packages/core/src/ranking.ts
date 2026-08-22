import type {
  Offer,
  RankedOffer,
  RankingPreset,
  RankingWeights,
  ScoreBreakdown
} from "./types.ts";

export const DEFAULT_WEIGHTS: RankingWeights = {
  price: 0.4,
  delivery: 0.2,
  trust: 0.15,
  returns: 0.1,
  cashback: 0.1,
  local: 0.05,
  riskPenalty: 0.25
};

export function normalizeRankingWeights(input: Omit<RankingWeights, "riskPenalty">, riskPenalty = DEFAULT_WEIGHTS.riskPenalty): RankingWeights {
  const entries = Object.entries(input) as Array<[keyof Omit<RankingWeights, "riskPenalty">, number]>;
  const cleaned = Object.fromEntries(entries.map(([key, value]) => [key, Math.max(0, Number.isFinite(value) ? value : 0)])) as Omit<RankingWeights, "riskPenalty">;
  const total = Object.values(cleaned).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS, riskPenalty };
  return {
    price: cleaned.price / total,
    delivery: cleaned.delivery / total,
    trust: cleaned.trust / total,
    returns: cleaned.returns / total,
    cashback: cleaned.cashback / total,
    local: cleaned.local / total,
    riskPenalty: Math.max(0, riskPenalty)
  };
}

export function weightsForPreset(preset: RankingPreset = "best_overall"): RankingWeights {
  switch (preset) {
    case "cheapest":
      return { ...DEFAULT_WEIGHTS, price: 0.75, delivery: 0.05, trust: 0.08, returns: 0.04, cashback: 0.06, local: 0.02 };
    case "fastest":
      return { ...DEFAULT_WEIGHTS, price: 0.2, delivery: 0.6, trust: 0.08, returns: 0.05, cashback: 0.02, local: 0.05 };
    case "trusted":
      return { ...DEFAULT_WEIGHTS, price: 0.2, delivery: 0.1, trust: 0.5, returns: 0.12, cashback: 0.03, local: 0.05 };
    case "cashback":
      return { ...DEFAULT_WEIGHTS, price: 0.3, delivery: 0.1, trust: 0.1, returns: 0.05, cashback: 0.4, local: 0.05 };
    case "local":
      return { ...DEFAULT_WEIGHTS, price: 0.25, delivery: 0.1, trust: 0.1, returns: 0.05, cashback: 0.05, local: 0.45 };
    default:
      return DEFAULT_WEIGHTS;
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function inverseRangeScore(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  return clamp(1 - (value - min) / (max - min));
}

function rangeScore(value: number, min: number, max: number): number {
  if (max <= min) return value > 0 ? 1 : 0;
  return clamp((value - min) / (max - min));
}

function sellerTrust(offer: Offer): number {
  const rating = offer.seller?.rating;
  if (rating == null) return 0.55;
  if (rating <= 5) return clamp(rating / 5);
  return clamp(rating / 100);
}

function deliveryDays(offer: Offer): number {
  if (offer.delivery?.maxDays != null) return offer.delivery.maxDays;
  if (offer.delivery?.maxDate) {
    const end = Date.parse(offer.delivery.maxDate);
    if (!Number.isNaN(end)) return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
  }
  return 14;
}

function explain(top: ScoreBreakdown): string {
  const positive = Object.entries(top)
    .filter(([key]) => key !== "riskPenalty")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key]) => key);
  return `Ranks highly for ${positive.join(" and ")}${top.riskPenalty > 0.25 ? ", with some risk deductions" : ""}.`;
}

export function rankOffers(
  offers: Offer[],
  weights: RankingWeights = DEFAULT_WEIGHTS
): RankedOffer[] {
  if (offers.length === 0) return [];

  const costs = offers.map((offer) => offer.effectiveCost.amount);
  const cashbacks = offers.map((offer) => offer.cashback?.amount ?? 0);
  const days = offers.map(deliveryDays);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minCashback = Math.min(...cashbacks);
  const maxCashback = Math.max(...cashbacks);
  const minDays = Math.min(...days);
  const maxDays = Math.max(...days);

  return offers
    .map((offer): RankedOffer => {
      const breakdown: ScoreBreakdown = {
        price: inverseRangeScore(offer.effectiveCost.amount, minCost, maxCost),
        delivery: inverseRangeScore(deliveryDays(offer), minDays, maxDays),
        trust: sellerTrust(offer),
        returns: clamp((offer.returnDays ?? 14) / 90),
        cashback: rangeScore(offer.cashback?.amount ?? 0, minCashback, maxCashback),
        local: offer.delivery?.localPickup ? 1 : 0,
        riskPenalty: clamp(offer.riskFlags.length * 0.18)
      };

      const weighted =
        breakdown.price * weights.price +
        breakdown.delivery * weights.delivery +
        breakdown.trust * weights.trust +
        breakdown.returns * weights.returns +
        breakdown.cashback * weights.cashback +
        breakdown.local * weights.local -
        breakdown.riskPenalty * weights.riskPenalty;

      return {
        ...offer,
        score: Math.round(clamp(weighted) * 100),
        scoreBreakdown: breakdown,
        rankReason: explain(breakdown)
      };
    })
    .sort((a, b) => b.score - a.score || a.effectiveCost.amount - b.effectiveCost.amount);
}

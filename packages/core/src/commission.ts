import { roundMoney } from "./money.ts";

export interface AffiliateProgramPolicy {
  allowsCashback: boolean;
  allowsSubaffiliate: boolean;
  maxReferralDepth: number;
}

export interface CommissionRule {
  buyerCashbackRate: number;
  directReferrerRate: number;
  secondLevelRate: number;
}

export interface CommissionAllocation {
  grossCommission: number;
  buyerCashback: number;
  directReferrerReward: number;
  secondLevelReward: number;
  rightPriceRevenue: number;
}

function validRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function allocateCommission(
  grossCommission: number,
  rule: CommissionRule,
  policy: AffiliateProgramPolicy,
  context: { hasBuyer: boolean; hasDirectReferrer: boolean; hasSecondLevelReferrer: boolean }
): CommissionAllocation {
  if (!Number.isFinite(grossCommission) || grossCommission < 0) throw new Error("Gross commission must be non-negative");
  if (![rule.buyerCashbackRate, rule.directReferrerRate, rule.secondLevelRate].every(validRate)) {
    throw new Error("Commission rates must be between 0 and 1");
  }
  if (rule.buyerCashbackRate + rule.directReferrerRate + rule.secondLevelRate > 1) {
    throw new Error("Commission allocation rates cannot exceed 100% of received commission");
  }

  const grossCents = Math.round(grossCommission * 100);
  // Allocate in integer cents and floor each participant share. RightPrice receives
  // the rounding remainder so allocated rewards can never exceed money received.
  const centsFor = (rate: number) => Math.floor(grossCents * rate);
  const buyerCashbackCents = policy.allowsCashback && context.hasBuyer
    ? centsFor(rule.buyerCashbackRate)
    : 0;
  const directReferrerCents = policy.allowsSubaffiliate && policy.maxReferralDepth >= 1 && context.hasDirectReferrer
    ? centsFor(rule.directReferrerRate)
    : 0;
  const secondLevelCents = policy.allowsSubaffiliate && policy.maxReferralDepth >= 2 && context.hasSecondLevelReferrer
    ? centsFor(rule.secondLevelRate)
    : 0;
  const rightPriceCents = grossCents - buyerCashbackCents - directReferrerCents - secondLevelCents;

  return {
    grossCommission: roundMoney(grossCents / 100),
    buyerCashback: roundMoney(buyerCashbackCents / 100),
    directReferrerReward: roundMoney(directReferrerCents / 100),
    secondLevelReward: roundMoney(secondLevelCents / 100),
    rightPriceRevenue: roundMoney(rightPriceCents / 100)
  };
}

import assert from "node:assert/strict";
import test from "node:test";
import { allocateCommission } from "./commission.ts";

test("allocates only merchant-permitted rewards", () => {
  const allocation = allocateCommission(
    10,
    { buyerCashbackRate: 0.25, directReferrerRate: 0.2, secondLevelRate: 0.05 },
    { allowsCashback: true, allowsSubaffiliate: true, maxReferralDepth: 1 },
    { hasBuyer: true, hasDirectReferrer: true, hasSecondLevelReferrer: true }
  );
  assert.deepEqual(allocation, {
    grossCommission: 10,
    buyerCashback: 2.5,
    directReferrerReward: 2,
    secondLevelReward: 0,
    rightPriceRevenue: 5.5
  });
});

test("retains forbidden cashback/referral amounts in RightPrice revenue", () => {
  const allocation = allocateCommission(
    10,
    { buyerCashbackRate: 0.25, directReferrerRate: 0.2, secondLevelRate: 0 },
    { allowsCashback: false, allowsSubaffiliate: false, maxReferralDepth: 0 },
    { hasBuyer: true, hasDirectReferrer: true, hasSecondLevelReferrer: false }
  );
  assert.equal(allocation.buyerCashback, 0);
  assert.equal(allocation.directReferrerReward, 0);
  assert.equal(allocation.rightPriceRevenue, 10);
});


test("never over-allocates a one-cent commission due to rounding", () => {
  const allocation = allocateCommission(0.01,
    { buyerCashbackRate: 0.5, directReferrerRate: 0.5, secondLevelRate: 0 },
    { allowsCashback: true, allowsSubaffiliate: true, maxReferralDepth: 1 },
    { hasBuyer: true, hasDirectReferrer: true, hasSecondLevelReferrer: false }
  );
  const distributed = allocation.buyerCashback + allocation.directReferrerReward + allocation.secondLevelReward + allocation.rightPriceRevenue;
  assert.equal(distributed, 0.01);
  assert.ok(allocation.rightPriceRevenue >= 0);
});

import assert from "node:assert/strict";
import test from "node:test";

import { ProductTier, XpReason } from "@/generated/prisma/client";

import { calculateOrderXpReward } from "./order-xp-rewards";

test("sipariş XP hesabı workload ve zamanında teslim bonusunu birlikte hesaplar", () => {
  const reward = calculateOrderXpReward({
    itemCount: 1,
    lateDays: 0,
    outsourcedStepCount: 0,
    tiers: [ProductTier.BASIC],
    totalWorkloadPoints: 120_000,
  });

  assert.equal(reward.workloadXp, 120);
  assert.equal(reward.orderCompletedXp, 170);
  assert.equal(reward.onTimeBonusXp, 25);
  assert.equal(reward.tierBonusXp, 0);
  assert.equal(reward.totalAwardXp, 195);
});

test("geciken sipariş XP ödülünü azaltır ve zamanında teslim bonusunu kapatır", () => {
  const onTimeReward = calculateOrderXpReward({
    itemCount: 1,
    lateDays: 0,
    outsourcedStepCount: 0,
    tiers: [ProductTier.STANDARD],
    totalWorkloadPoints: 200_000,
  });
  const lateReward = calculateOrderXpReward({
    itemCount: 1,
    lateDays: 3,
    outsourcedStepCount: 0,
    tiers: [ProductTier.STANDARD],
    totalWorkloadPoints: 200_000,
  });

  assert.equal(lateReward.delayPenaltyBps, 3000);
  assert.equal(lateReward.onTimeBonusXp, 0);
  assert.ok(lateReward.totalAwardXp < onTimeReward.totalAwardXp);
});

test("premium ve luxury siparişler ayrı zorluk bonus nedeni üretir", () => {
  const premiumReward = calculateOrderXpReward({
    itemCount: 2,
    lateDays: 0,
    outsourcedStepCount: 1,
    tiers: [ProductTier.BASIC, ProductTier.PREMIUM],
    totalWorkloadPoints: 300_000,
  });
  const luxuryReward = calculateOrderXpReward({
    itemCount: 1,
    lateDays: 0,
    outsourcedStepCount: 0,
    tiers: [ProductTier.LUXURY],
    totalWorkloadPoints: 300_000,
  });

  assert.equal(premiumReward.tierBonusReason, XpReason.PREMIUM_ORDER);
  assert.equal(premiumReward.tierBonusXp, 90);
  assert.equal(luxuryReward.tierBonusReason, XpReason.LUXURY_ORDER);
  assert.equal(luxuryReward.tierBonusXp, 180);
});

import assert from "node:assert/strict";
import test from "node:test";

import { TaskObjectiveType } from "@/generated/prisma/client";

import {
  buildTaskRewardSnapshot,
  matchesTaskEvent,
} from "./task-definition-service";

test("görev ödül snapshot'ı bigint değerini güvenli string olarak saklar", () => {
  assert.deepEqual(
    buildTaskRewardSnapshot({
      rewardCashCents: BigInt(125_000),
      rewardRunwayTokens: 15,
      rewardXp: 300,
      targetValue: 1,
    }),
    {
      rewardCashCents: "125000",
      rewardRunwayTokens: 15,
      rewardXp: 300,
      targetValue: 1,
    },
  );
});

test("görev objective config'i satın alma ve leasing event'ini filtreler", () => {
  const config = {
    acquisitionTypes: ["PURCHASED", "LEASED"],
  };

  assert.equal(
    matchesTaskEvent(config, {
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      metadata: { acquisitionType: "LEASED" },
    }),
    true,
  );
  assert.equal(
    matchesTaskEvent(config, {
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      metadata: { acquisitionType: "STARTER" },
    }),
    false,
  );
});

test("objective config içindeki scalar alanlar event metadata ile eşleşir", () => {
  assert.equal(
    matchesTaskEvent(
      { offerType: "NORMAL" },
      {
        objectiveType: TaskObjectiveType.ACCEPT_ORDER,
        metadata: { offerType: "NORMAL" },
      },
    ),
    true,
  );
  assert.equal(
    matchesTaskEvent(
      { offerType: "NORMAL" },
      {
        objectiveType: TaskObjectiveType.ACCEPT_ORDER,
        metadata: { offerType: "EXPRESS" },
      },
    ),
    false,
  );
});

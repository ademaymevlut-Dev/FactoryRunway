import assert from "node:assert/strict";
import test from "node:test";

import {
  TaskObjectiveType,
  TaskProgressStatus,
  TaskType,
} from "@/generated/prisma/client";

import { buildTasksSnapshot } from "./task-snapshot";

test("task snapshot aktif hikâyeyi, claim bekleyen görevi ve token bakiyesini ayırır", () => {
  const snapshot = buildTasksSnapshot({
    progressRows: [
      buildRow({
        currentValue: 1,
        key: "story_first_shift",
        objectiveType: TaskObjectiveType.COMPLETE_SHIFT,
        sortOrder: 20,
        status: TaskProgressStatus.ACTIVE,
      }),
      buildRow({
        currentValue: 1,
        key: "story_first_normal_order",
        objectiveType: TaskObjectiveType.ACCEPT_ORDER,
        sortOrder: 10,
        status: TaskProgressStatus.COMPLETED,
      }),
      buildRow({
        currentValue: 1,
        key: "story_first_on_time_delivery",
        objectiveType: TaskObjectiveType.SHIP_ON_TIME,
        sortOrder: 30,
        status: TaskProgressStatus.CLAIMED,
      }),
    ],
    tokenBalance: 15,
  });

  assert.equal(snapshot.activeStoryTask?.key, "story_first_shift");
  assert.equal(snapshot.activeTasks.length, 1);
  assert.equal(snapshot.completedUnclaimedTasks.length, 1);
  assert.equal(snapshot.claimedTaskHistory.length, 1);
  assert.equal(snapshot.summary.completedUnclaimedCount, 1);
  assert.equal(snapshot.tokenBalance, 15);
});

test("task snapshot CTA'sı görev objective'ine göre panel veya vardiya akışı döndürür", () => {
  const snapshot = buildTasksSnapshot({
    progressRows: [
      buildRow({
        key: "story_first_investment_review",
        objectiveType: TaskObjectiveType.OPEN_INVESTMENT_PANEL,
        status: TaskProgressStatus.ACTIVE,
      }),
      buildRow({
        key: "story_first_shift",
        objectiveType: TaskObjectiveType.COMPLETE_SHIFT,
        sortOrder: 20,
        status: TaskProgressStatus.ACTIVE,
      }),
    ],
    tokenBalance: 0,
  });

  assert.deepEqual(snapshot.activeTasks[0]?.cta, {
    kind: "PANEL",
    label: "Yatırımları İncele",
    panel: "investment",
  });
  assert.deepEqual(snapshot.activeTasks[1]?.cta, {
    kind: "SHIFT",
    label: "Vardiyayı İlerle",
  });
});

function buildRow(input: {
  currentValue?: number;
  key: string;
  objectiveType: TaskObjectiveType;
  sortOrder?: number;
  status: TaskProgressStatus;
}) {
  return {
    completedDay: null,
    currentValue: input.currentValue ?? 0,
    id: input.key,
    rewardSnapshot: {
      rewardCashCents: null,
      rewardRunwayTokens: 5,
      rewardXp: 100,
    },
    status: input.status,
    targetValue: 1,
    taskDefinition: {
      key: input.key,
      objectiveType: input.objectiveType,
      rewardCashCents: null,
      rewardRunwayTokens: 0,
      rewardXp: 0,
      sortOrder: input.sortOrder ?? 10,
      taskType: TaskType.STORY,
      translations: [
        {
          description: `${input.key} açıklaması`,
          locale: "tr",
          title: `${input.key} başlığı`,
        },
      ],
    },
  };
}

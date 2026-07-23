import assert from "node:assert/strict";
import test from "node:test";

import {
  FactoryProductionLineStatus,
  TaskObjectiveType,
  TaskProgressStatus,
  TaskType,
} from "@/generated/prisma/enums";
import type { TaskSnapshot, TasksSnapshot } from "@/features/tasks/types";

import type {
  ManagerInvestmentInput,
  ManagerMapSectionsInput,
  ManagerProductionQueuesInput,
} from "./manager-metrics";
import { buildManagerRecommendations } from "./manager-recommendation-engine";

test("yatırım panelini açma görevi aktifken müdür yatırım inceleme önerisi verir", () => {
  const recommendations = buildManagerRecommendations(buildRecommendationInput({
    cashBalanceCents: "50000",
    currentDay: 12,
    tasks: buildTasksSnapshot({
      objectiveType: TaskObjectiveType.OPEN_INVESTMENT_PANEL,
      taskKey: "story_first_investment_review",
    }),
  }));

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0]?.id, "manager:investment-review");
  assert.equal(recommendations[0]?.cta?.panel, "investment");
  assert.equal(recommendations[0]?.meta.activeTaskKey, "story_first_investment_review");
});

test("hat edinme görevi aktifken satın alma veya kiralama ipucuyla öneri verir", () => {
  const recommendations = buildManagerRecommendations(buildRecommendationInput({
    cashBalanceCents: "25000",
    currentDay: 14,
    tasks: buildTasksSnapshot({
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      taskKey: "story_first_production_line",
    }),
  }));

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0]?.id, "manager:first-production-line");
  assert.match(recommendations[0]?.body ?? "", /kiralama/);
  assert.equal(recommendations[0]?.meta.affordablePurchaseCount, 0);
  assert.equal(recommendations[0]?.meta.affordableLeaseOfferCount, 1);
});

test("yatırım görevi aktif değilse öneri üretmez", () => {
  const recommendations = buildManagerRecommendations(buildRecommendationInput({
    cashBalanceCents: "250000",
    currentDay: 5,
    tasks: buildTasksSnapshot({
      objectiveType: TaskObjectiveType.COMPLETE_SHIFT,
      taskKey: "story_first_shift",
    }),
  }));

  assert.deepEqual(recommendations, []);
});

test("departman iş yükü eşik aşarsa darboğaz tavsiyesi üretir", () => {
  const recommendations = buildManagerRecommendations(buildRecommendationInput({
    productionQueues: buildProductionQueues({
      remainingWorkPoints: 420,
    }),
  }));

  assert.equal(recommendations[0]?.id, "manager:bottleneck:sewing");
  assert.equal(recommendations[0]?.cta?.panel, "departmentQueue");
  assert.deepEqual(recommendations[0]?.cta?.payload, { departmentId: "sewing" });
  assert.match(recommendations[0]?.body ?? "", /Dikim/);
});

test("düşük nakitte hat edinme önerisini finansal risk uyarısı bastırır", () => {
  const recommendations = buildManagerRecommendations(buildRecommendationInput({
    cashBalanceCents: "1000",
    tasks: buildTasksSnapshot({
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      taskKey: "story_first_production_line",
    }),
  }));

  assert.equal(recommendations[0]?.id, "manager:financial-risk:investment-cash");
  assert.equal(recommendations[0]?.cta?.panel, "finance");
  assert.equal(
    recommendations.some((item) => item.id === "manager:first-production-line"),
    false,
  );
});

test("personel eksikliği en düşük coverage hattı için tavsiye üretir", () => {
  const recommendations = buildManagerRecommendations(buildRecommendationInput({
    mapSections: buildMapSections({
      assignedStaff: 1,
      idealStaff: 3,
    }),
  }));

  assert.equal(recommendations[0]?.id, "manager:staff-shortage:line-sewing-1");
  assert.equal(recommendations[0]?.cta?.panel, "staff");
  assert.equal(recommendations[0]?.meta.missingStaff, 2);
});

test("birden çok sinyal varsa en fazla üç tekil tavsiye döndürür", () => {
  const recommendations = buildManagerRecommendations(buildRecommendationInput({
    cashBalanceCents: "1000",
    lateOrderCount: 1,
    mapSections: buildMapSections({
      assignedStaff: 1,
      hasActiveLeasingContract: true,
      idealStaff: 3,
    }),
    productionQueues: buildProductionQueues({
      deliveryTone: "danger",
      remainingWorkPoints: 620,
    }),
    tasks: buildTasksSnapshot({
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      taskKey: "story_first_production_line",
    }),
  }));

  assert.equal(recommendations.length, 3);
  assert.equal(new Set(recommendations.map((item) => item.id)).size, 3);
  assert.equal(recommendations[0]?.category, "FINANCE");
});

function buildRecommendationInput(
  overrides: Partial<Parameters<typeof buildManagerRecommendations>[0]> = {},
): Parameters<typeof buildManagerRecommendations>[0] {
  return {
    activeOrderCount: 1,
    activeProductionOrderCount: 1,
    cashBalanceCents: "250000",
    currentDay: 10,
    investment: buildInvestmentView(),
    lateOrderCount: 0,
    mapSections: buildMapSections(),
    productionQueues: buildProductionQueues(),
    tasks: buildTasksSnapshot({
      objectiveType: TaskObjectiveType.COMPLETE_SHIFT,
      taskKey: "story_first_shift",
    }),
    ...overrides,
  };
}

function buildTasksSnapshot(input: {
  objectiveType: TaskObjectiveType;
  taskKey: string;
}): TasksSnapshot {
  const activeTask = buildTask({
    key: input.taskKey,
    objectiveType: input.objectiveType,
    status: TaskProgressStatus.ACTIVE,
  });

  return {
    activeStoryTask: activeTask,
    activeTasks: [activeTask],
    claimedTaskHistory: [],
    completedUnclaimedTasks: [],
    summary: {
      activeCount: 1,
      claimedCount: 0,
      completedUnclaimedCount: 0,
    },
    tokenBalance: 0,
  };
}

function buildTask(input: {
  key: string;
  objectiveType: TaskObjectiveType;
  status: TaskProgressStatus;
}): TaskSnapshot {
  return {
    completedDay: null,
    completionMessage: null,
    cta: {
      kind: "PANEL",
      label: "Yatırımları İncele",
      panel: "investment",
    },
    currentValue: 0,
    description: `${input.key} açıklaması`,
    id: input.key,
    key: input.key,
    objectiveType: input.objectiveType,
    progressBps: 0,
    reward: {
      cashCents: null,
      runwayTokens: 0,
      xp: 0,
    },
    status: input.status,
    targetValue: 1,
    taskType: TaskType.STORY,
    title: `${input.key} başlığı`,
  };
}

function buildInvestmentView(): ManagerInvestmentInput {
  return {
    departments: [
      {
        id: "sewing",
        templates: [
          {
            departmentId: "sewing",
            leasingOffers: [
              {
                downPaymentCents: "20000",
              },
            ],
            purchaseCostCents: "200000",
          },
        ],
      },
    ],
  };
}

function buildProductionQueues(input: {
  deliveryTone?: "danger" | "info" | "success" | "warning";
  remainingWorkPoints?: number;
} = {}): ManagerProductionQueuesInput {
  const remainingWorkPoints = input.remainingWorkPoints ?? 80;

  return {
    queues: [
      {
        activeLineCount: 1,
        departmentId: "sewing",
        departmentKey: "sewing",
        effectiveDailyPointCapacity: 100,
        items: [
          {
            deliveryTone: input.deliveryTone ?? "info",
            remainingWorkPoints,
          },
        ],
        label: "Dikim",
        outsourceCandidates: remainingWorkPoints > 300 ? [{}] : [],
        summary: {
          queueCount: remainingWorkPoints > 0 ? 1 : 0,
        },
      },
    ],
  };
}

function buildMapSections(input: {
  assignedStaff?: number;
  hasActiveLeasingContract?: boolean;
  idealStaff?: number;
} = {}): ManagerMapSectionsInput {
  return [
    {
      items: [
        {
          assignedStaff: input.assignedStaff ?? 2,
          departmentId: "sewing",
          departmentKey: "sewing",
          departmentName: "Dikim",
          hasActiveLeasingContract: input.hasActiveLeasingContract ?? false,
          idealStaff: input.idealStaff ?? 2,
          kind: "productionLine",
          lineId: "line-sewing-1",
          status: FactoryProductionLineStatus.IDLE,
          title: "Dikim Hattı 1",
        },
      ],
    },
  ];
}

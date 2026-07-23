import assert from "node:assert/strict";
import test from "node:test";

import {
  Prisma,
  TaskObjectiveType,
  TaskProgressStatus,
  TaskType,
} from "@/generated/prisma/client";

import {
  advanceFactoryTaskProgress,
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
      metadata: { acquisitionType: "PURCHASED" },
    }),
    true,
  );
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

test("hikaye zinciri oyuncu sipariş kabul etmezse ilk görevi aktif bırakır", async () => {
  const harness = buildStoryTaskHarness();

  await harness.ensureProgress();

  assert.equal(harness.getStatus("story_first_normal_order"), TaskProgressStatus.ACTIVE);
  assert.equal(harness.getStatus("story_first_shift"), TaskProgressStatus.LOCKED);
});

test("hikaye zinciri normal siparişten leasing yatırımı ve yeni hat kullanımına sırayla akar", async () => {
  const harness = buildStoryTaskHarness();

  await harness.advance(TaskObjectiveType.ACCEPT_ORDER, {
    offerType: "NORMAL",
    orderId: "order-1",
  });
  assert.equal(harness.getStatus("story_first_normal_order"), TaskProgressStatus.COMPLETED);
  assert.equal(harness.getStatus("story_first_shift"), TaskProgressStatus.ACTIVE);

  const duplicateOrder = await harness.advance(TaskObjectiveType.ACCEPT_ORDER, {
    offerType: "NORMAL",
    orderId: "order-1",
  });
  assert.deepEqual(duplicateOrder.completedTaskProgressIds, []);

  await harness.advance(TaskObjectiveType.COMPLETE_SHIFT);
  await harness.advance(TaskObjectiveType.SHIP_ON_TIME);
  await harness.advance(TaskObjectiveType.PAYMENT_RECEIVED);
  await harness.advance(TaskObjectiveType.CHANGE_PRIORITY);
  await harness.advance(TaskObjectiveType.OPEN_INVESTMENT_PANEL);

  assert.equal(harness.getStatus("story_first_production_line"), TaskProgressStatus.ACTIVE);

  await harness.advance(TaskObjectiveType.ACQUIRE_PRODUCTION_LINE, {
    acquisitionType: "LEASED",
    productionLineId: "leased-line-1",
  });

  assert.equal(harness.getStatus("story_first_production_line"), TaskProgressStatus.COMPLETED);
  assert.equal(harness.getStatus("story_first_new_line_usage"), TaskProgressStatus.ACTIVE);

  await harness.advance(TaskObjectiveType.USE_NEW_PRODUCTION_LINE, {
    productionLineId: "leased-line-1",
  });

  assert.equal(harness.getStatus("story_first_new_line_usage"), TaskProgressStatus.COMPLETED);
});

test("yatırım görevi starter hattı kabul etmez ve satın alma event'ini kabul eder", async () => {
  const starterHarness = buildStoryTaskHarness();
  await starterHarness.activateInvestmentTask();

  await starterHarness.advance(TaskObjectiveType.ACQUIRE_PRODUCTION_LINE, {
    acquisitionType: "STARTER",
    productionLineId: "starter-line",
  });
  assert.equal(
    starterHarness.getStatus("story_first_production_line"),
    TaskProgressStatus.ACTIVE,
  );

  const purchasedHarness = buildStoryTaskHarness();
  await purchasedHarness.activateInvestmentTask();

  await purchasedHarness.advance(TaskObjectiveType.ACQUIRE_PRODUCTION_LINE, {
    acquisitionType: "PURCHASED",
    productionLineId: "purchased-line-1",
  });
  assert.equal(
    purchasedHarness.getStatus("story_first_production_line"),
    TaskProgressStatus.COMPLETED,
  );
});

test("seviye kilitli görev önkoşul tamamlansa da gerekli level gelmeden açılmaz", async () => {
  const harness = buildStoryTaskHarness(19);
  await harness.activateInvestmentTask();
  await harness.advance(TaskObjectiveType.ACQUIRE_PRODUCTION_LINE, {
    acquisitionType: "PURCHASED",
    productionLineId: "line-1",
  });
  await harness.advance(TaskObjectiveType.USE_NEW_PRODUCTION_LINE, {
    productionLineId: "line-1",
  });

  assert.equal(
    harness.getStatus("story_level_20_gate"),
    TaskProgressStatus.LOCKED,
  );

  harness.setLevel(20);
  await harness.ensureProgress();

  assert.equal(
    harness.getStatus("story_level_20_gate"),
    TaskProgressStatus.ACTIVE,
  );
});

type StoryDefinition = {
  activationDay: number | null;
  activationLevel: number | null;
  id: string;
  key: string;
  objectiveConfig: Prisma.JsonValue | null;
  objectiveType: TaskObjectiveType;
  prerequisiteTaskKey: string | null;
  rewardCashCents: bigint | null;
  rewardRunwayTokens: number;
  rewardXp: number;
  sortOrder: number;
  targetValue: number;
};

type StoryProgress = {
  completedDay: number | null;
  currentValue: number;
  id: string;
  metadata: Prisma.JsonValue | null;
  rewardSnapshot: Prisma.JsonValue | null;
  startedDay: number | null;
  status: TaskProgressStatus;
  targetValue: number;
  taskDefinitionId: string;
};

function buildStoryTaskHarness(startingLevel = 25) {
  const currentDay = 4;
  let currentLevel = startingLevel;
  const factoryId = "factory-1";
  const definitions = buildStoryDefinitions();
  const progressRows: StoryProgress[] = [];

  const tx = {
    factory: {
      findUniqueOrThrow: async () => ({
        currentDay,
        currentLevel,
        sectorId: "textile",
      }),
    },
    taskDefinition: {
      findMany: async () => definitions,
    },
    factoryTaskProgress: {
      upsert: async ({
        create,
        where,
      }: {
        create: StoryProgress;
        where: {
          factoryId_taskDefinitionId_instanceKey: {
            taskDefinitionId: string;
          };
        };
      }) => {
        const existing = progressRows.find(
          (row) =>
            row.taskDefinitionId ===
            where.factoryId_taskDefinitionId_instanceKey.taskDefinitionId,
        );

        if (existing) return existing;

        progressRows.push({
          completedDay: null,
          currentValue: 0,
          id: `progress-${progressRows.length + 1}`,
          metadata: create.metadata,
          rewardSnapshot: create.rewardSnapshot,
          startedDay: null,
          status: create.status,
          targetValue: create.targetValue,
          taskDefinitionId: create.taskDefinitionId,
        });

        return progressRows.at(-1);
      },
      findMany: async (args: {
        where?: {
          status?: TaskProgressStatus;
          taskDefinition?: { objectiveType?: TaskObjectiveType };
        };
      }) => {
        const objectiveType = args.where?.taskDefinition?.objectiveType;
        const status = args.where?.status;
        const rows = progressRows
          .map((row) => ({ row, definition: findDefinition(definitions, row.taskDefinitionId) }))
          .filter(({ row, definition }) => {
            if (status && row.status !== status) return false;
            if (objectiveType && definition.objectiveType !== objectiveType) return false;
            return true;
          })
          .sort((first, second) => first.definition.sortOrder - second.definition.sortOrder);

        if (objectiveType) {
          return rows.map(({ row, definition }) => ({
            id: row.id,
            currentValue: row.currentValue,
            targetValue: row.targetValue,
            taskDefinition: {
              objectiveConfig: definition.objectiveConfig,
            },
          }));
        }

        return rows.map(({ row, definition }) => ({
          id: row.id,
          status: row.status,
          taskDefinition: {
            activationDay: definition.activationDay,
            activationLevel: definition.activationLevel,
            key: definition.key,
            prerequisiteTaskKey: definition.prerequisiteTaskKey,
          },
        }));
      },
      update: async ({
        data,
        where,
      }: {
        data: Partial<StoryProgress>;
        where: { id: string };
      }) => {
        const row = progressRows.find((item) => item.id === where.id);
        if (!row) throw new Error(`Progress not found: ${where.id}`);
        Object.assign(row, data);
        return row;
      },
    },
  } as unknown as Parameters<typeof advanceFactoryTaskProgress>[0]["tx"];

  return {
    advance: (objectiveType: TaskObjectiveType, metadata: Prisma.InputJsonObject = {}) =>
      advanceFactoryTaskProgress({
        currentDay,
        event: { metadata, objectiveType },
        factoryId,
        tx,
      }),
    activateInvestmentTask: async () => {
      await advanceFactoryTaskProgress({
        currentDay,
        event: { metadata: { offerType: "NORMAL" }, objectiveType: TaskObjectiveType.ACCEPT_ORDER },
        factoryId,
        tx,
      });
      await advanceFactoryTaskProgress({
        currentDay,
        event: { objectiveType: TaskObjectiveType.COMPLETE_SHIFT },
        factoryId,
        tx,
      });
      await advanceFactoryTaskProgress({
        currentDay,
        event: { objectiveType: TaskObjectiveType.SHIP_ON_TIME },
        factoryId,
        tx,
      });
      await advanceFactoryTaskProgress({
        currentDay,
        event: { objectiveType: TaskObjectiveType.PAYMENT_RECEIVED },
        factoryId,
        tx,
      });
      await advanceFactoryTaskProgress({
        currentDay,
        event: { objectiveType: TaskObjectiveType.CHANGE_PRIORITY },
        factoryId,
        tx,
      });
      await advanceFactoryTaskProgress({
        currentDay,
        event: { objectiveType: TaskObjectiveType.OPEN_INVESTMENT_PANEL },
        factoryId,
        tx,
      });
    },
    ensureProgress: () =>
      advanceFactoryTaskProgress({
        currentDay,
        event: { objectiveType: TaskObjectiveType.COMPLETE_EXPRESS_ORDER },
        factoryId,
        tx,
      }),
    getStatus: (key: string) => {
      const definition = definitions.find((item) => item.key === key);
      const row = definition
        ? progressRows.find((item) => item.taskDefinitionId === definition.id)
        : null;
      return row?.status ?? null;
    },
    setLevel: (level: number) => {
      currentLevel = level;
    },
  };
}

function buildStoryDefinitions(): StoryDefinition[] {
  const rows: Array<
    [string, TaskObjectiveType, string | null, (number | null)?]
  > = [
    ["story_first_normal_order", TaskObjectiveType.ACCEPT_ORDER, null],
    ["story_first_shift", TaskObjectiveType.COMPLETE_SHIFT, "story_first_normal_order"],
    ["story_first_on_time_delivery", TaskObjectiveType.SHIP_ON_TIME, "story_first_shift"],
    ["story_first_customer_payment", TaskObjectiveType.PAYMENT_RECEIVED, "story_first_on_time_delivery"],
    ["story_first_priority_change", TaskObjectiveType.CHANGE_PRIORITY, "story_first_on_time_delivery"],
    ["story_first_investment_review", TaskObjectiveType.OPEN_INVESTMENT_PANEL, "story_first_priority_change"],
    ["story_first_production_line", TaskObjectiveType.ACQUIRE_PRODUCTION_LINE, "story_first_investment_review"],
    ["story_first_new_line_usage", TaskObjectiveType.USE_NEW_PRODUCTION_LINE, "story_first_production_line"],
    [
      "story_level_20_gate",
      TaskObjectiveType.COMPLETE_PREMIUM_ORDER,
      "story_first_new_line_usage",
      20,
    ],
  ];

  return rows.map(
    ([key, objectiveType, prerequisiteTaskKey, activationLevel], index) => ({
      activationDay: 4,
      activationLevel: activationLevel ?? null,
      id: `definition-${index + 1}`,
      key,
      objectiveConfig:
        key === "story_first_production_line"
          ? { acquisitionTypes: ["PURCHASED", "LEASED"] }
          : null,
      objectiveType,
      prerequisiteTaskKey,
      rewardCashCents: null,
      rewardRunwayTokens: 0,
      rewardXp: 100,
      sortOrder: (index + 1) * 10,
      targetValue: 1,
      taskType: TaskType.STORY,
    }),
  );
}

function findDefinition(definitions: StoryDefinition[], taskDefinitionId: string) {
  const definition = definitions.find((item) => item.id === taskDefinitionId);
  if (!definition) throw new Error(`Definition not found: ${taskDefinitionId}`);
  return definition;
}

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

test("objective config departman grubu ve minimum aktif hat sayısını filtreler", () => {
  const config = {
    departmentGroupKeys: ["value_added_processes"],
    minimumActiveDepartmentGroupLineCount: 2,
  };

  assert.equal(
    matchesTaskEvent(config, {
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      metadata: {
        activeDepartmentGroupLineCount: 2,
        departmentGroupKey: "value_added_processes",
      },
    }),
    true,
  );
  assert.equal(
    matchesTaskEvent(config, {
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      metadata: {
        activeDepartmentGroupLineCount: 1,
        departmentGroupKey: "value_added_processes",
      },
    }),
    false,
  );
  assert.equal(
    matchesTaskEvent(config, {
      objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
      metadata: {
        activeDepartmentGroupLineCount: 2,
        departmentGroupKey: "main_production",
      },
    }),
    false,
  );
});

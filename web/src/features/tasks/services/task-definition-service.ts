import {
  ContentStatus,
  Prisma,
  TaskObjectiveType,
  TaskProgressStatus,
  TaskType,
} from "@/generated/prisma/client";

type TaskClient = Prisma.TransactionClient;

export const STORY_TASK_INSTANCE_KEY = "STORY:default";
export const GLOBAL_TASK_SCOPE_KEY = "GLOBAL";

export type TaskEvent = {
  objectiveType: TaskObjectiveType;
  amount?: number;
  metadata?: Prisma.InputJsonObject;
};

export type TaskRewardSnapshot = {
  rewardCashCents: string | null;
  rewardRunwayTokens: number;
  rewardXp: number;
  targetValue: number;
};

export function buildTaskRewardSnapshot(input: {
  rewardCashCents: bigint | null;
  rewardRunwayTokens: number;
  rewardXp: number;
  targetValue: number;
}): TaskRewardSnapshot {
  return {
    rewardCashCents: input.rewardCashCents?.toString() ?? null,
    rewardRunwayTokens: Math.max(0, Math.trunc(input.rewardRunwayTokens)),
    rewardXp: Math.max(0, Math.trunc(input.rewardXp)),
    targetValue: Math.max(1, Math.trunc(input.targetValue)),
  };
}

export async function ensureFactoryTaskProgress(input: {
  currentDay?: number;
  factoryId: string;
  tx: TaskClient;
}) {
  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: { currentDay: true, currentLevel: true, sectorId: true },
  });
  const currentDay = input.currentDay ?? factory.currentDay;
  const definitions = await input.tx.taskDefinition.findMany({
    where: {
      scopeKey: { in: [factory.sectorId, GLOBAL_TASK_SCOPE_KEY] },
      status: ContentStatus.ACTIVE,
      taskType: TaskType.STORY,
      OR: [{ sectorId: factory.sectorId }, { sectorId: null }],
    },
    orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    select: {
      id: true,
      activationDay: true,
      activationLevel: true,
      key: true,
      objectiveConfig: true,
      objectiveType: true,
      prerequisiteTaskKey: true,
      rewardCashCents: true,
      rewardRunwayTokens: true,
      rewardXp: true,
      targetValue: true,
    },
  });

  for (const definition of definitions) {
    await input.tx.factoryTaskProgress.upsert({
      where: {
        factoryId_taskDefinitionId_instanceKey: {
          factoryId: input.factoryId,
          instanceKey: STORY_TASK_INSTANCE_KEY,
          taskDefinitionId: definition.id,
        },
      },
      create: {
        factoryId: input.factoryId,
        taskDefinitionId: definition.id,
        instanceKey: STORY_TASK_INSTANCE_KEY,
        status: TaskProgressStatus.LOCKED,
        targetValue: Math.max(1, definition.targetValue),
        rewardSnapshot: buildTaskRewardSnapshot(definition),
        metadata: {
          activationLevel: definition.activationLevel ?? null,
          objectiveType: definition.objectiveType,
          objectiveConfig: definition.objectiveConfig ?? null,
        },
      },
      update: {},
    });
  }

  await refreshFactoryTaskAvailability({
    currentDay,
    currentLevel: factory.currentLevel,
    factoryId: input.factoryId,
    tx: input.tx,
  });

  return definitions.length;
}

export async function refreshFactoryTaskAvailability(input: {
  currentDay: number;
  currentLevel: number;
  factoryId: string;
  tx: TaskClient;
}) {
  const progressRows = await input.tx.factoryTaskProgress.findMany({
    where: { factoryId: input.factoryId },
    orderBy: { taskDefinition: { sortOrder: "asc" } },
    select: {
      id: true,
      status: true,
      taskDefinition: {
        select: {
          activationDay: true,
          activationLevel: true,
          key: true,
          prerequisiteTaskKey: true,
        },
      },
    },
  });
  const statusByTaskKey = new Map(
    progressRows.map((row) => [row.taskDefinition.key, row.status]),
  );

  for (const row of progressRows) {
    if (row.status !== TaskProgressStatus.LOCKED) continue;
    if (
      row.taskDefinition.activationDay !== null &&
      row.taskDefinition.activationDay > input.currentDay
    ) {
      continue;
    }
    if (
      row.taskDefinition.activationLevel !== null &&
      row.taskDefinition.activationLevel > input.currentLevel
    ) {
      continue;
    }

    const prerequisiteTaskKey = row.taskDefinition.prerequisiteTaskKey;
    const prerequisiteStatus = prerequisiteTaskKey
      ? statusByTaskKey.get(prerequisiteTaskKey)
      : undefined;
    const prerequisiteCompleted =
      !prerequisiteTaskKey ||
      prerequisiteStatus === TaskProgressStatus.COMPLETED ||
      prerequisiteStatus === TaskProgressStatus.CLAIMED;

    if (!prerequisiteCompleted) continue;

    await input.tx.factoryTaskProgress.update({
      where: { id: row.id },
      data: {
        startedDay: input.currentDay,
        status: TaskProgressStatus.ACTIVE,
      },
    });
    statusByTaskKey.set(row.taskDefinition.key, TaskProgressStatus.ACTIVE);
  }

  return progressRows;
}

export async function advanceFactoryTaskProgress(input: {
  currentDay?: number;
  factoryId: string;
  event: TaskEvent;
  tx: TaskClient;
}) {
  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: { currentDay: true, currentLevel: true },
  });
  const currentDay = input.currentDay ?? factory.currentDay;

  await ensureFactoryTaskProgress({
    currentDay,
    factoryId: input.factoryId,
    tx: input.tx,
  });

  const activeProgressRows = await input.tx.factoryTaskProgress.findMany({
    where: {
      factoryId: input.factoryId,
      status: TaskProgressStatus.ACTIVE,
      taskDefinition: {
        objectiveType: input.event.objectiveType,
      },
    },
    select: {
      id: true,
      currentValue: true,
      targetValue: true,
      taskDefinition: {
        select: { objectiveConfig: true },
      },
    },
  });
  const amount = Math.max(1, Math.trunc(input.event.amount ?? 1));
  const completedTaskProgressIds: string[] = [];

  for (const progress of activeProgressRows) {
    if (!matchesTaskEvent(progress.taskDefinition.objectiveConfig, input.event)) {
      continue;
    }

    const nextValue = Math.min(
      progress.targetValue,
      progress.currentValue + amount,
    );
    const completed = nextValue >= progress.targetValue;

    await input.tx.factoryTaskProgress.update({
      where: { id: progress.id },
      data: {
        currentValue: nextValue,
        ...(completed
          ? {
              completedDay: currentDay,
              status: TaskProgressStatus.COMPLETED,
            }
          : {}),
      },
    });

    if (completed) completedTaskProgressIds.push(progress.id);
  }

  if (completedTaskProgressIds.length > 0) {
    await refreshFactoryTaskAvailability({
      currentDay,
      currentLevel: factory.currentLevel,
      factoryId: input.factoryId,
      tx: input.tx,
    });
  }

  return {
    completedTaskProgressIds,
    updatedCount: activeProgressRows.length,
  };
}

export function matchesTaskEvent(
  objectiveConfig: Prisma.JsonValue | null,
  event: TaskEvent,
) {
  if (!isJsonRecord(objectiveConfig)) return true;
  const metadata = event.metadata ?? {};
  const acquisitionTypes = objectiveConfig.acquisitionTypes;

  if (Array.isArray(acquisitionTypes)) {
    const allowedAcquisitionTypes = acquisitionTypes.filter(
      (value): value is string => typeof value === "string",
    );
    const acquisitionType = metadata.acquisitionType;

    if (
      allowedAcquisitionTypes.length > 0 &&
      (typeof acquisitionType !== "string" ||
        !allowedAcquisitionTypes.includes(acquisitionType))
    ) {
      return false;
    }
  }

  const departmentGroupKeys = objectiveConfig.departmentGroupKeys;

  if (Array.isArray(departmentGroupKeys)) {
    const allowedDepartmentGroupKeys = departmentGroupKeys.filter(
      (value): value is string => typeof value === "string",
    );
    const departmentGroupKey = metadata.departmentGroupKey;

    if (
      allowedDepartmentGroupKeys.length > 0 &&
      (typeof departmentGroupKey !== "string" ||
        !allowedDepartmentGroupKeys.includes(departmentGroupKey))
    ) {
      return false;
    }
  }

  const minimumActiveDepartmentGroupLineCount =
    objectiveConfig.minimumActiveDepartmentGroupLineCount;

  if (
    typeof minimumActiveDepartmentGroupLineCount === "number" &&
    (typeof metadata.activeDepartmentGroupLineCount !== "number" ||
      metadata.activeDepartmentGroupLineCount <
        minimumActiveDepartmentGroupLineCount)
  ) {
    return false;
  }

  for (const [key, expectedValue] of Object.entries(objectiveConfig)) {
    if (
      key === "acquisitionTypes" ||
      key === "departmentGroupKeys" ||
      key === "minimumActiveDepartmentGroupLineCount"
    ) {
      continue;
    }
    if (metadata[key] !== expectedValue) return false;
  }

  return true;
}

function isJsonRecord(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

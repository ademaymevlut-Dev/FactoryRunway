import type { Prisma } from "@/generated/prisma/client";
import type {
  TaskObjectiveType,
  TaskProgressStatus,
  TaskType,
} from "@/generated/prisma/enums";

import { buildTaskCta } from "./task-cta";
import type { TaskSnapshot, TasksSnapshot } from "../types";

type TaskProgressRow = {
  completedDay: number | null;
  currentValue: number;
  id: string;
  rewardSnapshot: Prisma.JsonValue | null;
  status: TaskProgressStatus;
  targetValue: number;
  taskDefinition: {
    key: string;
    objectiveType: TaskObjectiveType;
    rewardCashCents: bigint | null;
    rewardRunwayTokens: number;
    rewardXp: number;
    sortOrder: number;
    taskType: TaskType;
    translations: Array<{
      description: string;
      locale: string;
      title: string;
    }>;
  };
};

export function buildTasksSnapshot(input: {
  progressRows: TaskProgressRow[];
  tokenBalance: number;
}): TasksSnapshot {
  const allTasks = [...input.progressRows]
    .sort(
      (first, second) =>
        first.taskDefinition.sortOrder - second.taskDefinition.sortOrder,
    )
    .map(mapTaskProgressRow);
  const activeTasks = allTasks.filter((task) => task.status === "ACTIVE");
  const completedUnclaimedTasks = allTasks.filter(
    (task) => task.status === "COMPLETED",
  );
  const claimedTaskHistory = allTasks.filter(
    (task) => task.status === "CLAIMED",
  );

  return {
    activeStoryTask:
      activeTasks.find((task) => task.taskType === "STORY") ?? null,
    activeTasks,
    claimedTaskHistory,
    completedUnclaimedTasks,
    summary: {
      activeCount: activeTasks.length,
      claimedCount: claimedTaskHistory.length,
      completedUnclaimedCount: completedUnclaimedTasks.length,
    },
    tokenBalance: Math.max(0, Math.trunc(input.tokenBalance)),
  };
}

function mapTaskProgressRow(row: TaskProgressRow): TaskSnapshot {
  const translation =
    row.taskDefinition.translations.find((item) => item.locale === "tr") ??
    row.taskDefinition.translations.find((item) => item.locale === "en") ??
    row.taskDefinition.translations[0];
  const targetValue = Math.max(1, row.targetValue);
  const currentValue = Math.min(targetValue, Math.max(0, row.currentValue));

  return {
    completedDay: row.completedDay,
    cta: buildTaskCta(row.taskDefinition.objectiveType),
    currentValue,
    description: translation?.description ?? row.taskDefinition.key,
    id: row.id,
    key: row.taskDefinition.key,
    objectiveType: row.taskDefinition.objectiveType,
    progressBps: Math.min(10_000, Math.floor((currentValue * 10_000) / targetValue)),
    reward: {
      cashCents: readRewardCashCents(
        row.rewardSnapshot,
        row.taskDefinition.rewardCashCents,
      ),
      runwayTokens: readRewardNumber(
        row.rewardSnapshot,
        "rewardRunwayTokens",
        row.taskDefinition.rewardRunwayTokens,
      ),
      xp: readRewardNumber(row.rewardSnapshot, "rewardXp", row.taskDefinition.rewardXp),
    },
    status: row.status,
    targetValue,
    taskType: row.taskDefinition.taskType,
    title: translation?.title ?? row.taskDefinition.key,
  };
}

function readRewardCashCents(
  snapshot: Prisma.JsonValue | null,
  fallback: bigint | null,
) {
  if (isJsonRecord(snapshot) && typeof snapshot.rewardCashCents === "string") {
    return snapshot.rewardCashCents;
  }

  return fallback?.toString() ?? null;
}

function readRewardNumber(
  snapshot: Prisma.JsonValue | null,
  key: "rewardRunwayTokens" | "rewardXp",
  fallback: number,
) {
  if (isJsonRecord(snapshot) && typeof snapshot[key] === "number") {
    return Math.max(0, Math.trunc(snapshot[key]));
  }

  return Math.max(0, Math.trunc(fallback));
}

function isJsonRecord(
  value: Prisma.JsonValue | null,
): value is Prisma.JsonObject & Record<string, Prisma.JsonValue> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

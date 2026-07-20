import type {
  TaskObjectiveType,
  TaskProgressStatus,
  TaskType,
} from "@/generated/prisma/enums";

export type TaskPanelTarget =
  | "orders"
  | "production"
  | "tasks"
  | "staff"
  | "finance"
  | "reports"
  | "warehouse"
  | "departmentQueue"
  | "investment";

export type TaskCta =
  | {
      kind: "PANEL";
      label: string;
      panel: TaskPanelTarget;
      payload?: Record<string, string | number | boolean | null>;
    }
  | {
      kind: "SHIFT";
      label: string;
    }
  | null;

export type TaskRewardView = {
  cashCents: string | null;
  runwayTokens: number;
  xp: number;
};

export type TaskSnapshot = {
  completedDay: number | null;
  cta: TaskCta;
  currentValue: number;
  description: string;
  id: string;
  key: string;
  objectiveType: TaskObjectiveType;
  progressBps: number;
  reward: TaskRewardView;
  status: TaskProgressStatus;
  targetValue: number;
  taskType: TaskType;
  title: string;
};

export type TasksSnapshot = {
  activeStoryTask: TaskSnapshot | null;
  activeTasks: TaskSnapshot[];
  claimedTaskHistory: TaskSnapshot[];
  completedUnclaimedTasks: TaskSnapshot[];
  summary: {
    activeCount: number;
    claimedCount: number;
    completedUnclaimedCount: number;
  };
  tokenBalance: number;
};

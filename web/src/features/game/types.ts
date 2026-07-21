import type {
  CurrencyCode,
  DepartmentKind,
  LineAcquisitionType,
  FactoryProductionLineStatus,
  ProductionGrade,
} from "@/generated/prisma/enums";
import type { OrderMarketView } from "@/features/orders/types";
import type { GameProductionQueuesView } from "@/features/production-queue/types";
import type { GameWarehouseView } from "@/features/warehouse/types";
import type { ProductionLineInvestmentView } from "@/features/investment/types";
import type { ManagerRecommendation } from "@/features/manager/types";
import type { TasksSnapshot } from "@/features/tasks/types";

export type GamePanelKey =
  | "orders"
  | "production"
  | "tasks"
  | "staff"
  | "finance"
  | "reports"
  | "warehouse"
  | "departmentQueue"
  | "cutting"
  | "lineDetail"
  | "investment"
  | "departmentDetail";

export type GameMetric = {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  tone: "cyan" | "green" | "amber" | "red" | "violet" | "blue";
};

export type GameNotification = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "danger" | "success";
};

export type ShiftQuantityPoint = {
  minute: number;
  quantity: number;
};

export type ShiftDepartmentPlayback = {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  activeLineCount: number;
  performance: {
    nominalCapacityPoints: number;
    effectiveCapacityPoints: number;
    queueLoadPoints: number;
    usedPoints: number;
    unusedPoints: number;
    efficiencyBps: number;
    capacityLossBps: number;
  };
  startingQueueQuantity: number;
  queueEnteredQuantity: number;
  producedQuantity: number;
  endingQueueQuantity: number;
  productionStartMinute: number | null;
  productionEndMinute: number | null;
  queueEnteredTimeline: ShiftQuantityPoint[];
  producedTimeline: ShiftQuantityPoint[];
};

export type ShiftPlaybackTimelineEvent = {
  id: string;
  gameDay: number;
  minute: number;
  sequence: number;
  eventKey: string;
  category:
    | "PRODUCTION"
    | "FINANCE"
    | "SHIPPING"
    | "PAYMENT"
    | "OUTSOURCING"
    | "SYSTEM"
    | "STAFF"
    | "MACHINE";
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  payload: Record<string, string | number | boolean | null>;
  sourceType?: string;
  sourceId?: string;
};

export type ShiftProductResult = {
  productId: string;
  productName: string;
  productImageUrl: string | null;
  orderId: string | null;
  orderCode: string | null;
  totalProcessedQuantity: number;
  departments: Array<{
    departmentId: string;
    departmentName: string;
    processedQuantity: number;
  }>;
};

export type ShiftPlayback = {
  shiftId: string;
  factoryId: string;
  simulatedGameDay: number;
  nextGameDay: number;
  simulationStatus: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  simulationVersion: string;
  playbackStartedAt: string;
  playbackEndsAt: string;
  playbackDurationSeconds: number;
  isActive: boolean;
  summary: {
    totalProducedQuantity: number;
    activeLineCount: number;
    blockedLineCount: number;
    averageUtilizationBps: number;
  };
  departmentResults: ShiftDepartmentPlayback[];
  productResults: ShiftProductResult[];
  timelineEvents: ShiftPlaybackTimelineEvent[];
};

export type AdvanceFactoryDayActionResult =
  | {
      ok: true;
      outcome: "STARTED" | "ACTIVE_PLAYBACK" | "IDEMPOTENT_REPLAY";
      playback: ShiftPlayback;
      warning?: string;
    }
  | {
      ok: false;
      code: "SHIFT_START_FAILED" | "SHIFT_RESULT_NOT_FOUND";
      message: string;
    };

export type FactoryMapDepartment = {
  id: string;
  key: string;
  iconKey: string;
  name: string;
  kind: DepartmentKind;
  routeOrder: number;
  supportsOutsource: boolean;
};

export type FactoryLineWorkloadState =
  | "empty"
  | "low"
  | "thin"
  | "balanced"
  | "constrained"
  | "critical";

export type FactoryLineWorkload = {
  dailyPointCapacity: number;
  daysLabel: string;
  effectiveDailyPointCapacity: number;
  label: string;
  remainingDays: number | null;
  remainingWorkPoints: number;
  state: FactoryLineWorkloadState;
};

export type FactoryMapItem =
  | {
      kind: "productionLine";
      id: string;
      lineId: string;
      departmentId: string;
      departmentKey: string;
      departmentName: string;
      code: string;
      title: string;
      subtitle: string;
      acquisitionType: LineAcquisitionType;
      status: FactoryProductionLineStatus;
      grade: ProductionGrade;
      productionLineTemplateId: string;
      lineNumber: number;
      sortOrder: number;
      conditionBps: number;
      dailyPointCapacity: number;
      idealStaff: number;
      assignedStaff: number;
      machineCount: number;
      areaM2: number;
      monthlyElectricityBaseCents: number;
      purchaseCostCents: string;
      hasActiveLeasingContract: boolean;
      imageUrl: string | null;
      detailImageUrl: string | null;
      workload: FactoryLineWorkload;
    }
  | {
      kind: "investmentAction";
      id: string;
      sectionId: string;
      departmentIds: string[];
      title: string;
      subtitle: string;
    };

export type FactoryMapSection = {
  id: string;
  key: string;
  step: string;
  title: string;
  tone: "cyan" | "blue" | "amber" | "red" | "violet" | "green";
  departments: FactoryMapDepartment[];
  items: FactoryMapItem[];
  productionLineCount: number;
  departmentCount: number;
};

export type GameDockBadge = {
  count: number;
  icon?: "check";
  label: string;
  tone: "info" | "warning" | "danger" | "success";
};

export type GameDockItem = {
  id: string;
  label: string;
  iconKey: string;
  departmentIds: string[];
  departmentKeys: string[];
  kind: DepartmentKind;
  sortOrder: number;
  badge: GameDockBadge | null;
};

export type GameSnapshot = {
  player: {
    id: string;
    displayName: string;
  };
  factory: {
    id: string;
    name: string;
    sectorName: string;
    currencyCode: CurrencyCode;
    cashBalanceCents: string;
    currentDay: number;
    currentFinancePeriod: number;
    currentLevel: number;
    currentXp: number;
    levelProgress: {
      currentLevelRequiredXp: number;
      nextLevel: number | null;
      nextLevelRequiredXp: number | null;
      progressBps: number | null;
      xpForNextLevel: number | null;
      xpIntoCurrentLevel: number;
      xpRemainingForNextLevel: number | null;
    };
    operatingStageName: string;
  };
  metrics: GameMetric[];
  notifications: GameNotification[];
  managerRecommendations: ManagerRecommendation[];
  activeShiftPlayback: ShiftPlayback | null;
  tasks: TasksSnapshot;
  dock: {
    items: GameDockItem[];
    badges: Partial<
      Record<"orders" | "tasks" | "finance" | "reports", GameDockBadge>
    >;
  };
  orders: OrderMarketView;
  warehouse: GameWarehouseView;
  productionQueues: GameProductionQueuesView;
  investment: ProductionLineInvestmentView;
  map: {
    sections: FactoryMapSection[];
    totals: {
      productionLineCount: number;
      departmentCount: number;
      dailyPointCapacity: number;
      assignedStaff: number;
      idealStaff: number;
    };
  };
};

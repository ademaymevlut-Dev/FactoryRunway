import type { LocalizedShowcaseProduct } from "../../catalog-resolver";

export type ShiftSimulationLocale = "en" | "tr";

export type ShiftSimulationTarget =
  | "shift-bottleneck"
  | "shift-event"
  | "shift-planned"
  | "shift-progress"
  | "shift-start"
  | "shift-summary";

export type ShiftDepartmentStatus =
  | "bottleneck"
  | "on_plan"
  | "under_plan";

export type ShiftEventCode = "SEWING_MACHINE_BREAKDOWN";
export type ShiftEventSeverity = "critical" | "info" | "warning";

export type ShiftSimulationDepartment = {
  actualQuantity: number;
  departmentKey: string;
  inputQuantity: number;
  plannedQuantity: number;
  productKey: string;
  status: ShiftDepartmentStatus;
  utilizationPercent: number;
};

export type ShiftSimulationEvent = {
  code: ShiftEventCode;
  departmentKey: string;
  id: string;
  impactPercent?: number;
  severity: ShiftEventSeverity;
  triggerProgress: number;
};

export type ShiftFinishedGoods = {
  productKey: string;
  quantity: number;
};

export type ShiftSimulationSceneData = {
  departments: readonly ShiftSimulationDepartment[];
  events: readonly ShiftSimulationEvent[];
  finishedGoods: readonly ShiftFinishedGoods[];
  productKey: string;
  sceneId: string;
  shift: {
    endTime: string;
    playbackDurationMs: number;
    startTime: string;
  };
};

export type ShiftSimulationCallout = {
  description: string;
  id: string;
  number: string;
  target: ShiftSimulationTarget;
  title: string;
};

export type ShiftEventCopy = {
  categoryLabel: string;
  description: string;
  liveMessage: string;
  title: string;
};

export type ShiftSimulationSceneCopy = {
  acceleratedLabel: string;
  activeLineLabel: string;
  actualLabel: string;
  bottleneckSummary: string;
  calloutRailLabel: string;
  callouts: readonly ShiftSimulationCallout[];
  categoryLabel: string;
  colorsLabel: string;
  completedButtonLabel: string;
  completionLiveMessage: string;
  dayUnitLabel: string;
  differenceLabel: string;
  eventCopies: Record<ShiftEventCode, ShiftEventCopy>;
  eventPanelTitle: string;
  eventWaitingLabel: string;
  finishedGoodsLabel: string;
  inputLabel: string;
  notificationDescription: string;
  notificationTitle: string;
  pieceUnitLabel: string;
  plannedLabel: string;
  processedProductsLabel: string;
  productTypeLabel: string;
  progressAriaLabel: string;
  progressLabel: string;
  replayLabel: string;
  routeLabel: string;
  runningButtonLabel: string;
  sectionDescription: string;
  sectionEyebrow: string;
  sectionTitle: string;
  startButtonLabel: string;
  statuses: Record<ShiftDepartmentStatus, string>;
  summaryDescription: string;
  summaryPendingLabel: string;
  summaryTitle: string;
  utilizationLabel: string;
  wipNotice: string;
  workloadLabel: string;
  workloadUnitLabel: string;
};

export type ResolvedShiftSimulationDepartment =
  ShiftSimulationDepartment & {
    achievementPercent: number;
    departmentName: string;
    difference: number;
    product: LocalizedShowcaseProduct;
    routeStep: LocalizedShowcaseProduct["route"][number];
  };

export type ResolvedShiftSimulationEvent = ShiftSimulationEvent & {
  copy: ShiftEventCopy;
  departmentName: string;
};

export type ResolvedShiftFinishedGoods = ShiftFinishedGoods & {
  product: LocalizedShowcaseProduct;
};

export type ShiftSimulationSceneModel = {
  departments: readonly ResolvedShiftSimulationDepartment[];
  departmentsByKey: Readonly<
    Record<string, ResolvedShiftSimulationDepartment>
  >;
  events: readonly ResolvedShiftSimulationEvent[];
  finishedGoods: readonly ResolvedShiftFinishedGoods[];
  product: LocalizedShowcaseProduct;
  totalWorkload: number;
};

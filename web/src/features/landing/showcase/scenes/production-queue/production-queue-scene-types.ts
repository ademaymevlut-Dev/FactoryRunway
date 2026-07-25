import type { LocalizedShowcaseProduct } from "../../catalog-resolver";

export type ProductionQueueLocale = "en" | "tr";

export type ProductionQueueTarget =
  | "production-queue-list"
  | "queue-delivery-risk"
  | "queue-drag-handle"
  | "queue-planned"
  | "queue-remaining"
  | "queue-updated-plan";

export type ProductionQueueItemStatus =
  | "material_waiting"
  | "outsourcing_available"
  | "ready"
  | "urgent";

export type ProductionQueueWarningCode = "DELIVERY_RISK";

export type ProductionQueueSceneItem = {
  customerName: string;
  dueInDays: number;
  id: string;
  initialPlannedProduction: number;
  productKey: string;
  remainingQuantity: number;
  reorderedPlannedProduction: number;
  status: ProductionQueueItemStatus;
  warningCode?: ProductionQueueWarningCode;
};

export type ProductionQueueSceneData = {
  departmentKey: string;
  initialOrder: readonly string[];
  items: readonly ProductionQueueSceneItem[];
  movedItemId: string;
  reorderedOrder: readonly string[];
  sceneId: string;
};

export type ProductionQueueCallout = {
  description: string;
  id: string;
  number: string;
  target: ProductionQueueTarget;
  title: string;
};

export type ProductionQueueSceneCopy = {
  calloutRailLabel: string;
  callouts: readonly ProductionQueueCallout[];
  categoryLabel: string;
  colorsLabel: string;
  completedLabel: string;
  dayUnitLabel: string;
  departmentLabel: string;
  inputReadyLabel: string;
  liveReorderMessage: string;
  notificationDescription: string;
  notificationTitle: string;
  outsourceBadgeLabel: string;
  pieceUnitLabel: string;
  plannedLabel: string;
  plannedSummaryLabel: string;
  priorityLabel: string;
  productTypeLabel: string;
  queueDescription: string;
  queueLabel: string;
  queueListAriaLabel: string;
  remainingLabel: string;
  replayLabel: string;
  routeLabel: string;
  sectionDescription: string;
  sectionEyebrow: string;
  sectionTitle: string;
  statuses: Record<ProductionQueueItemStatus, string>;
  warningLabels: Record<ProductionQueueWarningCode, string>;
  workloadLabel: string;
  workloadUnitLabel: string;
};

export type ResolvedProductionQueueItem = ProductionQueueSceneItem & {
  product: LocalizedShowcaseProduct;
};

export type ProductionQueueSceneModel = {
  activeItem: ResolvedProductionQueueItem;
  departmentName: string;
  departmentStep: LocalizedShowcaseProduct["route"][number];
  items: readonly ResolvedProductionQueueItem[];
  itemsById: Readonly<Record<string, ResolvedProductionQueueItem>>;
  outsourceStep: LocalizedShowcaseProduct["route"][number];
  totalWorkload: number;
};

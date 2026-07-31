import type {
  ShipmentMapView,
  ShipmentSceneLevel,
  ShipmentSceneThresholds,
  ShipmentTileStatus,
  WarehouseProductDepotItem,
} from "../types";
import {
  DEFAULT_SHIPMENT_SCENE_THRESHOLDS,
  SHIPMENT_UNITS_PER_PALLET,
} from "../shipment-scene-config";

const statusPriority = {
  DELAYED: 0,
  COMPLETED: 1,
  IN_PROGRESS: 2,
} satisfies Record<ShipmentTileStatus, number>;

type ShipmentProjectionSource = Pick<
  WarehouseProductDepotItem,
  | "customerOrderItemId"
  | "customerOrderStatus"
  | "daysUntilDelivery"
  | "orderedQuantity"
  | "productionOrderId"
  | "warehouseReadyQuantity"
>;

export function createShipmentMapView(
  warehouseItems: readonly ShipmentProjectionSource[],
  thresholds: ShipmentSceneThresholds = DEFAULT_SHIPMENT_SCENE_THRESHOLDS,
): ShipmentMapView {
  validateSceneThresholds(thresholds);

  let readyProductCount = 0;
  let readyQuantity = 0;
  let status: ShipmentTileStatus | null = null;

  for (const item of warehouseItems) {
    if (!hasPhysicalWarehouseStock(item)) continue;

    readyProductCount += 1;
    readyQuantity += item.warehouseReadyQuantity;
    status = pickHigherPriorityStatus(status, getShipmentStatus(item));
  }

  return {
    estimatedPalletCount: Math.ceil(
      readyQuantity / SHIPMENT_UNITS_PER_PALLET,
    ),
    readyProductCount,
    readyQuantity,
    sceneLevel:
      readyQuantity > 0 ? getShipmentSceneLevel(readyQuantity, thresholds) : null,
    status,
  };
}

function hasPhysicalWarehouseStock(item: ShipmentProjectionSource) {
  return (
    Number.isFinite(item.warehouseReadyQuantity) &&
    item.warehouseReadyQuantity > 0
  );
}

function getShipmentStatus(
  item: ShipmentProjectionSource,
): ShipmentTileStatus {
  if (
    item.customerOrderStatus === "LATE" ||
    item.daysUntilDelivery < 0
  ) {
    return "DELAYED";
  }

  if (item.warehouseReadyQuantity >= item.orderedQuantity) {
    return "COMPLETED";
  }

  return "IN_PROGRESS";
}

function pickHigherPriorityStatus(
  currentStatus: ShipmentTileStatus | null,
  candidateStatus: ShipmentTileStatus,
) {
  if (
    currentStatus === null ||
    statusPriority[candidateStatus] < statusPriority[currentStatus]
  ) {
    return candidateStatus;
  }

  return currentStatus;
}

function getShipmentSceneLevel(
  readyQuantity: number,
  thresholds: ShipmentSceneThresholds,
): ShipmentSceneLevel {
  if (readyQuantity >= thresholds.level7Min) return 7;
  if (readyQuantity >= thresholds.level6Min) return 6;
  if (readyQuantity >= thresholds.level5Min) return 5;
  if (readyQuantity >= thresholds.level4Min) return 4;
  if (readyQuantity >= thresholds.level3Min) return 3;
  if (readyQuantity >= thresholds.level2Min) return 2;

  return 1;
}

function validateSceneThresholds(thresholds: ShipmentSceneThresholds) {
  const minimums = [
    thresholds.level2Min,
    thresholds.level3Min,
    thresholds.level4Min,
    thresholds.level5Min,
    thresholds.level6Min,
    thresholds.level7Min,
  ];
  const hasInvalidMinimum = minimums.some(
    (minimum, index) =>
      !Number.isFinite(minimum) ||
      !Number.isInteger(minimum) ||
      minimum <= 1 ||
      (index > 0 && minimum <= minimums[index - 1]!),
  );

  if (hasInvalidMinimum) {
    throw new RangeError(
      "Shipment scene thresholds must be finite ascending integers greater than 1.",
    );
  }
}

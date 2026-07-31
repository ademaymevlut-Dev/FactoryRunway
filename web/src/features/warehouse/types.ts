import type { CustomerOrderStatus } from "@/generated/prisma/enums";

export type WarehouseTabKey =
  | "fabric_warehouse"
  | "accessory_warehouse"
  | "product_warehouse";

export type WarehouseDepartmentView = {
  key: WarehouseTabKey;
  label: string;
};

export type WarehouseInboundItem = {
  kind: "inbound";
  id: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  productCode: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  quantityLabel: string;
  arrivalLabel: string;
  daysRemaining: number;
  deliveryLabel: string;
  statusLabel: string;
  tone: "info" | "warning";
};

export type WarehouseProductDepotItem = {
  kind: "product";
  id: string;
  orderId: string;
  productionOrderId: string;
  orderNo: string;
  productionNo: string;
  customerName: string;
  productCode: string;
  productName: string;
  productImageUrl: string | null;
  orderedQuantity: number;
  warehouseReadyQuantity: number;
  quantityInDepotLabel: string;
  plannedQuantityLabel: string;
  deliveryLabel: string;
  daysUntilDelivery: number;
  customerOrderStatus: CustomerOrderStatus;
  customerOrderItemId: string;
  finishedLabel: string;
  lastProducedQuantityLabel: string;
  statusLabel: string;
  tone: "success" | "warning" | "danger";
};

export type ShipmentTileStatus =
  | "DELAYED"
  | "COMPLETED"
  | "IN_PROGRESS";

export type ShipmentSceneLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ShipmentSceneThresholds = {
  level2Min: number;
  level3Min: number;
  level4Min: number;
  level5Min: number;
  level6Min: number;
  level7Min: number;
};

export type ShipmentMapView = {
  estimatedPalletCount: number;
  readyProductCount: number;
  readyQuantity: number;
  sceneLevel: ShipmentSceneLevel | null;
  status: ShipmentTileStatus | null;
};

export type WarehouseMaterialTabView = WarehouseDepartmentView & {
  key: "fabric_warehouse" | "accessory_warehouse";
  items: WarehouseInboundItem[];
};

export type WarehouseProductTabView = WarehouseDepartmentView & {
  key: "product_warehouse";
  items: WarehouseProductDepotItem[];
};

export type GameWarehouseView = {
  currentDay: number;
  fabric: WarehouseMaterialTabView;
  accessory: WarehouseMaterialTabView;
  product: WarehouseProductTabView;
  shipmentArea: ShipmentMapView;
  summary: {
    inboundTotal: number;
    productReadyTotal: number;
    productReadyQuantityLabel: string;
    nextInboundLabel: string;
    nextDeliveryLabel: string;
  };
};

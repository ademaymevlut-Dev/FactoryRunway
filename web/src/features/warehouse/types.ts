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
  quantityInDepot: number;
  quantityInDepotLabel: string;
  plannedQuantityLabel: string;
  deliveryLabel: string;
  daysUntilDelivery: number;
  finishedLabel: string;
  lastProducedQuantityLabel: string;
  statusLabel: string;
  tone: "success" | "warning" | "danger";
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
  summary: {
    inboundTotal: number;
    productReadyTotal: number;
    productReadyQuantityLabel: string;
    nextInboundLabel: string;
    nextDeliveryLabel: string;
  };
};

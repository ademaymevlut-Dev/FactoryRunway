import assert from "node:assert/strict";
import test from "node:test";

import { CustomerOrderStatus } from "@/generated/prisma/enums";

import {
  DEFAULT_SHIPMENT_SCENE_THRESHOLDS,
  SHIPMENT_UNITS_PER_PALLET,
} from "../shipment-scene-config";
import type { WarehouseProductDepotItem } from "../types";
import { createShipmentMapView } from "./shipment-area-view";

function createWarehouseItem(
  overrides: Partial<WarehouseProductDepotItem> = {},
): WarehouseProductDepotItem {
  return {
    customerName: "Test Customer",
    customerOrderItemId: "customer-order-item-1",
    customerOrderStatus: CustomerOrderStatus.READY_TO_SHIP,
    daysUntilDelivery: 5,
    deliveryLabel: "5 gün sonra teslim",
    finishedLabel: "bugün tamamlandı",
    id: "product_warehouse:production-order-1",
    kind: "product",
    lastProducedQuantityLabel: "500 adet",
    orderedQuantity: 1_000,
    orderId: "customer-order-1",
    orderNo: "ORD-001",
    plannedQuantityLabel: "1.000 adet",
    productCode: "PRD-001",
    productImageUrl: null,
    productName: "Test Product",
    productionNo: "PRD-ORDER-001",
    productionOrderId: "production-order-1",
    quantityInDepotLabel: "500 adet",
    statusLabel: "Teslime hazır",
    tone: "success",
    warehouseReadyQuantity: 500,
    ...overrides,
  };
}

test("sıfır veya geçersiz stok paneli koruyan boş scene üretir", () => {
  const view = createShipmentMapView([
    createWarehouseItem({ warehouseReadyQuantity: 0 }),
    createWarehouseItem({ warehouseReadyQuantity: -1 }),
    createWarehouseItem({ warehouseReadyQuantity: Number.NaN }),
    createWarehouseItem({
      warehouseReadyQuantity: Number.POSITIVE_INFINITY,
    }),
  ]);

  assert.deepEqual(view, {
    estimatedPalletCount: 0,
    readyProductCount: 0,
    readyQuantity: 0,
    sceneLevel: null,
    status: null,
  });
});

test("bütün pozitif Warehouse satırları altı ürün limiti olmadan aggregate edilir", () => {
  const items = Array.from({ length: 8 }, (_, index) =>
    createWarehouseItem({
      customerOrderItemId: `item-${index}`,
      productionOrderId: `production-${index}`,
      warehouseReadyQuantity: 500,
    }),
  );

  const view = createShipmentMapView(items);

  assert.equal(view.readyProductCount, 8);
  assert.equal(view.readyQuantity, 4_000);
  assert.equal(view.estimatedPalletCount, 6);
  assert.equal(view.sceneLevel, 1);
});

test("scene eşikleri onaylanan 1-7 sınırlarında çalışır", () => {
  assert.deepEqual(DEFAULT_SHIPMENT_SCENE_THRESHOLDS, {
    level2Min: 4_001,
    level3Min: 9_001,
    level4Min: 15_001,
    level5Min: 20_001,
    level6Min: 30_001,
    level7Min: 45_001,
  });

  const cases = [
    [1, 1],
    [4_000, 1],
    [4_001, 2],
    [9_000, 2],
    [9_001, 3],
    [15_000, 3],
    [15_001, 4],
    [20_000, 4],
    [20_001, 5],
    [30_000, 5],
    [30_001, 6],
    [45_000, 6],
    [45_001, 7],
    [90_000, 7],
  ] as const;

  for (const [readyQuantity, expectedLevel] of cases) {
    const view = createShipmentMapView([
      createWarehouseItem({
        orderedQuantity: 100_000,
        warehouseReadyQuantity: readyQuantity,
      }),
    ]);

    assert.equal(
      view.sceneLevel,
      expectedLevel,
      `${readyQuantity} adet level ${expectedLevel} olmalı`,
    );
  }
});

test("sceneLevel asset mevcudiyetinden bağımsız gerçek level 7 değerini korur", () => {
  const view = createShipmentMapView([
    createWarehouseItem({
      orderedQuantity: 60_000,
      warehouseReadyQuantity: 45_001,
    }),
  ]);

  assert.equal(view.sceneLevel, 7);
});

test("MVP palet hesabı 750 adet kapasiteyle yukarı yuvarlanır", () => {
  assert.equal(SHIPMENT_UNITS_PER_PALLET, 750);

  const cases = [
    [1, 1],
    [750, 1],
    [751, 2],
    [1_500, 2],
    [1_501, 3],
  ] as const;

  for (const [readyQuantity, expectedPalletCount] of cases) {
    const view = createShipmentMapView([
      createWarehouseItem({
        orderedQuantity: 10_000,
        warehouseReadyQuantity: readyQuantity,
      }),
    ]);

    assert.equal(view.estimatedPalletCount, expectedPalletCount);
  }
});

test("aggregate statü DELAYED, COMPLETED, IN_PROGRESS önceliğini korur", () => {
  const delayedView = createShipmentMapView([
    createWarehouseItem({
      orderedQuantity: 1_000,
      productionOrderId: "in-progress",
      warehouseReadyQuantity: 500,
    }),
    createWarehouseItem({
      orderedQuantity: 500,
      productionOrderId: "completed",
      warehouseReadyQuantity: 500,
    }),
    createWarehouseItem({
      customerOrderStatus: CustomerOrderStatus.LATE,
      productionOrderId: "delayed",
      warehouseReadyQuantity: 100,
    }),
  ]);
  const completedView = createShipmentMapView([
    createWarehouseItem({
      orderedQuantity: 1_000,
      productionOrderId: "in-progress",
      warehouseReadyQuantity: 500,
    }),
    createWarehouseItem({
      orderedQuantity: 500,
      productionOrderId: "completed",
      warehouseReadyQuantity: 500,
    }),
  ]);

  assert.equal(delayedView.status, "DELAYED");
  assert.equal(completedView.status, "COMPLETED");
});

test("geçmiş teslim günü LATE enumundan bağımsız DELAYED üretir", () => {
  const view = createShipmentMapView([
    createWarehouseItem({
      customerOrderStatus: CustomerOrderStatus.READY_TO_SHIP,
      daysUntilDelivery: -1,
    }),
  ]);

  assert.equal(view.status, "DELAYED");
});

test("custom scene eşikleri projection parametresinden uygulanır", () => {
  const view = createShipmentMapView(
    [
      createWarehouseItem({
        orderedQuantity: 1_000,
        warehouseReadyQuantity: 65,
      }),
    ],
    {
      level2Min: 10,
      level3Min: 20,
      level4Min: 30,
      level5Min: 40,
      level6Min: 50,
      level7Min: 60,
    },
  );

  assert.equal(view.sceneLevel, 7);
});

test("geçersiz scene eşikleri açık hata üretir", () => {
  const item = createWarehouseItem();

  assert.throws(
    () =>
      createShipmentMapView([item], {
        level2Min: 2_001,
        level3Min: 5_001,
        level4Min: 8_001,
        level5Min: 12_001,
        level6Min: 17_001,
        level7Min: 17_001,
      }),
    RangeError,
  );
  assert.throws(
    () =>
      createShipmentMapView([item], {
        level2Min: 1.5,
        level3Min: 5_001,
        level4Min: 8_001,
        level5Min: 12_001,
        level6Min: 17_001,
        level7Min: 23_001,
      }),
    RangeError,
  );
});

test("projection input dizisini ve Warehouse item objelerini mutate etmez", () => {
  const firstItem = Object.freeze(
    createWarehouseItem({
      productionOrderId: "production-a",
      warehouseReadyQuantity: 600,
    }),
  );
  const secondItem = Object.freeze(
    createWarehouseItem({
      productionOrderId: "production-b",
      warehouseReadyQuantity: 800,
    }),
  );
  const warehouseItems = Object.freeze([firstItem, secondItem]);
  const snapshot = structuredClone(warehouseItems);

  const firstProjection = createShipmentMapView(warehouseItems);
  const secondProjection = createShipmentMapView(warehouseItems);

  assert.deepEqual(warehouseItems, snapshot);
  assert.deepEqual(firstProjection, secondProjection);
});

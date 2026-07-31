import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CustomerOrderStatus } from "@/generated/prisma/enums";

import {
  calculateWarehouseReadyQuantity,
  toProductDepotItem,
} from "./warehouse-view";
import { createShipmentMapView } from "./shipment-area-view";

type ProductDepotSource = Parameters<typeof toProductDepotItem>[0];

type ProductDepotFixtureOptions = {
  completedQuantity?: number;
  customerOrderId?: string;
  customerOrderItemId?: string;
  customerOrderStatus?: CustomerOrderStatus;
  itemShippedQuantity?: number;
  orderedQuantity?: number;
  productionOrderId?: string;
  routeCompletedQuantity?: number;
  targetDeliveryDay?: number;
};

function createProductDepotSource(
  options: ProductDepotFixtureOptions = {},
): ProductDepotSource {
  const orderedQuantity = options.orderedQuantity ?? 1_000;
  const routeCompletedQuantity = options.routeCompletedQuantity ?? 0;

  return {
    completedDay: 9,
    completedQuantity: options.completedQuantity ?? 1_000,
    customerOrder: {
      id: options.customerOrderId ?? "customer-order-1",
      orderNo: "ORD-001",
      status:
        options.customerOrderStatus ?? CustomerOrderStatus.READY_TO_SHIP,
      targetDeliveryDay: options.targetDeliveryDay ?? 12,
      virtualCustomer: { name: "Test Customer" },
    },
    customerOrderItem: {
      id: options.customerOrderItemId ?? "customer-order-item-1",
      product: {
        code: "PRD-001",
        images: [],
        name: "Test Product",
      },
      productSnapshot: null,
      quantity: orderedQuantity,
      shippedQuantity: options.itemShippedQuantity ?? 0,
    },
    id: options.productionOrderId ?? "production-order-1",
    plannedQuantity: orderedQuantity,
    productionNo: "PRD-ORDER-001",
    routeProgress:
      routeCompletedQuantity > 0
        ? [{ completedQuantity: routeCompletedQuantity }]
        : [],
    shiftLineResults: [],
    targetDeliveryDay: options.targetDeliveryDay ?? 12,
  };
}

test("warehouse hazır miktarı yalnızca ilgili ürün satırının sevk miktarını düşer", () => {
  assert.equal(
    calculateWarehouseReadyQuantity({
      itemShippedQuantity: 200,
      orderedQuantity: 1_000,
      packedQuantity: 1_000,
    }),
    800,
  );
});

test("warehouse hazır miktarı sıfırın altına düşmez ve sipariş ürün miktarını aşmaz", () => {
  assert.equal(
    calculateWarehouseReadyQuantity({
      itemShippedQuantity: 1_200,
      orderedQuantity: 1_000,
      packedQuantity: 1_000,
    }),
    0,
  );
  assert.equal(
    calculateWarehouseReadyQuantity({
      itemShippedQuantity: 200,
      orderedQuantity: 1_000,
      packedQuantity: 1_500,
    }),
    1_000,
  );
});

test("hazır miktarı sıfır olan ürün elenir, pozitif olan ürün korunur", () => {
  const emptyItem = toProductDepotItem(
    createProductDepotSource({
      completedQuantity: 200,
      itemShippedQuantity: 200,
    }),
    10,
  );
  const readyItem = toProductDepotItem(
    createProductDepotSource({
      completedQuantity: 1_000,
      itemShippedQuantity: 200,
    }),
    10,
  );

  assert.equal(emptyItem, null);
  assert.equal(readyItem?.warehouseReadyQuantity, 800);
  assert.equal(readyItem?.quantityInDepotLabel, "800 adet");
});

test("aynı siparişteki farklı ürün satırları birbirlerinin sevk miktarından etkilenmez", () => {
  const firstItem = toProductDepotItem(
    createProductDepotSource({
      completedQuantity: 1_000,
      customerOrderId: "shared-order",
      customerOrderItemId: "item-a",
      itemShippedQuantity: 200,
      productionOrderId: "production-a",
    }),
    10,
  );
  const secondItem = toProductDepotItem(
    createProductDepotSource({
      completedQuantity: 600,
      customerOrderId: "shared-order",
      customerOrderItemId: "item-b",
      itemShippedQuantity: 0,
      orderedQuantity: 600,
      productionOrderId: "production-b",
    }),
    10,
  );

  assert.equal(firstItem?.warehouseReadyQuantity, 800);
  assert.equal(secondItem?.warehouseReadyQuantity, 600);
  assert.equal(firstItem?.orderId, secondItem?.orderId);
  assert.notEqual(firstItem?.customerOrderItemId, secondItem?.customerOrderItemId);
  assert.notEqual(firstItem?.id, secondItem?.id);
});

test("geciken ve fiziksel stoğu bulunan ürün ham customer order statüsünü korur", () => {
  const item = toProductDepotItem(
    createProductDepotSource({
      completedQuantity: 500,
      customerOrderStatus: CustomerOrderStatus.LATE,
      orderedQuantity: 1_000,
      targetDeliveryDay: 8,
    }),
    10,
  );

  assert.ok(item);
  assert.equal(item.customerOrderStatus, CustomerOrderStatus.LATE);
  assert.equal(item.customerOrderItemId, "customer-order-item-1");
  assert.equal(item.orderedQuantity, 1_000);
  assert.equal(item.warehouseReadyQuantity, 500);
  assert.equal(item.daysUntilDelivery, -2);
});

test("warehouse panelinin kullandığı mevcut görünür satır alanları korunur", () => {
  const item = toProductDepotItem(createProductDepotSource(), 10);

  assert.ok(item);
  assert.equal(item.orderNo, "ORD-001");
  assert.equal(item.customerName, "Test Customer");
  assert.equal(item.productName, "Test Product");
  assert.equal(item.quantityInDepotLabel, "1.000 adet");
  assert.equal(item.plannedQuantityLabel, "1.000 adet");
  assert.equal(item.deliveryLabel, "2 gün sonra teslim");
  assert.equal(item.statusLabel, "Teslime hazır");
  assert.equal(item.tone, "success");
});

test("product warehouse sorgusu LATE statüsünü ve satır kimliklerini seçer", () => {
  const source = readFileSync(new URL("./warehouse-view.ts", import.meta.url), "utf8");

  assert.match(source, /CustomerOrderStatus\.LATE/);
  assert.match(source, /customerOrder:\s*\{[\s\S]*?status: true/);
  assert.match(source, /customerOrderItem:\s*\{[\s\S]*?id: true/);
  assert.match(
    source,
    /itemShippedQuantity: order\.customerOrderItem\.shippedQuantity/,
  );
  assert.doesNotMatch(source, /order\.customerOrder\.shippedQuantity/);
});

test("shipmentArea bütün product satırlarından aggregate edilir ve Warehouse listesi kesilmez", () => {
  const productItems = Array.from({ length: 7 }, (_, index) => {
    const item = toProductDepotItem(
      createProductDepotSource({
        customerOrderItemId: `customer-order-item-${index}`,
        productionOrderId: `production-order-${index}`,
        targetDeliveryDay: 12 + index,
      }),
      10,
    );

    assert.ok(item);
    return item;
  });
  const shipmentArea = createShipmentMapView(productItems);
  const source = readFileSync(
    new URL("./warehouse-view.ts", import.meta.url),
    "utf8",
  );

  assert.equal(productItems.length, 7);
  assert.equal(shipmentArea.readyProductCount, 7);
  assert.equal(shipmentArea.readyQuantity, 7_000);
  assert.equal(shipmentArea.estimatedPalletCount, 10);
  assert.equal(shipmentArea.sceneLevel, 1);
  assert.match(source, /shipmentArea:\s*createShipmentMapView\(productItems\)/);
  assert.equal(source.match(/prisma\.\w+\.findMany/g)?.length, 3);
});

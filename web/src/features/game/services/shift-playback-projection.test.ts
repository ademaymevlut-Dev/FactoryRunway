import assert from "node:assert/strict";
import test from "node:test";

import {
  FinanceCategory,
  FinanceDirection,
  ProductImageVariant,
  ProductImageView,
} from "@/generated/prisma/client";

import {
  getShiftDepartmentPerformance,
  getShiftProductResults,
  getShiftTimelineEvents,
} from "./shift-playback-projection";

test("ürün sonuçları product + order bazında aggregate edilir", async () => {
  const prisma = {
    shiftLineResult: {
      findMany: async () => [
        buildLineResult({ departmentId: "cutting", departmentName: "Kesim", quantity: 600 }),
        buildLineResult({ departmentId: "sewing", departmentName: "Dikim", quantity: 520 }),
        buildLineResult({ departmentId: "sewing", departmentName: "Dikim", quantity: 80 }),
      ],
    },
  } as never;

  const products = await getShiftProductResults({
    prisma,
    shiftId: "shift-1",
  });

  assert.equal(products.length, 1);
  assert.equal(products[0]?.productName, "Manama T-Shirt");
  assert.equal(products[0]?.productImageUrl, "https://example.com/front-thumb.webp");
  assert.equal(products[0]?.orderCode, "ORD-1042");
  assert.equal(products[0]?.totalProcessedQuantity, 1200);
  assert.deepEqual(products[0]?.departments, [
    { departmentId: "cutting", departmentName: "Kesim", processedQuantity: 600 },
    { departmentId: "sewing", departmentName: "Dikim", processedQuantity: 600 },
  ]);
});

test("departman performansı kapasite, kuyruk yükü ve efficiency değerlerini hesaplar", async () => {
  const prisma = {
    shiftLineResult: {
      findMany: async () => [
        buildPerformanceLineResult({
          departmentId: "cutting",
          effectivePointCapacity: 25_400,
          inputReadyQuantity: 1_650,
          plannedPointCapacity: 30_000,
          unusedPoints: 10_400,
          usedPoints: 15_000,
          workloadPointsPerUnit: 10,
        }),
        buildPerformanceLineResult({
          departmentId: "sewing",
          effectivePointCapacity: 12_000,
          inputReadyQuantity: 1_000,
          plannedPointCapacity: 12_000,
          unusedPoints: 0,
          usedPoints: 12_000,
          workloadPointsPerUnit: 12,
        }),
      ],
    },
  } as never;

  const performance = await getShiftDepartmentPerformance({
    prisma,
    shiftId: "shift-1",
  });

  assert.deepEqual(performance.get("cutting"), {
    capacityLossBps: 1533,
    effectiveCapacityPoints: 25_400,
    efficiencyBps: 5906,
    nominalCapacityPoints: 30_000,
    queueLoadPoints: 16_500,
    unusedPoints: 10_400,
    usedPoints: 15_000,
  });
  assert.deepEqual(performance.get("sewing"), {
    capacityLossBps: 0,
    effectiveCapacityPoints: 12_000,
    efficiencyBps: 10_000,
    nominalCapacityPoints: 12_000,
    queueLoadPoints: 12_000,
    unusedPoints: 0,
    usedPoints: 12_000,
  });
});

test("departman performansı aynı departmandaki çoklu hatları aggregate eder", async () => {
  const prisma = {
    shiftLineResult: {
      findMany: async () => [
        buildPerformanceLineResult({
          departmentId: "cutting",
          effectivePointCapacity: 10_000,
          inputReadyQuantity: 400,
          plannedPointCapacity: 10_000,
          unusedPoints: 2_000,
          usedPoints: 8_000,
          workloadPointsPerUnit: 20,
        }),
        buildPerformanceLineResult({
          departmentId: "cutting",
          effectivePointCapacity: 5_000,
          inputReadyQuantity: 100,
          plannedPointCapacity: 5_000,
          unusedPoints: 1_000,
          usedPoints: 4_000,
          workloadPointsPerUnit: 10,
        }),
      ],
    },
  } as never;

  const performance = await getShiftDepartmentPerformance({
    prisma,
    shiftId: "shift-1",
  });

  assert.deepEqual(performance.get("cutting"), {
    capacityLossBps: 0,
    effectiveCapacityPoints: 15_000,
    efficiencyBps: 8000,
    nominalCapacityPoints: 15_000,
    queueLoadPoints: 9_000,
    unusedPoints: 3_000,
    usedPoints: 12_000,
  });
});

test("günlük event projection kronolojik dakika ve sequence sırasını korur", async () => {
  const prisma = {
    customerOrder: {
      findMany: async () => [
        {
          id: "order-1",
          metadata: {
            customerRelationshipImpact: {
              label: "gained",
              lateDays: 0,
              trustChangeBps: 700,
            },
          },
          orderNo: "ORD-1042",
          shippedQuantity: 500,
          items: [
            {
              quantity: 500,
              product: { name: "Manama T-Shirt" },
            },
          ],
        },
      ],
    },
    factoryFinanceDue: { findMany: async () => [] },
    factoryFinanceTransaction: {
      findMany: async () => [
        {
          amountCents: BigInt(120000),
          category: FinanceCategory.ORDER_REVENUE,
          direction: FinanceDirection.INCOME,
          id: "finance-1",
          metadata: {},
          referenceKey: "ORDER_REVENUE:1",
          sourceId: "order-1",
          sourceType: "CUSTOMER_ORDER",
        },
        {
          amountCents: BigInt(24000),
          category: FinanceCategory.PENALTY,
          direction: FinanceDirection.EXPENSE,
          id: "finance-2",
          metadata: { orderNo: "ORD-1042" },
          referenceKey: "LATE_DELIVERY_PENALTY:order-1",
          sourceId: "order-1",
          sourceType: "CUSTOMER_ORDER",
        },
      ],
    },
    factoryLeasingContract: { findMany: async () => [] },
    factoryXpTransaction: {
      findMany: async () => [
        {
          amountXp: 120,
          balanceAfterXp: 1_240,
          id: "xp-1",
          sourceId: "shift-1",
          sourceType: "shift",
        },
      ],
    },
    productionOutsourceJob: { findMany: async () => [] },
  } as never;

  const events = await getShiftTimelineEvents({
    factoryId: "factory-1",
    gameDay: 12,
    prisma,
    shift: {
      departmentResults: [
        {
          activeLineCount: 1,
          departmentCode: "sewing",
          departmentId: "department-1",
          departmentName: "Dikim",
          endingQueueQuantity: 0,
          performance: {
            capacityLossBps: 0,
            effectiveCapacityPoints: 0,
            efficiencyBps: 0,
            nominalCapacityPoints: 0,
            queueLoadPoints: 0,
            unusedPoints: 0,
            usedPoints: 0,
          },
          producedQuantity: 500,
          producedTimeline: [],
          productionEndMinute: 300,
          productionStartMinute: 0,
          queueEnteredQuantity: 0,
          queueEnteredTimeline: [],
          startingQueueQuantity: 500,
        },
      ],
      shiftId: "shift-1",
      simulatedGameDay: 12,
      summary: {
        activeLineCount: 1,
        averageUtilizationBps: 9000,
        blockedLineCount: 0,
        totalProducedQuantity: 500,
      },
    },
  });

  assert.deepEqual(
    events.map((event) => event.minute),
    [...events.map((event) => event.minute)].sort((a, b) => a - b),
  );
  assert.equal(events[0]?.eventKey, "shift.started");
  assert.equal(events.at(-1)?.eventKey, "shift.completed");
  assert.ok(events.some((event) => event.eventKey === "shipping.order_shipped"));
  assert.deepEqual(
    events.find((event) => event.eventKey === "customer.relationship_gained")
      ?.payload,
    {
      orderCode: "ORD-1042",
      trustChangeBps: 700,
    },
  );
  assert.ok(events.some((event) => event.eventKey === "payment.customer_received"));
  assert.deepEqual(
    events.find((event) => event.eventKey === "penalty.order_late_paid")
      ?.payload,
    {
      amountCents: "24000",
      orderNo: "ORD-1042",
      referenceKey: "LATE_DELIVERY_PENALTY:order-1",
    },
  );
  assert.ok(events.some((event) => event.eventKey === "xp.shift_completed"));
  assert.deepEqual(
    events.find((event) => event.eventKey === "xp.shift_completed")?.payload,
    {
      amountXp: 120,
      balanceAfterXp: 1_240,
    },
  );
  assert.deepEqual(
    events.find((event) => event.eventKey === "shift.completed")?.payload,
    {
      nextGameDay: 13,
      shiftId: "shift-1",
      simulatedGameDay: 12,
    },
  );
});

function buildLineResult(input: {
  departmentId: string;
  departmentName: string;
  quantity: number;
}) {
  return {
    departmentId: input.departmentId,
    producedQuantity: input.quantity,
    department: {
      key: input.departmentId,
      translations: [{ name: input.departmentName }],
    },
    product: {
      id: "product-1",
      key: "manama_tshirt",
      name: "Manama T-Shirt",
      images: [
        {
          url: "https://example.com/back-card.webp",
          variant: ProductImageVariant.CARD,
          view: ProductImageView.BACK,
        },
        {
          url: "https://example.com/front-card.webp",
          variant: ProductImageVariant.CARD,
          view: ProductImageView.FRONT,
        },
        {
          url: "https://example.com/front-thumb.webp",
          variant: ProductImageVariant.THUMBNAIL,
          view: ProductImageView.FRONT,
        },
      ],
    },
    productionOrder: {
      id: "production-order-1",
      productionNo: "PROD-1042",
      customerOrder: { orderNo: "ORD-1042" },
    },
  };
}

function buildPerformanceLineResult(input: {
  departmentId: string;
  effectivePointCapacity: number;
  inputReadyQuantity: number;
  plannedPointCapacity: number;
  unusedPoints: number;
  usedPoints: number;
  workloadPointsPerUnit: number;
}) {
  return input;
}

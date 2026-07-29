import assert from "node:assert/strict";
import test from "node:test";

import {
  ChaosEventType,
  ChaosScope,
  ChaosSeverity,
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  ProductImageVariant,
  ProductImageView,
  XpReason,
} from "@/generated/prisma/client";

import { shiftPlaybackCopy } from "../shift-playback-copy";
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

test("departman kapasite kaybı nominal hat kapasitesine göre hesaplanır", async () => {
  const prisma = {
    shiftLineResult: {
      findMany: async () => [
        buildPerformanceLineResult({
          departmentId: "cutting",
          effectivePointCapacity: 5_000,
          factoryProductionLineId: "cutting-line-1",
          inputReadyQuantity: 500,
          plannedPointCapacity: 5_000,
          templateDailyPointCapacity: 10_000,
          unusedPoints: 0,
          usedPoints: 5_000,
          workloadPointsPerUnit: 10,
        }),
        buildPerformanceLineResult({
          departmentId: "cutting",
          effectivePointCapacity: 4_240,
          factoryProductionLineId: "cutting-line-1",
          inputReadyQuantity: 424,
          plannedPointCapacity: 4_240,
          templateDailyPointCapacity: 10_000,
          unusedPoints: 0,
          usedPoints: 4_240,
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
    capacityLossBps: 760,
    effectiveCapacityPoints: 9_240,
    efficiencyBps: 10_000,
    nominalCapacityPoints: 10_000,
    queueLoadPoints: 9_240,
    unusedPoints: 0,
    usedPoints: 9_240,
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
    factoryFinanceDue: {
      findMany: async () => [
        {
          amountCents: BigInt(50_000),
          category: FinanceCategory.RENT,
          dueDay: 10,
          id: "rent-due",
          metadata: {},
          referenceKey: "OPERATING_EXPENSE:RENT:factory-1:10",
          settledAmountCents: BigInt(0),
          sourceId: "factory-1",
          sourceType: "MONTHLY_CLOSING",
          status: FinanceDueStatus.OVERDUE,
        },
        {
          amountCents: BigInt(30_000),
          category: FinanceCategory.ELECTRICITY,
          dueDay: 10,
          id: "electricity-due",
          metadata: {},
          referenceKey:
            "OPERATING_EXPENSE:ELECTRICITY:factory-1:10",
          settledAmountCents: BigInt(10_000),
          sourceId: "factory-1",
          sourceType: "MONTHLY_CLOSING",
          status: FinanceDueStatus.PARTIAL,
        },
        {
          amountCents: BigInt(100_000),
          category: FinanceCategory.PAYROLL,
          dueDay: 10,
          id: "payroll-due",
          metadata: {},
          referenceKey: "PAYROLL:factory-1:10",
          settledAmountCents: BigInt(0),
          sourceId: "factory-1",
          sourceType: "MONTHLY_CLOSING",
          status: FinanceDueStatus.OVERDUE,
        },
        {
          amountCents: BigInt(40_000),
          category: FinanceCategory.OUTSOURCE_COST,
          dueDay: 12,
          id: "outsource-due",
          metadata: {},
          referenceKey: "OUTSOURCE_COMPLETION_PAYMENT:outsource-job-1",
          settledAmountCents: BigInt(15_000),
          sourceId: "outsource-job-1",
          sourceType: "OUTSOURCE_JOB",
          status: FinanceDueStatus.PARTIAL,
        },
      ],
    },
    factoryFinanceTransaction: {
      findMany: async () => [
        {
          amountCents: BigInt(120000),
          category: FinanceCategory.ORDER_REVENUE,
          direction: FinanceDirection.INCOME,
          financeDueId: null,
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
          financeDueId: null,
          id: "finance-2",
          metadata: { orderNo: "ORD-1042" },
          referenceKey: "LATE_DELIVERY_PENALTY:order-1",
          sourceId: "order-1",
          sourceType: "CUSTOMER_ORDER",
        },
        {
          amountCents: BigInt(10_000),
          category: FinanceCategory.ELECTRICITY,
          direction: FinanceDirection.EXPENSE,
          financeDueId: null,
          id: "finance-3",
          metadata: {},
          referenceKey:
            "OPERATING_EXPENSE:ELECTRICITY:factory-1:10",
          sourceId: "factory-1",
          sourceType: "MONTHLY_CLOSING",
        },
        {
          amountCents: BigInt(20_000),
          category: FinanceCategory.OVERHEAD,
          direction: FinanceDirection.EXPENSE,
          financeDueId: null,
          id: "finance-4",
          metadata: {},
          referenceKey:
            "OPERATING_EXPENSE:OVERHEAD:factory-1:10",
          sourceId: "factory-1",
          sourceType: "MONTHLY_CLOSING",
        },
        {
          amountCents: BigInt(15_000),
          category: FinanceCategory.OUTSOURCE_COST,
          direction: FinanceDirection.EXPENSE,
          financeDueId: null,
          id: "finance-5",
          metadata: {},
          referenceKey: "OUTSOURCE_COMPLETION_PAYMENT:outsource-job-1",
          sourceId: "outsource-job-1",
          sourceType: "OUTSOURCE_JOB",
        },
      ],
    },
    factoryChaosEvent: {
      findMany: async () => [
        {
          affectedStaffCount: 1,
          department: {
            key: "sewing",
            translations: [{ name: "Dikim" }],
          },
          eventType: ChaosEventType.STAFF_ABSENCE,
          factoryProductionLine: {
            lineNumber: 2,
            department: {
              key: "sewing",
              translations: [{ name: "Dikim" }],
            },
          },
          id: "chaos-1",
          messageKey: "chaos.staff_absence.minor",
          metadata: { targetMinute: 72 },
          penaltyBps: 9500,
          scope: ChaosScope.PRODUCTION_LINE,
          severity: ChaosSeverity.MINOR,
        },
      ],
    },
    factoryLeasingContract: { findMany: async () => [] },
    factoryProductionLineInstallation: { findMany: async () => [] },
    factoryXpTransaction: {
      findMany: async () => [
        {
          amountXp: 120,
          balanceAfterXp: 1_240,
          id: "xp-1",
          metadata: {
            payrollProductionImpact: {
              capacityMultiplierBps: 9_000,
              oldestDueDay: 10,
              outstandingCents: "100000",
              overdueDays: 2,
              productionPenaltyBps: 1_000,
            },
          },
          reason: XpReason.SHIFT_COMPLETED,
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
  assert.deepEqual(
    events.find((event) => event.eventKey === "chaos.staff_absence.minor"),
    {
      category: "STAFF",
      eventKey: "chaos.staff_absence.minor",
      gameDay: 12,
      id: "chaos:chaos-1",
      minute: 72,
      payload: {
        affectedStaffCount: 1,
        capacityLossBps: 500,
        departmentName: "Dikim",
        eventType: "STAFF_ABSENCE",
        lineLabel: "Hat 2",
        penaltyBps: 9500,
        scope: "PRODUCTION_LINE",
      },
      sequence: 2,
      severity: "WARNING",
      sourceId: "chaos-1",
      sourceType: "FACTORY_CHAOS_EVENT",
    },
  );
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
    events.find(
      (event) => event.eventKey === "payroll.production_reduced",
    )?.payload,
    {
      capacityMultiplierBps: 9_000,
      outstandingCents: "100000",
      overdueDays: 2,
      productionPenaltyBps: 1_000,
    },
  );
  assert.deepEqual(
    events.find(
      (event) => event.eventKey === "operating_expense.overdue",
    )?.payload,
    {
      amountCents: "50000",
      category: FinanceCategory.RENT,
      dueDay: 10,
      overdueDays: 2,
      paidCents: "0",
      remainingCents: "50000",
    },
  );
  assert.deepEqual(
    events.find(
      (event) => event.eventKey === "operating_expense.partial",
    )?.payload,
    {
      amountCents: "30000",
      category: FinanceCategory.ELECTRICITY,
      dueDay: 10,
      overdueDays: 2,
      paidCents: "10000",
      remainingCents: "20000",
    },
  );
  assert.equal(
    events.some(
      (event) =>
        event.eventKey === "operating_expense.paid" &&
        event.payload.category === FinanceCategory.ELECTRICITY,
    ),
    false,
  );
  assert.ok(
    events.some(
      (event) =>
        event.eventKey === "operating_expense.paid" &&
        event.payload.category === FinanceCategory.OVERHEAD,
    ),
  );
  assert.deepEqual(
    events.find(
      (event) => event.eventKey === "outsource.payment_partial",
    )?.payload,
    {
      amountCents: "40000",
      dueDay: 12,
      overdueDays: 0,
      paidCents: "15000",
      remainingCents: "25000",
    },
  );
  assert.equal(
    events.some((event) => event.eventKey === "outsource.payment_paid"),
    false,
  );
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

test("gider borcu Daily Event metinleri ödenemeyen ve kısmi durumu ayırır", () => {
  const tr = shiftPlaybackCopy.tr.dailyEvents;
  const en = shiftPlaybackCopy.en.dailyEvents;

  assert.equal(
    tr.titles.financeExpenseOverdue(tr.financeCategories.RENT),
    "Kira ödenemedi",
  );
  assert.equal(
    tr.titles.financeExpensePartial(tr.financeCategories.ELECTRICITY),
    "Elektrik ödemesi eksik kaldı",
  );
  assert.match(
    tr.descriptions.financeExpenseOverdue(
      tr.financeCategories.RENT,
      "₺500",
      "3",
    ),
    /3 gündür gecikiyor/,
  );
  assert.match(
    en.descriptions.financeExpensePartialToday(
      en.financeCategories.OVERHEAD,
      "€100",
      "€250",
    ),
    /recorded as debt/,
  );
});

test("maaş gecikmesi Daily Event metni gün ve üretim etkisini gösterir", () => {
  const tr = shiftPlaybackCopy.tr.dailyEvents;
  const en = shiftPlaybackCopy.en.dailyEvents;

  assert.equal(
    tr.titles.payrollProductionReduced(3),
    "Maaş ödemesi 3 gün gecikti",
  );
  assert.match(
    tr.descriptions.payrollProductionReduced("₺1.000", "%15"),
    /Üretim kapasitesi %15 düşürüldü/,
  );
  assert.equal(
    en.titles.payrollProductionReduced(1),
    "Payroll is 1 day overdue",
  );
  assert.match(
    en.descriptions.payrollOverdue("€1,000"),
    /production impact starts next shift/,
  );
});

test("fason ödeme kilidi Daily Event metni ürünün beklediğini açıklar", () => {
  const tr = shiftPlaybackCopy.tr.dailyEvents;
  const en = shiftPlaybackCopy.en.dailyEvents;

  assert.equal(
    tr.titles.outsourcePaymentPending,
    "Fason ödeme bekliyor",
  );
  assert.match(
    tr.descriptions.outsourcePaymentPartial("₺150", "₺250"),
    /sonraki kuyruğa geçmeyecek/,
  );
  assert.match(
    en.descriptions.outsourcePaymentPending("€400"),
    /remain in the outsource queue/,
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
  factoryProductionLineId?: string;
  inputReadyQuantity: number;
  plannedPointCapacity: number;
  templateDailyPointCapacity?: number;
  unusedPoints: number;
  usedPoints: number;
  workloadPointsPerUnit: number;
}) {
  return {
    ...input,
    factoryProductionLineId:
      input.factoryProductionLineId ??
      `${input.departmentId}-${input.plannedPointCapacity}`,
    templateDailyPointCapacity:
      input.templateDailyPointCapacity ?? input.plannedPointCapacity,
  };
}

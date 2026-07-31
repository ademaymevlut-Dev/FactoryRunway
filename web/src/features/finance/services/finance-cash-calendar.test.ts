import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
} from "@/generated/prisma/client";

import {
  buildFinanceCashCalendar,
  buildPeriodicExpenseForecastSources,
  calculateProjectedOrderPaymentDay,
  getFinanceCashCalendar,
  type FinanceCashCalendarSource,
} from "./finance-cash-calendar";

test("planlanan sipariş tahsilatı hedef teslim ve ödeme vadesini kullanır", () => {
  assert.equal(
    calculateProjectedOrderPaymentDay({
      currentDay: 10,
      paymentTermDays: 7,
      targetDeliveryDay: 24,
    }),
    31,
  );
  assert.equal(
    calculateProjectedOrderPaymentDay({
      currentDay: 30,
      paymentTermDays: 7,
      targetDeliveryDay: 24,
    }),
    37,
  );
});

test("maaş ve işletme gideri mevcut kadro ile hatlardan projekte edilir", () => {
  const forecasts = buildPeriodicExpenseForecastSources({
    costConfig: {
      dailyMealPerDirectStaffCents: 10,
      directStaffOverheadPerStaffCents: 5,
      rentPerM2Cents: 2,
    },
    currentDay: 8,
    productionLines: [
      {
        areaM2: 100,
        monthlyElectricityBaseCents: 500,
      },
    ],
    staffAssignments: [
      {
        factoryProductionLineId: "line-1",
        monthlySalaryCents: 100,
        quantity: 2,
      },
      {
        factoryProductionLineId: null,
        monthlySalaryCents: 50,
        quantity: 1,
      },
    ],
  });
  const byCategory = new Map(
    forecasts.map((forecast) => [forecast.category, forecast]),
  );

  assert.equal(byCategory.get(FinanceCategory.PAYROLL)?.amountCents, BigInt(250));
  assert.equal(byCategory.get(FinanceCategory.PAYROLL)?.day, 22);
  assert.equal(
    byCategory.get(FinanceCategory.ELECTRICITY)?.amountCents,
    BigInt(500),
  );
  assert.equal(byCategory.get(FinanceCategory.RENT)?.amountCents, BigInt(200));
  assert.equal(byCategory.get(FinanceCategory.MEAL)?.amountCents, BigInt(660));
  assert.equal(
    byCategory.get(FinanceCategory.OVERHEAD)?.amountCents,
    BigInt(220),
  );
  assert.equal(byCategory.get(FinanceCategory.RENT)?.day, 10);
});

test("nakit takvimi gecikmiş borcu bugüne taşır ve kasa açığını gösterir", () => {
  const calendar = buildFinanceCashCalendar({
    cashBalanceCents: BigInt(1_000),
    currentDay: 10,
    sources: [
      source({
        amountCents: BigInt(3_000),
        day: 8,
        direction: FinanceDirection.EXPENSE,
        id: "rent-due",
      }),
    ],
  });

  assert.equal(calendar.days[0]?.day, 10);
  assert.equal(calendar.days[0]?.expenseCents, "3000");
  assert.equal(calendar.days[0]?.projectedBalanceCents, "-2000");
  assert.equal(calendar.estimatedEndBalanceCents, "-2000");
  assert.equal(calendar.lowestProjectedBalanceCents, "-2000");
  assert.equal(calendar.risk, "SHORTFALL");
  assert.equal(calendar.shortfallDay, 10);
  assert.equal(calendar.upcomingEntries[0]?.timing, "OVERDUE");
});

test("ilk planlanan müşteri ödemesi yedi günlük ufkun dışında da gösterilir", () => {
  const calendar = buildFinanceCashCalendar({
    cashBalanceCents: BigInt(0),
    currentDay: 1,
    sources: [
      source({
        amountCents: BigInt(50_000),
        certainty: "PROJECTED",
        day: 28,
        direction: FinanceDirection.INCOME,
        id: "order-forecast",
      }),
    ],
  });

  assert.deepEqual(calendar.firstIncome, {
    amountCents: "50000",
    certainty: "PROJECTED",
    day: 28,
  });
  assert.equal(calendar.incomingCents, "0");
  assert.equal(calendar.estimatedEndBalanceCents, "0");
  assert.equal(calendar.upcomingEntries[0]?.day, 28);
});

test("yedi günlük giriş, çıkış ve gün sonu bakiyesi birlikte projekte edilir", () => {
  const calendar = buildFinanceCashCalendar({
    cashBalanceCents: BigInt(5_000),
    currentDay: 10,
    sources: [
      source({
        amountCents: BigInt(4_000),
        day: 10,
        direction: FinanceDirection.EXPENSE,
        id: "payroll",
      }),
      source({
        amountCents: BigInt(3_000),
        certainty: "PROJECTED",
        day: 12,
        direction: FinanceDirection.EXPENSE,
        id: "outsource",
      }),
      source({
        amountCents: BigInt(10_000),
        day: 14,
        direction: FinanceDirection.INCOME,
        id: "receivable",
      }),
    ],
  });

  assert.equal(calendar.incomingCents, "10000");
  assert.equal(calendar.outgoingCents, "7000");
  assert.equal(calendar.netCents, "3000");
  assert.equal(calendar.estimatedEndBalanceCents, "8000");
  assert.equal(calendar.lowestProjectedBalanceCents, "-2000");
  assert.equal(calendar.risk, "SHORTFALL");
  assert.equal(calendar.shortfallDay, 12);
  assert.deepEqual(calendar.firstIncome, {
    amountCents: "10000",
    certainty: "CONFIRMED",
    day: 14,
  });
  assert.equal(
    calendar.days.find((day) => day.day === 14)?.projectedBalanceCents,
    "8000",
  );
});

test("kesinleşmiş fason borcu planlanan fason çıkışıyla iki kez sayılmaz", async () => {
  const prisma = {
    customerOrder: {
      findMany: async () => [
        {
          id: "order-1",
          orderNo: "ORD-1",
          paymentTermDays: 7,
          targetDeliveryDay: 20,
          totalRevenueCents: BigInt(20_000),
        },
      ],
    },
    factoryFinanceDue: {
      findMany: async () => [
        {
          amountCents: BigInt(8_000),
          category: FinanceCategory.OUTSOURCE_COST,
          description: "finance.outsourceCompletionPayment",
          direction: FinanceDirection.EXPENSE,
          dueDay: 10,
          id: "outsource-due",
          settledAmountCents: BigInt(3_000),
          sourceId: "outsource-1",
          status: FinanceDueStatus.PARTIAL,
        },
      ],
    },
    factory: {
      findUniqueOrThrow: async () => ({
        productionLines: [],
        sector: { operatingCostConfig: null },
        staffAssignments: [],
      }),
    },
    productionOutsourceJob: {
      findMany: async () => [
        {
          id: "outsource-1",
          productionOrder: { productionNo: "PROD-1" },
          readyDay: 10,
          totalCostCents: BigInt(8_000),
        },
        {
          id: "outsource-2",
          productionOrder: { productionNo: "PROD-2" },
          readyDay: 13,
          totalCostCents: BigInt(4_000),
        },
      ],
    },
  } as never;

  const calendar = await getFinanceCashCalendar({
    cashBalanceCents: BigInt(6_000),
    currentDay: 10,
    factoryId: "factory-1",
    prisma,
  });

  assert.equal(
    calendar.upcomingEntries.filter(
      (entry) => entry.id === "outsource-forecast:outsource-1",
    ).length,
    0,
  );
  assert.ok(
    calendar.upcomingEntries.some(
      (entry) => entry.id === "due:outsource-due",
    ),
  );
  assert.ok(
    calendar.upcomingEntries.some(
      (entry) => entry.id === "outsource-forecast:outsource-2",
    ),
  );
  assert.deepEqual(calendar.firstIncome, {
    amountCents: "20000",
    certainty: "PROJECTED",
    day: 27,
  });
});

test("nakit takvimi UI sözleşmesi kompakt tipografi ve locale copy kullanır", () => {
  const source = readFileSync(
    new URL("../components/finance-cash-calendar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /financeCopy/);
  assert.match(source, /locale: SupportedLocale/);
  assert.match(source, /copy\.calendar\.title/);
  assert.match(source, /copy\.calendar\.firstIncome/);
  assert.match(source, /copy\.calendar\.confirmedShort/);
  assert.doesNotMatch(source, /Nakit takvimi/);
  assert.match(source, /p-2\.5/);
  assert.match(source, /text-\[9px\]/);
  assert.doesNotMatch(source, /text-(?:2xl|3xl|4xl)/);
  assert.doesNotMatch(source, /\bp-(?:6|8|10|12)\b/);
});

test("finans paneli seçilen locale'i tüm rapor sekmelerine taşır", () => {
  const panel = readFileSync(
    new URL("../components/finance-panel.tsx", import.meta.url),
    "utf8",
  );
  const action = readFileSync(
    new URL("../actions/get-finance-report-action.ts", import.meta.url),
    "utf8",
  );

  assert.match(panel, /locale: SupportedLocale/);
  assert.match(panel, /const copy = financeCopy\[locale\]/);
  assert.match(panel, /copy\.tabs\[tab\.value\]/);
  assert.match(panel, /locale,/);
  assert.match(action, /locale: normalizeLocale\(input\.locale\)/);
  assert.doesNotMatch(panel, /Finans Kontrol|Fabrika performansı|Nakit takvimi/);
});

function source(
  input: Partial<FinanceCashCalendarSource> &
    Pick<
      FinanceCashCalendarSource,
      "amountCents" | "day" | "direction" | "id"
    >,
): FinanceCashCalendarSource {
  return {
    category:
      input.direction === FinanceDirection.INCOME
        ? FinanceCategory.ORDER_REVENUE
        : FinanceCategory.RENT,
    certainty: "CONFIRMED",
    description: input.id,
    label: input.id,
    ...input,
  };
}

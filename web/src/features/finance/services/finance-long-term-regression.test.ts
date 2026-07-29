import assert from "node:assert/strict";
import test from "node:test";

import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  FinanceSourceType,
  type Prisma,
} from "@/generated/prisma/client";
import {
  buildOutsourcePaymentReferenceKey,
  processPeriodicFinancialTriggers,
  resolveOutsourcePaymentState,
  settleFactoryExpense,
} from "@/features/game/services/financial-triggers";
import { getFactoryPayrollProductionImpact } from "@/features/game/services/payroll-production-impact";

import {
  buildFinanceCashCalendar,
  type FinanceCashCalendarSource,
} from "./finance-cash-calendar";
import {
  createFinanceDue,
  getFactoryAvailableBalance,
  processDuePayments,
  settleFinanceDue,
} from "./finance-ledger";

const FACTORY_ID = "factory-long-term";
const LAST_SIMULATION_DAY = 97;
const RECEIPT_CENTS = BigInt(1_100);
const RECEIPT_DAYS = [29, 51, 73, 95] as const;
const OUTSOURCE_DAYS = [22, 44, 66, 88] as const;
const OPEN_DUE_STATUSES = new Set<FinanceDueStatus>([
  FinanceDueStatus.PENDING,
  FinanceDueStatus.PARTIAL,
  FinanceDueStatus.OVERDUE,
]);

test("97 günlük nakit akışı dört finans döneminde kararlı kalır", async (t) => {
  const scenario = await runLongTermScenario();

  await t.test("kasa negatife düşmez, borç kullanılabilir bakiyede görünür", () => {
    assert.ok(
      [...scenario.snapshots.values()].every(
        (snapshot) => snapshot.cashBalanceCents >= BigInt(0),
      ),
    );
    assert.equal(
      scenario.snapshots.get(22)?.availableBalanceCents,
      BigInt(-782),
    );
    assert.equal(
      scenario.snapshots.get(22)?.openDebtCents,
      BigInt(782),
    );
    assert.equal(
      scenario.snapshots.get(95)?.cashBalanceCents,
      BigInt(372),
    );
    assert.equal(
      scenario.snapshots.get(95)?.openDebtCents,
      BigInt(0),
    );
  });

  await t.test("22 günlük tetikler tekrar çalışsa da finans kaydı çoğalmaz", () => {
    const dueReferenceKeys = scenario.harness.state.dues.map(
      (due) => due.referenceKey,
    );
    const transactionReferenceKeys =
      scenario.harness.state.transactions.map(
        (transaction) => transaction.referenceKey,
      );

    assert.equal(
      new Set(dueReferenceKeys).size,
      dueReferenceKeys.length,
    );
    assert.equal(
      new Set(transactionReferenceKeys).size,
      transactionReferenceKeys.length,
    );

    const obligationReferenceKeys = new Set(
      [...dueReferenceKeys, ...transactionReferenceKeys].filter(
        (referenceKey) =>
          referenceKey.startsWith("PAYROLL:") ||
          referenceKey.startsWith("OPERATING_EXPENSE:") ||
          referenceKey.startsWith("OUTSOURCE_COMPLETION_PAYMENT:"),
      ),
    );

    assert.equal(
      countByPrefix(obligationReferenceKeys, "PAYROLL:"),
      4,
    );
    assert.equal(
      countByPrefix(obligationReferenceKeys, "OPERATING_EXPENSE:"),
      16,
    );
    assert.equal(
      countByPrefix(
        obligationReferenceKeys,
        "OUTSOURCE_COMPLETION_PAYMENT:",
      ),
      4,
    );
  });

  await t.test("tahsilat eski borçları kapatır ve aynı gün maaşı fasonun önüne alır", () => {
    assert.deepEqual(
      settlementCategoriesForDay(scenario.harness, 29),
      [
        FinanceCategory.MEAL,
        FinanceCategory.OVERHEAD,
        FinanceCategory.PAYROLL,
        FinanceCategory.OUTSOURCE_COST,
      ],
    );

    for (const receiptDay of RECEIPT_DAYS) {
      assert.equal(
        scenario.snapshots.get(receiptDay)?.openDebtCents,
        BigInt(0),
      );
    }
  });

  await t.test("maaş gecikmesi yüzde 30'a çıkar ve tahsilat günü sıfırlanır", () => {
    for (const receiptDay of RECEIPT_DAYS) {
      assert.equal(
        scenario.snapshots.get(receiptDay - 6)
          ?.productionPenaltyBps,
        500,
      );
      assert.equal(
        scenario.snapshots.get(receiptDay - 1)
          ?.productionPenaltyBps,
        3_000,
      );
      assert.equal(
        scenario.snapshots.get(receiptDay)?.productionPenaltyBps,
        0,
      );
      assert.equal(
        scenario.snapshots.get(receiptDay)?.capacityMultiplierBps,
        10_000,
      );
    }
  });

  await t.test("fason işi ödeme gününe kadar kilitli kalır", () => {
    OUTSOURCE_DAYS.forEach((readyDay, index) => {
      const jobId = `outsource-${index + 1}`;
      const receiptDay = RECEIPT_DAYS[index];

      assert.equal(
        scenario.outsourcePaymentStates.get(`${jobId}:${readyDay}`)
          ?.isPaid,
        false,
      );
      assert.equal(
        scenario.outsourcePaymentStates.get(
          `${jobId}:${receiptDay - 1}`,
        )?.isPaid,
        false,
      );
      assert.equal(
        scenario.outsourcePaymentStates.get(`${jobId}:${receiptDay}`)
          ?.isPaid,
        true,
      );
    });
  });

  await t.test("nakit takvimi son dönem açığını ve yedinci gün tahsilatını gösterir", () => {
    assert.equal(scenario.day88Calendar.risk, "SHORTFALL");
    assert.equal(scenario.day88Calendar.shortfallDay, 88);
    assert.equal(
      scenario.day88Calendar.lowestProjectedBalanceCents,
      "-728",
    );
    assert.deepEqual(scenario.day88Calendar.firstIncome, {
      amountCents: "1100",
      certainty: "CONFIRMED",
      day: 95,
    });
    assert.equal(
      scenario.day88Calendar.estimatedEndBalanceCents,
      "372",
    );
    assert.equal(scenario.day95Calendar.risk, "NEUTRAL");
    assert.equal(
      scenario.day95Calendar.estimatedEndBalanceCents,
      "372",
    );
  });
});

async function runLongTermScenario() {
  const harness = buildLongTermFinanceHarness({
    balanceCents: BigInt(300),
  });

  for (const receiptDay of RECEIPT_DAYS) {
    await createFinanceDue({
      amountCents: RECEIPT_CENTS,
      category: FinanceCategory.ORDER_REVENUE,
      createdDay: receiptDay - 7,
      description: `Sipariş tahsilatı ${receiptDay}`,
      direction: FinanceDirection.INCOME,
      dueDay: receiptDay,
      factoryId: FACTORY_ID,
      periodIndex: Math.ceil(receiptDay / 22),
      referenceKey: `ORDER_RECEIVABLE:order-${receiptDay}`,
      sourceId: `order-${receiptDay}`,
      sourceType: FinanceSourceType.CUSTOMER_ORDER,
      tx: harness.tx,
    });
  }

  const snapshots = new Map<number, DaySnapshot>();
  const outsourcePaymentStates = new Map<
    string,
    ReturnType<typeof resolveOutsourcePaymentState>
  >();
  let day88Calendar: ReturnType<typeof buildFinanceCashCalendar> | null =
    null;
  let day95Calendar: ReturnType<typeof buildFinanceCashCalendar> | null =
    null;

  for (let day = 1; day <= LAST_SIMULATION_DAY; day += 1) {
    harness.setCurrentFinancePeriod(Math.ceil(day / 22));

    await processPeriodicFinancialTriggers({
      factoryDay: day,
      factoryId: FACTORY_ID,
      tx: harness.tx,
    });
    await processPeriodicFinancialTriggers({
      factoryDay: day,
      factoryId: FACTORY_ID,
      tx: harness.tx,
    });

    const outsourceIndex = OUTSOURCE_DAYS.indexOf(
      day as (typeof OUTSOURCE_DAYS)[number],
    );

    if (outsourceIndex >= 0) {
      const jobId = `outsource-${outsourceIndex + 1}`;
      const expenseInput = {
        amountCents: BigInt(250),
        category: FinanceCategory.OUTSOURCE_COST,
        description: `Fason ödeme ${jobId}`,
        factoryDay: day,
        factoryId: FACTORY_ID,
        metadata: { source: "long-term-regression" },
        referenceKey: buildOutsourcePaymentReferenceKey(jobId),
        sourceId: jobId,
        sourceType: FinanceSourceType.OUTSOURCE_JOB,
        tx: harness.tx,
      } as const;

      await settleFactoryExpense(expenseInput);
      await settleFactoryExpense(expenseInput);
    }

    for (const incomeDue of harness.state.dues.filter(
      (due) =>
        due.direction === FinanceDirection.INCOME &&
        due.dueDay === day,
    )) {
      await settleFinanceDue({
        dueId: incomeDue.id,
        factoryId: FACTORY_ID,
        gameDay: day,
        tx: harness.tx,
      });
      await settleFinanceDue({
        dueId: incomeDue.id,
        factoryId: FACTORY_ID,
        gameDay: day,
        tx: harness.tx,
      });
    }

    await processDuePayments({
      factoryId: FACTORY_ID,
      gameDay: day,
      tx: harness.tx,
    });
    await processDuePayments({
      factoryId: FACTORY_ID,
      gameDay: day,
      tx: harness.tx,
    });

    const [availableBalance, payrollImpact] = await Promise.all([
      getFactoryAvailableBalance({
        currentDay: day,
        factoryId: FACTORY_ID,
        tx: harness.tx,
      }),
      getFactoryPayrollProductionImpact({
        factoryId: FACTORY_ID,
        gameDay: day,
        tx: harness.tx,
      }),
    ]);

    snapshots.set(day, {
      availableBalanceCents: availableBalance.availableBalanceCents,
      capacityMultiplierBps: payrollImpact.capacityMultiplierBps,
      cashBalanceCents: availableBalance.cashBalanceCents,
      openDebtCents: availableBalance.openDebtCents,
      productionPenaltyBps: payrollImpact.productionPenaltyBps,
    });

    OUTSOURCE_DAYS.forEach((readyDay, index) => {
      if (readyDay > day) return;

      const jobId = `outsource-${index + 1}`;
      const referenceKey = buildOutsourcePaymentReferenceKey(jobId);
      const due = harness.state.dues.find(
        (item) => item.referenceKey === referenceKey,
      );
      const transaction = harness.state.transactions.find(
        (item) => item.referenceKey === referenceKey,
      );

      outsourcePaymentStates.set(
        `${jobId}:${day}`,
        resolveOutsourcePaymentState({
          dueSettledAmountCents: due?.settledAmountCents,
          totalCostCents: BigInt(250),
          transactionAmountCents: transaction?.amountCents,
        }),
      );
    });

    if (day === 88) {
      day88Calendar = buildCalendarFromHarness(harness, day);
    }
    if (day === 95) {
      day95Calendar = buildCalendarFromHarness(harness, day);
    }
  }

  assert.ok(day88Calendar);
  assert.ok(day95Calendar);

  return {
    day88Calendar,
    day95Calendar,
    harness,
    outsourcePaymentStates,
    snapshots,
  };
}

function buildCalendarFromHarness(
  harness: LongTermFinanceHarness,
  currentDay: number,
) {
  const sources: FinanceCashCalendarSource[] =
    harness.state.dues.flatMap((due) => {
      const remainingCents =
        due.amountCents - due.settledAmountCents;

      if (
        !OPEN_DUE_STATUSES.has(due.status) ||
        remainingCents <= BigInt(0)
      ) {
        return [];
      }

      return [
        {
          amountCents: remainingCents,
          category: due.category,
          certainty: "CONFIRMED" as const,
          day: due.dueDay,
          description: due.description,
          direction: due.direction,
          id: `due:${due.id}`,
          label: due.description,
        },
      ];
    });

  return buildFinanceCashCalendar({
    cashBalanceCents: harness.state.balanceCents,
    currentDay,
    sources,
  });
}

function settlementCategoriesForDay(
  harness: LongTermFinanceHarness,
  gameDay: number,
) {
  return harness.state.transactions
    .filter(
      (transaction) =>
        transaction.gameDay === gameDay &&
        transaction.direction === FinanceDirection.EXPENSE &&
        transaction.referenceKey.startsWith(
          "FINANCE_DUE_SETTLEMENT:",
        ),
    )
    .map((transaction) => transaction.category);
}

function countByPrefix(values: Set<string>, prefix: string) {
  return [...values].filter((value) => value.startsWith(prefix)).length;
}

type DaySnapshot = {
  availableBalanceCents: bigint;
  capacityMultiplierBps: number;
  cashBalanceCents: bigint;
  openDebtCents: bigint;
  productionPenaltyBps: number;
};

type DueState = {
  amountCents: bigint;
  category: FinanceCategory;
  createdAt: Date;
  createdDay: number;
  description: string;
  direction: FinanceDirection;
  dueDay: number;
  factoryId: string;
  id: string;
  metadata: unknown;
  periodIndex: number;
  referenceKey: string;
  settledAmountCents: bigint;
  sourceId: string | null;
  sourceType: FinanceSourceType | null;
  status: FinanceDueStatus;
};

type TransactionState = {
  amountCents: bigint;
  balanceAfterCents: bigint;
  balanceBeforeCents: bigint;
  category: FinanceCategory;
  description: string;
  direction: FinanceDirection;
  factoryId: string;
  financeDueId: string | null;
  gameDay: number;
  id: string;
  metadata: unknown;
  periodIndex: number;
  referenceKey: string;
  sourceId: string | null;
  sourceType: FinanceSourceType | null;
};

type DueWhere = {
  category?: FinanceCategory | { in: FinanceCategory[] };
  direction?: FinanceDirection;
  dueDay?: { lte: number };
  factoryId?: string;
  referenceKey?: { in: string[] };
  status?: { in: FinanceDueStatus[] };
};

type LongTermFinanceHarness = ReturnType<
  typeof buildLongTermFinanceHarness
>;

function buildLongTermFinanceHarness(input: {
  balanceCents: bigint;
}) {
  const state = {
    balanceCents: input.balanceCents,
    currentFinancePeriod: 1,
    dues: [] as DueState[],
    transactions: [] as TransactionState[],
  };
  const staffAssignments = [
    {
      factoryProductionLineId: "line-1",
      quantity: 2,
      staffRole: { monthlySalaryCents: 200 },
    },
  ];
  const tx = {
    factory: {
      findUniqueOrThrow: async () => ({
        cashBalanceCents: state.balanceCents,
        currentFinancePeriod: state.currentFinancePeriod,
        productionLines: [
          {
            productionLineTemplate: {
              areaM2: 10,
              monthlyElectricityBaseCents: 100,
            },
          },
        ],
        sectorId: "sector-1",
        staffAssignments: staffAssignments.map((assignment) => ({
          factoryProductionLineId:
            assignment.factoryProductionLineId,
          quantity: assignment.quantity,
        })),
      }),
      update: async ({
        data,
      }: {
        data: { cashBalanceCents: bigint };
      }) => {
        state.balanceCents = data.cashBalanceCents;
      },
    },
    factoryFinanceDue: {
      create: async ({
        data,
      }: {
        data: Omit<DueState, "createdAt" | "id">;
      }) => {
        const due = {
          ...data,
          createdAt: new Date(
            Date.UTC(2026, 0, 1, 0, 0, state.dues.length),
          ),
          id: `due-${state.dues.length + 1}`,
        };
        state.dues.push(due);

        return due;
      },
      findMany: async ({ where }: { where?: DueWhere }) =>
        state.dues.filter((due) => matchesDueWhere(due, where)),
      findUnique: async ({
        where,
      }: {
        where: { id?: string; referenceKey?: string };
      }) =>
        state.dues.find(
          (due) =>
            due.id === where.id ||
            due.referenceKey === where.referenceKey,
        ) ?? null,
      update: async ({
        data,
        where,
      }: {
        data: Partial<DueState>;
        where: { id: string };
      }) => {
        const due = state.dues.find((item) => item.id === where.id);

        if (!due) throw new Error("Regression due was not found.");

        Object.assign(due, data);

        return due;
      },
      updateMany: async ({
        data,
        where,
      }: {
        data: Partial<DueState>;
        where: {
          id: string;
          settledAmountCents: bigint;
          status: FinanceDueStatus;
        };
      }) => {
        const due = state.dues.find((item) => item.id === where.id);

        if (
          !due ||
          due.settledAmountCents !== where.settledAmountCents ||
          due.status !== where.status
        ) {
          return { count: 0 };
        }

        Object.assign(due, data);

        return { count: 1 };
      },
    },
    factoryFinanceTransaction: {
      create: async ({
        data,
      }: {
        data: Omit<TransactionState, "id">;
      }) => {
        const transaction = {
          ...data,
          id: `transaction-${state.transactions.length + 1}`,
        };
        state.transactions.push(transaction);

        return transaction;
      },
      findUnique: async ({
        where,
      }: {
        where: { referenceKey: string };
      }) =>
        state.transactions.find(
          (transaction) =>
            transaction.referenceKey === where.referenceKey,
        ) ?? null,
    },
    factoryStaffAssignment: {
      findMany: async () => staffAssignments,
    },
    sectorOperatingCostConfig: {
      findUnique: async () => ({
        dailyMealPerDirectStaffCents: 1,
        directStaffOverheadPerStaffCents: 2,
        rentPerM2Cents: 20,
      }),
    },
  } as unknown as Prisma.TransactionClient;

  return {
    setCurrentFinancePeriod(periodIndex: number) {
      state.currentFinancePeriod = periodIndex;
    },
    state,
    tx,
  };
}

function matchesDueWhere(due: DueState, where?: DueWhere) {
  if (!where) return true;
  if (where.factoryId && due.factoryId !== where.factoryId) return false;
  if (where.direction && due.direction !== where.direction) return false;
  if (where.dueDay && due.dueDay > where.dueDay.lte) return false;
  if (
    where.category &&
    (typeof where.category === "string"
      ? due.category !== where.category
      : !where.category.in.includes(due.category))
  ) {
    return false;
  }
  if (where.status && !where.status.in.includes(due.status)) {
    return false;
  }
  if (
    where.referenceKey &&
    !where.referenceKey.in.includes(due.referenceKey)
  ) {
    return false;
  }

  return true;
}

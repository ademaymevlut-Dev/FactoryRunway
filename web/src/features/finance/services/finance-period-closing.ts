import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  Prisma,
} from "@/generated/prisma/client";

import { getFinanceReport } from "./finance-report";
import { getFinancePeriod } from "./finance-period";

type FinancePeriodClosingClient = Prisma.TransactionClient;

const snapshotCategories = [
  FinanceCategory.ORDER_REVENUE,
  FinanceCategory.OUTSOURCE_COST,
  FinanceCategory.PAYROLL,
  FinanceCategory.RENT,
  FinanceCategory.ELECTRICITY,
  FinanceCategory.MEAL,
  FinanceCategory.OVERHEAD,
  FinanceCategory.LEASING_PAYMENT,
  FinanceCategory.MAINTENANCE,
  FinanceCategory.PENALTY,
] as const;
const snapshotCategorySet = new Set<FinanceCategory>(snapshotCategories);

export type FinancePeriodClosingResult =
  | {
      closed: false;
      periodIndex: number;
    }
  | {
      closed: true;
      periodIndex: number;
      snapshotId: string;
    };

export async function runFinancePeriodClosing(input: {
  factoryDay: number;
  factoryId: string;
  tx: FinancePeriodClosingClient;
}): Promise<FinancePeriodClosingResult> {
  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: {
      cashBalanceCents: true,
      currentFinancePeriod: true,
      id: true,
      sectorId: true,
    },
  });
  const simulationConfig = await input.tx.sectorSimulationConfig.findUnique({
    where: { sectorId: factory.sectorId },
    select: { financePeriodDays: true },
  });
  const period = getFinancePeriod({
    currentDay: input.factoryDay,
    financePeriodDays: simulationConfig?.financePeriodDays,
  });

  if (input.factoryDay !== period.endDay) {
    return { closed: false, periodIndex: period.periodIndex };
  }

  const existingSnapshot = await input.tx.factoryFinancePeriodSnapshot.findUnique({
    where: {
      factoryId_periodIndex: {
        factoryId: input.factoryId,
        periodIndex: period.periodIndex,
      },
    },
    select: { id: true },
  });

  if (existingSnapshot) {
    await advanceFactoryFinancePeriod({
      factoryId: input.factoryId,
      periodIndex: period.periodIndex,
      tx: input.tx,
    });

    return {
      closed: true,
      periodIndex: period.periodIndex,
      snapshotId: existingSnapshot.id,
    };
  }

  const [
    transactions,
    previousSnapshot,
    profitReport,
    cashReport,
    expensesReport,
    openDueSummary,
  ] = await Promise.all([
    input.tx.factoryFinanceTransaction.findMany({
      where: {
        factoryId: input.factoryId,
        gameDay: {
          gte: period.startDay,
          lte: period.endDay,
        },
      },
      orderBy: [{ gameDay: "asc" }, { createdAt: "asc" }],
      select: {
        amountCents: true,
        balanceBeforeCents: true,
        category: true,
        direction: true,
      },
    }),
    period.periodIndex > 1
      ? input.tx.factoryFinancePeriodSnapshot.findUnique({
          where: {
            factoryId_periodIndex: {
              factoryId: input.factoryId,
              periodIndex: period.periodIndex - 1,
            },
          },
          select: { endingCashCents: true },
        })
      : null,
    getFinanceReport({
      factoryId: input.factoryId,
      periodIndex: period.periodIndex,
      prisma: input.tx,
      tab: "profit",
    }),
    getFinanceReport({
      factoryId: input.factoryId,
      periodIndex: period.periodIndex,
      prisma: input.tx,
      tab: "cash",
    }),
    getFinanceReport({
      factoryId: input.factoryId,
      periodIndex: period.periodIndex,
      prisma: input.tx,
      tab: "expenses",
    }),
    summarizeOpenDues({
      currentDay: input.factoryDay,
      factoryId: input.factoryId,
      tx: input.tx,
    }),
  ]);
  const categoryTotals = calculateCategoryTotals(transactions);
  const totalIncomeCents = transactions
    .filter((transaction) => transaction.direction === FinanceDirection.INCOME)
    .reduce((total, transaction) => total + transaction.amountCents, BigInt(0));
  const totalExpenseCents = transactions
    .filter((transaction) => transaction.direction === FinanceDirection.EXPENSE)
    .reduce((total, transaction) => total + transaction.amountCents, BigInt(0));
  const startingCashCents =
    previousSnapshot?.endingCashCents ??
    transactions[0]?.balanceBeforeCents ??
    factory.cashBalanceCents;
  const snapshot = await input.tx.factoryFinancePeriodSnapshot.create({
    data: {
      electricityCents: categoryTotals.get(FinanceCategory.ELECTRICITY) ?? BigInt(0),
      endingCashCents: factory.cashBalanceCents,
      endDay: period.endDay,
      factoryId: input.factoryId,
      leasingPaymentCents:
        categoryTotals.get(FinanceCategory.LEASING_PAYMENT) ?? BigInt(0),
      maintenanceCents:
        categoryTotals.get(FinanceCategory.MAINTENANCE) ?? BigInt(0),
      mealCents: categoryTotals.get(FinanceCategory.MEAL) ?? BigInt(0),
      metadata: buildSnapshotMetadata({
        cashReport,
        expensesReport,
        openDueSummary,
        profitReport,
      }),
      netResultCents: totalIncomeCents - totalExpenseCents,
      orderRevenueCents:
        categoryTotals.get(FinanceCategory.ORDER_REVENUE) ?? BigInt(0),
      outsourceCostCents:
        categoryTotals.get(FinanceCategory.OUTSOURCE_COST) ?? BigInt(0),
      overheadCents: categoryTotals.get(FinanceCategory.OVERHEAD) ?? BigInt(0),
      payrollCents: categoryTotals.get(FinanceCategory.PAYROLL) ?? BigInt(0),
      penaltyCents: categoryTotals.get(FinanceCategory.PENALTY) ?? BigInt(0),
      periodIndex: period.periodIndex,
      rentCents: categoryTotals.get(FinanceCategory.RENT) ?? BigInt(0),
      startDay: period.startDay,
      startingCashCents,
      totalExpenseCents,
      totalIncomeCents,
    },
    select: { id: true },
  });

  await advanceFactoryFinancePeriod({
    factoryId: input.factoryId,
    periodIndex: period.periodIndex,
    tx: input.tx,
  });

  return {
    closed: true,
    periodIndex: period.periodIndex,
    snapshotId: snapshot.id,
  };
}

function calculateCategoryTotals(
  transactions: Array<{
    amountCents: bigint;
    category: FinanceCategory;
    direction: FinanceDirection;
  }>,
) {
  const totals = new Map<FinanceCategory, bigint>();

  for (const transaction of transactions) {
    if (!snapshotCategorySet.has(transaction.category)) continue;

    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? BigInt(0)) +
        transaction.amountCents,
    );
  }

  return totals;
}

async function summarizeOpenDues(input: {
  currentDay: number;
  factoryId: string;
  tx: FinancePeriodClosingClient;
}) {
  const dues = await input.tx.factoryFinanceDue.findMany({
    where: {
      factoryId: input.factoryId,
      status: {
        in: [
          FinanceDueStatus.PENDING,
          FinanceDueStatus.PARTIAL,
          FinanceDueStatus.OVERDUE,
        ],
      },
    },
    select: {
      amountCents: true,
      direction: true,
      dueDay: true,
      settledAmountCents: true,
      status: true,
    },
  });
  const summary = {
    overduePayableCents: BigInt(0),
    overdueReceivableCents: BigInt(0),
    pendingPayableCents: BigInt(0),
    pendingReceivableCents: BigInt(0),
  };

  for (const due of dues) {
    const remainingCents = due.amountCents - due.settledAmountCents;

    if (remainingCents <= BigInt(0)) continue;

    const isOverdue =
      due.status === FinanceDueStatus.OVERDUE || due.dueDay < input.currentDay;

    if (due.direction === FinanceDirection.INCOME) {
      if (isOverdue) summary.overdueReceivableCents += remainingCents;
      else summary.pendingReceivableCents += remainingCents;
    } else if (isOverdue) {
      summary.overduePayableCents += remainingCents;
    } else {
      summary.pendingPayableCents += remainingCents;
    }
  }

  return {
    overduePayableCents: summary.overduePayableCents.toString(),
    overdueReceivableCents: summary.overdueReceivableCents.toString(),
    pendingPayableCents: summary.pendingPayableCents.toString(),
    pendingReceivableCents: summary.pendingReceivableCents.toString(),
  };
}

function buildSnapshotMetadata(input: {
  cashReport: Awaited<ReturnType<typeof getFinanceReport>>;
  expensesReport: Awaited<ReturnType<typeof getFinanceReport>>;
  openDueSummary: Awaited<ReturnType<typeof summarizeOpenDues>>;
  profitReport: Awaited<ReturnType<typeof getFinanceReport>>;
}): Prisma.InputJsonObject {
  const profit = input.profitReport?.tab === "profit" ? input.profitReport : null;
  const cash = input.cashReport?.tab === "cash" ? input.cashReport : null;
  const expenses =
    input.expensesReport?.tab === "expenses" ? input.expensesReport : null;

  return {
    cash: cash
      ? {
          dailyNet: cash.dailyNet,
          expenseCents: cash.expenseCents,
          incomeCents: cash.incomeCents,
          netCashCents: cash.netCashCents,
        }
      : null,
    expenses: expenses
      ? {
          breakdown: expenses.breakdown,
          investmentExpenseCents: expenses.investmentExpenseCents,
          operatingExpenseCents: expenses.operatingExpenseCents,
          totalExpenseCents: expenses.totalExpenseCents,
        }
      : null,
    openDueSummary: input.openDueSummary,
    profit: profit
      ? {
          completedProductionValueCents: profit.completedProductionValueCents,
          completedQuantity: profit.completedQuantity,
          operationalExpenseCents: profit.operationalExpenseCents,
          operationalMarginBps: profit.operationalMarginBps,
          operationalProfitCents: profit.operationalProfitCents,
          shippedRevenueCents: profit.shippedRevenueCents,
        }
      : null,
    version: 1,
  };
}

async function advanceFactoryFinancePeriod(input: {
  factoryId: string;
  periodIndex: number;
  tx: FinancePeriodClosingClient;
}) {
  await input.tx.factory.updateMany({
    where: {
      currentFinancePeriod: { lte: input.periodIndex },
      id: input.factoryId,
    },
    data: {
      currentFinancePeriod: input.periodIndex + 1,
    },
  });
}

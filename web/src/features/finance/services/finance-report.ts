import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  LeasingContractStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

import {
  type FinanceCashReport,
  type FinanceCategoryBreakdown,
  type FinanceDueItem,
  type FinanceExpensesReport,
  type FinanceInvestmentReport,
  type FinanceOverviewReport,
  type FinancePeriodView,
  type FinanceProfitReport,
  type FinanceProductionValueItem,
  type FinanceReport,
  type FinanceReportTab,
  type FinanceTransactionItem,
  type FinanceTone,
} from "../types";
import { getFinancePeriod } from "./finance-period";

const operatingExpenseCategories = [
  FinanceCategory.PAYROLL,
  FinanceCategory.RENT,
  FinanceCategory.ELECTRICITY,
  FinanceCategory.MEAL,
  FinanceCategory.OVERHEAD,
  FinanceCategory.OUTSOURCE_COST,
  FinanceCategory.MAINTENANCE,
  FinanceCategory.PENALTY,
] as const;
const operatingExpenseCategorySet = new Set<FinanceCategory>(
  operatingExpenseCategories,
);

const investmentCategories = [
  FinanceCategory.MACHINE_PURCHASE,
  FinanceCategory.LEASING_DOWN_PAYMENT,
  FinanceCategory.LEASING_PAYMENT,
] as const;
const investmentCategorySet = new Set<FinanceCategory>(investmentCategories);

const expenseCategories = [
  ...operatingExpenseCategories,
  ...investmentCategories,
  FinanceCategory.OTHER,
] as const;

const openDueStatuses = [
  FinanceDueStatus.PENDING,
  FinanceDueStatus.PARTIAL,
  FinanceDueStatus.OVERDUE,
] as const;

type FinanceReportClient = PrismaClient | Prisma.TransactionClient;

export async function getFinanceReport(input: {
  factoryId: string;
  periodIndex?: number | null;
  prisma: FinanceReportClient;
  tab: FinanceReportTab;
}): Promise<FinanceReport | null> {
  const factory = await input.prisma.factory.findUnique({
    where: { id: input.factoryId },
    select: {
      cashBalanceCents: true,
      currencyCode: true,
      currentDay: true,
      id: true,
      sectorId: true,
    },
  });

  if (!factory) return null;

  const simulationConfig = await input.prisma.sectorSimulationConfig.findUnique({
    where: { sectorId: factory.sectorId },
    select: { financePeriodDays: true },
  });
  const period = getFinancePeriod({
    currentDay: factory.currentDay,
    financePeriodDays: simulationConfig?.financePeriodDays,
    periodIndex: input.periodIndex,
  });
  const base = {
    cashBalanceCents: factory.cashBalanceCents.toString(),
    currencyCode: factory.currencyCode,
    factoryId: factory.id,
    period,
  };

  if (input.tab === "overview") {
    return buildOverviewReport({ ...base, prisma: input.prisma });
  }

  if (input.tab === "profit") {
    return buildProfitReport({ ...base, prisma: input.prisma });
  }

  if (input.tab === "cash") {
    return buildCashReport({ ...base, prisma: input.prisma });
  }

  if (input.tab === "investment") {
    return buildInvestmentReport({ ...base, prisma: input.prisma });
  }

  return buildExpensesReport({ ...base, prisma: input.prisma });
}

async function buildOverviewReport(input: ReportBuilderInput): Promise<FinanceOverviewReport> {
  const [productionValue, operatingExpenses, cashTotals, dueSummary, latestTransactions] =
    await Promise.all([
      getCompletedProductionValue(input),
      getExpenseObligationBreakdown(input.prisma, input.factoryId, input.period, operatingExpenseCategories),
      getCashTotals(input.prisma, input.factoryId, input.period),
      getDueSummary(input.prisma, input.factoryId, input.period.currentDay),
      getTransactions(input.prisma, input.factoryId, {
        limit: 5,
      }),
    ]);
  const operationalExpenseCents = sumBreakdown(operatingExpenses);
  const operationalProfitCents =
    productionValue.completedProductionValueCents - operationalExpenseCents;
  const topExpense = operatingExpenses[0] ?? null;

  return {
    cashBalanceCents: input.cashBalanceCents,
    cards: [
      {
        amountCents: input.cashBalanceCents,
        caption: "Canlı fabrika kasası",
        id: "cash",
        label: "Kasa",
        tone: "info",
      },
      {
        amountCents: operationalProfitCents.toString(),
        caption: `${productionValue.completedQuantity} adet final üretim`,
        id: "operational-profit",
        label: "Operasyonel sonuç",
        tone: moneyTone(operationalProfitCents),
      },
      {
        amountCents: cashTotals.netCashCents.toString(),
        caption: "Bu ay gerçekleşen kasa hareketi",
        id: "net-cash",
        label: "Net nakit",
        tone: moneyTone(cashTotals.netCashCents),
      },
      {
        amountCents: dueSummary.next7ReceivableCents.toString(),
        caption: "Önümüzdeki 7 gün",
        id: "receivable",
        label: "Beklenen tahsilat",
        tone: "positive",
      },
    ],
    currencyCode: input.currencyCode,
    dueSummary: stringifyDueSummary(dueSummary),
    factoryId: input.factoryId,
    latestTransactions,
    period: input.period,
    tab: "overview",
    topExpense,
  };
}

async function buildProfitReport(input: ReportBuilderInput): Promise<FinanceProfitReport> {
  const [productionValue, operatingExpenses, shippedRevenueCents] =
    await Promise.all([
      getCompletedProductionValue(input),
      getExpenseObligationBreakdown(input.prisma, input.factoryId, input.period, operatingExpenseCategories),
      getShippedRevenueCents(input.prisma, input.factoryId, input.period),
    ]);
  const operationalExpenseCents = sumBreakdown(operatingExpenses);
  const operationalProfitCents =
    productionValue.completedProductionValueCents - operationalExpenseCents;

  return {
    cashBalanceCents: input.cashBalanceCents,
    completedProductionValueCents:
      productionValue.completedProductionValueCents.toString(),
    completedQuantity: productionValue.completedQuantity,
    completionItems: productionValue.items,
    currencyCode: input.currencyCode,
    expenseBreakdown: operatingExpenses,
    factoryId: input.factoryId,
    operationalExpenseCents: operationalExpenseCents.toString(),
    operationalMarginBps: ratioBps(
      operationalProfitCents,
      productionValue.completedProductionValueCents,
    ),
    operationalProfitCents: operationalProfitCents.toString(),
    period: input.period,
    shippedRevenueCents: shippedRevenueCents.toString(),
    tab: "profit",
  };
}

async function buildCashReport(input: ReportBuilderInput): Promise<FinanceCashReport> {
  const openDueUntilDay = input.period.isCurrentPeriod
    ? Math.max(input.period.endDay, input.period.currentDay + 7)
    : input.period.endDay;
  const [transactions, openDues] = await Promise.all([
    getTransactions(input.prisma, input.factoryId, {
      endDay: input.period.endDay,
      startDay: input.period.startDay,
    }),
    getOpenDues(input.prisma, input.factoryId, openDueUntilDay),
  ]);
  const incomeCents = sumTransactions(transactions, "INCOME");
  const expenseCents = sumTransactions(transactions, "EXPENSE");
  const dailyNet = buildDailyNet(input.period, transactions);

  return {
    cashBalanceCents: input.cashBalanceCents,
    currencyCode: input.currencyCode,
    dailyNet,
    expenseCents: expenseCents.toString(),
    factoryId: input.factoryId,
    incomeCents: incomeCents.toString(),
    netCashCents: (incomeCents - expenseCents).toString(),
    openDues,
    period: input.period,
    tab: "cash",
    transactions,
  };
}

async function buildInvestmentReport(input: ReportBuilderInput): Promise<FinanceInvestmentReport> {
  const [allTransactions, recentTransactions, contracts] = await Promise.all([
    getTransactions(input.prisma, input.factoryId, {
      categories: investmentCategories,
    }),
    getTransactions(input.prisma, input.factoryId, {
      categories: investmentCategories,
      limit: 12,
    }),
    input.prisma.factoryLeasingContract.findMany({
      where: {
        factoryId: input.factoryId,
        status: LeasingContractStatus.ACTIVE,
      },
      orderBy: [{ nextDueDay: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        monthlyPaymentCents: true,
        nextDueDay: true,
        remainingInstallments: true,
        status: true,
        productionLine: {
          select: {
            customName: true,
            lineNumber: true,
            productionLineTemplate: {
              select: {
                key: true,
                department: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  const machinePurchaseCents = sumTransactionsByCategory(
    allTransactions,
    FinanceCategory.MACHINE_PURCHASE,
  );
  const leasingDownPaymentCents = sumTransactionsByCategory(
    allTransactions,
    FinanceCategory.LEASING_DOWN_PAYMENT,
  );
  const leasingPaidCents = sumTransactionsByCategory(
    allTransactions,
    FinanceCategory.LEASING_PAYMENT,
  );
  const activeContracts = contracts.map((contract) => {
    const remainingAmountCents =
      contract.monthlyPaymentCents * BigInt(contract.remainingInstallments);

    return {
      id: contract.id,
      lineName:
        contract.productionLine.customName ??
        `${departmentLabel(contract.productionLine.productionLineTemplate.department.key)} ${contract.productionLine.lineNumber}`,
      monthlyPaymentCents: contract.monthlyPaymentCents.toString(),
      nextDueDay: contract.nextDueDay,
      remainingAmountCents: remainingAmountCents.toString(),
      remainingInstallments: contract.remainingInstallments,
      status: contract.status,
    };
  });
  const activeLeasingObligationCents = activeContracts.reduce(
    (total, contract) => total + BigInt(contract.remainingAmountCents),
    BigInt(0),
  );

  return {
    activeContracts,
    activeLeasingObligationCents: activeLeasingObligationCents.toString(),
    cashBalanceCents: input.cashBalanceCents,
    currencyCode: input.currencyCode,
    factoryId: input.factoryId,
    investmentTransactions: recentTransactions,
    leasingDownPaymentCents: leasingDownPaymentCents.toString(),
    leasingPaidCents: leasingPaidCents.toString(),
    machinePurchaseCents: machinePurchaseCents.toString(),
    period: input.period,
    tab: "investment",
    totalInvestedCashCents: (
      machinePurchaseCents +
      leasingDownPaymentCents +
      leasingPaidCents
    ).toString(),
  };
}

async function buildExpensesReport(input: ReportBuilderInput): Promise<FinanceExpensesReport> {
  const [breakdown, recentExpenses] = await Promise.all([
    getExpenseObligationBreakdown(input.prisma, input.factoryId, input.period, expenseCategories),
    getTransactions(input.prisma, input.factoryId, {
      direction: FinanceDirection.EXPENSE,
      endDay: input.period.endDay,
      limit: 12,
      startDay: input.period.startDay,
    }),
  ]);
  const totalExpenseCents = sumBreakdown(breakdown);
  const operatingExpenseCents = sumBreakdown(
    breakdown.filter((item) =>
      operatingExpenseCategorySet.has(item.category as FinanceCategory),
    ),
  );
  const investmentExpenseCents = sumBreakdown(
    breakdown.filter((item) =>
      investmentCategorySet.has(item.category as FinanceCategory),
    ),
  );

  return {
    breakdown,
    cashBalanceCents: input.cashBalanceCents,
    currencyCode: input.currencyCode,
    factoryId: input.factoryId,
    investmentExpenseCents: investmentExpenseCents.toString(),
    operatingExpenseCents: operatingExpenseCents.toString(),
    period: input.period,
    recentExpenses,
    tab: "expenses",
    totalExpenseCents: totalExpenseCents.toString(),
  };
}

async function getCompletedProductionValue(input: ReportBuilderInput) {
  const rows = await input.prisma.shiftLineResult.findMany({
    where: {
      department: { key: "ironing_packing" },
      factoryId: input.factoryId,
      producedQuantity: { gt: 0 },
      productionOrderId: { not: null },
      shiftSimulation: {
        gameDay: {
          gte: input.period.startDay,
          lte: input.period.endDay,
        },
      },
    },
    orderBy: [{ shiftSimulation: { gameDay: "desc" } }, { createdAt: "desc" }],
    select: {
      producedQuantity: true,
      productionOrder: {
        select: {
          customerOrder: { select: { orderNo: true } },
          customerOrderItem: {
            select: {
              unitPriceCents: true,
              product: { select: { name: true } },
            },
          },
        },
      },
      shiftSimulation: {
        select: { gameDay: true },
      },
    },
  });
  const items = new Map<string, FinanceProductionValueItem>();

  for (const row of rows) {
    if (!row.productionOrder) continue;

    const unitPriceCents = BigInt(row.productionOrder.customerOrderItem.unitPriceCents);
    const amountCents = unitPriceCents * BigInt(row.producedQuantity);
    const key = [
      row.shiftSimulation.gameDay,
      row.productionOrder.customerOrder.orderNo,
      row.productionOrder.customerOrderItem.product.name,
      row.productionOrder.customerOrderItem.unitPriceCents,
    ].join(":");
    const current = items.get(key);

    if (current) {
      current.amountCents = (BigInt(current.amountCents) + amountCents).toString();
      current.quantity += row.producedQuantity;
    } else {
      items.set(key, {
        amountCents: amountCents.toString(),
        day: row.shiftSimulation.gameDay,
        orderNo: row.productionOrder.customerOrder.orderNo,
        productName: row.productionOrder.customerOrderItem.product.name,
        quantity: row.producedQuantity,
        unitPriceCents: unitPriceCents.toString(),
      });
    }
  }

  if (items.size === 0) {
    return getCompletedProductionValueFallback(input);
  }

  return summarizeProductionItems([...items.values()]);
}

async function getCompletedProductionValueFallback(input: ReportBuilderInput) {
  const productionOrders = await input.prisma.productionOrder.findMany({
    where: {
      completedDay: {
        gte: input.period.startDay,
        lte: input.period.endDay,
      },
      completedQuantity: { gt: 0 },
      factoryId: input.factoryId,
    },
    orderBy: [{ completedDay: "desc" }, { createdAt: "desc" }],
    select: {
      completedDay: true,
      completedQuantity: true,
      customerOrder: { select: { orderNo: true } },
      customerOrderItem: {
        select: {
          unitPriceCents: true,
          product: { select: { name: true } },
        },
      },
    },
  });
  const items = productionOrders.map((order) => {
    const unitPriceCents = BigInt(order.customerOrderItem.unitPriceCents);
    const amountCents = unitPriceCents * BigInt(order.completedQuantity);

    return {
      amountCents: amountCents.toString(),
      day: order.completedDay ?? input.period.endDay,
      orderNo: order.customerOrder.orderNo,
      productName: order.customerOrderItem.product.name,
      quantity: order.completedQuantity,
      unitPriceCents: unitPriceCents.toString(),
    };
  });

  return summarizeProductionItems(items);
}

function summarizeProductionItems(items: FinanceProductionValueItem[]) {
  return {
    completedProductionValueCents: items.reduce(
      (total, item) => total + BigInt(item.amountCents),
      BigInt(0),
    ),
    completedQuantity: items.reduce((total, item) => total + item.quantity, 0),
    items: items
      .sort((first, second) => second.day - first.day)
      .slice(0, 8),
  };
}

async function getShippedRevenueCents(
  prisma: FinanceReportClient,
  factoryId: string,
  period: FinancePeriodView,
) {
  const orders = await prisma.customerOrder.findMany({
    where: {
      factoryId,
      shippedDay: {
        gte: period.startDay,
        lte: period.endDay,
      },
    },
    select: { totalRevenueCents: true },
  });

  return orders.reduce(
    (total, order) => total + order.totalRevenueCents,
    BigInt(0),
  );
}

async function getExpenseObligationBreakdown(
  prisma: FinanceReportClient,
  factoryId: string,
  period: FinancePeriodView,
  categories: readonly FinanceCategory[],
) {
  const [dues, transactions] = await Promise.all([
    prisma.factoryFinanceDue.findMany({
      where: {
        category: { in: [...categories] },
        createdDay: {
          gte: period.startDay,
          lte: period.endDay,
        },
        direction: FinanceDirection.EXPENSE,
        factoryId,
        status: { not: FinanceDueStatus.CANCELLED },
      },
      select: {
        amountCents: true,
        category: true,
        referenceKey: true,
      },
    }),
    prisma.factoryFinanceTransaction.findMany({
      where: {
        category: { in: [...categories] },
        direction: FinanceDirection.EXPENSE,
        factoryId,
        gameDay: {
          gte: period.startDay,
          lte: period.endDay,
        },
      },
      select: {
        amountCents: true,
        category: true,
        referenceKey: true,
      },
    }),
  ]);
  const totals = new Map<FinanceCategory, bigint>();
  const dueReferenceKeys = new Set(
    dues
      .map((due) => due.referenceKey)
      .filter((referenceKey): referenceKey is string => Boolean(referenceKey)),
  );

  for (const due of dues) {
    totals.set(due.category, (totals.get(due.category) ?? BigInt(0)) + due.amountCents);
  }

  for (const transaction of transactions) {
    if (
      transaction.referenceKey &&
      dueReferenceKeys.has(transaction.referenceKey)
    ) {
      continue;
    }

    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? BigInt(0)) + transaction.amountCents,
    );
  }

  return toBreakdown(totals);
}

async function getCashTotals(
  prisma: FinanceReportClient,
  factoryId: string,
  period: FinancePeriodView,
) {
  const transactions = await getTransactions(prisma, factoryId, {
    endDay: period.endDay,
    startDay: period.startDay,
  });
  const incomeCents = sumTransactions(transactions, "INCOME");
  const expenseCents = sumTransactions(transactions, "EXPENSE");

  return {
    expenseCents,
    incomeCents,
    netCashCents: incomeCents - expenseCents,
  };
}

async function getDueSummary(
  prisma: FinanceReportClient,
  factoryId: string,
  currentDay: number,
) {
  const dues = await prisma.factoryFinanceDue.findMany({
    where: {
      factoryId,
      status: { in: [...openDueStatuses] },
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
    next7PayableCents: BigInt(0),
    next7ReceivableCents: BigInt(0),
    overduePayableCents: BigInt(0),
    overdueReceivableCents: BigInt(0),
  };

  for (const due of dues) {
    const remainingCents = due.amountCents - due.settledAmountCents;

    if (remainingCents <= BigInt(0)) continue;

    const isOverdue =
      due.status === FinanceDueStatus.OVERDUE || due.dueDay < currentDay;
    const isNext7 = due.dueDay >= currentDay && due.dueDay <= currentDay + 7;

    if (due.direction === FinanceDirection.INCOME) {
      if (isOverdue) summary.overdueReceivableCents += remainingCents;
      if (isNext7) summary.next7ReceivableCents += remainingCents;
    } else {
      if (isOverdue) summary.overduePayableCents += remainingCents;
      if (isNext7) summary.next7PayableCents += remainingCents;
    }
  }

  return summary;
}

async function getTransactions(
  prisma: FinanceReportClient,
  factoryId: string,
  filters: {
    categories?: readonly FinanceCategory[];
    direction?: FinanceDirection;
    endDay?: number;
    limit?: number;
    startDay?: number;
  },
): Promise<FinanceTransactionItem[]> {
  const transactions = await prisma.factoryFinanceTransaction.findMany({
    where: {
      ...(filters.categories ? { category: { in: [...filters.categories] } } : {}),
      ...(filters.direction ? { direction: filters.direction } : {}),
      factoryId,
      ...(filters.startDay && filters.endDay
        ? {
            gameDay: {
              gte: filters.startDay,
              lte: filters.endDay,
            },
          }
        : {}),
    },
    orderBy: [{ gameDay: "desc" }, { createdAt: "desc" }],
    take: filters.limit,
    select: {
      amountCents: true,
      balanceAfterCents: true,
      category: true,
      description: true,
      direction: true,
      gameDay: true,
      id: true,
    },
  });

  return transactions.map((transaction) => ({
    amountCents: transaction.amountCents.toString(),
    balanceAfterCents: transaction.balanceAfterCents.toString(),
    category: transaction.category,
    description: transaction.description ?? categoryLabel(transaction.category),
    direction: transaction.direction,
    gameDay: transaction.gameDay,
    id: transaction.id,
    label: categoryLabel(transaction.category),
  }));
}

async function getOpenDues(
  prisma: FinanceReportClient,
  factoryId: string,
  untilDay: number,
): Promise<FinanceDueItem[]> {
  const dues = await prisma.factoryFinanceDue.findMany({
    where: {
      dueDay: { lte: untilDay },
      factoryId,
      status: { in: [...openDueStatuses] },
    },
    orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }],
    take: 12,
    select: {
      amountCents: true,
      category: true,
      description: true,
      direction: true,
      dueDay: true,
      id: true,
      settledAmountCents: true,
      status: true,
    },
  });

  return dues.map((due) => ({
    amountCents: due.amountCents.toString(),
    category: due.category,
    description: due.description ?? categoryLabel(due.category),
    direction: due.direction,
    dueDay: due.dueDay,
    id: due.id,
    label: categoryLabel(due.category),
    settledAmountCents: due.settledAmountCents.toString(),
    status: due.status,
  }));
}

function buildDailyNet(
  period: FinancePeriodView,
  transactions: FinanceTransactionItem[],
) {
  const daily = new Map<number, { expenseCents: bigint; incomeCents: bigint }>();

  for (let day = period.startDay; day <= period.endDay; day += 1) {
    daily.set(day, { expenseCents: BigInt(0), incomeCents: BigInt(0) });
  }

  for (const transaction of transactions) {
    const row = daily.get(transaction.gameDay);

    if (!row) continue;

    if (transaction.direction === "INCOME") {
      row.incomeCents += BigInt(transaction.amountCents);
    } else {
      row.expenseCents += BigInt(transaction.amountCents);
    }
  }

  return [...daily.entries()].map(([day, row]) => ({
    day,
    expenseCents: row.expenseCents.toString(),
    incomeCents: row.incomeCents.toString(),
    netCents: (row.incomeCents - row.expenseCents).toString(),
  }));
}

function toBreakdown(totals: Map<FinanceCategory, bigint>): FinanceCategoryBreakdown[] {
  const totalCents = [...totals.values()].reduce(
    (total, amount) => total + amount,
    BigInt(0),
  );

  return [...totals.entries()]
    .filter(([, amount]) => amount > BigInt(0))
    .map(([category, amount]) => ({
      amountCents: amount.toString(),
      category,
      label: categoryLabel(category),
      shareBps: ratioBps(amount, totalCents),
      tone: expenseTone(category),
    }))
    .sort((first, second) =>
      Number(BigInt(second.amountCents) - BigInt(first.amountCents)),
    );
}

function stringifyDueSummary(summary: Awaited<ReturnType<typeof getDueSummary>>) {
  return {
    next7PayableCents: summary.next7PayableCents.toString(),
    next7ReceivableCents: summary.next7ReceivableCents.toString(),
    overduePayableCents: summary.overduePayableCents.toString(),
    overdueReceivableCents: summary.overdueReceivableCents.toString(),
  };
}

function sumBreakdown(items: FinanceCategoryBreakdown[]) {
  return items.reduce(
    (total, item) => total + BigInt(item.amountCents),
    BigInt(0),
  );
}

function sumTransactions(
  transactions: FinanceTransactionItem[],
  direction: "INCOME" | "EXPENSE",
) {
  return transactions
    .filter((transaction) => transaction.direction === direction)
    .reduce(
      (total, transaction) => total + BigInt(transaction.amountCents),
      BigInt(0),
    );
}

function sumTransactionsByCategory(
  transactions: FinanceTransactionItem[],
  category: FinanceCategory,
) {
  return transactions
    .filter((transaction) => transaction.category === category)
    .reduce(
      (total, transaction) => total + BigInt(transaction.amountCents),
      BigInt(0),
    );
}

function ratioBps(value: bigint, total: bigint) {
  if (total <= BigInt(0)) return 0;

  return Number((value * BigInt(10_000)) / total);
}

function moneyTone(value: bigint): FinanceTone {
  if (value > BigInt(0)) return "positive";
  if (value < BigInt(0)) return "negative";

  return "neutral";
}

function expenseTone(category: FinanceCategory): FinanceTone {
  if (investmentCategorySet.has(category)) return "warning";
  if (category === FinanceCategory.PENALTY) return "negative";

  return "neutral";
}

function categoryLabel(category: FinanceCategory) {
  const labels: Record<FinanceCategory, string> = {
    BONUS: "Bonus",
    CAPITAL_INJECTION: "Sermaye",
    ELECTRICITY: "Elektrik",
    LEASING_DOWN_PAYMENT: "Leasing peşinat",
    LEASING_PAYMENT: "Leasing taksit",
    MACHINE_PURCHASE: "Makine yatırımı",
    MAINTENANCE: "Bakım",
    MEAL: "Yemek",
    ORDER_REVENUE: "Sipariş geliri",
    OTHER: "Diğer",
    OUTSOURCE_COST: "Fason üretim",
    OVERHEAD: "Genel gider",
    PAYROLL: "İşçilik",
    PENALTY: "Ceza",
    RENT: "Kira",
  };

  return labels[category];
}

function departmentLabel(key: string) {
  const labels: Record<string, string> = {
    cutting: "Kesim",
    dyeing: "Boya",
    embroidery: "Nakış",
    fabric_production: "Kumaş",
    ironing_packing: "Ütü-Paket",
    printing: "Baskı",
    sewing: "Dikim",
    washing: "Yıkama",
  };

  return labels[key] ?? key;
}

type ReportBuilderInput = {
  cashBalanceCents: string;
  currencyCode: FinanceReport["currencyCode"];
  factoryId: string;
  period: FinancePeriodView;
  prisma: FinanceReportClient;
};

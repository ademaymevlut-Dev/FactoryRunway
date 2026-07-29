import {
  CustomerOrderStatus,
  FactoryProductionLineStatus,
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  OutsourceJobStatus,
  Prisma,
  StaffAssignmentStatus,
  type PrismaClient,
} from "@/generated/prisma/client";

import type {
  FinanceCashCalendar,
  FinanceCashCalendarEntry,
} from "../types";

const FINANCE_PERIOD_DAYS = 22;
const CASH_CALENDAR_HORIZON_DAYS = 7;
const MAX_UPCOMING_ENTRIES = 8;
const openDueStatuses = [
  FinanceDueStatus.PENDING,
  FinanceDueStatus.PARTIAL,
  FinanceDueStatus.OVERDUE,
] as const;

type FinanceCashCalendarClient = PrismaClient | Prisma.TransactionClient;

export type FinanceCashCalendarSource = {
  amountCents: bigint;
  category: FinanceCategory;
  certainty: FinanceCashCalendarEntry["certainty"];
  day: number;
  description: string;
  direction: FinanceDirection;
  id: string;
  label: string;
};

export async function getFinanceCashCalendar(input: {
  cashBalanceCents: bigint;
  currentDay: number;
  factoryId: string;
  prisma: FinanceCashCalendarClient;
}): Promise<FinanceCashCalendar> {
  const [dues, activeOrders, activeOutsourceJobs, costProfile] =
    await Promise.all([
    input.prisma.factoryFinanceDue.findMany({
      where: {
        factoryId: input.factoryId,
        status: { in: [...openDueStatuses] },
      },
      orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        amountCents: true,
        category: true,
        description: true,
        direction: true,
        dueDay: true,
        id: true,
        settledAmountCents: true,
        sourceId: true,
      },
    }),
    input.prisma.customerOrder.findMany({
      where: {
        factoryId: input.factoryId,
        shippedDay: null,
        status: {
          in: [
            CustomerOrderStatus.ACTIVE,
            CustomerOrderStatus.IN_PRODUCTION,
            CustomerOrderStatus.READY_TO_SHIP,
            CustomerOrderStatus.PARTIALLY_SHIPPED,
            CustomerOrderStatus.LATE,
          ],
        },
        totalRevenueCents: { gt: BigInt(0) },
      },
      orderBy: [{ targetDeliveryDay: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        id: true,
        orderNo: true,
        paymentTermDays: true,
        targetDeliveryDay: true,
        totalRevenueCents: true,
      },
    }),
    input.prisma.productionOutsourceJob.findMany({
      where: {
        factoryId: input.factoryId,
        status: {
          in: [OutsourceJobStatus.IN_PROGRESS, OutsourceJobStatus.DELAYED],
        },
      },
      orderBy: [{ readyDay: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        id: true,
        readyDay: true,
        totalCostCents: true,
        productionOrder: {
          select: { productionNo: true },
        },
      },
    }),
    input.prisma.factory.findUniqueOrThrow({
      where: { id: input.factoryId },
      select: {
        productionLines: {
          where: {
            status: {
              in: [
                FactoryProductionLineStatus.IDLE,
                FactoryProductionLineStatus.RUNNING,
              ],
            },
          },
          select: {
            productionLineTemplate: {
              select: {
                areaM2: true,
                monthlyElectricityBaseCents: true,
              },
            },
          },
        },
        sector: {
          select: {
            operatingCostConfig: {
              select: {
                dailyMealPerDirectStaffCents: true,
                directStaffOverheadPerStaffCents: true,
                rentPerM2Cents: true,
              },
            },
          },
        },
        staffAssignments: {
          where: {
            quantity: { gt: 0 },
            status: StaffAssignmentStatus.ACTIVE,
          },
          select: {
            factoryProductionLineId: true,
            quantity: true,
            staffRole: {
              select: { monthlySalaryCents: true },
            },
          },
        },
      },
    }),
  ]);
  const dueSourceIds = new Set(
    dues
      .map((due) => due.sourceId)
      .filter((sourceId): sourceId is string => Boolean(sourceId)),
  );
  const sources: FinanceCashCalendarSource[] = [];

  for (const due of dues) {
    const remainingCents = due.amountCents - due.settledAmountCents;

    if (remainingCents <= BigInt(0)) continue;

    sources.push({
      amountCents: remainingCents,
      category: due.category,
      certainty: "CONFIRMED",
      day: due.dueDay,
      description:
        due.description && !due.description.startsWith("finance.")
          ? due.description
          : categoryLabel(due.category),
      direction: due.direction,
      id: `due:${due.id}`,
      label: categoryLabel(due.category),
    });
  }

  const dueCategoryDayKeys = new Set(
    dues.map((due) => `${due.category}:${due.dueDay}`),
  );
  sources.push(
    ...buildPeriodicExpenseForecastSources({
      costConfig: costProfile.sector.operatingCostConfig,
      currentDay: input.currentDay,
      productionLines: costProfile.productionLines.map((line) => ({
        areaM2: line.productionLineTemplate.areaM2,
        monthlyElectricityBaseCents:
          line.productionLineTemplate.monthlyElectricityBaseCents,
      })),
      staffAssignments: costProfile.staffAssignments.map((assignment) => ({
        factoryProductionLineId: assignment.factoryProductionLineId,
        monthlySalaryCents: assignment.staffRole.monthlySalaryCents,
        quantity: assignment.quantity,
      })),
    }).filter(
      (source) =>
        !dueCategoryDayKeys.has(`${source.category}:${source.day}`),
    ),
  );

  for (const order of activeOrders) {
    sources.push({
      amountCents: order.totalRevenueCents,
      category: FinanceCategory.ORDER_REVENUE,
      certainty: "PROJECTED",
      day: calculateProjectedOrderPaymentDay({
        currentDay: input.currentDay,
        paymentTermDays: order.paymentTermDays,
        targetDeliveryDay: order.targetDeliveryDay,
      }),
      description: order.orderNo,
      direction: FinanceDirection.INCOME,
      id: `order-forecast:${order.id}`,
      label: "Sipariş tahsilatı",
    });
  }

  for (const job of activeOutsourceJobs) {
    if (dueSourceIds.has(job.id) || job.totalCostCents <= BigInt(0)) {
      continue;
    }

    sources.push({
      amountCents: job.totalCostCents,
      category: FinanceCategory.OUTSOURCE_COST,
      certainty: "PROJECTED",
      day: job.readyDay,
      description: job.productionOrder.productionNo,
      direction: FinanceDirection.EXPENSE,
      id: `outsource-forecast:${job.id}`,
      label: "Fason üretim",
    });
  }

  return buildFinanceCashCalendar({
    cashBalanceCents: input.cashBalanceCents,
    currentDay: input.currentDay,
    sources,
  });
}

export function buildPeriodicExpenseForecastSources(input: {
  costConfig: {
    dailyMealPerDirectStaffCents: number;
    directStaffOverheadPerStaffCents: number;
    rentPerM2Cents: number;
  } | null;
  currentDay: number;
  productionLines: Array<{
    areaM2: number;
    monthlyElectricityBaseCents: number;
  }>;
  staffAssignments: Array<{
    factoryProductionLineId: string | null;
    monthlySalaryCents: number;
    quantity: number;
  }>;
}) {
  const payrollDay = getNextPayrollDay(input.currentDay);
  const payrollCents = input.staffAssignments.reduce(
    (total, assignment) =>
      total +
      BigInt(assignment.quantity) *
        BigInt(assignment.monthlySalaryCents),
    BigInt(0),
  );
  const sources: FinanceCashCalendarSource[] = [];

  if (payrollCents > BigInt(0)) {
    sources.push(
      periodicExpenseSource({
        amountCents: payrollCents,
        category: FinanceCategory.PAYROLL,
        day: payrollDay,
        label: "Maaş",
      }),
    );
  }

  if (!input.costConfig) return sources;

  const costConfig = input.costConfig;
  const operatingExpenseDay = getNextOperatingExpenseDay(
    input.currentDay,
  );
  const directStaffCount = input.staffAssignments.reduce(
    (total, assignment) =>
      assignment.factoryProductionLineId
        ? total + assignment.quantity
        : total,
    0,
  );
  const totalStaffCount = input.staffAssignments.reduce(
    (total, assignment) => total + assignment.quantity,
    0,
  );
  const operatingExpenses = [
    {
      amountCents: input.productionLines.reduce(
        (total, line) =>
          total + BigInt(line.monthlyElectricityBaseCents),
        BigInt(0),
      ),
      category: FinanceCategory.ELECTRICITY,
      label: "Elektrik",
    },
    {
      amountCents: input.productionLines.reduce(
        (total, line) =>
          total +
          BigInt(line.areaM2 * costConfig.rentPerM2Cents),
        BigInt(0),
      ),
      category: FinanceCategory.RENT,
      label: "Kira",
    },
    {
      amountCents:
        BigInt(totalStaffCount) *
        BigInt(costConfig.dailyMealPerDirectStaffCents) *
        BigInt(FINANCE_PERIOD_DAYS),
      category: FinanceCategory.MEAL,
      label: "Yemek",
    },
    {
      amountCents:
        BigInt(directStaffCount) *
        BigInt(costConfig.directStaffOverheadPerStaffCents) *
        BigInt(FINANCE_PERIOD_DAYS),
      category: FinanceCategory.OVERHEAD,
      label: "Genel gider",
    },
  ];

  for (const expense of operatingExpenses) {
    if (expense.amountCents <= BigInt(0)) continue;

    sources.push(
      periodicExpenseSource({
        ...expense,
        day: operatingExpenseDay,
      }),
    );
  }

  return sources;
}

export function calculateProjectedOrderPaymentDay(input: {
  currentDay: number;
  paymentTermDays: number;
  targetDeliveryDay: number;
}) {
  return (
    Math.max(input.currentDay, input.targetDeliveryDay) +
    Math.max(0, input.paymentTermDays)
  );
}

function periodicExpenseSource(input: {
  amountCents: bigint;
  category: FinanceCategory;
  day: number;
  label: string;
}): FinanceCashCalendarSource {
  return {
    ...input,
    certainty: "PROJECTED",
    description: `${input.day}. gün dönemsel gider`,
    direction: FinanceDirection.EXPENSE,
    id: `periodic-forecast:${input.category}:${input.day}`,
  };
}

function getNextPayrollDay(currentDay: number) {
  const normalizedDay = Math.max(1, Math.trunc(currentDay));
  const remainder = normalizedDay % FINANCE_PERIOD_DAYS;

  return remainder === 0
    ? normalizedDay
    : normalizedDay + FINANCE_PERIOD_DAYS - remainder;
}

function getNextOperatingExpenseDay(currentDay: number) {
  const normalizedDay = Math.max(1, Math.trunc(currentDay));

  if (normalizedDay <= 10) return 10;

  return (
    10 +
    Math.ceil((normalizedDay - 10) / FINANCE_PERIOD_DAYS) *
      FINANCE_PERIOD_DAYS
  );
}

export function buildFinanceCashCalendar(input: {
  cashBalanceCents: bigint;
  currentDay: number;
  horizonDays?: number;
  sources: FinanceCashCalendarSource[];
}): FinanceCashCalendar {
  const horizonDays = Math.max(
    1,
    Math.trunc(input.horizonDays ?? CASH_CALENDAR_HORIZON_DAYS),
  );
  const endDay = input.currentDay + horizonDays;
  const normalizedEntries = input.sources
    .filter((source) => source.amountCents > BigInt(0))
    .map((source) => normalizeEntry(source, input.currentDay));
  const forecastEntries = normalizedEntries.filter(
    (entry) => effectiveDay(entry, input.currentDay) <= endDay,
  );
  const incomingCents = sumDirection(forecastEntries, "INCOME");
  const outgoingCents = sumDirection(forecastEntries, "EXPENSE");
  const netCents = incomingCents - outgoingCents;
  let projectedBalanceCents = input.cashBalanceCents;
  let lowestProjectedBalanceCents = input.cashBalanceCents;
  let shortfallDay: number | null = null;
  const days = [];

  for (let day = input.currentDay; day <= endDay; day += 1) {
    const entries = forecastEntries.filter(
      (entry) => effectiveDay(entry, input.currentDay) === day,
    );
    const dayIncomeCents = sumDirection(entries, "INCOME");
    const dayExpenseCents = sumDirection(entries, "EXPENSE");
    const dayNetCents = dayIncomeCents - dayExpenseCents;
    projectedBalanceCents += dayNetCents;
    if (projectedBalanceCents < lowestProjectedBalanceCents) {
      lowestProjectedBalanceCents = projectedBalanceCents;
    }
    if (projectedBalanceCents < BigInt(0) && shortfallDay === null) {
      shortfallDay = day;
    }
    days.push({
      day,
      expenseCents: dayExpenseCents.toString(),
      incomeCents: dayIncomeCents.toString(),
      netCents: dayNetCents.toString(),
      projectedBalanceCents: projectedBalanceCents.toString(),
    });
  }

  const incomeEntries = normalizedEntries
    .filter((entry) => entry.direction === "INCOME")
    .sort((first, second) =>
      compareCalendarEntries(first, second, input.currentDay),
    );
  const firstIncomeEffectiveDay = incomeEntries[0]
    ? effectiveDay(incomeEntries[0], input.currentDay)
    : null;
  const firstIncomeEntries =
    firstIncomeEffectiveDay === null
      ? []
      : incomeEntries.filter(
          (entry) =>
            effectiveDay(entry, input.currentDay) ===
            firstIncomeEffectiveDay,
        );
  const firstIncomeCents = firstIncomeEntries.reduce(
    (total, entry) => total + BigInt(entry.amountCents),
    BigInt(0),
  );

  return {
    currentDay: input.currentDay,
    days,
    endDay,
    estimatedEndBalanceCents: projectedBalanceCents.toString(),
    firstIncome:
      firstIncomeEffectiveDay === null
        ? null
        : {
            amountCents: firstIncomeCents.toString(),
            certainty: firstIncomeEntries.some(
              (entry) => entry.certainty === "CONFIRMED",
            )
              ? "CONFIRMED"
              : "PROJECTED",
            day: firstIncomeEffectiveDay,
          },
    incomingCents: incomingCents.toString(),
    lowestProjectedBalanceCents: lowestProjectedBalanceCents.toString(),
    netCents: netCents.toString(),
    outgoingCents: outgoingCents.toString(),
    risk:
      shortfallDay !== null
        ? "SHORTFALL"
        : netCents < BigInt(0)
          ? "TIGHT"
          : forecastEntries.length > 0
            ? "POSITIVE"
            : "NEUTRAL",
    shortfallDay,
    upcomingEntries: normalizedEntries
      .sort((first, second) =>
        compareCalendarEntries(first, second, input.currentDay),
      )
      .slice(0, MAX_UPCOMING_ENTRIES),
  };
}

function normalizeEntry(
  source: FinanceCashCalendarSource,
  currentDay: number,
): FinanceCashCalendarEntry {
  return {
    amountCents: source.amountCents.toString(),
    category: source.category,
    certainty: source.certainty,
    day: source.day,
    description: source.description,
    direction: source.direction,
    id: source.id,
    label: source.label,
    timing:
      source.day < currentDay
        ? "OVERDUE"
        : source.day === currentDay
          ? "TODAY"
          : "UPCOMING",
  };
}

function compareCalendarEntries(
  first: FinanceCashCalendarEntry,
  second: FinanceCashCalendarEntry,
  currentDay: number,
) {
  return (
    effectiveDay(first, currentDay) - effectiveDay(second, currentDay) ||
    certaintyPriority(first.certainty) - certaintyPriority(second.certainty) ||
    directionPriority(first.direction) - directionPriority(second.direction) ||
    first.id.localeCompare(second.id)
  );
}

function effectiveDay(entry: FinanceCashCalendarEntry, currentDay: number) {
  return Math.max(currentDay, entry.day);
}

function certaintyPriority(
  certainty: FinanceCashCalendarEntry["certainty"],
) {
  return certainty === "CONFIRMED" ? 0 : 1;
}

function directionPriority(
  direction: FinanceCashCalendarEntry["direction"],
) {
  return direction === "INCOME" ? 0 : 1;
}

function sumDirection(
  entries: FinanceCashCalendarEntry[],
  direction: FinanceCashCalendarEntry["direction"],
) {
  return entries
    .filter((entry) => entry.direction === direction)
    .reduce(
      (total, entry) => total + BigInt(entry.amountCents),
      BigInt(0),
    );
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
    ORDER_REVENUE: "Sipariş tahsilatı",
    OTHER: "Diğer",
    OUTSOURCE_COST: "Fason üretim",
    OVERHEAD: "Genel gider",
    PAYROLL: "İşçilik",
    PENALTY: "Ceza",
    RENT: "Kira",
  };

  return labels[category];
}

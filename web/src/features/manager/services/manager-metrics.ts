import { FactoryProductionLineStatus } from "@/generated/prisma/enums";

const bottleneckWorkloadDayThreshold = 3;
const urgentBottleneckWorkloadDayThreshold = 2;
const lowCashFallbackReserveCents = BigInt(50_000);

export type ManagerInvestmentInput = {
  departments: Array<{
    id: string;
    templates: Array<{
      departmentId: string;
      leasingOffers: Array<{
        downPaymentCents: string;
      }>;
      purchaseCostCents: string;
    }>;
  }>;
};

export type ManagerProductionQueuesInput = {
  queues: Array<{
    activeLineCount: number;
    departmentId: string;
    departmentKey: string;
    effectiveDailyPointCapacity: number;
    items: Array<{
      deliveryTone: "danger" | "info" | "success" | "warning";
      remainingWorkPoints: number;
    }>;
    label: string;
    outsourceCandidates: unknown[];
    summary: {
      queueCount: number;
    };
  }>;
};

export type ManagerMapLineInput = {
  assignedStaff: number;
  departmentId: string;
  departmentKey: string;
  departmentName: string;
  hasActiveLeasingContract: boolean;
  idealStaff: number;
  kind: "productionLine";
  lineId: string;
  status: FactoryProductionLineStatus;
  title: string;
};

export type ManagerMapSectionsInput = Array<{
  items: Array<ManagerMapLineInput | { kind: string }>;
}>;

export type ManagerInvestmentMetrics = {
  affordableLeaseOfferCount: number;
  affordablePurchaseCount: number;
  availableTemplateCount: number;
  hasAffordableInvestmentOption: boolean;
  investmentDepartmentIds: string[];
  lowestLeaseDownPaymentCents: string | null;
  lowestPurchaseCostCents: string | null;
};

export type ManagerBottleneckMetric = {
  activeLineCount: number;
  canInvest: boolean;
  departmentId: string;
  departmentKey: string;
  departmentName: string;
  effectiveDailyPointCapacity: number;
  hasOutsourceCandidate: boolean;
  queueCount: number;
  totalRemainingWorkPoints: number;
  urgentItemCount: number;
  workloadDays: number;
  workloadDaysLabel: string;
};

export type ManagerStaffShortageMetric = {
  assignedStaff: number;
  coverageBps: number;
  departmentId: string;
  departmentKey: string;
  departmentName: string;
  idealStaff: number;
  lineId: string;
  lineTitle: string;
  missingStaff: number;
};

export type ManagerFinancialMetrics = {
  cashBalanceCents: string;
  investmentBlockedByCash: boolean;
  leasedLineCount: number;
  lowCash: boolean;
  reserveFloorCents: string;
};

export type ManagerMetrics = {
  activeOrderCount: number;
  activeProductionOrderCount: number;
  bottlenecks: ManagerBottleneckMetric[];
  cashBalanceCents: string;
  currentDay: number;
  finance: ManagerFinancialMetrics;
  investment: ManagerInvestmentMetrics;
  lateOrderCount: number;
  staffShortages: ManagerStaffShortageMetric[];
};

export type BuildManagerMetricsInput = {
  activeOrderCount: number;
  activeProductionOrderCount: number;
  cashBalanceCents: string;
  currentDay: number;
  investment: ManagerInvestmentInput;
  lateOrderCount: number;
  mapSections: ManagerMapSectionsInput;
  productionQueues: ManagerProductionQueuesInput;
};

export function buildManagerMetrics(input: BuildManagerMetricsInput): ManagerMetrics {
  const investment = summarizeInvestmentOptions(input.investment, input.cashBalanceCents);
  const staffShortages = buildStaffShortages(input.mapSections);
  const leasedLineCount = countLeasedLines(input.mapSections);

  return {
    activeOrderCount: input.activeOrderCount,
    activeProductionOrderCount: input.activeProductionOrderCount,
    bottlenecks: buildBottlenecks({
      investmentDepartmentIds: investment.investmentDepartmentIds,
      productionQueues: input.productionQueues,
    }),
    cashBalanceCents: input.cashBalanceCents,
    currentDay: input.currentDay,
    finance: buildFinancialMetrics({
      cashBalanceCents: input.cashBalanceCents,
      investment,
      leasedLineCount,
    }),
    investment,
    lateOrderCount: input.lateOrderCount,
    staffShortages,
  };
}

function summarizeInvestmentOptions(
  investment: ManagerInvestmentInput,
  cashBalanceCentsValue: string,
): ManagerInvestmentMetrics {
  const cashBalanceCents = toBigInt(cashBalanceCentsValue);
  const investmentDepartmentIds = new Set<string>();
  let affordableLeaseOfferCount = 0;
  let affordablePurchaseCount = 0;
  let availableTemplateCount = 0;
  let lowestLeaseDownPaymentCents: bigint | null = null;
  let lowestPurchaseCostCents: bigint | null = null;

  for (const department of investment.departments) {
    for (const template of department.templates) {
      availableTemplateCount += 1;
      investmentDepartmentIds.add(template.departmentId || department.id);

      const purchaseCostCents = toBigInt(template.purchaseCostCents);

      if (
        lowestPurchaseCostCents === null ||
        purchaseCostCents < lowestPurchaseCostCents
      ) {
        lowestPurchaseCostCents = purchaseCostCents;
      }
      if (purchaseCostCents <= cashBalanceCents) {
        affordablePurchaseCount += 1;
      }

      for (const offer of template.leasingOffers) {
        const downPaymentCents = toBigInt(offer.downPaymentCents);

        if (
          lowestLeaseDownPaymentCents === null ||
          downPaymentCents < lowestLeaseDownPaymentCents
        ) {
          lowestLeaseDownPaymentCents = downPaymentCents;
        }
        if (downPaymentCents <= cashBalanceCents) {
          affordableLeaseOfferCount += 1;
        }
      }
    }
  }

  return {
    affordableLeaseOfferCount,
    affordablePurchaseCount,
    availableTemplateCount,
    hasAffordableInvestmentOption:
      affordableLeaseOfferCount > 0 || affordablePurchaseCount > 0,
    investmentDepartmentIds: Array.from(investmentDepartmentIds),
    lowestLeaseDownPaymentCents: lowestLeaseDownPaymentCents?.toString() ?? null,
    lowestPurchaseCostCents: lowestPurchaseCostCents?.toString() ?? null,
  };
}

function buildBottlenecks(input: {
  investmentDepartmentIds: string[];
  productionQueues: ManagerProductionQueuesInput;
}) {
  const investmentDepartmentIds = new Set(input.investmentDepartmentIds);

  return input.productionQueues.queues
    .map((queue): ManagerBottleneckMetric => {
      const totalRemainingWorkPoints = queue.items.reduce(
        (sum, item) => sum + Math.max(0, item.remainingWorkPoints),
        0,
      );
      const effectiveDailyPointCapacity = Math.max(0, queue.effectiveDailyPointCapacity);
      const workloadDays =
        effectiveDailyPointCapacity > 0
          ? totalRemainingWorkPoints / effectiveDailyPointCapacity
          : totalRemainingWorkPoints > 0
            ? Number.POSITIVE_INFINITY
            : 0;
      const urgentItemCount = queue.items.filter(
        (item) => item.deliveryTone === "danger" || item.deliveryTone === "warning",
      ).length;

      return {
        activeLineCount: queue.activeLineCount,
        canInvest: investmentDepartmentIds.has(queue.departmentId),
        departmentId: queue.departmentId,
        departmentKey: queue.departmentKey,
        departmentName: queue.label,
        effectiveDailyPointCapacity,
        hasOutsourceCandidate: queue.outsourceCandidates.length > 0,
        queueCount: queue.summary.queueCount,
        totalRemainingWorkPoints,
        urgentItemCount,
        workloadDays,
        workloadDaysLabel: formatWorkloadDays(workloadDays),
      };
    })
    .filter((metric) => {
      if (metric.queueCount <= 0 || metric.totalRemainingWorkPoints <= 0) {
        return false;
      }

      return (
        metric.workloadDays >= bottleneckWorkloadDayThreshold ||
        (metric.urgentItemCount > 0 &&
          metric.workloadDays >= urgentBottleneckWorkloadDayThreshold)
      );
    })
    .sort((left, right) => {
      if (!Number.isFinite(left.workloadDays)) return -1;
      if (!Number.isFinite(right.workloadDays)) return 1;

      const workloadDifference = right.workloadDays - left.workloadDays;

      if (workloadDifference !== 0) {
        return workloadDifference;
      }

      return right.urgentItemCount - left.urgentItemCount;
    });
}

function buildStaffShortages(mapSections: ManagerMapSectionsInput) {
  const shortages: ManagerStaffShortageMetric[] = [];

  for (const line of getProductionLines(mapSections)) {
    if (
      line.status === FactoryProductionLineStatus.DISABLED ||
      line.idealStaff <= 0 ||
      line.assignedStaff >= line.idealStaff
    ) {
      continue;
    }

    const coverageBps = Math.round((line.assignedStaff / line.idealStaff) * 10_000);

    shortages.push({
      assignedStaff: line.assignedStaff,
      coverageBps,
      departmentId: line.departmentId,
      departmentKey: line.departmentKey,
      departmentName: line.departmentName,
      idealStaff: line.idealStaff,
      lineId: line.lineId,
      lineTitle: line.title,
      missingStaff: line.idealStaff - line.assignedStaff,
    });
  }

  return shortages.sort((left, right) => {
    const coverageDifference = left.coverageBps - right.coverageBps;

    if (coverageDifference !== 0) return coverageDifference;

    return right.missingStaff - left.missingStaff;
  });
}

function buildFinancialMetrics(input: {
  cashBalanceCents: string;
  investment: ManagerInvestmentMetrics;
  leasedLineCount: number;
}): ManagerFinancialMetrics {
  const cashBalanceCents = toBigInt(input.cashBalanceCents);
  const reserveFloorCents = getReserveFloorCents(input.investment);

  return {
    cashBalanceCents: input.cashBalanceCents,
    investmentBlockedByCash:
      input.investment.availableTemplateCount > 0 &&
      !input.investment.hasAffordableInvestmentOption,
    leasedLineCount: input.leasedLineCount,
    lowCash: cashBalanceCents < reserveFloorCents,
    reserveFloorCents: reserveFloorCents.toString(),
  };
}

function getReserveFloorCents(investment: ManagerInvestmentMetrics) {
  const lowestLeaseDownPaymentCents =
    investment.lowestLeaseDownPaymentCents !== null
      ? toBigInt(investment.lowestLeaseDownPaymentCents)
      : null;

  if (lowestLeaseDownPaymentCents !== null && lowestLeaseDownPaymentCents > BigInt(0)) {
    return lowestLeaseDownPaymentCents;
  }

  const lowestPurchaseCostCents =
    investment.lowestPurchaseCostCents !== null
      ? toBigInt(investment.lowestPurchaseCostCents)
      : null;

  if (lowestPurchaseCostCents !== null && lowestPurchaseCostCents > BigInt(0)) {
    return lowestPurchaseCostCents / BigInt(4);
  }

  return lowCashFallbackReserveCents;
}

function countLeasedLines(mapSections: ManagerMapSectionsInput) {
  return getProductionLines(mapSections).filter(
    (line) => line.hasActiveLeasingContract,
  ).length;
}

function getProductionLines(mapSections: ManagerMapSectionsInput) {
  return mapSections
    .flatMap((section) => section.items)
    .filter(isProductionLine);
}

function isProductionLine(
  item: ManagerMapSectionsInput[number]["items"][number],
): item is ManagerMapLineInput {
  return item.kind === "productionLine";
}

function formatWorkloadDays(workloadDays: number) {
  if (!Number.isFinite(workloadDays)) return "kapasite yok";

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: workloadDays >= 10 ? 0 : 1,
  }).format(workloadDays)} gün`;
}

function toBigInt(value: string) {
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

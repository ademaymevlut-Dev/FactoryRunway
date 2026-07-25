import {
  TaskObjectiveType,
  TaskProgressStatus,
} from "@/generated/prisma/enums";
import type { TasksSnapshot, TaskSnapshot } from "@/features/tasks/types";
import { normalizeLocale, type SupportedLocale } from "@/lib/i18n/locales";

import {
  managerCopy,
  type ManagerRecommendationCopy,
} from "../manager-copy";
import type { ManagerRecommendation } from "../types";
import {
  buildManagerMetrics,
  type BuildManagerMetricsInput,
  type ManagerBottleneckMetric,
  type ManagerInvestmentMetrics,
  type ManagerMetrics,
  type ManagerStaffShortageMetric,
} from "./manager-metrics";

const managerRecommendationLimit = 3;

export type BuildManagerRecommendationsInput = BuildManagerMetricsInput & {
  locale?: SupportedLocale;
  tasks: TasksSnapshot;
};

export function buildManagerRecommendations(
  input: BuildManagerRecommendationsInput,
): ManagerRecommendation[] {
  const locale = normalizeLocale(input.locale);
  const copy = managerCopy[locale].recommendations;
  const metrics = buildManagerMetrics({ ...input, locale });

  return [
    evaluateFinancialRisk(metrics, input.tasks, copy),
    evaluateBottleneck(metrics, copy),
    evaluateInvestmentOpportunity(metrics, input.tasks, copy),
    evaluateStaffShortage(metrics, copy),
  ]
    .filter(isManagerRecommendation)
    .sort((left, right) => right.priority - left.priority)
    .slice(0, managerRecommendationLimit);
}

function evaluateBottleneck(
  metrics: ManagerMetrics,
  copy: ManagerRecommendationCopy,
): ManagerRecommendation | null {
  const bottleneck = metrics.bottlenecks[0];

  if (!bottleneck) return null;

  const isCritical =
    bottleneck.workloadDays >= 5 || !Number.isFinite(bottleneck.workloadDays);
  const actionHint = copy.bottleneckActionHint(
    bottleneck.hasOutsourceCandidate,
  );

  return {
    body: copy.bottleneckBody(
      bottleneck.departmentName,
      bottleneck.workloadDaysLabel,
      actionHint,
    ),
    category: "OPERATIONS",
    cta: {
      kind: "PANEL",
      label: copy.openQueue,
      panel: "departmentQueue",
      payload: { departmentId: bottleneck.departmentId },
    },
    id: `manager:bottleneck:${bottleneck.departmentId}`,
    meta: buildBottleneckMeta(bottleneck),
    priority: isCritical ? 88 : 79,
    severity: isCritical ? "CRITICAL" : "WARNING",
    title: copy.bottleneckTitle(bottleneck.departmentName),
  };
}

function evaluateInvestmentOpportunity(
  metrics: ManagerMetrics,
  tasks: TasksSnapshot,
  copy: ManagerRecommendationCopy,
): ManagerRecommendation | null {
  const activeInvestmentTask = getActiveInvestmentTask(tasks);

  if (activeInvestmentTask?.objectiveType === TaskObjectiveType.OPEN_INVESTMENT_PANEL) {
    return {
      body: copy.investmentReviewBody,
      category: "INVESTMENT",
      cta: {
        kind: "PANEL",
        label: copy.openInvestments,
        panel: "investment",
      },
      id: "manager:investment-review",
      meta: buildInvestmentMeta(metrics.investment, {
        activeTaskKey: activeInvestmentTask.key,
        currentDay: metrics.currentDay,
      }),
      priority: 80,
      severity: "OPPORTUNITY",
      title: copy.investmentReviewTitle,
    };
  }

  if (activeInvestmentTask?.objectiveType === TaskObjectiveType.ACQUIRE_PRODUCTION_LINE) {
    if (!metrics.investment.hasAffordableInvestmentOption) return null;

    return {
      body: copy.acquisitionBody(
        getInvestmentAcquisitionHint(metrics.investment, copy),
      ),
      category: "INVESTMENT",
      cta: {
        kind: "PANEL",
        label: copy.investInLine,
        panel: "investment",
      },
      id: "manager:first-production-line",
      meta: buildInvestmentMeta(metrics.investment, {
        activeTaskKey: activeInvestmentTask.key,
        currentDay: metrics.currentDay,
      }),
      priority: 82,
      severity: "OPPORTUNITY",
      title: copy.acquisitionTitle,
    };
  }

  const bottleneck = metrics.bottlenecks.find((metric) => metric.canInvest);

  if (
    !bottleneck ||
    !metrics.investment.hasAffordableInvestmentOption ||
    metrics.activeProductionOrderCount <= 0 ||
    bottleneck.workloadDays < 4
  ) {
    return null;
  }

  return {
    body: copy.investmentOpportunityBody(bottleneck.departmentName),
    category: "INVESTMENT",
    cta: {
      kind: "PANEL",
      label: copy.reviewInvestment,
      panel: "investment",
      payload: { departmentId: bottleneck.departmentId },
    },
    id: `manager:investment-opportunity:${bottleneck.departmentId}`,
    meta: {
      ...buildInvestmentMeta(metrics.investment, {
        activeTaskKey: null,
        currentDay: metrics.currentDay,
      }),
      bottleneckDepartmentId: bottleneck.departmentId,
      bottleneckWorkloadDays: roundFiniteNumber(bottleneck.workloadDays),
    },
    priority: 76,
    severity: "OPPORTUNITY",
    title: copy.investmentOpportunityTitle,
  };
}

function evaluateStaffShortage(
  metrics: ManagerMetrics,
  copy: ManagerRecommendationCopy,
): ManagerRecommendation | null {
  const shortage = metrics.staffShortages[0];

  if (!shortage) return null;

  return {
    body: copy.staffShortageBody(
      shortage.lineTitle,
      shortage.assignedStaff,
      shortage.idealStaff,
    ),
    category: "OPERATIONS",
    cta: {
      kind: "PANEL",
      label: copy.openStaff,
      panel: "staff",
    },
    id: `manager:staff-shortage:${shortage.lineId}`,
    meta: buildStaffShortageMeta(shortage),
    priority: shortage.coverageBps < 6_000 ? 86 : 78,
    severity: shortage.coverageBps < 6_000 ? "CRITICAL" : "WARNING",
    title: copy.staffShortageTitle,
  };
}

function evaluateFinancialRisk(
  metrics: ManagerMetrics,
  tasks: TasksSnapshot,
  copy: ManagerRecommendationCopy,
): ManagerRecommendation | null {
  const activeInvestmentTask = getActiveInvestmentTask(tasks);

  if (
    metrics.finance.investmentBlockedByCash &&
    activeInvestmentTask?.objectiveType === TaskObjectiveType.ACQUIRE_PRODUCTION_LINE
  ) {
    return {
      body: copy.investmentCashRiskBody,
      category: "FINANCE",
      cta: {
        kind: "PANEL",
        label: copy.openFinance,
        panel: "finance",
      },
      id: "manager:financial-risk:investment-cash",
      meta: buildFinancialMeta(metrics),
      priority: 92,
      severity: "WARNING",
      title: copy.investmentCashRiskTitle,
    };
  }

  if (metrics.lateOrderCount > 0 && metrics.finance.lowCash) {
    return {
      body: copy.lateOrdersCashRiskBody(metrics.lateOrderCount),
      category: "FINANCE",
      cta: {
        kind: "PANEL",
        label: copy.openFinance,
        panel: "finance",
      },
      id: "manager:financial-risk:late-orders",
      meta: buildFinancialMeta(metrics),
      priority: 90,
      severity: "CRITICAL",
      title: copy.lateOrdersCashRiskTitle,
    };
  }

  if (metrics.finance.leasedLineCount > 0 && metrics.finance.lowCash) {
    return {
      body: copy.leasingReserveBody,
      category: "FINANCE",
      cta: {
        kind: "PANEL",
        label: copy.openFinance,
        panel: "finance",
      },
      id: "manager:financial-risk:leasing-reserve",
      meta: buildFinancialMeta(metrics),
      priority: 84,
      severity: "WARNING",
      title: copy.leasingReserveTitle,
    };
  }

  return null;
}

function getActiveInvestmentTask(tasks: TasksSnapshot): TaskSnapshot | null {
  if (isActiveInvestmentTask(tasks.activeStoryTask)) {
    return tasks.activeStoryTask;
  }

  return tasks.activeTasks.find(isActiveInvestmentTask) ?? null;
}

function isActiveInvestmentTask(task: TaskSnapshot | null): task is TaskSnapshot {
  if (!task || task.status !== TaskProgressStatus.ACTIVE) return false;

  return (
    task.objectiveType === TaskObjectiveType.OPEN_INVESTMENT_PANEL ||
    task.objectiveType === TaskObjectiveType.ACQUIRE_PRODUCTION_LINE
  );
}

function getInvestmentAcquisitionHint(
  summary: ManagerInvestmentMetrics,
  copy: ManagerRecommendationCopy,
) {
  if (summary.affordablePurchaseCount > 0) {
    return copy.acquisitionHintPurchase;
  }

  if (summary.affordableLeaseOfferCount > 0) {
    return copy.acquisitionHintLease;
  }

  return copy.acquisitionHintTightCash;
}

function isManagerRecommendation(
  recommendation: ManagerRecommendation | null,
): recommendation is ManagerRecommendation {
  return recommendation !== null;
}

function buildInvestmentMeta(
  investment: ManagerInvestmentMetrics,
  context: {
    activeTaskKey: string | null;
    currentDay: number;
  },
) {
  return {
    activeTaskKey: context.activeTaskKey,
    affordableLeaseOfferCount: investment.affordableLeaseOfferCount,
    affordablePurchaseCount: investment.affordablePurchaseCount,
    availableTemplateCount: investment.availableTemplateCount,
    currentDay: context.currentDay,
    lowestLeaseDownPaymentCents: investment.lowestLeaseDownPaymentCents,
    lowestPurchaseCostCents: investment.lowestPurchaseCostCents,
  };
}

function buildBottleneckMeta(bottleneck: ManagerBottleneckMetric) {
  return {
    activeLineCount: bottleneck.activeLineCount,
    canInvest: bottleneck.canInvest,
    departmentId: bottleneck.departmentId,
    departmentKey: bottleneck.departmentKey,
    effectiveDailyPointCapacity: bottleneck.effectiveDailyPointCapacity,
    hasOutsourceCandidate: bottleneck.hasOutsourceCandidate,
    queueCount: bottleneck.queueCount,
    totalRemainingWorkPoints: bottleneck.totalRemainingWorkPoints,
    urgentItemCount: bottleneck.urgentItemCount,
    workloadDays: roundFiniteNumber(bottleneck.workloadDays),
  };
}

function buildStaffShortageMeta(shortage: ManagerStaffShortageMetric) {
  return {
    assignedStaff: shortage.assignedStaff,
    coverageBps: shortage.coverageBps,
    departmentId: shortage.departmentId,
    departmentKey: shortage.departmentKey,
    idealStaff: shortage.idealStaff,
    lineId: shortage.lineId,
    missingStaff: shortage.missingStaff,
  };
}

function buildFinancialMeta(metrics: ManagerMetrics) {
  return {
    activeOrderCount: metrics.activeOrderCount,
    activeProductionOrderCount: metrics.activeProductionOrderCount,
    cashBalanceCents: metrics.cashBalanceCents,
    investmentBlockedByCash: metrics.finance.investmentBlockedByCash,
    lateOrderCount: metrics.lateOrderCount,
    leasedLineCount: metrics.finance.leasedLineCount,
    reserveFloorCents: metrics.finance.reserveFloorCents,
  };
}

function roundFiniteNumber(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

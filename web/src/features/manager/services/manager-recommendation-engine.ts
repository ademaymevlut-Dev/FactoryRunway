import {
  TaskObjectiveType,
  TaskProgressStatus,
} from "@/generated/prisma/enums";
import type { TasksSnapshot, TaskSnapshot } from "@/features/tasks/types";

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
  tasks: TasksSnapshot;
};

export function buildManagerRecommendations(
  input: BuildManagerRecommendationsInput,
): ManagerRecommendation[] {
  const metrics = buildManagerMetrics(input);

  return [
    evaluateFinancialRisk(metrics, input.tasks),
    evaluateBottleneck(metrics),
    evaluateInvestmentOpportunity(metrics, input.tasks),
    evaluateStaffShortage(metrics),
  ]
    .filter(isManagerRecommendation)
    .sort((left, right) => right.priority - left.priority)
    .slice(0, managerRecommendationLimit);
}

function evaluateBottleneck(metrics: ManagerMetrics): ManagerRecommendation | null {
  const bottleneck = metrics.bottlenecks[0];

  if (!bottleneck) return null;

  const isCritical =
    bottleneck.workloadDays >= 5 || !Number.isFinite(bottleneck.workloadDays);
  const actionHint = bottleneck.hasOutsourceCandidate
    ? "Fason adayı işler de var; kuyruk önceliğiyle birlikte dış kaynak seçeneğini değerlendirebiliriz."
    : "Önce kuyruk önceliğini düzenleyelim; gerekiyorsa yatırım tarafına geçeriz.";

  return {
    body: `${bottleneck.departmentName} departmanı ${bottleneck.workloadDaysLabel} iş yükü taşıyor. ${actionHint}`,
    category: "OPERATIONS",
    cta: {
      kind: "PANEL",
      label: "Kuyruğu Aç",
      panel: "departmentQueue",
      payload: { departmentId: bottleneck.departmentId },
    },
    id: `manager:bottleneck:${bottleneck.departmentId}`,
    meta: buildBottleneckMeta(bottleneck),
    priority: isCritical ? 88 : 79,
    severity: isCritical ? "CRITICAL" : "WARNING",
    title: `Müdür: ${bottleneck.departmentName} sıkışıyor`,
  };
}

function evaluateInvestmentOpportunity(
  metrics: ManagerMetrics,
  tasks: TasksSnapshot,
): ManagerRecommendation | null {
  const activeInvestmentTask = getActiveInvestmentTask(tasks);

  if (activeInvestmentTask?.objectiveType === TaskObjectiveType.OPEN_INVESTMENT_PANEL) {
    return {
      body:
        "Sipariş akışını gördük. Şimdi yatırımlar panelini açıp hangi bölümde kapasite büyütebileceğimizi inceleyelim.",
      category: "INVESTMENT",
      cta: {
        kind: "PANEL",
        label: "Yatırımları Aç",
        panel: "investment",
      },
      id: "manager:investment-review",
      meta: buildInvestmentMeta(metrics.investment, {
        activeTaskKey: activeInvestmentTask.key,
        currentDay: metrics.currentDay,
      }),
      priority: 80,
      severity: "OPPORTUNITY",
      title: "Müdür: büyüme fırsatı var",
    };
  }

  if (activeInvestmentTask?.objectiveType === TaskObjectiveType.ACQUIRE_PRODUCTION_LINE) {
    if (!metrics.investment.hasAffordableInvestmentOption) return null;

    return {
      body: `Yeni üretim hattı eklemek fabrikayı büyütmenin ilk gerçek adımı. ${getInvestmentAcquisitionHint(metrics.investment)}`,
      category: "INVESTMENT",
      cta: {
        kind: "PANEL",
        label: "Hat Yatırımı Yap",
        panel: "investment",
      },
      id: "manager:first-production-line",
      meta: buildInvestmentMeta(metrics.investment, {
        activeTaskKey: activeInvestmentTask.key,
        currentDay: metrics.currentDay,
      }),
      priority: 82,
      severity: "OPPORTUNITY",
      title: "Müdür: ilk yatırım hamlesi hazır",
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
    body: `${bottleneck.departmentName} yükü büyüyor. Nakit uygunken bu departman için yeni hat seçeneğini incelemek mantıklı olabilir.`,
    category: "INVESTMENT",
    cta: {
      kind: "PANEL",
      label: "Yatırımı İncele",
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
    title: "Müdür: kapasite yatırımı düşünülebilir",
  };
}

function evaluateStaffShortage(metrics: ManagerMetrics): ManagerRecommendation | null {
  const shortage = metrics.staffShortages[0];

  if (!shortage) return null;

  return {
    body: `${shortage.lineTitle} ${shortage.assignedStaff}/${shortage.idealStaff} personelle çalışıyor. Eksik ekip kapasiteyi aşağı çekebilir.`,
    category: "OPERATIONS",
    cta: {
      kind: "PANEL",
      label: "Personeli Aç",
      panel: "staff",
    },
    id: `manager:staff-shortage:${shortage.lineId}`,
    meta: buildStaffShortageMeta(shortage),
    priority: shortage.coverageBps < 6_000 ? 86 : 78,
    severity: shortage.coverageBps < 6_000 ? "CRITICAL" : "WARNING",
    title: "Müdür: ekip kapasitesi eksik",
  };
}

function evaluateFinancialRisk(
  metrics: ManagerMetrics,
  tasks: TasksSnapshot,
): ManagerRecommendation | null {
  const activeInvestmentTask = getActiveInvestmentTask(tasks);

  if (
    metrics.finance.investmentBlockedByCash &&
    activeInvestmentTask?.objectiveType === TaskObjectiveType.ACQUIRE_PRODUCTION_LINE
  ) {
    return {
      body:
        "Yeni hat için iştah doğru ama kasa henüz peşinat seviyesine gelmemiş görünüyor. Önce tahsilat ve nakit durumunu kontrol edelim.",
      category: "FINANCE",
      cta: {
        kind: "PANEL",
        label: "Finansı Aç",
        panel: "finance",
      },
      id: "manager:financial-risk:investment-cash",
      meta: buildFinancialMeta(metrics),
      priority: 92,
      severity: "WARNING",
      title: "Müdür: yatırım için nakit zayıf",
    };
  }

  if (metrics.lateOrderCount > 0 && metrics.finance.lowCash) {
    return {
      body: `${metrics.lateOrderCount} geciken sipariş varken kasa rezervi zayıf. Ceza ve tahsilat etkisini finans panelinden izleyelim.`,
      category: "FINANCE",
      cta: {
        kind: "PANEL",
        label: "Finansı Aç",
        panel: "finance",
      },
      id: "manager:financial-risk:late-orders",
      meta: buildFinancialMeta(metrics),
      priority: 90,
      severity: "CRITICAL",
      title: "Müdür: finansal risk artıyor",
    };
  }

  if (metrics.finance.leasedLineCount > 0 && metrics.finance.lowCash) {
    return {
      body:
        "Kiralı hat ödemeleri varken nakit rezervi inceliyor. Yeni harcama öncesi dönem giderlerini kontrol etmek iyi olur.",
      category: "FINANCE",
      cta: {
        kind: "PANEL",
        label: "Finansı Aç",
        panel: "finance",
      },
      id: "manager:financial-risk:leasing-reserve",
      meta: buildFinancialMeta(metrics),
      priority: 84,
      severity: "WARNING",
      title: "Müdür: leasing rezervini koruyalım",
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

function getInvestmentAcquisitionHint(summary: ManagerInvestmentMetrics) {
  if (summary.affordablePurchaseCount > 0) {
    return "Kasada en az bir hattı satın alabilecek güç görünüyor.";
  }

  if (summary.affordableLeaseOfferCount > 0) {
    return "Satın alma ağır gelirse kiralama seçeneği iyi bir geçiş hamlesi olabilir.";
  }

  return "Nakit sıkıysa önce maliyeti görüp hedef nakdi planlayalım.";
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

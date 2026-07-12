export type ProductionSimulationActivationMode = "all" | "staggered";

export type ProductionSimulationStepInput = {
  routeProgressId: string;
  productRouteStepId: string;
  departmentId: string;
  productionLineId: string;
  productionLineTemplateId: string;
  lineNumber: number;
  lineSortOrder: number;
  templateDailyPointCapacity: number;
  conditionBps: number;
  workloadPointsPerUnit: number;
  setupPoints: number;
  plannedQuantity: number;
  inputReadyQuantity: number;
  completedQuantity: number;
};

export type ProductionSimulationLineStatus = "PRODUCED" | "IDLE" | "BLOCKED_NO_INPUT";
export type ProductionSimulationRouteStatus = "COMPLETED" | "IN_PROGRESS" | "READY" | "WAITING_INPUT";

export type ProductionSimulationDailyResult = {
  dayIndex: number;
  gameDay: number;
  isActive: boolean;
  status: ProductionSimulationLineStatus;
  inputReadyQuantity: number;
  producedQuantity: number;
  templateDailyPointCapacity: number;
  effectivePointCapacity: number;
  setupPointsUsed: number;
  usedPoints: number;
  unusedPoints: number;
  utilizationBps: number;
};

export type ProductionSimulationStepSchedule = ProductionSimulationStepInput & {
  dailyCounts: number[];
  dailyResults: ProductionSimulationDailyResult[];
  totalProducedQuantity: number;
  inputReadyAfterSimulation: number;
  completedQuantityAfterSimulation: number;
  remainingQuantityAfterSimulation: number;
  routeStatusAfterSimulation: ProductionSimulationRouteStatus;
};

export type ProductionSimulationDaySummary = {
  dayIndex: number;
  gameDay: number;
  totalAvailablePoints: number;
  totalEffectivePoints: number;
  totalUsedPoints: number;
  totalUnusedPoints: number;
  totalProducedQuantity: number;
  activeLineCount: number;
  blockedLineCount: number;
  averageUtilizationBps: number;
};

export type ProductionSimulationSchedule = {
  steps: ProductionSimulationStepSchedule[];
  days: ProductionSimulationDaySummary[];
  finishedQuantity: number;
};

export function buildProductionSimulationSchedule(
  inputSteps: ProductionSimulationStepInput[],
  startDay: number,
  options: {
    activationMode?: ProductionSimulationActivationMode;
    dayCount?: number;
  } = {},
): ProductionSimulationSchedule {
  const dayCount = Math.max(1, options.dayCount ?? 1);
  const activationMode = options.activationMode ?? "all";
  const steps = inputSteps.slice();
  const inputReady = steps.map((step) => Math.max(0, step.inputReadyQuantity));
  const completed = steps.map((step) => Math.max(0, step.completedQuantity));
  const setupPending = steps.map((step) => step.completedQuantity <= 0 && step.setupPoints > 0);
  const dailyResultsByStep = steps.map<ProductionSimulationDailyResult[]>(() => []);

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const nextDayInputAdditions = steps.map(() => 0);

    steps.forEach((step, stepIndex) => {
      const isActive = activationMode === "staggered" ? stepIndex <= dayIndex : true;
      const inputReadyBefore = inputReady[stepIndex] ?? 0;
      const availableInputBefore = Math.max(
        0,
        inputReadyBefore - completed[stepIndex],
      );
      const templateDailyPointCapacity = isActive
        ? Math.max(0, step.templateDailyPointCapacity)
        : 0;
      const effectivePointCapacity = isActive
        ? Math.floor((templateDailyPointCapacity * Math.max(0, step.conditionBps)) / 10_000)
        : 0;
      const plannedRemaining = Math.max(0, step.plannedQuantity - completed[stepIndex]);
      let setupPointsUsed = 0;
      let producedQuantity = 0;
      let status: ProductionSimulationLineStatus = "IDLE";

      if (isActive && plannedRemaining > 0) {
        if (availableInputBefore <= 0) {
          status = "BLOCKED_NO_INPUT";
        } else {
          setupPointsUsed = setupPending[stepIndex]
            ? Math.min(step.setupPoints, effectivePointCapacity)
            : 0;

          if (setupPointsUsed > 0) {
            setupPending[stepIndex] = false;
          }

          const workloadPointsPerUnit = Math.max(1, step.workloadPointsPerUnit);
          const pointsAvailableForUnits = Math.max(0, effectivePointCapacity - setupPointsUsed);
          const capacityQuantity = Math.floor(pointsAvailableForUnits / workloadPointsPerUnit);

          producedQuantity = Math.max(
            0,
            Math.min(capacityQuantity, availableInputBefore, plannedRemaining),
          );

          if (producedQuantity > 0) {
            completed[stepIndex] += producedQuantity;
            if (stepIndex + 1 < steps.length) {
              nextDayInputAdditions[stepIndex + 1] += producedQuantity;
            }
            status = "PRODUCED";
          }
        }
      }

      const usedPoints = producedQuantity * Math.max(1, step.workloadPointsPerUnit) + setupPointsUsed;
      const unusedPoints = Math.max(0, effectivePointCapacity - usedPoints);
      const utilizationBps = effectivePointCapacity > 0
        ? Math.min(10_000, Math.round((usedPoints * 10_000) / effectivePointCapacity))
        : 0;

      dailyResultsByStep[stepIndex].push({
        dayIndex,
        gameDay: startDay + dayIndex,
        isActive,
        status,
        inputReadyQuantity: availableInputBefore,
        producedQuantity,
        templateDailyPointCapacity,
        effectivePointCapacity,
        setupPointsUsed,
        usedPoints,
        unusedPoints,
        utilizationBps,
      });
    });

    nextDayInputAdditions.forEach((quantity, stepIndex) => {
      inputReady[stepIndex] += quantity;
    });
  }

  const scheduledSteps = steps.map<ProductionSimulationStepSchedule>((step, stepIndex) => {
    const dailyResults = dailyResultsByStep[stepIndex];
    const completedQuantityAfterSimulation = completed[stepIndex];
    const remainingQuantityAfterSimulation = Math.max(
      0,
      step.plannedQuantity - completedQuantityAfterSimulation,
    );
    const inputReadyAfterSimulation = inputReady[stepIndex];

    return {
      ...step,
      dailyCounts: dailyResults.map((result) => result.producedQuantity),
      dailyResults,
      totalProducedQuantity: dailyResults.reduce(
        (total, result) => total + result.producedQuantity,
        0,
      ),
      inputReadyAfterSimulation,
      completedQuantityAfterSimulation,
      remainingQuantityAfterSimulation,
      routeStatusAfterSimulation: routeStatus({
        completedQuantity: completedQuantityAfterSimulation,
        inputReadyQuantity: inputReadyAfterSimulation,
        plannedQuantity: step.plannedQuantity,
      }),
    };
  });

  return {
    days: buildDaySummaries(scheduledSteps, startDay, dayCount),
    finishedQuantity:
      scheduledSteps[scheduledSteps.length - 1]?.completedQuantityAfterSimulation ?? 0,
    steps: scheduledSteps,
  };
}

function buildDaySummaries(
  steps: ProductionSimulationStepSchedule[],
  startDay: number,
  dayCount: number,
): ProductionSimulationDaySummary[] {
  return Array.from({ length: dayCount }, (_, dayIndex) => {
    const results = steps.map((step) => step.dailyResults[dayIndex]).filter(Boolean);
    const totalAvailablePoints = sum(results, "templateDailyPointCapacity");
    const totalEffectivePoints = sum(results, "effectivePointCapacity");
    const totalUsedPoints = sum(results, "usedPoints");
    const totalUnusedPoints = sum(results, "unusedPoints");

    return {
      activeLineCount: results.filter((result) => result.producedQuantity > 0).length,
      averageUtilizationBps: totalEffectivePoints > 0
        ? Math.round((totalUsedPoints * 10_000) / totalEffectivePoints)
        : 0,
      blockedLineCount: results.filter((result) => result.status === "BLOCKED_NO_INPUT").length,
      dayIndex,
      gameDay: startDay + dayIndex,
      totalAvailablePoints,
      totalEffectivePoints,
      totalProducedQuantity: sum(results, "producedQuantity"),
      totalUnusedPoints,
      totalUsedPoints,
    };
  });
}

function routeStatus({
  completedQuantity,
  inputReadyQuantity,
  plannedQuantity,
}: {
  completedQuantity: number;
  inputReadyQuantity: number;
  plannedQuantity: number;
}): ProductionSimulationRouteStatus {
  if (completedQuantity >= plannedQuantity) return "COMPLETED";
  if (completedQuantity > 0) return "IN_PROGRESS";
  if (inputReadyQuantity > completedQuantity) return "READY";

  return "WAITING_INPUT";
}

function sum<T extends object>(values: T[], key: keyof T) {
  return values.reduce((total, value) => {
    const nextValue = value[key];

    return total + (typeof nextValue === "number" ? nextValue : 0);
  }, 0);
}

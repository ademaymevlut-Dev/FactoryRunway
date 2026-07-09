export const FIRST_SIMULATION_DAY_COUNT = 3;

export type FirstSimulationStepInput = {
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

export type FirstSimulationLineStatus = "PRODUCED" | "IDLE" | "BLOCKED_NO_INPUT";
export type FirstSimulationRouteStatus = "COMPLETED" | "IN_PROGRESS" | "READY" | "WAITING_INPUT";

export type FirstSimulationDailyResult = {
  dayIndex: number;
  gameDay: number;
  isActive: boolean;
  status: FirstSimulationLineStatus;
  inputReadyQuantity: number;
  producedQuantity: number;
  templateDailyPointCapacity: number;
  effectivePointCapacity: number;
  setupPointsUsed: number;
  usedPoints: number;
  unusedPoints: number;
  utilizationBps: number;
};

export type FirstSimulationStepSchedule = FirstSimulationStepInput & {
  dailyCounts: [number, number, number];
  dailyResults: FirstSimulationDailyResult[];
  totalProducedQuantity: number;
  inputReadyAfterSimulation: number;
  completedQuantityAfterSimulation: number;
  remainingQuantityAfterSimulation: number;
  routeStatusAfterSimulation: FirstSimulationRouteStatus;
};

export type FirstSimulationDaySummary = {
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

export type FirstSimulationSchedule = {
  steps: FirstSimulationStepSchedule[];
  days: FirstSimulationDaySummary[];
  finishedQuantity: number;
};

export function buildFirstSimulationSchedule(
  inputSteps: FirstSimulationStepInput[],
  startDay: number,
): FirstSimulationSchedule {
  const steps = inputSteps.slice(0, FIRST_SIMULATION_DAY_COUNT);
  const inputReady = steps.map((step) => Math.max(0, step.inputReadyQuantity));
  const completed = steps.map((step) => Math.max(0, step.completedQuantity));
  const setupPending = steps.map((step) => step.completedQuantity <= 0 && step.setupPoints > 0);
  const dailyResultsByStep = steps.map<FirstSimulationDailyResult[]>(() => []);

  for (let dayIndex = 0; dayIndex < FIRST_SIMULATION_DAY_COUNT; dayIndex += 1) {
    const nextDayInputAdditions = steps.map(() => 0);

    steps.forEach((step, stepIndex) => {
      const isActive = stepIndex <= dayIndex;
      const inputReadyBefore = inputReady[stepIndex] ?? 0;
      const templateDailyPointCapacity = isActive
        ? Math.max(0, step.templateDailyPointCapacity)
        : 0;
      const effectivePointCapacity = isActive
        ? Math.floor(templateDailyPointCapacity * Math.max(0, step.conditionBps) / 10000)
        : 0;
      const plannedRemaining = Math.max(0, step.plannedQuantity - completed[stepIndex]);
      let setupPointsUsed = 0;
      let producedQuantity = 0;
      let status: FirstSimulationLineStatus = "IDLE";

      if (isActive && plannedRemaining > 0) {
        if (inputReadyBefore <= 0) {
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
            Math.min(capacityQuantity, inputReadyBefore, plannedRemaining),
          );

          if (producedQuantity > 0) {
            inputReady[stepIndex] -= producedQuantity;
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
        ? Math.min(10000, Math.round(usedPoints * 10000 / effectivePointCapacity))
        : 0;

      dailyResultsByStep[stepIndex].push({
        dayIndex,
        gameDay: startDay + dayIndex,
        isActive,
        status,
        inputReadyQuantity: inputReadyBefore,
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

  const scheduledSteps = steps.map<FirstSimulationStepSchedule>((step, stepIndex) => {
    const dailyResults = dailyResultsByStep[stepIndex];
    const completedQuantityAfterSimulation = completed[stepIndex];
    const remainingQuantityAfterSimulation = Math.max(
      0,
      step.plannedQuantity - completedQuantityAfterSimulation,
    );
    const inputReadyAfterSimulation = inputReady[stepIndex];

    return {
      ...step,
      dailyCounts: [
        dailyResults[0]?.producedQuantity ?? 0,
        dailyResults[1]?.producedQuantity ?? 0,
        dailyResults[2]?.producedQuantity ?? 0,
      ],
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
    steps: scheduledSteps,
    days: buildDaySummaries(scheduledSteps, startDay),
    finishedQuantity:
      scheduledSteps[scheduledSteps.length - 1]?.completedQuantityAfterSimulation ?? 0,
  };
}

function buildDaySummaries(
  steps: FirstSimulationStepSchedule[],
  startDay: number,
): FirstSimulationDaySummary[] {
  return Array.from({ length: FIRST_SIMULATION_DAY_COUNT }, (_, dayIndex) => {
    const results = steps.map((step) => step.dailyResults[dayIndex]).filter(Boolean);
    const totalAvailablePoints = sum(results, "templateDailyPointCapacity");
    const totalEffectivePoints = sum(results, "effectivePointCapacity");
    const totalUsedPoints = sum(results, "usedPoints");
    const totalUnusedPoints = sum(results, "unusedPoints");

    return {
      dayIndex,
      gameDay: startDay + dayIndex,
      totalAvailablePoints,
      totalEffectivePoints,
      totalUsedPoints,
      totalUnusedPoints,
      totalProducedQuantity: sum(results, "producedQuantity"),
      activeLineCount: results.filter((result) => result.producedQuantity > 0).length,
      blockedLineCount: results.filter((result) => result.status === "BLOCKED_NO_INPUT").length,
      averageUtilizationBps: totalEffectivePoints > 0
        ? Math.round(totalUsedPoints * 10000 / totalEffectivePoints)
        : 0,
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
}): FirstSimulationRouteStatus {
  if (completedQuantity >= plannedQuantity) return "COMPLETED";
  if (completedQuantity > 0) return "IN_PROGRESS";
  if (inputReadyQuantity > 0) return "READY";

  return "WAITING_INPUT";
}

function sum<T extends object>(
  values: T[],
  key: keyof T,
) {
  return values.reduce((total, value) => {
    const nextValue = value[key];

    return total + (typeof nextValue === "number" ? nextValue : 0);
  }, 0);
}

import {
  buildProductionSimulationSchedule,
  type ProductionSimulationDailyResult,
  type ProductionSimulationDaySummary,
  type ProductionSimulationLineStatus,
  type ProductionSimulationRouteStatus,
  type ProductionSimulationSchedule,
  type ProductionSimulationStepInput,
  type ProductionSimulationStepSchedule,
} from "@/features/game/services/production-simulation-math";

export const FIRST_SIMULATION_DAY_COUNT = 3;

export type FirstSimulationStepInput = ProductionSimulationStepInput;
export type FirstSimulationLineStatus = ProductionSimulationLineStatus;
export type FirstSimulationRouteStatus = ProductionSimulationRouteStatus;
export type FirstSimulationDailyResult = ProductionSimulationDailyResult;
export type FirstSimulationStepSchedule = ProductionSimulationStepSchedule & {
  dailyCounts: [number, number, number];
};
export type FirstSimulationDaySummary = ProductionSimulationDaySummary;
export type FirstSimulationSchedule = Omit<ProductionSimulationSchedule, "steps"> & {
  steps: FirstSimulationStepSchedule[];
};

export function buildFirstSimulationSchedule(
  inputSteps: FirstSimulationStepInput[],
  startDay: number,
): FirstSimulationSchedule {
  const schedule = buildProductionSimulationSchedule(inputSteps, startDay, {
    activationMode: "staggered",
    dayCount: FIRST_SIMULATION_DAY_COUNT,
  });

  return {
    ...schedule,
    steps: schedule.steps.map((step) => ({
      ...step,
      dailyCounts: [
        step.dailyCounts[0] ?? 0,
        step.dailyCounts[1] ?? 0,
        step.dailyCounts[2] ?? 0,
      ],
    })),
  };
}

import assert from "node:assert/strict";
import test from "node:test";

import { buildProductionSimulationSchedule } from "./production-simulation-math";

test("departman transferlerini ertesi güne taşır ve girdiyi kümülatif saklar", () => {
  const schedule = buildProductionSimulationSchedule(
    [
      {
        completedQuantity: 0,
        conditionBps: 10_000,
        departmentId: "cutting",
        inputReadyQuantity: 10,
        lineNumber: 1,
        lineSortOrder: 1,
        plannedQuantity: 10,
        productRouteStepId: "cutting-step",
        productionLineId: "cutting-line",
        productionLineTemplateId: "cutting-template",
        routeProgressId: "cutting-progress",
        setupPoints: 0,
        templateDailyPointCapacity: 100,
        workloadPointsPerUnit: 10,
      },
      {
        completedQuantity: 0,
        conditionBps: 10_000,
        departmentId: "sewing",
        inputReadyQuantity: 0,
        lineNumber: 1,
        lineSortOrder: 2,
        plannedQuantity: 10,
        productRouteStepId: "sewing-step",
        productionLineId: "sewing-line",
        productionLineTemplateId: "sewing-template",
        routeProgressId: "sewing-progress",
        setupPoints: 0,
        templateDailyPointCapacity: 100,
        workloadPointsPerUnit: 10,
      },
    ],
    1,
    { dayCount: 2 },
  );

  assert.deepEqual(schedule.steps[0].dailyCounts, [10, 0]);
  assert.deepEqual(schedule.steps[1].dailyCounts, [0, 10]);
  assert.equal(schedule.steps[0].inputReadyAfterSimulation, 10);
  assert.equal(schedule.steps[1].inputReadyAfterSimulation, 10);
  assert.equal(schedule.steps[1].completedQuantityAfterSimulation, 10);
});

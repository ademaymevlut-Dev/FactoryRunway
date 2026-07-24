import type { ShiftSimulationSceneData } from "./shift-simulation-scene-types";

export const shiftSimulationSceneData = {
  departments: [
    {
      actualQuantity: 210,
      departmentKey: "cutting",
      inputQuantity: 210,
      plannedQuantity: 210,
      productKey: "backham_blazer",
      status: "on_plan",
      utilizationPercent: 94,
    },
    {
      actualQuantity: 90,
      departmentKey: "sewing",
      inputQuantity: 120,
      plannedQuantity: 120,
      productKey: "backham_blazer",
      status: "bottleneck",
      utilizationPercent: 75,
    },
    {
      actualQuantity: 96,
      departmentKey: "ironing_packing",
      inputQuantity: 96,
      plannedQuantity: 96,
      productKey: "backham_blazer",
      status: "on_plan",
      utilizationPercent: 88,
    },
  ],
  events: [
    {
      code: "SEWING_MACHINE_BREAKDOWN",
      departmentKey: "sewing",
      id: "event-sewing-machine-breakdown",
      impactPercent: 25,
      severity: "warning",
      triggerProgress: 0.48,
    },
  ],
  finishedGoods: [
    {
      productKey: "backham_blazer",
      quantity: 96,
    },
  ],
  productKey: "backham_blazer",
  sceneId: "shift-simulation-showcase",
  shift: {
    endTime: "17:00",
    playbackDurationMs: 10_000,
    startTime: "08:00",
  },
} as const satisfies ShiftSimulationSceneData;

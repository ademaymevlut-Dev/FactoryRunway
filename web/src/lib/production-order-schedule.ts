export type ProductionOrderScheduleInput = {
  acceptedGameDay: number;
  targetCompletionDays: number;
  toleranceDays: number;
  priorityRank: number;
  forcePriority?: boolean;
};

/**
 * Ortak offer-accept/generator akışının ProductionOrder create data'sına
 * eklemesi gereken teslim ve global öncelik alanlarını üretir.
 */
export function calculateProductionOrderSchedule(input: ProductionOrderScheduleInput) {
  for (const [key, value] of Object.entries(input)) {
    if (key !== "forcePriority" && (!Number.isInteger(value) || Number(value) < 0)) {
      throw new Error(`${key} 0 veya daha büyük bir tam sayı olmalı.`);
    }
  }

  const targetShipGameDay = input.acceptedGameDay + input.targetCompletionDays;
  return {
    acceptedGameDay: input.acceptedGameDay,
    targetCompletionDays: input.targetCompletionDays,
    toleranceDays: input.toleranceDays,
    targetShipGameDay,
    latestAcceptableGameDay: targetShipGameDay + input.toleranceDays,
    priorityRank: input.priorityRank,
    forcePriority: input.forcePriority ?? false,
  };
}

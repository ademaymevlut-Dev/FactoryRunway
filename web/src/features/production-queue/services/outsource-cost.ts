export function calculateOutsourceUnitCostCents(input: {
  costMultiplierBps: number
  costPer1000Points: number
  workloadPointsPerUnit: number
}) {
  const baseCostPerUnitCents = Math.max(
    1,
    Math.ceil(
      (Math.max(1, input.workloadPointsPerUnit) *
        Math.max(0, input.costPer1000Points)) /
        1000,
    ),
  )

  return Math.max(
    1,
    Math.ceil(
      (baseCostPerUnitCents * Math.max(1, input.costMultiplierBps)) / 10_000,
    ),
  )
}

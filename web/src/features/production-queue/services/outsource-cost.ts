export function calculateOutsourceUnitCostCents(input: {
  costMultiplierBps: number
  costPer1000Points: number
  workloadPointsPerUnit: number
}) {
  if (input.costPer1000Points <= 0) {
    throw new Error("Fason baz maliyeti tanımlı değil.")
  }

  const baseCostPerUnitCents = Math.max(
    1,
    Math.ceil(
      (Math.max(1, input.workloadPointsPerUnit) *
        input.costPer1000Points) /
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

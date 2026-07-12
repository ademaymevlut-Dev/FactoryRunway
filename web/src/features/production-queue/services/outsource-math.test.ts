import assert from "node:assert/strict"
import test from "node:test"

import { calculateOutsourceUnitCostCents } from "./outsource-cost"
import { calculateOutsourceCompletion } from "./outsource-math"

test("fason dönüşü tamamlanan ve fasondaki miktarı birlikte günceller", () => {
  assert.deepEqual(
    calculateOutsourceCompletion({
      completedQuantity: 100,
      inOutsourceQuantity: 400,
      jobQuantity: 250,
      plannedQuantity: 1000,
    }),
    {
      completedByOutsource: 250,
      completedQuantity: 350,
      inOutsourceQuantity: 150,
      remainingQuantity: 650,
    },
  )
})

test("FAST standarttan pahalı, SAFE standarttan uygun hesaplanır", () => {
  const common = {
    costPer1000Points: 634,
    workloadPointsPerUnit: 14,
  }
  const fast = calculateOutsourceUnitCostCents({
    ...common,
    costMultiplierBps: 12_000,
  })
  const standard = calculateOutsourceUnitCostCents({
    ...common,
    costMultiplierBps: 10_000,
  })
  const safe = calculateOutsourceUnitCostCents({
    ...common,
    costMultiplierBps: 8_500,
  })

  assert.ok(fast > standard)
  assert.ok(safe < standard)
})

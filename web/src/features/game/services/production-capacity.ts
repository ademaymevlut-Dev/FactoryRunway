export function getLineStaffCoverageBps(input: {
  assignedStaffQuantity: number
  requiredStaffQuantity: number
}) {
  if (input.requiredStaffQuantity <= 0) return 0

  return Math.min(
    10_000,
    Math.floor(
      (Math.max(0, input.assignedStaffQuantity) * 10_000) /
        input.requiredStaffQuantity,
    ),
  )
}

export function calculateEffectiveLinePointCapacity(input: {
  conditionBps: number
  dailyPointCapacity: number
  eventPenaltyBps?: number
  payrollCapacityBps?: number
  staffCoverageBps: number
}) {
  const capacityBeforePayroll = Math.floor(
    (Math.max(0, input.dailyPointCapacity) *
      Math.max(0, input.conditionBps) *
      Math.max(0, input.staffCoverageBps) *
      Math.max(0, input.eventPenaltyBps ?? 10_000)) /
      1_000_000_000_000,
  )

  return Math.floor(
    (capacityBeforePayroll *
      Math.min(10_000, Math.max(0, input.payrollCapacityBps ?? 10_000))) /
      10_000,
  )
}

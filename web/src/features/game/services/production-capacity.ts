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
  staffCoverageBps: number
}) {
  return Math.floor(
    (Math.max(0, input.dailyPointCapacity) *
      Math.max(0, input.conditionBps) *
      Math.max(0, input.staffCoverageBps) *
      Math.max(0, input.eventPenaltyBps ?? 10_000)) /
      1_000_000_000_000,
  )
}

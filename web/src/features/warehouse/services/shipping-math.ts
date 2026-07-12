export function calculateShippingState(input: {
  completedQuantity: number
  currentDay: number
  shippedQuantity: number
  targetDeliveryDay: number
  totalQuantity: number
}) {
  const totalQuantity = Math.max(0, input.totalQuantity)
  const completedQuantity = Math.min(
    totalQuantity,
    Math.max(0, input.completedQuantity),
  )
  const shippedQuantity = Math.min(
    completedQuantity,
    Math.max(0, input.shippedQuantity),
  )
  const isReadyToShip = completedQuantity >= totalQuantity
  const isDeliveryDayReached = input.currentDay >= input.targetDeliveryDay

  return {
    isDeliveryDayReached,
    isReadyToShip,
    lateDays:
      isReadyToShip && isDeliveryDayReached
        ? Math.max(0, input.currentDay - input.targetDeliveryDay)
        : 0,
    quantityToShip:
      isReadyToShip && isDeliveryDayReached
        ? Math.max(0, completedQuantity - shippedQuantity)
        : 0,
  }
}

export function calculateReceivableDueDay(input: {
  paymentTermDays: number
  shippedDay: number
}) {
  return input.shippedDay + Math.max(0, input.paymentTermDays)
}

export function calculateEffectiveShippingDay(input: {
  completedDay: number | null
  currentDay: number
  targetDeliveryDay: number
}) {
  return Math.max(
    input.targetDeliveryDay,
    input.completedDay ?? input.currentDay,
  )
}

export function calculateDueSettlement(input: {
  amountCents: bigint
  balanceCents: bigint
  settledAmountCents: bigint
}) {
  const remainingAmountCents =
    input.amountCents > input.settledAmountCents
      ? input.amountCents - input.settledAmountCents
      : BigInt(0)

  return {
    balanceAfterCents: input.balanceCents + remainingAmountCents,
    remainingAmountCents,
  }
}

export function calculateQueueQuantities(input: {
  completedQuantity: number
  inOutsourceQuantity: number
  inputReadyQuantity: number
  plannedQuantity: number
}) {
  const plannedQuantity = Math.max(0, input.plannedQuantity)
  const completedQuantity = Math.min(
    plannedQuantity,
    Math.max(0, input.completedQuantity),
  )
  const inputReadyQuantity = Math.min(
    plannedQuantity,
    Math.max(completedQuantity, input.inputReadyQuantity),
  )
  const remainingQuantity = Math.max(0, plannedQuantity - completedQuantity)
  const queueRemainingQuantity = Math.max(
    0,
    Math.min(
      remainingQuantity,
      inputReadyQuantity - completedQuantity - Math.max(0, input.inOutsourceQuantity),
    ),
  )

  return {
    completedQuantity,
    inputReadyQuantity,
    queueRemainingQuantity,
    remainingQuantity,
  }
}

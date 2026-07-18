import { calculateRouteProgressQuantities } from "@/features/game/services/route-progress-availability"

export function calculateQueueQuantities(input: {
  completedQuantity: number
  inOutsourceQuantity: number
  inputReadyQuantity: number
  plannedQuantity: number
}) {
  const quantities = calculateRouteProgressQuantities(input)

  return {
    completedQuantity: quantities.completedQuantity,
    inputReadyQuantity: quantities.inputReadyQuantity,
    queueRemainingQuantity: quantities.internalAvailableQuantity,
    remainingQuantity: quantities.remainingQuantity,
  }
}

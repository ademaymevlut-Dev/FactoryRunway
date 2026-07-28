import type { ProductionQueueUpstreamWaitKind } from "../types"

const UPSTREAM_WAIT_KIND_BY_DEPARTMENT = {
  dyeing: "sewing",
  embroidery: "cutting",
  printing: "cutting",
  washing: "sewing",
} as const satisfies Record<string, ProductionQueueUpstreamWaitKind>

export function getProductionQueueUpstreamWaitKind(
  departmentKey: string,
  waitingInputCount: number,
): ProductionQueueUpstreamWaitKind | null {
  if (waitingInputCount <= 0) return null

  return UPSTREAM_WAIT_KIND_BY_DEPARTMENT[
    departmentKey as keyof typeof UPSTREAM_WAIT_KIND_BY_DEPARTMENT
  ] ?? null
}

export function isWaitingForUpstreamInput(input: {
  completedQuantity: number
  inOutsourceQuantity: number
  inputReadyQuantity: number
  internalAvailableQuantity: number
  remainingQuantity: number
}) {
  return (
    input.remainingQuantity > 0 &&
    input.internalAvailableQuantity <= 0 &&
    input.inputReadyQuantity <= input.completedQuantity &&
    input.inOutsourceQuantity <= 0
  )
}

export type AutomaticAllocationLine = {
  id: string
  departmentId: string
  productionLineTemplateId: string
  effectivePointCapacity: number
  dailyPointCapacity: number
  conditionBps: number
  staffCoverageBps: number
  sortOrder: number
  lineNumber: number
}

export type AutomaticAllocationQueueItem = {
  id: string
  departmentId: string
  productRouteStepId: string
  productId: string
  productionOrderId: string
  customerOrderId: string
  customerOrderItemId: string
  availableQuantity: number
  remainingQuantity: number
  workloadPointsPerUnit: number
  setupPoints: number
  priority: number
  targetDeliveryDay: number
  createdAt: Date
}

export type AutomaticAllocationSegment = {
  id: string
  factoryProductionLineId: string
  productionLineTemplateId: string
  productionOrderRouteProgressId: string
  productionOrderId: string
  customerOrderId: string
  customerOrderItemId: string
  productId: string
  departmentId: string
  productRouteStepId: string
  lineSequence: number
  planSortOrder: number
  plannedQuantity: number
  plannedWorkloadPoints: number
  plannedSetupPoints: number
  plannedTotalPoints: number
  workloadPointsPerUnit: number
  lineDailyPointCapacitySnapshot: number
  lineConditionBpsSnapshot: number
  staffCoverageBpsSnapshot: number
  plannedAvailablePointsSnapshot: number
}

export type DepartmentPlanningQueueItem = {
  availableQuantity: number
  departmentId: string
  id: string
  remainingQuantity: number
  setupPoints: number
  workloadPointsPerUnit: number
}

export function buildAutomaticProductionAllocations(input: {
  lines: AutomaticAllocationLine[]
  queue: AutomaticAllocationQueueItem[]
  createId?: () => string
}) {
  let generatedId = 0
  const createId = input.createId ?? (() => `allocation-preview-${++generatedId}`)
  const queue = [...input.queue].sort(compareAutomaticAllocationQueueItems)
  const remainingByRouteProgressId = new Map(
    queue.map((item) => [
      item.id,
      Math.max(0, Math.min(item.availableQuantity, item.remainingQuantity)),
    ]),
  )
  const setupAppliedRouteProgressIds = new Set<string>()
  const segments: AutomaticAllocationSegment[] = []
  let planSortOrder = 0

  for (const line of [...input.lines].sort(compareLines)) {
    let remainingPoints = Math.max(0, line.effectivePointCapacity)
    let lineSequence = 0

    if (remainingPoints <= 0) continue

    for (const queueItem of queue) {
      if (queueItem.departmentId !== line.departmentId) continue

      const availableQuantity = remainingByRouteProgressId.get(queueItem.id) ?? 0

      if (availableQuantity <= 0) continue

      const workloadPointsPerUnit = Math.max(1, queueItem.workloadPointsPerUnit)
      const plannedSetupPoints = setupAppliedRouteProgressIds.has(queueItem.id)
        ? 0
        : Math.min(Math.max(0, queueItem.setupPoints), remainingPoints)
      const capacityQuantity = Math.floor(
        Math.max(0, remainingPoints - plannedSetupPoints) /
          workloadPointsPerUnit,
      )
      const plannedQuantity = Math.min(availableQuantity, capacityQuantity)

      if (plannedQuantity <= 0) continue

      const plannedWorkloadPoints = plannedQuantity * workloadPointsPerUnit
      const plannedTotalPoints = plannedWorkloadPoints + plannedSetupPoints
      lineSequence += 1
      planSortOrder += 1
      segments.push({
        customerOrderId: queueItem.customerOrderId,
        customerOrderItemId: queueItem.customerOrderItemId,
        departmentId: queueItem.departmentId,
        factoryProductionLineId: line.id,
        id: createId(),
        lineConditionBpsSnapshot: line.conditionBps,
        lineDailyPointCapacitySnapshot: line.dailyPointCapacity,
        lineSequence,
        planSortOrder,
        plannedAvailablePointsSnapshot: line.effectivePointCapacity,
        plannedQuantity,
        plannedSetupPoints,
        plannedTotalPoints,
        plannedWorkloadPoints,
        productId: queueItem.productId,
        productionLineTemplateId: line.productionLineTemplateId,
        productionOrderId: queueItem.productionOrderId,
        productionOrderRouteProgressId: queueItem.id,
        productRouteStepId: queueItem.productRouteStepId,
        staffCoverageBpsSnapshot: line.staffCoverageBps,
        workloadPointsPerUnit,
      })
      remainingByRouteProgressId.set(
        queueItem.id,
        availableQuantity - plannedQuantity,
      )
      remainingPoints -= plannedTotalPoints
      setupAppliedRouteProgressIds.add(queueItem.id)

      if (remainingPoints <= 0) break
    }
  }

  return segments
}

export function buildDepartmentPlannedQuantities(input: {
  lines: AutomaticAllocationLine[]
  queue: DepartmentPlanningQueueItem[]
}) {
  const segments = buildAutomaticProductionAllocations({
    lines: input.lines,
    queue: input.queue.map((item, index) => ({
      ...item,
      createdAt: new Date(index),
      customerOrderId: item.id,
      customerOrderItemId: item.id,
      priority: (index + 1) * 100,
      productId: item.id,
      productionOrderId: item.id,
      productRouteStepId: item.id,
      targetDeliveryDay: 0,
    })),
  })
  const plannedQuantityByRouteProgressId = new Map<string, number>()

  for (const segment of segments) {
    const current =
      plannedQuantityByRouteProgressId.get(
        segment.productionOrderRouteProgressId,
      ) ?? 0

    plannedQuantityByRouteProgressId.set(
      segment.productionOrderRouteProgressId,
      current + segment.plannedQuantity,
    )
  }

  return plannedQuantityByRouteProgressId
}

export function compareAutomaticAllocationQueueItems(
  first: AutomaticAllocationQueueItem,
  second: AutomaticAllocationQueueItem,
) {
  return (
    first.priority - second.priority ||
    first.targetDeliveryDay - second.targetDeliveryDay ||
    first.createdAt.getTime() - second.createdAt.getTime() ||
    first.id.localeCompare(second.id)
  )
}

function compareLines(
  first: AutomaticAllocationLine,
  second: AutomaticAllocationLine,
) {
  return (
    first.sortOrder - second.sortOrder ||
    first.lineNumber - second.lineNumber ||
    first.id.localeCompare(second.id)
  )
}

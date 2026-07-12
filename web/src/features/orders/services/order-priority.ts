export function buildOrderPriorityUpdates(productionOrderIds: string[]) {
  return productionOrderIds.map((id, index) => ({
    id,
    priority: (index + 1) * 100,
  }));
}

export function hasExactOrderOwnership(
  requestedIds: string[],
  foundIds: string[],
) {
  if (requestedIds.length !== foundIds.length) return false;

  const foundIdSet = new Set(foundIds);
  return requestedIds.every((id) => foundIdSet.has(id));
}

export function mergeDepartmentOrderPriority(
  globalOrderIds: string[],
  orderedDepartmentOrderIds: string[],
) {
  const departmentOrderIds = new Set(orderedDepartmentOrderIds);

  if (
    departmentOrderIds.size !== orderedDepartmentOrderIds.length ||
    orderedDepartmentOrderIds.some((id) => !globalOrderIds.includes(id))
  ) {
    return null;
  }

  const targetIndexes = globalOrderIds
    .map((id, index) => (departmentOrderIds.has(id) ? index : -1))
    .filter((index) => index >= 0);

  if (targetIndexes.length !== orderedDepartmentOrderIds.length) return null;

  const merged = [...globalOrderIds];
  targetIndexes.forEach((targetIndex, index) => {
    merged[targetIndex] = orderedDepartmentOrderIds[index] ?? merged[targetIndex];
  });

  return merged;
}

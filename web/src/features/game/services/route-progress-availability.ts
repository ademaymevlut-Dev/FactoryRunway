import { RouteProgressStatus } from "@/generated/prisma/enums";

export type RouteProgressQuantityInput = {
  completedQuantity: number;
  inOutsourceQuantity: number;
  inputReadyQuantity: number;
  plannedQuantity: number;
};

export function calculateRouteProgressQuantities(
  input: RouteProgressQuantityInput,
) {
  const plannedQuantity = Math.max(0, input.plannedQuantity);
  const completedQuantity = Math.min(
    plannedQuantity,
    Math.max(0, input.completedQuantity),
  );
  const inputReadyQuantity = Math.min(
    plannedQuantity,
    Math.max(completedQuantity, input.inputReadyQuantity),
  );
  const remainingQuantity = Math.max(0, plannedQuantity - completedQuantity);
  const readyQuantity = Math.max(
    0,
    Math.min(remainingQuantity, inputReadyQuantity - completedQuantity),
  );
  const inOutsourceQuantity = Math.min(
    readyQuantity,
    Math.max(0, input.inOutsourceQuantity),
  );
  const internalAvailableQuantity = Math.max(
    0,
    readyQuantity - inOutsourceQuantity,
  );

  return {
    completedQuantity,
    inOutsourceQuantity,
    inputReadyQuantity,
    internalAvailableQuantity,
    readyQuantity,
    remainingQuantity,
  };
}

export function getRouteProgressStatus(input: RouteProgressQuantityInput & {
  activeDepartmentIds: Set<string>;
  canOutsource: boolean;
  departmentId: string;
  isRequired: boolean;
}) {
  if (!input.isRequired) return RouteProgressStatus.SKIPPED;

  const quantities = calculateRouteProgressQuantities(input);

  if (quantities.completedQuantity >= Math.max(0, input.plannedQuantity)) {
    return RouteProgressStatus.COMPLETED;
  }

  if (quantities.internalAvailableQuantity <= 0) {
    if (quantities.inOutsourceQuantity > 0) {
      return RouteProgressStatus.WAITING_OUTSOURCE;
    }

    return quantities.completedQuantity > 0
      ? RouteProgressStatus.IN_PROGRESS
      : RouteProgressStatus.WAITING_INPUT;
  }

  if (input.activeDepartmentIds.has(input.departmentId)) {
    return quantities.completedQuantity > 0
      ? RouteProgressStatus.IN_PROGRESS
      : RouteProgressStatus.READY;
  }

  return input.canOutsource
    ? RouteProgressStatus.WAITING_OUTSOURCE
    : RouteProgressStatus.BLOCKED;
}

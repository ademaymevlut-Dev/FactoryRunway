export type FactoryMapDragAxis = "free" | "horizontal" | "vertical";

export function resolveFactoryMapDragAxis({
  deltaX,
  deltaY,
  lockToAxis,
}: {
  deltaX: number;
  deltaY: number;
  lockToAxis: boolean;
}): FactoryMapDragAxis {
  if (!lockToAxis) return "free";

  return Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
}

export function getFactoryMapDragDelta({
  axis,
  deltaX,
  deltaY,
}: {
  axis: FactoryMapDragAxis;
  deltaX: number;
  deltaY: number;
}) {
  if (axis === "horizontal") {
    return { x: deltaX, y: 0 };
  }

  if (axis === "vertical") {
    return { x: 0, y: deltaY };
  }

  return { x: deltaX, y: deltaY };
}

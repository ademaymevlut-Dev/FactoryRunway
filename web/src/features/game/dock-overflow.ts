export type DockOverflowState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

type DockScrollMetrics = {
  clientWidth: number;
  scrollLeft: number;
  scrollWidth: number;
};

type DockItemVisibilityMetrics = {
  itemEnd: number;
  itemStart: number;
  scrollLeft: number;
  viewportEnd: number;
  viewportStart: number;
};

const DOCK_SCROLL_EDGE_TOLERANCE_PX = 1;

export function getDockOverflowState({
  clientWidth,
  scrollLeft,
  scrollWidth,
}: DockScrollMetrics): DockOverflowState {
  const maximumScrollLeft = Math.max(0, scrollWidth - clientWidth);

  return {
    canScrollLeft: scrollLeft > DOCK_SCROLL_EDGE_TOLERANCE_PX,
    canScrollRight:
      scrollLeft < maximumScrollLeft - DOCK_SCROLL_EDGE_TOLERANCE_PX,
  };
}

export function getDockItemScrollTarget({
  itemEnd,
  itemStart,
  scrollLeft,
  viewportEnd,
  viewportStart,
}: DockItemVisibilityMetrics): number | null {
  if (
    itemStart >= viewportStart - DOCK_SCROLL_EDGE_TOLERANCE_PX &&
    itemEnd <= viewportEnd + DOCK_SCROLL_EDGE_TOLERANCE_PX
  ) {
    return null;
  }

  if (itemStart < viewportStart) {
    return Math.max(0, scrollLeft - (viewportStart - itemStart));
  }

  return scrollLeft + (itemEnd - viewportEnd);
}


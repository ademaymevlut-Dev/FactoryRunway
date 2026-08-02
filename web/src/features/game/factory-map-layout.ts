export const FACTORY_MAP_ROW_COUNT = 3;
export const FACTORY_MAP_SLOT_WIDTH = 147;
export const FACTORY_MAP_SLOT_GAP = 7;
export const FACTORY_MAP_SECTION_MIN_WIDTH = 328;
export const FACTORY_MAP_SECTION_HORIZONTAL_PADDING = 14;
export const FACTORY_MAP_CONNECTOR_WIDTH = 56;
export const FACTORY_MAP_CANVAS_MIN_WIDTH = 2_400;
export const FACTORY_MAP_CANVAS_HORIZONTAL_PADDING = 184;
export const FACTORY_MAP_CANVAS_HEIGHT = 1_120;
export const FACTORY_MAP_PRODUCTION_LAYOUT_TOP = 156.8;
export const FACTORY_MAP_PRODUCTION_LAYOUT_HEIGHT = 816;
export const FACTORY_MAP_DEPARTMENT_AREA_HEIGHT = 638;
export const FACTORY_MAP_OFFICE_TOP_PADDING = 80;
export const FACTORY_MAP_CAMERA_HUD_GAP = 8;

export type FactoryMapViewportClass =
  | "small-phone"
  | "phone"
  | "tablet"
  | "desktop";

export type FactoryMapInputMode = "coarse" | "fine";

export const FACTORY_MAP_BASE_SCALE = 0.82;

export const FACTORY_MAP_BASE_SCALES = {
  "small-phone": 0.64,
  phone: 0.68,
  tablet: 0.76,
  desktop: FACTORY_MAP_BASE_SCALE,
} as const satisfies Record<FactoryMapViewportClass, number>;

export const FACTORY_MAP_OFFICE_CONNECTOR_GAP =
  FACTORY_MAP_CONNECTOR_WIDTH;

export const FACTORY_MAP_SHIPMENT_AREA_HEIGHT = 330;
export const FACTORY_MAP_SHIPMENT_AREA_WIDTH = 360;
export const FACTORY_MAP_OFFICE_AREA_SCALE = 0.8;
export const FACTORY_MAP_OFFICE_AREA_WIDTH = Math.round(
  FACTORY_MAP_SHIPMENT_AREA_WIDTH * FACTORY_MAP_OFFICE_AREA_SCALE,
);
export const FACTORY_MAP_SHIPMENT_CONNECTOR_GAP =
  FACTORY_MAP_CONNECTOR_WIDTH;

const FACTORY_MAP_INITIAL_FIRST_SECTION_FOCUS_SHARE = 0.55;

export const FACTORY_MAP_INITIAL_FOCUS_POINT = {
  x:
    FACTORY_MAP_CANVAS_HORIZONTAL_PADDING +
    (FACTORY_MAP_OFFICE_AREA_WIDTH +
      FACTORY_MAP_OFFICE_CONNECTOR_GAP +
      FACTORY_MAP_SECTION_MIN_WIDTH *
        FACTORY_MAP_INITIAL_FIRST_SECTION_FOCUS_SHARE) /
      2,
  y:
    FACTORY_MAP_PRODUCTION_LAYOUT_TOP +
    FACTORY_MAP_DEPARTMENT_AREA_HEIGHT / 2,
} as const;

export type FactoryMapOffset = {
  x: number;
  y: number;
};

export type FactoryMapPanBounds = {
  min: number;
  max: number;
};

export type FactoryMapPoint = {
  x: number;
  y: number;
};

export type FactoryMapCameraInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type FactoryMapViewportRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export const FACTORY_MAP_ZERO_CAMERA_INSETS: FactoryMapCameraInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const FACTORY_MAP_SMALL_PHONE_MAX_SHORT_SIDE = 375;
const FACTORY_MAP_TABLET_MIN_SHORT_SIDE = 600;
const FACTORY_MAP_DESKTOP_MIN_WIDTH = 1_280;

export function resolveFactoryMapViewportClass({
  height,
  inputMode = "fine",
  width,
}: {
  height: number;
  inputMode?: FactoryMapInputMode;
  width: number;
}): FactoryMapViewportClass {
  const normalizedWidth = normalizeDimension(width);
  const normalizedHeight = normalizeDimension(height);

  if (normalizedWidth === 0 || normalizedHeight === 0) {
    return "desktop";
  }

  const shortSide = Math.min(normalizedWidth, normalizedHeight);

  if (shortSide <= FACTORY_MAP_SMALL_PHONE_MAX_SHORT_SIDE) {
    return "small-phone";
  }

  if (shortSide < FACTORY_MAP_TABLET_MIN_SHORT_SIDE) {
    return "phone";
  }

  if (
    inputMode === "fine" &&
    normalizedWidth >= FACTORY_MAP_DESKTOP_MIN_WIDTH
  ) {
    return "desktop";
  }

  return "tablet";
}

export function getFactoryMapBaseScale(
  viewportClass: FactoryMapViewportClass,
) {
  return FACTORY_MAP_BASE_SCALES[viewportClass];
}

export function getFactoryMapEffectiveScale({
  baseScale,
  mapZoom,
}: {
  baseScale: number;
  mapZoom: number;
}) {
  const normalizedBaseScale = normalizePositiveNumber(
    baseScale,
    FACTORY_MAP_BASE_SCALE,
  );
  const normalizedMapZoom = normalizePositiveNumber(mapZoom, 1);

  return normalizedBaseScale * normalizedMapZoom;
}

export function getFactoryMapCameraInsets({
  bottomHudRects = [],
  edgeGap = FACTORY_MAP_CAMERA_HUD_GAP,
  leftHudRect,
  topHudRect,
  viewportRect,
}: {
  bottomHudRects?: readonly FactoryMapViewportRect[];
  edgeGap?: number;
  leftHudRect?: FactoryMapViewportRect | null;
  topHudRect?: FactoryMapViewportRect | null;
  viewportRect: FactoryMapViewportRect;
}): FactoryMapCameraInsets {
  const viewportWidth = normalizeDimension(viewportRect.width);
  const viewportHeight = normalizeDimension(viewportRect.height);
  const normalizedGap = normalizeDimension(edgeGap);
  const validBottomHudRects = bottomHudRects.filter(isVisibleRect);
  const bottomHudTop = validBottomHudRects.length
    ? Math.min(...validBottomHudRects.map((rect) => rect.top))
    : viewportRect.bottom;
  const rawInsets = {
    top: isVisibleRect(topHudRect)
      ? topHudRect.bottom - viewportRect.top + normalizedGap
      : 0,
    right: isVisibleRect(topHudRect)
      ? viewportRect.right - topHudRect.right
      : 0,
    bottom:
      validBottomHudRects.length > 0
        ? viewportRect.bottom - bottomHudTop + normalizedGap
        : 0,
    left: Math.max(
      isVisibleRect(leftHudRect)
        ? leftHudRect.right - viewportRect.left + normalizedGap
        : 0,
      isVisibleRect(topHudRect) ? topHudRect.left - viewportRect.left : 0,
    ),
  };

  return normalizeCameraInsets(rawInsets, viewportWidth, viewportHeight);
}

export function getFactoryMapUsableCenter({
  cameraInsets = FACTORY_MAP_ZERO_CAMERA_INSETS,
  viewportHeight,
  viewportWidth,
}: {
  cameraInsets?: FactoryMapCameraInsets;
  viewportHeight: number;
  viewportWidth: number;
}): FactoryMapPoint {
  const normalizedWidth = normalizeDimension(viewportWidth);
  const normalizedHeight = normalizeDimension(viewportHeight);
  const insets = normalizeCameraInsets(
    cameraInsets,
    normalizedWidth,
    normalizedHeight,
  );

  return {
    x: insets.left + (normalizedWidth - insets.left - insets.right) / 2,
    y: insets.top + (normalizedHeight - insets.top - insets.bottom) / 2,
  };
}

export function getFactoryMapSectionWidth(itemCount: number) {
  const normalizedItemCount = normalizeItemCount(itemCount);
  const columnCount = Math.max(
    1,
    Math.ceil(normalizedItemCount / FACTORY_MAP_ROW_COUNT),
  );

  return Math.max(
    FACTORY_MAP_SECTION_MIN_WIDTH,
    FACTORY_MAP_SECTION_HORIZONTAL_PADDING * 2 +
      columnCount * FACTORY_MAP_SLOT_WIDTH +
      Math.max(0, columnCount - 1) * FACTORY_MAP_SLOT_GAP,
  );
}

export function getFactoryMapCanvasWidth({
  includeOfficeArea = false,
  includeShipmentArea,
  sectionWidths,
}: {
  includeOfficeArea?: boolean;
  includeShipmentArea: boolean;
  sectionWidths: readonly number[];
}) {
  const validSectionWidths = sectionWidths.filter(isValidSectionWidth);
  const sectionsWidth = validSectionWidths.reduce(
    (total, width) => total + width,
    0,
  );
  const connectorWidth =
    Math.max(0, validSectionWidths.length - 1) *
    FACTORY_MAP_CONNECTOR_WIDTH;
  const currentCanvasWidth = Math.max(
    FACTORY_MAP_CANVAS_MIN_WIDTH,
    FACTORY_MAP_CANVAS_HORIZONTAL_PADDING * 2 +
      sectionsWidth +
      connectorWidth,
  );

  const officeAreaWidth = includeOfficeArea
    ? FACTORY_MAP_OFFICE_CONNECTOR_GAP + FACTORY_MAP_OFFICE_AREA_WIDTH
    : 0;
  const shipmentAreaWidth = includeShipmentArea
    ? FACTORY_MAP_SHIPMENT_CONNECTOR_GAP +
      FACTORY_MAP_SHIPMENT_AREA_WIDTH
    : 0;

  return currentCanvasWidth + officeAreaWidth + shipmentAreaWidth;
}

export function getFactoryMapOfficeVerticalRise(officeAreaHeight: number) {
  const normalizedHeight = normalizeDimension(officeAreaHeight);
  const officeBaseline =
    FACTORY_MAP_PRODUCTION_LAYOUT_TOP +
    FACTORY_MAP_PRODUCTION_LAYOUT_HEIGHT;

  return Math.max(
    0,
    Math.ceil(
      normalizedHeight + FACTORY_MAP_OFFICE_TOP_PADDING - officeBaseline,
    ),
  );
}

export function getFactoryMapCanvasHeight(officeAreaHeight: number) {
  return (
    FACTORY_MAP_CANVAS_HEIGHT +
    getFactoryMapOfficeVerticalRise(officeAreaHeight)
  );
}

export function getFactoryMapInitialOffset({
  cameraInsets = FACTORY_MAP_ZERO_CAMERA_INSETS,
  canvasHeight,
  canvasWidth,
  focusPoint = FACTORY_MAP_INITIAL_FOCUS_POINT,
  scale,
  viewportHeight,
  viewportWidth,
}: {
  cameraInsets?: FactoryMapCameraInsets;
  canvasHeight: number;
  canvasWidth: number;
  focusPoint?: FactoryMapPoint;
  scale: number;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const normalizedScale = normalizePositiveNumber(
    scale,
    FACTORY_MAP_BASE_SCALE,
  );
  const usableCenter = getFactoryMapUsableCenter({
    cameraInsets,
    viewportHeight,
    viewportWidth,
  });
  const proposedOffset = {
    x: usableCenter.x - normalizeDimension(focusPoint.x) * normalizedScale,
    y: usableCenter.y - normalizeDimension(focusPoint.y) * normalizedScale,
  };

  return getFactoryMapBoundedOffset({
    cameraInsets,
    canvasHeight,
    canvasWidth,
    proposedOffset,
    scale: normalizedScale,
    viewportHeight,
    viewportWidth,
  });
}

export function getFactoryMapReanchoredOffset({
  canvasHeight,
  canvasWidth,
  nextCameraInsets = FACTORY_MAP_ZERO_CAMERA_INSETS,
  nextScale,
  nextViewportHeight,
  nextViewportWidth,
  previousOffset,
  previousScale,
  previousUsableCenter,
}: {
  canvasHeight: number;
  canvasWidth: number;
  nextCameraInsets?: FactoryMapCameraInsets;
  nextScale: number;
  nextViewportHeight: number;
  nextViewportWidth: number;
  previousOffset: FactoryMapOffset;
  previousScale: number;
  previousUsableCenter: FactoryMapPoint;
}) {
  const normalizedPreviousScale = normalizePositiveNumber(
    previousScale,
    FACTORY_MAP_BASE_SCALE,
  );
  const normalizedNextScale = normalizePositiveNumber(
    nextScale,
    FACTORY_MAP_BASE_SCALE,
  );
  const nextUsableCenter = getFactoryMapUsableCenter({
    cameraInsets: nextCameraInsets,
    viewportHeight: nextViewportHeight,
    viewportWidth: nextViewportWidth,
  });
  const worldAnchor = {
    x:
      (normalizeFiniteNumber(previousUsableCenter.x) -
        normalizeFiniteNumber(previousOffset.x)) /
      normalizedPreviousScale,
    y:
      (normalizeFiniteNumber(previousUsableCenter.y) -
        normalizeFiniteNumber(previousOffset.y)) /
      normalizedPreviousScale,
  };

  return getFactoryMapBoundedOffset({
    cameraInsets: nextCameraInsets,
    canvasHeight,
    canvasWidth,
    proposedOffset: {
      x: nextUsableCenter.x - worldAnchor.x * normalizedNextScale,
      y: nextUsableCenter.y - worldAnchor.y * normalizedNextScale,
    },
    scale: normalizedNextScale,
    viewportHeight: nextViewportHeight,
    viewportWidth: nextViewportWidth,
  });
}

export function getFactoryMapHorizontalPanBounds({
  canvasWidth,
  endInset = 0,
  scale,
  startInset = 0,
  viewportWidth,
}: {
  canvasWidth: number;
  endInset?: number;
  scale: number;
  startInset?: number;
  viewportWidth: number;
}): FactoryMapPanBounds {
  return getAxisPanBounds(
    normalizeDimension(canvasWidth) *
      normalizePositiveNumber(scale, FACTORY_MAP_BASE_SCALE),
    normalizeDimension(viewportWidth),
    startInset,
    endInset,
  );
}

export function getFactoryMapBoundedOffset({
  cameraInsets = FACTORY_MAP_ZERO_CAMERA_INSETS,
  canvasHeight = FACTORY_MAP_CANVAS_HEIGHT,
  canvasWidth,
  proposedOffset,
  scale,
  viewportHeight,
  viewportWidth,
}: {
  cameraInsets?: FactoryMapCameraInsets;
  canvasHeight?: number;
  canvasWidth: number;
  proposedOffset: FactoryMapOffset;
  scale: number;
  viewportHeight: number;
  viewportWidth: number;
}): FactoryMapOffset {
  const normalizedScale = normalizePositiveNumber(
    scale,
    FACTORY_MAP_BASE_SCALE,
  );
  const normalizedViewportWidth = normalizeDimension(viewportWidth);
  const normalizedViewportHeight = normalizeDimension(viewportHeight);
  const normalizedInsets = normalizeCameraInsets(
    cameraInsets,
    normalizedViewportWidth,
    normalizedViewportHeight,
  );
  const horizontalBounds = getFactoryMapHorizontalPanBounds({
    canvasWidth,
    endInset: normalizedInsets.right,
    scale: normalizedScale,
    startInset: normalizedInsets.left,
    viewportWidth: normalizedViewportWidth,
  });
  const verticalBounds = getAxisPanBounds(
    normalizeDimension(canvasHeight) * normalizedScale,
    normalizedViewportHeight,
    normalizedInsets.top,
    normalizedInsets.bottom,
  );

  return {
    x: clampToBounds(proposedOffset.x, horizontalBounds),
    y: clampToBounds(proposedOffset.y, verticalBounds),
  };
}

function normalizeItemCount(itemCount: number) {
  if (!Number.isFinite(itemCount)) {
    return 0;
  }

  return Math.max(0, Math.floor(itemCount));
}

function normalizeDimension(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function normalizePositiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeFiniteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeCameraInsets(
  cameraInsets: FactoryMapCameraInsets,
  viewportWidth: number,
  viewportHeight: number,
) {
  const left = Math.min(
    normalizeDimension(cameraInsets.left),
    viewportWidth / 2,
  );
  const right = Math.min(
    normalizeDimension(cameraInsets.right),
    Math.max(0, viewportWidth - left),
  );
  const top = Math.min(
    normalizeDimension(cameraInsets.top),
    viewportHeight / 2,
  );
  const bottom = Math.min(
    normalizeDimension(cameraInsets.bottom),
    Math.max(0, viewportHeight - top),
  );

  return { top, right, bottom, left };
}

function isVisibleRect(
  rect: FactoryMapViewportRect | null | undefined,
): rect is FactoryMapViewportRect {
  return Boolean(
    rect &&
      Number.isFinite(rect.top) &&
      Number.isFinite(rect.right) &&
      Number.isFinite(rect.bottom) &&
      Number.isFinite(rect.left) &&
      rect.right > rect.left &&
      rect.bottom > rect.top,
  );
}

function isValidSectionWidth(width: number) {
  return Number.isFinite(width) && width > 0;
}

function getAxisPanBounds(
  contentSize: number,
  viewportSize: number,
  startInset = 0,
  endInset = 0,
): FactoryMapPanBounds {
  const normalizedContentSize = normalizeDimension(contentSize);
  const normalizedViewportSize = normalizeDimension(viewportSize);
  const normalizedStartInset = Math.min(
    normalizeDimension(startInset),
    normalizedViewportSize,
  );
  const normalizedEndInset = Math.min(
    normalizeDimension(endInset),
    Math.max(0, normalizedViewportSize - normalizedStartInset),
  );
  const usableViewportSize = Math.max(
    0,
    normalizedViewportSize - normalizedStartInset - normalizedEndInset,
  );

  if (normalizedContentSize <= usableViewportSize) {
    const centeredOffset = Math.round(
      normalizedStartInset +
        (usableViewportSize - normalizedContentSize) / 2,
    );

    return {
      max: centeredOffset,
      min: centeredOffset,
    };
  }

  return {
    max: normalizedStartInset,
    min:
      normalizedViewportSize -
      normalizedEndInset -
      normalizedContentSize,
  };
}

function clampToBounds(value: number, bounds: FactoryMapPanBounds) {
  const normalizedValue = Number.isFinite(value) ? value : bounds.max;

  return Math.min(bounds.max, Math.max(bounds.min, normalizedValue));
}

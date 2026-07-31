export const FACTORY_MAP_ROW_COUNT = 3;
export const FACTORY_MAP_SLOT_WIDTH = 147;
export const FACTORY_MAP_SLOT_GAP = 7;
export const FACTORY_MAP_SECTION_MIN_WIDTH = 328;
export const FACTORY_MAP_SECTION_HORIZONTAL_PADDING = 14;
export const FACTORY_MAP_CONNECTOR_WIDTH = 56;
export const FACTORY_MAP_CANVAS_MIN_WIDTH = 2_400;
export const FACTORY_MAP_CANVAS_HORIZONTAL_PADDING = 184;
export const FACTORY_MAP_CANVAS_HEIGHT = 1_120;
export const FACTORY_MAP_BASE_SCALE = 0.82;

export const FACTORY_MAP_SHIPMENT_AREA_HEIGHT = 330;
export const FACTORY_MAP_SHIPMENT_AREA_WIDTH = 360;
export const FACTORY_MAP_SHIPMENT_CONNECTOR_GAP =
  FACTORY_MAP_CONNECTOR_WIDTH;

export type FactoryMapOffset = {
  x: number;
  y: number;
};

export type FactoryMapPanBounds = {
  min: number;
  max: number;
};

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
  includeShipmentArea,
  sectionWidths,
}: {
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

  if (!includeShipmentArea) {
    return currentCanvasWidth;
  }

  return (
    currentCanvasWidth +
    FACTORY_MAP_SHIPMENT_CONNECTOR_GAP +
    FACTORY_MAP_SHIPMENT_AREA_WIDTH
  );
}

export function getFactoryMapHorizontalPanBounds({
  canvasWidth,
  scale,
  viewportWidth,
}: {
  canvasWidth: number;
  scale: number;
  viewportWidth: number;
}): FactoryMapPanBounds {
  return getAxisPanBounds(canvasWidth * scale, viewportWidth);
}

export function getFactoryMapBoundedOffset({
  canvasWidth,
  proposedOffset,
  scale,
  viewportHeight,
  viewportWidth,
}: {
  canvasWidth: number;
  proposedOffset: FactoryMapOffset;
  scale: number;
  viewportHeight: number;
  viewportWidth: number;
}): FactoryMapOffset {
  const horizontalBounds = getFactoryMapHorizontalPanBounds({
    canvasWidth,
    scale,
    viewportWidth,
  });
  const verticalBounds = getAxisPanBounds(
    FACTORY_MAP_CANVAS_HEIGHT * scale,
    viewportHeight,
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

function isValidSectionWidth(width: number) {
  return Number.isFinite(width) && width > 0;
}

function getAxisPanBounds(
  contentSize: number,
  viewportSize: number,
): FactoryMapPanBounds {
  if (contentSize <= viewportSize) {
    const centeredOffset = Math.round((viewportSize - contentSize) / 2);

    return {
      max: centeredOffset,
      min: centeredOffset,
    };
  }

  return {
    max: 0,
    min: viewportSize - contentSize,
  };
}

function clampToBounds(value: number, bounds: FactoryMapPanBounds) {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

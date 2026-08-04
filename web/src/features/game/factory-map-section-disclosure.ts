export const FACTORY_MAP_SECTION_LINE_LIMIT = 9;
export const FACTORY_MAP_SECTION_PAGE_SIZE = 9;

export function isFactoryMapSectionCollapsible(productionLineCount: number) {
  return normalizeCount(productionLineCount) > FACTORY_MAP_SECTION_LINE_LIMIT;
}

export function getFactoryMapSectionPageCount(productionLineCount: number) {
  return Math.max(
    1,
    Math.ceil(
      normalizeCount(productionLineCount) / FACTORY_MAP_SECTION_PAGE_SIZE,
    ),
  );
}

export function clampFactoryMapSectionPage(
  pageIndex: number,
  productionLineCount: number,
) {
  const lastPageIndex = getFactoryMapSectionPageCount(productionLineCount) - 1;
  const normalizedPageIndex = Number.isFinite(pageIndex)
    ? Math.trunc(pageIndex)
    : 0;

  return Math.min(lastPageIndex, Math.max(0, normalizedPageIndex));
}

export function getFactoryMapSectionPageItems<T>(
  items: readonly T[],
  pageIndex: number,
) {
  const normalizedPageIndex = clampFactoryMapSectionPage(
    pageIndex,
    items.length,
  );
  const startIndex =
    normalizedPageIndex * FACTORY_MAP_SECTION_PAGE_SIZE;

  return items.slice(startIndex, startIndex + FACTORY_MAP_SECTION_PAGE_SIZE);
}

function normalizeCount(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.trunc(value));
}

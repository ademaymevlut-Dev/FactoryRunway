import type { GameNotification } from "./types";

export const MOBILE_FACTORY_STATUS_SHEET_EDGE_GAP_PX = 8;
export const MOBILE_FACTORY_STATUS_SHEET_MAX_WIDTH_PX = 560;
export const MOBILE_FACTORY_STATUS_SHEET_TOP_GAP_PX = 16;

export function getMobileFactoryNamePresentation(factoryName: string) {
  return {
    accessibleName: factoryName,
    text: factoryName,
  } as const;
}

export function getMobileFactoryStatusSheetBounds({
  safeAreaLeft = 0,
  safeAreaRight = 0,
  viewportWidth,
}: {
  safeAreaLeft?: number;
  safeAreaRight?: number;
  viewportWidth: number;
}) {
  const availableWidth = Math.max(
    0,
    viewportWidth -
      safeAreaLeft -
      safeAreaRight -
      MOBILE_FACTORY_STATUS_SHEET_EDGE_GAP_PX * 2,
  );
  const width = Math.min(
    availableWidth,
    MOBILE_FACTORY_STATUS_SHEET_MAX_WIDTH_PX,
  );
  const left =
    safeAreaLeft +
    MOBILE_FACTORY_STATUS_SHEET_EDGE_GAP_PX +
    Math.max(0, (availableWidth - width) / 2);

  return {
    left,
    right: left + width,
    width,
  } as const;
}

export function getCriticalFactoryNotificationCount(
  notifications: readonly GameNotification[],
) {
  return notifications.filter(
    (notification) =>
      notification.tone === "danger" || notification.tone === "warning",
  ).length;
}

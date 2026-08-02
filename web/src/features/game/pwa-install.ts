export const PWA_INSTALL_AUTO_PROMPT_DELAY_MS = 30_000;

export const PWA_INSTALL_DISMISSED_AT_STORAGE_KEY =
  "factoryrunway:pwa-install:v1:dismissed-at";
export const PWA_INSTALL_DISMISS_COUNT_STORAGE_KEY =
  "factoryrunway:pwa-install:v1:dismiss-count";

const FIRST_DISMISSAL_DELAY_MS = 7 * 24 * 60 * 60 * 1_000;
const SECOND_DISMISSAL_DELAY_MS = 30 * 24 * 60 * 60 * 1_000;

const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/i;
const SAFARI_PATTERN = /Safari/i;
const IOS_ALTERNATIVE_BROWSER_PATTERN =
  /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|GSA/i;

export type PwaInstallCapability =
  | "loading"
  | "standalone"
  | "android-available"
  | "ios-instructions"
  | "unsupported";

export type PwaInstallPreference = {
  dismissedAt: number;
  dismissCount: number;
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "removeItem" | "setItem">;

type PwaNavigatorDetails = {
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
};

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export async function promptForPwaInstall(
  event: BeforeInstallPromptEvent,
) {
  await event.prompt();

  return event.userChoice;
}

export function resolveStandaloneDisplay({
  displayModeStandalone,
  iosStandalone,
}: {
  displayModeStandalone: boolean;
  iosStandalone: boolean;
}) {
  return displayModeStandalone || iosStandalone;
}

export function isRunningStandalone() {
  if (typeof window === "undefined") return false;

  const iosNavigator = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return resolveStandaloneDisplay({
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone: iosNavigator.standalone === true,
  });
}

export function isIosSafariInstallPlatform({
  maxTouchPoints,
  platform,
  userAgent,
}: PwaNavigatorDetails) {
  const isIosDevice =
    IOS_DEVICE_PATTERN.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  return (
    isIosDevice &&
    SAFARI_PATTERN.test(userAgent) &&
    !IOS_ALTERNATIVE_BROWSER_PATTERN.test(userAgent)
  );
}

export function getPwaInstallReminderDelayMs(dismissCount: number) {
  if (dismissCount <= 0) return 0;
  if (dismissCount === 1) return FIRST_DISMISSAL_DELAY_MS;
  if (dismissCount === 2) return SECOND_DISMISSAL_DELAY_MS;

  return Number.POSITIVE_INFINITY;
}

export function shouldAutomaticallyOfferPwaInstall(
  preference: PwaInstallPreference | null,
  now = Date.now(),
) {
  if (!preference) return true;

  const reminderDelay = getPwaInstallReminderDelayMs(
    preference.dismissCount,
  );

  if (!Number.isFinite(reminderDelay)) return false;
  if (!Number.isFinite(now)) return false;

  const elapsedMs = Math.max(0, now - preference.dismissedAt);

  return elapsedMs >= reminderDelay;
}

export function readPwaInstallPreference(
  storage: StorageReader | null,
): PwaInstallPreference | null {
  if (!storage) return null;

  try {
    const dismissedAt = Number(
      storage.getItem(PWA_INSTALL_DISMISSED_AT_STORAGE_KEY),
    );
    const dismissCount = Number(
      storage.getItem(PWA_INSTALL_DISMISS_COUNT_STORAGE_KEY),
    );

    if (
      !Number.isFinite(dismissedAt) ||
      dismissedAt <= 0 ||
      !Number.isInteger(dismissCount) ||
      dismissCount <= 0
    ) {
      return null;
    }

    return { dismissedAt, dismissCount };
  } catch {
    return null;
  }
}

export function createNextPwaInstallPreference(
  currentPreference: PwaInstallPreference | null,
  dismissedAt = Date.now(),
): PwaInstallPreference {
  return {
    dismissedAt,
    dismissCount: (currentPreference?.dismissCount ?? 0) + 1,
  };
}

export function writePwaInstallPreference(
  storage: StorageWriter | null,
  preference: PwaInstallPreference,
) {
  if (!storage) return;

  try {
    storage.setItem(
      PWA_INSTALL_DISMISSED_AT_STORAGE_KEY,
      String(preference.dismissedAt),
    );
    storage.setItem(
      PWA_INSTALL_DISMISS_COUNT_STORAGE_KEY,
      String(preference.dismissCount),
    );
  } catch {
    // Storage can be blocked or unavailable in private browsing modes.
  }
}

export function clearPwaInstallPreference(storage: StorageWriter | null) {
  if (!storage) return;

  try {
    storage.removeItem(PWA_INSTALL_DISMISSED_AT_STORAGE_KEY);
  } catch {
    // Continue clearing the independent value when one operation is blocked.
  }

  try {
    storage.removeItem(PWA_INSTALL_DISMISS_COUNT_STORAGE_KEY);
  } catch {
    // Storage can be blocked or unavailable in private browsing modes.
  }
}

"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type BeforeInstallPromptEvent,
  clearPwaInstallPreference,
  createNextPwaInstallPreference,
  isIosSafariInstallPlatform,
  isRunningStandalone,
  PWA_INSTALL_AUTO_PROMPT_DELAY_MS,
  promptForPwaInstall,
  type PwaInstallCapability,
  type PwaInstallPreference,
  readPwaInstallPreference,
  shouldAutomaticallyOfferPwaInstall,
  writePwaInstallPreference,
} from "../pwa-install";

const MOBILE_INSTALL_SURFACE_QUERY =
  "(max-width: 639px), (pointer: coarse)";

type PwaInstallController = {
  capability: PwaInstallCapability;
  instructionsOpen: boolean;
  isAutomaticOfferReady: boolean;
  dismissAutomaticOffer: () => void;
  handleInstructionsOpenChange: (open: boolean) => void;
  requestInstall: (returnFocusTo?: HTMLElement | null) => Promise<void>;
  returnFocusTargetRef: React.RefObject<HTMLElement | null>;
};

const PwaInstallContext = createContext<PwaInstallController | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [capability, setCapability] =
    useState<PwaInstallCapability>("loading");
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [preference, setPreference] =
    useState<PwaInstallPreference | null>(null);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const returnFocusTargetRef = useRef<HTMLElement | null>(null);

  const dismissAutomaticOffer = useCallback(() => {
    const currentPreference = readPwaInstallPreference(
      getBrowserStorage(),
    ) ?? preference;
    const nextPreference = createNextPwaInstallPreference(currentPreference);

    writePwaInstallPreference(getBrowserStorage(), nextPreference);
    setPreference(nextPreference);
    setSessionDismissed(true);
    setInstructionsOpen(false);
  }, [preference]);

  const requestInstall = useCallback(
    async (returnFocusTo?: HTMLElement | null) => {
      if (isRunningStandalone()) {
        deferredPromptRef.current = null;
        setCapability("standalone");
        setInstructionsOpen(false);
        return;
      }

      if (capability === "ios-instructions") {
        returnFocusTargetRef.current = returnFocusTo ?? null;
        setInstructionsOpen(true);
        return;
      }

      if (capability !== "android-available") return;

      const deferredPrompt = deferredPromptRef.current;

      if (!deferredPrompt) return;

      deferredPromptRef.current = null;
      setCapability("unsupported");

      try {
        const choice = await promptForPwaInstall(deferredPrompt);

        if (choice.outcome === "accepted") {
          clearPwaInstallPreference(getBrowserStorage());
          setPreference(null);
          setSessionDismissed(true);
          return;
        }

        dismissAutomaticOffer();
      } catch {
        setSessionDismissed(true);
      }
    },
    [capability, dismissAutomaticOffer],
  );

  const handleInstructionsOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setInstructionsOpen(true);
        return;
      }

      dismissAutomaticOffer();
    },
    [dismissAutomaticOffer],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDelayElapsed(true);
    }, PWA_INSTALL_AUTO_PROMPT_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const mobileSurfaceMedia = window.matchMedia(MOBILE_INSTALL_SURFACE_QUERY);
    let active = true;

    const syncCapability = () => {
      if (isRunningStandalone()) {
        deferredPromptRef.current = null;
        setCapability("standalone");
        setInstructionsOpen(false);
        return;
      }

      if (!mobileSurfaceMedia.matches) {
        deferredPromptRef.current = null;
        setCapability("unsupported");
        setInstructionsOpen(false);
        return;
      }

      if (deferredPromptRef.current) {
        setCapability("android-available");
        return;
      }

      setCapability(
        isIosSafariInstallPlatform({
          maxTouchPoints: window.navigator.maxTouchPoints,
          platform: window.navigator.platform,
          userAgent: window.navigator.userAgent,
        })
          ? "ios-instructions"
          : "unsupported",
      );
    };
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      if (isRunningStandalone() || !mobileSurfaceMedia.matches) return;

      event.preventDefault();
      deferredPromptRef.current = event;
      setCapability("android-available");
    };
    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      clearPwaInstallPreference(getBrowserStorage());
      setPreference(null);
      setSessionDismissed(true);
      setInstructionsOpen(false);
      setCapability("standalone");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    standaloneMedia.addEventListener("change", syncCapability);
    mobileSurfaceMedia.addEventListener("change", syncCapability);
    window.queueMicrotask(() => {
      if (!active) return;

      setPreference(readPwaInstallPreference(getBrowserStorage()));
      setPreferenceLoaded(true);
      syncCapability();
    });

    return () => {
      active = false;
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      standaloneMedia.removeEventListener("change", syncCapability);
      mobileSurfaceMedia.removeEventListener("change", syncCapability);
      deferredPromptRef.current = null;
    };
  }, []);

  const isInstallCapable =
    capability === "android-available" || capability === "ios-instructions";
  const isAutomaticOfferReady =
    isInstallCapable &&
    delayElapsed &&
    preferenceLoaded &&
    !sessionDismissed &&
    shouldAutomaticallyOfferPwaInstall(preference);
  const value = useMemo<PwaInstallController>(
    () => ({
      capability,
      dismissAutomaticOffer,
      handleInstructionsOpenChange,
      instructionsOpen,
      isAutomaticOfferReady,
      requestInstall,
      returnFocusTargetRef,
    }),
    [
      capability,
      dismissAutomaticOffer,
      handleInstructionsOpenChange,
      instructionsOpen,
      isAutomaticOfferReady,
      requestInstall,
    ],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const controller = useContext(PwaInstallContext);

  if (!controller) {
    throw new Error("usePwaInstall must be used inside PwaInstallProvider.");
  }

  return controller;
}

function getBrowserStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

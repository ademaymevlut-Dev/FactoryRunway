import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  type BeforeInstallPromptEvent,
  clearPwaInstallPreference,
  createNextPwaInstallPreference,
  getPwaInstallReminderDelayMs,
  isIosSafariInstallPlatform,
  isRunningStandalone,
  promptForPwaInstall,
  PWA_INSTALL_DISMISSED_AT_STORAGE_KEY,
  PWA_INSTALL_DISMISS_COUNT_STORAGE_KEY,
  readPwaInstallPreference,
  resolveStandaloneDisplay,
  shouldAutomaticallyOfferPwaInstall,
  writePwaInstallPreference,
} from "./pwa-install";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const provider = readSource("./components/pwa-install-provider.tsx");
const assistant = readSource("./components/pwa-install-assistant.tsx");
const assistantStyles = readSource(
  "./components/pwa-install-assistant.module.css",
);
const header = readSource("./components/top-status-bar.tsx");
const shell = readSource("./components/game-shell.tsx");
const copy = readSource("./game-copy.ts");

const DAY_MS = 24 * 60 * 60 * 1_000;

test("standalone tespiti display mode, iOS navigator ve server güvenliğini kapsar", () => {
  assert.equal(
    resolveStandaloneDisplay({
      displayModeStandalone: true,
      iosStandalone: false,
    }),
    true,
  );
  assert.equal(
    resolveStandaloneDisplay({
      displayModeStandalone: false,
      iosStandalone: true,
    }),
    true,
  );
  assert.equal(
    resolveStandaloneDisplay({
      displayModeStandalone: false,
      iosStandalone: false,
    }),
    false,
  );
  assert.equal(isRunningStandalone(), false);
  assert.match(shell, /import \{ isRunningStandalone \} from "\.\.\/pwa-install"/);
  assert.match(shell, /if \(isRunningStandalone\(\)\)/);
  assert.doesNotMatch(shell, /navigator\.standalone|display-mode: standalone/);
});

test("yalnız iOS Safari yardım platformu olarak algılanır", () => {
  const iphoneSafari = {
    maxTouchPoints: 5,
    platform: "iPhone",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  };

  assert.equal(isIosSafariInstallPlatform(iphoneSafari), true);
  assert.equal(
    isIosSafariInstallPlatform({
      ...iphoneSafari,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1",
    }),
    false,
  );
  assert.equal(
    isIosSafariInstallPlatform({
      maxTouchPoints: 5,
      platform: "Linux armv8l",
      userAgent:
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
    }),
    false,
  );
  assert.equal(
    isIosSafariInstallPlatform({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    }),
    true,
  );
});

test("kapatma politikası ilk seferde 7 gün, ikincide 30 gün ve sonrasında kalıcı sessizlik uygular", () => {
  const now = 2_000_000_000_000;

  assert.equal(getPwaInstallReminderDelayMs(1), 7 * DAY_MS);
  assert.equal(getPwaInstallReminderDelayMs(2), 30 * DAY_MS);
  assert.equal(getPwaInstallReminderDelayMs(3), Number.POSITIVE_INFINITY);
  assert.equal(shouldAutomaticallyOfferPwaInstall(null, now), true);
  assert.equal(
    shouldAutomaticallyOfferPwaInstall(
      { dismissedAt: now - 6 * DAY_MS, dismissCount: 1 },
      now,
    ),
    false,
  );
  assert.equal(
    shouldAutomaticallyOfferPwaInstall(
      { dismissedAt: now - 7 * DAY_MS, dismissCount: 1 },
      now,
    ),
    true,
  );
  assert.equal(
    shouldAutomaticallyOfferPwaInstall(
      { dismissedAt: now - 29 * DAY_MS, dismissCount: 2 },
      now,
    ),
    false,
  );
  assert.equal(
    shouldAutomaticallyOfferPwaInstall(
      { dismissedAt: now - 30 * DAY_MS, dismissCount: 2 },
      now,
    ),
    true,
  );
  assert.equal(
    shouldAutomaticallyOfferPwaInstall(
      { dismissedAt: now - 365 * DAY_MS, dismissCount: 3 },
      now,
    ),
    false,
  );
  assert.equal(
    shouldAutomaticallyOfferPwaInstall(
      { dismissedAt: now + DAY_MS, dismissCount: 1 },
      now,
    ),
    false,
  );
});

test("minimal localStorage tercihi geçersiz veya engelli depolamada uygulamayı bozmaz", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const preference = createNextPwaInstallPreference(null, 1_900_000_000_000);

  writePwaInstallPreference(storage, preference);
  assert.deepEqual(readPwaInstallPreference(storage), preference);
  assert.equal(
    values.get(PWA_INSTALL_DISMISSED_AT_STORAGE_KEY),
    "1900000000000",
  );
  assert.equal(values.get(PWA_INSTALL_DISMISS_COUNT_STORAGE_KEY), "1");

  values.set(PWA_INSTALL_DISMISS_COUNT_STORAGE_KEY, "invalid");
  assert.equal(readPwaInstallPreference(storage), null);

  const blockedStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };

  assert.doesNotThrow(() => readPwaInstallPreference(blockedStorage));
  assert.doesNotThrow(() => writePwaInstallPreference(blockedStorage, preference));
  assert.doesNotThrow(() => clearPwaInstallPreference(blockedStorage));
});

test("native prompt helper gerçek event promptunu yalnız bir kez çağırıp sonucu döndürür", async () => {
  let promptCount = 0;
  const event = {
    prompt: async () => {
      promptCount += 1;
    },
    userChoice: Promise.resolve({
      outcome: "accepted" as const,
      platform: "web",
    }),
  } as BeforeInstallPromptEvent;

  assert.deepEqual(await promptForPwaInstall(event), {
    outcome: "accepted",
    platform: "web",
  });
  assert.equal(promptCount, 1);
});

test("controller install eventlerini tek yerde yakalar, otomatik prompt açmaz ve cleanup yapar", () => {
  assert.match(provider, /event\.preventDefault\(\)/);
  assert.match(provider, /deferredPromptRef\.current = event/);
  assert.match(provider, /deferredPromptRef\.current = null;[\s\S]*?promptForPwaInstall\(deferredPrompt\)/);
  assert.match(provider, /choice\.outcome === "accepted"/);
  assert.match(provider, /dismissAutomaticOffer\(\)/);
  assert.match(provider, /window\.addEventListener\("appinstalled"/);
  assert.match(provider, /window\.removeEventListener\("appinstalled"/);
  assert.match(provider, /standaloneMedia\.addEventListener\("change"/);
  assert.match(provider, /standaloneMedia\.removeEventListener\("change"/);
  assert.match(provider, /PWA_INSTALL_AUTO_PROMPT_DELAY_MS/);
  assert.match(provider, /window\.clearTimeout\(timerId\)/);

  const eventEffectStart = provider.indexOf("useEffect(() => {\n    const standaloneMedia");
  const eventEffect = provider.slice(eventEffectStart);

  assert.doesNotMatch(eventEffect, /\.prompt\(\)/);
});

test("kurulum kartı HUD üzerinde küçük, gecikmeli ve diğer oyun katmanları açıkken gizlidir", () => {
  assert.match(shell, /<PwaInstallProvider>/);
  assert.match(header, /<PwaInstallAssistant/);
  assert.match(header, /mobileSheetOpen \|\| activePanel !== null \|\| activeShiftPlayback !== null/);
  assert.match(assistant, /isAutomaticOfferReady && !blocked && !instructionsOpen/);
  assert.match(assistant, /data-pwa-install-card/);
  assert.match(assistantStyles, /position:\s*fixed/);
  assert.match(assistantStyles, /--game-mobile-header-height/);
  assert.match(assistantStyles, /safe-area-inset-left/);
  assert.match(assistantStyles, /safe-area-inset-right/);
  assert.match(assistantStyles, /width:\s*min\(100%, 430px\)/);
  assert.match(
    assistantStyles,
    /game-shell:has\(\[data-shift-control-state="pending"\]\)[\s\S]*?\.cardLayer[\s\S]*?display:\s*none/,
  );
  assert.doesNotMatch(assistantStyles, /-webkit-overflow-scrolling/);
});

test("iOS yardım dialogu erişilebilir adımları, focus dönüşünü ve reduced motion davranışını taşır", () => {
  assert.match(assistant, /<DialogTitle/);
  assert.match(assistant, /<DialogDescription/);
  assert.match(assistant, /<DialogClose asChild>/);
  assert.match(assistant, /onCloseAutoFocus/);
  assert.match(assistant, /returnFocusTargetRef\.current\?\.focus\(\)/);
  assert.match(assistant, /data-pwa-install-instructions/);
  assert.match(assistant, /copy\.iosSteps\.map/);
  assert.match(assistantStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(copy, /Safari’de Paylaş simgesine dokun/);
  assert.match(copy, /“Ana Ekrana Ekle” seçeneğini aç/);
  assert.match(copy, /Tap the Share button in Safari/);
  assert.match(copy, /Select “Add to Home Screen”/);
});

test("Fabrika Durumu yalnız uygun platformda en az 44px manuel kurulum satırı sunar", () => {
  assert.match(header, /capability === "android-available" \|\| capability === "ios-instructions"/);
  assert.match(header, /manualIos/);
  assert.match(header, /manualNative/);
  assert.match(header, /installAction \? \(/);
  assert.match(header, /<MobileManagementAction[\s\S]*?icon=\{installAction\.icon\}/);
  assert.match(header, /className="flex min-h-11 w-full/);
  assert.match(header, /setMobileSheetOpen\(false\)/);
  assert.match(header, /requestInstall\(mobileStatusTriggerRef\.current\)/);
});

test("FAZ 4B service worker, offline cache, analytics veya yeni onboarding sistemi eklemez", () => {
  const combinedSource = `${provider}${assistant}${header}${shell}`;

  assert.doesNotMatch(
    combinedSource,
    /serviceWorker|service-worker|workbox|offline fallback|runtime caching|precache|analytics|trackEvent/,
  );
});

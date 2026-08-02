import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import sharp from "sharp";

import manifest from "./manifest";
import {
  FACTORY_RUNWAY_BACKGROUND_COLOR,
  FACTORY_RUNWAY_THEME_COLOR,
} from "./pwa-config";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function pathFromApp(relativePath: string) {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

const manifestSource = readSource("./manifest.ts");
const pwaConfigSource = readSource("./pwa-config.ts");
const globals = readSource("./globals.css");
const defaultLayout = readSource("./(default-tr)/layout.tsx");
const englishLayout = readSource("./(landing-en)/layout.tsx");
const turkishLayout = readSource("./(landing-tr)/layout.tsx");
const gameLayout = readSource("./(default-tr)/game/layout.tsx");

test("tek merkezi manifest stabil oyun başlangıcı ve root scope döndürür", () => {
  const value = manifest();

  assert.equal(value.name, "FactoryRunway");
  assert.equal(value.short_name, "FactoryRun");
  assert.equal(value.id, "/game");
  assert.equal(value.start_url, "/game");
  assert.equal(value.scope, "/");
  assert.equal(value.display, "standalone");
  assert.equal(value.theme_color, FACTORY_RUNWAY_THEME_COLOR);
  assert.equal(value.background_color, FACTORY_RUNWAY_BACKGROUND_COLOR);
  assert.ok(value.description);
  assert.equal("orientation" in value, false);
  assert.doesNotMatch(String(value.start_url), /\?/);
  assert.match(manifestSource, /MetadataRoute\.Manifest/);
});

test("manifest standard ve ayrı maskable icon sözleşmesini taşır", () => {
  const icons = manifest().icons ?? [];

  assert.deepEqual(
    icons.map((icon) => ({
      purpose: icon.purpose,
      sizes: icon.sizes,
      src: icon.src,
      type: icon.type,
    })),
    [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/factoryrunway-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/factoryrunway-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/factoryrunway-maskable-512.png",
        type: "image/png",
      },
    ],
  );
});

test("Apple, standard ve maskable dosyaları gerçek opak PNG ölçülerine sahiptir", async () => {
  const iconSpecs = [
    { height: 180, path: "./apple-icon.png", width: 180 },
    {
      height: 192,
      path: "../../public/icons/factoryrunway-192.png",
      width: 192,
    },
    {
      height: 512,
      path: "../../public/icons/factoryrunway-512.png",
      width: 512,
    },
    {
      height: 512,
      path: "../../public/icons/factoryrunway-maskable-512.png",
      width: 512,
    },
  ];

  for (const spec of iconSpecs) {
    const path = pathFromApp(spec.path);
    const bytes = readFileSync(path);
    const metadata = await sharp(bytes).metadata();
    const cornerPixel = await sharp(bytes)
      .extract({ height: 1, left: 0, top: 0, width: 1 })
      .raw()
      .toBuffer();

    assert.ok(bytes.length > 0, `${path} boş olmamalı`);
    assert.deepEqual(
      [...bytes.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${path} PNG imzası taşımıyor`,
    );
    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, spec.width);
    assert.equal(metadata.height, spec.height);
    assert.equal(metadata.hasAlpha, false);
    assert.deepEqual([...cornerPixel], [35, 36, 41]);
  }
});

test("maskable icon standard 512 dosyasından ayrı üretilir", () => {
  const standard = readFileSync(
    pathFromApp("../../public/icons/factoryrunway-512.png"),
  );
  const maskable = readFileSync(
    pathFromApp("../../public/icons/factoryrunway-maskable-512.png"),
  );
  const digest = (value: Buffer) =>
    createHash("sha256").update(value).digest("hex");

  assert.notEqual(digest(standard), digest(maskable));
});

test("manifest icon URL'lerinin tamamı gerçek public dosyalarıyla eşleşir", () => {
  for (const icon of manifest().icons ?? []) {
    assert.ok(
      existsSync(pathFromApp(`../../public${icon.src}`)),
      `${icon.src} public klasöründe bulunamadı`,
    );
  }
});

test("root metadata tekrar edilmeden manifest, Apple modu ve mevcut SVG faviconu sunar", () => {
  for (const layout of [defaultLayout, englishLayout, turkishLayout]) {
    assert.match(layout, /factoryRunwayRootMetadata/);
    assert.match(layout, /factoryRunwayRootViewport/);
    assert.doesNotMatch(layout, /factoryRunwayIcon\s*=/);
  }

  assert.match(pwaConfigSource, /appleWebApp:\s*\{/);
  assert.match(pwaConfigSource, /statusBarStyle:\s*"black-translucent"/);
  assert.match(pwaConfigSource, /url:\s*"\/apple-icon\.png"/);
  assert.match(pwaConfigSource, /sizes:\s*"180x180"/);
  assert.match(pwaConfigSource, /url:\s*"\/factoryRunway\.svg"/);
  assert.ok(existsSync(pathFromApp("./favicon.ico")));
  assert.ok(existsSync(pathFromApp("../../public/factoryRunway.svg")));
  assert.ok(existsSync(pathFromApp("./apple-icon.png")));
});

test("theme renkleri mevcut CSS tokenıyla aynıdır ve oyun viewport-fit cover kullanır", () => {
  assert.match(globals, /--background:\s*#232429/);
  assert.equal(FACTORY_RUNWAY_THEME_COLOR, "#232429");
  assert.equal(FACTORY_RUNWAY_BACKGROUND_COLOR, "#232429");
  assert.match(gameLayout, /factoryRunwayGameViewport/);
  assert.match(pwaConfigSource, /viewportFit:\s*"cover"/);
  assert.doesNotMatch(pwaConfigSource, /maximumScale|userScalable/);
});

test("PWA start URL mevcut root cookie, login, player gate ve logout zincirini kullanır", () => {
  const gamePage = readSource("./(default-tr)/game/page.tsx");
  const playerPage = readSource("./(default-tr)/player/page.tsx");
  const userActions = readSource("./user-actions.ts");
  const session = readSource("../lib/auth/session.ts");

  assert.match(gamePage, /if \(!user\) \{\s*redirect\("\/"\)/);
  assert.match(userActions, /redirect\("\/player"\)/);
  assert.match(playerPage, /redirect\(redirectTo \?\? "\/game"\)/);
  assert.match(userActions, /export async function logoutAction[\s\S]*?redirect\("\/"\)/);
  assert.match(session, /path:\s*"\/"/);
});

test("standalone locale değişimi mevcut oyuncu tercihini kaydedip game route'unu yeniler", () => {
  const gamePage = readSource("./(default-tr)/game/page.tsx");
  const localeAction = readSource("./player-locale-actions.ts");
  const localeSwitcher = readSource("../components/game-locale-switcher.tsx");

  assert.match(gamePage, /getPlayerPreferredLocale\(user\.id\)/);
  assert.match(localeAction, /data:\s*\{ preferredLocale: normalizeLocale\(locale\) \}/);
  assert.match(localeAction, /revalidatePath\("\/game"\)/);
  assert.match(localeSwitcher, /updatePlayerPreferredLocaleAction\(selectedLocale\)/);
  assert.match(localeSwitcher, /window\.location\.reload\(\)/);
});

test("temel PWA kabuğu service worker, offline cache veya install prompt eklemez", () => {
  const packageJson = readSource("../../package.json");

  assert.equal(existsSync(pathFromApp("../../public/sw.js")), false);
  assert.equal(existsSync(pathFromApp("../../public/service-worker.js")), false);
  assert.doesNotMatch(packageJson, /next-pwa|workbox/);
  assert.doesNotMatch(
    `${manifestSource}${pwaConfigSource}`,
    /serviceWorker|beforeinstallprompt|display-mode|orientation:/,
  );
});

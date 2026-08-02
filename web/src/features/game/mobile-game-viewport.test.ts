import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const shell = readSource("./components/game-shell.tsx");
const factoryMap = readSource("./components/factory-map.tsx");
const topStatusBar = readSource("./components/top-status-bar.tsx");
const dockMenu = readSource("./components/dock-menu.tsx");
const leftDockMenu = readSource("./components/left-dock-menu.tsx");
const shiftControlBar = readSource("./components/shift-control-bar.tsx");
const shiftControlStyles = readSource(
  "./components/shift-control-bar.module.css",
);
const layout = readSource("../../app/(default-tr)/game/layout.tsx");
const globals = readSource("../../app/globals.css");
const mapLayout = readSource("./factory-map-layout.ts");

test("oyun route'u dinamik viewport'a sabitlenir ve belge yüksekliği üretmez", () => {
  assert.match(
    shell,
    /className="game-shell fixed inset-0 h-screen h-dvh w-full overflow-hidden overscroll-none bg-background text-foreground [^"]+"/,
  );
  assert.doesNotMatch(shell, /min-h-screen/);
});

test("oyun belge scroll kilidi önceki html ve body değerlerini cleanup sırasında geri yükler", () => {
  assert.match(shell, /function useGameDocumentScrollLock/);
  assert.match(shell, /bodyOverflow:\s*body\.style\.overflow/);
  assert.match(shell, /htmlOverflow:\s*html\.style\.overflow/);
  assert.match(shell, /html\.style\.overflow = "hidden"/);
  assert.match(shell, /body\.style\.overflow = "hidden"/);
  assert.match(shell, /html\.style\.overflow = previousStyles\.htmlOverflow/);
  assert.match(shell, /body\.style\.overflow = previousStyles\.bodyOverflow/);
});

test("game layout viewport-fit cover kullanır ve erişilebilir kullanıcı zoom'unu yasaklamaz", () => {
  assert.match(layout, /export const viewport:\s*Viewport/);
  assert.match(layout, /width:\s*"device-width"/);
  assert.match(layout, /initialScale:\s*1/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.doesNotMatch(layout, /maximumScale|userScalable/);
});

test("mobil HUD kenarları max kullanmadan safe-area insetlerine bağlanır", () => {
  assert.match(topStatusBar, /game-top-status-bar pointer-events-none/);
  assert.match(dockMenu, /game-bottom-dock pointer-events-none/);
  assert.match(leftDockMenu, /game-left-hud pointer-events-none/);
  assert.match(shiftControlBar, /game-bottom-control/);
  assert.match(shiftControlStyles, /\.layer\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(
    topStatusBar,
    /top:\s*"calc\(env\(safe-area-inset-top, 0px\) \+ var\(--game-header-block-offset, 0\.5rem\)\)"/,
  );
  assert.match(
    dockMenu,
    /bottom:\s*\n?\s*"calc\(env\(safe-area-inset-bottom, 0px\) \+ var\(--game-dock-edge-offset\)\)"/,
  );
  assert.match(
    leftDockMenu,
    /left:\s*"calc\(env\(safe-area-inset-left, 0px\) \+ var\(--game-left-edge-offset, 0\.5rem\)\)"/,
  );
  assert.match(
    dockMenu,
    /right:\s*\n?\s*"calc\(env\(safe-area-inset-right, 0px\) \+ var\(--game-dock-edge-offset\)\)"/,
  );
  assert.doesNotMatch(
    `${topStatusBar}${dockMenu}${leftDockMenu}${shiftControlBar}`,
    /max\([^\n]*safe-area-inset-(?:top|right|bottom|left)/,
  );
});

test("Safari alt araç çubuğu dock'u görsel viewport içinde tutar", () => {
  assert.match(shell, /function useGameVisualViewportHeight/);
  assert.match(
    shell,
    /shell\.style\.height = `\$\{Math\.round\(visualViewport\.height\)\}px`/,
  );
  assert.match(shell, /visualViewport\.addEventListener\("resize"/);
  assert.match(shell, /visualViewport\.addEventListener\("scroll"/);
  assert.match(shell, /visualViewport\.removeEventListener\("resize"/);
  assert.match(shell, /visualViewport\.removeEventListener\("scroll"/);
  assert.match(shell, /shell\.style\.removeProperty\("height"\)/);
});

test("HUD boşlukları haritaya geçerken gerçek kontroller pointer olaylarını alır", () => {
  assert.match(topStatusBar, /pointer-events-auto mx-auto/);
  assert.match(dockMenu, /pointer-events-auto flex/);
  assert.match(leftDockMenu, /pointer-events-auto relative/);
  assert.match(shiftControlBar, /<div className="pointer-events-auto">/);
});

test("harita visual viewport resize altyapısı responsive kamerayı tek RAF içinde günceller", () => {
  const resizeEffectStart = factoryMap.indexOf("let animationFrameId");
  const resizeEffectEnd = factoryMap.indexOf("const releaseMapDrag", resizeEffectStart);
  const resizeEffect = factoryMap.slice(resizeEffectStart, resizeEffectEnd);

  assert.match(resizeEffect, /window\.visualViewport/);
  assert.match(resizeEffect, /visualViewport\?\.addEventListener\("resize"/);
  assert.match(resizeEffect, /visualViewport\?\.removeEventListener\("resize"/);
  assert.match(resizeEffect, /new ResizeObserver\(scheduleCameraBoundsSync\)/);
  assert.match(resizeEffect, /resizeObserver\.disconnect\(\)/);
  assert.match(resizeEffect, /window\.requestAnimationFrame/);
  assert.match(resizeEffect, /window\.cancelAnimationFrame/);
  assert.match(resizeEffect, /boundOffsetToViewport\(proposedOffset, viewportRect\)/);
  assert.match(resizeEffect, /getFactoryMapInitialOffset\(\{/);
  assert.match(resizeEffect, /getFactoryMapReanchoredOffset\(\{/);
  assert.doesNotMatch(resizeEffect, /setMapZoom|setMapPan\(\{\s*x:\s*0/);
});

test("harita etkileşim yüzeyi touch panı ve masaüstü temel ölçeğini korur", () => {
  assert.match(
    globals,
    /\.factory-map-viewport\s*\{[\s\S]*?touch-action:\s*none;[\s\S]*?user-select:\s*none;[\s\S]*?-webkit-user-select:\s*none;/,
  );
  assert.match(factoryMap, /onPointerDown=/);
  assert.match(factoryMap, /onPointerMove=/);
  assert.match(factoryMap, /onPointerUp=/);
  assert.match(factoryMap, /onPointerCancel=/);
  assert.match(factoryMap, /setPointerCapture/);
  assert.match(mapLayout, /FACTORY_MAP_BASE_SCALE = 0\.82/);
});

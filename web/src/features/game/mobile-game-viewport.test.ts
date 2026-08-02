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
const pwaConfig = readSource("../../app/pwa-config.ts");
const globals = readSource("../../app/globals.css");
const mapLayout = readSource("./factory-map-layout.ts");
const mapGesture = readSource("./factory-map-gesture.ts");

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
  assert.match(shell, /body\.style\.position = "fixed"/);
  assert.match(shell, /body\.style\.top = `\$\{-scrollY\}px`/);
  assert.match(shell, /body\.style\.left = `\$\{-scrollX\}px`/);
  assert.match(shell, /body\.style\.height = "100%"/);
  assert.match(shell, /html\.style\.overflow = previousStyles\.htmlOverflow/);
  assert.match(shell, /body\.style\.overflow = previousStyles\.bodyOverflow/);
  assert.match(shell, /body\.style\.position = previousStyles\.bodyPosition/);
  assert.match(shell, /window\.scrollTo\(\{ behavior: "auto", left: scrollX, top: scrollY \}\)/);
});

test("game layout viewport-fit cover kullanır ve erişilebilir kullanıcı zoom'unu yasaklamaz", () => {
  assert.match(layout, /export const viewport:\s*Viewport/);
  assert.match(layout, /factoryRunwayGameViewport/);
  assert.match(pwaConfig, /width:\s*"device-width"/);
  assert.match(pwaConfig, /initialScale:\s*1/);
  assert.match(pwaConfig, /viewportFit:\s*"cover"/);
  assert.doesNotMatch(`${layout}${pwaConfig}`, /maximumScale|userScalable/);
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

test("normal Safari visual viewport'u izlerken standalone PWA stabil dvh kullanır", () => {
  assert.match(shell, /function useGameVisualViewportHeight/);
  assert.match(shell, /import \{ isRunningStandalone \} from "\.\.\/pwa-install"/);
  assert.match(shell, /if \(isRunningStandalone\(\)\)/);
  assert.match(shell, /setProperty\("--game-visual-viewport-height", "100dvh"\)/);
  assert.match(shell, /const viewportHeight = `\$\{Math\.round\(visualViewport\.height\)\}px`/);
  assert.match(shell, /shell\.style\.height = viewportHeight/);
  assert.match(
    shell,
    /shell\.style\.setProperty\("--game-visual-viewport-height", viewportHeight\)/,
  );
  assert.match(shell, /visualViewport\.addEventListener\("resize"/);
  assert.match(shell, /visualViewport\.addEventListener\("scroll"/);
  assert.match(shell, /visualViewport\.removeEventListener\("resize"/);
  assert.match(shell, /visualViewport\.removeEventListener\("scroll"/);
  assert.match(shell, /shell\.style\.removeProperty\("height"\)/);
  assert.match(shell, /const initialViewportHeight = shell\.style\.getPropertyValue/);
  assert.match(
    shell,
    /shell\.style\.setProperty\(\s*"--game-visual-viewport-height",\s*initialViewportHeight,/,
  );
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
  assert.match(factoryMap, /lockToAxis: event\.pointerType === "touch"/);
  assert.match(factoryMap, /resolveFactoryMapDragAxis\(\{/);
  assert.match(factoryMap, /getFactoryMapDragDelta\(\{/);
  assert.match(mapGesture, /return Math\.abs\(deltaX\) >= Math\.abs\(deltaY\)/);
  assert.match(mapGesture, /axis === "horizontal"/);
  assert.match(mapGesture, /axis === "vertical"/);
  assert.match(mapLayout, /FACTORY_MAP_BASE_SCALE = 0\.82/);
});

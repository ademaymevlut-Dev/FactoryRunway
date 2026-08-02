import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const shiftControl = readSource("./components/shift-control-bar.tsx");
const shiftStyles = readSource("./components/shift-control-bar.module.css");
const shell = readSource("./components/game-shell.tsx");
const dock = readSource("./components/dock-menu.tsx");
const factoryMap = readSource("./components/factory-map.tsx");
const copy = readSource("./game-copy.ts");

test("mobil ana vardiya eylemi dock ve header dışında bağımsız HUD katmanında kalır", () => {
  assert.match(shiftControl, /data-mobile-primary-action="shift"/);
  assert.match(shell, /<DockMenu snapshot=\{initialSnapshot\} \/>[\s\S]*?<ShiftControlBar/);
  assert.doesNotMatch(dock, /ShiftControlBar|data-mobile-primary-action/);
  assert.match(shiftStyles, /justify-content:\s*center/);
  assert.match(shiftStyles, /bottom:\s*calc\([\s\S]*?--game-dock-height[\s\S]*?--game-shift-dock-gap/);
});

test("dock yüksekliği tek CSS değişkenine ResizeObserver ile aktarılır", () => {
  assert.match(shell, /MOBILE_DOCK_HEIGHT_FALLBACK_PX = 50/);
  assert.match(shell, /MOBILE_SHIFT_DOCK_GAP_PX = 10/);
  assert.match(shell, /function useGameDockHeight/);
  assert.match(shell, /querySelector<HTMLElement>\("\.game-bottom-dock"\)/);
  assert.match(shell, /new ResizeObserver\(syncDockHeight\)/);
  assert.match(shell, /--game-dock-height/);
  assert.doesNotMatch(shiftStyles, /--game-dock-height\s*,/);
  assert.match(dock, /var\(--game-dock-edge-offset\)/);
});

test("telefon portrait ve coarse landscape görünümünde kapsül düzeni kullanılır", () => {
  assert.match(
    shiftStyles,
    /@media \(max-width: 639px\), \(pointer: coarse\)/,
  );
  assert.match(shiftStyles, /width:\s*clamp\(180px, 58vw, 230px\)/);
  assert.match(shiftStyles, /min-height:\s*48px/);
  assert.match(shiftStyles, /max-width:\s*calc\([\s\S]*?100vw[\s\S]*?safe-area-inset-left[\s\S]*?safe-area-inset-right/);
});

test("masaüstü vardiya kontrolünün mevcut kompakt ve geniş koordinatları korunur", () => {
  assert.match(shiftStyles, /left:\s*calc\(50% \+ var\(--shift-control-left-compact\)\)/);
  assert.match(
    shiftStyles,
    /@media \(min-width: 1280px\) and \(pointer: fine\)[\s\S]*?--shift-control-left-desktop/,
  );
  assert.match(shiftStyles, /width:\s*112px/);
  assert.match(shiftStyles, /height:\s*88px/);
});

test("mevcut action tek form zincirinde kalır ve aktif durumlarda tekrar çağrılamaz", () => {
  assert.match(shiftControl, /useActionState<[\s\S]*?>\(advanceFactoryDayAction, null\)/);
  assert.match(shiftControl, /<form action=\{formAction\}>/);
  assert.match(shiftControl, /const disabled = state !== "idle"/);
  assert.match(shiftControl, /disabled=\{disabled\}/);
  assert.match(shiftControl, /aria-busy=\{pending\}/);
  assert.match(shiftControl, /setActiveShiftPlayback\(actionResult\.playback\)/);
});

test("button pointer olayını haritaya taşımaz, boş wrapper haritayı engellemez", () => {
  assert.match(shiftStyles, /\.layer[\s\S]*?pointer-events:\s*none/);
  assert.match(shiftControl, /<div className="pointer-events-auto">/);
  assert.match(shiftControl, /disabled:pointer-events-auto/);
  assert.match(shiftControl, /onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(factoryMap, /onPointerDown=/);
});

test("shift kapsülü kamera inset ölçümünde kalır ve kamera state'i sıfırlanmaz", () => {
  assert.match(factoryMap, /bottomControl:\s*"\.game-bottom-control"/);
  assert.match(factoryMap, /readHudRect\(CAMERA_HUD_SELECTORS\.bottomControl\)/);
  assert.match(factoryMap, /resizeObserver\.observe\(hudElement\)/);
  assert.doesNotMatch(shiftControl, /setMapPan|setMapZoom/);
});

test("erişilebilir durumlar iki aktif dilin çeviri sözleşmesinden gelir", () => {
  assert.match(shiftControl, /<Button/);
  assert.match(shiftControl, /aria-label=\{actionLabel\}/);
  assert.match(shiftControl, /aria-busy=\{pending\}/);
  assert.match(copy, /completed:\s*"Gün Sonu Özeti"/);
  assert.match(copy, /pending:\s*"Vardiya hazırlanıyor"/);
  assert.match(copy, /playing:\s*"Vardiya sürüyor"/);
  assert.match(copy, /completed:\s*"End of Day Summary"/);
  assert.match(copy, /pending:\s*"Preparing shift"/);
  assert.match(copy, /playing:\s*"Shift in progress"/);
  assert.doesNotMatch(shiftControl, /Vardiyayı|Vardiya sürüyor|Gün Sonu/);
});

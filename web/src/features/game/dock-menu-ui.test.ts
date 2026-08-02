import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const dock = readSource("./components/dock-menu.tsx");
const styles = readSource("./components/dock-menu.module.css");
const topStatusStyles = readSource("./components/top-status-bar.module.css");
const shell = readSource("./components/game-shell.tsx");

test("mobil dock dış ölçüm kabını koruyup yalnız içeriğini yatay kaydırır", () => {
  assert.match(dock, /game-bottom-dock pointer-events-none/);
  assert.match(dock, /data-dock-scroll-container="true"/);
  assert.match(styles, /overflow-x:\s*auto/);
  assert.match(styles, /overflow-y:\s*hidden/);
  assert.match(styles, /overscroll-behavior-inline:\s*contain/);
  assert.match(styles, /scrollbar-width:\s*none/);
  assert.match(styles, /touch-action:\s*pan-x/);
  assert.doesNotMatch(`${styles}${topStatusStyles}`, /-webkit-overflow-scrolling/);
  assert.match(styles, /\.glassSurface\s*\{[\s\S]*?backdrop-filter:\s*blur\(24px\)/);
  assert.match(styles, /\.scroller\s*\{[\s\S]*?position:\s*relative[\s\S]*?z-index:\s*10/);
  assert.doesNotMatch(
    dock,
    /styles\.frame[^\n]*[\s\S]{0,240}backdrop-blur-xl/,
  );
  assert.match(styles, /\.items\s*\{[\s\S]*?width:\s*max-content[\s\S]*?min-width:\s*100%[\s\S]*?justify-content:\s*center/);
  assert.match(
    shell,
    /querySelector<HTMLElement>\("\.game-bottom-dock"\)[\s\S]*?resizeObserver\.observe\(dock\)/,
  );
});

test("mobil departman hedefleri küçülmeden 48 piksel kalır", () => {
  assert.match(
    styles,
    /@media \(max-width: 639px\), \(pointer: coarse\)[\s\S]*?\.button,[\s\S]*?width:\s*48px[\s\S]*?min-width:\s*48px[\s\S]*?height:\s*48px[\s\S]*?min-height:\s*48px/,
  );
  assert.match(dock, /shrink-0/);
  assert.match(dock, /size-5[\s\S]*?xl:size-8/);
  assert.match(styles, /overflow-y:\s*hidden/);
  assert.match(styles, /padding:\s*4px/);
});

test("edge fade yalnız gerçek taşma state'inden gelir ve pointer olayı almaz", () => {
  assert.match(dock, /getDockOverflowState/);
  assert.match(dock, /window\.requestAnimationFrame\(syncOverflow\)/);
  assert.match(dock, /overflow\.canScrollLeft \? \(/);
  assert.match(dock, /overflow\.canScrollRight \? \(/);
  assert.match(dock, /data-dock-edge="left"/);
  assert.match(dock, /data-dock-edge="right"/);
  assert.match(styles, /\.edgeFade\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.doesNotMatch(dock, /onWheel/);
});

test("aktif ve klavye odaklı öğe yalnız kadraj dışındaysa görünür yapılır", () => {
  assert.match(dock, /getDockItemScrollTarget/);
  assert.match(dock, /if \(targetScrollLeft === null\) return/);
  assert.match(dock, /activeDockItemIdRef\.current = activeDockItemId/);
  assert.match(dock, /scheduleActiveItemVisibility\(\)/);
  assert.match(dock, /prefers-reduced-motion: reduce/);
  assert.match(dock, /const usesCoarsePointer = window\.matchMedia\("\(pointer: coarse\)"\)\.matches/);
  assert.match(dock, /prefersReducedMotion \|\| usesCoarsePointer \? "auto" : "smooth"/);
  assert.match(dock, /handleDockItemFocus\(event, item\.id\)/);
  assert.match(dock, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(dock, /aria-pressed=\{isActive\}/);
});

test("dock scroll konumu lifecycle ve ölçü değişimlerinde geçerli aralığa alınır", () => {
  assert.match(dock, /const clampScrollPosition = useCallback\(\(\) =>/);
  assert.match(dock, /Math\.min\(maximumScrollLeft, scroller\.scrollLeft\)/);
  assert.match(dock, /activeDockItemIdRef\.current = activeDockItemId;[\s\S]*?clampScrollPosition\(\)/);
  assert.match(dock, /window\.addEventListener\("pageshow", handleLayoutChange\)/);
  assert.match(dock, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(dock, /window\.removeEventListener\("pageshow", handleLayoutChange\)/);
  assert.match(dock, /document\.removeEventListener\("visibilitychange", handleVisibilityChange\)/);
});

test("yatay swipe yanlış click'i ve harita etkileşimine taşmayı engeller", () => {
  assert.match(dock, /DOCK_SWIPE_THRESHOLD_PX = 8/);
  assert.match(dock, /horizontalDistance > verticalDistance/);
  assert.match(dock, /suppressNextClickRef\.current = gesture\.dragged/);
  assert.match(dock, /onClickCapture=\{handleClickCapture\}/);
  assert.match(dock, /event\.preventDefault\(\)/);
  assert.match(dock, /event\.stopPropagation\(\)/);
  assert.match(dock, /data-map-control="true"/);
  assert.doesNotMatch(dock, /setMapPan|setMapZoom/);
});

test("badge ve accessible ad aynı gerçek dock verisini korur", () => {
  assert.match(dock, /getDockItemAccessibleLabel\(item\)/);
  assert.match(dock, /`\$\{item\.label\}, \$\{item\.badge\.label\}: \$\{item\.badge\.count\}`/);
  assert.match(dock, /formatBadgeCount\(badge\.count\)/);
  assert.match(dock, /absolute -right-1 -top-1/);
});

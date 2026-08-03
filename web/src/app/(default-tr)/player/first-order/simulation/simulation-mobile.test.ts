import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("mobile first simulation replaces three large cards with one active line workspace", () => {
  const client = source("./simulation-client.tsx");

  assert.match(client, /<MobileSimulationWorkspace/);
  assert.match(client, /space-y-2\.5 md:hidden/);
  assert.match(client, /role="tablist"/);
  assert.match(client, /role="tabpanel"/);
  assert.match(client, /h-\[190px\] overflow-hidden/);
  assert.match(client, /hidden grid-cols-1 gap-3 md:grid lg:grid-cols-3/);
  assert.match(client, /mt-3 h-\[360px\]/);
});

test("mobile first simulation keeps day progress and all three production totals visible", () => {
  const client = source("./simulation-client.tsx");
  const copy = source("../first-order-copy.ts");

  assert.match(client, /function MobileDayStepper/);
  assert.match(client, /simulationDayIndexes = \[0, 1, 2\]/);
  assert.match(client, /hidden text-xs font-semibold uppercase[\s\S]*?md:block/);
  assert.match(client, /grid grid-cols-3 gap-2/);
  assert.match(client, /function MobileLineMetric/);
  assert.match(client, /copy\.shiftProgress\(activeDayIndex \+ 1, activeGameDay\)/);
  assert.match(copy, /shiftProgress: \(shift: number, gameDay: number\)/);
});

test("mobile first simulation uses a safe full-width action without changing completion behavior", () => {
  const client = source("./simulation-client.tsx");
  const viewportHook = source("../../../../../hooks/use-visual-viewport-bottom-inset.ts");

  assert.match(client, /useVisualViewportBottomInset\(simulationRef\)/);
  assert.match(client, /bottom-\[var\(--visual-viewport-bottom,0px\)\]/);
  assert.match(client, /env\(safe-area-inset-bottom\)/);
  assert.match(client, /min-h-12 w-full rounded-full/);
  assert.match(client, /action=\{completeFirstSimulationAction\}/);
  assert.match(client, /setRunningDay\(completedDays\)/);
  assert.match(viewportHook, /const layoutViewportHeight = window\.innerHeight/);
  assert.match(viewportHook, /visualViewport\.addEventListener\("resize"/);
  assert.match(viewportHook, /visualViewport\.addEventListener\("scroll"/);
});

test("mobile first simulation allows one document scroll while preserving larger screens", () => {
  const client = source("./simulation-client.tsx");
  const globals = source("../../../../globals.css");

  assert.match(client, /first-order-simulation shift-game/);
  assert.match(client, /min-h-dvh[\s\S]*?md:min-h-screen md:px-5 md:py-5/);
  assert.match(globals, /@media \(max-width: 767px\)[\s\S]*?\.first-order-simulation\.shift-game[\s\S]*?min-height: 100dvh;[\s\S]*?overflow: visible;/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("playback HUD sabit overlay, global saat ve kullanıcı close sözleşmesini kullanır", () => {
  const hud = readSource("./components/shift-playback-hud.tsx");
  const store = readSource("./store/game-ui-store.tsx");

  assert.match(hud, /data-shift-playback-hud/);
  assert.match(hud, /router\.refresh\(\)/);
  assert.match(hud, /dismissShiftPlayback/);
  assert.match(hud, /closingShiftId === activeShiftPlayback\.shiftId/);
  assert.match(hud, /disabled=\{!isFinal \|\| isClosing\}/);
  assert.doesNotMatch(hud, /requestAnimationFrame/);
  assert.match(hud, /shiftPlaybackNowMs/);
  assert.doesNotMatch(hud, /setInterval|setTimeout/);
  assert.match(store, /requestAnimationFrame/);
  assert.doesNotMatch(store, /setInterval|setTimeout/);
});

test("departman kartları kontrollü CountUp hedefi ve final kesinliği kullanır", () => {
  const card = readSource("./components/shift-department-card.tsx");
  const countUp = readSource("../../components/ui/CountUp.tsx");
  const hud = readSource("./components/shift-playback-hud.tsx");

  assert.match(card, /<CountUp/);
  assert.match(card, /value=\{value\}/);
  assert.match(card, /value=\{efficiency\}/);
  assert.match(card, /immediate=\{isFinal\}/);
  assert.match(card, /efficiencyBps: number/);
  assert.doesNotMatch(card, /%\\{efficiency\\}/);
  assert.match(hud, /department\.performance\.efficiencyBps \* progress/);
  assert.match(countUp, /useReducedMotion/);
  assert.match(countUp, /springValue\.jump\(target\)/);
});

test("vardiya boyunca yönetim yüzeyi merkezi bir UI kilidiyle korunur", () => {
  const lock = readSource("./components/shift-playback-interaction-lock.tsx");
  const shell = readSource("./components/game-shell.tsx");

  assert.match(lock, /activeShiftPlayback/);
  assert.match(lock, /data-shift-playback-lock/);
  assert.match(shell, /<ShiftPlaybackInteractionLock \/>/);
});

test("günlük olay paneli ayrı sağ panel olarak shell içinde yer alır", () => {
  const panel = readSource("./components/daily-event-panel.tsx");
  const shell = readSource("./components/game-shell.tsx");

  assert.match(shell, /<DailyEventPanel \/>/);
  assert.match(panel, /data-daily-event-panel/);
  assert.match(panel, /right-4 top-6/);
  assert.match(panel, /max-w-\[calc\(100vw-24px\)\]/);
  assert.match(panel, /overscroll-contain/);
  assert.match(panel, /prefers-reduced-motion/);
  assert.match(panel, /bg-background\/50/);
  assert.match(panel, /backdrop-blur-sm/);
  assert.match(panel, /bg-background\/45 p-4 backdrop-blur-md/);
  assert.match(panel, /shouldShowDailyEvent/);
  assert.match(panel, /!event\.eventKey\.startsWith\("department\."\)/);
  assert.match(panel, /displayableEvents\.length/);
  assert.match(panel, /xp\.shift_completed/);
  assert.match(panel, /formatFinanceCategory\(payload\.category\)/);
  assert.match(panel, /getEventVisualClass/);
});

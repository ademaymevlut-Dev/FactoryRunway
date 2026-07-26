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
  const resultView = readSource(
    "../../components/game-presentation/shift-department-result-view.tsx",
  );
  const countUp = readSource("../../components/ui/CountUp.tsx");
  const hud = readSource("./components/shift-playback-hud.tsx");

  assert.match(card, /ShiftDepartmentResultView/);
  assert.match(card, /shiftPlaybackCopy\[locale\]\.hud/);
  assert.match(card, /numberLocale=\{numberLocale\}/);
  assert.match(resultView, /<CountUp/);
  assert.match(resultView, /value=\{value\}/);
  assert.match(resultView, /value=\{utilizationPercent\}/);
  assert.match(resultView, /immediate=\{isFinal\}/);
  assert.match(card, /activeProductPreview/);
  assert.match(card, /getActiveProductPreview/);
  assert.doesNotMatch(card, /Başlangıç|Kalan|Kuyruğa giren|Çıkan|Aktif ürün/);
  assert.doesNotMatch(card, /fadeOutProgress/);
  assert.match(card, /throughputBps: number/);
  assert.doesNotMatch(card, /%\\{efficiency\\}/);
  assert.match(hud, /getDepartmentThroughputBps\(department\) \* progress/);
  assert.match(hud, /department\.performance\.usedPoints \* 10_000/);
  assert.match(hud, /department\.performance\.nominalCapacityPoints/);
  assert.match(countUp, /useReducedMotion/);
  assert.match(countUp, /springValue\.jump\(target\)/);
});

test("vardiya boyunca yönetim yüzeyi merkezi bir UI kilidiyle korunur", () => {
  const lock = readSource("./components/shift-playback-interaction-lock.tsx");
  const shell = readSource("./components/game-shell.tsx");

  assert.match(lock, /activeShiftPlayback/);
  assert.match(lock, /data-shift-playback-lock/);
  assert.match(lock, /shiftPlaybackCopy\[locale\]\.hud/);
  assert.match(shell, /<ShiftPlaybackInteractionLock locale=\{initialSnapshot\.locale\}/);
});

test("günlük olay paneli ayrı sağ panel olarak shell içinde yer alır", () => {
  const panel = readSource("./components/daily-event-panel.tsx");
  const shell = readSource("./components/game-shell.tsx");

  assert.match(
    shell,
    /<DailyEventPanel[\s\S]*?currencyCode=\{initialSnapshot\.factory\.currencyCode\}[\s\S]*?locale=\{initialSnapshot\.locale\}/,
  );
  assert.match(panel, /data-daily-event-panel/);
  assert.match(panel, /shiftPlaybackCopy\[locale\]\.dailyEvents/);
  assert.match(panel, /copy\.categories\[event\.category\]/);
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
  assert.match(panel, /getFinanceCategoryLabel\(copy, payload\.category\)/);
  assert.match(panel, /DailyEventRowView/);
  assert.match(panel, /getEventTone/);
  assert.match(panel, /getEventIconKey/);
  assert.match(panel, /badgeLabel=\{copy\.levelUpBadge\}/);
  assert.match(panel, /isLevelUpEvent/);
  assert.match(panel, /payload\.leveledUp === true/);
  assert.match(panel, /variant=\{isLevelUpEvent\(event\) \? "levelUp" : "default"\}/);
  assert.match(panel, /return "user"/);
  assert.match(panel, /return "wrench"/);
  assert.match(panel, /event\.category === "STAFF"/);
  assert.match(panel, /event\.category === "MACHINE"/);
  assert.match(panel, /chaos\.staff_absence\.minor/);
  assert.match(panel, /chaos\.machine\.minor_issue/);
  assert.match(panel, /renderChaosDescription/);
  assert.doesNotMatch(panel, /Günlük Olaylar|Vardiya başladı|Sipariş sevk edildi|Kapat/);
});

test("playback projection ve view servisleri locale translation seçimini kullanır", () => {
  const playback = readSource("./shift-playback.ts");
  const view = readSource("./services/shift-playback-view.ts");
  const projection = readSource("./services/shift-playback-projection.ts");
  const action = readSource("./actions/advance-factory-day-action.ts");

  assert.match(playback, /preferredTranslation\(localizedTranslations, locale\)/);
  assert.match(view, /locale\?: SupportedLocale/);
  assert.match(view, /toShiftPlayback\(shift, input\.now, locale\)/);
  assert.match(projection, /locale\?: SupportedLocale/);
  assert.match(projection, /getTranslationLocaleFallbacks\(locale\)/);
  assert.match(projection, /copy\.lineLabel\(chaosEvent\.factoryProductionLine\.lineNumber\)/);
  assert.match(action, /preferredLocale: true/);
  assert.match(action, /getShiftPlaybackById\(\{[\s\S]*?locale,/);
  assert.doesNotMatch(view, /where: \{ locale: "tr" \}/);
  assert.doesNotMatch(projection, /where: \{ locale: "tr" \}/);
});

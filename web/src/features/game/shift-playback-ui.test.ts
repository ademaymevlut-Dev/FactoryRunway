import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("playback HUD sabit overlay, global saat ve kullanıcı close sözleşmesini kullanır", () => {
  const hud = readSource("./components/shift-playback-hud.tsx");
  const layout = readSource("./components/shift-playback-overlay-layout.tsx");
  const store = readSource("./store/game-ui-store.tsx");

  assert.match(hud, /data-shift-playback-hud/);
  assert.match(layout, /data-shift-playback-overlay-layout/);
  assert.match(layout, /data-shift-overlay-progress-slot/);
  assert.match(hud, /router\.refresh\(\)/);
  assert.match(hud, /dismissShiftPlayback/);
  assert.match(hud, /closingShiftId === activeShiftPlayback\.shiftId/);
  assert.match(hud, /disabled=\{!isFinal \|\| isClosing\}/);
  assert.match(hud, /skipShiftPlaybackAction/);
  assert.match(hud, /copy\.skipAnimationLabel/);
  assert.match(hud, /finishActiveShiftPlayback/);
  assert.match(hud, /SKIPPED_SHIFT_PLAYBACK_DURATION_SECONDS/);
  assert.doesNotMatch(hud, /requestAnimationFrame/);
  assert.match(hud, /shiftPlaybackNowMs/);
  assert.doesNotMatch(hud, /setInterval|setTimeout/);
  assert.doesNotMatch(hud, /translate-x|pr-\[440px\]|absolute inset-x-0/);
  assert.match(store, /requestAnimationFrame/);
  assert.match(store, /finishShiftPlaybackImmediately/);
  assert.doesNotMatch(store, /setInterval|setTimeout/);
});

test("playback skip action yalnızca tamamlanmış güncel vardiyayı sahiplik ile bitirir", () => {
  const action = readSource("./actions/skip-shift-playback-action.ts");

  assert.match(action, /getCurrentUser/);
  assert.match(action, /factoryId: factory\.id/);
  assert.match(action, /gameDay: factory\.currentDay - 1/);
  assert.match(action, /status: ShiftSimulationStatus\.COMPLETED/);
  assert.match(action, /completedAt: \{ not: null \}/);
  assert.match(action, /simulationDurationSeconds: SKIPPED_SHIFT_PLAYBACK_DURATION_SECONDS/);
  assert.match(action, /revalidatePath\("\/game"\)/);
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
  const layout = readSource("./components/shift-playback-overlay-layout.tsx");
  const shell = readSource("./components/game-shell.tsx");

  assert.match(
    shell,
    /<ShiftPlaybackOverlayLayout[\s\S]*?currencyCode=\{initialSnapshot\.factory\.currencyCode\}[\s\S]*?locale=\{initialSnapshot\.locale\}/,
  );
  assert.match(layout, /<DailyEventPanel/);
  assert.match(layout, /<ShiftPlaybackHud/);
  assert.match(layout, /data-shift-overlay-events-slot/);
  assert.match(layout, /min-\[1180px\]:grid-cols-/);
  assert.match(layout, /360px/);
  assert.match(layout, /400px/);
  assert.match(layout, /removeStoredString/);
  assert.match(layout, /copy\.openAria/);
  assert.match(panel, /data-daily-event-panel/);
  assert.match(panel, /shiftPlaybackCopy\[locale\]\.dailyEvents/);
  assert.match(panel, /copy\.categories\[event\.category\]/);
  assert.match(panel, /relative flex size-full max-h-\[760px\]/);
  assert.match(panel, /onCloseComplete/);
  assert.doesNotMatch(panel, /absolute right-4|w-\[400px\]/);
  assert.match(panel, /overscroll-contain/);
  assert.match(panel, /prefers-reduced-motion/);
  assert.match(panel, /bg-background\/50/);
  assert.match(panel, /backdrop-blur-sm/);
  assert.match(panel, /bg-background\/45 p-3 backdrop-blur-md/);
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

test("650px altı playback simülasyon ve günlük olayları sıralı iki mobil görünümde sunar", () => {
  const hud = readSource("./components/shift-playback-hud.tsx");
  const layout = readSource("./components/shift-playback-overlay-layout.tsx");
  const panel = readSource("./components/daily-event-panel.tsx");

  assert.match(layout, /MOBILE_PLAYBACK_QUERY = "\(max-width: 649px\)"/);
  assert.match(layout, /type MobilePlaybackView = "events" \| "simulation"/);
  assert.match(layout, /data-mobile-playback-view=\{mobileView\}/);
  assert.match(layout, /mobileView === "simulation"/);
  assert.match(layout, /presentation="mobileCompact"/);
  assert.match(layout, /onCompletedClose=\{\(\) => setMobileView\("events"\)\}/);
  assert.match(layout, /presentation="mobile"/);
  assert.match(layout, /showAllImmediately/);
  assert.match(layout, /dismissShiftPlayback\(activeShiftPlayback\)/);
  assert.match(layout, /setActiveShiftPlayback\(null\)/);
  assert.match(layout, /finalizedMobileShiftIdRef/);
  assert.doesNotMatch(layout, /pointer: coarse/);
  assert.match(hud, /copy\.showDailyEventsLabel/);
  assert.match(hud, /copy\.mobileTotalProducedLabel/);
  assert.match(hud, /className="h-12 w-full rounded-xl/);
  assert.match(hud, /isMobileCompact && isFinal/);
  assert.match(panel, /showAllImmediately\s*\? eligibleEvents/);
  assert.match(panel, /if \(showAllImmediately\) return/);
});

test("mobil departman kartı yalnızca üretilen adedi ve aktif ürün adını korur", () => {
  const card = readSource("./components/shift-department-card.tsx");
  const resultView = readSource(
    "../../components/game-presentation/shift-department-result-view.tsx",
  );

  assert.match(card, /presentation\?: "default" \| "mobileCompact"/);
  assert.match(card, /isMobileCompact\s*\? \[/);
  assert.match(card, /label: copy\.mobileProducedLabel/);
  assert.match(card, /departmentIconKey=\{department\.departmentIconKey\}/);
  assert.match(resultView, /presentation === "mobileCompact"/);
  assert.match(resultView, /data-shift-department-presentation="mobile-compact"/);
  assert.match(resultView, /MobileDepartmentIcon iconKey=\{departmentIconKey\}/);
  assert.match(resultView, /ProductThumb[\s\S]*?activeProduct\.imageUrl/);
  assert.match(resultView, /activeProduct\.name/);
  assert.match(resultView, /metric\.key === "produced"/);
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

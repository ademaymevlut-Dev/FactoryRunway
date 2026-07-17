import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("üst HUD nakitten sonra XP metriğini üretir", () => {
  const snapshot = readSource("./services/game-snapshot.ts");
  const cashIndex = snapshot.indexOf('id: "cash"');
  const xpIndex = snapshot.indexOf('id: "xp"');

  assert.ok(cashIndex >= 0);
  assert.ok(xpIndex > cashIndex);
  assert.match(snapshot, /label: "Tecrübe"/);
  assert.match(snapshot, /value: `\$\{formatNumber\(factory\.currentXp\)\} XP`/);
});

test("üst HUD gün metriğini oyun ayı ve yılı ile gösterir", () => {
  const snapshot = readSource("./services/game-snapshot.ts");

  assert.match(snapshot, /value: formatNumber\(factory\.currentDay\)/);
  assert.match(snapshot, /subLabel: formatGameMonthYearLabel\(factory\.currentDay\)/);
  assert.match(snapshot, /getFinancePeriod\(\{ currentDay \}\)/);
  assert.match(snapshot, /"Mayıs"/);
  assert.match(snapshot, /\$\{monthName\} - \$\{period\.yearIndex\}\. Yıl/);

  const statusBar = readSource("./components/top-status-bar.tsx");

  assert.match(statusBar, /metric\.id === "day" \|\| numericValue === null/);
  assert.match(statusBar, /\{displayValue\}/);
  assert.match(statusBar, /isDayMetric/);
  assert.match(statusBar, /\{metric\.subLabel\}/);
  assert.match(statusBar, /text-primary/);
});

test("üst HUD metrik değişimlerini ve level artışını inline animasyonla gösterir", () => {
  const statusBar = readSource("./components/top-status-bar.tsx");
  const styles = readSource("./components/top-status-bar.module.css");

  assert.match(statusBar, /AnimatedCashMetric/);
  assert.match(statusBar, /AnimatedXpMetric/);
  assert.match(statusBar, /AnimatedLevelMetric/);
  assert.doesNotMatch(statusBar, /LevelUpCelebration/);
  assert.doesNotMatch(statusBar, /data-level-up-celebration/);
  assert.doesNotMatch(statusBar, /buildConfettiPieces/);
  assert.match(statusBar, /useDelayedHudSnapshot/);
  assert.match(statusBar, /useGameUiStore/);
  assert.match(statusBar, /pendingSnapshotRef/);
  assert.match(statusBar, /shouldHoldStatusUpdate/);
  assert.match(statusBar, /styles\.levelPulse/);
  assert.match(statusBar, /styles\.valueLevel/);
  assert.match(statusBar, /styles\.deltaLevel/);
  assert.match(statusBar, /formatSignedLevel/);
  assert.match(statusBar, /useNumericTransition/);
  assert.match(statusBar, /usePrefersReducedMotion/);
  assert.match(styles, /hudCashPositive/);
  assert.match(styles, /hudCashNegative/);
  assert.match(styles, /hudXpPositive/);
  assert.match(styles, /hudLevelPositive/);
  assert.match(styles, /\.deltaLevel/);
  assert.match(styles, /\.valueLevel/);
  assert.match(styles, /hudMetricFlip/);
  assert.doesNotMatch(styles, /hudConfetti|celebrationOverlay|celebrationCard|confettiPiece/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

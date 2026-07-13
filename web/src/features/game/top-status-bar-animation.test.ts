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
  assert.match(snapshot, /value: `\$\{formatNumber\(factory\.currentXp\)\} XP`/);
});

test("üst HUD metrik değişimlerini ve level up kutusunu animasyonla gösterir", () => {
  const statusBar = readSource("./components/top-status-bar.tsx");
  const styles = readSource("./components/top-status-bar.module.css");

  assert.match(statusBar, /AnimatedCashMetric/);
  assert.match(statusBar, /AnimatedXpMetric/);
  assert.match(statusBar, /AnimatedLevelMetric/);
  assert.match(statusBar, /LevelUpCelebration/);
  assert.match(statusBar, /useDelayedHudSnapshot/);
  assert.match(statusBar, /useGameUiStore/);
  assert.match(statusBar, /pendingSnapshotRef/);
  assert.match(statusBar, /shouldHoldStatusUpdate/);
  assert.match(statusBar, /data-level-up-celebration/);
  assert.match(statusBar, /useNumericTransition/);
  assert.match(statusBar, /usePrefersReducedMotion/);
  assert.match(styles, /hudCashPositive/);
  assert.match(styles, /hudCashNegative/);
  assert.match(styles, /hudXpPositive/);
  assert.match(styles, /hudMetricFlip/);
  assert.match(styles, /hudConfetti/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

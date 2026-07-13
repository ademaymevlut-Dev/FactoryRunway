import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("fabrika haritası hat kartlarında workload rozetini ve renk sınıfını gösterir", () => {
  const map = readSource("./components/factory-map.tsx");
  const styles = readSource("../../app/globals.css");

  assert.match(map, /workload-\$\{item\.workload\.state\}/);
  assert.match(map, /factory-slot-workload/);
  assert.match(map, /factory-slot-workload-tooltip/);
  assert.match(map, /item\.workload\.daysLabel/);
  assert.match(map, /item\.workload\.label/);
  assert.match(map, /formatWorkloadTooltipDays/);
  assert.doesNotMatch(map, /title=\{`\$\{item\.title\} · İş yükü/);
  assert.match(styles, /factory-slot-card\.workload-empty/);
  assert.match(styles, /factory-slot-card\.workload-low/);
  assert.match(styles, /factory-slot-card\.workload-thin/);
  assert.match(styles, /factory-slot-card\.workload-balanced/);
  assert.match(styles, /factory-slot-card\.workload-constrained/);
  assert.match(styles, /factory-slot-card\.workload-critical/);
  assert.match(styles, /factory-slot-workload-tooltip/);
});

test("snapshot hat workload bilgisini route progress kalan iş puanı ve efektif kapasiteden üretir", () => {
  const snapshot = readSource("./services/game-snapshot.ts");

  assert.match(snapshot, /RouteProcessingMode\.INTERNAL/);
  assert.match(snapshot, /remainingQuantity: \{ gt: 0 \}/);
  assert.match(snapshot, /workloadPointsPerUnit/);
  assert.match(snapshot, /remainingQuantity \* workloadPointsPerUnit \+ setupPoints/);
  assert.match(snapshot, /calculateEffectiveLinePointCapacity/);
  assert.match(snapshot, /buildFactoryLineWorkload/);
});

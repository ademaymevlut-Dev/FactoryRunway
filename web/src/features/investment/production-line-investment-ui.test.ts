import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("investment snapshot aktif sector ve PRODUCTION departman template'lerini ister", () => {
  const snapshot = readSource("../game/services/game-snapshot.ts");

  assert.match(snapshot, /sectorId: factory\.sectorId/);
  assert.match(snapshot, /status: ContentStatus\.ACTIVE/);
  assert.match(snapshot, /kind: DepartmentKind\.PRODUCTION/);
  assert.match(snapshot, /\{ sortOrder: "asc" \}/);
});

test("yatırım paneli seçilen DepartmentGroup içindeki departmanları filtreler", () => {
  const panel = readSource(
    "./components/production-line-investment-panel.tsx",
  );

  assert.match(panel, /department\.departmentGroupId === sectionId/);
  assert.match(panel, /selectedDepartment\.templates\.map/);
  assert.match(panel, /aria-label="Üretim hattı standardı"/);
  assert.match(panel, /GradeGlyph/);
  assert.match(panel, /gradeLabels\[template\.grade\]/);
  assert.doesNotMatch(panel, /template\.key/);
  assert.match(panel, /department\.id === initialDepartmentId/);
});

test("üretim kuyruğu seçili dock departmanından yatırım ve miktarlı fason akışını açar", () => {
  const panel = readSource(
    "../production-queue/components/department-queue-panel.tsx",
  );
  const registry = readSource("../game/panels/panel-registry.tsx");

  assert.match(panel, /openPanel\("investment", \{ departmentId: queue\.departmentId \}\)/);
  assert.match(panel, /Yatırım Yap/);
  assert.match(panel, /Fasona ayrılacak miktar/);
  assert.match(panel, /quantity: selectedQuantity/);
  assert.match(registry, /investmentDepartmentIds=/);
});

test("satın alma formu yalnızca güvenli kimlik alanlarını gönderir", () => {
  const card = readSource(
    "./components/production-line-template-purchase-card.tsx",
  );

  assert.match(card, /name="factoryId"/);
  assert.match(card, /name="productionLineTemplateId"/);
  assert.match(card, /name="requestId"/);
  assert.match(card, /name="leasingOfferId"/);
  assert.doesNotMatch(card, /name="departmentId"|name="purchaseCostCents"/);
  assert.doesNotMatch(
    card,
    /name="(?:staff|quantity|salary|payroll|electricity|recurringCost)/,
  );
  assert.match(card, /template\.preview\.directStaff/);
  assert.match(card, /template\.preview\.totalRecurringCostIncreaseCents/);
  assert.match(card, /selected\.installmentAmountCents/);
  assert.doesNotMatch(card, /interestRate|faiz/i);
});

test("ortak panel viewport içinde kendi body scroll alanını ve arka plan kilidini kurar", () => {
  const registry = readSource("../game/panels/panel-registry.tsx");
  const overlay = readSource("../game/components/overlay-layer-manager.tsx");

  assert.match(registry, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(registry, /"min-h-0 flex-1 overscroll-contain"/);
  assert.match(
    registry,
    /layout === "center" \? "overflow-hidden" : "overflow-y-auto"/,
  );
  assert.match(overlay, /document\.body\.style\.overflow = "hidden"/);
});

test("sipariş ve departman listeleri scroll içinde Sortable kullanmayı korur", () => {
  const priority = readSource("../orders/components/order-priority-list.tsx");
  const departmentQueue = readSource(
    "../production-queue/components/department-queue-panel.tsx",
  );

  assert.match(priority, /touch-pan-y overscroll-contain overflow-y-auto/);
  assert.match(priority, /<Sortable/);
  assert.match(departmentQueue, /<Sortable/);
  assert.match(departmentQueue, /<ScrollArea className="h-full">/);
});

test("fabrika haritası üç satırlı column-flow yerleşimini korur", () => {
  const styles = readSource("../../app/globals.css");

  assert.match(styles, /grid-template-rows: repeat\(3, var\(--slot-h\)\)/);
  assert.match(styles, /grid-auto-flow: column/);
});

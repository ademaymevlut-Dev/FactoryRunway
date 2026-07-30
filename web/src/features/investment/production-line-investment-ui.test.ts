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
  const copy = readSource("./investment-copy.ts");

  assert.match(panel, /department\.departmentGroupId === sectionId/);
  assert.match(panel, /selectedDepartment\.templates\.map/);
  assert.match(panel, /aria-label=\{copy\.panel\.templateNavAria\}/);
  assert.match(panel, /GradeGlyph/);
  assert.match(panel, /copy\.gradeLabels\[template\.grade\]/);
  assert.doesNotMatch(panel, /template\.key/);
  assert.match(panel, /department\.id === initialDepartmentId/);
  assert.match(copy, /Üretim hattı standardı/);
  assert.match(copy, /Production line standard/);
});

test("yatırım paneli kompakt iç scroll ve sabit CTA düzeni kullanır", () => {
  const panel = readSource(
    "./components/production-line-investment-panel.tsx",
  );
  const card = readSource(
    "./components/production-line-template-purchase-card.tsx",
  );
  const copy = readSource("./investment-copy.ts");
  const registry = readSource("../game/panels/panel-registry.tsx");

  assert.match(registry, /investment:\s*\{[\s\S]*?size: "investment"/);
  assert.match(
    registry,
    /size\?: "adaptive" \| "compact" \| "investment" \| "orders" \| "wide"/,
  );
  assert.match(panel, /flex h-full min-h-0 flex-col gap-2 overflow-hidden/);
  assert.doesNotMatch(panel, /departmentSubtitle/);
  assert.doesNotMatch(panel, /planningOpen/);
  assert.doesNotMatch(copy, /Teknik ve finansal seçenekler/);
  assert.doesNotMatch(copy, /Technical and financial options/);
  assert.match(card, /grid-rows-\[auto_minmax\(0,1fr\)\]/);
  assert.match(card, /min-h-0 min-w-0 flex-1/);
  assert.match(card, /overflow-y-auto overscroll-contain/);
  assert.match(card, /shrink-0 border-t border-white\/10 bg-card\/95/);
});

test("yatırım kartı büyük üretim hattı görseli için DETAIL asset'i tercih eder", () => {
  const snapshot = readSource("../game/services/game-snapshot.ts");
  const card = readSource(
    "./components/production-line-template-purchase-card.tsx",
  );
  const types = readSource("./types.ts");

  assert.match(snapshot, /ProductionLineAssetVariant\.DETAIL/);
  assert.match(snapshot, /getInvestmentTemplateDetailImageUrl\(template\)/);
  assert.match(types, /detailImageUrl: string \| null/);
  assert.match(card, /template\.detailImageUrl \?\? template\.imageUrl/);
  assert.match(card, /scale-\[1\.22\]/);
  assert.doesNotMatch(card, /src=\{template\.imageUrl\}/);
});

test("üretim kuyruğu seçili dock departmanından yatırım ve miktarlı fason akışını açar", () => {
  const panel = readSource(
    "../production-queue/components/department-queue-panel.tsx",
  );
  const copy = readSource("../production-queue/production-queue-copy.ts");
  const registry = readSource("../game/panels/panel-registry.tsx");

  assert.match(panel, /openPanel\("investment", \{ departmentId: queue\.departmentId \}\)/);
  assert.match(panel, /copy\.header\.invest/);
  assert.match(panel, /copy\.outsource\.quantityLabel/);
  assert.match(copy, /Yatırım Yap/);
  assert.match(copy, /Quantity to outsource/);
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

test("yatırım kartı kurulum planını ve leasing banka kararını işlem öncesi gösterir", () => {
  const card = readSource(
    "./components/production-line-template-purchase-card.tsx",
  );
  const snapshot = readSource("../game/services/game-snapshot.ts");

  assert.match(card, /template\.installation/);
  assert.match(card, /installation\.acquisitionSequence/);
  assert.match(card, /installation\.readyDay/);
  assert.match(card, /selected\.creditDecision/);
  assert.match(card, /decision\.projectedExposureCents/);
  assert.match(card, /decision\.projectedCyclePaymentCents/);
  assert.match(card, /decision\.cashReserveAfterDownPaymentCents/);
  assert.match(
    card,
    /selectedOffer\.creditDecision\.approved === false/,
  );
  assert.match(snapshot, /getProductionLineInstallationPreview/);
  assert.match(snapshot, /evaluateLeasingCreditCandidate/);
});

test("kurulumdaki hat haritada geri sayım ve detay panelinde RT action taşır", () => {
  const map = readSource("../game/components/factory-map.tsx");
  const panel = readSource(
    "./components/upgrade-production-line-panel.tsx",
  );

  assert.match(map, /item\.status === "INSTALLING"/);
  assert.match(map, /installation\.remainingDays/);
  assert.match(map, /grayscale opacity-45/);
  assert.match(panel, /ProductionLineInstallationTab/);
  assert.match(panel, /accelerateProductionLineInstallationAction/);
  assert.match(panel, /name="days"/);
  assert.match(panel, /installation\.minimumRemainingDays/);
  assert.match(panel, /installation\.tokenSkipCostPerDay/);
});

test("ortak panel viewport içinde kendi body scroll alanını ve arka plan kilidini kurar", () => {
  const registry = readSource("../game/panels/panel-registry.tsx");
  const overlay = readSource("../game/components/overlay-layer-manager.tsx");

  assert.match(registry, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(registry, /"min-h-0 flex-1 overscroll-contain"/);
  assert.match(
    registry,
    /layout === "center" \|\| layout === "rightDrawer"[\s\S]*?\? "overflow-hidden"[\s\S]*?: "overflow-y-auto"/,
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

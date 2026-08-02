import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ordersCopy } from "./orders-copy";
import { resolveOrdersPanelMode } from "./components/use-orders-panel-mode";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("panel modu gerçek container genişliğinde kesin sınırlarla çözülür", () => {
  const hook = read("./components/use-orders-panel-mode.ts");
  const panel = read("./components/orders-panel.tsx");
  const globals = read("../../app/globals.css");

  assert.equal(resolveOrdersPanelMode(759), "COMPACT");
  assert.equal(resolveOrdersPanelMode(760), "MEDIUM");
  assert.equal(resolveOrdersPanelMode(1179), "MEDIUM");
  assert.equal(resolveOrdersPanelMode(1180), "WIDE");
  assert.match(hook, /new ResizeObserver/);
  assert.doesNotMatch(hook, /window\.innerWidth|matchMedia/);
  assert.match(hook, /mode: "COMPACT", revision: 0/);
  assert.match(panel, /ref=\{panelRef\}/);
  assert.match(panel, /data-orders-panel-mode=\{panelMode\}/);
  assert.match(globals, /container-type: inline-size/);
  assert.match(globals, /container-name: orders-panel/);
  assert.doesNotMatch(
    globals,
    /@layer components\s*\{\s*\.orders-panel-root/,
  );
});

test("wide ve medium sabit kolon sözleşmeleri panel stacking oluşturmadan ayrılır", () => {
  const globals = read("../../app/globals.css");

  assert.match(globals, /@container orders-panel \(min-width: 760px\)[\s\S]*?grid-template-columns: 210px minmax\(0, 1fr\)/);
  assert.match(globals, /@container orders-panel \(min-width: 1180px\)[\s\S]*?grid-template-columns: 270px minmax\(0, 1fr\)/);
  assert.match(globals, /grid-template-columns: minmax\(0, 1fr\) 330px/);
  assert.match(globals, /\.orders-analysis-wide-dock[\s\S]*?display: flex/);
  assert.match(
    globals,
    /data-orders-panel-mode="WIDE"[\s\S]*?\.orders-responsive-layout[\s\S]*?grid-template-columns: 270px minmax\(0, 1fr\)/,
  );
});

test("compact market ve detail aynı DOM sınırında ayrı ekranlar olarak tutulur", () => {
  const panel = read("./components/orders-panel.tsx");
  const globals = read("../../app/globals.css");

  assert.match(panel, /useState<CompactOrdersView>\("MARKET"\)/);
  assert.match(panel, /className="orders-market-view/);
  assert.match(panel, /className="orders-detail-view/);
  assert.match(panel, /data-compact-view=\{compactView\}/);
  assert.match(panel, /setCompactView\("DETAIL"\)/);
  assert.match(panel, /setCompactView\("MARKET"\)/);
  assert.match(globals, /data-compact-view="DETAIL"[\s\S]*?\.orders-market-view[\s\S]*?display: none/);
  assert.match(panel, /orders-compact-offer-delivery/);
  assert.match(panel, /offer\.customerName/);
  assert.match(panel, /offer\.totalRevenueLabel/);
});

test("compact sipariş detayı tekrar eden risk ve CTA üstü metrikleri gizler", () => {
  const globals = read("../../app/globals.css");
  const workspace = read("./components/order-decision-workspace.tsx");

  assert.match(workspace, /className="orders-risk-metric"/);
  assert.match(workspace, /className="orders-decision-metrics grid/);
  assert.match(
    globals,
    /\.orders-risk-metric\s*\{[\s\S]*?display:\s*none;[\s\S]*?grid-column:\s*span 2 \/ span 2;/,
  );
  assert.match(
    globals,
    /\.orders-decision-metrics\s*\{[\s\S]*?display:\s*none;/,
  );
  assert.match(
    globals,
    /@container orders-panel \(min-width: 760px\)[\s\S]*?\.orders-risk-metric\s*\{[\s\S]*?display:\s*block[\s\S]*?\.orders-decision-metrics\s*\{[\s\S]*?display:\s*grid/,
  );
  assert.match(
    globals,
    /data-orders-panel-mode="MEDIUM"[\s\S]*?\.orders-decision-metrics\s*\{[\s\S]*?display:\s*grid/,
  );
});

test("tek analiz içeriği wide dock, medium drawer ve compact sheet kabuklarında kullanılır", () => {
  const workspace = read("./components/order-decision-workspace.tsx");

  assert.equal(workspace.match(/function OrderAnalysisContent/g)?.length, 1);
  assert.equal(workspace.match(/<TabsContent/g)?.length, 1);
  assert.match(workspace, /className="orders-analysis-wide-dock"/);
  assert.match(workspace, /orders-analysis-drawer/);
  assert.match(workspace, /orders-analysis-bottom-sheet/);
  assert.match(workspace, /max-h-\[88dvh\]/);
  assert.match(workspace, /panelMode === "MEDIUM"/);
});

test("overlay, focus dönüşü ve sticky karar barı erişilebilir etkileşim sözleşmesini korur", () => {
  const workspace = read("./components/order-decision-workspace.tsx");
  const dialog = read("../../components/ui/dialog.tsx");
  const globals = read("../../app/globals.css");

  assert.match(workspace, /analysisTriggerRef\.current\?\.focus\(\)/);
  assert.match(workspace, /onCloseAutoFocus/);
  assert.match(workspace, /<DialogClose asChild>/);
  assert.match(workspace, /size-11/);
  assert.match(dialog, /portalContainer\?: HTMLElement \| null/);
  assert.match(dialog, /overlayClassName\?: string/);
  assert.match(workspace, /sticky bottom-0/);
  assert.doesNotMatch(
    workspace.slice(
      workspace.indexOf("function OrderDecisionBar"),
      workspace.indexOf("function DecisionBarMetric"),
    ),
    /\bfixed\b/,
  );
  assert.match(globals, /env\(safe-area-inset-bottom\)/);
});

test("mode ve teklif değişimleri doğru state sınırlarını korur", () => {
  const panel = read("./components/orders-panel.tsx");
  const workspace = read("./components/order-decision-workspace.tsx");
  const provider = read("./components/orders-ui-context.tsx");

  assert.match(provider, /useState<OrderAnalysisMode>\("PROFITABILITY"\)/);
  assert.match(panel, /key=\{selectedOffer\.id\}/);
  assert.match(workspace, /useState\(0\)/);
  assert.match(workspace, /const \[acceptanceOpen, setAcceptanceOpen\] = useState\(false\)/);
  assert.match(workspace, /const \[analysisSession, setAnalysisSession\] = useState/);
  assert.match(workspace, /analysisSession\.panelModeRevision === panelModeRevision/);
  assert.match(workspace, /setAnalysisOpen\(false\)/);
  assert.doesNotMatch(workspace, /useState<OrderAnalysisMode>/);
});

test("TR ve EN responsive analiz navigasyonu locale contractını sağlar", () => {
  for (const locale of ["tr", "en"] as const) {
    assert.ok(ordersCopy[locale].ui.analysis.open);
    assert.ok(ordersCopy[locale].ui.analysis.close);
    assert.ok(ordersCopy[locale].ui.analysis.description);
    assert.ok(ordersCopy[locale].ui.navigation.backToMarket);
  }
});

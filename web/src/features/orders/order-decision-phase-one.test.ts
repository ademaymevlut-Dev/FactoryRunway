import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ordersCopy } from "./orders-copy";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `${start} bulunamadı`);
  assert.notEqual(endIndex, -1, `${end} bulunamadı`);

  return source.slice(startIndex, endIndex);
}

test("analiz modu teklif workspace remount sınırının dışında korunur", () => {
  const panel = read("./components/orders-panel.tsx");
  const provider = read("./components/orders-ui-context.tsx");
  const workspace = read("./components/order-decision-workspace.tsx");

  assert.match(provider, /useState<OrderAnalysisMode>\("PROFITABILITY"\)/);
  assert.match(provider, /activeAnalysisMode/);
  assert.match(provider, /setActiveAnalysisMode/);
  assert.match(panel, /<OrdersUiProvider locale=\{locale\}>/);
  assert.match(
    panel,
    /<OrderDecisionWorkspace[\s\S]*?key=\{selectedOffer\.id\}/,
  );
  assert.doesNotMatch(workspace, /useState<OrderAnalysisMode>/);
});

test("teklif değişiminde carousel, confirmation ve responsive overlay yerel state'i sıfırlanır", () => {
  const workspace = read("./components/order-decision-workspace.tsx");
  const workspaceRoot = between(
    workspace,
    "export function OrderDecisionWorkspace",
    "function OrderDecisionCore",
  );

  assert.match(workspaceRoot, /useState\(0\)/);
  assert.match(workspaceRoot, /useState\(false\)/);
  assert.match(workspaceRoot, /activeItemIndex/);
  assert.match(workspaceRoot, /acceptanceOpen/);
  assert.match(workspaceRoot, /analysisOpen/);
  assert.doesNotMatch(workspaceRoot, /activeAnalysisMode/);
});

test("kabul akışı mutation formunu yalnızca confirmation içinde tutar", () => {
  const workspace = read("./components/order-decision-workspace.tsx");
  const decisionBar = between(
    workspace,
    "function OrderDecisionBar",
    "function DecisionBarMetric",
  );
  const acceptance = between(
    workspace,
    "function OrderAcceptanceSheet",
    "function ConfirmationMetric",
  );
  const actions = between(
    workspace,
    "function AcceptanceFormActions",
    "function CostPairMetric",
  );

  assert.match(decisionBar, /onClick=\{onAccept\}/);
  assert.match(decisionBar, /type="button"/);
  assert.doesNotMatch(decisionBar, /<form|acceptMarketOrderAction/);
  assert.equal(
    workspace.match(/action=\{acceptMarketOrderAction\}/g)?.length,
    1,
  );
  assert.match(acceptance, /<form action=\{acceptMarketOrderAction\}>/);
  assert.match(actions, /<DialogClose asChild>/);
  assert.match(actions, /disabled=\{pending\} type="button"/);
  assert.match(actions, /aria-busy=\{pending\} disabled=\{pending\} type="submit"/);
});

test("confirmation yalnızca server acceptance presentation değerlerini gösterir", () => {
  const workspace = read("./components/order-decision-workspace.tsx");
  const acceptance = between(
    workspace,
    "function OrderAcceptanceSheet",
    "function ConfirmationMetric",
  );

  assert.match(acceptance, /const summary = offer\.acceptanceSummary/);
  assert.match(acceptance, /summary\.materialReadyLabel/);
  assert.match(acceptance, /summary\.cuttingStartLabel/);
  assert.match(acceptance, /summary\.productionOrderLabel/);
  assert.match(acceptance, /summary\.totalQuantityLabel/);
  assert.match(acceptance, /summary\.totalRevenueLabel/);
  assert.match(acceptance, /summary\.plannedMarginLabel/);
  assert.match(acceptance, /summary\.riskSummaryLabel/);
  assert.match(acceptance, /summary\.productionImpactLabel/);
  assert.doesNotMatch(acceptance, /Math\.|Number\(|reduce\(|Intl\./);
});

test("aynı anda tek analiz render edilir ve karar çekirdeği moddan bağımsızdır", () => {
  const workspace = read("./components/order-decision-workspace.tsx");
  const workspaceRoot = between(
    workspace,
    "export function OrderDecisionWorkspace",
    "function OrderDecisionCore",
  );

  assert.equal(workspace.match(/<TabsContent/g)?.length, 1);
  assert.match(workspace, /<ActiveAnalysisContent/);
  assert.match(workspace, /if \(mode === "CAPACITY"\)/);
  assert.match(workspace, /if \(mode === "CUSTOMER"\)/);
  assert.match(workspace, /if \(mode === "PRODUCT"\)/);
  assert.match(workspaceRoot, /<OrderDecisionCore/);
  assert.match(workspaceRoot, /<ResponsiveAnalysisShell/);
  assert.doesNotMatch(
    between(workspace, "function OrderDecisionCore", "function DecisionMetric"),
    /activeAnalysisMode/,
  );
});

test("karar barı workspace alt satırında sticky kalır, viewport fixed değildir", () => {
  const workspace = read("./components/order-decision-workspace.tsx");
  const workspaceRoot = between(
    workspace,
    "export function OrderDecisionWorkspace",
    "function OrderDecisionCore",
  );
  const decisionBar = between(
    workspace,
    "function OrderDecisionBar",
    "function DecisionBarMetric",
  );

  assert.match(
    workspaceRoot,
    /<ResponsiveAnalysisShell[\s\S]*?<OrderDecisionBar/,
  );
  assert.match(decisionBar, /sticky bottom-0/);
  assert.doesNotMatch(decisionBar, /\bfixed\b/);
});

test("TR ve EN Faz 1 locale sözleşmesi aynı alanları sağlar", () => {
  for (const locale of ["tr", "en"] as const) {
    const copy = ordersCopy[locale];

    assert.ok(copy.ui.analysis.profitability);
    assert.ok(copy.ui.analysis.capacity);
    assert.ok(copy.ui.analysis.customer);
    assert.ok(copy.ui.analysis.product);
    assert.ok(copy.ui.confirmation.title);
    assert.ok(copy.ui.confirmation.productionImpact);
    assert.ok(copy.ui.decision.risk);
    assert.ok(copy.service.decisionRisk.capacity("25%"));
    assert.ok(copy.service.decisionRisk.delivery("25%"));
    assert.ok(copy.service.decisionRisk.equal("25%"));
  }
});

test("server view ile action aynı kabul planı kaynaklarını kullanır", () => {
  const action = read("./actions/accept-market-order-action.ts");
  const view = read("./services/order-market-view.ts");

  assert.match(view, /currentDay \+ 1/);
  assert.match(action, /factory\.currentDay \+ 1/);
  assert.match(view, /copy\.acceptPlan\.productionOrder\([\s\S]*?offer\.items\.length/);
  assert.match(action, /for \(const \[index, item\] of offer\.items\.entries\(\)\)/);
  assert.match(view, /acceptanceSummary:/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("Ranking ve oyuncu fikirleri üst header üzerinden panel olarak açılır", () => {
  const header = readSource("../game/components/top-status-bar.tsx");
  const leftDock = readSource("../game/components/left-dock-menu.tsx");

  assert.match(header, /openPanel\("ranking"\)/);
  assert.match(header, /openPanel\("playerFeedback"\)/);
  assert.match(header, /<Trophy/);
  assert.match(header, /<Mail/);
  assert.match(header, /copy\.messagesTooltip/);
  assert.match(header, /GameLocaleSwitcher/);
  assert.match(header, /activePanelKey === "playerFeedback"/);
  assert.doesNotMatch(leftDock, /key: "ranking"/);
  assert.doesNotMatch(leftDock, /key: "playerFeedback"/);
  assert.doesNotMatch(leftDock, /key: "management"/);
});

test("Ranking paneli kompakt başlık ve liste düzenini kullanır", () => {
  const panel = readSource("./components/ranking-panel.tsx");
  const copy = readSource("./ranking-copy.ts");
  const registry = readSource("../game/panels/panel-registry.tsx");
  const overlay = readSource("../game/components/overlay-layer-manager.tsx");

  assert.match(panel, /CurrentPlayerRankCompact/);
  assert.match(panel, /export function RankingPanel\(\{ locale \}/);
  assert.match(panel, /const copy = rankingCopy\[locale\]/);
  assert.match(panel, /getXpRankingAction\(page, locale\)/);
  assert.match(panel, /getInitials\(entry\.displayName, locale\)/);
  assert.match(copy, /title: "Factory Runway liderleri"/);
  assert.match(copy, /title: "Factory Runway leaders"/);
  assert.match(copy, /eyebrow: "PLAYER RANKING"/);
  assert.match(copy, /gameDay: "Oyun Günü"/);
  assert.match(copy, /gameDay: "Game Day"/);
  assert.match(copy, /totalTurnover: "Toplam Ciro"/);
  assert.match(copy, /totalTurnover: "Total Turnover"/);
  assert.match(copy, /visitFactory: "Ziyaret Et"/);
  assert.match(copy, /visitFactory: "Visit"/);
  assert.match(panel, /showcaseFactory\.currentDay/);
  assert.match(panel, /showcaseFactory\.totalTurnoverCents/);
  assert.match(panel, /formatCompactMoney/);
  assert.match(panel, /<Table className="text-xs/);
  assert.match(panel, /size="xs"/);
  assert.doesNotMatch(panel, /entry\.factories\.length/);
  assert.doesNotMatch(panel, /Factory Runway liderleri|Factory Runway leaders/);
  assert.doesNotMatch(panel, /CurrentPlayerRankCard|PodiumCard/);
  assert.doesNotMatch(
    panel,
    /Oyuncular tüm sektörlerde kazandıkları kalıcı Total XP/,
  );
  assert.match(registry, /<RankingPanel locale=\{snapshot\.locale\}/);
  assert.match(
    registry,
    /ranking:\s*\{[\s\S]*?size: "adaptive",[\s\S]*?titleKey: "ranking"/,
  );
  assert.match(overlay, /panelCopy\.titles\[panel\.titleKey\]/);
});

test("Ranking oyuncu Total XP değerini kullanır ve fabrika hatlarını liste sorgusunda yüklemez", () => {
  const service = readSource("./services/xp-ranking-service.ts");
  const actions = readSource("./actions/ranking-actions.ts");
  const schema = readSource("../../../prisma/schema.prisma");

  assert.match(service, /totalXp: "desc"/);
  assert.match(service, /totalXp\.toString\(\)/);
  assert.match(service, /XP_RANKING_PAGE_SIZE = 50/);
  assert.match(service, /locale\?: SupportedLocale/);
  assert.match(service, /const locale = normalizeLocale\(input\.locale\)/);
  assert.match(service, /preferredTranslation\(translations, locale\)\?\.name/);
  assert.match(service, /currentDay: true/);
  assert.match(service, /currencyCode: true/);
  assert.match(service, /factoryFinanceDue\.groupBy/);
  assert.match(service, /FinanceCategory\.ORDER_REVENUE/);
  assert.match(service, /FinanceDirection\.INCOME/);
  assert.match(service, /FinanceDueStatus\.CANCELLED/);
  assert.match(service, /totalTurnoverCents/);
  assert.match(actions, /getXpRankingView\(\{[\s\S]*?locale,/);
  assert.match(schema, /@@index\(\[totalXp, id\]\)/);
  assert.doesNotMatch(service, /productionLineTemplate/);
  assert.doesNotMatch(service, /const locale = "tr"/);
});

test("Fabrika ziyaret cevabı salt okunur vitrin verileriyle sınırlıdır", () => {
  const service = readSource("./services/factory-visit-service.ts");
  const actions = readSource("./actions/ranking-actions.ts");
  const panel = readSource("./components/ranking-panel.tsx");
  const map = readSource("./components/visitor-factory-map.tsx");
  const copy = readSource("./ranking-copy.ts");

  assert.match(service, /productionLines:/);
  assert.match(service, /ProductionLineAssetVariant\.MAP/);
  assert.match(service, /locale\?: SupportedLocale/);
  assert.match(service, /const locale = normalizeLocale\(input\.locale\)/);
  assert.match(service, /buildFactoryVisitSections\(factory, locale\)/);
  assert.match(service, /copy\.lineTitle\(departmentName, line\.lineNumber\)/);
  assert.match(actions, /getFactoryVisitAction\(\s*factoryId: string,\s*localeInput\?: SupportedLocale/);
  assert.match(actions, /getFactoryVisitView\(\{[\s\S]*?locale,/);
  assert.doesNotMatch(service, /cashBalanceCents|customerOrders|productionOrders|leasingContracts|staffAssignments/);
  assert.doesNotMatch(service, /const locale = "tr"/);
  assert.match(panel, /<Tabs/);
  assert.match(panel, /copy\.visit\.back/);
  assert.match(panel, /loadFactoryVisit\(factoryId\)/);
  assert.match(panel, /getFactoryVisitAction\(factoryId, locale\)/);
  assert.match(map, /copy\.map\.hint/);
  assert.match(map, /copy\.map\.lineCount\(section\.lines\.length\)/);
  assert.match(copy, /hint: "Salt okunur fabrika vitrini/);
  assert.match(copy, /hint: "Read-only factory showcase/);
  assert.doesNotMatch(map, /Salt okunur fabrika vitrini|Read-only factory showcase/);
  assert.doesNotMatch(map, /Yatırım Yap|Upgrade|Üretim Kuyruğu/);
});

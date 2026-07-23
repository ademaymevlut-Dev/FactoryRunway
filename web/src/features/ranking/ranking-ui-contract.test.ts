import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("Ranking üst header üzerinden açılır ve Mesajlar şimdilik pasiftir", () => {
  const header = readSource("../game/components/top-status-bar.tsx");
  const leftDock = readSource("../game/components/left-dock-menu.tsx");

  assert.match(header, /openPanel\("ranking"\)/);
  assert.match(header, /<Trophy/);
  assert.match(header, /<Mail/);
  assert.match(header, /Mesajlar ve Cooperation sistemi yakında/);
  assert.match(header, /disabled/);
  assert.doesNotMatch(leftDock, /key: "ranking"/);
});

test("Ranking paneli kompakt başlık ve liste düzenini kullanır", () => {
  const panel = readSource("./components/ranking-panel.tsx");
  const registry = readSource("../game/panels/panel-registry.tsx");

  assert.match(panel, /CurrentPlayerRankCompact/);
  assert.match(panel, /Factory Runway liderleri/);
  assert.doesNotMatch(panel, /CurrentPlayerRankCard|PodiumCard/);
  assert.doesNotMatch(
    panel,
    /Oyuncular tüm sektörlerde kazandıkları kalıcı Total XP/,
  );
  assert.match(
    registry,
    /ranking:\s*\{[\s\S]*?size: "adaptive",[\s\S]*?title: ""/,
  );
});

test("Ranking oyuncu Total XP değerini kullanır ve fabrika hatlarını liste sorgusunda yüklemez", () => {
  const service = readSource("./services/xp-ranking-service.ts");
  const schema = readSource("../../../prisma/schema.prisma");

  assert.match(service, /totalXp: "desc"/);
  assert.match(service, /totalXp\.toString\(\)/);
  assert.match(service, /XP_RANKING_PAGE_SIZE = 50/);
  assert.match(schema, /@@index\(\[totalXp, id\]\)/);
  assert.doesNotMatch(service, /productionLineTemplate/);
});

test("Fabrika ziyaret cevabı salt okunur vitrin verileriyle sınırlıdır", () => {
  const service = readSource("./services/factory-visit-service.ts");
  const panel = readSource("./components/ranking-panel.tsx");
  const map = readSource("./components/visitor-factory-map.tsx");

  assert.match(service, /productionLines:/);
  assert.match(service, /ProductionLineAssetVariant\.MAP/);
  assert.doesNotMatch(service, /cashBalanceCents|customerOrders|productionOrders|leasingContracts|staffAssignments/);
  assert.match(panel, /<Tabs/);
  assert.match(panel, /Ranking’e dön/);
  assert.match(panel, /loadFactoryVisit\(factoryId\)/);
  assert.match(map, /Salt okunur fabrika vitrini/);
  assert.doesNotMatch(map, /Yatırım Yap|Upgrade|Üretim Kuyruğu/);
});

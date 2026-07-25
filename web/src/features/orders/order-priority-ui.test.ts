import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("sipariş paneli dört ürün grubunu ana filtre, teklif tipini kart etiketi yapar", () => {
  const panel = read("./components/orders-panel.tsx");
  const copy = read("./orders-copy.ts");
  const registry = read("../game/panels/panel-registry.tsx");
  const service = read("./services/order-market-view.ts");

  assert.doesNotMatch(panel, /Üretim Önceliği/);
  assert.doesNotMatch(panel, /OrderPriorityList/);
  assert.match(panel, /ordersCopy/);
  assert.match(copy, /Sipariş Pazarı/);
  assert.match(copy, /Order Market/);
  assert.match(registry, /<OrdersPanel locale=\{snapshot\.locale\}/);
  assert.match(service, /locale\?: SupportedLocale \| string/);
  assert.match(service, /getTranslationLocaleFallbacks\(locale\)/);
  assert.match(panel, /OrderSidebarPanel/);
  assert.match(panel, /SelectedOrderDetail/);
  assert.match(panel, /OrderCostPanel/);
  assert.doesNotMatch(panel, /OrderMarketEntryPanel/);
  assert.match(panel, /"BASIC"/);
  assert.match(panel, /"STANDARD"/);
  assert.match(panel, /"PREMIUM"/);
  assert.match(panel, /"LUXURY"/);
  assert.match(panel, /OfferTypeBadge/);
  assert.match(panel, /LockedProductTierState/);
  assert.match(panel, /copy\.locked\.title\(tierLabel, minimumLevel\)/);
  assert.match(copy, /Luxury/);
  assert.match(panel, /copy\.sidebar\.changeFilterAria/);
  assert.doesNotMatch(panel, /Filtre Seç/);
  assert.match(panel, /matchesMarketFilter/);
  assert.match(panel, /CustomerRelationshipCard/);
  assert.match(panel, /copy\.relationship\.title/);
});

test("sipariş paneli ürün kart arka planında ArtCard deneme bileşenini kullanır", () => {
  const panel = read("./components/orders-panel.tsx");
  const showcase = read(
    "../../components/game-presentation/product-showcase-card.tsx",
  );
  const artCard = read("../../components/ui/art-card.tsx");
  const marketView = read("./services/order-market-view.ts");

  assert.match(panel, /ProductShowcaseCard/);
  assert.match(panel, /gradientFrom: item\.cardGradientFrom/);
  assert.match(panel, /gradientTo: item\.cardGradientTo/);
  assert.match(panel, /primaryColor: item\.cardPrimaryColor/);
  assert.match(panel, /secondaryColor: item\.cardSecondaryColor/);
  assert.match(panel, /svgIconAccentColor: item\.cardSvgIconAccentColor/);
  assert.doesNotMatch(panel, /drop-shadow/);
  assert.match(showcase, /import \{ ArtCard \}/);
  assert.match(showcase, /import Image from "next\/image"/);
  assert.match(showcase, /data-product-art-layer="true"/);
  assert.match(showcase, /data-product-image-layer="true"/);
  assert.match(showcase, /className="pointer-events-none absolute inset-0 z-30"/);
  assert.match(showcase, /alt=\{name\}/);
  assert.match(showcase, /className="object-contain object-bottom"/);
  assert.match(showcase, /fill/);
  assert.match(artCard, /linear-gradient\(to top left, \$\{gradientFrom\}/);
  assert.match(artCard, /colorToTopLeftGradient\(secondaryColor\)/);
  assert.match(artCard, /colorToTopLeftGradient\(svgIconAccentColor\)/);
  assert.match(artCard, /colorToTopLeftGradient\(primaryColor\)/);
  assert.doesNotMatch(artCard, /absolute inset-0 bg-\[linear-gradient/);
  assert.match(marketView, /productImage\.variant === ProductImageVariant\.CARD/);
});

test("koleksiyon siparişlerinde tüm ürün detayları carousel ile gezilebilir", () => {
  const panel = read("./components/orders-panel.tsx");
  const copy = read("./orders-copy.ts");

  assert.match(panel, /SelectedOrderPanels/);
  assert.match(panel, /CollectionCarouselControls/);
  assert.match(panel, /copy\.carousel\.previousAria/);
  assert.match(panel, /copy\.carousel\.nextAria/);
  assert.match(copy, /Previous collection product/);
  assert.match(panel, /activeItem=\{activeItem\}/);
  assert.match(panel, /activeItemId=\{activeItem\.id\}/);
  assert.match(panel, /copy\.cost\.itemTotal/);
  assert.match(panel, /copy\.cost\.itemCost/);
  assert.match(panel, /copy\.cost\.itemProfit/);
});

test("priority list bileşeni mevcut Sortable ile çalışmaya devam eder", () => {
  const priority = read("./components/order-priority-list.tsx");

  assert.match(priority, /Sortable/);
  assert.match(priority, /updateOrderPriorityAction/);
  assert.match(priority, /item\.orderNo/);
  assert.match(priority, /item\.customerName/);
  assert.match(priority, /item\.productName/);
  assert.match(priority, /item\.targetDeliveryDay/);
  assert.match(priority, /item\.remainingQuantity/);
});

test("priority list playback sırasında merkezi kilidi kullanır ve line bazlı input içermez", () => {
  const priority = read("./components/order-priority-list.tsx");

  assert.match(priority, /isShiftPlaybackActive/);
  assert.match(priority, /disabled=\{isShiftPlaybackActive \|\| isPending\}/);
  assert.doesNotMatch(priority, /lineId|factoryProductionLineId|plannedQuantity/);
});

test("departman kuyruğu mevcut Sortable ile global sipariş önceliğini günceller", () => {
  const queue = read(
    "../production-queue/components/department-queue-panel.tsx",
  );
  const copy = read("../production-queue/production-queue-copy.ts");
  const registry = read("../game/panels/panel-registry.tsx");
  const service = read("../production-queue/services/department-queue-view.ts");
  const action = read(
    "../production-queue/actions/start-outsource-job-action.ts",
  );

  assert.match(queue, /Sortable/);
  assert.match(queue, /SortableItemHandle/);
  assert.match(queue, /updateDepartmentWorkloadPriorityAction/);
  assert.match(queue, /isShiftPlaybackActive/);
  assert.match(queue, /productionQueueCopy/);
  assert.match(copy, /Internal Line Queue/);
  assert.match(copy, /Fason Teklifi Bekleyen/);
  assert.match(registry, /<DepartmentQueuePanel[\s\S]*?locale=\{snapshot\.locale\}/);
  assert.match(service, /locale\?: SupportedLocale \| string/);
  assert.match(action, /getPlayerPreferredLocale\(auth\.id\)/);
  assert.doesNotMatch(queue, /updateDepartmentQueueAction/);
});

test("departman drag action ayrı queuePriority yazmak yerine ProductionOrder priority kullanır", () => {
  const action = read(
    "../production-queue/actions/update-department-workload-priority-action.ts",
  );

  assert.match(action, /mergeDepartmentOrderPriority/);
  assert.match(action, /tx\.productionOrder\.update/);
  assert.match(action, /getActiveShiftPlayback/);
  assert.doesNotMatch(action, /queuePriority|manualPriorityOverride/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("sipariş paneli production priority tabını kaldırıp doğrudan pazarı gösterir", () => {
  const panel = read("./components/orders-panel.tsx");

  assert.doesNotMatch(panel, /Üretim Önceliği/);
  assert.doesNotMatch(panel, /OrderPriorityList/);
  assert.match(panel, /Sipariş Pazarı/);
  assert.match(panel, /OrderSidebarPanel/);
  assert.match(panel, /SelectedOrderDetail/);
  assert.match(panel, /OrderCostPanel/);
  assert.doesNotMatch(panel, /OrderMarketEntryPanel/);
  assert.match(panel, /Normal Siparişler/);
  assert.match(panel, /RPT Order/);
  assert.match(panel, /Express Order/);
  assert.match(panel, /Premium Products/);
  assert.match(panel, /Luxury/);
  assert.match(panel, /Filtreyi değiştir/);
  assert.match(panel, /matchesMarketFilter/);
  assert.match(panel, /CustomerRelationshipCard/);
  assert.match(panel, /Müşteri İlişkisi/);
});

test("sipariş paneli ürün kart arka planında ArtCard deneme bileşenini kullanır", () => {
  const panel = read("./components/orders-panel.tsx");
  const artCard = read("../../components/ui/art-card.tsx");
  const marketView = read("./services/order-market-view.ts");

  assert.match(panel, /import \{ ArtCard \}/);
  assert.match(panel, /gradientFrom=\{item\.cardGradientFrom\}/);
  assert.match(panel, /gradientTo=\{item\.cardGradientTo\}/);
  assert.match(panel, /primaryColor=\{item\.cardPrimaryColor\}/);
  assert.match(panel, /secondaryColor=\{item\.cardSecondaryColor\}/);
  assert.match(panel, /svgIconAccentColor=\{item\.cardSvgIconAccentColor\}/);
  assert.doesNotMatch(panel, /drop-shadow/);
  assert.match(panel, /import Image from "next\/image"/);
  assert.match(panel, /data-product-art-layer="true"/);
  assert.match(panel, /data-product-image-layer="true"/);
  assert.match(panel, /className="pointer-events-none absolute inset-0 z-30"/);
  assert.match(panel, /alt=\{item\.productName\}/);
  assert.match(panel, /className="object-contain object-bottom"/);
  assert.match(panel, /fill/);
  assert.match(artCard, /linear-gradient\(to top left, \$\{gradientFrom\}/);
  assert.match(artCard, /colorToTopLeftGradient\(secondaryColor\)/);
  assert.match(artCard, /colorToTopLeftGradient\(svgIconAccentColor\)/);
  assert.match(artCard, /colorToTopLeftGradient\(primaryColor\)/);
  assert.doesNotMatch(artCard, /absolute inset-0 bg-\[linear-gradient/);
  assert.match(marketView, /productImage\.variant === ProductImageVariant\.CARD/);
});

test("koleksiyon siparişlerinde tüm ürün detayları carousel ile gezilebilir", () => {
  const panel = read("./components/orders-panel.tsx");

  assert.match(panel, /SelectedOrderPanels/);
  assert.match(panel, /CollectionCarouselControls/);
  assert.match(panel, /Önceki koleksiyon ürünü/);
  assert.match(panel, /Sonraki koleksiyon ürünü/);
  assert.match(panel, /activeItem=\{activeItem\}/);
  assert.match(panel, /activeItemId=\{activeItem\.id\}/);
  assert.match(panel, /Kalem Tutarı/);
  assert.match(panel, /Kalem Maliyeti/);
  assert.match(panel, /Kalem Karı/);
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

  assert.match(queue, /Sortable/);
  assert.match(queue, /SortableItemHandle/);
  assert.match(queue, /updateDepartmentWorkloadPriorityAction/);
  assert.match(queue, /isShiftPlaybackActive/);
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

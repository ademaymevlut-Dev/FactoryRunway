import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("sipariş paneli global draggable priority listesini mevcut Sortable ile gösterir", () => {
  const panel = read("./components/orders-panel.tsx");
  const priority = read("./components/order-priority-list.tsx");

  assert.match(panel, /Üretim Önceliği/);
  assert.match(panel, /OrderPriorityList/);
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

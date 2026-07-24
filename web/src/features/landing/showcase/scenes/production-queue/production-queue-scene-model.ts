import { resolveShowcaseProduct } from "../../catalog-resolver";
import type {
  ProductionQueueLocale,
  ProductionQueueSceneCopy,
  ProductionQueueSceneData,
  ProductionQueueSceneModel,
  ResolvedProductionQueueItem,
} from "./production-queue-scene-types";

function assertUnique(values: readonly string[], field: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${field} değerleri benzersiz olmalı.`);
  }
}

function assertSameIdSet(
  itemIds: readonly string[],
  order: readonly string[],
  field: string,
) {
  if (
    itemIds.length !== order.length ||
    itemIds.some((id) => !order.includes(id))
  ) {
    throw new Error(`${field} bütün queue item ID'lerini içermeli.`);
  }
}

function assertNonNegativeInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} pozitif veya sıfır tam sayı olmalı.`);
  }
}

function validateCallouts(copy: ProductionQueueSceneCopy) {
  assertUnique(
    copy.callouts.map((callout) => callout.id),
    "Callout id",
  );
  assertUnique(
    copy.callouts.map((callout) => callout.target),
    "Callout target",
  );
}

export function createProductionQueueSceneModel(
  data: ProductionQueueSceneData,
  locale: ProductionQueueLocale,
  copy?: ProductionQueueSceneCopy,
): ProductionQueueSceneModel {
  const itemIds = data.items.map((item) => item.id);

  if (data.items.length !== 4) {
    throw new Error("Production queue showcase tam olarak dört item içermeli.");
  }

  assertUnique(itemIds, "Queue item id");
  assertUnique(data.initialOrder, "Initial order");
  assertUnique(data.reorderedOrder, "Reordered order");
  assertSameIdSet(itemIds, data.initialOrder, "Initial order");
  assertSameIdSet(itemIds, data.reorderedOrder, "Reordered order");

  if (!itemIds.includes(data.movedItemId)) {
    throw new Error(`Moved queue item bulunamadı: ${data.movedItemId}`);
  }

  if (
    data.initialOrder[1] !== data.movedItemId ||
    data.reorderedOrder[0] !== data.movedItemId
  ) {
    throw new Error("Moved queue item ikinci sıradan birinci sıraya taşınmalı.");
  }

  if (copy) {
    validateCallouts(copy);
  }

  const items = data.items.map<ResolvedProductionQueueItem>((item) => {
    assertNonNegativeInteger(
      item.remainingQuantity,
      `${item.id}.remainingQuantity`,
    );
    assertNonNegativeInteger(
      item.initialPlannedProduction,
      `${item.id}.initialPlannedProduction`,
    );
    assertNonNegativeInteger(
      item.reorderedPlannedProduction,
      `${item.id}.reorderedPlannedProduction`,
    );
    assertNonNegativeInteger(item.dueInDays, `${item.id}.dueInDays`);

    return {
      ...item,
      product: resolveShowcaseProduct(item.productKey),
    };
  });
  const itemsById = Object.fromEntries(
    items.map((item) => [item.id, item]),
  ) as Record<string, ResolvedProductionQueueItem>;
  const activeItem = itemsById[data.movedItemId];

  if (!activeItem || activeItem.product.key !== "sportise_twinset") {
    throw new Error("Moved queue item SPORTISE ürününü çözmeli.");
  }

  const departmentStep = activeItem.product.route.find(
    (step) => step.departmentKey === data.departmentKey,
  );

  if (!departmentStep?.labels[locale]) {
    throw new Error(
      `Showcase department bulunamadı: ${data.departmentKey}/${locale}`,
    );
  }

  const outsourceStep = activeItem.product.route.find(
    (step) => step.departmentKey === "printing" && step.canOutsource,
  );

  if (!outsourceStep) {
    throw new Error("SPORTISE printing adımı fasona uygun olmalı.");
  }

  for (const item of items) {
    for (const routeStep of item.product.route) {
      if (!routeStep.labels[locale]) {
        throw new Error(
          `Showcase route locale bulunamadı: ${item.product.key}/${routeStep.departmentKey}/${locale}`,
        );
      }
    }
  }

  return {
    activeItem,
    departmentName: departmentStep.labels[locale],
    departmentStep,
    items,
    itemsById,
    outsourceStep,
    totalWorkload: activeItem.product.route.reduce(
      (total, step) => total + step.workloadPointsPerUnit,
      0,
    ),
  };
}

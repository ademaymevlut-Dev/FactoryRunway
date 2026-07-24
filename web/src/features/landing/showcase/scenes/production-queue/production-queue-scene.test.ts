import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getShowcaseCatalogProducts,
  resolveShowcaseProduct,
} from "../../catalog-resolver";
import { productionQueueSceneCopyTr } from "./production-queue-scene-copy";
import { productionQueueSceneData } from "./production-queue-scene-data";
import { createProductionQueueSceneModel } from "./production-queue-scene-model";
import {
  createInitialProductionQueueSceneState,
  reduceProductionQueueScene,
} from "./production-queue-scene-state";
import type {
  ProductionQueueSceneData,
  ProductionQueueSceneModel,
} from "./production-queue-scene-types";
import { ProductionQueueSceneView } from "./production-queue-scene-view";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function createRenderableModel(): ProductionQueueSceneModel {
  const model = structuredClone(
    createProductionQueueSceneModel(
      productionQueueSceneData,
      "tr",
      productionQueueSceneCopyTr,
    ),
  );

  for (const item of model.items) {
    item.product.imageUrl = `/showcase/${item.product.key}.webp`;
  }

  for (const item of Object.values(model.itemsById)) {
    item.product.imageUrl = `/showcase/${item.product.key}.webp`;
  }

  model.activeItem.product.imageUrl = "/showcase/sportise_twinset.webp";
  return model;
}

test("scene data dört geçerli item ve deterministik sıra sözleşmesini kullanır", () => {
  const itemIds = productionQueueSceneData.items.map((item) => item.id);
  const catalogKeys = new Set(
    getShowcaseCatalogProducts().map((product) => product.key),
  );
  const calloutIds = productionQueueSceneCopyTr.callouts.map(
    (callout) => callout.id,
  );
  const calloutTargets = productionQueueSceneCopyTr.callouts.map(
    (callout) => callout.target,
  );

  assert.equal(itemIds.length, 4);
  assert.equal(new Set(itemIds).size, 4);
  assert.deepEqual(
    new Set(productionQueueSceneData.initialOrder),
    new Set(productionQueueSceneData.reorderedOrder),
  );
  assert.equal(productionQueueSceneData.initialOrder[1], "queue-sportise");
  assert.equal(productionQueueSceneData.reorderedOrder[0], "queue-sportise");
  assert.equal(productionQueueSceneData.movedItemId, "queue-sportise");

  for (const item of productionQueueSceneData.items) {
    assert.ok(catalogKeys.has(item.productKey), item.productKey);
    assert.ok(item.remainingQuantity >= 0);
    assert.ok(item.initialPlannedProduction >= 0);
    assert.ok(item.reorderedPlannedProduction >= 0);
  }

  assert.equal(new Set(calloutIds).size, 6);
  assert.equal(new Set(calloutTargets).size, 6);
});

test("SPORTISE katalog adı, rota sırası, workload ve fason bilgisini aynen çözer", () => {
  const product = resolveShowcaseProduct("sportise_twinset");
  const model = createProductionQueueSceneModel(
    productionQueueSceneData,
    "tr",
    productionQueueSceneCopyTr,
  );

  assert.equal(model.activeItem.product.name, "SPORTISE");
  assert.equal(model.activeItem.product, product);
  assert.equal(model.departmentName, "Dikim");
  assert.equal(model.departmentStep.departmentKey, "sewing");
  assert.equal(model.outsourceStep.departmentKey, "printing");
  assert.equal(model.outsourceStep.canOutsource, true);
  assert.equal(model.totalWorkload, 95);
  assert.deepEqual(
    model.activeItem.product.route.map((step) => [
      step.departmentKey,
      step.workloadPointsPerUnit,
      step.canOutsource,
    ]),
    [
      ["cutting", 17, false],
      ["printing", 26, true],
      ["sewing", 36, false],
      ["ironing_packing", 16, false],
    ],
  );
});

test("scene model eksik, tekrarlı veya geçersiz queue verisini reddeder", () => {
  const missingItemOrder: ProductionQueueSceneData = {
    ...structuredClone(productionQueueSceneData),
    reorderedOrder: [
      "queue-sportise",
      "queue-clavier",
      "queue-backham",
    ],
  };
  const duplicateOrder: ProductionQueueSceneData = {
    ...structuredClone(productionQueueSceneData),
    reorderedOrder: [
      "queue-sportise",
      "queue-clavier",
      "queue-backham",
      "queue-backham",
    ],
  };
  const invalidPlanned: ProductionQueueSceneData = {
    ...structuredClone(productionQueueSceneData),
    items: productionQueueSceneData.items.map((item) =>
      item.id === "queue-sportise"
        ? { ...item, reorderedPlannedProduction: -1 }
        : item,
    ),
  };

  assert.throws(
    () => createProductionQueueSceneModel(missingItemOrder, "tr"),
    /bütün queue item ID'lerini içermeli/,
  );
  assert.throws(
    () => createProductionQueueSceneModel(duplicateOrder, "tr"),
    /Reordered order değerleri benzersiz olmalı/,
  );
  assert.throws(
    () => createProductionQueueSceneModel(invalidPlanned, "tr"),
    /pozitif veya sıfır tam sayı olmalı/,
  );
});

test("reducer gerçek sırayı ve planı birlikte günceller, idempotent kalır ve replay yapar", () => {
  const initial = createInitialProductionQueueSceneState(
    productionQueueSceneData,
  );
  const reordering = reduceProductionQueueScene(initial, {
    type: "start-reorder",
  });
  const reordered = reduceProductionQueueScene(reordering, {
    data: productionQueueSceneData,
    type: "reorder",
  });
  const duplicateReorder = reduceProductionQueueScene(reordered, {
    data: productionQueueSceneData,
    type: "reorder",
  });
  const updated = reduceProductionQueueScene(reordered, {
    type: "finish-reorder",
  });
  const notified = reduceProductionQueueScene(updated, {
    liveMessage: productionQueueSceneCopyTr.liveReorderMessage,
    type: "show-update",
  });
  const completed = reduceProductionQueueScene(notified, {
    type: "complete",
  });
  const replayed = reduceProductionQueueScene(completed, {
    data: productionQueueSceneData,
    type: "replay",
  });

  assert.deepEqual(initial.queueOrder, productionQueueSceneData.initialOrder);
  assert.equal(initial.plannedProductionByItemId["queue-clavier"], 520);
  assert.equal(initial.plannedProductionByItemId["queue-sportise"], 0);
  assert.deepEqual(
    reordered.queueOrder,
    productionQueueSceneData.reorderedOrder,
  );
  assert.equal(reordered.status, "reordering");
  assert.equal(reordered.plannedProductionByItemId["queue-clavier"], 0);
  assert.equal(reordered.plannedProductionByItemId["queue-sportise"], 280);
  assert.equal(new Set(reordered.queueOrder).size, 4);
  assert.strictEqual(duplicateReorder, reordered);
  assert.equal(notified.isNotificationVisible, true);
  assert.equal(notified.liveMessage, "SPORTISE siparişi birinci sıraya taşındı.");
  assert.equal(completed.status, "completed");
  assert.deepEqual(replayed, initial);
});

test("reduced motion sonucu doğrudan güncel ve erişilebilir son durumu kurar", () => {
  const initial = createInitialProductionQueueSceneState(
    productionQueueSceneData,
  );
  const reduced = reduceProductionQueueScene(initial, {
    data: productionQueueSceneData,
    liveMessage: productionQueueSceneCopyTr.liveReorderMessage,
    type: "show-reduced-motion-result",
  });

  assert.equal(reduced.status, "completed");
  assert.equal(reduced.queueOrder[0], "queue-sportise");
  assert.equal(reduced.plannedProductionByItemId["queue-sportise"], 280);
  assert.equal(reduced.isNotificationVisible, true);
  assert.equal(reduced.activeTarget, "queue-updated-plan");
});

test("render Dikim kuyruğunu, gerçek DOM reorderı, detayları ve bildirimi gösterir", () => {
  const model = createRenderableModel();
  const initial = createInitialProductionQueueSceneState(
    productionQueueSceneData,
  );
  const reordered = reduceProductionQueueScene(initial, {
    data: productionQueueSceneData,
    type: "reorder",
  });
  const completed = reduceProductionQueueScene(
    reduceProductionQueueScene(
      reduceProductionQueueScene(reordered, { type: "finish-reorder" }),
      {
        liveMessage: productionQueueSceneCopyTr.liveReorderMessage,
        type: "show-update",
      },
    ),
    { type: "complete" },
  );
  const renderView = (
    state: ReturnType<typeof createInitialProductionQueueSceneState>,
  ) =>
    renderToStaticMarkup(
      createElement(ProductionQueueSceneView, {
        copy: productionQueueSceneCopyTr,
        locale: "tr",
        model,
        numberLocale: "tr-TR",
        onCalloutSelect: () => undefined,
        onReplay: () => undefined,
        sceneId: productionQueueSceneData.sceneId,
        state,
      }),
    );
  const initialMarkup = renderView(initial);
  const completedMarkup = renderView(completed);
  const initialClavierIndex = initialMarkup.indexOf(
    'data-production-queue-item="queue-clavier"',
  );
  const initialSportiseIndex = initialMarkup.indexOf(
    'data-production-queue-item="queue-sportise"',
  );
  const completedClavierIndex = completedMarkup.indexOf(
    'data-production-queue-item="queue-clavier"',
  );
  const completedSportiseIndex = completedMarkup.indexOf(
    'data-production-queue-item="queue-sportise"',
  );

  assert.match(initialMarkup, /Dikim/);
  assert.equal(
    initialMarkup.match(/data-production-queue-item=/g)?.length,
    4,
  );
  assert.ok(initialClavierIndex < initialSportiseIndex);
  assert.match(initialMarkup, /1\.450 adet/);
  assert.match(initialMarkup, /520 adet/);
  assert.match(initialMarkup, /Teslim Riski/);
  assert.match(initialMarkup, /95 puan \/ adet/);
  assert.match(initialMarkup, /Baskı işlemi fasona gönderilebilir/);
  assert.equal(initialMarkup.match(/data-callout-target=/g)?.length, 6);
  assert.ok(completedSportiseIndex < completedClavierIndex);
  assert.match(completedMarkup, /280 adet/);
  assert.match(completedMarkup, /Üretim önceliği güncellendi/);
  assert.match(
    completedMarkup,
    /SPORTISE siparişi birinci sıraya taşındı\./,
  );
  assert.match(completedMarkup, /aria-hidden="false"/);
});

test("scene bağımlılık, gerçek FLIP ve index entegrasyonu sınırlarını korur", () => {
  const scene = read("./production-queue-scene.tsx");
  const timeline = read("./production-queue-timeline.ts");
  const page = read("../../../../../app/page.tsx");
  const row = read(
    "../../../../../components/game-presentation/production-queue-row.tsx",
  );
  const combinedSource = `${scene}\n${timeline}`;

  for (const forbidden of [
    /@prisma|generated\/prisma/,
    /\/actions(?:\/|")/,
    /useGameUiStore/,
    /next\/navigation/,
    /@dnd-kit/,
    /\bfetch\s*\(/,
    /factoryId/,
    /router\.refresh/,
    /DepartmentQueuePanel/,
    /OrderPriorityList/,
  ]) {
    assert.doesNotMatch(combinedSource, forbidden);
  }

  assert.match(timeline, /root\.querySelector/);
  assert.doesNotMatch(timeline, /document\.querySelector/);
  assert.match(timeline, /getBoundingClientRect/);
  assert.match(timeline, /firstPositions/);
  assert.match(
    timeline,
    /addLabel\("production-queue-list", 0\.8\)/,
  );
  assert.doesNotMatch(
    timeline,
    /addLabel\("production-queue-list", 0\)/,
  );
  assert.match(timeline, /onReorder\(\)/);
  assert.match(scene, /flushSync/);
  assert.match(row, /layout = "default"/);
  assert.match(row, /layout === "showcase"/);

  const orderAcceptanceIndex = page.indexOf(
    "<LandingOrderAcceptanceSection />",
  );
  const productionQueueIndex = page.indexOf(
    "<LandingProductionQueueSection />",
  );

  assert.ok(orderAcceptanceIndex >= 0);
  assert.ok(productionQueueIndex > orderAcceptanceIndex);
});

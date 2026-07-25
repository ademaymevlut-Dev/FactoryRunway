import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getShowcaseCatalogProducts,
  resolveShowcaseProduct,
} from "../../catalog-resolver";
import { orderAcceptanceSceneCopyTr } from "./order-acceptance-scene-copy";
import { orderAcceptanceSceneData } from "./order-acceptance-scene-data";
import { createOrderAcceptanceSceneModel } from "./order-acceptance-scene-model";
import {
  createInitialOrderAcceptanceSceneState,
  reduceOrderAcceptanceScene,
} from "./order-acceptance-scene-state";
import type { OrderAcceptanceSceneData } from "./order-acceptance-scene-types";
import { OrderAcceptanceSceneView } from "./order-acceptance-scene-view";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function cloneSceneData(): OrderAcceptanceSceneData {
  return structuredClone(orderAcceptanceSceneData);
}

test("scene data üç katalog ürününü ve kesin CLAVIER teklifini kullanır", () => {
  const catalogKeys = new Set(
    getShowcaseCatalogProducts().map((product) => product.key),
  );
  const selectedOffer = orderAcceptanceSceneData.offers.find(
    (offer) => offer.id === orderAcceptanceSceneData.selectedOfferId,
  );

  assert.equal(orderAcceptanceSceneData.offers.length, 3);
  assert.equal(orderAcceptanceSceneData.selectedOfferId, "offer-clavier");
  assert.equal(selectedOffer?.productKey, "clavier_tshirt");

  for (const offer of orderAcceptanceSceneData.offers) {
    assert.ok(catalogKeys.has(offer.productKey), offer.productKey);
    assert.equal(
      Math.round(offer.unitPrice * 100) * offer.quantity,
      Math.round(offer.totalRevenue * 100),
    );
  }
});

test("CLAVIER renk allocation ve callout sözleşmeleri deterministiktir", () => {
  const product = resolveShowcaseProduct("clavier_tshirt");
  const allocationKeys = orderAcceptanceSceneData.colorAllocation.map(
    (allocation) => allocation.colorKey,
  );
  const allocationTotal = orderAcceptanceSceneData.colorAllocation.reduce(
    (total, allocation) => total + allocation.quantity,
    0,
  );
  const calloutIds = orderAcceptanceSceneCopyTr.callouts.map(
    (callout) => callout.id,
  );
  const calloutTargets = orderAcceptanceSceneCopyTr.callouts.map(
    (callout) => callout.target,
  );

  assert.deepEqual(
    allocationKeys,
    product.colors.map((color) => color.key),
  );
  assert.equal(allocationKeys.length, 6);
  assert.equal(allocationTotal, 4_800);
  assert.equal(new Set(calloutIds).size, 6);
  assert.equal(new Set(calloutTargets).size, 6);
});

test("catalog resolver isim, renk ve route sırasını değiştirmeden çözer", () => {
  const product = resolveShowcaseProduct("clavier_tshirt");

  assert.equal(product.name, "CLAVIER");
  assert.match(
    product.imageUrl,
    /^https:\/\/.+\.public\.blob\.vercel-storage\.com\//,
  );
  assert.deepEqual(
    product.colors.map((color) => color.key),
    [
      "basic_black",
      "basic_white",
      "basic_red",
      "basic_navy",
      "fw_muted_clay",
      "fw_neptune_green",
    ],
  );
  assert.deepEqual(
    product.route.map((step) => [
      step.departmentKey,
      step.sequence,
      step.workloadPointsPerUnit,
    ]),
    [
      ["cutting", 1, 10],
      ["sewing", 2, 16],
      ["ironing_packing", 3, 14],
    ],
  );
  assert.throws(
    () => resolveShowcaseProduct("missing-product"),
    /Showcase product bulunamadı: missing-product/,
  );
});

test("scene model katalog dışı renk ve geçersiz allocation toplamını reddeder", () => {
  const missingColor = cloneSceneData();
  missingColor.colorAllocation = missingColor.colorAllocation.map(
    (allocation, index) =>
      index === 0
        ? { ...allocation, colorKey: "missing-color" }
        : allocation,
  );

  assert.throws(
    () =>
      createOrderAcceptanceSceneModel(
        missingColor,
        "tr",
        orderAcceptanceSceneCopyTr,
      ),
    /Renk allocation sırası generated katalogla eşleşmiyor/,
  );

  const invalidTotal = cloneSceneData();
  invalidTotal.colorAllocation = invalidTotal.colorAllocation.map(
    (allocation, index) =>
      index === 0 ? { ...allocation, quantity: 799 } : allocation,
  );

  assert.throws(
    () =>
      createOrderAcceptanceSceneModel(
        invalidTotal,
        "tr",
        orderAcceptanceSceneCopyTr,
      ),
    /Renk allocation toplamı sipariş miktarına eşit değil/,
  );
});

test("accept idempotent, notification görünür ve replay başlangıcı geri yükler", () => {
  const initial = createInitialOrderAcceptanceSceneState("offer-clavier");
  const accepted = reduceOrderAcceptanceScene(initial, { type: "accept" });
  const duplicateAccept = reduceOrderAcceptanceScene(accepted, {
    type: "accept",
  });
  const replayed = reduceOrderAcceptanceScene(accepted, {
    selectedOfferId: "offer-clavier",
    type: "replay",
  });

  assert.equal(initial.status, "idle");
  assert.equal(initial.isNotificationVisible, false);
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.isNotificationVisible, true);
  assert.strictEqual(duplicateAccept, accepted);
  assert.deepEqual(replayed, initial);
});

test("scene renderı CLAVIER detaylarını, altı callout ve kabul sonucunu gösterir", () => {
  const model = structuredClone(
    createOrderAcceptanceSceneModel(
      orderAcceptanceSceneData,
      "tr",
      orderAcceptanceSceneCopyTr,
    ),
  );
  model.product.imageUrl = "/showcase/clavier.webp";
  const initialState = createInitialOrderAcceptanceSceneState("offer-clavier");
  const acceptedState = reduceOrderAcceptanceScene(initialState, {
    type: "accept",
  });
  const renderView = (
    state: ReturnType<typeof createInitialOrderAcceptanceSceneState>,
  ) =>
    renderToStaticMarkup(
      createElement(OrderAcceptanceSceneView, {
        copy: orderAcceptanceSceneCopyTr,
        model,
        numberLocale: "tr-TR",
        onAccept: () => undefined,
        onCalloutSelect: () => undefined,
        onReplay: () => undefined,
        sceneId: orderAcceptanceSceneData.sceneId,
        state,
      }),
    );
  const initialMarkup = renderView(initialState);
  const acceptedMarkup = renderView(acceptedState);

  assert.match(initialMarkup, /CLAVIER/);
  assert.match(initialMarkup, /4\.800 adet/);
  assert.match(initialMarkup, /20 gün/);
  assert.match(initialMarkup, /Siyah/);
  assert.match(initialMarkup, /Petrol/);
  assert.match(initialMarkup, /Kesim/);
  assert.match(initialMarkup, /Dikim/);
  assert.match(initialMarkup, /Ütü - Paket/);
  assert.match(initialMarkup, /Siparişi Kabul Et/);
  assert.equal(initialMarkup.match(/data-callout-target=/g)?.length, 6);
  assert.match(acceptedMarkup, /Üretim Planına Eklendi/);
  assert.match(acceptedMarkup, /Sipariş kabul edildi/);
  assert.match(acceptedMarkup, /aria-hidden="false"/);
});

test("scene dependency ve animation lifecycle sınırlarını korur", () => {
  const scene = read("./order-acceptance-scene.tsx");
  const timeline = read("./order-acceptance-timeline.ts");
  const playback = read("../../hooks/use-showcase-playback.ts");
  const page = read("../../../components/landing-page.tsx");
  const combinedSceneSource = `${scene}\n${timeline}`;

  for (const forbidden of [
    /@prisma|generated\/prisma/,
    /\/actions(?:\/|")/,
    /useGameUiStore/,
    /next\/navigation/,
    /\bfetch\s*\(/,
    /factoryId/,
  ]) {
    assert.doesNotMatch(combinedSceneSource, forbidden);
  }

  assert.match(timeline, /root\.querySelector/);
  assert.match(
    timeline,
    /\{ position: 0\.8, target: "order-offer-list" \}/,
  );
  assert.doesNotMatch(timeline, /addLabel\("order-offer-list", 0\)/);
  assert.doesNotMatch(timeline, /document\.querySelector/);
  assert.match(playback, /IntersectionObserver/);
  assert.match(playback, /intersectionRatio >= 0\.35/);
  assert.match(playback, /visibilitychange/);
  assert.match(playback, /timeline\?\.kill\(\)/);
  assert.match(playback, /context\?\.revert\(\)/);
  assert.match(playback, /prefers-reduced-motion: reduce/);
  assert.match(page, /<LandingOrderAcceptanceSection content=\{content\} \/>/);
});

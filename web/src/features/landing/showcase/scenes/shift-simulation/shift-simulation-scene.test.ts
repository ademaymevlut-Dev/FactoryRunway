import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { resolveShowcaseProduct } from "../../catalog-resolver";
import {
  formatShiftSimulationTime,
} from "./shift-simulation-formatters";
import { shiftSimulationSceneCopyTr } from "./shift-simulation-scene-copy";
import { shiftSimulationSceneData } from "./shift-simulation-scene-data";
import { createShiftSimulationSceneModel } from "./shift-simulation-scene-model";
import {
  createInitialShiftSimulationSceneState,
  reduceShiftSimulationScene,
} from "./shift-simulation-scene-state";
import type {
  ShiftSimulationSceneData,
  ShiftSimulationSceneModel,
} from "./shift-simulation-scene-types";
import { ShiftSimulationSceneView } from "./shift-simulation-scene-view";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function createRenderableModel(): ShiftSimulationSceneModel {
  const model = structuredClone(
    createShiftSimulationSceneModel(
      shiftSimulationSceneData,
      "tr",
      shiftSimulationSceneCopyTr,
    ),
  );
  const products = [
    model.product,
    ...model.departments.map((department) => department.product),
    ...model.finishedGoods.map((item) => item.product),
  ];

  for (const product of products) {
    product.imageUrl = `/showcase/${product.key}.webp`;
  }

  return model;
}

test("scene data kesin BACKHAM vardiya, event ve callout sözleşmesini kullanır", () => {
  const departmentKeys = shiftSimulationSceneData.departments.map(
    (department) => department.departmentKey,
  );
  const calloutIds = shiftSimulationSceneCopyTr.callouts.map(
    (callout) => callout.id,
  );
  const calloutTargets = shiftSimulationSceneCopyTr.callouts.map(
    (callout) => callout.target,
  );
  const cutting = shiftSimulationSceneData.departments.find(
    (department) => department.departmentKey === "cutting",
  );
  const sewing = shiftSimulationSceneData.departments.find(
    (department) => department.departmentKey === "sewing",
  );
  const ironing = shiftSimulationSceneData.departments.find(
    (department) => department.departmentKey === "ironing_packing",
  );
  const event = shiftSimulationSceneData.events[0];

  assert.equal(shiftSimulationSceneData.productKey, "backham_blazer");
  assert.equal(new Set(departmentKeys).size, 3);
  assert.deepEqual(
    [cutting?.plannedQuantity, cutting?.actualQuantity],
    [210, 210],
  );
  assert.deepEqual(
    [sewing?.plannedQuantity, sewing?.actualQuantity],
    [120, 90],
  );
  assert.deepEqual(
    [ironing?.plannedQuantity, ironing?.actualQuantity],
    [96, 96],
  );
  assert.equal(shiftSimulationSceneData.finishedGoods[0]?.quantity, 96);
  assert.equal(event?.code, "SEWING_MACHINE_BREAKDOWN");
  assert.equal(event?.departmentKey, "sewing");
  assert.equal(event?.impactPercent, 25);
  assert.equal(event?.triggerProgress, 0.48);
  assert.ok(shiftSimulationSceneData.shift.playbackDurationMs > 0);
  assert.equal(new Set(calloutIds).size, 6);
  assert.equal(new Set(calloutTargets).size, 6);
});

test("BACKHAM adı, route sırası, departman label ve workload değerleri katalogdan çözülür", () => {
  const product = resolveShowcaseProduct("backham_blazer");
  const model = createShiftSimulationSceneModel(
    shiftSimulationSceneData,
    "tr",
    shiftSimulationSceneCopyTr,
  );

  assert.equal(model.product.key, product.key);
  assert.equal(model.product.category.label, product.category.labels.tr);
  assert.equal(
    model.product.productType.label,
    product.productType.labels.tr,
  );
  assert.equal(model.product.name, "BACKHAM");
  assert.deepEqual(
    model.product.route.map((step) => [
      step.departmentKey,
      step.workloadPointsPerUnit,
    ]),
    [
      ["cutting", 45],
      ["sewing", 160],
      ["ironing_packing", 60],
    ],
  );
  assert.deepEqual(
    model.departments.map((department) => department.departmentName),
    ["Kesim", "Dikim", "Ütü - Paket"],
  );
  assert.equal(model.totalWorkload, 265);
});

test("model Dikim farkını ve bitmiş ürünü aynı gün transfer varsayımı olmadan kurar", () => {
  const model = createShiftSimulationSceneModel(
    shiftSimulationSceneData,
    "tr",
    shiftSimulationSceneCopyTr,
  );
  const actualDepartmentTotal = model.departments.reduce(
    (total, department) => total + department.actualQuantity,
    0,
  );

  assert.equal(model.departmentsByKey.sewing?.difference, -30);
  assert.equal(model.departmentsByKey.sewing?.achievementPercent, 75);
  assert.equal(model.departmentsByKey.ironing_packing?.actualQuantity, 96);
  assert.equal(model.finishedGoods[0]?.quantity, 96);
  assert.equal(actualDepartmentTotal, 396);
  assert.notEqual(model.finishedGoods[0]?.quantity, actualDepartmentTotal);
  assert.equal("totalProduced" in model, false);
});

test("model geçersiz finished goods, departman ve playback verisini reddeder", () => {
  const invalidFinishedGoods: ShiftSimulationSceneData = {
    ...structuredClone(shiftSimulationSceneData),
    finishedGoods: [{ productKey: "backham_blazer", quantity: 95 }],
  };
  const duplicateDepartment: ShiftSimulationSceneData = {
    ...structuredClone(shiftSimulationSceneData),
    departments: [
      shiftSimulationSceneData.departments[0],
      shiftSimulationSceneData.departments[0],
      shiftSimulationSceneData.departments[2],
    ],
  };
  const invalidDuration: ShiftSimulationSceneData = {
    ...structuredClone(shiftSimulationSceneData),
    shift: {
      ...shiftSimulationSceneData.shift,
      playbackDurationMs: 0,
    },
  };

  assert.throws(
    () =>
      createShiftSimulationSceneModel(
        invalidFinishedGoods,
        "tr",
        shiftSimulationSceneCopyTr,
      ),
    /Finished goods yalnızca Ütü-Paket/,
  );
  assert.throws(
    () =>
      createShiftSimulationSceneModel(
        duplicateDepartment,
        "tr",
        shiftSimulationSceneCopyTr,
      ),
    /Department key değerleri benzersiz olmalı/,
  );
  assert.throws(
    () =>
      createShiftSimulationSceneModel(
        invalidDuration,
        "tr",
        shiftSimulationSceneCopyTr,
      ),
    /Shift playback süresi pozitif olmalı/,
  );
});

test("reducer event, completion, kalıcı summary, replay ve reduced motion durumlarını yönetir", () => {
  const initial = createInitialShiftSimulationSceneState(
    shiftSimulationSceneData,
  );
  const playing = reduceShiftSimulationScene(initial, { type: "start" });
  const duplicateStart = reduceShiftSimulationScene(playing, {
    type: "start",
  });
  const eventActive = reduceShiftSimulationScene(playing, {
    eventId: "event-sewing-machine-breakdown",
    liveMessage:
      shiftSimulationSceneCopyTr.eventCopies.SEWING_MACHINE_BREAKDOWN
        .liveMessage,
    type: "show-event",
  });
  const duplicateEvent = reduceShiftSimulationScene(eventActive, {
    eventId: "event-sewing-machine-breakdown",
    liveMessage: "ignored",
    type: "show-event",
  });
  const completed = reduceShiftSimulationScene(eventActive, {
    completionMessage: shiftSimulationSceneCopyTr.completionLiveMessage,
    data: shiftSimulationSceneData,
    type: "complete",
  });
  const summary = reduceShiftSimulationScene(completed, {
    completionMessage: shiftSimulationSceneCopyTr.completionLiveMessage,
    type: "open-summary",
  });
  const replayed = reduceShiftSimulationScene(summary, {
    data: shiftSimulationSceneData,
    type: "replay",
  });
  const reduced = reduceShiftSimulationScene(initial, {
    completionMessage: shiftSimulationSceneCopyTr.completionLiveMessage,
    data: shiftSimulationSceneData,
    type: "show-reduced-motion-result",
  });

  assert.equal(initial.status, "idle");
  assert.equal(playing.status, "playing");
  assert.strictEqual(duplicateStart, playing);
  assert.equal(eventActive.status, "event_active");
  assert.deepEqual(eventActive.visibleEventIds, [
    "event-sewing-machine-breakdown",
  ]);
  assert.strictEqual(duplicateEvent, eventActive);
  assert.equal(completed.status, "completed");
  assert.equal(completed.progress, 1);
  assert.equal(completed.displayTime, "17:00");
  assert.equal(completed.actualQuantityByDepartment.sewing, 90);
  assert.equal(summary.status, "summary_open");
  assert.equal(summary.isSummaryOpen, true);
  assert.equal(summary.isNotificationVisible, true);
  assert.deepEqual(replayed, initial);
  assert.equal(reduced.status, "summary_open");
  assert.equal(reduced.progress, 1);
  assert.equal(reduced.actualQuantityByDepartment.ironing_packing, 96);
  assert.equal(reduced.visibleEventIds.length, 1);
});

test("vardiya saat formatterı 08:00–17:00 checkpointlerini deterministik üretir", () => {
  assert.equal(formatShiftSimulationTime("08:00", "17:00", 0), "08:00");
  assert.equal(formatShiftSimulationTime("08:00", "17:00", 0.25), "10:15");
  assert.equal(formatShiftSimulationTime("08:00", "17:00", 0.5), "12:30");
  assert.equal(formatShiftSimulationTime("08:00", "17:00", 0.75), "14:45");
  assert.equal(formatShiftSimulationTime("08:00", "17:00", 1), "17:00");
});

test("render başlangıç planını ve final vardiya özetini eksiksiz gösterir", () => {
  const model = createRenderableModel();
  const initial = createInitialShiftSimulationSceneState(
    shiftSimulationSceneData,
  );
  const final = reduceShiftSimulationScene(initial, {
    completionMessage: shiftSimulationSceneCopyTr.completionLiveMessage,
    data: shiftSimulationSceneData,
    type: "show-reduced-motion-result",
  });
  const renderView = (
    state: ReturnType<typeof createInitialShiftSimulationSceneState>,
  ) =>
    renderToStaticMarkup(
      createElement(ShiftSimulationSceneView, {
        copy: shiftSimulationSceneCopyTr,
        data: shiftSimulationSceneData,
        model,
        numberLocale: "tr-TR",
        onCalloutSelect: () => undefined,
        onReplay: () => undefined,
        onStart: () => undefined,
        state,
      }),
    );
  const initialMarkup = renderView(initial);
  const finalMarkup = renderView(final);

  assert.match(initialMarkup, /BACKHAM/);
  assert.match(initialMarkup, /Vardiya İlerlemesi/);
  assert.match(initialMarkup, /Vardiyayı Başlat/);
  assert.match(initialMarkup, /mevcut yarı mamul stoklarıyla/);
  assert.equal(
    initialMarkup.match(/data-shift-department-result-view/g)?.length,
    3,
  );
  assert.equal(initialMarkup.match(/data-callout-target=/g)?.length, 6);
  assert.match(initialMarkup, /Planlanan/);
  assert.match(initialMarkup, /Gerçekleşen/);
  assert.match(finalMarkup, /Dikim hattında makine arızası/);
  assert.match(finalMarkup, /Darboğaz/);
  assert.match(finalMarkup, /Gün Sonu Üretim Özeti/);
  assert.match(finalMarkup, /96 BACKHAM/);
  assert.match(finalMarkup, /-30/);
  assert.match(finalMarkup, /data-shift-summary-open="true"/);
  assert.match(finalMarkup, /aria-hidden="false"/);
  assert.match(finalMarkup, /Vardiya tamamlandı/);
});

test("scene dependency, tek timeline, lifecycle ve index sınırlarını korur", () => {
  const scene = read("./shift-simulation-scene.tsx");
  const timeline = read("./shift-simulation-timeline.ts");
  const playback = read("../../hooks/use-showcase-playback.ts");
  const page = read("../../../components/landing-page.tsx");
  const progressView = read(
    "../../../../../components/game-presentation/shift-progress-view.tsx",
  );
  const departmentView = read(
    "../../../../../components/game-presentation/shift-department-result-view.tsx",
  );
  const countUp = read("../../../../../components/ui/CountUp.tsx");
  const combinedSource = `${scene}\n${timeline}`;

  for (const forbidden of [
    /@prisma|generated\/prisma/,
    /\/actions(?:\/|")/,
    /useGameUiStore/,
    /next\/navigation/,
    /advanceFactoryDayAction/,
    /features\/game\/shift-playback/,
    /\bfetch\s*\(/,
    /factoryId/,
    /router\.refresh/,
  ]) {
    assert.doesNotMatch(combinedSource, forbidden);
  }

  assert.match(timeline, /root\.querySelector/);
  assert.match(timeline, /addLabel\("shift-start", 0\.8\)/);
  assert.doesNotMatch(timeline, /addLabel\("shift-start", 0\)/);
  assert.doesNotMatch(timeline, /document\.querySelector/);
  assert.equal(timeline.match(/gsap\.timeline/g)?.length, 1);
  assert.doesNotMatch(timeline, /setInterval|setTimeout/);
  assert.match(timeline, /onUpdate/);
  assert.match(timeline, /textContent/);
  assert.match(timeline, /aria-valuenow/);
  assert.match(playback, /IntersectionObserver/);
  assert.match(playback, /intersectionRatio >= 0\.35/);
  assert.match(playback, /viewportRelativeRatio >= 0\.35/);
  assert.match(playback, /visibilitychange/);
  assert.match(playback, /timeline\?\.kill\(\)/);
  assert.match(playback, /context\?\.revert\(\)/);
  assert.match(progressView, /data-shift-current-time/);
  assert.match(departmentView, /data-shift-department-metric/);
  assert.match(countUp, /\(isInView \|\| immediate\)/);

  const productionQueueIndex = page.indexOf(
    "<LandingProductionQueueSection content={content} />",
  );
  const shiftSimulationIndex = page.indexOf(
    "<LandingShiftSimulationSection content={content} />",
  );

  assert.ok(productionQueueIndex >= 0);
  assert.ok(shiftSimulationIndex > productionQueueIndex);
});

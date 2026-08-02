import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FACTORY_MAP_BASE_SCALES,
  FACTORY_MAP_CANVAS_HEIGHT,
  FACTORY_MAP_INITIAL_FOCUS_POINT,
  getFactoryMapBaseScale,
  getFactoryMapBoundedOffset,
  getFactoryMapCameraInsets,
  getFactoryMapEffectiveScale,
  getFactoryMapInitialOffset,
  getFactoryMapReanchoredOffset,
  getFactoryMapUsableCenter,
  resolveFactoryMapViewportClass,
  type FactoryMapCameraInsets,
} from "./factory-map-layout";

const IPHONE_17_PRO_MAX_VIEWPORT = {
  width: 440,
  height: 714,
  inputMode: "coarse" as const,
};

const MOBILE_CAMERA_INSETS: FactoryMapCameraInsets = {
  top: 72,
  right: 8,
  bottom: 72,
  left: 72,
};

function assertClose(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} değeri ${expected} değerine ${tolerance} toleransla yakın değil`,
  );
}

const factoryMapSource = readFileSync(
  new URL("./components/factory-map.tsx", import.meta.url),
  "utf8",
);

test("responsive kamera ölçekleri masaüstü, tablet, telefon ve küçük telefonu ayırır", () => {
  assert.equal(
    getFactoryMapBaseScale(
      resolveFactoryMapViewportClass({
        width: 1_440,
        height: 900,
        inputMode: "fine",
      }),
    ),
    0.82,
  );
  assert.equal(
    getFactoryMapBaseScale(
      resolveFactoryMapViewportClass({
        width: 820,
        height: 1_180,
        inputMode: "coarse",
      }),
    ),
    0.76,
  );
  assert.equal(
    getFactoryMapBaseScale(
      resolveFactoryMapViewportClass(IPHONE_17_PRO_MAX_VIEWPORT),
    ),
    0.68,
  );
  assert.equal(
    getFactoryMapBaseScale(
      resolveFactoryMapViewportClass({
        width: 375,
        height: 667,
        inputMode: "coarse",
      }),
    ),
    0.64,
  );
  assert.deepEqual(FACTORY_MAP_BASE_SCALES, {
    "small-phone": 0.64,
    phone: 0.68,
    tablet: 0.76,
    desktop: 0.82,
  });
});

test("telefon ve tablet landscape modunda masaüstüne yanlış geçmez", () => {
  assert.equal(
    resolveFactoryMapViewportClass({
      width: 714,
      height: 440,
      inputMode: "coarse",
    }),
    "phone",
  );
  assert.equal(
    resolveFactoryMapViewportClass({
      width: 1_180,
      height: 820,
      inputMode: "coarse",
    }),
    "tablet",
  );
});

test("Safari toolbar yalnız yüksekliği değiştirince responsive sınıf değişmez", () => {
  const toolbarOpen = resolveFactoryMapViewportClass({
    width: 440,
    height: 714,
    inputMode: "coarse",
  });
  const toolbarClosed = resolveFactoryMapViewportClass({
    width: 440,
    height: 796,
    inputMode: "coarse",
  });

  assert.equal(toolbarOpen, "phone");
  assert.equal(toolbarClosed, toolbarOpen);
});

test("effective scale responsive base ile bağımsız mapZoom çarpımından gelir", () => {
  assertClose(getFactoryMapEffectiveScale({ baseScale: 0.82, mapZoom: 1 }), 0.82);
  assertClose(getFactoryMapEffectiveScale({ baseScale: 0.68, mapZoom: 1 }), 0.68);
  assertClose(
    getFactoryMapEffectiveScale({ baseScale: 0.68, mapZoom: 1.2 }),
    0.816,
  );
  assertClose(
    getFactoryMapEffectiveScale({ baseScale: Number.NaN, mapZoom: Number.NaN }),
    0.82,
  );
});

test("HUD ölçümleri kullanılabilir kamera insetlerini ve merkezini üretir", () => {
  const viewportRect = {
    top: 0,
    right: 440,
    bottom: 714,
    left: 0,
    width: 440,
    height: 714,
  };
  const cameraInsets = getFactoryMapCameraInsets({
    viewportRect,
    topHudRect: {
      top: 8,
      right: 432,
      bottom: 64,
      left: 8,
      width: 424,
      height: 56,
    },
    leftHudRect: {
      top: 220,
      right: 64,
      bottom: 420,
      left: 8,
      width: 56,
      height: 200,
    },
    bottomHudRects: [
      {
        top: 650,
        right: 432,
        bottom: 706,
        left: 8,
        width: 424,
        height: 56,
      },
    ],
  });

  assert.deepEqual(cameraInsets, MOBILE_CAMERA_INSETS);
  assert.deepEqual(
    getFactoryMapUsableCenter({
      cameraInsets,
      viewportHeight: viewportRect.height,
      viewportWidth: viewportRect.width,
    }),
    { x: 252, y: 357 },
  );
});

test("telefon ilk kamerası Office ve ilk üretim alanını HUD merkezine taşır ama dünyayı fit etmez", () => {
  const scale = getFactoryMapEffectiveScale({ baseScale: 0.68, mapZoom: 1 });
  const offset = getFactoryMapInitialOffset({
    cameraInsets: MOBILE_CAMERA_INSETS,
    canvasHeight: FACTORY_MAP_CANVAS_HEIGHT,
    canvasWidth: 3_160,
    scale,
    viewportHeight: IPHONE_17_PRO_MAX_VIEWPORT.height,
    viewportWidth: IPHONE_17_PRO_MAX_VIEWPORT.width,
  });
  const usableCenter = getFactoryMapUsableCenter({
    cameraInsets: MOBILE_CAMERA_INSETS,
    viewportHeight: IPHONE_17_PRO_MAX_VIEWPORT.height,
    viewportWidth: IPHONE_17_PRO_MAX_VIEWPORT.width,
  });

  assertClose(
    (usableCenter.x - offset.x) / scale,
    FACTORY_MAP_INITIAL_FOCUS_POINT.x,
  );
  assertClose(
    (usableCenter.y - offset.y) / scale,
    FACTORY_MAP_INITIAL_FOCUS_POINT.y,
  );
  assert.ok(3_160 * scale > 440 - 72 - 8);
  assert.ok(FACTORY_MAP_CANVAS_HEIGHT * scale > 714 - 72 - 72);
});

test("orientation veya breakpoint değişiminde kullanılabilir merkezdeki world anchor korunur", () => {
  const previousUsableCenter = { x: 252, y: 357 };
  const previousOffset = { x: -300, y: -100 };
  const previousScale = 0.68;
  const nextCameraInsets = { top: 80, right: 16, bottom: 80, left: 80 };
  const nextOffset = getFactoryMapReanchoredOffset({
    canvasHeight: FACTORY_MAP_CANVAS_HEIGHT,
    canvasWidth: 3_160,
    nextCameraInsets,
    nextScale: 0.76,
    nextViewportHeight: 820,
    nextViewportWidth: 1_180,
    previousOffset,
    previousScale,
    previousUsableCenter,
  });
  const nextUsableCenter = getFactoryMapUsableCenter({
    cameraInsets: nextCameraInsets,
    viewportHeight: 820,
    viewportWidth: 1_180,
  });

  assertClose(
    (nextUsableCenter.x - nextOffset.x) / 0.76,
    (previousUsableCenter.x - previousOffset.x) / previousScale,
  );
  assertClose(
    (nextUsableCenter.y - nextOffset.y) / 0.76,
    (previousUsableCenter.y - previousOffset.y) / previousScale,
  );
});

test("responsive bounds insetleri kullanır ve geçersiz girdide NaN üretmez", () => {
  assert.deepEqual(
    getFactoryMapBoundedOffset({
      cameraInsets: MOBILE_CAMERA_INSETS,
      canvasHeight: FACTORY_MAP_CANVAS_HEIGHT,
      canvasWidth: 2_400,
      proposedOffset: { x: 10_000, y: 10_000 },
      scale: 0.68,
      viewportHeight: 714,
      viewportWidth: 440,
    }),
    { x: 72, y: 72 },
  );
  const minimumOffset = getFactoryMapBoundedOffset({
    cameraInsets: MOBILE_CAMERA_INSETS,
    canvasHeight: FACTORY_MAP_CANVAS_HEIGHT,
    canvasWidth: 2_400,
    proposedOffset: { x: -10_000, y: -10_000 },
    scale: 0.68,
    viewportHeight: 714,
    viewportWidth: 440,
  });

  assertClose(minimumOffset.x, -1_200);
  assertClose(minimumOffset.y, -119.6);

  const safeOffset = getFactoryMapBoundedOffset({
    cameraInsets: {
      top: Number.NaN,
      right: Number.POSITIVE_INFINITY,
      bottom: -40,
      left: Number.NaN,
    },
    canvasHeight: Number.NaN,
    canvasWidth: Number.NaN,
    proposedOffset: { x: Number.NaN, y: Number.NEGATIVE_INFINITY },
    scale: Number.NaN,
    viewportHeight: Number.NaN,
    viewportWidth: Number.NaN,
  });

  assert.ok(Number.isFinite(safeOffset.x));
  assert.ok(Number.isFinite(safeOffset.y));
});

test("FactoryMap responsive base scale'i mapZoom'dan ayırır ve kamerayı yalnız bir kez initialize eder", () => {
  assert.match(factoryMapSource, /getFactoryMapBaseScale\(viewportClass\)/);
  assert.match(
    factoryMapSource,
    /getFactoryMapEffectiveScale\(\{[\s\S]*?baseScale: responsiveBaseScale,[\s\S]*?mapZoom/,
  );
  assert.match(factoryMapSource, /if \(!cameraInitializedRef\.current\)/);
  assert.match(factoryMapSource, /cameraInitializedRef\.current = true/);
  assert.match(factoryMapSource, /getFactoryMapInitialOffset\(\{/);
  assert.match(factoryMapSource, /getFactoryMapReanchoredOffset\(\{/);
  assert.doesNotMatch(factoryMapSource, /setMapZoom\(/);
  assert.doesNotMatch(factoryMapSource, /transition:\s*transform/);
});

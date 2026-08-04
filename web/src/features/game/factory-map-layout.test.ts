import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FACTORY_MAP_BASE_SCALE,
  FACTORY_MAP_CANVAS_HEIGHT,
  FACTORY_MAP_DEPARTMENT_AREA_HEIGHT,
  FACTORY_MAP_OFFICE_AREA_SCALE,
  FACTORY_MAP_OFFICE_AREA_WIDTH,
  FACTORY_MAP_OFFICE_CONNECTOR_GAP,
  FACTORY_MAP_OFFICE_TOP_PADDING,
  FACTORY_MAP_PRODUCTION_LAYOUT_HEIGHT,
  FACTORY_MAP_PRODUCTION_LAYOUT_TOP,
  FACTORY_MAP_SHIPMENT_AREA_HEIGHT,
  FACTORY_MAP_SHIPMENT_AREA_WIDTH,
  FACTORY_MAP_SHIPMENT_CONNECTOR_GAP,
  getFactoryMapBoundedOffset,
  getFactoryMapCanvasHeight,
  getFactoryMapCanvasWidth,
  getFactoryMapDisplaySectionWidth,
  getFactoryMapHorizontalPanBounds,
  getFactoryMapOfficeVerticalRise,
  getFactoryMapSectionWidth,
} from "./factory-map-layout";
import { OFFICE_MANAGEMENT_AREA_WIDTH } from "./office-management-scene";

test("Shipment scene canonical 360x330 ölçüsünü ve 416 px canvas artışını kullanır", () => {
  assert.equal(FACTORY_MAP_SHIPMENT_AREA_HEIGHT, 330);
  assert.equal(FACTORY_MAP_SHIPMENT_AREA_WIDTH, 360);
  assert.equal(
    FACTORY_MAP_SHIPMENT_CONNECTOR_GAP + FACTORY_MAP_SHIPMENT_AREA_WIDTH,
    416,
  );
});

test("Office Management çerçevesi Sevkiyat'tan yüzde 20 dar ve ayrı canvas payı kullanır", () => {
  const sectionWidths = [1_000, 1_200];
  const currentWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: true,
    sectionWidths,
  });
  const officeWidth = getFactoryMapCanvasWidth({
    includeOfficeArea: true,
    includeShipmentArea: true,
    sectionWidths,
  });

  assert.equal(
    officeWidth - currentWidth,
    FACTORY_MAP_OFFICE_AREA_WIDTH + FACTORY_MAP_OFFICE_CONNECTOR_GAP,
  );
  assert.equal(FACTORY_MAP_OFFICE_AREA_SCALE, 0.8);
  assert.equal(FACTORY_MAP_OFFICE_AREA_WIDTH, 288);
  assert.equal(FACTORY_MAP_SHIPMENT_AREA_WIDTH, 360);
  assert.equal(OFFICE_MANAGEMENT_AREA_WIDTH, FACTORY_MAP_OFFICE_AREA_WIDTH);
  assert.equal(officeWidth - currentWidth, 344);
});

test("Office bölüm çerçevesi production hattında taşmadan ortak merkezde kalır", () => {
  assert.equal(FACTORY_MAP_DEPARTMENT_AREA_HEIGHT, 638);
  assert.equal(
    getFactoryMapOfficeVerticalRise(FACTORY_MAP_DEPARTMENT_AREA_HEIGHT),
    0,
  );
  assert.equal(
    getFactoryMapCanvasHeight(FACTORY_MAP_DEPARTMENT_AREA_HEIGHT),
    FACTORY_MAP_CANVAS_HEIGHT,
  );
});

test("Office yüksekliği canvası yukarı büyütür ve üretim tabanını korur", () => {
  const officeHeight = 1_432;
  const expectedRise = Math.ceil(
    officeHeight +
      FACTORY_MAP_OFFICE_TOP_PADDING -
      (FACTORY_MAP_PRODUCTION_LAYOUT_TOP +
        FACTORY_MAP_PRODUCTION_LAYOUT_HEIGHT),
  );

  assert.equal(getFactoryMapOfficeVerticalRise(officeHeight), expectedRise);
  assert.equal(
    getFactoryMapCanvasHeight(officeHeight),
    FACTORY_MAP_CANVAS_HEIGHT + expectedRise,
  );
});

test("dinamik Office canvas yüksekliği dikey pan sınırına katılır", () => {
  const officeHeight = 1_432;
  const canvasHeight = getFactoryMapCanvasHeight(officeHeight);
  const boundedOffset = getFactoryMapBoundedOffset({
    canvasHeight,
    canvasWidth: 3_500,
    proposedOffset: { x: -10_000, y: -10_000 },
    scale: FACTORY_MAP_BASE_SCALE,
    viewportHeight: 900,
    viewportWidth: 1_440,
  });

  assert.equal(
    boundedOffset.y,
    900 - canvasHeight * FACTORY_MAP_BASE_SCALE,
  );
});

test("sıfır, bir ve üç item mevcut minimum section genişliğini korur", () => {
  assert.equal(getFactoryMapSectionWidth(0), 328);
  assert.equal(getFactoryMapSectionWidth(1), 328);
  assert.equal(getFactoryMapSectionWidth(3), 328);
});

test("dört ve altı item iki kolonluk section genişliği üretir", () => {
  assert.equal(getFactoryMapSectionWidth(4), 329);
  assert.equal(getFactoryMapSectionWidth(6), 329);
});

test("yedi item üçüncü kolonu ve buna uygun section genişliğini üretir", () => {
  assert.equal(getFactoryMapSectionWidth(7), 483);
});

test("dokuz ve altı mevcut genişliği, on ve üstü sabit accordion genişliğini kullanır", () => {
  assert.equal(
    getFactoryMapDisplaySectionWidth({
      isExpanded: false,
      itemCount: 10,
      productionLineCount: 9,
    }),
    637,
  );
  assert.equal(
    getFactoryMapDisplaySectionWidth({
      isExpanded: false,
      itemCount: 101,
      productionLineCount: 100,
    }),
    328,
  );
  assert.equal(
    getFactoryMapDisplaySectionWidth({
      isExpanded: true,
      itemCount: 101,
      productionLineCount: 100,
    }),
    483,
  );
});

test("negatif, ondalıklı ve geçersiz item sayıları güvenli normalize edilir", () => {
  assert.equal(getFactoryMapSectionWidth(-4), 328);
  assert.equal(getFactoryMapSectionWidth(6.9), 329);
  assert.equal(getFactoryMapSectionWidth(Number.NaN), 328);
  assert.equal(getFactoryMapSectionWidth(Number.POSITIVE_INFINITY), 328);
});

test("Shipment kapalı canvas hesabı önceki formülle aynı sonucu üretir", () => {
  const sectionWidths = [483, 329, 791, 328, 637];
  const previousCanvasWidth = Math.max(
    2_400,
    184 * 2 +
      sectionWidths.reduce((total, width) => total + width, 0) +
      (sectionWidths.length - 1) * 56,
  );

  assert.equal(
    getFactoryMapCanvasWidth({
      includeShipmentArea: false,
      sectionWidths,
    }),
    previousCanvasWidth,
  );
});

test("boş veya az section mevcut minimum canvas genişliğini korur", () => {
  assert.equal(
    getFactoryMapCanvasWidth({
      includeShipmentArea: false,
      sectionWidths: [],
    }),
    2_400,
  );
  assert.equal(
    getFactoryMapCanvasWidth({
      includeShipmentArea: false,
      sectionWidths: [328, 329],
    }),
    2_400,
  );
});

test("geniş içerik minimumu aşar ve connector yalnızca section aralarında eklenir", () => {
  assert.equal(
    getFactoryMapCanvasWidth({
      includeShipmentArea: false,
      sectionWidths: [1_000, 1_000, 1_000, 1_000],
    }),
    4_536,
  );
});

test("geçersiz section genişlikleri güvenli atlanır ve input mutate edilmez", () => {
  const sectionWidths = [
    1_000,
    -25,
    Number.NaN,
    1_200,
    Number.POSITIVE_INFINITY,
  ];
  const snapshot = [...sectionWidths];

  assert.equal(
    getFactoryMapCanvasWidth({
      includeShipmentArea: false,
      sectionWidths,
    }),
    2_624,
  );
  assert.deepEqual(sectionWidths, snapshot);
});

test("Shipment açık canvas yalnızca connector boşluğu ve alan genişliği kadar büyür", () => {
  const sectionWidths = [1_000, 1_200];
  const currentWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: false,
    sectionWidths,
  });
  const futureWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: true,
    sectionWidths,
  });

  assert.equal(
    futureWidth - currentWidth,
    FACTORY_MAP_SHIPMENT_CONNECTOR_GAP +
      FACTORY_MAP_SHIPMENT_AREA_WIDTH,
  );
  assert.equal(
    getFactoryMapCanvasWidth({
      includeShipmentArea: true,
      sectionWidths,
    }),
    futureWidth,
  );
});

test("section bulunmasa da gelecekteki Shipment alanı minimum canvas sonuna eklenebilir", () => {
  const futureWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: true,
    sectionWidths: [],
  });

  assert.equal(
    futureWidth,
    2_400 +
      FACTORY_MAP_SHIPMENT_CONNECTOR_GAP +
      FACTORY_MAP_SHIPMENT_AREA_WIDTH,
  );
});

test("canvas viewport'tan küçükken yatay pan ortalanmış tek sınıra sabitlenir", () => {
  assert.deepEqual(
    getFactoryMapHorizontalPanBounds({
      canvasWidth: 1_000,
      scale: 0.82,
      viewportWidth: 1_440,
    }),
    { max: 310, min: 310 },
  );
});

test("canvas viewport'tan büyükken sağ pan sınırı içeriğin sonuna erişir", () => {
  const expectedMinimum = 1_440 - 2_400 * 0.82;

  assert.deepEqual(
    getFactoryMapHorizontalPanBounds({
      canvasWidth: 2_400,
      scale: 0.82,
      viewportWidth: 1_440,
    }),
    { max: 0, min: expectedMinimum },
  );
});

test("zoom yatay pan sınırına mevcut ölçek formülüyle uygulanır", () => {
  assert.deepEqual(
    getFactoryMapHorizontalPanBounds({
      canvasWidth: 2_400,
      scale: 1.2,
      viewportWidth: 1_440,
    }),
    { max: 0, min: -1_440 },
  );
});

test("Shipment genişliği aktif edildiğinde sağ erişim sınırı aynı miktarda genişler", () => {
  const currentCanvasWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: false,
    sectionWidths: [1_000, 1_200],
  });
  const futureCanvasWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: true,
    sectionWidths: [1_000, 1_200],
  });
  const currentBounds = getFactoryMapHorizontalPanBounds({
    canvasWidth: currentCanvasWidth,
    scale: 1,
    viewportWidth: 1_440,
  });
  const futureBounds = getFactoryMapHorizontalPanBounds({
    canvasWidth: futureCanvasWidth,
    scale: 1,
    viewportWidth: 1_440,
  });

  assert.equal(
    currentBounds.min - futureBounds.min,
    FACTORY_MAP_SHIPMENT_CONNECTOR_GAP +
      FACTORY_MAP_SHIPMENT_AREA_WIDTH,
  );
});

test("iki eksenli clamp mevcut canvas yüksekliği ve scale davranışını korur", () => {
  assert.deepEqual(
    getFactoryMapBoundedOffset({
      canvasWidth: 2_400,
      proposedOffset: { x: -999, y: -100 },
      scale: 0.82,
      viewportHeight: 900,
      viewportWidth: 1_440,
    }),
    {
      x: 1_440 - 2_400 * 0.82,
      y: 900 - FACTORY_MAP_CANVAS_HEIGHT * 0.82,
    },
  );
});

test("tablet ve mobil viewport pan sınırları mevcut ölçekle içeriğin sonuna erişir", () => {
  const scale = 0.82;
  const scaledCanvasWidth = 2_400 * scale;
  const scaledCanvasHeight = FACTORY_MAP_CANVAS_HEIGHT * scale;

  assert.deepEqual(
    getFactoryMapBoundedOffset({
      canvasWidth: 2_400,
      proposedOffset: { x: -10_000, y: -10_000 },
      scale,
      viewportHeight: 768,
      viewportWidth: 1_024,
    }),
    {
      x: 1_024 - scaledCanvasWidth,
      y: 768 - scaledCanvasHeight,
    },
  );
  assert.deepEqual(
    getFactoryMapBoundedOffset({
      canvasWidth: 2_400,
      proposedOffset: { x: -10_000, y: -10_000 },
      scale,
      viewportHeight: 844,
      viewportWidth: 390,
    }),
    {
      x: 390 - scaledCanvasWidth,
      y: 844 - scaledCanvasHeight,
    },
  );
});

test("FactoryMap canonical layout hesabını Shipment açık kullanır", () => {
  const source = readFileSync(
    new URL("./components/factory-map.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /includeShipmentArea: true/);
  assert.match(source, /includeOfficeArea: true/);
  assert.match(source, /getFactoryMapDisplaySectionWidth\(\{/);
  assert.match(source, /productionLineCount: section\.productionLineCount/);
  assert.match(source, /getFactoryMapBoundedOffset\(\{/);
  assert.match(source, /FACTORY_MAP_SHIPMENT_AREA_HEIGHT/);
  assert.match(source, /FACTORY_MAP_SHIPMENT_AREA_WIDTH/);
  assert.match(source, /view=\{snapshot\.warehouse\.shipmentArea\}/);
  assert.doesNotMatch(source, /function getCanvasWidth/);
  assert.doesNotMatch(source, /function getDepartmentWidth/);
  assert.doesNotMatch(
    source,
    /shipmentArea\.tiles|shipment-pallet-(?:small|medium|large)|shipment-forklift/,
  );
});

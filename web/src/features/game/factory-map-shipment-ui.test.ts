import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { gameCopy } from "./game-copy";
import {
  FACTORY_MAP_BASE_SCALE,
  FACTORY_MAP_CANVAS_HEIGHT,
  FACTORY_MAP_SHIPMENT_AREA_HEIGHT,
  FACTORY_MAP_SHIPMENT_AREA_WIDTH,
  FACTORY_MAP_SHIPMENT_CONNECTOR_GAP,
  getFactoryMapBoundedOffset,
  getFactoryMapCanvasWidth,
} from "./factory-map-layout";

const factoryMapSource = readFileSync(
  new URL("./components/factory-map.tsx", import.meta.url),
  "utf8",
);
const shipmentMapAreaSource = readFileSync(
  new URL("../warehouse/components/shipment-map-area.tsx", import.meta.url),
  "utf8",
);
const visitorFactoryMapSource = readFileSync(
  new URL("../ranking/components/visitor-factory-map.tsx", import.meta.url),
  "utf8",
);

test("ShipmentMapArea production section döngüsünden sonra bağımsız render edilir", () => {
  const sectionLoopIndex = factoryMapSource.indexOf(
    "{snapshot.map.sections.map",
  );
  const shipmentStageIndex = factoryMapSource.indexOf(
    "data-factory-map-shipment-stage",
  );
  const shipmentRenderIndex = factoryMapSource.indexOf("<ShipmentMapArea");
  const shipmentStageSource = factoryMapSource.slice(
    shipmentStageIndex,
    shipmentRenderIndex,
  );

  assert.match(
    factoryMapSource,
    /import\s+\{\s*ShipmentMapArea\s*\}\s+from\s+"@\/features\/warehouse\/components\/shipment-map-area"/,
  );
  assert.ok(sectionLoopIndex >= 0);
  assert.ok(shipmentStageIndex > sectionLoopIndex);
  assert.ok(shipmentRenderIndex > shipmentStageIndex);
  assert.match(shipmentStageSource, /factory-stage-connector/);
  assert.match(
    factoryMapSource,
    /view=\{snapshot\.warehouse\.shipmentArea\}/,
  );
  assert.match(
    factoryMapSource,
    /title=\{copy\.shipmentArea\.title\}/,
  );
  assert.match(
    factoryMapSource,
    /emptyStateLabel=\{copy\.shipmentArea\.emptyStateLabel\}/,
  );
  assert.match(
    factoryMapSource,
    /levelLabel=\{copy\.shipmentArea\.levelLabel\}/,
  );
  assert.match(
    factoryMapSource,
    /summaryLabel=\{copy\.shipmentArea\.summaryLabel\}/,
  );
  assert.doesNotMatch(
    shipmentStageSource,
    /FactoryMapSectionView|FactoryMapItem|section\.items|investmentAction|productionLine/,
  );
});

test("Shipment canvası canonical 416 px artışı yalnızca bir kez uygular", () => {
  const sectionWidths = [1_000, 1_200];
  const currentCanvasWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: false,
    sectionWidths,
  });
  const shipmentCanvasWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: true,
    sectionWidths,
  });

  assert.equal(
    FACTORY_MAP_SHIPMENT_CONNECTOR_GAP + FACTORY_MAP_SHIPMENT_AREA_WIDTH,
    416,
  );
  assert.equal(shipmentCanvasWidth - currentCanvasWidth, 416);
  assert.equal(FACTORY_MAP_SHIPMENT_AREA_HEIGHT, 330);
  assert.equal(FACTORY_MAP_SHIPMENT_AREA_WIDTH, 360);
  assert.match(factoryMapSource, /includeShipmentArea: true/);
  assert.match(
    factoryMapSource,
    /height:\s*FACTORY_MAP_SHIPMENT_AREA_HEIGHT,[\s\S]*?width:\s*FACTORY_MAP_SHIPMENT_AREA_WIDTH/,
  );
  assert.doesNotMatch(factoryMapSource, /\b416\b/);
});

test("boş production section listesinde Shipment alanı ve minimum canvas korunur", () => {
  assert.equal(
    getFactoryMapCanvasWidth({
      includeShipmentArea: true,
      sectionWidths: [],
    }),
    2_816,
  );
  assert.match(
    factoryMapSource,
    /view=\{snapshot\.warehouse\.shipmentArea\}/,
  );
  assert.doesNotMatch(
    factoryMapSource,
    /snapshot\.warehouse\.shipmentArea\.(?:sceneLevel|readyQuantity|estimatedPalletCount)\s*[+\-*/]/,
  );
});

test("Shipment canvasının sağ kenarı dört hedef viewport'ta pan sınırı içinde kalır", () => {
  const canvasWidth = getFactoryMapCanvasWidth({
    includeShipmentArea: true,
    sectionWidths: [1_000, 1_200],
  });
  const viewports = [
    { height: 900, width: 1_440 },
    { height: 768, width: 1_024 },
    { height: 1_024, width: 768 },
    { height: 844, width: 390 },
  ];

  for (const viewport of viewports) {
    const boundedOffset = getFactoryMapBoundedOffset({
      canvasWidth,
      proposedOffset: { x: -10_000, y: -10_000 },
      scale: FACTORY_MAP_BASE_SCALE,
      viewportHeight: viewport.height,
      viewportWidth: viewport.width,
    });
    const scaledCanvasHeight =
      FACTORY_MAP_CANVAS_HEIGHT * FACTORY_MAP_BASE_SCALE;
    const expectedVerticalOffset =
      scaledCanvasHeight <= viewport.height
        ? Math.round((viewport.height - scaledCanvasHeight) / 2)
        : viewport.height - scaledCanvasHeight;

    assert.equal(
      boundedOffset.x,
      viewport.width - canvasWidth * FACTORY_MAP_BASE_SCALE,
    );
    assert.equal(boundedOffset.y, expectedVerticalOffset);
  }
});

test("Shipment root aktivasyonu canonical Warehouse panelini açar", () => {
  const handlerStart = factoryMapSource.indexOf(
    "const handleShipmentActivate",
  );
  const handlerEnd = factoryMapSource.indexOf("\n  };", handlerStart);
  const handlerSource = factoryMapSource.slice(handlerStart, handlerEnd);

  assert.ok(handlerStart >= 0);
  assert.ok(handlerEnd > handlerStart);
  assert.match(handlerSource, /suppressClickRef\.current/);
  assert.match(handlerSource, /openPanel\("warehouse"\)/);
  assert.ok(
    handlerSource.indexOf("suppressClickRef.current") <
      handlerSource.indexOf('openPanel("warehouse")'),
  );
  assert.match(
    factoryMapSource,
    /onActivate=\{handleShipmentActivate\}/,
  );
  assert.doesNotMatch(shipmentMapAreaSource, /useGameUiStore|openPanel/);
});

test("mevcut drag suppression ref'i korunur ve keyboard native button üzerinden çalışır", () => {
  assert.equal(
    factoryMapSource.match(/const suppressClickRef = useRef\(false\)/g)
      ?.length,
    1,
  );
  assert.match(
    factoryMapSource,
    /dragState\.current\.moved = true;[\s\S]*?suppressClickRef\.current = true;/,
  );
  assert.match(
    factoryMapSource,
    /releaseMapDrag[\s\S]*?suppressClickRef\.current = false;/,
  );
  assert.doesNotMatch(
    factoryMapSource,
    /shipmentDrag|shipmentSuppress|addEventListener\("(?:click|pointer)/,
  );
  assert.match(shipmentMapAreaSource, /<button[\s\S]*?onClick=\{onActivate\}/);
  assert.doesNotMatch(shipmentMapAreaSource, /onKeyDown|tabIndex=/);
});

test("TR ve EN Shipment scene copy sözleşmesi eksiksizdir", () => {
  const trCopy = gameCopy.tr.map.shipmentArea;
  const enCopy = gameCopy.en.map.shipmentArea;

  assert.equal(trCopy.ariaLabel, "Sevkiyat hazır ürün alanı");
  assert.equal(trCopy.title, "Sevkiyat Deposu");
  assert.equal(trCopy.emptyStateLabel, "Sevkiyata hazır ürün bulunmuyor.");
  assert.equal(trCopy.levelLabel(7), "Seviye 7");
  assert.equal(trCopy.summaryLabel(4_280, 6), "4.280 adet · 6 palet");
  assert.equal(trCopy.summaryLabel(0, 0), "0 adet · 0 palet");
  assert.deepEqual(trCopy.statusLabels, {
    completed: "Tamamlanan sevkiyat",
    delayed: "Geciken sevkiyat",
    inProgress: "Hazırlanmakta olan sevkiyat",
  });

  assert.equal(enCopy.ariaLabel, "Shipment ready area");
  assert.equal(enCopy.title, "Shipment Warehouse");
  assert.equal(enCopy.emptyStateLabel, "No products are ready for shipment.");
  assert.equal(enCopy.levelLabel(7), "Level 7");
  assert.equal(enCopy.summaryLabel(4_280, 6), "4,280 pcs · 6 pallets");
  assert.equal(enCopy.summaryLabel(750, 1), "750 pcs · 1 pallet");
  assert.deepEqual(enCopy.statusLabels, {
    completed: "Completed shipment",
    delayed: "Delayed shipment",
    inProgress: "Shipment in progress",
  });
});

test("Shipment production domainine ve visitor Factory Map'e eklenmez", () => {
  const shipmentStageIndex = factoryMapSource.indexOf(
    "data-factory-map-shipment-stage",
  );
  const shipmentRenderIndex = factoryMapSource.indexOf(
    "<ShipmentMapArea",
    shipmentStageIndex,
  );
  const shipmentRenderEnd =
    factoryMapSource.indexOf("/>", shipmentRenderIndex) + 2;
  const shipmentStageSource = factoryMapSource.slice(
    shipmentStageIndex,
    shipmentRenderEnd,
  );

  assert.ok(shipmentRenderEnd > shipmentRenderIndex);
  assert.doesNotMatch(
    shipmentStageSource,
    /FactoryMapSectionView|FactoryMapItem|lineCount|workload|investment/,
  );
  assert.doesNotMatch(
    factoryMapSource,
    /snapshot\.map\.sections\.(?:push|unshift|splice)/,
  );
  assert.doesNotMatch(visitorFactoryMapSource, /ShipmentMapArea|shipmentArea/);
  assert.doesNotMatch(
    shipmentMapAreaSource,
    /productionOrderId|customerOrderItemId|orderNo|productName|role="tooltip"/,
  );
});

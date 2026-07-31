import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test, { before } from "node:test";

import {
  Children,
  createElement,
  isValidElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ShipmentMapView } from "../types";

const testRequire = createRequire(import.meta.url);

testRequire.extensions[".css"] = (module) => {
  const classNames = new Proxy(
    {},
    {
      get: (_target, property) => String(property),
    },
  );
  module.exports = {
    __esModule: true,
    default: classNames,
  };
};

let ShipmentMapArea: typeof import("./shipment-map-area")["ShipmentMapArea"];

before(async () => {
  ({ ShipmentMapArea } = await import("./shipment-map-area"));
});

const statusLabels = {
  completed: "Completed shipment",
  delayed: "Delayed shipment",
  inProgress: "Shipment in progress",
};

function createView(
  overrides: Partial<ShipmentMapView> = {},
): ShipmentMapView {
  return {
    estimatedPalletCount: 2,
    readyProductCount: 1,
    readyQuantity: 1_200,
    sceneLevel: 1,
    status: "IN_PROGRESS",
    ...overrides,
  };
}

function render(view: ShipmentMapView, onActivate?: () => void) {
  return renderToStaticMarkup(
    createElement(ShipmentMapArea, {
      ariaLabel: "Shipment area",
      emptyStateLabel: "No products are ready for shipment.",
      levelLabel: (level) => `Level ${level}`,
      onActivate,
      statusLabels,
      summaryLabel: (readyQuantity, palletCount) =>
        `${readyQuantity.toLocaleString("en-US")} pcs · ${palletCount} ${
          palletCount === 1 ? "pallet" : "pallets"
        }`,
      title: "Shipment Warehouse",
      view,
    }),
  );
}

function getVisibleText(markup: string) {
  return markup.replace(/<[^>]*>/g, "").trim();
}

test("sıfır stok paneli, empty state ve sıfır özetini korur", () => {
  const markup = render(
    createView({
      estimatedPalletCount: 0,
      readyProductCount: 0,
      readyQuantity: 0,
      sceneLevel: null,
      status: null,
    }),
  );

  assert.match(markup, /data-shipment-map-area=/);
  assert.match(markup, /data-shipment-scene=/);
  assert.doesNotMatch(markup, /<img/);
  assert.doesNotMatch(markup, />Level \d</);
  assert.match(markup, /No products are ready for shipment\./);
  assert.match(markup, /0 pcs · 0 pallets/);
});

test("level 1 doğru asset, scale ve gerçek header level'ı ile render edilir", () => {
  const markup = render(createView());

  assert.equal(markup.match(/<img/g)?.length, 1);
  assert.match(
    markup,
    /src="\/_next\/image\?url=%2Fshipment-area%2Fshipment-level-1\.webp/,
  );
  assert.match(markup, /data-shipment-scene-asset-level="1"/);
  assert.match(markup, /--shipment-scene-scale:1\.12/);
  assert.match(markup, /sizes="\(max-width: 1100px\) 280px, 328px"/);
  assert.match(markup, /width="1536"/);
  assert.match(markup, /height="1024"/);
  assert.match(markup, /alt="" aria-hidden="true"/);
  assert.match(markup, />Level 1</);
  assert.match(markup, /1,200 pcs · 2 pallets/);
});

test("level 2 ve 3 kendi asset ve geçici scale config'lerini kullanır", () => {
  const level2Markup = render(
    createView({ readyQuantity: 7_000, sceneLevel: 2 }),
  );
  const level3Markup = render(
    createView({ readyQuantity: 12_000, sceneLevel: 3 }),
  );

  assert.match(level2Markup, /shipment-level-2\.webp/);
  assert.match(level2Markup, /--shipment-scene-scale:1\.04/);
  assert.match(level3Markup, /shipment-level-3\.webp/);
  assert.match(level3Markup, /--shipment-scene-scale:0\.96/);
});

test("gerçek level 7 header ve level 7 asset ile render edilir", () => {
  const markup = render(
    createView({
      estimatedPalletCount: 61,
      readyQuantity: 45_001,
      sceneLevel: 7,
    }),
  );

  assert.match(markup, />Level 7</);
  assert.match(markup, /data-shipment-scene-asset-level="7"/);
  assert.match(markup, /shipment-level-7\.webp/);
});

test("aggregate statü tek ikon ve locale uyumlu erişilebilir isim taşır", () => {
  const delayedMarkup = render(createView({ status: "DELAYED" }));
  const completedMarkup = render(createView({ status: "COMPLETED" }));
  const progressMarkup = render(createView({ status: "IN_PROGRESS" }));

  assert.match(delayedMarkup, /aria-label="Delayed shipment"/);
  assert.match(delayedMarkup, /lucide-triangle-alert/);
  assert.match(completedMarkup, /aria-label="Completed shipment"/);
  assert.match(completedMarkup, /lucide-check/);
  assert.match(progressMarkup, /aria-label="Shipment in progress"/);
  assert.match(progressMarkup, /lucide-hourglass/);
  assert.equal(delayedMarkup.match(/class="badge /g)?.length, 1);
});

test("başlık ve özet dışında order veya product detay metni üretilmez", () => {
  const markup = render(createView());
  const visibleText = getVisibleText(markup);

  assert.match(visibleText, /Shipment Warehouse/);
  assert.match(visibleText, /Level 1/);
  assert.match(visibleText, /1,200 pcs · 2 pallets/);
  assert.doesNotMatch(
    markup,
    /customerOrderItemId|productionOrderId|orderNo|productName|role="tooltip"|title=/,
  );
});

test("onActivate tek tam-alan native button üzerinden çağrılır", () => {
  let activationCount = 0;
  const element = ShipmentMapArea({
    ariaLabel: "Shipment area",
    emptyStateLabel: "No products are ready for shipment.",
    levelLabel: (level) => `Level ${level}`,
    onActivate: () => {
      activationCount += 1;
    },
    statusLabels,
    summaryLabel: (readyQuantity, palletCount) =>
      `${readyQuantity} pcs · ${palletCount} pallets`,
    title: "Shipment Warehouse",
    view: createView(),
  });

  assert.ok(isValidElement<{ children?: ReactNode }>(element));
  const activationElement = Children.toArray(element.props.children).find(
    (child) => isValidElement(child) && child.type === "button",
  );
  assert.ok(
    isValidElement<{
      onClick?: () => void;
      type?: string;
    }>(activationElement),
  );

  activationElement.props.onClick?.();

  assert.equal(activationCount, 1);
  assert.equal(activationElement.props.type, "button");
});

test("pasif panel button üretmez ve input view mutate edilmez", () => {
  const view = createView();
  const snapshot = structuredClone(view);
  Object.freeze(view);

  const passiveMarkup = render(view);
  const interactiveMarkup = render(view, () => {});

  assert.doesNotMatch(passiveMarkup, /<button/);
  assert.equal(interactiveMarkup.match(/<button/g)?.length, 1);
  assert.deepEqual(view, snapshot);
});

test("asset registry yedi level'ı içerir ve clamp yalnızca component UI katmanındadır", () => {
  const componentSource = readFileSync(
    new URL("./shipment-map-area.tsx", import.meta.url),
    "utf8",
  );
  const configSource = readFileSync(
    new URL("../shipment-scene-config.ts", import.meta.url),
    "utf8",
  );
  const projectionSource = readFileSync(
    new URL("../services/shipment-area-view.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    componentSource,
    /Math\.min\(\s*sceneLevel,\s*SHIPMENT_MAXIMUM_AVAILABLE_ASSET_LEVEL/,
  );
  assert.match(configSource, /shipment-level-1\.webp/);
  assert.match(configSource, /shipment-level-2\.webp/);
  assert.match(configSource, /shipment-level-3\.webp/);
  assert.match(configSource, /shipment-level-4\.webp/);
  assert.match(configSource, /shipment-level-5\.webp/);
  assert.match(configSource, /shipment-level-6\.webp/);
  assert.match(configSource, /shipment-level-7\.webp/);
  assert.match(
    configSource,
    /SHIPMENT_MAXIMUM_AVAILABLE_ASSET_LEVEL\s*=\s*7/,
  );
  assert.match(configSource, /scale:\s*1\.12/);
  assert.match(configSource, /scale:\s*1\.04/);
  assert.match(configSource, /scale:\s*0\.96/);
  assert.doesNotMatch(projectionSource, /MAXIMUM_AVAILABLE|ASSET_BY_LEVEL/);
  assert.doesNotMatch(componentSource, /shipment-pallet-|maximumVisibleTiles/);
});

test("CSS sabit 360x330 panel, 3:2 scene ve transparan zemin sözleşmesini taşır", () => {
  const styles = readFileSync(
    new URL("./shipment-map-area.module.css", import.meta.url),
    "utf8",
  );

  assert.match(styles, /\.root[\s\S]*?height:\s*330px/);
  assert.match(styles, /\.root[\s\S]*?min-width:\s*280px/);
  assert.match(styles, /\.root[\s\S]*?background:\s*transparent/);
  assert.match(styles, /\.scene[\s\S]*?max-width:\s*328px/);
  assert.match(styles, /\.scene[\s\S]*?aspect-ratio:\s*3\s*\/\s*2/);
  assert.match(styles, /\.sceneImage[\s\S]*?width:\s*100%/);
  assert.match(styles, /\.sceneImage[\s\S]*?height:\s*auto/);
  assert.match(styles, /\.sceneImage[\s\S]*?aspect-ratio:\s*3\s*\/\s*2/);
  assert.match(styles, /\.sceneImage[\s\S]*?object-fit:\s*contain/);
  assert.match(styles, /\.footer[\s\S]*?width:\s*fit-content/);
  assert.match(
    styles,
    /\.footer[\s\S]*?background:\s*rgba\(35,\s*36,\s*41,\s*0\.58\)/,
  );
  assert.match(styles, /\.footer[\s\S]*?border-radius:\s*999px/);
  assert.match(
    styles,
    /\.sceneImage[\s\S]*?transform:\s*scale\(var\(--shipment-scene-scale\)\)/,
  );
  assert.match(styles, /\.activationButton:focus-visible/);
  assert.doesNotMatch(styles, /grid-template-columns:\s*repeat\(2/);
});

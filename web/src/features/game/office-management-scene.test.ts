import assert from "node:assert/strict";
import test from "node:test";

import {
  OFFICE_MANAGEMENT_AREA_WIDTH,
  OFFICE_MANAGEMENT_SCENE_HORIZONTAL_INSET,
  OFFICE_MANAGEMENT_SCENE_WIDTH,
  getOfficeManagementSceneAsset,
  getOfficeManagementSceneHeight,
  getOfficeManagementSceneScale,
} from "./office-management-scene";
import { FACTORY_MAP_SHIPMENT_AREA_WIDTH } from "./factory-map-layout";

const expectedAssetByStage = {
  micro_workshop: "/office-area/micro-atolye-faz1.webp",
  small_workshop: "/office-area/kucukatolye-faz2.webp",
  stable_workshop: "/office-area/dengeli-atolye-faz3.webp",
  growing_factory: "/office-area/buyuyen-fabrika-faz4.webp",
  mass_factory: "/office-area/seri-uretim-fabrikasi-faz5.webp",
  large_factory: "/office-area/seri-uretim-fabrikasi-faz5.webp",
  enterprise_factory: "/office-area/seri-uretim-fabrikasi-faz5.webp",
};

test("yedi operating stage doğru Office Management görseline bağlanır", () => {
  for (const [stageKey, expectedSrc] of Object.entries(expectedAssetByStage)) {
    assert.equal(getOfficeManagementSceneAsset(stageKey).src, expectedSrc);
  }
});

test("altıncı ve yedinci kademeler beşinci kademe görselini yeniden kullanır", () => {
  const phaseFiveSrc = getOfficeManagementSceneAsset("mass_factory").src;

  assert.equal(
    getOfficeManagementSceneAsset("large_factory").src,
    phaseFiveSrc,
  );
  assert.equal(
    getOfficeManagementSceneAsset("enterprise_factory").src,
    phaseFiveSrc,
  );
});

test("bilinmeyen stage güvenli biçimde beşinci görsele düşer", () => {
  assert.equal(
    getOfficeManagementSceneAsset("future_factory").src,
    "/office-area/seri-uretim-fabrikasi-faz5.webp",
  );
});

test("Office görseli çerçevesiyle birlikte Sevkiyat Deposu'ndan yüzde 20 daralır", () => {
  const assets = Object.keys(expectedAssetByStage).map((stageKey) =>
    getOfficeManagementSceneAsset(stageKey),
  );

  assert.equal(OFFICE_MANAGEMENT_AREA_WIDTH, 288);
  assert.equal(FACTORY_MAP_SHIPMENT_AREA_WIDTH, 360);
  assert.equal(OFFICE_MANAGEMENT_SCENE_HORIZONTAL_INSET, 14);
  assert.equal(OFFICE_MANAGEMENT_SCENE_WIDTH, 260);
  assert.equal(
    getOfficeManagementSceneScale(assets[0]!),
    OFFICE_MANAGEMENT_SCENE_WIDTH / 1_024,
  );
  assert.ok(
    new Set(assets.map(getOfficeManagementSceneHeight)).size > 1,
    "şeffaf alt payı kırpılan sahneler farklı görünür yükseklikler üretmeli",
  );
});

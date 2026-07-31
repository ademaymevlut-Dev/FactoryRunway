import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { gameCopy } from "./game-copy";

const factoryMapSource = readFileSync(
  new URL("./components/factory-map.tsx", import.meta.url),
  "utf8",
);
const officeAreaSource = readFileSync(
  new URL("./components/office-management-map-area.tsx", import.meta.url),
  "utf8",
);
const officeAreaStyles = readFileSync(
  new URL(
    "./components/office-management-map-area.module.css",
    import.meta.url,
  ),
  "utf8",
);
const snapshotSource = readFileSync(
  new URL("./services/game-snapshot.ts", import.meta.url),
  "utf8",
);
const storeSource = readFileSync(
  new URL("./store/game-ui-store.tsx", import.meta.url),
  "utf8",
);
const leftDockSource = readFileSync(
  new URL("./components/left-dock-menu.tsx", import.meta.url),
  "utf8",
);

test("Office Management bağımsız sahnesi production bölümlerinin solunda render edilir", () => {
  const officeIndex = factoryMapSource.indexOf(
    "data-factory-map-office-stage",
  );
  const sectionLoopIndex = factoryMapSource.indexOf(
    "{snapshot.map.sections.map",
  );
  const shipmentIndex = factoryMapSource.indexOf(
    "data-factory-map-shipment-stage",
  );

  assert.ok(officeIndex >= 0);
  assert.ok(sectionLoopIndex > officeIndex);
  assert.ok(shipmentIndex > sectionLoopIndex);
  assert.match(factoryMapSource, /<OfficeManagementMapArea/);
  assert.match(factoryMapSource, /includeOfficeArea: true/);
  assert.doesNotMatch(
    officeAreaSource,
    /FactoryMapSection|FactoryMapItem|productionLine|investmentAction/,
  );
});

test("Office production bölümleriyle aynı merkezde çerçeveli alan kullanır", () => {
  assert.match(
    factoryMapSource,
    /className="factory-production-stage"\s+data-factory-map-office-stage/,
  );
  assert.match(
    factoryMapSource,
    /const officeAreaHeight = FACTORY_MAP_DEPARTMENT_AREA_HEIGHT/,
  );
  assert.doesNotMatch(factoryMapSource, /alignSelf:\s*"flex-end"/);
  assert.match(officeAreaSource, /className=\{styles\.scene\}/);
  assert.match(officeAreaStyles, /grid-template-rows:\s*48px/);
  assert.match(
    officeAreaStyles,
    /border:\s*2px solid rgba\(209, 149, 37, 0\.58\)/,
  );
  assert.match(officeAreaStyles, /position:\s*absolute/);
  assert.match(officeAreaStyles, /bottom:\s*14px/);
  assert.match(officeAreaStyles, /transform:\s*translateX\(-50%\)/);
});

test("Office sahnesi snapshot operating stage key ve adını kullanır", () => {
  assert.match(snapshotSource, /operatingStageKey:/);
  assert.match(
    factoryMapSource,
    /getOfficeManagementSceneAsset\(snapshot\.factory\.operatingStageKey\)/,
  );
  assert.match(
    factoryMapSource,
    /copy\.officeArea\.ariaLabel\(\s*snapshot\.factory\.operatingStageName/,
  );
});

test("Office ve sol dock aynı canonical primary panel aksiyonunu kullanır", () => {
  assert.match(storeSource, /activatePrimaryPanel:/);
  assert.match(factoryMapSource, /activatePrimaryPanel\("finance"\)/);
  assert.match(
    leftDockSource,
    /onClick=\{\(\) => activatePrimaryPanel\(item\.key\)\}/,
  );
  assert.match(
    storeSource,
    /if \(activePanel\?\.key === key\)[\s\S]*?setActivePanel\(null\)/,
  );
});

test("Office aktivasyonu drag suppression ve native button erişilebilirliğini korur", () => {
  const handlerStart = factoryMapSource.indexOf(
    "const handleOfficeActivate",
  );
  const handlerEnd = factoryMapSource.indexOf("\n  };", handlerStart);
  const handlerSource = factoryMapSource.slice(handlerStart, handlerEnd);

  assert.match(handlerSource, /suppressClickRef\.current/);
  assert.match(handlerSource, /activatePrimaryPanel\("finance"\)/);
  assert.match(officeAreaSource, /<button/);
  assert.match(officeAreaSource, /onClick=\{onActivate\}/);
  assert.match(officeAreaSource, /type="button"/);
  assert.doesNotMatch(officeAreaSource, /onKeyDown|tabIndex=/);
});

test("TR ve EN Office başlığı kısa ve tekildir", () => {
  assert.equal(gameCopy.tr.map.officeArea.title, "Office");
  assert.equal(
    gameCopy.tr.map.officeArea.ariaLabel("Dengeli Atölye"),
    "Dengeli Atölye ofis ve yönetim alanı. Finansı aç.",
  );
  assert.equal(gameCopy.en.map.officeArea.title, "Office");
  assert.equal(
    gameCopy.en.map.officeArea.ariaLabel("Stable Workshop"),
    "Stable Workshop office and management area. Open finance.",
  );
});

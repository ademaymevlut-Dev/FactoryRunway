import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const factoryMap = readSource("./components/factory-map.tsx");
const factoryMapStyles = readSource("../../app/globals.css");
const snapshotService = readSource("./services/game-snapshot.ts");

test("accordion eşiği investment item sayısından değil gerçek production line sayısından gelir", () => {
  assert.match(
    factoryMap,
    /isFactoryMapSectionCollapsible\(\s*section\.productionLineCount/,
  );
  assert.match(
    factoryMap,
    /productionLineCount: section\.productionLineCount/,
  );
  assert.doesNotMatch(
    factoryMap,
    /isFactoryMapSectionCollapsible\(\s*section\.items\.length/,
  );
});

test("yoğun bölüm yalnız production line kartlarını dokuzlu sayfalar ve yatırımı header dışında korur", () => {
  assert.match(factoryMap, /const productionLineItems = section\.items\.filter/);
  assert.match(
    factoryMap,
    /getFactoryMapSectionPageItems\(\s*productionLineItems/,
  );
  assert.match(factoryMap, /const investmentAction = section\.items\.find/);
  assert.match(factoryMap, /factory-section-summary-invest/);
  assert.match(factoryMap, /factory-section-expanded-action/);
});

test("kapalı bölüm Smart template görselini önceliklendirir ve mevcut line görseline düşer", () => {
  assert.match(factoryMap, /"SMART",\s*"PRECISION",\s*"INDUSTRIAL",\s*"WORKSHOP"/);
  assert.match(
    factoryMap,
    /template\?\.detailImageUrl \?\? template\?\.imageUrl/,
  );
  assert.match(
    factoryMap,
    /line\?\.detailImageUrl \?\? line\?\.imageUrl \?\? null/,
  );
});

test("accordion UI kapak, pager ve expanded stillerini taşır", () => {
  assert.match(factoryMapStyles, /\.factory-department-block-summary/);
  assert.match(factoryMapStyles, /\.factory-section-summary-main/);
  assert.match(factoryMapStyles, /\.factory-section-expanded-header/);
  assert.match(factoryMapStyles, /\.factory-section-pager/);
});

test("accordion değişikliği snapshot ve hesaplama servislerine taşınmaz", () => {
  assert.doesNotMatch(snapshotService, /SectionDisclosure|sectionDisclosure/);
  assert.doesNotMatch(snapshotService, /SECTION_LINE_LIMIT|SECTION_PAGE_SIZE/);
});

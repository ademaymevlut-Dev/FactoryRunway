import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("gameplay guide büyük statik içeriği locale copy dosyasından okur", () => {
  const component = readSource("./gameplay-guide.tsx");
  const copy = readSource("./gameplay-guide-copy.ts");
  const page = readSource("../../../app/(default-tr)/help/gameplay/page.tsx");

  assert.match(component, /gameplayGuideCopy\[snapshot\.locale\]/);
  assert.match(component, /copy\.normalFlowSteps/);
  assert.match(component, /copy\.outsourceFlowSteps/);
  assert.match(component, /copy\.checklist\.items\.map/);
  assert.match(page, /locale,/);
  assert.match(copy, /playerChip: "Oyun Rehberi"/);
  assert.match(copy, /playerChip: "Gameplay Guide"/);
  assert.match(copy, /route: "Kesim → Dikim → Ütü · Paket"/);
  assert.match(copy, /route: "Cutting → Sewing → Iron · Pack"/);
  assert.doesNotMatch(
    component,
    /Oyun Rehberi|Fabrikaya dön|ÇIKTI|DEPARTMAN|Dikim beklemede/,
  );
});

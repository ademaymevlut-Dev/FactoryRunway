import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("kart tasarımı primary renk ile Light Rays önizlemesini canlı günceller", () => {
  const designer = read("./product-card-designer.tsx");
  const background = read(
    "../../../../../components/game-presentation/product-light-rays-background.tsx",
  );

  assert.match(designer, /import \{ ProductLightRaysBackground \}/);
  assert.match(
    designer,
    /<ProductLightRaysBackground\s+color=\{colors\.cardPrimaryColor\}/,
  );
  assert.match(designer, /setColor\(key as keyof typeof colors/);
  assert.match(designer, /type="color"/);
  assert.doesNotMatch(designer, /<ArtCard/);
  assert.doesNotMatch(designer, /product\.name\.charAt\(0\)/);
  assert.match(background, /raysColor=\{raysColor\}/);
  assert.match(background, /raysSpeed=\{0\.78\}/);
});

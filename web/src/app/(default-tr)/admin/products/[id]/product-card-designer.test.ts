import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("kart tasarımı ortak hero surface ve presentation draft ile canlı güncellenir", () => {
  const designer = read("./product-card-designer.tsx");
  const page = read("./page.tsx");
  const upload = read("../product-upload-form.tsx");
  const draft = read("./product-presentation-draft-context.tsx");
  const surface = read(
    "../../../../../components/game-presentation/product-hero-surface.tsx",
  );

  assert.match(designer, /import \{ ProductHeroSurface \}/);
  assert.match(designer, /<ProductHeroSurface/);
  assert.match(designer, /context="admin"/);
  assert.match(designer, /paletteSource=\{colors\}/);
  assert.match(designer, /productTypeKey=\{product\.productTypeKey\}/);
  assert.match(designer, /setColor\(key as keyof typeof colors/);
  assert.match(designer, /type="color"/);
  assert.match(designer, /Ana blob rengi/);
  assert.match(designer, /İkincil blob \+ Light Rays/);
  assert.match(designer, /Alt destek glow rengi/);
  assert.doesNotMatch(designer, /<ArtCard/);
  assert.match(surface, /resolveProductPresentationConfig/);
  assert.match(surface, /resolveProductHeroPalette/);
  assert.match(page, /image\.variant === "DETAIL"/);
  assert.match(page, /ProductPresentationDraftProvider/);
  assert.match(upload, /URL|setLocalImagePreview/);
  assert.match(upload, /state\.status !== "success"/);
  assert.match(draft, /URL\.createObjectURL/);
  assert.match(draft, /URL\.revokeObjectURL/);
  assert.match(draft, /\(\) => \(\) =>/);
});

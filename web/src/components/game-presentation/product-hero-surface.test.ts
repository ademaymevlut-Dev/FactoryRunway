import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("order ve admin aynı hero surface ve palette resolver sınırını kullanır", () => {
  const orderHero = read(
    "../../features/orders/components/order-product-hero-canvas.tsx",
  );
  const adminHero = read(
    "../../app/(default-tr)/admin/products/[id]/product-card-designer.tsx",
  );
  const surface = read("./product-hero-surface.tsx");

  assert.match(orderHero, /<ProductHeroSurface/);
  assert.match(orderHero, /context="order"/);
  assert.match(adminHero, /<ProductHeroSurface/);
  assert.match(adminHero, /context="admin"/);
  assert.match(surface, /resolveProductHeroPalette/);
  assert.match(surface, /resolveProductPresentationConfig/);
  assert.equal(surface.match(/<Image/g)?.length, 1);
});

test("CSS atmosphere WebGL durumundan bağımsız ve reduced motion altında statiktir", () => {
  const atmosphere = read("./product-hero-atmosphere.tsx");
  const background = read("./product-light-rays-background.tsx");
  const lightRays = read("../effects/light-rays.tsx");
  const surface = read("./product-hero-surface.tsx");
  const globals = read("../../app/globals.css");

  assert.match(atmosphere, /product-hero-ambient-drift/);
  assert.match(atmosphere, /ProductLightRaysBackground/);
  assert.match(atmosphere, /data-hero-layer="soft-blobs"/);
  assert.equal(atmosphere.match(/data-product-hero-blob=/g)?.length, 2);
  assert.doesNotMatch(atmosphere, /monogram|text-white\/\d+/i);
  assert.doesNotMatch(surface, /monogram=/i);
  assert.ok(
    atmosphere.indexOf("<ProductHeroSoftBlobs palette={palette}") <
      atmosphere.indexOf("<ProductLightRaysBackground"),
  );
  assert.match(background, /showFallback=\{false\}/);
  assert.match(background, /data-product-top-light="true"/);
  assert.match(lightRays, /"initializing"[\s\S]*?"webgl"[\s\S]*?"fallback"[\s\S]*?"reduced-motion"/);
  assert.match(lightRays, /webglcontextlost/);
  assert.match(lightRays, /updateRenderMode\("fallback"\)/);
  assert.match(globals, /product-hero-ambient-drift 21s ease-in-out infinite alternate/);
  assert.match(globals, /product-hero-soft-blob-primary[\s\S]*?width: 44%/);
  assert.match(globals, /product-hero-soft-blob-secondary[\s\S]*?width: 28%/);
  assert.match(
    globals,
    /prefers-reduced-motion: reduce[\s\S]*?product-hero-ambient-drift[\s\S]*?animation: none/,
  );
});

test("palette inspector'a taşınmaz ve sipariş renkleri yalnızca rail'de kalır", () => {
  const workspace = read(
    "../../features/orders/components/order-decision-workspace.tsx",
  );
  const orderHero = read(
    "../../features/orders/components/order-product-hero-canvas.tsx",
  );

  assert.doesNotMatch(workspace, /ProductHeroPalette|resolveProductHeroPalette/);
  assert.match(orderHero, /activeItem\.colors\.map/);
  assert.doesNotMatch(orderHero, /paletteSource=\{activeItem\.colors\}/);
});

test("admin local görsel preview object URL yaşam döngüsünü temizler", () => {
  const context = read(
    "../../app/(default-tr)/admin/products/[id]/product-presentation-draft-context.tsx",
  );
  const upload = read(
    "../../app/(default-tr)/admin/products/product-upload-form.tsx",
  );

  assert.match(context, /URL\.createObjectURL\(file\)/);
  assert.ok((context.match(/URL\.revokeObjectURL/g)?.length ?? 0) >= 2);
  assert.match(context, /useEffect\([\s\S]*?objectUrlRef\.current/);
  assert.match(upload, /setLocalImagePreview/);
  assert.match(upload, /clearLocalImagePreview/);
  assert.match(upload, /state\.status !== "success"/);
});

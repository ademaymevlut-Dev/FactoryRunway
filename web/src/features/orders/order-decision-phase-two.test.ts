import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ordersCopy } from "./orders-copy";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("hero karar metrikleriyle yarışmadan aktif ürünü tek görsel olarak sunar", () => {
  const workspace = read("./components/order-decision-workspace.tsx");
  const hero = read("./components/order-product-hero-canvas.tsx");
  const surface = read(
    "../../components/game-presentation/product-hero-surface.tsx",
  );

  assert.match(workspace, /<OrderProductHeroCanvas/);
  assert.doesNotMatch(workspace, /ProductShowcaseCard/);
  assert.match(hero, /<ProductHeroSurface/);
  assert.equal(surface.match(/<Image/g)?.length, 1);
  assert.match(hero, /imagePriority/);
  assert.match(surface, /className="object-contain"/);
  assert.match(surface, /presentation\.objectPosition/);
  assert.doesNotMatch(
    hero,
    /totalQuantityLabel|deliveryLabel|totalRevenueLabel|plannedMarginLabel|decisionRisk/,
  );
});

test("yalnızca media katmanı ürün kimliğiyle remount olur", () => {
  const hero = read("./components/order-product-hero-canvas.tsx");
  const surface = read(
    "../../components/game-presentation/product-hero-surface.tsx",
  );
  const globals = read("../../app/globals.css");
  const mediaKeyIndex = surface.indexOf("key={mediaIdentity}");
  const articleIndex = surface.indexOf("<article");
  const mediaIndex = surface.indexOf('data-hero-layer="media"');

  assert.ok(articleIndex >= 0);
  assert.ok(mediaIndex > articleIndex);
  assert.ok(mediaKeyIndex > articleIndex);
  assert.equal(surface.match(/key=\{mediaIdentity\}/g)?.length, 1);
  assert.match(hero, /mediaIdentity=\{activeItem\.id\}/);
  assert.match(surface, /order-product-media-enter/);
  assert.match(globals, /order-product-media-enter[\s\S]*?opacity: 0/);
  assert.match(globals, /transform: scale\(0\.985\)/);
  assert.match(globals, /190ms/);
});

test("hero atmosfer katmanları düşük yoğunluk ve reduced motion sözleşmesini korur", () => {
  const hero = read("./components/order-product-hero-canvas.tsx");
  const atmosphere = read(
    "../../components/game-presentation/product-hero-atmosphere.tsx",
  );
  const background = read(
    "../../components/game-presentation/product-light-rays-background.tsx",
  );
  const lightRaysCore = read("../../components/effects/light-rays.tsx");
  const globals = read("../../app/globals.css");

  assert.match(hero, /ProductHeroSurface/);
  assert.match(atmosphere, /data-hero-layer="base"/);
  assert.match(atmosphere, /data-hero-layer="soft-blobs"/);
  assert.equal(atmosphere.match(/data-product-hero-blob=/g)?.length, 2);
  assert.doesNotMatch(atmosphere, /monogram/i);
  assert.match(atmosphere, /data-hero-layer="base-glow"/);
  assert.match(hero, /data-hero-layer="chrome"/);
  assert.match(atmosphere, /variant="hero"/);
  assert.match(background, /clamp\(intensity, 0, 0\.24\)/);
  assert.match(background, /raysSpeed=\{0\.32\}/);
  assert.match(background, /0\.24 \+ safeIntensity \/ 2/);
  assert.match(background, /data-product-top-light="true"/);
  assert.match(background, /showFallback=\{false\}/);
  assert.match(background, /motion-reduce:hidden/);
  assert.match(lightRaysCore, /prefers-reduced-motion: reduce/);
  assert.match(lightRaysCore, /data-light-rays-render-mode/);
  assert.match(globals, /product-hero-ambient-drift 21s/);
  assert.match(
    globals,
    /prefers-reduced-motion: reduce[\s\S]*?\.product-hero-ambient-drift[\s\S]*?animation: none/,
  );
});

test("inspector tek aktif mode ve sade divider yüzeylerini kullanır", () => {
  const workspace = read("./components/order-decision-workspace.tsx");

  assert.equal(workspace.match(/<TabsContent/g)?.length, 1);
  assert.match(workspace, /variant="line"/);
  assert.match(workspace, /motion-safe:duration-150/);
  assert.match(workspace, /function CapacityProgressRow/);
  assert.match(workspace, /divide-y divide-border/);
  assert.match(workspace, /offer\.capacityPlan\.rows\.map/);
  assert.doesNotMatch(workspace, /capacityPlan\.rows\.slice/);
  assert.doesNotMatch(workspace, /hiddenDepartments/);
  assert.doesNotMatch(workspace, /ProductColorChips|ColorDetails/);
});

test("server görsel fallback sırası DETAIL CARD THUMBNAIL olarak kalır", () => {
  const marketView = read("./services/order-market-view.ts");
  const detailIndex = marketView.lastIndexOf(
    "productImage.variant === ProductImageVariant.DETAIL",
  );
  const cardIndex = marketView.lastIndexOf(
    "productImage.variant === ProductImageVariant.CARD",
  );
  const thumbnailIndex = marketView.lastIndexOf(
    "productImage.variant === ProductImageVariant.THUMBNAIL",
  );

  assert.ok(detailIndex >= 0);
  assert.ok(cardIndex > detailIndex);
  assert.ok(thumbnailIndex > cardIndex);
  assert.match(marketView, /productType: \{[\s\S]*?select: \{ key: true \}/);
  assert.match(marketView, /productTypeKey: item\.product\.productType\.key/);
});

test("TR ve EN hero locale contractı aynı alanı sağlar", () => {
  assert.ok(ordersCopy.tr.ui.hero.imageUnavailable);
  assert.ok(ordersCopy.en.ui.hero.imageUnavailable);
});

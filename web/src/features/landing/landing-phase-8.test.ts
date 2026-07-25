import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { landingContent } from "./content/landing-content";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("landing erişilebilirlik sözleşmesi skip link, main hedefi ve gerçek footer landmark taşır", () => {
  const page = read("./components/landing-page.tsx");

  assert.match(page, /href="#main-content"/);
  assert.match(page, /content\.accessibility\.skipToContent/);
  assert.match(page, /id="main-content"/);
  assert.match(page, /tabIndex=\{-1\}/);
  assert.ok(page.indexOf("</main>") < page.indexOf("<LandingFooter"));
  assert.match(page, /aria-hidden="true" className="factory-backdrop"/);
});

test("TR ve EN klavye ve navigation copy değerleri eşleşir", () => {
  assert.equal(
    landingContent.tr.accessibility.skipToContent,
    "Ana içeriğe geç",
  );
  assert.equal(
    landingContent.en.accessibility.skipToContent,
    "Skip to main content",
  );
  assert.equal(landingContent.tr.navigation.ariaLabel, "Ana gezinme");
  assert.equal(landingContent.en.navigation.ariaLabel, "Primary navigation");

  const form = read("./components/landing-auth-form.tsx");
  assert.match(form, /ArrowRight/);
  assert.match(form, /ArrowLeft/);
  assert.match(form, /event\.key === "Home"/);
  assert.match(form, /event\.key === "End"/);
  assert.match(form, /tabIndex=\{activeTab === tab\.key \? 0 : -1\}/);
});

test("landing responsive ve touch hedef sözleşmesi küçük ekran için güvenli sınıfları taşır", () => {
  const hero = read("./components/landing-hero.tsx");
  const header = read("./components/landing-header.tsx");
  const language = read("./components/landing-language-switcher.tsx");
  const replay = read("./showcase/components/showcase-replay-button.tsx");
  const page = read("./components/landing-page.tsx");
  const gameLoop = read("./components/landing-game-loop.tsx");
  const css = read("../../app/globals.css");

  assert.match(hero, /flex flex-col gap-3 sm:flex-row/);
  assert.match(hero, /w-full sm:w-auto/);
  assert.match(header, /inline-flex min-h-11 items-center/);
  assert.match(language, /inline-flex min-h-11 min-w-11/);
  assert.match(replay, /min-h-11/);
  assert.match(page, /overflow-x-clip/);
  assert.match(gameLoop, /scroll-mt-52/);
  assert.match(gameLoop, /sm:scroll-mt-40/);
  assert.match(css, /\.landing-public \.game-tab \{[\s\S]*min-height: 2\.75rem/);
  assert.match(css, /\.landing-public \.game-input \{[\s\S]*min-height: 2\.75rem/);
});

test("landing hareket ve viewport yaşam döngüsü reduced-motion ile uyumludur", () => {
  const playback = read("./showcase/hooks/use-showcase-playback.ts");
  const css = read("../../app/globals.css");

  assert.match(playback, /shouldResumeOnIntersect/);
  assert.match(playback, /timeline\.pause\(\)/);
  assert.match(playback, /timeline\?\.resume\(\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.landing-public \*,[\s\S]*transition-duration: 0\.01ms/);
});

test("sortable DnD ref aktarımı lint-safe context sınırını ve mevcut handle API'sini korur", () => {
  const sortable = read("../../components/ui/sortable.tsx");

  assert.match(sortable, /SortableActivatorContext/);
  assert.match(sortable, /ref=\{\(node\) => setActivatorElement\(node\)\}/);
  assert.match(sortable, /SortableItemHandle/);
});

test("public site URL deployment dokümantasyonu canonical metadata sözleşmesini açıklar", () => {
  const readme = read("../../../README.md");
  const metadata = read("./metadata.ts");

  assert.match(readme, /NEXT_PUBLIC_SITE_URL=https:\/\/your-production-domain\.example/);
  assert.match(readme, /canonical URLs/);
  assert.match(metadata, /NEXT_PUBLIC_SITE_URL/);
  assert.match(metadata, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(metadata, /VERCEL_URL/);
});

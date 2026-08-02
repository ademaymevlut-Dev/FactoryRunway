import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { landingContent } from "./content/landing-content";
import { createLandingMetadata, resolveLandingSiteUrl } from "./metadata";
import {
  resolveLocalizedShowcaseProduct,
  resolveShowcaseProduct,
} from "./showcase/catalog-resolver";
import {
  formatShowcaseMoney,
  formatShowcaseNumber,
} from "./showcase/scenes/order-acceptance/order-acceptance-formatters";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function contractShape(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length > 0 ? [contractShape(value[0])] : [];
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, contractShape(child)]),
    );
  }

  return typeof value;
}

function collectStrings(
  value: unknown,
  path: readonly string[] = [],
): Array<{ path: string; value: string }> {
  if (typeof value === "string") {
    return [{ path: path.join("."), value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      collectStrings(child, [...path, String(index)]),
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      collectStrings(child, [...path, key]),
    );
  }

  return [];
}

test("TR ve EN landing content aynı, eksiksiz tipli sözleşmeyi taşır", () => {
  assert.deepEqual(
    contractShape(landingContent.tr),
    contractShape(landingContent.en),
  );

  for (const locale of ["tr", "en"] as const) {
    const strings = collectStrings(landingContent[locale]);

    assert.ok(strings.length > 100);

    for (const entry of strings) {
      assert.ok(entry.value.trim().length > 0, entry.path);
    }

    assert.equal(
      landingContent[locale].showcase.orderAcceptance.callouts.length,
      6,
    );
    assert.equal(
      landingContent[locale].showcase.productionQueue.callouts.length,
      6,
    );
    assert.equal(
      landingContent[locale].showcase.shiftSimulation.callouts.length,
      6,
    );
  }

  assert.equal(
    landingContent.tr.mobile.heroTitle,
    "Kendi fabrikanı kur. Üretime başla.",
  );
  assert.equal(landingContent.tr.mobile.registerTab, "Oyuncu Oluştur");
  assert.equal(
    landingContent.en.mobile.heroTitle,
    "Build your factory. Start producing.",
  );
  assert.equal(landingContent.en.mobile.registerTab, "Create Player");
});

test("İngilizce scene copy Türkçe fallback içermez", () => {
  const englishStrings = collectStrings(landingContent.en).filter(
    (entry) => entry.path !== "navigation.languageLabel",
  );

  for (const entry of englishStrings) {
    assert.doesNotMatch(
      entry.value,
      /[çğıöşüÇĞİÖŞÜ]/,
      `${entry.path}: ${entry.value}`,
    );
  }
});

test("Product.name sabit kalır ve master data model katmanında locale'e çözülür", () => {
  for (const productKey of [
    "clavier_tshirt",
    "sportise_twinset",
    "backham_blazer",
  ]) {
    const turkishProduct = resolveLocalizedShowcaseProduct(productKey, "tr");
    const englishProduct = resolveLocalizedShowcaseProduct(productKey, "en");
    const catalogProduct = resolveShowcaseProduct(productKey);

    assert.equal(turkishProduct.name, englishProduct.name);
    assert.equal(
      turkishProduct.category.label,
      catalogProduct.category.labels.tr,
    );
    assert.equal(
      englishProduct.category.label,
      catalogProduct.category.labels.en,
    );
    assert.equal(
      turkishProduct.productType.label,
      catalogProduct.productType.labels.tr,
    );
    assert.equal(
      englishProduct.productType.label,
      catalogProduct.productType.labels.en,
    );
    assert.equal(
      turkishProduct.colors[0]?.label,
      catalogProduct.colors[0]?.labels.tr,
    );
    assert.equal(
      englishProduct.colors[0]?.label,
      catalogProduct.colors[0]?.labels.en,
    );
    assert.equal(
      turkishProduct.route[0]?.label,
      catalogProduct.route[0]?.labels.tr,
    );
    assert.equal(
      englishProduct.route[0]?.label,
      catalogProduct.route[0]?.labels.en,
    );
  }
});

test("TR/EN sayı ve EUR formatları locale sözleşmesini korur", () => {
  assert.equal(formatShowcaseNumber(4_800, "tr-TR"), "4.800");
  assert.equal(formatShowcaseNumber(4_800, "en-US"), "4,800");
  assert.match(formatShowcaseMoney(22_320, "EUR", "tr-TR"), /22\.320/);
  assert.match(formatShowcaseMoney(22_320, "EUR", "en-US"), /€22,320/);
});

test("route group'lar gerçek document lang üretir ve ortak LandingPage kullanır", () => {
  const defaultLayout = read("../../app/(default-tr)/layout.tsx");
  const englishLayout = read("../../app/(landing-en)/layout.tsx");
  const turkishLayout = read("../../app/(landing-tr)/layout.tsx");
  const indexPage = read("../../app/(default-tr)/page.tsx");
  const englishPage = read("../../app/(landing-en)/en/page.tsx");
  const turkishPage = read("../../app/(landing-tr)/tr/page.tsx");

  assert.match(defaultLayout, /<html[^>]+lang="en"/);
  assert.match(turkishLayout, /<html[^>]+lang="tr"/);
  assert.match(englishLayout, /<html[^>]+lang="en"/);
  assert.match(indexPage, /<LandingPage content=\{landingContent\.en\} \/>/);
  assert.match(turkishPage, /<LandingPage content=\{landingContent\.tr\} \/>/);
  assert.match(englishPage, /<LandingPage content=\{landingContent\.en\} \/>/);
  assert.match(indexPage, /createLandingMetadata\([\s\S]*landingContent\.en/);
  assert.match(turkishPage, /createLandingMetadata\([\s\S]*landingContent\.tr/);
  assert.match(englishPage, /createLandingMetadata\([\s\S]*landingContent\.en/);
});

test("landing nihai public sıralamayı ve stabil anchor'ları taşır", () => {
  const landingPageSource = read("./components/landing-page.tsx");
  const combinedPublicSource = [
    landingPageSource,
    read("./components/landing-game-loop.tsx"),
    read("./components/landing-auth-section.tsx"),
    read("./showcase/components/landing-order-acceptance-section.tsx"),
    read("./showcase/components/landing-production-queue-section.tsx"),
    read("./showcase/components/landing-shift-simulation-section.tsx"),
    read("./showcase/components/landing-shift-report-section.tsx"),
  ].join("\n");
  const orderedComponents = [
    "<LandingHeader",
    "<LandingHero",
    "<LandingGameLoop",
    "<LandingOrderAcceptanceSection",
    "<LandingProductionQueueSection",
    "<LandingShiftSimulationSection",
    "<LandingShiftReportSection",
    "<LandingAuthSection",
    "<LandingFooter",
  ];
  let previousIndex = -1;

  for (const component of orderedComponents) {
    const index = landingPageSource.indexOf(component);
    assert.ok(index > previousIndex, component);
    previousIndex = index;
  }

  for (const anchorId of [
    "gameplay",
    "orders",
    "production",
    "shift",
    "report",
    "account",
  ]) {
    assert.match(combinedPublicSource, new RegExp(`id="${anchorId}"`));
  }

  assert.doesNotMatch(combinedPublicSource, /UI Hazırlık|UiPreparationPanel/);
});

test("language switcher gerçek Next Link ve karşı locale route'unu kullanır", () => {
  const source = read("./components/landing-language-switcher.tsx");

  assert.match(source, /import Link from "next\/link"/);
  assert.match(source, /content\.locale === "tr" \? "\/" : "\/tr"/);
  assert.match(source, /hrefLang=\{hrefLang\}/);
  assert.doesNotMatch(source, /localStorage|useRouter|router\.push/);
});

test("metadata locale, canonical ve alternates değerlerini güvenilir site URL ile üretir", () => {
  const configuredUrl = resolveLandingSiteUrl({
    NEXT_PUBLIC_SITE_URL: "https://example.com",
  });
  const vercelUrl = resolveLandingSiteUrl({
    VERCEL_PROJECT_PRODUCTION_URL: "factory-runway.vercel.app",
  });

  assert.equal(configuredUrl?.href, "https://example.com/");
  assert.equal(vercelUrl?.href, "https://factory-runway.vercel.app/");
  assert.equal(resolveLandingSiteUrl({}), null);

  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";

  try {
    const enMetadata = createLandingMetadata(landingContent.en, "/");
    const trMetadata = createLandingMetadata(landingContent.tr, "/tr");
    const enLanguages = enMetadata.alternates?.languages as
      | Record<string, URL>
      | undefined;
    const enOpenGraph = enMetadata.openGraph as
      | { locale?: string; url?: URL }
      | undefined;

    assert.equal(trMetadata.title, landingContent.tr.metadata.title);
    assert.equal(enMetadata.title, landingContent.en.metadata.title);
    assert.equal(
      (enMetadata.alternates?.canonical as URL).href,
      "https://example.com/",
    );
    assert.equal(
      (trMetadata.alternates?.canonical as URL).href,
      "https://example.com/tr",
    );
    assert.equal(enLanguages?.en.href, "https://example.com/");
    assert.equal(enLanguages?.tr.href, "https://example.com/tr");
    assert.equal(enLanguages?.["x-default"].href, "https://example.com/");
    assert.equal(enOpenGraph?.locale, "en_US");
    assert.equal(enOpenGraph?.url?.href, "https://example.com/");
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});

test("public auth aynı action'ları kullanır ve server görünür UI dili seçmez", () => {
  const formSource = read("./components/landing-auth-form.tsx");
  const actionSource = read("../../app/user-actions.ts");
  const playerStart = actionSource.indexOf(
    "export async function createPlayerAction",
  );
  const adminStart = actionSource.indexOf(
    "export async function createAdminAction",
  );
  const loginStart = actionSource.indexOf(
    "export async function loginAction",
  );
  const logoutStart = actionSource.indexOf(
    "export async function logoutAction",
  );
  const playerAction = actionSource.slice(playerStart, adminStart);
  const loginAction = actionSource.slice(loginStart, logoutStart);

  assert.match(formSource, /createPlayerAction, loginAction/);
  assert.match(formSource, /defaultTab = "login"/);
  assert.ok(
    formSource.indexOf('{ key: "login"') <
      formSource.indexOf('{ key: "player"'),
  );
  assert.match(formSource, /autoComplete="current-password"/);
  assert.match(formSource, /autoComplete="new-password"/);
  assert.match(formSource, /copy\.messages\[state\.messageCode\]/);
  assert.match(playerAction, /messageCode: "VALIDATION_ERROR"/);
  assert.match(playerAction, /messageCode: "EMAIL_ALREADY_EXISTS"/);
  assert.match(loginAction, /messageCode: "INVALID_CREDENTIALS"/);
  assert.doesNotMatch(playerAction, /oluşturulamadı|e-posta zaten/iu);
  assert.doesNotMatch(loginAction, /Giriş yapılamadı|şifre hatalı/iu);
  assert.match(playerAction, /role: USER_ROLES\.PLAYER/);
  assert.doesNotMatch(formSource, /factoryName|name="role"|createAdminAction/);
});

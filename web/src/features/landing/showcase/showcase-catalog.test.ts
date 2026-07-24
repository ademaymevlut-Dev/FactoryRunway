import assert from "node:assert/strict";
import test from "node:test";

import {
  serializeShowcaseCatalog,
  validateShowcaseCatalog,
  type ShowcaseCatalog,
} from "./showcase-catalog";
import {
  mapShowcaseCatalog,
  type ShowcaseCatalogSource,
  type ShowcaseProductSource,
} from "./showcase-mapper";
import {
  showcaseSelection,
  validateShowcaseSelection,
} from "./showcase-selection";

const blobUrl =
  "https://catalog.public.blob.vercel-storage.com/products/example.webp";

function translations(tr: string, en: string) {
  return [
    { locale: "tr", name: tr },
    { locale: "en", name: en },
  ];
}

function productSource(
  key: string,
  name: string,
): ShowcaseProductSource {
  return {
    key,
    name,
    status: "ACTIVE",
    cardPrimaryColor: "#112233",
    cardSecondaryColor: "#445566",
    cardGradientFrom: "#778899",
    cardGradientTo: "#AABBCC",
    cardSvgIconAccentColor: "#DDEEFF",
    images: [{ url: blobUrl }],
    category: {
      key: "upper_wear",
      status: "ACTIVE",
      translations: translations("Üst Giyim", "Upper Wear"),
    },
    productType: {
      key: "tshirt",
      status: "ACTIVE",
      translations: translations("Tişört", "T-Shirt"),
    },
    allowedColors: [
      {
        sortOrder: 20,
        colorVariant: {
          key: "red",
          hexCode: "#FF0000",
          status: "ACTIVE",
          translations: translations("Kırmızı", "Red"),
        },
      },
      {
        sortOrder: 10,
        colorVariant: {
          key: "blue",
          hexCode: "#0000FF",
          status: "ACTIVE",
          translations: translations("Mavi", "Blue"),
        },
      },
    ],
    routeSteps: [
      {
        sequence: 2,
        workloadPointsPerUnit: 20,
        canOutsource: true,
        department: {
          key: "printing",
          status: "ACTIVE",
          translations: translations("Baskı", "Printing"),
        },
      },
      {
        sequence: 1,
        workloadPointsPerUnit: 10,
        canOutsource: false,
        department: {
          key: "cutting",
          status: "ACTIVE",
          translations: translations("Kesim", "Cutting"),
        },
      },
    ],
  };
}

function catalogSource(): ShowcaseCatalogSource {
  return {
    sectorKey: "textile",
    status: "ACTIVE",
    products: [
      productSource("backham_blazer", "BACKHAM"),
      productSource("clavier_tshirt", "CLAVIER"),
      productSource("sportise_twinset", "SPORTISE"),
    ],
  };
}

function mappedCatalog(): ShowcaseCatalog {
  return mapShowcaseCatalog(catalogSource());
}

function cloneCatalog(): ShowcaseCatalog {
  return structuredClone(mappedCatalog());
}

function cloneSource(): ShowcaseCatalogSource {
  return structuredClone(catalogSource());
}

test("showcase selection kesin sector ve ürün sırasını kullanır", () => {
  assert.equal(showcaseSelection.sectorKey, "textile");
  assert.deepEqual(showcaseSelection.productKeys, [
    "clavier_tshirt",
    "sportise_twinset",
    "backham_blazer",
  ]);
});

test("selection tekrarlı product key değerini reddeder", () => {
  assert.throws(
    () =>
      validateShowcaseSelection({
        sectorKey: "textile",
        productKeys: ["clavier_tshirt", "clavier_tshirt"],
      }),
    /Tekrarlı showcase product key/,
  );
});

test("mapper isim, locale, kart ve canOutsource alanlarını kayıpsız taşır", () => {
  const source = cloneSource() as ShowcaseCatalogSource & {
    products: Array<ShowcaseProductSource & { id?: string; metadata?: unknown }>;
  };
  source.products[1].id = "internal-product-id";
  source.products[1].metadata = { private: true };

  const catalog = mapShowcaseCatalog(source);
  const product = catalog.products[0];

  assert.equal(product.name, "CLAVIER");
  assert.deepEqual(product.category.labels, {
    tr: "Üst Giyim",
    en: "Upper Wear",
  });
  assert.deepEqual(product.productType.labels, {
    tr: "Tişört",
    en: "T-Shirt",
  });
  assert.deepEqual(product.card, {
    primaryColor: "#112233",
    secondaryColor: "#445566",
    gradientFrom: "#778899",
    gradientTo: "#AABBCC",
    svgIconAccentColor: "#DDEEFF",
  });
  assert.equal(product.route[1].canOutsource, true);
  assert.deepEqual(Object.keys(product), [
    "key",
    "name",
    "imageUrl",
    "card",
    "category",
    "productType",
    "colors",
    "route",
  ]);
  assert.doesNotMatch(JSON.stringify(product), /internal-product-id|private/);
});

test("mapper renk ve route dizilerini deterministik sıraya koyar", () => {
  const product = mappedCatalog().products[0];

  assert.deepEqual(
    product.colors.map((color) => color.key),
    ["blue", "red"],
  );
  assert.deepEqual(
    product.route.map((step) => step.sequence),
    [1, 2],
  );
});

test("mapper eksik FRONT/CARD görselini reddeder", () => {
  const source = cloneSource();
  source.products[1].images = [];

  assert.throws(
    () => mapShowcaseCatalog(source),
    /Tam olarak bir FRONT\/CARD görseli bekleniyor/,
  );
});

test("mapper eksik ve tekrarlı locale kayıtlarını reddeder", () => {
  const missingLocale = cloneSource();
  missingLocale.products[1].category.translations = [
    { locale: "tr", name: "Üst Giyim" },
  ];

  assert.throws(
    () => mapShowcaseCatalog(missingLocale),
    /Zorunlu İngilizce çeviri bulunamadı/,
  );

  const duplicateLocale = cloneSource();
  duplicateLocale.products[1].productType.translations = [
    { locale: "tr", name: "Tişört" },
    { locale: "en", name: "T-Shirt" },
    { locale: "en", name: "Tee" },
  ];

  assert.throws(
    () => mapShowcaseCatalog(duplicateLocale),
    /Aynı locale için birden fazla çeviri/,
  );
});

test("validation yalnızca site-relative ve izin verilen Blob URL'lerini kabul eder", () => {
  const acceptedRelative = cloneCatalog();
  acceptedRelative.products[0].imageUrl = "/showcase/clavier.webp";
  assert.doesNotThrow(() => validateShowcaseCatalog(acceptedRelative));

  for (const invalidUrl of [
    "http://catalog.public.blob.vercel-storage.com/example.webp",
    "https://example.com/example.webp",
    "data:image/png;base64,AAAA",
    "javascript:alert(1)",
    "//example.com/image.webp",
    "",
  ]) {
    const catalog = cloneCatalog();
    catalog.products[0].imageUrl = invalidUrl;
    assert.throws(
      () => validateShowcaseCatalog(catalog),
      /Vercel Blob HTTPS URL|Değer boş olamaz/,
      invalidUrl,
    );
  }
});

test("validation geçersiz HEX, boş route ve geçersiz workload değerlerini reddeder", () => {
  const invalidHex = cloneCatalog();
  invalidHex.products[0].card.primaryColor = "#123";
  assert.throws(() => validateShowcaseCatalog(invalidHex), /HEX renk/);

  const emptyRoute = cloneCatalog();
  emptyRoute.products[0].route = [];
  assert.throws(
    () => validateShowcaseCatalog(emptyRoute),
    /En az bir zorunlu route adımı/,
  );

  for (const workload of [0, -1]) {
    const invalidWorkload = cloneCatalog();
    invalidWorkload.products[0].route[0].workloadPointsPerUnit = workload;
    assert.throws(() => validateShowcaseCatalog(invalidWorkload));
  }
});

test("validation tekrarlı sequence ve artmayan route sırasını reddeder", () => {
  const duplicate = cloneCatalog();
  duplicate.products[0].route[1].sequence =
    duplicate.products[0].route[0].sequence;
  assert.throws(
    () => validateShowcaseCatalog(duplicate),
    /Tekrarlı route sequence|artan sırada/,
  );

  const descending = cloneCatalog();
  descending.products[0].route.reverse();
  assert.throws(() => validateShowcaseCatalog(descending), /artan sırada/);
});

test("validation eksik, fazla ve yanlış sıralı product key listesini reddeder", () => {
  const missing = cloneCatalog();
  missing.products.pop();
  assert.throws(() => validateShowcaseCatalog(missing), /Tam olarak 3 ürün/);

  const extra = cloneCatalog();
  extra.products.push({
    ...structuredClone(extra.products[0]),
    key: "extra_product",
  });
  assert.throws(() => validateShowcaseCatalog(extra), /Tam olarak 3 ürün/);

  const reordered = cloneCatalog();
  reordered.products.reverse();
  assert.throws(() => validateShowcaseCatalog(reordered), /Beklenen/);
});

test("aynı normalize edilmiş catalog byte-identical serialize edilir", () => {
  const catalog = mappedCatalog();
  const first = serializeShowcaseCatalog(catalog);
  const second = serializeShowcaseCatalog(catalog);

  assert.equal(first, second);
  assert.ok(first.endsWith("\n"));
  assert.doesNotMatch(first, /generatedAt|timestamp|environment/);
});

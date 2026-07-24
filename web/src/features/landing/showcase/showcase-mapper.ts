import {
  ShowcaseCatalogError,
  validateShowcaseCatalog,
  type ShowcaseCatalog,
  type ShowcaseLabels,
} from "./showcase-catalog";
import {
  showcaseSelection,
  validateShowcaseSelection,
  type ShowcaseSelection,
} from "./showcase-selection";

type SourceTranslation = {
  locale: string;
  name: string;
};

type SourceNamedMasterData = {
  key: string;
  status: string;
  translations: readonly SourceTranslation[];
};

type SourceAllowedColor = {
  sortOrder: number;
  colorVariant: SourceNamedMasterData & {
    hexCode: string;
  };
};

type SourceRouteStep = {
  sequence: number;
  workloadPointsPerUnit: number;
  canOutsource: boolean;
  department: SourceNamedMasterData;
};

export type ShowcaseProductSource = {
  key: string;
  name: string;
  status: string;
  cardPrimaryColor: string;
  cardSecondaryColor: string;
  cardGradientFrom: string;
  cardGradientTo: string;
  cardSvgIconAccentColor: string;
  images: readonly { url: string }[];
  category: SourceNamedMasterData;
  productType: SourceNamedMasterData;
  allowedColors: readonly SourceAllowedColor[];
  routeSteps: readonly SourceRouteStep[];
};

export type ShowcaseCatalogSource = {
  sectorKey: string;
  status: string;
  products: readonly ShowcaseProductSource[];
};

function fail(field: string, reason: string, productKey?: string): never {
  throw new ShowcaseCatalogError(field, reason, productKey);
}

function assertActive(
  status: string,
  field: string,
  productKey?: string,
): void {
  if (status !== "ACTIVE") {
    fail(field, `ACTIVE bekleniyor; ${status} bulundu.`, productKey);
  }
}

function mapLabels(
  translations: readonly SourceTranslation[],
  field: string,
  productKey: string,
): ShowcaseLabels {
  const labels = new Map<string, string>();

  for (const translation of translations) {
    if (translation.locale !== "tr" && translation.locale !== "en") {
      continue;
    }

    if (labels.has(translation.locale)) {
      fail(
        `${field}.translations.${translation.locale}`,
        `Aynı locale için birden fazla çeviri bulundu: ${translation.locale}.`,
        productKey,
      );
    }

    labels.set(translation.locale, translation.name);
  }

  const tr = labels.get("tr");
  const en = labels.get("en");

  if (!tr?.trim()) {
    fail(
      `${field}.translations.tr`,
      "Zorunlu Türkçe çeviri bulunamadı.",
      productKey,
    );
  }

  if (!en?.trim()) {
    fail(
      `${field}.translations.en`,
      "Zorunlu İngilizce çeviri bulunamadı.",
      productKey,
    );
  }

  return { tr, en };
}

function mapProduct(product: ShowcaseProductSource) {
  const productKey = product.key;
  assertActive(product.status, "status", productKey);
  assertActive(product.category.status, "category.status", productKey);
  assertActive(product.productType.status, "productType.status", productKey);

  if (product.images.length !== 1) {
    fail(
      "imageUrl",
      `Tam olarak bir FRONT/CARD görseli bekleniyor; ${product.images.length} bulundu.`,
      productKey,
    );
  }

  const colors = [...product.allowedColors]
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.colorVariant.key.localeCompare(right.colorVariant.key, "en"),
    )
    .map((allowedColor) => ({
      key: allowedColor.colorVariant.key,
      hexCode: allowedColor.colorVariant.hexCode,
      labels: mapLabels(
        allowedColor.colorVariant.translations,
        `colors.${allowedColor.colorVariant.key}`,
        productKey,
      ),
    }));

  const route = [...product.routeSteps]
    .sort((left, right) => left.sequence - right.sequence)
    .map((routeStep) => {
      assertActive(
        routeStep.department.status,
        `route.${routeStep.sequence}.department.status`,
        productKey,
      );

      return {
        departmentKey: routeStep.department.key,
        sequence: routeStep.sequence,
        workloadPointsPerUnit: routeStep.workloadPointsPerUnit,
        canOutsource: routeStep.canOutsource,
        labels: mapLabels(
          routeStep.department.translations,
          `route.${routeStep.sequence}.department`,
          productKey,
        ),
      };
    });

  return {
    key: product.key,
    name: product.name,
    imageUrl: product.images[0].url,
    card: {
      primaryColor: product.cardPrimaryColor,
      secondaryColor: product.cardSecondaryColor,
      gradientFrom: product.cardGradientFrom,
      gradientTo: product.cardGradientTo,
      svgIconAccentColor: product.cardSvgIconAccentColor,
    },
    category: {
      key: product.category.key,
      labels: mapLabels(
        product.category.translations,
        "category",
        productKey,
      ),
    },
    productType: {
      key: product.productType.key,
      labels: mapLabels(
        product.productType.translations,
        "productType",
        productKey,
      ),
    },
    colors,
    route,
  };
}

export function mapShowcaseCatalog(
  source: ShowcaseCatalogSource,
  selection: ShowcaseSelection = showcaseSelection,
): ShowcaseCatalog {
  validateShowcaseSelection(selection);

  if (source.sectorKey !== selection.sectorKey) {
    fail(
      "sectorKey",
      `Beklenen ${selection.sectorKey}, gelen ${source.sectorKey}.`,
    );
  }

  assertActive(source.status, "sector.status");

  if (source.products.length !== selection.productKeys.length) {
    fail(
      "products",
      `Tam olarak ${selection.productKeys.length} ürün bekleniyor; ${source.products.length} bulundu.`,
    );
  }

  const productsByKey = new Map<string, ShowcaseProductSource>();

  for (const product of source.products) {
    if (productsByKey.has(product.key)) {
      fail(
        "products",
        `Tekrarlı source product key: ${product.key}.`,
        product.key,
      );
    }

    if (!selection.productKeys.includes(product.key)) {
      fail("products", `Seçim dışı ürün bulundu: ${product.key}.`, product.key);
    }

    productsByKey.set(product.key, product);
  }

  const products = selection.productKeys.map((productKey) => {
    const product = productsByKey.get(productKey);

    if (!product) {
      fail("products", `Seçili ürün bulunamadı: ${productKey}.`, productKey);
    }

    return mapProduct(product);
  });

  return validateShowcaseCatalog(
    {
      schemaVersion: 1,
      sectorKey: source.sectorKey,
      products,
    },
    selection,
  );
}

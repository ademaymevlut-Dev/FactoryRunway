import catalogJson from "./data/catalog.generated.json";
import type {
  ShowcaseCatalog,
  ShowcaseLabels,
  ShowcaseProduct,
} from "./showcase-catalog";

const catalog = catalogJson as ShowcaseCatalog;

export type ShowcaseLabelLocale = keyof ShowcaseLabels;

type LocalizedNamedMasterData = Omit<
  ShowcaseProduct["category"],
  "labels"
> & {
  label: string;
};

type LocalizedShowcaseColor = Omit<
  ShowcaseProduct["colors"][number],
  "labels"
> & {
  label: string;
};

type LocalizedShowcaseRouteStep = Omit<
  ShowcaseProduct["route"][number],
  "labels"
> & {
  label: string;
};

export type LocalizedShowcaseProduct = Omit<
  ShowcaseProduct,
  "category" | "colors" | "productType" | "route"
> & {
  category: LocalizedNamedMasterData;
  colors: readonly LocalizedShowcaseColor[];
  productType: LocalizedNamedMasterData;
  route: readonly LocalizedShowcaseRouteStep[];
};

export function resolveShowcaseProduct(productKey: string): ShowcaseProduct {
  const product = catalog.products.find((candidate) => candidate.key === productKey);

  if (!product) {
    throw new Error(`Showcase product bulunamadı: ${productKey}`);
  }

  return product;
}

function localizeNamedMasterData(
  value: ShowcaseProduct["category"],
  locale: ShowcaseLabelLocale,
): LocalizedNamedMasterData {
  const { labels, ...masterData } = value;
  const label = labels[locale];

  if (!label) {
    throw new Error(
      `Showcase master data locale bulunamadı: ${value.key}/${locale}`,
    );
  }

  return { ...masterData, label };
}

export function resolveLocalizedShowcaseProduct(
  productKey: string,
  locale: ShowcaseLabelLocale,
): LocalizedShowcaseProduct {
  const product = resolveShowcaseProduct(productKey);

  return {
    ...product,
    category: localizeNamedMasterData(product.category, locale),
    colors: product.colors.map(({ labels, ...color }) => {
      const label = labels[locale];

      if (!label) {
        throw new Error(
          `Showcase color locale bulunamadı: ${product.key}/${color.key}/${locale}`,
        );
      }

      return { ...color, label };
    }),
    productType: localizeNamedMasterData(product.productType, locale),
    route: product.route.map(({ labels, ...step }) => {
      const label = labels[locale];

      if (!label) {
        throw new Error(
          `Showcase route locale bulunamadı: ${product.key}/${step.departmentKey}/${locale}`,
        );
      }

      return { ...step, label };
    }),
  };
}

export function getShowcaseCatalogProducts(): readonly ShowcaseProduct[] {
  return catalog.products;
}

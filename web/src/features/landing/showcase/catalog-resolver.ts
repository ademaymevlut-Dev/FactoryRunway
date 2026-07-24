import catalogJson from "./data/catalog.generated.json";
import type {
  ShowcaseCatalog,
  ShowcaseProduct,
} from "./showcase-catalog";

const catalog = catalogJson as ShowcaseCatalog;

export function resolveShowcaseProduct(productKey: string): ShowcaseProduct {
  const product = catalog.products.find((candidate) => candidate.key === productKey);

  if (!product) {
    throw new Error(`Showcase product bulunamadı: ${productKey}`);
  }

  return product;
}

export function getShowcaseCatalogProducts(): readonly ShowcaseProduct[] {
  return catalog.products;
}

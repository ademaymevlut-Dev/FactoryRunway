import { resolveShowcaseProduct } from "../../catalog-resolver";
import type {
  OrderAcceptanceSceneCopy,
  OrderAcceptanceSceneData,
  OrderAcceptanceSceneModel,
  ShowcaseLocale,
} from "./order-acceptance-scene-types";

function assertUnique(values: readonly string[], field: string) {
  const uniqueValues = new Set(values);

  if (uniqueValues.size !== values.length) {
    throw new Error(`${field} değerleri benzersiz olmalı.`);
  }
}

function validateCallouts(copy: OrderAcceptanceSceneCopy) {
  assertUnique(
    copy.callouts.map((callout) => callout.id),
    "Callout id",
  );
  assertUnique(
    copy.callouts.map((callout) => callout.target),
    "Callout target",
  );
}

export function createOrderAcceptanceSceneModel(
  data: OrderAcceptanceSceneData,
  locale: ShowcaseLocale,
  copy?: OrderAcceptanceSceneCopy,
): OrderAcceptanceSceneModel {
  assertUnique(
    data.offers.map((offer) => offer.id),
    "Offer id",
  );

  if (copy) {
    validateCallouts(copy);
  }

  const offers = data.offers.map((offer) => {
    const product = resolveShowcaseProduct(offer.productKey);
    const unitPriceCents = Math.round(offer.unitPrice * 100);
    const totalRevenueCents = Math.round(offer.totalRevenue * 100);

    if (unitPriceCents * offer.quantity !== totalRevenueCents) {
      throw new Error(`Offer gelir hesabı geçersiz: ${offer.id}`);
    }

    return { ...offer, product };
  });
  const selectedOffer = offers.find(
    (offer) => offer.id === data.selectedOfferId,
  );

  if (!selectedOffer) {
    throw new Error(`Seçili showcase offer bulunamadı: ${data.selectedOfferId}`);
  }

  const product = selectedOffer.product;
  const catalogColorKeys = product.colors.map((color) => color.key);
  const allocationColorKeys = data.colorAllocation.map(
    (allocation) => allocation.colorKey,
  );

  if (
    catalogColorKeys.length !== allocationColorKeys.length ||
    catalogColorKeys.some(
      (colorKey, index) => colorKey !== allocationColorKeys[index],
    )
  ) {
    throw new Error(
      `Renk allocation sırası generated katalogla eşleşmiyor: ${product.key}`,
    );
  }

  const allocationTotal = data.colorAllocation.reduce(
    (total, allocation) => total + allocation.quantity,
    0,
  );

  if (allocationTotal !== selectedOffer.quantity) {
    throw new Error(
      `Renk allocation toplamı sipariş miktarına eşit değil: ${allocationTotal}`,
    );
  }

  const colorAllocation = data.colorAllocation.map((allocation) => {
    const color = product.colors.find(
      (candidate) => candidate.key === allocation.colorKey,
    );

    if (!color) {
      throw new Error(
        `Showcase color bulunamadı: ${product.key}/${allocation.colorKey}`,
      );
    }

    return { color, quantity: allocation.quantity };
  });

  for (const routeStep of product.route) {
    if (!routeStep.labels[locale]) {
      throw new Error(
        `Showcase route locale bulunamadı: ${product.key}/${routeStep.departmentKey}/${locale}`,
      );
    }
  }

  return {
    colorAllocation,
    offers,
    product,
    selectedOffer,
  };
}

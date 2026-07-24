import type { OrderAcceptanceSceneData } from "./order-acceptance-scene-types";

export const orderAcceptanceSceneData = {
  sceneId: "order-acceptance",
  selectedOfferId: "offer-clavier",
  offers: [
    {
      id: "offer-clavier",
      customerName: "Northline Apparel",
      productKey: "clavier_tshirt",
      quantity: 4_800,
      deliveryDays: 20,
      currency: "EUR",
      unitPrice: 4.65,
      totalRevenue: 22_320,
    },
    {
      id: "offer-sportise",
      customerName: "Urban Form",
      productKey: "sportise_twinset",
      quantity: 2_400,
      deliveryDays: 18,
      currency: "EUR",
      unitPrice: 8.4,
      totalRevenue: 20_160,
    },
    {
      id: "offer-backham",
      customerName: "Maison Eleven",
      productKey: "backham_blazer",
      quantity: 720,
      deliveryDays: 24,
      currency: "EUR",
      unitPrice: 36,
      totalRevenue: 25_920,
    },
  ],
  colorAllocation: [
    { colorKey: "basic_black", quantity: 800 },
    { colorKey: "basic_white", quantity: 800 },
    { colorKey: "basic_red", quantity: 800 },
    { colorKey: "basic_navy", quantity: 800 },
    { colorKey: "fw_muted_clay", quantity: 800 },
    { colorKey: "fw_neptune_green", quantity: 800 },
  ],
} as const satisfies OrderAcceptanceSceneData;

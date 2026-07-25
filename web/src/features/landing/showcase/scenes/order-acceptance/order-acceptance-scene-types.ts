import type { LocalizedShowcaseProduct } from "../../catalog-resolver";

export type ShowcaseLocale = "en" | "tr";

export type OrderAcceptanceTarget =
  | "order-accept"
  | "order-colors"
  | "order-delivery"
  | "order-offer-list"
  | "order-quantity"
  | "order-route";

export type OrderAcceptanceOffer = {
  currency: "EUR";
  customerName: string;
  deliveryDays: number;
  id: string;
  productKey: string;
  quantity: number;
  totalRevenue: number;
  unitPrice: number;
};

export type OrderAcceptanceColorAllocation = {
  colorKey: string;
  quantity: number;
};

export type OrderAcceptanceSceneData = {
  colorAllocation: readonly OrderAcceptanceColorAllocation[];
  offers: readonly OrderAcceptanceOffer[];
  sceneId: string;
  selectedOfferId: string;
};

export type OrderAcceptanceCallout = {
  description: string;
  id: string;
  number: string;
  target: OrderAcceptanceTarget;
  title: string;
};

export type OrderAcceptanceSceneCopy = {
  acceptButton: string;
  acceptedButton: string;
  acceptedNotificationDescription: string;
  acceptedNotificationTitle: string;
  calloutRailLabel: string;
  callouts: readonly OrderAcceptanceCallout[];
  categoryLabel: string;
  colorsLabel: string;
  dayUnitLabel: string;
  deliveryLabel: string;
  listDescription: string;
  listTitle: string;
  orderListAriaLabel: string;
  outsourceLabel: string;
  pieceUnitLabel: string;
  productTypeLabel: string;
  quantityLabel: string;
  replayLabel: string;
  revenueLabel: string;
  routeLabel: string;
  sectionDescription: string;
  sectionEyebrow: string;
  sectionTitle: string;
  selectedOfferLabel: string;
  unitPriceLabel: string;
  workloadUnitLabel: string;
};

export type ResolvedOrderAcceptanceOffer = OrderAcceptanceOffer & {
  product: LocalizedShowcaseProduct;
};

export type ResolvedOrderAcceptanceColor = {
  color: LocalizedShowcaseProduct["colors"][number];
  quantity: number;
};

export type OrderAcceptanceSceneModel = {
  colorAllocation: readonly ResolvedOrderAcceptanceColor[];
  offers: readonly ResolvedOrderAcceptanceOffer[];
  product: LocalizedShowcaseProduct;
  selectedOffer: ResolvedOrderAcceptanceOffer;
};

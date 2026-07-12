import type {
  MarketOrderOfferStatus,
  MarketOrderOfferType,
  ProductTier,
} from "@/generated/prisma/enums";

export type OrderMarketView = {
  activeOrders: ActiveOrderPriorityView[];
  availableCount: number;
  offers: OrderOfferView[];
};

export type ActiveOrderPriorityView = {
  id: string;
  orderNo: string;
  customerName: string;
  productName: string;
  targetDeliveryDay: number;
  remainingQuantity: number;
  priority: number;
};

export type OrderOfferView = {
  id: string;
  offerNo: string;
  customerName: string;
  segmentLabel: string;
  volumeLabel: string;
  offerType: MarketOrderOfferType;
  offerTypeLabel: string;
  isCollection: boolean;
  status: MarketOrderOfferStatus;
  offeredDay: number;
  expiresDay: number;
  targetDeliveryDay: number;
  deliveryLabel: string;
  totalQuantity: number;
  totalQuantityLabel: string;
  totalRevenueCents: string;
  totalRevenueLabel: string;
  acceptPlan: {
    materialReadyLabel: string;
    cuttingStartLabel: string;
    productionOrderLabel: string;
  };
  plannedCostCents: string;
  plannedCostLabel: string;
  plannedProfitCents: string;
  plannedProfitLabel: string;
  plannedMarginBps: number;
  plannedMarginLabel: string;
  capacityRiskLabel: string;
  deliveryRiskLabel: string;
  items: OrderOfferItemView[];
};

export type OrderOfferItemView = {
  id: string;
  productName: string;
  productCode: string;
  productTier: ProductTier;
  productTierLabel: string;
  quantity: number;
  quantityLabel: string;
  unitPriceCents: string;
  unitPriceLabel: string;
  totalPriceCents: string;
  totalPriceLabel: string;
  plannedUnitCostCents: string;
  plannedUnitCostLabel: string;
  plannedTotalCostCents: string;
  plannedTotalCostLabel: string;
  plannedUnitProfitCents: string;
  plannedUnitProfitLabel: string;
  plannedProfitCents: string;
  plannedProfitLabel: string;
  plannedMarginLabel: string;
  routeLabel: string;
  bottleneckLabel: string;
  imageUrl: string | null;
  colors: OrderOfferItemColorView[];
};

export type OrderOfferItemColorView = {
  id: string;
  name: string;
  hexCode: string;
  quantity: number;
  quantityLabel: string;
};

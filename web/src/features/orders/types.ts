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
  customerRelationship: OrderOfferCustomerRelationshipView | null;
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
  capacityPlan: OrderOfferCapacityPlanView;
  items: OrderOfferItemView[];
};

export type OrderOfferCustomerRelationshipView = {
  completedOrderCount: number;
  lateOrderCount: number;
  relationshipScoreBps: number;
  relationshipScoreLabel: string;
  repeatEligible: boolean;
  repeatLabel: string;
  repeatWeightLabel: string;
  status: "new" | "trusted" | "warm" | "at_risk";
  statusLabel: string;
  totalLateDays: number;
};

export type OrderOfferCapacityState =
  | "SAFE"
  | "BALANCED"
  | "STRETCH"
  | "RISKY"
  | "CRITICAL"
  | "NO_CAPACITY";

export type OrderOfferCapacityPlanView = {
  state: OrderOfferCapacityState;
  stateLabel: string;
  bottleneckDepartmentLabel: string;
  currentLoadDaysLabel: string;
  offerLoadDaysLabel: string;
  afterAcceptLoadDaysLabel: string;
  plannedCompletionLabel: string;
  targetDeliveryLabel: string;
  rows: OrderOfferCapacityDepartmentView[];
};

export type OrderOfferCapacityDepartmentView = {
  departmentId: string;
  departmentName: string;
  state: OrderOfferCapacityState;
  stateLabel: string;
  lineCountLabel: string;
  dailyCapacityLabel: string;
  currentLoadDaysLabel: string;
  offerLoadDaysLabel: string;
  afterAcceptLoadDaysLabel: string;
  afterAcceptLoadPercent: number;
};

export type OrderOfferItemView = {
  id: string;
  cardGradientFrom: string;
  cardGradientTo: string;
  cardPrimaryColor: string;
  cardSecondaryColor: string;
  cardSvgIconAccentColor: string;
  cardTextColor: string;
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

import type { OrderOfferDecisionRiskView } from "../types";

export type OrderDecisionRiskValues = Pick<
  OrderOfferDecisionRiskView,
  "dominantFactor" | "scoreBps"
>;

export function getOrderDecisionRiskValues(
  capacityRiskBps: number,
  deliveryRiskBps: number,
): OrderDecisionRiskValues {
  const scoreBps = Math.max(capacityRiskBps, deliveryRiskBps);

  if (capacityRiskBps === deliveryRiskBps) {
    return { dominantFactor: null, scoreBps };
  }

  return {
    dominantFactor:
      capacityRiskBps > deliveryRiskBps ? "CAPACITY" : "DELIVERY",
    scoreBps,
  };
}

import type { ProductTier } from "@/generated/prisma/enums";

export type { ProductTier } from "@/generated/prisma/enums";

export const PRODUCT_TIER_ORDER = [
  "BASIC",
  "STANDARD",
  "PREMIUM",
  "LUXURY",
] as const satisfies readonly ProductTier[];

export const PRODUCT_TIER_MIN_LEVEL = {
  BASIC: 1,
  STANDARD: 5,
  PREMIUM: 20,
  LUXURY: 50,
} as const satisfies Record<ProductTier, number>;

export const PRODUCT_TIER_LABELS = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  LUXURY: "Luxury",
} as const satisfies Record<ProductTier, string>;

export function getProductTierMinimumLevel(tier: ProductTier) {
  return PRODUCT_TIER_MIN_LEVEL[tier];
}

export function getEffectiveProductRequiredLevel(input: {
  requiredPlayerLevel: number;
  tier: ProductTier;
}) {
  return Math.max(
    PRODUCT_TIER_MIN_LEVEL[input.tier],
    Math.max(1, Math.trunc(input.requiredPlayerLevel)),
  );
}

export function isProductTierUnlocked(tier: ProductTier, currentLevel: number) {
  return currentLevel >= PRODUCT_TIER_MIN_LEVEL[tier];
}

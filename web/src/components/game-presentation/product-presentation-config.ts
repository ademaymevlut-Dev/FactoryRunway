export type ProductPresentationConfig = {
  scale?: number;
  translateXPercent?: number;
  translateYPercent?: number;
  objectPositionXPercent?: number;
  objectPositionYPercent?: number;
  lightIntensity?: number;
  lightXPercent?: number;
  lightYPercent?: number;
};

export type ProductPresentationFamily =
  | "TOP"
  | "BOTTOM"
  | "DRESS"
  | "SET"
  | "DEFAULT";

export type ResolvedProductPresentationConfig = Required<ProductPresentationConfig> & {
  family: ProductPresentationFamily;
  objectPosition: string;
};

const GLOBAL_PRESENTATION: Required<ProductPresentationConfig> = {
  scale: 1.1,
  translateXPercent: 0,
  translateYPercent: 1,
  objectPositionXPercent: 50,
  objectPositionYPercent: 52,
  lightIntensity: 0.18,
  lightXPercent: 50,
  lightYPercent: 22,
};

const FAMILY_PRESENTATION: Record<
  ProductPresentationFamily,
  ProductPresentationConfig
> = {
  TOP: {
    scale: 1.14,
    translateYPercent: 2,
    objectPositionYPercent: 48,
    lightYPercent: 20,
  },
  BOTTOM: {
    scale: 1.12,
    translateYPercent: 0,
    objectPositionYPercent: 52,
    lightYPercent: 24,
  },
  DRESS: {
    scale: 1.08,
    translateYPercent: 0,
    objectPositionYPercent: 51,
    lightIntensity: 0.16,
    lightYPercent: 23,
  },
  SET: {
    scale: 1.06,
    translateYPercent: 0,
    objectPositionYPercent: 50,
    lightIntensity: 0.16,
    lightYPercent: 21,
  },
  DEFAULT: {},
};

const PRODUCT_TYPE_FAMILIES: Readonly<
  Record<string, Exclude<ProductPresentationFamily, "DEFAULT">>
> = {
  blouse: "TOP",
  long_dress: "DRESS",
  matching_set: "SET",
  midi_dress: "DRESS",
  mini_dress: "DRESS",
  pants: "BOTTOM",
  shirt: "TOP",
  shorts: "BOTTOM",
  skirt: "BOTTOM",
  sweatshirt: "TOP",
  t_shirt: "TOP",
  tank_top: "TOP",
  tracksuit_set: "SET",
  two_piece_set: "SET",
  set: "SET",
};

// Product-code overrides stay explicit and presentation-only.
const PRODUCT_PRESENTATION: Readonly<Record<string, ProductPresentationConfig>> = {};

const BOUNDS = {
  lightIntensity: [0, 0.24],
  lightXPercent: [10, 90],
  lightYPercent: [0, 65],
  objectPositionXPercent: [0, 100],
  objectPositionYPercent: [0, 100],
  scale: [0.9, 1.16],
  translateXPercent: [-10, 10],
  translateYPercent: [-8, 10],
} as const satisfies Record<keyof ProductPresentationConfig, readonly [number, number]>;

export function resolveProductPresentationFamily(
  productTypeKey: string | null | undefined,
): ProductPresentationFamily {
  if (!productTypeKey) return "DEFAULT";

  return PRODUCT_TYPE_FAMILIES[productTypeKey] ?? "DEFAULT";
}

export function resolveProductPresentationConfig({
  productCode,
  productTypeKey,
}: {
  productCode: string;
  productTypeKey: string | null | undefined;
}): ResolvedProductPresentationConfig {
  const family = resolveProductPresentationFamily(productTypeKey);
  const familyConfig = normalizeProductPresentationConfig(
    FAMILY_PRESENTATION[family],
    GLOBAL_PRESENTATION,
  );
  const resolved = normalizeProductPresentationConfig(
    PRODUCT_PRESENTATION[productCode] ?? {},
    familyConfig,
  );

  return {
    ...resolved,
    family,
    objectPosition: `${resolved.objectPositionXPercent}% ${resolved.objectPositionYPercent}%`,
  };
}

export function normalizeProductPresentationConfig(
  config: ProductPresentationConfig,
  fallback: Required<ProductPresentationConfig> = GLOBAL_PRESENTATION,
): Required<ProductPresentationConfig> {
  return {
    lightIntensity: boundedValue(config.lightIntensity, fallback.lightIntensity, "lightIntensity"),
    lightXPercent: boundedValue(config.lightXPercent, fallback.lightXPercent, "lightXPercent"),
    lightYPercent: boundedValue(config.lightYPercent, fallback.lightYPercent, "lightYPercent"),
    objectPositionXPercent: boundedValue(
      config.objectPositionXPercent,
      fallback.objectPositionXPercent,
      "objectPositionXPercent",
    ),
    objectPositionYPercent: boundedValue(
      config.objectPositionYPercent,
      fallback.objectPositionYPercent,
      "objectPositionYPercent",
    ),
    scale: boundedValue(config.scale, fallback.scale, "scale"),
    translateXPercent: boundedValue(
      config.translateXPercent,
      fallback.translateXPercent,
      "translateXPercent",
    ),
    translateYPercent: boundedValue(
      config.translateYPercent,
      fallback.translateYPercent,
      "translateYPercent",
    ),
  };
}

function boundedValue(
  value: number | undefined,
  fallback: number,
  key: keyof ProductPresentationConfig,
) {
  const candidate = Number.isFinite(value) ? value : fallback;
  const [minimum, maximum] = BOUNDS[key];

  return clamp(candidate ?? fallback, minimum, maximum);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

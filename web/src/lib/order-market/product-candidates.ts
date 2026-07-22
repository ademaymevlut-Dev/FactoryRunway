import {
  ContentStatus,
  FactoryProductionLineStatus,
  type Gender,
  type OutsourceOptionType,
  type ProductTier,
} from "@/generated/prisma/client";
import { calculateOutsourceUnitCostCents } from "@/features/production-queue/services/outsource-cost";
import { getEffectiveProductRequiredLevel } from "@/features/orders/product-tier-rules";
import { getPrisma } from "@/lib/db";

const ACTIVE_CAPACITY_LINE_STATUSES = [
  FactoryProductionLineStatus.IDLE,
  FactoryProductionLineStatus.RUNNING,
] as const;

type TranslationLike = {
  locale: string;
  name: string;
};

type FactoryLineCapacityInput = {
  departmentId: string;
  conditionBps: number;
  productionLineTemplate: {
    dailyPointCapacity: number;
  };
};

type OutsourceConfigForCandidate = {
  baseCostPer1000PointsCents: number;
  costMultiplierBps: number;
  departmentId: string;
  leadTimeDays: number;
  optionType: OutsourceOptionType;
};

export type DepartmentDailyCapacity = {
  departmentId: string;
  dailyPointCapacity: number;
  lineCount: number;
};

export type OrderProductCandidateColor = {
  productAllowedColorId: string;
  colorVariantId: string;
  key: string;
  name: string;
  hexCode: string;
  selectionWeightBps: number;
  sortOrder: number;
  isDefault: boolean;
};

export type OrderProductCandidateRouteStep = {
  productRouteStepId: string;
  departmentId: string;
  departmentKey: string;
  departmentName: string;
  sequence: number;
  isRequired: boolean;
  canOutsource: boolean;
  outsourceLeadTimeDays: number | null;
  outsourceUnitCostCents: number | null;
  workloadPointsPerUnit: number;
  setupPoints: number;
  departmentDailyPointCapacity: number;
  estimatedDailyQuantity: number;
};

export type OrderProductCandidate = {
  productId: string;
  key: string;
  name: string;
  categoryKey: string;
  categoryName: string;
  productTypeKey: string;
  productTypeName: string;
  tier: ProductTier;
  gender: Gender | null;
  baseUnitPriceCents: number;
  requiredPlayerLevel: number;
  offerColorCountMin: number;
  offerColorCountMax: number;
  requiredPointsPerUnit: number;
  bottleneckDepartmentId: string;
  bottleneckDailyQuantity: number;
  requiresOutsource: boolean;
  estimatedOutsourceLeadDays: number;
  estimatedOutsourceUnitCostCents: number;
  colors: OrderProductCandidateColor[];
  routeSteps: OrderProductCandidateRouteStep[];
};

export type RejectedOrderProductCandidateReason =
  | "PLAYER_LEVEL_TOO_LOW"
  | "MISSING_BASE_PRICE"
  | "MISSING_ROUTE"
  | "MISSING_ACTIVE_ALLOWED_COLOR"
  | "INVALID_COLOR_LIMITS"
  | "MISSING_INTERNAL_CAPACITY"
  | "MISSING_OUTSOURCE_OPTION"
  | "BOTTLENECK_ZERO_CAPACITY";

export type RejectedOrderProductCandidate = {
  productId: string;
  key: string;
  name: string;
  reason: RejectedOrderProductCandidateReason;
  detail: string;
};

export type OrderProductCandidateResult = {
  factory: {
    id: string;
    sectorId: string;
    currentLevel: number;
  };
  departmentCapacities: DepartmentDailyCapacity[];
  candidates: OrderProductCandidate[];
  rejected: RejectedOrderProductCandidate[];
};

type ProductForCandidateEvaluation = Awaited<
  ReturnType<typeof fetchProductsForFactorySector>
>[number];

export async function getOrderProductCandidatesForFactory(
  factoryId: string,
): Promise<OrderProductCandidateResult> {
  const prisma = getPrisma();
  const factory = await prisma.factory.findUniqueOrThrow({
    where: { id: factoryId },
    select: {
      id: true,
      sectorId: true,
      currentLevel: true,
      productionLines: {
        where: {
          status: {
            in: [...ACTIVE_CAPACITY_LINE_STATUSES],
          },
        },
        select: {
          departmentId: true,
          conditionBps: true,
          productionLineTemplate: {
            select: {
              dailyPointCapacity: true,
            },
          },
        },
      },
    },
  });
  const departmentCapacityById = calculateDepartmentDailyCapacityById(
    factory.productionLines,
  );
  const [products, outsourceConfigs] = await Promise.all([
    fetchProductsForFactorySector(factory.sectorId),
    prisma.outsourceOptionConfig.findMany({
      where: {
        baseCostPer1000PointsCents: { gt: 0 },
        sectorId: factory.sectorId,
        status: ContentStatus.ACTIVE,
      },
      select: {
        baseCostPer1000PointsCents: true,
        costMultiplierBps: true,
        departmentId: true,
        leadTimeDays: true,
        optionType: true,
      },
    }),
  ]);
  const outsourceConfigsByDepartmentId = new Map<
    string,
    OutsourceConfigForCandidate[]
  >();

  for (const config of outsourceConfigs) {
    const current = outsourceConfigsByDepartmentId.get(config.departmentId) ?? [];
    current.push(config);
    outsourceConfigsByDepartmentId.set(config.departmentId, current);
  }
  const candidates: OrderProductCandidate[] = [];
  const rejected: RejectedOrderProductCandidate[] = [];

  for (const product of products) {
    const result = evaluateOrderProductCandidate({
      product,
      currentLevel: factory.currentLevel,
      departmentCapacityById,
      outsourceConfigsByDepartmentId,
    });

    if (result.kind === "accepted") {
      candidates.push(result.candidate);
    } else {
      rejected.push(result.rejected);
    }
  }

  return {
    factory: {
      id: factory.id,
      sectorId: factory.sectorId,
      currentLevel: factory.currentLevel,
    },
    departmentCapacities: Array.from(departmentCapacityById, ([departmentId, capacity]) => ({
      departmentId,
      ...capacity,
    })),
    candidates,
    rejected,
  };
}

export function calculateDepartmentDailyCapacityById(
  lines: FactoryLineCapacityInput[],
) {
  const capacityByDepartmentId = new Map<
    string,
    { dailyPointCapacity: number; lineCount: number }
  >();

  for (const line of lines) {
    const current = capacityByDepartmentId.get(line.departmentId) ?? {
      dailyPointCapacity: 0,
      lineCount: 0,
    };
    const effectiveDailyCapacity = Math.floor(
      (line.productionLineTemplate.dailyPointCapacity * line.conditionBps) /
        10_000,
    );

    capacityByDepartmentId.set(line.departmentId, {
      dailyPointCapacity:
        current.dailyPointCapacity + Math.max(0, effectiveDailyCapacity),
      lineCount: current.lineCount + 1,
    });
  }

  return capacityByDepartmentId;
}

export function evaluateOrderProductCandidate(input: {
  product: ProductForCandidateEvaluation;
  currentLevel: number;
  departmentCapacityById: Map<
    string,
    { dailyPointCapacity: number; lineCount: number }
  >;
  outsourceConfigsByDepartmentId: Map<string, OutsourceConfigForCandidate[]>;
}):
  | { kind: "accepted"; candidate: OrderProductCandidate }
  | { kind: "rejected"; rejected: RejectedOrderProductCandidate } {
  const {
    product,
    currentLevel,
    departmentCapacityById,
    outsourceConfigsByDepartmentId,
  } = input;

  const effectiveRequiredLevel = getEffectiveProductRequiredLevel({
    requiredPlayerLevel: product.requiredPlayerLevel,
    tier: product.tier,
  });

  if (effectiveRequiredLevel > currentLevel) {
    return rejectProduct(
      product,
      "PLAYER_LEVEL_TOO_LOW",
      `Ürün için en az LEVEL ${effectiveRequiredLevel} gerekiyor.`,
    );
  }

  if (product.baseUnitPriceCents <= 0) {
    return rejectProduct(product, "MISSING_BASE_PRICE", "Ürün için baz birim fiyat girilmemiş.");
  }

  if (product.routeSteps.length === 0) {
    return rejectProduct(product, "MISSING_ROUTE", "Ürün için üretim rotası tanımlı değil.");
  }

  if (product.allowedColors.length === 0) {
    return rejectProduct(
      product,
      "MISSING_ACTIVE_ALLOWED_COLOR",
      "Ürün için aktif izinli renk bulunmuyor.",
    );
  }

  if (
    product.offerColorCountMin < 1 ||
    product.offerColorCountMax < product.offerColorCountMin ||
    product.offerColorCountMax > product.allowedColors.length
  ) {
    return rejectProduct(
      product,
      "INVALID_COLOR_LIMITS",
      "Ürünün sipariş renk min/max ayarı aktif renk sayısıyla uyumlu değil.",
    );
  }

  const routeSteps = product.routeSteps.map((step) => {
    const departmentCapacity = departmentCapacityById.get(step.departmentId);
    const outsourceConfigs =
      outsourceConfigsByDepartmentId.get(step.departmentId) ?? [];
    const outsourceCostConfig = pickOutsourceCostConfig(outsourceConfigs);
    const departmentDailyPointCapacity =
      departmentCapacity?.dailyPointCapacity ?? 0;
    const estimatedDailyQuantity =
      step.workloadPointsPerUnit > 0
          ? Math.floor(
              departmentDailyPointCapacity / step.workloadPointsPerUnit,
            )
          : 0;
    const outsourceLeadTimeDays = outsourceConfigs.length
      ? outsourceConfigs.reduce(
          (minimum, config) => Math.min(minimum, config.leadTimeDays),
          outsourceConfigs[0].leadTimeDays,
        )
      : null;
    const outsourceUnitCostCents = outsourceCostConfig
      ? calculateOutsourceUnitCostCents({
          costMultiplierBps: outsourceCostConfig.costMultiplierBps,
          costPer1000Points:
            outsourceCostConfig.baseCostPer1000PointsCents,
          workloadPointsPerUnit: step.workloadPointsPerUnit,
        })
      : null;

    return {
      productRouteStepId: step.id,
      departmentId: step.departmentId,
      departmentKey: step.department.key,
      departmentName: getTranslatedName(
        step.department.translations,
        step.department.key,
      ),
      sequence: step.sequence,
      isRequired: step.isRequired,
      canOutsource: step.canOutsource,
      outsourceLeadTimeDays,
      outsourceUnitCostCents,
      workloadPointsPerUnit: step.workloadPointsPerUnit,
      setupPoints: step.setupPoints,
      departmentDailyPointCapacity,
      estimatedDailyQuantity,
    };
  });
  const requiredRouteSteps = routeSteps.filter((step) => step.isRequired);

  if (requiredRouteSteps.length === 0) {
    return rejectProduct(product, "MISSING_ROUTE", "Ürünün zorunlu üretim rota adımı yok.");
  }

  const missingInternalStep = requiredRouteSteps.find(
    (step) =>
      step.departmentDailyPointCapacity <= 0 &&
      (!step.canOutsource ||
        step.outsourceLeadTimeDays === null ||
        step.outsourceUnitCostCents === null),
  );

  if (missingInternalStep) {
    return rejectProduct(
      product,
      missingInternalStep.canOutsource
        ? "MISSING_OUTSOURCE_OPTION"
        : "MISSING_INTERNAL_CAPACITY",
      missingInternalStep.canOutsource
        ? `${missingInternalStep.departmentName} için aktif ve fiyatlı fason seçeneği bulunmuyor.`
        : `${missingInternalStep.departmentName} departmanı için aktif hat kapasitesi yok.`,
    );
  }

  const requiresOutsource = requiredRouteSteps.some(
    (step) => step.departmentDailyPointCapacity <= 0,
  );

  if (product.tier === "BASIC" && requiresOutsource) {
    return rejectProduct(
      product,
      "MISSING_INTERNAL_CAPACITY",
      "BASIC ürün teklifleri zorunlu fason adımı olmadan tamamen iç üretim kapasitesiyle hazırlanır.",
    );
  }

  const internalRequiredSteps = requiredRouteSteps.filter(
    (step) => step.departmentDailyPointCapacity > 0,
  );

  if (internalRequiredSteps.length === 0) {
    return rejectProduct(
      product,
      "MISSING_INTERNAL_CAPACITY",
      "Ürün için iç üretimde kullanılabilecek zorunlu departman kapasitesi yok.",
    );
  }

  const bottleneckStep = internalRequiredSteps.reduce((lowest, step) =>
    step.estimatedDailyQuantity < lowest.estimatedDailyQuantity
      ? step
      : lowest,
  );

  if (bottleneckStep.estimatedDailyQuantity <= 0) {
    return rejectProduct(
      product,
      "BOTTLENECK_ZERO_CAPACITY",
      `${bottleneckStep.departmentName} kapasitesi günlük en az 1 adet üretmeye yetmiyor.`,
    );
  }

  return {
    kind: "accepted",
    candidate: {
      productId: product.id,
      key: product.key,
      name: product.name,
      categoryKey: product.category.key,
      categoryName: getTranslatedName(
        product.category.translations,
        product.category.key,
      ),
      productTypeKey: product.productType.key,
      productTypeName: getTranslatedName(
        product.productType.translations,
        product.productType.key,
      ),
      tier: product.tier,
      gender: product.gender,
      baseUnitPriceCents: product.baseUnitPriceCents,
      requiredPlayerLevel: effectiveRequiredLevel,
      offerColorCountMin: product.offerColorCountMin,
      offerColorCountMax: product.offerColorCountMax,
      requiredPointsPerUnit: requiredRouteSteps.reduce(
        (total, step) => total + step.workloadPointsPerUnit,
        0,
      ),
      bottleneckDepartmentId: bottleneckStep.departmentId,
      bottleneckDailyQuantity: bottleneckStep.estimatedDailyQuantity,
      requiresOutsource,
      estimatedOutsourceLeadDays: requiredRouteSteps.reduce(
        (total, step) =>
          total +
          (step.departmentDailyPointCapacity <= 0
            ? (step.outsourceLeadTimeDays ?? 0)
            : 0),
        0,
      ),
      estimatedOutsourceUnitCostCents: requiredRouteSteps.reduce(
        (total, step) =>
          total +
          (step.departmentDailyPointCapacity <= 0
            ? (step.outsourceUnitCostCents ?? 0)
            : 0),
        0,
      ),
      colors: product.allowedColors.map((allowedColor) => ({
        productAllowedColorId: allowedColor.id,
        colorVariantId: allowedColor.colorVariantId,
        key: allowedColor.colorVariant.key,
        name: getTranslatedName(
          allowedColor.colorVariant.translations,
          allowedColor.colorVariant.key,
        ),
        hexCode: allowedColor.colorVariant.hexCode,
        selectionWeightBps: allowedColor.selectionWeightBps,
        sortOrder: allowedColor.sortOrder,
        isDefault: allowedColor.isDefault,
      })),
      routeSteps,
    },
  };
}

async function fetchProductsForFactorySector(sectorId: string) {
  const prisma = getPrisma();

  return prisma.product.findMany({
    where: {
      sectorId,
      status: ContentStatus.ACTIVE,
    },
    orderBy: [{ requiredPlayerLevel: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      category: {
        include: {
          translations: true,
        },
      },
      productType: {
        include: {
          translations: true,
        },
      },
      routeSteps: {
        orderBy: {
          sequence: "asc",
        },
        include: {
          department: {
            include: {
              translations: true,
            },
          },
        },
      },
      allowedColors: {
        where: {
          isActive: true,
          colorVariant: {
            status: ContentStatus.ACTIVE,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { colorVariant: { sortOrder: "asc" } }],
        include: {
          colorVariant: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
  });
}

function pickOutsourceCostConfig(configs: OutsourceConfigForCandidate[]) {
  return (
    configs.find((config) => config.optionType === "STANDARD") ??
    configs.reduce<OutsourceConfigForCandidate | null>(
      (lowest, config) =>
        !lowest || config.costMultiplierBps < lowest.costMultiplierBps
          ? config
          : lowest,
      null,
    )
  );
}

function rejectProduct(
  product: Pick<ProductForCandidateEvaluation, "id" | "key" | "name">,
  reason: RejectedOrderProductCandidateReason,
  detail: string,
) {
  return {
    kind: "rejected" as const,
    rejected: {
      productId: product.id,
      key: product.key,
      name: product.name,
      reason,
      detail,
    },
  };
}

function getTranslatedName(translations: TranslationLike[], fallback: string) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations[0]?.name ??
    fallback
  );
}

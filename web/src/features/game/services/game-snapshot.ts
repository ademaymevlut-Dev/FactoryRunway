import {
  ContentStatus,
  CustomerOrderStatus,
  DepartmentKind,
  FactoryProductionLineStatus,
  LeasingContractStatus,
  ProductionLineAssetVariant,
  ProductionOrderStatus,
  RouteProcessingMode,
  RouteProgressStatus,
  StaffAssignmentStatus,
  type DepartmentKind as DepartmentKindType,
  type FactoryProductionLineStatus as FactoryProductionLineStatusType,
  type LineAcquisitionType as LineAcquisitionTypeType,
  type ProductionGrade,
  type RouteProgressStatus as RouteProgressStatusType,
} from "@/generated/prisma/enums";
import { getOrderMarketView } from "@/features/orders/services/order-market-view";
import {
  PRODUCT_TIER_LABELS,
  PRODUCT_TIER_MIN_LEVEL,
  PRODUCT_TIER_ORDER,
} from "@/features/orders/product-tier-rules";
import { getProductionQueuesView } from "@/features/production-queue/services/department-queue-view";
import { getWarehouseView } from "@/features/warehouse/services/warehouse-view";
import { getFinancePeriod } from "@/features/finance/services/finance-period";
import { getFactoryAvailableBalance } from "@/features/finance/services/finance-ledger";
import { getPrisma } from "@/lib/db";
import {
  buildFactoryLevelProgress,
  GLOBAL_LEVEL_SCOPE_KEY,
  pickApplicableLevelConfigs,
  type PlayerLevelThreshold,
} from "@/features/game/services/factory-progression";
import type {
  ProductionLineInvestmentDepartment,
  ProductionLineInvestmentView,
} from "@/features/investment/types";
import { calculateProductionLineInvestmentPreview } from "@/features/investment/services/production-line-investment";
import { calculateProductionLineLeasingPricing } from "@/features/investment/services/production-line-leasing-pricing";
import {
  evaluateLeasingCreditCandidate,
  getLeasingCreditPolicyContext,
  type LeasingCreditPolicyContext,
} from "@/features/investment/services/leasing-credit-policy";
import { getProductionLineInstallationPreview } from "@/features/investment/services/production-line-installation-policy";
import { OPERATIONAL_PRODUCTION_LINE_STATUSES } from "@/features/investment/services/production-line-statuses";
import { buildTasksSnapshot } from "@/features/tasks/services/task-snapshot";
import {
  calculateEffectiveLinePointCapacity,
  getLineStaffCoverageBps,
} from "@/features/game/services/production-capacity";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  numberLocale,
  preferredTranslation,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import { buildFactoryLineWorkload } from "./factory-line-workload";
import { getLatestReviewableShiftPlayback } from "./shift-playback-view";
import { gameCopy } from "../game-copy";

import type {
  FactoryMapDepartment,
  FactoryMapItem,
  FactoryMapSection,
  GameDockBadge,
  GameDockItem,
  GameMetric,
  GameNotification,
  GameSnapshot,
} from "../types";

type TranslationRecord = {
  locale: string;
  name: string;
  description?: string | null;
};

type DepartmentRecord = {
  id: string;
  key: string;
  kind: DepartmentKindType;
  routeOrder: number;
  dockIconKey: string | null;
  supportsOutsource: boolean;
  translations: TranslationRecord[];
};

type DockDepartmentRecord = {
  id: string;
  key: string;
  kind: DepartmentKindType;
  routeOrder: number;
  dockIconKey: string | null;
  dockGroupKey: string | null;
  dockSortOrder: number | null;
  dockBadgeKey: string | null;
  translations: TranslationRecord[];
};

type DepartmentGroupRecord = {
  id: string;
  key: string;
  sortOrder: number;
  translations: TranslationRecord[];
  departments: DepartmentRecord[];
};

type RouteProgressCountRecord = {
  departmentId: string;
  status: RouteProgressStatusType;
  _count: {
    _all: number;
  };
};

type RouteProgressWorkloadRecord = {
  completedQuantity: number;
  departmentId: string;
  remainingQuantity: number;
  setupPoints: number;
  workloadPointsPerUnit: number;
};

type ProductionLineRecord = {
  acquisitionSequence: number | null;
  id: string;
  departmentId: string;
  lineNumber: number;
  customName: string | null;
  acquisitionType: LineAcquisitionTypeType;
  conditionBps: number;
  status: FactoryProductionLineStatusType;
  sortOrder: number;
  department: {
    id: string;
    key: string;
    kind: DepartmentKindType;
    departmentGroupId: string | null;
    routeOrder: number;
    dockIconKey: string | null;
    supportsOutsource: boolean;
    translations: TranslationRecord[];
  };
  productionLineTemplate: {
    id: string;
    key: string;
    grade: ProductionGrade;
    machineCount: number;
    idealStaff: number;
    dailyPointCapacity: number;
    areaM2: number;
    monthlyElectricityBaseCents: number;
    purchaseCostCents: number;
    imageUrl: string | null;
    imagePathname: string | null;
    visualAssets: Array<{
      variant: ProductionLineAssetVariant;
      url: string;
      pathname: string | null;
      width: number;
      height: number;
    }>;
    staffRequirements: Array<{
      requiredQuantity: number;
    }>;
  };
  staffAssignments: Array<{
    quantity: number;
  }>;
  leasingContracts: Array<{
    id: string;
  }>;
  installation: {
    acceleratedDays: number;
    id: string;
    originalReadyDay: number;
    readyDay: number;
    requestedDay: number;
    status: "PENDING" | "READY" | "ACTIVATED" | "CANCELLED";
    tokensSpent: number;
    rule: {
      minimumRemainingDays: number;
      tokenSkipCostPerDay: number;
    } | null;
  } | null;
};

function getTranslationLocaleFallbacks(locale: SupportedLocale) {
  return locale === "tr" ? ["tr", "en"] : ["en", "tr"];
}

export async function getGameSnapshot(input: {
  userId: string;
  displayName: string;
  locale?: SupportedLocale | string;
}): Promise<GameSnapshot | null> {
  const locale = normalizeLocale(input.locale);
  const translationLocaleFilter = { in: getTranslationLocaleFallbacks(locale) };
  const prisma = getPrisma();
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: input.userId },
    select: {
      id: true,
      factories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          name: true,
          sectorId: true,
          currencyCode: true,
          cashBalanceCents: true,
          currentDay: true,
          currentFinancePeriod: true,
          currentLevel: true,
          currentXp: true,
          operatingStageState: {
            select: {
              currentStage: {
                select: {
                  id: true,
                  key: true,
                  translations: {
                    where: { locale: translationLocaleFilter },
                    select: { locale: true, name: true, description: true },
                  },
                },
              },
            },
          },
          sector: {
            select: {
              key: true,
              translations: {
                where: { locale: translationLocaleFilter },
                select: { locale: true, name: true, description: true },
              },
            },
          },
          productionLines: {
            where: {
              department: {
                kind: DepartmentKind.PRODUCTION,
              },
              status: {
                not: FactoryProductionLineStatus.SOLD,
              },
            },
            orderBy: [{ sortOrder: "asc" }, { lineNumber: "asc" }],
            select: {
              id: true,
              acquisitionSequence: true,
              departmentId: true,
              lineNumber: true,
              customName: true,
              acquisitionType: true,
              conditionBps: true,
              status: true,
              sortOrder: true,
              department: {
                select: {
                  id: true,
                  key: true,
                  kind: true,
                  departmentGroupId: true,
                  routeOrder: true,
                  dockIconKey: true,
                  supportsOutsource: true,
                  translations: {
                    where: { locale: translationLocaleFilter },
                    select: { locale: true, name: true, description: true },
                  },
                },
              },
              productionLineTemplate: {
                select: {
                  id: true,
                  key: true,
                  grade: true,
                  machineCount: true,
                  idealStaff: true,
                  dailyPointCapacity: true,
                  areaM2: true,
                  monthlyElectricityBaseCents: true,
                  purchaseCostCents: true,
                  imageUrl: true,
                  imagePathname: true,
                  visualAssets: {
                    orderBy: { variant: "asc" },
                    select: {
                      height: true,
                      pathname: true,
                      url: true,
                      variant: true,
                      width: true,
                    },
                  },
                  staffRequirements: {
                    select: { requiredQuantity: true },
                  },
                },
              },
              staffAssignments: {
                where: { status: StaffAssignmentStatus.ACTIVE },
                select: { quantity: true },
              },
              installation: {
                select: {
                  acceleratedDays: true,
                  id: true,
                  originalReadyDay: true,
                  readyDay: true,
                  requestedDay: true,
                  status: true,
                  tokensSpent: true,
                  rule: {
                    select: {
                      minimumRemainingDays: true,
                      tokenSkipCostPerDay: true,
                    },
                  },
                },
              },
              leasingContracts: {
                where: {
                  status: {
                    in: [
                      LeasingContractStatus.PENDING_ACTIVATION,
                      LeasingContractStatus.ACTIVE,
                    ],
                  },
                },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  const factory = playerProfile?.factories[0];

  if (!playerProfile || !factory) {
    return null;
  }

  const [
    departmentGroups,
    dockDepartments,
    routeProgressCounts,
    routeProgressWorkloads,
    readyToShipOrderCount,
    activeOrderCount,
    lateOrderCount,
    activeProductionOrderCount,
    orderMarket,
    warehouse,
    productionQueues,
    activeShiftPlayback,
    investmentTemplates,
    investmentCostConfig,
    investmentStages,
    factorySupportStaff,
    levelConfigs,
    levelUpTransactions,
    taskProgressRows,
    tokenWallet,
    installationPreview,
    leasingCreditContext,
    availableBalance,
  ] = await Promise.all([
    prisma.departmentGroup.findMany({
      where: {
        departments: {
          some: {
            kind: DepartmentKind.PRODUCTION,
            status: ContentStatus.ACTIVE,
          },
        },
        sectorId: factory.sectorId,
        status: ContentStatus.ACTIVE,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        key: true,
        sortOrder: true,
        translations: {
          where: { locale: translationLocaleFilter },
          select: { locale: true, name: true, description: true },
        },
        departments: {
          where: {
            kind: DepartmentKind.PRODUCTION,
            status: ContentStatus.ACTIVE,
          },
          orderBy: { routeOrder: "asc" },
          select: {
            id: true,
            key: true,
            kind: true,
            routeOrder: true,
            dockIconKey: true,
            supportsOutsource: true,
            translations: {
              where: { locale: translationLocaleFilter },
              select: { locale: true, name: true, description: true },
            },
          },
        },
      },
    }),
    prisma.department.findMany({
      where: {
        sectorId: factory.sectorId,
        showInDock: true,
        status: ContentStatus.ACTIVE,
      },
      orderBy: [
        { dockSortOrder: "asc" },
        { routeOrder: "asc" },
        { key: "asc" },
      ],
      select: {
        id: true,
        key: true,
        kind: true,
        routeOrder: true,
        dockIconKey: true,
        dockGroupKey: true,
        dockSortOrder: true,
        dockBadgeKey: true,
        translations: {
          where: { locale: translationLocaleFilter },
          select: { locale: true, name: true, description: true },
        },
      },
    }),
    prisma.productionOrderRouteProgress.groupBy({
      by: ["departmentId", "status"],
      where: {
        factoryId: factory.id,
        status: {
          in: [
            RouteProgressStatus.WAITING_INPUT,
            RouteProgressStatus.READY,
            RouteProgressStatus.IN_PROGRESS,
            RouteProgressStatus.WAITING_OUTSOURCE,
            RouteProgressStatus.BLOCKED,
          ],
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.productionOrderRouteProgress.findMany({
      where: {
        factoryId: factory.id,
        processingMode: RouteProcessingMode.INTERNAL,
        remainingQuantity: { gt: 0 },
        status: {
          in: [
            RouteProgressStatus.WAITING_INPUT,
            RouteProgressStatus.READY,
            RouteProgressStatus.IN_PROGRESS,
            RouteProgressStatus.WAITING_OUTSOURCE,
            RouteProgressStatus.BLOCKED,
          ],
        },
      },
      select: {
        completedQuantity: true,
        departmentId: true,
        remainingQuantity: true,
        setupPoints: true,
        workloadPointsPerUnit: true,
      },
    }),
    prisma.productionOrder.count({
      where: {
        factoryId: factory.id,
        status: ProductionOrderStatus.READY_TO_SHIP,
      },
    }),
    prisma.customerOrder.count({
      where: {
        factoryId: factory.id,
        status: {
          in: [
            CustomerOrderStatus.ACTIVE,
            CustomerOrderStatus.IN_PRODUCTION,
            CustomerOrderStatus.READY_TO_SHIP,
            CustomerOrderStatus.PARTIALLY_SHIPPED,
          ],
        },
      },
    }),
    prisma.customerOrder.count({
      where: {
        factoryId: factory.id,
        status: CustomerOrderStatus.LATE,
      },
    }),
    prisma.productionOrder.count({
      where: {
        factoryId: factory.id,
        status: {
          in: [
            ProductionOrderStatus.PLANNED,
            ProductionOrderStatus.RELEASED,
            ProductionOrderStatus.IN_PROGRESS,
            ProductionOrderStatus.WAITING_INPUT,
            ProductionOrderStatus.WAITING_OUTSOURCE,
            ProductionOrderStatus.READY_TO_SHIP,
          ],
        },
      },
    }),
    getOrderMarketView({
      currentDay: factory.currentDay,
      currentLevel: factory.currentLevel,
      currencyCode: factory.currencyCode,
      factoryId: factory.id,
      locale,
    }),
    getWarehouseView({
      currentDay: factory.currentDay,
      factoryId: factory.id,
      sectorId: factory.sectorId,
    }),
    getProductionQueuesView({
      currentDay: factory.currentDay,
      factoryId: factory.id,
      locale,
      sectorId: factory.sectorId,
    }),
    getLatestReviewableShiftPlayback({
      currentDay: factory.currentDay,
      factoryId: factory.id,
      locale,
      prisma,
    }),
    prisma.productionLineTemplate.findMany({
      where: {
        sectorId: factory.sectorId,
        status: ContentStatus.ACTIVE,
        department: {
          kind: DepartmentKind.PRODUCTION,
          status: ContentStatus.ACTIVE,
        },
      },
      orderBy: [
        { department: { routeOrder: "asc" } },
        { sortOrder: "asc" },
        { grade: "asc" },
      ],
      select: {
        id: true,
        departmentId: true,
        key: true,
        grade: true,
        machineCount: true,
        idealStaff: true,
        dailyPointCapacity: true,
        areaM2: true,
        monthlyElectricityBaseCents: true,
        purchaseCostCents: true,
        imageUrl: true,
        imagePathname: true,
        department: {
          select: {
            id: true,
            key: true,
            departmentGroupId: true,
            monthlyOverheadPerLineCents: true,
            translations: {
              where: { locale: translationLocaleFilter },
              select: { locale: true, name: true, description: true },
            },
          },
        },
        visualAssets: {
          where: {
            variant: {
              in: [
                ProductionLineAssetVariant.CARD,
                ProductionLineAssetVariant.DETAIL,
                ProductionLineAssetVariant.MAP,
                ProductionLineAssetVariant.THUMBNAIL,
              ],
            },
          },
          select: {
            height: true,
            pathname: true,
            url: true,
            variant: true,
            width: true,
          },
        },
        leasingOffers: {
          where: { status: ContentStatus.ACTIVE },
          orderBy: [{ sortOrder: "asc" }, { termYears: "asc" }],
          select: {
            id: true,
            termYears: true,
            installmentCount: true,
            downPaymentCents: true,
            installmentAmountCents: true,
            totalCostCents: true,
          },
        },
        staffRequirements: {
          orderBy: { sortOrder: "asc" },
          select: {
            requiredQuantity: true,
            staffRole: {
              select: {
                id: true,
                key: true,
                monthlySalaryCents: true,
                translations: {
                  where: { locale: translationLocaleFilter },
                  select: { locale: true, name: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.sectorOperatingCostConfig.findUniqueOrThrow({
      where: { sectorId: factory.sectorId },
      select: {
        dailyMealPerDirectStaffCents: true,
        directStaffOverheadPerStaffCents: true,
        monthlyWorkDays: true,
        rentPerM2Cents: true,
      },
    }),
    prisma.sectorFactoryOperatingStage.findMany({
      where: {
        sectorId: factory.sectorId,
        status: ContentStatus.ACTIVE,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        key: true,
        sortOrder: true,
        minProductionLines: true,
        maxProductionLines: true,
        dailySupportMealPerStaffCents: true,
        supportOverheadPerStaffCents: true,
        translations: {
          where: { locale: translationLocaleFilter },
          select: { locale: true, name: true },
        },
        staffRequirements: {
          orderBy: { sortOrder: "asc" },
          select: {
            requiredQuantity: true,
            staffRole: {
              select: {
                id: true,
                key: true,
                monthlySalaryCents: true,
                translations: {
                  where: { locale: translationLocaleFilter },
                  select: { locale: true, name: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.factoryStaffAssignment.findMany({
      where: {
        factoryId: factory.id,
        factoryProductionLineId: null,
        status: StaffAssignmentStatus.ACTIVE,
      },
      select: { quantity: true, staffRoleId: true },
    }),
    prisma.playerLevelConfig.findMany({
      where: {
        scopeKey: { in: [factory.sectorId, GLOBAL_LEVEL_SCOPE_KEY] },
        status: ContentStatus.ACTIVE,
      },
      orderBy: [{ level: "asc" }, { requiredXp: "asc" }],
      select: {
        level: true,
        requiredXp: true,
        scopeKey: true,
        unlockKey: true,
      },
    }),
    prisma.factoryXpTransaction.findMany({
      where: {
        factoryId: factory.id,
        gameDay: factory.currentDay,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { metadata: true },
    }),
    prisma.factoryTaskProgress.findMany({
      where: { factoryId: factory.id },
      orderBy: { taskDefinition: { sortOrder: "asc" } },
      select: {
        completedDay: true,
        currentValue: true,
        id: true,
        rewardSnapshot: true,
        status: true,
        targetValue: true,
        taskDefinition: {
          select: {
            key: true,
            objectiveType: true,
            rewardCashCents: true,
            rewardRunwayTokens: true,
            rewardXp: true,
            sortOrder: true,
            taskType: true,
            translations: {
              where: { locale: translationLocaleFilter },
              select: {
                completionMessage: true,
                description: true,
                locale: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    prisma.playerTokenWallet.findUnique({
      where: { playerProfileId: playerProfile.id },
      select: { balance: true },
    }),
    getProductionLineInstallationPreview({
      factoryId: factory.id,
      prisma,
      requestedDay: factory.currentDay,
      sectorId: factory.sectorId,
    }),
    getLeasingCreditPolicyContext({
      factoryId: factory.id,
      prisma,
    }),
    getFactoryAvailableBalance({
      currentDay: factory.currentDay,
      factoryId: factory.id,
      tx: prisma,
    }),
  ]);

  const sections = buildFactoryMapSections({
    currentDay: factory.currentDay,
    departmentGroups,
    locale,
    productionLines: factory.productionLines,
    workloadByDepartmentId: buildWorkloadByDepartmentId({
      locale,
      productionLines: factory.productionLines,
      routeProgressWorkloads,
    }),
  });
  const totals = getMapTotals(sections);
  const operatingStageName = pickTranslation(
    factory.operatingStageState?.currentStage.translations ?? [],
    factory.operatingStageState?.currentStage.key ?? "stage",
    locale,
  );
  const applicableLevelConfigs = pickApplicableLevelConfigs(
    levelConfigs as PlayerLevelThreshold[],
    factory.sectorId,
  );
  const levelProgress = buildFactoryLevelProgress({
    configs: applicableLevelConfigs,
    currentLevel: factory.currentLevel,
    currentXp: factory.currentXp,
  });
  const dockItems = buildDockItems({
    departments: dockDepartments,
    locale,
    readyToShipOrderCount,
    routeProgressCounts,
    warehouseInboundCount: warehouse.summary.inboundTotal,
  });
  const tasks = buildTasksSnapshot({
    locale,
    progressRows: taskProgressRows,
    tokenBalance: tokenWallet?.balance ?? 0,
  });
  const investment = buildProductionLineInvestmentView({
    activeProductionLineCount: factory.productionLines.filter(
      (line) =>
        OPERATIONAL_PRODUCTION_LINE_STATUSES.includes(
          line.status as (typeof OPERATIONAL_PRODUCTION_LINE_STATUSES)[number],
        ),
    ).length,
    costConfig: investmentCostConfig,
    currentStageId: factory.operatingStageState?.currentStage.id ?? null,
    currencyCode: factory.currencyCode,
    locale,
    installationPreview: {
      acquisitionSequence: installationPreview.acquisitionSequence,
      concurrentSlot: installationPreview.concurrentSlot,
      delayDays: installationPreview.delayDays,
      maxConcurrentInstalls:
        installationPreview.rule.maxConcurrentInstalls,
      minimumRemainingDays:
        installationPreview.rule.minimumRemainingDays,
      readyDay: installationPreview.readyDay,
      requestedDay: factory.currentDay,
      tokenSkipCostPerDay:
        installationPreview.rule.tokenSkipCostPerDay,
    },
    leasingCreditContext,
    stages: investmentStages,
    supportStaffByRoleId: new Map(
      factorySupportStaff.map((assignment) => [
        assignment.staffRoleId,
        assignment.quantity,
      ]),
    ),
    templates: investmentTemplates,
  });
  return {
    locale,
    numberLocale: numberLocale(locale),
    player: {
      id: playerProfile.id,
      displayName: input.displayName,
    },
    factory: {
      id: factory.id,
      name: factory.name,
      sectorName: pickTranslation(factory.sector.translations, factory.sector.key, locale),
      currencyCode: factory.currencyCode,
      cashBalanceCents: factory.cashBalanceCents.toString(),
      availableBalanceCents:
        availableBalance.availableBalanceCents.toString(),
      currentDay: factory.currentDay,
      currentFinancePeriod: factory.currentFinancePeriod,
      currentLevel: factory.currentLevel,
      currentXp: factory.currentXp,
      runwayTokenBalance: tokenWallet?.balance ?? 0,
      levelProgress,
      operatingStageKey:
        factory.operatingStageState?.currentStage.key ?? "mass_factory",
      operatingStageName,
    },
    metrics: buildMetrics({
      activeOrderCount,
      activeProductionOrderCount,
      factory: {
        ...factory,
        availableBalanceCents: availableBalance.availableBalanceCents,
        levelProgress,
        operatingStageName,
        runwayTokenBalance: tokenWallet?.balance ?? 0,
      },
      lateOrderCount,
      locale,
    }),
    tasks,
    notifications: buildNotifications({
      activeProductionOrderCount,
      lateOrderCount,
      levelUpTransactions,
      locale,
    }),
    activeShiftPlayback,
    dock: {
      badges: buildLeftDockBadges({
        availableOrderCount: orderMarket.availableCount,
        locale,
        tasks,
      }),
      items: dockItems,
    },
    orders: orderMarket,
    warehouse,
    productionQueues,
    investment,
    map: {
      sections,
      totals,
    },
  };
}

function buildProductionLineInvestmentView(input: {
  activeProductionLineCount: number;
  costConfig: Parameters<typeof calculateProductionLineInvestmentPreview>[0]["costConfig"];
  currentStageId: string | null;
  currencyCode: GameSnapshot["factory"]["currencyCode"];
  installationPreview: ProductionLineInvestmentView["departments"][number]["templates"][number]["installation"];
  leasingCreditContext: LeasingCreditPolicyContext;
  locale: SupportedLocale;
  stages: Parameters<typeof calculateProductionLineInvestmentPreview>[0]["stages"];
  supportStaffByRoleId: ReadonlyMap<string, number>;
  templates: Array<{
    id: string;
    departmentId: string;
    key: string;
    grade: ProductionGrade;
    machineCount: number;
    idealStaff: number;
    dailyPointCapacity: number;
    areaM2: number;
    monthlyElectricityBaseCents: number;
    purchaseCostCents: number;
    imageUrl: string | null;
    imagePathname: string | null;
    visualAssets: Array<{
      height: number;
      pathname: string | null;
      url: string;
      variant: ProductionLineAssetVariant;
      width: number;
    }>;
    leasingOffers: Array<{
      id: string;
      termYears: number;
      installmentCount: number;
      downPaymentCents: number;
      installmentAmountCents: number;
      totalCostCents: number;
    }>;
    staffRequirements: Parameters<typeof calculateProductionLineInvestmentPreview>[0]["template"]["staffRequirements"];
    department: {
      id: string;
      key: string;
      departmentGroupId: string | null;
      monthlyOverheadPerLineCents: number;
      translations: TranslationRecord[];
    };
  }>;
}): ProductionLineInvestmentView {
  const departments = new Map<string, ProductionLineInvestmentDepartment>();

  for (const template of input.templates) {
    const department = departments.get(template.departmentId) ?? {
      departmentGroupId: template.department.departmentGroupId,
      id: template.department.id,
      key: template.department.key,
      name: pickTranslation(
        template.department.translations,
        template.department.key,
        input.locale,
      ),
      templates: [],
    };

    department.templates.push({
      areaM2: template.areaM2,
      dailyPointCapacity: template.dailyPointCapacity,
      departmentId: template.departmentId,
      grade: template.grade,
      id: template.id,
      idealStaff: template.idealStaff,
      imageUrl: getInvestmentTemplateImageUrl(template),
      detailImageUrl: getInvestmentTemplateDetailImageUrl(template),
      key: template.key,
      installation: input.installationPreview,
      leasingOffers: template.leasingOffers.map((offer) => {
        const pricing = calculateProductionLineLeasingPricing({
          installmentCount: offer.installmentCount,
          purchaseCostCents: template.purchaseCostCents,
          termYears: offer.termYears,
        });

        return {
          id: offer.id,
          termYears: pricing.termYears,
          installmentCount: pricing.installmentCount,
          downPaymentCents: String(pricing.downPaymentCents),
          installmentAmountCents: String(pricing.installmentAmountCents),
          totalCostCents: String(pricing.totalCostCents),
          creditDecision: evaluateLeasingCreditCandidate({
            candidateCyclePaymentCents: BigInt(
              pricing.installmentAmountCents,
            ),
            candidateExposureCents:
              BigInt(pricing.installmentAmountCents) *
              BigInt(pricing.installmentCount),
            context: input.leasingCreditContext,
            downPaymentCents: BigInt(pricing.downPaymentCents),
          }),
        };
      }),
      machineCount: template.machineCount,
      monthlyElectricityBaseCents: template.monthlyElectricityBaseCents,
      purchaseCostCents: String(template.purchaseCostCents),
      preview: calculateProductionLineInvestmentPreview({
        activeProductionLineCount: input.activeProductionLineCount,
        costConfig: input.costConfig,
        currentStageId: input.currentStageId,
        locale: input.locale,
        stages: input.stages,
        supportStaffByRoleId: input.supportStaffByRoleId,
        template,
      }),
    });
    departments.set(template.departmentId, department);
  }

  return {
    currencyCode: input.currencyCode,
    departments: Array.from(departments.values()),
  };
}

type InvestmentTemplateImageSource = {
  department: { key: string };
  grade: ProductionGrade;
  imagePathname: string | null;
  imageUrl: string | null;
  visualAssets: Array<{
    height: number;
    pathname: string | null;
    url: string;
    variant: ProductionLineAssetVariant;
    width: number;
  }>;
};

function getInvestmentTemplateImageUrl(template: InvestmentTemplateImageSource) {
  const visual =
    template.visualAssets.find(
      (asset) => asset.variant === ProductionLineAssetVariant.CARD,
    ) ??
    template.visualAssets.find(
      (asset) => asset.variant === ProductionLineAssetVariant.MAP,
    ) ??
    template.visualAssets.find(
      (asset) => asset.variant === ProductionLineAssetVariant.THUMBNAIL,
    );

  return (
    visual?.url ??
    visual?.pathname ??
    template.imageUrl ??
    template.imagePathname ??
    getFallbackLineImage(template.department.key, template.grade)
  );
}

function getInvestmentTemplateDetailImageUrl(
  template: InvestmentTemplateImageSource,
) {
  const detailVisual = template.visualAssets.find(
    (asset) => asset.variant === ProductionLineAssetVariant.DETAIL,
  );
  const largestVisual = template.visualAssets
    .slice()
    .sort(
      (first, second) =>
        second.width * second.height - first.width * first.height,
    )[0];
  const visual = detailVisual ?? largestVisual;

  return (
    visual?.url ??
    visual?.pathname ??
    template.imageUrl ??
    template.imagePathname ??
    getFallbackLineImage(template.department.key, template.grade)
  );
}

function buildDockItems({
  departments,
  locale,
  readyToShipOrderCount,
  routeProgressCounts,
  warehouseInboundCount,
}: {
  departments: DockDepartmentRecord[];
  locale: SupportedLocale;
  readyToShipOrderCount: number;
  routeProgressCounts: RouteProgressCountRecord[];
  warehouseInboundCount: number;
}): GameDockItem[] {
  const routeCountsByDepartmentId = buildRouteCountsByDepartmentId(routeProgressCounts);
  const groupedDepartments = new Map<string, DockDepartmentRecord[]>();

  for (const department of departments) {
    const groupKey = department.dockGroupKey ?? department.key;
    const current = groupedDepartments.get(groupKey) ?? [];

    current.push(department);
    groupedDepartments.set(groupKey, current);
  }

  return Array.from(groupedDepartments.entries())
    .map(([groupKey, groupDepartments]) => {
      const sortedDepartments = groupDepartments.sort(
        (first, second) => first.routeOrder - second.routeOrder || first.key.localeCompare(second.key),
      );
      const firstDepartment = sortedDepartments[0];

      if (!firstDepartment) return null;

      const badgeKey = firstDepartment.dockBadgeKey ?? getDefaultDockBadgeKey(groupKey, firstDepartment);
      const iconKey = normalizeDockIconKey(
        firstDepartment.dockIconKey ?? getDefaultDockIconKey(groupKey, firstDepartment.key),
      );

      return {
        id: `dock:${groupKey}`,
        label: getDockLabel(groupKey, sortedDepartments, locale),
        iconKey,
        departmentIds: sortedDepartments.map((department) => department.id),
        departmentKeys: sortedDepartments.map((department) => department.key),
        kind: firstDepartment.kind,
        sortOrder: firstDepartment.dockSortOrder ?? firstDepartment.routeOrder,
        badge: buildDockBadge({
          badgeKey,
          departments: sortedDepartments,
          groupKey,
          locale,
          readyToShipOrderCount,
          routeCountsByDepartmentId,
          warehouseInboundCount,
        }),
      } satisfies GameDockItem;
    })
    .filter((item): item is GameDockItem => item !== null)
    .sort((first, second) => first.sortOrder - second.sortOrder || first.label.localeCompare(second.label));
}

function buildLeftDockBadges(input: {
  availableOrderCount: number;
  locale: SupportedLocale;
  tasks: GameSnapshot["tasks"];
}): GameSnapshot["dock"]["badges"] {
  const badges: GameSnapshot["dock"]["badges"] = {};
  const copy = gameCopy[input.locale].snapshot.badges;

  if (input.availableOrderCount > 0) {
    badges.orders = {
      count: input.availableOrderCount,
      label: copy.newOrder,
      tone: "danger",
    };
  }

  if (input.tasks.summary.completedUnclaimedCount > 0) {
    badges.tasks = {
      count: input.tasks.summary.completedUnclaimedCount,
      icon: "check",
      label: copy.rewardWaiting,
      tone: "success",
    };
  } else if (input.tasks.summary.activeCount > 0) {
    badges.tasks = {
      count: input.tasks.summary.activeCount,
      label: copy.activeTask,
      tone: "info",
    };
  }

  return badges;
}

function buildRouteCountsByDepartmentId(routeProgressCounts: RouteProgressCountRecord[]) {
  const counts = new Map<string, Partial<Record<RouteProgressStatusType, number>>>();

  for (const count of routeProgressCounts) {
    const current = counts.get(count.departmentId) ?? {};

    current[count.status] = count._count._all;
    counts.set(count.departmentId, current);
  }

  return counts;
}

function buildDockBadge({
  badgeKey,
  departments,
  groupKey,
  locale,
  readyToShipOrderCount,
  routeCountsByDepartmentId,
  warehouseInboundCount,
}: {
  badgeKey: string;
  departments: DockDepartmentRecord[];
  groupKey: string;
  locale: SupportedLocale;
  readyToShipOrderCount: number;
  routeCountsByDepartmentId: Map<string, Partial<Record<RouteProgressStatusType, number>>>;
  warehouseInboundCount: number;
}): GameDockBadge | null {
  const copy = gameCopy[locale].snapshot.badges;

  if (badgeKey === "READY_TO_SHIP") {
    return readyToShipOrderCount > 0
      ? {
          count: readyToShipOrderCount,
          label: copy.shippingReady,
          tone: "success",
        }
      : null;
  }

  const count = departments.reduce(
    (total, department) => total + getRouteQueueCount(routeCountsByDepartmentId.get(department.id)),
    0,
  );

  if (badgeKey === "MATERIAL_MISSING" && groupKey === "warehouse") {
    return warehouseInboundCount > 0
      ? {
          count: warehouseInboundCount,
          label: copy.warehouseInbound,
          tone: "warning",
        }
      : null;
  }

  if (count <= 0) return null;

  if (badgeKey === "BOTTLENECK") {
    return {
      count,
      label: copy.queueBottleneck,
      tone: "warning",
    };
  }

  if (badgeKey === "MATERIAL_MISSING") {
    return {
      count,
      label: copy.materialMissing,
      tone: "danger",
    };
  }

  return {
    count,
    label: copy.pendingTask,
    tone: "info",
  };
}

function getRouteQueueCount(counts: Partial<Record<RouteProgressStatusType, number>> | undefined) {
  if (!counts) return 0;

  return (
    (counts.WAITING_INPUT ?? 0) +
    (counts.READY ?? 0) +
    (counts.IN_PROGRESS ?? 0) +
    (counts.WAITING_OUTSOURCE ?? 0) +
    (counts.BLOCKED ?? 0)
  );
}

function getDockLabel(
  groupKey: string,
  departments: DockDepartmentRecord[],
  locale: SupportedLocale,
): string {
  const labels = gameCopy[locale].snapshot.dockLabels;

  return labels[groupKey as keyof typeof labels] ?? pickTranslation(
    departments[0]?.translations ?? [],
    departments[0]?.key ?? groupKey,
    locale,
  );
}

function normalizeDockIconKey(iconKey: string) {
  return iconKey.trim().toLocaleLowerCase("en-US").replace(/-/g, "_");
}

function getDefaultDockIconKey(groupKey: string, departmentKey: string) {
  const iconKeys: Record<string, string> = {
    accessory_warehouse: "warehouse",
    cutting: "scissors",
    dyeing: "paint_bucket",
    embroidery: "needle",
    fabric_warehouse: "warehouse",
    ironing_packing: "package_check",
    printing: "printer",
    product_warehouse: "warehouse",
    sewing: "shirt",
    shipping: "truck",
    warehouse: "warehouse",
    washing: "waves",
  };

  return iconKeys[groupKey] ?? iconKeys[departmentKey] ?? "warehouse";
}

function getDefaultDockBadgeKey(groupKey: string, department: DockDepartmentRecord) {
  if (groupKey === "shipping") return "READY_TO_SHIP";
  if (groupKey === "warehouse" || department.kind === DepartmentKind.WAREHOUSE) return "MATERIAL_MISSING";
  if (department.key === "sewing") return "BOTTLENECK";
  if (department.key === "ironing_packing") return "PACKING_WAITING";

  return "QUEUE_WAITING";
}

function buildFactoryMapSections({
  currentDay,
  departmentGroups,
  locale,
  productionLines,
  workloadByDepartmentId,
}: {
  currentDay: number;
  departmentGroups: DepartmentGroupRecord[];
  locale: SupportedLocale;
  productionLines: ProductionLineRecord[];
  workloadByDepartmentId: ReadonlyMap<string, FactoryMapItemWorkload>;
}) {
  const linesByGroupId = new Map<string, ProductionLineRecord[]>();
  const orphanLinesByDepartmentId = new Map<string, ProductionLineRecord[]>();
  const productionGroups = departmentGroups
    .map((group) => ({
      ...group,
      departments: group.departments.filter((department) => department.kind === DepartmentKind.PRODUCTION),
    }))
    .filter((group) => group.departments.length > 0);
  const knownGroupIds = new Set(productionGroups.map((group) => group.id));

  for (const line of productionLines) {
    const groupId = line.department.departmentGroupId;

    if (!groupId || !knownGroupIds.has(groupId)) {
      const current = orphanLinesByDepartmentId.get(line.departmentId) ?? [];
      current.push(line);
      orphanLinesByDepartmentId.set(line.departmentId, current);
      continue;
    }

    const current = linesByGroupId.get(groupId) ?? [];
    current.push(line);
    linesByGroupId.set(groupId, current);
  }

  const sections: FactoryMapSection[] = [];

  for (const group of productionGroups) {
    const lines = linesByGroupId.get(group.id) ?? [];

    if (lines.length === 0) {
      continue;
    }

    const visibleDepartmentIds = new Set(lines.map((line) => line.departmentId));
    const visibleDepartments = getOwnedLineDepartments(group.departments, lines, visibleDepartmentIds);

    if (visibleDepartments.length === 0) {
      continue;
    }

    const departments = visibleDepartments.map((department) =>
      toMapDepartment(department, locale),
    );
    const groupTitle = pickTranslation(group.translations, group.key, locale);
    const items = buildSectionItems({
      currentDay,
      departmentIds: departments.map((department) => department.id),
      groupId: group.id,
      groupTitle,
      locale,
      lines,
      workloadByDepartmentId,
    });

    sections.push({
      id: group.id,
      key: group.key,
      step: String(sections.length + 1).padStart(2, "0"),
      title: groupTitle,
      tone: getSectionTone(group.key, sections.length),
      departments,
      items,
      productionLineCount: lines.length,
      departmentCount: departments.length,
    });
  }

  for (const [departmentId, lines] of orphanLinesByDepartmentId) {
    const firstLine = lines[0];

    if (!firstLine) continue;

    const departmentName = pickTranslation(
      firstLine.department.translations,
      firstLine.department.key,
      locale,
    );
    const syntheticGroup: DepartmentGroupRecord = {
      id: `department:${departmentId}`,
      key: firstLine.department.key,
      sortOrder: sections.length + 1,
      translations: [{ locale, name: departmentName }],
      departments: [
        {
          id: firstLine.department.id,
          key: firstLine.department.key,
          kind: firstLine.department.kind,
          routeOrder: firstLine.department.routeOrder,
          dockIconKey: firstLine.department.dockIconKey,
          supportsOutsource: firstLine.department.supportsOutsource,
          translations: firstLine.department.translations,
        },
      ],
    };
    const items = buildSectionItems({
      currentDay,
      departmentIds: [firstLine.department.id],
      groupId: syntheticGroup.id,
      groupTitle: departmentName,
      locale,
      lines,
      workloadByDepartmentId,
    });

    sections.push({
      id: syntheticGroup.id,
      key: syntheticGroup.key,
      step: String(sections.length + 1).padStart(2, "0"),
      title: departmentName,
      tone: getSectionTone(syntheticGroup.key, sections.length),
      departments: syntheticGroup.departments.map((department) =>
        toMapDepartment(department, locale),
      ),
      items,
      productionLineCount: lines.length,
      departmentCount: syntheticGroup.departments.length,
    });
  }

  return sections;
}

function getOwnedLineDepartments(
  groupDepartments: DepartmentRecord[],
  lines: ProductionLineRecord[],
  visibleDepartmentIds: Set<string>,
) {
  const departmentsById = new Map(
    groupDepartments
      .filter((department) => visibleDepartmentIds.has(department.id))
      .map((department) => [department.id, department]),
  );

  for (const line of lines) {
    if (departmentsById.has(line.department.id)) {
      continue;
    }

    departmentsById.set(line.department.id, {
      id: line.department.id,
      key: line.department.key,
      kind: line.department.kind,
      routeOrder: line.department.routeOrder,
      dockIconKey: line.department.dockIconKey,
      supportsOutsource: line.department.supportsOutsource,
      translations: line.department.translations,
    });
  }

  return Array.from(departmentsById.values()).sort(
    (first, second) => first.routeOrder - second.routeOrder || first.key.localeCompare(second.key),
  );
}

function buildSectionItems({
  currentDay,
  departmentIds,
  groupId,
  groupTitle,
  locale,
  lines,
  workloadByDepartmentId,
}: {
  currentDay: number;
  departmentIds: string[];
  groupId: string;
  groupTitle: string;
  locale: SupportedLocale;
  lines: ProductionLineRecord[];
  workloadByDepartmentId: ReadonlyMap<string, FactoryMapItemWorkload>;
}) {
  const items: FactoryMapItem[] = lines
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder || first.lineNumber - second.lineNumber)
    .map((line) =>
      toProductionLineItem(
        line,
        workloadByDepartmentId,
        locale,
        currentDay,
      ),
    );

  if (items.length > 0) {
    const copy = gameCopy[locale].snapshot.investmentAction;

    items.push({
      kind: "investmentAction",
      id: `investment:${groupId}`,
      sectionId: groupId,
      departmentIds,
      title: copy.title,
      subtitle: copy.subtitle(groupTitle),
    });
  }

  return items;
}

function toMapDepartment(
  department: DepartmentRecord,
  locale: SupportedLocale,
): FactoryMapDepartment {
  return {
    id: department.id,
    key: department.key,
    iconKey: normalizeDockIconKey(department.dockIconKey ?? getDefaultDockIconKey(department.key, department.key)),
    name: pickTranslation(department.translations, department.key, locale),
    kind: department.kind,
    routeOrder: department.routeOrder,
    supportsOutsource: department.supportsOutsource,
  };
}

type FactoryMapItemWorkload = Extract<
  FactoryMapItem,
  { kind: "productionLine" }
>["workload"];

function toProductionLineItem(
  line: ProductionLineRecord,
  workloadByDepartmentId: ReadonlyMap<string, FactoryMapItemWorkload>,
  locale: SupportedLocale,
  currentDay: number,
): FactoryMapItem {
  const departmentName = pickTranslation(
    line.department.translations,
    line.department.key,
    locale,
  );
  const template = line.productionLineTemplate;
  const assignedStaff = line.staffAssignments.reduce(
    (total, assignment) => total + assignment.quantity,
    0,
  );

  return {
    kind: "productionLine",
    id: `line:${line.id}`,
    lineId: line.id,
    departmentId: line.departmentId,
    departmentKey: line.department.key,
    departmentName,
    code: `${getDepartmentCode(line.department.key)}-${String(line.lineNumber).padStart(2, "0")}`,
    title: line.customName ??
      gameCopy[locale].snapshot.lineTitle(departmentName, line.lineNumber),
    subtitle: formatGrade(template.grade),
    acquisitionType: line.acquisitionType,
    acquisitionSequence: line.acquisitionSequence,
    status: line.status,
    grade: template.grade,
    productionLineTemplateId: template.id,
    lineNumber: line.lineNumber,
    sortOrder: line.sortOrder,
    conditionBps: line.conditionBps,
    dailyPointCapacity: template.dailyPointCapacity,
    idealStaff: template.idealStaff,
    assignedStaff,
    machineCount: template.machineCount,
    areaM2: template.areaM2,
    monthlyElectricityBaseCents: template.monthlyElectricityBaseCents,
    purchaseCostCents: String(template.purchaseCostCents),
    hasActiveLeasingContract: line.leasingContracts.length > 0,
    installation: line.installation
      ? {
          acceleratedDays: line.installation.acceleratedDays,
          id: line.installation.id,
          minimumRemainingDays:
            line.installation.rule?.minimumRemainingDays ?? 0,
          originalReadyDay: line.installation.originalReadyDay,
          readyDay: line.installation.readyDay,
          remainingDays: Math.max(
            0,
            line.installation.readyDay - currentDay,
          ),
          requestedDay: line.installation.requestedDay,
          status: line.installation.status,
          tokenSkipCostPerDay:
            line.installation.rule?.tokenSkipCostPerDay ?? 0,
          tokensSpent: line.installation.tokensSpent,
        }
      : null,
    imageUrl: getLineImageUrl(line),
    detailImageUrl: getLineDetailImageUrl(line),
    workload:
      workloadByDepartmentId.get(line.departmentId) ??
      buildFactoryLineWorkload({
        dailyPointCapacity: template.dailyPointCapacity,
        effectiveDailyPointCapacity: 0,
        locale,
        remainingWorkPoints: 0,
      }),
  };
}

function buildWorkloadByDepartmentId({
  locale,
  productionLines,
  routeProgressWorkloads,
}: {
  locale: SupportedLocale;
  productionLines: ProductionLineRecord[];
  routeProgressWorkloads: RouteProgressWorkloadRecord[];
}) {
  const workPointsByDepartmentId = new Map<string, number>();
  const capacityByDepartmentId = new Map<
    string,
    { dailyPointCapacity: number; effectiveDailyPointCapacity: number }
  >();

  for (const progress of routeProgressWorkloads) {
    const remainingQuantity = Math.max(0, progress.remainingQuantity);
    const workloadPointsPerUnit = Math.max(1, progress.workloadPointsPerUnit);
    const setupPoints =
      progress.completedQuantity <= 0 ? Math.max(0, progress.setupPoints) : 0;
    const remainingWorkPoints =
      remainingQuantity * workloadPointsPerUnit + setupPoints;

    workPointsByDepartmentId.set(
      progress.departmentId,
      (workPointsByDepartmentId.get(progress.departmentId) ?? 0) +
        remainingWorkPoints,
    );
  }

  for (const line of productionLines) {
    const template = line.productionLineTemplate;
    const current = capacityByDepartmentId.get(line.departmentId) ?? {
      dailyPointCapacity: 0,
      effectiveDailyPointCapacity: 0,
    };

    if (
      line.status === FactoryProductionLineStatus.IDLE ||
      line.status === FactoryProductionLineStatus.RUNNING
    ) {
      const assignedStaff = line.staffAssignments.reduce(
        (total, assignment) => total + assignment.quantity,
        0,
      );
      const requiredStaff =
        template.staffRequirements.reduce(
          (total, requirement) => total + requirement.requiredQuantity,
          0,
        ) || template.idealStaff;
      const staffCoverageBps = getLineStaffCoverageBps({
        assignedStaffQuantity: assignedStaff,
        requiredStaffQuantity: requiredStaff,
      });
      const effectiveDailyPointCapacity = calculateEffectiveLinePointCapacity({
        conditionBps: line.conditionBps,
        dailyPointCapacity: template.dailyPointCapacity,
        staffCoverageBps,
      });

      current.dailyPointCapacity += Math.max(0, template.dailyPointCapacity);
      current.effectiveDailyPointCapacity += effectiveDailyPointCapacity;
    }

    capacityByDepartmentId.set(line.departmentId, current);
  }

  const departmentIds = new Set([
    ...Array.from(workPointsByDepartmentId.keys()),
    ...Array.from(capacityByDepartmentId.keys()),
  ]);
  const result = new Map<string, FactoryMapItemWorkload>();

  for (const departmentId of departmentIds) {
    const capacity = capacityByDepartmentId.get(departmentId) ?? {
      dailyPointCapacity: 0,
      effectiveDailyPointCapacity: 0,
    };

    result.set(
      departmentId,
      buildFactoryLineWorkload({
        dailyPointCapacity: capacity.dailyPointCapacity,
        effectiveDailyPointCapacity: capacity.effectiveDailyPointCapacity,
        locale,
        remainingWorkPoints: workPointsByDepartmentId.get(departmentId) ?? 0,
      }),
    );
  }

  return result;
}

function getMapTotals(sections: FactoryMapSection[]): GameSnapshot["map"]["totals"] {
  const productionLines = sections.flatMap((section) =>
    section.items.filter((item): item is Extract<FactoryMapItem, { kind: "productionLine" }> =>
      item.kind === "productionLine",
    ),
  );

  return {
    productionLineCount: productionLines.length,
    departmentCount: sections.reduce((total, section) => total + section.departmentCount, 0),
    dailyPointCapacity: productionLines.reduce((total, line) => total + line.dailyPointCapacity, 0),
    assignedStaff: productionLines.reduce((total, line) => total + line.assignedStaff, 0),
    idealStaff: productionLines.reduce((total, line) => total + line.idealStaff, 0),
  };
}

function buildMetrics({
  activeOrderCount,
  activeProductionOrderCount,
  factory,
  lateOrderCount,
  locale,
}: {
  activeOrderCount: number;
  activeProductionOrderCount: number;
  factory: {
    availableBalanceCents: bigint;
    cashBalanceCents: bigint;
    currencyCode: GameSnapshot["factory"]["currencyCode"];
    currentDay: number;
    currentFinancePeriod: number;
    currentLevel: number;
    currentXp: number;
    levelProgress: GameSnapshot["factory"]["levelProgress"];
    operatingStageName: string;
    runwayTokenBalance: number;
  };
  lateOrderCount: number;
  locale: SupportedLocale;
}): GameMetric[] {
  const copy = gameCopy[locale].snapshot.metrics;
  const currentXpLabel = formatNumber(factory.currentXp, locale);
  const xpRemainingLabel = formatNumber(
    factory.levelProgress.xpRemainingForNextLevel ?? 0,
    locale,
  );

  return [
    {
      id: "cash",
      label: copy.cash,
      value: formatMoney(
        factory.availableBalanceCents,
        factory.currencyCode,
        locale,
      ),
      subLabel: copy.financePeriod(factory.currentFinancePeriod),
      tone: "green",
    },
    {
      id: "xp",
      label: copy.xp,
      value: `${currentXpLabel} XP`,
      subLabel:
        factory.levelProgress.nextLevel === null
          ? copy.maxLevel
          : copy.xpForNextLevel(factory.levelProgress.nextLevel, xpRemainingLabel),
      tone: "violet",
    },
    {
      id: "rt",
      label: copy.runwayToken,
      value: `${formatNumber(factory.runwayTokenBalance, locale)} RT`,
      subLabel: "Runway Token",
      tone: "amber",
    },
    {
      id: "day",
      label: copy.day,
      value: formatNumber(factory.currentDay, locale),
      subLabel: formatGameMonthYearLabel(factory.currentDay, locale),
      tone: "amber",
    },
    {
      id: "level",
      label: copy.level,
      value: `Lv. ${factory.currentLevel}`,
      subLabel:
        factory.levelProgress.nextLevel === null
          ? `${currentXpLabel} XP`
          : copy.xpRemaining(xpRemainingLabel),
      tone: "violet",
    },
    {
      id: "orders",
      label: copy.activeOrder,
      value: activeOrderCount.toString(),
      subLabel: copy.productionOrders(activeProductionOrderCount),
      tone: "cyan",
    },
    {
      id: "late",
      label: copy.late,
      value: lateOrderCount.toString(),
      subLabel: lateOrderCount > 0 ? copy.risk : copy.clean,
      tone: lateOrderCount > 0 ? "red" : "green",
    },
  ];
}

function buildNotifications({
  activeProductionOrderCount,
  lateOrderCount,
  levelUpTransactions,
  locale,
}: {
  activeProductionOrderCount: number;
  lateOrderCount: number;
  levelUpTransactions: Array<{ metadata: unknown }>;
  locale: SupportedLocale;
}): GameNotification[] {
  const notifications: GameNotification[] =
    buildProductTierUnlockNotifications(levelUpTransactions, locale);
  const copy = gameCopy[locale].snapshot.notifications;

  if (lateOrderCount > 0) {
    notifications.push({
      id: "late-orders",
      title: copy.lateOrdersTitle,
      body: copy.lateOrdersBody(lateOrderCount),
      tone: "danger",
    });
  }

  if (activeProductionOrderCount > 0) {
    notifications.push({
      id: "production-active",
      title: copy.productionActiveTitle,
      body: copy.productionActiveBody(activeProductionOrderCount),
      tone: "info",
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      id: "factory-stable",
      title: copy.factoryStableTitle,
      body: copy.factoryStableBody,
      tone: "success",
    });
  }

  return notifications;
}

export function buildProductTierUnlockNotifications(
  transactions: Array<{ metadata: unknown }>,
  locale: SupportedLocale = DEFAULT_LOCALE,
): GameNotification[] {
  const unlockedTiers = new Set<(typeof PRODUCT_TIER_ORDER)[number]>();
  const copy = gameCopy[locale].snapshot.notifications;

  for (const transaction of transactions) {
    if (!isRecord(transaction.metadata)) continue;

    const previousLevel = readFiniteNumber(transaction.metadata.previousLevel);
    const currentLevel = readFiniteNumber(transaction.metadata.currentLevel);

    if (previousLevel === null || currentLevel === null) continue;

    for (const tier of PRODUCT_TIER_ORDER) {
      if (tier === "BASIC") continue;

      const minimumLevel = PRODUCT_TIER_MIN_LEVEL[tier];
      if (previousLevel < minimumLevel && currentLevel >= minimumLevel) {
        unlockedTiers.add(tier);
      }
    }
  }

  return PRODUCT_TIER_ORDER.filter((tier) => unlockedTiers.has(tier)).map(
    (tier) => ({
      id: `product-tier-unlocked-${tier.toLowerCase()}`,
      title: copy.tierUnlockedTitle(PRODUCT_TIER_LABELS[tier]),
      body: copy.tierUnlockedBody(PRODUCT_TIER_LABELS[tier]),
      tone: "success" as const,
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getLineImageUrl(line: ProductionLineRecord) {
  const template = line.productionLineTemplate;
  const visual =
    template.visualAssets.find((asset) => asset.variant === ProductionLineAssetVariant.MAP) ??
    template.visualAssets.find((asset) => asset.variant === ProductionLineAssetVariant.CARD) ??
    template.visualAssets.find((asset) => asset.variant === ProductionLineAssetVariant.THUMBNAIL);

  return visual?.url ?? template.imageUrl ?? template.imagePathname ?? getFallbackLineImage(
    line.department.key,
    template.grade,
  );
}

function getLineDetailImageUrl(line: ProductionLineRecord) {
  const template = line.productionLineTemplate;
  const detailVisual = template.visualAssets.find(
    (asset) => asset.variant === ProductionLineAssetVariant.DETAIL,
  );
  const largestVisual = template.visualAssets
    .slice()
    .sort((first, second) => second.width * second.height - first.width * first.height)[0];
  const visual = detailVisual ?? largestVisual;

  return visual?.url ?? visual?.pathname ?? template.imageUrl ?? template.imagePathname ?? getFallbackLineImage(
    line.department.key,
    template.grade,
  );
}

function getFallbackLineImage(departmentKey: string, grade: ProductionGrade) {
  const gradeIndex = {
    WORKSHOP: 1,
    INDUSTRIAL: 2,
    PRECISION: 3,
    SMART: 4,
  } satisfies Record<ProductionGrade, number>;
  const level = gradeIndex[grade] ?? 1;

  const fallbackByDepartment: Record<string, Record<number, string>> = {
    cutting: {
      1: "/factory-machines/cutting_level1.png",
      2: "/factory-machines/cutting_level2.png",
      3: "/factory-machines/cutting_level3.png",
      4: "/factory-machines/cutting_smart.png",
    },
    sewing: {
      1: "/factory-machines/Sewing_workshop.png",
      2: "/factory-machines/Sewing_Industrial.png",
      3: "/factory-machines/Sewing_precision.png",
      4: "/factory-machines/Sewing_smart.png",
    },
    ironing_packing: {
      1: "/factory-machines/Iron_level1.png",
      2: "/factory-machines/Iron_level2.png",
      3: "/factory-machines/Iron_level3.png",
      4: "/factory-machines/Iron_level4.png",
    },
    embroidery: {
      1: "/factory-machines/Embrodery_Level1.png",
    },
    printing: {
      1: "/factory-machines/Print_level1.png",
    },
    washing: {
      1: "/factory-machines/Washing_level1.png",
    },
    dyeing: {
      1: "/factory-machines/dying_level1.png",
    },
  };
  const files = fallbackByDepartment[departmentKey];

  return files?.[level] ?? files?.[1] ?? null;
}

function getDepartmentCode(key: string) {
  const codes: Record<string, string> = {
    cutting: "CUT",
    embroidery: "EMB",
    printing: "PRN",
    sewing: "SEW",
    washing: "WSH",
    dyeing: "DYE",
    ironing_packing: "IRN",
  };

  return codes[key] ?? key.slice(0, 3).toUpperCase();
}

function getSectionTone(key: string, index: number): FactoryMapSection["tone"] {
  const tonesByKey: Record<string, FactoryMapSection["tone"]> = {
    fabric: "cyan",
    cutting: "amber",
    pre_sewing: "violet",
    sewing: "red",
    post_sewing: "green",
    packing: "violet",
    ironing_packing: "violet",
    shipping: "green",
  };
  const fallback: FactoryMapSection["tone"][] = ["cyan", "blue", "amber", "violet", "red", "green"];

  return tonesByKey[key] ?? fallback[index % fallback.length] ?? "cyan";
}

function pickTranslation(
  translations: TranslationRecord[],
  fallbackKey: string,
  locale: SupportedLocale,
) {
  return preferredTranslation(translations, locale)?.name ?? toTitle(fallbackKey);
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(
  cents: bigint,
  currencyCode: GameSnapshot["factory"]["currencyCode"],
  locale: SupportedLocale,
) {
  return new Intl.NumberFormat(numberLocale(locale), {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(cents) / 100);
}

function formatNumber(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGameMonthYearLabel(
  currentDay: number,
  locale: SupportedLocale,
) {
  const period = getFinancePeriod({ currentDay });
  const copy = gameCopy[locale].snapshot;
  const monthName =
    copy.monthNames[Math.max(0, Math.min(11, period.monthInYear - 1))] ??
    copy.monthNames[0] ??
    "";

  return copy.monthYear(monthName, period.yearIndex);
}

function formatGrade(grade: ProductionGrade) {
  const labels: Record<ProductionGrade, string> = {
    WORKSHOP: "Workshop",
    INDUSTRIAL: "Industrial",
    PRECISION: "Precision",
    SMART: "Smart",
  };

  return labels[grade];
}

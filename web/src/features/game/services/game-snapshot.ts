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
import { getProductionQueuesView } from "@/features/production-queue/services/department-queue-view";
import { getWarehouseView } from "@/features/warehouse/services/warehouse-view";
import { getFinancePeriod } from "@/features/finance/services/finance-period";
import { buildManagerRecommendations } from "@/features/manager/services/manager-recommendation-engine";
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
import { buildTasksSnapshot } from "@/features/tasks/services/task-snapshot";
import {
  calculateEffectiveLinePointCapacity,
  getLineStaffCoverageBps,
} from "@/features/game/services/production-capacity";

import { buildFactoryLineWorkload } from "./factory-line-workload";
import { getLatestReviewableShiftPlayback } from "./shift-playback-view";

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

const locale = "tr";

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
};

export async function getGameSnapshot(input: {
  userId: string;
  displayName: string;
}): Promise<GameSnapshot | null> {
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
                    where: { locale },
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
                where: { locale },
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
                    where: { locale },
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
              leasingContracts: {
                where: { status: LeasingContractStatus.ACTIVE },
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
    taskProgressRows,
    tokenWallet,
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
          where: { locale },
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
              where: { locale },
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
          where: { locale },
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
      currencyCode: factory.currencyCode,
      factoryId: factory.id,
    }),
    getWarehouseView({
      currentDay: factory.currentDay,
      factoryId: factory.id,
      sectorId: factory.sectorId,
    }),
    getProductionQueuesView({
      currentDay: factory.currentDay,
      factoryId: factory.id,
      sectorId: factory.sectorId,
    }),
    getLatestReviewableShiftPlayback({
      currentDay: factory.currentDay,
      factoryId: factory.id,
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
              where: { locale },
              select: { locale: true, name: true, description: true },
            },
          },
        },
        visualAssets: {
          where: { variant: ProductionLineAssetVariant.CARD },
          take: 1,
          select: { url: true },
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
                  where: { locale },
                  select: { name: true },
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
          where: { locale },
          select: { name: true },
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
                  where: { locale },
                  select: { name: true },
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
              where: { locale: { in: [locale, "en"] } },
              select: { description: true, locale: true, title: true },
            },
          },
        },
      },
    }),
    prisma.playerTokenWallet.findUnique({
      where: { playerProfileId: playerProfile.id },
      select: { balance: true },
    }),
  ]);

  const sections = buildFactoryMapSections({
    departmentGroups,
    productionLines: factory.productionLines,
    workloadByDepartmentId: buildWorkloadByDepartmentId({
      productionLines: factory.productionLines,
      routeProgressWorkloads,
    }),
  });
  const totals = getMapTotals(sections);
  const operatingStageName = pickTranslation(
    factory.operatingStageState?.currentStage.translations ?? [],
    factory.operatingStageState?.currentStage.key ?? "stage",
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
    readyToShipOrderCount,
    routeProgressCounts,
    warehouseInboundCount: warehouse.summary.inboundTotal,
  });
  const tasks = buildTasksSnapshot({
    progressRows: taskProgressRows,
    tokenBalance: tokenWallet?.balance ?? 0,
  });
  const investment = buildProductionLineInvestmentView({
    activeProductionLineCount: factory.productionLines.filter(
      (line) => line.status !== FactoryProductionLineStatus.DISABLED,
    ).length,
    costConfig: investmentCostConfig,
    currentStageId: factory.operatingStageState?.currentStage.id ?? null,
    currencyCode: factory.currencyCode,
    stages: investmentStages,
    supportStaffByRoleId: new Map(
      factorySupportStaff.map((assignment) => [
        assignment.staffRoleId,
        assignment.quantity,
      ]),
    ),
    templates: investmentTemplates,
  });
  const managerRecommendations = buildManagerRecommendations({
    activeOrderCount,
    activeProductionOrderCount,
    cashBalanceCents: factory.cashBalanceCents.toString(),
    currentDay: factory.currentDay,
    investment,
    lateOrderCount,
    mapSections: sections,
    productionQueues,
    tasks,
  });

  return {
    player: {
      id: playerProfile.id,
      displayName: input.displayName,
    },
    factory: {
      id: factory.id,
      name: factory.name,
      sectorName: pickTranslation(factory.sector.translations, factory.sector.key),
      currencyCode: factory.currencyCode,
      cashBalanceCents: factory.cashBalanceCents.toString(),
      currentDay: factory.currentDay,
      currentFinancePeriod: factory.currentFinancePeriod,
      currentLevel: factory.currentLevel,
      currentXp: factory.currentXp,
      levelProgress,
      operatingStageName,
    },
    metrics: buildMetrics({
      activeOrderCount,
      activeProductionOrderCount,
      factory: { ...factory, levelProgress, operatingStageName },
      lateOrderCount,
      totals,
    }),
    tasks,
    notifications: buildNotifications({
      activeProductionOrderCount,
      lateOrderCount,
    }),
    managerRecommendations,
    activeShiftPlayback,
    dock: {
      badges: buildLeftDockBadges({
        availableOrderCount: orderMarket.availableCount,
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
    visualAssets: Array<{ url: string }>;
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
      imageUrl:
        template.visualAssets[0]?.url ??
        template.imageUrl ??
        template.imagePathname,
      key: template.key,
      leasingOffers: template.leasingOffers.map((offer) => ({
        id: offer.id,
        termYears: offer.termYears,
        installmentCount: offer.installmentCount,
        downPaymentCents: String(offer.downPaymentCents),
        installmentAmountCents: String(offer.installmentAmountCents),
        totalCostCents: String(offer.totalCostCents),
      })),
      machineCount: template.machineCount,
      monthlyElectricityBaseCents: template.monthlyElectricityBaseCents,
      purchaseCostCents: String(template.purchaseCostCents),
      preview: calculateProductionLineInvestmentPreview({
        activeProductionLineCount: input.activeProductionLineCount,
        costConfig: input.costConfig,
        currentStageId: input.currentStageId,
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

function buildDockItems({
  departments,
  readyToShipOrderCount,
  routeProgressCounts,
  warehouseInboundCount,
}: {
  departments: DockDepartmentRecord[];
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
        label: getDockLabel(groupKey, sortedDepartments),
        iconKey,
        departmentIds: sortedDepartments.map((department) => department.id),
        departmentKeys: sortedDepartments.map((department) => department.key),
        kind: firstDepartment.kind,
        sortOrder: firstDepartment.dockSortOrder ?? firstDepartment.routeOrder,
        badge: buildDockBadge({
          badgeKey,
          departments: sortedDepartments,
          groupKey,
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
  tasks: GameSnapshot["tasks"];
}): GameSnapshot["dock"]["badges"] {
  const badges: GameSnapshot["dock"]["badges"] = {};

  if (input.availableOrderCount > 0) {
    badges.orders = {
      count: input.availableOrderCount,
      label: "Yeni sipariş",
      tone: "danger",
    };
  }

  if (input.tasks.summary.completedUnclaimedCount > 0) {
    badges.tasks = {
      count: input.tasks.summary.completedUnclaimedCount,
      icon: "check",
      label: "Ödül bekliyor",
      tone: "success",
    };
  } else if (input.tasks.summary.activeCount > 0) {
    badges.tasks = {
      count: input.tasks.summary.activeCount,
      label: "Aktif görev",
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
  readyToShipOrderCount,
  routeCountsByDepartmentId,
  warehouseInboundCount,
}: {
  badgeKey: string;
  departments: DockDepartmentRecord[];
  groupKey: string;
  readyToShipOrderCount: number;
  routeCountsByDepartmentId: Map<string, Partial<Record<RouteProgressStatusType, number>>>;
  warehouseInboundCount: number;
}): GameDockBadge | null {
  if (badgeKey === "READY_TO_SHIP") {
    return readyToShipOrderCount > 0
      ? {
          count: readyToShipOrderCount,
          label: "Sevke hazır",
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
          label: "Yolda",
          tone: "warning",
        }
      : null;
  }

  if (count <= 0) return null;

  if (badgeKey === "BOTTLENECK") {
    return {
      count,
      label: "Kuyruk / darboğaz",
      tone: "warning",
    };
  }

  if (badgeKey === "MATERIAL_MISSING") {
    return {
      count,
      label: "Malzeme uyarısı",
      tone: "danger",
    };
  }

  return {
    count,
    label: "Bekleyen iş",
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

function getDockLabel(groupKey: string, departments: DockDepartmentRecord[]) {
  const labels: Record<string, string> = {
    warehouse: "Depo",
    shipping: "Sevkiyat",
  };

  return labels[groupKey] ?? pickTranslation(departments[0]?.translations ?? [], departments[0]?.key ?? groupKey);
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
  departmentGroups,
  productionLines,
  workloadByDepartmentId,
}: {
  departmentGroups: DepartmentGroupRecord[];
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

    const departments = visibleDepartments.map(toMapDepartment);
    const items = buildSectionItems({
      departmentIds: departments.map((department) => department.id),
      groupId: group.id,
      groupTitle: pickTranslation(group.translations, group.key),
      lines,
      workloadByDepartmentId,
    });

    sections.push({
      id: group.id,
      key: group.key,
      step: String(sections.length + 1).padStart(2, "0"),
      title: pickTranslation(group.translations, group.key),
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

    const departmentName = pickTranslation(firstLine.department.translations, firstLine.department.key);
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
      departmentIds: [firstLine.department.id],
      groupId: syntheticGroup.id,
      groupTitle: departmentName,
      lines,
      workloadByDepartmentId,
    });

    sections.push({
      id: syntheticGroup.id,
      key: syntheticGroup.key,
      step: String(sections.length + 1).padStart(2, "0"),
      title: departmentName,
      tone: getSectionTone(syntheticGroup.key, sections.length),
      departments: syntheticGroup.departments.map(toMapDepartment),
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
  departmentIds,
  groupId,
  groupTitle,
  lines,
  workloadByDepartmentId,
}: {
  departmentIds: string[];
  groupId: string;
  groupTitle: string;
  lines: ProductionLineRecord[];
  workloadByDepartmentId: ReadonlyMap<string, FactoryMapItemWorkload>;
}) {
  const items: FactoryMapItem[] = lines
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder || first.lineNumber - second.lineNumber)
    .map((line) => toProductionLineItem(line, workloadByDepartmentId));

  if (items.length > 0) {
    items.push({
      kind: "investmentAction",
      id: `investment:${groupId}`,
      sectionId: groupId,
      departmentIds,
      title: "Yatırım Yap",
      subtitle: `${groupTitle} yatırımları`,
    });
  }

  return items;
}

function toMapDepartment(department: DepartmentRecord): FactoryMapDepartment {
  return {
    id: department.id,
    key: department.key,
    iconKey: normalizeDockIconKey(department.dockIconKey ?? getDefaultDockIconKey(department.key, department.key)),
    name: pickTranslation(department.translations, department.key),
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
): FactoryMapItem {
  const departmentName = pickTranslation(line.department.translations, line.department.key);
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
    title: line.customName ?? `${departmentName} Hattı ${line.lineNumber}`,
    subtitle: formatGrade(template.grade),
    acquisitionType: line.acquisitionType,
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
    imageUrl: getLineImageUrl(line),
    detailImageUrl: getLineDetailImageUrl(line),
    workload:
      workloadByDepartmentId.get(line.departmentId) ??
      buildFactoryLineWorkload({
        dailyPointCapacity: template.dailyPointCapacity,
        effectiveDailyPointCapacity: 0,
        remainingWorkPoints: 0,
      }),
  };
}

function buildWorkloadByDepartmentId({
  productionLines,
  routeProgressWorkloads,
}: {
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
  totals,
}: {
  activeOrderCount: number;
  activeProductionOrderCount: number;
  factory: {
    cashBalanceCents: bigint;
    currencyCode: GameSnapshot["factory"]["currencyCode"];
    currentDay: number;
    currentFinancePeriod: number;
    currentLevel: number;
    currentXp: number;
    levelProgress: GameSnapshot["factory"]["levelProgress"];
    operatingStageName: string;
  };
  lateOrderCount: number;
  totals: GameSnapshot["map"]["totals"];
}): GameMetric[] {
  return [
    {
      id: "cash",
      label: "Nakit",
      value: formatMoney(factory.cashBalanceCents, factory.currencyCode),
      subLabel: `Finans ${factory.currentFinancePeriod}. dönem`,
      tone: "green",
    },
    {
      id: "xp",
      label: "Tecrübe",
      value: `${formatNumber(factory.currentXp)} XP`,
      subLabel:
        factory.levelProgress.nextLevel === null
          ? "Maksimum seviye"
          : `Lv. ${factory.levelProgress.nextLevel} için ${formatNumber(factory.levelProgress.xpRemainingForNextLevel ?? 0)} XP`,
      tone: "violet",
    },
    {
      id: "day",
      label: "Gün",
      value: formatNumber(factory.currentDay),
      subLabel: formatGameMonthYearLabel(factory.currentDay),
      tone: "amber",
    },
    {
      id: "level",
      label: "Seviye",
      value: `Lv. ${factory.currentLevel}`,
      subLabel:
        factory.levelProgress.nextLevel === null
          ? `${formatNumber(factory.currentXp)} XP`
          : `${formatNumber(factory.levelProgress.xpRemainingForNextLevel ?? 0)} XP kaldı`,
      tone: "violet",
    },
    {
      id: "orders",
      label: "Aktif Sipariş",
      value: activeOrderCount.toString(),
      subLabel: `${activeProductionOrderCount} üretim emri`,
      tone: "cyan",
    },
    {
      id: "late",
      label: "Geciken",
      value: lateOrderCount.toString(),
      subLabel: lateOrderCount > 0 ? "Risk altında" : "Temiz",
      tone: lateOrderCount > 0 ? "red" : "green",
    },
    {
      id: "capacity",
      label: "Kurulu Hat",
      value: totals.productionLineCount.toString(),
      subLabel: "Üretim alanı",
      tone: "violet",
    },
  ];
}

function buildNotifications({
  activeProductionOrderCount,
  lateOrderCount,
}: {
  activeProductionOrderCount: number;
  lateOrderCount: number;
}): GameNotification[] {
  const notifications: GameNotification[] = [];

  if (lateOrderCount > 0) {
    notifications.push({
      id: "late-orders",
      title: "Teslimat riski",
      body: `${lateOrderCount} sipariş gecikme durumunda.`,
      tone: "danger",
    });
  }

  if (activeProductionOrderCount > 0) {
    notifications.push({
      id: "production-active",
      title: "Üretim emri aktif",
      body: `${activeProductionOrderCount} üretim emri takipte.`,
      tone: "info",
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      id: "factory-stable",
      title: "Fabrika akışı sakin",
      body: "Haritada acil uyarı yok.",
      tone: "success",
    });
  }

  return notifications;
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

function pickTranslation(translations: TranslationRecord[], fallbackKey: string) {
  return translations.find((translation) => translation.locale === locale)?.name
    ?? translations[0]?.name
    ?? toTitle(fallbackKey);
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(cents: bigint, currencyCode: GameSnapshot["factory"]["currencyCode"]) {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(cents) / 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

const gameMonthNames = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

function formatGameMonthYearLabel(currentDay: number) {
  const period = getFinancePeriod({ currentDay });
  const monthName =
    gameMonthNames[Math.max(0, Math.min(11, period.monthInYear - 1))] ??
    "Ocak";

  return `${monthName} - ${period.yearIndex}. Yıl`;
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

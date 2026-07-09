import {
  ContentStatus,
  CustomerOrderStatus,
  DepartmentKind,
  FactoryProductionLineStatus,
  ProductionLineAssetVariant,
  ProductionOrderStatus,
  StaffAssignmentStatus,
  type DepartmentKind as DepartmentKindType,
  type FactoryProductionLineStatus as FactoryProductionLineStatusType,
  type ProductionGrade,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

import type {
  FactoryMapDepartment,
  FactoryMapItem,
  FactoryMapSection,
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
  supportsOutsource: boolean;
  translations: TranslationRecord[];
};

type DepartmentGroupRecord = {
  id: string;
  key: string;
  sortOrder: number;
  translations: TranslationRecord[];
  departments: DepartmentRecord[];
};

type ProductionLineRecord = {
  id: string;
  departmentId: string;
  lineNumber: number;
  customName: string | null;
  conditionBps: number;
  status: FactoryProductionLineStatusType;
  sortOrder: number;
  department: {
    id: string;
    key: string;
    kind: DepartmentKindType;
    departmentGroupId: string | null;
    routeOrder: number;
    supportsOutsource: boolean;
    translations: TranslationRecord[];
  };
  productionLineTemplate: {
    key: string;
    grade: ProductionGrade;
    idealStaff: number;
    dailyPointCapacity: number;
    imageUrl: string | null;
    imagePathname: string | null;
    visualAssets: Array<{
      url: string;
      pathname: string | null;
    }>;
  };
  staffAssignments: Array<{
    quantity: number;
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
                  supportsOutsource: true,
                  translations: {
                    where: { locale },
                    select: { locale: true, name: true, description: true },
                  },
                },
              },
              productionLineTemplate: {
                select: {
                  key: true,
                  grade: true,
                  idealStaff: true,
                  dailyPointCapacity: true,
                  imageUrl: true,
                  imagePathname: true,
                  visualAssets: {
                    where: { variant: ProductionLineAssetVariant.MAP },
                    select: {
                      url: true,
                      pathname: true,
                    },
                  },
                },
              },
              staffAssignments: {
                where: { status: StaffAssignmentStatus.ACTIVE },
                select: { quantity: true },
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
    activeOrderCount,
    lateOrderCount,
    activeProductionOrderCount,
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
            supportsOutsource: true,
            translations: {
              where: { locale },
              select: { locale: true, name: true, description: true },
            },
          },
        },
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
  ]);

  const sections = buildFactoryMapSections({
    departmentGroups,
    productionLines: factory.productionLines,
  });
  const totals = getMapTotals(sections);

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
    },
    metrics: buildMetrics({
      activeOrderCount,
      activeProductionOrderCount,
      factory,
      lateOrderCount,
      totals,
    }),
    notifications: buildNotifications({
      activeProductionOrderCount,
      lateOrderCount,
    }),
    map: {
      sections,
      totals,
    },
  };
}

function buildFactoryMapSections({
  departmentGroups,
  productionLines,
}: {
  departmentGroups: DepartmentGroupRecord[];
  productionLines: ProductionLineRecord[];
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
      groupId: group.id,
      groupTitle: pickTranslation(group.translations, group.key),
      lines,
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
          supportsOutsource: firstLine.department.supportsOutsource,
          translations: firstLine.department.translations,
        },
      ],
    };
    const items = buildSectionItems({
      groupId: syntheticGroup.id,
      groupTitle: departmentName,
      lines,
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
      supportsOutsource: line.department.supportsOutsource,
      translations: line.department.translations,
    });
  }

  return Array.from(departmentsById.values()).sort(
    (first, second) => first.routeOrder - second.routeOrder || first.key.localeCompare(second.key),
  );
}

function buildSectionItems({
  groupId,
  groupTitle,
  lines,
}: {
  groupId: string;
  groupTitle: string;
  lines: ProductionLineRecord[];
}) {
  const items: FactoryMapItem[] = lines
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder || first.lineNumber - second.lineNumber)
    .map(toProductionLineItem);

  if (items.length > 0) {
    items.push({
      kind: "investmentAction",
      id: `investment:${groupId}`,
      sectionId: groupId,
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
    name: pickTranslation(department.translations, department.key),
    kind: department.kind,
    routeOrder: department.routeOrder,
    supportsOutsource: department.supportsOutsource,
  };
}

function toProductionLineItem(line: ProductionLineRecord): FactoryMapItem {
  const departmentName = pickTranslation(line.department.translations, line.department.key);
  const template = line.productionLineTemplate;

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
    status: line.status,
    grade: template.grade,
    lineNumber: line.lineNumber,
    sortOrder: line.sortOrder,
    conditionBps: line.conditionBps,
    dailyPointCapacity: template.dailyPointCapacity,
    idealStaff: template.idealStaff,
    assignedStaff: line.staffAssignments.reduce((total, assignment) => total + assignment.quantity, 0),
    imageUrl: getLineImageUrl(line),
  };
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
      id: "day",
      label: "Gün",
      value: `${factory.currentDay}. Gün`,
      subLabel: `Seviye ${factory.currentLevel}`,
      tone: "amber",
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
    {
      id: "staff",
      label: "Departman",
      value: totals.departmentCount.toString(),
      subLabel: "Sahip olunan hatlar",
      tone: "blue",
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
  const visual = template.visualAssets[0];

  return visual?.url ?? template.imageUrl ?? template.imagePathname ?? getFallbackLineImage(
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

function formatGrade(grade: ProductionGrade) {
  const labels: Record<ProductionGrade, string> = {
    WORKSHOP: "Workshop",
    INDUSTRIAL: "Industrial",
    PRECISION: "Precision",
    SMART: "Smart",
  };

  return labels[grade];
}

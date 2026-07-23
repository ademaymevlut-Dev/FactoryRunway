import {
  DepartmentKind,
  FactoryProductionLineStatus,
  FactoryStatus,
  Prisma,
  ProductionLineAssetVariant,
  type ProductionGrade,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

import type {
  FactoryVisitLine,
  FactoryVisitSection,
  FactoryVisitView,
} from "../types";

const locale = "tr";

const factoryVisitSelect = {
  currentLevel: true,
  currentXp: true,
  id: true,
  name: true,
  operatingStageState: {
    select: {
      currentStage: {
        select: {
          key: true,
          translations: {
            where: {
              locale: {
                in: [locale, "en"],
              },
            },
            select: {
              locale: true,
              name: true,
            },
          },
        },
      },
    },
  },
  playerProfile: {
    select: {
      displayName: true,
      id: true,
      totalXp: true,
    },
  },
  productionLines: {
    select: {
      customName: true,
      department: {
        select: {
          departmentGroup: {
            select: {
              id: true,
              key: true,
              sortOrder: true,
              translations: {
                where: {
                  locale: {
                    in: [locale, "en"],
                  },
                },
                select: {
                  locale: true,
                  name: true,
                },
              },
            },
          },
          id: true,
          key: true,
          routeOrder: true,
          translations: {
            where: {
              locale: {
                in: [locale, "en"],
              },
            },
            select: {
              locale: true,
              name: true,
            },
          },
        },
      },
      id: true,
      lineNumber: true,
      productionLineTemplate: {
        select: {
          grade: true,
          imagePathname: true,
          imageUrl: true,
          visualAssets: {
            select: {
              pathname: true,
              url: true,
              variant: true,
            },
          },
        },
      },
      sortOrder: true,
    },
    where: {
      department: {
        kind: DepartmentKind.PRODUCTION,
      },
      status: {
        not: FactoryProductionLineStatus.SOLD,
      },
    },
  },
  sector: {
    select: {
      key: true,
      translations: {
        where: {
          locale: {
            in: [locale, "en"],
          },
        },
        select: {
          locale: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.FactorySelect;

type FactoryVisitRecord = Prisma.FactoryGetPayload<{
  select: typeof factoryVisitSelect;
}>;

export async function getFactoryVisitView(input: {
  factoryId: string;
}): Promise<FactoryVisitView | null> {
  const factory = await getPrisma().factory.findFirst({
    select: factoryVisitSelect,
    where: {
      id: input.factoryId,
      status: FactoryStatus.ACTIVE,
    },
  });

  if (!factory) {
    return null;
  }

  const sections = buildFactoryVisitSections(factory);

  return {
    factory: {
      currentLevel: factory.currentLevel,
      currentXp: factory.currentXp,
      id: factory.id,
      name: factory.name,
      operatingStageName: pickTranslation(
        factory.operatingStageState?.currentStage.translations ?? [],
        factory.operatingStageState?.currentStage.key ?? "factory",
      ),
      productionLineCount: sections.reduce(
        (total, section) => total + section.lines.length,
        0,
      ),
      sectorKey: factory.sector.key,
      sectorName: pickTranslation(
        factory.sector.translations,
        factory.sector.key,
      ),
    },
    player: {
      displayName: factory.playerProfile.displayName,
      playerProfileId: factory.playerProfile.id,
      totalXp: factory.playerProfile.totalXp.toString(),
    },
    sections,
  };
}

export function buildFactoryVisitSections(
  factory: FactoryVisitRecord,
): FactoryVisitSection[] {
  const sections = new Map<
    string,
    Omit<FactoryVisitSection, "lines" | "tone"> & {
      lines: Array<FactoryVisitLine & { sortOrder: number }>;
    }
  >();
  const orderedLines = factory.productionLines.slice().sort((first, second) => {
    const firstGroupSort =
      first.department.departmentGroup?.sortOrder ??
      first.department.routeOrder;
    const secondGroupSort =
      second.department.departmentGroup?.sortOrder ??
      second.department.routeOrder;

    return (
      firstGroupSort - secondGroupSort ||
      first.department.routeOrder - second.department.routeOrder ||
      first.sortOrder - second.sortOrder ||
      first.lineNumber - second.lineNumber
    );
  });

  for (const line of orderedLines) {
    const group = line.department.departmentGroup;
    const sectionId = group?.id ?? `department:${line.department.id}`;
    const sectionKey = group?.key ?? line.department.key;
    const section =
      sections.get(sectionId) ??
      {
        id: sectionId,
        key: sectionKey,
        lines: [],
        sortOrder: group?.sortOrder ?? line.department.routeOrder,
        title: pickTranslation(
          group?.translations ?? line.department.translations,
          sectionKey,
        ),
      };

    section.lines.push({
      code: `${getDepartmentCode(line.department.key)}-${String(
        line.lineNumber,
      ).padStart(2, "0")}`,
      departmentId: line.department.id,
      departmentKey: line.department.key,
      departmentName: pickTranslation(
        line.department.translations,
        line.department.key,
      ),
      grade: line.productionLineTemplate.grade,
      id: line.id,
      imageUrl: getLineImageUrl(line),
      lineNumber: line.lineNumber,
      sortOrder: line.sortOrder,
      title:
        line.customName ??
        `${pickTranslation(
          line.department.translations,
          line.department.key,
        )} Hattı ${line.lineNumber}`,
    });
    sections.set(sectionId, section);
  }

  return Array.from(sections.values())
    .sort(
      (first, second) =>
        first.sortOrder - second.sortOrder ||
        first.key.localeCompare(second.key),
    )
    .map((section, index) => ({
      ...section,
      lines: section.lines
        .sort(
          (first, second) =>
            first.sortOrder - second.sortOrder ||
            first.lineNumber - second.lineNumber,
        )
        .map((line) => ({
          code: line.code,
          departmentId: line.departmentId,
          departmentKey: line.departmentKey,
          departmentName: line.departmentName,
          grade: line.grade,
          id: line.id,
          imageUrl: line.imageUrl,
          lineNumber: line.lineNumber,
          title: line.title,
        })),
      tone: getSectionTone(section.key, index),
    }));
}

function getLineImageUrl(
  line: FactoryVisitRecord["productionLines"][number],
) {
  const template = line.productionLineTemplate;
  const visual =
    template.visualAssets.find(
      (asset) => asset.variant === ProductionLineAssetVariant.MAP,
    ) ??
    template.visualAssets.find(
      (asset) => asset.variant === ProductionLineAssetVariant.CARD,
    ) ??
    template.visualAssets.find(
      (asset) => asset.variant === ProductionLineAssetVariant.THUMBNAIL,
    );

  return (
    visual?.url ??
    visual?.pathname ??
    template.imageUrl ??
    template.imagePathname ??
    getFallbackLineImage(line.department.key, template.grade)
  );
}

function getFallbackLineImage(
  departmentKey: string,
  grade: ProductionGrade,
) {
  const gradeIndex = {
    INDUSTRIAL: 2,
    PRECISION: 3,
    SMART: 4,
    WORKSHOP: 1,
  } satisfies Record<ProductionGrade, number>;
  const fallbackByDepartment: Record<string, Record<number, string>> = {
    cutting: {
      1: "/factory-machines/cutting_level1.png",
      2: "/factory-machines/cutting_level2.png",
      3: "/factory-machines/cutting_level3.png",
      4: "/factory-machines/cutting_smart.png",
    },
    dyeing: {
      1: "/factory-machines/dying_level1.png",
    },
    embroidery: {
      1: "/factory-machines/Embrodery_Level1.png",
    },
    ironing_packing: {
      1: "/factory-machines/Iron_level1.png",
      2: "/factory-machines/Iron_level2.png",
      3: "/factory-machines/Iron_level3.png",
      4: "/factory-machines/Iron_level4.png",
    },
    printing: {
      1: "/factory-machines/Print_level1.png",
    },
    sewing: {
      1: "/factory-machines/Sewing_workshop.png",
      2: "/factory-machines/Sewing_Industrial.png",
      3: "/factory-machines/Sewing_precision.png",
      4: "/factory-machines/Sewing_smart.png",
    },
    washing: {
      1: "/factory-machines/Washing_level1.png",
    },
  };
  const files = fallbackByDepartment[departmentKey];
  const level = gradeIndex[grade] ?? 1;

  return files?.[level] ?? files?.[1] ?? null;
}

function getDepartmentCode(key: string) {
  const codes: Record<string, string> = {
    cutting: "CUT",
    dyeing: "DYE",
    embroidery: "EMB",
    ironing_packing: "IRN",
    printing: "PRN",
    sewing: "SEW",
    washing: "WSH",
  };

  return codes[key] ?? key.slice(0, 3).toUpperCase();
}

function getSectionTone(
  key: string,
  index: number,
): FactoryVisitSection["tone"] {
  const tonesByKey: Record<string, FactoryVisitSection["tone"]> = {
    cutting: "amber",
    fabric: "cyan",
    ironing_packing: "violet",
    packing: "violet",
    post_sewing: "green",
    pre_sewing: "violet",
    sewing: "red",
    shipping: "green",
  };
  const fallback: FactoryVisitSection["tone"][] = [
    "cyan",
    "blue",
    "amber",
    "violet",
    "red",
    "green",
  ];

  return tonesByKey[key] ?? fallback[index % fallback.length] ?? "cyan";
}

function pickTranslation(
  translations: Array<{ locale: string; name: string }>,
  fallback: string,
) {
  return (
    translations.find((translation) => translation.locale === locale)?.name ??
    translations.find((translation) => translation.locale === "en")?.name ??
    toTitle(fallback)
  );
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

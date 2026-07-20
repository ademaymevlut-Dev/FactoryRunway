"use server";

import { revalidatePath } from "next/cache";

import {
  ContentStatus,
  CurrencyCode,
  FactoryProductionLineStatus,
  FactoryStatus,
  LineAcquisitionType,
  OnboardingStatus,
  OnboardingStep,
  ProductionLineAssetVariant,
  StaffAssignmentStatus,
} from "@/generated/prisma/enums";
import { USER_ROLES } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db";
import { ensureFactoryTaskProgress } from "@/features/tasks/services/task-definition-service";

export type StarterStaffRequirement = {
  id: string;
  roleName: string;
  roleKey: string;
  quantity: number;
  monthlySalaryCents: string;
};

export type StarterLineSetup = {
  id: string;
  key: string;
  departmentKey: string;
  departmentName: string;
  grade: string;
  idealStaff: number;
  dailyPointCapacity: number;
  areaM2: number;
  purchaseCostCents: string;
  monthlyElectricityBaseCents: string;
  staffTotal: number;
  staffPayrollCents: string;
  visual: {
    detailUrl: string | null;
    mapUrl: string | null;
    cardUrl: string | null;
    thumbnailUrl: string | null;
  };
  staffRequirements: StarterStaffRequirement[];
};

export type FactorySetupPayload = {
  sector: {
    id: string;
    key: string;
    title: string;
  };
  simulation: {
    startingCapitalCents: string;
    defaultCurrencyCode: "EUR" | "USD";
    startingDay: number;
    startingLevel: number;
    financePeriodDays: number;
  };
  starterLines: StarterLineSetup[];
  supportStaff: StarterStaffRequirement[];
  costs: {
    directStaffTotal: number;
    supportStaffTotal: number;
    totalStaff: number;
    totalAreaM2: number;
    monthlyPayrollCents: string;
    monthlyRentCents: string;
    monthlyElectricityCents: string;
    monthlyMealCents: string;
    monthlyOverheadCents: string;
    monthlyTotalExpenseCents: string;
    starterInvestmentValueCents: string;
  };
  draft: {
    factoryName: string | null;
    currencyCode: "EUR" | "USD";
  };
};

export type OnboardingActionResult =
  | { ok: true; setup: FactorySetupPayload }
  | { ok: false; message: string };

export type SaveIdentityResult =
  | { ok: true; factoryName: string; currencyCode: "EUR" | "USD" }
  | { ok: false; message: string };

export type CompleteOnboardingResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

const starterTemplateKeys = [
  "cutting_workshop",
  "sewing_workshop",
  "ironing_packing_workshop",
] as const;

const locale = "tr";

export async function beginOnboardingSectorAction(
  sectorId: string,
): Promise<OnboardingActionResult> {
  const auth = await requirePlayerUser();

  if (!auth.ok) {
    return auth;
  }

  const prisma = getPrisma();
  const setup = await buildFactorySetupPayload(sectorId, auth.user.id);

  if (!setup.ok) {
    return setup;
  }

  await prisma.$transaction([
    prisma.playerOnboardingDraft.upsert({
      where: { userId: auth.user.id },
      update: {
        sectorId,
        currencyCode: setup.setup.simulation.defaultCurrencyCode,
        draftData: {
          selectedSectorKey: setup.setup.sector.key,
          sectorCompleted: true,
          setupPreviewed: true,
        },
        revision: { increment: 1 },
      },
      create: {
        userId: auth.user.id,
        sectorId,
        currencyCode: setup.setup.simulation.defaultCurrencyCode,
        draftData: {
          selectedSectorKey: setup.setup.sector.key,
          sectorCompleted: true,
          setupPreviewed: true,
        },
        revision: 1,
      },
    }),
    prisma.user.update({
      where: { id: auth.user.id },
      data: {
        onboardingStatus: OnboardingStatus.IN_PROGRESS,
        onboardingStep: OnboardingStep.FACTORY_SETUP,
      },
    }),
  ]);

  return setup;
}

export async function saveOnboardingIdentityAction(input: {
  sectorId: string;
  factoryName: string;
  currencyCode: "EUR" | "USD";
}): Promise<SaveIdentityResult> {
  const auth = await requirePlayerUser();

  if (!auth.ok) {
    return auth;
  }

  const factoryName = normalizeFactoryName(input.factoryName);

  if (!factoryName) {
    return {
      ok: false,
      message: "Fabrika adı en az 3 karakter olmalı.",
    };
  }

  const currencyCode = normalizeCurrencyCode(input.currencyCode);
  const prisma = getPrisma();

  await prisma.playerOnboardingDraft.upsert({
    where: { userId: auth.user.id },
    update: {
      sectorId: input.sectorId,
      factoryName,
      currencyCode,
      draftData: {
        identityCompleted: true,
      },
      revision: { increment: 1 },
    },
    create: {
      userId: auth.user.id,
      sectorId: input.sectorId,
      factoryName,
      currencyCode,
      draftData: {
        identityCompleted: true,
      },
      revision: 1,
    },
  });

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      onboardingStatus: OnboardingStatus.IN_PROGRESS,
      onboardingStep: OnboardingStep.FACTORY_SETUP,
    },
  });

  return { ok: true, factoryName, currencyCode };
}

export async function completeFactoryOnboardingAction(input: {
  sectorId: string;
  factoryName: string;
  currencyCode: "EUR" | "USD";
}): Promise<CompleteOnboardingResult> {
  const auth = await requirePlayerUser();

  if (!auth.ok) {
    return auth;
  }

  const factoryName = normalizeFactoryName(input.factoryName);

  if (!factoryName) {
    return {
      ok: false,
      message: "Fabrika adı olmadan kurulum tamamlanamaz.",
    };
  }

  const currencyCode = normalizeCurrencyCode(input.currencyCode);
  const prisma = getPrisma();

  const result = await prisma.$transaction(async (tx) => {
    const playerProfile = await tx.playerProfile.findUnique({
      where: { userId: auth.user.id },
      select: {
        id: true,
        factories: {
          where: { sectorId: input.sectorId },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!playerProfile) {
      throw new Error("Oyuncu profili bulunamadı.");
    }

    if (playerProfile.factories.length > 0) {
      return { alreadyCreated: true };
    }

    const [sector, simulationConfig, startingStage, templates] =
      await Promise.all([
        tx.sector.findUnique({
          where: { id: input.sectorId },
          select: { id: true, key: true, status: true },
        }),
        tx.sectorSimulationConfig.findUnique({
          where: { sectorId: input.sectorId },
          select: {
            startingCapitalCents: true,
            startingDay: true,
            startingLevel: true,
          },
        }),
        tx.sectorFactoryOperatingStage.findUnique({
          where: {
            sectorId_key: {
              sectorId: input.sectorId,
              key: "small_workshop",
            },
          },
          include: {
            staffRequirements: {
              include: { staffRole: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        }),
        tx.productionLineTemplate.findMany({
          where: {
            sectorId: input.sectorId,
            key: { in: [...starterTemplateKeys] },
            status: ContentStatus.ACTIVE,
          },
          include: {
            staffRequirements: {
              include: { staffRole: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        }),
      ]);

    if (!sector || sector.status !== "ACTIVE") {
      throw new Error("Seçilen sektör şu anda aktif değil.");
    }

    const orderedTemplates = starterTemplateKeys
      .map((key) => templates.find((template) => template.key === key))
      .filter(Boolean);

    if (orderedTemplates.length !== starterTemplateKeys.length) {
      throw new Error("Başlangıç üretim hatları eksik yapılandırılmış.");
    }

    if (!startingStage) {
      throw new Error("small_workshop işletme aşaması bulunamadı.");
    }

    const factory = await tx.factory.create({
      data: {
        playerProfileId: playerProfile.id,
        sectorId: sector.id,
        name: factoryName,
        currencyCode,
        cashBalanceCents: simulationConfig?.startingCapitalCents ?? BigInt(100_000_000),
        currentDay: simulationConfig?.startingDay ?? 1,
        currentLevel: simulationConfig?.startingLevel ?? 1,
        currentXp: 0,
        status: FactoryStatus.ACTIVE,
        metadata: {
          onboardingVersion: 1,
          starterSectorKey: sector.key,
        },
      },
    });

    for (const [index, template] of orderedTemplates.entries()) {
      if (!template) continue;

      const line = await tx.factoryProductionLine.create({
        data: {
          factoryId: factory.id,
          productionLineTemplateId: template.id,
          departmentId: template.departmentId,
          lineNumber: 1,
          customName: null,
          acquisitionType: LineAcquisitionType.STARTER,
          purchasePriceCents: BigInt(0),
          conditionBps: 10000,
          status: FactoryProductionLineStatus.IDLE,
          installedDay: simulationConfig?.startingDay ?? 1,
          sortOrder: (index + 1) * 10,
          metadata: {
            starterTemplateKey: template.key,
          },
        },
      });

      for (const requirement of template.staffRequirements) {
        await tx.factoryStaffAssignment.create({
          data: {
            factoryId: factory.id,
            staffRoleId: requirement.staffRoleId,
            factoryProductionLineId: line.id,
            scopeKey: line.id,
            quantity: requirement.requiredQuantity,
            status: StaffAssignmentStatus.ACTIVE,
            metadata: {
              onboardingStarterLine: template.key,
              staffType: requirement.staffRole.staffType,
            },
          },
        });
      }
    }

    for (const requirement of startingStage.staffRequirements) {
      await tx.factoryStaffAssignment.create({
        data: {
          factoryId: factory.id,
          staffRoleId: requirement.staffRoleId,
          factoryProductionLineId: null,
          scopeKey: "FACTORY",
          quantity: requirement.requiredQuantity,
          status: StaffAssignmentStatus.ACTIVE,
          metadata: {
            onboardingSupportStage: startingStage.key,
            staffType: requirement.staffRole.staffType,
          },
        },
      });
    }

    await tx.factoryOperatingStageState.create({
      data: {
        factoryId: factory.id,
        currentStageId: startingStage.id,
        highestReachedStageId: startingStage.id,
        enteredGameDay: simulationConfig?.startingDay ?? 1,
        requirementsMet: true,
        progressSnapshot: {
          onboardingStarterLines: starterTemplateKeys.length,
          onboardingStageKey: startingStage.key,
        },
      },
    });

    await tx.factoryOperatingStageHistory.create({
      data: {
        factoryId: factory.id,
        stageId: startingStage.id,
        enteredGameDay: simulationConfig?.startingDay ?? 1,
        snapshot: {
          source: "onboarding",
          starterLines: starterTemplateKeys,
        },
      },
    });

    await ensureFactoryTaskProgress({
      currentDay: simulationConfig?.startingDay ?? 1,
      factoryId: factory.id,
      tx,
    });

    await tx.playerProfile.update({
      where: { id: playerProfile.id },
      data: {
        factoryName,
        displayCurrency: currencyCode,
      },
    });

    await tx.playerOnboardingDraft.upsert({
      where: { userId: auth.user.id },
      update: {
        sectorId: sector.id,
        factoryName,
        currencyCode,
        draftData: {
          completed: true,
          factoryId: factory.id,
        },
        revision: { increment: 1 },
      },
      create: {
        userId: auth.user.id,
        sectorId: sector.id,
        factoryName,
        currencyCode,
        draftData: {
          completed: true,
          factoryId: factory.id,
        },
        revision: 1,
      },
    });

    await tx.user.update({
      where: { id: auth.user.id },
      data: {
        onboardingStatus: OnboardingStatus.COMPLETED,
        onboardingStep: OnboardingStep.WELCOME,
        onboardingCompletedAt: new Date(),
      },
    });

    return { alreadyCreated: false };
  });

  revalidatePath("/onboarding");
  revalidatePath("/player");
  revalidatePath("/shift");

  return {
    ok: true,
    redirectTo: result.alreadyCreated ? "/player/first-order" : "/player/first-order",
  };
}

async function buildFactorySetupPayload(
  sectorId: string,
  userId: string,
): Promise<OnboardingActionResult> {
  const prisma = getPrisma();
  const [
    sector,
    simulationConfig,
    operatingCostConfig,
    startingStage,
    templates,
    draft,
  ] = await Promise.all([
    prisma.sector.findUnique({
      where: { id: sectorId },
      include: { translations: true },
    }),
    prisma.sectorSimulationConfig.findUnique({
      where: { sectorId },
    }),
    prisma.sectorOperatingCostConfig.findUnique({
      where: { sectorId },
    }),
    prisma.sectorFactoryOperatingStage.findUnique({
      where: {
        sectorId_key: {
          sectorId,
          key: "small_workshop",
        },
      },
      include: {
        translations: true,
        staffRequirements: {
          orderBy: { sortOrder: "asc" },
          include: {
            staffRole: {
              include: { translations: true },
            },
          },
        },
      },
    }),
    prisma.productionLineTemplate.findMany({
      where: {
        sectorId,
        key: { in: [...starterTemplateKeys] },
        status: ContentStatus.ACTIVE,
      },
      include: {
        department: { include: { translations: true } },
        staffRequirements: {
          orderBy: { sortOrder: "asc" },
          include: {
            staffRole: { include: { translations: true } },
          },
        },
        visualAssets: true,
      },
    }),
    prisma.playerOnboardingDraft.findUnique({
      where: { userId },
      select: {
        factoryName: true,
        currencyCode: true,
      },
    }),
  ]);

  if (!sector || sector.status !== "ACTIVE") {
    return {
      ok: false,
      message: "Bu sektör şu anda oynanabilir durumda değil.",
    };
  }

  const orderedTemplates = starterTemplateKeys
    .map((key) => templates.find((template) => template.key === key))
    .filter(Boolean);

  if (orderedTemplates.length !== starterTemplateKeys.length) {
    return {
      ok: false,
      message: "Başlangıç üretim hattı tanımları eksik.",
    };
  }

  if (!startingStage) {
    return {
      ok: false,
      message: "Başlangıç işletme aşaması bulunamadı.",
    };
  }

  const starterLines = orderedTemplates.map((template) => {
    if (!template) {
      throw new Error("Starter template sıralaması çözümlenemedi.");
    }

    const staffRequirements = template.staffRequirements.map((requirement) => ({
      id: requirement.id,
      roleName: displayName(
        requirement.staffRole.translations,
        requirement.staffRole.key,
      ),
      roleKey: requirement.staffRole.key,
      quantity: requirement.requiredQuantity,
      monthlySalaryCents: String(requirement.staffRole.monthlySalaryCents),
    }));
    const staffTotal = staffRequirements.reduce(
      (total, requirement) => total + requirement.quantity,
      0,
    );
    const staffPayrollCents = staffRequirements.reduce(
      (total, requirement) =>
        total + BigInt(requirement.monthlySalaryCents) * BigInt(requirement.quantity),
      BigInt(0),
    );

    return {
      id: template.id,
      key: template.key,
      departmentKey: template.department.key,
      departmentName: displayName(
        template.department.translations,
        template.department.key,
      ),
      grade: template.grade,
      idealStaff: template.idealStaff,
      dailyPointCapacity: template.dailyPointCapacity,
      areaM2: template.areaM2,
      purchaseCostCents: String(template.purchaseCostCents),
      monthlyElectricityBaseCents: String(template.monthlyElectricityBaseCents),
      staffTotal,
      staffPayrollCents: String(staffPayrollCents),
      visual: buildVisuals(template.visualAssets, template.imageUrl),
      staffRequirements,
    };
  });

  const supportStaff = startingStage.staffRequirements.map((requirement) => ({
    id: requirement.id,
    roleName: displayName(
      requirement.staffRole.translations,
      requirement.staffRole.key,
    ),
    roleKey: requirement.staffRole.key,
    quantity: requirement.requiredQuantity,
    monthlySalaryCents: String(requirement.staffRole.monthlySalaryCents),
  }));
  const directStaffTotal = starterLines.reduce(
    (total, line) => total + line.staffTotal,
    0,
  );
  const supportStaffTotal = supportStaff.reduce(
    (total, requirement) => total + requirement.quantity,
    0,
  );
  const totalAreaM2 = calculateFactoryAreaM2(starterLines, startingStage.commonAreaBps);
  const directPayrollCents = starterLines.reduce(
    (total, line) => total + BigInt(line.staffPayrollCents),
    BigInt(0),
  );
  const supportPayrollCents = supportStaff.reduce(
    (total, requirement) =>
      total + BigInt(requirement.monthlySalaryCents) * BigInt(requirement.quantity),
    BigInt(0),
  );
  const monthlyPayrollCents = directPayrollCents + supportPayrollCents;
  const monthlyRentCents =
    BigInt(totalAreaM2) * BigInt(operatingCostConfig?.rentPerM2Cents ?? 0);
  const monthlyElectricityCents =
    starterLines.reduce(
      (total, line) => total + BigInt(line.monthlyElectricityBaseCents),
      BigInt(0),
    ) +
    BigInt(startingStage.facilityElectricityCents) +
    BigInt(startingStage.staffElectricityExtraCents) * BigInt(supportStaffTotal);
  const financePeriodDays =
    simulationConfig?.financePeriodDays ??
    operatingCostConfig?.monthlyWorkDays ??
    22;
  const monthlyMealCents =
    BigInt(operatingCostConfig?.dailyMealPerDirectStaffCents ?? 0) *
      BigInt(directStaffTotal) *
      BigInt(financePeriodDays) +
    BigInt(startingStage.dailySupportMealPerStaffCents) *
      BigInt(supportStaffTotal) *
      BigInt(financePeriodDays);
  const monthlyOverheadCents =
    BigInt(operatingCostConfig?.directStaffOverheadPerStaffCents ?? 0) *
      BigInt(directStaffTotal) +
    BigInt(startingStage.supportOverheadPerStaffCents) * BigInt(supportStaffTotal) +
    BigInt(startingStage.canteenFixedCents) +
    BigInt(startingStage.overheadBaseCents);
  const starterInvestmentValueCents = starterLines.reduce(
    (total, line) => total + BigInt(line.purchaseCostCents),
    BigInt(0),
  );

  return {
    ok: true,
    setup: {
      sector: {
        id: sector.id,
        key: sector.key,
        title: displayName(sector.translations, sector.key),
      },
      simulation: {
        startingCapitalCents: String(simulationConfig?.startingCapitalCents ?? BigInt(100_000_000)),
        defaultCurrencyCode:
          normalizeCurrencyCode(
            draft?.currencyCode ?? simulationConfig?.defaultCurrencyCode ?? CurrencyCode.EUR,
          ),
        startingDay: simulationConfig?.startingDay ?? 1,
        startingLevel: simulationConfig?.startingLevel ?? 1,
        financePeriodDays,
      },
      starterLines,
      supportStaff,
      costs: {
        directStaffTotal,
        supportStaffTotal,
        totalStaff: directStaffTotal + supportStaffTotal,
        totalAreaM2,
        monthlyPayrollCents: String(monthlyPayrollCents),
        monthlyRentCents: String(monthlyRentCents),
        monthlyElectricityCents: String(monthlyElectricityCents),
        monthlyMealCents: String(monthlyMealCents),
        monthlyOverheadCents: String(monthlyOverheadCents),
        monthlyTotalExpenseCents: String(
          monthlyPayrollCents +
            monthlyRentCents +
            monthlyElectricityCents +
            monthlyMealCents +
            monthlyOverheadCents,
        ),
        starterInvestmentValueCents: String(starterInvestmentValueCents),
      },
      draft: {
        factoryName: draft?.factoryName ?? null,
        currencyCode:
          normalizeCurrencyCode(
            draft?.currencyCode ?? simulationConfig?.defaultCurrencyCode ?? CurrencyCode.EUR,
          ),
      },
    },
  };
}

async function requirePlayerUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      message: "Oturum bulunamadı. Lütfen tekrar giriş yap.",
    };
  }

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
    return {
      ok: false as const,
      message: "Admin hesabı için oyuncu onboarding akışı kullanılamaz.",
    };
  }

  return { ok: true as const, user };
}

function displayName(
  translations: Array<{ locale: string; name: string }>,
  fallback: string,
) {
  return (
    translations.find((translation) => translation.locale === locale)?.name ??
    translations[0]?.name ??
    fallback
  );
}

function buildVisuals(
  assets: Array<{ variant: string; url: string }>,
  fallbackUrl: string | null,
) {
  const byVariant = new Map(assets.map((asset) => [asset.variant, asset.url]));

  return {
    detailUrl:
      byVariant.get(ProductionLineAssetVariant.DETAIL) ??
      byVariant.get(ProductionLineAssetVariant.MAP) ??
      fallbackUrl,
    mapUrl:
      byVariant.get(ProductionLineAssetVariant.MAP) ??
      byVariant.get(ProductionLineAssetVariant.CARD) ??
      fallbackUrl,
    cardUrl:
      byVariant.get(ProductionLineAssetVariant.CARD) ??
      byVariant.get(ProductionLineAssetVariant.MAP) ??
      fallbackUrl,
    thumbnailUrl:
      byVariant.get(ProductionLineAssetVariant.THUMBNAIL) ??
      byVariant.get(ProductionLineAssetVariant.CARD) ??
      fallbackUrl,
  };
}

function calculateFactoryAreaM2(
  lines: Array<{ areaM2: number }>,
  commonAreaBps: number,
) {
  const lineArea = lines.reduce((total, line) => total + line.areaM2, 0);

  return Math.round(lineArea * (1 + commonAreaBps / 10000));
}

function normalizeFactoryName(factoryName: string) {
  const trimmed = factoryName.trim().replace(/\s+/g, " ");

  if (trimmed.length < 3) {
    return "";
  }

  return trimmed.slice(0, 80);
}

function normalizeCurrencyCode(currencyCode: string): "EUR" | "USD" {
  return currencyCode === CurrencyCode.USD ? CurrencyCode.USD : CurrencyCode.EUR;
}

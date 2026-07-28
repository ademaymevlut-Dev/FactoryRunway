import {
  FactoryProductionLineStatus,
  FinanceCategory,
  FinanceDirection,
  FinanceSourceType,
  LeasingContractStatus,
  ProductionLineInstallationStatus,
  StaffAssignmentStatus,
  StaffType,
  XpReason,
  type Prisma,
} from "@/generated/prisma/client";
import { recalculateFactoryOperatingStage } from "@/features/game/services/factory-operating-stage";
import { grantFactoryXp } from "@/features/game/services/factory-progression";
import { advanceFactoryTaskProgress } from "@/features/tasks/services/task-definition-service";

import {
  buildLeasingDueReferenceKey,
  calculateFirstLeasingDueDay,
} from "./leasing-contract-schedule";
import { OPERATIONAL_PRODUCTION_LINE_STATUSES } from "./production-line-statuses";

const LINE_ACTIVATION_XP_REWARD = 250;
const OPERATING_STAGE_UP_XP_BONUS = 500;

export type ProductionLineInstallationActivationResult = {
  activated: boolean;
  directStaffCreated: number;
  installationId: string;
  leasingContractId: string | null;
  nextDueDay: number | null;
  operatingStageChanged: boolean;
  operatingStageKey: string | null;
  productionLineId: string;
  supportStaffCreated: number;
};

export async function activateReadyProductionLineInstallations(input: {
  currentDay: number;
  factoryId: string;
  tx: Prisma.TransactionClient;
}) {
  const readyInstallations =
    await input.tx.factoryProductionLineInstallation.findMany({
      where: {
        factoryId: input.factoryId,
        readyDay: { lte: input.currentDay },
        status: {
          in: [
            ProductionLineInstallationStatus.PENDING,
            ProductionLineInstallationStatus.READY,
          ],
        },
      },
      orderBy: [{ readyDay: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
  const results: ProductionLineInstallationActivationResult[] = [];

  for (const installation of readyInstallations) {
    results.push(
      await activateProductionLineInstallation({
        currentDay: input.currentDay,
        installationId: installation.id,
        tx: input.tx,
      }),
    );
  }

  return results;
}

export async function activateProductionLineInstallation(input: {
  currentDay: number;
  installationId: string;
  tx: Prisma.TransactionClient;
}): Promise<ProductionLineInstallationActivationResult> {
  const installation =
    await input.tx.factoryProductionLineInstallation.findUniqueOrThrow({
      where: { id: input.installationId },
      select: {
        activatedDay: true,
        factoryId: true,
        id: true,
        readyDay: true,
        status: true,
        factoryProductionLine: {
          select: {
            acquisitionType: true,
            departmentId: true,
            id: true,
            status: true,
            productionLineTemplateId: true,
            department: {
              select: {
                key: true,
                departmentGroup: {
                  select: {
                    id: true,
                    key: true,
                    semanticKey: true,
                  },
                },
              },
            },
            productionLineTemplate: {
              select: {
                staffRequirements: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    requiredQuantity: true,
                    staffRole: {
                      select: {
                        id: true,
                        staffType: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  const productionLine = installation.factoryProductionLine;

  if (installation.status === ProductionLineInstallationStatus.ACTIVATED) {
    const contract =
      await input.tx.factoryLeasingContract.findUnique({
        where: { productionLineId: productionLine.id },
        select: { id: true, nextDueDay: true },
      });

    return {
      activated: false,
      directStaffCreated: 0,
      installationId: installation.id,
      leasingContractId: contract?.id ?? null,
      nextDueDay: contract?.nextDueDay ?? null,
      operatingStageChanged: false,
      operatingStageKey: null,
      productionLineId: productionLine.id,
      supportStaffCreated: 0,
    };
  }
  if (
    installation.status === ProductionLineInstallationStatus.CANCELLED ||
    productionLine.status !== FactoryProductionLineStatus.INSTALLING
  ) {
    throw new Error(
      "Production line installation is not eligible for activation.",
    );
  }
  if (installation.readyDay > input.currentDay) {
    throw new Error("Production line installation is not ready yet.");
  }
  if (
    productionLine.productionLineTemplate.staffRequirements.length === 0 ||
    productionLine.productionLineTemplate.staffRequirements.some(
      (requirement) =>
        requirement.staffRole.staffType !== StaffType.DIRECT_PRODUCTION,
    )
  ) {
    throw new Error("Production line direct staff config is incomplete.");
  }

  const readyClaim =
    await input.tx.factoryProductionLineInstallation.updateMany({
      where: {
        id: installation.id,
        status: {
          in: [
            ProductionLineInstallationStatus.PENDING,
            ProductionLineInstallationStatus.READY,
          ],
        },
      },
      data: { status: ProductionLineInstallationStatus.READY },
    });

  if (readyClaim.count !== 1) {
    throw new Error(
      "Production line installation changed while activating.",
    );
  }

  const lineClaim = await input.tx.factoryProductionLine.updateMany({
    where: {
      id: productionLine.id,
      status: FactoryProductionLineStatus.INSTALLING,
    },
    data: {
      installedDay: input.currentDay,
      status: FactoryProductionLineStatus.IDLE,
    },
  });

  if (lineClaim.count !== 1) {
    throw new Error("Production line changed while activating.");
  }

  let directStaffCreated = 0;

  for (const requirement of productionLine.productionLineTemplate
    .staffRequirements) {
    await input.tx.factoryStaffAssignment.upsert({
      where: {
        factoryId_staffRoleId_scopeKey: {
          factoryId: installation.factoryId,
          scopeKey: productionLine.id,
          staffRoleId: requirement.staffRole.id,
        },
      },
      create: {
        factoryId: installation.factoryId,
        factoryProductionLineId: productionLine.id,
        metadata: {
          installationId: installation.id,
          source: "production-line-installation-activation",
        },
        quantity: requirement.requiredQuantity,
        scopeKey: productionLine.id,
        staffRoleId: requirement.staffRole.id,
        status: StaffAssignmentStatus.ACTIVE,
      },
      update: {
        factoryProductionLineId: productionLine.id,
        metadata: {
          installationId: installation.id,
          source: "production-line-installation-activation",
        },
        quantity: requirement.requiredQuantity,
        status: StaffAssignmentStatus.ACTIVE,
      },
    });
    directStaffCreated += requirement.requiredQuantity;
  }

  const firstStageResult = await recalculateFactoryOperatingStage({
    factoryId: installation.factoryId,
    source: "production-line-installation-activation",
    tx: input.tx,
  });
  const supportStaffCreated = await syncFactorySupportStaffForStage({
    factoryId: installation.factoryId,
    installationId: installation.id,
    stageId: firstStageResult.currentStageId,
    tx: input.tx,
  });

  await recalculateFactoryOperatingStage({
    factoryId: installation.factoryId,
    source: "production-line-installation-activation",
    tx: input.tx,
  });

  const contract =
    await input.tx.factoryLeasingContract.findUnique({
      where: { productionLineId: productionLine.id },
      select: {
        id: true,
        installmentCount: true,
        monthlyPaymentCents: true,
        status: true,
      },
    });
  let nextDueDay: number | null = null;

  if (contract) {
    if (
      contract.status !== LeasingContractStatus.PENDING_ACTIVATION &&
      contract.status !== LeasingContractStatus.ACTIVE
    ) {
      throw new Error(
        "Leasing contract is not eligible for installation activation.",
      );
    }

    nextDueDay = calculateFirstLeasingDueDay(input.currentDay);

    await input.tx.factoryLeasingContract.update({
      where: { id: contract.id },
      data: {
        nextDueDay,
        startedDay: input.currentDay,
        status: LeasingContractStatus.ACTIVE,
      },
    });
    await input.tx.factoryFinanceDue.upsert({
      where: {
        referenceKey: buildLeasingDueReferenceKey({
          contractId: contract.id,
          installmentIndex: 1,
        }),
      },
      create: {
        amountCents: contract.monthlyPaymentCents,
        category: FinanceCategory.LEASING_PAYMENT,
        createdDay: input.currentDay,
        description: "finance.leasingInstallment",
        direction: FinanceDirection.EXPENSE,
        dueDay: nextDueDay,
        factoryId: installation.factoryId,
        metadata: {
          installmentCount: contract.installmentCount,
          installmentIndex: 1,
          installationId: installation.id,
          translationKey: "finance.leasingInstallment",
        },
        periodIndex: 1,
        referenceKey: buildLeasingDueReferenceKey({
          contractId: contract.id,
          installmentIndex: 1,
        }),
        sourceId: contract.id,
        sourceType: FinanceSourceType.LEASING_CONTRACT,
      },
      update: {},
    });
  }

  const activationTaskContext =
    await getActivationTaskContext({
      departmentGroupId:
        productionLine.department.departmentGroup?.id ?? null,
      departmentGroupSemanticKey:
        productionLine.department.departmentGroup?.semanticKey ?? null,
      factoryId: installation.factoryId,
      tx: input.tx,
    });

  await advanceFactoryTaskProgress({
    currentDay: input.currentDay,
    factoryId: installation.factoryId,
    event: {
      objectiveType: "ACQUIRE_PRODUCTION_LINE",
      metadata: {
        acquisitionType: productionLine.acquisitionType,
        departmentKey: productionLine.department.key,
        productionLineId: productionLine.id,
        ...activationTaskContext,
        ...(productionLine.department.departmentGroup?.key
          ? {
              departmentGroupKey:
                productionLine.department.departmentGroup.key,
            }
          : {}),
        ...(productionLine.department.departmentGroup?.semanticKey
          ? {
              departmentGroupSemanticKey:
                productionLine.department.departmentGroup.semanticKey,
            }
          : {}),
      },
    },
    tx: input.tx,
  });

  await grantFactoryXp({
    amountXp:
      LINE_ACTIVATION_XP_REWARD +
      (firstStageResult.stageChanged
        ? OPERATING_STAGE_UP_XP_BONUS
        : 0),
    factoryId: installation.factoryId,
    gameDay: input.currentDay,
    metadata: {
      baseXp: LINE_ACTIVATION_XP_REWARD,
      installationId: installation.id,
      operatingStageChanged: firstStageResult.stageChanged,
      operatingStageKey: firstStageResult.currentStageKey,
      productionLineId: productionLine.id,
      productionLineTemplateId:
        productionLine.productionLineTemplateId,
      source: "production-line-installation-activation",
      stageUpBonusXp: firstStageResult.stageChanged
        ? OPERATING_STAGE_UP_XP_BONUS
        : 0,
    },
    reason: firstStageResult.stageChanged
      ? XpReason.SCALE_UP
      : XpReason.FACTORY_EXPANSION,
    referenceKey: `installation-xp:${installation.id}`,
    sourceId: installation.id,
    sourceType: "production_line_installation",
    tx: input.tx,
  });

  await input.tx.factoryProductionLineInstallation.update({
    where: { id: installation.id },
    data: {
      activatedDay: input.currentDay,
      metadata: {
        activationReferenceKey: `installation-activation:${installation.id}`,
        directStaffCreated,
        leasingContractId: contract?.id ?? null,
        nextDueDay,
        operatingStageChanged: firstStageResult.stageChanged,
        operatingStageKey: firstStageResult.currentStageKey,
        supportStaffCreated,
      },
      status: ProductionLineInstallationStatus.ACTIVATED,
    },
  });

  return {
    activated: true,
    directStaffCreated,
    installationId: installation.id,
    leasingContractId: contract?.id ?? null,
    nextDueDay,
    operatingStageChanged: firstStageResult.stageChanged,
    operatingStageKey: firstStageResult.currentStageKey,
    productionLineId: productionLine.id,
    supportStaffCreated,
  };
}

async function syncFactorySupportStaffForStage(input: {
  factoryId: string;
  installationId: string;
  stageId: string;
  tx: Prisma.TransactionClient;
}) {
  const stage =
    await input.tx.sectorFactoryOperatingStage.findUniqueOrThrow({
      where: { id: input.stageId },
      select: {
        staffRequirements: {
          orderBy: { sortOrder: "asc" },
          select: {
            requiredQuantity: true,
            staffRoleId: true,
          },
        },
      },
    });
  const currentAssignments =
    await input.tx.factoryStaffAssignment.findMany({
      where: {
        factoryId: input.factoryId,
        factoryProductionLineId: null,
        staffRoleId: {
          in: stage.staffRequirements.map(
            (requirement) => requirement.staffRoleId,
          ),
        },
      },
      select: {
        quantity: true,
        staffRoleId: true,
      },
    });
  const currentQuantityByRoleId = new Map(
    currentAssignments.map((assignment) => [
      assignment.staffRoleId,
      assignment.quantity,
    ]),
  );
  let createdCount = 0;

  for (const requirement of stage.staffRequirements) {
    const currentQuantity =
      currentQuantityByRoleId.get(requirement.staffRoleId) ?? 0;

    if (currentQuantity >= requirement.requiredQuantity) continue;

    await input.tx.factoryStaffAssignment.upsert({
      where: {
        factoryId_staffRoleId_scopeKey: {
          factoryId: input.factoryId,
          scopeKey: "FACTORY",
          staffRoleId: requirement.staffRoleId,
        },
      },
      create: {
        factoryId: input.factoryId,
        factoryProductionLineId: null,
        metadata: {
          installationId: input.installationId,
          source: "production-line-installation-support-sync",
        },
        quantity: requirement.requiredQuantity,
        scopeKey: "FACTORY",
        staffRoleId: requirement.staffRoleId,
        status: StaffAssignmentStatus.ACTIVE,
      },
      update: {
        factoryProductionLineId: null,
        metadata: {
          installationId: input.installationId,
          source: "production-line-installation-support-sync",
        },
        quantity: requirement.requiredQuantity,
        status: StaffAssignmentStatus.ACTIVE,
      },
    });
    createdCount += requirement.requiredQuantity - currentQuantity;
  }

  return createdCount;
}

async function getActivationTaskContext(input: {
  departmentGroupId: string | null;
  departmentGroupSemanticKey: string | null;
  factoryId: string;
  tx: Prisma.TransactionClient;
}) {
  const [
    activeDepartmentGroupLineCount,
    activeSemanticGroupLineCount,
  ] = await Promise.all([
    input.departmentGroupId
      ? input.tx.factoryProductionLine.count({
          where: {
            department: {
              departmentGroupId: input.departmentGroupId,
            },
            factoryId: input.factoryId,
            status: {
              in: [...OPERATIONAL_PRODUCTION_LINE_STATUSES],
            },
          },
        })
      : Promise.resolve(0),
    input.departmentGroupSemanticKey
      ? input.tx.factoryProductionLine.count({
          where: {
            department: {
              departmentGroup: {
                semanticKey: input.departmentGroupSemanticKey,
              },
            },
            factoryId: input.factoryId,
            status: {
              in: [...OPERATIONAL_PRODUCTION_LINE_STATUSES],
            },
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    activeDepartmentGroupLineCount,
    ...(input.departmentGroupSemanticKey
      ? { activeSemanticGroupLineCount }
      : {}),
  };
}

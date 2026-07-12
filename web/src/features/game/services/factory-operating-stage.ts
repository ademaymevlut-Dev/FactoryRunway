import {
  ContentStatus,
  FactoryProductionLineStatus,
  StaffAssignmentStatus,
  type Prisma,
} from "@/generated/prisma/client";

type OperatingStageClient = Prisma.TransactionClient;

export type OperatingStageThreshold = {
  id: string;
  key: string;
  minProductionLines: number;
  maxProductionLines: number | null;
  sortOrder: number;
};

export function pickEligibleOperatingStage<T extends OperatingStageThreshold>(
  stages: T[],
  activeProductionLineCount: number,
) {
  return (
    stages
      .filter(
        (stage) =>
          activeProductionLineCount >= stage.minProductionLines &&
          (stage.maxProductionLines === null ||
            activeProductionLineCount <= stage.maxProductionLines),
      )
      .sort((first, second) => second.sortOrder - first.sortOrder)[0] ?? null
  );
}

export async function recalculateFactoryOperatingStage(input: {
  factoryId: string;
  tx: OperatingStageClient;
}) {
  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: {
      currentDay: true,
      sectorId: true,
      operatingStageState: {
        select: {
          currentStageId: true,
          highestReachedStageId: true,
          highestReachedStage: { select: { sortOrder: true } },
        },
      },
    },
  });
  const activeProductionLineCount = await input.tx.factoryProductionLine.count({
    where: {
      factoryId: input.factoryId,
      status: {
        notIn: [
          FactoryProductionLineStatus.SOLD,
          FactoryProductionLineStatus.DISABLED,
        ],
      },
    },
  });
  const stages = await input.tx.sectorFactoryOperatingStage.findMany({
    where: {
      sectorId: factory.sectorId,
      status: ContentStatus.ACTIVE,
    },
    orderBy: { sortOrder: "desc" },
    select: {
      id: true,
      key: true,
      maxProductionLines: true,
      minProductionLines: true,
      sortOrder: true,
      staffRequirements: {
        select: {
          requiredQuantity: true,
          staffRoleId: true,
        },
      },
    },
  });
  const nextStage = pickEligibleOperatingStage(
    stages,
    activeProductionLineCount,
  );

  if (!nextStage) {
    throw new Error(
      `No operating stage covers ${activeProductionLineCount} active lines.`,
    );
  }

  const staffRoleIds = nextStage.staffRequirements.map(
    (requirement) => requirement.staffRoleId,
  );
  const staffTotals =
    staffRoleIds.length > 0
      ? await input.tx.factoryStaffAssignment.groupBy({
          by: ["staffRoleId"],
          where: {
            factoryId: input.factoryId,
            factoryProductionLineId: null,
            staffRoleId: { in: staffRoleIds },
            status: StaffAssignmentStatus.ACTIVE,
          },
          _sum: { quantity: true },
        })
      : [];
  const staffByRoleId = new Map(
    staffTotals.map((item) => [item.staffRoleId, item._sum.quantity ?? 0]),
  );
  const requirementsMet = nextStage.staffRequirements.every(
    (requirement) =>
      (staffByRoleId.get(requirement.staffRoleId) ?? 0) >=
      requirement.requiredQuantity,
  );
  const stageChanged =
    factory.operatingStageState?.currentStageId !== nextStage.id;
  const progressSnapshot = {
    activeProductionLineCount,
    requirementsMet,
    stageKey: nextStage.key,
    source: "production-line-purchase",
  };

  if (!factory.operatingStageState) {
    await input.tx.factoryOperatingStageState.create({
      data: {
        currentStageId: nextStage.id,
        enteredGameDay: factory.currentDay,
        factoryId: input.factoryId,
        highestReachedStageId: nextStage.id,
        progressSnapshot,
        requirementsMet,
      },
    });
  } else {
    const highestReachedStageId =
      nextStage.sortOrder >
      factory.operatingStageState.highestReachedStage.sortOrder
        ? nextStage.id
        : factory.operatingStageState.highestReachedStageId;

    await input.tx.factoryOperatingStageState.update({
      where: { factoryId: input.factoryId },
      data: {
        currentStageId: nextStage.id,
        enteredGameDay: stageChanged ? factory.currentDay : undefined,
        highestReachedStageId,
        progressSnapshot,
        requirementsMet,
      },
    });
  }

  if (stageChanged) {
    await input.tx.factoryOperatingStageHistory.updateMany({
      where: {
        exitedGameDay: null,
        factoryId: input.factoryId,
      },
      data: { exitedGameDay: factory.currentDay },
    });
    await input.tx.factoryOperatingStageHistory.upsert({
      where: {
        factoryId_stageId_enteredGameDay: {
          enteredGameDay: factory.currentDay,
          factoryId: input.factoryId,
          stageId: nextStage.id,
        },
      },
      create: {
        enteredGameDay: factory.currentDay,
        factoryId: input.factoryId,
        snapshot: progressSnapshot,
        stageId: nextStage.id,
      },
      update: { snapshot: progressSnapshot },
    });
  }

  return {
    activeProductionLineCount,
    currentStageId: nextStage.id,
    currentStageKey: nextStage.key,
    requirementsMet,
    stageChanged,
  };
}

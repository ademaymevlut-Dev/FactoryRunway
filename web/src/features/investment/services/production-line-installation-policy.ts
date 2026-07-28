import {
  ContentStatus,
  ProductionLineInstallationStatus,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

type InstallationPolicyClient = Prisma.TransactionClient | PrismaClient;

export type ProductionLineInstallationRuleSnapshot = {
  delayDays: number;
  id: string;
  maxConcurrentInstalls: number;
  maximumAcquisitionSequence: number | null;
  minimumAcquisitionSequence: number;
  minimumRemainingDays: number;
  tokenSkipCostPerDay: number;
};

export type ProductionLineInstallationSchedule = {
  acquisitionSequence: number;
  concurrentSlot: number | null;
  delayDays: number;
  originalReadyDay: number;
  readyDay: number;
  rule: ProductionLineInstallationRuleSnapshot;
};

export class ProductionLineInstallationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionLineInstallationConfigurationError";
  }
}

export function buildProductionLineInstallationReferenceKey(input: {
  acquisitionReferenceKey: string;
  factoryId: string;
}) {
  return `LINE_INSTALLATION:${input.factoryId}:${input.acquisitionReferenceKey}`;
}

export async function reserveProductionLineAcquisitionSequence(input: {
  factoryId: string;
  tx: Prisma.TransactionClient;
}) {
  const [factory, aggregate] = await Promise.all([
    input.tx.factory.findUniqueOrThrow({
      where: { id: input.factoryId },
      select: { nextProductionLineAcquisitionSequence: true },
    }),
    input.tx.factoryProductionLine.aggregate({
      where: { factoryId: input.factoryId },
      _max: { acquisitionSequence: true },
    }),
  ]);
  const minimumNextSequence =
    (aggregate._max.acquisitionSequence ?? 0) + 1;

  if (
    factory.nextProductionLineAcquisitionSequence < minimumNextSequence
  ) {
    await input.tx.factory.updateMany({
      where: {
        id: input.factoryId,
        nextProductionLineAcquisitionSequence: {
          lt: minimumNextSequence,
        },
      },
      data: {
        nextProductionLineAcquisitionSequence: minimumNextSequence,
      },
    });
  }

  const reserved = await input.tx.factory.update({
    where: { id: input.factoryId },
    data: {
      nextProductionLineAcquisitionSequence: { increment: 1 },
    },
    select: { nextProductionLineAcquisitionSequence: true },
  });

  return reserved.nextProductionLineAcquisitionSequence - 1;
}

export async function peekNextProductionLineAcquisitionSequence(input: {
  factoryId: string;
  prisma: InstallationPolicyClient;
}) {
  const [factory, aggregate] = await Promise.all([
    input.prisma.factory.findUniqueOrThrow({
      where: { id: input.factoryId },
      select: { nextProductionLineAcquisitionSequence: true },
    }),
    input.prisma.factoryProductionLine.aggregate({
      where: { factoryId: input.factoryId },
      _max: { acquisitionSequence: true },
    }),
  ]);

  return Math.max(
    factory.nextProductionLineAcquisitionSequence,
    (aggregate._max.acquisitionSequence ?? 0) + 1,
  );
}

export async function resolveProductionLineInstallationPolicy(input: {
  acquisitionSequence: number;
  prisma: InstallationPolicyClient;
  sectorId: string;
}): Promise<ProductionLineInstallationRuleSnapshot> {
  assertPositiveInteger(
    input.acquisitionSequence,
    "Acquisition sequence must be a positive integer.",
  );

  const rules =
    await input.prisma.sectorProductionLineInstallationRule.findMany({
      where: {
        minAcquisitionSequence: { lte: input.acquisitionSequence },
        sectorId: input.sectorId,
        status: ContentStatus.ACTIVE,
        OR: [
          { maxAcquisitionSequence: null },
          { maxAcquisitionSequence: { gte: input.acquisitionSequence } },
        ],
      },
      orderBy: { minAcquisitionSequence: "desc" },
      take: 2,
      select: {
        delayDays: true,
        id: true,
        maxAcquisitionSequence: true,
        maxConcurrentInstalls: true,
        minAcquisitionSequence: true,
        minimumRemainingDays: true,
        tokenSkipCostPerDay: true,
      },
    });

  if (rules.length !== 1) {
    throw new ProductionLineInstallationConfigurationError(
      rules.length === 0
        ? `No active installation rule covers acquisition sequence ${input.acquisitionSequence}.`
        : `Multiple active installation rules cover acquisition sequence ${input.acquisitionSequence}.`,
    );
  }

  const rule = rules[0];

  if (!rule) {
    throw new ProductionLineInstallationConfigurationError(
      "Installation rule resolution returned an empty result.",
    );
  }
  validateInstallationRule(rule);

  return {
    delayDays: rule.delayDays,
    id: rule.id,
    maxConcurrentInstalls: rule.maxConcurrentInstalls,
    maximumAcquisitionSequence: rule.maxAcquisitionSequence,
    minimumAcquisitionSequence: rule.minAcquisitionSequence,
    minimumRemainingDays: rule.minimumRemainingDays,
    tokenSkipCostPerDay: rule.tokenSkipCostPerDay,
  };
}

export async function calculateProductionLineReadyDay(input: {
  acquisitionSequence: number;
  factoryId: string;
  prisma: InstallationPolicyClient;
  requestedDay: number;
  rule: ProductionLineInstallationRuleSnapshot;
}): Promise<ProductionLineInstallationSchedule> {
  assertPositiveInteger(input.requestedDay, "Requested day must be positive.");

  const originalReadyDay = input.requestedDay + input.rule.delayDays;

  if (input.rule.delayDays === 0) {
    return {
      acquisitionSequence: input.acquisitionSequence,
      concurrentSlot: null,
      delayDays: 0,
      originalReadyDay,
      readyDay: originalReadyDay,
      rule: input.rule,
    };
  }

  const existingInstallations =
    await input.prisma.factoryProductionLineInstallation.findMany({
      where: {
        factoryId: input.factoryId,
        ruleId: input.rule.id,
        status: {
          in: [
            ProductionLineInstallationStatus.PENDING,
            ProductionLineInstallationStatus.READY,
          ],
        },
      },
      orderBy: [
        { readyDay: "asc" },
        { concurrentSlot: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
      select: {
        concurrentSlot: true,
        readyDay: true,
      },
    });
  const slotReadyDays = Array.from(
    { length: input.rule.maxConcurrentInstalls },
    () => input.requestedDay,
  );

  for (const installation of existingInstallations) {
    const configuredSlot = installation.concurrentSlot;
    const slotIndex =
      configuredSlot !== null &&
      configuredSlot >= 1 &&
      configuredSlot <= slotReadyDays.length
        ? configuredSlot - 1
        : findEarliestSlotIndex(slotReadyDays);

    slotReadyDays[slotIndex] = Math.max(
      slotReadyDays[slotIndex] ?? input.requestedDay,
      installation.readyDay,
    );
  }

  const slotIndex = findEarliestSlotIndex(slotReadyDays);
  const slotAvailableDay = slotReadyDays[slotIndex] ?? input.requestedDay;
  const readyDay =
    Math.max(input.requestedDay, slotAvailableDay) + input.rule.delayDays;

  return {
    acquisitionSequence: input.acquisitionSequence,
    concurrentSlot: slotIndex + 1,
    delayDays: readyDay - input.requestedDay,
    originalReadyDay,
    readyDay,
    rule: input.rule,
  };
}

export async function resolveProductionLineInstallationSchedule(input: {
  acquisitionSequence: number;
  factoryId: string;
  prisma: InstallationPolicyClient;
  requestedDay: number;
  sectorId: string;
}) {
  const rule = await resolveProductionLineInstallationPolicy({
    acquisitionSequence: input.acquisitionSequence,
    prisma: input.prisma,
    sectorId: input.sectorId,
  });

  return calculateProductionLineReadyDay({
    acquisitionSequence: input.acquisitionSequence,
    factoryId: input.factoryId,
    prisma: input.prisma,
    requestedDay: input.requestedDay,
    rule,
  });
}

export async function getProductionLineInstallationPreview(input: {
  factoryId: string;
  prisma: InstallationPolicyClient;
  requestedDay: number;
  sectorId: string;
}) {
  const acquisitionSequence =
    await peekNextProductionLineAcquisitionSequence({
      factoryId: input.factoryId,
      prisma: input.prisma,
    });

  return resolveProductionLineInstallationSchedule({
    acquisitionSequence,
    factoryId: input.factoryId,
    prisma: input.prisma,
    requestedDay: input.requestedDay,
    sectorId: input.sectorId,
  });
}

function findEarliestSlotIndex(slotReadyDays: number[]) {
  let selectedIndex = 0;

  for (let index = 1; index < slotReadyDays.length; index += 1) {
    if (
      (slotReadyDays[index] ?? Number.MAX_SAFE_INTEGER) <
      (slotReadyDays[selectedIndex] ?? Number.MAX_SAFE_INTEGER)
    ) {
      selectedIndex = index;
    }
  }

  return selectedIndex;
}

function validateInstallationRule(rule: {
  delayDays: number;
  maxConcurrentInstalls: number;
  minAcquisitionSequence: number;
  minimumRemainingDays: number;
  tokenSkipCostPerDay: number;
}) {
  assertPositiveInteger(
    rule.minAcquisitionSequence,
    "Installation rule minimum sequence must be positive.",
  );
  assertPositiveInteger(
    rule.maxConcurrentInstalls,
    "Installation rule concurrent slot count must be positive.",
  );

  if (
    !Number.isInteger(rule.delayDays) ||
    rule.delayDays < 0 ||
    !Number.isInteger(rule.minimumRemainingDays) ||
    rule.minimumRemainingDays < 0 ||
    !Number.isInteger(rule.tokenSkipCostPerDay) ||
    rule.tokenSkipCostPerDay < 0 ||
    rule.minimumRemainingDays > rule.delayDays
  ) {
    throw new ProductionLineInstallationConfigurationError(
      "Installation rule contains invalid delay or token values.",
    );
  }
}

function assertPositiveInteger(value: number, message: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ProductionLineInstallationConfigurationError(message);
  }
}

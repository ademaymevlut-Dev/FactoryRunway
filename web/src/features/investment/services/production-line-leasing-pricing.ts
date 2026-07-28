import {
  ContentStatus,
  type Prisma,
} from "@/generated/prisma/client";

const MAX_INT_32 = 2_147_483_647;
const BASIS_POINTS_DIVISOR = BigInt(10_000);
const LEASING_BALANCE_VERSION = "leasing-v1";

export const PRODUCTION_LINE_LEASING_TERMS = [
  {
    downPaymentBps: 2_000,
    installmentCount: 24,
    sortOrder: 10,
    termYears: 2,
    totalCostBps: 11_500,
  },
  {
    downPaymentBps: 1_500,
    installmentCount: 36,
    sortOrder: 20,
    termYears: 3,
    totalCostBps: 12_500,
  },
  {
    downPaymentBps: 1_000,
    installmentCount: 60,
    sortOrder: 30,
    termYears: 5,
    totalCostBps: 14_500,
  },
] as const;

type LeasingTerm = (typeof PRODUCTION_LINE_LEASING_TERMS)[number];

export type ProductionLineLeasingPricing = {
  downPaymentCents: number;
  installmentAmountCents: number;
  installmentCount: number;
  termYears: number;
  totalCostCents: number;
};

type LeasingOfferWriter = Pick<
  Prisma.TransactionClient,
  "productionLineLeasingOffer"
>;

export function calculateProductionLineLeasingPricing(input: {
  installmentCount: number;
  purchaseCostCents: number;
  termYears: number;
}): ProductionLineLeasingPricing {
  const term = findLeasingTerm(input);

  if (!term) {
    throw new Error("Unsupported production line leasing term.");
  }
  if (
    !Number.isSafeInteger(input.purchaseCostCents) ||
    input.purchaseCostCents < 0
  ) {
    throw new Error("Production line purchase cost must be non-negative cents.");
  }

  const purchaseCostCents = BigInt(input.purchaseCostCents);
  const downPaymentCents = divideRounded(
    purchaseCostCents * BigInt(term.downPaymentBps),
    BASIS_POINTS_DIVISOR,
  );
  const targetTotalCents = divideRounded(
    purchaseCostCents * BigInt(term.totalCostBps),
    BASIS_POINTS_DIVISOR,
  );
  const installmentAmountCents = divideCeiling(
    targetTotalCents - downPaymentCents,
    BigInt(term.installmentCount),
  );
  const totalCostCents =
    downPaymentCents +
    installmentAmountCents * BigInt(term.installmentCount);

  return {
    downPaymentCents: toDatabaseInt(downPaymentCents),
    installmentAmountCents: toDatabaseInt(installmentAmountCents),
    installmentCount: term.installmentCount,
    termYears: term.termYears,
    totalCostCents: toDatabaseInt(totalCostCents),
  };
}

export async function syncProductionLineLeasingOffers(
  prisma: LeasingOfferWriter,
  input: {
    activateExistingOffers?: boolean;
    productionLineTemplateId: string;
    purchaseCostCents: number;
  },
) {
  for (const term of PRODUCTION_LINE_LEASING_TERMS) {
    const pricing = calculateProductionLineLeasingPricing({
      installmentCount: term.installmentCount,
      purchaseCostCents: input.purchaseCostCents,
      termYears: term.termYears,
    });

    await prisma.productionLineLeasingOffer.upsert({
      where: {
        productionLineTemplateId_termYears: {
          productionLineTemplateId: input.productionLineTemplateId,
          termYears: term.termYears,
        },
      },
      create: {
        ...pricing,
        metadata: { balanceVersion: LEASING_BALANCE_VERSION },
        productionLineTemplateId: input.productionLineTemplateId,
        sortOrder: term.sortOrder,
        status: ContentStatus.ACTIVE,
      },
      update: {
        ...pricing,
        metadata: { balanceVersion: LEASING_BALANCE_VERSION },
        sortOrder: term.sortOrder,
        ...(input.activateExistingOffers
          ? { status: ContentStatus.ACTIVE }
          : {}),
      },
    });
  }
}

function findLeasingTerm(input: {
  installmentCount: number;
  termYears: number;
}): LeasingTerm | undefined {
  return PRODUCTION_LINE_LEASING_TERMS.find(
    (term) =>
      term.termYears === input.termYears &&
      term.installmentCount === input.installmentCount,
  );
}

function divideRounded(value: bigint, divisor: bigint) {
  return (value + divisor / BigInt(2)) / divisor;
}

function divideCeiling(value: bigint, divisor: bigint) {
  return (value + divisor - BigInt(1)) / divisor;
}

function toDatabaseInt(value: bigint) {
  if (value < BigInt(0) || value > BigInt(MAX_INT_32)) {
    throw new Error("Calculated leasing amount exceeds the database range.");
  }

  return Number(value);
}

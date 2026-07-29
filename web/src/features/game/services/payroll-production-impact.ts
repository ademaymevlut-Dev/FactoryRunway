import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  type Prisma,
} from "@/generated/prisma/client";

const PAYROLL_PENALTY_PER_DAY_BPS = 500;
const MAX_PAYROLL_PENALTY_BPS = 3_000;
const FULL_CAPACITY_BPS = 10_000;

type PayrollDueInput = {
  amountCents: bigint;
  dueDay: number;
  id?: string;
  settledAmountCents: bigint;
};

export type PayrollProductionImpact = {
  capacityMultiplierBps: number;
  dueIds: string[];
  oldestDueDay: number | null;
  outstandingCents: bigint;
  overdueDays: number;
  productionPenaltyBps: number;
};

export function calculatePayrollProductionImpact(input: {
  currentDay: number;
  dues: readonly PayrollDueInput[];
}): PayrollProductionImpact {
  const openDues = input.dues
    .map((due) => ({
      ...due,
      outstandingCents:
        due.amountCents > due.settledAmountCents
          ? due.amountCents - due.settledAmountCents
          : BigInt(0),
    }))
    .filter(
      (due) =>
        due.dueDay <= input.currentDay &&
        due.outstandingCents > BigInt(0),
    );
  const oldestDueDay =
    openDues.length > 0
      ? Math.min(...openDues.map((due) => due.dueDay))
      : null;
  const overdueDays =
    oldestDueDay === null
      ? 0
      : Math.max(0, input.currentDay - oldestDueDay);
  const productionPenaltyBps = Math.min(
    MAX_PAYROLL_PENALTY_BPS,
    overdueDays * PAYROLL_PENALTY_PER_DAY_BPS,
  );

  return {
    capacityMultiplierBps: FULL_CAPACITY_BPS - productionPenaltyBps,
    dueIds: openDues
      .map((due) => due.id)
      .filter((id): id is string => Boolean(id)),
    oldestDueDay,
    outstandingCents: openDues.reduce(
      (total, due) => total + due.outstandingCents,
      BigInt(0),
    ),
    overdueDays,
    productionPenaltyBps,
  };
}

export async function getFactoryPayrollProductionImpact(input: {
  factoryId: string;
  gameDay: number;
  tx: Prisma.TransactionClient;
}) {
  const dues = await input.tx.factoryFinanceDue.findMany({
    where: {
      category: FinanceCategory.PAYROLL,
      direction: FinanceDirection.EXPENSE,
      dueDay: { lte: input.gameDay },
      factoryId: input.factoryId,
      status: {
        in: [
          FinanceDueStatus.PENDING,
          FinanceDueStatus.PARTIAL,
          FinanceDueStatus.OVERDUE,
        ],
      },
    },
    orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      amountCents: true,
      dueDay: true,
      id: true,
      settledAmountCents: true,
    },
  });

  return calculatePayrollProductionImpact({
    currentDay: input.gameDay,
    dues,
  });
}

export function toPayrollProductionImpactMetadata(
  impact: PayrollProductionImpact,
): Prisma.InputJsonObject {
  return {
    capacityMultiplierBps: impact.capacityMultiplierBps,
    oldestDueDay: impact.oldestDueDay,
    outstandingCents: impact.outstandingCents.toString(),
    overdueDays: impact.overdueDays,
    productionPenaltyBps: impact.productionPenaltyBps,
  };
}

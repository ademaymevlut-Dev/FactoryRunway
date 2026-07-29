import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  type FinanceSourceType,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

export type FinanceLedgerClient = Prisma.TransactionClient;

const OPEN_DUE_STATUSES = [
  FinanceDueStatus.PENDING,
  FinanceDueStatus.PARTIAL,
  FinanceDueStatus.OVERDUE,
] as const;

export const AUTO_SETTLEMENT_EXPENSE_CATEGORIES = [
  FinanceCategory.PAYROLL,
  FinanceCategory.OUTSOURCE_COST,
  FinanceCategory.ELECTRICITY,
  FinanceCategory.RENT,
  FinanceCategory.MEAL,
  FinanceCategory.OVERHEAD,
  FinanceCategory.MAINTENANCE,
  FinanceCategory.PENALTY,
] as const;

const expensePriority = new Map<FinanceCategory, number>(
  AUTO_SETTLEMENT_EXPENSE_CATEGORIES.map((category, index) => [
    category,
    index,
  ]),
);

type OpenFinanceDue = {
  amountCents: bigint;
  category: FinanceCategory;
  createdAt: Date;
  dueDay: number;
  id: string;
  settledAmountCents: bigint;
};

export type FinanceDueSettlementResult = {
  dueId: string;
  paidCents: bigint;
  remainingCents: bigint;
  status: FinanceDueStatus;
  transactionId: string | null;
};

export function calculateOutstandingDueCents(input: {
  amountCents: bigint;
  settledAmountCents: bigint;
}) {
  return input.amountCents > input.settledAmountCents
    ? input.amountCents - input.settledAmountCents
    : BigInt(0);
}

export function calculateAvailableBalance(input: {
  cashBalanceCents: bigint;
  openExpenseDues: Array<{
    amountCents: bigint;
    settledAmountCents: bigint;
  }>;
}) {
  const openDebtCents = input.openExpenseDues.reduce(
    (total, due) =>
      total +
      calculateOutstandingDueCents({
        amountCents: due.amountCents,
        settledAmountCents: due.settledAmountCents,
      }),
    BigInt(0),
  );

  return {
    availableBalanceCents: input.cashBalanceCents - openDebtCents,
    cashBalanceCents: input.cashBalanceCents,
    openDebtCents,
  };
}

export function sortExpenseDuesForSettlement<T extends OpenFinanceDue>(
  dues: readonly T[],
) {
  return [...dues].sort(
    (first, second) =>
      first.dueDay - second.dueDay ||
      getExpensePriority(first.category) -
        getExpensePriority(second.category) ||
      first.createdAt.getTime() - second.createdAt.getTime() ||
      first.id.localeCompare(second.id),
  );
}

export async function getFactoryAvailableBalance(input: {
  currentDay: number;
  factoryId: string;
  tx: FinanceLedgerClient | PrismaClient;
}) {
  const [factory, openExpenseDues] = await Promise.all([
    input.tx.factory.findUniqueOrThrow({
      where: { id: input.factoryId },
      select: { cashBalanceCents: true },
    }),
    input.tx.factoryFinanceDue.findMany({
      where: {
        direction: FinanceDirection.EXPENSE,
        dueDay: { lte: input.currentDay },
        factoryId: input.factoryId,
        status: { in: [...OPEN_DUE_STATUSES] },
      },
      select: {
        amountCents: true,
        settledAmountCents: true,
      },
    }),
  ]);

  return calculateAvailableBalance({
    cashBalanceCents: factory.cashBalanceCents,
    openExpenseDues,
  });
}

export async function createFinanceDue(input: {
  amountCents: bigint;
  category: FinanceCategory;
  createdDay: number;
  description: string;
  direction: FinanceDirection;
  dueDay: number;
  factoryId: string;
  metadata?: Prisma.InputJsonValue;
  periodIndex: number;
  referenceKey: string;
  settledAmountCents?: bigint;
  sourceId?: string | null;
  sourceType?: FinanceSourceType | null;
  status?: FinanceDueStatus;
  tx: FinanceLedgerClient;
}) {
  assertPositiveAmount(input.amountCents);
  assertReferenceKey(input.referenceKey);

  const existing = await input.tx.factoryFinanceDue.findUnique({
    where: { referenceKey: input.referenceKey },
    select: {
      amountCents: true,
      id: true,
      settledAmountCents: true,
      status: true,
    },
  });

  if (existing) {
    return {
      alreadyCreated: true,
      due: existing,
    };
  }

  const settledAmountCents = clampBigInt(
    input.settledAmountCents ?? BigInt(0),
    BigInt(0),
    input.amountCents,
  );
  const status =
    input.status ??
    (settledAmountCents === BigInt(0)
      ? FinanceDueStatus.PENDING
      : getDueStatus({
          amountCents: input.amountCents,
          settledAmountCents,
        }));
  const due = await input.tx.factoryFinanceDue.create({
    data: {
      amountCents: input.amountCents,
      category: input.category,
      createdDay: input.createdDay,
      description: input.description,
      direction: input.direction,
      dueDay: input.dueDay,
      factoryId: input.factoryId,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      periodIndex: input.periodIndex,
      referenceKey: input.referenceKey,
      settledAmountCents,
      sourceId: input.sourceId ?? null,
      sourceType: input.sourceType ?? null,
      status,
    },
    select: {
      amountCents: true,
      id: true,
      settledAmountCents: true,
      status: true,
    },
  });

  return {
    alreadyCreated: false,
    due,
  };
}

export async function postFinanceTransaction(input: {
  amountCents: bigint;
  category: FinanceCategory;
  description: string;
  direction: FinanceDirection;
  factoryId: string;
  financeDueId?: string | null;
  gameDay: number;
  metadata?: Prisma.InputJsonValue;
  referenceKey: string;
  sourceId?: string | null;
  sourceType?: FinanceSourceType | null;
  tx: FinanceLedgerClient;
}) {
  assertPositiveAmount(input.amountCents);
  assertReferenceKey(input.referenceKey);

  const existing = await input.tx.factoryFinanceTransaction.findUnique({
    where: { referenceKey: input.referenceKey },
    select: {
      amountCents: true,
      balanceAfterCents: true,
      balanceBeforeCents: true,
      id: true,
    },
  });

  if (existing) {
    return {
      alreadyPosted: true,
      transaction: existing,
    };
  }

  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: {
      cashBalanceCents: true,
      currentFinancePeriod: true,
    },
  });

  if (
    input.direction === FinanceDirection.EXPENSE &&
    factory.cashBalanceCents < input.amountCents
  ) {
    throw new Error("Factory cash is insufficient for this transaction.");
  }

  const balanceAfterCents =
    input.direction === FinanceDirection.INCOME
      ? factory.cashBalanceCents + input.amountCents
      : factory.cashBalanceCents - input.amountCents;

  await input.tx.factory.update({
    where: { id: input.factoryId },
    data: { cashBalanceCents: balanceAfterCents },
  });
  const transaction = await input.tx.factoryFinanceTransaction.create({
    data: {
      amountCents: input.amountCents,
      balanceAfterCents,
      balanceBeforeCents: factory.cashBalanceCents,
      category: input.category,
      description: input.description,
      direction: input.direction,
      factoryId: input.factoryId,
      financeDueId: input.financeDueId ?? null,
      gameDay: input.gameDay,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      periodIndex: factory.currentFinancePeriod,
      referenceKey: input.referenceKey,
      sourceId: input.sourceId ?? null,
      sourceType: input.sourceType ?? null,
    },
    select: {
      amountCents: true,
      balanceAfterCents: true,
      balanceBeforeCents: true,
      id: true,
    },
  });

  return {
    alreadyPosted: false,
    transaction,
  };
}

export async function settleFinanceDue(input: {
  dueId: string;
  factoryId: string;
  gameDay: number;
  tx: FinanceLedgerClient;
}): Promise<FinanceDueSettlementResult | null> {
  const due = await input.tx.factoryFinanceDue.findUnique({
    where: { id: input.dueId },
    select: {
      amountCents: true,
      category: true,
      description: true,
      direction: true,
      dueDay: true,
      factoryId: true,
      id: true,
      metadata: true,
      referenceKey: true,
      settledAmountCents: true,
      sourceId: true,
      sourceType: true,
      status: true,
    },
  });

  if (
    !due ||
    due.factoryId !== input.factoryId ||
    due.dueDay > input.gameDay ||
    !isOpenDueStatus(due.status)
  ) {
    return null;
  }

  const outstandingCents = calculateOutstandingDueCents(due);

  if (outstandingCents === BigInt(0)) {
    if (due.status !== FinanceDueStatus.PAID) {
      await input.tx.factoryFinanceDue.update({
        where: { id: due.id },
        data: { status: FinanceDueStatus.PAID },
      });
    }

    return {
      dueId: due.id,
      paidCents: BigInt(0),
      remainingCents: BigInt(0),
      status: FinanceDueStatus.PAID,
      transactionId: null,
    };
  }

  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: { cashBalanceCents: true },
  });
  const paidCents =
    due.direction === FinanceDirection.INCOME
      ? outstandingCents
      : minBigInt(
          maxBigInt(factory.cashBalanceCents, BigInt(0)),
          outstandingCents,
        );
  const settledAmountCents = due.settledAmountCents + paidCents;
  const remainingCents = due.amountCents - settledAmountCents;
  const status = getDueStatus({
    amountCents: due.amountCents,
    settledAmountCents,
  });
  let transactionId: string | null = null;

  if (paidCents > BigInt(0)) {
    const posted = await postFinanceTransaction({
      amountCents: paidCents,
      category: due.category,
      description: due.description ?? getDefaultDescription(due.category),
      direction: due.direction,
      factoryId: input.factoryId,
      financeDueId: due.id,
      gameDay: input.gameDay,
      metadata: {
        dueDay: due.dueDay,
        dueReferenceKey: due.referenceKey,
        remainingCents: remainingCents.toString(),
        source: "automatic-due-settlement",
      },
      referenceKey: buildDueSettlementReferenceKey({
        dueId: due.id,
        settledAmountCents: due.settledAmountCents,
      }),
      sourceId: due.sourceId,
      sourceType: due.sourceType,
      tx: input.tx,
    });
    transactionId = posted.transaction.id;
  }

  const dueClaim = await input.tx.factoryFinanceDue.updateMany({
    where: {
      id: due.id,
      settledAmountCents: due.settledAmountCents,
      status: due.status,
    },
    data: {
      settledAmountCents,
      status,
    },
  });

  if (dueClaim.count !== 1) {
    throw new Error("Finance due settlement claim failed.");
  }

  return {
    dueId: due.id,
    paidCents,
    remainingCents,
    status,
    transactionId,
  };
}

export async function processDuePayments(input: {
  factoryId: string;
  gameDay: number;
  tx: FinanceLedgerClient;
}) {
  const openDues = await input.tx.factoryFinanceDue.findMany({
    where: {
      category: { in: [...AUTO_SETTLEMENT_EXPENSE_CATEGORIES] },
      direction: FinanceDirection.EXPENSE,
      dueDay: { lte: input.gameDay },
      factoryId: input.factoryId,
      status: { in: [...OPEN_DUE_STATUSES] },
    },
    orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      amountCents: true,
      category: true,
      createdAt: true,
      dueDay: true,
      id: true,
      settledAmountCents: true,
    },
  });
  const settlements: FinanceDueSettlementResult[] = [];

  for (const due of sortExpenseDuesForSettlement(openDues)) {
    const settlement = await settleFinanceDue({
      dueId: due.id,
      factoryId: input.factoryId,
      gameDay: input.gameDay,
      tx: input.tx,
    });

    if (settlement) settlements.push(settlement);
  }

  return {
    paidCents: settlements.reduce(
      (total, settlement) => total + settlement.paidCents,
      BigInt(0),
    ),
    paidDueIds: settlements
      .filter((settlement) => settlement.status === FinanceDueStatus.PAID)
      .map((settlement) => settlement.dueId),
    partialDueIds: settlements
      .filter((settlement) => settlement.status === FinanceDueStatus.PARTIAL)
      .map((settlement) => settlement.dueId),
    overdueDueIds: settlements
      .filter((settlement) => settlement.status === FinanceDueStatus.OVERDUE)
      .map((settlement) => settlement.dueId),
    settlements,
  };
}

export function buildDueSettlementReferenceKey(input: {
  dueId: string;
  settledAmountCents: bigint;
}) {
  return `FINANCE_DUE_SETTLEMENT:${input.dueId}:${input.settledAmountCents}`;
}

function getExpensePriority(category: FinanceCategory) {
  return expensePriority.get(category) ?? Number.MAX_SAFE_INTEGER;
}

function getDueStatus(input: {
  amountCents: bigint;
  settledAmountCents: bigint;
}) {
  if (input.settledAmountCents >= input.amountCents) {
    return FinanceDueStatus.PAID;
  }
  if (input.settledAmountCents > BigInt(0)) {
    return FinanceDueStatus.PARTIAL;
  }

  return FinanceDueStatus.OVERDUE;
}

function getDefaultDescription(category: FinanceCategory) {
  return `finance.${category.toLowerCase()}`;
}

function isOpenDueStatus(status: FinanceDueStatus) {
  return OPEN_DUE_STATUSES.includes(
    status as (typeof OPEN_DUE_STATUSES)[number],
  );
}

function assertPositiveAmount(amountCents: bigint) {
  if (amountCents <= BigInt(0)) {
    throw new Error("Finance amount must be greater than zero.");
  }
}

function assertReferenceKey(referenceKey: string) {
  if (!referenceKey.trim()) {
    throw new Error("Finance reference key is required.");
  }
}

function clampBigInt(value: bigint, minimum: bigint, maximum: bigint) {
  return minBigInt(maxBigInt(value, minimum), maximum);
}

function minBigInt(first: bigint, second: bigint) {
  return first < second ? first : second;
}

function maxBigInt(first: bigint, second: bigint) {
  return first > second ? first : second;
}

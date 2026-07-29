import {
  FactoryProductionLineStatus,
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  FinanceSourceType,
  StaffAssignmentStatus,
  type Prisma,
} from "@/generated/prisma/client";
import {
  createFinanceDue,
  postFinanceTransaction,
} from "@/features/finance/services/finance-ledger";

export type FinancialTriggerClient = Prisma.TransactionClient;

const PERIOD_DAYS = 22;

export type FinancialTriggerResult = {
  dueIds: string[];
  paidTransactionIds: string[];
  partialDueIds: string[];
  overdueDueIds: string[];
};

export type OutsourcePaymentState = {
  isPaid: boolean;
  paidCents: bigint;
  remainingCents: bigint;
};

export async function processPeriodicFinancialTriggers(input: {
  factoryDay: number;
  factoryId: string;
  tx: FinancialTriggerClient;
}) {
  const payroll = input.factoryDay % PERIOD_DAYS === 0
    ? await processPayrollPayment(input)
    : emptyResult();
  const operatingExpenses =
    input.factoryDay >= 10 && (input.factoryDay - 10) % PERIOD_DAYS === 0
      ? await processOperatingExpensePayments(input)
      : emptyResult();

  return mergeFinancialTriggerResults(payroll, operatingExpenses);
}

export async function processOutsourceCompletionPayments(input: {
  factoryDay: number;
  factoryId: string;
  jobIds: string[];
  tx: FinancialTriggerClient;
}) {
  if (input.jobIds.length === 0) return emptyResult();

  const jobs = await input.tx.productionOutsourceJob.findMany({
    where: {
      factoryId: input.factoryId,
      id: { in: input.jobIds },
    },
    orderBy: [{ readyDay: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      quantity: true,
      totalCostCents: true,
      productionOrder: { select: { productionNo: true } },
    },
  });
  let result = emptyResult();

  for (const job of jobs) {
    result = mergeFinancialTriggerResults(
      result,
      await settleFactoryExpense({
        amountCents: job.totalCostCents,
        category: FinanceCategory.OUTSOURCE_COST,
        description: "finance.outsourceCompletionPayment",
        factoryDay: input.factoryDay,
        factoryId: input.factoryId,
        metadata: {
          productionNo: job.productionOrder.productionNo,
          quantity: job.quantity,
          source: "outsource-completion",
          translationKey: "finance.outsourceCompletionPayment",
        },
        referenceKey: buildOutsourcePaymentReferenceKey(job.id),
        sourceId: job.id,
        sourceType: FinanceSourceType.OUTSOURCE_JOB,
        tx: input.tx,
      }),
    );
  }

  return result;
}

export async function getOutsourcePaymentStates(input: {
  factoryId: string;
  jobs: Array<{ id: string; totalCostCents: bigint }>;
  tx: FinancialTriggerClient;
}) {
  const referenceKeyByJobId = new Map(
    input.jobs.map((job) => [
      job.id,
      buildOutsourcePaymentReferenceKey(job.id),
    ]),
  );
  const referenceKeys = Array.from(referenceKeyByJobId.values());

  if (referenceKeys.length === 0) {
    return new Map<string, OutsourcePaymentState>();
  }

  const [dues, transactions] = await Promise.all([
    input.tx.factoryFinanceDue.findMany({
      where: {
        factoryId: input.factoryId,
        referenceKey: { in: referenceKeys },
      },
      select: {
        referenceKey: true,
        settledAmountCents: true,
      },
    }),
    input.tx.factoryFinanceTransaction.findMany({
      where: {
        factoryId: input.factoryId,
        referenceKey: { in: referenceKeys },
      },
      select: {
        amountCents: true,
        referenceKey: true,
      },
    }),
  ]);
  const dueByReferenceKey = new Map(
    dues.flatMap((due) =>
      due.referenceKey
        ? [[due.referenceKey, due] as const]
        : [],
    ),
  );
  const transactionByReferenceKey = new Map(
    transactions.flatMap((transaction) =>
      transaction.referenceKey
        ? [[transaction.referenceKey, transaction] as const]
        : [],
    ),
  );

  return new Map(
    input.jobs.map((job) => {
      const referenceKey = referenceKeyByJobId.get(job.id);
      const due = referenceKey
        ? dueByReferenceKey.get(referenceKey)
        : undefined;
      const transaction = referenceKey
        ? transactionByReferenceKey.get(referenceKey)
        : undefined;

      return [
        job.id,
        resolveOutsourcePaymentState({
          dueSettledAmountCents: due?.settledAmountCents,
          totalCostCents: job.totalCostCents,
          transactionAmountCents: transaction?.amountCents,
        }),
      ] as const;
    }),
  );
}

export function resolveOutsourcePaymentState(input: {
  dueSettledAmountCents?: bigint;
  totalCostCents: bigint;
  transactionAmountCents?: bigint;
}): OutsourcePaymentState {
  const paidCents = clampBigInt(
    input.dueSettledAmountCents ?? input.transactionAmountCents ?? BigInt(0),
    BigInt(0),
    input.totalCostCents,
  );
  const remainingCents = input.totalCostCents - paidCents;

  return {
    isPaid: remainingCents === BigInt(0),
    paidCents,
    remainingCents,
  };
}

export function buildPayrollReferenceKey(factoryId: string, gameDay: number) {
  return `PAYROLL:${factoryId}:${gameDay}`;
}

export function buildOperatingExpenseReferenceKey(input: {
  category: FinanceCategory;
  factoryId: string;
  gameDay: number;
}) {
  return `OPERATING_EXPENSE:${input.category}:${input.factoryId}:${input.gameDay}`;
}

export function buildOutsourcePaymentReferenceKey(jobId: string) {
  return `OUTSOURCE_COMPLETION_PAYMENT:${jobId}`;
}

async function processPayrollPayment(input: {
  factoryDay: number;
  factoryId: string;
  tx: FinancialTriggerClient;
}) {
  const staffAssignments = await input.tx.factoryStaffAssignment.findMany({
    where: {
      factoryId: input.factoryId,
      quantity: { gt: 0 },
      status: StaffAssignmentStatus.ACTIVE,
    },
    select: {
      quantity: true,
      staffRole: { select: { monthlySalaryCents: true } },
    },
  });
  const totalStaff = staffAssignments.reduce(
    (total, assignment) => total + assignment.quantity,
    0,
  );
  const amountCents = staffAssignments.reduce(
    (total, assignment) =>
      total +
      BigInt(assignment.quantity * assignment.staffRole.monthlySalaryCents),
    BigInt(0),
  );

  return settleFactoryExpense({
    amountCents,
    category: FinanceCategory.PAYROLL,
    description: "finance.payroll",
    factoryDay: input.factoryDay,
    factoryId: input.factoryId,
    metadata: {
      source: "periodic-payroll",
      totalStaff,
      translationKey: "finance.payroll",
    },
    referenceKey: buildPayrollReferenceKey(input.factoryId, input.factoryDay),
    sourceId: input.factoryId,
    sourceType: FinanceSourceType.MONTHLY_CLOSING,
    tx: input.tx,
  });
}

async function processOperatingExpensePayments(input: {
  factoryDay: number;
  factoryId: string;
  tx: FinancialTriggerClient;
}) {
  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: {
      sectorId: true,
      productionLines: {
        where: {
          status: {
            in: [
              FactoryProductionLineStatus.IDLE,
              FactoryProductionLineStatus.RUNNING,
            ],
          },
        },
        select: {
          productionLineTemplate: {
            select: {
              areaM2: true,
              monthlyElectricityBaseCents: true,
            },
          },
        },
      },
      staffAssignments: {
        where: {
          quantity: { gt: 0 },
          status: StaffAssignmentStatus.ACTIVE,
        },
        select: { factoryProductionLineId: true, quantity: true },
      },
    },
  });
  const costConfig = await input.tx.sectorOperatingCostConfig.findUnique({
    where: { sectorId: factory.sectorId },
    select: {
      dailyMealPerDirectStaffCents: true,
      directStaffOverheadPerStaffCents: true,
      rentPerM2Cents: true,
    },
  });

  if (!costConfig) return emptyResult();

  const electricityCents = factory.productionLines.reduce(
    (total, line) =>
      total + BigInt(line.productionLineTemplate.monthlyElectricityBaseCents),
    BigInt(0),
  );
  const rentCents = factory.productionLines.reduce(
    (total, line) =>
      total + BigInt(line.productionLineTemplate.areaM2 * costConfig.rentPerM2Cents),
    BigInt(0),
  );
  const directStaffCount = factory.staffAssignments.reduce(
    (total, assignment) =>
      assignment.factoryProductionLineId ? total + assignment.quantity : total,
    0,
  );
  const supportStaffCount = factory.staffAssignments.reduce(
    (total, assignment) =>
      assignment.factoryProductionLineId ? total : total + assignment.quantity,
    0,
  );
  const mealCents = BigInt(
    (directStaffCount + supportStaffCount) *
      costConfig.dailyMealPerDirectStaffCents *
      PERIOD_DAYS,
  );
  const overheadCents = BigInt(
    directStaffCount *
      costConfig.directStaffOverheadPerStaffCents *
      PERIOD_DAYS,
  );

  let result = emptyResult();

  result = mergeFinancialTriggerResults(
    result,
    await settleFactoryExpense({
      amountCents: electricityCents,
      category: FinanceCategory.ELECTRICITY,
      description: "finance.electricity",
      factoryDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: {
        activeLineCount: factory.productionLines.length,
        source: "periodic-operating-expense",
        translationKey: "finance.electricity",
      },
      referenceKey: buildOperatingExpenseReferenceKey({
        category: FinanceCategory.ELECTRICITY,
        factoryId: input.factoryId,
        gameDay: input.factoryDay,
      }),
      sourceId: input.factoryId,
      sourceType: FinanceSourceType.MONTHLY_CLOSING,
      tx: input.tx,
    }),
  );
  result = mergeFinancialTriggerResults(
    result,
    await settleFactoryExpense({
      amountCents: rentCents,
      category: FinanceCategory.RENT,
      description: "finance.rent",
      factoryDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: {
        source: "periodic-operating-expense",
        translationKey: "finance.rent",
      },
      referenceKey: buildOperatingExpenseReferenceKey({
        category: FinanceCategory.RENT,
        factoryId: input.factoryId,
        gameDay: input.factoryDay,
      }),
      sourceId: input.factoryId,
      sourceType: FinanceSourceType.MONTHLY_CLOSING,
      tx: input.tx,
    }),
  );
  result = mergeFinancialTriggerResults(
    result,
    await settleFactoryExpense({
      amountCents: mealCents,
      category: FinanceCategory.MEAL,
      description: "finance.meal",
      factoryDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: {
        directStaffCount,
        source: "periodic-operating-expense",
        supportStaffCount,
        translationKey: "finance.meal",
      },
      referenceKey: buildOperatingExpenseReferenceKey({
        category: FinanceCategory.MEAL,
        factoryId: input.factoryId,
        gameDay: input.factoryDay,
      }),
      sourceId: input.factoryId,
      sourceType: FinanceSourceType.MONTHLY_CLOSING,
      tx: input.tx,
    }),
  );
  result = mergeFinancialTriggerResults(
    result,
    await settleFactoryExpense({
      amountCents: overheadCents,
      category: FinanceCategory.OVERHEAD,
      description: "finance.overhead",
      factoryDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: {
        directStaffCount,
        source: "periodic-operating-expense",
        translationKey: "finance.overhead",
      },
      referenceKey: buildOperatingExpenseReferenceKey({
        category: FinanceCategory.OVERHEAD,
        factoryId: input.factoryId,
        gameDay: input.factoryDay,
      }),
      sourceId: input.factoryId,
      sourceType: FinanceSourceType.MONTHLY_CLOSING,
      tx: input.tx,
    }),
  );

  return result;
}

export async function settleFactoryExpense(input: {
  amountCents: bigint;
  category: FinanceCategory;
  description: string;
  factoryDay: number;
  factoryId: string;
  metadata: Prisma.InputJsonValue;
  referenceKey: string;
  sourceId: string;
  sourceType: FinanceSourceType;
  tx: FinancialTriggerClient;
}): Promise<FinancialTriggerResult> {
  if (input.amountCents <= BigInt(0)) return emptyResult();

  const existingTransaction = await input.tx.factoryFinanceTransaction.findUnique({
    where: { referenceKey: input.referenceKey },
    select: { id: true },
  });
  const existingDue = await input.tx.factoryFinanceDue.findUnique({
    where: { referenceKey: input.referenceKey },
    select: { id: true, status: true },
  });

  if (existingTransaction || existingDue) return emptyResult();

  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: { cashBalanceCents: true, currentFinancePeriod: true },
  });
  const paidCents =
    factory.cashBalanceCents <= BigInt(0)
      ? BigInt(0)
      : factory.cashBalanceCents < input.amountCents
        ? factory.cashBalanceCents
        : input.amountCents;
  const result = emptyResult();

  if (paidCents > BigInt(0)) {
    const posted = await postFinanceTransaction({
      amountCents: paidCents,
      category: input.category,
      description: input.description,
      direction: FinanceDirection.EXPENSE,
      factoryId: input.factoryId,
      gameDay: input.factoryDay,
      metadata: input.metadata,
      referenceKey: input.referenceKey,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      tx: input.tx,
    });
    result.paidTransactionIds.push(posted.transaction.id);
  }

  if (paidCents < input.amountCents) {
    const created = await createFinanceDue({
      amountCents: input.amountCents,
      category: input.category,
      createdDay: input.factoryDay,
      description: input.description,
      direction: FinanceDirection.EXPENSE,
      dueDay: input.factoryDay,
      factoryId: input.factoryId,
      metadata: input.metadata,
      periodIndex: factory.currentFinancePeriod,
      referenceKey: input.referenceKey,
      settledAmountCents: paidCents,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      status:
        paidCents > BigInt(0)
          ? FinanceDueStatus.PARTIAL
          : FinanceDueStatus.OVERDUE,
      tx: input.tx,
    });
    result.dueIds.push(created.due.id);
    if (created.due.status === FinanceDueStatus.PARTIAL) {
      result.partialDueIds.push(created.due.id);
    } else {
      result.overdueDueIds.push(created.due.id);
    }
  }

  return result;
}

function emptyResult(): FinancialTriggerResult {
  return {
    dueIds: [],
    paidTransactionIds: [],
    partialDueIds: [],
    overdueDueIds: [],
  };
}

export function mergeFinancialTriggerResults(
  first: FinancialTriggerResult,
  second: FinancialTriggerResult,
): FinancialTriggerResult {
  return {
    dueIds: [...first.dueIds, ...second.dueIds],
    overdueDueIds: [...first.overdueDueIds, ...second.overdueDueIds],
    paidTransactionIds: [
      ...first.paidTransactionIds,
      ...second.paidTransactionIds,
    ],
    partialDueIds: [...first.partialDueIds, ...second.partialDueIds],
  };
}

function clampBigInt(value: bigint, minimum: bigint, maximum: bigint) {
  if (value < minimum) return minimum;
  if (value > maximum) return maximum;

  return value;
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  FinanceSourceType,
  type Prisma,
} from "@/generated/prisma/client";
import { settleFactoryExpense } from "@/features/game/services/financial-triggers";

import {
  calculateAvailableBalance,
  postFinanceTransaction,
  processDuePayments,
  sortExpenseDuesForSettlement,
} from "./finance-ledger";

test("nakit sıfırda kalsa bile açık borç kullanılabilir bakiyeyi eksi gösterir", () => {
  const balance = calculateAvailableBalance({
    cashBalanceCents: BigInt(0),
    openExpenseDues: [
      {
        amountCents: BigInt(8_000),
        settledAmountCents: BigInt(5_000),
      },
      {
        amountCents: BigInt(2_000),
        settledAmountCents: BigInt(0),
      },
    ],
  });

  assert.equal(balance.cashBalanceCents, BigInt(0));
  assert.equal(balance.openDebtCents, BigInt(5_000));
  assert.equal(balance.availableBalanceCents, BigInt(-5_000));
});

test("aynı güne ait borçlar maaş, fason ve kira önceliğiyle sıralanır", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const sorted = sortExpenseDuesForSettlement([
    dueSummary("rent", FinanceCategory.RENT, createdAt),
    dueSummary("outsource", FinanceCategory.OUTSOURCE_COST, createdAt),
    dueSummary("payroll", FinanceCategory.PAYROLL, createdAt),
  ]);

  assert.deepEqual(
    sorted.map((due) => due.id),
    ["payroll", "outsource", "rent"],
  );
});

test("kısmi maaş borcu sonradan gelen parayla otomatik kapanır", async () => {
  const harness = buildFinanceHarness({
    balanceCents: BigInt(5_000),
    dues: [
      buildDue({
        amountCents: BigInt(8_000),
        category: FinanceCategory.PAYROLL,
        id: "payroll-due",
      }),
    ],
  });

  const firstSettlement = await processDuePayments({
    factoryId: "factory-1",
    gameDay: 22,
    tx: harness.tx,
  });

  assert.equal(firstSettlement.paidCents, BigInt(5_000));
  assert.equal(harness.state.balanceCents, BigInt(0));
  assert.equal(
    harness.state.dues[0]?.settledAmountCents,
    BigInt(5_000),
  );
  assert.equal(harness.state.dues[0]?.status, FinanceDueStatus.PARTIAL);

  await postFinanceTransaction({
    amountCents: BigInt(10_000),
    category: FinanceCategory.ORDER_REVENUE,
    description: "Sipariş tahsilatı",
    direction: FinanceDirection.INCOME,
    factoryId: "factory-1",
    gameDay: 29,
    referenceKey: "ORDER_REVENUE:order-1",
    tx: harness.tx,
  });
  const secondSettlement = await processDuePayments({
    factoryId: "factory-1",
    gameDay: 29,
    tx: harness.tx,
  });

  assert.equal(secondSettlement.paidCents, BigInt(3_000));
  assert.equal(harness.state.balanceCents, BigInt(7_000));
  assert.equal(
    harness.state.dues[0]?.settledAmountCents,
    BigInt(8_000),
  );
  assert.equal(harness.state.dues[0]?.status, FinanceDueStatus.PAID);
  assert.equal(
    harness.state.transactions
      .filter(
        (transaction) =>
          transaction.direction === FinanceDirection.EXPENSE,
      )
      .reduce(
        (total, transaction) => total + transaction.amountCents,
        BigInt(0),
      ),
    BigInt(8_000),
  );
});

test("aynı reference key ile gelen gelir bakiyeye yalnızca bir kez yazılır", async () => {
  const harness = buildFinanceHarness({
    balanceCents: BigInt(1_000),
    dues: [],
  });
  const input = {
    amountCents: BigInt(2_500),
    category: FinanceCategory.BONUS,
    description: "Görev ödülü",
    direction: FinanceDirection.INCOME,
    factoryId: "factory-1",
    gameDay: 4,
    referenceKey: "TASK_CASH_REWARD:task-1",
    tx: harness.tx,
  } as const;

  const first = await postFinanceTransaction(input);
  const second = await postFinanceTransaction(input);

  assert.equal(first.alreadyPosted, false);
  assert.equal(second.alreadyPosted, true);
  assert.equal(harness.state.balanceCents, BigInt(3_500));
  assert.equal(harness.state.transactions.length, 1);
});

test("yetersiz nakitte giderin ödenen kısmı işlenir, kalanı borç olur", async () => {
  const harness = buildFinanceHarness({
    balanceCents: BigInt(300),
    dues: [],
  });

  const result = await settleFactoryExpense({
    amountCents: BigInt(1_000),
    category: FinanceCategory.RENT,
    description: "Kira ödemesi",
    factoryDay: 10,
    factoryId: "factory-1",
    metadata: { source: "test" },
    referenceKey: "OPERATING_EXPENSE:RENT:factory-1:10",
    sourceId: "factory-1",
    sourceType: FinanceSourceType.MONTHLY_CLOSING,
    tx: harness.tx,
  });

  assert.equal(harness.state.balanceCents, BigInt(0));
  assert.equal(harness.state.transactions[0]?.amountCents, BigInt(300));
  assert.equal(harness.state.dues[0]?.amountCents, BigInt(1_000));
  assert.equal(
    harness.state.dues[0]?.settledAmountCents,
    BigInt(300),
  );
  assert.equal(harness.state.dues[0]?.status, FinanceDueStatus.PARTIAL);
  assert.deepEqual(result.partialDueIds, [harness.state.dues[0]?.id]);
});

test("leasing borcu Faz 1 genel tahsilatından ayrı kalır", async () => {
  const harness = buildFinanceHarness({
    balanceCents: BigInt(5_000),
    dues: [
      buildDue({
        amountCents: BigInt(1_000),
        category: FinanceCategory.LEASING_PAYMENT,
        id: "leasing-due",
      }),
    ],
  });

  const settlement = await processDuePayments({
    factoryId: "factory-1",
    gameDay: 22,
    tx: harness.tx,
  });

  assert.equal(settlement.paidCents, BigInt(0));
  assert.equal(harness.state.balanceCents, BigInt(5_000));
  assert.equal(harness.state.dues[0]?.status, FinanceDueStatus.OVERDUE);
  assert.equal(harness.state.transactions.length, 0);
});

function dueSummary(
  id: string,
  category: FinanceCategory,
  createdAt: Date,
) {
  return {
    amountCents: BigInt(1_000),
    category,
    createdAt,
    dueDay: 22,
    id,
    settledAmountCents: BigInt(0),
  };
}

type DueState = ReturnType<typeof buildDue>;

type TransactionState = {
  amountCents: bigint;
  balanceAfterCents: bigint;
  balanceBeforeCents: bigint;
  category: FinanceCategory;
  direction: FinanceDirection;
  financeDueId: string | null;
  id: string;
  referenceKey: string;
};

function buildDue(input: {
  amountCents: bigint;
  category: FinanceCategory;
  id: string;
}) {
  return {
    amountCents: input.amountCents,
    category: input.category,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdDay: 22,
    description: `${input.category} ödemesi`,
    direction: FinanceDirection.EXPENSE,
    dueDay: 22,
    factoryId: "factory-1",
    id: input.id,
    metadata: null,
    periodIndex: 1,
    referenceKey: `DUE:${input.id}`,
    settledAmountCents: BigInt(0),
    sourceId: null,
    sourceType: null,
    status: FinanceDueStatus.OVERDUE,
  };
}

function buildFinanceHarness(input: {
  balanceCents: bigint;
  dues: DueState[];
}) {
  const state = {
    balanceCents: input.balanceCents,
    dues: input.dues,
    transactions: [] as TransactionState[],
  };
  const tx = {
    factory: {
      findUniqueOrThrow: async () => ({
        cashBalanceCents: state.balanceCents,
        currentFinancePeriod: 1,
      }),
      update: async ({
        data,
      }: {
        data: { cashBalanceCents: bigint };
      }) => {
        state.balanceCents = data.cashBalanceCents;
      },
    },
    factoryFinanceDue: {
      create: async ({
        data,
      }: {
        data: Omit<DueState, "createdAt" | "id">;
      }) => {
        const due = {
          ...data,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          id: `due-${state.dues.length + 1}`,
        };
        state.dues.push(due);
        return due;
      },
      findMany: async ({
        where,
      }: {
        where: {
          category?: { in: FinanceCategory[] };
          direction: FinanceDirection;
          dueDay: { lte: number };
          status: { in: FinanceDueStatus[] };
        };
      }) =>
        state.dues.filter(
          (due) =>
            due.direction === where.direction &&
            due.dueDay <= where.dueDay.lte &&
            where.status.in.includes(due.status) &&
            (!where.category ||
              where.category.in.includes(due.category)),
        ),
      findUnique: async ({
        where,
      }: {
        where: { id?: string; referenceKey?: string };
      }) =>
        state.dues.find(
          (due) =>
            due.id === where.id ||
            due.referenceKey === where.referenceKey,
        ) ?? null,
      update: async ({
        data,
        where,
      }: {
        data: Partial<DueState>;
        where: { id: string };
      }) => {
        const due = state.dues.find((item) => item.id === where.id);
        if (!due) throw new Error("Test due was not found.");
        Object.assign(due, data);
        return due;
      },
      updateMany: async ({
        data,
        where,
      }: {
        data: Partial<DueState>;
        where: {
          id: string;
          settledAmountCents: bigint;
          status: FinanceDueStatus;
        };
      }) => {
        const due = state.dues.find((item) => item.id === where.id);
        if (
          !due ||
          due.settledAmountCents !== where.settledAmountCents ||
          due.status !== where.status
        ) {
          return { count: 0 };
        }
        Object.assign(due, data);
        return { count: 1 };
      },
    },
    factoryFinanceTransaction: {
      findUnique: async ({
        where,
      }: {
        where: { referenceKey: string };
      }) =>
        state.transactions.find(
          (transaction) =>
            transaction.referenceKey === where.referenceKey,
        ) ?? null,
      create: async ({
        data,
      }: {
        data: Omit<TransactionState, "id">;
      }) => {
        const transaction = {
          ...data,
          id: `transaction-${state.transactions.length + 1}`,
        };
        state.transactions.push(transaction);
        return transaction;
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { state, tx };
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  FinanceDueStatus,
  LeasingContractStatus,
  type Prisma,
} from "@/generated/prisma/client";

import {
  buildLeasingPaymentReferenceKey,
  calculateLeasingPayment,
  processDueLeasingPayments,
} from "./leasing-payment";

test("leasing ödeme hesabı nakdi negatif yapmadan tam ve kısmi tutarı ayırır", () => {
  const partial = calculateLeasingPayment({
    balanceCents: BigInt(300),
    dueAmountCents: BigInt(1_000),
    settledAmountCents: BigInt(200),
  });

  assert.equal(partial.paidCents, BigInt(300));
  assert.equal(partial.balanceAfterCents, BigInt(0));
  assert.equal(partial.remainingCents, BigInt(500));
  assert.equal(partial.status, FinanceDueStatus.PARTIAL);

  const overdue = calculateLeasingPayment({
    balanceCents: BigInt(0),
    dueAmountCents: BigInt(1_000),
    settledAmountCents: BigInt(0),
  });
  assert.equal(overdue.status, FinanceDueStatus.OVERDUE);
});

test("due gününde taksiti bir kez öder ve sonraki due'yu 22 gün sonrasına kurar", async () => {
  const harness = buildPaymentHarness({ balanceCents: BigInt(2_000) });

  const first = await processDueLeasingPayments({
    factoryDay: 23,
    factoryId: "factory-1",
    tx: harness.tx,
  });
  const second = await processDueLeasingPayments({
    factoryDay: 23,
    factoryId: "factory-1",
    tx: harness.tx,
  });

  assert.deepEqual(first.paidDueIds, ["due-1"]);
  assert.deepEqual(second.paidDueIds, []);
  assert.equal(harness.state.balanceCents, BigInt(1_000));
  assert.equal(harness.state.transactions.length, 1);
  assert.equal(harness.state.dues.length, 2);
  assert.equal(harness.state.dues[1]?.dueDay, 45);
  assert.equal(harness.state.contract.remainingInstallments, 1);
});

test("yetersiz nakitte due PARTIAL kalır ve sonraki çalışmada kalan tutar tamamlanır", async () => {
  const harness = buildPaymentHarness({ balanceCents: BigInt(400) });

  await processDueLeasingPayments({
    factoryDay: 23,
    factoryId: "factory-1",
    tx: harness.tx,
  });
  assert.equal(harness.state.dues[0]?.status, FinanceDueStatus.PARTIAL);
  assert.equal(harness.state.dues[0]?.settledAmountCents, BigInt(400));
  assert.equal(harness.state.balanceCents, BigInt(0));

  harness.state.balanceCents = BigInt(600);
  await processDueLeasingPayments({
    factoryDay: 24,
    factoryId: "factory-1",
    tx: harness.tx,
  });
  assert.equal(harness.state.dues[0]?.status, FinanceDueStatus.PAID);
  assert.equal(harness.state.transactions.length, 2);
});

test("son taksit contractı tamamlar ve yeni due üretmez", async () => {
  const harness = buildPaymentHarness({
    balanceCents: BigInt(1_000),
    remainingInstallments: 1,
  });

  await processDueLeasingPayments({
    factoryDay: 23,
    factoryId: "factory-1",
    tx: harness.tx,
  });

  assert.equal(harness.state.contract.status, LeasingContractStatus.COMPLETED);
  assert.equal(harness.state.contract.endedDay, 23);
  assert.equal(harness.state.contract.nextDueDay, null);
  assert.equal(harness.state.dues.length, 1);
});

test("leasing payment reference key aynı settlement claim için deterministiktir", () => {
  assert.equal(
    buildLeasingPaymentReferenceKey({
      contractId: "contract-1",
      installmentIndex: 2,
      settledBeforeCents: BigInt(400),
    }),
    "LEASING_PAYMENT:contract-1:2:400",
  );
});

function buildPaymentHarness(input: {
  balanceCents: bigint;
  remainingInstallments?: number;
}) {
  const state = {
    balanceCents: input.balanceCents,
    contract: {
      id: "contract-1",
      factoryId: "factory-1",
      installmentCount: 2,
      monthlyPaymentCents: BigInt(1_000),
      nextDueDay: 23 as number | null,
      remainingInstallments: input.remainingInstallments ?? 2,
      remainingMonths: input.remainingInstallments ?? 2,
      status: LeasingContractStatus.ACTIVE,
      endedDay: null as number | null,
    },
    dues: [
      {
        id: "due-1",
        amountCents: BigInt(1_000),
        settledAmountCents: BigInt(0),
        status: FinanceDueStatus.PENDING,
        dueDay: 23,
        periodIndex: 1,
        sourceId: "contract-1",
        createdAt: new Date(0),
      },
    ],
    transactions: [] as Array<Record<string, unknown>>,
  };
  const tx = {
    factory: {
      findUniqueOrThrow: async () => ({
        cashBalanceCents: state.balanceCents,
        currentFinancePeriod: 1,
      }),
      updateMany: async ({ data }: { data: { cashBalanceCents: { decrement: bigint } } }) => {
        if (state.balanceCents < data.cashBalanceCents.decrement) return { count: 0 };
        state.balanceCents -= data.cashBalanceCents.decrement;
        return { count: 1 };
      },
    },
    factoryFinanceDue: {
      findMany: async ({ where }: { where: { dueDay: { lte: number } } }) =>
        state.dues.filter(
          (due) =>
            due.dueDay <= where.dueDay.lte &&
            [FinanceDueStatus.PENDING, FinanceDueStatus.PARTIAL, FinanceDueStatus.OVERDUE].includes(due.status),
        ),
      updateMany: async ({ data, where }: { data: Partial<(typeof state.dues)[number]>; where: { id: string; settledAmountCents: bigint; status: FinanceDueStatus } }) => {
        const due = state.dues.find((item) => item.id === where.id);
        if (!due || due.status !== where.status || due.settledAmountCents !== where.settledAmountCents) return { count: 0 };
        Object.assign(due, data);
        return { count: 1 };
      },
      upsert: async ({ create }: { create: Omit<(typeof state.dues)[number], "id" | "createdAt"> & { referenceKey: string } }) => {
        if (!state.dues.some((due) => due.periodIndex === create.periodIndex)) {
          state.dues.push({
            amountCents: create.amountCents,
            createdAt: new Date(),
            dueDay: create.dueDay,
            id: `due-${state.dues.length + 1}`,
            periodIndex: create.periodIndex,
            settledAmountCents: BigInt(0),
            sourceId: create.sourceId,
            status: FinanceDueStatus.PENDING,
          });
        }
      },
    },
    factoryLeasingContract: {
      findFirst: async () =>
        state.contract.status === LeasingContractStatus.ACTIVE
          ? { ...state.contract }
          : null,
      update: async ({ data }: { data: Partial<typeof state.contract> }) => {
        Object.assign(state.contract, data);
      },
    },
    factoryFinanceTransaction: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.transactions.push(data);
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { state, tx };
}

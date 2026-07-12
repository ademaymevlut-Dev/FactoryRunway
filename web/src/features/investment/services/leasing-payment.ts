import {
  FinanceCategory,
  FinanceDirection,
  FinanceDueStatus,
  FinanceSourceType,
  LeasingContractStatus,
  type Prisma,
} from "@/generated/prisma/client";

import { buildLeasingDueReferenceKey } from "./lease-production-line";

const LEASING_PERIOD_DAYS = 22;

export function calculateLeasingPayment(input: {
  balanceCents: bigint;
  dueAmountCents: bigint;
  settledAmountCents: bigint;
}) {
  const outstandingCents = maxBigInt(
    BigInt(0),
    input.dueAmountCents - input.settledAmountCents,
  );
  const paidCents = minBigInt(input.balanceCents, outstandingCents);
  const settledAmountCents = input.settledAmountCents + paidCents;
  const remainingCents = input.dueAmountCents - settledAmountCents;

  return {
    balanceAfterCents: input.balanceCents - paidCents,
    paidCents,
    remainingCents,
    settledAmountCents,
    status:
      remainingCents === BigInt(0)
        ? FinanceDueStatus.PAID
        : paidCents > BigInt(0)
          ? FinanceDueStatus.PARTIAL
          : FinanceDueStatus.OVERDUE,
  };
}

export async function processDueLeasingPayments(input: {
  factoryDay: number;
  factoryId: string;
  tx: Prisma.TransactionClient;
}) {
  const factory = await input.tx.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: { cashBalanceCents: true, currentFinancePeriod: true },
  });
  const dues = await input.tx.factoryFinanceDue.findMany({
    where: {
      category: FinanceCategory.LEASING_PAYMENT,
      direction: FinanceDirection.EXPENSE,
      dueDay: { lte: input.factoryDay },
      factoryId: input.factoryId,
      sourceType: FinanceSourceType.LEASING_CONTRACT,
      status: {
        in: [
          FinanceDueStatus.PENDING,
          FinanceDueStatus.PARTIAL,
          FinanceDueStatus.OVERDUE,
        ],
      },
    },
    orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }],
  });
  let balanceCents = factory.cashBalanceCents;
  const paidDueIds: string[] = [];
  const partialDueIds: string[] = [];
  const overdueDueIds: string[] = [];

  for (const due of dues) {
    if (!due.sourceId) continue;
    const contract = await input.tx.factoryLeasingContract.findFirst({
      where: {
        factoryId: input.factoryId,
        id: due.sourceId,
        status: LeasingContractStatus.ACTIVE,
      },
    });

    if (!contract) continue;

    const payment = calculateLeasingPayment({
      balanceCents,
      dueAmountCents: due.amountCents,
      settledAmountCents: due.settledAmountCents,
    });
    const claimed = await input.tx.factoryFinanceDue.updateMany({
      where: {
        id: due.id,
        settledAmountCents: due.settledAmountCents,
        status: due.status,
      },
      data: {
        settledAmountCents: payment.settledAmountCents,
        status: payment.status,
      },
    });

    if (claimed.count !== 1) continue;

    if (payment.paidCents > BigInt(0)) {
      const cashClaim = await input.tx.factory.updateMany({
        where: {
          cashBalanceCents: { gte: payment.paidCents },
          id: input.factoryId,
        },
        data: { cashBalanceCents: { decrement: payment.paidCents } },
      });

      if (cashClaim.count !== 1) {
        throw new Error("Leasing payment cash claim failed.");
      }

      await input.tx.factoryFinanceTransaction.create({
        data: {
          amountCents: payment.paidCents,
          balanceAfterCents: payment.balanceAfterCents,
          balanceBeforeCents: balanceCents,
          category: FinanceCategory.LEASING_PAYMENT,
          description: "finance.leasingPayment",
          direction: FinanceDirection.EXPENSE,
          factoryId: input.factoryId,
          financeDueId: due.id,
          gameDay: input.factoryDay,
          metadata: {
            dueDay: due.dueDay,
            installmentIndex: due.periodIndex,
            remainingCents: payment.remainingCents.toString(),
            translationKey: "finance.leasingPayment",
          },
          periodIndex: factory.currentFinancePeriod,
          referenceKey: buildLeasingPaymentReferenceKey({
            contractId: contract.id,
            installmentIndex: due.periodIndex,
            settledBeforeCents: due.settledAmountCents,
          }),
          sourceId: contract.id,
          sourceType: FinanceSourceType.LEASING_CONTRACT,
        },
      });
      balanceCents = payment.balanceAfterCents;
    }

    if (payment.status === FinanceDueStatus.PAID) {
      const remainingInstallments = Math.max(
        0,
        contract.remainingInstallments - 1,
      );

      if (remainingInstallments === 0) {
        await input.tx.factoryLeasingContract.update({
          where: { id: contract.id },
          data: {
            endedDay: input.factoryDay,
            nextDueDay: null,
            remainingInstallments: 0,
            remainingMonths: 0,
            status: LeasingContractStatus.COMPLETED,
          },
        });
      } else {
        const installmentIndex =
          contract.installmentCount - remainingInstallments + 1;
        const nextDueDay = due.dueDay + LEASING_PERIOD_DAYS;

        await input.tx.factoryLeasingContract.update({
          where: { id: contract.id },
          data: {
            nextDueDay,
            remainingInstallments,
            remainingMonths: remainingInstallments,
          },
        });
        await input.tx.factoryFinanceDue.upsert({
          where: {
            referenceKey: buildLeasingDueReferenceKey({
              contractId: contract.id,
              installmentIndex,
            }),
          },
          create: {
            amountCents: contract.monthlyPaymentCents,
            category: FinanceCategory.LEASING_PAYMENT,
            createdDay: input.factoryDay,
            description: "finance.leasingInstallment",
            direction: FinanceDirection.EXPENSE,
            dueDay: nextDueDay,
            factoryId: input.factoryId,
            metadata: {
              installmentCount: contract.installmentCount,
              installmentIndex,
              translationKey: "finance.leasingInstallment",
            },
            periodIndex: installmentIndex,
            referenceKey: buildLeasingDueReferenceKey({
              contractId: contract.id,
              installmentIndex,
            }),
            sourceId: contract.id,
            sourceType: FinanceSourceType.LEASING_CONTRACT,
          },
          update: {},
        });
      }
      paidDueIds.push(due.id);
    } else if (payment.status === FinanceDueStatus.PARTIAL) {
      partialDueIds.push(due.id);
    } else {
      overdueDueIds.push(due.id);
    }
  }

  return { overdueDueIds, paidDueIds, partialDueIds };
}

export function buildLeasingPaymentReferenceKey(input: {
  contractId: string;
  installmentIndex: number;
  settledBeforeCents: bigint;
}) {
  return `LEASING_PAYMENT:${input.contractId}:${input.installmentIndex}:${input.settledBeforeCents}`;
}

function minBigInt(first: bigint, second: bigint) {
  return first < second ? first : second;
}

function maxBigInt(first: bigint, second: bigint) {
  return first > second ? first : second;
}

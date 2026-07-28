import {
  ContentStatus,
  FactoryStatus,
  FinanceDirection,
  FinanceDueStatus,
  LeasingContractStatus,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getActiveShiftPlayback } from "@/features/game/services/shift-playback-view";

import { ECONOMICALLY_OWNED_PRODUCTION_LINE_STATUSES } from "./production-line-statuses";

const LEASING_CYCLE_DAYS = 22;

type LeasingCreditClient = Prisma.TransactionClient | PrismaClient;

export const LEASING_DECISION_REASONS = {
  ACTIVE_CONTRACT_LIMIT_EXCEEDED: "ACTIVE_CONTRACT_LIMIT_EXCEEDED",
  CYCLE_PAYMENT_LIMIT_EXCEEDED: "CYCLE_PAYMENT_LIMIT_EXCEEDED",
  DEFAULTED_CONTRACT_EXISTS: "DEFAULTED_CONTRACT_EXISTS",
  DUPLICATE_REQUEST: "DUPLICATE_REQUEST",
  EXPOSURE_LIMIT_EXCEEDED: "EXPOSURE_LIMIT_EXCEEDED",
  FACTORY_INACTIVE: "FACTORY_INACTIVE",
  INSUFFICIENT_CASH_FOR_DOWN_PAYMENT:
    "INSUFFICIENT_CASH_FOR_DOWN_PAYMENT",
  INSUFFICIENT_CASH_RESERVE: "INSUFFICIENT_CASH_RESERVE",
  OVERDUE_PAYMENT_EXISTS: "OVERDUE_PAYMENT_EXISTS",
  PARTIAL_PAYMENT_EXISTS: "PARTIAL_PAYMENT_EXISTS",
  SHIFT_IN_PROGRESS: "SHIFT_IN_PROGRESS",
} as const;

export type LeasingDecisionReason =
  (typeof LEASING_DECISION_REASONS)[keyof typeof LEASING_DECISION_REASONS];

export type LeasingCreditDecision = {
  activeContractCount: number;
  approved: boolean;
  candidateCyclePaymentCents: string;
  candidateExposureCents: string;
  cashReserveAfterDownPaymentCents: string;
  currentCyclePaymentCents: string;
  currentExposureCents: string;
  maxActiveContracts: number;
  maxCyclePaymentCents: string;
  maxExposureCents: string;
  ownedProductionLineCount: number;
  pendingContractCount: number;
  projectedContractCount: number;
  projectedCyclePaymentCents: string;
  projectedExposureCents: string;
  reasons: LeasingDecisionReason[];
  requiredReserveCents: string;
};

export type LeasingCreditPolicyContext = {
  activeContractCount: number;
  cashBalanceCents: bigint;
  configuredMinimumReserveCents: bigint;
  currentCyclePaymentCents: bigint;
  currentExposureCents: bigint;
  defaultedContractExists: boolean;
  factoryActive: boolean;
  maxActiveContracts: number;
  maxCyclePaymentCents: bigint;
  maxExposureCents: bigint;
  ownedProductionLineCount: number;
  overduePaymentExists: boolean;
  partialPaymentExists: boolean;
  pendingContractCount: number;
  requiredReserveCents: bigint;
  shiftInProgress: boolean;
};

export class LeasingCreditConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeasingCreditConfigurationError";
  }
}

export async function getLeasingCreditPolicyContext(input: {
  factoryId: string;
  prisma: LeasingCreditClient;
}): Promise<LeasingCreditPolicyContext> {
  const factory = await input.prisma.factory.findUniqueOrThrow({
    where: { id: input.factoryId },
    select: {
      cashBalanceCents: true,
      currentDay: true,
      sectorId: true,
      status: true,
    },
  });
  const [
    activePlayback,
    runningShift,
    ownedProductionLineCount,
    contracts,
    leasingDues,
    upcomingCommittedPayments,
  ] = await Promise.all([
    getActiveShiftPlayback({
      factoryId: input.factoryId,
      prisma: input.prisma,
    }),
    input.prisma.shiftSimulation.findFirst({
      where: {
        factoryId: input.factoryId,
        status: "RUNNING",
      },
      select: { id: true },
    }),
    input.prisma.factoryProductionLine.count({
      where: {
        factoryId: input.factoryId,
        status: { in: [...ECONOMICALLY_OWNED_PRODUCTION_LINE_STATUSES] },
      },
    }),
    input.prisma.factoryLeasingContract.findMany({
      where: {
        factoryId: input.factoryId,
        status: {
          in: [
            LeasingContractStatus.PENDING_ACTIVATION,
            LeasingContractStatus.ACTIVE,
            LeasingContractStatus.DEFAULTED,
          ],
        },
      },
      select: {
        monthlyPaymentCents: true,
        remainingInstallments: true,
        status: true,
      },
    }),
    input.prisma.factoryFinanceDue.findMany({
      where: {
        category: "LEASING_PAYMENT",
        direction: FinanceDirection.EXPENSE,
        factoryId: input.factoryId,
        status: {
          in: [
            FinanceDueStatus.PENDING,
            FinanceDueStatus.PARTIAL,
            FinanceDueStatus.OVERDUE,
          ],
        },
      },
      select: {
        dueDay: true,
        status: true,
      },
    }),
    input.prisma.factoryFinanceDue.findMany({
      where: {
        direction: FinanceDirection.EXPENSE,
        dueDay: {
          lte: factory.currentDay + LEASING_CYCLE_DAYS,
        },
        factoryId: input.factoryId,
        status: {
          in: [
            FinanceDueStatus.PENDING,
            FinanceDueStatus.PARTIAL,
            FinanceDueStatus.OVERDUE,
          ],
        },
      },
      select: {
        amountCents: true,
        settledAmountCents: true,
      },
    }),
  ]);
  const projectedOwnedProductionLineCount = ownedProductionLineCount + 1;
  const rules = await input.prisma.sectorLeasingCreditRule.findMany({
    where: {
      minOwnedProductionLines: {
        lte: projectedOwnedProductionLineCount,
      },
      sectorId: factory.sectorId,
      status: ContentStatus.ACTIVE,
      OR: [
        { maxOwnedProductionLines: null },
        {
          maxOwnedProductionLines: {
            gte: projectedOwnedProductionLineCount,
          },
        },
      ],
    },
    orderBy: { minOwnedProductionLines: "desc" },
    take: 2,
    select: {
      configuredMinimumReserveCents: true,
      maxActiveContracts: true,
      maxCyclePaymentCents: true,
      maxExposureCents: true,
    },
  });

  if (rules.length !== 1) {
    throw new LeasingCreditConfigurationError(
      rules.length === 0
        ? `No active leasing credit rule covers ${projectedOwnedProductionLineCount} owned lines.`
        : `Multiple leasing credit rules cover ${projectedOwnedProductionLineCount} owned lines.`,
    );
  }

  const rule = rules[0];

  if (!rule) {
    throw new LeasingCreditConfigurationError(
      "Leasing credit rule resolution returned an empty result.",
    );
  }

  const activeContracts = contracts.filter(
    (contract) => contract.status === LeasingContractStatus.ACTIVE,
  );
  const pendingContracts = contracts.filter(
    (contract) =>
      contract.status === LeasingContractStatus.PENDING_ACTIVATION,
  );
  const exposureContracts = [...activeContracts, ...pendingContracts];
  const currentExposureCents = exposureContracts.reduce(
    (total, contract) =>
      total +
      contract.monthlyPaymentCents *
        BigInt(Math.max(0, contract.remainingInstallments)),
    BigInt(0),
  );
  const currentCyclePaymentCents = exposureContracts.reduce(
    (total, contract) => total + contract.monthlyPaymentCents,
    BigInt(0),
  );
  const upcomingCommittedPaymentsCents =
    upcomingCommittedPayments.reduce(
      (total, due) =>
        total +
        maxBigInt(
          BigInt(0),
          due.amountCents - due.settledAmountCents,
        ),
      BigInt(0),
    );

  return {
    activeContractCount: activeContracts.length,
    cashBalanceCents: factory.cashBalanceCents,
    configuredMinimumReserveCents:
      rule.configuredMinimumReserveCents,
    currentCyclePaymentCents,
    currentExposureCents,
    defaultedContractExists: contracts.some(
      (contract) =>
        contract.status === LeasingContractStatus.DEFAULTED,
    ),
    factoryActive: factory.status === FactoryStatus.ACTIVE,
    maxActiveContracts: rule.maxActiveContracts,
    maxCyclePaymentCents: rule.maxCyclePaymentCents,
    maxExposureCents: rule.maxExposureCents,
    overduePaymentExists: leasingDues.some(
      (due) =>
        due.status === FinanceDueStatus.OVERDUE ||
        (due.status === FinanceDueStatus.PENDING &&
          due.dueDay < factory.currentDay),
    ),
    ownedProductionLineCount,
    partialPaymentExists: leasingDues.some(
      (due) => due.status === FinanceDueStatus.PARTIAL,
    ),
    pendingContractCount: pendingContracts.length,
    requiredReserveCents: maxBigInt(
      rule.configuredMinimumReserveCents,
      upcomingCommittedPaymentsCents,
    ),
    shiftInProgress: Boolean(activePlayback || runningShift),
  };
}

export function evaluateLeasingCreditCandidate(input: {
  candidateCyclePaymentCents: bigint;
  candidateExposureCents: bigint;
  context: LeasingCreditPolicyContext;
  downPaymentCents: bigint;
}): LeasingCreditDecision {
  assertNonNegativeMoney(
    input.candidateCyclePaymentCents,
    "Candidate cycle payment",
  );
  assertNonNegativeMoney(
    input.candidateExposureCents,
    "Candidate exposure",
  );
  assertNonNegativeMoney(input.downPaymentCents, "Down payment");

  const projectedContractCount =
    input.context.activeContractCount +
    input.context.pendingContractCount +
    1;
  const projectedExposureCents =
    input.context.currentExposureCents + input.candidateExposureCents;
  const projectedCyclePaymentCents =
    input.context.currentCyclePaymentCents +
    input.candidateCyclePaymentCents;
  const cashReserveAfterDownPaymentCents =
    input.context.cashBalanceCents - input.downPaymentCents;
  const reasons: LeasingDecisionReason[] = [];

  if (!input.context.factoryActive) {
    reasons.push(LEASING_DECISION_REASONS.FACTORY_INACTIVE);
  }
  if (input.context.shiftInProgress) {
    reasons.push(LEASING_DECISION_REASONS.SHIFT_IN_PROGRESS);
  }
  if (input.context.overduePaymentExists) {
    reasons.push(LEASING_DECISION_REASONS.OVERDUE_PAYMENT_EXISTS);
  }
  if (input.context.partialPaymentExists) {
    reasons.push(LEASING_DECISION_REASONS.PARTIAL_PAYMENT_EXISTS);
  }
  if (input.context.defaultedContractExists) {
    reasons.push(LEASING_DECISION_REASONS.DEFAULTED_CONTRACT_EXISTS);
  }
  if (input.context.cashBalanceCents < input.downPaymentCents) {
    reasons.push(
      LEASING_DECISION_REASONS.INSUFFICIENT_CASH_FOR_DOWN_PAYMENT,
    );
  }
  if (
    cashReserveAfterDownPaymentCents <
    input.context.requiredReserveCents
  ) {
    reasons.push(LEASING_DECISION_REASONS.INSUFFICIENT_CASH_RESERVE);
  }
  if (projectedContractCount > input.context.maxActiveContracts) {
    reasons.push(
      LEASING_DECISION_REASONS.ACTIVE_CONTRACT_LIMIT_EXCEEDED,
    );
  }
  if (projectedExposureCents > input.context.maxExposureCents) {
    reasons.push(LEASING_DECISION_REASONS.EXPOSURE_LIMIT_EXCEEDED);
  }
  if (
    projectedCyclePaymentCents >
    input.context.maxCyclePaymentCents
  ) {
    reasons.push(
      LEASING_DECISION_REASONS.CYCLE_PAYMENT_LIMIT_EXCEEDED,
    );
  }

  return {
    activeContractCount: input.context.activeContractCount,
    approved: reasons.length === 0,
    candidateCyclePaymentCents:
      input.candidateCyclePaymentCents.toString(),
    candidateExposureCents: input.candidateExposureCents.toString(),
    cashReserveAfterDownPaymentCents:
      cashReserveAfterDownPaymentCents.toString(),
    currentCyclePaymentCents:
      input.context.currentCyclePaymentCents.toString(),
    currentExposureCents:
      input.context.currentExposureCents.toString(),
    maxActiveContracts: input.context.maxActiveContracts,
    maxCyclePaymentCents:
      input.context.maxCyclePaymentCents.toString(),
    maxExposureCents: input.context.maxExposureCents.toString(),
    ownedProductionLineCount:
      input.context.ownedProductionLineCount,
    pendingContractCount: input.context.pendingContractCount,
    projectedContractCount,
    projectedCyclePaymentCents: projectedCyclePaymentCents.toString(),
    projectedExposureCents: projectedExposureCents.toString(),
    reasons,
    requiredReserveCents: input.context.requiredReserveCents.toString(),
  };
}

export async function evaluateLeasingCreditPolicy(input: {
  candidateCyclePaymentCents: bigint;
  candidateExposureCents: bigint;
  downPaymentCents: bigint;
  factoryId: string;
  prisma: LeasingCreditClient;
}) {
  const context = await getLeasingCreditPolicyContext({
    factoryId: input.factoryId,
    prisma: input.prisma,
  });

  return evaluateLeasingCreditCandidate({
    candidateCyclePaymentCents: input.candidateCyclePaymentCents,
    candidateExposureCents: input.candidateExposureCents,
    context,
    downPaymentCents: input.downPaymentCents,
  });
}

function assertNonNegativeMoney(value: bigint, label: string) {
  if (value < BigInt(0)) {
    throw new Error(`${label} must be non-negative.`);
  }
}

function maxBigInt(first: bigint, second: bigint) {
  return first > second ? first : second;
}

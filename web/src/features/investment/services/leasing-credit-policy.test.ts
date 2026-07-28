import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateLeasingCreditCandidate,
  LEASING_DECISION_REASONS,
  type LeasingCreditPolicyContext,
} from "./leasing-credit-policy";

function buildContext(
  overrides: Partial<LeasingCreditPolicyContext> = {},
): LeasingCreditPolicyContext {
  return {
    activeContractCount: 1,
    cashBalanceCents: BigInt(20_000_000),
    configuredMinimumReserveCents: BigInt(5_000_000),
    currentCyclePaymentCents: BigInt(500_000),
    currentExposureCents: BigInt(8_000_000),
    defaultedContractExists: false,
    factoryActive: true,
    maxActiveContracts: 3,
    maxCyclePaymentCents: BigInt(2_500_000),
    maxExposureCents: BigInt(25_000_000),
    overduePaymentExists: false,
    ownedProductionLineCount: 7,
    partialPaymentExists: false,
    pendingContractCount: 0,
    requiredReserveCents: BigInt(5_000_000),
    shiftInProgress: false,
    ...overrides,
  };
}

test("banka kararı sözleşme, exposure, 22 günlük yük ve rezervi projekte eder", () => {
  const decision = evaluateLeasingCreditCandidate({
    candidateCyclePaymentCents: BigInt(600_000),
    candidateExposureCents: BigInt(9_000_000),
    context: buildContext(),
    downPaymentCents: BigInt(2_000_000),
  });

  assert.equal(decision.approved, true);
  assert.equal(decision.projectedContractCount, 2);
  assert.equal(decision.projectedExposureCents, "17000000");
  assert.equal(decision.projectedCyclePaymentCents, "1100000");
  assert.equal(decision.cashReserveAfterDownPaymentCents, "18000000");
  assert.deepEqual(decision.reasons, []);
});

test("pending sözleşmeler aktif limit ve toplam riske dahil edilir", () => {
  const decision = evaluateLeasingCreditCandidate({
    candidateCyclePaymentCents: BigInt(600_000),
    candidateExposureCents: BigInt(9_000_000),
    context: buildContext({
      activeContractCount: 1,
      maxActiveContracts: 2,
      pendingContractCount: 1,
    }),
    downPaymentCents: BigInt(2_000_000),
  });

  assert.equal(decision.approved, false);
  assert.ok(
    decision.reasons.includes(
      LEASING_DECISION_REASONS.ACTIVE_CONTRACT_LIMIT_EXCEEDED,
    ),
  );
});

test("gecikme, kısmi ödeme, temerrüt ve rezerv açığı ayrı hard block nedenleridir", () => {
  const decision = evaluateLeasingCreditCandidate({
    candidateCyclePaymentCents: BigInt(100_000),
    candidateExposureCents: BigInt(100_000),
    context: buildContext({
      cashBalanceCents: BigInt(5_500_000),
      defaultedContractExists: true,
      overduePaymentExists: true,
      partialPaymentExists: true,
      requiredReserveCents: BigInt(5_000_000),
    }),
    downPaymentCents: BigInt(1_000_000),
  });

  assert.equal(decision.approved, false);
  assert.deepEqual(decision.reasons, [
    LEASING_DECISION_REASONS.OVERDUE_PAYMENT_EXISTS,
    LEASING_DECISION_REASONS.PARTIAL_PAYMENT_EXISTS,
    LEASING_DECISION_REASONS.DEFAULTED_CONTRACT_EXISTS,
    LEASING_DECISION_REASONS.INSUFFICIENT_CASH_RESERVE,
  ]);
});

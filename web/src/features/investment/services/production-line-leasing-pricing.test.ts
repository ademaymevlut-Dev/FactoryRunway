import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateProductionLineLeasingPricing,
  PRODUCTION_LINE_LEASING_TERMS,
} from "./production-line-leasing-pricing";

test("Precision 75.000 para birimi için leasing tutarlarını cent olarak hesaplar", () => {
  assert.deepEqual(
    PRODUCTION_LINE_LEASING_TERMS.map((term) =>
      calculateProductionLineLeasingPricing({
        installmentCount: term.installmentCount,
        purchaseCostCents: 7_500_000,
        termYears: term.termYears,
      }),
    ),
    [
      {
        downPaymentCents: 1_500_000,
        installmentAmountCents: 296_875,
        installmentCount: 24,
        termYears: 2,
        totalCostCents: 8_625_000,
      },
      {
        downPaymentCents: 1_125_000,
        installmentAmountCents: 229_167,
        installmentCount: 36,
        termYears: 3,
        totalCostCents: 9_375_012,
      },
      {
        downPaymentCents: 750_000,
        installmentAmountCents: 168_750,
        installmentCount: 60,
        termYears: 5,
        totalCostCents: 10_875_000,
      },
    ],
  );
});

test("Smart 115.000 para birimi için leasing tutarlarını güncel alış bedelinden üretir", () => {
  assert.deepEqual(
    PRODUCTION_LINE_LEASING_TERMS.map((term) =>
      calculateProductionLineLeasingPricing({
        installmentCount: term.installmentCount,
        purchaseCostCents: 11_500_000,
        termYears: term.termYears,
      }),
    ),
    [
      {
        downPaymentCents: 2_300_000,
        installmentAmountCents: 455_209,
        installmentCount: 24,
        termYears: 2,
        totalCostCents: 13_225_016,
      },
      {
        downPaymentCents: 1_725_000,
        installmentAmountCents: 351_389,
        installmentCount: 36,
        termYears: 3,
        totalCostCents: 14_375_004,
      },
      {
        downPaymentCents: 1_150_000,
        installmentAmountCents: 258_750,
        installmentCount: 60,
        termYears: 5,
        totalCostCents: 16_675_000,
      },
    ],
  );
});

test("tanımsız vade ve taksit kombinasyonunu reddeder", () => {
  assert.throws(
    () =>
      calculateProductionLineLeasingPricing({
        installmentCount: 48,
        purchaseCostCents: 7_500_000,
        termYears: 4,
      }),
    /Unsupported production line leasing term/,
  );
});

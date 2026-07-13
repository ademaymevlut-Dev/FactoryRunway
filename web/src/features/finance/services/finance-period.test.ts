import assert from "node:assert/strict";
import test from "node:test";

import { getFinancePeriod, getMaxFinancePeriodIndex } from "./finance-period";

test("22 günlük finans dönemini oyun ayı olarak hesaplar", () => {
  assert.deepEqual(getFinancePeriod({ currentDay: 1 }), {
    currentDay: 1,
    endDay: 22,
    financePeriodDays: 22,
    isCurrentPeriod: true,
    maxPeriodIndex: 1,
    monthInYear: 1,
    periodIndex: 1,
    startDay: 1,
    yearIndex: 1,
  });

  assert.deepEqual(getFinancePeriod({ currentDay: 67 }), {
    currentDay: 67,
    endDay: 88,
    financePeriodDays: 22,
    isCurrentPeriod: true,
    maxPeriodIndex: 4,
    monthInYear: 4,
    periodIndex: 4,
    startDay: 67,
    yearIndex: 1,
  });
});

test("seçilen dönem geleceğe taşarsa mevcut son aya sabitlenir", () => {
  assert.equal(getMaxFinancePeriodIndex({ currentDay: 67 }), 4);
  assert.equal(
    getFinancePeriod({ currentDay: 67, periodIndex: 99 }).periodIndex,
    4,
  );
  assert.equal(
    getFinancePeriod({ currentDay: 67, periodIndex: 3 }).isCurrentPeriod,
    false,
  );
});

test("12 aydan sonra fabrika yılı artar", () => {
  const period = getFinancePeriod({ currentDay: 265 });

  assert.equal(period.periodIndex, 13);
  assert.equal(period.monthInYear, 1);
  assert.equal(period.yearIndex, 2);
});

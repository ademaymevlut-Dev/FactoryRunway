import type { FinancePeriodView } from "../types";

const DEFAULT_FINANCE_PERIOD_DAYS = 22;
const MONTHS_PER_YEAR = 12;

export function getFinancePeriod(input: {
  currentDay: number;
  financePeriodDays?: number | null;
  periodIndex?: number | null;
}): FinancePeriodView {
  const financePeriodDays = Math.max(
    1,
    input.financePeriodDays ?? DEFAULT_FINANCE_PERIOD_DAYS,
  );
  const currentDay = Math.max(1, input.currentDay);
  const maxPeriodIndex = getMaxFinancePeriodIndex({
    currentDay,
    financePeriodDays,
  });
  const periodIndex = clampPeriodIndex(
    input.periodIndex ?? maxPeriodIndex,
    maxPeriodIndex,
  );
  const startDay = (periodIndex - 1) * financePeriodDays + 1;
  const endDay = periodIndex * financePeriodDays;

  return {
    currentDay,
    endDay,
    financePeriodDays,
    isCurrentPeriod: periodIndex === maxPeriodIndex,
    maxPeriodIndex,
    monthInYear: ((periodIndex - 1) % MONTHS_PER_YEAR) + 1,
    periodIndex,
    startDay,
    yearIndex: Math.floor((periodIndex - 1) / MONTHS_PER_YEAR) + 1,
  };
}

export function getMaxFinancePeriodIndex(input: {
  currentDay: number;
  financePeriodDays?: number | null;
}) {
  const financePeriodDays = Math.max(
    1,
    input.financePeriodDays ?? DEFAULT_FINANCE_PERIOD_DAYS,
  );

  return Math.max(1, Math.ceil(Math.max(1, input.currentDay) / financePeriodDays));
}

function clampPeriodIndex(periodIndex: number, maxPeriodIndex: number) {
  if (!Number.isFinite(periodIndex)) return maxPeriodIndex;

  return Math.min(maxPeriodIndex, Math.max(1, Math.trunc(periodIndex)));
}

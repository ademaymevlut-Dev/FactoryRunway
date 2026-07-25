import type {
  FactoryLineWorkload,
  FactoryLineWorkloadState,
} from "../types";
import { gameCopy } from "../game-copy";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

type WorkloadClassification = {
  label: string;
  state: FactoryLineWorkloadState;
};

export function buildFactoryLineWorkload(input: {
  dailyPointCapacity: number;
  effectiveDailyPointCapacity: number;
  locale?: SupportedLocale;
  remainingWorkPoints: number;
}): FactoryLineWorkload {
  const locale = normalizeLocale(input.locale);
  const copy = gameCopy[locale].workload;
  const remainingWorkPoints = Math.max(0, Math.trunc(input.remainingWorkPoints));
  const effectiveDailyPointCapacity = Math.max(
    0,
    Math.trunc(input.effectiveDailyPointCapacity),
  );
  const remainingDays =
    remainingWorkPoints > 0 && effectiveDailyPointCapacity > 0
      ? Math.ceil(remainingWorkPoints / effectiveDailyPointCapacity)
      : remainingWorkPoints > 0
        ? null
        : 0;
  const classification =
    remainingDays === null
      ? { label: copy.noCapacity, state: "critical" as const }
      : classifyFactoryLineWorkloadDays(remainingDays, locale);

  return {
    dailyPointCapacity: Math.max(0, Math.trunc(input.dailyPointCapacity)),
    daysLabel:
      remainingDays === null
        ? `∞${copy.daySuffix}`
        : remainingDays === 0
          ? `0${copy.daySuffix}`
          : `${remainingDays}${copy.daySuffix}`,
    effectiveDailyPointCapacity,
    label: classification.label,
    remainingDays,
    remainingWorkPoints,
    state: classification.state,
  };
}

export function classifyFactoryLineWorkloadDays(
  remainingDays: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
): WorkloadClassification {
  const labels = gameCopy[locale].workload.states;

  if (remainingDays <= 0) {
    return { label: labels.empty, state: "empty" };
  }

  if (remainingDays <= 2) {
    return { label: labels.low, state: "low" };
  }

  if (remainingDays <= 4) {
    return { label: labels.thin, state: "thin" };
  }

  if (remainingDays <= 9) {
    return { label: labels.balanced, state: "balanced" };
  }

  if (remainingDays <= 14) {
    return { label: labels.constrained, state: "constrained" };
  }

  return { label: labels.critical, state: "critical" };
}

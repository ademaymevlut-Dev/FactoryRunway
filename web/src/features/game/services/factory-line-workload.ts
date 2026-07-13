import type {
  FactoryLineWorkload,
  FactoryLineWorkloadState,
} from "../types";

type WorkloadClassification = {
  label: string;
  state: FactoryLineWorkloadState;
};

export function buildFactoryLineWorkload(input: {
  dailyPointCapacity: number;
  effectiveDailyPointCapacity: number;
  remainingWorkPoints: number;
}): FactoryLineWorkload {
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
      ? { label: "Kapasite Yok", state: "critical" as const }
      : classifyFactoryLineWorkloadDays(remainingDays);

  return {
    dailyPointCapacity: Math.max(0, Math.trunc(input.dailyPointCapacity)),
    daysLabel:
      remainingDays === null
        ? "∞g"
        : remainingDays === 0
          ? "0g"
          : `${remainingDays}g`,
    effectiveDailyPointCapacity,
    label: classification.label,
    remainingDays,
    remainingWorkPoints,
    state: classification.state,
  };
}

export function classifyFactoryLineWorkloadDays(
  remainingDays: number,
): WorkloadClassification {
  if (remainingDays <= 0) {
    return { label: "Boşta", state: "empty" };
  }

  if (remainingDays <= 2) {
    return { label: "Düşük Yük", state: "low" };
  }

  if (remainingDays <= 4) {
    return { label: "Zayıf Yük", state: "thin" };
  }

  if (remainingDays <= 9) {
    return { label: "Dengeli", state: "balanced" };
  }

  if (remainingDays <= 14) {
    return { label: "Sıkışma Riski", state: "constrained" };
  }

  return { label: "Kritik Darboğaz", state: "critical" };
}

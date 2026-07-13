import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFactoryLineWorkload,
  classifyFactoryLineWorkloadDays,
} from "./factory-line-workload";

test("hat iş yükü gün eşikleri beklenen algı durumlarına ayrılır", () => {
  assert.deepEqual(classifyFactoryLineWorkloadDays(0), {
    label: "Boşta",
    state: "empty",
  });
  assert.deepEqual(classifyFactoryLineWorkloadDays(2), {
    label: "Düşük Yük",
    state: "low",
  });
  assert.deepEqual(classifyFactoryLineWorkloadDays(4), {
    label: "Zayıf Yük",
    state: "thin",
  });
  assert.deepEqual(classifyFactoryLineWorkloadDays(9), {
    label: "Dengeli",
    state: "balanced",
  });
  assert.deepEqual(classifyFactoryLineWorkloadDays(14), {
    label: "Sıkışma Riski",
    state: "constrained",
  });
  assert.deepEqual(classifyFactoryLineWorkloadDays(15), {
    label: "Kritik Darboğaz",
    state: "critical",
  });
});

test("kalan iş yükü puanı efektif günlük kapasiteye bölünerek kalan gün üretilir", () => {
  assert.deepEqual(
    buildFactoryLineWorkload({
      dailyPointCapacity: 12_000,
      effectiveDailyPointCapacity: 10_000,
      remainingWorkPoints: 46_000,
    }),
    {
      dailyPointCapacity: 12_000,
      daysLabel: "5g",
      effectiveDailyPointCapacity: 10_000,
      label: "Dengeli",
      remainingDays: 5,
      remainingWorkPoints: 46_000,
      state: "balanced",
    },
  );
});

test("iş var ama efektif kapasite yoksa kritik kapasite yok durumuna düşer", () => {
  assert.deepEqual(
    buildFactoryLineWorkload({
      dailyPointCapacity: 0,
      effectiveDailyPointCapacity: 0,
      remainingWorkPoints: 1_000,
    }),
    {
      dailyPointCapacity: 0,
      daysLabel: "∞g",
      effectiveDailyPointCapacity: 0,
      label: "Kapasite Yok",
      remainingDays: null,
      remainingWorkPoints: 1_000,
      state: "critical",
    },
  );
});

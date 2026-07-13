import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFactoryLevelProgress,
  GLOBAL_LEVEL_SCOPE_KEY,
  pickApplicableLevelConfigs,
  resolveFactoryLevelFromXp,
  type PlayerLevelThreshold,
} from "./factory-progression";

const globalConfigs: PlayerLevelThreshold[] = [
  { level: 1, requiredXp: 0, scopeKey: GLOBAL_LEVEL_SCOPE_KEY, unlockKey: null },
  { level: 2, requiredXp: 500, scopeKey: GLOBAL_LEVEL_SCOPE_KEY, unlockKey: "global_l2" },
];

const textileConfigs: PlayerLevelThreshold[] = [
  { level: 1, requiredXp: 0, scopeKey: "textile-id", unlockKey: "starter_factory" },
  { level: 2, requiredXp: 500, scopeKey: "textile-id", unlockKey: "basic_goals" },
  { level: 3, requiredXp: 1_200, scopeKey: "textile-id", unlockKey: "new_customer_offers" },
  { level: 4, requiredXp: 2_200, scopeKey: "textile-id", unlockKey: null },
];

test("sector level config varsa global yerine onu kullanır", () => {
  assert.deepEqual(
    pickApplicableLevelConfigs([...globalConfigs, ...textileConfigs], "textile-id"),
    textileConfigs,
  );
});

test("sector level config yoksa global config fallback olur", () => {
  assert.deepEqual(
    pickApplicableLevelConfigs(globalConfigs, "unknown-sector"),
    globalConfigs,
  );
});

test("factory XP değerinden ulaşılabilecek en yüksek level hesaplanır", () => {
  assert.equal(
    resolveFactoryLevelFromXp({
      configs: textileConfigs,
      currentLevel: 1,
      currentXp: 1_600,
    }),
    3,
  );
});

test("level config değişse bile factory level geriye düşmez", () => {
  assert.equal(
    resolveFactoryLevelFromXp({
      configs: textileConfigs,
      currentLevel: 4,
      currentXp: 900,
    }),
    4,
  );
});

test("next level progress xp ve bps olarak döner", () => {
  assert.deepEqual(
    buildFactoryLevelProgress({
      configs: textileConfigs,
      currentLevel: 2,
      currentXp: 850,
    }),
    {
      currentLevelRequiredXp: 500,
      nextLevel: 3,
      nextLevelRequiredXp: 1_200,
      progressBps: 5_000,
      xpForNextLevel: 700,
      xpIntoCurrentLevel: 350,
      xpRemainingForNextLevel: 350,
    },
  );
});

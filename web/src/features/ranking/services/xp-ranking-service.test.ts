import assert from "node:assert/strict";
import test from "node:test";

import { calculatePageRankPositions } from "./xp-ranking-service";

test("Total XP eşitliğinde oyuncular aynı ranking pozisyonunu paylaşır", () => {
  assert.deepEqual(
    calculatePageRankPositions({
      firstXpPlayerCount: 2,
      playersAboveFirstXp: 0,
      xpValues: [
        BigInt(12_000),
        BigInt(12_000),
        BigInt(9_500),
        BigInt(8_000),
      ],
    }),
    [1, 1, 3, 4],
  );
});

test("sayfa bir XP eşitlik grubunun ortasında başladığında sonraki sıra doğru hesaplanır", () => {
  assert.deepEqual(
    calculatePageRankPositions({
      firstXpPlayerCount: 4,
      playersAboveFirstXp: 5,
      xpValues: [
        BigInt(8_000),
        BigInt(8_000),
        BigInt(7_500),
        BigInt(7_500),
        BigInt(6_000),
      ],
    }),
    [6, 6, 10, 10, 12],
  );
});

test("boş ranking sayfası pozisyon üretmez", () => {
  assert.deepEqual(
    calculatePageRankPositions({
      firstXpPlayerCount: 0,
      playersAboveFirstXp: 0,
      xpValues: [],
    }),
    [],
  );
});

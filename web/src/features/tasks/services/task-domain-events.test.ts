import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("ortak görev seed'i 20 görevi bütün sektörlere uygular", () => {
  const seed = readSource("../../../../prisma/seed-task-definitions.ts");
  const taskKeyCount = seed.match(/\bkey: "story_/g)?.length ?? 0;

  assert.equal(taskKeyCount, 20);
  assert.match(seed, /const sectors = await prisma\.sector\.findMany/);
  assert.match(seed, /activationLevel: 20/);
  assert.match(seed, /activationLevel: 25/);
  assert.match(
    seed,
    /key: "story_first_profitable_finance_period"[\s\S]*sortOrder: 200/,
  );
});

test("vardiya akışı fason, express, premium ve iç ara işlem görevlerini ilerletir", () => {
  const simulation = readSource(
    "../../game/services/day-simulation.ts",
  );

  assert.match(simulation, /objectiveType: "COMPLETE_OUTSOURCE"/);
  assert.match(simulation, /objectiveType: "COMPLETE_EXPRESS_ORDER"/);
  assert.match(simulation, /objectiveType: "COMPLETE_PREMIUM_ORDER"/);
  assert.match(
    simulation,
    /objectiveType: "COMPLETE_INTERNAL_PROCESS_ORDER"/,
  );
  assert.match(simulation, /departmentGroupKey/);
});

test("satın alma, leasing ve upgrade görev event metadata'sını üretir", () => {
  const purchase = readSource(
    "../../investment/services/purchase-production-line.ts",
  );
  const leasing = readSource(
    "../../investment/services/lease-production-line.ts",
  );
  const upgrade = readSource(
    "../../investment/services/upgrade-production-line.ts",
  );

  for (const source of [purchase, leasing]) {
    assert.match(source, /objectiveType: "ACQUIRE_PRODUCTION_LINE"/);
    assert.match(source, /activeDepartmentGroupLineCount/);
    assert.match(source, /departmentGroupKey/);
  }

  assert.match(upgrade, /objectiveType: "UPGRADE_PRODUCTION_LINE"/);
  assert.match(upgrade, /targetGrade: nextTemplate\.grade/);
});

test("görev kartı sayısal ilerlemeyi ve özel tamamlanma mesajını gösterir", () => {
  const card = readSource("../components/task-card.tsx");

  assert.match(card, /task\.currentValue/);
  assert.match(card, /task\.targetValue/);
  assert.match(card, /task\.progressBps/);
  assert.match(card, /task\.completionMessage/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { FinanceCategory } from "@/generated/prisma/client";

import {
  buildOperatingExpenseReferenceKey,
  buildOutsourcePaymentReferenceKey,
  buildPayrollReferenceKey,
} from "./financial-triggers";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("periyodik finans reference keyleri deterministiktir", () => {
  assert.equal(buildPayrollReferenceKey("factory-1", 22), "PAYROLL:factory-1:22");
  assert.equal(
    buildOperatingExpenseReferenceKey({
      category: FinanceCategory.ELECTRICITY,
      factoryId: "factory-1",
      gameDay: 32,
    }),
    "OPERATING_EXPENSE:ELECTRICITY:factory-1:32",
  );
  assert.equal(
    buildOutsourcePaymentReferenceKey("job-1"),
    "OUTSOURCE_COMPLETION_PAYMENT:job-1",
  );
});

test("maaş ve işletme gideri tetikleyicileri 22 günlük oyun ayına bağlıdır", () => {
  const source = readSource("./financial-triggers.ts");

  assert.match(source, /input\.factoryDay % PERIOD_DAYS === 0/);
  assert.match(source, /input\.factoryDay >= 10/);
  assert.match(source, /\(input\.factoryDay - 10\) % PERIOD_DAYS === 0/);
  assert.match(source, /monthlyElectricityBaseCents/);
});

test("fason action teklif seçiminde peşin ödeme oluşturmaz", () => {
  const source = readFileSync(
    new URL(
      "../../production-queue/actions/start-outsource-job-action.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(source, /factoryFinanceTransaction\.create/);
  assert.doesNotMatch(source, /cashBalanceCents:\s*\{\s*decrement/);
});

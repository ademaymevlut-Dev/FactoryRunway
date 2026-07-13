import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildLeasingDueReferenceKey,
  buildLineLeasingReferenceKey,
  calculateFirstLeasingDueDay,
} from "./lease-production-line";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("leasing request ve ilk 22 günlük due anahtarları deterministiktir", () => {
  assert.equal(
    buildLineLeasingReferenceKey({
      factoryId: "factory-1",
      requestId: "request-1",
    }),
    "LINE_LEASING_CREATE:factory-1:request-1",
  );
  assert.equal(calculateFirstLeasingDueDay(13), 35);
  assert.equal(
    buildLeasingDueReferenceKey({
      contractId: "contract-1",
      installmentIndex: 1,
    }),
    "LEASING_DUE:contract-1:1",
  );
});

test("leasing service client finans değerlerini değil aktif offer snapshotını kullanır", () => {
  const service = readSource("./lease-production-line.ts");

  assert.match(service, /productionLineLeasingOffer\.findUnique/);
  assert.match(service, /offer\.productionLineTemplateId !== template\.id/);
  assert.match(service, /offer\.status !== ContentStatus\.ACTIVE/);
  assert.match(service, /downPaymentCents: downPaymentCents/);
  assert.match(service, /installmentCount: offer\.installmentCount/);
  assert.match(service, /totalCostCents: BigInt\(offer\.totalCostCents\)/);
  assert.doesNotMatch(service, /input\.lease\.(?:price|downPayment|installment|totalCost|termYears)/);
});

test("leasing kurulumu tek serializable transaction içinde hat, personel, contract, due ve finans kaydı oluşturur", () => {
  const service = readSource("./lease-production-line.ts");

  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /tx\.factoryProductionLine\.create/);
  assert.match(service, /acquisitionType: LineAcquisitionType\.LEASED/);
  assert.match(service, /tx\.factoryStaffAssignment\.createMany/);
  assert.match(service, /tx\.factoryStaffAssignment\.upsert/);
  assert.match(service, /tx\.factoryLeasingContract\.create/);
  assert.match(service, /tx\.factoryFinanceDue\.create/);
  assert.match(service, /tx\.factoryFinanceTransaction\.create/);
  assert.match(service, /recalculateFactoryOperatingStage/);
  assert.match(service, /grantFactoryXp/);
  assert.match(service, /reason: stage\.stageChanged/);
});

test("schema offer master, contract snapshot ve duplicate due constraintini taşır", () => {
  const schema = readSource("../../../../prisma/schema.prisma");

  assert.match(schema, /model ProductionLineLeasingOffer/);
  assert.match(schema, /@@unique\(\[productionLineTemplateId, termYears\]\)/);
  assert.match(schema, /leasingOfferId\s+String/);
  assert.match(schema, /remainingInstallments\s+Int/);
  assert.match(schema, /nextDueDay\s+Int\?/);
  assert.match(schema, /referenceKey\s+String\?\s+@unique/);
});

test("master seed yalnızca 2, 3 ve 5 yıllık 24, 36 ve 60 taksit üretir", () => {
  const seed = readSource("../../../../prisma/seed-production-line-leasing-offers.ts");

  assert.match(seed, /installmentCount: 24[\s\S]*termYears: 2/);
  assert.match(seed, /installmentCount: 36[\s\S]*termYears: 3/);
  assert.match(seed, /installmentCount: 60[\s\S]*termYears: 5/);
  assert.match(seed, /productionLineLeasingOffer\.upsert/);
});

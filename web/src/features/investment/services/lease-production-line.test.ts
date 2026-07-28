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

test("leasing service client finans değerlerini değil aktif offer ile güncel template fiyatını kullanır", () => {
  const service = readSource("./lease-production-line.ts");

  assert.match(service, /productionLineLeasingOffer\.findUnique/);
  assert.match(service, /offer\.productionLineTemplateId !== template\.id/);
  assert.match(service, /offer\.status !== ContentStatus\.ACTIVE/);
  assert.match(service, /downPaymentCents: downPaymentCents/);
  assert.match(service, /calculateProductionLineLeasingPricing/);
  assert.match(service, /purchaseCostCents: template\.purchaseCostCents/);
  assert.match(service, /installmentCount: pricing\.installmentCount/);
  assert.match(service, /totalCostCents: BigInt\(pricing\.totalCostCents\)/);
  assert.doesNotMatch(service, /input\.lease\.(?:price|downPayment|installment|totalCost|termYears)/);
});

test("leasing edinimi kurulumu ve banka kararını tek serializable transaction içinde başlatır", () => {
  const service = readSource("./lease-production-line.ts");
  const activation = readSource(
    "./production-line-installation-activation.ts",
  );

  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /tx\.factoryProductionLine\.create/);
  assert.match(service, /acquisitionType: LineAcquisitionType\.LEASED/);
  assert.match(service, /status: FactoryProductionLineStatus\.INSTALLING/);
  assert.match(service, /tx\.factoryProductionLineInstallation\.create/);
  assert.match(service, /evaluateLeasingCreditPolicy/);
  assert.match(
    service,
    /status: LeasingContractStatus\.PENDING_ACTIVATION/,
  );
  assert.match(service, /tx\.factoryLeasingContract\.create/);
  assert.match(service, /tx\.factoryFinanceTransaction\.create/);
  assert.doesNotMatch(service, /tx\.factoryFinanceDue\.create/);

  assert.match(activation, /tx\.factoryStaffAssignment\.upsert/);
  assert.match(activation, /tx\.factoryFinanceDue\.upsert/);
  assert.match(activation, /recalculateFactoryOperatingStage/);
  assert.match(activation, /grantFactoryXp/);
  assert.match(
    activation,
    /calculateFirstLeasingDueDay\(input\.currentDay\)/,
  );
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
  const pricing = readSource("./production-line-leasing-pricing.ts");

  assert.match(pricing, /installmentCount: 24[\s\S]*termYears: 2/);
  assert.match(pricing, /installmentCount: 36[\s\S]*termYears: 3/);
  assert.match(pricing, /installmentCount: 60[\s\S]*termYears: 5/);
  assert.match(pricing, /productionLineLeasingOffer\.upsert/);
  assert.match(seed, /syncProductionLineLeasingOffers/);
});

import assert from "node:assert/strict";
import test from "node:test";

import { calculateProductionLineInvestmentPreview } from "./production-line-investment";

const directRole = {
  id: "direct-role",
  key: "operator",
  monthlySalaryCents: 90_000,
  translations: [{ name: "Operatör" }],
};
const supportRole = {
  id: "support-role",
  key: "planner",
  monthlySalaryCents: 140_000,
  translations: [{ name: "Planlama" }],
};
const stages = [
  {
    dailySupportMealPerStaffCents: 235,
    id: "small",
    key: "small_workshop",
    maxProductionLines: 5,
    minProductionLines: 3,
    sortOrder: 2,
    staffRequirements: [
      { requiredQuantity: 1, staffRole: supportRole },
    ],
    supportOverheadPerStaffCents: 600,
    translations: [{ name: "Small Workshop" }],
  },
  {
    dailySupportMealPerStaffCents: 255,
    id: "stable",
    key: "stable_workshop",
    maxProductionLines: 9,
    minProductionLines: 6,
    sortOrder: 3,
    staffRequirements: [
      { requiredQuantity: 2, staffRole: supportRole },
    ],
    supportOverheadPerStaffCents: 700,
    translations: [{ name: "Stable Workshop" }],
  },
];
const costConfig = {
  dailyMealPerDirectStaffCents: 235,
  directStaffOverheadPerStaffCents: 600,
  monthlyWorkDays: 22,
  rentPerM2Cents: 200,
};
const template = {
  areaM2: 100,
  department: { monthlyOverheadPerLineCents: 1_000 },
  idealStaff: 2,
  monthlyElectricityBaseCents: 20_000,
  purchaseCostCents: 200_000,
  staffRequirements: [
    { requiredQuantity: 2, staffRole: directRole },
  ],
};

test("maaş ve gider önizlemesini yalnızca DB config girdilerinden hesaplar", () => {
  const preview = calculateProductionLineInvestmentPreview({
    activeProductionLineCount: 3,
    costConfig,
    currentStageId: "small",
    stages,
    supportStaffByRoleId: new Map([["support-role", 1]]),
    template,
  });

  assert.equal(preview.directStaffCount, 2);
  assert.equal(preview.directPayrollIncreaseCents, "180000");
  assert.equal(preview.electricityIncreaseCents, "20000");
  assert.equal(preview.productionAreaRentIncreaseCents, "20000");
  assert.equal(preview.directStaffMealIncreaseCents, "10340");
  assert.equal(preview.supportStaffCount, 0);
});

test("stage yükselince yalnızca mevcut support requirement farkını ekler", () => {
  const preview = calculateProductionLineInvestmentPreview({
    activeProductionLineCount: 5,
    costConfig,
    currentStageId: "small",
    stages,
    supportStaffByRoleId: new Map([["support-role", 1]]),
    template,
  });

  assert.equal(preview.resultingOperatingStage.key, "stable_workshop");
  assert.equal(preview.supportStaffCount, 1);
  assert.equal(preview.supportPayrollIncreaseCents, "140000");
  assert.equal(preview.supportStaff[0]?.quantity, 1);
});

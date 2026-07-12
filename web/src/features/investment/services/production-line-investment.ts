import type { ProductionLineInvestmentPreview } from "../types";

type StaffRequirement = {
  requiredQuantity: number;
  staffRole: {
    id: string;
    key: string;
    monthlySalaryCents: number;
    translations: Array<{ name: string }>;
  };
};

export type InvestmentStage = {
  id: string;
  key: string;
  sortOrder: number;
  minProductionLines: number;
  maxProductionLines: number | null;
  dailySupportMealPerStaffCents: number;
  supportOverheadPerStaffCents: number;
  translations: Array<{ name: string }>;
  staffRequirements: StaffRequirement[];
};

export type InvestmentTemplate = {
  areaM2: number;
  idealStaff: number;
  monthlyElectricityBaseCents: number;
  purchaseCostCents: number;
  department: { monthlyOverheadPerLineCents: number };
  staffRequirements: StaffRequirement[];
};

export type InvestmentCostConfig = {
  dailyMealPerDirectStaffCents: number;
  directStaffOverheadPerStaffCents: number;
  monthlyWorkDays: number;
  rentPerM2Cents: number;
};

export function calculateProductionLineInvestmentPreview(input: {
  activeProductionLineCount: number;
  costConfig: InvestmentCostConfig;
  currentStageId: string | null;
  stages: InvestmentStage[];
  supportStaffByRoleId: ReadonlyMap<string, number>;
  template: InvestmentTemplate;
}): ProductionLineInvestmentPreview {
  const resultingStage = input.stages
    .filter(
      (stage) =>
        input.activeProductionLineCount + 1 >= stage.minProductionLines &&
        (stage.maxProductionLines === null ||
          input.activeProductionLineCount + 1 <= stage.maxProductionLines),
    )
    .sort((first, second) => second.sortOrder - first.sortOrder)[0];

  if (!resultingStage) {
    throw new Error(
      `No operating stage covers ${input.activeProductionLineCount + 1} active lines.`,
    );
  }

  const directStaff = input.template.staffRequirements.map((requirement) =>
    mapStaffRequirement(requirement, requirement.requiredQuantity),
  );
  const stageChanged = input.currentStageId !== resultingStage.id;
  const supportStaff = stageChanged
    ? resultingStage.staffRequirements
        .map((requirement) => ({
          requirement,
          quantity: Math.max(
            0,
            requirement.requiredQuantity -
              (input.supportStaffByRoleId.get(requirement.staffRole.id) ?? 0),
          ),
        }))
        .filter((item) => item.quantity > 0)
        .map((item) => mapStaffRequirement(item.requirement, item.quantity))
    : [];
  const directStaffCount = sum(directStaff.map((item) => item.quantity));
  const supportStaffCount = sum(supportStaff.map((item) => item.quantity));
  const directPayrollIncreaseCents = sumMoney(
    directStaff.map((item) => item.monthlyCostCents),
  );
  const supportPayrollIncreaseCents = sumMoney(
    supportStaff.map((item) => item.monthlyCostCents),
  );
  const productionAreaRentIncreaseCents =
    input.template.areaM2 * input.costConfig.rentPerM2Cents;
  const directStaffMealIncreaseCents =
    input.template.idealStaff *
    input.costConfig.dailyMealPerDirectStaffCents *
    input.costConfig.monthlyWorkDays;
  const directStaffOverheadIncreaseCents =
    input.template.idealStaff *
    input.costConfig.directStaffOverheadPerStaffCents;
  const departmentLineOverheadIncreaseCents =
    input.template.department.monthlyOverheadPerLineCents;
  const otherLineRecurringIncreaseCents =
    productionAreaRentIncreaseCents +
    directStaffMealIncreaseCents +
    directStaffOverheadIncreaseCents +
    departmentLineOverheadIncreaseCents;
  const supportOperatingCostIncreaseCents =
    supportStaffCount *
    (resultingStage.dailySupportMealPerStaffCents *
      input.costConfig.monthlyWorkDays +
      resultingStage.supportOverheadPerStaffCents);
  const totalRecurringCostIncreaseCents =
    directPayrollIncreaseCents +
    input.template.monthlyElectricityBaseCents +
    otherLineRecurringIncreaseCents +
    supportPayrollIncreaseCents +
    supportOperatingCostIncreaseCents;

  return {
    departmentLineOverheadIncreaseCents: String(
      departmentLineOverheadIncreaseCents,
    ),
    directPayrollIncreaseCents: String(directPayrollIncreaseCents),
    directStaff,
    directStaffCount,
    directStaffMealIncreaseCents: String(directStaffMealIncreaseCents),
    directStaffOverheadIncreaseCents: String(
      directStaffOverheadIncreaseCents,
    ),
    electricityIncreaseCents: String(
      input.template.monthlyElectricityBaseCents,
    ),
    otherLineRecurringIncreaseCents: String(otherLineRecurringIncreaseCents),
    productionAreaRentIncreaseCents: String(productionAreaRentIncreaseCents),
    purchaseCostCents: String(input.template.purchaseCostCents),
    resultingOperatingStage: {
      changed: stageChanged,
      id: resultingStage.id,
      key: resultingStage.key,
      name: resultingStage.translations[0]?.name ?? resultingStage.key,
    },
    supportOperatingCostIncreaseCents: String(
      supportOperatingCostIncreaseCents,
    ),
    supportPayrollIncreaseCents: String(supportPayrollIncreaseCents),
    supportStaff,
    supportStaffCount,
    totalRecurringCostIncreaseCents: String(totalRecurringCostIncreaseCents),
  };
}

function mapStaffRequirement(
  requirement: StaffRequirement,
  quantity: number,
) {
  return {
    monthlyCostCents: String(
      quantity * requirement.staffRole.monthlySalaryCents,
    ),
    monthlySalaryCents: String(requirement.staffRole.monthlySalaryCents),
    quantity,
    roleKey: requirement.staffRole.key,
    roleName:
      requirement.staffRole.translations[0]?.name ?? requirement.staffRole.key,
    staffRoleId: requirement.staffRole.id,
  };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function sumMoney(values: string[]) {
  return values.reduce((total, value) => total + Number(value), 0);
}

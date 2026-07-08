import type { Prisma } from "@/generated/prisma/client";

export type DirectLineCostBreakdown = {
  monthlyDirectPayrollCents: number;
  monthlyLineElectricityCents: number;
  monthlyProductionAreaRentCents: number;
  monthlyDirectStaffMealCents: number;
  monthlyDirectStaffOverheadCents: number;
  monthlyDepartmentLineOverheadCents: number;
  monthlyDirectLineCostCents: number;
  monthlyReferencePointCapacity: number;
  directCostPer1000PointsCents: number;
};

type DirectLineCostInput = {
  idealStaff: number;
  dailyPointCapacity: number;
  areaM2: number;
  monthlyElectricityBaseCents: number;
  departmentOverheadPerLineCents: number;
  monthlyWorkDays: number;
  rentPerM2Cents: number;
  dailyMealPerDirectStaffCents: number;
  directStaffOverheadPerStaffCents: number;
  staffRequirements: Array<{
    requiredQuantity: number;
    monthlySalaryCents: number;
  }>;
};

export function calculateDirectLineCost(
  input: DirectLineCostInput,
): DirectLineCostBreakdown {
  const monthlyDirectPayrollCents = input.staffRequirements.reduce(
    (total, requirement) =>
      total +
      requirement.requiredQuantity * requirement.monthlySalaryCents,
    0,
  );
  const monthlyLineElectricityCents = input.monthlyElectricityBaseCents;
  const monthlyProductionAreaRentCents =
    input.areaM2 * input.rentPerM2Cents;
  const monthlyDirectStaffMealCents =
    input.idealStaff *
    input.dailyMealPerDirectStaffCents *
    input.monthlyWorkDays;
  const monthlyDirectStaffOverheadCents =
    input.idealStaff * input.directStaffOverheadPerStaffCents;
  const monthlyDepartmentLineOverheadCents =
    input.departmentOverheadPerLineCents;
  const monthlyDirectLineCostCents =
    monthlyDirectPayrollCents +
    monthlyLineElectricityCents +
    monthlyProductionAreaRentCents +
    monthlyDirectStaffMealCents +
    monthlyDirectStaffOverheadCents +
    monthlyDepartmentLineOverheadCents;
  const monthlyReferencePointCapacity =
    input.dailyPointCapacity * input.monthlyWorkDays;
  const directCostPer1000PointsCents =
    monthlyReferencePointCapacity > 0
      ? Math.round(
          (monthlyDirectLineCostCents * 1000) /
            monthlyReferencePointCapacity,
        )
      : 0;

  return {
    monthlyDirectPayrollCents,
    monthlyLineElectricityCents,
    monthlyProductionAreaRentCents,
    monthlyDirectStaffMealCents,
    monthlyDirectStaffOverheadCents,
    monthlyDepartmentLineOverheadCents,
    monthlyDirectLineCostCents,
    monthlyReferencePointCapacity,
    directCostPer1000PointsCents,
  };
}

export async function getDirectLineCostBreakdown(
  tx: Prisma.TransactionClient,
  productionLineTemplateId: string,
) {
  const line = await tx.productionLineTemplate.findUniqueOrThrow({
    where: { id: productionLineTemplateId },
    select: {
      sectorId: true,
      idealStaff: true,
      dailyPointCapacity: true,
      areaM2: true,
      monthlyElectricityBaseCents: true,
      department: {
        select: { monthlyOverheadPerLineCents: true },
      },
      staffRequirements: {
        select: {
          requiredQuantity: true,
          staffRole: {
            select: { monthlySalaryCents: true },
          },
        },
      },
    },
  });
  const config = await tx.sectorOperatingCostConfig.findUnique({
    where: { sectorId: line.sectorId },
  });

  return calculateDirectLineCost({
    idealStaff: line.idealStaff,
    dailyPointCapacity: line.dailyPointCapacity,
    areaM2: line.areaM2,
    monthlyElectricityBaseCents: line.monthlyElectricityBaseCents,
    departmentOverheadPerLineCents:
      line.department.monthlyOverheadPerLineCents,
    monthlyWorkDays: config?.monthlyWorkDays ?? 22,
    rentPerM2Cents: config?.rentPerM2Cents ?? 0,
    dailyMealPerDirectStaffCents:
      config?.dailyMealPerDirectStaffCents ?? 0,
    directStaffOverheadPerStaffCents:
      config?.directStaffOverheadPerStaffCents ?? 0,
    staffRequirements: line.staffRequirements.map((requirement) => ({
      requiredQuantity: requirement.requiredQuantity,
      monthlySalaryCents: requirement.staffRole.monthlySalaryCents,
    })),
  });
}

export async function recalculateDirectLineCost(
  tx: Prisma.TransactionClient,
  productionLineTemplateId: string,
) {
  const breakdown = await getDirectLineCostBreakdown(
    tx,
    productionLineTemplateId,
  );

  await tx.productionLineTemplate.update({
    where: { id: productionLineTemplateId },
    data: {
      directCostPer1000PointsCents:
        breakdown.directCostPer1000PointsCents,
    },
  });

  return breakdown;
}

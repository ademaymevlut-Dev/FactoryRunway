import type {
  CurrencyCode,
  LineAcquisitionType,
  ProductionGrade,
} from "@/generated/prisma/enums";

export type ProductionLineInvestmentTemplate = {
  id: string;
  departmentId: string;
  key: string;
  grade: ProductionGrade;
  machineCount: number;
  idealStaff: number;
  dailyPointCapacity: number;
  areaM2: number;
  monthlyElectricityBaseCents: number;
  purchaseCostCents: string;
  imageUrl: string | null;
  leasingOffers: ProductionLineLeasingOfferView[];
  preview: ProductionLineInvestmentPreview;
};

export type ProductionLineLeasingOfferView = {
  id: string;
  termYears: number;
  installmentCount: number;
  downPaymentCents: string;
  installmentAmountCents: string;
  totalCostCents: string;
};

export type InvestmentStaffAddition = {
  staffRoleId: string;
  roleKey: string;
  roleName: string;
  quantity: number;
  monthlySalaryCents: string;
  monthlyCostCents: string;
};

export type ProductionLineInvestmentPreview = {
  purchaseCostCents: string;
  directStaff: InvestmentStaffAddition[];
  directStaffCount: number;
  directPayrollIncreaseCents: string;
  electricityIncreaseCents: string;
  productionAreaRentIncreaseCents: string;
  directStaffMealIncreaseCents: string;
  directStaffOverheadIncreaseCents: string;
  departmentLineOverheadIncreaseCents: string;
  otherLineRecurringIncreaseCents: string;
  resultingOperatingStage: {
    id: string;
    key: string;
    name: string;
    changed: boolean;
  };
  supportStaff: InvestmentStaffAddition[];
  supportStaffCount: number;
  supportPayrollIncreaseCents: string;
  supportOperatingCostIncreaseCents: string;
  totalRecurringCostIncreaseCents: string;
};

export type ProductionLineInvestmentDepartment = {
  id: string;
  key: string;
  name: string;
  departmentGroupId: string | null;
  templates: ProductionLineInvestmentTemplate[];
};

export type ProductionLineInvestmentView = {
  currencyCode: CurrencyCode;
  departments: ProductionLineInvestmentDepartment[];
};

export type PurchaseProductionLineInput = {
  factoryId: string;
  productionLineTemplateId: string;
  requestId: string;
};

export type PurchaseProductionLineResult =
  | {
      ok: true;
      productionLineId: string;
      factoryId: string;
      departmentId: string;
      lineNumber: number;
      sortOrder: number;
      acquisitionType: Extract<LineAcquisitionType, "PURCHASED">;
      paidAmountCents: string;
      remainingCashBalanceCents: string;
      operatingStageChanged: boolean;
      operatingStageKey: string;
      directStaffCreated: number;
      supportStaffCreated: number;
      directPayrollIncreaseCents: string;
      supportPayrollIncreaseCents: string;
      totalRecurringCostIncreaseCents: string;
    }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED"
        | "FACTORY_NOT_FOUND"
        | "FACTORY_NOT_ACTIVE"
        | "PLAYBACK_ACTIVE"
        | "TEMPLATE_NOT_FOUND"
        | "TEMPLATE_NOT_ACTIVE"
        | "SECTOR_MISMATCH"
        | "INVALID_DEPARTMENT_KIND"
        | "INSUFFICIENT_FUNDS"
        | "DUPLICATE_REQUEST"
        | "INVALID_REQUEST"
        | "UNKNOWN_ERROR";
    };

export type LeaseProductionLineInput = {
  factoryId: string;
  productionLineTemplateId: string;
  leasingOfferId: string;
  requestId: string;
};

export type LeaseProductionLineResult =
  | {
      ok: true;
      factoryId: string;
      productionLineId: string;
      leasingContractId: string;
      leasingOfferId: string;
      departmentId: string;
      lineNumber: number;
      sortOrder: number;
      acquisitionType: Extract<LineAcquisitionType, "LEASED">;
      downPaymentCents: string;
      installmentAmountCents: string;
      installmentCount: number;
      totalCostCents: string;
      nextDueDay: number;
      remainingCashBalanceCents: string;
      operatingStageChanged: boolean;
      operatingStageKey: string;
      directStaffCreated: number;
      supportStaffCreated: number;
      totalRecurringCostIncreaseCents: string;
    }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED"
        | "FACTORY_NOT_FOUND"
        | "FACTORY_NOT_ACTIVE"
        | "PLAYBACK_ACTIVE"
        | "TEMPLATE_NOT_FOUND"
        | "TEMPLATE_NOT_ACTIVE"
        | "SECTOR_MISMATCH"
        | "INVALID_DEPARTMENT_KIND"
        | "OFFER_NOT_FOUND"
        | "OFFER_NOT_ACTIVE"
        | "OFFER_TEMPLATE_MISMATCH"
        | "INSUFFICIENT_FUNDS"
        | "DUPLICATE_REQUEST"
        | "INVALID_REQUEST"
        | "UNKNOWN_ERROR";
    };

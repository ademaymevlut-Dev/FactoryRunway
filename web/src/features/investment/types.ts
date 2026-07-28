import type {
  CurrencyCode,
  FactoryProductionLineStatus,
  LineAcquisitionType,
  ProductionLineInstallationStatus,
  ProductionGrade,
} from "@/generated/prisma/enums";
import type {
  LeasingCreditDecision,
  LeasingDecisionReason,
} from "@/features/investment/services/leasing-credit-policy";

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
  detailImageUrl: string | null;
  installation: ProductionLineInstallationPreview;
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
  creditDecision: LeasingCreditDecision;
};

export type ProductionLineInstallationPreview = {
  acquisitionSequence: number;
  concurrentSlot: number | null;
  delayDays: number;
  maxConcurrentInstalls: number;
  minimumRemainingDays: number;
  readyDay: number;
  requestedDay: number;
  tokenSkipCostPerDay: number;
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
      acquisitionSequence: number;
      paidAmountCents: string;
      remainingCashBalanceCents: string;
      operatingStageChanged: boolean;
      operatingStageKey: string | null;
      directStaffCreated: number;
      supportStaffCreated: number;
      delayDays: number;
      installationId: string;
      installationStatus: ProductionLineInstallationStatus;
      readyDay: number;
      requestedDay: number;
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
      acquisitionSequence: number;
      creditDecision: LeasingCreditDecision;
      downPaymentCents: string;
      installmentAmountCents: string;
      installmentCount: number;
      totalCostCents: string;
      nextDueDay: number | null;
      remainingCashBalanceCents: string;
      operatingStageChanged: boolean;
      operatingStageKey: string | null;
      directStaffCreated: number;
      supportStaffCreated: number;
      delayDays: number;
      installationId: string;
      installationStatus: ProductionLineInstallationStatus;
      readyDay: number;
      requestedDay: number;
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
    }
  | {
      ok: false;
      code: "CREDIT_DECLINED";
      creditDecision: LeasingCreditDecision;
    };

export type AccelerateProductionLineInstallationInput = {
  factoryId: string;
  factoryProductionLineId: string;
  days: number;
  requestId: string;
};

export type AccelerateProductionLineInstallationResult =
  | {
      ok: true;
      acceleratedDays: number;
      factoryId: string;
      installationId: string;
      newReadyDay: number;
      previousReadyDay: number;
      productionLineId: string;
      remainingDays: number;
      tokenBalance: number;
      tokensSpent: number;
    }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED"
        | "FACTORY_NOT_FOUND"
        | "FACTORY_NOT_ACTIVE"
        | "PLAYBACK_ACTIVE"
        | "INSTALLATION_NOT_FOUND"
        | "INSTALLATION_NOT_PENDING"
        | "INVALID_ACCELERATION_DAYS"
        | "MINIMUM_REMAINING_DAYS"
        | "INSUFFICIENT_TOKENS"
        | "DUPLICATE_REQUEST"
        | "INVALID_REQUEST"
        | "UNKNOWN_ERROR";
    };

export type LeasingCreditReasonCopy = Record<
  LeasingDecisionReason,
  string
>;

export type UpgradeProductionLineInput = {
  factoryId: string;
  factoryProductionLineId: string;
  targetProductionLineTemplateId: string;
  requestId: string;
};

export type UpgradeProductionLineResult =
  | {
      ok: true;
      factoryId: string;
      productionLineId: string;
      previousProductionLineTemplateId: string;
      nextProductionLineTemplateId: string;
      previousGrade: ProductionGrade;
      nextGrade: ProductionGrade;
      grossUpgradeCostCents: string;
      tradeInRefundCents: string;
      netUpgradeCostCents: string;
      remainingCashBalanceCents: string;
      xpAwarded: number;
      currentXp: number;
      previousDirectStaffCount: number;
      nextDirectStaffCount: number;
      directStaffDelta: number;
      directPayrollDeltaCents: string;
      capacityIncreaseBps: number;
    }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED"
        | "FACTORY_NOT_FOUND"
        | "FACTORY_NOT_ACTIVE"
        | "PLAYBACK_ACTIVE"
        | "LINE_NOT_FOUND"
        | "LINE_NOT_UPGRADABLE"
        | "LEASING_ACTIVE"
        | "MAX_GRADE_REACHED"
        | "TEMPLATE_NOT_FOUND"
        | "TEMPLATE_NOT_ACTIVE"
        | "SECTOR_MISMATCH"
        | "DEPARTMENT_MISMATCH"
        | "INVALID_UPGRADE_PATH"
        | "PRODUCTION_PLAN_ACTIVE"
        | "INSUFFICIENT_FUNDS"
        | "DUPLICATE_REQUEST"
        | "INVALID_REQUEST"
        | "UNKNOWN_ERROR";
    };

export type ProductionLineStatusChangeMode = "activate" | "disable";

export type SetProductionLineStatusInput = {
  factoryId: string;
  factoryProductionLineId: string;
  mode: ProductionLineStatusChangeMode;
  requestId: string;
};

export type SetProductionLineStatusResult =
  | {
      ok: true;
      factoryId: string;
      productionLineId: string;
      previousStatus: FactoryProductionLineStatus;
      nextStatus: Extract<FactoryProductionLineStatus, "DISABLED" | "IDLE">;
      releasedDirectStaffCount: number;
      restoredDirectStaffCount: number;
      activeProductionLineCount: number;
      operatingStageChanged: boolean;
      operatingStageKey: string;
    }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED"
        | "FACTORY_NOT_FOUND"
        | "FACTORY_NOT_ACTIVE"
        | "PLAYBACK_ACTIVE"
        | "LINE_NOT_FOUND"
        | "LINE_STATUS_LOCKED"
        | "PRODUCTION_PLAN_ACTIVE"
        | "SECTOR_MISMATCH"
        | "STAFF_CONFIG_INCOMPLETE"
        | "INVALID_REQUEST"
        | "UNKNOWN_ERROR";
    };

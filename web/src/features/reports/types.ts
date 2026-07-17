import type { CurrencyCode } from "@/generated/prisma/enums";

export type GameReportTab = "customers" | "staff";

export type CustomerReportRow = {
  averageUnitPriceCents: string;
  customerId: string;
  customerName: string;
  orderCount: number;
  productCount: number;
  totalQuantity: number;
  totalRevenueCents: string;
};

export type CustomersReport = {
  currencyCode: CurrencyCode;
  rows: CustomerReportRow[];
  summary: {
    customerCount: number;
    orderCount: number;
    totalQuantity: number;
    totalRevenueCents: string;
  };
  tab: "customers";
};

export type StaffReportRow = {
  departmentKey: string;
  departmentName: string;
  monthlySalaryCents: string;
  quantity: number;
  roleKey: string;
  roleName: string;
  staffType: string;
  totalMonthlySalaryCents: string;
};

export type StaffReport = {
  currencyCode: CurrencyCode;
  rows: StaffReportRow[];
  summary: {
    departmentCount: number;
    roleCount: number;
    totalMonthlySalaryCents: string;
    totalStaff: number;
  };
  tab: "staff";
};

export type GameReport = CustomersReport | StaffReport;

export type GameReportActionResult =
  | { ok: true; report: GameReport }
  | {
      code:
        | "FACTORY_NOT_FOUND"
        | "INVALID_TAB"
        | "UNAUTHORIZED"
        | "UNKNOWN_ERROR";
      ok: false;
    };

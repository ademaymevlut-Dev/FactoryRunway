import type { CurrencyCode } from "@/generated/prisma/enums";

export type FinanceReportTab =
  | "overview"
  | "profit"
  | "cash"
  | "investment"
  | "expenses";

export type FinanceTone = "positive" | "negative" | "neutral" | "warning" | "info";

export type FinancePeriodView = {
  currentDay: number;
  endDay: number;
  financePeriodDays: number;
  isCurrentPeriod: boolean;
  maxPeriodIndex: number;
  monthInYear: number;
  periodIndex: number;
  startDay: number;
  yearIndex: number;
};

export type FinanceMetricView = {
  amountCents?: string;
  caption: string;
  id: string;
  label: string;
  tone: FinanceTone;
  value?: string;
};

export type FinanceCategoryBreakdown = {
  amountCents: string;
  category: string;
  label: string;
  shareBps: number;
  tone: FinanceTone;
};

export type FinanceTransactionItem = {
  amountCents: string;
  balanceAfterCents: string;
  category: string;
  description: string;
  direction: "INCOME" | "EXPENSE";
  gameDay: number;
  id: string;
  label: string;
};

export type FinanceDueItem = {
  amountCents: string;
  category: string;
  description: string;
  direction: "INCOME" | "EXPENSE";
  dueDay: number;
  id: string;
  label: string;
  settledAmountCents: string;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE" | "CANCELLED";
};

export type FinanceProductionValueItem = {
  amountCents: string;
  day: number;
  orderNo: string;
  productName: string;
  quantity: number;
  unitPriceCents: string;
};

export type FinanceLeasingContractItem = {
  id: string;
  lineName: string;
  monthlyPaymentCents: string;
  nextDueDay: number | null;
  remainingAmountCents: string;
  remainingInstallments: number;
  status: string;
};

type FinanceReportBase = {
  cashBalanceCents: string;
  currencyCode: CurrencyCode;
  factoryId: string;
  period: FinancePeriodView;
  tab: FinanceReportTab;
};

export type FinanceOverviewReport = FinanceReportBase & {
  tab: "overview";
  cards: FinanceMetricView[];
  dueSummary: {
    next7ReceivableCents: string;
    next7PayableCents: string;
    overdueReceivableCents: string;
    overduePayableCents: string;
  };
  latestTransactions: FinanceTransactionItem[];
  topExpense: FinanceCategoryBreakdown | null;
};

export type FinanceProfitReport = FinanceReportBase & {
  tab: "profit";
  completedProductionValueCents: string;
  completedQuantity: number;
  completionItems: FinanceProductionValueItem[];
  operationalExpenseCents: string;
  operationalProfitCents: string;
  operationalMarginBps: number;
  shippedRevenueCents: string;
  expenseBreakdown: FinanceCategoryBreakdown[];
};

export type FinanceCashReport = FinanceReportBase & {
  tab: "cash";
  dailyNet: Array<{
    day: number;
    expenseCents: string;
    incomeCents: string;
    netCents: string;
  }>;
  expenseCents: string;
  incomeCents: string;
  netCashCents: string;
  openDues: FinanceDueItem[];
  transactions: FinanceTransactionItem[];
};

export type FinanceInvestmentReport = FinanceReportBase & {
  tab: "investment";
  activeContracts: FinanceLeasingContractItem[];
  activeLeasingObligationCents: string;
  investmentTransactions: FinanceTransactionItem[];
  leasingDownPaymentCents: string;
  leasingPaidCents: string;
  machinePurchaseCents: string;
  totalInvestedCashCents: string;
};

export type FinanceExpensesReport = FinanceReportBase & {
  tab: "expenses";
  breakdown: FinanceCategoryBreakdown[];
  investmentExpenseCents: string;
  operatingExpenseCents: string;
  recentExpenses: FinanceTransactionItem[];
  totalExpenseCents: string;
};

export type FinanceReport =
  | FinanceOverviewReport
  | FinanceProfitReport
  | FinanceCashReport
  | FinanceInvestmentReport
  | FinanceExpensesReport;

export type FinanceReportActionResult =
  | {
      ok: true;
      report: FinanceReport;
    }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED"
        | "FACTORY_NOT_FOUND"
        | "INVALID_TAB"
        | "UNKNOWN_ERROR";
    };

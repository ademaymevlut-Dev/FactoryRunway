import {
  FinanceCategory,
  type FinanceDueStatus,
} from "@/generated/prisma/enums";
import type { SupportedLocale } from "@/lib/i18n/locales";

export type FinanceCopy = {
  tabs: Record<"overview" | "profit" | "cash" | "investment" | "expenses", string>;
  header: {
    controlTitle: string;
    factoryPerformance: string;
    cash: string;
    allPeriods: string;
    sinceFounding: string;
    range: (startDay: number, endDay: number) => string;
    day: (day: number) => string;
  };
  period: {
    previous: string;
    next: string;
    loadingTitle: string;
    loadingBody: string;
    monthNames: readonly string[];
    yearPeriod: (year: number, startDay: number, endDay: number) => string;
    title: (year: number, month: string) => string;
  };
  overview: {
    pendingMovements: string;
    next7Receivable: string;
    next7Payable: string;
    overdueReceivable: string;
    overduePayable: string;
    largestExpense: string;
    noExpense: string;
    latestTransactions: string;
    noTransactions: string;
  };
  profit: {
    productionValue: string;
    operatingProfit: string;
    units: string;
    finalProduction: (quantity: string) => string;
    operationalMargin: (margin: string) => string;
    shippedRevenue: string;
    shippedThisMonth: string;
    finalProductionValue: string;
    noFinalProduction: string;
    operationalExpense: string;
    totalPeriodExpense: string;
  };
  cash: {
    income: string;
    cashIn: string;
    expense: string;
    cashOut: string;
    netCash: string;
    incomeMinusExpense: string;
    dailyCashLine: string;
    openDues: string;
    cashMovements: string;
    noPeriodMovements: string;
    noNearDues: string;
    day: (day: number) => string;
  };
  investment: {
    investedCash: string;
    investedCashCaption: string;
    machine: string;
    machineCaption: string;
    leasingPaid: string;
    leasingPaidCaption: string;
    leasingDebt: string;
    leasingDebtCaption: string;
    obligations: string;
    obligationsCaption: string;
    pendingActivation: string;
    dueDay: (day: number) => string;
    calendarPending: string;
    installmentsLeft: (count: number) => string;
    installment: string;
    remaining: string;
    noContracts: string;
    investmentMovements: string;
    noInvestmentMovements: string;
  };
  expenses: {
    totalExpense: string;
    totalExpenseCaption: string;
    operation: string;
    operationCaption: string;
    investment: string;
    investmentCaption: string;
    breakdown: string;
    noBreakdown: string;
    recentExpenses: string;
    noExpenses: string;
  };
  calendar: {
    title: string;
    range: (endDay: number) => string;
    horizon: string;
    firstIncome: string;
    noExpectedEntries: string;
    confirmed: string;
    planned: string;
    today: string;
    nearIncome: string;
    nearExpense: string;
    debtAndPlannedExpense: string;
    estimatedCash: string;
    upcomingMovements: string;
    confirmedShort: string;
    plannedShort: string;
    overdue: (day: number) => string;
    noUpcoming: string;
    shortfall: (day: number, amount: string) => string;
    tight: string;
    positive: string;
    neutral: string;
    day: (day: number) => string;
  };
  errors: {
    loading: string;
    loadingBody: string;
    retry: string;
    reportError: string;
    reportErrorBody: string;
  };
  categories: Record<FinanceCategory, string>;
  departments: Record<string, string>;
  dueStatuses: Record<FinanceDueStatus, string>;
};

export const financeCopy = {
  tr: {
    tabs: {
      overview: "Özet",
      profit: "Kâr",
      cash: "Nakit",
      investment: "Yatırım",
      expenses: "Gider",
    },
    header: {
      controlTitle: "Finans Kontrol",
      factoryPerformance: "Fabrika performansı",
      cash: "Kasa",
      allPeriods: "Tüm dönemler",
      sinceFounding: "Kuruluştan bugüne",
      range: (startDay, endDay) => `${startDay}-${endDay}. gün`,
      day: (day) => `${day}. gün`,
    },
    period: {
      previous: "Önceki dönem",
      next: "Sonraki dönem",
      loadingTitle: "Dönem yükleniyor",
      loadingBody: "Finans takvimi hazırlanıyor",
      monthNames: [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
      ],
      yearPeriod: (year, startDay, endDay) =>
        `Fabrikanın ${year}. yılı · ${startDay}-${endDay}. gün`,
      title: (year, month) => `Fabrikanın ${year}. Yılı · ${month}`,
    },
    overview: {
      pendingMovements: "Bekleyen hareketler",
      next7Receivable: "7 gün tahsilat",
      next7Payable: "7 gün ödeme",
      overdueReceivable: "Geciken tahsilat",
      overduePayable: "Geciken ödeme",
      largestExpense: "En büyük gider",
      noExpense: "Bu dönemde gider kaydı yok.",
      latestTransactions: "Son kasa hareketleri",
      noTransactions: "Henüz finans hareketi yok.",
    },
    profit: {
      productionValue: "Üretimden oluşan değer",
      operatingProfit: "Operasyonel kâr",
      units: "adet",
      finalProduction: (quantity) => `${quantity} adet final üretim`,
      operationalMargin: (margin) => `${margin} operasyon marjı`,
      shippedRevenue: "Sevk ciro",
      shippedThisMonth: "Bu ay sevk edilen sipariş",
      finalProductionValue: "Final üretim değeri",
      noFinalProduction: "Bu finans ayında final üretim yok.",
      operationalExpense: "Operasyonel gider",
      totalPeriodExpense: "Toplam dönem gideri",
    },
    cash: {
      income: "Gelir",
      cashIn: "Kasaya giren",
      expense: "Gider",
      cashOut: "Kasadan çıkan",
      netCash: "Net nakit",
      incomeMinusExpense: "Gelir eksi gider",
      dailyCashLine: "Günlük nakit çizgisi",
      openDues: "Açık vadeler",
      cashMovements: "Kasa hareketleri",
      noPeriodMovements: "Bu finans ayında kasa hareketi yok.",
      noNearDues: "Yakın vadeli açık kayıt yok.",
      day: (day) => `${day}. gün`,
    },
    investment: {
      investedCash: "Yatırım nakdi",
      investedCashCaption: "Kuruluştan bugüne kasadan çıkan",
      machine: "Makine",
      machineCaption: "Satın alma ve upgrade toplamı",
      leasingPaid: "Leasing ödeme",
      leasingPaidCaption: "Bugüne kadar ödenen taksit",
      leasingDebt: "Leasing borç",
      leasingDebtCaption: "Aktif kalan yük",
      obligations: "Leasing yükümlülükleri",
      obligationsCaption: "Yatırım, leasing ve kalan borçlar aylık dönemle sınırlandırılmaz.",
      pendingActivation: "Kurulum bekleniyor",
      dueDay: (day) => `${day}. gün`,
      calendarPending: "Takvim bekleniyor",
      installmentsLeft: (count) => `${count} taksit kaldı`,
      installment: "Taksit",
      remaining: "Kalan",
      noContracts: "Aktif veya aktivasyon bekleyen leasing sözleşmesi yok.",
      investmentMovements: "Yatırım hareketleri",
      noInvestmentMovements: "Yatırım hareketi yok.",
    },
    expenses: {
      totalExpense: "Toplam gider",
      totalExpenseCaption: "Bu ay oluşan yük",
      operation: "Operasyon",
      operationCaption: "İşçilik, kira, elektrik, fason",
      investment: "Yatırım",
      investmentCaption: "Makine ve leasing",
      breakdown: "Gider kırılımı",
      noBreakdown: "Bu dönem kırılım yok.",
      recentExpenses: "Son giderler",
      noExpenses: "Bu ay gider hareketi yok.",
    },
    calendar: {
      title: "Nakit takvimi",
      range: (endDay) => `Bugün–${endDay}. gün · kesin vadeler ve planlanan siparişler`,
      horizon: "7 gün görünümü",
      firstIncome: "İlk para",
      noExpectedEntries: "Beklenen kayıt yok",
      confirmed: "kesin",
      planned: "plan",
      today: "Bugün",
      nearIncome: "Yakın dönem giriş",
      nearExpense: "7 gün ödeme",
      debtAndPlannedExpense: "Borç + planlanan gider",
      estimatedCash: "Tahmini kasa",
      upcomingMovements: "Yaklaşan hareketler",
      confirmedShort: "Kesin",
      plannedShort: "Planlanan",
      overdue: (day) => `${day}. günden gecikmiş`,
      noUpcoming: "Planlanan tahsilat veya ödeme bulunmuyor.",
      shortfall: (day, amount) =>
        `${day}. gün nakit açığı riski · en düşük kasa ${amount}.`,
      tight: "Yakın dönem ödemeleri tahsilatlardan yüksek.",
      positive: "Yakın dönem nakit akışı mevcut planla dengeli.",
      neutral: "7 gün içinde kesinleşmiş veya planlanmış hareket yok.",
      day: (day) => `${day}. GÜN`,
    },
    errors: {
      loading: "Finans raporu hazırlanıyor",
      loadingBody: "",
      retry: "Yenile",
      reportError: "Rapor yüklenemedi",
      reportErrorBody: "Finans verisi alınırken beklenmeyen bir sorun oluştu.",
    },
    categories: {
      BONUS: "Bonus",
      CAPITAL_INJECTION: "Sermaye",
      ELECTRICITY: "Elektrik",
      LEASING_DOWN_PAYMENT: "Leasing peşinat",
      LEASING_PAYMENT: "Leasing taksit",
      MACHINE_PURCHASE: "Makine yatırımı",
      MAINTENANCE: "Bakım",
      MEAL: "Yemek",
      ORDER_REVENUE: "Sipariş geliri",
      OTHER: "Diğer",
      OUTSOURCE_COST: "Fason üretim",
      OVERHEAD: "Genel gider",
      PAYROLL: "İşçilik",
      PENALTY: "Ceza",
      RENT: "Kira",
    },
    departments: {
      cutting: "Kesim",
      dyeing: "Boya",
      embroidery: "Nakış",
      fabric_production: "Kumaş",
      ironing_packing: "Ütü-Paket",
      printing: "Baskı",
      sewing: "Dikim",
      washing: "Yıkama",
    },
    dueStatuses: {
      PENDING: "Bekliyor",
      PAID: "Ödendi",
      PARTIAL: "Kısmi ödendi",
      OVERDUE: "Gecikmiş",
      CANCELLED: "İptal edildi",
    },
  },
  en: {
    tabs: {
      overview: "Overview",
      profit: "Profit",
      cash: "Cash",
      investment: "Investment",
      expenses: "Expenses",
    },
    header: {
      controlTitle: "Finance Control",
      factoryPerformance: "Factory performance",
      cash: "Cash",
      allPeriods: "All periods",
      sinceFounding: "Since founding",
      range: (startDay, endDay) => `Days ${startDay}-${endDay}`,
      day: (day) => `Day ${day}`,
    },
    period: {
      previous: "Previous period",
      next: "Next period",
      loadingTitle: "Loading period",
      loadingBody: "Preparing finance calendar",
      monthNames: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ],
      yearPeriod: (year, startDay, endDay) =>
        `Factory year ${year} · days ${startDay}-${endDay}`,
      title: (year, month) => `Factory year ${year} · ${month}`,
    },
    overview: {
      pendingMovements: "Pending movements",
      next7Receivable: "Receivables in 7 days",
      next7Payable: "Payables in 7 days",
      overdueReceivable: "Overdue receivables",
      overduePayable: "Overdue payables",
      largestExpense: "Largest expense",
      noExpense: "No expense recorded in this period.",
      latestTransactions: "Latest cash movements",
      noTransactions: "No finance movements yet.",
    },
    profit: {
      productionValue: "Production value",
      operatingProfit: "Operating profit",
      units: "units",
      finalProduction: (quantity) => `${quantity} finished units`,
      operationalMargin: (margin) => `${margin} operating margin`,
      shippedRevenue: "Shipped revenue",
      shippedThisMonth: "Orders shipped this month",
      finalProductionValue: "Finished production value",
      noFinalProduction: "No finished production in this finance period.",
      operationalExpense: "Operating expenses",
      totalPeriodExpense: "Total period expenses",
    },
    cash: {
      income: "Income",
      cashIn: "Cash in",
      expense: "Expense",
      cashOut: "Cash out",
      netCash: "Net cash",
      incomeMinusExpense: "Income minus expenses",
      dailyCashLine: "Daily cash line",
      openDues: "Open dues",
      cashMovements: "Cash movements",
      noPeriodMovements: "No cash movements in this finance period.",
      noNearDues: "No near-term open dues.",
      day: (day) => `Day ${day}`,
    },
    investment: {
      investedCash: "Investment cash",
      investedCashCaption: "Cash spent since founding",
      machine: "Machines",
      machineCaption: "Purchases and upgrades total",
      leasingPaid: "Leasing paid",
      leasingPaidCaption: "Installments paid to date",
      leasingDebt: "Leasing debt",
      leasingDebtCaption: "Remaining active obligation",
      obligations: "Leasing obligations",
      obligationsCaption: "Investment, leasing and remaining obligations are not limited to a monthly period.",
      pendingActivation: "Awaiting installation",
      dueDay: (day) => `Day ${day}`,
      calendarPending: "Calendar pending",
      installmentsLeft: (count) => `${count} installments left`,
      installment: "Installment",
      remaining: "Remaining",
      noContracts: "No active or pending leasing contracts.",
      investmentMovements: "Investment movements",
      noInvestmentMovements: "No investment movements.",
    },
    expenses: {
      totalExpense: "Total expenses",
      totalExpenseCaption: "Load created this month",
      operation: "Operations",
      operationCaption: "Payroll, rent, electricity, outsource",
      investment: "Investment",
      investmentCaption: "Machines and leasing",
      breakdown: "Expense breakdown",
      noBreakdown: "No breakdown for this period.",
      recentExpenses: "Recent expenses",
      noExpenses: "No expense movements this month.",
    },
    calendar: {
      title: "Cash calendar",
      range: (endDay) => `Today–day ${endDay} · confirmed dues and projected orders`,
      horizon: "7-day view",
      firstIncome: "First income",
      noExpectedEntries: "No expected entries",
      confirmed: "confirmed",
      planned: "projected",
      today: "Today",
      nearIncome: "Near-term inflow",
      nearExpense: "7-day payments",
      debtAndPlannedExpense: "Debt + planned expenses",
      estimatedCash: "Estimated cash",
      upcomingMovements: "Upcoming movements",
      confirmedShort: "Confirmed",
      plannedShort: "Projected",
      overdue: (day) => `${day} days overdue`,
      noUpcoming: "No projected collection or payment.",
      shortfall: (day, amount) =>
        `Cash shortfall risk on day ${day} · lowest cash ${amount}.`,
      tight: "Near-term payments exceed collections.",
      positive: "Near-term cash flow is balanced under the current plan.",
      neutral: "No confirmed or projected movement within 7 days.",
      day: (day) => `DAY ${day}`,
    },
    errors: {
      loading: "Preparing finance report",
      loadingBody: "",
      retry: "Retry",
      reportError: "Could not load report",
      reportErrorBody: "An unexpected problem occurred while loading finance data.",
    },
    categories: {
      BONUS: "Bonus",
      CAPITAL_INJECTION: "Capital",
      ELECTRICITY: "Electricity",
      LEASING_DOWN_PAYMENT: "Leasing down payment",
      LEASING_PAYMENT: "Leasing installment",
      MACHINE_PURCHASE: "Machine investment",
      MAINTENANCE: "Maintenance",
      MEAL: "Meals",
      ORDER_REVENUE: "Order revenue",
      OTHER: "Other",
      OUTSOURCE_COST: "Outsource production",
      OVERHEAD: "Overhead",
      PAYROLL: "Payroll",
      PENALTY: "Penalty",
      RENT: "Rent",
    },
    departments: {
      cutting: "Cutting",
      dyeing: "Dyeing",
      embroidery: "Embroidery",
      fabric_production: "Fabric production",
      ironing_packing: "Ironing-Packing",
      printing: "Printing",
      sewing: "Sewing",
      washing: "Washing",
    },
    dueStatuses: {
      PENDING: "Pending",
      PAID: "Paid",
      PARTIAL: "Partially paid",
      OVERDUE: "Overdue",
      CANCELLED: "Cancelled",
    },
  },
} as const satisfies Record<SupportedLocale, FinanceCopy>;

export type FinanceCopyLocale = (typeof financeCopy)[SupportedLocale];

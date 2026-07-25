import type { SupportedLocale } from "@/lib/i18n/locales";

import type {
  ManagerRecommendationCategory,
  ManagerRecommendationSeverity,
} from "./types";

export const managerCopy = {
  tr: {
    panel: {
      title: "Yönetim gündemi",
      subtitle: "Müdür tavsiyeleri",
      noteCount: (count: number) => `${count} not`,
      previousAria: "Önceki yönetim notu",
      nextAria: "Sonraki yönetim notu",
      singlePosition: "Yönetim",
      followUp: "Takipte",
      emptyTitle: "Yönetim notu yok",
      emptyBody: "Müdür şimdilik ek aksiyon önermiyor.",
    },
    labels: {
      categories: {
        FINANCE: "Finans",
        INVESTMENT: "Yatırım",
        OPERATIONS: "Operasyon",
      },
      severities: {
        CRITICAL: "Kritik",
        INFO: "Bilgi",
        OPPORTUNITY: "Fırsat",
        WARNING: "Uyarı",
      },
    },
    metrics: {
      noCapacity: "kapasite yok",
      workloadDays: (value: string) => `${value} gün`,
    },
    recommendations: {
      openQueue: "Kuyruğu Aç",
      openInvestments: "Yatırımları Aç",
      investInLine: "Hat Yatırımı Yap",
      reviewInvestment: "Yatırımı İncele",
      openStaff: "Personeli Aç",
      openFinance: "Finansı Aç",
      bottleneckActionHint: (hasOutsourceCandidate: boolean) =>
        hasOutsourceCandidate
          ? "Fason adayı işler de var; kuyruk önceliğiyle birlikte dış kaynak seçeneğini değerlendirebiliriz."
          : "Önce kuyruk önceliğini düzenleyelim; gerekiyorsa yatırım tarafına geçeriz.",
      bottleneckBody: (
        departmentName: string,
        workloadDaysLabel: string,
        actionHint: string,
      ) =>
        `${departmentName} departmanı ${workloadDaysLabel} iş yükü taşıyor. ${actionHint}`,
      bottleneckTitle: (departmentName: string) =>
        `Müdür: ${departmentName} sıkışıyor`,
      investmentReviewBody:
        "Sipariş akışını gördük. Şimdi yatırımlar panelini açıp hangi bölümde kapasite büyütebileceğimizi inceleyelim.",
      investmentReviewTitle: "Müdür: büyüme fırsatı var",
      acquisitionBody: (hint: string) =>
        `Yeni üretim hattı eklemek fabrikayı büyütmenin ilk gerçek adımı. ${hint}`,
      acquisitionTitle: "Müdür: ilk yatırım hamlesi hazır",
      acquisitionHintPurchase:
        "Kasada en az bir hattı satın alabilecek güç görünüyor.",
      acquisitionHintLease:
        "Satın alma ağır gelirse kiralama seçeneği iyi bir geçiş hamlesi olabilir.",
      acquisitionHintTightCash:
        "Nakit sıkıysa önce maliyeti görüp hedef nakdi planlayalım.",
      investmentOpportunityBody: (departmentName: string) =>
        `${departmentName} yükü büyüyor. Nakit uygunken bu departman için yeni hat seçeneğini incelemek mantıklı olabilir.`,
      investmentOpportunityTitle:
        "Müdür: kapasite yatırımı düşünülebilir",
      staffShortageBody: (
        lineTitle: string,
        assignedStaff: number,
        idealStaff: number,
      ) =>
        `${lineTitle} ${assignedStaff}/${idealStaff} personelle çalışıyor. Eksik ekip kapasiteyi aşağı çekebilir.`,
      staffShortageTitle: "Müdür: ekip kapasitesi eksik",
      investmentCashRiskBody:
        "Yeni hat için iştah doğru ama kasa henüz peşinat seviyesine gelmemiş görünüyor. Önce tahsilat ve nakit durumunu kontrol edelim.",
      investmentCashRiskTitle: "Müdür: yatırım için nakit zayıf",
      lateOrdersCashRiskBody: (lateOrderCount: number) =>
        `${lateOrderCount} geciken sipariş varken kasa rezervi zayıf. Ceza ve tahsilat etkisini finans panelinden izleyelim.`,
      lateOrdersCashRiskTitle: "Müdür: finansal risk artıyor",
      leasingReserveBody:
        "Kiralı hat ödemeleri varken nakit rezervi inceliyor. Yeni harcama öncesi dönem giderlerini kontrol etmek iyi olur.",
      leasingReserveTitle: "Müdür: leasing rezervini koruyalım",
    },
  },
  en: {
    panel: {
      title: "Management agenda",
      subtitle: "Manager recommendations",
      noteCount: (count: number) => `${count} notes`,
      previousAria: "Previous management note",
      nextAria: "Next management note",
      singlePosition: "Management",
      followUp: "Monitoring",
      emptyTitle: "No management notes",
      emptyBody: "The manager is not recommending another action right now.",
    },
    labels: {
      categories: {
        FINANCE: "Finance",
        INVESTMENT: "Investment",
        OPERATIONS: "Operations",
      },
      severities: {
        CRITICAL: "Critical",
        INFO: "Info",
        OPPORTUNITY: "Opportunity",
        WARNING: "Warning",
      },
    },
    metrics: {
      noCapacity: "no capacity",
      workloadDays: (value: string) => `${value} days`,
    },
    recommendations: {
      openQueue: "Open Queue",
      openInvestments: "Open Investments",
      investInLine: "Invest in Line",
      reviewInvestment: "Review Investment",
      openStaff: "Open Staff",
      openFinance: "Open Finance",
      bottleneckActionHint: (hasOutsourceCandidate: boolean) =>
        hasOutsourceCandidate
          ? "There are outsource candidates too; we can review external capacity together with the queue priority."
          : "Let's adjust the queue priority first, then move to investment if needed.",
      bottleneckBody: (
        departmentName: string,
        workloadDaysLabel: string,
        actionHint: string,
      ) =>
        `${departmentName} is carrying ${workloadDaysLabel} of workload. ${actionHint}`,
      bottleneckTitle: (departmentName: string) =>
        `Manager: ${departmentName} is tightening`,
      investmentReviewBody:
        "We have seen the order flow. Now open investments and review where we can grow capacity.",
      investmentReviewTitle: "Manager: growth opportunity",
      acquisitionBody: (hint: string) =>
        `Adding a new production line is the first real step in scaling the factory. ${hint}`,
      acquisitionTitle: "Manager: first investment move is ready",
      acquisitionHintPurchase:
        "Cash looks strong enough to buy at least one line.",
      acquisitionHintLease:
        "If purchase is too heavy, leasing can be a good bridge move.",
      acquisitionHintTightCash:
        "If cash is tight, review the cost first and plan the target reserve.",
      investmentOpportunityBody: (departmentName: string) =>
        `${departmentName} workload is growing. With cash available, reviewing a new line for this department could make sense.`,
      investmentOpportunityTitle:
        "Manager: capacity investment is worth reviewing",
      staffShortageBody: (
        lineTitle: string,
        assignedStaff: number,
        idealStaff: number,
      ) =>
        `${lineTitle} is running with ${assignedStaff}/${idealStaff} staff. Missing crew can pull capacity down.`,
      staffShortageTitle: "Manager: crew capacity is short",
      investmentCashRiskBody:
        "The appetite for a new line is right, but cash does not seem ready for the down payment yet. Let's review collection and cash first.",
      investmentCashRiskTitle: "Manager: cash is weak for investment",
      lateOrdersCashRiskBody: (lateOrderCount: number) =>
        `${lateOrderCount} late orders and a thin cash reserve increase risk. Let's watch penalty and collection impact in finance.`,
      lateOrdersCashRiskTitle: "Manager: financial risk is rising",
      leasingReserveBody:
        "Cash reserve is thinning while leased line payments are active. Check period costs before adding new spend.",
      leasingReserveTitle: "Manager: protect the leasing reserve",
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    panel: {
      title: string;
      subtitle: string;
      noteCount: (count: number) => string;
      previousAria: string;
      nextAria: string;
      singlePosition: string;
      followUp: string;
      emptyTitle: string;
      emptyBody: string;
    };
    labels: {
      categories: Record<ManagerRecommendationCategory, string>;
      severities: Record<ManagerRecommendationSeverity, string>;
    };
    metrics: {
      noCapacity: string;
      workloadDays: (value: string) => string;
    };
    recommendations: {
      openQueue: string;
      openInvestments: string;
      investInLine: string;
      reviewInvestment: string;
      openStaff: string;
      openFinance: string;
      bottleneckActionHint: (hasOutsourceCandidate: boolean) => string;
      bottleneckBody: (
        departmentName: string,
        workloadDaysLabel: string,
        actionHint: string,
      ) => string;
      bottleneckTitle: (departmentName: string) => string;
      investmentReviewBody: string;
      investmentReviewTitle: string;
      acquisitionBody: (hint: string) => string;
      acquisitionTitle: string;
      acquisitionHintPurchase: string;
      acquisitionHintLease: string;
      acquisitionHintTightCash: string;
      investmentOpportunityBody: (departmentName: string) => string;
      investmentOpportunityTitle: string;
      staffShortageBody: (
        lineTitle: string,
        assignedStaff: number,
        idealStaff: number,
      ) => string;
      staffShortageTitle: string;
      investmentCashRiskBody: string;
      investmentCashRiskTitle: string;
      lateOrdersCashRiskBody: (lateOrderCount: number) => string;
      lateOrdersCashRiskTitle: string;
      leasingReserveBody: string;
      leasingReserveTitle: string;
    };
  }
>;

export type ManagerPanelCopy = (typeof managerCopy)[SupportedLocale]["panel"];
export type ManagerRecommendationCopy =
  (typeof managerCopy)[SupportedLocale]["recommendations"];

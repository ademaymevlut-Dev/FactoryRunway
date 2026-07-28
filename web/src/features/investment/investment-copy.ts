import type {
  FactoryProductionLineStatus,
  ProductionGrade,
} from "@/generated/prisma/enums";
import type {
  LeaseProductionLineResult,
  PurchaseProductionLineResult,
  SetProductionLineStatusResult,
  UpgradeProductionLineResult,
} from "./types";
import type { SupportedLocale } from "@/lib/i18n/locales";

type PurchaseErrorCode = Extract<
  PurchaseProductionLineResult,
  { ok: false }
>["code"];
type LeaseErrorCode = Extract<
  LeaseProductionLineResult,
  { ok: false }
>["code"];
type UpgradeErrorCode = Extract<
  UpgradeProductionLineResult,
  { ok: false }
>["code"];
type LineStatusErrorCode = Extract<
  SetProductionLineStatusResult,
  { ok: false }
>["code"];

export const investmentCopy = {
  tr: {
    gradeLabels: {
      INDUSTRIAL: "Industrial",
      PRECISION: "Precision",
      SMART: "Smart",
      WORKSHOP: "Workshop",
    },
    panel: {
      noOptions: "Bu bölüm için aktif üretim hattı seçeneği bulunmuyor.",
      departmentSubtitle: (departmentName: string) =>
        `${departmentName} · Teknik ve finansal seçenekler`,
      locked: "Vardiya sırasında kilitli",
      planningOpen: "Planlama açık",
      departmentNavAria: "Yatırım departmanı",
      templateNavAria: "Üretim hattı standardı",
      machineCount: (count: number) => `${count} makine`,
    },
    purchase: {
      imageAlt: (gradeLabel: string) => `${gradeLabel} üretim hattı`,
      lineType: "Üretim hattı",
      metrics: {
        capacity: "Kapasite",
        idealStaff: "İdeal personel",
        area: "Alan",
        electricity: "Elektrik",
        pointPerDay: (value: string) => `${value} point/gün`,
        periodCost: (value: string) => `${value} / dönem`,
      },
      financingAria: "Yatırım finansmanı",
      financingTitle: "Yatırım Finansmanı",
      paymentCash: "Peşin",
      paymentLeasing: "Leasing",
      dueToday: "Bugün ödenecek",
      cashNote: "Tek seferde kasadan düşer",
      noLeaseOffer: "Bu hat için aktif leasing teklifi bulunmuyor.",
      recurringSummary: (value: string) =>
        `İşletme Gideri Etkisi · ${value} / dönem`,
      newOperatingStage: "Yeni operasyon kademesi",
      directStaff: (count: number) => `Direkt personel · ${count}`,
      supportStaff: (count: number) => `Support / yönetim farkı · ${count}`,
      costs: {
        directPayroll: "Direkt maaş",
        supportPayroll: "Support maaş",
        electricity: "Hat elektriği",
        other: "Diğer giderler",
      },
      buyPending: "Satın alınıyor…",
      buyAction: (value: string) => `Peşin Satın Al · ${value}`,
      leasePending: "Leasing kuruluyor…",
      leaseAction: (value: string) => `Leasing ile Kur · Bugün ${value}`,
      noLeaseButton: "Leasing teklifi yok",
      leaseTerm: (years: number) => `${years} Yıl`,
      installmentCount: (count: number) => `${count} taksit`,
      summaryRows: {
        today: "Bugün",
        every22Days: "Her 22 günde",
        installment: "Taksit",
        totalCost: "Toplam maliyet",
      },
      noExtraStaff: "Ek personel yok",
      purchaseErrors: {
        DUPLICATE_REQUEST: "Bu satın alma isteği daha önce işlendi.",
        FACTORY_NOT_ACTIVE: "Fabrika şu anda yatırıma açık değil.",
        FACTORY_NOT_FOUND: "Fabrika kaydı bulunamadı.",
        INSUFFICIENT_FUNDS: "Bu hat için yeterli nakit bulunmuyor.",
        INVALID_DEPARTMENT_KIND:
          "Bu departman üretim hattı yatırımını desteklemiyor.",
        INVALID_REQUEST: "Satın alma isteği geçersiz.",
        PLAYBACK_ACTIVE: "Vardiya oynatılırken yatırım yapılamaz.",
        SECTOR_MISMATCH: "Seçilen hat fabrikanın sektörüne ait değil.",
        TEMPLATE_NOT_ACTIVE: "Bu üretim hattı artık satışta değil.",
        TEMPLATE_NOT_FOUND: "Üretim hattı seçeneği bulunamadı.",
        UNAUTHORIZED: "Bu işlem için oturum açmalısınız.",
        UNKNOWN_ERROR: "Satın alma tamamlanamadı. Lütfen tekrar deneyin.",
      },
      leaseErrors: {
        DUPLICATE_REQUEST: "Bu leasing isteği daha önce işlendi.",
        FACTORY_NOT_ACTIVE: "Fabrika şu anda yatırıma açık değil.",
        FACTORY_NOT_FOUND: "Fabrika kaydı bulunamadı.",
        INSUFFICIENT_FUNDS: "Peşinat için yeterli nakit bulunmuyor.",
        INVALID_DEPARTMENT_KIND:
          "Bu departman üretim hattı yatırımını desteklemiyor.",
        INVALID_REQUEST: "Leasing isteği geçersiz.",
        OFFER_NOT_ACTIVE: "Seçilen leasing teklifi artık aktif değil.",
        OFFER_NOT_FOUND: "Leasing teklifi bulunamadı.",
        OFFER_TEMPLATE_MISMATCH: "Leasing teklifi seçilen hatta ait değil.",
        PLAYBACK_ACTIVE: "Vardiya oynatılırken yatırım yapılamaz.",
        SECTOR_MISMATCH: "Seçilen hat fabrikanın sektörüne ait değil.",
        TEMPLATE_NOT_ACTIVE: "Bu üretim hattı artık satışta değil.",
        TEMPLATE_NOT_FOUND: "Üretim hattı seçeneği bulunamadı.",
        UNAUTHORIZED: "Bu işlem için oturum açmalısınız.",
        UNKNOWN_ERROR: "Leasing kurulamadı. Lütfen tekrar deneyin.",
      },
    },
    upgrade: {
      imageAlt: (lineTitle: string) => `${lineTitle} üretim hattı`,
      expandAria: (lineTitle: string) => `${lineTitle} görselini büyüt`,
      expandLabel: "Büyüt",
      labels: {
        standard: "Standart",
        capacity: "Kapasite",
        staff: "Personel",
        area: "Alan",
        electricity: "Elektrik",
        capacityIncrease: "İş gücü artışı",
        points: (value: string) => `${value} puan`,
      },
      budgetTitle: "Upgrade Bütçesi",
      budgetRows: {
        gross: "Yeni hat bedeli",
        refund: "2. el hat iadesi",
        net: "Kasadan çıkacak",
      },
      alerts: {
        leasingTitle: "Leasing sözleşmesi aktif",
        leasingBody: "Leasing süresi tamamlanmadan bu hat yükseltilemez.",
        maxTitle: "SMART teknoloji",
        maxBody: "Bu üretim hattı en yüksek teknoloji seviyesinde.",
        missingTitle: "Upgrade seçeneği yok",
        missingBody:
          "Bu departman için sıradaki aktif üretim hattı bulunamadı.",
        successTitle: "Upgrade tamamlandı",
        successBody: (xp: number, gradeLabel: string) =>
          `+${xp} XP eklendi. Yeni teknoloji seviyesi ${gradeLabel}.`,
        errorTitle: "Upgrade tamamlanamadı",
      },
      buttonPending: "Upgrade uygulanıyor...",
      buttonAction: (value: string) => `Upgrade Et · ${value}`,
      buttonClosed: "Upgrade kapalı",
      errors: {
        DEPARTMENT_MISMATCH: "Seçilen upgrade aynı departmana ait değil.",
        DUPLICATE_REQUEST: "Bu upgrade isteği daha önce işlendi.",
        FACTORY_NOT_ACTIVE: "Fabrika şu anda upgrade için açık değil.",
        FACTORY_NOT_FOUND: "Fabrika kaydı bulunamadı.",
        INSUFFICIENT_FUNDS: "Bu upgrade için yeterli nakit bulunmuyor.",
        INVALID_REQUEST: "Upgrade isteği geçersiz.",
        INVALID_UPGRADE_PATH:
          "Seçilen teknoloji seviyesi sıradaki upgrade değil.",
        LEASING_ACTIVE: "Leasing sözleşmesi aktif olan hat yükseltilemez.",
        LINE_NOT_FOUND: "Üretim hattı bulunamadı.",
        LINE_NOT_UPGRADABLE: "Bu üretim hattı şu anda yükseltilemez.",
        MAX_GRADE_REACHED:
          "Bu üretim hattı en yüksek teknoloji seviyesinde.",
        PLAYBACK_ACTIVE: "Vardiya oynatılırken upgrade yapılamaz.",
        PRODUCTION_PLAN_ACTIVE:
          "Bugünün üretim planı varken upgrade yapılamaz.",
        SECTOR_MISMATCH: "Seçilen upgrade fabrikanın sektörüne ait değil.",
        TEMPLATE_NOT_ACTIVE: "Seçilen upgrade artık aktif değil.",
        TEMPLATE_NOT_FOUND: "Upgrade seçeneği bulunamadı.",
        UNAUTHORIZED: "Bu işlem için oturum açmalısınız.",
        UNKNOWN_ERROR: "Upgrade tamamlanamadı. Lütfen tekrar deneyin.",
      },
    },
    lineStatus: {
      tabsAria: "Üretim hattı işlem sekmeleri",
      tabs: {
        upgrade: "Upgrade",
        status: "Durum",
      },
      currentTitle: "Hat durumu",
      points: (value: string) => `${value} puan`,
      statusLabels: {
        BLOCKED: "Bloke",
        BROKEN: "Arızalı",
        DISABLED: "Devre dışı",
        IDLE: "Aktif",
        MAINTENANCE: "Bakımda",
        RUNNING: "Çalışıyor",
        SOLD: "Satıldı",
      },
      statusDescriptions: {
        BLOCKED:
          "Hat şu anda üretim akışında engel yaşıyor; devre dışı bırakılırsa bağlı direkt personel çıkarılır.",
        BROKEN:
          "Hat arızalı durumda. Devre dışı bırakmak kapasiteyi kapatır ve bağlı direkt personeli çıkarır.",
        DISABLED:
          "Hat üretim kapasitesine dahil değil. Aktif edildiğinde ideal direkt personel kadrosu tekrar kurulur.",
        IDLE:
          "Hat aktif ve uygun üretim planlarında kapasiteye dahil edilir.",
        MAINTENANCE:
          "Hat bakım durumunda. Devre dışı bırakılırsa bakım dışı aktif kapasiteye dönmez.",
        RUNNING:
          "Hat vardiya akışında çalışıyor. Vardiya tamamlanmadan durum değiştirilemez.",
        SOLD: "Satılmış hat tekrar aktif edilemez veya devre dışı bırakılamaz.",
      },
      metrics: {
        activeStaff: "Aktif personel",
        capacityImpact: "Kapasite etkisi",
        staffImpact: "Personel etkisi",
      },
      alerts: {
        activateTitle: "Hattı tekrar aktif et",
        activateBody: (count: number) =>
          `Bu işlem hattı IDLE durumuna alır ve ${count} direkt personeli yeniden atar.`,
        disableTitle: "Hattı devre dışı bırak",
        disableBody: (count: number) =>
          `Bu işlem hattı üretim kapasitesinden çıkarır ve bu hatta bağlı ${count} direkt personeli işten çıkarır.`,
        errorTitle: "Durum güncellenemedi",
        leasingTitle: "Leasing sözleşmesi devam ediyor",
        leasingBody:
          "Hat devre dışı olsa bile aktif leasing taksitleri finans planında kalır.",
        lockedTitle: "Bu durumda işlem kilitli",
        lockedBody: (status: string) =>
          `${status} durumundaki hat için bu aksiyon uygulanamaz.`,
        playbackTitle: "Vardiya sırasında kilitli",
        playbackBody: "Vardiya oynatılırken hat durumu değiştirilemez.",
      },
      buttons: {
        activate: "Hattı Aktif Et",
        disable: "Devre Dışı Bırak",
        pending: "Durum güncelleniyor...",
      },
      success: {
        title: "Hat durumu güncellendi",
        activated: (count: number) =>
          `Hat tekrar aktif edildi. ${count} direkt personel ataması yenilendi.`,
        disabled: (count: number) =>
          `Hat devre dışı bırakıldı. ${count} direkt personel işten çıkarıldı.`,
      },
      upgradeLocked: {
        title: "Hat devre dışı",
        body: "Upgrade yapmadan önce Durum tabından hattı tekrar aktif etmelisiniz.",
      },
      errors: {
        FACTORY_NOT_ACTIVE: "Fabrika şu anda hat yönetimine açık değil.",
        FACTORY_NOT_FOUND: "Fabrika kaydı bulunamadı.",
        INVALID_REQUEST: "Hat durumu isteği geçersiz.",
        LINE_NOT_FOUND: "Üretim hattı bulunamadı.",
        LINE_STATUS_LOCKED: "Bu hat mevcut durumunda değiştirilemez.",
        PLAYBACK_ACTIVE: "Vardiya oynatılırken hat durumu değiştirilemez.",
        PRODUCTION_PLAN_ACTIVE:
          "Bugünün üretim planında bu hat varken durum değiştirilemez.",
        SECTOR_MISMATCH: "Seçilen hat fabrikanın sektörüne ait değil.",
        STAFF_CONFIG_INCOMPLETE:
          "Bu hattın direkt personel yapılandırması eksik.",
        UNAUTHORIZED: "Bu işlem için oturum açmalısınız.",
        UNKNOWN_ERROR: "Hat durumu güncellenemedi. Lütfen tekrar deneyin.",
      },
    },
  },
  en: {
    gradeLabels: {
      INDUSTRIAL: "Industrial",
      PRECISION: "Precision",
      SMART: "Smart",
      WORKSHOP: "Workshop",
    },
    panel: {
      noOptions: "No active production line options are available here.",
      departmentSubtitle: (departmentName: string) =>
        `${departmentName} · Technical and financial options`,
      locked: "Locked during shift playback",
      planningOpen: "Planning open",
      departmentNavAria: "Investment department",
      templateNavAria: "Production line standard",
      machineCount: (count: number) => `${count} machines`,
    },
    purchase: {
      imageAlt: (gradeLabel: string) => `${gradeLabel} production line`,
      lineType: "Production line",
      metrics: {
        capacity: "Capacity",
        idealStaff: "Ideal staff",
        area: "Area",
        electricity: "Electricity",
        pointPerDay: (value: string) => `${value} points/day`,
        periodCost: (value: string) => `${value} / period`,
      },
      financingAria: "Investment financing",
      financingTitle: "Investment Financing",
      paymentCash: "Cash",
      paymentLeasing: "Leasing",
      dueToday: "Due today",
      cashNote: "Deducted from cash in one payment",
      noLeaseOffer: "No active leasing offer is available for this line.",
      recurringSummary: (value: string) =>
        `Operating Cost Impact · ${value} / period`,
      newOperatingStage: "New operating stage",
      directStaff: (count: number) => `Direct staff · ${count}`,
      supportStaff: (count: number) => `Support / management delta · ${count}`,
      costs: {
        directPayroll: "Direct payroll",
        supportPayroll: "Support payroll",
        electricity: "Line electricity",
        other: "Other costs",
      },
      buyPending: "Purchasing…",
      buyAction: (value: string) => `Buy Cash · ${value}`,
      leasePending: "Setting up leasing…",
      leaseAction: (value: string) => `Set Up Leasing · Today ${value}`,
      noLeaseButton: "No leasing offer",
      leaseTerm: (years: number) => `${years} years`,
      installmentCount: (count: number) => `${count} installments`,
      summaryRows: {
        today: "Today",
        every22Days: "Every 22 days",
        installment: "Installments",
        totalCost: "Total cost",
      },
      noExtraStaff: "No extra staff",
      purchaseErrors: {
        DUPLICATE_REQUEST: "This purchase request was already processed.",
        FACTORY_NOT_ACTIVE: "The factory is not open for investment right now.",
        FACTORY_NOT_FOUND: "Factory record was not found.",
        INSUFFICIENT_FUNDS: "There is not enough cash for this line.",
        INVALID_DEPARTMENT_KIND:
          "This department does not support production line investment.",
        INVALID_REQUEST: "The purchase request is invalid.",
        PLAYBACK_ACTIVE: "Investment is locked during shift playback.",
        SECTOR_MISMATCH:
          "The selected line does not belong to the factory sector.",
        TEMPLATE_NOT_ACTIVE: "This production line is no longer for sale.",
        TEMPLATE_NOT_FOUND: "Production line option was not found.",
        UNAUTHORIZED: "You must be signed in for this action.",
        UNKNOWN_ERROR: "Purchase could not be completed. Please try again.",
      },
      leaseErrors: {
        DUPLICATE_REQUEST: "This leasing request was already processed.",
        FACTORY_NOT_ACTIVE: "The factory is not open for investment right now.",
        FACTORY_NOT_FOUND: "Factory record was not found.",
        INSUFFICIENT_FUNDS: "There is not enough cash for the down payment.",
        INVALID_DEPARTMENT_KIND:
          "This department does not support production line investment.",
        INVALID_REQUEST: "The leasing request is invalid.",
        OFFER_NOT_ACTIVE: "The selected leasing offer is no longer active.",
        OFFER_NOT_FOUND: "Leasing offer was not found.",
        OFFER_TEMPLATE_MISMATCH:
          "The leasing offer does not belong to the selected line.",
        PLAYBACK_ACTIVE: "Investment is locked during shift playback.",
        SECTOR_MISMATCH:
          "The selected line does not belong to the factory sector.",
        TEMPLATE_NOT_ACTIVE: "This production line is no longer for sale.",
        TEMPLATE_NOT_FOUND: "Production line option was not found.",
        UNAUTHORIZED: "You must be signed in for this action.",
        UNKNOWN_ERROR: "Leasing could not be set up. Please try again.",
      },
    },
    upgrade: {
      imageAlt: (lineTitle: string) => `${lineTitle} production line`,
      expandAria: (lineTitle: string) => `Enlarge ${lineTitle} image`,
      expandLabel: "Enlarge",
      labels: {
        standard: "Standard",
        capacity: "Capacity",
        staff: "Staff",
        area: "Area",
        electricity: "Electricity",
        capacityIncrease: "Workforce increase",
        points: (value: string) => `${value} points`,
      },
      budgetTitle: "Upgrade Budget",
      budgetRows: {
        gross: "New line price",
        refund: "Used line trade-in",
        net: "Cash outflow",
      },
      alerts: {
        leasingTitle: "Leasing contract active",
        leasingBody:
          "This line cannot be upgraded until the leasing term is complete.",
        maxTitle: "SMART technology",
        maxBody: "This production line is already at the highest technology level.",
        missingTitle: "No upgrade option",
        missingBody:
          "The next active production line for this department was not found.",
        successTitle: "Upgrade complete",
        successBody: (xp: number, gradeLabel: string) =>
          `+${xp} XP added. New technology level: ${gradeLabel}.`,
        errorTitle: "Upgrade could not be completed",
      },
      buttonPending: "Applying upgrade...",
      buttonAction: (value: string) => `Upgrade · ${value}`,
      buttonClosed: "Upgrade closed",
      errors: {
        DEPARTMENT_MISMATCH:
          "The selected upgrade does not belong to the same department.",
        DUPLICATE_REQUEST: "This upgrade request was already processed.",
        FACTORY_NOT_ACTIVE: "The factory is not open for upgrades right now.",
        FACTORY_NOT_FOUND: "Factory record was not found.",
        INSUFFICIENT_FUNDS: "There is not enough cash for this upgrade.",
        INVALID_REQUEST: "The upgrade request is invalid.",
        INVALID_UPGRADE_PATH:
          "The selected technology level is not the next upgrade.",
        LEASING_ACTIVE:
          "A line with an active leasing contract cannot be upgraded.",
        LINE_NOT_FOUND: "Production line was not found.",
        LINE_NOT_UPGRADABLE: "This production line cannot be upgraded right now.",
        MAX_GRADE_REACHED:
          "This production line is already at the highest technology level.",
        PLAYBACK_ACTIVE: "Upgrade is locked during shift playback.",
        PRODUCTION_PLAN_ACTIVE:
          "Upgrade is locked while today's production plan is active.",
        SECTOR_MISMATCH:
          "The selected upgrade does not belong to the factory sector.",
        TEMPLATE_NOT_ACTIVE: "The selected upgrade is no longer active.",
        TEMPLATE_NOT_FOUND: "Upgrade option was not found.",
        UNAUTHORIZED: "You must be signed in for this action.",
        UNKNOWN_ERROR: "Upgrade could not be completed. Please try again.",
      },
    },
    lineStatus: {
      tabsAria: "Production line action tabs",
      tabs: {
        upgrade: "Upgrade",
        status: "Status",
      },
      currentTitle: "Line status",
      points: (value: string) => `${value} points`,
      statusLabels: {
        BLOCKED: "Blocked",
        BROKEN: "Broken",
        DISABLED: "Disabled",
        IDLE: "Active",
        MAINTENANCE: "Maintenance",
        RUNNING: "Running",
        SOLD: "Sold",
      },
      statusDescriptions: {
        BLOCKED:
          "The line is blocked in the production flow. Disabling it releases the assigned direct staff.",
        BROKEN:
          "The line is broken. Disabling it removes its capacity and releases the assigned direct staff.",
        DISABLED:
          "The line is not counted as production capacity. Activating it restores the ideal direct staff crew.",
        IDLE:
          "The line is active and counted in eligible production plans.",
        MAINTENANCE:
          "The line is under maintenance. Disabling it keeps it out of active production capacity.",
        RUNNING:
          "The line is running in the shift flow. Status cannot be changed until the shift is complete.",
        SOLD: "A sold line cannot be activated or disabled.",
      },
      metrics: {
        activeStaff: "Active staff",
        capacityImpact: "Capacity impact",
        staffImpact: "Staff impact",
      },
      alerts: {
        activateTitle: "Activate line",
        activateBody: (count: number) =>
          `This moves the line to IDLE and restores ${count} direct staff assignments.`,
        disableTitle: "Disable line",
        disableBody: (count: number) =>
          `This removes the line from production capacity and dismisses ${count} assigned direct staff.`,
        errorTitle: "Status could not be updated",
        leasingTitle: "Leasing contract continues",
        leasingBody:
          "Active leasing installments remain in the finance plan even if the line is disabled.",
        lockedTitle: "Action locked for this status",
        lockedBody: (status: string) =>
          `This action cannot be applied while the line is ${status}.`,
        playbackTitle: "Locked during shift playback",
        playbackBody: "Line status cannot be changed during shift playback.",
      },
      buttons: {
        activate: "Activate Line",
        disable: "Disable Line",
        pending: "Updating status...",
      },
      success: {
        title: "Line status updated",
        activated: (count: number) =>
          `The line is active again. ${count} direct staff assignments were restored.`,
        disabled: (count: number) =>
          `The line was disabled. ${count} direct staff were dismissed.`,
      },
      upgradeLocked: {
        title: "Line is disabled",
        body: "Activate the line from the Status tab before upgrading it.",
      },
      errors: {
        FACTORY_NOT_ACTIVE: "The factory is not open for line management right now.",
        FACTORY_NOT_FOUND: "Factory record was not found.",
        INVALID_REQUEST: "The line status request is invalid.",
        LINE_NOT_FOUND: "Production line was not found.",
        LINE_STATUS_LOCKED: "This line cannot be changed in its current status.",
        PLAYBACK_ACTIVE: "Line status cannot be changed during shift playback.",
        PRODUCTION_PLAN_ACTIVE:
          "Status cannot be changed while this line is in today's production plan.",
        SECTOR_MISMATCH:
          "The selected line does not belong to the factory sector.",
        STAFF_CONFIG_INCOMPLETE:
          "The direct staff configuration for this line is incomplete.",
        UNAUTHORIZED: "You must be signed in for this action.",
        UNKNOWN_ERROR: "Line status could not be updated. Please try again.",
      },
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    gradeLabels: Record<ProductionGrade, string>;
    panel: {
      noOptions: string;
      departmentSubtitle: (departmentName: string) => string;
      locked: string;
      planningOpen: string;
      departmentNavAria: string;
      templateNavAria: string;
      machineCount: (count: number) => string;
    };
    purchase: {
      imageAlt: (gradeLabel: string) => string;
      lineType: string;
      metrics: {
        capacity: string;
        idealStaff: string;
        area: string;
        electricity: string;
        pointPerDay: (value: string) => string;
        periodCost: (value: string) => string;
      };
      financingAria: string;
      financingTitle: string;
      paymentCash: string;
      paymentLeasing: string;
      dueToday: string;
      cashNote: string;
      noLeaseOffer: string;
      recurringSummary: (value: string) => string;
      newOperatingStage: string;
      directStaff: (count: number) => string;
      supportStaff: (count: number) => string;
      costs: {
        directPayroll: string;
        supportPayroll: string;
        electricity: string;
        other: string;
      };
      buyPending: string;
      buyAction: (value: string) => string;
      leasePending: string;
      leaseAction: (value: string) => string;
      noLeaseButton: string;
      leaseTerm: (years: number) => string;
      installmentCount: (count: number) => string;
      summaryRows: {
        today: string;
        every22Days: string;
        installment: string;
        totalCost: string;
      };
      noExtraStaff: string;
      purchaseErrors: Record<PurchaseErrorCode, string>;
      leaseErrors: Record<LeaseErrorCode, string>;
    };
    upgrade: {
      imageAlt: (lineTitle: string) => string;
      expandAria: (lineTitle: string) => string;
      expandLabel: string;
      labels: {
        standard: string;
        capacity: string;
        staff: string;
        area: string;
        electricity: string;
        capacityIncrease: string;
        points: (value: string) => string;
      };
      budgetTitle: string;
      budgetRows: {
        gross: string;
        refund: string;
        net: string;
      };
      alerts: {
        leasingTitle: string;
        leasingBody: string;
        maxTitle: string;
        maxBody: string;
        missingTitle: string;
        missingBody: string;
        successTitle: string;
        successBody: (xp: number, gradeLabel: string) => string;
        errorTitle: string;
      };
      buttonPending: string;
      buttonAction: (value: string) => string;
      buttonClosed: string;
      errors: Record<UpgradeErrorCode, string>;
    };
    lineStatus: {
      tabsAria: string;
      tabs: {
        upgrade: string;
        status: string;
      };
      currentTitle: string;
      points: (value: string) => string;
      statusLabels: Record<FactoryProductionLineStatus, string>;
      statusDescriptions: Record<FactoryProductionLineStatus, string>;
      metrics: {
        activeStaff: string;
        capacityImpact: string;
        staffImpact: string;
      };
      alerts: {
        activateTitle: string;
        activateBody: (count: number) => string;
        disableTitle: string;
        disableBody: (count: number) => string;
        errorTitle: string;
        leasingTitle: string;
        leasingBody: string;
        lockedTitle: string;
        lockedBody: (status: string) => string;
        playbackTitle: string;
        playbackBody: string;
      };
      buttons: {
        activate: string;
        disable: string;
        pending: string;
      };
      success: {
        title: string;
        activated: (count: number) => string;
        disabled: (count: number) => string;
      };
      upgradeLocked: {
        title: string;
        body: string;
      };
      errors: Record<LineStatusErrorCode, string>;
    };
  }
>;

export type InvestmentPurchaseCopy =
  (typeof investmentCopy)[SupportedLocale]["purchase"];
export type InvestmentUpgradeCopy =
  (typeof investmentCopy)[SupportedLocale]["upgrade"];
export type InvestmentLineStatusCopy =
  (typeof investmentCopy)[SupportedLocale]["lineStatus"];

import type { ProductionGrade } from "@/generated/prisma/enums";
import type { ShipmentSceneLevel } from "@/features/warehouse/types";
import {
  numberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

import type { FactoryLineWorkloadState, GamePanelKey } from "./types";

const shipmentNumberFormatters = {
  en: new Intl.NumberFormat(numberLocale("en"), { maximumFractionDigits: 0 }),
  tr: new Intl.NumberFormat(numberLocale("tr"), { maximumFractionDigits: 0 }),
} satisfies Record<SupportedLocale, Intl.NumberFormat>;

const shipmentFillLabels = {
  en: {
    1: "Low",
    2: "Light",
    3: "Medium",
    4: "Filling",
    5: "High",
    6: "Full",
    7: "Very Full",
  },
  tr: {
    1: "Düşük",
    2: "Az Dolu",
    3: "Orta",
    4: "Doluyor",
    5: "Yüksek",
    6: "Dolu",
    7: "Çok Dolu",
  },
} satisfies Record<SupportedLocale, Record<ShipmentSceneLevel, string>>;

export const gameCopy = {
  tr: {
    dock: {
      navLabel: "Departman menüsü",
      guideAria: "Oyun Rehberi",
      guideTitle: "Oyun Rehberi",
      guideSubtitle: "Akışları incele",
    },
    leftDock: {
      navLabel: "Hızlı oyun menüsü",
      items: {
        finance: { label: "Finans", tooltip: "Finans" },
        orders: { label: "Sipariş", tooltip: "Yeni Siparişler" },
        reports: { label: "Reports", tooltip: "Raporlar" },
        tasks: { label: "Görevler", tooltip: "Görevler" },
      },
    },
    map: {
      ariaLabel: "Fabrika haritası",
      officeArea: {
        ariaLabel: (stageName: string) =>
          `${stageName} ofis ve yönetim alanı. Finansı aç.`,
        title: "Office",
      },
      lineCount: (count: number) => `${count} hat`,
      lineDetailAria: (title: string) => `${title} detay`,
      workloadTitle: "İş Yükü",
      noCapacity: "kapasite yok.",
      days: (days: number) => `${days} gün.`,
      investmentLabelFallback: "Yeni Hat",
      shipmentArea: {
        ariaLabel: "Sevkiyat hazır ürün alanı",
        emptyStateLabel: "Sevkiyata hazır ürün bulunmuyor.",
        fillLabel: (level: ShipmentSceneLevel) => shipmentFillLabels.tr[level],
        summaryLabel: (readyQuantity: number, palletCount: number) =>
          `${shipmentNumberFormatters.tr.format(readyQuantity)} adet · ${shipmentNumberFormatters.tr.format(palletCount)} palet`,
        title: "Sevkiyat Deposu",
        statusLabels: {
          completed: "Tamamlanan sevkiyat",
          delayed: "Geciken sevkiyat",
          inProgress: "Hazırlanmakta olan sevkiyat",
        },
      },
      installation: {
        title: "Kurulum Aşaması",
        remainingDays: (days: number) => `Kalan ${days} Gün`,
        awaitingActivation: "Aktivasyon Bekleniyor",
      },
      slotStatus: {
        active: "Aktif",
        busy: "Dolu",
        idle: "Boş",
        installing: "Kurulumda",
        locked: "Devre dışı",
        risk: "Riskli",
      },
      productionGrades: {
        INDUSTRIAL: {
          label: "Industrial Grade",
          readyLabel: "Premium Uygun",
          titleLabel: "Endüstriyel Standardı",
        },
        PRECISION: {
          label: "Precision Grade",
          readyLabel: "Luxury Uygun",
          titleLabel: "Hassas Standardı",
        },
        SMART: {
          label: "Smart Grade",
          readyLabel: "Verimlilik Bonusu",
          titleLabel: "Akıllı Standardı",
        },
        WORKSHOP: {
          label: "Workshop Grade",
          readyLabel: "Basic Uygun",
          titleLabel: "Atölye Standardı",
        },
      },
    },
    panels: {
      closeAria: "Paneli kapat",
      titles: {
        cutting: "Kesim",
        departmentDetail: "Departman",
        departmentQueue: "Üretim Kuyruğu",
        finance: "Finans",
        investment: "Üretim Hattı Yatırımı",
        lineDetail: "Üretim Hattı",
        orders: "Siparişler",
        production: "Üretim",
        playerFeedback: "Oyuncu Fikirleri",
        ranking: "",
        reports: "Raporlar",
        staff: "Personel",
        tasks: "Görevler",
        warehouse: "Depo",
      },
      production: {
        title: "Üretim",
        value: (count: number) => `${count} hat`,
        body: "Kurulu üretim alanları haritada hazır.",
      },
      staff: {
        title: "Personel",
        body: "Ekip planı ayrı panelde takip edilecek.",
      },
      lineMissing: {
        title: "Hat Detayı",
        body: "Seçili üretim hattı bulunamadı.",
      },
      departmentMissing: {
        title: "Departman",
        body: "Seçili departman bulunamadı.",
      },
      departmentClean: "Temiz",
      departmentDatum: {
        department: "Departman",
        dockId: "Dock ID",
        icon: "İkon",
        order: "Sıra",
      },
    },
    pwaInstall: {
      cardTitle: "FactoryRunway’i yükle",
      description: "Tarayıcı çubukları olmadan uygulama gibi kullan.",
      gotIt: "Anladım",
      helpDescription: "Safari’nin paylaşım menüsünü kullanarak kurulumu tamamla.",
      helpTitle: "FactoryRunway’i Ana Ekrana Ekle",
      installApp: "Uygulamayı Yükle",
      installationSteps: "Kurulum Adımları",
      iosCardTitle: "FactoryRunway’i Ana Ekrana Ekle",
      iosSteps: [
        "Safari’de Paylaş simgesine dokun.",
        "“Ana Ekrana Ekle” seçeneğini aç.",
        "Sağ üstteki “Ekle” düğmesine dokun.",
      ],
      later: "Daha Sonra",
      manualIos: "Ana Ekrana Ekle",
      manualNative: "Uygulamayı Yükle",
    },
    shiftControl: {
      completed: "Gün Sonu Özeti",
      pending: "Vardiya hazırlanıyor",
      playing: "Vardiya sürüyor",
      start: "Vardiyayı başlat",
      day: (day: number) => `${day}. gün`,
    },
    snapshot: {
      badges: {
        activeTask: "Aktif görev",
        materialMissing: "Malzeme uyarısı",
        newOrder: "Yeni sipariş",
        pendingTask: "Bekleyen iş",
        queueBottleneck: "Kuyruk / darboğaz",
        rewardWaiting: "Ödül bekliyor",
        shippingReady: "Sevke hazır",
        warehouseInbound: "Yolda",
      },
      dockLabels: {
        shipping: "Sevkiyat",
        warehouse: "Depo",
      },
      investmentAction: {
        title: "Yatırım Yap",
        subtitle: (groupTitle: string) => `${groupTitle} yatırımları`,
      },
      lineTitle: (departmentName: string, lineNumber: number) =>
        `${departmentName} Hattı ${lineNumber}`,
      metrics: {
        activeOrder: "Aktif Sipariş",
        cash: "Nakit",
        clean: "Temiz",
        day: "Gün",
        financePeriod: (period: number) => `Finans ${period}. dönem`,
        installedLine: "Kurulu Hat",
        late: "Geciken",
        level: "Seviye",
        maxLevel: "Maksimum seviye",
        productionArea: "Üretim alanı",
        productionOrders: (count: number) => `${count} üretim emri`,
        risk: "Risk altında",
        runwayToken: "Runway Token",
        xp: "Tecrübe",
        xpForNextLevel: (level: number, xp: string) => `Lv. ${level} için ${xp} XP`,
        xpRemaining: (xp: string) => `${xp} XP kaldı`,
      },
      monthNames: [
        "Ocak",
        "Şubat",
        "Mart",
        "Nisan",
        "Mayıs",
        "Haziran",
        "Temmuz",
        "Ağustos",
        "Eylül",
        "Ekim",
        "Kasım",
        "Aralık",
      ],
      monthYear: (monthName: string, yearIndex: number) =>
        `${monthName} - ${yearIndex}. Yıl`,
      notifications: {
        factoryStableTitle: "Fabrika akışı sakin",
        factoryStableBody: "Haritada acil uyarı yok.",
        lateOrdersTitle: "Teslimat riski",
        lateOrdersBody: (count: number) => `${count} sipariş gecikme durumunda.`,
        productionActiveTitle: "Üretim emri aktif",
        productionActiveBody: (count: number) => `${count} üretim emri takipte.`,
        tierUnlockedTitle: (tier: string) => `${tier} siparişleri açıldı`,
        tierUnlockedBody: (tier: string) =>
          `Fabrika tecrübe seviyen artık ${tier} siparişleri için uygun. Yeni teklifler gelmeye başlayacak.`,
      },
    },
    taskCta: {
      acceptOrder: "Siparişlere Git",
      advanceShift: "Vardiyayı İlerle",
      finance: "Finansı Aç",
      investment: "Yatırımları İncele",
      productionQueue: "Üretim Kuyruğuna Git",
      staff: "Personeli İncele",
      warehouse: "Depoyu İncele",
    },
    topStatus: {
      messagesAria: "Oyuncu fikirleri panelini aç",
      messagesTooltip: "Oyuncu fikirleri",
      openRankingAria: "Ranking panelini aç",
      logoutAria: "Çıkış yap",
      logoutTitle: "Çıkış yap",
      logoutLabel: "Logout",
      mobile: {
        alerts: (count: number) => `${count} kritik fabrika bildirimi`,
        close: "Fabrika durumunu kapat",
        description: "Fabrika bilgileri, metrikleri ve yönetim eylemleri",
        factoryInformation: "Fabrika Bilgileri",
        factoryStatus: "Fabrika Durumu",
        language: "Dil",
        logout: "Çıkış",
        management: "Yönetim",
        messages: "Oyuncu Mesajları",
        metrics: "Fabrika Metrikleri",
        ranking: "Sıralama",
        staff: "Personel",
      },
    },
    workload: {
      daySuffix: "g",
      noCapacity: "Kapasite Yok",
      states: {
        balanced: "Dengeli",
        constrained: "Sıkışma Riski",
        critical: "Kritik Darboğaz",
        empty: "Boşta",
        low: "Düşük Yük",
        thin: "Zayıf Yük",
      },
    },
  },
  en: {
    dock: {
      navLabel: "Department menu",
      guideAria: "Gameplay Guide",
      guideTitle: "Gameplay Guide",
      guideSubtitle: "Review flows",
    },
    leftDock: {
      navLabel: "Quick game menu",
      items: {
        finance: { label: "Finance", tooltip: "Finance" },
        orders: { label: "Orders", tooltip: "New Orders" },
        reports: { label: "Reports", tooltip: "Reports" },
        tasks: { label: "Tasks", tooltip: "Tasks" },
      },
    },
    map: {
      ariaLabel: "Factory map",
      officeArea: {
        ariaLabel: (stageName: string) =>
          `${stageName} office and management area. Open finance.`,
        title: "Office",
      },
      lineCount: (count: number) => `${count} lines`,
      lineDetailAria: (title: string) => `${title} details`,
      workloadTitle: "Workload",
      noCapacity: "no capacity.",
      days: (days: number) => `${days} days.`,
      investmentLabelFallback: "New Line",
      shipmentArea: {
        ariaLabel: "Shipment ready area",
        emptyStateLabel: "No products are ready for shipment.",
        fillLabel: (level: ShipmentSceneLevel) => shipmentFillLabels.en[level],
        summaryLabel: (readyQuantity: number, palletCount: number) =>
          `${shipmentNumberFormatters.en.format(readyQuantity)} pcs · ${shipmentNumberFormatters.en.format(palletCount)} ${
            palletCount === 1 ? "pallet" : "pallets"
          }`,
        title: "Shipment Warehouse",
        statusLabels: {
          completed: "Completed shipment",
          delayed: "Delayed shipment",
          inProgress: "Shipment in progress",
        },
      },
      installation: {
        title: "Installation",
        remainingDays: (days: number) => `${days} Days Left`,
        awaitingActivation: "Awaiting Activation",
      },
      slotStatus: {
        active: "Active",
        busy: "Busy",
        idle: "Idle",
        installing: "Installing",
        locked: "Disabled",
        risk: "At Risk",
      },
      productionGrades: {
        INDUSTRIAL: {
          label: "Industrial Grade",
          readyLabel: "Premium Ready",
          titleLabel: "Industrial Grade",
        },
        PRECISION: {
          label: "Precision Grade",
          readyLabel: "Luxury Ready",
          titleLabel: "Precision Grade",
        },
        SMART: {
          label: "Smart Grade",
          readyLabel: "Efficiency Bonus",
          titleLabel: "Smart Grade",
        },
        WORKSHOP: {
          label: "Workshop Grade",
          readyLabel: "Basic Ready",
          titleLabel: "Workshop Grade",
        },
      },
    },
    panels: {
      closeAria: "Close panel",
      titles: {
        cutting: "Cutting",
        departmentDetail: "Department",
        departmentQueue: "Production Queue",
        finance: "Finance",
        investment: "Production Line Investment",
        lineDetail: "Production Line",
        orders: "Orders",
        production: "Production",
        playerFeedback: "Player Ideas",
        ranking: "",
        reports: "Reports",
        staff: "Staff",
        tasks: "Tasks",
        warehouse: "Warehouse",
      },
      production: {
        title: "Production",
        value: (count: number) => `${count} lines`,
        body: "Installed production areas are ready on the map.",
      },
      staff: {
        title: "Staff",
        body: "Team planning will be tracked in a separate panel.",
      },
      lineMissing: {
        title: "Line Details",
        body: "The selected production line was not found.",
      },
      departmentMissing: {
        title: "Department",
        body: "The selected department was not found.",
      },
      departmentClean: "Clear",
      departmentDatum: {
        department: "Department",
        dockId: "Dock ID",
        icon: "Icon",
        order: "Order",
      },
    },
    pwaInstall: {
      cardTitle: "Install FactoryRunway",
      description: "Use it like an app without browser toolbars.",
      gotIt: "Got it",
      helpDescription: "Complete installation from Safari’s share menu.",
      helpTitle: "Add FactoryRunway to Home Screen",
      installApp: "Install App",
      installationSteps: "Installation Steps",
      iosCardTitle: "Add FactoryRunway to Home Screen",
      iosSteps: [
        "Tap the Share button in Safari.",
        "Select “Add to Home Screen”.",
        "Tap “Add” in the top-right corner.",
      ],
      later: "Later",
      manualIos: "Add to Home Screen",
      manualNative: "Install App",
    },
    shiftControl: {
      completed: "End of Day Summary",
      pending: "Preparing shift",
      playing: "Shift in progress",
      start: "Start shift",
      day: (day: number) => `Day ${day}`,
    },
    snapshot: {
      badges: {
        activeTask: "Active task",
        materialMissing: "Material warning",
        newOrder: "New order",
        pendingTask: "Pending work",
        queueBottleneck: "Queue / bottleneck",
        rewardWaiting: "Reward waiting",
        shippingReady: "Ready to ship",
        warehouseInbound: "Inbound",
      },
      dockLabels: {
        shipping: "Shipping",
        warehouse: "Warehouse",
      },
      investmentAction: {
        title: "Invest",
        subtitle: (groupTitle: string) => `${groupTitle} investments`,
      },
      lineTitle: (departmentName: string, lineNumber: number) =>
        `${departmentName} Line ${lineNumber}`,
      metrics: {
        activeOrder: "Active Orders",
        cash: "Cash",
        clean: "Clear",
        day: "Day",
        financePeriod: (period: number) => `Finance period ${period}`,
        installedLine: "Installed Lines",
        late: "Late",
        level: "Level",
        maxLevel: "Max level",
        productionArea: "Production area",
        productionOrders: (count: number) => `${count} production orders`,
        risk: "At risk",
        runwayToken: "Runway Token",
        xp: "Experience",
        xpForNextLevel: (level: number, xp: string) => `${xp} XP for Lv. ${level}`,
        xpRemaining: (xp: string) => `${xp} XP left`,
      },
      monthNames: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      monthYear: (monthName: string, yearIndex: number) =>
        `${monthName} - Year ${yearIndex}`,
      notifications: {
        factoryStableTitle: "Factory flow is calm",
        factoryStableBody: "No urgent alert on the map.",
        lateOrdersTitle: "Delivery risk",
        lateOrdersBody: (count: number) => `${count} orders are at risk of delay.`,
        productionActiveTitle: "Production orders active",
        productionActiveBody: (count: number) => `${count} production orders are being tracked.`,
        tierUnlockedTitle: (tier: string) => `${tier} orders unlocked`,
        tierUnlockedBody: (tier: string) =>
          `Your factory experience level now qualifies for ${tier} orders. New offers will start appearing.`,
      },
    },
    taskCta: {
      acceptOrder: "Go to Orders",
      advanceShift: "Advance Shift",
      finance: "Open Finance",
      investment: "Review Investments",
      productionQueue: "Go to Production Queue",
      staff: "Review Staff",
      warehouse: "Review Warehouse",
    },
    topStatus: {
      messagesAria: "Open player ideas panel",
      messagesTooltip: "Player ideas",
      openRankingAria: "Open ranking panel",
      logoutAria: "Log out",
      logoutTitle: "Log out",
      logoutLabel: "Logout",
      mobile: {
        alerts: (count: number) => `${count} critical factory alerts`,
        close: "Close factory status",
        description: "Factory information, metrics, and management actions",
        factoryInformation: "Factory Information",
        factoryStatus: "Factory Status",
        language: "Language",
        logout: "Log out",
        management: "Management",
        messages: "Player Messages",
        metrics: "Factory Metrics",
        ranking: "Ranking",
        staff: "Staff",
      },
    },
    workload: {
      daySuffix: "d",
      noCapacity: "No Capacity",
      states: {
        balanced: "Balanced",
        constrained: "Congestion Risk",
        critical: "Critical Bottleneck",
        empty: "Idle",
        low: "Low Load",
        thin: "Thin Load",
      },
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    dock: {
      navLabel: string;
      guideAria: string;
      guideTitle: string;
      guideSubtitle: string;
    };
    leftDock: {
      navLabel: string;
      items: Record<
        "finance" | "orders" | "reports" | "tasks",
        { label: string; tooltip: string }
      >;
    };
    map: {
      ariaLabel: string;
      officeArea: {
        ariaLabel: (stageName: string) => string;
        title: string;
      };
      lineCount: (count: number) => string;
      lineDetailAria: (title: string) => string;
      workloadTitle: string;
      noCapacity: string;
      days: (days: number) => string;
      investmentLabelFallback: string;
      shipmentArea: {
        ariaLabel: string;
        emptyStateLabel: string;
        fillLabel: (level: ShipmentSceneLevel) => string;
        summaryLabel: (readyQuantity: number, palletCount: number) => string;
        title: string;
        statusLabels: {
          completed: string;
          delayed: string;
          inProgress: string;
        };
      };
      installation: {
        title: string;
        remainingDays: (days: number) => string;
        awaitingActivation: string;
      };
      slotStatus: Record<
        "active" | "busy" | "idle" | "installing" | "locked" | "risk",
        string
      >;
      productionGrades: Record<
        ProductionGrade,
        { label: string; readyLabel: string; titleLabel: string }
      >;
    };
    panels: {
      closeAria: string;
      titles: Record<GamePanelKey, string>;
      production: {
        title: string;
        value: (count: number) => string;
        body: string;
      };
      staff: {
        title: string;
        body: string;
      };
      lineMissing: {
        title: string;
        body: string;
      };
      departmentMissing: {
        title: string;
        body: string;
      };
      departmentClean: string;
      departmentDatum: {
        department: string;
        dockId: string;
        icon: string;
        order: string;
      };
    };
    pwaInstall: {
      cardTitle: string;
      description: string;
      gotIt: string;
      helpDescription: string;
      helpTitle: string;
      installApp: string;
      installationSteps: string;
      iosCardTitle: string;
      iosSteps: readonly [string, string, string];
      later: string;
      manualIos: string;
      manualNative: string;
    };
    shiftControl: {
      completed: string;
      pending: string;
      playing: string;
      start: string;
      day: (day: number) => string;
    };
    snapshot: {
      badges: Record<
        | "activeTask"
        | "materialMissing"
        | "newOrder"
        | "pendingTask"
        | "queueBottleneck"
        | "rewardWaiting"
        | "shippingReady"
        | "warehouseInbound",
        string
      >;
      dockLabels: Record<"shipping" | "warehouse", string>;
      investmentAction: {
        title: string;
        subtitle: (groupTitle: string) => string;
      };
      lineTitle: (departmentName: string, lineNumber: number) => string;
      metrics: {
        activeOrder: string;
        cash: string;
        clean: string;
        day: string;
        financePeriod: (period: number) => string;
        installedLine: string;
        late: string;
        level: string;
        maxLevel: string;
        productionArea: string;
        productionOrders: (count: number) => string;
        risk: string;
        runwayToken: string;
        xp: string;
        xpForNextLevel: (level: number, xp: string) => string;
        xpRemaining: (xp: string) => string;
      };
      monthNames: readonly string[];
      monthYear: (monthName: string, yearIndex: number) => string;
      notifications: {
        factoryStableTitle: string;
        factoryStableBody: string;
        lateOrdersTitle: string;
        lateOrdersBody: (count: number) => string;
        productionActiveTitle: string;
        productionActiveBody: (count: number) => string;
        tierUnlockedTitle: (tier: string) => string;
        tierUnlockedBody: (tier: string) => string;
      };
    };
    taskCta: {
      acceptOrder: string;
      advanceShift: string;
      finance: string;
      investment: string;
      productionQueue: string;
      staff: string;
      warehouse: string;
    };
    topStatus: {
      messagesAria: string;
      messagesTooltip: string;
      openRankingAria: string;
      logoutAria: string;
      logoutTitle: string;
      logoutLabel: string;
      mobile: {
        alerts: (count: number) => string;
        close: string;
        description: string;
        factoryInformation: string;
        factoryStatus: string;
        language: string;
        logout: string;
        management: string;
        messages: string;
        metrics: string;
        ranking: string;
        staff: string;
      };
    };
    workload: {
      daySuffix: string;
      noCapacity: string;
      states: Record<FactoryLineWorkloadState, string>;
    };
  }
>;

export type GameCopy = (typeof gameCopy)[SupportedLocale];

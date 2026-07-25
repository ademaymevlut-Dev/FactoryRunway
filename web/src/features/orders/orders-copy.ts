import type { MarketOrderOfferType, ProductTier } from "@/generated/prisma/enums";
import type { SupportedLocale } from "@/lib/i18n/locales";

import type {
  OrderOfferCapacityState,
  OrderOfferCustomerRelationshipView,
} from "./types";

type RelationshipStatus = OrderOfferCustomerRelationshipView["status"];

export const ordersCopy = {
  tr: {
    filters: {
      BASIC: {
        description: "Kolay üretim, yüksek adet ve düşük XP kademeli seri üretim işleri.",
        hint: "LEVEL 1 · Seri üretim",
        label: "Basic",
      },
      STANDARD: {
        description: "Baskı, nakış, boyama, yıkama veya fason süreçli ikinci kademe işler.",
        hint: "LEVEL 5 · Ek işlemli",
        label: "Standard",
      },
      PREMIUM: {
        description: "Daha yüksek üretim yükü, kalite beklentisi ve üçüncü kademe XP.",
        hint: "LEVEL 20 · Yüksek kalite",
        label: "Premium",
      },
      LUXURY: {
        description: "Düşük adet, yüksek fiyat, yüksek kar ve en yüksek XP kademesi.",
        hint: "LEVEL 50 · Zirve grup",
        label: "Luxury",
      },
    },
    service: {
      activeOrderFallbackCustomer: "Müşteri",
      acceptPlan: {
        cuttingStart: (day: number) => `${day}. gün kesim başlayabilir`,
        materialReady: (day: number) => `${day}. gün kumaş ve aksesuar stokta`,
        productionOrder: (count: number) => `${count} üretim emri hazırlanacak`,
      },
      capacityState: {
        BALANCED: "Dengeli",
        CRITICAL: "Kritik",
        NO_CAPACITY: "Hat yok",
        RISKY: "Riskli",
        SAFE: "Rahat",
        STRETCH: "Yoğun",
      },
      customerStatus: {
        at_risk: "Riskli",
        new: "Yeni",
        trusted: "Güvenilir",
        warm: "Sıcak",
      },
      days: (value: string) => `${value} gün`,
      deadlineDays: (value: number) => `${value} gün termin`,
      estimatedDays: (value: string) => `${value} gün tahmini`,
      lineCount: (value: string) => `${value} hat`,
      noBottleneck: "Darboğaz yok",
      noLine: "Hat yok",
      noLineInfo: "Hat bilgisi yok",
      noPlannedLine: "Planlı hat yok",
      offerType: {
        EXPRESS: "Express",
        NORMAL: "Normal",
        OPPORTUNITY: "Fırsat",
        REPEAT: "RPT",
      },
      pieces: (value: string) => `${value} adet`,
      pointsPerDay: (value: string) => `${value} point/gün`,
      repeatEligible: "RPT uygun",
      repeatPending: "RPT beklemede",
    },
    ui: {
      acceptPlan: {
        cutting: "Kesim",
        material: "Stok",
        production: "Üretim",
        title: "Kabul Planı",
      },
      acceptButton: {
        idle: "Siparişi Kabul Et",
        pending: "Hazırlanıyor...",
      },
      activeOrders: {
        empty: "Aktif üretim emri yok.",
        remaining: (value: string) => `${value} adet`,
        targetDay: (day: number) => `${day}. gün`,
        title: "Aktif Üretim",
        workCount: (count: number) => `${count} iş`,
      },
      capacity: {
        bottleneck: "Darboğaz",
        current: "Mevcut",
        deadline: "Termin",
        hiddenDepartments: (count: number) => `+${count} bölüm daha var.`,
        offer: "Teklif",
        plannedLoad: "Planlanan Yük",
        prediction: "Tahmin",
        risk: "Kapasite riski",
        targetAfter: "Sonrası",
      },
      carousel: {
        ariaLabel: "Koleksiyon ürün gezgini",
        itemAria: (index: number, name: string) => `${index}. ürün: ${name}`,
        nextAria: "Sonraki koleksiyon ürünü",
        previousAria: "Önceki koleksiyon ürünü",
        title: "Koleksiyon Ürünü",
      },
      collectionItemsTitle: "Koleksiyon Kalemleri",
      colorDistributionTitle: "Renk Dağılımı",
      cost: {
        capacityRisk: "Kapasite riski",
        deliveryRisk: "Teslimat riski",
        itemCost: "Kalem Maliyeti",
        itemProfit: "Kalem Karı",
        itemTotal: "Kalem Tutarı",
        margin: "Planlanan Marj",
        planTitle: "Maliyet Planı",
        totalCost: "Toplam Maliyet",
        totalProfit: "Toplam Kar",
        totalRevenue: "Toplam Tutar",
        unitCost: "Birim Maliyet",
        unitPrice: "Birim Fiyat",
        unitProfit: "Birim Kar",
      },
      detail: {
        emptyItem: "Bu teklifte ürün kalemi bulunmuyor.",
        expires: (day: number) => `Son: ${day}. gün`,
        selectedOrder: "Seçili Sipariş",
      },
      empty: {
        market: "Sipariş Pazarı",
        noOffers: "Yeni teklifler vardiya ilerledikçe uygun ürün gruplarında oluşacak.",
        offersAvailable: (count: number) =>
          `${count} açık teklif ürün gruplarına ayrılmış durumda.`,
        selectTier: "Ürün grubunu seç",
      },
      list: {
        collection: (count: number) => `Koleksiyon · ${count} ürün`,
        delivery: (day: number) => `Teslim: ${day}. gün`,
        noOffersInTier: "Bu grupta teklif bulunmuyor.",
      },
      locked: {
        body: (currentLevel: number) =>
          `Mevcut seviyen LEVEL ${currentLevel}. Bu seviyeye ulaştığında uygun ürünlerin ve bu gruba bağlı müşterilerin siparişleri gelmeye başlayacak.`,
        title: (tier: string, minimumLevel: number) =>
          `${tier} siparişleri için LEVEL ${minimumLevel}`,
        eyebrow: "Kilitli Ürün Grubu",
      },
      marketTitle: "Sipariş Pazarı",
      metrics: {
        code: "Kod",
        colors: "Renk",
        delivery: "Teslim",
        quantity: "Adet",
        route: "Rota",
        segment: "Segment",
        variants: (count: number) => `${count} varyant`,
        volume: "Hacim",
      },
      relationship: {
        completedWork: (count: number) => `${count} iş`,
        history: "Geçmiş",
        lateSummary: (lateCount: number, totalLateDays: number) =>
          `${lateCount} gecikmeli teslim, toplam ${totalLateDays} gün güven kaybı yarattı.`,
        newCustomer: "Yeni müşteri",
        noHistory: "İlk teslim performansı sonrası güven ve RPT ihtimali oluşacak.",
        onTimeHistory: "Zamanında teslim geçmişi tekrar sipariş ihtimalini güçlendiriyor.",
        title: "Müşteri İlişkisi",
        trust: "Güven",
      },
      sidebar: {
        changeFilterAria: "Filtreyi değiştir",
        openOffers: (count: number) => `${count} açık teklif`,
      },
      tierEmpty: {
        body: "Motor, oyuncu seviyene ve üretim kapasitesine uygun yeni teklifleri vardiya ilerledikçe oluşturacak.",
        title: (tier: string) => `Açık ${tier} teklifi yok`,
      },
    },
  },
  en: {
    filters: {
      BASIC: {
        description: "Easy production, high quantity, lower XP serial production jobs.",
        hint: "LEVEL 1 · Serial production",
        label: "Basic",
      },
      STANDARD: {
        description: "Second-tier jobs with print, embroidery, dyeing, washing, or outsourcing.",
        hint: "LEVEL 5 · Extra process",
        label: "Standard",
      },
      PREMIUM: {
        description: "Higher production load, stronger quality expectations, and third-tier XP.",
        hint: "LEVEL 20 · High quality",
        label: "Premium",
      },
      LUXURY: {
        description: "Low quantity, high price, high profit, and the highest XP tier.",
        hint: "LEVEL 50 · Peak tier",
        label: "Luxury",
      },
    },
    service: {
      activeOrderFallbackCustomer: "Customer",
      acceptPlan: {
        cuttingStart: (day: number) => `Cutting can start on day ${day}`,
        materialReady: (day: number) => `Fabric and trims are in stock on day ${day}`,
        productionOrder: (count: number) => `${count} production orders will be prepared`,
      },
      capacityState: {
        BALANCED: "Balanced",
        CRITICAL: "Critical",
        NO_CAPACITY: "No line",
        RISKY: "Risky",
        SAFE: "Comfortable",
        STRETCH: "Busy",
      },
      customerStatus: {
        at_risk: "At risk",
        new: "New",
        trusted: "Trusted",
        warm: "Warm",
      },
      days: (value: string) => `${value} days`,
      deadlineDays: (value: number) => `${value} day deadline`,
      estimatedDays: (value: string) => `${value} day estimate`,
      lineCount: (value: string) => `${value} lines`,
      noBottleneck: "No bottleneck",
      noLine: "No line",
      noLineInfo: "Line info unavailable",
      noPlannedLine: "No planned line",
      offerType: {
        EXPRESS: "Express",
        NORMAL: "Normal",
        OPPORTUNITY: "Opportunity",
        REPEAT: "RPT",
      },
      pieces: (value: string) => `${value} pcs`,
      pointsPerDay: (value: string) => `${value} pts/day`,
      repeatEligible: "RPT eligible",
      repeatPending: "RPT pending",
    },
    ui: {
      acceptPlan: {
        cutting: "Cutting",
        material: "Stock",
        production: "Production",
        title: "Acceptance Plan",
      },
      acceptButton: {
        idle: "Accept Order",
        pending: "Preparing...",
      },
      activeOrders: {
        empty: "No active production orders.",
        remaining: (value: string) => `${value} pcs`,
        targetDay: (day: number) => `Day ${day}`,
        title: "Active Production",
        workCount: (count: number) => `${count} jobs`,
      },
      capacity: {
        bottleneck: "Bottleneck",
        current: "Current",
        deadline: "Deadline",
        hiddenDepartments: (count: number) => `+${count} more departments.`,
        offer: "Offer",
        plannedLoad: "Planned Load",
        prediction: "Estimate",
        risk: "Capacity risk",
        targetAfter: "After",
      },
      carousel: {
        ariaLabel: "Collection product navigator",
        itemAria: (index: number, name: string) => `Item ${index}: ${name}`,
        nextAria: "Next collection product",
        previousAria: "Previous collection product",
        title: "Collection Item",
      },
      collectionItemsTitle: "Collection Items",
      colorDistributionTitle: "Color Distribution",
      cost: {
        capacityRisk: "Capacity risk",
        deliveryRisk: "Delivery risk",
        itemCost: "Item Cost",
        itemProfit: "Item Profit",
        itemTotal: "Item Total",
        margin: "Planned Margin",
        planTitle: "Cost Plan",
        totalCost: "Total Cost",
        totalProfit: "Total Profit",
        totalRevenue: "Total Revenue",
        unitCost: "Unit Cost",
        unitPrice: "Unit Price",
        unitProfit: "Unit Profit",
      },
      detail: {
        emptyItem: "This offer has no product item.",
        expires: (day: number) => `Expires: day ${day}`,
        selectedOrder: "Selected Order",
      },
      empty: {
        market: "Order Market",
        noOffers: "New offers will appear in matching product tiers as shifts advance.",
        offersAvailable: (count: number) =>
          `${count} open offers are grouped by product tier.`,
        selectTier: "Choose a product tier",
      },
      list: {
        collection: (count: number) => `Collection · ${count} products`,
        delivery: (day: number) => `Delivery: day ${day}`,
        noOffersInTier: "No offers in this tier.",
      },
      locked: {
        body: (currentLevel: number) =>
          `Your current level is LEVEL ${currentLevel}. Once you reach this level, matching products and customers tied to this tier will start sending orders.`,
        title: (tier: string, minimumLevel: number) =>
          `${tier} orders require LEVEL ${minimumLevel}`,
        eyebrow: "Locked Product Tier",
      },
      marketTitle: "Order Market",
      metrics: {
        code: "Code",
        colors: "Color",
        delivery: "Delivery",
        quantity: "Qty",
        route: "Route",
        segment: "Segment",
        variants: (count: number) => `${count} variants`,
        volume: "Volume",
      },
      relationship: {
        completedWork: (count: number) => `${count} jobs`,
        history: "History",
        lateSummary: (lateCount: number, totalLateDays: number) =>
          `${lateCount} late deliveries caused ${totalLateDays} total days of trust loss.`,
        newCustomer: "New customer",
        noHistory: "Trust and RPT chance will form after the first delivery performance.",
        onTimeHistory: "On-time delivery history strengthens repeat order chance.",
        title: "Customer Relationship",
        trust: "Trust",
      },
      sidebar: {
        changeFilterAria: "Change filter",
        openOffers: (count: number) => `${count} open offers`,
      },
      tierEmpty: {
        body: "The engine will create new offers that match your level and production capacity as shifts advance.",
        title: (tier: string) => `No open ${tier} offers`,
      },
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    filters: Record<ProductTier, {
      description: string;
      hint: string;
      label: string;
    }>;
    service: {
      activeOrderFallbackCustomer: string;
      acceptPlan: {
        cuttingStart: (day: number) => string;
        materialReady: (day: number) => string;
        productionOrder: (count: number) => string;
      };
      capacityState: Record<OrderOfferCapacityState, string>;
      customerStatus: Record<RelationshipStatus, string>;
      days: (value: string) => string;
      deadlineDays: (value: number) => string;
      estimatedDays: (value: string) => string;
      lineCount: (value: string) => string;
      noBottleneck: string;
      noLine: string;
      noLineInfo: string;
      noPlannedLine: string;
      offerType: Record<MarketOrderOfferType, string>;
      pieces: (value: string) => string;
      pointsPerDay: (value: string) => string;
      repeatEligible: string;
      repeatPending: string;
    };
    ui: {
      acceptPlan: {
        cutting: string;
        material: string;
        production: string;
        title: string;
      };
      acceptButton: {
        idle: string;
        pending: string;
      };
      activeOrders: {
        empty: string;
        remaining: (value: string) => string;
        targetDay: (day: number) => string;
        title: string;
        workCount: (count: number) => string;
      };
      capacity: {
        bottleneck: string;
        current: string;
        deadline: string;
        hiddenDepartments: (count: number) => string;
        offer: string;
        plannedLoad: string;
        prediction: string;
        risk: string;
        targetAfter: string;
      };
      carousel: {
        ariaLabel: string;
        itemAria: (index: number, name: string) => string;
        nextAria: string;
        previousAria: string;
        title: string;
      };
      collectionItemsTitle: string;
      colorDistributionTitle: string;
      cost: {
        capacityRisk: string;
        deliveryRisk: string;
        itemCost: string;
        itemProfit: string;
        itemTotal: string;
        margin: string;
        planTitle: string;
        totalCost: string;
        totalProfit: string;
        totalRevenue: string;
        unitCost: string;
        unitPrice: string;
        unitProfit: string;
      };
      detail: {
        emptyItem: string;
        expires: (day: number) => string;
        selectedOrder: string;
      };
      empty: {
        market: string;
        noOffers: string;
        offersAvailable: (count: number) => string;
        selectTier: string;
      };
      list: {
        collection: (count: number) => string;
        delivery: (day: number) => string;
        noOffersInTier: string;
      };
      locked: {
        body: (currentLevel: number) => string;
        title: (tier: string, minimumLevel: number) => string;
        eyebrow: string;
      };
      marketTitle: string;
      metrics: {
        code: string;
        colors: string;
        delivery: string;
        quantity: string;
        route: string;
        segment: string;
        variants: (count: number) => string;
        volume: string;
      };
      relationship: {
        completedWork: (count: number) => string;
        history: string;
        lateSummary: (lateCount: number, totalLateDays: number) => string;
        newCustomer: string;
        noHistory: string;
        onTimeHistory: string;
        title: string;
        trust: string;
      };
      sidebar: {
        changeFilterAria: string;
        openOffers: (count: number) => string;
      };
      tierEmpty: {
        body: string;
        title: (tier: string) => string;
      };
    };
  }
>;

export type OrdersCopy = (typeof ordersCopy)[SupportedLocale];

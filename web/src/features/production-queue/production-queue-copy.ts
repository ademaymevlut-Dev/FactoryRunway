import type {
  OutsourceOptionType,
  RouteProgressStatus,
} from "@/generated/prisma/enums";
import type { SupportedLocale } from "@/lib/i18n/locales";

import type {
  ProductionQueueTone,
  ProductionQueueUpstreamWaitKind,
} from "./types";

export const productionQueueCopy = {
  tr: {
    service: {
      actionLabel: {
        cutting: "Kesime",
        dyeing: "Boyamaya",
        embroidery: "Nakışa",
        ironing_packing: "Ütü-pakete",
        printing: "Baskıya",
        sewing: "Dikime",
        washing: "Yıkamaya",
        fallback: "Üretime",
      },
      completedColumn: {
        cutting: "Kesilen",
        dyeing: "Boyanan",
        embroidery: "Nakış",
        ironing_packing: "İşlenen",
        printing: "Baskı",
        sewing: "Dikilen",
        washing: "Yıkanan",
        fallback: "İşlenen",
      },
      customerFallback: "Müşteri",
      delivery: {
        delayed: (days: number) => `${days} gün gecikti`,
        dueToday: "Bugün teslim",
        remaining: (days: number) => `${days} gün kaldı`,
      },
      firstStartOutsource: "Fason seçimi bekliyor",
      noLine: "Hat yok",
      outsourceOption: {
        FAST: {
          description: "Hızlı teslim, daha yüksek fiyat",
          label: "FAST",
          tone: "warning",
        },
        SAFE: {
          description: "Uzun teslim, daha uygun fiyat",
          label: "SAFE",
          tone: "success",
        },
        STANDARD: {
          description: "Dengeli süre ve standart fiyat",
          label: "STANDARD",
          tone: "info",
        },
      },
      pointPerUnit: (value: string) => `${value} puan/adet`,
      pointsPerDay: (value: string) => `${value} puan/gün`,
      quantity: (value: string) => `${value} adet`,
      queueStart: {
        today: (actionLabel: string) => `${actionLabel} bugün`,
        later: (actionLabel: string, days: number) =>
          `${actionLabel} ${days} gün sonra`,
      },
      returnDayClosing: (day: number) => `${day}. gün kapanışı`,
      returns: {
        today: "Bugün kapanışta döner",
        later: (days: number) => `${days} gün sonra döner`,
      },
      status: {
        BLOCKED: "Blokeli",
        COMPLETED: "Tamamlandı",
        IN_PROGRESS: "İşlemde",
        READY: "Hazır",
        SKIPPED: "Atlandı",
        WAITING_INPUT: "Girdi bekliyor",
        WAITING_OUTSOURCE: "Fason bekliyor",
      },
      statusOutsourceInProgress: "Fasonda",
      statusOutsourcePaymentPending: "Ödeme bekliyor",
      unitCost: (value: string) => `${value} / adet`,
    },
    ui: {
      empty: {
        body: "Hazır iş geldiğinde üretim önceliği burada sürüklenebilir liste olarak açılır.",
        noQueue: "Üretim kuyruğu bulunamadı.",
        title: (department: string) => `${department} kuyruğu boş`,
        upstreamWait: {
          cutting: {
            body: (department: string) =>
              `Kesim tamamlandığında ürünler ${department} kuyruğunda görünecek.`,
            title: "Ürünlerin kesimi bekleniyor",
          },
          sewing: {
            body: (department: string) =>
              `Dikim tamamlandığında ürünler ${department} kuyruğunda görünecek.`,
            title: "Ürünlerin dikimi bekleniyor",
          },
        },
      },
      header: {
        dayPriority: (day: number) => `${day}. gün vardiya öncesi öncelik`,
        invest: "Yatırım Yap",
        messageSaved: (department: string) =>
          `${department} iş yükü önceliği kaydedildi.`,
        saving: "İş yükü önceliği kaydediliyor...",
        summary: (nextDelivery: string, firstStart: string) =>
          `En yakın termin: ${nextDelivery} · İlk iş: ${firstStart}`,
        title: (department: string) => `${department} Kuyruğu`,
        workCount: (count: number) => `${count} iş`,
      },
      outsource: {
        compactButton: "Fason",
        dialogTitle: "Fason Üretim Teklifleri",
        internalRemaining: (value: string) => `İç hatta kalır: ${value} adet`,
        invalidQuantity: (value: string) =>
          `1 ile ${value} arasında adet girin.`,
        processing: (label: string) => `${label} fason teklifi işleniyor...`,
        quantityHelp: (value: string) =>
          `En fazla ${value}. Kalan miktar iç hat kuyruğunda üretime devam eder.`,
        quantityLabel: "Fasona ayrılacak miktar",
        selectedQuantity: (value: string) => `Fason: ${value} adet`,
        trigger: "Teklifler",
      },
      sections: {
        internalQueue: "İç Hat Kuyruğu",
        outsourceCandidates: "Fason Teklifi Bekleyen",
        outsourceJobs: "Fasonda",
      },
      summary: {
        completedSuffix: (label: string) => `${label} adet`,
        dailyPoints: "Puan/gün",
        inputReady: "Kuyruğa Giren",
        planned: "Bugün Planlanan",
        plannedShort: "Planlanan",
        quantity: (value: string) => `${value} adet`,
        remaining: "Kalan",
        remainingQuantity: "Kalan adet",
      },
      table: {
        completed: "Tamamlanan",
        due: "Termin",
        inputReady: "Kuyruğa Giren",
        planned: "Planlanan",
        priority: "Sıra",
        productOrder: "Ürün / Sipariş",
        queueStart: "Başlama",
        remaining: "Kalan",
      },
      row: {
        hideDetails: (orderNo: string) => `${orderNo} detaylarını gizle`,
        internalMode: "İç Hat",
        manualPriority: "Manuel sıra",
        orderSummary: (quantity: string, productionNo: string) =>
          `Sipariş: ${quantity} · ${productionNo}`,
        showDetails: (orderNo: string) => `${orderNo} detaylarını göster`,
      },
      readyDay: (day: number) => `${day}. gün`,
    },
  },
  en: {
    service: {
      actionLabel: {
        cutting: "Cutting",
        dyeing: "Dyeing",
        embroidery: "Embroidery",
        ironing_packing: "IR & Pack",
        printing: "Printing",
        sewing: "Sewing",
        washing: "Washing",
        fallback: "Production",
      },
      completedColumn: {
        cutting: "Cut",
        dyeing: "Dyed",
        embroidery: "Embroidery",
        ironing_packing: "Processed",
        printing: "Printed",
        sewing: "Sewn",
        washing: "Washed",
        fallback: "Processed",
      },
      customerFallback: "Customer",
      delivery: {
        delayed: (days: number) => `${days} days late`,
        dueToday: "Due today",
        remaining: (days: number) => `${days} days left`,
      },
      firstStartOutsource: "Waiting for outsourcing choice",
      noLine: "No line",
      outsourceOption: {
        FAST: {
          description: "Fast delivery, higher price",
          label: "FAST",
          tone: "warning",
        },
        SAFE: {
          description: "Longer delivery, lower price",
          label: "SAFE",
          tone: "success",
        },
        STANDARD: {
          description: "Balanced timing and standard price",
          label: "STANDARD",
          tone: "info",
        },
      },
      pointPerUnit: (value: string) => `${value} pts/unit`,
      pointsPerDay: (value: string) => `${value} pts/day`,
      quantity: (value: string) => `${value} pcs`,
      queueStart: {
        today: (actionLabel: string) => `${actionLabel} today`,
        later: (actionLabel: string, days: number) =>
          `${actionLabel} in ${days} days`,
      },
      returnDayClosing: (day: number) => `End of day ${day}`,
      returns: {
        today: "Returns at closing today",
        later: (days: number) => `Returns in ${days} days`,
      },
      status: {
        BLOCKED: "Blocked",
        COMPLETED: "Completed",
        IN_PROGRESS: "In progress",
        READY: "Ready",
        SKIPPED: "Skipped",
        WAITING_INPUT: "Waiting input",
        WAITING_OUTSOURCE: "Waiting outsource",
      },
      statusOutsourceInProgress: "Outsourced",
      statusOutsourcePaymentPending: "Payment pending",
      unitCost: (value: string) => `${value} / pc`,
    },
    ui: {
      empty: {
        body: "When ready work arrives, production priority will appear here as a draggable list.",
        noQueue: "Production queue not found.",
        title: (department: string) => `${department} queue is empty`,
        upstreamWait: {
          cutting: {
            body: (department: string) =>
              `Products will appear in the ${department} queue once cutting is complete.`,
            title: "Waiting for cutting to finish",
          },
          sewing: {
            body: (department: string) =>
              `Products will appear in the ${department} queue once sewing is complete.`,
            title: "Waiting for sewing to finish",
          },
        },
      },
      header: {
        dayPriority: (day: number) => `Pre-shift priority for day ${day}`,
        invest: "Invest",
        messageSaved: (department: string) =>
          `${department} workload priority saved.`,
        saving: "Saving workload priority...",
        summary: (nextDelivery: string, firstStart: string) =>
          `Nearest deadline: ${nextDelivery} · First job: ${firstStart}`,
        title: (department: string) => `${department} Queue`,
        workCount: (count: number) => `${count} jobs`,
      },
      outsource: {
        compactButton: "Outsource",
        dialogTitle: "Outsource Production Offers",
        internalRemaining: (value: string) => `Stays internal: ${value} pcs`,
        invalidQuantity: (value: string) =>
          `Enter a quantity between 1 and ${value}.`,
        processing: (label: string) => `Processing ${label} outsource offer...`,
        quantityHelp: (value: string) =>
          `Maximum ${value}. The remaining quantity continues in the internal queue.`,
        quantityLabel: "Quantity to outsource",
        selectedQuantity: (value: string) => `Outsource: ${value} pcs`,
        trigger: "Offers",
      },
      sections: {
        internalQueue: "Internal Line Queue",
        outsourceCandidates: "Waiting for Outsource Offer",
        outsourceJobs: "Outsourced",
      },
      summary: {
        completedSuffix: (label: string) => `${label} pcs`,
        dailyPoints: "Pts/day",
        inputReady: "Entered Queue",
        planned: "Planned Today",
        plannedShort: "Planned",
        quantity: (value: string) => `${value} pcs`,
        remaining: "Remaining",
        remainingQuantity: "Remaining qty",
      },
      table: {
        completed: "Completed",
        due: "Due",
        inputReady: "Entered Queue",
        planned: "Planned",
        priority: "Rank",
        productOrder: "Product / Order",
        queueStart: "Start",
        remaining: "Remaining",
      },
      row: {
        hideDetails: (orderNo: string) => `Hide ${orderNo} details`,
        internalMode: "Internal Line",
        manualPriority: "Manual order",
        orderSummary: (quantity: string, productionNo: string) =>
          `Order: ${quantity} · ${productionNo}`,
        showDetails: (orderNo: string) => `Show ${orderNo} details`,
      },
      readyDay: (day: number) => `Day ${day}`,
    },
  },
} as const satisfies Record<
  SupportedLocale,
  {
    service: {
      actionLabel: Record<
        | "cutting"
        | "dyeing"
        | "embroidery"
        | "ironing_packing"
        | "printing"
        | "sewing"
        | "washing"
        | "fallback",
        string
      >;
      completedColumn: Record<
        | "cutting"
        | "dyeing"
        | "embroidery"
        | "ironing_packing"
        | "printing"
        | "sewing"
        | "washing"
        | "fallback",
        string
      >;
      customerFallback: string;
      delivery: {
        delayed: (days: number) => string;
        dueToday: string;
        remaining: (days: number) => string;
      };
      firstStartOutsource: string;
      noLine: string;
      outsourceOption: Record<
        OutsourceOptionType,
        { description: string; label: string; tone: ProductionQueueTone }
      >;
      pointPerUnit: (value: string) => string;
      pointsPerDay: (value: string) => string;
      quantity: (value: string) => string;
      queueStart: {
        today: (actionLabel: string) => string;
        later: (actionLabel: string, days: number) => string;
      };
      returnDayClosing: (day: number) => string;
      returns: {
        today: string;
        later: (days: number) => string;
      };
      status: Record<RouteProgressStatus, string>;
      statusOutsourceInProgress: string;
      statusOutsourcePaymentPending: string;
      unitCost: (value: string) => string;
    };
    ui: {
      empty: {
        body: string;
        noQueue: string;
        title: (department: string) => string;
        upstreamWait: Record<
          ProductionQueueUpstreamWaitKind,
          {
            body: (department: string) => string;
            title: string;
          }
        >;
      };
      header: {
        dayPriority: (day: number) => string;
        invest: string;
        messageSaved: (department: string) => string;
        saving: string;
        summary: (nextDelivery: string, firstStart: string) => string;
        title: (department: string) => string;
        workCount: (count: number) => string;
      };
      outsource: {
        compactButton: string;
        dialogTitle: string;
        internalRemaining: (value: string) => string;
        invalidQuantity: (value: string) => string;
        processing: (label: string) => string;
        quantityHelp: (value: string) => string;
        quantityLabel: string;
        selectedQuantity: (value: string) => string;
        trigger: string;
      };
      sections: {
        internalQueue: string;
        outsourceCandidates: string;
        outsourceJobs: string;
      };
      summary: {
        completedSuffix: (label: string) => string;
        dailyPoints: string;
        inputReady: string;
        planned: string;
        plannedShort: string;
        quantity: (value: string) => string;
        remaining: string;
        remainingQuantity: string;
      };
      table: {
        completed: string;
        due: string;
        inputReady: string;
        planned: string;
        priority: string;
        productOrder: string;
        queueStart: string;
        remaining: string;
      };
      row: {
        hideDetails: (orderNo: string) => string;
        internalMode: string;
        manualPriority: string;
        orderSummary: (quantity: string, productionNo: string) => string;
        showDetails: (orderNo: string) => string;
      };
      readyDay: (day: number) => string;
    };
  }
>;

export type ProductionQueueCopy = (typeof productionQueueCopy)[SupportedLocale];

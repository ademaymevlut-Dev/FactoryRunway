import type { ProductionQueueSceneCopy } from "./production-queue-scene-types";

export const productionQueueSceneCopyTr = {
  calloutRailLabel: "Üretim kuyruğu anlatım adımları",
  callouts: [
    {
      description:
        "Siparişler departmanın günlük üretim planına göre yukarıdan aşağıya işlenir.",
      id: "queue-callout-list",
      number: "01",
      target: "production-queue-list",
      title: "Departmanın iş sırasını gör",
    },
    {
      description:
        "Her siparişin bu departmanda tamamlanması gereken kalan üretim miktarını gösterir.",
      id: "queue-callout-remaining",
      number: "02",
      target: "queue-remaining",
      title: "Kalan miktarı karşılaştır",
    },
    {
      description:
        "Mevcut kapasitenin bugün hangi siparişe ayrıldığını gösterir.",
      id: "queue-callout-planned",
      number: "03",
      target: "queue-planned",
      title: "Günün üretim planını incele",
    },
    {
      description:
        "Teslim süresi azalan siparişleri üst sıraya alarak gecikme riskini azalt.",
      id: "queue-callout-delivery",
      number: "04",
      target: "queue-delivery-risk",
      title: "Teslim riskini önceliklendir",
    },
    {
      description:
        "Sürükle-bırak ile departmanın hangi sipariş üzerinde önce çalışacağını belirlersin.",
      id: "queue-callout-drag",
      number: "05",
      target: "queue-drag-handle",
      title: "Siparişi üst sıraya taşı",
    },
    {
      description:
        "Yeni öncelik sırası günlük planlanan üretim adetlerini günceller.",
      id: "queue-callout-updated",
      number: "06",
      target: "queue-updated-plan",
      title: "Planın yeniden hesaplanır",
    },
  ],
  categoryLabel: "Kategori",
  colorsLabel: "Aktif Renkler",
  completedLabel: "Tamamlanan",
  dayUnitLabel: "gün",
  departmentLabel: "Departman",
  inputReadyLabel: "Hazır Girdi",
  liveReorderMessage: "SPORTISE siparişi birinci sıraya taşındı.",
  notificationDescription:
    "SPORTISE siparişi Dikim kuyruğunda birinci sıraya taşındı.",
  notificationTitle: "Üretim önceliği güncellendi",
  outsourceBadgeLabel: "Baskı işlemi fasona gönderilebilir",
  pieceUnitLabel: "adet",
  plannedLabel: "Planlanan",
  plannedSummaryLabel: "Planlanan günlük üretim",
  priorityLabel: "Öncelik",
  productTypeLabel: "Ürün Tipi",
  queueDescription: "Günün kontrollü üretim sırası",
  queueLabel: "Üretim Kuyruğu",
  queueListAriaLabel: "Dikim departmanı üretim kuyruğu",
  remainingLabel: "Kalan",
  replayLabel: "Sahneyi Yeniden Oynat",
  routeLabel: "Üretim Rotası",
  sectionDescription:
    "Teslim süresi, kalan miktar ve departman iş yükünü karşılaştır. Siparişleri önceliklendirerek günün üretim planını yeniden düzenle.",
  sectionEyebrow: "ÜRETİM PLANLAMA",
  sectionTitle:
    "Üretim sırasını değiştir, kapasiteni doğru siparişe yönlendir.",
  statuses: {
    material_waiting: "Malzeme Bekliyor",
    outsourcing_available: "Fason Seçeneği",
    ready: "Hazır",
    urgent: "Acil",
  },
  warningLabels: {
    DELIVERY_RISK: "Teslim Riski",
  },
  workloadLabel: "Toplam İş Yükü",
  workloadUnitLabel: "puan / adet",
} as const satisfies ProductionQueueSceneCopy;

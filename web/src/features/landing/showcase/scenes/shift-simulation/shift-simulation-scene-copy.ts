import type { ShiftSimulationSceneCopy } from "./shift-simulation-scene-types";

export const shiftSimulationSceneCopyTr = {
  acceleratedLabel: "Hızlandırılmış vardiya gösterimi",
  activeLineLabel: "1 hat",
  actualLabel: "Gerçekleşen",
  bottleneckSummary:
    "Dikim departmanı planlanan üretimin 30 adet altında kaldı.",
  calloutRailLabel: "Vardiya simülasyonu anlatım adımları",
  callouts: [
    {
      description:
        "Her departman planlanan iş emirleri ve mevcut kapasitesiyle vardiyaya başlar.",
      id: "shift-callout-start",
      number: "01",
      target: "shift-start",
      title: "Vardiya planını çalıştır",
    },
    {
      description:
        "08:00–17:00 arasındaki üretim ilerlemesini ve departman sonuçlarını canlı olarak izle.",
      id: "shift-callout-progress",
      number: "02",
      target: "shift-progress",
      title: "Vardiyayı anlık takip et",
    },
    {
      description:
        "Her departmanın mevcut kapasite ve iş yüküne göre bugün tamamlaması beklenen miktarı gösterir.",
      id: "shift-callout-planned",
      number: "03",
      target: "shift-planned",
      title: "Planlanan adetleri karşılaştır",
    },
    {
      description:
        "Makine arızaları ve personel kayıpları vardiya kapasitesini ve gerçekleşen üretimi değiştirebilir.",
      id: "shift-callout-event",
      number: "04",
      target: "shift-event",
      title: "Beklenmeyen olayları yönet",
    },
    {
      description:
        "Dikim departmanındaki kapasite kaybı, planlanan 120 adet üretimin 90 adette kalmasına neden oldu.",
      id: "shift-callout-bottleneck",
      number: "05",
      target: "shift-bottleneck",
      title: "Darboğazı tespit et",
    },
    {
      description:
        "Planlanan ve gerçekleşen üretimi karşılaştırarak sonraki vardiyanın önceliklerini belirle.",
      id: "shift-callout-summary",
      number: "06",
      target: "shift-summary",
      title: "Sonuçları değerlendir",
    },
  ],
  categoryLabel: "Kategori",
  colorsLabel: "Aktif Renkler",
  completedButtonLabel: "Vardiya Tamamlandı",
  completionLiveMessage:
    "Vardiya tamamlandı. 96 BACKHAM ürünü ürün deposuna aktarıldı.",
  dayUnitLabel: "gün",
  differenceLabel: "Fark",
  eventCopies: {
    SEWING_MACHINE_BREAKDOWN: {
      categoryLabel: "Makine",
      description:
        "Makine arızası nedeniyle Dikim departmanının vardiya kapasitesi %25 azaldı.",
      liveMessage:
        "Dikim hattında makine arızası oluştu. Kapasite yüzde 25 azaldı.",
      title: "Dikim hattında makine arızası",
    },
  },
  eventPanelTitle: "Günün Olayları",
  eventWaitingLabel: "Vardiya sırasında oluşan olaylar burada görünür.",
  finishedGoodsLabel: "Ürün Deposuna Aktarılan",
  inputLabel: "Girdi",
  notificationDescription:
    "96 BACKHAM ürünü ürün deposuna aktarıldı. Dikim departmanı planın 30 adet altında kaldı.",
  notificationTitle: "Vardiya tamamlandı",
  pieceUnitLabel: "adet",
  plannedLabel: "Planlanan",
  processedProductsLabel: "Departman Çıktısı",
  productTypeLabel: "Ürün Tipi",
  progressAriaLabel: "Vardiya ilerlemesi",
  progressLabel: "Vardiya İlerlemesi",
  replayLabel: "Tekrar Oynat",
  routeLabel: "Üretim Rotası",
  runningButtonLabel: "Vardiya Çalışıyor",
  sectionDescription:
    "Vardiya başladığında her departman mevcut iş emirleri ve kapasitesiyle üretime geçer. Personel kaybı, makine arızası ve darboğazlar planlanan üretim ile gerçekleşen sonucu değiştirebilir.",
  sectionEyebrow: "VARDİYA SİMÜLASYONU",
  sectionTitle: "Planını çalıştır, fabrikanın gerçek sonucunu gör.",
  startButtonLabel: "Vardiyayı Başlat",
  statuses: {
    bottleneck: "Darboğaz",
    on_plan: "Planla Uyumlu",
    under_plan: "Planın Altında",
  },
  summaryDescription:
    "Departman sonuçlarını karşılaştır, darboğazları incele ve bir sonraki vardiyanın planını buna göre düzenle.",
  summaryPendingLabel: "Vardiya tamamlandığında sonuç özeti burada açılır.",
  summaryTitle: "Gün Sonu Üretim Özeti",
  utilizationLabel: "Kapasite Kullanımı",
  wipNotice:
    "Departmanlar vardiyaya mevcut yarı mamul stoklarıyla başlar. Bugün tamamlanan işler sonraki departmana bir sonraki iş gününde aktarılır.",
  workloadLabel: "Toplam İş Yükü",
  workloadUnitLabel: "puan / adet",
} as const satisfies ShiftSimulationSceneCopy;

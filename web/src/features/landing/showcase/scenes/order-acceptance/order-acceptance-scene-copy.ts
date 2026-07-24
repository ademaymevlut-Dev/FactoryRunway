import type { OrderAcceptanceSceneCopy } from "./order-acceptance-scene-types";

export const orderAcceptanceSceneCopyTr = {
  sectionEyebrow: "SİPARİŞ YÖNETİMİ",
  sectionTitle: "Her siparişi üretime almadan önce değerlendir.",
  sectionDescription:
    "Miktarı, teslim süresini, renk dağılımını ve üretim rotasını incele. Fabrikanın kapasitesine uygun siparişleri kabul ederek üretim planını oluştur.",
  listTitle: "Açık Sipariş Teklifleri",
  listDescription: "Üretime alınacak teklifi operasyon yüküyle birlikte incele.",
  orderListAriaLabel: "Açık sipariş teklifleri",
  selectedOfferLabel: "Seçili teklif",
  quantityLabel: "Sipariş Adedi",
  deliveryLabel: "Teslim Süresi",
  revenueLabel: "Toplam Gelir",
  unitPriceLabel: "Birim Fiyat",
  colorsLabel: "Renk Dağılımı",
  routeLabel: "Üretim Rotası",
  categoryLabel: "Kategori",
  productTypeLabel: "Ürün Tipi",
  dayUnitLabel: "gün",
  pieceUnitLabel: "adet",
  workloadUnitLabel: "iş puanı/adet",
  outsourceLabel: "Fason",
  acceptButton: "Siparişi Kabul Et",
  acceptedButton: "Üretim Planına Eklendi",
  acceptedNotificationTitle: "Sipariş kabul edildi",
  acceptedNotificationDescription:
    "CLAVIER siparişi üretim planına eklendi.",
  replayLabel: "Tekrar Oynat",
  calloutRailLabel: "Sipariş inceleme adımları",
  callouts: [
    {
      id: "callout-offer-list",
      number: "01",
      target: "order-offer-list",
      title: "Teklifleri karşılaştır",
      description:
        "Müşteri, ürün, miktar ve teslim süresine göre gelen teklifleri değerlendir.",
    },
    {
      id: "callout-quantity",
      number: "02",
      target: "order-quantity",
      title: "Üretim yükünü kontrol et",
      description:
        "Sipariş adedi fabrikanın departmanlarında oluşacak toplam iş yükünü belirler.",
    },
    {
      id: "callout-delivery",
      number: "03",
      target: "order-delivery",
      title: "Teslim riskini değerlendir",
      description:
        "Kalan iş günü, siparişin mevcut kapasiteyle zamanında tamamlanıp tamamlanamayacağını gösterir.",
    },
    {
      id: "callout-colors",
      number: "04",
      target: "order-colors",
      title: "Renk dağılımını incele",
      description:
        "Toplam sipariş miktarı ürünün seçili renkleri arasında üretim adetlerine bölünür.",
    },
    {
      id: "callout-route",
      number: "05",
      target: "order-route",
      title: "Üretim adımlarını gör",
      description:
        "Her ürün kesimden sevkiyata kadar kendine ait departman rotasını ve iş yükünü taşır.",
    },
    {
      id: "callout-accept",
      number: "06",
      target: "order-accept",
      title: "Siparişi üretim planına ekle",
      description:
        "Kabul edilen sipariş departman kuyruklarına ve üretim planına aktarılır.",
    },
  ],
} as const satisfies OrderAcceptanceSceneCopy;

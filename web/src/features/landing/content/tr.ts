import type { LandingContent } from "./types";

export const landingContentTr = {
  accessibility: {
    skipToContent: "Ana içeriğe geç",
  },
  auth: {
    accountCardDescription:
      "Google hesabınla tek tıkla giriş yap veya mevcut Factory Runway hesabınla devam et.",
    accountCardEyebrow: "PLAYER ACCESS",
    accountCardTitle: "Fabrikanın kontrol paneli hazır.",
    description:
      "Oyuncu hesabını oluştur, başlangıç fabrikanı kur ve ilk sipariş tekliflerini değerlendirmeye başla.",
    emailLabel: "E-posta",
    emailPlaceholder: "player@factoryrunway.com",
    emailDivider: "veya e-posta ile devam et",
    eyebrow: "FABRİKANI KURMAYA BAŞLA",
    googleButton: "Google ile devam et",
    loginButton: "Giriş Yap",
    loginTab: "Giriş Yap",
    messages: {
      ACCOUNT_CREATED: "Oyuncu hesabın oluşturuldu.",
      EMAIL_ALREADY_EXISTS: "Bu e-posta zaten kullanılıyor.",
      INVALID_CREDENTIALS: "E-posta veya şifre hatalı.",
      INVALID_EMAIL: "Geçerli bir e-posta gir.",
      INVALID_ROLE: "Admin rolü geçersiz.",
      NAME_TOO_SHORT: "Oyuncu adı en az 2 karakter olmalı.",
      PASSWORD_REQUIRED: "Şifre gerekli.",
      PASSWORD_TOO_SHORT: "Şifre en az 8 karakter olmalı.",
      UNAUTHORIZED: "Bu işlem için yetkin bulunmuyor.",
      UNKNOWN_ERROR: "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.",
      VALIDATION_ERROR: "Lütfen işaretli alanları kontrol et.",
    },
    nameLabel: "Oyuncu adı",
    namePlaceholder: "Oyuncu adın",
    passwordLabel: "Şifre",
    passwordPlaceholder: "En az 8 karakter",
    playerOnlyNotice:
      "Public kayıt yalnızca PLAYER hesabı açar. Fabrika adını güvenli onboarding akışında belirleyeceksin.",
    registerButton: "Oyuncu Hesabı Oluştur",
    registerTab: "Oyuncu Hesabı Oluştur",
    tabsAriaLabel: "Hesap işlemleri",
    title: "İlk üretim hattın seni bekliyor.",
  },
  footer: {
    copyright: "Factory Runway. Tüm hakları saklıdır.",
    description:
      "Siparişten sevkiyata kadar kendi tekstil fabrikanı yönet.",
    languageLabel: "Dil",
  },
  gameLoop: {
    description:
      "Doğru siparişi seç, departmanların iş sırasını belirle, vardiyayı çalıştır ve sonuçlara göre fabrikanın bir sonraki hamlesini planla.",
    eyebrow: "FABRİKANIN KONTROLÜ SENDE",
    steps: [
      {
        description:
          "Miktarı, teslim süresini, geliri ve üretim rotasını karşılaştır.",
        key: "orders",
        number: "01",
        title: "Siparişi değerlendir",
      },
      {
        description:
          "Departman kuyruklarını ve günlük üretim önceliklerini düzenle.",
        key: "planning",
        number: "02",
        title: "Üretimi planla",
      },
      {
        description:
          "Personel, kapasite ve beklenmeyen olayların üretime etkisini izle.",
        key: "shift",
        number: "03",
        title: "Vardiyayı çalıştır",
      },
      {
        description:
          "Darboğazları çöz, yeni hatlara yatırım yap ve fabrikanı büyüt.",
        key: "results",
        number: "04",
        title: "Sonuçları geliştir",
      },
    ],
    title: "Her karar üretim akışını değiştirir.",
  },
  hero: {
    description:
      "Factory Runway, sipariş seçiminden üretim kuyruklarına, vardiya sonuçlarından fabrika yatırımlarına kadar kendi tekstil fabrikanı yönettiğin detaylı bir iş simülasyonudur.",
    eyebrow: "FABRİKA YÖNETİM SİMÜLASYONU",
    primaryCta: "Fabrikanı Kur",
    secondaryCta: "Oynanışı İncele",
    title: "Siparişleri yönet. Üretimi planla. Fabrikanı büyüt.",
  },
  locale: "tr",
  metadata: {
    description:
      "Siparişleri değerlendir, üretim kuyruklarını planla, vardiyaları yönet ve kendi tekstil fabrikanı büyüt.",
    openGraphLocale: "tr_TR",
    title: "Factory Runway | Fabrika Yönetim Simülasyonu",
  },
  mobile: {
    heroTitle: "Kendi fabrikanı kur. Üretime başla.",
    loginTab: "Giriş Yap",
    registerTab: "Oyuncu Oluştur",
  },
  navigation: {
    ariaLabel: "Ana gezinme",
    gameplay: "Oynanış",
    howItWorks: "Nasıl Çalışır",
    languageLabel: "English",
    login: "Giriş Yap",
    register: "Fabrikanı Kur",
  },
  numberLocale: "tr-TR",
  showcase: {
    orderAcceptance: {
      acceptButton: "Siparişi Kabul Et",
      acceptedButton: "Üretim Planına Eklendi",
      acceptedNotificationDescription:
        "CLAVIER siparişi üretim planına eklendi.",
      acceptedNotificationTitle: "Sipariş kabul edildi",
      calloutRailLabel: "Sipariş inceleme adımları",
      callouts: [
        {
          description:
            "Müşteri, ürün, miktar ve teslim süresine göre gelen teklifleri değerlendir.",
          id: "callout-offer-list",
          number: "01",
          target: "order-offer-list",
          title: "Teklifleri karşılaştır",
        },
        {
          description:
            "Sipariş adedi fabrikanın departmanlarında oluşacak toplam iş yükünü belirler.",
          id: "callout-quantity",
          number: "02",
          target: "order-quantity",
          title: "Üretim yükünü kontrol et",
        },
        {
          description:
            "Kalan iş günü, siparişin mevcut kapasiteyle zamanında tamamlanıp tamamlanamayacağını gösterir.",
          id: "callout-delivery",
          number: "03",
          target: "order-delivery",
          title: "Teslim riskini değerlendir",
        },
        {
          description:
            "Toplam sipariş miktarı ürünün seçili renkleri arasında üretim adetlerine bölünür.",
          id: "callout-colors",
          number: "04",
          target: "order-colors",
          title: "Renk dağılımını incele",
        },
        {
          description:
            "Her ürün kesimden sevkiyata kadar kendine ait departman rotasını ve iş yükünü taşır.",
          id: "callout-route",
          number: "05",
          target: "order-route",
          title: "Üretim adımlarını gör",
        },
        {
          description:
            "Kabul edilen sipariş departman kuyruklarına ve üretim planına aktarılır.",
          id: "callout-accept",
          number: "06",
          target: "order-accept",
          title: "Siparişi üretim planına ekle",
        },
      ],
      categoryLabel: "Kategori",
      colorsLabel: "Renk Dağılımı",
      dayUnitLabel: "gün",
      deliveryLabel: "Teslim Süresi",
      listDescription:
        "Üretime alınacak teklifi operasyon yüküyle birlikte incele.",
      listTitle: "Açık Sipariş Teklifleri",
      orderListAriaLabel: "Açık sipariş teklifleri",
      outsourceLabel: "Fason",
      pieceUnitLabel: "adet",
      productTypeLabel: "Ürün Tipi",
      quantityLabel: "Sipariş Adedi",
      replayLabel: "Tekrar Oynat",
      revenueLabel: "Toplam Gelir",
      routeLabel: "Üretim Rotası",
      sectionDescription:
        "Miktarı, teslim süresini, renk dağılımını ve üretim rotasını incele. Fabrikanın kapasitesine uygun siparişleri kabul ederek üretim planını oluştur.",
      sectionEyebrow: "SİPARİŞ YÖNETİMİ",
      sectionTitle: "Her siparişi üretime almadan önce değerlendir.",
      selectedOfferLabel: "Seçili teklif",
      unitPriceLabel: "Birim Fiyat",
      workloadUnitLabel: "iş puanı/adet",
    },
    productionQueue: {
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
    },
    shiftSimulation: {
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
      eventWaitingLabel:
        "Vardiya sırasında oluşan olaylar burada görünür.",
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
      summaryPendingLabel:
        "Vardiya tamamlandığında sonuç özeti burada açılır.",
      summaryTitle: "Gün Sonu Üretim Raporu",
      utilizationLabel: "Kapasite Kullanımı",
      wipNotice:
        "Departmanlar vardiyaya mevcut yarı mamul stoklarıyla başlar. Bugün tamamlanan işler sonraki departmana bir sonraki iş gününde aktarılır.",
      workloadLabel: "Toplam İş Yükü",
      workloadUnitLabel: "puan / adet",
    },
  },
} as const satisfies LandingContent;

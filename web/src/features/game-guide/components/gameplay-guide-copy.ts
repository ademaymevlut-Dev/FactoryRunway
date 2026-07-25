import type { SupportedLocale } from "@/lib/i18n/locales";

export const GUIDE_SECTION_IDS = [
  "overview",
  "normal-flow",
  "outsource-flow",
  "bottleneck",
  "shift-check",
] as const;

export const BOTTLENECK_QUEUE_ITEMS = ["01", "02", "03", "04", "05", "06"] as const;

export type GuideSectionId = (typeof GUIDE_SECTION_IDS)[number];

export type FlowStep = {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  departmentImage: string;
  departmentAlt: string;
  productImage: string;
  productAlt: string;
  outputLabel: string;
  x: number;
  y: number;
  tone?: "cyan" | "amber";
  durationNote?: string;
};

export type ProductPreview = {
  alt: string;
  eyebrow: string;
  image: string;
  title: string;
};

type GuideCopy = {
  utility: {
    back: string;
    playerChip: string;
  };
  sections: Array<{
    id: GuideSectionId;
    label: string;
    shortLabel: string;
  }>;
  sectionRailAria: string;
  hero: {
    eyebrow: string;
    titlePrefix: string;
    titleEmphasis: string;
    description: string;
    action: string;
    motionHint: string;
  };
  routeChoices: Array<{
    accent: "amber" | "cyan";
    description: string;
    image: string;
    imageAlt: string;
    route: string;
    title: string;
  }>;
  stories: {
    bottleneck: {
      description: string;
      eyebrow: string;
      title: string;
    };
    normalFlow: {
      description: string;
      eyebrow: string;
      title: string;
    };
    outsourceFlow: {
      description: string;
      eyebrow: string;
      title: string;
      waitPrefix: string;
      waitBody: string;
    };
  };
  flowCard: {
    expandAria: (outputLabel: string) => string;
    outputKicker: string;
  };
  normalFlowSteps: FlowStep[];
  outsourceFlowSteps: FlowStep[];
  bottleneck: {
    stations: {
      cutting: {
        index: string;
        label: string;
        status: string;
        value: string;
      };
      sewing: {
        index: string;
        label: string;
        status: string;
        value: string;
      };
      ironPacking: {
        index: string;
        label: string;
        status: string;
        value: string;
      };
    };
    stationKind: string;
    queueTitle: string;
    queueCount: string;
    queueImageAlt: string;
    queueDescription: string;
    capacity: {
      cutting: string;
      sewing: string;
      solution: string;
    };
  };
  checklist: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      iconKey: "boxes" | "gauge" | "gitBranch" | "route";
      index: string;
      text: string;
      title: string;
    }>;
    finalTitle: string;
    finalBody: string;
    finalAction: string;
  };
  productPreview: {
    closeAria: string;
    hint: string;
  };
};

export const gameplayGuideCopy = {
  tr: {
    utility: {
      back: "Fabrikaya dön",
      playerChip: "Oyun Rehberi",
    },
    sections: [
      { id: "overview", label: "Başlangıç", shortLabel: "01" },
      { id: "normal-flow", label: "Normal rota", shortLabel: "02" },
      { id: "outsource-flow", label: "Fason rota", shortLabel: "03" },
      { id: "bottleneck", label: "Kuyruk", shortLabel: "04" },
      { id: "shift-check", label: "Kontrol", shortLabel: "05" },
    ],
    sectionRailAria: "Rehber bölümleri",
    hero: {
      eyebrow: "OYUN REHBERİ · ÜRETİM AKIŞI",
      titlePrefix: "Bir departmandaki karar,",
      titleEmphasis: " bütün fabrikanın akışını değiştirir.",
      description:
        "Sipariş yalnızca bir ürün değildir; departmanlardan, kuyruklardan ve bekleme sürelerinden oluşan bir rotadır. Aşağı kaydırdıkça ürünün fabrikada nasıl ilerlediğini ileri ve geri sarabilirsin.",
      action: "Akışı başlat",
      motionHint: "Kaydırma hareketi animasyonu kontrol eder.",
    },
    routeChoices: [
      {
        accent: "cyan",
        description: "Kesimden sonra doğrudan dikim kuyruğuna girer.",
        image: "/game-guide/basic_tshirt.webp",
        imageAlt: "Basic tişört",
        route: "Kesim → Dikim → Ütü · Paket",
        title: "Basic ürün",
      },
      {
        accent: "amber",
        description: "Kesimden sonra fason işlemi bekler ve fabrikaya döner.",
        image: "/game-guide/baskili_tshirt.webp",
        imageAlt: "Baskılı tişört",
        route: "Kesim → Fason Baskı → Dikim",
        title: "Baskılı ürün",
      },
    ],
    stories: {
      normalFlow: {
        eyebrow: "SENARYO 01 · DOĞRUDAN ÜRETİM",
        title: "Her çıktı, bir sonraki departmanın girdisidir.",
        description:
          "Basic ürün fabrikadan çıkmadan ilerler. Mavi rota tamamlandıkça aktif kartı ve o departmandan çıkan ürün biçimini takip et.",
      },
      outsourceFlow: {
        eyebrow: "SENARYO 02 · FASON BASKI",
        title: "Ürün fabrikadan çıkar; dikim kuyruğu onu beklemez.",
        description:
          "Kesilmiş parça önce fason baskıya gider. Baskı tamamlanıp ürün geri dönene kadar dikim kuyruğunda yer tutmaz.",
        waitPrefix: "Dikim beklemede:",
        waitBody: "Baskıdan dönmeyen parça kuyruğa eklenmez.",
      },
      bottleneck: {
        eyebrow: "SENARYO 03 · KUYRUK VE DARBOĞAZ",
        title: "En yavaş departman, bütün rotanın hızını belirler.",
        description:
          "Kesim hızlı üretse bile dikim aynı iş yükünü karşılayamıyorsa yarı mamuller dikim önünde birikir. Sonraki vardiyanın ilk kararı bu kuyruğu okumaktır.",
      },
    },
    flowCard: {
      expandAria: (outputLabel) => `${outputLabel} görselini büyüt`,
      outputKicker: "ÇIKTI",
    },
    normalFlowSteps: [
      {
        id: "warehouse",
        index: "01",
        eyebrow: "Hammadde",
        title: "Kumaş Deposu",
        description: "Siparişe ayrılan kumaş üretim rotasına çıkar.",
        departmentImage: "/game-guide/fabric_warehouse.webp",
        departmentAlt: "Kumaş deposu üretim alanı",
        productImage: "/game-guide/kesime_giden_kumas.webp",
        productAlt: "Kesime giden kumaş rulosu",
        outputLabel: "Kesime hazır kumaş",
        x: 170,
        y: 342,
      },
      {
        id: "cutting",
        index: "02",
        eyebrow: "1. operasyon",
        title: "Kesim",
        description: "Kumaş, ürünün kalıp parçalarına dönüşür.",
        departmentImage: "/game-guide/cutting_department.webp",
        departmentAlt: "Kesim departmanı",
        productImage: "/game-guide/dikime_giden_basic.webp",
        productAlt: "Dikime giden kesilmiş basic ürün parçaları",
        outputLabel: "Kesilmiş parçalar",
        x: 485,
        y: 342,
      },
      {
        id: "sewing",
        index: "03",
        eyebrow: "2. operasyon",
        title: "Dikim",
        description: "Parçalar birleşir; ürün ilk kez bütün hâle gelir.",
        departmentImage: "/game-guide/sewing_department.webp",
        departmentAlt: "Dikim departmanı",
        productImage: "/game-guide/utupaket_giden_basic.webp",
        productAlt: "Ütü pakete giden dikilmiş basic ürün",
        outputLabel: "Dikilmiş ürün",
        x: 800,
        y: 342,
      },
      {
        id: "iron-packing",
        index: "04",
        eyebrow: "Son operasyon",
        title: "Ütü · Paket",
        description: "Ürün ütülenir, katlanır ve sevke hazırlanır.",
        departmentImage: "/game-guide/iron_packing_department.webp",
        departmentAlt: "Ütü ve paket departmanı",
        productImage: "/game-guide/utupaket_biten_basic.webp",
        productAlt: "Paketlenmiş basic ürün",
        outputLabel: "Paketlenmiş ürün",
        x: 1115,
        y: 342,
      },
      {
        id: "shipping",
        index: "05",
        eyebrow: "Tamamlandı",
        title: "Sevkiyat",
        description: "Tamamlanan adetler paletlenir ve siparişe yazılır.",
        departmentImage: "/game-guide/shipment.webp",
        departmentAlt: "Sevkiyat departmanı",
        productImage: "/game-guide/sevkiyat_pallet.webp",
        productAlt: "Sevkiyata hazır palet",
        outputLabel: "Teslime hazır",
        x: 1430,
        y: 342,
      },
    ],
    outsourceFlowSteps: [
      {
        id: "outsource-cutting",
        index: "01",
        eyebrow: "Fabrika içinde",
        title: "Kesim",
        description: "Baskıdan önce ürün parçaları kesilir.",
        departmentImage: "/game-guide/cutting_department.webp",
        departmentAlt: "Kesim departmanı",
        productImage: "/game-guide/baskiya_giden_parca.webp",
        productAlt: "Baskıya giden kesilmiş ürün parçası",
        outputLabel: "Baskısız kesilmiş parça",
        x: 170,
        y: 390,
      },
      {
        id: "outsource-print",
        index: "02",
        eyebrow: "Fabrika dışında",
        title: "Fason Baskı",
        description: "Parça tesisten çıkar; fason süresi burada işler.",
        departmentImage: "/game-guide/print_outsource_fason.webp",
        departmentAlt: "Fason baskı işletmesi",
        productImage: "/game-guide/baskidan_cikan.webp",
        productAlt: "Baskıdan çıkan kesilmiş ürün parçası",
        outputLabel: "Baskısı tamamlandı",
        x: 485,
        y: 260,
        tone: "amber",
        durationNote: "Fason işlem süresi 3 ile 6 iş günü sürer.",
      },
      {
        id: "outsource-sewing",
        index: "03",
        eyebrow: "Fabrikaya dönüş",
        title: "Dikim Kuyruğu",
        description: "Baskı bitince parça döner ve ancak o zaman sıraya girer.",
        departmentImage: "/game-guide/sewing_department.webp",
        departmentAlt: "Dikim departmanı",
        productImage: "/game-guide/utupaket_giden_baskili.webp",
        productAlt: "Ütü pakete giden baskılı dikilmiş ürün",
        outputLabel: "Dikilmiş baskılı ürün",
        x: 800,
        y: 390,
      },
      {
        id: "outsource-iron",
        index: "04",
        eyebrow: "Son operasyon",
        title: "Ütü · Paket",
        description: "Dönen ürün normal fabrika akışına devam eder.",
        departmentImage: "/game-guide/iron_packing_department.webp",
        departmentAlt: "Ütü ve paket departmanı",
        productImage: "/game-guide/utupaket_biten_baskili.webp",
        productAlt: "Paketlenmiş baskılı ürün",
        outputLabel: "Paketlenmiş baskılı ürün",
        x: 1120,
        y: 390,
      },
      {
        id: "outsource-shipping",
        index: "05",
        eyebrow: "Tamamlandı",
        title: "Sevkiyat",
        description: "Fason bekleme dâhil tüm rota tamamlanmıştır.",
        departmentImage: "/game-guide/shipment.webp",
        departmentAlt: "Sevkiyat departmanı",
        productImage: "/game-guide/sevkiyat_pallet.webp",
        productAlt: "Sevkiyata hazır palet",
        outputLabel: "Teslime hazır",
        x: 1430,
        y: 390,
      },
    ],
    bottleneck: {
      stations: {
        cutting: {
          index: "01",
          label: "Kesim",
          status: "Akış hızlı",
          value: "1.200 puan/gün",
        },
        sewing: {
          index: "02",
          label: "Dikim",
          status: "Darboğaz",
          value: "760 puan/gün",
        },
        ironPacking: {
          index: "03",
          label: "Ütü · Paket",
          status: "Girdi bekliyor",
          value: "980 puan/gün",
        },
      },
      stationKind: "DEPARTMAN",
      queueTitle: "DİKİM KUYRUĞU",
      queueCount: "+6 iş paketi",
      queueImageAlt: "Dikim kuyruğunda bekleyen kesilmiş ürün",
      queueDescription:
        "Kesim çıktısı, dikimin tüketebildiğinden daha hızlı birikiyor.",
      capacity: {
        cutting: "Kesim kapasitesi",
        sewing: "Dikim kapasitesi",
        solution:
          "Çözüm: Dikim hattı yatırımı, personel dengesi veya kuyruk önceliği.",
      },
    },
    checklist: {
      eyebrow: "VARDİYA ÖNCESİ · 20 SANİYELİK KONTROL",
      title: "Başlatmadan önce fabrikanın rotasını oku.",
      description:
        "İyi plan, bütün hatları doldurmak değildir. Doğru ürünü doğru sırada ve kaldırabileceğin iş yüküyle ilerletmektir.",
      items: [
        {
          iconKey: "route",
          index: "01",
          text: "Ürünün rotası doğrudan mı, fasonlu mu?",
          title: "Rotayı kontrol et",
        },
        {
          iconKey: "boxes",
          index: "02",
          text: "Önce hangi siparişin çıkması gerektiğini belirle.",
          title: "Kuyruğu sırala",
        },
        {
          iconKey: "gauge",
          index: "03",
          text: "Adedi değil, hattın taşıyacağı iş yükünü karşılaştır.",
          title: "Kapasiteyi oku",
        },
        {
          iconKey: "gitBranch",
          index: "04",
          text: "Biriken yarı mamulün hangi departmanı beklediğini gör.",
          title: "Darboğazı bul",
        },
      ],
      finalTitle: "Plan hazırsa vardiyayı başlat.",
      finalBody: "Sonuç ekranında aynı akışın gerçek sayılarını göreceksin.",
      finalAction: "Fabrikaya dön",
    },
    productPreview: {
      closeAria: "Görseli kapat",
      hint: "Üretim adımından çıkan temsili ürün görünümü",
    },
  },
  en: {
    utility: {
      back: "Back to factory",
      playerChip: "Gameplay Guide",
    },
    sections: [
      { id: "overview", label: "Start", shortLabel: "01" },
      { id: "normal-flow", label: "Normal route", shortLabel: "02" },
      { id: "outsource-flow", label: "Outsource route", shortLabel: "03" },
      { id: "bottleneck", label: "Queue", shortLabel: "04" },
      { id: "shift-check", label: "Check", shortLabel: "05" },
    ],
    sectionRailAria: "Guide sections",
    hero: {
      eyebrow: "GAMEPLAY GUIDE · PRODUCTION FLOW",
      titlePrefix: "One department decision",
      titleEmphasis: " changes the flow of the whole factory.",
      description:
        "An order is not just a product; it is a route made of departments, queues, and waiting time. As you scroll, you can scrub forward and backward through how the product moves across the factory.",
      action: "Start the flow",
      motionHint: "Scrolling controls the animation.",
    },
    routeChoices: [
      {
        accent: "cyan",
        description: "After cutting, it goes straight into the sewing queue.",
        image: "/game-guide/basic_tshirt.webp",
        imageAlt: "Basic t-shirt",
        route: "Cutting → Sewing → Iron · Pack",
        title: "Basic product",
      },
      {
        accent: "amber",
        description:
          "After cutting, it waits for an outsource operation and returns to the factory.",
        image: "/game-guide/baskili_tshirt.webp",
        imageAlt: "Printed t-shirt",
        route: "Cutting → Outsource Print → Sewing",
        title: "Printed product",
      },
    ],
    stories: {
      normalFlow: {
        eyebrow: "SCENARIO 01 · DIRECT PRODUCTION",
        title: "Every output becomes the next department's input.",
        description:
          "A basic product moves without leaving the factory. As the blue route completes, follow the active card and the output created by each department.",
      },
      outsourceFlow: {
        eyebrow: "SCENARIO 02 · OUTSOURCE PRINTING",
        title: "The product leaves the factory; the sewing queue does not wait.",
        description:
          "The cut part goes to outsource printing first. Until printing finishes and the item returns, it does not reserve a place in the sewing queue.",
        waitPrefix: "Sewing is waiting:",
        waitBody: "A part that has not returned from printing is not added to the queue.",
      },
      bottleneck: {
        eyebrow: "SCENARIO 03 · QUEUE AND BOTTLENECK",
        title: "The slowest department sets the speed of the whole route.",
        description:
          "Even if cutting works quickly, semi-finished goods pile up before sewing when sewing cannot absorb the same workload. The first decision of the next shift is to read that queue.",
      },
    },
    flowCard: {
      expandAria: (outputLabel) => `Enlarge ${outputLabel} image`,
      outputKicker: "OUTPUT",
    },
    normalFlowSteps: [
      {
        id: "warehouse",
        index: "01",
        eyebrow: "Raw material",
        title: "Fabric Warehouse",
        description: "Fabric assigned to the order enters the production route.",
        departmentImage: "/game-guide/fabric_warehouse.webp",
        departmentAlt: "Fabric warehouse production area",
        productImage: "/game-guide/kesime_giden_kumas.webp",
        productAlt: "Fabric roll going to cutting",
        outputLabel: "Fabric ready for cutting",
        x: 170,
        y: 342,
      },
      {
        id: "cutting",
        index: "02",
        eyebrow: "1st operation",
        title: "Cutting",
        description: "Fabric becomes the pattern pieces of the product.",
        departmentImage: "/game-guide/cutting_department.webp",
        departmentAlt: "Cutting department",
        productImage: "/game-guide/dikime_giden_basic.webp",
        productAlt: "Cut basic product pieces going to sewing",
        outputLabel: "Cut pieces",
        x: 485,
        y: 342,
      },
      {
        id: "sewing",
        index: "03",
        eyebrow: "2nd operation",
        title: "Sewing",
        description:
          "Pieces are joined; the product becomes whole for the first time.",
        departmentImage: "/game-guide/sewing_department.webp",
        departmentAlt: "Sewing department",
        productImage: "/game-guide/utupaket_giden_basic.webp",
        productAlt: "Sewn basic product going to ironing and packing",
        outputLabel: "Sewn product",
        x: 800,
        y: 342,
      },
      {
        id: "iron-packing",
        index: "04",
        eyebrow: "Final operation",
        title: "Iron · Pack",
        description: "The product is ironed, folded, and prepared for shipment.",
        departmentImage: "/game-guide/iron_packing_department.webp",
        departmentAlt: "Iron and pack department",
        productImage: "/game-guide/utupaket_biten_basic.webp",
        productAlt: "Packed basic product",
        outputLabel: "Packed product",
        x: 1115,
        y: 342,
      },
      {
        id: "shipping",
        index: "05",
        eyebrow: "Completed",
        title: "Shipping",
        description: "Completed units are palletized and assigned to the order.",
        departmentImage: "/game-guide/shipment.webp",
        departmentAlt: "Shipping department",
        productImage: "/game-guide/sevkiyat_pallet.webp",
        productAlt: "Pallet ready for shipping",
        outputLabel: "Ready to deliver",
        x: 1430,
        y: 342,
      },
    ],
    outsourceFlowSteps: [
      {
        id: "outsource-cutting",
        index: "01",
        eyebrow: "Inside factory",
        title: "Cutting",
        description: "Product pieces are cut before printing.",
        departmentImage: "/game-guide/cutting_department.webp",
        departmentAlt: "Cutting department",
        productImage: "/game-guide/baskiya_giden_parca.webp",
        productAlt: "Cut product piece going to printing",
        outputLabel: "Unprinted cut piece",
        x: 170,
        y: 390,
      },
      {
        id: "outsource-print",
        index: "02",
        eyebrow: "Outside factory",
        title: "Outsource Print",
        description: "The part leaves the site; outsource lead time runs here.",
        departmentImage: "/game-guide/print_outsource_fason.webp",
        departmentAlt: "Outsource print shop",
        productImage: "/game-guide/baskidan_cikan.webp",
        productAlt: "Cut product piece returned from printing",
        outputLabel: "Printing completed",
        x: 485,
        y: 260,
        tone: "amber",
        durationNote: "Outsource processing takes 3 to 6 workdays.",
      },
      {
        id: "outsource-sewing",
        index: "03",
        eyebrow: "Back to factory",
        title: "Sewing Queue",
        description:
          "Once printing finishes, the part returns and only then enters the queue.",
        departmentImage: "/game-guide/sewing_department.webp",
        departmentAlt: "Sewing department",
        productImage: "/game-guide/utupaket_giden_baskili.webp",
        productAlt: "Printed sewn product going to ironing and packing",
        outputLabel: "Sewn printed product",
        x: 800,
        y: 390,
      },
      {
        id: "outsource-iron",
        index: "04",
        eyebrow: "Final operation",
        title: "Iron · Pack",
        description: "The returned product continues through the normal factory flow.",
        departmentImage: "/game-guide/iron_packing_department.webp",
        departmentAlt: "Iron and pack department",
        productImage: "/game-guide/utupaket_biten_baskili.webp",
        productAlt: "Packed printed product",
        outputLabel: "Packed printed product",
        x: 1120,
        y: 390,
      },
      {
        id: "outsource-shipping",
        index: "05",
        eyebrow: "Completed",
        title: "Shipping",
        description: "The whole route, including outsource waiting time, is complete.",
        departmentImage: "/game-guide/shipment.webp",
        departmentAlt: "Shipping department",
        productImage: "/game-guide/sevkiyat_pallet.webp",
        productAlt: "Pallet ready for shipping",
        outputLabel: "Ready to deliver",
        x: 1430,
        y: 390,
      },
    ],
    bottleneck: {
      stations: {
        cutting: {
          index: "01",
          label: "Cutting",
          status: "Fast flow",
          value: "1,200 pts/day",
        },
        sewing: {
          index: "02",
          label: "Sewing",
          status: "Bottleneck",
          value: "760 pts/day",
        },
        ironPacking: {
          index: "03",
          label: "Iron · Pack",
          status: "Waiting for input",
          value: "980 pts/day",
        },
      },
      stationKind: "DEPARTMENT",
      queueTitle: "SEWING QUEUE",
      queueCount: "+6 work packets",
      queueImageAlt: "Cut product waiting in the sewing queue",
      queueDescription:
        "Cutting output is accumulating faster than sewing can consume it.",
      capacity: {
        cutting: "Cutting capacity",
        sewing: "Sewing capacity",
        solution:
          "Fix: invest in a sewing line, balance staff, or change queue priority.",
      },
    },
    checklist: {
      eyebrow: "BEFORE SHIFT · 20-SECOND CHECK",
      title: "Read the factory route before you start.",
      description:
        "A good plan is not about filling every line. It is about moving the right product in the right order with a workload your factory can carry.",
      items: [
        {
          iconKey: "route",
          index: "01",
          text: "Is the product route direct or outsourced?",
          title: "Check the route",
        },
        {
          iconKey: "boxes",
          index: "02",
          text: "Decide which order needs to leave first.",
          title: "Sort the queue",
        },
        {
          iconKey: "gauge",
          index: "03",
          text: "Compare workload, not only quantity.",
          title: "Read capacity",
        },
        {
          iconKey: "gitBranch",
          index: "04",
          text: "See which department the semi-finished goods are waiting for.",
          title: "Find the bottleneck",
        },
      ],
      finalTitle: "When the plan is ready, start the shift.",
      finalBody: "The result screen will show the real numbers for the same flow.",
      finalAction: "Back to factory",
    },
    productPreview: {
      closeAria: "Close image",
      hint: "Representative product view from this production step",
    },
  },
} as const satisfies Record<SupportedLocale, GuideCopy>;

export type GameplayGuideCopy = (typeof gameplayGuideCopy)[SupportedLocale];

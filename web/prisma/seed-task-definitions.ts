import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import {
  ContentStatus,
  Prisma,
  PrismaClient,
  TaskObjectiveType,
  TaskType,
} from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadı.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type StoryTaskSeed = {
  key: string;
  chapterKey: string;
  sortOrder: number;
  prerequisiteTaskKey: string | null;
  activationLevel?: number;
  objectiveType: TaskObjectiveType;
  targetValue: number;
  objectiveConfig?: Prisma.InputJsonValue;
  rewardXp: number;
  rewardRunwayTokens: number;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  completionTr: string;
  completionEn: string;
};

const storyTasks: StoryTaskSeed[] = [
  {
    key: "story_first_normal_order",
    chapterKey: "factory-foundations",
    sortOrder: 10,
    prerequisiteTaskKey: null,
    objectiveType: TaskObjectiveType.ACCEPT_ORDER,
    targetValue: 1,
    rewardXp: 100,
    rewardRunwayTokens: 0,
    titleTr: "Siparişini bilinçli seç",
    titleEn: "Accept your first normal order",
    descriptionTr:
      "Kapasite, teslim tarihi ve tahmini kârı birlikte değerlendir; fabrikanın mevcut gücüne uygun ilk normal siparişi kabul et.",
    descriptionEn:
      "Evaluate capacity, delivery date, and estimated profit together, then accept a normal order that fits your factory.",
    completionTr: "İlk normal siparişin bilinçli bir kararla üretim akışına alındı.",
    completionEn: "Your first normal order entered the production flow.",
  },
  {
    key: "story_first_shift",
    chapterKey: "factory-foundations",
    sortOrder: 20,
    prerequisiteTaskKey: "story_first_normal_order",
    objectiveType: TaskObjectiveType.COMPLETE_SHIFT,
    targetValue: 1,
    rewardXp: 100,
    rewardRunwayTokens: 0,
    titleTr: "Üretimi başlat",
    titleEn: "Complete your first production shift",
    descriptionTr:
      "Siparişini üretim akışına al ve ilk vardiyanı tamamlayarak fabrikanın günlük çalışma düzenini başlat.",
    descriptionEn:
      "Move the order into production and complete the first shift to establish your factory's daily operating rhythm.",
    completionTr: "Fabrikanın günlük üretim düzeni başladı.",
    completionEn: "Your first production shift is complete.",
  },
  {
    key: "story_first_on_time_delivery",
    chapterKey: "factory-foundations",
    sortOrder: 30,
    prerequisiteTaskKey: "story_first_shift",
    objectiveType: TaskObjectiveType.SHIP_ON_TIME,
    targetValue: 1,
    rewardXp: 150,
    rewardRunwayTokens: 5,
    titleTr: "Sözünü zamanında tut",
    titleEn: "Ship your first order on time",
    descriptionTr:
      "Kuyruk ve kapasite kararlarını yönet; siparişini teslim tarihini aşmadan üretip müşteriye sevk et.",
    descriptionEn:
      "Manage queue and capacity decisions, then produce and ship the order without missing its delivery date.",
    completionTr: "Müşterine verdiğin ilk teslimat sözünü zamanında tuttun.",
    completionEn: "Your first on-time delivery was completed successfully.",
  },
  {
    key: "story_first_customer_payment",
    chapterKey: "factory-foundations",
    sortOrder: 40,
    prerequisiteTaskKey: "story_first_on_time_delivery",
    objectiveType: TaskObjectiveType.PAYMENT_RECEIVED,
    targetValue: 1,
    rewardXp: 100,
    rewardRunwayTokens: 0,
    titleTr: "İlk gelirini kasaya taşı",
    titleEn: "Receive your first customer payment",
    descriptionTr:
      "Sevkiyat sonrası oluşan müşteri alacağını takip et ve ödemenin fabrika kasasına geçmesini sağla.",
    descriptionEn:
      "Track the receivable created after shipment until the customer payment reaches the factory cash.",
    completionTr: "İlk müşteri gelirin fabrika kasasına ulaştı.",
    completionEn: "Your first customer payment reached the factory cash.",
  },
  {
    key: "story_first_priority_change",
    chapterKey: "factory-foundations",
    sortOrder: 50,
    prerequisiteTaskKey: "story_first_on_time_delivery",
    objectiveType: TaskObjectiveType.CHANGE_PRIORITY,
    targetValue: 1,
    rewardXp: 150,
    rewardRunwayTokens: 0,
    titleTr: "Üretim akışına müdahale et",
    titleEn: "Change a production queue priority",
    descriptionTr:
      "Termin riski veya darboğaz taşıyan bir işi belirle ve ilgili üretim kuyruğundaki önceliğini bilinçli biçimde değiştir.",
    descriptionEn:
      "Identify a job with delivery pressure or a bottleneck and deliberately adjust its production queue priority.",
    completionTr: "Üretim akışına ilk planlama müdahaleni yaptın.",
    completionEn: "You made and applied a production priority decision.",
  },
  {
    key: "story_first_investment_review",
    chapterKey: "factory-foundations",
    sortOrder: 60,
    prerequisiteTaskKey: "story_first_priority_change",
    objectiveType: TaskObjectiveType.OPEN_INVESTMENT_PANEL,
    targetValue: 1,
    rewardXp: 50,
    rewardRunwayTokens: 0,
    titleTr: "İlk büyüme planını hazırla",
    titleEn: "Review your investment options",
    descriptionTr:
      "Yeni üretim hattının satın alma ve leasing seçeneklerini; kapasite, personel, peşinat ve tekrarlayan giderleriyle birlikte karşılaştır.",
    descriptionEn:
      "Compare purchase and leasing options together with their capacity, staffing, upfront, and recurring cost effects.",
    completionTr: "İlk büyüme yatırımın için maliyet ve kapasite seçeneklerini inceledin.",
    completionEn: "You reviewed the investment options and their cost impact.",
  },
  {
    key: "story_first_production_line",
    chapterKey: "factory-foundations",
    sortOrder: 70,
    prerequisiteTaskKey: "story_first_investment_review",
    objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
    targetValue: 1,
    objectiveConfig: {
      acquisitionTypes: ["PURCHASED", "LEASED"],
    },
    rewardXp: 300,
    rewardRunwayTokens: 15,
    titleTr: "İlk kapasite yatırımını yap",
    titleEn: "Build your first new production line",
    descriptionTr:
      "Gerçek bir kapasite ihtiyacına yanıt verecek yeni üretim hattını satın al veya leasing ile kur.",
    descriptionEn:
      "Purchase or lease a new production line that responds to a real capacity need.",
    completionTr: "İlk büyüme yatırımın tamamlandı.",
    completionEn: "Your first growth investment is complete.",
  },
  {
    key: "story_first_new_line_usage",
    chapterKey: "factory-foundations",
    sortOrder: 80,
    prerequisiteTaskKey: "story_first_production_line",
    objectiveType: TaskObjectiveType.USE_NEW_PRODUCTION_LINE,
    targetValue: 1,
    rewardXp: 250,
    rewardRunwayTokens: 10,
    titleTr: "Yatırımı üretime dönüştür",
    titleEn: "Use the new line in active production",
    descriptionTr:
      "Yeni hattını üretim planına dahil et ve en az bir vardiyada gerçek çıktı al.",
    descriptionEn:
      "Include the new line in a production plan and generate real output during at least one shift.",
    completionTr: "Yeni kapasiten üretime katkı sağladı.",
    completionEn: "Your new capacity contributed to production.",
  },
  {
    key: "story_stage_staff_requirements",
    chapterKey: "factory-foundations",
    sortOrder: 90,
    prerequisiteTaskKey: "story_first_new_line_usage",
    objectiveType: TaskObjectiveType.MEET_STAGE_STAFF,
    targetValue: 1,
    rewardXp: 200,
    rewardRunwayTokens: 0,
    titleTr: "Büyüme kadronu tamamla",
    titleEn: "Meet the new stage staffing requirements",
    descriptionTr:
      "Yeni işletme kademesiyle açılan yönetim ve destek rollerini doldurarak fabrikanı tam kadro çalışır hale getir.",
    descriptionEn:
      "Fill the management and support roles required by the new operating stage and restore full staffing.",
    completionTr: "Büyüyen fabrikanın yönetim ve destek kadrosu tamamlandı.",
    completionEn: "The new stage staffing requirements are complete.",
  },
  {
    key: "story_first_outsource_operation",
    chapterKey: "operations-mastery",
    sortOrder: 100,
    prerequisiteTaskKey: "story_stage_staff_requirements",
    objectiveType: TaskObjectiveType.COMPLETE_OUTSOURCE,
    targetValue: 1,
    rewardXp: 150,
    rewardRunwayTokens: 0,
    titleTr: "İlk fason operasyonunu yönet",
    titleEn: "Manage your first outsourced operation",
    descriptionTr:
      "Üretim rotasındaki uygun bir işlemi fasona gönder, tamamlanma süresini takip et ve çıktıyı yeniden üretim akışına kazandır.",
    descriptionEn:
      "Send an eligible route operation to outsourcing, track its lead time, and bring the completed output back into production.",
    completionTr: "İlk fason operasyonun tamamlanarak üretim akışına döndü.",
    completionEn: "Your first outsourced operation returned to the production flow.",
  },
  {
    key: "story_first_express_delivery",
    chapterKey: "operations-mastery",
    sortOrder: 110,
    prerequisiteTaskKey: "story_first_outsource_operation",
    objectiveType: TaskObjectiveType.COMPLETE_EXPRESS_ORDER,
    targetValue: 1,
    rewardXp: 250,
    rewardRunwayTokens: 5,
    titleTr: "Express teslimatı başar",
    titleEn: "Complete an express delivery",
    descriptionTr:
      "Kısa terminli bir Express teklifi kapasite riskini değerlendirerek kabul et ve siparişi gecikmeden sevk et.",
    descriptionEn:
      "Accept a short-deadline express offer after assessing capacity risk, then ship it without delay.",
    completionTr: "İlk Express siparişini zamanında teslim ettin.",
    completionEn: "You delivered your first express order on time.",
  },
  {
    key: "story_first_industrial_upgrade",
    chapterKey: "operations-mastery",
    sortOrder: 120,
    prerequisiteTaskKey: "story_first_express_delivery",
    activationLevel: 10,
    objectiveType: TaskObjectiveType.UPGRADE_PRODUCTION_LINE,
    targetValue: 1,
    objectiveConfig: {
      targetGrade: "INDUSTRIAL",
    },
    rewardXp: 300,
    rewardRunwayTokens: 10,
    titleTr: "Hat teknolojisini yükselt",
    titleEn: "Upgrade your line technology",
    descriptionTr:
      "Bir üretim hattını Industrial seviyesine yükselt; kapasite artışı ile personel ve işletme giderlerini birlikte değerlendir.",
    descriptionEn:
      "Upgrade a production line to Industrial grade while balancing capacity gains against staffing and operating costs.",
    completionTr: "İlk Industrial üretim hattın devreye alındı.",
    completionEn: "Your first Industrial production line is now operational.",
  },
  {
    key: "story_delivery_standard",
    chapterKey: "operations-mastery",
    sortOrder: 130,
    prerequisiteTaskKey: "story_first_industrial_upgrade",
    objectiveType: TaskObjectiveType.SHIP_ON_TIME,
    targetValue: 3,
    rewardXp: 300,
    rewardRunwayTokens: 0,
    titleTr: "Teslimat standardı oluştur",
    titleEn: "Establish a delivery standard",
    descriptionTr:
      "Üç farklı siparişi teslim tarihini geçirmeden sevk ederek fabrikanın düzenli ve güvenilir üretim ritmini kanıtla.",
    descriptionEn:
      "Ship three different orders without missing their delivery dates to establish a reliable production rhythm.",
    completionTr: "Fabrikan üç siparişlik zamanında teslimat standardı oluşturdu.",
    completionEn: "Your factory established a three-order on-time delivery standard.",
  },
  {
    key: "story_first_premium_order",
    chapterKey: "advanced-production",
    sortOrder: 140,
    prerequisiteTaskKey: "story_delivery_standard",
    activationLevel: 20,
    objectiveType: TaskObjectiveType.COMPLETE_PREMIUM_ORDER,
    targetValue: 1,
    rewardXp: 350,
    rewardRunwayTokens: 10,
    titleTr: "Premium pazara gir",
    titleEn: "Enter the premium market",
    descriptionTr:
      "Daha yüksek kalite ve operasyon disiplini isteyen ilk Premium siparişini zamanında tamamla.",
    descriptionEn:
      "Complete your first Premium order on time while meeting its higher quality and operational expectations.",
    completionTr: "İlk Premium siparişini başarıyla teslim ettin.",
    completionEn: "You successfully delivered your first Premium order.",
  },
  {
    key: "story_first_precision_upgrade",
    chapterKey: "advanced-production",
    sortOrder: 150,
    prerequisiteTaskKey: "story_first_premium_order",
    activationLevel: 20,
    objectiveType: TaskObjectiveType.UPGRADE_PRODUCTION_LINE,
    targetValue: 1,
    objectiveConfig: {
      targetGrade: "PRECISION",
    },
    rewardXp: 450,
    rewardRunwayTokens: 15,
    titleTr: "Precision üretime geç",
    titleEn: "Move into precision production",
    descriptionTr:
      "Kapasite baskısı taşıyan üretim hatlarından birini Precision teknolojisine yükselt.",
    descriptionEn:
      "Upgrade one of your capacity-constrained production lines to Precision technology.",
    completionTr: "İlk Precision üretim hattın devreye alındı.",
    completionEn: "Your first Precision production line is now operational.",
  },
  {
    key: "story_first_value_added_line",
    chapterKey: "value-added-growth",
    sortOrder: 160,
    prerequisiteTaskKey: "story_first_precision_upgrade",
    activationLevel: 20,
    objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
    targetValue: 1,
    objectiveConfig: {
      acquisitionTypes: ["PURCHASED", "LEASED"],
      departmentGroupKeys: ["value_added_processes"],
    },
    rewardXp: 500,
    rewardRunwayTokens: 20,
    titleTr: "İlk ara işlemi fabrikaya al",
    titleEn: "Bring your first intermediate process in-house",
    descriptionTr:
      "Fason maliyeti veya bekleme süresi yüksek bir katma değerli ara işlem için iç üretim hattı satın al ya da leasing ile kur.",
    descriptionEn:
      "Purchase or lease an in-house line for a value-added intermediate process with high outsourcing cost or lead time.",
    completionTr: "İlk katma değerli ara işlem hattını fabrikana kazandırdın.",
    completionEn: "You added your first in-house value-added process line.",
  },
  {
    key: "story_first_value_added_line_usage",
    chapterKey: "value-added-growth",
    sortOrder: 170,
    prerequisiteTaskKey: "story_first_value_added_line",
    objectiveType: TaskObjectiveType.USE_NEW_PRODUCTION_LINE,
    targetValue: 1,
    objectiveConfig: {
      departmentGroupKeys: ["value_added_processes"],
    },
    rewardXp: 300,
    rewardRunwayTokens: 0,
    titleTr: "Ara işlem hattını devreye al",
    titleEn: "Commission the intermediate process line",
    descriptionTr:
      "Yeni ara işlem hattını üretim planına dahil et ve en az bir vardiyada gerçek çıktı al.",
    descriptionEn:
      "Include the new intermediate process line in a production plan and generate real output in at least one shift.",
    completionTr: "Yeni ara işlem hattın aktif üretime katkı sağladı.",
    completionEn: "Your new intermediate process line contributed to active production.",
  },
  {
    key: "story_first_internal_process_order",
    chapterKey: "value-added-growth",
    sortOrder: 180,
    prerequisiteTaskKey: "story_first_value_added_line_usage",
    objectiveType: TaskObjectiveType.COMPLETE_INTERNAL_PROCESS_ORDER,
    targetValue: 1,
    objectiveConfig: {
      departmentGroupKeys: ["value_added_processes"],
    },
    rewardXp: 450,
    rewardRunwayTokens: 10,
    titleTr: "Fason bağımlılığını azalt",
    titleEn: "Reduce outsourcing dependency",
    descriptionTr:
      "En az bir siparişin katma değerli ara işlem adımını kendi hattında tamamla ve bu operasyonu fasona göndermeden sevk et.",
    descriptionEn:
      "Complete a value-added intermediate step on your own line and ship the order without outsourcing that operation.",
    completionTr: "İlk siparişini kendi ara işlem yetkinliğinle tamamladın.",
    completionEn: "You completed your first order with an in-house intermediate process.",
  },
  {
    key: "story_second_value_added_line",
    chapterKey: "value-added-growth",
    sortOrder: 190,
    prerequisiteTaskKey: "story_first_internal_process_order",
    activationLevel: 25,
    objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
    targetValue: 1,
    objectiveConfig: {
      acquisitionTypes: ["PURCHASED", "LEASED"],
      departmentGroupKeys: ["value_added_processes"],
      minimumActiveDepartmentGroupLineCount: 2,
    },
    rewardXp: 600,
    rewardRunwayTokens: 25,
    titleTr: "Ara işlem ağını genişlet",
    titleEn: "Expand your intermediate process network",
    descriptionTr:
      "İkinci bir katma değerli ara işlem hattı kurarak fabrikanın iç üretim yetkinliğini ve büyüme kapasitesini genişlet.",
    descriptionEn:
      "Build a second value-added intermediate process line to expand in-house capability and growth capacity.",
    completionTr: "Fabrikan iki ara işlem hattıyla daha güçlü bir üretim ağına ulaştı.",
    completionEn: "Your factory now has a stronger network with two intermediate process lines.",
  },
  {
    key: "story_first_profitable_finance_period",
    chapterKey: "financial-milestone",
    sortOrder: 200,
    prerequisiteTaskKey: "story_second_value_added_line",
    objectiveType: TaskObjectiveType.CLOSE_PROFITABLE_FINANCE_PERIOD,
    targetValue: 1,
    rewardXp: 500,
    rewardRunwayTokens: 20,
    titleTr: "Dönemi kârla kapat",
    titleEn: "Close a profitable finance period",
    descriptionTr:
      "Satış gelirleri ile personel, fason, leasing ve işletme giderlerini birlikte yönet; finans dönemini pozitif net sonuçla tamamla.",
    descriptionEn:
      "Manage sales income together with staffing, outsourcing, leasing, and operating costs to close a finance period with a positive net result.",
    completionTr: "Fabrikan finans dönemini kârla kapattı.",
    completionEn: "The finance period closed with a positive result.",
  },
];

async function main() {
  const sectors = await prisma.sector.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true },
  });

  if (sectors.length === 0) {
    throw new Error("Görev tanımı oluşturulacak sektör bulunamadı.");
  }

  for (const sector of sectors) {
    for (const task of storyTasks) {
      const metadata = {
        balanceVersion: 2,
        seedSource: "25-Gorevler-ve-Odul-Sistemi-Teknik-Plan",
        chapter: task.chapterKey,
        contentModel: "shared-sector-story",
        sectorKey: sector.key,
      };

      await prisma.taskDefinition.upsert({
        where: {
          scopeKey_key: {
            scopeKey: sector.id,
            key: task.key,
          },
        },
        update: {
          chapterKey: task.chapterKey,
          sortOrder: task.sortOrder,
          prerequisiteTaskKey: task.prerequisiteTaskKey,
          activationDay: 4,
          activationLevel: task.activationLevel ?? null,
          objectiveType: task.objectiveType,
          targetValue: task.targetValue,
          objectiveConfig: task.objectiveConfig,
          rewardXp: task.rewardXp,
          rewardRunwayTokens: task.rewardRunwayTokens,
          rewardCashCents: null,
          status: ContentStatus.ACTIVE,
          metadata,
          translations: {
            deleteMany: {},
            create: [
              {
                locale: "tr",
                title: task.titleTr,
                description: task.descriptionTr,
                completionMessage: task.completionTr,
              },
              {
                locale: "en",
                title: task.titleEn,
                description: task.descriptionEn,
                completionMessage: task.completionEn,
              },
            ],
          },
        },
        create: {
          sectorId: sector.id,
          scopeKey: sector.id,
          key: task.key,
          taskType: TaskType.STORY,
          chapterKey: task.chapterKey,
          sortOrder: task.sortOrder,
          prerequisiteTaskKey: task.prerequisiteTaskKey,
          activationDay: 4,
          activationLevel: task.activationLevel ?? null,
          objectiveType: task.objectiveType,
          targetValue: task.targetValue,
          objectiveConfig: task.objectiveConfig,
          rewardXp: task.rewardXp,
          rewardRunwayTokens: task.rewardRunwayTokens,
          rewardCashCents: null,
          status: ContentStatus.ACTIVE,
          metadata,
          translations: {
            create: [
              {
                locale: "tr",
                title: task.titleTr,
                description: task.descriptionTr,
                completionMessage: task.completionTr,
              },
              {
                locale: "en",
                title: task.titleEn,
                description: task.descriptionEn,
                completionMessage: task.completionEn,
              },
            ],
          },
        },
      });
    }
  }

  console.log(
    `${storyTasks.length} ortak hikâye görevi ${sectors.length} sektör için eklendi veya güncellendi.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

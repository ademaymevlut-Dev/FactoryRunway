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
    chapterKey: "first-growth",
    sortOrder: 10,
    prerequisiteTaskKey: null,
    objectiveType: TaskObjectiveType.ACCEPT_ORDER,
    targetValue: 1,
    rewardXp: 100,
    rewardRunwayTokens: 0,
    titleTr: "İlk normal siparişi kabul et",
    titleEn: "Accept your first normal order",
    descriptionTr:
      "Fabrikanın düzenli üretim akışını başlatmak için marketten uygun bir normal sipariş seç.",
    descriptionEn:
      "Choose a suitable normal market order to start your factory's regular production flow.",
    completionTr: "İlk normal siparişin üretim akışına alındı.",
    completionEn: "Your first normal order entered the production flow.",
  },
  {
    key: "story_first_shift",
    chapterKey: "first-growth",
    sortOrder: 20,
    prerequisiteTaskKey: "story_first_normal_order",
    objectiveType: TaskObjectiveType.COMPLETE_SHIFT,
    targetValue: 1,
    rewardXp: 100,
    rewardRunwayTokens: 0,
    titleTr: "İlk üretim vardiyasını tamamla",
    titleEn: "Complete your first production shift",
    descriptionTr:
      "Siparişini üretim kuyruğuna al ve bir oyun gününü vardiya simülasyonu ile ilerlet.",
    descriptionEn:
      "Put the order into the production queue and advance one game day through shift simulation.",
    completionTr: "İlk üretim vardiyan tamamlandı.",
    completionEn: "Your first production shift is complete.",
  },
  {
    key: "story_first_on_time_delivery",
    chapterKey: "first-growth",
    sortOrder: 30,
    prerequisiteTaskKey: "story_first_shift",
    objectiveType: TaskObjectiveType.SHIP_ON_TIME,
    targetValue: 1,
    rewardXp: 150,
    rewardRunwayTokens: 5,
    titleTr: "İlk siparişi zamanında sevk et",
    titleEn: "Ship your first order on time",
    descriptionTr:
      "İlk siparişini teslim tarihini kaçırmadan tamamla ve müşteriye sevk et.",
    descriptionEn:
      "Complete and ship your first order without missing its delivery date.",
    completionTr: "İlk zamanında sevkiyat başarıyla tamamlandı.",
    completionEn: "Your first on-time delivery was completed successfully.",
  },
  {
    key: "story_first_customer_payment",
    chapterKey: "first-growth",
    sortOrder: 40,
    prerequisiteTaskKey: "story_first_on_time_delivery",
    objectiveType: TaskObjectiveType.PAYMENT_RECEIVED,
    targetValue: 1,
    rewardXp: 100,
    rewardRunwayTokens: 0,
    titleTr: "İlk müşteri tahsilatını al",
    titleEn: "Receive your first customer payment",
    descriptionTr:
      "Sevkiyattan sonra oluşan müşteri alacağının kasaya girişini takip et.",
    descriptionEn:
      "Track the customer receivable created by your shipment until it reaches your factory cash.",
    completionTr: "İlk müşteri tahsilatın kasaya işlendi.",
    completionEn: "Your first customer payment reached the factory cash.",
  },
  {
    key: "story_first_priority_change",
    chapterKey: "first-growth",
    sortOrder: 50,
    prerequisiteTaskKey: "story_first_customer_payment",
    objectiveType: TaskObjectiveType.CHANGE_PRIORITY,
    targetValue: 1,
    rewardXp: 150,
    rewardRunwayTokens: 0,
    titleTr: "Üretim kuyruğunda öncelik değiştir",
    titleEn: "Change a production queue priority",
    descriptionTr:
      "Siparişlerin teslim tarihlerini ve darboğazı dikkate alarak bir üretim önceliğini manuel olarak düzenle.",
    descriptionEn:
      "Manually adjust a production priority while considering delivery dates and bottlenecks.",
    completionTr: "Üretim önceliği kararını uyguladın.",
    completionEn: "You made and applied a production priority decision.",
  },
  {
    key: "story_first_investment_review",
    chapterKey: "first-growth",
    sortOrder: 60,
    prerequisiteTaskKey: "story_first_priority_change",
    objectiveType: TaskObjectiveType.OPEN_INVESTMENT_PANEL,
    targetValue: 1,
    rewardXp: 50,
    rewardRunwayTokens: 0,
    titleTr: "Yatırım seçeneklerini incele",
    titleEn: "Review your investment options",
    descriptionTr:
      "Yeni bir üretim hattının satın alma, leasing, personel ve tekrarlayan maliyet etkilerini yatırım panelinde incele.",
    descriptionEn:
      "Review the purchase, leasing, staffing, and recurring cost impact of a new production line.",
    completionTr: "Yatırım seçeneklerini ve maliyet etkilerini inceledin.",
    completionEn: "You reviewed the investment options and their cost impact.",
  },
  {
    key: "story_first_production_line",
    chapterKey: "first-growth",
    sortOrder: 70,
    prerequisiteTaskKey: "story_first_investment_review",
    objectiveType: TaskObjectiveType.ACQUIRE_PRODUCTION_LINE,
    targetValue: 1,
    objectiveConfig: {
      acquisitionTypes: ["PURCHASED", "LEASED"],
    },
    rewardXp: 300,
    rewardRunwayTokens: 15,
    titleTr: "İlk yeni üretim hattını kur",
    titleEn: "Build your first new production line",
    descriptionTr:
      "Fabrikanın kapasitesini büyütmek için yeni bir üretim hattı satın al veya leasing ile kur.",
    descriptionEn:
      "Expand your factory capacity by purchasing or leasing a new production line.",
    completionTr: "İlk büyüme yatırımın tamamlandı.",
    completionEn: "Your first growth investment is complete.",
  },
  {
    key: "story_first_new_line_usage",
    chapterKey: "first-growth",
    sortOrder: 80,
    prerequisiteTaskKey: "story_first_production_line",
    objectiveType: TaskObjectiveType.USE_NEW_PRODUCTION_LINE,
    targetValue: 1,
    rewardXp: 250,
    rewardRunwayTokens: 10,
    titleTr: "Yeni hattı aktif üretimde kullan",
    titleEn: "Use the new line in active production",
    descriptionTr:
      "Yeni kurduğun hattın en az bir vardiyada gerçek üretim yapmasını sağla.",
    descriptionEn:
      "Make sure your newly installed line performs real production during at least one shift.",
    completionTr: "Yeni kapasiten üretime katkı sağladı.",
    completionEn: "Your new capacity contributed to production.",
  },
  {
    key: "story_stage_staff_requirements",
    chapterKey: "first-growth",
    sortOrder: 90,
    prerequisiteTaskKey: "story_first_new_line_usage",
    objectiveType: TaskObjectiveType.MEET_STAGE_STAFF,
    targetValue: 1,
    rewardXp: 200,
    rewardRunwayTokens: 0,
    titleTr: "Yeni stage personel gereksinimlerini tamamla",
    titleEn: "Meet the new stage staffing requirements",
    descriptionTr:
      "Büyüyen fabrikanın yönetim ve destek rollerini eksiksiz hale getir.",
    descriptionEn:
      "Complete the management and support roles required by your growing factory stage.",
    completionTr: "Yeni stage personel gereksinimleri tamamlandı.",
    completionEn: "The new stage staffing requirements are complete.",
  },
  {
    key: "story_first_profitable_finance_period",
    chapterKey: "first-growth",
    sortOrder: 100,
    prerequisiteTaskKey: "story_stage_staff_requirements",
    objectiveType: TaskObjectiveType.CLOSE_PROFITABLE_FINANCE_PERIOD,
    targetValue: 1,
    rewardXp: 300,
    rewardRunwayTokens: 15,
    titleTr: "Bir finans dönemini pozitif kapat",
    titleEn: "Close a profitable finance period",
    descriptionTr:
      "Üretim, yatırım ve operasyon giderlerini yöneterek bir finans dönemini pozitif sonuçla tamamla.",
    descriptionEn:
      "Manage production, investment, and operating expenses to close a finance period with a positive result.",
    completionTr: "Finans dönemi pozitif sonuçla kapandı.",
    completionEn: "The finance period closed with a positive result.",
  },
];

async function main() {
  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true, key: true },
  });

  if (!sector) {
    throw new Error('"textile" sektör kaydı bulunamadı.');
  }

  for (const task of storyTasks) {
    const metadata = {
      balanceVersion: 1,
      seedSource: "25-Gorevler-ve-Odul-Sistemi-Teknik-Plan",
      chapter: task.chapterKey,
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

  console.log(
    storyTasks.length + " textile hikâye görevi eklendi veya güncellendi.",
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


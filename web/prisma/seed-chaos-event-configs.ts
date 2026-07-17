import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import {
  ChaosEventType,
  ChaosScope,
  ChaosSeverity,
  ContentStatus,
  Prisma,
  PrismaClient,
} from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;
const validateOnly = process.argv.includes("--validate-only");

if (!connectionString && !validateOnly) {
  throw new Error("DATABASE_URL bulunamadi.");
}

const prisma = connectionString
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    })
  : null;

type ChaosEventConfigSeed = {
  key: string;
  eventType: ChaosEventType;
  severity: ChaosSeverity;
  scope: ChaosScope;
  minTotalStaff: number | null;
  maxTotalStaff: number | null;
  dailyChanceBps: number;
  minPenaltyBps: number;
  maxPenaltyBps: number;
  cooldownDays: number;
  maxOccurrencesPerDay: number;
  metadata: Prisma.InputJsonObject;
};

const balanceVersion = 1;
const seedSource = "10-ShiftSimulation_and_ShiftLineResult";

const chaosEventConfigs = [
  {
    key: "minor_staff_absence_small",
    eventType: ChaosEventType.STAFF_ABSENCE,
    severity: ChaosSeverity.MINOR,
    scope: ChaosScope.PRODUCTION_LINE,
    minTotalStaff: 1,
    maxTotalStaff: 50,
    dailyChanceBps: 1_200,
    minPenaltyBps: 9_500,
    maxPenaltyBps: 9_800,
    cooldownDays: 1,
    maxOccurrencesPerDay: 1,
    metadata: {
      balanceVersion,
      messageKey: "chaos.staff_absence.minor",
      seedSource,
      summary: "Small-factory line absence: light capacity loss on one line.",
      targetMinute: 70,
      tuningBand: "beta-v1",
    },
  },
  {
    key: "staff_absence_regular",
    eventType: ChaosEventType.STAFF_ABSENCE,
    severity: ChaosSeverity.MODERATE,
    scope: ChaosScope.DEPARTMENT,
    minTotalStaff: 51,
    maxTotalStaff: 150,
    dailyChanceBps: 2_200,
    minPenaltyBps: 9_200,
    maxPenaltyBps: 9_700,
    cooldownDays: 1,
    maxOccurrencesPerDay: 1,
    metadata: {
      balanceVersion,
      messageKey: "chaos.staff_absence.regular",
      seedSource,
      summary: "Mid-size factory absence: one department loses some capacity.",
      targetMinute: 85,
      tuningBand: "beta-v1",
    },
  },
  {
    key: "machine_minor_issue",
    eventType: ChaosEventType.MACHINE_BREAKDOWN,
    severity: ChaosSeverity.MINOR,
    scope: ChaosScope.PRODUCTION_LINE,
    minTotalStaff: null,
    maxTotalStaff: null,
    dailyChanceBps: 400,
    minPenaltyBps: 9_000,
    maxPenaltyBps: 9_700,
    cooldownDays: 2,
    maxOccurrencesPerDay: 1,
    metadata: {
      balanceVersion,
      messageKey: "chaos.machine.minor_issue",
      seedSource,
      summary: "Minor machine issue: one line runs slower for the shift.",
      targetMinute: 150,
      tuningBand: "beta-v1",
    },
  },
  {
    key: "power_flicker",
    eventType: ChaosEventType.POWER_ISSUE,
    severity: ChaosSeverity.MODERATE,
    scope: ChaosScope.FACTORY,
    minTotalStaff: null,
    maxTotalStaff: null,
    dailyChanceBps: 250,
    minPenaltyBps: 9_200,
    maxPenaltyBps: 9_700,
    cooldownDays: 4,
    maxOccurrencesPerDay: 1,
    metadata: {
      balanceVersion,
      messageKey: "chaos.power.flicker",
      seedSource,
      summary: "Short power instability: all active lines lose light capacity.",
      targetMinute: 210,
      tuningBand: "beta-v1",
    },
  },
  {
    key: "material_delay",
    eventType: ChaosEventType.MATERIAL_DELAY,
    severity: ChaosSeverity.MODERATE,
    scope: ChaosScope.DEPARTMENT,
    minTotalStaff: null,
    maxTotalStaff: null,
    dailyChanceBps: 300,
    minPenaltyBps: 8_500,
    maxPenaltyBps: 9_500,
    cooldownDays: 3,
    maxOccurrencesPerDay: 1,
    metadata: {
      balanceVersion,
      messageKey: "chaos.material.delay",
      seedSource,
      summary: "Material delay: one department loses meaningful capacity.",
      targetMinute: 110,
      tuningBand: "beta-v1",
    },
  },
  {
    key: "flu_wave",
    eventType: ChaosEventType.FLU_WAVE,
    severity: ChaosSeverity.MAJOR,
    scope: ChaosScope.FACTORY,
    minTotalStaff: 50,
    maxTotalStaff: null,
    dailyChanceBps: 150,
    minPenaltyBps: 8_000,
    maxPenaltyBps: 9_200,
    cooldownDays: 10,
    maxOccurrencesPerDay: 1,
    metadata: {
      balanceVersion,
      messageKey: "chaos.staff.flu_wave",
      seedSource,
      summary: "Rare flu wave: all active lines lose significant capacity.",
      targetMinute: 60,
      tuningBand: "beta-v1",
    },
  },
  {
    key: "bad_weather",
    eventType: ChaosEventType.BAD_WEATHER,
    severity: ChaosSeverity.MINOR,
    scope: ChaosScope.FACTORY,
    minTotalStaff: null,
    maxTotalStaff: null,
    dailyChanceBps: 100,
    minPenaltyBps: 9_000,
    maxPenaltyBps: 9_600,
    cooldownDays: 7,
    maxOccurrencesPerDay: 1,
    metadata: {
      balanceVersion,
      messageKey: "chaos.weather.bad_weather",
      seedSource,
      summary: "Bad weather: light factory-wide attendance and flow risk.",
      targetMinute: 35,
      tuningBand: "beta-v1",
    },
  },
] satisfies readonly ChaosEventConfigSeed[];

async function main() {
  validateSeeds(chaosEventConfigs);

  if (validateOnly) {
    console.log(
      `${chaosEventConfigs.length} chaos event config validated. No database writes performed.`,
    );
    return;
  }

  if (!prisma) {
    throw new Error("Prisma client could not be created.");
  }

  const sector = await prisma.sector.findUnique({
    where: { key: "textile" },
    select: { id: true },
  });

  if (!sector) {
    throw new Error('"textile" sektor kaydi bulunamadi.');
  }

  for (const config of chaosEventConfigs) {
    await prisma.chaosEventConfig.upsert({
      where: {
        sectorId_key: {
          key: config.key,
          sectorId: sector.id,
        },
      },
      create: {
        ...config,
        sectorId: sector.id,
        status: ContentStatus.ACTIVE,
      },
      update: {
        eventType: config.eventType,
        severity: config.severity,
        scope: config.scope,
        minTotalStaff: config.minTotalStaff,
        maxTotalStaff: config.maxTotalStaff,
        dailyChanceBps: config.dailyChanceBps,
        minPenaltyBps: config.minPenaltyBps,
        maxPenaltyBps: config.maxPenaltyBps,
        cooldownDays: config.cooldownDays,
        maxOccurrencesPerDay: config.maxOccurrencesPerDay,
        metadata: config.metadata,
        status: ContentStatus.ACTIVE,
      },
    });
  }

  console.log(
    `${chaosEventConfigs.length} textile chaos event config eklendi/guncellendi.`,
  );
}

function validateSeeds(configs: readonly ChaosEventConfigSeed[]) {
  for (const config of configs) {
    assertBps(config.dailyChanceBps, `${config.key}.dailyChanceBps`, {
      allowZero: true,
    });
    assertBps(config.minPenaltyBps, `${config.key}.minPenaltyBps`);
    assertBps(config.maxPenaltyBps, `${config.key}.maxPenaltyBps`);

    if (config.minPenaltyBps > config.maxPenaltyBps) {
      throw new Error(`${config.key}: minPenaltyBps maxPenaltyBps degerinden buyuk.`);
    }

    if (
      config.minTotalStaff !== null &&
      config.maxTotalStaff !== null &&
      config.minTotalStaff > config.maxTotalStaff
    ) {
      throw new Error(`${config.key}: staff araligi gecersiz.`);
    }

    if (config.cooldownDays < 0) {
      throw new Error(`${config.key}: cooldownDays negatif olamaz.`);
    }

    if (config.maxOccurrencesPerDay < 1) {
      throw new Error(`${config.key}: maxOccurrencesPerDay en az 1 olmali.`);
    }
  }
}

function assertBps(
  value: number,
  label: string,
  options: { allowZero?: boolean } = {},
) {
  const minimum = options.allowZero ? 0 : 1;

  if (!Number.isInteger(value) || value < minimum || value > 10_000) {
    throw new Error(`${label} 0-10000 araliginda integer olmali.`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });

import {
  ChaosEventType,
  ChaosScope,
  ChaosSeverity,
  ContentStatus,
  type Prisma,
} from "@/generated/prisma/client";

type ChaosEventClient = Prisma.TransactionClient;

export const CHAOS_EVENT_RETENTION_DAYS = 20;

type ChaosEventConfigForGeneration = {
  id: string;
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
  metadata: Prisma.JsonValue;
};

type ChaosProductionLineTarget = {
  id: string;
  departmentId: string;
};

type ExistingChaosEventForGeneration = {
  chaosEventConfigId: string | null;
  gameDay: number;
};

export type GeneratedChaosEventInput = {
  affectedStaffCount: number | null;
  chaosEventConfigId: string;
  departmentId: string | null;
  eventType: ChaosEventType;
  factoryProductionLineId: string | null;
  gameDay: number;
  messageKey: string | null;
  metadata: Prisma.InputJsonObject;
  penaltyBps: number;
  scope: ChaosScope;
  severity: ChaosSeverity;
};

export type FactoryChaosGenerationResult = {
  createdCount: number;
  events: GeneratedChaosEventInput[];
};

export function buildLineEventPenaltyBpsMap(input: {
  events: readonly Pick<
    GeneratedChaosEventInput,
    "departmentId" | "factoryProductionLineId" | "penaltyBps" | "scope"
  >[];
  productionLines: readonly ChaosProductionLineTarget[];
}) {
  const result = new Map<string, number>();

  for (const line of input.productionLines) {
    let eventPenaltyBps = 10_000;

    for (const event of input.events) {
      if (!doesChaosEventAffectLine(event, line)) continue;

      eventPenaltyBps = Math.floor(
        (eventPenaltyBps * clampBps(event.penaltyBps)) / 10_000,
      );
    }

    result.set(line.id, eventPenaltyBps);
  }

  return result;
}

export async function generateFactoryChaosEvents(input: {
  factoryId: string;
  gameDay: number;
  prisma: ChaosEventClient;
  productionLines: ChaosProductionLineTarget[];
  sectorId: string;
  shiftSimulationId: string;
  totalStaffCount: number;
}): Promise<FactoryChaosGenerationResult> {
  await deleteExpiredChaosEvents({
    factoryId: input.factoryId,
    gameDay: input.gameDay,
    prisma: input.prisma,
  });

  const configs = await input.prisma.chaosEventConfig.findMany({
    where: {
      sectorId: input.sectorId,
      status: ContentStatus.ACTIVE,
    },
    orderBy: [{ key: "asc" }, { id: "asc" }],
    select: {
      cooldownDays: true,
      dailyChanceBps: true,
      eventType: true,
      id: true,
      key: true,
      maxOccurrencesPerDay: true,
      maxPenaltyBps: true,
      maxTotalStaff: true,
      metadata: true,
      minPenaltyBps: true,
      minTotalStaff: true,
      scope: true,
      severity: true,
    },
  });

  if (configs.length === 0) {
    return { createdCount: 0, events: [] };
  }

  const configIds = configs.map((config) => config.id);
  const maxCooldownDays = Math.max(
    0,
    ...configs.map((config) => Math.max(0, config.cooldownDays)),
  );
  const [recentEvents, existingToday] = await Promise.all([
    maxCooldownDays > 0
      ? input.prisma.factoryChaosEvent.findMany({
          where: {
            chaosEventConfigId: { in: configIds },
            factoryId: input.factoryId,
            gameDay: {
              gte: input.gameDay - maxCooldownDays,
              lt: input.gameDay,
            },
          },
          select: {
            chaosEventConfigId: true,
            gameDay: true,
          },
        })
      : Promise.resolve([]),
    input.prisma.factoryChaosEvent.findMany({
      where: {
        chaosEventConfigId: { in: configIds },
        factoryId: input.factoryId,
        gameDay: input.gameDay,
      },
      select: {
        chaosEventConfigId: true,
        gameDay: true,
      },
    }),
  ]);

  const events = planFactoryChaosEvents({
    configs,
    existingToday,
    factoryId: input.factoryId,
    gameDay: input.gameDay,
    productionLines: input.productionLines,
    recentEvents,
    sectorId: input.sectorId,
    shiftSimulationId: input.shiftSimulationId,
    totalStaffCount: input.totalStaffCount,
  });

  if (events.length === 0) {
    return { createdCount: 0, events: [] };
  }

  await input.prisma.factoryChaosEvent.createMany({
    data: events.map((event) => ({
      affectedStaffCount: event.affectedStaffCount,
      chaosEventConfigId: event.chaosEventConfigId,
      departmentId: event.departmentId,
      eventType: event.eventType,
      factoryId: input.factoryId,
      factoryProductionLineId: event.factoryProductionLineId,
      gameDay: input.gameDay,
      messageKey: event.messageKey,
      metadata: event.metadata,
      penaltyBps: event.penaltyBps,
      scope: event.scope,
      severity: event.severity,
      shiftSimulationId: input.shiftSimulationId,
    })),
  });

  return {
    createdCount: events.length,
    events,
  };
}

export function planFactoryChaosEvents(input: {
  configs: readonly ChaosEventConfigForGeneration[];
  existingToday?: readonly ExistingChaosEventForGeneration[];
  factoryId: string;
  gameDay: number;
  productionLines: readonly ChaosProductionLineTarget[];
  recentEvents?: readonly ExistingChaosEventForGeneration[];
  sectorId: string;
  shiftSimulationId: string;
  totalStaffCount: number;
}): GeneratedChaosEventInput[] {
  const sortedLines = input.productionLines
    .filter((line) => line.id && line.departmentId)
    .slice()
    .sort(
      (first, second) =>
        first.departmentId.localeCompare(second.departmentId) ||
        first.id.localeCompare(second.id),
    );
  const departmentIds = Array.from(
    new Set(sortedLines.map((line) => line.departmentId)),
  ).sort();
  const existingTodayCountByConfigId = countEventsByConfigId(
    input.existingToday ?? [],
  );
  const recentEventsByConfigId = groupEventsByConfigId(input.recentEvents ?? []);
  const events: GeneratedChaosEventInput[] = [];

  for (const config of input.configs) {
    if (!isConfigEligibleForStaff(config, input.totalStaffCount)) continue;
    if (isConfigInCooldown(config, input.gameDay, recentEventsByConfigId)) {
      continue;
    }

    const existingTodayCount = existingTodayCountByConfigId.get(config.id) ?? 0;
    const maxOccurrences = Math.max(1, config.maxOccurrencesPerDay);
    const remainingOccurrences = Math.max(0, maxOccurrences - existingTodayCount);

    for (let occurrenceIndex = 0; occurrenceIndex < remainingOccurrences; occurrenceIndex += 1) {
      const chanceBps = clampBps(config.dailyChanceBps);
      if (chanceBps <= 0) continue;

      const rollSeed = buildChaosSeed({
        configKey: config.key,
        factoryId: input.factoryId,
        gameDay: input.gameDay,
        occurrenceIndex,
        purpose: "chance",
        sectorId: input.sectorId,
      });
      const randomBps = deterministicBps(rollSeed);

      if (randomBps >= chanceBps) continue;

      const target = selectChaosTarget({
        config,
        departmentIds,
        factoryId: input.factoryId,
        gameDay: input.gameDay,
        occurrenceIndex,
        sectorId: input.sectorId,
        sortedLines,
      });

      if (!target) continue;

      const penaltyBps = getDeterministicPenaltyBps({
        config,
        factoryId: input.factoryId,
        gameDay: input.gameDay,
        occurrenceIndex,
        sectorId: input.sectorId,
      });
      const affectedStaffCount = estimateAffectedStaffCount({
        config,
        penaltyBps,
        totalStaffCount: input.totalStaffCount,
      });
      const metadata = readJsonObject(config.metadata);

      events.push({
        affectedStaffCount,
        chaosEventConfigId: config.id,
        departmentId: target.departmentId,
        eventType: config.eventType,
        factoryProductionLineId: target.factoryProductionLineId,
        gameDay: input.gameDay,
        messageKey: readMetadataString(metadata, "messageKey") ?? `chaos.${config.key}`,
        metadata: {
          chanceBps,
          configKey: config.key,
          generatedBy: "factory-chaos-v1",
          occurrenceIndex,
          randomBps,
          seed: rollSeed,
          targetMinute: readMetadataNumber(metadata, "targetMinute"),
        },
        penaltyBps,
        scope: config.scope,
        severity: config.severity,
      });
    }
  }

  return events;
}

async function deleteExpiredChaosEvents(input: {
  factoryId: string;
  gameDay: number;
  prisma: ChaosEventClient;
}) {
  await input.prisma.factoryChaosEvent.deleteMany({
    where: {
      factoryId: input.factoryId,
      gameDay: {
        lt: input.gameDay - CHAOS_EVENT_RETENTION_DAYS,
      },
    },
  });
}

function isConfigEligibleForStaff(
  config: Pick<ChaosEventConfigForGeneration, "maxTotalStaff" | "minTotalStaff">,
  totalStaffCount: number,
) {
  if (config.minTotalStaff !== null && totalStaffCount < config.minTotalStaff) {
    return false;
  }

  if (config.maxTotalStaff !== null && totalStaffCount > config.maxTotalStaff) {
    return false;
  }

  return true;
}

function isConfigInCooldown(
  config: Pick<ChaosEventConfigForGeneration, "cooldownDays" | "id">,
  gameDay: number,
  recentEventsByConfigId: ReadonlyMap<string, readonly ExistingChaosEventForGeneration[]>,
) {
  if (config.cooldownDays <= 0) return false;

  return (recentEventsByConfigId.get(config.id) ?? []).some(
    (event) => event.gameDay + config.cooldownDays >= gameDay,
  );
}

function selectChaosTarget(input: {
  config: Pick<ChaosEventConfigForGeneration, "key" | "scope">;
  departmentIds: readonly string[];
  factoryId: string;
  gameDay: number;
  occurrenceIndex: number;
  sectorId: string;
  sortedLines: readonly ChaosProductionLineTarget[];
}) {
  if (input.config.scope === ChaosScope.FACTORY) {
    return { departmentId: null, factoryProductionLineId: null };
  }

  if (input.config.scope === ChaosScope.DEPARTMENT) {
    if (input.departmentIds.length === 0) return null;

    const departmentId = pickDeterministicItem({
      items: input.departmentIds,
      seed: buildChaosSeed({
        ...input,
        configKey: input.config.key,
        purpose: "department",
      }),
    });

    return { departmentId, factoryProductionLineId: null };
  }

  if (input.sortedLines.length === 0) return null;

  const line = pickDeterministicItem({
    items: input.sortedLines,
    seed: buildChaosSeed({
      ...input,
      configKey: input.config.key,
      purpose: "line",
    }),
  });

  return {
    departmentId: line.departmentId,
    factoryProductionLineId: line.id,
  };
}

function getDeterministicPenaltyBps(input: {
  config: Pick<
    ChaosEventConfigForGeneration,
    "key" | "maxPenaltyBps" | "minPenaltyBps"
  >;
  factoryId: string;
  gameDay: number;
  occurrenceIndex: number;
  sectorId: string;
}) {
  const minPenaltyBps = clampBps(input.config.minPenaltyBps);
  const maxPenaltyBps = Math.max(minPenaltyBps, clampBps(input.config.maxPenaltyBps));
  const range = maxPenaltyBps - minPenaltyBps;

  if (range <= 0) return minPenaltyBps;

  return (
    minPenaltyBps +
    (deterministicHash(
      buildChaosSeed({
        ...input,
        configKey: input.config.key,
        purpose: "penalty",
      }),
    ) %
      (range + 1))
  );
}

function estimateAffectedStaffCount(input: {
  config: Pick<ChaosEventConfigForGeneration, "eventType" | "severity">;
  penaltyBps: number;
  totalStaffCount: number;
}) {
  if (
    input.config.eventType !== ChaosEventType.STAFF_ABSENCE &&
    input.config.eventType !== ChaosEventType.FLU_WAVE &&
    input.config.eventType !== ChaosEventType.BAD_WEATHER
  ) {
    return null;
  }

  if (input.totalStaffCount <= 0) return 0;

  if (input.config.severity === ChaosSeverity.MAJOR) {
    return Math.min(
      input.totalStaffCount,
      Math.max(2, Math.round(input.totalStaffCount * 0.08)),
    );
  }

  if (input.config.severity === ChaosSeverity.MODERATE) {
    return Math.min(
      input.totalStaffCount,
      Math.max(1, Math.round(input.totalStaffCount * 0.03)),
    );
  }

  return Math.min(input.totalStaffCount, input.penaltyBps < 9_500 ? 2 : 1);
}

function doesChaosEventAffectLine(
  event: Pick<
    GeneratedChaosEventInput,
    "departmentId" | "factoryProductionLineId" | "scope"
  >,
  line: ChaosProductionLineTarget,
) {
  if (event.scope === ChaosScope.FACTORY) return true;

  if (event.scope === ChaosScope.DEPARTMENT) {
    return event.departmentId === line.departmentId;
  }

  return event.factoryProductionLineId === line.id;
}

function buildChaosSeed(input: {
  configKey: string;
  factoryId: string;
  gameDay: number;
  occurrenceIndex: number;
  purpose: string;
  sectorId: string;
}) {
  return [
    input.purpose,
    input.factoryId,
    input.sectorId,
    input.gameDay,
    input.configKey,
    input.occurrenceIndex,
  ].join(":");
}

export function deterministicBps(seed: string) {
  return deterministicHash(seed) % 10_000;
}

function deterministicHash(seed: string) {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function pickDeterministicItem<T>(input: { items: readonly T[]; seed: string }) {
  return input.items[deterministicHash(input.seed) % input.items.length];
}

function countEventsByConfigId(events: readonly ExistingChaosEventForGeneration[]) {
  const result = new Map<string, number>();

  for (const event of events) {
    if (!event.chaosEventConfigId) continue;
    result.set(
      event.chaosEventConfigId,
      (result.get(event.chaosEventConfigId) ?? 0) + 1,
    );
  }

  return result;
}

function groupEventsByConfigId(events: readonly ExistingChaosEventForGeneration[]) {
  const result = new Map<string, ExistingChaosEventForGeneration[]>();

  for (const event of events) {
    if (!event.chaosEventConfigId) continue;

    const current = result.get(event.chaosEventConfigId) ?? [];
    current.push(event);
    result.set(event.chaosEventConfigId, current);
  }

  return result;
}

function readJsonObject(value: Prisma.JsonValue): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readMetadataString(
  metadata: Prisma.JsonObject,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" ? value : null;
}

function readMetadataNumber(
  metadata: Prisma.JsonObject,
  key: string,
): number | null {
  const value = metadata[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampBps(value: number) {
  if (!Number.isFinite(value)) return 10_000;

  return Math.min(10_000, Math.max(0, Math.round(value)));
}

import type {
  ShiftPlayback,
  ShiftPlaybackTimelineEvent,
  ShiftQuantityPoint,
} from "./types";

export const SHIFT_PLAYBACK_DURATION_SECONDS = 20;
export const SHIFT_PLAYBACK_GAME_MINUTES = 540;
export const SHIFT_PLAYBACK_GAME_START_MINUTE = 8 * 60;

export type ShiftPlaybackRecord = {
  id: string;
  factoryId: string;
  gameDay: number;
  status: ShiftPlayback["simulationStatus"];
  simulationVersion: string;
  simulationDurationSeconds: number;
  completedAt: Date | null;
  totalProducedQuantity: number;
  activeLineCount: number;
  blockedLineCount: number;
  averageUtilizationBps: number;
  departmentResults: Array<{
    departmentId: string;
    activeLineCount: number;
    startingQueueQuantity: number;
    queueEnteredQuantity: number;
    producedQuantity: number;
    endingQueueQuantity: number;
    productionStartMinute: number | null;
    productionEndMinute: number | null;
    department: {
      key: string;
      translations: Array<{ name: string }>;
    };
  }>;
  productResults?: ShiftPlayback["productResults"];
  timelineEvents?: ShiftPlaybackTimelineEvent[];
};

export function toShiftPlayback(
  record: ShiftPlaybackRecord,
  now: Date = new Date(),
): ShiftPlayback | null {
  if (!record.completedAt) return null;

  const durationSeconds = Math.max(
    1,
    record.simulationDurationSeconds || SHIFT_PLAYBACK_DURATION_SECONDS,
  );
  const playbackEndsAt = new Date(
    record.completedAt.getTime() + durationSeconds * 1000,
  );

  return {
    shiftId: record.id,
    factoryId: record.factoryId,
    simulatedGameDay: record.gameDay,
    nextGameDay: record.gameDay + 1,
    simulationStatus: record.status,
    simulationVersion: record.simulationVersion,
    playbackStartedAt: record.completedAt.toISOString(),
    playbackEndsAt: playbackEndsAt.toISOString(),
    playbackDurationSeconds: durationSeconds,
    isActive: now.getTime() < playbackEndsAt.getTime(),
    summary: {
      totalProducedQuantity: record.totalProducedQuantity,
      activeLineCount: record.activeLineCount,
      blockedLineCount: record.blockedLineCount,
      averageUtilizationBps: record.averageUtilizationBps,
    },
    departmentResults: record.departmentResults.map((result) => ({
      activeLineCount: result.activeLineCount,
      departmentCode: result.department.key,
      departmentId: result.departmentId,
      departmentName:
        result.department.translations[0]?.name ?? toTitle(result.department.key),
      endingQueueQuantity: result.endingQueueQuantity,
      performance: {
        capacityLossBps: 0,
        effectiveCapacityPoints: 0,
        efficiencyBps: 0,
        nominalCapacityPoints: 0,
        queueLoadPoints: 0,
        unusedPoints: 0,
        usedPoints: 0,
      },
      producedQuantity: result.producedQuantity,
      producedTimeline: buildProducedTimeline({
        productionEndMinute: result.productionEndMinute,
        producedQuantity: result.producedQuantity,
      }),
      productionEndMinute: result.productionEndMinute,
      productionStartMinute: result.productionStartMinute,
      queueEnteredQuantity: result.queueEnteredQuantity,
      queueEnteredTimeline: buildQueueEnteredTimeline(
        result.queueEnteredQuantity,
      ),
      startingQueueQuantity: result.startingQueueQuantity,
    })),
    productResults: record.productResults ?? [],
    timelineEvents: record.timelineEvents ?? [],
  };
}

export function isShiftPlaybackActive(
  playback: Pick<ShiftPlayback, "playbackEndsAt">,
  nowMs: number = Date.now(),
) {
  return nowMs < Date.parse(playback.playbackEndsAt);
}

export function getShiftPlaybackProgress(
  playback: Pick<
    ShiftPlayback,
    "playbackDurationSeconds" | "playbackStartedAt"
  >,
  nowMs: number,
) {
  const durationMs = Math.max(1, playback.playbackDurationSeconds * 1000);
  const elapsedMs = nowMs - Date.parse(playback.playbackStartedAt);

  return Math.min(1, Math.max(0, elapsedMs / durationMs));
}

export function getShiftPlaybackMinute(
  playback: Pick<
    ShiftPlayback,
    "playbackDurationSeconds" | "playbackStartedAt"
  >,
  nowMs: number,
) {
  return Math.floor(
    getShiftPlaybackProgress(playback, nowMs) * SHIFT_PLAYBACK_GAME_MINUTES,
  );
}

export function formatShiftPlaybackTime(shiftMinute: number) {
  const totalMinutes =
    SHIFT_PLAYBACK_GAME_START_MINUTE +
    Math.min(SHIFT_PLAYBACK_GAME_MINUTES, Math.max(0, shiftMinute));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getShiftQuantityAtMinute(
  timeline: ShiftQuantityPoint[],
  shiftMinute: number,
) {
  const first = timeline[0];

  if (!first) return 0;
  if (shiftMinute <= first.minute) return first.quantity;

  for (let index = 1; index < timeline.length; index += 1) {
    const previous = timeline[index - 1];
    const next = timeline[index];

    if (!previous || !next) continue;
    if (shiftMinute > next.minute) continue;

    const duration = next.minute - previous.minute;

    if (duration <= 0) return next.quantity;

    const progress = (shiftMinute - previous.minute) / duration;

    return Math.round(
      previous.quantity + (next.quantity - previous.quantity) * progress,
    );
  }

  return timeline.at(-1)?.quantity ?? 0;
}

function buildProducedTimeline(input: {
  productionEndMinute: number | null;
  producedQuantity: number;
}): ShiftQuantityPoint[] {
  if (input.producedQuantity <= 0) {
    return [
      { minute: 0, quantity: 0 },
      { minute: SHIFT_PLAYBACK_GAME_MINUTES, quantity: 0 },
    ];
  }

  return [
    { minute: 0, quantity: 0 },
    {
      minute: Math.min(
        SHIFT_PLAYBACK_GAME_MINUTES,
        Math.max(1, input.productionEndMinute ?? SHIFT_PLAYBACK_GAME_MINUTES),
      ),
      quantity: input.producedQuantity,
    },
  ];
}

function buildQueueEnteredTimeline(quantity: number): ShiftQuantityPoint[] {
  return [
    { minute: 0, quantity: 0 },
    { minute: SHIFT_PLAYBACK_GAME_MINUTES, quantity: Math.max(0, quantity) },
  ];
}

function toTitle(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

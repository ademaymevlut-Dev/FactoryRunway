import {
  ShiftSimulationStatus,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

import { SHIFT_PLAYBACK_DURATION_SECONDS, toShiftPlayback } from "../shift-playback";
import type { ShiftPlayback } from "../types";
import {
  getShiftDepartmentPerformance,
  getShiftProductResults,
  getShiftTimelineEvents,
} from "./shift-playback-projection";

type ShiftPlaybackClient = PrismaClient | Prisma.TransactionClient;

export type ShiftPlaybackReference = {
  factoryId: string;
  shiftId: string;
  simulatedGameDay: number;
};

const shiftPlaybackSelect = {
  id: true,
  factoryId: true,
  gameDay: true,
  status: true,
  simulationVersion: true,
  simulationDurationSeconds: true,
  completedAt: true,
  totalProducedQuantity: true,
  activeLineCount: true,
  blockedLineCount: true,
  averageUtilizationBps: true,
  departmentResults: {
    orderBy: [
      { department: { routeOrder: "asc" } },
      { department: { key: "asc" } },
    ],
    select: {
      activeLineCount: true,
      departmentId: true,
      endingQueueQuantity: true,
      producedQuantity: true,
      productionEndMinute: true,
      productionStartMinute: true,
      queueEnteredQuantity: true,
      startingQueueQuantity: true,
      department: {
        select: {
          key: true,
          translations: {
            where: { locale: "tr" },
            select: { name: true },
          },
        },
      },
    },
  },
} satisfies Prisma.ShiftSimulationSelect;

export async function getActiveShiftPlayback(input: {
  factoryId: string;
  prisma: ShiftPlaybackClient;
  now?: Date;
}): Promise<ShiftPlayback | null> {
  const playback = await getLatestShiftPlayback(input);

  return playback?.isActive ? playback : null;
}

export async function getActiveShiftPlaybackReference(input: {
  factoryId: string;
  prisma: ShiftPlaybackClient;
  now?: Date;
}): Promise<ShiftPlaybackReference | null> {
  const shift = await input.prisma.shiftSimulation.findFirst({
    where: {
      factoryId: input.factoryId,
      completedAt: { not: null },
      status: ShiftSimulationStatus.COMPLETED,
    },
    orderBy: [{ completedAt: "desc" }, { gameDay: "desc" }],
    select: {
      completedAt: true,
      factoryId: true,
      gameDay: true,
      id: true,
      simulationDurationSeconds: true,
    },
  });

  if (!shift?.completedAt) return null;

  const durationSeconds = Math.max(
    1,
    shift.simulationDurationSeconds || SHIFT_PLAYBACK_DURATION_SECONDS,
  );
  const playbackEndsAtMs =
    shift.completedAt.getTime() + durationSeconds * 1_000;
  const nowMs = (input.now ?? new Date()).getTime();

  if (nowMs >= playbackEndsAtMs) return null;

  return {
    factoryId: shift.factoryId,
    shiftId: shift.id,
    simulatedGameDay: shift.gameDay,
  };
}

export async function getLatestReviewableShiftPlayback(input: {
  currentDay: number;
  factoryId: string;
  prisma: ShiftPlaybackClient;
  now?: Date;
}): Promise<ShiftPlayback | null> {
  const playback = await getLatestShiftPlayback(input);

  if (!playback) return null;

  return playback.nextGameDay === input.currentDay ? playback : null;
}

export async function getLatestShiftPlayback(input: {
  factoryId: string;
  prisma: ShiftPlaybackClient;
  now?: Date;
}): Promise<ShiftPlayback | null> {
  const shift = await input.prisma.shiftSimulation.findFirst({
    where: {
      factoryId: input.factoryId,
      completedAt: { not: null },
      status: ShiftSimulationStatus.COMPLETED,
    },
    orderBy: [{ completedAt: "desc" }, { gameDay: "desc" }],
    select: shiftPlaybackSelect,
  });

  return shift ? enrichShiftPlayback({ playback: toShiftPlayback(shift, input.now), prisma: input.prisma }) : null;
}

export async function getShiftPlaybackById(input: {
  shiftId: string;
  prisma: ShiftPlaybackClient;
  now?: Date;
}): Promise<ShiftPlayback | null> {
  const shift = await input.prisma.shiftSimulation.findUnique({
    where: { id: input.shiftId },
    select: shiftPlaybackSelect,
  });

  return shift ? enrichShiftPlayback({ playback: toShiftPlayback(shift, input.now), prisma: input.prisma }) : null;
}

async function enrichShiftPlayback(input: {
  playback: ShiftPlayback | null;
  prisma: ShiftPlaybackClient;
}) {
  if (!input.playback) return null;
  if (
    !("shiftLineResult" in input.prisma) ||
    !("factoryFinanceTransaction" in input.prisma) ||
    !("factoryXpTransaction" in input.prisma)
  ) {
    return input.playback;
  }

  const [departmentPerformance, productResults, timelineEvents] = await Promise.all([
    getShiftDepartmentPerformance({
      prisma: input.prisma,
      shiftId: input.playback.shiftId,
    }),
    getShiftProductResults({
      prisma: input.prisma,
      shiftId: input.playback.shiftId,
    }),
    getShiftTimelineEvents({
      factoryId: input.playback.factoryId,
      gameDay: input.playback.simulatedGameDay,
      prisma: input.prisma,
      shift: input.playback,
    }),
  ]);

  return {
    ...input.playback,
    departmentResults: input.playback.departmentResults.map((department) => ({
      ...department,
      performance:
        departmentPerformance.get(department.departmentId) ??
        department.performance,
    })),
    productResults,
    timelineEvents,
  };
}

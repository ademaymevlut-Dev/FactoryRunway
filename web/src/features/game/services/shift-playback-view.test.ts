import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveShiftPlayback,
  getLatestShiftPlayback,
} from "./shift-playback-view";

function buildPrisma(completedAt: Date) {
  return {
    shiftSimulation: {
      findFirst: async () => ({
        id: "shift-1",
        factoryId: "factory-1",
        gameDay: 4,
        status: "COMPLETED" as const,
        simulationVersion: "v1",
        simulationDurationSeconds: 20,
        completedAt,
        totalProducedQuantity: 300,
        activeLineCount: 2,
        blockedLineCount: 0,
        averageUtilizationBps: 9000,
        departmentResults: [
          {
            activeLineCount: 2,
            departmentId: "department-1",
            endingQueueQuantity: 150,
            producedQuantity: 650,
            productionEndMinute: 439,
            productionStartMinute: 0,
            queueEnteredQuantity: 0,
            startingQueueQuantity: 800,
            department: {
              key: "sewing",
              translations: [{ name: "Dikim" }],
            },
          },
        ],
      }),
    },
  } as unknown as Parameters<typeof getActiveShiftPlayback>[0]["prisma"];
}

test("sayfa yenilemesinde süresi devam eden son playback tekrar okunur", async () => {
  const playback = await getActiveShiftPlayback({
    factoryId: "factory-1",
    now: new Date("2026-07-11T10:00:15.000Z"),
    prisma: buildPrisma(new Date("2026-07-11T10:00:00.000Z")),
  });

  assert.ok(playback);
  assert.equal(playback.shiftId, "shift-1");
  assert.equal(playback.simulatedGameDay, 4);
  assert.equal(playback.nextGameDay, 5);
  assert.deepEqual(playback.departmentResults[0], {
    activeLineCount: 2,
    departmentCode: "sewing",
    departmentId: "department-1",
    departmentName: "Dikim",
    endingQueueQuantity: 150,
    performance: {
      capacityLossBps: 0,
      effectiveCapacityPoints: 0,
      efficiencyBps: 0,
      nominalCapacityPoints: 0,
      queueLoadPoints: 0,
      unusedPoints: 0,
      usedPoints: 0,
    },
    producedQuantity: 650,
    producedTimeline: [
      { minute: 0, quantity: 0 },
      { minute: 439, quantity: 650 },
    ],
    productionEndMinute: 439,
    productionStartMinute: 0,
    queueEnteredQuantity: 0,
    queueEnteredTimeline: [
      { minute: 0, quantity: 0 },
      { minute: 540, quantity: 0 },
    ],
    startingQueueQuantity: 800,
  });
});

test("süresi dolmuş vardiya aktif playback olarak dönmez", async () => {
  const prisma = buildPrisma(new Date("2026-07-11T10:00:00.000Z"));
  const active = await getActiveShiftPlayback({
    factoryId: "factory-1",
    now: new Date("2026-07-11T10:00:20.000Z"),
    prisma,
  });
  const latest = await getLatestShiftPlayback({
    factoryId: "factory-1",
    now: new Date("2026-07-11T10:00:20.000Z"),
    prisma,
  });

  assert.equal(active, null);
  assert.ok(latest);
  assert.equal(latest.isActive, false);
});

test("departman sonuçlarını routeOrder ve key ile deterministik ister", async () => {
  let capturedQuery: Record<string, unknown> | null = null;
  const prisma = {
    shiftSimulation: {
      findFirst: async (query: Record<string, unknown>) => {
        capturedQuery = query;
        return null;
      },
    },
  } as unknown as Parameters<typeof getLatestShiftPlayback>[0]["prisma"];

  await getLatestShiftPlayback({ factoryId: "factory-1", prisma });

  const select = (
    capturedQuery as {
      select?: {
        departmentResults?: {
          orderBy?: unknown;
        };
      };
    } | null
  )?.select;

  assert.deepEqual(select?.departmentResults?.orderBy, [
    { department: { routeOrder: "asc" } },
    { department: { key: "asc" } },
  ]);
});

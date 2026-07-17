import assert from "node:assert/strict";
import test from "node:test";

import {
  formatShiftPlaybackTime,
  getShiftPlaybackMinute,
  getShiftQuantityAtMinute,
  isShiftPlaybackActive,
  SHIFT_PLAYBACK_DURATION_SECONDS,
  toShiftPlayback,
  type ShiftPlaybackRecord,
} from "./shift-playback";

function buildRecord(
  overrides: Partial<ShiftPlaybackRecord> = {},
): ShiftPlaybackRecord {
  return {
    id: "shift-1",
    factoryId: "factory-1",
    gameDay: 7,
    status: "COMPLETED",
    simulationVersion: "v1",
    simulationDurationSeconds: SHIFT_PLAYBACK_DURATION_SECONDS,
    completedAt: new Date("2026-07-11T10:00:00.000Z"),
    totalProducedQuantity: 420,
    activeLineCount: 3,
    blockedLineCount: 1,
    averageUtilizationBps: 8750,
    departmentResults: [],
    ...overrides,
  };
}

test("simulatedGameDay ile nextGameDay değerlerini ayrı tutar", () => {
  const playback = toShiftPlayback(
    buildRecord(),
    new Date("2026-07-11T10:00:10.000Z"),
  );

  assert.ok(playback);
  assert.equal(playback.simulatedGameDay, 7);
  assert.equal(playback.nextGameDay, 8);
});

test("completedAt değerini kalıcı playback başlangıç ankrajı olarak kullanır", () => {
  const playback = toShiftPlayback(
    buildRecord(),
    new Date("2026-07-11T10:00:19.999Z"),
  );

  assert.ok(playback);
  assert.equal(playback.playbackStartedAt, "2026-07-11T10:00:00.000Z");
  assert.equal(playback.playbackEndsAt, "2026-07-11T10:00:20.000Z");
  assert.equal(playback.playbackDurationSeconds, 20);
  assert.equal(playback.isActive, true);
});

test("20 saniye dolduğunda playback aktif sayılmaz", () => {
  const playback = toShiftPlayback(
    buildRecord(),
    new Date("2026-07-11T10:00:20.000Z"),
  );

  assert.ok(playback);
  assert.equal(playback.isActive, false);
  assert.equal(
    isShiftPlaybackActive(playback, Date.parse(playback.playbackEndsAt)),
    false,
  );
});

test("gelecek departman ve timeline verileri için genişletilebilir boş alanlar döndürür", () => {
  const playback = toShiftPlayback(buildRecord());

  assert.ok(playback);
  assert.deepEqual(playback.departmentResults, []);
  assert.deepEqual(playback.timelineEvents, []);
  assert.deepEqual(playback.summary, {
    totalProducedQuantity: 420,
    activeLineCount: 3,
    blockedLineCount: 1,
    averageUtilizationBps: 8750,
  });
});

test("tamamlanmamış vardiya için playback üretmez", () => {
  assert.equal(toShiftPlayback(buildRecord({ completedAt: null })), null);
});

test("tek global saat 0, 10 ve 20 saniyeyi 08:00, 12:30 ve 17:00'a eşler", () => {
  const playback = toShiftPlayback(buildRecord());

  assert.ok(playback);
  const startedAt = Date.parse(playback.playbackStartedAt);

  assert.equal(
    formatShiftPlaybackTime(getShiftPlaybackMinute(playback, startedAt)),
    "08:00",
  );
  assert.equal(
    formatShiftPlaybackTime(
      getShiftPlaybackMinute(playback, startedAt + 10_000),
    ),
    "12:30",
  );
  assert.equal(
    formatShiftPlaybackTime(
      getShiftPlaybackMinute(playback, startedAt + 20_000),
    ),
    "17:00",
  );
});

test("erken biten departman sayacı bitiş dakikasından sonra finalde kalır", () => {
  const timeline = [
    { minute: 0, quantity: 0 },
    { minute: 270, quantity: 650 },
  ];

  assert.equal(getShiftQuantityAtMinute(timeline, 135), 325);
  assert.equal(getShiftQuantityAtMinute(timeline, 270), 650);
  assert.equal(getShiftQuantityAtMinute(timeline, 540), 650);
});

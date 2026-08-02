import assert from "node:assert/strict";
import test from "node:test";

import { resolveShiftControlState } from "./shift-control-state";

test("vardiya kontrolü idle, loading, running ve completed durumlarını ayırır", () => {
  assert.equal(
    resolveShiftControlState({
      hasPlayback: false,
      isPlaybackActive: false,
      pending: false,
    }),
    "idle",
  );
  assert.equal(
    resolveShiftControlState({
      hasPlayback: false,
      isPlaybackActive: false,
      pending: true,
    }),
    "pending",
  );
  assert.equal(
    resolveShiftControlState({
      hasPlayback: true,
      isPlaybackActive: true,
      pending: false,
    }),
    "running",
  );
  assert.equal(
    resolveShiftControlState({
      hasPlayback: true,
      isPlaybackActive: false,
      pending: false,
    }),
    "completed",
  );
});

test("pending durumu mevcut playback olsa da çift submit kilidine öncelik verir", () => {
  assert.equal(
    resolveShiftControlState({
      hasPlayback: true,
      isPlaybackActive: true,
      pending: true,
    }),
    "pending",
  );
});

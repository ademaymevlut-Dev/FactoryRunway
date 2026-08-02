export type ShiftControlState =
  | "idle"
  | "pending"
  | "running"
  | "completed";

export function resolveShiftControlState({
  hasPlayback,
  isPlaybackActive,
  pending,
}: {
  hasPlayback: boolean;
  isPlaybackActive: boolean;
  pending: boolean;
}): ShiftControlState {
  if (pending) return "pending";
  if (isPlaybackActive) return "running";
  if (hasPlayback) return "completed";

  return "idle";
}

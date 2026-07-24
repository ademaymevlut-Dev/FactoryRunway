function parseTimeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`Geçersiz vardiya saati: ${value}`);
  }

  return hour * 60 + minute;
}

export function formatShiftSimulationTime(
  startTime: string,
  endTime: string,
  progress: number,
) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const displayMinutes = Math.round(
    startMinutes + (endMinutes - startMinutes) * clampedProgress,
  );
  const hour = Math.floor(displayMinutes / 60) % 24;
  const minute = displayMinutes % 60;

  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

export function formatShiftSimulationNumber(
  value: number,
  locale: string,
) {
  return new Intl.NumberFormat(locale).format(value);
}

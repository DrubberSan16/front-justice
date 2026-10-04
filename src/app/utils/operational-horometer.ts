import { parseAppDate } from "@/app/utils/date-time";

export function operationalHours(base: unknown, state: unknown, since: unknown, now = Date.now()) {
  const reading = Number(base);
  const start = parseAppDate(since)?.getTime();
  const elapsed = state === "FUNCIONAMIENTO" && start != null ? Math.max(0, now - start) / 3600000 : 0;
  return Math.max(0, (Number.isFinite(reading) ? reading : 0) + elapsed);
}

/** Whole hours, minutes and seconds; advancing one second never rounds up the hour. */
export function operationalClock(base: unknown, state: unknown, since: unknown, now = Date.now()) {
  const seconds = Math.floor(operationalHours(base, state, since, now) * 3600 + 0.00001);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

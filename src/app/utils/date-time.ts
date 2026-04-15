const APP_TIME_ZONE = "America/Guayaquil";
const ECUADOR_OFFSET = "-05:00";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/;

function pad(value: string | number) {
  return String(value).padStart(2, "0");
}

function buildFormatterParts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).formatToParts(date);
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return parts.find((item) => item.type === type)?.value ?? "";
}

function normalizeDateInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return `${trimmed}T00:00:00${ECUADOR_OFFSET}`;
  }

  if (DATE_TIME_PATTERN.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}${ECUADOR_OFFSET}`;
  }

  return trimmed;
}

export function parseAppDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const parsed = new Date(normalizeDateInput(raw));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(
  value: unknown,
  fallback = "",
): string {
  const parsed = parseAppDate(value);
  if (!parsed) return fallback || (value == null ? "" : String(value));

  const parts = buildFormatterParts(parsed, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const day = getPart(parts, "day");
  const month = getPart(parts, "month");
  const year = getPart(parts, "year");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const second = getPart(parts, "second");

  return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
}

export function formatDateOnly(
  value: unknown,
  fallback = "",
): string {
  const parsed = parseAppDate(value);
  if (!parsed) return fallback || (value == null ? "" : String(value));

  const parts = buildFormatterParts(parsed, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const day = getPart(parts, "day");
  const month = getPart(parts, "month");
  const year = getPart(parts, "year");
  return `${day}-${month}-${year}`;
}

export function formatDateForInput(value: unknown = new Date()): string {
  const parsed = parseAppDate(value) ?? new Date();
  const parts = buildFormatterParts(parsed, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  return `${year}-${month}-${day}`;
}

export function looksLikeDateValue(value: unknown): boolean {
  if (value instanceof Date) return true;
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  if (DATE_ONLY_PATTERN.test(raw) || DATE_TIME_PATTERN.test(raw)) return true;
  return /T\d{2}:\d{2}:\d{2}/.test(raw) || /\d{4}-\d{2}-\d{2}/.test(raw);
}

export function currentDateTimeLabel() {
  return formatDateTime(new Date(), "");
}

export function currentDateInputValue() {
  return formatDateForInput(new Date());
}

export function currentTimeValue() {
  const parsed = parseAppDate(new Date()) ?? new Date();
  const parts = buildFormatterParts(parsed, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${pad(getPart(parts, "hour"))}:${pad(getPart(parts, "minute"))}:${pad(getPart(parts, "second"))}`;
}

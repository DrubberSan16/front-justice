export function formatNumberForDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);

  return parsed.toString();
}


export function formatNumberForDisplay(value) {
    if (value === null || value === undefined || value === "")
        return "";
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return String(value);
    return parsed.toString();
}

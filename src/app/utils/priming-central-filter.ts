type CentralRow = { central?: unknown };
type LocationRow = { codigo?: unknown; nombre?: unknown };

function centralLabel(row: CentralRow): string {
  return String(row.central ?? "").trim() || "Sin ubicación";
}

/** Las opciones incluyen ubicaciones sin consumo en las fechas seleccionadas. */
export function buildPrimingCentralOptions(
  locations: LocationRow[],
  rows: CentralRow[],
): string[] {
  const labels = locations.map(location =>
    [location.codigo, location.nombre]
      .map(value => String(value ?? "").trim())
      .filter(Boolean)
      .join(" - "),
  ).filter(Boolean);
  return [...new Set([...labels, ...rows.map(centralLabel)])]
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

export function filterPrimingRows<T extends CentralRow>(rows: T[], central: string | null): T[] {
  return rows.filter(row => !central || centralLabel(row) === central);
}

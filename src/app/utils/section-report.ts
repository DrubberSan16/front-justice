import type {
  ReportColumn,
  ReportDefinition,
  ReportSummaryItem,
} from "@/app/utils/maintenance-intelligence-reports";

/**
 * Reporte de una seccion de tablero, armado con lo que ya esta en pantalla.
 *
 * Los tableros mostraban tablas que no se podian llevar a ningun lado: para
 * mandar una cifra a alguien habia que capturar la pantalla. Esto toma las
 * mismas columnas y las mismas filas que el usuario esta viendo -- no una
 * consulta nueva -- para que el archivo diga exactamente lo mismo que la
 * pantalla, incluidos los filtros aplicados.
 */
export type SectionReportColumn = {
  key: string;
  title: string;
  format?: ReportColumn["format"];
  width?: number;
};

export type SectionReportOptions = {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: SectionReportColumn[];
  rows: Record<string, any>[];
  summary?: ReportSummaryItem[];
  note?: string;
  sheetName?: string;
  orientation?: "portrait" | "landscape";
};

/** Columnas sin titulo (acciones, iconos) no viajan al archivo. */
function exportableColumns(columns: SectionReportColumn[]) {
  return columns.filter(
    (column) => column.key && column.key !== "actions" && column.title?.trim(),
  );
}

/**
 * Aplana un valor de celda a algo imprimible. Los objetos que la tabla pinta
 * como chip (`{ etiqueta }`, `{ nivel }`) se reducen a su texto.
 */
function toCellValue(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.map(toCellValue).join(" | ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const label = record.etiqueta ?? record.label ?? record.nombre ?? record.nivel;
    return label === undefined ? "" : String(label);
  }
  return value as string | number;
}

export function buildSectionReport(
  options: SectionReportOptions,
): ReportDefinition {
  const columns = exportableColumns(options.columns);
  return {
    fileName: options.fileName,
    title: options.title,
    subtitle: options.subtitle,
    // Sin orientacion pedida la decide el ancho real de la tabla.
    orientation: options.orientation,
    summary: options.summary,
    sheets: [
      {
        name: options.sheetName || options.title.slice(0, 28) || "Detalle",
        fitColumnsToPage: true,
        note: options.note,
        rows: options.rows.map((row) =>
          Object.fromEntries(
            columns.map((column) => [column.key, toCellValue(row?.[column.key])]),
          ),
        ),
        columns: columns.map((column) => ({
          key: column.key,
          header: column.title,
          width: column.width,
          format: column.format,
        })),
      },
    ],
  };
}

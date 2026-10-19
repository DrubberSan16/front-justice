import { formatDateTime } from "@/app/utils/date-time";
import type { ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";
export type EquipmentLocationEntry = {
  id: string;
  location_codigo: string | null;
  location_nombre: string | null;
  sucursal_codigo: string | null;
  sucursal_nombre: string | null;
  valid_from: string;
  valid_to: string | null;
  source: string;
  recorded_by?: string | null;
};
export function equipmentLocationReport(
  equipment: Array<Record<string, any>>,
): ReportDefinition {
  const rows = equipment.flatMap((e) =>
    (e.historial_ubicaciones || []).map((h: EquipmentLocationEntry) => ({
      equipo: [e.codigo, e.nombre_real || e.nombre].filter(Boolean).join(" · "),
      serie: e.serie || "Sin registrar",
      desde: h.valid_from,
      hasta: h.valid_to ? formatDateTime(h.valid_to) : "Actual",
      ubicacion:
        [h.location_codigo, h.location_nombre].filter(Boolean).join(" · ") ||
        "Sin ubicación",
      sucursal:
        [h.sucursal_codigo, h.sucursal_nombre].filter(Boolean).join(" · ") ||
        "Sin sucursal",
      origen:
        h.source === "BASELINE_OBSERVED"
          ? "Referencia inicial observada"
          : h.source === "EQUIPMENT_CREATED"
            ? "Alta del equipo"
            : h.source === "EQUIPMENT_MOVED"
              ? "Traslado de equipo"
              : "Cambio en ubicación o sucursal",
    })),
  );
  return {
    title: "Historial de ubicaciones de equipos",
    subtitle: "Ubicación y sucursal conservadas por período",
    fileName: "historial-ubicaciones-equipos",
    compactPdf: true,
    summary: [
      { label: "Equipos", value: equipment.length },
      { label: "Permanencias registradas", value: rows.length },
    ],
    sheets: [
      {
        name: "Línea de tiempo de ubicaciones",
        note: "La referencia inicial indica desde cuándo se observa la ubicación; no acredita una fecha de llegada anterior. Se consultan las últimas 100 permanencias por equipo. Las OT conservan su ubicación al iniciar la ejecución.",
        fitColumnsToPage: true,
        columns: [
          { key: "equipo", header: "Equipo", width: 32 },
          { key: "serie", header: "Serie", width: 20 },
          {
            key: "desde",
            header: "Desde (observado)",
            format: "datetime",
            width: 23,
          },
          { key: "hasta", header: "Hasta", width: 23 },
          { key: "ubicacion", header: "Ubicación", width: 30 },
          { key: "sucursal", header: "Sucursal", width: 25 },
          { key: "origen", header: "Origen", width: 25 },
        ],
        rows,
        emptyMessage: "Sin historial registrado.",
      },
    ],
  };
}

import { formatDateOnly } from "@/app/utils/date-time";
import { buildSectionReport, type SectionReportColumn } from "@/app/utils/section-report";
import type { ReportChart } from "@/app/utils/maintenance-intelligence-reports";

type Row = Record<string, any>;

export function buildOilOrderReport(options: {
  rows: Row[];
  mode: "control" | "management";
  subtitle: string;
  fileName: string;
  showCosts: boolean;
  charts?: ReportChart[];
}) {
  const management = options.mode === "management";
  const hasPriming = options.rows.some(row => String(row.maintenance_kind || row.tipo).toUpperCase() === "CEBADO");
  const hasOther = !options.rows.length || options.rows.some(row => String(row.maintenance_kind || row.tipo).toUpperCase() !== "CEBADO");
  const columns: SectionReportColumn[] = management ? [
    { key: "fecha", title: "Fecha", width: 11 },
    { key: "central", title: "Central (sucursal)", width: 18 },
    { key: "equipo", title: "Equipo (UG - marca)", width: 20 },
    { key: "reserva", title: "Reserva", width: 12 },
    { key: "orden", title: "OT (orden de trabajo)", width: 13 },
    { key: "tipo", title: "Tipo", width: 15 },
    ...(hasOther ? [
      { key: "horometro_inicial", title: "Horómetro inicial", format: "horometer" as const, width: 12 },
      { key: "horometro_final", title: "Horómetro final", format: "horometer" as const, width: 12 },
    ] : []),
    ...(hasPriming ? [{ key: "horas_trabajadas", title: "Horas trabajadas (cebado)", format: "number" as const, width: 13 }] : []),
    { key: "galones", title: "Aceite consumido (gal)", format: "number", width: 13 },
  ] : [
    { key: "equipo", title: "Equipo (UG)", width: 20 },
    { key: "orden", title: "Órdenes de trabajo", width: 15 },
    { key: "fecha_programada", title: "Fecha programada", width: 13 },
    { key: "fecha", title: "Fecha", width: 12 },
    { key: "tipo", title: "Tipo", width: 18 },
    { key: "galones", title: "Aceite consumido (gal)", format: "number", width: 15 },
  ];
  if (options.showCosts) columns.push({
    key: "costo", title: management ? "Costo" : "Costo (consumo del aceite)",
    format: "currency", width: 15,
  });
  const rows = options.rows.map(row => {
    const name = String(row.equipment_name || row.equipo_nombre || "Sin equipo").trim();
    const ug = name.match(/UG[\s-]*\d+/i)?.[0].replace(/[\s-]/g, "").toUpperCase() || name;
    const brand = String(row.equipment_brand_name || "Sin marca").trim();
    const rawType = String(row.maintenance_kind_label || row.tipo || row.maintenance_kind || "");
    const isPriming = String(row.maintenance_kind || row.tipo).toUpperCase() === "CEBADO";
    const typeLabels: Record<string, string> = {
      CEBADO: "Cebado", PREVENTIVO: "Mantenimiento MPG", MPG: "Mantenimiento MPG",
      CORRECTIVO: "Correctivo", PROYECTO: "Proyecto",
    };
    return {
      equipo: management ? `${ug} - ${brand}` : ug,
      reserva: row.es_reserva ? "En reserva" : "Sin reserva",
      orden: row.work_order_code || row.orden || "",
      fecha_programada: formatDateOnly(row.fecha_programada, ""),
      fecha: formatDateOnly(row.fecha_referencia || row.fecha, ""),
      central: row.central || "Sin ubicación",
      tipo: typeLabels[rawType.toUpperCase()] || rawType || "Sin tipo",
      horometro_inicial: isPriming ? "" : row.horometro_inicial ?? "",
      horometro_final: isPriming ? "" : row.horometro_final ?? "",
      horas_trabajadas: isPriming ? row.horas_trabajadas ?? "" : "",
      galones: Number(row.cantidad ?? row.galones ?? 0),
      costo: Number(row.subtotal ?? row.costo ?? 0),
    };
  });
  return buildSectionReport({
    title: "Control de cebado y aceite",
    subtitle: options.subtitle, fileName: options.fileName, columns, rows,
    orientation: "landscape", charts: options.charts,
    sheetName: "Detalle por orden de trabajo",
  });
}

import type { ReportingModule } from "@/app/config/reporting-modules";
import { relationshipMetaForModule, type ReportingRelationshipRow } from "@/app/utils/reporting-relations";
import { splitEquipmentReportLabel } from "@/app/utils/equipment-display";
import type { ReportColumn, ReportDefinition, ReportSummaryItem } from "@/app/utils/maintenance-intelligence-reports";

export type ReportingEvent = {
  dateLabel: string;
  title: string;
  status: string;
  category: string;
  owner: string;
  value: number;
};

/** Informe del universo visible, sin recortar a las filas de la vista previa. */
export function buildReportingModuleReport(options: {
  module: ReportingModule;
  period: string;
  fileName: string;
  events: ReportingEvent[];
  relationships?: ReportingRelationshipRow[];
  summary?: ReportSummaryItem[];
  title?: string;
  note?: string;
}): ReportDefinition {
  const { module, events } = options;
  const meta = relationshipMetaForModule(module.key);
  const groups = new Map<string, number>();
  for (const event of events) groups.set(event.status, (groups.get(event.status) || 0) + 1);
  const relationships = options.relationships || [];
  const equipmentColumns: ReportColumn[] = [
    { key: "brand", header: "Marca", width: 17 },
    { key: "unit", header: "Unidad Generación", width: 42 },
    { key: "location", header: "Ubicación", width: 19 },
    { key: "central", header: "Central (Sucursal)", width: 22 },
  ];
  return {
    title: options.title || `Informe de ${module.title}`,
    subtitle: options.period,
    fileName: options.fileName,
    compactPdf: true,
    summary: options.summary || [{ label: "Registros", value: events.length }],
    charts: [
      ...(groups.size ? [{ title: "Distribución de registros por estado", type: "bar" as const, unit: "Registros", points: [...groups].map(([label, value]) => ({ label, value })) }] : []),
      ...(relationships.length ? [
        { field: meta.primaryField, title: meta.primaryLabel, format: meta.primaryFormat },
        { field: meta.secondaryField, title: meta.secondaryLabel, format: meta.secondaryFormat },
      ].map(({ field, title, format }) => ({
        title,
        type: "bar" as const,
        unit: format === "currency" ? "USD" : format === "hours" ? "Horas" : "Unidades",
        points: [...relationships].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0)).slice(0, 10).map(row => {
          const equipment = splitEquipmentReportLabel(row.label);
          return { label: meta.profile === "EQUIPMENT" ? equipment.unit : row.label, caption: meta.profile === "EQUIPMENT" ? equipment.brand : undefined, value: Number(row[field] || 0) };
        }),
      })) : []),
    ],
    sheets: [
      {
        name: `Detalle de ${module.title}`,
        note: [module.description, options.note].filter(Boolean).join(" "),
        fitColumnsToPage: true,
        emptyMessage: "No hay registros dentro del ámbito y período seleccionados.",
        columns: [
          { key: "dateLabel", header: "Fecha", width: 16 },
          { key: "title", header: "Registro", width: 45 },
          { key: "status", header: "Estado", width: 18 },
          { key: "category", header: "Clasificación", width: 22 },
          { key: "owner", header: "Responsable", width: 26 },
          { key: "value", header: module.valueLabel || "Valor", format: "number", width: 18 },
        ],
        rows: events.map(({ dateLabel, title, status, category, owner, value }) => ({ dateLabel, title, status, category, owner, value })),
      },
      ...(relationships.length ? [{
        name: "Relaciones operativas del período",
        note: meta.description,
        fitColumnsToPage: true,
        columns: [
          ...(meta.profile === "EQUIPMENT" ? equipmentColumns : [{ key: "label", header: "Registro relacionado", width: 45 }]),
          { key: "workOrders", header: "OT", format: "number" as const, width: 9 },
          { key: meta.primaryField, header: meta.primaryLabel, format: meta.primaryFormat, width: 18 },
          { key: meta.secondaryField, header: meta.secondaryLabel, format: meta.secondaryFormat, width: 18 },
        ],
        rows: relationships.map(row => ({ ...row, ...splitEquipmentReportLabel(row.label) })),
      }] : []),
    ],
  };
}

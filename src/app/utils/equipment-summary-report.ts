import { buildEquipmentManagerLabel, resolveEquipmentLocation } from "@/app/utils/equipment-display";
import type { ReportColumn } from "@/app/utils/maintenance-intelligence-reports";
import type { ReportingRelationshipRow } from "@/app/utils/reporting-relations";

type Equipment = Record<string, any>;
export type EquipmentSummaryRow = ReportingRelationshipRow & { central: string };

const text = (value: unknown) => String(value ?? "").trim();
const key = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

function locationName(equipment: Equipment) {
  const label = text(equipment.location_nombre || equipment.ubicacion_nombre ||
    equipment.location?.nombre || resolveEquipmentLocation(equipment));
  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(label)) return "";
  return label.replace(/^(?:UBI|LOC)-\S+\s+-\s+/i, "");
}

/** La ubicación pertenece al equipo, no a la bodega que entregó el material. */
export function buildEquipmentSummaryRows(
  rows: ReportingRelationshipRow[], equipmentCatalog: Equipment[],
): EquipmentSummaryRow[] {
  const byId = new Map(equipmentCatalog.map(equipment => [text(equipment.id || equipment.equipment_id), equipment]));
  const byLabel = new Map(equipmentCatalog.map(equipment => [key(buildEquipmentManagerLabel(equipment)), equipment]));
  return rows.map(row => {
    const sources = row.sourceRows as Equipment[];
    const details = sources.flatMap(source => Array.isArray(source.detalle_ordenes) ? source.detalle_ordenes : []);
    const ids = [...sources, ...details].map(source => text(source.equipment_id)).filter(Boolean);
    ids.push(row.entityId);
    const equipment = ids.map(id => byId.get(id)).find(Boolean) || byLabel.get(key(row.label));
    const registered = equipment ? locationName(equipment) : "";
    const explicit = [...sources, ...details].map(locationName).find(Boolean);
    // Los reportes históricos también incluyen la ubicación al final de la etiqueta.
    const separator = row.label.lastIndexOf(" · ");
    const embedded = separator >= 0 ? locationName({ central: row.label.slice(separator + 3) }) : "";
    return { ...row, central: registered || explicit || embedded || "Sin ubicación" };
  });
}

export const EQUIPMENT_SUMMARY_COLUMNS: ReportColumn[] = [
  { key: "equipo", header: "Equipo", width: 44 },
  { key: "central", header: "Ubicación o central", width: 22 },
  { key: "ots", header: "OT", format: "number", width: 8 },
  { key: "horas", header: "Horas", format: "hours", width: 10 },
  { key: "costo", header: "Costo", format: "currency", width: 12 },
];

export function equipmentSummaryExportRows(rows: EquipmentSummaryRow[]) {
  return rows.map(row => ({ equipo: row.label, central: row.central,
    ots: row.workOrders, horas: row.hours, costo: row.maintenanceCost }));
}

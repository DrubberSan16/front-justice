export type ReportingRelationshipProfile =
  | "WORK_ORDER"
  | "EQUIPMENT"
  | "WAREHOUSE"
  | "MATERIAL"
  | "PERIOD";

export type ReportingRelationshipMeta = {
  profile: ReportingRelationshipProfile;
  title: string;
  description: string;
  primaryLabel: string;
  primaryField: keyof ReportingRelationshipRow;
  primaryFormat: "number" | "hours" | "currency";
  secondaryLabel: string;
  secondaryField: keyof ReportingRelationshipRow;
  secondaryFormat: "number" | "hours" | "currency";
};

export type ReportingRelationshipRow = {
  key: string;
  label: string;
  context: string;
  status: string;
  workOrders: number;
  hours: number;
  elapsedHours: number;
  effectiveHours: number;
  maintenanceCost: number;
  consumedQuantity: number;
  consumptionValue: number;
  stockQuantity: number;
  stockValue: number;
  entries: number;
  exits: number;
  incomingValue: number;
  outgoingValue: number;
  movements: number;
  relatedEquipment: string;
  relatedWarehouses: string;
  relatedMaterials: string;
  relatedResponsibles: string;
  sourceRows: Record<string, unknown>[];
};

type AnyRow = Record<string, any>;
type WorkingRow = ReportingRelationshipRow & {
  _orders: Set<string>;
  _equipment: Set<string>;
  _warehouses: Set<string>;
  _materials: Set<string>;
  _responsibles: Set<string>;
  _declaredOrders: number;
};

const WORK_ORDER_MODULES = new Set(["work-orders", "project-work-orders"]);
const EQUIPMENT_MODULES = new Set([
  "generation-units",
  "equipment",
  "projects",
  "equipment-types",
  "locations",
  "schedules",
  "alerts",
  "templates",
  "lubricant-analysis",
]);
const WAREHOUSE_MODULES = new Set([
  "warehouse-stock",
  "kardex",
  "warehouse-income",
  "warehouse-output",
  "warehouse-transfers",
  "warehouse-reservations",
  "warehouses",
  "branches",
]);
const MATERIAL_MODULES = new Set([
  "materials",
  "purchase-orders",
  "service-orders",
  "lines",
  "categories",
  "brands",
  "units",
  "third-parties",
]);

export function relationshipProfileForModule(
  moduleKey: string,
): ReportingRelationshipProfile {
  if (WORK_ORDER_MODULES.has(moduleKey)) return "WORK_ORDER";
  if (EQUIPMENT_MODULES.has(moduleKey)) return "EQUIPMENT";
  if (WAREHOUSE_MODULES.has(moduleKey)) return "WAREHOUSE";
  if (MATERIAL_MODULES.has(moduleKey)) return "MATERIAL";
  return "PERIOD";
}

export function relationshipGroupForModule(moduleKey: string) {
  const profile = relationshipProfileForModule(moduleKey);
  if (profile === "WORK_ORDER") return "OT";
  if (profile === "EQUIPMENT") return "EQUIPO";
  if (profile === "WAREHOUSE") return "BODEGA";
  if (profile === "MATERIAL") return "MATERIAL";
  return "MES";
}

export function relationshipMetaForModule(
  moduleKey: string,
): ReportingRelationshipMeta {
  const profile = relationshipProfileForModule(moduleKey);
  if (profile === "WORK_ORDER") {
    return {
      profile,
      title: "OT relacionadas con equipos, horas, responsables y materiales",
      description:
        "Compara las horas asignadas al personal con la duración efectiva de la intervención, el tiempo transcurrido del flujo y el costo de los materiales de cada OT.",
      primaryLabel: "Horas trabajadas por OT",
      primaryField: "hours",
      primaryFormat: "hours",
      secondaryLabel: "Costo de materiales por OT",
      secondaryField: "maintenanceCost",
      secondaryFormat: "currency",
    };
  }
  if (profile === "EQUIPMENT") {
    return {
      profile,
      title: "Equipos relacionados con sus OT, horas y materiales",
      description:
        "Cada equipo consolida las órdenes atendidas, las horas registradas y el costo de los materiales utilizados durante el período.",
      primaryLabel: "Horas por equipo",
      primaryField: "hours",
      primaryFormat: "hours",
      secondaryLabel: "Costo de mantenimiento por equipo",
      secondaryField: "maintenanceCost",
      secondaryFormat: "currency",
    };
  }
  if (profile === "WAREHOUSE") {
    return {
      profile,
      title: "Bodegas relacionadas con stock, movimientos, OT y valor",
      description:
        "Muestra cuánto stock y valor conserva cada bodega, cuánto ingresó, cuánto salió y qué parte se consumió en órdenes de trabajo.",
      primaryLabel: "Valor actual del stock por bodega",
      primaryField: "stockValue",
      primaryFormat: "currency",
      secondaryLabel: "Valor de salidas por bodega",
      secondaryField: "outgoingValue",
      secondaryFormat: "currency",
    };
  }
  if (profile === "MATERIAL") {
    return {
      profile,
      title: "Materiales relacionados con bodegas, equipos y OT",
      description:
        "Relaciona existencias y consumo con las bodegas que almacenan cada material y las OT o equipos donde fue utilizado.",
      primaryLabel: "Unidades consumidas por material",
      primaryField: "consumedQuantity",
      primaryFormat: "number",
      secondaryLabel: "Valor consumido por material",
      secondaryField: "consumptionValue",
      secondaryFormat: "currency",
    };
  }
  return {
    profile,
    title: "Actividad relacionada del período",
    description:
      "Une el módulo seleccionado con las OT, equipos, bodegas y materiales que tuvieron actividad dentro del mismo período.",
    primaryLabel: "Horas registradas",
    primaryField: "hours",
    primaryFormat: "hours",
    secondaryLabel: "Costo relacionado",
    secondaryField: "maintenanceCost",
    secondaryFormat: "currency",
  };
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function textValue(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function reportRows(payload: AnyRow | null | undefined, key: string): AnyRow[] {
  const rows = payload?.reports?.[key]?.rows;
  return Array.isArray(rows) ? rows : [];
}

function identityForProfile(row: AnyRow, profile: ReportingRelationshipProfile) {
  if (profile === "WORK_ORDER") {
    const label = textValue(row.work_order_code, row.codigo_ot, row.code, "Sin OT");
    return { key: normalizeKey(label), label };
  }
  if (profile === "EQUIPMENT") {
    const label = textValue(row.equipment_label, row.equipment_name, "Sin equipo");
    return { key: normalizeKey(label), label };
  }
  if (profile === "WAREHOUSE") {
    const label = textValue(row.bodega_label, row.bodega_nombre, "Sin bodega");
    return { key: normalizeKey(label), label };
  }
  if (profile === "MATERIAL") {
    const label = textValue(row.material_label, row.producto_label, "Sin material");
    return { key: normalizeKey(label), label };
  }
  const label = textValue(row.periodo, row.period_key, "Sin período");
  return { key: normalizeKey(label), label };
}

function isProjectRow(row: AnyRow) {
  return /PROYECTO/.test(
    normalizeKey(
      textValue(row.maintenance_kind, row.maintenance_kind_label, row.work_order_type),
    ),
  );
}

function rowBelongsToModule(moduleKey: string, row: AnyRow) {
  if (moduleKey === "project-work-orders") return isProjectRow(row);
  if (moduleKey === "work-orders") return !isProjectRow(row);
  return true;
}

function addDelimited(target: Set<string>, value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((item) => addDelimited(target, item));
    return;
  }
  const text = String(value ?? "").trim();
  if (!text) return;
  text
    .split(/\s+\|\s+|\s*;\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => target.add(item));
}

function addToken(target: Set<string>, value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((item) => addToken(target, item));
    return;
  }
  const text = String(value ?? "").trim();
  if (text) target.add(text);
}

function addOrderDetails(
  target: WorkingRow,
  row: AnyRow,
  includeDurations = false,
) {
  const details = Array.isArray(row.detalle_ordenes) ? row.detalle_ordenes : [];
  for (const detail of details) {
    addToken(target._orders, detail?.work_order_code);
    addToken(target._equipment, detail?.equipment_name ?? detail?.equipment_label);
    if (includeDurations) {
      target.elapsedHours += numberValue(detail?.flow_duration_hours);
      target.effectiveHours += numberValue(detail?.effective_duration_hours);
    }
  }
  addDelimited(target._orders, row.ordenes_trabajo);
  addToken(target._orders, row.work_order_code);
  addToken(target._equipment, row.equipos_lista ?? row.equipos);
  addToken(target._equipment, row.equipment_label ?? row.equipment_name);
  addDelimited(target._warehouses, row.bodegas ?? row.bodega_label);
  addDelimited(target._materials, row.materiales ?? row.material_label);
  addDelimited(target._responsibles, row.responsables);
  target._declaredOrders = Math.max(
    target._declaredOrders,
    numberValue(row.total_ordenes),
  );
  target.sourceRows.push(row);
}

function createWorkingRow(key: string, label: string): WorkingRow {
  return {
    key,
    label,
    context: "",
    status: "",
    workOrders: 0,
    hours: 0,
    elapsedHours: 0,
    effectiveHours: 0,
    maintenanceCost: 0,
    consumedQuantity: 0,
    consumptionValue: 0,
    stockQuantity: 0,
    stockValue: 0,
    entries: 0,
    exits: 0,
    incomingValue: 0,
    outgoingValue: 0,
    movements: 0,
    relatedEquipment: "",
    relatedWarehouses: "",
    relatedMaterials: "",
    relatedResponsibles: "",
    sourceRows: [],
    _orders: new Set(),
    _equipment: new Set(),
    _warehouses: new Set(),
    _materials: new Set(),
    _responsibles: new Set(),
    _declaredOrders: 0,
  };
}

export function buildReportingRelationshipRows(
  moduleKey: string,
  payload: AnyRow | null | undefined,
): ReportingRelationshipRow[] {
  const profile = relationshipProfileForModule(moduleKey);
  const rowsByKey = new Map<string, WorkingRow>();
  const ensure = (row: AnyRow) => {
    const identity = identityForProfile(row, profile);
    const key = identity.key || `SIN_DATO_${rowsByKey.size}`;
    const current = rowsByKey.get(key) ?? createWorkingRow(key, identity.label);
    rowsByKey.set(key, current);
    return current;
  };

  if (profile !== "MATERIAL") {
    for (const row of reportRows(payload, "horas_trabajadas")) {
      if (!rowBelongsToModule(moduleKey, row)) continue;
      const current = ensure(row);
      current.hours += numberValue(row.total_horas ?? row.horas);
      if (profile === "WORK_ORDER") {
        current.elapsedHours = Math.max(
          current.elapsedHours,
          numberValue(row.flow_duration_hours),
        );
        current.effectiveHours = Math.max(
          current.effectiveHours,
          numberValue(row.effective_duration_hours),
        );
        current.status = textValue(row.work_order_status, row.status);
        current.context = textValue(row.work_order_title, row.equipment_label);
      }
      addOrderDetails(current, row, true);
    }

    for (const row of reportRows(payload, "costo_mantenimiento")) {
      if (!rowBelongsToModule(moduleKey, row)) continue;
      const current = ensure(row);
      current.maintenanceCost += numberValue(row.total_costo);
      addOrderDetails(current, row);
    }
  }

  for (const row of reportRows(payload, "inventario_consumido")) {
    if (!rowBelongsToModule(moduleKey, row)) continue;
    const current = ensure(row);
    current.consumedQuantity += numberValue(row.total_cantidad);
    current.consumptionValue += numberValue(row.total_costo);
    addOrderDetails(current, row);
  }

  if (profile === "WAREHOUSE" || profile === "MATERIAL") {
    for (const row of reportRows(payload, "costo_inventario")) {
      const current = ensure(row);
      current.stockQuantity += numberValue(row.total_stock ?? row.stock_actual);
      current.stockValue += numberValue(row.total_costo_inventario);
      addOrderDetails(current, row);
    }
  }

  if (profile === "WAREHOUSE") {
    for (const row of reportRows(payload, "movimientos_bodega")) {
      const current = ensure(row);
      current.entries += numberValue(row.entradas);
      current.exits += numberValue(row.salidas);
      current.incomingValue += numberValue(row.costo_entradas);
      current.outgoingValue += numberValue(row.costo_salidas);
      current.movements += numberValue(row.movimientos);
      current.stockQuantity = Math.max(
        current.stockQuantity,
        numberValue(row.stock_actual),
      );
      current.stockValue = Math.max(
        current.stockValue,
        numberValue(row.costo_inventario_actual),
      );
      addOrderDetails(current, row);
    }
  }

  if (profile !== "MATERIAL" && profile !== "PERIOD") {
    for (const row of reportRows(payload, "responsables_ot")) {
      if (!rowBelongsToModule(moduleKey, row)) continue;
      const current = ensure(row);
      addOrderDetails(current, row);
    }
  }

  return [...rowsByKey.values()]
    .map((row) => {
      row.workOrders = Math.max(row._orders.size, row._declaredOrders);
      row.relatedEquipment = [...row._equipment].join(" | ");
      row.relatedWarehouses = [...row._warehouses].join(" | ");
      row.relatedMaterials = [...row._materials].join(" | ");
      row.relatedResponsibles = [...row._responsibles].join(" | ");
      if (!row.context) {
        if (profile === "EQUIPMENT") row.context = `${row.workOrders} OT relacionadas`;
        else if (profile === "WAREHOUSE") row.context = `${row.movements} movimientos`;
        else if (profile === "MATERIAL") row.context = `${row.workOrders} OT relacionadas`;
        else row.context = `${row.workOrders} OT relacionadas`;
      }
      const {
        _orders,
        _equipment,
        _warehouses,
        _materials,
        _responsibles,
        _declaredOrders,
        ...result
      } = row;
      return result;
    })
    .sort((left, right) => {
      const meta = relationshipMetaForModule(moduleKey);
      return (
        numberValue(right[meta.primaryField]) -
          numberValue(left[meta.primaryField]) ||
        left.label.localeCompare(right.label)
      );
    });
}

import { formatDateOnly } from "@/app/utils/date-time";
import {
  formatCountForDisplay,
  formatCurrencyForDisplay,
  formatNumberForDisplay,
  formatWorkedDuration,
} from "@/app/utils/number-format";
import type {
  ReportChart,
  ReportColumn,
  ReportDefinition,
  ReportRowKind,
  ReportSheet,
  ReportSummaryItem,
} from "@/app/utils/maintenance-intelligence-reports";

type Row = Record<string, any>;

/**
 * Reporte operativo-financiero de cebado y aceite.
 *
 * Gerencia y Administración exportaban dos documentos distintos del mismo
 * control (uno con central y horómetros, otro con fecha programada), y ninguno
 * cerraba con totales. Gerencia pidió una sola forma, la que leyó mejor con
 * Finanzas: resumen, consumo por generador separando cebado de mantenimiento
 * MPG, detalle por OT y movimiento del aceite en bodega, todo con su total.
 * Los dos tableros arman el archivo aquí y con la misma consulta
 * (`dashboard-administracion/control-cebado-aceite`).
 */

export type OilKind = "CEBADO" | "MPG" | "OTROS";
export type OilFlow = { cantidad: number; costo: number };
export type OilInventory = {
  existencia_inicial: OilFlow;
  compras: OilFlow;
  transferencias_recibidas: OilFlow;
  devoluciones: OilFlow;
  ajustes: OilFlow;
  salidas: OilFlow;
  transferencias_enviadas: OilFlow;
  existencia_final: OilFlow;
  saldo_actual: OilFlow;
};

export type OilGeneratorRow = {
  key: string;
  equipo: string;
  ug: string;
  marca: string;
  central: string;
  ot_cebado: number;
  ot_mpg: number;
  ot_otros: number;
  horas_cebado: number;
  gal_cebado: number;
  costo_cebado: number;
  gal_mpg: number;
  costo_mpg: number;
  gal_otros: number;
  costo_otros: number;
  gal_total: number;
  costo_total: number;
};

const KIND_LABELS: Record<string, string> = {
  CEBADO: "Cebado",
  PREVENTIVO: "Mantenimiento MPG",
  MPG: "Mantenimiento MPG",
  CORRECTIVO: "Correctivo",
  PROYECTO: "Proyecto",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planificada",
  SCHEDULED: "Programada",
  OPEN: "Abierta",
  IN_PROGRESS: "En proceso",
  REVIEW: "En revisión",
  IN_REVIEW: "En revisión",
  CLOSED: "Cerrada",
  COMPLETED: "Cerrada",
};

export function oilKind(row: Row): OilKind {
  const kind = String(row?.maintenance_kind || row?.tipo || "").toUpperCase();
  if (kind === "CEBADO") return "CEBADO";
  if (kind === "PREVENTIVO" || kind === "MPG") return "MPG";
  return "OTROS";
}

export function oilKindLabel(row: Row) {
  const kind = String(row?.maintenance_kind || row?.tipo || "").toUpperCase();
  return KIND_LABELS[kind] || String(row?.maintenance_kind_label || kind || "Sin tipo");
}

export function oilStatusLabel(row: Row) {
  const status = String(row?.work_order_status || "").toUpperCase();
  return STATUS_LABELS[status] || String(row?.work_order_status || "");
}

/** "UG05 - MTU": así conoce Gerencia cada generador. */
function generatorParts(row: Row) {
  const name = String(row?.equipment_name || row?.equipo_nombre || "Sin equipo").trim();
  const ug = name.match(/UG[\s-]*\d+/i)?.[0].replace(/[\s-]/g, "").toUpperCase() || name;
  const marca = String(row?.equipment_brand_name || "").trim();
  return { ug, marca, equipo: marca ? `${ug} - ${marca}` : ug };
}

function round(value: number) {
  return Number(value.toFixed(4));
}

/**
 * Totales por generador. Cebado, MPG y otros tipos son columnas excluyentes:
 * cada galón cae en una sola, y el total es su suma.
 */
export function summarizeOilByGenerator(rows: Row[]): {
  generators: OilGeneratorRow[];
  total: OilGeneratorRow;
} {
  const groups = new Map<string, OilGeneratorRow>();
  const blank = (key: string, parts: { ug: string; marca: string; equipo: string }, central = ""): OilGeneratorRow => ({
    key, ...parts, central,
    ot_cebado: 0, ot_mpg: 0, ot_otros: 0, horas_cebado: 0,
    gal_cebado: 0, costo_cebado: 0, gal_mpg: 0, costo_mpg: 0,
    gal_otros: 0, costo_otros: 0, gal_total: 0, costo_total: 0,
  });
  for (const row of rows) {
    const parts = generatorParts(row);
    const key = String(row?.equipment_id || parts.equipo);
    const group = groups.get(key) ?? blank(key, parts, String(row?.central || ""));
    const gallons = Number(row?.cantidad ?? row?.galones ?? 0) || 0;
    const cost = Number(row?.subtotal ?? row?.costo ?? 0) || 0;
    const kind = oilKind(row);
    if (kind === "CEBADO") {
      group.ot_cebado += 1;
      group.horas_cebado += Number(row?.horas_trabajadas || 0) || 0;
      group.gal_cebado += gallons;
      group.costo_cebado += cost;
    } else if (kind === "MPG") {
      group.ot_mpg += 1;
      group.gal_mpg += gallons;
      group.costo_mpg += cost;
    } else {
      group.ot_otros += 1;
      group.gal_otros += gallons;
      group.costo_otros += cost;
    }
    group.gal_total += gallons;
    group.costo_total += cost;
    groups.set(key, group);
  }
  const generators = [...groups.values()]
    .map((group) => ({
      ...group,
      horas_cebado: round(group.horas_cebado),
      gal_cebado: round(group.gal_cebado), costo_cebado: round(group.costo_cebado),
      gal_mpg: round(group.gal_mpg), costo_mpg: round(group.costo_mpg),
      gal_otros: round(group.gal_otros), costo_otros: round(group.costo_otros),
      gal_total: round(group.gal_total), costo_total: round(group.costo_total),
    }))
    .sort((left, right) =>
      left.ug.localeCompare(right.ug, "es", { numeric: true }) || left.equipo.localeCompare(right.equipo, "es"));
  const total = blank("__TOTAL__", { ug: "TOTAL", marca: "", equipo: "TOTAL" });
  for (const group of generators) {
    for (const field of [
      "ot_cebado", "ot_mpg", "ot_otros", "horas_cebado", "gal_cebado", "costo_cebado",
      "gal_mpg", "costo_mpg", "gal_otros", "costo_otros", "gal_total", "costo_total",
    ] as const) {
      total[field] = round(total[field] + group[field]);
    }
  }
  return { generators, total };
}

/** Filas del movimiento de inventario, en el orden en que se lee la cuenta. */
export function oilInventoryLines(inventory: OilInventory | null | undefined) {
  if (!inventory) return [];
  const line = (concepto: string, flow: OilFlow | undefined, sign: 1 | -1 | 0, kind: ReportRowKind | null = null) => {
    const cantidad = Number(flow?.cantidad || 0);
    const costo = Number(flow?.costo || 0);
    return {
      concepto,
      cantidad,
      costo_unitario: cantidad ? round(costo / cantidad) : 0,
      costo_total: costo,
      sign,
      kind,
    };
  };
  return [
    line("Existencia inicial", inventory.existencia_inicial, 0, "group"),
    line("(+) Compras", inventory.compras, 1),
    line("(+) Transferencias recibidas", inventory.transferencias_recibidas, 1),
    line("(+) Devoluciones de OT", inventory.devoluciones, 1),
    line("(±) Ajustes de inventario", inventory.ajustes, 1),
    line("(-) Salidas por consumo", inventory.salidas, -1),
    line("(-) Transferencias enviadas", inventory.transferencias_enviadas, -1),
    line("Existencia final", inventory.existencia_final, 0, "total"),
  ];
}

function hours(value: number) {
  return formatWorkedDuration(value, { empty: "00:00:00" });
}

function count(value: number) {
  return formatCountForDisplay(value);
}

export function buildOilFinancialReport(options: {
  rows: Row[];
  inventory?: OilInventory | null;
  /** Período, central y demás filtros aplicados, tal como se leen en pantalla. */
  filtersLabel: string;
  fileName: string;
  showCosts: boolean;
}): ReportDefinition {
  const { rows, inventory, showCosts } = options;
  const { generators, total } = summarizeOilByGenerator(rows);
  const primingEquipments = generators.filter((group) => group.ot_cebado > 0).length;
  const mpgEquipments = generators.filter((group) => group.ot_mpg > 0).length;
  const hasOthers = total.ot_otros > 0;

  const summary: ReportSummaryItem[] = [
    { label: "Aceite consumido (gal)", value: formatNumberForDisplay(total.gal_total) },
    ...(showCosts ? [{ label: "Costo total de aceite", value: formatCurrencyForDisplay(total.costo_total) }] : []),
    { label: "OT de cebado", value: `${count(total.ot_cebado)} · ${count(primingEquipments)} equipos` },
    { label: "OT mantenimiento MPG", value: `${count(total.ot_mpg)} · ${count(mpgEquipments)} equipos` },
    ...(inventory
      ? [{ label: "Saldo de aceite en bodega", value: `${formatNumberForDisplay(inventory.saldo_actual?.cantidad || 0)} gal` }]
      : []),
  ];

  const money = (key: string, header: string, width = 12): ReportColumn[] =>
    showCosts ? [{ key, header, width, format: "currency" }] : [];

  const generatorColumns: ReportColumn[] = [
    { key: "equipo", header: "Equipo", width: 20 },
    { key: "ot_cebado", header: "OT de cebado", width: 9 },
    { key: "horas_cebado", header: "Horas trabajadas cebado", width: 12, format: "text" },
    { key: "gal_cebado", header: "Aceite cebado (gal)", width: 11, format: "number" },
    ...money("costo_cebado", "Costo cebado (USD)"),
    { key: "gal_mpg", header: "Aceite mantenimiento MPG (gal)", width: 12, format: "number" },
    ...money("costo_mpg", "Costo mantenimiento (USD)"),
    ...(hasOthers
      ? [
          { key: "gal_otros", header: "Aceite otros tipos (gal)", width: 11, format: "number" as const },
          ...money("costo_otros", "Costo otros tipos (USD)"),
        ]
      : []),
    { key: "gal_total", header: "Total aceite (gal)", width: 11, format: "number" },
    ...money("costo_total", "Total costo aceite (USD)"),
  ];
  // Sin la clave interna (el id del equipo): el archivo solo lleva lo que se lee.
  const generatorRow = ({ key: _key, ...group }: OilGeneratorRow) => ({ ...group, horas_cebado: hours(group.horas_cebado) });

  const detailRows = rows.map((row) => {
    const kind = oilKind(row);
    const gallons = Number(row?.cantidad ?? 0) || 0;
    const cost = Number(row?.subtotal ?? 0) || 0;
    return {
      fecha: formatDateOnly(row?.fecha_referencia, ""),
      orden: row?.work_order_code || "",
      central: row?.central || "Sin ubicación",
      equipo: generatorParts(row).equipo,
      tipo: oilKindLabel(row),
      estado: oilStatusLabel(row),
      horometro_inicial: kind === "CEBADO" ? "" : row?.horometro_inicial ?? "",
      horometro_final: kind === "CEBADO" ? "" : row?.horometro_final ?? "",
      horas_cebado: kind === "CEBADO" ? formatWorkedDuration(row?.horas_trabajadas, { empty: "" }) : "",
      galones: gallons,
      costo_galon: gallons ? round(cost / gallons) : 0,
      costo: cost,
    };
  });
  const detailColumns: ReportColumn[] = [
    { key: "fecha", header: "Fecha", width: 10 },
    { key: "orden", header: "OT", width: 11 },
    { key: "central", header: "Central", width: 16 },
    { key: "equipo", header: "Equipo", width: 15 },
    { key: "tipo", header: "Tipo", width: 14 },
    { key: "estado", header: "Estado", width: 10 },
    { key: "horometro_inicial", header: "Horómetro inicial", width: 11, format: "horometer" },
    { key: "horometro_final", header: "Horómetro final", width: 11, format: "horometer" },
    { key: "horas_cebado", header: "Horas cebado (hh:mm:ss)", width: 11, format: "text" },
    { key: "galones", header: "Aceite (gal)", width: 10, format: "number" },
    ...money("costo_galon", "Costo/gal (USD)", 10),
    ...money("costo", "Costo aceite (USD)"),
  ];
  const detailTotal = {
    fecha: "TOTAL",
    orden: `${count(rows.length)} OT`,
    galones: total.gal_total,
    ...(showCosts ? { costo_galon: total.gal_total ? round(total.costo_total / total.gal_total) : 0, costo: total.costo_total } : {}),
  };

  const sheets: ReportSheet[] = [
    {
      name: "Consumo de aceite por generador",
      fitColumnsToPage: true,
      columns: generatorColumns,
      rows: [...generators.map(generatorRow), generatorRow(total)],
      rowKinds: [...generators.map(() => null), "total"],
      emptyMessage: "Sin órdenes de trabajo para los filtros seleccionados.",
      note: "Cebado, mantenimiento MPG y otros tipos son columnas excluyentes: cada galón se cuenta una sola vez y el total es su suma.",
    },
    {
      name: "Detalle por orden de trabajo",
      fitColumnsToPage: true,
      columns: detailColumns,
      rows: [...detailRows, detailTotal],
      rowKinds: [...detailRows.map(() => null), "total"],
      emptyMessage: "Sin órdenes de trabajo para los filtros seleccionados.",
    },
  ];

  if (inventory) {
    const lines = oilInventoryLines(inventory);
    const outputs = Number(inventory.salidas?.cantidad || 0);
    const outputsCost = Number(inventory.salidas?.costo || 0);
    sheets.push({
      name: "Movimiento de inventario · Aceite",
      fitColumnsToPage: true,
      columns: [
        { key: "concepto", header: "Concepto", width: 30 },
        { key: "cantidad", header: "Cantidad (gal)", width: 14, format: "number" },
        ...money("costo_unitario", "Costo unitario (USD)", 14),
        ...money("costo_total", "Total (USD)", 14),
      ],
      rows: lines.map(({ sign, kind, ...line }) => line),
      rowKinds: lines.map((line) => line.kind),
      note:
        `Bodegas de la sucursal activa; la existencia se cuenta desde el stock real de hoy. ` +
        `Saldo actual en bodega: ${formatNumberForDisplay(inventory.saldo_actual?.cantidad || 0)} gal.`,
    });
    sheets.push({
      name: "Conciliación con bodega",
      fitColumnsToPage: true,
      columns: [
        { key: "concepto", header: "Concepto", width: 40 },
        { key: "cantidad", header: "Aceite (gal)", width: 14, format: "number" },
        ...money("costo", "Costo (USD)", 14),
      ],
      rows: [
        { concepto: "Aceite consumido según órdenes de trabajo", cantidad: total.gal_total, costo: total.costo_total },
        { concepto: "Salidas de bodega por consumo", cantidad: outputs, costo: outputsCost },
        {
          concepto: "Diferencia (bodega - órdenes)",
          cantidad: round(outputs - total.gal_total),
          costo: round(outputsCost - total.costo_total),
        },
      ],
      rowKinds: [null, null, "total"],
      note:
        "Una diferencia aparece cuando el aceite sale de bodega en una fecha distinta a la de su OT, " +
        "cuando sale para un uso que no es una orden de trabajo o cuando la OT queda fuera de los filtros aplicados.",
    });
  }

  const charts: ReportChart[] = generators.some((group) => group.gal_total > 0)
    ? [{
        title: "Consumo de aceite por máquina",
        subtitle: "Galones consumidos en el período",
        type: "bar",
        unit: "gal",
        points: generators
          .filter((group) => group.gal_total > 0)
          .map((group) => ({ label: group.ug, caption: group.marca, value: group.gal_total })),
      }]
    : [];

  return {
    fileName: options.fileName,
    title: "Control de cebado y aceite",
    subtitle: `Reporte operativo-financiero · ${options.filtersLabel}`,
    orientation: "landscape",
    compactPdf: true,
    summary,
    charts,
    sheets,
  };
}

import { formatDateOnly } from "@/app/utils/date-time";
import { formatCountForDisplay, formatCurrencyForDisplay } from "@/app/utils/number-format";
import type {
  ReportColumn,
  ReportDefinition,
  ReportSheet,
} from "@/app/utils/maintenance-intelligence-reports";

type Row = Record<string, any>;

/**
 * Reporte financiero del costo de mantenimiento: repuestos, aceite, insumos y
 * mano de obra por orden de trabajo.
 *
 * Gerencia lo pidió sobre el ejemplo de la OT-A00382: la composición del costo
 * de cada OT y, para el período, el costo por máquina, por tipo de OT, por
 * artículo y por mes, con el detalle de cada material para auditar. Las tres
 * categorías de material las clasifica el servidor y son excluyentes
 * (`material-cost-category.ts` en kpi-maintenance), así que repuestos + aceite
 * + insumos = costo de materiales, y el total de la OT suma la mano de obra una
 * sola vez.
 *
 * Las filas llegan ya enriquecidas por el tablero: `costo_materiales`,
 * `costo_mano_obra` y `total_costo` (materiales + mano de obra).
 */

export const MATERIAL_CATEGORY_LABELS: Record<string, string> = {
  REPUESTOS: "Repuestos",
  ACEITE: "Aceite",
  INSUMOS: "Insumos",
};

const COST_KEYS = ["repuestos", "aceite", "insumos", "mano_obra", "total"] as const;
type CostKey = (typeof COST_KEYS)[number];
type CostBucket = Record<CostKey, number> & { ordenes: number };

function emptyBucket(): CostBucket {
  return { repuestos: 0, aceite: 0, insumos: 0, mano_obra: 0, total: 0, ordenes: 0 };
}

function orderCosts(row: Row): Record<CostKey, number> {
  return {
    repuestos: Number(row?.costo_repuestos || 0),
    aceite: Number(row?.costo_aceite || 0),
    insumos: Number(row?.costo_insumos || 0),
    mano_obra: Number(row?.costo_mano_obra || 0),
    total: Number(row?.total_costo || 0),
  };
}

function addTo(bucket: CostBucket, costs: Record<CostKey, number>) {
  for (const key of COST_KEYS) bucket[key] += costs[key];
  bucket.ordenes += 1;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function monthKey(value: unknown) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "Sin fecha";
}
function monthLabel(key: string) {
  const match = key.match(/^(\d{4})-(\d{2})$/);
  return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : key;
}

/** El código ya va en su propia columna: "P7003 - FILTRO..." queda "FILTRO...". */
function materialName(material: Row) {
  const label = String(material?.material_label || "");
  const code = String(material?.material_codigo || "");
  return code && label.startsWith(`${code} - `) ? label.slice(code.length + 3) : label;
}

/** "UG05" de "MTU | JC - UG05 - 12V4000 (...)": la etiqueta corta del gráfico. */
function shortEquipment(label: string) {
  const ug = label.match(/UG[\s-]*\d+/i)?.[0].replace(/[\s-]/g, "").toUpperCase();
  if (ug) return ug;
  if (/\bSSA\b/i.test(label)) return "SSA";
  // Sin UG se toma el nombre, sin la marca: "GENERAL | SISTEMA DE FILTRADO" -> "SISTEMA DE FILTRADO".
  const name = label.split("|").pop()?.split("·")[0]?.trim() || label;
  return name.length > 18 ? `${name.slice(0, 17)}…` : name;
}

const costColumns = (width = 12): ReportColumn[] => [
  { key: "repuestos", header: "Repuestos (USD)", width, format: "currency" },
  { key: "aceite", header: "Aceite (USD)", width, format: "currency" },
  { key: "insumos", header: "Insumos (USD)", width, format: "currency" },
  { key: "mano_obra", header: "Mano de obra (USD)", width, format: "currency" },
  { key: "total", header: "Total OT (USD)", width, format: "currency" },
];

function groupSheet(
  name: string,
  firstColumn: ReportColumn,
  groups: Array<[string, CostBucket]>,
  total: CostBucket,
  note?: string,
): ReportSheet {
  const rows = groups.map(([label, bucket]) => ({ grupo: label, ...bucket }));
  return {
    name,
    fitColumnsToPage: true,
    columns: [
      { ...firstColumn, key: "grupo" },
      { key: "ordenes", header: "OT", width: 7 },
      ...costColumns(),
    ],
    rows: [...rows, { grupo: "TOTAL", ...total }],
    rowKinds: [...rows.map(() => null), "total"],
    emptyMessage: "Sin órdenes de mantenimiento para los filtros seleccionados.",
    note,
  };
}

export function buildMaintenanceFinancialReport(options: {
  rows: Row[];
  filtersLabel: string;
  fileName: string;
  equipmentLabel?: (row: Row) => string;
  /** Solo se listan los materiales de esta categoría en el detalle y por artículo. */
  category?: string | null;
}): ReportDefinition {
  const equipmentOf = (row: Row) =>
    options.equipmentLabel?.(row) || String(row?.equipment_name || row?.equipment_label || "Sin equipo");
  const kindOf = (row: Row) => String(row?.maintenance_kind_label || row?.maintenance_kind || "Sin tipo");

  const total = emptyBucket();
  const byEquipment = new Map<string, CostBucket>();
  const byKind = new Map<string, CostBucket>();
  const byMonth = new Map<string, CostBucket>();
  const byArticle = new Map<string, Row>();
  const detailRows: Row[] = [];

  const compositionRows = options.rows.map((row) => {
    const costs = orderCosts(row);
    addTo(total, costs);
    for (const [map, key] of [
      [byEquipment, equipmentOf(row)],
      [byKind, kindOf(row)],
      [byMonth, monthKey(row?.fecha_referencia)],
    ] as const) {
      const bucket = map.get(key) ?? emptyBucket();
      addTo(bucket, costs);
      map.set(key, bucket);
    }
    const materials: Row[] = Array.isArray(row?.materiales_detalle) ? row.materiales_detalle : [];
    for (const material of materials) {
      if (options.category && material?.categoria_costo !== options.category) continue;
      const cost = Number(material?.costo_total || 0);
      const quantity = Number(material?.cantidad || 0);
      detailRows.push({
        orden: row?.work_order_code || "",
        fecha: formatDateOnly(row?.fecha_referencia, ""),
        equipo: equipmentOf(row),
        tipo: kindOf(row),
        bodega: material?.bodega_label || "",
        codigo: material?.material_codigo || "",
        material: materialName(material),
        clasificacion: MATERIAL_CATEGORY_LABELS[material?.categoria_costo] || "Insumos",
        cantidad: quantity,
        costo_unitario: Number(material?.costo_unitario || 0),
        costo: cost,
      });
      const articleKey = String(material?.producto_id || material?.material_label || "");
      const article = byArticle.get(articleKey) ?? {
        codigo: material?.material_codigo || "",
        material: materialName(material),
        clasificacion: MATERIAL_CATEGORY_LABELS[material?.categoria_costo] || "Insumos",
        cantidad: 0,
        costo: 0,
        _ordenes: new Set<string>(),
      };
      article.cantidad += quantity;
      article.costo += cost;
      article._ordenes.add(String(row?.work_order_code || ""));
      byArticle.set(articleKey, article);
    }
    return {
      orden: row?.work_order_code || "",
      fecha: formatDateOnly(row?.fecha_referencia, ""),
      equipo: equipmentOf(row),
      tipo: kindOf(row),
      ...costs,
    };
  });

  const sortByTotal = (map: Map<string, CostBucket>) =>
    [...map.entries()].sort((left, right) => right[1].total - left[1].total);
  const articles: Row[] = [...byArticle.values()]
    .sort((left, right) => right.costo - left.costo)
    .map(({ _ordenes, ...article }) => ({ ...article, ordenes: _ordenes.size }));
  const articleTotal = articles.reduce(
    (sum, article) => ({ cantidad: sum.cantidad + article.cantidad, costo: sum.costo + article.costo }),
    { cantidad: 0, costo: 0 },
  );
  const detailTotal = detailRows.reduce((sum, row) => sum + row.costo, 0);
  const categoryLabel = options.category ? MATERIAL_CATEGORY_LABELS[options.category] : "";

  const sheets: ReportSheet[] = [
    {
      name: "Composición del costo por OT",
      fitColumnsToPage: true,
      columns: [
        { key: "orden", header: "Orden", width: 11 },
        { key: "fecha", header: "Fecha", width: 10 },
        { key: "equipo", header: "Equipo", width: 28 },
        { key: "tipo", header: "Tipo", width: 13 },
        ...costColumns(),
      ],
      rows: [...compositionRows, { orden: "TOTAL", fecha: `${formatCountForDisplay(total.ordenes)} OT`, ...total }],
      rowKinds: [...compositionRows.map(() => null), "total"],
      emptyMessage: "Sin órdenes de mantenimiento para los filtros seleccionados.",
      note:
        "Total OT = repuestos + aceite + insumos + mano de obra. Las tres categorías de material son excluyentes. " +
        "Una OT entra al período por su fecha de cierre (o de inicio si sigue abierta) con el material registrado en ella; " +
        "el control de cebado y aceite cuenta el aceite que bodega entregó, en la fecha del egreso, por eso el aceite de los " +
        "dos reportes puede diferir en las OT que cruzan de mes o que registran más de lo entregado.",
    },
    groupSheet("Costo por máquina", { key: "grupo", header: "Equipo", width: 32 }, sortByTotal(byEquipment), total),
    groupSheet("Costo por tipo de OT", { key: "grupo", header: "Tipo de OT", width: 20 }, sortByTotal(byKind), total),
    groupSheet(
      "Costo por período",
      { key: "grupo", header: "Mes", width: 14 },
      [...byMonth.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([key, bucket]) => [monthLabel(key), bucket] as [string, CostBucket]),
      total,
    ),
    {
      name: categoryLabel ? `${categoryLabel} por artículo` : "Costo por artículo",
      fitColumnsToPage: true,
      columns: [
        { key: "codigo", header: "Código", width: 16, format: "text" },
        { key: "material", header: "Artículo", width: 40 },
        { key: "clasificacion", header: "Clasificación", width: 12 },
        { key: "cantidad", header: "Cantidad", width: 10, format: "number" },
        { key: "ordenes", header: "OT", width: 7 },
        { key: "costo", header: "Costo (USD)", width: 13, format: "currency" },
      ],
      rows: [...articles, { codigo: "TOTAL", material: `${formatCountForDisplay(articles.length)} artículos`, ...articleTotal }],
      rowKinds: [...articles.map(() => null), "total"],
      emptyMessage: "Sin materiales para los filtros seleccionados.",
      note: "La cantidad total suma unidades de medida distintas: léala por artículo.",
    },
    {
      name: "Detalle de materiales por OT",
      fitColumnsToPage: true,
      columns: [
        { key: "orden", header: "OT", width: 11 },
        { key: "fecha", header: "Fecha", width: 10 },
        { key: "equipo", header: "Equipo", width: 22 },
        { key: "tipo", header: "Tipo", width: 12 },
        { key: "bodega", header: "Bodega", width: 16 },
        { key: "codigo", header: "Código", width: 14, format: "text" },
        { key: "material", header: "Material", width: 28 },
        { key: "clasificacion", header: "Clasificación", width: 11 },
        { key: "cantidad", header: "Cantidad", width: 9, format: "number" },
        { key: "costo_unitario", header: "Costo unitario (USD)", width: 11, format: "currency" },
        { key: "costo", header: "Costo (USD)", width: 11, format: "currency" },
      ],
      rows: [...detailRows, { orden: "TOTAL", costo: detailTotal }],
      rowKinds: [...detailRows.map(() => null), "total"],
      emptyMessage: "Sin materiales para los filtros seleccionados.",
      note: "El costo registrado de cada material es el de su salida de bodega (FIFO); no se recalcula con el costo unitario redondeado.",
    },
  ];

  const repuestosByEquipment = [...byEquipment.entries()]
    .filter(([, bucket]) => bucket.repuestos > 0)
    .sort((left, right) => right[1].repuestos - left[1].repuestos)
    .slice(0, 15);

  return {
    fileName: options.fileName,
    title: "Reporte financiero de repuestos y mantenimiento",
    subtitle: options.filtersLabel,
    orientation: "landscape",
    compactPdf: true,
    summary: [
      { label: "Costo repuestos", value: formatCurrencyForDisplay(total.repuestos) },
      { label: "Costo aceite", value: formatCurrencyForDisplay(total.aceite) },
      { label: "Costo insumos", value: formatCurrencyForDisplay(total.insumos) },
      { label: "Mano de obra", value: formatCurrencyForDisplay(total.mano_obra) },
      { label: "Total mantenimiento", value: formatCurrencyForDisplay(total.total) },
      { label: "Órdenes de trabajo", value: formatCountForDisplay(total.ordenes) },
    ],
    charts: repuestosByEquipment.length
      ? [{
          title: "Costo de repuestos por máquina",
          subtitle: "Las 15 máquinas con mayor costo de repuestos",
          type: "bar",
          unit: "USD",
          points: repuestosByEquipment.map(([label, bucket]) => ({
            label: shortEquipment(label),
            value: Number(bucket.repuestos.toFixed(2)),
          })),
        }]
      : [],
    sheets,
  };
}

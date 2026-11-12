import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { formatCountForDisplay, formatCurrencyForDisplay, formatNumberForDisplay } from "@/app/utils/number-format";
import type { ReportColumn, ReportDefinition, ReportSheet } from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;
export type PurchaseLine = {
  key: string; orderId: string; code: string; date: string; supplier: string; status: string; currency: string;
  categoryId: string; category: string; material: string; quantity: number | null;
  unitCost: number | null; subtotal: number; tax: number; total: number; missingDetail: boolean;
};
const amount = (value: unknown, fallback = 0) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? fallback : Number(value);
const active = (row: AnyRow) => !row.is_deleted && !/ANUL|CANCEL|VOID/i.test(String(row.estado || row.status || ""));

/** Los importes se suman una vez por línea; nunca se replica la cabecera en categorías. */
export function purchaseLines(orders: AnyRow[]): PurchaseLine[] {
  const seen = new Set<string>();
  return orders.filter(active).flatMap((order, orderIndex) => {
    const orderId = String(order.id || order.codigo || orderIndex);
    if (seen.has(orderId)) return [];
    seen.add(orderId);
    const details = (Array.isArray(order.detalles) ? order.detalles : []).filter(active);
    const missingDetail = !details.length;
    return (missingDetail ? [order] : details).map((line: AnyRow, index: number) => {
      const quantity = missingDetail ? null : amount(line.cantidad);
      const unitCost = missingDetail ? null : amount(line.costo_unitario);
      const subtotal = amount(line.subtotal, (quantity || 0) * (unitCost || 0));
      const tax = amount(line.iva_total);
      return {
        key: `${orderId}:${line.id || index}`, orderId, code: String(order.codigo || order.numero || "Sin código"),
        date: order.fecha_emision || "", supplier: order.proveedor_nombre || "Sin proveedor", status: order.estado || "Sin estado",
        currency: String(order.moneda || "").trim().toUpperCase() || "USD",
        categoryId: missingDetail ? "missing-detail" : String(line.categoria_id || line.categoria_nombre || "uncategorized"),
        category: missingDetail ? "Sin detalle disponible" : String(line.categoria_nombre || "Sin categoría"),
        material: missingDetail ? "Detalle no disponible" : buildProductDisplayTitle({ nombre: line.nombre_producto || line.producto_nombre, descripcion: line.descripcion_producto || line.producto_descripcion }),
        quantity, unitCost, subtotal, tax, total: amount(line.total ?? line.total_final, subtotal + tax), missingDetail,
      };
    });
  });
}

export function purchaseTotals(lines: PurchaseLine[]) {
  return lines.reduce((sum, line) => ({ subtotal: sum.subtotal + line.subtotal, tax: sum.tax + line.tax, total: sum.total + line.total }), { subtotal: 0, tax: 0, total: 0 });
}
export function groupPurchaseLines(lines: PurchaseLine[], field: "categoryId" | "orderId" | "currency") {
  const grouped = new Map<string, PurchaseLine[]>();
  for (const line of lines) {
    const rows = grouped.get(line[field]);
    if (rows) rows.push(line);
    else grouped.set(line[field], [line]);
  }
  return [...grouped].map(([key, rows]) => ({
    key,
    label: field === "categoryId" ? rows[0]!.category : field === "orderId" ? rows[0]!.code : key,
    rows,
    orders: new Set(rows.map(row => row.orderId)).size,
    ...purchaseTotals(rows),
  }));
}

export function formatPurchaseAmount(value: number | null, currency = "USD") {
  if (value === null) return "";
  return currency === "USD" ? formatCurrencyForDisplay(value) : `${formatNumberForDisplay(value)} ${currency}`;
}

export function purchaseTotalsDisplay(lines: PurchaseLine[]) {
  const groups = groupPurchaseLines(lines, "currency");
  const display = (key: keyof ReturnType<typeof purchaseTotals>) =>
    groups.length ? groups.map(group => formatPurchaseAmount(group[key], group.key)).join(" · ") : formatPurchaseAmount(0);
  return { subtotal: display("subtotal"), tax: display("tax"), total: display("total") };
}

const moneyColumns: ReportColumn[] = [
  { key: "subtotal", header: "Subtotal neto", format: "currency", currencyKey: "currency", width: 17 },
  { key: "tax", header: "IVA", format: "currency", currencyKey: "currency", width: 15 },
  { key: "total", header: "Total con IVA", format: "currency", currencyKey: "currency", width: 18 },
];
const unitCostColumn: ReportColumn = { key: "unitCost", header: "Precio unitario", format: "currency", currencyKey: "currency", width: 18 };

export function buildPurchaseReport(lines: PurchaseLine[], period: string, title = "Compras", scope = "Todas las categorías"): ReportDefinition {
  const totals = purchaseTotalsDisplay(lines);
  const categories = groupPurchaseLines(lines, "categoryId");
  const orders = groupPurchaseLines(lines, "orderId");
  const currencies = groupPurchaseLines(lines, "currency");
  const currencyColumns: ReportColumn[] = currencies.some(group => group.key !== "USD")
    ? [{ key: "currency", header: "Moneda", width: 11 }]
    : [];
  const totalRows = (currencies.length ? currencies : [{ key: "USD", ...purchaseTotals([]) }]).map(group => ({
    code: "TOTAL", currency: group.key,
    subtotal: group.subtotal, tax: group.tax, total: group.total,
  }));
  const totalKinds = totalRows.map(() => "total" as const);
  const categoryRows: ReportSheet["rows"] = [];
  const categoryRowKinds: NonNullable<ReportSheet["rowKinds"]> = [];
  for (const category of categories) {
    for (const group of groupPurchaseLines(category.rows, "currency")) {
      categoryRows.push({
        material: category.label,
        code: `${formatCountForDisplay(group.orders)} ${group.orders === 1 ? "orden" : "órdenes"}`,
        currency: group.key, subtotal: group.subtotal, tax: group.tax, total: group.total,
      }, ...group.rows);
      categoryRowKinds.push("group", ...group.rows.map(() => "detail" as const));
    }
  }
  const categorySheet: ReportSheet = {
    name: "Compras por categoría",
    note: "El encabezado de cada categoría muestra sus órdenes distintas y sus importes. Debajo se listan las líneas de compra. El subtotal es neto de descuentos.",
    columns: [
      { key: "material", header: "Categoría / Material", width: 39 },
      { key: "code", header: "Orden", width: 22 },
      { key: "date", header: "Fecha", format: "date", width: 17 },
      { key: "supplier", header: "Proveedor", width: 31 },
      { key: "quantity", header: "Cantidad", format: "number", width: 14 },
      ...currencyColumns,
      unitCostColumn,
      ...moneyColumns,
    ],
    rows: [...categoryRows, ...totalRows.map(row => ({ ...row, code: "", material: "TOTAL" }))],
    rowKinds: [...categoryRowKinds, ...totalKinds],
    fitColumnsToPage: true,
  };
  return {
    title, subtitle: `${period} · ${scope}`, fileName: "informe-compras", compactPdf: true,
    summary: [{ label: "Órdenes distintas", value: orders.length }, { label: "Subtotal neto", value: totals.subtotal }, { label: "IVA", value: totals.tax }, { label: "Total con IVA", value: totals.total }],
    sheets: [
      categorySheet,
      { name: "Órdenes de compra", note: "Los importes corresponden a las líneas de la categoría seleccionada; una orden puede contener otras categorías.", columns: [{ key: "code", header: "Orden", width: 24 }, { key: "date", header: "Fecha", format: "date", width: 17 }, { key: "supplier", header: "Proveedor", width: 35 }, { key: "status", header: "Estado", width: 20 }, ...currencyColumns, ...moneyColumns], rows: [...orders.map(group => ({ ...group.rows[0], subtotal: group.subtotal, tax: group.tax, total: group.total })), ...totalRows], rowKinds: [...orders.map(() => null), ...totalKinds], fitColumnsToPage: true },
      { name: "Líneas de compra", columns: [{ key: "code", header: "Orden", width: 22 }, { key: "material", header: "Material", width: 44 }, { key: "category", header: "Categoría", width: 26 }, { key: "quantity", header: "Cantidad", format: "number", width: 14 }, ...currencyColumns, unitCostColumn, ...moneyColumns], rows: [...lines, ...totalRows], rowKinds: [...lines.map(() => null), ...totalKinds], fitColumnsToPage: true },
    ],
  };
}

import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { formatCountForDisplay, formatCurrencyForDisplay, formatNumberForDisplay } from "@/app/utils/number-format";
import { formatDateForInput, parseAppDate } from "@/app/utils/date-time";
import type { ReportChart, ReportColumn, ReportDefinition, ReportSheet } from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;
export const SPARE_PARTS_CATEGORY = { value: "repuestos", title: "Repuestos" } as const;
export type PurchaseLine = {
  key: string; orderId: string; code: string; date: string; supplierId: string; supplier: string; status: string; currency: string;
  categoryId: string; category: string; material: string; quantity: number | null;
  brandId: string; brand: string;
  unitCost: number | null; subtotal: number; tax: number; total: number; missingDetail: boolean;
};
const amount = (value: unknown, fallback = 0) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? fallback : Number(value);
const active = (row: AnyRow) => !row.is_deleted && !/ANUL|CANCEL|VOID/i.test(String(row.estado || row.status || ""));

function purchaseSupplier(order: AnyRow) {
  const title = String(order.proveedor_nombre || "").trim() || "Sin proveedor";
  const value = String(order.proveedor_id || "").trim() || `nombre:${title.toLocaleLowerCase("es-EC")}`;
  return { value, title };
}

export function purchaseSupplierOptions(orders: AnyRow[]) {
  const options = new Map<string, string>();
  for (const order of orders.filter(active)) {
    const { value, title } = purchaseSupplier(order);
    if (!options.has(value)) options.set(value, title);
  }
  return [...options].map(([value, title]) => ({ value, title }))
    .sort((a, b) => a.title.localeCompare(b.title, "es-EC"));
}

function purchaseDate(value: unknown) {
  const parsed = parseAppDate(value);
  return parsed ? formatDateForInput(parsed) : "";
}

/** Los importes se suman una vez por línea; nunca se replica la cabecera en categorías. */
export function purchaseLines(orders: AnyRow[]): PurchaseLine[] {
  const seen = new Set<string>();
  return orders.filter(active).flatMap((order, orderIndex) => {
    const orderId = String(order.id || order.codigo || orderIndex);
    if (seen.has(orderId)) return [];
    seen.add(orderId);
    const date = purchaseDate(order.fecha_emision);
    const supplier = purchaseSupplier(order);
    const details = (Array.isArray(order.detalles) ? order.detalles : []).filter(active);
    const missingDetail = !details.length;
    return (missingDetail ? [order] : details).map((line: AnyRow, index: number) => {
      const quantity = missingDetail ? null : amount(line.cantidad);
      const unitCost = missingDetail ? null : amount(line.costo_unitario);
      const subtotal = amount(line.subtotal, (quantity || 0) * (unitCost || 0));
      const tax = amount(line.iva_total);
      const catalogCategory = String(line.categoria_nombre || "").trim();
      const sparePart = !missingDetail && /^repuestos?$/i.test(catalogCategory);
      const brand = sparePart ? String(line.marca_nombre || "").trim() : "";
      return {
        key: `${orderId}:${line.id || index}`, orderId, code: String(order.codigo || order.numero || "Sin código"),
        date, supplierId: supplier.value, supplier: supplier.title, status: order.estado || "Sin estado",
        currency: String(order.moneda || "").trim().toUpperCase() || "USD",
        categoryId: missingDetail ? "missing-detail" : sparePart ? SPARE_PARTS_CATEGORY.value : String(line.categoria_id || catalogCategory || "uncategorized"),
        category: missingDetail ? "Sin detalle disponible" : sparePart ? SPARE_PARTS_CATEGORY.title : catalogCategory || "Sin categoría",
        brandId: brand ? String(line.marca_id || `nombre:${brand.toLocaleLowerCase("es-EC")}`) : "no-brand",
        brand: sparePart ? brand || "Sin marca" : "",
        material: missingDetail ? "Detalle no disponible" : buildProductDisplayTitle({ nombre: line.nombre_producto || line.producto_nombre, descripcion: line.descripcion_producto || line.producto_descripcion }),
        quantity, unitCost, subtotal, tax, total: amount(line.total ?? line.total_final, subtotal + tax), missingDetail,
      };
    });
  });
}

export function filterPurchaseLines(lines: PurchaseLine[], from: string, to: string, supplierId: string | null) {
  return lines.filter(line =>
    (!supplierId || line.supplierId === supplierId) &&
    ((!from && !to) || (line.date && (!from || line.date >= from) && (!to || line.date <= to))),
  );
}

export function purchaseTotals(lines: PurchaseLine[]) {
  return lines.reduce((sum, line) => ({ subtotal: sum.subtotal + line.subtotal, tax: sum.tax + line.tax, total: sum.total + line.total }), { subtotal: 0, tax: 0, total: 0 });
}
export function groupPurchaseLines(lines: PurchaseLine[], field: "categoryId" | "orderId" | "currency" | "brandId") {
  const labelFields = { categoryId: "category", orderId: "code", currency: "currency", brandId: "brand" } as const;
  const grouped = new Map<string, PurchaseLine[]>();
  for (const line of lines) {
    const rows = grouped.get(line[field]);
    if (rows) rows.push(line);
    else grouped.set(line[field], [line]);
  }
  return [...grouped].map(([key, rows]) => ({
    key,
    label: rows[0]![labelFields[field]],
    rows,
    orders: new Set(rows.map(row => row.orderId)).size,
    ...purchaseTotals(rows),
  }));
}

export function groupSparePartsByBrand(lines: PurchaseLine[]) {
  return groupPurchaseLines(lines.filter(line => line.categoryId === SPARE_PARTS_CATEGORY.value), "brandId")
    .sort((a, b) => a.label.localeCompare(b.label, "es-EC"));
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

export function buildPurchaseCharts(lines: PurchaseLine[]): ReportChart[] {
  const months = new Map<string, { orders: Set<string>; totals: Map<string, number> }>();
  const currencies = new Set<string>();
  for (const line of lines) {
    if (!line.date) continue;
    const key = line.date.slice(0, 7);
    const month = months.get(key) ?? { orders: new Set<string>(), totals: new Map<string, number>() };
    month.orders.add(line.orderId);
    month.totals.set(line.currency, (month.totals.get(line.currency) ?? 0) + line.total);
    months.set(key, month);
    currencies.add(line.currency);
  }

  const keys = [...months.keys()].sort();
  const charts: ReportChart[] = [];
  const monthlyLabel = (key: string) => `${key.slice(5, 7)}/${key.slice(0, 4)}`;
  for (let index = 0; index < keys.length; index += 12) {
    const period = keys.slice(index, index + 12);
    const subtitle = period.length === 1
      ? monthlyLabel(period[0]!)
      : `${monthlyLabel(period[0]!)} a ${monthlyLabel(period[period.length - 1]!)}`;
    charts.push({
      title: "Órdenes de compra por mes de emisión",
      subtitle, type: "bar", unit: "Órdenes distintas",
      points: period.map(key => ({ label: monthlyLabel(key), value: months.get(key)!.orders.size })),
    });
    for (const currency of currencies) {
      if (!period.some(key => months.get(key)!.totals.has(currency))) continue;
      charts.push({
        title: "Importe de compras con IVA por mes",
        subtitle, type: "bar", unit: currency === "USD" ? "USD ($)" : currency,
        points: period.map(key => ({ label: monthlyLabel(key), value: months.get(key)!.totals.get(currency) ?? 0 })),
      });
    }
  }
  return charts;
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
  const hasSpareParts = categories.some(group => group.key === SPARE_PARTS_CATEGORY.value);
  const brandColumns: ReportColumn[] = hasSpareParts ? [{ key: "brand", header: "Marca del repuesto", width: 18 }] : [];
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
      const groupRow = (material: string, group: ReturnType<typeof groupPurchaseLines>[number]) => ({
        material,
        code: `${formatCountForDisplay(group.orders)} ${group.orders === 1 ? "orden" : "órdenes"}`,
        currency: group.rows[0]!.currency, subtotal: group.subtotal, tax: group.tax, total: group.total,
      });
      categoryRows.push(groupRow(category.label, group));
      categoryRowKinds.push("group");
      const brands = groupSparePartsByBrand(group.rows);
      for (const brand of brands) {
        categoryRows.push(groupRow(`Marca: ${brand.label}`, brand), ...brand.rows);
        categoryRowKinds.push("group", ...brand.rows.map(() => "detail" as const));
      }
      if (!brands.length) {
        categoryRows.push(...group.rows);
        categoryRowKinds.push(...group.rows.map(() => "detail" as const));
      }
    }
  }
  const categorySheet: ReportSheet = {
    name: "Compras por categoría",
    note: "El subtotal es neto de descuentos. Los repuestos se desglosan por marca del catálogo.",
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
      { name: "Líneas de compra", columns: [{ key: "code", header: "Orden", width: 22 }, { key: "date", header: "Emisión de OC", format: "date", width: 17 }, { key: "supplier", header: "Proveedor", width: 28 }, { key: "material", header: "Material", width: 36 }, { key: "category", header: "Categoría", width: 22 }, ...brandColumns, { key: "quantity", header: "Cantidad", format: "number", width: 14 }, ...currencyColumns, unitCostColumn, ...moneyColumns], rows: [...lines, ...totalRows], rowKinds: [...lines.map(() => null), ...totalKinds], fitColumnsToPage: true },
    ],
  };
}

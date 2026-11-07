import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { formatCurrencyForDisplay } from "@/app/utils/number-format";
import type { ReportColumn, ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;
export type PurchaseLine = {
  key: string; orderId: string; code: string; date: string; supplier: string; status: string;
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
export function groupPurchaseLines(lines: PurchaseLine[], field: "categoryId" | "orderId") {
  const grouped = new Map<string, PurchaseLine[]>();
  for (const line of lines) grouped.set(line[field], [...(grouped.get(line[field]) || []), line]);
  return [...grouped].map(([key, rows]) => ({ key, label: field === "categoryId" ? rows[0]!.category : rows[0]!.code, rows, orders: new Set(rows.map(row => row.orderId)).size, ...purchaseTotals(rows) }));
}
const moneyColumns: ReportColumn[] = [
  { key: "subtotal", header: "Subtotal neto", format: "currency", width: 17 },
  { key: "tax", header: "IVA", format: "currency", width: 15 },
  { key: "total", header: "Total con IVA", format: "currency", width: 18 },
];
export function buildPurchaseReport(lines: PurchaseLine[], period: string, title = "Compras", scope = "Todas las categorías"): ReportDefinition {
  const totals = purchaseTotals(lines);
  const categories = groupPurchaseLines(lines, "categoryId");
  const orders = groupPurchaseLines(lines, "orderId");
  const totalRow = { label: "TOTAL", code: "TOTAL", ...totals };
  return {
    title, subtitle: `${period} · ${scope}`, fileName: "informe-compras", compactPdf: true,
    summary: [{ label: "Órdenes distintas", value: orders.length }, { label: "Subtotal neto", value: formatCurrencyForDisplay(totals.subtotal) }, { label: "IVA", value: formatCurrencyForDisplay(totals.tax) }, { label: "Total con IVA", value: formatCurrencyForDisplay(totals.total) }],
    sheets: [
      { name: "Compras por categoría", note: "Clasificación actual del catálogo. Importes registrados en las líneas de las órdenes vigentes. El subtotal es neto de descuentos; el IVA se presenta separado.", columns: [{ key: "label", header: "Categoría", width: 40 }, { key: "orders", header: "Órdenes distintas", format: "number", width: 16 }, ...moneyColumns], rows: [...categories, totalRow], rowKinds: [...categories.map(() => null), "total"], fitColumnsToPage: true },
      { name: "Órdenes de compra", note: "Los importes corresponden a las líneas de la categoría seleccionada; una orden puede contener otras categorías.", columns: [{ key: "code", header: "Orden", width: 24 }, { key: "date", header: "Fecha", format: "date", width: 17 }, { key: "supplier", header: "Proveedor", width: 35 }, { key: "status", header: "Estado", width: 20 }, ...moneyColumns], rows: [...orders.map(group => ({ ...group.rows[0], ...purchaseTotals(group.rows) })), totalRow], rowKinds: [...orders.map(() => null), "total"], fitColumnsToPage: true },
      { name: "Líneas de compra", columns: [{ key: "code", header: "Orden", width: 22 }, { key: "material", header: "Material", width: 44 }, { key: "category", header: "Categoría", width: 26 }, { key: "quantity", header: "Cantidad", format: "number", width: 14 }, { key: "unitCost", header: "Precio unitario", format: "currency", width: 18 }, ...moneyColumns], rows: [...lines, totalRow], rowKinds: [...lines.map(() => null), "total"], fitColumnsToPage: true },
    ],
  };
}

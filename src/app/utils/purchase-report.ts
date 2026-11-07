import type { ReportColumn, ReportDefinition } from "./maintenance-intelligence-reports";
type Row = Record<string, any>;
export type PurchaseLine = {
  id: string; orderId: string; order: string; date: string; supplier: string; warehouse: string;
  categoryId: string; category: string; productId: string; code: string; product: string;
  quantity: number; unitCost: number; subtotal: number; discount: number; tax: number; total: number;
};
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function purchaseLines(orders: Row[]): PurchaseLine[] {
  return orders.filter(order => !order.is_deleted && !/ANUL|CANCEL|VOID/i.test(String(order.estado || order.status || "")))
    .flatMap(order => (Array.isArray(order.detalles) ? order.detalles : []).filter((line: Row) => !line.is_deleted).map((line: Row, index: number) => ({
      id: String(line.id || `${order.id}-${index}`), orderId: String(order.id), order: String(order.codigo || order.numero || ""),
      date: order.fecha_emision, supplier: order.proveedor_nombre || "Sin proveedor", warehouse: order.bodega_label || "Sin bodega",
      categoryId: String(line.categoria_id || "uncategorized"), category: line.categoria_nombre || "Sin categoría",
      productId: String(line.producto_id || line.id), code: line.codigo_producto || line.producto_codigo || "",
      product: line.nombre_producto || line.producto_nombre || "Sin artículo", quantity: num(line.cantidad), unitCost: num(line.costo_unitario),
      subtotal: num(line.subtotal), discount: num(line.descuento), tax: num(line.iva_total), total: num(line.total),
    })));
}
export function purchaseTotals(lines: PurchaseLine[]) {
  return {
    subtotal: round(lines.reduce((sum, line) => sum + line.subtotal, 0)),
    discount: round(lines.reduce((sum, line) => sum + line.discount, 0)),
    tax: round(lines.reduce((sum, line) => sum + line.tax, 0)),
    total: round(lines.reduce((sum, line) => sum + line.total, 0)),
    orders: new Set(lines.map(line => line.orderId)).size,
    products: new Set(lines.map(line => line.productId)).size,
  };
}
export function groupPurchases(lines: PurchaseLine[], by: "categoryId" | "orderId") {
  const groups = new Map<string, PurchaseLine[]>();
  for (const line of lines) groups.set(line[by], [...(groups.get(line[by]) || []), line]);
  return [...groups].map(([id, rows]) => ({ ...rows[0]!, id, ...purchaseTotals(rows) })).sort((a, b) => b.total - a.total);
}
export function buildPurchaseReport(orders: Row[], categoryId: string | null, period: string): ReportDefinition {
  const all = purchaseLines(orders);
  const lines = categoryId ? all.filter(line => line.categoryId === categoryId) : all;
  const totals = purchaseTotals(lines);
  const costs: ReportColumn[] = [
    { key: "subtotal", header: "Subtotal (USD)", format: "currency", width: 13 },
    { key: "discount", header: "Descuento (USD)", format: "currency", width: 13 },
    { key: "tax", header: "IVA (USD)", format: "currency", width: 12 },
    { key: "total", header: "Total (USD)", format: "currency", width: 14 },
  ];
  const totalRow = { category: "TOTAL", order: "TOTAL", ...totals };
  const categories = groupPurchases(lines, "categoryId");
  const groupedOrders = groupPurchases(lines, "orderId");
  return {
    title: "Reporte de compras", fileName: "reporte_compras", subtitle: `${period} · ${categoryId ? all.find(line => line.categoryId === categoryId)?.category || "Categoría seleccionada" : "Todas las categorías"}`,
    compactPdf: true,
    summary: [{ label: "Órdenes", value: totals.orders }, { label: "Artículos", value: totals.products }, { label: "IVA (USD)", value: totals.tax }, { label: "Total compras (USD)", value: totals.total }],
    sheets: [
      { name: "Compras por categoría", fitColumnsToPage: true, columns: [{ key: "category", header: "Categoría", width: 30 }, { key: "orders", header: "OC", width: 8 }, { key: "products", header: "Artículos", width: 10 }, ...costs], rows: [...categories, totalRow], rowKinds: [...categories.map(() => null), "total"] },
      { name: "Compras por orden", fitColumnsToPage: true, note: "Los importes corresponden únicamente a los artículos de la categoría seleccionada.", columns: [{ key: "order", header: "OC", width: 17 }, { key: "date", header: "Fecha", format: "date", width: 12 }, { key: "supplier", header: "Proveedor", width: 32 }, ...costs], rows: [...groupedOrders, totalRow], rowKinds: [...groupedOrders.map(() => null), "total"] },
      { name: "Artículos comprados por OC", fitColumnsToPage: true, columns: [{ key: "order", header: "OC", width: 16 }, { key: "category", header: "Categoría", width: 17 }, { key: "code", header: "Código", format: "text", width: 16 }, { key: "product", header: "Artículo", width: 34 }, { key: "quantity", header: "Cantidad", format: "number", width: 10 }, { key: "unitCost", header: "Costo unitario", format: "currency", width: 13 }, ...costs], rows: [...lines, totalRow], rowKinds: [...lines.map(() => null), "total"] },
    ],
  };
}

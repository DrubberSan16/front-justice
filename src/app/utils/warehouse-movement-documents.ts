import { formatDateForInput, formatDateTime } from "@/app/utils/date-time";
import type { ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";

/**
 * Reporte de un documento de bodega (IB o EB).
 *
 * Vive fuera de la vista porque lo imprimen tanto el Kardex como las pantallas
 * de ingresos y egresos, y el documento tiene que salir igual desde las tres.
 */
export function buildWarehouseMovementReport(
  document: any,
  options?: { includeCosts?: boolean },
): ReportDefinition {
  const includeCosts = options?.includeCosts === true;
  const documentNumber = String(document?.numero_documento || "DOCUMENTO").trim();
  const details = Array.isArray(document?.detalles) ? document.detalles : [];
  // El desglose de descuento solo se imprime cuando el documento lo tiene: en
  // un egreso o una transferencia seria una columna de guiones.
  const hasDiscount = details.some(
    (detail: any) => Number(detail?.descuento || 0) > 0,
  );
  const hasTax = details.some((detail: any) => Number(detail?.iva_total || 0) > 0);
  const currency =
    String(document?.moneda || "USD").trim().toUpperCase() || "USD";

  return {
    fileName: `documento_kardex_${sanitizeFileName(documentNumber)}_${formatDateForInput()}`,
    title: document?.tipo_documento_label || "Documento de inventario",
    subtitle: `${documentNumber} | ${document?.bodega_label || "Bodega no especificada"}`,
    summary: [
      { label: "Fecha", value: formatDateTime(document?.fecha_movimiento, "-") },
      { label: "Tipo", value: document?.tipo_movimiento || "-" },
      { label: "Estado", value: document?.estado || document?.status || "-" },
      { label: "Referencia", value: document?.referencia || "-" },
      { label: "Ítems", value: document?.total_items || details.length },
      { label: "Cantidad", value: Number(document?.total_cantidad || 0) },
      ...(includeCosts && hasDiscount
        ? [
            {
              label: `Subtotal (${currency})`,
              value: Number(document?.subtotal_bruto || 0),
            },
            {
              label: `Descuento (${currency})`,
              value: Number(document?.descuento_total || 0),
            },
          ]
        : []),
      ...(includeCosts && hasTax
        ? [
            {
              label: `IVA (${currency})`,
              value: Number(document?.iva_total || 0),
            },
          ]
        : []),
      ...(includeCosts
        ? [
            {
              label: `Total (${currency})`,
              value: Number(
                document?.total_documento ??
                  document?.subtotal_neto ??
                  document?.total_costos ??
                  0,
              ),
            },
          ]
        : []),
      { label: "Responsable", value: document?.created_by || "SYSTEM" },
    ],
    sheets: [
      {
        name: "Detalle del documento",
        fitColumnsToPage: true,
        note: document?.observacion
          ? `Observación: ${document.observacion}`
          : undefined,
        rows: details.map((detail: any, index: number) => ({
          linea: index + 1,
          codigo: detail.producto_codigo || "",
          material: detail.producto_nombre || "",
          unidad: detail.unidad_label || "",
          condicion: detail.condicion_material || "",
          cantidad: Number(detail.cantidad || 0),
          ...(includeCosts
            ? {
                costo_unitario: Number(detail.costo_unitario || 0),
                subtotal: Number(
                  detail.total_linea ?? detail.subtotal_costo ?? 0,
                ),
              }
            : {}),
          ...(includeCosts && hasDiscount
            ? { descuento: Number(detail.descuento || 0) }
            : {}),
          ...(includeCosts && hasTax
            ? { iva: Number(detail.iva_total || 0) }
            : {}),
          observacion: detail.observacion || "",
        })),
        columns: [
          // El numero de linea es un indice, no una medida: va entero.
          { key: "linea", header: "#", width: 6 },
          { key: "codigo", header: "Código", width: 14 },
          { key: "material", header: "Material", width: 30 },
          { key: "unidad", header: "Unidad", width: 12 },
          { key: "condicion", header: "Condición", width: 12 },
          { key: "cantidad", header: "Cantidad", width: 12, format: "number" },
          ...(includeCosts
            ? [
                {
                  key: "costo_unitario",
                  header: `P. unit. (${currency})`,
                  width: 14,
                  format: "currency" as const,
                },
                ...(hasDiscount
                  ? [
                      {
                        key: "descuento",
                        header: `Desc. (${currency})`,
                        width: 13,
                        format: "currency" as const,
                      },
                    ]
                  : []),
                ...(hasTax
                  ? [
                      {
                        key: "iva",
                        header: `IVA (${currency})`,
                        width: 13,
                        format: "currency" as const,
                      },
                    ]
                  : []),
                {
                  key: "subtotal",
                  header: `Total (${currency})`,
                  width: 14,
                  format: "currency" as const,
                },
              ]
            : []),
          { key: "observacion", header: "Observación", width: 24 },
        ],
      },
    ],
  };
}

function sanitizeFileName(value: string) {
  return String(value || "documento")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "documento";
}

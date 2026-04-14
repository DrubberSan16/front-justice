type PurchaseOrderDetailLike = {
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
  costo_unitario?: string | number | null;
  descuento?: string | number | null;
  porcentaje_descuento?: string | number | null;
  iva_porcentaje?: string | number | null;
  iva_total?: string | number | null;
  subtotal?: string | number | null;
  total?: string | number | null;
};

type PurchaseOrderLike = {
  codigo?: string | null;
  fecha_emision?: string | Date | null;
  fecha_requerida?: string | Date | null;
  proveedor_nombre?: string | null;
  proveedor_identificacion?: string | null;
  referencia?: string | null;
  observacion?: string | null;
  condicion_pago?: string | null;
  vendedor?: string | null;
  moneda?: string | null;
  subtotal?: string | number | null;
  descuento_total?: string | number | null;
  iva_total?: string | number | null;
  total?: string | number | null;
  bodega_label?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  detalles?: PurchaseOrderDetailLike[] | null;
};

const PURCHASE_ORDER_TEMPLATE = {
  companyName: "Justicecompany Técnica Industrial S.A.",
  addressLine: "edificio torres del norte, torre b piso 8, of 804., Telef:",
  cityCountry: "GUAYAQUIL - Ecuador",
  cityEmission: "GUAYAQUIL",
  ruc: "1791355512001",
};

function repairText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!/[ÃƒÆ’Ãƒâ€šÃƒÂ¢]/.test(raw)) return raw;
  try {
    return decodeURIComponent(escape(raw));
  } catch {
    return raw;
  }
}

function toNumber(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown, decimals = 2) {
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(toNumber(value));
}

function formatMoney(value: unknown) {
  return formatNumber(value, 2);
}

function formatMoneyWithSymbol(value: unknown) {
  return `$${formatMoney(value)}`;
}

function formatDate(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTime(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function sumBy<T>(rows: T[], getter: (row: T) => unknown) {
  return rows.reduce((acc, row) => acc + toNumber(getter(row)), 0);
}

function safeText(value: unknown, fallback = "-") {
  const text = repairText(value);
  return text || fallback;
}

export async function downloadPurchaseOrderPdf(
  order: PurchaseOrderLike,
  userName = "Sistema",
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 38;
  const marginRight = 38;
  const usableWidth = pageWidth - marginLeft - marginRight;
  const rightX = pageWidth - marginRight;
  const details = Array.isArray(order.detalles) ? order.detalles : [];
  const observation = safeText(order.observacion || order.condicion_pago, "Sin observación");
  const totalQuantity = sumBy(details, (item) => item.cantidad);
  const totalUnitCost = sumBy(details, (item) => item.costo_unitario);
  const totalDiscount = sumBy(details, (item) => item.descuento);
  const totalIva = details.length
    ? sumBy(details, (item) => item.iva_total)
    : toNumber(order.iva_total);
  const totalAmount = details.length
    ? sumBy(details, (item) => item.total)
    : toNumber(order.total);
  const emissionDateLabel =
    formatDateTime(order.fecha_emision) || formatDateTime(new Date());
  const preparedBy = safeText(order.created_by || userName, userName);
  const approvedBy = safeText(order.updated_by || order.created_by || userName, userName);
  const generatedAt = formatDateTime(new Date());

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(PURCHASE_ORDER_TEMPLATE.companyName, marginLeft, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(PURCHASE_ORDER_TEMPLATE.addressLine, marginLeft, 55);
  doc.text(PURCHASE_ORDER_TEMPLATE.cityCountry, marginLeft, 70);
  doc.text(`RUC: ${PURCHASE_ORDER_TEMPLATE.ruc}`, marginLeft, 85);

  doc.text(
    `${PURCHASE_ORDER_TEMPLATE.cityEmission}, ${emissionDateLabel}`,
    rightX,
    70,
    { align: "right" },
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`No. ${safeText(order.codigo, "OC-SIN-CODIGO")}`, rightX, 85, {
    align: "right",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ORDEN DE COMPRA", pageWidth / 2, 112, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const observationLines = doc.splitTextToSize(
    `Observación: ${observation}`,
    usableWidth,
  );
  doc.text(observationLines, marginLeft, 136);
  let cursorY = 136 + observationLines.length * 12 + 10;

  doc.setFont("helvetica", "bold");
  doc.text("Proveedor:", marginLeft, cursorY);
  doc.text("Ced/RUC:", marginLeft + 270, cursorY);
  doc.text("REF:", rightX - 120, cursorY);

  doc.setFont("helvetica", "normal");
  doc.text(safeText(order.proveedor_nombre, "Sin proveedor"), marginLeft + 56, cursorY);
  doc.text(
    safeText(order.proveedor_identificacion, "-"),
    marginLeft + 320,
    cursorY,
  );
  doc.text(safeText(order.referencia, "-"), rightX, cursorY, { align: "right" });

  cursorY += 18;
  doc.setFont("helvetica", "bold");
  doc.text("Vendedor:", marginLeft, cursorY);
  if (order.bodega_label) {
    doc.text("Bodega:", marginLeft + 270, cursorY);
  }
  doc.setFont("helvetica", "normal");
  doc.text(safeText(order.vendedor, "MATRIZ"), marginLeft + 54, cursorY);
  if (order.bodega_label) {
    doc.text(safeText(order.bodega_label), marginLeft + 314, cursorY);
  }

  cursorY += 18;
  doc.line(marginLeft, cursorY, rightX, cursorY);
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    theme: "grid",
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.5,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      lineColor: [0, 0, 0],
      lineWidth: 0.4,
      textColor: [0, 0, 0],
      valign: "middle",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      halign: "center",
      fontStyle: "bold",
    },
    bodyStyles: {
      halign: "left",
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 68 },
      1: { cellWidth: 196 },
      2: { cellWidth: 44, halign: "right" },
      3: { cellWidth: 56, halign: "right" },
      4: { cellWidth: 46, halign: "right" },
      5: { cellWidth: 50, halign: "right" },
      6: { cellWidth: 56, halign: "right" },
      7: { cellWidth: 72, halign: "right" },
    },
    head: [[
      "COD.",
      "ITEM",
      "CANT.",
      "COSTO",
      "DESC.",
      "% DESC.",
      "IVA",
      "TOTAL",
    ]],
    body: details.length
      ? details.map((detail) => [
          safeText(detail.codigo_producto),
          safeText(detail.nombre_producto),
          formatNumber(detail.cantidad, 2),
          formatMoney(detail.costo_unitario),
          formatMoney(detail.descuento),
          formatNumber(detail.porcentaje_descuento, 2),
          formatMoney(detail.iva_total),
          formatMoney(detail.total),
        ])
      : [["-", "Sin materiales cargados", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"]],
    foot: [[
      { content: "TOTALES:", colSpan: 2, styles: { halign: "right" } },
      formatNumber(totalQuantity, 2),
      formatMoneyWithSymbol(totalUnitCost),
      formatMoneyWithSymbol(totalDiscount),
      "",
      formatMoneyWithSymbol(totalIva),
      formatMoneyWithSymbol(totalAmount),
    ]],
  });

  const lastTable = (doc as any).lastAutoTable;
  let signatureY = (lastTable?.finalY ?? cursorY + 220) + 68;

  if (signatureY > pageHeight - 150) {
    doc.addPage();
    signatureY = 150;
  }

  const lineWidth = 150;
  const gap = (usableWidth - lineWidth * 3) / 2;
  const signaturePositions: [number, number, number] = [
    marginLeft,
    marginLeft + lineWidth + gap,
    marginLeft + (lineWidth + gap) * 2,
  ];
  const [preparedX, approvedX, receivedX] = signaturePositions;

  signaturePositions.forEach((x) => {
    doc.line(x, signatureY, x + lineWidth, signatureY);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("ELABORADO POR", preparedX + lineWidth / 2, signatureY + 14, {
    align: "center",
  });
  doc.text("AUTORIZADO POR", approvedX + lineWidth / 2, signatureY + 14, {
    align: "center",
  });
  doc.text("RECIBIDO POR", receivedX + lineWidth / 2, signatureY + 14, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.text(preparedBy, preparedX, signatureY + 30);
  doc.text(formatDate(order.fecha_emision || new Date()), preparedX, signatureY + 42);
  doc.text(approvedBy, approvedX, signatureY + 30);
  doc.text(formatDate(order.fecha_emision || new Date()), approvedX, signatureY + 42);
  doc.text("CI:", receivedX, signatureY + 30);

  doc.setFontSize(8);
  doc.text(
    `Generado por: ${safeText(userName, "Sistema")} a la fecha ${generatedAt}`,
    marginLeft,
    pageHeight - 26,
  );

  doc.save(`${safeText(order.codigo, "orden_compra")}.pdf`);
}

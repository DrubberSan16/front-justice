type PurchaseOrderDetailLike = {
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
  costo_unitario?: string | number | null;
  descuento?: string | number | null;
  porcentaje_descuento?: string | number | null;
  iva_porcentaje?: string | number | null;
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
  detalles?: PurchaseOrderDetailLike[] | null;
};

function repairText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!/[ÃƒÃ‚Ã¢]/.test(raw)) return raw;
  try {
    return decodeURIComponent(escape(raw));
  } catch {
    return raw;
  }
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: unknown, currency = "USD") {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatNumber(value: unknown, decimals = 2) {
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(toNumber(value));
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

function splitCurrency(value: unknown, currency = "USD") {
  return formatCurrency(value, currency).replace(/\$/g, "").trim();
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
  const marginX = 36;
  const rightX = pageWidth - marginX;
  const currency = repairText(order.moneda || "USD") || "USD";
  const emissionDate = formatDate(order.fecha_emision);
  const todayLabel = new Date().toLocaleString("es-EC");

  doc.setDrawColor(90, 110, 138);
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, 24, pageWidth - marginX * 2, 112, 10, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Justicecompany Técnica Industrial S.A.", marginX + 14, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "GUAYAS / GUAYAQUIL / AV. DE LAS AMÉRICAS / JUSTICE COMPANY",
    marginX + 14,
    62,
  );
  doc.text(`Guayaquil, ${emissionDate || formatDate(new Date())}`, marginX + 14, 78);
  doc.text("RUC: 0990018685001", marginX + 14, 94);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(repairText(order.codigo || "OC-SIN-CODIGO"), rightX, 52, {
    align: "right",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ORDEN DE COMPRA", rightX, 80, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Bodega destino: ${repairText(order.bodega_label || "Bodega matriz")}`,
    rightX,
    98,
    { align: "right" },
  );
  if (order.fecha_requerida) {
    doc.text(`Fecha requerida: ${formatDate(order.fecha_requerida)}`, rightX, 112, {
      align: "right",
    });
  }

  let cursorY = 156;

  doc.setFillColor(221, 234, 247);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 72, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Observación", marginX + 12, cursorY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const obsLines = doc.splitTextToSize(
    repairText(order.observacion || order.condicion_pago || "Sin observación"),
    pageWidth - marginX * 2 - 24,
  );
  doc.text(obsLines, marginX + 12, cursorY + 32);

  cursorY += 88;

  doc.setFillColor(244, 244, 244);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 66, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Proveedor:", marginX + 12, cursorY + 18);
  doc.text("Ced/RUC:", marginX + 12, cursorY + 34);
  doc.text("REF:", marginX + 250, cursorY + 18);
  doc.text("Vendedor:", marginX + 250, cursorY + 34);
  doc.setFont("helvetica", "normal");
  doc.text(repairText(order.proveedor_nombre || "Sin proveedor"), marginX + 82, cursorY + 18);
  doc.text(repairText(order.proveedor_identificacion || "-"), marginX + 82, cursorY + 34);
  doc.text(repairText(order.referencia || "-"), marginX + 284, cursorY + 18);
  doc.text(repairText(order.vendedor || "MATRIZ"), marginX + 304, cursorY + 34);

  cursorY += 84;

  const details = Array.isArray(order.detalles) ? order.detalles : [];
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    headStyles: {
      fillColor: [31, 78, 120],
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: "center",
      valign: "middle",
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      cellPadding: 4,
      overflow: "linebreak",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 180 },
      2: { cellWidth: 42, halign: "right" },
      3: { cellWidth: 60, halign: "right" },
      4: { cellWidth: 50, halign: "right" },
      5: { cellWidth: 50, halign: "right" },
      6: { cellWidth: 36, halign: "right" },
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
          repairText(detail.codigo_producto || "-"),
          repairText(detail.nombre_producto || "-"),
          formatNumber(detail.cantidad, 2),
          splitCurrency(detail.costo_unitario, currency),
          splitCurrency(detail.descuento, currency),
          formatNumber(detail.porcentaje_descuento, 2),
          `${formatNumber(detail.iva_porcentaje, 0)}%`,
          splitCurrency(detail.total, currency),
        ])
      : [["-", "Sin materiales cargados", "0.00", "0.00", "0.00", "0.00", "0%", "0.00"]],
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY + 120;
  let totalsY = finalY + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Subtotal:", rightX - 110, totalsY);
  doc.text(splitCurrency(order.subtotal, currency), rightX, totalsY, { align: "right" });
  totalsY += 14;
  doc.text("Descuento:", rightX - 110, totalsY);
  doc.text(splitCurrency(order.descuento_total, currency), rightX, totalsY, {
    align: "right",
  });
  totalsY += 14;
  doc.text("IVA:", rightX - 110, totalsY);
  doc.text(splitCurrency(order.iva_total, currency), rightX, totalsY, { align: "right" });
  totalsY += 16;
  doc.setFontSize(11);
  doc.text("TOTAL:", rightX - 110, totalsY);
  doc.text(splitCurrency(order.total, currency), rightX, totalsY, { align: "right" });

  const signatureY = Math.max(totalsY + 44, 690);
  const signatureWidth = 150;
  const signatureGap = (pageWidth - marginX * 2 - signatureWidth * 3) / 2;
  const signatureXs = [
    marginX,
    marginX + signatureWidth + signatureGap,
    marginX + (signatureWidth + signatureGap) * 2,
  ];
  const signatureLabels = ["Elaborado por", "Autorizado por", "Recibido por"];

  doc.setLineWidth(0.6);
  signatureXs.forEach((x, index) => {
    doc.line(x, signatureY, x + signatureWidth, signatureY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(signatureLabels[index] || "", x + signatureWidth / 2, signatureY + 14, {
      align: "center",
    });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(91, 107, 123);
  doc.text(`Generado por: ${repairText(userName)}`, marginX, 812);
  doc.text(todayLabel, rightX, 812, { align: "right" });

  doc.save(`${repairText(order.codigo || "orden_compra")}.pdf`);
}

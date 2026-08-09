import { formatDateOnly, formatDateTime } from "@/app/utils/date-time";
import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";

type WarehouseTransferDetailLike = {
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  descripcion_producto?: string | null;
  cantidad?: string | number | null;
  costo_unitario?: string | number | null;
  subtotal?: string | number | null;
  observacion?: string | null;
};

type WarehouseTransferLike = {
  codigo?: string | null;
  fecha_transferencia?: string | Date | null;
  estado?: string | null;
  observacion?: string | null;
  bodega_origen_label?: string | null;
  bodega_destino_label?: string | null;
  orden_compra_codigo?: string | null;
  orden_compra_proveedor?: string | null;
  egreso_bodega_codigo?: string | null;
  ingreso_bodega_codigo?: string | null;
  total_items?: string | number | null;
  total_cantidad?: string | number | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  created_by?: string | null;
  updated_by?: string | null;
  detalles?: WarehouseTransferDetailLike[] | null;
};

const COMPANY = {
  name: "Justicecompany Técnica Industrial S.A.",
  address: "Edificio Torres del Norte, Torre B, piso 8, oficina 804",
  city: "GUAYAQUIL - Ecuador",
  ruc: "1791355512001",
};

const COLORS = {
  primary: [36, 91, 132] as [number, number, number],
  primaryLight: [232, 241, 247] as [number, number, number],
  accent: [242, 167, 107] as [number, number, number],
  border: [190, 199, 207] as [number, number, number],
  muted: [91, 102, 112] as [number, number, number],
  text: [31, 41, 51] as [number, number, number],
};

function text(value: unknown, fallback = "-") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function numberValue(value: unknown) {
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
  }).format(numberValue(value));
}

function formatMoney(value: unknown) {
  return `$${formatNumber(value, 2)}`;
}

function fileName(value: unknown) {
  const normalized = text(value, "transferencia_bodega")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "transferencia_bodega";
}

function sumBy(
  details: WarehouseTransferDetailLike[],
  getter: (detail: WarehouseTransferDetailLike) => unknown,
) {
  return details.reduce((total, detail) => total + numberValue(getter(detail)), 0);
}

function drawLabelValue(
  doc: any,
  label: string,
  value: unknown,
  x: number,
  y: number,
  width: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  const lines = doc.splitTextToSize(text(value), width);
  doc.text(lines.slice(0, 2), x, y + 13);
}

export async function downloadWarehouseTransferPdf(
  transfer: WarehouseTransferLike,
  generatedBy = "Sistema",
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const logo = await getCompanyLogoAsset();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 38;
  const rightX = pageWidth - marginX;
  const usableWidth = pageWidth - marginX * 2;
  const details = Array.isArray(transfer.detalles) ? transfer.detalles : [];
  const totalQuantity = details.length
    ? sumBy(details, (detail) => detail.cantidad)
    : numberValue(transfer.total_cantidad);
  const totalAmount = sumBy(details, (detail) => detail.subtotal);
  const generatedAt = formatDateTime(new Date(), "-");
  const transferDate = formatDateOnly(
    transfer.fecha_transferencia,
    text(transfer.fecha_transferencia),
  );
  const preparedBy = text(transfer.created_by, generatedBy);
  const updatedBy = text(transfer.updated_by || transfer.created_by, generatedBy);

  const drawCompactHeader = () => {
    drawPdfCompanyLogo(doc, logo, {
      marginX,
      y: 24,
      maxWidth: 100,
      maxHeight: 30,
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text("GUÍA INTERNA", rightX, 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(text(transfer.codigo, "SIN CÓDIGO"), rightX, 48, { align: "right" });
    doc.setDrawColor(...COLORS.border);
    doc.line(marginX, 62, rightX, 62);
  };

  drawPdfCompanyLogo(doc, logo, {
    marginX,
    y: 26,
    maxWidth: 112,
    maxHeight: 36,
  });

  const companyTextX = marginX + (logo ? 128 : 0);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(COMPANY.name, companyTextX, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(COMPANY.address, companyTextX, 52);
  doc.text(`${COMPANY.city} · RUC: ${COMPANY.ruc}`, companyTextX, 65);

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(marginX, 84, usableWidth, 54, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GUÍA INTERNA", marginX + 16, 107);
  doc.setFontSize(10);
  doc.text(`No. ${text(transfer.codigo, "SIN CÓDIGO")}`, rightX - 16, 107, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Generado: ${generatedAt}`, marginX + 16, 124);
  doc.text(`Estado: ${text(transfer.estado, "COMPLETADA")}`, rightX - 16, 124, {
    align: "right",
  });

  const fieldTop = 160;
  const columnGap = 18;
  const columnWidth = (usableWidth - columnGap) / 2;
  drawLabelValue(doc, "Fecha de transferencia", transferDate, marginX, fieldTop, columnWidth);
  drawLabelValue(
    doc,
    "Orden de compra",
    transfer.orden_compra_codigo || "Transferencia manual",
    marginX + columnWidth + columnGap,
    fieldTop,
    columnWidth,
  );
  drawLabelValue(doc, "Bodega origen", transfer.bodega_origen_label, marginX, fieldTop + 39, columnWidth);
  drawLabelValue(
    doc,
    "Bodega destino",
    transfer.bodega_destino_label,
    marginX + columnWidth + columnGap,
    fieldTop + 39,
    columnWidth,
  );
  drawLabelValue(
    doc,
    "Documento de egreso",
    transfer.egreso_bodega_codigo,
    marginX,
    fieldTop + 78,
    columnWidth,
  );
  drawLabelValue(
    doc,
    "Documento de ingreso",
    transfer.ingreso_bodega_codigo,
    marginX + columnWidth + columnGap,
    fieldTop + 78,
    columnWidth,
  );

  let tableStartY = fieldTop + 120;
  if (transfer.orden_compra_proveedor) {
    drawLabelValue(
      doc,
      "Proveedor / referencia",
      transfer.orden_compra_proveedor,
      marginX,
      tableStartY,
      usableWidth,
    );
    tableStartY += 38;
  }

  if (transfer.observacion) {
    doc.setFillColor(...COLORS.primaryLight);
    const observationLines = doc.splitTextToSize(
      `Observación: ${text(transfer.observacion)}`,
      usableWidth - 20,
    );
    const observationHeight = Math.max(32, observationLines.length * 11 + 14);
    doc.roundedRect(marginX, tableStartY, usableWidth, observationHeight, 4, 4, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.text);
    doc.text(observationLines, marginX + 10, tableStartY + 16);
    tableStartY += observationHeight + 14;
  }

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX, top: 78, bottom: 74 },
    theme: "grid",
    showFoot: "lastPage",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 4,
      lineColor: COLORS.border,
      lineWidth: 0.35,
      textColor: COLORS.text,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    footStyles: {
      fillColor: COLORS.primaryLight,
      textColor: COLORS.text,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },
      1: { cellWidth: 54 },
      2: { cellWidth: 95 },
      3: { cellWidth: 105 },
      4: { cellWidth: 44, halign: "right" },
      5: { cellWidth: 54, halign: "right" },
      6: { cellWidth: 58, halign: "right" },
      7: { cellWidth: "auto" },
    },
    head: [[
      "#",
      "CÓDIGO",
      "MATERIAL",
      "DESCRIPCIÓN",
      "CANT.",
      "COSTO U.",
      "SUBTOTAL",
      "OBSERVACIÓN",
    ]],
    body: details.length
      ? details.map((detail, index) => [
          index + 1,
          text(detail.codigo_producto),
          text(detail.nombre_producto),
          text(detail.descripcion_producto),
          formatNumber(detail.cantidad, 2),
          formatMoney(detail.costo_unitario),
          formatMoney(detail.subtotal),
          text(detail.observacion),
        ])
      : [[1, "-", "Sin materiales registrados", "-", "0,00", "$0,00", "$0,00", "-"]],
    foot: [[
      { content: "TOTALES", colSpan: 4, styles: { halign: "right" } },
      formatNumber(totalQuantity, 2),
      "",
      formatMoney(totalAmount),
      `${details.length || numberValue(transfer.total_items)} ítem(s)`,
    ]],
    didDrawPage: (data: any) => {
      if (data.pageNumber > 1) drawCompactHeader();
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  let signatureY = Number(lastTable?.finalY || tableStartY) + 64;
  if (signatureY > pageHeight - 145) {
    doc.addPage();
    drawCompactHeader();
    signatureY = 150;
  }

  const signatureWidth = 190;
  const signatureGap = usableWidth - signatureWidth * 2;
  const leftSignatureX = marginX;
  const rightSignatureX = marginX + signatureWidth + signatureGap;
  doc.setDrawColor(...COLORS.muted);
  doc.line(leftSignatureX, signatureY, leftSignatureX + signatureWidth, signatureY);
  doc.line(rightSignatureX, signatureY, rightSignatureX + signatureWidth, signatureY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.text);
  doc.text("ENTREGADO POR", leftSignatureX + signatureWidth / 2, signatureY + 14, {
    align: "center",
  });
  doc.text("RECIBIDO POR", rightSignatureX + signatureWidth / 2, signatureY + 14, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(preparedBy, leftSignatureX, signatureY + 31);
  doc.text(`Fecha: ${transferDate}`, leftSignatureX, signatureY + 43);
  doc.text("Nombre:", rightSignatureX, signatureY + 31);
  doc.text("CI:", rightSignatureX, signatureY + 43);

  const auditY = signatureY + 72;
  doc.setFillColor(252, 241, 232);
  doc.roundedRect(marginX, auditY, usableWidth, 42, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("AUDITORÍA", marginX + 10, auditY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `Registrado por: ${preparedBy} · ${formatDateTime(transfer.created_at, transferDate)}`,
    marginX + 10,
    auditY + 27,
  );
  doc.text(
    `Última actualización: ${updatedBy} · ${formatDateTime(transfer.updated_at, transferDate)}`,
    rightX - 10,
    auditY + 27,
    { align: "right" },
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.line(marginX, pageHeight - 38, rightX, pageHeight - 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Generado por: ${text(generatedBy, "Sistema")} · ${generatedAt}`, marginX, pageHeight - 23);
    doc.text(`Página ${page} de ${pageCount}`, rightX, pageHeight - 23, { align: "right" });
  }

  doc.save(`${fileName(transfer.codigo)}-guia-interna.pdf`);
}

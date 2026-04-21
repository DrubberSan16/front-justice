import { formatDateOnly, formatDateTime } from "@/app/utils/date-time";

type GuideDetailLike = {
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
};

type GuideTransferLike = {
  codigo?: string | null;
  fecha_transferencia?: string | Date | null;
  bodega_origen_label?: string | null;
  bodega_destino_label?: string | null;
};

type GuideSucursalLike = {
  codigo?: string | null;
  nombre?: string | null;
};

type GuideLike = {
  numero_guia?: string | null;
  clave_acceso?: string | null;
  estado_emision?: string | null;
  sri_estado?: string | null;
  numero_autorizacion?: string | null;
  fecha_autorizacion?: string | Date | null;
  ambiente?: string | null;
  fecha_emision?: string | Date | null;
  fecha_ini_transporte?: string | Date | null;
  fecha_fin_transporte?: string | Date | null;
  dir_partida?: string | null;
  razon_social_transportista?: string | null;
  identificacion_transportista?: string | null;
  placa?: string | null;
  identificacion_destinatario?: string | null;
  razon_social_destinatario?: string | null;
  dir_destinatario?: string | null;
  motivo_traslado?: string | null;
  ruta?: string | null;
  detalle_snapshot?: GuideDetailLike[] | null;
};

type GuidePdfPayload = {
  guide: GuideLike;
  transfer?: GuideTransferLike | null;
  sucursal?: GuideSucursalLike | null;
  generatedBy?: string | null;
};

function repairText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!/[ÃƒÆ’Ã†â€™ÃƒÆ’Ã¢â‚¬Å¡ÃƒÆ’Ã‚Â¢]/.test(raw)) return raw;
  try {
    return decodeURIComponent(escape(raw));
  } catch {
    return raw;
  }
}

function safeText(value: unknown, fallback = "-") {
  const text = repairText(value);
  return text || fallback;
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

function formatDate(value: unknown) {
  return formatDateOnly(value, String(value ?? ""));
}

function formatFullDate(value: unknown) {
  return formatDateTime(value, String(value ?? ""));
}

export async function buildGuideRemisionPdfBlob(payload: GuidePdfPayload) {
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

  const guide = payload.guide ?? {};
  const transfer = payload.transfer ?? {};
  const sucursal = payload.sucursal ?? {};
  const details = Array.isArray(guide.detalle_snapshot) ? guide.detalle_snapshot : [];
  const marginLeft = 36;
  const marginRight = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginLeft - marginRight;
  const rightX = pageWidth - marginRight;
  const generatedAt = formatFullDate(new Date());
  const generatedBy = safeText(payload.generatedBy, "Sistema");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GUIA DE REMISION ELECTRONICA", marginLeft, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Sucursal: ${safeText(sucursal.nombre || sucursal.codigo, "Sin sucursal")}`, marginLeft, 58);
  doc.text(`Transferencia: ${safeText(transfer.codigo, "Sin transferencia")}`, marginLeft, 72);
  doc.text(`Ambiente: ${safeText(guide.ambiente, "PRUEBAS")}`, marginLeft, 86);

  doc.setFont("helvetica", "bold");
  doc.text(`Guia: ${safeText(guide.numero_guia, "Sin numero")}`, rightX, 40, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Estado: ${safeText(guide.estado_emision, "GENERADA")}`, rightX, 58, { align: "right" });
  doc.text(`SRI: ${safeText(guide.sri_estado, "Pendiente")}`, rightX, 72, { align: "right" });
  if (guide.numero_autorizacion) {
    doc.text(`Autorizacion: ${safeText(guide.numero_autorizacion)}`, rightX, 86, { align: "right" });
  }

  doc.setLineWidth(0.6);
  doc.line(marginLeft, 102, rightX, 102);

  let cursorY = 124;
  const headerRows = [
    [`Fecha emision`, formatDate(guide.fecha_emision)],
    [`Inicio transporte`, formatDate(guide.fecha_ini_transporte)],
    [`Fin transporte`, formatDate(guide.fecha_fin_transporte)],
    [`Fecha transferencia`, formatDate(transfer.fecha_transferencia)],
    [`Clave acceso`, safeText(guide.clave_acceso)],
    [`Ruta`, safeText(guide.ruta)],
    [`Partida`, safeText(guide.dir_partida)],
    [`Destino`, safeText(guide.dir_destinatario)],
    [`Bodega origen`, safeText(transfer.bodega_origen_label)],
    [`Bodega destino`, safeText(transfer.bodega_destino_label)],
    [`Transportista`, safeText(guide.razon_social_transportista)],
    [`ID transportista`, safeText(guide.identificacion_transportista)],
    [`Placa`, safeText(guide.placa)],
    [`Destinatario`, safeText(guide.razon_social_destinatario)],
    [`ID destinatario`, safeText(guide.identificacion_destinatario)],
    [`Motivo traslado`, safeText(guide.motivo_traslado)],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Datos principales", marginLeft, cursorY);
  cursorY += 10;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 5,
      lineColor: [183, 201, 214],
      lineWidth: 0.35,
      textColor: [31, 41, 55],
      valign: "middle",
    },
    headStyles: {
      fillColor: [31, 78, 120],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 118, fontStyle: "bold" },
      1: { cellWidth: usableWidth - 118 },
    },
    head: [["Campo", "Valor"]],
    body: headerRows,
  });

  const detailStartY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 140) + 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Detalle de materiales", marginLeft, detailStartY);

  autoTable(doc, {
    startY: detailStartY + 8,
    margin: { left: marginLeft, right: marginRight },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 5,
      lineColor: [183, 201, 214],
      lineWidth: 0.35,
      textColor: [31, 41, 55],
      valign: "middle",
    },
    headStyles: {
      fillColor: [244, 177, 131],
      textColor: [31, 41, 55],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: usableWidth - 170 },
      2: { cellWidth: 70, halign: "right" },
    },
    head: [["Codigo", "Descripcion", "Cantidad"]],
    body: details.length
      ? details.map((detail) => [
          safeText(detail.codigo_producto),
          safeText(detail.nombre_producto),
          formatNumber(detail.cantidad, 2),
        ])
      : [["-", "Sin materiales", "0.00"]],
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Generado por ${generatedBy} · ${generatedAt}`,
    marginLeft,
    pageHeight - 24,
  );

  return doc.output("blob");
}

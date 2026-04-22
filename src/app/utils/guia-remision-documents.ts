import { formatDateOnly, formatDateTime } from "@/app/utils/date-time";

type GuideDetailLike = {
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
  observacion?: string | null;
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

type GuideConfigLike = {
  ruc?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  dir_matriz?: string | null;
  dir_establecimiento?: string | null;
  estab?: string | null;
  pto_emi?: string | null;
};

type GuideProviderLike = {
  identificacion?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  direccion?: string | null;
  origen?: string | null;
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
  tipo_identificacion_transportista?: string | null;
  identificacion_transportista?: string | null;
  placa?: string | null;
  identificacion_destinatario?: string | null;
  razon_social_destinatario?: string | null;
  dir_destinatario?: string | null;
  motivo_traslado?: string | null;
  ruta?: string | null;
  detalle_snapshot?: GuideDetailLike[] | null;
  info_adicional?: Record<string, unknown> | null;
};

type GuidePdfPayload = {
  guide: GuideLike;
  transfer?: GuideTransferLike | null;
  sucursal?: GuideSucursalLike | null;
  config?: GuideConfigLike | null;
  provider?: GuideProviderLike | null;
  generatedBy?: string | null;
};

function repairText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!/[ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢]/.test(raw)) {
    return raw;
  }
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

function splitText(doc: any, text: string, width: number) {
  return doc.splitTextToSize(safeText(text, ""), width) as string[];
}

function drawInfoBlock(
  doc: any,
  title: string,
  rows: Array<[string, unknown]>,
  x: number,
  y: number,
  width: number,
) {
  const labelWidth = 110;
  const padding = 10;
  const lineHeight = 12;
  const titleHeight = 18;
  let cursorY = y + padding + titleHeight;

  doc.setDrawColor(206, 216, 228);
  doc.setFillColor(247, 250, 252);
  doc.roundedRect(x, y, width, 24, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(title.toUpperCase(), x + padding, y + 16);

  doc.setFillColor(255, 255, 255);
  let bodyHeight = 18;

  const preparedRows = rows.map(([label, value]) => {
    const valueLines = splitText(doc, safeText(value), width - labelWidth - padding * 2);
    const rowHeight = Math.max(lineHeight, valueLines.length * lineHeight);
    bodyHeight += rowHeight + 6;
    return { label, valueLines, rowHeight };
  });

  doc.roundedRect(x, y + 20, width, bodyHeight, 8, 8, "S");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  preparedRows.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${row.label}:`, x + padding, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text(row.valueLines, x + padding + labelWidth, cursorY);
    cursorY += row.rowHeight + 6;
  });

  return y + 20 + bodyHeight;
}

function footer(doc: any, generatedBy: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(214, 223, 233);
  doc.line(36, pageHeight - 28, pageWidth - 36, pageHeight - 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generado por ${safeText(generatedBy, "Sistema")} · ${formatFullDate(new Date())}`,
    36,
    pageHeight - 14,
  );
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
  const config = payload.config ?? {};
  const provider = payload.provider ?? {};
  const details = Array.isArray(guide.detalle_snapshot) ? guide.detalle_snapshot : [];
  const generatedBy = safeText(payload.generatedBy, "Sistema");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 36;
  const right = pageWidth - 36;
  const halfGap = 14;
  const columnWidth = (pageWidth - left * 2 - halfGap) / 2;

  doc.setFillColor(244, 246, 248);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(left, 28, columnWidth, 110, 12, 12, "F");
  doc.roundedRect(left + columnWidth + halfGap, 28, columnWidth, 110, 12, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("RIDE - GUIA DE REMISION", left + 14, 52);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(safeText(config.razon_social, "EMISOR"), left + 14, 72);
  doc.setFont("helvetica", "normal");
  doc.text(`RUC: ${safeText(config.ruc)}`, left + 14, 88);
  doc.text(
    `Sucursal: ${safeText(sucursal.nombre || sucursal.codigo)}`,
    left + 14,
    102,
  );
  doc.text(
    `Estab/Pto.Emi: ${safeText(config.estab)}/${safeText(config.pto_emi)}`,
    left + 14,
    116,
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(11);
  doc.text(
    String(guide.sri_estado || guide.estado_emision || "GENERADA").toUpperCase(),
    right - 14,
    52,
    { align: "right" },
  );

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`No. Guía: ${safeText(guide.numero_guia)}`, right - 14, 72, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Ambiente: ${safeText(guide.ambiente, "PRUEBAS")}`, right - 14, 88, {
    align: "right",
  });

  const accessKeyLines = splitText(doc, safeText(guide.clave_acceso), columnWidth - 28);
  doc.setFont("courier", "bold");
  doc.text(accessKeyLines, right - 14, 104, { align: "right" });

  let cursorY = 156;
  const leftBlockBottom = drawInfoBlock(
    doc,
    "Emisor y traslado",
    [
      ["Fecha emisión", formatDate(guide.fecha_emision)],
      ["Inicio transporte", formatDate(guide.fecha_ini_transporte)],
      ["Fin transporte", formatDate(guide.fecha_fin_transporte)],
      ["Transferencia", safeText(transfer.codigo)],
      ["Motivo", safeText(guide.motivo_traslado)],
      ["Ruta", safeText(guide.ruta)],
      ["Partida", safeText(guide.dir_partida)],
    ],
    left,
    cursorY,
    columnWidth,
  );

  const rightBlockBottom = drawInfoBlock(
    doc,
    "Transportista y destinatario",
    [
      ["Transportista", safeText(guide.razon_social_transportista)],
      [
        "Identificación",
        `${safeText(guide.tipo_identificacion_transportista)} · ${safeText(guide.identificacion_transportista)}`,
      ],
      ["Placa", safeText(guide.placa)],
      ["Destinatario", safeText(guide.razon_social_destinatario)],
      ["Id destinatario", safeText(guide.identificacion_destinatario)],
      ["Dirección destino", safeText(guide.dir_destinatario)],
    ],
    left + columnWidth + halfGap,
    cursorY,
    columnWidth,
  );

  cursorY = Math.max(leftBlockBottom, rightBlockBottom) + 16;

  if (
    provider.razon_social ||
    provider.identificacion ||
    provider.direccion
  ) {
    cursorY =
      drawInfoBlock(
        doc,
        "Proveedor origen / referencia comercial",
        [
          ["Proveedor", safeText(provider.razon_social)],
          ["RUC/Identificación", safeText(provider.identificacion)],
          ["Nombre comercial", safeText(provider.nombre_comercial)],
          ["Dirección", safeText(provider.direccion)],
          ["Origen de datos", safeText(provider.origen)],
        ],
        left,
        cursorY,
        pageWidth - left * 2,
      ) + 16;
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left, right: 36 },
    head: [["Código", "Descripción", "Cantidad", "Observación"]],
    body: details.length
      ? details.map((detail) => [
          safeText(detail.codigo_producto),
          safeText(detail.nombre_producto),
          formatNumber(detail.cantidad, 2),
          safeText(detail.observacion, ""),
        ])
      : [["-", "Sin materiales", "0.00", ""]],
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 5,
      lineColor: [214, 223, 233],
      lineWidth: 0.4,
      textColor: [15, 23, 42],
      valign: "middle",
    },
    headStyles: {
      fillColor: [28, 88, 123],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 86 },
      1: { cellWidth: 258 },
      2: { cellWidth: 70, halign: "right" },
      3: { cellWidth: 115 },
    },
    didDrawPage: () => {
      footer(doc, generatedBy);
    },
  });

  const finalY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 14;
  const infoAdicional = Object.entries(guide.info_adicional || {}).filter(
    ([, value]) => Boolean(String(value ?? "").trim()),
  );

  if (infoAdicional.length) {
    autoTable(doc, {
      startY: finalY,
      margin: { left, right: 36 },
      head: [["Información adicional", "Valor"]],
      body: infoAdicional.map(([label, value]) => [
        safeText(label),
        safeText(value),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 5,
        lineColor: [214, 223, 233],
        lineWidth: 0.35,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 180, fontStyle: "bold" },
        1: { cellWidth: pageWidth - left * 2 - 180 },
      },
      didDrawPage: () => {
        footer(doc, generatedBy);
      },
    });
  }

  if (guide.numero_autorizacion || guide.fecha_autorizacion) {
    const authorizationY =
      Math.min(
        pageHeight - 96,
        (((doc as any).lastAutoTable?.finalY ?? finalY) as number) + 18,
      );
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(left, authorizationY, pageWidth - left * 2, 44, 8, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text("AUTORIZACIÓN SRI", left + 12, authorizationY + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(
      `No. autorización: ${safeText(guide.numero_autorizacion)} · Fecha: ${formatFullDate(
        guide.fecha_autorizacion,
      )}`,
      left + 12,
      authorizationY + 31,
    );
  }

  return doc.output("blob");
}

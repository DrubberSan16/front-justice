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
  cod_estab_destino?: string | null;
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

function footer(doc: any, generatedBy: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  const totalPages = doc.getNumberOfPages();
  doc.setDrawColor(190, 198, 210);
  doc.line(36, pageHeight - 28, pageWidth - 36, pageHeight - 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generado por ${safeText(generatedBy, "Sistema")} - ${formatFullDate(new Date())}`,
    36,
    pageHeight - 14,
  );
  doc.text(`Pagina ${currentPage} de ${totalPages}`, pageWidth - 36, pageHeight - 14, {
    align: "right",
  });
}

function drawLabeledText(
  doc: any,
  label: string,
  value: unknown,
  x: number,
  y: number,
  width: number,
  options: { boldValue?: boolean; labelWidth?: number } = {},
) {
  const labelWidth = options.labelWidth ?? 120;
  const lines = splitText(doc, safeText(value, ""), Math.max(width - labelWidth, 60));
  const rowHeight = Math.max(12, lines.length * 11);
  doc.setFont("helvetica", "bold");
  doc.text(label, x, y);
  doc.setFont("helvetica", options.boldValue ? "bold" : "normal");
  doc.text(lines.length ? lines : ["-"], x + labelWidth, y);
  return rowHeight;
}

function drawBorderBox(doc: any, x: number, y: number, width: number, height: number) {
  doc.setDrawColor(25, 25, 25);
  doc.setLineWidth(0.8);
  doc.rect(x, y, width, height);
}

function drawGrayLabel(doc: any, text: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(text, x, y);
}

function drawTopRightBox(doc: any, guide: GuideLike, x: number, y: number, width: number) {
  const height = 176;
  drawBorderBox(doc, x, y, width, height);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(24, 24, 27);
  doc.text("GUIA DE REMISION", x + width / 2, y + 18, { align: "center" });

  doc.setFontSize(10);
  doc.text(`No. ${safeText(guide.numero_guia)}`, x + width / 2, y + 36, { align: "center" });

  let cursorY = y + 54;
  doc.setFontSize(8.2);
  cursorY += drawLabeledText(
    doc,
    "NUMERO DE AUTORIZACION:",
    guide.numero_autorizacion || guide.clave_acceso,
    x + 10,
    cursorY,
    width - 20,
    { labelWidth: 138, boldValue: true },
  );
  cursorY += 6;
  cursorY += drawLabeledText(
    doc,
    "FECHA Y HORA DE AUTORIZACION:",
    guide.fecha_autorizacion ? formatFullDate(guide.fecha_autorizacion) : "PENDIENTE",
    x + 10,
    cursorY,
    width - 20,
    { labelWidth: 154 },
  );
  cursorY += 8;

  drawGrayLabel(doc, "CLAVE DE ACCESO", x + 10, cursorY);
  cursorY += 8;
  doc.setFillColor(250, 250, 250);
  doc.rect(x + 10, cursorY, width - 20, 34, "F");
  doc.setFont("courier", "bold");
  doc.setFontSize(8.4);
  doc.setTextColor(17, 24, 39);
  const accessKeyLines = splitText(doc, safeText(guide.clave_acceso), width - 34);
  doc.text(accessKeyLines, x + width / 2, cursorY + 14, { align: "center" });
  cursorY += 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`AMBIENTE: ${safeText(guide.ambiente, "PRUEBAS")}`, x + 10, cursorY);
  doc.text(`EMISION: NORMAL`, x + width - 10, cursorY, { align: "right" });

  return height;
}

function drawTopLeftBox(doc: any, config: GuideConfigLike, x: number, y: number, width: number) {
  const height = 176;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`R.U.C.: ${safeText(config.ruc)}`, x, y + 12);

  let cursorY = y + 34;
  doc.setFontSize(11.5);
  doc.text(safeText(config.razon_social, "EMISOR"), x, cursorY);
  cursorY += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (safeText(config.nombre_comercial, "") !== "-") {
    doc.text(safeText(config.nombre_comercial, ""), x, cursorY);
    cursorY += 14;
  }

  cursorY += drawLabeledText(doc, "Direccion Matriz:", config.dir_matriz, x, cursorY, width, {
    labelWidth: 94,
  });
  cursorY += 6;
  cursorY += drawLabeledText(
    doc,
    "Direccion Sucursal:",
    config.dir_establecimiento || config.dir_matriz,
    x,
    cursorY,
    width,
    { labelWidth: 100 },
  );
  cursorY += 6;
  drawLabeledText(
    doc,
    "OBLIGADO A LLEVAR CONTABILIDAD:",
    (config as Record<string, unknown>)?.obligado_contabilidad || "NO",
    x,
    cursorY,
    width,
    { labelWidth: 178, boldValue: true },
  );

  return height;
}

function drawSectionTitle(doc: any, title: string, x: number, y: number, width: number) {
  doc.setFillColor(245, 245, 245);
  doc.rect(x, y, width, 18, "F");
  doc.setDrawColor(30, 30, 30);
  doc.rect(x, y, width, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(title, x + 8, y + 12);
}

function drawDetailSection(
  doc: any,
  title: string,
  rows: Array<[string, unknown]>,
  x: number,
  y: number,
  width: number,
  labelWidth = 150,
) {
  drawSectionTitle(doc, title, x, y, width);
  let cursorY = y + 32;
  doc.setFontSize(8.6);
  rows.forEach(([label, value]) => {
    const rowHeight = drawLabeledText(doc, label, value, x + 8, cursorY, width - 16, {
      labelWidth,
    });
    cursorY += rowHeight + 5;
  });
  doc.rect(x, y + 18, width, Math.max(28, cursorY - (y + 18) + 4));
  return Math.max(28, cursorY - (y + 18) + 4) + y + 18;
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
  const left = 32;
  const top = 26;
  const gap = 16;
  const leftWidth = 250;
  const rightWidth = pageWidth - left * 2 - leftWidth - gap;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

  drawTopLeftBox(doc, config, left, top, leftWidth);
  drawTopRightBox(doc, guide, left + leftWidth + gap, top, rightWidth);

  let cursorY = top + 192;
  const firstSectionBottom = drawDetailSection(
    doc,
    "DATOS DEL TRANSPORTISTA",
    [
      ["Razon Social / Nombres y Apellidos:", guide.razon_social_transportista],
      [
        "Identificacion (Transportista):",
        guide.identificacion_transportista,
      ],
      ["Placa:", guide.placa],
      [
        "Fecha inicio / Fecha fin Transporte:",
        `${formatDate(guide.fecha_ini_transporte)}  /  ${formatDate(guide.fecha_fin_transporte)}`,
      ],
    ],
    left,
    cursorY,
    pageWidth - left * 2,
    180,
  );

  cursorY = firstSectionBottom + 14;
  const secondSectionBottom = drawDetailSection(
    doc,
    "DATOS DEL TRASLADO Y DESTINATARIO",
    [
      ["Punto de Partida:", guide.dir_partida],
      ["Comprobante de Venta:", transfer.codigo || ""],
      ["Numero de Autorizacion:", guide.numero_autorizacion || ""],
      ["Motivo Traslado:", guide.motivo_traslado],
      ["Destino (Punto de llegada):", guide.dir_destinatario],
      ["Identificacion (Destinatario):", guide.identificacion_destinatario],
      ["Razon Social / Nombres Apellidos:", guide.razon_social_destinatario],
      ["Documento Aduanero:", ""],
      ["Codigo Establecimiento Destino:", guide.cod_estab_destino],
      ["Ruta:", guide.ruta || `${safeText(transfer.bodega_origen_label, "")} -> ${safeText(transfer.bodega_destino_label, "")}`],
      ["Fecha de Emision:", formatDate(guide.fecha_emision)],
    ],
    left,
    cursorY,
    pageWidth - left * 2,
    180,
  );

  cursorY = secondSectionBottom + 16;

  autoTable(doc, {
    startY: cursorY,
    margin: { left, right: left },
    head: [["Cantidad", "Descripcion", "Codigo Principal", "Codigo Auxiliar", "Detalle Adicional"]],
    body: details.length
      ? details.map((detail) => [
          formatNumber(detail.cantidad, 2),
          safeText(detail.nombre_producto),
          safeText(detail.codigo_producto),
          safeText(detail.codigo_producto, ""),
          safeText(detail.observacion, ""),
        ])
      : [["0.00", "Sin materiales", "", "", ""]],
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      textColor: [17, 24, 39],
      lineColor: [60, 60, 60],
      lineWidth: 0.5,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [17, 24, 39],
      fontStyle: "bold",
      lineColor: [40, 40, 40],
      lineWidth: 0.8,
    },
    columnStyles: {
      0: { cellWidth: 58, halign: "right" },
      1: { cellWidth: 190 },
      2: { cellWidth: 95 },
      3: { cellWidth: 90 },
      4: { cellWidth: 100 },
    },
    didDrawPage: () => {
      footer(doc, generatedBy);
    },
  });

  const infoAdicional = [
    ...Object.entries(guide.info_adicional || {}).filter(([, value]) => Boolean(String(value ?? "").trim())),
    ...(provider.razon_social || provider.identificacion || provider.direccion
      ? [
          ["PROVEEDOR", safeText(provider.razon_social, "")],
          ["IDENTIFICACION PROVEEDOR", safeText(provider.identificacion, "")],
          ["NOMBRE COMERCIAL PROVEEDOR", safeText(provider.nombre_comercial, "")],
          ["DIRECCION PROVEEDOR", safeText(provider.direccion, "")],
          ["ORIGEN DE DATOS", safeText(provider.origen, "")],
        ]
      : []),
    ["SUCURSAL", safeText(sucursal.nombre || sucursal.codigo, "")],
    ["BODEGA ORIGEN", safeText(transfer.bodega_origen_label, "")],
    ["BODEGA DESTINO", safeText(transfer.bodega_destino_label, "")],
  ].filter(([, value]) => Boolean(String(value ?? "").trim()));

  if (infoAdicional.length) {
    doc.addPage();
    drawSectionTitle(doc, "INFORMACION ADICIONAL", left, top + 6, pageWidth - left * 2);
    autoTable(doc, {
      startY: top + 28,
      margin: { left, right: left },
      head: [["Informacion Adicional", "Valor"]],
      body: infoAdicional.map(([label, value]) => [safeText(label), safeText(value)]),
      styles: {
        font: "helvetica",
        fontSize: 8.2,
        cellPadding: 5,
        textColor: [17, 24, 39],
        lineColor: [70, 70, 70],
        lineWidth: 0.45,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [17, 24, 39],
        fontStyle: "bold",
        lineColor: [40, 40, 40],
        lineWidth: 0.8,
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

  return doc.output("blob");
}

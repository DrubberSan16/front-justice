import { formatDateOnly, formatDateTime } from "@/app/utils/date-time";
import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";

/**
 * Constancia imprimible del egreso de bodega (EB) de una orden de trabajo.
 *
 * La salida de materiales deja dos rastros: la entrega dentro de la OT y el
 * egreso que realmente descarga el stock. Bodega firma el segundo, asi que el
 * documento se arma alrededor del numero de EB y no del codigo de entrega.
 *
 * Cada OT cierra con un solo egreso, aunque el material haya salido en varias
 * tandas: el PDF es un unico documento que lista todos los movimientos de
 * egreso de la orden, con una sola firma y un solo bloque de auditoria. La
 * columna EGRESO conserva de que movimiento salio cada linea.
 */
export type MaterialIssueDocumentDetailLike = {
  producto_codigo?: string | null;
  producto_nombre?: string | null;
  producto_descripcion?: string | null;
  producto_label?: string | null;
  bodega_label?: string | null;
  condicion_material?: string | null;
  cantidad?: string | number | null;
  costo_unitario?: string | number | null;
  subtotal?: string | number | null;
  observacion?: string | null;
};

export type MaterialIssueDocumentLike = {
  id?: string | null;
  numero_documento?: string | null;
  fecha_movimiento?: string | Date | null;
  referencia?: string | null;
  observacion?: string | null;
  estado?: string | null;
  bodega_label?: string | null;
  total_items?: string | number | null;
  total_cantidad?: string | number | null;
  total_costos?: string | number | null;
  created_by?: string | null;
  created_at?: string | Date | null;
  updated_by?: string | null;
  updated_at?: string | Date | null;
  detalles?: MaterialIssueDocumentDetailLike[] | null;
};

export type MaterialIssueWorkOrderLike = {
  code?: string | null;
  title?: string | null;
  status_label?: string | null;
  equipment_label?: string | null;
  equipment_component_label?: string | null;
  maintenance_kind_label?: string | null;
  created_by_label?: string | null;
  created_at?: string | Date | null;
  processed_by_label?: string | null;
  processed_at?: string | Date | null;
  approved_by_label?: string | null;
  approved_at?: string | Date | null;
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

function fileNamePart(value: unknown, fallback: string) {
  const normalized = text(value, fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function conditionLabel(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "USADO") return "Usado";
  if (normalized === "CRITICO") return "Crítico";
  if (normalized === "NUEVO") return "Nuevo";
  return text(value);
}

function materialLabel(detail: MaterialIssueDocumentDetailLike) {
  const nombre = String(detail.producto_nombre ?? "").trim();
  if (nombre) return nombre;
  const label = String(detail.producto_label ?? "").trim();
  if (!label) return "-";
  // `producto_label` llega como `codigo - nombre (descripcion)`; el codigo ya
  // tiene su propia columna, repetirlo solo roba ancho a la descripcion.
  return label.replace(/^\s*[^-]+-\s*/, "").trim() || label;
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

/**
 * El archivo se nombra por el numero de egreso cuando la OT tiene uno solo; si
 * el inventario abrio varios movimientos manda el codigo de la orden, porque el
 * documento sigue siendo uno.
 */
export function materialIssuePdfFileName(
  workOrder: MaterialIssueWorkOrderLike,
  documents: MaterialIssueDocumentLike[],
) {
  const orderCode = fileNamePart(workOrder?.code, "orden_trabajo");
  if (documents.length === 1) {
    return `${fileNamePart(documents[0]?.numero_documento, "egreso_bodega")}-${orderCode}.pdf`;
  }
  return `egreso-bodega-${orderCode}.pdf`;
}

/** Aplana los movimientos en las lineas que se firman, sin perder de que EB viene cada una. */
function buildIssueLines(documents: MaterialIssueDocumentLike[]) {
  return documents.flatMap((issue) => {
    const details = Array.isArray(issue?.detalles) ? issue.detalles : [];
    return details.map((detail) => ({
      detail,
      documentNumber: text(issue?.numero_documento, "SIN CÓDIGO"),
      documentDate: issue?.fecha_movimiento ?? null,
    }));
  });
}

/**
 * La observacion del movimiento siempre arranca con la frase que arma el
 * backend; en la constancia lo que importa es la nota que escribio quien
 * registro la salida.
 */
function issueNote(observacion: unknown, orderCode: string) {
  const normalized = String(observacion ?? "").trim();
  if (!normalized) return "";
  const boilerplate = `Salida de materiales por orden de trabajo ${orderCode}`;
  if (!normalized.startsWith(boilerplate)) return normalized;
  return normalized.slice(boilerplate.length).replace(/^[.\s]+/, "").trim();
}

function uniqueValues(values: unknown[]) {
  return [
    ...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
  ];
}

export async function buildMaterialIssuePdfBlob(
  workOrder: MaterialIssueWorkOrderLike,
  documents: MaterialIssueDocumentLike[],
  generatedBy = "Sistema",
  showCosts = true,
): Promise<Blob> {
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
  const generatedAt = formatDateTime(new Date(), "-");
  const orderCode = text(workOrder?.code, "SIN CÓDIGO");

  const issues = documents.filter(Boolean);
  const lines = buildIssueLines(issues);
  const documentNumbers = uniqueValues(issues.map((issue) => issue?.numero_documento));
  const documentLabel = documentNumbers.length
    ? documentNumbers.join(" · ")
    : "SIN CÓDIGO";
  // La OT cierra con un solo egreso; cuando el inventario abrio mas de un
  // movimiento el documento sigue siendo uno y se identifica por la orden.
  const headerNumber =
    documentNumbers.length === 1 ? `No. ${documentNumbers[0]}` : `Orden ${orderCode}`;

  const issueDates = issues
    .map((issue) => issue?.fecha_movimiento)
    .filter((value): value is string | Date => Boolean(value));
  const firstDate = issueDates.length ? issueDates[0] : null;
  const lastDate = issueDates.length ? issueDates[issueDates.length - 1] : null;
  const dateLabel =
    issueDates.length > 1 &&
    formatDateOnly(firstDate, "") !== formatDateOnly(lastDate, "")
      ? `${formatDateOnly(firstDate, "-")} al ${formatDateOnly(lastDate, "-")}`
      : formatDateTime(firstDate, "-");
  const signatureDate = formatDateOnly(lastDate, "-");

  const warehouses = uniqueValues([
    ...lines.map((line) => line.detail.bodega_label),
    ...issues.map((issue) => issue?.bodega_label),
  ]);
  const warehouseLabel = warehouses.join(" · ") || "-";

  const notes = issues
    .map((issue) => ({
      documentNumber: text(issue?.numero_documento, "SIN CÓDIGO"),
      note: issueNote(issue?.observacion, orderCode),
    }))
    .filter((entry) => entry.note);

  const totalQuantity = lines.reduce(
    (total, line) => total + numberValue(line.detail.cantidad),
    0,
  );
  const totalAmount = lines.reduce(
    (total, line) => total + numberValue(line.detail.subtotal),
    0,
  );

  const lastIssue = issues.length ? issues[issues.length - 1] : null;
  const registeredBy = text(issues[0]?.created_by, generatedBy);
  const registeredAt = formatDateTime(issues[0]?.created_at ?? firstDate, dateLabel);
  const updatedBy = text(lastIssue?.updated_by || lastIssue?.created_by, generatedBy);
  const updatedAt = formatDateTime(
    lastIssue?.updated_at ?? lastIssue?.created_at ?? lastDate,
    dateLabel,
  );

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
    doc.text("EGRESO DE BODEGA", rightX, 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${documentLabel} · Orden ${orderCode}`, rightX, 48, {
      align: "right",
    });
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
  doc.text("EGRESO DE BODEGA", marginX + 16, 107);
  doc.setFontSize(10);
  doc.text(headerNumber, rightX - 16, 107, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `Generado: ${generatedAt} - ${text(generatedBy, "Sistema")}`,
    marginX + 16,
    124,
  );
  doc.text(
    `Estado: ${text(issues[0]?.estado, "CONFIRMADO")} · ${issues.length} movimiento(s) · ${lines.length} ítem(s)`,
    rightX - 16,
    124,
    { align: "right" },
  );

  const fieldTop = 160;
  const columnGap = 18;
  const columnWidth = (usableWidth - columnGap) / 2;
  const secondColumnX = marginX + columnWidth + columnGap;
  drawLabelValue(doc, "Fecha de egreso", dateLabel, marginX, fieldTop, columnWidth);
  drawLabelValue(
    doc,
    "Orden de trabajo",
    [orderCode, workOrder?.title].filter(Boolean).join(" · "),
    secondColumnX,
    fieldTop,
    columnWidth,
  );
  drawLabelValue(doc, "Bodega", warehouseLabel, marginX, fieldTop + 39, columnWidth);
  drawLabelValue(
    doc,
    "Equipo",
    workOrder?.equipment_label,
    secondColumnX,
    fieldTop + 39,
    columnWidth,
  );
  drawLabelValue(
    doc,
    "Compartimiento",
    workOrder?.equipment_component_label,
    marginX,
    fieldTop + 78,
    columnWidth,
  );
  drawLabelValue(
    doc,
    "Tipo de mantenimiento",
    workOrder?.maintenance_kind_label,
    secondColumnX,
    fieldTop + 78,
    columnWidth,
  );
  drawLabelValue(
    doc,
    documentNumbers.length > 1 ? "Documentos de egreso" : "Documento de egreso",
    documentLabel,
    marginX,
    fieldTop + 117,
    columnWidth,
  );
  drawLabelValue(
    doc,
    "Estado de la orden",
    workOrder?.status_label,
    secondColumnX,
    fieldTop + 117,
    columnWidth,
  );

  let tableStartY = fieldTop + 159;
  if (notes.length) {
    const noteLines = notes.flatMap((entry) =>
      doc.splitTextToSize(
        notes.length > 1
          ? `${entry.documentNumber}: ${entry.note}`
          : `Observación: ${entry.note}`,
        usableWidth - 20,
      ),
    );
    const noteHeight = Math.max(32, noteLines.length * 11 + 14);
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(marginX, tableStartY, usableWidth, noteHeight, 4, 4, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.text);
    doc.text(noteLines, marginX + 10, tableStartY + 16);
    tableStartY += noteHeight + 14;
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
      1: { cellWidth: 64 },
      2: { cellWidth: 52, halign: "center" },
      3: { cellWidth: 58 },
      4: { cellWidth: "auto" },
      5: { cellWidth: 46, halign: "center" },
      6: { cellWidth: 42, halign: "right" },
      7: { cellWidth: 52, halign: "right" },
      8: { cellWidth: 58, halign: "right" },
    },
    head: [[
      "#",
      "EGRESO",
      "FECHA",
      "CÓDIGO",
      "MATERIAL",
      "CONDICIÓN",
      "CANT.",
      ...(showCosts ? ["COSTO U.", "SUBTOTAL"] : []),
    ]],
    body: lines.length
      ? lines.map((line, index) => [
          index + 1,
          line.documentNumber,
          formatDateOnly(line.documentDate, "-"),
          text(line.detail.producto_codigo),
          materialLabel(line.detail),
          conditionLabel(line.detail.condicion_material),
          formatNumber(line.detail.cantidad, 2),
          ...(showCosts
            ? [
                formatMoney(line.detail.costo_unitario),
                formatMoney(line.detail.subtotal),
              ]
            : []),
        ])
      : [[
          1,
          "-",
          "-",
          "-",
          "Sin materiales registrados",
          "-",
          "0,00",
          ...(showCosts ? ["$0,00", "$0,00"] : []),
        ]],
    foot: [[
      {
        content: `TOTALES · ${lines.length} ítem(s)`,
        colSpan: 6,
        styles: { halign: "right" },
      },
      formatNumber(totalQuantity, 2),
      ...(showCosts ? ["", formatMoney(totalAmount)] : []),
    ]],
    didDrawPage: (data: any) => {
      // `pageNumber` cuenta las paginas de esta tabla, no las del PDF: la
      // primera ya trae la cabecera completa y solo los desbordes necesitan la
      // version compacta.
      if (data.pageNumber > 1) drawCompactHeader();
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  let signatureY = Number(lastTable?.finalY || tableStartY) + 64;
  if (signatureY > pageHeight - 175) {
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
  doc.text("ENTREGADO POR (BODEGA)", leftSignatureX + signatureWidth / 2, signatureY + 14, {
    align: "center",
  });
  doc.text("RECIBIDO POR", rightSignatureX + signatureWidth / 2, signatureY + 14, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(registeredBy, leftSignatureX, signatureY + 31);
  doc.text(`Fecha: ${signatureDate}`, leftSignatureX, signatureY + 43);
  doc.text("Nombre:", rightSignatureX, signatureY + 31);
  doc.text("CI:", rightSignatureX, signatureY + 43);

  const auditY = signatureY + 72;
  doc.setFillColor(252, 241, 232);
  doc.roundedRect(marginX, auditY, usableWidth, 74, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.text("AUDITORÍA", marginX + 10, auditY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `Egreso registrado por: ${registeredBy} · ${registeredAt}`,
    marginX + 10,
    auditY + 27,
  );
  doc.text(
    `Última actualización: ${updatedBy} · ${updatedAt}`,
    rightX - 10,
    auditY + 27,
    { align: "right" },
  );
  doc.text(
    `OT creada por: ${text(workOrder?.created_by_label, "Sin registro")} · ${formatDateTime(
      workOrder?.created_at,
      "-",
    )}`,
    marginX + 10,
    auditY + 41,
  );
  doc.text(
    `OT realizada por: ${text(workOrder?.processed_by_label, "Sin registro")} · ${formatDateTime(
      workOrder?.processed_at,
      "-",
    )}`,
    rightX - 10,
    auditY + 41,
    { align: "right" },
  );
  doc.text(
    `OT aprobada por: ${text(workOrder?.approved_by_label, "Sin registro")} · ${formatDateTime(
      workOrder?.approved_at,
      "-",
    )}`,
    marginX + 10,
    auditY + 55,
  );
  doc.text(
    `Documento: ${documentLabel} · Orden ${orderCode}`,
    rightX - 10,
    auditY + 55,
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
    doc.text(
      `Generado: ${generatedAt} - ${text(generatedBy, "Sistema")}`,
      marginX,
      pageHeight - 23,
    );
    doc.text(`Página ${page} de ${pageCount}`, rightX, pageHeight - 23, {
      align: "right",
    });
  }

  return doc.output("blob");
}

export async function downloadMaterialIssuePdf(
  workOrder: MaterialIssueWorkOrderLike,
  documents: MaterialIssueDocumentLike[],
  generatedBy = "Sistema",
  showCosts = true,
) {
  const blob = await buildMaterialIssuePdfBlob(
    workOrder,
    documents,
    generatedBy,
    showCosts,
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = materialIssuePdfFileName(workOrder, documents);
  anchor.click();
  URL.revokeObjectURL(url);
}

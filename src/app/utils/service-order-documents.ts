import { formatDateOnly } from "@/app/utils/date-time";
import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";

type ServiceOrderDetailLike = {
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
  costo_unitario?: string | number | null;
  descuento?: string | number | null;
  porcentaje_descuento?: string | number | null;
  iva_total?: string | number | null;
  total?: string | number | null;
};

type ServiceOrderLike = {
  codigo?: string | null;
  fecha_emision?: string | Date | null;
  proveedor_nombre?: string | null;
  emitido_por_nombre?: string | null;
  lugar_entrega?: string | null;
  forma_pago?: string | null;
  observacion?: string | null;
  moneda?: string | null;
  subtotal?: string | number | null;
  descuento_total?: string | number | null;
  subtotal_con_descuento?: string | number | null;
  iva_total?: string | number | null;
  total?: string | number | null;
  detalles?: ServiceOrderDetailLike[] | null;
};

const SERVICE_ORDER_TEMPLATE = {
  companyName: "JUSTICECOMPANY TECNICA INDUSTRIAL S. A.",
  addressLines: [
    "Cdla. Kennedy Norte, Ed. Torres del Norte",
    "Torre B Piso 8 Ofc. 804",
    "Telf.: 593-4-2687223, 2687362",
    "Guayaquil - Ecuador",
  ],
  cityEmission: "GUAYAQUIL",
  ruc: "1791355512001",
};

function toNumber(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  return formatDateOnly(value, String(value ?? ""));
}

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function splitNumberParts(value: number) {
  const absolute = Math.abs(value);
  const integer = Math.floor(absolute);
  const cents = Math.round((absolute - integer) * 100);
  return {
    integer,
    cents: String(cents).padStart(2, "0"),
  };
}

function unitsToText(value: number) {
  const map = [
    "",
    "UNO",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
  ];
  return map[value] || "";
}

function tensToText(value: number) {
  const specials: Record<number, string> = {
    10: "DIEZ",
    11: "ONCE",
    12: "DOCE",
    13: "TRECE",
    14: "CATORCE",
    15: "QUINCE",
    16: "DIECISEIS",
    17: "DIECISIETE",
    18: "DIECIOCHO",
    19: "DIECINUEVE",
    20: "VEINTE",
  };
  if (specials[value]) return specials[value];
  if (value < 10) return unitsToText(value);
  if (value < 30) return `VEINTI${unitsToText(value - 20).toLowerCase()}`.toUpperCase();

  const tensMap = [
    "",
    "",
    "",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const tens = Math.floor(value / 10);
  const units = value % 10;
  return units ? `${tensMap[tens]} Y ${unitsToText(units)}` : tensMap[tens];
}

function hundredsToText(value: number): string {
  if (value === 0) return "";
  if (value < 100) return tensToText(value) || "";
  const hundredsMap: Record<number, string> = {
    1: "CIENTO",
    2: "DOSCIENTOS",
    3: "TRESCIENTOS",
    4: "CUATROCIENTOS",
    5: "QUINIENTOS",
    6: "SEISCIENTOS",
    7: "SETECIENTOS",
    8: "OCHOCIENTOS",
    9: "NOVECIENTOS",
  };
  if (value === 100) return "CIEN";
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return remainder
    ? `${hundredsMap[hundreds] || ""} ${tensToText(remainder) || ""}`.trim()
    : hundredsMap[hundreds] || "";
}

function numberToSpanishText(value: number): string {
  if (!Number.isFinite(value)) return "CERO";
  if (value === 0) return "CERO";

  const chunks: string[] = [];
  const millions = Math.floor(value / 1000000);
  const thousands = Math.floor((value % 1000000) / 1000);
  const hundreds = value % 1000;

  if (millions) {
    chunks.push(
      millions === 1
        ? "UN MILLON"
        : `${hundredsToText(millions)} MILLONES`,
    );
  }
  if (thousands) {
    chunks.push(
      thousands === 1 ? "MIL" : `${hundredsToText(thousands)} MIL`,
    );
  }
  if (hundreds) {
    chunks.push(hundredsToText(hundreds));
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

function amountToWords(value: unknown) {
  const { integer, cents } = splitNumberParts(toNumber(value));
  return `${numberToSpanishText(integer)} CON ${cents}/100 DOLARES`;
}

export async function buildServiceOrderPdfBlob(
  order: ServiceOrderLike,
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
  const companyLogoAsset = await getCompanyLogoAsset();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 38;
  const marginRight = 38;
  const rightX = pageWidth - marginRight;
  const usableWidth = pageWidth - marginLeft - marginRight;
  const details = Array.isArray(order.detalles) ? order.detalles : [];
  const emissionDate = formatDate(order.fecha_emision || new Date());
  const totalAmount = toNumber(order.total);
  const logoOptions = {
    marginX: marginLeft,
    y: 30,
    maxWidth: 112,
    maxHeight: 34,
  };

  function drawDocumentHeader() {
    doc.setFillColor(31, 78, 120);
    doc.rect(0, 0, pageWidth, 12, "F");
    drawPdfCompanyLogo(doc, companyLogoAsset, logoOptions);

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.4);
    SERVICE_ORDER_TEMPLATE.addressLines.forEach((line, index) => {
      doc.text(
        index === 0 ? SERVICE_ORDER_TEMPLATE.companyName : line,
        rightX,
        38 + index * 11.5,
        { align: "right" },
      );
    });

    doc.setFillColor(236, 244, 251);
    doc.roundedRect(marginLeft, 99, usableWidth, 42, 7, 7, "F");
    doc.setTextColor(31, 78, 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.text("ORDEN DE SERVICIO", marginLeft + 14, 117);
    doc.setFontSize(9.5);
    doc.text(`No. ${safeText(order.codigo, "JCTI-OS-SIN-CODIGO")}`, rightX - 14, 117, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(91, 107, 123);
    doc.text("Documento de solicitud y autorización de servicios", marginLeft + 14, 132);
    doc.setTextColor(31, 41, 55);
  }

  drawDocumentHeader();

  let cursorY = 166;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("PARA:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(order.proveedor_nombre, "Sin destinatario"), marginLeft + 65, cursorY);

  cursorY += 22;
  doc.setFont("helvetica", "bold");
  doc.text("DE:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(order.emitido_por_nombre, "Sin emisor"), marginLeft + 65, cursorY);

  cursorY += 22;
  doc.setFont("helvetica", "bold");
  doc.text("FECHA", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${SERVICE_ORDER_TEMPLATE.cityEmission}, ${emissionDate}`,
    marginLeft + 65,
    cursorY,
  );

  cursorY += 28;
  doc.text(
    "Por medio de la presente solicitamos despachar a nuestra cuenta lo siguiente:",
    marginLeft + 20,
    cursorY,
  );
  cursorY += 12;

  autoTable(doc, {
    startY: cursorY + 10,
    tableWidth: "wrap",
    margin: { left: marginLeft, right: marginRight, top: 152, bottom: 46 },
    theme: "grid",
    rowPageBreak: "auto",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      textColor: [0, 0, 0],
      valign: "middle",
    },
    headStyles: {
      fillColor: [31, 78, 120],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      lineColor: [31, 78, 120],
    },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 74 },
      2: { cellWidth: 54, halign: "right" },
      3: { cellWidth: 197 },
      4: { cellWidth: 82, halign: "right" },
      5: { cellWidth: 80, halign: "right" },
    },
    head: [[
      "ITEM",
      "REFERENCIA",
      "CANTIDAD",
      "DESCRIPCION",
      "P. UNIT.",
      "TOTAL",
    ]],
    body: details.length
      ? details.map((detail, index) => [
          String(index + 1),
          safeText(detail.codigo_producto, ""),
          formatMoney(detail.cantidad),
          safeText(detail.nombre_producto, "Sin descripcion"),
          formatMoney(detail.costo_unitario),
          formatMoney(detail.total),
        ])
      : [["1", "", "0.00", "Sin servicios cargados", "0.00", "0.00"]],
    didDrawPage: () => {
      drawDocumentHeader();
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  cursorY = (lastTable?.finalY ?? 320) + 16;

  const totalsXLabel = pageWidth - 210;
  const totalsXCurrency = pageWidth - 95;
  const totalsXValue = pageWidth - 38;
  const totals = [
    ["SUB-TOTAL", order.subtotal],
    ["DESCUENTO", order.descuento_total],
    ["SUB-TOTAL CON DESCTO", order.subtotal_con_descuento],
    ["IVA 15%", order.iva_total],
    ["TOTAL", order.total],
  ] as const;

  const amountLines = doc.splitTextToSize(amountToWords(totalAmount), usableWidth - 76);
  const deliveryLines = doc.splitTextToSize(safeText(order.lugar_entrega, "-"), usableWidth - 142);
  const paymentLines = doc.splitTextToSize(safeText(order.forma_pago, "-"), usableWidth - 128);
  const observationLines = order.observacion
    ? doc.splitTextToSize(safeText(order.observacion), usableWidth - 124)
    : [];
  const closingBlockHeight =
    totals.length * 16 +
    22 + amountLines.length * 11 +
    14 + deliveryLines.length * 11 +
    10 + paymentLines.length * 11 +
    (observationLines.length ? 12 + observationLines.length * 11 : 0) +
    142;

  if (cursorY + closingBlockHeight > pageHeight - 42) {
    doc.addPage();
    drawDocumentHeader();
    cursorY = 166;
  }

  const totalsBoxX = totalsXLabel - 12;
  const totalsBoxWidth = rightX - totalsBoxX;
  const totalsBoxHeight = totals.length * 16 + 14;
  doc.setFillColor(247, 250, 252);
  doc.setDrawColor(183, 201, 214);
  doc.roundedRect(totalsBoxX, cursorY - 13, totalsBoxWidth, totalsBoxHeight, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  totals.forEach(([label, value], index) => {
    if (index === totals.length - 1) {
      doc.setFillColor(217, 234, 247);
      doc.rect(totalsBoxX, cursorY - 11, totalsBoxWidth, 17, "F");
      doc.setTextColor(31, 78, 120);
    } else {
      doc.setTextColor(31, 41, 55);
    }
    doc.text(label, totalsXLabel, cursorY);
    doc.text("US$", totalsXCurrency, cursorY, { align: "right" });
    doc.text(formatMoney(value), totalsXValue, cursorY, { align: "right" });
    cursorY += 16;
  });

  cursorY += 12;
  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.text("SON:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(amountLines, marginLeft + 56, cursorY);

  cursorY += Math.max(20, amountLines.length * 11 + 8);
  doc.setFont("helvetica", "bold");
  doc.text("LUGAR DE ENTREGA:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(deliveryLines, marginLeft + 130, cursorY);

  cursorY += Math.max(20, deliveryLines.length * 11 + 7);
  doc.setFont("helvetica", "bold");
  doc.text("FORMA DE PAGO:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(paymentLines, marginLeft + 116, cursorY);
  cursorY += Math.max(18, paymentLines.length * 11 + 6);

  if (observationLines.length) {
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACION:", marginLeft + 20, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text(observationLines, marginLeft + 112, cursorY);
    cursorY += observationLines.length * 11 + 7;
  }

  const signatureY = cursorY + 32;
  doc.setFont("helvetica", "normal");
  doc.text("Atte,", marginLeft + 20, signatureY);
  doc.line(marginLeft + 20, signatureY + 56, marginLeft + 220, signatureY + 56);
  doc.text(safeText(order.emitido_por_nombre, userName), marginLeft + 20, signatureY + 74);
  doc.text(SERVICE_ORDER_TEMPLATE.companyName, marginLeft + 20, signatureY + 90);
  doc.text(`RUC: ${SERVICE_ORDER_TEMPLATE.ruc}`, marginLeft + 20, signatureY + 106);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(183, 201, 214);
    doc.line(marginLeft, pageHeight - 34, rightX, pageHeight - 34);
    doc.setTextColor(91, 107, 123);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Generado por: ${safeText(userName, "Sistema")}`, marginLeft, pageHeight - 20);
    doc.text(`Página ${page} de ${pageCount}`, rightX, pageHeight - 20, { align: "right" });
  }

  return doc.output("blob");
}

export async function downloadServiceOrderPdf(
  order: ServiceOrderLike,
  userName = "Sistema",
) {
  const blob = await buildServiceOrderPdfBlob(order, userName);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeText(order.codigo, "orden_servicio")}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

import { formatDateOnly } from "@/app/utils/date-time";

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

export async function downloadServiceOrderPdf(
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 38;
  const marginRight = 38;
  const rightX = pageWidth - marginRight;
  const usableWidth = pageWidth - marginLeft - marginRight;
  const details = Array.isArray(order.detalles) ? order.detalles : [];
  const emissionDate = formatDate(order.fecha_emision || new Date());
  const totalAmount = toNumber(order.total);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  SERVICE_ORDER_TEMPLATE.addressLines.forEach((line, index) => {
    doc.text(
      index === 0 ? SERVICE_ORDER_TEMPLATE.companyName : line,
      rightX,
      38 + index * 12,
      { align: "right" },
    );
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ORDEN DE SERVICIO", pageWidth / 2, 110, { align: "center" });
  doc.setFontSize(10);
  doc.text(`No. ${safeText(order.codigo, "RJCTI-SIN-CODIGO")}`, pageWidth / 2, 128, {
    align: "center",
  });

  let cursorY = 165;
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
    margin: { left: marginLeft, right: marginRight },
    theme: "grid",
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
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 34, halign: "center" },
      1: { cellWidth: 82 },
      2: { cellWidth: 64, halign: "right" },
      3: { cellWidth: 212 },
      4: { cellWidth: 72, halign: "right" },
      5: { cellWidth: 72, halign: "right" },
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  totals.forEach(([label, value]) => {
    doc.text(label, totalsXLabel, cursorY);
    doc.text("US$", totalsXCurrency, cursorY, { align: "right" });
    doc.text(formatMoney(value), totalsXValue, cursorY, { align: "right" });
    cursorY += 16;
  });

  cursorY += 12;
  doc.setFont("helvetica", "bold");
  doc.text("SON:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(amountToWords(totalAmount), marginLeft + 56, cursorY, {
    maxWidth: usableWidth - 60,
  });

  cursorY += 26;
  doc.setFont("helvetica", "bold");
  doc.text("LUGAR DE ENTREGA:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(order.lugar_entrega, "-"), marginLeft + 130, cursorY);

  cursorY += 20;
  doc.setFont("helvetica", "bold");
  doc.text("FORMA DE PAGO:", marginLeft + 20, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(order.forma_pago, "-"), marginLeft + 116, cursorY);

  if (order.observacion) {
    cursorY += 20;
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACION:", marginLeft + 20, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text(safeText(order.observacion), marginLeft + 112, cursorY, {
      maxWidth: usableWidth - 120,
    });
  }

  let signatureY = cursorY + 72;
  if (signatureY > pageHeight - 90) {
    doc.addPage();
    signatureY = 140;
  }
  doc.setFont("helvetica", "normal");
  doc.text("Atte,", marginLeft + 20, signatureY);
  doc.line(marginLeft + 20, signatureY + 56, marginLeft + 220, signatureY + 56);
  doc.text(safeText(order.emitido_por_nombre, userName), marginLeft + 20, signatureY + 74);
  doc.text(SERVICE_ORDER_TEMPLATE.companyName, marginLeft + 20, signatureY + 90);
  doc.text(`RUC: ${SERVICE_ORDER_TEMPLATE.ruc}`, marginLeft + 20, signatureY + 106);

  doc.setFontSize(8);
  doc.text(
    `Generado por: ${safeText(userName, "Sistema")}`,
    marginLeft,
    pageHeight - 26,
  );

  doc.save(`${safeText(order.codigo, "orden_servicio")}.pdf`);
}

import type { Border, Worksheet } from "exceljs";
import {
  drawPdfCompanyLogo,
  getCompanyLogoAsset,
  getContainedImageSize,
  type PdfImageAsset,
} from "@/app/utils/pdf-branding";
import { formatNumberForDisplay } from "@/app/utils/number-format";

/**
 * Informe de una OT de Proyecto, con el formato del documento de proyecto.
 *
 * Reproduce el orden del formato en papel: cabecera (proyecto, fecha, empresa),
 * objetivo general, objetivos especificos, metodologia, alcance, los sitios
 * donde corre el proyecto, la contratacion de personal y los materiales
 * utilizados.
 *
 * Los datos llegan ya resueltos por la pantalla —igual que en el informe de OT
 * normal— para que el PDF, el Excel y la vista no puedan contar cosas distintas.
 * El mismo formato sirve a una OT (dialogo, menu de la fila) y a varias
 * (reporte consolidado): cada OT es un bloque, una seccion del PDF y una hoja
 * del Excel.
 */
export type ProjectWorkOrderPersonnel = {
  rol: string;
  nombre: string;
  diasLaborados: number;
  ubicacion: string;
  valorDia: number;
  fecha: string;
  observacion: string;
};

export type ProjectWorkOrderMaterial = {
  descripcion: string;
  cantidad: number;
  unidad: string;
  marca: string;
};

export type ProjectWorkOrderReportData = {
  code: string;
  projectName: string;
  empresa: string;
  fecha: string;
  statusLabel: string;
  plantilla: string;
  objetivoGeneral: string;
  objetivosEspecificos: string[];
  metodologia: string;
  alcance: string[];
  ubicaciones: string[];
  bodegas: string[];
  personal: ProjectWorkOrderPersonnel[];
  materiales: ProjectWorkOrderMaterial[];
  /** Solo se imprime cuando el usuario puede ver importes. */
  mostrarCostos: boolean;
  createdBy: string;
  processedBy: string;
  updatedBy: string;
};

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatNumber(value: unknown, digits = 2) {
  return formatNumberForDisplay(Number(value ?? 0), digits);
}

function fileCode(data: ProjectWorkOrderReportData) {
  return safeText(data.code, "ot_proyecto").replace(/[^\w.-]+/g, "_");
}

function laborTotal(data: ProjectWorkOrderReportData) {
  return data.personal.reduce(
    (acc, row) => acc + row.diasLaborados * row.valorDia,
    0,
  );
}

function generatedStamp() {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

export function projectWorkOrderReportFileName(data: ProjectWorkOrderReportData) {
  return `proyecto_${fileCode(data)}.pdf`;
}

export function projectWorkOrderExcelFileName(data: ProjectWorkOrderReportData) {
  return `proyecto_${fileCode(data)}.xlsx`;
}

/* ------------------------------------------------------------------ PDF */

type AutoTable = (doc: any, options: any) => void;

/**
 * Dibuja el informe de UNA OT desde la pagina en la que esta parado el
 * documento. Quien lo llama decide si abre pagina nueva antes de la siguiente.
 */
function drawProjectWorkOrder(
  doc: any,
  autoTable: AutoTable,
  logoAsset: PdfImageAsset | null,
  data: ProjectWorkOrderReportData,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 38;
  const marginRight = 38;
  const usableWidth = pageWidth - marginLeft - marginRight;
  const rightX = pageWidth - marginRight;

  drawPdfCompanyLogo(doc, logoAsset, {
    marginX: marginLeft,
    y: 28,
    maxWidth: 112,
    maxHeight: 34,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Proyecto", rightX, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(safeText(data.code), rightX, 60, { align: "right" });

  let cursorY = 88;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const titleLines = doc.splitTextToSize(
    safeText(data.projectName, "Proyecto sin nombre").toUpperCase(),
    usableWidth,
  );
  doc.text(titleLines, marginLeft, cursorY);
  cursorY += titleLines.length * 15 + 6;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [31, 61, 122], textColor: 255, fontStyle: "bold" },
    head: [["Fecha", "Empresa", "Estado", "Plantilla"]],
    body: [
      [
        safeText(data.fecha),
        safeText(data.empresa),
        safeText(data.statusLabel),
        safeText(data.plantilla),
      ],
    ],
  });
  cursorY = (doc as any).lastAutoTable.finalY + 16;

  /** Salta de pagina si lo que sigue no cabe, para no dejar un titulo huerfano. */
  const ensureSpace = (height: number) => {
    if (cursorY + height > pageHeight - 60) {
      doc.addPage();
      cursorY = 60;
    }
  };

  /** Bloque de texto con titulo, que salta de pagina si no cabe. */
  const writeParagraph = (title: string, body: string) => {
    const lines = doc.splitTextToSize(safeText(body, "Sin detalle"), usableWidth);
    ensureSpace(18 + lines.length * 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, marginLeft, cursorY);
    cursorY += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, marginLeft, cursorY);
    cursorY += lines.length * 11 + 10;
  };

  const writeList = (title: string, items: string[]) => {
    const rows = items.filter((item) => String(item || "").trim());
    writeParagraph(
      title,
      rows.length
        ? rows.map((item, index) => `${index + 1}. ${item}`).join("\n")
        : "Sin detalle",
    );
  };

  /** Titulo de una tabla; exige sitio para el titulo y al menos su cabecera. */
  const writeTableTitle = (title: string) => {
    ensureSpace(70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, marginLeft, cursorY);
    cursorY += 6;
  };

  writeParagraph("Objetivo general", data.objetivoGeneral);
  writeList("Objetivos específicos", data.objetivosEspecificos);
  writeParagraph("Metodología aplicable", data.metodologia);
  writeList("Alcance del proyecto", data.alcance);

  writeTableTitle("Lugar de ejecución");
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: [["Ubicaciones", "Bodegas"]],
    body: [
      [
        data.ubicaciones.length ? data.ubicaciones.join("\n") : "-",
        data.bodegas.length ? data.bodegas.join("\n") : "-",
      ],
    ],
  });
  cursorY = (doc as any).lastAutoTable.finalY + 18;

  writeTableTitle("Contratación de personal");
  const personnelHead = data.mostrarCostos
    ? [
        [
          "Cargo",
          "Nombre y apellido",
          "Días laborados (firma)",
          "Ubicación",
          "Valor día",
          "Total",
          "Fecha",
          "Observación",
        ],
      ]
    : [
        [
          "Cargo",
          "Nombre y apellido",
          "Días laborados (firma)",
          "Ubicación",
          "Fecha",
          "Observación",
        ],
      ];
  const personnelBody = data.personal.length
    ? data.personal.map((row) => {
        const base = [
          safeText(row.rol),
          safeText(row.nombre),
          formatNumber(row.diasLaborados),
          safeText(row.ubicacion),
        ];
        const tail = [safeText(row.fecha), safeText(row.observacion)];
        return data.mostrarCostos
          ? [
              ...base,
              formatNumber(row.valorDia),
              formatNumber(row.diasLaborados * row.valorDia),
              ...tail,
            ]
          : [...base, ...tail];
      })
    : [
        data.mostrarCostos
          ? ["Sin personal contratado.", "-", "-", "-", "-", "-", "-", "-"]
          : ["Sin personal contratado.", "-", "-", "-", "-", "-"],
      ];
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: personnelHead,
    body: personnelBody,
  });
  cursorY = (doc as any).lastAutoTable.finalY + 6;

  if (data.mostrarCostos && data.personal.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `Total mano de obra: ${formatNumber(laborTotal(data))}`,
      rightX,
      cursorY + 8,
      { align: "right" },
    );
    cursorY += 16;
  }
  cursorY += 12;

  writeTableTitle("Materiales utilizados");
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: [["Ítem", "Descripción", "Cantidad", "Marca"]],
    body: data.materiales.length
      ? data.materiales.map((row, index) => [
          String(index + 1),
          safeText(row.descripcion),
          `${formatNumber(row.cantidad)} ${safeText(row.unidad, "")}`.trim(),
          safeText(row.marca),
        ])
      : [["-", "Sin materiales registrados en el proyecto.", "-", "-"]],
    columnStyles: {
      0: { cellWidth: 36, halign: "center" },
      2: { halign: "right", cellWidth: 90 },
      3: { cellWidth: 100 },
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 18;

  writeTableTitle("Registro del proyecto");
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: [["Creado por", "Procesado por", "Última edición por"]],
    body: [
      [
        safeText(data.createdBy, "Sin registro"),
        safeText(data.processedBy, "Sin registro"),
        safeText(data.updatedBy, "Sin registro"),
      ],
    ],
  });
}

/**
 * PDF con una OT de proyecto por bloque. Cada OT arranca en pagina nueva, con
 * su logo y su cabecera; la numeracion de paginas corre a lo largo de todo el
 * documento y, cuando hay varias, el pie dice a cual pertenece cada pagina.
 */
export async function buildProjectWorkOrdersPdfBlob(
  list: ProjectWorkOrderReportData[],
): Promise<Blob> {
  if (!list.length) {
    throw new Error("No hay órdenes de proyecto para exportar.");
  }
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default as AutoTable;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const logoAsset = await getCompanyLogoAsset();

  const codeByPage = new Map<number, string>();
  list.forEach((data, index) => {
    if (index > 0) doc.addPage();
    const firstPage = doc.getNumberOfPages();
    drawProjectWorkOrder(doc, autoTable, logoAsset, data);
    for (let page = firstPage; page <= doc.getNumberOfPages(); page += 1) {
      codeByPage.set(page, safeText(data.code, ""));
    }
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 38;
  const rightX = pageWidth - 38;
  const stamp = generatedStamp();
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`Generado el ${stamp}`, marginLeft, pageHeight - 20);
    if (list.length > 1) {
      doc.text(codeByPage.get(page) ?? "", pageWidth / 2, pageHeight - 20, {
        align: "center",
      });
    }
    doc.text(`Página ${page} de ${pageCount}`, rightX, pageHeight - 20, {
      align: "right",
    });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export function buildProjectWorkOrderReportPdfBlob(
  data: ProjectWorkOrderReportData,
): Promise<Blob> {
  return buildProjectWorkOrdersPdfBlob([data]);
}

/* ---------------------------------------------------------------- Excel */

const XL = {
  navy: "FF1F3D7A",
  slate: "FF334155",
  text: "FF1F2937",
  soft: "FF5B6B7B",
  border: "FFB7C9D6",
  label: "FFE8EEF7",
  zebra: "FFF5F8FB",
  white: "FFFFFFFF",
};

/**
 * Las tablas del formato se reparten sobre una rejilla de ocho columnas: la de
 * personal con costos usa las ocho, y las demas fusionan las que necesitan. Asi
 * la hoja conserva un ancho unico de punta a punta, como la pagina del PDF.
 */
const XL_COLUMN_WIDTHS = [22, 30, 15, 30, 13, 13, 14, 36];
const XL_COLUMN_COUNT = XL_COLUMN_WIDTHS.length;
const XL_MONEY_FORMAT = "#,##0.00";
const XL_SHEET_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const THIN_BORDER: Partial<Border> = {
  style: "thin",
  color: { argb: XL.border },
};

type SheetCell = {
  value: string | number;
  align?: "left" | "center" | "right";
  numFmt?: string;
};

type RowStyle = {
  fill?: string;
  color?: string;
  bold?: boolean;
  size?: number;
  border?: boolean;
  vertical?: "top" | "middle";
  minHeight?: number;
};

/** Dos decimales, para que la celda no guarde el ruido de la suma en coma flotante. */
function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function columnsWidth(from: number, to: number) {
  return XL_COLUMN_WIDTHS.slice(from - 1, to).reduce((acc, width) => acc + width, 0);
}

/**
 * Lineas que ocupara un texto en un ancho dado. Excel no ajusta solo la altura
 * de las celdas fusionadas, asi que se estima; se prefiere pasarse por una
 * linea antes que cortar el texto.
 */
function estimateLines(text: string, width: number, size: number) {
  const perLine = Math.max(4, Math.floor((width * 9) / size));
  return String(text)
    .split("\n")
    .reduce((total, part) => total + Math.max(1, Math.ceil(part.length / perLine)), 0);
}

/**
 * Escribe una fila cuyas celdas ocupan `spans` columnas cada una. El estilo se
 * aplica antes de fusionar: asi las celdas absorbidas heredan el borde y el
 * relleno, y el recuadro se ve completo.
 */
function writeSpanRow(
  ws: Worksheet,
  rowNumber: number,
  spans: number[],
  cells: SheetCell[],
  style: RowStyle = {},
) {
  const size = style.size ?? 9;
  let column = 1;
  let lines = 1;
  spans.forEach((span, index) => {
    const cell = cells[index] ?? { value: "" };
    const last = column + span - 1;
    const master = ws.getCell(rowNumber, column);
    master.value = cell.value;
    if (cell.numFmt) master.numFmt = cell.numFmt;
    master.font = {
      name: "Arial",
      size,
      bold: Boolean(style.bold),
      color: { argb: style.color ?? XL.text },
    };
    master.alignment = {
      horizontal: cell.align ?? "left",
      vertical: style.vertical ?? "top",
      wrapText: true,
    };
    if (style.fill) {
      master.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
    }
    if (style.border !== false) {
      master.border = {
        top: THIN_BORDER,
        left: THIN_BORDER,
        bottom: THIN_BORDER,
        right: THIN_BORDER,
      };
    }
    if (span > 1) ws.mergeCells(rowNumber, column, rowNumber, last);
    if (typeof cell.value === "string") {
      lines = Math.max(lines, estimateLines(cell.value, columnsWidth(column, last), size));
    }
    column = last + 1;
  });
  const lineHeight = size + 3;
  ws.getRow(rowNumber).height = Math.min(
    400,
    Math.max(style.minHeight ?? 18, lines * lineHeight + 6),
  );
}

function sanitizeSheetName(raw: string, used: Set<string>, fallbackIndex: number) {
  const base =
    String(raw || "")
      .replace(/[\\/?*[\]:]/g, "-")
      .trim()
      .slice(0, 31) || `Proyecto ${fallbackIndex}`;
  let candidate = base;
  for (let attempt = 2; used.has(candidate.toLowerCase()); attempt += 1) {
    const suffix = ` (${attempt})`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function drawProjectWorkOrderSheet(
  workbook: any,
  ws: Worksheet,
  logoAsset: PdfImageAsset | null,
  data: ProjectWorkOrderReportData,
  stamp: string,
) {
  ws.columns = XL_COLUMN_WIDTHS.map((width, index) => ({
    key: `col_${index + 1}`,
    width,
  }));

  // Cabecera: logo a la izquierda, "Proyecto" y el codigo a la derecha.
  ws.getRow(1).height = 30;
  ws.getRow(2).height = 20;
  if (logoAsset) {
    const size = getContainedImageSize(logoAsset, 140, 44);
    const imageId = workbook.addImage({ base64: logoAsset.dataUrl, extension: "png" });
    ws.addImage(imageId, {
      tl: { col: 0.08, row: 0.1 },
      ext: { width: size.width, height: size.height },
    });
  }
  ws.mergeCells(1, XL_COLUMN_COUNT - 1, 1, XL_COLUMN_COUNT);
  const titleCell = ws.getCell(1, XL_COLUMN_COUNT - 1);
  titleCell.value = "Proyecto";
  titleCell.font = { name: "Arial", size: 15, bold: true, color: { argb: XL.navy } };
  titleCell.alignment = { horizontal: "right", vertical: "middle" };
  ws.mergeCells(2, XL_COLUMN_COUNT - 1, 2, XL_COLUMN_COUNT);
  const codeCell = ws.getCell(2, XL_COLUMN_COUNT - 1);
  codeCell.value = safeText(data.code);
  codeCell.font = { name: "Arial", size: 10, color: { argb: XL.text } };
  codeCell.alignment = { horizontal: "right", vertical: "middle" };

  let row = 4;
  writeSpanRow(
    ws,
    row,
    [XL_COLUMN_COUNT],
    [{ value: safeText(data.projectName, "Proyecto sin nombre").toUpperCase() }],
    { size: 12, bold: true, border: false, vertical: "middle", minHeight: 24 },
  );
  row += 2;

  writeSpanRow(
    ws,
    row,
    [2, 2, 2, 2],
    [{ value: "Fecha" }, { value: "Empresa" }, { value: "Estado" }, { value: "Plantilla" }],
    { fill: XL.navy, color: XL.white, bold: true, vertical: "middle" },
  );
  row += 1;
  writeSpanRow(
    ws,
    row,
    [2, 2, 2, 2],
    [
      { value: safeText(data.fecha) },
      { value: safeText(data.empresa) },
      { value: safeText(data.statusLabel) },
      { value: safeText(data.plantilla) },
    ],
  );
  row += 2;

  const sectionTitle = (title: string) => {
    writeSpanRow(ws, row, [XL_COLUMN_COUNT], [{ value: title }], {
      fill: XL.label,
      color: XL.navy,
      bold: true,
      size: 10,
      border: false,
      vertical: "middle",
      minHeight: 20,
    });
    row += 1;
  };

  const paragraph = (title: string, body: string) => {
    sectionTitle(title);
    writeSpanRow(ws, row, [XL_COLUMN_COUNT], [{ value: safeText(body, "Sin detalle") }]);
    row += 2;
  };

  const list = (title: string, items: string[]) => {
    sectionTitle(title);
    const entries = items.map((item) => String(item || "").trim()).filter(Boolean);
    if (!entries.length) {
      writeSpanRow(ws, row, [XL_COLUMN_COUNT], [{ value: "Sin detalle" }]);
      row += 1;
    } else {
      entries.forEach((item, index) => {
        writeSpanRow(ws, row, [XL_COLUMN_COUNT], [{ value: `${index + 1}. ${item}` }]);
        row += 1;
      });
    }
    row += 1;
  };

  paragraph("Objetivo general", data.objetivoGeneral);
  list("Objetivos específicos", data.objetivosEspecificos);
  paragraph("Metodología aplicable", data.metodologia);
  list("Alcance del proyecto", data.alcance);

  // Lugar de ejecucion: una ubicacion y una bodega por fila, en paralelo.
  sectionTitle("Lugar de ejecución");
  writeSpanRow(ws, row, [4, 4], [{ value: "Ubicaciones" }, { value: "Bodegas" }], {
    fill: XL.slate,
    color: XL.white,
    bold: true,
    vertical: "middle",
  });
  row += 1;
  // Una lista vacia se marca con "-" en su primera fila, como en el PDF.
  const placeRows = Math.max(data.ubicaciones.length, data.bodegas.length, 1);
  for (let index = 0; index < placeRows; index += 1) {
    const blank = index === 0 ? "-" : "";
    writeSpanRow(
      ws,
      row,
      [4, 4],
      [
        { value: data.ubicaciones[index] ?? blank },
        { value: data.bodegas[index] ?? blank },
      ],
    );
    row += 1;
  }
  row += 1;

  // Contratacion de personal: con costos usa las ocho columnas; sin costos no
  // se escribe ni una celda de importes.
  sectionTitle("Contratación de personal");
  const withCosts = data.mostrarCostos;
  const personnelSpans = withCosts ? [1, 1, 1, 1, 1, 1, 1, 1] : [1, 1, 1, 1, 2, 2];
  const personnelHead = withCosts
    ? ["Cargo", "Nombre y apellido", "Días laborados (firma)", "Ubicación", "Valor día", "Total", "Fecha", "Observación"]
    : ["Cargo", "Nombre y apellido", "Días laborados (firma)", "Ubicación", "Fecha", "Observación"];
  writeSpanRow(
    ws,
    row,
    personnelSpans,
    personnelHead.map((value) => ({ value, align: "center" as const })),
    { fill: XL.slate, color: XL.white, bold: true, vertical: "middle", minHeight: 30 },
  );
  row += 1;
  if (!data.personal.length) {
    writeSpanRow(ws, row, [XL_COLUMN_COUNT], [{ value: "Sin personal contratado." }]);
    row += 1;
  } else {
    data.personal.forEach((person, index) => {
      const dias: SheetCell = {
        value: Number(person.diasLaborados) || 0,
        align: "right",
        numFmt: XL_MONEY_FORMAT,
      };
      const cells: SheetCell[] = withCosts
        ? [
            { value: safeText(person.rol) },
            { value: safeText(person.nombre) },
            dias,
            { value: safeText(person.ubicacion) },
            { value: Number(person.valorDia) || 0, align: "right", numFmt: XL_MONEY_FORMAT },
            {
              value: round2(
                (Number(person.diasLaborados) || 0) * (Number(person.valorDia) || 0),
              ),
              align: "right",
              numFmt: XL_MONEY_FORMAT,
            },
            { value: safeText(person.fecha), align: "center" },
            { value: safeText(person.observacion) },
          ]
        : [
            { value: safeText(person.rol) },
            { value: safeText(person.nombre) },
            dias,
            { value: safeText(person.ubicacion) },
            { value: safeText(person.fecha), align: "center" },
            { value: safeText(person.observacion) },
          ];
      writeSpanRow(ws, row, personnelSpans, cells, {
        fill: index % 2 ? XL.zebra : undefined,
      });
      row += 1;
    });
    if (withCosts) {
      writeSpanRow(
        ws,
        row,
        [5, 1, 2],
        [
          { value: "Total mano de obra", align: "right" },
          { value: round2(laborTotal(data)), align: "right", numFmt: XL_MONEY_FORMAT },
          { value: "" },
        ],
        { fill: XL.label, bold: true, vertical: "middle" },
      );
      row += 1;
    }
  }
  row += 1;

  // Materiales: cantidad como numero, para poder sumarla en la hoja.
  sectionTitle("Materiales utilizados");
  writeSpanRow(
    ws,
    row,
    [1, 3, 2, 2],
    [
      { value: "Ítem", align: "center" },
      { value: "Descripción" },
      { value: "Cantidad", align: "right" },
      { value: "Marca" },
    ],
    { fill: XL.slate, color: XL.white, bold: true, vertical: "middle" },
  );
  row += 1;
  if (!data.materiales.length) {
    writeSpanRow(
      ws,
      row,
      [1, 3, 2, 2],
      [
        { value: "-", align: "center" },
        { value: "Sin materiales registrados en el proyecto." },
        { value: "-", align: "right" },
        { value: "-" },
      ],
    );
    row += 1;
  } else {
    data.materiales.forEach((material, index) => {
      const unit = String(material.unidad || "").replace(/"/g, "").trim();
      writeSpanRow(
        ws,
        row,
        [1, 3, 2, 2],
        [
          { value: index + 1, align: "center" },
          { value: safeText(material.descripcion) },
          {
            value: Number(material.cantidad) || 0,
            align: "right",
            numFmt: unit ? `${XL_MONEY_FORMAT} "${unit}"` : XL_MONEY_FORMAT,
          },
          { value: safeText(material.marca) },
        ],
        { fill: index % 2 ? XL.zebra : undefined },
      );
      row += 1;
    });
  }
  row += 1;

  sectionTitle("Registro del proyecto");
  writeSpanRow(
    ws,
    row,
    [3, 3, 2],
    [{ value: "Creado por" }, { value: "Procesado por" }, { value: "Última edición por" }],
    { fill: XL.slate, color: XL.white, bold: true, vertical: "middle" },
  );
  row += 1;
  writeSpanRow(
    ws,
    row,
    [3, 3, 2],
    [
      { value: safeText(data.createdBy, "Sin registro") },
      { value: safeText(data.processedBy, "Sin registro") },
      { value: safeText(data.updatedBy, "Sin registro") },
    ],
  );
  row += 2;

  writeSpanRow(ws, row, [XL_COLUMN_COUNT], [{ value: `Generado el ${stamp}` }], {
    color: XL.soft,
    size: 8,
    border: false,
    vertical: "middle",
  });
}

/**
 * Excel con una hoja por OT de proyecto, con el mismo contenido y el mismo
 * orden que el PDF. La hoja se llama como el codigo de la OT.
 */
export async function buildProjectWorkOrdersExcelBlob(
  list: ProjectWorkOrderReportData[],
): Promise<Blob> {
  if (!list.length) {
    throw new Error("No hay órdenes de proyecto para exportar.");
  }
  const excelJsModule = await import("exceljs");
  const Workbook = excelJsModule.Workbook ?? (excelJsModule.default as any)?.Workbook;
  if (!Workbook) {
    throw new Error("No se pudo iniciar el generador de Excel.");
  }
  const workbook = new Workbook();
  workbook.creator = "KPI Justice";
  workbook.company = "Justice Company";
  workbook.created = new Date();
  workbook.modified = new Date();

  const logoAsset = await getCompanyLogoAsset();
  const stamp = generatedStamp();
  const usedNames = new Set<string>();

  list.forEach((data, index) => {
    const footerText = `${stamp} · ${safeText(data.code, "")}`.replace(/&/g, "&&");
    const ws = workbook.addWorksheet(
      sanitizeSheetName(data.code, usedNames, index + 1),
      {
        views: [{ showGridLines: false }],
        pageSetup: {
          orientation: "landscape",
          paperSize: 9,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.25, footer: 0.3 },
        },
        headerFooter: {
          oddFooter: `&L&8Generado el ${footerText}&R&8Página &P de &N`,
        },
      },
    );
    drawProjectWorkOrderSheet(workbook, ws, logoAsset, data, stamp);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XL_SHEET_MIME });
}

export function buildProjectWorkOrderReportExcelBlob(
  data: ProjectWorkOrderReportData,
): Promise<Blob> {
  return buildProjectWorkOrdersExcelBlob([data]);
}

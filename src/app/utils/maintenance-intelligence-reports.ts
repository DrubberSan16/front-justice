type AnyRow = Record<string, any>;

export type ReportSummaryItem = {
  label: string;
  value: string | number;
};

export type ReportColumn = {
  key: string;
  header?: string;
  width?: number;
  format?: "text" | "number" | "currency" | "date" | "datetime" | "hours";
};

export type ReportSheet = {
  name: string;
  rows: AnyRow[];
  columns?: ReportColumn[];
  note?: string;
  groupBy?: string[];
  emptyMessage?: string;
};

export type ReportDefinition = {
  fileName: string;
  title: string;
  subtitle?: string;
  generatedAt?: string;
  summary?: ReportSummaryItem[];
  sheets: ReportSheet[];
  orientation?: "portrait" | "landscape";
};

const REPORT_THEME = {
  brand: "1F4E78",
  brandSoft: "D9EAF7",
  accent: "F4B183",
  accentSoft: "FCE4D6",
  success: "A9D18E",
  warning: "F4DD6B",
  border: "B7C9D6",
  text: "1F2937",
  textSoft: "5B6B7B",
  white: "FFFFFF",
  zebra: "F7FAFC",
};

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function repairText(value: string) {
  const raw = String(value ?? "");
  if (!raw) return "";
  if (!/[ÃÂâ]/.test(raw)) return raw;
  try {
    return decodeURIComponent(escape(raw));
  } catch {
    return raw
      .replace(/Ã¡/g, "á")
      .replace(/Ã©/g, "é")
      .replace(/Ã­/g, "í")
      .replace(/Ã³/g, "ó")
      .replace(/Ãº/g, "ú")
      .replace(/Ã±/g, "ñ")
      .replace(/Ã/g, "Á")
      .replace(/Ã‰/g, "É")
      .replace(/Ã/g, "Í")
      .replace(/Ã“/g, "Ó")
      .replace(/Ãš/g, "Ú")
      .replace(/Ã‘/g, "Ñ")
      .replace(/Â·/g, "·")
      .replace(/Â/g, "");
  }
}

function prettifyLabel(value: string) {
  return repairText(String(value || ""))
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).filter(Boolean).join(" | ");
  if (typeof value === "object") return JSON.stringify(value);
  return repairText(String(value));
}

function normalizeRows(rows: AnyRow[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [prettifyLabel(key), formatValue(value)]),
    ),
  );
}

function collectColumns(rows: AnyRow[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  return [...keys];
}

function safeSheetName(name: string) {
  return repairText(String(name || "Hoja"))
    .replace(/[\\/*?:[\]]/g, " ")
    .slice(0, 31)
    .trim() || "Hoja";
}

function excelColumnName(index: number) {
  let dividend = index;
  let columnName = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
}

function inferColumnFormat(key: string): ReportColumn["format"] {
  const normalized = repairText(key).toLowerCase();
  if (/fecha|date/.test(normalized)) return normalized.includes("hora") ? "datetime" : "date";
  if (/hora|hours|hrs/.test(normalized)) return "hours";
  if (/costo|precio|subtotal|total|valorado/.test(normalized)) return "currency";
  if (/cantidad|stock|promedio|indice|porcentaje|kw|galones|saldo|horometro|resultado|nivel/.test(normalized)) return "number";
  return "text";
}

function inferColumnWidth(key: string, rows: AnyRow[]) {
  const headerLength = prettifyLabel(key).length;
  const sampleLength = Math.max(
    0,
    ...rows.slice(0, 30).map((row) => String(formatValue(row[key]) || "").length),
  );
  return Math.min(40, Math.max(12, headerLength + 2, Math.ceil(sampleLength * 0.85)));
}

function resolveColumns(sheet: ReportSheet, rows: AnyRow[]) {
  if (sheet.columns?.length) {
    return sheet.columns.map((column) => ({
      key: column.key,
      header: prettifyLabel(column.header || column.key),
      width: column.width ?? inferColumnWidth(column.key, rows),
      format: column.format ?? inferColumnFormat(column.key),
    }));
  }

  return collectColumns(rows).map((key) => ({
    key,
    header: prettifyLabel(key),
    width: inferColumnWidth(key, rows),
    format: inferColumnFormat(key),
  }));
}

function formatSheetValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  const raw = repairText(String(value)).trim();
  if (!raw) return "";
  if (/^-?\d+([.,]\d+)?$/.test(raw)) return Number(raw.replace(",", "."));
  return raw;
}

function buildGroupedRows(rows: AnyRow[], groupBy?: string[]) {
  if (!groupBy?.length) {
    return rows.map((row) => ({ type: "data" as const, row }));
  }

  const normalizedGroupKeys = groupBy.map((key) => prettifyLabel(key));
  const grouped = new Map<string, AnyRow[]>();
  for (const row of rows) {
    const label = normalizedGroupKeys
      .map((key) => `${prettifyLabel(key)}: ${formatValue(row[key]) || "Sin dato"}`)
      .join(" · ");
    const current = grouped.get(label) ?? [];
    current.push(row);
    grouped.set(label, current);
  }

  const out: Array<{ type: "group" | "data"; label?: string; row?: AnyRow }> = [];
  for (const [label, items] of grouped.entries()) {
    out.push({ type: "group", label });
    for (const item of items) out.push({ type: "data", row: item });
  }
  return out;
}

function applyCellFormat(cell: any, format: ReportColumn["format"]) {
  if (format === "currency") {
    cell.numFmt = '#,##0.00';
    cell.alignment = { horizontal: "right", vertical: "middle" };
    return;
  }
  if (format === "number") {
    cell.numFmt = '#,##0.00';
    cell.alignment = { horizontal: "right", vertical: "middle" };
    return;
  }
  if (format === "hours") {
    cell.numFmt = '#,##0.00 "h"';
    cell.alignment = { horizontal: "right", vertical: "middle" };
    return;
  }
  if (format === "date") {
    cell.numFmt = "yyyy-mm-dd";
    cell.alignment = { horizontal: "center", vertical: "middle" };
    return;
  }
  if (format === "datetime") {
    cell.numFmt = "yyyy-mm-dd hh:mm";
    cell.alignment = { horizontal: "center", vertical: "middle" };
    return;
  }
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
}

export async function downloadReportExcel(report: ReportDefinition) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "KPI Justice";
  workbook.company = "Justice Company";
  workbook.created = new Date();
  workbook.modified = new Date();

  const generatedLabel = report.generatedAt
    ? new Date(report.generatedAt).toLocaleString()
    : new Date().toLocaleString();

  for (const [sheetIndex, sheet] of report.sheets.entries()) {
    const rows = normalizeRows(sheet.rows);
    const safeRows = rows.length ? rows : [{ Estado: sheet.emptyMessage || "Sin registros disponibles" }];
    const columns = resolveColumns(sheet, safeRows);
    const worksheet = workbook.addWorksheet(safeSheetName(sheet.name), {
      pageSetup: {
        orientation: report.orientation ?? "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.5, header: 0.25, footer: 0.25 },
      },
    });

    worksheet.properties.defaultRowHeight = 20;
    worksheet.columns = columns.map((column) => ({
      key: column.key,
      width: column.width,
    }));

    const lastColumnIndex = Math.max(columns.length, 2);
    const lastColumnName = excelColumnName(lastColumnIndex);

    worksheet.mergeCells(`A1:${lastColumnName}1`);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = repairText(report.title);
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: REPORT_THEME.white } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brand } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 26;

    worksheet.mergeCells(`A2:${lastColumnName}2`);
    const subtitleCell = worksheet.getCell("A2");
    subtitleCell.value = repairText(report.subtitle || sheet.note || "Reporte operativo generado desde KPI Justice.");
    subtitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: REPORT_THEME.text } };
    subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brandSoft } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.getRow(2).height = 24;

    worksheet.mergeCells(`A3:${lastColumnName}3`);
    const metaCell = worksheet.getCell("A3");
    metaCell.value = `Hoja: ${repairText(sheet.name)} · Generado: ${generatedLabel}`;
    metaCell.font = { name: "Arial", size: 9, color: { argb: REPORT_THEME.textSoft } };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };

    let cursorRow = 5;

    if (sheetIndex === 0 && report.summary?.length) {
      worksheet.mergeCells(`A${cursorRow}:${lastColumnName}${cursorRow}`);
      const summaryTitle = worksheet.getCell(`A${cursorRow}`);
      summaryTitle.value = "Resumen ejecutivo";
      summaryTitle.font = { name: "Arial", size: 11, bold: true, color: { argb: REPORT_THEME.text } };
      summaryTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.warning } };
      summaryTitle.alignment = { horizontal: "center", vertical: "middle" };
      cursorRow += 1;

      const summaryHeaderRow = worksheet.getRow(cursorRow);
      summaryHeaderRow.values = ["Indicador", "Valor"];
      summaryHeaderRow.font = { name: "Arial", size: 10, bold: true, color: { argb: REPORT_THEME.white } };
      summaryHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brand } };
      summaryHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
      cursorRow += 1;

      for (const item of report.summary) {
        const row = worksheet.getRow(cursorRow);
        row.getCell(1).value = repairText(item.label);
        row.getCell(2).value = formatSheetValue(item.value);
        row.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: REPORT_THEME.brand } };
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: REPORT_THEME.border } },
            left: { style: "thin", color: { argb: REPORT_THEME.border } },
            bottom: { style: "thin", color: { argb: REPORT_THEME.border } },
            right: { style: "thin", color: { argb: REPORT_THEME.border } },
          };
          cell.alignment = { vertical: "middle" };
        });
        cursorRow += 1;
      }

      cursorRow += 1;
    }

    if (sheet.note) {
      worksheet.mergeCells(`A${cursorRow}:${lastColumnName}${cursorRow}`);
      const noteCell = worksheet.getCell(`A${cursorRow}`);
      noteCell.value = repairText(sheet.note);
      noteCell.font = { name: "Arial", size: 9, italic: true, color: { argb: REPORT_THEME.text } };
      noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.accentSoft } };
      noteCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      worksheet.getRow(cursorRow).height = 22;
      cursorRow += 2;
    }

    const headerRowIndex = cursorRow;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = columns.map((column) => column.header);
    headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: REPORT_THEME.white } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brand } };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.height = 22;

    const groupedRows = buildGroupedRows(safeRows, sheet.groupBy);
    let rowIndex = headerRowIndex + 1;
    let zebraIndex = 0;

    for (const entry of groupedRows) {
      if (entry.type === "group") {
        worksheet.mergeCells(`A${rowIndex}:${lastColumnName}${rowIndex}`);
        const groupCell = worksheet.getCell(`A${rowIndex}`);
        groupCell.value = repairText(entry.label || "Grupo");
        groupCell.font = { name: "Arial", size: 10, bold: true, color: { argb: REPORT_THEME.text } };
        groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.accentSoft } };
        groupCell.alignment = { horizontal: "left", vertical: "middle" };
        rowIndex += 1;
        continue;
      }

      const row = worksheet.getRow(rowIndex);
      columns.forEach((column, columnIndex) => {
        const cell = row.getCell(columnIndex + 1);
        cell.value = formatSheetValue(entry.row?.[column.key]);
        applyCellFormat(cell, column.format);
        cell.border = {
          top: { style: "thin", color: { argb: REPORT_THEME.border } },
          left: { style: "thin", color: { argb: REPORT_THEME.border } },
          bottom: { style: "thin", color: { argb: REPORT_THEME.border } },
          right: { style: "thin", color: { argb: REPORT_THEME.border } },
        };
        if (zebraIndex % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.zebra } };
        }
      });
      row.height = 20;
      zebraIndex += 1;
      rowIndex += 1;
    }

    worksheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: lastColumnIndex },
    };
    worksheet.views = [{ state: "frozen", ySplit: headerRowIndex, xSplit: 0 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${report.fileName}.xlsx`,
  );
}

export async function downloadReportPdf(report: ReportDefinition) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const autoTable = autoTableModule.default;
  const doc = new jsPDF({
    orientation: report.orientation ?? "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 32;
  const generatedLabel = report.generatedAt
    ? new Date(report.generatedAt).toLocaleString()
    : new Date().toLocaleString();

  function drawPageHeader(title: string, subtitle?: string, pageLabel?: string) {
    doc.setFillColor(31, 78, 120);
    doc.rect(0, 0, pageWidth, 86, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(repairText(title), marginX, 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (subtitle) {
      const lines = doc.splitTextToSize(repairText(subtitle), pageWidth - marginX * 2);
      doc.text(lines, marginX, 52);
    }
    if (pageLabel) {
      doc.setFontSize(9);
      doc.text(repairText(pageLabel), pageWidth - marginX, 34, { align: "right" });
    }
    doc.setTextColor(91, 107, 123);
    doc.setFontSize(9);
    doc.text(`Generado: ${generatedLabel}`, marginX, 102);
    doc.setTextColor(31, 41, 55);
  }

  drawPageHeader(report.title, report.subtitle, "Reporte operativo");
  let cursorY = 118;

  if (report.summary?.length) {
    const cardWidth = (pageWidth - marginX * 2 - 16) / 2;
    let cardIndex = 0;
    for (const item of report.summary) {
      const x = marginX + (cardIndex % 2) * (cardWidth + 16);
      const y = cursorY + Math.floor(cardIndex / 2) * 56;
      doc.setFillColor(217, 234, 247);
      doc.roundedRect(x, y, cardWidth, 44, 8, 8, "F");
      doc.setTextColor(91, 107, 123);
      doc.setFontSize(9);
      doc.text(repairText(item.label), x + 12, y + 16);
      doc.setTextColor(31, 78, 120);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(repairText(String(formatValue(item.value))), x + 12, y + 33);
      doc.setFont("helvetica", "normal");
      cardIndex += 1;
    }
    cursorY += Math.ceil(report.summary.length / 2) * 56 + 8;
  }

  for (const [index, sheet] of report.sheets.entries()) {
    const rows = normalizeRows(sheet.rows);
    const safeRows = rows.length ? rows : [{ Estado: sheet.emptyMessage || "Sin registros disponibles" }];
    const columns = resolveColumns(sheet, safeRows);

    if (index > 0) {
      doc.addPage(report.orientation ?? "landscape");
      drawPageHeader(report.title, report.subtitle, repairText(sheet.name));
      cursorY = 118;
    }

    doc.setFillColor(244, 177, 131);
    doc.roundedRect(marginX, cursorY - 2, pageWidth - marginX * 2, 24, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text(repairText(sheet.name), marginX + 10, cursorY + 14);
    cursorY += 34;

    if (sheet.note) {
      doc.setFillColor(252, 228, 214);
      const noteLines = doc.splitTextToSize(repairText(sheet.note), pageWidth - marginX * 2 - 20);
      const noteHeight = 18 + noteLines.length * 10;
      doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, noteHeight, 6, 6, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(91, 107, 123);
      doc.text(noteLines, marginX + 10, cursorY + 14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      cursorY += noteHeight + 10;
    }

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: {
        fillColor: [31, 78, 120],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        textColor: [31, 41, 55],
        fontSize: 8,
        cellPadding: 5,
        overflow: "linebreak",
      },
      alternateRowStyles: { fillColor: [247, 250, 252] },
      head: [columns.map((column) => repairText(column.header))],
      body: safeRows.map((row) =>
        columns.map((column) => repairText(String(formatValue(row[column.key] ?? row[column.header])))),
      ),
    });

    cursorY = (doc as any).lastAutoTable.finalY + 12;
    if (cursorY > pageHeight - 40) cursorY = 118;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(91, 107, 123);
    doc.setFontSize(8);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
  }

  doc.save(`${report.fileName}.pdf`);
}

export function buildIndicatorsReport(summary: AnyRow) {
  const kpis = Object.entries(summary?.kpis ?? {}).map(([key, value]) => ({
    indicador: prettifyLabel(key),
    valor: formatValue(value),
  }));

  const breakdown = (summary?.process_breakdown ?? []).map((item: AnyRow) => ({
    proceso: prettifyLabel(item.tipo_proceso),
    total_eventos: item.total ?? 0,
  }));

  const events = (summary?.recent_events ?? []).map((item: AnyRow) => ({
    proceso: prettifyLabel(item.tipo_proceso),
    accion: item.accion,
    referencia: item.referencia_codigo ?? item.referencia_tabla ?? "",
    estado: item.estado ?? "",
    fecha_evento: item.fecha_evento ?? "",
  }));

  return {
    fileName: `indicadores_proceso_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de indicadores de proceso",
    subtitle: "Consolidado de eventos KPI, procesos operativos y trazabilidad documental.",
    generatedAt: summary?.generated_at,
    summary: kpis.map((item) => ({ label: item.indicador, value: item.valor })),
    sheets: [
      { name: "Indicadores", rows: kpis, note: "Resumen principal del período analizado." },
      { name: "Distribución", rows: breakdown },
      { name: "Eventos", rows: events },
    ],
  } satisfies ReportDefinition;
}

export function buildProceduresReport(procedures: AnyRow[]) {
  const procedureRows = procedures.map((item) => ({
    codigo: item.codigo,
    nombre: item.nombre,
    tipo_proceso: prettifyLabel(item.tipo_proceso),
    frecuencia_horas: item.frecuencia_horas ?? "",
    version: item.version ?? "",
    clase_mantenimiento: item.clase_mantenimiento ?? "",
    documento_referencia: item.documento_referencia ?? "",
    actividades: item.actividades?.length ?? 0,
  }));

  const activityRows = procedures.flatMap((item) =>
    (item.actividades ?? []).map((activity: AnyRow) => ({
      procedimiento_codigo: item.codigo,
      procedimiento_nombre: item.nombre,
      orden: activity.orden,
      fase: activity.fase ?? "",
      actividad: activity.actividad,
      detalle: activity.detalle ?? "",
      requiere_permiso: activity.requiere_permiso,
      requiere_epp: activity.requiere_epp,
      requiere_bloqueo: activity.requiere_bloqueo,
      requiere_evidencia: activity.requiere_evidencia,
    })),
  );

  return {
    fileName: `procedimientos_mpg_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de procedimientos y plantillas MPG",
    subtitle: "Procedimientos preventivos, actividades y controles derivados de las plantillas documentales.",
    summary: [
      { label: "Plantillas activas", value: procedureRows.length },
      { label: "Actividades documentadas", value: activityRows.length },
    ],
    sheets: [
      { name: "Procedimientos", rows: procedureRows, note: "Base documental activa para mantenimiento preventivo." },
      { name: "Actividades", rows: activityRows },
    ],
  } satisfies ReportDefinition;
}

export function buildLubricantReport(analyses: AnyRow[]) {
  const analysisRows = analyses.map((item) => ({
    codigo: item.codigo,
    cliente: item.cliente ?? "",
    lubricante: item.lubricante ?? item.equipo_codigo ?? "",
    marca_lubricante: item.marca_lubricante ?? item.equipo_nombre ?? "",
    compartimento_principal: item.compartimento_principal ?? "",
    fecha_muestra: item.fecha_muestra ?? "",
    fecha_reporte: item.fecha_reporte ?? "",
    estado_diagnostico: item.estado_diagnostico ?? "",
    diagnostico: item.diagnostico ?? "",
  }));

  const detailRows = analyses.flatMap((item) =>
    (item.detalles ?? []).map((detail: AnyRow) => ({
      analisis_codigo: item.codigo,
      lubricante: item.lubricante ?? item.equipo_codigo ?? "",
      marca_lubricante: item.marca_lubricante ?? item.equipo_nombre ?? "",
      compartimento: detail.compartimento ?? "",
      numero_muestra: detail.numero_muestra ?? "",
      parametro: detail.parametro ?? "",
      resultado_numerico: detail.resultado_numerico ?? "",
      resultado_texto: detail.resultado_texto ?? "",
      unidad: detail.unidad ?? "",
      nivel_alerta: detail.nivel_alerta ?? "",
      tendencia: detail.tendencia ?? "",
      observacion: detail.observacion ?? "",
    })),
  );

  const alerts = analyses.filter(
    (item) => String(item.estado_diagnostico || "").toUpperCase() === "ALERTA",
  ).length;

  return {
    fileName: `analisis_lubricante_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de análisis de lubricante",
    subtitle: "Resultados, tendencias y detalle por compartimento para monitoreo predictivo.",
    summary: [
      { label: "Análisis cargados", value: analysisRows.length },
      {
        label: "Lubricantes registrados",
        value: new Set(analysisRows.map((item) => item.lubricante).filter(Boolean)).size,
      },
      { label: "Casos en alerta", value: alerts },
      { label: "Parámetros evaluados", value: detailRows.length },
    ],
    sheets: [
      { name: "Análisis", rows: analysisRows, note: "Cabecera consolidada del análisis de lubricantes." },
      { name: "Detalle", rows: detailRows, groupBy: ["analisis_codigo"] },
    ],
  } satisfies ReportDefinition;
}

export function buildComponentsReport(components: AnyRow[]) {
  const componentRows = components.map((item) => ({
    equipo_codigo: item.equipo_codigo ?? "",
    tipo_componente: item.tipo_componente ?? "",
    posicion: item.posicion ?? "",
    serie: item.serie ?? "",
    estado: item.estado ?? "",
    horas_uso: item.horas_uso ?? "",
    motivo: item.motivo ?? "",
    responsable: item.responsable ?? "",
    reporte_codigo: item.reporte_codigo ?? "",
    fecha_reporte: item.fecha_reporte ?? "",
  }));

  const inAlert = components.filter((item) =>
    ["ALERTA", "CRITICO", "CRITICA", "POR CAMBIO"].includes(String(item.estado || "").toUpperCase()),
  ).length;

  return {
    fileName: `componentes_criticos_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de control de componentes críticos",
    subtitle: "Seguimiento de componentes mayores, horas de uso, causas y estado operativo.",
    summary: [
      { label: "Componentes monitoreados", value: componentRows.length },
      { label: "Componentes en alerta", value: inAlert },
      {
        label: "Equipos impactados",
        value: new Set(components.map((item) => item.equipo_codigo).filter(Boolean)).size,
      },
    ],
    sheets: [{ name: "Componentes", rows: componentRows }],
  } satisfies ReportDefinition;
}

export function buildDailyReportsReport(reports: AnyRow[]) {
  const reportRows = reports.map((item) => ({
    codigo: item.codigo,
    fecha_reporte: item.fecha_reporte ?? "",
    locacion: item.locacion ?? "",
    turno: item.turno ?? "",
    resumen: item.resumen ?? "",
    unidades: item.unidades?.length ?? 0,
    combustibles: item.combustibles?.length ?? 0,
    componentes: item.componentes?.length ?? 0,
  }));

  const unitRows = reports.flatMap((item) =>
    (item.unidades ?? []).map((unit: AnyRow) => ({
      reporte_codigo: item.codigo,
      fecha_reporte: item.fecha_reporte ?? "",
      turno: item.turno ?? "",
      equipo_codigo: unit.equipo_codigo ?? "",
      fabricante: unit.fabricante ?? "",
      modo_operacion: unit.modo_operacion ?? "",
      carga_kw: unit.carga_kw ?? "",
      horometro_actual: unit.horometro_actual ?? "",
      horas_operacion: unit.horas_operacion ?? "",
      mpg_actual: unit.mpg_actual ?? "",
      proximo_mpg: unit.proximo_mpg ?? "",
      horas_faltantes: unit.horas_faltantes ?? "",
      fecha_proxima: unit.fecha_proxima ?? "",
      nota: unit.nota ?? "",
    })),
  );

  const fuelRows = reports.flatMap((item) =>
    (item.combustibles ?? []).map((fuel: AnyRow) => ({
      reporte_codigo: item.codigo,
      fecha_reporte: item.fecha_reporte ?? "",
      tanque: fuel.tanque ?? "",
      tipo_lectura: fuel.tipo_lectura ?? "",
      fecha_lectura: fuel.fecha_lectura ?? "",
      galones: fuel.galones ?? "",
      stock_anterior: fuel.stock_anterior ?? "",
      stock_actual: fuel.stock_actual ?? "",
      consumo_galones: fuel.consumo_galones ?? "",
      guia_remision: fuel.guia_remision ?? "",
      observacion: fuel.observacion ?? "",
    })),
  );

  const componentRows = reports.flatMap((item) =>
    (item.componentes ?? []).map((component: AnyRow) => ({
      reporte_codigo: item.codigo,
      fecha_reporte: item.fecha_reporte ?? "",
      equipo_codigo: component.equipo_codigo ?? "",
      tipo_componente: component.tipo_componente ?? "",
      estado: component.estado ?? "",
      horas_uso: component.horas_uso ?? "",
      motivo: component.motivo ?? "",
      responsable: component.responsable ?? "",
    })),
  );

  return {
    fileName: `reporte_operacion_diaria_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de operación diaria",
    subtitle: "Consolidado diario de unidades, combustible y control de componentes.",
    summary: [
      { label: "Reportes diarios", value: reportRows.length },
      { label: "Unidades registradas", value: unitRows.length },
      { label: "Lecturas combustible", value: fuelRows.length },
      { label: "Componentes asociados", value: componentRows.length },
    ],
    sheets: [
      { name: "Cabecera", rows: reportRows },
      { name: "Unidades", rows: unitRows },
      { name: "Combustible", rows: fuelRows },
      { name: "Componentes", rows: componentRows },
    ],
  } satisfies ReportDefinition;
}

export function buildWeeklyScheduleReport(schedules: AnyRow[]) {
  const scheduleRows = schedules.map((item) => ({
    codigo: item.codigo,
    fecha_inicio: item.fecha_inicio ?? "",
    fecha_fin: item.fecha_fin ?? "",
    locacion: item.locacion ?? "",
    referencia_orden: item.referencia_orden ?? "",
    resumen: item.resumen ?? "",
    actividades: item.detalles?.length ?? 0,
  }));

  const activityRows = schedules.flatMap((item) =>
    (item.detalles ?? []).map((detail: AnyRow) => ({
      cronograma_codigo: item.codigo,
      fecha_inicio_semana: item.fecha_inicio ?? "",
      fecha_fin_semana: item.fecha_fin ?? "",
      dia_semana: detail.dia_semana ?? "",
      fecha_actividad: detail.fecha_actividad ?? "",
      hora_inicio: detail.hora_inicio ?? "",
      hora_fin: detail.hora_fin ?? "",
      tipo_proceso: detail.tipo_proceso ?? "",
      actividad: detail.actividad ?? "",
      responsable_area: detail.responsable_area ?? "",
      equipo_codigo: detail.equipo_codigo ?? "",
      observacion: detail.observacion ?? "",
    })),
  );

  return {
    fileName: `cronograma_semanal_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de cronograma semanal de actividades",
    subtitle: "Planificación semanal por frente, área responsable y equipo asociado.",
    summary: [
      { label: "Cronogramas cargados", value: scheduleRows.length },
      { label: "Actividades programadas", value: activityRows.length },
    ],
    sheets: [
      { name: "Cronogramas", rows: scheduleRows },
      { name: "Actividades", rows: activityRows },
    ],
  } satisfies ReportDefinition;
}

export function buildExecutiveDashboardReport(payload: {
  periodLabel: string;
  kpis: Array<{ label: string; value: string | number }>;
  alerts: AnyRow[];
  workOrders: AnyRow[];
  inventory: AnyRow[];
  processIndicators: AnyRow[];
  operationDays: AnyRow[];
  weeklyActivities: AnyRow[];
}) {
  return {
    fileName: `dashboard_ejecutivo_${new Date().toISOString().slice(0, 10)}`,
    title: "Dashboard ejecutivo KPI",
    subtitle: `Resumen consolidado del período ${payload.periodLabel}.`,
    summary: payload.kpis,
    sheets: [
      { name: "Alertas", rows: payload.alerts, note: "Alertas recientes del período seleccionado." },
      { name: "Órdenes trabajo", rows: payload.workOrders },
      { name: "Inventario crítico", rows: payload.inventory },
      { name: "Indicadores proceso", rows: payload.processIndicators },
      { name: "Operación diaria", rows: payload.operationDays },
      { name: "Cronograma semanal", rows: payload.weeklyActivities },
    ],
  } satisfies ReportDefinition;
}

export function buildInventoryStockReport(payload: {
  groupLabel: string;
  summary: ReportSummaryItem[];
  rows: AnyRow[];
  movementRows?: AnyRow[];
}) {
  return {
    fileName: `inventario_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de inventario",
    subtitle: `Agrupado por ${payload.groupLabel.toLowerCase()}.`,
    summary: payload.summary,
    sheets: [
      {
        name: "Inventario",
        rows: payload.rows,
        note: `Vista consolidada y agrupada por ${payload.groupLabel}.`,
        groupBy: ["agrupacion"],
      },
      ...(payload.movementRows?.length ? [{ name: "Kardex", rows: payload.movementRows }] : []),
    ],
  } satisfies ReportDefinition;
}

export function buildWorkOrderReport(payload: {
  header: AnyRow;
  tasks: AnyRow[];
  attachments: AnyRow[];
  consumos: AnyRow[];
  issues: AnyRow[];
  history: AnyRow[];
}) {
  const header = payload.header || {};
  return {
    fileName: `ot_${repairText(String(header.code || header.codigo || "sin_codigo"))}`.replace(/\s+/g, "_"),
    title: `Reporte de orden de trabajo ${repairText(String(header.code || header.codigo || ""))}`.trim(),
    subtitle: repairText(
      [
        header.equipment_label || header.equipo_nombre || header.equipment_id,
        header.equipment_component_label || header.equipo_componente_nombre_oficial,
        header.maintenance_kind || header.tipo_mantenimiento,
      ]
        .filter(Boolean)
        .join(" · "),
    ),
    summary: [
      { label: "Estado workflow", value: header.status_workflow || "" },
      { label: "Equipo", value: header.equipment_label || header.equipo_nombre || header.equipment_id || "" },
      { label: "Compartimiento", value: header.equipment_component_label || header.equipo_componente_nombre_oficial || "" },
      { label: "Tareas", value: payload.tasks.length },
      { label: "Adjuntos", value: payload.attachments.length },
      { label: "Consumos", value: payload.consumos.length },
      { label: "Salidas", value: payload.issues.length },
    ],
    sheets: [
      { name: "Cabecera", rows: [header], note: "Datos principales de la orden de trabajo." },
      { name: "Tareas", rows: payload.tasks },
      { name: "Adjuntos", rows: payload.attachments },
      { name: "Consumos", rows: payload.consumos },
      { name: "Salidas material", rows: payload.issues },
      { name: "Histórico", rows: payload.history },
    ],
  } satisfies ReportDefinition;
}

export function buildMonthlyProgrammingReport(payload: {
  periodLabel: string;
  matrixRows: AnyRow[];
  detailRows: AnyRow[];
  summary: ReportSummaryItem[];
}) {
  return {
    fileName: `programacion_mensual_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de programación mensual MPG",
    subtitle: `Calendario mensual del período ${payload.periodLabel}.`,
    summary: payload.summary,
    sheets: [
      { name: "Matriz mensual", rows: payload.matrixRows, note: "Vista calendario resumida por equipo y día." },
      { name: "Detalle mensual", rows: payload.detailRows },
    ],
  } satisfies ReportDefinition;
}

export function buildWeeklyProgrammingReport(payload: {
  rangeLabel: string;
  summary: ReportSummaryItem[];
  matrixRows: AnyRow[];
  detailRows: AnyRow[];
}) {
  return {
    fileName: `programacion_semanal_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de programación semanal",
    subtitle: `Cronograma operativo de la semana ${payload.rangeLabel}.`,
    summary: payload.summary,
    sheets: [
      { name: "Matriz semanal", rows: payload.matrixRows, note: "Vista resumida por bloque horario y día." },
      { name: "Detalle semanal", rows: payload.detailRows },
    ],
  } satisfies ReportDefinition;
}

export function buildAgendaProgrammingReport(payload: {
  monthLabel: string;
  summary: ReportSummaryItem[];
  agendaRows: AnyRow[];
  weeklyRows: AnyRow[];
  monthlyRows: AnyRow[];
}) {
  return {
    fileName: `agenda_programaciones_${new Date().toISOString().slice(0, 10)}`,
    title: "Reporte de agenda operativa",
    subtitle: `Agenda consolidada del mes ${payload.monthLabel}.`,
    summary: payload.summary,
    sheets: [
      { name: "Agenda", rows: payload.agendaRows, note: "Programaciones manuales visibles en agenda." },
      { name: "Semanal", rows: payload.weeklyRows },
      { name: "Mensual", rows: payload.monthlyRows },
    ],
  } satisfies ReportDefinition;
}

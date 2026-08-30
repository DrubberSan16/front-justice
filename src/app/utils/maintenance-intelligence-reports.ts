import {
  currentDateTimeLabel,
  formatDateForInput,
  formatDateOnly,
  formatDateTime,
  looksLikeDateValue,
} from "@/app/utils/date-time";
import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";
import { useAuthStore } from "@/app/stores/auth.store";

type AnyRow = Record<string, any>;

export type ReportSummaryItem = {
  label: string;
  value: string | number;
};

export type ReportChart = {
  title: string;
  subtitle?: string;
  type: "line" | "bar";
  unit?: string;
  points: Array<{ label: string; value: number }>;
};

export type ReportColumn = {
  key: string;
  header?: string;
  width?: number;
  format?: "text" | "number" | "currency" | "date" | "datetime" | "hours";
};

export type ReportSheetMedia = {
  imageUrlKey: string;
  previewColumnKey: string;
  linkUrlKey?: string;
  /** Columna visible que recibirá el hipervínculo; evita imprimir la URL completa. */
  linkColumnKey?: string;
  linkLabel?: string;
  rowHeight?: number;
};

/**
 * Agrupa varias tablas bajo un mismo bloque: en PDF se renderiza como una
 * sección con portada propia y en Excel todas sus hojas caen en una sola
 * pestaña. Se usa para presentar una orden de trabajo completa por bloque.
 */
export type ReportSheetSection = {
  id: string;
  title: string;
  subtitle?: string;
  sheetName?: string;
  info?: ReportSummaryItem[];
  /** Cantidad de pares etiqueta/valor por fila en Excel. */
  infoColumns?: 1 | 2;
};

export type ReportSheet = {
  name: string;
  rows: AnyRow[];
  columns?: ReportColumn[];
  fitColumnsToPage?: boolean;
  media?: ReportSheetMedia;
  note?: string;
  groupBy?: string[];
  emptyMessage?: string;
  section?: ReportSheetSection;
  /** Alto mínimo de fila en el PDF, en puntos. */
  minRowHeight?: number;
};

export type ReportDefinition = {
  fileName: string;
  title: string;
  subtitle?: string;
  generatedAt?: string;
  /** Nombre del usuario que generó el archivo; si se omite se toma del usuario autenticado. */
  generatedBy?: string | null;
  summary?: ReportSummaryItem[];
  charts?: ReportChart[];
  sheets: ReportSheet[];
  orientation?: "portrait" | "landscape";
  continuousSections?: boolean;
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

/**
 * Nombre visible del usuario que genera el archivo. Se resuelve desde la sesión
 * activa para que todos los reportes del sistema estampen fecha y usuario sin
 * que cada vista tenga que pasarlo.
 */
function resolveGeneratedByLabel(explicit?: string | null) {
  const provided = String(explicit ?? "").trim();
  if (provided) return provided;
  try {
    const auth = useAuthStore();
    const resolved = String(
      auth.user?.nameSurname || auth.user?.nameUser || auth.user?.email || "",
    ).trim();
    if (resolved) return resolved;
  } catch {
    // Fuera de un contexto con Pinia activo: se usa el valor por defecto.
  }
  return "Sistema";
}

function buildGeneratedStamp(report: ReportDefinition) {
  const date = report.generatedAt
    ? formatDateTime(report.generatedAt, currentDateTimeLabel())
    : currentDateTimeLabel();
  return `${date} - ${repairText(resolveGeneratedByLabel(report.generatedBy))}`;
}

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
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function formatValue(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (value instanceof Date) return formatDateTime(value, "");
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).filter(Boolean).join(" | ");
  if (typeof value === "object") return JSON.stringify(value);
  const repaired = repairText(String(value));
  if (looksLikeDateValue(repaired)) {
    return /[tT ]\d{2}:\d{2}/.test(repaired)
      ? formatDateTime(repaired, repaired)
      : formatDateOnly(repaired, repaired);
  }
  return repaired;
}

function formatCompartimientoSummary(value: unknown): string {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "Sin compartimientos";
  if (lines.length === 1) return lines[0] ?? "Sin compartimientos";
  return `${lines.length} compartimientos`;
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
      header: column.header
        ? repairText(column.header).trim()
        : prettifyLabel(column.key),
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

function resolveRowValueByKey(row: AnyRow, key: string, header?: string) {
  if (!row || !key) return "";
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  const prettyKey = prettifyLabel(key);
  if (Object.prototype.hasOwnProperty.call(row, prettyKey)) return row[prettyKey];
  if (header && Object.prototype.hasOwnProperty.call(row, header)) return row[header];
  const repairedHeader = repairText(header || "");
  if (repairedHeader && Object.prototype.hasOwnProperty.call(row, repairedHeader)) return row[repairedHeader];
  return "";
}

function resolveColumnValue(row: AnyRow, column: { key: string; header?: string }) {
  return resolveRowValueByKey(row, column.key, column.header);
}

function resolveColumnIndex(columns: Array<{ key: string; header?: string }>, targetKey?: string) {
  if (!targetKey) return -1;
  return columns.findIndex((column) => {
    const normalizedTarget = prettifyLabel(targetKey);
    return column.key === targetKey || prettifyLabel(column.key) === normalizedTarget || prettifyLabel(column.header || "") === normalizedTarget;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const imageDataUrlCache = new Map<string, Promise<string | null>>();

async function loadImageDataUrl(url: string) {
  const normalizedUrl = repairText(String(url || "")).trim();
  if (!normalizedUrl) return null;
  if (normalizedUrl.startsWith("data:image/")) return normalizedUrl;
  if (imageDataUrlCache.has(normalizedUrl)) {
    return imageDataUrlCache.get(normalizedUrl) ?? null;
  }
  const pending = (async () => {
    try {
      const response = await fetch(normalizedUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!String(blob.type || "").toLowerCase().startsWith("image/")) return null;
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  })();
  imageDataUrlCache.set(normalizedUrl, pending);
  return pending;
}

function inferImageExtension(dataUrl: string, fallbackUrl = "") {
  const normalized = String(dataUrl || "").trim().toLowerCase();
  if (normalized.startsWith("data:image/png")) return "png";
  if (normalized.startsWith("data:image/jpeg") || normalized.startsWith("data:image/jpg")) return "jpeg";
  if (normalized.startsWith("data:image/gif")) return "gif";
  const fallback = String(fallbackUrl || "").toLowerCase();
  if (fallback.includes(".png")) return "png";
  if (fallback.includes(".gif")) return "gif";
  return "jpeg";
}

function formatSheetValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  const raw = repairText(String(value)).trim();
  if (!raw) return "";
  if (/^-?\d+([.,]\d+)?$/.test(raw)) return Number(raw.replace(",", "."));
  return raw;
}

/**
 * Fila que se muestra cuando una hoja no tiene datos. Si la hoja declara
 * columnas explícitas el mensaje va en la primera, porque una clave suelta como
 * "Estado" no coincidiría con ninguna columna y la tabla saldría en blanco.
 */
function buildEmptyStateRow(sheet: ReportSheet): AnyRow {
  const message = sheet.emptyMessage || "Sin registros disponibles";
  const firstKey = sheet.columns?.[0]?.key;
  return firstKey ? { [firstKey]: message } : { Estado: message };
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
    cell.numFmt = "dd-mm-yyyy";
    cell.alignment = { horizontal: "center", vertical: "middle" };
    return;
  }
  if (format === "datetime") {
    cell.numFmt = "dd-mm-yyyy hh:mm:ss";
    cell.alignment = { horizontal: "center", vertical: "middle" };
    return;
  }
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
}

function resolvePdfColumnWidth(
  column: { width?: number },
  compactTable: boolean,
  fitColumnsToPage = false,
) {
  const requested = Number(column.width ?? 14) * (compactTable ? 4.2 : 5.2);
  if (fitColumnsToPage) {
    return Math.max(compactTable ? 42 : 52, requested);
  }
  return Math.max(
    compactTable ? 42 : 52,
    Math.min(compactTable ? 140 : 180, requested),
  );
}

type ReportSheetGroup = {
  key: string;
  section?: ReportSheetSection;
  sheets: ReportSheet[];
};

/**
 * Agrupa las hojas que comparten `section.id` para que terminen en una sola
 * pestaña de Excel. Las hojas sin sección conservan una pestaña propia.
 */
function buildReportSheetGroups(sheets: ReportSheet[]): ReportSheetGroup[] {
  const groups: ReportSheetGroup[] = [];
  for (const sheet of sheets) {
    const sectionId = sheet.section?.id;
    const previous = groups[groups.length - 1];
    if (sectionId && previous && previous.key === sectionId) {
      previous.sheets.push(sheet);
      continue;
    }
    groups.push({
      key: sectionId ?? `__standalone_${groups.length}`,
      section: sheet.section,
      sheets: [sheet],
    });
  }
  return groups;
}

function uniqueSheetName(name: string, used: Set<string>) {
  const base = safeSheetName(name);
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  for (let attempt = 2; attempt < 1000; attempt += 1) {
    const suffix = ` (${attempt})`;
    const candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = safeSheetName(`Hoja ${used.size + 1}`);
  used.add(fallback);
  return fallback;
}

export async function buildReportExcelBlob(report: ReportDefinition) {
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

  const generatedStamp = buildGeneratedStamp(report);
  const chartAssets = buildReportChartAssets(report);
  const groups = buildReportSheetGroups(report.sheets);
  const usedSheetNames = new Set<string>();

  for (const [groupIndex, group] of groups.entries()) {
    const resolvedSheets = group.sheets.map((sheet) => {
      const rows = normalizeRows(sheet.rows);
      const safeRows = rows.length ? rows : [buildEmptyStateRow(sheet)];
      return { sheet, safeRows, columns: resolveColumns(sheet, safeRows) };
    });

    const firstSheet = resolvedSheets[0]?.sheet;
    const worksheetName = uniqueSheetName(
      group.section?.sheetName || group.section?.title || firstSheet?.name || "Hoja",
      usedSheetNames,
    );
    const worksheet = workbook.addWorksheet(worksheetName, {
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

    // Con varias tablas en una misma pestaña, cada columna toma el ancho mayor
    // solicitado por cualquiera de ellas.
    const widthByIndex: number[] = [];
    for (const entry of resolvedSheets) {
      entry.columns.forEach((column, columnIndex) => {
        widthByIndex[columnIndex] = Math.max(widthByIndex[columnIndex] ?? 0, column.width ?? 14);
      });
    }
    worksheet.columns = widthByIndex.map((width, columnIndex) => ({
      key: `col_${columnIndex + 1}`,
      width,
    }));

    const lastColumnIndex = Math.max(widthByIndex.length, 2);
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
    subtitleCell.value = repairText(
      group.section?.subtitle ||
        report.subtitle ||
        firstSheet?.note ||
        "Reporte operativo generado desde KPI Justice.",
    );
    subtitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: REPORT_THEME.text } };
    subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brandSoft } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.getRow(2).height = 24;

    worksheet.mergeCells(`A3:${lastColumnName}3`);
    const metaCell = worksheet.getCell("A3");
    metaCell.value = `Hoja: ${repairText(group.section?.title || firstSheet?.name || worksheetName)} · Generado: ${generatedStamp}`;
    metaCell.font = { name: "Arial", size: 9, color: { argb: REPORT_THEME.textSoft } };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };

    let cursorRow = 5;

    if (groupIndex === 0 && report.summary?.length) {
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

    if (groupIndex === 0 && chartAssets.length) {
      worksheet.mergeCells(`A${cursorRow}:${lastColumnName}${cursorRow}`);
      const chartTitle = worksheet.getCell(`A${cursorRow}`);
      chartTitle.value = "Análisis gráfico";
      chartTitle.font = { name: "Arial", size: 11, bold: true, color: { argb: REPORT_THEME.white } };
      chartTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brand } };
      chartTitle.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(cursorRow).height = 24;
      cursorRow += 1;

      const chartsPerRow = lastColumnIndex >= 8 ? 2 : 1;
      const chartWidth = chartsPerRow === 2 ? 390 : 760;
      const chartHeight = chartsPerRow === 2 ? 174 : 332;
      const chartRows = chartsPerRow === 2 ? 10 : 18;
      for (let index = 0; index < chartAssets.length; index += chartsPerRow) {
        const rowAssets = chartAssets.slice(index, index + chartsPerRow);
        rowAssets.forEach((asset, position) => {
          const imageId = workbook.addImage({
            base64: asset.imageDataUrl,
            extension: "png",
          });
          worksheet.addImage(imageId, {
            tl: {
              col: position === 0 ? 0.12 : Math.max(1, lastColumnIndex / 2) + 0.06,
              row: cursorRow - 1 + 0.12,
            },
            ext: { width: chartWidth, height: chartHeight },
          });
        });
        for (let rowOffset = 0; rowOffset < chartRows; rowOffset += 1) {
          worksheet.getRow(cursorRow + rowOffset).height = 15;
        }
        cursorRow += chartRows;
      }
      cursorRow += 1;
    }

    // Datos generales de la sección en formato informe (etiqueta / valor).
    if (group.section?.info?.length) {
      worksheet.mergeCells(`A${cursorRow}:${lastColumnName}${cursorRow}`);
      const infoTitle = worksheet.getCell(`A${cursorRow}`);
      infoTitle.value = repairText(group.section.title);
      infoTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: REPORT_THEME.white } };
      infoTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brand } };
      infoTitle.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(cursorRow).height = 24;
      cursorRow += 1;

      const infoColumns = Math.min(group.section.infoColumns ?? 1, Math.max(1, Math.floor(lastColumnIndex / 2)));
      for (let infoIndex = 0; infoIndex < group.section.info.length; infoIndex += infoColumns) {
        const row = worksheet.getRow(cursorRow);
        const chunk = group.section.info.slice(infoIndex, infoIndex + infoColumns);
        for (const [pairIndex, item] of chunk.entries()) {
          const labelColumn = pairIndex * 2 + 1;
          const valueColumn = labelColumn + 1;
          const labelCell = row.getCell(labelColumn);
          labelCell.value = repairText(item.label);
          labelCell.font = { name: "Arial", size: 9, bold: true, color: { argb: REPORT_THEME.textSoft } };
          labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brandSoft } };
          labelCell.alignment = { vertical: "middle", wrapText: true };
          const valueCell = row.getCell(valueColumn);
          // formatValue normaliza fechas ISO igual que en el PDF; formatSheetValue
          // por si sola dejaria el texto crudo 2026-08-10T13:05:00.000Z.
          valueCell.value = formatSheetValue(formatValue(item.value));
          valueCell.font = { name: "Arial", size: 9, color: { argb: REPORT_THEME.text } };
          valueCell.alignment = { vertical: "middle", wrapText: true };
        }
        if (infoColumns === 1 && lastColumnIndex > 2) {
          worksheet.mergeCells(`B${cursorRow}:${lastColumnName}${cursorRow}`);
        } else if (infoColumns === 2 && chunk.length === 2 && lastColumnIndex > 4) {
          worksheet.mergeCells(`D${cursorRow}:${lastColumnName}${cursorRow}`);
        }
        for (let columnIndex = 1; columnIndex <= lastColumnIndex; columnIndex += 1) {
          row.getCell(columnIndex).border = {
            top: { style: "thin", color: { argb: REPORT_THEME.border } },
            left: { style: "thin", color: { argb: REPORT_THEME.border } },
            bottom: { style: "thin", color: { argb: REPORT_THEME.border } },
            right: { style: "thin", color: { argb: REPORT_THEME.border } },
          };
        }
        row.height = 24;
        cursorRow += 1;
      }
      cursorRow += 1;
    }

    let firstHeaderRowIndex = 0;

    for (const { sheet, safeRows, columns } of resolvedSheets) {
      // Con varias tablas por pestaña, cada bloque abre con su propio título.
      if (resolvedSheets.length > 1) {
        worksheet.mergeCells(`A${cursorRow}:${lastColumnName}${cursorRow}`);
        const blockCell = worksheet.getCell(`A${cursorRow}`);
        blockCell.value = repairText(sheet.name);
        blockCell.font = { name: "Arial", size: 11, bold: true, color: { argb: REPORT_THEME.text } };
        blockCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.accent } };
        blockCell.alignment = { horizontal: "left", vertical: "middle" };
        worksheet.getRow(cursorRow).height = 22;
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
      if (!firstHeaderRowIndex) firstHeaderRowIndex = headerRowIndex;
      const headerRow = worksheet.getRow(headerRowIndex);
      headerRow.values = columns.map((column) => column.header);
      headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: REPORT_THEME.white } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.brand } };
      headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      headerRow.height = 22;

      const groupedRows = buildGroupedRows(safeRows, sheet.groupBy);
      const previewColumnIndex = resolveColumnIndex(columns, sheet.media?.previewColumnKey);
      const linkColumnIndex = resolveColumnIndex(
        columns,
        sheet.media?.linkColumnKey ?? sheet.media?.linkUrlKey,
      );
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
          worksheet.getRow(rowIndex).height = 22;
          rowIndex += 1;
          continue;
        }

        const row = worksheet.getRow(rowIndex);
        let estimatedLineCount = 1;
        columns.forEach((column, columnIndex) => {
          const cell = row.getCell(columnIndex + 1);
          const formattedValue = formatSheetValue(resolveColumnValue(entry.row ?? {}, column));
          cell.value = formattedValue;
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

          const textValue = typeof formattedValue === "object" ? "" : String(formattedValue ?? "");
          const usableCharacters = Math.max(8, Math.floor((column.width ?? 14) * 1.25));
          const lineCount = textValue.split(/\r?\n/).reduce(
            (total, line) => total + Math.max(1, Math.ceil(line.length / usableCharacters)),
            0,
          );
          estimatedLineCount = Math.max(estimatedLineCount, lineCount);

          if (repairText(column.header).trim().toLowerCase() === "estado") {
            const normalizedStatus = repairText(textValue).trim().toLowerCase();
            if (["completado", "completa", "completo", "realizado", "listo"].includes(normalizedStatus)) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.success } };
              cell.font = { name: "Arial", size: 9, bold: true, color: { argb: REPORT_THEME.text } };
            } else if (["pendiente", "por completar", "requiere atención"].includes(normalizedStatus)) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_THEME.warning } };
              cell.font = { name: "Arial", size: 9, bold: true, color: { argb: REPORT_THEME.text } };
            }
          }
        });

        if (sheet.media) {
          const linkValue = repairText(String(resolveRowValueByKey(entry.row ?? {}, sheet.media.linkUrlKey || "") || ""));
          if (linkColumnIndex >= 0 && linkValue) {
            const linkCell = row.getCell(linkColumnIndex + 1);
            const visibleLinkValue = repairText(
              String(
                sheet.media.linkLabel ||
                  resolveRowValueByKey(entry.row ?? {}, sheet.media.linkColumnKey || "") ||
                  "Abrir",
              ),
            );
            linkCell.value = { text: visibleLinkValue, hyperlink: linkValue };
            linkCell.font = {
              name: "Arial",
              size: 9,
              color: { argb: "0563C1" },
              underline: true,
            };
            linkCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          }

          const imageUrl = repairText(String(resolveRowValueByKey(entry.row ?? {}, sheet.media.imageUrlKey) || ""));
          if (previewColumnIndex >= 0 && imageUrl) {
            const imageDataUrl = await loadImageDataUrl(imageUrl);
            if (imageDataUrl) {
              const imageId = workbook.addImage({
                base64: imageDataUrl,
                extension: inferImageExtension(imageDataUrl, imageUrl),
              });
              const rowHeight = Math.max(sheet.media.rowHeight ?? 58, 58);
              row.height = rowHeight;
              worksheet.addImage(imageId, {
                tl: { col: previewColumnIndex + 0.12, row: rowIndex - 1 + 0.12 },
                ext: { width: 84, height: rowHeight - 8 },
              });
              row.getCell(previewColumnIndex + 1).value = "";
            }
          }
        }

        const contentHeight = 20 + Math.max(0, estimatedLineCount - 1) * 12;
        row.height = Math.max(row.height ?? 0, Math.min(contentHeight, 104));
        zebraIndex += 1;
        rowIndex += 1;
      }

      cursorRow = rowIndex + (resolvedSheets.length > 1 ? 2 : 0);

      // El autofiltro solo tiene sentido cuando la pestaña contiene una tabla.
      if (resolvedSheets.length === 1) {
        worksheet.autoFilter = {
          from: { row: headerRowIndex, column: 1 },
          to: { row: headerRowIndex, column: Math.max(columns.length, 2) },
        };
      }
    }

    const frozenRows = chartAssets.length && groupIndex === 0
      ? 3
      : resolvedSheets.length > 1
        ? 3
        : firstHeaderRowIndex || 4;
    worksheet.views = [
      { state: "frozen", ySplit: frozenRows, xSplit: 0, showGridLines: false },
    ];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadReportExcel(report: ReportDefinition) {
  const blob = await buildReportExcelBlob(report);
  saveBlob(blob, `${report.fileName}.xlsx`);
}

export async function buildReportPdfBlob(report: ReportDefinition) {
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
  const companyLogoAsset = await getCompanyLogoAsset();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 32;
  const headerTextX = marginX + (companyLogoAsset ? 124 : 0);
  const generatedStamp = buildGeneratedStamp(report);
  const chartAssets = buildReportChartAssets(report);

  function drawPageHeader(title: string, subtitle?: string, pageLabel?: string) {
    doc.setFillColor(31, 78, 120);
    doc.rect(0, 0, pageWidth, 86, "F");
    drawPdfCompanyLogo(doc, companyLogoAsset, {
      marginX,
      y: 18,
      maxWidth: 108,
      maxHeight: 34,
    });
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(repairText(title), headerTextX, 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (subtitle) {
      const lines = doc.splitTextToSize(repairText(subtitle), pageWidth - headerTextX - marginX);
      doc.text(lines, headerTextX, 52);
    }
    if (pageLabel) {
      doc.setFontSize(9);
      doc.text(repairText(pageLabel), pageWidth - marginX, 34, { align: "right" });
    }
    doc.setTextColor(91, 107, 123);
    doc.setFontSize(9);
    doc.text(`Generado: ${generatedStamp}`, marginX, 102);
    doc.setTextColor(31, 41, 55);
  }

  drawPageHeader(report.title, report.subtitle, "Reporte operativo");
  let cursorY = 118;

  // Tabla informativa compacta y centrada en lugar de tarjetas sueltas: ocupa
  // mucho menos alto vertical y deja espacio para la tabla de cabeceras.
  if (report.summary?.length) {
    const items = report.summary;
    const maxColumns = Math.min(items.length, (report.orientation ?? "landscape") === "landscape" ? 7 : 4);
    const chunks: ReportSummaryItem[][] = [];
    for (let index = 0; index < items.length; index += maxColumns) {
      chunks.push(items.slice(index, index + maxColumns));
    }
    const availableWidth = pageWidth - marginX * 2;
    const columnWidth = Math.min(112, availableWidth / maxColumns);

    for (const chunk of chunks) {
      const tableWidth = columnWidth * chunk.length;
      const leftMargin = Math.max(marginX, (pageWidth - tableWidth) / 2);
      autoTable(doc, {
        startY: cursorY,
        margin: { left: leftMargin, right: leftMargin, top: 118, bottom: 36 },
        tableWidth,
        theme: "grid",
        styles: {
          fontSize: 7.5,
          cellPadding: 4,
          halign: "center",
          valign: "middle",
          overflow: "linebreak",
          lineColor: [183, 201, 214],
        },
        headStyles: {
          fillColor: [217, 234, 247],
          textColor: [91, 107, 123],
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
        },
        bodyStyles: {
          textColor: [31, 78, 120],
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
        },
        head: [chunk.map((item) => repairText(item.label))],
        body: [chunk.map((item) => repairText(String(formatValue(item.value))))],
      });
      cursorY = (doc as any).lastAutoTable.finalY + 6;
    }
    cursorY += 4;
  }

  if (chartAssets.length) {
    const chartWidth = (pageWidth - marginX * 2 - 14) / 2;
    const chartHeight = 188;
    const slotsPerPage = 4;
    chartAssets.forEach((asset, index) => {
      if (index % slotsPerPage === 0) {
        doc.addPage(report.orientation ?? "landscape");
        drawPageHeader(report.title, report.subtitle, "Análisis gráfico");
      }
      const slot = index % slotsPerPage;
      const column = slot % 2;
      const row = Math.floor(slot / 2);
      const x = marginX + column * (chartWidth + 14);
      const y = 118 + row * (chartHeight + 18);
      doc.addImage(asset.imageDataUrl, "PNG", x, y, chartWidth, chartHeight, undefined, "FAST");
    });
    doc.addPage(report.orientation ?? "landscape");
    drawPageHeader(report.title, report.subtitle, "Detalle de consumo");
    cursorY = 118;
  }

  let currentSectionId: string | null = null;

  for (const [index, sheet] of report.sheets.entries()) {
    const rows = normalizeRows(sheet.rows);
    const safeRows = rows.length ? rows : [buildEmptyStateRow(sheet)];
    const columns = resolveColumns(sheet, safeRows);
    const previewColumnIndex = resolveColumnIndex(columns, sheet.media?.previewColumnKey);
    const linkColumnIndex = resolveColumnIndex(
      columns,
      sheet.media?.linkColumnKey ?? sheet.media?.linkUrlKey,
    );
    const availableTableWidth = pageWidth - marginX * 2;
    const compactTable = columns.length >= 9;
    const requestedColumnWidths = columns.map((column) =>
      resolvePdfColumnWidth(column, compactTable, Boolean(sheet.fitColumnsToPage)),
    );
    const requestedTableWidth = requestedColumnWidths.reduce((total, width) => total + width, 0);
    const fitScale = sheet.fitColumnsToPage && requestedTableWidth > 0
      ? availableTableWidth / requestedTableWidth
      : 1;
    const columnWidths = requestedColumnWidths.map((width) => width * fitScale);
    const tableNeedsHorizontalBreak =
      !sheet.fitColumnsToPage && requestedTableWidth > availableTableWidth;
    const tableFontSize = tableNeedsHorizontalBreak ? 5.8 : compactTable ? 6.5 : 8;
    const tableHeadFontSize = tableNeedsHorizontalBreak ? 6.2 : compactTable ? 7 : 8;
    const tableCellPadding = tableNeedsHorizontalBreak ? 2 : compactTable ? 3 : 5;
    const columnStyles = Object.fromEntries(
      columns.map((_, columnIndex) => [
        columnIndex,
        {
          cellWidth: columnWidths[columnIndex],
        },
      ]),
    );
    const imageMap = new Map<string, string>();

    if (sheet.media && previewColumnIndex >= 0) {
      const imageUrls = [
        ...new Set(
          safeRows
            .map((row) => repairText(String(resolveRowValueByKey(row, sheet.media?.imageUrlKey || "") || "")).trim())
            .filter(Boolean),
        ),
      ];
      for (const imageUrl of imageUrls) {
        const imageDataUrl = await loadImageDataUrl(imageUrl);
        if (imageDataUrl) imageMap.set(imageUrl, imageDataUrl);
      }
    }

    const noteLines = sheet.note
      ? doc.splitTextToSize(repairText(sheet.note), pageWidth - marginX * 2 - 20)
      : [];
    const minimumSectionHeight = 34 + (noteLines.length ? 28 + noteLines.length * 10 : 0) + 62;
    const needsNewPage = cursorY + minimumSectionHeight > pageHeight - 36;
    const sectionId = sheet.section?.id ?? null;
    const startsNewSection = Boolean(sectionId) && sectionId !== currentSectionId;
    const belongsToOpenSection = Boolean(sectionId) && sectionId === currentSectionId;

    if (
      (startsNewSection && (index > 0 || cursorY > 118)) ||
      (!belongsToOpenSection && index > 0 && !report.continuousSections) ||
      (needsNewPage && (index > 0 || cursorY > 118))
    ) {
      doc.addPage(report.orientation ?? "landscape");
      drawPageHeader(
        report.title,
        report.subtitle,
        repairText(sheet.section?.title || sheet.name),
      );
      cursorY = 118;
    }

    // Portada de la sección: una banda con el título de la orden y, debajo, sus
    // datos generales en formato informe.
    if (startsNewSection && sheet.section) {
      currentSectionId = sectionId;
      doc.setFillColor(31, 78, 120);
      doc.roundedRect(marginX, cursorY - 2, pageWidth - marginX * 2, 26, 6, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(repairText(sheet.section.title), marginX + 12, cursorY + 15);
      if (sheet.section.subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(
          repairText(sheet.section.subtitle),
          pageWidth - marginX - 12,
          cursorY + 15,
          { align: "right" },
        );
      }
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "normal");
      cursorY += 34;

      const info = sheet.section.info ?? [];
      if (info.length) {
        const pairsPerRow = (report.orientation ?? "landscape") === "portrait" ? 2 : 3;
        const infoBody: string[][] = [];
        for (let start = 0; start < info.length; start += pairsPerRow) {
          const slice = info.slice(start, start + pairsPerRow);
          const line: string[] = [];
          for (let position = 0; position < pairsPerRow; position += 1) {
            const item = slice[position];
            line.push(item ? repairText(item.label) : "");
            line.push(item ? repairText(String(formatValue(item.value))) : "");
          }
          infoBody.push(line);
        }
        const labelWidth = 78;
        const valueWidth = (pageWidth - marginX * 2 - labelWidth * pairsPerRow) / pairsPerRow;
        const infoColumnStyles: Record<number, any> = {};
        for (let position = 0; position < pairsPerRow; position += 1) {
          infoColumnStyles[position * 2] = {
            cellWidth: labelWidth,
            fontStyle: "bold",
            fillColor: [217, 234, 247],
            textColor: [91, 107, 123],
          };
          infoColumnStyles[position * 2 + 1] = { cellWidth: valueWidth };
        }
        autoTable(doc, {
          startY: cursorY,
          margin: { left: marginX, right: marginX, top: 118, bottom: 36 },
          theme: "grid",
          styles: {
            fontSize: 7.5,
            cellPadding: 4,
            overflow: "linebreak",
            valign: "middle",
            lineColor: [183, 201, 214],
          },
          columnStyles: infoColumnStyles,
          body: infoBody,
          didDrawPage: () => {
            drawPageHeader(
              report.title,
              report.subtitle,
              repairText(sheet.section?.title || sheet.name),
            );
          },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (!sectionId) {
      currentSectionId = null;
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
      margin: { left: marginX, right: marginX, top: 118, bottom: 36 },
      theme: "grid",
      horizontalPageBreak: tableNeedsHorizontalBreak,
      horizontalPageBreakRepeat: tableNeedsHorizontalBreak
        ? columns.length > 1
          ? [0, 1]
          : [0]
        : undefined,
      horizontalPageBreakBehaviour: "afterAllRows",
      rowPageBreak: "avoid",
      styles: {
        fontSize: tableFontSize,
        cellPadding: tableCellPadding,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [31, 78, 120],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: tableHeadFontSize,
      },
      bodyStyles: {
        textColor: [31, 41, 55],
        fontSize: tableFontSize,
        cellPadding: tableCellPadding,
        overflow: "linebreak",
        ...(sheet.minRowHeight ? { minCellHeight: sheet.minRowHeight } : {}),
      },
      alternateRowStyles: { fillColor: [247, 250, 252] },
      columnStyles,
      head: [columns.map((column) => repairText(column.header))],
      body: safeRows.map((row) =>
        columns.map((column) => repairText(String(formatValue(resolveColumnValue(row, column))))),
      ),
      didParseCell: (hookData: any) => {
        if (
          sheet.media &&
          hookData.section === "body" &&
          previewColumnIndex >= 0 &&
          hookData.column.index === previewColumnIndex
        ) {
          const row = safeRows[hookData.row.index] ?? {};
          const imageUrl = repairText(String(resolveRowValueByKey(row, sheet.media.imageUrlKey) || "")).trim();
          if (imageUrl) {
            hookData.cell.text = imageMap.has(imageUrl) ? [""] : ["Ver imagen"];
            hookData.cell.styles.minCellHeight = Math.max(sheet.media.rowHeight ?? 58, 58);
          }
        }
      },
      didDrawCell: (hookData: any) => {
        if (!sheet.media || hookData.section !== "body") return;
        const row = safeRows[hookData.row.index] ?? {};

        if (previewColumnIndex >= 0 && hookData.column.index === previewColumnIndex) {
          const imageUrl = repairText(String(resolveRowValueByKey(row, sheet.media.imageUrlKey) || "")).trim();
          const imageDataUrl = imageMap.get(imageUrl);
          if (imageDataUrl) {
            const padding = 4;
            const width = Math.max(12, hookData.cell.width - padding * 2);
            const height = Math.max(12, hookData.cell.height - padding * 2);
            doc.addImage(
              imageDataUrl,
              inferImageExtension(imageDataUrl, imageUrl).toUpperCase(),
              hookData.cell.x + padding,
              hookData.cell.y + padding,
              width,
              height,
              undefined,
              "FAST",
            );
          }
        }

        if (linkColumnIndex >= 0 && hookData.column.index === linkColumnIndex) {
          const linkUrl = repairText(String(resolveRowValueByKey(row, sheet.media.linkUrlKey || "") || "")).trim();
          if (linkUrl) {
            doc.link(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height, {
              url: linkUrl,
            });
          }
        }
      },
      didDrawPage: () => {
        drawPageHeader(
          report.title,
          report.subtitle,
          sheet.section?.title
            ? repairText(sheet.section.title)
            : index === 0
              ? "Reporte operativo"
              : repairText(sheet.name),
        );
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 12;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(91, 107, 123);
    doc.setFontSize(8);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
  }

  return doc.output("blob");
}

export async function downloadReportPdf(report: ReportDefinition) {
  const blob = await buildReportPdfBlob(report);
  saveBlob(blob, `${report.fileName}.pdf`);
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
    fileName: `indicadores_proceso_${formatDateForInput(new Date())}`,
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
    fileName: `procedimientos_mpg_${formatDateForInput(new Date())}`,
    title: "Reporte de procedimientos y plantillas",
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
    fileName: `analisis_lubricante_${formatDateForInput(new Date())}`,
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

function buildReportChartDataUrl(chart: ReportChart): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 420;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const points = chart.points
    .map((point) => ({
      label: repairText(String(point.label || "")),
      value: Number(point.value || 0),
    }))
    .filter((point) => Number.isFinite(point.value));

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1f4e78";
  context.fillRect(0, 0, canvas.width, 8);
  context.font = "bold 25px Arial";
  context.fillText(repairText(chart.title), 42, 48);
  context.fillStyle = "#5b6b7b";
  context.font = "15px Arial";
  if (chart.subtitle) context.fillText(repairText(chart.subtitle), 42, 74);

  if (!points.length) {
    context.fillStyle = "#f7fafc";
    context.fillRect(42, 102, 876, 250);
    context.fillStyle = "#5b6b7b";
    context.font = "18px Arial";
    context.textAlign = "center";
    context.fillText("Sin datos para graficar", canvas.width / 2, 235);
    return canvas.toDataURL("image/png");
  }

  const plot = { x: 76, y: 102, width: 842, height: 245 };
  const maximum = Math.max(...points.map((point) => point.value), 1);
  context.strokeStyle = "#d7e2ea";
  context.lineWidth = 1;
  context.font = "12px Arial";
  context.fillStyle = "#5b6b7b";
  context.textAlign = "right";
  for (let step = 0; step <= 4; step += 1) {
    const y = plot.y + (plot.height / 4) * step;
    const value = maximum * (1 - step / 4);
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
    context.fillText(value.toLocaleString("es-EC", { maximumFractionDigits: 2 }), plot.x - 10, y + 4);
  }

  const spacing = plot.width / Math.max(points.length, 1);
  if (chart.type === "bar") {
    const barWidth = Math.max(8, Math.min(54, spacing * 0.62));
    points.forEach((point, index) => {
      const height = (point.value / maximum) * plot.height;
      const x = plot.x + spacing * index + (spacing - barWidth) / 2;
      const y = plot.y + plot.height - height;
      const gradient = context.createLinearGradient(0, y, 0, plot.y + plot.height);
      gradient.addColorStop(0, "#2f6cab");
      gradient.addColorStop(1, "#8eb9df");
      context.fillStyle = gradient;
      context.fillRect(x, y, barWidth, height);
    });
  } else {
    context.strokeStyle = "#2f6cab";
    context.fillStyle = "#2f6cab";
    context.lineWidth = 4;
    context.beginPath();
    points.forEach((point, index) => {
      const x = plot.x + spacing * index + spacing / 2;
      const y = plot.y + plot.height - (point.value / maximum) * plot.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    points.forEach((point, index) => {
      const x = plot.x + spacing * index + spacing / 2;
      const y = plot.y + plot.height - (point.value / maximum) * plot.height;
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fill();
    });
  }

  const labelStride = Math.max(1, Math.ceil(points.length / 8));
  context.fillStyle = "#5b6b7b";
  context.font = "12px Arial";
  context.textAlign = "center";
  points.forEach((point, index) => {
    if (index % labelStride !== 0 && index !== points.length - 1) return;
    const x = plot.x + spacing * index + spacing / 2;
    const label = point.label.length > 18 ? `${point.label.slice(0, 16)}…` : point.label;
    context.fillText(label, x, plot.y + plot.height + 24);
  });
  context.textAlign = "right";
  context.font = "bold 13px Arial";
  context.fillStyle = "#1f4e78";
  if (chart.unit) context.fillText(repairText(chart.unit), plot.x + plot.width, 392);
  return canvas.toDataURL("image/png");
}

function buildReportChartAssets(report: ReportDefinition) {
  return (report.charts ?? [])
    .map((chart) => ({ chart, imageDataUrl: buildReportChartDataUrl(chart) }))
    .filter(
      (entry): entry is { chart: ReportChart; imageDataUrl: string } =>
        Boolean(entry.imageDataUrl),
    );
}

export function buildOilConsumptionReport(payload: {
  kpi: AnyRow;
  workOrders: AnyRow[];
  equipmentRows: AnyRow[];
  dailyRows: AnyRow[];
  warehouseRows: AnyRow[];
  statusRows: AnyRow[];
  unitLabel?: string;
  charts?: ReportChart[];
}) {
  const kpi = payload.kpi ?? {};
  const filters = kpi.filters ?? {};
  const totals = kpi.totals ?? {};
  const selectedProduct = kpi.selected_product ?? {};
  const unitLabel = String(payload.unitLabel || "gal").trim() || "gal";
  const productLabel = String(
    selectedProduct.label
      || [selectedProduct.codigo, selectedProduct.nombre].filter(Boolean).join(" - ")
      || "Sin aceite seleccionado",
  );
  const periodLabel = String(
    filters.label
      || [filters.from, filters.to].filter(Boolean).join(" a ")
      || "Sin período",
  );

  const workOrderRows = payload.workOrders.map((item) => ({
    fecha: item.fecha_referencia ?? item.fecha_referencia_label ?? "",
    orden: item.work_order_code ?? "",
    tipo_mantenimiento: item.maintenance_kind_label ?? item.maintenance_kind ?? "",
    equipo: item.equipment_label ?? "Sin equipo",
    cantidad: item.cantidad ?? 0,
    diferencia_anterior: item.diferencia_vs_anterior ?? "",
    costo_total: item.subtotal ?? 0,
    estado: item.work_order_status ?? "Sin estado",
    bodega: item.bodega_label ?? "Sin bodega",
  }));

  return {
    fileName: `reporte_consumo_aceite_${formatDateForInput(new Date())}`,
    title: "Reporte de análisis de consumo de aceite",
    subtitle: `${productLabel} · ${periodLabel}${filters.solo_cebado ? " · Solo OT de cebado" : ""}`,
    summary: [
      { label: "Aceite", value: productLabel },
      { label: "Período", value: periodLabel },
      { label: "Cantidad total", value: `${formatValue(totals.total_cantidad ?? 0)} ${unitLabel}` },
      { label: "Costo total", value: Number(totals.total_costo ?? 0) },
      { label: "Órdenes", value: Number(totals.total_ordenes ?? workOrderRows.length) },
      { label: "Equipos", value: Number(totals.total_equipos ?? payload.equipmentRows.length) },
      { label: "Promedio por OT", value: `${formatValue(totals.promedio_por_orden ?? 0)} ${unitLabel}` },
    ],
    charts: payload.charts,
    orientation: "landscape",
    sheets: [
      {
        name: "Detalle por orden de trabajo",
        rows: workOrderRows,
        fitColumnsToPage: true,
        emptyMessage: "No existen órdenes de trabajo para los filtros aplicados.",
        columns: [
          { key: "fecha", header: "Fecha", width: 12, format: "date" },
          { key: "orden", header: "OT", width: 12 },
          { key: "tipo_mantenimiento", header: "Tipo mtto.", width: 13 },
          { key: "equipo", header: "Equipo", width: 22 },
          { key: "cantidad", header: `Cantidad (${unitLabel})`, width: 12, format: "number" },
          { key: "diferencia_anterior", header: "Dif. anterior", width: 11, format: "number" },
          { key: "costo_total", header: "Costo total", width: 12, format: "currency" },
          { key: "estado", header: "Estado", width: 12 },
          { key: "bodega", header: "Bodega", width: 20 },
        ],
      },
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
    fileName: `componentes_criticos_${formatDateForInput(new Date())}`,
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
    fileName: `reporte_operacion_diaria_${formatDateForInput(new Date())}`,
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
    fileName: `cronograma_semanal_${formatDateForInput(new Date())}`,
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
    fileName: `dashboard_ejecutivo_${formatDateForInput(new Date())}`,
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
  title?: string;
  subtitle?: string;
  primarySheetName?: string;
  primaryNote?: string;
  fileName?: string;
}) {
  return {
    fileName: payload.fileName || `inventario_${formatDateForInput(new Date())}`,
    title: payload.title || "Reporte de inventario",
    subtitle: payload.subtitle || `Agrupado por ${payload.groupLabel.toLowerCase()}.`,
    summary: payload.summary,
    sheets: [
      {
        name: payload.primarySheetName || "Inventario",
        rows: payload.rows,
        note: payload.primaryNote || `Vista consolidada y agrupada por ${payload.groupLabel}.`,
        groupBy: ["agrupacion"],
      },
      ...(payload.movementRows?.length ? [{ name: "Kardex", rows: payload.movementRows }] : []),
    ],
  } satisfies ReportDefinition;
}

export function buildWarehouseReservationsReport(payload: {
  rows: AnyRow[];
  summary?: ReportSummaryItem[];
  title?: string;
  subtitle?: string;
  fileName?: string;
}) {
  const columns: ReportColumn[] = [
    { key: "tipo_registro", header: "Tipo de registro" },
    { key: "estado", header: "Estado de la reserva" },
    { key: "bodega_label", header: "Bodega" },
    { key: "producto_label", header: "Material" },
    { key: "work_order_label", header: "Orden de trabajo" },
    { key: "work_order_status", header: "Estado OT" },
    { key: "equipment_label", header: "Equipo" },
    { key: "cantidad_solicitada", header: "Cantidad reservada / solicitada", format: "number" },
    { key: "cantidad_entregada", header: "Cantidad entregada", format: "number" },
    { key: "cantidad_reservada_activa", header: "Reserva activa", format: "number" },
    { key: "cantidad_pendiente", header: "Pendiente por entregar", format: "number" },
    { key: "cantidad_liberada", header: "Cantidad liberada", format: "number" },
    { key: "observacion_menor_uso_reserva", header: "Motivo de menor uso" },
  ];

  return {
    fileName: payload.fileName || `reservas_bodega_${formatDateForInput(new Date())}`,
    title: payload.title || "Reporte de reservas de bodega",
    subtitle:
      payload.subtitle ||
      "Este reporte lista únicamente reservas de material por bodega (RESERVA DE MATERIAL); no representa un egreso de inventario ni un movimiento de Kardex.",
    summary: payload.summary,
    sheets: [
      {
        name: "Reservas de material",
        rows: payload.rows,
        columns,
        note: "Cada fila corresponde a una RESERVA DE MATERIAL y no representa un movimiento de inventario confirmado.",
      },
    ],
  } satisfies ReportDefinition;
}

export function buildWorkOrderReport(payload: {
  header: AnyRow;
  tasks: AnyRow[];
  attachments: AnyRow[];
  consumos: AnyRow[];
  issues: AnyRow[];
  scraps: AnyRow[];
  history: AnyRow[];
}) {
  const header = payload.header || {};
  const normalizedOrder: WorkOrdersListingOrder = {
    header: {
      codigo: header.code || header.codigo || "",
      titulo: header.title || header.titulo || "",
      estado: header.status_workflow || "",
      equipo: header.equipment_label || header.equipo_nombre || header.equipment_id || "",
      compartimiento:
        header.equipment_component_label ||
        header.equipo_componente_nombre_oficial ||
        "Sin compartimientos",
      tipo_mantenimiento: header.maintenance_kind || header.tipo_mantenimiento || "",
      clase_orden: header.emergency_label || "",
      motivo_emergencia: header.emergency_reason || "",
      procedimiento: header.procedimiento || "",
      plan_operativo: header.plan_operativo || "",
      fecha_programacion: header.fecha_programacion || "",
      fecha_operativa: header.fecha_operativa || "",
      horometro_actual: header.horometro_actual ?? "",
      horas_a_realizar: header.horas_a_realizar ?? "",
      alerta: header.alerta || "",
      causa: header.causa || "",
      accion: header.accion || "",
      prevencion: header.prevencion || "",
      creado_por: header.creado_por || "",
      fecha_creacion: header.fecha_creacion || "",
      realizado_por: header.realizado_por || "",
      fecha_realizacion: header.fecha_realizacion || "",
      aprobado_por: header.aprobado_por || "",
      fecha_aprobacion: header.fecha_aprobacion || "",
      accion_aprobacion: header.accion_aprobacion || "",
      ot_bloqueante: header.blocked_by || "",
      motivo_bloqueo: header.blocked_reason || "",
    },
    tasks: payload.tasks,
    attachments: payload.attachments,
    consumos: payload.consumos,
    issues: payload.issues,
    scraps: payload.scraps,
    history: payload.history,
  };
  const code = repairText(String(header.code || header.codigo || "sin_codigo"));
  return {
    fileName: `informe_ot_${code}`.replace(/\s+/g, "_"),
    title: `Informe de orden de trabajo ${code}`,
    subtitle: repairText(
      [
        header.equipment_label || header.equipo_nombre || header.equipment_id,
        formatCompartimientoSummary(
          header.equipment_component_label || header.equipo_componente_nombre_oficial,
        ),
        header.maintenance_kind || header.tipo_mantenimiento,
      ]
        .filter(Boolean)
        .join(" · "),
    ),
    orientation: "portrait",
    continuousSections: true,
    sheets: buildWorkOrderSectionSheets(normalizedOrder, 1, { single: true }),
  } satisfies ReportDefinition;
}

export type WorkOrdersListingOrder = {
  header: AnyRow;
  tasks: AnyRow[];
  attachments: AnyRow[];
  consumos: AnyRow[];
  issues: AnyRow[];
  scraps: AnyRow[];
  history: AnyRow[];
};

const WORK_ORDER_DETAIL_COLUMNS = {
  tasks: [
    { key: "plan", header: "Plan", width: 20 },
    { key: "tarea", header: "Tarea", width: 34 },
    { key: "valor_registrado", header: "Resultado", width: 28 },
    { key: "responsables", header: "Responsable", width: 22 },
    { key: "observacion", header: "Observación", width: 28 },
  ] satisfies ReportColumn[],
  attachments: [
    { key: "vista_previa", header: "Vista", width: 18 },
    { key: "nombre", header: "Evidencia", width: 34 },
    { key: "origen", header: "Origen", width: 32 },
    { key: "enlace", header: "Acceso", width: 16 },
  ] satisfies ReportColumn[],
  consumos: [
    { key: "material", header: "Material", width: 34 },
    { key: "bodega", header: "Bodega", width: 24 },
    { key: "reservado", header: "Solicitado", width: 13, format: "number" },
    { key: "emitido", header: "Entregado", width: 13, format: "number" },
    { key: "pendiente", header: "Pendiente", width: 13, format: "number" },
    { key: "observacion", header: "Observación", width: 26 },
  ] satisfies ReportColumn[],
  issues: [
    { key: "salida", header: "Salida", width: 16 },
    { key: "fecha", header: "Fecha", width: 17, format: "datetime" },
    { key: "material", header: "Material", width: 36 },
    { key: "cantidad", header: "Cantidad", width: 12, format: "number" },
    { key: "bodega", header: "Bodega", width: 26 },
  ] satisfies ReportColumn[],
  scraps: [
    { key: "transferencia", header: "Transferencia", width: 18 },
    { key: "fecha", header: "Fecha", width: 17, format: "datetime" },
    { key: "material", header: "Material", width: 36 },
    { key: "cantidad", header: "Cantidad", width: 12, format: "number" },
    { key: "bodega_chatarra", header: "Destino", width: 27 },
  ] satisfies ReportColumn[],
  history: [
    { key: "hacia", header: "Estado", width: 18 },
    { key: "usuario", header: "Usuario", width: 20 },
    { key: "fecha", header: "Fecha", width: 18, format: "datetime" },
    { key: "nota", header: "Nota", width: 44 },
  ] satisfies ReportColumn[],
};

function buildWorkOrderSectionSheets(
  order: WorkOrdersListingOrder,
  position: number,
  options: { single?: boolean } = {},
): ReportSheet[] {
  const header = order.header ?? {};
  const code = String(header.codigo || header.code || `OT-${position}`).trim();
  const title = String(header.titulo || header.title || "").trim();
  const formatActor = (user: unknown, date: unknown) =>
    [String(user || "").trim(), date ? String(formatValue(date)) : ""].filter(Boolean).join(" · ") || "-";
  const formatHorometer = () =>
    header.horometro_actual !== "" && header.horometro_actual != null
      ? `${formatValue(header.horometro_actual)} h`
      : "-";
  const info: ReportSummaryItem[] = [
    { label: "Orden", value: [code, title && title !== code ? title : ""].filter(Boolean).join(" - ") || "-" },
    { label: "Estado", value: header.estado || "-" },
    { label: "Equipo", value: header.equipo || "-" },
    {
      label: "Compartimientos",
      value: String(header.compartimiento || "").trim() || "Sin compartimientos",
    },
    { label: "Mantenimiento", value: header.tipo_mantenimiento || "-" },
    { label: "Clase", value: header.clase_orden || "-" },
    { label: "Horómetro OT", value: formatHorometer() },
    {
      label: "Horas de trabajo",
      value:
        header.horas_a_realizar !== "" && header.horas_a_realizar != null
          ? `${formatValue(header.horas_a_realizar)} horas-hombre`
          : "-",
    },
    {
      label: "Fecha operativa",
      value: header.fecha_programacion || header.fecha_operativa || "-",
    },
    { label: "Procedimiento", value: header.procedimiento || "-" },
    { label: "Plan operativo", value: header.plan_operativo || "-" },
    { label: "Registrada por", value: formatActor(header.creado_por, header.fecha_creacion) },
    { label: "Realizada por", value: formatActor(header.realizado_por, header.fecha_realizacion) },
    { label: "Aprobada por", value: formatActor(header.aprobado_por, header.fecha_aprobacion) },
    { label: "Causa", value: header.causa || "-" },
    { label: "Acción", value: header.accion || "-" },
    { label: "Prevención", value: header.prevencion || "-" },
  ];
  if (header.motivo_emergencia) {
    info.push({ label: "Motivo emergencia", value: header.motivo_emergencia });
  }
  if (header.ot_bloqueante || header.motivo_bloqueo) {
    info.push({
      label: "Bloqueo",
      value: [header.ot_bloqueante, header.motivo_bloqueo].filter(Boolean).join(" · ") || "-",
    });
  }
  const section: ReportSheetSection = {
    id: `orden_${position}_${code || position}`,
    title: options.single
      ? `Orden ${code || "Sin código"}`
      : `Orden ${position} · ${code || "Sin código"}`,
    subtitle: [title, header.equipo, header.estado].filter(Boolean).join(" · "),
    sheetName: options.single ? "Informe OT" : code ? `${position}. ${code}` : `Orden ${position}`,
    info,
    infoColumns: 2,
  };

  const detailSheets: ReportSheet[] = [
    {
      name: "Tareas ejecutadas",
      section,
      rows: order.tasks,
      fitColumnsToPage: true,
      columns: WORK_ORDER_DETAIL_COLUMNS.tasks,
    },
    {
      name: "Evidencias",
      section,
      rows: order.attachments,
      fitColumnsToPage: true,
      columns: WORK_ORDER_DETAIL_COLUMNS.attachments,
      media: {
        imageUrlKey: "media_url",
        previewColumnKey: "vista_previa",
        linkUrlKey: "url_visualizacion",
        linkColumnKey: "enlace",
        linkLabel: "Abrir evidencia",
        rowHeight: 72,
      },
    },
    {
      name: "Consumos",
      section,
      rows: order.consumos,
      fitColumnsToPage: true,
      columns: WORK_ORDER_DETAIL_COLUMNS.consumos,
    },
    {
      name: "Salidas de material",
      section,
      rows: order.issues,
      fitColumnsToPage: true,
      columns: WORK_ORDER_DETAIL_COLUMNS.issues,
    },
    {
      name: "Salidas a chatarra",
      section,
      rows: order.scraps,
      fitColumnsToPage: true,
      columns: WORK_ORDER_DETAIL_COLUMNS.scraps,
    },
    {
      name: "Histórico",
      section,
      rows: order.history,
      fitColumnsToPage: true,
      columns: WORK_ORDER_DETAIL_COLUMNS.history,
    },
  ];
  const populatedSheets = detailSheets.filter((sheet) => normalizeRows(sheet.rows).length > 0);
  if (populatedSheets.length) return populatedSheets;
  return [
    {
      name: "Resultado",
      section,
      rows: [{ resultado: "La orden no registra tareas, materiales ni evidencias adicionales." }],
      columns: [{ key: "resultado", header: "Resumen", width: 80 }],
      fitColumnsToPage: true,
    },
  ];
}

export function buildWorkOrdersListingReport(payload: {
  periodLabel?: string;
  maintenanceKindLabel?: string;
  generatedBy?: string | null;
  orders: WorkOrdersListingOrder[];
}) {
  const orders = payload.orders ?? [];
  const activeFilters = [
    payload.maintenanceKindLabel ? `Tipo: ${payload.maintenanceKindLabel}` : "",
    payload.periodLabel ? `Rango: ${payload.periodLabel}` : "",
  ].filter(Boolean);

  const totals = orders.reduce(
    (accumulator, order) => ({
      tasks: accumulator.tasks + (order.tasks?.length ?? 0),
      attachments: accumulator.attachments + (order.attachments?.length ?? 0),
      consumos: accumulator.consumos + (order.consumos?.length ?? 0),
      issues: accumulator.issues + (order.issues?.length ?? 0),
      scraps: accumulator.scraps + (order.scraps?.length ?? 0),
      history: accumulator.history + (order.history?.length ?? 0),
    }),
    { tasks: 0, attachments: 0, consumos: 0, issues: 0, scraps: 0, history: 0 },
  );

  const headerRows = orders.map((order) => {
    const header = order.header ?? {};
    const code = String(header.codigo || header.code || "").trim();
    const title = String(header.titulo || header.title || "").trim();
    return {
      orden: [code, title].filter(Boolean).join(" - ") || "-",
      equipo: header.equipo || "-",
      estado: header.estado || "-",
      mantenimiento: header.tipo_mantenimiento || "-",
      fecha_operativa: header.fecha_programacion || header.fecha_operativa || "",
    };
  });

  return {
    fileName: `ordenes_trabajo_${formatDateForInput(new Date())}`,
    title: "Informe consolidado de órdenes de trabajo",
    subtitle: activeFilters.length
      ? `Órdenes vigentes según filtros aplicados (excluye anuladas). ${activeFilters.join(" · ")}`
      : "Órdenes vigentes en el módulo al momento de la exportación (excluye anuladas).",
    generatedBy: payload.generatedBy ?? null,
    orientation: "portrait",
    summary: [
      { label: "Órdenes", value: orders.length },
      { label: "Tareas", value: totals.tasks },
      { label: "Adjuntos", value: totals.attachments },
      { label: "Consumos", value: totals.consumos },
      { label: "Salidas", value: totals.issues },
      { label: "Desechos", value: totals.scraps },
      { label: "Movimientos", value: totals.history },
    ],
    sheets: [
      {
        name: "Cabeceras OT",
        rows: headerRows,
        note: "Resumen de las órdenes incluidas; cada OT continúa con su informe y evidencias.",
        fitColumnsToPage: true,
        emptyMessage: "No hay órdenes vigentes para el filtro aplicado.",
        columns: [
          { key: "orden", header: "Orden", width: 38 },
          { key: "equipo", header: "Equipo", width: 28 },
          { key: "estado", header: "Estado", width: 17 },
          { key: "mantenimiento", header: "Mantenimiento", width: 20 },
          { key: "fecha_operativa", header: "Fecha operativa", width: 18, format: "date" },
        ],
      },
      ...orders.flatMap((order, index) => buildWorkOrderSectionSheets(order, index + 1)),
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
    fileName: `programacion_mensual_${formatDateForInput(new Date())}`,
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
    fileName: `programacion_semanal_${formatDateForInput(new Date())}`,
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
    fileName: `agenda_programaciones_${formatDateForInput(new Date())}`,
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

export function buildSystemReportsReport(payload: {
  filters?: AnyRow | null;
  summary?: ReportSummaryItem[];
  reports?: Record<string, AnyRow>;
}) {
  const filters = payload.filters ?? {};
  const reports = payload.reports ?? {};
  const from = String(filters.from || "").trim();
  const to = String(filters.to || "").trim();
  const bodegaLabel = String(filters.bodega_label || "").trim();
  const groupBy = String(filters.group_by || "OT").trim();
  const activeFilters = [
    from && to ? `Rango: ${from} a ${to}` : "",
    bodegaLabel ? `Bodega: ${bodegaLabel}` : "",
    groupBy ? `Agrupado por: ${groupBy}` : "",
  ].filter(Boolean);

  return {
    fileName: `reportes_sistema_${formatDateForInput(new Date())}`,
    title: "Reportes del sistema",
    subtitle: activeFilters.length
      ? activeFilters.join(" · ")
      : "Consolidado general de órdenes de trabajo e inventario.",
    summary: payload.summary ?? [],
    sheets: [
      {
        name: "Horas trabajadas",
        rows: Array.isArray(reports.horas_trabajadas?.rows)
          ? reports.horas_trabajadas.rows
          : [],
        note: "Horas registradas por orden, responsable o agrupación seleccionada.",
      },
      {
        name: "Costo mantenimiento",
        rows: Array.isArray(reports.costo_mantenimiento?.rows)
          ? reports.costo_mantenimiento.rows
          : [],
        note: "Costo total de materiales usados en órdenes de mantenimiento.",
      },
      {
        name: "Responsables OT",
        rows: Array.isArray(reports.responsables_ot?.rows)
          ? reports.responsables_ot.rows
          : [],
        note: "Responsables con horas registradas por orden de trabajo.",
      },
      {
        name: "Costo inventario",
        rows: Array.isArray(reports.costo_inventario?.rows)
          ? reports.costo_inventario.rows
          : [],
        note: "Snapshot actual valorizado del inventario por bodega o material.",
      },
      {
        name: "Repuestos cambiados",
        rows: Array.isArray(reports.repuestos_cambiados?.rows)
          ? reports.repuestos_cambiados.rows
          : [],
        note: "Materiales utilizados en equipos para órdenes de mantenimiento.",
      },
      {
        name: "Inventario consumido",
        rows: Array.isArray(reports.inventario_consumido?.rows)
          ? reports.inventario_consumido.rows
          : [],
        note: "Consumo consolidado de materiales por bodega, OT o agrupación activa.",
      },
    ],
  } satisfies ReportDefinition;
}

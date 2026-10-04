import { formatDateTime } from "@/app/utils/date-time";
import { HISTORY_ICONS } from "@/app/utils/work-order-history-icons";

type HistoryEvent = Record<string, any>;

function eventStyle(event: HistoryEvent) {
  const state = String(event.hacia || event.transicion || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/anul|cancel/.test(state)) return { icon: "cancelled", color: "DC2626", soft: "FEF2F2" } as const;
  if (/final|cerrad|closed/.test(state)) return { icon: "closed", color: "15803D", soft: "F0FDF4" } as const;
  if (/revision|review/.test(state)) return { icon: "review", color: "B45309", soft: "FFFBEB" } as const;
  if (/proceso|progress/.test(state)) return { icon: "process", color: "2563EB", soft: "EFF6FF" } as const;
  if (/plan/.test(state)) return { icon: "planned", color: "2563EB", soft: "EFF6FF" } as const;
  if (/bloque|block/.test(state)) return { icon: "blocked", color: "DC2626", soft: "FEF2F2" } as const;
  return { icon: "other", color: "64748B", soft: "F8FAFC" } as const;
}

/** Cards retain selectable text; only the state/account symbols are images. */
export function drawPdfHistoryTimeline(
  doc: any, events: HistoryEvent[], startY: number, margin: number,
  nextPage: () => void,
) {
  const width = doc.internal.pageSize.getWidth();
  const bottom = doc.internal.pageSize.getHeight() - 36;
  const top = 118;
  const axisX = margin + 12;
  const cardX = margin + 36;
  const cardWidth = width - margin - cardX;
  const contentWidth = cardWidth - 24;
  let y = startY;
  for (const [index, event] of events.entries()) {
    const style = eventStyle(event);
    const transition = event.desde && event.desde !== event.hacia ? String(event.transicion || `${event.desde} a ${event.hacia}`) : "";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const actorLines: string[] = doc.splitTextToSize(String(event.usuario || "Usuario sin registro"), contentWidth - 18);
    const detailLines: string[] = doc.splitTextToSize(String(event.nota || "Sin detalle adicional"), contentWidth);
    doc.setFontSize(8);
    const transitionLines: string[] = transition ? doc.splitTextToSize(transition, contentWidth) : [];
    const headerHeight = 40 + transitionLines.length * 11 + actorLines.length * 12;
    let offset = 0;
    do {
      const remainingHeight = headerHeight + (detailLines.length - offset) * 12 + 12;
      if (y + Math.min(remainingHeight, bottom - top) > bottom) {
        nextPage(); y = top;
      }
      const capacity = Math.max(1, Math.floor((bottom - y - headerHeight - 12) / 12));
      const chunk = detailLines.slice(offset, offset + capacity);
      const height = headerHeight + chunk.length * 12 + 12;
      doc.setDrawColor("#CBD5E1");
      doc.setLineWidth(1.2);
      doc.line(axisX, y, axisX, Math.min(bottom, y + height + (index < events.length - 1 ? 12 : 0)));
      doc.setFillColor("#FFFFFF");
      doc.setDrawColor("#CBD5E1");
      doc.setLineWidth(0.7);
      doc.roundedRect(cardX, y, cardWidth, height, 6, 6, "FD");
      doc.addImage(HISTORY_ICONS[style.icon], "PNG", axisX - 11, y + 10, 22, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const state = String(event.hacia || event.transicion || "Evento") + (offset ? " (continuación)" : "");
      const badgeWidth = Math.min(contentWidth, doc.getTextWidth(state) + 16);
      doc.setFillColor(`#${style.soft}`);
      doc.roundedRect(cardX + 12, y + 10, badgeWidth, 20, 3, 3, "F");
      doc.setTextColor(`#${style.color}`);
      doc.text(state, cardX + 20, y + 23);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor("#64748B");
      const timestamp = `Fecha y hora: ${formatDateTime(event.fecha) || "Sin registro"}`;
      doc.text(timestamp, cardX + cardWidth - 12, y + 23, { align: "right" });
      let contentY = y + 43;
      if (transitionLines.length) {
        doc.text(transitionLines, cardX + 12, contentY, { lineHeightFactor: 11 / 8 });
        contentY += transitionLines.length * 11;
      }
      doc.addImage(HISTORY_ICONS.account, "PNG", cardX + 10, contentY - 10, 15, 15);
      doc.setFontSize(9.5);
      doc.setTextColor("#334155");
      doc.text(actorLines, cardX + 30, contentY, { lineHeightFactor: 12 / 9.5 });
      contentY += actorLines.length * 12 + 5;
      doc.text(chunk, cardX + 12, contentY, { lineHeightFactor: 12 / 9.5 });
      offset += chunk.length;
      y += height + 12;
    } while (offset < detailLines.length);
  }
  return y;
}

/** Excel cards use native merged cells so names and notes remain editable. */
export function drawExcelHistoryTimeline(workbook: any, sheet: any, events: HistoryEvent[], startRow: number, lastColumn: number) {
  const images = new Map<string, number>();
  const imageId = (name: keyof typeof HISTORY_ICONS) => {
    if (!images.has(name)) images.set(name, workbook.addImage({ base64: HISTORY_ICONS[name], extension: "png" }));
    return images.get(name)!;
  };
  const columnPixels = (column: number) => Math.floor((sheet.getColumn(column).width || 12) * 7 + 5);
  const axisPixels = columnPixels(1);
  const cardPixels = Array.from({ length: lastColumn - 1 }, (_, index) => columnPixels(index + 2)).reduce((a, b) => a + b, 0);
  // Retain the widths of preceding tables in this OT's worksheet.
  const textColumns = Math.max(20, Math.floor((cardPixels - 32) / 6));
  let row = startRow;
  for (const event of events) {
    const first = row;
    const style = eventStyle(event);
    const state = String(event.transicion || event.hacia || "Evento");
    const timestamp = `Fecha y hora: ${formatDateTime(event.fecha) || "Sin registro"}`;
    const cellRow = (value: string, height: number, options: Record<string, any> = {}) => {
      sheet.mergeCells(row, 2, row, lastColumn);
      const cell = sheet.getCell(row, 2);
      // Explicit spacing also survives viewers that do not render Excel's indent attribute.
      const padding = "\u00A0".repeat(options.account ? 9 : 3);
      cell.value = value.split("\n").map(line => padding + line).join("\n");
      cell.font = { name: "Arial", size: 10, color: { argb: "FF334155" }, ...options.font };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${options.soft || "FFFFFF"}` } };
      cell.alignment = { vertical: "middle", wrapText: true };
      sheet.getRow(row).height = height;
      cell.border = {
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
        ...(row === first ? { top: { style: "thin", color: { argb: "FFCBD5E1" } } } : {}),
      };
      row += 1;
      return cell;
    };
    const split = lastColumn >= 4 ? Math.max(2, Math.floor(lastColumn * .6)) : lastColumn;
    if (split < lastColumn) {
      sheet.mergeCells(row, 2, row, split);
      sheet.mergeCells(row, split + 1, row, lastColumn);
      const label = sheet.getCell(row, 2);
      label.value = "\u00A0".repeat(3) + state;
      label.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${style.color}` } };
      const time = sheet.getCell(row, split + 1);
      time.value = timestamp + "\u00A0".repeat(3);
      time.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
      time.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
      label.alignment = { vertical: "middle", wrapText: true };
      const labelWidth = Array.from({ length: split - 1 }, (_, i) => columnPixels(i + 2)).reduce((a, b) => a + b, 0);
      const timeWidth = cardPixels - labelWidth;
      sheet.getRow(row).height = Math.max(32, Math.ceil(state.length * 6 / Math.max(1, labelWidth - 20)) * 14 + 10, Math.ceil(timestamp.length * 5 / Math.max(1, timeWidth - 20)) * 12 + 10);
      for (const cell of [label, time]) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${style.soft}` } };
        cell.border = { top: { style: "thin", color: { argb: "FFCBD5E1" } } };
      }
      label.border = { ...label.border, left: { style: "thin", color: { argb: "FFCBD5E1" } } };
      time.border = { ...time.border, right: { style: "thin", color: { argb: "FFCBD5E1" } } };
      row += 1;
    } else {
      cellRow(`${state}\n${timestamp}`, 42, { soft: style.soft, font: { bold: true, color: { argb: `FF${style.color}` } } });
    }
    const actorRow = row;
    const actor = String(event.usuario || "Usuario sin registro");
    cellRow(actor, Math.max(27, Math.ceil(actor.length / Math.max(10, textColumns - 6)) * 14 + 10), { account: true });
    sheet.addImage(imageId("account"), {
      tl: { nativeCol: 1, nativeColOff: 7 * 9525, nativeRow: actorRow - 1, nativeRowOff: 7 * 9525 },
      ext: { width: 17, height: 17 }, editAs: "oneCell",
    });
    // Split exceptionally long notes across native rows rather than clipping at Excel's row-height limit.
    const detail = String(event.nota || "Sin detalle adicional");
    const lines = detail.split(/\n/).flatMap(line => {
      const words = line.split(/\s+/); const wrapped: string[] = []; let current = "";
      for (const word of words) {
        if (current && current.length + word.length + 1 > textColumns) { wrapped.push(current); current = ""; }
        current += (current ? " " : "") + word;
      }
      wrapped.push(current); return wrapped;
    });
    let lastCell: any;
    for (let i = 0; i < lines.length; i += 18) {
      const chunk = lines.slice(i, i + 18);
      lastCell = cellRow(chunk.join("\n"), Math.max(32, chunk.length * 15 + 14));
    }
    lastCell.border = { ...lastCell.border, bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
    sheet.getRow(row).height = 12;
    const height = Array.from({ length: row - first + 1 }, (_, i) => (sheet.getRow(first + i).height || 15) * 4 / 3).reduce((a, b) => a + b, 0);
    const anchor = { nativeCol: 0, nativeColOff: (axisPixels - 20) * 9525, nativeRow: first - 1, nativeRowOff: 0 };
    sheet.addImage(imageId("line"), { tl: anchor, ext: { width: 2, height }, editAs: "oneCell" });
    sheet.addImage(imageId(style.icon), {
      tl: { ...anchor, nativeColOff: (axisPixels - 31) * 9525, nativeRowOff: 7 * 9525 },
      ext: { width: 24, height: 24 }, editAs: "oneCell",
    });
    row += 1;
  }
  return row + 1;
}

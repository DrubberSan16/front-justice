import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";

/**
 * Informe de una orden de trabajo en PDF.
 *
 * Recibe el detalle ya resuelto por la pantalla (responsables, materiales,
 * aceite y auditoria) en vez de volver a pedirlo: quien abre el informe ya
 * tiene los datos a la vista, y rearmarlos aqui abriria la puerta a que el PDF
 * y la pantalla cuenten cosas distintas.
 */
export type WorkOrderReportResponsible = {
  label: string;
  hours: number;
};

export type WorkOrderReportMaterial = {
  label: string;
  delivered: number;
  scrapped: number;
};

export type WorkOrderReportData = {
  code: string;
  title: string;
  equipmentLabel: string;
  statusLabel: string;
  maintenanceKindLabel: string;
  openedAt: string;
  closedAt: string;
  horometroAnterior: string;
  horometroActual: string;
  totalHours: number;
  totalCost: string;
  responsables: WorkOrderReportResponsible[];
  materiales: WorkOrderReportMaterial[];
  oilQuantity: number;
  oilCost: string;
  oilDelivered: boolean;
  createdBy: string;
  processedBy: string;
  updatedBy: string;
};

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatNumber(value: unknown, digits = 2) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function workOrderReportFileName(data: WorkOrderReportData) {
  const code = safeText(data.code, "orden_trabajo").replace(/[^\w.-]+/g, "_");
  return `informe_${code}.pdf`;
}

export async function buildWorkOrderReportPdfBlob(
  data: WorkOrderReportData,
): Promise<Blob> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const logoAsset = await getCompanyLogoAsset();

  const pageWidth = doc.internal.pageSize.getWidth();
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
  doc.text("Informe de orden de trabajo", rightX, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(safeText(data.code), rightX, 60, { align: "right" });

  let cursorY = 88;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(safeText(data.title, "Orden sin título"), marginLeft, cursorY);
  cursorY += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(safeText(data.equipmentLabel, "Sin equipo"), marginLeft, cursorY);
  cursorY += 18;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [31, 61, 122], textColor: 255, fontStyle: "bold" },
    head: [["Estado", "Tipo", "Abierta", "Finalizada"]],
    body: [
      [
        safeText(data.statusLabel),
        safeText(data.maintenanceKindLabel),
        safeText(data.openedAt),
        safeText(data.closedAt),
      ],
    ],
  });
  cursorY = (doc as any).lastAutoTable.finalY + 12;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [31, 61, 122], textColor: 255, fontStyle: "bold" },
    head: [["Horómetro inicial", "Horómetro final", "Horas - hombre", "Costo total"]],
    body: [
      [
        safeText(data.horometroAnterior),
        safeText(data.horometroActual),
        `${formatNumber(data.totalHours)} h`,
        safeText(data.totalCost),
      ],
    ],
  });
  cursorY = (doc as any).lastAutoTable.finalY + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Responsables", marginLeft, cursorY);
  cursorY += 6;
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: [["Responsable", "Horas"]],
    body: data.responsables.length
      ? data.responsables.map((row) => [
          safeText(row.label),
          `${formatNumber(row.hours)} h`,
        ])
      : [["No hay horas registradas.", "-"]],
    columnStyles: { 1: { halign: "right", cellWidth: 90 } },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Materiales cambiados", marginLeft, cursorY);
  cursorY += 6;
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: [["Material", "Nuevo entregado", "Viejo a chatarra", "Estado"]],
    body: data.materiales.length
      ? data.materiales.map((row) => [
          safeText(row.label),
          formatNumber(row.delivered),
          formatNumber(row.scrapped),
          row.delivered > 0 && row.scrapped > 0 ? "Flujo completo" : "Revisar",
        ])
      : [["No hay materiales registrados.", "-", "-", "-"]],
    columnStyles: {
      1: { halign: "right", cellWidth: 84 },
      2: { halign: "right", cellWidth: 84 },
      3: { cellWidth: 78 },
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Aceite", marginLeft, cursorY);
  cursorY += 6;
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: [["Usado en esta orden", "Entregado por bodega", "Costo"]],
    body: [
      [
        `${formatNumber(data.oilQuantity)} gal`,
        data.oilDelivered ? "Sí" : "No registrado",
        safeText(data.oilCost),
      ],
    ],
  });
  cursorY = (doc as any).lastAutoTable.finalY + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Registro de la orden", marginLeft, cursorY);
  cursorY += 6;
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginLeft, right: marginRight },
    tableWidth: usableWidth,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    head: [["Creada por", "Iniciada o procesada por", "Última edición por"]],
    body: [
      [
        safeText(data.createdBy, "Sin registro"),
        safeText(data.processedBy, "Sin registro"),
        safeText(data.updatedBy, "Sin registro"),
      ],
    ],
  });

  const generatedAt = new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      `Generado el ${generatedAt}`,
      marginLeft,
      doc.internal.pageSize.getHeight() - 20,
    );
    doc.text(
      `Página ${page} de ${pageCount}`,
      rightX,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" },
    );
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export async function downloadWorkOrderReportPdf(data: WorkOrderReportData) {
  const blob = await buildWorkOrderReportPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = workOrderReportFileName(data);
  anchor.click();
  URL.revokeObjectURL(url);
}

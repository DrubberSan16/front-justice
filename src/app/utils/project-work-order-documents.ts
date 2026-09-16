import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";
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
 * normal— para que el PDF y la vista no puedan contar cosas distintas.
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

export function projectWorkOrderReportFileName(data: ProjectWorkOrderReportData) {
  const code = safeText(data.code, "ot_proyecto").replace(/[^\w.-]+/g, "_");
  return `proyecto_${code}.pdf`;
}

export async function buildProjectWorkOrderReportPdfBlob(
  data: ProjectWorkOrderReportData,
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

  /** Bloque de texto con titulo, que salta de pagina si no cabe. */
  const writeParagraph = (title: string, body: string) => {
    const lines = doc.splitTextToSize(safeText(body, "Sin detalle"), usableWidth);
    const blockHeight = 18 + lines.length * 11;
    if (cursorY + blockHeight > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      cursorY = 60;
    }
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

  writeParagraph("Objetivo general", data.objetivoGeneral);
  writeList("Objetivos específicos", data.objetivosEspecificos);
  writeParagraph("Metodología aplicable", data.metodologia);
  writeList("Alcance del proyecto", data.alcance);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Lugar de ejecución", marginLeft, cursorY);
  cursorY += 6;
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Contratación de personal", marginLeft, cursorY);
  cursorY += 6;
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
    const total = data.personal.reduce(
      (acc, row) => acc + row.diasLaborados * row.valorDia,
      0,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Total mano de obra: ${formatNumber(total)}`, rightX, cursorY + 8, {
      align: "right",
    });
    cursorY += 16;
  }
  cursorY += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Materiales utilizados", marginLeft, cursorY);
  cursorY += 6;
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Registro del proyecto", marginLeft, cursorY);
  cursorY += 6;
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

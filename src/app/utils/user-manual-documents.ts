import type { UserManualDefinition } from "@/app/config/user-manual";
import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";
import type { ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";

export type UserManualDocumentContext = {
  manuals: UserManualDefinition[];
  userLabel: string;
  roleLabel: string;
  generatedAt?: Date;
  isChecklistChecked?: (manual: UserManualDefinition, index: number) => boolean;
};

function text(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slug(value: string) {
  return text(value || "manual")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "manual";
}

function sortedFields(manual: UserManualDefinition) {
  return [...manual.fields].sort((left, right) => Number(right.required) - Number(left.required));
}

function listText(items: string[], fallback = "No aplica") {
  const values = items.map(text).filter(Boolean);
  return values.length ? values.join("\n") : fallback;
}

function generatedAtLabel(value: Date) {
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function moduleGroups(manuals: UserManualDefinition[]) {
  const groups = new Map<string, UserManualDefinition[]>();
  for (const manual of manuals) {
    const category = manual.category || "General";
    groups.set(category, [...(groups.get(category) ?? []), manual]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "es"));
}

export function buildUserManualExcelReport(
  context: UserManualDocumentContext,
): ReportDefinition {
  const { manuals, userLabel, roleLabel } = context;
  const generatedAt = context.generatedAt ?? new Date();
  const completedManuals = manuals.filter((manual) =>
    manual.checklist.every((_, index) => context.isChecklistChecked?.(manual, index)),
  ).length;

  return {
    fileName: `manual_usuario_${slug(roleLabel)}_${generatedAt.toISOString().slice(0, 10)}`,
    title: "Manual de usuario KPI Justice",
    subtitle: `Guía paso a paso para ${text(userLabel)}. Incluye únicamente los procesos disponibles para su perfil.`,
    generatedAt: generatedAt.toISOString(),
    summary: [
      { label: "Usuario", value: text(userLabel) },
      { label: "Perfil", value: text(roleLabel) },
      { label: "Procesos incluidos", value: manuals.length },
      { label: "Guías completadas", value: completedManuals },
    ],
    sheets: [
      {
        name: "Ruta de trabajo",
        note: "Sigue los pasos en el orden indicado. La columna Verifica antes de avanzar ayuda a prevenir errores.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.flow.map((step, index) => ({
            modulo: manual.title,
            categoria: manual.category,
            paso: index + 1,
            accion: step.title,
            que_hacer: step.description,
            elementos_a_usar: step.fields.join(" | ") || "No aplica",
            verifica_antes_de_avanzar: step.checks.join(" | ") || "Continúa con el siguiente paso",
          })),
        ),
      },
      {
        name: "Antes de empezar",
        note: "Si falta alguno de estos puntos, completa primero el proceso de origen.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.prerequisites.map((item, index) => ({
            modulo: manual.title,
            categoria: manual.category,
            orden: index + 1,
            requisito_previo: item,
          })),
        ),
      },
      {
        name: "Datos a completar",
        note: "Los datos obligatorios deben completarse antes de guardar. Las indicaciones explican cómo utilizarlos.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          sortedFields(manual).map((field) => ({
            modulo: manual.title,
            categoria: manual.category,
            dato: field.label,
            es_obligatorio: field.required ? "Sí" : "No",
            como_completarlo: field.note,
          })),
        ),
      },
      {
        name: "Solución de problemas",
        note: "Identifica qué ocurre, revisa el proceso anterior y aplica la solución recomendada.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.commonErrors.map((issue) => ({
            modulo: manual.title,
            categoria: manual.category,
            inconveniente: issue.title,
            que_ocurre: issue.whatHappens,
            por_que_ocurre: issue.why,
            como_resolverlo: issue.howToResolve,
          })),
        ),
      },
      {
        name: "Verificación final",
        note: "Utiliza esta lista para confirmar que el proceso quedó completo y listo para el siguiente paso.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.checklist.map((item, index) => ({
            modulo: manual.title,
            categoria: manual.category,
            estado: context.isChecklistChecked?.(manual, index) ? "Completado" : "Pendiente",
            verificacion: item,
          })),
        ),
      },
    ],
    orientation: "landscape",
  };
}

export async function buildUserManualPdfBlob(context: UserManualDocumentContext) {
  const { manuals } = context;
  const generatedAt = context.generatedAt ?? new Date();
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default as any;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const companyLogoAsset = await getCompanyLogoAsset();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  const headerTop = 82;
  const bottomLimit = pageHeight - 58;

  function drawHeader() {
    doc.setFillColor(31, 78, 120);
    doc.rect(0, 0, pageWidth, 56, "F");
    doc.setFillColor(244, 177, 131);
    doc.rect(0, 56, pageWidth, 4, "F");
    drawPdfCompanyLogo(doc, companyLogoAsset, {
      marginX,
      y: 12,
      maxWidth: 94,
      maxHeight: 28,
    });
    const headerTextX = marginX + (companyLogoAsset ? 110 : 0);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("KPI Justice", headerTextX, 32);
    doc.setFont("helvetica", "normal");
    doc.text("Guía de trabajo paso a paso", pageWidth - marginX, 32, { align: "right" });
    doc.setTextColor(31, 41, 55);
  }

  function ensureSpace(y: number, needed = 64) {
    if (y + needed <= bottomLimit) return y;
    doc.addPage();
    drawHeader();
    return headerTop;
  }

  function sectionTitle(title: string, y: number) {
    y = ensureSpace(y, 42);
    doc.setFillColor(236, 244, 251);
    doc.roundedRect(marginX, y - 15, contentWidth, 28, 6, 6, "F");
    doc.setTextColor(31, 78, 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(text(title), marginX + 10, y + 3);
    doc.setTextColor(31, 41, 55);
    return y + 25;
  }

  function paragraph(value: unknown, y: number, fontSize = 9) {
    const clean = text(value);
    if (!clean) return y;
    const lines = doc.splitTextToSize(clean, contentWidth);
    y = ensureSpace(y, lines.length * (fontSize + 4));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(31, 41, 55);
    doc.text(lines, marginX, y);
    return y + lines.length * (fontSize + 4) + 8;
  }

  function table(startY: number, head: string[], body: Array<Array<string | number>>) {
    const widthSets: Record<number, number[]> = {
      2: [108, contentWidth - 108],
      3: [118, 76, contentWidth - 194],
      4: [108, 124, 124, contentWidth - 356],
      5: [28, 82, 142, 98, contentWidth - 350],
    };
    const widths = widthSets[head.length];
    autoTable(doc, {
      startY,
      head: [head.map(text)],
      body: body.map((row) => row.map((cell) => text(cell))),
      theme: "grid",
      tableWidth: contentWidth,
      margin: { left: marginX, right: marginX, top: headerTop, bottom: 58 },
      rowPageBreak: "auto",
      styles: {
        font: "helvetica",
        fontSize: 7.6,
        cellPadding: 5.5,
        lineColor: [183, 201, 214],
        lineWidth: 0.25,
        valign: "top",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [31, 78, 120],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [247, 250, 252] },
      columnStyles: widths
        ? Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth }]))
        : undefined,
      didDrawPage: drawHeader,
    });
    return ((doc as any).lastAutoTable?.finalY ?? startY) + 18;
  }

  doc.setFillColor(31, 78, 120);
  doc.rect(0, 0, pageWidth, 174, "F");
  doc.setFillColor(244, 177, 131);
  doc.rect(0, 174, pageWidth, 6, "F");
  drawPdfCompanyLogo(doc, companyLogoAsset, {
    marginX,
    y: 24,
    maxWidth: 150,
    maxHeight: 46,
  });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Guía de Usuario", marginX, 96);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Procesos explicados paso a paso, con requisitos y soluciones", marginX, 122);
  doc.text("KPI Justice", marginX, 146);

  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Tu guía personalizada", marginX, 212);
  autoTable(doc, {
    startY: 230,
    body: [
      ["Usuario", text(context.userLabel)],
      ["Perfil de trabajo", text(context.roleLabel)],
      ["Generado", generatedAtLabel(generatedAt)],
      ["Procesos incluidos", manuals.length],
      ["Contenido", "Se muestran únicamente los procesos disponibles para este usuario."],
    ],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 7, lineColor: [183, 201, 214] },
    columnStyles: {
      0: { fillColor: [217, 234, 247], fontStyle: "bold", cellWidth: 150 },
      1: { cellWidth: contentWidth - 150 },
    },
  });
  let y = ((doc as any).lastAutoTable?.finalY ?? 304) + 28;
  y = sectionTitle("Cómo utilizar esta guía", y);
  paragraph(
    "Busca el proceso que deseas realizar, confirma primero los requisitos, sigue los pasos en orden y utiliza la sección de solución de problemas cuando el sistema no te permita continuar. Finaliza marcando la lista de verificación.",
    y,
    10,
  );

  doc.addPage();
  drawHeader();
  y = sectionTitle("Índice general", headerTop);
  y = paragraph(
    "Los procesos están agrupados por área de trabajo. Cada capítulo explica para qué sirve, qué debe existir antes, qué información completar, errores frecuentes y cómo confirmar que todo quedó listo.",
    y,
  );
  for (const [category, items] of moduleGroups(manuals)) {
    y = sectionTitle(category, y + 6);
    for (const manual of items) {
      y = ensureSpace(y, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(`- ${text(manual.title)}`, marginX + 10, y);
      y += 16;
    }
  }

  manuals.forEach((manual, manualIndex) => {
    doc.addPage();
    drawHeader();
    let moduleY = sectionTitle(`${manualIndex + 1}. ${manual.title}`, headerTop);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(91, 107, 123);
    doc.text(`Área: ${text(manual.category)}`, marginX, moduleY);
    moduleY += 18;
    moduleY = paragraph(manual.summary, moduleY, 9);

    moduleY = sectionTitle("¿Para qué sirve?", moduleY + 4);
    moduleY = paragraph(manual.purpose, moduleY, 9);

    moduleY = sectionTitle("Antes de empezar", moduleY + 4);
    moduleY = paragraph(listText(manual.prerequisites), moduleY, 9);

    moduleY = sectionTitle("Ruta recomendada", moduleY + 4);
    moduleY = table(
      moduleY,
      ["No.", "Paso", "Qué hacer", "Lo que vas a usar", "Verifica antes de avanzar"],
      manual.flow.map((step, index) => [
        index + 1,
        step.title,
        step.description,
        listText(step.fields),
        listText(step.checks),
      ]),
    );

    moduleY = sectionTitle("Información que debes completar", moduleY + 4);
    moduleY = table(
      moduleY,
      ["Dato", "Obligatorio", "Cómo completarlo"],
      sortedFields(manual).map((field) => [
        field.label,
        field.required ? "Sí" : "No",
        field.note,
      ]),
    );

    moduleY = sectionTitle("Recomendaciones y cuidados", moduleY + 4);
    moduleY = table(
      moduleY,
      ["Tipo", "Detalle"],
      [
        ...manual.tips.map((item) => ["Recomendación", item]),
        ...manual.warnings.map((item) => ["Cuidado", item]),
      ],
    );

    moduleY = sectionTitle("Si el proceso no te deja continuar", moduleY + 4);
    moduleY = table(
      moduleY,
      ["Inconveniente", "Qué ocurre", "Por qué ocurre", "Cómo resolverlo"],
      manual.commonErrors.map((issue) => [
        issue.title,
        issue.whatHappens,
        issue.why,
        issue.howToResolve,
      ]),
    );

    moduleY = sectionTitle("Verificación final", moduleY + 4);
    table(
      moduleY,
      ["Estado", "Verificación"],
      manual.checklist.map((item, index) => [
        context.isChecklistChecked?.(manual, index) ? "Completado" : "Pendiente",
        item,
      ]),
    );
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(183, 201, 214);
    doc.line(48, pageHeight - 36, pageWidth - 48, pageHeight - 36);
    doc.setTextColor(91, 107, 123);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Guía de usuario KPI Justice", 48, pageHeight - 20);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 48, pageHeight - 20, { align: "right" });
  }

  return doc.output("blob");
}

export function userManualFileName(roleLabel: string, generatedAt = new Date()) {
  return `manual_usuario_${slug(roleLabel)}_${generatedAt.toISOString().slice(0, 10)}`;
}

import * as XLSX from "xlsx";

type AnyRow = Record<string, any>;

export type ReportSummaryItem = {
  label: string;
  value: string | number;
};

export type ReportSheet = {
  name: string;
  rows: AnyRow[];
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

function prettifyLabel(value: string) {
  return String(value || "")
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
  return String(value);
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

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadReportExcel(report: ReportDefinition) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of report.sheets) {
    const rows = normalizeRows(sheet.rows);
    const safeRows = rows.length ? rows : [{ Estado: "Sin registros disponibles" }];
    const worksheet = XLSX.utils.json_to_sheet(safeRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
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

  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  let cursorY = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.title, marginX, cursorY);
  cursorY += 18;

  if (report.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const subtitleLines = doc.splitTextToSize(report.subtitle, doc.internal.pageSize.getWidth() - marginX * 2);
    doc.text(subtitleLines, marginX, cursorY);
    cursorY += subtitleLines.length * 12;
  }

  doc.setFontSize(9);
  doc.setTextColor(90, 103, 122);
  doc.text(
    `Generado: ${report.generatedAt ? new Date(report.generatedAt).toLocaleString() : new Date().toLocaleString()}`,
    marginX,
    cursorY + 6,
  );
  doc.setTextColor(16, 32, 51);
  cursorY += 24;

  if (report.summary?.length) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: { fillColor: [22, 78, 99] },
      styles: { fontSize: 9, cellPadding: 6 },
      head: [["Indicador", "Valor"]],
      body: report.summary.map((item) => [item.label, formatValue(item.value)]),
    });
    cursorY = (doc as any).lastAutoTable.finalY + 18;
  }

  for (const [index, sheet] of report.sheets.entries()) {
    const rows = normalizeRows(sheet.rows);
    const safeRows = rows.length ? rows : [{ Estado: "Sin registros disponibles" }];
    const columns = collectColumns(safeRows);

    if (cursorY > pageHeight - 160 || index > 0) {
      doc.addPage();
      cursorY = 42;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(sheet.name, marginX, cursorY);
    cursorY += 10;

    autoTable(doc, {
      startY: cursorY + 8,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: { fillColor: [31, 75, 122] },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      head: [columns],
      body: safeRows.map((row) => columns.map((column) => formatValue(row[column]))),
    });

    cursorY = (doc as any).lastAutoTable.finalY + 16;
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
      { name: "Indicadores", rows: kpis },
      { name: "Distribucion", rows: breakdown },
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
      { name: "Procedimientos", rows: procedureRows },
      { name: "Actividades", rows: activityRows },
    ],
  } satisfies ReportDefinition;
}

export function buildLubricantReport(analyses: AnyRow[]) {
  const analysisRows = analyses.map((item) => ({
    codigo: item.codigo,
    cliente: item.cliente ?? "",
    equipo: item.equipo_codigo ?? item.equipo_nombre ?? "",
    compartimento_principal: item.compartimento_principal ?? "",
    fecha_muestra: item.fecha_muestra ?? "",
    fecha_reporte: item.fecha_reporte ?? "",
    estado_diagnostico: item.estado_diagnostico ?? "",
    diagnostico: item.diagnostico ?? "",
  }));

  const detailRows = analyses.flatMap((item) =>
    (item.detalles ?? []).map((detail: AnyRow) => ({
      analisis_codigo: item.codigo,
      equipo: item.equipo_codigo ?? item.equipo_nombre ?? "",
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
    title: "Reporte de analisis de lubricante",
    subtitle: "Resultados, tendencias y detalle por compartimento para monitoreo predictivo.",
    summary: [
      { label: "Analisis cargados", value: analysisRows.length },
      { label: "Casos en alerta", value: alerts },
      { label: "Parametros evaluados", value: detailRows.length },
    ],
    sheets: [
      { name: "Analisis", rows: analysisRows },
      { name: "Detalle", rows: detailRows },
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
    title: "Reporte de control de componentes criticos",
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
    title: "Reporte de operacion diaria",
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
    subtitle: "Planificacion semanal por frente, area responsable y equipo asociado.",
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

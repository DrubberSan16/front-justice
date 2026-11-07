import type { ReportDefinition } from "./maintenance-intelligence-reports";

/** Un PDF individual no debe heredar gráficos ni totales de otras secciones. */
export function selectReportSection(report: ReportDefinition, index: number): ReportDefinition {
  if (index === -1) return report;
  if (index === -2) return { ...report, fileName: `${report.fileName}_resumen`, title: `${report.title} · Resumen`, sheets: [] };
  const sheet = report.sheets[index];
  if (!sheet) throw new Error("Selecciona un reporte para imprimir.");
  return { ...report, title: sheet.name, fileName: `${report.fileName}_${index + 1}`, summary: [], charts: [], sheets: [sheet] };
}

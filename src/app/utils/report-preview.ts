import {
  buildReportExcelBlob,
  buildReportPdfBlob,
  type ReportDefinition,
} from "@/app/utils/maintenance-intelligence-reports";
import { useExcelPreview } from "@/app/utils/excel-preview";
import { usePdfPreview } from "@/app/utils/pdf-preview";
import { reactive } from "vue";
import { selectReportSection } from "./report-section-selection";

/**
 * Previsualizacion de un reporte en sus dos formatos.
 *
 * Todas las pantallas arman el mismo `ReportDefinition` y luego lo mandaban a
 * descargar. Aqui ese mismo objeto se muestra primero — el PDF en su visor y
 * el Excel como tabla — y descargar pasa a ser una decision.
 *
 * Se junta PDF y Excel en un solo control para que una vista no tenga que
 * declarar dos composables, dos dialogos y dos manejadores de descarga cada
 * vez que agrega un boton de exportar.
 */
export type ReportPreviewFormat = "pdf" | "excel";

export function useReportPreview(defaults?: { title?: string }) {
  const pdf = usePdfPreview({ title: defaults?.title });
  const excel = useExcelPreview({ title: defaults?.title });
  let currentReport: ReportDefinition | null = null;
  let pendingReport: ReportDefinition | null = null;
  const selection = reactive({ visible: false, index: 0, title: "", options: [] as { title: string; value: number }[] });

  async function open(format: ReportPreviewFormat, report: ReportDefinition) {
    if (format === "pdf" && report.sheets.length > 1) {
      pendingReport = report;
      selection.title = report.title;
      selection.index = 0;
      selection.options = [
        ...report.sheets.map((sheet, value) => ({ title: sheet.name, value })),
        ...((report.summary?.length || report.charts?.length) ? [{ title: "Solo resumen y gráficos", value: -2 }] : []),
        { title: "Informe completo (todos los reportes)", value: -1 },
      ];
      selection.visible = true;
      return;
    }
    return render(format, report);
  }

  async function confirmSelection() {
    if (!pendingReport) return;
    const report = selectReportSection(pendingReport, selection.index);
    selection.visible = false;
    await render("pdf", report);
  }

  async function render(format: ReportPreviewFormat, report: ReportDefinition) {
    currentReport = report;
    const options = {
      title: report.title,
      subtitle: report.subtitle || "",
      fileName: report.fileName,
    };
    if (format === "excel") {
      await excel.open({ ...options, build: () => buildReportExcelBlob(report) });
      return;
    }
    await pdf.open({ ...options, build: () => buildReportPdfBlob(report) });
  }

  /** Atajo para las pantallas que ya reciben el formato como texto. */
  function isPdf(format: string) {
    return String(format || "").toLowerCase() !== "excel";
  }

  function close() {
    selection.visible = false;
    pdf.close();
    excel.close();
  }

  async function openExcel() {
    if (currentReport) await open("excel", currentReport);
  }

  return { pdf, excel, open, openExcel, close, isPdf, selection, confirmSelection };
}

export type ReportPreview = ReturnType<typeof useReportPreview>;

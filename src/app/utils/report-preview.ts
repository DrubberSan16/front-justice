import {
  buildReportExcelBlob,
  buildReportPdfBlob,
  type ReportDefinition,
} from "@/app/utils/maintenance-intelligence-reports";
import { useExcelPreview } from "@/app/utils/excel-preview";
import { usePdfPreview } from "@/app/utils/pdf-preview";

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

  async function open(format: ReportPreviewFormat, report: ReportDefinition) {
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
    pdf.close();
    excel.close();
  }

  return { pdf, excel, open, close, isPdf };
}

export type ReportPreview = ReturnType<typeof useReportPreview>;

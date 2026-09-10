<template>
  <div class="section-export">
    <v-btn
      size="small"
      variant="text"
      prepend-icon="mdi-file-excel"
      :disabled="!rows.length"
      :aria-label="`Previsualizar ${title} en Excel`"
      @click="run('excel')"
    >
      Excel
    </v-btn>
    <v-btn
      size="small"
      variant="text"
      prepend-icon="mdi-file-pdf-box"
      :disabled="!rows.length"
      :aria-label="`Previsualizar ${title} en PDF`"
      @click="run('pdf')"
    >
      PDF
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import type { ReportSummaryItem } from "@/app/utils/maintenance-intelligence-reports";
import type { ReportPreview } from "@/app/utils/report-preview";
import {
  buildSectionReport,
  type SectionReportColumn,
} from "@/app/utils/section-report";

/**
 * Exportar lo que muestra una seccion del tablero, previsualizando primero.
 *
 * Recibe las MISMAS columnas y filas que pinta la tabla, no una consulta
 * nueva: asi el archivo dice exactamente lo que se esta viendo, con los
 * filtros ya aplicados.
 */
const props = defineProps<{
  preview: ReportPreview;
  title: string;
  subtitle?: string;
  fileName: string;
  columns: SectionReportColumn[];
  rows: Record<string, any>[];
  summary?: ReportSummaryItem[];
  note?: string;
}>();

async function run(format: "pdf" | "excel") {
  await props.preview.open(
    format,
    buildSectionReport({
      title: props.title,
      subtitle: props.subtitle,
      fileName: props.fileName,
      columns: props.columns,
      rows: props.rows,
      summary: props.summary,
      note: props.note,
    }),
  );
}
</script>

<style scoped>
.section-export {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
</style>

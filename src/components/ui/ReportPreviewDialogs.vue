<template>
  <PdfPreviewDialog
    :state="preview.pdf.state"
    :url="preview.pdf.url.value"
    @close="preview.pdf.close"
    @download="preview.pdf.download"
    @print="preview.pdf.openInNewTab"
    @update:visible="preview.pdf.handleVisibility"
  />
  <ExcelPreviewDialog
    :state="preview.excel.state"
    @close="preview.excel.close"
    @download="preview.excel.download"
    @select-sheet="preview.excel.selectSheet"
    @update:visible="preview.excel.handleVisibility"
  />
</template>

<script setup lang="ts">
import type { ReportPreview } from "@/app/utils/report-preview";
import ExcelPreviewDialog from "@/components/ui/ExcelPreviewDialog.vue";
import PdfPreviewDialog from "@/components/ui/PdfPreviewDialog.vue";

/**
 * Los dos visores de un reporte en un solo componente: una vista que exporta
 * en PDF y en Excel monta esto una vez y no repite el cableado.
 */
defineProps<{ preview: ReportPreview }>();
</script>

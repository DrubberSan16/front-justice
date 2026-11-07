<template>
  <v-dialog v-model="preview.selection.visible" max-width="600">
    <v-card rounded="xl" title="Seleccionar reporte para imprimir">
      <v-card-text>
        <p class="mb-4">{{ preview.selection.title }}</p>
        <v-select v-model="preview.selection.index" :items="preview.selection.options" label="Reporte" variant="outlined" hide-details />
        <p class="text-body-2 mt-3">Puedes imprimir cada reporte por separado o elegir el informe completo.</p>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn @click="preview.selection.visible = false">Cancelar</v-btn><v-btn color="primary" variant="flat" @click="preview.confirmSelection">Ver PDF</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
  <PdfPreviewDialog
    :state="preview.pdf.state"
    :url="preview.pdf.url.value"
    @close="preview.pdf.close"
    @download="preview.pdf.download"
    @print="preview.pdf.openInNewTab"
    @update:visible="preview.pdf.handleVisibility"
  >
    <template #opciones>
      <v-btn color="success" variant="tonal" prepend-icon="mdi-file-excel" :disabled="preview.pdf.state.loading" @click="preview.openExcel">Descargar Excel</v-btn>
    </template>
  </PdfPreviewDialog>
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

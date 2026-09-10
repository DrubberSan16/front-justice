<template>
  <v-dialog
    :model-value="state.open"
    max-width="1280"
    scrollable
    @update:model-value="emit('update:visible', $event)"
  >
    <v-card rounded="xl" class="excel-preview">
      <v-card-title class="excel-preview__header">
        <div class="excel-preview__copy">
          <strong>{{ state.title }}</strong>
          <span v-if="state.subtitle">{{ state.subtitle }}</span>
          <small>Revisa el contenido antes de descargarlo.</small>
        </div>
        <div class="excel-preview__actions">
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-download"
            :disabled="!hasContent || state.loading"
            @click="emit('download')"
            >Descargar</v-btn
          >
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Cerrar previsualización"
            @click="emit('close')"
          />
        </div>
      </v-card-title>
      <v-divider />
      <v-tabs
        v-if="hasContent && state.sheets.length > 1"
        :model-value="state.activeSheet"
        density="compact"
        show-arrows
        class="excel-preview__tabs"
        @update:model-value="emit('select-sheet', Number($event))"
      >
        <v-tab v-for="(sheet, index) in state.sheets" :key="sheet.name" :value="index">
          {{ sheet.name }}
        </v-tab>
      </v-tabs>
      <v-card-text class="excel-preview__body">
        <div v-if="state.loading" class="excel-preview__state">
          <v-progress-circular indeterminate color="primary" />
          <span>Generando el archivo...</span>
        </div>
        <v-alert
          v-else-if="state.error"
          type="warning"
          variant="tonal"
          rounded="xl"
          :text="state.error"
        />
        <div v-else-if="activeSheet" class="excel-preview__sheet">
          <div class="excel-preview__scroll">
            <table class="excel-preview__table">
              <thead>
                <tr>
                  <th class="excel-preview__index">#</th>
                  <th v-for="(cell, index) in activeSheet.columns" :key="`h-${index}`">
                    {{ cell }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in activeSheet.rows" :key="`r-${rowIndex}`">
                  <td class="excel-preview__index">{{ rowIndex + 1 }}</td>
                  <td v-for="(cell, cellIndex) in row" :key="`c-${rowIndex}-${cellIndex}`">
                    {{ cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="excel-preview__note">
            <span v-if="activeSheet.truncated">
              Se muestran las primeras {{ activeSheet.rows.length }} de
              {{ activeSheet.totalRows }} filas. El archivo descargado las trae todas.
            </span>
            <span v-else>{{ activeSheet.totalRows }} fila(s) en esta hoja.</span>
          </p>
        </div>
        <div v-else class="excel-preview__state">
          <span>No hay archivo para mostrar.</span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ExcelPreviewState } from "@/app/utils/excel-preview";

const props = defineProps<{ state: ExcelPreviewState }>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "download"): void;
  (event: "select-sheet", value: number): void;
  (event: "update:visible", value: boolean): void;
}>();

const hasContent = computed(() => props.state.sheets.length > 0);
const activeSheet = computed(
  () => props.state.sheets[props.state.activeSheet] ?? null,
);
</script>

<style scoped>
.excel-preview__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 22px;
}

.excel-preview__copy strong {
  display: block;
  font-size: 1.02rem;
}

.excel-preview__copy span,
.excel-preview__copy small {
  display: block;
  font-size: 0.82rem;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}

.excel-preview__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.excel-preview__tabs {
  border-bottom: 1px solid rgba(var(--v-border-color, 100 116 139), 0.16);
}

.excel-preview__body {
  min-height: min(70vh, 620px);
  padding: 16px 22px 20px;
}

.excel-preview__scroll {
  overflow: auto;
  max-height: min(62vh, 560px);
  border: 1px solid rgba(var(--v-border-color, 100 116 139), 0.2);
  border-radius: 12px;
}

.excel-preview__table {
  border-collapse: separate;
  border-spacing: 0;
  width: max-content;
  min-width: 100%;
  font-size: 0.8rem;
}

.excel-preview__table th,
.excel-preview__table td {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color, 100 116 139), 0.14);
  white-space: nowrap;
  text-align: left;
}

/* La cabecera y el numero de fila quedan fijos: sin eso, al desplazarse a la
   derecha se pierde de vista a que registro pertenece cada celda. */
.excel-preview__table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface, 255 255 255));
  font-weight: 600;
}

.excel-preview__index {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface, 255 255 255));
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
  font-variant-numeric: tabular-nums;
}

.excel-preview__table thead th.excel-preview__index {
  z-index: 3;
}

.excel-preview__note {
  margin: 10px 2px 0;
  font-size: 0.78rem;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}

.excel-preview__state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 240px;
  padding: 24px;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}
</style>

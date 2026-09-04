<template>
  <v-dialog
    :model-value="state.open"
    max-width="1180"
    scrollable
    @update:model-value="emit('update:visible', $event)"
  >
    <v-card rounded="xl" class="pdf-preview">
      <v-card-title class="pdf-preview__header">
        <div class="pdf-preview__copy">
          <strong>{{ state.title }}</strong>
          <span v-if="state.subtitle">{{ state.subtitle }}</span>
          <small>Revisa el documento antes de descargarlo.</small>
        </div>
        <div class="pdf-preview__actions">
          <v-btn
            variant="text"
            prepend-icon="mdi-open-in-new"
            :disabled="!url || state.loading"
            @click="emit('print')"
            >Abrir</v-btn
          >
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-download"
            :disabled="!url || state.loading"
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
      <v-card-text class="pdf-preview__body">
        <div v-if="state.loading" class="pdf-preview__state">
          <v-progress-circular indeterminate color="primary" />
          <span>Generando el documento...</span>
        </div>
        <v-alert
          v-else-if="state.error"
          type="warning"
          variant="tonal"
          rounded="xl"
          :text="state.error"
        />
        <iframe
          v-else-if="url"
          :src="url"
          :title="state.title"
          class="pdf-preview__frame"
        />
        <div v-else class="pdf-preview__state">
          <span>No hay documento para mostrar.</span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { PdfPreviewState } from "@/app/utils/pdf-preview";

defineProps<{ state: PdfPreviewState; url: string }>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "download"): void;
  (event: "print"): void;
  (event: "update:visible", value: boolean): void;
}>();
</script>

<style scoped>
.pdf-preview__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 22px;
}

.pdf-preview__copy strong {
  display: block;
  font-size: 1.02rem;
}

.pdf-preview__copy span,
.pdf-preview__copy small {
  display: block;
  font-size: 0.82rem;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}

.pdf-preview__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pdf-preview__body {
  min-height: min(72vh, 640px);
  padding: 0;
}

/* El visor ocupa toda la caja: un PDF recortado obliga a descargarlo para
   leerlo, que es justo lo que esta pantalla intenta evitar. */
.pdf-preview__frame {
  width: 100%;
  height: min(72vh, 640px);
  border: 0;
  display: block;
}

.pdf-preview__state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 240px;
  padding: 24px;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}
</style>

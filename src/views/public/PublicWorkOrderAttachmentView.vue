<template>
  <div class="public-attachment-page">
    <v-container class="py-8">
      <v-card rounded="xl" class="pa-5 public-attachment-card">
        <div class="d-flex justify-space-between align-start flex-wrap mb-4" style="gap: 12px;">
          <div>
            <div class="text-overline text-medium-emphasis">Adjunto de orden de trabajo</div>
            <div class="text-h5 font-weight-bold">{{ attachmentName }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ attachmentTypeLabel }}<span v-if="mimeType"> · {{ mimeType }}</span>
            </div>
          </div>
          <div class="d-flex flex-wrap" style="gap: 8px;">
            <v-btn
              v-if="attachment?.view_url"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-open-in-new"
              :href="attachment.view_url"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir directo
            </v-btn>
            <v-btn
              v-if="attachment?.download_url"
              color="primary"
              prepend-icon="mdi-download"
              :href="attachment.download_url"
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar
            </v-btn>
          </div>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" rounded class="mb-4" />
        <v-alert v-else-if="error" type="error" variant="tonal" :text="error" />

        <template v-else-if="attachment">
          <v-sheet rounded="lg" class="pa-4 public-attachment-preview">
            <v-img
              v-if="isImage && attachment.view_url"
              :src="attachment.view_url"
              :alt="attachmentName"
              max-height="680"
              contain
              class="rounded-lg"
            />

            <video
              v-else-if="isVideo && attachment.view_url"
              :src="attachment.view_url"
              controls
              style="width: 100%; max-height: 680px; border-radius: 16px; background: #000;"
            />

            <iframe
              v-else-if="isPdf && attachment.view_url"
              :src="attachment.view_url"
              title="Vista previa del adjunto"
              style="width: 100%; min-height: 720px; border: 0; border-radius: 16px; background: #fff;"
            />

            <div v-else class="d-flex flex-column align-center text-center py-12" style="gap: 12px;">
              <v-icon size="56" color="primary">mdi-file-document-outline</v-icon>
              <div class="text-h6 font-weight-bold">Vista previa no disponible</div>
              <div class="text-body-2 text-medium-emphasis">
                Este tipo de archivo se puede abrir o descargar directamente desde los botones superiores.
              </div>
            </div>
          </v-sheet>
        </template>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/app/http/api";

const route = useRoute();
const loading = ref(true);
const error = ref("");
const attachment = ref<any | null>(null);

function unwrapData(payload: any) {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as any).data;
  }
  return payload;
}

const mimeType = computed(() =>
  String(
    attachment.value?.content_type ||
      attachment.value?.meta?.mime_type ||
      "",
  ).trim().toLowerCase(),
);

const attachmentName = computed(() =>
  String(attachment.value?.nombre || "Adjunto").trim() || "Adjunto",
);

const isImage = computed(() => mimeType.value.startsWith("image/"));
const isVideo = computed(() => mimeType.value.startsWith("video/"));
const isPdf = computed(() => mimeType.value === "application/pdf");

const attachmentTypeLabel = computed(() => {
  if (isImage.value) return "Imagen";
  if (isVideo.value) return "Video";
  if (isPdf.value) return "Documento PDF";
  return "Archivo";
});

async function loadAttachment() {
  loading.value = true;
  error.value = "";
  try {
    const workOrderId = String(route.params.workOrderId || "").trim();
    const adjuntoId = String(route.params.adjuntoId || "").trim();
    const { data } = await api.get(
      `/kpi_maintenance/public/work-orders/${workOrderId}/adjuntos/${adjuntoId}`,
    );
    attachment.value = unwrapData(data);
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ||
      "No se pudo cargar el adjunto solicitado.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadAttachment);
</script>

<style scoped>
.public-attachment-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(74, 222, 128, 0.12), transparent 24%),
    linear-gradient(180deg, #f4f7fb 0%, #ebf1f8 100%);
}

.public-attachment-card {
  max-width: 1180px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.public-attachment-preview {
  background: linear-gradient(180deg, rgba(245, 248, 252, 0.92), rgba(237, 243, 250, 0.96));
  min-height: 320px;
}
</style>

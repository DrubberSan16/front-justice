<template>
  <div>
    <div class="events-heading">
      <div>
        <h3 class="text-h6">Línea de eventos del activo</h3>
        <p class="text-body-2 text-medium-emphasis mt-2">
          Movimientos más recientes primero. Cada tarjeta conserva su fecha,
          origen y usuario disponible.
        </p>
      </div>
      <v-chip variant="tonal" size="small">{{ events.length }} eventos</v-chip>
    </div>
    <v-select
      v-model="source"
      :items="sources"
      label="Filtrar por origen"
      variant="outlined"
      density="comfortable"
      hide-details
      class="events-filter"
    />
    <v-timeline
      v-if="filtered.length"
      density="compact"
      side="end"
      truncate-line="both"
      class="twin-event-history"
    >
      <v-timeline-item
        v-for="event in visible"
        :key="event.id"
        :dot-color="metadata(event).color"
        :icon="metadata(event).icon"
        size="small"
        fill-dot
      >
        <v-card variant="outlined" rounded="lg" class="event-card">
          <div class="event-card-heading">
            <v-chip
              size="small"
              :color="metadata(event).color"
              variant="tonal"
              >{{ metadata(event).label }}</v-chip
            >
            <time :datetime="event.at || undefined">{{
              formatDateTime(event.at, "Fecha sin registro")
            }}</time>
          </div>
          <h4>{{ event.title }}</h4>
          <div v-if="event.to_status" class="event-transition">
            <v-chip
              v-if="event.from_status && event.from_status !== event.to_status"
              size="small"
              variant="outlined"
              >{{ workflowLabel(event.from_status) }}</v-chip
            >
            <v-icon
              v-if="event.from_status && event.from_status !== event.to_status"
              icon="mdi-arrow-right"
              size="16"
            />
            <v-chip
              size="small"
              :color="metadata(event).color"
              variant="tonal"
              >{{ workflowLabel(event.to_status) }}</v-chip
            >
          </div>
          <div class="text-body-2 text-medium-emphasis event-actor">
            <v-icon icon="mdi-account-outline" size="16" />{{
              reportDisplayLabel(event.actor) ||
              "Usuario sin registro en la fuente"
            }}
          </div>
          <p class="text-body-2">
            {{
              formatWorkOrderHistoryNote(event.detail) ||
              "Sin detalle adicional"
            }}
          </p>
        </v-card>
      </v-timeline-item>
    </v-timeline>
    <v-alert v-else type="info" variant="tonal" class="mt-5"
      >Sin eventos registrados para este origen.</v-alert
    >
    <v-pagination
      v-if="filtered.length > 15"
      v-model="page"
      :length="Math.ceil(filtered.length / 15)"
      :total-visible="3"
      density="comfortable"
      size="small"
      class="mt-4"
    />
    <p class="text-caption text-medium-emphasis mt-5">
      Se muestran hasta 100 eventos entre las fuentes consultadas. El histórico
      completo permanece en cada módulo.
    </p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { formatDateTime } from "@/app/utils/date-time";
import {
  formatWorkOrderHistoryNote,
  reportDisplayLabel,
} from "@/app/utils/work-order-audit";
import type { TwinState } from "@/app/types/digital-twin.types";
const props = defineProps<{ events: TwinState["events"] }>();
const source = ref("ALL");
const page = ref(1);
watch(source, () => {
  page.value = 1;
});
const workflowLabel = (value: string) =>
  (
    ({
      PLANNED: "Planificada",
      IN_PROGRESS: "En proceso",
      REVIEW: "En revisión",
      BLOCKED: "Bloqueada",
      CLOSED: "Finalizada",
    }) as Record<string, string>
  )[value] || value;
const types: Record<string, { label: string; color: string; icon: string }> = {
  OT: {
    label: "Orden de trabajo",
    color: "primary",
    icon: "mdi-clipboard-text-clock-outline",
  },
  HOROMETRO: { label: "Horómetro", color: "info", icon: "mdi-counter" },
  FUNCIONAMIENTO: {
    label: "Funcionamiento",
    color: "success",
    icon: "mdi-engine-outline",
  },
  UBICACION: {
    label: "Ubicación y sucursal",
    color: "secondary",
    icon: "mdi-map-marker-outline",
  },
  ALERTA: { label: "Alerta", color: "warning", icon: "mdi-alert-outline" },
  LUBRICANTE: {
    label: "Análisis de lubricante",
    color: "info",
    icon: "mdi-oil",
  },
};
const sources = computed(() => [
  { title: "Todos los orígenes", value: "ALL" },
  ...Object.entries(types)
    .filter(([key]) => props.events.some((e) => e.type === key))
    .map(([value, meta]) => ({ value, title: meta.label })),
]);
const filtered = computed(() =>
  props.events.filter((e) => source.value === "ALL" || e.type === source.value),
);
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * 15, page.value * 15),
);
function metadata(event: TwinState["events"][number]) {
  const base = types[event.type] || {
    label: event.type,
    color: "primary",
    icon: "mdi-history",
  };
  if (event.type !== "OT") return base;
  return {
    ...base,
    ...(
      {
        CLOSED: { color: "success", icon: "mdi-check-circle-outline" },
        REVIEW: { color: "warning", icon: "mdi-clipboard-check-outline" },
        BLOCKED: { color: "error", icon: "mdi-pause-circle-outline" },
        IN_PROGRESS: { color: "info", icon: "mdi-progress-wrench" },
      } as Record<string, { color: string; icon: string }>
    )[event.to_status || ""],
  };
}
</script>
<style scoped>
.events-heading,
.event-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.events-filter {
  max-width: 340px;
  margin: 24px 0;
}
.twin-event-history {
  grid-template-columns: min-content min-content auto;
}
.twin-event-history :deep(.v-timeline-item__body) {
  width: 100%;
  min-width: 0;
  padding-block-end: 24px;
}
.event-card {
  padding: 20px;
}
.event-card-heading time {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.event-card h4 {
  font-size: 15px;
  line-height: 1.5;
  margin: 14px 0 12px;
}
.event-card h4,
.event-card p {
  overflow-wrap: anywhere;
}
.event-transition {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.event-actor {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
@media (max-width: 600px) {
  .event-card {
    padding: 16px;
  }
  .event-card-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
  .events-filter {
    max-width: none;
  }
}
</style>

<template>
  <div class="intelligence-page">
    <v-card rounded="xl" class="pa-5 enterprise-surface intelligence-hero">
      <div class="d-flex align-center justify-space-between" style="gap: 12px; flex-wrap: wrap;">
        <div>
          <div class="text-h6 font-weight-bold">Inteligencia operativa documental</div>
          <div class="text-body-2 text-medium-emphasis">
            Consolida procedimientos, análisis de lubricante, cronogramas semanales, reportes diarios, combustible y eventos KPI.
          </div>
        </div>
        <div class="d-flex align-center" style="gap: 8px; flex-wrap: wrap;">
          <v-chip label color="primary" variant="tonal">
            {{ generatedAtLabel }}
          </v-chip>
          <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadSummary">
            Actualizar
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <v-row dense class="mt-3">
        <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="3">
          <v-card rounded="lg" variant="outlined" class="pa-4 intelligence-kpi h-100">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 text-medium-emphasis">{{ card.label }}</div>
              <v-icon :icon="card.icon" size="20" />
            </div>
            <div class="text-h4 font-weight-bold">{{ card.value }}</div>
            <div class="text-body-2 text-medium-emphasis mt-2">{{ card.helper }}</div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>

    <v-row class="mt-1">
      <v-col cols="12" lg="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="text-subtitle-1 font-weight-bold mb-3">Distribución por proceso</div>
          <div class="breakdown-grid">
            <div v-for="item in breakdownItems" :key="item.tipo_proceso" class="breakdown-chip">
              <div class="text-caption text-medium-emphasis">{{ prettifyProcess(item.tipo_proceso) }}</div>
              <div class="text-h6 font-weight-bold">{{ item.total }}</div>
            </div>
          </div>
          <div v-if="!breakdownItems.length" class="text-body-2 text-medium-emphasis">
            Aún no existen eventos documentales registrados.
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Eventos recientes</div>
            <v-chip label color="secondary" variant="tonal">{{ recentEvents.length }} eventos</v-chip>
          </div>

          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="item in recentEvents"
              :key="item.id"
              :title="item.title"
              :subtitle="item.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!recentEvents.length"
              title="Sin eventos recientes"
              subtitle="Las notificaciones de proceso aparecerán aquí."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" xl="3">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Análisis de lubricante</div>
            <v-chip label color="warning" variant="tonal">{{ summary.kpis?.analisis_lubricante ?? 0 }}</v-chip>
          </div>
          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="item in recentAnalyses"
              :key="item.id"
              :title="item.title"
              :subtitle="item.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!recentAnalyses.length"
              title="Sin análisis cargados"
              subtitle="Los diagnósticos de lubricante aparecerán aquí."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" xl="3">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Cronogramas semanales</div>
            <v-chip label color="info" variant="tonal">{{ summary.kpis?.cronogramas_semanales ?? 0 }}</v-chip>
          </div>
          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="item in recentSchedules"
              :key="item.id"
              :title="item.title"
              :subtitle="item.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!recentSchedules.length"
              title="Sin cronogramas"
              subtitle="La planificación semanal se mostrará aquí."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" xl="3">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Reportes diarios</div>
            <v-chip label color="success" variant="tonal">{{ summary.kpis?.reportes_diarios ?? 0 }}</v-chip>
          </div>
          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="item in recentDailyReports"
              :key="item.id"
              :title="item.title"
              :subtitle="item.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!recentDailyReports.length"
              title="Sin reportes diarios"
              subtitle="Las actualizaciones operativas se reflejarán aquí."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" xl="3">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Componentes críticos</div>
            <v-chip label color="error" variant="tonal">{{ summary.kpis?.componentes_monitoreados ?? 0 }}</v-chip>
          </div>
          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="item in componentHighlights"
              :key="item.id"
              :title="item.title"
              :subtitle="item.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!componentHighlights.length"
              title="Sin componentes registrados"
              subtitle="Turbos, inyectores, chumaceras y otros cambios aparecerán aquí."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";

type SummaryState = {
  generated_at?: string;
  kpis?: Record<string, number>;
  process_breakdown?: Array<{ tipo_proceso: string; total: number }>;
  recent_events?: any[];
  recent_analyses?: any[];
  recent_weekly_schedules?: any[];
  recent_daily_reports?: any[];
  component_highlights?: any[];
};

const loading = ref(false);
const error = ref<string | null>(null);
const summary = reactive<SummaryState>({});

function resetSummary() {
  summary.generated_at = undefined;
  summary.kpis = {};
  summary.process_breakdown = [];
  summary.recent_events = [];
  summary.recent_analyses = [];
  summary.recent_weekly_schedules = [];
  summary.recent_daily_reports = [];
  summary.component_highlights = [];
}

async function loadSummary() {
  loading.value = true;
  error.value = null;

  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/summary");
    const payload = data?.data ?? data ?? {};
    resetSummary();
    Object.assign(summary, payload);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar la inteligencia operativa.";
  } finally {
    loading.value = false;
  }
}

function prettifyProcess(value: string) {
  return String(value || "SIN_TIPO")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const generatedAtLabel = computed(() => {
  if (!summary.generated_at) return "Sin sincronizar";
  return new Date(summary.generated_at).toLocaleString();
});

const breakdownItems = computed(() => summary.process_breakdown ?? []);

const kpiCards = computed(() => [
  {
    key: "procedimientos",
    label: "Plantillas activas",
    value: summary.kpis?.procedimientos ?? 0,
    helper: "Procedimientos base derivados de los documentos",
    icon: "mdi-file-document-multiple-outline",
  },
  {
    key: "vencidas",
    label: "Programaciones vencidas",
    value: summary.kpis?.programaciones_vencidas ?? 0,
    helper: "Se detectan desde planes y horómetros",
    icon: "mdi-calendar-alert",
  },
  {
    key: "ots",
    label: "OT pendientes",
    value: summary.kpis?.work_orders_pendientes ?? 0,
    helper: "Órdenes planificadas o en proceso",
    icon: "mdi-clipboard-text-clock-outline",
  },
  {
    key: "eventos",
    label: "Eventos KPI",
    value: summary.kpis?.eventos_proceso ?? 0,
    helper: "Cada proceso principal genera traza y notificación",
    icon: "mdi-bell-ring-outline",
  },
]);

const recentEvents = computed(() =>
  (summary.recent_events ?? []).map((item: any) => ({
    id: item.id,
    title: `${prettifyProcess(item.tipo_proceso)} · ${item.accion}`,
    subtitle: `${item.referencia_codigo || item.referencia_tabla}${item.fecha_evento ? ` · ${new Date(item.fecha_evento).toLocaleString()}` : ""}`,
  })),
);

const recentAnalyses = computed(() =>
  (summary.recent_analyses ?? []).map((item: any) => ({
    id: item.id,
    title: `${item.codigo} · ${item.equipo_codigo || item.equipo_nombre || "Sin equipo"}`,
    subtitle: `${item.estado_diagnostico || "NORMAL"}${item.fecha_reporte ? ` · ${item.fecha_reporte}` : ""}`,
  })),
);

const recentSchedules = computed(() =>
  (summary.recent_weekly_schedules ?? []).map((item: any) => ({
    id: item.id,
    title: `${item.codigo} · ${item.locacion || "Sin locación"}`,
    subtitle: `${item.fecha_inicio || ""} - ${item.fecha_fin || ""}`,
  })),
);

const recentDailyReports = computed(() =>
  (summary.recent_daily_reports ?? []).map((item: any) => ({
    id: item.id,
    title: `${item.codigo} · ${item.locacion || "Sin locación"}`,
    subtitle: `${item.fecha_reporte || ""}${item.turno ? ` · ${item.turno}` : ""}`,
  })),
);

const componentHighlights = computed(() =>
  (summary.component_highlights ?? []).map((item: any) => ({
    id: item.id,
    title: `${item.tipo_componente || "Componente"} · ${item.equipo_codigo || "Sin equipo"}`,
    subtitle: `${item.estado || "Sin estado"}${item.motivo ? ` · ${item.motivo}` : ""}`,
  })),
);

onMounted(() => {
  loadSummary();
});
</script>

<style scoped>
.intelligence-page {
  display: grid;
  gap: 20px;
}

.intelligence-hero {
  overflow: hidden;
}

.intelligence-kpi {
  border-color: var(--surface-border);
  background: var(--surface-soft);
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.breakdown-chip {
  padding: 14px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-soft);
}

.h-100 {
  height: 100%;
}
</style>

<template>
  <div class="daily-report-page">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar este modulo.
    </v-alert>

    <v-alert v-else-if="!canAccessReports" type="warning" variant="tonal">
      No tienes permisos para acceder a este reporte.
    </v-alert>

    <template v-else>
      <v-card rounded="xl" class="enterprise-surface hero-card">
        <div class="report-hero__glow report-hero__glow--one" />
        <div class="report-hero__glow report-hero__glow--two" />

        <div class="hero-wrap">
          <div class="report-hero__copy">
            <div class="report-hero__eyebrow">
              <span class="report-hero__pulse" />
              Consolidado operativo del día
            </div>
            <h1 class="report-hero__title">Reporte diario</h1>
            <p class="report-hero__description">
              Revisa movimientos de materiales y el avance de las órdenes de trabajo en una sola vista.
            </p>
            <div class="report-hero__meta">
              <span><v-icon icon="mdi-clock-check-outline" size="16" />{{ generatedAtLabel }}</span>
              <span><v-icon icon="mdi-calendar-today-outline" size="16" />{{ reportPayload?.filters?.label || "Sin fecha" }}</span>
            </div>
          </div>

          <div class="hero-actions">
            <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadReport">
              Actualizar
            </v-btn>
            <v-btn
              variant="tonal"
              prepend-icon="mdi-file-pdf-box"
              :loading="exportingPdf"
              :disabled="loading || !reportPayload"
              @click="downloadDailyReportPdf"
            >
              Descargar PDF
            </v-btn>
          </div>
        </div>

        <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

        <div class="report-filter-panel">
          <div class="report-filter-panel__intro">
            <div class="report-filter-panel__icon"><v-icon icon="mdi-calendar-filter-outline" size="21" /></div>
            <div>
              <strong>Fecha del reporte</strong>
              <span>Consulta el consolidado de una jornada específica.</span>
            </div>
          </div>
          <div class="report-filter-panel__field">
            <v-text-field
              v-model="filters.fecha"
              type="date"
              label="Fecha"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>
          <div class="report-filter-panel__actions">
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-filter-outline" :loading="loading" @click="loadReport">
              Aplicar filtro
            </v-btn>
            <v-btn variant="text" prepend-icon="mdi-calendar-today" @click="clearFilters">Ir a hoy</v-btn>
          </div>
        </div>
      </v-card>

      <v-row dense class="mt-2">
        <v-col v-for="card in summaryCards" :key="card.label" cols="12" sm="6" xl="3">
          <v-card rounded="xl" :class="['summary-card', `summary-card--${card.tone}`, 'h-100']">
            <div class="summary-card__top">
              <div class="summary-card__icon"><v-icon :icon="card.icon" size="21" /></div>
              <span>RESUMEN</span>
            </div>
            <div class="summary-card__value">{{ card.value }}</div>
            <div class="summary-card__label">{{ card.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row dense class="mt-2">
        <v-col cols="12" lg="6">
          <DashboardBarChartCard
            title="Movimientos por fuente"
            subtitle="Peso diario de kardex, compras y salidas de ordenes de trabajo"
            :chip-label="`${sourceChartItems.length} fuentes`"
            chip-color="primary"
            :items="sourceChartItems"
            empty-text="No hay movimientos para la fecha consultada."
          />
        </v-col>
        <v-col cols="12" lg="6">
          <DashboardBarChartCard
            title="Movimientos por bodega"
            subtitle="Bodegas impactadas por entradas o salidas durante el dia"
            :chip-label="`${warehouseChartItems.length} bodegas`"
            chip-color="success"
            :items="warehouseChartItems"
            empty-text="No hay bodegas con movimientos para la fecha consultada."
          />
        </v-col>
      </v-row>

      <v-card rounded="xl" class="enterprise-surface mt-4 daily-data-card">
        <LoadingTableState
          v-if="loading"
          message="Generando reporte diario..."
          :rows="6"
          :columns="5"
        />

        <template v-else>
          <div class="daily-data-card__header">
            <div class="daily-data-card__heading">
              <div class="daily-data-card__icon"><v-icon icon="mdi-table-large" size="22" /></div>
              <div>
                <div class="text-subtitle-1 font-weight-bold">Detalle operativo</div>
                <div class="text-caption text-medium-emphasis">Selecciona una vista para revisar cada registro.</div>
              </div>
            </div>
            <v-chip label color="primary" variant="tonal">
              {{ movementRows.length + pendingRows.length + closedRows.length }} registros
            </v-chip>
          </div>

          <v-tabs v-model="activeTab" color="primary" class="system-tabs">
            <v-tab value="movimientos" prepend-icon="mdi-swap-horizontal-bold">Movimientos ({{ movementRows.length }})</v-tab>
            <v-tab value="pendientes" prepend-icon="mdi-clipboard-clock-outline">OT pendientes ({{ pendingRows.length }})</v-tab>
            <v-tab value="cerradas" prepend-icon="mdi-clipboard-check-outline">OT cerradas ({{ closedRows.length }})</v-tab>
          </v-tabs>

          <v-window v-model="activeTab" class="daily-data-card__window">
            <v-window-item value="movimientos">
              <div class="table-context-bar">
                <div>
                  <strong>Movimientos de inventario</strong>
                  <span>Entradas y salidas registradas durante la jornada.</span>
                </div>
                <v-chip size="small" color="primary" variant="tonal">{{ movementRows.length }} filas</v-chip>
              </div>
              <v-data-table
                :headers="movementHeaders"
                :items="movementRows"
                density="comfortable"
                :items-per-page="10"
                fixed-header
                height="520"
                hover
                class="table-enterprise enterprise-table report-data-table"
              >
                <template #item.fecha="{ item }">
                  {{ formatDateTime(item.fecha, "-") }}
                </template>
                <template #item.entrada_cantidad="{ item }">
                  {{ formatNumber(item.entrada_cantidad) }}
                </template>
                <template #item.salida_cantidad="{ item }">
                  {{ formatNumber(item.salida_cantidad) }}
                </template>
                <template #item.source_label="{ item }">
                  <v-chip size="small" variant="tonal" :color="sourceChipColor(item.source_type)">
                    {{ item.source_label }}
                  </v-chip>
                </template>
                <template #no-data>
                  <div class="table-empty-state">
                    <v-icon icon="mdi-package-variant-closed-check" size="30" />
                    No hay movimientos de inventario para la fecha consultada.
                  </div>
                </template>
              </v-data-table>
            </v-window-item>

            <v-window-item value="pendientes">
              <div class="table-context-bar">
                <div>
                  <strong>Órdenes pendientes</strong>
                  <span>Trabajo planificado o en proceso durante la jornada.</span>
                </div>
                <v-chip size="small" color="info" variant="tonal">{{ pendingRows.length }} filas</v-chip>
              </div>
              <v-data-table
                :headers="workOrderHeaders"
                :items="pendingRows"
                density="comfortable"
                :items-per-page="10"
                fixed-header
                height="520"
                hover
                class="table-enterprise enterprise-table report-data-table"
              >
                <template #item.status="{ item }">
                  <v-chip size="small" variant="tonal" color="info">
                    {{ item.status }}
                  </v-chip>
                </template>
                <template #item.fecha_evento="{ item }">
                  {{ formatDateTime(item.fecha_evento, "-") }}
                </template>
                <template #no-data>
                  <div class="table-empty-state">
                    <v-icon icon="mdi-clipboard-clock-outline" size="30" />
                    No hay ordenes de trabajo pendientes en la fecha consultada.
                  </div>
                </template>
              </v-data-table>
            </v-window-item>

            <v-window-item value="cerradas">
              <div class="table-context-bar">
                <div>
                  <strong>Órdenes cerradas</strong>
                  <span>Trabajos culminados y registrados durante la jornada.</span>
                </div>
                <v-chip size="small" color="success" variant="tonal">{{ closedRows.length }} filas</v-chip>
              </div>
              <v-data-table
                :headers="workOrderHeaders"
                :items="closedRows"
                density="comfortable"
                :items-per-page="10"
                fixed-header
                height="520"
                hover
                class="table-enterprise enterprise-table report-data-table"
              >
                <template #item.status="{ item }">
                  <v-chip size="small" variant="tonal" color="success">
                    {{ item.status }}
                  </v-chip>
                </template>
                <template #item.fecha_evento="{ item }">
                  {{ formatDateTime(item.fecha_evento, "-") }}
                </template>
                <template #no-data>
                  <div class="table-empty-state">
                    <v-icon icon="mdi-clipboard-check-outline" size="30" />
                    No se cerraron ordenes de trabajo en la fecha consultada.
                  </div>
                </template>
              </v-data-table>
            </v-window-item>
          </v-window>
        </template>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import { currentDateInputValue, formatDateTime } from "@/app/utils/date-time";
import {
  downloadReportPdf,
  type ReportDefinition,
} from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;
type DashboardChartItem = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  helper?: string;
};

const auth = useAuthStore();
const menuStore = useMenuStore();
const ui = useUiStore();
const loading = ref(false);
const exportingPdf = ref(false);
const error = ref<string | null>(null);
const reportPayload = ref<AnyRow | null>(null);
const activeTab = ref("movimientos");

const filters = reactive({
  fecha: currentDateInputValue(),
});

const movementHeaders = [
  { title: "Fecha", key: "fecha" },
  { title: "Fuente", key: "source_label" },
  { title: "Material", key: "producto_nombre" },
  { title: "Bodega", key: "bodega_label" },
  { title: "Entrada", key: "entrada_cantidad" },
  { title: "Salida", key: "salida_cantidad" },
  { title: "Documento", key: "documento" },
  { title: "OT", key: "work_order_code" },
];

const workOrderHeaders = [
  { title: "Codigo", key: "code" },
  { title: "Titulo", key: "title" },
  { title: "Equipo", key: "equipment_label" },
  { title: "Tipo", key: "maintenance_kind" },
  { title: "Estado", key: "status" },
  { title: "Fecha", key: "fecha_evento" },
];

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "Reporte diario",
    "Reportes del sistema",
    "Inteligencia Operativa",
    "Inteligencia operativa",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canAccessReports = computed(() => {
  const allowedReports = auth.user?.effectiveReportes ?? auth.user?.reportes;
  return (
    hasReportAccess(allowedReports, "reportes_sistema") ||
    hasReportAccess(allowedReports, "inteligencia_operativa")
  );
});

const generatedAtLabel = computed(() =>
  reportPayload.value?.generated_at
    ? formatDateTime(reportPayload.value.generated_at, "Sin sincronizar")
    : "Sin sincronizar",
);

const movementRows = computed<AnyRow[]>(() =>
  Array.isArray(reportPayload.value?.movements) ? reportPayload.value.movements : [],
);

const pendingRows = computed<AnyRow[]>(() =>
  Array.isArray(reportPayload.value?.work_orders_pending)
    ? reportPayload.value.work_orders_pending
    : Array.isArray(reportPayload.value?.work_orders_created)
      ? reportPayload.value.work_orders_created
    : [],
);

const closedRows = computed<AnyRow[]>(() =>
  Array.isArray(reportPayload.value?.work_orders_closed)
    ? reportPayload.value.work_orders_closed
    : [],
);

const sourceChartItems = computed<DashboardChartItem[]>(() =>
  (Array.isArray(reportPayload.value?.source_breakdown) ? reportPayload.value.source_breakdown : []).map((item: AnyRow) => ({
    key: item.source_type,
    label: item.source_label,
    value: Number(item.entradas || 0) + Number(item.salidas || 0),
    valueLabel: formatNumber(Number(item.entradas || 0) + Number(item.salidas || 0)),
    helper: `${item.movimientos || 0} mov.`,
  })),
);

const warehouseChartItems = computed<DashboardChartItem[]>(() =>
  (Array.isArray(reportPayload.value?.warehouse_breakdown) ? reportPayload.value.warehouse_breakdown : [])
    .slice(0, 8)
    .map((item: AnyRow) => ({
      key: item.bodega_id || item.bodega_label,
      label: item.bodega_label || "Sin bodega",
      value: Number(item.entradas || 0) + Number(item.salidas || 0),
      valueLabel: formatNumber(Number(item.entradas || 0) + Number(item.salidas || 0)),
      helper: `${item.movimientos || 0} mov.`,
    })),
);

const summaryCards = computed(() => {
  const summary = reportPayload.value?.summary ?? {};
  return [
    { label: "Entradas del día", value: formatNumber(summary.total_entradas), icon: "mdi-tray-arrow-down", tone: "success" },
    { label: "Salidas del día", value: formatNumber(summary.total_salidas), icon: "mdi-tray-arrow-up", tone: "warning" },
    { label: "Ingresos por compra", value: formatNumber(summary.ingresos_compra), icon: "mdi-cart-arrow-down", tone: "primary" },
    { label: "Salidas por OT", value: formatNumber(summary.salidas_ot), icon: "mdi-wrench-clock-outline", tone: "orange" },
    { label: "Movimientos kardex", value: String(summary.movimientos_kardex ?? 0), icon: "mdi-swap-horizontal-bold", tone: "info" },
    {
      label: "OT pendientes",
      value: String(summary.ordenes_pendientes ?? summary.ordenes_generadas ?? 0),
      icon: "mdi-clipboard-clock-outline",
      tone: "purple",
    },
    { label: "OT cerradas", value: String(summary.ordenes_cerradas ?? 0), icon: "mdi-clipboard-check-outline", tone: "success" },
    {
      label: "Materiales distintos",
      value: `${summary.materiales_ingresados_distintos ?? 0} / ${summary.materiales_salidos_distintos ?? 0}`,
      icon: "mdi-package-variant-closed",
      tone: "primary",
    },
  ];
});

function formatNumber(value: unknown, digits = 2) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(numeric);
}

function sourceChipColor(sourceType: string) {
  const normalized = String(sourceType || "").toUpperCase();
  if (normalized === "INGRESO_COMPRA") return "success";
  if (normalized === "SALIDA_OT") return "warning";
  return "primary";
}

function buildDailyOperationsPdfReport(): ReportDefinition {
  const summary = reportPayload.value?.summary ?? {};
  const label = reportPayload.value?.filters?.label || filters.fecha || "Sin fecha";
  return {
    fileName: `reporte_diario_${String(filters.fecha || "hoy").replace(/\W+/g, "_")}`,
    title: "Reporte diario",
    subtitle: `Consolidado operativo del ${label}.`,
    orientation: "landscape",
    summary: [
      { label: "Entradas del dia", value: formatNumber(summary.total_entradas) },
      { label: "Salidas del dia", value: formatNumber(summary.total_salidas) },
      { label: "Salidas por OT", value: formatNumber(summary.salidas_ot) },
      { label: "OT pendientes", value: String(summary.ordenes_pendientes ?? summary.ordenes_generadas ?? 0) },
      { label: "OT cerradas", value: String(summary.ordenes_cerradas ?? 0) },
    ],
    sheets: [
      {
        name: "Movimientos",
        rows: movementRows.value,
        emptyMessage: "No hay movimientos de inventario para la fecha consultada.",
        columns: [
          { key: "fecha", header: "Fecha", format: "datetime", width: 18 },
          { key: "source_label", header: "Fuente", width: 18 },
          { key: "producto_nombre", header: "Material", width: 26 },
          { key: "bodega_label", header: "Bodega", width: 24 },
          { key: "entrada_cantidad", header: "Entrada", format: "number", width: 12 },
          { key: "salida_cantidad", header: "Salida", format: "number", width: 12 },
          { key: "documento", header: "Documento", width: 18 },
          { key: "work_order_code", header: "OT", width: 16 },
        ],
      },
      {
        name: "OT pendientes",
        rows: pendingRows.value,
        emptyMessage: "No hay ordenes de trabajo pendientes.",
        columns: workOrderHeaders.map((item) => ({
          key: String(item.key),
          header: String(item.title),
          width: 18,
        })),
      },
      {
        name: "OT cerradas",
        rows: closedRows.value,
        emptyMessage: "No se cerraron ordenes de trabajo.",
        columns: workOrderHeaders.map((item) => ({
          key: String(item.key),
          header: String(item.title),
          width: 18,
        })),
      },
    ],
  };
}

async function downloadDailyReportPdf() {
  if (!reportPayload.value) {
    await loadReport();
  }
  if (!reportPayload.value) return;
  exportingPdf.value = true;
  try {
    await downloadReportPdf(buildDailyOperationsPdfReport());
    ui.success("Reporte diario descargado en PDF.");
  } catch (e: any) {
    ui.error(e?.message || "No se pudo descargar el reporte diario en PDF.");
  } finally {
    exportingPdf.value = false;
  }
}

async function loadReport() {
  if (!canRead.value) return;
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/reporte-diario", {
      params: {
        fecha: filters.fecha || undefined,
      },
    });
    reportPayload.value = data?.data ?? data ?? null;
  } catch (e: any) {
    reportPayload.value = null;
    error.value = e?.response?.data?.message || "No se pudo cargar el reporte diario.";
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.fecha = currentDateInputValue();
  void loadReport();
}

onMounted(async () => {
  if (!canRead.value) return;
  await loadReport();
});
</script>

<style scoped>
.daily-report-page {
  --report-primary: 37, 99, 235;
  --report-success: 22, 163, 74;
  --report-warning: 217, 119, 6;
  --report-info: 8, 145, 178;
  --report-purple: 124, 58, 237;
  --report-orange: 234, 88, 12;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid rgba(var(--report-primary), 0.18);
  background:
    linear-gradient(130deg, rgba(var(--report-primary), 0.12), transparent 48%),
    rgb(var(--v-theme-surface));
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.report-hero__glow {
  position: absolute;
  z-index: -1;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  filter: blur(12px);
  pointer-events: none;
}

.report-hero__glow--one {
  top: -190px;
  right: 4%;
  background: rgba(var(--report-primary), 0.15);
}

.report-hero__glow--two {
  right: 30%;
  bottom: -245px;
  background: rgba(var(--report-info), 0.11);
}

.hero-wrap,
.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-wrap {
  align-items: flex-start;
  justify-content: space-between;
}

.report-hero__copy {
  max-width: 700px;
}

.report-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.report-hero__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 0 rgba(var(--report-primary), 0.35);
  animation: report-pulse 2.2s infinite;
}

.report-hero__title {
  margin: 8px 0 5px;
  font-size: clamp(1.65rem, 3vw, 2.25rem);
  font-weight: 850;
  letter-spacing: -0.035em;
  line-height: 1.08;
}

.report-hero__description {
  max-width: 640px;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.94rem;
  line-height: 1.6;
}

.report-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 17px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
  font-weight: 600;
}

.report-hero__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hero-actions {
  justify-content: flex-end;
}

.report-filter-panel {
  display: grid;
  grid-template-columns: minmax(250px, 1fr) minmax(190px, 240px) auto;
  gap: 16px;
  align-items: center;
  margin-top: 27px;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgba(var(--v-theme-surface), 0.74);
  backdrop-filter: blur(12px);
}

.report-filter-panel__intro {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-filter-panel__icon,
.daily-data-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--report-primary), 0.11);
}

.report-filter-panel__intro strong,
.report-filter-panel__intro span {
  display: block;
}

.report-filter-panel__intro strong {
  font-size: 0.87rem;
}

.report-filter-panel__intro span {
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.75rem;
}

.report-filter-panel__actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.summary-card {
  --summary-tone: var(--report-primary);
  position: relative;
  overflow: hidden;
  min-height: 145px;
  padding: 19px;
  border: 1px solid rgba(var(--summary-tone), 0.17);
  background:
    radial-gradient(circle at 100% 0%, rgba(var(--summary-tone), 0.14), transparent 44%),
    rgb(var(--v-theme-surface));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.summary-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--summary-tone), 0.34);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1);
}

.summary-card--success { --summary-tone: var(--report-success); }
.summary-card--warning { --summary-tone: var(--report-warning); }
.summary-card--primary { --summary-tone: var(--report-primary); }
.summary-card--orange { --summary-tone: var(--report-orange); }
.summary-card--info { --summary-tone: var(--report-info); }
.summary-card--purple { --summary-tone: var(--report-purple); }

.summary-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(var(--summary-tone), 0.95);
}

.summary-card__top > span {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.summary-card__icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: rgba(var(--summary-tone), 0.12);
}

.summary-card__value {
  margin-top: 15px;
  font-size: clamp(1.45rem, 2.5vw, 2rem);
  font-weight: 850;
  letter-spacing: -0.04em;
  line-height: 1;
}

.summary-card__label {
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8rem;
  font-weight: 600;
}

.daily-data-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: 0 15px 42px rgba(15, 23, 42, 0.07);
}

.daily-data-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 21px 22px 17px;
}

.daily-data-card__heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-tabs {
  margin: 0 18px;
  padding: 5px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.025);
}

.system-tabs :deep(.v-tab) {
  min-height: 41px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.015em;
  text-transform: none;
}

.system-tabs :deep(.v-tab--selected) {
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.08);
}

.daily-data-card__window {
  padding: 18px 18px 20px;
}

.table-context-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 4px 3px 14px;
}

.table-context-bar strong,
.table-context-bar span {
  display: block;
}

.table-context-bar strong {
  font-size: 0.86rem;
}

.table-context-bar span {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.57);
  font-size: 0.74rem;
}

.report-data-table {
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.report-data-table :deep(.v-table__wrapper) {
  scrollbar-color: rgba(var(--report-primary), 0.24) transparent;
}

.report-data-table :deep(thead th) {
  height: 48px !important;
  border-bottom: 1px solid rgba(var(--report-primary), 0.16) !important;
  background: linear-gradient(180deg, rgba(var(--report-primary), 0.1), rgba(var(--report-primary), 0.045)) !important;
  color: rgba(var(--v-theme-on-surface), 0.74) !important;
  font-size: 0.68rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.055em !important;
  text-transform: uppercase !important;
}

.report-data-table :deep(tbody td) {
  min-height: 48px;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.055) !important;
  color: rgba(var(--v-theme-on-surface), 0.79);
  font-size: 0.78rem;
}

.report-data-table :deep(tbody tr:nth-child(even)) {
  background: rgba(var(--v-theme-on-surface), 0.018);
}

.report-data-table :deep(tbody tr) {
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

.report-data-table :deep(tbody tr:hover) {
  background: rgba(var(--report-primary), 0.07) !important;
  box-shadow: inset 3px 0 rgb(var(--v-theme-primary));
}

.report-data-table :deep(.v-data-table-footer) {
  min-height: 58px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  background: rgba(var(--v-theme-on-surface), 0.018);
}

.table-empty-state {
  display: flex;
  min-height: 205px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.82rem;
  text-align: center;
}

.table-empty-state .v-icon {
  color: rgba(var(--report-primary), 0.62);
}

@keyframes report-pulse {
  70% { box-shadow: 0 0 0 8px rgba(var(--report-primary), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--report-primary), 0); }
}

@media (max-width: 959px) {
  .report-filter-panel {
    grid-template-columns: 1fr;
  }

  .report-filter-panel__field {
    max-width: 100%;
  }

  .report-filter-panel__actions,
  .hero-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 599px) {
  .hero-card {
    padding: 20px 16px;
  }

  .hero-actions,
  .hero-actions .v-btn,
  .report-filter-panel__actions,
  .report-filter-panel__actions .v-btn {
    width: 100%;
  }

  .daily-data-card__header,
  .table-context-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .system-tabs {
    margin-inline: 12px;
  }

  .daily-data-card__window {
    padding: 14px 12px 16px;
  }
}
</style>

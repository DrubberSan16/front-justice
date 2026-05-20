<template>
  <div class="daily-report-page">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar este modulo.
    </v-alert>

    <v-alert v-else-if="!canAccessReports" type="warning" variant="tonal">
      No tienes permisos para acceder a este reporte.
    </v-alert>

    <template v-else>
      <v-card rounded="xl" class="pa-5 enterprise-surface hero-card">
        <div class="d-flex align-center justify-space-between hero-wrap">
          <div>
            <div class="text-h6 font-weight-bold">Reporte diario</div>
            <div class="text-body-2 text-medium-emphasis">
              Consolida entradas y salidas de materiales del dia, junto con las ordenes pendientes y cerradas.
            </div>
          </div>
          <div class="d-flex align-center hero-actions">
            <v-chip label color="primary" variant="tonal">
              {{ generatedAtLabel }}
            </v-chip>
            <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadReport">
              Actualizar
            </v-btn>
          </div>
        </div>

        <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

        <v-row dense class="mt-4">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.fecha"
              type="date"
              label="Fecha"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="8" class="d-flex align-center justify-end flex-wrap" style="gap: 8px;">
            <v-chip label color="secondary" variant="tonal">
              {{ reportPayload?.filters?.label || "Sin fecha" }}
            </v-chip>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-filter-outline" :loading="loading" @click="loadReport">
              Aplicar filtro
            </v-btn>
            <v-btn variant="text" @click="clearFilters">Hoy</v-btn>
          </v-col>
        </v-row>
      </v-card>

      <v-row dense class="mt-2">
        <v-col v-for="card in summaryCards" :key="card.label" cols="12" sm="6" xl="3">
          <v-card rounded="lg" variant="outlined" class="pa-4 summary-card h-100">
            <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
            <div class="text-h5 font-weight-bold mt-2">{{ card.value }}</div>
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

      <v-card rounded="xl" class="pa-5 enterprise-surface mt-4">
        <LoadingTableState
          v-if="loading"
          message="Generando reporte diario..."
          :rows="6"
          :columns="5"
        />

        <template v-else>
          <v-tabs v-model="activeTab" color="primary" class="system-tabs">
            <v-tab value="movimientos">Movimientos ({{ movementRows.length }})</v-tab>
            <v-tab value="pendientes">OT pendientes ({{ pendingRows.length }})</v-tab>
            <v-tab value="cerradas">OT cerradas ({{ closedRows.length }})</v-tab>
          </v-tabs>

          <v-window v-model="activeTab" class="mt-4">
            <v-window-item value="movimientos">
              <v-data-table
                :headers="movementHeaders"
                :items="movementRows"
                density="compact"
                :items-per-page="10"
                class="table-enterprise enterprise-table"
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
                <template #bottom>
                  <div v-if="!movementRows.length" class="pa-4 text-medium-emphasis">
                    No hay movimientos de inventario para la fecha consultada.
                  </div>
                </template>
              </v-data-table>
            </v-window-item>

            <v-window-item value="pendientes">
              <v-data-table
                :headers="workOrderHeaders"
                :items="pendingRows"
                density="compact"
                :items-per-page="10"
                class="table-enterprise enterprise-table"
              >
                <template #item.status="{ item }">
                  <v-chip size="small" variant="tonal" color="info">
                    {{ item.status }}
                  </v-chip>
                </template>
                <template #item.fecha_evento="{ item }">
                  {{ formatDateTime(item.fecha_evento, "-") }}
                </template>
                <template #bottom>
                  <div v-if="!pendingRows.length" class="pa-4 text-medium-emphasis">
                    No hay ordenes de trabajo pendientes en la fecha consultada.
                  </div>
                </template>
              </v-data-table>
            </v-window-item>

            <v-window-item value="cerradas">
              <v-data-table
                :headers="workOrderHeaders"
                :items="closedRows"
                density="compact"
                :items-per-page="10"
                class="table-enterprise enterprise-table"
              >
                <template #item.status="{ item }">
                  <v-chip size="small" variant="tonal" color="success">
                    {{ item.status }}
                  </v-chip>
                </template>
                <template #item.fecha_evento="{ item }">
                  {{ formatDateTime(item.fecha_evento, "-") }}
                </template>
                <template #bottom>
                  <div v-if="!closedRows.length" class="pa-4 text-medium-emphasis">
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
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import { currentDateInputValue, formatDateTime } from "@/app/utils/date-time";

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
const loading = ref(false);
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
    { label: "Entradas del dia", value: formatNumber(summary.total_entradas) },
    { label: "Salidas del dia", value: formatNumber(summary.total_salidas) },
    { label: "Ingresos por compra", value: formatNumber(summary.ingresos_compra) },
    { label: "Salidas por OT", value: formatNumber(summary.salidas_ot) },
    { label: "Movimientos kardex", value: String(summary.movimientos_kardex ?? 0) },
    {
      label: "OT pendientes",
      value: String(summary.ordenes_pendientes ?? summary.ordenes_generadas ?? 0),
    },
    { label: "OT cerradas", value: String(summary.ordenes_cerradas ?? 0) },
    {
      label: "Materiales distintos",
      value: `${summary.materiales_ingresados_distintos ?? 0} / ${summary.materiales_salidos_distintos ?? 0}`,
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
.summary-card,
.hero-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.hero-wrap,
.hero-actions {
  gap: 12px;
  flex-wrap: wrap;
}
</style>

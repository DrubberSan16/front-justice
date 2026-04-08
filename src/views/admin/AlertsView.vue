<template>
  <v-card rounded="xl" class="pa-4 enterprise-surface">
    <div
      class="d-flex align-center justify-space-between mb-4"
      style="gap: 12px; flex-wrap: wrap;"
    >
      <div>
        <div class="text-h6 font-weight-bold">Alertas operativas</div>
        <div class="text-body-2 text-medium-emphasis">
          Bandeja consolidada de mantenimiento, operación, lubricantes, combustible e inventario.
        </div>
      </div>
      <div class="responsive-actions">
        <v-chip label color="warning" variant="tonal">
          {{ summary.totals?.abiertas ?? 0 }} abiertas
        </v-chip>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="refreshing"
          @click="refreshData()"
        >
          Actualizar vista
        </v-btn>
      </div>
    </div>

    <v-row dense class="mb-4">
      <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="3">
        <v-card rounded="lg" variant="outlined" class="pa-4 h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-subtitle-2 text-medium-emphasis">{{ card.label }}</div>
            <v-icon :icon="card.icon" size="20" />
          </div>
          <div class="text-h4 font-weight-bold">{{ card.value }}</div>
          <div class="text-body-2 text-medium-emphasis mt-2">{{ card.helper }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row dense class="mb-2">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="filters.search"
          label="Buscar"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          v-model="filters.estado"
          :items="stateOptions"
          label="Estado"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          v-model="filters.nivel"
          :items="levelOptions"
          label="Nivel"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          v-model="filters.categoria"
          :items="categoryOptions"
          label="Categoría"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          v-model="filters.origen"
          :items="originOptions"
          label="Origen"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
        />
      </v-col>
    </v-row>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-3"
      :text="error"
    />

    <v-row dense>
      <v-col cols="12" lg="9">
        <v-data-table
          :headers="headers"
          :items="filteredAlerts"
          :loading="loading"
          loading-text="Obteniendo alertas operativas..."
          class="elevation-0 enterprise-table alerts-table"
          :items-per-page="15"
        >
          <template #item.nivel="{ item }">
            <v-chip
              size="small"
              label
              :color="levelColor(resolveRow(item).nivel)"
              variant="tonal"
            >
              {{ resolveRow(item).nivel }}
            </v-chip>
          </template>

          <template #item.estado="{ item }">
            <v-chip
              size="small"
              label
              :color="stateColor(resolveRow(item).estado)"
              variant="tonal"
            >
              {{ resolveRow(item).estado }}
            </v-chip>
          </template>

          <template #item.title="{ item }">
            <div class="font-weight-bold">{{ resolveRow(item).title }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ resolveRow(item).subtitle }}
            </div>
            <div
              v-if="resolveRow(item).accion_sugerida"
              class="text-caption text-primary mt-1"
            >
              {{ resolveRow(item).accion_sugerida }}
            </div>
            <div
              v-if="inventoryAlertItems(resolveRow(item)).length"
              class="inventory-alert-table mt-3"
            >
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Bodega</th>
                    <th>Actual</th>
                    <th>Mínimo</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="inventoryItem in inventoryAlertItems(resolveRow(item))"
                    :key="String(inventoryItem.stock_id || inventoryItem.producto_id || inventoryItem.producto_label)"
                  >
                    <td>{{ inventoryItem.producto_label || "-" }}</td>
                    <td>{{ inventoryItem.bodega_label || "-" }}</td>
                    <td>{{ formatInventoryNumber(inventoryItem.stock_actual) }}</td>
                    <td>{{ formatInventoryNumber(inventoryItem.stock_min_bodega) }}</td>
                    <td>{{ inventoryItem.observacion || "-" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template #item.scope="{ item }">
            <div class="font-weight-medium">
              {{ resolveRow(item).equipo_label || resolveRow(item).referencia_resuelta }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ resolveRow(item).categoria }} · {{ resolveRow(item).origen }}
            </div>
          </template>

          <template #item.work_order_title="{ item }">
            <div v-if="resolveRow(item).work_order_count > 1">
              <div
                v-for="workOrder in resolveRow(item).work_orders"
                :key="workOrder.id"
                class="mb-2"
              >
                <div class="font-weight-medium">{{ workOrder.label }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ workOrder.status_workflow || "Sin estado" }}
                </div>
              </div>
            </div>
            <div v-else-if="resolveRow(item).work_order_title">
              <div class="font-weight-medium">{{ resolveRow(item).work_order_title }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ resolveRow(item).work_order_status || "Sin estado" }}
              </div>
            </div>
            <span v-else class="text-medium-emphasis">Sin OT</span>
          </template>

          <template #item.fecha_generada="{ item }">
            <div>{{ formatDate(resolveRow(item).fecha_generada) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ resolveRow(item).referencia_resuelta }}
            </div>
          </template>

          <template #bottom />

          <template #no-data>
            <div class="pa-4 text-medium-emphasis">
              No hay alertas que coincidan con los filtros seleccionados.
            </div>
          </template>
        </v-data-table>
      </v-col>

      <v-col cols="12" lg="3">
        <v-card rounded="lg" variant="outlined" class="pa-4 mb-3">
          <div class="text-subtitle-2 font-weight-bold mb-3">Categorías</div>
          <div
            v-for="item in summary.by_category ?? []"
            :key="item.categoria"
            class="d-flex align-center justify-space-between py-1"
          >
            <span>{{ item.categoria }}</span>
            <v-chip size="small" label>{{ item.total }}</v-chip>
          </div>
          <div
            v-if="!(summary.by_category ?? []).length"
            class="text-body-2 text-medium-emphasis"
          >
            Sin datos.
          </div>
        </v-card>

        <v-card rounded="lg" variant="outlined" class="pa-4">
          <div class="text-subtitle-2 font-weight-bold mb-3">Origen</div>
          <div
            v-for="item in summary.by_origin ?? []"
            :key="item.origen"
            class="d-flex align-center justify-space-between py-1"
          >
            <span>{{ item.origen }}</span>
            <v-chip size="small" label>{{ item.total }}</v-chip>
          </div>
          <div
            v-if="!(summary.by_origin ?? []).length"
            class="text-body-2 text-medium-emphasis"
          >
            Sin datos.
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { listAllPages } from "@/app/utils/list-all-pages";

type AlertRow = Record<string, any>;
type SelectOption = { title: string; value: string };

const ui = useUiStore();

const loading = ref(false);
const refreshing = ref(false);
const error = ref<string | null>(null);
const alerts = ref<AlertRow[]>([]);
const summary = ref<Record<string, any>>({
  totals: {
    total: 0,
    abiertas: 0,
    en_proceso: 0,
    resueltas: 0,
    cerradas: 0,
    critical: 0,
    warning: 0,
    info: 0,
  },
  by_category: [],
  by_origin: [],
});

const filters = reactive({
  search: "",
  estado: "TODOS",
  nivel: "TODOS",
  categoria: "TODAS",
  origen: "TODOS",
});

const stateOptions: SelectOption[] = [
  { title: "Todos", value: "TODOS" },
  { title: "Abierta", value: "ABIERTA" },
  { title: "En proceso", value: "EN_PROCESO" },
  { title: "Resuelta", value: "RESUELTA" },
  { title: "Cerrada", value: "CERRADA" },
];

const levelOptions: SelectOption[] = [
  { title: "Todos", value: "TODOS" },
  { title: "Critical", value: "CRITICAL" },
  { title: "Warning", value: "WARNING" },
  { title: "Info", value: "INFO" },
];

function normalizeBucketOptions(items: any[], key: string, allLabel: string) {
  const options: SelectOption[] = [{ title: allLabel, value: "TODOS" }];
  for (const item of items) {
    const value = String(item?.[key] || "").trim();
    if (!value || options.some((option) => option.value === value)) continue;
    options.push({ title: value, value });
  }
  return options;
}

const categoryOptions = computed(() =>
  normalizeBucketOptions(summary.value.by_category ?? [], "categoria", "Todas"),
);

const originOptions = computed(() =>
  normalizeBucketOptions(summary.value.by_origin ?? [], "origen", "Todos"),
);

const headers = [
  { title: "Nivel", key: "nivel", sortable: false },
  { title: "Estado", key: "estado", sortable: false },
  { title: "Alerta", key: "title", sortable: false },
  { title: "Ámbito", key: "scope", sortable: false },
  { title: "Orden de trabajo", key: "work_order_title", sortable: false },
  { title: "Generada", key: "fecha_generada", sortable: false },
];

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function resolveRow(item: any) {
  return item?.raw ?? item?._raw ?? item;
}

function inventoryAlertItems(item: any) {
  const payload = item?.payload_json;
  return Array.isArray(payload?.inventory_items) ? payload.inventory_items : [];
}

function levelColor(level: unknown) {
  const normalized = String(level || "").trim().toUpperCase();
  if (normalized === "CRITICAL") return "error";
  if (normalized === "WARNING") return "warning";
  return "success";
}

function stateColor(state: unknown) {
  const normalized = String(state || "").trim().toUpperCase();
  if (normalized === "ABIERTA") return "error";
  if (normalized === "EN_PROCESO") return "warning";
  if (normalized === "RESUELTA" || normalized === "CERRADA") return "success";
  return "secondary";
}

function formatDate(value: unknown) {
  if (!value) return "Sin fecha";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatInventoryNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const [alertsRes, summaryRes] = await Promise.all([
      listAllPages("/kpi_maintenance/alertas"),
      api.get("/kpi_maintenance/alertas/summary"),
    ]);
    alerts.value = asArray(alertsRes);
    summary.value = (summaryRes.data?.data ?? summaryRes.data ?? summary.value) as Record<
      string,
      any
    >;
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || "No se pudieron cargar las alertas operativas.";
  } finally {
    loading.value = false;
  }
}

async function refreshData() {
  refreshing.value = true;
  try {
    await loadData();
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || "No se pudo actualizar la vista de alertas.";
    ui.error(error.value ?? "No se pudo actualizar la vista de alertas.");
  } finally {
    refreshing.value = false;
  }
}

const filteredAlerts = computed(() => {
  const search = filters.search.trim().toLowerCase();

  return alerts.value.filter((item) => {
    const estado = String(item?.estado || "").trim().toUpperCase();
    const nivel = String(item?.nivel || "").trim().toUpperCase();
    const categoria = String(item?.categoria || "").trim().toUpperCase();
    const origen = String(item?.origen || "").trim().toUpperCase();
    const hayBusqueda =
      !search ||
      JSON.stringify(item)
        .toLowerCase()
        .includes(search);

    return (
      hayBusqueda &&
      (filters.estado === "TODOS" || estado === filters.estado) &&
      (filters.nivel === "TODOS" || nivel === filters.nivel) &&
      (filters.categoria === "TODAS" || categoria === filters.categoria) &&
      (filters.origen === "TODOS" || origen === filters.origen)
    );
  });
});

const kpiCards = computed(() => [
  {
    key: "open",
    label: "Abiertas",
    value: summary.value.totals?.abiertas ?? 0,
    helper: "Alertas que requieren atención inmediata",
    icon: "mdi-bell-alert-outline",
  },
  {
    key: "critical",
    label: "Críticas",
    value: summary.value.totals?.critical ?? 0,
    helper: "Riesgo alto para operación o mantenimiento",
    icon: "mdi-alert-octagon-outline",
  },
  {
    key: "inprogress",
    label: "En proceso",
    value: summary.value.totals?.en_proceso ?? 0,
    helper: "Alertas ya tomadas por una OT",
    icon: "mdi-progress-wrench",
  },
  {
    key: "resolved",
    label: "Resueltas/Cerradas",
    value:
      (summary.value.totals?.resueltas ?? 0) +
      (summary.value.totals?.cerradas ?? 0),
    helper: "Histórico ya atendido",
    icon: "mdi-check-decagram-outline",
  },
]);

onMounted(async () => {
  await refreshData();
});
</script>

<style scoped>
.alerts-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

.inventory-alert-table {
  max-width: 100%;
  overflow: auto;
  border: 1px solid rgba(120, 144, 156, 0.24);
  border-radius: 12px;
}

.inventory-alert-table table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 12px;
}

.inventory-alert-table th,
.inventory-alert-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(120, 144, 156, 0.16);
}

.inventory-alert-table th {
  position: sticky;
  top: 0;
  background: rgba(var(--v-theme-surface), 0.96);
  z-index: 1;
}

@media (max-width: 960px) {
  .alerts-table :deep(.v-data-table-footer__items-per-page),
  .alerts-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

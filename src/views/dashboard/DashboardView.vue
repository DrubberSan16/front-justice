<template>
  <v-container fluid class="dashboard-page">
    <v-row class="mb-4" align="stretch">
      <v-col cols="12" lg="8">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between" style="gap: 12px; flex-wrap: wrap;">
            <div>
              <div class="text-h6 font-weight-bold">Panel ejecutivo KPI</div>
              <div class="text-body-2 text-medium-emphasis">
                Resumen operativo consolidado desde seguridad, inventario y mantenimiento.
              </div>
            </div>
            <div class="d-flex align-center" style="gap: 8px; flex-wrap: wrap;">
              <v-chip label prepend-icon="mdi-account-circle-outline">{{ auth.user?.nameUser || "Usuario" }}</v-chip>
              <v-chip label prepend-icon="mdi-shield-account-outline">{{ auth.user?.role?.nombre || "Sin rol" }}</v-chip>
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="loadDashboard">
                Actualizar
              </v-btn>
            </div>
          </div>

          <v-divider class="my-4" />

          <v-alert v-if="error" type="warning" variant="tonal" class="mb-3" :text="error" />

          <v-row dense>
            <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="3">
              <v-card rounded="lg" variant="outlined" class="pa-4 kpi-card h-100">
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
      </v-col>

      <v-col cols="12" lg="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="text-subtitle-1 font-weight-bold mb-3">Estado operativo</div>

          <div class="status-row" v-for="status in workOrderStatusCards" :key="status.key">
            <div>
              <div class="text-body-1 font-weight-medium">{{ status.label }}</div>
              <div class="text-caption text-medium-emphasis">Órdenes de trabajo</div>
            </div>
            <v-chip label>{{ status.value }}</v-chip>
          </div>

          <v-divider class="my-4" />

          <div class="status-row">
            <div>
              <div class="text-body-1 font-weight-medium">Módulos principales</div>
              <div class="text-caption text-medium-emphasis">Menú raíz cargado</div>
            </div>
            <v-chip label>{{ menu.tree.length }}</v-chip>
          </div>

          <div class="status-row">
            <div>
              <div class="text-body-1 font-weight-medium">Última actualización</div>
              <div class="text-caption text-medium-emphasis">Sincronización del tablero</div>
            </div>
            <v-chip label>{{ lastUpdatedLabel }}</v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Alertas recientes</div>
            <v-chip label color="warning" variant="tonal">{{ openAlertsCount }} abiertas</v-chip>
          </div>

          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="alert in recentAlerts"
              :key="alert.id"
              :title="alert.title"
              :subtitle="alert.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!recentAlerts.length"
              title="Sin alertas recientes"
              subtitle="No hay datos disponibles en este momento."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Órdenes de trabajo recientes</div>
            <v-chip label color="primary" variant="tonal">{{ workOrders.length }} totales</v-chip>
          </div>

          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="order in recentWorkOrders"
              :key="order.id"
              :title="order.title"
              :subtitle="order.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!recentWorkOrders.length"
              title="Sin órdenes recientes"
              subtitle="No se encontraron órdenes de trabajo registradas."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Inventario crítico</div>
            <v-chip label color="error" variant="tonal">{{ lowStockItems.length }} bajo mínimo</v-chip>
          </div>

          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="item in lowStockPreview"
              :key="item.id"
              :title="item.title"
              :subtitle="item.subtitle"
              class="px-0"
            />
            <v-list-item
              v-if="!lowStockPreview.length"
              title="Sin stock crítico"
              subtitle="No hay productos por debajo del mínimo configurado."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";

type AnyRow = Record<string, any>;

const auth = useAuthStore();
const menu = useMenuStore();

const loading = ref(false);
const error = ref<string | null>(null);
const lastUpdatedAt = ref<Date | null>(null);

const users = ref<AnyRow[]>([]);
const roles = ref<AnyRow[]>([]);
const equipos = ref<AnyRow[]>([]);
const planes = ref<AnyRow[]>([]);
const alertas = ref<AnyRow[]>([]);
const workOrders = ref<AnyRow[]>([]);
const productos = ref<AnyRow[]>([]);
const stockRows = ref<AnyRow[]>([]);

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function normalizeWorkflowStatus(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (["PLANNED", "PLANIFICADA", "PLANIFICADO", "CREADA", "CREADO"].includes(raw)) return "PLANNED";
  if (["IN_PROGRESS", "IN PROGRESS", "EN PROCESO", "EN_PROCESO", "PROCESSING"].includes(raw)) return "IN_PROGRESS";
  if (["CLOSED", "CERRADA", "CERRADO", "DONE", "COMPLETED"].includes(raw)) return "CLOSED";
  return raw || "PLANNED";
}

function workflowLabel(value: unknown) {
  const normalized = normalizeWorkflowStatus(value);
  if (normalized === "PLANNED") return "Planificada";
  if (normalized === "IN_PROGRESS") return "En proceso";
  if (normalized === "CLOSED") return "Cerrada";
  return normalized;
}

async function listAll(endpoint: string, params: Record<string, any> = {}) {
  const out: any[] = [];
  const limit = 100;

  for (let page = 1; page <= 100; page += 1) {
    const { data } = await api.get(endpoint, { params: { page, limit, ...params } });
    const rows = asArray(data);
    out.push(...rows);

    const totalPages = Number(data?.pagination?.totalPages ?? data?.meta?.totalPages ?? 0);
    if (!rows.length || rows.length < limit || (totalPages > 0 && page >= totalPages)) {
      break;
    }
  }

  return out;
}

async function loadDashboard() {
  loading.value = true;
  error.value = null;

  try {
    const [
      usersRows,
      rolesRows,
      equiposRows,
      planesRows,
      alertasRows,
      workOrdersRows,
      productosRows,
      stockRowsResult,
    ] = await Promise.all([
      listAll("/kpi_security/users", { includeDeleted: false }),
      listAll("/kpi_security/roles", { includeDeleted: false }),
      listAll("/kpi_maintenance/equipos"),
      listAll("/kpi_maintenance/planes"),
      listAll("/kpi_maintenance/alertas"),
      listAll("/kpi_maintenance/work-orders"),
      listAll("/kpi_inventory/productos"),
      listAll("/kpi_inventory/stock-bodega"),
    ]);

    users.value = usersRows;
    roles.value = rolesRows;
    equipos.value = equiposRows;
    planes.value = planesRows;
    alertas.value = alertasRows;
    workOrders.value = workOrdersRows;
    productos.value = productosRows;
    stockRows.value = stockRowsResult;
    lastUpdatedAt.value = new Date();
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar el dashboard con las APIs disponibles.";
  } finally {
    loading.value = false;
  }
}

const openAlerts = computed(() =>
  alertas.value.filter((item) => {
    const status = String(item?.estado || "").toUpperCase();
    return !["CERRADA", "RESUELTA", "CLOSED"].includes(status);
  }),
);

const openAlertsCount = computed(() => openAlerts.value.length);

const workOrdersByStatus = computed(() => {
  const summary = {
    PLANNED: 0,
    IN_PROGRESS: 0,
    CLOSED: 0,
  };

  for (const item of workOrders.value) {
    const key = normalizeWorkflowStatus(item?.status_workflow);
    if (key in summary) summary[key as keyof typeof summary] += 1;
  }

  return summary;
});

const kpiCards = computed(() => [
  {
    key: "equipos",
    label: "Equipos",
    value: equipos.value.length,
    helper: `${planes.value.length} planes cargados`,
    icon: "mdi-cog-outline",
  },
  {
    key: "ots",
    label: "Órdenes de trabajo",
    value: workOrders.value.length,
    helper: `${workOrdersByStatus.value.IN_PROGRESS} en proceso`,
    icon: "mdi-clipboard-text-outline",
  },
  {
    key: "inventario",
    label: "Productos inventario",
    value: productos.value.length,
    helper: `${lowStockItems.value.length} bajo stock`,
    icon: "mdi-package-variant-closed",
  },
  {
    key: "seguridad",
    label: "Usuarios activos",
    value: users.value.filter((item) => String(item?.status || "ACTIVE").toUpperCase() === "ACTIVE").length,
    helper: `${roles.value.length} roles configurados`,
    icon: "mdi-account-group-outline",
  },
]);

const workOrderStatusCards = computed(() => [
  { key: "PLANNED", label: "Planificadas", value: workOrdersByStatus.value.PLANNED },
  { key: "IN_PROGRESS", label: "En proceso", value: workOrdersByStatus.value.IN_PROGRESS },
  { key: "CLOSED", label: "Cerradas", value: workOrdersByStatus.value.CLOSED },
]);

const recentAlerts = computed(() =>
  [...alertas.value]
    .sort((a, b) => new Date(b?.fecha_generada || 0).getTime() - new Date(a?.fecha_generada || 0).getTime())
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: `${item?.tipo_alerta || "Alerta"} · ${item?.equipo_id || "Sin equipo"}`,
      subtitle: `${item?.estado || "Sin estado"}${item?.detalle ? ` · ${item.detalle}` : ""}`,
    })),
);

const recentWorkOrders = computed(() =>
  [...workOrders.value]
    .sort((a, b) => String(b?.code || "").localeCompare(String(a?.code || "")))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: `${item?.code || "Sin código"} · ${item?.title || "Sin título"}`,
      subtitle: `${workflowLabel(item?.status_workflow)} · ${item?.maintenance_kind || "Sin tipo"}`,
    })),
);

const lowStockItems = computed(() =>
  stockRows.value.filter((item) => {
    const stock = Number(item?.stock_actual || 0);
    const min = Number(item?.stock_min_bodega || 0);
    return min > 0 && stock <= min;
  }),
);

const productNameMap = computed(() =>
  productos.value.reduce((acc: Record<string, string>, item) => {
    acc[String(item.id)] = item?.nombre || item?.codigo || item?.id;
    return acc;
  }, {}),
);

const lowStockPreview = computed(() =>
  lowStockItems.value.slice(0, 5).map((item) => ({
    id: item.id,
    title: productNameMap.value[String(item?.producto_id)] || String(item?.producto_id || "Producto"),
    subtitle: `Stock actual: ${item?.stock_actual || 0} · mínimo: ${item?.stock_min_bodega || 0}`,
  })),
);

const lastUpdatedLabel = computed(() => {
  if (!lastUpdatedAt.value) return "Sin datos";
  return lastUpdatedAt.value.toLocaleString();
});

onMounted(() => {
  loadDashboard();
});
</script>

<style scoped>
.dashboard-page {
  gap: 12px;
}

.kpi-card {
  border-color: rgba(255, 255, 255, 0.08);
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}

.h-100 {
  height: 100%;
}
</style>

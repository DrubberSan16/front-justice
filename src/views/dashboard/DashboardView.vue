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
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-chart-timeline-variant"
                @click="router.push({ name: 'inteligencia-mantenimiento' })"
              >
                Inteligencia
              </v-btn>
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="loadDashboard">
                Actualizar
              </v-btn>
            </div>
          </div>

          <v-divider class="my-4" />

          <v-alert v-if="error" type="warning" variant="tonal" class="mb-3" :text="error" />

          <div class="d-flex align-center flex-wrap period-toolbar mb-4">
            <v-select
              v-model="selectedYear"
              :items="yearOptions"
              label="Año"
              density="comfortable"
              hide-details
              variant="outlined"
              class="period-toolbar__select"
            />
            <v-select
              v-model="selectedMonth"
              :items="monthOptions"
              label="Mes"
              density="comfortable"
              hide-details
              variant="outlined"
              class="period-toolbar__select period-toolbar__select--month"
            />
            <v-chip label color="primary" variant="tonal">
              {{ selectedPeriodLabel }}
            </v-chip>
          </div>

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
            <v-chip label color="primary" variant="tonal">{{ filteredWorkOrders.length }} totales</v-chip>
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

    <v-row>
      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3" style="gap: 12px; flex-wrap: wrap;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Indicadores de proceso</div>
              <div class="text-body-2 text-medium-emphasis">Seguimiento documental y operativo.</div>
            </div>
            <v-chip label color="secondary" variant="tonal">{{ processIndicatorCards.length }} KPI</v-chip>
          </div>

          <div class="process-indicator-grid">
            <div v-for="item in processIndicatorCards" :key="item.key" class="process-indicator-item">
              <div class="text-caption text-medium-emphasis">{{ item.label }}</div>
              <div class="text-h6 font-weight-bold">{{ item.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.helper }}</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Reporte diario de operacion</div>
            <v-chip label color="success" variant="tonal">{{ operationScheduleSummary.days }} días programados</v-chip>
          </div>

          <div v-if="operationScheduleDays.length" class="dashboard-stack">
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedPeriodLabel }}<span v-if="latestDailyReport?.codigo"> · Último reporte real {{ latestDailyReport.codigo }}</span>
            </div>

            <div class="summary-strip">
              <v-chip size="small" label color="primary" variant="tonal">Actividades: {{ operationScheduleSummary.activities }}</v-chip>
              <v-chip size="small" label color="secondary" variant="tonal">Horas: {{ operationScheduleSummary.hoursLabel }}</v-chip>
              <v-chip size="small" label color="info" variant="tonal">Reportes reales: {{ filteredDailyReports.length }}</v-chip>
            </div>

            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="item in operationScheduleDays.slice(0, 6)"
                :key="item.date"
                :title="item.title"
                :subtitle="item.subtitle"
                class="px-0"
              />
            </v-list>
          </div>

          <div v-else-if="latestDailyReport" class="dashboard-stack">
            <div class="text-body-2 text-medium-emphasis">
              {{ latestDailyReport.fecha_reporte || "Sin fecha" }}<span v-if="latestDailyReport.turno"> · {{ latestDailyReport.turno }}</span><span v-if="latestDailyReport.locacion"> · {{ latestDailyReport.locacion }}</span>
            </div>

            <div class="summary-strip">
              <v-chip size="small" label color="primary" variant="tonal">Unidades: {{ latestDailyUnits.length }}</v-chip>
              <v-chip size="small" label color="warning" variant="tonal">Combustible: {{ latestDailyFuel.length }}</v-chip>
              <v-chip size="small" label color="error" variant="tonal">Componentes: {{ latestDailyComponents.length }}</v-chip>
            </div>

            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="unit in latestDailyUnits"
                :key="unit.id"
                :title="unit.equipo_codigo || 'Sin equipo'"
                :subtitle="`Horometro ${unit.horometro_actual ?? 'N/A'} · MPG ${unit.mpg_actual ?? 'N/A'}`"
                class="px-0"
              />
              <v-list-item
                v-if="!latestDailyUnits.length"
                title="Sin unidades registradas"
                subtitle="El reporte diario aun no tiene unidades asociadas."
                class="px-0"
              />
            </v-list>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">No hay programación semanal OPERACION/MPG ni reportes diarios para el período seleccionado.</div>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Cronograma semanal</div>
            <v-chip label color="info" variant="tonal">{{ latestWeeklySchedule?.codigo || "Sin cronograma" }}</v-chip>
          </div>

          <div v-if="latestWeeklySchedule" class="dashboard-stack">
            <div class="text-body-2 text-medium-emphasis">
              {{ latestWeeklySchedule.fecha_inicio || "Sin fecha" }} / {{ latestWeeklySchedule.fecha_fin || "Sin fecha" }}<span v-if="latestWeeklySchedule.locacion"> · {{ latestWeeklySchedule.locacion }}</span>
            </div>

            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="activity in latestWeeklyActivities"
                :key="activity.id"
                :title="activity.actividad || 'Actividad sin nombre'"
                :subtitle="`${normalizeDayLabel(activity.dia_semana)}${activity.hora_inicio ? ` · ${activity.hora_inicio}` : ''}${activity.equipo_codigo ? ` · ${activity.equipo_codigo}` : ''}`"
                class="px-0"
              />
              <v-list-item
                v-if="!latestWeeklyActivities.length"
                title="Sin actividades programadas"
                subtitle="El cronograma aun no tiene actividades registradas."
                class="px-0"
              />
            </v-list>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">Aun no existen cronogramas semanales cargados.</div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";

type AnyRow = Record<string, any>;

const auth = useAuthStore();
const menu = useMenuStore();
const router = useRouter();

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
const intelligenceSummary = ref<AnyRow>({});
const weeklySchedules = ref<AnyRow[]>([]);
const dailyReports = ref<AnyRow[]>([]);
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);

const monthOptions = [
  { value: 1, title: "Enero" },
  { value: 2, title: "Febrero" },
  { value: 3, title: "Marzo" },
  { value: 4, title: "Abril" },
  { value: 5, title: "Mayo" },
  { value: 6, title: "Junio" },
  { value: 7, title: "Julio" },
  { value: 8, title: "Agosto" },
  { value: 9, title: "Septiembre" },
  { value: 10, title: "Octubre" },
  { value: 11, title: "Noviembre" },
  { value: 12, title: "Diciembre" },
];

const yearOptions = Array.from({ length: 101 }, (_, index) => 2000 + index)
  .reverse()
  .map((value) => ({ value, title: String(value) }));

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
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

function normalizeDayLabel(value: unknown) {
  return String(value || "Sin dia")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeProcessType(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function buildMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function parseDateValue(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDurationHours(startValue: unknown, endValue: unknown) {
  const start = String(startValue || "").trim();
  const end = String(endValue || "").trim();
  const startMatch = /^(\d{1,2}):(\d{2})$/.exec(start);
  const endMatch = /^(\d{1,2}):(\d{2})$/.exec(end);
  if (!startMatch || !endMatch) return 0;
  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) return 0;
  return (endMinutes - startMinutes) / 60;
}

const selectedPeriodRange = computed(() => buildMonthRange(selectedYear.value, selectedMonth.value));
const selectedPeriodLabel = computed(() =>
  new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(
    new Date(selectedYear.value, selectedMonth.value - 1, 1),
  ),
);

function isInSelectedPeriod(value: unknown) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return parsed >= selectedPeriodRange.value.start && parsed <= selectedPeriodRange.value.end;
}

function overlapsSelectedPeriod(fromValue: unknown, toValue: unknown) {
  const from = parseDateValue(fromValue);
  const to = parseDateValue(toValue || fromValue);
  if (!from && !to) return false;
  const start = from ?? to;
  const end = to ?? from;
  if (!start || !end) return false;
  return start <= selectedPeriodRange.value.end && end >= selectedPeriodRange.value.start;
}

function resolveWorkOrderDate(row: AnyRow) {
  return row?.scheduled_start || row?.created_at || row?.updated_at || row?.closed_at || null;
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
      intelligenceSummaryRes,
      weeklySchedulesRes,
      dailyReportsRes,
    ] = await Promise.all([
      listAll("/kpi_security/users", { includeDeleted: false }),
      listAll("/kpi_security/roles", { includeDeleted: false }),
      listAll("/kpi_maintenance/equipos"),
      listAll("/kpi_maintenance/planes"),
      listAll("/kpi_maintenance/alertas"),
      listAll("/kpi_maintenance/work-orders"),
      listAll("/kpi_inventory/productos"),
      listAll("/kpi_inventory/stock-bodega"),
      api.get("/kpi_maintenance/inteligencia/summary", {
        params: { year: selectedYear.value, month: selectedMonth.value },
      }),
      api.get("/kpi_maintenance/inteligencia/cronogramas-semanales"),
      api.get("/kpi_maintenance/inteligencia/reportes-diarios"),
    ]);

    users.value = usersRows;
    roles.value = rolesRows;
    equipos.value = equiposRows;
    planes.value = planesRows;
    alertas.value = alertasRows;
    workOrders.value = workOrdersRows;
    productos.value = productosRows;
    stockRows.value = stockRowsResult;
    intelligenceSummary.value = unwrap(intelligenceSummaryRes.data, {});
    weeklySchedules.value = unwrap(weeklySchedulesRes.data, []);
    dailyReports.value = unwrap(dailyReportsRes.data, []);
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
  }).filter((item) => isInSelectedPeriod(item?.fecha_generada || item?.created_at || item?.updated_at)),
);

const openAlertsCount = computed(() => openAlerts.value.length);
const filteredWorkOrders = computed(() =>
  workOrders.value.filter((item) => isInSelectedPeriod(resolveWorkOrderDate(item))),
);
const filteredDailyReports = computed(() =>
  dailyReports.value.filter((item) => isInSelectedPeriod(item?.fecha_reporte || item?.created_at)),
);
const filteredWeeklySchedules = computed(() =>
  weeklySchedules.value.filter((item) =>
    overlapsSelectedPeriod(
      item?.fecha_inicio || item?.created_at,
      item?.fecha_fin || item?.fecha_inicio || item?.created_at,
    ),
  ),
);
const activeEquipmentCount = computed(() => {
  const keys = new Set<string>();
  for (const report of filteredDailyReports.value) {
    for (const unit of report?.unidades ?? []) {
      const key = String(unit?.equipo_id || unit?.equipo_codigo || "").trim();
      if (key) keys.add(key);
    }
  }
  for (const schedule of filteredWeeklySchedules.value) {
    for (const detail of schedule?.detalles ?? []) {
      const key = String(detail?.equipo_id || detail?.equipo_codigo || "").trim();
      if (key) keys.add(key);
    }
  }
  return keys.size;
});

const workOrdersByStatus = computed(() => {
  const summary = {
    PLANNED: 0,
    IN_PROGRESS: 0,
    CLOSED: 0,
  };

  for (const item of filteredWorkOrders.value) {
    const key = normalizeWorkflowStatus(item?.status_workflow);
    if (key in summary) summary[key as keyof typeof summary] += 1;
  }

  return summary;
});

const kpiCards = computed(() => [
  {
    key: "equipos",
    label: "Equipos",
    value: activeEquipmentCount.value,
    helper: `Con actividad en ${selectedPeriodLabel.value}`,
    icon: "mdi-cog-outline",
  },
  {
    key: "ots",
    label: "Órdenes de trabajo",
    value: filteredWorkOrders.value.length,
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
  [...openAlerts.value]
    .sort((a, b) => new Date(b?.fecha_generada || 0).getTime() - new Date(a?.fecha_generada || 0).getTime())
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: `${item?.tipo_alerta || "Alerta"} · ${item?.equipo_id || "Sin equipo"}`,
      subtitle: `${item?.estado || "Sin estado"}${item?.detalle ? ` · ${item.detalle}` : ""}`,
    })),
);

const recentWorkOrders = computed(() =>
  [...filteredWorkOrders.value]
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

const processIndicatorCards = computed(() => [
  {
    key: "programaciones_vencidas",
    label: "Programaciones vencidas",
    value: intelligenceSummary.value?.kpis?.programaciones_vencidas ?? 0,
    helper: "Control preventivo fuera de ventana",
  },
  {
    key: "work_orders_pendientes",
    label: "OT pendientes",
    value: intelligenceSummary.value?.kpis?.work_orders_pendientes ?? 0,
    helper: "Ordenes pendientes o en proceso",
  },
  {
    key: "eventos_proceso",
    label: "Eventos KPI",
    value: intelligenceSummary.value?.kpis?.eventos_proceso ?? 0,
    helper: "Notificaciones por proceso principal",
  },
  {
    key: "componentes_monitoreados",
    label: "Componentes monitoreados",
    value: intelligenceSummary.value?.kpis?.componentes_monitoreados ?? 0,
    helper: "Indicador dinamico desde reporte diario",
  },
]);

const latestDailyReport = computed(() => filteredDailyReports.value[0] ?? null);
const latestDailyUnits = computed(() => (latestDailyReport.value?.unidades ?? []).slice(0, 4));
const latestDailyFuel = computed(() => (latestDailyReport.value?.combustibles ?? []).slice(0, 3));
const latestDailyComponents = computed(() => (latestDailyReport.value?.componentes ?? []).slice(0, 3));

const latestWeeklySchedule = computed(() => filteredWeeklySchedules.value[0] ?? null);
const latestWeeklyActivities = computed(() =>
  [...(latestWeeklySchedule.value?.detalles ?? [])]
    .sort(
      (a, b) =>
        String(a?.dia_semana || "").localeCompare(String(b?.dia_semana || "")) ||
        String(a?.hora_inicio || "").localeCompare(String(b?.hora_inicio || "")),
    )
    .slice(0, 6),
);

const operationScheduleItems = computed(() =>
  filteredWeeklySchedules.value
    .flatMap((schedule) =>
      (schedule?.detalles ?? [])
        .filter((detail: AnyRow) => {
          const process = normalizeProcessType(detail?.tipo_proceso);
          return ["OPERACION", "MPG"].includes(process) && isInSelectedPeriod(detail?.fecha_actividad || schedule?.fecha_inicio);
        })
        .map((detail: AnyRow) => ({
          ...detail,
          cronograma_codigo: schedule?.codigo || null,
          fecha_resuelta: detail?.fecha_actividad || schedule?.fecha_inicio || null,
          duracion_horas: parseDurationHours(detail?.hora_inicio, detail?.hora_fin),
        })),
    )
    .sort(
      (a, b) =>
        (parseDateValue(a?.fecha_resuelta)?.getTime() ?? 0) -
          (parseDateValue(b?.fecha_resuelta)?.getTime() ?? 0) ||
        String(a?.hora_inicio || "").localeCompare(String(b?.hora_inicio || "")),
    ),
);

const operationScheduleDays = computed(() => {
  const grouped = new Map<
    string,
    { date: string; count: number; totalHours: number; activities: string[]; equipments: string[] }
  >();

  for (const item of operationScheduleItems.value) {
    const date = String(item?.fecha_resuelta || "").slice(0, 10);
    if (!date) continue;
    const current = grouped.get(date) ?? {
      date,
      count: 0,
      totalHours: 0,
      activities: [],
      equipments: [],
    };
    current.count += 1;
    current.totalHours += Number(item?.duracion_horas || 0);
    if (item?.actividad) current.activities.push(String(item.actividad));
    if (item?.equipo_codigo) current.equipments.push(String(item.equipo_codigo));
    grouped.set(date, current);
  }

  return [...grouped.values()]
    .sort((a, b) => (parseDateValue(a.date)?.getTime() ?? 0) - (parseDateValue(b.date)?.getTime() ?? 0))
    .map((item) => ({
      ...item,
      title: new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "long", year: "numeric" }).format(
        parseDateValue(item.date) ?? new Date(),
      ),
      subtitle: `${item.count} actividades · ${item.totalHours.toFixed(1)} h${
        item.equipments.length ? ` · ${[...new Set(item.equipments)].slice(0, 3).join(", ")}` : ""
      }`,
    }));
});

const operationScheduleSummary = computed(() => {
  const totalHours = operationScheduleItems.value.reduce((acc, item) => acc + Number(item?.duracion_horas || 0), 0);
  return {
    days: operationScheduleDays.value.length,
    activities: operationScheduleItems.value.length,
    totalHours,
    hoursLabel: `${totalHours.toFixed(1)} h`,
  };
});

const lastUpdatedLabel = computed(() => {
  if (!lastUpdatedAt.value) return "Sin datos";
  return lastUpdatedAt.value.toLocaleString();
});

onMounted(() => {
  loadDashboard();
});

watch([selectedYear, selectedMonth], () => {
  loadDashboard();
});
</script>

<style scoped>
.dashboard-page {
  gap: 12px;
}

.period-toolbar {
  gap: 12px;
}

.period-toolbar__select {
  min-width: 120px;
}

.period-toolbar__select--month {
  min-width: 180px;
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

.process-indicator-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.process-indicator-item {
  padding: 14px;
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  background: var(--surface-soft);
}

.dashboard-stack {
  display: grid;
  gap: 12px;
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.h-100 {
  height: 100%;
}

@media (max-width: 768px) {
  .period-toolbar__select,
  .period-toolbar__select--month {
    min-width: 100%;
  }
}
</style>

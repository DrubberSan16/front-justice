<template>
  <v-container fluid class="dashboard-page">
    <v-alert v-if="!canAccessDashboardReports" type="warning" variant="tonal">
      No tienes permisos para acceder a este reporte.
    </v-alert>

    <div v-else class="dashboard-content">
    <v-row class="mb-4 dashboard-hero-grid" align="stretch">
      <v-col cols="12" lg="8">
        <v-card rounded="xl" class="dashboard-hero enterprise-surface h-100">
          <div class="dashboard-hero__glow dashboard-hero__glow--primary" />
          <div class="dashboard-hero__glow dashboard-hero__glow--secondary" />

          <div class="dashboard-hero__header">
            <div class="dashboard-hero__copy">
              <div class="dashboard-hero__eyebrow">
                <span class="dashboard-hero__pulse" />
                Centro de control ejecutivo
              </div>
              <h1 class="dashboard-hero__title">Panel ejecutivo KPI</h1>
              <p class="dashboard-hero__description">
                Una lectura consolidada de mantenimiento, inventario, seguridad y operación.
              </p>
              <div class="dashboard-hero__identity">
                <span><v-icon icon="mdi-account-circle-outline" size="16" />{{ auth.user?.nameUser || "Usuario" }}</span>
                <span><v-icon icon="mdi-shield-account-outline" size="16" />{{ auth.user?.role?.nombre || "Sin rol" }}</span>
              </div>
            </div>

            <div class="dashboard-hero__actions">
              <v-btn
                v-if="canAccessDashboardReports"
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-file-excel"
                :loading="isExporting('excel')"
                @click="exportDashboard('excel')"
              >
                Exportar Excel
              </v-btn>
              <v-btn
                v-if="canAccessDashboardReports"
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-file-pdf-box"
                :loading="isExporting('pdf')"
                @click="exportDashboard('pdf')"
              >
                Exportar PDF
              </v-btn>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-chart-timeline-variant"
                :disabled="!canAccessIntelligenceView"
                @click="router.push({ name: 'inteligencia-mantenimiento' })"
              >
                Ver inteligencia
              </v-btn>
              <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadDashboard">
                Actualizar
              </v-btn>
            </div>
          </div>

          <v-alert v-if="error" type="warning" variant="tonal" class="mb-3" :text="error" />

          <div class="period-toolbar">
            <div class="period-toolbar__intro">
              <div class="period-toolbar__icon"><v-icon icon="mdi-calendar-filter-outline" size="21" /></div>
              <div>
                <strong>Período de análisis</strong>
                <span>Los indicadores se actualizan automáticamente.</span>
              </div>
            </div>
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

          <v-row dense class="dashboard-kpi-grid">
            <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="3">
              <v-card
                rounded="xl"
                class="kpi-card h-100"
                :style="{ '--kpi-accent': card.accent }"
              >
                <div class="kpi-card__top">
                  <div class="kpi-card__icon"><v-icon :icon="card.icon" size="22" /></div>
                  <span class="kpi-card__index">KPI</span>
                </div>
                <div class="kpi-card__value-row">
                  <div class="kpi-card__value">{{ card.value }}</div>
                </div>
                <div class="kpi-card__label">{{ card.label }}</div>
                <div class="kpi-card__helper">{{ card.helper }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card rounded="xl" class="dashboard-status-card enterprise-surface h-100">
          <div class="dashboard-status-card__header">
            <div class="dashboard-status-card__title-icon"><v-icon icon="mdi-pulse" size="22" /></div>
            <div>
              <div class="text-subtitle-1 font-weight-bold">Estado operativo</div>
              <div class="text-caption text-medium-emphasis">Avance de órdenes del período</div>
            </div>
          </div>

          <div
            v-for="status in workOrderStatusCards"
            :key="status.key"
            :class="['status-row', `status-row--${status.tone}`]"
          >
            <div class="status-row__main">
              <div class="status-row__icon"><v-icon :icon="status.icon" size="19" /></div>
              <div>
                <div class="text-body-2 font-weight-bold">{{ status.label }}</div>
                <div class="text-caption text-medium-emphasis">Órdenes de trabajo</div>
              </div>
            </div>
            <strong class="status-row__value">{{ status.value }}</strong>
            <div class="status-row__track">
              <div
                class="status-row__fill"
                :style="{ width: `${status.value ? Math.max(5, (status.value / Math.max(filteredWorkOrders.length, 1)) * 100) : 0}%` }"
              />
            </div>
          </div>

          <div class="dashboard-status-card__footer">
            <div class="dashboard-status-meta">
              <v-icon icon="mdi-view-grid-outline" size="19" />
              <div>
                <span>Módulos principales</span>
                <strong>{{ menu.tree.length }}</strong>
              </div>
            </div>
            <div class="dashboard-status-meta">
              <v-icon icon="mdi-clock-check-outline" size="19" />
              <div>
                <span>Última actualización</span>
                <strong>{{ lastUpdatedLabel }}</strong>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-1">
      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Distribución de órdenes"
          subtitle="Balance del flujo de trabajo en el período"
          :chip-label="`${filteredWorkOrders.length} OT`"
          chip-color="primary"
          :items="workOrderStatusChartItems"
        />
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Severidad de alertas"
          subtitle="Cómo viene la presión operativa del mes"
          :chip-label="`${openAlertsCount} abiertas`"
          chip-color="warning"
          :items="alertSeverityChartItems"
        />
      </v-col>

      <v-col cols="12" xl="4">
        <DashboardBarChartCard
          title="Cadencia operativa"
          subtitle="Horas programadas por día desde el cronograma semanal"
          :chip-label="operationScheduleSummary.hoursLabel"
          chip-color="success"
          :items="operationCadenceChartItems"
          empty-text="No hay programación semanal OPERACION/MPG para graficar en este período."
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Alertas recientes</div>
            <v-chip label color="warning" variant="tonal">{{ openAlertsCount }} abiertas</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando alertas recientes..." :rows="5" :columns="4" />
          <div v-else class="dashboard-table-shell">
            <v-table density="compact" class="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="alert in recentAlertsTableRows" :key="alert.id">
                  <td class="font-weight-medium">{{ alert.tipo }}</td>
                  <td>{{ alert.equipo }}</td>
                  <td>
                    <v-chip size="x-small" label color="warning" variant="tonal">{{ alert.estado }}</v-chip>
                  </td>
                  <td class="text-medium-emphasis">{{ alert.detalle }}</td>
                </tr>
                <tr v-if="!recentAlertsTableRows.length">
                  <td colspan="4" class="text-center text-medium-emphasis py-4">
                    Sin alertas recientes para el período seleccionado.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Órdenes de trabajo recientes</div>
            <v-chip label color="primary" variant="tonal">{{ filteredWorkOrders.length }} totales</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando órdenes de trabajo..." :rows="5" :columns="4" />
          <div v-else class="dashboard-table-shell">
            <v-table density="compact" class="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentWorkOrdersTableRows" :key="order.id">
                  <td class="font-weight-medium">{{ order.codigo }}</td>
                  <td>{{ order.titulo }}</td>
                  <td>{{ order.equipo }}</td>
                  <td>
                    <v-chip size="x-small" label color="primary" variant="tonal">{{ order.estado }}</v-chip>
                  </td>
                </tr>
                <tr v-if="!recentWorkOrdersTableRows.length">
                  <td colspan="4" class="text-center text-medium-emphasis py-4">
                    Sin órdenes de trabajo registradas para este período.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Inventario crítico</div>
            <v-chip label color="error" variant="tonal">{{ lowStockItems.length }} bajo mínimo</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando inventario crítico..." :rows="6" :columns="3" />
          <div v-else class="dashboard-stack">
            <div class="summary-strip">
              <v-chip size="small" label color="error" variant="tonal">
                {{ lowStockByWarehouse.length }} bodegas impactadas
              </v-chip>
              <v-chip size="small" label color="secondary" variant="tonal">
                {{ criticalInventoryRows.length }} materiales visibles
              </v-chip>
            </div>

            <div class="dashboard-mini-bars">
              <div
                v-for="item in lowStockByWarehouse"
                :key="item.key"
                class="dashboard-mini-bars__row"
              >
                <div class="dashboard-mini-bars__meta">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.valueLabel }}</strong>
                </div>
                <div class="dashboard-mini-bars__track">
                  <div
                    class="dashboard-mini-bars__fill dashboard-mini-bars__fill--danger"
                    :style="{ width: `${Math.max(8, (item.value / Math.max(...lowStockByWarehouse.map((row) => row.value), 1)) * 100)}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Bodega</th>
                    <th>Disponible</th>
                    <th>Mín.</th>
                    <th>Déficit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in criticalInventoryRows" :key="item.id">
                    <td class="font-weight-medium">{{ item.producto }}</td>
                    <td>{{ item.bodega }}</td>
                    <td>{{ item.stock }}</td>
                    <td>{{ item.min }}</td>
                    <td>
                      <v-chip size="x-small" label color="error" variant="tonal">{{ item.deficit }}</v-chip>
                    </td>
                  </tr>
                  <tr v-if="!criticalInventoryRows.length">
                    <td colspan="5" class="text-center text-medium-emphasis py-4">
                      No hay productos por debajo del mínimo configurado.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Indicadores de proceso"
          subtitle="Seguimiento documental y operativo"
          :chip-label="`${processIndicatorCards.length} KPI`"
          chip-color="secondary"
          :items="processIndicatorCards.map((item) => ({
            key: item.key,
            label: item.label,
            value: Number(item.value || 0),
            valueLabel: formatCompactNumber(item.value),
            helper: item.helper,
            color: 'linear-gradient(90deg, #3f62d8 0%, #9eaefc 100%)',
          }))"
        />
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Reporte diario de operacion</div>
            <v-chip label color="success" variant="tonal">{{ operationScheduleSummary.days }} días programados</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando reporte diario de operación..." :rows="6" :columns="3" />
          <div v-else-if="operationScheduleDays.length" class="dashboard-stack">
            <div class="summary-strip">
              <v-chip size="small" label color="primary" variant="tonal">Actividades: {{ operationScheduleSummary.activities }}</v-chip>
              <v-chip size="small" label color="secondary" variant="tonal">Horas: {{ operationScheduleSummary.hoursLabel }}</v-chip>
              <v-chip size="small" label color="info" variant="tonal">Reportes reales: {{ filteredDailyReports.length }}</v-chip>
            </div>

            <div class="dashboard-mini-bars">
              <div
                v-for="item in operationScheduleDays.slice(0, 7)"
                :key="item.date"
                class="dashboard-mini-bars__row"
              >
                <div class="dashboard-mini-bars__meta">
                  <span>{{ item.title }}</span>
                  <strong>{{ Number(item.totalHours || 0).toFixed(1) }} h</strong>
                </div>
                <div class="dashboard-mini-bars__track">
                  <div
                    class="dashboard-mini-bars__fill dashboard-mini-bars__fill--success"
                    :style="{ width: `${Math.max(8, (Number(item.totalHours || 0) / Math.max(...operationScheduleDays.map((row) => Number(row.totalHours || 0)), 1)) * 100)}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Actividades</th>
                    <th>Horas</th>
                    <th>Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in operationScheduleDays.slice(0, 7)" :key="item.date">
                    <td class="font-weight-medium">{{ item.title }}</td>
                    <td>{{ item.count }}</td>
                    <td>{{ Number(item.totalHours || 0).toFixed(1) }}</td>
                    <td class="text-medium-emphasis">{{ item.subtitle }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>

          <div v-else-if="latestDailyReport" class="dashboard-stack">
            <div class="summary-strip">
              <v-chip size="small" label color="primary" variant="tonal">Unidades: {{ latestDailyUnits.length }}</v-chip>
              <v-chip size="small" label color="warning" variant="tonal">Combustible: {{ latestDailyFuel.length }}</v-chip>
            </div>
            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Horómetro</th>
                    <th>MPG</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="unit in latestDailyUnits" :key="unit.id">
                    <td class="font-weight-medium">{{ unit.equipo_codigo || "Sin equipo" }}</td>
                    <td>{{ unit.horometro_actual ?? "N/A" }}</td>
                    <td>{{ unit.mpg_actual ?? "N/A" }}</td>
                  </tr>
                  <tr v-if="!latestDailyUnits.length">
                    <td colspan="3" class="text-center text-medium-emphasis py-4">
                      El reporte diario aún no tiene unidades asociadas.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
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

          <LoadingTableState v-if="loading" message="Cargando cronograma semanal..." :rows="6" :columns="5" />
          <div v-else-if="latestWeeklySchedule" class="dashboard-stack">
            <div class="text-body-2 text-medium-emphasis">
              {{ latestWeeklySchedule.fecha_inicio || "Sin fecha" }} / {{ latestWeeklySchedule.fecha_fin || "Sin fecha" }}<span v-if="latestWeeklySchedule.locacion"> · {{ latestWeeklySchedule.locacion }}</span>
            </div>

            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Día</th>
                    <th>Hora</th>
                    <th>Equipo</th>
                    <th>Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="activity in latestWeeklyActivities" :key="activity.id">
                    <td>{{ activity.fecha_label || activity.fecha_actividad || "Sin fecha" }}</td>
                    <td class="font-weight-medium">{{ normalizeDayLabel(activity.dia_semana) }}</td>
                    <td>
                      {{
                        activity.hora_inicio && activity.hora_fin
                          ? `${activity.hora_inicio} - ${activity.hora_fin}`
                          : activity.hora_inicio || activity.hora_fin || "Sin hora"
                      }}
                    </td>
                    <td>{{ activity.equipo_codigo || "Sin equipo" }}</td>
                    <td class="text-medium-emphasis">{{ activity.actividad || "Actividad sin nombre" }}</td>
                  </tr>
                  <tr v-if="!latestWeeklyActivities.length">
                    <td colspan="5" class="text-center text-medium-emphasis py-4">
                      El cronograma aún no tiene actividades registradas.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">Aun no existen cronogramas semanales cargados.</div>
        </v-card>
      </v-col>
    </v-row>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { hasReportAccess } from "@/app/config/report-access";
import { canReadComponent } from "@/app/utils/menu-permissions";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { listAllPages } from "@/app/utils/list-all-pages";
import { formatDateTime } from "@/app/utils/date-time";
import {
  buildExecutiveDashboardReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;

const auth = useAuthStore();
const menu = useMenuStore();
const router = useRouter();

const loading = ref(false);
const error = ref<string | null>(null);
const lastUpdatedAt = ref<Date | null>(null);
const exportState = ref<Record<string, boolean>>({});
const canAccessDashboardReports = computed(() =>
  hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "dashboard_ejecutivo"),
);
const canAccessIntelligenceView = computed(() =>
  canReadComponent(menu.tree, "inteligencia-mantenimiento"),
);

const users = ref<AnyRow[]>([]);
const roles = ref<AnyRow[]>([]);
const equipos = ref<AnyRow[]>([]);
const planes = ref<AnyRow[]>([]);
const bodegas = ref<AnyRow[]>([]);
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

function normalizeAlertSeverity(value: unknown) {
  const raw = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (!raw) return "INFO";
  if (["CRITICAL", "CRITICA", "CRITICO", "ALTA", "HIGH"].includes(raw)) return "CRITICA";
  if (["WARNING", "WARN", "MEDIA", "MEDIO", "ALERTA"].includes(raw)) return "ADVERTENCIA";
  return "INFO";
}

function formatCompactNumber(value: unknown) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("es-EC", {
    notation: numeric >= 1000 ? "compact" : "standard",
    maximumFractionDigits: numeric >= 1000 ? 1 : 0,
  }).format(numeric);
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
  const startMinutes = parseTimeToMinutes(startValue);
  const endMinutes = parseTimeToMinutes(endValue);
  if (startMinutes == null || endMinutes == null) return 0;
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) return 0;
  return (endMinutes - startMinutes) / 60;
}

function parseTimeToMinutes(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const rawSegments = raw.split("T");
  const timeToken = raw.includes("T") ? rawSegments[rawSegments.length - 1] || "" : raw;
  const normalized = timeToken.split(".")[0]?.trim() || "";
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatTimeLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const rawSegments = raw.split("T");
  const normalized = raw.includes("T") ? rawSegments[rawSegments.length - 1] || "" : raw;
  return normalized.split(".")[0]?.slice(0, 5) || normalized;
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
  return listAllPages(endpoint, params);
}

function exportKey(format: "excel" | "pdf") {
  return `dashboard:${format}`;
}

function isExporting(format: "excel" | "pdf") {
  return Boolean(exportState.value[exportKey(format)]);
}

async function loadDashboard() {
  if (!canAccessDashboardReports.value) return;
  loading.value = true;
  error.value = null;

  try {
    const [
      usersRows,
      rolesRows,
      equiposRows,
      planesRows,
      bodegasRows,
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
      listAll("/kpi_inventory/bodegas"),
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
    bodegas.value = bodegasRows;
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
    accent: "linear-gradient(135deg, rgba(47,108,171,0.22), rgba(122,184,255,0.08))",
  },
  {
    key: "ots",
    label: "Órdenes de trabajo",
    value: filteredWorkOrders.value.length,
    helper: `${workOrdersByStatus.value.IN_PROGRESS} en proceso`,
    icon: "mdi-clipboard-text-outline",
    accent: "linear-gradient(135deg, rgba(16,143,114,0.22), rgba(109,227,191,0.08))",
  },
  {
    key: "inventario",
    label: "Productos inventario",
    value: productos.value.length,
    helper: `${lowStockItems.value.length} bajo stock`,
    icon: "mdi-package-variant-closed",
    accent: "linear-gradient(135deg, rgba(225,122,0,0.2), rgba(255,202,106,0.08))",
  },
  {
    key: "seguridad",
    label: "Usuarios activos",
    value: users.value.filter((item) => String(item?.status || "ACTIVE").toUpperCase() === "ACTIVE").length,
    helper: `${roles.value.length} roles configurados`,
    icon: "mdi-account-group-outline",
    accent: "linear-gradient(135deg, rgba(162,69,216,0.2), rgba(221,156,255,0.08))",
  },
]);

const workOrderStatusCards = computed(() => [
  {
    key: "PLANNED",
    label: "Planificadas",
    value: workOrdersByStatus.value.PLANNED,
    tone: "planned",
    icon: "mdi-calendar-clock-outline",
  },
  {
    key: "IN_PROGRESS",
    label: "En proceso",
    value: workOrdersByStatus.value.IN_PROGRESS,
    tone: "progress",
    icon: "mdi-progress-wrench",
  },
  {
    key: "CLOSED",
    label: "Cerradas",
    value: workOrdersByStatus.value.CLOSED,
    tone: "closed",
    icon: "mdi-check-decagram-outline",
  },
]);

function inventoryAvailableForMinimum(item: AnyRow) {
  return Math.max(
    Number(item?.stock_actual || 0) - Number(item?.stock_critico || 0),
    0,
  );
}

const lowStockItems = computed(() =>
  stockRows.value.filter((item) => {
    const stock = inventoryAvailableForMinimum(item);
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

const warehouseNameMap = computed(() =>
  bodegas.value.reduce((acc: Record<string, string>, item) => {
    const id = String(item?.id || "").trim();
    if (!id) return acc;
    const code = String(item?.codigo || "").trim();
    const name = String(item?.nombre || "").trim();
    acc[id] = [code, name].filter(Boolean).join(" - ") || id;
    return acc;
  }, {}),
);

function resolveWarehouseLabel(item: AnyRow) {
  const warehouseId = String(item?.bodega_id || "").trim();
  const warehouseCode = String(item?.bodega_codigo || "").trim();
  const warehouseName = String(item?.bodega_nombre || "").trim();
  return (
    warehouseNameMap.value[warehouseId] ||
    [warehouseCode, warehouseName].filter(Boolean).join(" - ") ||
    warehouseCode ||
    warehouseName ||
    warehouseId ||
    "Sin bodega"
  );
}

function resolveWarehouseKey(item: AnyRow) {
  return String(item?.bodega_id || "").trim() || resolveWarehouseLabel(item);
}

const workOrderStatusChartItems = computed(() => [
  {
    key: "planned",
    label: "Planificadas",
    value: workOrdersByStatus.value.PLANNED,
    valueLabel: formatCompactNumber(workOrdersByStatus.value.PLANNED),
    helper: "Pendientes de ejecución",
    color: "linear-gradient(90deg, #2f6cab 0%, #78b7ff 100%)",
  },
  {
    key: "in_progress",
    label: "En proceso",
    value: workOrdersByStatus.value.IN_PROGRESS,
    valueLabel: formatCompactNumber(workOrdersByStatus.value.IN_PROGRESS),
    helper: "OT trabajando en campo",
    color: "linear-gradient(90deg, #e17a00 0%, #ffce73 100%)",
  },
  {
    key: "closed",
    label: "Cerradas",
    value: workOrdersByStatus.value.CLOSED,
    valueLabel: formatCompactNumber(workOrdersByStatus.value.CLOSED),
    helper: "Órdenes culminadas",
    color: "linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%)",
  },
]);

const alertSeverityChartItems = computed(() => {
  const summary = {
    CRITICA: 0,
    ADVERTENCIA: 0,
    INFO: 0,
  };

  for (const item of openAlerts.value) {
    const severity = normalizeAlertSeverity(item?.nivel || item?.severidad || item?.categoria);
    summary[severity as keyof typeof summary] += 1;
  }

  return [
    {
      key: "critical",
      label: "Críticas",
      value: summary.CRITICA,
      valueLabel: formatCompactNumber(summary.CRITICA),
      helper: "Atención inmediata",
      color: "linear-gradient(90deg, #d53d57 0%, #ff96a6 100%)",
    },
    {
      key: "warning",
      label: "Advertencia",
      value: summary.ADVERTENCIA,
      valueLabel: formatCompactNumber(summary.ADVERTENCIA),
      helper: "Seguimiento prioritario",
      color: "linear-gradient(90deg, #e17a00 0%, #ffce73 100%)",
    },
    {
      key: "info",
      label: "Informativas",
      value: summary.INFO,
      valueLabel: formatCompactNumber(summary.INFO),
      helper: "Contexto operativo",
      color: "linear-gradient(90deg, #3f62d8 0%, #9eaefc 100%)",
    },
  ];
});

const operationCadenceChartItems = computed(() =>
  operationScheduleDays.value.slice(0, 7).map((item) => ({
    key: item.date,
    label: item.title,
    value: Number(item.totalHours || 0),
    valueLabel: `${Number(item.totalHours || 0).toFixed(1)} h`,
    helper: `${item.count} actividades`,
    color: "linear-gradient(90deg, #0f8f72 0%, #7be8c4 100%)",
  })),
);

const lowStockByWarehouse = computed(() => {
  const grouped = new Map<string, { key: string; label: string; value: number }>();
  for (const item of lowStockItems.value) {
    const key = resolveWarehouseKey(item);
    const label = resolveWarehouseLabel(item);
    const current = grouped.get(key) ?? { key, label, value: 0 };
    current.value += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 6)
    .map((item) => ({
      ...item,
      valueLabel: `${item.value} materiales`,
      helper: "Bodega con stock comprometido",
      color: "linear-gradient(90deg, #e24f5f 0%, #ff9aa5 100%)",
    }));
});

const recentAlertsTableRows = computed(() =>
  [...openAlerts.value]
    .sort((a, b) => new Date(b?.fecha_generada || 0).getTime() - new Date(a?.fecha_generada || 0).getTime())
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      tipo: item?.tipo_alerta || "Alerta",
      equipo: item?.equipo_nombre || item?.equipo_id || "Sin equipo",
      estado: item?.estado || "Sin estado",
      detalle: item?.detalle || "Sin detalle",
    })),
);

const recentWorkOrdersTableRows = computed(() =>
  [...filteredWorkOrders.value]
    .sort((a, b) => String(b?.code || "").localeCompare(String(a?.code || "")))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      codigo: item?.code || "Sin código",
      titulo: item?.title || item?.titulo || "Sin título",
      equipo: item?.equipment_label || item?.equipo_nombre || item?.equipment_id || "Sin equipo",
      estado: workflowLabel(item?.status_workflow),
    })),
);

const criticalInventoryRows = computed(() =>
  [...lowStockItems.value]
    .map((item) => {
      const stock = inventoryAvailableForMinimum(item);
      const min = Number(item?.stock_min_bodega || 0);
      return {
        id: item.id,
        producto: productNameMap.value[String(item?.producto_id)] || String(item?.producto_id || "Producto"),
        bodega: resolveWarehouseLabel(item),
        stock,
        min,
        deficit: Math.max(0, min - stock),
      };
    })
    .sort((a, b) => b.deficit - a.deficit || a.producto.localeCompare(b.producto))
    .slice(0, 8),
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
]);

const latestDailyReport = computed(() => filteredDailyReports.value[0] ?? null);
const latestDailyUnits = computed(() => (latestDailyReport.value?.unidades ?? []).slice(0, 4));
const latestDailyFuel = computed(() => (latestDailyReport.value?.combustibles ?? []).slice(0, 3));

const latestWeeklySchedule = computed(() => filteredWeeklySchedules.value[0] ?? null);
const latestWeeklyActivities = computed(() =>
  [...(latestWeeklySchedule.value?.detalles ?? [])]
    .sort(
      (a, b) =>
        (parseDateValue(a?.fecha_actividad)?.getTime() ?? 0) -
          (parseDateValue(b?.fecha_actividad)?.getTime() ?? 0) ||
        String(a?.hora_inicio || "").localeCompare(String(b?.hora_inicio || "")),
    )
    .map((item) => ({
      ...item,
      hora_inicio: formatTimeLabel(item?.hora_inicio),
      hora_fin: formatTimeLabel(item?.hora_fin),
      fecha_label: item?.fecha_actividad
        ? new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
            parseDateValue(item.fecha_actividad) ?? new Date(),
          )
        : "",
    })),
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
    {
      date: string;
      count: number;
      totalHours: number;
      taskHours: number;
      startMinutes: number | null;
      endMinutes: number | null;
      startLabel: string;
      endLabel: string;
      activities: string[];
      equipments: string[];
    }
  >();

  for (const item of operationScheduleItems.value) {
    const date = String(item?.fecha_resuelta || "").slice(0, 10);
    if (!date) continue;
    const startMinutes = parseTimeToMinutes(item?.hora_inicio);
    const endMinutes = parseTimeToMinutes(item?.hora_fin);
    const startLabel = formatTimeLabel(item?.hora_inicio);
    const endLabel = formatTimeLabel(item?.hora_fin);
    const current = grouped.get(date) ?? {
      date,
      count: 0,
      totalHours: 0,
      taskHours: 0,
      startMinutes: null,
      endMinutes: null,
      startLabel: "",
      endLabel: "",
      activities: [],
      equipments: [],
    };
    current.count += 1;
    current.taskHours += Number(item?.duracion_horas || 0);
    if (startMinutes != null && (current.startMinutes == null || startMinutes < current.startMinutes)) {
      current.startMinutes = startMinutes;
      current.startLabel = startLabel;
    }
    if (endMinutes != null && (current.endMinutes == null || endMinutes > current.endMinutes)) {
      current.endMinutes = endMinutes;
      current.endLabel = endLabel;
    }
    if (item?.actividad) current.activities.push(String(item.actividad));
    if (item?.equipo_codigo) current.equipments.push(String(item.equipo_codigo));
    grouped.set(date, current);
  }

  return [...grouped.values()]
    .sort((a, b) => (parseDateValue(a.date)?.getTime() ?? 0) - (parseDateValue(b.date)?.getTime() ?? 0))
    .map((item) => ({
      ...item,
      totalHours:
        item.startMinutes != null && item.endMinutes != null && item.endMinutes > item.startMinutes
          ? Number(((item.endMinutes - item.startMinutes) / 60).toFixed(2))
          : Number(item.taskHours.toFixed(2)),
      title: new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "long", year: "numeric" }).format(
        parseDateValue(item.date) ?? new Date(),
      ),
      subtitle: `${item.count} actividades${
        item.startLabel && item.endLabel ? ` · ${item.startLabel} - ${item.endLabel}` : ""
      } · ${
        (
          item.startMinutes != null &&
          item.endMinutes != null &&
          item.endMinutes > item.startMinutes
            ? Number(((item.endMinutes - item.startMinutes) / 60).toFixed(2))
            : Number(item.taskHours.toFixed(2))
        ).toFixed(1)
      } h${
        item.equipments.length ? ` · ${[...new Set(item.equipments)].slice(0, 3).join(", ")}` : ""
      }`,
    }));
});

const operationScheduleSummary = computed(() => {
  const totalHours = operationScheduleDays.value.reduce((acc, item) => acc + Number(item?.totalHours || 0), 0);
  return {
    days: operationScheduleDays.value.length,
    activities: operationScheduleItems.value.length,
    totalHours,
    hoursLabel: `${totalHours.toFixed(1)} h`,
  };
});

const dashboardReportDefinition = computed(() =>
  buildExecutiveDashboardReport({
    periodLabel: selectedPeriodLabel.value,
    kpis: kpiCards.value.map((card) => ({
      label: card.label,
      value: card.value,
    })),
    alerts: openAlerts.value.map((item) => ({
      tipo_alerta: item?.tipo_alerta || "Alerta",
      estado: item?.estado || "",
      severidad: item?.severidad || item?.nivel || "",
      referencia: item?.referencia_codigo || item?.referencia || item?.tabla_referencia || "",
      detalle: item?.detalle || "",
      fecha_generada: item?.fecha_generada || item?.created_at || "",
    })),
    workOrders: filteredWorkOrders.value.map((item) => ({
      codigo: item?.code || item?.codigo || "",
      titulo: item?.title || item?.titulo || "",
      equipo: item?.equipment_label || item?.equipo_nombre || item?.equipment_id || "",
      compartimiento: item?.equipment_component_label || item?.equipo_componente_nombre_oficial || "",
      estado_workflow: workflowLabel(item?.status_workflow),
      tipo_mantenimiento: item?.maintenance_kind || "",
      fecha: resolveWorkOrderDate(item) || "",
    })),
    inventory: lowStockItems.value.map((item) => ({
      producto: productNameMap.value[String(item?.producto_id)] || String(item?.producto_id || ""),
      bodega: resolveWarehouseLabel(item),
      stock_actual: inventoryAvailableForMinimum(item),
      stock_total: item?.stock_actual || 0,
      stock_critico: item?.stock_critico || 0,
      stock_minimo: item?.stock_min_bodega || 0,
      observacion: "Bajo stock mínimo",
    })),
    processIndicators: processIndicatorCards.value.map((item) => ({
      indicador: item.label,
      valor: item.value,
      detalle: item.helper,
    })),
    operationDays: operationScheduleDays.value.map((item) => ({
      fecha: item.date,
      resumen: item.title,
      detalle: item.subtitle,
      actividades: item.count,
      horas: item.totalHours,
    })),
    weeklyActivities: latestWeeklyActivities.value.map((item) => ({
      actividad: item?.actividad || "",
      dia_semana: normalizeDayLabel(item?.dia_semana),
      hora_inicio: item?.hora_inicio || "",
      hora_fin: item?.hora_fin || "",
      equipo_codigo: item?.equipo_codigo || "",
      tipo_proceso: item?.tipo_proceso || "",
      observacion: item?.observacion || "",
    })),
  }),
);

async function exportDashboard(format: "excel" | "pdf") {
  if (!canAccessDashboardReports.value) {
    error.value = "No tienes permisos para generar reportes del dashboard.";
    return;
  }
  const key = exportKey(format);
  exportState.value = { ...exportState.value, [key]: true };
  error.value = null;
  try {
    if (format === "excel") {
      await downloadReportExcel(dashboardReportDefinition.value);
    } else {
      await downloadReportPdf(dashboardReportDefinition.value);
    }
  } catch (e: any) {
    error.value = e?.message || "No se pudo generar el reporte del dashboard.";
  } finally {
    exportState.value = { ...exportState.value, [key]: false };
  }
}

const lastUpdatedLabel = computed(() => {
  if (!lastUpdatedAt.value) return "Sin datos";
  return formatDateTime(lastUpdatedAt.value, "Sin datos");
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
  --dashboard-blue: 47, 108, 171;
  --dashboard-cyan: 39, 164, 190;
  --dashboard-green: 15, 143, 114;
  --dashboard-orange: 225, 122, 0;
  --dashboard-purple: 132, 81, 201;
  padding: 0;
}

.dashboard-content {
  display: grid;
  gap: 4px;
}

.dashboard-hero,
.dashboard-status-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.dashboard-hero {
  padding: 28px;
  background:
    linear-gradient(120deg, color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, var(--surface-base)), var(--surface-base) 68%),
    var(--surface-base);
}

.dashboard-hero::after {
  position: absolute;
  z-index: -1;
  right: -78px;
  bottom: -118px;
  width: 330px;
  height: 330px;
  border: 48px solid rgba(var(--v-theme-primary), 0.055);
  border-radius: 50%;
  content: "";
}

.dashboard-hero__glow {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;
}

.dashboard-hero__glow--primary {
  top: -150px;
  left: 30%;
  width: 330px;
  height: 330px;
  background: rgba(var(--v-theme-primary), 0.09);
}

.dashboard-hero__glow--secondary {
  right: 8%;
  bottom: -135px;
  width: 260px;
  height: 260px;
  background: rgba(var(--v-theme-secondary), 0.08);
}

.dashboard-hero__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 26px;
}

.dashboard-hero__copy {
  max-width: 690px;
}

.dashboard-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.105em;
  text-transform: uppercase;
}

.dashboard-hero__pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
  box-shadow: 0 0 0 6px rgba(var(--v-theme-success), 0.12);
  animation: dashboard-pulse 2.2s ease-out infinite;
}

.dashboard-hero__title {
  margin: 0;
  font-size: clamp(1.65rem, 2.7vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.12;
}

.dashboard-hero__description {
  max-width: 620px;
  margin: 9px 0 13px;
  color: var(--app-muted-text);
  font-size: 0.94rem;
}

.dashboard-hero__identity {
  display: flex;
  flex-wrap: wrap;
  gap: 9px 18px;
  color: var(--app-muted-text);
  font-size: 0.75rem;
}

.dashboard-hero__identity span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dashboard-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.period-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(120px, 0.4fr) minmax(170px, 0.55fr) auto;
  align-items: center;
  gap: 10px;
  margin: 21px 0 15px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 17px;
  background: color-mix(in srgb, var(--surface-soft) 80%, transparent);
}

.period-toolbar__intro {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.period-toolbar__intro > div:last-child {
  display: grid;
  min-width: 0;
}

.period-toolbar__intro strong {
  font-size: 0.78rem;
}

.period-toolbar__intro span {
  overflow: hidden;
  color: var(--app-muted-text);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.period-toolbar__icon {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.period-toolbar__select {
  min-width: 120px;
}

.period-toolbar__select--month {
  min-width: 180px;
}

.kpi-card {
  position: relative;
  overflow: hidden;
  min-height: 158px;
  padding: 16px;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.025)),
    var(--kpi-accent, linear-gradient(135deg, rgba(47,108,171,0.16), rgba(122,184,255,0.05)));
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.055);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.kpi-card::after {
  position: absolute;
  right: -34px;
  bottom: -45px;
  width: 125px;
  height: 125px;
  border: 24px solid rgba(var(--v-theme-primary), 0.045);
  border-radius: 50%;
  content: "";
}

.kpi-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.25);
  box-shadow: 0 15px 30px rgba(var(--v-theme-primary), 0.1);
}

.kpi-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-card__icon {
  display: grid;
  width: 41px;
  height: 41px;
  place-items: center;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 0.55);
}

.kpi-card__index {
  color: var(--app-muted-text);
  font-size: 0.61rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.kpi-card__value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kpi-card__value {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
}

.kpi-card__label {
  position: relative;
  z-index: 1;
  margin-top: 7px;
  font-size: 0.82rem;
  font-weight: 750;
}

.kpi-card__helper {
  position: relative;
  z-index: 1;
  margin-top: 3px;
  color: var(--app-muted-text);
  font-size: 0.69rem;
  line-height: 1.35;
}

.dashboard-status-card {
  padding: 24px;
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.075), transparent 58%),
    var(--surface-base);
}

.dashboard-status-card__header {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 15px;
}

.dashboard-status-card__title-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.105);
}

.status-row {
  --status-color: var(--dashboard-blue);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px 12px;
  padding: 11px 0;
}

.status-row--planned { --status-color: var(--dashboard-blue); }
.status-row--progress { --status-color: var(--dashboard-orange); }
.status-row--closed { --status-color: var(--dashboard-green); }

.status-row__main {
  display: flex;
  align-items: center;
  gap: 9px;
}

.status-row__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 11px;
  color: rgb(var(--status-color));
  background: rgba(var(--status-color), 0.1);
}

.status-row__value {
  font-size: 1.05rem;
}

.status-row__track {
  grid-column: 1 / -1;
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: rgba(var(--status-color), 0.09);
}

.status-row__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(var(--status-color), 0.64), rgb(var(--status-color)));
  transition: width 320ms ease;
}

.dashboard-status-card__footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 13px;
  padding-top: 14px;
  border-top: 1px solid var(--surface-border);
}

.dashboard-status-meta {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-width: 0;
  padding: 9px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface-soft) 78%, transparent);
}

.dashboard-status-meta > .v-icon {
  flex: 0 0 auto;
  color: rgb(var(--v-theme-primary));
}

.dashboard-status-meta > div {
  display: grid;
  min-width: 0;
}

.dashboard-status-meta span {
  color: var(--app-muted-text);
  font-size: 0.61rem;
}

.dashboard-status-meta strong {
  overflow: hidden;
  font-size: 0.68rem;
  text-overflow: ellipsis;
}

.process-indicator-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.process-indicator-item {
  position: relative;
  overflow: hidden;
  padding: 15px;
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.06), transparent 68%),
    var(--surface-soft);
  transition: transform 160ms ease, border-color 160ms ease;
}

.process-indicator-item:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.22);
}

.dashboard-stack {
  display: grid;
  gap: 12px;
}

.dashboard-table-shell {
  position: relative;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: auto;
  max-height: 410px;
  background: color-mix(in srgb, var(--surface-base) 91%, transparent);
  box-shadow: inset 0 1px 0 rgba(var(--v-theme-on-surface), 0.035);
  scrollbar-color: rgba(var(--v-theme-primary), 0.3) transparent;
  scrollbar-width: thin;
}

.dashboard-mini-table {
  background: transparent;
}

.dashboard-mini-table :deep(table) {
  min-width: 680px;
  border-collapse: separate;
  border-spacing: 0;
}

.dashboard-mini-table :deep(th) {
  position: sticky;
  z-index: 1;
  top: 0;
  height: 45px;
  padding: 11px 13px;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.13);
  font-size: 0.69rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.065em;
  color: var(--app-muted-text);
  white-space: nowrap;
  background:
    linear-gradient(180deg, rgba(var(--v-theme-primary), 0.075), rgba(var(--v-theme-primary), 0.025)),
    color-mix(in srgb, var(--surface-soft) 96%, transparent);
}

.dashboard-mini-table :deep(td) {
  max-width: 280px;
  min-height: 48px;
  padding: 12px 13px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.065);
  color: color-mix(in srgb, var(--app-text) 91%, transparent);
  font-size: 0.78rem;
  line-height: 1.45;
  vertical-align: middle;
}

.dashboard-mini-table :deep(tbody tr) {
  background: transparent;
  transition: background 140ms ease, box-shadow 140ms ease;
}

.dashboard-mini-table :deep(tbody tr:nth-child(even)) {
  background: rgba(var(--v-theme-primary), 0.018);
}

.dashboard-mini-table :deep(tbody tr:hover) {
  background: rgba(var(--v-theme-primary), 0.065);
  box-shadow: inset 3px 0 0 rgba(var(--v-theme-primary), 0.72);
}

.dashboard-mini-table :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

.dashboard-mini-table :deep(th:first-child),
.dashboard-mini-table :deep(td:first-child) {
  padding-left: 17px;
}

.dashboard-mini-table :deep(th:last-child),
.dashboard-mini-table :deep(td:last-child) {
  padding-right: 17px;
}

.dashboard-mini-bars {
  display: grid;
  gap: 10px;
}

.dashboard-mini-bars__row {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  transition: background 140ms ease;
}

.dashboard-mini-bars__row:hover {
  background: rgba(var(--v-theme-primary), 0.045);
}

.dashboard-mini-bars__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.86rem;
}

.dashboard-mini-bars__track {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-soft) 76%, transparent);
  border: 1px solid var(--surface-border);
}

.dashboard-mini-bars__fill {
  height: 100%;
  border-radius: 999px;
}

.dashboard-mini-bars__fill--danger {
  background: linear-gradient(90deg, #e24f5f 0%, #ff9aa5 100%);
}

.dashboard-mini-bars__fill--success {
  background: linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%);
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dashboard-content > .v-row:not(.dashboard-hero-grid) .enterprise-surface {
  position: relative;
  border-color: var(--surface-border);
  background:
    linear-gradient(180deg, rgba(var(--v-theme-surface), 0.18), transparent 44%),
    var(--surface-base);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.dashboard-content > .v-row:not(.dashboard-hero-grid) .enterprise-surface:hover {
  border-color: rgba(var(--v-theme-primary), 0.18);
  box-shadow: 0 19px 38px rgba(15, 23, 42, 0.105);
}

.dashboard-content > .v-row:not(.dashboard-hero-grid) .enterprise-surface :deep(.text-subtitle-1.font-weight-bold) {
  letter-spacing: -0.015em;
}

.dashboard-content :deep(.v-chip) {
  font-weight: 650;
}

.h-100 {
  height: 100%;
}

@keyframes dashboard-pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0.32); }
  65% { box-shadow: 0 0 0 8px rgba(var(--v-theme-success), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0); }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-hero__pulse {
    animation: none;
  }

  .kpi-card,
  .process-indicator-item,
  .dashboard-mini-bars__row,
  .status-row__fill {
    transition: none;
  }
}

@media (max-width: 1280px) {
  .dashboard-hero__header {
    flex-direction: column;
  }

  .dashboard-hero__actions {
    justify-content: flex-start;
  }

  .period-toolbar {
    grid-template-columns: minmax(200px, 1fr) minmax(110px, 0.45fr) minmax(160px, 0.6fr);
  }

  .period-toolbar > .v-chip {
    grid-column: 1 / -1;
    justify-self: start;
  }
}

@media (max-width: 768px) {
  .dashboard-hero,
  .dashboard-status-card {
    padding: 20px;
  }

  .dashboard-hero__actions,
  .dashboard-hero__actions > .v-btn {
    width: 100%;
  }

  .period-toolbar {
    grid-template-columns: 1fr;
  }

  .period-toolbar > .v-chip {
    grid-column: auto;
    justify-self: stretch;
  }

  .period-toolbar__select,
  .period-toolbar__select--month {
    min-width: 100%;
  }

  .dashboard-status-card__footer,
  .process-indicator-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 500px) {
  .dashboard-hero__identity {
    flex-direction: column;
  }

  .dashboard-table-shell {
    border-radius: 14px;
  }
}
</style>

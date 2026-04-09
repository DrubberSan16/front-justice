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
                prepend-icon="mdi-file-excel"
                :loading="isExporting('excel')"
                @click="exportDashboard('excel')"
              >
                Excel
              </v-btn>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-file-pdf-box"
                :loading="isExporting('pdf')"
                @click="exportDashboard('pdf')"
              >
                PDF
              </v-btn>
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
              <v-card
                rounded="lg"
                variant="outlined"
                class="pa-4 kpi-card h-100"
                :style="{ '--kpi-accent': card.accent }"
              >
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-subtitle-2 text-medium-emphasis">{{ card.label }}</div>
                  <v-icon :icon="card.icon" size="20" />
                </div>
                <div class="kpi-card__value-row">
                  <div class="text-h4 font-weight-bold">{{ card.value }}</div>
                  <div class="kpi-card__orb" />
                </div>
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
                    <th>Stock</th>
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
              <v-chip size="small" label color="error" variant="tonal">Componentes: {{ latestDailyComponents.length }}</v-chip>
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
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { listAllPages } from "@/app/utils/list-all-pages";
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
  { key: "PLANNED", label: "Planificadas", value: workOrdersByStatus.value.PLANNED },
  { key: "IN_PROGRESS", label: "En proceso", value: workOrdersByStatus.value.IN_PROGRESS },
  { key: "CLOSED", label: "Cerradas", value: workOrdersByStatus.value.CLOSED },
]);

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
      const stock = Number(item?.stock_actual || 0);
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
      stock_actual: item?.stock_actual || 0,
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
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    var(--kpi-accent, linear-gradient(135deg, rgba(47,108,171,0.16), rgba(122,184,255,0.05)));
  overflow: hidden;
  position: relative;
}

.kpi-card__value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kpi-card__orb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.12);
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

.dashboard-table-shell {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-soft) 82%, transparent);
}

.dashboard-mini-table {
  background: transparent;
}

.dashboard-mini-table :deep(th) {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--app-muted-text);
  white-space: nowrap;
}

.dashboard-mini-table :deep(td) {
  max-width: 280px;
  vertical-align: top;
}

.dashboard-mini-bars {
  display: grid;
  gap: 10px;
}

.dashboard-mini-bars__row {
  display: grid;
  gap: 6px;
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

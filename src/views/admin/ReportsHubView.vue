<template>
  <div class="reports-hub">
    <v-alert v-if="!canAccess" type="warning" variant="tonal" rounded="xl">
      El Centro de Informes está habilitado únicamente para Súper Administrador.
    </v-alert>

    <template v-else>
      <section class="reports-hero" aria-labelledby="reports-hub-title">
        <div class="reports-hero__copy">
          <span class="reports-hero__eyebrow">Centro de Informes</span>
          <h1 id="reports-hub-title">Consolidados de toda la operación</h1>
          <p>
            Elija un módulo, revise sus indicadores y seleccione cualquier dato
            del gráfico para conocer los registros que lo explican.
          </p>
        </div>

        <div class="reports-hero__filters" aria-label="Rango del informe">
          <v-text-field
            v-model="draftStartDate"
            type="date"
            label="Desde"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-text-field
            v-model="draftEndDate"
            type="date"
            label="Hasta"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-filter-check-outline"
            :loading="loading"
            :disabled="invalidDraftRange"
            @click="applyDateRange"
          >
            Aplicar rango
          </v-btn>
        </div>
      </section>

      <v-alert
        v-if="invalidDraftRange"
        type="warning"
        variant="tonal"
        rounded="xl"
        class="mb-4"
      >
        La fecha de inicio no puede ser posterior a la fecha de fin.
      </v-alert>

      <nav class="module-navigation" aria-label="Módulos disponibles en informes">
        <div class="module-navigation__header">
          <div>
            <span class="section-eyebrow">Submenú de informes</span>
            <h2>Seleccione qué desea analizar</h2>
          </div>
          <v-chip color="primary" variant="tonal" prepend-icon="mdi-view-grid-outline">
            {{ REPORTING_MODULES.length }} módulos
          </v-chip>
        </div>

        <div
          v-for="group in REPORTING_MODULE_GROUPS"
          :key="group"
          class="module-navigation__group"
        >
          <div class="module-navigation__group-title">{{ group }}</div>
          <div class="module-navigation__items">
            <v-btn
              v-for="module in modulesByGroup(group)"
              :key="module.key"
              :color="module.key === activeModule.key ? 'primary' : undefined"
              :variant="module.key === activeModule.key ? 'flat' : 'tonal'"
              :prepend-icon="module.icon"
              :aria-pressed="module.key === activeModule.key"
              class="module-navigation__button"
              @click="selectModule(module.key)"
            >
              {{ module.shortTitle }}
            </v-btn>
          </div>
        </div>
      </nav>

      <v-alert
        v-if="error"
        type="warning"
        variant="tonal"
        rounded="xl"
        class="mb-4"
      >
        <div class="d-flex flex-wrap align-center justify-space-between ga-3">
          <span>{{ error }}</span>
          <v-btn variant="text" prepend-icon="mdi-refresh" @click="loadActiveModule">
            Reintentar
          </v-btn>
        </div>
      </v-alert>

      <section class="module-heading" aria-labelledby="active-report-title">
        <div class="module-heading__identity">
          <v-icon :icon="activeModule.icon" size="32" aria-hidden="true" />
          <div>
            <span class="section-eyebrow">{{ activeModule.group }}</span>
            <h2 id="active-report-title">{{ activeModule.title }}</h2>
            <p>{{ activeModule.description }}</p>
          </div>
        </div>
        <div class="module-heading__actions">
          <v-chip
            :color="activeModule.snapshot ? 'secondary' : 'primary'"
            variant="tonal"
            :prepend-icon="activeModule.snapshot ? 'mdi-camera-outline' : 'mdi-calendar-range'"
          >
            {{ activeRangeLabel }}
          </v-chip>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-open-in-new"
            @click="openSourceModule"
          >
            Abrir módulo
          </v-btn>
        </div>
      </section>

      <div v-if="loading" class="report-loading" aria-live="polite">
        <v-skeleton-loader type="heading, paragraph, actions" />
        <v-row>
          <v-col v-for="index in 4" :key="index" cols="12" sm="6" xl="3">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>
        <v-skeleton-loader type="image" height="320" />
      </div>

      <template v-else>
        <v-alert
          v-if="ignoredUndatedCount"
          type="info"
          variant="tonal"
          rounded="xl"
          class="mb-4"
        >
          {{ ignoredUndatedCount }} registro(s) no tienen una fecha reconocible y no se
          incluyeron en el período. Puede revisarlos directamente en el módulo origen.
        </v-alert>

        <section class="summary-grid" aria-label="Indicadores principales">
          <article v-for="card in summaryCards" :key="card.label" class="summary-card">
            <div class="summary-card__icon">
              <v-icon :icon="card.icon" aria-hidden="true" />
            </div>
            <div>
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <small>{{ card.helper }}</small>
            </div>
          </article>
        </section>

        <v-alert
          v-if="events.length"
          color="primary"
          variant="tonal"
          rounded="xl"
          icon="mdi-lightbulb-on-outline"
          class="insight-banner"
        >
          <strong>Lectura rápida:</strong> {{ insightText }}
        </v-alert>

        <div v-if="!events.length" class="empty-report" role="status">
          <v-icon icon="mdi-chart-box-outline" size="52" aria-hidden="true" />
          <h3>No hay datos para mostrar</h3>
          <p>
            {{ activeModule.snapshot
              ? "Este catálogo no contiene registros visibles en este momento."
              : "Cambie el rango de fechas o confirme que el proceso tenga registros en el módulo origen." }}
          </p>
          <v-btn variant="outlined" prepend-icon="mdi-open-in-new" @click="openSourceModule">
            Abrir módulo
          </v-btn>
        </div>

        <template v-else>
          <section class="chart-grid" aria-label="Gráficos del consolidado">
            <article class="chart-card chart-card--wide">
              <div class="chart-card__heading">
                <div>
                  <span class="section-eyebrow">Evolución</span>
                  <h3>{{ activeModule.snapshot ? "Actualizaciones registradas" : "Actividad en el tiempo" }}</h3>
                  <p>Seleccione un punto para abrir los registros de ese período.</p>
                </div>
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-table-eye"
                  @click="openAllDetails('Actividad del módulo')"
                >
                  Ver tabla
                </v-btn>
              </div>
              <EChart
                v-if="timelinePoints.length"
                :option="timelineChartOption"
                height="310px"
                @select="openTimelineDetail"
              />
              <div v-else class="chart-empty">No hay fechas suficientes para formar una tendencia.</div>
              <div class="chart-fallback" aria-label="Detalle accesible de la actividad">
                <v-btn
                  v-for="point in timelinePoints.slice(-6)"
                  :key="point.key"
                  variant="text"
                  size="small"
                  @click="openDetailByDate(point.key, point.label)"
                >
                  {{ point.label }}: {{ point.count }}
                </v-btn>
              </div>
            </article>

            <article class="chart-card">
              <div class="chart-card__heading">
                <div>
                  <span class="section-eyebrow">Situación</span>
                  <h3>Distribución por estado</h3>
                  <p>Qué condición concentra más registros.</p>
                </div>
              </div>
              <EChart
                :option="statusChartOption"
                height="310px"
                @select="openStatusDetail"
              />
              <div class="chart-fallback" aria-label="Detalle accesible por estado">
                <v-btn
                  v-for="point in statusPoints.slice(0, 6)"
                  :key="point.key"
                  variant="text"
                  size="small"
                  @click="openDetailByStatus(point.key, point.label)"
                >
                  {{ point.label }}: {{ point.count }}
                </v-btn>
              </div>
            </article>

            <article class="chart-card">
              <div class="chart-card__heading">
                <div>
                  <span class="section-eyebrow">Composición</span>
                  <h3>Principales clasificaciones</h3>
                  <p>Los grupos con mayor cantidad de registros.</p>
                </div>
              </div>
              <EChart
                :option="categoryChartOption"
                height="310px"
                @select="openCategoryDetail"
              />
              <div class="chart-fallback" aria-label="Detalle accesible por clasificación">
                <v-btn
                  v-for="point in categoryPoints.slice(0, 6)"
                  :key="point.key"
                  variant="text"
                  size="small"
                  @click="openDetailByCategory(point.key, point.label)"
                >
                  {{ point.label }}: {{ point.count }}
                </v-btn>
              </div>
            </article>
          </section>

          <section class="recent-card" aria-labelledby="recent-report-title">
            <div class="chart-card__heading">
              <div>
                <span class="section-eyebrow">Trazabilidad</span>
                <h3 id="recent-report-title">Registros que forman el consolidado</h3>
                <p>Vista resumida; la tabla completa se abre sin abandonar el informe.</p>
              </div>
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-table-large" @click="openAllDetails('Todos los registros')">
                Ver {{ formatCount(events.length) }} registros
              </v-btn>
            </div>
            <v-table density="comfortable" class="recent-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th>Clasificación</th>
                  <th class="text-right">{{ activeModule.valueLabel }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="event in recentEvents" :key="event.key">
                  <td>{{ event.dateLabel }}</td>
                  <td>
                    <strong>{{ event.title }}</strong>
                    <small v-if="event.owner">{{ event.owner }}</small>
                  </td>
                  <td><v-chip size="small" variant="tonal">{{ event.status }}</v-chip></td>
                  <td>{{ event.category }}</td>
                  <td class="text-right">{{ formatNumber(event.value) }}</td>
                </tr>
              </tbody>
            </v-table>
          </section>
        </template>
      </template>
    </template>

    <v-dialog v-model="detailDialog" max-width="1180" scrollable>
      <v-card rounded="xl">
        <v-card-title class="detail-dialog__title">
          <div>
            <span class="section-eyebrow">{{ activeModule.title }}</span>
            <h2>{{ detailTitle }}</h2>
            <p>{{ detailRows.length }} registro(s) explican el dato seleccionado.</p>
          </div>
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle" @click="detailDialog = false" />
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="detailSearch"
            label="Buscar dentro del detalle"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
          />
          <v-data-table
            :headers="detailHeaders"
            :items="detailRows"
            :search="detailSearch"
            :items-per-page="10"
            no-data-text="No hay registros para este dato."
          >
            <template #item.status="{ item }">
              <v-chip size="small" variant="tonal">{{ item.status }}</v-chip>
            </template>
            <template #item.value="{ item }">{{ formatNumber(item.value) }}</template>
          </v-data-table>
        </v-card-text>
        <v-card-actions class="detail-dialog__actions">
          <v-btn variant="outlined" prepend-icon="mdi-open-in-new" @click="openSourceModule">
            Abrir módulo origen
          </v-btn>
          <v-spacer />
          <v-btn color="primary" @click="detailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { chartBase, chartInk, seriesColor } from "@/app/config/chart-theme";
import {
  REPORTING_MODULE_GROUPS,
  REPORTING_MODULES,
  getReportingModule,
  type ReportingModule,
  type ReportingModuleGroup,
} from "@/app/config/reporting-modules";
import { currentDateInputValue, formatDateOnly } from "@/app/utils/date-time";
import { listAllPages } from "@/app/utils/list-all-pages";
import { isSuperAdministrator } from "@/app/utils/role-access";
import EChart from "@/components/charts/EChart.vue";

type AnyRow = Record<string, any>;
type ReportEvent = {
  key: string;
  dateKey: string;
  dateLabel: string;
  title: string;
  status: string;
  statusKey: string;
  category: string;
  categoryKey: string;
  value: number;
  owner: string;
  raw: AnyRow;
};
type AggregatePoint = { key: string; label: string; count: number };

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const theme = useTheme();
const canAccess = computed(() => isSuperAdministrator(auth.user));

const today = currentDateInputValue();
const defaultStart = `${today.slice(0, 7)}-01`;
const appliedStartDate = ref(validDateQuery(route.query.desde) || defaultStart);
const appliedEndDate = ref(validDateQuery(route.query.hasta) || today);
const draftStartDate = ref(appliedStartDate.value);
const draftEndDate = ref(appliedEndDate.value);
const activeModuleKey = ref(
  getReportingModule(String(route.query.modulo || "")).key,
);
const rawRows = ref<AnyRow[]>([]);
const loading = ref(false);
const error = ref("");
const ignoredUndatedCount = ref(0);
let loadSequence = 0;

const detailDialog = ref(false);
const detailTitle = ref("Detalle del consolidado");
const detailRows = ref<ReportEvent[]>([]);
const detailSearch = ref("");
const detailHeaders = [
  { title: "Fecha", key: "dateLabel" },
  { title: "Registro", key: "title" },
  { title: "Estado", key: "status" },
  { title: "Clasificación", key: "category" },
  { title: "Responsable", key: "owner" },
  { title: "Valor", key: "value", align: "end" as const },
];

const activeModule = computed(() => getReportingModule(activeModuleKey.value));
const invalidDraftRange = computed(
  () => Boolean(draftStartDate.value && draftEndDate.value && draftStartDate.value > draftEndDate.value),
);
const activeRangeLabel = computed(() =>
  activeModule.value.snapshot
    ? `Corte actual · ${formatDateOnly(today)}`
    : `${formatDateOnly(appliedStartDate.value)} – ${formatDateOnly(appliedEndDate.value)}`,
);

function modulesByGroup(group: ReportingModuleGroup) {
  return REPORTING_MODULES.filter((module) => module.group === group);
}

function validDateQuery(value: unknown) {
  const normalized = String(Array.isArray(value) ? value[0] : value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function firstPresent(row: AnyRow, fields: string[]) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return null;
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function humanize(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text
    .replace(/[_-]+/g, " ")
    .toLocaleLowerCase("es-EC")
    .replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("es-EC"));
}

function findDateValue(row: AnyRow, module: ReportingModule) {
  const explicit = firstPresent(row, module.dateFields);
  if (explicit) return explicit;
  const fallbackEntry = Object.entries(row).find(
    ([key, value]) =>
      value &&
      /fecha|date|created_at|updated_at|emision|movimiento/i.test(key) &&
      !Number.isNaN(new Date(String(value)).getTime()),
  );
  return fallbackEntry?.[1] ?? null;
}

function toDateKey(value: unknown) {
  if (!value) return "";
  const direct = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function numericValue(row: AnyRow, fields: string[]) {
  for (const field of fields) {
    const raw = row?.[field];
    if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") continue;
    const number = Number(raw);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function normalizeEvent(row: AnyRow, index: number): ReportEvent | null {
  const module = activeModule.value;
  const dateKey = toDateKey(findDateValue(row, module));
  if (!module.snapshot && !dateKey) return null;
  if (!module.snapshot && (dateKey < appliedStartDate.value || dateKey > appliedEndDate.value)) return null;

  const rawTitle = firstPresent(row, module.titleFields);
  const rawStatus = firstPresent(row, module.statusFields);
  const rawCategory = firstPresent(row, module.categoryFields);
  const owner = firstPresent(row, module.ownerFields ?? []);
  const status = humanize(rawStatus, "Sin estado");
  const category = humanize(rawCategory, "Sin clasificación");
  const id = String(row?.id || row?.uuid || row?.codigo || index);
  return {
    key: `${module.key}-${id}-${index}`,
    dateKey,
    dateLabel: dateKey ? formatDateOnly(dateKey) : "Sin fecha",
    title: String(rawTitle || `Registro ${index + 1}`),
    status,
    statusKey: normalizeKey(status),
    category,
    categoryKey: normalizeKey(category),
    value: numericValue(row, module.valueFields),
    owner: String(owner || "Sin responsable registrado"),
    raw: row,
  };
}

const events = computed(() =>
  rawRows.value
    .map(normalizeEvent)
    .filter((event): event is ReportEvent => Boolean(event))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
);
const recentEvents = computed(() => events.value.slice(0, 8));

function aggregate(
  rows: ReportEvent[],
  keyOf: (row: ReportEvent) => string,
  labelOf: (row: ReportEvent) => string,
) {
  const buckets = new Map<string, AggregatePoint>();
  for (const row of rows) {
    const key = keyOf(row) || "SIN_DATO";
    const current = buckets.get(key) ?? { key, label: labelOf(row), count: 0 };
    current.count += 1;
    buckets.set(key, current);
  }
  return [...buckets.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const rangeDays = computed(() => {
  const start = new Date(`${appliedStartDate.value}T12:00:00`);
  const end = new Date(`${appliedEndDate.value}T12:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
});
const useMonthlyTimeline = computed(() => rangeDays.value > 62);
const timelinePoints = computed(() => {
  const dated = events.value.filter((event) => event.dateKey);
  const points = aggregate(
    dated,
    (event) => useMonthlyTimeline.value ? event.dateKey.slice(0, 7) : event.dateKey,
    (event) => useMonthlyTimeline.value
      ? new Intl.DateTimeFormat("es-EC", { month: "short", year: "numeric" }).format(new Date(`${event.dateKey.slice(0, 7)}-15T12:00:00`))
      : event.dateLabel,
  );
  return points.sort((a, b) => a.key.localeCompare(b.key));
});
const statusPoints = computed(() => aggregate(events.value, (row) => row.statusKey, (row) => row.status));
const categoryPoints = computed(() => aggregate(events.value, (row) => row.categoryKey, (row) => row.category).slice(0, 10));
const totalValue = computed(() => events.value.reduce((sum, row) => sum + row.value, 0));
const activeCount = computed(() =>
  events.value.filter((row) => /ACTIV|ABIERT|PROCES|PLANIFIC|PENDIENT|RESERVAD|OPERATIV/.test(row.statusKey)).length,
);
const attentionCount = computed(() =>
  events.value.filter((row) => /ANUL|CRITIC|VENCID|BLOQUE|RECHAZ|ERROR|INACTIV|PARAD/.test(row.statusKey)).length,
);
const summaryCards = computed(() => [
  {
    label: activeModule.value.snapshot ? "Registros actuales" : "Registros del período",
    value: formatCount(events.value.length),
    helper: activeRangeLabel.value,
    icon: "mdi-database-outline",
  },
  {
    label: "Activos o en curso",
    value: formatCount(activeCount.value),
    helper: "Según el estado registrado",
    icon: "mdi-progress-clock",
  },
  {
    label: "Requieren atención",
    value: formatCount(attentionCount.value),
    helper: "Estados críticos, vencidos o anulados",
    icon: "mdi-alert-circle-outline",
  },
  {
    label: activeModule.value.valueLabel || "Valor consolidado",
    value: formatNumber(totalValue.value),
    helper: "Suma de los valores informados",
    icon: "mdi-sigma",
  },
]);
const insightText = computed(() => {
  const dominantStatus = statusPoints.value[0];
  const dominantCategory = categoryPoints.value[0];
  const peak = [...timelinePoints.value].sort((a, b) => b.count - a.count)[0];
  const parts = [];
  if (dominantStatus) parts.push(`${dominantStatus.label} concentra ${formatCount(dominantStatus.count)} registro(s)`);
  if (dominantCategory) parts.push(`${dominantCategory.label} es la clasificación principal`);
  if (peak) parts.push(`el mayor movimiento ocurrió en ${peak.label} con ${formatCount(peak.count)}`);
  return `${parts.join("; ")}.`;
});

const timelineChartOption = computed(() => {
  const dark = theme.global.current.value.dark;
  return {
    ...chartBase(dark),
    aria: { enabled: true, description: `Actividad de ${activeModule.value.title} por fecha.` },
    xAxis: { ...chartBase(dark).xAxis, data: timelinePoints.value.map((item) => item.label) },
    yAxis: { ...chartBase(dark).yAxis, minInterval: 1, name: "Registros" },
    series: [{
      name: "Registros",
      type: timelinePoints.value.length < 4 ? "bar" : "line",
      smooth: timelinePoints.value.length >= 4,
      symbol: "circle",
      symbolSize: 10,
      itemStyle: { color: seriesColor(0, dark) },
      lineStyle: { width: 3, color: seriesColor(0, dark) },
      areaStyle: timelinePoints.value.length >= 4 ? { color: seriesColor(0, dark), opacity: 0.12 } : undefined,
      data: timelinePoints.value.map((item) => ({ value: item.count, key: item.key })),
    }],
  };
});
const statusChartOption = computed(() => {
  const dark = theme.global.current.value.dark;
  const ink = chartInk(dark);
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: ink.surface,
      borderColor: ink.border,
      textStyle: { color: ink.text },
      formatter: "{b}: {c} ({d}%)",
    },
    legend: { bottom: 0, type: "scroll", textStyle: { color: ink.text } },
    aria: { enabled: true, description: `Distribución de ${activeModule.value.title} por estado.` },
    series: [{
      name: "Estado",
      type: "pie",
      radius: ["46%", "70%"],
      center: ["50%", "43%"],
      label: { color: ink.text, formatter: "{b}\n{c}" },
      data: statusPoints.value.slice(0, 8).map((item, index) => ({
        name: item.label,
        value: item.count,
        key: item.key,
        itemStyle: { color: seriesColor(index, dark) },
      })),
    }],
  };
});
const categoryChartOption = computed(() => {
  const dark = theme.global.current.value.dark;
  const base = chartBase(dark);
  const ordered = [...categoryPoints.value].reverse();
  return {
    ...base,
    aria: { enabled: true, description: `Principales clasificaciones de ${activeModule.value.title}.` },
    grid: { ...base.grid, left: 18, right: 30, bottom: 24 },
    xAxis: { ...base.yAxis, type: "value", minInterval: 1, name: "Registros" },
    yAxis: {
      ...base.xAxis,
      type: "category",
      data: ordered.map((item) => item.label),
      axisLabel: { ...base.xAxis.axisLabel, width: 145, overflow: "truncate" },
    },
    series: [{
      name: "Registros",
      type: "bar",
      barMaxWidth: 24,
      label: { show: true, position: "right", color: chartInk(dark).text },
      itemStyle: { color: seriesColor(2, dark), borderRadius: [0, 6, 6, 0] },
      data: ordered.map((item) => ({ value: item.count, key: item.key })),
    }],
  };
});

function formatCount(value: unknown) {
  return new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(Number(value || 0));
}
function formatNumber(value: unknown) {
  return new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function requestParams(module: ReportingModule) {
  const params: Record<string, string> = { ...(module.requestParams ?? {}) };
  if (!module.snapshot && module.serverDateParams) {
    params[module.serverDateParams.from] = appliedStartDate.value;
    params[module.serverDateParams.to] = appliedEndDate.value;
  }
  return params;
}

function unwrap(payload: any) {
  return payload?.data ?? payload;
}

async function fetchWarehouseDocuments(module: ReportingModule) {
  const rows: AnyRow[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data } = await api.get(module.endpoint, {
      params: { page, limit: 100, ...requestParams(module) },
    });
    const payload = unwrap(data) ?? {};
    const pageRows = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : [];
    rows.push(...pageRows);
    const total = Number(payload?.pagination?.total ?? rows.length);
    const totalPages = Number(payload?.pagination?.totalPages ?? Math.ceil(total / 100));
    if (!pageRows.length || rows.length >= total || page >= totalPages) break;
  }
  return rows;
}

async function fetchReservations(module: ReportingModule) {
  const { data } = await api.get(module.endpoint);
  const payload = unwrap(data) ?? {};
  return Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
}

async function fetchModuleRows(module: ReportingModule) {
  if (module.loader === "warehouse-documents") return fetchWarehouseDocuments(module);
  if (module.loader === "reservations") return fetchReservations(module);
  const rows = await listAllPages(module.endpoint, requestParams(module), { limit: 100, maxPages: 100 });
  if (module.key === "work-orders") {
    return rows.filter((row) => normalizeKey(row?.maintenance_kind) !== "PROYECTO");
  }
  if (module.key === "project-work-orders") {
    return rows.filter((row) => normalizeKey(row?.maintenance_kind) === "PROYECTO");
  }
  return rows;
}

async function loadActiveModule() {
  if (!canAccess.value || invalidDraftRange.value) return;
  const sequence = ++loadSequence;
  loading.value = true;
  error.value = "";
  ignoredUndatedCount.value = 0;
  try {
    const rows = await fetchModuleRows(activeModule.value);
    if (sequence !== loadSequence) return;
    rawRows.value = Array.isArray(rows) ? rows : [];
    if (!activeModule.value.snapshot) {
      ignoredUndatedCount.value = rawRows.value.filter(
        (row) => !toDateKey(findDateValue(row, activeModule.value)),
      ).length;
    }
  } catch (requestError: any) {
    if (sequence !== loadSequence) return;
    rawRows.value = [];
    error.value =
      requestError?.response?.data?.message ||
      requestError?.message ||
      `No se pudo cargar el consolidado de ${activeModule.value.title}.`;
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

function syncQuery() {
  void router.replace({
    query: {
      ...route.query,
      modulo: activeModule.value.key,
      desde: appliedStartDate.value,
      hasta: appliedEndDate.value,
    },
  });
}

function selectModule(key: string) {
  if (activeModuleKey.value === key) return;
  activeModuleKey.value = key;
  detailDialog.value = false;
  syncQuery();
  void loadActiveModule();
}

function applyDateRange() {
  if (invalidDraftRange.value) return;
  appliedStartDate.value = draftStartDate.value;
  appliedEndDate.value = draftEndDate.value;
  syncQuery();
  void loadActiveModule();
}

function openDetails(title: string, rows: ReportEvent[]) {
  detailTitle.value = title;
  detailRows.value = rows;
  detailSearch.value = "";
  detailDialog.value = true;
}
function openAllDetails(title: string) {
  openDetails(title, events.value);
}
function openDetailByDate(key: string, label: string) {
  const matches = events.value.filter((event) =>
    useMonthlyTimeline.value ? event.dateKey.startsWith(key) : event.dateKey === key,
  );
  openDetails(`Actividad de ${label}`, matches);
}
function openDetailByStatus(key: string, label: string) {
  openDetails(`Estado: ${label}`, events.value.filter((event) => event.statusKey === key));
}
function openDetailByCategory(key: string, label: string) {
  openDetails(`Clasificación: ${label}`, events.value.filter((event) => event.categoryKey === key));
}
function openTimelineDetail(payload: any) {
  const point = timelinePoints.value[payload?.dataIndex];
  if (point) openDetailByDate(point.key, point.label);
}
function openStatusDetail(payload: any) {
  const point = statusPoints.value.find((item) => item.label === payload?.name);
  if (point) openDetailByStatus(point.key, point.label);
}
function openCategoryDetail(payload: any) {
  const ordered = [...categoryPoints.value].reverse();
  const point = ordered[payload?.dataIndex];
  if (point) openDetailByCategory(point.key, point.label);
}

function openSourceModule() {
  detailDialog.value = false;
  void router.push({ name: activeModule.value.routeName });
}

onMounted(() => {
  if (canAccess.value) void loadActiveModule();
});
</script>

<style scoped>
.reports-hub {
  --report-border: rgba(var(--v-theme-on-surface), 0.12);
  --report-muted: rgba(var(--v-theme-on-surface), 0.68);
  display: grid;
  gap: 20px;
  padding-bottom: 32px;
}

.reports-hero,
.module-navigation,
.chart-card,
.recent-card,
.summary-card {
  border: 1px solid var(--report-border);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.reports-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  border-radius: 20px;
  background:
    linear-gradient(120deg, rgba(var(--v-theme-primary), 0.12), transparent 58%),
    rgb(var(--v-theme-surface));
}

.reports-hero__copy { max-width: 720px; }
.reports-hero h1 { margin: 4px 0 8px; font-size: clamp(1.7rem, 3vw, 2.55rem); line-height: 1.08; }
.reports-hero p,
.module-heading p,
.chart-card__heading p,
.detail-dialog__title p { margin: 0; color: var(--report-muted); }
.reports-hero__filters { display: grid; grid-template-columns: minmax(150px, 1fr) minmax(150px, 1fr) auto; gap: 12px; min-width: min(100%, 520px); }

.reports-hero__eyebrow,
.section-eyebrow {
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.module-navigation { padding: 20px; border-radius: 18px; }
.module-navigation__header,
.module-heading,
.chart-card__heading,
.detail-dialog__title,
.detail-dialog__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.module-navigation h2,
.module-heading h2,
.chart-card h3,
.recent-card h3,
.detail-dialog__title h2 { margin: 2px 0 4px; }
.module-navigation__group { margin-top: 16px; }
.module-navigation__group-title { margin-bottom: 8px; color: var(--report-muted); font-size: 0.78rem; font-weight: 800; text-transform: uppercase; }
.module-navigation__items { display: flex; flex-wrap: wrap; gap: 8px; }
.module-navigation__button { min-height: 44px; text-transform: none; }

.module-heading { padding: 4px 2px; }
.module-heading__identity { display: flex; align-items: center; gap: 14px; min-width: 0; }
.module-heading__identity > .v-icon { flex: 0 0 auto; color: rgb(var(--v-theme-primary)); }
.module-heading__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }

.report-loading { display: grid; gap: 18px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.summary-card { display: flex; align-items: flex-start; gap: 14px; min-height: 132px; padding: 20px; border-radius: 16px; }
.summary-card__icon { display: grid; width: 44px; height: 44px; flex: 0 0 44px; place-items: center; border-radius: 12px; color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), 0.12); }
.summary-card span,
.summary-card small { display: block; color: var(--report-muted); }
.summary-card strong { display: block; margin: 4px 0; font-size: clamp(1.45rem, 2vw, 2rem); line-height: 1; }
.summary-card small { font-size: 0.76rem; }
.insight-banner { margin: 0; }

.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.chart-card { min-width: 0; padding: 20px; border-radius: 18px; }
.chart-card--wide { grid-column: 1 / -1; }
.chart-card__heading { align-items: flex-start; margin-bottom: 10px; }
.chart-card__heading p { font-size: 0.88rem; }
.chart-empty,
.empty-report { display: grid; min-height: 250px; place-items: center; align-content: center; gap: 10px; color: var(--report-muted); text-align: center; }
.empty-report { min-height: 360px; padding: 32px; border: 1px dashed var(--report-border); border-radius: 18px; }
.empty-report h3,
.empty-report p { margin: 0; }
.empty-report p { max-width: 620px; }
.chart-fallback { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; border-top: 1px solid var(--report-border); padding-top: 8px; }
.chart-fallback .v-btn { min-height: 40px; text-transform: none; }

.recent-card { overflow: hidden; border-radius: 18px; }
.recent-card > .chart-card__heading { padding: 20px 20px 12px; }
.recent-table { border-top: 1px solid var(--report-border); }
.recent-table small { display: block; margin-top: 2px; color: var(--report-muted); }
.recent-table th { white-space: nowrap; }
.detail-dialog__title { align-items: flex-start; padding: 22px 24px 12px; white-space: normal; }
.detail-dialog__actions { padding: 12px 24px 20px; }

@media (max-width: 1100px) {
  .reports-hero { align-items: stretch; flex-direction: column; }
  .reports-hero__filters { width: 100%; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 700px) {
  .reports-hub { gap: 16px; }
  .reports-hero,
  .module-navigation,
  .chart-card { padding: 16px; border-radius: 14px; }
  .reports-hero__filters { grid-template-columns: 1fr; }
  .reports-hero__filters .v-btn { min-height: 48px; }
  .module-navigation__header,
  .module-heading,
  .chart-card__heading { align-items: stretch; flex-direction: column; }
  .module-navigation__items { flex-wrap: nowrap; overflow-x: auto; padding: 2px 2px 10px; scroll-snap-type: x proximity; }
  .module-navigation__button { flex: 0 0 auto; scroll-snap-align: start; }
  .module-heading__actions { justify-content: flex-start; }
  .summary-grid,
  .chart-grid { grid-template-columns: 1fr; }
  .chart-card--wide { grid-column: auto; }
  .recent-card { overflow-x: auto; }
  .recent-card > .chart-card__heading { min-width: 700px; }
  .recent-table { min-width: 700px; }
  .detail-dialog__actions { align-items: stretch; flex-direction: column; }
  .detail-dialog__actions .v-spacer { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .reports-hub *,
  .reports-hub *::before,
  .reports-hub *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
}
</style>

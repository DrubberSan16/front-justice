<template>
  <div
    :class="['comparison-chart', { 'comparison-chart--interactive': hasSeries }]"
    :role="hasSeries ? 'button' : undefined"
    :tabindex="hasSeries ? 0 : undefined"
    @click="openDialog"
    @keydown.enter.prevent="openDialog"
    @keydown.space.prevent="openDialog"
  >
    <div class="comparison-chart__header">
      <div class="comparison-chart__copy">
        <div class="text-subtitle-2 font-weight-bold">{{ title }}</div>
        <div class="text-caption text-medium-emphasis">{{ subtitle }}</div>
      </div>
      <div class="d-flex align-center" style="gap: 8px;">
        <v-chip size="small" variant="tonal" color="primary">
          {{ chartSeries.length }} series
        </v-chip>
        <v-btn
          v-if="hasSeries"
          icon="mdi-arrow-expand-all"
          size="small"
          variant="text"
          color="primary"
          aria-label="Ampliar la comparacion"
          @click.stop="openDialog"
        />
      </div>
    </div>

    <div v-if="!hasSeries" class="comparison-chart__empty">
      Sin datos numericos para comparar en el rango seleccionado.
    </div>

    <div v-else class="comparison-chart__shell">
      <EChart :option="miniOption" height="180px" />
      <div class="comparison-chart__hint">
        Haz clic para ampliar y revisar cada muestra.
      </div>
    </div>
  </div>

  <v-dialog
    v-model="dialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1480"
  >
    <v-card rounded="xl" class="comparison-chart__dialog-card">
      <div class="comparison-chart__dialog-header">
        <div class="comparison-chart__copy">
          <div class="text-h6 font-weight-bold">{{ title }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ subtitle || "Comparacion de metricas en escala relativa" }}
          </div>
        </div>
        <div class="d-flex align-center flex-wrap" style="gap: 8px;">
          <v-chip size="small" color="primary" variant="tonal">
            {{ chartSeries.length }} series
          </v-chip>
          <v-chip size="small" color="secondary" variant="tonal">
            {{ chartCategories.length }} muestras
          </v-chip>
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Cerrar"
            @click="dialog = false"
          />
        </div>
      </div>

      <div class="comparison-chart__dialog-layout">
        <div class="comparison-chart__dialog-main">
          <EChart
            :option="detailOption"
            height="440px"
            @select="handleChartSelect"
          />
        </div>

        <aside class="comparison-chart__dialog-side">
          <div class="text-subtitle-1 font-weight-bold">Detalle del punto</div>
          <div v-if="selectedPoint" class="comparison-chart__detail-card">
            <div class="comparison-chart__detail-row">
              <span class="comparison-chart__detail-label">Serie</span>
              <span class="comparison-chart__detail-value">{{ selectedPoint.seriesLabel }}</span>
            </div>
            <div class="comparison-chart__detail-row">
              <span class="comparison-chart__detail-label">Fecha</span>
              <span class="comparison-chart__detail-value">{{ selectedPoint.fecha || "Sin fecha" }}</span>
            </div>
            <div class="comparison-chart__detail-row">
              <span class="comparison-chart__detail-label">Codigo</span>
              <span class="comparison-chart__detail-value">{{ selectedPoint.codigo || selectedPoint.categoryLabel }}</span>
            </div>
            <div class="comparison-chart__detail-row">
              <span class="comparison-chart__detail-label">Valor real</span>
              <span class="comparison-chart__detail-value">{{ selectedPoint.valueLabel }}</span>
            </div>
            <div class="comparison-chart__detail-row">
              <span class="comparison-chart__detail-label">Escala comparativa</span>
              <span class="comparison-chart__detail-value">{{ selectedPoint.normalizedLabel }}</span>
            </div>
            <div class="comparison-chart__detail-row">
              <span class="comparison-chart__detail-label">Estado</span>
              <v-chip size="small" :color="levelColor(selectedPoint.level)" variant="tonal">
                {{ levelTitle(selectedPoint.level) }}
              </v-chip>
            </div>
          </div>
          <div v-else class="comparison-chart__detail-empty">
            Selecciona un punto para ver su detalle.
          </div>
        </aside>
      </div>

      <div class="comparison-chart__table-wrap">
        <div class="text-subtitle-1 font-weight-bold mb-3">Detalle comparativo</div>
        <v-table density="compact" class="comparison-chart__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Serie</th>
              <th>Codigo</th>
              <th>Fecha</th>
              <th>Valor</th>
              <th>Escala</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(point, index) in tableRows"
              :key="`table-${point.key}`"
              :class="{ 'comparison-chart__table-row--active': selectedPoint?.key === point.key }"
              @click="selectPoint(point.key)"
            >
              <td>{{ index + 1 }}</td>
              <td>{{ point.seriesLabel }}</td>
              <td>{{ point.codigo || point.categoryLabel }}</td>
              <td>{{ point.fecha || "Sin fecha" }}</td>
              <td>{{ point.valueLabel }}</td>
              <td>{{ point.normalizedLabel }}</td>
              <td>
                <v-chip size="x-small" :color="levelColor(point.level)" variant="tonal">
                  {{ levelTitle(point.level) }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDisplay, useTheme } from "vuetify";
import EChart from "@/components/charts/EChart.vue";
import { chartInk, seriesColor } from "@/app/config/chart-theme";

type InputPoint = {
  codigo?: string | null;
  fecha?: string | null;
  numero_muestra?: string | null;
  valor?: number | null;
  nivel_alerta?: string | null;
};

type InputMetric = {
  key?: string;
  label?: string;
  unit?: string | null;
  points?: InputPoint[];
};

type PointLevel = "normal" | "warning" | "alert";
type CurveMode = "linear" | "smooth";

type CategoryPoint = {
  key: string;
  label: string;
  order: number;
};

type NormalizedPoint = {
  key: string;
  seriesKey: string;
  seriesLabel: string;
  color: string;
  codigo: string | null;
  fecha: string | null;
  categoryKey: string;
  categoryLabel: string;
  value: number;
  valueLabel: string;
  normalizedValue: number;
  normalizedLabel: string;
  level: PointLevel;
  order: number;
};

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    metrics?: InputMetric[];
    curveMode?: CurveMode;
  }>(),
  {
    metrics: () => [],
    curveMode: "linear",
  },
);

const dialog = ref(false);
const { mdAndDown } = useDisplay();
const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);
const isDialogFullscreen = computed(() => mdAndDown.value);
const selectedPointKey = ref<string | null>(null);

function toLevel(value: unknown): PointLevel {
  const raw = String(value ?? "").trim().toUpperCase();
  if (["ALERTA", "ANORMAL", "CRITICO", "CRITICAL"].includes(raw)) return "alert";
  if (["OBSERVACION", "PRECAUCION", "WARNING"].includes(raw)) return "warning";
  return "normal";
}

function formatActualValue(value: number, unit?: string | null) {
  const formatted = Number(value).toLocaleString("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

function levelColor(level: PointLevel) {
  if (level === "alert") return "error";
  if (level === "warning") return "warning";
  return "success";
}

function levelTitle(level: PointLevel) {
  if (level === "alert") return "ANORMAL";
  if (level === "warning") return "PRECAUCION";
  return "NORMAL";
}

function buildCategoryKey(point: InputPoint, fallback: string) {
  const parts = [point.fecha, point.codigo, point.numero_muestra].filter(Boolean);
  return parts.length ? parts.join("::") : fallback;
}

/**
 * Cada metrica se normaliza a 0-100 contra su propio rango.
 *
 * Es lo que permite comparar magnitudes de unidades distintas en un solo eje,
 * en vez de recurrir a un segundo eje vertical: dos escalas en el mismo grafico
 * hacen que dos series parezcan cruzarse cuando en realidad no comparten
 * unidad. El valor real viaja en el tooltip, el panel y la tabla.
 */
const chartData = computed(() => {
  const categoryMap = new Map<string, CategoryPoint>();
  const nextSeries = (props.metrics || [])
    .map((metric, metricIndex) => {
      const numericPoints = (metric.points || [])
        .map((point, pointIndex) => ({
          point,
          pointIndex,
          numericValue: Number(point.valor),
        }))
        .filter((item) => Number.isFinite(item.numericValue));

      if (!numericPoints.length) return null;

      const values = numericPoints.map((item) => item.numericValue);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const range = maxValue - minValue || 1;
      const color = seriesColor(metricIndex, isDark.value);

      const points = numericPoints.map((item, order) => {
        const categoryKey = buildCategoryKey(
          item.point,
          `${metric.key}-${item.pointIndex}`,
        );
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            key: categoryKey,
            label:
              item.point.fecha ||
              item.point.codigo ||
              item.point.numero_muestra ||
              `P${order + 1}`,
            order: categoryMap.size,
          });
        }

        const normalizedValue =
          maxValue === minValue
            ? 50
            : ((item.numericValue - minValue) / range) * 100;

        return {
          key: `${metric.key}-${categoryKey}`,
          seriesKey: String(metric.key || `serie-${metricIndex}`),
          seriesLabel: String(
            metric.label || metric.key || `Serie ${metricIndex + 1}`,
          ),
          color,
          codigo: item.point.codigo ? String(item.point.codigo) : null,
          fecha: item.point.fecha ? String(item.point.fecha) : null,
          categoryKey,
          categoryLabel: categoryMap.get(categoryKey)?.label || `P${order + 1}`,
          value: item.numericValue,
          valueLabel: formatActualValue(item.numericValue, metric.unit),
          normalizedValue,
          normalizedLabel: `${normalizedValue.toFixed(1)}%`,
          level: toLevel(item.point.nivel_alerta),
          order,
        } satisfies NormalizedPoint;
      });

      return {
        key: String(metric.key || `serie-${metricIndex}`),
        label: String(metric.label || metric.key || `Serie ${metricIndex + 1}`),
        color,
        points,
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    label: string;
    color: string;
    points: NormalizedPoint[];
  }>;

  return {
    categories: [...categoryMap.values()].sort((a, b) => a.order - b.order),
    series: nextSeries,
  };
});

const chartSeries = computed(() => chartData.value.series);
const chartCategories = computed(() => chartData.value.categories);
const hasSeries = computed(() => chartSeries.value.length > 0);

const tableRows = computed(() =>
  chartSeries.value.flatMap((serie) => serie.points),
);

const smooth = computed(() => props.curveMode === "smooth");

/** Punto de cada serie alineado a la categoria; los huecos quedan sin marca. */
function seriesRows(serie: { points: NormalizedPoint[] }) {
  const byCategory = new Map(
    serie.points.map((point) => [point.categoryKey, point] as const),
  );
  return chartCategories.value.map((category) => {
    const point = byCategory.get(category.key);
    return point ? point.normalizedValue : null;
  });
}

function buildSeries(showSymbols: boolean) {
  return chartSeries.value.map((serie) => ({
    name: serie.label,
    type: "line" as const,
    smooth: smooth.value,
    connectNulls: true,
    symbolSize: showSymbols ? 8 : 0,
    lineStyle: { width: 2, color: serie.color },
    itemStyle: { color: serie.color },
    emphasis: { focus: "series" as const },
    data: seriesRows(serie),
  }));
}

function tooltipFormatter(params: any) {
  const rows = Array.isArray(params) ? params : [params];
  const categoryIndex = rows[0]?.dataIndex ?? 0;
  const category = chartCategories.value[categoryIndex];
  const head = `<strong>${category?.label ?? ""}</strong>`;
  const body = rows
    .map((row: any) => {
      const serie = chartSeries.value.find((item) => item.label === row.seriesName);
      const point = serie?.points.find(
        (item) => item.categoryKey === category?.key,
      );
      if (!point) return "";
      // Se muestra el valor real, no el normalizado: el porcentaje solo sirve
      // para poder dibujarlas juntas.
      return `<div>${row.marker}${point.seriesLabel}: <strong>${point.valueLabel}</strong> <span style="opacity:.65">(${point.normalizedLabel})</span></div>`;
    })
    .filter(Boolean)
    .join("");
  return head + body;
}

const miniOption = computed(() => {
  const ink = chartInk(isDark.value);
  return {
    grid: { left: 8, right: 12, top: 12, bottom: 6, containLabel: true },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: ink.surface,
      borderColor: ink.border,
      borderWidth: 1,
      textStyle: { color: ink.text, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    textStyle: { color: ink.text, fontFamily: "inherit" },
    xAxis: {
      type: "category" as const,
      data: chartCategories.value.map((category) => category.label),
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 10, formatter: "{value}%" },
      splitLine: { lineStyle: { color: ink.grid } },
    },
    series: buildSeries(true),
  };
});

const detailOption = computed(() => {
  const ink = chartInk(isDark.value);
  const total = chartCategories.value.length;
  const startPercent = total > 14 ? Math.max(0, 100 - (14 / total) * 100) : 0;

  return {
    grid: { left: 16, right: 24, top: 44, bottom: 96, containLabel: true },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: ink.surface,
      borderColor: ink.border,
      borderWidth: 1,
      textStyle: { color: ink.text, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    // La leyenda siempre está presente con dos o más series: la identidad
    // nunca depende solo del color.
    legend: {
      top: 4,
      type: "scroll" as const,
      textStyle: { color: ink.text, fontSize: 12 },
      inactiveColor: ink.muted,
    },
    textStyle: { color: ink.text, fontFamily: "inherit" },
    dataZoom: [
      { type: "inside" as const, start: startPercent, end: 100 },
      {
        type: "slider" as const,
        start: startPercent,
        end: 100,
        height: 22,
        bottom: 18,
        borderColor: ink.border,
        fillerColor: isDark.value
          ? "rgba(47,108,171,0.24)"
          : "rgba(47,108,171,0.14)",
        handleStyle: { color: seriesColor(0, isDark.value) },
        textStyle: { color: ink.muted, fontSize: 10 },
      },
    ],
    xAxis: {
      type: "category" as const,
      data: chartCategories.value.map((category) => category.label),
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 11, rotate: 35, hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      min: 0,
      max: 100,
      name: "Escala comparativa",
      nameTextStyle: { color: ink.muted, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 11, formatter: "{value}%" },
      splitLine: { lineStyle: { color: ink.grid } },
    },
    series: buildSeries(true),
  };
});

const selectedPoint = computed(() => {
  if (!tableRows.value.length) return null;
  return (
    tableRows.value.find((item) => item.key === selectedPointKey.value) ||
    tableRows.value[tableRows.value.length - 1] ||
    null
  );
});

watch(
  tableRows,
  (rows) => {
    if (!rows.length) {
      selectedPointKey.value = null;
      dialog.value = false;
      return;
    }
    if (!rows.some((item) => item.key === selectedPointKey.value)) {
      selectedPointKey.value = rows[rows.length - 1]?.key || null;
    }
  },
  { immediate: true },
);

function selectPoint(key: string) {
  selectedPointKey.value = key;
}

function handleChartSelect(params: any) {
  const serie = chartSeries.value.find((item) => item.label === params?.seriesName);
  const category = chartCategories.value[params?.dataIndex];
  const point = serie?.points.find((item) => item.categoryKey === category?.key);
  if (point) selectPoint(point.key);
}

function openDialog() {
  if (!hasSeries.value) return;
  if (!selectedPointKey.value) {
    selectedPointKey.value = tableRows.value[tableRows.value.length - 1]?.key || null;
  }
  dialog.value = true;
}
</script>

<style scoped>
.comparison-chart {
  padding: 16px;
  min-width: 0;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: var(--chart-card-bg);
}

.comparison-chart__copy {
  min-width: 0;
}

.comparison-chart--interactive {
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.comparison-chart--interactive:hover,
.comparison-chart--interactive:focus-visible {
  transform: translateY(-2px);
  border-color: var(--chart-card-hover-border);
  box-shadow: var(--chart-card-hover-shadow);
  outline: none;
}

.comparison-chart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.comparison-chart__shell {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.comparison-chart__hint {
  font-size: 12px;
  color: var(--chart-empty-text);
}

.comparison-chart__empty {
  padding: 24px;
  border-radius: 18px;
  background: var(--chart-empty-bg);
  color: var(--chart-empty-text);
  font-size: 14px;
}

.comparison-chart__dialog-card {
  overflow: hidden;
}

.comparison-chart__dialog-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--surface-border);
  background: var(--chart-dialog-header-bg);
}

.comparison-chart__dialog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 20px 24px 8px;
}

.comparison-chart__dialog-main {
  min-width: 0;
}

.comparison-chart__dialog-side {
  min-width: 0;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: var(--chart-dialog-shell-bg);
}

.comparison-chart__detail-card {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.comparison-chart__detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.comparison-chart__detail-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--chart-empty-text);
}

.comparison-chart__detail-value {
  font-weight: 700;
  text-align: right;
  word-break: break-word;
}

.comparison-chart__detail-empty {
  margin-top: 12px;
  font-size: 13px;
  color: var(--chart-empty-text);
}

.comparison-chart__table-wrap {
  padding: 12px 24px 24px;
  min-width: 0;
}

.comparison-chart__table {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: hidden;
}

.comparison-chart__table tbody tr {
  cursor: pointer;
}

.comparison-chart__table-row--active {
  background: var(--chart-table-active);
}

@media (prefers-reduced-motion: reduce) {
  .comparison-chart--interactive {
    transition: none;
  }
}

@media (max-width: 1100px) {
  .comparison-chart__dialog-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

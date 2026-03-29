<template>
  <div
    :class="['comparison-chart', { 'comparison-chart--interactive': hasSeries }]"
    :role="hasSeries ? 'button' : undefined"
    :tabindex="hasSeries ? 0 : undefined"
    @click="openDialog"
    @keydown.enter.prevent="openDialog"
    @keydown.space.prevent="openDialog"
  >
    <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px;">
      <div>
        <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ subtitle || "Comparativa normalizada de tendencias" }}
        </div>
        </div>
        <div class="d-flex align-center flex-wrap" style="gap: 8px;">
          <v-chip size="small" color="primary" variant="tonal">
            {{ chartSeries.length }} líneas
          </v-chip>
        <v-chip size="small" color="secondary" variant="tonal">
          {{ chartCategories.length }} cortes
        </v-chip>
      </div>
    </div>

    <div v-if="!hasSeries" class="comparison-chart__empty">
      No hay series numericas disponibles para este bloque.
    </div>

    <div v-else class="comparison-chart__shell">
      <svg
        :viewBox="`0 0 ${miniChart.width} ${miniChart.height}`"
        class="comparison-chart__svg"
        preserveAspectRatio="none"
      >
        <line
          v-for="guide in miniChart.guides"
          :key="`guide-${guide.key}`"
          :x1="miniChart.padding.left"
          :x2="miniChart.width - miniChart.padding.right"
          :y1="guide.y"
          :y2="guide.y"
          class="comparison-chart__guide"
        />
        <line
          :x1="miniChart.padding.left"
          :y1="miniChart.padding.top"
          :x2="miniChart.padding.left"
          :y2="miniChart.chartBottom"
          class="comparison-chart__axis"
        />
        <line
          :x1="miniChart.padding.left"
          :y1="miniChart.chartBottom"
          :x2="miniChart.width - miniChart.padding.right"
          :y2="miniChart.chartBottom"
          class="comparison-chart__axis"
        />

        <g v-for="series in miniChart.series" :key="series.key">
          <path
            :d="series.path"
            class="comparison-chart__line"
            :style="{ stroke: series.color }"
          />
          <g v-for="point in series.points" :key="point.key">
            <circle
              :cx="point.x"
              :cy="point.y"
              r="4.2"
              :class="['comparison-chart__dot', `comparison-chart__dot--${point.level}`]"
              :style="{ stroke: series.color }"
            />
          </g>
        </g>
      </svg>

      <div class="comparison-chart__scale">
        <span>0%</span>
        <span>100%</span>
      </div>

      <div class="comparison-chart__labels">
        <span>{{ miniChart.xStartLabel }}</span>
        <span>{{ miniChart.xEndLabel }}</span>
      </div>

      <div class="comparison-chart__legend">
        <div
          v-for="series in chartSeries"
          :key="`mini-legend-${series.key}`"
          class="comparison-chart__legend-item"
        >
          <span
            class="comparison-chart__legend-line"
            :style="{ backgroundColor: series.color }"
          />
          <span>{{ series.label }}</span>
        </div>
      </div>
    </div>
  </div>

  <v-dialog v-model="dialog" :fullscreen="isDialogFullscreen" :max-width="isDialogFullscreen ? undefined : 1540">
    <v-card rounded="xl" class="comparison-chart__dialog">
      <div class="comparison-chart__dialog-header">
        <div>
          <div class="text-h6 font-weight-bold">{{ title }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ subtitle || "Comparativa normalizada de tendencias" }}
          </div>
        </div>
        <div class="d-flex align-center flex-wrap" style="gap: 8px;">
          <v-chip size="small" color="primary" variant="tonal">
            {{ chartSeries.length }} líneas
          </v-chip>
          <v-chip size="small" color="secondary" variant="tonal">
            Escala comparativa 0% - 100%
          </v-chip>
          <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
        </div>
      </div>

      <div class="comparison-chart__dialog-layout">
        <div class="comparison-chart__dialog-main">
          <div class="comparison-chart__dialog-shell">
            <svg
              :viewBox="`0 0 ${detailChart.width} ${detailChart.height}`"
              class="comparison-chart__svg comparison-chart__svg--detail"
              preserveAspectRatio="xMidYMid meet"
            >
              <line
                v-for="guide in detailChart.guides"
                :key="`detail-guide-${guide.key}`"
                :x1="detailChart.padding.left"
                :x2="detailChart.width - detailChart.padding.right"
                :y1="guide.y"
                :y2="guide.y"
                class="comparison-chart__guide"
              />
              <text
                v-for="guide in detailChart.guides"
                :key="`detail-guide-label-${guide.key}`"
                :x="detailChart.padding.left - 12"
                :y="guide.y + 4"
                class="comparison-chart__y-label"
                text-anchor="end"
              >
                {{ guide.label }}
              </text>

              <line
                :x1="detailChart.padding.left"
                :y1="detailChart.padding.top"
                :x2="detailChart.padding.left"
                :y2="detailChart.chartBottom"
                class="comparison-chart__axis"
              />
              <line
                :x1="detailChart.padding.left"
                :y1="detailChart.chartBottom"
                :x2="detailChart.width - detailChart.padding.right"
                :y2="detailChart.chartBottom"
                class="comparison-chart__axis"
              />

              <g v-for="series in detailChart.series" :key="`detail-series-${series.key}`">
                <path
                  :d="series.path"
                  class="comparison-chart__line"
                  :style="{ stroke: series.color }"
                />
                <g v-for="point in series.points" :key="point.key">
                  <line
                    :x1="point.x"
                    :x2="point.x"
                    :y1="point.y"
                    :y2="detailChart.chartBottom"
                    class="comparison-chart__drop"
                  />
                  <circle
                    :cx="point.x"
                    :cy="point.y"
                    :r="selectedPoint?.key === point.key ? 8 : 6"
                    :class="['comparison-chart__dot', 'comparison-chart__dot--detail', `comparison-chart__dot--${point.level}`]"
                    :style="{ stroke: series.color }"
                    @mouseenter="selectPoint(point.key)"
                    @click.stop="selectPoint(point.key)"
                  />
                  <text
                    :x="point.x"
                    :y="point.y - 14"
                    class="comparison-chart__point-value"
                    text-anchor="middle"
                  >
                    {{ point.valueLabel }}
                  </text>
                </g>
              </g>

              <text
                v-for="category in detailChart.categories"
                :key="`category-${category.key}`"
                :x="category.x"
                :y="detailChart.chartBottom + 22"
                class="comparison-chart__x-label"
                text-anchor="end"
                :transform="`rotate(-35 ${category.x} ${detailChart.chartBottom + 22})`"
              >
                {{ category.label }}
              </text>
            </svg>
          </div>

          <div class="comparison-chart__legend comparison-chart__legend--detail">
            <div
              v-for="series in chartSeries"
              :key="`detail-legend-${series.key}`"
              class="comparison-chart__legend-item"
            >
              <span
                class="comparison-chart__legend-line"
                :style="{ backgroundColor: series.color }"
              />
              <span>{{ series.label }}</span>
            </div>
          </div>
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
import { useDisplay } from "vuetify";

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

type ChartPadding = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

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

type PlottedPoint = NormalizedPoint & {
  x: number;
  y: number;
};

type MetricSeries = {
  key: string;
  label: string;
  color: string;
  points: NormalizedPoint[];
};

type ChartData = {
  categories: CategoryPoint[];
  series: MetricSeries[];
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

const COLORS = [
  "#1f4b7a",
  "#ba4a00",
  "#1f7a4b",
  "#8e44ad",
  "#d35400",
  "#00695c",
  "#b03a2e",
  "#2e86c1",
  "#7d6608",
  "#5b2c6f",
];

const dialog = ref(false);
const { mdAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);
const selectedPointKey = ref<string | null>(null);

const miniPadding: ChartPadding = {
  left: 44,
  right: 24,
  top: 18,
  bottom: 28,
};

const detailPadding: ChartPadding = {
  left: 72,
  right: 30,
  top: 24,
  bottom: 84,
};

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

const chartData = computed<ChartData>(() => {
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
      const color = COLORS[metricIndex % COLORS.length] || "#1f4b7a";

      const points = numericPoints.map((item, order) => {
        const categoryKey = buildCategoryKey(
          item.point,
          `${metric.key}-${item.pointIndex}`,
        );
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            key: categoryKey,
            label: item.point.fecha || item.point.codigo || item.point.numero_muestra || `P${order + 1}`,
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
          seriesLabel: String(metric.label || metric.key || `Serie ${metricIndex + 1}`),
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

function buildLinearPath(points: PlottedPoint[]) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildSmoothPath(points: PlottedPoint[]) {
  if (!points.length) return "";
  if (points.length < 3) return buildLinearPath(points);

  const firstPoint = points[0];
  if (!firstPoint) return "";
  const segments = [`M ${firstPoint.x} ${firstPoint.y}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) continue;
    const controlX = (current.x + next.x) / 2;
    segments.push(`Q ${controlX} ${current.y} ${next.x} ${next.y}`);
  }
  return segments.join(" ");
}

function buildChartModel(width: number, height: number, padding: ChartPadding) {
  const chartWidth = Math.max(width - padding.left - padding.right, 1);
  const chartHeight = Math.max(height - padding.top - padding.bottom, 1);
  const chartBottom = height - padding.bottom;
  const categoryIndex = new Map(
    chartCategories.value.map((item, index) => [item.key, index] as const),
  );

  const categories = chartCategories.value.map((category, index) => ({
    ...category,
    x:
      chartCategories.value.length === 1
        ? padding.left + chartWidth / 2
        : padding.left +
          (chartWidth * index) / Math.max(chartCategories.value.length - 1, 1),
  }));

  const series = chartSeries.value.map((series) => {
    const points = series.points
      .map<PlottedPoint>((point) => {
        const index = categoryIndex.get(point.categoryKey) ?? 0;
        const x =
          chartCategories.value.length === 1
            ? padding.left + chartWidth / 2
            : padding.left +
              (chartWidth * index) / Math.max(chartCategories.value.length - 1, 1);
        const y = chartBottom - (point.normalizedValue / 100) * chartHeight;
        return {
          ...point,
          x,
          y,
        };
      })
      .sort((a, b) => {
        const indexA = categoryIndex.get(a.categoryKey) ?? 0;
        const indexB = categoryIndex.get(b.categoryKey) ?? 0;
        return indexA - indexB;
      });

    return {
      key: series.key,
      label: series.label,
      color: series.color,
      points,
      path:
        props.curveMode === "smooth"
          ? buildSmoothPath(points)
          : buildLinearPath(points),
    };
  });

  const guides = [0, 25, 50, 75, 100].map((value, index) => ({
    key: index,
    y: chartBottom - (value / 100) * chartHeight,
    label: `${value}%`,
  }));

  return {
    width,
    height,
    padding,
    chartBottom,
    categories,
    series,
    guides,
    xStartLabel: categories[0]?.label || "",
    xEndLabel: categories[categories.length - 1]?.label || "",
  };
}

const miniChart = computed(() => buildChartModel(440, 200, miniPadding));
const detailWidth = computed(() =>
  Math.max(1180, 180 + chartCategories.value.length * 92),
);
const detailChart = computed(() =>
  buildChartModel(detailWidth.value, 460, detailPadding),
);

const allPoints = computed(() =>
  detailChart.value.series.flatMap((series) => series.points),
);

const selectedPoint = computed(() => {
  if (!allPoints.value.length) return null;
  return (
    allPoints.value.find((point) => point.key === selectedPointKey.value) ||
    allPoints.value[allPoints.value.length - 1] ||
    null
  );
});

const tableRows = computed(() =>
  [...allPoints.value].sort((a, b) => {
    if ((a.fecha || "") !== (b.fecha || "")) {
      return String(a.fecha || "").localeCompare(String(b.fecha || ""));
    }
    return a.seriesLabel.localeCompare(b.seriesLabel);
  }),
);

watch(
  allPoints,
  (points) => {
    if (!points.length) {
      selectedPointKey.value = null;
      dialog.value = false;
      return;
    }
    if (!points.some((point) => point.key === selectedPointKey.value)) {
      selectedPointKey.value = points[points.length - 1]?.key || null;
    }
  },
  { immediate: true },
);

function selectPoint(key: string) {
  selectedPointKey.value = key;
}

function openDialog() {
  if (!hasSeries.value) return;
  if (!selectedPointKey.value) {
    selectedPointKey.value = allPoints.value[allPoints.value.length - 1]?.key || null;
  }
  dialog.value = true;
}
</script>

<style scoped>
.comparison-chart {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: rgba(255, 255, 255, 0.55);
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
  border-color: rgba(31, 75, 122, 0.25);
  box-shadow: 0 16px 36px rgba(17, 35, 58, 0.12);
  outline: none;
}

.comparison-chart__shell {
  display: grid;
  gap: 8px;
}

.comparison-chart__svg {
  width: 100%;
  height: 200px;
  display: block;
}

.comparison-chart__svg--detail {
  width: 100%;
  min-width: 1040px;
  height: 460px;
}

.comparison-chart__guide {
  stroke: rgba(31, 75, 122, 0.12);
  stroke-width: 1;
}

.comparison-chart__axis {
  stroke: rgba(31, 75, 122, 0.35);
  stroke-width: 1.2;
}

.comparison-chart__line {
  fill: none;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.comparison-chart__drop {
  stroke: rgba(31, 75, 122, 0.14);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.comparison-chart__dot {
  fill: #ffffff;
  stroke-width: 2.4;
}

.comparison-chart__dot--detail {
  cursor: pointer;
}

.comparison-chart__dot--normal {
  fill: #daf2df;
}

.comparison-chart__dot--warning {
  fill: #fdf1c7;
}

.comparison-chart__dot--alert {
  fill: #f8d7d3;
}

.comparison-chart__scale,
.comparison-chart__labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: rgba(26, 34, 43, 0.72);
}

.comparison-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
}

.comparison-chart__legend--detail {
  margin-top: 12px;
}

.comparison-chart__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(26, 34, 43, 0.76);
}

.comparison-chart__legend-line {
  width: 22px;
  height: 4px;
  border-radius: 999px;
  display: inline-block;
}

.comparison-chart__empty {
  padding: 24px;
  border-radius: 18px;
  background: rgba(31, 75, 122, 0.06);
  color: rgba(26, 34, 43, 0.68);
  font-size: 14px;
}

.comparison-chart__dialog {
  overflow: hidden;
}

.comparison-chart__dialog-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--surface-border);
  background:
    radial-gradient(circle at top right, rgba(31, 75, 122, 0.14), transparent 46%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(250, 252, 255, 0.94));
}

.comparison-chart__dialog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 20px 24px 8px;
}

.comparison-chart__dialog-shell {
  overflow-x: auto;
  border-radius: 24px;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(243, 248, 255, 0.92)),
    radial-gradient(circle at top, rgba(31, 75, 122, 0.08), transparent 62%);
  padding: 12px;
}

.comparison-chart__dialog-side {
  display: grid;
  gap: 12px;
  align-content: start;
}

.comparison-chart__detail-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid var(--surface-border);
  background: rgba(255, 255, 255, 0.75);
}

.comparison-chart__detail-row {
  display: grid;
  gap: 6px;
}

.comparison-chart__detail-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(26, 34, 43, 0.58);
}

.comparison-chart__detail-value {
  font-size: 15px;
  font-weight: 600;
  color: #1a222b;
}

.comparison-chart__detail-empty {
  padding: 16px;
  border-radius: 18px;
  background: rgba(31, 75, 122, 0.06);
  color: rgba(26, 34, 43, 0.7);
}

.comparison-chart__y-label,
.comparison-chart__x-label,
.comparison-chart__point-value {
  font-size: 12px;
  fill: rgba(26, 34, 43, 0.72);
}

.comparison-chart__point-value {
  font-weight: 700;
  fill: #1f4b7a;
}

.comparison-chart__table-wrap {
  padding: 12px 24px 24px;
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
  background: rgba(31, 75, 122, 0.08);
}

@media (max-width: 1100px) {
  .comparison-chart__dialog-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .comparison-chart__dialog-header,
  .comparison-chart__dialog-layout,
  .comparison-chart__table-wrap {
    padding-inline: 14px;
  }

  .comparison-chart__dialog-shell {
    padding: 8px;
  }

  .comparison-chart__detail-card {
    padding: 12px;
  }
}
</style>

<template>
  <div
    :class="['chart-card', { 'chart-card--interactive': hasPoints }]"
    :role="hasPoints ? 'button' : undefined"
    :tabindex="hasPoints ? 0 : undefined"
    @click="openDialog"
    @keydown.enter.prevent="openDialog"
    @keydown.space.prevent="openDialog"
  >
    <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px;">
      <div>
        <div class="text-subtitle-2 font-weight-bold">{{ title }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ subtitle }}
        </div>
      </div>
      <div class="d-flex align-center" style="gap: 8px;">
        <v-chip size="small" variant="tonal" color="primary">
          {{ points.length }} puntos
        </v-chip>
        <v-btn
          v-if="hasPoints"
          icon="mdi-arrow-expand-all"
          size="small"
          variant="text"
          color="primary"
          @click.stop="openDialog"
        />
      </div>
    </div>

    <div v-if="!hasPoints" class="chart-empty">
      Sin datos numericos para graficar en el rango seleccionado.
    </div>

    <div v-else class="chart-shell">
      <svg
        :viewBox="`0 0 ${miniChart.width} ${miniChart.height}`"
        class="chart-svg"
        preserveAspectRatio="none"
      >
        <line
          v-for="guide in miniChart.guides"
          :key="`mini-guide-${guide.key}`"
          :x1="miniChart.padding.left"
          :x2="miniChart.width - miniChart.padding.right"
          :y1="guide.y"
          :y2="guide.y"
          class="chart-guide"
        />
        <line
          :x1="miniChart.padding.left"
          :y1="miniChart.padding.top"
          :x2="miniChart.padding.left"
          :y2="miniChart.chartBottom"
          class="chart-axis"
        />
        <line
          :x1="miniChart.padding.left"
          :y1="miniChart.chartBottom"
          :x2="miniChart.width - miniChart.padding.right"
          :y2="miniChart.chartBottom"
          class="chart-axis"
        />

        <polyline :points="miniChart.polyline" class="chart-line" />

        <g v-for="point in miniChart.points" :key="point.key">
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4.5"
            :class="['chart-dot', `chart-dot--${point.level}`]"
          />
        </g>
      </svg>

      <div class="chart-range">
        <span>{{ miniChart.yMinLabel }}</span>
        <span>{{ miniChart.yMaxLabel }}</span>
      </div>

      <div class="chart-labels">
        <span>{{ miniChart.xStartLabel }}</span>
        <span>{{ miniChart.xEndLabel }}</span>
      </div>

      <div class="chart-hint">
        Haz clic para ampliar y revisar cada muestra.
      </div>
    </div>
  </div>

  <v-dialog v-model="dialog" :fullscreen="isDialogFullscreen" :max-width="isDialogFullscreen ? undefined : 1480">
    <v-card rounded="xl" class="chart-dialog-card">
      <div class="chart-dialog-header">
        <div>
          <div class="text-h6 font-weight-bold">{{ title }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ subtitle || "Serie historica de resultados" }}
          </div>
        </div>
        <div class="d-flex align-center flex-wrap" style="gap: 8px;">
          <v-chip size="small" color="primary" variant="tonal">
            {{ numericPoints.length }} puntos
          </v-chip>
          <v-chip size="small" color="secondary" variant="tonal">
            {{ detailChart.yMinLabel }} / {{ detailChart.yMaxLabel }}
          </v-chip>
          <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
        </div>
      </div>

      <div class="chart-dialog-layout">
        <div class="chart-dialog-main">
          <div class="chart-dialog-shell">
            <svg
              :viewBox="`0 0 ${detailChart.width} ${detailChart.height}`"
              class="chart-svg chart-svg--detail"
              preserveAspectRatio="xMidYMid meet"
            >
              <line
                v-for="guide in detailChart.guides"
                :key="`detail-guide-${guide.key}`"
                :x1="detailChart.padding.left"
                :x2="detailChart.width - detailChart.padding.right"
                :y1="guide.y"
                :y2="guide.y"
                class="chart-guide"
              />
              <text
                v-for="guide in detailChart.guides"
                :key="`detail-guide-label-${guide.key}`"
                :x="detailChart.padding.left - 12"
                :y="guide.y + 4"
                class="chart-y-label"
                text-anchor="end"
              >
                {{ guide.label }}
              </text>

              <line
                :x1="detailChart.padding.left"
                :y1="detailChart.padding.top"
                :x2="detailChart.padding.left"
                :y2="detailChart.chartBottom"
                class="chart-axis"
              />
              <line
                :x1="detailChart.padding.left"
                :y1="detailChart.chartBottom"
                :x2="detailChart.width - detailChart.padding.right"
                :y2="detailChart.chartBottom"
                class="chart-axis"
              />

              <polyline :points="detailChart.polyline" class="chart-line" />

              <g v-for="point in detailChart.points" :key="`detail-point-${point.key}`">
                <line
                  :x1="point.x"
                  :x2="point.x"
                  :y1="point.y"
                  :y2="detailChart.chartBottom"
                  class="chart-drop"
                />
                <circle
                  :cx="point.x"
                  :cy="point.y"
                  :r="selectedPoint?.key === point.key ? 8 : 6"
                  :class="['chart-dot', 'chart-dot--detail', `chart-dot--${point.level}`]"
                  @mouseenter="selectPoint(point.key)"
                  @click.stop="selectPoint(point.key)"
                />
                <text
                  :x="point.x"
                  :y="point.y - 14"
                  class="chart-point-value"
                  text-anchor="middle"
                >
                  {{ point.valueLabel }}
                </text>
                <text
                  :x="point.x"
                  :y="detailChart.chartBottom + 20"
                  class="chart-x-label"
                  text-anchor="end"
                  :transform="`rotate(-35 ${point.x} ${detailChart.chartBottom + 20})`"
                >
                  {{ point.fecha || point.label }}
                </text>
              </g>
            </svg>
          </div>

          <div class="chart-legend">
            <div class="chart-legend-item">
              <span class="chart-legend-dot chart-dot--normal" />
              Normal
            </div>
            <div class="chart-legend-item">
              <span class="chart-legend-dot chart-dot--warning" />
              Precaucion
            </div>
            <div class="chart-legend-item">
              <span class="chart-legend-dot chart-dot--alert" />
              Alerta
            </div>
          </div>
        </div>

        <aside class="chart-dialog-side">
          <div class="text-subtitle-1 font-weight-bold">Detalle del punto</div>
          <div v-if="selectedPoint" class="chart-point-detail">
            <div class="chart-point-detail-row">
              <span class="chart-point-detail-label">Codigo</span>
              <span class="chart-point-detail-value">{{ selectedPoint.codigo || selectedPoint.label }}</span>
            </div>
            <div class="chart-point-detail-row">
              <span class="chart-point-detail-label">Fecha</span>
              <span class="chart-point-detail-value">{{ selectedPoint.fecha || "Sin fecha" }}</span>
            </div>
            <div class="chart-point-detail-row">
              <span class="chart-point-detail-label">Resultado</span>
              <span class="chart-point-detail-value">{{ selectedPoint.valueLabel }}</span>
            </div>
            <div class="chart-point-detail-row">
              <span class="chart-point-detail-label">Estado</span>
              <v-chip
                size="small"
                :color="levelColor(selectedPoint.level)"
                variant="tonal"
              >
                {{ levelTitle(selectedPoint.level) }}
              </v-chip>
            </div>
            <div class="chart-point-detail-row">
              <span class="chart-point-detail-label">Posicion</span>
              <span class="chart-point-detail-value">
                {{ selectedPoint.index + 1 }} de {{ detailChart.points.length }}
              </span>
            </div>
          </div>
          <div v-else class="chart-point-empty">
            Selecciona un punto para ver su detalle.
          </div>
        </aside>
      </div>

      <div class="chart-table-wrap">
        <div class="text-subtitle-1 font-weight-bold mb-3">Detalle por muestra</div>
        <v-table density="compact" class="chart-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Codigo</th>
              <th>Fecha</th>
              <th>Valor</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="point in detailChart.points"
              :key="`row-${point.key}`"
              :class="{ 'chart-table-row--active': selectedPoint?.key === point.key }"
              @click="selectPoint(point.key)"
            >
              <td>{{ point.index + 1 }}</td>
              <td>{{ point.codigo || point.label }}</td>
              <td>{{ point.fecha || "Sin fecha" }}</td>
              <td>{{ point.valueLabel }}</td>
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
  valor?: number | null;
  nivel_alerta?: string | null;
};

type PointLevel = "normal" | "warning" | "alert";

type ChartPadding = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type NormalizedPoint = {
  key: string;
  codigo: string | null;
  label: string;
  fecha: string | null;
  value: number;
  valueLabel: string;
  level: PointLevel;
  index: number;
};

type PlottedPoint = NormalizedPoint & {
  x: number;
  y: number;
};

const props = defineProps<{
  title: string;
  subtitle?: string;
  unit?: string | null;
  points: InputPoint[];
}>();

const dialog = ref(false);
const { mdAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);
const selectedPointKey = ref<string | null>(null);

const miniPadding: ChartPadding = {
  left: 44,
  right: 24,
  top: 16,
  bottom: 28,
};

const detailPadding: ChartPadding = {
  left: 86,
  right: 34,
  top: 24,
  bottom: 84,
};

function toLevel(value: unknown): PointLevel {
  const raw = String(value ?? "").trim().toUpperCase();
  if (["ALERTA", "ANORMAL", "CRITICO", "CRITICAL"].includes(raw)) return "alert";
  if (["OBSERVACION", "PRECAUCION", "WARNING"].includes(raw)) return "warning";
  return "normal";
}

function formatValue(value: number) {
  const formatted = Number(value).toLocaleString("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return props.unit ? `${formatted} ${props.unit}` : formatted;
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

const numericPoints = computed<NormalizedPoint[]>(() =>
  props.points
    .map((item, index) => ({
      key: `${item.codigo || item.fecha || "item"}-${index}`,
      codigo: item.codigo ? String(item.codigo) : null,
      label: item.codigo || item.fecha || `P${index + 1}`,
      fecha: item.fecha || null,
      value: Number(item.valor),
      valueLabel: formatValue(Number(item.valor)),
      level: toLevel(item.nivel_alerta),
      index,
    }))
    .filter((item) => Number.isFinite(item.value)),
);

const hasPoints = computed(() => numericPoints.value.length > 0);

const minValue = computed(() =>
  numericPoints.value.length
    ? Math.min(...numericPoints.value.map((item) => item.value))
    : 0,
);

const maxValue = computed(() =>
  numericPoints.value.length
    ? Math.max(...numericPoints.value.map((item) => item.value))
    : 100,
);

const safeRange = computed(() => {
  const diff = maxValue.value - minValue.value;
  return diff === 0 ? Math.max(Math.abs(maxValue.value), 1) : diff;
});

function buildChartModel(width: number, height: number, padding: ChartPadding) {
  const chartWidth = Math.max(width - padding.left - padding.right, 1);
  const chartHeight = Math.max(height - padding.top - padding.bottom, 1);
  const chartBottom = height - padding.bottom;

  const points = numericPoints.value.map<PlottedPoint>((item, index) => {
    const x =
      numericPoints.value.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (chartWidth * index) / Math.max(numericPoints.value.length - 1, 1);
    const y = chartBottom - ((item.value - minValue.value) / safeRange.value) * chartHeight;
    return {
      ...item,
      x,
      y,
    };
  });

  const guides = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const y = padding.top + chartHeight * ratio;
    const value = maxValue.value - safeRange.value * ratio;
    return {
      key: index,
      y,
      label: formatValue(value),
    };
  });

  return {
    width,
    height,
    padding,
    chartBottom,
    points,
    guides,
    polyline: points.map((item) => `${item.x},${item.y}`).join(" "),
    yMinLabel: formatValue(minValue.value),
    yMaxLabel: formatValue(maxValue.value),
    xStartLabel: points[0]?.fecha || points[0]?.label || "",
    xEndLabel: points[points.length - 1]?.fecha || points[points.length - 1]?.label || "",
  };
}

const miniChart = computed(() => buildChartModel(420, 180, miniPadding));
const detailChartWidth = computed(() => Math.max(1080, 180 + numericPoints.value.length * 88));
const detailChart = computed(() =>
  buildChartModel(detailChartWidth.value, 430, detailPadding),
);

const selectedPoint = computed(() => {
  if (!detailChart.value.points.length) return null;
  return (
    detailChart.value.points.find((item) => item.key === selectedPointKey.value) ||
    detailChart.value.points[detailChart.value.points.length - 1] ||
    null
  );
});

watch(
  numericPoints,
  (points) => {
    if (!points.length) {
      selectedPointKey.value = null;
      dialog.value = false;
      return;
    }
    if (!points.some((item) => item.key === selectedPointKey.value)) {
      selectedPointKey.value = points[points.length - 1]?.key || null;
    }
  },
  { immediate: true },
);

function selectPoint(key: string) {
  selectedPointKey.value = key;
}

function openDialog() {
  if (!hasPoints.value) return;
  if (!selectedPointKey.value) {
    selectedPointKey.value = numericPoints.value[numericPoints.value.length - 1]?.key || null;
  }
  dialog.value = true;
}
</script>

<style scoped>
.chart-card {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: var(--chart-card-bg);
}

.chart-card--interactive {
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.chart-card--interactive:hover,
.chart-card--interactive:focus-visible {
  transform: translateY(-2px);
  border-color: var(--chart-card-hover-border);
  box-shadow: var(--chart-card-hover-shadow);
  outline: none;
}

.chart-shell {
  display: grid;
  gap: 6px;
}

.chart-svg {
  width: 100%;
  height: 180px;
  display: block;
}

.chart-svg--detail {
  width: 100%;
  min-width: 960px;
  height: 430px;
}

.chart-guide {
  stroke: var(--chart-guide);
  stroke-width: 1;
}

.chart-axis {
  stroke: var(--chart-axis);
  stroke-width: 1.2;
}

.chart-line {
  fill: none;
  stroke: var(--chart-line);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-drop {
  stroke: var(--chart-drop);
  stroke-width: 1.2;
  stroke-dasharray: 4 4;
}

.chart-dot {
  stroke: var(--chart-dot-border);
  stroke-width: 2;
}

.chart-dot--detail {
  cursor: pointer;
  transition:
    transform 0.16s ease,
    r 0.16s ease;
}

.chart-dot--normal,
.chart-legend-dot.chart-dot--normal {
  fill: #1f7a4b;
  background: #1f7a4b;
}

.chart-dot--warning,
.chart-legend-dot.chart-dot--warning {
  fill: #c58b00;
  background: #c58b00;
}

.chart-dot--alert,
.chart-legend-dot.chart-dot--alert {
  fill: #c0392b;
  background: #c0392b;
}

.chart-range,
.chart-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--chart-label);
}

.chart-hint {
  font-size: 12px;
  color: var(--chart-hint);
}

.chart-empty {
  padding: 24px;
  border-radius: 18px;
  background: var(--chart-empty-bg);
  color: var(--chart-empty-text);
  font-size: 14px;
}

.chart-dialog-card {
  overflow: hidden;
}

.chart-dialog-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--surface-border);
  background: var(--chart-dialog-header-bg);
}

.chart-dialog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 20px 24px 8px;
}

.chart-dialog-main {
  min-width: 0;
}

.chart-dialog-shell {
  overflow-x: auto;
  border-radius: 24px;
  border: 1px solid var(--surface-border);
  background: var(--chart-dialog-shell-bg);
  padding: 12px;
}

.chart-dialog-side {
  display: grid;
  gap: 12px;
  align-content: start;
}

.chart-point-detail {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid var(--surface-border);
  background: var(--chart-detail-bg);
}

.chart-point-detail-row {
  display: grid;
  gap: 6px;
}

.chart-point-detail-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--chart-muted);
}

.chart-point-detail-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
}

.chart-point-empty {
  padding: 16px;
  border-radius: 18px;
  background: var(--chart-empty-bg);
  color: var(--chart-empty-text);
}

.chart-y-label,
.chart-x-label,
.chart-point-value {
  font-size: 12px;
  fill: var(--chart-label);
}

.chart-point-value {
  font-weight: 700;
  fill: var(--chart-line);
}

.chart-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.chart-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--chart-label);
}

.chart-legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  display: inline-block;
}

.chart-table-wrap {
  padding: 12px 24px 24px;
}

.chart-table {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: hidden;
}

.chart-table tbody tr {
  cursor: pointer;
}

.chart-table-row--active {
  background: var(--chart-table-active);
}

@media (max-width: 1100px) {
  .chart-dialog-layout {
    grid-template-columns: 1fr;
  }

  .chart-dialog-side {
    order: -1;
  }
}

@media (max-width: 600px) {
  .chart-dialog-header,
  .chart-dialog-layout,
  .chart-table-wrap {
    padding-inline: 14px;
  }

  .chart-dialog-shell {
    padding: 8px;
  }

  .chart-point-detail {
    padding: 12px;
  }
}
</style>

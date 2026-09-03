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
      <div class="chart-card__copy">
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
          aria-label="Ampliar la serie"
          @click.stop="openDialog"
        />
      </div>
    </div>

    <div v-if="!hasPoints" class="chart-empty">
      Sin datos numericos para graficar en el rango seleccionado.
    </div>

    <div v-else class="chart-shell">
      <EChart :option="miniOption" height="164px" />
      <div class="chart-hint">
        Haz clic para ampliar y revisar cada muestra.
      </div>
    </div>
  </div>

  <v-dialog
    v-model="dialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1480"
  >
    <v-card rounded="xl" class="chart-dialog-card">
      <div class="chart-dialog-header">
        <div class="chart-dialog-header__copy">
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
            {{ yMinLabel }} / {{ yMaxLabel }}
          </v-chip>
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Cerrar"
            @click="dialog = false"
          />
        </div>
      </div>

      <div class="chart-dialog-layout">
        <div class="chart-dialog-main">
          <EChart
            :option="detailOption"
            height="430px"
            @select="handleChartSelect"
          />

          <div class="chart-legend">
            <div
              v-for="entry in levelLegend"
              :key="entry.level"
              class="chart-legend-item"
            >
              <span
                class="chart-legend-dot"
                :style="{ background: entry.color }"
              />
              {{ entry.title }}
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
                {{ selectedPoint.index + 1 }} de {{ numericPoints.length }}
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
              v-for="point in numericPoints"
              :key="`row-${point.key}`"
              :class="{ 'chart-table-row--active': selectedPointKey === point.key }"
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
import { useDisplay, useTheme } from "vuetify";
import EChart from "@/components/charts/EChart.vue";
import { chartInk, chartStatus, seriesColor } from "@/app/config/chart-theme";

type InputPoint = {
  codigo?: string | null;
  fecha?: string | null;
  valor?: number | null;
  nivel_alerta?: string | null;
};

type PointLevel = "normal" | "warning" | "alert";

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

const props = defineProps<{
  title: string;
  subtitle?: string;
  unit?: string | null;
  points: InputPoint[];
}>();

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

/** Color del semaforo. Nunca comunica solo: va con etiqueta, leyenda y tabla. */
function levelPaint(level: PointLevel) {
  const status = chartStatus(isDark.value);
  if (level === "alert") return status.critical;
  if (level === "warning") return status.warning;
  return status.good;
}

const levelLegend = computed(() =>
  (["normal", "warning", "alert"] as PointLevel[]).map((level) => ({
    level,
    title: levelTitle(level),
    color: levelPaint(level),
  })),
);

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

const yMinLabel = computed(() =>
  hasPoints.value
    ? formatValue(Math.min(...numericPoints.value.map((item) => item.value)))
    : "",
);
const yMaxLabel = computed(() =>
  hasPoints.value
    ? formatValue(Math.max(...numericPoints.value.map((item) => item.value)))
    : "",
);

/**
 * Datos de la serie con el color del semaforo en cada punto.
 *
 * La linea va en el azul de la paleta y solo los puntos llevan color de
 * estado: asi el color de estado no compite con la tendencia.
 */
function seriesData() {
  return numericPoints.value.map((point) => ({
    value: point.value,
    itemStyle: { color: levelPaint(point.level) },
  }));
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
      formatter: (params: any) => {
        const point = numericPoints.value[params?.[0]?.dataIndex];
        if (!point) return "";
        return `<strong>${point.label}</strong><div>${point.valueLabel}</div><div style="opacity:.7">${levelTitle(point.level)}</div>`;
      },
    },
    textStyle: { color: ink.text, fontFamily: "inherit" },
    xAxis: {
      type: "category" as const,
      data: numericPoints.value.map((point) => point.fecha || point.label),
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 10 },
      splitLine: { lineStyle: { color: ink.grid } },
    },
    series: [
      {
        type: "line" as const,
        smooth: false,
        symbolSize: 8,
        lineStyle: { width: 2, color: seriesColor(0, isDark.value) },
        data: seriesData(),
      },
    ],
  };
});

const detailOption = computed(() => {
  const ink = chartInk(isDark.value);
  const total = numericPoints.value.length;
  // Con muchas muestras se abre mostrando el tramo reciente; el control de
  // zoom deja recorrer el resto sin comprimir las etiquetas.
  const startPercent = total > 14 ? Math.max(0, 100 - (14 / total) * 100) : 0;

  return {
    grid: { left: 16, right: 24, top: 28, bottom: 92, containLabel: true },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: ink.surface,
      borderColor: ink.border,
      borderWidth: 1,
      textStyle: { color: ink.text, fontSize: 12 },
      formatter: (params: any) => {
        const point = numericPoints.value[params?.[0]?.dataIndex];
        if (!point) return "";
        return [
          `<strong>${point.codigo || point.label}</strong>`,
          `<div>${point.fecha || "Sin fecha"}</div>`,
          `<div>${point.valueLabel}</div>`,
          `<div style="opacity:.7">${levelTitle(point.level)}</div>`,
        ].join("");
      },
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
      data: numericPoints.value.map((point) => point.fecha || point.label),
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 11, rotate: 35, hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: ink.muted,
        fontSize: 11,
        formatter: (value: number) => formatValue(value),
      },
      splitLine: { lineStyle: { color: ink.grid } },
    },
    series: [
      {
        type: "line" as const,
        smooth: false,
        symbolSize: 9,
        lineStyle: { width: 2, color: seriesColor(0, isDark.value) },
        emphasis: { focus: "series" as const, scale: 1.4 },
        // Etiqueta directa solo cuando caben: con la serie completa a la vista
        // un numero por punto se convierte en ruido ilegible.
        label: {
          show: total <= 12,
          position: "top" as const,
          color: ink.text,
          fontSize: 11,
          fontWeight: 600,
          formatter: (params: any) =>
            numericPoints.value[params.dataIndex]?.valueLabel ?? "",
        },
        data: seriesData(),
      },
    ],
  };
});

const selectedPoint = computed(() => {
  if (!numericPoints.value.length) return null;
  return (
    numericPoints.value.find((item) => item.key === selectedPointKey.value) ||
    numericPoints.value[numericPoints.value.length - 1] ||
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

function handleChartSelect(params: any) {
  const point = numericPoints.value[params?.dataIndex];
  if (point) selectPoint(point.key);
}

function openDialog() {
  if (!hasPoints.value) return;
  if (!selectedPointKey.value) {
    selectedPointKey.value =
      numericPoints.value[numericPoints.value.length - 1]?.key || null;
  }
  dialog.value = true;
}
</script>

<style scoped>
.chart-card {
  padding: 16px;
  min-width: 0;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: var(--chart-card-bg);
}

.chart-card__copy {
  min-width: 0;
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
  min-width: 0;
}

.chart-hint {
  font-size: 12px;
  color: var(--chart-empty-text);
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

.chart-dialog-header__copy {
  min-width: 0;
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

.chart-dialog-side {
  min-width: 0;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: var(--chart-dialog-shell-bg);
}

.chart-point-detail {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.chart-point-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chart-point-detail-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--chart-empty-text);
}

.chart-point-detail-value {
  font-weight: 700;
  text-align: right;
  word-break: break-word;
}

.chart-point-empty {
  margin-top: 12px;
  font-size: 13px;
  color: var(--chart-empty-text);
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
  min-width: 0;
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

@media (prefers-reduced-motion: reduce) {
  .chart-card--interactive {
    transition: none;
  }
}

@media (max-width: 1100px) {
  .chart-dialog-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

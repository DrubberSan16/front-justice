<template>
  <div class="chart-card">
    <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px;">
      <div>
        <div class="text-subtitle-2 font-weight-bold">{{ title }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ subtitle }}
        </div>
      </div>
      <v-chip size="small" variant="tonal" color="primary">
        {{ points.length }} puntos
      </v-chip>
    </div>

    <div v-if="!points.length" class="chart-empty">
      Sin datos numericos para graficar en el rango seleccionado.
    </div>

    <div v-else class="chart-shell">
      <svg viewBox="0 0 420 180" class="chart-svg" preserveAspectRatio="none">
        <line
          v-for="guide in guides"
          :key="`guide-${guide}`"
          x1="44"
          x2="396"
          :y1="guide"
          :y2="guide"
          class="chart-guide"
        />
        <line x1="44" y1="16" x2="44" y2="152" class="chart-axis" />
        <line x1="44" y1="152" x2="396" y2="152" class="chart-axis" />

        <polyline :points="polylinePoints" class="chart-line" />

        <g v-for="point in plottedPoints" :key="point.key">
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4.5"
            :class="['chart-dot', `chart-dot--${point.level}`]"
          />
        </g>
      </svg>

      <div class="chart-range">
        <span>{{ yMinLabel }}</span>
        <span>{{ yMaxLabel }}</span>
      </div>

      <div class="chart-labels">
        <span>{{ xStartLabel }}</span>
        <span>{{ xEndLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  title: string;
  subtitle?: string;
  unit?: string | null;
  points: Array<{
    codigo?: string | null;
    fecha?: string | null;
    valor?: number | null;
    nivel_alerta?: string | null;
  }>;
}>();

function toLevel(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (["ALERTA", "CRITICO", "CRITICAL"].includes(raw)) return "alert";
  if (["OBSERVACION", "PRECAUCION", "WARNING"].includes(raw)) return "warning";
  return "normal";
}

const numericPoints = computed(() =>
  props.points
    .map((item, index) => ({
      key: `${item.codigo || "item"}-${index}`,
      label: item.codigo || item.fecha || `P${index + 1}`,
      fecha: item.fecha || null,
      value: Number(item.valor),
      level: toLevel(item.nivel_alerta),
    }))
    .filter((item) => Number.isFinite(item.value)),
);

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

const plottedPoints = computed(() =>
  numericPoints.value.map((item, index) => {
    const x =
      numericPoints.value.length === 1
        ? 220
        : 44 + (352 * index) / Math.max(numericPoints.value.length - 1, 1);
    const y = 152 - ((item.value - minValue.value) / safeRange.value) * 136;
    return {
      ...item,
      x,
      y,
    };
  }),
);

const polylinePoints = computed(() =>
  plottedPoints.value.map((item) => `${item.x},${item.y}`).join(" "),
);

const guides = [34, 70, 106, 142];

const yMinLabel = computed(() =>
  `${minValue.value.toFixed(2)}${props.unit ? ` ${props.unit}` : ""}`,
);
const yMaxLabel = computed(() =>
  `${maxValue.value.toFixed(2)}${props.unit ? ` ${props.unit}` : ""}`,
);
const xStartLabel = computed(
  () => numericPoints.value[0]?.fecha || numericPoints.value[0]?.label || "",
);
const xEndLabel = computed(
  () =>
    numericPoints.value[numericPoints.value.length - 1]?.fecha ||
    numericPoints.value[numericPoints.value.length - 1]?.label ||
    "",
);
</script>

<style scoped>
.chart-card {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: rgba(255, 255, 255, 0.55);
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

.chart-guide {
  stroke: rgba(31, 75, 122, 0.12);
  stroke-width: 1;
}

.chart-axis {
  stroke: rgba(31, 75, 122, 0.35);
  stroke-width: 1.2;
}

.chart-line {
  fill: none;
  stroke: #1f4b7a;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-dot {
  stroke: white;
  stroke-width: 2;
}

.chart-dot--normal {
  fill: #1f7a4b;
}

.chart-dot--warning {
  fill: #c58b00;
}

.chart-dot--alert {
  fill: #c0392b;
}

.chart-range,
.chart-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: rgba(26, 34, 43, 0.7);
}

.chart-empty {
  padding: 24px;
  border-radius: 18px;
  background: rgba(31, 75, 122, 0.06);
  color: rgba(26, 34, 43, 0.68);
  font-size: 14px;
}
</style>

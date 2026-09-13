<template>
  <v-card
    rounded="xl"
    class="kpi-insight js-stagger-item js-hover-card"
    :style="{ '--kpi-accent': accentColor }"
  >
    <header class="kpi-insight__head">
      <span class="kpi-insight__icon" aria-hidden="true">
        <v-icon :icon="icon" size="24" />
      </span>
      <div class="kpi-insight__titles">
        <h4 class="kpi-insight__title">{{ title }}</h4>
        <p v-if="subtitle" class="kpi-insight__subtitle">{{ subtitle }}</p>
      </div>
    </header>

    <template v-if="loading">
      <!-- Esqueleto, no "sin datos": mientras la peticion viaja, un cero y un
           texto de vacio se leen como un hecho ("no hubo consumo") en vez de
           como una espera. -->
      <v-skeleton-loader
        type="heading"
        class="kpi-insight__skeleton kpi-insight__skeleton--value"
      />
      <v-skeleton-loader
        type="image"
        :height="chartHeight"
        class="kpi-insight__skeleton"
      />
      <span class="kpi-insight__sr-only">{{ title }}: cargando datos.</span>
    </template>

    <template v-else>
      <div class="kpi-insight__value">
        <strong>{{ value }}</strong>
        <span v-if="valueCaption">{{ valueCaption }}</span>
      </div>
      <p v-if="helper" class="kpi-insight__helper">{{ helper }}</p>

      <div v-if="hasData" class="kpi-insight__chart" :class="`kpi-insight__chart--${variant}`">
        <EChart
          :option="option"
          :height="chartHeight"
          class="kpi-insight__canvas"
          @select="onSelect"
        />
        <ul v-if="variant === 'donut'" class="kpi-insight__legend">
          <li v-for="point in resolvedPoints" :key="point.label">
            <i class="kpi-insight__swatch" :style="{ background: point.color }" />
            <span class="kpi-insight__legend-label">{{ point.label }}</span>
            <strong>{{ point.valueLabel }}</strong>
          </li>
        </ul>
      </div>
      <p v-else class="kpi-insight__no-chart">{{ emptyText }}</p>

      <!-- El lienzo de un grafico no lo lee un lector de pantalla: el mismo
           dato, en texto, para quien no ve el dibujo. -->
      <p v-if="hasData" class="kpi-insight__sr-only">
        {{ title }}.
        <template v-for="point in resolvedPoints" :key="`sr-${point.label}`">
          {{ point.label }}: {{ point.valueLabel }}.
        </template>
      </p>
    </template>

    <v-btn
      v-if="actionLabel"
      class="kpi-insight__action"
      variant="tonal"
      color="primary"
      block
      size="large"
      append-icon="mdi-arrow-right"
      @click="emit('action')"
      >{{ actionLabel }}</v-btn
    >
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "vuetify";
import EChart from "@/components/charts/EChart.vue";
import { chartInk, seriesColor } from "@/app/config/chart-theme";

/**
 * Tarjeta de KPI con grafico incrustado, pensada para vivir dentro de
 * `KpiCardRail`.
 *
 * La tarjeta arma la `option` de ECharts a partir de una lista plana de puntos,
 * igual que hace `DashboardBarChartCard`: quien la usa no toca ECharts. Los
 * colores salen de `chart-theme.ts`, que es la paleta validada del repo.
 *
 * Alturas contenidas a proposito (110-140px). El grafico aqui es un apoyo de
 * lectura junto a la cifra, no el protagonista; el detalle vive en la tabla de
 * la seccion correspondiente.
 */
type KpiChartPoint = {
  label: string;
  value: number;
  valueLabel?: string;
  color?: string;
};

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    icon?: string;
    accent?: string;
    value: string;
    valueCaption?: string;
    helper?: string;
    points?: KpiChartPoint[];
    variant?: "bars" | "donut" | "line";
    emptyText?: string;
    actionLabel?: string;
    interactive?: boolean;
    loading?: boolean;
  }>(),
  {
    subtitle: "",
    icon: "mdi-chart-box-outline",
    accent: "",
    valueCaption: "",
    helper: "",
    points: () => [],
    variant: "bars",
    emptyText: "Sin datos para graficar en este rango.",
    actionLabel: "",
    interactive: false,
    loading: false,
  },
);

const emit = defineEmits<{
  (event: "action"): void;
  (event: "point", point: KpiChartPoint): void;
}>();

const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);

const accentColor = computed(
  () => props.accent || seriesColor(0, isDark.value),
);

/**
 * `#RRGGBB` -> `rgba(r, g, b, alpha)`, para los degradados del area.
 *
 * A partir de la sexta serie `seriesColor` devuelve `hsl(...)`, que aqui no se
 * sabe descomponer. En ese caso se cae a `transparent` en vez de devolver el
 * color opaco: un degradado entre dos tonos opacos pinta el area como un bloque
 * solido y se come la linea.
 */
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return alpha >= 1 ? color : "transparent";
  const int = Number.parseInt(match[1] ?? "", 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const resolvedPoints = computed(() =>
  (props.points ?? []).map((point, index) => ({
    label: point.label,
    value: Number(point.value || 0),
    valueLabel: point.valueLabel ?? String(point.value ?? ""),
    color:
      point.color ||
      (props.variant === "bars" || props.variant === "donut"
        ? seriesColor(index, isDark.value)
        : accentColor.value),
  })),
);

/**
 * Una dona de puros ceros dibuja un anillo vacio que parece un fallo de carga.
 * Se trata como "sin datos" y se muestra el texto de vacio.
 */
const hasData = computed(
  () =>
    resolvedPoints.value.length > 0 &&
    resolvedPoints.value.some((point) => point.value !== 0),
);

const chartHeight = computed(() =>
  props.variant === "donut" ? "128px" : "116px",
);

const tooltipBase = computed(() => {
  const ink = chartInk(isDark.value);
  return {
    backgroundColor: ink.surface,
    borderColor: ink.border,
    borderWidth: 1,
    textStyle: { color: ink.text, fontSize: 12 },
  };
});

const option = computed<Record<string, any>>(() => {
  const ink = chartInk(isDark.value);
  const points = resolvedPoints.value;
  const labels = points.map((point) => point.label);

  if (props.variant === "donut") {
    return {
      tooltip: {
        trigger: "item" as const,
        ...tooltipBase.value,
        formatter: (params: any) =>
          `<strong>${params.name}</strong><div>${
            points[params.dataIndex]?.valueLabel ?? ""
          }</div>`,
      },
      textStyle: { color: ink.text, fontFamily: "inherit" },
      series: [
        {
          type: "pie" as const,
          radius: ["58%", "88%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          // El borde del color de la superficie separa los gajos sin necesidad
          // de una linea gris que compita con el dato.
          itemStyle: { borderColor: ink.surface, borderWidth: 2 },
          label: { show: false },
          labelLine: { show: false },
          cursor: props.interactive ? "pointer" : "default",
          data: points.map((point) => ({
            name: point.label,
            value: Math.max(0, point.value),
            itemStyle: { color: point.color },
          })),
        },
      ],
    };
  }

  if (props.variant === "line") {
    return {
      grid: { left: 2, right: 6, top: 12, bottom: 2, containLabel: true },
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "line" as const, lineStyle: { color: ink.axis } },
        ...tooltipBase.value,
        formatter: (params: any) => {
          const first = Array.isArray(params) ? params[0] : params;
          const row = points[first?.dataIndex ?? 0];
          if (!row) return "";
          return `<strong>${row.label}</strong><div>${row.valueLabel}</div>`;
        },
      },
      textStyle: { color: ink.text, fontFamily: "inherit" },
      xAxis: {
        type: "category" as const,
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: ink.axis } },
        axisTick: { show: false },
        axisLabel: { color: ink.muted, fontSize: 10, hideOverlap: true },
      },
      yAxis: { type: "value" as const, show: false },
      series: [
        {
          type: "line" as const,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2.5, color: accentColor.value },
          itemStyle: { color: accentColor.value },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: withAlpha(accentColor.value, 0.3) },
                { offset: 1, color: withAlpha(accentColor.value, 0) },
              ],
            },
          },
          data: points.map((point) => point.value),
        },
      ],
    };
  }

  return {
    grid: { left: 2, right: 2, top: 24, bottom: 2, containLabel: true },
    tooltip: {
      trigger: "item" as const,
      ...tooltipBase.value,
      formatter: (params: any) =>
        `<strong>${params.name}</strong><div>${
          points[params.dataIndex]?.valueLabel ?? ""
        }</div>`,
    },
    textStyle: { color: ink.text, fontFamily: "inherit" },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: ink.muted,
        fontSize: 11,
        interval: 0,
        width: 74,
        overflow: "truncate" as const,
        hideOverlap: true,
      },
    },
    yAxis: { type: "value" as const, show: false },
    series: [
      {
        type: "bar" as const,
        barMaxWidth: 36,
        itemStyle: { borderRadius: [6, 6, 0, 0] as [number, number, number, number] },
        cursor: props.interactive ? "pointer" : "default",
        // Etiqueta encima de la barra: el valor se lee sin pasar el raton.
        label: {
          show: true,
          position: "top" as const,
          color: ink.text,
          fontSize: 11,
          fontWeight: 700,
          formatter: (params: any) => points[params.dataIndex]?.valueLabel ?? "",
        },
        data: points.map((point) => ({
          value: point.value,
          itemStyle: { color: point.color },
        })),
      },
    ],
  };
});

function onSelect(params: any) {
  if (!props.interactive) return;
  const point = resolvedPoints.value[params?.dataIndex];
  if (point) emit("point", point);
}
</script>

<style scoped>
.kpi-insight {
  position: relative;
  display: grid;
  align-content: start;
  gap: 10px;
  height: 100%;
  padding: 20px;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(
      150deg,
      color-mix(in srgb, var(--kpi-accent) 12%, transparent),
      transparent 52%
    ),
    rgb(var(--v-theme-surface));
}

.kpi-insight__head {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.kpi-insight__icon {
  display: grid;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  color: var(--kpi-accent);
  background: color-mix(in srgb, var(--kpi-accent) 15%, transparent);
}

.kpi-insight__titles {
  min-width: 0;
}

.kpi-insight__title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.25;
}

.kpi-insight__subtitle {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.86rem;
}

.kpi-insight__value {
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
}

.kpi-insight__value strong {
  font-size: clamp(1.7rem, 3.2vw, 2.3rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.kpi-insight__value span {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.95rem;
  font-weight: 650;
}

.kpi-insight__helper {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.88rem;
}

.kpi-insight__chart {
  min-width: 0;
}

.kpi-insight__chart--donut {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.kpi-insight__legend {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.kpi-insight__legend li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  font-size: 0.85rem;
}

.kpi-insight__legend-label {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.74);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi-insight__legend strong {
  font-variant-numeric: tabular-nums;
}

.kpi-insight__swatch {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.kpi-insight__skeleton {
  border-radius: 14px;
  background: transparent;
}

.kpi-insight__skeleton--value :deep(.v-skeleton-loader__heading) {
  width: 55%;
  height: 30px;
  margin: 0;
}

.kpi-insight__skeleton :deep(.v-skeleton-loader__image) {
  border-radius: 14px;
}

.kpi-insight__no-chart {
  display: grid;
  min-height: 104px;
  margin: 0;
  padding: 16px;
  place-items: center;
  border: 1px dashed var(--surface-border);
  border-radius: 14px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.88rem;
  text-align: center;
}

.kpi-insight__action {
  align-self: end;
  margin-top: 2px;
  min-height: 48px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.kpi-insight__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .kpi-insight {
    padding: 16px;
  }

  .kpi-insight__chart--donut {
    grid-template-columns: 112px minmax(0, 1fr);
  }
}
</style>

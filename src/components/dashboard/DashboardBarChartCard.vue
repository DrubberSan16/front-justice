<template>
  <v-card rounded="xl" class="enterprise-surface h-100 dashboard-chart-card">
    <div class="dashboard-chart-card__header">
      <div class="dashboard-chart-card__heading">
        <div class="dashboard-chart-card__icon">
          <v-icon icon="mdi-chart-bar-stacked" size="21" />
        </div>
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
          <div v-if="subtitle" class="text-body-2 text-medium-emphasis">{{ subtitle }}</div>
        </div>
      </div>
      <v-chip v-if="chipLabel" label :color="chipColor" variant="tonal">{{ chipLabel }}</v-chip>
    </div>

    <EChart
      v-if="normalizedItems.length"
      :option="option"
      :height="chartHeight"
      class="dashboard-chart-card__chart"
      @select="handleChartSelect"
    />

    <div
      v-else
      class="dashboard-bar-chart__empty text-body-2 text-medium-emphasis"
    >
      {{ emptyText }}
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "vuetify";
import EChart from "@/components/charts/EChart.vue";
import { chartInk, seriesColor } from "@/app/config/chart-theme";

type ChartItem = {
  key: string;
  label: string;
  value: number;
  valueLabel?: string;
  color?: string;
  helper?: string;
};

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    chipLabel?: string;
    chipColor?: string;
    emptyText?: string;
    items: ChartItem[];
    interactive?: boolean;
  }>(),
  {
    subtitle: "",
    chipLabel: "",
    chipColor: "primary",
    emptyText: "No hay datos suficientes para graficar.",
    interactive: false,
  },
);

const emit = defineEmits<{
  (event: "item-click", item: ChartItem & { valueLabel: string; percent: number }): void;
}>();

const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);

/**
 * Color utilizable por el lienzo.
 *
 * Varias pantallas heredaron el color como degradado CSS
 * (`linear-gradient(90deg, #2f6cab 0%, ...)`), que un canvas no sabe
 * interpretar: ECharts lo descartaba sin avisar y las barras salian del color
 * del texto. Se rescata el primer tono del degradado para respetar la
 * intencion de quien llama, y si no hay nada aprovechable se cae a la paleta
 * validada.
 */
function resolveItemColor(raw: string | undefined, index: number) {
  const value = String(raw || "").trim();
  if (!value) return seriesColor(index, isDark.value);
  if (/^(#|rgb|hsl)/i.test(value)) return value;
  const primerTono = value.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/i);
  return primerTono?.[0] ?? seriesColor(index, isDark.value);
}

const normalizedItems = computed(() => {
  const source = Array.isArray(props.items) ? props.items : [];
  const maxValue = Math.max(...source.map((item) => Number(item?.value || 0)), 1);

  return source.map((item, index) => {
    const rawValue = Number(item?.value || 0);
    return {
      key: item.key,
      label: item.label,
      value: rawValue,
      valueLabel: item.valueLabel || String(rawValue),
      helper: item.helper || "",
      color: resolveItemColor(item.color, index),
      percent: Math.max(0, Math.min(100, (rawValue / maxValue) * 100)),
    };
  });
});

/**
 * La altura crece con la cantidad de barras en vez de comprimirlas: con una
 * altura fija, ocho categorias quedaban en franjas de pocos pixeles y las
 * etiquetas se solapaban.
 */
const chartHeight = computed(
  () => `${Math.max(150, normalizedItems.value.length * 42 + 24)}px`,
);

const option = computed(() => {
  const ink = chartInk(isDark.value);
  const rows = normalizedItems.value;
  // Barras horizontales: ECharts dibuja la primera categoria abajo, asi que se
  // invierte el orden para que la lista se lea de arriba hacia abajo.
  const ordered = [...rows].reverse();

  return {
    grid: { left: 4, right: 64, top: 8, bottom: 4, containLabel: true },
    tooltip: {
      trigger: "item" as const,
      backgroundColor: ink.surface,
      borderColor: ink.border,
      borderWidth: 1,
      textStyle: { color: ink.text, fontSize: 12 },
      formatter: (params: any) => {
        const row = ordered[params.dataIndex];
        if (!row) return "";
        const helper = row.helper
          ? `<div style="opacity:.7;margin-top:2px">${row.helper}</div>`
          : "";
        return `<strong>${row.label}</strong><div>${row.valueLabel}</div>${helper}`;
      },
    },
    textStyle: { color: ink.text, fontFamily: "inherit" },
    xAxis: {
      type: "value" as const,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: ink.grid } },
    },
    yAxis: {
      type: "category" as const,
      data: ordered.map((row) => row.label),
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: ink.text,
        fontSize: 12,
        width: 150,
        overflow: "truncate" as const,
      },
    },
    series: [
      {
        type: "bar" as const,
        barMaxWidth: 18,
        // Extremo redondeado del lado del dato, anclado a la linea base.
        itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
        data: ordered.map((row) => ({
          value: row.value,
          itemStyle: { color: row.color },
        })),
        // Etiqueta directa: el valor se lee sin pasar el raton por encima.
        label: {
          show: true,
          position: "right" as const,
          color: ink.text,
          fontSize: 12,
          fontWeight: 600,
          formatter: (params: any) => ordered[params.dataIndex]?.valueLabel ?? "",
        },
        cursor: props.interactive ? "pointer" : "default",
      },
    ],
  };
});

function handleChartSelect(params: any) {
  if (!props.interactive) return;
  const ordered = [...normalizedItems.value].reverse();
  const row = ordered[params?.dataIndex];
  if (row) emit("item-click", row);
}
</script>

<style scoped>
.dashboard-chart-card {
  position: relative;
  overflow: hidden;
  padding: 20px;
  min-width: 0;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.055), transparent 46%),
    var(--surface-base);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.dashboard-chart-card::after {
  position: absolute;
  right: -55px;
  bottom: -70px;
  width: 180px;
  height: 180px;
  border: 32px solid rgba(var(--v-theme-primary), 0.04);
  border-radius: 50%;
  content: "";
  pointer-events: none;
}

.dashboard-chart-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.1);
}

.dashboard-chart-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 17px;
  flex-wrap: wrap;
}

.dashboard-chart-card__heading {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.dashboard-chart-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.dashboard-chart-card__chart {
  position: relative;
  z-index: 1;
}

.dashboard-bar-chart__empty {
  display: grid;
  min-height: 126px;
  padding: 22px;
  place-items: center;
  border: 1px dashed var(--surface-border);
  border-radius: 15px;
  background: color-mix(in srgb, var(--surface-soft) 74%, transparent);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-chart-card {
    transition: none;
  }
}

@media (max-width: 600px) {
  .dashboard-chart-card {
    padding: 16px;
  }

  .dashboard-chart-card__header {
    align-items: flex-start;
  }
}
</style>

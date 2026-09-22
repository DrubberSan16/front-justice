<template>
  <v-card
    rounded="xl"
    class="kpi-insight js-stagger-item js-hover-card"
    :class="{ 'kpi-insight--fill': fill }"
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
        :height="resolvedChartHeight"
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

      <div
        v-if="hasData"
        ref="chartBox"
        class="kpi-insight__chart"
        :class="`kpi-insight__chart--${variant}`"
        :style="chartBoxStyle"
      >
        <EChart
          :option="option"
          :height="resolvedChartHeight"
          class="kpi-insight__canvas"
          @select="onSelect"
        />
        <ul
          v-if="variant === 'donut'"
          class="kpi-insight__legend"
          :class="{ 'kpi-insight__legend--share': showShare }"
        >
          <li v-for="point in resolvedPoints" :key="point.key">
            <i class="kpi-insight__swatch" :style="{ background: point.color }" />
            <span class="kpi-insight__legend-label">{{ point.label }}</span>
            <strong>{{ point.valueLabel }}</strong>
            <span v-if="showShare" class="kpi-insight__legend-share">{{
              point.shareLabel
            }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="kpi-insight__no-chart">{{ emptyText }}</p>

      <!-- El lienzo de un grafico no lo lee un lector de pantalla: el mismo
           dato, en texto, para quien no ve el dibujo. -->
      <p v-if="hasData" class="kpi-insight__sr-only">
        {{ title }}.
        <template v-for="point in resolvedPoints" :key="`sr-${point.key}`">
          {{ point.tooltipLabel }}: {{ point.valueLabel }}.
        </template>
      </p>
    </template>

    <div v-if="actionLabel || previewLabel" class="kpi-insight__actions">
      <v-btn
        v-if="previewLabel"
        class="kpi-insight__action"
        variant="outlined"
        color="primary"
        size="large"
        prepend-icon="mdi-file-pdf-box"
        @click="emit('preview')"
        >{{ previewLabel }}</v-btn
      >
      <v-btn
        v-if="actionLabel"
        class="kpi-insight__action"
        variant="tonal"
        color="primary"
        size="large"
        append-icon="mdi-arrow-right"
        @click="emit('action')"
        >{{ actionLabel }}</v-btn
      >
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useTheme } from "vuetify";
import EChart from "@/components/charts/EChart.vue";
import {
  chartFontFamily,
  chartInk,
  seriesColor,
} from "@/app/config/chart-theme";
import { formatNumberForDisplay } from "@/app/utils/number-format";

/**
 * Tarjeta de KPI con grafico incrustado, pensada para vivir dentro de
 * `KpiCardRail` o de una cuadricula.
 *
 * La tarjeta arma la `option` de ECharts a partir de una lista plana de puntos,
 * igual que hace `DashboardBarChartCard`: quien la usa no toca ECharts. Los
 * colores salen de `chart-theme.ts`, que es la paleta validada del repo.
 *
 * En el riel las alturas van contenidas a proposito (104-116px): el grafico es
 * un apoyo de lectura junto a la cifra. En una cuadricula con espacio, `fill`
 * y `chartHeight` dejan que el grafico ocupe la tarjeta y se lea completo.
 */
type KpiChartPoint = {
  label: string;
  value: number;
  valueLabel?: string;
  color?: string;
  /**
   * Identidad del punto. Dos equipos pueden llamarse igual ("SSA"), asi que
   * quien escucha `point` debe resolver la fila por esta clave y no por la
   * etiqueta. Por defecto, la etiqueta.
   */
  key?: string;
  /** Nombre completo para el tooltip cuando el eje muestra uno abreviado. */
  tooltipLabel?: string;
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
    /**
     * `hbars` es la barra horizontal: la forma de un ranking cuando las
     * etiquetas son largas, porque el nombre se lee entero a la izquierda en
     * vez de partirse en cuatro renglones bajo una columna.
     */
    variant?: "bars" | "hbars" | "donut" | "line";
    emptyText?: string;
    actionLabel?: string;
    previewLabel?: string;
    interactive?: boolean;
    loading?: boolean;
    /** Alto del grafico; en la dona tambien es su diametro. */
    chartHeight?: string;
    /** La dona agrega a la leyenda el porcentaje de cada parte. */
    showShare?: boolean;
    /** El grafico ocupa el alto sobrante de la tarjeta y lo centra. */
    fill?: boolean;
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
    previewLabel: "",
    interactive: false,
    loading: false,
    chartHeight: "",
    showShare: false,
    fill: false,
  },
);

const emit = defineEmits<{
  (event: "action"): void;
  (event: "preview"): void;
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

/**
 * El tooltip de ECharts se pinta como HTML y las etiquetas son datos (nombres
 * de equipos, codigos): se escapan para que un nombre con `<` no se interprete.
 */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const resolvedPoints = computed(() => {
  const points = props.points ?? [];
  const total = points.reduce(
    (acc, point) => acc + Math.max(0, Number(point.value || 0)),
    0,
  );
  return points.map((point, index) => {
    const value = Number(point.value || 0);
    return {
      label: point.label,
      value,
      valueLabel: point.valueLabel ?? String(point.value ?? ""),
      key: point.key ?? `${point.label}-${index}`,
      tooltipLabel: point.tooltipLabel || point.label,
      shareLabel:
        total > 0
          ? `${formatNumberForDisplay((Math.max(0, value) / total) * 100)} %`
          : "",
      // Un ranking es una sola serie: todas sus barras del mismo color. Pintar
      // cada barra de otro tono sugeriria categorias que no existen.
      color:
        point.color ||
        (props.variant === "bars" || props.variant === "donut"
          ? seriesColor(index, isDark.value)
          : accentColor.value),
    };
  });
});

/**
 * Una dona de puros ceros dibuja un anillo vacio que parece un fallo de carga.
 * Se trata como "sin datos" y se muestra el texto de vacio.
 */
const hasData = computed(
  () =>
    resolvedPoints.value.length > 0 &&
    resolvedPoints.value.some((point) => point.value !== 0),
);

const resolvedChartHeight = computed(() => {
  if (props.chartHeight) return props.chartHeight;
  return props.variant === "donut" ? "116px" : "104px";
});

/** El diametro de la dona fija el ancho de su columna junto a la leyenda. */
const chartBoxStyle = computed(() =>
  props.variant === "donut" && props.chartHeight
    ? { "--kpi-donut-size": props.chartHeight }
    : undefined,
);

/**
 * Ancho real del grafico, para repartir el de las barras horizontales entre
 * la etiqueta y la barra. ECharts pide la anchura de la etiqueta en pixeles.
 */
const chartBox = ref<HTMLElement | null>(null);
const chartWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

watch(chartBox, (element) => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (!element || typeof ResizeObserver === "undefined") return;
  resizeObserver = new ResizeObserver((entries) => {
    const width = Math.round(entries[0]?.contentRect.width ?? 0);
    if (width && Math.abs(width - chartWidth.value) > 4) chartWidth.value = width;
  });
  resizeObserver.observe(element);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

const tooltipBase = computed(() => {
  const ink = chartInk(isDark.value);
  return {
    backgroundColor: ink.surface,
    borderColor: ink.border,
    borderWidth: 1,
    textStyle: { color: ink.text, fontSize: 12 },
  };
});

/** Tooltip: primero la cifra, que es lo que se busca; despues de que es. */
function tooltipHtml(index: number, extra = "") {
  const point = resolvedPoints.value[index];
  if (!point) return "";
  const figure = [point.valueLabel, extra].filter(Boolean).join(" · ");
  return `<strong>${escapeHtml(figure)}</strong><div>${escapeHtml(
    point.tooltipLabel,
  )}</div>`;
}

let measureContext: CanvasRenderingContext2D | null = null;

/**
 * Ancho en pixeles del texto mas largo, medido con la misma fuente con la que
 * lo dibuja el lienzo. Si no hay canvas, una estimacion por caracteres.
 */
function widestLabel(labels: string[], font: string): number {
  if (!labels.length) return 0;
  if (!measureContext && typeof document !== "undefined") {
    measureContext = document.createElement("canvas").getContext("2d");
  }
  if (!measureContext) return Math.max(...labels.map((text) => text.length * 7));
  measureContext.font = font;
  return Math.max(
    ...labels.map((text) => measureContext?.measureText(text).width ?? 0),
  );
}

const option = computed<Record<string, any>>(() => {
  const ink = chartInk(isDark.value);
  const points = resolvedPoints.value;
  const labels = points.map((point) => point.label);
  const fontFamily = chartFontFamily();

  if (props.variant === "donut") {
    return {
      tooltip: {
        trigger: "item" as const,
        ...tooltipBase.value,
        formatter: (params: any) =>
          tooltipHtml(
            params.dataIndex,
            props.showShare ? points[params.dataIndex]?.shareLabel : "",
          ),
      },
      textStyle: { color: ink.text, fontFamily },
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
          return tooltipHtml(first?.dataIndex ?? 0);
        },
      },
      textStyle: { color: ink.text, fontFamily },
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

  if (props.variant === "hbars") {
    // La etiqueta mide lo que su texto mas largo, hasta un tercio del ancho;
    // el resto queda para la barra. Con un ancho fijo, nombres cortos como
    // "JC - UG21" dejaban un hueco a su izquierda. Lo que no cabe se corta con
    // puntos suspensivos y el nombre entero sigue en el tooltip y en la tabla.
    const width = chartWidth.value || 480;
    const maxLabelWidth = Math.min(200, Math.max(88, width * 0.32));
    const labelWidth = Math.round(
      Math.min(
        maxLabelWidth,
        widestLabel(labels, `600 12px ${fontFamily}`) + 2,
      ),
    );
    return {
      // A la derecha, sitio fijo para la cifra al final de la barra: el
      // `containLabel` de ECharts mide los ejes, no las etiquetas de la serie.
      grid: { left: 4, right: 86, top: 4, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "item" as const,
        ...tooltipBase.value,
        formatter: (params: any) => tooltipHtml(params.dataIndex),
      },
      textStyle: { color: ink.text, fontFamily },
      xAxis: { type: "value" as const, show: false },
      yAxis: {
        type: "category" as const,
        // El primero arriba: se lee de mayor a menor, como una tabla.
        inverse: true,
        // Categorias por posicion, no por nombre: dos equipos homonimos se
        // fundirian en una sola barra.
        data: points.map((_, index) => String(index)),
        axisLine: { show: false },
        axisTick: { show: false },
        // Pulsar el nombre abre lo mismo que pulsar la barra: el blanco de
        // la pulsacion es la fila entera, no solo el trazo.
        triggerEvent: props.interactive,
        axisLabel: {
          color: ink.text,
          fontSize: 12,
          fontWeight: 600,
          width: labelWidth,
          overflow: "truncate" as const,
          formatter: (value: string) => points[Number(value)]?.label ?? "",
        },
      },
      series: [
        {
          type: "bar" as const,
          barMaxWidth: 20,
          barCategoryGap: "36%",
          // Extremo de dato redondeado y base recta, pegada al eje.
          itemStyle: {
            borderRadius: [0, 4, 4, 0] as [number, number, number, number],
          },
          cursor: props.interactive ? "pointer" : "default",
          label: {
            show: true,
            position: "right" as const,
            distance: 8,
            color: ink.text,
            fontSize: 12,
            fontWeight: 700,
            formatter: (params: any) =>
              points[params.dataIndex]?.valueLabel ?? "",
          },
          data: points.map((point) => ({
            value: point.value,
            itemStyle: { color: point.color },
          })),
        },
      ],
    };
  }

  return {
    grid: { left: 2, right: 2, top: 24, bottom: 2, containLabel: true },
    tooltip: {
      trigger: "item" as const,
      ...tooltipBase.value,
      formatter: (params: any) => tooltipHtml(params.dataIndex),
    },
    textStyle: { color: ink.text, fontFamily },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: ink.muted,
        fontSize: 11,
        interval: 0,
        width: 88,
        overflow: "break" as const,
        lineHeight: 12,
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
  // En `hbars` tambien responde el nombre del eje, que entrega su categoria
  // (la posicion) en vez de `dataIndex`.
  const index =
    params?.componentType === "yAxis" ? Number(params.value) : params?.dataIndex;
  const point = resolvedPoints.value[index];
  if (!point) return;
  emit("point", {
    label: point.label,
    value: point.value,
    valueLabel: point.valueLabel,
    color: point.color,
    key: point.key,
    tooltipLabel: point.tooltipLabel,
  });
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

/* En una cuadricula las tarjetas de una fila miden lo mismo: el grafico toma
   el alto que sobra y se centra en el, y las acciones van al pie. Sin esto la
   tarjeta mas baja de la fila quedaba con un hueco vacio debajo. */
.kpi-insight--fill {
  display: flex;
  flex-direction: column;
}

.kpi-insight--fill .kpi-insight__chart,
.kpi-insight--fill .kpi-insight__no-chart {
  flex: 1 1 auto;
}

.kpi-insight--fill .kpi-insight__chart {
  display: grid;
  align-content: center;
}

.kpi-insight--fill .kpi-insight__chart--donut {
  align-items: center;
}

.kpi-insight--fill .kpi-insight__actions {
  margin-top: auto;
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

/* Cifras proporcionales: a este tamano las de ancho fijo dejan "121" suelto.
   Las tabulares quedan para columnas que se alinean, no para un numero solo. */
.kpi-insight__value strong {
  font-size: clamp(1.7rem, 3.2vw, 2.3rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
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
  grid-template-columns: var(--kpi-donut-size, 128px) minmax(0, 1fr);
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

/* Columna fija para el porcentaje: asi las cifras de todas las filas quedan
   alineadas por la derecha. */
.kpi-insight__legend--share li {
  grid-template-columns: auto minmax(0, 1fr) auto 4.6em;
}

/* Corta en los espacios. Con `anywhere` partia dentro de la palabra y se leia
   "CATERPILLA / R" o "GENERACIO / N". */
.kpi-insight__legend-label {
  color: rgba(var(--v-theme-on-surface), 0.74);
  overflow-wrap: break-word;
}

.kpi-insight__legend strong,
.kpi-insight__legend-share {
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.kpi-insight__legend-share {
  color: rgba(var(--v-theme-on-surface), 0.66);
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
  min-height: 88px;
  margin: 0;
  padding: 16px;
  place-items: center;
  border: 1px dashed var(--surface-border);
  border-radius: 14px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.88rem;
  text-align: center;
}

.kpi-insight__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-self: end;
  gap: 8px;
  margin-top: 2px;
}

.kpi-insight__action {
  align-self: end;
  min-height: 48px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  white-space: normal;
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

  /* La dona grande no cabe al lado de la leyenda en un telefono: va encima. */
  .kpi-insight--fill .kpi-insight__chart--donut {
    grid-template-columns: minmax(0, 1fr);
  }

  .kpi-insight--fill .kpi-insight__chart--donut .kpi-insight__canvas {
    justify-self: center;
    width: min(100%, var(--kpi-donut-size, 128px));
  }

  .kpi-insight__actions {
    grid-template-columns: 1fr;
  }
}
</style>

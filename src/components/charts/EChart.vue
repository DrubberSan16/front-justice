<template>
  <div ref="host" class="echart" :style="{ height }" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "vuetify";
import { prefersReducedMotion } from "@/app/motion";

/**
 * Envoltorio de ECharts.
 *
 * Se registran solo los módulos que se usan, en vez de importar `echarts`
 * completo: eso deja el bundle en una fracción del tamaño.
 *
 * El componente no decide colores de serie ni textos; recibe la `option` ya
 * armada. Lo que sí resuelve de forma transversal es lo que no debe repetirse
 * en cada gráfico: redibujado al cambiar de tamaño, tema claro/oscuro y respeto
 * a `prefers-reduced-motion`, que el design system marca como obligatorio.
 */
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const props = withDefaults(
  defineProps<{ option: Record<string, any>; height?: string }>(),
  { height: "320px" },
);

const emit = defineEmits<{ (e: "select", payload: any): void }>();

const host = ref<HTMLDivElement | null>(null);
const theme = useTheme();
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;

function render() {
  if (!chart) return;
  // `notMerge` evita que queden series de un render anterior cuando el usuario
  // deselecciona equipos: sin esto, ECharts conserva las viejas.
  chart.setOption(
    { animation: !prefersReducedMotion(), ...props.option },
    { notMerge: true },
  );
}

function build() {
  if (!host.value) return;
  chart?.dispose();
  chart = echarts.init(host.value, undefined, { renderer: "canvas" });
  chart.on("click", (params: any) => emit("select", params));
  render();
}

onMounted(() => {
  build();
  if (typeof ResizeObserver !== "undefined" && host.value) {
    observer = new ResizeObserver(() => chart?.resize());
    observer.observe(host.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  chart?.dispose();
  chart = null;
});

watch(() => props.option, render, { deep: true });

// El tema no se voltea automáticamente: quien construye la `option` elige la
// paleta de cada modo. Aquí solo se fuerza el redibujado al cambiar.
watch(() => theme.global.current.value.dark, () => build());
</script>

<style scoped>
.echart {
  width: 100%;
  min-width: 0;
}
</style>

/**
 * Paleta y estilo base de los gráficos.
 *
 * Las dos paletas categóricas están validadas con el verificador de la guía de
 * visualización (banda de luminosidad, piso de croma, separación para daltonismo
 * y piso de visión normal). El orden es fijo y no se cicla: la serie novena no
 * genera un color nuevo, se pliega en "Otros".
 *
 *   claro   #2F6CAB · #E17A00 · #0F8F72 · #8451C9 · #27A4BE
 *   oscuro  igual, con el ámbar un paso más oscuro porque la banda válida en
 *           modo oscuro es más estrecha (L 0.48–0.67) y #E17A00 se sale.
 *
 * Ámbar y cian quedan por debajo de 3:1 contra la superficie clara. La guía lo
 * admite a condición de dar relieve: por eso todo gráfico que los use lleva
 * etiquetas visibles y una tabla de respaldo en el detalle.
 */
export const CHART_PALETTE_LIGHT = [
  "#2F6CAB",
  "#E17A00",
  "#0F8F72",
  "#8451C9",
  "#27A4BE",
] as const;

export const CHART_PALETTE_DARK = [
  "#2F6CAB",
  "#D07400",
  "#0F8F72",
  "#8451C9",
  "#27A4BE",
] as const;

/** Máximo de series con color propio; el resto se agrupa. */
export const MAX_SERIES = CHART_PALETTE_LIGHT.length;

export function chartPalette(dark: boolean): readonly string[] {
  return dark ? CHART_PALETTE_DARK : CHART_PALETTE_LIGHT;
}

/**
 * Tokens de tinta y rejilla. El texto nunca viste el color de la serie: los
 * valores y etiquetas van en tinta neutra y el color solo lo lleva la marca.
 */
export function chartInk(dark: boolean) {
  return {
    text: dark ? "rgba(226,232,240,0.86)" : "rgba(26,34,43,0.78)",
    muted: dark ? "rgba(226,232,240,0.58)" : "rgba(26,34,43,0.55)",
    grid: dark ? "rgba(148,163,184,0.16)" : "rgba(31,75,122,0.12)",
    axis: dark ? "rgba(148,163,184,0.34)" : "rgba(31,75,122,0.3)",
    surface: dark ? "#0d1b2b" : "#ffffff",
    border: dark ? "rgba(148,163,184,0.22)" : "rgba(15,23,42,0.12)",
  };
}

/**
 * Base común de `option`: rejilla recesiva, tooltip siempre presente y ejes
 * discretos. Quien la use añade `series`, `xAxis.data` y la leyenda.
 */
export function chartBase(dark: boolean) {
  const ink = chartInk(dark);
  return {
    grid: { left: 52, right: 18, top: 34, bottom: 34, containLabel: true },
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "line" as const, lineStyle: { color: ink.axis } },
      backgroundColor: ink.surface,
      borderColor: ink.border,
      borderWidth: 1,
      textStyle: { color: ink.text, fontSize: 12 },
    },
    textStyle: { color: ink.text, fontFamily: "inherit" },
    xAxis: {
      type: "category" as const,
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: ink.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: ink.grid } },
    },
  };
}

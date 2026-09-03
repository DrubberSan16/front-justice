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

/** Cuántas series usan la paleta validada antes de pasar a la rotación de tono. */
export const MAX_SERIES = CHART_PALETTE_LIGHT.length;

/**
 * Color de la serie N.
 *
 * Las primeras cinco salen de la paleta validada. A partir de ahí se genera por
 * rotación de tono con el ángulo áureo, manteniendo saturación y luminosidad
 * dentro de la banda que valida la guía.
 *
 * No son colores aleatorios a propósito. Dos aleatorios pueden caer
 * perceptualmente idénticos —el problema que el validador detectó entre el
 * verde y el cian originales— y además cambiarían en cada carga, impidiendo
 * asociar un color con una unidad. El ángulo áureo reparte los tonos lo más
 * lejos posible entre sí para cualquier cantidad de series, y el resultado es
 * estable: la misma posición da siempre el mismo color.
 *
 * Aviso de lectura: por encima de ocho o diez líneas, un gráfico multi-serie se
 * vuelve ilegible por solapamiento, no por color. Para comparar muchas unidades
 * conviene acotar la selección.
 */
export function seriesColor(index: number, dark: boolean): string {
  const base = chartPalette(dark);
  const validado = base[index];
  if (validado) return validado;

  const ANGULO_AUREO = 137.508;
  const tono = (index * ANGULO_AUREO) % 360;
  // Saturación y luminosidad fijas dentro de la banda validada; en modo oscuro
  // se sube la luminosidad para conservar contraste contra la superficie.
  const saturacion = 58;
  const luminosidad = dark ? 62 : 45;
  return `hsl(${tono.toFixed(1)} ${saturacion}% ${luminosidad}%)`;
}

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

/**
 * Colores de estado (semáforo), reservados y nunca reutilizados como serie.
 *
 * Verde, ámbar y rojo se conservan a propósito pese a que el ámbar y el rojo no
 * alcanzan el margen que la guía exige entre colores *categóricos*: son colores
 * de **estado**, cuya regla es distinta —acompañarlos siempre de etiqueta, y
 * nunca comunicar solo con color—. Cambiar el rojo por magenta pasaría el
 * verificador pero rompería la convención de un semáforo de alertas, que es
 * justo lo que el operador lee de un vistazo.
 *
 * Contraste verificado ≥ 3:1 contra ambas superficies, y en modo oscuro dentro
 * de la banda de luminosidad (L 0.48–0.67), más estrecha que la clara.
 *
 * Quien los use está obligado a dar relieve: etiqueta de texto, leyenda o
 * tabla de respaldo. `LubricantTrendChart` lleva las tres.
 */
export function chartStatus(dark: boolean) {
  return dark
    ? { good: "#3E9E6D", warning: "#BE8226", critical: "#E06253" }
    : { good: "#2E7D52", warning: "#B26A00", critical: "#C0392B" };
}

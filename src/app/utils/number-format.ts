/**
 * Redondeo y presentación de cifras.
 *
 * Toda cifra que ve el usuario se muestra con DOS decimales, ni uno más. La
 * base de datos guarda más precisión a propósito — las cantidades con seis
 * decimales y los costos con cuatro — y algunas cifras nacen de una división
 * (un costo unitario es un subtotal entre una cantidad), así que sin redondear
 * la pantalla acaba enseñando "5.6463114019361775".
 *
 * ## La regla
 *
 * Redondeo comercial: se mira el tercer decimal y, si la parte que sobra es
 * media unidad o más, se sube; el empate exacto se ALEJA del cero. Así 2,675
 * sube a 2,68 y −2,675 baja a −2,68: los dos lados se tratan igual y el
 * redondeo no favorece de forma sistemática a quien cobra ni a quien paga.
 *
 * ## Por qué no basta con `toFixed(2)`
 *
 * Un `number` es un binario de doble precisión y casi ningún decimal cabe
 * exacto: 1,005 en realidad se guarda como 1,00499999999999989, así que
 * `(1.005).toFixed(2)` devuelve "1.00" y `Math.round(1.005 * 100) / 100` da
 * 1. El error está en la representación, no en el redondeo.
 *
 * La corrección es reescribir el número escalado con las quince cifras
 * significativas que el doble sí garantiza antes de redondear: eso devuelve
 * 100.5 en vez de 100.49999999999999, y ahí el redondeo ya decide bien.
 *
 * ## Dónde se aplica
 *
 * Al presentar, no al guardar. Los importes siguen almacenándose con su
 * precisión: redondear el dato de origen perdería centavos en cada suma y los
 * totales dejarían de cuadrar contra la base. Se redondea la cifra que se
 * pinta, y los totales se calculan sobre los valores completos y se redondean
 * al final, que es lo que hace que la suma de la columna coincida con el total
 * del pie.
 */

/** Decimales que ve el usuario en toda la aplicación. */
export const DISPLAY_DECIMALS = 2;

const DISPLAY_LOCALE = "es-EC";

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Redondeo comercial a `decimals` decimales, con el empate alejándose del cero.
 *
 * Devuelve un número, no un texto: sirve tanto para pintar como para llevar la
 * cifra a una celda de Excel, donde tiene que seguir siendo numérica.
 */
export function roundForDisplay(
  value: unknown,
  decimals = DISPLAY_DECIMALS,
): number {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return 0;

  const factor = 10 ** decimals;
  // `toPrecision(15)` deshace el error de la representación binaria antes de
  // redondear; sin esto 1,005 * 100 es 100.49999999999999 y bajaría a 1,00.
  const scaled = Number((parsed * factor).toPrecision(15));
  const rounded = (Math.sign(scaled) * Math.round(Math.abs(scaled))) / factor;
  // `Math.sign` de un negativo pequeño produce -0, que se imprime "-0,00".
  return rounded === 0 ? 0 : rounded;
}

/**
 * Cifra lista para pintar: dos decimales siempre, con separador de miles.
 *
 * Un valor vacío se devuelve vacío en vez de "0,00": un hueco dice "no hay
 * dato" y un cero inventado desinforma.
 */
export function formatNumberForDisplay(
  value: unknown,
  decimals = DISPLAY_DECIMALS,
): string {
  if (value === null || value === undefined || value === "") return "";

  const parsed = toFiniteNumber(value);
  if (parsed === null) return String(value);

  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundForDisplay(parsed, decimals));
}

/**
 * Un CONTEO, no una medida: órdenes, movimientos, ítems.
 *
 * Va sin decimales porque no los tiene. "3,00 órdenes" no es más preciso que
 * "3 órdenes", solo más ruidoso, y es el mismo ruido del que se queja quien lee
 * una tabla llena de ceros que no dicen nada.
 */
export function formatCountForDisplay(value: unknown): string {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return "";
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.round(parsed));
}

/**
 * Lectura de HORÓMETRO: un contador de horas, no una medida continua.
 *
 * El instrumento cuenta horas enteras; los decimales que llegan no son
 * precisión sino relleno de la columna `numeric(18,2)` en la que se guarda, y
 * en pantalla solo ensucian ("15.286,00 h"). Se muestra redondeado a entero,
 * con separador de miles y el sufijo de unidad.
 *
 * Un valor ausente devuelve una raya, no un cero: un equipo al que nunca se le
 * anotó el horómetro no está en cero, es que no se sabe.
 */
export function formatHorometerForDisplay(
  value: unknown,
  options?: { suffix?: string; empty?: string },
): string {
  const empty = options?.empty ?? "—";
  const parsed = toFiniteNumber(value);
  if (parsed === null) return empty;

  const suffix = options?.suffix ?? " h";
  return `${new Intl.NumberFormat(DISPLAY_LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.round(parsed))}${suffix}`;
}

/**
 * Lectura de horómetro para el `value` de un `<input type="number">`.
 *
 * Sin sufijo, sin agrupador y sin decimales: lo que el campo sabe leer y lo
 * único que tiene sentido teclear en un contador de horas. El campo que lo use
 * debe ir con `step="1"`, o el navegador seguirá ofreciendo medias horas con
 * las flechas.
 */
export function formatHorometerForInput(value: unknown): string {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "" : String(Math.round(parsed));
}

/**
 * Lectura de horómetro lista para guardar: entero.
 *
 * Acepta coma o punto porque el usuario teclea con el separador que tiene a
 * mano. NO recorta los negativos a cero a propósito: quien valida decide qué
 * hacer con ellos, y convertir un "-50" mal tecleado en un cero silencioso
 * sería peor que rechazarlo.
 */
export function parseHorometerInput(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

/**
 * Cifra para el `value` de un `<input type="number">`.
 *
 * Aquí NO sirve `formatNumberForDisplay`: el separador de miles y la coma
 * decimal que necesita una tabla dejan el campo en blanco al guardar, porque
 * un input numérico solo entiende el punto y ningún agrupador.
 *
 * Dos decimales como máximo y sin rellenar con ceros. La base guarda las
 * cantidades con seis decimales, así que un saldo entero llega como
 * "12.000000" y se pinta tal cual dentro de la caja: cuatro ceros que no
 * dicen nada y tapan la cifra que sí importa.
 */
export function formatNumberForInput(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const parsed = toFiniteNumber(value);
  if (parsed === null) return "";
  // `String` de un número ya redondeado da "12", "12.5" o "0.33": punto
  // decimal, sin agrupador y sin ceros de relleno.
  return String(roundForDisplay(parsed));
}

/**
 * Importe con dos decimales. La moneda se puede cambiar porque la orden de
 * compra la elige por documento; el resto del sistema trabaja en dólares.
 */
export function formatCurrencyForDisplay(
  value: unknown,
  options?: { currency?: string; decimals?: number },
): string {
  const decimals = options?.decimals ?? DISPLAY_DECIMALS;
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    style: "currency",
    currency: options?.currency || "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundForDisplay(value, decimals));
}

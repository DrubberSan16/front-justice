/**
 * Reglas de los empleados que comparten el formulario y la importación de
 * Excel: valor por hora, cédula y comparación de nombres.
 *
 * Las del valor por hora y la cédula repiten a las del servicio
 * (kpi-maintenance, modules/empleados/empleado.utils.ts): el formulario y la
 * vista previa de la importación tienen que mostrar lo mismo que el servidor
 * va a guardar, así que si una cambia, cambia la otra.
 */

/**
 * Horas de la jornada mensual ordinaria en Ecuador: 30 días de 8 horas. Es la
 * base con la que el Código del Trabajo calcula el valor de la hora.
 */
export const HORAS_MES_ECUADOR = 240;

/** Decimales con los que se guarda el valor por hora (la pantalla muestra dos). */
export const DECIMALES_VALOR_HORA = 4;

/**
 * Redondeo comercial: el empate se aleja del cero. `toPrecision(15)` deshace el
 * error de la representación binaria (1,005 * 100 es 100,49999999999999).
 */
export function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  const rounded = Math.round(scaled) / factor;
  return value < 0 && rounded !== 0 ? -rounded : rounded;
}

/** Valor de la hora ordinaria: sueldo / 240, con cuatro decimales. */
export function calculateHourlyRate(salary: number): number {
  return roundHalfUp(salary / HORAS_MES_ECUADOR, DECIMALES_VALOR_HORA);
}

/** Lo que el usuario teclea en un campo numérico, con punto o con coma. */
export function parseMoneyInput(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Un número que viene de una celda de Excel: puede ser numérico o texto con
 * formato de moneda. Acepta "1200", "1.200", "1.200,50", "1,200.50", "700,5" y
 * "$ 700"; un punto o una coma seguidos de tres dígitos son miles ("1.200" es
 * mil doscientos: un sueldo no lleva tres decimales). `null` si no es número.
 */
export function readSpreadsheetNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").replace(/[^\d.,-]/g, "");
  if (!text) return null;
  let clean = text;
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(text)) {
    clean = text.replace(/[.,]/g, "");
  } else if (text.includes(",") && text.includes(".")) {
    // El separador que aparece último es el decimal; el otro agrupa miles.
    clean =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    clean = text.replace(",", ".");
  }
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Quita espacios repetidos y de los extremos. */
export function collapseSpaces(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clave para comparar textos sin importar mayúsculas, tildes ni espacios:
 * "Supervisor de SSA " y "SUPERVISOR DE SSÁ" dan la misma.
 */
export function textKey(value: unknown): string {
  return collapseSpaces(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
}

/**
 * Cédula lista para guardar: solo dígitos. Excel guarda la cédula como número y
 * le quita el cero inicial (0604621326 llega como 604621326), y hay celdas
 * escritas con una tilde de más delante del número; por eso se descarta todo lo
 * que no sea un dígito y, si quedan nueve, se devuelve el cero.
 */
export function normalizeCedula(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 9 ? `0${digits}` : digits;
}

export function isCedulaFormat(value: string): boolean {
  return /^\d{10}$/.test(value);
}

/**
 * Dígito verificador de la cédula ecuatoriana (módulo 10): provincia 01 a 24 o
 * 30, tercer dígito menor que 6 y suma ponderada. Sirve para AVISAR de un
 * posible error de digitación; no impide guardar, porque hay cédulas emitidas
 * con un verificador que no cumple la regla.
 */
export function isCedulaCheckDigitValid(cedula: string): boolean {
  if (!isCedulaFormat(cedula)) return false;
  const province = Number(cedula.slice(0, 2));
  if (!((province >= 1 && province <= 24) || province === 30)) return false;
  if (Number(cedula[2]) >= 6) return false;
  let total = 0;
  for (let index = 0; index < 9; index += 1) {
    const product = Number(cedula[index]) * (index % 2 === 0 ? 2 : 1);
    total += product > 9 ? product - 9 : product;
  }
  return (10 - (total % 10)) % 10 === Number(cedula[9]);
}

/** Mensaje de aviso (no de error) para una cédula con formato correcto pero verificador dudoso. */
export const CEDULA_CHECK_DIGIT_WARNING =
  "El dígito verificador no coincide: revisa que la cédula esté bien escrita.";

export type LubricantParameterInputType = "number" | "text" | "select";

export type LubricantParameterTemplate = {
  key: string;
  label: string;
  group: string;
  unit?: string;
  order: number;
  inputType: LubricantParameterInputType;
  options?: string[];
};

export const lubricantConditionOptions = [
  { value: "NORMAL", title: "NORMAL" },
  { value: "ANORMAL", title: "ANORMAL" },
  { value: "PRECAUCION", title: "PRECAUCION" },
  { value: "N/D", title: "N/D" },
];

export const humidityOptions = [
  { value: "NEGATIVO", title: "NEGATIVO" },
  { value: "POSITIVO", title: "POSITIVO" },
];

export const positiveNegativeOptions = [
  { value: "NEGATIVO", title: "NEGATIVO" },
  { value: "POSITIVO", title: "POSITIVO" },
];

export const lubricantCompartments = [
  "MOTOR",
  "HIDRAULICO",
  "TRANSMISION",
  "INDUSTRTIAL",
  "DIFERENCIAL DELANTERO",
  "DIFERENCIAL POSTERIOR",
  "SWING",
  "ENGRANAJE DE LA BOMBA",
  "MANDO FINAL DERECHO",
  "MANDO FINAL IZQUIERDO",
  "TANDEM DERECHO",
  "TANDEM IZQUIERDO",
];

export const lubricantParameterTemplates: LubricantParameterTemplate[] = [
  { key: "VISCOSIDAD_100C", label: "Viscosidad a 100C, cSt", group: "Estado del lubricante", unit: "cSt", order: 1, inputType: "number" },
  { key: "VISCOSIDAD_40C", label: "Viscosidad a 40C, cSt", group: "Estado del lubricante", unit: "cSt", order: 2, inputType: "number" },
  { key: "INDICE_VISCOSIDAD", label: "Indice de viscosidad", group: "Estado del lubricante", order: 3, inputType: "number" },
  { key: "TBN", label: "T.B.N. mgKOH/gr", group: "Estado del lubricante", unit: "mgKOH/gr", order: 4, inputType: "number" },
  { key: "HUMEDAD", label: "Humedad", group: "Estado del lubricante", order: 5, inputType: "select", options: humidityOptions.map((item) => item.value) },
  { key: "GLYCOL", label: "Glycol, Abs/cm", group: "Estado del lubricante", unit: "Abs/cm", order: 6, inputType: "number" },
  { key: "COMBUSTIBLE", label: "Combustible", group: "Estado del lubricante", order: 7, inputType: "select", options: positiveNegativeOptions.map((item) => item.value) },
  // Ensayos del informe de laboratorio por etiquetas (VEN-FOR-006A v3). La
  // etiqueta es la misma del backend: el formulario manda `label` como parámetro.
  { key: "GRADO_VISCOSIDAD", label: "Grado de viscosidad", group: "Estado del lubricante", order: 8, inputType: "text" },
  { key: "TAN", label: "T.A.N. mgKOH/gr", group: "Estado del lubricante", unit: "mgKOH/gr", order: 9, inputType: "number" },
  { key: "INSOLUBLES", label: "Insolubles en pentano, % p/p", group: "Estado del lubricante", unit: "% p/p", order: 10, inputType: "number" },
  { key: "PUNTO_INFLAMACION", label: "Punto de inflamación, °C", group: "Estado del lubricante", unit: "°C", order: 11, inputType: "number" },
  { key: "CONTEO_PARTICULAS", label: "Conteo de partículas (ISO 4406)", group: "Estado del lubricante", order: 12, inputType: "text" },
  { key: "AGUA", label: "Contenido de agua, %", group: "Estado del lubricante", unit: "%", order: 13, inputType: "number" },
  { key: "GLICOL_CUALITATIVO", label: "Glicol (cualitativo)", group: "Estado del lubricante", order: 14, inputType: "select", options: positiveNegativeOptions.map((item) => item.value) },
  { key: "DILUCION_COMBUSTIBLE", label: "Dilución por combustible, % peso", group: "Estado del lubricante", unit: "% peso", order: 15, inputType: "number" },
  { key: "OXIDACION", label: "Oxidacion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 101, inputType: "number" },
  { key: "NITRACION", label: "Nitracion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 102, inputType: "number" },
  { key: "SULFATACION", label: "Sulfatacion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 103, inputType: "number" },
  { key: "HOLLIN", label: "Hollin, wt%", group: "Degradacion quimica", unit: "wt%", order: 104, inputType: "number" },
  { key: "SI", label: "Si (Silicio)", group: "Contaminacion del lubricante", unit: "ppm", order: 201, inputType: "number" },
  { key: "NA", label: "Na (Sodio)", group: "Contaminacion del lubricante", unit: "ppm", order: 202, inputType: "number" },
  { key: "V", label: "Vanadio (V)", group: "Contaminacion del lubricante", unit: "ppm", order: 203, inputType: "number" },
  { key: "NI", label: "Ni (Niquel)", group: "Contaminacion del lubricante", unit: "ppm", order: 204, inputType: "number" },
  { key: "FE", label: "Fe (Hierro)", group: "Desgaste del equipo", unit: "ppm", order: 301, inputType: "number" },
  { key: "CR", label: "Cr (Cromo)", group: "Desgaste del equipo", unit: "ppm", order: 302, inputType: "number" },
  { key: "AL", label: "Al (Aluminio)", group: "Desgaste del equipo", unit: "ppm", order: 303, inputType: "number" },
  { key: "CU", label: "Cu (Cobre)", group: "Desgaste del equipo", unit: "ppm", order: 304, inputType: "number" },
  { key: "PB", label: "Pb (Plomo)", group: "Desgaste del equipo", unit: "ppm", order: 305, inputType: "number" },
  { key: "SN", label: "Estano (Sn)", group: "Desgaste del equipo", unit: "ppm", order: 306, inputType: "number" },
  { key: "MO", label: "Mo (Molibdeno)", group: "Otros elementos", unit: "ppm", order: 401, inputType: "number" },
  { key: "B", label: "B (Boro)", group: "Otros elementos", unit: "ppm", order: 402, inputType: "number" },
  { key: "BA", label: "Ba (Bario)", group: "Otros elementos", unit: "ppm", order: 403, inputType: "number" },
  { key: "TI", label: "Ti (Titanio)", group: "Otros elementos", unit: "ppm", order: 404, inputType: "number" },
  { key: "AG", label: "Ag (Plata)", group: "Otros elementos", unit: "ppm", order: 405, inputType: "number" },
  { key: "CA", label: "Ca (Calcio)", group: "Presencia de aditivos", unit: "ppm", order: 501, inputType: "number" },
  { key: "MG", label: "Mg (Magnesio)", group: "Presencia de aditivos", unit: "ppm", order: 502, inputType: "number" },
  { key: "ZN", label: "Zn (Zinc)", group: "Presencia de aditivos", unit: "ppm", order: 503, inputType: "number" },
  { key: "P", label: "P (Fosforo)", group: "Presencia de aditivos", unit: "ppm", order: 504, inputType: "number" },
];

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function getLubricantParameterTemplate(parametro: unknown) {
  const normalized = normalizeToken(parametro);
  if (!normalized) return null;
  return (
    lubricantParameterTemplates.find(
      (item) =>
        normalizeToken(item.key) === normalized || normalizeToken(item.label) === normalized,
    ) ?? null
  );
}

export function buildLubricantDetailTemplate(compartment: string) {
  return lubricantParameterTemplates.map((item) => ({
    compartimento: compartment || "GENERAL",
    parametro: item.label,
    parametro_key: item.key,
    unidad: item.unit ?? "",
    resultado_numerico: null,
    resultado_texto: "",
    orden: item.order,
  }));
}

export function mergeLubricantDetails(
  compartment: string,
  existingDetails: Record<string, any>[] = [],
) {
  const existingMap = new Map<string, Record<string, any>>();
  for (const detail of existingDetails) {
    const template = getLubricantParameterTemplate(
      detail.parametro_key || detail.parametro_label || detail.parametro,
    );
    const key = template?.key || normalizeToken(detail.parametro);
    if (!key) continue;
    existingMap.set(key, detail);
  }

  return buildLubricantDetailTemplate(compartment).map((base) => {
    const template = getLubricantParameterTemplate(base.parametro_key);
    const key = template?.key || normalizeToken(base.parametro);
    const current = existingMap.get(key) ?? {};
    return {
      ...base,
      ...current,
      compartimento: compartment || current.compartimento || "GENERAL",
      parametro: template?.label || current.parametro || base.parametro,
      parametro_key: template?.key || current.parametro_key || base.parametro_key,
      unidad: template?.unit ?? current.unidad ?? base.unidad,
      orden: template?.order ?? current.orden ?? base.orden,
      resultado_numerico:
        current.resultado_numerico == null || current.resultado_numerico === ""
          ? null
          : Number(current.resultado_numerico),
      resultado_texto:
        current.resultado_texto == null ? "" : String(current.resultado_texto),
    };
  });
}

export function groupLubricantDetails(details: Record<string, any>[]) {
  const grouped = new Map<string, Record<string, any>[]>();
  for (const detail of details) {
    const template =
      getLubricantParameterTemplate(detail.parametro_key || detail.parametro) ?? null;
    const key = template?.group ?? detail.grupo ?? "Otros elementos";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(
      Object.assign(detail, {
      parametro: template?.label ?? detail.parametro,
      parametro_key: template?.key ?? detail.parametro_key,
      unidad: template?.unit ?? detail.unidad ?? "",
      inputType: template?.inputType ?? "number",
      options: template?.options ?? [],
      }),
    );
  }
  return [...grouped.entries()].map(([group, items]) => ({
    group,
    items: [...items].sort((a, b) => Number(a.orden ?? 999) - Number(b.orden ?? 999)),
  }));
}

/* ------------------------------------------------------------------------ *
 * Lectura del reporte: condición, límites del laboratorio y qué significa
 * cada parámetro. Lo usan la pantalla, los gráficos y los exportes, para que
 * los tres digan lo mismo con las mismas palabras.
 * ------------------------------------------------------------------------ */

export type LubricantLevel = "NORMAL" | "PRECAUCION" | "ANORMAL" | "N/D";

/**
 * Regla de un límite tal como la manda el servidor (sin campos vacíos):
 * `operator` + `value`, una banda `OUTSIDE_RANGE` (`min`/`max`), un texto
 * (`POSITIVO`) o la expresión del TBN, que llega ya calculada en
 * `resolved_value` cuando se conoce la base del aceite nuevo.
 */
export type LubricantRule = {
  raw?: string | null;
  operator?: string | null;
  value?: number | null;
  text?: string | null;
  expression?: string | null;
  offset?: number | null;
  min?: number | null;
  max?: number | null;
  max_exclusive?: boolean | null;
  resolved_value?: number | null;
};

export function normalizeLubricantLevel(value: unknown): LubricantLevel {
  const raw = normalizeToken(value);
  if (["ANORMAL", "ALERTA", "CRITICO", "CRITICAL"].includes(raw)) return "ANORMAL";
  if (["PRECAUCION", "OBSERVACION", "WARNING"].includes(raw)) return "PRECAUCION";
  if (["N/D", "ND", "SIN DATO", "SIN EVALUACION", ""].includes(raw)) return "N/D";
  return "NORMAL";
}

/**
 * Las cuatro condiciones con las palabras del instructivo del laboratorio
 * (VEN-FOR-006A). El color nunca va solo: chip con icono y texto.
 */
export const lubricantLevelMeta: Record<
  LubricantLevel,
  { title: string; color: string; icon: string; meaning: string; severity: number }
> = {
  ANORMAL: {
    title: "Anormal",
    color: "error",
    icon: "mdi-alert-octagon-outline",
    meaning: "Uno o varios parámetros están fuera de los rangos generales del laboratorio.",
    severity: 3,
  },
  PRECAUCION: {
    title: "Precaución",
    color: "warning",
    icon: "mdi-alert-outline",
    meaning: "Uno o varios parámetros están en zona tolerable: conviene una acción preventiva.",
    severity: 2,
  },
  NORMAL: {
    title: "Normal",
    color: "success",
    icon: "mdi-check-circle-outline",
    meaning: "Todos los parámetros están dentro de los rangos generales.",
    severity: 1,
  },
  "N/D": {
    title: "Sin dato",
    color: "secondary",
    icon: "mdi-help-circle-outline",
    meaning: "La muestra no trae resultado o no fue evaluada.",
    severity: 0,
  },
};

export const LUBRICANT_LEVEL_ORDER: LubricantLevel[] = ["ANORMAL", "PRECAUCION", "NORMAL", "N/D"];

const limitFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 });

export function formatLubricantNumber(value: unknown, unit?: string | null) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(parsed)) {
    return "";
  }
  const text = limitFormatter.format(parsed);
  return unit ? `${text} ${unit}` : text;
}

function isRuleNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Límite en palabras: "desde 100 ppm", "por debajo de 12,3 cSt". El informe
 * por etiquetas a veces trae en la celda del criterio solo el rótulo de la
 * columna ("Precaución", "Anormal"): eso no es un límite y no se muestra.
 */
export function describeLubricantRule(
  rule: LubricantRule | null | undefined,
  unit?: string | null,
): string | null {
  if (!rule) return null;
  if (rule.text) return `si da ${rule.text}`;
  if (rule.expression === "OUTSIDE_RANGE") {
    const min = isRuleNumber(rule.min) ? formatLubricantNumber(rule.min) : null;
    const max = isRuleNumber(rule.max) ? formatLubricantNumber(rule.max) : null;
    const suffix = unit ? ` ${unit}` : "";
    if (min && max) return `fuera de ${min} a ${max}${suffix}`;
    if (min) return `por debajo de ${min}${suffix}`;
    if (max) return `por encima de ${max}${suffix}`;
  }
  if (rule.expression === "BASELINE_PERCENT_MINUS_OFFSET") {
    const percent = formatLubricantNumber((isRuleNumber(rule.value) ? rule.value : 0.5) * 100);
    const offset = formatLubricantNumber(isRuleNumber(rule.offset) ? rule.offset : 1);
    const base = `al bajar a ${percent} % del aceite nuevo menos ${offset}`;
    return isRuleNumber(rule.resolved_value)
      ? `${base} (${formatLubricantNumber(rule.resolved_value, unit)})`
      : base;
  }
  if (isRuleNumber(rule.value)) {
    const limit = formatLubricantNumber(rule.value, unit);
    switch (rule.operator) {
      case ">":
        return `por encima de ${limit}`;
      case "<":
        return `por debajo de ${limit}`;
      case "<=":
        return `en ${limit} o menos`;
      case "=":
        return `igual a ${limit}`;
      default:
        return `desde ${limit}`;
    }
  }
  const raw = String(rule.raw ?? "").trim();
  if (!raw || /^(precauci|anormal|normal)/i.test(normalizeToken(raw).toLowerCase())) {
    return null;
  }
  return raw;
}

export type LubricantLimitLine = { value: number; direction: "up" | "down" };

/**
 * Líneas que un gráfico puede trazar para una regla. `up`: se cruza al subir
 * (hierro "desde 100"); `down`: al bajar (viscosidad "por debajo de 12,3").
 * Una regla de texto no tiene línea.
 */
export function lubricantRuleLines(rule: LubricantRule | null | undefined): LubricantLimitLine[] {
  if (!rule || rule.text) return [];
  if (rule.expression === "OUTSIDE_RANGE") {
    const lines: LubricantLimitLine[] = [];
    if (isRuleNumber(rule.min)) lines.push({ value: rule.min, direction: "down" });
    if (isRuleNumber(rule.max)) lines.push({ value: rule.max, direction: "up" });
    return lines;
  }
  if (rule.expression === "BASELINE_PERCENT_MINUS_OFFSET") {
    return isRuleNumber(rule.resolved_value)
      ? [{ value: rule.resolved_value, direction: "down" }]
      : [];
  }
  if (!isRuleNumber(rule.value) || rule.operator === "=") return [];
  return [{ value: rule.value, direction: rule.operator?.startsWith("<") ? "down" : "up" }];
}

/**
 * Qué mide cada grupo y cada parámetro, y qué suele indicar cuando sale de su
 * límite. Las causas del estado del lubricante y de la degradación siguen la
 * hoja "Posibles causas de anormalidad" del informe del laboratorio; el resto
 * es la lectura habitual de un análisis de aceite de motor.
 */
export const lubricantGroupGuide: Record<string, string> = {
  "Estado del lubricante":
    "Si el aceite conserva su viscosidad y su reserva alcalina, y si trae agua, refrigerante o combustible.",
  "Degradación química":
    "Cuánto se ha deteriorado el aceite por el calor, los gases de la combustión y el azufre del combustible.",
  "Contaminación del lubricante":
    "Lo que entra desde fuera: polvo, refrigerante, agua o ceniza del combustible.",
  "Desgaste del equipo":
    "Metales que desprenden las piezas internas al desgastarse. Un salto entre muestras pesa más que el valor suelto.",
  "Otros elementos":
    "Aditivos o aleaciones especiales. Se vigilan por cambios bruscos más que por un valor fijo.",
  "Presencia de aditivos":
    "Aditivos del aceite nuevo. Si caen, se están agotando; si cambian de golpe, puede haber mezcla con otro aceite.",
};

export const lubricantParameterGuide: Record<string, { what: string; outOfRange: string }> = {
  VISCOSIDAD_100C: {
    what: "Espesor del aceite a temperatura de trabajo.",
    outOfRange: "Si baja: dilución por combustible. Si sube: oxidación, hollín o mezcla de aceites.",
  },
  VISCOSIDAD_40C: {
    what: "Espesor del aceite en frío, como en el arranque.",
    outOfRange: "Si baja: dilución por combustible. Si sube: oxidación, hollín o mezcla de aceites.",
  },
  INDICE_VISCOSIDAD: {
    what: "Cuánto cambia la viscosidad con la temperatura; más alto es más estable.",
    outOfRange: "Una caída indica aceite degradado o mezclado.",
  },
  GRADO_VISCOSIDAD: {
    what: "Si la viscosidad medida corresponde al grado SAE o ISO declarado.",
    outOfRange: "Fuera de grado: aceite equivocado, mezclado o degradado.",
  },
  TBN: {
    what: "Reserva alcalina: capacidad del aceite para neutralizar los ácidos de la combustión.",
    outOfRange: "Baja con el uso; por debajo del límite el aceite ya no protege contra la corrosión.",
  },
  TAN: {
    what: "Acidez del aceite.",
    outOfRange: "Sube con la oxidación y la contaminación.",
  },
  HUMEDAD: {
    what: "Presencia de agua en el aceite.",
    outOfRange: "Condensación o agua de refrigeración: corroe, agota los aditivos y forma lodos.",
  },
  AGUA: {
    what: "Contenido de agua en el aceite.",
    outOfRange: "Condensación o agua de refrigeración: corroe, agota los aditivos y forma lodos.",
  },
  GLYCOL: {
    what: "Refrigerante (anticongelante) en el aceite.",
    outOfRange: "Probable fuga de refrigerante al cárter: ataca los aditivos y sube la viscosidad.",
  },
  GLICOL_CUALITATIVO: {
    what: "Prueba de presencia de refrigerante.",
    outOfRange: "Positivo: probable fuga de refrigerante al cárter.",
  },
  COMBUSTIBLE: {
    what: "Combustible mezclado en el aceite.",
    outOfRange: "Combustión incompleta o inyectores defectuosos: el combustible diluye el aceite.",
  },
  DILUCION_COMBUSTIBLE: {
    what: "Porcentaje de combustible en el aceite.",
    outOfRange: "Combustión incompleta o inyectores defectuosos: el combustible diluye el aceite.",
  },
  INSOLUBLES: {
    what: "Sólidos en suspensión: hollín y productos de oxidación.",
    outOfRange: "Aceite saturado de residuos; tapa filtros y conductos.",
  },
  PUNTO_INFLAMACION: {
    what: "Temperatura a la que el aceite desprende vapores inflamables.",
    outOfRange: "Si baja, hay combustible en el aceite.",
  },
  CONTEO_PARTICULAS: {
    what: "Limpieza del aceite: partículas por tamaño según ISO 4406.",
    outOfRange: "Más partículas: filtración insuficiente o desgaste en curso.",
  },
  OXIDACION: {
    what: "Degradación del aceite por calor y oxígeno.",
    outOfRange: "Aditivos agotados, contaminación o temperatura de operación alta.",
  },
  NITRACION: {
    what: "Compuestos de nitrógeno que dejan los gases de combustión.",
    outOfRange: "Paso anormal de gases al cárter, mezcla pobre o alta temperatura.",
  },
  SULFATACION: {
    what: "Productos del azufre que trae el combustible.",
    outOfRange: "Combustible con mucho azufre; consume la reserva alcalina (TBN).",
  },
  HOLLIN: {
    what: "Carbón que deja la combustión.",
    outOfRange: "Combustión incompleta o dispersantes agotados: sube la viscosidad y tapa filtros.",
  },
  SI: {
    what: "Silicio: polvo y tierra.",
    outOfRange: "Entra polvo por el filtro o la admisión de aire; acelera el desgaste.",
  },
  NA: {
    what: "Sodio: aditivo del refrigerante o agua.",
    outOfRange: "Junto al glicol, señala una fuga de refrigerante.",
  },
  V: {
    what: "Vanadio: ceniza del combustible pesado.",
    outOfRange: "Residuos de combustión que llegan al aceite.",
  },
  NI: {
    what: "Níquel: combustible pesado o aleaciones de válvulas y engranajes.",
    outOfRange: "Residuos de combustión o desgaste de piezas aleadas.",
  },
  FE: {
    what: "Hierro: camisas, cigüeñal, árbol de levas y engranajes.",
    outOfRange: "Desgaste general de piezas de acero.",
  },
  CR: {
    what: "Cromo: anillos de pistón.",
    outOfRange: "Desgaste de anillos, a menudo por polvo.",
  },
  AL: {
    what: "Aluminio: pistones y cojinetes.",
    outOfRange: "Desgaste de pistones; con silicio alto puede ser polvo.",
  },
  CU: {
    what: "Cobre: cojinetes, bujes de bronce y enfriador de aceite.",
    outOfRange: "Desgaste de bujes y cojinetes o corrosión del enfriador.",
  },
  PB: {
    what: "Plomo: metal antifricción de los cojinetes.",
    outOfRange: "Desgaste de cojinetes.",
  },
  SN: {
    what: "Estaño: cojinetes y recubrimiento de pistones.",
    outOfRange: "Desgaste de cojinetes o pistones.",
  },
  MO: {
    what: "Molibdeno: aditivo antidesgaste o recubrimiento de anillos.",
    outOfRange: "Un cambio brusco sugiere otro aceite o desgaste de anillos.",
  },
  B: {
    what: "Boro: aditivo del aceite o del refrigerante.",
    outOfRange: "Un salto junto al sodio puede indicar refrigerante.",
  },
  BA: {
    what: "Bario: aditivo detergente.",
    outOfRange: "Un cambio brusco sugiere mezcla con otro aceite.",
  },
  TI: {
    what: "Titanio: aleaciones especiales y pinturas.",
    outOfRange: "Desgaste de piezas de aleación especial.",
  },
  AG: {
    what: "Plata: cojinetes plateados y soldaduras.",
    outOfRange: "Desgaste de cojinetes plateados.",
  },
  CA: {
    what: "Calcio: aditivo detergente; da la reserva alcalina.",
    outOfRange: "Si cae, el aditivo se agota; si cambia de golpe, otro aceite.",
  },
  MG: {
    what: "Magnesio: aditivo detergente.",
    outOfRange: "Si cae, el aditivo se agota; si cambia de golpe, otro aceite.",
  },
  ZN: {
    what: "Zinc: aditivo antidesgaste.",
    outOfRange: "Si cae, el aditivo antidesgaste se agota.",
  },
  P: {
    what: "Fósforo: aditivo antidesgaste.",
    outOfRange: "Si cae, el aditivo antidesgaste se agota.",
  },
};

export function lubricantParameterGuideFor(key: unknown) {
  const template = getLubricantParameterTemplate(key);
  return lubricantParameterGuide[template?.key ?? normalizeToken(key)] ?? null;
}

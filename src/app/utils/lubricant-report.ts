import { chartStatus } from "@/app/config/chart-theme";
import {
  describeLubricantRule,
  formatLubricantNumber,
  lubricantLevelMeta,
  lubricantParameterGuideFor,
  normalizeLubricantLevel,
  type LubricantLevel,
} from "@/app/config/lubricant-analysis";
import { formatDateForInput } from "@/app/utils/date-time";
import { buildEquipmentDisplayTitle, resolveEquipmentLocation } from "@/app/utils/equipment-display";
import type { ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;

/** Un parámetro fuera de su límite, con el límite que lo dejó fuera. */
export type LubricantFinding = {
  key: string;
  parametro: string;
  grupo: string;
  unidad: string;
  valor: number | string | null;
  nivel: LubricantLevel;
  limite: string | null;
};

/** Fecha que ordena las muestras: la del informe y, si falta, la anterior disponible. */
export function resolveLubricantReportDate(item: AnyRow | null | undefined) {
  return (
    String(
      item?.sample_info?.fecha_informe ||
        item?.fecha_reporte ||
        item?.sample_info?.fecha_ingreso ||
        item?.fecha_muestra ||
        "",
    ).slice(0, 10) || null
  );
}

/**
 * Condición validada: la que calcula el servidor comparando cada parámetro
 * con sus límites. La que escribió el laboratorio en su informe va aparte
 * (`labLubricantLevel`) porque no siempre coinciden y la diferencia es dato.
 */
export function validatedLubricantLevel(item: AnyRow | null | undefined): LubricantLevel {
  return normalizeLubricantLevel(item?.estado_diagnostico);
}

export function labLubricantLevel(item: AnyRow | null | undefined): LubricantLevel {
  return normalizeLubricantLevel(item?.sample_info?.condicion);
}

/**
 * Parámetros fuera de límite de una muestra. La lista resumida los trae
 * ya calculados (`hallazgos`); la completa se deriva de sus detalles.
 */
export function lubricantFindings(item: AnyRow | null | undefined): LubricantFinding[] {
  if (Array.isArray(item?.hallazgos)) {
    return item!.hallazgos.map((finding: AnyRow) => ({
      key: String(finding.parametro_key ?? finding.parametro ?? ""),
      parametro: String(finding.parametro ?? finding.parametro_key ?? ""),
      grupo: String(finding.grupo_label ?? ""),
      unidad: String(finding.unidad ?? ""),
      valor: finding.valor ?? null,
      nivel: normalizeLubricantLevel(finding.nivel),
      limite: finding.limite ?? null,
    }));
  }
  return (item?.detalles ?? [])
    .map((detail: AnyRow) => ({ detail, nivel: normalizeLubricantLevel(detail.nivel_alerta) }))
    .filter(({ nivel }: AnyRow) => nivel === "ANORMAL" || nivel === "PRECAUCION")
    .sort(
      (a: AnyRow, b: AnyRow) =>
        lubricantLevelMeta[b.nivel as LubricantLevel].severity -
          lubricantLevelMeta[a.nivel as LubricantLevel].severity ||
        Number(a.detail.orden ?? 999) - Number(b.detail.orden ?? 999),
    )
    .map(({ detail, nivel }: AnyRow) => {
      const rule = nivel === "ANORMAL" ? detail.rango_anormal : detail.rango_precaucion;
      const numeric = detail.resultado_numerico;
      return {
        key: String(detail.parametro_key ?? detail.parametro ?? ""),
        parametro: String(detail.parametro_label ?? detail.parametro ?? ""),
        grupo: String(detail.grupo_label ?? ""),
        unidad: String(detail.unidad ?? ""),
        valor: numeric !== null && numeric !== undefined ? Number(numeric) : detail.resultado_texto ?? null,
        nivel,
        limite: rule ? String(rule.raw ?? "").trim() || null : null,
      };
    });
}

/** "Cu (Cobre) 64 ppm (> 50)": el hallazgo en una línea, para tablas y PDF. */
export function formatLubricantFinding(finding: LubricantFinding) {
  const value =
    typeof finding.valor === "number"
      ? formatLubricantNumber(finding.valor, finding.unidad || null)
      : String(finding.valor ?? "");
  // El laboratorio escribe "> 16.7"; la pantalla usa coma decimal.
  const limit = finding.limite ? ` (${finding.limite.replace(/(\d)\.(\d)/g, "$1,$2")})` : "";
  return `${finding.parametro} ${value}${limit}`.trim();
}

/**
 * Las fuentes del PDF (jsPDF) no traen "≥", "≤" ni el signo menos: los
 * imprimían como letras sueltas. Se escriben con ASCII en todo el reporte.
 */
function reportText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-")
    : value;
}

function reportRows<T extends AnyRow>(rows: T[]): T[] {
  return rows.map(
    (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, reportText(value)])) as T,
  );
}

/** Rótulo corto para el eje: "Sulfatación, Abs/cm" -> "Sulfatación". */
function shortParameterLabel(label: string) {
  return label.split(",")[0]?.trim() || label;
}

function equipmentKey(item: AnyRow) {
  return [item.equipo_id || item.equipo_codigo || item.equipo_nombre, item.lubricante, item.compartimento_principal]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("::");
}

function monthLabel(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${names[(month || 1) - 1]} ${year}`;
}

/**
 * Reporte de análisis de lubricante con la misma lógica que la pantalla:
 * condición validada contra los límites del laboratorio, qué parámetro la
 * causó y, en Excel, cada resultado frente a su límite. El PDF lleva solo
 * los parámetros fuera de límite: con todos, una flota de cien muestras
 * daba cien páginas que nadie lee.
 */
export function buildLubricantReport(
  analyses: AnyRow[],
  options: { subtitle?: string; format?: "pdf" | "excel" } = {},
): ReportDefinition {
  const sorted = [...analyses].sort((a, b) =>
    String(resolveLubricantReportDate(b) ?? "").localeCompare(String(resolveLubricantReportDate(a) ?? "")),
  );

  const counts: Record<LubricantLevel, number> = { ANORMAL: 0, PRECAUCION: 0, NORMAL: 0, "N/D": 0 };
  const differences = sorted.filter((item) => {
    counts[validatedLubricantLevel(item)] += 1;
    const lab = labLubricantLevel(item);
    return lab !== "N/D" && lab !== validatedLubricantLevel(item);
  }).length;

  const sampleRows = sorted.map((item) => {
    const findings = lubricantFindings(item);
    const lab = labLubricantLevel(item);
    return {
      codigo: item.codigo ?? "",
      fecha_informe: resolveLubricantReportDate(item) ?? "",
      numero_muestra: item.sample_info?.numero_muestra ?? "",
      equipo: buildEquipmentDisplayTitle(item),
      central: resolveEquipmentLocation(item) || "Sin ubicación",
      aceite: item.lubricante ?? "",
      compartimento: item.compartimento_principal ?? "",
      horas_aceite: item.sample_info?.horas_lubricante ?? "",
      condicion: lubricantLevelMeta[validatedLubricantLevel(item)].title,
      condicion_laboratorio: lab === "N/D" ? "Sin dato" : lubricantLevelMeta[lab].title,
      fuera_de_limite: findings.length ? findings.map(formatLubricantFinding).join("; ") : "Ninguno",
    };
  });

  // Última muestra de cada equipo (con su aceite y compartimento).
  const byEquipment = new Map<string, { latest: AnyRow; total: number; abnormal: number; caution: number }>();
  for (const item of sorted) {
    const key = equipmentKey(item);
    const entry = byEquipment.get(key) ?? { latest: item, total: 0, abnormal: 0, caution: 0 };
    entry.total += 1;
    const level = validatedLubricantLevel(item);
    if (level === "ANORMAL") entry.abnormal += 1;
    if (level === "PRECAUCION") entry.caution += 1;
    byEquipment.set(key, entry);
  }
  const equipmentRows = [...byEquipment.values()]
    .sort(
      (a, b) =>
        lubricantLevelMeta[validatedLubricantLevel(b.latest)].severity -
          lubricantLevelMeta[validatedLubricantLevel(a.latest)].severity ||
        buildEquipmentDisplayTitle(a.latest).localeCompare(buildEquipmentDisplayTitle(b.latest)),
    )
    .map(({ latest, total, abnormal, caution }) => ({
      equipo: buildEquipmentDisplayTitle(latest),
      aceite: latest.lubricante ?? "",
      compartimento: latest.compartimento_principal ?? "",
      ultima_muestra: resolveLubricantReportDate(latest) ?? "",
      condicion: lubricantLevelMeta[validatedLubricantLevel(latest)].title,
      causas: lubricantFindings(latest).map(formatLubricantFinding).join("; ") || "Todos dentro de límite",
      muestras: total,
      anormales: abnormal,
      precauciones: caution,
    }));

  // Qué parámetros salen más veces de su límite.
  const byParameter = new Map<string, { label: string; abnormal: number; caution: number }>();
  for (const item of sorted) {
    for (const finding of lubricantFindings(item)) {
      const entry = byParameter.get(finding.key) ?? { label: finding.parametro, abnormal: 0, caution: 0 };
      if (finding.nivel === "ANORMAL") entry.abnormal += 1;
      else entry.caution += 1;
      byParameter.set(finding.key, entry);
    }
  }
  const parameterRanking = [...byParameter.values()]
    .sort((a, b) => b.abnormal + b.caution - (a.abnormal + a.caution))
    .slice(0, 8);

  const months = new Map<string, Record<LubricantLevel, number>>();
  for (const item of [...sorted].reverse()) {
    const date = resolveLubricantReportDate(item);
    if (!date) continue;
    const month = date.slice(0, 7);
    const entry = months.get(month) ?? { ANORMAL: 0, PRECAUCION: 0, NORMAL: 0, "N/D": 0 };
    entry[validatedLubricantLevel(item)] += 1;
    months.set(month, entry);
  }
  const monthEntries = [...months.entries()].slice(-18);
  const status = chartStatus(false);

  const isPdf = options.format === "pdf";
  const validationRows = sorted.flatMap((item) =>
    (item.detalles ?? [])
      .map((detail: AnyRow) => ({ detail, nivel: normalizeLubricantLevel(detail.nivel_alerta) }))
      .filter(({ nivel }: AnyRow) => !isPdf || nivel === "ANORMAL" || nivel === "PRECAUCION")
      .map(({ detail, nivel }: AnyRow) => {
        const numeric = detail.resultado_numerico;
        const outOfRange = nivel === "ANORMAL" || nivel === "PRECAUCION";
        return {
          muestra: `${item.codigo ?? ""} · ${resolveLubricantReportDate(item) ?? "Sin fecha"} · ${buildEquipmentDisplayTitle(item)}`,
          grupo: detail.grupo_label ?? "",
          parametro: detail.parametro_label ?? detail.parametro ?? "",
          resultado:
            numeric !== null && numeric !== undefined && numeric !== ""
              ? Number(numeric)
              : detail.resultado_texto ?? "",
          unidad: detail.unidad ?? "",
          limite_precaucion: describeLubricantRule(detail.rango_precaucion, detail.unidad) ?? "",
          limite_anormal: describeLubricantRule(detail.rango_anormal, detail.unidad) ?? "",
          estado: lubricantLevelMeta[nivel as LubricantLevel].title,
          lectura: outOfRange
            ? lubricantParameterGuideFor(detail.parametro_key ?? detail.parametro)?.outOfRange ?? ""
            : "",
        };
      }),
  );

  return {
    fileName: `analisis_lubricante_${formatDateForInput(new Date())}`,
    title: "Reporte de análisis de lubricante",
    subtitle:
      options.subtitle ??
      "Condición validada contra los límites que fija el laboratorio para cada parámetro.",
    compactPdf: true,
    summary: [
      { label: "Muestras", value: sorted.length },
      { label: "Equipos", value: equipmentRows.length },
      { label: "Anormales", value: counts.ANORMAL },
      { label: "En precaución", value: counts.PRECAUCION },
      { label: "Normales", value: counts.NORMAL },
      { label: "Distinta a la del laboratorio", value: differences },
    ],
    charts: [
      ...(parameterRanking.length
        ? [
            {
              title: "Parámetros fuera de límite",
              subtitle: "Veces que cada parámetro salió de su límite en el período",
              type: "bar" as const,
              unit: "Muestras",
              points: parameterRanking.map((entry) => ({
                label: shortParameterLabel(entry.label),
                value: entry.abnormal + entry.caution,
              })),
              stacks: [
                { name: "Anormal", values: parameterRanking.map((entry) => entry.abnormal), color: status.critical },
                { name: "Precaución", values: parameterRanking.map((entry) => entry.caution), color: status.warning },
              ],
            },
          ]
        : []),
      ...(monthEntries.length
        ? [
            {
              title: "Muestras por mes y condición",
              type: "bar" as const,
              unit: "Muestras",
              points: monthEntries.map(([month, entry]) => ({
                label: monthLabel(month),
                value: entry.ANORMAL + entry.PRECAUCION + entry.NORMAL + entry["N/D"],
              })),
              stacks: [
                { name: "Anormal", values: monthEntries.map(([, entry]) => entry.ANORMAL), color: status.critical },
                { name: "Precaución", values: monthEntries.map(([, entry]) => entry.PRECAUCION), color: status.warning },
                { name: "Normal", values: monthEntries.map(([, entry]) => entry.NORMAL), color: status.good },
              ],
            },
          ]
        : []),
    ],
    sheets: [
      {
        name: "Resumen por equipo",
        note: "Condición de la última muestra de cada equipo y el parámetro que la causó, con su límite entre paréntesis.",
        rows: reportRows(equipmentRows),
        columns: [
          { key: "equipo", header: "Equipo", width: 34 },
          { key: "aceite", header: "Aceite", width: 16 },
          { key: "ultima_muestra", header: "Última muestra", width: 13, format: "date" },
          { key: "condicion", header: "Condición", width: 12 },
          { key: "causas", header: "Fuera de límite", width: 40 },
          // Conteos: sin formato de cantidad, que les pondría ",00".
          { key: "muestras", header: "Muestras", width: 10 },
          { key: "anormales", header: "Anormales", width: 10 },
          { key: "precauciones", header: "Precaución", width: 10 },
        ],
      },
      {
        name: "Muestras",
        note: "«Condición» es la validada con los límites; «Laboratorio», la que escribió el laboratorio en su informe.",
        rows: reportRows(sampleRows),
        columns: [
          { key: "codigo", header: "Código", width: 12 },
          { key: "fecha_informe", header: "Fecha informe", width: 13, format: "date" },
          { key: "numero_muestra", header: "Muestra", width: 16 },
          { key: "equipo", header: "Equipo", width: 32 },
          { key: "compartimento", header: "Compartimento", width: 13 },
          { key: "horas_aceite", header: "Horas aceite", width: 11 },
          { key: "condicion", header: "Condición", width: 12 },
          { key: "condicion_laboratorio", header: "Laboratorio", width: 12 },
          { key: "fuera_de_limite", header: "Fuera de límite", width: 40 },
        ],
      },
      ...(validationRows.length
        ? [
            {
              name: isPdf ? "Parámetros fuera de límite" : "Validación por parámetro",
              note: isPdf
                ? "Solo los resultados que salieron de su límite. El Excel trae todos los parámetros de cada muestra."
                : "Cada resultado frente a los límites de precaución y anormal del laboratorio.",
              rows: reportRows(validationRows),
              groupBy: ["muestra"],
              columns: [
                { key: "muestra", header: "Muestra", width: 30 },
                { key: "grupo", header: "Grupo", width: 18 },
                { key: "parametro", header: "Parámetro", width: 22 },
                { key: "resultado", header: "Resultado", width: 11 },
                { key: "unidad", header: "Unidad", width: 9 },
                { key: "limite_precaucion", header: "Precaución", width: 20 },
                { key: "limite_anormal", header: "Anormal", width: 20 },
                { key: "estado", header: "Estado", width: 11 },
                { key: "lectura", header: "Qué indica", width: 36 },
              ],
            },
          ]
        : []),
    ],
  };
}

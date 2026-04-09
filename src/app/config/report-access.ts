export type ReportAccessKey =
  | "dashboard_ejecutivo"
  | "inteligencia_operativa"
  | "analisis_lubricante"
  | "ordenes_trabajo"
  | "inventario"
  | "programaciones"
  | "gemelos_digitales";

export const REPORT_ACCESS_OPTIONS: Array<{
  title: string;
  value: ReportAccessKey;
  description: string;
}> = [
  {
    title: "Dashboard ejecutivo",
    value: "dashboard_ejecutivo",
    description: "Reporte consolidado del panel principal KPI.",
  },
  {
    title: "Inteligencia operativa",
    value: "inteligencia_operativa",
    description: "KPI, análisis y reportes operativos consolidados.",
  },
  {
    title: "Análisis de lubricante",
    value: "analisis_lubricante",
    description: "Exportes y vistas analíticas del módulo de lubricación.",
  },
  {
    title: "Órdenes de trabajo",
    value: "ordenes_trabajo",
    description: "Reportes y exportes asociados a órdenes de trabajo.",
  },
  {
    title: "Inventario y Kardex",
    value: "inventario",
    description: "Reportes de materiales, stock y movimientos de inventario.",
  },
  {
    title: "Programaciones",
    value: "programaciones",
    description: "Reportes mensuales, semanales y agenda operativa.",
  },
  {
    title: "Gemelos digitales",
    value: "gemelos_digitales",
    description: "Acceso a reportes e insights del módulo de gemelos digitales.",
  },
];

const REPORT_ACCESS_KEY_SET = new Set<string>(REPORT_ACCESS_OPTIONS.map((item) => item.value));

export function normalizeReportAccess(value: unknown): ReportAccessKey[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter((item) => REPORT_ACCESS_KEY_SET.has(item)))] as ReportAccessKey[];
}

export function hasReportAccess(allowedReports: unknown, reportKey: ReportAccessKey) {
  const normalized = normalizeReportAccess(allowedReports);
  return normalized.length === 0 || normalized.includes(reportKey);
}

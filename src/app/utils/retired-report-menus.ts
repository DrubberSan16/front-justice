/** Informes retirados del menú y del catálogo de asignación de permisos. */
export function isRetiredReportComponent(value: unknown) {
  const component = String(value ?? "").trim().toLowerCase().replace(/^\/+/, "").replace(/^app\//, "");
  return ["dashboard-operativo", "dashboard-supervisores", "reporte-detallado"].includes(component);
}

import assert from "node:assert/strict";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({
  stdin: { contents: `export * from "@/app/utils/reporting-module-report"; export * from "@/app/config/reporting-modules"; export * from "@/app/utils/reporting-relations"; export * from "@/app/utils/retired-report-menus";`, resolveDir: root },
  alias: { "@": path.join(root, "src") }, bundle: true, platform: "node", format: "cjs", write: false, packages: "external",
});
const fixtureFilename = path.join(root, "scripts", "reporting-module-fixture.cjs");
const fixture = new Module(fixtureFilename);
fixture.filename = fixtureFilename;
fixture.paths = Module._nodeModulePaths(root);
fixture._compile(outputFiles[0].text, fixture.filename);
const reports = fixture.exports;

const events = Array.from({ length: 137 }, (_, index) => ({ dateLabel: "10/10/2026", title: `Registro ${index + 1}`, status: index % 2 ? "Pendiente" : "Finalizado", category: "Preventivo", owner: "Responsable registrado", value: index + 1 }));
for (const module of reports.REPORTING_MODULES) {
  const report = reports.buildReportingModuleReport({ module, period: "01/10/2026 - 19/10/2026", fileName: `informe-${module.key}`, events });
  assert.ok(report.title.includes(module.title), module.key);
  assert.equal(report.sheets[0].rows.length, 137, `${module.key}: exporta todo el período, sin recortar a la vista previa`);
  assert.equal(report.sheets[0].rows.at(-1).title, "Registro 137");
  assert.equal(report.charts[0].points.reduce((sum, point) => sum + point.value, 0), 137);
  assert.equal(report.summary[0].value, 137);
  assert.equal(report.sheets[0].columns.at(-1).header, module.valueLabel || "Valor");
  assert.ok(report.sheets[0].fitColumnsToPage);
  const empty = reports.buildReportingModuleReport({ module, period: "Período sin actividad", fileName: "vacio", events: [] });
  assert.equal(empty.sheets[0].rows.length, 0);
  assert.ok(empty.sheets[0].emptyMessage);
}
const relationships = reports.buildReportingRelationshipRows("alerts", { reports: { horas_trabajadas: { rows: [{ equipment_label: "CATERPILLAR | JC - UG22 - 3512 B · UBI-A00003 - CENTRAL CPT", total_horas: 55, total_ordenes: 1 }] }, costo_mantenimiento: { rows: [{ equipment_label: "CATERPILLAR | JC - UG22 - 3512 B · UBI-A00003 - CENTRAL CPT", total_costo: 2811.11 }] } } });
const alerts = reports.buildReportingModuleReport({ module: reports.getReportingModule("alerts"), period: "Octubre", fileName: "alertas", events: events.slice(0, 2), relationships });
const related = alerts.sheets[1].rows[0];
assert.deepEqual([related.brand, related.unit, related.location, related.central, related.hours, related.maintenanceCost], ["CATERPILLAR", "JC - UG22 - 3512 B", "UBI-A00003", "CENTRAL CPT", 55, 2811.11]);
for (const route of ["dashboard-operativo", "/app/dashboard-supervisores", "reporte-detallado"]) assert.equal(reports.isRetiredReportComponent(route), true);
for (const route of ["dashboard-administracion", "dashboard-gerencia", "reporteria"]) assert.equal(reports.isRetiredReportComponent(route), false);
console.log(`PASS: informe completo y vacío en ${reports.REPORTING_MODULES.length} módulos, todas las filas y totales, equipo separado y rutas de informes retirados.`);

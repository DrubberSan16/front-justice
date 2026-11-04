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

// El consolidado de Proyectos no debe sumar OT normales, ni siquiera cuando
// comparten la misma entidad; los totales se filtran antes de agruparse.
const projectName = "PRY-A00001 - Construcción de plataforma";
const projectOt = { equipment_label: projectName, work_order_code: "OT-P001", maintenance_kind: "PROYECTO", total_horas: 5, total_costo: 40, total_cantidad: 2 };
const secondProjectOt = { ...projectOt, work_order_code: "OT-P002", maintenance_kind: undefined, maintenance_kind_label: "Proyecto", total_horas: 3, total_costo: 20, total_cantidad: 1 };
const normalOt = { ...projectOt, work_order_code: "OT-N001", maintenance_kind: "CORRECTIVO", total_horas: 100, total_costo: 900, total_cantidad: 30 };
const otherEquipmentOt = { ...normalOt, equipment_label: "MTU | JC - UG09", work_order_code: "OT-N002" };
const mixedRows = [projectOt, secondProjectOt, normalOt, otherEquipmentOt];
const mixedPayload = { reports: Object.fromEntries(["horas_trabajadas", "costo_mantenimiento", "inventario_consumido", "responsables_ot"].map(key => [key, { rows: mixedRows }])) };
// Contrato del servicio: costo_mantenimiento excluye PROYECTO; los consumos
// del proyecto sí vienen en inventario_consumido, con su tipo de OT.
mixedPayload.reports.costo_mantenimiento.rows = [normalOt, otherEquipmentOt];
assert.equal(reports.relationshipGroupForModule("projects"), "OT", "La consulta conserva el tipo de cada orden antes de consolidar por proyecto");
assert.equal(reports.relationshipGroupForModule("equipment"), "EQUIPO");
const projectRelations = reports.buildReportingRelationshipRows("projects", mixedPayload);
assert.equal(projectRelations.length, 1);
assert.deepEqual([projectRelations[0].label, projectRelations[0].workOrders, projectRelations[0].hours, projectRelations[0].maintenanceCost, projectRelations[0].consumedQuantity, projectRelations[0].consumptionValue], [projectName, 2, 8, 0, 3, 60]);
assert.ok(projectRelations[0].sourceRows.every(row => ["OT-P001", "OT-P002"].includes(row.work_order_code)), "El detalle también excluye las OT normales");
const noProjects = reports.buildReportingRelationshipRows("projects", { reports: { horas_trabajadas: { rows: [normalOt, otherEquipmentOt, { equipment_label: "Equipo sin tipo", total_horas: 500 }] } } });
assert.equal(noProjects.length, 0, "Sin OT de proyecto no se muestran equipos ni totales globales como sustituto");
const normalRelations = reports.buildReportingRelationshipRows("work-orders", mixedPayload);
assert.deepEqual(normalRelations.map(row => row.label).sort(), ["OT-N001", "OT-N002"]);
assert.equal(reports.buildReportingRelationshipRows("project-work-orders", mixedPayload).length, 2);
const projectExport = reports.buildReportingModuleReport({ module: reports.getReportingModule("projects"), period: "Noviembre", fileName: "proyectos", events: [], relationships: projectRelations });
assert.equal(projectExport.sheets[1].columns[0].header, "Proyecto");
assert.equal(projectExport.sheets[1].rows[0].consumptionValue, 60);
assert.equal(projectExport.sheets[1].columns.at(-1).key, "consumptionValue");
assert.equal(projectExport.charts.at(-1).points[0].value, 60);
assert.ok(projectExport.charts.every(chart => chart.title.includes("proyecto")));
assert.ok(projectExport.charts.every(chart => chart.points[0].label === projectName));
assert.ok(!JSON.stringify(projectExport).includes("OT-N00"), "La exportación usa exclusivamente las relaciones filtradas");
console.log("PASS: Proyectos excluye OT normales en horas, costos, materiales, detalles y exportación; conserva OT normales y OT Proyecto en sus módulos.");
for (const route of ["dashboard-operativo", "/app/dashboard-supervisores", "reporte-detallado"]) assert.equal(reports.isRetiredReportComponent(route), true);
for (const route of ["dashboard-administracion", "dashboard-gerencia", "reporteria"]) assert.equal(reports.isRetiredReportComponent(route), false);
console.log(`PASS: informe completo y vacío en ${reports.REPORTING_MODULES.length} módulos, todas las filas y totales, equipo separado y rutas de informes retirados.`);

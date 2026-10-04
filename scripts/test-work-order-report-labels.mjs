import assert from "node:assert/strict";
import Module from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import ExcelJS from "exceljs";

const root = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({
  stdin: {
    contents: `
      export * from "@/app/utils/work-order-audit";
      export * from "@/app/utils/work-order-detail";
      export * from "@/app/utils/work-order-report-documents";
      export * from "@/app/utils/project-work-order-documents";
      export * from "@/app/utils/maintenance-intelligence-reports";
      export * from "@/app/utils/canonical-work-order-report";
      export * from "@/app/utils/date-time";
      export * from "@/app/utils/priming-central-filter";
      export * from "@/app/utils/equipment-summary-report";
      export * from "@/app/utils/reporting-relations";
    `,
    resolveDir: root,
  },
  alias: { "@": path.join(root, "src") },
  bundle: true, platform: "node", format: "cjs", write: false,
  packages: "external",
  plugins: [{
    name: "browser-assets",
    setup(plugin) {
      plugin.onResolve({ filter: /\/utils\/pdf-branding$/ }, () => ({ path: "branding", namespace: "fixture" }));
      plugin.onResolve({ filter: /\/http\/api$/ }, () => ({ path: "api", namespace: "fixture" }));
      plugin.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: name }) => ({
        contents: name === "api"
          ? "export const api = { get() { throw new Error('Unexpected API call'); } };"
          : `export const getCompanyLogoAsset = async () => null;
             export const drawPdfCompanyLogo = () => 0;
             export const loadPdfImageAsset = async () => null;
             export const getContainedImageSize = () => ({ width: 0, height: 0 });`,
      }));
    },
  }],
});
const fixtureFilename = path.join(root, "scripts", "report-fixture.cjs");
const fixtureModule = new Module(fixtureFilename);
fixtureModule.filename = fixtureFilename;
fixtureModule.paths = Module._nodeModulePaths(root);
fixtureModule._compile(outputFiles[0].text, fixtureModule.filename);
const reports = fixtureModule.exports;
const uuid = "11111111-1111-4111-8111-111111111111";
assert.equal(reports.formatDateForInput('2026-10-02T00:50:09Z'), '2026-10-01');
assert.equal(reports.formatDateForInput('2026-10-01T20:00:00'), '2026-10-01');
assert.equal(reports.formatDateForInput('2026-10-01'), '2026-10-01');
const history = [
  { to_status: "CLOSED", changed_at: "2026-09-03", changed_by: uuid, changed_by_label: "Maria Lopez" },
  { to_status: "IN_PROGRESS", changed_at: "2026-09-02", changed_by: uuid, changed_by_label: "Luis Torres" },
  { to_status: "PLANNED", changed_at: "2026-09-01", changed_by: uuid, changed_by_label: "Ana Perez" },
];
assert.equal(reports.reportDisplayLabel(uuid, uuid.replaceAll("-", ""), "Filtro"), "Filtro");
assert.deepEqual(reports.resolveWorkOrderReportActors({ created_by: uuid, updated_by: uuid }, history), {
  createdBy: "Ana Perez", processedBy: "Luis Torres", approvedBy: "Maria Lopez", updatedBy: "Maria Lopez",
});
assert.equal(reports.resolveWorkOrderReportActors({}, []).processedBy, "");
assert.equal(reports.resolveWorkOrderReportActors({ valor_json: { created_by_name: "Ana Perez" } }).createdBy, "Ana Perez");

const materialRows = reports.buildMaterialSummary(
  [{ items: [{ producto_id: "product-a", cantidad: 2 }, { producto_id: "product-b", cantidad: 3 }] }],
  [{ items: [{ producto_id: "product-a", cantidad: 1 }] }],
  () => "Filtro de aceite",
);
assert.equal(materialRows.length, 2, "Materiales distintos con el mismo nombre deben conservar sus cantidades");
assert.deepEqual(materialRows.map((row) => [row.delivered, row.scrapped]), [[2, 1], [3, 0]]);

const detailPayload = reports.buildWorkOrderReportPayload({
  header: { code: "OT-01", created_by: uuid, updated_by: uuid },
  history, tasks: [], issues: [], scraps: [], consumptions: [], attachments: [],
}, {
  equipmentLabel: "Generador principal", statusLabel: "Finalizada", maintenanceKindLabel: "Correctivo",
  materialLabel: () => "Filtro de aceite", formatDate: () => "01/09/2026", formatCurrency: String, showCosts: false,
});
assert.equal(detailPayload.processedBy, "Luis Torres");
assert.equal(detailPayload.createdBy, "Ana Perez");

async function assertPdf(blob, expected) {
  const pdf = Buffer.from(await blob.arrayBuffer()).toString("latin1");
  assert.ok(pdf.startsWith("%PDF"));
  assert.ok(!pdf.includes(uuid), "El PDF no debe imprimir UUID como nombre");
  for (const label of expected) assert.ok(pdf.includes(label), `Falta en PDF: ${label}`);
}
async function assertExcel(blob, expected, sheetCount) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  assert.equal(workbook.worksheets.length, sheetCount);
  const values = [];
  for (const sheet of workbook.worksheets) sheet.eachRow((row) => values.push(...row.values));
  const text = values.map((value) => typeof value === "object" ? JSON.stringify(value) : String(value)).join("\n");
  assert.ok(!text.includes(uuid), "El Excel no debe imprimir UUID como nombre");
  for (const label of expected) assert.ok(text.includes(label), `Falta en Excel: ${label}`);
}

await assertPdf(await reports.buildWorkOrderReportPdfBlob(detailPayload), ["Ana Perez", "Luis Torres", "Maria Lopez"]);
await assertPdf(await reports.buildWorkOrderReportPdfBlob({ ...detailPayload, updatedBy: uuid }), ["Sin registro"]);

const project = {
  code: "PR-01", projectName: "Proyecto taller", empresa: "Justice", fecha: "01/09/2026", statusLabel: "Finalizada",
  plantilla: "Proyecto", objetivoGeneral: "Reparar", objetivosEspecificos: [], metodologia: "Inspeccion", alcance: [],
  ubicaciones: ["Taller principal"], bodegas: ["Bodega matriz"], personal: [],
  materiales: [{ descripcion: "Filtro de aceite", cantidad: 2, unidad: "", marca: "Nuevo" }], mostrarCostos: false,
  createdBy: "Ana Perez", processedBy: "Luis Torres", updatedBy: "Maria Lopez",
};
const expected = ["Ana Perez", "Luis Torres", "Maria Lopez", "Filtro de aceite", "Bodega matriz"];
await assertPdf(await reports.buildProjectWorkOrdersPdfBlob([project]), expected);
await assertExcel(await reports.buildProjectWorkOrdersExcelBlob([project]), expected, 1);
await assertPdf(await reports.buildProjectWorkOrdersPdfBlob([project, { ...project, code: "PR-02" }]), expected);
await assertExcel(await reports.buildProjectWorkOrdersExcelBlob([project, { ...project, code: "PR-02" }]), expected, 2);
await assertExcel(await reports.buildProjectWorkOrdersExcelBlob([{ ...project, updatedBy: uuid }]), ["Sin registro"], 1);

const order = {
  header: { codigo: "OT-01", titulo: "Reparacion", estado: "Finalizada", equipo: "Generador principal",
    creado_por: "Ana Perez", realizado_por: "Luis Torres", aprobado_por: "Maria Lopez" },
  tasks: [], attachments: [], consumos: [],
  issues: [{ material: "Filtro de aceite", bodega: "Bodega matriz", cantidad: 2 }], scraps: [], history: [],
};
const listing = reports.buildWorkOrdersListingReport({ orders: [order] });
await assertPdf(await reports.buildReportPdfBlob(listing), expected);
await assertExcel(await reports.buildReportExcelBlob(listing), expected, 2);
console.log("PASS: auditoria, materiales, PDF y Excel individuales y consolidados de OT/OT Proyecto");

const canonicalDetail = {
  header: { code: "OT-CEBADO", title: "Cebado de unidad", maintenance_kind: "CEBADO", status_workflow: "CLOSED", equipment_nombre: "JC - UG21", equipment_brand_name: "CATERPILLAR", equipment_modelo: "3512 B", equipment_location_label: "CPT", horometro_anterior: 23000, horometro_actual: 23078 },
  tasks: [{ tarea_nombre: "Colocar aceite", responsables: [{ display_name: "Ana Perez", horas: 2, costo_hora: 5 }] }],
  consumptions: [{ producto_id: "oil", bodega_id: "cpt", producto_label: "Aceite Gulf", bodega_label: "CPT", cantidad: 3, costo_unitario: 4 }],
  issues: [], scraps: [], history: [], attachments: [],
};
const canonical = reports.buildCanonicalWorkOrderReport(canonicalDetail, true);
const info = canonical.sheets[0].section.info;
assert.equal(info.find(row => row.label === "Costo total").value.includes("22"), true);
assert.ok(!info.some(row => ["Costo materiales", "Mano de obra", "Personal contratado"].includes(row.label)));
assert.deepEqual(canonical.sheets[0].columns.slice(-3).map(column => column.header), ["Cantidad de horas", "Costo por hora", "Costo total"]);
assert.equal(canonical.sheets[0].rows[0].costo_hora, 5);
assert.equal(canonical.sheets[0].rows[0].costo_total, 10);
const consumptionSheet = canonical.sheets.find(sheet => sheet.name === "Consumos");
assert.equal(consumptionSheet.rows[0].subtotal, 12);
const canonicalPdf = await reports.buildReportPdfBlob(canonical);
if (process.env.REPORT_OUTPUT_DIR) {
  await mkdir(process.env.REPORT_OUTPUT_DIR, { recursive: true });
  await writeFile(path.join(process.env.REPORT_OUTPUT_DIR, "informe_ot_verificacion.pdf"), Buffer.from(await canonicalPdf.arrayBuffer()));
  await writeFile(path.join(process.env.REPORT_OUTPUT_DIR, "informe_ot_verificacion.xlsx"), Buffer.from(await (await reports.buildReportExcelBlob(canonical)).arrayBuffer()));
}
await assertPdf(canonicalPdf, ["UG21", "CPT", "Costo total", "Costo", "por", "hora", "Aceite Gulf"]);
await assertExcel(await reports.buildReportExcelBlob(canonical), ["UG21", "CPT", "Costo total", "Cantidad de horas", "Costo por hora", "Aceite Gulf"], 1);
const withoutCosts = reports.buildCanonicalWorkOrderReport(canonicalDetail, false);
assert.ok(!withoutCosts.sheets[0].section.info.some(row => row.label === "Costo total"));
assert.ok(!withoutCosts.sheets[0].columns.some(row => row.key === "costo_hora"));
assert.ok(!withoutCosts.sheets[0].columns.some(row => row.key === "costo_total"));
assert.ok(!withoutCosts.sheets[0].rows.some(row => Object.hasOwn(row, "costo_hora") || Object.hasOwn(row, "costo_total")));
const projectCanonical = reports.buildCanonicalWorkOrderReport({ ...canonicalDetail, header: { ...canonicalDetail.header, maintenance_kind: "PROYECTO" } }, true);
assert.ok(!projectCanonical.sheets[0].section.info.some(row => /Horómetro/.test(row.label)));
const projectDetail = { ...canonicalDetail, header: { ...canonicalDetail.header, maintenance_kind: "PROYECTO", valor_json: { proyecto: { empresa: "Justice", objetivo_general: "Instalar tuberías", metodologia: "Montaje" } }, proyecto_personal: [{ rol: "Soldador", nombre: "Luis", dias_laborados: 2, valor_dia: 30 }] } };
const projectReport = reports.buildCanonicalWorkOrderReport(projectDetail, true);
assert.ok(projectReport.sheets[0].section.info.some(row => row.value === "Instalar tuberías"));
assert.equal(projectReport.sheets.find(row => row.name === "Personal contratado").rows[0].subtotal, 60);
assert.ok(projectReport.sheets[0].section.info.find(row => row.label === "Costo total").value.includes("82"));
assert.ok(!projectReport.sheets[0].section.info.some(row => ["Costo materiales", "Mano de obra", "Personal contratado"].includes(row.label)));
const fractionalTaskReport = reports.buildCanonicalWorkOrderReport({ ...canonicalDetail, tasks: [{ tarea_nombre: "Cebar motor", responsables: [{ display_name: "Ana Perez", horas: 0.25, costo_hora: 3.75 }] }] }, true);
assert.equal(fractionalTaskReport.sheets[0].rows[0].horas, 0.25);
assert.equal(fractionalTaskReport.sheets[0].rows[0].costo_hora, 3.75);
assert.equal(fractionalTaskReport.sheets[0].rows[0].costo_total, 0.9375);
await assertPdf(await reports.buildReportPdfBlob(fractionalTaskReport), ["Cantidad", "horas", "por", "hora", ...[3.75, 0.94].map(value => new Intl.NumberFormat("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value))]);
const secondCanonical = reports.buildCanonicalWorkOrderReport({ ...canonicalDetail, header: { ...canonicalDetail.header, code: "OT-CEBADO-2" } }, true);
const consolidated = reports.consolidateCanonicalWorkOrderReports([canonical, secondCanonical], { title: "Consolidado", subtitle: "CPT", fileName: "consolidado" });
assert.equal(consolidated.sheets[0], canonical.sheets[0], "La OT consolidada conserva el mismo informe individual");
assert.equal(consolidated.sheets[canonical.sheets.length], secondCanonical.sheets[0]);
await assertPdf(await reports.buildReportPdfBlob(consolidated), ["OT-CEBADO-2", "Costo total", "por", "hora", "UG21", "CPT"]);
await assertExcel(await reports.buildReportExcelBlob(consolidated), ["OT-CEBADO-2", "Costo total", "Cantidad de horas", "Costo por hora"], 2);
console.log("PASS: informe único OT, costos conciliados, UG/central, permisos y proyecto sin horómetro");
const tasksWithInactiveResponsibles = [
  { tarea_nombre: "Actividad con horas", responsables: [
    { display_name: "Persona activa", horas: "0.25", costo_hora: 4 },
    { display_name: "Persona inactiva", horas: 0, costo_hora: 99 },
  ] },
  { tarea_nombre: "Actividad sin horas", observacion: "Pendiente de registro", responsables: [
    { display_name: "Persona activa", horas: "0" },
    { display_name: "Persona inactiva", horas: null },
    { display_name: "Persona sin registro" },
  ] },
  { tarea_nombre: "Actividad sin asignacion", responsables: [] },
];
const originalTasks = JSON.stringify(tasksWithInactiveResponsibles);
for (const maintenanceKind of ["CORRECTIVO", "PROYECTO"]) {
  for (const showCosts of [false, true]) {
    const filteredReport = reports.buildCanonicalWorkOrderReport({ ...canonicalDetail,
      header: { ...canonicalDetail.header, maintenance_kind: maintenanceKind },
      tasks: tasksWithInactiveResponsibles,
    }, showCosts);
    assert.deepEqual(filteredReport.sheets[0].rows.map(row => [row.tarea, row.responsable, row.horas]), [
      ["Actividad con horas", "Persona activa", 0.25],
      ["Actividad sin horas", "Sin responsables", 0],
      ["Actividad sin asignacion", "Sin responsables", 0],
    ]);
    assert.equal(filteredReport.sheets[0].rows[1].observacion, "Pendiente de registro");
    if (showCosts) assert.equal(filteredReport.sheets[0].rows[0].costo_total, 1);
    const pdf = await reports.buildReportPdfBlob(filteredReport);
    await assertPdf(pdf, ["Persona activa", "Actividad sin horas", "Actividad sin asignacion", "Sin responsables"]);
    const pdfText = Buffer.from(await pdf.arrayBuffer()).toString("latin1");
    assert.ok(!pdfText.includes("Persona inactiva"));
    assert.ok(!pdfText.includes("Persona sin registro"));
  }
}
const noHoursReport = reports.buildCanonicalWorkOrderReport({ ...canonicalDetail,
  tasks: tasksWithInactiveResponsibles.slice(1),
}, true);
assert.equal(noHoursReport.sheets[0].rows.length, 2);
assert.ok(noHoursReport.sheets[0].rows.every(row => row.responsable === "Sin responsables" && row.horas === 0 && row.costo_total === 0));
const noHoursPdf = await reports.buildReportPdfBlob(noHoursReport);
await assertPdf(noHoursPdf, ["Actividad sin horas", "Actividad sin asignacion", "Sin responsables"]);
assert.ok(!Buffer.from(await noHoursPdf.arrayBuffer()).toString("latin1").includes("Persona activa"));
assert.equal(JSON.stringify(tasksWithInactiveResponsibles), originalTasks, "La exportacion no modifica las asignaciones de la OT");
if (process.env.REPORT_OUTPUT_DIR) {
  const mixedReport = reports.buildCanonicalWorkOrderReport({ ...canonicalDetail, tasks: tasksWithInactiveResponsibles }, true);
  await writeFile(path.join(process.env.REPORT_OUTPUT_DIR, "ot_responsables_con_horas.pdf"), Buffer.from(await (await reports.buildReportPdfBlob(mixedReport)).arrayBuffer()));
  await writeFile(path.join(process.env.REPORT_OUTPUT_DIR, "ot_actividades_sin_horas.pdf"), Buffer.from(await noHoursPdf.arrayBuffer()));
}
console.log("PASS: responsables solo con horas por actividad, actividades sin horas conservadas y asignaciones intactas");
const locations = [{ codigo: "UBI-A00003", nombre: "CENTRAL CPT" }, { codigo: "UBI-A00004", nombre: "CENTRAL TPTA" }];
const tptaOnly = [{ central: "UBI-A00004 - CENTRAL TPTA", galones_periodo: 2 }];
assert.deepEqual(reports.buildPrimingCentralOptions(locations, tptaOnly), ["UBI-A00003 - CENTRAL CPT", "UBI-A00004 - CENTRAL TPTA"]);
assert.deepEqual(reports.buildPrimingCentralOptions(locations, []), ["UBI-A00003 - CENTRAL CPT", "UBI-A00004 - CENTRAL TPTA"]);
assert.deepEqual(reports.filterPrimingRows(tptaOnly, "UBI-A00003 - CENTRAL CPT"), []);
assert.deepEqual(reports.filterPrimingRows(tptaOnly, null), tptaOnly);
const bothCentrals = [...tptaOnly, { central: "UBI-A00003 - CENTRAL CPT", galones_periodo: 5 }];
assert.equal(reports.filterPrimingRows(bothCentrals, "UBI-A00003 - CENTRAL CPT")[0].galones_periodo, 5);
assert.deepEqual(reports.buildPrimingCentralOptions([locations[1]], tptaOnly), ["UBI-A00004 - CENTRAL TPTA"], "Respeta el catálogo del ámbito recibido");
assert.deepEqual(reports.filterPrimingRows([{ central: "" }], "Sin ubicación"), [{ central: "" }]);
console.log("PASS: CPT disponible sin consumo, cambio de período, filtro por central y catálogo del ámbito recibido");

const ssaDetail = { ...canonicalDetail, header: { ...canonicalDetail.header, code: "OT-SSA", title: "Mantenimiento SSA", maintenance_kind: "SSA", procedimiento_nombre: "Plantilla SSA" } };
const ssaReport = reports.buildCanonicalWorkOrderReport(ssaDetail, true);
await assertPdf(await reports.buildReportPdfBlob(ssaReport), ["OT-SSA", "SSA", "Plantilla SSA", "UG21", "CPT", "Costo total"]);
await assertExcel(await reports.buildReportExcelBlob(ssaReport), ["OT-SSA", "SSA", "Plantilla SSA", "Costo total"], 1);
const ssaConsolidated = reports.consolidateCanonicalWorkOrderReports([canonical, ssaReport], { title: "Consolidado SSA", fileName: "consolidado_ssa" });
await assertPdf(await reports.buildReportPdfBlob(ssaConsolidated), ["OT-CEBADO", "OT-SSA", "Plantilla SSA"]);
await assertExcel(await reports.buildReportExcelBlob(ssaConsolidated), ["OT-CEBADO", "OT-SSA", "SSA"], 2);
const ssaWithoutCosts = reports.buildCanonicalWorkOrderReport(ssaDetail, false);
assert.ok(!ssaWithoutCosts.sheets[0].section.info.some(row => row.label === "Costo total"));
assert.ok(!ssaWithoutCosts.sheets.some(sheet => sheet.columns.some(column => /costo|subtotal/.test(column.key))));
console.log("PASS: SSA en PDF y Excel individual/consolidado, plantilla, UG/central y permisos de costos");

const ssaTemplates = reports.buildProceduresReport([{
  codigo: "PMP-SSA", nombre: "Plantilla SSA", tipo_proceso: "SSA", clase_mantenimiento: "SSA",
  actividades: [{ orden: 1, actividad: "Verificar condiciones de seguridad", requiere_permiso: true, requiere_epp: true, requiere_bloqueo: true, requiere_evidencia: true }],
}]);
assert.equal(ssaTemplates.sheets[0].rows[0].tipo_proceso, "SSA");
assert.equal(ssaTemplates.sheets[1].rows[0].requiere_bloqueo, true);
await assertPdf(await reports.buildReportPdfBlob(ssaTemplates), ["SSA", "Plantilla SSA", "Verificar condiciones de seguridad"]);
await assertExcel(await reports.buildReportExcelBlob(ssaTemplates), ["SSA", "Plantilla SSA", "Verificar condiciones de seguridad"], 2);
if (process.env.REPORT_OUTPUT_DIR) {
  for (const [name, report] of [["ot_ssa", ssaReport], ["plantilla_ssa", ssaTemplates]]) {
    await writeFile(path.join(process.env.REPORT_OUTPUT_DIR, `${name}.pdf`), Buffer.from(await (await reports.buildReportPdfBlob(report)).arrayBuffer()));
    await writeFile(path.join(process.env.REPORT_OUTPUT_DIR, `${name}.xlsx`), Buffer.from(await (await reports.buildReportExcelBlob(report)).arrayBuffer()));
  }
}
console.log("PASS: exportacion PDF/Excel de plantillas SSA y controles del checklist");

const equipmentLabel = "MTU | JC - UG07 · UBI-A00004 - CENTRAL TPTA";
const equipmentSource = { equipment_label: equipmentLabel, total_horas: 7, total_ordenes: 1,
  bodegas: "BOD-002 - TPTA", detalle_ordenes: [{ equipment_id: "ug07", work_order_id: "ot-ug07", work_order_code: "OT-UG07" }] };
const equipmentRelationships = reports.buildReportingRelationshipRows("generation-units", {
  reports: { horas_trabajadas: { rows: [equipmentSource] },
    costo_mantenimiento: { rows: [{ ...equipmentSource, total_costo: 1623.4 }] } },
});
const equipmentSummary = reports.buildEquipmentSummaryRows(equipmentRelationships, [
  { id: "ug07", nombre: "JC - UG07", location_nombre: "CENTRAL CPT" },
]);
assert.equal(equipmentSummary[0].central, "CENTRAL CPT", "Resuelve por el ID del equipo de la OT, sin confundirlo con el ID de la OT ni la bodega");
assert.equal(equipmentSummary[0].label, equipmentLabel);
assert.equal(equipmentSummary[0].workOrders, 1);
assert.equal(equipmentSummary[0].hours, 7);
assert.equal(equipmentSummary[0].maintenanceCost, 1623.4);
assert.equal(reports.buildEquipmentSummaryRows(equipmentRelationships, [])[0].central, "CENTRAL TPTA", "Recupera ubicación de etiquetas históricas cuando falta el catálogo");
const withoutLocation = { ...equipmentRelationships[0], label: "Generador sin ubicación", entityId: "", sourceRows: [] };
assert.equal(reports.buildEquipmentSummaryRows([withoutLocation], [])[0].central, "Sin ubicación");
assert.equal(reports.buildEquipmentSummaryRows([{ ...withoutLocation, sourceRows: [{ location_label: uuid }] }], [])[0].central, "Sin ubicación", "No imprime UUID como central");
assert.equal(reports.buildEquipmentSummaryRows([{ ...withoutLocation, sourceRows: [{ central: "UBI-A00003 - CENTRAL CPT" }] }], [])[0].central, "CENTRAL CPT");
const sameName = reports.buildEquipmentSummaryRows([
  { ...withoutLocation, sourceRows: [{ equipment_id: "first" }] },
  { ...withoutLocation, sourceRows: [{ equipment_id: "second" }] },
], [{ id: "first", nombre: "Generador", location_nombre: "CENTRAL CPT" },
  { id: "second", nombre: "Generador", location_nombre: "CENTRAL TPTA" }]);
assert.deepEqual(sameName.map(row => row.central), ["CENTRAL CPT", "CENTRAL TPTA"]);
for (const moduleKey of ["generation-units", "equipment"]) {
  const summaryReport = { title: "Consolidado de equipos", fileName: `reporteria-${moduleKey}`, compactPdf: true,
    sheets: [{ name: "Detalle", rows: reports.equipmentSummaryExportRows(equipmentSummary), columns: reports.EQUIPMENT_SUMMARY_COLUMNS, fitColumnsToPage: true }] };
  await assertPdf(await reports.buildReportPdfBlob(summaryReport), ["CENTRAL CPT", "JC - UG07", "central"]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await (await reports.buildReportExcelBlob(summaryReport)).arrayBuffer());
  const worksheet = workbook.worksheets[0];
  const headerRow = worksheet.getRows(1, worksheet.rowCount).find(row => row.getCell(2).value === "Ubicación o central");
  assert.ok(headerRow);
  assert.deepEqual(headerRow.values.slice(1), ["Equipo", "Ubicación o central", "OT", "Horas", "Costo"]);
  const dataRow = worksheet.getRow(headerRow.number + 1);
  assert.deepEqual(dataRow.values.slice(1), [equipmentLabel, "CENTRAL CPT", 1, 7, 1623.4]);
}
console.log("PASS: ubicación por equipo en PDF/Excel de UG y equipos, identidad, históricos, UUID y totales conservados");

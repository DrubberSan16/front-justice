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
      export * from "@/app/utils/oil-consumption-report";
      export * from "@/app/utils/work-order-detail";
      export * from "@/app/utils/work-order-report-documents";
      export * from "@/app/utils/project-work-order-documents";
      export * from "@/app/utils/maintenance-intelligence-reports";
      export * from "@/app/utils/canonical-work-order-report";
      export * from "@/app/utils/date-time";
      export * from "@/app/utils/priming-central-filter";
      export * from "@/app/utils/equipment-summary-report";
      export * from "@/app/utils/reporting-relations";
      export * from "@/app/utils/work-order-hours";
      export * from "@/app/utils/oil-control-summary";
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
const sample = {
  equipment_name: "JC - UG07", equipment_brand_name: "CUMMINS",
  equipment_id: "11111111-1111-4111-8111-111111111111",
  central: "CPT - Central Portoviejo", fecha_referencia: "2026-10-02T00:50:09Z",
  fecha_programada: "2026-10-01", work_order_code: "OT-A00305",
  maintenance_kind: "PREVENTIVO", horometro_inicial: 0, horometro_final: 120,
  cantidad: 2.5, subtotal: 31.25,
};
const output = path.join(root, "tmp", "oil-report-validation");
await mkdir(output, { recursive: true });
{
  const priming = { ...sample, maintenance_kind: 'CEBADO', work_order_id: 'ot-priming', horas_trabajadas: 1.5, es_reserva: true };
  const zero = { ...sample, work_order_id: 'ot-zero', cantidad: 0, subtotal: 0 };
  const summary = reports.buildOilControlSummary([priming, zero], [{ id: sample.equipment_id, nombre: sample.equipment_name }], '2026-10-16');
  assert.equal(summary.work_orders.length, 2, 'Incluye OT sin aceite');
  assert.equal(summary.totals.total_cantidad, 2.5);
  assert.equal(summary.totals.total_costo, 31.25);
  assert.equal(summary.by_equipment[0].total_ordenes, 2);
  assert.equal(summary.priming[0].galones_periodo, summary.totals.total_cantidad);
  const onlyPriming = reports.buildOilOrderReport({ rows: [priming], mode: 'management', subtitle: '', fileName: 'cebado', showCosts: true });
  assert.ok(!onlyPriming.sheets[0].columns.some(column => /horometro/.test(column.key)));
  assert.equal(onlyPriming.sheets[0].rows[0].horas_trabajadas, '01:30:00');
  assert.equal(onlyPriming.sheets[0].rows[0].reserva, 'En reserva');
  const mixed = reports.buildOilOrderReport({ rows: [priming, zero], mode: 'management', subtitle: '', fileName: 'mixed', showCosts: true });
  assert.equal(mixed.sheets[0].rows[0].horometro_inicial, '');
  assert.equal(mixed.sheets[0].rows[1].horometro_final, 120, 'Los demás tipos conservan sus lecturas');
  const history = [
    { changed_at: '2026-10-01T09:00:00-05:00', from_status: 'IN_PROGRESS', to_status: 'REVIEW' },
    { changed_at: '2026-10-01T11:00:00-05:00', from_status: 'REVIEW', to_status: 'IN_PROGRESS' },
  ];
  const header = { code: 'OT-CEBADO', maintenance_kind: 'CEBADO', started_at: '2026-10-01T08:00:00-05:00', closed_at: '2026-10-01T12:00:00-05:00' };
  assert.equal(reports.workOrderWorkedHours(header, history), 2);
  const report = reports.buildCanonicalWorkOrderReport({ header, history, tasks: [], consumptions: [], issues: [], scraps: [], attachments: [] }, true);
  const info = report.sheets[0].section.info;
  assert.ok(info.some(row => row.label === 'Horas trabajadas (hh:mm:ss)' && row.value === '02:00:00'));
  assert.ok(!info.some(row => /Horómetro (inicial|final)/.test(row.label)));
}
for (const mode of ["control", "management"]) {
  const report = reports.buildOilOrderReport({ rows: [sample], mode,
    subtitle: "01/10/2026 a 13/10/2026", fileName: mode, showCosts: true });
  const sheet = report.sheets[0];
  assert.equal(sheet.columns.length, mode === "control" ? 7 : 10);
  assert.equal(sheet.rows[0].fecha, "01-10-2026", "Respeta America/Guayaquil");
  assert.equal(sheet.rows[0].tipo, "Mantenimiento MPG");
  assert.equal(sheet.rows[0].equipo, mode === "control" ? "UG07" : "UG07 - CUMMINS");
  if (mode === "management") assert.equal(sheet.rows[0].horometro_inicial, 0);
  assert.equal(sheet.rows[0].costo, 31.25);
  assert.ok(!JSON.stringify(sheet.rows).includes(sample.equipment_id));
  const excel = await reports.buildReportExcelBlob(report);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await excel.arrayBuffer());
  const cells = [];
  workbook.worksheets[0].eachRow(row => cells.push(...row.values));
  assert.ok(cells.includes(2.5));
  assert.ok(cells.includes(31.25));
  assert.ok(cells.includes(mode === "control" ? "UG07" : "UG07 - CUMMINS"));
  const pdf = await reports.buildReportPdfBlob(report);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.ok(bytes.toString("latin1").startsWith("%PDF"));
  assert.ok(bytes.toString("latin1").includes("UG07"));
  await writeFile(path.join(output, `${mode}.pdf`), bytes);
  await writeFile(path.join(output, `${mode}.xlsx`), Buffer.from(await excel.arrayBuffer()));
  const hidden = reports.buildOilOrderReport({ rows: [sample], mode, subtitle: "", fileName: mode, showCosts: false });
  assert.ok(!hidden.sheets[0].columns.some(column => column.key === "costo"));
  assert.ok(!("costo" in hidden.sheets[0].rows[0]));
  const missing = reports.buildOilOrderReport({ rows: [{ equipment_name: "UG01" }], mode, subtitle: "", fileName: mode, showCosts: true });
  assert.equal(missing.sheets[0].rows[0].fecha, "");
  if (mode === "management") {
    assert.equal(missing.sheets[0].rows[0].equipo, "UG01 - Sin marca");
    assert.equal(missing.sheets[0].rows[0].horometro_inicial, "");
  }
}
console.log("Oil reports: unified totals, reserve, priming hours without review, local dates, names, Excel/PDF and cost permissions passed.");

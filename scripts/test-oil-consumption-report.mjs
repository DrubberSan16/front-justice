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
for (const mode of ["control", "management"]) {
  const report = reports.buildOilOrderReport({ rows: [sample], mode,
    subtitle: "01/10/2026 a 13/10/2026", fileName: mode, showCosts: true });
  const sheet = report.sheets[0];
  assert.equal(sheet.columns.length, mode === "control" ? 7 : 9);
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
console.log("Oil reports: 7/9 columns, local dates, brand names, missing readings, numeric Excel, cost permissions and PDF passed.");

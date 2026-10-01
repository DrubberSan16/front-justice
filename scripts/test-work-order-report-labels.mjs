import assert from "node:assert/strict";
import Module from "node:module";
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

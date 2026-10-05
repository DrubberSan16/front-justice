import assert from "node:assert/strict";
import Module from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import ExcelJS from "exceljs";

const root = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({
  stdin: { contents: 'export * from "@/app/config/user-manual"; export * from "@/app/utils/user-manual-documents"; export { buildReportExcelBlob } from "@/app/utils/maintenance-intelligence-reports";', resolveDir: root },
  alias: { "@": path.join(root, "src") }, bundle: true, platform: "node", format: "cjs",
  write: false, packages: "external",
  plugins: [{ name: "branding-fixture", setup(plugin) {
    plugin.onResolve({ filter: /\/utils\/pdf-branding$/ }, () => ({ path: "branding", namespace: "fixture" }));
    plugin.onResolve({ filter: /\/http\/api$/ }, () => ({ path: "api", namespace: "fixture" }));
    plugin.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: name }) => ({ contents: name === "api"
      ? 'export const api = {get() {throw new Error("Unexpected API call");}};'
      : 'export const getCompanyLogoAsset = async () => null; export const drawPdfCompanyLogo = () => 0; export const loadPdfImageAsset = async () => null; export const getContainedImageSize = () => ({width:0,height:0});' }));
  } }],
});
const fixture = new Module(path.join(root, "scripts", "manual-fixture.cjs"));
fixture.filename = path.join(root, "scripts", "manual-fixture.cjs");
fixture.paths = Module._nodeModulePaths(root);
fixture._compile(outputFiles[0].text, fixture.filename);
const docs = fixture.exports;
const routerSource = await readFile(path.join(root, "src/app/router/index.ts"), "utf8");
const activeRouterSource = routerSource.split("\n").filter(line => !line.trim().startsWith("//")).join("\n");
const routes = [...new Set([...activeRouterSource.matchAll(/name:\s*"([^"]+)"/g)].map(match => match[1]))];
const manuals = routes.filter(route => !docs.MANUAL_ROUTE_EXCLUSIONS.has(route))
  .map(route => docs.getOperativeUserManualDefinition(route));
for (const manual of manuals) {
  assert.ok(manual.flow.length >= 2, `Flujo incompleto: ${manual.routeName}`);
  assert.equal(new Set(manual.flow.map(step => step.id)).size, manual.flow.length);
  for (const step of manual.flow) {
    assert.ok(step.profiles?.length && !step.profiles.includes("Usuario con permisos en el módulo"), `Perfil sin definir: ${manual.routeName}`);
    for (const key of ["moduleRoute", "moduleLabel", "requirement", "outcome"]) assert.ok(step[key], `${manual.routeName}: ${key}`);
    assert.ok(routes.includes(step.moduleRoute), `Destino inexistente: ${step.moduleRoute}`);
  }
  assert.equal(manual.checklist.length, manual.flow.length);
  assert.ok(!/super[\s_]*admin/i.test(JSON.stringify(manual)), "El manual menciona un perfil excluido");
}
const ot = docs.getOperativeUserManualDefinition("work-orders");
const project = docs.getOperativeUserManualDefinition("work-orders-proyecto");
for (const manual of [ot, project]) {
  const delivery = manual.flow.findIndex(step => /registrar la salida|Entregar materiales/.test(step.title));
  const printing = manual.flow.findIndex(step => /Confirmar.*egreso/.test(step.title));
  const execution = manual.flow.findIndex(step => /Ejecutar/.test(step.title));
  assert.ok(delivery >= 0 && delivery < printing && printing < execution, "La entrega e impresión deben preceder a la ejecución");
  assert.ok(manual.flow[printing].profiles.includes("Bodega"));
}
assert.ok(ot.flow.some(step => step.moduleRoute === "programaciones" && /fecha/.test(step.description)));
assert.match(JSON.stringify(project.flow), /objetivo general/);
assert.match(JSON.stringify(project.flow), /metodología/);
assert.match(JSON.stringify(project.flow), /no exige la programación/);
assert.match(JSON.stringify(docs.getOperativeUserManualDefinition("ordenes-compra").flow), /todavía no genera Kardex/);
assert.match(JSON.stringify(docs.getOperativeUserManualDefinition("ordenes-servicio").flow), /Es servicio/);
assert.match(JSON.stringify(docs.getOperativeUserManualDefinition("transferencias-bodega").flow), /sucursal de destino/);
assert.match(JSON.stringify(docs.getOperativeUserManualDefinition("inteligencia-analisis-lubricante").flow), /errores de importación/);
const context = { manuals, userLabel: "Usuario de prueba", roleLabel: "Súper Administrador", generatedAt: new Date("2026-10-05T15:00:00Z") };
const excel = docs.buildUserManualExcelReport(context);
assert.ok(!/super[\s_]*admin/i.test(JSON.stringify(excel)));
assert.ok(!/super/.test(docs.userManualFileName(context.roleLabel)));
const rows = excel.sheets.find(sheet => sheet.name === "Ruta de trabajo").rows;
assert.equal(rows.length, manuals.reduce((total, manual) => total + manual.flow.length, 0));
for (const row of rows) for (const key of ["perfiles_que_intervienen", "modulo_donde_se_realiza", "requisito_para_empezar", "resultado_para_continuar"]) assert.ok(row[key]);
for (const label of ["Súper Administrador", "SUPER_ADMIN", "superadministrador", "SUPER ADMINISTRADOR"]) assert.equal(docs.userManualProfileLabel(label), "Usuario");
const workbookBlob = await docs.buildReportExcelBlob(excel);
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(await workbookBlob.arrayBuffer());
const workbookValues = [];
for (const sheet of workbook.worksheets) sheet.eachRow(row => workbookValues.push(...row.values));
const workbookText = workbookValues.map(value => typeof value === "object" ? JSON.stringify(value) : String(value)).join("\n");
assert.match(workbookText, /Supervisor/);
assert.match(workbookText, /Programaciones/);
assert.match(workbookText, /Confirmar e imprimir el egreso/);
assert.ok(!/super[\s_]*admin/i.test(workbookText));
const pdf = await docs.buildUserManualPdfBlob({ ...context, manuals: [ot, project, docs.getOperativeUserManualDefinition("transferencias-bodega")] });
const buffer = Buffer.from(await pdf.arrayBuffer());
assert.ok(buffer.toString("latin1").startsWith("%PDF"));
assert.ok(!/super.*admin/i.test(buffer.toString("latin1")));
const output = path.join(root, "..", "outputs", "20261005-manual-flujos");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "manual-flujos.pdf"), buffer);
await writeFile(path.join(output, "manual-flujos.xlsx"), Buffer.from(await workbookBlob.arrayBuffer()));
await writeFile(path.join(output, "cobertura.json"), JSON.stringify({ modules: manuals.length, steps: rows.length, routes: manuals.map(manual => manual.routeName) }, null, 2));
console.log(`PASS: ${manuals.length} módulos, ${rows.length} pasos, secuencia OT/Proyecto y exportaciones PDF/Excel`);

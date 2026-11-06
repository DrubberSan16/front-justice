import assert from "node:assert/strict";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({ stdin: { contents: 'export * from "@/app/utils/purchase-report";', resolveDir: root }, alias: { "@": path.join(root, "src") }, bundle: true, platform: "node", format: "cjs", write: false, packages: "external" });
const fixture = new Module(path.join(root, "scripts/purchase-report-fixture.cjs"));
fixture.filename = path.join(root, "scripts/purchase-report-fixture.cjs");
fixture.paths = Module._nodeModulePaths(root);
fixture._compile(outputFiles[0].text, fixture.filename);
const { purchaseLines, purchaseTotals, groupPurchaseLines, buildPurchaseReport } = fixture.exports;
const mixed = { id: "oc1", codigo: "OC-001", fecha_emision: "2026-11-06", estado: "EMITIDA", total: "9999", detalles: [
  { id: "a", categoria_id: "spares", categoria_nombre: "Repuestos", nombre_producto: "Filtro", descripcion_producto: "Motor", cantidad: "2.5", costo_unitario: "10", subtotal: "20", iva_total: "3", total: "23" },
  { id: "b", categoria_id: "oil", categoria_nombre: "Aceites", nombre_producto: "Aceite", cantidad: "1", costo_unitario: "100", subtotal: "100", iva_total: "15", total: "115" },
  { id: "deleted", is_deleted: true, total: "1000" },
] };
const orders = [mixed, mixed, { id: "oc2", codigo: "OC-002", estado: "EMITIDA", detalles: [{ id: "c", categoria_id: "spares", categoria_nombre: "Repuestos", nombre_producto: "Perno", cantidad: "1", costo_unitario: "2.675", subtotal: "2.675", iva_total: "0.4013", total: "3.0763" }] }, { id: "void", estado: "ANULADA", total: "10000" }];
const lines = purchaseLines(orders);
assert.equal(lines.length, 3, "No repite cabeceras ni incluye órdenes anuladas o líneas borradas");
assert.equal(lines[0].material, "Filtro (Motor)", "En OC se presenta material sin código");
assert.equal(lines[0].subtotal, 20, "Usa neto registrado después de descuento, no cantidad por precio bruto");
assert.deepEqual(purchaseTotals(lines), { subtotal: 122.675, tax: 18.4013, total: 141.0763 });
const categories = groupPurchaseLines(lines, "categoryId");
assert.equal(categories.length, 2);
assert.equal(categories[0].orders, 2, "Cuenta órdenes distintas dentro de la categoría");
const spares = lines.filter(line => line.categoryId === "spares");
assert.equal(purchaseTotals(spares).total, 26.0763, "Filtrar repuestos no arrastra total cabecera de la orden mixta");
assert.equal(groupPurchaseLines(spares, "orderId")[0].total, 23);
const report = buildPurchaseReport(spares, "noviembre", "Compras", "Repuestos");
assert.match(report.subtitle, /Repuestos/);
assert.equal(report.sheets.length, 3);
for (const sheet of report.sheets) {
  const total = sheet.rows.at(-1);
  assert.equal(total.total, 26.0763, `${sheet.name} conserva el total filtrado`);
  assert.equal(sheet.rowKinds.at(-1), "total");
  assert.ok(sheet.columns.every(column => column.width > 0));
  assert.equal(sheet.columns.find(column => column.key === "total").format, "currency");
}
assert.equal(buildPurchaseReport(spares.filter(line => line.orderId === "oc1"), "noviembre").sheets[2].rows.length, 2, "Impresión individual contiene solo las líneas de esa orden más el total");
const missing = purchaseLines([{ id: "legacy", estado: "EMITIDA", subtotal: "10", iva_total: "1.5", total: "11.5" }]);
assert.equal(missing[0].missingDetail, true);
assert.equal(missing[0].category, "Sin detalle disponible");
assert.equal(purchaseTotals(missing).total, 11.5, "Cabecera sin detalle aparece una sola vez y sin categoría inventada");
assert.equal(purchaseLines([{ id: "zero", total: 0, subtotal: 10 }])[0].total, 0, "No sustituye cero registrado por valor calculado");
assert.deepEqual(purchaseTotals(purchaseLines([])), { subtotal: 0, tax: 0, total: 0 });
console.log("OK compras: categorías, órdenes mixtas, descuentos, IVA, precisión, anulaciones, sin detalle e impresión individual.");

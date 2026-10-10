import assert from "node:assert/strict";
import Module from "node:module";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({
  stdin: { contents: 'export * from "@/app/utils/warehouse-reception"; export * from "@/app/utils/warehouse-transfer-documents";', resolveDir: root },
  alias: { "@": path.join(root, "src") }, bundle: true, platform: "node", format: "cjs", write: false, packages: "external",
  plugins: [{ name: "branding-fixture", setup(plugin) {
    plugin.onResolve({ filter: /\/utils\/pdf-branding$/ }, () => ({ path: "branding", namespace: "fixture" }));
    plugin.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const getCompanyLogoAsset = async () => null; export const drawPdfCompanyLogo = () => 0;' }));
  } }],
});
const fixture = new Module(path.join(root, "scripts", "warehouse-reception-fixture.cjs"));
fixture.filename = path.join(root, "scripts", "warehouse-reception-fixture.cjs");
fixture.paths = Module._nodeModulePaths(root);
fixture._compile(outputFiles[0].text, fixture.filename);
const lib = fixture.exports;

const details = [
  { id: "new", codigo_producto: "0007", nombre_producto: "Filtro nuevo", condicion_material: "NUEVO", cantidad: "10", cantidad_recibida: "3", cantidad_pendiente: "7" },
  { id: "used", codigo_producto: "0008", nombre_producto: "Filtro usado", condicion_material: "USADO", cantidad: "2", cantidad_recibida: "0", cantidad_pendiente: "2" },
  { id: "done", codigo_producto: "0009", cantidad: "1", cantidad_recibida: "1", cantidad_pendiente: "0" },
];
const lines = lib.makeReceptionLines(details);
assert.equal(lines.length, 2, "Los materiales completados no se revisan de nuevo");
assert.equal(lines[0].cantidad_pendiente, 7);
assert.equal(lines[0].condicion_material, "NUEVO");
assert.match(lib.validateReception(lines), /indica si llegó/, "La revisión exige elegir cada resultado");
lines[0].llego = true; lines[0].cantidad_recibida = "4.25";
lines[1].llego = false; lines[1].cantidad_recibida = "999"; lines[1].observacion = "Caja ausente";
assert.equal(lib.validateReception(lines), "");
const payload = lib.receptionPayload(lines, "stable-key", " Entrega parcial ");
assert.equal(payload.idempotency_key, "stable-key");
assert.equal(payload.detalles[0].cantidad_recibida, 4.25);
assert.equal(payload.detalles[1].cantidad_recibida, 0, "No llegó siempre envía cero aunque quede una cifra anterior");
assert.equal(payload.detalles[1].llego, false);
assert.equal(payload.observacion, "Entrega parcial");
assert.equal(details[0].cantidad_recibida, "3", "La preparación de revisión no modifica el estado aprobado");
for (const invalid of ["8", "0", "-1", "NaN", "Infinity", "", " "]) {
  lines[0].cantidad_recibida = invalid;
  assert.match(lib.validateReception(lines), /cantidad recibida/, `Cantidad inválida: ${invalid}`);
}
lines[0].cantidad_recibida = "0.000001";
assert.equal(lib.validateReception(lines), "", "Conserva precisión de cantidades");
lines[0].cantidad_recibida = "0.1234567";
assert.match(lib.validateReception(lines), /seis decimales/);
lines[0].cantidad_recibida = "0.123456";
assert.equal(lib.validateReception(lines), "");
lines[0].adjuntos = [{ nombre: "evidencia.pdf", mime_type: "application/pdf", contenido_base64: "JVBERi0=", tamano: 8 }];
assert.equal(lib.validateReception(lines), "");
const evidencePayload = lib.receptionPayload(lines, "same-key", "");
assert.equal(evidencePayload.detalles[0].adjuntos[0].contenido_base64, "JVBERi0=");
assert.equal("tamano" in evidencePayload.detalles[0].adjuntos[0], false);
lines[0].adjuntos[0].mime_type = "text/html";
assert.match(lib.validateReception(lines), /PDF, JPG o PNG/);
lines[0].adjuntos[0].mime_type = "application/pdf";
lines[0].adjuntos[0].tamano = lib.RECEPTION_FILE_LIMIT + 1;
assert.match(lib.validateReception(lines), /5 MB/);
lines[0].adjuntos = Array.from({ length: 5 }, (_, index) => ({ nombre: `${index}.pdf`, mime_type: "application/pdf", contenido_base64: "JVBERi0=", tamano: lib.RECEPTION_FILE_LIMIT }));
assert.match(lib.validateReception(lines), /20 MB/);
lines[0].adjuntos = [];
lines[0].llego = false; lines[0].cantidad_recibida = "0";
assert.equal(lib.validateReception(lines), "", "Se puede guardar evidencia de que nada llegó");
assert.equal(lib.transferStateLabel("PENDIENTE_RECEPCION"), "Pendiente de recepción");
assert.equal(lib.transferStateLabel("PARCIALMENTE_RECIBIDA"), "Recepción parcial");
assert.equal(lib.transferStateLabel(undefined), "Sin estado", "Un estado ausente nunca se presenta como completado");
assert.equal(lib.isTransferCompleted("PARCIALMENTE_RECIBIDA"), false, "Una recepción parcial no cuenta como completada en los reportes");
assert.equal(lib.isTransferCompleted("COMPLETADA"), true);
assert.deepEqual(lib.transferReceiptTotals({ estado: "PENDIENTE_RECEPCION", total_cantidad: "12" }), { sent: 12, received: 0, pending: 12 });
assert.deepEqual(lib.transferReceiptTotals({ estado: "PARCIALMENTE_RECIBIDA", total_cantidad: "12", total_cantidad_recibida: "4.25", total_cantidad_pendiente: "7.75" }), { sent: 12, received: 4.25, pending: 7.75 });
assert.deepEqual(lib.transferReceiptTotals({ estado: "COMPLETADA", total_cantidad: "12" }), { sent: 12, received: 12, pending: 0 }, "Las transferencias históricas completadas conservan sus cantidades");
assert.deepEqual(lib.transferReceiptTotals({ estado: "ANULADA", total_cantidad: "12", total_cantidad_recibida: "4" }), { sent: 12, received: 4, pending: 0 });

const output = path.join(root, "..", "outputs", "20261010-warehouse-reception");
await mkdir(output, { recursive: true });
for (const state of ["PENDIENTE_RECEPCION", "PARCIALMENTE_RECIBIDA", "COMPLETADA"]) {
  const blob = await lib.buildWarehouseTransferPdfBlob({ codigo: `TB-${state}`, fecha_transferencia: "2026-10-10", estado: state,
    bodega_origen_label: "Central Guayaquil", bodega_destino_label: "Central destino", created_by: "Bodega origen",
    detalles: details.map(detail => ({ ...detail, cantidad_recibida: state === "COMPLETADA" ? detail.cantidad : state === "PENDIENTE_RECEPCION" ? "0" : detail.cantidad_recibida,
      cantidad_pendiente: state === "COMPLETADA" ? "0" : state === "PENDIENTE_RECEPCION" ? detail.cantidad : detail.cantidad_pendiente })) }, "Validación", false);
  const buffer = Buffer.from(await blob.arrayBuffer());
  assert.ok(buffer.toString("latin1").startsWith("%PDF"));
  assert.ok(buffer.toString("latin1").includes("APROBADO"));
  assert.ok(buffer.toString("latin1").includes("PENDIENTE"));
  await writeFile(path.join(output, `${state}.pdf`), buffer);
}
console.log("PASS: recepción total/parcial/no llegó, revisión explícita, cantidades, idempotencia, adjuntos y PDF de tres estados");

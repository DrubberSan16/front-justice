import assert from "node:assert/strict";
import { build } from "esbuild";
import Module from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../src/app/utils/warehouse-transfer-edit.ts", import.meta.url));
const { outputFiles } = await build({ entryPoints: [file], bundle: true, platform: "node", format: "cjs", write: false });
const fixture = new Module(file);
fixture._compile(outputFiles[0].text, file);
const { canEditWarehouseTransfer, ownTransferReservation } = fixture.exports;

assert.equal(canEditWarehouseTransfer({ puede_editar: true, estado: "PENDIENTE_RECEPCION" }), true);
for (const row of [
  { puede_editar: false, estado: "PENDIENTE_RECEPCION" },
  { estado: "PENDIENTE_RECEPCION" },
  { puede_editar: true, estado: "ANULADA" },
  { puede_editar: true, estado: "PARCIALMENTE_RECIBIDA" },
  { puede_editar: true, estado: "COMPLETADA" },
  // Un evento de guia debe ocultar Editar aunque quede el permiso previo.
  { puede_editar: true, estado: "PENDIENTE_RECEPCION", guia_remision_id: "guide" },
]) assert.equal(canEditWarehouseTransfer(row), false);

const details = [
  { producto_id: "p1", condicion_material: "NUEVO", cantidad: "2.123456" },
  { producto_id: "p1", condicion_material: "USADO", cantidad: "3" },
  { producto_id: "p1", condicion_material: "CRITICO", cantidad: "1" },
  { producto_id: "p2", condicion_material: "NUEVO", cantidad: "90" },
];
const before = structuredClone(details);
assert.deepEqual(ownTransferReservation(details, "p1"), { nuevo: 2.123456, usado: 3, critico: 1, total: 6.123456 });
assert.deepEqual(ownTransferReservation(details, "missing"), { nuevo: 0, usado: 0, critico: 0, total: 0 });
assert.deepEqual(details, before);
console.log("PASS: disponibilidad de Editar y reserva propia por producto y condicion");

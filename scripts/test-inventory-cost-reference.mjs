import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { ref, nextTick } from 'vue';
const root = fileURLToPath(new URL('../', import.meta.url));
const { outputFiles } = await build({ stdin: { contents: 'export * from "@/app/composables/use-inventory-cost-reference"; export * from "@/app/composables/use-income-price-reference"; export * from "@/app/utils/material-cost-visibility"; export * from "@/app/utils/role-access"; export * from "@/app/config/maintenance-modules";', resolveDir: root },
  alias: { '@': path.join(root, 'src') }, bundle: true, platform: 'node', format: 'cjs', write: false, packages: 'external',
  plugins: [{ name: 'fixture-api', setup(plugin) { plugin.onResolve({ filter: /\/http\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const api = {get(){throw new Error("Unexpected request")}};' })); } }], });
const filename = path.join(root, 'scripts/cost-fixture.cjs');
const module = new Module(filename); module.filename = filename; module.paths = Module._nodeModulePaths(root); module._compile(outputFiles[0].text, filename);
const { useInventoryCostReference, useIncomePriceReference, stripMaterialCosts, isIncomePriceReferenceRequest, isWarehouseKeeper, canSetIncomeUnitCost, canRegisterMaterialIssue, getMaintenanceModule } = module.exports;
const product = ref('A'); const warehouse = ref('CPT'); const enabled = ref(true); const pending = [];
const state = useInventoryCostReference({ productId: () => product.value, warehouseId: () => warehouse.value, enabled: () => enabled.value },
  (productId, warehouseId) => new Promise((resolve, reject) => pending.push({ productId, warehouseId, resolve, reject })));
assert.equal(state.loading.value, true);
product.value = 'B';
pending[1].resolve({ data: { data: { costo_unitario: 0, saldo_costo_promedio: 12.5 } } }); await nextTick();
assert.equal(state.cost.value, 12.5);
pending[0].resolve({ data: { data: { costo_unitario: 99 } } }); await nextTick();
assert.equal(state.cost.value, 12.5, 'Una respuesta anterior no debe cambiar el costo del material seleccionado');
warehouse.value = 'TPTA';
assert.equal(state.cost.value, null);
pending[2].resolve({ data: { costo_unitario: 8 } }); await nextTick();
assert.equal(state.cost.value, 8);
product.value = 'C'; pending[3].reject(new Error('Offline')); await nextTick();
assert.equal(state.cost.value, null); assert.equal(state.loading.value, false); assert.match(state.error.value, /al guardar/);
enabled.value = false; const count = pending.length; product.value = 'D';
assert.equal(pending.length, count, 'Un usuario sin permiso no consulta costos');
const config = getMaintenanceModule('work-order-consumos');
const costField = config.fields.find(field => field.key === 'costo_unitario');
assert.equal(Boolean(costField.required), false); assert.equal(costField.readonly, true); assert.equal(costField.sendInPayload, false);
assert.equal(config.fields.find(field => field.key === 'bodega_id').required, true);
state.stop();
console.log('PASS: costo automático, cambio de material/bodega, respuestas fuera de orden, permisos y guardado sin costo manual');
const incomeRows = ref([{ localId: 'one', productoId: 'A', costoUnitario: '' }]);
const incomeWarehouse = ref('TPTA'); const incomeDate = ref('2026-10-02'); const incomeEnabled = ref(true);
const incomePending = [];
const prices = useIncomePriceReference({ rows: () => incomeRows.value, warehouseId: () => incomeWarehouse.value, date: () => incomeDate.value, enabled: () => incomeEnabled.value },
  (producto_id, bodega_id, fecha) => new Promise((resolve, reject) => incomePending.push({ producto_id, bodega_id, fecha, resolve, reject })));
assert.equal(prices.loading.value, true);
incomePending[0].resolve({ data: { data: { costo_unitario: 6, fuente: 'PROMEDIO_MATERIAL' } } }); await nextTick();
assert.equal(incomeRows.value[0].costoUnitario, '6');
incomeRows.value[0].productoId = 'B'; incomeRows.value[0].productoId = 'C';
incomePending[1].resolve({ data: { data: { costo_unitario: 99, fuente: 'INGRESO' } } }); await nextTick();
assert.equal(incomeRows.value[0].costoUnitario, '', 'El precio de otro material no se precarga');
incomeRows.value[0].costoUnitario = '8';
incomePending[2].resolve({ data: { data: { costo_unitario: 7, fuente: 'ORDEN_COMPRA' } } }); await nextTick();
assert.equal(incomeRows.value[0].costoUnitario, '8', 'Respeta el precio ingresado mientras se consultaba la referencia');
incomeWarehouse.value = 'CPT';
assert.equal(incomeRows.value[0].costoUnitario, '');
incomePending[3].resolve({ data: { data: { costo_unitario: null, fuente: 'SIN_PRECIO' } } }); await nextTick();
assert.equal(incomeRows.value[0].costoUnitario, ''); assert.equal(prices.states.value.one.source, 'SIN_PRECIO');
incomeRows.value.push({ localId: 'two', productoId: 'D', costoUnitario: '' });
assert.equal(incomePending.length, 5, 'Añadir una fila no cancela ni repite las consultas de otras filas');
incomeRows.value = incomeRows.value.filter(row => row.localId !== 'two');
incomePending[4].resolve({ data: { data: { costo_unitario: 55 } } }); await nextTick();
assert.equal(prices.states.value.two, undefined, 'Una fila eliminada no recibe referencias');
incomeDate.value = '2026-10-01'; incomePending[5].reject(new Error('Offline')); await nextTick();
assert.match(prices.states.value.one.error, /al guardar/);
incomeEnabled.value = false; const incomeCount = incomePending.length; incomeRows.value[0].productoId = 'E';
assert.equal(incomePending.length, incomeCount);
for (const role of ['BODEGA', 'BODEGUERO']) {
  assert.equal(isWarehouseKeeper({ role: { nombre: role } }), true);
  assert.equal(canSetIncomeUnitCost({ role: { nombre: role } }), true);
}
for (const role of ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'GERENTE GENERAL']) assert.equal(isWarehouseKeeper({ role: { nombre: role } }), false);
for (const role of ['BODEGA', 'BODEGUERO', 'Súper Administrador', 'SUPERADMINISTRADOR', 'SUPER_ADMINISTRADOR', 'SUPER ADMIN', 'SUPER_ADMIN']) {
  assert.equal(canRegisterMaterialIssue({ role: { nombre: role } }), true, `Salida de materiales autorizada para ${role}`);
}
for (const role of ['ADMINISTRADOR', 'GERENTE GENERAL', 'OPERADOR', 'SUPERVISOR', 'TECNICO', '']) {
  assert.equal(canRegisterMaterialIssue({ role: { nombre: role } }), false, `Salida de materiales restringida para ${role}`);
}
assert.equal(canRegisterMaterialIssue(null), false);
assert.deepEqual(stripMaterialCosts({ data: { costo_unitario: 7, costo_promedio: 9, precio_venta: 12, total_costos: 50, fuente: 'INGRESO' } }, true), { data: { costo_unitario: 7, fuente: 'INGRESO' } });
assert.equal(isIncomePriceReferenceRequest('GET', '/kpi_inventory/kardex/precios-ingreso?producto_id=1'), true);
assert.equal(isIncomePriceReferenceRequest('POST', '/kpi_inventory/kardex/precios-ingreso'), false);
assert.equal(isIncomePriceReferenceRequest('GET', '/kpi_inventory/kardex/documentos'), false);
assert.equal(isIncomePriceReferenceRequest('GET', '/kpi_inventory/kardex/precios-ingreso/export'), false);
prices.stop();
console.log('PASS: precarga IB por fila, respuestas antiguas, precio manual, cambios de bodega/fecha, sin referencia y visibilidad limitada al precio del ingreso');

import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { ref, nextTick } from 'vue';
const root = fileURLToPath(new URL('../', import.meta.url));
const { outputFiles } = await build({ stdin: { contents: 'export * from "@/app/composables/use-inventory-cost-reference"; export * from "@/app/config/maintenance-modules";', resolveDir: root },
  alias: { '@': path.join(root, 'src') }, bundle: true, platform: 'node', format: 'cjs', write: false, packages: 'external',
  plugins: [{ name: 'fixture-api', setup(plugin) { plugin.onResolve({ filter: /\/http\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const api = {get(){throw new Error("Unexpected request")}};' })); } }], });
const filename = path.join(root, 'scripts/cost-fixture.cjs');
const module = new Module(filename); module.filename = filename; module.paths = Module._nodeModulePaths(root); module._compile(outputFiles[0].text, filename);
const { useInventoryCostReference, getMaintenanceModule } = module.exports;
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

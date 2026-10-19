import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
const {outputFiles}=await build({stdin:{contents:`export * from '@/app/utils/role-access';export * from '@/app/config/report-access';export * from '@/app/config/maintenance-module-overrides';export * from '@/app/utils/equipment-display';export * from '@/app/utils/equipment-location-history';`,resolveDir:root},alias:{'@':path.join(root,'src')},bundle:true,platform:'node',format:'cjs',packages:'external',write:false});
const filename=path.join(root,'scripts','digital-model-fixture.cjs');const fixture=new Module(filename);fixture.filename=filename;fixture.paths=Module._nodeModulePaths(root);fixture._compile(outputFiles[0].text,filename);const model=fixture.exports;
for(const role of ['Administrador','Operador','Técnico','Supervisor','Gerente General','Bodega','']) {
  const user={role:{nombre:role}};
  assert.equal(model.canAccessDigitalTwins(user),false,role);
  assert.equal(model.getReportAccessOptionsForUser(user).some(o=>o.value==='gemelos_digitales'),false,role);
}
assert.equal(model.canAccessDigitalTwins(null),false);
assert.equal(model.canAccessDigitalTwins({role:{nombre:'Super Administrador'}}),true);
for(const module of ['equipos','unidades-generacion','proyectos','componentes-equipo'])assert.ok(model.getEnhancedMaintenanceModule(module).fields.some(f=>f.key==='serie'),module);
const equipment={nombre:'UG22',marca_nombre:'CAT',equipment_location_label:'Central nueva'};
const order={equipment_location_snapshot:{location_code:'UBI-A',location_name:'Taller',sucursal_name:'Sucursal anterior'}};
const label=model.buildEquipmentManagerLabel(model.equipmentAtWorkOrder(equipment,order));
assert.ok(label.includes('Sucursal anterior'));assert.ok(!label.includes('Central nueva'));
assert.equal(model.resolveEquipmentLocation({equipment_location_snapshot:{location_id:null},central:'Actual'}),'Sin ubicación registrada');
const report=model.equipmentLocationReport([{codigo:'EQ-01',nombre:'Equipo',serie:'000-SERIE',historial_ubicaciones:[{valid_from:'2026-10-19T15:00:00Z',valid_to:null,location_nombre:'Taller',sucursal_nombre:'Central A',source:'BASELINE_OBSERVED'}]}]);
assert.equal(report.sheets[0].rows[0].serie,'000-SERIE');assert.equal(report.sheets[0].rows[0].hasta,'Actual');assert.equal(report.sheets[0].rows[0].origen,'Referencia inicial observada');
console.log('PASS: ocho perfiles sin acceso, reportes ocultos, serie en todos los formularios de equipos, ubicación histórica y reporte de permanencias.');

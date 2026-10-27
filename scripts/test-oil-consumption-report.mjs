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
      export * from "@/app/utils/maintenance-cost-financial-report";
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
  const onlyPriming = reports.buildOilFinancialReport({ rows: [priming], filtersLabel: '', fileName: 'cebado', showCosts: true });
  assert.equal(onlyPriming.sheets[1].rows[0].horas_cebado, '01:30:00');
  assert.equal(onlyPriming.sheets[1].rows[0].horometro_inicial, '', 'El cebado no lleva horómetros');
  const mixed = reports.buildOilFinancialReport({ rows: [priming, zero], filtersLabel: '', fileName: 'mixed', showCosts: true });
  assert.equal(mixed.sheets[1].rows[1].horometro_final, 120, 'Los demás tipos conservan sus lecturas');
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
{
  // Gerencia y Administración exportan el mismo reporte operativo-financiero.
  const priming = { ...sample, maintenance_kind: "CEBADO", work_order_code: "OT-A00306", horas_trabajadas: 0.5, cantidad: 2, subtotal: 25 };
  const corrective = { ...sample, maintenance_kind: "CORRECTIVO", work_order_code: "OT-A00307", cantidad: 1, subtotal: 12.5 };
  const flow = (cantidad, costo) => ({ cantidad, costo });
  const inventory = {
    existencia_inicial: flow(100, 1250), compras: flow(50, 650), transferencias_recibidas: flow(0, 0),
    devoluciones: flow(0, 0), ajustes: flow(0, 0), salidas: flow(6, 75), transferencias_enviadas: flow(0, 0),
    existencia_final: flow(144, 1825), saldo_actual: flow(140, 1775),
  };
  const report = reports.buildOilFinancialReport({ rows: [sample, priming, corrective], inventory,
    filtersLabel: "01 oct 2026 al 13 oct 2026 · Central: SUC-002 - TPTA", fileName: "financiero", showCosts: true });
  const [generators, detail, stock, reconciliation] = report.sheets;
  // Cebado, MPG y otros tipos son excluyentes y el total es su suma.
  assert.equal(generators.rows.length, 2, "Un generador y la fila de total");
  const [ug07, total] = generators.rows;
  assert.equal(ug07.equipo, "UG07 - CUMMINS");
  assert.equal(ug07.ot_cebado, 1);
  assert.equal(ug07.horas_cebado, "00:30:00");
  assert.equal(ug07.gal_cebado, 2);
  assert.equal(ug07.gal_mpg, 2.5);
  assert.equal(ug07.gal_otros, 1);
  assert.equal(ug07.gal_total, 5.5);
  assert.equal(ug07.costo_total, 68.75);
  assert.equal(total.equipo, "TOTAL");
  assert.equal(generators.rowKinds.at(-1), "total");
  // El detalle por OT cierra con el total de galones y de costo.
  assert.equal(detail.rows.length, 4);
  assert.equal(detail.rows[0].fecha, "01-10-2026", "Respeta America/Guayaquil");
  assert.equal(detail.rows[0].tipo, "Mantenimiento MPG");
  assert.equal(detail.rows[0].horometro_inicial, 0);
  assert.equal(detail.rows.at(-1).galones, 5.5);
  assert.equal(detail.rows.at(-1).costo, 68.75);
  // Inventario: la cuenta se lee de la existencia inicial a la final, y la
  // conciliación compara las OT con lo que salió de bodega.
  assert.equal(stock.rows[0].concepto, "Existencia inicial");
  assert.equal(stock.rows.at(-1).cantidad, 144);
  assert.equal(stock.rows[1].costo_unitario, 13);
  assert.equal(reconciliation.rows.at(-1).concepto, "Diferencia");
  assert.equal(reconciliation.rows.at(-1).cantidad, 0.5);
  // Sin observaciones no hay columna vacía de observación.
  assert.ok(!detail.columns.some(column => column.key === "observacion"));
  assert.equal(detail.columns[0].header, "Fecha salida bodega");
  assert.equal(detail.columns[1].key, "fecha_ot");
  assert.ok(report.summary.some(item => item.label === "OT de cebado" && item.value === "1 · 1 equipos"));
  assert.ok(report.summary.some(item => item.label === "Saldo de aceite en bodega" && String(item.value).startsWith("140")));
  assert.ok(report.subtitle.includes("Central: SUC-002 - TPTA"));
  assert.ok(!JSON.stringify(report.sheets).includes(sample.equipment_id));
  const excel = await reports.buildReportExcelBlob(report);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await excel.arrayBuffer());
  const cells = [];
  workbook.worksheets.forEach(sheet => sheet.eachRow(row => cells.push(...row.values)));
  assert.ok(cells.includes(5.5));
  assert.ok(cells.includes(68.75));
  assert.ok(cells.includes("UG07 - CUMMINS"));
  const pdf = await reports.buildReportPdfBlob(report);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.ok(bytes.toString("latin1").startsWith("%PDF"));
  await writeFile(path.join(output, "financiero.pdf"), bytes);
  await writeFile(path.join(output, "financiero.xlsx"), Buffer.from(await excel.arrayBuffer()));
  const hidden = reports.buildOilFinancialReport({ rows: [sample], inventory, filtersLabel: "", fileName: "sin-costos", showCosts: false });
  assert.ok(!hidden.sheets.some(sheet => sheet.columns.some(column => /costo/.test(column.key))));
  assert.ok(!hidden.summary.some(item => /Costo/.test(item.label)));
  const missing = reports.buildOilFinancialReport({ rows: [{ equipment_name: "UG01" }], filtersLabel: "", fileName: "faltantes", showCosts: true });
  assert.equal(missing.sheets[1].rows[0].fecha, "");
  assert.equal(missing.sheets[1].rows[0].equipo, "UG01");
  assert.equal(missing.sheets.length, 2, "Sin inventario no hay hoja de bodega");
}
{
  // Bodega (Word de control de cebado, oct 2026): la OT-A00245 se inició el
  // 25-08 pero el EB salió el 27-09. El reporte la fecha por la salida y deja
  // la fecha de la OT al lado; la conciliación descuenta lo entregado a OT de
  // otra sucursal y las salidas sin OT van en su propia línea de inventario.
  const flow = (cantidad, costo) => ({ cantidad, costo });
  const rows = [
    { ...sample, maintenance_kind: "CEBADO", work_order_code: "OT-A00245", cantidad: 2, subtotal: 25,
      fecha_referencia: "2026-09-27T11:11:08", fecha_salida: "2026-09-27T11:11:08", fecha_ot: "2026-08-25T08:00:00" },
    { ...sample, maintenance_kind: "CEBADO", work_order_code: "OT-A00137", cantidad: 2, subtotal: 25,
      fecha_referencia: "2026-09-10T21:00:14", fecha_salida: "2026-09-10T21:00:14", fecha_ot: "2026-09-10T20:00:00",
      observacion: "La OT registra 4 gal; bodega entregó 2 gal" },
    // Sin EB: entra por su propia fecha, pero la columna de salida queda vacía.
    { ...sample, maintenance_kind: "CEBADO", work_order_code: "OT-A00163", cantidad: 0, subtotal: 0,
      fecha_referencia: "2026-09-15T10:00:00", fecha_salida: null, fecha_ot: "2026-09-15T10:00:00",
      observacion: "La OT registra 15 gal sin salida de bodega" },
  ];
  const inventory = {
    existencia_inicial: flow(1000, 12500), compras: flow(0, 0), transferencias_recibidas: flow(0, 0),
    devoluciones: flow(0, 0), ajustes: flow(0, 0), salidas: flow(14, 175),
    salidas_otra_sucursal: flow(10, 125), salidas_sin_ot: flow(200, 2500),
    salidas_otra_sucursal_detalle: [{ work_order_code: "OT-A00347", equipment_name: "JC - UG12",
      central: "UBI-A00003 - CENTRAL CPT - CPT", fecha: "2026-10-05T10:00:00", cantidad: 10, costo: 125 }],
    transferencias_enviadas: flow(0, 0), existencia_final: flow(786, 9825), saldo_actual: flow(786, 9825),
  };
  const report = reports.buildOilFinancialReport({ rows, inventory, filtersLabel: "", fileName: "bodega", showCosts: true });
  const [, detail, stock, reconciliation] = report.sheets;
  assert.equal(detail.rows[0].fecha, "27-09-2026");
  assert.equal(detail.rows[0].fecha_ot, "25-08-2026");
  assert.equal(detail.columns.at(-1).key, "observacion");
  assert.equal(detail.rows[1].observacion, "La OT registra 4 gal; bodega entregó 2 gal");
  assert.equal(detail.rows[2].fecha, "", "Sin EB no hay fecha de salida");
  assert.equal(detail.rows[2].fecha_ot, "15-09-2026");
  assert.ok(stock.rows.some(row => row.concepto === "(-) Salidas sin orden de trabajo" && row.cantidad === 200));
  assert.deepEqual(reconciliation.rows.map(row => row.cantidad), [14, 10, 10, 4, 0]);
  assert.ok(reconciliation.rows[2].concepto.includes("OT-A00347 · 05-10-2026 · UG12 · UBI-A00003 - CENTRAL CPT - CPT"));
  assert.equal(reconciliation.rowKinds.length, reconciliation.rows.length);
  const screen = reports.oilReconciliation(4, 50, inventory);
  assert.equal(screen.difference, 0);
  assert.equal(screen.otherBranches, 10);
}
{
  // Reporte financiero de repuestos con la OT-A00382 del ejemplo de Gerencia:
  // repuestos + aceite + insumos + mano de obra = total oficial de la OT.
  const material = (codigo, nombre, categoria, cantidad, costo) => ({
    producto_id: codigo, material_codigo: codigo, material_label: `${codigo} - ${nombre}`,
    categoria_costo: categoria, bodega_label: "BOD-002 - TIPUTINI TPTA",
    cantidad, costo_total: costo, costo_unitario: costo / cantidad,
  });
  const ot = {
    work_order_code: "OT-A00382", fecha_referencia: "2026-10-20T10:00:00", equipment_id: "eq-ug11",
    equipment_name: "CATERPILLAR | JC - UG11 - 3516", maintenance_kind_label: "Preventivo",
    costo_repuestos: 479.45, costo_aceite: 1062.5, costo_insumos: 81.7,
    costo_materiales: 1623.65, costo_mano_obra: 33.33, total_costo: 1656.98,
    materiales_detalle: [
      material("P535114 /PA3904", "FILTRO DE AIRE CATERPILLAR", "REPUESTOS", 2, 350.74),
      material("FUSIB-0.5AMP", "FUSIBLE DE 0.50 AMP", "INSUMOS", 1, 0),
      material("ACT-MOTOR-15W40", "ACEITE GULF", "ACEITE", 85, 1062.5),
      material("FUSIB-3AMP", "FUSIBLE DE 3AMP", "INSUMOS", 3, 0),
      material("Q. HIGH PERF-CAN", "DESENGRASANTE PERFORMANCE", "INSUMOS", 1, 81.7),
      material("PF789010", "FILTRO RACOR", "REPUESTOS", 2, 22.76),
      material("P7003", "FILTRO ACEITE CATERPILLAR", "REPUESTOS", 3, 105.95),
    ],
  };
  const report = reports.buildMaintenanceFinancialReport({ rows: [ot], filtersLabel: "oct 2026 · Central: SUC-002 - TPTA", fileName: "repuestos" });
  const [composition, byMachine, byKind, byMonth, byArticle, detail] = report.sheets;
  const total = composition.rows.at(-1);
  assert.equal(total.orden, "TOTAL");
  assert.equal(Number((total.repuestos + total.aceite + total.insumos + total.mano_obra).toFixed(2)), 1656.98);
  assert.equal(total.total, 1656.98);
  assert.equal(byMachine.rows[0].grupo, "CATERPILLAR | JC - UG11 - 3516");
  assert.equal(byKind.rows[0].grupo, "Preventivo");
  assert.equal(byMonth.rows[0].grupo, "oct 2026");
  assert.equal(byArticle.rows[0].codigo, "ACT-MOTOR-15W40", "Por artículo, el de mayor costo primero");
  assert.equal(detail.rows.length, 8, "Siete materiales y el total");
  assert.equal(detail.rows.at(-1).costo, 1623.65);
  assert.ok(report.summary.some(item => item.label === "Total mantenimiento" && item.value.includes("1.656,98")));
  const onlySpareParts = reports.buildMaintenanceFinancialReport({ rows: [ot], filtersLabel: "", fileName: "solo-repuestos", category: "REPUESTOS" });
  assert.equal(onlySpareParts.sheets[5].rows.length, 4, "Tres repuestos y el total");
  assert.equal(onlySpareParts.sheets[4].name, "Repuestos por artículo");
  const pdf = await reports.buildReportPdfBlob(report);
  await writeFile(path.join(output, "repuestos.pdf"), Buffer.from(await pdf.arrayBuffer()));
  const excel = await reports.buildReportExcelBlob(report);
  await writeFile(path.join(output, "repuestos.xlsx"), Buffer.from(await excel.arrayBuffer()));
}
console.log("Oil reports: financial report with totals per generator and OT, inventory, reconciliation, spare parts cost composition, local dates, Excel/PDF and cost permissions passed.");

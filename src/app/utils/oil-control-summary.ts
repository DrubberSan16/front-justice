import { parseAppDate } from "@/app/utils/date-time";

type Row = Record<string, any>;

/** Un mismo conjunto filtrado sustenta tablas, indicadores y exportaciones. */
export function buildOilControlSummary(rows: Row[], equipments: Row[], endDate: string) {
  const groups = new Map<string, Row>();
  const daily = new Map<string, Row>();
  const end = parseAppDate(`${endDate}T23:59:59.999`)?.getTime() ?? Date.now();
  const types: Record<string, string> = { CEBADO: "Cebado", PREVENTIVO: "Mantenimiento MPG", MPG: "Mantenimiento MPG", CORRECTIVO: "Correctivo", PROYECTO: "Proyecto" };
  const workOrders = rows.map<Row>(row => ({
    ...row, orden: row.work_order_code, fecha: row.fecha_referencia,
    tipo: row.maintenance_kind, maintenance_kind_label: types[row.maintenance_kind] || row.maintenance_kind,
    equipment_label: [row.equipment_code, row.equipment_name].filter(Boolean).join(" - ") || "Sin equipo",
    horometro_anterior: row.maintenance_kind === "CEBADO" ? null : row.horometro_inicial,
    horometro_actual: row.maintenance_kind === "CEBADO" ? null : row.horometro_final,
    galones: Number(row.cantidad || 0), costo: Number(row.subtotal || 0),
  }));
  const previousByEquipment = new Map<string, number>();
  for (const row of workOrders.slice().sort((a, b) =>
    (parseAppDate(a.fecha_referencia)?.getTime() ?? 0) - (parseAppDate(b.fecha_referencia)?.getTime() ?? 0)
    || String(a.work_order_code).localeCompare(String(b.work_order_code)))) {
    const key = String(row.equipment_id || 'SIN_EQUIPO');
    const previous = previousByEquipment.get(key);
    row.galones_orden_anterior = previous ?? null;
    row.tendencia = previous == null || previous <= 0 ? 'SIN_REFERENCIA'
      : row.galones > previous * 1.1 ? 'AL_ALZA' : row.galones < previous * 0.9 ? 'A_LA_BAJA' : 'ESTABLE';
    previousByEquipment.set(key, row.galones);
  }
  for (const equipment of equipments) groups.set(String(equipment.id), {
    equipment_id: equipment.id, equipo_id: equipment.id, equipment_code: equipment.codigo,
    equipment_name: equipment.nombre, equipo_nombre: equipment.nombre, es_reserva: equipment.es_reserva,
    central: equipment.central, location_id: equipment.location_id,
    total_cantidad: 0, total_costo: 0, total_ordenes: 0, galones_semana: 0, galones_mes: 0,
    galones_max_orden: 0, ots_criticas: 0, ots_seguimiento: 0, horas_trabajadas: 0,
    horometro_inicial: null, horometro_final: null,
  });
  for (const row of workOrders) {
    const key = String(row.equipment_id || "SIN_EQUIPO");
    const group = groups.get(key) || { equipment_id: row.equipment_id, equipo_id: row.equipment_id,
      total_cantidad: 0, total_costo: 0, total_ordenes: 0, galones_semana: 0, galones_mes: 0,
      galones_max_orden: 0, ots_criticas: 0, ots_seguimiento: 0, horas_trabajadas: 0,
      horometro_inicial: null, horometro_final: null };
    Object.assign(group, { equipment_name: row.equipment_name, equipo_nombre: row.equipment_name,
      equipment_label: row.equipment_label, central: row.central, location_id: row.location_id, es_reserva: row.es_reserva });
    group.total_cantidad += row.galones;
    group.total_costo += row.costo;
    group.total_ordenes++;
    const age = end - (parseAppDate(row.fecha_referencia)?.getTime() ?? 0);
    if (age >= 0 && age < 7 * 86400000) group.galones_semana += row.galones;
    if (age >= 0 && age < 30 * 86400000) group.galones_mes += row.galones;
    group.galones_max_orden = Math.max(group.galones_max_orden, row.galones);
    group.ots_criticas += Number(row.galones >= 10);
    group.ots_seguimiento += Number(row.galones > 5 && row.galones < 10);
    group.horas_trabajadas += Number(row.horas_trabajadas || 0);
    if (row.maintenance_kind !== "CEBADO") {
      for (const value of [row.horometro_inicial, row.horometro_final]) if (value != null && value !== "" && Number.isFinite(Number(value))) {
        group.horometro_inicial = group.horometro_inicial == null ? Number(value) : Math.min(group.horometro_inicial, Number(value));
        group.horometro_final = group.horometro_final == null ? Number(value) : Math.max(group.horometro_final, Number(value));
      }
    }
    groups.set(key, group);
    const date = parseAppDate(row.fecha_referencia);
    const day = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "Sin fecha";
    const bucket = daily.get(day) || { key: day, label: day, cantidad: 0, costo: 0, total_ordenes: 0 };
    bucket.cantidad += row.galones; bucket.costo += row.costo; bucket.total_ordenes++;
    daily.set(day, bucket);
  }
  const byEquipment = [...groups.values()].map<Row>(row => ({ ...row,
    galones_periodo: row.total_cantidad, costo_aceite: row.total_costo, ots_cebado: row.total_ordenes,
  })).sort((a, b) => b.total_cantidad - a.total_cantidad || String(a.equipment_name).localeCompare(String(b.equipment_name), "es"));
  const total = workOrders.reduce((sum, row) => sum + row.galones, 0);
  const trend = [...daily.values()].sort((a, b) => a.key.localeCompare(b.key));
  return { work_orders: workOrders, by_equipment: byEquipment, priming: byEquipment, trend,
    selected_product: { nombre: "Todos los aceites" },
    totals: { total_cantidad: total, total_costo: workOrders.reduce((sum, row) => sum + row.costo, 0),
      total_ordenes: workOrders.length, total_equipos: byEquipment.filter(row => row.total_ordenes > 0).length,
      promedio_por_orden: workOrders.length ? total / workOrders.length : 0 },
    statistics: { quantity_trend: trend, cost_trend: trend, orders_trend: trend },
  };
}

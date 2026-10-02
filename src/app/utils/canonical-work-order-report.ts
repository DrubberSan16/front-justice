import { buildWorkOrderReport, type ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";
import { buildEquipmentDisplayTitle, resolveEquipmentLocation } from "@/app/utils/equipment-display";
import { resolveWorkOrderReportActors } from "@/app/utils/work-order-audit";
import { buildMaterialsCost, buildResponsibleHours, contractedLaborCost, fetchWorkOrderDetail, flattenDetailLines, type WorkOrderDetailPayload } from "@/app/utils/work-order-detail";

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const label = (row: Record<string, any>) => row.producto_label || row.producto_nombre || row.material || row.producto_id || "Material";
const workflow: Record<string, string> = { PLANNED: "Planificada", OPEN: "Abierta", IN_PROGRESS: "En proceso", REVIEW: "En revisión", BLOCKED: "Bloqueada", CLOSED: "Cerrada" };
const evidenceUrl = (value: unknown) => {
  const url = String(value || "").trim();
  return !url || /^(https?:|blob:|data:)/i.test(url) ? url : `https://justicecompany-ec.com/${url.replace(/^\//, "")}`;
};

/** Una sola definición para OT, Gerencia, Administración y Reportería. */
export function buildCanonicalWorkOrderReport(detail: WorkOrderDetailPayload, showCosts: boolean): ReportDefinition {
  const h = detail.header || {};
  const audit = h.valor_json || {};
  const isProject = String(h.maintenance_kind || "").toUpperCase() === "PROYECTO";
  const actors = resolveWorkOrderReportActors(h, detail.history);
  const labor = buildResponsibleHours(detail.tasks).reduce((sum, row) => sum + row.cost, 0);
  const materials = buildMaterialsCost(detail.consumptions, detail.issues);
  const contracted = contractedLaborCost(h);
  const issued = new Map<string, { quantity: number; amount: number }>();
  for (const line of flattenDetailLines(detail.issues)) {
    const key = `${line.producto_id}::${line.bodega_id}`;
    const total = issued.get(key) || { quantity: 0, amount: 0 };
    total.quantity += number(line.cantidad);
    total.amount += number(line.cantidad) * number(line.costo_unitario);
    issued.set(key, total);
  }
  const tasks = detail.tasks.flatMap(task => {
    const people = Array.isArray(task.responsables) && task.responsables.length ? task.responsables : [{}];
    return people.map((person: Record<string, any>) => ({
      responsable: person.display_name || person.nameSurname || person.username || "Sin responsables",
      tarea: task.actividad || task.actividad_adicional || task.tarea_label || task.tarea_nombre || task.tarea?.nombre || task.task_name || task.tarea_descripcion || task.descripcion || task.nombre || "Trabajo registrado",
      valor_registrado: task.valor_registrado ?? task.valor_numeric ?? task.valor_text ?? (task.valor_boolean != null ? (task.valor_boolean ? "Sí" : "No") : task.valor_json?.valor) ?? "-",
      horas: number(person.horas),
      ...(showCosts ? { costo_hora: number(person.costo_hora), costo_total: number(person.horas) * number(person.costo_hora) } : {}),
      observacion: person.observacion || task.observacion || "-",
      plan: task.plan_label || task.plan_nombre || h.plan_nombre || "-",
    }));
  });
  const consumos = flattenDetailLines(detail.consumptions).map(line => {
    const delivery = issued.get(`${line.producto_id}::${line.bodega_id}`);
    const unitCost = delivery && delivery.quantity > 0 ? delivery.amount / delivery.quantity : number(line.costo_unitario);
    const delivered = delivery?.quantity || 0;
    return { material: label(line), bodega: line.bodega_label || line.bodega_nombre || "-", reservado: number(line.cantidad), emitido: delivered, pendiente: Math.max(0, number(line.cantidad) - delivered), ...(showCosts ? { costo_unitario: unitCost, subtotal: number(line.cantidad) * unitCost } : {}), observacion: line.observacion || "-" };
  });
  const report = buildWorkOrderReport({
    header: {
      ...h,
      equipment_label: isProject ? h.title || "Proyecto" : buildEquipmentDisplayTitle(h),
      central: resolveEquipmentLocation(h) || (h.proyecto_ubicaciones || []).map((row: any) => row.label || row.nombre).join(", ") || "Sin ubicación",
      status_workflow: /ANULAD|CANCELAD|VOID/.test(String(audit.approval_action || h.status_workflow || "").toUpperCase()) || audit.annulment ? "Anulada" : workflow[h.status_workflow] || h.status_workflow,
      equipment_component_label: h.equipo_componentes?.map((row: any) => row.label || row.nombre_oficial || row.nombre).join(", ") || h.equipo_componente_nombre_oficial,
      emergency_label: h.is_emergency ? "Emergencia" : "Orden normal",
      procedimiento: h.procedimiento_label || h.procedimiento_nombre || audit.procedimiento_nombre || "-",
      plan_operativo: h.plan_label || h.plan_nombre || "-",
      fecha_operativa: h.fecha_operativa || h.fecha_programacion || h.hora_inicio || h.started_at || h.created_at,
      horometro_anterior: h.horometro_anterior ?? audit.horometro_anterior,
      horometro_actual: h.horometro_actual ?? audit.horometro_actual,
      horas_a_realizar: buildResponsibleHours(detail.tasks).reduce((sum, row) => sum + row.hours, 0),
      show_costs: showCosts,
      ...(showCosts ? { costo_materiales: materials, costo_mano_obra: labor, costo_contratado: contracted, costo_total: materials + labor + contracted } : {}),
      creado_por: actors.createdBy, fecha_creacion: h.created_at,
      realizado_por: actors.processedBy, fecha_realizacion: audit.processed_at || h.started_at,
      aprobado_por: actors.approvedBy, fecha_aprobacion: h.approved_at || audit.approved_at || h.closed_at,
      causa: audit.causa, accion: audit.accion, prevencion: audit.prevencion,
    },
    tasks, consumos,
    attachments: detail.attachments.map(row => {
      const url = evidenceUrl(row.public_page_url || row.download_url || row.view_url || row.preview_url || row.url || row.file_url);
      const isImage = String(row.mime_type || row.meta?.mime_type || "").startsWith("image/") || /IMAGEN/i.test(String(row.meta?.evidence_kind || row.tipo));
      return { nombre: row.nombre || row.original_name || row.file_name, origen: row.observacion || row.meta?.task_label || "OT", vista_previa: isImage ? "Imagen adjunta" : "", media_url: isImage ? evidenceUrl(row.view_url || row.preview_url) : "", url_visualizacion: url, enlace: url ? "Abrir evidencia" : "Sin enlace" };
    }),
    issues: flattenDetailLines(detail.issues).map(row => ({ salida: row.codigo || row.code, fecha: row.fecha || row.created_at, material: label(row), cantidad: row.cantidad, bodega: row.bodega_label || row.bodega_nombre })),
    scraps: flattenDetailLines(detail.scraps).map(row => ({ transferencia: row.transferencia_codigo || row.codigo, fecha: row.fecha, material: label(row), cantidad: row.cantidad, bodega_chatarra: row.bodega_chatarra_label })),
    history: detail.history.map(row => ({ hacia: workflow[row.to_status] || row.to_status, usuario: row.changed_by_label || row.changed_by || row.user_label || row.username || "-", fecha: row.changed_at, nota: typeof row.note === "string" ? row.note.replace(/→/g, " -> ") : row.note })),
  });
  if (isProject) {
    const project = audit.proyecto || {};
    const textList = (value: unknown) => Array.isArray(value) ? value.join("\n") : String(value || "-");
    const section = report.sheets[0]?.section;
    section?.info?.push(
      { label: "Empresa", value: project.empresa || "-" },
      { label: "Objetivo general", value: project.objetivo_general || "-" },
      { label: "Objetivos específicos", value: textList(project.objetivos_especificos) },
      { label: "Metodología", value: project.metodologia || "-" },
      { label: "Alcance", value: textList(project.alcance) },
      { label: "Bodegas", value: (h.proyecto_bodegas || []).map((row: any) => row.label || row.nombre).join(", ") || "-" },
    );
    report.sheets.push({ name: "Personal contratado", section, fitColumnsToPage: true,
      columns: [{ key: "rol", header: "Rol" }, { key: "nombre", header: "Nombre" }, { key: "dias_laborados", header: "Días", format: "number" }, { key: "ubicacion_label", header: "Ubicación" }, { key: "fecha", header: "Fecha", format: "date" }, { key: "observacion", header: "Observación" }, ...(showCosts ? [{ key: "valor_dia", header: "Valor por día", format: "currency" as const }, { key: "subtotal", header: "Costo", format: "currency" as const }] : [])],
      rows: (h.proyecto_personal || []).map((row: any) => ({ ...row, ...(showCosts ? { subtotal: number(row.dias_laborados) * number(row.valor_dia) } : {}) })),
    });
  }
  return report;
}

export async function fetchCanonicalWorkOrderReport(id: string, showCosts: boolean) {
  return buildCanonicalWorkOrderReport(await fetchWorkOrderDetail(id, { strict: true }), showCosts);
}

/** Cada OT conserva exactamente sus secciones, costos y permisos al consolidar. */
export function consolidateCanonicalWorkOrderReports(
  reports: ReportDefinition[],
  options: Pick<ReportDefinition, "title" | "subtitle" | "fileName">,
): ReportDefinition {
  return { ...reports[0], ...options, orientation: "portrait", continuousSections: false,
    sheets: reports.flatMap(report => report.sheets),
  };
}

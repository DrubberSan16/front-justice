import { api } from "@/app/http/api";
import { formatHorometerForDisplay } from "@/app/utils/number-format";
import type { WorkOrderReportData } from "@/app/utils/work-order-report-documents";

/**
 * Detalle de una orden de trabajo, resuelto en un solo sitio.
 *
 * Los tableros listaban ordenes pero no dejaban abrirlas: para ver que se hizo
 * habia que salir del tablero, entrar a Ordenes de trabajo y buscar el codigo.
 * Aqui se arma el minimo necesario para responder "que paso en esta orden" sin
 * moverse del tablero, con la misma forma que consume el PDF para que la
 * pantalla y el informe no cuenten cosas distintas.
 */
export type WorkOrderDetailPayload = {
  header: Record<string, any> | null;
  tasks: Record<string, any>[];
  consumptions: Record<string, any>[];
  issues: Record<string, any>[];
  scraps: Record<string, any>[];
  history: Record<string, any>[];
  attachments: Record<string, any>[];
};

const EMPTY_DETAIL: WorkOrderDetailPayload = {
  header: null,
  tasks: [],
  consumptions: [],
  issues: [],
  scraps: [],
  history: [],
  attachments: [],
};

function asList(payload: unknown): Record<string, any>[] {
  if (Array.isArray(payload)) return payload as Record<string, any>[];
  const data = (payload as any)?.data;
  if (Array.isArray(data)) return data as Record<string, any>[];
  return [];
}

/**
 * Las listas anidadas del detalle vienen agrupadas por documento (una entrega
 * con sus items). Lo que interesa es la linea, no la cabecera.
 */
export function flattenDetailLines(rows: Record<string, any>[]) {
  const out: Record<string, any>[] = [];
  for (const row of rows) {
    const items = Array.isArray(row?.items) ? row.items : null;
    if (items?.length) {
      for (const item of items) out.push({ ...row, ...item });
      continue;
    }
    out.push(row);
  }
  return out;
}

async function safeList(url: string) {
  try {
    const { data } = await api.get(url);
    return asList(data?.data ?? data);
  } catch {
    // Un bloque que falla no puede tumbar el detalle completo: la cabecera y
    // el resto siguen siendo utiles.
    return [];
  }
}

export async function fetchWorkOrderDetail(
  workOrderId: string,
): Promise<WorkOrderDetailPayload> {
  const id = String(workOrderId || "").trim();
  if (!id) return { ...EMPTY_DETAIL };

  const [headerResponse, tasks, consumptions, issues, scraps, history, attachments] =
    await Promise.all([
      api.get(`/kpi_maintenance/work-orders/${id}`),
      safeList(`/kpi_maintenance/work-orders/${id}/tareas`),
      safeList(`/kpi_maintenance/work-orders/${id}/consumos`),
      safeList(`/kpi_maintenance/work-orders/${id}/issue-materials`),
      safeList(`/kpi_maintenance/work-orders/${id}/scrap-materials`),
      safeList(`/kpi_maintenance/work-orders/${id}/history`),
      safeList(`/kpi_maintenance/work-orders/${id}/adjuntos`),
    ]);

  return {
    header:
      (headerResponse?.data?.data ?? headerResponse?.data ?? null) || null,
    tasks,
    consumptions,
    issues,
    scraps,
    history,
    attachments,
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function issueConditionLabel(value: unknown) {
  return String(value || "").trim().toUpperCase() === "USADO"
    ? "Usado"
    : "Nuevo";
}

/**
 * Horas reportadas por cada responsable de las tareas de la orden.
 */
export function buildResponsibleHours(tasks: Record<string, any>[]) {
  const byUser = new Map<string, { label: string; hours: number }>();
  for (const task of tasks) {
    const responsables = Array.isArray(task?.responsables)
      ? task.responsables
      : [];
    for (const responsable of responsables) {
      const hours = toNumber(responsable?.horas);
      if (hours <= 0) continue;
      const key = String(
        responsable?.user_id || responsable?.username || responsable?.id || "",
      );
      const label = String(
        responsable?.display_name ||
          responsable?.nameSurname ||
          responsable?.username ||
          "Responsable",
      );
      const current = byUser.get(key) ?? { label, hours: 0 };
      current.hours += hours;
      byUser.set(key, current);
    }
  }
  return [...byUser.values()].sort((a, b) => b.hours - a.hours);
}

/**
 * Materiales de la orden: lo entregado por bodega, en que condicion salio y
 * lo que volvio como chatarra.
 */
export function buildMaterialSummary(
  issues: Record<string, any>[],
  scraps: Record<string, any>[],
  labelOf: (row: Record<string, any>) => string,
  consumptions: Record<string, any>[] = [],
) {
  const rows = new Map<
    string,
    {
      label: string;
      requested: number;
      delivered: number;
      deliveredNuevo: number;
      deliveredUsado: number;
      scrapped: number;
      category: string;
      isSpare: boolean;
    }
  >();
  const emptyRow = (label: string) => ({
    label,
    requested: 0,
    delivered: 0,
    deliveredNuevo: 0,
    deliveredUsado: 0,
    scrapped: 0,
    category: "",
    isSpare: false,
  });

  const classify = (current: ReturnType<typeof emptyRow>, item: Record<string, any>) => {
    const category = String(
      item?.categoria_nombre || item?.categoria_label || item?.producto_categoria || item?.category_name || item?.tipo_material || "",
    ).trim();
    if (category) current.category = category;
    current.isSpare =
      current.isSpare ||
      item?.es_repuesto === true ||
      /REPUEST/.test(`${category} ${current.label}`.toUpperCase());
    if (!current.category && current.isSpare) current.category = "Repuesto";
  };

  for (const item of flattenDetailLines(consumptions)) {
    const label = labelOf(item);
    const current = rows.get(label) ?? emptyRow(label);
    current.requested += toNumber(
      item?.cantidad_solicitada ?? item?.cantidad_reservada ?? item?.cantidad,
    );
    classify(current, item);
    rows.set(label, current);
  }

  for (const item of flattenDetailLines(issues)) {
    const label = labelOf(item);
    const current = rows.get(label) ?? emptyRow(label);
    const cantidad = toNumber(item?.cantidad);
    classify(current, item);
    current.delivered += cantidad;
    if (issueConditionLabel(item?.condicion_material) === "Usado") {
      current.deliveredUsado += cantidad;
    } else {
      current.deliveredNuevo += cantidad;
    }
    rows.set(label, current);
  }

  for (const item of flattenDetailLines(scraps)) {
    const label = labelOf(item);
    const current = rows.get(label) ?? emptyRow(label);
    classify(current, item);
    current.scrapped += toNumber(item?.cantidad);
    rows.set(label, current);
  }

  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function materialConditionLabel(row: {
  deliveredNuevo: number;
  deliveredUsado: number;
}) {
  const nuevo = toNumber(row.deliveredNuevo);
  const usado = toNumber(row.deliveredUsado);
  if (nuevo > 0 && usado > 0) return `${nuevo} nuevo · ${usado} usado`;
  if (usado > 0) return "Usado";
  if (nuevo > 0) return "Nuevo";
  return "Sin salida";
}

export type WorkOrderReportContext = {
  equipmentLabel: string;
  statusLabel: string;
  maintenanceKindLabel: string;
  materialLabel: (row: Record<string, any>) => string;
  formatDate: (value: unknown) => string;
  formatCurrency: (value: unknown) => string;
  showCosts: boolean;
};

/** Arma el payload que consume `buildWorkOrderReportPdfBlob`. */
export function buildWorkOrderReportPayload(
  detail: WorkOrderDetailPayload,
  context: WorkOrderReportContext,
): WorkOrderReportData {
  const header = detail.header ?? {};
  const responsables = buildResponsibleHours(detail.tasks);
  const materiales = buildMaterialSummary(
    detail.issues,
    detail.scraps,
    context.materialLabel,
    detail.consumptions,
  );
  const consumos = flattenDetailLines(detail.consumptions);
  const oilRows = consumos.filter((row) => row?.es_aceite === true);
  const totalCost = flattenDetailLines(detail.issues).reduce(
    (sum, row) => sum + toNumber(row?.costo_unitario) * toNumber(row?.cantidad),
    0,
  );

  return {
    code: String(header?.code || header?.codigo || "-"),
    title: String(header?.title || header?.titulo || "-"),
    equipmentLabel: context.equipmentLabel,
    statusLabel: context.statusLabel,
    maintenanceKindLabel: context.maintenanceKindLabel,
    openedAt: context.formatDate(header?.hora_inicio || header?.created_at),
    closedAt: context.formatDate(header?.hora_fin || header?.closed_at),
    horometroAnterior: formatHorometerForDisplay(header?.horometro_anterior, {
      empty: "-",
    }),
    horometroActual: formatHorometerForDisplay(header?.horometro_actual, {
      empty: "-",
    }),
    totalHours: responsables.reduce((sum, row) => sum + row.hours, 0),
    totalCost: context.showCosts ? context.formatCurrency(totalCost) : "-",
    responsables,
    materiales: materiales.map((row) => ({
      label: row.label,
      delivered: row.delivered,
      condicion: materialConditionLabel(row),
      scrapped: row.scrapped,
    })),
    oilQuantity: oilRows.reduce((sum, row) => sum + toNumber(row?.cantidad), 0),
    oilCost: context.showCosts
      ? context.formatCurrency(
          oilRows.reduce((sum, row) => sum + toNumber(row?.subtotal), 0),
        )
      : "-",
    oilDelivered: oilRows.length > 0,
    createdBy: String(header?.created_by || ""),
    processedBy: String(detail.history[0]?.changed_by || ""),
    updatedBy: String(
      detail.history[detail.history.length - 1]?.changed_by ||
        header?.updated_by ||
        "",
    ),
  };
}

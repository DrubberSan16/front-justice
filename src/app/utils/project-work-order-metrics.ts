import { parseAppDate } from "@/app/utils/date-time";
import { resolveWorkOrderLifecycle } from "@/app/utils/work-order-audit";

/** Días de apertura completos y fracciones; incluye planificación y revisión. */
export function workOrderOpenDays(
  order: Record<string, any>,
  history: Record<string, any>[] = [],
  now = Date.now(),
): number | null {
  const audit = order.valor_json && typeof order.valor_json === "object" ? order.valor_json : {};
  const lifecycle = resolveWorkOrderLifecycle(order, history);
  const start = parseAppDate(order.created_at || audit.created_at || lifecycle.planned.at)?.getTime();
  if (start == null) return null;
  const terminal = !!audit.annulment || /CLOSED|CERRAD|FINALIZ|ANUL|CANCEL|VOID/i.test(
    `${order.status_workflow || ""} ${order.status || ""} ${audit.approval_action || ""}`,
  );
  const end = terminal
    ? parseAppDate(lifecycle.annulled.at || lifecycle.finished.at || order.closed_at)?.getTime()
    : now;
  if (end == null) return null;
  return Math.max(0, Math.min(now, end) - start) / 86400000;
}

export function formatWorkOrderOpenDays(days: number | null): string {
  return days == null ? "Sin fecha de apertura" : `${new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: 2,
  }).format(days)} ${days === 1 ? "día" : "días"}`;
}

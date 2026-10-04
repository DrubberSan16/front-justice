/** Etiquetas visibles: los UUID son referencias internas, no nombres. */
export function reportDisplayLabel(...values: unknown[]): string {
  for (const value of values) {
    const label = String(value ?? "").trim();
    if (!label || /^[0-9a-f]{32}$/i.test(label) ||
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(label)) continue;
    return label;
  }
  return "";
}

export function workOrderHistoryActor(row: Record<string, any> | null | undefined) {
  return reportDisplayLabel(
    row?.changed_by_label, row?.changed_by_name, row?.changed_by_username,
    row?.changed_by, row?.usuario, row?.user,
  );
}

/** El historial de la API llega descendente; el actor se busca por transicion. */
export function resolveWorkOrderReportActors(
  header: Record<string, any> = {},
  history: Record<string, any>[] = [],
) {
  const payload = typeof header.valor_json === "object" && header.valor_json
    ? header.valor_json : {};
  const sorted = [...history].sort((a, b) =>
    new Date(a.changed_at || 0).getTime() - new Date(b.changed_at || 0).getTime());
  const statusOf = (row: Record<string, any>) => String(
    row.to_status || row.new_status || row.estado_nuevo || row.status || "",
  ).toUpperCase();
  const created = sorted.find((row) => /PLANNED|PLANIFICAD/.test(statusOf(row)));
  const processed = sorted.find((row) => /IN.?PROGRESS|EN.?PROCESO/.test(statusOf(row)));
  const approved = [...sorted].reverse().find((row) =>
    /CLOSED|FINALIZ|CERRAD|ANUL|CANCEL/.test(statusOf(row)));
  return {
    createdBy: reportDisplayLabel(
      header.created_by_label, payload.created_by_name, header.created_by_username,
      payload.created_by_username, header.created_by, workOrderHistoryActor(created),
    ),
    processedBy: reportDisplayLabel(
      payload.execution_start?.by_name, payload.execution_start?.by_username,
      workOrderHistoryActor(processed),
      header.processed_by_label, payload.processed_by_name, header.processed_by_username,
      payload.processed_by_username,
    ),
    approvedBy: reportDisplayLabel(
      header.approved_by_label, payload.approved_by_name, header.approved_by_username,
      payload.approved_by_username, workOrderHistoryActor(approved),
    ),
    updatedBy: reportDisplayLabel(
      header.updated_by_label, header.updated_by,
      workOrderHistoryActor(sorted[sorted.length - 1]),
    ),
  };
}

/** Hechos del flujo: las ediciones de tareas no cambian quien inició la OT. */
export function resolveWorkOrderLifecycle(header: Record<string, any> = {}, history: Record<string, any>[] = []) {
  const audit = header.valor_json && typeof header.valor_json === "object" ? header.valor_json : {};
  const actors = resolveWorkOrderReportActors(header, history);
  const sorted = [...history].sort((a, b) => new Date(a.changed_at || 0).getTime() - new Date(b.changed_at || 0).getTime());
  const annulledEvent = (row: Record<string, any>) => /ANUL|CANCEL|VOID/i.test(`${row.to_status || ""} ${row.note || ""}`);
  const transition = (row: Record<string, any>, state: string) => row.to_status === state && row.from_status !== state;
  const planned = sorted.find(row => transition(row, "PLANNED"));
  const started = sorted.find(row => transition(row, "IN_PROGRESS"));
  const finished = [...sorted].reverse().find(row => transition(row, "CLOSED") && !annulledEvent(row));
  const annulled = [...sorted].reverse().find(annulledEvent);
  const isAnnulled = !!audit.annulment || /ANUL|CANCEL|VOID/i.test(String(audit.approval_action || header.status));
  const isClosed = header.status_workflow === "CLOSED";
  return {
    planned: { by: actors.createdBy || workOrderHistoryActor(planned), at: audit.planned_at || header.created_at || planned?.changed_at || audit.created_at || null },
    started: { by: reportDisplayLabel(audit.execution_start?.by_name, audit.execution_start?.by_username, workOrderHistoryActor(started), actors.processedBy), at: audit.execution_start?.at || started?.changed_at || (header.started_at && header.started_at !== header.closed_at ? header.started_at : null) },
    finished: { by: workOrderHistoryActor(finished) || (!isAnnulled && isClosed ? actors.approvedBy : ""), at: finished?.changed_at || (!isAnnulled && isClosed ? header.closed_at || audit.approved_at : null) },
    annulled: { by: reportDisplayLabel(audit.annulment?.annulled_by_name, workOrderHistoryActor(annulled), isAnnulled ? actors.approvedBy : "", audit.annulment?.annulled_by), at: audit.annulment?.annulled_at || annulled?.changed_at || (isAnnulled ? header.closed_at : null) },
  };
}

/** Un mismo texto legible en pantalla, PDF y Excel. */
export function formatWorkOrderHistoryNote(value: unknown): string {
  if (value == null) return "";
  let text = typeof value === "object" ? String((value as any).descripcion || (value as any).note || (value as any).mensaje || "") : String(value);
  if (/^\s*\{/.test(text)) {
    try { const data = JSON.parse(text); text = String(data.descripcion || data.note || data.mensaje || "Movimiento registrado"); } catch { /* Conserva el texto histórico. */ }
  }
  const labels: Record<string, string> = { PLANNED: "Planificada", IN_PROGRESS: "En proceso", REVIEW: "En revisión", BLOCKED: "Bloqueada", CLOSED: "Finalizada" };
  return text.replace(/\b(PLANNED|IN_PROGRESS|REVIEW|BLOCKED|CLOSED)\b/g, state => labels[state] || state)
    .replace(/(?:\\r\\n|\\n|\r?\n|\s*\|\s*)+/g, "; ")
    .replace(/\s*(?:→|->)\s*/g, " a ")
    .replace(/\[WO:[^\]]+\]/gi, "")
    .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, "registro")
    .replace(/\s+/g, " ").replace(/(?:;\s*){2,}/g, "; ").trim();
}

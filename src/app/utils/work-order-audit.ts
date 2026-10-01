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
      header.processed_by_label, payload.processed_by_name, header.processed_by_username,
      payload.processed_by_username, workOrderHistoryActor(processed),
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

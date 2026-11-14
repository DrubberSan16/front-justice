type Detail = {
  producto_id?: string;
  condicion_material?: string | null;
  cantidad?: string | number | null;
};

export function canEditWarehouseTransfer(transfer: {
  puede_editar?: boolean;
  guia_remision_id?: string | null;
  estado?: string | null;
}) {
  return transfer.puede_editar === true && !transfer.guia_remision_id
    && transfer.estado === "PENDIENTE_RECEPCION";
}

/** Suma la reserva de la propia TB al disponible mostrado al editarla. */
export function ownTransferReservation(details: Detail[], productId: string) {
  const result = { nuevo: 0, usado: 0, critico: 0, total: 0 };
  for (const detail of details) {
    if (detail.producto_id !== productId) continue;
    const quantity = Number(detail.cantidad || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const condition = String(detail.condicion_material || "NUEVO").toUpperCase();
    if (condition === "USADO") result.usado += quantity;
    else if (condition === "CRITICO") result.critico += quantity;
    else result.nuevo += quantity;
    result.total += quantity;
  }
  return result;
}

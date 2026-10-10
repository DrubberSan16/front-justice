export type ReceiptAttachment = {
  nombre: string;
  mime_type: string;
  contenido_base64: string;
  tamano: number;
};

export type ReceptionLine = {
  transferencia_detalle_id: string;
  codigo_producto: string;
  nombre_producto: string;
  condicion_material: string;
  cantidad_enviada: number;
  cantidad_aprobada: number;
  cantidad_pendiente: number;
  llego: boolean | null;
  cantidad_recibida: string;
  observacion: string;
  adjuntos: ReceiptAttachment[];
};

export const RECEPTION_FILE_LIMIT = 5 * 1024 * 1024;
export const RECEPTION_TOTAL_FILE_LIMIT = 20 * 1024 * 1024;
export const RECEPTION_FILES_PER_MATERIAL = 5;
export const RECEPTION_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function receptionNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function transferStateLabel(state: unknown): string {
  const key = String(state ?? "").trim().toUpperCase();
  return ({ PENDIENTE_RECEPCION: "Pendiente de recepción", PARCIALMENTE_RECIBIDA: "Recepción parcial",
    COMPLETADA: "Completada", ANULADA: "Anulada", BORRADOR: "Revisión guardada",
    APROBADA: "Recepción aprobada", CANCELADA: "Revisión descartada" } as Record<string, string>)[key] ?? (key || "Sin estado");
}

export function transferStateColor(state: unknown): string {
  return ({ PENDIENTE_RECEPCION: "warning", PARCIALMENTE_RECIBIDA: "info", COMPLETADA: "success",
    ANULADA: "error", BORRADOR: "warning", APROBADA: "success", CANCELADA: "secondary" } as Record<string, string>)[String(state ?? "").toUpperCase()] ?? "secondary";
}

export function isTransferCompleted(state: unknown): boolean {
  return ["COMPLETADA", "COMPLETADO", "FINALIZADA", "FINALIZADO", "APROBADA", "APROBADO"].includes(String(state ?? "").toUpperCase());
}

export function transferReceiptTotals(transfer: any) {
  const details = Array.isArray(transfer.detalles) ? transfer.detalles : [];
  const sent = receptionNumber(transfer.total_cantidad ?? details.reduce((sum: number, detail: any) => sum + receptionNumber(detail.cantidad), 0));
  const received = receptionNumber(transfer.total_cantidad_recibida ?? (details.length
    ? details.reduce((sum: number, detail: any) => sum + receptionNumber(detail.cantidad_recibida ?? (isTransferCompleted(transfer.estado) ? detail.cantidad : 0)), 0)
    : isTransferCompleted(transfer.estado) ? sent : 0));
  const pending = String(transfer.estado).toUpperCase() === "ANULADA" ? 0
    : receptionNumber(transfer.total_cantidad_pendiente ?? Math.max(0, sent - received));
  return { sent, received, pending };
}

export function makeReceptionLines(details: any[]): ReceptionLine[] {
  return details.map(detail => ({
    transferencia_detalle_id: String(detail.id ?? ""),
    codigo_producto: String(detail.codigo_producto ?? ""),
    nombre_producto: String(detail.nombre_producto ?? ""),
    condicion_material: String(detail.condicion_material ?? "NUEVO"),
    cantidad_enviada: receptionNumber(detail.cantidad),
    cantidad_aprobada: receptionNumber(detail.cantidad_recibida),
    cantidad_pendiente: Math.max(0, receptionNumber(detail.cantidad_pendiente ?? (receptionNumber(detail.cantidad) - receptionNumber(detail.cantidad_recibida)))),
    llego: null,
    cantidad_recibida: "",
    observacion: "",
    adjuntos: [],
  })).filter(line => line.cantidad_pendiente > 0);
}

export function validateReception(lines: ReceptionLine[]): string {
  if (!lines.length) return "Esta transferencia no tiene materiales pendientes de recepción.";
  let bytes = 0;
  for (const line of lines) {
    const label = line.codigo_producto || line.nombre_producto || "Material";
    if (!line.transferencia_detalle_id) return `${label}: falta el identificador del detalle. Recarga la transferencia.`;
    if (line.llego === null) return `${label}: indica si llegó o no llegó.`;
    const raw = String(line.cantidad_recibida).trim();
    const qty = Number(raw);
    if (line.llego && (!raw || !Number.isFinite(qty) || qty <= 0 || qty > line.cantidad_pendiente)) {
      return `${label}: la cantidad recibida debe ser mayor a cero y no superar ${line.cantidad_pendiente}.`;
    }
    if (line.llego && Math.abs(qty - Number(qty.toFixed(6))) > 0.000000001) return `${label}: utiliza hasta seis decimales en la cantidad recibida.`;
    if (line.adjuntos.length > RECEPTION_FILES_PER_MATERIAL) return `${label}: puedes adjuntar hasta cinco archivos por material.`;
    for (const file of line.adjuntos) {
      if (!file.nombre.trim() || file.nombre.length > 200) return `${label}: el nombre del adjunto debe tener entre 1 y 200 caracteres.`;
      if (!RECEPTION_MIME_TYPES.includes(file.mime_type) || file.tamano > RECEPTION_FILE_LIMIT || !file.contenido_base64) {
        return `${label}: utiliza PDF, JPG o PNG de hasta 5 MB.`;
      }
      bytes += file.tamano;
    }
  }
  return bytes > RECEPTION_TOTAL_FILE_LIMIT ? "Los adjuntos de la recepción no pueden superar 20 MB en total." : "";
}

export function receptionPayload(lines: ReceptionLine[], idempotencyKey: string, observation: string) {
  return {
    idempotency_key: idempotencyKey,
    observacion: observation.trim() || undefined,
    detalles: lines.map(line => ({
      transferencia_detalle_id: line.transferencia_detalle_id,
      llego: line.llego === true,
      cantidad_recibida: line.llego === true ? Number(line.cantidad_recibida) : 0,
      observacion: line.observacion.trim() || undefined,
      adjuntos: line.adjuntos.map(({ nombre, mime_type, contenido_base64 }) => ({ nombre, mime_type, contenido_base64 })),
    })),
  };
}

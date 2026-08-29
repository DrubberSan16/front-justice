/**
 * Estados de negocio que marcan un documento como anulado. Debe mantenerse
 * alineado con `ANNULLED_STATES` del backend (kpi-inventory).
 */
export const ANNULLED_STATE_VALUES = [
  "ANULADA",
  "ANULADO",
  "CANCELADA",
  "CANCELADO",
  "VOID",
  "VOIDED",
];

export function isAnnulledStateValue(value: unknown): boolean {
  return ANNULLED_STATE_VALUES.includes(
    String(value ?? "").trim().toUpperCase(),
  );
}

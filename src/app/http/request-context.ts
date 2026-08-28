/**
 * Contexto de la solicitud que acompana a un log transaccional: metodo HTTP,
 * endpoint y datos enviados. Permite que la bitacora guarde el error junto a la
 * peticion que lo provoco, en vez de solo el mensaje.
 */
export type LogTransactRequestContext = {
  requestMethod?: string | null;
  requestUrl?: string | null;
  requestPayload?: unknown;
};

export function normalizeRequestPayload(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  }

  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return { formData: Array.from(value.keys()) };
  }

  return value;
}

export function buildRequestContext(
  error: any,
  payload?: unknown,
): LogTransactRequestContext {
  const config = error?.config ?? {};
  const method = String(config?.method || "").toUpperCase();
  const url = String(config?.url || "").trim();

  return {
    requestMethod: method || null,
    requestUrl: url || null,
    requestPayload: normalizeRequestPayload(
      payload !== undefined ? payload : config?.data,
    ),
  };
}

const MATERIAL_COST_KEY =
  /costo|precio|subtotal|monto|utilidad|descuento|iva_total|valor_(?:unitario|total)|total_cost|unit_cost/i;
const CONTEXTUAL_MATERIAL_COST_KEY = /^(?:total|iva|iva_porcentaje|tipo_cambio)$/i;

export function isMaterialCostKey(key: unknown): boolean {
  return MATERIAL_COST_KEY.test(String(key || ""));
}

/**
 * Defensa adicional del cliente: aunque un servicio nuevo olvide aplicar el
 * filtro, los importes no quedan disponibles en el estado de la aplicación.
 */
export function stripMaterialCosts<T>(payload: T): T {
  const seen = new WeakMap<object, unknown>();

  const clean = (value: any): any => {
    if (
      value == null ||
      typeof value !== "object" ||
      value instanceof Date ||
      (typeof Blob !== "undefined" && value instanceof Blob) ||
      (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer)
    ) {
      return value;
    }
    if (seen.has(value)) return seen.get(value);
    if (Array.isArray(value)) {
      const copy: any[] = [];
      seen.set(value, copy);
      for (const item of value) copy.push(clean(item));
      return copy;
    }
    const copy: Record<string, unknown> = {};
    seen.set(value, copy);
    const monetaryObject = Object.keys(value).some((key) => isMaterialCostKey(key));
    for (const [key, item] of Object.entries(value)) {
      if (
        !isMaterialCostKey(key) &&
        !(monetaryObject && CONTEXTUAL_MATERIAL_COST_KEY.test(key))
      )
        copy[key] = clean(item);
    }
    return copy;
  };

  return clean(payload) as T;
}

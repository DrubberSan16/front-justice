function hasOilIndicator(label: string) {
  return /\(\s*aceite\s*\)/i.test(label);
}

function resolveProductBaseName(
  item: Record<string, any> | null | undefined,
  fallbackLabel?: unknown,
) {
  return String(
    item?.nombre ??
      item?.producto_nombre ??
      item?.producto_label ??
      item?.title ??
      fallbackLabel ??
      item?.codigo ??
      item?.id ??
      "",
  ).trim();
}

export function appendOilIndicator(label: unknown, esAceite?: unknown) {
  const base = String(label ?? "").trim();
  if (!base) return base;
  if (!esAceite || hasOilIndicator(base)) return base;
  return `${base} (Aceite)`;
}

export function resolveProductDisplayName(
  item: Record<string, any> | null | undefined,
  fallbackLabel?: unknown,
) {
  const baseLabel = resolveProductBaseName(item, fallbackLabel);
  return appendOilIndicator(baseLabel, item?.es_aceite);
}

export function buildProductDisplayTitle(
  item: Record<string, any> | null | undefined,
  options?: {
    includeCode?: boolean;
    fallbackLabel?: unknown;
  },
) {
  const includeCode = options?.includeCode !== false;
  const code = String(item?.codigo ?? "").trim();
  const name = resolveProductBaseName(item, options?.fallbackLabel);
  const description = String(
    item?.descripcion ?? item?.producto_descripcion ?? item?.descripcion_producto ?? "",
  ).trim();
  const base = includeCode && code ? `${code}-${name}` : name || code;
  const withDescription = description ? `${base} (${description})` : base;
  return appendOilIndicator(withDescription, item?.es_aceite);
}

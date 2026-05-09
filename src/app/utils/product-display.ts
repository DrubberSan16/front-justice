function hasOilIndicator(label: string) {
  return /\(\s*aceite\s*\)/i.test(label);
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
  const baseLabel =
    item?.nombre ??
    item?.producto_nombre ??
    item?.producto_label ??
    item?.title ??
    fallbackLabel ??
    item?.codigo ??
    item?.id ??
    "";
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
  const label = resolveProductDisplayName(item, options?.fallbackLabel);
  if (!includeCode || !code) return label;
  return `${code} - ${label}`;
}

type EquipmentLike = Record<string, any> | null | undefined;

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text !== "[object Object]") return text;
  }
  return "";
}

export function resolveEquipmentBrand(item: EquipmentLike) {
  return firstText(
    item?.marca_nombre,
    item?.brand_name,
    item?.equipment_brand_name,
    item?.equipo_marca,
    item?.equipment_marca,
    item?.sample_info?.equipo_marca,
  );
}

export function resolveEquipmentName(item: EquipmentLike) {
  return firstText(
    item?.equipment_nombre,
    item?.equipo_nombre,
    item?.equipment_name,
    item?.nombre,
    item?.nombre_real,
    item?.operational_name,
    item?.display_name,
  );
}

export function resolveEquipmentModel(item: EquipmentLike) {
  return firstText(
    item?.equipment_modelo,
    item?.equipo_modelo,
    item?.equipment_model,
    item?.modelo,
    item?.model,
    item?.sample_info?.equipo_modelo,
  );
}

export function buildEquipmentDisplayTitle(item: EquipmentLike) {
  const brand = resolveEquipmentBrand(item) || "Sin marca";
  const name = resolveEquipmentName(item) || "Equipo sin nombre";
  const model = resolveEquipmentModel(item);
  const base = `${brand} - ${name}`;
  return model ? `${base} (${model})` : base;
}

type EquipmentLike = Record<string, any> | null | undefined;

/** Separa la etiqueta histórica del reporte sin dividir los guiones de la unidad. */
export function splitEquipmentReportLabel(label: string) {
  const separator = label.lastIndexOf("·");
  const identity = (separator >= 0 ? label.slice(0, separator) : label).trim();
  const locationLabel = separator >= 0 ? label.slice(separator + 1).trim() : "";
  const brandSeparator = identity.indexOf("|");
  const locationParts = locationLabel.match(/^((?:UBI|LOC)-\S+)\s+-\s+(.+)$/i);
  return {
    brand: brandSeparator >= 0 ? identity.slice(0, brandSeparator).trim() || "Sin marca" : "Sin marca",
    unit: (brandSeparator >= 0 ? identity.slice(brandSeparator + 1).trim() : identity) || "Sin unidad",
    location: locationParts?.[1] || locationLabel || "Sin ubicación",
    central: locationParts?.[2] || (locationLabel && !/^(?:UBI|LOC)-\S+$/i.test(locationLabel) ? locationLabel : "Sin central"),
  };
}

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
  const title = model ? `${base} (${model})` : base;
  const location = resolveEquipmentLocation(item);
  return location ? `${title} · ${location}` : title;
}

export function resolveEquipmentLocation(item: EquipmentLike) {
  return firstText(item?.equipment_location_label, item?.ubicacion_label, item?.location_label,
    item?.central, item?.location?.nombre, item?.sample_info?.equipo_ubicacion);
}

/**
 * Etiqueta de equipo de los tableros: `marca | nombre - modelo (nombre real)`.
 *
 * Replica `buildEquipmentManagerLabel` de kpi-maintenance, para que una tabla
 * armada en el navegador diga lo mismo que las que ya llegan hechas del
 * servidor. Recibe una fila del catalogo de equipos, que trae `marca_nombre`.
 */
export function buildEquipmentManagerLabel(item: EquipmentLike) {
  const brand = firstText(item?.marca_nombre);
  const realName = firstText(item?.nombre_real);
  const identity = [firstText(item?.nombre), firstText(item?.modelo)]
    .filter(Boolean)
    .join(" - ");
  if (!identity) return realName || brand;
  const withBrand = brand ? `${brand} | ${identity}` : identity;
  const title = realName ? `${withBrand} (${realName})` : withBrand;
  const location = resolveEquipmentLocation(item);
  return location ? `${title} · ${location}` : title;
}

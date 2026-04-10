export const lubricantConditionOptions = [
    { value: "NORMAL", title: "NORMAL" },
    { value: "ANORMAL", title: "ANORMAL" },
    { value: "PRECAUCION", title: "PRECAUCION" },
    { value: "N/D", title: "N/D" },
];
export const humidityOptions = [
    { value: "NEGATIVO", title: "NEGATIVO" },
    { value: "POSITIVO", title: "POSITIVO" },
];
export const positiveNegativeOptions = [
    { value: "NEGATIVO", title: "NEGATIVO" },
    { value: "POSITIVO", title: "POSITIVO" },
];
export const lubricantCompartments = [
    "MOTOR",
    "HIDRAULICO",
    "TRANSMISION",
    "INDUSTRTIAL",
    "DIFERENCIAL DELANTERO",
    "DIFERENCIAL POSTERIOR",
    "SWING",
    "ENGRANAJE DE LA BOMBA",
    "MANDO FINAL DERECHO",
    "MANDO FINAL IZQUIERDO",
    "TANDEM DERECHO",
    "TANDEM IZQUIERDO",
];
export const lubricantParameterTemplates = [
    { key: "VISCOSIDAD_100C", label: "Viscosidad a 100C, cSt", group: "Estado del lubricante", unit: "cSt", order: 1, inputType: "number" },
    { key: "VISCOSIDAD_40C", label: "Viscosidad a 40C, cSt", group: "Estado del lubricante", unit: "cSt", order: 2, inputType: "number" },
    { key: "INDICE_VISCOSIDAD", label: "Indice de viscosidad", group: "Estado del lubricante", order: 3, inputType: "number" },
    { key: "TBN", label: "T.B.N. mgKOH/gr", group: "Estado del lubricante", unit: "mgKOH/gr", order: 4, inputType: "number" },
    { key: "HUMEDAD", label: "Humedad", group: "Estado del lubricante", order: 5, inputType: "select", options: humidityOptions.map((item) => item.value) },
    { key: "GLYCOL", label: "Glycol, Abs/cm", group: "Estado del lubricante", unit: "Abs/cm", order: 6, inputType: "number" },
    { key: "COMBUSTIBLE", label: "Combustible", group: "Estado del lubricante", order: 7, inputType: "select", options: positiveNegativeOptions.map((item) => item.value) },
    { key: "OXIDACION", label: "Oxidacion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 101, inputType: "number" },
    { key: "NITRACION", label: "Nitracion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 102, inputType: "number" },
    { key: "SULFATACION", label: "Sulfatacion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 103, inputType: "number" },
    { key: "HOLLIN", label: "Hollin, wt%", group: "Degradacion quimica", unit: "wt%", order: 104, inputType: "number" },
    { key: "SI", label: "Si (Silicio)", group: "Contaminacion del lubricante", unit: "ppm", order: 201, inputType: "number" },
    { key: "NA", label: "Na (Sodio)", group: "Contaminacion del lubricante", unit: "ppm", order: 202, inputType: "number" },
    { key: "V", label: "Vanadio (V)", group: "Contaminacion del lubricante", unit: "ppm", order: 203, inputType: "number" },
    { key: "NI", label: "Ni (Niquel)", group: "Contaminacion del lubricante", unit: "ppm", order: 204, inputType: "number" },
    { key: "FE", label: "Fe (Hierro)", group: "Desgaste del equipo", unit: "ppm", order: 301, inputType: "number" },
    { key: "CR", label: "Cr (Cromo)", group: "Desgaste del equipo", unit: "ppm", order: 302, inputType: "number" },
    { key: "AL", label: "Al (Aluminio)", group: "Desgaste del equipo", unit: "ppm", order: 303, inputType: "number" },
    { key: "CU", label: "Cu (Cobre)", group: "Desgaste del equipo", unit: "ppm", order: 304, inputType: "number" },
    { key: "PB", label: "Pb (Plomo)", group: "Desgaste del equipo", unit: "ppm", order: 305, inputType: "number" },
    { key: "SN", label: "Estano (Sn)", group: "Desgaste del equipo", unit: "ppm", order: 306, inputType: "number" },
    { key: "MO", label: "Mo (Molibdeno)", group: "Otros elementos", unit: "ppm", order: 401, inputType: "number" },
    { key: "B", label: "B (Boro)", group: "Otros elementos", unit: "ppm", order: 402, inputType: "number" },
    { key: "BA", label: "Ba (Bario)", group: "Otros elementos", unit: "ppm", order: 403, inputType: "number" },
    { key: "TI", label: "Ti (Titanio)", group: "Otros elementos", unit: "ppm", order: 404, inputType: "number" },
    { key: "AG", label: "Ag (Plata)", group: "Otros elementos", unit: "ppm", order: 405, inputType: "number" },
    { key: "CA", label: "Ca (Calcio)", group: "Presencia de aditivos", unit: "ppm", order: 501, inputType: "number" },
    { key: "MG", label: "Mg (Magnesio)", group: "Presencia de aditivos", unit: "ppm", order: 502, inputType: "number" },
    { key: "ZN", label: "Zn (Zinc)", group: "Presencia de aditivos", unit: "ppm", order: 503, inputType: "number" },
    { key: "P", label: "P (Fosforo)", group: "Presencia de aditivos", unit: "ppm", order: 504, inputType: "number" },
];
function normalizeToken(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}
export function getLubricantParameterTemplate(parametro) {
    const normalized = normalizeToken(parametro);
    if (!normalized)
        return null;
    return (lubricantParameterTemplates.find((item) => normalizeToken(item.key) === normalized || normalizeToken(item.label) === normalized) ?? null);
}
export function buildLubricantDetailTemplate(compartment) {
    return lubricantParameterTemplates.map((item) => ({
        compartimento: compartment || "GENERAL",
        parametro: item.label,
        parametro_key: item.key,
        unidad: item.unit ?? "",
        resultado_numerico: null,
        resultado_texto: "",
        orden: item.order,
    }));
}
export function mergeLubricantDetails(compartment, existingDetails = []) {
    const existingMap = new Map();
    for (const detail of existingDetails) {
        const template = getLubricantParameterTemplate(detail.parametro_key || detail.parametro_label || detail.parametro);
        const key = template?.key || normalizeToken(detail.parametro);
        if (!key)
            continue;
        existingMap.set(key, detail);
    }
    return buildLubricantDetailTemplate(compartment).map((base) => {
        const template = getLubricantParameterTemplate(base.parametro_key);
        const key = template?.key || normalizeToken(base.parametro);
        const current = existingMap.get(key) ?? {};
        return {
            ...base,
            ...current,
            compartimento: compartment || current.compartimento || "GENERAL",
            parametro: template?.label || current.parametro || base.parametro,
            parametro_key: template?.key || current.parametro_key || base.parametro_key,
            unidad: template?.unit ?? current.unidad ?? base.unidad,
            orden: template?.order ?? current.orden ?? base.orden,
            resultado_numerico: current.resultado_numerico == null || current.resultado_numerico === ""
                ? null
                : Number(current.resultado_numerico),
            resultado_texto: current.resultado_texto == null ? "" : String(current.resultado_texto),
        };
    });
}
export function groupLubricantDetails(details) {
    const grouped = new Map();
    for (const detail of details) {
        const template = getLubricantParameterTemplate(detail.parametro_key || detail.parametro) ?? null;
        const key = template?.group ?? detail.grupo ?? "Otros elementos";
        if (!grouped.has(key))
            grouped.set(key, []);
        grouped.get(key)?.push(Object.assign(detail, {
            parametro: template?.label ?? detail.parametro,
            parametro_key: template?.key ?? detail.parametro_key,
            unidad: template?.unit ?? detail.unidad ?? "",
            inputType: template?.inputType ?? "number",
            options: template?.options ?? [],
        }));
    }
    return [...grouped.entries()].map(([group, items]) => ({
        group,
        items: [...items].sort((a, b) => Number(a.orden ?? 999) - Number(b.orden ?? 999)),
    }));
}

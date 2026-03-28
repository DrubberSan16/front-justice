export type LubricantParameterTemplate = {
  key: string;
  label: string;
  group: string;
  unit?: string;
  order: number;
};

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

export const lubricantParameterTemplates: LubricantParameterTemplate[] = [
  { key: "VISCOSIDAD_100C", label: "Viscosidad a 100ºC, cSt", group: "Estado del lubricante", unit: "cSt", order: 1 },
  { key: "VISCOSIDAD_40C", label: "Viscosidad a 40ºC, cSt", group: "Estado del lubricante", unit: "cSt", order: 2 },
  { key: "INDICE_VISCOSIDAD", label: "Indice de Viscosidad", group: "Estado del lubricante", order: 3 },
  { key: "TBN", label: "T.B.N. mgKOH/gr", group: "Estado del lubricante", unit: "mgKOH/gr", order: 4 },
  { key: "HUMEDAD", label: "Humedad", group: "Estado del lubricante", order: 5 },
  { key: "GLYCOL", label: "Glycol, Abs/cm", group: "Estado del lubricante", unit: "Abs/cm", order: 6 },
  { key: "COMBUSTIBLE", label: "Combustible", group: "Estado del lubricante", order: 7 },
  { key: "OXIDACION", label: "Oxidacion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 101 },
  { key: "NITRACION", label: "Nitracion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 102 },
  { key: "SULFATACION", label: "Sulfatacion, Abs/cm", group: "Degradacion quimica", unit: "Abs/cm", order: 103 },
  { key: "HOLLIN", label: "Hollin, wt%", group: "Degradacion quimica", unit: "wt%", order: 104 },
  { key: "SI", label: "Si (Silicio)", group: "Contaminacion del lubricante", unit: "ppm", order: 201 },
  { key: "NA", label: "Na (Sodio)", group: "Contaminacion del lubricante", unit: "ppm", order: 202 },
  { key: "V", label: "Vanadio (V)", group: "Contaminacion del lubricante", unit: "ppm", order: 203 },
  { key: "NI", label: "Ni (Niquel)", group: "Contaminacion del lubricante", unit: "ppm", order: 204 },
  { key: "FE", label: "Fe (Hierro)", group: "Desgaste del equipo", unit: "ppm", order: 301 },
  { key: "CR", label: "Cr (Cromo)", group: "Desgaste del equipo", unit: "ppm", order: 302 },
  { key: "AL", label: "Al (Aluminio)", group: "Desgaste del equipo", unit: "ppm", order: 303 },
  { key: "CU", label: "Cu (Cobre)", group: "Desgaste del equipo", unit: "ppm", order: 304 },
  { key: "PB", label: "Pb (Plomo)", group: "Desgaste del equipo", unit: "ppm", order: 305 },
  { key: "SN", label: "Estaño (Sn)", group: "Desgaste del equipo", unit: "ppm", order: 306 },
  { key: "MO", label: "Mo (Molibdeno)", group: "Otros elementos", unit: "ppm", order: 401 },
  { key: "B", label: "B (Boro)", group: "Otros elementos", unit: "ppm", order: 402 },
  { key: "BA", label: "Ba (Bario)", group: "Otros elementos", unit: "ppm", order: 403 },
  { key: "TI", label: "Ti (Titanio)", group: "Otros elementos", unit: "ppm", order: 404 },
  { key: "AG", label: "Ag (Plata)", group: "Otros elementos", unit: "ppm", order: 405 },
  { key: "CA", label: "Ca (Calcio)", group: "Presencia de aditivos", unit: "ppm", order: 501 },
  { key: "MG", label: "Mg (Magnesio)", group: "Presencia de aditivos", unit: "ppm", order: 502 },
  { key: "ZN", label: "Zn (Zinc)", group: "Presencia de aditivos", unit: "ppm", order: 503 },
  { key: "P", label: "P (Fosforo)", group: "Presencia de aditivos", unit: "ppm", order: 504 },
];

export function buildLubricantDetailTemplate(compartment: string) {
  return lubricantParameterTemplates.map((item) => ({
    compartimento: compartment || "GENERAL",
    parametro: item.label,
    unidad: item.unit ?? "",
    linea_base: null,
    resultado_numerico: null,
    resultado_texto: "",
    nivel_alerta: "NORMAL",
    tendencia: null,
    observacion: "",
    orden: item.order,
  }));
}

export function groupLubricantDetails(details: Record<string, any>[]) {
  const grouped = new Map<string, Record<string, any>[]>();
  for (const detail of details) {
    const template =
      lubricantParameterTemplates.find((item) => item.label === detail.parametro) ?? null;
    const key = template?.group ?? detail.grupo ?? "Otros elementos";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(detail);
  }
  return [...grouped.entries()].map(([group, items]) => ({
    group,
    items: [...items].sort((a, b) => Number(a.orden ?? 999) - Number(b.orden ?? 999)),
  }));
}

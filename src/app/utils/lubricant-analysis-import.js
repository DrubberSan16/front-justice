import * as XLSX from "xlsx";
import { getLubricantParameterTemplate, lubricantCompartments, lubricantConditionOptions, } from "@/app/config/lubricant-analysis";
const SAMPLE_ROW_LABELS = {
    numero_muestra: "NUMERACION DE MUESTRA",
    fecha_muestra: "FECHA DE MUESTREO",
    fecha_ingreso: "FECHA DE INGRESO",
    fecha_informe: "FECHA DE INFORME",
    horas_equipo: "EQUIPO HRS/ KM",
    horas_lubricante: "ACEITE HRS/ KM",
    condicion: "CONDICION",
};
function normalizeToken(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}
function slugifyCode(value) {
    return normalizeToken(value).replace(/[^A-Z0-9]/g, "");
}
function decodeRange(sheet) {
    const ref = sheet["!ref"] || "A1:A1";
    return XLSX.utils.decode_range(ref);
}
function sheetCellValue(sheet, rowIndex, columnIndex) {
    const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
    return cell?.v ?? null;
}
function sheetCellText(sheet, rowIndex, columnIndex) {
    const value = sheetCellValue(sheet, rowIndex, columnIndex);
    return String(value ?? "").trim();
}
function asDateOnly(value) {
    if (value == null || value === "")
        return null;
    if (typeof value === "number") {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (!parsed)
            return null;
        const year = String(parsed.y).padStart(4, "0");
        const month = String(parsed.m).padStart(2, "0");
        const day = String(parsed.d).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    const raw = String(value).trim();
    if (!raw)
        return null;
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, year = "", month = "", day = ""] = isoMatch;
        return `${year}-${month}-${day}`;
    }
    const slashMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (slashMatch) {
        const [, rawDay = "", rawMonth = "", rawYear = ""] = slashMatch;
        const day = rawDay.padStart(2, "0");
        const month = rawMonth.padStart(2, "0");
        const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
        return `${year}-${month}-${day}`;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return null;
    return parsed.toISOString().slice(0, 10);
}
function asNullableNumber(value) {
    if (value == null || value === "")
        return null;
    const parsed = Number(String(value).replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : null;
}
function findRowByLabel(sheet, label) {
    const range = decodeRange(sheet);
    const target = normalizeToken(label);
    for (let row = range.s.r; row <= Math.min(range.e.r, 120); row += 1) {
        const current = normalizeToken(sheetCellValue(sheet, row, 1));
        if (!current)
            continue;
        if (current === target)
            return row;
    }
    return null;
}
function findTextNearLabel(sheet, labelRow, labelColumn) {
    for (let column = labelColumn + 1; column <= labelColumn + 6; column += 1) {
        const value = sheetCellText(sheet, labelRow, column);
        if (value)
            return value;
    }
    return null;
}
function resolveWorkbookEquipmentHint(workbook, fileName) {
    const datosSheet = workbook.Sheets["Datos"];
    const bySheet = datosSheet ? sheetCellText(datosSheet, 27, 8) : "";
    if (bySheet)
        return bySheet;
    const match = String(fileName || "")
        .toUpperCase()
        .match(/UGN?\s*[- ]?\s*0*(\d{1,3})/);
    if (match) {
        const [, rawCode = ""] = match;
        return `UG ${rawCode.padStart(2, "0")}`;
    }
    return "";
}
function resolveEquipment(hint, equipments, brandsById) {
    const normalizedHint = slugifyCode(hint);
    if (!normalizedHint) {
        return {
            equipo: null,
            equipo_marca: "",
            equipo_codigo: "",
            equipo_nombre: "",
        };
    }
    const equipment = equipments.find((item) => slugifyCode(item.codigo) === normalizedHint) ||
        equipments.find((item) => slugifyCode(item.nombre).includes(normalizedHint)) ||
        equipments.find((item) => normalizedHint.includes(slugifyCode(item.codigo)));
    return {
        equipo: equipment ?? null,
        equipo_marca: String(equipment?.marca_nombre ?? "").trim() ||
            String(brandsById.get(String(equipment?.marca_id || "")) ?? "").trim(),
        equipo_codigo: String(equipment?.codigo ?? hint ?? "").trim(),
        equipo_nombre: String(equipment?.nombre ?? "").trim(),
    };
}
function normalizeCompartment(sheetName) {
    const target = normalizeToken(sheetName);
    return (lubricantCompartments.find((item) => normalizeToken(item) === target) ??
        sheetName.trim().toUpperCase());
}
function collectSampleColumns(sheet) {
    const sampleRow = findRowByLabel(sheet, SAMPLE_ROW_LABELS.numero_muestra);
    if (sampleRow == null)
        return [];
    const range = decodeRange(sheet);
    const columns = [];
    for (let column = 2; column <= range.e.c; column += 1) {
        const value = sheetCellValue(sheet, sampleRow, column);
        if (value != null && String(value).trim() !== "") {
            columns.push(column);
        }
    }
    return columns;
}
function buildCondition(value) {
    const normalized = normalizeToken(value);
    const match = lubricantConditionOptions.find((item) => item.value === normalized);
    return match?.value || "N/D";
}
export function parseLubricantWorkbook(buffer, fileName, options) {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
    const warnings = [];
    const validSheets = workbook.SheetNames.filter((sheetName) => lubricantCompartments.some((compartment) => normalizeToken(compartment) === normalizeToken(sheetName)));
    if (!validSheets.length) {
        return {
            analyses: [],
            warnings: ["El archivo no contiene hojas de compartimentos compatibles."],
        };
    }
    const brandMap = new Map();
    for (const brand of options.brands ?? []) {
        if (brand?.id) {
            brandMap.set(String(brand.id), String(brand.nombre ?? "").trim());
        }
    }
    const equipmentHint = resolveWorkbookEquipmentHint(workbook, fileName);
    const equipmentContext = resolveEquipment(equipmentHint, options.equipments ?? [], brandMap);
    const analyses = [];
    for (const sheetName of validSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet)
            continue;
        const compartimento = normalizeCompartment(sheetName);
        const sampleColumns = collectSampleColumns(sheet);
        if (!sampleColumns.length) {
            warnings.push(`La hoja ${sheetName} no contiene columnas de muestras.`);
            continue;
        }
        const clientRow = 3;
        const clientValue = sheetCellText(sheet, clientRow, 2) || "JUSTICE COMPANY";
        const lubricanteValue = findTextNearLabel(sheet, 6, 7);
        const marcaLubricanteValue = findTextNearLabel(sheet, 7, 7);
        const sampleRows = Object.fromEntries(Object.entries(SAMPLE_ROW_LABELS).map(([key, label]) => [key, findRowByLabel(sheet, label)]));
        const detailTemplates = [
            "Viscosidad a 100C, cSt",
            "Viscosidad a 40C, cSt",
            "Indice de viscosidad",
            "T.B.N. mgKOH/gr",
            "Humedad",
            "Glycol, Abs/cm",
            "Combustible",
            "Oxidacion, Abs/cm",
            "Nitracion, Abs/cm",
            "Sulfatacion, Abs/cm",
            "Hollin, wt%",
            "Si (Silicio)",
            "Na (Sodio)",
            "Vanadio (V)",
            "Ni (Niquel)",
            "Fe (Hierro)",
            "Cr (Cromo)",
            "Al (Aluminio)",
            "Cu (Cobre)",
            "Pb (Plomo)",
            "Estano (Sn)",
            "Mo (Molibdeno)",
            "B (Boro)",
            "Ba (Bario)",
            "Ti (Titanio)",
            "Ag (Plata)",
            "Ca (Calcio)",
            "Mg (Magnesio)",
            "Zn (Zinc)",
            "P (Fosforo)",
        ];
        const detailRows = detailTemplates
            .map((label) => ({
            label,
            row: findRowByLabel(sheet, label),
            template: getLubricantParameterTemplate(label),
        }))
            .filter((item) => item.row != null);
        for (const columnIndex of sampleColumns) {
            const numeroMuestra = sampleRows.numero_muestra != null
                ? sheetCellText(sheet, sampleRows.numero_muestra, columnIndex)
                : "";
            const fechaMuestra = sampleRows.fecha_muestra != null
                ? asDateOnly(sheetCellValue(sheet, sampleRows.fecha_muestra, columnIndex))
                : null;
            const fechaIngreso = sampleRows.fecha_ingreso != null
                ? asDateOnly(sheetCellValue(sheet, sampleRows.fecha_ingreso, columnIndex))
                : null;
            const fechaInforme = sampleRows.fecha_informe != null
                ? asDateOnly(sheetCellValue(sheet, sampleRows.fecha_informe, columnIndex))
                : null;
            const horasEquipo = sampleRows.horas_equipo != null
                ? asNullableNumber(sheetCellValue(sheet, sampleRows.horas_equipo, columnIndex))
                : null;
            const horasLubricante = sampleRows.horas_lubricante != null
                ? asNullableNumber(sheetCellValue(sheet, sampleRows.horas_lubricante, columnIndex))
                : null;
            const condicion = sampleRows.condicion != null
                ? buildCondition(sheetCellValue(sheet, sampleRows.condicion, columnIndex))
                : "N/D";
            if (!numeroMuestra && !fechaMuestra && horasEquipo == null && horasLubricante == null) {
                continue;
            }
            const detalles = detailRows.map((detail) => {
                const cellValue = detail.row != null ? sheetCellValue(sheet, detail.row, columnIndex) : null;
                const template = detail.template;
                if (template?.inputType === "select" || template?.inputType === "text") {
                    return {
                        compartimento,
                        parametro: template?.label || detail.label,
                        resultado_texto: String(cellValue ?? "").trim() || null,
                        orden: template?.order,
                    };
                }
                return {
                    compartimento,
                    parametro: template?.label || detail.label,
                    resultado_numerico: asNullableNumber(cellValue),
                    orden: template?.order,
                };
            });
            analyses.push({
                cliente: clientValue,
                equipo_id: equipmentContext.equipo?.id || undefined,
                equipo_codigo: equipmentContext.equipo_codigo || undefined,
                equipo_nombre: equipmentContext.equipo_nombre || undefined,
                compartimento_principal: compartimento,
                lubricante: lubricanteValue || undefined,
                marca_lubricante: marcaLubricanteValue || undefined,
                fecha_muestra: fechaMuestra || undefined,
                fecha_reporte: fechaInforme || undefined,
                payload_json: {
                    source_file_name: fileName,
                    source_sheet_name: sheetName,
                    imported_from_excel: true,
                    sample_info: {
                        numero_muestra: numeroMuestra || null,
                        fecha_ingreso: fechaIngreso || null,
                        fecha_informe: fechaInforme || null,
                        horas_equipo: horasEquipo,
                        horas_lubricante: horasLubricante,
                        condicion,
                        equipo_marca: equipmentContext.equipo_marca || null,
                    },
                },
                detalles,
            });
        }
    }
    if (!analyses.length) {
        warnings.push("No se encontraron muestras válidas para importar.");
    }
    return { analyses, warnings };
}

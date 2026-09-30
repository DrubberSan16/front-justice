import * as XLSX from "xlsx";
import {
  CEDULA_CHECK_DIGIT_WARNING,
  calculateHourlyRate,
  collapseSpaces,
  isCedulaCheckDigitValid,
  isCedulaFormat,
  normalizeCedula,
  readSpreadsheetNumber,
  roundHalfUp,
  textKey,
} from "@/app/utils/employee-pay";
import type { Employee, EmployeeUser } from "@/app/services/employees.service";

/**
 * Lectura del Excel de personal.
 *
 * Formato: una hoja con las columnas NOMBRES, CEDULA, SUELDO y CARGO. La fila de
 * títulos no tiene que ser la primera ni las columnas estar en ese orden: se
 * busca la hoja y la fila que las tengan. El valor por hora no viene en el
 * archivo, se calcula con el sueldo (sueldo / 240).
 *
 * Aquí solo se lee y se valida. Guardar es cosa del servidor, que repite las
 * validaciones porque no debe confiar en lo que le llegue del navegador.
 */

export const IMPORT_COLUMNS = ["NOMBRES", "CEDULA", "SUELDO", "CARGO"] as const;

type ColumnKey = "name" | "cedula" | "salary" | "position";

/** Cómo puede llamarse cada columna en el título, ya sin tildes ni mayúsculas. */
const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  name: [
    "NOMBRES",
    "NOMBRE",
    "NOMBRES Y APELLIDOS",
    "APELLIDOS Y NOMBRES",
    "NOMBRE COMPLETO",
    "EMPLEADO",
    "PERSONAL",
    "COLABORADOR",
  ],
  cedula: ["CEDULA", "CEDULA DE IDENTIDAD", "IDENTIFICACION", "NUMERO DE CEDULA", "CI"],
  salary: ["SUELDO", "SALARIO", "SUELDO MENSUAL", "SALARIO MENSUAL", "REMUNERACION"],
  position: ["CARGO", "PUESTO", "FUNCION", "OCUPACION"],
};

const COLUMN_LABEL: Record<ColumnKey, string> = {
  name: "NOMBRES",
  cedula: "CEDULA",
  salary: "SUELDO",
  position: "CARGO",
};

/** Filas que se recorren buscando los títulos. */
const HEADER_SEARCH_ROWS = 30;
export const MAX_IMPORT_ROWS = 1000;
const MAX_SALARY = 1_000_000;

export class EmployeeImportError extends Error {}

export type ImportRow = {
  /** Fila del Excel, la que ve el usuario. */
  row: number;
  name: string;
  cedula: string;
  salary: number | null;
  position: string;
  /** Valor por hora calculado con el sueldo; `null` si el sueldo no es válido. */
  hourlyRate: number | null;
  /** Impiden guardar la fila. */
  errors: string[];
  /** Avisan, pero la fila se guarda. */
  warnings: string[];
};

export type ParsedEmployeeSheet = {
  sheetName: string;
  rows: ImportRow[];
};

function headerKey(value: unknown): string {
  return textKey(value).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function findColumns(cells: unknown[]): Partial<Record<ColumnKey, number>> {
  const found: Partial<Record<ColumnKey, number>> = {};
  cells.forEach((cell, index) => {
    const key = headerKey(cell);
    if (!key) return;
    for (const column of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
      if (found[column] === undefined && HEADER_ALIASES[column].includes(key)) {
        found[column] = index;
      }
    }
  });
  return found;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Lee la hoja de personal de un libro. Recorre las hojas visibles primero y
 * las ocultas después, y se queda con la primera que tenga los cuatro títulos.
 */
export function parseEmployeeWorkbook(buffer: ArrayBuffer): ParsedEmployeeSheet {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  } catch {
    throw new EmployeeImportError(
      "No pude abrir el archivo. Sube un Excel (.xlsx o .xls) que no esté dañado.",
    );
  }

  const hiddenBySheet = new Map<string, boolean>();
  workbook.Workbook?.Sheets?.forEach((sheet) => {
    if (sheet.name) hiddenBySheet.set(sheet.name, Number(sheet.Hidden ?? 0) > 0);
  });
  const sheetNames = [...workbook.SheetNames].sort(
    (a, b) => Number(hiddenBySheet.get(a) ?? false) - Number(hiddenBySheet.get(b) ?? false),
  );

  let missingInBest: ColumnKey[] | null = null;
  let bestSheetName = "";

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet?.["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });

    let headerIndex = -1;
    let columns: Partial<Record<ColumnKey, number>> = {};
    for (let index = 0; index < Math.min(matrix.length, HEADER_SEARCH_ROWS); index += 1) {
      const candidate = findColumns(matrix[index] ?? []);
      const matched = Object.keys(candidate).length;
      if (matched === 4) {
        headerIndex = index;
        columns = candidate;
        break;
      }
      // Para el mensaje de error: la hoja que más se parezca.
      if (matched >= 2 && (missingInBest === null || matched > 4 - missingInBest.length)) {
        missingInBest = (Object.keys(COLUMN_LABEL) as ColumnKey[]).filter(
          (column) => candidate[column] === undefined,
        );
        bestSheetName = sheetName;
      }
    }
    if (headerIndex < 0) continue;

    const rows: ImportRow[] = [];
    const seenCedulas = new Map<string, number>();
    for (let index = headerIndex + 1; index < matrix.length; index += 1) {
      const cells = matrix[index] ?? [];
      const raw = {
        name: cells[columns.name as number],
        cedula: cells[columns.cedula as number],
        salary: cells[columns.salary as number],
        position: cells[columns.position as number],
      };
      if (Object.values(raw).every(isBlank)) continue;
      // El número de fila es el de Excel: se suma el inicio del rango de la hoja.
      rows.push(buildRow(index + range.s.r + 1, raw, seenCedulas));
    }

    if (!rows.length) {
      throw new EmployeeImportError(
        `La hoja «${sheetName}» tiene los títulos pero ninguna fila con datos.`,
      );
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new EmployeeImportError(
        `El archivo trae ${rows.length} filas y el máximo por importación es ${MAX_IMPORT_ROWS}. Divídelo en partes.`,
      );
    }
    return { sheetName, rows };
  }

  if (missingInBest?.length) {
    const missing = missingInBest.map((column) => COLUMN_LABEL[column]).join(", ");
    throw new EmployeeImportError(
      `En la hoja «${bestSheetName}» faltan las columnas: ${missing}. El archivo necesita ${IMPORT_COLUMNS.join(", ")}.`,
    );
  }
  throw new EmployeeImportError(
    `No encontré las columnas ${IMPORT_COLUMNS.join(", ")} en ninguna hoja del archivo.`,
  );
}

function buildRow(
  row: number,
  raw: { name: unknown; cedula: unknown; salary: unknown; position: unknown },
  seenCedulas: Map<string, number>,
): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = collapseSpaces(raw.name);
  if (!name) errors.push("Falta el nombre.");
  else if (name.length > 200) errors.push("El nombre supera los 200 caracteres.");

  const cedula = normalizeCedula(raw.cedula);
  if (!isCedulaFormat(cedula)) {
    errors.push(
      cedula
        ? `La cédula debe tener 10 dígitos (leí ${cedula.length}).`
        : "Falta la cédula.",
    );
  } else {
    const previous = seenCedulas.get(cedula);
    if (previous !== undefined) {
      errors.push(`La cédula está repetida en el archivo (fila ${previous}).`);
    } else {
      seenCedulas.set(cedula, row);
    }
    if (!isCedulaCheckDigitValid(cedula)) warnings.push(CEDULA_CHECK_DIGIT_WARNING);
  }

  const parsedSalary = readSpreadsheetNumber(raw.salary);
  let salary: number | null = null;
  if (parsedSalary === null || parsedSalary <= 0 || parsedSalary > MAX_SALARY) {
    errors.push("El sueldo debe ser un número mayor que cero.");
  } else {
    salary = roundHalfUp(parsedSalary, 2);
  }

  const position = collapseSpaces(raw.position);
  if (!position) errors.push("Falta el cargo.");
  else if (position.length > 150) errors.push("El cargo supera los 150 caracteres.");

  return {
    row,
    name,
    cedula,
    salary,
    position,
    hourlyRate: salary === null ? null : calculateHourlyRate(salary),
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------- vínculos

export type UserCandidate = Pick<EmployeeUser, "id" | "name_user" | "name_surname"> & {
  identificacion?: string | null;
};

/** Las palabras de un nombre sin importar su orden: "PEREZ JUAN" = "JUAN PEREZ". */
function wordSetKey(value: unknown): string {
  return textKey(value).split(" ").filter(Boolean).sort().join(" ");
}

/**
 * El usuario del sistema que corresponde a una persona del archivo, o `null`.
 *
 * Solo propone cuando no hay duda: la cédula coincide con la del usuario, o el
 * nombre coincide exacto —sin importar tildes, mayúsculas ni el orden de las
 * palabras— con UN solo usuario libre. Un nombre parecido ("Felipe Loaiza" y
 * "LOAIZA SILVA FELIPE") no basta: se vincula a mano.
 */
export function suggestUserForPerson(
  person: { name: string; cedula: string },
  users: UserCandidate[],
): UserCandidate | null {
  const byCedula = users.filter(
    (user) => user.identificacion && normalizeCedula(user.identificacion) === person.cedula,
  );
  if (byCedula.length === 1) return byCedula[0] ?? null;

  const wanted = wordSetKey(person.name);
  if (!wanted || wanted.split(" ").length < 2) return null;
  const byName = users.filter((user) => wordSetKey(user.name_surname) === wanted);
  return byName.length === 1 ? (byName[0] ?? null) : null;
}

/**
 * Cargo tal como lo guardará el servidor: si ya hay uno igual salvo mayúsculas,
 * tildes o espacios, se reutiliza su escritura (la más usada; si empatan, la
 * primera por orden alfabético); si es nuevo, el primero que aparece manda para
 * los siguientes. Se repite aquí para que la vista previa muestre lo que se va
 * a guardar y no lo que trae el archivo.
 */
export function createPositionResolver(existingPositions: string[]): (text: string) => string {
  const spellings = new Map<string, Map<string, number>>();
  for (const raw of existingPositions) {
    const position = collapseSpaces(raw);
    const key = textKey(position);
    if (!key) continue;
    const counts = spellings.get(key) ?? new Map<string, number>();
    counts.set(position, (counts.get(position) ?? 0) + 1);
    spellings.set(key, counts);
  }
  const catalog = new Map<string, string>();
  for (const [key, counts] of spellings) {
    const [best] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"),
    );
    if (best) catalog.set(key, best[0]);
  }
  return (text: string) => {
    const clean = collapseSpaces(text);
    if (!clean) return "";
    const key = textKey(clean);
    const known = catalog.get(key);
    if (known) return known;
    catalog.set(key, clean);
    return clean;
  };
}

/** Distancia de edición: cuántas letras hay que insertar, borrar o cambiar para pasar de un texto a otro. */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? limit + 1;
}

/**
 * Cargos escritos casi igual que otro más usado: "AYUDANTE DE MATENIMIENTO"
 * frente a "AYUDANTE DE MANTENIMIENTO". Devuelve, por clave del cargo dudoso,
 * la escritura del parecido más usado. Es solo un aviso: puede ser un cargo
 * distinto de verdad (SUPERVISOR y SUPERVISORA), así que no se corrige solo.
 */
export function findSimilarPositions(
  rowPositions: string[],
  existingPositions: string[],
): Map<string, string> {
  const counts = new Map<string, { label: string; total: number }>();
  const add = (raw: string) => {
    const label = collapseSpaces(raw);
    const key = textKey(label);
    if (!key) return;
    const entry = counts.get(key);
    if (entry) entry.total += 1;
    else counts.set(key, { label, total: 1 });
  };
  existingPositions.forEach(add);
  rowPositions.forEach(add);

  const suggestions = new Map<string, string>();
  for (const [key, entry] of counts) {
    // Los nombres cortos se parecen por casualidad (JEFE / JEFA).
    if (key.length < 8) continue;
    let best: { label: string; total: number; distance: number } | null = null;
    for (const [otherKey, other] of counts) {
      // Solo se sospecha del menos usado: el más usado es la referencia.
      if (otherKey === key || other.total <= entry.total) continue;
      const distance = editDistance(key, otherKey, 2);
      if (distance > 2) continue;
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && other.total > best.total)
      ) {
        best = { ...other, distance };
      }
    }
    if (best) suggestions.set(key, best.label);
  }
  return suggestions;
}

export type ImportOutcome = "new" | "update" | "same" | "error";

/** Qué pasará con una fila al importar, comparándola con lo ya registrado. */
export function classifyImportRow(row: ImportRow, existing: Employee | undefined): ImportOutcome {
  if (row.errors.length) return "error";
  if (!existing) return "new";
  const changed =
    textKey(existing.nombres_apellidos) !== textKey(row.name) ||
    textKey(existing.cargo) !== textKey(row.position) ||
    Number(existing.sueldo) !== row.salary;
  return changed ? "update" : "same";
}

// ---------------------------------------------------------------- formato

/**
 * Genera el Excel con las columnas que el importador espera, para que quien
 * lo llene parta del formato correcto. Va sin datos de ejemplo: una fila de
 * muestra olvidada terminaría importada como si fuera una persona.
 */
export async function buildEmployeeTemplateBlob(): Promise<Blob> {
  const excelJsModule = await import("exceljs");
  const Workbook = excelJsModule.Workbook ?? (excelJsModule.default as any)?.Workbook;
  if (!Workbook) {
    throw new Error("No se pudo iniciar el generador de Excel.");
  }
  const workbook = new Workbook();
  workbook.creator = "KPI Justice";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("PERSONAL ACTIVO");
  sheet.columns = [
    { header: "NOMBRES", key: "name", width: 42 },
    { header: "CEDULA", key: "cedula", width: 16 },
    { header: "SUELDO", key: "salary", width: 14 },
    { header: "CARGO", key: "position", width: 34 },
  ];
  sheet.getRow(1).font = { bold: true };
  // La cédula va como texto: en una celda numérica Excel le quita el cero inicial.
  sheet.getColumn("cedula").numFmt = "@";
  sheet.getColumn("salary").numFmt = '"$" #,##0.00';
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

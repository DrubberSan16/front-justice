import { onBeforeUnmount, reactive, ref } from "vue";

/**
 * Previsualizacion de un Excel antes de descargarlo.
 *
 * Es el gemelo de `usePdfPreview`: el libro se genera igual que siempre, pero
 * en vez de caer directo en la carpeta de descargas se lee de vuelta y se
 * muestra en pantalla. Quien exporta comprueba que el rango, los filtros y las
 * columnas son los que buscaba y recien ahi decide guardarlo.
 *
 * Se lee el propio blob generado en lugar de recibir las filas por separado:
 * asi la previsualizacion no puede desviarse del archivo real, que es lo unico
 * que importa cuando alguien la usa para decidir.
 */
export type ExcelPreviewSheet = {
  name: string;
  /** Letras de columna (A, B, C...), como en una hoja de calculo. */
  columns: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
};

export type ExcelPreviewState = {
  open: boolean;
  loading: boolean;
  error: string;
  title: string;
  subtitle: string;
  fileName: string;
  sheets: ExcelPreviewSheet[];
  activeSheet: number;
};

export type ExcelPreviewOptions = {
  title?: string;
  subtitle?: string;
  fileName: string;
  build: () => Promise<Blob>;
};

/** Filas que se leen por hoja: mas que eso vuelve la tabla ilegible y lenta. */
const MAX_PREVIEW_ROWS = 200;

export function useExcelPreview(defaults?: { title?: string }) {
  const state = reactive<ExcelPreviewState>({
    open: false,
    loading: false,
    error: "",
    title: defaults?.title || "Previsualización del Excel",
    subtitle: "",
    fileName: "reporte.xlsx",
    sheets: [],
    activeSheet: 0,
  });
  const blob = ref<Blob | null>(null);
  let requestId = 0;

  function release() {
    blob.value = null;
    state.sheets = [];
    state.activeSheet = 0;
  }

  async function open(options: ExcelPreviewOptions) {
    const currentRequest = ++requestId;
    release();
    state.open = true;
    state.loading = true;
    state.error = "";
    state.title = options.title || defaults?.title || "Previsualización del Excel";
    state.subtitle = options.subtitle || "";
    state.fileName = ensureExcelExtension(options.fileName);
    try {
      const generated = await options.build();
      if (currentRequest !== requestId || !state.open) return;
      const sheets = await readWorkbookSheets(generated);
      if (currentRequest !== requestId || !state.open) return;
      blob.value = generated;
      state.sheets = sheets;
      state.activeSheet = 0;
      if (!sheets.length) {
        state.error = "El archivo se generó vacío: no hay nada que revisar.";
      }
    } catch (error: any) {
      if (currentRequest !== requestId) return;
      state.error =
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo generar la previsualización del Excel.";
    } finally {
      if (currentRequest === requestId) state.loading = false;
    }
  }

  function close() {
    requestId += 1;
    state.open = false;
    state.loading = false;
    state.error = "";
    state.subtitle = "";
    release();
  }

  function handleVisibility(visible: boolean) {
    if (!visible) close();
  }

  function selectSheet(index: number) {
    if (index < 0 || index >= state.sheets.length) return;
    state.activeSheet = index;
  }

  function download() {
    if (!blob.value) return;
    const href = window.URL.createObjectURL(blob.value);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = state.fileName || "reporte.xlsx";
    anchor.click();
    // El objeto se libera al siguiente tick: revocarlo en la misma linea corta
    // la descarga en Firefox antes de que empiece.
    window.setTimeout(() => window.URL.revokeObjectURL(href), 1500);
  }

  onBeforeUnmount(() => {
    requestId += 1;
    release();
  });

  return {
    state,
    blob,
    open,
    close,
    handleVisibility,
    selectSheet,
    download,
  };
}

async function readWorkbookSheets(source: Blob): Promise<ExcelPreviewSheet[]> {
  const XLSX = await import("xlsx");
  const buffer = await source.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets: ExcelPreviewSheet[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    });
    if (!matrix.length) continue;

    const columnCount = matrix.reduce(
      (max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
      0,
    );
    const normalize = (row: unknown[]) =>
      Array.from({ length: columnCount }, (_, index) => toCellText(row?.[index]));

    // No se toma la primera fila como cabecera: los reportes empiezan con el
    // titulo y el rango, asi que promoverla mentiria sobre lo que trae cada
    // columna. Se numeran como en Excel y todo el contenido va en el cuerpo.
    sheets.push({
      name,
      columns: Array.from({ length: columnCount }, (_, index) =>
        columnLetter(index),
      ),
      rows: matrix
        .slice(0, MAX_PREVIEW_ROWS)
        .map((row) => normalize(row as unknown[])),
      totalRows: matrix.length,
      truncated: matrix.length > MAX_PREVIEW_ROWS,
    });
  }

  return sheets;
}

/** 0 -> A, 25 -> Z, 26 -> AA: la misma numeracion que muestra Excel. */
function columnLetter(index: number) {
  let remaining = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);
  return label;
}

function toCellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString("es-EC");
  return String(value);
}

function ensureExcelExtension(fileName: string) {
  const normalized = String(fileName || "reporte").trim() || "reporte";
  return normalized.toLowerCase().endsWith(".xlsx")
    ? normalized
    : `${normalized}.xlsx`;
}

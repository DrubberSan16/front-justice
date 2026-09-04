import { onBeforeUnmount, reactive, ref } from "vue";

/**
 * Previsualizacion de un PDF antes de descargarlo.
 *
 * Varias pantallas generaban el archivo y lo mandaban directo a la carpeta de
 * descargas: quien queria comprobar el contenido tenia que abrirlo, mirarlo y
 * borrarlo si no era el que buscaba. Aqui el documento se arma igual pero se
 * muestra primero; descargar es una decision, no el unico camino.
 *
 * El identificador de peticion evita que una generacion lenta pise a la
 * siguiente: si el usuario abre otro documento mientras el anterior se arma, el
 * resultado tardio se descarta en vez de reemplazar lo que ya esta en pantalla.
 */
export type PdfPreviewState = {
  open: boolean;
  loading: boolean;
  error: string;
  title: string;
  subtitle: string;
  fileName: string;
};

export type PdfPreviewOptions = {
  title?: string;
  subtitle?: string;
  fileName: string;
  build: () => Promise<Blob>;
};

export function usePdfPreview(defaults?: { title?: string }) {
  const state = reactive<PdfPreviewState>({
    open: false,
    loading: false,
    error: "",
    title: defaults?.title || "Previsualización del PDF",
    subtitle: "",
    fileName: "documento.pdf",
  });
  const url = ref("");
  let requestId = 0;

  function release() {
    if (!url.value) return;
    window.URL.revokeObjectURL(url.value);
    url.value = "";
  }

  async function open(options: PdfPreviewOptions) {
    const currentRequest = ++requestId;
    release();
    state.open = true;
    state.loading = true;
    state.error = "";
    state.title = options.title || defaults?.title || "Previsualización del PDF";
    state.subtitle = options.subtitle || "";
    state.fileName = ensurePdfExtension(options.fileName);
    try {
      const blob = await options.build();
      if (currentRequest !== requestId || !state.open) return;
      url.value = window.URL.createObjectURL(blob);
    } catch (error: any) {
      if (currentRequest !== requestId) return;
      state.error =
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo generar la previsualización del PDF.";
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

  function download() {
    if (!url.value) return;
    const anchor = document.createElement("a");
    anchor.href = url.value;
    anchor.download = state.fileName || "documento.pdf";
    anchor.click();
  }

  function openInNewTab() {
    if (!url.value) return;
    window.open(url.value, "_blank", "noopener,noreferrer");
  }

  onBeforeUnmount(() => {
    requestId += 1;
    release();
  });

  return {
    state,
    url,
    open,
    close,
    handleVisibility,
    download,
    openInNewTab,
  };
}

function ensurePdfExtension(fileName: string) {
  const normalized = String(fileName || "documento").trim() || "documento";
  return normalized.toLowerCase().endsWith(".pdf")
    ? normalized
    : `${normalized}.pdf`;
}

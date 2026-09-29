import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Aviso de version nueva de la aplicacion.
 *
 * Cada push a `main` despliega solo, pero una pestana abierta sigue corriendo
 * el codigo con el que cargo. Si el backend cambia una regla mientras tanto, esa
 * pestana manda peticiones que ya no valen y quien la usa solo ve un rechazo que
 * no puede corregir: el 2026-09-29 la OT de Proyecto empezo a exigir el
 * proyecto, y una pestana cargada la noche anterior no tenia el selector.
 *
 * Aqui se compara, cada cierto tiempo y al volver a la pestana, el archivo de
 * entrada que cargo esta pagina con el que sirve hoy el servidor; si difieren se
 * avisa. No recarga sola: la pantalla puede tener un formulario a medias.
 */

const CHECK_EVERY_MS = 10 * 60 * 1000;
/** Entre dos comprobaciones no pasa menos que esto, aunque se cambie mucho de pestana. */
const MIN_GAP_MS = 60 * 1000;
/** Quien elige "Despues" vuelve a ver el aviso pasado este tiempo. */
const REMIND_AFTER_MS = 30 * 60 * 1000;

const ENTRY_IN_HTML = /<script\b[^>]*\bsrc=["']([^"']*\/assets\/index-[^"']+\.js)["'][^>]*>/i;
const ENTRY_FILE = /\/assets\/index-[^/]+\.js$/i;

/** Ruta del archivo de entrada dentro de un `index.html`, o `null` si no se reconoce. */
export function extractEntryFromHtml(html: string): string | null {
  const match = ENTRY_IN_HTML.exec(String(html ?? ""));
  if (!match?.[1]) return null;
  try {
    return new URL(match[1], window.location.origin).pathname;
  } catch {
    return null;
  }
}

/** Entrada que cargo la pagina abierta; `null` en desarrollo, donde no hay archivos con hash. */
function readRunningEntry(): string | null {
  const script = Array.from(document.scripts).find((item) => ENTRY_FILE.test(item.src));
  return script ? new URL(script.src).pathname : null;
}

export function useAppUpdateCheck() {
  const updateAvailable = ref(false);
  const running = readRunningEntry();
  let lastCheck = 0;
  let dismissedAt = 0;
  let timer: number | undefined;

  async function check() {
    if (!running) return;
    const now = Date.now();
    if (now - lastCheck < MIN_GAP_MS) return;
    lastCheck = now;
    try {
      const response = await fetch(`${window.location.origin}/`, {
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!response.ok) return;
      const latest = extractEntryFromHtml(await response.text());
      if (!latest) return;
      if (latest === running) {
        updateAvailable.value = false;
        return;
      }
      if (dismissedAt && now - dismissedAt < REMIND_AFTER_MS) return;
      updateAvailable.value = true;
    } catch {
      // Sin red o sin respuesta: se reintenta en la siguiente comprobacion.
    }
  }

  function onReturn() {
    if (document.visibilityState === "visible") void check();
  }

  function dismiss() {
    dismissedAt = Date.now();
    updateAvailable.value = false;
  }

  function reload() {
    window.location.reload();
  }

  onMounted(() => {
    if (!running) return;
    timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
  });

  onBeforeUnmount(() => {
    if (timer !== undefined) window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onReturn);
    window.removeEventListener("focus", onReturn);
  });

  return { updateAvailable, dismiss, reload, check };
}

import { onBeforeUnmount, onMounted } from "vue";
import { io, type Socket } from "socket.io-client";
import { env } from "@/app/config/env";
import { useAuthStore } from "@/app/stores/auth.store";

/**
 * Escucha la señal `data:changed` que emiten los backends cuando cambia un
 * recurso, para que una pantalla abierta se refresque sola.
 *
 * Va por un evento distinto al de la campana a propósito: no es una
 * notificación del usuario y no debe aparecer en ella.
 *
 * Las señales llegan en ráfaga —guardar una OT dispara varias— así que se
 * agrupan en una ventana corta y se recarga una sola vez. Sin eso, guardar una
 * orden provocaría tres recargas seguidas del dashboard.
 */
export function useDataChanged(
  recursos: string[],
  onChange: () => void | Promise<void>,
  options: { debounceMs?: number } = {},
) {
  const debounceMs = options.debounceMs ?? 1200;
  let socket: Socket | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function resolveOrigin() {
    try {
      return new URL(env.baseUrl, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }

  function programarRecarga() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void onChange();
    }, debounceMs);
  }

  onMounted(() => {
    const auth = useAuthStore();
    if (!auth.accessToken) return;
    socket = io(`${resolveOrigin()}/notifications`, {
      path: "/kpi_notification/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: auth.accessToken },
    });
    socket.on("data:changed", (payload: { recurso?: string }) => {
      if (!recursos.length || recursos.includes(String(payload?.recurso ?? ""))) {
        programarRecarga();
      }
    });
  });

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
    timer = null;
    socket?.disconnect();
    socket = null;
  });
}

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
 *
 * `onChange` recibe los recursos que cambiaron en esa ventana, para que la
 * pantalla recargue solo lo que le toca. Tras una reconexión llega `"*"`:
 * pudo cambiar cualquier cosa mientras el socket estuvo caído.
 */
export function useDataChanged(
  recursos: string[],
  onChange: (cambios: string[]) => void | Promise<void>,
  options: { debounceMs?: number } = {},
) {
  const debounceMs = options.debounceMs ?? 1200;
  let socket: Socket | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendientes = new Set<string>();

  function resolveOrigin() {
    try {
      return new URL(env.baseUrl, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }

  function programarRecarga(recurso = "*") {
    pendientes.add(recurso);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const cambios = [...pendientes];
      pendientes = new Set();
      void onChange(cambios);
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
      const recurso = String(payload?.recurso ?? "");
      if (!recursos.length || recursos.includes(recurso)) {
        programarRecarga(recurso || "*");
      }
    });
    // Las señales emitidas mientras el socket estaba caído no se repiten.
    socket.io.on("reconnect", () => programarRecarga());
  });

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
    timer = null;
    pendientes.clear();
    socket?.disconnect();
    socket = null;
  });
}

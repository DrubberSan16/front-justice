import { computed, ref, watch } from "vue";
import { api } from "@/app/http/api";

type PriceRow = { localId: string; productoId: string; costoUnitario: string };
type PriceState = { loading: boolean; error: string; source: string };
type Selection = {
  rows: () => PriceRow[];
  warehouseId: () => string;
  date: () => string;
  enabled: () => boolean;
};

/** Una respuesta antigua no puede cambiar el precio de otro material o bodega. */
export function useIncomePriceReference(
  selection: Selection,
  fetchReference = (producto_id: string, bodega_id: string, fecha: string) =>
    api.get("/kpi_inventory/kardex/precios-ingreso", { params: { producto_id, bodega_id, fecha } }),
) {
  const states = ref<Record<string, PriceState>>({});
  const requests = new Map<string, { key: string }>();
  const stopWatch = watch(
    () => [selection.enabled(), selection.warehouseId(), selection.date(),
      selection.rows().map(row => [row.localId, row.productoId])] as const,
    ([enabled, warehouseId, date]) => {
      const rows = selection.rows();
      const active = new Set(rows.map(row => row.localId));
      for (const id of requests.keys()) if (!active.has(id)) {
        requests.delete(id);
        delete states.value[id];
      }
      for (const row of rows) {
        const key = JSON.stringify([enabled, warehouseId, date, row.productoId]);
        if (requests.get(row.localId)?.key === key) continue;
        const request = { key };
        requests.set(row.localId, request);
        row.costoUnitario = "";
        const loading = Boolean(enabled && warehouseId && row.productoId);
        states.value[row.localId] = { loading, error: "", source: "" };
        if (!loading) continue;
        const current = () => requests.get(row.localId) === request;
        void (async () => {
          try {
            const response = await fetchReference(row.productoId, warehouseId, date);
            if (!current()) return;
            const payload = response.data?.data ?? response.data;
            const price = Number(payload?.costo_unitario);
            if (!String(row.costoUnitario).trim() && Number.isFinite(price) && price > 0) {
              row.costoUnitario = String(price);
            }
            states.value[row.localId] = { loading: false, error: "", source: String(payload?.fuente || "SIN_PRECIO") };
          } catch {
            if (current()) states.value[row.localId] = {
              loading: false, source: "",
              error: "No se pudo consultar el precio; se verificará al guardar.",
            };
          }
        })();
      }
    },
    { immediate: true, flush: "sync" },
  );
  return {
    states,
    loading: computed(() => Object.values(states.value).some(state => state.loading)),
    stop() { stopWatch(); requests.clear(); },
  };
}

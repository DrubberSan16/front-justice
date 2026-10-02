import { ref, watch } from "vue";
import { api } from "@/app/http/api";

type Selection = {
  productId: () => unknown;
  warehouseId: () => unknown;
  enabled: () => boolean;
};

export function useInventoryCostReference(
  selection: Selection,
  fetchReference = (producto_id: string, bodega_id: string) =>
    api.get("/kpi_maintenance/inventory/cost-reference", { params: { producto_id, bodega_id } }),
) {
  const cost = ref<number | null>(null);
  const loading = ref(false);
  const error = ref("");

  const stop = watch(
    () => [String(selection.productId() || ""), String(selection.warehouseId() || ""), selection.enabled()] as const,
    async ([productId, warehouseId, enabled], _previous, onCleanup) => {
      let current = true;
      onCleanup(() => { current = false; });
      cost.value = null;
      error.value = "";
      loading.value = Boolean(enabled && productId && warehouseId);
      if (!loading.value) return;
      try {
        const response = await fetchReference(productId, warehouseId);
        if (!current) return;
        const payload = response.data?.data ?? response.data;
        cost.value = [payload?.costo_unitario, payload?.saldo_costo_promedio, payload?.ultimo_costo]
          .map(Number).find(value => Number.isFinite(value) && value > 0) ?? null;
      } catch {
        if (current) error.value = "No se pudo consultar el costo. Inventario lo calculará al guardar.";
      } finally {
        if (current) loading.value = false;
      }
    },
    { immediate: true, flush: "sync" },
  );

  return { cost, loading, error, stop };
}

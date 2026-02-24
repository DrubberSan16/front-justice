import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "@/app/http/api";
import type { MenuNodeFull } from "@/app/types/menus-full.types";

export const useMenusStore = defineStore("menusFull", () => {
  const tree = ref<MenuNodeFull[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll(includeDeleted = true) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<MenuNodeFull[]>(
        `/kpi_security/menus?includeDeleted=${includeDeleted ? "true" : "false"}`
      );
      tree.value = data ?? [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || "No se pudo cargar el menú completo.";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { tree, loading, error, fetchAll };
});
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/app/http/api";
import type { Role } from "@/app/types/roles.types";

export const useRolesStore = defineStore("roles", () => {
  const items = ref<Role[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeItems = computed(() => items.value.filter((r) => !r.isDeleted));

  async function fetchAll(includeDeleted = false) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await api.get<Role[]>(
        `/kpi_security/roles?includeDeleted=${includeDeleted ? "true" : "false"}`
      );
      items.value = data ?? [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || "No se pudieron cargar los roles.";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function getRoleName(roleId: string) {
    return items.value.find((r) => r.id === roleId)?.nombre ?? roleId;
  }

  return {
    items,
    activeItems,
    loading,
    error,
    fetchAll,
    getRoleName,
  };
});
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/app/http/api";
import type { CreateUserRequest, UpdateUserRequest, User } from "@/app/types/users.types";
import { useAuthStore } from "@/app/stores/auth.store";
import {
  cachedGet,
  DEFAULT_CONTEXT_CACHE_TTL_MS,
  invalidateRequestCache,
} from "@/app/utils/request-cache";

export const useUsersStore = defineStore("users", () => {
  const auth = useAuthStore();
  const cacheMatcher = "/kpi_security/users";

  const items = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // filtros frontend
  const search = ref("");
  const statusFilter = ref<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const roleFilter = ref<string>("ALL");
  const includeDeleted = ref(false);

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();

    return items.value.filter((u) => {
      if (!includeDeleted.value && u.isDeleted) return false;

      if (statusFilter.value !== "ALL" && u.status !== statusFilter.value) return false;

      if (roleFilter.value !== "ALL" && u.roleId !== roleFilter.value) return false;

      if (!q) return true;

      const hay = [
        u.nameUser,
        u.nameSurname,
        u.email,
        u.role?.nombre ?? "",
        u.status ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  });

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await cachedGet<User[]>(
        "/kpi_security/users",
        {
          params: { includeDeleted: includeDeleted.value ? "true" : "false" },
        },
        {
          ttlMs: DEFAULT_CONTEXT_CACHE_TTL_MS,
        },
      );
      items.value = data ?? [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || "No se pudieron cargar los usuarios.";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(payload: Omit<CreateUserRequest, "createdBy">) {
    loading.value = true;
    error.value = null;
    try {
      const createdBy = auth.user?.nameUser || "admin";
      const { data } = await api.post<User>("/kpi_security/users", { ...payload, createdBy });
      invalidateRequestCache(cacheMatcher);
      items.value = [data, ...items.value];
      return data;
    } catch (e: any) {
      error.value = e?.response?.data?.message || "No se pudo crear el usuario.";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateUser(id: string, payload: UpdateUserRequest) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<User>(`/kpi_security/users/${id}`, payload);
      invalidateRequestCache(cacheMatcher);
      items.value = items.value.map((u) => (u.id === id ? { ...u, ...data } : u));
      return data;
    } catch (e: any) {
      error.value = e?.response?.data?.message || "No se pudo actualizar el usuario.";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUser(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const deletedBy = auth.user?.nameUser || "admin";
      const { data } = await api.delete<User>(
        `/kpi_security/users/${id}?deletedBy=${encodeURIComponent(deletedBy)}`
      );
      invalidateRequestCache(cacheMatcher);
      items.value = items.value.map((u) => (u.id === id ? { ...u, ...data } : u));
      return data;
    } catch (e: any) {
      error.value = e?.response?.data?.message || "No se pudo eliminar el usuario.";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    loading,
    error,

    // filtros
    search,
    statusFilter,
    roleFilter,
    includeDeleted,

    // computed
    filtered,

    // actions
    fetchAll,
    createUser,
    updateUser,
    deleteUser,
  };
});

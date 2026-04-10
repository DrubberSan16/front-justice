import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
export const useRolesStore = defineStore("roles", () => {
    const auth = useAuthStore();
    const items = ref([]);
    const loading = ref(false);
    const error = ref(null);
    // filtros locales
    const search = ref("");
    const statusFilter = ref("ALL");
    const filtered = computed(() => {
        const q = search.value.trim().toLowerCase();
        return items.value.filter((r) => {
            if (statusFilter.value !== "ALL" && r.status !== statusFilter.value)
                return false;
            if (!q)
                return true;
            const hay = [r.nombre, r.descripcion ?? "", r.status ?? ""].join(" ").toLowerCase();
            return hay.includes(q);
        });
    });
    async function fetchAll(includeDeleted = false) {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get(`/kpi_security/roles?includeDeleted=${includeDeleted ? "true" : "false"}`);
            items.value = data ?? [];
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudieron cargar los roles.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchOne(id) {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get(`/kpi_security/roles/${id}`);
            return data;
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo cargar el rol.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function createRole(payload) {
        loading.value = true;
        error.value = null;
        try {
            const createdBy = auth.user?.nameUser || "admin";
            const { data } = await api.post("/kpi_security/roles", { ...payload, createdBy });
            items.value = [data, ...items.value];
            return data;
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo crear el rol.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function updateRole(id, payload) {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.patch(`/kpi_security/roles/${id}`, payload);
            items.value = items.value.map((r) => (r.id === id ? { ...r, ...data } : r));
            return data;
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo actualizar el rol.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function deleteRole(id) {
        loading.value = true;
        error.value = null;
        try {
            const deletedBy = auth.user?.nameUser || "admin";
            const { data } = await api.delete(`/kpi_security/roles/${id}?deletedBy=${encodeURIComponent(deletedBy)}`);
            // si el backend devuelve isDeleted=true, lo actualizamos; si no lo trae, lo quitamos
            items.value = items.value.map((r) => (r.id === id ? { ...r, ...data } : r));
            return data;
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo eliminar el rol.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    function getRoleName(roleId) {
        return items.value.find((r) => r.id === roleId)?.nombre ?? roleId;
    }
    return {
        items,
        loading,
        error,
        // filtros
        search,
        statusFilter,
        filtered,
        fetchAll,
        fetchOne,
        createRole,
        updateRole,
        deleteRole,
        getRoleName,
    };
});

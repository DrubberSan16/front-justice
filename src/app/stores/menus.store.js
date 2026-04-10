import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
export const useMenusStore = defineStore("menusAdmin", () => {
    const auth = useAuthStore();
    const tree = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const search = ref("");
    const includeDeleted = ref(true);
    const filteredTree = computed(() => {
        const q = search.value.trim().toLowerCase();
        const filterNodes = (nodes) => (nodes ?? [])
            .filter((n) => {
            if (!includeDeleted.value && n.isDeleted)
                return false;
            if (!q)
                return true;
            const hay = [n.nombre, n.descripcion ?? "", n.urlComponent ?? "", n.icon ?? ""]
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        })
            .map((n) => ({ ...n, children: filterNodes(n.children ?? []) }));
        return filterNodes(tree.value);
    });
    async function fetchAll() {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get(`/kpi_security/menus?includeDeleted=true`);
            tree.value = data ?? [];
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo cargar el módulo de menú.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function createMenu(payload) {
        loading.value = true;
        error.value = null;
        try {
            const createdBy = auth.user?.nameUser || "admin";
            await api.post("/kpi_security/menus", { ...payload, createdBy });
            await fetchAll();
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo crear el menú.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function updateMenu(id, payload) {
        loading.value = true;
        error.value = null;
        try {
            const createdBy = auth.user?.nameUser || "admin";
            await api.patch(`/kpi_security/menus/${id}`, { ...payload, createdBy });
            await fetchAll();
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo actualizar el menú.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    async function deleteMenu(id) {
        loading.value = true;
        error.value = null;
        try {
            const deletedBy = auth.user?.nameUser || "admin";
            await api.delete(`/kpi_security/menus/${id}?deletedBy=${encodeURIComponent(deletedBy)}`);
            await fetchAll();
        }
        catch (e) {
            error.value = e?.response?.data?.message || "No se pudo eliminar el menú.";
            throw e;
        }
        finally {
            loading.value = false;
        }
    }
    return {
        tree,
        loading,
        error,
        search,
        includeDeleted,
        filteredTree,
        fetchAll,
        createMenu,
        updateMenu,
        deleteMenu,
    };
});

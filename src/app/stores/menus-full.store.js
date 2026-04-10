import { defineStore } from "pinia";
import { api } from "@/app/http/api";
export const useMenusFullStore = defineStore("menusFull", {
    state: () => ({
        tree: [],
        loading: false,
        error: null,
    }),
    actions: {
        async fetchAll(includeDeleted = true) {
            this.loading = true;
            this.error = null;
            try {
                const { data } = await api.get(`/kpi_security/menus?includeDeleted=${includeDeleted ? "true" : "false"}`);
                this.tree = data ?? [];
            }
            catch (e) {
                this.error = e?.response?.data?.message || "No se pudo cargar el menú completo.";
                throw e;
            }
            finally {
                this.loading = false;
            }
        },
        clear() {
            this.tree = [];
            this.loading = false;
            this.error = null;
        },
    },
});

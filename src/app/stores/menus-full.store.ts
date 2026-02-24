import { defineStore } from "pinia";
import { api } from "@/app/http/api";
import type { MenuNodeFull } from "@/app/types/menus-full.types";

type State = {
  tree: MenuNodeFull[];
  loading: boolean;
  error: string | null;
};

export const useMenusFullStore = defineStore("menusFull", {
  state: (): State => ({
    tree: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchAll(includeDeleted = true) {
      this.loading = true;
      this.error = null;

      try {
        const { data } = await api.get<MenuNodeFull[]>(
          `/kpi_security/menus?includeDeleted=${includeDeleted ? "true" : "false"}`
        );
        this.tree = data ?? [];
      } catch (e: any) {
        this.error = e?.response?.data?.message || "No se pudo cargar el menú completo.";
        throw e;
      } finally {
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
import { defineStore } from "pinia";
import { api } from "@/app/http/api";
import type { MenuNodeFull } from "@/app/types/menus-full.types";

type State = {
  tree: MenuNodeFull[];
  loading: boolean;
};

export const useMenusFullStore = defineStore("menusFull", {
  state: (): State => ({
    tree: [],
    loading: false,
  }),

  actions: {
    async fetchAll(includeDeleted = true) {
      this.loading = true;
      try {
        const { data } = await api.get<MenuNodeFull[]>(
          `/kpi_security/menus?includeDeleted=${includeDeleted}`
        );
        this.tree = data ?? [];
      } finally {
        this.loading = false;
      }
    },
  },
});
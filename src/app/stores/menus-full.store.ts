import { defineStore } from "pinia";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import type { MenuNodeFull } from "@/app/types/menus-full.types";
import { canAccessDigitalTwins } from "@/app/utils/role-access";

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
      const auth = useAuthStore();
      this.loading = true;
      this.error = null;

      try {
        const { data } = await api.get<MenuNodeFull[]>(
          `/kpi_security/menus?includeDeleted=${includeDeleted ? "true" : "false"}`
        );
        const filterTree = (nodes: MenuNodeFull[]): MenuNodeFull[] =>
          (nodes ?? [])
            .map((node) => {
              const component = String(node.urlComponent || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toLowerCase()
                .replace(/^\/+/, "")
                .replace(/^app\//, "")
                .replace(/[\s_]+/g, "-");
              const isRoleBlocked =
                component === "gemelos-digitales" && !canAccessDigitalTwins(auth.user);
              if (isRoleBlocked) return null;
              return {
                ...node,
                children: filterTree(node.children ?? []),
              };
            })
            .filter((node): node is MenuNodeFull => Boolean(node));

        this.tree = filterTree(data ?? []);
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

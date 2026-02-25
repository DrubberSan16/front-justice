import { defineStore } from "pinia";
import { api } from "@/app/http/api";
import type { MenuNode } from "@/app/types/menu.types";

type MenuState = {
  tree: MenuNode[];
  loadedForUserId: string | null;
  loading: boolean;
};

export const useMenuStore = defineStore("menu", {
  state: (): MenuState => ({
    tree: [],
    loadedForUserId: null,
    loading: false,
  }),

  actions: {
    async loadMenuTree(userId: string) {
      // evita recargar innecesariamente
      if (this.loadedForUserId === userId && this.tree.length) return;

      this.loading = true;
      try {
        const { data } = await api.get<MenuNode[]>(
          `/kpi_security/menu-users/tree/by-user/${userId}`
        );

        const normalizeNode = (node: any): MenuNode => ({
          ...node,
          icon: node.icon ?? node.Icon ?? node.icono ?? node.menuIcon ?? "",
          children: Array.isArray(node.children)
            ? node.children.map((child: any) => normalizeNode(child))
            : [],
        });

        // Orden por menuPosition si viene como string
        const sortTree = (nodes: MenuNode[]): MenuNode[] =>
          [...nodes]
            .sort((a, b) => Number(a.menuPosition) - Number(b.menuPosition))
            .map((n) => ({ ...n, children: n.children ? sortTree(n.children) : [] }));

        this.tree = sortTree((data ?? []).map((node) => normalizeNode(node)));
        this.loadedForUserId = userId;
      } finally {
        this.loading = false;
      }
    },

    clear() {
      this.tree = [];
      this.loadedForUserId = null;
      this.loading = false;
    },
  },
});

import { defineStore } from "pinia";
import { api } from "@/app/http/api";
export const useMenuStore = defineStore("menu", {
    state: () => ({
        tree: [],
        loadedForUserId: null,
        loading: false,
    }),
    actions: {
        async loadMenuTree(userId) {
            // evita recargar innecesariamente
            if (this.loadedForUserId === userId && this.tree.length)
                return;
            this.loading = true;
            try {
                const { data } = await api.get(`/kpi_security/menu-users/tree/by-user/${userId}`);
                const normalizeNode = (node) => ({
                    ...node,
                    icon: node.icon ?? node.Icon ?? node.icono ?? node.menuIcon ?? "",
                    children: Array.isArray(node.children)
                        ? node.children.map((child) => normalizeNode(child))
                        : [],
                });
                // Orden por menuPosition si viene como string
                const sortTree = (nodes) => [...nodes]
                    .sort((a, b) => Number(a.menuPosition) - Number(b.menuPosition))
                    .map((n) => ({ ...n, children: n.children ? sortTree(n.children) : [] }));
                this.tree = sortTree((data ?? []).map((node) => normalizeNode(node)));
                this.loadedForUserId = userId;
            }
            finally {
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

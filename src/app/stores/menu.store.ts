import { defineStore } from "pinia";
import { api } from "@/app/http/api";
import type { MenuNode } from "@/app/types/menu.types";
import { useAuthStore } from "@/app/stores/auth.store";
import { canAccessDigitalTwins, isSuperAdministrator } from "@/app/utils/role-access";

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

      const auth = useAuthStore();
      this.loading = true;
      try {
        const fullPermissions = {
          isReaded: true,
          isCreated: true,
          isEdited: true,
          permitDeleted: true,
          isReports: true,
          reportsPermit: "{\"all\":true}",
        };
        const isSuperAdmin = isSuperAdministrator(auth.user);
        const { data } = isSuperAdmin
          ? await api.get<any[]>(`/kpi_security/menus?includeDeleted=false`)
          : await api.get<MenuNode[]>(`/kpi_security/menu-users/tree/by-user/${userId}`);

        const normalizeNode = (node: any): MenuNode => ({
          ...node,
          icon: node.icon ?? node.Icon ?? node.icono ?? node.menuIcon ?? "",
          permissions: isSuperAdmin ? fullPermissions : node.permissions,
          children: Array.isArray(node.children)
            ? node.children.map((child: any) => normalizeNode(child))
            : [],
        });

        // Orden por menuPosition si viene como string
        const sortTree = (nodes: MenuNode[]): MenuNode[] =>
          [...nodes]
            .sort((a, b) => Number(a.menuPosition) - Number(b.menuPosition))
            .map((n) => ({ ...n, children: n.children ? sortTree(n.children) : [] }));

        const filterTreeByPermissions = (nodes: MenuNode[]): MenuNode[] =>
          (nodes ?? [])
            .map((node) => {
              const children = filterTreeByPermissions(node.children ?? []);
              const component = String(node.urlComponent || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toLowerCase()
                .replace(/^\/+/, "")
                .replace(/^app\//, "")
                .replace(/[\s_]+/g, "-");
              const canRead = isSuperAdministrator(auth.user)
                ? true
                : Boolean(node.permissions?.isReaded);
              const isActive =
                !String(node.status ?? "")
                  .trim()
                  .length ||
                String(node.status).toUpperCase() === "ACTIVE";
              const isRoleBlocked =
                component === "gemelos-digitales" && !canAccessDigitalTwins(auth.user);

              if (!isActive || isRoleBlocked) return null;
              if (!canRead && !children.length) return null;

              return {
                ...node,
                children,
              };
            })
            .filter((node): node is MenuNode => Boolean(node));

        const normalizedTree = sortTree((data ?? []).map((node) => normalizeNode(node)));
        this.tree = filterTreeByPermissions(normalizedTree);
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

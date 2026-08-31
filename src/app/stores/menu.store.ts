import { defineStore } from "pinia";
import type { MenuNode } from "@/app/types/menu.types";
import { useAuthStore } from "@/app/stores/auth.store";
import {
  canAccessDigitalTwins,
  isGeneralManager,
  isSuperAdministrator,
} from "@/app/utils/role-access";
import { cachedGet, DEFAULT_CATALOG_CACHE_TTL_MS } from "@/app/utils/request-cache";

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
          ? await cachedGet<any[]>(
              "/kpi_security/menus",
              {
                params: { includeDeleted: "false" },
              },
              { ttlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
            )
          : await cachedGet<MenuNode[]>(
              `/kpi_security/menu-users/tree/by-user/${userId}`,
              {},
              { ttlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
            );

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
        const visibleTree = filterTreeByPermissions(normalizedTree);
        const canAccessDetailedReport =
          isGeneralManager(auth.user) || isSuperAdministrator(auth.user);
        const hasDetailedReport = visibleTree.some(
          (node) => String(node.urlComponent || "").trim() === "reporte-detallado",
        );
        if (canAccessDetailedReport && !hasDetailedReport) {
          visibleTree.push({
            id: "system-reporte-detallado",
            parentId: null,
            nombre: "Reporte detallado",
            descripcion: "Órdenes, aceite e inventario",
            icon: "mdi-chart-box-outline",
            urlComponent: "reporte-detallado",
            menuPosition: "2",
            status: "ACTIVE",
            permissions: fullPermissions,
            children: [],
          });
        }
        this.tree = sortTree(visibleTree);
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

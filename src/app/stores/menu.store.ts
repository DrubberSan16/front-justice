import { defineStore } from "pinia";
import { isRetiredReportComponent } from "@/app/utils/retired-report-menus";
import type { MenuNode } from "@/app/types/menu.types";
import { useAuthStore } from "@/app/stores/auth.store";
import {
  canAccessDigitalTwins,
  canAccessReporting,
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

        const normalizeText = (value: unknown) =>
          String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
        const canUseReports = canAccessReporting(auth.user);

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
              const canRead =
                isSuperAdministrator(auth.user) ||
                (component === "reporteria" && canUseReports) ||
                Boolean(node.permissions?.isReaded);
              const isActive =
                !String(node.status ?? "")
                  .trim()
                  .length ||
                String(node.status).toUpperCase() === "ACTIVE";
              const isRoleBlocked =
                isRetiredReportComponent(component) ||
                (component === "gemelos-digitales" && !canAccessDigitalTwins(auth.user)) ||
                (component === "reporteria" && !canUseReports);

              if (!isActive || isRoleBlocked) return null;
              if (!canRead && !children.length) return null;

              return {
                ...node,
                children,
              };
            })
            .filter((node): node is MenuNode => Boolean(node));

        const normalizedTree = sortTree((data ?? []).map((node) => normalizeNode(node)));
        let visibleTree = filterTreeByPermissions(normalizedTree);
        const hasComponent = (nodes: MenuNode[], componentName: string): boolean =>
          nodes.some(
            (node) =>
              normalizeText(node.urlComponent) === normalizeText(componentName) ||
              hasComponent(node.children ?? [], componentName),
          );
        // Una opcion que el cliente agrega por su cuenta va dentro de Informes
        // cuando el usuario tiene esa seccion; sin ella, queda en la raiz.
        const findSectionByName = (nodes: MenuNode[], name: string): MenuNode | null => {
          for (const node of nodes) {
            if (normalizeText(node.nombre) === name) return node;
            const nested = findSectionByName(node.children ?? [], name);
            if (nested) return nested;
          }
          return null;
        };
        const addUnderInformes = (node: MenuNode, positionInsideInformes?: string) => {
          const informes = findSectionByName(visibleTree, "INFORMES");
          if (informes) {
            informes.children = [
              ...(informes.children ?? []),
              {
                ...node,
                parentId: informes.id,
                menuPosition: positionInsideInformes ?? node.menuPosition,
              },
            ];
            return;
          }
          visibleTree.push(node);
        };
        if (canUseReports && !hasComponent(visibleTree, "reporteria")) {
          addUnderInformes({
            id: "system-reporteria",
            parentId: null,
            nombre: "Reportería",
            descripcion: "Informes consolidados de la operación",
            icon: "mdi-chart-box-multiple-outline",
            urlComponent: "reporteria",
            menuPosition: "89",
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

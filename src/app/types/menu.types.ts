import type { RouteLocationRaw } from "vue-router";

export type MenuPermissions = {
  isReaded: boolean;
  isCreated: boolean;
  isEdited: boolean;
  permitDeleted: boolean;
  isReports: boolean;
  reportsPermit: string; // "{}"
};

/**
 * Nodo del menu. Casi siempre viene de `kpi_security.tb_menu`, pero el arbol
 * admite ademas nodos "virtuales" que no estan en la base: se calculan en el
 * cliente a partir de un catalogo (por ejemplo, un hijo por tipo de equipo).
 * Esos llevan `routeLocation` porque no navegan por `urlComponent`, sino a una
 * ruta con parametros; y `virtual` para distinguirlos al pintarlos.
 */
export type MenuNode = {
  id: string;
  parentId: string | null;
  nombre: string;
  descripcion: string;
  icon: string;          // "$mdiDashboard", etc
  urlComponent: string;  // "Dashboard" | "Usuarios" | "/"
  menuPosition: string;  // "0", "1"...
  status: string;
  permissions: MenuPermissions;
  children: MenuNode[];
  virtual?: boolean;
  routeLocation?: RouteLocationRaw;
};

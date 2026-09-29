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
 * cliente a partir de un catalogo (por ejemplo, un hijo por informe de
 * Reporteria). Esos llevan `routeLocation` porque no navegan por
 * `urlComponent`, sino a una ruta con parametros; y `virtual` para distinguirlos
 * al pintarlos.
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
  /** Rotulo de agrupacion dentro de un submenu: se pinta, no navega ni se abre. */
  header?: boolean;
  /**
   * Parametros de la URL actual que se conservan al navegar a este nodo. Un
   * informe de Reporteria mantiene el rango de fechas aplicado al cambiar de
   * informe.
   */
  preserveQuery?: string[];
  /**
   * Parametros de `routeLocation` que se dan por cumplidos cuando la URL no los
   * trae: al entrar a Reporteria sin `?modulo=` se muestra el primer informe, y
   * el menu tiene que resaltarlo.
   */
  defaultWhenMissing?: string[];
};

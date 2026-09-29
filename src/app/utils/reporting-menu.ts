import type { MenuNode } from "@/app/types/menu.types";
import {
  REPORTING_MODULE_GROUPS,
  REPORTING_MODULES,
  type ReportingModule,
} from "@/app/config/reporting-modules";

/**
 * Los informes de Reporteria como opciones del menu, debajo de "Reporteria".
 *
 * Antes, abrir Reporteria cambiaba TODO el menu lateral por otro (con un
 * "Volver al menu principal"), y el menu de siempre quedaba tapado. Ahora
 * Reporteria se despliega hacia abajo como cualquier otra opcion con hijos, y
 * cada informe es un hijo calculado: no esta en la base, apunta a la misma
 * pantalla con `?modulo=`.
 */

/**
 * Informes que no se ofrecen por separado: los movimientos de bodega se ven
 * dentro del informe de Materiales.
 */
const HIDDEN_REPORT_MODULES = new Set([
  "warehouse-stock",
  "kardex",
  "warehouse-income",
  "warehouse-output",
]);

/** Del filtro de fechas aplicado, lo que sobrevive al cambiar de informe. */
const REPORT_QUERY_TO_KEEP = ["desde", "hasta"];

function normalizeComponent(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/^app\//, "");
}

function reportNode(
  parent: MenuNode,
  key: string,
  title: string,
  icon: string,
  order: number,
  query: Record<string, string>,
  description = "",
  defaultWhenMissing?: string[],
): MenuNode {
  return {
    id: `report:${key}`,
    parentId: parent.id,
    nombre: title,
    descripcion: description,
    icon,
    urlComponent: "",
    menuPosition: String(order),
    status: "ACTIVE",
    // Es un informe de la misma pantalla: comparte el permiso de Reporteria.
    permissions: parent.permissions,
    children: [],
    virtual: true,
    routeLocation: { name: "reporteria", query },
    preserveQuery: REPORT_QUERY_TO_KEEP,
    ...(defaultWhenMissing ? { defaultWhenMissing } : {}),
  };
}

function headerNode(parent: MenuNode, group: string, order: number): MenuNode {
  return {
    id: `report-group:${group}`,
    parentId: parent.id,
    nombre: group,
    descripcion: "",
    icon: "",
    urlComponent: "",
    menuPosition: String(order),
    status: "ACTIVE",
    permissions: parent.permissions,
    children: [],
    virtual: true,
    header: true,
  };
}

function moduleNodes(
  parent: MenuNode,
  module: ReportingModule,
  order: number,
): MenuNode[] {
  // Sin `?modulo=` la pantalla muestra el primer informe: es el que se resalta.
  const isDefaultModule = REPORTING_MODULES[0]?.key === module.key;
  // Materiales tiene dos vistas del mismo informe: cada una es una opcion, sin
  // un nivel mas de menu (a esta profundidad ya no queda ancho para el titulo).
  // Sin `?vista=` se muestra la informativa.
  if (module.key === "materials") {
    return [
      reportNode(parent, "materials:informativo", `${module.shortTitle}: informativo`, module.icon, order, { modulo: module.key, vista: "informativo" }, module.title, ["vista"]),
      reportNode(parent, "materials:detalle", `${module.shortTitle}: detalle`, "mdi-format-list-bulleted", order + 1, { modulo: module.key, vista: "detalle" }, module.title),
    ];
  }
  return [
    reportNode(parent, module.key, module.shortTitle, module.icon, order, { modulo: module.key }, module.title, isDefaultModule ? ["modulo"] : undefined),
  ];
}

/** Hijos de "Reporteria": un rotulo por grupo y, debajo, sus informes. */
export function buildReportingMenuChildren(parent: MenuNode): MenuNode[] {
  const children: MenuNode[] = [];
  let order = 1;
  for (const group of REPORTING_MODULE_GROUPS) {
    const modules = REPORTING_MODULES.filter(
      (module) => module.group === group && !HIDDEN_REPORT_MODULES.has(module.key),
    );
    if (!modules.length) continue;
    children.push(headerNode(parent, group, order));
    order += 1;
    for (const module of modules) {
      const nodes = moduleNodes(parent, module, order);
      children.push(...nodes);
      order += nodes.length;
    }
  }
  return children;
}

/**
 * Devuelve el arbol con los informes colgando de "Reporteria", donde este.
 *
 * Reporteria es a veces un nodo de la base (bajo Informes) y a veces el que el
 * cliente agrega a quien puede usarla sin tenerla asignada: en los dos casos se
 * reconoce por su componente. No toca el arbol del store, que se sigue usando
 * tal cual para resolver permisos.
 */
export function withReportingSubmenu(nodes: MenuNode[]): MenuNode[] {
  return nodes.map((node) => {
    if (normalizeComponent(node.urlComponent) === "reporteria") {
      return { ...node, children: buildReportingMenuChildren(node) };
    }
    if (!node.children?.length) return node;
    return { ...node, children: withReportingSubmenu(node.children) };
  });
}

import type { MenuNode } from "@/app/types/menu.types";
import { useAuthStore } from "@/app/stores/auth.store";
import { canAccessDigitalTwins, isSuperAdministrator } from "@/app/utils/role-access";

export type MenuPermissions = {
  isReaded: boolean;
  isCreated: boolean;
  isEdited: boolean;
  permitDeleted: boolean;
  isReports: boolean;
  reportsPermit: string;
};

const defaultPerms: MenuPermissions = {
  isReaded: false,
  isCreated: false,
  isEdited: false,
  permitDeleted: false,
  isReports: false,
  reportsPermit: "{}",
};

const fullPerms: MenuPermissions = {
  isReaded: true,
  isCreated: true,
  isEdited: true,
  permitDeleted: true,
  isReports: true,
  reportsPermit: "{\"all\":true}",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/^app\//, "")
    .replace(/[\s_]+/g, "-");
}

function isRoleBlockedComponent(urlComponent: string): boolean {
  const auth = useAuthStore();
  const component = normalize(urlComponent);
  if (!canAccessDigitalTwins(auth.user) && component === "gemelos-digitales") {
    return true;
  }
  return false;
}

export function findMenuNodeByComponent(tree: MenuNode[], urlComponent: string): MenuNode | null {
  if (isRoleBlockedComponent(urlComponent)) return null;
  const target = normalize(urlComponent);
  for (const node of tree) {
    if (normalize(node.urlComponent) === target) return node;
    if (node.children?.length) {
      const found = findMenuNodeByComponent(node.children, urlComponent);
      if (found) return found;
    }
  }
  return null;
}

export function getPermissionsForComponent(tree: MenuNode[], urlComponent: string): MenuPermissions {
  const auth = useAuthStore();
  if (isSuperAdministrator(auth.user)) return fullPerms;
  if (isRoleBlockedComponent(urlComponent)) return defaultPerms;
  const node = findMenuNodeByComponent(tree, urlComponent);
  return (node?.permissions as MenuPermissions) ?? defaultPerms;
}

export function getPermissionsForAnyComponent(
  tree: MenuNode[],
  urlComponents: string[]
): MenuPermissions {
  const auth = useAuthStore();
  if (isSuperAdministrator(auth.user)) return fullPerms;
  for (const name of urlComponents) {
    if (isRoleBlockedComponent(name)) continue;
    const node = findMenuNodeByComponent(tree, name);
    if (node?.permissions) return node.permissions as MenuPermissions;
  }

  return defaultPerms;
}

export function canReadComponent(tree: MenuNode[], urlComponent: string): boolean {
  const auth = useAuthStore();
  if (isSuperAdministrator(auth.user)) return true;
  if (isRoleBlockedComponent(urlComponent)) return false;
  return Boolean(findMenuNodeByComponent(tree, urlComponent)?.permissions?.isReaded);
}

/** Tableros que pueden actuar como pantalla de inicio, en orden de prioridad. */
export const HOME_DASHBOARDS = [
  "dashboard-administracion",
  "dashboard-gerencia",
  "dashboard-supervisores",
  "dashboard-operativo",
  "dashboard",
] as const;

export type HomeRoute = (typeof HOME_DASHBOARDS)[number] | "bienvenida";

/**
 * Resuelve a qué pantalla aterriza el usuario tras entrar.
 *
 * Cae al primer tablero sobre el que tenga permiso de lectura, siguiendo el
 * orden de HOME_DASHBOARDS; si no tiene ninguno asignado, va a Bienvenid@.
 *
 * El Super Administrador es un caso aparte: como `canReadComponent` le devuelve
 * `true` para todo, un recorrido normal lo dejaría siempre en el primero de la
 * lista. Se le envía al Dashboard general a propósito, y conserva el acceso a
 * los demás tableros desde el menú para poder revisarlos.
 */
export function resolveAuthenticatedHomeRoute(tree: MenuNode[]): HomeRoute {
  const auth = useAuthStore();
  if (isSuperAdministrator(auth.user)) return "dashboard";

  const asignado = HOME_DASHBOARDS.find((componente) =>
    canReadComponent(tree, componente),
  );
  return asignado ?? "bienvenida";
}

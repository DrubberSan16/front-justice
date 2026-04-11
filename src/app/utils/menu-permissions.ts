import type { MenuNode } from "@/app/types/menu.types";

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

export function findMenuNodeByComponent(tree: MenuNode[], urlComponent: string): MenuNode | null {
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
  const node = findMenuNodeByComponent(tree, urlComponent);
  return (node?.permissions as MenuPermissions) ?? defaultPerms;
}

export function getPermissionsForAnyComponent(
  tree: MenuNode[],
  urlComponents: string[]
): MenuPermissions {
  for (const name of urlComponents) {
    const node = findMenuNodeByComponent(tree, name);
    if (node?.permissions) return node.permissions as MenuPermissions;
  }

  return defaultPerms;
}

export function canReadComponent(tree: MenuNode[], urlComponent: string): boolean {
  return Boolean(findMenuNodeByComponent(tree, urlComponent)?.permissions?.isReaded);
}

export function resolveAuthenticatedHomeRoute(tree: MenuNode[]): "dashboard" | "bienvenida" {
  return canReadComponent(tree, "dashboard") ? "dashboard" : "bienvenida";
}

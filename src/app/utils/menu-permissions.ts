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

export function findMenuNodeByComponent(tree: MenuNode[], urlComponent: string): MenuNode | null {
  for (const node of tree) {
    if (node.urlComponent === urlComponent) return node;
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

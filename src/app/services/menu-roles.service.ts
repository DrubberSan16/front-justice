import { api } from "@/app/http/api";
import type { MenuRole } from "@/app/types/menu-roles.types";

export async function fetchMenuRolesByRole(roleId: string) {
  const { data } = await api.get<MenuRole[]>(
    `/kpi_security/menu-roles/by-role/${roleId}?includeDeleted=true`
  );
  // solo ACTIVE son los que se asignan por default
  return (data ?? []).filter((x) => x.status === "ACTIVE");
}
import type { MenuRole } from "@/app/types/menu-roles.types";
import {
  cachedGet,
  DEFAULT_CONTEXT_CACHE_TTL_MS,
} from "@/app/utils/request-cache";

export async function fetchMenuRolesByRole(roleId: string) {
  const { data } = await cachedGet<MenuRole[]>(
    `/kpi_security/menu-roles/by-role/${roleId}`,
    {
      params: { includeDeleted: "true" },
    },
    { ttlMs: DEFAULT_CONTEXT_CACHE_TTL_MS },
  );
  // solo ACTIVE son los que se asignan por default
  return (data ?? []).filter((x) => x.status === "ACTIVE");
}

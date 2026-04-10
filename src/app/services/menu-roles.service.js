import { api } from "@/app/http/api";
export async function fetchMenuRolesByRole(roleId) {
    const { data } = await api.get(`/kpi_security/menu-roles/by-role/${roleId}?includeDeleted=true`);
    // solo ACTIVE son los que se asignan por default
    return (data ?? []).filter((x) => x.status === "ACTIVE");
}

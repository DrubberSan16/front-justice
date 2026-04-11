import type { LoginResponse } from "@/app/types/auth.types";

type AuthUser = LoginResponse["user"] | null | undefined;

function normalizeRoleName(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function getRoleName(user: AuthUser): string {
  return normalizeRoleName(user?.role?.nombre);
}

export function isSuperAdministrator(user: AuthUser): boolean {
  const roleName = getRoleName(user);
  return [
    "SUPER ADMINISTRADOR",
    "SUPERADMINISTRADOR",
    "SUPER_ADMINISTRADOR",
    "SUPER ADMIN",
  ].includes(roleName);
}

export function isAdministrator(user: AuthUser): boolean {
  const roleName = getRoleName(user);
  return ["ADMINISTRADOR", "ADMINISTRADOR DEL SISTEMA", "ADMIN"].includes(roleName);
}

export function canAccessDigitalTwins(user: AuthUser): boolean {
  if (isSuperAdministrator(user)) return true;
  if (isAdministrator(user)) return false;
  return true;
}

export function canManageDeletedRecords(user: AuthUser): boolean {
  return isSuperAdministrator(user);
}

export function canPurgeLubricantAnalyses(user: AuthUser): boolean {
  return isSuperAdministrator(user);
}

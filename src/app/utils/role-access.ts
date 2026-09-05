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
    "SUPER_ADMIN",
  ].includes(roleName);
}

export function isAdministrator(user: AuthUser): boolean {
  const roleName = getRoleName(user);
  return ["ADMINISTRADOR", "ADMINISTRADOR DEL SISTEMA", "ADMIN"].includes(roleName);
}

/** Solo Administrador y Super Administrador pueden ver los movimientos anulados. */
export function canViewAnnulledRecords(user: AuthUser): boolean {
  return isAdministrator(user) || isSuperAdministrator(user);
}

export function isGeneralManager(user: AuthUser): boolean {
  return ["GERENTE GENERAL", "GERENCIA GENERAL"].includes(getRoleName(user));
}

/** Los importes de materiales solo pertenecen a perfiles administrativos. */
export function canViewMaterialCosts(user: AuthUser): boolean {
  return (
    isGeneralManager(user) ||
    isAdministrator(user) ||
    isSuperAdministrator(user)
  );
}

export function isWarehouseKeeper(user: AuthUser): boolean {
  return ["BODEGA", "BODEGUERO"].includes(getRoleName(user));
}

/**
 * Bodega no ve importes, pero es quien recibe la mercadería y sabe a qué precio
 * entró: puede fijar el costo unitario al registrar un ingreso de bodega en
 * Kardex. El precio es de esa bodega, no del material, porque el mismo repuesto
 * puede costar distinto en cada una. Es lo único que puede hacer con los
 * importes, y solo ahí; el resto de perfiles conserva sus permisos tal cual.
 */
export function canSetIncomeUnitCost(user: AuthUser): boolean {
  return isWarehouseKeeper(user);
}

export function canManageAdministrativeOperations(user: AuthUser): boolean {
  return ["ADMINISTRADOR", "SUPER ADMINISTRADOR", "GERENTE GENERAL"].includes(
    getRoleName(user),
  );
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

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
 * Quién puede fijar el precio al que entra la mercadería.
 *
 * Bodega no ve importes, pero es quien la recibe y sabe a qué precio entró: es
 * lo único que puede hacer con los importes, y solo en el ingreso de bodega.
 * Administración, superadministración y gerencia general también pueden
 * fijarlo — son quienes corrigen una entrada mal costeada — así que la lista
 * es la de costos más bodega.
 *
 * El precio es de esa bodega, no del material: el mismo repuesto puede costar
 * distinto en cada una.
 */
export function canSetIncomeUnitCost(user: AuthUser): boolean {
  return isWarehouseKeeper(user) || canViewMaterialCosts(user);
}

/**
 * Quién puede registrar la salida REAL de material de una orden de trabajo.
 *
 * La salida mueve stock y genera kardex: es un acto de bodega. Operadores,
 * supervisores y técnicos reservan el material en la OT, pero no lo sacan —
 * ellos piden, bodega entrega.
 *
 * Esto solo esconde la pestaña; el permiso de verdad lo aplica el servidor en
 * `POST /work-orders/:id/issue-materials`.
 */
export function canRegisterMaterialIssue(user: AuthUser): boolean {
  return (
    isWarehouseKeeper(user) ||
    isAdministrator(user) ||
    isSuperAdministrator(user) ||
    isGeneralManager(user)
  );
}

export function canManageAdministrativeOperations(user: AuthUser): boolean {
  return ["ADMINISTRADOR", "SUPER ADMINISTRADOR", "GERENTE GENERAL"].includes(
    getRoleName(user),
  );
}

/** Administradores y Super Administradores pueden operar análisis de lubricantes. */
export function canManageLubricantAnalyses(user: AuthUser): boolean {
  return isAdministrator(user) || isSuperAdministrator(user);
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

import { api } from "@/app/http/api";
import { listAllPages } from "@/app/utils/list-all-pages";
import { fetchPaginatedResource } from "@/app/utils/paginated-resource";
import { DEFAULT_CATALOG_CACHE_TTL_MS, invalidateRequestCache } from "@/app/utils/request-cache";

export const EMPLOYEES_ENDPOINT = "/kpi_maintenance/empleados";

export type EmployeeStatus = "ACTIVE" | "INACTIVE";

/** Usuario del sistema al que está vinculado un empleado. */
export type EmployeeUser = {
  id: string;
  name_user: string;
  name_surname: string;
};

export type Employee = {
  id: string;
  user_id: string | null;
  usuario: EmployeeUser | null;
  nombres_apellidos: string;
  cedula: string;
  sueldo: number;
  valor_hora: number;
  /** true si un administrador fijó el valor por hora y no sigue al sueldo. */
  valor_hora_manual: boolean;
  cargo: string;
  status: EmployeeStatus | string;
};

export type EmployeePayload = {
  user_id: string | null;
  nombres_apellidos: string;
  cedula: string;
  sueldo: number;
  /** Un número lo fija a mano; `null` pide el cálculo con el sueldo. */
  valor_hora: number | null;
  cargo: string;
  status: EmployeeStatus | string;
};

export type EmployeeImportRow = {
  fila: number;
  nombres_apellidos: string;
  cedula: string;
  sueldo: number;
  cargo: string;
  user_id?: string | null;
};

export type EmployeeImportResult = {
  total: number;
  creados: number;
  actualizados: number;
  sin_cambios: number;
  omitidos: number;
  errores: Array<{
    fila: number;
    cedula: string;
    nombres_apellidos: string;
    mensaje: string;
  }>;
};

/** Lo que cambia cuando se guarda un empleado: la lista y las sugerencias de cargo. */
function invalidateEmployeeCache() {
  invalidateRequestCache(EMPLOYEES_ENDPOINT);
}

/** Una página de empleados, con búsqueda y estado resueltos por el servidor. */
export async function fetchEmployees(
  filters: { search?: string; status?: string },
  page: number,
  limit: number,
) {
  const response = await fetchPaginatedResource(
    EMPLOYEES_ENDPOINT,
    {
      search: filters.search?.trim() || undefined,
      status: filters.status && filters.status !== "ALL" ? filters.status : undefined,
    },
    { page, limit },
  );
  return {
    data: response.data as Employee[],
    total: Number(response.pagination.total || 0),
  };
}

/** Todos los empleados: sirve para saber qué usuarios y qué cédulas ya están usados. */
export async function fetchAllEmployees(): Promise<Employee[]> {
  return (await listAllPages(EMPLOYEES_ENDPOINT, {}, { limit: 100 })) as Employee[];
}

/** Empleado que se puede elegir como responsable: sin sueldo ni valor por hora. */
export type EmployeeResponsible = {
  id: string;
  user_id: string | null;
  nombres_apellidos: string;
  cargo: string;
};

/**
 * Empleados activos para elegir como responsables de una tarea de OT o de una
 * plantilla. Los pide cualquier rol que arma una OT, por eso el servidor no
 * manda sueldos.
 */
export async function fetchEmployeeResponsibles(): Promise<EmployeeResponsible[]> {
  return (await listAllPages(
    `${EMPLOYEES_ENDPOINT}/responsables`,
    {},
    { limit: 100, cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
  )) as EmployeeResponsible[];
}

/** Cargos ya registrados, sin repetir. */
export async function fetchEmployeePositions(): Promise<string[]> {
  const { data } = await api.get<string[]>(`${EMPLOYEES_ENDPOINT}/cargos`);
  return Array.isArray(data) ? data : [];
}

export async function createEmployee(payload: EmployeePayload) {
  const { data } = await api.post<Employee>(EMPLOYEES_ENDPOINT, payload);
  invalidateEmployeeCache();
  return data;
}

export async function updateEmployee(id: string, payload: Partial<EmployeePayload>) {
  const { data } = await api.patch<Employee>(`${EMPLOYEES_ENDPOINT}/${id}`, payload);
  invalidateEmployeeCache();
  return data;
}

export async function deleteEmployee(id: string) {
  const { data } = await api.delete(`${EMPLOYEES_ENDPOINT}/${id}`);
  invalidateEmployeeCache();
  return data;
}

export async function importEmployees(rows: EmployeeImportRow[]) {
  const { data } = await api.post<EmployeeImportResult>(`${EMPLOYEES_ENDPOINT}/importar`, {
    empleados: rows,
  });
  invalidateEmployeeCache();
  return data;
}

/** El mensaje que el servidor devuelve al fallar una validación, sea texto o lista. */
export function employeeErrorMessage(error: any, fallback: string): string {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.filter(Boolean).join(" ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

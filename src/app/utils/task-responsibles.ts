/**
 * Responsables de una tarea de OT, del lado de la pantalla.
 *
 * Se eligen de Empleados. Lo guardado antes por usuario trae solo `user_id`: si
 * ese usuario esta vinculado a un empleado la persona es ese empleado (igual que
 * en el servidor); si no lo esta, se conserva por su usuario y solo se puede
 * corregir o quitar, no agregar de nuevo.
 *
 * Cada persona se identifica con una clave: `E:<id del empleado>` o, para lo
 * anterior sin empleado, `U:<id del usuario>`.
 */

export type ResponsibleEmployee = {
  id: string;
  user_id?: string | null;
  nombres_apellidos: string;
  cargo?: string | null;
};

export type ResponsibleUser = {
  id?: string | null;
  nameUser?: string | null;
  nameSurname?: string | null;
};

export type TaskResponsible = {
  empleado_id: string | null;
  user_id: string | null;
  username: string | null;
  display_name: string;
  horas: number;
};

export type ResponsibleCatalog = {
  employeesById: Map<string, ResponsibleEmployee>;
  employeesByUserId: Map<string, ResponsibleEmployee>;
  usersById: Map<string, ResponsibleUser>;
};

export type ResponsibleOption = { value: string; title: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown) {
  return String(value ?? "").trim();
}

/** Un id no se imprime nunca: solo cuenta como nombre lo que no es un uuid. */
function readableName(...values: unknown[]) {
  for (const value of values) {
    const name = text(value);
    if (name && !UUID_PATTERN.test(name)) return name;
  }
  return "";
}

export function buildResponsibleCatalog(
  employees: ResponsibleEmployee[] = [],
  users: ResponsibleUser[] = [],
): ResponsibleCatalog {
  const employeesById = new Map<string, ResponsibleEmployee>();
  const employeesByUserId = new Map<string, ResponsibleEmployee>();
  for (const employee of employees) {
    const id = text(employee?.id);
    if (!id) continue;
    employeesById.set(id, employee);
    const userId = text(employee?.user_id);
    if (userId) employeesByUserId.set(userId, employee);
  }
  const usersById = new Map<string, ResponsibleUser>();
  for (const user of users) {
    const id = text(user?.id);
    if (id) usersById.set(id, user);
  }
  return { employeesById, employeesByUserId, usersById };
}

/** Clave de una persona: su empleado y, si no lo tiene, su usuario. */
export function responsibleKey(item: {
  empleado_id?: unknown;
  user_id?: unknown;
}) {
  const empleadoId = text(item?.empleado_id);
  if (empleadoId) return `E:${empleadoId}`;
  const userId = text(item?.user_id);
  return userId ? `U:${userId}` : "";
}

/** Lo contrario de `responsibleKey`. */
export function parseResponsibleKey(key: unknown) {
  const value = text(key);
  if (value.startsWith("E:")) return { empleado_id: value.slice(2), user_id: null };
  if (value.startsWith("U:")) return { empleado_id: null, user_id: value.slice(2) };
  return { empleado_id: null, user_id: null };
}

/**
 * Responsables de una tarea con la forma que usa la pantalla, vengan como
 * vengan: por empleado, por usuario o mezclados. Una misma persona repetida
 * suma sus horas.
 */
export function normalizeTaskResponsibles(
  values: unknown,
  catalog: ResponsibleCatalog,
): TaskResponsible[] {
  const items = Array.isArray(values) ? values : [];
  const grouped = new Map<string, TaskResponsible>();

  for (const raw of items) {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const storedEmpleadoId = text(item.empleado_id);
    const storedUserId = text(item.user_id ?? item.id);
    const employee = storedEmpleadoId
      ? catalog.employeesById.get(storedEmpleadoId)
      : storedUserId
        ? catalog.employeesByUserId.get(storedUserId)
        : undefined;
    const empleadoId = employee ? text(employee.id) : storedEmpleadoId;
    const userId = employee ? text(employee.user_id) : storedUserId;
    const key = responsibleKey({ empleado_id: empleadoId, user_id: userId });
    if (!key) continue;

    const user = userId ? catalog.usersById.get(userId) : undefined;
    const hoursRaw = Number(item.horas ?? 0);
    const hours = Number.isFinite(hoursRaw) && hoursRaw >= 0 ? hoursRaw : 0;
    const previous = grouped.get(key);
    const displayName =
      readableName(employee?.nombres_apellidos) ||
      readableName(item.display_name, previous?.display_name) ||
      readableName(user?.nameSurname, user?.nameUser, item.username) ||
      (empleadoId ? "Empleado" : "Usuario asignado");

    grouped.set(key, {
      empleado_id: empleadoId || null,
      user_id: userId || null,
      username:
        text(user?.nameUser || item.username || previous?.username) || null,
      display_name: displayName,
      horas: Number(((previous?.horas ?? 0) + hours).toFixed(4)),
    });
  }

  return [...grouped.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "es"),
  );
}

/**
 * Agrega o corrige las horas de una persona. `add` suma a lo que ya tenia y
 * `set` lo reemplaza.
 */
export function upsertTaskResponsible(
  current: TaskResponsible[],
  key: string,
  hours: number,
  mode: "add" | "set",
  catalog: ResponsibleCatalog,
): TaskResponsible[] {
  const target = parseResponsibleKey(key);
  const normalizedKey = responsibleKey(target);
  if (!normalizedKey) return current;

  const existing = current.find((item) => responsibleKey(item) === normalizedKey);
  const nextHours =
    mode === "set" ? hours : Number((Number(existing?.horas || 0) + hours).toFixed(4));
  const employee = target.empleado_id ? catalog.employeesById.get(target.empleado_id) : undefined;

  return normalizeTaskResponsibles(
    [
      ...current.filter((item) => responsibleKey(item) !== normalizedKey),
      {
        ...(existing ?? {}),
        empleado_id: target.empleado_id,
        user_id: employee ? employee.user_id ?? null : target.user_id,
        display_name: existing?.display_name || employee?.nombres_apellidos || "",
        horas: nextHours,
      },
    ],
    catalog,
  );
}

/** Quita a una persona de la lista. */
export function removeTaskResponsible(current: TaskResponsible[], key: string) {
  const normalizedKey = text(key);
  return current.filter((item) => responsibleKey(item) !== normalizedKey);
}

/**
 * Lo que se manda al guardar: solo quien es y sus horas. El costo de la hora lo
 * pone el servidor; enviarlo no cambiaria nada.
 */
export function toResponsiblesPayload(list: TaskResponsible[]) {
  return list
    .map((item) => {
      const empleadoId = text(item.empleado_id);
      if (empleadoId) return { empleado_id: empleadoId, horas: item.horas };
      const userId = text(item.user_id);
      return userId ? { user_id: userId, horas: item.horas } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/**
 * Opciones del selector: los empleados activos y, para poder corregir o quitar
 * lo que la tarea ya tiene, quien ya esta en ella aunque hoy no sea elegible.
 */
export function buildResponsibleOptions(
  employees: ResponsibleEmployee[],
  current: TaskResponsible[] = [],
): ResponsibleOption[] {
  const options = employees
    .filter((employee) => text(employee?.id))
    .map((employee) => ({
      value: `E:${text(employee.id)}`,
      title: readableName(employee.nombres_apellidos) || "Empleado",
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "es"));
  const known = new Set(options.map((option) => option.value));
  for (const item of current) {
    const key = responsibleKey(item);
    if (!key || known.has(key)) continue;
    known.add(key);
    options.push({
      value: key,
      title: `${item.display_name} (${item.empleado_id ? "empleado inactivo" : "usuario sin empleado"})`,
    });
  }
  return options;
}

type TemplateResponsibleDetail = {
  empleado_id?: string | null;
  user_id?: string | null;
  label?: string | null;
  status?: string | null;
  is_deleted?: boolean | null;
};

/**
 * Responsables con los que arranca una tarea nueva: los de la plantilla que sean
 * empleados activos. Un usuario sin empleado no se ofrece: el servidor no acepta
 * como responsable nuevo a quien no es empleado y la OT no se podria guardar.
 */
export function defaultTaskResponsibles(
  procedure: { responsabilidades_detalle?: unknown } | null | undefined,
  catalog: ResponsibleCatalog,
): TaskResponsible[] {
  const details = Array.isArray(procedure?.responsabilidades_detalle)
    ? (procedure?.responsabilidades_detalle as TemplateResponsibleDetail[])
    : [];
  return normalizeTaskResponsibles(
    details
      .filter(
        (detail) =>
          text(detail?.empleado_id) &&
          !detail?.is_deleted &&
          text(detail?.status || "ACTIVE").toUpperCase() === "ACTIVE",
      )
      .map((detail) => ({
        empleado_id: detail.empleado_id,
        user_id: detail.user_id ?? null,
        display_name: detail.label ?? "",
        horas: 0,
      })),
    catalog,
  );
}

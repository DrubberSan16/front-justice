import {
  inventoryModules,
  maintenanceModules,
  type MaintenanceField,
  type MaintenanceModuleConfig,
} from "@/app/config/maintenance-modules";

export type UserManualFieldGuide = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  note: string;
};

export type UserManualStep = {
  id: string;
  title: string;
  description: string;
  fields: string[];
  checks: string[];
};

export type UserManualIssue = {
  title: string;
  whatHappens: string;
  why: string;
  howToResolve: string;
};

export type UserManualDefinition = {
  routeName: string;
  title: string;
  category: string;
  summary: string;
  purpose: string;
  prerequisites: string[];
  flow: UserManualStep[];
  fields: UserManualFieldGuide[];
  tips: string[];
  warnings: string[];
  commonErrors: UserManualIssue[];
  checklist: string[];
  relatedRoutes: string[];
};

type ManualOverride = Omit<UserManualDefinition, "fields" | "commonErrors"> & {
  moduleKey?: string;
  extraFields?: UserManualFieldGuide[];
  commonErrors?: UserManualIssue[];
};

const moduleCatalog = new Map<string, MaintenanceModuleConfig>(
  [...inventoryModules, ...maintenanceModules].map((item) => [item.key, item]),
);

export const MANUAL_ROUTE_EXCLUSIONS = new Set([
  "login",
  "usuarios",
  "roles",
  "menu",
  "gemelos-digitales",
  "manual-usuario",
]);

const routeCategoryMap = new Map<string, string>([
  ["dashboard", "Control operativo"],
  ["inteligencia-mantenimiento", "Control operativo"],
  ["alertas", "Control operativo"],
  ["programaciones", "Planificacion"],
  ["work-orders", "Mantenimiento"],
  ["inteligencia-procedimientos", "Mantenimiento"],
  ["inteligencia-analisis-lubricante", "Mantenimiento"],
  ["equipos", "Mantenimiento"],
  ["componentes-equipo", "Mantenimiento"],
  ["tipo-equipo", "Mantenimiento"],
  ["locations", "Mantenimiento"],
  ["planes", "Mantenimiento"],
  ["productos", "Inventario"],
  ["stock-bodega", "Inventario"],
  ["kardex", "Inventario"],
  ["ordenes-compra", "Inventario"],
  ["ordenes-servicio", "Inventario"],
  ["transferencias-bodega", "Inventario"],
  ["sucursales", "Inventario"],
  ["bodegas", "Inventario"],
  ["lineas", "Inventario"],
  ["categorias", "Inventario"],
  ["marcas", "Inventario"],
  ["unidades-medida", "Inventario"],
  ["terceros", "Inventario"],
]);

const mojibakeReplacements: Array<[string, string]> = [
  ["ÃƒÂ¡", "á"],
  ["ÃƒÂ©", "é"],
  ["ÃƒÂ­", "í"],
  ["ÃƒÂ³", "ó"],
  ["ÃƒÂº", "ú"],
  ["ÃƒÂ", "Á"],
  ["ÃƒÂ‰", "É"],
  ["ÃƒÂ", "Í"],
  ["Ãƒâ€œ", "Ó"],
  ["ÃƒÅ¡", "Ú"],
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã", "Á"],
  ["Ã‰", "É"],
  ["Ã", "Í"],
  ["Ã“", "Ó"],
  ["Ãš", "Ú"],
  ["Ã±", "ñ"],
  ["Ã‘", "Ñ"],
  ["Â¿", "¿"],
  ["Â¡", "¡"],
  ["Â·", "·"],
  ["Âº", "º"],
];

function normalizeManualText(value: unknown): string {
  let text = String(value ?? "");
  for (const [from, to] of mojibakeReplacements) {
    text = text.split(from).join(to);
  }
  return text.replace(/\s+/g, " ").trim();
}

function isStructuredUiField(field: MaintenanceField): boolean {
  return (
    field.type === "json" ||
    /json/i.test(String(field.label || "")) ||
    ["payload_json", "detalles", "items", "precauciones", "herramientas", "materiales", "responsabilidades", "actividades"].includes(field.key)
  );
}

function formatManualFieldLabel(field: MaintenanceField): string {
  const normalized = normalizeManualText(field.label);
  return normalized.replace(/\s*\(\s*json\s*\)\s*/gi, "").replace(/\s+json$/i, "").trim();
}

function fieldTypeLabel(field: MaintenanceField): string {
  if (isStructuredUiField(field)) {
    return "Detalle guiado";
  }
  switch (field.type) {
    case "select":
      return "Elegir una opción";
    case "number":
      return "Cantidad";
    case "boolean":
      return "Activar o desactivar";
    case "date":
      return "Fecha";
    case "json":
      return "Detalle guiado";
    default:
      return "Escribir información";
  }
}

function fieldNote(field: MaintenanceField): string {
  if (isStructuredUiField(field)) {
    return "Completa cada fila o sección que aparece en pantalla; el sistema organiza el detalle automáticamente.";
  }
  if (field.relation?.endpoint) {
    return "Elige una opción existente. Si no aparece, primero créala o actívala en el módulo correspondiente.";
  }
  if (field.options?.length) {
    return "Escoge la opción que corresponda al proceso que estás realizando.";
  }
  if (field.type === "boolean") {
    return "Activa esta opción únicamente cuando la condición realmente se cumpla.";
  }
  if (field.type === "number") {
    return "Ingresa la cantidad real y revisa la unidad antes de continuar.";
  }
  if (field.type === "date") {
    return "Selecciona la fecha real en que ocurrió o se realizará la actividad.";
  }
  return "Escribe información clara que otra persona pueda entender al revisar el registro.";
}

function buildFieldGuides(config?: MaintenanceModuleConfig | null): UserManualFieldGuide[] {
  if (!config) return [];

  return config.fields
    .filter((field) => !field.hidden && field.sendInPayload !== false)
    .map((field) => ({
      key: field.key,
      label: formatManualFieldLabel(field),
      type: fieldTypeLabel(field),
      required: Boolean(field.required),
      note: fieldNote(field),
    }));
}

function buildGenericFlow(config: MaintenanceModuleConfig): UserManualStep[] {
  const relationFields = config.fields
    .filter((field) => field.type === "select")
    .map((field) => formatManualFieldLabel(field));
  const requiredFields = config.fields
    .filter((field) => field.required && !field.hidden && field.sendInPayload !== false)
    .map((field) => formatManualFieldLabel(field));

  return [
    {
      id: "prepare",
      title: "Confirma la información previa",
      description:
        relationFields.length > 0
          ? "Antes de empezar, comprueba que las opciones que vas a seleccionar ya estén creadas y activas."
          : "Antes de registrar, confirma que estás en la sucursal correcta y que el proceso corresponde a tu trabajo.",
      fields: relationFields.slice(0, 5),
      checks: [
        "Comprueba que puedes ver y crear registros en este módulo.",
        "Si una opción no aparece, créala primero en su módulo de origen o solicita apoyo al administrador.",
      ],
    },
    {
      id: "capture",
      title: "Completa el registro",
      description:
        "Llena primero los datos obligatorios y después agrega la información que ayudará a identificar y seguir el registro.",
      fields: requiredFields.slice(0, 8),
      checks: [
        "Busca antes de crear para evitar registros repetidos.",
        "Elige del listado la opción que corresponda exactamente a la operación.",
      ],
    },
    {
      id: "validate",
      title: "Guarda y confirma el resultado",
      description:
        "Después de guardar, busca el registro y confirma que quedó disponible para el siguiente paso del proceso.",
      fields: [],
      checks: [
        "Si este registro alimenta otro proceso, abre el módulo relacionado y comprueba que ya aparece.",
        "Edita únicamente para corregir información; no crees otro registro para reemplazarlo.",
      ],
    },
  ];
}

function buildGenericErrors(config?: MaintenanceModuleConfig | null): UserManualIssue[] {
  const relationFields = (config?.fields ?? [])
    .filter((field) => field.type === "select" && !field.hidden)
    .map((field) => formatManualFieldLabel(field));
  const relatedLabel = relationFields.slice(0, 4).join(", ");

  return [
    {
      title: "La opción que necesitas no aparece",
      whatHappens: relatedLabel
        ? `No encuentras una opción en ${relatedLabel}.`
        : "No encuentras la información necesaria para completar el registro.",
      why: "La información previa todavía no fue creada, está inactiva o pertenece a otra sucursal.",
      howToResolve: "Créala o actívala en el módulo correspondiente, verifica la sucursal seleccionada y vuelve a abrir este formulario.",
    },
    {
      title: "El sistema no permite guardar",
      whatHappens: "Presionas Guardar, pero el registro no se completa.",
      why: "Falta un dato obligatorio, existe un registro igual o alguna cantidad no es válida.",
      howToResolve: "Revisa los campos resaltados, busca posibles duplicados y confirma que fechas y cantidades sean válidas.",
    },
    {
      title: "El registro guardado no aparece",
      whatHappens: "El sistema confirmó el guardado, pero no ves el registro en la tabla.",
      why: "Puede estar oculto por un filtro, otra página, periodo o sucursal.",
      howToResolve: "Limpia los filtros, actualiza la tabla y selecciona la sucursal o periodo donde realizaste el registro.",
    },
  ];
}

function buildGenericChecklist(config: MaintenanceModuleConfig): string[] {
  const requiredFields = config.fields
    .filter((field) => field.required && !field.hidden && field.sendInPayload !== false)
    .map((field) => formatManualFieldLabel(field));

  return [
    "Revise su acceso y la información previa antes de crear el registro.",
    requiredFields.length
      ? `Complete los campos obligatorios: ${requiredFields.slice(0, 5).join(", ")}.`
      : "Complete la informacion minima del registro.",
    "Valide el resultado en el listado despues de guardar.",
  ];
}

const manualOverrides: Record<string, ManualOverride> = {
  dashboard: {
    routeName: "dashboard",
    title: "Dashboard principal",
    category: "Control operativo",
    summary:
      "Resume el estado del mes y anio seleccionados para inventario, mantenimiento, alertas y programaciones.",
    purpose:
      "Usa este tablero como punto de control diario para validar si la operacion del periodo va acorde al cronograma y al inventario real.",
    prerequisites: [
      "Debe existir informacion cargada en programaciones, ordenes de trabajo, inventario y alertas.",
      "Selecciona siempre el mes y anio correctos antes de interpretar un KPI.",
    ],
    flow: [
      {
        id: "periodo",
        title: "Define el periodo de analisis",
        description:
          "Selecciona anio y mes. Todos los indicadores del dashboard se recalculan con ese filtro.",
        fields: ["Anio", "Mes"],
        checks: [
          "No compares dos periodos si el filtro no cambio realmente.",
          "Revisa la fecha de ultima actualizacion antes de exportar.",
        ],
      },
      {
        id: "lectura",
        title: "Lee el tablero por bloques",
        description:
          "Primero revisa el panel operativo de equipos, luego alertas recientes, ordenes, inventario critico y cronograma semanal.",
        fields: [],
        checks: [
          "En el panel de equipos, el indicador rojo muestra el estado operativo y es solo lectura.",
          "La palanca verde controla el estado de funcionamiento (Activo/Desactive) y solo se puede accionar con permiso de edicion sobre Equipos.",
          "Si ves inventario critico, valida el detalle por bodega.",
          "Si una card muestra cero, confirma si el periodo realmente no tiene datos.",
        ],
      },
      {
        id: "accion",
        title: "Exporta o profundiza",
        description:
          "Usa los botones de Excel/PDF o entra al modulo relacionado para corregir la desviacion detectada.",
        fields: ["Excel", "PDF", "Actualizar"],
        checks: [
          "Exporta solo despues de validar el filtro activo.",
          "Abre el proceso de origen si necesitas corregir la información.",
        ],
      },
    ],
    extraFields: [
      { key: "year", label: "Anio", type: "Seleccion", required: true, note: "Controla el periodo principal del tablero." },
      { key: "month", label: "Mes", type: "Seleccion", required: true, note: "Define el mes a comparar y exportar." },
    ],
    tips: [
      "Si un KPI no coincide con la realidad operativa, revisa primero el mes y anio activos.",
      "El dashboard sirve como semaforo; la correccion real siempre ocurre en el modulo origen.",
    ],
    warnings: [
      "No interpretes un indicador sin validar la fecha del filtro.",
      "Si un dato operativo no aparece, puede estar faltando el registro en el modulo fuente.",
    ],
    checklist: [
      "Seleccione el anio y mes correctos.",
      "Revise alertas, inventario critico y cronograma semanal.",
      "Exporte solo cuando el tablero ya refleje el periodo correcto.",
    ],
    relatedRoutes: ["inteligencia-mantenimiento", "alertas", "programaciones", "stock-bodega"],
  },
  "inteligencia-mantenimiento": {
    routeName: "inteligencia-mantenimiento",
    title: "Inteligencia operativa",
    category: "Control operativo",
    summary:
      "Consolida indicadores operativos, mantenimiento y documentacion para el periodo filtrado.",
    purpose:
      "Sirve para supervisar el cumplimiento del plan, el comportamiento de las OT y las evidencias operativas del negocio.",
    prerequisites: [
      "Los reportes diarios, programaciones y ordenes deben estar cargados para el periodo.",
      "Trabaja siempre con el mes y anio correctos.",
    ],
    flow: [
      {
        id: "filtro",
        title: "Filtra por mes y anio",
        description:
          "La pantalla recalcula indicadores y tablas segun el periodo seleccionado.",
        fields: ["Anio", "Mes"],
        checks: [
          "Si un modulo reporta cero, compara con el dashboard del mismo periodo.",
        ],
      },
      {
        id: "analisis",
        title: "Revisa los bloques de control",
        description:
          "Analiza mantenimiento, operacion, cronograma, reportes y cumplimiento documental antes de tomar una decision.",
        fields: [],
        checks: [
          "Contrasta OT abiertas con alertas y cronograma semanal.",
          "Usa tablas largas para validar detalle sin perder contexto.",
        ],
      },
      {
        id: "seguimiento",
        title: "Genera seguimiento",
        description:
          "Exporta el reporte o entra al modulo fuente para corregir la desviacion detectada.",
        fields: ["Excel", "PDF", "Actualizar"],
        checks: [
          "No cierres el seguimiento sin validar el modulo fuente.",
        ],
      },
    ],
    extraFields: [
      { key: "year", label: "Anio", type: "Seleccion", required: true, note: "Controla el periodo del analisis." },
      { key: "month", label: "Mes", type: "Seleccion", required: true, note: "Ajusta los KPI y reportes del modulo." },
    ],
    tips: [
      "Usa esta vista para seguimiento tactico y el dashboard para un resumen ejecutivo rapido.",
    ],
    warnings: [
      "No compares periodos mezclados entre dashboard e inteligencia operativa.",
    ],
    checklist: [
      "Filtre el periodo correcto.",
      "Revise desviaciones de mantenimiento, OT y operacion.",
      "Genere seguimiento o exporte el reporte final.",
    ],
    relatedRoutes: ["dashboard", "programaciones", "work-orders", "alertas"],
  },
  programaciones: {
    routeName: "programaciones",
    title: "Programaciones",
    category: "Planificacion",
    summary:
      "Centraliza la programacion mensual MPG, el cronograma semanal y la agenda diaria para que todo cuadre en una sola vista.",
    purpose:
      "Usa este modulo para planificar horas, actividades, semanas y agenda diaria antes de ejecutar ordenes de trabajo.",
    prerequisites: [
      "Los equipos y plantillas deben estar creados.",
      "Define primero el anio, mes y semana que realmente vas a planificar.",
    ],
    flow: [
      {
        id: "mensual",
        title: "Carga o revisa el mensual MPG",
        description:
          "Selecciona anio y mes, importa el Excel mensual si aplica y valida que las horas totales queden correctamente distribuidas por equipo y dia.",
        fields: ["Anio", "Periodo", "Excel mensual MPG"],
        checks: [
          "Las horas del mensual deben coincidir con lo que luego aparece en semanal y agenda.",
          "Si no hay data importada, el periodo debe quedar en blanco para planificar manualmente.",
        ],
      },
      {
        id: "semanal",
        title: "Detalla el cronograma semanal",
        description:
          "Define codigo, semana, fecha inicio/fin, localizacion, resumen y bloques horarios. Luego agrega actividades por dia y por equipo.",
        fields: ["Codigo", "Semana a programar", "Inicio de semana", "Fin de semana", "Localizacion", "Resumen", "Bloques horarios"],
        checks: [
          "Cada bloque horario debe tener inicio y fin validos.",
          "Si agregas actividades por dia, deben reflejarse en agenda y cuadrar con el mensual.",
        ],
      },
      {
        id: "agenda",
        title: "Usa la agenda diaria",
        description:
          "Navega por fecha, revisa indicadores del dia y abre el detalle para ver actividades, horas o registros editables.",
        fields: ["Fecha agenda", "Dia seleccionado"],
        checks: [
          "Si el dia tiene actividades, la modal debe mostrar el detalle operativo.",
          "No elimines una actividad sin confirmar porque afecta el cuadro semanal y la agenda final.",
        ],
      },
    ],
    extraFields: [
      { key: "year", label: "Anio", type: "Seleccion", required: true, note: "Controla el periodo anual de la planificacion." },
      { key: "month", label: "Mes", type: "Seleccion", required: true, note: "Define el mes visible en mensual y semanal." },
      { key: "week", label: "Semana", type: "Seleccion", required: false, note: "Filtra la semana del mes a revisar o cargar." },
      { key: "editable_hours", label: "Bloques horarios", type: "Tiempo", required: true, note: "Cada bloque debe tener hora inicio y hora fin." },
    ],
    tips: [
      "Planifica primero el total mensual y luego baja el detalle al cronograma semanal.",
      "La agenda diaria sirve para validar rapidamente si un dia ya tiene horas o actividades registradas.",
    ],
    warnings: [
      "No cierres la planificacion semanal si las horas no cuadran con el mensual.",
      "Si un bloque horario no tiene fin, el dashboard no podra calcular horas reales.",
    ],
    commonErrors: [
      {
        title: "La OT no aparece para programarla",
        whatHappens: "Buscas una orden de trabajo en el calendario mensual o semanal y no está disponible.",
        why: "La OT todavía no fue creada, pertenece a otra sucursal, ya está cerrada o no tiene el equipo y la plantilla necesarios.",
        howToResolve: "Revisa la OT, confirma su equipo, plantilla, sucursal y estado; después actualiza Programaciones.",
      },
      {
        title: "No se puede guardar la programación",
        whatHappens: "El calendario rechaza la fecha, las horas o la actividad seleccionada.",
        why: "Puede existir la misma OT en ese día, faltar la bodega de la sucursal o haber una fecha fuera del periodo elegido.",
        howToResolve: "Confirma el mes, la sucursal y la fecha; elimina duplicados y verifica que la sucursal tenga su BOD-001 activa.",
      },
      {
        title: "El semanal no coincide con el mensual",
        whatHappens: "Una actividad mensual no aparece o muestra horas diferentes en el cronograma semanal.",
        why: "La actividad no quedó vinculada a la misma OT, equipo o fecha, o la importación mensual aún no terminó.",
        howToResolve: "Revisa el detalle del día en el mensual, espera la confirmación de la carga y vuelve a generar el semanal.",
      },
    ],
    checklist: [
      "Defini el anio, mes y semana correctos.",
      "Valide que mensual, semanal y agenda muestren la misma realidad operativa.",
      "Revise horas por equipo y por dia antes de cerrar la planificacion.",
    ],
    relatedRoutes: ["planes", "work-orders", "dashboard"],
  },
  "work-orders": {
    routeName: "work-orders",
    title: "Ordenes de trabajo",
    category: "Mantenimiento",
    summary:
      "Administra la OT completa: cabecera, tareas ejecutadas, adjuntos, consumos, salida de materiales e historial.",
    purpose:
      "Usa este modulo para ejecutar mantenimiento de punta a punta, con trazabilidad de evidencias, materiales y cierre operativo.",
    prerequisites: [
      "El equipo debe existir y tener su contexto oficial actualizado.",
      "Si la OT nace de una alerta o plantilla, selecciona la referencia correcta desde la cabecera.",
    ],
    flow: [
      {
        id: "cabecera",
        title: "Crea o actualiza la cabecera",
        description:
          "Completa codigo, equipo, estado, tipo de mantenimiento, plantilla, plan operativo, alerta, causa, accion y prevencion.",
        fields: ["Código", "Equipo", "Estado de la orden", "Tipo de mantenimiento", "Plantilla", "Plan operativo", "Alerta", "Causa", "Acción", "Prevención"],
        checks: [
          "La OT debe quedar ligada al equipo correcto y, si aplica, al compartimiento oficial.",
          "No cierres la OT con informacion incompleta en cabecera.",
        ],
      },
      {
        id: "ejecucion",
        title: "Ejecuta tareas y adjunta evidencias",
        description:
          "Marca tareas, llena observaciones y sube evidencias desde la interfaz amigable de adjuntos.",
        fields: ["Tareas ejecutadas", "Adjuntos", "Observaciones"],
        checks: [
          "Toda evidencia cargada debe verse tambien en el tab general de adjuntos.",
          "Si una tarea exige evidencia, no la dejes vacia.",
        ],
      },
      {
        id: "materiales",
        title: "Registra consumos y salida de materiales",
        description:
          "Primero registra consumo o reserva. Luego, en salida de materiales, emite contra la reserva o contra el stock real segun el caso.",
        fields: ["Bodega", "Material", "Cantidad", "Observacion"],
        checks: [
          "La salida debe validar la reserva existente o el stock disponible.",
          "Revisa historial y kardex despues de emitir materiales.",
        ],
      },
      {
        id: "cierre",
        title: "Cierra la OT",
        description:
          "Confirma que tareas, adjuntos y materiales ya reflejan la ejecucion real antes de cambiar el estado a cerrado.",
        fields: ["Cerrar OT", "Guardar"],
        checks: [
          "Una OT bloqueada por otra no debe continuar hasta cerrar la OT anexada.",
          "Cierra solo cuando el impacto ya se refleje en alertas, inventario e historial.",
        ],
      },
    ],
    extraFields: [
      { key: "equipment_component", label: "Compartimiento oficial", type: "Seleccion", required: false, note: "Si la OT aplica a una parte especifica del equipo, selecciona el compartimiento oficial." },
      { key: "blocked_by", label: "OT bloqueante", type: "Seleccion", required: false, note: "Usa esta referencia si una OT depende del cierre de otra orden." },
    ],
    tips: [
      "Trabaja la OT en el orden natural: cabecera, tareas, adjuntos, consumos, salida y cierre.",
      "Si la OT nace de una alerta, revisa luego el estado final de esa alerta.",
    ],
    warnings: [
      "No registres salida de materiales si primero no validaste la reserva o el stock real.",
      "No cierres una OT sin subir las evidencias obligatorias.",
    ],
    commonErrors: [
      {
        title: "La OT no puede pasar a En proceso",
        whatHappens: "Intentas iniciar la orden y el sistema no permite cambiar su estado.",
        why: "La OT todavía no tiene una fecha de programación asignada o no está completa la información que define el trabajo.",
        howToResolve: "Asigna primero la OT a una fecha en Programaciones, confirma equipo y plantilla, vuelve a abrir la OT y presiona Iniciar proceso.",
      },
      {
        title: "No se pueden registrar tareas o evidencias",
        whatHappens: "Las opciones de tareas o adjuntos están bloqueadas o el guardado falla.",
        why: "La cabecera de la OT aún no fue guardada, falta una plantilla o la orden ya está cerrada, bloqueada o anulada.",
        howToResolve: "Guarda primero la cabecera con equipo y plantilla. Si ya está cerrada, bloqueada o anulada, consulta el historial y no intentes modificarla.",
      },
      {
        title: "No se puede emitir un material",
        whatHappens: "El sistema rechaza la salida o no habilita el botón para emitir.",
        why: "La OT no está En proceso, no existe una reserva pendiente o la cantidad supera lo reservado y disponible.",
        howToResolve: "Inicia la OT, registra o revisa la reserva, selecciona la condición Nuevo o Usado y emite solo la cantidad pendiente disponible.",
      },
      {
        title: "La OT no puede cerrarse",
        whatHappens: "El sistema mantiene la orden abierta al intentar finalizarla.",
        why: "Faltan causa, acción o prevención; hay tareas o evidencias obligatorias pendientes; existe una OT bloqueante; o el usuario no es responsable autorizado.",
        howToResolve: "Completa el resultado del trabajo y sus evidencias, cierra primero la OT bloqueante y solicita el cierre al responsable o administrador autorizado.",
      },
    ],
    checklist: [
      "Cabecera completa y ligada al equipo correcto.",
      "Tareas ejecutadas con observaciones y adjuntos.",
      "Consumos y salida de materiales validados.",
      "OT cerrada solo cuando toda la trazabilidad este completa.",
    ],
    relatedRoutes: ["alertas", "programaciones", "kardex", "stock-bodega"],
  },
  kardex: {
    routeName: "kardex",
    title: "Kardex",
    category: "Inventario",
    summary:
      "Registra movimientos manuales y carga masiva de inventario, dejando trazabilidad de entradas y salidas por bodega.",
    purpose:
      "Usa el ingreso manual para ajustes operativos puntuales y la carga masiva para sincronizar inventario desde archivos CSV o XLSX.",
    prerequisites: [
      "Primero valida la bodega y luego el material a intervenir.",
      "Si usaras carga masiva, prepara el archivo con la estructura esperada.",
    ],
    flow: [
      {
        id: "manual",
        title: "Movimiento manual",
        description:
          "Selecciona bodega, material, tipo de movimiento, cantidad y observacion. El costo unitario no se captura porque es un movimiento operativo, no una compra.",
        fields: ["Bodega", "Material", "Tipo de movimiento", "Cantidad", "Observacion"],
        checks: [
          "Para salidas, valida el stock disponible antes de guardar.",
          "Despues de guardar, el formulario debe quedar limpio para el siguiente movimiento.",
        ],
      },
      {
        id: "masiva",
        title: "Carga masiva",
        description:
          "Sube el archivo CSV o XLSX y espera el avance del proceso. El sistema crea catalogos faltantes y ajusta stock por diferencia.",
        fields: ["Archivo CSV/XLSX", "Procesar carga masiva"],
        checks: [
          "No cierres el seguimiento sin validar el estado del job y el resumen final.",
          "Las alertas de inventario deben ejecutarse solo al finalizar la carga.",
        ],
      },
      {
        id: "revision",
        title: "Valida kardex y stock",
        description:
          "Cuando termina el proceso, revisa el listado de kardex y confirma el stock resultante por bodega.",
        fields: ["Listado kardex", "Resumen de carga"],
        checks: [
          "Si un material no aparece, revisa filtros y paginacion.",
          "Contrasta el resultado con stock por bodega y dashboard si hubo cambios grandes.",
        ],
      },
    ],
    extraFields: [
      { key: "file", label: "Archivo CSV/XLSX", type: "Archivo", required: false, note: "Sirve para la sincronizacion masiva de inventario." },
    ],
    tips: [
      "Usa movimiento manual para ajustes puntuales y deja la carga masiva para actualizaciones amplias.",
    ],
    warnings: [
      "No registres salidas manuales si el stock real no alcanza.",
      "Si una carga masiva esta en proceso, evita ejecutar decisiones sobre alertas de inventario hasta que termine.",
    ],
    commonErrors: [
      {
        title: "El material no aparece en la bodega",
        whatHappens: "Seleccionas una bodega, pero no encuentras el material que necesitas mover.",
        why: "El material no está asignado a esa sucursal y bodega, está inactivo o el filtro mantiene otro valor.",
        howToResolve: "Comprueba la sucursal, limpia el filtro y revisa en Stock de bodega que el material esté asignado a la BOD-001 correspondiente.",
      },
      {
        title: "La salida es rechazada",
        whatHappens: "El sistema no permite guardar una salida manual.",
        why: "La cantidad supera el stock utilizable. El stock crítico está reservado para emergencias y no cuenta como disponibilidad normal.",
        howToResolve: "Revisa el stock Nuevo y Usado disponible, reduce la cantidad o solicita un ajuste autorizado si se trata de una emergencia.",
      },
      {
        title: "La carga masiva no termina correctamente",
        whatHappens: "El archivo muestra filas rechazadas o no refleja todos los cambios.",
        why: "Hay códigos duplicados, bodegas o unidades inexistentes, cantidades inválidas o columnas diferentes al formato esperado.",
        howToResolve: "Descarga el resumen, corrige únicamente las filas indicadas y vuelve a cargar el archivo sin modificar los encabezados.",
      },
    ],
    checklist: [
      "Seleccione primero la bodega y luego el material.",
      "Valide cantidades antes de guardar.",
      "Revise el resumen final despues de una carga masiva.",
    ],
    relatedRoutes: ["productos", "stock-bodega", "dashboard"],
  },
  "ordenes-compra": {
    routeName: "ordenes-compra",
    title: "Ordenes de compra",
    category: "Inventario",
    summary:
      "Genera ordenes de compra con materiales, proveedor, bodega destino y detalle economico para abastecimiento.",
    purpose:
      "Sirve para documentar compras y dejar stock preaprobado que luego puede usarse en transferencias de bodega.",
    prerequisites: [
      "Debe existir el proveedor y la bodega destino.",
      "Los materiales del detalle deben estar creados previamente.",
    ],
    flow: [
      {
        id: "cabecera",
        title: "Completa la cabecera",
        description:
          "Carga codigo, fechas, proveedor, bodega destino, vendedor, condicion de pago, referencia, moneda y tipo de cambio.",
        fields: ["Codigo", "Fecha emision", "Fecha requerida", "Proveedor", "Bodega destino", "Vendedor", "Condicion de pago", "Referencia", "Moneda", "Tipo de cambio"],
        checks: [
          "La bodega destino define donde queda el stock preaprobado.",
          "La referencia debe generarse de forma unica antes de guardar.",
        ],
      },
      {
        id: "detalle",
        title: "Agrega materiales al detalle",
        description:
          "Selecciona material, cantidad, costo unitario, descuento e impuestos de cada item de compra.",
        fields: ["Material", "Cantidad", "Costo unitario", "Descuento", "IVA"],
        checks: [
          "No dejes items sin cantidad o costo.",
          "Confirma que el material realmente corresponde al proveedor y a la compra.",
        ],
      },
      {
        id: "seguimiento",
        title: "Guarda y prepara transferencia",
        description:
          "Al guardar la OC, la bodega de compra mantiene stock preaprobado hasta que se use en una transferencia.",
        fields: ["Guardar", "Descargar PDF"],
        checks: [
          "Una OC usada en transferencia ya no debe volver a aparecer como disponible.",
          "Revisa el PDF final si necesitas compartir la compra.",
        ],
      },
    ],
    tips: [
      "Usa la orden de compra como documento fuente cuando la transferencia venga de un abastecimiento nuevo.",
    ],
    warnings: [
      "La OC no genera kardex directo; el movimiento real ocurre al transferir o ingresar segun el flujo aprobado.",
    ],
    commonErrors: [
      {
        title: "No se puede crear la orden de compra",
        whatHappens: "Falta el proveedor, la bodega destino o algún material del detalle.",
        why: "Esos datos deben existir antes de elaborar la compra y corresponder a la sucursal seleccionada.",
        howToResolve: "Crea o activa primero el proveedor, los materiales y la BOD-001 de la sucursal; luego vuelve a completar la orden.",
      },
      {
        title: "La orden no aparece en Transferencias",
        whatHappens: "Buscas una orden de compra guardada para recibir o transferir sus materiales y no aparece.",
        why: "La orden ya fue utilizada, está anulada, no tiene saldo pendiente o pertenece a otra sucursal.",
        howToResolve: "Revisa su estado y saldo, confirma la sucursal y utiliza únicamente órdenes vigentes con cantidades pendientes.",
      },
    ],
    checklist: [
      "Cabecera completa con proveedor y bodega destino.",
      "Detalle de materiales validado.",
      "OC guardada y lista para transferencia o seguimiento documental.",
    ],
    relatedRoutes: ["transferencias-bodega", "stock-bodega", "kardex"],
  },
  "ordenes-servicio": {
    routeName: "ordenes-servicio",
    title: "Ordenes de servicio",
    category: "Inventario",
    summary:
      "Genera ordenes de servicio con formato RJCTI, emisor interno y detalle limitado a materiales marcados como servicio.",
    purpose:
      "Sirve para solicitar servicios a terceros con trazabilidad de quien emite, a quien va dirigido y el detalle economico del documento.",
    prerequisites: [
      "Debe existir el tercero destinatario.",
      "Los materiales del detalle deben tener activo el check Es servicio.",
      "El usuario emisor debe estar activo.",
    ],
    flow: [
      {
        id: "cabecera",
        title: "Completa PARA, DE y datos del documento",
        description:
          "Selecciona el destinatario, el usuario activo que emite la orden, la fecha, el lugar de entrega y la forma de pago.",
        fields: ["Codigo", "Fecha", "Para", "De", "Lugar de entrega", "Forma de pago"],
        checks: [
          "El campo De solo debe mostrar usuarios activos.",
          "El codigo debe mantener el formato RJCTI-AÑO-SECUENCIA.",
        ],
      },
      {
        id: "detalle",
        title: "Agrega solo servicios al detalle",
        description:
          "Selecciona materiales marcados como servicio y registra cantidad, precio unitario, descuento e IVA por cada item.",
        fields: ["Servicio", "Cantidad", "P. unit.", "Desc.", "IVA %"],
        checks: [
          "No deben aparecer materiales sin el check Es servicio.",
          "Valida cantidades y descuentos antes de guardar.",
        ],
      },
      {
        id: "salida",
        title: "Guarda y genera el documento",
        description:
          "Al guardar, el sistema consolida subtotales, leyenda del total y permite descargar el PDF con el formato del Excel base.",
        fields: ["Guardar orden", "Descargar PDF"],
        checks: [
          "Revisa el PDF final antes de compartirlo con el proveedor.",
        ],
      },
    ],
    extraFields: [
      { key: "codigo", label: "Codigo", type: "Texto", required: false, note: "Se autogenera con formato RJCTI-AÑO-SECUENCIA." },
      { key: "fecha_emision", label: "Fecha", type: "Fecha", required: true, note: "Fecha mostrada en el documento." },
      { key: "proveedor_id", label: "Para", type: "Select", required: true, note: "Tercero destinatario de la orden de servicio." },
      { key: "emitido_por_user_id", label: "De", type: "Select", required: true, note: "Usuario activo que emite el documento." },
      { key: "lugar_entrega", label: "Lugar de entrega", type: "Texto", required: false, note: "Ubicacion donde se requiere el servicio." },
      { key: "forma_pago", label: "Forma de pago", type: "Texto", required: false, note: "Condicion pactada con el proveedor." },
      { key: "detalles", label: "Detalle de servicios", type: "Tabla", required: true, note: "Solo admite materiales con Es servicio." },
    ],
    tips: [
      "Marca correctamente los materiales de servicio desde Materiales para que aparezcan en este modulo.",
    ],
    warnings: [
      "No uses este modulo para materiales fisicos comunes; el detalle debe quedar reservado a servicios.",
    ],
    commonErrors: [
      {
        title: "El servicio no aparece en el detalle",
        whatHappens: "No encuentras el concepto que deseas solicitar.",
        why: "El material no está marcado como servicio o se encuentra inactivo.",
        howToResolve: "Abre Materiales, activa la opción Es servicio en el registro correspondiente y vuelve a abrir la orden de servicio.",
      },
      {
        title: "No se puede guardar la orden de servicio",
        whatHappens: "El sistema rechaza el documento o no calcula el total esperado.",
        why: "Falta el destinatario o emisor, no existen filas de servicio válidas o hay cantidades y precios en cero.",
        howToResolve: "Selecciona Para y De, agrega al menos un servicio y revisa cantidad, precio, descuento e IVA antes de guardar.",
      },
    ],
    checklist: [
      "Destinatario seleccionado.",
      "Usuario emisor activo seleccionado.",
      "Detalle compuesto solo por servicios.",
      "PDF revisado antes de enviarlo.",
    ],
    relatedRoutes: ["productos", "terceros", "ordenes-compra"],
  },
  "transferencias-bodega": {
    routeName: "transferencias-bodega",
    title: "Transferencias de bodega",
    category: "Inventario",
    summary:
      "Mueve materiales entre bodegas, ya sea desde una orden de compra o mediante una transferencia directa.",
    purpose:
      "Usa este modulo para trasladar inventario entre bodegas con validacion de disponibilidad y registro en kardex.",
    prerequisites: [
      "Debe existir bodega origen y bodega destino.",
      "Si la transferencia nace de una orden de compra, la OC debe tener stock preaprobado disponible.",
    ],
    flow: [
      {
        id: "tipo",
        title: "Escoge el origen de la transferencia",
        description:
          "Puedes cargar una orden de compra para precargar materiales o hacer una transferencia directa contra stock real.",
        fields: ["Orden de compra", "Bodega origen", "Bodega destino", "Fecha transferencia"],
        checks: [
          "Si eliges OC, la pantalla debe bloquear cantidad disponible segun el preaprobado.",
          "Si es directa, valida contra el stock actual real de la bodega origen.",
        ],
      },
      {
        id: "detalle",
        title: "Confirma cantidades y disponibilidad",
        description:
          "Revisa material, disponible y cantidad a transferir. La cantidad nunca debe superar lo realmente disponible.",
        fields: ["Material", "Disponible", "Cantidad", "Observacion"],
        checks: [
          "Si la cantidad supera el disponible, no debes guardar.",
          "Usa la modal ancha para revisar correctamente origen, destino y detalle.",
        ],
      },
      {
        id: "movimientos",
        title: "Guarda y valida kardex",
        description:
          "Al guardar, el sistema registra salida de la bodega origen e ingreso en la bodega destino; si viene de OC, consume el stock preaprobado.",
        fields: ["Guardar transferencia"],
        checks: [
          "Revisa kardex y stock por bodega despues de la transferencia.",
          "Una orden de compra ya utilizada no debe seguir disponible para otra transferencia.",
        ],
      },
    ],
    tips: [
      "Usa transferencia directa solo cuando el material ya exista fisicamente en la bodega origen.",
    ],
    warnings: [
      "No intentes transferir una cantidad mayor al disponible.",
      "Si la transferencia viene de OC, el control debe hacerse con stock preaprobado, no con kardex previo.",
    ],
    commonErrors: [
      {
        title: "No hay stock para transferir",
        whatHappens: "El material aparece sin disponibilidad o la cantidad es rechazada.",
        why: "La bodega origen no tiene stock Nuevo o Usado suficiente; el stock crítico permanece reservado para emergencias.",
        howToResolve: "Revisa Stock de bodega y Kardex, confirma la condición del material y transfiere únicamente la cantidad utilizable.",
      },
      {
        title: "Origen y destino no son válidos",
        whatHappens: "El sistema no permite continuar con las bodegas seleccionadas.",
        why: "Se eligió la misma bodega, una bodega inactiva o una ubicación que no corresponde a la sucursal del proceso.",
        howToResolve: "Selecciona dos bodegas activas y distintas, verificando la sucursal de origen y destino.",
      },
      {
        title: "La orden de compra no está disponible",
        whatHappens: "No aparece la OC que debería abastecer la transferencia.",
        why: "Ya fue consumida, está anulada, no tiene saldo pendiente o no coincide con la bodega seleccionada.",
        howToResolve: "Revisa la OC y usa una orden vigente que conserve cantidades pendientes para esa bodega.",
      },
    ],
    checklist: [
      "Defini si la transferencia es por OC o directa.",
      "Valide el disponible antes de guardar.",
      "Revise kardex y stock en ambas bodegas al finalizar.",
    ],
    relatedRoutes: ["ordenes-compra", "stock-bodega", "kardex"],
  },
  "inteligencia-analisis-lubricante": {
    routeName: "inteligencia-analisis-lubricante",
    title: "Analisis de lubricante",
    category: "Mantenimiento",
    summary:
      "Concentra reportes, muestras, diagnosticos y tendencias del lubricante por equipo y rango de fechas.",
    purpose:
      "Sirve para validar la salud del lubricante usado, comparar tendencias y apoyar decisiones de mantenimiento predictivo.",
    prerequisites: [
      "El equipo debe existir y estar correctamente identificado.",
      "Usa fechas y codigos de reporte reales para mantener trazabilidad.",
    ],
    flow: [
      {
        id: "registro",
        title: "Registra o importa el analisis",
        description:
          "Completa codigo, equipo, compartimento, fechas, estado diagnostico, cliente y diagnostico.",
        fields: ["Codigo", "Equipo", "Compartimento principal", "Estado diagnostico", "Fecha muestra", "Fecha reporte", "Cliente", "Diagnostico"],
        checks: [
          "No mezcles fechas de muestra y reporte.",
          "Si existe documento origen, enlazalo correctamente.",
        ],
      },
      {
        id: "detalle",
        title: "Registra resultados y diagnóstico",
        description:
          "Completa los resultados de la muestra, el diagnóstico y la identificación del lubricante analizado.",
        fields: ["Resultados de la muestra", "Detalle del análisis", "Diagnóstico"],
        checks: [
          "El detalle debe permitir comparar condicion, viscosidad y hallazgos reales.",
        ],
      },
      {
        id: "consulta",
        title: "Filtra y analiza tendencias",
        description:
          "Usa filtros por fecha para revisar graficos, detalles del punto y reportes exportables.",
        fields: ["Fecha inicial", "Fecha final", "Equipo", "Marca"],
        checks: [
          "Si el grafico pierde contraste, revisa modo claro/oscuro y escala.",
          "Valida que el lubricante analizado coincida con el contexto del equipo.",
        ],
      },
    ],
    tips: [
      "Usa nombres reales de equipo y compartimiento para que el analisis ayude luego al flujo de mantenimiento y recomendaciones.",
    ],
    warnings: [
      "No cargues un analisis sin equipo o sin fechas reales.",
    ],
    checklist: [
      "Registre el analisis con codigo y fechas reales.",
      "Complete los resultados de la muestra y el diagnóstico.",
      "Revise la tendencia por rango de fechas antes de decidir mantenimiento.",
    ],
    relatedRoutes: ["equipos", "work-orders", "dashboard"],
  },
  alertas: {
    routeName: "alertas",
    title: "Alertas",
    category: "Control operativo",
    summary:
      "Muestra alertas abiertas, en proceso o cerradas para mantenimiento e inventario, junto con su referencia y nivel.",
    purpose:
      "Sirve para priorizar riesgos y validar si una accion operativa realmente cerro la causa que originaba la alerta.",
    prerequisites: [
      "Las alertas dependen de inventario, OT, programaciones o procesos operativos ya registrados.",
    ],
    flow: [
      {
        id: "consulta",
        title: "Filtra y revisa las alertas vigentes",
        description:
          "Consulta el listado paginado y revisa tipo, equipo, estado y detalle de cada alerta.",
        fields: ["Tipo alerta", "Estado", "Detalle", "Referencia"],
        checks: [
          "Si una alerta se cerro en proceso, revisa que ya no exista la condicion que la generaba.",
        ],
      },
      {
        id: "seguimiento",
        title: "Abre el modulo origen",
        description:
          "Cuando una alerta apunta a inventario, OT o programacion, corrige el dato en el modulo fuente y vuelve a validar la alerta.",
        fields: [],
        checks: [
          "No intentes corregir la causa desde la alerta si el origen esta en otro modulo.",
        ],
      },
    ],
    tips: [
      "Usa las alertas como lista priorizada de seguimiento, no como modulo de captura primaria.",
    ],
    warnings: [
      "Si una alerta sigue abierta despues de corregir el proceso, revisa la regla de recalcado y la referencia asociada.",
    ],
    checklist: [
      "Revise alertas abiertas e identifique la referencia real.",
      "Corrija el origen en el modulo correspondiente.",
      "Confirme que la alerta cambie de estado luego del recalcado.",
    ],
    relatedRoutes: ["dashboard", "work-orders", "stock-bodega", "programaciones"],
  },
};

const routeSpecificErrors: Record<string, UserManualIssue[]> = {
  productos: [
    {
      title: "El material no aparece en un documento",
      whatHappens: "El material existe, pero no se muestra en compras, servicios, transferencias, Kardex u órdenes de trabajo.",
      why: "Puede estar inactivo, sin unidad, sin asignación de bodega o marcado de forma incorrecta como material o servicio.",
      howToResolve: "Revisa que esté activo, tenga unidad y categoría, confirma si es servicio y asígnalo al stock de la sucursal correspondiente.",
    },
  ],
  "stock-bodega": [
    {
      title: "No se puede asignar el material a la bodega",
      whatHappens: "El sistema no permite crear o actualizar el stock del material.",
      why: "El material o la BOD-001 de la sucursal no existe, está inactiva o ya hay una asignación para esa misma combinación.",
      howToResolve: "Confirma material, sucursal y BOD-001; si la asignación ya existe, edítala en lugar de crear otra.",
    },
    {
      title: "El total de stock parece mayor al disponible",
      whatHappens: "El total incluye unidades que no se pueden usar en una operación normal.",
      why: "El total suma stock Nuevo, Usado y Crítico, pero el stock Crítico queda reservado para emergencias.",
      howToResolve: "Para operaciones normales usa Nuevo + Usado. Libera o consume stock Crítico únicamente mediante el flujo autorizado de emergencia.",
    },
    {
      title: "Se genera una alerta de stock mínimo",
      whatHappens: "El material figura bajo mínimo aunque el total mostrado parezca suficiente.",
      why: "La alerta compara el stock utilizable y descuenta la reserva crítica; por eso el stock Crítico no evita la alerta normal.",
      howToResolve: "Repón stock Nuevo o Usado, o ajusta el mínimo si fue configurado incorrectamente. No aumentes el crítico para ocultar la alerta.",
    },
  ],
  equipos: [
    {
      title: "El equipo no aparece en una OT o programación",
      whatHappens: "No encuentras el equipo al planificar o crear una orden.",
      why: "Está inactivo, pertenece a otra sucursal o todavía no tiene la información básica y el plan de mantenimiento relacionados.",
      howToResolve: "Activa el equipo, revisa su sucursal y completa su plantilla o plan antes de volver al proceso.",
    },
  ],
};

function buildGenericDefinition(
  routeName: string,
  config: MaintenanceModuleConfig,
): UserManualDefinition {
  const category = routeCategoryMap.get(routeName) || "Operacion";
  const fields = buildFieldGuides(config);

  return {
    routeName,
    title: config.title,
    category,
    summary: `Manual operativo para ${config.title.toLowerCase()}.`,
    purpose:
      "Usa este módulo para registrar o consultar información necesaria y dejarla disponible para los procesos que continúan después.",
    prerequisites: [
      "Confirma que puedes consultar y crear información en este módulo.",
      "Verifica que las opciones que necesitas ya estén creadas y activas.",
    ],
    flow: buildGenericFlow(config),
    fields,
    tips: [
      "Completa primero los campos obligatorios y luego los complementarios.",
      "Despues de guardar, usa filtros y paginacion para validar el resultado.",
    ],
    warnings: [
      "No dupliques registros con el mismo codigo o nombre si ya existen.",
    ],
    commonErrors: [...(routeSpecificErrors[routeName] ?? []), ...buildGenericErrors(config)],
    checklist: buildGenericChecklist(config),
    relatedRoutes: [],
  };
}

function mergeManualOverride(override: ManualOverride): UserManualDefinition {
  const config = moduleCatalog.get(override.moduleKey ?? override.routeName) ?? null;
  const configFields = buildFieldGuides(config);
  return {
    ...override,
    fields: [...configFields, ...(override.extraFields ?? [])],
    commonErrors: [
      ...(routeSpecificErrors[override.routeName] ?? []),
      ...(override.commonErrors ?? []),
      ...buildGenericErrors(config).filter(
        (fallback) => ![
          ...(routeSpecificErrors[override.routeName] ?? []),
          ...(override.commonErrors ?? []),
        ].some((item) => item.title === fallback.title),
      ),
    ],
  };
}

export function getOperativeUserManualDefinition(
  routeName: string,
): UserManualDefinition | null {
  const normalizedRoute = String(routeName || "").trim();
  if (!normalizedRoute || MANUAL_ROUTE_EXCLUSIONS.has(normalizedRoute)) {
    return null;
  }

  const override = manualOverrides[normalizedRoute];
  if (override) {
    return mergeManualOverride(override);
  }

  const config = moduleCatalog.get(normalizedRoute);
  if (config) {
    return buildGenericDefinition(normalizedRoute, config);
  }

  return null;
}

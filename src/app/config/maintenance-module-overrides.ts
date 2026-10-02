import { getMaintenanceModule, type MaintenanceModuleConfig, type MaintenanceField } from "@/app/config/maintenance-modules";

export type EnhancedMaintenanceField = MaintenanceField & {
  editor?: "string-list" | "relation-multi-select" | "procedure-activities" | "analysis-details" | "analysis-payload" | "issue-items" | "file-upload" | "project-staff";
  hidden?: boolean;
  fullWidth?: boolean;
  readonly?: boolean;
  /**
   * Muestra el campo solo cuando el formulario cumple la condicion. Un campo
   * oculto por aqui tampoco se valida como obligatorio.
   */
  visibleWhen?: (form: Record<string, any>) => boolean;
  /**
   * Valor con el que arranca un alta nueva en un campo de opciones fijas
   * (`options`). Un alta nueva lo pone; editar un registro no lo toca, para no
   * escribir por encima de lo que ya tenia guardado.
   */
  defaultValue?: string;
  /**
   * Lo mismo para un campo que sale de un catalogo (`relation`). Se resuelve
   * contra el NOMBRE de la opcion ya cargada, nunca contra un id: los ids
   * cambian de una base a otra y el catalogo se edita desde su propia pantalla.
   * Recibe el titulo normalizado (mayusculas, sin tildes ni espacios sobrantes).
   */
  defaultMatch?: (normalizedTitle: string) => boolean;
};

/** Mayusculas, sin tildes y con los espacios colapsados: para comparar nombres. */
export function normalizeOptionTitle(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Valor de la opcion que corresponde al `defaultMatch` del campo, o `null` si
 * el catalogo no tiene ninguna que lo cumpla.
 */
export function pickDefaultOptionValue(
  field: Pick<EnhancedMaintenanceField, "defaultMatch">,
  options: Array<{ value: any; title: string }>,
): string | null {
  if (!field.defaultMatch) return null;
  const match = options.find((option) =>
    field.defaultMatch!(normalizeOptionTitle(option.title)),
  );
  return match ? String(match.value) : null;
}

/** Normaliza un tipo de proceso de plantilla (`PROCEDIMIENTO DE TRABAJO` -> `PROCEDIMIENTO_DE_TRABAJO`). */
function normalizeTipoProceso(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

const isProyectoTemplate = (form: Record<string, any>) =>
  normalizeTipoProceso(form?.tipo_proceso) === "PROYECTO";

const isNotProyectoTemplate = (form: Record<string, any>) =>
  !isProyectoTemplate(form);

export type EnhancedMaintenanceModuleConfig = Omit<MaintenanceModuleConfig, "fields"> & {
  fields: EnhancedMaintenanceField[];
};

function cloneFields(fields: MaintenanceField[]): EnhancedMaintenanceField[] {
  return fields.map((field) => ({ ...field }));
}

function replaceFields(
  config: MaintenanceModuleConfig,
  fields: EnhancedMaintenanceField[],
): EnhancedMaintenanceModuleConfig {
  return {
    ...config,
    fields,
  };
}

/**
 * Como arranca cada campo de Proyectos. Tipo, marca, criticidad y estados
 * quedan bloqueados con su valor de proyecto; la ubicacion arranca puesta pero
 * se puede cambiar, porque un proyecto se ejecuta donde corresponda.
 *
 * El tipo se reconoce con la misma regla con que el listado separa los
 * proyectos del resto de equipos (el nombre contiene PROYECTO), no por un id.
 */
const PROJECT_FIELD_POLICY: Record<
  string,
  Pick<EnhancedMaintenanceField, "readonly" | "defaultValue" | "defaultMatch">
> = {
  equipo_tipo_id: {
    readonly: true,
    defaultMatch: (title) => title.includes("PROYECTO"),
  },
  location_id: {
    defaultMatch: (title) => title.includes("PROYECTOS EN CAMPAMENTO BASE"),
  },
  marca_id: {
    readonly: true,
    defaultMatch: (title) => title === "DESARROLLO PROPIO",
  },
  criticidad: { readonly: true, defaultValue: "MEDIA" },
  estado_operativo: { readonly: true, defaultValue: "OPERATIVO" },
  estado_funcionamiento: { readonly: true, defaultValue: "FUNCIONAMIENTO" },
};

/** En Proyectos el registro se llama proyecto: "equipo" no se entendia ahi. */
function renameEquipoToProyecto(label: string) {
  return label.replace(/\bequipo\b/g, "proyecto").replace(/\bEquipo\b/g, "Proyecto");
}

/**
 * Proyectos comparte el registro de Equipos, pero se captura distinto: el
 * codigo lo asigna el sistema (serie PRY) y no se toca, y lo que un proyecto
 * siempre es -tipo, marca, criticidad y estados- ya viene puesto y bloqueado.
 */
function buildProjectFields(fields: MaintenanceField[]): EnhancedMaintenanceField[] {
  return cloneFields(fields).map((field) => {
    if (field.key === "codigo") {
      return { ...field, label: "Codigo autogenerado", readonly: true, required: false };
    }
    return {
      ...field,
      label: renameEquipoToProyecto(field.label),
      ...PROJECT_FIELD_POLICY[field.key],
    };
  });
}

export function getEnhancedMaintenanceModule(key: string): EnhancedMaintenanceModuleConfig | null {
  const config = getMaintenanceModule(key);
  if (!config) return null;

  if (key === "productos") {
    return replaceFields(config, [
      { key: "status", label: "Estado", type: "select", required: true, options: [
        { value: "ACTIVE", title: "ACTIVE" },
        { value: "INACTIVE", title: "INACTIVE" },
      ] },
      { key: "codigo", label: "Codigo material", type: "text", required: true },
      { key: "nombre", label: "Nombre del material", type: "text", required: true },
      { key: "descripcion", label: "Descripcion del material", type: "text" },
      { key: "linea_id", label: "Linea", type: "select", relation: { endpoint: "/kpi_inventory/lineas" } },
      { key: "categoria_id", label: "Categoria", type: "select", relation: { endpoint: "/kpi_inventory/categorias" } },
      { key: "unidad_medida_id", label: "Unidad de medida", type: "select", relation: { endpoint: "/kpi_inventory/unidades-medida" } },
      { key: "es_aceite", label: "Es aceite", type: "boolean", required: true },
      { key: "sku", label: "SKU", type: "text" },
      { key: "codigo_barras", label: "Codigo barras", type: "text" },
      { key: "es_servicio", label: "Es servicio", type: "boolean", required: true },
      { key: "ultimo_costo", label: "Ultimo costo", type: "number", required: true },
      { key: "costo_promedio", label: "Costo promedio", type: "number", required: true },
      { key: "precio_venta", label: "Precio venta", type: "number", required: true },
      { key: "porcentaje_utilidad", label: "% utilidad", type: "number", required: true },
    ]);
  }

  if (key === "inteligencia-procedimientos") {
    return replaceFields(
      {
        ...config,
        listColumns: [
          { key: "codigo", label: "Codigo" },
          { key: "nombre", label: "Plantilla" },
          { key: "tipo_proceso", label: "Tipo de proceso" },
          { key: "bodega_id", label: "Bodega" },
          { key: "compartimiento_codigo_referencia", label: "Codigo compartimiento" },
          { key: "compartimiento_nombre_oficial", label: "Compartimiento oficial" },
          { key: "documento_referencia", label: "Documento" },
          { key: "version", label: "Version" },
        ],
      },
      [
      { key: "codigo", label: "Codigo autogenerado", type: "text", readonly: true },
      { key: "nombre", label: "Plantilla", type: "text", required: true },
      {
        key: "tipo_proceso",
        label: "Tipo de proceso",
        type: "select",
        required: true,
        options: [
          { value: "MPG", title: "MPG" },
          { value: "SSA", title: "SSA" },
          { value: "PROCEDIMIENTO_TRABAJO", title: "Procedimiento de trabajo" },
          { value: "INSPECCION", title: "Inspeccion" },
          { value: "LUBRICACION", title: "Lubricacion" },
          { value: "PROYECTO", title: "Proyecto" },
        ],
      },
      {
        key: "bodega_id",
        label: "Bodega",
        type: "select",
        required: true,
        relation: { endpoint: "/kpi_inventory/bodegas" },
        // En un proyecto las bodegas se eligen en la OT, no en la plantilla.
        visibleWhen: isNotProyectoTemplate,
      },
      {
        key: "compartimiento_codigo_referencia",
        label: "Codigo compartimiento",
        type: "text",
        visibleWhen: isNotProyectoTemplate,
      },
      {
        key: "compartimiento_nombre_oficial",
        label: "Compartimiento oficial",
        type: "text",
        visibleWhen: isNotProyectoTemplate,
      },
      {
        key: "clase_mantenimiento",
        label: "Clase de mantenimiento",
        type: "select",
        options: [
          { value: "PREVENTIVO", title: "Preventivo" },
          { value: "PREDICTIVO", title: "Predictivo" },
          { value: "CORRECTIVO", title: "Correctivo" },
          { value: "CEBADO", title: "Cebado" },
          { value: "SSA", title: "SSA" },
          { value: "RUTINARIO", title: "Rutinario" },
        ],
        visibleWhen: isNotProyectoTemplate,
      },
      {
        key: "frecuencia_horas",
        label: "Frecuencia horas",
        type: "number",
        visibleWhen: isNotProyectoTemplate,
      },
      { key: "documento_referencia", label: "Documento referencia", type: "text" },
      { key: "version", label: "Version", type: "text" },
      {
        key: "objetivo",
        label: "Objetivo",
        type: "text",
        fullWidth: true,
        visibleWhen: isNotProyectoTemplate,
      },
      // ------------------------------------------- Formato de proyecto
      // Estos campos reproducen la cabecera del documento de proyecto y son los
      // que la OT de Proyecto carga por defecto. Los materiales no estan aqui:
      // en un proyecto son variables y se cargan en la propia OT.
      {
        key: "empresa",
        label: "Empresa",
        type: "text",
        visibleWhen: isProyectoTemplate,
      },
      {
        key: "objetivo",
        label: "Objetivo general",
        type: "text",
        fullWidth: true,
        visibleWhen: isProyectoTemplate,
      },
      {
        key: "objetivos_especificos",
        label: "Objetivos especificos",
        type: "json",
        jsonMode: "array",
        editor: "string-list",
        fullWidth: true,
        visibleWhen: isProyectoTemplate,
      },
      {
        key: "metodologia",
        label: "Metodologia aplicable",
        type: "text",
        fullWidth: true,
        visibleWhen: isProyectoTemplate,
      },
      {
        key: "alcance",
        label: "Alcance del proyecto",
        type: "json",
        jsonMode: "array",
        editor: "string-list",
        fullWidth: true,
        visibleWhen: isProyectoTemplate,
      },
      {
        key: "personal_requerido",
        label: "Personal a contratar",
        type: "json",
        jsonMode: "array",
        editor: "project-staff",
        fullWidth: true,
        visibleWhen: isProyectoTemplate,
      },
      {
        key: "precauciones",
        label: "Precauciones",
        type: "json",
        jsonMode: "array",
        editor: "string-list",
        fullWidth: true,
      },
      {
        key: "herramientas",
        label: "Herramientas",
        type: "json",
        jsonMode: "array",
        editor: "string-list",
        fullWidth: true,
      },
      {
        key: "materiales",
        label: "Materiales",
        type: "json",
        jsonMode: "array",
        editor: "relation-multi-select",
        relation: { endpoint: "/kpi_inventory/productos" },
        fullWidth: true,
        // Los materiales de un proyecto son variables: se cargan en la OT.
        visibleWhen: isNotProyectoTemplate,
      },
      {
        key: "responsabilidades",
        label: "Responsables",
        type: "json",
        jsonMode: "array",
        editor: "relation-multi-select",
        // Empleados activos, sin sueldos: es la lista que ve cualquier rol.
        relation: { endpoint: "/kpi_maintenance/empleados/responsables" },
        fullWidth: true,
      },
      {
        key: "actividades",
        label: "Checklist operativo",
        type: "json",
        jsonMode: "array",
        editor: "procedure-activities",
        fullWidth: true,
      },
      ],
    );
  }

  if (key === "inteligencia-analisis-lubricante") {
    return replaceFields(config, [
      { key: "codigo", label: "Codigo autogenerado", type: "text", readonly: true },
      { key: "equipo_id", label: "Equipo", type: "select", relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "equipo_codigo", label: "Codigo equipo", type: "text" },
      { key: "equipo_nombre", label: "Nombre equipo", type: "text" },
      { key: "compartimento_principal", label: "Compartimento principal", type: "text" },
      {
        key: "estado_diagnostico",
        label: "Estado diagnostico",
        type: "select",
        options: [
          { value: "NORMAL", title: "Normal" },
          { value: "OBSERVACION", title: "Observacion" },
          { value: "ALERTA", title: "Alerta" },
        ],
      },
      { key: "fecha_muestra", label: "Fecha muestra", type: "date" },
      { key: "fecha_reporte", label: "Fecha reporte", type: "date" },
      { key: "cliente", label: "Cliente", type: "text" },
      { key: "diagnostico", label: "Diagnostico", type: "text", fullWidth: true },
      { key: "documento_origen", label: "Documento origen", type: "text" },
      {
        key: "payload_json",
        label: "Datos auxiliares",
        type: "json",
        jsonMode: "object",
        editor: "analysis-payload",
        fullWidth: true,
      },
      {
        key: "detalles",
        label: "Detalle del analisis",
        type: "json",
        jsonMode: "array",
        editor: "analysis-details",
        fullWidth: true,
      },
    ]);
  }

  if (key === "proyectos") {
    return replaceFields(config, buildProjectFields(config.fields));
  }

  // Unidades de generacion es Equipos con otro grupo: el codigo lo asigna el
  // sistema igual que en Equipos (serie EQ) y no se teclea.
  if (["equipos", "unidades-generacion", "componentes-equipo", "tipo-equipo", "locations", "planes"].includes(key)) {
    return replaceFields(
      config,
      cloneFields(config.fields).map((field) =>
        field.key === "codigo"
          ? {
              ...field,
              label: "Codigo autogenerado",
              readonly: true,
              required: false,
            }
          : field,
      ),
    );
  }

  if (key === "work-order-adjuntos") {
    return replaceFields(config, [
      {
        key: "work_order_id",
        label: "Work Order",
        type: "select",
        required: true,
        sendInPayload: false,
        relation: { endpoint: "/kpi_maintenance/work-orders" },
      },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        options: [
          { value: "EVIDENCIA", title: "Evidencia" },
          { value: "DOCUMENTO", title: "Documento" },
          { value: "IMAGEN", title: "Imagen" },
          { value: "VIDEO", title: "Video" },
        ],
      },
      {
        key: "archivo_upload",
        label: "Archivo",
        type: "text",
        required: true,
        sendInPayload: false,
        editor: "file-upload",
        fullWidth: true,
      },
      { key: "nombre", label: "Nombre", type: "text", required: true, hidden: true },
      { key: "contenido_base64", label: "Contenido base64", type: "text", required: true, hidden: true },
      { key: "mime_type", label: "Mime type", type: "text", hidden: true },
      { key: "meta", label: "Metadatos", type: "json", jsonMode: "object", hidden: true },
    ]);
  }

  if (key === "work-order-issue-materials") {
    return replaceFields(config, [
      {
        key: "work_order_id",
        label: "Work Order",
        type: "select",
        required: true,
        sendInPayload: false,
        relation: { endpoint: "/kpi_maintenance/work-orders" },
      },
      {
        key: "items",
        label: "Items",
        type: "json",
        jsonMode: "array",
        required: true,
        editor: "issue-items",
        fullWidth: true,
      },
      { key: "observacion", label: "Observacion", type: "text" },
    ]);
  }

  return {
    ...config,
    fields: cloneFields(config.fields),
  };
}

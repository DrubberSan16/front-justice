import { getMaintenanceModule, type MaintenanceModuleConfig, type MaintenanceField } from "@/app/config/maintenance-modules";

export type EnhancedMaintenanceField = MaintenanceField & {
  editor?: "string-list" | "relation-multi-select" | "procedure-activities" | "analysis-details" | "analysis-payload" | "issue-items" | "file-upload";
  hidden?: boolean;
  fullWidth?: boolean;
};

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
    return replaceFields(config, [
      { key: "codigo", label: "Codigo", type: "text", required: true },
      { key: "nombre", label: "Plantilla", type: "text", required: true },
      {
        key: "tipo_proceso",
        label: "Tipo de proceso",
        type: "select",
        required: true,
        options: [
          { value: "MPG", title: "MPG" },
          { value: "PROCEDIMIENTO_TRABAJO", title: "Procedimiento de trabajo" },
          { value: "INSPECCION", title: "Inspeccion" },
          { value: "LUBRICACION", title: "Lubricacion" },
        ],
      },
      {
        key: "clase_mantenimiento",
        label: "Clase de mantenimiento",
        type: "select",
        options: [
          { value: "PREVENTIVO", title: "Preventivo" },
          { value: "PREDICTIVO", title: "Predictivo" },
          { value: "CORRECTIVO", title: "Correctivo" },
          { value: "RUTINARIO", title: "Rutinario" },
        ],
      },
      { key: "frecuencia_horas", label: "Frecuencia horas", type: "number" },
      { key: "documento_referencia", label: "Documento referencia", type: "text" },
      { key: "version", label: "Version", type: "text" },
      { key: "objetivo", label: "Objetivo", type: "text", fullWidth: true },
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
      },
      {
        key: "responsabilidades",
        label: "Responsabilidades",
        type: "json",
        jsonMode: "array",
        editor: "string-list",
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
    ]);
  }

  if (key === "inteligencia-analisis-lubricante") {
    return replaceFields(config, [
      { key: "codigo", label: "Codigo", type: "text" },
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

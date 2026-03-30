export type FieldType = "text" | "number" | "boolean" | "select" | "date" | "json";

export type MaintenanceField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  readonly?: boolean;
  sendInPayload?: boolean;
  jsonMode?: "array" | "object";
  editor?: "string-list" | "relation-multi-select" | "procedure-activities" | "analysis-details" | "analysis-payload" | "issue-items" | "file-upload";
  hidden?: boolean;
  fullWidth?: boolean;
  options?: Array<{ value: any; title: string }>;
  relation?: {
    endpoint: string;
    valueKey?: string;
    titleKey?: string;
  };
};

export type MaintenanceModuleConfig = {
  key: string;
  title: string;
  endpoint: string;
  itemEndpoint?: string;
  pathParam?: {
    key: string;
    label: string;
    relation: { endpoint: string };
  };
  fields: MaintenanceField[];
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
};

const statusField: MaintenanceField = {
  key: "status",
  label: "Estado",
  type: "select",
  required: true,
  options: [
    { value: "ACTIVE", title: "ACTIVE" },
    { value: "INACTIVE", title: "INACTIVE" },
  ],
};

export const inventoryModules: MaintenanceModuleConfig[] = [
  {
    key: "sucursales",
    title: "Sucursales",
    endpoint: "/kpi_inventory/sucursales",
    fields: [statusField, { key: "codigo", label: "Código", type: "text", required: true }, { key: "nombre", label: "Nombre", type: "text", required: true }],
  },
  {
    key: "bodegas",
    title: "Bodegas",
    endpoint: "/kpi_inventory/bodegas",
    fields: [
      statusField,
      { key: "sucursal_id", label: "Sucursal", type: "select", required: true, relation: { endpoint: "/kpi_inventory/sucursales" } },
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "direccion", label: "Dirección", type: "text" },
      { key: "es_principal", label: "Es principal", type: "boolean", required: true },
    ],
  },
  {
    key: "lineas",
    title: "Líneas",
    endpoint: "/kpi_inventory/lineas",
    fields: [statusField, { key: "codigo", label: "Código", type: "text", required: true }, { key: "nombre", label: "Nombre", type: "text", required: true }],
  },
  {
    key: "categorias",
    title: "Categorías",
    endpoint: "/kpi_inventory/categorias",
    fields: [statusField, { key: "codigo", label: "Código", type: "text" }, { key: "nombre", label: "Nombre", type: "text", required: true }, { key: "descripcion", label: "Descripción", type: "text" }],
  },
  {
    key: "marcas",
    title: "Marcas",
    endpoint: "/kpi_inventory/marcas",
    fields: [statusField, { key: "nombre", label: "Nombre", type: "text", required: true }],
  },
  {
    key: "unidades-medida",
    title: "Unidades de medida",
    endpoint: "/kpi_inventory/unidades-medida",
    fields: [
      statusField,
      { key: "codigo", label: "Código", type: "text" },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "abreviatura", label: "Abreviatura", type: "text" },
      { key: "es_base", label: "Es base", type: "boolean", required: true },
    ],
  },
  {
    key: "productos",
    title: "Materiales",
    endpoint: "/kpi_inventory/productos",
    fields: [
      statusField,
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "descripcion", label: "Descripción", type: "text" },
      { key: "linea_id", label: "Línea", type: "select", relation: { endpoint: "/kpi_inventory/lineas" } },
      { key: "categoria_id", label: "Categoría", type: "select", relation: { endpoint: "/kpi_inventory/categorias" } },
      { key: "unidad_medida_id", label: "Unidad de medida", type: "select", relation: { endpoint: "/kpi_inventory/unidades-medida" } },
      { key: "sku", label: "SKU", type: "text" },
      { key: "codigo_barras", label: "Código barras", type: "text" },
      { key: "es_servicio", label: "Es servicio", type: "boolean", required: true },
      { key: "ultimo_costo", label: "Último costo", type: "number", required: true },
      { key: "costo_promedio", label: "Costo promedio", type: "number", required: true },
      { key: "precio_venta", label: "Precio venta", type: "number", required: true },
      { key: "porcentaje_utilidad", label: "% utilidad", type: "number", required: true },
    ],
  },
  {
    key: "stock-bodega",
    title: "Stock por bodega",
    endpoint: "/kpi_inventory/stock-bodega",
    fields: [
      statusField,
      { key: "bodega_id", label: "Bodega", type: "select", required: true, relation: { endpoint: "/kpi_inventory/bodegas" } },
      { key: "producto_id", label: "Material", type: "select", required: true, relation: { endpoint: "/kpi_inventory/productos" } },
      { key: "stock_actual", label: "Stock actual", type: "number", required: true },
      { key: "stock_min_bodega", label: "Stock mín. bodega", type: "number", required: true },
      { key: "stock_max_bodega", label: "Stock máx. bodega", type: "number", required: true },
      { key: "stock_min_global", label: "Stock mín. global", type: "number", required: true },
      { key: "stock_contenedores", label: "Stock contenedores", type: "number", required: true },
      { key: "costo_promedio_bodega", label: "Costo promedio bodega", type: "number", required: true },
    ],
  },
  {
    key: "terceros",
    title: "Terceros",
    endpoint: "/kpi_inventory/terceros",
    fields: [
      statusField,
      { key: "tipo", label: "Tipo", type: "text", required: true },
      { key: "identificacion", label: "Identificación", type: "text" },
      { key: "razon_social", label: "Razón social", type: "text", required: true },
      { key: "nombre_comercial", label: "Nombre comercial", type: "text" },
      { key: "telefono", label: "Teléfono", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "direccion", label: "Dirección", type: "text" },
    ],
  },
];

export const maintenanceModules: MaintenanceModuleConfig[] = [
  {
    key: "equipos",
    title: "Equipos",
    endpoint: "/kpi_maintenance/equipos",
    fields: [
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "equipo_tipo_id", label: "Tipo de equipo", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/tipo-equipo" } },
      { key: "location_id", label: "Ubicación", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/locaciones" } },
      { key: "marca_id", label: "Marca", type: "select", relation: { endpoint: "/kpi_inventory/marcas" } },
      { key: "criticidad", label: "Criticidad", type: "text" },
      { key: "estado_operativo", label: "Estado operativo", type: "text" },
      { key: "horometro_actual", label: "Horómetro actual", type: "number" },
    ],
  },
  {
    key: "tipo-equipo",
    title: "Tipos de equipo",
    endpoint: "/kpi_maintenance/tipo-equipo",
    fields: [
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "descripcion", label: "Descripción", type: "text" },
    ],
  },
  {
    key: "locations",
    title: "Ubicaciones",
    endpoint: "/kpi_maintenance/locaciones",
    fields: [
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "descripcion", label: "Descripción", type: "text" },
    ],
  },
  {
    key: "planes",
    title: "Planes internos",
    endpoint: "/kpi_maintenance/planes",
    fields: [
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "tipo", label: "Tipo", type: "text" },
      { key: "frecuencia_tipo", label: "Frecuencia tipo", type: "text" },
      { key: "frecuencia_valor", label: "Frecuencia valor", type: "number" },
    ],
  },
  {
    key: "programaciones",
    title: "Programaciones",
    endpoint: "/kpi_maintenance/programaciones",
    fields: [      
      { key: "equipo_id", label: "Equipo", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "plan_id", label: "Plan", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/planes" } },
      { key: "ultima_ejecucion_fecha", label: "Últ. ejecución fecha", type: "date" },
      { key: "ultima_ejecucion_horas", label: "Últ. ejecución horas", type: "number" },
      { key: "proxima_fecha", label: "Próxima fecha", type: "date" },
      { key: "proxima_horas", label: "Próximas horas", type: "number" },
      { key: "activo", label: "Activo", type: "boolean" },
    ],
  },
  {
    key: "alertas",
    title: "Alertas",
    endpoint: "/kpi_maintenance/alertas",
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    fields: [
      { key: "estado", label: "Estado", type: "text" },
      { key: "tipo_alerta", label: "Tipo alerta", type: "text" },
      { key: "equipo_nombre", label: "Equipo", type: "text" },
      { key: "work_order_title", label: "Orden asignada", type: "text" },
    ],
  },
  {
    key: "work-orders",
    title: "Work Orders",
    endpoint: "/kpi_maintenance/work-orders",
    fields: [
      { key: "equipment_id", label: "Equipo", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "status_workflow", label: "Estado", type: "text" },
      { key: "maintenance_kind", label: "Tipo mantención", type: "text" },
      { key: "plan_id", label: "Plan", type: "select", relation: { endpoint: "/kpi_maintenance/planes" } },
      { key: "alerta_id", label: "Alerta", type: "select", relation: { endpoint: "/kpi_maintenance/alertas" } },
    ],
  },
  {
    key: "inteligencia-procedimientos",
    title: "Plantillas MPG y checklist operativo",
    endpoint: "/kpi_maintenance/inteligencia/procedimientos",
    fields: [
      { key: "codigo", label: "Codigo", type: "text", required: true },
      { key: "nombre", label: "Plantilla", type: "text", required: true },
      { key: "tipo_proceso", label: "Tipo de proceso", type: "text", required: true },
      { key: "bodega_id", label: "Bodega", type: "select", relation: { endpoint: "/kpi_inventory/bodegas" } },
      { key: "clase_mantenimiento", label: "Clase de mantenimiento", type: "text" },
      { key: "frecuencia_horas", label: "Frecuencia horas", type: "number" },
      { key: "documento_referencia", label: "Documento referencia", type: "text" },
      { key: "version", label: "VersiÃ³n", type: "text" },
      { key: "objetivo", label: "Objetivo", type: "text" },
      { key: "precauciones", label: "Precauciones (JSON)", type: "json", jsonMode: "array" },
      { key: "herramientas", label: "Herramientas (JSON)", type: "json", jsonMode: "array" },
      { key: "materiales", label: "Materiales (JSON)", type: "json", jsonMode: "array" },
      { key: "responsabilidades", label: "Responsabilidades (JSON)", type: "json", jsonMode: "array" },
      { key: "actividades", label: "Checklist operativo (JSON)", type: "json", jsonMode: "array" },
    ],
  },
  {
    key: "inteligencia-analisis-lubricante",
    title: "AnÃ¡lisis de lubricante",
    endpoint: "/kpi_maintenance/inteligencia/analisis-lubricante",
    fields: [
      { key: "codigo", label: "CÃ³digo", type: "text", required: true },
      { key: "equipo_id", label: "Equipo", type: "select", relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "equipo_codigo", label: "CÃ³digo equipo", type: "text" },
      { key: "equipo_nombre", label: "Nombre equipo", type: "text" },
      { key: "compartimento_principal", label: "Compartimento principal", type: "text" },
      { key: "estado_diagnostico", label: "Estado diagnÃ³stico", type: "text" },
      { key: "fecha_muestra", label: "Fecha muestra", type: "date" },
      { key: "fecha_reporte", label: "Fecha reporte", type: "date" },
      { key: "cliente", label: "Cliente", type: "text" },
      { key: "diagnostico", label: "DiagnÃ³stico", type: "text" },
      { key: "documento_origen", label: "Documento origen", type: "text" },
      { key: "payload_json", label: "Payload auxiliar (JSON)", type: "json", jsonMode: "object" },
      { key: "detalles", label: "Detalle del anÃ¡lisis (JSON)", type: "json", jsonMode: "array" },
    ],
  },
  {
    key: "inteligencia-control-componentes",
    title: "Control de componentes crÃ­ticos",
    endpoint: "/kpi_maintenance/inteligencia/control-componentes",
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    fields: [
      { key: "equipo_codigo", label: "Equipo", type: "text" },
      { key: "tipo_componente", label: "Componente", type: "text" },
      { key: "posicion", label: "PosiciÃ³n", type: "text" },
      { key: "estado", label: "Estado", type: "text" },
      { key: "horas_uso", label: "Horas de uso", type: "number" },
      { key: "reporte_codigo", label: "Reporte", type: "text" },
      { key: "fecha_reporte", label: "Fecha reporte", type: "date" },
    ],
  },
  {
    key: "bitacora",
    title: "Bitácora de equipos",
    endpoint: "/kpi_maintenance/equipos/:id/bitacora",
    itemEndpoint: "/kpi_maintenance/bitacora/:id",
    pathParam: {
      key: "equipo_id",
      label: "Equipo",
      relation: { endpoint: "/kpi_maintenance/equipos" },
    },
    fields: [
      { key: "equipo_id", label: "Equipo", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "fecha", label: "Fecha (ISO)", type: "text", required: true },
      { key: "horometro", label: "Horómetro", type: "number", required: true },
      { key: "estado_id", label: "Estado (ID)", type: "text" },
      { key: "observaciones", label: "Observaciones", type: "text" },
      { key: "registrado_por", label: "Registrado por", type: "text" },
    ],
  },
  {
    key: "estados-equipo",
    title: "Estados de equipos",
    endpoint: "/kpi_maintenance/equipos/:id/estado",
    allowEdit: false,
    allowDelete: false,
    pathParam: {
      key: "equipo_id",
      label: "Equipo",
      relation: { endpoint: "/kpi_maintenance/equipos" },
    },
    fields: [
      { key: "equipo_id", label: "Equipo", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "estado_id", label: "Estado (ID)", type: "text", required: true },
      { key: "fecha_inicio", label: "Fecha inicio (ISO)", type: "text", required: true },
      { key: "motivo", label: "Motivo", type: "text" },
    ],
  },
  {
    key: "eventos-equipo",
    title: "Eventos de equipos",
    endpoint: "/kpi_maintenance/equipos/:id/eventos",
    allowEdit: false,
    allowDelete: false,
    pathParam: {
      key: "equipo_id",
      label: "Equipo",
      relation: { endpoint: "/kpi_maintenance/equipos" },
    },
    fields: [
      { key: "equipo_id", label: "Equipo", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "tipo_evento", label: "Tipo evento", type: "text", required: true },
      { key: "work_order_id", label: "Work Order", type: "select", relation: { endpoint: "/kpi_maintenance/work-orders" } },
      { key: "fecha_inicio", label: "Fecha inicio (ISO)", type: "text" },
      { key: "fecha_fin", label: "Fecha fin (ISO)", type: "text" },
      { key: "severidad", label: "Severidad", type: "number" },
      { key: "descripcion", label: "Descripción", type: "text" },
    ],
  },
  {
    key: "plan-tareas",
    title: "Tareas internas de plan",
    endpoint: "/kpi_maintenance/planes/:id/tareas",
    itemEndpoint: "/kpi_maintenance/planes/tareas/:id",
    pathParam: {
      key: "plan_id",
      label: "Plan",
      relation: { endpoint: "/kpi_maintenance/planes" },
    },
    fields: [
      { key: "plan_id", label: "Plan", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/planes" } },
      { key: "orden", label: "Orden", type: "number", required: true },
      { key: "actividad", label: "Actividad", type: "text", required: true },
      { key: "field_type", label: "Tipo campo", type: "text" },
    ],
  },
  {
    key: "work-order-tareas",
    title: "Tareas ejecutadas de OT",
    endpoint: "/kpi_maintenance/work-orders/:id/tareas",
    itemEndpoint: "/kpi_maintenance/work-orders/tareas/:id",
    pathParam: {
      key: "work_order_id",
      label: "Work Order",
      relation: { endpoint: "/kpi_maintenance/work-orders" },
    },
    fields: [
      { key: "work_order_id", label: "Work Order", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/work-orders" } },
      { key: "plan_id", label: "Plan", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/planes" } },
      { key: "tarea_id", label: "Tarea de plan", type: "text", required: true },
      { key: "valor_boolean", label: "Valor boolean", type: "boolean" },
      { key: "valor_numeric", label: "Valor numérico", type: "number" },
      { key: "valor_text", label: "Valor texto", type: "text" },
      { key: "observacion", label: "Observación", type: "text" },
    ],
  },
  {
    key: "work-order-adjuntos",
    title: "Adjuntos de OT",
    endpoint: "/kpi_maintenance/work-orders/:id/adjuntos",
    pathParam: {
      key: "work_order_id",
      label: "Work Order",
      relation: { endpoint: "/kpi_maintenance/work-orders" },
    },
    allowEdit: false,
    fields: [
      { key: "work_order_id", label: "Work Order", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/work-orders" } },
      { key: "tipo", label: "Tipo", type: "text" },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "contenido_base64", label: "Contenido base64", type: "text", required: true },
      { key: "mime_type", label: "Mime type", type: "text" },
    ],
  },
  {
    key: "work-order-consumos",
    title: "Consumos de OT",
    endpoint: "/kpi_maintenance/work-orders/:id/consumos",
    allowEdit: false,
    allowDelete: false,
    pathParam: {
      key: "work_order_id",
      label: "Work Order",
      relation: { endpoint: "/kpi_maintenance/work-orders" },
    },
    fields: [
      { key: "work_order_id", label: "Work Order", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/work-orders" } },
      { key: "bodega_id", label: "Bodega", type: "select", relation: { endpoint: "/kpi_inventory/bodegas" } },
      { key: "producto_id", label: "Material", type: "select", required: true, relation: { endpoint: "/kpi_inventory/productos" } },
      { key: "cantidad", label: "Cantidad", type: "number", required: true },
      { key: "costo_unitario", label: "Costo unitario", type: "number", required: true },
      { key: "observacion", label: "Observación", type: "text" },
    ],
  },
  {
    key: "work-order-issue-materials",
    title: "Salida de materiales OT",
    endpoint: "/kpi_maintenance/work-orders/:id/issue-materials",
    allowEdit: false,
    allowDelete: false,
    pathParam: {
      key: "work_order_id",
      label: "Work Order",
      relation: { endpoint: "/kpi_maintenance/work-orders" },
    },
    fields: [
      { key: "work_order_id", label: "Work Order", type: "select", required: true, sendInPayload: false, relation: { endpoint: "/kpi_maintenance/work-orders" } },
      { key: "items", label: "Items (JSON)", type: "text", required: true },
      { key: "observacion", label: "Observación", type: "text" },
    ],
  },
];

export function getInventoryModule(key: string): MaintenanceModuleConfig | null {
  return inventoryModules.find((m) => m.key === key) ?? null;
}

export function getMaintenanceModule(key: string): MaintenanceModuleConfig | null {
  return maintenanceModules.find((m) => m.key === key) ?? null;
}

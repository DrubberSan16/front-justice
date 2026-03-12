export type FieldType = "text" | "number" | "boolean" | "select";

export type MaintenanceField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
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
    title: "Productos",
    endpoint: "/kpi_inventory/productos",
    fields: [
      statusField,
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "descripcion", label: "Descripción", type: "text" },
      { key: "linea_id", label: "Línea", type: "select", relation: { endpoint: "/kpi_inventory/lineas" } },
      { key: "categoria_id", label: "Categoría", type: "select", relation: { endpoint: "/kpi_inventory/categorias" } },
      { key: "marca_id", label: "Marca", type: "select", relation: { endpoint: "/kpi_inventory/marcas" } },
      { key: "registro_sanitario", label: "Registro sanitario", type: "text" },
      { key: "unidad_medida_id", label: "Unidad de medida", type: "select", relation: { endpoint: "/kpi_inventory/unidades-medida" } },
      { key: "por_contenedores", label: "Por contenedores", type: "boolean", required: true },
      { key: "sku", label: "SKU", type: "text" },
      { key: "codigo_barras", label: "Código barras", type: "text" },
      { key: "es_servicio", label: "Es servicio", type: "boolean", required: true },
      { key: "requiere_lote", label: "Requiere lote", type: "boolean", required: true },
      { key: "requiere_serie", label: "Requiere serie", type: "boolean", required: true },
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
      { key: "producto_id", label: "Producto", type: "select", required: true, relation: { endpoint: "/kpi_inventory/productos" } },
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
      { key: "location_id", label: "Ubicación", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/locations" } },
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
    key: "planes",
    title: "Planes de mantenimiento",
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
      { key: "ultima_ejecucion_fecha", label: "Últ. ejecución fecha", type: "text" },
      { key: "ultima_ejecucion_horas", label: "Últ. ejecución horas", type: "number" },
      { key: "proxima_fecha", label: "Próxima fecha", type: "text" },
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
      { key: "equipo_id", label: "Equipo (ID)", type: "text" },
    ],
  },
  {
    key: "work-orders",
    title: "Work Orders",
    endpoint: "/kpi_maintenance/work-orders",
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    fields: [
      { key: "equipo_id", label: "Equipo", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/equipos" } },
      { key: "estado", label: "Estado", type: "text" },
      { key: "maintenance_kind", label: "Tipo mantención", type: "text" },
    ],
  },
];

export function getInventoryModule(key: string): MaintenanceModuleConfig | null {
  return inventoryModules.find((m) => m.key === key) ?? null;
}

export function getMaintenanceModule(key: string): MaintenanceModuleConfig | null {
  return maintenanceModules.find((m) => m.key === key) ?? null;
}

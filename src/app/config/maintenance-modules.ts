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

export const maintenanceModules: MaintenanceModuleConfig[] = [
  {
    key: "sucursales",
    title: "Sucursales",
    endpoint: "/kpi_maintenance/sucursales",
    fields: [statusField, { key: "codigo", label: "Código", type: "text", required: true }, { key: "nombre", label: "Nombre", type: "text", required: true }],
  },
  {
    key: "bodegas",
    title: "Bodegas",
    endpoint: "/kpi_maintenance/bodegas",
    fields: [
      statusField,
      { key: "sucursal_id", label: "Sucursal", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/sucursales" } },
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "direccion", label: "Dirección", type: "text" },
      { key: "es_principal", label: "Es principal", type: "boolean", required: true },
    ],
  },
  {
    key: "lineas",
    title: "Líneas",
    endpoint: "/kpi_maintenance/lineas",
    fields: [statusField, { key: "codigo", label: "Código", type: "text", required: true }, { key: "nombre", label: "Nombre", type: "text", required: true }],
  },
  {
    key: "categorias",
    title: "Categorías",
    endpoint: "/kpi_maintenance/categorias",
    fields: [statusField, { key: "codigo", label: "Código", type: "text" }, { key: "nombre", label: "Nombre", type: "text", required: true }, { key: "descripcion", label: "Descripción", type: "text" }],
  },
  {
    key: "marcas",
    title: "Marcas",
    endpoint: "/kpi_maintenance/marcas",
    fields: [statusField, { key: "nombre", label: "Nombre", type: "text", required: true }],
  },
  {
    key: "unidades-medida",
    title: "Unidades de medida",
    endpoint: "/kpi_maintenance/unidades-medida",
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
    endpoint: "/kpi_maintenance/productos",
    fields: [
      statusField,
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "descripcion", label: "Descripción", type: "text" },
      { key: "linea_id", label: "Línea", type: "select", relation: { endpoint: "/kpi_maintenance/lineas" } },
      { key: "categoria_id", label: "Categoría", type: "select", relation: { endpoint: "/kpi_maintenance/categorias" } },
      { key: "marca_id", label: "Marca", type: "select", relation: { endpoint: "/kpi_maintenance/marcas" } },
      { key: "registro_sanitario", label: "Registro sanitario", type: "text" },
      { key: "unidad_medida_id", label: "Unidad de medida", type: "select", relation: { endpoint: "/kpi_maintenance/unidades-medida" } },
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
    endpoint: "/kpi_maintenance/stock-bodega",
    fields: [
      statusField,
      { key: "bodega_id", label: "Bodega", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/bodegas" } },
      { key: "producto_id", label: "Producto", type: "select", required: true, relation: { endpoint: "/kpi_maintenance/productos" } },
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
    endpoint: "/kpi_maintenance/terceros",
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

export function getMaintenanceModule(key: string): MaintenanceModuleConfig | null {
  return maintenanceModules.find((m) => m.key === key) ?? null;
}

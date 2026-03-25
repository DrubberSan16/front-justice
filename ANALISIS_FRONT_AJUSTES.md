# Ajustes realizados al frontend Justice KPI

## 1) Módulo de Órdenes de Trabajo

### Problemas detectados
- El frontend intentaba consultar:
  - `GET /kpi_maintenance/work-orders/:id/consumos`
  - `GET /kpi_maintenance/work-orders/:id/issue-materials`
- El backend actual **no expone** esos endpoints, por lo que la pantalla fallaba al abrir una OT existente.
- El frontend mezclaba estados en español (`CREADA`, `EN PROCESO`, `CERRADA`) con estados más cercanos al backend (`PLANNED`, `IN_PROGRESS`, `CLOSED`).
- El flujo de cierre copiaba automáticamente consumos a “salida de materiales”, pero el backend de emisión requiere reservas previas (`tb_reserva_stock`), así que eso podía provocar errores de `Reserva insuficiente`.
- Los responses envueltos del backend (`{ data, message, meta }`) se trataban en algunos casos como si fueran entidades planas.
- La apertura de adjuntos apuntaba al endpoint JSON del adjunto, no al `data_url` real del archivo.
- En edición de OT, el frontend permitía cambiar campos que el `PATCH` real del backend no persiste (`equipment_id`, `plan_id`, `alerta_id`, etc.).

### Correcciones aplicadas
- Se hizo la carga de detalles de OT tolerante a endpoints no implementados.
- Se normalizaron estados de workflow a valores canónicos:
  - `PLANNED`
  - `IN_PROGRESS`
  - `CLOSED`
- Se cambió la UI para mostrar etiquetas amigables en español.
- Se bloquearon en edición los campos de cabecera que el backend no actualiza realmente.
- Se evitó que el cierre de OT intente emitir materiales automáticamente a partir de los consumos.
- Se corrigió el manejo de respuestas envueltas al registrar consumos y salidas.
- Se corrigió la apertura de adjuntos usando el `data_url` devuelto por la API.
- Se añadieron validaciones para no intentar guardar secciones incompletas desde `Guardar`.

### Resultado esperado
- La pantalla de OT ya no debe romper al abrir registros existentes por ausencia de endpoints de listado de consumos/salidas.
- El guardado de cabecera, consumos, tareas y adjuntos queda alineado con las APIs actuales.
- El cierre de OT deja de disparar automáticamente un flujo de salida de materiales incompatible con el backend actual.

## 2) Dashboard

### Cambios realizados
Se reemplazó el dashboard estático por uno dinámico, alimentado por APIs existentes de:
- `kpi_security`
- `kpi_inventory`
- `kpi_maintenance`

### KPIs incluidos
- Usuarios activos
- Roles configurados
- Equipos
- Planes
- Órdenes de trabajo totales
- Órdenes por estado
- Productos de inventario
- Productos con stock bajo mínimo
- Alertas abiertas
- Alertas recientes
- Órdenes recientes

### Comportamiento
- El dashboard tiene botón de actualización.
- Si alguna API falla, muestra advertencia sin romper toda la vista.
- El cálculo es dinámico según los datos actuales del backend.

## 3) Limitaciones reales del backend detectadas
Estas siguen vigentes porque dependen del backend, no del front:
- No existe listado por OT para consumos ni para salidas de materiales.
- La emisión de materiales requiere reservas de stock previas.
- El `PATCH` de work order no soporta actualizar toda la cabecera.

## 4) Archivos modificados
- `src/views/admin/WorkOrdersView.vue`
- `src/views/dashboard/DashboardView.vue`

## 5) Validación
- Se ejecutó `npm run build` correctamente después de los ajustes.

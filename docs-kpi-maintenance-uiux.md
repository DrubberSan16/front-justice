# KPI Maintenance - Mapa de pantallas y flujos (basado en OpenAPI)

## 1) Jerarquía de pantallas

- KPI Maintenance
  - Equipos
    - Listado de equipos (`GET /kpi_maintenance/equipos`)
    - Crear equipo (`POST /kpi_maintenance/equipos`)
    - Detalle de equipo hub (`GET /kpi_maintenance/equipos/{id}`)
      - Tab Bitácora (`GET/POST /kpi_maintenance/equipos/{id}/bitacora`, `PATCH/DELETE /kpi_maintenance/bitacora/{id}`)
      - Tab Estados (`GET/POST /kpi_maintenance/equipos/{id}/estado`)
      - Tab Eventos (`GET/POST /kpi_maintenance/equipos/{id}/eventos`)
      - Tab Programaciones (filtro por `equipo_id` en front sobre `GET /kpi_maintenance/programaciones`)
      - Tab OTs (filtro por `equipo_id` sobre `GET /kpi_maintenance/work-orders`)
      - Tab Alertas (filtro por `equipo_id` sobre `GET /kpi_maintenance/alertas`)
  - Planes de mantenimiento
    - Listado/crear (`GET/POST /kpi_maintenance/planes`)
    - Editar/eliminar (`GET/PATCH/DELETE /kpi_maintenance/planes/{id}`)
    - Tareas de plan (`GET/POST /kpi_maintenance/planes/{id}/tareas`, `PATCH/DELETE /kpi_maintenance/planes/tareas/{id}`)
  - Programaciones
    - Listado/crear (`GET/POST /kpi_maintenance/programaciones`)
    - Editar/eliminar (`GET/PATCH/DELETE /kpi_maintenance/programaciones/{id}`)
  - Alertas
    - Listado (`GET /kpi_maintenance/alertas`)
    - Recalcular (`POST /kpi_maintenance/alertas/recalcular`)
  - Work Orders
    - Listado (`GET /kpi_maintenance/work-orders`)
    - Registrar consumos (`POST /kpi_maintenance/work-orders/{id}/consumos`)
    - Emitir materiales (`POST /kpi_maintenance/work-orders/{id}/issue-materials`)

## 2) Diseño de pantallas

### Equipos (listado)
- Propósito: punto de entrada operativo diario.
- Usuarios: operador, supervisor, admin.
- Componentes UI:
  - Filtros rápidos: `codigo`, `location_id`, `equipo_tipo_id`, `estado_operativo`, `criticidad`, `page`, `limit`.
  - Tabla: código, nombre, tipo, ubicación, criticidad, estado operativo, horómetro, acciones.
  - Acciones: crear, editar, eliminar, abrir detalle.
- Validaciones front:
  - `codigo` requerido.
  - Manejo de error unique de `codigo`: “El código ya existe, usa otro código”.
- Estados:
  - Loading: skeleton en tabla.
  - Empty: CTA “Crear equipo”.
  - Error: banner + reintento.

### Equipo Detail (hub)
- Propósito: concentrar bitácora/estado/eventos/planificación/OT/alertas.
- Usuarios: operador, supervisor.
- Componentes UI:
  - Header con chips (criticidad, estado operativo).
  - KPIs: horómetro actual, última bitácora, último cambio de estado, alertas activas.
  - Tabs: Bitácora / Estados / Eventos / Programaciones / OTs / Alertas.
- Validaciones:
  - Navegación de tabs sin recarga completa.
  - Feedback por snackbar en operaciones.
- Estados:
  - Loading por tab.
  - Empty contextual por tab.
  - Error por tab + botón reintentar.

### Tab Bitácora
- Tabla: fecha, horómetro, estado, observaciones, registrado por.
- Acciones: crear/editar/eliminar registro.
- Validaciones:
  - `fecha` requerida.
  - `horometro > 0`.
  - no retroceso de horómetro comparando con último valor listado.

### Tab Estados
- Tabla: estado_id, fecha_inicio, motivo.
- Acción principal: cambiar estado.
- Validaciones:
  - `estado_id` requerido.
  - `fecha_inicio` requerida.

### Tab Eventos
- Tabla: tipo_evento, fecha_inicio, fecha_fin, severidad, descripción, work_order_id.
- Filtro: `tipo_evento`.
- Acción: crear evento.

### Planes
- Tabla: código, nombre, tipo, frecuencia_tipo, frecuencia_valor.
- Acciones: crear, editar, eliminar, ver tareas.
- Subpantalla Tareas:
  - Tabla: orden, actividad, field_type.
  - Acciones CRUD.
  - Validaciones: orden y actividad requeridos.

### Programaciones
- Tabla: equipo_id, plan_id, última ejecución fecha/horas, próxima fecha/horas, activo.
- Acciones CRUD.
- Validaciones: `equipo_id` y `plan_id` requeridos.

### Alertas
- Tabla: tipo_alerta, estado, equipo_id, timestamps (si existen en payload).
- Filtros: estado, tipo_alerta, equipo_id.
- Acción secundaria: “Recalcular alertas”.

### Work Orders
- Tabla: id, equipo_id, estado, maintenance_kind.
- Acciones:
  - Registrar consumo (dialog).
  - Emitir materiales (dialog).
- Validaciones consumo:
  - `producto_id`, `cantidad`, `costo_unitario` requeridos.
  - cantidad > 0.
- Validaciones issue-materials:
  - `items` no vacío.
  - `cantidad >= 0.0001`.
  - agrupación visual por `bodega_id` (UI).

## 3) Flujos E2E

### (A) Operación diaria
1. Operador entra a Equipos.
2. Filtra por estado/criticidad.
3. Abre detalle de equipo.
4. Registra bitácora (fecha + horómetro + observación).
5. Si aplica, registra evento.
6. Supervisor cambia estado operativo.

### (B) Planificación y programación
1. Admin crea/edita plan.
2. Admin define tareas del plan.
3. Admin crea programación equipo-plan.
4. Supervisor revisa programación desde detalle equipo.

### (C) Gestión de alertas
1. Supervisor abre Alertas y filtra por estado/tipo/equipo.
2. Ejecuta “Recalcular alertas”.
3. Revisa nuevas alertas y navega al equipo afectado.

### (D) Ejecución de OT + salida de materiales
1. Supervisor entra a Work Orders y filtra.
2. Selecciona OT.
3. Registra consumos puntuales.
4. Emite materiales (items múltiples, agrupados por bodega).
5. Valida feedback y refresco parcial de grilla.

## 4) Componentes reutilizables

- DataTable server-side: props `items`, `total`, `loading`, `page`, `limit`; eventos `update:page`, `update:limit`, `refresh`.
- Dialog CRUD: modo create/edit con esquema dinámico y validaciones.
- Drawer detalle equipo: resumen + tabs lazy.
- Timeline: mezcla estados/eventos por fecha, color por tipo.
- Chips/Badges:
  - `estado_operativo`: OPERATIVO (verde), DETENIDO (rojo), EN_MANTENCION (ámbar).
  - `criticidad`: ALTA (rojo), MEDIA (ámbar), BAJA (azul).
  - `tipo_alerta` y `tipo_evento` con color semántico.

## 5) Esqueleto de rutas (Vue Router)

```ts
/app/equipos
/app/equipos/:id
/app/planes
/app/planes/:id/tareas
/app/programaciones
/app/alertas
/app/work-orders
```

Layout sugerido:
- Sidebar (navegación).
- Topbar con filtros rápidos contextuales.
- Content con tabla compacta + panel de detalle (drawer) según pantalla.

## 6) Wireframe textual (ASCII)

### Equipos

```text
+--------------------------------------------------------------------------------+
| KPI Maintenance > Equipos                             [Nuevo Equipo]           |
| [codigo____] [ubicación____] [tipo____] [estado____] [criticidad____] [Buscar]|
+--------------------------------------------------------------------------------+
| Código | Nombre              | Tipo | Ubicación | Criticidad | Estado | Horom. |
| EQ-001 | Excavadora CAT 320  | ...  | ...       | ALTA       | OPERAT | 1250.5 |
| EQ-002 | Cargador Frontal    | ...  | ...       | MEDIA      | DETEN  |  980.0 |
+--------------------------------------------------------------------------------+
| paginación                                                               1 2 3 |
+--------------------------------------------------------------------------------+
```

### Detalle de Equipo

```text
+--------------------------------------------------------------------------------+
| Equipo EQ-001 - Excavadora CAT 320   [ALTA] [OPERATIVO]                       |
| Horómetro: 1250.5   Últ. bitácora: 01-03-2026   Alertas activas: 2            |
+--------------------------------------------------------------------------------+
| Tabs: [Bitácora] [Estados] [Eventos] [Programaciones] [OTs] [Alertas]         |
+--------------------------------------------------------------------------------+
| (Contenido tab activo: tabla + acciones + filtros)                            |
+--------------------------------------------------------------------------------+
```

## Gaps API detectados y workaround

1. Falta catálogo para `estado_id`, `equipo_tipo_id`, `location_id`.
   - Workaround: input libre de ID + autocompletar local con datos previamente cargados.
   - Gap API sugerido: `GET /kpi_maintenance/catalogos/estados`, `.../equipos-tipo`, `.../locations`.
2. No existe endpoint directo de detalle de OT ni de consumos por OT.
   - Workaround: usar listado + acciones directas POST de consumo/salida.
   - Gap API sugerido: `GET /kpi_maintenance/work-orders/{id}` y `GET /kpi_maintenance/work-orders/{id}/consumos`.
3. No existe endpoint específico de alertas por equipo en ruta dedicada.
   - Workaround: filtrar `GET /kpi_maintenance/alertas?equipo_id=...`.

# Front Justice - KPI Maintenance

Este proyecto incluye módulos CRUD para **KPI Maintenance** e **Inventario**, construidos sobre una vista genérica de mantenimiento.

## Módulos de KPI Maintenance implementados

Se encuentran configurados en `MaintenanceCrudView` y, para OT, en `WorkOrdersView`:

- `/app/tipo-equipo` → Tipos de equipo.
- `/app/equipos` → Equipos.
- `/app/bitacora` → Bitácora por equipo (requiere seleccionar equipo).
- `/app/estados-equipo` → Historial/cambio de estado por equipo (requiere seleccionar equipo).
- `/app/eventos-equipo` → Eventos por equipo (requiere seleccionar equipo).
- `/app/planes` → Planes de mantenimiento.
- `/app/plan-tareas` → Tareas de plan (requiere seleccionar plan).
- `/app/programaciones` → Programaciones equipo-plan.
- `/app/alertas` → Consulta de alertas.
- `/app/work-orders` → Órdenes de trabajo en pantalla unificada (cabecera + tareas + adjuntos + consumos + salida de materiales).

> Regla aplicada: cuando la API trabaja con rutas anidadas por `id` (`.../{id}/...`), la pantalla pide primero un **campo select** para elegir ese ID base (equipo/plan/OT), y luego lista/guarda usando ese contexto.

---

## Flujo recomendado de pantallas (orden de carga coherente)

Para respetar dependencias de negocio y llaves foráneas:

1. **Tipos de equipo**
   - Crear catálogos de tipo (`/app/tipo-equipo`).
2. **Equipos**
   - Crear equipos usando `equipo_tipo_id` (`/app/equipos`).
3. **Planes de mantenimiento**
   - Crear planes (`/app/planes`).
4. **Tareas de plan**
   - Seleccionar plan y crear tareas (`/app/plan-tareas`).
5. **Programaciones**
   - Relacionar `equipo_id` + `plan_id` (`/app/programaciones`).
6. **Work Orders (cabecera)**
   - Crear OT desde equipo/plan/alerta (`/app/work-orders`).
7. **Work Orders (detalle en la misma pantalla)**
   - Con OT creada o en edición, se abre una segunda pantalla superpuesta (fullscreen) desde `/app/work-orders` para registrar:
     - tareas ejecutadas,
     - adjuntos,
     - consumos,
     - emisión de materiales.
8. **Operación del equipo**
   - Registrar bitácora (`/app/bitacora`),
   - cambios de estado (`/app/estados-equipo`),
   - eventos (`/app/eventos-equipo`).
9. **Alertas**
   - Consultar alertas (`/app/alertas`).

---

## Flujo cabecera/detalle (OT)

El patrón aplicado para órdenes de trabajo es:

1. Guardar primero la **cabecera** en `/app/work-orders`.
2. Con la cabecera creada, en el mismo modal fullscreen completar las pestañas de detalle (tareas, adjuntos, consumos y salida de materiales) usando automáticamente el `id` de la OT activa.

Esto replica la lógica solicitada de cabecera primero y detalles después.

---

## Ejecución local

```bash
npm install
npm run dev
```

Build de verificación:

```bash
npm run build
```

import type { UserManualDefinition, UserManualStep } from "./user-manual";

type WorkflowStep = UserManualStep & {
  profiles: string[];
  moduleRoute: string;
  moduleLabel: string;
  requirement: string;
  outcome: string;
};

const supervisor = "Supervisor";
const technician = "Técnico";
const operator = "Operador";
const warehouse = "Bodega";
const administration = "Administrador";
const management = "Gerente general";

// Each step identifies the person who acts, the screen to use and the handoff result.
function step(title: string, profiles: string[], moduleRoute: string, moduleLabel: string,
  description: string, requirement: string, outcome: string, checks: string[] = []): WorkflowStep {
  return { id: moduleRoute + ":" + title, title, profiles, moduleRoute, moduleLabel,
    description, requirement, outcome, fields: [], checks };
}

const workflows: Record<string, WorkflowStep[]> = {
  "work-orders": [
    step("Crear la OT", [supervisor, "Operador (Cebado)"], "work-orders", "Órdenes de trabajo",
      "Selecciona el equipo, el tipo de mantenimiento y las actividades; identifica a los empleados responsables y añade los materiales en Consumos antes de guardar. En Cebado, el creador también asigna la fecha programada en la cabecera.",
      "Equipo activo, ubicación correcta y al menos un material con cantidad positiva para crear desde el formulario.",
      "OT creada en estado Planificada; Bodega recibe el aviso de creación según la sucursal asignada."),
    step("Asignar la fecha programada", [supervisor], "programaciones", "Programaciones",
      "El supervisor que crea la OT coordina la fecha y vincula la orden con su programación. Confirma que la fecha aparezca en la OT antes de iniciar.",
      "OT creada. La fecha y la programación deben corresponder al mismo equipo y a la misma orden.",
      "OT con fecha programada y programación vinculada, lista para pasar a En proceso.",
      ["Para una OT ordinaria, sin programación vinculada el sistema bloquea En proceso.",
       "Cebado exige fecha en su cabecera al crear y genera su programación. OT de proyecto no exige la programación de un equipo individual.",
       "Solo una OT guardada como emergente admite una fecha programada pasada."]),
    step("Solicitar los materiales", [supervisor], "work-order-consumos", "Consumos de la OT",
      "El creador registra las cantidades necesarias y la bodega de origen, en coordinación con los ejecutores. La reserva comunica la necesidad a Bodega y compromete disponibilidad.",
      "OT en Planificación o En proceso; creador autorizado, cantidades positivas y disponibilidad en la bodega seleccionada.",
      "Material reservado para la OT. Reservar todavía no registra la entrega física."),
    step("Entregar y registrar la salida", [warehouse], "work-order-issue-materials", "Salida real de materiales",
      "Bodega prepara el material, verifica la entrega física y registra la salida real de la OT con las cantidades efectivamente entregadas.",
      "OT en Planificación o En revisión, sin bloqueo; solicitud identificada y stock suficiente en la bodega que entrega.",
      "Stock y Kardex actualizados; la OT muestra los materiales entregados."),
    step("Confirmar e imprimir el egreso", [warehouse], "work-orders", "Órdenes de trabajo · Egreso",
      "Bodega revisa el documento de egreso y confirma su impresión. Esta confirmación inicia o reanuda automáticamente la ejecución; no se inicia cambiando el estado manualmente.",
      "Salida real con al menos un material; programación vinculada para OT ordinaria; sin OT bloqueante ni otra ejecución activa del mismo equipo.",
      "OT en En proceso. El equipo queda Parado y el horómetro de inicio se conserva."),
    step("Ejecutar y documentar el trabajo", [technician, operator, supervisor], "work-orders", "Órdenes de trabajo",
      "Completa actividades, horas reales y evidencias. Si se necesita otra entrega, el creador pasa la OT a En revisión para que Bodega registre la salida y vuelva a confirmar el egreso.",
      "Egreso confirmado por Bodega y OT en En proceso.",
      "Trabajo documentado por actividad, listo para revisión del creador."),
    step("Revisar y cerrar", [supervisor], "work-orders", "Órdenes de trabajo",
      "El creador de la OT revisa actividades, evidencias, horas y materiales antes de enviarla a revisión o cerrarla. Explica cualquier diferencia de material requerida por el sistema.",
      "Trabajo documentado y verificaciones de tareas y materiales completas. Solo el creador puede realizar las acciones de revisión, cierre o anulación.",
      "OT cerrada con trazabilidad; las reservas pendientes se liberan y la información alimenta los reportes."),
  ],
  "work-orders-proyecto": [
    step("Definir el alcance", [supervisor], "proyectos", "Proyectos",
      "Confirma el proyecto y las ubicaciones donde se ejecutará el trabajo.", "Proyecto y ubicaciones activos.", "Alcance disponible para crear la OT de proyecto."),
    step("Crear y organizar la OT", [supervisor], "work-orders-proyecto", "OT de proyecto",
      "Selecciona el proyecto y al menos una ubicación o bodega. Completa objetivo general y metodología, actividades, empleados responsables y materiales; cada persona contratada registrada debe tener un cargo.",
      "Proyecto seleccionado, ubicación o bodega, objetivo general y metodología completos; al menos un material con cantidad positiva al crear desde el formulario.",
      "OT de proyecto creada en Planificación con alcance y materiales definidos."),
    step("Entregar materiales por bodega", [warehouse], "work-order-issue-materials", "Salida real de materiales",
      "Cada bodega verifica y registra las cantidades que entrega para el proyecto.", "OT en Planificación o En revisión, sin bloqueo y material disponible en la bodega correspondiente.", "Salidas reales reflejadas en stock, Kardex y OT."),
    step("Confirmar el egreso e iniciar", [warehouse], "work-orders-proyecto", "OT de proyecto · Egreso",
      "Bodega confirma la impresión del egreso; la orden pasa automáticamente a En proceso. La OT de proyecto no exige la programación vinculada de un equipo individual.",
      "OT sin bloqueo y salida real registrada con al menos un material.", "OT de proyecto en En proceso; inicio registrado con el egreso."),
    step("Ejecutar y documentar", [technician, supervisor], "work-orders-proyecto", "OT de proyecto",
      "Registra actividades, horas y evidencias por ubicación. Para materiales adicionales, el creador pasa a En revisión y Bodega registra y confirma un nuevo egreso.", "OT en En proceso después de confirmar el egreso.", "Avance registrado por ubicación y responsable."),
    step("Revisar y cerrar el proyecto ejecutado", [supervisor], "work-orders-proyecto", "OT de proyecto",
      "El creador de la orden revisa el trabajo de todas las ubicaciones y completa los controles de cierre.", "Actividades, evidencias y materiales verificados.", "OT cerrada y disponible para reportes de proyecto."),
  ],
  programaciones: [
    step("Preparar el trabajo", [supervisor], "work-orders", "Órdenes de trabajo",
      "Crea o identifica la OT del equipo; revisa el mantenimiento y los responsables que intervendrán.", "Equipo, plan o necesidad de mantenimiento identificados.", "OT identificada para vincularla con la fecha programada."),
    step("Organizar el mes y la semana", [supervisor], "programaciones", "Programaciones",
      "Distribuye el mantenimiento en el calendario mensual y semanal. Ajusta fechas de acuerdo con la disponibilidad del equipo y del personal.", "Periodo correcto; fechas futuras para OT normales. Solo las emergentes guardadas admiten fechas pasadas.", "Trabajo ubicado en el periodo previsto."),
    step("Vincular la OT y confirmar la fecha", [supervisor], "programaciones", "Programaciones",
      "Asigna la fecha programada y comprueba la vinculación con la OT. Comunica la fecha a los ejecutores.", "La programación y la OT corresponden al mismo trabajo.", "La OT ordinaria puede avanzar a En proceso cuando tenga la programación vinculada."),
    step("Ejecutar y dar seguimiento", [technician, operator, supervisor], "work-orders", "Órdenes de trabajo",
      "Abre la OT para registrar el trabajo; consulta Alertas si hay mantenimientos pendientes o vencidos. Bodega recibe avisos de mantenimiento correspondientes a equipos de sus sucursales asignadas.",
      "OT programada y responsables coordinados.", "Ejecución registrada; el calendario y las alertas permiten revisar pendientes."),
  ],
  "transferencias-bodega": [
    step("Identificar origen y destino", [warehouse], "transferencias-bodega", "Transferencias de bodega",
      "Selecciona las bodegas de origen y destino y la referencia de abastecimiento cuando corresponda.", "Bodegas distintas y materiales identificados; stock o saldo preaprobado disponible en el origen.", "Destino correcto confirmado antes del traslado."),
    step("Verificar cantidades y traslado", [warehouse], "transferencias-bodega", "Transferencias de bodega",
      "Coordina origen y destino y carga las cantidades de cada condición Nuevo o Usado. Si proviene de una compra, revisa el reparto del saldo preaprobado.", "Cantidades positivas dentro del saldo por condición; si proviene de una compra, utiliza su saldo pendiente.", "Detalle listo para registrar una sola vez."),
    step("Registrar la transferencia", [warehouse], "transferencias-bodega", "Transferencias de bodega",
      "Guarda la operación. El registro confirmado actualiza los saldos de ambas bodegas y genera los movimientos correspondientes.", "Origen, destino y cantidades revisados antes de guardar.", "Transferencia registrada. El aviso llega a Bodega de la sucursal de destino."),
    step("Comprobar los dos saldos", [warehouse], "kardex", "Kardex y stock",
      "Consulta la referencia de transferencia en Kardex y revisa el saldo del material en cada bodega desde Stock de bodega.", "Transferencia guardada y referencia identificada.", "Salida de origen y entrada de destino comprobadas; la compra usada queda con su saldo actualizado."),
    step("Preparar la guía de remisión cuando corresponda", [warehouse, administration], "transferencias-bodega", "Transferencias · Guía de remisión",
      "Desde la transferencia, completa destinatario, transportista, placa y fechas; genera y revisa la guía, solicita autorización y consulta el resultado del SRI antes de usar el documento autorizado.",
      "Transferencia vigente y configuración de emisión disponible; datos del transporte verificados.", "Guía y estado de autorización comprobados. Generar la guía no equivale a obtener autorización."),
  ],
  "reservas-bodega": [
    step("Identificar la necesidad", [supervisor, technician, operator], "work-order-consumos", "Consumos de la OT",
      "El creador de la OT registra el material y la bodega de abastecimiento en coordinación con los ejecutores.", "OT vigente, creador autorizado, cantidad positiva y disponibilidad.", "Solicitud de material definida para el trabajo."),
    step("Revisar la reserva", [warehouse], "reservas-bodega", "Reservas de bodega",
      "Filtra bodega, OT y estado; compara reservado, entregado, pendiente y liberado. Este módulo es de consulta: la reserva se origina en la OT y no se libera manualmente aquí.", "Reserva vigente en la sucursal y bodega correspondientes.", "Cantidad comprometida identificada. El stock físico aún no disminuye por reservar."),
    step("Registrar la entrega real", [warehouse], "work-order-issue-materials", "Salida real de materiales",
      "Entrega el material para la OT y registra la cantidad real desde su salida de materiales.", "Material físicamente entregado y stock suficiente.", "Salida registrada y reserva atendida según la cantidad entregada."),
  ],
  "work-order-consumos": [
    step("Revisar la OT y disponibilidad", [supervisor, technician, operator], "stock-bodega", "Stock de bodega",
      "Identifica materiales, bodega y cantidades que requiere el trabajo.", "OT vigente y materiales disponibles.", "Solicitud preparada con la bodega correcta."),
    step("Solicitar y reservar", [supervisor, technician, operator], "work-order-consumos", "Consumos de la OT",
      "El creador registra los materiales y cantidades en la OT, confirma la reserva y coordina con Bodega y los ejecutores.", "OT en Planificación o En proceso, creador autorizado, cantidades positivas y saldo disponible.", "Disponibilidad comprometida para la OT; Bodega recibe el aviso de reserva."),
    step("Recibir la entrega", [warehouse], "work-order-issue-materials", "Salida real de materiales",
      "Bodega registra lo que entrega; el ejecutor comprueba los materiales recibidos.", "Entrega física verificada.", "Cantidades reales visibles en la OT y movimiento en Kardex."),
  ],
  "work-order-issue-materials": [
    step("Consultar la solicitud", [warehouse], "reservas-bodega", "Reservas de bodega",
      "Revisa la OT, la bodega de origen, los materiales y cantidades solicitadas.", "OT vigente y solicitud identificada.", "Material a entregar confirmado."),
    step("Entregar y guardar la salida real", [warehouse], "work-order-issue-materials", "Salida real de materiales",
      "Registra únicamente la cantidad efectivamente entregada. Verifica bodega y saldo antes de confirmar.", "OT en Planificación o En revisión, sin bloqueo, material entregado físicamente y stock suficiente.", "Salida real registrada; el stock disminuye y se genera Kardex."),
    step("Confirmar la impresión del egreso", [warehouse], "work-orders", "Órdenes de trabajo · Egreso",
      "Comprueba y confirma el documento de egreso. La confirmación inicia o reanuda automáticamente la OT; para proyectos se realiza desde OT de proyecto.",
      "Salida real registrada; OT sin bloqueo; programación vinculada para una OT ordinaria.", "OT en En proceso y registro del inicio o reanudación."),
    step("Conciliar con el trabajo", [supervisor, technician], "work-orders", "Órdenes de trabajo",
      "Comprueba las cantidades recibidas en la OT y documenta diferencias antes del cierre.", "Salida real guardada.", "Materiales y ejecución conciliados para la revisión del creador de la OT."),
  ],
  "ordenes-compra": [
    step("Preparar proveedor y materiales", [administration, management], "terceros", "Terceros y materiales",
      "Confirma el proveedor, los materiales del catálogo y la bodega destino de la compra.", "Proveedor, materiales y bodega activos.", "Datos de abastecimiento listos."),
    step("Crear la orden de compra", [administration, management], "ordenes-compra", "Órdenes de compra",
      "Completa cabecera, fechas, proveedor, bodega, cantidades e importes; revisa el documento y guarda.", "Detalle completo y permisos para gestionar importes.", "Orden guardada con saldo preaprobado; todavía no genera Kardex del movimiento real."),
    step("Recibir y transferir el abastecimiento", [warehouse], "transferencias-bodega", "Transferencias de bodega",
      "Utiliza la orden vigente como referencia de abastecimiento y registra las cantidades realmente recibidas o transferidas.", "Compra vigente con saldo pendiente y destino verificado.", "Movimiento real registrado y saldo pendiente de la compra actualizado."),
    step("Verificar la recepción", [warehouse, administration], "stock-bodega", "Stock de bodega",
      "Comprueba el stock y el Kardex del material recibido. Administración revisa los importes de acuerdo con sus permisos.", "Transferencia o ingreso guardado.", "Abastecimiento documentado y stock disponible en el destino."),
  ],
  "ordenes-servicio": [
    step("Definir el servicio", [supervisor, administration], "work-orders", "Órdenes de trabajo",
      "Identifica el servicio externo requerido y la OT o referencia que justifica la contratación.", "Necesidad, alcance y proveedor identificados.", "Servicio definido para contratar."),
    step("Registrar la orden", [administration, management], "ordenes-servicio", "Órdenes de servicio",
      "Completa proveedor, fechas, detalle del servicio e importes; revisa y guarda el documento.", "Proveedor activo, materiales marcados como Es servicio en Materiales y permisos para gestionar importes.", "Orden de servicio registrada; no incrementa stock de materiales."),
    step("Verificar y respaldar el trabajo", [supervisor, administration], "work-orders", "Órdenes de trabajo",
      "Comprueba el servicio realizado y conserva la referencia y evidencias en la OT cuando corresponda.", "Servicio realizado y respaldo disponible.", "Trabajo documentado para revisión y reportes."),
  ],
  "ingresos-bodega": [
    step("Verificar la recepción física", [warehouse], "ingresos-bodega", "Ingresos de bodega",
      "Comprueba documento de origen, material, bodega y cantidades recibidas.", "Material creado y bodega correcta; respaldo del ingreso disponible.", "Recepción física conciliada con el documento."),
    step("Registrar el ingreso", [warehouse], "ingresos-bodega", "Ingresos de bodega",
      "Carga cantidades, referencia y costo de entrada cuando el formulario lo requiera; guarda una sola vez.", "Cantidades positivas y datos del ingreso completos.", "Entrada registrada y saldo incrementado."),
    step("Confirmar disponibilidad", [warehouse], "stock-bodega", "Stock de bodega",
      "Busca el material y revisa el nuevo saldo; consulta Kardex para verificar fecha y referencia.", "Ingreso guardado.", "Material disponible para reservas, transferencias y salidas."),
  ],
  "egresos-bodega": [
    step("Confirmar el motivo de salida", [warehouse], "egresos-bodega", "Egresos de bodega",
      "Identifica destino, motivo y respaldo. Si el material pertenece a una OT, utiliza su Salida real de materiales para conservar el vínculo.", "Material y bodega identificados; stock suficiente.", "Tipo de salida y referencia correctos."),
    step("Registrar las cantidades entregadas", [warehouse], "egresos-bodega", "Egresos de bodega",
      "Completa la referencia y las cantidades reales; revisa y guarda el egreso.", "Entrega física confirmada y saldo suficiente.", "Egreso registrado y stock disminuido."),
    step("Verificar el movimiento", [warehouse], "kardex", "Kardex",
      "Consulta material, bodega, fecha y referencia del egreso.", "Egreso confirmado.", "Salida trazable y saldo conciliado con la existencia física."),
  ],
  "stock-bodega": [
    step("Consultar la bodega correcta", [warehouse, supervisor, technician], "stock-bodega", "Stock de bodega",
      "Filtra sucursal, bodega y material; compara existencia, reservas y disponibilidad.", "Sucursal asignada y material identificado.", "Saldo disponible conocido antes de solicitar o mover material."),
    step("Atender stock mínimo", [warehouse, administration], "ordenes-compra", "Órdenes de compra",
      "Bodega informa la necesidad de reposición cuando el saldo llegue al mínimo; Administración prepara el abastecimiento si corresponde.", "Mínimo configurado y revisión de reservas y necesidades.", "Reposición coordinada. Los avisos de mínimo llegan a Bodega de las sucursales asignadas."),
    step("Comprobar el origen del saldo", [warehouse], "kardex", "Kardex",
      "Consulta movimientos antes de registrar una diferencia o repetir una operación.", "Material y bodega seleccionados.", "Saldo explicado por sus ingresos, salidas y transferencias."),
  ],
  kardex: [
    step("Delimitar la consulta", [warehouse, administration], "kardex", "Kardex",
      "Selecciona material, bodega y periodo del movimiento que necesitas comprobar.", "Referencia o material identificado.", "Listado limitado a la operación que vas a revisar."),
    step("Seguir la referencia de origen", [warehouse, administration], "kardex", "Kardex",
      "Revisa entradas, salidas y saldo. Identifica si el movimiento viene de ingreso, egreso, transferencia o salida real de una OT.", "Filtros correctos y movimientos cargados.", "Operación de origen identificada para resolver diferencias."),
    step("Conciliar y compartir", [warehouse, administration], "stock-bodega", "Stock de bodega",
      "Contrasta el saldo con Stock de bodega y la existencia física; exporta la consulta disponible si necesitas respaldo.", "Mismo material, bodega y periodo de comparación.", "Inventario conciliado sin registrar movimientos duplicados."),
    step("Si necesitas cargar inventario en lote", [administration, management], "kardex", "Kardex · Carga masiva",
      "Descarga el formato actualizado, prepara el CSV o Excel y procesa la carga. Revisa avance, resumen y filas rechazadas; el sistema crea materiales faltantes y ajusta el stock por diferencia.",
      "Solo para una carga masiva; permisos de creación y acceso a importes. Bodegas, códigos, unidades y cantidades revisados en el archivo.",
      "Carga terminada y saldos verificados en Stock de bodega; corrige únicamente las filas rechazadas antes de volver a cargar."),
    step("Si corresponde revisar y cerrar el costeo", [administration, management], "kardex", "Kardex · Costeo FIFO",
      "Abre Costeo FIFO, revisa pendientes, alertas y meses cerrados. Antes de cerrar un mes disponible, concilia los movimientos con Bodega y confirma el periodo.",
      "Solo para el control de costeo; acceso administrativo, FIFO activo y mes disponible para cierre.",
      "Periodo revisado y, si se confirma el cierre, costos definitivos. El mes cerrado ya no admite movimientos dentro de ese periodo y el cierre no se deshace."),
  ],
  alertas: [
    step("Identificar el pendiente", [supervisor, operator, technician, warehouse], "alertas", "Alertas",
      "Filtra el equipo y revisa el tipo de aviso, la fecha y la OT relacionada si existe.", "Equipo de la sucursal correspondiente y aviso vigente.", "Necesidad de mantenimiento identificada."),
    step("Preparar la atención", [supervisor], "work-orders", "Órdenes de trabajo",
      "Abre la OT vinculada o crea una para la necesidad detectada; evita duplicar órdenes para el mismo trabajo.", "Alerta revisada y responsables coordinados.", "Trabajo documentado con una OT."),
    step("Programar y ejecutar", [supervisor, technician, operator], "programaciones", "Programaciones",
      "El supervisor asigna y vincula la fecha de la OT ordinaria. Los ejecutores documentan la atención en la OT.", "OT creada y programación vinculada antes de En proceso.", "Mantenimiento atendido y avance disponible para seguimiento de la alerta."),
  ],
  dashboard: [
    step("Identificar el equipo y lectura", [operator, supervisor], "dashboard", "Control operativo",
      "Selecciona el equipo o unidad de generación y verifica su estado y lectura actual.", "Equipo activo y unidad de generación configurada cuando corresponda.", "Lectura de referencia identificada."),
    step("Registrar la operación", [operator], "dashboard", "Control operativo",
      "Registra las acciones de operación disponibles y las lecturas reales. Revisa los contadores que se actualizan durante la generación.", "Datos reales del turno y equipo correctos.", "Historial operativo actualizado; las OT consultan su horómetro automáticamente."),
    step("Atender los avisos", [supervisor, technician], "alertas", "Alertas",
      "Revisa avisos de mantenimiento y coordina OT y programación cuando un equipo requiera intervención.", "Lecturas e historial actualizados.", "Mantenimiento coordinado a partir de la operación real."),
  ],
  "inteligencia-analisis-lubricante": [
    step("Identificar muestra y equipo", [administration, supervisor], "equipos", "Equipos",
      "Confirma equipo, componente, aceite del catálogo y fecha de la muestra antes de interpretar el resultado.", "Informe de laboratorio disponible, equipo identificado y aceite registrado en Materiales.", "Muestra asociada al equipo y aceite correctos."),
    step("Registrar o importar las muestras", [administration, supervisor], "inteligencia-analisis-lubricante", "Análisis de lubricantes",
      "Selecciona equipo y aceite. Registra datos de muestra, fechas y resultados; para carga masiva utiliza el formato Excel del módulo y revisa el avance y los errores de importación.", "Respaldo del laboratorio y permiso de creación o edición.", "Muestras guardadas; los errores de importación están identificados para corregirlos."),
    step("Interpretar historial y tendencias", [supervisor, technician, administration], "inteligencia-analisis-lubricante", "Análisis de lubricantes",
      "Abre el historial del equipo y aceite, revisa condición de la última muestra y tendencias en el rango de fechas. Contrasta las recomendaciones con el informe de laboratorio.", "Muestras guardadas y mismo equipo, aceite y periodo para comparar.", "Necesidad técnica de seguimiento o intervención identificada."),
    step("Coordinar la intervención", [supervisor, technician], "work-orders", "Órdenes de trabajo",
      "Revisa las recomendaciones y crea una OT si hace falta intervenir; programa el trabajo y registra las evidencias de atención.", "Resultado revisado y necesidad confirmada.", "Acción técnica documentada en la OT y su programación."),
  ],
  "inteligencia-procedimientos": [
    step("Localizar el procedimiento", [supervisor, technician], "inteligencia-procedimientos", "Procedimientos",
      "Busca el procedimiento del equipo o tipo de mantenimiento y revisa sus actividades.", "Equipo y trabajo identificados.", "Secuencia técnica de referencia seleccionada."),
    step("Preparar las actividades", [supervisor], "planes", "Planes de mantenimiento",
      "Relaciona las actividades aplicables con el plan o la plantilla que utilizarás en el trabajo.", "Procedimiento revisado y adecuado para el equipo.", "Actividades preparadas como referencia para la OT."),
    step("Aplicar y evidenciar", [technician, supervisor], "work-orders", "Órdenes de trabajo",
      "Utiliza las actividades en la OT y registra el trabajo real, sus horas y evidencias.", "OT creada y programada cuando corresponde.", "Procedimiento aplicado con ejecución trazable."),
  ],
  "gemelos-digitales": [
    step("Seleccionar el equipo", [operator, technician, supervisor], "gemelos-digitales", "Gemelos digitales",
      "Selecciona el equipo y revisa su información y representación disponibles.", "Equipo identificado dentro de tus sucursales.", "Contexto del equipo visible."),
    step("Revisar condición y componentes", [operator, technician, supervisor], "gemelos-digitales", "Gemelos digitales",
      "Consulta los datos asociados, componentes e historial disponibles para reconocer la condición del equipo.", "Información del equipo cargada.", "Hallazgos identificados para contrastar con operación y mantenimiento."),
    step("Coordinar la atención", [supervisor], "work-orders", "Órdenes de trabajo",
      "Verifica el hallazgo en el equipo y registra o consulta una OT si requiere intervención.", "Necesidad confirmada y revisión de órdenes existentes.", "Acción de mantenimiento coordinada sin duplicar trabajo."),
  ],
  "work-order-tareas": [
    step("Revisar las actividades asignadas", [technician, operator, supervisor], "work-orders", "Órdenes de trabajo",
      "Identifica la OT y las actividades correspondientes a los empleados responsables.", "OT vigente; programación vinculada antes de iniciar una OT ordinaria.", "Actividades a ejecutar confirmadas."),
    step("Documentar la ejecución", [technician, operator], "work-order-tareas", "Actividades de la OT",
      "Registra resultados, horas reales y los datos requeridos por cada actividad.", "Trabajo realmente ejecutado y responsable identificado.", "Actividades documentadas para la revisión."),
    step("Revisar el cumplimiento", [supervisor], "work-orders", "Órdenes de trabajo",
      "El creador comprueba actividades y evidencias antes de gestionar la revisión o el cierre.", "Actividades completas y datos obligatorios registrados.", "OT preparada para los controles de cierre."),
  ],
  "work-order-adjuntos": [
    step("Identificar la evidencia", [technician, operator, supervisor], "work-orders", "Órdenes de trabajo",
      "Selecciona la OT y la actividad que respalda el archivo o fotografía.", "OT correcta y archivo legible disponible.", "Evidencia vinculada al trabajo adecuado."),
    step("Adjuntar y comprobar", [technician, operator, supervisor], "work-order-adjuntos", "Adjuntos de la OT",
      "Carga los archivos y comprueba que se pueden abrir y que explican el trabajo realizado.", "Archivo permitido y descripción clara.", "Respaldo disponible para quien revisa la OT."),
    step("Validar el respaldo", [supervisor], "work-orders", "Órdenes de trabajo",
      "Revisa que las evidencias requeridas por las actividades estén completas antes de cerrar.", "Adjuntos guardados y visibles.", "Ejecución respaldada para revisión y cierre."),
  ],
  bienvenida: [
    step("Identificar tu área de trabajo", [operator, technician, supervisor, warehouse, administration, management], "bienvenida", "Inicio",
      "Revisa los módulos que aparecen en tu menú y ubica el proceso que necesitas realizar.", "Sesión iniciada y sucursales asignadas cuando corresponda.", "Módulo de trabajo identificado."),
    step("Seguir la guía del proceso", [operator, technician, supervisor, warehouse, administration, management], "manual-usuario", "Manual de usuario",
      "Busca un módulo, recorre sus pasos y coordina con el perfil indicado antes de avanzar.", "Necesidad de trabajo definida.", "Secuencia, responsables y requisitos comprendidos."),
  ],
  usuarios: [
    step("Preparar el acceso", [administration], "roles", "Perfiles y permisos",
      "Identifica el perfil operativo y los permisos necesarios para el trabajo de la persona.", "Responsabilidades y sucursales definidas.", "Perfil y alcance acordados."),
    step("Registrar y asignar el usuario", [administration], "usuarios", "Usuarios",
      "Completa los datos de acceso, correo, perfil y sucursales asignadas. Confirma el estado del usuario.", "Datos válidos y perfil disponible.", "Usuario configurado; las sucursales determinan su alcance y los avisos de Bodega."),
    step("Comprobar la operación", [administration], "usuarios", "Usuarios",
      "Confirma con la persona que tiene el acceso previsto y puede consultar sus módulos.", "Usuario guardado y activo.", "Acceso verificado para el trabajo asignado."),
  ],
  roles: [
    step("Definir responsabilidades", [administration], "roles", "Perfiles y permisos",
      "Establece qué procesos necesita consultar o gestionar cada perfil operativo.", "Responsabilidades acordadas.", "Alcance del perfil definido."),
    step("Configurar los permisos", [administration], "roles", "Perfiles y permisos",
      "Configura las opciones disponibles para el perfil y revisa los permisos por módulo.", "Módulos identificados y permiso para gestionar perfiles.", "Permisos guardados para el perfil."),
    step("Asignar y verificar", [administration], "usuarios", "Usuarios",
      "Asigna el perfil al usuario y verifica el menú disponible con el alcance de sus sucursales.", "Perfil configurado.", "Usuario con permisos acordes con sus responsabilidades."),
  ],
  menu: [
    step("Ubicar el módulo", [administration], "menu", "Menú",
      "Identifica la opción de navegación y su módulo de destino.", "Módulo existente y organización del menú definida.", "Ruta y grupo identificados."),
    step("Organizar la navegación", [administration], "menu", "Menú",
      "Completa nombre, ruta y grupo de la opción según las herramientas disponibles; evita duplicar accesos.", "Ruta válida del sistema.", "Opción de navegación guardada."),
    step("Verificar permisos y acceso", [administration], "roles", "Perfiles y permisos",
      "Comprueba que los perfiles correspondientes tengan acceso a la opción y al módulo asociado.", "Menú guardado y perfiles definidos.", "Navegación coherente con los permisos de cada usuario."),
  ],
};

// Catalogs share a sequence, but their prerequisites and downstream modules differ.
type CatalogSpec = { profiles: string[]; prepare: string; capture: string; downstream: [string, string]; use: string };
const catalogs: Record<string, CatalogSpec> = {
  productos: { profiles: [administration, warehouse], prepare: "Busca el material por código y nombre; confirma unidad, categoría y marca para evitar duplicados.", capture: "Registra código, descripción, unidad y clasificación. Marca Es servicio para usarlo en órdenes de servicio y Es aceite para análisis de lubricantes. Los saldos y costos se gestionan por bodega.", downstream: ["ingresos-bodega", "Ingresos de bodega"], use: "Bodega utiliza los materiales físicos en ingresos, reservas, transferencias y salidas de OT; Administración selecciona los servicios en su orden correspondiente." },
  sucursales: { profiles: [administration], prepare: "Identifica la sede y su información; comprueba que no exista ya.", capture: "Registra la sucursal y confirma su estado antes de asociar bodegas, ubicaciones o usuarios.", downstream: ["bodegas", "Bodegas"], use: "Asocia bodegas y ubicaciones a la sucursal; asigna usuarios en Usuarios para delimitar acceso y correos." },
  bodegas: { profiles: [administration, warehouse], prepare: "Confirma la sucursal de la bodega y su identificación.", capture: "Registra la bodega en la sucursal correcta y comprueba su estado.", downstream: ["stock-bodega", "Stock de bodega"], use: "Bodega consulta y opera el inventario de la sucursal asignada; los equipos se relacionan por ubicación y sucursal." },
  lineas: { profiles: [administration], prepare: "Revisa cómo se agruparán los materiales y busca una línea existente.", capture: "Registra el nombre y código de la línea sin duplicar clasificaciones.", downstream: ["productos", "Materiales"], use: "Selecciona la línea al clasificar los materiales del catálogo." },
  categorias: { profiles: [administration], prepare: "Define la categoría del material y revisa las clasificaciones existentes.", capture: "Completa nombre, código y relaciones del formulario.", downstream: ["productos", "Materiales"], use: "Asocia la categoría a los materiales para facilitar la búsqueda y clasificación." },
  marcas: { profiles: [administration], prepare: "Confirma el fabricante y busca la marca antes de crear otra.", capture: "Registra la marca con su identificación correcta.", downstream: ["productos", "Materiales"], use: "Utiliza la marca en la ficha de los materiales que corresponden." },
  "unidades-medida": { profiles: [administration], prepare: "Confirma si el material se maneja por unidad, volumen, peso u otra medida.", capture: "Registra nombre y abreviatura de la unidad; verifica que no se confunda con otra medida.", downstream: ["productos", "Materiales"], use: "Selecciona la unidad en Materiales antes de registrar cantidades de inventario." },
  terceros: { profiles: [administration], prepare: "Reúne identificación y datos del proveedor o tercero; busca si ya está registrado.", capture: "Completa identificación, nombre y datos de contacto del formulario.", downstream: ["ordenes-compra", "Órdenes de compra y servicio"], use: "Selecciona el tercero en las órdenes de compra o servicio y verifica sus datos." },
  empleados: { profiles: [administration], prepare: "Confirma la identidad y datos laborales de la persona; evita duplicados.", capture: "Registra o importa la ficha del empleado y revisa los datos requeridos. La ficha de empleado identifica al responsable del trabajo; el acceso al sistema se configura en Usuarios.", downstream: ["work-orders", "Órdenes de trabajo"], use: "El supervisor asigna empleados a las actividades de la OT; los ejecutores registran sus horas reales." },
  equipos: { profiles: [supervisor, administration], prepare: "Confirma tipo de equipo, ubicación y sucursal; busca el código antes de crear.", capture: "Completa identificación, ubicación, tipo y datos técnicos. Verifica la relación con sus componentes.", downstream: ["planes", "Planes de mantenimiento"], use: "Prepara planes y programaciones; crea OT para este equipo. Su ubicación determina la sucursal para los avisos de Bodega." },
  "componentes-equipo": { profiles: [supervisor, administration], prepare: "Identifica el equipo al que pertenece el componente y su descripción técnica.", capture: "Registra el componente y comprueba que esté asociado al equipo correcto.", downstream: ["work-orders", "Órdenes de trabajo"], use: "Utiliza los componentes en el mantenimiento y en los análisis de lubricantes que correspondan." },
  "tipo-equipo": { profiles: [supervisor, administration], prepare: "Define la clasificación técnica y revisa los tipos disponibles.", capture: "Registra el tipo de equipo con un nombre claro y sin duplicados.", downstream: ["equipos", "Equipos"], use: "Clasifica los equipos con el tipo correspondiente antes de preparar su mantenimiento." },
  locations: { profiles: [supervisor, administration], prepare: "Identifica la ubicación o central y la sucursal a la que pertenece.", capture: "Registra la ubicación con la sucursal correcta y comprueba su identificación.", downstream: ["equipos", "Equipos"], use: "Asocia equipos y proyectos a la ubicación. Esta relación permite determinar qué sucursal atiende el mantenimiento." },
  planes: { profiles: [supervisor], prepare: "Identifica equipo, tipo de mantenimiento, frecuencia y actividades necesarias.", capture: "Configura el plan y sus intervalos o parámetros; completa sus actividades en Tareas del plan.", downstream: ["programaciones", "Programaciones"], use: "Organiza el mantenimiento del plan en el calendario y vincula una OT para su ejecución." },
  "plan-tareas": { profiles: [supervisor], prepare: "Identifica el plan de mantenimiento que usará las actividades.", capture: "Define las tareas, su orden y los datos o evidencias requeridos.", downstream: ["work-orders", "Órdenes de trabajo"], use: "Utiliza las tareas del plan al preparar la OT; el técnico registra resultados y evidencias." },
  "unidades-generacion": { profiles: [supervisor, administration], prepare: "Identifica la unidad de generación, su ubicación y los equipos que la componen.", capture: "Configura la unidad y sus relaciones con los equipos según el formulario.", downstream: ["dashboard", "Control operativo"], use: "El operador controla la generación y revisa los contadores de operación de la unidad." },
  proyectos: { profiles: [supervisor, administration], prepare: "Define el proyecto, el alcance y las ubicaciones involucradas.", capture: "Registra identificación y datos del proyecto; verifica sus ubicaciones.", downstream: ["work-orders-proyecto", "OT de proyecto"], use: "El supervisor prepara la OT de proyecto con actividades, responsables y materiales por ubicación." },
  bitacora: { profiles: [operator, technician, supervisor], prepare: "Identifica el equipo y el hecho ocurrido durante el turno o intervención.", capture: "Registra fecha, descripción y datos reales del evento; conserva la referencia de la OT cuando corresponda.", downstream: ["work-orders", "Órdenes de trabajo"], use: "El supervisor revisa los hechos y coordina una OT si hace falta atender el equipo." },
  "estados-equipo": { profiles: [operator, supervisor], prepare: "Identifica el equipo y confirma su condición real de operación.", capture: "Registra el estado y sus datos asociados de acuerdo con la condición observada.", downstream: ["dashboard", "Control operativo"], use: "El operador consulta el estado antes de actuar; el supervisor coordina mantenimiento si corresponde." },
  "eventos-equipo": { profiles: [operator, technician, supervisor], prepare: "Identifica el equipo, la fecha y el evento observado.", capture: "Registra el evento con una descripción clara y los datos del formulario.", downstream: ["alertas", "Alertas"], use: "Revisa los avisos y coordina una OT si el evento requiere mantenimiento." },
};

const reportProfiles: Record<string, string[]> = {
  "dashboard-gerencia": [management, administration], reporteria: [management, administration],
  "dashboard-operativo": [operator, technician, supervisor], "dashboard-supervisores": [supervisor],
  "dashboard-administracion": [administration, management], "reportes-sistema": [management, administration],
  "reporte-diario": [operator, supervisor], "inteligencia-mantenimiento": [supervisor, administration, management],
};

function catalogWorkflow(manual: UserManualDefinition, spec: CatalogSpec): WorkflowStep[] {
  const destinationProfiles: Record<string, string[]> = {
    "work-orders": [supervisor], "work-orders-proyecto": [supervisor], programaciones: [supervisor],
    "ingresos-bodega": [warehouse], "stock-bodega": [warehouse], dashboard: [operator],
    alertas: [supervisor], planes: [supervisor], equipos: [supervisor, administration],
    bodegas: [administration, warehouse], productos: [administration, warehouse], "ordenes-compra": [administration, management],
  };
  return [
    step("Preparar y comprobar antecedentes", spec.profiles, manual.routeName, manual.title,
      spec.prepare, "Información real disponible y permiso para gestionar este módulo.", "Datos y relaciones revisados antes del registro."),
    step("Registrar y verificar", spec.profiles, manual.routeName, manual.title,
      spec.capture, "Antecedentes verificados y campos obligatorios completos.", "Registro guardado y localizado en el listado.", ["Confirma código, nombre, estado y relaciones antes de continuar."]),
    step("Continuar en el módulo relacionado", destinationProfiles[spec.downstream[0]] ?? spec.profiles, ...spec.downstream,
      spec.use, "Registro guardado y disponible para seleccionar.", "Información utilizada por el siguiente proceso."),
  ];
}

function reportWorkflow(manual: UserManualDefinition, profiles: string[]): WorkflowStep[] {
  return [
    step("Seleccionar periodo y alcance", profiles, manual.routeName, manual.title,
      "Selecciona fechas, sucursales, equipos o bodegas según los filtros disponibles. En Reportería, elige primero el reporte que necesitas.",
      "Información registrada para el periodo y acceso al reporte correspondiente.", "Consulta delimitada al alcance que vas a analizar."),
    step("Revisar los registros de origen", profiles, manual.routeName, manual.title,
      "Contrasta indicadores y detalle con OT, Control operativo o movimientos de inventario según el reporte. Coordina las diferencias con Supervisor o Bodega.",
      "Filtros aplicados y datos cargados; mismo periodo para comparar.", "Resultados comprendidos y pendientes de atención identificados."),
    step("Consultar, compartir y dar seguimiento", profiles, manual.routeName, manual.title,
      "Usa la vista previa o exportación disponible. Verifica encabezado, filtros y resultados antes de compartir; coordina acciones con el área responsable.",
      "Datos revisados y permisos de exportación cuando corresponda.", "Reporte validado y acciones de seguimiento acordadas."),
  ];
}

export function applyManualWorkflow(manual: UserManualDefinition): UserManualDefinition {
  const flow = workflows[manual.routeName]
    ?? (catalogs[manual.routeName] ? catalogWorkflow(manual, catalogs[manual.routeName]!) : null)
    ?? (reportProfiles[manual.routeName] ? reportWorkflow(manual, reportProfiles[manual.routeName]!) : null)
    ?? manual.flow.map(item => ({ ...item, profiles: ["Usuario con permisos en el módulo"],
      moduleRoute: manual.routeName, moduleLabel: manual.title,
      requirement: manual.prerequisites[0] || "Información de origen verificada.",
      outcome: item.checks[0] || "Paso completado y resultado verificado." }));
  const relatedRoutes = [...new Set([...manual.relatedRoutes,
    ...flow.map(item => item.moduleRoute).filter(route => route !== manual.routeName),
    ...(reportProfiles[manual.routeName] ? ["work-orders", "dashboard", "kardex"] : []),
  ])];
  const handoffs = flow.slice(1).flatMap((item, index) => {
    const previous = flow[index]!;
    if (previous.profiles.join() === item.profiles.join()) return [];
    return [{ moment: `Después de ${previous.title.toLowerCase()}`, delivers: previous.profiles.join(" / "),
      receives: item.profiles.join(" / "), action: `${item.moduleLabel}: ${item.description}`, readyWhen: item.requirement }];
  });
  const states = flow.map(item => ({ name: item.title, meaning: item.outcome,
    userAction: `${item.profiles.join(" / ")}: ${item.description}`, validation: item.requirement }));
  const isTransfer = manual.routeName === "transferencias-bodega";
  const isWorkOrder = ["work-orders", "work-orders-proyecto", "work-order-issue-materials", "work-order-consumos", "reservas-bodega"].includes(manual.routeName);
  return { ...manual, flow, relatedRoutes, handoffs, states,
    fields: manual.fields.map(field => ["work-orders", "work-orders-proyecto"].includes(manual.routeName) && /^(status_workflow|estado)$/.test(field.key)
      ? { ...field, note: "La OT se crea en Planificación. Bodega confirma el egreso para pasar a En proceso; el creador gestiona En revisión, Finalizada o Anulada.", example: "Planificación → egreso confirmado → En proceso" }
      : field),
    category: ({ Planificacion: "Planificación", Operacion: "Operación" } as Record<string, string>)[manual.category] ?? manual.category,
    summary: `Sigue el flujo de ${manual.title.toLowerCase()}: quién interviene, qué necesita y dónde continúa.`,
    prerequisites: [flow[0]!.requirement,
      "Las acciones disponibles dependen de los permisos del perfil y de las sucursales asignadas."],
    checklist: flow.map(item => item.outcome),
    ...(isTransfer ? { purpose: "Coordina el traslado de materiales y registra la transferencia para actualizar las bodegas de origen y destino.",
      tips: ["Comprueba ambos saldos en Stock de bodega y sigue la referencia en Kardex."],
      warnings: ["El registro confirmado mueve los saldos; revisa origen, destino y cantidades antes de guardar."],
      commonErrors: [{ title: "No hay disponibilidad en el origen", whatHappens: "La transferencia no se puede registrar con la cantidad solicitada.",
        why: "El material no tiene stock o saldo preaprobado suficiente en la bodega seleccionada.",
        howToResolve: "Bodega revisa Stock de bodega o el saldo de la orden de compra y corrige origen o cantidades antes de volver a guardar." },
        { title: "La guía todavía no está autorizada", whatHappens: "La guía existe, pero no muestra autorización del SRI.",
          why: "Generar el documento y autorizarlo son acciones distintas; puede seguir en procesamiento o tener observaciones.",
          howToResolve: "Revisa destinatario, transportista, placa y fechas; solicita la autorización y consulta su resultado desde la transferencia. Si hay observaciones, corrige lo indicado antes de usar el documento." }] } : {}),
    ...(manual.routeName === "kardex" ? {
      purpose: "Consulta movimientos y documentos de inventario; revisa sus saldos por material y bodega. Los perfiles administrativos también gestionan carga masiva y costeo FIFO.",
      tips: ["Abre el documento del movimiento para identificar el origen antes de registrar una corrección.", "Los registros puntuales se realizan en Ingresos o Egresos de bodega; la carga masiva se procesa desde Kardex con sus permisos."],
      warnings: ["Una carga por diferencia modifica el inventario: verifica el archivo y espera su resultado antes de repetirla.", "Confirma el periodo antes del cierre FIFO: el mes cerrado no admite movimientos dentro de ese periodo y el cierre no se deshace."],
    } : {}),
    ...(isWorkOrder ? {
      tips: ["Reserva, salida real e impresión del egreso son pasos distintos; coordina al creador de la OT con Bodega."],
      warnings: ["Solo el creador gestiona revisión, cierre y anulación. Bodega registra salidas en Planificación o En revisión; confirma el egreso para iniciar o reanudar."],
      commonErrors: [
        { title: "La OT no puede pasar a En proceso", whatHappens: "La ejecución no inicia al guardar o cambiar un estado.",
          why: "Falta la salida real o confirmar el egreso; en una OT ordinaria también se exige programación vinculada.",
          howToResolve: "El supervisor vincula la fecha en Programaciones para la OT ordinaria; Bodega registra la salida real y confirma la impresión del egreso. OT de proyecto no exige programación de equipo." },
        { title: "Bodega no puede registrar la salida", whatHappens: "La opción de entrega está bloqueada o la cantidad es rechazada.",
          why: "La OT no está en Planificación o En revisión, tiene un bloqueo, hay otra ejecución activa del equipo o falta stock disponible.",
          howToResolve: "Si la OT está En proceso, el creador la pasa a En revisión. Bodega revisa bloqueo y saldo por condición, registra la entrega y confirma el egreso para reanudar." },
        { title: "La OT no permite finalizar", whatHappens: "El sistema indica información o materiales pendientes.",
          why: "Puede faltar una actividad, evidencia, explicación de diferencias o la autorización del creador; una OT anexada puede bloquear el cierre.",
          howToResolve: "Completa los controles indicados, coordina la liberación de la OT bloqueante y solicita la revisión del creador antes de cerrar." },
        ...(manual.routeName === "work-orders-proyecto" ? [{ title: "El proyecto no se puede guardar", whatHappens: "El formulario marca datos del proyecto como obligatorios.",
          why: "Falta proyecto, ubicación o bodega, objetivo general, metodología, material al crear o el cargo de una persona contratada.",
          howToResolve: "Completa los campos señalados y revisa responsables y Consumos antes de guardar la OT de proyecto." }] : []),
      ],
    } : {}),
  };
}

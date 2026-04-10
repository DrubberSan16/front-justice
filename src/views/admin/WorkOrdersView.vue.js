/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { hasReportAccess } from "@/app/config/report-access";
import { buildWorkOrderReport, downloadReportExcel, downloadReportPdf, } from "@/app/utils/maintenance-intelligence-reports";
const ui = useUiStore();
const { smAndDown } = useDisplay();
const auth = useAuthStore();
const menuStore = useMenuStore();
const loading = ref(false);
const loadingDetails = ref(false);
const savingHeader = ref(false);
const issuingMaterials = ref(false);
const exportState = reactive({});
const error = ref(null);
const search = ref("");
const records = ref([]);
const dialog = ref(false);
const deleteDialog = ref(false);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const editingId = ref(null);
const deletingId = ref(null);
const tab = ref("tareas");
const closingFlow = ref(false);
const unsupportedDetailMessages = ref([]);
const equipmentOptions = ref([]);
const equipmentComponentOptions = ref([]);
const planOptions = ref([]);
const procedureOptions = ref([]);
const alertOptions = ref([]);
const warehouseOptions = ref([]);
const stockByWarehouseRows = ref([]);
const productCatalogRows = ref([]);
const warehouseCatalogRows = ref([]);
const workOrderCatalogRows = ref([]);
const taskOptions = ref([]);
const loadingTaskOptions = ref(false);
const loadingEquipmentComponents = ref(false);
const taskLabelCacheByPlan = ref({});
const planTaskCatalogByPlan = ref({});
const procedureCatalog = ref([]);
const taskEvidenceInputKeys = ref({});
const taskRows = ref([]);
const attachmentRows = ref([]);
const localConsumos = ref([]);
const localIssues = ref([]);
const localHistory = ref([]);
const headerForm = reactive({
    code: "",
    type: "MANTENIMIENTO",
    title: "",
    equipment_id: "",
    equipo_componente_id: "",
    maintenance_kind: "CORRECTIVO",
    status_workflow: "PLANNED",
    procedimiento_id: "",
    plan_id: "",
    alerta_id: "",
    blocked_by_work_order_id: "",
    blocked_reason: "",
    causa: "",
    accion: "",
    prevencion: "",
});
const taskForm = reactive({
    plan_id: "",
    tarea_id: "",
    observacion: "",
});
const attachmentForm = reactive({
    tipo: "EVIDENCIA",
    nombre: "",
    contenido_base64: "",
    mime_type: "",
});
const attachmentPreviewUrl = ref(null);
const consumoForm = reactive({
    producto_id: "",
    bodega_id: "",
    cantidad: "",
    costo_unitario: "",
    observacion: "",
});
const materialsForm = reactive({ observacion: "" });
function newMaterialItem() {
    return {
        producto_id: "",
        bodega_id: "",
        cantidad: "",
    };
}
const materialItems = ref([newMaterialItem()]);
const workflowOptions = [
    { title: "Planificada", value: "PLANNED" },
    { title: "En proceso", value: "IN_PROGRESS" },
    { title: "Bloqueada", value: "BLOCKED" },
    { title: "Cerrada", value: "CLOSED" },
];
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Work Orders", "Ordenes de trabajo", "Órdenes de trabajo", "OT"]));
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canPersistHeader = computed(() => (editingId.value ? canEdit.value : canCreate.value));
const canAccessWorkOrderReports = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "ordenes_trabajo"));
const maintenanceKindOptions = [
    { title: "Correctivo", value: "CORRECTIVO" },
    { title: "Preventivo", value: "PREVENTIVO" },
    { title: "Predictivo", value: "PREDICTIVO" },
    { title: "Inspección", value: "INSPECCION" },
];
function normalizeWorkflowStatus(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (["PLANNED", "PLANIFICADA", "PLANIFICADO", "CREADA", "CREADO"].includes(raw))
        return "PLANNED";
    if (["IN_PROGRESS", "IN PROGRESS", "EN PROCESO", "EN_PROCESO", "PROCESSING"].includes(raw))
        return "IN_PROGRESS";
    if (["BLOCKED", "BLOQUEADA", "BLOQUEADO", "DETENIDA", "DETENIDO", "ON_HOLD"].includes(raw))
        return "BLOCKED";
    if (["CLOSED", "CERRADA", "CERRADO", "DONE", "COMPLETED"].includes(raw))
        return "CLOSED";
    return raw || "PLANNED";
}
function workflowLabel(value) {
    const normalized = normalizeWorkflowStatus(value);
    return workflowOptions.find((item) => item.value === normalized)?.title || normalized || "Sin definir";
}
function exportKey(format) {
    return `work-order:${format}`;
}
function isExporting(format) {
    return Boolean(exportState[exportKey(format)]);
}
const normalizedWorkflow = computed(() => normalizeWorkflowStatus(headerForm.status_workflow));
const isCreated = computed(() => normalizedWorkflow.value === "PLANNED");
const isInProcess = computed(() => normalizedWorkflow.value === "IN_PROGRESS");
const isBlocked = computed(() => normalizedWorkflow.value === "BLOCKED");
const isClosed = computed(() => normalizedWorkflow.value === "CLOSED");
const isReadOnlyWorkflow = computed(() => isClosed.value && !closingFlow.value);
const showConsumosTab = computed(() => !!editingId.value && (isInProcess.value || isClosed.value));
const showMaterialsTab = computed(() => !!editingId.value && (isInProcess.value || isClosed.value));
const isEditingLockedFields = computed(() => !!editingId.value);
const currentWorkflowLabel = computed(() => `Estado: ${workflowLabel(headerForm.status_workflow)}`);
const detailNoticeText = computed(() => unsupportedDetailMessages.value.join(" "));
const blockingWorkOrderOptions = computed(() => workOrderCatalogRows.value
    .filter((item) => String(item?.id || "") !== String(editingId.value || ""))
    .map((item) => ({
    value: item.id,
    title: [
        item?.code || item?.codigo || item?.id,
        item?.title || item?.titulo || item?.nombre || null,
        workflowLabel(item?.status_workflow),
    ]
        .filter(Boolean)
        .join(" · "),
})));
const blockingAlertText = computed(() => {
    if (!isBlocked.value)
        return "";
    const selected = blockingWorkOrderOptions.value.find((item) => String(item?.value || "") === String(headerForm.blocked_by_work_order_id || ""));
    const blockerLabel = selected?.title || "la OT anexada seleccionada";
    return `${headerForm.code || "Esta OT"} esta bloqueada hasta culminar ${blockerLabel}${headerForm.blocked_reason ? ` · Motivo: ${headerForm.blocked_reason}` : ""}.`;
});
const currentRoleName = computed(() => String(auth.user?.role?.nombre || "").trim().toUpperCase());
const canViewCosts = computed(() => ["GERENTE", "ADMINISTRADOR"].includes(currentRoleName.value));
const headers = [
    { title: "Code", key: "code" },
    { title: "Type", key: "type" },
    { title: "Title", key: "title" },
    { title: "ID", key: "id" },
    { title: "Equipo", key: "equipment_label" },
    { title: "Compartimiento", key: "equipment_component_label" },
    { title: "Estado", key: "status_workflow" },
    { title: "Tipo", key: "maintenance_kind" },
    { title: "Acciones", key: "actions", sortable: false },
];
const taskHeaders = [
    { title: "Plan", key: "plan_id" },
    { title: "Tarea", key: "tarea_id" },
    { title: "Captura", key: "captura", sortable: false },
    { title: "Obs.", key: "observacion" },
    { title: "Acciones", key: "actions", sortable: false },
];
function parseValorJson(valorJson) {
    if (!valorJson)
        return {};
    if (typeof valorJson === "object")
        return valorJson;
    if (typeof valorJson === "string") {
        try {
            const parsed = JSON.parse(valorJson);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch {
            return {};
        }
    }
    return {};
}
const attachmentHeaders = [
    { title: "ID", key: "id" },
    { title: "Tipo", key: "tipo" },
    { title: "Origen", key: "origen", sortable: false },
    { title: "Nombre", key: "nombre" },
    { title: "Acciones", key: "actions", sortable: false },
];
const consumoHeaders = computed(() => {
    const base = [
        { title: "Bodega", key: "bodega_label" },
        { title: "Material", key: "producto_label" },
        { title: "Reservado", key: "cantidad_reservada" },
        { title: "Emitido", key: "cantidad_emitida" },
        { title: "Pendiente", key: "cantidad_pendiente" },
    ];
    if (canViewCosts.value) {
        base.push({ title: "Costo unitario", key: "costo_unitario" }, { title: "Subtotal", key: "subtotal" });
    }
    base.push({ title: "Observación", key: "observacion" });
    return base;
});
const issueHeaders = computed(() => {
    const base = [
        { title: "Salida", key: "entrega_code" },
        { title: "Fecha", key: "fecha_label" },
        { title: "Bodega", key: "bodega_label" },
        { title: "Material", key: "producto_label" },
        { title: "Cantidad", key: "cantidad" },
    ];
    if (canViewCosts.value) {
        base.push({ title: "Costo unitario", key: "costo_unitario" }, { title: "Subtotal", key: "subtotal" });
    }
    base.push({ title: "Observación", key: "observacion" });
    return base;
});
const workOrderReportDefinition = computed(() => buildWorkOrderReport({
    header: {
        code: headerForm.code,
        status_workflow: workflowLabel(headerForm.status_workflow),
        equipment_label: selectedEquipmentLabel.value,
        equipment_component_label: selectedEquipmentComponentLabel.value,
        maintenance_kind: headerForm.maintenance_kind,
        procedimiento: selectedProcedureLabel.value,
        plan_operativo: resolvedOperationalPlanLabel.value,
        alerta: selectedAlertLabel.value,
        blocked_by: selectedBlockingOrderLabel.value,
        blocked_reason: headerForm.blocked_reason,
        causa: headerForm.causa,
        accion: headerForm.accion,
        prevencion: headerForm.prevencion,
    },
    tasks: taskRows.value.map((item) => ({
        plan: getPlanLabelForTask(item),
        tarea: getTaskLabelForTask(item),
        tipo_captura: getTaskFieldType(item),
        valor_boolean: item?.valor_boolean ?? "",
        valor_numerico: item?.valor_numeric ?? "",
        valor_texto: item?.valor_text ?? "",
        observacion: item?.observacion ?? "",
        requisitos: getTaskRequirementChips(item).join(" | "),
    })),
    attachments: attachmentRows.value.map((item) => ({
        tipo: item?.tipo || "",
        origen: getAttachmentOriginLabel(item),
        nombre: item?.nombre || "",
        mime_type: item?.mime_type || "",
    })),
    consumos: consumoRows.value.map((item) => ({
        bodega: item?.bodega_label || "",
        material: item?.producto_label || "",
        reservado: item?.cantidad_reservada || 0,
        emitido: item?.cantidad_emitida || 0,
        pendiente: item?.cantidad_pendiente || 0,
        costo_unitario: item?.costo_unitario || 0,
        subtotal: item?.subtotal || 0,
        observacion: item?.observacion || "",
    })),
    issues: issueRows.value.map((item) => ({
        salida: item?.entrega_code || "",
        fecha: item?.fecha_label || "",
        bodega: item?.bodega_label || "",
        material: item?.producto_label || "",
        cantidad: item?.cantidad || 0,
        costo_unitario: item?.costo_unitario || 0,
        subtotal: item?.subtotal || 0,
        observacion: item?.observacion || "",
    })),
    history: localHistory.value.map((item) => ({
        desde: workflowLabel(item?.from_status),
        hacia: workflowLabel(item?.to_status),
        nota: item?.note || "",
        fecha: item?.changed_at || "",
    })),
}));
async function exportWorkOrder(format) {
    if (!canAccessWorkOrderReports.value) {
        ui.error("No tienes permisos para generar reportes de órdenes de trabajo.");
        return;
    }
    const key = exportKey(format);
    exportState[key] = true;
    error.value = null;
    try {
        if (format === "excel") {
            await downloadReportExcel(workOrderReportDefinition.value);
        }
        else {
            await downloadReportPdf(workOrderReportDefinition.value);
        }
    }
    catch (e) {
        error.value = e?.message || "No se pudo generar el reporte de la orden de trabajo.";
    }
    finally {
        exportState[key] = false;
    }
}
function asArray(data) {
    if (Array.isArray(data))
        return data;
    if (Array.isArray(data?.items))
        return data.items;
    if (Array.isArray(data?.data))
        return data.data;
    if (Array.isArray(data?.results))
        return data.results;
    if (Array.isArray(data?.records))
        return data.records;
    return [];
}
async function listAll(endpoint) {
    return listAllPages(endpoint);
}
function normalize(item) {
    const label = item?.nombre ?? item?.title ?? item?.tipo_alerta ?? item?.codigo ?? item?.id;
    return { value: item.id, title: `${item?.codigo ? `${item.codigo} - ` : ""}${label}` };
}
function normalizeEquipmentComponent(item) {
    const officialName = String(item?.nombre_oficial || item?.nombre || "").trim();
    const shortName = String(item?.nombre || "").trim();
    const category = String(item?.categoria || "").trim();
    return {
        value: item.id,
        title: [item?.codigo || null, officialName || shortName || item?.id, category || null]
            .filter(Boolean)
            .join(" - "),
    };
}
const productNameMap = computed(() => productCatalogRows.value.reduce((acc, item) => {
    const key = String(item?.id || "");
    if (!key)
        return acc;
    acc[key] = normalize(item).title;
    return acc;
}, {}));
const warehouseNameMap = computed(() => warehouseCatalogRows.value.reduce((acc, item) => {
    const key = String(item?.id || "");
    if (!key)
        return acc;
    acc[key] = normalize(item).title;
    return acc;
}, {}));
function toPositiveNumber(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}
function getWarehouseProductOptions(warehouseId) {
    const warehouseKey = String(warehouseId || "");
    if (!warehouseKey)
        return [];
    const seen = new Set();
    return stockByWarehouseRows.value
        .filter((row) => String(row?.bodega_id || "") === warehouseKey)
        .filter((row) => {
        const productKey = String(row?.producto_id || "");
        if (!productKey || seen.has(productKey))
            return false;
        seen.add(productKey);
        return true;
    })
        .map((row) => ({
        value: row.producto_id,
        title: `${productNameMap.value[String(row.producto_id)] || row.producto_id} · Stock: ${toPositiveNumber(row?.stock_actual)}`,
    }))
        .sort((a, b) => String(a.title).localeCompare(String(b.title)));
}
function getWarehouseReservedProductOptions(warehouseId) {
    const warehouseKey = String(warehouseId || "");
    const grouped = new Map();
    for (const row of consumoRows.value) {
        if (String(row?.bodega_id || "") !== warehouseKey)
            continue;
        const productKey = String(row?.producto_id || "");
        if (!productKey)
            continue;
        const current = grouped.get(productKey) ?? {
            value: productKey,
            title: productNameMap.value[productKey] || productKey,
            pending: 0,
        };
        current.pending += toPositiveNumber(row?.cantidad_pendiente);
        grouped.set(productKey, current);
    }
    const reservedOptions = [...grouped.values()]
        .filter((item) => item.pending > 0)
        .map((item) => ({
        value: item.value,
        title: `${item.title} · Reservado pendiente: ${item.pending}`,
    }))
        .sort((a, b) => String(a.title).localeCompare(String(b.title)));
    return reservedOptions.length ? reservedOptions : getWarehouseProductOptions(warehouseId);
}
const consumoRows = computed(() => localConsumos.value.map((item) => ({
    ...item,
    producto_label: item?.producto_label || item?.producto_nombre || productNameMap.value[String(item?.producto_id || "")] || item?.producto_id || "-",
    bodega_label: item?.bodega_label || item?.bodega_nombre || warehouseNameMap.value[String(item?.bodega_id || "")] || item?.bodega_id || "-",
    cantidad: toPositiveNumber(item?.cantidad),
    cantidad_reservada: toPositiveNumber(item?.cantidad_reservada ?? item?.cantidad),
    cantidad_emitida: toPositiveNumber(item?.cantidad_emitida),
    cantidad_pendiente: toPositiveNumber(item?.cantidad_pendiente ?? item?.cantidad),
    costo_unitario: toPositiveNumber(item?.costo_unitario),
    subtotal: toPositiveNumber(item?.subtotal ?? (toPositiveNumber(item?.cantidad) * toPositiveNumber(item?.costo_unitario))),
    observacion: item?.observacion || "-",
})));
const issueRows = computed(() => localIssues.value.flatMap((issue) => {
    const rawItems = Array.isArray(issue?.items) ? issue.items : [];
    return rawItems.map((detail, index) => ({
        id: `${issue?.id || issue?.entrega_id || 'issue'}-${detail?.id || index}`,
        entrega_code: issue?.code || issue?.codigo || "Sin código",
        fecha_label: issue?.fecha ? new Date(issue.fecha).toLocaleString() : "-",
        producto_label: detail?.producto_label || detail?.producto_nombre || productNameMap.value[String(detail?.producto_id || "")] || detail?.producto_id || "-",
        bodega_label: detail?.bodega_label || detail?.bodega_nombre || warehouseNameMap.value[String(detail?.bodega_id || "")] || detail?.bodega_id || "-",
        cantidad: toPositiveNumber(detail?.cantidad),
        costo_unitario: toPositiveNumber(detail?.costo_unitario),
        subtotal: toPositiveNumber(detail?.cantidad) * toPositiveNumber(detail?.costo_unitario),
        observacion: issue?.observacion || "-",
    }));
}));
function resetConsumoProductIfInvalid() {
    if (!consumoForm.bodega_id) {
        consumoForm.producto_id = "";
        return;
    }
    const exists = getWarehouseProductOptions(String(consumoForm.bodega_id)).some((option) => String(option.value) === String(consumoForm.producto_id || ""));
    if (!exists)
        consumoForm.producto_id = "";
}
function resetMaterialProductIfInvalid(index) {
    const current = materialItems.value[index];
    if (!current)
        return;
    if (!current.bodega_id) {
        current.producto_id = "";
        return;
    }
    const exists = getWarehouseReservedProductOptions(String(current.bodega_id)).some((option) => String(option.value) === String(current.producto_id || ""));
    if (!exists)
        current.producto_id = "";
}
function syncConsumoUnitCost() {
    const selectedProduct = productCatalogRows.value.find((item) => String(item?.id || "") === String(consumoForm.producto_id || ""));
    if (!selectedProduct)
        return;
    const nextCost = Number(selectedProduct?.ultimo_costo ?? 0);
    if (!consumoForm.costo_unitario || Number(consumoForm.costo_unitario) <= 0) {
        consumoForm.costo_unitario = String(nextCost || "");
    }
}
function getEquipmentLabel(item) {
    if (!item)
        return "";
    return (item?.equipment_nombre
        || item?.equipo_nombre
        || equipmentOptions.value.find((option) => String(option.value) === String(item.equipment_id))?.title
        || item?.equipment_id
        || "");
}
async function loadCatalogs() {
    const [equipos, planes, procedimientos, alertas, productos, bodegas, stockRows, workOrders] = await Promise.all([
        listAll("/kpi_maintenance/equipos"),
        listAll("/kpi_maintenance/planes"),
        listAll("/kpi_maintenance/inteligencia/procedimientos"),
        listAll("/kpi_maintenance/alertas"),
        listAll("/kpi_inventory/productos"),
        listAll("/kpi_inventory/bodegas"),
        listAll("/kpi_inventory/stock-bodega"),
        listAll("/kpi_maintenance/work-orders"),
    ]);
    equipmentOptions.value = equipos.map(normalize);
    planOptions.value = planes.map(normalize);
    procedureCatalog.value = procedimientos;
    procedureOptions.value = procedimientos.map(normalize);
    workOrderCatalogRows.value = workOrders;
    alertOptions.value = alertas.map((item) => ({
        value: item.id,
        title: [
            item?.title || item?.tipo_alerta || item?.nombre || item?.codigo || item?.id,
            item?.equipo_label || item?.equipo_nombre || null,
            Number(item?.work_order_count || 0) > 0
                ? `${item.work_order_count} OT${Number(item?.work_order_count || 0) === 1 ? "" : "s"}`
                : "Sin OT",
        ]
            .filter(Boolean)
            .join(" · "),
    }));
    productCatalogRows.value = productos;
    warehouseCatalogRows.value = bodegas;
    stockByWarehouseRows.value = stockRows;
    warehouseOptions.value = bodegas.map(normalize);
}
async function loadEquipmentComponents(equipmentId) {
    const normalized = String(equipmentId || "").trim();
    if (!normalized) {
        equipmentComponentOptions.value = [];
        return;
    }
    loadingEquipmentComponents.value = true;
    try {
        const { data } = await api.get("/kpi_maintenance/componentes", {
            params: { equipo_id: normalized },
        });
        equipmentComponentOptions.value = asArray(data).map(normalizeEquipmentComponent);
    }
    catch (e) {
        equipmentComponentOptions.value = [];
        ui.error(e?.response?.data?.message || "No se pudieron cargar los compartimientos del equipo.");
    }
    finally {
        loadingEquipmentComponents.value = false;
    }
}
function getSuggestedProcedureComponentId(procedure) {
    const referenceCode = String(procedure?.compartimiento_codigo_referencia || "")
        .trim()
        .toUpperCase();
    const officialName = String(procedure?.compartimiento_nombre_oficial || "")
        .trim()
        .toUpperCase();
    if (!referenceCode && !officialName)
        return "";
    const match = equipmentComponentOptions.value.find((option) => {
        const title = String(option?.title || "").toUpperCase();
        return ((referenceCode && title.includes(referenceCode)) ||
            (officialName && title.includes(officialName)));
    });
    return String(match?.value || "");
}
function getEquipmentComponentLabel(item) {
    const selected = equipmentComponentOptions.value.find((option) => String(option?.value || "") === String(item?.equipo_componente_id || ""));
    return (item?.equipo_componente_nombre_oficial
        || item?.equipo_componente_nombre
        || selected?.title
        || "");
}
function getSelectedPlanLabel(planId) {
    if (!planId)
        return "Sin plan";
    const selectedPlan = planOptions.value.find((plan) => String(plan.value) === String(planId));
    if (selectedPlan?.title)
        return selectedPlan.title;
    const fromProcedure = procedureCatalog.value.find((item) => String(item?.plan_id || "") === String(planId));
    if (fromProcedure?.plan_codigo || fromProcedure?.plan_nombre) {
        return [fromProcedure.plan_codigo, fromProcedure.plan_nombre].filter(Boolean).join(" - ");
    }
    return planId;
}
function getSelectedTaskLabel(planId, taskId) {
    if (!taskId)
        return "Sin tarea";
    const planKey = String(planId || "");
    const taskKey = String(taskId);
    const planCache = taskLabelCacheByPlan.value[planKey] || {};
    return planCache[taskKey] || taskId;
}
function getPlanLabelForTask(task) {
    return task?.plan_label || task?.plan_nombre || getSelectedPlanLabel(task?.plan_id);
}
function getTaskLabelForTask(task) {
    return (task?.tarea_label
        || task?.tarea_nombre
        || task?.tarea?.nombre
        || task?.task_name
        || getSelectedTaskLabel(task?.plan_id, task?.tarea_id));
}
function getTaskDefinition(planId, taskId) {
    const planKey = String(planId || "");
    const taskKey = String(taskId || "");
    return (planTaskCatalogByPlan.value[planKey] ?? []).find((item) => String(item?.id || "") === taskKey);
}
function getTaskDetailText(task) {
    const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
    const meta = definition?.meta ?? task?.task_meta ?? {};
    const detail = String(meta?.detalle || "").trim();
    const fase = String(meta?.fase || "").trim();
    return [fase, detail].filter(Boolean).join(" - ");
}
function getTaskRequirementChips(task) {
    const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
    const meta = definition?.meta ?? task?.task_meta ?? {};
    const chips = [];
    if (definition?.required || meta?.required)
        chips.push("Obligatoria");
    if (meta?.requiere_permiso)
        chips.push("Permiso");
    if (meta?.requiere_epp)
        chips.push("EPP");
    if (meta?.requiere_bloqueo)
        chips.push("Bloqueo");
    if (meta?.requiere_evidencia)
        chips.push("Evidencia");
    const evidencias = Array.isArray(meta?.evidencias_requeridas)
        ? meta.evidencias_requeridas
        : [];
    for (const evidencia of evidencias) {
        const label = String(evidencia || "").trim();
        if (label)
            chips.push(label);
    }
    return chips;
}
function normalizeTaskFieldType(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (["BOOLEAN", "BOOL", "CHECKBOX"].includes(raw))
        return "BOOLEAN";
    if (["NUMBER", "NUMERIC", "DECIMAL", "INTEGER"].includes(raw))
        return "NUMBER";
    if (["JSON", "OBJECT", "OBJETO", "EVIDENCIA"].includes(raw))
        return "JSON";
    if (["TEXT", "TEXTO", "STRING"].includes(raw))
        return "TEXT";
    return "BOOLEAN";
}
function normalizeEvidenceKind(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (["IMAGEN", "IMAGE", "FOTO", "PHOTO"].includes(raw))
        return "IMAGEN";
    if (["DOCUMENTO", "DOCUMENT", "DOC", "PDF"].includes(raw))
        return "DOCUMENTO";
    if (["VIDEO"].includes(raw))
        return "VIDEO";
    return raw || "ARCHIVO";
}
function getTaskEvidenceRequirements(task) {
    const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
    const meta = definition?.meta ?? task?.task_meta ?? {};
    const evidencias = Array.isArray(meta?.evidencias_requeridas)
        ? meta.evidencias_requeridas
            .map((value) => normalizeEvidenceKind(value))
            .filter((value) => Boolean(value))
        : [];
    if (evidencias.length)
        return [...new Set(evidencias)];
    if (meta?.requiere_evidencia)
        return ["ARCHIVO"];
    return [];
}
function getTaskEvidenceRequirementLabel(requirement) {
    const normalized = normalizeEvidenceKind(requirement);
    if (normalized === "IMAGEN")
        return "Imagen";
    if (normalized === "DOCUMENTO")
        return "Documento";
    if (normalized === "VIDEO")
        return "Video";
    return "Archivo";
}
function getTaskEvidenceAccept(requirement) {
    const normalized = normalizeEvidenceKind(requirement);
    if (normalized === "IMAGEN")
        return "image/*";
    if (normalized === "DOCUMENTO") {
        return [
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".ppt",
            ".pptx",
            ".txt",
            ".csv",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "text/csv",
        ].join(",");
    }
    if (normalized === "VIDEO")
        return "video/*";
    return undefined;
}
function getTaskJsonObject(task) {
    if (task?.valor_json && typeof task.valor_json === "object" && !Array.isArray(task.valor_json)) {
        return { ...task.valor_json };
    }
    const raw = typeof task?._json_text === "string" ? task._json_text.trim() : "";
    if (!raw) {
        return {
            evidencias_requeridas: getTaskEvidenceRequirements(task),
            adjuntos: [],
        };
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return {
                ...parsed,
                evidencias_requeridas: getTaskEvidenceRequirements(task),
            };
        }
    }
    catch {
        // fallback handled by JSON validation elsewhere
    }
    return {
        evidencias_requeridas: getTaskEvidenceRequirements(task),
        adjuntos: [],
    };
}
function setTaskJsonObject(task, value) {
    task.valor_json = value;
    task._json_text = JSON.stringify(value, null, 2);
    markTaskDirty(task);
}
function isTaskEvidenceField(task) {
    return getTaskFieldType(task) === "JSON" && getTaskEvidenceRequirements(task).length > 0;
}
function getTaskEvidenceEntries(task, requirement) {
    const payload = getTaskJsonObject(task);
    const legacyEvidence = payload?.evidencia;
    const adjuntos = Array.isArray(payload?.adjuntos)
        ? payload.adjuntos
        : legacyEvidence
            ? [legacyEvidence]
            : [];
    const normalizedRequirement = requirement ? normalizeEvidenceKind(requirement) : "";
    return adjuntos.filter((entry) => {
        if (!normalizedRequirement)
            return true;
        return normalizeEvidenceKind(entry?.evidence_kind || entry?.tipo) === normalizedRequirement;
    });
}
function getTaskEvidenceEntryKey(entry) {
    return String(entry?.draft_attachment_id || entry?.attachment_id || entry?.nombre || Math.random());
}
function getTaskEvidenceInputKey(task, requirement) {
    const baseKey = `${String(task?.id || task?.tarea_id || "task")}:${normalizeEvidenceKind(requirement)}`;
    return `${baseKey}:${taskEvidenceInputKeys.value[baseKey] ?? 0}`;
}
function bumpTaskEvidenceInputKey(task, requirement) {
    const baseKey = `${String(task?.id || task?.tarea_id || "task")}:${normalizeEvidenceKind(requirement)}`;
    taskEvidenceInputKeys.value[baseKey] = (taskEvidenceInputKeys.value[baseKey] ?? 0) + 1;
}
function getTaskFieldType(task) {
    const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
    return normalizeTaskFieldType(definition?.field_type ?? definition?.meta?.field_type ?? task?.field_type ?? task?.task_meta?.field_type);
}
function isTaskRequired(task) {
    const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
    if (typeof definition?.required === "boolean")
        return definition.required;
    if (typeof definition?.meta?.required === "boolean")
        return definition.meta.required;
    if (typeof task?.task_meta?.required === "boolean")
        return task.task_meta.required;
    return false;
}
function markTaskDirty(task) {
    task._dirty = true;
}
function getTaskJsonText(task) {
    if (!isTaskEvidenceField(task) && typeof task?._json_text === "string" && task._json_text.trim()) {
        return task._json_text;
    }
    return JSON.stringify(getTaskJsonObject(task), null, 2);
}
function setTaskBooleanValue(task, value) {
    task.valor_boolean = Boolean(value);
    markTaskDirty(task);
}
function setTaskNumericValue(task, value) {
    const raw = String(value ?? "").trim();
    task.valor_numeric = raw === "" ? null : Number(raw);
    markTaskDirty(task);
}
function setTaskTextValue(task, value) {
    task.valor_text = String(value ?? "");
    markTaskDirty(task);
}
function setTaskObservation(task, value) {
    task.observacion = String(value ?? "");
    markTaskDirty(task);
}
function setTaskJsonValue(task, value) {
    task._json_text = String(value ?? "");
    try {
        const parsed = JSON.parse(task._json_text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            task.valor_json = parsed;
        }
    }
    catch {
        // keep raw text so validation can surface the issue on save
    }
    markTaskDirty(task);
}
function getAttachmentOriginLabel(attachment) {
    const meta = attachment?.meta ?? {};
    const source = String(meta?.source || "").trim().toUpperCase();
    if (source === "TASK_EVIDENCE") {
        const taskLabel = String(meta?.task_label || meta?.tarea_label || "").trim();
        const evidenceKind = String(meta?.evidence_kind || "").trim();
        return [taskLabel || "Tarea", evidenceKind ? `· ${getTaskEvidenceRequirementLabel(evidenceKind)}` : ""]
            .join(" ")
            .trim();
    }
    return "OT general";
}
function buildTaskEvidenceAttachmentMeta(task, requirement) {
    return {
        source: "TASK_EVIDENCE",
        plan_id: task?.plan_id || null,
        tarea_id: task?.tarea_id || null,
        task_label: getTaskLabelForTask(task),
        plan_label: getPlanLabelForTask(task),
        evidence_kind: normalizeEvidenceKind(requirement),
    };
}
function buildTaskEvidenceAttachmentRef(draftAttachment, requirement) {
    return {
        draft_attachment_id: draftAttachment.id,
        attachment_id: null,
        evidence_kind: normalizeEvidenceKind(requirement),
        nombre: draftAttachment.nombre,
        mime_type: draftAttachment.mime_type || null,
        tipo: draftAttachment.tipo || "EVIDENCIA",
    };
}
async function handleTaskEvidenceFiles(task, requirement, value) {
    if (isReadOnlyWorkflow.value) {
        ui.error("La OT está cerrada y no permite edición.");
        return;
    }
    const files = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
    if (!files.length)
        return;
    const payload = getTaskJsonObject(task);
    const attachments = Array.isArray(payload.adjuntos) ? [...payload.adjuntos] : [];
    for (const file of files) {
        const base64 = await fileToBase64(file);
        const draftId = `draft-task-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const draftAttachment = {
            id: draftId,
            tipo: "EVIDENCIA",
            nombre: file.name,
            contenido_base64: base64,
            mime_type: file.type || "application/octet-stream",
            preview_url: URL.createObjectURL(file),
            meta: buildTaskEvidenceAttachmentMeta(task, requirement),
            _isDraft: true,
            _raw: null,
        };
        attachmentRows.value.unshift(draftAttachment);
        attachments.push(buildTaskEvidenceAttachmentRef(draftAttachment, requirement));
    }
    setTaskJsonObject(task, {
        ...payload,
        evidencias_requeridas: getTaskEvidenceRequirements(task),
        adjuntos: attachments,
    });
    bumpTaskEvidenceInputKey(task, requirement);
    ui.success("Evidencia agregada a la tarea.");
}
function openTaskEvidenceAttachment(attachment) {
    const draftAttachmentId = String(attachment?.draft_attachment_id || "").trim();
    if (draftAttachmentId) {
        const draft = attachmentRows.value.find((row) => String(row?.id || "") === draftAttachmentId);
        if (draft) {
            openAttachment(draft);
            return;
        }
    }
    const attachmentId = String(attachment?.attachment_id || "").trim();
    if (!attachmentId || !editingId.value)
        return;
    const persisted = attachmentRows.value.find((row) => String(row?.id || "") === attachmentId);
    if (persisted) {
        openAttachment(persisted);
    }
}
function removeDraftAttachmentIfUnreferenced(draftAttachmentId) {
    const isStillReferenced = taskRows.value.some((row) => getTaskEvidenceEntries(row).some((attachment) => String(attachment?.draft_attachment_id || "") === draftAttachmentId));
    if (!isStillReferenced) {
        attachmentRows.value = attachmentRows.value.filter((row) => String(row?.id || "") !== draftAttachmentId);
    }
}
function unlinkAttachmentFromTaskEvidence(attachmentId, draftAttachmentId) {
    for (const task of taskRows.value) {
        const payload = getTaskJsonObject(task);
        const currentEntries = getTaskEvidenceEntries(task);
        const adjuntos = currentEntries.filter((entry) => {
            const matchesAttachment = attachmentId && String(entry?.attachment_id || "") === String(attachmentId);
            const matchesDraft = draftAttachmentId && String(entry?.draft_attachment_id || "") === String(draftAttachmentId);
            return !matchesAttachment && !matchesDraft;
        });
        if (adjuntos.length !== currentEntries.length) {
            setTaskJsonObject(task, {
                ...payload,
                evidencias_requeridas: getTaskEvidenceRequirements(task),
                adjuntos,
            });
        }
    }
}
function removeTaskEvidenceAttachment(task, attachment) {
    if (isReadOnlyWorkflow.value) {
        ui.error("La OT está cerrada y no permite edición.");
        return;
    }
    const payload = getTaskJsonObject(task);
    const attachmentKey = getTaskEvidenceEntryKey(attachment);
    const adjuntos = getTaskEvidenceEntries(task).filter((entry) => getTaskEvidenceEntryKey(entry) !== attachmentKey);
    setTaskJsonObject(task, {
        ...payload,
        evidencias_requeridas: getTaskEvidenceRequirements(task),
        adjuntos,
    });
    const draftAttachmentId = String(attachment?.draft_attachment_id || "").trim();
    if (draftAttachmentId) {
        removeDraftAttachmentIfUnreferenced(draftAttachmentId);
    }
}
function validateTaskValue(task) {
    const fieldType = getTaskFieldType(task);
    if (fieldType === "NUMBER") {
        return task.valor_numeric !== null && task.valor_numeric !== undefined && Number.isFinite(Number(task.valor_numeric));
    }
    if (fieldType === "TEXT") {
        return String(task.valor_text ?? "").trim().length > 0;
    }
    if (fieldType === "JSON") {
        if (isTaskEvidenceField(task)) {
            const requiredKinds = getTaskEvidenceRequirements(task);
            const entries = getTaskEvidenceEntries(task);
            if (!entries.length)
                return false;
            return requiredKinds.every((kind) => entries.some((entry) => normalizeEvidenceKind(entry?.evidence_kind) === normalizeEvidenceKind(kind)));
        }
        const raw = String(getTaskJsonText(task) ?? "").trim();
        if (!raw)
            return false;
        try {
            JSON.parse(raw);
            return true;
        }
        catch {
            return false;
        }
    }
    return true;
}
function buildTaskPersistencePayload(task) {
    const fieldType = getTaskFieldType(task);
    let valor_boolean = null;
    let valor_numeric = null;
    let valor_text = null;
    let valor_json = null;
    if (fieldType === "BOOLEAN") {
        valor_boolean = Boolean(task.valor_boolean);
    }
    else if (fieldType === "NUMBER") {
        valor_numeric =
            task.valor_numeric === null || task.valor_numeric === undefined || task.valor_numeric === ""
                ? null
                : Number(task.valor_numeric);
    }
    else if (fieldType === "TEXT") {
        valor_text = String(task.valor_text ?? "").trim() || null;
    }
    else {
        if (isTaskEvidenceField(task)) {
            const payload = getTaskJsonObject(task);
            valor_json = {
                ...payload,
                evidencias_requeridas: getTaskEvidenceRequirements(task),
                adjuntos: getTaskEvidenceEntries(task).map((attachment) => ({
                    attachment_id: attachment?.attachment_id || null,
                    evidence_kind: normalizeEvidenceKind(attachment?.evidence_kind),
                    nombre: attachment?.nombre || null,
                    mime_type: attachment?.mime_type || null,
                    tipo: attachment?.tipo || "EVIDENCIA",
                })),
            };
        }
        else {
            const raw = String(getTaskJsonText(task) ?? "").trim();
            if (raw) {
                try {
                    valor_json = JSON.parse(raw);
                }
                catch {
                    throw new Error(`La tarea ${getTaskLabelForTask(task)} requiere un JSON válido.`);
                }
            }
        }
    }
    if (isTaskRequired(task) && !validateTaskValue(task)) {
        throw new Error(`Completa la captura obligatoria de la tarea ${getTaskLabelForTask(task)}.`);
    }
    return {
        plan_id: task.plan_id,
        tarea_id: task.tarea_id,
        valor_boolean,
        valor_numeric,
        valor_text,
        valor_json,
        observacion: String(task.observacion ?? "").trim() || null,
    };
}
function validateTaskRowsForSave() {
    for (const row of taskRows.value) {
        try {
            buildTaskPersistencePayload(row);
        }
        catch (error) {
            ui.error(error?.message || "Revisa la captura de tareas antes de guardar.");
            return false;
        }
    }
    return true;
}
async function syncChecklistFromTemplate(showToast = true) {
    const selectedProcedurePlanId = String(selectedProcedure.value?.plan_id || "");
    const planId = String(headerForm.plan_id || taskForm.plan_id || selectedProcedurePlanId || "");
    if (!planId)
        return;
    headerForm.plan_id = planId;
    taskForm.plan_id = planId;
    await loadTaskOptionsByPlan(planId);
    const definitions = planTaskCatalogByPlan.value[planId] ?? [];
    if (!definitions.length)
        return;
    const existingTaskIds = new Set(taskRows.value.map((row) => String(row?.tarea_id || "")).filter(Boolean));
    const drafts = definitions
        .filter((definition) => !existingTaskIds.has(String(definition?.id || "")))
        .map((definition) => ({
        id: `draft-task-${Date.now()}-${String(definition?.id || "").slice(0, 8)}`,
        plan_id: planId,
        tarea_id: definition.id,
        field_type: definition.field_type,
        required: definition.required,
        observacion: taskForm.observacion || null,
        plan_label: getSelectedPlanLabel(planId),
        tarea_label: normalizeTask(definition).title,
        task_meta: definition.meta ?? {},
        valor_boolean: normalizeTaskFieldType(definition.field_type) === "BOOLEAN" ? false : null,
        valor_numeric: null,
        valor_text: "",
        valor_json: normalizeTaskFieldType(definition.field_type) === "JSON"
            ? {
                evidencias_requeridas: Array.isArray(definition?.meta?.evidencias_requeridas)
                    ? definition.meta.evidencias_requeridas.map((value) => normalizeEvidenceKind(value))
                    : [],
                adjuntos: [],
            }
            : null,
        _json_text: normalizeTaskFieldType(definition.field_type) === "JSON"
            ? JSON.stringify({
                adjuntos: [],
                evidencias_requeridas: Array.isArray(definition?.meta?.evidencias_requeridas)
                    ? definition.meta.evidencias_requeridas.map((value) => normalizeEvidenceKind(value))
                    : [],
            }, null, 2)
            : "",
        _isDraft: true,
        _raw: null,
    }));
    if (drafts.length) {
        taskRows.value = [...drafts, ...taskRows.value];
        taskForm.observacion = "";
        if (showToast)
            ui.success("Checklist sincronizado desde la plantilla MPG.");
    }
    else if (showToast) {
        ui.open("El checklist de la plantilla ya estaba cargado.", "info", 3500);
    }
}
const selectedProcedure = computed(() => procedureCatalog.value.find((item) => String(item?.id || "") === String(headerForm.procedimiento_id || "")) ?? null);
const selectedProcedureLabel = computed(() => selectedProcedure.value?.codigo
    ? `${selectedProcedure.value.codigo} - ${selectedProcedure.value.nombre || selectedProcedure.value.codigo}`
    : selectedProcedure.value?.nombre || "Sin plantilla MPG");
const selectedEquipmentLabel = computed(() => {
    const selected = equipmentOptions.value.find((item) => String(item?.value || "") === String(headerForm.equipment_id || ""));
    return selected?.title || String(headerForm.equipment_id || "Sin equipo");
});
const selectedEquipmentComponentLabel = computed(() => {
    const selected = equipmentComponentOptions.value.find((item) => String(item?.value || "") === String(headerForm.equipo_componente_id || ""));
    return selected?.title || String(headerForm.equipo_componente_id || "Sin compartimiento");
});
const selectedAlertLabel = computed(() => {
    const selected = alertOptions.value.find((item) => String(item?.value || "") === String(headerForm.alerta_id || ""));
    return selected?.title || String(headerForm.alerta_id || "");
});
const selectedBlockingOrderLabel = computed(() => {
    const selected = blockingWorkOrderOptions.value.find((item) => String(item?.value || "") === String(headerForm.blocked_by_work_order_id || ""));
    return selected?.title || String(headerForm.blocked_by_work_order_id || "");
});
const resolvedOperationalPlanLabel = computed(() => {
    if (headerForm.plan_id)
        return getSelectedPlanLabel(headerForm.plan_id);
    if (!headerForm.procedimiento_id)
        return "Se generara al guardar";
    if (selectedProcedure.value?.plan_id) {
        return getSelectedPlanLabel(String(selectedProcedure.value.plan_id));
    }
    return `Se sincroniza desde ${selectedProcedureLabel.value}`;
});
function buildAutoHeaderValues() {
    const referenceLabel = headerForm.procedimiento_id
        ? selectedProcedureLabel.value
        : getSelectedPlanLabel(headerForm.plan_id);
    const generatedTitle = `Orden (${referenceLabel})`;
    const generatedType = headerForm.type || "MANTENIMIENTO";
    return { generatedTitle, generatedType };
}
function unwrapData(payload) {
    if (payload && typeof payload === "object" && "data" in payload) {
        return payload.data;
    }
    return payload;
}
function hasApiNotImplemented(error) {
    const status = Number(error?.response?.status || 0);
    return status === 404 || status === 405 || status === 501;
}
async function safeGetList(url, fallbackMessage) {
    try {
        const { data } = await api.get(url);
        return asArray(data);
    }
    catch (e) {
        if (hasApiNotImplemented(e)) {
            if (!unsupportedDetailMessages.value.includes(fallbackMessage)) {
                unsupportedDetailMessages.value.push(fallbackMessage);
            }
            return [];
        }
        throw e;
    }
}
function normalizeTask(item) {
    const actividad = item?.actividad ?? item?.nombre ?? item?.id;
    const orden = item?.orden != null ? `${item.orden} - ` : "";
    return { value: item.id, title: `${orden}${actividad}` };
}
async function loadTaskOptionsByPlan(planId) {
    if (!planId) {
        taskOptions.value = [];
        equipmentComponentOptions.value = [];
        return;
    }
    loadingTaskOptions.value = true;
    try {
        const { data } = await api.get(`/kpi_maintenance/planes/${planId}/tareas`);
        const rows = asArray(data);
        planTaskCatalogByPlan.value[String(planId)] = rows;
        taskOptions.value = rows.map(normalizeTask);
        taskLabelCacheByPlan.value[String(planId)] = taskOptions.value.reduce((acc, task) => {
            acc[String(task.value)] = task.title;
            return acc;
        }, {});
    }
    catch (e) {
        taskOptions.value = [];
        ui.error(e?.response?.data?.message || "No se pudieron cargar las tareas del plan.");
    }
    finally {
        loadingTaskOptions.value = false;
    }
}
async function ensureTaskLabelCacheForRows(rows) {
    const planIds = [...new Set(rows.map((row) => String(row?.plan_id || "")).filter(Boolean))];
    const pendingPlanIds = planIds.filter((planId) => !taskLabelCacheByPlan.value[planId]);
    await Promise.all(pendingPlanIds.map((planId) => loadTaskOptionsByPlan(planId)));
}
async function fetchWorkOrders() {
    loading.value = true;
    error.value = null;
    try {
        records.value = await listAll("/kpi_maintenance/work-orders");
        workOrderCatalogRows.value = records.value;
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudieron cargar las órdenes de trabajo.";
    }
    finally {
        loading.value = false;
    }
}
async function loadDetailData() {
    if (!editingId.value)
        return;
    loadingDetails.value = true;
    unsupportedDetailMessages.value = [];
    try {
        const [tasksRes, attachmentsRes, consumosRows, issuesRows, historyRes] = await Promise.all([
            api.get(`/kpi_maintenance/work-orders/${editingId.value}/tareas`),
            api.get(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos`),
            safeGetList(`/kpi_maintenance/work-orders/${editingId.value}/consumos`, "El backend actual no expone un listado de consumos por OT; los consumos nuevos sí se registran correctamente, pero al reabrir la OT no podrán consultarse desde esta pantalla."),
            safeGetList(`/kpi_maintenance/work-orders/${editingId.value}/issue-materials`, "El backend actual no expone un listado de salidas de materiales por OT; las emisiones nuevas dependen de la reserva de stock del backend."),
            safeGetList(`/kpi_maintenance/work-orders/${editingId.value}/history`, "No se pudo cargar el historial de la orden de trabajo."),
        ]);
        taskRows.value = asArray(tasksRes.data).map((x) => ({
            ...x,
            _json_text: x?.valor_json && typeof x.valor_json === "object"
                ? JSON.stringify(x.valor_json, null, 2)
                : "",
            _dirty: false,
            _raw: null,
        }));
        await ensureTaskLabelCacheForRows(taskRows.value);
        attachmentRows.value = asArray(attachmentsRes.data).map((x) => ({ ...x, _raw: x }));
        localConsumos.value = consumosRows.map((x) => ({ ...x, _raw: x }));
        localIssues.value = issuesRows.map((x) => ({ ...x, total: x.total ?? x.items?.reduce?.((acc, it) => acc + Number(it.costo_unitario || 0) * Number(it.cantidad || 0), 0) ?? null, _raw: x }));
        localHistory.value = historyRes.map((x) => ({ ...x, _raw: x }));
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudieron cargar los detalles principales de la OT.");
    }
    finally {
        loadingDetails.value = false;
    }
}
const rows = computed(() => {
    const q = search.value.trim().toLowerCase();
    return records.value
        .map((r) => ({
        ...r,
        equipment_label: getEquipmentLabel(r),
        equipment_component_label: getEquipmentComponentLabel(r),
        _raw: r,
        _search: JSON.stringify({ ...r, equipment_label: getEquipmentLabel(r), equipment_component_label: getEquipmentComponentLabel(r) }).toLowerCase(),
    }))
        .filter((r) => !q || r._search.includes(q));
});
function resetAllForms() {
    headerForm.code = "";
    headerForm.type = "MANTENIMIENTO";
    headerForm.title = "";
    headerForm.equipment_id = "";
    headerForm.equipo_componente_id = "";
    headerForm.maintenance_kind = "CORRECTIVO";
    headerForm.status_workflow = "PLANNED";
    headerForm.procedimiento_id = "";
    headerForm.plan_id = "";
    headerForm.alerta_id = "";
    headerForm.blocked_by_work_order_id = "";
    headerForm.blocked_reason = "";
    headerForm.causa = "";
    headerForm.accion = "";
    headerForm.prevencion = "";
    taskForm.plan_id = "";
    taskForm.tarea_id = "";
    taskForm.observacion = "";
    attachmentForm.tipo = "EVIDENCIA";
    attachmentForm.nombre = "";
    attachmentForm.contenido_base64 = "";
    attachmentForm.mime_type = "";
    attachmentPreviewUrl.value = null;
    consumoForm.producto_id = "";
    consumoForm.bodega_id = "";
    consumoForm.cantidad = "";
    consumoForm.costo_unitario = "";
    consumoForm.observacion = "";
    materialItems.value = [newMaterialItem()];
    materialsForm.observacion = "";
    taskRows.value = [];
    attachmentRows.value = [];
    localConsumos.value = [];
    localIssues.value = [];
    localHistory.value = [];
    taskOptions.value = [];
    unsupportedDetailMessages.value = [];
    tab.value = "tareas";
}
async function openCreate() {
    if (!canCreate.value)
        return;
    editingId.value = null;
    closingFlow.value = false;
    resetAllForms();
    await assignNextWorkOrderCode();
    dialog.value = true;
}
async function openEdit(item) {
    if (!canEdit.value)
        return;
    editingId.value = item.id;
    closingFlow.value = false;
    resetAllForms();
    headerForm.code = item.code ?? item.codigo ?? "";
    headerForm.type = item.type ?? item.tipo ?? "";
    headerForm.title = item.title ?? item.titulo ?? "";
    headerForm.equipment_id = item.equipment_id ?? "";
    headerForm.equipo_componente_id = item.equipo_componente_id ?? "";
    headerForm.maintenance_kind = item.maintenance_kind ?? "CORRECTIVO";
    const initialWorkflow = normalizeWorkflowStatus(item.status_workflow);
    headerForm.status_workflow = initialWorkflow;
    headerForm.procedimiento_id = item.procedimiento_id ?? "";
    headerForm.plan_id = item.plan_id ?? "";
    taskForm.plan_id = headerForm.plan_id || "";
    headerForm.alerta_id = item.alerta_id ?? "";
    headerForm.blocked_by_work_order_id = item.blocked_by_work_order_id ?? "";
    headerForm.blocked_reason = item.blocked_reason ?? "";
    const headerValorJson = parseValorJson(item?.valor_json);
    headerForm.causa = headerValorJson?.causa ?? "";
    headerForm.accion = headerValorJson?.accion ?? "";
    headerForm.prevencion = headerValorJson?.prevencion ?? "";
    dialog.value = true;
    await loadEquipmentComponents(String(headerForm.equipment_id || ""));
    await loadDetailData();
    if (!isReadOnlyWorkflow.value) {
        await syncChecklistFromTemplate(false);
    }
    ensureTabVisible();
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            const base64 = result.includes(",") ? (result.split(",")[1] ?? "") : result;
            resolve(base64);
        };
        reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
        reader.readAsDataURL(file);
    });
}
async function openAttachment(item) {
    if (item?._isDraft) {
        const draftUrl = item?.preview_url;
        if (draftUrl) {
            window.open(draftUrl, "_blank", "noopener,noreferrer");
        }
        return;
    }
    if (!editingId.value || !item?.id)
        return;
    try {
        const directUrl = item?.view_url;
        if (directUrl) {
            window.open(directUrl, "_blank", "noopener,noreferrer");
            return;
        }
        const { data } = await api.get(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos/${item.id}`);
        const resolved = unwrapData(data);
        const target = resolved?.view_url || resolved?.data_url;
        if (!target) {
            ui.error("No fue posible generar la vista del adjunto.");
            return;
        }
        window.open(target, "_blank", "noopener,noreferrer");
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo abrir el adjunto.");
    }
}
async function handleAttachmentFileChange(value) {
    const file = Array.isArray(value) ? value[0] : value;
    if (!file) {
        attachmentForm.nombre = "";
        attachmentForm.mime_type = "";
        attachmentForm.contenido_base64 = "";
        attachmentPreviewUrl.value = null;
        return;
    }
    attachmentForm.nombre = file.name;
    attachmentForm.mime_type = file.type || "application/octet-stream";
    try {
        attachmentForm.contenido_base64 = await fileToBase64(file);
        attachmentPreviewUrl.value = URL.createObjectURL(file);
    }
    catch (e) {
        ui.error(e?.message || "No se pudo procesar el archivo.");
    }
}
function openDelete(item) {
    if (!canDelete.value)
        return;
    deletingId.value = item.id;
    deleteDialog.value = true;
}
function ensureTabVisible() {
    if (tab.value === "materiales" && !showMaterialsTab.value) {
        tab.value = showConsumosTab.value ? "consumos" : "tareas";
    }
    if (tab.value === "consumos" && !showConsumosTab.value) {
        tab.value = "tareas";
    }
}
async function startProcess() {
    headerForm.status_workflow = "IN_PROGRESS";
    tab.value = "consumos";
}
async function prepareClose() {
    closingFlow.value = true;
    headerForm.status_workflow = "CLOSED";
    if (!materialItems.value.length) {
        materialItems.value = [newMaterialItem()];
    }
    tab.value = showMaterialsTab.value ? "materiales" : "consumos";
}
async function saveHeader(manageLoading = true, refreshAfterSave = true) {
    if (!canPersistHeader.value)
        return false;
    if (!headerForm.equipment_id) {
        ui.error("Equipo es obligatorio.");
        return false;
    }
    if (!headerForm.procedimiento_id && !headerForm.plan_id) {
        ui.error("Debes seleccionar una plantilla MPG para la OT.");
        return false;
    }
    if (!headerForm.maintenance_kind) {
        ui.error("Tipo mantenimiento es obligatorio.");
        return false;
    }
    if (!editingId.value && !headerForm.code) {
        await assignNextWorkOrderCode();
    }
    const { generatedTitle, generatedType } = buildAutoHeaderValues();
    const createPayload = {
        code: headerForm.code || null,
        type: generatedType,
        title: generatedTitle,
        equipment_id: headerForm.equipment_id,
        equipo_componente_id: headerForm.equipo_componente_id || null,
        maintenance_kind: headerForm.maintenance_kind || null,
        status_workflow: normalizedWorkflow.value,
        plan_id: headerForm.plan_id || null,
        procedimiento_id: headerForm.procedimiento_id || null,
        alerta_id: headerForm.alerta_id || null,
        blocked_by_work_order_id: headerForm.blocked_by_work_order_id || null,
        blocked_reason: headerForm.blocked_reason || null,
        valor_json: {
            causa: headerForm.causa || "",
            accion: headerForm.accion || "",
            prevencion: headerForm.prevencion || "",
        },
    };
    const updatePayload = {
        maintenance_kind: headerForm.maintenance_kind || null,
        status_workflow: normalizedWorkflow.value,
        procedimiento_id: headerForm.procedimiento_id || null,
        equipo_componente_id: headerForm.equipo_componente_id || null,
        blocked_by_work_order_id: headerForm.blocked_by_work_order_id || null,
        blocked_reason: headerForm.blocked_reason || null,
        valor_json: createPayload.valor_json,
    };
    if (manageLoading)
        savingHeader.value = true;
    try {
        let savedHeader = null;
        if (editingId.value) {
            const { data } = await api.patch(`/kpi_maintenance/work-orders/${editingId.value}`, updatePayload);
            savedHeader = unwrapData(data);
            ui.success("Cabecera OT actualizada.");
        }
        else {
            const requestedCode = String(headerForm.code || "").trim();
            const { data } = await api.post("/kpi_maintenance/work-orders", createPayload);
            const created = unwrapData(data);
            savedHeader = created;
            const createdId = created?.id ?? data?.id ?? data?.data?.id;
            const assignedCode = String((created?.code ?? data?.code ?? data?.data?.code ?? requestedCode) || "").trim();
            const codeWasReassigned = Boolean(created?.code_was_reassigned) || (!!assignedCode && !!requestedCode && assignedCode !== requestedCode);
            if (assignedCode) {
                headerForm.code = assignedCode;
            }
            if (createdId)
                editingId.value = createdId;
            if (codeWasReassigned && assignedCode) {
                ui.open(`Su número de orden fue actualizado a ${assignedCode}.`, "warning", 5500);
            }
            else {
                ui.success("Cabecera OT creada.");
            }
        }
        if (savedHeader) {
            headerForm.plan_id = savedHeader.plan_id ?? headerForm.plan_id;
            headerForm.procedimiento_id = savedHeader.procedimiento_id ?? headerForm.procedimiento_id;
            headerForm.equipo_componente_id = savedHeader.equipo_componente_id ?? headerForm.equipo_componente_id;
            headerForm.blocked_by_work_order_id = savedHeader.blocked_by_work_order_id ?? headerForm.blocked_by_work_order_id;
            headerForm.blocked_reason = savedHeader.blocked_reason ?? headerForm.blocked_reason;
            taskForm.plan_id = headerForm.plan_id || "";
            if (headerForm.plan_id) {
                await loadTaskOptionsByPlan(String(headerForm.plan_id));
            }
        }
        if (refreshAfterSave) {
            await fetchWorkOrders();
            await loadDetailData();
        }
        return true;
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo guardar la cabecera de OT.");
        return false;
    }
    finally {
        if (manageLoading)
            savingHeader.value = false;
    }
}
async function saveAll() {
    if (savingHeader.value)
        return;
    savingHeader.value = true;
    try {
        const headerSaved = await saveHeader(false, false);
        if (!headerSaved || !editingId.value)
            return;
        const actions = [];
        await syncChecklistFromTemplate(false);
        if (!validateTaskRowsForSave()) {
            return;
        }
        const hasCompleteAttachment = !!(attachmentForm.nombre && attachmentForm.contenido_base64);
        const hasAttachmentDraft = !!(attachmentForm.nombre || attachmentForm.contenido_base64 || attachmentForm.mime_type);
        if (hasAttachmentDraft && !hasCompleteAttachment) {
            ui.error("Para guardar un adjunto debes seleccionar un archivo válido.");
            return;
        }
        if (hasCompleteAttachment) {
            await createAttachment(false);
        }
        const hasCompleteConsumo = !!(consumoForm.bodega_id && consumoForm.producto_id && consumoForm.cantidad);
        const hasConsumoDraft = !!(consumoForm.producto_id || consumoForm.bodega_id || consumoForm.cantidad || consumoForm.costo_unitario || consumoForm.observacion);
        if (hasConsumoDraft && !hasCompleteConsumo) {
            ui.error("Para registrar un consumo debes completar bodega, material y cantidad.");
            return;
        }
        if (hasCompleteConsumo) {
            actions.push(createConsumo);
        }
        const validMaterialItems = materialItems.value
            .filter((item) => item.producto_id && item.bodega_id && item.cantidad && Number(item.cantidad) > 0);
        const hasMaterialFields = hasMaterialDraft();
        if (hasMaterialFields && !validMaterialItems.length && !materialsForm.observacion) {
            ui.error("La salida de materiales requiere al menos un item completo con bodega, material y cantidad.");
            return;
        }
        if (validMaterialItems.length) {
            actions.push(issueMaterials);
        }
        for (const run of actions) {
            await run();
        }
        await persistDraftAttachments();
        await persistEditedTasks(false);
        await persistDraftTasks(false);
        await fetchWorkOrders();
        await loadDetailData();
        if (normalizedWorkflow.value === "CLOSED") {
            closingFlow.value = false;
        }
        ensureTabVisible();
    }
    finally {
        savingHeader.value = false;
    }
}
async function persistDraftTasks(refreshAfterSave = true) {
    if (!editingId.value)
        return;
    const drafts = taskRows.value.filter((row) => row?._isDraft);
    for (const draft of drafts) {
        try {
            await api.post(`/kpi_maintenance/work-orders/${editingId.value}/tareas`, buildTaskPersistencePayload(draft));
        }
        catch (e) {
            const errorMessage = e instanceof Error
                ? e.message
                : e?.response?.data?.message || `No se pudo guardar la tarea ${draft.tarea_id}.`;
            ui.error(errorMessage);
        }
    }
    if (refreshAfterSave && drafts.length) {
        await loadDetailData();
    }
}
async function persistEditedTasks(refreshAfterSave = true) {
    const editedRows = taskRows.value.filter((row) => !row?._isDraft && row?._dirty);
    for (const row of editedRows) {
        try {
            await api.patch(`/kpi_maintenance/work-orders/tareas/${row.id}`, buildTaskPersistencePayload(row));
            row._dirty = false;
        }
        catch (e) {
            const errorMessage = e instanceof Error
                ? e.message
                : e?.response?.data?.message || `No se pudo actualizar la tarea ${row.id}.`;
            ui.error(errorMessage);
        }
    }
    if (refreshAfterSave && editedRows.length) {
        await loadDetailData();
    }
}
async function persistDraftAttachments() {
    if (!editingId.value)
        return;
    const drafts = attachmentRows.value.filter((row) => row?._isDraft);
    for (const draft of drafts) {
        try {
            const { data } = await api.post(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos`, {
                tipo: draft.tipo || "EVIDENCIA",
                nombre: draft.nombre,
                contenido_base64: draft.contenido_base64,
                mime_type: draft.mime_type || null,
                meta: draft.meta || null,
            });
            const savedAttachment = unwrapData(data);
            attachmentRows.value = attachmentRows.value.map((row) => String(row?.id || "") === String(draft.id)
                ? {
                    ...savedAttachment,
                    meta: savedAttachment?.meta || draft.meta || {},
                    _raw: savedAttachment,
                }
                : row);
            replaceDraftAttachmentReferencesInTasks(String(draft.id), savedAttachment);
        }
        catch (e) {
            ui.error(e?.response?.data?.message || `No se pudo guardar el adjunto ${draft.nombre}.`);
        }
    }
}
function replaceDraftAttachmentReferencesInTasks(draftAttachmentId, savedAttachment) {
    for (const task of taskRows.value) {
        const payload = getTaskJsonObject(task);
        const adjuntos = getTaskEvidenceEntries(task).map((attachment) => {
            if (String(attachment?.draft_attachment_id || "") !== draftAttachmentId)
                return attachment;
            return {
                attachment_id: savedAttachment?.id || null,
                draft_attachment_id: null,
                evidence_kind: normalizeEvidenceKind(attachment?.evidence_kind || savedAttachment?.meta?.evidence_kind),
                nombre: savedAttachment?.nombre || attachment?.nombre || null,
                mime_type: savedAttachment?.meta?.mime_type || attachment?.mime_type || null,
                tipo: savedAttachment?.tipo || attachment?.tipo || "EVIDENCIA",
            };
        });
        const changed = adjuntos.some((attachment) => String(attachment?.attachment_id || "") === String(savedAttachment?.id || ""));
        if (changed) {
            setTaskJsonObject(task, {
                ...payload,
                evidencias_requeridas: getTaskEvidenceRequirements(task),
                adjuntos,
            });
        }
    }
}
async function deleteTask(item) {
    if (isReadOnlyWorkflow.value)
        return ui.error("La OT está cerrada y no permite edición.");
    if (item?._isDraft) {
        taskRows.value = taskRows.value.filter((row) => row.id !== item.id);
        return;
    }
    if (!item?.id)
        return;
    try {
        await api.delete(`/kpi_maintenance/work-orders/tareas/${item.id}`);
        ui.success("Tarea eliminada.");
        await loadDetailData();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo eliminar la tarea.");
    }
}
async function createAttachment(showToast = true) {
    if (isReadOnlyWorkflow.value)
        return ui.error("La OT está cerrada y no permite edición.");
    if (!attachmentForm.nombre || !attachmentForm.contenido_base64)
        return ui.error("Debes seleccionar un archivo.");
    const draftId = `draft-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Borrador local: el detalle solo se persiste cuando el usuario guarda la OT completa.
    attachmentRows.value.unshift({
        id: draftId,
        tipo: attachmentForm.tipo || "EVIDENCIA",
        nombre: attachmentForm.nombre,
        contenido_base64: attachmentForm.contenido_base64,
        mime_type: attachmentForm.mime_type || null,
        preview_url: attachmentPreviewUrl.value,
        meta: {
            source: "OT_GENERAL",
        },
        _isDraft: true,
        _raw: null,
    });
    attachmentForm.tipo = "EVIDENCIA";
    attachmentForm.nombre = "";
    attachmentForm.contenido_base64 = "";
    attachmentForm.mime_type = "";
    attachmentPreviewUrl.value = null;
    if (showToast)
        ui.success("Adjunto agregado.");
}
async function deleteAttachment(item) {
    if (isReadOnlyWorkflow.value)
        return ui.error("La OT está cerrada y no permite edición.");
    if (item?._isDraft) {
        unlinkAttachmentFromTaskEvidence(null, String(item?.id || ""));
        attachmentRows.value = attachmentRows.value.filter((row) => row.id !== item.id);
        return;
    }
    if (!editingId.value || !item?.id)
        return;
    try {
        await api.delete(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos/${item.id}`);
        unlinkAttachmentFromTaskEvidence(String(item.id), null);
        ui.success("Adjunto eliminado.");
        await loadDetailData();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo eliminar el adjunto.");
    }
}
async function createConsumo() {
    if (isReadOnlyWorkflow.value)
        return ui.error("La OT está cerrada y no permite edición.");
    if (!editingId.value)
        return ui.error("Guarda primero la cabecera de la OT para registrar consumos.");
    if (!consumoForm.bodega_id || !consumoForm.producto_id || !consumoForm.cantidad) {
        return ui.error("Bodega, material y cantidad son obligatorios.");
    }
    const payload = {
        producto_id: consumoForm.producto_id,
        bodega_id: consumoForm.bodega_id,
        cantidad: Number(consumoForm.cantidad),
        ...(consumoForm.costo_unitario ? { costo_unitario: Number(consumoForm.costo_unitario) } : {}),
        observacion: consumoForm.observacion || null,
    };
    try {
        await api.post(`/kpi_maintenance/work-orders/${editingId.value}/consumos`, payload);
        consumoForm.producto_id = "";
        consumoForm.bodega_id = "";
        consumoForm.cantidad = "";
        consumoForm.costo_unitario = "";
        consumoForm.observacion = "";
        await loadDetailData();
        ui.success("Consumo registrado.");
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo registrar el consumo.");
    }
}
async function issueMaterials() {
    if (issuingMaterials.value)
        return;
    if (isReadOnlyWorkflow.value)
        return ui.error("La OT está cerrada y no permite edición.");
    if (!editingId.value)
        return ui.error("Guarda primero la cabecera de la OT para registrar salida de materiales.");
    const items = materialItems.value
        .filter((item) => item.producto_id || item.bodega_id || item.cantidad)
        .map((item) => ({
        producto_id: item.producto_id,
        bodega_id: item.bodega_id,
        cantidad: Number(item.cantidad),
    }));
    if (!items.length)
        return ui.error("Debes ingresar al menos un item.");
    const hasInvalidItem = items.some((item) => !item.producto_id || !item.bodega_id || !Number.isFinite(item.cantidad) || item.cantidad <= 0);
    if (hasInvalidItem) {
        return ui.error("Cada item debe incluir bodega, material y cantidad mayor a 0.");
    }
    const payload = {
        items,
        observacion: materialsForm.observacion || null,
    };
    try {
        issuingMaterials.value = true;
        await api.post(`/kpi_maintenance/work-orders/${editingId.value}/issue-materials`, payload);
        materialItems.value = [newMaterialItem()];
        materialsForm.observacion = "";
        closingFlow.value = false;
        await loadDetailData();
        ui.success("Salida de materiales registrada.");
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo emitir materiales.");
    }
    finally {
        issuingMaterials.value = false;
    }
}
function addMaterialItem() {
    materialItems.value.push(newMaterialItem());
}
function removeMaterialItem(index) {
    if (materialItems.value.length === 1) {
        materialItems.value[0] = newMaterialItem();
        return;
    }
    materialItems.value.splice(index, 1);
}
function hasMaterialDraft() {
    if (materialsForm.observacion)
        return true;
    return materialItems.value.some((item) => item.producto_id || item.bodega_id || item.cantidad);
}
async function confirmDelete() {
    if (!deletingId.value)
        return;
    savingHeader.value = true;
    try {
        await api.delete(`/kpi_maintenance/work-orders/${deletingId.value}`);
        ui.success("Orden de trabajo eliminada.");
        deleteDialog.value = false;
        await fetchWorkOrders();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo eliminar la OT.");
    }
    finally {
        savingHeader.value = false;
    }
}
onMounted(async () => {
    try {
        await Promise.all([fetchWorkOrders(), loadCatalogs()]);
    }
    catch {
        // errores específicos ya manejados en cada método
    }
});
function incrementAlphaPrefix(letter) {
    const nextCharCode = letter.toUpperCase().charCodeAt(0) + 1;
    if (nextCharCode > 90)
        return "A";
    return String.fromCharCode(nextCharCode);
}
function nextWorkOrderCode(lastCode) {
    if (!lastCode)
        return "OT-A00001";
    const match = /^OT-([A-Z])(\d{5})$/i.exec(lastCode.trim());
    if (!match)
        return "OT-A00001";
    const currentLetter = (match[1] ?? "A").toUpperCase();
    const currentNumber = Number(match[2] ?? "0");
    if (currentNumber >= 99999) {
        return `OT-${incrementAlphaPrefix(currentLetter)}00001`;
    }
    return `OT-${currentLetter}${String(currentNumber + 1).padStart(5, "0")}`;
}
function getWorkOrderCodeRank(code) {
    const match = /^OT-([A-Z])(\d{5})$/i.exec(String(code || "").trim());
    if (!match)
        return -1;
    const letter = (match[1] ?? "A").toUpperCase();
    const number = Number(match[2] ?? "0");
    return (letter.charCodeAt(0) - 64) * 100000 + number;
}
function getHighestWorkOrderCode(codes) {
    const normalized = codes
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .sort((a, b) => getWorkOrderCodeRank(b) - getWorkOrderCodeRank(a));
    return normalized[0] ?? null;
}
async function assignNextWorkOrderCode() {
    try {
        const { data } = await api.get("/kpi_maintenance/work-orders/next-code");
        const resolved = unwrapData(data);
        const nextCode = resolved?.code ?? data?.code ?? data?.data?.code;
        if (nextCode) {
            headerForm.code = String(nextCode);
            return;
        }
    }
    catch {
        // fallback local
    }
    try {
        const rows = records.value.length ? records.value : await listAll("/kpi_maintenance/work-orders");
        const lastCode = getHighestWorkOrderCode(rows.map((row) => row?.code ?? row?.codigo ?? ""));
        headerForm.code = nextWorkOrderCode(lastCode);
    }
    catch {
        headerForm.code = "OT-A00001";
    }
}
watch(() => editingId.value, async (id) => {
    if (!id && dialog.value && !headerForm.code) {
        await assignNextWorkOrderCode();
    }
});
watch(() => headerForm.procedimiento_id, async (procedimientoId, previousProcedimientoId) => {
    if (String(procedimientoId || "") === String(previousProcedimientoId || ""))
        return;
    const selected = procedureCatalog.value.find((item) => String(item?.id || "") === String(procedimientoId || ""));
    const suggestedComponentId = getSuggestedProcedureComponentId(selected);
    if (suggestedComponentId && !headerForm.equipo_componente_id) {
        headerForm.equipo_componente_id = suggestedComponentId;
    }
    if (editingId.value)
        return;
    headerForm.plan_id = selected?.plan_id ? String(selected.plan_id) : "";
    taskForm.plan_id = headerForm.plan_id || "";
    taskForm.tarea_id = "";
    taskRows.value = [];
    if (headerForm.plan_id) {
        await loadTaskOptionsByPlan(headerForm.plan_id);
        await syncChecklistFromTemplate(false);
    }
});
watch(() => headerForm.equipment_id, async (equipmentId, previousEquipmentId) => {
    const nextEquipmentId = String(equipmentId || "");
    const previous = String(previousEquipmentId || "");
    if (nextEquipmentId === previous)
        return;
    await loadEquipmentComponents(nextEquipmentId);
    if (headerForm.equipo_componente_id &&
        !equipmentComponentOptions.value.some((item) => String(item?.value || "") === String(headerForm.equipo_componente_id || ""))) {
        headerForm.equipo_componente_id = "";
    }
    if (!headerForm.equipo_componente_id) {
        const selected = procedureCatalog.value.find((item) => String(item?.id || "") === String(headerForm.procedimiento_id || ""));
        const suggestedComponentId = getSuggestedProcedureComponentId(selected);
        if (suggestedComponentId) {
            headerForm.equipo_componente_id = suggestedComponentId;
        }
    }
});
watch(() => headerForm.plan_id, async (planId, previousPlanId) => {
    const nextPlan = String(planId || "");
    const prevPlan = String(previousPlanId || "");
    taskForm.plan_id = nextPlan;
    if (nextPlan !== prevPlan) {
        taskForm.tarea_id = "";
    }
    await loadTaskOptionsByPlan(nextPlan);
});
watch(() => consumoForm.bodega_id, async () => {
    resetConsumoProductIfInvalid();
    await syncConsumoUnitCost();
});
watch(() => consumoForm.producto_id, async () => {
    await syncConsumoUnitCost();
});
watch(() => materialItems.value.map((item) => `${item.bodega_id}|${item.producto_id}`).join(';'), () => {
    materialItems.value.forEach((_, index) => resetMaterialProductIfInvalid(index));
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['v-field']} */ ;
/** @type {__VLS_StyleScopedClasses['ot-dialog-content']} */ ;
/** @type {__VLS_StyleScopedClasses['capture-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['work-orders-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['capture-cell']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    rounded: "xl",
    ...{ class: "pa-4 work-orders-shell enterprise-surface" },
}));
const __VLS_2 = __VLS_1({
    rounded: "xl",
    ...{ class: "pa-4 work-orders-shell enterprise-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
/** @type {__VLS_StyleScopedClasses['work-orders-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between mb-3" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-h6 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-2 text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
if (__VLS_ctx.canCreate) {
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        ...{ 'onClick': {} },
        color: "primary",
        prependIcon: "mdi-plus",
    }));
    const __VLS_8 = __VLS_7({
        ...{ 'onClick': {} },
        color: "primary",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    let __VLS_11;
    const __VLS_12 = ({ click: {} },
        { onClick: (__VLS_ctx.openCreate) });
    const { default: __VLS_13 } = __VLS_9.slots;
    // @ts-ignore
    [canCreate, openCreate,];
    var __VLS_9;
    var __VLS_10;
}
let __VLS_14;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
    dense: true,
    ...{ class: "mb-2" },
}));
const __VLS_16 = __VLS_15({
    dense: true,
    ...{ class: "mb-2" },
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
const { default: __VLS_19 } = __VLS_17.slots;
let __VLS_20;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
    cols: "12",
    md: "4",
}));
const __VLS_22 = __VLS_21({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const { default: __VLS_25 } = __VLS_23.slots;
let __VLS_26;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
    modelValue: (__VLS_ctx.search),
    label: "Buscar",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    clearable: true,
}));
const __VLS_28 = __VLS_27({
    modelValue: (__VLS_ctx.search),
    label: "Buscar",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
// @ts-ignore
[search,];
var __VLS_23;
// @ts-ignore
[];
var __VLS_17;
if (__VLS_ctx.error) {
    let __VLS_31;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-2" },
    }));
    const __VLS_33 = __VLS_32({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    const { default: __VLS_36 } = __VLS_34.slots;
    (__VLS_ctx.error);
    // @ts-ignore
    [error, error,];
    var __VLS_34;
}
let __VLS_37;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
    headers: (__VLS_ctx.headers),
    items: (__VLS_ctx.rows),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo órdenes de trabajo...",
    itemsPerPage: (20),
    ...{ class: "elevation-0 table-enterprise enterprise-table" },
}));
const __VLS_39 = __VLS_38({
    headers: (__VLS_ctx.headers),
    items: (__VLS_ctx.rows),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo órdenes de trabajo...",
    itemsPerPage: (20),
    ...{ class: "elevation-0 table-enterprise enterprise-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
/** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
/** @type {__VLS_StyleScopedClasses['table-enterprise']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
const { default: __VLS_42 } = __VLS_40.slots;
{
    const { 'item.actions': __VLS_43 } = __VLS_40.slots;
    const [{ item }] = __VLS_vSlot(__VLS_43);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    if (__VLS_ctx.canEdit) {
        let __VLS_44;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
            ...{ 'onClick': {} },
            icon: "mdi-pencil",
            variant: "text",
        }));
        const __VLS_46 = __VLS_45({
            ...{ 'onClick': {} },
            icon: "mdi-pencil",
            variant: "text",
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        let __VLS_49;
        const __VLS_50 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canEdit))
                        return;
                    __VLS_ctx.openEdit(item._raw ?? item);
                    // @ts-ignore
                    [headers, rows, loading, canEdit, openEdit,];
                } });
        var __VLS_47;
        var __VLS_48;
    }
    if (__VLS_ctx.canDelete) {
        let __VLS_51;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
        }));
        const __VLS_53 = __VLS_52({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        let __VLS_56;
        const __VLS_57 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canDelete))
                        return;
                    __VLS_ctx.openDelete(item._raw ?? item);
                    // @ts-ignore
                    [canDelete, openDelete,];
                } });
        var __VLS_54;
        var __VLS_55;
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_40;
// @ts-ignore
[];
var __VLS_3;
let __VLS_58;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: true,
}));
const __VLS_60 = __VLS_59({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
const { default: __VLS_63 } = __VLS_61.slots;
let __VLS_64;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent1(__VLS_64, new __VLS_64({
    ...{ class: "work-order-dialog-card" },
}));
const __VLS_66 = __VLS_65({
    ...{ class: "work-order-dialog-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
/** @type {__VLS_StyleScopedClasses['work-order-dialog-card']} */ ;
const { default: __VLS_69 } = __VLS_67.slots;
let __VLS_70;
/** @ts-ignore @type {typeof __VLS_components.vToolbar | typeof __VLS_components.VToolbar | typeof __VLS_components.vToolbar | typeof __VLS_components.VToolbar} */
vToolbar;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
    color: "primary",
    ...{ class: "work-orders-toolbar" },
}));
const __VLS_72 = __VLS_71({
    color: "primary",
    ...{ class: "work-orders-toolbar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
/** @type {__VLS_StyleScopedClasses['work-orders-toolbar']} */ ;
const { default: __VLS_75 } = __VLS_73.slots;
let __VLS_76;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
    ...{ 'onClick': {} },
    icon: "mdi-close",
}));
const __VLS_78 = __VLS_77({
    ...{ 'onClick': {} },
    icon: "mdi-close",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_81;
const __VLS_82 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog, dialog,];
        } });
var __VLS_79;
var __VLS_80;
let __VLS_83;
/** @ts-ignore @type {typeof __VLS_components.vToolbarTitle | typeof __VLS_components.VToolbarTitle | typeof __VLS_components.vToolbarTitle | typeof __VLS_components.VToolbarTitle} */
vToolbarTitle;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({}));
const __VLS_85 = __VLS_84({}, ...__VLS_functionalComponentArgsRest(__VLS_84));
const { default: __VLS_88 } = __VLS_86.slots;
(__VLS_ctx.editingId ? `Editar OT ${__VLS_ctx.headerForm.code || __VLS_ctx.editingId}` : "Nueva orden de trabajo");
// @ts-ignore
[editingId, editingId, headerForm,];
var __VLS_86;
let __VLS_89;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({}));
const __VLS_91 = __VLS_90({}, ...__VLS_functionalComponentArgsRest(__VLS_90));
if (__VLS_ctx.editingId) {
    let __VLS_94;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({
        color: "accent",
        ...{ class: "mr-2 workflow-chip" },
        variant: "flat",
    }));
    const __VLS_96 = __VLS_95({
        color: "accent",
        ...{ class: "mr-2 workflow-chip" },
        variant: "flat",
    }, ...__VLS_functionalComponentArgsRest(__VLS_95));
    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['workflow-chip']} */ ;
    const { default: __VLS_99 } = __VLS_97.slots;
    (__VLS_ctx.currentWorkflowLabel);
    // @ts-ignore
    [editingId, currentWorkflowLabel,];
    var __VLS_97;
}
if (__VLS_ctx.editingId && __VLS_ctx.canAccessWorkOrderReports) {
    let __VLS_100;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('excel')),
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('excel')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_105;
    const __VLS_106 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!(__VLS_ctx.editingId && __VLS_ctx.canAccessWorkOrderReports))
                    return;
                __VLS_ctx.exportWorkOrder('excel');
                // @ts-ignore
                [editingId, canAccessWorkOrderReports, isExporting, exportWorkOrder,];
            } });
    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
    const { default: __VLS_107 } = __VLS_103.slots;
    // @ts-ignore
    [];
    var __VLS_103;
    var __VLS_104;
}
if (__VLS_ctx.editingId && __VLS_ctx.canAccessWorkOrderReports) {
    let __VLS_108;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('pdf')),
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('pdf')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_113;
    const __VLS_114 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!(__VLS_ctx.editingId && __VLS_ctx.canAccessWorkOrderReports))
                    return;
                __VLS_ctx.exportWorkOrder('pdf');
                // @ts-ignore
                [editingId, canAccessWorkOrderReports, isExporting, exportWorkOrder,];
            } });
    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
    const { default: __VLS_115 } = __VLS_111.slots;
    // @ts-ignore
    [];
    var __VLS_111;
    var __VLS_112;
}
if (__VLS_ctx.editingId && __VLS_ctx.isCreated && __VLS_ctx.canEdit) {
    let __VLS_116;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent1(__VLS_116, new __VLS_116({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-play-circle-outline",
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-play-circle-outline",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_121;
    const __VLS_122 = ({ click: {} },
        { onClick: (__VLS_ctx.startProcess) });
    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
    const { default: __VLS_123 } = __VLS_119.slots;
    // @ts-ignore
    [canEdit, editingId, isCreated, startProcess,];
    var __VLS_119;
    var __VLS_120;
}
if (__VLS_ctx.editingId && __VLS_ctx.isInProcess && __VLS_ctx.canEdit) {
    let __VLS_124;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-lock-check-outline",
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onClick': {} },
        variant: "tonal",
        ...{ class: "mr-2" },
        prependIcon: "mdi-lock-check-outline",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_129;
    const __VLS_130 = ({ click: {} },
        { onClick: (__VLS_ctx.prepareClose) });
    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
    const { default: __VLS_131 } = __VLS_127.slots;
    // @ts-ignore
    [canEdit, editingId, isInProcess, prepareClose,];
    var __VLS_127;
    var __VLS_128;
}
if (__VLS_ctx.canPersistHeader) {
    let __VLS_132;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent1(__VLS_132, new __VLS_132({
        ...{ 'onClick': {} },
        variant: "tonal",
        loading: (__VLS_ctx.savingHeader),
        disabled: (__VLS_ctx.savingHeader),
    }));
    const __VLS_134 = __VLS_133({
        ...{ 'onClick': {} },
        variant: "tonal",
        loading: (__VLS_ctx.savingHeader),
        disabled: (__VLS_ctx.savingHeader),
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    let __VLS_137;
    const __VLS_138 = ({ click: {} },
        { onClick: (__VLS_ctx.saveAll) });
    const { default: __VLS_139 } = __VLS_135.slots;
    // @ts-ignore
    [canPersistHeader, savingHeader, savingHeader, saveAll,];
    var __VLS_135;
    var __VLS_136;
}
// @ts-ignore
[];
var __VLS_73;
let __VLS_140;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
    ...{ class: "pt-4 ot-dialog-content" },
}));
const __VLS_142 = __VLS_141({
    ...{ class: "pt-4 ot-dialog-content" },
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['ot-dialog-content']} */ ;
const { default: __VLS_145 } = __VLS_143.slots;
if (__VLS_ctx.detailNoticeText) {
    let __VLS_146;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
        type: "warning",
        variant: "tonal",
        ...{ class: "mb-4" },
        text: (__VLS_ctx.detailNoticeText),
    }));
    const __VLS_148 = __VLS_147({
        type: "warning",
        variant: "tonal",
        ...{ class: "mb-4" },
        text: (__VLS_ctx.detailNoticeText),
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
}
if (__VLS_ctx.isBlocked) {
    let __VLS_151;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-4" },
        text: (__VLS_ctx.blockingAlertText),
    }));
    const __VLS_153 = __VLS_152({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-4" },
        text: (__VLS_ctx.blockingAlertText),
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
}
let __VLS_156;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent1(__VLS_156, new __VLS_156({
    variant: "flat",
    rounded: "lg",
    ...{ class: "pa-4 mb-4 section-card" },
}));
const __VLS_158 = __VLS_157({
    variant: "flat",
    rounded: "lg",
    ...{ class: "pa-4 mb-4 section-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
const { default: __VLS_161 } = __VLS_159.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_162;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
    dense: true,
}));
const __VLS_164 = __VLS_163({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
const { default: __VLS_167 } = __VLS_165.slots;
let __VLS_168;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
    cols: "12",
    md: "4",
}));
const __VLS_170 = __VLS_169({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
const { default: __VLS_173 } = __VLS_171.slots;
let __VLS_174;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent1(__VLS_174, new __VLS_174({
    modelValue: (__VLS_ctx.headerForm.code),
    label: "Code",
    variant: "outlined",
    readonly: true,
}));
const __VLS_176 = __VLS_175({
    modelValue: (__VLS_ctx.headerForm.code),
    label: "Code",
    variant: "outlined",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
// @ts-ignore
[headerForm, detailNoticeText, detailNoticeText, isBlocked, blockingAlertText,];
var __VLS_171;
let __VLS_179;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_180 = __VLS_asFunctionalComponent1(__VLS_179, new __VLS_179({
    cols: "12",
    md: "4",
}));
const __VLS_181 = __VLS_180({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_180));
const { default: __VLS_184 } = __VLS_182.slots;
let __VLS_185;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_186 = __VLS_asFunctionalComponent1(__VLS_185, new __VLS_185({
    modelValue: (__VLS_ctx.headerForm.equipment_id),
    items: (__VLS_ctx.equipmentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Equipo",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow || __VLS_ctx.isEditingLockedFields),
}));
const __VLS_187 = __VLS_186({
    modelValue: (__VLS_ctx.headerForm.equipment_id),
    items: (__VLS_ctx.equipmentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Equipo",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow || __VLS_ctx.isEditingLockedFields),
}, ...__VLS_functionalComponentArgsRest(__VLS_186));
// @ts-ignore
[headerForm, equipmentOptions, isReadOnlyWorkflow, isEditingLockedFields,];
var __VLS_182;
let __VLS_190;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_191 = __VLS_asFunctionalComponent1(__VLS_190, new __VLS_190({
    cols: "12",
    md: "4",
}));
const __VLS_192 = __VLS_191({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_191));
const { default: __VLS_195 } = __VLS_193.slots;
let __VLS_196;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent1(__VLS_196, new __VLS_196({
    modelValue: (__VLS_ctx.headerForm.equipo_componente_id),
    items: (__VLS_ctx.equipmentComponentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Compartimiento / parte",
    variant: "outlined",
    clearable: true,
    loading: (__VLS_ctx.loadingEquipmentComponents),
    disabled: (__VLS_ctx.isReadOnlyWorkflow || !__VLS_ctx.headerForm.equipment_id),
    hint: "Parte real u oficial del equipo vinculada a la OT.",
    persistentHint: true,
}));
const __VLS_198 = __VLS_197({
    modelValue: (__VLS_ctx.headerForm.equipo_componente_id),
    items: (__VLS_ctx.equipmentComponentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Compartimiento / parte",
    variant: "outlined",
    clearable: true,
    loading: (__VLS_ctx.loadingEquipmentComponents),
    disabled: (__VLS_ctx.isReadOnlyWorkflow || !__VLS_ctx.headerForm.equipment_id),
    hint: "Parte real u oficial del equipo vinculada a la OT.",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
// @ts-ignore
[headerForm, headerForm, isReadOnlyWorkflow, equipmentComponentOptions, loadingEquipmentComponents,];
var __VLS_193;
let __VLS_201;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent1(__VLS_201, new __VLS_201({
    cols: "12",
    md: "4",
}));
const __VLS_203 = __VLS_202({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
const { default: __VLS_206 } = __VLS_204.slots;
let __VLS_207;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_208 = __VLS_asFunctionalComponent1(__VLS_207, new __VLS_207({
    modelValue: (__VLS_ctx.headerForm.maintenance_kind),
    items: (__VLS_ctx.maintenanceKindOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Tipo mantenimiento",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}));
const __VLS_209 = __VLS_208({
    modelValue: (__VLS_ctx.headerForm.maintenance_kind),
    items: (__VLS_ctx.maintenanceKindOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Tipo mantenimiento",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}, ...__VLS_functionalComponentArgsRest(__VLS_208));
// @ts-ignore
[headerForm, isReadOnlyWorkflow, maintenanceKindOptions,];
var __VLS_204;
let __VLS_212;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent1(__VLS_212, new __VLS_212({
    cols: "12",
    md: "4",
}));
const __VLS_214 = __VLS_213({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
const { default: __VLS_217 } = __VLS_215.slots;
let __VLS_218;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_219 = __VLS_asFunctionalComponent1(__VLS_218, new __VLS_218({
    modelValue: (__VLS_ctx.headerForm.blocked_by_work_order_id),
    items: (__VLS_ctx.blockingWorkOrderOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "OT anexada / bloqueante",
    variant: "outlined",
    clearable: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
    hint: "Si esta OT depende de otra, se bloquea hasta que la anexada culmine.",
    persistentHint: true,
}));
const __VLS_220 = __VLS_219({
    modelValue: (__VLS_ctx.headerForm.blocked_by_work_order_id),
    items: (__VLS_ctx.blockingWorkOrderOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "OT anexada / bloqueante",
    variant: "outlined",
    clearable: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
    hint: "Si esta OT depende de otra, se bloquea hasta que la anexada culmine.",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_219));
// @ts-ignore
[headerForm, isReadOnlyWorkflow, blockingWorkOrderOptions,];
var __VLS_215;
let __VLS_223;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent1(__VLS_223, new __VLS_223({
    cols: "12",
    md: "4",
}));
const __VLS_225 = __VLS_224({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_224));
const { default: __VLS_228 } = __VLS_226.slots;
let __VLS_229;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent1(__VLS_229, new __VLS_229({
    modelValue: (__VLS_ctx.headerForm.blocked_reason),
    label: "Motivo de bloqueo",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}));
const __VLS_231 = __VLS_230({
    modelValue: (__VLS_ctx.headerForm.blocked_reason),
    label: "Motivo de bloqueo",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
// @ts-ignore
[headerForm, isReadOnlyWorkflow,];
var __VLS_226;
let __VLS_234;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent1(__VLS_234, new __VLS_234({
    cols: "12",
    md: "4",
}));
const __VLS_236 = __VLS_235({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
const { default: __VLS_239 } = __VLS_237.slots;
let __VLS_240;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent1(__VLS_240, new __VLS_240({
    modelValue: (__VLS_ctx.headerForm.status_workflow),
    items: (__VLS_ctx.workflowOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Estado workflow",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}));
const __VLS_242 = __VLS_241({
    modelValue: (__VLS_ctx.headerForm.status_workflow),
    items: (__VLS_ctx.workflowOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Estado workflow",
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
// @ts-ignore
[headerForm, isReadOnlyWorkflow, workflowOptions,];
var __VLS_237;
let __VLS_245;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent1(__VLS_245, new __VLS_245({
    cols: "12",
    md: "4",
}));
const __VLS_247 = __VLS_246({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
const { default: __VLS_250 } = __VLS_248.slots;
let __VLS_251;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent1(__VLS_251, new __VLS_251({
    modelValue: (__VLS_ctx.headerForm.procedimiento_id),
    items: (__VLS_ctx.procedureOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Plantilla MPG",
    clearable: true,
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow || __VLS_ctx.isEditingLockedFields),
    hint: "La plantilla define el checklist y requisitos de la OT.",
    persistentHint: true,
}));
const __VLS_253 = __VLS_252({
    modelValue: (__VLS_ctx.headerForm.procedimiento_id),
    items: (__VLS_ctx.procedureOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Plantilla MPG",
    clearable: true,
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow || __VLS_ctx.isEditingLockedFields),
    hint: "La plantilla define el checklist y requisitos de la OT.",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
// @ts-ignore
[headerForm, isReadOnlyWorkflow, isEditingLockedFields, procedureOptions,];
var __VLS_248;
let __VLS_256;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent1(__VLS_256, new __VLS_256({
    cols: "12",
    md: "4",
}));
const __VLS_258 = __VLS_257({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
const { default: __VLS_261 } = __VLS_259.slots;
let __VLS_262;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_263 = __VLS_asFunctionalComponent1(__VLS_262, new __VLS_262({
    modelValue: (__VLS_ctx.resolvedOperationalPlanLabel),
    label: "Plan operativo",
    variant: "outlined",
    readonly: true,
}));
const __VLS_264 = __VLS_263({
    modelValue: (__VLS_ctx.resolvedOperationalPlanLabel),
    label: "Plan operativo",
    variant: "outlined",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_263));
// @ts-ignore
[resolvedOperationalPlanLabel,];
var __VLS_259;
let __VLS_267;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
    cols: "12",
    md: "4",
}));
const __VLS_269 = __VLS_268({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
const { default: __VLS_272 } = __VLS_270.slots;
let __VLS_273;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent1(__VLS_273, new __VLS_273({
    modelValue: (__VLS_ctx.headerForm.alerta_id),
    items: (__VLS_ctx.alertOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Alerta",
    clearable: true,
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow || __VLS_ctx.isEditingLockedFields),
}));
const __VLS_275 = __VLS_274({
    modelValue: (__VLS_ctx.headerForm.alerta_id),
    items: (__VLS_ctx.alertOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Alerta",
    clearable: true,
    variant: "outlined",
    disabled: (__VLS_ctx.isReadOnlyWorkflow || __VLS_ctx.isEditingLockedFields),
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
// @ts-ignore
[headerForm, isReadOnlyWorkflow, isEditingLockedFields, alertOptions,];
var __VLS_270;
let __VLS_278;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_279 = __VLS_asFunctionalComponent1(__VLS_278, new __VLS_278({
    cols: "12",
    md: "4",
}));
const __VLS_280 = __VLS_279({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_279));
const { default: __VLS_283 } = __VLS_281.slots;
let __VLS_284;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_285 = __VLS_asFunctionalComponent1(__VLS_284, new __VLS_284({
    modelValue: (__VLS_ctx.headerForm.causa),
    label: "Causa",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}));
const __VLS_286 = __VLS_285({
    modelValue: (__VLS_ctx.headerForm.causa),
    label: "Causa",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}, ...__VLS_functionalComponentArgsRest(__VLS_285));
// @ts-ignore
[headerForm, isReadOnlyWorkflow,];
var __VLS_281;
let __VLS_289;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_290 = __VLS_asFunctionalComponent1(__VLS_289, new __VLS_289({
    cols: "12",
    md: "4",
}));
const __VLS_291 = __VLS_290({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_290));
const { default: __VLS_294 } = __VLS_292.slots;
let __VLS_295;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_296 = __VLS_asFunctionalComponent1(__VLS_295, new __VLS_295({
    modelValue: (__VLS_ctx.headerForm.accion),
    label: "Acción",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}));
const __VLS_297 = __VLS_296({
    modelValue: (__VLS_ctx.headerForm.accion),
    label: "Acción",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}, ...__VLS_functionalComponentArgsRest(__VLS_296));
// @ts-ignore
[headerForm, isReadOnlyWorkflow,];
var __VLS_292;
let __VLS_300;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_301 = __VLS_asFunctionalComponent1(__VLS_300, new __VLS_300({
    cols: "12",
    md: "4",
}));
const __VLS_302 = __VLS_301({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_301));
const { default: __VLS_305 } = __VLS_303.slots;
let __VLS_306;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_307 = __VLS_asFunctionalComponent1(__VLS_306, new __VLS_306({
    modelValue: (__VLS_ctx.headerForm.prevencion),
    label: "Prevención",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}));
const __VLS_308 = __VLS_307({
    modelValue: (__VLS_ctx.headerForm.prevencion),
    label: "Prevención",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}, ...__VLS_functionalComponentArgsRest(__VLS_307));
// @ts-ignore
[headerForm, isReadOnlyWorkflow,];
var __VLS_303;
// @ts-ignore
[];
var __VLS_165;
// @ts-ignore
[];
var __VLS_159;
let __VLS_311;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_312 = __VLS_asFunctionalComponent1(__VLS_311, new __VLS_311({
    ...{ class: "my-4" },
}));
const __VLS_313 = __VLS_312({
    ...{ class: "my-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_312));
/** @type {__VLS_StyleScopedClasses['my-4']} */ ;
let __VLS_316;
/** @ts-ignore @type {typeof __VLS_components.vTabs | typeof __VLS_components.VTabs | typeof __VLS_components.vTabs | typeof __VLS_components.VTabs} */
vTabs;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent1(__VLS_316, new __VLS_316({
    modelValue: (__VLS_ctx.tab),
    color: "primary",
}));
const __VLS_318 = __VLS_317({
    modelValue: (__VLS_ctx.tab),
    color: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_317));
const { default: __VLS_321 } = __VLS_319.slots;
let __VLS_322;
/** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
vTab;
// @ts-ignore
const __VLS_323 = __VLS_asFunctionalComponent1(__VLS_322, new __VLS_322({
    value: "tareas",
}));
const __VLS_324 = __VLS_323({
    value: "tareas",
}, ...__VLS_functionalComponentArgsRest(__VLS_323));
const { default: __VLS_327 } = __VLS_325.slots;
// @ts-ignore
[tab,];
var __VLS_325;
let __VLS_328;
/** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
vTab;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent1(__VLS_328, new __VLS_328({
    value: "adjuntos",
}));
const __VLS_330 = __VLS_329({
    value: "adjuntos",
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
const { default: __VLS_333 } = __VLS_331.slots;
// @ts-ignore
[];
var __VLS_331;
if (__VLS_ctx.showConsumosTab) {
    let __VLS_334;
    /** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
    vTab;
    // @ts-ignore
    const __VLS_335 = __VLS_asFunctionalComponent1(__VLS_334, new __VLS_334({
        value: "consumos",
    }));
    const __VLS_336 = __VLS_335({
        value: "consumos",
    }, ...__VLS_functionalComponentArgsRest(__VLS_335));
    const { default: __VLS_339 } = __VLS_337.slots;
    // @ts-ignore
    [showConsumosTab,];
    var __VLS_337;
}
if (__VLS_ctx.showMaterialsTab) {
    let __VLS_340;
    /** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
    vTab;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent1(__VLS_340, new __VLS_340({
        value: "materiales",
    }));
    const __VLS_342 = __VLS_341({
        value: "materiales",
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    const { default: __VLS_345 } = __VLS_343.slots;
    // @ts-ignore
    [showMaterialsTab,];
    var __VLS_343;
}
if (__VLS_ctx.editingId) {
    let __VLS_346;
    /** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
    vTab;
    // @ts-ignore
    const __VLS_347 = __VLS_asFunctionalComponent1(__VLS_346, new __VLS_346({
        value: "history",
    }));
    const __VLS_348 = __VLS_347({
        value: "history",
    }, ...__VLS_functionalComponentArgsRest(__VLS_347));
    const { default: __VLS_351 } = __VLS_349.slots;
    // @ts-ignore
    [editingId,];
    var __VLS_349;
}
// @ts-ignore
[];
var __VLS_319;
let __VLS_352;
/** @ts-ignore @type {typeof __VLS_components.vWindow | typeof __VLS_components.VWindow | typeof __VLS_components.vWindow | typeof __VLS_components.VWindow} */
vWindow;
// @ts-ignore
const __VLS_353 = __VLS_asFunctionalComponent1(__VLS_352, new __VLS_352({
    modelValue: (__VLS_ctx.tab),
    ...{ class: "mt-4" },
}));
const __VLS_354 = __VLS_353({
    modelValue: (__VLS_ctx.tab),
    ...{ class: "mt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_353));
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
const { default: __VLS_357 } = __VLS_355.slots;
let __VLS_358;
/** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
vWindowItem;
// @ts-ignore
const __VLS_359 = __VLS_asFunctionalComponent1(__VLS_358, new __VLS_358({
    value: "tareas",
}));
const __VLS_360 = __VLS_359({
    value: "tareas",
}, ...__VLS_functionalComponentArgsRest(__VLS_359));
const { default: __VLS_363 } = __VLS_361.slots;
let __VLS_364;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_365 = __VLS_asFunctionalComponent1(__VLS_364, new __VLS_364({
    dense: true,
    ...{ class: "pt-2" },
}));
const __VLS_366 = __VLS_365({
    dense: true,
    ...{ class: "pt-2" },
}, ...__VLS_functionalComponentArgsRest(__VLS_365));
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
const { default: __VLS_369 } = __VLS_367.slots;
let __VLS_370;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_371 = __VLS_asFunctionalComponent1(__VLS_370, new __VLS_370({
    cols: "12",
    md: "4",
}));
const __VLS_372 = __VLS_371({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_371));
const { default: __VLS_375 } = __VLS_373.slots;
let __VLS_376;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_377 = __VLS_asFunctionalComponent1(__VLS_376, new __VLS_376({
    modelValue: (__VLS_ctx.selectedProcedureLabel),
    label: "Plantilla MPG",
    variant: "outlined",
    readonly: true,
}));
const __VLS_378 = __VLS_377({
    modelValue: (__VLS_ctx.selectedProcedureLabel),
    label: "Plantilla MPG",
    variant: "outlined",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_377));
// @ts-ignore
[tab, selectedProcedureLabel,];
var __VLS_373;
let __VLS_381;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_382 = __VLS_asFunctionalComponent1(__VLS_381, new __VLS_381({
    cols: "12",
    md: "4",
}));
const __VLS_383 = __VLS_382({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_382));
const { default: __VLS_386 } = __VLS_384.slots;
let __VLS_387;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_388 = __VLS_asFunctionalComponent1(__VLS_387, new __VLS_387({
    modelValue: (__VLS_ctx.resolvedOperationalPlanLabel),
    label: "Plan operativo",
    variant: "outlined",
    readonly: true,
}));
const __VLS_389 = __VLS_388({
    modelValue: (__VLS_ctx.resolvedOperationalPlanLabel),
    label: "Plan operativo",
    variant: "outlined",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_388));
// @ts-ignore
[resolvedOperationalPlanLabel,];
var __VLS_384;
let __VLS_392;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_393 = __VLS_asFunctionalComponent1(__VLS_392, new __VLS_392({
    cols: "12",
    md: "4",
    ...{ class: "d-flex align-center justify-end" },
}));
const __VLS_394 = __VLS_393({
    cols: "12",
    md: "4",
    ...{ class: "d-flex align-center justify-end" },
}, ...__VLS_functionalComponentArgsRest(__VLS_393));
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
const { default: __VLS_397 } = __VLS_395.slots;
let __VLS_398;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_399 = __VLS_asFunctionalComponent1(__VLS_398, new __VLS_398({
    ...{ 'onClick': {} },
    color: "primary",
    variant: "tonal",
    prependIcon: "mdi-sync",
    disabled: (!__VLS_ctx.headerForm.plan_id || __VLS_ctx.isReadOnlyWorkflow),
    loading: (__VLS_ctx.loadingTaskOptions),
}));
const __VLS_400 = __VLS_399({
    ...{ 'onClick': {} },
    color: "primary",
    variant: "tonal",
    prependIcon: "mdi-sync",
    disabled: (!__VLS_ctx.headerForm.plan_id || __VLS_ctx.isReadOnlyWorkflow),
    loading: (__VLS_ctx.loadingTaskOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_399));
let __VLS_403;
const __VLS_404 = ({ click: {} },
    { onClick: (__VLS_ctx.syncChecklistFromTemplate) });
const { default: __VLS_405 } = __VLS_401.slots;
// @ts-ignore
[headerForm, isReadOnlyWorkflow, loadingTaskOptions, syncChecklistFromTemplate,];
var __VLS_401;
var __VLS_402;
// @ts-ignore
[];
var __VLS_395;
// @ts-ignore
[];
var __VLS_367;
let __VLS_406;
/** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
vAlert;
// @ts-ignore
const __VLS_407 = __VLS_asFunctionalComponent1(__VLS_406, new __VLS_406({
    type: "info",
    variant: "tonal",
    ...{ class: "mb-3" },
    text: "Las tareas se cargan automaticamente desde la plantilla MPG seleccionada y muestran sus requisitos operativos.",
}));
const __VLS_408 = __VLS_407({
    type: "info",
    variant: "tonal",
    ...{ class: "mb-3" },
    text: "Las tareas se cargan automaticamente desde la plantilla MPG seleccionada y muestran sus requisitos operativos.",
}, ...__VLS_functionalComponentArgsRest(__VLS_407));
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_411;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_412 = __VLS_asFunctionalComponent1(__VLS_411, new __VLS_411({
    headers: (__VLS_ctx.taskHeaders),
    items: (__VLS_ctx.taskRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo tareas de la orden...",
    ...{ class: "elevation-0 enterprise-table" },
}));
const __VLS_413 = __VLS_412({
    headers: (__VLS_ctx.taskHeaders),
    items: (__VLS_ctx.taskRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo tareas de la orden...",
    ...{ class: "elevation-0 enterprise-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_412));
/** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
const { default: __VLS_416 } = __VLS_414.slots;
{
    const { 'item.plan_id': __VLS_417 } = __VLS_414.slots;
    const [{ item }] = __VLS_vSlot(__VLS_417);
    (__VLS_ctx.getPlanLabelForTask(item._raw ?? item));
    // @ts-ignore
    [taskHeaders, taskRows, loadingDetails, getPlanLabelForTask,];
}
{
    const { 'item.tarea_id': __VLS_418 } = __VLS_414.slots;
    const [{ item }] = __VLS_vSlot(__VLS_418);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.getTaskLabelForTask(item._raw ?? item));
    if (__VLS_ctx.getTaskRequirementChips(item._raw ?? item).length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex flex-wrap mt-1" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        for (const [chip] of __VLS_vFor((__VLS_ctx.getTaskRequirementChips(item._raw ?? item)))) {
            let __VLS_419;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_420 = __VLS_asFunctionalComponent1(__VLS_419, new __VLS_419({
                key: (`${(item._raw ?? item).id}-${chip}`),
                size: "x-small",
                variant: "tonal",
                color: "secondary",
            }));
            const __VLS_421 = __VLS_420({
                key: (`${(item._raw ?? item).id}-${chip}`),
                size: "x-small",
                variant: "tonal",
                color: "secondary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_420));
            const { default: __VLS_424 } = __VLS_422.slots;
            (chip);
            // @ts-ignore
            [getTaskLabelForTask, getTaskRequirementChips, getTaskRequirementChips,];
            var __VLS_422;
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.getTaskDetailText(item._raw ?? item)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        (__VLS_ctx.getTaskDetailText(item._raw ?? item));
    }
    // @ts-ignore
    [getTaskDetailText, getTaskDetailText,];
}
{
    const { 'item.captura': __VLS_425 } = __VLS_414.slots;
    const [{ item }] = __VLS_vSlot(__VLS_425);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "capture-cell" },
    });
    /** @type {__VLS_StyleScopedClasses['capture-cell']} */ ;
    if (__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN') {
        let __VLS_426;
        /** @ts-ignore @type {typeof __VLS_components.vSwitch | typeof __VLS_components.VSwitch} */
        vSwitch;
        // @ts-ignore
        const __VLS_427 = __VLS_asFunctionalComponent1(__VLS_426, new __VLS_426({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean((item._raw ?? item).valor_boolean)),
            color: "primary",
            hideDetails: true,
            inset: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }));
        const __VLS_428 = __VLS_427({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean((item._raw ?? item).valor_boolean)),
            color: "primary",
            hideDetails: true,
            inset: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }, ...__VLS_functionalComponentArgsRest(__VLS_427));
        let __VLS_431;
        const __VLS_432 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN'))
                        return;
                    __VLS_ctx.setTaskBooleanValue(item._raw ?? item, $event);
                    // @ts-ignore
                    [isReadOnlyWorkflow, getTaskFieldType, setTaskBooleanValue,];
                } });
        var __VLS_429;
        var __VLS_430;
    }
    else if (__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'NUMBER') {
        let __VLS_433;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_434 = __VLS_asFunctionalComponent1(__VLS_433, new __VLS_433({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: ((item._raw ?? item).valor_numeric ?? ''),
            label: "Valor",
            type: "number",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }));
        const __VLS_435 = __VLS_434({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: ((item._raw ?? item).valor_numeric ?? ''),
            label: "Valor",
            type: "number",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }, ...__VLS_functionalComponentArgsRest(__VLS_434));
        let __VLS_438;
        const __VLS_439 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN'))
                        return;
                    if (!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'NUMBER'))
                        return;
                    __VLS_ctx.setTaskNumericValue(item._raw ?? item, $event);
                    // @ts-ignore
                    [isReadOnlyWorkflow, getTaskFieldType, setTaskNumericValue,];
                } });
        var __VLS_436;
        var __VLS_437;
    }
    else if (__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'TEXT') {
        let __VLS_440;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_441 = __VLS_asFunctionalComponent1(__VLS_440, new __VLS_440({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: ((item._raw ?? item).valor_text ?? ''),
            label: "Valor",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }));
        const __VLS_442 = __VLS_441({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: ((item._raw ?? item).valor_text ?? ''),
            label: "Valor",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }, ...__VLS_functionalComponentArgsRest(__VLS_441));
        let __VLS_445;
        const __VLS_446 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN'))
                        return;
                    if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'NUMBER'))
                        return;
                    if (!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'TEXT'))
                        return;
                    __VLS_ctx.setTaskTextValue(item._raw ?? item, $event);
                    // @ts-ignore
                    [isReadOnlyWorkflow, getTaskFieldType, setTaskTextValue,];
                } });
        var __VLS_443;
        var __VLS_444;
    }
    else if (__VLS_ctx.isTaskEvidenceField(item._raw ?? item)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "task-evidence-stack" },
        });
        /** @type {__VLS_StyleScopedClasses['task-evidence-stack']} */ ;
        for (const [requirement] of __VLS_vFor((__VLS_ctx.getTaskEvidenceRequirements(item._raw ?? item)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (`${(item._raw ?? item).id}-${requirement}`),
                ...{ class: "task-evidence-group" },
            });
            /** @type {__VLS_StyleScopedClasses['task-evidence-group']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption font-weight-medium mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (__VLS_ctx.getTaskEvidenceRequirementLabel(requirement));
            let __VLS_447;
            /** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
            vFileInput;
            // @ts-ignore
            const __VLS_448 = __VLS_asFunctionalComponent1(__VLS_447, new __VLS_447({
                ...{ 'onUpdate:modelValue': {} },
                key: (__VLS_ctx.getTaskEvidenceInputKey(item._raw ?? item, requirement)),
                label: (`Subir ${__VLS_ctx.getTaskEvidenceRequirementLabel(requirement).toLowerCase()}`),
                density: "compact",
                variant: "outlined",
                hideDetails: true,
                multiple: true,
                prependIcon: "mdi-paperclip",
                accept: (__VLS_ctx.getTaskEvidenceAccept(requirement)),
                disabled: (__VLS_ctx.isReadOnlyWorkflow),
            }));
            const __VLS_449 = __VLS_448({
                ...{ 'onUpdate:modelValue': {} },
                key: (__VLS_ctx.getTaskEvidenceInputKey(item._raw ?? item, requirement)),
                label: (`Subir ${__VLS_ctx.getTaskEvidenceRequirementLabel(requirement).toLowerCase()}`),
                density: "compact",
                variant: "outlined",
                hideDetails: true,
                multiple: true,
                prependIcon: "mdi-paperclip",
                accept: (__VLS_ctx.getTaskEvidenceAccept(requirement)),
                disabled: (__VLS_ctx.isReadOnlyWorkflow),
            }, ...__VLS_functionalComponentArgsRest(__VLS_448));
            let __VLS_452;
            const __VLS_453 = ({ 'update:modelValue': {} },
                { 'onUpdate:modelValue': (...[$event]) => {
                        if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN'))
                            return;
                        if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'NUMBER'))
                            return;
                        if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'TEXT'))
                            return;
                        if (!(__VLS_ctx.isTaskEvidenceField(item._raw ?? item)))
                            return;
                        __VLS_ctx.handleTaskEvidenceFiles(item._raw ?? item, requirement, $event);
                        // @ts-ignore
                        [isReadOnlyWorkflow, isTaskEvidenceField, getTaskEvidenceRequirements, getTaskEvidenceRequirementLabel, getTaskEvidenceRequirementLabel, getTaskEvidenceInputKey, getTaskEvidenceAccept, handleTaskEvidenceFiles,];
                    } });
            var __VLS_450;
            var __VLS_451;
            if (__VLS_ctx.getTaskEvidenceEntries(item._raw ?? item, requirement).length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "d-flex flex-wrap mt-2" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                for (const [attachment] of __VLS_vFor((__VLS_ctx.getTaskEvidenceEntries(item._raw ?? item, requirement)))) {
                    let __VLS_454;
                    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
                    vChip;
                    // @ts-ignore
                    const __VLS_455 = __VLS_asFunctionalComponent1(__VLS_454, new __VLS_454({
                        ...{ 'onClick': {} },
                        ...{ 'onClick:close': {} },
                        key: (__VLS_ctx.getTaskEvidenceEntryKey(attachment)),
                        size: "small",
                        color: "secondary",
                        variant: "tonal",
                        closable: true,
                    }));
                    const __VLS_456 = __VLS_455({
                        ...{ 'onClick': {} },
                        ...{ 'onClick:close': {} },
                        key: (__VLS_ctx.getTaskEvidenceEntryKey(attachment)),
                        size: "small",
                        color: "secondary",
                        variant: "tonal",
                        closable: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_455));
                    let __VLS_459;
                    const __VLS_460 = ({ click: {} },
                        { onClick: (...[$event]) => {
                                if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN'))
                                    return;
                                if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'NUMBER'))
                                    return;
                                if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'TEXT'))
                                    return;
                                if (!(__VLS_ctx.isTaskEvidenceField(item._raw ?? item)))
                                    return;
                                if (!(__VLS_ctx.getTaskEvidenceEntries(item._raw ?? item, requirement).length))
                                    return;
                                __VLS_ctx.openTaskEvidenceAttachment(attachment);
                                // @ts-ignore
                                [getTaskEvidenceEntries, getTaskEvidenceEntries, getTaskEvidenceEntryKey, openTaskEvidenceAttachment,];
                            } });
                    const __VLS_461 = ({ 'click:close': {} },
                        { 'onClick:close': (...[$event]) => {
                                if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN'))
                                    return;
                                if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'NUMBER'))
                                    return;
                                if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'TEXT'))
                                    return;
                                if (!(__VLS_ctx.isTaskEvidenceField(item._raw ?? item)))
                                    return;
                                if (!(__VLS_ctx.getTaskEvidenceEntries(item._raw ?? item, requirement).length))
                                    return;
                                __VLS_ctx.removeTaskEvidenceAttachment(item._raw ?? item, attachment);
                                // @ts-ignore
                                [removeTaskEvidenceAttachment,];
                            } });
                    const { default: __VLS_462 } = __VLS_457.slots;
                    (attachment.nombre || attachment.name || attachment.attachment_id || "Adjunto");
                    // @ts-ignore
                    [];
                    var __VLS_457;
                    var __VLS_458;
                    // @ts-ignore
                    [];
                }
            }
            // @ts-ignore
            [];
        }
    }
    else {
        let __VLS_463;
        /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
        vTextarea;
        // @ts-ignore
        const __VLS_464 = __VLS_asFunctionalComponent1(__VLS_463, new __VLS_463({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.getTaskJsonText(item._raw ?? item)),
            label: "JSON / evidencia",
            rows: "2",
            autoGrow: true,
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }));
        const __VLS_465 = __VLS_464({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.getTaskJsonText(item._raw ?? item)),
            label: "JSON / evidencia",
            rows: "2",
            autoGrow: true,
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            disabled: (__VLS_ctx.isReadOnlyWorkflow),
        }, ...__VLS_functionalComponentArgsRest(__VLS_464));
        let __VLS_468;
        const __VLS_469 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'BOOLEAN'))
                        return;
                    if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'NUMBER'))
                        return;
                    if (!!(__VLS_ctx.getTaskFieldType(item._raw ?? item) === 'TEXT'))
                        return;
                    if (!!(__VLS_ctx.isTaskEvidenceField(item._raw ?? item)))
                        return;
                    __VLS_ctx.setTaskJsonValue(item._raw ?? item, $event);
                    // @ts-ignore
                    [isReadOnlyWorkflow, getTaskJsonText, setTaskJsonValue,];
                } });
        var __VLS_466;
        var __VLS_467;
    }
    if (__VLS_ctx.isTaskRequired(item._raw ?? item)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    }
    // @ts-ignore
    [isTaskRequired,];
}
{
    const { 'item.observacion': __VLS_470 } = __VLS_414.slots;
    const [{ item }] = __VLS_vSlot(__VLS_470);
    let __VLS_471;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_472 = __VLS_asFunctionalComponent1(__VLS_471, new __VLS_471({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: ((item._raw ?? item).observacion ?? ''),
        label: "Observacion",
        density: "compact",
        variant: "outlined",
        hideDetails: true,
        disabled: (__VLS_ctx.isReadOnlyWorkflow),
    }));
    const __VLS_473 = __VLS_472({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: ((item._raw ?? item).observacion ?? ''),
        label: "Observacion",
        density: "compact",
        variant: "outlined",
        hideDetails: true,
        disabled: (__VLS_ctx.isReadOnlyWorkflow),
    }, ...__VLS_functionalComponentArgsRest(__VLS_472));
    let __VLS_476;
    const __VLS_477 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                __VLS_ctx.setTaskObservation(item._raw ?? item, $event);
                // @ts-ignore
                [isReadOnlyWorkflow, setTaskObservation,];
            } });
    var __VLS_474;
    var __VLS_475;
    // @ts-ignore
    [];
}
{
    const { 'item.actions': __VLS_478 } = __VLS_414.slots;
    const [{ item }] = __VLS_vSlot(__VLS_478);
    let __VLS_479;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_480 = __VLS_asFunctionalComponent1(__VLS_479, new __VLS_479({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }));
    const __VLS_481 = __VLS_480({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }, ...__VLS_functionalComponentArgsRest(__VLS_480));
    let __VLS_484;
    const __VLS_485 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.deleteTask(item._raw ?? item);
                // @ts-ignore
                [deleteTask,];
            } });
    var __VLS_482;
    var __VLS_483;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_414;
// @ts-ignore
[];
var __VLS_361;
let __VLS_486;
/** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
vWindowItem;
// @ts-ignore
const __VLS_487 = __VLS_asFunctionalComponent1(__VLS_486, new __VLS_486({
    value: "adjuntos",
}));
const __VLS_488 = __VLS_487({
    value: "adjuntos",
}, ...__VLS_functionalComponentArgsRest(__VLS_487));
const { default: __VLS_491 } = __VLS_489.slots;
let __VLS_492;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_493 = __VLS_asFunctionalComponent1(__VLS_492, new __VLS_492({
    dense: true,
    ...{ class: "pt-2" },
}));
const __VLS_494 = __VLS_493({
    dense: true,
    ...{ class: "pt-2" },
}, ...__VLS_functionalComponentArgsRest(__VLS_493));
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
const { default: __VLS_497 } = __VLS_495.slots;
let __VLS_498;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_499 = __VLS_asFunctionalComponent1(__VLS_498, new __VLS_498({
    cols: "12",
    md: "3",
}));
const __VLS_500 = __VLS_499({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_499));
const { default: __VLS_503 } = __VLS_501.slots;
let __VLS_504;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_505 = __VLS_asFunctionalComponent1(__VLS_504, new __VLS_504({
    modelValue: (__VLS_ctx.attachmentForm.tipo),
    label: "Tipo",
    variant: "outlined",
}));
const __VLS_506 = __VLS_505({
    modelValue: (__VLS_ctx.attachmentForm.tipo),
    label: "Tipo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_505));
// @ts-ignore
[attachmentForm,];
var __VLS_501;
let __VLS_509;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_510 = __VLS_asFunctionalComponent1(__VLS_509, new __VLS_509({
    cols: "12",
    md: "3",
}));
const __VLS_511 = __VLS_510({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_510));
const { default: __VLS_514 } = __VLS_512.slots;
let __VLS_515;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_516 = __VLS_asFunctionalComponent1(__VLS_515, new __VLS_515({
    modelValue: (__VLS_ctx.attachmentForm.nombre),
    label: "Nombre",
    variant: "outlined",
}));
const __VLS_517 = __VLS_516({
    modelValue: (__VLS_ctx.attachmentForm.nombre),
    label: "Nombre",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_516));
// @ts-ignore
[attachmentForm,];
var __VLS_512;
let __VLS_520;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_521 = __VLS_asFunctionalComponent1(__VLS_520, new __VLS_520({
    cols: "12",
    md: "3",
}));
const __VLS_522 = __VLS_521({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_521));
const { default: __VLS_525 } = __VLS_523.slots;
let __VLS_526;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_527 = __VLS_asFunctionalComponent1(__VLS_526, new __VLS_526({
    modelValue: (__VLS_ctx.attachmentForm.mime_type),
    label: "Mime type",
    variant: "outlined",
}));
const __VLS_528 = __VLS_527({
    modelValue: (__VLS_ctx.attachmentForm.mime_type),
    label: "Mime type",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_527));
// @ts-ignore
[attachmentForm,];
var __VLS_523;
let __VLS_531;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_532 = __VLS_asFunctionalComponent1(__VLS_531, new __VLS_531({
    cols: "12",
    md: "3",
}));
const __VLS_533 = __VLS_532({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_532));
const { default: __VLS_536 } = __VLS_534.slots;
let __VLS_537;
/** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
vFileInput;
// @ts-ignore
const __VLS_538 = __VLS_asFunctionalComponent1(__VLS_537, new __VLS_537({
    ...{ 'onUpdate:modelValue': {} },
    label: "Archivo",
    variant: "outlined",
    prependIcon: "mdi-paperclip",
    showSize: true,
}));
const __VLS_539 = __VLS_538({
    ...{ 'onUpdate:modelValue': {} },
    label: "Archivo",
    variant: "outlined",
    prependIcon: "mdi-paperclip",
    showSize: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_538));
let __VLS_542;
const __VLS_543 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.handleAttachmentFileChange) });
var __VLS_540;
var __VLS_541;
if (__VLS_ctx.attachmentForm.nombre) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    if (__VLS_ctx.editingId && __VLS_ctx.attachmentPreviewUrl) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (__VLS_ctx.attachmentPreviewUrl),
            target: "_blank",
            rel: "noopener noreferrer",
        });
        (__VLS_ctx.attachmentForm.nombre);
    }
    else {
        (__VLS_ctx.attachmentForm.nombre);
    }
}
// @ts-ignore
[editingId, attachmentForm, attachmentForm, attachmentForm, handleAttachmentFileChange, attachmentPreviewUrl, attachmentPreviewUrl,];
var __VLS_534;
// @ts-ignore
[];
var __VLS_495;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex justify-end mb-3" },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_544;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_545 = __VLS_asFunctionalComponent1(__VLS_544, new __VLS_544({
    ...{ 'onClick': {} },
    color: "primary",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}));
const __VLS_546 = __VLS_545({
    ...{ 'onClick': {} },
    color: "primary",
    disabled: (__VLS_ctx.isReadOnlyWorkflow),
}, ...__VLS_functionalComponentArgsRest(__VLS_545));
let __VLS_549;
const __VLS_550 = ({ click: {} },
    { onClick: (__VLS_ctx.createAttachment) });
const { default: __VLS_551 } = __VLS_547.slots;
// @ts-ignore
[isReadOnlyWorkflow, createAttachment,];
var __VLS_547;
var __VLS_548;
let __VLS_552;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_553 = __VLS_asFunctionalComponent1(__VLS_552, new __VLS_552({
    headers: (__VLS_ctx.attachmentHeaders),
    items: (__VLS_ctx.attachmentRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo adjuntos de la orden...",
    ...{ class: "elevation-0 enterprise-table" },
}));
const __VLS_554 = __VLS_553({
    headers: (__VLS_ctx.attachmentHeaders),
    items: (__VLS_ctx.attachmentRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo adjuntos de la orden...",
    ...{ class: "elevation-0 enterprise-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_553));
/** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
const { default: __VLS_557 } = __VLS_555.slots;
{
    const { 'item.origen': __VLS_558 } = __VLS_555.slots;
    const [{ item }] = __VLS_vSlot(__VLS_558);
    (__VLS_ctx.getAttachmentOriginLabel(item._raw ?? item));
    // @ts-ignore
    [loadingDetails, attachmentHeaders, attachmentRows, getAttachmentOriginLabel,];
}
{
    const { 'item.nombre': __VLS_559 } = __VLS_555.slots;
    const [{ item }] = __VLS_vSlot(__VLS_559);
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openAttachment(item._raw ?? item);
                // @ts-ignore
                [openAttachment,];
            } },
        href: "#",
    });
    ((item._raw ?? item).nombre);
    // @ts-ignore
    [];
}
{
    const { 'item.actions': __VLS_560 } = __VLS_555.slots;
    const [{ item }] = __VLS_vSlot(__VLS_560);
    let __VLS_561;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_562 = __VLS_asFunctionalComponent1(__VLS_561, new __VLS_561({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }));
    const __VLS_563 = __VLS_562({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }, ...__VLS_functionalComponentArgsRest(__VLS_562));
    let __VLS_566;
    const __VLS_567 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.deleteAttachment(item._raw ?? item);
                // @ts-ignore
                [deleteAttachment,];
            } });
    var __VLS_564;
    var __VLS_565;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_555;
// @ts-ignore
[];
var __VLS_489;
let __VLS_568;
/** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
vWindowItem;
// @ts-ignore
const __VLS_569 = __VLS_asFunctionalComponent1(__VLS_568, new __VLS_568({
    value: "consumos",
}));
const __VLS_570 = __VLS_569({
    value: "consumos",
}, ...__VLS_functionalComponentArgsRest(__VLS_569));
const { default: __VLS_573 } = __VLS_571.slots;
if (!__VLS_ctx.isReadOnlyWorkflow) {
    let __VLS_574;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_575 = __VLS_asFunctionalComponent1(__VLS_574, new __VLS_574({
        dense: true,
        ...{ class: "pt-2" },
    }));
    const __VLS_576 = __VLS_575({
        dense: true,
        ...{ class: "pt-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_575));
    /** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
    const { default: __VLS_579 } = __VLS_577.slots;
    let __VLS_580;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_581 = __VLS_asFunctionalComponent1(__VLS_580, new __VLS_580({
        cols: "12",
        md: "4",
    }));
    const __VLS_582 = __VLS_581({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_581));
    const { default: __VLS_585 } = __VLS_583.slots;
    let __VLS_586;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_587 = __VLS_asFunctionalComponent1(__VLS_586, new __VLS_586({
        modelValue: (__VLS_ctx.consumoForm.bodega_id),
        items: (__VLS_ctx.warehouseOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Bodega",
        clearable: true,
        variant: "outlined",
    }));
    const __VLS_588 = __VLS_587({
        modelValue: (__VLS_ctx.consumoForm.bodega_id),
        items: (__VLS_ctx.warehouseOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Bodega",
        clearable: true,
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_587));
    // @ts-ignore
    [isReadOnlyWorkflow, consumoForm, warehouseOptions,];
    var __VLS_583;
    let __VLS_591;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_592 = __VLS_asFunctionalComponent1(__VLS_591, new __VLS_591({
        cols: "12",
        md: "4",
    }));
    const __VLS_593 = __VLS_592({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_592));
    const { default: __VLS_596 } = __VLS_594.slots;
    let __VLS_597;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_598 = __VLS_asFunctionalComponent1(__VLS_597, new __VLS_597({
        modelValue: (__VLS_ctx.consumoForm.producto_id),
        items: (__VLS_ctx.getWarehouseProductOptions(__VLS_ctx.consumoForm.bodega_id)),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        disabled: (!__VLS_ctx.consumoForm.bodega_id),
        variant: "outlined",
    }));
    const __VLS_599 = __VLS_598({
        modelValue: (__VLS_ctx.consumoForm.producto_id),
        items: (__VLS_ctx.getWarehouseProductOptions(__VLS_ctx.consumoForm.bodega_id)),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        disabled: (!__VLS_ctx.consumoForm.bodega_id),
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_598));
    // @ts-ignore
    [consumoForm, consumoForm, consumoForm, getWarehouseProductOptions,];
    var __VLS_594;
    let __VLS_602;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_603 = __VLS_asFunctionalComponent1(__VLS_602, new __VLS_602({
        cols: "12",
        md: "2",
    }));
    const __VLS_604 = __VLS_603({
        cols: "12",
        md: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_603));
    const { default: __VLS_607 } = __VLS_605.slots;
    let __VLS_608;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_609 = __VLS_asFunctionalComponent1(__VLS_608, new __VLS_608({
        modelValue: (__VLS_ctx.consumoForm.cantidad),
        label: "Cantidad",
        type: "number",
        variant: "outlined",
    }));
    const __VLS_610 = __VLS_609({
        modelValue: (__VLS_ctx.consumoForm.cantidad),
        label: "Cantidad",
        type: "number",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_609));
    // @ts-ignore
    [consumoForm,];
    var __VLS_605;
    if (__VLS_ctx.canViewCosts) {
        let __VLS_613;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_614 = __VLS_asFunctionalComponent1(__VLS_613, new __VLS_613({
            cols: "12",
            md: "2",
        }));
        const __VLS_615 = __VLS_614({
            cols: "12",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_614));
        const { default: __VLS_618 } = __VLS_616.slots;
        let __VLS_619;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_620 = __VLS_asFunctionalComponent1(__VLS_619, new __VLS_619({
            modelValue: (__VLS_ctx.consumoForm.costo_unitario),
            label: "Costo unitario",
            type: "number",
            variant: "outlined",
            readonly: true,
        }));
        const __VLS_621 = __VLS_620({
            modelValue: (__VLS_ctx.consumoForm.costo_unitario),
            label: "Costo unitario",
            type: "number",
            variant: "outlined",
            readonly: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_620));
        // @ts-ignore
        [consumoForm, canViewCosts,];
        var __VLS_616;
    }
    let __VLS_624;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_625 = __VLS_asFunctionalComponent1(__VLS_624, new __VLS_624({
        cols: "12",
        md: "12",
    }));
    const __VLS_626 = __VLS_625({
        cols: "12",
        md: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_625));
    const { default: __VLS_629 } = __VLS_627.slots;
    let __VLS_630;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_631 = __VLS_asFunctionalComponent1(__VLS_630, new __VLS_630({
        modelValue: (__VLS_ctx.consumoForm.observacion),
        label: "Observación",
        variant: "outlined",
    }));
    const __VLS_632 = __VLS_631({
        modelValue: (__VLS_ctx.consumoForm.observacion),
        label: "Observación",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_631));
    // @ts-ignore
    [consumoForm,];
    var __VLS_627;
    // @ts-ignore
    [];
    var __VLS_577;
}
if (!__VLS_ctx.isReadOnlyWorkflow) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex justify-end mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_635;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_636 = __VLS_asFunctionalComponent1(__VLS_635, new __VLS_635({
        ...{ 'onClick': {} },
        color: "primary",
    }));
    const __VLS_637 = __VLS_636({
        ...{ 'onClick': {} },
        color: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_636));
    let __VLS_640;
    const __VLS_641 = ({ click: {} },
        { onClick: (__VLS_ctx.createConsumo) });
    const { default: __VLS_642 } = __VLS_638.slots;
    // @ts-ignore
    [isReadOnlyWorkflow, createConsumo,];
    var __VLS_638;
    var __VLS_639;
}
else {
    let __VLS_643;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_644 = __VLS_asFunctionalComponent1(__VLS_643, new __VLS_643({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "La OT está cerrada. Los consumos se muestran solo para visualización.",
    }));
    const __VLS_645 = __VLS_644({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "La OT está cerrada. Los consumos se muestran solo para visualización.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_644));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
}
let __VLS_648;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_649 = __VLS_asFunctionalComponent1(__VLS_648, new __VLS_648({
    headers: (__VLS_ctx.consumoHeaders),
    items: (__VLS_ctx.consumoRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo consumos de la orden...",
    density: "comfortable",
    ...{ class: "table-enterprise enterprise-table" },
    itemsPerPage: (5),
}));
const __VLS_650 = __VLS_649({
    headers: (__VLS_ctx.consumoHeaders),
    items: (__VLS_ctx.consumoRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo consumos de la orden...",
    density: "comfortable",
    ...{ class: "table-enterprise enterprise-table" },
    itemsPerPage: (5),
}, ...__VLS_functionalComponentArgsRest(__VLS_649));
/** @type {__VLS_StyleScopedClasses['table-enterprise']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
const { default: __VLS_653 } = __VLS_651.slots;
{
    const { bottom: __VLS_654 } = __VLS_651.slots;
    // @ts-ignore
    [loadingDetails, consumoHeaders, consumoRows,];
}
{
    const { 'item.costo_unitario': __VLS_655 } = __VLS_651.slots;
    const [{ item }] = __VLS_vSlot(__VLS_655);
    (Number((item.raw ?? item).costo_unitario || 0).toFixed(2));
    // @ts-ignore
    [];
}
{
    const { 'item.subtotal': __VLS_656 } = __VLS_651.slots;
    const [{ item }] = __VLS_vSlot(__VLS_656);
    (Number((item.raw ?? item).subtotal || 0).toFixed(2));
    // @ts-ignore
    [];
}
{
    const { 'no-data': __VLS_657 } = __VLS_651.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pa-4 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_651;
// @ts-ignore
[];
var __VLS_571;
let __VLS_658;
/** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
vWindowItem;
// @ts-ignore
const __VLS_659 = __VLS_asFunctionalComponent1(__VLS_658, new __VLS_658({
    value: "materiales",
}));
const __VLS_660 = __VLS_659({
    value: "materiales",
}, ...__VLS_functionalComponentArgsRest(__VLS_659));
const { default: __VLS_663 } = __VLS_661.slots;
if (!__VLS_ctx.isReadOnlyWorkflow) {
    let __VLS_664;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_665 = __VLS_asFunctionalComponent1(__VLS_664, new __VLS_664({
        dense: true,
        ...{ class: "pt-2" },
    }));
    const __VLS_666 = __VLS_665({
        dense: true,
        ...{ class: "pt-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_665));
    /** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
    const { default: __VLS_669 } = __VLS_667.slots;
    let __VLS_670;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_671 = __VLS_asFunctionalComponent1(__VLS_670, new __VLS_670({
        cols: "12",
    }));
    const __VLS_672 = __VLS_671({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_671));
    const { default: __VLS_675 } = __VLS_673.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-2" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    let __VLS_676;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_677 = __VLS_asFunctionalComponent1(__VLS_676, new __VLS_676({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_678 = __VLS_677({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_677));
    let __VLS_681;
    const __VLS_682 = ({ click: {} },
        { onClick: (__VLS_ctx.addMaterialItem) });
    const { default: __VLS_683 } = __VLS_679.slots;
    // @ts-ignore
    [isReadOnlyWorkflow, addMaterialItem,];
    var __VLS_679;
    var __VLS_680;
    for (const [item, index] of __VLS_vFor((__VLS_ctx.materialItems))) {
        let __VLS_684;
        /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
        vRow;
        // @ts-ignore
        const __VLS_685 = __VLS_asFunctionalComponent1(__VLS_684, new __VLS_684({
            key: (`material-${index}`),
            dense: true,
            ...{ class: "mb-1" },
        }));
        const __VLS_686 = __VLS_685({
            key: (`material-${index}`),
            dense: true,
            ...{ class: "mb-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_685));
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        const { default: __VLS_689 } = __VLS_687.slots;
        let __VLS_690;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_691 = __VLS_asFunctionalComponent1(__VLS_690, new __VLS_690({
            cols: "12",
            md: "5",
        }));
        const __VLS_692 = __VLS_691({
            cols: "12",
            md: "5",
        }, ...__VLS_functionalComponentArgsRest(__VLS_691));
        const { default: __VLS_695 } = __VLS_693.slots;
        let __VLS_696;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_697 = __VLS_asFunctionalComponent1(__VLS_696, new __VLS_696({
            modelValue: (item.bodega_id),
            items: (__VLS_ctx.warehouseOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Bodega",
            variant: "outlined",
        }));
        const __VLS_698 = __VLS_697({
            modelValue: (item.bodega_id),
            items: (__VLS_ctx.warehouseOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Bodega",
            variant: "outlined",
        }, ...__VLS_functionalComponentArgsRest(__VLS_697));
        // @ts-ignore
        [warehouseOptions, materialItems,];
        var __VLS_693;
        let __VLS_701;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_702 = __VLS_asFunctionalComponent1(__VLS_701, new __VLS_701({
            cols: "12",
            md: "5",
        }));
        const __VLS_703 = __VLS_702({
            cols: "12",
            md: "5",
        }, ...__VLS_functionalComponentArgsRest(__VLS_702));
        const { default: __VLS_706 } = __VLS_704.slots;
        let __VLS_707;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_708 = __VLS_asFunctionalComponent1(__VLS_707, new __VLS_707({
            modelValue: (item.producto_id),
            items: (__VLS_ctx.getWarehouseReservedProductOptions(item.bodega_id)),
            itemTitle: "title",
            itemValue: "value",
            label: "Material",
            disabled: (!item.bodega_id),
            variant: "outlined",
        }));
        const __VLS_709 = __VLS_708({
            modelValue: (item.producto_id),
            items: (__VLS_ctx.getWarehouseReservedProductOptions(item.bodega_id)),
            itemTitle: "title",
            itemValue: "value",
            label: "Material",
            disabled: (!item.bodega_id),
            variant: "outlined",
        }, ...__VLS_functionalComponentArgsRest(__VLS_708));
        // @ts-ignore
        [getWarehouseReservedProductOptions,];
        var __VLS_704;
        let __VLS_712;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_713 = __VLS_asFunctionalComponent1(__VLS_712, new __VLS_712({
            cols: "10",
            md: "1",
        }));
        const __VLS_714 = __VLS_713({
            cols: "10",
            md: "1",
        }, ...__VLS_functionalComponentArgsRest(__VLS_713));
        const { default: __VLS_717 } = __VLS_715.slots;
        let __VLS_718;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_719 = __VLS_asFunctionalComponent1(__VLS_718, new __VLS_718({
            modelValue: (item.cantidad),
            label: "Cant.",
            type: "number",
            min: "0",
            step: "any",
            variant: "outlined",
        }));
        const __VLS_720 = __VLS_719({
            modelValue: (item.cantidad),
            label: "Cant.",
            type: "number",
            min: "0",
            step: "any",
            variant: "outlined",
        }, ...__VLS_functionalComponentArgsRest(__VLS_719));
        // @ts-ignore
        [];
        var __VLS_715;
        let __VLS_723;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_724 = __VLS_asFunctionalComponent1(__VLS_723, new __VLS_723({
            cols: "2",
            md: "1",
            ...{ class: "d-flex align-center justify-end" },
        }));
        const __VLS_725 = __VLS_724({
            cols: "2",
            md: "1",
            ...{ class: "d-flex align-center justify-end" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_724));
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
        const { default: __VLS_728 } = __VLS_726.slots;
        let __VLS_729;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_730 = __VLS_asFunctionalComponent1(__VLS_729, new __VLS_729({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
            disabled: (__VLS_ctx.materialItems.length === 1),
        }));
        const __VLS_731 = __VLS_730({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
            disabled: (__VLS_ctx.materialItems.length === 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_730));
        let __VLS_734;
        const __VLS_735 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.isReadOnlyWorkflow))
                        return;
                    __VLS_ctx.removeMaterialItem(index);
                    // @ts-ignore
                    [materialItems, removeMaterialItem,];
                } });
        var __VLS_732;
        var __VLS_733;
        // @ts-ignore
        [];
        var __VLS_726;
        // @ts-ignore
        [];
        var __VLS_687;
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_673;
    let __VLS_736;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_737 = __VLS_asFunctionalComponent1(__VLS_736, new __VLS_736({
        cols: "12",
    }));
    const __VLS_738 = __VLS_737({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_737));
    const { default: __VLS_741 } = __VLS_739.slots;
    let __VLS_742;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_743 = __VLS_asFunctionalComponent1(__VLS_742, new __VLS_742({
        modelValue: (__VLS_ctx.materialsForm.observacion),
        label: "Observación",
        variant: "outlined",
    }));
    const __VLS_744 = __VLS_743({
        modelValue: (__VLS_ctx.materialsForm.observacion),
        label: "Observación",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_743));
    // @ts-ignore
    [materialsForm,];
    var __VLS_739;
    // @ts-ignore
    [];
    var __VLS_667;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex justify-end mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_747;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_748 = __VLS_asFunctionalComponent1(__VLS_747, new __VLS_747({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.issuingMaterials),
        disabled: (__VLS_ctx.issuingMaterials),
    }));
    const __VLS_749 = __VLS_748({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.issuingMaterials),
        disabled: (__VLS_ctx.issuingMaterials),
    }, ...__VLS_functionalComponentArgsRest(__VLS_748));
    let __VLS_752;
    const __VLS_753 = ({ click: {} },
        { onClick: (__VLS_ctx.issueMaterials) });
    const { default: __VLS_754 } = __VLS_750.slots;
    // @ts-ignore
    [issuingMaterials, issuingMaterials, issueMaterials,];
    var __VLS_750;
    var __VLS_751;
}
if (__VLS_ctx.isReadOnlyWorkflow) {
    let __VLS_755;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_756 = __VLS_asFunctionalComponent1(__VLS_755, new __VLS_755({
        type: "success",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "OT cerrada: esta sección está bloqueada y muestra el resultado final de salida de materiales.",
    }));
    const __VLS_757 = __VLS_756({
        type: "success",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "OT cerrada: esta sección está bloqueada y muestra el resultado final de salida de materiales.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_756));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
}
else {
    let __VLS_760;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_761 = __VLS_asFunctionalComponent1(__VLS_760, new __VLS_760({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "La emisión de materiales se valida contra lo reservado en Consumos para esta OT. El selector prioriza materiales con cantidad pendiente por emitir.",
    }));
    const __VLS_762 = __VLS_761({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "La emisión de materiales se valida contra lo reservado en Consumos para esta OT. El selector prioriza materiales con cantidad pendiente por emitir.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_761));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
}
let __VLS_765;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_766 = __VLS_asFunctionalComponent1(__VLS_765, new __VLS_765({
    headers: (__VLS_ctx.issueHeaders),
    items: (__VLS_ctx.issueRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo salidas de materiales...",
    density: "comfortable",
    ...{ class: "table-enterprise enterprise-table" },
    itemsPerPage: (5),
}));
const __VLS_767 = __VLS_766({
    headers: (__VLS_ctx.issueHeaders),
    items: (__VLS_ctx.issueRows),
    loading: (__VLS_ctx.loadingDetails),
    loadingText: "Obteniendo salidas de materiales...",
    density: "comfortable",
    ...{ class: "table-enterprise enterprise-table" },
    itemsPerPage: (5),
}, ...__VLS_functionalComponentArgsRest(__VLS_766));
/** @type {__VLS_StyleScopedClasses['table-enterprise']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
const { default: __VLS_770 } = __VLS_768.slots;
{
    const { bottom: __VLS_771 } = __VLS_768.slots;
    // @ts-ignore
    [isReadOnlyWorkflow, loadingDetails, issueHeaders, issueRows,];
}
{
    const { 'item.costo_unitario': __VLS_772 } = __VLS_768.slots;
    const [{ item }] = __VLS_vSlot(__VLS_772);
    (Number((item.raw ?? item).costo_unitario || 0).toFixed(2));
    // @ts-ignore
    [];
}
{
    const { 'item.subtotal': __VLS_773 } = __VLS_768.slots;
    const [{ item }] = __VLS_vSlot(__VLS_773);
    (Number((item.raw ?? item).subtotal || 0).toFixed(2));
    // @ts-ignore
    [];
}
{
    const { 'no-data': __VLS_774 } = __VLS_768.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pa-4 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_768;
// @ts-ignore
[];
var __VLS_661;
let __VLS_775;
/** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
vWindowItem;
// @ts-ignore
const __VLS_776 = __VLS_asFunctionalComponent1(__VLS_775, new __VLS_775({
    value: "history",
}));
const __VLS_777 = __VLS_776({
    value: "history",
}, ...__VLS_functionalComponentArgsRest(__VLS_776));
const { default: __VLS_780 } = __VLS_778.slots;
let __VLS_781;
/** @ts-ignore @type {typeof __VLS_components.vList | typeof __VLS_components.VList | typeof __VLS_components.vList | typeof __VLS_components.VList} */
vList;
// @ts-ignore
const __VLS_782 = __VLS_asFunctionalComponent1(__VLS_781, new __VLS_781({
    density: "compact",
    border: true,
    rounded: true,
}));
const __VLS_783 = __VLS_782({
    density: "compact",
    border: true,
    rounded: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_782));
const { default: __VLS_786 } = __VLS_784.slots;
for (const [item, i] of __VLS_vFor((__VLS_ctx.localHistory))) {
    let __VLS_787;
    /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
    vListItem;
    // @ts-ignore
    const __VLS_788 = __VLS_asFunctionalComponent1(__VLS_787, new __VLS_787({
        key: (i),
        title: (`${__VLS_ctx.workflowLabel(item.to_status)}${item.from_status ? ` · desde ${__VLS_ctx.workflowLabel(item.from_status)}` : ''}`),
        subtitle: (`${item.note || 'Sin detalle'}${item.changed_at ? ` · ${new Date(item.changed_at).toLocaleString()}` : ''}`),
    }));
    const __VLS_789 = __VLS_788({
        key: (i),
        title: (`${__VLS_ctx.workflowLabel(item.to_status)}${item.from_status ? ` · desde ${__VLS_ctx.workflowLabel(item.from_status)}` : ''}`),
        subtitle: (`${item.note || 'Sin detalle'}${item.changed_at ? ` · ${new Date(item.changed_at).toLocaleString()}` : ''}`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_788));
    // @ts-ignore
    [localHistory, workflowLabel, workflowLabel,];
}
if (!__VLS_ctx.localHistory.length) {
    let __VLS_792;
    /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
    vListItem;
    // @ts-ignore
    const __VLS_793 = __VLS_asFunctionalComponent1(__VLS_792, new __VLS_792({
        title: "Sin historial",
        subtitle: "No hay movimientos registrados para esta orden.",
    }));
    const __VLS_794 = __VLS_793({
        title: "Sin historial",
        subtitle: "No hay movimientos registrados para esta orden.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_793));
}
// @ts-ignore
[localHistory,];
var __VLS_784;
// @ts-ignore
[];
var __VLS_778;
// @ts-ignore
[];
var __VLS_355;
// @ts-ignore
[];
var __VLS_143;
// @ts-ignore
[];
var __VLS_67;
// @ts-ignore
[];
var __VLS_61;
let __VLS_797;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_798 = __VLS_asFunctionalComponent1(__VLS_797, new __VLS_797({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}));
const __VLS_799 = __VLS_798({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}, ...__VLS_functionalComponentArgsRest(__VLS_798));
const { default: __VLS_802 } = __VLS_800.slots;
let __VLS_803;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_804 = __VLS_asFunctionalComponent1(__VLS_803, new __VLS_803({
    rounded: "xl",
}));
const __VLS_805 = __VLS_804({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_804));
const { default: __VLS_808 } = __VLS_806.slots;
let __VLS_809;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_810 = __VLS_asFunctionalComponent1(__VLS_809, new __VLS_809({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_811 = __VLS_810({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_810));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_814 } = __VLS_812.slots;
// @ts-ignore
[deleteDialog, isDeleteDialogFullscreen, isDeleteDialogFullscreen,];
var __VLS_812;
let __VLS_815;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_816 = __VLS_asFunctionalComponent1(__VLS_815, new __VLS_815({}));
const __VLS_817 = __VLS_816({}, ...__VLS_functionalComponentArgsRest(__VLS_816));
const { default: __VLS_820 } = __VLS_818.slots;
// @ts-ignore
[];
var __VLS_818;
let __VLS_821;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_822 = __VLS_asFunctionalComponent1(__VLS_821, new __VLS_821({}));
const __VLS_823 = __VLS_822({}, ...__VLS_functionalComponentArgsRest(__VLS_822));
const { default: __VLS_826 } = __VLS_824.slots;
let __VLS_827;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_828 = __VLS_asFunctionalComponent1(__VLS_827, new __VLS_827({}));
const __VLS_829 = __VLS_828({}, ...__VLS_functionalComponentArgsRest(__VLS_828));
let __VLS_832;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_833 = __VLS_asFunctionalComponent1(__VLS_832, new __VLS_832({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_834 = __VLS_833({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_833));
let __VLS_837;
const __VLS_838 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.deleteDialog = false;
            // @ts-ignore
            [deleteDialog,];
        } });
const { default: __VLS_839 } = __VLS_835.slots;
// @ts-ignore
[];
var __VLS_835;
var __VLS_836;
let __VLS_840;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_841 = __VLS_asFunctionalComponent1(__VLS_840, new __VLS_840({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.savingHeader),
}));
const __VLS_842 = __VLS_841({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.savingHeader),
}, ...__VLS_functionalComponentArgsRest(__VLS_841));
let __VLS_845;
const __VLS_846 = ({ click: {} },
    { onClick: (__VLS_ctx.confirmDelete) });
const { default: __VLS_847 } = __VLS_843.slots;
// @ts-ignore
[savingHeader, confirmDelete,];
var __VLS_843;
var __VLS_844;
// @ts-ignore
[];
var __VLS_824;
// @ts-ignore
[];
var __VLS_806;
// @ts-ignore
[];
var __VLS_800;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

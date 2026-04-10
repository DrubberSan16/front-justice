/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import MaintenanceStructuredField from "@/components/maintenance/MaintenanceStructuredField.vue";
import { equipoComponenteCategoriaOptions } from "@/app/config/maintenance-modules";
import { getEnhancedMaintenanceModule } from "@/app/config/maintenance-module-overrides";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
const props = defineProps();
const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const moduleConfig = computed(() => getEnhancedMaintenanceModule(props.moduleKey));
const modulePermissionAliases = computed(() => {
    const title = repairText(moduleConfig.value?.title ?? "");
    const aliases = [title, props.moduleKey].filter(Boolean);
    const aliasMap = {
        "inteligencia-procedimientos": ["Plantillas MPG", "Procedimientos", "Inteligencia Procedimientos"],
        "componentes-equipo": ["Partes oficiales de equipos", "Partes de equipos", "Componentes equipo"],
        bitacora: ["Bitacora", "Bitácora de equipos"],
        "estados-equipo": ["Estados de equipos", "Estados equipo"],
        "eventos-equipo": ["Eventos de equipos", "Eventos equipo"],
    };
    return [...new Set([...(aliasMap[props.moduleKey] ?? []), ...aliases])];
});
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, modulePermissionAliases.value));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => moduleConfig.value?.allowCreate !== false && perms.value.isCreated);
const canEdit = computed(() => moduleConfig.value?.allowEdit !== false && perms.value.isEdited);
const canDelete = computed(() => moduleConfig.value?.allowDelete !== false && perms.value.permitDeleted);
const records = ref([]);
const loading = ref(false);
const initialLoading = ref(false);
const saving = ref(false);
const autoCodeLoading = ref(false);
const error = ref(null);
const search = ref("");
const expandedAlertGroups = ref({});
const relationOptions = ref({});
const componentCatalogRows = ref([]);
const selectedEquipmentComponentRows = ref([]);
const equipmentReferenceOptions = ref([]);
const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref(null);
const deletingId = ref(null);
const form = reactive({});
const jsonTextFields = reactive({});
const tableLoading = computed(() => loading.value || initialLoading.value);
function defaultEquipmentComponentDrafts() {
    return [
        {
            codigo: "RAD",
            nombre: "Radiador",
            nombre_oficial: "Radiador (sistema de enfriamiento)",
            categoria: "ENFRIAMIENTO",
            orden: 10,
            descripcion: "Subsistema de disipacion termica del equipo.",
        },
        {
            codigo: "MCI",
            nombre: "Motor",
            nombre_oficial: "Motor de combustion interna",
            categoria: "MOTOR",
            orden: 20,
            descripcion: "Bloque motriz principal de la unidad de generacion.",
        },
        {
            codigo: "ALT",
            nombre: "Alternador",
            nombre_oficial: "Alternador",
            categoria: "GENERACION",
            orden: 30,
            descripcion: "Modulo de generacion electrica.",
        },
        {
            codigo: "CTRL",
            nombre: "Controlador",
            nombre_oficial: "Controlador / sistema de control",
            categoria: "CONTROL",
            orden: 40,
            descripcion: "Sistema de control y monitoreo.",
        },
        {
            codigo: "BMT",
            nombre: "Barras MT",
            nombre_oficial: "Barras de media tension",
            categoria: "DISTRIBUCION",
            orden: 50,
            descripcion: "Barras y acoples de media tension.",
        },
        {
            codigo: "TRF",
            nombre: "Transformador",
            nombre_oficial: "Transformador de potencia",
            categoria: "POTENCIA",
            orden: 60,
            descripcion: "Transformador asociado a la unidad.",
        },
        {
            codigo: "ARR",
            nombre: "Arranque",
            nombre_oficial: "Sistema de arranque",
            categoria: "ARRANQUE",
            orden: 70,
            descripcion: "Sistema de arranque y baterias.",
        },
        {
            codigo: "COMB",
            nombre: "Combustible",
            nombre_oficial: "Sistema de combustible",
            categoria: "COMBUSTIBLE",
            orden: 80,
            descripcion: "Tanque, lineas, filtros y suministro de combustible.",
        },
        {
            codigo: "LUB",
            nombre: "Lubricacion",
            nombre_oficial: "Sistema de lubricacion",
            categoria: "LUBRICACION",
            orden: 90,
            descripcion: "Carter, bomba, filtros y enfriador de aceite.",
        },
        {
            codigo: "ADM",
            nombre: "Admision",
            nombre_oficial: "Sistema de admision y sobrealimentacion",
            categoria: "ADMISION",
            orden: 100,
            descripcion: "Filtros, ductos, turbo y entrada de aire.",
        },
        {
            codigo: "SENF",
            nombre: "Enfriamiento",
            nombre_oficial: "Sistema de enfriamiento",
            categoria: "ENFRIAMIENTO",
            orden: 110,
            descripcion: "Bomba de agua, termostatos y circuito de refrigeracion.",
        },
    ].map((item) => ({ ...item }));
}
function createEmptyEquipmentComponentDraft() {
    return {
        id: "",
        codigo: "",
        nombre: "",
        nombre_oficial: "",
        categoria: "",
        orden: selectedEquipmentComponentRows.value.reduce((max, item) => Math.max(max, Number(item?.orden || 0)), 0) + 10,
        descripcion: "",
    };
}
function equipmentComponentCategorySelectOptions(currentValue) {
    const normalized = String(currentValue ?? "").trim().toUpperCase();
    if (!normalized)
        return equipoComponenteCategoriaOptions;
    const alreadyExists = equipoComponenteCategoriaOptions.some((option) => option.value === normalized);
    if (alreadyExists)
        return equipoComponenteCategoriaOptions;
    return [
        ...equipoComponenteCategoriaOptions,
        {
            value: normalized,
            title: `${normalized} (actual)`,
        },
    ];
}
function resetEquipmentComponentDrafts() {
    selectedEquipmentComponentRows.value = defaultEquipmentComponentDrafts();
}
function addEquipmentComponentDraft() {
    selectedEquipmentComponentRows.value = [
        ...selectedEquipmentComponentRows.value,
        createEmptyEquipmentComponentDraft(),
    ];
}
function removeEquipmentComponentDraft(index) {
    selectedEquipmentComponentRows.value = selectedEquipmentComponentRows.value.filter((_item, itemIndex) => itemIndex !== index);
}
function repairText(value) {
    const text = String(value ?? "");
    try {
        return decodeURIComponent(escape(text));
    }
    catch {
        return text;
    }
}
function unwrapData(payload) {
    if (payload && typeof payload === "object" && "data" in payload) {
        return payload.data;
    }
    return payload;
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
function buildAuditPayload(isEditing) {
    return {
        actor_user_id: auth.user?.id || null,
        actor_username: auth.user?.nameUser || null,
        actor_name: auth.user?.nameSurname || auth.user?.nameUser || null,
        actor_email: auth.user?.email || null,
        actor_role: auth.user?.role?.nombre || null,
        created_by: isEditing ? undefined : auth.user?.nameUser || null,
        created_by_email: isEditing ? undefined : auth.user?.email || null,
        updated_by: auth.user?.nameUser || null,
        updated_by_email: auth.user?.email || null,
    };
}
const displayModuleTitle = computed(() => repairText(moduleConfig.value?.title ?? ""));
const isDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const dialogMaxWidth = computed(() => (props.moduleKey === "equipos" ? 1280 : 900));
function defaultJsonValue(field) {
    return field.jsonMode === "array" ? [] : {};
}
function getAutoCodeEndpoint() {
    if (moduleConfig.value?.key === "inteligencia-procedimientos") {
        return "/kpi_maintenance/inteligencia/procedimientos/next-code";
    }
    if (moduleConfig.value?.key === "inteligencia-analisis-lubricante") {
        return "/kpi_maintenance/inteligencia/analisis-lubricante/next-code";
    }
    return null;
}
function isAutoCodeField(field) {
    return Boolean(field.readonly && field.key === "codigo" && getAutoCodeEndpoint());
}
function getFieldHint(field) {
    if (isAutoCodeField(field)) {
        return autoCodeLoading.value && !String(form[field.key] ?? "").trim()
            ? "Generando codigo..."
            : "Autogenerado por el sistema";
    }
    return field.required ? "Obligatorio" : "";
}
function isMaterialField(field) {
    return (field.relation?.endpoint === "/kpi_inventory/productos" ||
        ["producto_id", "materiales"].includes(String(field.key || "")));
}
function isProcedureComponentOfficialField(field) {
    return (props.moduleKey === "inteligencia-procedimientos" &&
        field.key === "compartimiento_nombre_oficial");
}
function isProcedureComponentCodeField(field) {
    return (props.moduleKey === "inteligencia-procedimientos" &&
        field.key === "compartimiento_codigo_referencia");
}
async function assignAutoGeneratedCode() {
    const endpoint = getAutoCodeEndpoint();
    if (!endpoint)
        return;
    autoCodeLoading.value = true;
    try {
        const { data } = await api.get(endpoint);
        const resolved = unwrapData(data);
        const nextCode = resolved?.code ?? data?.code ?? data?.data?.code;
        if (nextCode) {
            form.codigo = String(nextCode);
        }
    }
    catch {
        // fallback: el backend también generará el código si el campo llega vacío
    }
    finally {
        autoCodeLoading.value = false;
    }
}
function cloneValue(value) {
    if (value === null || value === undefined)
        return value;
    return JSON.parse(JSON.stringify(value));
}
function serializeJsonValue(value, field) {
    if (value === null || value === undefined || value === "") {
        return field.editor ? defaultJsonValue(field) : JSON.stringify(defaultJsonValue(field), null, 2);
    }
    if (field.editor) {
        return cloneValue(value);
    }
    if (typeof value === "string") {
        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        }
        catch {
            return value;
        }
    }
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return JSON.stringify(defaultJsonValue(field), null, 2);
    }
}
function parseJsonField(value, field) {
    if (field.editor) {
        if (value === null || value === undefined || value === "") {
            return defaultJsonValue(field);
        }
        return cloneValue(value);
    }
    const raw = String(value ?? "").trim();
    if (!raw) {
        return field.jsonMode === "array" ? [] : {};
    }
    try {
        const parsed = JSON.parse(raw);
        if (field.jsonMode === "array" && !Array.isArray(parsed)) {
            throw new Error(`El campo ${repairText(field.label)} debe ser un arreglo JSON.`);
        }
        if (field.jsonMode === "object" && (!parsed || Array.isArray(parsed) || typeof parsed !== "object")) {
            throw new Error(`El campo ${repairText(field.label)} debe ser un objeto JSON.`);
        }
        return parsed;
    }
    catch (error) {
        ui.error(error?.message || `El campo ${repairText(field.label)} debe tener formato JSON valido.`);
        return null;
    }
}
function resolveEndpoint(template, id) {
    return template.replace(":id", id);
}
function getPathId(showError = true) {
    const cfg = moduleConfig.value;
    if (!cfg?.pathParam)
        return null;
    const val = form[cfg.pathParam.key];
    if (!val && showError) {
        ui.error(`Debes seleccionar ${repairText(cfg.pathParam.label)}.`);
    }
    if (!val) {
        return null;
    }
    return String(val);
}
function getCollectionEndpoint() {
    const cfg = moduleConfig.value;
    if (!cfg)
        return null;
    if (!cfg.pathParam)
        return cfg.endpoint;
    const id = getPathId(false);
    if (!id)
        return null;
    return resolveEndpoint(cfg.endpoint, id);
}
function getItemEndpoint(recordId) {
    const cfg = moduleConfig.value;
    if (!cfg)
        return null;
    if (cfg.itemEndpoint)
        return resolveEndpoint(cfg.itemEndpoint, recordId);
    return `${cfg.endpoint}/${recordId}`;
}
async function listAll(endpoint) {
    return listAllPages(endpoint);
}
function normalizeLabel(item) {
    return item?.nombre ?? item?.razon_social ?? item?.codigo ?? item?.id;
}
function buildStockScopedMaterialOptions(productos, stockRows) {
    const productMap = new Map(productos.map((item) => [String(item?.id || ""), item]));
    const seen = new Set();
    return stockRows
        .map((row) => {
        const productoId = String(row?.producto_id || "").trim();
        const bodegaId = String(row?.bodega_id || "").trim();
        if (!productoId || !bodegaId)
            return null;
        const dedupeKey = `${bodegaId}:${productoId}`;
        if (seen.has(dedupeKey))
            return null;
        seen.add(dedupeKey);
        const producto = productMap.get(productoId);
        const baseLabel = repairText(`${producto?.codigo ? `${producto.codigo} - ` : ""}${normalizeLabel(producto || row)}`);
        return {
            value: productoId,
            title: `${baseLabel} · Stock: ${row?.stock_actual ?? 0}`,
            bodegaId,
        };
    })
        .filter((item) => Boolean(item));
}
async function loadRelations() {
    relationOptions.value = {};
    if (!moduleConfig.value)
        return;
    for (const field of moduleConfig.value.fields) {
        if (!field.relation)
            continue;
        const rows = await listAll(field.relation.endpoint);
        relationOptions.value[field.key] = rows.map((r) => ({
            value: r.id,
            title: repairText(`${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`),
            bodegaId: r?.bodega_id ? String(r.bodega_id) : null,
        }));
    }
    const needsStockScopedMaterials = moduleConfig.value.key === "work-order-issue-materials" ||
        moduleConfig.value.fields.some((field) => field.relation?.endpoint === "/kpi_inventory/productos" ||
            field.key === "materiales");
    if (needsStockScopedMaterials) {
        const [productos, bodegas, stockRows] = await Promise.all([
            listAll("/kpi_inventory/productos"),
            listAll("/kpi_inventory/bodegas"),
            listAll("/kpi_inventory/stock-bodega"),
        ]);
        const stockScopedOptions = buildStockScopedMaterialOptions(productos, stockRows);
        for (const field of moduleConfig.value.fields) {
            if (field.relation?.endpoint === "/kpi_inventory/productos" || field.key === "materiales") {
                relationOptions.value[field.key] = stockScopedOptions;
            }
        }
        if (moduleConfig.value.key === "work-order-issue-materials") {
            relationOptions.value.producto_id = stockScopedOptions;
            relationOptions.value.bodega_id = bodegas.map((r) => ({
                value: r.id,
                title: repairText(`${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`),
            }));
        }
    }
    if (["equipos", "inteligencia-procedimientos", "componentes-equipo"].includes(moduleConfig.value.key)) {
        const [componentRows, equipmentRows] = await Promise.all([
            listAll("/kpi_maintenance/componentes"),
            listAll("/kpi_maintenance/equipos"),
        ]);
        componentCatalogRows.value = componentRows;
        equipmentReferenceOptions.value = equipmentRows.map((r) => ({
            value: r.id,
            title: repairText(`${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`),
        }));
    }
}
const procedureComponentOptions = computed(() => {
    const equipmentMap = new Map(equipmentReferenceOptions.value.map((item) => [String(item.value), item.title]));
    const deduped = new Map();
    for (const row of componentCatalogRows.value) {
        const officialName = String(row?.nombre_oficial || row?.nombre || "").trim();
        if (!officialName)
            continue;
        const equipmentLabel = equipmentMap.get(String(row?.equipo_id || "")) || String(row?.equipo_id || "").trim();
        const title = [
            row?.codigo || null,
            officialName,
            equipmentLabel || null,
        ]
            .filter(Boolean)
            .map((item) => repairText(item))
            .join(" · ");
        const current = deduped.get(officialName);
        if (!current || !current.codigo) {
            deduped.set(officialName, {
                value: officialName,
                title,
                codigo: row?.codigo || null,
            });
        }
    }
    return [...deduped.values()].sort((a, b) => a.title.localeCompare(b.title));
});
async function loadSelectedEquipmentComponents(equipmentId) {
    const normalized = String(equipmentId || "").trim();
    if (!normalized) {
        resetEquipmentComponentDrafts();
        return;
    }
    try {
        const { data } = await api.get("/kpi_maintenance/componentes", {
            params: { equipo_id: normalized },
        });
        const rows = asArray(data);
        selectedEquipmentComponentRows.value = rows.length ? rows : defaultEquipmentComponentDrafts();
    }
    catch {
        resetEquipmentComponentDrafts();
    }
}
function handleProcedureComponentSelected(value) {
    const selected = procedureComponentOptions.value.find((item) => String(item.value || "") === String(value || ""));
    form.compartimiento_nombre_oficial = value || "";
    form.compartimiento_codigo_referencia = selected?.codigo || "";
}
function normalizeWorkOrderTitle(item) {
    return item?.titulo ?? item?.title ?? item?.nombre ?? item?.codigo ?? item?.id ?? "Sin orden";
}
function normalizeTeamName(item) {
    return item?.nombre ?? item?.name ?? item?.codigo ?? item?.id ?? "Sin equipo";
}
function isMeaningfulOrderTitle(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return Boolean(normalized) && normalized !== "sin orden";
}
function getAlertGroupKey(row) {
    const referencia = row?.referencia ?? row?.reference ?? "";
    if (referencia)
        return `referencia::${referencia}`;
    return `row::${row?.id ?? row?.alerta_id ?? row?.work_order_id ?? "sin-id"}`;
}
function extractPlanIdFromReference(reference) {
    const value = String(reference ?? "").trim();
    const match = value.match(/^PLAN:\s*(.+)$/i);
    if (!match?.[1])
        return null;
    const planId = match[1].trim();
    return planId || null;
}
function resolveAlertReference(row) {
    return row?.referencia_resuelta ?? row?.referencia ?? row?.reference ?? "Sin referencia";
}
function resolveTableItem(item) {
    if (item?.raw) {
        return { ...item.raw, ...item };
    }
    if (item?._raw) {
        return { ...item._raw, ...item };
    }
    return item;
}
async function enrichAlertsWithRelations(alertRows) {
    const equipoIds = Array.from(new Set(alertRows.map((row) => row?.equipo_id).filter(Boolean)));
    const workOrderIds = Array.from(new Set(alertRows.map((row) => row?.work_order_id).filter(Boolean)));
    const planIds = Array.from(new Set(alertRows
        .map((row) => extractPlanIdFromReference(row?.referencia ?? row?.reference))
        .filter(Boolean)));
    const equipoMap = new Map();
    await Promise.all(equipoIds.map(async (equipoId) => {
        try {
            const { data } = await api.get(`/kpi_maintenance/equipos/${equipoId}`);
            const item = data?.data ?? data;
            equipoMap.set(String(equipoId), normalizeTeamName(item));
        }
        catch {
            equipoMap.set(String(equipoId), String(equipoId));
        }
    }));
    const workOrderMap = new Map();
    await Promise.all(workOrderIds.map(async (workOrderId) => {
        try {
            const { data } = await api.get(`/kpi_maintenance/work-orders/${workOrderId}`);
            const item = data?.data ?? data;
            workOrderMap.set(String(workOrderId), normalizeWorkOrderTitle(item));
        }
        catch {
            workOrderMap.set(String(workOrderId), String(workOrderId));
        }
    }));
    const planMap = new Map();
    await Promise.all(planIds.map(async (planId) => {
        try {
            const { data } = await api.get(`/kpi_maintenance/planes/${planId}`);
            const item = data?.data ?? data;
            const name = item?.nombre ?? item?.name ?? item?.codigo ?? String(planId);
            planMap.set(String(planId), String(name));
        }
        catch {
            planMap.set(String(planId), String(planId));
        }
    }));
    const enrichedRows = alertRows.map((row) => ({
        ...row,
        referencia_resuelta: (() => {
            const rawReference = row?.referencia ?? row?.reference ?? "";
            const planId = extractPlanIdFromReference(rawReference);
            if (!planId)
                return rawReference;
            const planName = planMap.get(String(planId)) ?? String(planId);
            return `PLAN: ${planName}`;
        })(),
        equipo_nombre: row?.equipo_id ? equipoMap.get(String(row.equipo_id)) ?? String(row.equipo_id) : "",
        work_order_title: row?.work_order_id ? workOrderMap.get(String(row.work_order_id)) ?? String(row.work_order_id) : "Sin orden",
    }));
    const groupFallbacks = new Map();
    for (const row of enrichedRows) {
        const key = getAlertGroupKey(row);
        const existing = groupFallbacks.get(key) ?? { tipo_alerta: "", equipo_id: "", equipo_nombre: "", work_order_title: "" };
        const isEnProceso = String(row?.estado ?? "").toUpperCase() === "EN_PROCESO";
        const preferredOrder = isEnProceso && isMeaningfulOrderTitle(row?.work_order_title);
        const keepExistingOrder = isMeaningfulOrderTitle(existing.work_order_title);
        groupFallbacks.set(key, {
            tipo_alerta: existing.tipo_alerta || row?.tipo_alerta || "",
            equipo_id: existing.equipo_id || row?.equipo_id || "",
            equipo_nombre: existing.equipo_nombre || row?.equipo_nombre || "",
            work_order_title: preferredOrder
                ? row?.work_order_title
                : keepExistingOrder
                    ? existing.work_order_title
                    : row?.work_order_title || "",
        });
    }
    return enrichedRows.map((row) => {
        const fallback = groupFallbacks.get(getAlertGroupKey(row));
        return {
            ...row,
            tipo_alerta: row?.tipo_alerta || fallback?.tipo_alerta || "",
            equipo_id: row?.equipo_id || fallback?.equipo_id || "",
            equipo_nombre: row?.equipo_nombre || fallback?.equipo_nombre || "",
            work_order_title: isMeaningfulOrderTitle(row?.work_order_title)
                ? row?.work_order_title
                : fallback?.work_order_title || "Sin orden",
        };
    });
}
async function fetchRecords(skipLoading = false) {
    const endpoint = getCollectionEndpoint();
    if (!endpoint) {
        records.value = [];
        expandedAlertGroups.value = {};
        return;
    }
    const useManagedLoading = !skipLoading;
    if (useManagedLoading)
        loading.value = true;
    error.value = null;
    try {
        const rows = await listAll(endpoint);
        records.value = moduleConfig.value?.key === "alertas" ? await enrichAlertsWithRelations(rows) : rows;
        if (moduleConfig.value?.key === "alertas") {
            expandedAlertGroups.value = {};
        }
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudieron cargar registros.";
    }
    finally {
        if (useManagedLoading)
            loading.value = false;
    }
}
async function hydrateModuleData() {
    if (!moduleConfig.value)
        return;
    if (!canRead.value)
        return;
    initialLoading.value = true;
    error.value = null;
    try {
        await loadRelations();
        await fetchRecords(true);
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudieron cargar registros.";
    }
    finally {
        initialLoading.value = false;
    }
}
function resetForm() {
    Object.keys(form).forEach((k) => delete form[k]);
    Object.keys(jsonTextFields).forEach((k) => delete jsonTextFields[k]);
    selectedEquipmentComponentRows.value = [];
    for (const field of moduleConfig.value?.fields ?? []) {
        if (field.key === "status")
            form[field.key] = "ACTIVE";
        else if (field.type === "boolean")
            form[field.key] = false;
        else if (field.type === "json") {
            form[field.key] = defaultJsonValue(field);
            if (!field.editor) {
                jsonTextFields[field.key] = JSON.stringify(defaultJsonValue(field), null, 2);
            }
        }
        else if (field.type === "number")
            form[field.key] = "0";
        else
            form[field.key] = "";
    }
    if (props.moduleKey === "equipos") {
        resetEquipmentComponentDrafts();
    }
}
function isWarehouseDependentProductField(field) {
    return field.relation?.endpoint === "/kpi_inventory/productos";
}
function includeCurrentSelectValue(field, options) {
    const currentValue = form[field.key];
    const normalizedCurrent = String(currentValue ?? "").trim();
    if (!normalizedCurrent)
        return options;
    const alreadyExists = options.some((option) => String(option.value ?? "").trim() === normalizedCurrent);
    if (alreadyExists)
        return options;
    return [
        ...options,
        {
            value: currentValue,
            title: `${normalizedCurrent} (actual)`,
        },
    ];
}
function getSelectOptions(field) {
    if (field.options)
        return includeCurrentSelectValue(field, field.options);
    const options = relationOptions.value[field.key] ?? [];
    if (!isWarehouseDependentProductField(field)) {
        return includeCurrentSelectValue(field, options);
    }
    if (!options.some((option) => String(option.bodegaId || "").trim())) {
        return includeCurrentSelectValue(field, options);
    }
    const warehouseId = String(form.bodega_id || "").trim();
    if (!warehouseId)
        return [];
    return includeCurrentSelectValue(field, options.filter((option) => String(option.bodegaId || "") === warehouseId));
}
function applyFormPatch(patch) {
    Object.assign(form, patch);
}
function pruneWarehouseDependentSelections() {
    const warehouseId = String(form.bodega_id || "").trim();
    const productField = moduleConfig.value?.fields.find((field) => field.key === "producto_id");
    if (productField) {
        const stillExists = getSelectOptions(productField).some((option) => String(option.value) === String(form.producto_id || ""));
        if (!stillExists) {
            form.producto_id = "";
        }
    }
    if (Array.isArray(form.materiales)) {
        const materialOptions = warehouseId ? (relationOptions.value.materiales ?? []) : [];
        if (!materialOptions.some((option) => String(option.bodegaId || "").trim()))
            return;
        const allowed = new Set(materialOptions
            .filter((option) => String(option.bodegaId || "") === warehouseId)
            .map((option) => String(option.value)));
        form.materiales = form.materiales.filter((item) => allowed.has(String(item ?? "")));
    }
}
const visibleFields = computed(() => (moduleConfig.value?.fields ?? []).filter((field) => !field.hidden));
const headers = computed(() => {
    const cfg = moduleConfig.value;
    if (!cfg)
        return [];
    const base = visibleFields.value.slice(0, 6).map((f) => ({ title: repairText(f.label), key: f.key }));
    if (!canEdit.value && !canDelete.value)
        return base;
    return [...base, { title: "Acciones", key: "actions", sortable: false }];
});
const rows = computed(() => {
    const cfg = moduleConfig.value;
    if (!cfg)
        return [];
    const q = search.value.trim().toLowerCase();
    const normalizedRows = records.value
        .map((r) => {
        const out = { ...r };
        out._raw = r;
        for (const field of cfg.fields) {
            if (field.type === "select" && field.relation && r[field.key]) {
                const opt = (relationOptions.value[field.key] ?? []).find((x) => x.value === r[field.key]);
                out[field.key] = opt?.title ?? r[field.key];
            }
        }
        out._search = JSON.stringify({ ...r, ...out }).toLowerCase();
        return out;
    })
        .filter((r) => !q || r._search.includes(q));
    if (cfg.key !== "alertas") {
        return normalizedRows;
    }
    const sortedRows = [...normalizedRows].sort((a, b) => {
        const dateA = new Date(a?.fecha_generada ?? 0).getTime();
        const dateB = new Date(b?.fecha_generada ?? 0).getTime();
        if (dateA !== dateB)
            return dateB - dateA;
        const keyA = getAlertGroupKey(a);
        const keyB = getAlertGroupKey(b);
        return keyA.localeCompare(keyB);
    });
    const groupedRows = new Map();
    for (const row of sortedRows) {
        const key = getAlertGroupKey(row);
        const group = groupedRows.get(key) ?? [];
        group.push(row);
        groupedRows.set(key, group);
    }
    const groups = Array.from(groupedRows.entries())
        .map(([groupKey, groupRows]) => {
        const groupSorted = [...groupRows].sort((a, b) => new Date(b?.fecha_generada ?? 0).getTime() - new Date(a?.fecha_generada ?? 0).getTime());
        return { groupKey, rows: groupSorted };
    })
        .sort((a, b) => {
        const dateA = new Date(a.rows[0]?.fecha_generada ?? 0).getTime();
        const dateB = new Date(b.rows[0]?.fecha_generada ?? 0).getTime();
        return dateB - dateA;
    });
    return groups.flatMap(({ groupKey, rows: groupRows }, index) => {
        const [header, ...children] = groupRows;
        const expanded = expandedAlertGroups.value[groupKey] ?? true;
        const baseRow = {
            ...header,
            _alertGroupKey: groupKey,
            _alertGroupHeader: true,
            _alertGroupStart: true,
            _alertGroupEnd: !expanded,
            _alertGroupExpanded: expanded,
            _alertGroupIndex: index + 1,
            _alertChild: false,
        };
        if (!expanded)
            return [baseRow];
        const childRows = children.map((row, childIndex) => ({
            ...row,
            _alertGroupKey: groupKey,
            _alertGroupHeader: false,
            _alertGroupStart: false,
            _alertGroupEnd: childIndex === children.length - 1,
            _alertGroupExpanded: expanded,
            _alertGroupIndex: index + 1,
            _alertChild: true,
        }));
        return [baseRow, ...childRows];
    });
});
function showAlertGroupValue(item) {
    if (moduleConfig.value?.key !== "alertas")
        return true;
    return Boolean(item?._alertGroupHeader || item?._alertChild);
}
function toggleAlertGroup(item) {
    if (moduleConfig.value?.key !== "alertas")
        return;
    if (!item?._alertGroupHeader || !item?._alertGroupKey)
        return;
    expandedAlertGroups.value[item._alertGroupKey] = !expandedAlertGroups.value[item._alertGroupKey];
}
function getRowProps({ item }) {
    if (moduleConfig.value?.key !== "alertas")
        return {};
    const row = resolveTableItem(item);
    const index = row?._alertGroupIndex ?? 0;
    return {
        class: index % 2 === 0 ? "alert-group-row-even" : "alert-group-row-odd",
        onClick: () => toggleAlertGroup(row),
        style: row?._alertGroupHeader ? "cursor:pointer;" : "",
    };
}
function sanitizePayload() {
    const cfg = moduleConfig.value;
    const payload = {};
    if (!cfg)
        return payload;
    for (const field of cfg.fields) {
        if (field.sendInPayload === false)
            continue;
        let val = field.type === "json" && !field.editor && !field.hidden ? jsonTextFields[field.key] : form[field.key];
        if (field.type === "number") {
            val = val === "" || val === null || val === undefined ? "0" : String(val);
        }
        if (field.type === "text") {
            val = val === "" ? null : val;
        }
        if (field.type === "select" && val === "") {
            val = null;
        }
        if (field.type === "json") {
            val = parseJsonField(val, field);
            if (val === null)
                return null;
        }
        if (field.key === "items" && typeof val === "string") {
            try {
                val = JSON.parse(val);
            }
            catch {
                ui.error("El campo Items (JSON) debe tener formato JSON válido.");
                return null;
            }
        }
        payload[field.key] = val;
    }
    const hasPayloadJsonField = cfg.fields.some((field) => field.key === "payload_json");
    if (hasPayloadJsonField) {
        const currentPayload = payload.payload_json && typeof payload.payload_json === "object" && !Array.isArray(payload.payload_json)
            ? payload.payload_json
            : {};
        payload.payload_json = {
            ...currentPayload,
            ...buildAuditPayload(Boolean(editingId.value)),
        };
    }
    if (props.moduleKey === "equipos") {
        payload.componentes = selectedEquipmentComponentRows.value
            .map((component, index) => ({
            id: String(component?.id || "").trim() || undefined,
            codigo: String(component?.codigo || "").trim() || undefined,
            nombre: String(component?.nombre || "").trim() ||
                String(component?.nombre_oficial || "").trim(),
            nombre_oficial: String(component?.nombre_oficial || "").trim() ||
                String(component?.nombre || "").trim(),
            categoria: String(component?.categoria || "").trim() || undefined,
            orden: Number(component?.orden || index + 1) || index + 1,
            descripcion: String(component?.descripcion || "").trim() || undefined,
        }))
            .filter((component) => Boolean(component.nombre || component.nombre_oficial));
    }
    return payload;
}
function validateForm() {
    const cfg = moduleConfig.value;
    if (!cfg)
        return false;
    for (const field of cfg.fields) {
        if (!field.required)
            continue;
        const val = field.type === "json" && !field.editor && !field.hidden ? jsonTextFields[field.key] : form[field.key];
        if (field.type === "boolean")
            continue;
        if (field.editor === "file-upload") {
            if (!form.contenido_base64) {
                ui.error(`Debes seleccionar un archivo en ${repairText(field.label)}.`);
                return false;
            }
            continue;
        }
        if (field.type === "json" && field.jsonMode === "array" && Array.isArray(val) && !val.length) {
            ui.error(`Debes agregar al menos un item en ${repairText(field.label)}.`);
            return false;
        }
        if (val === "" || val === null || val === undefined) {
            ui.error(`El campo ${repairText(field.label)} es obligatorio.`);
            return false;
        }
    }
    if (props.moduleKey === "equipos") {
        if (!selectedEquipmentComponentRows.value.length) {
            ui.error("Debes registrar al menos un compartimiento oficial para el equipo.");
            return false;
        }
        for (const [index, component] of selectedEquipmentComponentRows.value.entries()) {
            const shortName = String(component?.nombre || "").trim();
            const officialName = String(component?.nombre_oficial || "").trim();
            if (!shortName) {
                ui.error(`El compartimiento ${index + 1} debe tener nombre corto.`);
                return false;
            }
            if (!officialName) {
                ui.error(`El compartimiento ${index + 1} debe tener nombre oficial para el análisis del gemelo digital.`);
                return false;
            }
        }
    }
    return true;
}
async function openCreate() {
    editingId.value = null;
    resetForm();
    dialog.value = true;
    await assignAutoGeneratedCode();
}
async function openEdit(item) {
    editingId.value = item.id;
    resetForm();
    for (const field of moduleConfig.value?.fields ?? []) {
        if (field.editor === "file-upload") {
            form[field.key] = {
                nombre: item.nombre ?? "",
                mime_type: item.mime_type ?? "",
            };
            continue;
        }
        if (field.type === "json" && !field.editor) {
            const serialized = String(serializeJsonValue(item[field.key], field));
            jsonTextFields[field.key] = serialized;
            form[field.key] = parseJsonField(serialized, field);
            continue;
        }
        form[field.key] = field.type === "json"
            ? serializeJsonValue(item[field.key], field)
            : item[field.key] ?? form[field.key];
    }
    if (props.moduleKey === "equipos") {
        await loadSelectedEquipmentComponents(item.id);
    }
    dialog.value = true;
}
function openDelete(item) {
    deletingId.value = item.id;
    deleteDialog.value = true;
}
async function save() {
    const collectionEndpoint = getCollectionEndpoint();
    if (!moduleConfig.value || !collectionEndpoint)
        return;
    if (!validateForm())
        return;
    saving.value = true;
    try {
        const payload = sanitizePayload();
        if (!payload)
            return;
        if (editingId.value) {
            const itemEndpoint = getItemEndpoint(editingId.value);
            if (!itemEndpoint)
                return;
            await api.patch(itemEndpoint, payload);
            ui.success("Registro actualizado correctamente.");
        }
        else {
            const { data } = await api.post(collectionEndpoint, payload);
            const created = unwrapData(data);
            const resolvedCode = String(created?.codigo ?? created?.code ?? form.codigo ?? "").trim();
            if (created?.code_was_reassigned && resolvedCode) {
                ui.open(`El codigo fue ajustado automaticamente a ${resolvedCode}.`, "warning", 5500);
            }
            else {
                ui.success("Registro creado correctamente.");
            }
        }
        dialog.value = false;
        await fetchRecords();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo guardar el registro.");
    }
    finally {
        saving.value = false;
    }
}
async function confirmDelete() {
    if (!moduleConfig.value || !deletingId.value)
        return;
    saving.value = true;
    try {
        const itemEndpoint = getItemEndpoint(deletingId.value);
        if (!itemEndpoint)
            return;
        await api.delete(itemEndpoint);
        ui.success("Registro eliminado correctamente.");
        deleteDialog.value = false;
        await fetchRecords();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo eliminar el registro.");
    }
    finally {
        saving.value = false;
    }
}
watch(() => props.moduleKey, async () => {
    if (!moduleConfig.value)
        return;
    resetForm();
    await hydrateModuleData();
}, { immediate: true });
watch(() => (moduleConfig.value?.pathParam?.key ? form[moduleConfig.value.pathParam.key] : null), async () => {
    if (!moduleConfig.value?.pathParam)
        return;
    await fetchRecords();
});
watch(() => form.bodega_id, () => {
    pruneWarehouseDependentSelections();
});
watch(() => form.compartimiento_nombre_oficial, (value) => {
    if (props.moduleKey !== "inteligencia-procedimientos")
        return;
    const selected = procedureComponentOptions.value.find((item) => String(item.value || "") === String(value || ""));
    if (selected) {
        form.compartimiento_codigo_referencia = selected.codigo || "";
    }
    else if (!value) {
        form.compartimiento_codigo_referencia = "";
    }
});
onMounted(async () => {
    if (!moduleConfig.value || !canRead.value || records.value.length || initialLoading.value)
        return;
    await hydrateModuleData();
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['maintenance-crud-table']} */ ;
/** @type {__VLS_StyleScopedClasses['maintenance-crud-table']} */ ;
if (!__VLS_ctx.canRead) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        type: "warning",
        variant: "tonal",
    }));
    const __VLS_2 = __VLS_1({
        type: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    // @ts-ignore
    [canRead,];
    var __VLS_3;
}
else if (!__VLS_ctx.moduleConfig) {
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        type: "error",
        variant: "tonal",
    }));
    const __VLS_8 = __VLS_7({
        type: "error",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    // @ts-ignore
    [moduleConfig,];
    var __VLS_9;
}
else {
    let __VLS_12;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_14 = __VLS_13({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_17 } = __VLS_15.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-header mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h6 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.displayModuleTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.displayModuleTitle.toLowerCase());
    if (__VLS_ctx.canCreate) {
        let __VLS_18;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-plus",
        }));
        const __VLS_20 = __VLS_19({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-plus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
        let __VLS_23;
        const __VLS_24 = ({ click: {} },
            { onClick: (__VLS_ctx.openCreate) });
        const { default: __VLS_25 } = __VLS_21.slots;
        // @ts-ignore
        [displayModuleTitle, displayModuleTitle, canCreate, openCreate,];
        var __VLS_21;
        var __VLS_22;
    }
    let __VLS_26;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
        dense: true,
        ...{ class: "mb-2" },
    }));
    const __VLS_28 = __VLS_27({
        dense: true,
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    const { default: __VLS_31 } = __VLS_29.slots;
    let __VLS_32;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
        cols: "12",
        md: "4",
    }));
    const __VLS_34 = __VLS_33({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    const { default: __VLS_37 } = __VLS_35.slots;
    let __VLS_38;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
        modelValue: (__VLS_ctx.search),
        label: "Buscar",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }));
    const __VLS_40 = __VLS_39({
        modelValue: (__VLS_ctx.search),
        label: "Buscar",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    // @ts-ignore
    [search,];
    var __VLS_35;
    // @ts-ignore
    [];
    var __VLS_29;
    if (__VLS_ctx.error) {
        let __VLS_43;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-2" },
        }));
        const __VLS_45 = __VLS_44({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_44));
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        const { default: __VLS_48 } = __VLS_46.slots;
        (__VLS_ctx.error);
        // @ts-ignore
        [error, error,];
        var __VLS_46;
    }
    let __VLS_49;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.rows),
        loading: (__VLS_ctx.tableLoading),
        loadingText: "Obteniendo información del módulo...",
        itemsPerPage: (20),
        itemProps: (__VLS_ctx.getRowProps),
        ...{ class: "elevation-0 enterprise-table maintenance-crud-table" },
    }));
    const __VLS_51 = __VLS_50({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.rows),
        loading: (__VLS_ctx.tableLoading),
        loadingText: "Obteniendo información del módulo...",
        itemsPerPage: (20),
        itemProps: (__VLS_ctx.getRowProps),
        ...{ class: "elevation-0 enterprise-table maintenance-crud-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_50));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['maintenance-crud-table']} */ ;
    const { default: __VLS_54 } = __VLS_52.slots;
    {
        const { 'item.estado': __VLS_55 } = __VLS_52.slots;
        const [{ item }] = __VLS_vSlot(__VLS_55);
        if (__VLS_ctx.moduleConfig?.key === 'alertas') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert-tree-cell" },
            });
            /** @type {__VLS_StyleScopedClasses['alert-tree-cell']} */ ;
            if (__VLS_ctx.resolveTableItem(item)._alertGroupHeader) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.canRead))
                                return;
                            if (!!(!__VLS_ctx.moduleConfig))
                                return;
                            if (!(__VLS_ctx.moduleConfig?.key === 'alertas'))
                                return;
                            if (!(__VLS_ctx.resolveTableItem(item)._alertGroupHeader))
                                return;
                            __VLS_ctx.toggleAlertGroup(__VLS_ctx.resolveTableItem(item));
                            // @ts-ignore
                            [moduleConfig, headers, rows, tableLoading, getRowProps, resolveTableItem, resolveTableItem, toggleAlertGroup,];
                        } },
                    ...{ class: "alert-tree-root" },
                });
                /** @type {__VLS_StyleScopedClasses['alert-tree-root']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "alert-tree-toggle" },
                });
                /** @type {__VLS_StyleScopedClasses['alert-tree-toggle']} */ ;
                (__VLS_ctx.resolveTableItem(item)._alertGroupExpanded ? "▼" : "▶");
                (__VLS_ctx.resolveAlertReference(__VLS_ctx.resolveTableItem(item)));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "alert-tree-node" },
            });
            /** @type {__VLS_StyleScopedClasses['alert-tree-node']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "alert-tree-branch" },
            });
            /** @type {__VLS_StyleScopedClasses['alert-tree-branch']} */ ;
            (__VLS_ctx.resolveTableItem(item)._alertChild ? "└─" : (__VLS_ctx.resolveTableItem(item)._alertGroupExpanded ? "├─" : "└─"));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.resolveTableItem(item).estado);
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.resolveTableItem(item).estado);
        }
        // @ts-ignore
        [resolveTableItem, resolveTableItem, resolveTableItem, resolveTableItem, resolveTableItem, resolveTableItem, resolveAlertReference,];
    }
    {
        const { 'item.tipo_alerta': __VLS_56 } = __VLS_52.slots;
        const [{ item }] = __VLS_vSlot(__VLS_56);
        if (__VLS_ctx.showAlertGroupValue(__VLS_ctx.resolveTableItem(item))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.resolveTableItem(item).tipo_alerta);
        }
        // @ts-ignore
        [resolveTableItem, resolveTableItem, showAlertGroupValue,];
    }
    {
        const { 'item.equipo_nombre': __VLS_57 } = __VLS_52.slots;
        const [{ item }] = __VLS_vSlot(__VLS_57);
        if (__VLS_ctx.showAlertGroupValue(__VLS_ctx.resolveTableItem(item))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.resolveTableItem(item).equipo_nombre);
        }
        // @ts-ignore
        [resolveTableItem, resolveTableItem, showAlertGroupValue,];
    }
    {
        const { 'item.materiales': __VLS_58 } = __VLS_52.slots;
        const [{ item }] = __VLS_vSlot(__VLS_58);
        if (Array.isArray(__VLS_ctx.resolveTableItem(item).materiales_detalle) && __VLS_ctx.resolveTableItem(item).materiales_detalle.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "d-flex flex-wrap" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            for (const [material] of __VLS_vFor((__VLS_ctx.resolveTableItem(item).materiales_detalle))) {
                let __VLS_59;
                /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
                vChip;
                // @ts-ignore
                const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
                    key: (material.id || material.codigo || material.nombre),
                    size: "x-small",
                    variant: "tonal",
                    color: "primary",
                }));
                const __VLS_61 = __VLS_60({
                    key: (material.id || material.codigo || material.nombre),
                    size: "x-small",
                    variant: "tonal",
                    color: "primary",
                }, ...__VLS_functionalComponentArgsRest(__VLS_60));
                const { default: __VLS_64 } = __VLS_62.slots;
                (__VLS_ctx.repairText(material.label || material.nombre || material.codigo || material.id));
                // @ts-ignore
                [resolveTableItem, resolveTableItem, resolveTableItem, repairText,];
                var __VLS_62;
                // @ts-ignore
                [];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (Array.isArray(__VLS_ctx.resolveTableItem(item).materiales) ? __VLS_ctx.resolveTableItem(item).materiales.join(", ") : "");
        }
        // @ts-ignore
        [resolveTableItem, resolveTableItem,];
    }
    {
        const { 'item.actions': __VLS_65 } = __VLS_52.slots;
        const [{ item }] = __VLS_vSlot(__VLS_65);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        if (__VLS_ctx.canEdit) {
            let __VLS_66;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }));
            const __VLS_68 = __VLS_67({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }, ...__VLS_functionalComponentArgsRest(__VLS_67));
            let __VLS_71;
            const __VLS_72 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!!(!__VLS_ctx.moduleConfig))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.openEdit(item._raw ?? item);
                        // @ts-ignore
                        [canEdit, openEdit,];
                    } });
            var __VLS_69;
            var __VLS_70;
        }
        if (__VLS_ctx.canDelete) {
            let __VLS_73;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_75 = __VLS_74({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_74));
            let __VLS_78;
            const __VLS_79 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!!(!__VLS_ctx.moduleConfig))
                            return;
                        if (!(__VLS_ctx.canDelete))
                            return;
                        __VLS_ctx.openDelete(item._raw ?? item);
                        // @ts-ignore
                        [canDelete, openDelete,];
                    } });
            var __VLS_76;
            var __VLS_77;
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_52;
    // @ts-ignore
    [];
    var __VLS_15;
}
let __VLS_80;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : __VLS_ctx.dialogMaxWidth),
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : __VLS_ctx.dialogMaxWidth),
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
const { default: __VLS_85 } = __VLS_83.slots;
let __VLS_86;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
    rounded: "xl",
    ...{ class: "enterprise-dialog maintenance-dialog-card" },
}));
const __VLS_88 = __VLS_87({
    rounded: "xl",
    ...{ class: "enterprise-dialog maintenance-dialog-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['maintenance-dialog-card']} */ ;
const { default: __VLS_91 } = __VLS_89.slots;
let __VLS_92;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent1(__VLS_92, new __VLS_92({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_94 = __VLS_93({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_97 } = __VLS_95.slots;
(__VLS_ctx.editingId ? 'Editar' : 'Crear');
(__VLS_ctx.displayModuleTitle);
// @ts-ignore
[displayModuleTitle, dialog, isDialogFullscreen, isDialogFullscreen, dialogMaxWidth, editingId,];
var __VLS_95;
let __VLS_98;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent1(__VLS_98, new __VLS_98({}));
const __VLS_100 = __VLS_99({}, ...__VLS_functionalComponentArgsRest(__VLS_99));
let __VLS_103;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({
    ...{ class: "pt-4 section-surface" },
}));
const __VLS_105 = __VLS_104({
    ...{ class: "pt-4 section-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['section-surface']} */ ;
const { default: __VLS_108 } = __VLS_106.slots;
let __VLS_109;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent1(__VLS_109, new __VLS_109({
    dense: true,
}));
const __VLS_111 = __VLS_110({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
const { default: __VLS_114 } = __VLS_112.slots;
for (const [field] of __VLS_vFor((__VLS_ctx.visibleFields))) {
    let __VLS_115;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
        key: (field.key),
        cols: "12",
        md: (field.fullWidth ? 12 : 6),
    }));
    const __VLS_117 = __VLS_116({
        key: (field.key),
        cols: "12",
        md: (field.fullWidth ? 12 : 6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_116));
    const { default: __VLS_120 } = __VLS_118.slots;
    if (field.editor) {
        const __VLS_121 = MaintenanceStructuredField;
        // @ts-ignore
        const __VLS_122 = __VLS_asFunctionalComponent1(__VLS_121, new __VLS_121({
            ...{ 'onPatchForm': {} },
            modelValue: (__VLS_ctx.form[field.key]),
            field: (field),
            relationOptions: (__VLS_ctx.relationOptions),
            formState: (__VLS_ctx.form),
        }));
        const __VLS_123 = __VLS_122({
            ...{ 'onPatchForm': {} },
            modelValue: (__VLS_ctx.form[field.key]),
            field: (field),
            relationOptions: (__VLS_ctx.relationOptions),
            formState: (__VLS_ctx.form),
        }, ...__VLS_functionalComponentArgsRest(__VLS_122));
        let __VLS_126;
        const __VLS_127 = ({ patchForm: {} },
            { onPatchForm: (__VLS_ctx.applyFormPatch) });
        var __VLS_124;
        var __VLS_125;
    }
    else if (__VLS_ctx.isProcedureComponentOfficialField(field)) {
        let __VLS_128;
        /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
        vAutocomplete;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.procedureComponentOptions),
            itemTitle: "title",
            itemValue: "value",
            label: (__VLS_ctx.repairText(field.label)),
            hint: "Selecciona un compartimiento oficial ya registrado.",
            persistentHint: true,
            clearable: true,
            variant: "outlined",
        }));
        const __VLS_130 = __VLS_129({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.procedureComponentOptions),
            itemTitle: "title",
            itemValue: "value",
            label: (__VLS_ctx.repairText(field.label)),
            hint: "Selecciona un compartimiento oficial ya registrado.",
            persistentHint: true,
            clearable: true,
            variant: "outlined",
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        let __VLS_133;
        const __VLS_134 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (__VLS_ctx.handleProcedureComponentSelected) });
        var __VLS_131;
        var __VLS_132;
    }
    else if (__VLS_ctx.isProcedureComponentCodeField(field)) {
        let __VLS_135;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
            modelValue: (__VLS_ctx.form[field.key]),
            label: (__VLS_ctx.repairText(field.label)),
            hint: "Se completa automáticamente al seleccionar el compartimiento.",
            persistentHint: true,
            variant: "outlined",
            readonly: true,
        }));
        const __VLS_137 = __VLS_136({
            modelValue: (__VLS_ctx.form[field.key]),
            label: (__VLS_ctx.repairText(field.label)),
            hint: "Se completa automáticamente al seleccionar el compartimiento.",
            persistentHint: true,
            variant: "outlined",
            readonly: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
    }
    else if (field.type === 'select' && __VLS_ctx.isMaterialField(field)) {
        let __VLS_140;
        /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
        vAutocomplete;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (__VLS_ctx.repairText(field.label)),
            hint: (__VLS_ctx.getFieldHint(field)),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
            density: "comfortable",
            disabled: (Boolean(field.readonly)),
            noDataText: "No hay materiales disponibles para este filtro",
        }));
        const __VLS_142 = __VLS_141({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (__VLS_ctx.repairText(field.label)),
            hint: (__VLS_ctx.getFieldHint(field)),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
            density: "comfortable",
            disabled: (Boolean(field.readonly)),
            noDataText: "No hay materiales disponibles para este filtro",
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    }
    else if (field.type === 'select') {
        let __VLS_145;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_146 = __VLS_asFunctionalComponent1(__VLS_145, new __VLS_145({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (__VLS_ctx.repairText(field.label)),
            hint: (__VLS_ctx.getFieldHint(field)),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
            disabled: (Boolean(field.readonly)),
        }));
        const __VLS_147 = __VLS_146({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (__VLS_ctx.repairText(field.label)),
            hint: (__VLS_ctx.getFieldHint(field)),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
            disabled: (Boolean(field.readonly)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_146));
    }
    else if (field.type === 'boolean') {
        let __VLS_150;
        /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
        vCheckbox;
        // @ts-ignore
        const __VLS_151 = __VLS_asFunctionalComponent1(__VLS_150, new __VLS_150({
            modelValue: (__VLS_ctx.form[field.key]),
            label: (__VLS_ctx.repairText(field.label)),
            hideDetails: true,
            disabled: (Boolean(field.readonly)),
        }));
        const __VLS_152 = __VLS_151({
            modelValue: (__VLS_ctx.form[field.key]),
            label: (__VLS_ctx.repairText(field.label)),
            hideDetails: true,
            disabled: (Boolean(field.readonly)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_151));
    }
    else if (field.type === 'json') {
        let __VLS_155;
        /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
        vTextarea;
        // @ts-ignore
        const __VLS_156 = __VLS_asFunctionalComponent1(__VLS_155, new __VLS_155({
            modelValue: (__VLS_ctx.jsonTextFields[field.key]),
            label: (__VLS_ctx.repairText(field.label)),
            hint: (field.required ? 'Obligatorio. Ingresa un JSON valido.' : 'Ingresa un JSON valido.'),
            persistentHint: true,
            autoGrow: true,
            rows: "4",
            variant: "outlined",
            readonly: (Boolean(field.readonly)),
        }));
        const __VLS_157 = __VLS_156({
            modelValue: (__VLS_ctx.jsonTextFields[field.key]),
            label: (__VLS_ctx.repairText(field.label)),
            hint: (field.required ? 'Obligatorio. Ingresa un JSON valido.' : 'Ingresa un JSON valido.'),
            persistentHint: true,
            autoGrow: true,
            rows: "4",
            variant: "outlined",
            readonly: (Boolean(field.readonly)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_156));
    }
    else {
        let __VLS_160;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent1(__VLS_160, new __VLS_160({
            modelValue: (__VLS_ctx.form[field.key]),
            type: (field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'),
            label: (__VLS_ctx.repairText(field.label)),
            hint: (__VLS_ctx.getFieldHint(field)),
            persistentHint: true,
            variant: "outlined",
            readonly: (Boolean(field.readonly)),
            loading: (__VLS_ctx.isAutoCodeField(field) && __VLS_ctx.autoCodeLoading),
        }));
        const __VLS_162 = __VLS_161({
            modelValue: (__VLS_ctx.form[field.key]),
            type: (field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'),
            label: (__VLS_ctx.repairText(field.label)),
            hint: (__VLS_ctx.getFieldHint(field)),
            persistentHint: true,
            variant: "outlined",
            readonly: (Boolean(field.readonly)),
            loading: (__VLS_ctx.isAutoCodeField(field) && __VLS_ctx.autoCodeLoading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    }
    // @ts-ignore
    [repairText, repairText, repairText, repairText, repairText, repairText, repairText, visibleFields, form, form, form, form, form, form, form, form, relationOptions, applyFormPatch, isProcedureComponentOfficialField, procedureComponentOptions, handleProcedureComponentSelected, isProcedureComponentCodeField, isMaterialField, getSelectOptions, getSelectOptions, getFieldHint, getFieldHint, getFieldHint, jsonTextFields, isAutoCodeField, autoCodeLoading,];
    var __VLS_118;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_112;
if (props.moduleKey === 'equipos') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-2" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    let __VLS_165;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_166 = __VLS_asFunctionalComponent1(__VLS_165, new __VLS_165({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_167 = __VLS_166({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_166));
    let __VLS_170;
    const __VLS_171 = ({ click: {} },
        { onClick: (__VLS_ctx.addEquipmentComponentDraft) });
    const { default: __VLS_172 } = __VLS_168.slots;
    // @ts-ignore
    [addEquipmentComponentDraft,];
    var __VLS_168;
    var __VLS_169;
    let __VLS_173;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_174 = __VLS_asFunctionalComponent1(__VLS_173, new __VLS_173({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "Define los nombres oficiales de los compartimientos y el modelo del equipo. Esta información alimenta las órdenes de trabajo y el análisis del gemelo digital.",
    }));
    const __VLS_175 = __VLS_174({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "Define los nombres oficiales de los compartimientos y el modelo del equipo. Esta información alimenta las órdenes de trabajo y el análisis del gemelo digital.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_174));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [component, index] of __VLS_vFor((__VLS_ctx.selectedEquipmentComponentRows))) {
        let __VLS_178;
        /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
        vCard;
        // @ts-ignore
        const __VLS_179 = __VLS_asFunctionalComponent1(__VLS_178, new __VLS_178({
            key: (component.id || `${component.codigo}-${index}`),
            variant: "outlined",
            rounded: "lg",
            ...{ class: "pa-3 mb-3" },
        }));
        const __VLS_180 = __VLS_179({
            key: (component.id || `${component.codigo}-${index}`),
            variant: "outlined",
            rounded: "lg",
            ...{ class: "pa-3 mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_179));
        /** @type {__VLS_StyleScopedClasses['pa-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_183 } = __VLS_181.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex align-center justify-space-between mb-3" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-subtitle-2 font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (index + 1);
        let __VLS_184;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent1(__VLS_184, new __VLS_184({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }));
        const __VLS_186 = __VLS_185({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        let __VLS_189;
        const __VLS_190 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(props.moduleKey === 'equipos'))
                        return;
                    __VLS_ctx.removeEquipmentComponentDraft(index);
                    // @ts-ignore
                    [selectedEquipmentComponentRows, removeEquipmentComponentDraft,];
                } });
        var __VLS_187;
        var __VLS_188;
        let __VLS_191;
        /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
        vRow;
        // @ts-ignore
        const __VLS_192 = __VLS_asFunctionalComponent1(__VLS_191, new __VLS_191({
            dense: true,
        }));
        const __VLS_193 = __VLS_192({
            dense: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_192));
        const { default: __VLS_196 } = __VLS_194.slots;
        let __VLS_197;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_198 = __VLS_asFunctionalComponent1(__VLS_197, new __VLS_197({
            cols: "12",
            md: "2",
        }));
        const __VLS_199 = __VLS_198({
            cols: "12",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_198));
        const { default: __VLS_202 } = __VLS_200.slots;
        let __VLS_203;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_204 = __VLS_asFunctionalComponent1(__VLS_203, new __VLS_203({
            modelValue: (component.codigo),
            label: "Código",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_205 = __VLS_204({
            modelValue: (component.codigo),
            label: "Código",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_204));
        // @ts-ignore
        [];
        var __VLS_200;
        let __VLS_208;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_209 = __VLS_asFunctionalComponent1(__VLS_208, new __VLS_208({
            cols: "12",
            md: "3",
        }));
        const __VLS_210 = __VLS_209({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_209));
        const { default: __VLS_213 } = __VLS_211.slots;
        let __VLS_214;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_215 = __VLS_asFunctionalComponent1(__VLS_214, new __VLS_214({
            modelValue: (component.nombre),
            label: "Nombre corto",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_216 = __VLS_215({
            modelValue: (component.nombre),
            label: "Nombre corto",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_215));
        // @ts-ignore
        [];
        var __VLS_211;
        let __VLS_219;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_220 = __VLS_asFunctionalComponent1(__VLS_219, new __VLS_219({
            cols: "12",
            md: "4",
        }));
        const __VLS_221 = __VLS_220({
            cols: "12",
            md: "4",
        }, ...__VLS_functionalComponentArgsRest(__VLS_220));
        const { default: __VLS_224 } = __VLS_222.slots;
        let __VLS_225;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_226 = __VLS_asFunctionalComponent1(__VLS_225, new __VLS_225({
            modelValue: (component.nombre_oficial),
            label: "Nombre oficial del compartimiento",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_227 = __VLS_226({
            modelValue: (component.nombre_oficial),
            label: "Nombre oficial del compartimiento",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_226));
        // @ts-ignore
        [];
        var __VLS_222;
        let __VLS_230;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_231 = __VLS_asFunctionalComponent1(__VLS_230, new __VLS_230({
            cols: "12",
            md: "2",
        }));
        const __VLS_232 = __VLS_231({
            cols: "12",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_231));
        const { default: __VLS_235 } = __VLS_233.slots;
        let __VLS_236;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent1(__VLS_236, new __VLS_236({
            modelValue: (component.categoria),
            items: (__VLS_ctx.equipmentComponentCategorySelectOptions(component?.categoria)),
            itemTitle: "title",
            itemValue: "value",
            label: "Categoría",
            variant: "outlined",
            density: "compact",
            clearable: true,
        }));
        const __VLS_238 = __VLS_237({
            modelValue: (component.categoria),
            items: (__VLS_ctx.equipmentComponentCategorySelectOptions(component?.categoria)),
            itemTitle: "title",
            itemValue: "value",
            label: "Categoría",
            variant: "outlined",
            density: "compact",
            clearable: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        // @ts-ignore
        [equipmentComponentCategorySelectOptions,];
        var __VLS_233;
        let __VLS_241;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_242 = __VLS_asFunctionalComponent1(__VLS_241, new __VLS_241({
            cols: "12",
            md: "1",
        }));
        const __VLS_243 = __VLS_242({
            cols: "12",
            md: "1",
        }, ...__VLS_functionalComponentArgsRest(__VLS_242));
        const { default: __VLS_246 } = __VLS_244.slots;
        let __VLS_247;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_248 = __VLS_asFunctionalComponent1(__VLS_247, new __VLS_247({
            modelValue: (component.orden),
            label: "Orden",
            type: "number",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_249 = __VLS_248({
            modelValue: (component.orden),
            label: "Orden",
            type: "number",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_248));
        // @ts-ignore
        [];
        var __VLS_244;
        let __VLS_252;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_253 = __VLS_asFunctionalComponent1(__VLS_252, new __VLS_252({
            cols: "12",
        }));
        const __VLS_254 = __VLS_253({
            cols: "12",
        }, ...__VLS_functionalComponentArgsRest(__VLS_253));
        const { default: __VLS_257 } = __VLS_255.slots;
        let __VLS_258;
        /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
        vTextarea;
        // @ts-ignore
        const __VLS_259 = __VLS_asFunctionalComponent1(__VLS_258, new __VLS_258({
            modelValue: (component.descripcion),
            label: "Descripción operativa",
            variant: "outlined",
            density: "compact",
            rows: "2",
            autoGrow: true,
        }));
        const __VLS_260 = __VLS_259({
            modelValue: (component.descripcion),
            label: "Descripción operativa",
            variant: "outlined",
            density: "compact",
            rows: "2",
            autoGrow: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_259));
        // @ts-ignore
        [];
        var __VLS_255;
        // @ts-ignore
        [];
        var __VLS_194;
        // @ts-ignore
        [];
        var __VLS_181;
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
var __VLS_106;
let __VLS_263;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_264 = __VLS_asFunctionalComponent1(__VLS_263, new __VLS_263({}));
const __VLS_265 = __VLS_264({}, ...__VLS_functionalComponentArgsRest(__VLS_264));
let __VLS_268;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent1(__VLS_268, new __VLS_268({
    ...{ class: "pa-4" },
}));
const __VLS_270 = __VLS_269({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_269));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_273 } = __VLS_271.slots;
let __VLS_274;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_275 = __VLS_asFunctionalComponent1(__VLS_274, new __VLS_274({}));
const __VLS_276 = __VLS_275({}, ...__VLS_functionalComponentArgsRest(__VLS_275));
let __VLS_279;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_280 = __VLS_asFunctionalComponent1(__VLS_279, new __VLS_279({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_281 = __VLS_280({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_280));
let __VLS_284;
const __VLS_285 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog,];
        } });
const { default: __VLS_286 } = __VLS_282.slots;
// @ts-ignore
[];
var __VLS_282;
var __VLS_283;
let __VLS_287;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_288 = __VLS_asFunctionalComponent1(__VLS_287, new __VLS_287({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}));
const __VLS_289 = __VLS_288({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_288));
let __VLS_292;
const __VLS_293 = ({ click: {} },
    { onClick: (__VLS_ctx.save) });
const { default: __VLS_294 } = __VLS_290.slots;
// @ts-ignore
[saving, save,];
var __VLS_290;
var __VLS_291;
// @ts-ignore
[];
var __VLS_271;
// @ts-ignore
[];
var __VLS_89;
// @ts-ignore
[];
var __VLS_83;
let __VLS_295;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_296 = __VLS_asFunctionalComponent1(__VLS_295, new __VLS_295({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}));
const __VLS_297 = __VLS_296({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}, ...__VLS_functionalComponentArgsRest(__VLS_296));
const { default: __VLS_300 } = __VLS_298.slots;
let __VLS_301;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent1(__VLS_301, new __VLS_301({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_303 = __VLS_302({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_306 } = __VLS_304.slots;
let __VLS_307;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_308 = __VLS_asFunctionalComponent1(__VLS_307, new __VLS_307({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_309 = __VLS_308({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_308));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_312 } = __VLS_310.slots;
// @ts-ignore
[deleteDialog, isDeleteDialogFullscreen, isDeleteDialogFullscreen,];
var __VLS_310;
let __VLS_313;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_314 = __VLS_asFunctionalComponent1(__VLS_313, new __VLS_313({}));
const __VLS_315 = __VLS_314({}, ...__VLS_functionalComponentArgsRest(__VLS_314));
const { default: __VLS_318 } = __VLS_316.slots;
// @ts-ignore
[];
var __VLS_316;
let __VLS_319;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_320 = __VLS_asFunctionalComponent1(__VLS_319, new __VLS_319({}));
const __VLS_321 = __VLS_320({}, ...__VLS_functionalComponentArgsRest(__VLS_320));
const { default: __VLS_324 } = __VLS_322.slots;
let __VLS_325;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent1(__VLS_325, new __VLS_325({}));
const __VLS_327 = __VLS_326({}, ...__VLS_functionalComponentArgsRest(__VLS_326));
let __VLS_330;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_331 = __VLS_asFunctionalComponent1(__VLS_330, new __VLS_330({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_332 = __VLS_331({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_331));
let __VLS_335;
const __VLS_336 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.deleteDialog = false;
            // @ts-ignore
            [deleteDialog,];
        } });
const { default: __VLS_337 } = __VLS_333.slots;
// @ts-ignore
[];
var __VLS_333;
var __VLS_334;
let __VLS_338;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_339 = __VLS_asFunctionalComponent1(__VLS_338, new __VLS_338({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}));
const __VLS_340 = __VLS_339({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_339));
let __VLS_343;
const __VLS_344 = ({ click: {} },
    { onClick: (__VLS_ctx.confirmDelete) });
const { default: __VLS_345 } = __VLS_341.slots;
// @ts-ignore
[saving, confirmDelete,];
var __VLS_341;
var __VLS_342;
// @ts-ignore
[];
var __VLS_322;
// @ts-ignore
[];
var __VLS_304;
// @ts-ignore
[];
var __VLS_298;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

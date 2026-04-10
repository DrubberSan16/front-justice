/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const now = new Date();
const loading = ref(false);
const saving = ref(false);
const codeLoading = ref(false);
const refreshingAll = ref(false);
const refreshingTwinId = ref(null);
const analyzingTwinId = ref(null);
const error = ref(null);
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const search = ref("");
const dashboard = ref({ kpis: [], risk_breakdown: [], rows: [] });
const equipmentOptions = ref([]);
const formDialog = ref(false);
const detailDialog = ref(false);
const editingId = ref(null);
const detail = ref(null);
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Gemelos digitales", "Gemelos Digitales"]));
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canPersistForm = computed(() => (editingId.value ? canEdit.value : canCreate.value));
const form = reactive({
    code: "",
    name: "",
    equipment_id: null,
    equipment_code: "",
    equipment_name: "",
    equipment_model: "",
    twin_type: "OPERATIVO",
    process_scope: "MANTENIMIENTO",
    ai_enabled: true,
    status: "ACTIVE",
    configNotes: "",
});
const headers = [
    { title: "Gemelo", key: "name" },
    { title: "Equipo", key: "equipment" },
    { title: "Salud", key: "health_score" },
    { title: "Riesgo", key: "risk_level" },
    { title: "Estado", key: "operational_status" },
    { title: "Horas mes", key: "metrics.planned_hours_month" },
    { title: "Actividades", key: "metrics.weekly_activity_count" },
    { title: "Lubricante", key: "lubricant" },
    { title: "Acciones", key: "actions", sortable: false, align: "end" },
];
const yearOptions = computed(() => {
    const current = now.getFullYear();
    return Array.from({ length: 12 }, (_, index) => current - 5 + index);
});
const monthOptions = [
    { value: 1, title: "Enero" },
    { value: 2, title: "Febrero" },
    { value: 3, title: "Marzo" },
    { value: 4, title: "Abril" },
    { value: 5, title: "Mayo" },
    { value: 6, title: "Junio" },
    { value: 7, title: "Julio" },
    { value: 8, title: "Agosto" },
    { value: 9, title: "Septiembre" },
    { value: 10, title: "Octubre" },
    { value: 11, title: "Noviembre" },
    { value: 12, title: "Diciembre" },
];
const dashboardRows = computed(() => dashboard.value?.rows ?? []);
const twinTypeOptions = ["OPERATIVO", "MANTENIMIENTO", "LUBRICACION", "ENERGETICO"];
const scopeOptions = ["MANTENIMIENTO", "OPERACION", "PREDICTIVO", "PLANIFICACION"];
const statusOptions = ["ACTIVE", "INACTIVE"];
function rowData(item) {
    return (item ?? {});
}
function healthColor(value) {
    const numeric = Number(value || 0);
    if (numeric < 50)
        return "error";
    if (numeric < 75)
        return "warning";
    return "success";
}
function riskColor(value) {
    if (String(value).toUpperCase() === "ALTO")
        return "error";
    if (String(value).toUpperCase() === "MEDIO")
        return "warning";
    return "success";
}
function statusColor(value) {
    if (String(value).toUpperCase() === "CRITICO")
        return "error";
    if (String(value).toUpperCase() === "EN_OBSERVACION")
        return "warning";
    return "success";
}
function severityColor(value) {
    if (String(value).toUpperCase() === "CRITICAL")
        return "error";
    if (String(value).toUpperCase() === "WARNING")
        return "warning";
    return "info";
}
function riskPercent(value) {
    const total = Math.max(Number(dashboardRows.value.length || 1), 1);
    return (Number(value || 0) / total) * 100;
}
function formatDate(value) {
    if (!value)
        return "Sin fecha";
    return new Date(value).toLocaleString("es-EC");
}
function displaySignalValue(signal) {
    const value = signal.signal_value ?? signal.value ?? 0;
    const unit = signal.signal_unit ?? signal.unit ?? "";
    return `${value}${unit ? ` ${unit}` : ""}`;
}
function insightNationalModels(insight) {
    const payload = insight?.payload_json;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
        return [];
    const models = payload.national_models;
    if (!Array.isArray(models))
        return [];
    return models.filter((item) => item && typeof item === "object" && !Array.isArray(item) && String(item.model || "").trim());
}
function insightImprovementSteps(insight) {
    const payload = insight?.payload_json;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
        return [];
    const steps = payload.improvement_steps;
    if (!Array.isArray(steps))
        return [];
    return steps.filter((step) => typeof step === "string" && step.trim().length > 0);
}
function insightRecommendedMaterials(insight) {
    const payload = insight?.payload_json;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
        return [];
    const materials = payload.recommended_materials;
    if (!Array.isArray(materials))
        return [];
    return materials.filter((item) => item && typeof item === "object");
}
function lubricantMatchColor(value) {
    const normalized = String(value || "").toUpperCase();
    if (normalized === "NO_COINCIDE")
        return "error";
    if (normalized === "SIN_REFERENCIA" || normalized === "SIN_ANALISIS")
        return "warning";
    return "success";
}
async function loadDashboard() {
    loading.value = true;
    error.value = null;
    try {
        const { data } = await api.get("/kpi_process/digital-twins/dashboard", {
            params: {
                year: selectedYear.value,
                month: selectedMonth.value,
                search: search.value || undefined,
            },
        });
        dashboard.value = data;
    }
    catch (err) {
        error.value =
            err?.response?.data?.message ||
                "No se pudo cargar el dashboard de gemelos digitales.";
    }
    finally {
        loading.value = false;
    }
}
async function loadEquipmentOptions() {
    const { data } = await api.get("/kpi_process/digital-twins/equipment-options");
    equipmentOptions.value = Array.isArray(data)
        ? data.map((item) => ({
            ...item,
            label: [
                item.codigo,
                item.nombre_real || item.nombre,
                item.modelo || null,
            ]
                .filter(Boolean)
                .join(" · ") || item.label,
        }))
        : [];
}
async function openCreate() {
    if (!canCreate.value)
        return;
    editingId.value = null;
    Object.assign(form, {
        code: "",
        name: "",
        equipment_id: null,
        equipment_code: "",
        equipment_name: "",
        equipment_model: "",
        twin_type: "OPERATIVO",
        process_scope: "MANTENIMIENTO",
        ai_enabled: true,
        status: "ACTIVE",
        configNotes: "",
    });
    codeLoading.value = true;
    try {
        await loadEquipmentOptions();
        const { data } = await api.get("/kpi_process/digital-twins/next-code");
        form.code = data.code;
        formDialog.value = true;
    }
    finally {
        codeLoading.value = false;
    }
}
async function openEdit(id) {
    if (!canEdit.value)
        return;
    if (!id)
        return;
    loading.value = true;
    try {
        await loadEquipmentOptions();
        const { data } = await api.get(`/kpi_process/digital-twins/${id}`);
        editingId.value = id;
        Object.assign(form, {
            code: data.code || "",
            name: data.name || "",
            equipment_id: data.equipment_id || null,
            equipment_code: data.equipment_code || "",
            equipment_name: data.equipment_name || "",
            equipment_model: data.equipment_model || "",
            twin_type: data.twin_type || "OPERATIVO",
            process_scope: data.process_scope || "MANTENIMIENTO",
            ai_enabled: Boolean(data.ai_enabled ?? true),
            status: data.status || "ACTIVE",
            configNotes: String(data.config_json?.notes || ""),
        });
        formDialog.value = true;
    }
    finally {
        loading.value = false;
    }
}
function handleEquipmentSelected(value) {
    const selected = equipmentOptions.value.find((item) => item.id === value);
    if (!selected)
        return;
    form.equipment_code = selected.codigo || "";
    form.equipment_name = selected.nombre_real || selected.nombre || "";
    form.equipment_model = selected.modelo || form.equipment_model || "";
    if (!form.name.trim()) {
        form.name = `Gemelo ${selected.codigo || selected.nombre_real || selected.nombre}`;
    }
}
async function saveTwin() {
    if (!canPersistForm.value)
        return;
    saving.value = true;
    try {
        const payload = {
            code: form.code,
            name: form.name,
            equipment_id: form.equipment_id,
            equipment_code: form.equipment_code,
            equipment_name: form.equipment_name,
            equipment_model: form.equipment_model,
            twin_type: form.twin_type,
            process_scope: form.process_scope,
            ai_enabled: form.ai_enabled,
            status: form.status,
            config_json: { notes: form.configNotes || null },
            updated_by: auth.user?.nameUser || auth.user?.nameSurname || "frontend",
        };
        if (editingId.value) {
            await api.patch(`/kpi_process/digital-twins/${editingId.value}`, payload);
            ui.success("Gemelo digital actualizado.");
        }
        else {
            await api.post("/kpi_process/digital-twins", payload);
            ui.success("Gemelo digital creado.");
        }
        formDialog.value = false;
        await loadDashboard();
    }
    catch (err) {
        ui.error(err?.response?.data?.message || "No se pudo guardar el gemelo digital.");
    }
    finally {
        saving.value = false;
    }
}
async function openDetail(row) {
    const id = row?.twin?.id;
    if (!id)
        return;
    loading.value = true;
    try {
        const { data } = await api.get(`/kpi_process/digital-twins/${id}/detail`, {
            params: { year: selectedYear.value, month: selectedMonth.value },
        });
        detail.value = data;
        detailDialog.value = true;
    }
    catch (err) {
        ui.error(err?.response?.data?.message || "No se pudo cargar el detalle del gemelo digital.");
    }
    finally {
        loading.value = false;
    }
}
async function refreshTwin(row) {
    const id = row?.twin?.id || row?.snapshot?.twin?.id;
    if (!id)
        return;
    refreshingTwinId.value = id;
    try {
        await api.post(`/kpi_process/digital-twins/${id}/refresh`, {
            year: selectedYear.value,
            month: selectedMonth.value,
        });
        await loadDashboard();
        if (detail.value?.twin?.id === id) {
            await openDetail({ twin: { id } });
        }
        ui.success("Snapshot del gemelo recalculado.");
    }
    catch (err) {
        ui.error(err?.response?.data?.message || "No se pudo recalcular el gemelo.");
    }
    finally {
        refreshingTwinId.value = null;
    }
}
async function analyzeTwin(row) {
    const id = row?.twin?.id || row?.snapshot?.twin?.id;
    if (!id)
        return;
    analyzingTwinId.value = id;
    try {
        await api.post(`/kpi_process/digital-twins/${id}/ai-analysis`, {
            year: selectedYear.value,
            month: selectedMonth.value,
            created_by: auth.user?.nameUser || auth.user?.nameSurname || "frontend",
        });
        if (detail.value?.twin?.id === id) {
            await openDetail({ twin: { id } });
        }
        await loadDashboard();
        ui.success("Análisis del gemelo generado.");
    }
    catch (err) {
        ui.error(err?.response?.data?.message || "No se pudo generar el análisis IA.");
    }
    finally {
        analyzingTwinId.value = null;
    }
}
async function refreshAll() {
    refreshingAll.value = true;
    try {
        await api.post("/kpi_process/digital-twins/refresh-all", {
            year: selectedYear.value,
            month: selectedMonth.value,
            search: search.value || undefined,
        });
        await loadDashboard();
        ui.success("KPI de gemelos digitales recalculados.");
    }
    catch (err) {
        ui.error(err?.response?.data?.message || "No se pudieron recalcular los KPI.");
    }
    finally {
        refreshingAll.value = false;
    }
}
async function removeTwin(row) {
    if (!canDelete.value)
        return;
    const id = row?.twin?.id;
    const label = row?.twin?.name || row?.twin?.code || "este gemelo digital";
    if (!id)
        return;
    if (!window.confirm(`Se eliminará ${label}. ¿Deseas continuar?`))
        return;
    loading.value = true;
    try {
        await api.delete(`/kpi_process/digital-twins/${id}`);
        if (detail.value?.twin?.id === id) {
            detailDialog.value = false;
            detail.value = null;
        }
        ui.success("Gemelo digital eliminado.");
        await loadDashboard();
    }
    catch (err) {
        ui.error(err?.response?.data?.message || "No se pudo eliminar el gemelo digital.");
    }
    finally {
        loading.value = false;
    }
}
watch([selectedYear, selectedMonth], () => {
    loadDashboard();
});
watch(search, () => {
    loadDashboard();
});
onMounted(() => {
    loadDashboard();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['twin-kpi-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "digital-twins-page" },
});
/** @type {__VLS_StyleScopedClasses['digital-twins-page']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    rounded: "xl",
    ...{ class: "pa-5 enterprise-surface" },
}));
const __VLS_2 = __VLS_1({
    rounded: "xl",
    ...{ class: "pa-5 enterprise-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "responsive-header page-wrap" },
});
/** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "responsive-actions page-wrap" },
});
/** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
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
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
    ...{ 'onClick': {} },
    color: "secondary",
    variant: "tonal",
    prependIcon: "mdi-sync",
    loading: (__VLS_ctx.refreshingAll),
}));
const __VLS_16 = __VLS_15({
    ...{ 'onClick': {} },
    color: "secondary",
    variant: "tonal",
    prependIcon: "mdi-sync",
    loading: (__VLS_ctx.refreshingAll),
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
let __VLS_19;
const __VLS_20 = ({ click: {} },
    { onClick: (__VLS_ctx.refreshAll) });
const { default: __VLS_21 } = __VLS_17.slots;
// @ts-ignore
[refreshingAll, refreshAll,];
var __VLS_17;
var __VLS_18;
let __VLS_22;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-refresh",
    loading: (__VLS_ctx.loading),
}));
const __VLS_24 = __VLS_23({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-refresh",
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_27;
const __VLS_28 = ({ click: {} },
    { onClick: (__VLS_ctx.loadDashboard) });
const { default: __VLS_29 } = __VLS_25.slots;
// @ts-ignore
[loading, loadDashboard,];
var __VLS_25;
var __VLS_26;
if (__VLS_ctx.error) {
    let __VLS_30;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        type: "warning",
        variant: "tonal",
        ...{ class: "mt-4" },
        text: (__VLS_ctx.error),
    }));
    const __VLS_32 = __VLS_31({
        type: "warning",
        variant: "tonal",
        ...{ class: "mt-4" },
        text: (__VLS_ctx.error),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
}
let __VLS_35;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({
    dense: true,
    ...{ class: "mt-3" },
}));
const __VLS_37 = __VLS_36({
    dense: true,
    ...{ class: "mt-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
const { default: __VLS_40 } = __VLS_38.slots;
let __VLS_41;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
    cols: "12",
    md: "3",
}));
const __VLS_43 = __VLS_42({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
const { default: __VLS_46 } = __VLS_44.slots;
let __VLS_47;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
    modelValue: (__VLS_ctx.selectedYear),
    items: (__VLS_ctx.yearOptions),
    label: "Año",
    variant: "outlined",
    density: "compact",
}));
const __VLS_49 = __VLS_48({
    modelValue: (__VLS_ctx.selectedYear),
    items: (__VLS_ctx.yearOptions),
    label: "Año",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
// @ts-ignore
[error, error, selectedYear, yearOptions,];
var __VLS_44;
let __VLS_52;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
    cols: "12",
    md: "3",
}));
const __VLS_54 = __VLS_53({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
const { default: __VLS_57 } = __VLS_55.slots;
let __VLS_58;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
    modelValue: (__VLS_ctx.selectedMonth),
    items: (__VLS_ctx.monthOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Mes",
    variant: "outlined",
    density: "compact",
}));
const __VLS_60 = __VLS_59({
    modelValue: (__VLS_ctx.selectedMonth),
    items: (__VLS_ctx.monthOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Mes",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
// @ts-ignore
[selectedMonth, monthOptions,];
var __VLS_55;
let __VLS_63;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
    cols: "12",
    md: "6",
}));
const __VLS_65 = __VLS_64({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
const { default: __VLS_68 } = __VLS_66.slots;
let __VLS_69;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
    modelValue: (__VLS_ctx.search),
    label: "Buscar por código, gemelo, equipo o modelo",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    clearable: true,
}));
const __VLS_71 = __VLS_70({
    modelValue: (__VLS_ctx.search),
    label: "Buscar por código, gemelo, equipo o modelo",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_70));
// @ts-ignore
[search,];
var __VLS_66;
// @ts-ignore
[];
var __VLS_38;
let __VLS_74;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent1(__VLS_74, new __VLS_74({
    dense: true,
    ...{ class: "mt-1" },
}));
const __VLS_76 = __VLS_75({
    dense: true,
    ...{ class: "mt-1" },
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
const { default: __VLS_79 } = __VLS_77.slots;
for (const [card] of __VLS_vFor((__VLS_ctx.dashboard.kpis))) {
    let __VLS_80;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
        key: (card.key),
        cols: "12",
        sm: "6",
        xl: "3",
    }));
    const __VLS_82 = __VLS_81({
        key: (card.key),
        cols: "12",
        sm: "6",
        xl: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    const { default: __VLS_85 } = __VLS_83.slots;
    let __VLS_86;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100 twin-kpi-card" },
    }));
    const __VLS_88 = __VLS_87({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100 twin-kpi-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_87));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['twin-kpi-card']} */ ;
    const { default: __VLS_91 } = __VLS_89.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (card.label);
    let __VLS_92;
    /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
    vIcon;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent1(__VLS_92, new __VLS_92({
        icon: (card.icon),
        size: "20",
    }));
    const __VLS_94 = __VLS_93({
        icon: (card.icon),
        size: "20",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h4 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h4']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (card.value);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    (card.helper);
    // @ts-ignore
    [dashboard,];
    var __VLS_89;
    // @ts-ignore
    [];
    var __VLS_83;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_77;
let __VLS_97;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent1(__VLS_97, new __VLS_97({
    dense: true,
    ...{ class: "mt-2" },
}));
const __VLS_99 = __VLS_98({
    dense: true,
    ...{ class: "mt-2" },
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
const { default: __VLS_102 } = __VLS_100.slots;
for (const [risk] of __VLS_vFor((__VLS_ctx.dashboard.risk_breakdown))) {
    let __VLS_103;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({
        cols: "12",
        md: "4",
        key: (risk.label),
    }));
    const __VLS_105 = __VLS_104({
        cols: "12",
        md: "4",
        key: (risk.label),
    }, ...__VLS_functionalComponentArgsRest(__VLS_104));
    const { default: __VLS_108 } = __VLS_106.slots;
    let __VLS_109;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_110 = __VLS_asFunctionalComponent1(__VLS_109, new __VLS_109({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4" },
    }));
    const __VLS_111 = __VLS_110({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_110));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_114 } = __VLS_112.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    (risk.label);
    let __VLS_115;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
        color: (risk.color),
        variant: "tonal",
        label: true,
    }));
    const __VLS_117 = __VLS_116({
        color: (risk.color),
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_116));
    const { default: __VLS_120 } = __VLS_118.slots;
    (risk.value);
    // @ts-ignore
    [dashboard,];
    var __VLS_118;
    let __VLS_121;
    /** @ts-ignore @type {typeof __VLS_components.vProgressLinear | typeof __VLS_components.VProgressLinear} */
    vProgressLinear;
    // @ts-ignore
    const __VLS_122 = __VLS_asFunctionalComponent1(__VLS_121, new __VLS_121({
        modelValue: (__VLS_ctx.riskPercent(risk.value)),
        color: (risk.color),
        height: "10",
        rounded: true,
    }));
    const __VLS_123 = __VLS_122({
        modelValue: (__VLS_ctx.riskPercent(risk.value)),
        color: (risk.color),
        height: "10",
        rounded: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_122));
    // @ts-ignore
    [riskPercent,];
    var __VLS_112;
    // @ts-ignore
    [];
    var __VLS_106;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_100;
// @ts-ignore
[];
var __VLS_3;
let __VLS_126;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
    rounded: "xl",
    ...{ class: "pa-4 enterprise-surface mt-4" },
}));
const __VLS_128 = __VLS_127({
    rounded: "xl",
    ...{ class: "pa-4 enterprise-surface mt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
const { default: __VLS_131 } = __VLS_129.slots;
let __VLS_132;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent1(__VLS_132, new __VLS_132({
    headers: (__VLS_ctx.headers),
    items: (__VLS_ctx.dashboardRows),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo gemelos digitales...",
    itemsPerPage: (15),
    ...{ class: "enterprise-table" },
}));
const __VLS_134 = __VLS_133({
    headers: (__VLS_ctx.headers),
    items: (__VLS_ctx.dashboardRows),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo gemelos digitales...",
    itemsPerPage: (15),
    ...{ class: "enterprise-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
const { default: __VLS_137 } = __VLS_135.slots;
{
    const { 'item.name': __VLS_138 } = __VLS_135.slots;
    const [{ item }] = __VLS_vSlot(__VLS_138);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.rowData(item).twin?.name || "Sin nombre");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.rowData(item).twin?.code || "Sin código");
    // @ts-ignore
    [loading, headers, dashboardRows, rowData, rowData,];
}
{
    const { 'item.equipment': __VLS_139 } = __VLS_135.slots;
    const [{ item }] = __VLS_vSlot(__VLS_139);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.rowData(item).twin?.equipment_name || "Sin equipo");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.rowData(item).twin?.equipment_code || "Sin código");
    if (__VLS_ctx.rowData(item).twin?.equipment_model) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.rowData(item).twin?.equipment_model);
    }
    // @ts-ignore
    [rowData, rowData, rowData, rowData,];
}
{
    const { 'item.health_score': __VLS_140 } = __VLS_135.slots;
    const [{ item }] = __VLS_vSlot(__VLS_140);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.rowData(item).health_score);
    let __VLS_141;
    /** @ts-ignore @type {typeof __VLS_components.vProgressLinear | typeof __VLS_components.VProgressLinear} */
    vProgressLinear;
    // @ts-ignore
    const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({
        modelValue: (Number(__VLS_ctx.rowData(item).health_score || 0)),
        color: (__VLS_ctx.healthColor(__VLS_ctx.rowData(item).health_score)),
        height: "8",
        rounded: true,
    }));
    const __VLS_143 = __VLS_142({
        modelValue: (Number(__VLS_ctx.rowData(item).health_score || 0)),
        color: (__VLS_ctx.healthColor(__VLS_ctx.rowData(item).health_score)),
        height: "8",
        rounded: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_142));
    // @ts-ignore
    [rowData, rowData, rowData, healthColor,];
}
{
    const { 'item.risk_level': __VLS_146 } = __VLS_135.slots;
    const [{ item }] = __VLS_vSlot(__VLS_146);
    let __VLS_147;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
        color: (__VLS_ctx.riskColor(__VLS_ctx.rowData(item).risk_level)),
        variant: "tonal",
        label: true,
        size: "small",
    }));
    const __VLS_149 = __VLS_148({
        color: (__VLS_ctx.riskColor(__VLS_ctx.rowData(item).risk_level)),
        variant: "tonal",
        label: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    const { default: __VLS_152 } = __VLS_150.slots;
    (__VLS_ctx.rowData(item).risk_level);
    // @ts-ignore
    [rowData, rowData, riskColor,];
    var __VLS_150;
    // @ts-ignore
    [];
}
{
    const { 'item.operational_status': __VLS_153 } = __VLS_135.slots;
    const [{ item }] = __VLS_vSlot(__VLS_153);
    let __VLS_154;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_155 = __VLS_asFunctionalComponent1(__VLS_154, new __VLS_154({
        color: (__VLS_ctx.statusColor(__VLS_ctx.rowData(item).operational_status)),
        variant: "tonal",
        label: true,
        size: "small",
    }));
    const __VLS_156 = __VLS_155({
        color: (__VLS_ctx.statusColor(__VLS_ctx.rowData(item).operational_status)),
        variant: "tonal",
        label: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_155));
    const { default: __VLS_159 } = __VLS_157.slots;
    (__VLS_ctx.rowData(item).operational_status);
    // @ts-ignore
    [rowData, rowData, statusColor,];
    var __VLS_157;
    // @ts-ignore
    [];
}
{
    const { 'item.lubricant': __VLS_160 } = __VLS_135.slots;
    const [{ item }] = __VLS_vSlot(__VLS_160);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.rowData(item).lubricant?.latest_state || "SIN_ANALISIS");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.rowData(item).lubricant?.latest_report_date || "Sin reporte");
    // @ts-ignore
    [rowData, rowData,];
}
{
    const { 'item.actions': __VLS_161 } = __VLS_135.slots;
    const [{ item }] = __VLS_vSlot(__VLS_161);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-actions justify-end" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    let __VLS_162;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
        ...{ 'onClick': {} },
        icon: "mdi-eye",
        variant: "text",
    }));
    const __VLS_164 = __VLS_163({
        ...{ 'onClick': {} },
        icon: "mdi-eye",
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    let __VLS_167;
    const __VLS_168 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.openDetail(__VLS_ctx.rowData(item));
                // @ts-ignore
                [rowData, openDetail,];
            } });
    var __VLS_165;
    var __VLS_166;
    let __VLS_169;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_170 = __VLS_asFunctionalComponent1(__VLS_169, new __VLS_169({
        ...{ 'onClick': {} },
        icon: "mdi-robot-industrial",
        variant: "text",
        color: "secondary",
        loading: (__VLS_ctx.analyzingTwinId === __VLS_ctx.rowData(item).twin?.id),
    }));
    const __VLS_171 = __VLS_170({
        ...{ 'onClick': {} },
        icon: "mdi-robot-industrial",
        variant: "text",
        color: "secondary",
        loading: (__VLS_ctx.analyzingTwinId === __VLS_ctx.rowData(item).twin?.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_170));
    let __VLS_174;
    const __VLS_175 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.analyzeTwin(__VLS_ctx.rowData(item));
                // @ts-ignore
                [rowData, rowData, analyzingTwinId, analyzeTwin,];
            } });
    var __VLS_172;
    var __VLS_173;
    let __VLS_176;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({
        ...{ 'onClick': {} },
        icon: "mdi-sync",
        variant: "text",
        color: "primary",
        loading: (__VLS_ctx.refreshingTwinId === __VLS_ctx.rowData(item).twin?.id),
    }));
    const __VLS_178 = __VLS_177({
        ...{ 'onClick': {} },
        icon: "mdi-sync",
        variant: "text",
        color: "primary",
        loading: (__VLS_ctx.refreshingTwinId === __VLS_ctx.rowData(item).twin?.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    let __VLS_181;
    const __VLS_182 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.refreshTwin(__VLS_ctx.rowData(item));
                // @ts-ignore
                [rowData, rowData, refreshingTwinId, refreshTwin,];
            } });
    var __VLS_179;
    var __VLS_180;
    if (__VLS_ctx.canEdit) {
        let __VLS_183;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_184 = __VLS_asFunctionalComponent1(__VLS_183, new __VLS_183({
            ...{ 'onClick': {} },
            icon: "mdi-pencil",
            variant: "text",
        }));
        const __VLS_185 = __VLS_184({
            ...{ 'onClick': {} },
            icon: "mdi-pencil",
            variant: "text",
        }, ...__VLS_functionalComponentArgsRest(__VLS_184));
        let __VLS_188;
        const __VLS_189 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canEdit))
                        return;
                    __VLS_ctx.openEdit(__VLS_ctx.rowData(item).twin?.id);
                    // @ts-ignore
                    [rowData, canEdit, openEdit,];
                } });
        var __VLS_186;
        var __VLS_187;
    }
    if (__VLS_ctx.canDelete) {
        let __VLS_190;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_191 = __VLS_asFunctionalComponent1(__VLS_190, new __VLS_190({
            ...{ 'onClick': {} },
            icon: "mdi-delete-outline",
            variant: "text",
            color: "error",
        }));
        const __VLS_192 = __VLS_191({
            ...{ 'onClick': {} },
            icon: "mdi-delete-outline",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_191));
        let __VLS_195;
        const __VLS_196 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canDelete))
                        return;
                    __VLS_ctx.removeTwin(__VLS_ctx.rowData(item));
                    // @ts-ignore
                    [rowData, canDelete, removeTwin,];
                } });
        var __VLS_193;
        var __VLS_194;
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_135;
// @ts-ignore
[];
var __VLS_129;
let __VLS_197;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent1(__VLS_197, new __VLS_197({
    modelValue: (__VLS_ctx.formDialog),
    maxWidth: (920),
}));
const __VLS_199 = __VLS_198({
    modelValue: (__VLS_ctx.formDialog),
    maxWidth: (920),
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
const { default: __VLS_202 } = __VLS_200.slots;
let __VLS_203;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_204 = __VLS_asFunctionalComponent1(__VLS_203, new __VLS_203({
    rounded: "xl",
}));
const __VLS_205 = __VLS_204({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_204));
const { default: __VLS_208 } = __VLS_206.slots;
let __VLS_209;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent1(__VLS_209, new __VLS_209({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_211 = __VLS_210({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_214 } = __VLS_212.slots;
(__VLS_ctx.editingId ? "Editar gemelo digital" : "Nuevo gemelo digital");
// @ts-ignore
[formDialog, editingId,];
var __VLS_212;
let __VLS_215;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_216 = __VLS_asFunctionalComponent1(__VLS_215, new __VLS_215({}));
const __VLS_217 = __VLS_216({}, ...__VLS_functionalComponentArgsRest(__VLS_216));
let __VLS_220;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent1(__VLS_220, new __VLS_220({
    ...{ class: "pt-4" },
}));
const __VLS_222 = __VLS_221({
    ...{ class: "pt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
const { default: __VLS_225 } = __VLS_223.slots;
let __VLS_226;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent1(__VLS_226, new __VLS_226({
    dense: true,
}));
const __VLS_228 = __VLS_227({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
const { default: __VLS_231 } = __VLS_229.slots;
let __VLS_232;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent1(__VLS_232, new __VLS_232({
    cols: "12",
    md: "4",
}));
const __VLS_234 = __VLS_233({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
const { default: __VLS_237 } = __VLS_235.slots;
let __VLS_238;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_239 = __VLS_asFunctionalComponent1(__VLS_238, new __VLS_238({
    modelValue: (__VLS_ctx.form.code),
    label: "Código",
    variant: "outlined",
    readonly: true,
    loading: (__VLS_ctx.codeLoading),
}));
const __VLS_240 = __VLS_239({
    modelValue: (__VLS_ctx.form.code),
    label: "Código",
    variant: "outlined",
    readonly: true,
    loading: (__VLS_ctx.codeLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_239));
// @ts-ignore
[form, codeLoading,];
var __VLS_235;
let __VLS_243;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent1(__VLS_243, new __VLS_243({
    cols: "12",
    md: "8",
}));
const __VLS_245 = __VLS_244({
    cols: "12",
    md: "8",
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
const { default: __VLS_248 } = __VLS_246.slots;
let __VLS_249;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent1(__VLS_249, new __VLS_249({
    modelValue: (__VLS_ctx.form.name),
    label: "Nombre del gemelo",
    variant: "outlined",
}));
const __VLS_251 = __VLS_250({
    modelValue: (__VLS_ctx.form.name),
    label: "Nombre del gemelo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
// @ts-ignore
[form,];
var __VLS_246;
let __VLS_254;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_255 = __VLS_asFunctionalComponent1(__VLS_254, new __VLS_254({
    cols: "12",
    md: "6",
}));
const __VLS_256 = __VLS_255({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_255));
const { default: __VLS_259 } = __VLS_257.slots;
let __VLS_260;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent1(__VLS_260, new __VLS_260({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.form.equipment_id),
    items: (__VLS_ctx.equipmentOptions),
    itemTitle: "label",
    itemValue: "id",
    label: "Equipo asociado",
    variant: "outlined",
    clearable: true,
}));
const __VLS_262 = __VLS_261({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.form.equipment_id),
    items: (__VLS_ctx.equipmentOptions),
    itemTitle: "label",
    itemValue: "id",
    label: "Equipo asociado",
    variant: "outlined",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
let __VLS_265;
const __VLS_266 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.handleEquipmentSelected) });
var __VLS_263;
var __VLS_264;
// @ts-ignore
[form, equipmentOptions, handleEquipmentSelected,];
var __VLS_257;
let __VLS_267;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
    cols: "12",
    md: "3",
}));
const __VLS_269 = __VLS_268({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
const { default: __VLS_272 } = __VLS_270.slots;
let __VLS_273;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent1(__VLS_273, new __VLS_273({
    modelValue: (__VLS_ctx.form.equipment_code),
    label: "Código equipo",
    variant: "outlined",
}));
const __VLS_275 = __VLS_274({
    modelValue: (__VLS_ctx.form.equipment_code),
    label: "Código equipo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
// @ts-ignore
[form,];
var __VLS_270;
let __VLS_278;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_279 = __VLS_asFunctionalComponent1(__VLS_278, new __VLS_278({
    cols: "12",
    md: "3",
}));
const __VLS_280 = __VLS_279({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_279));
const { default: __VLS_283 } = __VLS_281.slots;
let __VLS_284;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_285 = __VLS_asFunctionalComponent1(__VLS_284, new __VLS_284({
    modelValue: (__VLS_ctx.form.equipment_name),
    label: "Nombre equipo",
    variant: "outlined",
}));
const __VLS_286 = __VLS_285({
    modelValue: (__VLS_ctx.form.equipment_name),
    label: "Nombre equipo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_285));
// @ts-ignore
[form,];
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
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_296 = __VLS_asFunctionalComponent1(__VLS_295, new __VLS_295({
    modelValue: (__VLS_ctx.form.equipment_model),
    label: "Modelo",
    variant: "outlined",
}));
const __VLS_297 = __VLS_296({
    modelValue: (__VLS_ctx.form.equipment_model),
    label: "Modelo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_296));
// @ts-ignore
[form,];
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
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_307 = __VLS_asFunctionalComponent1(__VLS_306, new __VLS_306({
    modelValue: (__VLS_ctx.form.twin_type),
    items: (__VLS_ctx.twinTypeOptions),
    label: "Tipo de gemelo",
    variant: "outlined",
}));
const __VLS_308 = __VLS_307({
    modelValue: (__VLS_ctx.form.twin_type),
    items: (__VLS_ctx.twinTypeOptions),
    label: "Tipo de gemelo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_307));
// @ts-ignore
[form, twinTypeOptions,];
var __VLS_303;
let __VLS_311;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_312 = __VLS_asFunctionalComponent1(__VLS_311, new __VLS_311({
    cols: "12",
    md: "4",
}));
const __VLS_313 = __VLS_312({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_312));
const { default: __VLS_316 } = __VLS_314.slots;
let __VLS_317;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_318 = __VLS_asFunctionalComponent1(__VLS_317, new __VLS_317({
    modelValue: (__VLS_ctx.form.process_scope),
    items: (__VLS_ctx.scopeOptions),
    label: "Alcance",
    variant: "outlined",
}));
const __VLS_319 = __VLS_318({
    modelValue: (__VLS_ctx.form.process_scope),
    items: (__VLS_ctx.scopeOptions),
    label: "Alcance",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_318));
// @ts-ignore
[form, scopeOptions,];
var __VLS_314;
let __VLS_322;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_323 = __VLS_asFunctionalComponent1(__VLS_322, new __VLS_322({
    cols: "12",
    md: "6",
}));
const __VLS_324 = __VLS_323({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_323));
const { default: __VLS_327 } = __VLS_325.slots;
let __VLS_328;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent1(__VLS_328, new __VLS_328({
    modelValue: (__VLS_ctx.form.status),
    items: (__VLS_ctx.statusOptions),
    label: "Estado",
    variant: "outlined",
}));
const __VLS_330 = __VLS_329({
    modelValue: (__VLS_ctx.form.status),
    items: (__VLS_ctx.statusOptions),
    label: "Estado",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
// @ts-ignore
[form, statusOptions,];
var __VLS_325;
let __VLS_333;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent1(__VLS_333, new __VLS_333({
    cols: "12",
    md: "6",
    ...{ class: "d-flex align-center" },
}));
const __VLS_335 = __VLS_334({
    cols: "12",
    md: "6",
    ...{ class: "d-flex align-center" },
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
const { default: __VLS_338 } = __VLS_336.slots;
let __VLS_339;
/** @ts-ignore @type {typeof __VLS_components.vSwitch | typeof __VLS_components.VSwitch} */
vSwitch;
// @ts-ignore
const __VLS_340 = __VLS_asFunctionalComponent1(__VLS_339, new __VLS_339({
    modelValue: (__VLS_ctx.form.ai_enabled),
    color: "primary",
    inset: true,
    label: "Análisis IA habilitado",
}));
const __VLS_341 = __VLS_340({
    modelValue: (__VLS_ctx.form.ai_enabled),
    color: "primary",
    inset: true,
    label: "Análisis IA habilitado",
}, ...__VLS_functionalComponentArgsRest(__VLS_340));
// @ts-ignore
[form,];
var __VLS_336;
let __VLS_344;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_345 = __VLS_asFunctionalComponent1(__VLS_344, new __VLS_344({
    cols: "12",
}));
const __VLS_346 = __VLS_345({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_345));
const { default: __VLS_349 } = __VLS_347.slots;
let __VLS_350;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_351 = __VLS_asFunctionalComponent1(__VLS_350, new __VLS_350({
    modelValue: (__VLS_ctx.form.configNotes),
    label: "Notas operativas / contexto",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
}));
const __VLS_352 = __VLS_351({
    modelValue: (__VLS_ctx.form.configNotes),
    label: "Notas operativas / contexto",
    variant: "outlined",
    rows: "3",
    autoGrow: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_351));
// @ts-ignore
[form,];
var __VLS_347;
// @ts-ignore
[];
var __VLS_229;
// @ts-ignore
[];
var __VLS_223;
let __VLS_355;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_356 = __VLS_asFunctionalComponent1(__VLS_355, new __VLS_355({}));
const __VLS_357 = __VLS_356({}, ...__VLS_functionalComponentArgsRest(__VLS_356));
let __VLS_360;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_361 = __VLS_asFunctionalComponent1(__VLS_360, new __VLS_360({
    ...{ class: "pa-4" },
}));
const __VLS_362 = __VLS_361({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_361));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_365 } = __VLS_363.slots;
let __VLS_366;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_367 = __VLS_asFunctionalComponent1(__VLS_366, new __VLS_366({}));
const __VLS_368 = __VLS_367({}, ...__VLS_functionalComponentArgsRest(__VLS_367));
let __VLS_371;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_372 = __VLS_asFunctionalComponent1(__VLS_371, new __VLS_371({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_373 = __VLS_372({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_372));
let __VLS_376;
const __VLS_377 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.formDialog = false;
            // @ts-ignore
            [formDialog,];
        } });
const { default: __VLS_378 } = __VLS_374.slots;
// @ts-ignore
[];
var __VLS_374;
var __VLS_375;
if (__VLS_ctx.canPersistForm) {
    let __VLS_379;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_380 = __VLS_asFunctionalComponent1(__VLS_379, new __VLS_379({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_381 = __VLS_380({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_380));
    let __VLS_384;
    const __VLS_385 = ({ click: {} },
        { onClick: (__VLS_ctx.saveTwin) });
    const { default: __VLS_386 } = __VLS_382.slots;
    // @ts-ignore
    [canPersistForm, saving, saveTwin,];
    var __VLS_382;
    var __VLS_383;
}
// @ts-ignore
[];
var __VLS_363;
// @ts-ignore
[];
var __VLS_206;
// @ts-ignore
[];
var __VLS_200;
let __VLS_387;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_388 = __VLS_asFunctionalComponent1(__VLS_387, new __VLS_387({
    modelValue: (__VLS_ctx.detailDialog),
    maxWidth: (1200),
}));
const __VLS_389 = __VLS_388({
    modelValue: (__VLS_ctx.detailDialog),
    maxWidth: (1200),
}, ...__VLS_functionalComponentArgsRest(__VLS_388));
const { default: __VLS_392 } = __VLS_390.slots;
let __VLS_393;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_394 = __VLS_asFunctionalComponent1(__VLS_393, new __VLS_393({
    rounded: "xl",
}));
const __VLS_395 = __VLS_394({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_394));
const { default: __VLS_398 } = __VLS_396.slots;
let __VLS_399;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_400 = __VLS_asFunctionalComponent1(__VLS_399, new __VLS_399({
    ...{ class: "text-subtitle-1 font-weight-bold d-flex align-center justify-space-between" },
    ...{ style: {} },
}));
const __VLS_401 = __VLS_400({
    ...{ class: "text-subtitle-1 font-weight-bold d-flex align-center justify-space-between" },
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_400));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
const { default: __VLS_404 } = __VLS_402.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.detail?.twin?.name || "Detalle del gemelo digital");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "responsive-actions" },
});
/** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
let __VLS_405;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_406 = __VLS_asFunctionalComponent1(__VLS_405, new __VLS_405({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-sync",
    loading: (__VLS_ctx.refreshingTwinId === __VLS_ctx.detail?.twin?.id),
}));
const __VLS_407 = __VLS_406({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-sync",
    loading: (__VLS_ctx.refreshingTwinId === __VLS_ctx.detail?.twin?.id),
}, ...__VLS_functionalComponentArgsRest(__VLS_406));
let __VLS_410;
const __VLS_411 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.detail && __VLS_ctx.refreshTwin(__VLS_ctx.detail.snapshot);
            // @ts-ignore
            [refreshingTwinId, refreshTwin, detailDialog, detail, detail, detail, detail,];
        } });
const { default: __VLS_412 } = __VLS_408.slots;
// @ts-ignore
[];
var __VLS_408;
var __VLS_409;
let __VLS_413;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_414 = __VLS_asFunctionalComponent1(__VLS_413, new __VLS_413({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-robot-industrial",
    loading: (__VLS_ctx.analyzingTwinId === __VLS_ctx.detail?.twin?.id),
}));
const __VLS_415 = __VLS_414({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-robot-industrial",
    loading: (__VLS_ctx.analyzingTwinId === __VLS_ctx.detail?.twin?.id),
}, ...__VLS_functionalComponentArgsRest(__VLS_414));
let __VLS_418;
const __VLS_419 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.detail && __VLS_ctx.analyzeTwin(__VLS_ctx.detail.snapshot);
            // @ts-ignore
            [analyzingTwinId, analyzeTwin, detail, detail, detail,];
        } });
const { default: __VLS_420 } = __VLS_416.slots;
(__VLS_ctx.analyzingTwinId === __VLS_ctx.detail?.twin?.id ? "Buscando modelos recomendados..." : "Analizar IA");
// @ts-ignore
[analyzingTwinId, detail,];
var __VLS_416;
var __VLS_417;
// @ts-ignore
[];
var __VLS_402;
let __VLS_421;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_422 = __VLS_asFunctionalComponent1(__VLS_421, new __VLS_421({}));
const __VLS_423 = __VLS_422({}, ...__VLS_functionalComponentArgsRest(__VLS_422));
if (__VLS_ctx.detail) {
    let __VLS_426;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_427 = __VLS_asFunctionalComponent1(__VLS_426, new __VLS_426({
        ...{ class: "pt-4" },
    }));
    const __VLS_428 = __VLS_427({
        ...{ class: "pt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_427));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    const { default: __VLS_431 } = __VLS_429.slots;
    if (__VLS_ctx.analyzingTwinId === __VLS_ctx.detail?.twin?.id) {
        let __VLS_432;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_433 = __VLS_asFunctionalComponent1(__VLS_432, new __VLS_432({
            type: "info",
            variant: "tonal",
            ...{ class: "mb-4" },
            text: "Buscando modelos recomendados...",
        }));
        const __VLS_434 = __VLS_433({
            type: "info",
            variant: "tonal",
            ...{ class: "mb-4" },
            text: "Buscando modelos recomendados...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_433));
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-strip mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    let __VLS_437;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_438 = __VLS_asFunctionalComponent1(__VLS_437, new __VLS_437({
        label: true,
        color: "primary",
        variant: "tonal",
    }));
    const __VLS_439 = __VLS_438({
        label: true,
        color: "primary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_438));
    const { default: __VLS_442 } = __VLS_440.slots;
    (__VLS_ctx.detail.period.label);
    // @ts-ignore
    [analyzingTwinId, detail, detail, detail,];
    var __VLS_440;
    let __VLS_443;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_444 = __VLS_asFunctionalComponent1(__VLS_443, new __VLS_443({
        label: true,
        color: (__VLS_ctx.healthColor(__VLS_ctx.detail.snapshot.health_score)),
        variant: "tonal",
    }));
    const __VLS_445 = __VLS_444({
        label: true,
        color: (__VLS_ctx.healthColor(__VLS_ctx.detail.snapshot.health_score)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_444));
    const { default: __VLS_448 } = __VLS_446.slots;
    (__VLS_ctx.detail.snapshot.health_score);
    // @ts-ignore
    [healthColor, detail, detail,];
    var __VLS_446;
    let __VLS_449;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_450 = __VLS_asFunctionalComponent1(__VLS_449, new __VLS_449({
        label: true,
        color: (__VLS_ctx.riskColor(__VLS_ctx.detail.snapshot.risk_level)),
        variant: "tonal",
    }));
    const __VLS_451 = __VLS_450({
        label: true,
        color: (__VLS_ctx.riskColor(__VLS_ctx.detail.snapshot.risk_level)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_450));
    const { default: __VLS_454 } = __VLS_452.slots;
    (__VLS_ctx.detail.snapshot.risk_level);
    // @ts-ignore
    [riskColor, detail, detail,];
    var __VLS_452;
    let __VLS_455;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_456 = __VLS_asFunctionalComponent1(__VLS_455, new __VLS_455({
        label: true,
        color: (__VLS_ctx.statusColor(__VLS_ctx.detail.snapshot.operational_status)),
        variant: "tonal",
    }));
    const __VLS_457 = __VLS_456({
        label: true,
        color: (__VLS_ctx.statusColor(__VLS_ctx.detail.snapshot.operational_status)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_456));
    const { default: __VLS_460 } = __VLS_458.slots;
    (__VLS_ctx.detail.snapshot.operational_status);
    // @ts-ignore
    [statusColor, detail, detail,];
    var __VLS_458;
    let __VLS_461;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_462 = __VLS_asFunctionalComponent1(__VLS_461, new __VLS_461({
        dense: true,
        ...{ class: "mb-2" },
    }));
    const __VLS_463 = __VLS_462({
        dense: true,
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_462));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    const { default: __VLS_466 } = __VLS_464.slots;
    let __VLS_467;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_468 = __VLS_asFunctionalComponent1(__VLS_467, new __VLS_467({
        cols: "12",
        md: "4",
    }));
    const __VLS_469 = __VLS_468({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_468));
    const { default: __VLS_472 } = __VLS_470.slots;
    let __VLS_473;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_474 = __VLS_asFunctionalComponent1(__VLS_473, new __VLS_473({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }));
    const __VLS_475 = __VLS_474({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_474));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_478 } = __VLS_476.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.equipment?.code || __VLS_ctx.detail.twin?.equipment_code || "No registrado");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.equipment?.display_name || __VLS_ctx.detail.twin?.equipment_name || "No registrado");
    if (__VLS_ctx.detail.snapshot.equipment?.operational_name && __VLS_ctx.detail.snapshot.equipment?.operational_name !== __VLS_ctx.detail.snapshot.equipment?.display_name) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.detail.snapshot.equipment?.operational_name);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.equipment?.model || __VLS_ctx.detail.twin?.equipment_model || "No registrado");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.equipment?.brand_name || "No registrada");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.equipment?.estado_operativo || "No registrado");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.equipment?.criticidad || "No registrada");
    if (Array.isArray(__VLS_ctx.detail.snapshot.equipment?.components) && __VLS_ctx.detail.snapshot.equipment?.components.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 font-weight-medium mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex flex-wrap" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        for (const [component] of __VLS_vFor((__VLS_ctx.detail.snapshot.equipment?.components))) {
            let __VLS_479;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_480 = __VLS_asFunctionalComponent1(__VLS_479, new __VLS_479({
                key: (component.id || `${component.codigo}-${component.nombre_oficial}`),
                size: "small",
                variant: "tonal",
                color: "secondary",
            }));
            const __VLS_481 = __VLS_480({
                key: (component.id || `${component.codigo}-${component.nombre_oficial}`),
                size: "small",
                variant: "tonal",
                color: "secondary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_480));
            const { default: __VLS_484 } = __VLS_482.slots;
            (component.codigo ? `${component.codigo} - ` : "");
            (component.nombre_oficial || component.nombre);
            // @ts-ignore
            [detail, detail, detail, detail, detail, detail, detail, detail, detail, detail, detail, detail, detail, detail, detail, detail,];
            var __VLS_482;
            // @ts-ignore
            [];
        }
    }
    // @ts-ignore
    [];
    var __VLS_476;
    // @ts-ignore
    [];
    var __VLS_470;
    let __VLS_485;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_486 = __VLS_asFunctionalComponent1(__VLS_485, new __VLS_485({
        cols: "12",
        md: "4",
    }));
    const __VLS_487 = __VLS_486({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_486));
    const { default: __VLS_490 } = __VLS_488.slots;
    let __VLS_491;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_492 = __VLS_asFunctionalComponent1(__VLS_491, new __VLS_491({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }));
    const __VLS_493 = __VLS_492({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_492));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_496 } = __VLS_494.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.lubricant?.latest_lubricant || "Sin análisis");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.lubricant?.latest_lubricant_brand || "No registrada");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.lubricant?.latest_report_code || "Sin código");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.lubricant?.latest_state || "SIN_ANALISIS");
    if (__VLS_ctx.detail.snapshot.lubricant?.match_status && __VLS_ctx.detail.snapshot.lubricant?.match_status !== 'NO_APLICA') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-2 d-flex align-center justify-space-between" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        let __VLS_497;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_498 = __VLS_asFunctionalComponent1(__VLS_497, new __VLS_497({
            color: (__VLS_ctx.lubricantMatchColor(__VLS_ctx.detail.snapshot.lubricant?.match_status)),
            variant: "tonal",
            size: "small",
            label: true,
        }));
        const __VLS_499 = __VLS_498({
            color: (__VLS_ctx.lubricantMatchColor(__VLS_ctx.detail.snapshot.lubricant?.match_status)),
            variant: "tonal",
            size: "small",
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_498));
        const { default: __VLS_502 } = __VLS_500.slots;
        (__VLS_ctx.detail.snapshot.lubricant?.match_status);
        // @ts-ignore
        [detail, detail, detail, detail, detail, detail, detail, detail, lubricantMatchColor,];
        var __VLS_500;
    }
    // @ts-ignore
    [];
    var __VLS_494;
    // @ts-ignore
    [];
    var __VLS_488;
    let __VLS_503;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_504 = __VLS_asFunctionalComponent1(__VLS_503, new __VLS_503({
        cols: "12",
        md: "4",
    }));
    const __VLS_505 = __VLS_504({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_504));
    const { default: __VLS_508 } = __VLS_506.slots;
    let __VLS_509;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_510 = __VLS_asFunctionalComponent1(__VLS_509, new __VLS_509({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }));
    const __VLS_511 = __VLS_510({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_510));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_514 } = __VLS_512.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.inventory?.total_materials ?? 0);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.detail.snapshot.inventory?.low_stock_materials ?? 0);
    if (Array.isArray(__VLS_ctx.detail.snapshot.inventory?.recommended_materials) && __VLS_ctx.detail.snapshot.inventory?.recommended_materials.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        for (const [material] of __VLS_vFor(((__VLS_ctx.detail.snapshot.inventory?.recommended_materials || []).slice(0, 3)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (material.producto_id || `${material.codigo}-${material.nombre}`),
                ...{ class: "mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (material.codigo || "Sin código");
            (material.nombre || "Material");
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (material.stock_total ?? 0);
            (material.stock_status || "SIN_STOCK");
            if (material.bodega_sugerida) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (material.bodega_sugerida.codigo || material.bodega_sugerida.nombre);
            }
            // @ts-ignore
            [detail, detail, detail, detail, detail,];
        }
    }
    else {
        let __VLS_515;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_516 = __VLS_asFunctionalComponent1(__VLS_515, new __VLS_515({
            type: "info",
            variant: "tonal",
            density: "compact",
            text: "Todavía no hay materiales sugeridos para este equipo.",
        }));
        const __VLS_517 = __VLS_516({
            type: "info",
            variant: "tonal",
            density: "compact",
            text: "Todavía no hay materiales sugeridos para este equipo.",
        }, ...__VLS_functionalComponentArgsRest(__VLS_516));
    }
    // @ts-ignore
    [];
    var __VLS_512;
    // @ts-ignore
    [];
    var __VLS_506;
    // @ts-ignore
    [];
    var __VLS_464;
    let __VLS_520;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_521 = __VLS_asFunctionalComponent1(__VLS_520, new __VLS_520({
        dense: true,
    }));
    const __VLS_522 = __VLS_521({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_521));
    const { default: __VLS_525 } = __VLS_523.slots;
    let __VLS_526;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_527 = __VLS_asFunctionalComponent1(__VLS_526, new __VLS_526({
        cols: "12",
        lg: "5",
    }));
    const __VLS_528 = __VLS_527({
        cols: "12",
        lg: "5",
    }, ...__VLS_functionalComponentArgsRest(__VLS_527));
    const { default: __VLS_531 } = __VLS_529.slots;
    let __VLS_532;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_533 = __VLS_asFunctionalComponent1(__VLS_532, new __VLS_532({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }));
    const __VLS_534 = __VLS_533({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_533));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_537 } = __VLS_535.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_538;
    /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
    vTable;
    // @ts-ignore
    const __VLS_539 = __VLS_asFunctionalComponent1(__VLS_538, new __VLS_538({
        density: "compact",
        ...{ class: "enterprise-table" },
    }));
    const __VLS_540 = __VLS_539({
        density: "compact",
        ...{ class: "enterprise-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_539));
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    const { default: __VLS_543 } = __VLS_541.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [signal] of __VLS_vFor((__VLS_ctx.detail.signals))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            key: (signal.id || signal.signal_key || signal.key),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (signal.signal_label || signal.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (signal.signal_category || signal.category);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (__VLS_ctx.displaySignalValue(signal));
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        let __VLS_544;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_545 = __VLS_asFunctionalComponent1(__VLS_544, new __VLS_544({
            color: (__VLS_ctx.severityColor(signal.severity)),
            variant: "tonal",
            size: "small",
        }));
        const __VLS_546 = __VLS_545({
            color: (__VLS_ctx.severityColor(signal.severity)),
            variant: "tonal",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_545));
        const { default: __VLS_549 } = __VLS_547.slots;
        (signal.severity);
        // @ts-ignore
        [detail, displaySignalValue, severityColor,];
        var __VLS_547;
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_541;
    // @ts-ignore
    [];
    var __VLS_535;
    // @ts-ignore
    [];
    var __VLS_529;
    let __VLS_550;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_551 = __VLS_asFunctionalComponent1(__VLS_550, new __VLS_550({
        cols: "12",
        lg: "7",
    }));
    const __VLS_552 = __VLS_551({
        cols: "12",
        lg: "7",
    }, ...__VLS_functionalComponentArgsRest(__VLS_551));
    const { default: __VLS_555 } = __VLS_553.slots;
    let __VLS_556;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_557 = __VLS_asFunctionalComponent1(__VLS_556, new __VLS_556({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4" },
    }));
    const __VLS_558 = __VLS_557({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_557));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_561 } = __VLS_559.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    if (!__VLS_ctx.detail.insights.length) {
        let __VLS_562;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_563 = __VLS_asFunctionalComponent1(__VLS_562, new __VLS_562({
            type: "info",
            variant: "tonal",
            text: "Todavía no hay análisis IA para este período. Puedes generarlo desde esta ventana.",
        }));
        const __VLS_564 = __VLS_563({
            type: "info",
            variant: "tonal",
            text: "Todavía no hay análisis IA para este período. Puedes generarlo desde esta ventana.",
        }, ...__VLS_functionalComponentArgsRest(__VLS_563));
    }
    else {
        let __VLS_567;
        /** @ts-ignore @type {typeof __VLS_components.vTimeline | typeof __VLS_components.VTimeline | typeof __VLS_components.vTimeline | typeof __VLS_components.VTimeline} */
        vTimeline;
        // @ts-ignore
        const __VLS_568 = __VLS_asFunctionalComponent1(__VLS_567, new __VLS_567({
            density: "compact",
            side: "end",
            align: "start",
        }));
        const __VLS_569 = __VLS_568({
            density: "compact",
            side: "end",
            align: "start",
        }, ...__VLS_functionalComponentArgsRest(__VLS_568));
        const { default: __VLS_572 } = __VLS_570.slots;
        for (const [insight] of __VLS_vFor((__VLS_ctx.detail.insights))) {
            let __VLS_573;
            /** @ts-ignore @type {typeof __VLS_components.vTimelineItem | typeof __VLS_components.VTimelineItem | typeof __VLS_components.vTimelineItem | typeof __VLS_components.VTimelineItem} */
            vTimelineItem;
            // @ts-ignore
            const __VLS_574 = __VLS_asFunctionalComponent1(__VLS_573, new __VLS_573({
                key: (insight.id),
                dotColor: "secondary",
                fillDot: true,
            }));
            const __VLS_575 = __VLS_574({
                key: (insight.id),
                dotColor: "secondary",
                fillDot: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_574));
            const { default: __VLS_578 } = __VLS_576.slots;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "font-weight-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            (insight.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (insight.source);
            (__VLS_ctx.formatDate(insight.created_at));
            (insight.priority);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (insight.summary);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-body-2 text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (insight.recommendation);
            if (__VLS_ctx.insightNationalModels(insight).length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mt-3" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-uppercase mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                for (const [model, modelIndex] of __VLS_vFor((__VLS_ctx.insightNationalModels(insight)))) {
                    let __VLS_579;
                    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
                    vCard;
                    // @ts-ignore
                    const __VLS_580 = __VLS_asFunctionalComponent1(__VLS_579, new __VLS_579({
                        key: (`${insight.id}-national-model-${modelIndex}`),
                        rounded: "lg",
                        variant: "tonal",
                        color: "secondary",
                        ...{ class: "pa-3 mb-2" },
                    }));
                    const __VLS_581 = __VLS_580({
                        key: (`${insight.id}-national-model-${modelIndex}`),
                        rounded: "lg",
                        variant: "tonal",
                        color: "secondary",
                        ...{ class: "pa-3 mb-2" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_580));
                    /** @type {__VLS_StyleScopedClasses['pa-3']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    const { default: __VLS_584 } = __VLS_582.slots;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "font-weight-bold" },
                    });
                    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
                    (model.model);
                    if (model.manufacturer) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                        (model.manufacturer);
                    }
                    if (model.reason) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "text-body-2 mt-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                        (model.reason);
                    }
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-caption text-medium-emphasis mt-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                    (model.country || "Ecuador");
                    if (model.application) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                        (model.application);
                    }
                    // @ts-ignore
                    [detail, detail, formatDate, insightNationalModels, insightNationalModels,];
                    var __VLS_582;
                    // @ts-ignore
                    [];
                }
            }
            if (__VLS_ctx.insightImprovementSteps(insight).length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mt-3" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-uppercase mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.ol, __VLS_intrinsics.ol)({
                    ...{ class: "improvement-list" },
                });
                /** @type {__VLS_StyleScopedClasses['improvement-list']} */ ;
                for (const [step, index] of __VLS_vFor((__VLS_ctx.insightImprovementSteps(insight)))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                        key: (`${insight.id}-${index}`),
                    });
                    (step);
                    // @ts-ignore
                    [insightImprovementSteps, insightImprovementSteps,];
                }
            }
            if (__VLS_ctx.insightRecommendedMaterials(insight).length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mt-3" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-uppercase mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                for (const [material] of __VLS_vFor((__VLS_ctx.insightRecommendedMaterials(insight).slice(0, 4)))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (material.producto_id || `${material.codigo}-${material.nombre}`),
                        ...{ class: "text-body-2 mb-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "font-weight-medium" },
                    });
                    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
                    (material.codigo || "Sin código");
                    (material.nombre || "Material");
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-medium-emphasis" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
                    (material.stock_total ?? 0);
                    (material.stock_status || "SIN_STOCK");
                    if (material.bodega_sugerida) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                        (material.bodega_sugerida.codigo || material.bodega_sugerida.nombre);
                    }
                    // @ts-ignore
                    [insightRecommendedMaterials, insightRecommendedMaterials,];
                }
            }
            // @ts-ignore
            [];
            var __VLS_576;
            // @ts-ignore
            [];
        }
        // @ts-ignore
        [];
        var __VLS_570;
    }
    // @ts-ignore
    [];
    var __VLS_559;
    // @ts-ignore
    [];
    var __VLS_553;
    // @ts-ignore
    [];
    var __VLS_523;
    // @ts-ignore
    [];
    var __VLS_429;
}
// @ts-ignore
[];
var __VLS_396;
// @ts-ignore
[];
var __VLS_390;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

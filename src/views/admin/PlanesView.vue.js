/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
const ui = useUiStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Planes", "Plan", "Planes internos"]));
const canRead = computed(() => perms.value.isReaded);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const plans = ref([]);
const tasks = ref([]);
const loadingPlans = ref(false);
const loadingTasks = ref(false);
const saving = ref(false);
const planSearch = ref("");
const selectedPlanId = ref(null);
const planDialog = ref(false);
const deleteDialog = ref(false);
const isPlanDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const editingPlanId = ref(null);
const deletingId = ref(null);
const deletedTaskIds = ref([]);
const taskRowKey = ref(0);
const planForm = reactive({ codigo: "", nombre: "", tipo: "", frecuencia_tipo: "HORAS", frecuencia_valor: "0" });
const planHeaders = [
    { title: "Código", key: "codigo" },
    { title: "Nombre", key: "nombre" },
    { title: "Tipo", key: "tipo" },
];
const taskHeaders = [
    { title: "Orden", key: "orden" },
    { title: "Actividad", key: "actividad" },
    { title: "Acciones", key: "actions", sortable: false },
];
function makeTaskRow(item = {}) {
    taskRowKey.value += 1;
    return {
        ...item,
        orden: String(item.orden ?? ""),
        actividad: item.actividad ?? "",
        field_type: item.field_type || "TEXTO",
        _rowKey: item.id ?? `tmp-${taskRowKey.value}`,
    };
}
function resolveTask(item) {
    return item?.raw ?? item?._raw ?? item;
}
function syncTaskOrder() {
    tasks.value = tasks.value.map((task, index) => ({
        ...task,
        orden: String(index + 1),
    }));
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
const filteredPlans = computed(() => {
    const q = planSearch.value.trim().toLowerCase();
    return plans.value
        .map((plan) => ({ ...plan, _raw: plan, _search: JSON.stringify(plan).toLowerCase() }))
        .filter((plan) => !q || plan._search.includes(q));
});
const currentPlanId = computed(() => editingPlanId.value ?? selectedPlanId.value);
const selectedPlanLabel = computed(() => {
    const plan = plans.value.find((item) => item.id === selectedPlanId.value);
    if (!plan)
        return "";
    return `${plan.codigo ?? ""} ${plan.nombre ?? ""}`.trim();
});
async function fetchPlans() {
    loadingPlans.value = true;
    try {
        plans.value = await listAll("/kpi_maintenance/planes");
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudieron cargar los planes.");
    }
    finally {
        loadingPlans.value = false;
    }
}
async function fetchTasks() {
    if (!currentPlanId.value) {
        tasks.value = [];
        return;
    }
    loadingTasks.value = true;
    try {
        const { data } = await api.get(`/kpi_maintenance/planes/${currentPlanId.value}/tareas`);
        tasks.value = asArray(data).map((item) => makeTaskRow(item));
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudieron cargar las tareas.");
    }
    finally {
        loadingTasks.value = false;
    }
}
async function openPlanEdit(item) {
    if (!canEdit.value)
        return;
    editingPlanId.value = item.id;
    selectedPlanId.value = item.id;
    planForm.codigo = item.codigo ?? "";
    planForm.nombre = item.nombre ?? "";
    planForm.tipo = item.tipo ?? "";
    planForm.frecuencia_tipo = "HORAS";
    planForm.frecuencia_valor = String(item.frecuencia_valor ?? "0");
    planDialog.value = true;
    await fetchTasks();
}
async function savePlan() {
    if (!canEdit.value)
        return;
    if (!planForm.codigo || !planForm.nombre) {
        ui.error("Código y nombre son obligatorios.");
        return;
    }
    saving.value = true;
    const payload = {
        codigo: planForm.codigo,
        nombre: planForm.nombre,
        tipo: planForm.tipo || null,
        frecuencia_tipo: "HORAS",
        frecuencia_valor: Number(planForm.frecuencia_valor || 0),
    };
    try {
        let activePlanId = editingPlanId.value;
        if (editingPlanId.value) {
            await api.patch(`/kpi_maintenance/planes/${editingPlanId.value}`, payload);
            selectedPlanId.value = editingPlanId.value;
        }
        else {
            const { data } = await api.post("/kpi_maintenance/planes", payload);
            const createdId = data?.id ?? data?.data?.id ?? data?.item?.id ?? null;
            selectedPlanId.value = createdId;
            editingPlanId.value = createdId;
            activePlanId = createdId;
        }
        if (!activePlanId) {
            throw new Error("No se pudo determinar el plan a guardar.");
        }
        for (const taskId of deletedTaskIds.value) {
            await api.delete(`/kpi_maintenance/planes/tareas/${taskId}`);
        }
        console.log("Tareas eliminadas:", deletedTaskIds.value);
        console.log("Tareas a guardar:", tasks.value);
        for (const [index, task] of tasks.value.entries()) {
            if (!task.actividad?.trim()) {
                ui.error("Todas las tareas deben tener orden y actividad.");
                return;
            }
            const taskPayload = {
                orden: index + 1,
                actividad: task.actividad.trim(),
                field_type: "TEXTO",
            };
            if (task.id) {
                await api.patch(`/kpi_maintenance/planes/tareas/${task.id}`, taskPayload);
            }
            else {
                await api.post(`/kpi_maintenance/planes/${activePlanId}/tareas`, taskPayload);
            }
        }
        ui.success("Plan y detalle guardados correctamente.");
        await fetchPlans();
        if (!selectedPlanId.value) {
            const created = plans.value.find((item) => item.codigo === planForm.codigo && item.nombre === planForm.nombre);
            selectedPlanId.value = created?.id ?? null;
        }
        await fetchTasks();
    }
    catch (e) {
        console.error(e);
        ui.error(e?.response?.data?.message || "No se pudo guardar el plan y su detalle.");
    }
    finally {
        saving.value = false;
    }
}
function addTaskRow() {
    if (!canEdit.value)
        return;
    tasks.value.push(makeTaskRow({ actividad: "" }));
    syncTaskOrder();
}
function removeTaskRow(item) {
    if (!canEdit.value)
        return;
    if (item?.id) {
        deletedTaskIds.value.push(item.id);
    }
    tasks.value = tasks.value.filter((task) => task !== item && task.id !== item?.id);
    syncTaskOrder();
}
function openDeletePlan(item) {
    if (!canDelete.value)
        return;
    deletingId.value = item.id;
    deleteDialog.value = true;
}
async function confirmDelete() {
    if (!canDelete.value)
        return;
    if (!deletingId.value)
        return;
    saving.value = true;
    try {
        await api.delete(`/kpi_maintenance/planes/${deletingId.value}`);
        ui.success("Cabecera de plan eliminada.");
        if (selectedPlanId.value === deletingId.value) {
            selectedPlanId.value = null;
            tasks.value = [];
        }
        await fetchPlans();
        deleteDialog.value = false;
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo eliminar.");
    }
    finally {
        saving.value = false;
    }
}
onMounted(async () => {
    if (!canRead.value)
        return;
    await fetchPlans();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['v-data-table-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['planes-table']} */ ;
/** @type {__VLS_StyleScopedClasses['planes-table']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-task-table']} */ ;
/** @type {__VLS_StyleScopedClasses['v-data-table-footer__items-per-page']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-task-table']} */ ;
/** @type {__VLS_StyleScopedClasses['v-data-table-footer__pagination']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    dense: true,
}));
const __VLS_2 = __VLS_1({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (!__VLS_ctx.canRead) {
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        cols: "12",
    }));
    const __VLS_8 = __VLS_7({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    let __VLS_12;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        type: "warning",
        variant: "tonal",
    }));
    const __VLS_14 = __VLS_13({
        type: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const { default: __VLS_17 } = __VLS_15.slots;
    // @ts-ignore
    [canRead,];
    var __VLS_15;
    // @ts-ignore
    [];
    var __VLS_9;
}
else {
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        cols: "12",
    }));
    const __VLS_20 = __VLS_19({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    const { default: __VLS_23 } = __VLS_21.slots;
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        rounded: "xl",
        ...{ class: "pa-4 fill-height enterprise-surface" },
    }));
    const __VLS_26 = __VLS_25({
        rounded: "xl",
        ...{ class: "pa-4 fill-height enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['fill-height']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_29 } = __VLS_27.slots;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    let __VLS_30;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        color: "warning",
        variant: "tonal",
    }));
    const __VLS_32 = __VLS_31({
        color: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    const { default: __VLS_35 } = __VLS_33.slots;
    // @ts-ignore
    [];
    var __VLS_33;
    let __VLS_36;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        type: "warning",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "Este modulo ya no es la fuente de verdad operativa. Configura y actualiza tareas, materiales y checklist desde Plantillas MPG.",
    }));
    const __VLS_38 = __VLS_37({
        type: "warning",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: "Este modulo ya no es la fuente de verdad operativa. Configura y actualiza tareas, materiales y checklist desde Plantillas MPG.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_41;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
        modelValue: (__VLS_ctx.planSearch),
        label: "Buscar plan",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
        ...{ class: "mb-2" },
    }));
    const __VLS_43 = __VLS_42({
        modelValue: (__VLS_ctx.planSearch),
        label: "Buscar plan",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_46;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        headers: (__VLS_ctx.planHeaders),
        items: (__VLS_ctx.filteredPlans),
        loading: (__VLS_ctx.loadingPlans),
        loadingText: "Obteniendo planes...",
        itemValue: "id",
        itemsPerPage: (10),
        ...{ class: "elevation-0 enterprise-table planes-table" },
    }));
    const __VLS_48 = __VLS_47({
        headers: (__VLS_ctx.planHeaders),
        items: (__VLS_ctx.filteredPlans),
        loading: (__VLS_ctx.loadingPlans),
        loadingText: "Obteniendo planes...",
        itemValue: "id",
        itemsPerPage: (10),
        ...{ class: "elevation-0 enterprise-table planes-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['planes-table']} */ ;
    const { default: __VLS_51 } = __VLS_49.slots;
    {
        const { 'item.actions': __VLS_52 } = __VLS_49.slots;
        const [{ item }] = __VLS_vSlot(__VLS_52);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        if (__VLS_ctx.canEdit) {
            let __VLS_53;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_54 = __VLS_asFunctionalComponent1(__VLS_53, new __VLS_53({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }));
            const __VLS_55 = __VLS_54({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }, ...__VLS_functionalComponentArgsRest(__VLS_54));
            let __VLS_58;
            const __VLS_59 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.openPlanEdit(item._raw ?? item);
                        // @ts-ignore
                        [planSearch, planHeaders, filteredPlans, loadingPlans, canEdit, openPlanEdit,];
                    } });
            var __VLS_56;
            var __VLS_57;
        }
        if (__VLS_ctx.canDelete) {
            let __VLS_60;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_62 = __VLS_61({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            let __VLS_65;
            const __VLS_66 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canDelete))
                            return;
                        __VLS_ctx.openDeletePlan(item._raw ?? item);
                        // @ts-ignore
                        [canDelete, openDeletePlan,];
                    } });
            var __VLS_63;
            var __VLS_64;
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_49;
    // @ts-ignore
    [];
    var __VLS_27;
    // @ts-ignore
    [];
    var __VLS_21;
}
// @ts-ignore
[];
var __VLS_3;
let __VLS_67;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
    modelValue: (__VLS_ctx.planDialog),
    fullscreen: (__VLS_ctx.isPlanDialogFullscreen),
    maxWidth: (__VLS_ctx.isPlanDialogFullscreen ? undefined : 980),
}));
const __VLS_69 = __VLS_68({
    modelValue: (__VLS_ctx.planDialog),
    fullscreen: (__VLS_ctx.isPlanDialogFullscreen),
    maxWidth: (__VLS_ctx.isPlanDialogFullscreen ? undefined : 980),
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
const { default: __VLS_72 } = __VLS_70.slots;
let __VLS_73;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
    rounded: "xl",
}));
const __VLS_75 = __VLS_74({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
const { default: __VLS_78 } = __VLS_76.slots;
let __VLS_79;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_81 = __VLS_80({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_84 } = __VLS_82.slots;
(__VLS_ctx.editingPlanId ? "Editar" : "Crear");
// @ts-ignore
[planDialog, isPlanDialogFullscreen, isPlanDialogFullscreen, editingPlanId,];
var __VLS_82;
let __VLS_85;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({}));
const __VLS_87 = __VLS_86({}, ...__VLS_functionalComponentArgsRest(__VLS_86));
let __VLS_90;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
    ...{ class: "pt-4" },
}));
const __VLS_92 = __VLS_91({
    ...{ class: "pt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
const { default: __VLS_95 } = __VLS_93.slots;
let __VLS_96;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent1(__VLS_96, new __VLS_96({
    dense: true,
}));
const __VLS_98 = __VLS_97({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
const { default: __VLS_101 } = __VLS_99.slots;
let __VLS_102;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({
    cols: "12",
    md: "6",
}));
const __VLS_104 = __VLS_103({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_103));
const { default: __VLS_107 } = __VLS_105.slots;
let __VLS_108;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
    modelValue: (__VLS_ctx.planForm.codigo),
    label: "Código",
    variant: "outlined",
}));
const __VLS_110 = __VLS_109({
    modelValue: (__VLS_ctx.planForm.codigo),
    label: "Código",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
// @ts-ignore
[planForm,];
var __VLS_105;
let __VLS_113;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
    cols: "12",
    md: "6",
}));
const __VLS_115 = __VLS_114({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
const { default: __VLS_118 } = __VLS_116.slots;
let __VLS_119;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
    modelValue: (__VLS_ctx.planForm.nombre),
    label: "Nombre",
    variant: "outlined",
}));
const __VLS_121 = __VLS_120({
    modelValue: (__VLS_ctx.planForm.nombre),
    label: "Nombre",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
// @ts-ignore
[planForm,];
var __VLS_116;
let __VLS_124;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({
    cols: "12",
    md: "6",
}));
const __VLS_126 = __VLS_125({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
const { default: __VLS_129 } = __VLS_127.slots;
let __VLS_130;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent1(__VLS_130, new __VLS_130({
    modelValue: (__VLS_ctx.planForm.tipo),
    label: "Tipo",
    variant: "outlined",
}));
const __VLS_132 = __VLS_131({
    modelValue: (__VLS_ctx.planForm.tipo),
    label: "Tipo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
// @ts-ignore
[planForm,];
var __VLS_127;
let __VLS_135;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
    cols: "12",
    md: "6",
}));
const __VLS_137 = __VLS_136({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
const { default: __VLS_140 } = __VLS_138.slots;
let __VLS_141;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({
    modelValue: (__VLS_ctx.planForm.frecuencia_tipo),
    label: "Frecuencia tipo",
    variant: "outlined",
    readonly: true,
}));
const __VLS_143 = __VLS_142({
    modelValue: (__VLS_ctx.planForm.frecuencia_tipo),
    label: "Frecuencia tipo",
    variant: "outlined",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_142));
// @ts-ignore
[planForm,];
var __VLS_138;
let __VLS_146;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
    cols: "12",
    md: "6",
}));
const __VLS_148 = __VLS_147({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
const { default: __VLS_151 } = __VLS_149.slots;
let __VLS_152;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent1(__VLS_152, new __VLS_152({
    modelValue: (__VLS_ctx.planForm.frecuencia_valor),
    type: "number",
    label: "Frecuencia valor",
    variant: "outlined",
}));
const __VLS_154 = __VLS_153({
    modelValue: (__VLS_ctx.planForm.frecuencia_valor),
    type: "number",
    label: "Frecuencia valor",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
// @ts-ignore
[planForm,];
var __VLS_149;
// @ts-ignore
[];
var __VLS_99;
let __VLS_157;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent1(__VLS_157, new __VLS_157({
    ...{ class: "my-4" },
}));
const __VLS_159 = __VLS_158({
    ...{ class: "my-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
/** @type {__VLS_StyleScopedClasses['my-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "responsive-header mb-3" },
});
/** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-2 text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
(__VLS_ctx.currentPlanId ? `Plan seleccionado: ${__VLS_ctx.selectedPlanLabel}` : "Completa cabecera y tareas; el guardado se hace en conjunto.");
if (__VLS_ctx.canEdit) {
    let __VLS_162;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
        ...{ 'onClick': {} },
        color: "primary",
        prependIcon: "mdi-plus",
    }));
    const __VLS_164 = __VLS_163({
        ...{ 'onClick': {} },
        color: "primary",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    let __VLS_167;
    const __VLS_168 = ({ click: {} },
        { onClick: (__VLS_ctx.addTaskRow) });
    const { default: __VLS_169 } = __VLS_165.slots;
    // @ts-ignore
    [canEdit, currentPlanId, selectedPlanLabel, addTaskRow,];
    var __VLS_165;
    var __VLS_166;
}
let __VLS_170;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent1(__VLS_170, new __VLS_170({
    headers: (__VLS_ctx.taskHeaders),
    items: (__VLS_ctx.tasks),
    itemValue: "_rowKey",
    loading: (__VLS_ctx.loadingTasks),
    loadingText: "Obteniendo tareas del plan...",
    itemsPerPage: (5),
    ...{ class: "elevation-0 enterprise-table plan-task-table" },
}));
const __VLS_172 = __VLS_171({
    headers: (__VLS_ctx.taskHeaders),
    items: (__VLS_ctx.tasks),
    itemValue: "_rowKey",
    loading: (__VLS_ctx.loadingTasks),
    loadingText: "Obteniendo tareas del plan...",
    itemsPerPage: (5),
    ...{ class: "elevation-0 enterprise-table plan-task-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
/** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-task-table']} */ ;
const { default: __VLS_175 } = __VLS_173.slots;
{
    const { 'item.orden': __VLS_176 } = __VLS_173.slots;
    const [{ item }] = __VLS_vSlot(__VLS_176);
    let __VLS_177;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_178 = __VLS_asFunctionalComponent1(__VLS_177, new __VLS_177({
        modelValue: (__VLS_ctx.resolveTask(item).orden),
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        readonly: true,
        ...{ class: "order-field" },
    }));
    const __VLS_179 = __VLS_178({
        modelValue: (__VLS_ctx.resolveTask(item).orden),
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        readonly: true,
        ...{ class: "order-field" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_178));
    /** @type {__VLS_StyleScopedClasses['order-field']} */ ;
    // @ts-ignore
    [taskHeaders, tasks, loadingTasks, resolveTask,];
}
{
    const { 'item.actividad': __VLS_182 } = __VLS_173.slots;
    const [{ item }] = __VLS_vSlot(__VLS_182);
    let __VLS_183;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent1(__VLS_183, new __VLS_183({
        modelValue: (__VLS_ctx.resolveTask(item).actividad),
        variant: "outlined",
        density: "compact",
        hideDetails: true,
    }));
    const __VLS_185 = __VLS_184({
        modelValue: (__VLS_ctx.resolveTask(item).actividad),
        variant: "outlined",
        density: "compact",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_184));
    // @ts-ignore
    [resolveTask,];
}
{
    const { 'item.actions': __VLS_188 } = __VLS_173.slots;
    const [{ item }] = __VLS_vSlot(__VLS_188);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
    if (__VLS_ctx.canEdit) {
        let __VLS_189;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_190 = __VLS_asFunctionalComponent1(__VLS_189, new __VLS_189({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
        }));
        const __VLS_191 = __VLS_190({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_190));
        let __VLS_194;
        const __VLS_195 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canEdit))
                        return;
                    __VLS_ctx.removeTaskRow(__VLS_ctx.resolveTask(item));
                    // @ts-ignore
                    [canEdit, resolveTask, removeTaskRow,];
                } });
        var __VLS_192;
        var __VLS_193;
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_173;
// @ts-ignore
[];
var __VLS_93;
let __VLS_196;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent1(__VLS_196, new __VLS_196({}));
const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
let __VLS_201;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent1(__VLS_201, new __VLS_201({
    ...{ class: "pa-4" },
}));
const __VLS_203 = __VLS_202({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_206 } = __VLS_204.slots;
let __VLS_207;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_208 = __VLS_asFunctionalComponent1(__VLS_207, new __VLS_207({}));
const __VLS_209 = __VLS_208({}, ...__VLS_functionalComponentArgsRest(__VLS_208));
let __VLS_212;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent1(__VLS_212, new __VLS_212({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_214 = __VLS_213({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
let __VLS_217;
const __VLS_218 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.planDialog = false;
            // @ts-ignore
            [planDialog,];
        } });
const { default: __VLS_219 } = __VLS_215.slots;
// @ts-ignore
[];
var __VLS_215;
var __VLS_216;
if (__VLS_ctx.canEdit) {
    let __VLS_220;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent1(__VLS_220, new __VLS_220({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_222 = __VLS_221({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    let __VLS_225;
    const __VLS_226 = ({ click: {} },
        { onClick: (__VLS_ctx.savePlan) });
    const { default: __VLS_227 } = __VLS_223.slots;
    // @ts-ignore
    [canEdit, saving, savePlan,];
    var __VLS_223;
    var __VLS_224;
}
// @ts-ignore
[];
var __VLS_204;
// @ts-ignore
[];
var __VLS_76;
// @ts-ignore
[];
var __VLS_70;
let __VLS_228;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent1(__VLS_228, new __VLS_228({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}));
const __VLS_230 = __VLS_229({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
const { default: __VLS_233 } = __VLS_231.slots;
let __VLS_234;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent1(__VLS_234, new __VLS_234({
    rounded: "xl",
}));
const __VLS_236 = __VLS_235({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
const { default: __VLS_239 } = __VLS_237.slots;
let __VLS_240;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent1(__VLS_240, new __VLS_240({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_242 = __VLS_241({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_245 } = __VLS_243.slots;
// @ts-ignore
[deleteDialog, isDeleteDialogFullscreen, isDeleteDialogFullscreen,];
var __VLS_243;
let __VLS_246;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_247 = __VLS_asFunctionalComponent1(__VLS_246, new __VLS_246({}));
const __VLS_248 = __VLS_247({}, ...__VLS_functionalComponentArgsRest(__VLS_247));
const { default: __VLS_251 } = __VLS_249.slots;
// @ts-ignore
[];
var __VLS_249;
let __VLS_252;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent1(__VLS_252, new __VLS_252({}));
const __VLS_254 = __VLS_253({}, ...__VLS_functionalComponentArgsRest(__VLS_253));
const { default: __VLS_257 } = __VLS_255.slots;
let __VLS_258;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_259 = __VLS_asFunctionalComponent1(__VLS_258, new __VLS_258({}));
const __VLS_260 = __VLS_259({}, ...__VLS_functionalComponentArgsRest(__VLS_259));
let __VLS_263;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_264 = __VLS_asFunctionalComponent1(__VLS_263, new __VLS_263({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_265 = __VLS_264({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_264));
let __VLS_268;
const __VLS_269 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.deleteDialog = false;
            // @ts-ignore
            [deleteDialog,];
        } });
const { default: __VLS_270 } = __VLS_266.slots;
// @ts-ignore
[];
var __VLS_266;
var __VLS_267;
if (__VLS_ctx.canDelete) {
    let __VLS_271;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_272 = __VLS_asFunctionalComponent1(__VLS_271, new __VLS_271({
        ...{ 'onClick': {} },
        color: "error",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_273 = __VLS_272({
        ...{ 'onClick': {} },
        color: "error",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_272));
    let __VLS_276;
    const __VLS_277 = ({ click: {} },
        { onClick: (__VLS_ctx.confirmDelete) });
    const { default: __VLS_278 } = __VLS_274.slots;
    // @ts-ignore
    [canDelete, saving, confirmDelete,];
    var __VLS_274;
    var __VLS_275;
}
// @ts-ignore
[];
var __VLS_255;
// @ts-ignore
[];
var __VLS_237;
// @ts-ignore
[];
var __VLS_231;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

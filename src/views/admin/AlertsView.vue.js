/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { listAllPages } from "@/app/utils/list-all-pages";
const ui = useUiStore();
const loading = ref(false);
const refreshing = ref(false);
const error = ref(null);
const alerts = ref([]);
const summary = ref({
    totals: {
        total: 0,
        abiertas: 0,
        en_proceso: 0,
        resueltas: 0,
        cerradas: 0,
        critical: 0,
        warning: 0,
        info: 0,
    },
    by_category: [],
    by_origin: [],
});
const filters = reactive({
    search: "",
    estado: "TODOS",
    nivel: "TODOS",
    categoria: "TODAS",
    origen: "TODOS",
});
const stateOptions = [
    { title: "Todos", value: "TODOS" },
    { title: "Abierta", value: "ABIERTA" },
    { title: "En proceso", value: "EN_PROCESO" },
    { title: "Resuelta", value: "RESUELTA" },
    { title: "Cerrada", value: "CERRADA" },
];
const levelOptions = [
    { title: "Todos", value: "TODOS" },
    { title: "Critical", value: "CRITICAL" },
    { title: "Warning", value: "WARNING" },
    { title: "Info", value: "INFO" },
];
function normalizeBucketOptions(items, key, allLabel) {
    const options = [{ title: allLabel, value: "TODOS" }];
    for (const item of items) {
        const value = String(item?.[key] || "").trim();
        if (!value || options.some((option) => option.value === value))
            continue;
        options.push({ title: value, value });
    }
    return options;
}
const categoryOptions = computed(() => normalizeBucketOptions(summary.value.by_category ?? [], "categoria", "Todas"));
const originOptions = computed(() => normalizeBucketOptions(summary.value.by_origin ?? [], "origen", "Todos"));
const headers = [
    { title: "Nivel", key: "nivel", sortable: false },
    { title: "Estado", key: "estado", sortable: false },
    { title: "Alerta", key: "title", sortable: false },
    { title: "Ámbito", key: "scope", sortable: false },
    { title: "Orden de trabajo", key: "work_order_title", sortable: false },
    { title: "Generada", key: "fecha_generada", sortable: false },
];
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
function resolveRow(item) {
    return item?.raw ?? item?._raw ?? item;
}
function inventoryAlertItems(item) {
    const payload = item?.payload_json;
    return Array.isArray(payload?.inventory_items) ? payload.inventory_items : [];
}
function levelColor(level) {
    const normalized = String(level || "").trim().toUpperCase();
    if (normalized === "CRITICAL")
        return "error";
    if (normalized === "WARNING")
        return "warning";
    return "success";
}
function stateColor(state) {
    const normalized = String(state || "").trim().toUpperCase();
    if (normalized === "ABIERTA")
        return "error";
    if (normalized === "EN_PROCESO")
        return "warning";
    if (normalized === "RESUELTA" || normalized === "CERRADA")
        return "success";
    return "secondary";
}
function formatDate(value) {
    if (!value)
        return "Sin fecha";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime()))
        return String(value);
    return date.toLocaleString();
}
function formatInventoryNumber(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}
async function loadData() {
    loading.value = true;
    error.value = null;
    try {
        const [alertsRes, summaryRes] = await Promise.all([
            listAllPages("/kpi_maintenance/alertas"),
            api.get("/kpi_maintenance/alertas/summary"),
        ]);
        alerts.value = asArray(alertsRes);
        summary.value = (summaryRes.data?.data ?? summaryRes.data ?? summary.value);
    }
    catch (e) {
        error.value =
            e?.response?.data?.message || "No se pudieron cargar las alertas operativas.";
    }
    finally {
        loading.value = false;
    }
}
async function refreshData() {
    refreshing.value = true;
    try {
        await loadData();
    }
    catch (e) {
        error.value =
            e?.response?.data?.message || "No se pudo actualizar la vista de alertas.";
        ui.error(error.value ?? "No se pudo actualizar la vista de alertas.");
    }
    finally {
        refreshing.value = false;
    }
}
const filteredAlerts = computed(() => {
    const search = filters.search.trim().toLowerCase();
    return alerts.value.filter((item) => {
        const estado = String(item?.estado || "").trim().toUpperCase();
        const nivel = String(item?.nivel || "").trim().toUpperCase();
        const categoria = String(item?.categoria || "").trim().toUpperCase();
        const origen = String(item?.origen || "").trim().toUpperCase();
        const hayBusqueda = !search ||
            JSON.stringify(item)
                .toLowerCase()
                .includes(search);
        return (hayBusqueda &&
            (filters.estado === "TODOS" || estado === filters.estado) &&
            (filters.nivel === "TODOS" || nivel === filters.nivel) &&
            (filters.categoria === "TODAS" || categoria === filters.categoria) &&
            (filters.origen === "TODOS" || origen === filters.origen));
    });
});
const kpiCards = computed(() => [
    {
        key: "open",
        label: "Abiertas",
        value: summary.value.totals?.abiertas ?? 0,
        helper: "Alertas que requieren atención inmediata",
        icon: "mdi-bell-alert-outline",
    },
    {
        key: "critical",
        label: "Críticas",
        value: summary.value.totals?.critical ?? 0,
        helper: "Riesgo alto para operación o mantenimiento",
        icon: "mdi-alert-octagon-outline",
    },
    {
        key: "inprogress",
        label: "En proceso",
        value: summary.value.totals?.en_proceso ?? 0,
        helper: "Alertas ya tomadas por una OT",
        icon: "mdi-progress-wrench",
    },
    {
        key: "resolved",
        label: "Resueltas/Cerradas",
        value: (summary.value.totals?.resueltas ?? 0) +
            (summary.value.totals?.cerradas ?? 0),
        helper: "Histórico ya atendido",
        icon: "mdi-check-decagram-outline",
    },
]);
onMounted(async () => {
    await refreshData();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['inventory-alert-table']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-alert-table']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-alert-table']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-alert-table']} */ ;
/** @type {__VLS_StyleScopedClasses['alerts-table']} */ ;
/** @type {__VLS_StyleScopedClasses['alerts-table']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    rounded: "xl",
    ...{ class: "pa-4 enterprise-surface" },
}));
const __VLS_2 = __VLS_1({
    rounded: "xl",
    ...{ class: "pa-4 enterprise-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between mb-4" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
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
    ...{ class: "responsive-actions" },
});
/** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    label: true,
    color: "warning",
    variant: "tonal",
}));
const __VLS_9 = __VLS_8({
    label: true,
    color: "warning",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
const { default: __VLS_12 } = __VLS_10.slots;
(__VLS_ctx.summary.totals?.abiertas ?? 0);
// @ts-ignore
[summary,];
var __VLS_10;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ 'onClick': {} },
    color: "primary",
    prependIcon: "mdi-refresh",
    loading: (__VLS_ctx.refreshing),
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    color: "primary",
    prependIcon: "mdi-refresh",
    loading: (__VLS_ctx.refreshing),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.refreshData();
            // @ts-ignore
            [refreshing, refreshData,];
        } });
const { default: __VLS_20 } = __VLS_16.slots;
// @ts-ignore
[];
var __VLS_16;
var __VLS_17;
let __VLS_21;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
    dense: true,
    ...{ class: "mb-4" },
}));
const __VLS_23 = __VLS_22({
    dense: true,
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
const { default: __VLS_26 } = __VLS_24.slots;
for (const [card] of __VLS_vFor((__VLS_ctx.kpiCards))) {
    let __VLS_27;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
        key: (card.key),
        cols: "12",
        sm: "6",
        xl: "3",
    }));
    const __VLS_29 = __VLS_28({
        key: (card.key),
        cols: "12",
        sm: "6",
        xl: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    const { default: __VLS_32 } = __VLS_30.slots;
    let __VLS_33;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }));
    const __VLS_35 = __VLS_34({
        rounded: "lg",
        variant: "outlined",
        ...{ class: "pa-4 h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_38 } = __VLS_36.slots;
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
    let __VLS_39;
    /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
    vIcon;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
        icon: (card.icon),
        size: "20",
    }));
    const __VLS_41 = __VLS_40({
        icon: (card.icon),
        size: "20",
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
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
    [kpiCards,];
    var __VLS_36;
    // @ts-ignore
    [];
    var __VLS_30;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_24;
let __VLS_44;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
    dense: true,
    ...{ class: "mb-2" },
}));
const __VLS_46 = __VLS_45({
    dense: true,
    ...{ class: "mb-2" },
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
const { default: __VLS_49 } = __VLS_47.slots;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    cols: "12",
    md: "4",
}));
const __VLS_52 = __VLS_51({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
const { default: __VLS_55 } = __VLS_53.slots;
let __VLS_56;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.filters.search),
    label: "Buscar",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    clearable: true,
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.filters.search),
    label: "Buscar",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
// @ts-ignore
[filters,];
var __VLS_53;
let __VLS_61;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
    cols: "12",
    md: "2",
}));
const __VLS_63 = __VLS_62({
    cols: "12",
    md: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
const { default: __VLS_66 } = __VLS_64.slots;
let __VLS_67;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
    modelValue: (__VLS_ctx.filters.estado),
    items: (__VLS_ctx.stateOptions),
    label: "Estado",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}));
const __VLS_69 = __VLS_68({
    modelValue: (__VLS_ctx.filters.estado),
    items: (__VLS_ctx.stateOptions),
    label: "Estado",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
// @ts-ignore
[filters, stateOptions,];
var __VLS_64;
let __VLS_72;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
    cols: "12",
    md: "2",
}));
const __VLS_74 = __VLS_73({
    cols: "12",
    md: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
const { default: __VLS_77 } = __VLS_75.slots;
let __VLS_78;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent1(__VLS_78, new __VLS_78({
    modelValue: (__VLS_ctx.filters.nivel),
    items: (__VLS_ctx.levelOptions),
    label: "Nivel",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}));
const __VLS_80 = __VLS_79({
    modelValue: (__VLS_ctx.filters.nivel),
    items: (__VLS_ctx.levelOptions),
    label: "Nivel",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
// @ts-ignore
[filters, levelOptions,];
var __VLS_75;
let __VLS_83;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
    cols: "12",
    md: "2",
}));
const __VLS_85 = __VLS_84({
    cols: "12",
    md: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
const { default: __VLS_88 } = __VLS_86.slots;
let __VLS_89;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
    modelValue: (__VLS_ctx.filters.categoria),
    items: (__VLS_ctx.categoryOptions),
    label: "Categoría",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}));
const __VLS_91 = __VLS_90({
    modelValue: (__VLS_ctx.filters.categoria),
    items: (__VLS_ctx.categoryOptions),
    label: "Categoría",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
// @ts-ignore
[filters, categoryOptions,];
var __VLS_86;
let __VLS_94;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({
    cols: "12",
    md: "2",
}));
const __VLS_96 = __VLS_95({
    cols: "12",
    md: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
const { default: __VLS_99 } = __VLS_97.slots;
let __VLS_100;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
    modelValue: (__VLS_ctx.filters.origen),
    items: (__VLS_ctx.originOptions),
    label: "Origen",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}));
const __VLS_102 = __VLS_101({
    modelValue: (__VLS_ctx.filters.origen),
    items: (__VLS_ctx.originOptions),
    label: "Origen",
    itemTitle: "title",
    itemValue: "value",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
// @ts-ignore
[filters, originOptions,];
var __VLS_97;
// @ts-ignore
[];
var __VLS_47;
if (__VLS_ctx.error) {
    let __VLS_105;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: (__VLS_ctx.error),
    }));
    const __VLS_107 = __VLS_106({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-3" },
        text: (__VLS_ctx.error),
    }, ...__VLS_functionalComponentArgsRest(__VLS_106));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
}
let __VLS_110;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent1(__VLS_110, new __VLS_110({
    dense: true,
}));
const __VLS_112 = __VLS_111({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
const { default: __VLS_115 } = __VLS_113.slots;
let __VLS_116;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent1(__VLS_116, new __VLS_116({
    cols: "12",
    lg: "9",
}));
const __VLS_118 = __VLS_117({
    cols: "12",
    lg: "9",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
const { default: __VLS_121 } = __VLS_119.slots;
let __VLS_122;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent1(__VLS_122, new __VLS_122({
    headers: (__VLS_ctx.headers),
    items: (__VLS_ctx.filteredAlerts),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo alertas operativas...",
    ...{ class: "elevation-0 enterprise-table alerts-table" },
    itemsPerPage: (15),
}));
const __VLS_124 = __VLS_123({
    headers: (__VLS_ctx.headers),
    items: (__VLS_ctx.filteredAlerts),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo alertas operativas...",
    ...{ class: "elevation-0 enterprise-table alerts-table" },
    itemsPerPage: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
/** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
/** @type {__VLS_StyleScopedClasses['alerts-table']} */ ;
const { default: __VLS_127 } = __VLS_125.slots;
{
    const { 'item.nivel': __VLS_128 } = __VLS_125.slots;
    const [{ item }] = __VLS_vSlot(__VLS_128);
    let __VLS_129;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_130 = __VLS_asFunctionalComponent1(__VLS_129, new __VLS_129({
        size: "small",
        label: true,
        color: (__VLS_ctx.levelColor(__VLS_ctx.resolveRow(item).nivel)),
        variant: "tonal",
    }));
    const __VLS_131 = __VLS_130({
        size: "small",
        label: true,
        color: (__VLS_ctx.levelColor(__VLS_ctx.resolveRow(item).nivel)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_130));
    const { default: __VLS_134 } = __VLS_132.slots;
    (__VLS_ctx.resolveRow(item).nivel);
    // @ts-ignore
    [error, error, headers, filteredAlerts, loading, levelColor, resolveRow, resolveRow,];
    var __VLS_132;
    // @ts-ignore
    [];
}
{
    const { 'item.estado': __VLS_135 } = __VLS_125.slots;
    const [{ item }] = __VLS_vSlot(__VLS_135);
    let __VLS_136;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent1(__VLS_136, new __VLS_136({
        size: "small",
        label: true,
        color: (__VLS_ctx.stateColor(__VLS_ctx.resolveRow(item).estado)),
        variant: "tonal",
    }));
    const __VLS_138 = __VLS_137({
        size: "small",
        label: true,
        color: (__VLS_ctx.stateColor(__VLS_ctx.resolveRow(item).estado)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    const { default: __VLS_141 } = __VLS_139.slots;
    (__VLS_ctx.resolveRow(item).estado);
    // @ts-ignore
    [resolveRow, resolveRow, stateColor,];
    var __VLS_139;
    // @ts-ignore
    [];
}
{
    const { 'item.title': __VLS_142 } = __VLS_125.slots;
    const [{ item }] = __VLS_vSlot(__VLS_142);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.resolveRow(item).title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    (__VLS_ctx.resolveRow(item).subtitle);
    if (__VLS_ctx.resolveRow(item).accion_sugerida) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-primary mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        (__VLS_ctx.resolveRow(item).accion_sugerida);
    }
    if (__VLS_ctx.inventoryAlertItems(__VLS_ctx.resolveRow(item)).length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inventory-alert-table mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['inventory-alert-table']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [inventoryItem] of __VLS_vFor((__VLS_ctx.inventoryAlertItems(__VLS_ctx.resolveRow(item))))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (String(inventoryItem.stock_id || inventoryItem.producto_id || inventoryItem.producto_label)),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (inventoryItem.producto_label || "-");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (inventoryItem.bodega_label || "-");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (__VLS_ctx.formatInventoryNumber(inventoryItem.stock_actual));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (__VLS_ctx.formatInventoryNumber(inventoryItem.stock_min_bodega));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (inventoryItem.observacion || "-");
            // @ts-ignore
            [resolveRow, resolveRow, resolveRow, resolveRow, resolveRow, resolveRow, inventoryAlertItems, inventoryAlertItems, formatInventoryNumber, formatInventoryNumber,];
        }
    }
    // @ts-ignore
    [];
}
{
    const { 'item.scope': __VLS_143 } = __VLS_125.slots;
    const [{ item }] = __VLS_vSlot(__VLS_143);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.resolveRow(item).equipo_label || __VLS_ctx.resolveRow(item).referencia_resuelta);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.resolveRow(item).categoria);
    (__VLS_ctx.resolveRow(item).origen);
    // @ts-ignore
    [resolveRow, resolveRow, resolveRow, resolveRow,];
}
{
    const { 'item.work_order_title': __VLS_144 } = __VLS_125.slots;
    const [{ item }] = __VLS_vSlot(__VLS_144);
    if (__VLS_ctx.resolveRow(item).work_order_count > 1) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        for (const [workOrder] of __VLS_vFor((__VLS_ctx.resolveRow(item).work_orders))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (workOrder.id),
                ...{ class: "mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (workOrder.label);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (workOrder.status_workflow || "Sin estado");
            // @ts-ignore
            [resolveRow, resolveRow,];
        }
    }
    else if (__VLS_ctx.resolveRow(item).work_order_title) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.resolveRow(item).work_order_title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (__VLS_ctx.resolveRow(item).work_order_status || "Sin estado");
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    // @ts-ignore
    [resolveRow, resolveRow, resolveRow,];
}
{
    const { 'item.fecha_generada': __VLS_145 } = __VLS_125.slots;
    const [{ item }] = __VLS_vSlot(__VLS_145);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    (__VLS_ctx.formatDate(__VLS_ctx.resolveRow(item).fecha_generada));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.resolveRow(item).referencia_resuelta);
    // @ts-ignore
    [resolveRow, resolveRow, formatDate,];
}
{
    const { bottom: __VLS_146 } = __VLS_125.slots;
    // @ts-ignore
    [];
}
{
    const { 'no-data': __VLS_147 } = __VLS_125.slots;
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
var __VLS_125;
// @ts-ignore
[];
var __VLS_119;
let __VLS_148;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent1(__VLS_148, new __VLS_148({
    cols: "12",
    lg: "3",
}));
const __VLS_150 = __VLS_149({
    cols: "12",
    lg: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
const { default: __VLS_153 } = __VLS_151.slots;
let __VLS_154;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent1(__VLS_154, new __VLS_154({
    rounded: "lg",
    variant: "outlined",
    ...{ class: "pa-4 mb-3" },
}));
const __VLS_156 = __VLS_155({
    rounded: "lg",
    variant: "outlined",
    ...{ class: "pa-4 mb-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
const { default: __VLS_159 } = __VLS_157.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.summary.by_category ?? []))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (item.categoria),
        ...{ class: "d-flex align-center justify-space-between py-1" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (item.categoria);
    let __VLS_160;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent1(__VLS_160, new __VLS_160({
        size: "small",
        label: true,
    }));
    const __VLS_162 = __VLS_161({
        size: "small",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    const { default: __VLS_165 } = __VLS_163.slots;
    (item.total);
    // @ts-ignore
    [summary,];
    var __VLS_163;
    // @ts-ignore
    [];
}
if (!(__VLS_ctx.summary.by_category ?? []).length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
}
// @ts-ignore
[summary,];
var __VLS_157;
let __VLS_166;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_167 = __VLS_asFunctionalComponent1(__VLS_166, new __VLS_166({
    rounded: "lg",
    variant: "outlined",
    ...{ class: "pa-4" },
}));
const __VLS_168 = __VLS_167({
    rounded: "lg",
    variant: "outlined",
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_167));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_171 } = __VLS_169.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.summary.by_origin ?? []))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (item.origen),
        ...{ class: "d-flex align-center justify-space-between py-1" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (item.origen);
    let __VLS_172;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent1(__VLS_172, new __VLS_172({
        size: "small",
        label: true,
    }));
    const __VLS_174 = __VLS_173({
        size: "small",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    const { default: __VLS_177 } = __VLS_175.slots;
    (item.total);
    // @ts-ignore
    [summary,];
    var __VLS_175;
    // @ts-ignore
    [];
}
if (!(__VLS_ctx.summary.by_origin ?? []).length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
}
// @ts-ignore
[summary,];
var __VLS_169;
// @ts-ignore
[];
var __VLS_151;
// @ts-ignore
[];
var __VLS_113;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

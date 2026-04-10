/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { getInventoryModule } from "@/app/config/maintenance-modules";
import { useUiStore } from "@/app/stores/ui.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { listAllPages } from "@/app/utils/list-all-pages";
const props = defineProps();
const ui = useUiStore();
const menu = useMenuStore();
const route = useRoute();
const { mdAndDown, smAndDown } = useDisplay();
const moduleConfig = computed(() => getInventoryModule(props.moduleKey));
const permissionAliases = computed(() => {
    const singular = props.moduleKey.endsWith("s") ? props.moduleKey.slice(0, -1) : props.moduleKey;
    return [props.moduleKey, singular, String(route.name ?? "")].filter(Boolean);
});
const menuPermissions = computed(() => getPermissionsForAnyComponent(menu.tree, permissionAliases.value));
const canRead = computed(() => menuPermissions.value.isReaded);
const canCreate = computed(() => moduleConfig.value?.allowCreate !== false && menuPermissions.value.isCreated);
const canEdit = computed(() => moduleConfig.value?.allowEdit !== false && menuPermissions.value.isEdited);
const canDelete = computed(() => moduleConfig.value?.allowDelete !== false && menuPermissions.value.permitDeleted);
const isStockBodegaModule = computed(() => moduleConfig.value?.key === "stock-bodega");
const records = ref([]);
const loading = ref(false);
const initialLoading = ref(false);
const saving = ref(false);
const error = ref(null);
const search = ref("");
const relationOptions = ref({});
const dialog = ref(false);
const deleteDialog = ref(false);
const reservationDialog = ref(false);
const editingId = ref(null);
const deletingId = ref(null);
const reservationLoading = ref(false);
const reservationError = ref(null);
const reservationRows = ref([]);
const reservationContext = reactive({
    productoLabel: "",
    bodegaLabel: "",
    totalCantidad: 0,
    activeCount: 0,
});
const form = reactive({});
const isDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const tableLoading = computed(() => loading.value || initialLoading.value);
const reservationHeaders = [
    { title: "Reserva", key: "estado" },
    { title: "Cantidad", key: "cantidad" },
    { title: "OT", key: "work_order_label" },
    { title: "Estado OT", key: "work_order_status" },
    { title: "Equipo", key: "equipment_label" },
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
async function listAll(endpoint) {
    return listAllPages(endpoint);
}
function normalizeLabel(item) {
    return item?.nombre ?? item?.razon_social ?? item?.codigo ?? item?.id;
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
            title: `${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`,
            bodegaId: r?.bodega_id ? String(r.bodega_id) : null,
        }));
    }
}
function isWarehouseDependentProductField(field) {
    return field.relation?.endpoint === "/kpi_inventory/productos";
}
function isMaterialField(field) {
    return (field.relation?.endpoint === "/kpi_inventory/productos" ||
        ["producto_id", "materiales"].includes(String(field.key || "")));
}
async function fetchRecords(skipLoading = false) {
    if (!moduleConfig.value)
        return;
    if (!canRead.value)
        return;
    if (!skipLoading)
        loading.value = true;
    error.value = null;
    try {
        records.value = await listAll(moduleConfig.value.endpoint);
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudieron cargar registros.";
    }
    finally {
        if (!skipLoading)
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
    for (const field of moduleConfig.value?.fields ?? []) {
        if (field.key === "status")
            form[field.key] = "ACTIVE";
        else if (field.type === "boolean")
            form[field.key] = false;
        else if (field.type === "number")
            form[field.key] = "0";
        else
            form[field.key] = "";
    }
}
function getSelectOptions(field) {
    if (field.options)
        return field.options;
    const options = relationOptions.value[field.key] ?? [];
    if (!isWarehouseDependentProductField(field))
        return options;
    if (!options.some((option) => String(option.bodegaId || "").trim()))
        return options;
    const warehouseId = String(form.bodega_id || "").trim();
    if (!warehouseId)
        return [];
    return options.filter((option) => String(option.bodegaId || "") === warehouseId);
}
function reservationStateColor(value) {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "RESERVADO")
        return "warning";
    if (normalized === "CONSUMIDO")
        return "success";
    if (normalized === "ANULADO")
        return "error";
    return "info";
}
function workflowStatusColor(value) {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "CLOSED")
        return "success";
    if (normalized === "IN_PROGRESS")
        return "warning";
    if (normalized === "PLANNED")
        return "info";
    if (normalized === "CANCELLED")
        return "error";
    return "secondary";
}
const headers = computed(() => {
    const cfg = moduleConfig.value;
    if (!cfg)
        return [];
    const base = cfg.fields.slice(0, 6).map((f) => ({ title: f.label, key: f.key }));
    if (!canEdit.value && !canDelete.value)
        return base;
    return [...base, { title: "Acciones", key: "actions", sortable: false }];
});
const rows = computed(() => {
    const cfg = moduleConfig.value;
    if (!cfg)
        return [];
    const q = search.value.trim().toLowerCase();
    return records.value
        .map((r) => {
        const out = { ...r };
        out._raw = r;
        for (const field of cfg.fields) {
            if (field.type === "select" && field.relation && r[field.key]) {
                const opt = (relationOptions.value[field.key] ?? []).find((x) => x.value === r[field.key]);
                out[field.key] = opt?.title ?? r[field.key];
            }
            if (field.type === "number") {
                out[field.key] = formatNumberForDisplay(r[field.key]);
            }
        }
        out._search = JSON.stringify(r).toLowerCase();
        return out;
    })
        .filter((r) => !q || r._search.includes(q));
});
function sanitizePayload() {
    const cfg = moduleConfig.value;
    const payload = {};
    if (!cfg)
        return payload;
    for (const field of cfg.fields) {
        let val = form[field.key];
        if (field.type === "number") {
            val = val === "" || val === null || val === undefined ? "0" : String(val);
        }
        if (field.type === "text") {
            val = val === "" ? null : val;
        }
        if (field.type === "select" && val === "") {
            val = null;
        }
        payload[field.key] = val;
    }
    if (cfg.key === "productos") {
        payload.registro_sanitario = "";
        payload.por_contenedores = false;
        payload.requiere_lote = false;
        payload.requiere_serie = false;
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
        const val = form[field.key];
        if (field.type === "boolean")
            continue;
        if (val === "" || val === null || val === undefined) {
            ui.error(`El campo ${field.label} es obligatorio.`);
            return false;
        }
    }
    return true;
}
function openCreate() {
    editingId.value = null;
    resetForm();
    dialog.value = true;
}
function openEdit(item) {
    editingId.value = item.id;
    resetForm();
    for (const field of moduleConfig.value?.fields ?? []) {
        form[field.key] = item[field.key] ?? form[field.key];
    }
    dialog.value = true;
}
function openDelete(item) {
    deletingId.value = item.id;
    deleteDialog.value = true;
}
async function openReservationDetail(item) {
    const raw = item?._raw ?? item;
    const productoId = String(raw?.producto_id || "").trim();
    const bodegaId = String(raw?.bodega_id || "").trim();
    if (!productoId || !bodegaId) {
        ui.error("No se pudo determinar el material y la bodega de este stock.");
        return;
    }
    reservationDialog.value = true;
    reservationLoading.value = true;
    reservationError.value = null;
    reservationRows.value = [];
    reservationContext.productoLabel = String(item?.producto_id || raw?.producto_id || "");
    reservationContext.bodegaLabel = String(item?.bodega_id || raw?.bodega_id || "");
    reservationContext.totalCantidad = 0;
    reservationContext.activeCount = 0;
    try {
        const { data } = await api.get("/kpi_maintenance/work-orders/material-reservations", {
            params: {
                producto_id: productoId,
                bodega_id: bodegaId,
            },
        });
        const payload = data?.data ?? data ?? {};
        reservationContext.productoLabel = String(payload?.producto_label || reservationContext.productoLabel || "");
        reservationContext.bodegaLabel = String(payload?.bodega_label || reservationContext.bodegaLabel || "");
        reservationContext.totalCantidad = Number(payload?.total_cantidad || 0);
        reservationContext.activeCount = Number(payload?.reservas_activas || 0);
        reservationRows.value = asArray(payload?.items).map((row) => ({
            ...row,
            cantidad: Number(row?.cantidad || 0),
        }));
    }
    catch (e) {
        reservationError.value =
            e?.response?.data?.message || "No se pudo obtener el detalle de reservas.";
    }
    finally {
        reservationLoading.value = false;
    }
}
async function save() {
    if (!moduleConfig.value)
        return;
    if (!canRead.value)
        return;
    if (!validateForm())
        return;
    if (!editingId.value && !canCreate.value) {
        ui.error("No tienes permisos para crear en este módulo.");
        return;
    }
    if (editingId.value && !canEdit.value) {
        ui.error("No tienes permisos para editar en este módulo.");
        return;
    }
    saving.value = true;
    try {
        const payload = sanitizePayload();
        if (editingId.value) {
            await api.patch(`${moduleConfig.value.endpoint}/${editingId.value}`, payload);
            ui.success("Registro actualizado correctamente.");
        }
        else {
            await api.post(moduleConfig.value.endpoint, payload);
            ui.success("Registro creado correctamente.");
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
    if (!canDelete.value) {
        ui.error("No tienes permisos para eliminar en este módulo.");
        return;
    }
    saving.value = true;
    try {
        await api.delete(`${moduleConfig.value.endpoint}/${deletingId.value}`);
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
watch(() => form.bodega_id, () => {
    const cfg = moduleConfig.value;
    if (!cfg)
        return;
    const productField = cfg.fields.find((field) => field.key === "producto_id");
    if (!productField)
        return;
    const stillExists = getSelectOptions(productField).some((option) => String(option.value) === String(form.producto_id || ""));
    if (!stillExists) {
        form.producto_id = "";
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
/** @type {__VLS_StyleScopedClasses['inventory-table']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-table']} */ ;
if (!__VLS_ctx.moduleConfig) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        type: "error",
        variant: "tonal",
    }));
    const __VLS_2 = __VLS_1({
        type: "error",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    // @ts-ignore
    [moduleConfig,];
    var __VLS_3;
}
else if (!__VLS_ctx.canRead) {
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        type: "warning",
        variant: "tonal",
    }));
    const __VLS_8 = __VLS_7({
        type: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    // @ts-ignore
    [canRead,];
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
    (__VLS_ctx.moduleConfig.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.moduleConfig.title.toLowerCase());
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
        [moduleConfig, moduleConfig, canCreate, openCreate,];
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
        ...{ class: "elevation-0 enterprise-table inventory-table" },
    }));
    const __VLS_51 = __VLS_50({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.rows),
        loading: (__VLS_ctx.tableLoading),
        loadingText: "Obteniendo información del módulo...",
        itemsPerPage: (20),
        ...{ class: "elevation-0 enterprise-table inventory-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_50));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['inventory-table']} */ ;
    const { default: __VLS_54 } = __VLS_52.slots;
    {
        const { 'item.actions': __VLS_55 } = __VLS_52.slots;
        const [{ item }] = __VLS_vSlot(__VLS_55);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        if (__VLS_ctx.isStockBodegaModule) {
            let __VLS_56;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
                ...{ 'onClick': {} },
                icon: "mdi-eye",
                variant: "text",
                color: "info",
            }));
            const __VLS_58 = __VLS_57({
                ...{ 'onClick': {} },
                icon: "mdi-eye",
                variant: "text",
                color: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_57));
            let __VLS_61;
            const __VLS_62 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.moduleConfig))
                            return;
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.isStockBodegaModule))
                            return;
                        __VLS_ctx.openReservationDetail(item);
                        // @ts-ignore
                        [headers, rows, tableLoading, isStockBodegaModule, openReservationDetail,];
                    } });
            var __VLS_59;
            var __VLS_60;
        }
        if (__VLS_ctx.canEdit) {
            let __VLS_63;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }));
            const __VLS_65 = __VLS_64({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }, ...__VLS_functionalComponentArgsRest(__VLS_64));
            let __VLS_68;
            const __VLS_69 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.moduleConfig))
                            return;
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.openEdit(item._raw ?? item);
                        // @ts-ignore
                        [canEdit, openEdit,];
                    } });
            var __VLS_66;
            var __VLS_67;
        }
        if (__VLS_ctx.canDelete) {
            let __VLS_70;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_72 = __VLS_71({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_71));
            let __VLS_75;
            const __VLS_76 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.moduleConfig))
                            return;
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canDelete))
                            return;
                        __VLS_ctx.openDelete(item._raw ?? item);
                        // @ts-ignore
                        [canDelete, openDelete,];
                    } });
            var __VLS_73;
            var __VLS_74;
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
let __VLS_77;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({
    modelValue: (__VLS_ctx.reservationDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 980),
}));
const __VLS_79 = __VLS_78({
    modelValue: (__VLS_ctx.reservationDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 980),
}, ...__VLS_functionalComponentArgsRest(__VLS_78));
const { default: __VLS_82 } = __VLS_80.slots;
let __VLS_83;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_85 = __VLS_84({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_88 } = __VLS_86.slots;
let __VLS_89;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_91 = __VLS_90({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_94 } = __VLS_92.slots;
// @ts-ignore
[reservationDialog, isDeleteDialogFullscreen, isDeleteDialogFullscreen,];
var __VLS_92;
let __VLS_95;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({}));
const __VLS_97 = __VLS_96({}, ...__VLS_functionalComponentArgsRest(__VLS_96));
let __VLS_100;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
    ...{ class: "pt-4" },
}));
const __VLS_102 = __VLS_101({
    ...{ class: "pt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
const { default: __VLS_105 } = __VLS_103.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "reservation-summary mb-4" },
});
/** @type {__VLS_StyleScopedClasses['reservation-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-caption text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-1 font-weight-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
(__VLS_ctx.reservationContext.productoLabel || "-");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-caption text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-1 font-weight-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
(__VLS_ctx.reservationContext.bodegaLabel || "-");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-caption text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-1 font-weight-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
(__VLS_ctx.formatNumberForDisplay(__VLS_ctx.reservationContext.totalCantidad || 0));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-caption text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-1 font-weight-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
(__VLS_ctx.reservationContext.activeCount || 0);
if (__VLS_ctx.reservationError) {
    let __VLS_106;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_107 = __VLS_asFunctionalComponent1(__VLS_106, new __VLS_106({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-3" },
    }));
    const __VLS_108 = __VLS_107({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_107));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const { default: __VLS_111 } = __VLS_109.slots;
    (__VLS_ctx.reservationError);
    // @ts-ignore
    [reservationContext, reservationContext, reservationContext, reservationContext, formatNumberForDisplay, reservationError, reservationError,];
    var __VLS_109;
}
let __VLS_112;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent1(__VLS_112, new __VLS_112({
    headers: (__VLS_ctx.reservationHeaders),
    items: (__VLS_ctx.reservationRows),
    loading: (__VLS_ctx.reservationLoading),
    loadingText: "Obteniendo reservas ligadas a órdenes de trabajo...",
    itemsPerPage: (10),
    ...{ class: "elevation-0 enterprise-table inventory-table" },
}));
const __VLS_114 = __VLS_113({
    headers: (__VLS_ctx.reservationHeaders),
    items: (__VLS_ctx.reservationRows),
    loading: (__VLS_ctx.reservationLoading),
    loadingText: "Obteniendo reservas ligadas a órdenes de trabajo...",
    itemsPerPage: (10),
    ...{ class: "elevation-0 enterprise-table inventory-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
/** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-table']} */ ;
const { default: __VLS_117 } = __VLS_115.slots;
{
    const { 'item.estado': __VLS_118 } = __VLS_115.slots;
    const [{ item }] = __VLS_vSlot(__VLS_118);
    let __VLS_119;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
        size: "small",
        variant: "tonal",
        color: (__VLS_ctx.reservationStateColor(item.estado)),
    }));
    const __VLS_121 = __VLS_120({
        size: "small",
        variant: "tonal",
        color: (__VLS_ctx.reservationStateColor(item.estado)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    const { default: __VLS_124 } = __VLS_122.slots;
    (item.estado);
    // @ts-ignore
    [reservationHeaders, reservationRows, reservationLoading, reservationStateColor,];
    var __VLS_122;
    // @ts-ignore
    [];
}
{
    const { 'item.work_order_status': __VLS_125 } = __VLS_115.slots;
    const [{ item }] = __VLS_vSlot(__VLS_125);
    let __VLS_126;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
        size: "small",
        variant: "tonal",
        color: (__VLS_ctx.workflowStatusColor(item.work_order_status)),
    }));
    const __VLS_128 = __VLS_127({
        size: "small",
        variant: "tonal",
        color: (__VLS_ctx.workflowStatusColor(item.work_order_status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_127));
    const { default: __VLS_131 } = __VLS_129.slots;
    (item.work_order_status || "Sin estado");
    // @ts-ignore
    [workflowStatusColor,];
    var __VLS_129;
    // @ts-ignore
    [];
}
{
    const { 'item.cantidad': __VLS_132 } = __VLS_115.slots;
    const [{ item }] = __VLS_vSlot(__VLS_132);
    (__VLS_ctx.formatNumberForDisplay(item.cantidad || 0));
    // @ts-ignore
    [formatNumberForDisplay,];
}
{
    const { bottom: __VLS_133 } = __VLS_115.slots;
    if (!__VLS_ctx.reservationLoading && !__VLS_ctx.reservationRows.length && !__VLS_ctx.reservationError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "pa-4 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    // @ts-ignore
    [reservationError, reservationRows, reservationLoading,];
}
// @ts-ignore
[];
var __VLS_115;
// @ts-ignore
[];
var __VLS_103;
let __VLS_134;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent1(__VLS_134, new __VLS_134({}));
const __VLS_136 = __VLS_135({}, ...__VLS_functionalComponentArgsRest(__VLS_135));
let __VLS_139;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent1(__VLS_139, new __VLS_139({
    ...{ class: "pa-4" },
}));
const __VLS_141 = __VLS_140({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_144 } = __VLS_142.slots;
let __VLS_145;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent1(__VLS_145, new __VLS_145({}));
const __VLS_147 = __VLS_146({}, ...__VLS_functionalComponentArgsRest(__VLS_146));
let __VLS_150;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent1(__VLS_150, new __VLS_150({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_152 = __VLS_151({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
let __VLS_155;
const __VLS_156 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.reservationDialog = false;
            // @ts-ignore
            [reservationDialog,];
        } });
const { default: __VLS_157 } = __VLS_153.slots;
// @ts-ignore
[];
var __VLS_153;
var __VLS_154;
// @ts-ignore
[];
var __VLS_142;
// @ts-ignore
[];
var __VLS_86;
// @ts-ignore
[];
var __VLS_80;
let __VLS_158;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent1(__VLS_158, new __VLS_158({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 900),
}));
const __VLS_160 = __VLS_159({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 900),
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
const { default: __VLS_163 } = __VLS_161.slots;
let __VLS_164;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent1(__VLS_164, new __VLS_164({
    rounded: "xl",
    ...{ class: "enterprise-dialog inventory-dialog-card" },
}));
const __VLS_166 = __VLS_165({
    rounded: "xl",
    ...{ class: "enterprise-dialog inventory-dialog-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['inventory-dialog-card']} */ ;
const { default: __VLS_169 } = __VLS_167.slots;
let __VLS_170;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent1(__VLS_170, new __VLS_170({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_172 = __VLS_171({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_175 } = __VLS_173.slots;
(__VLS_ctx.editingId ? 'Editar' : 'Crear');
(__VLS_ctx.moduleConfig?.title);
// @ts-ignore
[moduleConfig, dialog, isDialogFullscreen, isDialogFullscreen, editingId,];
var __VLS_173;
let __VLS_176;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({}));
const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
let __VLS_181;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_182 = __VLS_asFunctionalComponent1(__VLS_181, new __VLS_181({
    ...{ class: "pt-4 section-surface" },
}));
const __VLS_183 = __VLS_182({
    ...{ class: "pt-4 section-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_182));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['section-surface']} */ ;
const { default: __VLS_186 } = __VLS_184.slots;
let __VLS_187;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_188 = __VLS_asFunctionalComponent1(__VLS_187, new __VLS_187({
    dense: true,
}));
const __VLS_189 = __VLS_188({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_188));
const { default: __VLS_192 } = __VLS_190.slots;
for (const [field] of __VLS_vFor((__VLS_ctx.moduleConfig?.fields ?? []))) {
    let __VLS_193;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_194 = __VLS_asFunctionalComponent1(__VLS_193, new __VLS_193({
        key: (field.key),
        cols: "12",
        md: "6",
    }));
    const __VLS_195 = __VLS_194({
        key: (field.key),
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    const { default: __VLS_198 } = __VLS_196.slots;
    if (field.type === 'select' && __VLS_ctx.isMaterialField(field)) {
        let __VLS_199;
        /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
        vAutocomplete;
        // @ts-ignore
        const __VLS_200 = __VLS_asFunctionalComponent1(__VLS_199, new __VLS_199({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (field.label),
            hint: (field.required ? 'Obligatorio' : ''),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
            density: "comfortable",
            noDataText: "No hay materiales disponibles para este filtro",
        }));
        const __VLS_201 = __VLS_200({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (field.label),
            hint: (field.required ? 'Obligatorio' : ''),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
            density: "comfortable",
            noDataText: "No hay materiales disponibles para este filtro",
        }, ...__VLS_functionalComponentArgsRest(__VLS_200));
    }
    else if (field.type === 'select') {
        let __VLS_204;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent1(__VLS_204, new __VLS_204({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (field.label),
            hint: (field.required ? 'Obligatorio' : ''),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
        }));
        const __VLS_206 = __VLS_205({
            modelValue: (__VLS_ctx.form[field.key]),
            items: (__VLS_ctx.getSelectOptions(field)),
            itemTitle: "title",
            itemValue: "value",
            label: (field.label),
            hint: (field.required ? 'Obligatorio' : ''),
            persistentHint: true,
            clearable: true,
            variant: "outlined",
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    }
    else if (field.type === 'boolean') {
        let __VLS_209;
        /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
        vCheckbox;
        // @ts-ignore
        const __VLS_210 = __VLS_asFunctionalComponent1(__VLS_209, new __VLS_209({
            modelValue: (__VLS_ctx.form[field.key]),
            label: (field.label),
            hideDetails: true,
        }));
        const __VLS_211 = __VLS_210({
            modelValue: (__VLS_ctx.form[field.key]),
            label: (field.label),
            hideDetails: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_210));
    }
    else {
        let __VLS_214;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_215 = __VLS_asFunctionalComponent1(__VLS_214, new __VLS_214({
            modelValue: (__VLS_ctx.form[field.key]),
            type: (field.type === 'number' ? 'number' : 'text'),
            label: (field.label),
            hint: (field.required ? 'Obligatorio' : ''),
            persistentHint: true,
            variant: "outlined",
        }));
        const __VLS_216 = __VLS_215({
            modelValue: (__VLS_ctx.form[field.key]),
            type: (field.type === 'number' ? 'number' : 'text'),
            label: (field.label),
            hint: (field.required ? 'Obligatorio' : ''),
            persistentHint: true,
            variant: "outlined",
        }, ...__VLS_functionalComponentArgsRest(__VLS_215));
    }
    // @ts-ignore
    [moduleConfig, isMaterialField, form, form, form, form, getSelectOptions, getSelectOptions,];
    var __VLS_196;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_190;
// @ts-ignore
[];
var __VLS_184;
let __VLS_219;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_220 = __VLS_asFunctionalComponent1(__VLS_219, new __VLS_219({}));
const __VLS_221 = __VLS_220({}, ...__VLS_functionalComponentArgsRest(__VLS_220));
let __VLS_224;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent1(__VLS_224, new __VLS_224({
    ...{ class: "pa-4" },
}));
const __VLS_226 = __VLS_225({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_229 } = __VLS_227.slots;
let __VLS_230;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_231 = __VLS_asFunctionalComponent1(__VLS_230, new __VLS_230({}));
const __VLS_232 = __VLS_231({}, ...__VLS_functionalComponentArgsRest(__VLS_231));
let __VLS_235;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_236 = __VLS_asFunctionalComponent1(__VLS_235, new __VLS_235({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_237 = __VLS_236({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_236));
let __VLS_240;
const __VLS_241 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog,];
        } });
const { default: __VLS_242 } = __VLS_238.slots;
// @ts-ignore
[];
var __VLS_238;
var __VLS_239;
let __VLS_243;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent1(__VLS_243, new __VLS_243({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}));
const __VLS_245 = __VLS_244({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
let __VLS_248;
const __VLS_249 = ({ click: {} },
    { onClick: (__VLS_ctx.save) });
const { default: __VLS_250 } = __VLS_246.slots;
// @ts-ignore
[saving, save,];
var __VLS_246;
var __VLS_247;
// @ts-ignore
[];
var __VLS_227;
// @ts-ignore
[];
var __VLS_167;
// @ts-ignore
[];
var __VLS_161;
let __VLS_251;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent1(__VLS_251, new __VLS_251({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}));
const __VLS_253 = __VLS_252({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
const { default: __VLS_256 } = __VLS_254.slots;
let __VLS_257;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent1(__VLS_257, new __VLS_257({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_259 = __VLS_258({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_262 } = __VLS_260.slots;
let __VLS_263;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_264 = __VLS_asFunctionalComponent1(__VLS_263, new __VLS_263({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_265 = __VLS_264({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_264));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_268 } = __VLS_266.slots;
// @ts-ignore
[isDeleteDialogFullscreen, isDeleteDialogFullscreen, deleteDialog,];
var __VLS_266;
let __VLS_269;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_270 = __VLS_asFunctionalComponent1(__VLS_269, new __VLS_269({}));
const __VLS_271 = __VLS_270({}, ...__VLS_functionalComponentArgsRest(__VLS_270));
const { default: __VLS_274 } = __VLS_272.slots;
// @ts-ignore
[];
var __VLS_272;
let __VLS_275;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({}));
const __VLS_277 = __VLS_276({}, ...__VLS_functionalComponentArgsRest(__VLS_276));
const { default: __VLS_280 } = __VLS_278.slots;
let __VLS_281;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent1(__VLS_281, new __VLS_281({}));
const __VLS_283 = __VLS_282({}, ...__VLS_functionalComponentArgsRest(__VLS_282));
let __VLS_286;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_287 = __VLS_asFunctionalComponent1(__VLS_286, new __VLS_286({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_288 = __VLS_287({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_287));
let __VLS_291;
const __VLS_292 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.deleteDialog = false;
            // @ts-ignore
            [deleteDialog,];
        } });
const { default: __VLS_293 } = __VLS_289.slots;
// @ts-ignore
[];
var __VLS_289;
var __VLS_290;
let __VLS_294;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_295 = __VLS_asFunctionalComponent1(__VLS_294, new __VLS_294({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}));
const __VLS_296 = __VLS_295({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_295));
let __VLS_299;
const __VLS_300 = ({ click: {} },
    { onClick: (__VLS_ctx.confirmDelete) });
const { default: __VLS_301 } = __VLS_297.slots;
// @ts-ignore
[saving, confirmDelete,];
var __VLS_297;
var __VLS_298;
// @ts-ignore
[];
var __VLS_278;
// @ts-ignore
[];
var __VLS_260;
// @ts-ignore
[];
var __VLS_254;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

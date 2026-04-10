/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown } = useDisplay();
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, [
    "transferencias-bodega",
    "transferencias de bodega",
    "inventario",
]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const transfers = ref([]);
const pendingOrders = ref([]);
const warehouses = ref([]);
const products = ref([]);
const stockRows = ref([]);
const form = reactive({
    orden_compra_id: "",
    bodega_origen_id: "",
    bodega_destino_id: "",
    fecha_transferencia: new Date().toISOString().slice(0, 10),
    observacion: "",
    detalles: [],
});
const headers = [
    { title: "Código", key: "codigo" },
    { title: "Fecha", key: "fecha_transferencia" },
    { title: "Orden de compra", key: "orden_compra_codigo" },
    { title: "Proveedor", key: "orden_compra_proveedor" },
    { title: "Origen", key: "bodega_origen_label" },
    { title: "Destino", key: "bodega_destino_label" },
    { title: "Items", key: "total_items" },
    { title: "Cantidad total", key: "total_cantidad" },
    { title: "Estado", key: "estado" },
];
const isDialogFullscreen = computed(() => mdAndDown.value);
const selectedOrder = computed(() => pendingOrders.value.find((item) => String(item.id) === String(form.orden_compra_id)) ||
    null);
const sourceWarehouseOptions = computed(() => warehouses.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
})));
const effectiveSourceWarehouseId = computed(() => String(selectedOrder.value?.bodega_destino_id || form.bodega_origen_id || ""));
const sourceWarehouseLabel = computed(() => {
    const source = warehouses.value.find((item) => String(item.id) === effectiveSourceWarehouseId.value);
    return source ? `${source.codigo || ""} - ${source.nombre || source.id}`.trim() : "";
});
const destinationWarehouseOptions = computed(() => warehouses.value
    .filter((item) => String(item.id) !== effectiveSourceWarehouseId.value)
    .map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
})));
const pendingOrderOptions = computed(() => pendingOrders.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo} · ${item.proveedor_nombre || "Sin proveedor"} · ${item.bodega_label || "Sin bodega"}`,
})));
const productOptions = computed(() => products.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
})));
const currentStockByProduct = computed(() => {
    const map = new Map();
    const sourceWarehouseId = effectiveSourceWarehouseId.value;
    if (!sourceWarehouseId)
        return map;
    for (const row of stockRows.value) {
        if (String(row.bodega_id || "") !== sourceWarehouseId)
            continue;
        map.set(String(row.producto_id || ""), toNumber(row.stock_actual));
    }
    return map;
});
const tableRows = computed(() => transfers.value);
const totalQuantity = computed(() => form.detalles.reduce((sum, detail) => sum + toNumber(detail.cantidad), 0));
function toNumber(value) {
    const parsed = Number(String(value ?? "").replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : 0;
}
function formatNumber(value) {
    return new Intl.NumberFormat("es-EC", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(toNumber(value));
}
function formatCurrency(value) {
    return new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(toNumber(value));
}
function formatDate(value) {
    if (!value)
        return "";
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime()))
        return String(value);
    return date.toLocaleString("es-EC");
}
function createLocalId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function createEmptyDetail() {
    return {
        local_id: createLocalId(),
        orden_compra_det_id: "",
        producto_id: "",
        codigo_producto: "",
        nombre_producto: "",
        cantidad: "1",
        costo_unitario: "0",
        observacion: "",
    };
}
function getUserName() {
    return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}
function detailSubtotal(detail) {
    return toNumber(detail.cantidad) * toNumber(detail.costo_unitario);
}
function getCurrentStock(detail) {
    if (!detail.producto_id)
        return 0;
    return currentStockByProduct.value.get(String(detail.producto_id || "")) ?? 0;
}
function getRequestedQuantityForProduct(productId) {
    return form.detalles
        .filter((detail) => String(detail.producto_id || "") === String(productId || ""))
        .reduce((sum, detail) => sum + toNumber(detail.cantidad), 0);
}
function detailExceedsStock(detail) {
    if (!detail.producto_id)
        return false;
    return getRequestedQuantityForProduct(detail.producto_id) > getCurrentStock(detail);
}
function resetForm() {
    form.orden_compra_id = "";
    form.bodega_origen_id = "";
    form.bodega_destino_id = "";
    form.fecha_transferencia = new Date().toISOString().slice(0, 10);
    form.observacion = "";
    form.detalles = [createEmptyDetail()];
}
function addDetail() {
    form.detalles.push(createEmptyDetail());
}
function removeDetail(localId) {
    form.detalles = form.detalles.filter((detail) => detail.local_id !== localId);
    if (!form.detalles.length) {
        form.detalles = selectedOrder.value ? [] : [createEmptyDetail()];
    }
}
function handleDetailProductChange(detail) {
    const product = products.value.find((item) => String(item.id) === String(detail.producto_id));
    if (!product)
        return;
    detail.codigo_producto = String(product.codigo || "");
    detail.nombre_producto = String(product.nombre || "");
    detail.costo_unitario = String(product.costo_promedio || product.ultimo_costo || 0);
}
function mapOrderDetails(details) {
    return Array.isArray(details)
        ? details.map((detail) => ({
            local_id: createLocalId(),
            orden_compra_det_id: String(detail.id || ""),
            producto_id: String(detail.producto_id || ""),
            codigo_producto: String(detail.codigo_producto || ""),
            nombre_producto: String(detail.nombre_producto || ""),
            cantidad: String(detail.cantidad || "0"),
            costo_unitario: String(detail.costo_unitario || "0"),
            observacion: String(detail.observacion || ""),
        }))
        : [];
}
async function loadCatalogs() {
    const [warehouseRows, productRows, stockRowsPayload] = await Promise.all([
        listAllPages("/kpi_inventory/bodegas"),
        listAllPages("/kpi_inventory/productos"),
        listAllPages("/kpi_inventory/stock-bodega"),
    ]);
    warehouses.value = warehouseRows;
    products.value = productRows;
    stockRows.value = stockRowsPayload;
}
async function loadTransfers() {
    transfers.value = (await listAllPages("/kpi_inventory/transferencias-bodega"));
}
async function loadPendingOrders() {
    const { data } = await api.get("/kpi_inventory/ordenes-compra/pendientes-transferencia");
    const payload = data?.data ?? data;
    pendingOrders.value = Array.isArray(payload) ? payload : [];
}
async function hydrateView() {
    if (!canRead.value)
        return;
    loading.value = true;
    try {
        await Promise.all([loadCatalogs(), loadTransfers(), loadPendingOrders()]);
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo cargar el módulo de transferencias.");
    }
    finally {
        loading.value = false;
    }
}
function openCreate() {
    resetForm();
    dialog.value = true;
}
function validateForm() {
    if (!effectiveSourceWarehouseId.value) {
        ui.error("Debes seleccionar la bodega origen.");
        return false;
    }
    if (!form.bodega_destino_id) {
        ui.error("Debes seleccionar la bodega destino.");
        return false;
    }
    if (effectiveSourceWarehouseId.value === String(form.bodega_destino_id || "")) {
        ui.error("La bodega destino debe ser distinta a la bodega origen.");
        return false;
    }
    if (!form.detalles.length) {
        ui.error("Debes agregar al menos un material para transferir.");
        return false;
    }
    for (const detail of form.detalles) {
        if (!detail.producto_id) {
            ui.error("Todos los materiales de la transferencia deben estar seleccionados.");
            return false;
        }
        if (!(toNumber(detail.cantidad) > 0)) {
            ui.error("La cantidad de cada material debe ser mayor a cero.");
            return false;
        }
        if (detailExceedsStock(detail)) {
            const materialLabel = detail.codigo_producto || detail.nombre_producto || "el material seleccionado";
            ui.error(`La cantidad ingresada para ${materialLabel} es mayor a la que hay en la bodega.`);
            return false;
        }
    }
    return true;
}
async function saveTransfer() {
    if (!validateForm())
        return;
    if (!canCreate.value) {
        ui.error("No tienes permisos para registrar transferencias.");
        return;
    }
    saving.value = true;
    try {
        await api.post("/kpi_inventory/transferencias-bodega", {
            orden_compra_id: form.orden_compra_id || undefined,
            bodega_origen_id: effectiveSourceWarehouseId.value,
            bodega_destino_id: form.bodega_destino_id,
            fecha_transferencia: form.fecha_transferencia || undefined,
            observacion: form.observacion || undefined,
            created_by: getUserName(),
            updated_by: getUserName(),
            detalles: form.detalles.map((detail) => ({
                orden_compra_det_id: detail.orden_compra_det_id || undefined,
                producto_id: detail.producto_id,
                cantidad: toNumber(detail.cantidad),
                observacion: detail.observacion || undefined,
            })),
        });
        ui.success("Transferencia registrada correctamente.");
        dialog.value = false;
        await hydrateView();
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo guardar la transferencia.");
    }
    finally {
        saving.value = false;
    }
}
watch(selectedOrder, (order) => {
    if (order) {
        form.bodega_origen_id = String(order.bodega_destino_id || "");
        form.detalles = mapOrderDetails(order.detalles);
    }
    else {
        form.detalles = [createEmptyDetail()];
    }
});
watch(() => effectiveSourceWarehouseId.value, () => {
    const valid = destinationWarehouseOptions.value.some((item) => String(item.value) === String(form.bodega_destino_id || ""));
    form.bodega_destino_id = valid
        ? String(form.bodega_destino_id)
        : String(destinationWarehouseOptions.value[0]?.value || "");
});
onMounted(async () => {
    if (!canRead.value)
        return;
    await hydrateView();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['details-table']} */ ;
/** @type {__VLS_StyleScopedClasses['details-table']} */ ;
/** @type {__VLS_StyleScopedClasses['details-table']} */ ;
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
else {
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_8 = __VLS_7({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_11 } = __VLS_9.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-header mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
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
        ...{ class: "d-flex flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    let __VLS_12;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        color: "info",
        variant: "tonal",
    }));
    const __VLS_14 = __VLS_13({
        color: "info",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const { default: __VLS_17 } = __VLS_15.slots;
    (__VLS_ctx.pendingOrders.length);
    // @ts-ignore
    [pendingOrders,];
    var __VLS_15;
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        ...{ 'onClick': {} },
        variant: "text",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_20 = __VLS_19({
        ...{ 'onClick': {} },
        variant: "text",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    let __VLS_23;
    const __VLS_24 = ({ click: {} },
        { onClick: (__VLS_ctx.hydrateView) });
    const { default: __VLS_25 } = __VLS_21.slots;
    // @ts-ignore
    [loading, hydrateView,];
    var __VLS_21;
    var __VLS_22;
    if (__VLS_ctx.canCreate) {
        let __VLS_26;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-swap-horizontal",
        }));
        const __VLS_28 = __VLS_27({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-swap-horizontal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_27));
        let __VLS_31;
        const __VLS_32 = ({ click: {} },
            { onClick: (__VLS_ctx.openCreate) });
        const { default: __VLS_33 } = __VLS_29.slots;
        // @ts-ignore
        [canCreate, openCreate,];
        var __VLS_29;
        var __VLS_30;
    }
    let __VLS_34;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.tableRows),
        loading: (__VLS_ctx.loading),
        loadingText: "Obteniendo transferencias de bodega...",
        itemsPerPage: (15),
        ...{ class: "elevation-0 enterprise-table" },
    }));
    const __VLS_36 = __VLS_35({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.tableRows),
        loading: (__VLS_ctx.loading),
        loadingText: "Obteniendo transferencias de bodega...",
        itemsPerPage: (15),
        ...{ class: "elevation-0 enterprise-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    const { default: __VLS_39 } = __VLS_37.slots;
    {
        const { 'item.fecha_transferencia': __VLS_40 } = __VLS_37.slots;
        const [{ item }] = __VLS_vSlot(__VLS_40);
        (__VLS_ctx.formatDate(item.fecha_transferencia));
        // @ts-ignore
        [loading, headers, tableRows, formatDate,];
    }
    {
        const { 'item.orden_compra_codigo': __VLS_41 } = __VLS_37.slots;
        const [{ item }] = __VLS_vSlot(__VLS_41);
        let __VLS_42;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
            size: "small",
            variant: "tonal",
            color: (item.orden_compra_codigo ? 'info' : 'secondary'),
        }));
        const __VLS_44 = __VLS_43({
            size: "small",
            variant: "tonal",
            color: (item.orden_compra_codigo ? 'info' : 'secondary'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
        const { default: __VLS_47 } = __VLS_45.slots;
        (item.orden_compra_codigo || "Manual");
        // @ts-ignore
        [];
        var __VLS_45;
        // @ts-ignore
        [];
    }
    {
        const { 'item.estado': __VLS_48 } = __VLS_37.slots;
        const [{ item }] = __VLS_vSlot(__VLS_48);
        let __VLS_49;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
            size: "small",
            variant: "tonal",
            color: "success",
        }));
        const __VLS_51 = __VLS_50({
            size: "small",
            variant: "tonal",
            color: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_50));
        const { default: __VLS_54 } = __VLS_52.slots;
        (item.estado || "COMPLETADA");
        // @ts-ignore
        [];
        var __VLS_52;
        // @ts-ignore
        [];
    }
    {
        const { 'item.total_cantidad': __VLS_55 } = __VLS_37.slots;
        const [{ item }] = __VLS_vSlot(__VLS_55);
        (__VLS_ctx.formatNumber(item.total_cantidad));
        // @ts-ignore
        [formatNumber,];
    }
    // @ts-ignore
    [];
    var __VLS_37;
    // @ts-ignore
    [];
    var __VLS_9;
}
let __VLS_56;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1440),
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1440),
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const { default: __VLS_61 } = __VLS_59.slots;
let __VLS_62;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_64 = __VLS_63({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_67 } = __VLS_65.slots;
let __VLS_68;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_70 = __VLS_69({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_73 } = __VLS_71.slots;
// @ts-ignore
[dialog, isDialogFullscreen, isDialogFullscreen,];
var __VLS_71;
let __VLS_74;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent1(__VLS_74, new __VLS_74({}));
const __VLS_76 = __VLS_75({}, ...__VLS_functionalComponentArgsRest(__VLS_75));
let __VLS_79;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
    ...{ class: "pt-4 section-surface" },
}));
const __VLS_81 = __VLS_80({
    ...{ class: "pt-4 section-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['section-surface']} */ ;
const { default: __VLS_84 } = __VLS_82.slots;
let __VLS_85;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
    dense: true,
}));
const __VLS_87 = __VLS_86({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
const { default: __VLS_90 } = __VLS_88.slots;
let __VLS_91;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent1(__VLS_91, new __VLS_91({
    cols: "12",
    md: "5",
}));
const __VLS_93 = __VLS_92({
    cols: "12",
    md: "5",
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
const { default: __VLS_96 } = __VLS_94.slots;
let __VLS_97;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent1(__VLS_97, new __VLS_97({
    modelValue: (__VLS_ctx.form.orden_compra_id),
    items: (__VLS_ctx.pendingOrderOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Orden de compra para precarga (opcional)",
    variant: "outlined",
    clearable: true,
}));
const __VLS_99 = __VLS_98({
    modelValue: (__VLS_ctx.form.orden_compra_id),
    items: (__VLS_ctx.pendingOrderOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Orden de compra para precarga (opcional)",
    variant: "outlined",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
// @ts-ignore
[form, pendingOrderOptions,];
var __VLS_94;
let __VLS_102;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({
    cols: "12",
    md: "2",
}));
const __VLS_104 = __VLS_103({
    cols: "12",
    md: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_103));
const { default: __VLS_107 } = __VLS_105.slots;
let __VLS_108;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
    modelValue: (__VLS_ctx.form.fecha_transferencia),
    type: "date",
    label: "Fecha de transferencia",
    variant: "outlined",
}));
const __VLS_110 = __VLS_109({
    modelValue: (__VLS_ctx.form.fecha_transferencia),
    type: "date",
    label: "Fecha de transferencia",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
// @ts-ignore
[form,];
var __VLS_105;
let __VLS_113;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
    cols: "12",
    md: "5",
}));
const __VLS_115 = __VLS_114({
    cols: "12",
    md: "5",
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
const { default: __VLS_118 } = __VLS_116.slots;
let __VLS_119;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
    modelValue: (__VLS_ctx.selectedOrder?.proveedor_nombre || 'Transferencia manual'),
    label: "Proveedor / origen de la solicitud",
    variant: "outlined",
    readonly: true,
}));
const __VLS_121 = __VLS_120({
    modelValue: (__VLS_ctx.selectedOrder?.proveedor_nombre || 'Transferencia manual'),
    label: "Proveedor / origen de la solicitud",
    variant: "outlined",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
// @ts-ignore
[selectedOrder,];
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
if (__VLS_ctx.selectedOrder) {
    let __VLS_130;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_131 = __VLS_asFunctionalComponent1(__VLS_130, new __VLS_130({
        modelValue: (__VLS_ctx.sourceWarehouseLabel),
        label: "Bodega origen",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_132 = __VLS_131({
        modelValue: (__VLS_ctx.sourceWarehouseLabel),
        label: "Bodega origen",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_131));
}
else {
    let __VLS_135;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
        modelValue: (__VLS_ctx.form.bodega_origen_id),
        items: (__VLS_ctx.sourceWarehouseOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Bodega origen",
        variant: "outlined",
    }));
    const __VLS_137 = __VLS_136({
        modelValue: (__VLS_ctx.form.bodega_origen_id),
        items: (__VLS_ctx.sourceWarehouseOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Bodega origen",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_136));
}
// @ts-ignore
[form, selectedOrder, sourceWarehouseLabel, sourceWarehouseOptions,];
var __VLS_127;
let __VLS_140;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
    cols: "12",
    md: "6",
}));
const __VLS_142 = __VLS_141({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
const { default: __VLS_145 } = __VLS_143.slots;
let __VLS_146;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
    modelValue: (__VLS_ctx.form.bodega_destino_id),
    items: (__VLS_ctx.destinationWarehouseOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Bodega destino",
    variant: "outlined",
}));
const __VLS_148 = __VLS_147({
    modelValue: (__VLS_ctx.form.bodega_destino_id),
    items: (__VLS_ctx.destinationWarehouseOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Bodega destino",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
// @ts-ignore
[form, destinationWarehouseOptions,];
var __VLS_143;
let __VLS_151;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
    cols: "12",
}));
const __VLS_153 = __VLS_152({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
const { default: __VLS_156 } = __VLS_154.slots;
let __VLS_157;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent1(__VLS_157, new __VLS_157({
    modelValue: (__VLS_ctx.form.observacion),
    label: "Observación",
    variant: "outlined",
    rows: "2",
    autoGrow: true,
}));
const __VLS_159 = __VLS_158({
    modelValue: (__VLS_ctx.form.observacion),
    label: "Observación",
    variant: "outlined",
    rows: "2",
    autoGrow: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
// @ts-ignore
[form,];
var __VLS_154;
// @ts-ignore
[];
var __VLS_88;
if (__VLS_ctx.selectedOrder) {
    let __VLS_162;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-4" },
    }));
    const __VLS_164 = __VLS_163({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    const { default: __VLS_167 } = __VLS_165.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.selectedOrder.codigo);
    // @ts-ignore
    [selectedOrder, selectedOrder,];
    var __VLS_165;
}
else {
    let __VLS_168;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-4" },
    }));
    const __VLS_170 = __VLS_169({
        type: "info",
        variant: "tonal",
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    const { default: __VLS_173 } = __VLS_171.slots;
    // @ts-ignore
    [];
    var __VLS_171;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between mb-2" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
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
(__VLS_ctx.selectedOrder ? 'Puedes ajustar cantidades o retirar materiales precargados.' : 'Agrega los materiales que se moverán entre bodegas.');
if (!__VLS_ctx.selectedOrder) {
    let __VLS_174;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_175 = __VLS_asFunctionalComponent1(__VLS_174, new __VLS_174({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_176 = __VLS_175({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_175));
    let __VLS_179;
    const __VLS_180 = ({ click: {} },
        { onClick: (__VLS_ctx.addDetail) });
    const { default: __VLS_181 } = __VLS_177.slots;
    // @ts-ignore
    [selectedOrder, selectedOrder, addDetail,];
    var __VLS_177;
    var __VLS_178;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "transfer-details-table" },
});
/** @type {__VLS_StyleScopedClasses['transfer-details-table']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
    ...{ class: "details-table" },
});
/** @type {__VLS_StyleScopedClasses['details-table']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [detail] of __VLS_vFor((__VLS_ctx.form.detalles))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (detail.local_id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (detail.codigo_producto || "-");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    let __VLS_182;
    /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
    vAutocomplete;
    // @ts-ignore
    const __VLS_183 = __VLS_asFunctionalComponent1(__VLS_182, new __VLS_182({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (detail.producto_id),
        items: (__VLS_ctx.productOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        variant: "outlined",
        hideDetails: true,
        disabled: (Boolean(__VLS_ctx.selectedOrder)),
    }));
    const __VLS_184 = __VLS_183({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (detail.producto_id),
        items: (__VLS_ctx.productOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        variant: "outlined",
        hideDetails: true,
        disabled: (Boolean(__VLS_ctx.selectedOrder)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_183));
    let __VLS_187;
    const __VLS_188 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                __VLS_ctx.handleDetailProductChange(detail);
                // @ts-ignore
                [form, selectedOrder, productOptions, handleDetailProductChange,];
            } });
    var __VLS_185;
    var __VLS_186;
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "quantity-cell" },
    });
    /** @type {__VLS_StyleScopedClasses['quantity-cell']} */ ;
    let __VLS_189;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_190 = __VLS_asFunctionalComponent1(__VLS_189, new __VLS_189({
        modelValue: (detail.cantidad),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        error: (__VLS_ctx.detailExceedsStock(detail)),
        hideDetails: true,
    }));
    const __VLS_191 = __VLS_190({
        modelValue: (detail.cantidad),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        error: (__VLS_ctx.detailExceedsStock(detail)),
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_190));
    if (__VLS_ctx.detailExceedsStock(detail)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-error mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-error']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        (__VLS_ctx.formatNumber(__VLS_ctx.getRequestedQuantityForProduct(detail.producto_id)));
        (__VLS_ctx.formatNumber(__VLS_ctx.getCurrentStock(detail)));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    let __VLS_194;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_195 = __VLS_asFunctionalComponent1(__VLS_194, new __VLS_194({
        modelValue: (__VLS_ctx.formatNumber(__VLS_ctx.getCurrentStock(detail))),
        label: "Stock actual",
        variant: "outlined",
        readonly: true,
        hideDetails: true,
    }));
    const __VLS_196 = __VLS_195({
        modelValue: (__VLS_ctx.formatNumber(__VLS_ctx.getCurrentStock(detail))),
        label: "Stock actual",
        variant: "outlined",
        readonly: true,
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_195));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "text-right font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.formatCurrency(detail.costo_unitario));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "text-right font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.formatCurrency(__VLS_ctx.detailSubtotal(detail)));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    let __VLS_199;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_200 = __VLS_asFunctionalComponent1(__VLS_199, new __VLS_199({
        modelValue: (detail.observacion),
        variant: "outlined",
        hideDetails: true,
    }));
    const __VLS_201 = __VLS_200({
        modelValue: (detail.observacion),
        variant: "outlined",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_200));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    let __VLS_204;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent1(__VLS_204, new __VLS_204({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_209;
    const __VLS_210 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.removeDetail(detail.local_id);
                // @ts-ignore
                [formatNumber, formatNumber, formatNumber, detailExceedsStock, detailExceedsStock, getRequestedQuantityForProduct, getCurrentStock, getCurrentStock, formatCurrency, formatCurrency, detailSubtotal, removeDetail,];
            } });
    var __VLS_207;
    var __VLS_208;
    // @ts-ignore
    [];
}
if (!__VLS_ctx.form.detalles.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        colspan: "8",
        ...{ class: "text-center text-medium-emphasis py-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    (__VLS_ctx.selectedOrder ? "La orden seleccionada no tiene materiales disponibles." : "Agrega materiales para continuar.");
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex flex-wrap justify-end mt-4" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
let __VLS_211;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_212 = __VLS_asFunctionalComponent1(__VLS_211, new __VLS_211({
    color: "info",
    variant: "tonal",
}));
const __VLS_213 = __VLS_212({
    color: "info",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_212));
const { default: __VLS_216 } = __VLS_214.slots;
(__VLS_ctx.form.detalles.length);
// @ts-ignore
[form, form, selectedOrder,];
var __VLS_214;
let __VLS_217;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent1(__VLS_217, new __VLS_217({
    color: "success",
    variant: "tonal",
}));
const __VLS_219 = __VLS_218({
    color: "success",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
const { default: __VLS_222 } = __VLS_220.slots;
(__VLS_ctx.formatNumber(__VLS_ctx.totalQuantity));
// @ts-ignore
[formatNumber, totalQuantity,];
var __VLS_220;
// @ts-ignore
[];
var __VLS_82;
let __VLS_223;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent1(__VLS_223, new __VLS_223({}));
const __VLS_225 = __VLS_224({}, ...__VLS_functionalComponentArgsRest(__VLS_224));
let __VLS_228;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent1(__VLS_228, new __VLS_228({
    ...{ class: "pa-4" },
}));
const __VLS_230 = __VLS_229({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_233 } = __VLS_231.slots;
let __VLS_234;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent1(__VLS_234, new __VLS_234({}));
const __VLS_236 = __VLS_235({}, ...__VLS_functionalComponentArgsRest(__VLS_235));
let __VLS_239;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent1(__VLS_239, new __VLS_239({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_241 = __VLS_240({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
let __VLS_244;
const __VLS_245 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog,];
        } });
const { default: __VLS_246 } = __VLS_242.slots;
// @ts-ignore
[];
var __VLS_242;
var __VLS_243;
let __VLS_247;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_248 = __VLS_asFunctionalComponent1(__VLS_247, new __VLS_247({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}));
const __VLS_249 = __VLS_248({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_248));
let __VLS_252;
const __VLS_253 = ({ click: {} },
    { onClick: (__VLS_ctx.saveTransfer) });
const { default: __VLS_254 } = __VLS_250.slots;
// @ts-ignore
[saving, saveTransfer,];
var __VLS_250;
var __VLS_251;
// @ts-ignore
[];
var __VLS_231;
// @ts-ignore
[];
var __VLS_65;
// @ts-ignore
[];
var __VLS_59;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

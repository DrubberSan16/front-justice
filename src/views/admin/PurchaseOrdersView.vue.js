/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
import { downloadPurchaseOrderPdf } from "@/app/utils/purchase-order-documents";
const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, [
    "ordenes-compra",
    "ordenes de compra",
    "compras",
    "inventario",
]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canDownloadPdf = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "inventario"));
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref(null);
const search = ref("");
const orders = ref([]);
const suppliers = ref([]);
const products = ref([]);
const warehouses = ref([]);
const deletingOrder = ref(null);
const form = reactive({
    codigo: "",
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_requerida: "",
    proveedor_id: "",
    bodega_destino_id: "",
    vendedor: "",
    condicion_pago: "CREDITO 90 DIAS",
    referencia: "",
    observacion: "",
    moneda: "USD",
    tipo_cambio: "1",
    detalles: [],
});
const headers = [
    { title: "Código", key: "codigo" },
    { title: "Fecha", key: "fecha_emision_label" },
    { title: "Proveedor", key: "proveedor_nombre" },
    { title: "Bodega", key: "bodega_label" },
    { title: "Estado", key: "estado" },
    { title: "Total", key: "total" },
    { title: "Transferencia", key: "tiene_transferencia" },
    { title: "Acciones", key: "actions", sortable: false },
];
const defaultWarehouse = computed(() => warehouses.value.find((item) => item.es_default_compra) ||
    warehouses.value.find((item) => item.es_principal) ||
    warehouses.value[0] ||
    null);
const defaultWarehouseLabel = computed(() => {
    const warehouse = defaultWarehouse.value;
    if (!warehouse)
        return "";
    return `Default compras: ${warehouse.codigo || ""} - ${warehouse.nombre || ""}`.trim();
});
const supplierOptions = computed(() => suppliers.value.map((item) => ({
    value: String(item.id),
    title: `${item.identificacion ? `${item.identificacion} - ` : ""}${item.razon_social || item.nombre_comercial || item.id}`,
})));
const warehouseOptions = computed(() => warehouses.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
})));
const productOptions = computed(() => products.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id} · costo ${formatCurrency(item.costo_promedio || item.ultimo_costo || 0)}`,
})));
const tableRows = computed(() => {
    const q = repairText(search.value).toLowerCase();
    return orders.value
        .map((item) => ({
        ...item,
        fecha_emision_label: formatDate(item.fecha_emision),
    }))
        .filter((item) => {
        if (!q)
            return true;
        return JSON.stringify(item).toLowerCase().includes(q);
    });
});
const orderTotals = computed(() => {
    return form.detalles.reduce((acc, detail) => {
        const quantity = toNumber(detail.cantidad);
        const unitCost = toNumber(detail.costo_unitario);
        const gross = quantity * unitCost;
        const discount = toNumber(detail.descuento) > 0
            ? toNumber(detail.descuento)
            : gross * (toNumber(detail.porcentaje_descuento) / 100);
        const subtotal = Math.max(0, gross - discount);
        const iva = subtotal * (toNumber(detail.iva_porcentaje || 12) / 100);
        acc.subtotal += subtotal;
        acc.descuento += discount;
        acc.iva += iva;
        acc.total += subtotal + iva;
        return acc;
    }, { subtotal: 0, descuento: 0, iva: 0, total: 0 });
});
function toNumber(value) {
    const parsed = Number(String(value ?? "").replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : 0;
}
function repairText(value) {
    const raw = String(value ?? "");
    if (!/[ÃƒÃ‚Ã¢]/.test(raw))
        return raw;
    try {
        return decodeURIComponent(escape(raw));
    }
    catch {
        return raw;
    }
}
function formatCurrency(value) {
    return new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: form.moneda || "USD",
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
    return date.toLocaleDateString("es-EC");
}
function createLocalId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function incrementAlphaPrefix(letter) {
    const nextCharCode = letter.toUpperCase().charCodeAt(0) + 1;
    if (nextCharCode > 90)
        return "A";
    return String.fromCharCode(nextCharCode);
}
function nextPurchaseOrderCode(lastCode) {
    if (!lastCode)
        return "OC-A00001";
    const match = /^OC-([A-Z])(\d{5})$/i.exec(String(lastCode || "").trim());
    if (!match)
        return "OC-A00001";
    const currentLetter = (match[1] ?? "A").toUpperCase();
    const currentNumber = Number(match[2] ?? "0");
    if (currentNumber >= 99999) {
        return `OC-${incrementAlphaPrefix(currentLetter)}00001`;
    }
    return `OC-${currentLetter}${String(currentNumber + 1).padStart(5, "0")}`;
}
function getPurchaseOrderCodeRank(code) {
    const match = /^OC-([A-Z])(\d{5})$/i.exec(String(code || "").trim());
    if (!match)
        return -1;
    const letter = (match[1] ?? "A").toUpperCase();
    const number = Number(match[2] ?? "0");
    return (letter.charCodeAt(0) - 64) * 100000 + number;
}
function getHighestPurchaseOrderCode(codes) {
    const normalized = codes
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .sort((a, b) => getPurchaseOrderCodeRank(b) - getPurchaseOrderCodeRank(a));
    return normalized[0] ?? null;
}
function nextPurchaseOrderReference(lastReference) {
    const match = /^IB-(\d{8})$/i.exec(String(lastReference || "").trim());
    if (!match)
        return "IB-00000001";
    const currentNumber = Number(match[1] ?? "0");
    return `IB-${String(currentNumber + 1).padStart(8, "0")}`;
}
function getHighestPurchaseOrderReference(references) {
    const normalized = references
        .map((item) => String(item || "").trim())
        .filter((item) => /^IB-\d{8}$/i.test(item))
        .sort((a, b) => {
        const aNumber = Number(/^IB-(\d{8})$/i.exec(a)?.[1] ?? "0");
        const bNumber = Number(/^IB-(\d{8})$/i.exec(b)?.[1] ?? "0");
        return bNumber - aNumber;
    });
    return normalized[0] ?? null;
}
function createEmptyDetail() {
    return {
        local_id: createLocalId(),
        producto_id: "",
        cantidad: "1",
        costo_unitario: "0",
        descuento: "0",
        porcentaje_descuento: "0",
        iva_porcentaje: "12",
        observacion: "",
    };
}
function getUserName() {
    return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}
function orderStateColor(value) {
    const normalized = String(value || "").toUpperCase();
    if (normalized === "TRANSFERIDA")
        return "success";
    if (normalized === "ANULADA")
        return "error";
    return "info";
}
function detailGrandTotal(detail) {
    const quantity = toNumber(detail.cantidad);
    const unitCost = toNumber(detail.costo_unitario);
    const gross = quantity * unitCost;
    const discount = toNumber(detail.descuento) > 0
        ? toNumber(detail.descuento)
        : gross * (toNumber(detail.porcentaje_descuento) / 100);
    const subtotal = Math.max(0, gross - discount);
    const iva = subtotal * (toNumber(detail.iva_porcentaje || 12) / 100);
    return subtotal + iva;
}
function resetForm() {
    const lastCode = getHighestPurchaseOrderCode(orders.value.map((item) => item?.codigo || ""));
    const lastReference = getHighestPurchaseOrderReference(orders.value.map((item) => item?.referencia || ""));
    form.codigo = nextPurchaseOrderCode(lastCode);
    form.fecha_emision = new Date().toISOString().slice(0, 10);
    form.fecha_requerida = "";
    form.proveedor_id = "";
    form.bodega_destino_id = String(defaultWarehouse.value?.id || "");
    form.vendedor = String(defaultWarehouse.value?.nombre || "MATRIZ");
    form.condicion_pago = "CREDITO 90 DIAS";
    form.referencia = nextPurchaseOrderReference(lastReference);
    form.observacion = "";
    form.moneda = "USD";
    form.tipo_cambio = "1";
    form.detalles = [createEmptyDetail()];
}
function addDetail() {
    form.detalles.push(createEmptyDetail());
}
function removeDetail(localId) {
    form.detalles = form.detalles.filter((detail) => detail.local_id !== localId);
    if (!form.detalles.length) {
        form.detalles = [createEmptyDetail()];
    }
}
function handleDetailProductChange(detail) {
    const product = products.value.find((item) => String(item.id) === String(detail.producto_id));
    if (!product)
        return;
    detail.costo_unitario = String(product.costo_promedio || product.ultimo_costo || 0);
    if (!detail.iva_porcentaje) {
        detail.iva_porcentaje = "12";
    }
}
async function loadCatalogs() {
    const [supplierRows, productRows, warehouseRows] = await Promise.all([
        listAllPages("/kpi_inventory/terceros"),
        listAllPages("/kpi_inventory/productos"),
        listAllPages("/kpi_inventory/bodegas"),
    ]);
    suppliers.value = supplierRows;
    products.value = productRows;
    warehouses.value = warehouseRows;
}
async function loadOrders() {
    orders.value = (await listAllPages("/kpi_inventory/ordenes-compra"));
}
async function hydrateView() {
    if (!canRead.value)
        return;
    loading.value = true;
    try {
        await Promise.all([loadCatalogs(), loadOrders()]);
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo cargar el módulo de órdenes de compra.");
    }
    finally {
        loading.value = false;
    }
}
function openCreate() {
    editingId.value = null;
    resetForm();
    dialog.value = true;
}
async function openEdit(item) {
    editingId.value = item.id;
    loading.value = true;
    try {
        const { data } = await api.get(`/kpi_inventory/ordenes-compra/${item.id}`);
        const order = (data?.data ?? data);
        form.codigo = String(order.codigo || "");
        form.fecha_emision = String(order.fecha_emision || "").slice(0, 10);
        form.fecha_requerida = String(order.fecha_requerida || "").slice(0, 10);
        form.proveedor_id = String(order.proveedor_id || "");
        form.bodega_destino_id = String(order.bodega_destino_id || defaultWarehouse.value?.id || "");
        form.vendedor = String(order.vendedor || "");
        form.condicion_pago = String(order.condicion_pago || "");
        form.referencia = String(order.referencia || "");
        form.observacion = String(order.observacion || "");
        form.moneda = String(order.moneda || "USD");
        form.tipo_cambio = String(order.tipo_cambio || "1");
        form.detalles = Array.isArray(order.detalles) && order.detalles.length
            ? order.detalles.map((detail) => ({
                local_id: createLocalId(),
                producto_id: String(detail.producto_id || ""),
                cantidad: String(detail.cantidad || "1"),
                costo_unitario: String(detail.costo_unitario || "0"),
                descuento: String(detail.descuento || "0"),
                porcentaje_descuento: String(detail.porcentaje_descuento || "0"),
                iva_porcentaje: String(detail.iva_porcentaje || "12"),
                observacion: String(detail.observacion || ""),
            }))
            : [createEmptyDetail()];
        dialog.value = true;
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo cargar la orden de compra.");
    }
    finally {
        loading.value = false;
    }
}
function openDelete(item) {
    deletingOrder.value = item;
    deleteDialog.value = true;
}
function validateForm() {
    if (!form.proveedor_id) {
        ui.error("Debes seleccionar un proveedor.");
        return false;
    }
    if (!form.bodega_destino_id) {
        ui.error("Debes seleccionar la bodega destino.");
        return false;
    }
    if (!form.detalles.length) {
        ui.error("Debes agregar al menos un material.");
        return false;
    }
    for (const detail of form.detalles) {
        if (!detail.producto_id) {
            ui.error("Todos los detalles deben tener un material seleccionado.");
            return false;
        }
        if (!(toNumber(detail.cantidad) > 0)) {
            ui.error("La cantidad de cada material debe ser mayor a cero.");
            return false;
        }
    }
    return true;
}
function buildPayload() {
    return {
        codigo: form.codigo || undefined,
        fecha_emision: form.fecha_emision || undefined,
        fecha_requerida: form.fecha_requerida || undefined,
        proveedor_id: form.proveedor_id || undefined,
        bodega_destino_id: form.bodega_destino_id || undefined,
        vendedor: form.vendedor || undefined,
        condicion_pago: form.condicion_pago || undefined,
        referencia: form.referencia || undefined,
        observacion: form.observacion || undefined,
        moneda: form.moneda || "USD",
        tipo_cambio: toNumber(form.tipo_cambio || 1),
        created_by: getUserName(),
        updated_by: getUserName(),
        detalles: form.detalles.map((detail) => ({
            producto_id: detail.producto_id,
            cantidad: toNumber(detail.cantidad),
            costo_unitario: toNumber(detail.costo_unitario),
            descuento: toNumber(detail.descuento),
            porcentaje_descuento: toNumber(detail.porcentaje_descuento),
            iva_porcentaje: toNumber(detail.iva_porcentaje || 12),
            observacion: detail.observacion || undefined,
        })),
    };
}
async function saveOrder() {
    if (!validateForm())
        return;
    if (!editingId.value && !canCreate.value) {
        ui.error("No tienes permisos para crear órdenes de compra.");
        return;
    }
    if (editingId.value && !canEdit.value) {
        ui.error("No tienes permisos para editar órdenes de compra.");
        return;
    }
    saving.value = true;
    try {
        const payload = buildPayload();
        if (editingId.value) {
            await api.patch(`/kpi_inventory/ordenes-compra/${editingId.value}`, payload);
            ui.success("Orden de compra actualizada correctamente.");
        }
        else {
            await api.post("/kpi_inventory/ordenes-compra", payload);
            ui.success("Orden de compra generada correctamente.");
        }
        dialog.value = false;
        await loadOrders();
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo guardar la orden de compra.");
    }
    finally {
        saving.value = false;
    }
}
async function confirmDelete() {
    if (!deletingOrder.value)
        return;
    saving.value = true;
    try {
        await api.delete(`/kpi_inventory/ordenes-compra/${deletingOrder.value.id}`);
        ui.success("Orden de compra eliminada correctamente.");
        deleteDialog.value = false;
        deletingOrder.value = null;
        await loadOrders();
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo eliminar la orden de compra.");
    }
    finally {
        saving.value = false;
    }
}
async function downloadPdf(item) {
    if (!canDownloadPdf.value) {
        ui.error("No tienes permisos para descargar este reporte.");
        return;
    }
    try {
        const { data } = await api.get(`/kpi_inventory/ordenes-compra/${item.id}`);
        await downloadPurchaseOrderPdf(data?.data ?? data, getUserName());
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo generar el PDF de la orden de compra.");
    }
}
onMounted(async () => {
    if (!canRead.value)
        return;
    await hydrateView();
    resetForm();
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
    if (__VLS_ctx.defaultWarehouseLabel) {
        let __VLS_12;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
            color: "info",
            variant: "tonal",
            prependIcon: "mdi-warehouse",
        }));
        const __VLS_14 = __VLS_13({
            color: "info",
            variant: "tonal",
            prependIcon: "mdi-warehouse",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        const { default: __VLS_17 } = __VLS_15.slots;
        (__VLS_ctx.defaultWarehouseLabel);
        // @ts-ignore
        [defaultWarehouseLabel, defaultWarehouseLabel,];
        var __VLS_15;
    }
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
            prependIcon: "mdi-plus",
        }));
        const __VLS_28 = __VLS_27({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-plus",
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
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        dense: true,
        ...{ class: "mb-2" },
    }));
    const __VLS_36 = __VLS_35({
        dense: true,
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    const { default: __VLS_39 } = __VLS_37.slots;
    let __VLS_40;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent1(__VLS_40, new __VLS_40({
        cols: "12",
        md: "5",
    }));
    const __VLS_42 = __VLS_41({
        cols: "12",
        md: "5",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    const { default: __VLS_45 } = __VLS_43.slots;
    let __VLS_46;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        modelValue: (__VLS_ctx.search),
        label: "Buscar por código, proveedor o referencia",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }));
    const __VLS_48 = __VLS_47({
        modelValue: (__VLS_ctx.search),
        label: "Buscar por código, proveedor o referencia",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    // @ts-ignore
    [search,];
    var __VLS_43;
    // @ts-ignore
    [];
    var __VLS_37;
    let __VLS_51;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.tableRows),
        loading: (__VLS_ctx.loading),
        loadingText: "Obteniendo órdenes de compra...",
        itemsPerPage: (15),
        ...{ class: "elevation-0 enterprise-table" },
    }));
    const __VLS_53 = __VLS_52({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.tableRows),
        loading: (__VLS_ctx.loading),
        loadingText: "Obteniendo órdenes de compra...",
        itemsPerPage: (15),
        ...{ class: "elevation-0 enterprise-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    const { default: __VLS_56 } = __VLS_54.slots;
    {
        const { 'item.estado': __VLS_57 } = __VLS_54.slots;
        const [{ item }] = __VLS_vSlot(__VLS_57);
        let __VLS_58;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
            size: "small",
            variant: "tonal",
            color: (__VLS_ctx.orderStateColor(item.estado)),
        }));
        const __VLS_60 = __VLS_59({
            size: "small",
            variant: "tonal",
            color: (__VLS_ctx.orderStateColor(item.estado)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_59));
        const { default: __VLS_63 } = __VLS_61.slots;
        (item.estado);
        // @ts-ignore
        [loading, headers, tableRows, orderStateColor,];
        var __VLS_61;
        // @ts-ignore
        [];
    }
    {
        const { 'item.total': __VLS_64 } = __VLS_54.slots;
        const [{ item }] = __VLS_vSlot(__VLS_64);
        (__VLS_ctx.formatCurrency(item.total));
        // @ts-ignore
        [formatCurrency,];
    }
    {
        const { 'item.tiene_transferencia': __VLS_65 } = __VLS_54.slots;
        const [{ item }] = __VLS_vSlot(__VLS_65);
        let __VLS_66;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
            size: "small",
            variant: "tonal",
            color: (item.tiene_transferencia ? 'success' : 'warning'),
        }));
        const __VLS_68 = __VLS_67({
            size: "small",
            variant: "tonal",
            color: (item.tiene_transferencia ? 'success' : 'warning'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_67));
        const { default: __VLS_71 } = __VLS_69.slots;
        (item.tiene_transferencia ? item.transferencia_codigo || "Transferida" : "Pendiente");
        // @ts-ignore
        [];
        var __VLS_69;
        // @ts-ignore
        [];
    }
    {
        const { 'item.actions': __VLS_72 } = __VLS_54.slots;
        const [{ item }] = __VLS_vSlot(__VLS_72);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        let __VLS_73;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
            ...{ 'onClick': {} },
            icon: "mdi-file-pdf-box",
            variant: "text",
            color: "error",
            disabled: (!__VLS_ctx.canDownloadPdf),
        }));
        const __VLS_75 = __VLS_74({
            ...{ 'onClick': {} },
            icon: "mdi-file-pdf-box",
            variant: "text",
            color: "error",
            disabled: (!__VLS_ctx.canDownloadPdf),
        }, ...__VLS_functionalComponentArgsRest(__VLS_74));
        let __VLS_78;
        const __VLS_79 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    __VLS_ctx.downloadPdf(item);
                    // @ts-ignore
                    [canDownloadPdf, downloadPdf,];
                } });
        var __VLS_76;
        var __VLS_77;
        if (__VLS_ctx.canEdit) {
            let __VLS_80;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
                disabled: (item.tiene_transferencia),
            }));
            const __VLS_82 = __VLS_81({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
                disabled: (item.tiene_transferencia),
            }, ...__VLS_functionalComponentArgsRest(__VLS_81));
            let __VLS_85;
            const __VLS_86 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.openEdit(item);
                        // @ts-ignore
                        [canEdit, openEdit,];
                    } });
            var __VLS_83;
            var __VLS_84;
        }
        if (__VLS_ctx.canDelete) {
            let __VLS_87;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
                disabled: (item.tiene_transferencia),
            }));
            const __VLS_89 = __VLS_88({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
                disabled: (item.tiene_transferencia),
            }, ...__VLS_functionalComponentArgsRest(__VLS_88));
            let __VLS_92;
            const __VLS_93 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canDelete))
                            return;
                        __VLS_ctx.openDelete(item);
                        // @ts-ignore
                        [canDelete, openDelete,];
                    } });
            var __VLS_90;
            var __VLS_91;
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_54;
    // @ts-ignore
    [];
    var __VLS_9;
}
let __VLS_94;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1440),
}));
const __VLS_96 = __VLS_95({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1440),
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
const { default: __VLS_99 } = __VLS_97.slots;
let __VLS_100;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_102 = __VLS_101({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_105 } = __VLS_103.slots;
let __VLS_106;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent1(__VLS_106, new __VLS_106({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_108 = __VLS_107({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_111 } = __VLS_109.slots;
(__VLS_ctx.editingId ? "Editar orden de compra" : "Nueva orden de compra");
// @ts-ignore
[dialog, isDialogFullscreen, isDialogFullscreen, editingId,];
var __VLS_109;
let __VLS_112;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent1(__VLS_112, new __VLS_112({}));
const __VLS_114 = __VLS_113({}, ...__VLS_functionalComponentArgsRest(__VLS_113));
let __VLS_117;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent1(__VLS_117, new __VLS_117({
    ...{ class: "pt-4 section-surface" },
}));
const __VLS_119 = __VLS_118({
    ...{ class: "pt-4 section-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['section-surface']} */ ;
const { default: __VLS_122 } = __VLS_120.slots;
let __VLS_123;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_124 = __VLS_asFunctionalComponent1(__VLS_123, new __VLS_123({
    dense: true,
}));
const __VLS_125 = __VLS_124({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_124));
const { default: __VLS_128 } = __VLS_126.slots;
let __VLS_129;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_130 = __VLS_asFunctionalComponent1(__VLS_129, new __VLS_129({
    cols: "12",
    md: "3",
}));
const __VLS_131 = __VLS_130({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_130));
const { default: __VLS_134 } = __VLS_132.slots;
let __VLS_135;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
    modelValue: (__VLS_ctx.form.codigo),
    readonly: true,
    label: "Código",
    variant: "outlined",
    hint: "Si lo dejas vacío, el sistema lo genera automáticamente.",
    persistentHint: true,
}));
const __VLS_137 = __VLS_136({
    modelValue: (__VLS_ctx.form.codigo),
    readonly: true,
    label: "Código",
    variant: "outlined",
    hint: "Si lo dejas vacío, el sistema lo genera automáticamente.",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
// @ts-ignore
[form,];
var __VLS_132;
let __VLS_140;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
    cols: "12",
    md: "3",
}));
const __VLS_142 = __VLS_141({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
const { default: __VLS_145 } = __VLS_143.slots;
let __VLS_146;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
    modelValue: (__VLS_ctx.form.fecha_emision),
    type: "date",
    label: "Fecha de emisión",
    variant: "outlined",
}));
const __VLS_148 = __VLS_147({
    modelValue: (__VLS_ctx.form.fecha_emision),
    type: "date",
    label: "Fecha de emisión",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
// @ts-ignore
[form,];
var __VLS_143;
let __VLS_151;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
    cols: "12",
    md: "3",
}));
const __VLS_153 = __VLS_152({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
const { default: __VLS_156 } = __VLS_154.slots;
let __VLS_157;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent1(__VLS_157, new __VLS_157({
    modelValue: (__VLS_ctx.form.fecha_requerida),
    type: "date",
    label: "Fecha requerida",
    variant: "outlined",
}));
const __VLS_159 = __VLS_158({
    modelValue: (__VLS_ctx.form.fecha_requerida),
    type: "date",
    label: "Fecha requerida",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
// @ts-ignore
[form,];
var __VLS_154;
let __VLS_162;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
    cols: "12",
    md: "3",
}));
const __VLS_164 = __VLS_163({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
const { default: __VLS_167 } = __VLS_165.slots;
let __VLS_168;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
    modelValue: (__VLS_ctx.form.proveedor_id),
    items: (__VLS_ctx.supplierOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Proveedor",
    variant: "outlined",
    clearable: true,
}));
const __VLS_170 = __VLS_169({
    modelValue: (__VLS_ctx.form.proveedor_id),
    items: (__VLS_ctx.supplierOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Proveedor",
    variant: "outlined",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
// @ts-ignore
[form, supplierOptions,];
var __VLS_165;
let __VLS_173;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_174 = __VLS_asFunctionalComponent1(__VLS_173, new __VLS_173({
    cols: "12",
    md: "4",
}));
const __VLS_175 = __VLS_174({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_174));
const { default: __VLS_178 } = __VLS_176.slots;
let __VLS_179;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_180 = __VLS_asFunctionalComponent1(__VLS_179, new __VLS_179({
    modelValue: (__VLS_ctx.form.bodega_destino_id),
    items: (__VLS_ctx.warehouseOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Bodega destino",
    variant: "outlined",
}));
const __VLS_181 = __VLS_180({
    modelValue: (__VLS_ctx.form.bodega_destino_id),
    items: (__VLS_ctx.warehouseOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Bodega destino",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_180));
// @ts-ignore
[form, warehouseOptions,];
var __VLS_176;
let __VLS_184;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent1(__VLS_184, new __VLS_184({
    cols: "12",
    md: "4",
}));
const __VLS_186 = __VLS_185({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
const { default: __VLS_189 } = __VLS_187.slots;
let __VLS_190;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_191 = __VLS_asFunctionalComponent1(__VLS_190, new __VLS_190({
    modelValue: (__VLS_ctx.form.vendedor),
    label: "Vendedor / sede emisora",
    variant: "outlined",
}));
const __VLS_192 = __VLS_191({
    modelValue: (__VLS_ctx.form.vendedor),
    label: "Vendedor / sede emisora",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_191));
// @ts-ignore
[form,];
var __VLS_187;
let __VLS_195;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_196 = __VLS_asFunctionalComponent1(__VLS_195, new __VLS_195({
    cols: "12",
    md: "4",
}));
const __VLS_197 = __VLS_196({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_196));
const { default: __VLS_200 } = __VLS_198.slots;
let __VLS_201;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent1(__VLS_201, new __VLS_201({
    modelValue: (__VLS_ctx.form.condicion_pago),
    label: "Condición de pago",
    variant: "outlined",
}));
const __VLS_203 = __VLS_202({
    modelValue: (__VLS_ctx.form.condicion_pago),
    label: "Condición de pago",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
// @ts-ignore
[form,];
var __VLS_198;
let __VLS_206;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_207 = __VLS_asFunctionalComponent1(__VLS_206, new __VLS_206({
    cols: "12",
    md: "4",
}));
const __VLS_208 = __VLS_207({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_207));
const { default: __VLS_211 } = __VLS_209.slots;
let __VLS_212;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent1(__VLS_212, new __VLS_212({
    modelValue: (__VLS_ctx.form.referencia),
    readonly: true,
    label: "Referencia",
    variant: "outlined",
    hint: "Referencia autogenerada tipo IB-00000001.",
    persistentHint: true,
}));
const __VLS_214 = __VLS_213({
    modelValue: (__VLS_ctx.form.referencia),
    readonly: true,
    label: "Referencia",
    variant: "outlined",
    hint: "Referencia autogenerada tipo IB-00000001.",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
// @ts-ignore
[form,];
var __VLS_209;
let __VLS_217;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent1(__VLS_217, new __VLS_217({
    cols: "12",
    md: "2",
}));
const __VLS_219 = __VLS_218({
    cols: "12",
    md: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
const { default: __VLS_222 } = __VLS_220.slots;
let __VLS_223;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent1(__VLS_223, new __VLS_223({
    modelValue: (__VLS_ctx.form.moneda),
    label: "Moneda",
    variant: "outlined",
}));
const __VLS_225 = __VLS_224({
    modelValue: (__VLS_ctx.form.moneda),
    label: "Moneda",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_224));
// @ts-ignore
[form,];
var __VLS_220;
let __VLS_228;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent1(__VLS_228, new __VLS_228({
    cols: "12",
    md: "2",
}));
const __VLS_230 = __VLS_229({
    cols: "12",
    md: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
const { default: __VLS_233 } = __VLS_231.slots;
let __VLS_234;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent1(__VLS_234, new __VLS_234({
    modelValue: (__VLS_ctx.form.tipo_cambio),
    label: "Tipo de cambio",
    type: "number",
    min: "0",
    step: "0.0001",
    variant: "outlined",
}));
const __VLS_236 = __VLS_235({
    modelValue: (__VLS_ctx.form.tipo_cambio),
    label: "Tipo de cambio",
    type: "number",
    min: "0",
    step: "0.0001",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
// @ts-ignore
[form,];
var __VLS_231;
let __VLS_239;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent1(__VLS_239, new __VLS_239({
    cols: "12",
}));
const __VLS_241 = __VLS_240({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
const { default: __VLS_244 } = __VLS_242.slots;
let __VLS_245;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent1(__VLS_245, new __VLS_245({
    modelValue: (__VLS_ctx.form.observacion),
    label: "Observación",
    variant: "outlined",
    rows: "2",
    autoGrow: true,
}));
const __VLS_247 = __VLS_246({
    modelValue: (__VLS_ctx.form.observacion),
    label: "Observación",
    variant: "outlined",
    rows: "2",
    autoGrow: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
// @ts-ignore
[form,];
var __VLS_242;
// @ts-ignore
[];
var __VLS_126;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between mt-4 mb-2" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
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
let __VLS_250;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_251 = __VLS_asFunctionalComponent1(__VLS_250, new __VLS_250({
    ...{ 'onClick': {} },
    color: "primary",
    variant: "tonal",
    prependIcon: "mdi-plus",
}));
const __VLS_252 = __VLS_251({
    ...{ 'onClick': {} },
    color: "primary",
    variant: "tonal",
    prependIcon: "mdi-plus",
}, ...__VLS_functionalComponentArgsRest(__VLS_251));
let __VLS_255;
const __VLS_256 = ({ click: {} },
    { onClick: (__VLS_ctx.addDetail) });
const { default: __VLS_257 } = __VLS_253.slots;
// @ts-ignore
[addDetail,];
var __VLS_253;
var __VLS_254;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "order-details-table" },
});
/** @type {__VLS_StyleScopedClasses['order-details-table']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
    ...{ class: "details-table" },
});
/** @type {__VLS_StyleScopedClasses['details-table']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "material-column" },
});
/** @type {__VLS_StyleScopedClasses['material-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "compact-column" },
});
/** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "compact-column" },
});
/** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "compact-column" },
});
/** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "compact-column" },
});
/** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "compact-column" },
});
/** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "total-column" },
});
/** @type {__VLS_StyleScopedClasses['total-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "observation-column" },
});
/** @type {__VLS_StyleScopedClasses['observation-column']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [detail] of __VLS_vFor((__VLS_ctx.form.detalles))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (detail.local_id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "material-column" },
    });
    /** @type {__VLS_StyleScopedClasses['material-column']} */ ;
    let __VLS_258;
    /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
    vAutocomplete;
    // @ts-ignore
    const __VLS_259 = __VLS_asFunctionalComponent1(__VLS_258, new __VLS_258({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (detail.producto_id),
        items: (__VLS_ctx.productOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        variant: "outlined",
        density: "comfortable",
        hideDetails: true,
    }));
    const __VLS_260 = __VLS_259({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (detail.producto_id),
        items: (__VLS_ctx.productOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        variant: "outlined",
        density: "comfortable",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_259));
    let __VLS_263;
    const __VLS_264 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                __VLS_ctx.handleDetailProductChange(detail);
                // @ts-ignore
                [form, productOptions, handleDetailProductChange,];
            } });
    var __VLS_261;
    var __VLS_262;
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "compact-column" },
    });
    /** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
    let __VLS_265;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_266 = __VLS_asFunctionalComponent1(__VLS_265, new __VLS_265({
        modelValue: (detail.cantidad),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        hideDetails: true,
    }));
    const __VLS_267 = __VLS_266({
        modelValue: (detail.cantidad),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_266));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "compact-column" },
    });
    /** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
    let __VLS_270;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_271 = __VLS_asFunctionalComponent1(__VLS_270, new __VLS_270({
        modelValue: (detail.costo_unitario),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        hideDetails: true,
    }));
    const __VLS_272 = __VLS_271({
        modelValue: (detail.costo_unitario),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_271));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "compact-column" },
    });
    /** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
    let __VLS_275;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({
        modelValue: (detail.descuento),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        hideDetails: true,
    }));
    const __VLS_277 = __VLS_276({
        modelValue: (detail.descuento),
        type: "number",
        min: "0",
        step: "0.0001",
        variant: "outlined",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_276));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "compact-column" },
    });
    /** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
    let __VLS_280;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent1(__VLS_280, new __VLS_280({
        modelValue: (detail.porcentaje_descuento),
        type: "number",
        min: "0",
        step: "0.01",
        variant: "outlined",
        hideDetails: true,
    }));
    const __VLS_282 = __VLS_281({
        modelValue: (detail.porcentaje_descuento),
        type: "number",
        min: "0",
        step: "0.01",
        variant: "outlined",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "compact-column" },
    });
    /** @type {__VLS_StyleScopedClasses['compact-column']} */ ;
    let __VLS_285;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_286 = __VLS_asFunctionalComponent1(__VLS_285, new __VLS_285({
        modelValue: (detail.iva_porcentaje),
        type: "number",
        min: "0",
        step: "0.01",
        variant: "outlined",
        hideDetails: true,
    }));
    const __VLS_287 = __VLS_286({
        modelValue: (detail.iva_porcentaje),
        type: "number",
        min: "0",
        step: "0.01",
        variant: "outlined",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_286));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "text-right font-weight-bold total-column" },
    });
    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['total-column']} */ ;
    (__VLS_ctx.formatCurrency(__VLS_ctx.detailGrandTotal(detail)));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "observation-column" },
    });
    /** @type {__VLS_StyleScopedClasses['observation-column']} */ ;
    let __VLS_290;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_291 = __VLS_asFunctionalComponent1(__VLS_290, new __VLS_290({
        modelValue: (detail.observacion),
        variant: "outlined",
        hideDetails: true,
    }));
    const __VLS_292 = __VLS_291({
        modelValue: (detail.observacion),
        variant: "outlined",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_291));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    let __VLS_295;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_296 = __VLS_asFunctionalComponent1(__VLS_295, new __VLS_295({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }));
    const __VLS_297 = __VLS_296({
        ...{ 'onClick': {} },
        icon: "mdi-delete",
        variant: "text",
        color: "error",
    }, ...__VLS_functionalComponentArgsRest(__VLS_296));
    let __VLS_300;
    const __VLS_301 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.removeDetail(detail.local_id);
                // @ts-ignore
                [formatCurrency, detailGrandTotal, removeDetail,];
            } });
    var __VLS_298;
    var __VLS_299;
    // @ts-ignore
    [];
}
if (!__VLS_ctx.form.detalles.length) {
    let __VLS_302;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_303 = __VLS_asFunctionalComponent1(__VLS_302, new __VLS_302({
        type: "info",
        variant: "tonal",
        ...{ class: "mt-3" },
    }));
    const __VLS_304 = __VLS_303({
        type: "info",
        variant: "tonal",
        ...{ class: "mt-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_303));
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    const { default: __VLS_307 } = __VLS_305.slots;
    // @ts-ignore
    [form,];
    var __VLS_305;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex flex-wrap justify-end mt-4 purchase-summary" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['purchase-summary']} */ ;
let __VLS_308;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_309 = __VLS_asFunctionalComponent1(__VLS_308, new __VLS_308({
    color: "info",
    variant: "tonal",
}));
const __VLS_310 = __VLS_309({
    color: "info",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_309));
const { default: __VLS_313 } = __VLS_311.slots;
(__VLS_ctx.formatCurrency(__VLS_ctx.orderTotals.subtotal));
// @ts-ignore
[formatCurrency, orderTotals,];
var __VLS_311;
let __VLS_314;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_315 = __VLS_asFunctionalComponent1(__VLS_314, new __VLS_314({
    color: "warning",
    variant: "tonal",
}));
const __VLS_316 = __VLS_315({
    color: "warning",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_315));
const { default: __VLS_319 } = __VLS_317.slots;
(__VLS_ctx.formatCurrency(__VLS_ctx.orderTotals.descuento));
// @ts-ignore
[formatCurrency, orderTotals,];
var __VLS_317;
let __VLS_320;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent1(__VLS_320, new __VLS_320({
    color: "secondary",
    variant: "tonal",
}));
const __VLS_322 = __VLS_321({
    color: "secondary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
const { default: __VLS_325 } = __VLS_323.slots;
(__VLS_ctx.formatCurrency(__VLS_ctx.orderTotals.iva));
// @ts-ignore
[formatCurrency, orderTotals,];
var __VLS_323;
let __VLS_326;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_327 = __VLS_asFunctionalComponent1(__VLS_326, new __VLS_326({
    color: "success",
    variant: "tonal",
}));
const __VLS_328 = __VLS_327({
    color: "success",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_327));
const { default: __VLS_331 } = __VLS_329.slots;
(__VLS_ctx.formatCurrency(__VLS_ctx.orderTotals.total));
// @ts-ignore
[formatCurrency, orderTotals,];
var __VLS_329;
// @ts-ignore
[];
var __VLS_120;
let __VLS_332;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_333 = __VLS_asFunctionalComponent1(__VLS_332, new __VLS_332({}));
const __VLS_334 = __VLS_333({}, ...__VLS_functionalComponentArgsRest(__VLS_333));
let __VLS_337;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_338 = __VLS_asFunctionalComponent1(__VLS_337, new __VLS_337({
    ...{ class: "pa-4" },
}));
const __VLS_339 = __VLS_338({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_338));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_342 } = __VLS_340.slots;
let __VLS_343;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_344 = __VLS_asFunctionalComponent1(__VLS_343, new __VLS_343({}));
const __VLS_345 = __VLS_344({}, ...__VLS_functionalComponentArgsRest(__VLS_344));
let __VLS_348;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_349 = __VLS_asFunctionalComponent1(__VLS_348, new __VLS_348({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_350 = __VLS_349({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_349));
let __VLS_353;
const __VLS_354 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog,];
        } });
const { default: __VLS_355 } = __VLS_351.slots;
// @ts-ignore
[];
var __VLS_351;
var __VLS_352;
let __VLS_356;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_357 = __VLS_asFunctionalComponent1(__VLS_356, new __VLS_356({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}));
const __VLS_358 = __VLS_357({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_357));
let __VLS_361;
const __VLS_362 = ({ click: {} },
    { onClick: (__VLS_ctx.saveOrder) });
const { default: __VLS_363 } = __VLS_359.slots;
// @ts-ignore
[saving, saveOrder,];
var __VLS_359;
var __VLS_360;
// @ts-ignore
[];
var __VLS_340;
// @ts-ignore
[];
var __VLS_103;
// @ts-ignore
[];
var __VLS_97;
let __VLS_364;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_365 = __VLS_asFunctionalComponent1(__VLS_364, new __VLS_364({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.smAndDown),
    maxWidth: (__VLS_ctx.smAndDown ? undefined : 520),
}));
const __VLS_366 = __VLS_365({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.smAndDown),
    maxWidth: (__VLS_ctx.smAndDown ? undefined : 520),
}, ...__VLS_functionalComponentArgsRest(__VLS_365));
const { default: __VLS_369 } = __VLS_367.slots;
let __VLS_370;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_371 = __VLS_asFunctionalComponent1(__VLS_370, new __VLS_370({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_372 = __VLS_371({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_371));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_375 } = __VLS_373.slots;
let __VLS_376;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_377 = __VLS_asFunctionalComponent1(__VLS_376, new __VLS_376({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_378 = __VLS_377({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_377));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_381 } = __VLS_379.slots;
// @ts-ignore
[deleteDialog, smAndDown, smAndDown,];
var __VLS_379;
let __VLS_382;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_383 = __VLS_asFunctionalComponent1(__VLS_382, new __VLS_382({}));
const __VLS_384 = __VLS_383({}, ...__VLS_functionalComponentArgsRest(__VLS_383));
const { default: __VLS_387 } = __VLS_385.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.deletingOrder?.codigo || "");
// @ts-ignore
[deletingOrder,];
var __VLS_385;
let __VLS_388;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_389 = __VLS_asFunctionalComponent1(__VLS_388, new __VLS_388({
    ...{ class: "pa-4" },
}));
const __VLS_390 = __VLS_389({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_389));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_393 } = __VLS_391.slots;
let __VLS_394;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_395 = __VLS_asFunctionalComponent1(__VLS_394, new __VLS_394({}));
const __VLS_396 = __VLS_395({}, ...__VLS_functionalComponentArgsRest(__VLS_395));
let __VLS_399;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_400 = __VLS_asFunctionalComponent1(__VLS_399, new __VLS_399({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_401 = __VLS_400({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_400));
let __VLS_404;
const __VLS_405 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.deleteDialog = false;
            // @ts-ignore
            [deleteDialog,];
        } });
const { default: __VLS_406 } = __VLS_402.slots;
// @ts-ignore
[];
var __VLS_402;
var __VLS_403;
let __VLS_407;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_408 = __VLS_asFunctionalComponent1(__VLS_407, new __VLS_407({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}));
const __VLS_409 = __VLS_408({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_408));
let __VLS_412;
const __VLS_413 = ({ click: {} },
    { onClick: (__VLS_ctx.confirmDelete) });
const { default: __VLS_414 } = __VLS_410.slots;
// @ts-ignore
[saving, confirmDelete,];
var __VLS_410;
var __VLS_411;
// @ts-ignore
[];
var __VLS_391;
// @ts-ignore
[];
var __VLS_373;
// @ts-ignore
[];
var __VLS_367;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

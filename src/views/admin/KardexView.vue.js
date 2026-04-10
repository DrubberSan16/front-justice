/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { fetchProductsWithStock } from "@/app/services/products-inventory.service";
import { hasReportAccess } from "@/app/config/report-access";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { listAllPages } from "@/app/utils/list-all-pages";
import { buildInventoryStockReport, downloadReportExcel, downloadReportPdf, } from "@/app/utils/maintenance-intelligence-reports";
const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const savingMovement = ref(false);
const uploading = ref(false);
const downloadingTemplate = ref(false);
const loadingKardex = ref(false);
const importJob = ref(null);
const importPollHandle = ref(null);
const exportState = reactive({});
const xlsxFile = ref(null);
const lastBulkSummary = ref(null);
const inventoryGroupBy = ref("bodega");
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, [
    "Kardex",
    "Movimientos de kardex",
    "Movimiento de kardex",
]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canAccessInventoryReports = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "inventario"));
const KARDEx_IMPORT_JOB_STORAGE_KEY = "kpi_inventory_kardex_import_job_id";
const movementForm = reactive({
    tipo: "INGRESO",
    productoId: "",
    bodegaId: "",
    cantidad: "1",
    observacion: "",
});
const products = ref([]);
const bodegas = ref([]);
const stocks = ref([]);
const kardex = ref([]);
const sucursales = ref([]);
const lineas = ref([]);
const categorias = ref([]);
const movementTypes = [
    { value: "INGRESO", title: "Ingreso de material" },
    { value: "SALIDA", title: "Salida de material" },
];
const inventoryGroupingOptions = [
    { value: "bodega", title: "Bodega" },
    { value: "sucursal", title: "Sucursal" },
    { value: "linea", title: "Línea" },
    { value: "categoria", title: "Categoría" },
    { value: "material", title: "Material" },
];
const warehouseOptions = computed(() => bodegas.value.map((b) => ({
    value: b.id,
    title: `${b.codigo} - ${b.nombre}`,
})));
const warehouseMap = computed(() => new Map(bodegas.value.map((item) => [String(item.id), item])));
const productMap = computed(() => new Map(products.value.map((item) => [String(item.id), item])));
const branchMap = computed(() => new Map(sucursales.value.map((item) => [String(item.id), item])));
const lineMap = computed(() => new Map(lineas.value.map((item) => [String(item.id), item])));
const categoryMap = computed(() => new Map(categorias.value.map((item) => [String(item.id), item])));
const stockByWarehouseProduct = computed(() => {
    const map = new Map();
    for (const row of stocks.value) {
        map.set(`${row.bodega_id}:${row.producto_id}`, row);
    }
    return map;
});
const selectedStockRow = computed(() => {
    if (!movementForm.bodegaId || !movementForm.productoId)
        return null;
    return (stockByWarehouseProduct.value.get(`${movementForm.bodegaId}:${movementForm.productoId}`) ?? null);
});
const selectedProduct = computed(() => {
    if (!movementForm.productoId)
        return null;
    return (products.value.find((product) => product.id === movementForm.productoId) ?? null);
});
const selectedUnitCost = computed(() => {
    const productCost = Number(selectedProduct.value?.costo_promedio || 0);
    if (Number.isFinite(productCost) && productCost > 0)
        return productCost;
    const stockCost = Number(selectedStockRow.value?.costo_promedio_bodega || 0);
    return Number.isFinite(stockCost) ? stockCost : 0;
});
const selectedUnitCostLabel = computed(() => formatNumberForDisplay(String(selectedUnitCost.value || 0)));
const activeImportJob = computed(() => {
    if (!importJob.value)
        return null;
    const status = String(importJob.value.status || "").toUpperCase();
    return status === "QUEUED" || status === "PROCESSING" ? importJob.value : null;
});
const activeImportProgress = computed(() => {
    const progress = Number(importJob.value?.progress || 0);
    if (!Number.isFinite(progress))
        return 0;
    return Math.min(100, Math.max(0, Math.round(progress)));
});
const activeImportTotalRows = computed(() => {
    const total = Number(importJob.value?.total_rows || 0);
    return Number.isFinite(total) && total > 0 ? total : 0;
});
const activeImportProcessedRows = computed(() => {
    const processed = Number(importJob.value?.current_index || 0);
    return Number.isFinite(processed) && processed > 0 ? processed : 0;
});
const activeImportPendingRows = computed(() => Math.max(0, activeImportTotalRows.value - activeImportProcessedRows.value));
const productOptions = computed(() => {
    if (!movementForm.bodegaId)
        return [];
    return products.value
        .filter((product) => {
        const stock = stockByWarehouseProduct.value.get(`${movementForm.bodegaId}:${product.id}`);
        if (movementForm.tipo !== "SALIDA")
            return true;
        return Number(stock?.stock_actual || 0) > 0;
    })
        .map((product) => {
        const stock = stockByWarehouseProduct.value.get(`${movementForm.bodegaId}:${product.id}`);
        const stockLabel = stock
            ? ` · stock ${formatNumberForDisplay(stock.stock_actual)}`
            : "";
        return {
            value: product.id,
            title: `${product.codigo} - ${product.nombre}${stockLabel}`,
        };
    });
});
const kardexHeaders = [
    { title: "Fecha", key: "fecha" },
    { title: "Tipo", key: "tipo" },
    { title: "Movimiento", key: "movimiento" },
    { title: "Material", key: "producto" },
    { title: "Bodega", key: "bodega" },
    { title: "Saldo", key: "saldo_cantidad" },
    { title: "Costo unitario", key: "costo_unitario" },
];
const kardexRows = computed(() => {
    const productNameById = new Map(products.value.map((p) => [p.id, `${p.codigo} - ${p.nombre}`]));
    const bodegaNameById = new Map(bodegas.value.map((b) => [b.id, `${b.codigo} - ${b.nombre}`]));
    return kardex.value.map((row) => ({
        ...row,
        fecha: new Date(row.fecha).toLocaleString(),
        producto: productNameById.get(row.producto_id) ?? row.producto_id,
        bodega: bodegaNameById.get(row.bodega_id) ?? row.bodega_id,
        entrada_cantidad: formatNumberForDisplay(row.entrada_cantidad),
        salida_cantidad: formatNumberForDisplay(row.salida_cantidad),
        saldo_cantidad: formatNumberForDisplay(row.saldo_cantidad),
        costo_unitario: formatNumberForDisplay(row.costo_unitario),
    }));
});
function getUserName() {
    return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}
function parsePositiveNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
async function listAll(endpoint) {
    return listAllPages(endpoint);
}
async function loadBaseData() {
    if (!canRead.value)
        return;
    try {
        const inventory = await fetchProductsWithStock();
        products.value = inventory.productos;
        bodegas.value = inventory.bodegas;
        stocks.value = inventory.stocks;
        sucursales.value = inventory.sucursales ?? [];
        lineas.value = inventory.lineas ?? [];
        categorias.value = inventory.categorias ?? [];
    }
    catch (error) {
        products.value = [];
        bodegas.value = [];
        stocks.value = [];
        sucursales.value = [];
        lineas.value = [];
        categorias.value = [];
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudieron cargar los catálogos de inventario.");
    }
}
function exportKey(format) {
    return `inventory:${format}`;
}
function isExporting(format) {
    return Boolean(exportState[exportKey(format)]);
}
const inventoryReportRows = computed(() => {
    const rows = stocks.value.map((stock) => {
        const product = productMap.value.get(String(stock.producto_id));
        const warehouse = warehouseMap.value.get(String(stock.bodega_id));
        const branch = branchMap.value.get(String(warehouse?.sucursal_id || ""));
        const line = lineMap.value.get(String(product?.linea_id || ""));
        const category = categoryMap.value.get(String(product?.categoria_id || ""));
        return {
            agrupacion: inventoryGroupBy.value === "sucursal"
                ? `${branch?.codigo || ""} - ${branch?.nombre || "Sin sucursal"}`
                : inventoryGroupBy.value === "linea"
                    ? `${line?.codigo || ""} - ${line?.nombre || "Sin línea"}`
                    : inventoryGroupBy.value === "categoria"
                        ? String(category?.nombre || "Sin categoría")
                        : inventoryGroupBy.value === "material"
                            ? `${product?.codigo || ""} - ${product?.nombre || "Sin material"}`
                            : `${warehouse?.codigo || ""} - ${warehouse?.nombre || "Sin bodega"}`,
            sucursal: `${branch?.codigo || ""} - ${branch?.nombre || "Sin sucursal"}`,
            bodega: `${warehouse?.codigo || ""} - ${warehouse?.nombre || "Sin bodega"}`,
            linea: `${line?.codigo || ""} - ${line?.nombre || "Sin línea"}`,
            categoria: String(category?.nombre || "Sin categoría"),
            codigo_material: String(product?.codigo || ""),
            material: String(product?.nombre || stock.producto_id || ""),
            stock_actual: Number(stock.stock_actual || 0),
            stock_minimo: Number(stock.stock_min_bodega || 0),
            stock_maximo: Number(stock.stock_max_bodega || 0),
            costo_promedio_bodega: Number(stock.costo_promedio_bodega || 0),
        };
    });
    return rows.sort((a, b) => `${a.agrupacion}|${a.codigo_material}|${a.material}`.localeCompare(`${b.agrupacion}|${b.codigo_material}|${b.material}`));
});
const inventorySummary = computed(() => [
    { label: "Registros de stock", value: inventoryReportRows.value.length },
    { label: "Bodegas", value: new Set(inventoryReportRows.value.map((item) => item.bodega)).size },
    { label: "Sucursales", value: new Set(inventoryReportRows.value.map((item) => item.sucursal)).size },
    {
        label: "Stock total",
        value: inventoryReportRows.value.reduce((acc, item) => acc + Number(item.stock_actual || 0), 0).toFixed(2),
    },
]);
async function exportInventoryReport(format) {
    if (!canAccessInventoryReports.value) {
        ui.error("No tienes permisos para exportar este reporte.");
        return;
    }
    const key = exportKey(format);
    exportState[key] = true;
    try {
        const report = buildInventoryStockReport({
            groupLabel: inventoryGroupingOptions.find((item) => item.value === inventoryGroupBy.value)?.title || "Bodega",
            summary: inventorySummary.value,
            rows: inventoryReportRows.value,
            movementRows: kardexRows.value,
        });
        if (format === "excel") {
            await downloadReportExcel(report);
        }
        else {
            await downloadReportPdf(report);
        }
    }
    catch (error) {
        ui.error(error?.message || "No se pudo generar el reporte de inventario.");
    }
    finally {
        exportState[key] = false;
    }
}
async function loadKardex() {
    if (!canRead.value)
        return;
    loadingKardex.value = true;
    try {
        kardex.value = (await listAll("/kpi_inventory/kardex"));
    }
    catch (error) {
        ui.error(error?.response?.data?.message || "No se pudo cargar kardex.");
    }
    finally {
        loadingKardex.value = false;
    }
}
async function saveMovement() {
    if (!canCreate.value) {
        ui.error("No tienes permisos para registrar movimientos.");
        return;
    }
    const cantidad = parsePositiveNumber(movementForm.cantidad);
    if (!movementForm.bodegaId) {
        ui.error("La bodega es obligatoria.");
        return;
    }
    if (!movementForm.productoId) {
        ui.error("El material es obligatorio.");
        return;
    }
    if (!cantidad) {
        ui.error("La cantidad debe ser mayor a cero.");
        return;
    }
    savingMovement.value = true;
    try {
        await api.post("/kpi_inventory/kardex/movimiento-manual", {
            tipo_movimiento: movementForm.tipo,
            bodega_id: movementForm.bodegaId,
            producto_id: movementForm.productoId,
            cantidad,
            observacion: movementForm.observacion || undefined,
            created_by: getUserName(),
            updated_by: getUserName(),
        });
        ui.success(`${movementForm.tipo === "INGRESO" ? "Ingreso" : "Salida"} registrado correctamente.`);
        movementForm.observacion = "";
        movementForm.cantidad = "1";
        await Promise.allSettled([loadKardex(), loadBaseData()]);
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo registrar el movimiento.");
    }
    finally {
        savingMovement.value = false;
    }
}
function requestBrowserNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window))
        return;
    if (window.Notification.permission === "default") {
        void window.Notification.requestPermission().catch(() => undefined);
    }
}
function emitBrowserNotification(title, body, tag) {
    if (typeof window === "undefined" || !("Notification" in window))
        return;
    if (window.Notification.permission !== "granted")
        return;
    try {
        new window.Notification(title, { body, tag });
    }
    catch {
        // ignore notification failures
    }
}
function notifyImportLifecycle(options) {
    if (options.requestPermission)
        requestBrowserNotificationPermission();
    ui.open(options.message, options.variant ?? "info", 5000);
    emitBrowserNotification(options.title, options.message, options.tag);
}
function importJobColor(status) {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "FAILED")
        return "error";
    if (normalized === "COMPLETED")
        return "success";
    if (normalized === "PROCESSING")
        return "warning";
    return "secondary";
}
function importJobStatusLabel(status) {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "FAILED")
        return "Falló";
    if (normalized === "COMPLETED")
        return "Completada";
    if (normalized === "PROCESSING")
        return "Procesando";
    if (normalized === "QUEUED")
        return "En cola";
    return normalized || "Pendiente";
}
function persistImportJobId(jobId) {
    if (typeof window === "undefined")
        return;
    if (jobId) {
        window.localStorage.setItem(KARDEx_IMPORT_JOB_STORAGE_KEY, jobId);
        return;
    }
    window.localStorage.removeItem(KARDEx_IMPORT_JOB_STORAGE_KEY);
}
function getPersistedImportJobId() {
    if (typeof window === "undefined")
        return null;
    return window.localStorage.getItem(KARDEx_IMPORT_JOB_STORAGE_KEY);
}
function stopImportPolling() {
    if (importPollHandle.value != null) {
        window.clearInterval(importPollHandle.value);
        importPollHandle.value = null;
    }
}
async function fetchImportJobStatus(jobId) {
    const { data } = await api.get(`/kpi_inventory/kardex/import/${jobId}`);
    importJob.value = (data?.data ?? data);
    if (!importJob.value) {
        persistImportJobId(null);
        stopImportPolling();
        return;
    }
    const status = String(importJob.value.status || "").toUpperCase();
    if (status === "COMPLETED") {
        stopImportPolling();
        persistImportJobId(null);
        lastBulkSummary.value = importJob.value.summary ?? null;
        importJob.value = null;
        notifyImportLifecycle({
            title: "Carga de inventario finalizada",
            message: "El archivo de inventario se procesó correctamente.",
            variant: "success",
            tag: "inventory-import-completed",
        });
        await Promise.allSettled([loadBaseData(), loadKardex()]);
        return;
    }
    if (status === "FAILED") {
        stopImportPolling();
        persistImportJobId(null);
        const failureMessage = importJob.value.error_message || "La carga de inventario falló.";
        importJob.value = null;
        notifyImportLifecycle({
            title: "Carga de inventario fallida",
            message: failureMessage,
            variant: "error",
            tag: "inventory-import-failed",
        });
    }
}
function startImportPolling(jobId) {
    stopImportPolling();
    importPollHandle.value = window.setInterval(() => {
        void fetchImportJobStatus(jobId).catch(() => undefined);
    }, 2500);
}
async function restoreImportJob() {
    const jobId = getPersistedImportJobId();
    if (!jobId)
        return;
    try {
        await fetchImportJobStatus(jobId);
        if (importJob.value) {
            startImportPolling(jobId);
        }
    }
    catch {
        persistImportJobId(null);
        importJob.value = null;
    }
}
async function processXlsx() {
    if (!canCreate.value) {
        ui.error("No tienes permisos para procesar cargas masivas.");
        return;
    }
    if (!xlsxFile.value) {
        ui.error("Debes seleccionar un archivo CSV o XLSX.");
        return;
    }
    uploading.value = true;
    try {
        const formData = new FormData();
        formData.append("file", xlsxFile.value);
        formData.append("requested_by", getUserName());
        const { data } = await api.post("/kpi_inventory/kardex/import/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        const job = (data?.data ?? data);
        importJob.value = job;
        lastBulkSummary.value = null;
        xlsxFile.value = null;
        if (job?.id) {
            persistImportJobId(job.id);
            notifyImportLifecycle({
                title: "Carga de inventario iniciada",
                message: "Archivo recibido. El sistema lo está procesando en segundo plano.",
                variant: "info",
                requestPermission: true,
                tag: "inventory-import-started",
            });
            startImportPolling(job.id);
            await fetchImportJobStatus(job.id);
        }
        else {
            ui.open("La carga fue recibida, pero no se pudo identificar el job.", "warning");
        }
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo procesar la carga masiva.");
    }
    finally {
        uploading.value = false;
    }
}
async function downloadTemplate() {
    downloadingTemplate.value = true;
    try {
        const response = await api.post("/kpi_inventory/kardex/import/template", null, {
            responseType: "blob",
        });
        const blob = new Blob([response.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "FORMATO_CARGA_INVENTARIO.xlsx";
        link.click();
        window.URL.revokeObjectURL(url);
    }
    catch (error) {
        ui.error(error?.response?.data?.message ||
            error?.message ||
            "No se pudo descargar el formato.");
    }
    finally {
        downloadingTemplate.value = false;
    }
}
watch(() => movementForm.bodegaId, () => {
    movementForm.productoId = "";
});
watch(() => movementForm.tipo, () => {
    if (!movementForm.productoId)
        return;
    const stillExists = productOptions.value.some((item) => item.value === movementForm.productoId);
    if (!stillExists) {
        movementForm.productoId = "";
    }
});
onMounted(async () => {
    if (!canRead.value)
        return;
    await Promise.allSettled([loadBaseData(), loadKardex()]);
    await restoreImportJob();
});
onBeforeUnmount(() => {
    stopImportPolling();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
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
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
if (!__VLS_ctx.canRead) {
    let __VLS_7;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
        cols: "12",
    }));
    const __VLS_9 = __VLS_8({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    const { default: __VLS_12 } = __VLS_10.slots;
    let __VLS_13;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        type: "warning",
        variant: "tonal",
    }));
    const __VLS_15 = __VLS_14({
        type: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    const { default: __VLS_18 } = __VLS_16.slots;
    // @ts-ignore
    [canRead,];
    var __VLS_16;
    // @ts-ignore
    [];
    var __VLS_10;
}
else {
    let __VLS_19;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
        cols: "12",
        lg: "4",
    }));
    const __VLS_21 = __VLS_20({
        cols: "12",
        lg: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    const { default: __VLS_24 } = __VLS_22.slots;
    let __VLS_25;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        rounded: "xl",
        ...{ class: "pa-4 h-100 enterprise-surface" },
    }));
    const __VLS_27 = __VLS_26({
        rounded: "xl",
        ...{ class: "pa-4 h-100 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_30 } = __VLS_28.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h6 font-weight-bold mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    let __VLS_31;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
        modelValue: (__VLS_ctx.movementForm.bodegaId),
        items: (__VLS_ctx.warehouseOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Bodega",
        variant: "outlined",
        ...{ class: "mb-2" },
    }));
    const __VLS_33 = __VLS_32({
        modelValue: (__VLS_ctx.movementForm.bodegaId),
        items: (__VLS_ctx.warehouseOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Bodega",
        variant: "outlined",
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_36;
    /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
    vAutocomplete;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        modelValue: (__VLS_ctx.movementForm.productoId),
        items: (__VLS_ctx.productOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        variant: "outlined",
        ...{ class: "mb-2" },
        disabled: (!__VLS_ctx.movementForm.bodegaId),
        clearable: true,
        noDataText: "Selecciona una bodega para listar materiales",
    }));
    const __VLS_38 = __VLS_37({
        modelValue: (__VLS_ctx.movementForm.productoId),
        items: (__VLS_ctx.productOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Material",
        variant: "outlined",
        ...{ class: "mb-2" },
        disabled: (!__VLS_ctx.movementForm.bodegaId),
        clearable: true,
        noDataText: "Selecciona una bodega para listar materiales",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_41;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
        modelValue: (__VLS_ctx.movementForm.tipo),
        items: (__VLS_ctx.movementTypes),
        itemTitle: "title",
        itemValue: "value",
        label: "Tipo de movimiento",
        variant: "outlined",
        ...{ class: "mb-2" },
    }));
    const __VLS_43 = __VLS_42({
        modelValue: (__VLS_ctx.movementForm.tipo),
        items: (__VLS_ctx.movementTypes),
        itemTitle: "title",
        itemValue: "value",
        label: "Tipo de movimiento",
        variant: "outlined",
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.selectedStockRow) {
        let __VLS_46;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
            type: (__VLS_ctx.movementForm.tipo === 'SALIDA' ? 'warning' : 'info'),
            variant: "tonal",
            ...{ class: "mb-3" },
        }));
        const __VLS_48 = __VLS_47({
            type: (__VLS_ctx.movementForm.tipo === 'SALIDA' ? 'warning' : 'info'),
            variant: "tonal",
            ...{ class: "mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_47));
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_51 } = __VLS_49.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.formatNumberForDisplay(__VLS_ctx.selectedStockRow.stock_actual));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        (__VLS_ctx.formatNumberForDisplay(__VLS_ctx.selectedStockRow.stock_min_bodega));
        (__VLS_ctx.formatNumberForDisplay(__VLS_ctx.selectedStockRow.stock_max_bodega));
        // @ts-ignore
        [movementForm, movementForm, movementForm, movementForm, movementForm, warehouseOptions, productOptions, movementTypes, selectedStockRow, selectedStockRow, selectedStockRow, selectedStockRow, formatNumberForDisplay, formatNumberForDisplay, formatNumberForDisplay,];
        var __VLS_49;
    }
    let __VLS_52;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
        modelValue: (__VLS_ctx.selectedUnitCostLabel),
        label: "Costo unitario del material",
        variant: "outlined",
        ...{ class: "mb-2" },
        readonly: true,
    }));
    const __VLS_54 = __VLS_53({
        modelValue: (__VLS_ctx.selectedUnitCostLabel),
        label: "Costo unitario del material",
        variant: "outlined",
        ...{ class: "mb-2" },
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_57;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({
        modelValue: (__VLS_ctx.movementForm.cantidad),
        type: "number",
        min: "0",
        label: "Cantidad",
        variant: "outlined",
        ...{ class: "mb-2" },
    }));
    const __VLS_59 = __VLS_58({
        modelValue: (__VLS_ctx.movementForm.cantidad),
        type: "number",
        min: "0",
        label: "Cantidad",
        variant: "outlined",
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_58));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    let __VLS_62;
    /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
    vTextarea;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
        modelValue: (__VLS_ctx.movementForm.observacion),
        label: "Observación",
        variant: "outlined",
        rows: "2",
        autoGrow: true,
        ...{ class: "mb-2" },
    }));
    const __VLS_64 = __VLS_63({
        modelValue: (__VLS_ctx.movementForm.observacion),
        label: "Observación",
        variant: "outlined",
        rows: "2",
        autoGrow: true,
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.canCreate) {
        let __VLS_67;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
            ...{ 'onClick': {} },
            color: "primary",
            block: true,
            loading: (__VLS_ctx.savingMovement),
        }));
        const __VLS_69 = __VLS_68({
            ...{ 'onClick': {} },
            color: "primary",
            block: true,
            loading: (__VLS_ctx.savingMovement),
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        let __VLS_72;
        const __VLS_73 = ({ click: {} },
            { onClick: (__VLS_ctx.saveMovement) });
        const { default: __VLS_74 } = __VLS_70.slots;
        // @ts-ignore
        [movementForm, movementForm, selectedUnitCostLabel, canCreate, savingMovement, saveMovement,];
        var __VLS_70;
        var __VLS_71;
    }
    // @ts-ignore
    [];
    var __VLS_28;
    // @ts-ignore
    [];
    var __VLS_22;
    let __VLS_75;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
        cols: "12",
        lg: "8",
    }));
    const __VLS_77 = __VLS_76({
        cols: "12",
        lg: "8",
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    const { default: __VLS_80 } = __VLS_78.slots;
    let __VLS_81;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_82 = __VLS_asFunctionalComponent1(__VLS_81, new __VLS_81({
        rounded: "xl",
        ...{ class: "pa-4 mb-4 enterprise-surface" },
    }));
    const __VLS_83 = __VLS_82({
        rounded: "xl",
        ...{ class: "pa-4 mb-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_86 } = __VLS_84.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h6 font-weight-bold mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_87;
    /** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
    vFileInput;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
        modelValue: (__VLS_ctx.xlsxFile),
        accept: ".csv,.xlsx,.xls,text/csv",
        prependIcon: "mdi-file-excel",
        label: "Selecciona archivo CSV o XLSX",
        variant: "outlined",
        showSize: true,
        ...{ class: "mb-3" },
    }));
    const __VLS_89 = __VLS_88({
        modelValue: (__VLS_ctx.xlsxFile),
        accept: ".csv,.xlsx,.xls,text/csv",
        prependIcon: "mdi-file-excel",
        label: "Selecciona archivo CSV o XLSX",
        variant: "outlined",
        showSize: true,
        ...{ class: "mb-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    if (__VLS_ctx.canCreate) {
        let __VLS_92;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent1(__VLS_92, new __VLS_92({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-upload",
            loading: (__VLS_ctx.uploading),
        }));
        const __VLS_94 = __VLS_93({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-upload",
            loading: (__VLS_ctx.uploading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        let __VLS_97;
        const __VLS_98 = ({ click: {} },
            { onClick: (__VLS_ctx.processXlsx) });
        const { default: __VLS_99 } = __VLS_95.slots;
        // @ts-ignore
        [canCreate, xlsxFile, uploading, processXlsx,];
        var __VLS_95;
        var __VLS_96;
    }
    let __VLS_100;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        variant: "outlined",
        prependIcon: "mdi-download",
        loading: (__VLS_ctx.downloadingTemplate),
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        variant: "outlined",
        prependIcon: "mdi-download",
        loading: (__VLS_ctx.downloadingTemplate),
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_105;
    const __VLS_106 = ({ click: {} },
        { onClick: (__VLS_ctx.downloadTemplate) });
    const { default: __VLS_107 } = __VLS_103.slots;
    // @ts-ignore
    [downloadingTemplate, downloadTemplate,];
    var __VLS_103;
    var __VLS_104;
    if (__VLS_ctx.lastBulkSummary) {
        let __VLS_108;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
            color: "success",
            variant: "tonal",
        }));
        const __VLS_110 = __VLS_109({
            color: "success",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        const { default: __VLS_113 } = __VLS_111.slots;
        (__VLS_ctx.lastBulkSummary.procesados);
        (__VLS_ctx.lastBulkSummary.creados);
        (__VLS_ctx.lastBulkSummary.actualizados);
        (__VLS_ctx.lastBulkSummary.ingresos);
        (__VLS_ctx.lastBulkSummary.salidas);
        // @ts-ignore
        [lastBulkSummary, lastBulkSummary, lastBulkSummary, lastBulkSummary, lastBulkSummary, lastBulkSummary,];
        var __VLS_111;
    }
    if (__VLS_ctx.activeImportJob) {
        let __VLS_114;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_115 = __VLS_asFunctionalComponent1(__VLS_114, new __VLS_114({
            type: "info",
            variant: "tonal",
            ...{ class: "mt-3" },
        }));
        const __VLS_116 = __VLS_115({
            type: "info",
            variant: "tonal",
            ...{ class: "mt-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_115));
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        const { default: __VLS_119 } = __VLS_117.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex align-center justify-space-between" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        (__VLS_ctx.activeImportJob.source_file_name || __VLS_ctx.activeImportJob.stored_file_name || "Inventario");
        let __VLS_120;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent1(__VLS_120, new __VLS_120({
            color: (__VLS_ctx.importJobColor(__VLS_ctx.activeImportJob.status)),
            variant: "tonal",
            label: true,
        }));
        const __VLS_122 = __VLS_121({
            color: (__VLS_ctx.importJobColor(__VLS_ctx.activeImportJob.status)),
            variant: "tonal",
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_121));
        const { default: __VLS_125 } = __VLS_123.slots;
        (__VLS_ctx.importJobStatusLabel(__VLS_ctx.activeImportJob.status));
        // @ts-ignore
        [activeImportJob, activeImportJob, activeImportJob, activeImportJob, activeImportJob, importJobColor, importJobStatusLabel,];
        var __VLS_123;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        (__VLS_ctx.activeImportJob.current_step || "Procesando archivo...");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex flex-wrap mt-3" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        let __VLS_126;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
            size: "small",
            variant: "tonal",
            color: "primary",
            label: true,
        }));
        const __VLS_128 = __VLS_127({
            size: "small",
            variant: "tonal",
            color: "primary",
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_127));
        const { default: __VLS_131 } = __VLS_129.slots;
        (__VLS_ctx.activeImportTotalRows);
        // @ts-ignore
        [activeImportJob, activeImportTotalRows,];
        var __VLS_129;
        let __VLS_132;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent1(__VLS_132, new __VLS_132({
            size: "small",
            variant: "tonal",
            color: "success",
            label: true,
        }));
        const __VLS_134 = __VLS_133({
            size: "small",
            variant: "tonal",
            color: "success",
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        const { default: __VLS_137 } = __VLS_135.slots;
        (__VLS_ctx.activeImportProcessedRows);
        // @ts-ignore
        [activeImportProcessedRows,];
        var __VLS_135;
        let __VLS_138;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_139 = __VLS_asFunctionalComponent1(__VLS_138, new __VLS_138({
            size: "small",
            variant: "tonal",
            color: "warning",
            label: true,
        }));
        const __VLS_140 = __VLS_139({
            size: "small",
            variant: "tonal",
            color: "warning",
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_139));
        const { default: __VLS_143 } = __VLS_141.slots;
        (__VLS_ctx.activeImportPendingRows);
        // @ts-ignore
        [activeImportPendingRows,];
        var __VLS_141;
        let __VLS_144;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_145 = __VLS_asFunctionalComponent1(__VLS_144, new __VLS_144({
            size: "small",
            variant: "tonal",
            color: "secondary",
            label: true,
        }));
        const __VLS_146 = __VLS_145({
            size: "small",
            variant: "tonal",
            color: "secondary",
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_145));
        const { default: __VLS_149 } = __VLS_147.slots;
        (__VLS_ctx.activeImportProgress);
        // @ts-ignore
        [activeImportProgress,];
        var __VLS_147;
        let __VLS_150;
        /** @ts-ignore @type {typeof __VLS_components.vProgressLinear | typeof __VLS_components.VProgressLinear} */
        vProgressLinear;
        // @ts-ignore
        const __VLS_151 = __VLS_asFunctionalComponent1(__VLS_150, new __VLS_150({
            ...{ class: "mt-3" },
            modelValue: (__VLS_ctx.activeImportProgress),
            color: (__VLS_ctx.importJobColor(__VLS_ctx.activeImportJob.status)),
            indeterminate: (__VLS_ctx.activeImportProgress <= 0 || __VLS_ctx.activeImportProgress >= 100 && __VLS_ctx.activeImportJob.status === 'PROCESSING'),
            rounded: true,
            height: "10",
        }));
        const __VLS_152 = __VLS_151({
            ...{ class: "mt-3" },
            modelValue: (__VLS_ctx.activeImportProgress),
            color: (__VLS_ctx.importJobColor(__VLS_ctx.activeImportJob.status)),
            indeterminate: (__VLS_ctx.activeImportProgress <= 0 || __VLS_ctx.activeImportProgress >= 100 && __VLS_ctx.activeImportJob.status === 'PROCESSING'),
            rounded: true,
            height: "10",
        }, ...__VLS_functionalComponentArgsRest(__VLS_151));
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        (__VLS_ctx.activeImportProcessedRows);
        (__VLS_ctx.activeImportTotalRows);
        (__VLS_ctx.activeImportPendingRows);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        if (__VLS_ctx.activeImportJob.error_message) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-error mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-error']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            (__VLS_ctx.activeImportJob.error_message);
        }
        // @ts-ignore
        [activeImportJob, activeImportJob, activeImportJob, activeImportJob, importJobColor, activeImportTotalRows, activeImportProcessedRows, activeImportPendingRows, activeImportProgress, activeImportProgress, activeImportProgress,];
        var __VLS_117;
    }
    if (__VLS_ctx.lastBulkSummary?.errores?.length) {
        let __VLS_155;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_156 = __VLS_asFunctionalComponent1(__VLS_155, new __VLS_155({
            type: "warning",
            variant: "tonal",
            ...{ class: "mt-3" },
        }));
        const __VLS_157 = __VLS_156({
            type: "warning",
            variant: "tonal",
            ...{ class: "mt-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_156));
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        const { default: __VLS_160 } = __VLS_158.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        for (const [error, index] of __VLS_vFor((__VLS_ctx.lastBulkSummary.errores.slice(0, 8)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (`${index}-${error}`),
                ...{ class: "text-caption" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            (error);
            // @ts-ignore
            [lastBulkSummary, lastBulkSummary,];
        }
        if (__VLS_ctx.lastBulkSummary.errores.length > 8) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            (__VLS_ctx.lastBulkSummary.errores.length - 8);
        }
        // @ts-ignore
        [lastBulkSummary, lastBulkSummary,];
        var __VLS_158;
    }
    // @ts-ignore
    [];
    var __VLS_84;
    let __VLS_161;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_162 = __VLS_asFunctionalComponent1(__VLS_161, new __VLS_161({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_163 = __VLS_162({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_162));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_166 } = __VLS_164.slots;
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
        ...{ class: "d-flex align-center flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    let __VLS_167;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_168 = __VLS_asFunctionalComponent1(__VLS_167, new __VLS_167({
        modelValue: (__VLS_ctx.inventoryGroupBy),
        items: (__VLS_ctx.inventoryGroupingOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Agrupar inventario por",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        ...{ style: {} },
    }));
    const __VLS_169 = __VLS_168({
        modelValue: (__VLS_ctx.inventoryGroupBy),
        items: (__VLS_ctx.inventoryGroupingOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Agrupar inventario por",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_168));
    if (__VLS_ctx.canAccessInventoryReports) {
        let __VLS_172;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent1(__VLS_172, new __VLS_172({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('excel')),
        }));
        const __VLS_174 = __VLS_173({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('excel')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        let __VLS_177;
        const __VLS_178 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessInventoryReports))
                        return;
                    __VLS_ctx.exportInventoryReport('excel');
                    // @ts-ignore
                    [inventoryGroupBy, inventoryGroupingOptions, canAccessInventoryReports, isExporting, exportInventoryReport,];
                } });
        const { default: __VLS_179 } = __VLS_175.slots;
        // @ts-ignore
        [];
        var __VLS_175;
        var __VLS_176;
    }
    if (__VLS_ctx.canAccessInventoryReports) {
        let __VLS_180;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent1(__VLS_180, new __VLS_180({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('pdf')),
        }));
        const __VLS_182 = __VLS_181({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('pdf')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        let __VLS_185;
        const __VLS_186 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessInventoryReports))
                        return;
                    __VLS_ctx.exportInventoryReport('pdf');
                    // @ts-ignore
                    [canAccessInventoryReports, isExporting, exportInventoryReport,];
                } });
        const { default: __VLS_187 } = __VLS_183.slots;
        // @ts-ignore
        [];
        var __VLS_183;
        var __VLS_184;
    }
    let __VLS_188;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent1(__VLS_188, new __VLS_188({
        ...{ 'onClick': {} },
        variant: "text",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loadingKardex),
    }));
    const __VLS_190 = __VLS_189({
        ...{ 'onClick': {} },
        variant: "text",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loadingKardex),
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    let __VLS_193;
    const __VLS_194 = ({ click: {} },
        { onClick: (__VLS_ctx.loadKardex) });
    const { default: __VLS_195 } = __VLS_191.slots;
    // @ts-ignore
    [loadingKardex, loadKardex,];
    var __VLS_191;
    var __VLS_192;
    let __VLS_196;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent1(__VLS_196, new __VLS_196({
        headers: (__VLS_ctx.kardexHeaders),
        items: (__VLS_ctx.kardexRows),
        loading: (__VLS_ctx.loadingKardex),
        loadingText: "Obteniendo movimientos de kardex...",
        itemsPerPage: (20),
        ...{ class: "elevation-0 enterprise-table" },
    }));
    const __VLS_198 = __VLS_197({
        headers: (__VLS_ctx.kardexHeaders),
        items: (__VLS_ctx.kardexRows),
        loading: (__VLS_ctx.loadingKardex),
        loadingText: "Obteniendo movimientos de kardex...",
        itemsPerPage: (20),
        ...{ class: "elevation-0 enterprise-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    const { default: __VLS_201 } = __VLS_199.slots;
    {
        const { 'item.tipo': __VLS_202 } = __VLS_199.slots;
        const [{ item }] = __VLS_vSlot(__VLS_202);
        let __VLS_203;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_204 = __VLS_asFunctionalComponent1(__VLS_203, new __VLS_203({
            size: "small",
            variant: "tonal",
            color: (item.tipo_movimiento === 'INGRESO' ? 'success' : 'error'),
        }));
        const __VLS_205 = __VLS_204({
            size: "small",
            variant: "tonal",
            color: (item.tipo_movimiento === 'INGRESO' ? 'success' : 'error'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_204));
        const { default: __VLS_208 } = __VLS_206.slots;
        (item.tipo_movimiento === "INGRESO" ? "Ingreso" : "Salida");
        // @ts-ignore
        [loadingKardex, kardexHeaders, kardexRows,];
        var __VLS_206;
        // @ts-ignore
        [];
    }
    {
        const { 'item.movimiento': __VLS_209 } = __VLS_199.slots;
        const [{ item }] = __VLS_vSlot(__VLS_209);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "font-weight-bold" },
            ...{ class: (item.tipo_movimiento === 'INGRESO' ? 'text-success' : 'text-error') },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
        (item.tipo_movimiento === "INGRESO" ? "+" : "-");
        (item.tipo_movimiento === "INGRESO"
            ? item.entrada_cantidad
            : item.salida_cantidad);
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_199;
    // @ts-ignore
    [];
    var __VLS_164;
    // @ts-ignore
    [];
    var __VLS_78;
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

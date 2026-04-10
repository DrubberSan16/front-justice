/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { hasReportAccess } from "@/app/config/report-access";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import { buildLubricantReport, downloadReportExcel, downloadReportPdf, } from "@/app/utils/maintenance-intelligence-reports";
import { groupLubricantDetails, humidityOptions, lubricantCompartments, lubricantConditionOptions, getLubricantParameterTemplate, mergeLubricantDetails, } from "@/app/config/lubricant-analysis";
const ACTIVE_IMPORT_STORAGE_KEY = "kpi-justice:lubricant-import:active-job";
const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const loading = ref(false);
const saving = ref(false);
const codeLoading = ref(false);
const dashboardLoading = ref(false);
const importing = ref(false);
const downloadingTemplate = ref(false);
const purging = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const groupDetailDialog = ref(false);
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Analisis de lubricante", "Análisis de lubricante"]));
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canPersistForm = computed(() => (editingId.value ? canEdit.value : canCreate.value));
const canAccessLubricantReports = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "analisis_lubricante"));
const purgeDialog = ref(false);
const editingId = ref(null);
const deletingId = ref(null);
const selectedGroupKey = ref(null);
const error = ref(null);
const dashboardError = ref(null);
const analyses = ref([]);
const dashboard = ref(null);
const equipments = ref([]);
const brands = ref([]);
const catalog = ref([]);
const lubricantSearch = ref("");
const lubricantSelection = ref(null);
const dashboardSelection = ref(null);
const importFile = ref(null);
const lastImportSummary = ref(null);
const importJob = ref(null);
const importPollHandle = ref(null);
const importDismissHandle = ref(null);
const purgeConfirmation = ref("");
const tableSearch = ref("");
const statusFilter = ref(null);
const dashboardPeriod = ref("MENSUAL");
const dashboardFrom = ref("");
const dashboardTo = ref("");
const dashboardCompartimento = ref(null);
const reportFrom = ref("");
const reportTo = ref("");
const exportState = reactive({});
const isFormDialogFullscreen = computed(() => mdAndDown.value);
const isGroupDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const groupHeaders = [
    { title: "Ultimo codigo", key: "ultimo_codigo" },
    { title: "Lubricante", key: "lubricante_group" },
    { title: "Equipo", key: "equipo_group" },
    { title: "Modelo", key: "equipo_modelo" },
    { title: "Compartimentos", key: "compartimentos", sortable: false },
    { title: "Ultimo informe", key: "ultimo_informe" },
    { title: "Estado", key: "estado_resumen", sortable: false },
    { title: "Acciones", key: "actions", sortable: false },
];
const conditionOptions = lubricantConditionOptions;
const compartmentOptions = lubricantCompartments;
const humidityValueOptions = humidityOptions.map((item) => item.value);
const periodOptions = [
    { value: "SEMANAL", title: "Semanal" },
    { value: "MENSUAL", title: "Mensual" },
    { value: "ANUAL", title: "Anual" },
    { value: "PERSONALIZADO", title: "Personalizado" },
];
const form = reactive({
    codigo: "",
    cliente: "JUSTICE COMPANY",
    equipo_id: null,
    lubricante: "",
    marca_lubricante: "",
    compartimento_principal: "MOTOR",
    fecha_muestra: "",
    fecha_ingreso: "",
    fecha_reporte: "",
    numero_muestra: "",
    horas_equipo: null,
    horas_lubricante: null,
    condicion: "NORMAL",
    equipo_marca: "",
    equipo_serie: "",
    equipo_modelo: "",
    detalles: [],
});
function unwrap(payload, fallback) {
    return (payload?.data ?? payload ?? fallback);
}
const brandMap = computed(() => {
    const next = new Map();
    for (const item of brands.value) {
        if (item?.id)
            next.set(String(item.id), item);
    }
    return next;
});
const equipmentMap = computed(() => {
    const next = new Map();
    for (const item of equipments.value) {
        if (item?.id)
            next.set(String(item.id), item);
    }
    return next;
});
function resolveEquipmentBrand(item) {
    if (!item)
        return "";
    return (String(item.marca_nombre ?? item.brand_name ?? "").trim() ||
        String(brandMap.value.get(String(item.marca_id))?.nombre ?? "").trim() ||
        "");
}
const equipmentOptions = computed(() => equipments.value.map((item) => ({
    value: item.id,
    title: `${item.codigo || "EQ"} - ${item.nombre || "Equipo"}`,
    marca: resolveEquipmentBrand(item),
})));
const catalogOptions = computed(() => catalog.value.map((item) => ({
    ...item,
    label: [
        item.ultimo_codigo || item.lubricante_codigo,
        item.lubricante,
        item.marca_lubricante,
        item.equipo_label || item.equipo_codigo || item.equipo_nombre,
        item.equipo_modelo,
    ]
        .filter(Boolean)
        .join(" · "),
})));
function resolveEquipmentLabel(item) {
    if (!item)
        return "";
    const equipoCodigo = String(item.equipo_codigo || item.sample_info?.equipo_codigo || "").trim();
    const equipoNombre = String(item.equipo_nombre || item.sample_info?.equipo_nombre || "").trim();
    if (equipoCodigo && equipoNombre && equipoCodigo !== equipoNombre) {
        return `${equipoCodigo} - ${equipoNombre}`;
    }
    return equipoCodigo || equipoNombre || "";
}
function resolveEquipmentModel(item) {
    return String(item?.sample_info?.equipo_modelo || item?.equipo_modelo || "").trim();
}
function buildLubricantGroupKey(lubricante, marcaLubricante, equipoId, equipoCodigo, equipoNombre, equipoModelo) {
    return [lubricante, marcaLubricante, equipoId, equipoCodigo, equipoNombre, equipoModelo]
        .map((value) => String(value ?? "").trim().toLowerCase())
        .join("::");
}
function resolveAnalysisReportDate(item) {
    return (String(item?.sample_info?.fecha_informe ||
        item?.fecha_reporte ||
        item?.sample_info?.fecha_ingreso ||
        item?.fecha_muestra ||
        "").trim() || null);
}
function resolveAnalysisCondition(item) {
    return (String(item?.sample_info?.condicion || item?.estado_diagnostico || "N/D").trim() ||
        "N/D");
}
function compareAnalysisByLatestDate(left, right) {
    const leftDate = resolveAnalysisReportDate(left) || "";
    const rightDate = resolveAnalysisReportDate(right) || "";
    if (leftDate !== rightDate)
        return rightDate.localeCompare(leftDate);
    return String(right?.codigo || "").localeCompare(String(left?.codigo || ""));
}
function parseReportDate(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return null;
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function isWithinReportRange(item) {
    const reportDate = parseReportDate(resolveAnalysisReportDate(item) || item?.fecha_muestra || item?.created_at);
    if (!reportDate)
        return false;
    const from = reportFrom.value ? parseReportDate(reportFrom.value) : null;
    const to = reportTo.value ? parseReportDate(reportTo.value) : null;
    if (from && reportDate < from)
        return false;
    if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (reportDate > end)
            return false;
    }
    return true;
}
function analysisMatchesSearch(item, search) {
    if (!search)
        return true;
    return [
        item.codigo,
        item.lubricante,
        item.marca_lubricante,
        item.equipo_codigo,
        item.equipo_nombre,
        item.sample_info?.equipo_modelo,
        item.compartimento_principal,
        item.sample_info?.numero_muestra,
        item.sample_info?.fecha_informe,
    ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
}
const groupedAnalyses = computed(() => {
    const groups = new Map();
    for (const item of analyses.value) {
        const equipmentLabel = resolveEquipmentLabel(item);
        const equipmentModel = resolveEquipmentModel(item) || null;
        const groupKey = buildLubricantGroupKey(item.lubricante, item.marca_lubricante, item.equipo_id, item.equipo_codigo, item.equipo_nombre, equipmentModel);
        const group = groups.get(groupKey) ??
            {
                group_key: groupKey,
                lubricante: item.lubricante || "Sin lubricante",
                marca_lubricante: item.marca_lubricante || "Sin marca del lubricante",
                equipo_id: item.equipo_id || null,
                equipo_codigo: item.equipo_codigo || null,
                equipo_nombre: item.equipo_nombre || null,
                equipo_label: equipmentLabel || null,
                equipo_modelo: equipmentModel,
                items: [],
                compartimentos: [],
                compartimentos_set: new Set(),
                total_analisis: 0,
                anormales: 0,
                ultimo_codigo: "",
                ultimo_informe: "",
                ultimo_numero_muestra: "",
                ultimo_estado: "N/D",
                latest_item: null,
            };
        group.items.push(item);
        group.total_analisis += 1;
        const compartimento = String(item.compartimento_principal || "").trim();
        if (compartimento && !group.compartimentos_set.has(compartimento)) {
            group.compartimentos_set.add(compartimento);
            group.compartimentos.push(compartimento);
        }
        if (resolveAnalysisCondition(item) === "ANORMAL") {
            group.anormales += 1;
        }
        if (!group.latest_item || compareAnalysisByLatestDate(item, group.latest_item) < 0) {
            group.latest_item = item;
            group.ultimo_codigo = String(item.codigo || "").trim();
            group.ultimo_informe = resolveAnalysisReportDate(item) || "";
            group.ultimo_numero_muestra = String(item.sample_info?.numero_muestra || "").trim();
            group.ultimo_estado = resolveAnalysisCondition(item);
        }
        groups.set(groupKey, group);
    }
    return [...groups.values()]
        .map((group) => ({
        ...group,
        items: [...group.items].sort(compareAnalysisByLatestDate),
        compartimentos: [...group.compartimentos].sort((a, b) => a.localeCompare(b)),
    }))
        .sort((a, b) => {
        const dateCompare = String(b.ultimo_informe || "").localeCompare(String(a.ultimo_informe || ""));
        if (dateCompare !== 0)
            return dateCompare;
        const lubricanteCompare = String(a.lubricante || "").localeCompare(String(b.lubricante || ""));
        if (lubricanteCompare !== 0)
            return lubricanteCompare;
        const equipoCompare = String(a.equipo_label || "").localeCompare(String(b.equipo_label || ""));
        if (equipoCompare !== 0)
            return equipoCompare;
        return String(a.equipo_modelo || "").localeCompare(String(b.equipo_modelo || ""));
    });
});
const filteredLubricantGroups = computed(() => {
    const search = String(tableSearch.value || "").trim().toLowerCase();
    return groupedAnalyses.value.filter((group) => group.items.some((item) => {
        const condition = resolveAnalysisCondition(item);
        if (statusFilter.value && condition !== statusFilter.value)
            return false;
        return analysisMatchesSearch(item, search);
    }));
});
const reportAnalyses = computed(() => analyses.value
    .filter((item) => isWithinReportRange(item))
    .filter((item) => !statusFilter.value || resolveAnalysisCondition(item) === statusFilter.value));
function exportKey(format) {
    return `lubricant:${format}`;
}
function isExporting(format) {
    return Boolean(exportState[exportKey(format)]);
}
async function exportAnalyses(format) {
    if (!canAccessLubricantReports.value) {
        ui.error("No tienes permisos para generar reportes de análisis de lubricante.");
        return;
    }
    const key = exportKey(format);
    exportState[key] = true;
    error.value = null;
    try {
        const report = buildLubricantReport(reportAnalyses.value);
        report.subtitle = `Resultados filtrados${reportFrom.value || reportTo.value
            ? ` del ${reportFrom.value || "..."} al ${reportTo.value || "..."}`
            : " sin restricción de fechas"}.`;
        if (format === "excel") {
            await downloadReportExcel(report);
        }
        else {
            await downloadReportPdf(report);
        }
    }
    catch (e) {
        error.value = e?.message || "No se pudo generar el reporte de análisis de lubricante.";
    }
    finally {
        exportState[key] = false;
    }
}
const selectedGroup = computed(() => groupedAnalyses.value.find((group) => group.group_key === selectedGroupKey.value) ??
    null);
const selectedGroupItems = computed(() => selectedGroup.value?.items ?? []);
const alertCount = computed(() => analyses.value.filter((item) => (item.sample_info?.condicion || item.estado_diagnostico) === "ANORMAL").length);
const groupedFormDetails = computed(() => groupLubricantDetails(form.detalles));
const importProgress = computed(() => Number(importJob.value?.progress ?? 0));
const importLogs = computed(() => (Array.isArray(importJob.value?.logs) ? importJob.value.logs : []));
const currentRoleName = computed(() => String(auth.user?.role?.nombre || "").trim().toUpperCase());
const canPurgeAnalyses = computed(() => currentRoleName.value.includes("ADMIN"));
const canConfirmPurge = computed(() => purgeConfirmation.value.trim().toUpperCase() === "ELIMINAR TODO");
function conditionColor(value) {
    const raw = String(value ?? "").trim().toUpperCase();
    if (raw === "ANORMAL")
        return "error";
    if (raw === "PRECAUCION")
        return "warning";
    if (raw === "N/D" || raw === "ND")
        return "secondary";
    return "success";
}
function resetForm() {
    editingId.value = null;
    lubricantSelection.value = null;
    Object.assign(form, {
        codigo: "",
        cliente: "JUSTICE COMPANY",
        equipo_id: null,
        lubricante: "",
        marca_lubricante: "",
        compartimento_principal: "MOTOR",
        fecha_muestra: "",
        fecha_ingreso: "",
        fecha_reporte: "",
        numero_muestra: "",
        horas_equipo: null,
        horas_lubricante: null,
        condicion: "NORMAL",
        equipo_marca: "",
        equipo_serie: "",
        equipo_modelo: "",
        detalles: mergeLubricantDetails("MOTOR"),
    });
}
function openPurgeDialog() {
    purgeConfirmation.value = "";
    purgeDialog.value = true;
}
function closePurgeDialog() {
    purgeDialog.value = false;
    purgeConfirmation.value = "";
}
function applySelectedEquipmentSnapshot() {
    const equipment = form.equipo_id ? equipmentMap.value.get(form.equipo_id) : null;
    if (!equipment) {
        form.equipo_marca = "";
        return;
    }
    form.equipo_marca = resolveEquipmentBrand(equipment);
}
async function loadAnalyses() {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante");
    analyses.value = unwrap(data, []);
}
async function loadCatalog(search = "") {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/catalog", {
        params: search ? { search } : undefined,
    });
    catalog.value = unwrap(data, []);
}
async function loadEquipments() {
    equipments.value = await listAllPages("/kpi_maintenance/equipos");
}
async function loadBrands() {
    brands.value = await listAllPages("/kpi_inventory/marcas");
}
async function loadAll() {
    loading.value = true;
    error.value = null;
    try {
        await Promise.all([loadAnalyses(), loadCatalog(), loadEquipments(), loadBrands()]);
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudo cargar el modulo de lubricantes.";
    }
    finally {
        loading.value = false;
    }
}
function currentUserName() {
    return auth.user?.nameUser || "admin";
}
function currentUserEmail() {
    return auth.user?.email || "";
}
function currentUserId() {
    return auth.user?.id || "";
}
function getSelectedImportFile() {
    if (Array.isArray(importFile.value)) {
        return importFile.value[0] || null;
    }
    return importFile.value;
}
function isTerminalImportStatus(status) {
    const raw = String(status ?? "").toUpperCase();
    return raw === "COMPLETED" || raw === "FAILED";
}
function persistActiveImportJob(job) {
    if (typeof window === "undefined")
        return;
    const jobId = String(job?.id ?? "").trim();
    const status = String(job?.status ?? "").toUpperCase();
    if (!jobId || isTerminalImportStatus(status)) {
        window.localStorage.removeItem(ACTIVE_IMPORT_STORAGE_KEY);
        return;
    }
    window.localStorage.setItem(ACTIVE_IMPORT_STORAGE_KEY, JSON.stringify({
        id: jobId,
        status,
        source_file_name: job?.source_file_name || job?.stored_file_name || null,
    }));
}
function getPersistedImportJobId() {
    if (typeof window === "undefined")
        return null;
    const raw = window.localStorage.getItem(ACTIVE_IMPORT_STORAGE_KEY);
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        return String(parsed?.id ?? "").trim() || null;
    }
    catch {
        window.localStorage.removeItem(ACTIVE_IMPORT_STORAGE_KEY);
        return null;
    }
}
function clearImportDismissTimer() {
    if (importDismissHandle.value != null) {
        window.clearTimeout(importDismissHandle.value);
        importDismissHandle.value = null;
    }
}
function dismissImportCardNow() {
    clearImportDismissTimer();
    importJob.value = null;
}
function scheduleImportCardDismiss(delayMs = 1800) {
    clearImportDismissTimer();
    importDismissHandle.value = window.setTimeout(() => {
        importJob.value = null;
        importDismissHandle.value = null;
    }, delayMs);
}
async function requestBrowserNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window))
        return;
    if (window.Notification.permission === "default") {
        try {
            await window.Notification.requestPermission();
        }
        catch {
            // ignore permission errors
        }
    }
}
function emitBrowserNotification(title, body, tag) {
    if (typeof window === "undefined" || !("Notification" in window))
        return;
    if (window.Notification.permission !== "granted")
        return;
    try {
        new window.Notification(title, {
            body,
            tag,
        });
    }
    catch {
        // ignore browser notification errors
    }
}
async function notifyImportLifecycle(options) {
    if (options.requestPermission) {
        await requestBrowserNotificationPermission();
    }
    ui.open(options.message, options.variant ?? "info", 5000);
    emitBrowserNotification(options.title, options.message, options.tag);
}
function stopImportPolling() {
    if (importPollHandle.value != null) {
        window.clearInterval(importPollHandle.value);
        importPollHandle.value = null;
    }
}
function startImportPolling(jobId) {
    stopImportPolling();
    importPollHandle.value = window.setInterval(() => {
        void fetchImportJobStatus(jobId);
    }, 2000);
}
function importStatusColor(status) {
    const raw = String(status ?? "").toUpperCase();
    if (raw === "FAILED")
        return "error";
    if (raw === "COMPLETED")
        return "success";
    if (raw === "PROCESSING" || raw === "PARSING")
        return "warning";
    return "secondary";
}
async function fetchImportJobStatus(jobId) {
    const { data } = await api.get(`/kpi_maintenance/inteligencia/analisis-lubricante/import/${jobId}`);
    importJob.value = unwrap(data, null);
    if (!importJob.value) {
        stopImportPolling();
        persistActiveImportJob(null);
        dismissImportCardNow();
        return;
    }
    clearImportDismissTimer();
    persistActiveImportJob(importJob.value);
    const status = String(importJob.value?.status ?? "").toUpperCase();
    if (!isTerminalImportStatus(status)) {
        return;
    }
    stopImportPolling();
    persistActiveImportJob(null);
    lastImportSummary.value = importJob.value?.summary ?? null;
    await loadAll();
    if (status === "COMPLETED") {
        const errors = Number(importJob.value?.errors?.length ?? 0);
        if (errors > 0) {
            await notifyImportLifecycle({
                title: "Carga de analisis de lubricante finalizada",
                message: `Importacion finalizada con ${errors} error(es). Revisa el log transaccional.`,
                variant: "warning",
                tag: "lubricant-import-completed",
            });
        }
        else {
            await notifyImportLifecycle({
                title: "Carga de analisis de lubricante finalizada",
                message: "Excel de lubricante importado correctamente.",
                variant: "success",
                tag: "lubricant-import-completed",
            });
        }
    }
    else {
        await notifyImportLifecycle({
            title: "Carga de analisis de lubricante fallida",
            message: importJob.value?.error_message || "La importacion del Excel fallo.",
            variant: "error",
            tag: "lubricant-import-failed",
        });
    }
    scheduleImportCardDismiss();
}
async function processWorkbookImport() {
    const file = getSelectedImportFile();
    if (!file) {
        ui.error("Debes seleccionar un archivo Excel para importar.");
        return;
    }
    importing.value = true;
    try {
        stopImportPolling();
        clearImportDismissTimer();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upsert_existing", "true");
        formData.append("requested_by", currentUserName());
        if (currentUserEmail())
            formData.append("requested_by_email", currentUserEmail());
        if (currentUserId())
            formData.append("requested_user_id", currentUserId());
        /*
          ui.open(parsed.warnings[0] || "El archivo contiene advertencias de importacion.", "warning");
        }
    
        if (!parsed.analyses.length) {
          ui.error("El archivo no contiene muestras válidas para importar.");
          return;
        }
        */
        const { data } = await api.post("/kpi_maintenance/inteligencia/analisis-lubricante/import/upload", formData);
        importJob.value = unwrap(data, null);
        lastImportSummary.value = null;
        persistActiveImportJob(importJob.value);
        await notifyImportLifecycle({
            title: "Carga de analisis de lubricante iniciada",
            message: "Archivo subido. La importacion se esta ejecutando en segundo plano.",
            variant: "info",
            requestPermission: true,
            tag: "lubricant-import-started",
        });
        if (importJob.value?.id) {
            startImportPolling(String(importJob.value.id));
            await fetchImportJobStatus(String(importJob.value.id));
        }
    }
    catch (e) {
        ui.error(e?.response?.data?.message || e?.message || "No se pudo importar el Excel de lubricante.");
    }
    finally {
        importing.value = false;
    }
}
async function restoreActiveImportJob() {
    const jobId = getPersistedImportJobId();
    if (!jobId)
        return;
    try {
        await fetchImportJobStatus(jobId);
        if (importJob.value && !isTerminalImportStatus(importJob.value.status)) {
            startImportPolling(jobId);
        }
    }
    catch {
        persistActiveImportJob(null);
        dismissImportCardNow();
    }
}
async function downloadImportTemplate() {
    downloadingTemplate.value = true;
    try {
        const response = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/import/template", {
            responseType: "blob",
        });
        const blob = response.data;
        const disposition = String(response.headers?.["content-disposition"] || "");
        const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
        const fileName = match?.[1] || "FORMATO_CARGA_ANALISIS_LUBRICANTE.xlsx";
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
    catch (e) {
        ui.error(e?.response?.data?.message ||
            "No se pudo descargar el formato de carga del análisis de lubricante.");
    }
    finally {
        downloadingTemplate.value = false;
    }
}
async function assignCode() {
    codeLoading.value = true;
    try {
        const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/next-code");
        const resolved = unwrap(data, {});
        form.codigo = resolved?.code || "";
    }
    finally {
        codeLoading.value = false;
    }
}
function applyDetailTemplate() {
    form.detalles = mergeLubricantDetails(form.compartimento_principal || "GENERAL");
}
function handleCompartmentChange() {
    form.detalles = mergeLubricantDetails(form.compartimento_principal || "GENERAL", form.detalles);
}
async function openCreate() {
    if (!canCreate.value)
        return;
    resetForm();
    dialog.value = true;
    await assignCode();
}
function fillFormFromAnalysis(item) {
    const sample = item.sample_info ?? {};
    Object.assign(form, {
        codigo: item.codigo || "",
        cliente: item.cliente || "JUSTICE COMPANY",
        equipo_id: item.equipo_id || null,
        lubricante: item.lubricante || "",
        marca_lubricante: item.marca_lubricante || "",
        compartimento_principal: item.compartimento_principal || "MOTOR",
        fecha_muestra: item.fecha_muestra || "",
        fecha_ingreso: sample.fecha_ingreso || "",
        fecha_reporte: sample.fecha_informe || item.fecha_reporte || "",
        numero_muestra: sample.numero_muestra || "",
        horas_equipo: sample.horas_equipo ?? null,
        horas_lubricante: sample.horas_lubricante ?? null,
        condicion: sample.condicion || item.estado_diagnostico || "NORMAL",
        equipo_marca: sample.equipo_marca || "",
        equipo_serie: sample.equipo_serie || "",
        equipo_modelo: sample.equipo_modelo || "",
        detalles: mergeLubricantDetails(item.compartimento_principal || "MOTOR", item.detalles ?? []),
    });
}
function openEdit(item) {
    if (!canEdit.value)
        return;
    editingId.value = item.id;
    fillFormFromAnalysis(item);
    lubricantSelection.value = item.lubricante
        ? {
            lubricante: item.lubricante,
            marca_lubricante: item.marca_lubricante,
            ultimo_codigo: item.codigo,
            label: [item.codigo, item.lubricante, item.marca_lubricante, resolveEquipmentLabel(item), item.sample_info?.equipo_modelo].filter(Boolean).join(" · "),
        }
        : null;
    dialog.value = true;
}
function openDelete(item) {
    if (!canDelete.value)
        return;
    deletingId.value = item.id;
    deleteDialog.value = true;
}
function handleLubricantSelection(value) {
    if (!value) {
        form.lubricante = "";
        form.marca_lubricante = "";
        lubricantSelection.value = null;
        return;
    }
    if (typeof value === "string") {
        form.lubricante = value;
        lubricantSelection.value = value;
        return;
    }
    form.lubricante = value.lubricante || "";
    form.marca_lubricante = value.marca_lubricante || form.marca_lubricante;
    lubricantSelection.value = value;
}
async function handleLubricantSearch(value) {
    lubricantSearch.value = value;
    if (String(value || "").trim().length >= 2) {
        await loadCatalog(value);
    }
}
function buildDetailPayload(detail) {
    const template = getLubricantParameterTemplate(detail.parametro_key || detail.parametro);
    const inputType = template?.inputType || "number";
    const base = {
        compartimento: form.compartimento_principal || "GENERAL",
        parametro: template?.label || detail.parametro,
        orden: template?.order ?? detail.orden ?? null,
    };
    if (inputType === "select" || inputType === "text") {
        return {
            ...base,
            resultado_texto: String(detail.resultado_texto ?? "").trim() || null,
            resultado_numerico: null,
        };
    }
    return {
        ...base,
        resultado_numerico: detail.resultado_numerico == null || detail.resultado_numerico === ""
            ? null
            : Number(detail.resultado_numerico),
        resultado_texto: null,
    };
}
async function save() {
    if (!canPersistForm.value)
        return;
    saving.value = true;
    try {
        const payload = {
            codigo: form.codigo,
            cliente: form.cliente,
            equipo_id: form.equipo_id,
            lubricante: form.lubricante,
            marca_lubricante: form.marca_lubricante,
            compartimento_principal: form.compartimento_principal,
            fecha_muestra: form.fecha_muestra || null,
            fecha_reporte: form.fecha_reporte || null,
            payload_json: {
                sample_info: {
                    numero_muestra: form.numero_muestra || null,
                    fecha_ingreso: form.fecha_ingreso || null,
                    fecha_informe: form.fecha_reporte || null,
                    horas_equipo: form.horas_equipo,
                    horas_lubricante: form.horas_lubricante,
                    condicion: form.condicion,
                    equipo_marca: form.equipo_marca || null,
                    equipo_serie: form.equipo_serie || null,
                    equipo_modelo: form.equipo_modelo || null,
                },
                actor_user_id: currentUserId() || null,
                actor_username: currentUserName(),
                actor_name: auth.user?.nameSurname || auth.user?.nameUser || null,
                actor_email: currentUserEmail() || null,
                actor_role: auth.user?.role?.nombre || null,
                created_by: editingId.value ? undefined : currentUserName(),
                created_by_email: editingId.value ? undefined : currentUserEmail() || null,
                updated_by: currentUserName(),
                updated_by_email: currentUserEmail() || null,
            },
            detalles: form.detalles.map(buildDetailPayload),
        };
        if (editingId.value) {
            await api.patch(`/kpi_maintenance/inteligencia/analisis-lubricante/${editingId.value}`, payload);
            ui.success("Analisis de lubricante actualizado.");
        }
        else {
            const { data } = await api.post("/kpi_maintenance/inteligencia/analisis-lubricante", payload);
            const created = unwrap(data, {});
            if (created?.code_was_reassigned) {
                ui.open(`El codigo fue reasignado automaticamente a ${created.codigo}.`, "warning");
            }
            else {
                ui.success("Analisis de lubricante creado.");
            }
        }
        dialog.value = false;
        await loadAll();
        if (form.lubricante) {
            await loadDashboard({ lubricante: form.lubricante });
        }
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo guardar el analisis.");
    }
    finally {
        saving.value = false;
    }
}
async function confirmDelete() {
    if (!deletingId.value)
        return;
    saving.value = true;
    try {
        await api.delete(`/kpi_maintenance/inteligencia/analisis-lubricante/${deletingId.value}`);
        ui.success("Analisis de lubricante eliminado.");
        deleteDialog.value = false;
        deletingId.value = null;
        await loadAll();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo eliminar el analisis.");
    }
    finally {
        saving.value = false;
    }
}
async function confirmPurge() {
    if (!canPurgeAnalyses.value) {
        ui.error("Solo los administradores pueden eliminar toda la informacion de lubricantes.");
        return;
    }
    if (!canConfirmPurge.value) {
        ui.error("Debes escribir exactamente ELIMINAR TODO para continuar.");
        return;
    }
    purging.value = true;
    try {
        stopImportPolling();
        const { data } = await api.post("/kpi_maintenance/inteligencia/analisis-lubricante/purge", {
            confirmation: purgeConfirmation.value.trim(),
            requested_by: currentUserName(),
            requested_role: auth.user?.role?.nombre || null,
            purge_import_jobs: true,
        });
        const summary = unwrap(data, {});
        analyses.value = [];
        catalog.value = [];
        dashboard.value = null;
        selectedGroupKey.value = null;
        groupDetailDialog.value = false;
        persistActiveImportJob(null);
        dismissImportCardNow();
        importJob.value = null;
        lastImportSummary.value = null;
        importFile.value = null;
        dashboardSelection.value = null;
        lubricantSelection.value = null;
        tableSearch.value = "";
        statusFilter.value = null;
        closePurgeDialog();
        await loadAll();
        ui.success(`Información eliminada. Analisis: ${Number(summary.deleted_analyses ?? 0)}, detalles: ${Number(summary.deleted_details ?? 0)}, alertas: ${Number(summary.deleted_alerts ?? 0)}.`);
    }
    catch (e) {
        ui.error(e?.response?.data?.message ||
            "No se pudo eliminar toda la informacion del modulo de lubricantes.");
    }
    finally {
        purging.value = false;
    }
}
async function loadDashboard(overrides) {
    dashboardLoading.value = true;
    dashboardError.value = null;
    try {
        const params = {
            periodo: dashboardPeriod.value,
            from: dashboardFrom.value || undefined,
            to: dashboardTo.value || undefined,
            compartimento: dashboardCompartimento.value || undefined,
            ...(overrides ?? {}),
        };
        const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", { params });
        dashboard.value = unwrap(data, null);
    }
    catch (e) {
        dashboardError.value = e?.response?.data?.message || "No se pudo generar el dashboard del lubricante.";
    }
    finally {
        dashboardLoading.value = false;
    }
}
async function handleDashboardSelection(value) {
    if (!value) {
        dashboard.value = null;
        return;
    }
    await loadDashboard({
        codigo: value.group_only ? undefined : value.ultimo_codigo || value.codigo || undefined,
        lubricante: value.lubricante || value.label,
        marca_lubricante: value.marca_lubricante || undefined,
        equipo_id: value.equipo_id || undefined,
        equipo_codigo: value.equipo_codigo || undefined,
        equipo_nombre: value.equipo_nombre || undefined,
        equipo_modelo: value.equipo_modelo || undefined,
    });
}
async function viewDashboard(item) {
    dashboardSelection.value = {
        lubricante: item.lubricante,
        marca_lubricante: item.marca_lubricante,
        codigo: item.codigo,
        equipo_id: item.equipo_id || undefined,
        equipo_codigo: item.equipo_codigo || undefined,
        equipo_nombre: item.equipo_nombre || undefined,
        equipo_modelo: item.sample_info?.equipo_modelo || undefined,
        label: [
            item.codigo,
            item.lubricante,
            item.marca_lubricante,
            resolveEquipmentLabel(item),
            item.sample_info?.equipo_modelo,
        ].filter(Boolean).join(" · "),
    };
    await loadDashboard({
        codigo: item.codigo,
        equipo_id: item.equipo_id || undefined,
        equipo_codigo: item.equipo_codigo || undefined,
        equipo_nombre: item.equipo_nombre || undefined,
        equipo_modelo: item.sample_info?.equipo_modelo || undefined,
    });
}
void viewDashboard;
async function viewDashboardGroup(group) {
    groupDetailDialog.value = false;
    dashboardSelection.value = {
        lubricante: group.lubricante,
        marca_lubricante: group.marca_lubricante,
        equipo_id: group.equipo_id || undefined,
        equipo_codigo: group.equipo_codigo || undefined,
        equipo_nombre: group.equipo_nombre || undefined,
        equipo_modelo: group.equipo_modelo || undefined,
        ultimo_codigo: group.ultimo_codigo,
        group_only: true,
        label: [group.lubricante, group.marca_lubricante, group.equipo_label, group.equipo_modelo].filter(Boolean).join(" · "),
    };
    await loadDashboard({
        lubricante: group.lubricante,
        marca_lubricante: group.marca_lubricante,
        equipo_id: group.equipo_id || undefined,
        equipo_codigo: group.equipo_codigo || undefined,
        equipo_nombre: group.equipo_nombre || undefined,
        equipo_modelo: group.equipo_modelo || undefined,
    });
}
function openGroupDetail(group) {
    selectedGroupKey.value = group.group_key;
    groupDetailDialog.value = true;
}
function openEditFromGroup(item) {
    groupDetailDialog.value = false;
    openEdit(item);
}
function openDeleteFromGroup(item) {
    groupDetailDialog.value = false;
    openDelete(item);
}
async function reloadDashboard() {
    if (!dashboardSelection.value && !dashboard.value?.selected?.lubricante)
        return;
    await loadDashboard({
        codigo: dashboardSelection.value?.group_only
            ? undefined
            : dashboardSelection.value?.codigo || dashboardSelection.value?.ultimo_codigo,
        lubricante: dashboardSelection.value?.lubricante || dashboard.value?.selected?.lubricante,
        marca_lubricante: dashboardSelection.value?.marca_lubricante ||
            dashboard.value?.selected?.marca_lubricante,
        equipo_id: dashboardSelection.value?.equipo_id ||
            dashboard.value?.selected?.equipo_id,
        equipo_codigo: dashboardSelection.value?.equipo_codigo ||
            dashboard.value?.selected?.equipo_codigo,
        equipo_nombre: dashboardSelection.value?.equipo_nombre ||
            dashboard.value?.selected?.equipo_nombre,
        equipo_modelo: dashboardSelection.value?.equipo_modelo ||
            dashboard.value?.selected?.equipo_modelo,
    });
}
watch(() => form.equipo_id, () => {
    applySelectedEquipmentSnapshot();
});
onMounted(async () => {
    await loadAll();
    await restoreActiveImportJob();
});
onUnmounted(() => {
    stopImportPolling();
    clearImportDismissTimer();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['lubricant-page']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['import-log']} */ ;
/** @type {__VLS_StyleScopedClasses['lubricant-groups-table']} */ ;
/** @type {__VLS_StyleScopedClasses['lubricant-groups-table']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card__title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "lubricant-page" },
});
/** @type {__VLS_StyleScopedClasses['lubricant-page']} */ ;
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
if (__VLS_ctx.canAccessLubricantReports) {
    let __VLS_14;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('excel')),
    }));
    const __VLS_16 = __VLS_15({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('excel')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    let __VLS_19;
    const __VLS_20 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!(__VLS_ctx.canAccessLubricantReports))
                    return;
                __VLS_ctx.exportAnalyses('excel');
                // @ts-ignore
                [canAccessLubricantReports, isExporting, exportAnalyses,];
            } });
    const { default: __VLS_21 } = __VLS_17.slots;
    // @ts-ignore
    [];
    var __VLS_17;
    var __VLS_18;
}
if (__VLS_ctx.canAccessLubricantReports) {
    let __VLS_22;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('pdf')),
    }));
    const __VLS_24 = __VLS_23({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('pdf')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_23));
    let __VLS_27;
    const __VLS_28 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!(__VLS_ctx.canAccessLubricantReports))
                    return;
                __VLS_ctx.exportAnalyses('pdf');
                // @ts-ignore
                [canAccessLubricantReports, isExporting, exportAnalyses,];
            } });
    const { default: __VLS_29 } = __VLS_25.slots;
    // @ts-ignore
    [];
    var __VLS_25;
    var __VLS_26;
}
let __VLS_30;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    ...{ 'onClick': {} },
    color: "secondary",
    variant: "tonal",
    prependIcon: "mdi-file-excel",
    loading: (__VLS_ctx.importing),
}));
const __VLS_32 = __VLS_31({
    ...{ 'onClick': {} },
    color: "secondary",
    variant: "tonal",
    prependIcon: "mdi-file-excel",
    loading: (__VLS_ctx.importing),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
let __VLS_35;
const __VLS_36 = ({ click: {} },
    { onClick: (__VLS_ctx.processWorkbookImport) });
const { default: __VLS_37 } = __VLS_33.slots;
// @ts-ignore
[importing, processWorkbookImport,];
var __VLS_33;
var __VLS_34;
let __VLS_38;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
    ...{ 'onClick': {} },
    color: "secondary",
    variant: "text",
    prependIcon: "mdi-download",
    loading: (__VLS_ctx.downloadingTemplate),
}));
const __VLS_40 = __VLS_39({
    ...{ 'onClick': {} },
    color: "secondary",
    variant: "text",
    prependIcon: "mdi-download",
    loading: (__VLS_ctx.downloadingTemplate),
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
let __VLS_43;
const __VLS_44 = ({ click: {} },
    { onClick: (__VLS_ctx.downloadImportTemplate) });
const { default: __VLS_45 } = __VLS_41.slots;
// @ts-ignore
[downloadingTemplate, downloadImportTemplate,];
var __VLS_41;
var __VLS_42;
if (__VLS_ctx.canPurgeAnalyses) {
    let __VLS_46;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        ...{ 'onClick': {} },
        color: "error",
        variant: "tonal",
        prependIcon: "mdi-delete-alert",
    }));
    const __VLS_48 = __VLS_47({
        ...{ 'onClick': {} },
        color: "error",
        variant: "tonal",
        prependIcon: "mdi-delete-alert",
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    let __VLS_51;
    const __VLS_52 = ({ click: {} },
        { onClick: (__VLS_ctx.openPurgeDialog) });
    const { default: __VLS_53 } = __VLS_49.slots;
    // @ts-ignore
    [canPurgeAnalyses, openPurgeDialog,];
    var __VLS_49;
    var __VLS_50;
}
let __VLS_54;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-refresh",
    loading: (__VLS_ctx.loading),
}));
const __VLS_56 = __VLS_55({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-refresh",
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
let __VLS_59;
const __VLS_60 = ({ click: {} },
    { onClick: (__VLS_ctx.loadAll) });
const { default: __VLS_61 } = __VLS_57.slots;
// @ts-ignore
[loading, loadAll,];
var __VLS_57;
var __VLS_58;
if (__VLS_ctx.error) {
    let __VLS_62;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
        type: "warning",
        variant: "tonal",
        ...{ class: "mt-4" },
        text: (__VLS_ctx.error),
    }));
    const __VLS_64 = __VLS_63({
        type: "warning",
        variant: "tonal",
        ...{ class: "mt-4" },
        text: (__VLS_ctx.error),
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
}
let __VLS_67;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
    dense: true,
    ...{ class: "mt-3" },
}));
const __VLS_69 = __VLS_68({
    dense: true,
    ...{ class: "mt-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
const { default: __VLS_72 } = __VLS_70.slots;
let __VLS_73;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
    cols: "12",
    md: "4",
}));
const __VLS_75 = __VLS_74({
    cols: "12",
    md: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
const { default: __VLS_78 } = __VLS_76.slots;
let __VLS_79;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
    modelValue: (__VLS_ctx.tableSearch),
    label: "Buscar lubricantes agrupados",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    hint: "Busca por codigo, lubricante, marca, equipo, modelo o compartimento",
    persistentHint: true,
    clearable: true,
}));
const __VLS_81 = __VLS_80({
    modelValue: (__VLS_ctx.tableSearch),
    label: "Buscar lubricantes agrupados",
    variant: "outlined",
    density: "compact",
    prependInnerIcon: "mdi-magnify",
    hint: "Busca por codigo, lubricante, marca, equipo, modelo o compartimento",
    persistentHint: true,
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
// @ts-ignore
[error, error, tableSearch,];
var __VLS_76;
let __VLS_84;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
    cols: "12",
    md: "3",
}));
const __VLS_86 = __VLS_85({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const { default: __VLS_89 } = __VLS_87.slots;
let __VLS_90;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
    modelValue: (__VLS_ctx.statusFilter),
    items: (__VLS_ctx.conditionOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Condicion",
    variant: "outlined",
    density: "compact",
    clearable: true,
}));
const __VLS_92 = __VLS_91({
    modelValue: (__VLS_ctx.statusFilter),
    items: (__VLS_ctx.conditionOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Condicion",
    variant: "outlined",
    density: "compact",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
// @ts-ignore
[statusFilter, conditionOptions,];
var __VLS_87;
let __VLS_95;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
    cols: "12",
    md: "5",
}));
const __VLS_97 = __VLS_96({
    cols: "12",
    md: "5",
}, ...__VLS_functionalComponentArgsRest(__VLS_96));
const { default: __VLS_100 } = __VLS_98.slots;
let __VLS_101;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_102 = __VLS_asFunctionalComponent1(__VLS_101, new __VLS_101({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.dashboardSelection),
    items: (__VLS_ctx.catalogOptions),
    itemTitle: "label",
    returnObject: true,
    clearable: true,
    label: "Dashboard por lubricante",
    variant: "outlined",
    density: "compact",
    hint: "Selecciona un lubricante por codigo, nombre, equipo o modelo para ver su historial",
    persistentHint: true,
}));
const __VLS_103 = __VLS_102({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.dashboardSelection),
    items: (__VLS_ctx.catalogOptions),
    itemTitle: "label",
    returnObject: true,
    clearable: true,
    label: "Dashboard por lubricante",
    variant: "outlined",
    density: "compact",
    hint: "Selecciona un lubricante por codigo, nombre, equipo o modelo para ver su historial",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_102));
let __VLS_106;
const __VLS_107 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.handleDashboardSelection) });
var __VLS_104;
var __VLS_105;
// @ts-ignore
[dashboardSelection, catalogOptions, handleDashboardSelection,];
var __VLS_98;
let __VLS_108;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
    cols: "12",
    md: "3",
}));
const __VLS_110 = __VLS_109({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
const { default: __VLS_113 } = __VLS_111.slots;
let __VLS_114;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_115 = __VLS_asFunctionalComponent1(__VLS_114, new __VLS_114({
    modelValue: (__VLS_ctx.reportFrom),
    type: "date",
    label: "Reporte desde",
    variant: "outlined",
    density: "compact",
}));
const __VLS_116 = __VLS_115({
    modelValue: (__VLS_ctx.reportFrom),
    type: "date",
    label: "Reporte desde",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_115));
// @ts-ignore
[reportFrom,];
var __VLS_111;
let __VLS_119;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
    cols: "12",
    md: "3",
}));
const __VLS_121 = __VLS_120({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
const { default: __VLS_124 } = __VLS_122.slots;
let __VLS_125;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent1(__VLS_125, new __VLS_125({
    modelValue: (__VLS_ctx.reportTo),
    type: "date",
    label: "Reporte hasta",
    variant: "outlined",
    density: "compact",
}));
const __VLS_127 = __VLS_126({
    modelValue: (__VLS_ctx.reportTo),
    type: "date",
    label: "Reporte hasta",
    variant: "outlined",
    density: "compact",
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
// @ts-ignore
[reportTo,];
var __VLS_122;
// @ts-ignore
[];
var __VLS_70;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "summary-strip mt-2" },
});
/** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
let __VLS_130;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent1(__VLS_130, new __VLS_130({
    color: "primary",
    variant: "tonal",
    label: true,
}));
const __VLS_132 = __VLS_131({
    color: "primary",
    variant: "tonal",
    label: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
const { default: __VLS_135 } = __VLS_133.slots;
(__VLS_ctx.analyses.length);
// @ts-ignore
[analyses,];
var __VLS_133;
let __VLS_136;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent1(__VLS_136, new __VLS_136({
    color: "secondary",
    variant: "tonal",
    label: true,
}));
const __VLS_138 = __VLS_137({
    color: "secondary",
    variant: "tonal",
    label: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
const { default: __VLS_141 } = __VLS_139.slots;
(__VLS_ctx.catalogOptions.length);
// @ts-ignore
[catalogOptions,];
var __VLS_139;
let __VLS_142;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent1(__VLS_142, new __VLS_142({
    color: "error",
    variant: "tonal",
    label: true,
}));
const __VLS_144 = __VLS_143({
    color: "error",
    variant: "tonal",
    label: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_143));
const { default: __VLS_147 } = __VLS_145.slots;
(__VLS_ctx.alertCount);
// @ts-ignore
[alertCount,];
var __VLS_145;
let __VLS_148;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent1(__VLS_148, new __VLS_148({
    dense: true,
    ...{ class: "mt-3" },
}));
const __VLS_150 = __VLS_149({
    dense: true,
    ...{ class: "mt-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
const { default: __VLS_153 } = __VLS_151.slots;
let __VLS_154;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent1(__VLS_154, new __VLS_154({
    cols: "12",
    md: "8",
}));
const __VLS_156 = __VLS_155({
    cols: "12",
    md: "8",
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
const { default: __VLS_159 } = __VLS_157.slots;
let __VLS_160;
/** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
vFileInput;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent1(__VLS_160, new __VLS_160({
    modelValue: (__VLS_ctx.importFile),
    accept: ".xlsx,.xls",
    prependIcon: "mdi-file-excel",
    label: "Selecciona el archivo Excel de lubricante",
    variant: "outlined",
    density: "compact",
    showSize: true,
    hideDetails: "auto",
}));
const __VLS_162 = __VLS_161({
    modelValue: (__VLS_ctx.importFile),
    accept: ".xlsx,.xls",
    prependIcon: "mdi-file-excel",
    label: "Selecciona el archivo Excel de lubricante",
    variant: "outlined",
    density: "compact",
    showSize: true,
    hideDetails: "auto",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
// @ts-ignore
[importFile,];
var __VLS_157;
let __VLS_165;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_166 = __VLS_asFunctionalComponent1(__VLS_165, new __VLS_165({
    cols: "12",
    md: "4",
    ...{ class: "d-flex align-center" },
}));
const __VLS_167 = __VLS_166({
    cols: "12",
    md: "4",
    ...{ class: "d-flex align-center" },
}, ...__VLS_functionalComponentArgsRest(__VLS_166));
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
const { default: __VLS_170 } = __VLS_168.slots;
if (__VLS_ctx.lastImportSummary) {
    let __VLS_171;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_172 = __VLS_asFunctionalComponent1(__VLS_171, new __VLS_171({
        color: "success",
        variant: "tonal",
        label: true,
    }));
    const __VLS_173 = __VLS_172({
        color: "success",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_172));
    const { default: __VLS_176 } = __VLS_174.slots;
    (__VLS_ctx.lastImportSummary.created);
    (__VLS_ctx.lastImportSummary.updated);
    (__VLS_ctx.lastImportSummary.errors.length);
    // @ts-ignore
    [lastImportSummary, lastImportSummary, lastImportSummary, lastImportSummary,];
    var __VLS_174;
}
// @ts-ignore
[];
var __VLS_168;
// @ts-ignore
[];
var __VLS_151;
if (__VLS_ctx.importJob) {
    let __VLS_177;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_178 = __VLS_asFunctionalComponent1(__VLS_177, new __VLS_177({
        ...{ class: "mt-4" },
        rounded: "lg",
        variant: "tonal",
    }));
    const __VLS_179 = __VLS_178({
        ...{ class: "mt-4" },
        rounded: "lg",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_178));
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    const { default: __VLS_182 } = __VLS_180.slots;
    let __VLS_183;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent1(__VLS_183, new __VLS_183({}));
    const __VLS_185 = __VLS_184({}, ...__VLS_functionalComponentArgsRest(__VLS_184));
    const { default: __VLS_188 } = __VLS_186.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-header page-wrap mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.importJob.source_file_name || __VLS_ctx.importJob.stored_file_name || "Archivo Excel");
    let __VLS_189;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_190 = __VLS_asFunctionalComponent1(__VLS_189, new __VLS_189({
        color: (__VLS_ctx.importStatusColor(__VLS_ctx.importJob.status)),
        variant: "tonal",
        label: true,
    }));
    const __VLS_191 = __VLS_190({
        color: (__VLS_ctx.importStatusColor(__VLS_ctx.importJob.status)),
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_190));
    const { default: __VLS_194 } = __VLS_192.slots;
    (__VLS_ctx.importJob.status || "QUEUED");
    // @ts-ignore
    [importJob, importJob, importJob, importJob, importJob, importStatusColor,];
    var __VLS_192;
    let __VLS_195;
    /** @ts-ignore @type {typeof __VLS_components.vProgressLinear | typeof __VLS_components.VProgressLinear} */
    vProgressLinear;
    // @ts-ignore
    const __VLS_196 = __VLS_asFunctionalComponent1(__VLS_195, new __VLS_195({
        modelValue: (__VLS_ctx.importProgress),
        color: (__VLS_ctx.importStatusColor(__VLS_ctx.importJob.status)),
        height: "12",
        rounded: true,
    }));
    const __VLS_197 = __VLS_196({
        modelValue: (__VLS_ctx.importProgress),
        color: (__VLS_ctx.importStatusColor(__VLS_ctx.importJob.status)),
        height: "12",
        rounded: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_196));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-header page-wrap mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    (__VLS_ctx.importJob.current_step || "En espera");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.importProgress);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    (__VLS_ctx.importJob.current_index || 0);
    (__VLS_ctx.importJob.total_steps || 0);
    if (__VLS_ctx.importJob.error_message) {
        let __VLS_200;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_201 = __VLS_asFunctionalComponent1(__VLS_200, new __VLS_200({
            ...{ class: "mt-3" },
            type: "error",
            variant: "tonal",
            text: (__VLS_ctx.importJob.error_message),
        }));
        const __VLS_202 = __VLS_201({
            ...{ class: "mt-3" },
            type: "error",
            variant: "tonal",
            text: (__VLS_ctx.importJob.error_message),
        }, ...__VLS_functionalComponentArgsRest(__VLS_201));
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    }
    if (Array.isArray(__VLS_ctx.importJob.errors) && __VLS_ctx.importJob.errors.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption font-weight-bold mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "import-log" },
        });
        /** @type {__VLS_StyleScopedClasses['import-log']} */ ;
        for (const [item, index] of __VLS_vFor((__VLS_ctx.importJob.errors))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (`error-${index}`),
                ...{ class: "import-log__line" },
            });
            /** @type {__VLS_StyleScopedClasses['import-log__line']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (Number(item.index ?? 0) + 1);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (item.message);
            // @ts-ignore
            [importJob, importJob, importJob, importJob, importJob, importJob, importJob, importJob, importJob, importStatusColor, importProgress, importProgress,];
        }
    }
    if (__VLS_ctx.importLogs.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption font-weight-bold mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "import-log" },
        });
        /** @type {__VLS_StyleScopedClasses['import-log']} */ ;
        for (const [log, index] of __VLS_vFor((__VLS_ctx.importLogs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (`${log.at}-${index}`),
                ...{ class: "import-log__line" },
            });
            /** @type {__VLS_StyleScopedClasses['import-log__line']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (log.level);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (log.at);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (log.message);
            // @ts-ignore
            [importLogs, importLogs,];
        }
    }
    // @ts-ignore
    [];
    var __VLS_186;
    // @ts-ignore
    [];
    var __VLS_180;
}
// @ts-ignore
[];
var __VLS_3;
let __VLS_205;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent1(__VLS_205, new __VLS_205({
    rounded: "xl",
    ...{ class: "pa-4 enterprise-surface" },
}));
const __VLS_207 = __VLS_206({
    rounded: "xl",
    ...{ class: "pa-4 enterprise-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
const { default: __VLS_210 } = __VLS_208.slots;
let __VLS_211;
/** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
vDataTable;
// @ts-ignore
const __VLS_212 = __VLS_asFunctionalComponent1(__VLS_211, new __VLS_211({
    headers: (__VLS_ctx.groupHeaders),
    items: (__VLS_ctx.filteredLubricantGroups),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo análisis de lubricante...",
    itemsPerPage: (15),
    ...{ class: "enterprise-table lubricant-groups-table" },
}));
const __VLS_213 = __VLS_212({
    headers: (__VLS_ctx.groupHeaders),
    items: (__VLS_ctx.filteredLubricantGroups),
    loading: (__VLS_ctx.loading),
    loadingText: "Obteniendo análisis de lubricante...",
    itemsPerPage: (15),
    ...{ class: "enterprise-table lubricant-groups-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_212));
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
/** @type {__VLS_StyleScopedClasses['lubricant-groups-table']} */ ;
const { default: __VLS_216 } = __VLS_214.slots;
{
    const { 'item.lubricante_group': __VLS_217 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_217);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (item.lubricante || "Sin lubricante");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (item.marca_lubricante || "Sin marca del lubricante");
    // @ts-ignore
    [loading, groupHeaders, filteredLubricantGroups,];
}
{
    const { 'item.equipo_group': __VLS_218 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_218);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (item.equipo_label || "Sin equipo");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (item.equipo_codigo || item.equipo_nombre || "Sin referencia");
    // @ts-ignore
    [];
}
{
    const { 'item.equipo_modelo': __VLS_219 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_219);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (item.equipo_modelo || "Sin modelo");
    // @ts-ignore
    [];
}
{
    const { 'item.ultimo_codigo': __VLS_220 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_220);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (item.ultimo_codigo || "Sin codigo");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (item.total_analisis);
    // @ts-ignore
    [];
}
{
    const { 'item.compartimentos': __VLS_221 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_221);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "group-compartments" },
    });
    /** @type {__VLS_StyleScopedClasses['group-compartments']} */ ;
    for (const [compartimento] of __VLS_vFor((item.compartimentos))) {
        let __VLS_222;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_223 = __VLS_asFunctionalComponent1(__VLS_222, new __VLS_222({
            key: (`${item.group_key}-${compartimento}`),
            size: "x-small",
            variant: "tonal",
            color: "secondary",
        }));
        const __VLS_224 = __VLS_223({
            key: (`${item.group_key}-${compartimento}`),
            size: "x-small",
            variant: "tonal",
            color: "secondary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_223));
        const { default: __VLS_227 } = __VLS_225.slots;
        (compartimento);
        // @ts-ignore
        [];
        var __VLS_225;
        // @ts-ignore
        [];
    }
    if (!item.compartimentos?.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    // @ts-ignore
    [];
}
{
    const { 'item.ultimo_informe': __VLS_228 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_228);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (item.ultimo_informe || "Sin fecha");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (item.ultimo_numero_muestra || "Sin muestra");
    // @ts-ignore
    [];
}
{
    const { 'item.estado_resumen': __VLS_229 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_229);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    let __VLS_230;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_231 = __VLS_asFunctionalComponent1(__VLS_230, new __VLS_230({
        size: "small",
        color: (__VLS_ctx.conditionColor(item.ultimo_estado)),
        variant: "tonal",
    }));
    const __VLS_232 = __VLS_231({
        size: "small",
        color: (__VLS_ctx.conditionColor(item.ultimo_estado)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_231));
    const { default: __VLS_235 } = __VLS_233.slots;
    (item.ultimo_estado || "N/D");
    // @ts-ignore
    [conditionColor,];
    var __VLS_233;
    if (item.anormales > 0) {
        let __VLS_236;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent1(__VLS_236, new __VLS_236({
            size: "small",
            color: "error",
            variant: "tonal",
        }));
        const __VLS_238 = __VLS_237({
            size: "small",
            color: "error",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        const { default: __VLS_241 } = __VLS_239.slots;
        (item.anormales);
        // @ts-ignore
        [];
        var __VLS_239;
    }
    // @ts-ignore
    [];
}
{
    const { 'item.actions': __VLS_242 } = __VLS_214.slots;
    const [{ item }] = __VLS_vSlot(__VLS_242);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-actions justify-end" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    let __VLS_243;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_244 = __VLS_asFunctionalComponent1(__VLS_243, new __VLS_243({
        ...{ 'onClick': {} },
        variant: "text",
        color: "primary",
        prependIcon: "mdi-chart-line",
    }));
    const __VLS_245 = __VLS_244({
        ...{ 'onClick': {} },
        variant: "text",
        color: "primary",
        prependIcon: "mdi-chart-line",
    }, ...__VLS_functionalComponentArgsRest(__VLS_244));
    let __VLS_248;
    const __VLS_249 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.viewDashboardGroup(item);
                // @ts-ignore
                [viewDashboardGroup,];
            } });
    const { default: __VLS_250 } = __VLS_246.slots;
    // @ts-ignore
    [];
    var __VLS_246;
    var __VLS_247;
    let __VLS_251;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_252 = __VLS_asFunctionalComponent1(__VLS_251, new __VLS_251({
        ...{ 'onClick': {} },
        variant: "tonal",
        color: "primary",
        prependIcon: "mdi-file-document-search",
    }));
    const __VLS_253 = __VLS_252({
        ...{ 'onClick': {} },
        variant: "tonal",
        color: "primary",
        prependIcon: "mdi-file-document-search",
    }, ...__VLS_functionalComponentArgsRest(__VLS_252));
    let __VLS_256;
    const __VLS_257 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.openGroupDetail(item);
                // @ts-ignore
                [openGroupDetail,];
            } });
    const { default: __VLS_258 } = __VLS_254.slots;
    // @ts-ignore
    [];
    var __VLS_254;
    var __VLS_255;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_214;
// @ts-ignore
[];
var __VLS_208;
let __VLS_259;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_260 = __VLS_asFunctionalComponent1(__VLS_259, new __VLS_259({
    rounded: "xl",
    ...{ class: "pa-5 enterprise-surface" },
}));
const __VLS_261 = __VLS_260({
    rounded: "xl",
    ...{ class: "pa-5 enterprise-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_260));
/** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
const { default: __VLS_264 } = __VLS_262.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between page-wrap mb-4" },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex page-wrap" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
let __VLS_265;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent1(__VLS_265, new __VLS_265({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.dashboardPeriod),
    items: (__VLS_ctx.periodOptions),
    itemTitle: "title",
    itemValue: "value",
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    ...{ style: {} },
}));
const __VLS_267 = __VLS_266({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.dashboardPeriod),
    items: (__VLS_ctx.periodOptions),
    itemTitle: "title",
    itemValue: "value",
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_266));
let __VLS_270;
const __VLS_271 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.reloadDashboard) });
var __VLS_268;
var __VLS_269;
let __VLS_272;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_273 = __VLS_asFunctionalComponent1(__VLS_272, new __VLS_272({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.dashboardFrom),
    type: "date",
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    label: "Desde",
    ...{ style: {} },
}));
const __VLS_274 = __VLS_273({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.dashboardFrom),
    type: "date",
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    label: "Desde",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_273));
let __VLS_277;
const __VLS_278 = ({ change: {} },
    { onChange: (__VLS_ctx.reloadDashboard) });
var __VLS_275;
var __VLS_276;
let __VLS_279;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_280 = __VLS_asFunctionalComponent1(__VLS_279, new __VLS_279({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.dashboardTo),
    type: "date",
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    label: "Hasta",
    ...{ style: {} },
}));
const __VLS_281 = __VLS_280({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.dashboardTo),
    type: "date",
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    label: "Hasta",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_280));
let __VLS_284;
const __VLS_285 = ({ change: {} },
    { onChange: (__VLS_ctx.reloadDashboard) });
var __VLS_282;
var __VLS_283;
let __VLS_286;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_287 = __VLS_asFunctionalComponent1(__VLS_286, new __VLS_286({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.dashboardCompartimento),
    items: (__VLS_ctx.compartmentOptions),
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    clearable: true,
    label: "Compartimento",
    ...{ style: {} },
}));
const __VLS_288 = __VLS_287({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.dashboardCompartimento),
    items: (__VLS_ctx.compartmentOptions),
    density: "compact",
    variant: "outlined",
    hideDetails: true,
    clearable: true,
    label: "Compartimento",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_287));
let __VLS_291;
const __VLS_292 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.reloadDashboard) });
var __VLS_289;
var __VLS_290;
const __VLS_293 = LubricantDashboardPanel;
// @ts-ignore
const __VLS_294 = __VLS_asFunctionalComponent1(__VLS_293, new __VLS_293({
    dashboard: (__VLS_ctx.dashboard),
    loading: (__VLS_ctx.dashboardLoading),
    error: (__VLS_ctx.dashboardError),
}));
const __VLS_295 = __VLS_294({
    dashboard: (__VLS_ctx.dashboard),
    loading: (__VLS_ctx.dashboardLoading),
    error: (__VLS_ctx.dashboardError),
}, ...__VLS_functionalComponentArgsRest(__VLS_294));
// @ts-ignore
[dashboardPeriod, periodOptions, reloadDashboard, reloadDashboard, reloadDashboard, reloadDashboard, dashboardFrom, dashboardTo, dashboardCompartimento, compartmentOptions, dashboard, dashboardLoading, dashboardError,];
var __VLS_262;
let __VLS_298;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_299 = __VLS_asFunctionalComponent1(__VLS_298, new __VLS_298({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isFormDialogFullscreen),
    maxWidth: (__VLS_ctx.isFormDialogFullscreen ? undefined : 1400),
}));
const __VLS_300 = __VLS_299({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isFormDialogFullscreen),
    maxWidth: (__VLS_ctx.isFormDialogFullscreen ? undefined : 1400),
}, ...__VLS_functionalComponentArgsRest(__VLS_299));
const { default: __VLS_303 } = __VLS_301.slots;
let __VLS_304;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_305 = __VLS_asFunctionalComponent1(__VLS_304, new __VLS_304({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_306 = __VLS_305({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_305));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_309 } = __VLS_307.slots;
let __VLS_310;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_311 = __VLS_asFunctionalComponent1(__VLS_310, new __VLS_310({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_312 = __VLS_311({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_311));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_315 } = __VLS_313.slots;
(__VLS_ctx.editingId ? "Editar" : "Crear");
// @ts-ignore
[dialog, isFormDialogFullscreen, isFormDialogFullscreen, editingId,];
var __VLS_313;
let __VLS_316;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent1(__VLS_316, new __VLS_316({}));
const __VLS_318 = __VLS_317({}, ...__VLS_functionalComponentArgsRest(__VLS_317));
let __VLS_321;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent1(__VLS_321, new __VLS_321({
    ...{ class: "pt-4 section-surface" },
}));
const __VLS_323 = __VLS_322({
    ...{ class: "pt-4 section-surface" },
}, ...__VLS_functionalComponentArgsRest(__VLS_322));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['section-surface']} */ ;
const { default: __VLS_326 } = __VLS_324.slots;
let __VLS_327;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_328 = __VLS_asFunctionalComponent1(__VLS_327, new __VLS_327({
    dense: true,
}));
const __VLS_329 = __VLS_328({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_328));
const { default: __VLS_332 } = __VLS_330.slots;
let __VLS_333;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent1(__VLS_333, new __VLS_333({
    cols: "12",
    md: "3",
}));
const __VLS_335 = __VLS_334({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
const { default: __VLS_338 } = __VLS_336.slots;
let __VLS_339;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_340 = __VLS_asFunctionalComponent1(__VLS_339, new __VLS_339({
    modelValue: (__VLS_ctx.form.codigo),
    label: "Codigo autogenerado",
    variant: "outlined",
    readonly: true,
    loading: (__VLS_ctx.codeLoading),
}));
const __VLS_341 = __VLS_340({
    modelValue: (__VLS_ctx.form.codigo),
    label: "Codigo autogenerado",
    variant: "outlined",
    readonly: true,
    loading: (__VLS_ctx.codeLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_340));
// @ts-ignore
[form, codeLoading,];
var __VLS_336;
let __VLS_344;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_345 = __VLS_asFunctionalComponent1(__VLS_344, new __VLS_344({
    cols: "12",
    md: "3",
}));
const __VLS_346 = __VLS_345({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_345));
const { default: __VLS_349 } = __VLS_347.slots;
let __VLS_350;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_351 = __VLS_asFunctionalComponent1(__VLS_350, new __VLS_350({
    modelValue: (__VLS_ctx.form.cliente),
    label: "Nombre del cliente",
    variant: "outlined",
}));
const __VLS_352 = __VLS_351({
    modelValue: (__VLS_ctx.form.cliente),
    label: "Nombre del cliente",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_351));
// @ts-ignore
[form,];
var __VLS_347;
let __VLS_355;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_356 = __VLS_asFunctionalComponent1(__VLS_355, new __VLS_355({
    cols: "12",
    md: "3",
}));
const __VLS_357 = __VLS_356({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_356));
const { default: __VLS_360 } = __VLS_358.slots;
let __VLS_361;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_362 = __VLS_asFunctionalComponent1(__VLS_361, new __VLS_361({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.form.compartimento_principal),
    items: (__VLS_ctx.compartmentOptions),
    label: "Compartimento",
    variant: "outlined",
}));
const __VLS_363 = __VLS_362({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.form.compartimento_principal),
    items: (__VLS_ctx.compartmentOptions),
    label: "Compartimento",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_362));
let __VLS_366;
const __VLS_367 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.handleCompartmentChange) });
var __VLS_364;
var __VLS_365;
// @ts-ignore
[compartmentOptions, form, handleCompartmentChange,];
var __VLS_358;
let __VLS_368;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_369 = __VLS_asFunctionalComponent1(__VLS_368, new __VLS_368({
    cols: "12",
    md: "3",
}));
const __VLS_370 = __VLS_369({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_369));
const { default: __VLS_373 } = __VLS_371.slots;
let __VLS_374;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_375 = __VLS_asFunctionalComponent1(__VLS_374, new __VLS_374({
    modelValue: (__VLS_ctx.form.equipo_id),
    items: (__VLS_ctx.equipmentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Equipo",
    variant: "outlined",
    clearable: true,
}));
const __VLS_376 = __VLS_375({
    modelValue: (__VLS_ctx.form.equipo_id),
    items: (__VLS_ctx.equipmentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Equipo",
    variant: "outlined",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_375));
// @ts-ignore
[form, equipmentOptions,];
var __VLS_371;
let __VLS_379;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_380 = __VLS_asFunctionalComponent1(__VLS_379, new __VLS_379({
    cols: "12",
    md: "3",
}));
const __VLS_381 = __VLS_380({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_380));
const { default: __VLS_384 } = __VLS_382.slots;
let __VLS_385;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_386 = __VLS_asFunctionalComponent1(__VLS_385, new __VLS_385({
    modelValue: (__VLS_ctx.form.equipo_marca),
    label: "Marca",
    variant: "outlined",
    readonly: true,
}));
const __VLS_387 = __VLS_386({
    modelValue: (__VLS_ctx.form.equipo_marca),
    label: "Marca",
    variant: "outlined",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_386));
// @ts-ignore
[form,];
var __VLS_382;
let __VLS_390;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_391 = __VLS_asFunctionalComponent1(__VLS_390, new __VLS_390({
    cols: "12",
    md: "3",
}));
const __VLS_392 = __VLS_391({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_391));
const { default: __VLS_395 } = __VLS_393.slots;
let __VLS_396;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_397 = __VLS_asFunctionalComponent1(__VLS_396, new __VLS_396({
    modelValue: (__VLS_ctx.form.equipo_serie),
    label: "Serie",
    variant: "outlined",
}));
const __VLS_398 = __VLS_397({
    modelValue: (__VLS_ctx.form.equipo_serie),
    label: "Serie",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_397));
// @ts-ignore
[form,];
var __VLS_393;
let __VLS_401;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_402 = __VLS_asFunctionalComponent1(__VLS_401, new __VLS_401({
    cols: "12",
    md: "3",
}));
const __VLS_403 = __VLS_402({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_402));
const { default: __VLS_406 } = __VLS_404.slots;
let __VLS_407;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_408 = __VLS_asFunctionalComponent1(__VLS_407, new __VLS_407({
    modelValue: (__VLS_ctx.form.equipo_modelo),
    label: "Modelo",
    variant: "outlined",
}));
const __VLS_409 = __VLS_408({
    modelValue: (__VLS_ctx.form.equipo_modelo),
    label: "Modelo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_408));
// @ts-ignore
[form,];
var __VLS_404;
let __VLS_412;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_413 = __VLS_asFunctionalComponent1(__VLS_412, new __VLS_412({
    cols: "12",
    md: "3",
}));
const __VLS_414 = __VLS_413({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_413));
const { default: __VLS_417 } = __VLS_415.slots;
let __VLS_418;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_419 = __VLS_asFunctionalComponent1(__VLS_418, new __VLS_418({
    modelValue: (__VLS_ctx.form.condicion),
    items: (__VLS_ctx.conditionOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Condicion",
    variant: "outlined",
}));
const __VLS_420 = __VLS_419({
    modelValue: (__VLS_ctx.form.condicion),
    items: (__VLS_ctx.conditionOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Condicion",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_419));
// @ts-ignore
[conditionOptions, form,];
var __VLS_415;
let __VLS_423;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_424 = __VLS_asFunctionalComponent1(__VLS_423, new __VLS_423({
    cols: "12",
    md: "6",
}));
const __VLS_425 = __VLS_424({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_424));
const { default: __VLS_428 } = __VLS_426.slots;
let __VLS_429;
/** @ts-ignore @type {typeof __VLS_components.vCombobox | typeof __VLS_components.VCombobox} */
vCombobox;
// @ts-ignore
const __VLS_430 = __VLS_asFunctionalComponent1(__VLS_429, new __VLS_429({
    ...{ 'onUpdate:modelValue': {} },
    ...{ 'onUpdate:search': {} },
    modelValue: (__VLS_ctx.lubricantSelection),
    search: (__VLS_ctx.lubricantSearch),
    items: (__VLS_ctx.catalogOptions),
    itemTitle: "label",
    returnObject: true,
    clearable: true,
    label: "Lubricante",
    variant: "outlined",
    hint: "Escribe el codigo o nombre del lubricante para autocompletar registros previos",
    persistentHint: true,
}));
const __VLS_431 = __VLS_430({
    ...{ 'onUpdate:modelValue': {} },
    ...{ 'onUpdate:search': {} },
    modelValue: (__VLS_ctx.lubricantSelection),
    search: (__VLS_ctx.lubricantSearch),
    items: (__VLS_ctx.catalogOptions),
    itemTitle: "label",
    returnObject: true,
    clearable: true,
    label: "Lubricante",
    variant: "outlined",
    hint: "Escribe el codigo o nombre del lubricante para autocompletar registros previos",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_430));
let __VLS_434;
const __VLS_435 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.handleLubricantSelection) });
const __VLS_436 = ({ 'update:search': {} },
    { 'onUpdate:search': (__VLS_ctx.handleLubricantSearch) });
var __VLS_432;
var __VLS_433;
// @ts-ignore
[catalogOptions, lubricantSelection, lubricantSearch, handleLubricantSelection, handleLubricantSearch,];
var __VLS_426;
let __VLS_437;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_438 = __VLS_asFunctionalComponent1(__VLS_437, new __VLS_437({
    cols: "12",
    md: "6",
}));
const __VLS_439 = __VLS_438({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_438));
const { default: __VLS_442 } = __VLS_440.slots;
let __VLS_443;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_444 = __VLS_asFunctionalComponent1(__VLS_443, new __VLS_443({
    modelValue: (__VLS_ctx.form.marca_lubricante),
    label: "Marca del lubricante",
    variant: "outlined",
}));
const __VLS_445 = __VLS_444({
    modelValue: (__VLS_ctx.form.marca_lubricante),
    label: "Marca del lubricante",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_444));
// @ts-ignore
[form,];
var __VLS_440;
let __VLS_448;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_449 = __VLS_asFunctionalComponent1(__VLS_448, new __VLS_448({
    cols: "12",
}));
const __VLS_450 = __VLS_449({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_449));
const { default: __VLS_453 } = __VLS_451.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-2 font-weight-bold mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
// @ts-ignore
[];
var __VLS_451;
let __VLS_454;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_455 = __VLS_asFunctionalComponent1(__VLS_454, new __VLS_454({
    cols: "12",
    md: "3",
}));
const __VLS_456 = __VLS_455({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_455));
const { default: __VLS_459 } = __VLS_457.slots;
let __VLS_460;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_461 = __VLS_asFunctionalComponent1(__VLS_460, new __VLS_460({
    modelValue: (__VLS_ctx.form.numero_muestra),
    label: "Numeracion de muestra",
    variant: "outlined",
}));
const __VLS_462 = __VLS_461({
    modelValue: (__VLS_ctx.form.numero_muestra),
    label: "Numeracion de muestra",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_461));
// @ts-ignore
[form,];
var __VLS_457;
let __VLS_465;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_466 = __VLS_asFunctionalComponent1(__VLS_465, new __VLS_465({
    cols: "12",
    md: "3",
}));
const __VLS_467 = __VLS_466({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_466));
const { default: __VLS_470 } = __VLS_468.slots;
let __VLS_471;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_472 = __VLS_asFunctionalComponent1(__VLS_471, new __VLS_471({
    modelValue: (__VLS_ctx.form.fecha_muestra),
    type: "date",
    label: "Fecha de muestreo",
    variant: "outlined",
}));
const __VLS_473 = __VLS_472({
    modelValue: (__VLS_ctx.form.fecha_muestra),
    type: "date",
    label: "Fecha de muestreo",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_472));
// @ts-ignore
[form,];
var __VLS_468;
let __VLS_476;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_477 = __VLS_asFunctionalComponent1(__VLS_476, new __VLS_476({
    cols: "12",
    md: "3",
}));
const __VLS_478 = __VLS_477({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_477));
const { default: __VLS_481 } = __VLS_479.slots;
let __VLS_482;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_483 = __VLS_asFunctionalComponent1(__VLS_482, new __VLS_482({
    modelValue: (__VLS_ctx.form.fecha_ingreso),
    type: "date",
    label: "Fecha de ingreso",
    variant: "outlined",
}));
const __VLS_484 = __VLS_483({
    modelValue: (__VLS_ctx.form.fecha_ingreso),
    type: "date",
    label: "Fecha de ingreso",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_483));
// @ts-ignore
[form,];
var __VLS_479;
let __VLS_487;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_488 = __VLS_asFunctionalComponent1(__VLS_487, new __VLS_487({
    cols: "12",
    md: "3",
}));
const __VLS_489 = __VLS_488({
    cols: "12",
    md: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_488));
const { default: __VLS_492 } = __VLS_490.slots;
let __VLS_493;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_494 = __VLS_asFunctionalComponent1(__VLS_493, new __VLS_493({
    modelValue: (__VLS_ctx.form.fecha_reporte),
    type: "date",
    label: "Fecha de informe",
    variant: "outlined",
}));
const __VLS_495 = __VLS_494({
    modelValue: (__VLS_ctx.form.fecha_reporte),
    type: "date",
    label: "Fecha de informe",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_494));
// @ts-ignore
[form,];
var __VLS_490;
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
    modelValue: (__VLS_ctx.form.horas_equipo),
    modelModifiers: { number: true, },
    type: "number",
    label: "Equipo Hrs/Km",
    variant: "outlined",
}));
const __VLS_506 = __VLS_505({
    modelValue: (__VLS_ctx.form.horas_equipo),
    modelModifiers: { number: true, },
    type: "number",
    label: "Equipo Hrs/Km",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_505));
// @ts-ignore
[form,];
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
    modelValue: (__VLS_ctx.form.horas_lubricante),
    modelModifiers: { number: true, },
    type: "number",
    label: "Aceite Hrs/Km",
    variant: "outlined",
}));
const __VLS_517 = __VLS_516({
    modelValue: (__VLS_ctx.form.horas_lubricante),
    modelModifiers: { number: true, },
    type: "number",
    label: "Aceite Hrs/Km",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_516));
// @ts-ignore
[form,];
var __VLS_512;
let __VLS_520;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_521 = __VLS_asFunctionalComponent1(__VLS_520, new __VLS_520({
    cols: "12",
}));
const __VLS_522 = __VLS_521({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_521));
const { default: __VLS_525 } = __VLS_523.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "responsive-header mb-2 page-wrap" },
});
/** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-2 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
let __VLS_526;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_527 = __VLS_asFunctionalComponent1(__VLS_526, new __VLS_526({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-table-refresh",
}));
const __VLS_528 = __VLS_527({
    ...{ 'onClick': {} },
    variant: "tonal",
    prependIcon: "mdi-table-refresh",
}, ...__VLS_functionalComponentArgsRest(__VLS_527));
let __VLS_531;
const __VLS_532 = ({ click: {} },
    { onClick: (__VLS_ctx.applyDetailTemplate) });
const { default: __VLS_533 } = __VLS_529.slots;
// @ts-ignore
[applyDetailTemplate,];
var __VLS_529;
var __VLS_530;
let __VLS_534;
/** @ts-ignore @type {typeof __VLS_components.vExpansionPanels | typeof __VLS_components.VExpansionPanels | typeof __VLS_components.vExpansionPanels | typeof __VLS_components.VExpansionPanels} */
vExpansionPanels;
// @ts-ignore
const __VLS_535 = __VLS_asFunctionalComponent1(__VLS_534, new __VLS_534({
    multiple: true,
    variant: "accordion",
}));
const __VLS_536 = __VLS_535({
    multiple: true,
    variant: "accordion",
}, ...__VLS_functionalComponentArgsRest(__VLS_535));
const { default: __VLS_539 } = __VLS_537.slots;
for (const [group] of __VLS_vFor((__VLS_ctx.groupedFormDetails))) {
    let __VLS_540;
    /** @ts-ignore @type {typeof __VLS_components.vExpansionPanel | typeof __VLS_components.VExpansionPanel | typeof __VLS_components.vExpansionPanel | typeof __VLS_components.VExpansionPanel} */
    vExpansionPanel;
    // @ts-ignore
    const __VLS_541 = __VLS_asFunctionalComponent1(__VLS_540, new __VLS_540({
        key: (group.group),
        title: (group.group),
    }));
    const __VLS_542 = __VLS_541({
        key: (group.group),
        title: (group.group),
    }, ...__VLS_functionalComponentArgsRest(__VLS_541));
    const { default: __VLS_545 } = __VLS_543.slots;
    let __VLS_546;
    /** @ts-ignore @type {typeof __VLS_components.vExpansionPanelText | typeof __VLS_components.VExpansionPanelText | typeof __VLS_components.vExpansionPanelText | typeof __VLS_components.VExpansionPanelText} */
    vExpansionPanelText;
    // @ts-ignore
    const __VLS_547 = __VLS_asFunctionalComponent1(__VLS_546, new __VLS_546({}));
    const __VLS_548 = __VLS_547({}, ...__VLS_functionalComponentArgsRest(__VLS_547));
    const { default: __VLS_551 } = __VLS_549.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "detail-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
    for (const [detail] of __VLS_vFor((group.items))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (`${group.group}-${detail.parametro_key || detail.parametro}`),
            ...{ class: "detail-card" },
        });
        /** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "detail-card__title" },
        });
        /** @type {__VLS_StyleScopedClasses['detail-card__title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (detail.parametro);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (detail.unidad || "Resultado");
        if (detail.inputType === 'select') {
            let __VLS_552;
            /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
            vSelect;
            // @ts-ignore
            const __VLS_553 = __VLS_asFunctionalComponent1(__VLS_552, new __VLS_552({
                modelValue: (detail.resultado_texto),
                items: (detail.options || __VLS_ctx.humidityValueOptions),
                label: "Resultado",
                variant: "outlined",
                density: "compact",
            }));
            const __VLS_554 = __VLS_553({
                modelValue: (detail.resultado_texto),
                items: (detail.options || __VLS_ctx.humidityValueOptions),
                label: "Resultado",
                variant: "outlined",
                density: "compact",
            }, ...__VLS_functionalComponentArgsRest(__VLS_553));
        }
        else if (detail.inputType === 'text') {
            let __VLS_557;
            /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
            vTextField;
            // @ts-ignore
            const __VLS_558 = __VLS_asFunctionalComponent1(__VLS_557, new __VLS_557({
                modelValue: (detail.resultado_texto),
                label: "Resultado",
                variant: "outlined",
                density: "compact",
            }));
            const __VLS_559 = __VLS_558({
                modelValue: (detail.resultado_texto),
                label: "Resultado",
                variant: "outlined",
                density: "compact",
            }, ...__VLS_functionalComponentArgsRest(__VLS_558));
        }
        else {
            let __VLS_562;
            /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
            vTextField;
            // @ts-ignore
            const __VLS_563 = __VLS_asFunctionalComponent1(__VLS_562, new __VLS_562({
                modelValue: (detail.resultado_numerico),
                modelModifiers: { number: true, },
                type: "number",
                label: "Resultado",
                variant: "outlined",
                density: "compact",
            }));
            const __VLS_564 = __VLS_563({
                modelValue: (detail.resultado_numerico),
                modelModifiers: { number: true, },
                type: "number",
                label: "Resultado",
                variant: "outlined",
                density: "compact",
            }, ...__VLS_functionalComponentArgsRest(__VLS_563));
        }
        // @ts-ignore
        [groupedFormDetails, humidityValueOptions,];
    }
    // @ts-ignore
    [];
    var __VLS_549;
    // @ts-ignore
    [];
    var __VLS_543;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_537;
// @ts-ignore
[];
var __VLS_523;
// @ts-ignore
[];
var __VLS_330;
// @ts-ignore
[];
var __VLS_324;
let __VLS_567;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_568 = __VLS_asFunctionalComponent1(__VLS_567, new __VLS_567({}));
const __VLS_569 = __VLS_568({}, ...__VLS_functionalComponentArgsRest(__VLS_568));
let __VLS_572;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_573 = __VLS_asFunctionalComponent1(__VLS_572, new __VLS_572({
    ...{ class: "pa-4" },
}));
const __VLS_574 = __VLS_573({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_573));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_577 } = __VLS_575.slots;
let __VLS_578;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_579 = __VLS_asFunctionalComponent1(__VLS_578, new __VLS_578({}));
const __VLS_580 = __VLS_579({}, ...__VLS_functionalComponentArgsRest(__VLS_579));
let __VLS_583;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_584 = __VLS_asFunctionalComponent1(__VLS_583, new __VLS_583({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_585 = __VLS_584({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_584));
let __VLS_588;
const __VLS_589 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog,];
        } });
const { default: __VLS_590 } = __VLS_586.slots;
// @ts-ignore
[];
var __VLS_586;
var __VLS_587;
if (__VLS_ctx.canPersistForm) {
    let __VLS_591;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_592 = __VLS_asFunctionalComponent1(__VLS_591, new __VLS_591({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_593 = __VLS_592({
        ...{ 'onClick': {} },
        color: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_592));
    let __VLS_596;
    const __VLS_597 = ({ click: {} },
        { onClick: (__VLS_ctx.save) });
    const { default: __VLS_598 } = __VLS_594.slots;
    // @ts-ignore
    [canPersistForm, saving, save,];
    var __VLS_594;
    var __VLS_595;
}
// @ts-ignore
[];
var __VLS_575;
// @ts-ignore
[];
var __VLS_307;
// @ts-ignore
[];
var __VLS_301;
let __VLS_599;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_600 = __VLS_asFunctionalComponent1(__VLS_599, new __VLS_599({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 420),
}));
const __VLS_601 = __VLS_600({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 420),
}, ...__VLS_functionalComponentArgsRest(__VLS_600));
const { default: __VLS_604 } = __VLS_602.slots;
let __VLS_605;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_606 = __VLS_asFunctionalComponent1(__VLS_605, new __VLS_605({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_607 = __VLS_606({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_606));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_610 } = __VLS_608.slots;
let __VLS_611;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_612 = __VLS_asFunctionalComponent1(__VLS_611, new __VLS_611({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_613 = __VLS_612({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_612));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_616 } = __VLS_614.slots;
// @ts-ignore
[deleteDialog, isDeleteDialogFullscreen, isDeleteDialogFullscreen,];
var __VLS_614;
let __VLS_617;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_618 = __VLS_asFunctionalComponent1(__VLS_617, new __VLS_617({}));
const __VLS_619 = __VLS_618({}, ...__VLS_functionalComponentArgsRest(__VLS_618));
const { default: __VLS_622 } = __VLS_620.slots;
// @ts-ignore
[];
var __VLS_620;
let __VLS_623;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_624 = __VLS_asFunctionalComponent1(__VLS_623, new __VLS_623({}));
const __VLS_625 = __VLS_624({}, ...__VLS_functionalComponentArgsRest(__VLS_624));
const { default: __VLS_628 } = __VLS_626.slots;
let __VLS_629;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_630 = __VLS_asFunctionalComponent1(__VLS_629, new __VLS_629({}));
const __VLS_631 = __VLS_630({}, ...__VLS_functionalComponentArgsRest(__VLS_630));
let __VLS_634;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_635 = __VLS_asFunctionalComponent1(__VLS_634, new __VLS_634({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_636 = __VLS_635({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_635));
let __VLS_639;
const __VLS_640 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.deleteDialog = false;
            // @ts-ignore
            [deleteDialog,];
        } });
const { default: __VLS_641 } = __VLS_637.slots;
// @ts-ignore
[];
var __VLS_637;
var __VLS_638;
let __VLS_642;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_643 = __VLS_asFunctionalComponent1(__VLS_642, new __VLS_642({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}));
const __VLS_644 = __VLS_643({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_643));
let __VLS_647;
const __VLS_648 = ({ click: {} },
    { onClick: (__VLS_ctx.confirmDelete) });
const { default: __VLS_649 } = __VLS_645.slots;
// @ts-ignore
[saving, confirmDelete,];
var __VLS_645;
var __VLS_646;
// @ts-ignore
[];
var __VLS_626;
// @ts-ignore
[];
var __VLS_608;
// @ts-ignore
[];
var __VLS_602;
let __VLS_650;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_651 = __VLS_asFunctionalComponent1(__VLS_650, new __VLS_650({
    modelValue: (__VLS_ctx.groupDetailDialog),
    fullscreen: (__VLS_ctx.isGroupDialogFullscreen),
    maxWidth: (__VLS_ctx.isGroupDialogFullscreen ? undefined : 1320),
}));
const __VLS_652 = __VLS_651({
    modelValue: (__VLS_ctx.groupDetailDialog),
    fullscreen: (__VLS_ctx.isGroupDialogFullscreen),
    maxWidth: (__VLS_ctx.isGroupDialogFullscreen ? undefined : 1320),
}, ...__VLS_functionalComponentArgsRest(__VLS_651));
const { default: __VLS_655 } = __VLS_653.slots;
let __VLS_656;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_657 = __VLS_asFunctionalComponent1(__VLS_656, new __VLS_656({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_658 = __VLS_657({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_657));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_661 } = __VLS_659.slots;
let __VLS_662;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_663 = __VLS_asFunctionalComponent1(__VLS_662, new __VLS_662({
    ...{ class: "responsive-header page-wrap" },
}));
const __VLS_664 = __VLS_663({
    ...{ class: "responsive-header page-wrap" },
}, ...__VLS_functionalComponentArgsRest(__VLS_663));
/** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
const { default: __VLS_667 } = __VLS_665.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
(__VLS_ctx.selectedGroup?.lubricante || "Lubricante");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-2 text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
(__VLS_ctx.selectedGroup?.marca_lubricante || "Sin marca del lubricante");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-caption text-medium-emphasis mt-1" },
});
/** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
(__VLS_ctx.selectedGroup?.equipo_label || "Sin equipo");
(__VLS_ctx.selectedGroup?.equipo_modelo || "Sin modelo");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex flex-wrap" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
let __VLS_668;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_669 = __VLS_asFunctionalComponent1(__VLS_668, new __VLS_668({
    color: "primary",
    variant: "tonal",
    label: true,
}));
const __VLS_670 = __VLS_669({
    color: "primary",
    variant: "tonal",
    label: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_669));
const { default: __VLS_673 } = __VLS_671.slots;
(__VLS_ctx.selectedGroup?.total_analisis ?? 0);
// @ts-ignore
[groupDetailDialog, isGroupDialogFullscreen, isGroupDialogFullscreen, selectedGroup, selectedGroup, selectedGroup, selectedGroup, selectedGroup,];
var __VLS_671;
let __VLS_674;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_675 = __VLS_asFunctionalComponent1(__VLS_674, new __VLS_674({
    color: "secondary",
    variant: "tonal",
    label: true,
}));
const __VLS_676 = __VLS_675({
    color: "secondary",
    variant: "tonal",
    label: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_675));
const { default: __VLS_679 } = __VLS_677.slots;
(__VLS_ctx.selectedGroup?.ultimo_informe || "Sin fecha");
// @ts-ignore
[selectedGroup,];
var __VLS_677;
// @ts-ignore
[];
var __VLS_665;
let __VLS_680;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_681 = __VLS_asFunctionalComponent1(__VLS_680, new __VLS_680({}));
const __VLS_682 = __VLS_681({}, ...__VLS_functionalComponentArgsRest(__VLS_681));
let __VLS_685;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_686 = __VLS_asFunctionalComponent1(__VLS_685, new __VLS_685({
    ...{ class: "pt-4" },
}));
const __VLS_687 = __VLS_686({
    ...{ class: "pt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_686));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
const { default: __VLS_690 } = __VLS_688.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "responsive-header page-wrap mb-4" },
});
/** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-2 text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
let __VLS_691;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_692 = __VLS_asFunctionalComponent1(__VLS_691, new __VLS_691({
    ...{ 'onClick': {} },
    color: "primary",
    variant: "tonal",
    prependIcon: "mdi-chart-line",
    disabled: (!__VLS_ctx.selectedGroup),
}));
const __VLS_693 = __VLS_692({
    ...{ 'onClick': {} },
    color: "primary",
    variant: "tonal",
    prependIcon: "mdi-chart-line",
    disabled: (!__VLS_ctx.selectedGroup),
}, ...__VLS_functionalComponentArgsRest(__VLS_692));
let __VLS_696;
const __VLS_697 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.selectedGroup && __VLS_ctx.viewDashboardGroup(__VLS_ctx.selectedGroup);
            // @ts-ignore
            [viewDashboardGroup, selectedGroup, selectedGroup, selectedGroup,];
        } });
const { default: __VLS_698 } = __VLS_694.slots;
// @ts-ignore
[];
var __VLS_694;
var __VLS_695;
let __VLS_699;
/** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
vTable;
// @ts-ignore
const __VLS_700 = __VLS_asFunctionalComponent1(__VLS_699, new __VLS_699({
    density: "compact",
    ...{ class: "enterprise-table" },
}));
const __VLS_701 = __VLS_700({
    density: "compact",
    ...{ class: "enterprise-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_700));
/** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
const { default: __VLS_704 } = __VLS_702.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "text-right" },
});
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [item] of __VLS_vFor((__VLS_ctx.selectedGroupItems))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (item.id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.codigo || "Sin codigo");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.sample_info?.numero_muestra || "Sin muestra");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.compartimento_principal || "Sin compartimento");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    let __VLS_705;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_706 = __VLS_asFunctionalComponent1(__VLS_705, new __VLS_705({
        size: "x-small",
        color: (__VLS_ctx.conditionColor(item.sample_info?.condicion || item.estado_diagnostico)),
        variant: "tonal",
    }));
    const __VLS_707 = __VLS_706({
        size: "x-small",
        color: (__VLS_ctx.conditionColor(item.sample_info?.condicion || item.estado_diagnostico)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_706));
    const { default: __VLS_710 } = __VLS_708.slots;
    (item.sample_info?.condicion || item.estado_diagnostico || "N/D");
    // @ts-ignore
    [conditionColor, selectedGroupItems,];
    var __VLS_708;
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (__VLS_ctx.resolveAnalysisReportDate(item) || "Sin fecha");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.sample_info?.horas_equipo ?? "N/A");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.sample_info?.horas_lubricante ?? "N/A");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex justify-end flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    if (__VLS_ctx.canEdit) {
        let __VLS_711;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_712 = __VLS_asFunctionalComponent1(__VLS_711, new __VLS_711({
            ...{ 'onClick': {} },
            icon: "mdi-pencil",
            variant: "text",
        }));
        const __VLS_713 = __VLS_712({
            ...{ 'onClick': {} },
            icon: "mdi-pencil",
            variant: "text",
        }, ...__VLS_functionalComponentArgsRest(__VLS_712));
        let __VLS_716;
        const __VLS_717 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canEdit))
                        return;
                    __VLS_ctx.openEditFromGroup(item);
                    // @ts-ignore
                    [resolveAnalysisReportDate, canEdit, openEditFromGroup,];
                } });
        var __VLS_714;
        var __VLS_715;
    }
    if (__VLS_ctx.canDelete) {
        let __VLS_718;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_719 = __VLS_asFunctionalComponent1(__VLS_718, new __VLS_718({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
        }));
        const __VLS_720 = __VLS_719({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_719));
        let __VLS_723;
        const __VLS_724 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.canDelete))
                        return;
                    __VLS_ctx.openDeleteFromGroup(item);
                    // @ts-ignore
                    [canDelete, openDeleteFromGroup,];
                } });
        var __VLS_721;
        var __VLS_722;
    }
    // @ts-ignore
    [];
}
if (!__VLS_ctx.selectedGroupItems.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        colspan: "8",
        ...{ class: "text-center text-medium-emphasis py-6" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
}
// @ts-ignore
[selectedGroupItems,];
var __VLS_702;
// @ts-ignore
[];
var __VLS_688;
let __VLS_725;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_726 = __VLS_asFunctionalComponent1(__VLS_725, new __VLS_725({
    ...{ class: "pa-4" },
}));
const __VLS_727 = __VLS_726({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_726));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_730 } = __VLS_728.slots;
let __VLS_731;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_732 = __VLS_asFunctionalComponent1(__VLS_731, new __VLS_731({}));
const __VLS_733 = __VLS_732({}, ...__VLS_functionalComponentArgsRest(__VLS_732));
let __VLS_736;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_737 = __VLS_asFunctionalComponent1(__VLS_736, new __VLS_736({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_738 = __VLS_737({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_737));
let __VLS_741;
const __VLS_742 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.groupDetailDialog = false;
            // @ts-ignore
            [groupDetailDialog,];
        } });
const { default: __VLS_743 } = __VLS_739.slots;
// @ts-ignore
[];
var __VLS_739;
var __VLS_740;
// @ts-ignore
[];
var __VLS_728;
// @ts-ignore
[];
var __VLS_659;
// @ts-ignore
[];
var __VLS_653;
let __VLS_744;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_745 = __VLS_asFunctionalComponent1(__VLS_744, new __VLS_744({
    modelValue: (__VLS_ctx.purgeDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 560),
}));
const __VLS_746 = __VLS_745({
    modelValue: (__VLS_ctx.purgeDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 560),
}, ...__VLS_functionalComponentArgsRest(__VLS_745));
const { default: __VLS_749 } = __VLS_747.slots;
let __VLS_750;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_751 = __VLS_asFunctionalComponent1(__VLS_750, new __VLS_750({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}));
const __VLS_752 = __VLS_751({
    rounded: "xl",
    ...{ class: "enterprise-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_751));
/** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
const { default: __VLS_755 } = __VLS_753.slots;
let __VLS_756;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_757 = __VLS_asFunctionalComponent1(__VLS_756, new __VLS_756({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_758 = __VLS_757({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_757));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_761 } = __VLS_759.slots;
// @ts-ignore
[isDeleteDialogFullscreen, isDeleteDialogFullscreen, purgeDialog,];
var __VLS_759;
let __VLS_762;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_763 = __VLS_asFunctionalComponent1(__VLS_762, new __VLS_762({
    ...{ class: "pt-4" },
}));
const __VLS_764 = __VLS_763({
    ...{ class: "pt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_763));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
const { default: __VLS_767 } = __VLS_765.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-2 mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
let __VLS_768;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_769 = __VLS_asFunctionalComponent1(__VLS_768, new __VLS_768({
    modelValue: (__VLS_ctx.purgeConfirmation),
    label: "Confirmación",
    placeholder: "ELIMINAR TODO",
    variant: "outlined",
    autofocus: true,
}));
const __VLS_770 = __VLS_769({
    modelValue: (__VLS_ctx.purgeConfirmation),
    label: "Confirmación",
    placeholder: "ELIMINAR TODO",
    variant: "outlined",
    autofocus: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_769));
// @ts-ignore
[purgeConfirmation,];
var __VLS_765;
let __VLS_773;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_774 = __VLS_asFunctionalComponent1(__VLS_773, new __VLS_773({
    ...{ class: "pa-4" },
}));
const __VLS_775 = __VLS_774({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_774));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_778 } = __VLS_776.slots;
let __VLS_779;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_780 = __VLS_asFunctionalComponent1(__VLS_779, new __VLS_779({}));
const __VLS_781 = __VLS_780({}, ...__VLS_functionalComponentArgsRest(__VLS_780));
let __VLS_784;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_785 = __VLS_asFunctionalComponent1(__VLS_784, new __VLS_784({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_786 = __VLS_785({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_785));
let __VLS_789;
const __VLS_790 = ({ click: {} },
    { onClick: (__VLS_ctx.closePurgeDialog) });
const { default: __VLS_791 } = __VLS_787.slots;
// @ts-ignore
[closePurgeDialog,];
var __VLS_787;
var __VLS_788;
let __VLS_792;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_793 = __VLS_asFunctionalComponent1(__VLS_792, new __VLS_792({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.purging),
    disabled: (!__VLS_ctx.canConfirmPurge),
}));
const __VLS_794 = __VLS_793({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.purging),
    disabled: (!__VLS_ctx.canConfirmPurge),
}, ...__VLS_functionalComponentArgsRest(__VLS_793));
let __VLS_797;
const __VLS_798 = ({ click: {} },
    { onClick: (__VLS_ctx.confirmPurge) });
const { default: __VLS_799 } = __VLS_795.slots;
// @ts-ignore
[purging, canConfirmPurge, confirmPurge,];
var __VLS_795;
var __VLS_796;
// @ts-ignore
[];
var __VLS_776;
// @ts-ignore
[];
var __VLS_753;
// @ts-ignore
[];
var __VLS_747;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

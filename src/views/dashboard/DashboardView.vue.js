/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { hasReportAccess } from "@/app/config/report-access";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { listAllPages } from "@/app/utils/list-all-pages";
import { buildExecutiveDashboardReport, downloadReportExcel, downloadReportPdf, } from "@/app/utils/maintenance-intelligence-reports";
const auth = useAuthStore();
const menu = useMenuStore();
const router = useRouter();
const loading = ref(false);
const error = ref(null);
const lastUpdatedAt = ref(null);
const exportState = ref({});
const canAccessDashboardReports = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "dashboard_ejecutivo"));
const users = ref([]);
const roles = ref([]);
const equipos = ref([]);
const planes = ref([]);
const bodegas = ref([]);
const alertas = ref([]);
const workOrders = ref([]);
const productos = ref([]);
const stockRows = ref([]);
const intelligenceSummary = ref({});
const weeklySchedules = ref([]);
const dailyReports = ref([]);
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
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
const yearOptions = Array.from({ length: 101 }, (_, index) => 2000 + index)
    .reverse()
    .map((value) => ({ value, title: String(value) }));
function unwrap(payload, fallback) {
    return (payload?.data ?? payload ?? fallback);
}
function normalizeWorkflowStatus(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (["PLANNED", "PLANIFICADA", "PLANIFICADO", "CREADA", "CREADO"].includes(raw))
        return "PLANNED";
    if (["IN_PROGRESS", "IN PROGRESS", "EN PROCESO", "EN_PROCESO", "PROCESSING"].includes(raw))
        return "IN_PROGRESS";
    if (["CLOSED", "CERRADA", "CERRADO", "DONE", "COMPLETED"].includes(raw))
        return "CLOSED";
    return raw || "PLANNED";
}
function workflowLabel(value) {
    const normalized = normalizeWorkflowStatus(value);
    if (normalized === "PLANNED")
        return "Planificada";
    if (normalized === "IN_PROGRESS")
        return "En proceso";
    if (normalized === "CLOSED")
        return "Cerrada";
    return normalized;
}
function normalizeDayLabel(value) {
    return String(value || "Sin dia")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function normalizeProcessType(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}
function normalizeAlertSeverity(value) {
    const raw = String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
    if (!raw)
        return "INFO";
    if (["CRITICAL", "CRITICA", "CRITICO", "ALTA", "HIGH"].includes(raw))
        return "CRITICA";
    if (["WARNING", "WARN", "MEDIA", "MEDIO", "ALERTA"].includes(raw))
        return "ADVERTENCIA";
    return "INFO";
}
function formatCompactNumber(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric))
        return "0";
    return new Intl.NumberFormat("es-EC", {
        notation: numeric >= 1000 ? "compact" : "standard",
        maximumFractionDigits: numeric >= 1000 ? 1 : 0,
    }).format(numeric);
}
function buildMonthRange(year, month) {
    return {
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 0, 23, 59, 59, 999),
    };
}
function parseDateValue(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
    const raw = String(value).trim();
    if (!raw)
        return null;
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function parseDurationHours(startValue, endValue) {
    const startMinutes = parseTimeToMinutes(startValue);
    const endMinutes = parseTimeToMinutes(endValue);
    if (startMinutes == null || endMinutes == null)
        return 0;
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes)
        return 0;
    return (endMinutes - startMinutes) / 60;
}
function parseTimeToMinutes(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return null;
    const rawSegments = raw.split("T");
    const timeToken = raw.includes("T") ? rawSegments[rawSegments.length - 1] || "" : raw;
    const normalized = timeToken.split(".")[0]?.trim() || "";
    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
    if (!match)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes))
        return null;
    return hours * 60 + minutes;
}
function formatTimeLabel(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    const rawSegments = raw.split("T");
    const normalized = raw.includes("T") ? rawSegments[rawSegments.length - 1] || "" : raw;
    return normalized.split(".")[0]?.slice(0, 5) || normalized;
}
const selectedPeriodRange = computed(() => buildMonthRange(selectedYear.value, selectedMonth.value));
const selectedPeriodLabel = computed(() => new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(new Date(selectedYear.value, selectedMonth.value - 1, 1)));
function isInSelectedPeriod(value) {
    const parsed = parseDateValue(value);
    if (!parsed)
        return false;
    return parsed >= selectedPeriodRange.value.start && parsed <= selectedPeriodRange.value.end;
}
function overlapsSelectedPeriod(fromValue, toValue) {
    const from = parseDateValue(fromValue);
    const to = parseDateValue(toValue || fromValue);
    if (!from && !to)
        return false;
    const start = from ?? to;
    const end = to ?? from;
    if (!start || !end)
        return false;
    return start <= selectedPeriodRange.value.end && end >= selectedPeriodRange.value.start;
}
function resolveWorkOrderDate(row) {
    return row?.scheduled_start || row?.created_at || row?.updated_at || row?.closed_at || null;
}
async function listAll(endpoint, params = {}) {
    return listAllPages(endpoint, params);
}
function exportKey(format) {
    return `dashboard:${format}`;
}
function isExporting(format) {
    return Boolean(exportState.value[exportKey(format)]);
}
async function loadDashboard() {
    if (!canAccessDashboardReports.value)
        return;
    loading.value = true;
    error.value = null;
    try {
        const [usersRows, rolesRows, equiposRows, planesRows, bodegasRows, alertasRows, workOrdersRows, productosRows, stockRowsResult, intelligenceSummaryRes, weeklySchedulesRes, dailyReportsRes,] = await Promise.all([
            listAll("/kpi_security/users", { includeDeleted: false }),
            listAll("/kpi_security/roles", { includeDeleted: false }),
            listAll("/kpi_maintenance/equipos"),
            listAll("/kpi_maintenance/planes"),
            listAll("/kpi_inventory/bodegas"),
            listAll("/kpi_maintenance/alertas"),
            listAll("/kpi_maintenance/work-orders"),
            listAll("/kpi_inventory/productos"),
            listAll("/kpi_inventory/stock-bodega"),
            api.get("/kpi_maintenance/inteligencia/summary", {
                params: { year: selectedYear.value, month: selectedMonth.value },
            }),
            api.get("/kpi_maintenance/inteligencia/cronogramas-semanales"),
            api.get("/kpi_maintenance/inteligencia/reportes-diarios"),
        ]);
        users.value = usersRows;
        roles.value = rolesRows;
        equipos.value = equiposRows;
        planes.value = planesRows;
        bodegas.value = bodegasRows;
        alertas.value = alertasRows;
        workOrders.value = workOrdersRows;
        productos.value = productosRows;
        stockRows.value = stockRowsResult;
        intelligenceSummary.value = unwrap(intelligenceSummaryRes.data, {});
        weeklySchedules.value = unwrap(weeklySchedulesRes.data, []);
        dailyReports.value = unwrap(dailyReportsRes.data, []);
        lastUpdatedAt.value = new Date();
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudo cargar el dashboard con las APIs disponibles.";
    }
    finally {
        loading.value = false;
    }
}
const openAlerts = computed(() => alertas.value.filter((item) => {
    const status = String(item?.estado || "").toUpperCase();
    return !["CERRADA", "RESUELTA", "CLOSED"].includes(status);
}).filter((item) => isInSelectedPeriod(item?.fecha_generada || item?.created_at || item?.updated_at)));
const openAlertsCount = computed(() => openAlerts.value.length);
const filteredWorkOrders = computed(() => workOrders.value.filter((item) => isInSelectedPeriod(resolveWorkOrderDate(item))));
const filteredDailyReports = computed(() => dailyReports.value.filter((item) => isInSelectedPeriod(item?.fecha_reporte || item?.created_at)));
const filteredWeeklySchedules = computed(() => weeklySchedules.value.filter((item) => overlapsSelectedPeriod(item?.fecha_inicio || item?.created_at, item?.fecha_fin || item?.fecha_inicio || item?.created_at)));
const activeEquipmentCount = computed(() => {
    const keys = new Set();
    for (const report of filteredDailyReports.value) {
        for (const unit of report?.unidades ?? []) {
            const key = String(unit?.equipo_id || unit?.equipo_codigo || "").trim();
            if (key)
                keys.add(key);
        }
    }
    for (const schedule of filteredWeeklySchedules.value) {
        for (const detail of schedule?.detalles ?? []) {
            const key = String(detail?.equipo_id || detail?.equipo_codigo || "").trim();
            if (key)
                keys.add(key);
        }
    }
    return keys.size;
});
const workOrdersByStatus = computed(() => {
    const summary = {
        PLANNED: 0,
        IN_PROGRESS: 0,
        CLOSED: 0,
    };
    for (const item of filteredWorkOrders.value) {
        const key = normalizeWorkflowStatus(item?.status_workflow);
        if (key in summary)
            summary[key] += 1;
    }
    return summary;
});
const kpiCards = computed(() => [
    {
        key: "equipos",
        label: "Equipos",
        value: activeEquipmentCount.value,
        helper: `Con actividad en ${selectedPeriodLabel.value}`,
        icon: "mdi-cog-outline",
        accent: "linear-gradient(135deg, rgba(47,108,171,0.22), rgba(122,184,255,0.08))",
    },
    {
        key: "ots",
        label: "Órdenes de trabajo",
        value: filteredWorkOrders.value.length,
        helper: `${workOrdersByStatus.value.IN_PROGRESS} en proceso`,
        icon: "mdi-clipboard-text-outline",
        accent: "linear-gradient(135deg, rgba(16,143,114,0.22), rgba(109,227,191,0.08))",
    },
    {
        key: "inventario",
        label: "Productos inventario",
        value: productos.value.length,
        helper: `${lowStockItems.value.length} bajo stock`,
        icon: "mdi-package-variant-closed",
        accent: "linear-gradient(135deg, rgba(225,122,0,0.2), rgba(255,202,106,0.08))",
    },
    {
        key: "seguridad",
        label: "Usuarios activos",
        value: users.value.filter((item) => String(item?.status || "ACTIVE").toUpperCase() === "ACTIVE").length,
        helper: `${roles.value.length} roles configurados`,
        icon: "mdi-account-group-outline",
        accent: "linear-gradient(135deg, rgba(162,69,216,0.2), rgba(221,156,255,0.08))",
    },
]);
const workOrderStatusCards = computed(() => [
    { key: "PLANNED", label: "Planificadas", value: workOrdersByStatus.value.PLANNED },
    { key: "IN_PROGRESS", label: "En proceso", value: workOrdersByStatus.value.IN_PROGRESS },
    { key: "CLOSED", label: "Cerradas", value: workOrdersByStatus.value.CLOSED },
]);
const lowStockItems = computed(() => stockRows.value.filter((item) => {
    const stock = Number(item?.stock_actual || 0);
    const min = Number(item?.stock_min_bodega || 0);
    return min > 0 && stock <= min;
}));
const productNameMap = computed(() => productos.value.reduce((acc, item) => {
    acc[String(item.id)] = item?.nombre || item?.codigo || item?.id;
    return acc;
}, {}));
const warehouseNameMap = computed(() => bodegas.value.reduce((acc, item) => {
    const id = String(item?.id || "").trim();
    if (!id)
        return acc;
    const code = String(item?.codigo || "").trim();
    const name = String(item?.nombre || "").trim();
    acc[id] = [code, name].filter(Boolean).join(" - ") || id;
    return acc;
}, {}));
function resolveWarehouseLabel(item) {
    const warehouseId = String(item?.bodega_id || "").trim();
    const warehouseCode = String(item?.bodega_codigo || "").trim();
    const warehouseName = String(item?.bodega_nombre || "").trim();
    return (warehouseNameMap.value[warehouseId] ||
        [warehouseCode, warehouseName].filter(Boolean).join(" - ") ||
        warehouseCode ||
        warehouseName ||
        warehouseId ||
        "Sin bodega");
}
function resolveWarehouseKey(item) {
    return String(item?.bodega_id || "").trim() || resolveWarehouseLabel(item);
}
const workOrderStatusChartItems = computed(() => [
    {
        key: "planned",
        label: "Planificadas",
        value: workOrdersByStatus.value.PLANNED,
        valueLabel: formatCompactNumber(workOrdersByStatus.value.PLANNED),
        helper: "Pendientes de ejecución",
        color: "linear-gradient(90deg, #2f6cab 0%, #78b7ff 100%)",
    },
    {
        key: "in_progress",
        label: "En proceso",
        value: workOrdersByStatus.value.IN_PROGRESS,
        valueLabel: formatCompactNumber(workOrdersByStatus.value.IN_PROGRESS),
        helper: "OT trabajando en campo",
        color: "linear-gradient(90deg, #e17a00 0%, #ffce73 100%)",
    },
    {
        key: "closed",
        label: "Cerradas",
        value: workOrdersByStatus.value.CLOSED,
        valueLabel: formatCompactNumber(workOrdersByStatus.value.CLOSED),
        helper: "Órdenes culminadas",
        color: "linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%)",
    },
]);
const alertSeverityChartItems = computed(() => {
    const summary = {
        CRITICA: 0,
        ADVERTENCIA: 0,
        INFO: 0,
    };
    for (const item of openAlerts.value) {
        const severity = normalizeAlertSeverity(item?.nivel || item?.severidad || item?.categoria);
        summary[severity] += 1;
    }
    return [
        {
            key: "critical",
            label: "Críticas",
            value: summary.CRITICA,
            valueLabel: formatCompactNumber(summary.CRITICA),
            helper: "Atención inmediata",
            color: "linear-gradient(90deg, #d53d57 0%, #ff96a6 100%)",
        },
        {
            key: "warning",
            label: "Advertencia",
            value: summary.ADVERTENCIA,
            valueLabel: formatCompactNumber(summary.ADVERTENCIA),
            helper: "Seguimiento prioritario",
            color: "linear-gradient(90deg, #e17a00 0%, #ffce73 100%)",
        },
        {
            key: "info",
            label: "Informativas",
            value: summary.INFO,
            valueLabel: formatCompactNumber(summary.INFO),
            helper: "Contexto operativo",
            color: "linear-gradient(90deg, #3f62d8 0%, #9eaefc 100%)",
        },
    ];
});
const operationCadenceChartItems = computed(() => operationScheduleDays.value.slice(0, 7).map((item) => ({
    key: item.date,
    label: item.title,
    value: Number(item.totalHours || 0),
    valueLabel: `${Number(item.totalHours || 0).toFixed(1)} h`,
    helper: `${item.count} actividades`,
    color: "linear-gradient(90deg, #0f8f72 0%, #7be8c4 100%)",
})));
const lowStockByWarehouse = computed(() => {
    const grouped = new Map();
    for (const item of lowStockItems.value) {
        const key = resolveWarehouseKey(item);
        const label = resolveWarehouseLabel(item);
        const current = grouped.get(key) ?? { key, label, value: 0 };
        current.value += 1;
        grouped.set(key, current);
    }
    return [...grouped.values()]
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
        .slice(0, 6)
        .map((item) => ({
        ...item,
        valueLabel: `${item.value} materiales`,
        helper: "Bodega con stock comprometido",
        color: "linear-gradient(90deg, #e24f5f 0%, #ff9aa5 100%)",
    }));
});
const recentAlertsTableRows = computed(() => [...openAlerts.value]
    .sort((a, b) => new Date(b?.fecha_generada || 0).getTime() - new Date(a?.fecha_generada || 0).getTime())
    .slice(0, 8)
    .map((item) => ({
    id: item.id,
    tipo: item?.tipo_alerta || "Alerta",
    equipo: item?.equipo_nombre || item?.equipo_id || "Sin equipo",
    estado: item?.estado || "Sin estado",
    detalle: item?.detalle || "Sin detalle",
})));
const recentWorkOrdersTableRows = computed(() => [...filteredWorkOrders.value]
    .sort((a, b) => String(b?.code || "").localeCompare(String(a?.code || "")))
    .slice(0, 8)
    .map((item) => ({
    id: item.id,
    codigo: item?.code || "Sin código",
    titulo: item?.title || item?.titulo || "Sin título",
    equipo: item?.equipment_label || item?.equipo_nombre || item?.equipment_id || "Sin equipo",
    estado: workflowLabel(item?.status_workflow),
})));
const criticalInventoryRows = computed(() => [...lowStockItems.value]
    .map((item) => {
    const stock = Number(item?.stock_actual || 0);
    const min = Number(item?.stock_min_bodega || 0);
    return {
        id: item.id,
        producto: productNameMap.value[String(item?.producto_id)] || String(item?.producto_id || "Producto"),
        bodega: resolveWarehouseLabel(item),
        stock,
        min,
        deficit: Math.max(0, min - stock),
    };
})
    .sort((a, b) => b.deficit - a.deficit || a.producto.localeCompare(b.producto))
    .slice(0, 8));
const processIndicatorCards = computed(() => [
    {
        key: "programaciones_vencidas",
        label: "Programaciones vencidas",
        value: intelligenceSummary.value?.kpis?.programaciones_vencidas ?? 0,
        helper: "Control preventivo fuera de ventana",
    },
    {
        key: "work_orders_pendientes",
        label: "OT pendientes",
        value: intelligenceSummary.value?.kpis?.work_orders_pendientes ?? 0,
        helper: "Ordenes pendientes o en proceso",
    },
    {
        key: "eventos_proceso",
        label: "Eventos KPI",
        value: intelligenceSummary.value?.kpis?.eventos_proceso ?? 0,
        helper: "Notificaciones por proceso principal",
    },
    {
        key: "componentes_monitoreados",
        label: "Componentes monitoreados",
        value: intelligenceSummary.value?.kpis?.componentes_monitoreados ?? 0,
        helper: "Indicador dinamico desde reporte diario",
    },
]);
const latestDailyReport = computed(() => filteredDailyReports.value[0] ?? null);
const latestDailyUnits = computed(() => (latestDailyReport.value?.unidades ?? []).slice(0, 4));
const latestDailyFuel = computed(() => (latestDailyReport.value?.combustibles ?? []).slice(0, 3));
const latestDailyComponents = computed(() => (latestDailyReport.value?.componentes ?? []).slice(0, 3));
const latestWeeklySchedule = computed(() => filteredWeeklySchedules.value[0] ?? null);
const latestWeeklyActivities = computed(() => [...(latestWeeklySchedule.value?.detalles ?? [])]
    .sort((a, b) => (parseDateValue(a?.fecha_actividad)?.getTime() ?? 0) -
    (parseDateValue(b?.fecha_actividad)?.getTime() ?? 0) ||
    String(a?.hora_inicio || "").localeCompare(String(b?.hora_inicio || "")))
    .map((item) => ({
    ...item,
    hora_inicio: formatTimeLabel(item?.hora_inicio),
    hora_fin: formatTimeLabel(item?.hora_fin),
    fecha_label: item?.fecha_actividad
        ? new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parseDateValue(item.fecha_actividad) ?? new Date())
        : "",
})));
const operationScheduleItems = computed(() => filteredWeeklySchedules.value
    .flatMap((schedule) => (schedule?.detalles ?? [])
    .filter((detail) => {
    const process = normalizeProcessType(detail?.tipo_proceso);
    return ["OPERACION", "MPG"].includes(process) && isInSelectedPeriod(detail?.fecha_actividad || schedule?.fecha_inicio);
})
    .map((detail) => ({
    ...detail,
    cronograma_codigo: schedule?.codigo || null,
    fecha_resuelta: detail?.fecha_actividad || schedule?.fecha_inicio || null,
    duracion_horas: parseDurationHours(detail?.hora_inicio, detail?.hora_fin),
})))
    .sort((a, b) => (parseDateValue(a?.fecha_resuelta)?.getTime() ?? 0) -
    (parseDateValue(b?.fecha_resuelta)?.getTime() ?? 0) ||
    String(a?.hora_inicio || "").localeCompare(String(b?.hora_inicio || ""))));
const operationScheduleDays = computed(() => {
    const grouped = new Map();
    for (const item of operationScheduleItems.value) {
        const date = String(item?.fecha_resuelta || "").slice(0, 10);
        if (!date)
            continue;
        const startMinutes = parseTimeToMinutes(item?.hora_inicio);
        const endMinutes = parseTimeToMinutes(item?.hora_fin);
        const startLabel = formatTimeLabel(item?.hora_inicio);
        const endLabel = formatTimeLabel(item?.hora_fin);
        const current = grouped.get(date) ?? {
            date,
            count: 0,
            totalHours: 0,
            taskHours: 0,
            startMinutes: null,
            endMinutes: null,
            startLabel: "",
            endLabel: "",
            activities: [],
            equipments: [],
        };
        current.count += 1;
        current.taskHours += Number(item?.duracion_horas || 0);
        if (startMinutes != null && (current.startMinutes == null || startMinutes < current.startMinutes)) {
            current.startMinutes = startMinutes;
            current.startLabel = startLabel;
        }
        if (endMinutes != null && (current.endMinutes == null || endMinutes > current.endMinutes)) {
            current.endMinutes = endMinutes;
            current.endLabel = endLabel;
        }
        if (item?.actividad)
            current.activities.push(String(item.actividad));
        if (item?.equipo_codigo)
            current.equipments.push(String(item.equipo_codigo));
        grouped.set(date, current);
    }
    return [...grouped.values()]
        .sort((a, b) => (parseDateValue(a.date)?.getTime() ?? 0) - (parseDateValue(b.date)?.getTime() ?? 0))
        .map((item) => ({
        ...item,
        totalHours: item.startMinutes != null && item.endMinutes != null && item.endMinutes > item.startMinutes
            ? Number(((item.endMinutes - item.startMinutes) / 60).toFixed(2))
            : Number(item.taskHours.toFixed(2)),
        title: new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "long", year: "numeric" }).format(parseDateValue(item.date) ?? new Date()),
        subtitle: `${item.count} actividades${item.startLabel && item.endLabel ? ` · ${item.startLabel} - ${item.endLabel}` : ""} · ${(item.startMinutes != null &&
            item.endMinutes != null &&
            item.endMinutes > item.startMinutes
            ? Number(((item.endMinutes - item.startMinutes) / 60).toFixed(2))
            : Number(item.taskHours.toFixed(2))).toFixed(1)} h${item.equipments.length ? ` · ${[...new Set(item.equipments)].slice(0, 3).join(", ")}` : ""}`,
    }));
});
const operationScheduleSummary = computed(() => {
    const totalHours = operationScheduleDays.value.reduce((acc, item) => acc + Number(item?.totalHours || 0), 0);
    return {
        days: operationScheduleDays.value.length,
        activities: operationScheduleItems.value.length,
        totalHours,
        hoursLabel: `${totalHours.toFixed(1)} h`,
    };
});
const dashboardReportDefinition = computed(() => buildExecutiveDashboardReport({
    periodLabel: selectedPeriodLabel.value,
    kpis: kpiCards.value.map((card) => ({
        label: card.label,
        value: card.value,
    })),
    alerts: openAlerts.value.map((item) => ({
        tipo_alerta: item?.tipo_alerta || "Alerta",
        estado: item?.estado || "",
        severidad: item?.severidad || item?.nivel || "",
        referencia: item?.referencia_codigo || item?.referencia || item?.tabla_referencia || "",
        detalle: item?.detalle || "",
        fecha_generada: item?.fecha_generada || item?.created_at || "",
    })),
    workOrders: filteredWorkOrders.value.map((item) => ({
        codigo: item?.code || item?.codigo || "",
        titulo: item?.title || item?.titulo || "",
        equipo: item?.equipment_label || item?.equipo_nombre || item?.equipment_id || "",
        compartimiento: item?.equipment_component_label || item?.equipo_componente_nombre_oficial || "",
        estado_workflow: workflowLabel(item?.status_workflow),
        tipo_mantenimiento: item?.maintenance_kind || "",
        fecha: resolveWorkOrderDate(item) || "",
    })),
    inventory: lowStockItems.value.map((item) => ({
        producto: productNameMap.value[String(item?.producto_id)] || String(item?.producto_id || ""),
        bodega: resolveWarehouseLabel(item),
        stock_actual: item?.stock_actual || 0,
        stock_minimo: item?.stock_min_bodega || 0,
        observacion: "Bajo stock mínimo",
    })),
    processIndicators: processIndicatorCards.value.map((item) => ({
        indicador: item.label,
        valor: item.value,
        detalle: item.helper,
    })),
    operationDays: operationScheduleDays.value.map((item) => ({
        fecha: item.date,
        resumen: item.title,
        detalle: item.subtitle,
        actividades: item.count,
        horas: item.totalHours,
    })),
    weeklyActivities: latestWeeklyActivities.value.map((item) => ({
        actividad: item?.actividad || "",
        dia_semana: normalizeDayLabel(item?.dia_semana),
        hora_inicio: item?.hora_inicio || "",
        hora_fin: item?.hora_fin || "",
        equipo_codigo: item?.equipo_codigo || "",
        tipo_proceso: item?.tipo_proceso || "",
        observacion: item?.observacion || "",
    })),
}));
async function exportDashboard(format) {
    if (!canAccessDashboardReports.value) {
        error.value = "No tienes permisos para generar reportes del dashboard.";
        return;
    }
    const key = exportKey(format);
    exportState.value = { ...exportState.value, [key]: true };
    error.value = null;
    try {
        if (format === "excel") {
            await downloadReportExcel(dashboardReportDefinition.value);
        }
        else {
            await downloadReportPdf(dashboardReportDefinition.value);
        }
    }
    catch (e) {
        error.value = e?.message || "No se pudo generar el reporte del dashboard.";
    }
    finally {
        exportState.value = { ...exportState.value, [key]: false };
    }
}
const lastUpdatedLabel = computed(() => {
    if (!lastUpdatedAt.value)
        return "Sin datos";
    return lastUpdatedAt.value.toLocaleString();
});
onMounted(() => {
    loadDashboard();
});
watch([selectedYear, selectedMonth], () => {
    loadDashboard();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
/** @type {__VLS_StyleScopedClasses['period-toolbar__select']} */ ;
/** @type {__VLS_StyleScopedClasses['period-toolbar__select--month']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vContainer | typeof __VLS_components.VContainer | typeof __VLS_components.vContainer | typeof __VLS_components.VContainer} */
vContainer;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    fluid: true,
    ...{ class: "dashboard-page" },
}));
const __VLS_2 = __VLS_1({
    fluid: true,
    ...{ class: "dashboard-page" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['dashboard-page']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
if (!__VLS_ctx.canAccessDashboardReports) {
    let __VLS_7;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
        type: "warning",
        variant: "tonal",
    }));
    const __VLS_9 = __VLS_8({
        type: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    const { default: __VLS_12 } = __VLS_10.slots;
    // @ts-ignore
    [canAccessDashboardReports,];
    var __VLS_10;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-content" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-content']} */ ;
    let __VLS_13;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        ...{ class: "mb-4" },
        align: "stretch",
    }));
    const __VLS_15 = __VLS_14({
        ...{ class: "mb-4" },
        align: "stretch",
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    const { default: __VLS_18 } = __VLS_16.slots;
    let __VLS_19;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
        cols: "12",
        lg: "8",
    }));
    const __VLS_21 = __VLS_20({
        cols: "12",
        lg: "8",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    const { default: __VLS_24 } = __VLS_22.slots;
    let __VLS_25;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_27 = __VLS_26({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_30 } = __VLS_28.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
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
        ...{ class: "d-flex align-center" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    let __VLS_31;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
        label: true,
        prependIcon: "mdi-account-circle-outline",
    }));
    const __VLS_33 = __VLS_32({
        label: true,
        prependIcon: "mdi-account-circle-outline",
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    const { default: __VLS_36 } = __VLS_34.slots;
    (__VLS_ctx.auth.user?.nameUser || "Usuario");
    // @ts-ignore
    [auth,];
    var __VLS_34;
    let __VLS_37;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
        label: true,
        prependIcon: "mdi-shield-account-outline",
    }));
    const __VLS_39 = __VLS_38({
        label: true,
        prependIcon: "mdi-shield-account-outline",
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    const { default: __VLS_42 } = __VLS_40.slots;
    (__VLS_ctx.auth.user?.role?.nombre || "Sin rol");
    // @ts-ignore
    [auth,];
    var __VLS_40;
    if (__VLS_ctx.canAccessDashboardReports) {
        let __VLS_43;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
            ...{ 'onClick': {} },
            color: "secondary",
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('excel')),
        }));
        const __VLS_45 = __VLS_44({
            ...{ 'onClick': {} },
            color: "secondary",
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('excel')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_44));
        let __VLS_48;
        const __VLS_49 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canAccessDashboardReports))
                        return;
                    if (!(__VLS_ctx.canAccessDashboardReports))
                        return;
                    __VLS_ctx.exportDashboard('excel');
                    // @ts-ignore
                    [canAccessDashboardReports, isExporting, exportDashboard,];
                } });
        const { default: __VLS_50 } = __VLS_46.slots;
        // @ts-ignore
        [];
        var __VLS_46;
        var __VLS_47;
    }
    if (__VLS_ctx.canAccessDashboardReports) {
        let __VLS_51;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
            ...{ 'onClick': {} },
            color: "secondary",
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('pdf')),
        }));
        const __VLS_53 = __VLS_52({
            ...{ 'onClick': {} },
            color: "secondary",
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('pdf')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        let __VLS_56;
        const __VLS_57 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canAccessDashboardReports))
                        return;
                    if (!(__VLS_ctx.canAccessDashboardReports))
                        return;
                    __VLS_ctx.exportDashboard('pdf');
                    // @ts-ignore
                    [canAccessDashboardReports, isExporting, exportDashboard,];
                } });
        const { default: __VLS_58 } = __VLS_54.slots;
        // @ts-ignore
        [];
        var __VLS_54;
        var __VLS_55;
    }
    let __VLS_59;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-chart-timeline-variant",
    }));
    const __VLS_61 = __VLS_60({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-chart-timeline-variant",
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    let __VLS_64;
    const __VLS_65 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canAccessDashboardReports))
                    return;
                __VLS_ctx.router.push({ name: 'inteligencia-mantenimiento' });
                // @ts-ignore
                [router,];
            } });
    const { default: __VLS_66 } = __VLS_62.slots;
    // @ts-ignore
    [];
    var __VLS_62;
    var __VLS_63;
    let __VLS_67;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_69 = __VLS_68({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_68));
    let __VLS_72;
    const __VLS_73 = ({ click: {} },
        { onClick: (__VLS_ctx.loadDashboard) });
    const { default: __VLS_74 } = __VLS_70.slots;
    // @ts-ignore
    [loading, loadDashboard,];
    var __VLS_70;
    var __VLS_71;
    let __VLS_75;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
        ...{ class: "my-4" },
    }));
    const __VLS_77 = __VLS_76({
        ...{ class: "my-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    /** @type {__VLS_StyleScopedClasses['my-4']} */ ;
    if (__VLS_ctx.error) {
        let __VLS_80;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
            type: "warning",
            variant: "tonal",
            ...{ class: "mb-3" },
            text: (__VLS_ctx.error),
        }));
        const __VLS_82 = __VLS_81({
            type: "warning",
            variant: "tonal",
            ...{ class: "mb-3" },
            text: (__VLS_ctx.error),
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center flex-wrap period-toolbar mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['period-toolbar']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    let __VLS_85;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
        modelValue: (__VLS_ctx.selectedYear),
        items: (__VLS_ctx.yearOptions),
        label: "Año",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "period-toolbar__select" },
    }));
    const __VLS_87 = __VLS_86({
        modelValue: (__VLS_ctx.selectedYear),
        items: (__VLS_ctx.yearOptions),
        label: "Año",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "period-toolbar__select" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_86));
    /** @type {__VLS_StyleScopedClasses['period-toolbar__select']} */ ;
    let __VLS_90;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
        modelValue: (__VLS_ctx.selectedMonth),
        items: (__VLS_ctx.monthOptions),
        label: "Mes",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "period-toolbar__select period-toolbar__select--month" },
    }));
    const __VLS_92 = __VLS_91({
        modelValue: (__VLS_ctx.selectedMonth),
        items: (__VLS_ctx.monthOptions),
        label: "Mes",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "period-toolbar__select period-toolbar__select--month" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
    /** @type {__VLS_StyleScopedClasses['period-toolbar__select']} */ ;
    /** @type {__VLS_StyleScopedClasses['period-toolbar__select--month']} */ ;
    let __VLS_95;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
        label: true,
        color: "primary",
        variant: "tonal",
    }));
    const __VLS_97 = __VLS_96({
        label: true,
        color: "primary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
    const { default: __VLS_100 } = __VLS_98.slots;
    (__VLS_ctx.selectedPeriodLabel);
    // @ts-ignore
    [error, error, selectedYear, yearOptions, selectedMonth, monthOptions, selectedPeriodLabel,];
    var __VLS_98;
    let __VLS_101;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_102 = __VLS_asFunctionalComponent1(__VLS_101, new __VLS_101({
        dense: true,
    }));
    const __VLS_103 = __VLS_102({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_102));
    const { default: __VLS_106 } = __VLS_104.slots;
    for (const [card] of __VLS_vFor((__VLS_ctx.kpiCards))) {
        let __VLS_107;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
            key: (card.key),
            cols: "12",
            sm: "6",
            xl: "3",
        }));
        const __VLS_109 = __VLS_108({
            key: (card.key),
            cols: "12",
            sm: "6",
            xl: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        const { default: __VLS_112 } = __VLS_110.slots;
        let __VLS_113;
        /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
        vCard;
        // @ts-ignore
        const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
            rounded: "lg",
            variant: "outlined",
            ...{ class: "pa-4 kpi-card h-100" },
            ...{ style: ({ '--kpi-accent': card.accent }) },
        }));
        const __VLS_115 = __VLS_114({
            rounded: "lg",
            variant: "outlined",
            ...{ class: "pa-4 kpi-card h-100" },
            ...{ style: ({ '--kpi-accent': card.accent }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_114));
        /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
        const { default: __VLS_118 } = __VLS_116.slots;
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
        let __VLS_119;
        /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
        vIcon;
        // @ts-ignore
        const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
            icon: (card.icon),
            size: "20",
        }));
        const __VLS_121 = __VLS_120({
            icon: (card.icon),
            size: "20",
        }, ...__VLS_functionalComponentArgsRest(__VLS_120));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "kpi-card__value-row" },
        });
        /** @type {__VLS_StyleScopedClasses['kpi-card__value-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-h4 font-weight-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['text-h4']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
        (card.value);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "kpi-card__orb" },
        });
        /** @type {__VLS_StyleScopedClasses['kpi-card__orb']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        (card.helper);
        // @ts-ignore
        [kpiCards,];
        var __VLS_116;
        // @ts-ignore
        [];
        var __VLS_110;
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_104;
    // @ts-ignore
    [];
    var __VLS_28;
    // @ts-ignore
    [];
    var __VLS_22;
    let __VLS_124;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({
        cols: "12",
        lg: "4",
    }));
    const __VLS_126 = __VLS_125({
        cols: "12",
        lg: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    const { default: __VLS_129 } = __VLS_127.slots;
    let __VLS_130;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_131 = __VLS_asFunctionalComponent1(__VLS_130, new __VLS_130({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_132 = __VLS_131({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_131));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_135 } = __VLS_133.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [status] of __VLS_vFor((__VLS_ctx.workOrderStatusCards))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "status-row" },
            key: (status.key),
        });
        /** @type {__VLS_StyleScopedClasses['status-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-1 font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (status.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        let __VLS_136;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent1(__VLS_136, new __VLS_136({
            label: true,
        }));
        const __VLS_138 = __VLS_137({
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_137));
        const { default: __VLS_141 } = __VLS_139.slots;
        (status.value);
        // @ts-ignore
        [workOrderStatusCards,];
        var __VLS_139;
        // @ts-ignore
        [];
    }
    let __VLS_142;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_143 = __VLS_asFunctionalComponent1(__VLS_142, new __VLS_142({
        ...{ class: "my-4" },
    }));
    const __VLS_144 = __VLS_143({
        ...{ class: "my-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_143));
    /** @type {__VLS_StyleScopedClasses['my-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status-row" },
    });
    /** @type {__VLS_StyleScopedClasses['status-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-1 font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    let __VLS_147;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
        label: true,
    }));
    const __VLS_149 = __VLS_148({
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    const { default: __VLS_152 } = __VLS_150.slots;
    (__VLS_ctx.menu.tree.length);
    // @ts-ignore
    [menu,];
    var __VLS_150;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "status-row" },
    });
    /** @type {__VLS_StyleScopedClasses['status-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-1 font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    let __VLS_153;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_154 = __VLS_asFunctionalComponent1(__VLS_153, new __VLS_153({
        label: true,
    }));
    const __VLS_155 = __VLS_154({
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_154));
    const { default: __VLS_158 } = __VLS_156.slots;
    (__VLS_ctx.lastUpdatedLabel);
    // @ts-ignore
    [lastUpdatedLabel,];
    var __VLS_156;
    // @ts-ignore
    [];
    var __VLS_133;
    // @ts-ignore
    [];
    var __VLS_127;
    // @ts-ignore
    [];
    var __VLS_16;
    let __VLS_159;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
        ...{ class: "mb-1" },
    }));
    const __VLS_161 = __VLS_160({
        ...{ class: "mb-1" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    const { default: __VLS_164 } = __VLS_162.slots;
    let __VLS_165;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_166 = __VLS_asFunctionalComponent1(__VLS_165, new __VLS_165({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_167 = __VLS_166({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_166));
    const { default: __VLS_170 } = __VLS_168.slots;
    const __VLS_171 = DashboardBarChartCard;
    // @ts-ignore
    const __VLS_172 = __VLS_asFunctionalComponent1(__VLS_171, new __VLS_171({
        title: "Distribución de órdenes",
        subtitle: "Balance del flujo de trabajo en el período",
        chipLabel: (`${__VLS_ctx.filteredWorkOrders.length} OT`),
        chipColor: "primary",
        items: (__VLS_ctx.workOrderStatusChartItems),
    }));
    const __VLS_173 = __VLS_172({
        title: "Distribución de órdenes",
        subtitle: "Balance del flujo de trabajo en el período",
        chipLabel: (`${__VLS_ctx.filteredWorkOrders.length} OT`),
        chipColor: "primary",
        items: (__VLS_ctx.workOrderStatusChartItems),
    }, ...__VLS_functionalComponentArgsRest(__VLS_172));
    // @ts-ignore
    [filteredWorkOrders, workOrderStatusChartItems,];
    var __VLS_168;
    let __VLS_176;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_178 = __VLS_177({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    const { default: __VLS_181 } = __VLS_179.slots;
    const __VLS_182 = DashboardBarChartCard;
    // @ts-ignore
    const __VLS_183 = __VLS_asFunctionalComponent1(__VLS_182, new __VLS_182({
        title: "Severidad de alertas",
        subtitle: "Cómo viene la presión operativa del mes",
        chipLabel: (`${__VLS_ctx.openAlertsCount} abiertas`),
        chipColor: "warning",
        items: (__VLS_ctx.alertSeverityChartItems),
    }));
    const __VLS_184 = __VLS_183({
        title: "Severidad de alertas",
        subtitle: "Cómo viene la presión operativa del mes",
        chipLabel: (`${__VLS_ctx.openAlertsCount} abiertas`),
        chipColor: "warning",
        items: (__VLS_ctx.alertSeverityChartItems),
    }, ...__VLS_functionalComponentArgsRest(__VLS_183));
    // @ts-ignore
    [openAlertsCount, alertSeverityChartItems,];
    var __VLS_179;
    let __VLS_187;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_188 = __VLS_asFunctionalComponent1(__VLS_187, new __VLS_187({
        cols: "12",
        xl: "4",
    }));
    const __VLS_189 = __VLS_188({
        cols: "12",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_188));
    const { default: __VLS_192 } = __VLS_190.slots;
    const __VLS_193 = DashboardBarChartCard;
    // @ts-ignore
    const __VLS_194 = __VLS_asFunctionalComponent1(__VLS_193, new __VLS_193({
        title: "Cadencia operativa",
        subtitle: "Horas programadas por día desde el cronograma semanal",
        chipLabel: (__VLS_ctx.operationScheduleSummary.hoursLabel),
        chipColor: "success",
        items: (__VLS_ctx.operationCadenceChartItems),
        emptyText: "No hay programación semanal OPERACION/MPG para graficar en este período.",
    }));
    const __VLS_195 = __VLS_194({
        title: "Cadencia operativa",
        subtitle: "Horas programadas por día desde el cronograma semanal",
        chipLabel: (__VLS_ctx.operationScheduleSummary.hoursLabel),
        chipColor: "success",
        items: (__VLS_ctx.operationCadenceChartItems),
        emptyText: "No hay programación semanal OPERACION/MPG para graficar en este período.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    // @ts-ignore
    [operationScheduleSummary, operationCadenceChartItems,];
    var __VLS_190;
    // @ts-ignore
    [];
    var __VLS_162;
    let __VLS_198;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent1(__VLS_198, new __VLS_198({}));
    const __VLS_200 = __VLS_199({}, ...__VLS_functionalComponentArgsRest(__VLS_199));
    const { default: __VLS_203 } = __VLS_201.slots;
    let __VLS_204;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent1(__VLS_204, new __VLS_204({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_206 = __VLS_205({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    const { default: __VLS_209 } = __VLS_207.slots;
    let __VLS_210;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_211 = __VLS_asFunctionalComponent1(__VLS_210, new __VLS_210({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_212 = __VLS_211({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_211));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_215 } = __VLS_213.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    let __VLS_216;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent1(__VLS_216, new __VLS_216({
        label: true,
        color: "warning",
        variant: "tonal",
    }));
    const __VLS_218 = __VLS_217({
        label: true,
        color: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    const { default: __VLS_221 } = __VLS_219.slots;
    (__VLS_ctx.openAlertsCount);
    // @ts-ignore
    [openAlertsCount,];
    var __VLS_219;
    if (__VLS_ctx.loading) {
        const __VLS_222 = LoadingTableState;
        // @ts-ignore
        const __VLS_223 = __VLS_asFunctionalComponent1(__VLS_222, new __VLS_222({
            message: "Cargando alertas recientes...",
            rows: (5),
            columns: (4),
        }));
        const __VLS_224 = __VLS_223({
            message: "Cargando alertas recientes...",
            rows: (5),
            columns: (4),
        }, ...__VLS_functionalComponentArgsRest(__VLS_223));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_227;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_228 = __VLS_asFunctionalComponent1(__VLS_227, new __VLS_227({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_229 = __VLS_228({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_228));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_232 } = __VLS_230.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [alert] of __VLS_vFor((__VLS_ctx.recentAlertsTableRows))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (alert.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (alert.tipo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (alert.equipo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            let __VLS_233;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_234 = __VLS_asFunctionalComponent1(__VLS_233, new __VLS_233({
                size: "x-small",
                label: true,
                color: "warning",
                variant: "tonal",
            }));
            const __VLS_235 = __VLS_234({
                size: "x-small",
                label: true,
                color: "warning",
                variant: "tonal",
            }, ...__VLS_functionalComponentArgsRest(__VLS_234));
            const { default: __VLS_238 } = __VLS_236.slots;
            (alert.estado);
            // @ts-ignore
            [loading, recentAlertsTableRows,];
            var __VLS_236;
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (alert.detalle);
            // @ts-ignore
            [];
        }
        if (!__VLS_ctx.recentAlertsTableRows.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "4",
                ...{ class: "text-center text-medium-emphasis py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        }
        // @ts-ignore
        [recentAlertsTableRows,];
        var __VLS_230;
    }
    // @ts-ignore
    [];
    var __VLS_213;
    // @ts-ignore
    [];
    var __VLS_207;
    let __VLS_239;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_240 = __VLS_asFunctionalComponent1(__VLS_239, new __VLS_239({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_241 = __VLS_240({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_240));
    const { default: __VLS_244 } = __VLS_242.slots;
    let __VLS_245;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_246 = __VLS_asFunctionalComponent1(__VLS_245, new __VLS_245({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_247 = __VLS_246({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_246));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_250 } = __VLS_248.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    let __VLS_251;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_252 = __VLS_asFunctionalComponent1(__VLS_251, new __VLS_251({
        label: true,
        color: "primary",
        variant: "tonal",
    }));
    const __VLS_253 = __VLS_252({
        label: true,
        color: "primary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_252));
    const { default: __VLS_256 } = __VLS_254.slots;
    (__VLS_ctx.filteredWorkOrders.length);
    // @ts-ignore
    [filteredWorkOrders,];
    var __VLS_254;
    if (__VLS_ctx.loading) {
        const __VLS_257 = LoadingTableState;
        // @ts-ignore
        const __VLS_258 = __VLS_asFunctionalComponent1(__VLS_257, new __VLS_257({
            message: "Cargando órdenes de trabajo...",
            rows: (5),
            columns: (4),
        }));
        const __VLS_259 = __VLS_258({
            message: "Cargando órdenes de trabajo...",
            rows: (5),
            columns: (4),
        }, ...__VLS_functionalComponentArgsRest(__VLS_258));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_262;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_263 = __VLS_asFunctionalComponent1(__VLS_262, new __VLS_262({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_264 = __VLS_263({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_263));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_267 } = __VLS_265.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [order] of __VLS_vFor((__VLS_ctx.recentWorkOrdersTableRows))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (order.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (order.codigo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (order.titulo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (order.equipo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            let __VLS_268;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_269 = __VLS_asFunctionalComponent1(__VLS_268, new __VLS_268({
                size: "x-small",
                label: true,
                color: "primary",
                variant: "tonal",
            }));
            const __VLS_270 = __VLS_269({
                size: "x-small",
                label: true,
                color: "primary",
                variant: "tonal",
            }, ...__VLS_functionalComponentArgsRest(__VLS_269));
            const { default: __VLS_273 } = __VLS_271.slots;
            (order.estado);
            // @ts-ignore
            [loading, recentWorkOrdersTableRows,];
            var __VLS_271;
            // @ts-ignore
            [];
        }
        if (!__VLS_ctx.recentWorkOrdersTableRows.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "4",
                ...{ class: "text-center text-medium-emphasis py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        }
        // @ts-ignore
        [recentWorkOrdersTableRows,];
        var __VLS_265;
    }
    // @ts-ignore
    [];
    var __VLS_248;
    // @ts-ignore
    [];
    var __VLS_242;
    let __VLS_274;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_275 = __VLS_asFunctionalComponent1(__VLS_274, new __VLS_274({
        cols: "12",
        xl: "4",
    }));
    const __VLS_276 = __VLS_275({
        cols: "12",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_275));
    const { default: __VLS_279 } = __VLS_277.slots;
    let __VLS_280;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent1(__VLS_280, new __VLS_280({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_282 = __VLS_281({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_285 } = __VLS_283.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    let __VLS_286;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_287 = __VLS_asFunctionalComponent1(__VLS_286, new __VLS_286({
        label: true,
        color: "error",
        variant: "tonal",
    }));
    const __VLS_288 = __VLS_287({
        label: true,
        color: "error",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_287));
    const { default: __VLS_291 } = __VLS_289.slots;
    (__VLS_ctx.lowStockItems.length);
    // @ts-ignore
    [lowStockItems,];
    var __VLS_289;
    if (__VLS_ctx.loading) {
        const __VLS_292 = LoadingTableState;
        // @ts-ignore
        const __VLS_293 = __VLS_asFunctionalComponent1(__VLS_292, new __VLS_292({
            message: "Cargando inventario crítico...",
            rows: (6),
            columns: (3),
        }));
        const __VLS_294 = __VLS_293({
            message: "Cargando inventario crítico...",
            rows: (6),
            columns: (3),
        }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-stack" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-stack']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "summary-strip" },
        });
        /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
        let __VLS_297;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_298 = __VLS_asFunctionalComponent1(__VLS_297, new __VLS_297({
            size: "small",
            label: true,
            color: "error",
            variant: "tonal",
        }));
        const __VLS_299 = __VLS_298({
            size: "small",
            label: true,
            color: "error",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_298));
        const { default: __VLS_302 } = __VLS_300.slots;
        (__VLS_ctx.lowStockByWarehouse.length);
        // @ts-ignore
        [loading, lowStockByWarehouse,];
        var __VLS_300;
        let __VLS_303;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_304 = __VLS_asFunctionalComponent1(__VLS_303, new __VLS_303({
            size: "small",
            label: true,
            color: "secondary",
            variant: "tonal",
        }));
        const __VLS_305 = __VLS_304({
            size: "small",
            label: true,
            color: "secondary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_304));
        const { default: __VLS_308 } = __VLS_306.slots;
        (__VLS_ctx.criticalInventoryRows.length);
        // @ts-ignore
        [criticalInventoryRows,];
        var __VLS_306;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-mini-bars" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.lowStockByWarehouse))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (item.key),
                ...{ class: "dashboard-mini-bars__row" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__meta" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__meta']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (item.label);
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (item.valueLabel);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__track" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__track']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__fill dashboard-mini-bars__fill--danger" },
                ...{ style: ({ width: `${Math.max(8, (item.value / Math.max(...__VLS_ctx.lowStockByWarehouse.map((row) => row.value), 1)) * 100)}%` }) },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__fill']} */ ;
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__fill--danger']} */ ;
            // @ts-ignore
            [lowStockByWarehouse, lowStockByWarehouse,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_309;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_310 = __VLS_asFunctionalComponent1(__VLS_309, new __VLS_309({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_311 = __VLS_310({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_310));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_314 } = __VLS_312.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [item] of __VLS_vFor((__VLS_ctx.criticalInventoryRows))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (item.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (item.producto);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.bodega);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.stock);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.min);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            let __VLS_315;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_316 = __VLS_asFunctionalComponent1(__VLS_315, new __VLS_315({
                size: "x-small",
                label: true,
                color: "error",
                variant: "tonal",
            }));
            const __VLS_317 = __VLS_316({
                size: "x-small",
                label: true,
                color: "error",
                variant: "tonal",
            }, ...__VLS_functionalComponentArgsRest(__VLS_316));
            const { default: __VLS_320 } = __VLS_318.slots;
            (item.deficit);
            // @ts-ignore
            [criticalInventoryRows,];
            var __VLS_318;
            // @ts-ignore
            [];
        }
        if (!__VLS_ctx.criticalInventoryRows.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "5",
                ...{ class: "text-center text-medium-emphasis py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        }
        // @ts-ignore
        [criticalInventoryRows,];
        var __VLS_312;
    }
    // @ts-ignore
    [];
    var __VLS_283;
    // @ts-ignore
    [];
    var __VLS_277;
    // @ts-ignore
    [];
    var __VLS_201;
    let __VLS_321;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_322 = __VLS_asFunctionalComponent1(__VLS_321, new __VLS_321({}));
    const __VLS_323 = __VLS_322({}, ...__VLS_functionalComponentArgsRest(__VLS_322));
    const { default: __VLS_326 } = __VLS_324.slots;
    let __VLS_327;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_328 = __VLS_asFunctionalComponent1(__VLS_327, new __VLS_327({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_329 = __VLS_328({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_328));
    const { default: __VLS_332 } = __VLS_330.slots;
    const __VLS_333 = DashboardBarChartCard;
    // @ts-ignore
    const __VLS_334 = __VLS_asFunctionalComponent1(__VLS_333, new __VLS_333({
        title: "Indicadores de proceso",
        subtitle: "Seguimiento documental y operativo",
        chipLabel: (`${__VLS_ctx.processIndicatorCards.length} KPI`),
        chipColor: "secondary",
        items: (__VLS_ctx.processIndicatorCards.map((item) => ({
            key: item.key,
            label: item.label,
            value: Number(item.value || 0),
            valueLabel: __VLS_ctx.formatCompactNumber(item.value),
            helper: item.helper,
            color: 'linear-gradient(90deg, #3f62d8 0%, #9eaefc 100%)',
        }))),
    }));
    const __VLS_335 = __VLS_334({
        title: "Indicadores de proceso",
        subtitle: "Seguimiento documental y operativo",
        chipLabel: (`${__VLS_ctx.processIndicatorCards.length} KPI`),
        chipColor: "secondary",
        items: (__VLS_ctx.processIndicatorCards.map((item) => ({
            key: item.key,
            label: item.label,
            value: Number(item.value || 0),
            valueLabel: __VLS_ctx.formatCompactNumber(item.value),
            helper: item.helper,
            color: 'linear-gradient(90deg, #3f62d8 0%, #9eaefc 100%)',
        }))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_334));
    // @ts-ignore
    [processIndicatorCards, processIndicatorCards, formatCompactNumber,];
    var __VLS_330;
    let __VLS_338;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_339 = __VLS_asFunctionalComponent1(__VLS_338, new __VLS_338({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_340 = __VLS_339({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_339));
    const { default: __VLS_343 } = __VLS_341.slots;
    let __VLS_344;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent1(__VLS_344, new __VLS_344({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_346 = __VLS_345({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_345));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_349 } = __VLS_347.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    let __VLS_350;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_351 = __VLS_asFunctionalComponent1(__VLS_350, new __VLS_350({
        label: true,
        color: "success",
        variant: "tonal",
    }));
    const __VLS_352 = __VLS_351({
        label: true,
        color: "success",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_351));
    const { default: __VLS_355 } = __VLS_353.slots;
    (__VLS_ctx.operationScheduleSummary.days);
    // @ts-ignore
    [operationScheduleSummary,];
    var __VLS_353;
    if (__VLS_ctx.loading) {
        const __VLS_356 = LoadingTableState;
        // @ts-ignore
        const __VLS_357 = __VLS_asFunctionalComponent1(__VLS_356, new __VLS_356({
            message: "Cargando reporte diario de operación...",
            rows: (6),
            columns: (3),
        }));
        const __VLS_358 = __VLS_357({
            message: "Cargando reporte diario de operación...",
            rows: (6),
            columns: (3),
        }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    }
    else if (__VLS_ctx.operationScheduleDays.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-stack" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-stack']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "summary-strip" },
        });
        /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
        let __VLS_361;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_362 = __VLS_asFunctionalComponent1(__VLS_361, new __VLS_361({
            size: "small",
            label: true,
            color: "primary",
            variant: "tonal",
        }));
        const __VLS_363 = __VLS_362({
            size: "small",
            label: true,
            color: "primary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_362));
        const { default: __VLS_366 } = __VLS_364.slots;
        (__VLS_ctx.operationScheduleSummary.activities);
        // @ts-ignore
        [loading, operationScheduleSummary, operationScheduleDays,];
        var __VLS_364;
        let __VLS_367;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_368 = __VLS_asFunctionalComponent1(__VLS_367, new __VLS_367({
            size: "small",
            label: true,
            color: "secondary",
            variant: "tonal",
        }));
        const __VLS_369 = __VLS_368({
            size: "small",
            label: true,
            color: "secondary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_368));
        const { default: __VLS_372 } = __VLS_370.slots;
        (__VLS_ctx.operationScheduleSummary.hoursLabel);
        // @ts-ignore
        [operationScheduleSummary,];
        var __VLS_370;
        let __VLS_373;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_374 = __VLS_asFunctionalComponent1(__VLS_373, new __VLS_373({
            size: "small",
            label: true,
            color: "info",
            variant: "tonal",
        }));
        const __VLS_375 = __VLS_374({
            size: "small",
            label: true,
            color: "info",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_374));
        const { default: __VLS_378 } = __VLS_376.slots;
        (__VLS_ctx.filteredDailyReports.length);
        // @ts-ignore
        [filteredDailyReports,];
        var __VLS_376;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-mini-bars" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.operationScheduleDays.slice(0, 7)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (item.date),
                ...{ class: "dashboard-mini-bars__row" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__meta" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__meta']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (item.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (Number(item.totalHours || 0).toFixed(1));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__track" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__track']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__fill dashboard-mini-bars__fill--success" },
                ...{ style: ({ width: `${Math.max(8, (Number(item.totalHours || 0) / Math.max(...__VLS_ctx.operationScheduleDays.map((row) => Number(row.totalHours || 0)), 1)) * 100)}%` }) },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__fill']} */ ;
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__fill--success']} */ ;
            // @ts-ignore
            [operationScheduleDays, operationScheduleDays,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_379;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_380 = __VLS_asFunctionalComponent1(__VLS_379, new __VLS_379({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_381 = __VLS_380({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_380));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_384 } = __VLS_382.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [item] of __VLS_vFor((__VLS_ctx.operationScheduleDays.slice(0, 7)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (item.date),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (item.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.count);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (Number(item.totalHours || 0).toFixed(1));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (item.subtitle);
            // @ts-ignore
            [operationScheduleDays,];
        }
        // @ts-ignore
        [];
        var __VLS_382;
    }
    else if (__VLS_ctx.latestDailyReport) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-stack" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-stack']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "summary-strip" },
        });
        /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
        let __VLS_385;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_386 = __VLS_asFunctionalComponent1(__VLS_385, new __VLS_385({
            size: "small",
            label: true,
            color: "primary",
            variant: "tonal",
        }));
        const __VLS_387 = __VLS_386({
            size: "small",
            label: true,
            color: "primary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_386));
        const { default: __VLS_390 } = __VLS_388.slots;
        (__VLS_ctx.latestDailyUnits.length);
        // @ts-ignore
        [latestDailyReport, latestDailyUnits,];
        var __VLS_388;
        let __VLS_391;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_392 = __VLS_asFunctionalComponent1(__VLS_391, new __VLS_391({
            size: "small",
            label: true,
            color: "warning",
            variant: "tonal",
        }));
        const __VLS_393 = __VLS_392({
            size: "small",
            label: true,
            color: "warning",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_392));
        const { default: __VLS_396 } = __VLS_394.slots;
        (__VLS_ctx.latestDailyFuel.length);
        // @ts-ignore
        [latestDailyFuel,];
        var __VLS_394;
        let __VLS_397;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_398 = __VLS_asFunctionalComponent1(__VLS_397, new __VLS_397({
            size: "small",
            label: true,
            color: "error",
            variant: "tonal",
        }));
        const __VLS_399 = __VLS_398({
            size: "small",
            label: true,
            color: "error",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_398));
        const { default: __VLS_402 } = __VLS_400.slots;
        (__VLS_ctx.latestDailyComponents.length);
        // @ts-ignore
        [latestDailyComponents,];
        var __VLS_400;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_403;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_404 = __VLS_asFunctionalComponent1(__VLS_403, new __VLS_403({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_405 = __VLS_404({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_404));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_408 } = __VLS_406.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [unit] of __VLS_vFor((__VLS_ctx.latestDailyUnits))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (unit.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (unit.equipo_codigo || "Sin equipo");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (unit.horometro_actual ?? "N/A");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (unit.mpg_actual ?? "N/A");
            // @ts-ignore
            [latestDailyUnits,];
        }
        if (!__VLS_ctx.latestDailyUnits.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "3",
                ...{ class: "text-center text-medium-emphasis py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        }
        // @ts-ignore
        [latestDailyUnits,];
        var __VLS_406;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    // @ts-ignore
    [];
    var __VLS_347;
    // @ts-ignore
    [];
    var __VLS_341;
    let __VLS_409;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_410 = __VLS_asFunctionalComponent1(__VLS_409, new __VLS_409({
        cols: "12",
        xl: "4",
    }));
    const __VLS_411 = __VLS_410({
        cols: "12",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_410));
    const { default: __VLS_414 } = __VLS_412.slots;
    let __VLS_415;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_416 = __VLS_asFunctionalComponent1(__VLS_415, new __VLS_415({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_417 = __VLS_416({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_416));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_420 } = __VLS_418.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    let __VLS_421;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_422 = __VLS_asFunctionalComponent1(__VLS_421, new __VLS_421({
        label: true,
        color: "info",
        variant: "tonal",
    }));
    const __VLS_423 = __VLS_422({
        label: true,
        color: "info",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_422));
    const { default: __VLS_426 } = __VLS_424.slots;
    (__VLS_ctx.latestWeeklySchedule?.codigo || "Sin cronograma");
    // @ts-ignore
    [latestWeeklySchedule,];
    var __VLS_424;
    if (__VLS_ctx.loading) {
        const __VLS_427 = LoadingTableState;
        // @ts-ignore
        const __VLS_428 = __VLS_asFunctionalComponent1(__VLS_427, new __VLS_427({
            message: "Cargando cronograma semanal...",
            rows: (6),
            columns: (5),
        }));
        const __VLS_429 = __VLS_428({
            message: "Cargando cronograma semanal...",
            rows: (6),
            columns: (5),
        }, ...__VLS_functionalComponentArgsRest(__VLS_428));
    }
    else if (__VLS_ctx.latestWeeklySchedule) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-stack" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-stack']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (__VLS_ctx.latestWeeklySchedule.fecha_inicio || "Sin fecha");
        (__VLS_ctx.latestWeeklySchedule.fecha_fin || "Sin fecha");
        if (__VLS_ctx.latestWeeklySchedule.locacion) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.latestWeeklySchedule.locacion);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_432;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_433 = __VLS_asFunctionalComponent1(__VLS_432, new __VLS_432({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_434 = __VLS_433({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_433));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_437 } = __VLS_435.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [activity] of __VLS_vFor((__VLS_ctx.latestWeeklyActivities))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (activity.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (activity.fecha_label || activity.fecha_actividad || "Sin fecha");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (__VLS_ctx.normalizeDayLabel(activity.dia_semana));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (activity.hora_inicio && activity.hora_fin
                ? `${activity.hora_inicio} - ${activity.hora_fin}`
                : activity.hora_inicio || activity.hora_fin || "Sin hora");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (activity.equipo_codigo || "Sin equipo");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (activity.actividad || "Actividad sin nombre");
            // @ts-ignore
            [loading, latestWeeklySchedule, latestWeeklySchedule, latestWeeklySchedule, latestWeeklySchedule, latestWeeklySchedule, latestWeeklyActivities, normalizeDayLabel,];
        }
        if (!__VLS_ctx.latestWeeklyActivities.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "5",
                ...{ class: "text-center text-medium-emphasis py-4" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        }
        // @ts-ignore
        [latestWeeklyActivities,];
        var __VLS_435;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    // @ts-ignore
    [];
    var __VLS_418;
    // @ts-ignore
    [];
    var __VLS_412;
    // @ts-ignore
    [];
    var __VLS_324;
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

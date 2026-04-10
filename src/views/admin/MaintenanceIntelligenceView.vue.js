/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { lubricantCompartments } from "@/app/config/lubricant-analysis";
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { buildDailyReportsReport, buildIndicatorsReport, buildLubricantReport, buildProceduresReport, buildWeeklyScheduleReport, downloadReportExcel, downloadReportPdf, } from "@/app/utils/maintenance-intelligence-reports";
const loading = ref(false);
const error = ref(null);
const summary = reactive({});
const procedures = ref([]);
const analyses = ref([]);
const schedules = ref([]);
const dailyReports = ref([]);
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const exportState = reactive({});
const router = useRouter();
const { mdAndDown } = useDisplay();
const auth = useAuthStore();
const menuStore = useMenuStore();
const dashboardDialog = ref(false);
const isDashboardDialogFullscreen = computed(() => mdAndDown.value);
const dashboardSelection = ref(null);
const dashboardPeriod = ref("MENSUAL");
const dashboardFrom = ref("");
const dashboardTo = ref("");
const dashboardCompartimento = ref(null);
const lubricantDashboard = ref(null);
const lubricantDashboardLoading = ref(false);
const lubricantDashboardError = ref(null);
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, [
    "Inteligencia operativa",
    "Inteligencia operativa de mantenimiento",
    "Inteligencia mantenimiento",
]));
const canRead = computed(() => perms.value.isReaded);
const canAccessIntelligenceReports = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "inteligencia_operativa"));
const dashboardPeriodOptions = [
    { value: "SEMANAL", title: "Semanal" },
    { value: "MENSUAL", title: "Mensual" },
    { value: "ANUAL", title: "Anual" },
    { value: "PERSONALIZADO", title: "Personalizado" },
];
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
function normalizeProcessType(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}
function parseDurationHours(startValue, endValue) {
    const start = String(startValue || "").trim();
    const end = String(endValue || "").trim();
    const startMatch = /^(\d{1,2}):(\d{2})$/.exec(start);
    const endMatch = /^(\d{1,2}):(\d{2})$/.exec(end);
    if (!startMatch || !endMatch)
        return 0;
    const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
    const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes)
        return 0;
    return (endMinutes - startMinutes) / 60;
}
const selectedPeriodRange = computed(() => buildMonthRange(selectedYear.value, selectedMonth.value));
const selectedPeriodLabel = computed(() => new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(new Date(selectedYear.value, selectedMonth.value - 1, 1)));
function resetState() {
    summary.generated_at = undefined;
    summary.kpis = {};
    summary.process_breakdown = [];
    summary.recent_events = [];
    summary.component_highlights = [];
    procedures.value = [];
    analyses.value = [];
    schedules.value = [];
    dailyReports.value = [];
}
async function loadIntelligence() {
    if (!canRead.value || !canAccessIntelligenceReports.value) {
        resetState();
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const [summaryRes, proceduresRes, analysesRes, schedulesRes, reportsRes] = await Promise.all([
            api.get("/kpi_maintenance/inteligencia/summary", {
                params: { year: selectedYear.value, month: selectedMonth.value },
            }),
            api.get("/kpi_maintenance/inteligencia/procedimientos"),
            api.get("/kpi_maintenance/inteligencia/analisis-lubricante"),
            api.get("/kpi_maintenance/inteligencia/cronogramas-semanales"),
            api.get("/kpi_maintenance/inteligencia/reportes-diarios"),
        ]);
        resetState();
        Object.assign(summary, unwrap(summaryRes.data, {}));
        procedures.value = unwrap(proceduresRes.data, []);
        analyses.value = unwrap(analysesRes.data, []);
        schedules.value = unwrap(schedulesRes.data, []);
        dailyReports.value = unwrap(reportsRes.data, []);
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudo cargar la inteligencia operativa.";
    }
    finally {
        loading.value = false;
    }
}
function prettifyProcess(value) {
    return String(value || "SIN_TIPO")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function chipColorForStatus(value) {
    const normalized = String(value || "").trim().toUpperCase();
    if (["ALERTA", "CRITICO", "CRITICA", "POR CAMBIO", "VENCIDA"].includes(normalized))
        return "error";
    if (["OBSERVACION", "PENDIENTE", "WARNING"].includes(normalized))
        return "warning";
    if (["COMPLETED", "CERRADA", "NORMAL", "OPERATIVO"].includes(normalized))
        return "success";
    return "secondary";
}
function formatCompactNumber(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric))
        return "0";
    if (Math.abs(numeric) >= 1000) {
        return new Intl.NumberFormat("es-EC", {
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(numeric);
    }
    return new Intl.NumberFormat("es-EC", {
        maximumFractionDigits: numeric % 1 === 0 ? 0 : 1,
    }).format(numeric);
}
function dayOrder(value) {
    const normalized = String(value || "").trim().toUpperCase();
    const order = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
    const index = order.indexOf(normalized);
    return index >= 0 ? index : order.length + 1;
}
const filteredAnalyses = computed(() => analyses.value.filter((item) => isInSelectedPeriod(item.fecha_reporte || item.fecha_muestra || item.created_at)));
const filteredSchedules = computed(() => schedules.value.filter((item) => overlapsSelectedPeriod(item.fecha_inicio || item.created_at, item.fecha_fin || item.fecha_inicio || item.created_at)));
const filteredDailyReports = computed(() => dailyReports.value.filter((item) => isInSelectedPeriod(item.fecha_reporte || item.created_at)));
const operationalScheduleItems = computed(() => filteredSchedules.value
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
const operationScheduleSummary = computed(() => {
    const totalHours = operationalScheduleItems.value.reduce((acc, item) => acc + Number(item?.duracion_horas || 0), 0);
    const uniqueDays = new Set(operationalScheduleItems.value.map((item) => String(item?.fecha_resuelta || "").slice(0, 10)).filter(Boolean));
    return {
        days: uniqueDays.size,
        activities: operationalScheduleItems.value.length,
        totalHours,
        hoursLabel: `${totalHours.toFixed(1)} h`,
    };
});
const breakdownChartItems = computed(() => {
    const total = Math.max(1, breakdownItems.value.reduce((acc, item) => acc + Number(item?.total || 0), 0));
    return breakdownItems.value.map((item, index) => {
        const rawValue = Number(item?.total || 0);
        return {
            key: String(item?.tipo_proceso || index),
            label: prettifyProcess(item?.tipo_proceso || "Sin tipo"),
            value: rawValue,
            valueLabel: formatCompactNumber(rawValue),
            helper: `${((rawValue / total) * 100).toFixed(1)}% del periodo`,
        };
    });
});
const processPressureChartItems = computed(() => {
    const source = processIndicatorRows.value;
    const maxValue = Math.max(...source.map((item) => Number(item?.value || 0)), 1);
    return source.map((item) => ({
        key: item.key,
        label: item.label,
        value: Number(item.value || 0),
        valueLabel: formatCompactNumber(item.value),
        helper: item.helper,
        percent: Math.max(6, Math.min(100, (Number(item.value || 0) / maxValue) * 100)),
    }));
});
const operationCadenceChartItems = computed(() => {
    const grouped = new Map();
    for (const item of operationalScheduleItems.value) {
        const dateKey = String(item?.fecha_resuelta || "").slice(0, 10);
        if (!dateKey)
            continue;
        const current = grouped.get(dateKey) ?? {
            label: new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short" }).format(parseDateValue(dateKey) ?? new Date()),
            hours: 0,
            activities: 0,
        };
        current.hours += Number(item?.duracion_horas || 0);
        current.activities += 1;
        grouped.set(dateKey, current);
    }
    const items = [...grouped.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([key, value]) => ({
        key,
        label: value.label,
        value: value.hours,
        valueLabel: `${value.hours.toFixed(1)} h`,
        helper: `${value.activities} actividad(es)`,
    }));
    const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1);
    return items.map((item) => ({
        ...item,
        percent: Math.max(8, Math.min(100, (Number(item.value || 0) / maxValue) * 100)),
    }));
});
function moduleReport(moduleKey) {
    if (moduleKey === "indicadores")
        return buildIndicatorsReport(summary);
    if (moduleKey === "procedimientos")
        return buildProceduresReport(procedures.value);
    if (moduleKey === "analisis")
        return buildLubricantReport(filteredAnalyses.value);
    if (moduleKey === "reportes")
        return buildDailyReportsReport(filteredDailyReports.value);
    return buildWeeklyScheduleReport(filteredSchedules.value);
}
function exportKey(moduleKey, format) {
    return `${moduleKey}:${format}`;
}
function isExporting(moduleKey, format) {
    return Boolean(exportState[exportKey(moduleKey, format)]);
}
async function exportModule(moduleKey, format) {
    if (!canAccessIntelligenceReports.value) {
        error.value = "No tienes permisos para exportar este reporte.";
        return;
    }
    const key = exportKey(moduleKey, format);
    exportState[key] = true;
    error.value = null;
    try {
        const report = moduleReport(moduleKey);
        if (format === "excel") {
            await downloadReportExcel(report);
        }
        else {
            await downloadReportPdf(report);
        }
    }
    catch (e) {
        error.value = e?.message || "No se pudo generar el reporte solicitado.";
    }
    finally {
        exportState[key] = false;
    }
}
function openCard(card) {
    if (card.key === "lubricantes-dashboard") {
        dashboardDialog.value = true;
        return;
    }
    if (!card.routeName)
        return;
    router.push({ name: card.routeName });
}
async function loadLubricantDashboard(params) {
    lubricantDashboardLoading.value = true;
    lubricantDashboardError.value = null;
    try {
        const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", {
            params,
        });
        lubricantDashboard.value = unwrap(data, null);
    }
    catch (e) {
        lubricantDashboardError.value =
            e?.response?.data?.message || "No se pudo cargar el dashboard de lubricantes.";
    }
    finally {
        lubricantDashboardLoading.value = false;
    }
}
async function handleDashboardSelection(value) {
    if (!value) {
        lubricantDashboard.value = null;
        return;
    }
    await loadLubricantDashboard({
        lubricante: value.lubricante,
        marca_lubricante: value.marca_lubricante,
        periodo: dashboardPeriod.value,
        from: dashboardFrom.value || undefined,
        to: dashboardTo.value || undefined,
        compartimento: dashboardCompartimento.value || undefined,
    });
}
async function reloadDashboard() {
    if (!dashboardSelection.value)
        return;
    await handleDashboardSelection(dashboardSelection.value);
}
const generatedAtLabel = computed(() => {
    if (!summary.generated_at)
        return "Sin sincronizar";
    return new Date(summary.generated_at).toLocaleString();
});
const breakdownItems = computed(() => summary.process_breakdown ?? []);
const analysesInAlert = computed(() => filteredAnalyses.value.filter((item) => String(item.estado_diagnostico || "").toUpperCase() === "ALERTA").length);
const kpiCards = computed(() => [
    {
        key: "procedimientos",
        label: "Plantillas MPG",
        value: procedures.value.length,
        helper: "Procedimientos y checklist operativos",
        icon: "mdi-file-document-multiple-outline",
        accent: "linear-gradient(135deg, rgba(47,108,171,0.18), rgba(122,184,255,0.06))",
        routeName: "inteligencia-procedimientos",
    },
    {
        key: "analisis",
        label: "Analisis lubricante",
        value: filteredAnalyses.value.length,
        helper: `${analysesInAlert.value} en alerta`,
        icon: "mdi-flask-outline",
        accent: "linear-gradient(135deg, rgba(226,79,95,0.18), rgba(255,154,165,0.06))",
        routeName: "inteligencia-analisis-lubricante",
    },
    {
        key: "lubricantes-dashboard",
        label: "Lubricantes registrados",
        value: analysisLubricantCount.value,
        helper: "Abre el dashboard predictivo por lubricante",
        icon: "mdi-oil",
        accent: "linear-gradient(135deg, rgba(162,69,216,0.18), rgba(221,156,255,0.06))",
    },
    {
        key: "componentes",
        label: "Componentes criticos",
        value: summary.kpis?.componentes_monitoreados ?? 0,
        helper: "Indicador dinamico desde reporte diario y KPI",
        icon: "mdi-engine-outline",
        accent: "linear-gradient(135deg, rgba(225,122,0,0.18), rgba(255,202,106,0.06))",
    },
    {
        key: "reportes",
        label: "Reportes diarios",
        value: operationScheduleSummary.value.days,
        helper: `${operationScheduleSummary.value.activities} actividades OPERACION/MPG`,
        icon: "mdi-text-box-check-outline",
        accent: "linear-gradient(135deg, rgba(15,143,114,0.18), rgba(109,227,191,0.06))",
    },
    {
        key: "cronogramas",
        label: "Cronogramas",
        value: filteredSchedules.value.length,
        helper: "Planificacion semanal de campo",
        icon: "mdi-calendar-week-outline",
        accent: "linear-gradient(135deg, rgba(69,88,216,0.18), rgba(157,176,255,0.06))",
    },
    {
        key: "eventos",
        label: "Eventos KPI",
        value: summary.kpis?.eventos_proceso ?? 0,
        helper: "Notificaciones y trazabilidad",
        icon: "mdi-bell-ring-outline",
        accent: "linear-gradient(135deg, rgba(244,177,131,0.22), rgba(252,228,214,0.08))",
    },
]);
const processIndicatorRows = computed(() => [
    {
        key: "vencidas",
        label: "Programaciones vencidas",
        value: summary.kpis?.programaciones_vencidas ?? 0,
        helper: "Planes detectados fuera de ventana",
    },
    {
        key: "ots",
        label: "OT pendientes",
        value: summary.kpis?.work_orders_pendientes ?? 0,
        helper: "Ordenes planificadas o en proceso",
    },
    {
        key: "eventos",
        label: "Eventos de proceso",
        value: summary.kpis?.eventos_proceso ?? 0,
        helper: "Notificaciones emitidas por flujo principal",
    },
    {
        key: "componentes",
        label: "Componentes monitoreados",
        value: summary.kpis?.componentes_monitoreados ?? 0,
        helper: "Turbos, inyectores y conjuntos mayores",
    },
]);
const recentEvents = computed(() => (summary.recent_events ?? []).map((item) => ({
    id: item.id,
    title: `${prettifyProcess(item.tipo_proceso)} · ${item.accion}`,
    subtitle: `${item.referencia_codigo || item.referencia_tabla || "Sin referencia"}${item.fecha_evento ? ` · ${new Date(item.fecha_evento).toLocaleString()}` : ""}`,
})));
const recentEventsTableRows = computed(() => (summary.recent_events ?? []).slice(0, 8).map((item) => ({
    id: item.id,
    proceso: prettifyProcess(item.tipo_proceso),
    accion: item.accion || "Sin accion",
    referencia: item.referencia_codigo || item.referencia_tabla || "Sin referencia",
    fecha: item.fecha_evento ? new Date(item.fecha_evento).toLocaleString() : "Sin fecha",
})));
const procedurePreview = computed(() => procedures.value.slice(0, 6));
const totalProcedureActivities = computed(() => procedures.value.reduce((acc, item) => acc + Number(item.actividades?.length ?? 0), 0));
const maintenanceClassesCount = computed(() => new Set(procedures.value.map((item) => item.clase_mantenimiento).filter(Boolean)).size);
const procedureDocumentCount = computed(() => new Set(procedures.value.map((item) => item.documento_referencia).filter(Boolean)).size);
const analysisDetailCount = computed(() => filteredAnalyses.value.reduce((acc, item) => acc + Number(item.detalles?.length ?? 0), 0));
const analysisLubricantCount = computed(() => new Set(filteredAnalyses.value
    .map((item) => item.lubricante || item.equipo_codigo)
    .filter(Boolean)).size);
const lubricantCatalogOptions = computed(() => [...new Map(filteredAnalyses.value
        .filter((item) => item.lubricante || item.equipo_codigo)
        .map((item) => {
        const lubricante = item.lubricante || item.equipo_codigo;
        const marca = item.marca_lubricante || item.equipo_nombre || "";
        const codigo = item.lubricante_codigo || "";
        const key = `${codigo}::${lubricante}::${marca}`;
        return [
            key,
            {
                key,
                lubricante,
                marca_lubricante: marca || null,
                lubricante_codigo: codigo || null,
                label: [codigo, lubricante, marca].filter(Boolean).join(" · "),
            },
        ];
    })).values()]);
const dashboardCompartimentos = lubricantCompartments;
const analysisPreview = computed(() => filteredAnalyses.value.slice(0, 6));
const latestDailyReport = computed(() => filteredDailyReports.value[0] ?? null);
const latestDailyUnits = computed(() => (latestDailyReport.value?.unidades ?? []).slice(0, 6));
const latestDailyFuel = computed(() => (latestDailyReport.value?.combustibles ?? []).slice(0, 4));
const latestDailyComponents = computed(() => (latestDailyReport.value?.componentes ?? []).slice(0, 4));
const latestSchedule = computed(() => filteredSchedules.value[0] ?? null);
const scheduleWeek = computed(() => {
    const base = [
        { key: "LUNES", label: "Lunes", items: [] },
        { key: "MARTES", label: "Martes", items: [] },
        { key: "MIERCOLES", label: "Miercoles", items: [] },
        { key: "JUEVES", label: "Jueves", items: [] },
        { key: "VIERNES", label: "Viernes", items: [] },
        { key: "SABADO", label: "Sabado", items: [] },
        { key: "DOMINGO", label: "Domingo", items: [] },
    ];
    const lookup = new Map(base.map((item) => [item.key, item]));
    const details = [...(latestSchedule.value?.detalles ?? [])].sort((a, b) => dayOrder(a.dia_semana) - dayOrder(b.dia_semana) ||
        String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")));
    for (const item of details) {
        const key = String(item.dia_semana || "").trim().toUpperCase();
        const target = lookup.get(key) || base[0];
        target.items.push(item);
    }
    return base;
});
onMounted(() => {
    loadIntelligence();
});
watch([selectedYear, selectedMonth], () => {
    loadIntelligence();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['intelligence-kpi--clickable']} */ ;
/** @type {__VLS_StyleScopedClasses['intelligence-kpi--clickable']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
/** @type {__VLS_StyleScopedClasses['intelligence-page']} */ ;
/** @type {__VLS_StyleScopedClasses['indicator-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['breakdown-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['schedule-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['indicator-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['breakdown-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['schedule-day']} */ ;
/** @type {__VLS_StyleScopedClasses['intelligence-filter-toolbar__select']} */ ;
/** @type {__VLS_StyleScopedClasses['intelligence-filter-toolbar__select--month']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "intelligence-page" },
});
/** @type {__VLS_StyleScopedClasses['intelligence-page']} */ ;
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
else if (!__VLS_ctx.canAccessIntelligenceReports) {
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
    [canAccessIntelligenceReports,];
    var __VLS_9;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "intelligence-page__content" },
    });
    /** @type {__VLS_StyleScopedClasses['intelligence-page__content']} */ ;
    let __VLS_12;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface intelligence-hero" },
    }));
    const __VLS_14 = __VLS_13({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface intelligence-hero" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-hero']} */ ;
    const { default: __VLS_17 } = __VLS_15.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between intelligence-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
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
        ...{ class: "d-flex align-center intelligence-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        label: true,
        color: "primary",
        variant: "tonal",
    }));
    const __VLS_20 = __VLS_19({
        label: true,
        color: "primary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    const { default: __VLS_23 } = __VLS_21.slots;
    (__VLS_ctx.generatedAtLabel);
    // @ts-ignore
    [generatedAtLabel,];
    var __VLS_21;
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('indicadores', 'excel')),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('indicadores', 'excel')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_29;
    const __VLS_30 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('indicadores', 'excel');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_31 } = __VLS_27.slots;
    // @ts-ignore
    [];
    var __VLS_27;
    var __VLS_28;
    let __VLS_32;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('indicadores', 'pdf')),
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        color: "secondary",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('indicadores', 'pdf')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_37;
    const __VLS_38 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('indicadores', 'pdf');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_39 } = __VLS_35.slots;
    // @ts-ignore
    [];
    var __VLS_35;
    var __VLS_36;
    let __VLS_40;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent1(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        color: "primary",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        color: "primary",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_45;
    const __VLS_46 = ({ click: {} },
        { onClick: (__VLS_ctx.loadIntelligence) });
    const { default: __VLS_47 } = __VLS_43.slots;
    // @ts-ignore
    [loading, loadIntelligence,];
    var __VLS_43;
    var __VLS_44;
    if (__VLS_ctx.error) {
        let __VLS_48;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
            type: "warning",
            variant: "tonal",
            ...{ class: "mt-4" },
            text: (__VLS_ctx.error),
        }));
        const __VLS_50 = __VLS_49({
            type: "warning",
            variant: "tonal",
            ...{ class: "mt-4" },
            text: (__VLS_ctx.error),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center flex-wrap intelligence-filter-toolbar mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-filter-toolbar']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    let __VLS_53;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_54 = __VLS_asFunctionalComponent1(__VLS_53, new __VLS_53({
        modelValue: (__VLS_ctx.selectedYear),
        items: (__VLS_ctx.yearOptions),
        label: "Año",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "intelligence-filter-toolbar__select" },
    }));
    const __VLS_55 = __VLS_54({
        modelValue: (__VLS_ctx.selectedYear),
        items: (__VLS_ctx.yearOptions),
        label: "Año",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "intelligence-filter-toolbar__select" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_54));
    /** @type {__VLS_StyleScopedClasses['intelligence-filter-toolbar__select']} */ ;
    let __VLS_58;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
        modelValue: (__VLS_ctx.selectedMonth),
        items: (__VLS_ctx.monthOptions),
        label: "Mes",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "intelligence-filter-toolbar__select intelligence-filter-toolbar__select--month" },
    }));
    const __VLS_60 = __VLS_59({
        modelValue: (__VLS_ctx.selectedMonth),
        items: (__VLS_ctx.monthOptions),
        label: "Mes",
        density: "comfortable",
        hideDetails: true,
        variant: "outlined",
        ...{ class: "intelligence-filter-toolbar__select intelligence-filter-toolbar__select--month" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    /** @type {__VLS_StyleScopedClasses['intelligence-filter-toolbar__select']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-filter-toolbar__select--month']} */ ;
    let __VLS_63;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
        label: true,
        color: "secondary",
        variant: "tonal",
    }));
    const __VLS_65 = __VLS_64({
        label: true,
        color: "secondary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    const { default: __VLS_68 } = __VLS_66.slots;
    (__VLS_ctx.selectedPeriodLabel);
    // @ts-ignore
    [error, error, selectedYear, yearOptions, selectedMonth, monthOptions, selectedPeriodLabel,];
    var __VLS_66;
    let __VLS_69;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
        dense: true,
        ...{ class: "mt-3" },
    }));
    const __VLS_71 = __VLS_70({
        dense: true,
        ...{ class: "mt-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_70));
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    const { default: __VLS_74 } = __VLS_72.slots;
    for (const [card] of __VLS_vFor((__VLS_ctx.kpiCards))) {
        let __VLS_75;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
            key: (card.key),
            cols: "12",
            sm: "6",
            xl: "2",
        }));
        const __VLS_77 = __VLS_76({
            key: (card.key),
            cols: "12",
            sm: "6",
            xl: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        const { default: __VLS_80 } = __VLS_78.slots;
        let __VLS_81;
        /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
        vCard;
        // @ts-ignore
        const __VLS_82 = __VLS_asFunctionalComponent1(__VLS_81, new __VLS_81({
            ...{ 'onClick': {} },
            ...{ 'onKeydown': {} },
            ...{ 'onKeydown': {} },
            rounded: "lg",
            variant: "outlined",
            ...{ class: (['pa-4', 'kpi-card', 'h-100', { 'intelligence-kpi--clickable': Boolean(card.routeName || card.key === 'lubricantes-dashboard') }]) },
            ...{ style: ({ '--kpi-accent': card.accent }) },
            role: (card.routeName || card.key === 'lubricantes-dashboard' ? 'button' : undefined),
            tabindex: (card.routeName || card.key === 'lubricantes-dashboard' ? 0 : undefined),
        }));
        const __VLS_83 = __VLS_82({
            ...{ 'onClick': {} },
            ...{ 'onKeydown': {} },
            ...{ 'onKeydown': {} },
            rounded: "lg",
            variant: "outlined",
            ...{ class: (['pa-4', 'kpi-card', 'h-100', { 'intelligence-kpi--clickable': Boolean(card.routeName || card.key === 'lubricantes-dashboard') }]) },
            ...{ style: ({ '--kpi-accent': card.accent }) },
            role: (card.routeName || card.key === 'lubricantes-dashboard' ? 'button' : undefined),
            tabindex: (card.routeName || card.key === 'lubricantes-dashboard' ? 0 : undefined),
        }, ...__VLS_functionalComponentArgsRest(__VLS_82));
        let __VLS_86;
        const __VLS_87 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                        return;
                    __VLS_ctx.openCard(card);
                    // @ts-ignore
                    [kpiCards, openCard,];
                } });
        const __VLS_88 = ({ keydown: {} },
            { onKeydown: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                        return;
                    __VLS_ctx.openCard(card);
                    // @ts-ignore
                    [openCard,];
                } });
        const __VLS_89 = ({ keydown: {} },
            { onKeydown: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                        return;
                    __VLS_ctx.openCard(card);
                    // @ts-ignore
                    [openCard,];
                } });
        /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['intelligence-kpi--clickable']} */ ;
        const { default: __VLS_90 } = __VLS_84.slots;
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
        let __VLS_91;
        /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
        vIcon;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent1(__VLS_91, new __VLS_91({
            icon: (card.icon),
            size: "20",
        }));
        const __VLS_93 = __VLS_92({
            icon: (card.icon),
            size: "20",
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
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
        if (card.routeName || card.key === 'lubricantes-dashboard') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-primary mt-3" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        }
        // @ts-ignore
        [];
        var __VLS_84;
        var __VLS_85;
        // @ts-ignore
        [];
        var __VLS_78;
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_72;
    // @ts-ignore
    [];
    var __VLS_15;
    let __VLS_96;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent1(__VLS_96, new __VLS_96({
        ...{ class: "mb-1" },
    }));
    const __VLS_98 = __VLS_97({
        ...{ class: "mb-1" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    const { default: __VLS_101 } = __VLS_99.slots;
    let __VLS_102;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_104 = __VLS_103({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    const { default: __VLS_107 } = __VLS_105.slots;
    const __VLS_108 = DashboardBarChartCard;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
        title: "Distribucion por proceso",
        subtitle: "Peso de cada frente operativo dentro del periodo",
        chipLabel: (`${__VLS_ctx.breakdownItems.length} procesos`),
        chipColor: "primary",
        items: (__VLS_ctx.breakdownChartItems),
        emptyText: "Sin eventos documentados para graficar.",
    }));
    const __VLS_110 = __VLS_109({
        title: "Distribucion por proceso",
        subtitle: "Peso de cada frente operativo dentro del periodo",
        chipLabel: (`${__VLS_ctx.breakdownItems.length} procesos`),
        chipColor: "primary",
        items: (__VLS_ctx.breakdownChartItems),
        emptyText: "Sin eventos documentados para graficar.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    // @ts-ignore
    [breakdownItems, breakdownChartItems,];
    var __VLS_105;
    let __VLS_113;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
        cols: "12",
        md: "6",
        xl: "4",
    }));
    const __VLS_115 = __VLS_114({
        cols: "12",
        md: "6",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_114));
    const { default: __VLS_118 } = __VLS_116.slots;
    const __VLS_119 = DashboardBarChartCard;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
        title: "Presion operativa",
        subtitle: "Backlog, eventos y monitoreo critico",
        chipLabel: (`${__VLS_ctx.processIndicatorRows.length} KPI`),
        chipColor: "warning",
        items: (__VLS_ctx.processPressureChartItems),
        emptyText: "No hay indicadores operativos para comparar.",
    }));
    const __VLS_121 = __VLS_120({
        title: "Presion operativa",
        subtitle: "Backlog, eventos y monitoreo critico",
        chipLabel: (`${__VLS_ctx.processIndicatorRows.length} KPI`),
        chipColor: "warning",
        items: (__VLS_ctx.processPressureChartItems),
        emptyText: "No hay indicadores operativos para comparar.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    // @ts-ignore
    [processIndicatorRows, processPressureChartItems,];
    var __VLS_116;
    let __VLS_124;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({
        cols: "12",
        xl: "4",
    }));
    const __VLS_126 = __VLS_125({
        cols: "12",
        xl: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    const { default: __VLS_129 } = __VLS_127.slots;
    const __VLS_130 = DashboardBarChartCard;
    // @ts-ignore
    const __VLS_131 = __VLS_asFunctionalComponent1(__VLS_130, new __VLS_130({
        title: "Cadencia operativa",
        subtitle: "Horas programadas por dia en OPERACION y MPG",
        chipLabel: (__VLS_ctx.operationScheduleSummary.hoursLabel),
        chipColor: "success",
        items: (__VLS_ctx.operationCadenceChartItems),
        emptyText: "No hay actividades OPERACION/MPG para el periodo seleccionado.",
    }));
    const __VLS_132 = __VLS_131({
        title: "Cadencia operativa",
        subtitle: "Horas programadas por dia en OPERACION y MPG",
        chipLabel: (__VLS_ctx.operationScheduleSummary.hoursLabel),
        chipColor: "success",
        items: (__VLS_ctx.operationCadenceChartItems),
        emptyText: "No hay actividades OPERACION/MPG para el periodo seleccionado.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_131));
    // @ts-ignore
    [operationScheduleSummary, operationCadenceChartItems,];
    var __VLS_127;
    // @ts-ignore
    [];
    var __VLS_99;
    let __VLS_135;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({}));
    const __VLS_137 = __VLS_136({}, ...__VLS_functionalComponentArgsRest(__VLS_136));
    const { default: __VLS_140 } = __VLS_138.slots;
    let __VLS_141;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({
        cols: "12",
        lg: "4",
    }));
    const __VLS_143 = __VLS_142({
        cols: "12",
        lg: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_142));
    const { default: __VLS_146 } = __VLS_144.slots;
    let __VLS_147;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_149 = __VLS_148({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_152 } = __VLS_150.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3 intelligence-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
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
    let __VLS_153;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_154 = __VLS_asFunctionalComponent1(__VLS_153, new __VLS_153({
        label: true,
        color: "secondary",
        variant: "tonal",
    }));
    const __VLS_155 = __VLS_154({
        label: true,
        color: "secondary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_154));
    const { default: __VLS_158 } = __VLS_156.slots;
    (__VLS_ctx.processIndicatorRows.length);
    // @ts-ignore
    [processIndicatorRows,];
    var __VLS_156;
    if (__VLS_ctx.loading) {
        const __VLS_159 = LoadingTableState;
        // @ts-ignore
        const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
            message: "Cargando indicadores de proceso...",
            rows: (4),
            columns: (2),
        }));
        const __VLS_161 = __VLS_160({
            message: "Cargando indicadores de proceso...",
            rows: (4),
            columns: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "indicator-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['indicator-grid']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.processIndicatorRows))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (item.key),
                ...{ class: "indicator-tile" },
            });
            /** @type {__VLS_StyleScopedClasses['indicator-tile']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (item.label);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-h6 font-weight-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            (item.value);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (item.helper);
            // @ts-ignore
            [loading, processIndicatorRows,];
        }
    }
    let __VLS_164;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent1(__VLS_164, new __VLS_164({
        ...{ class: "my-4" },
    }));
    const __VLS_166 = __VLS_165({
        ...{ class: "my-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    /** @type {__VLS_StyleScopedClasses['my-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-medium mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    if (__VLS_ctx.loading) {
        const __VLS_169 = LoadingTableState;
        // @ts-ignore
        const __VLS_170 = __VLS_asFunctionalComponent1(__VLS_169, new __VLS_169({
            message: "Cargando distribución por proceso...",
            rows: (3),
            columns: (2),
        }));
        const __VLS_171 = __VLS_170({
            message: "Cargando distribución por proceso...",
            rows: (3),
            columns: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_170));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "breakdown-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['breakdown-grid']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.breakdownItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (item.tipo_proceso),
                ...{ class: "breakdown-chip" },
            });
            /** @type {__VLS_StyleScopedClasses['breakdown-chip']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (__VLS_ctx.prettifyProcess(item.tipo_proceso));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-h6 font-weight-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            (item.total);
            // @ts-ignore
            [loading, breakdownItems, prettifyProcess,];
        }
        if (!__VLS_ctx.breakdownItems.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-body-2 text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        }
    }
    // @ts-ignore
    [breakdownItems,];
    var __VLS_150;
    // @ts-ignore
    [];
    var __VLS_144;
    let __VLS_174;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_175 = __VLS_asFunctionalComponent1(__VLS_174, new __VLS_174({
        cols: "12",
        lg: "8",
    }));
    const __VLS_176 = __VLS_175({
        cols: "12",
        lg: "8",
    }, ...__VLS_functionalComponentArgsRest(__VLS_175));
    const { default: __VLS_179 } = __VLS_177.slots;
    let __VLS_180;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent1(__VLS_180, new __VLS_180({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_182 = __VLS_181({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_185 } = __VLS_183.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3 intelligence-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
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
    let __VLS_186;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_187 = __VLS_asFunctionalComponent1(__VLS_186, new __VLS_186({
        label: true,
        color: "secondary",
        variant: "tonal",
    }));
    const __VLS_188 = __VLS_187({
        label: true,
        color: "secondary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_187));
    const { default: __VLS_191 } = __VLS_189.slots;
    (__VLS_ctx.recentEvents.length);
    // @ts-ignore
    [recentEvents,];
    var __VLS_189;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-strip mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_192;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent1(__VLS_192, new __VLS_192({
        size: "small",
        label: true,
        color: "secondary",
        variant: "tonal",
    }));
    const __VLS_194 = __VLS_193({
        size: "small",
        label: true,
        color: "secondary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    const { default: __VLS_197 } = __VLS_195.slots;
    (__VLS_ctx.recentEvents.length);
    // @ts-ignore
    [recentEvents,];
    var __VLS_195;
    let __VLS_198;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent1(__VLS_198, new __VLS_198({
        size: "small",
        label: true,
        color: "info",
        variant: "tonal",
    }));
    const __VLS_200 = __VLS_199({
        size: "small",
        label: true,
        color: "info",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    const { default: __VLS_203 } = __VLS_201.slots;
    (__VLS_ctx.breakdownItems.length);
    // @ts-ignore
    [breakdownItems,];
    var __VLS_201;
    let __VLS_204;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent1(__VLS_204, new __VLS_204({
        size: "small",
        label: true,
        color: "success",
        variant: "tonal",
    }));
    const __VLS_206 = __VLS_205({
        size: "small",
        label: true,
        color: "success",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    const { default: __VLS_209 } = __VLS_207.slots;
    (__VLS_ctx.generatedAtLabel);
    // @ts-ignore
    [generatedAtLabel,];
    var __VLS_207;
    if (__VLS_ctx.loading) {
        const __VLS_210 = LoadingTableState;
        // @ts-ignore
        const __VLS_211 = __VLS_asFunctionalComponent1(__VLS_210, new __VLS_210({
            message: "Cargando eventos recientes...",
            rows: (5),
            columns: (4),
        }));
        const __VLS_212 = __VLS_211({
            message: "Cargando eventos recientes...",
            rows: (5),
            columns: (4),
        }, ...__VLS_functionalComponentArgsRest(__VLS_211));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_215;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_216 = __VLS_asFunctionalComponent1(__VLS_215, new __VLS_215({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_217 = __VLS_216({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_216));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_220 } = __VLS_218.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [item] of __VLS_vFor((__VLS_ctx.recentEventsTableRows))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (item.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (item.proceso);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.accion);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.referencia);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (item.fecha);
            // @ts-ignore
            [loading, recentEventsTableRows,];
        }
        if (!__VLS_ctx.recentEventsTableRows.length) {
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
        [recentEventsTableRows,];
        var __VLS_218;
    }
    // @ts-ignore
    [];
    var __VLS_183;
    // @ts-ignore
    [];
    var __VLS_177;
    // @ts-ignore
    [];
    var __VLS_138;
    let __VLS_221;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_222 = __VLS_asFunctionalComponent1(__VLS_221, new __VLS_221({}));
    const __VLS_223 = __VLS_222({}, ...__VLS_functionalComponentArgsRest(__VLS_222));
    const { default: __VLS_226 } = __VLS_224.slots;
    let __VLS_227;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_228 = __VLS_asFunctionalComponent1(__VLS_227, new __VLS_227({
        cols: "12",
        xl: "6",
    }));
    const __VLS_229 = __VLS_228({
        cols: "12",
        xl: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_228));
    const { default: __VLS_232 } = __VLS_230.slots;
    let __VLS_233;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_234 = __VLS_asFunctionalComponent1(__VLS_233, new __VLS_233({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_235 = __VLS_234({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_234));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_238 } = __VLS_236.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-4 intelligence-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
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
        ...{ class: "d-flex align-center intelligence-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
    let __VLS_239;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_240 = __VLS_asFunctionalComponent1(__VLS_239, new __VLS_239({
        label: true,
        color: "primary",
        variant: "tonal",
    }));
    const __VLS_241 = __VLS_240({
        label: true,
        color: "primary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_240));
    const { default: __VLS_244 } = __VLS_242.slots;
    (__VLS_ctx.procedures.length);
    // @ts-ignore
    [procedures,];
    var __VLS_242;
    let __VLS_245;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_246 = __VLS_asFunctionalComponent1(__VLS_245, new __VLS_245({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('procedimientos', 'excel')),
    }));
    const __VLS_247 = __VLS_246({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('procedimientos', 'excel')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_246));
    let __VLS_250;
    const __VLS_251 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('procedimientos', 'excel');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_252 } = __VLS_248.slots;
    // @ts-ignore
    [];
    var __VLS_248;
    var __VLS_249;
    let __VLS_253;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_254 = __VLS_asFunctionalComponent1(__VLS_253, new __VLS_253({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('procedimientos', 'pdf')),
    }));
    const __VLS_255 = __VLS_254({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('procedimientos', 'pdf')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_254));
    let __VLS_258;
    const __VLS_259 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('procedimientos', 'pdf');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_260 } = __VLS_256.slots;
    // @ts-ignore
    [];
    var __VLS_256;
    var __VLS_257;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-strip mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    let __VLS_261;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_262 = __VLS_asFunctionalComponent1(__VLS_261, new __VLS_261({
        label: true,
        color: "secondary",
        variant: "tonal",
    }));
    const __VLS_263 = __VLS_262({
        label: true,
        color: "secondary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_262));
    const { default: __VLS_266 } = __VLS_264.slots;
    (__VLS_ctx.totalProcedureActivities);
    // @ts-ignore
    [totalProcedureActivities,];
    var __VLS_264;
    let __VLS_267;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
        label: true,
        color: "info",
        variant: "tonal",
    }));
    const __VLS_269 = __VLS_268({
        label: true,
        color: "info",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_268));
    const { default: __VLS_272 } = __VLS_270.slots;
    (__VLS_ctx.maintenanceClassesCount);
    // @ts-ignore
    [maintenanceClassesCount,];
    var __VLS_270;
    let __VLS_273;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_274 = __VLS_asFunctionalComponent1(__VLS_273, new __VLS_273({
        label: true,
        color: "success",
        variant: "tonal",
    }));
    const __VLS_275 = __VLS_274({
        label: true,
        color: "success",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_274));
    const { default: __VLS_278 } = __VLS_276.slots;
    (__VLS_ctx.procedureDocumentCount);
    // @ts-ignore
    [procedureDocumentCount,];
    var __VLS_276;
    if (__VLS_ctx.loading) {
        const __VLS_279 = LoadingTableState;
        // @ts-ignore
        const __VLS_280 = __VLS_asFunctionalComponent1(__VLS_279, new __VLS_279({
            message: "Cargando plantillas MPG...",
            rows: (5),
            columns: (5),
        }));
        const __VLS_281 = __VLS_280({
            message: "Cargando plantillas MPG...",
            rows: (5),
            columns: (5),
        }, ...__VLS_functionalComponentArgsRest(__VLS_280));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_284;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_285 = __VLS_asFunctionalComponent1(__VLS_284, new __VLS_284({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_286 = __VLS_285({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_285));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_289 } = __VLS_287.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [item] of __VLS_vFor((__VLS_ctx.procedurePreview))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (item.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.codigo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (item.nombre);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (__VLS_ctx.prettifyProcess(item.tipo_proceso));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.frecuencia_horas ? `${item.frecuencia_horas} H` : "N/A");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.actividades?.length ?? 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.documento_referencia || "Sin referencia");
            // @ts-ignore
            [loading, prettifyProcess, procedurePreview,];
        }
        if (!__VLS_ctx.procedurePreview.length) {
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
        [procedurePreview,];
        var __VLS_287;
    }
    // @ts-ignore
    [];
    var __VLS_236;
    // @ts-ignore
    [];
    var __VLS_230;
    let __VLS_290;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_291 = __VLS_asFunctionalComponent1(__VLS_290, new __VLS_290({
        cols: "12",
        xl: "6",
    }));
    const __VLS_292 = __VLS_291({
        cols: "12",
        xl: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_291));
    const { default: __VLS_295 } = __VLS_293.slots;
    let __VLS_296;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent1(__VLS_296, new __VLS_296({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_298 = __VLS_297({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_301 } = __VLS_299.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-4 intelligence-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
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
        ...{ class: "d-flex align-center intelligence-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
    let __VLS_302;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_303 = __VLS_asFunctionalComponent1(__VLS_302, new __VLS_302({
        label: true,
        color: "warning",
        variant: "tonal",
    }));
    const __VLS_304 = __VLS_303({
        label: true,
        color: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_303));
    const { default: __VLS_307 } = __VLS_305.slots;
    (__VLS_ctx.filteredAnalyses.length);
    // @ts-ignore
    [filteredAnalyses,];
    var __VLS_305;
    let __VLS_308;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent1(__VLS_308, new __VLS_308({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('analisis', 'excel')),
    }));
    const __VLS_310 = __VLS_309({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('analisis', 'excel')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    let __VLS_313;
    const __VLS_314 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('analisis', 'excel');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_315 } = __VLS_311.slots;
    // @ts-ignore
    [];
    var __VLS_311;
    var __VLS_312;
    let __VLS_316;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent1(__VLS_316, new __VLS_316({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('analisis', 'pdf')),
    }));
    const __VLS_318 = __VLS_317({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('analisis', 'pdf')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    let __VLS_321;
    const __VLS_322 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('analisis', 'pdf');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_323 } = __VLS_319.slots;
    // @ts-ignore
    [];
    var __VLS_319;
    var __VLS_320;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-strip mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    let __VLS_324;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent1(__VLS_324, new __VLS_324({
        label: true,
        color: "error",
        variant: "tonal",
    }));
    const __VLS_326 = __VLS_325({
        label: true,
        color: "error",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    const { default: __VLS_329 } = __VLS_327.slots;
    (__VLS_ctx.analysesInAlert);
    // @ts-ignore
    [analysesInAlert,];
    var __VLS_327;
    let __VLS_330;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_331 = __VLS_asFunctionalComponent1(__VLS_330, new __VLS_330({
        label: true,
        color: "secondary",
        variant: "tonal",
    }));
    const __VLS_332 = __VLS_331({
        label: true,
        color: "secondary",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_331));
    const { default: __VLS_335 } = __VLS_333.slots;
    (__VLS_ctx.analysisDetailCount);
    // @ts-ignore
    [analysisDetailCount,];
    var __VLS_333;
    let __VLS_336;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent1(__VLS_336, new __VLS_336({
        label: true,
        color: "success",
        variant: "tonal",
    }));
    const __VLS_338 = __VLS_337({
        label: true,
        color: "success",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    const { default: __VLS_341 } = __VLS_339.slots;
    (__VLS_ctx.analysisLubricantCount);
    // @ts-ignore
    [analysisLubricantCount,];
    var __VLS_339;
    if (__VLS_ctx.loading) {
        const __VLS_342 = LoadingTableState;
        // @ts-ignore
        const __VLS_343 = __VLS_asFunctionalComponent1(__VLS_342, new __VLS_342({
            message: "Cargando análisis de lubricante...",
            rows: (5),
            columns: (5),
        }));
        const __VLS_344 = __VLS_343({
            message: "Cargando análisis de lubricante...",
            rows: (5),
            columns: (5),
        }, ...__VLS_functionalComponentArgsRest(__VLS_343));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_347;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_348 = __VLS_asFunctionalComponent1(__VLS_347, new __VLS_347({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_349 = __VLS_348({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_348));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_352 } = __VLS_350.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [item] of __VLS_vFor((__VLS_ctx.analysisPreview))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (item.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.codigo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (item.lubricante || item.equipo_codigo || "Sin lubricante");
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (item.marca_lubricante || item.equipo_nombre || "Sin marca");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.compartimento_principal || "Sin compartimento");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            let __VLS_353;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_354 = __VLS_asFunctionalComponent1(__VLS_353, new __VLS_353({
                size: "small",
                color: (__VLS_ctx.chipColorForStatus(item.estado_diagnostico)),
                variant: "tonal",
            }));
            const __VLS_355 = __VLS_354({
                size: "small",
                color: (__VLS_ctx.chipColorForStatus(item.estado_diagnostico)),
                variant: "tonal",
            }, ...__VLS_functionalComponentArgsRest(__VLS_354));
            const { default: __VLS_358 } = __VLS_356.slots;
            (item.estado_diagnostico || "NORMAL");
            // @ts-ignore
            [loading, analysisPreview, chipColorForStatus,];
            var __VLS_356;
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (item.fecha_reporte || "Sin fecha");
            // @ts-ignore
            [];
        }
        if (!__VLS_ctx.analysisPreview.length) {
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
        [analysisPreview,];
        var __VLS_350;
    }
    // @ts-ignore
    [];
    var __VLS_299;
    // @ts-ignore
    [];
    var __VLS_293;
    // @ts-ignore
    [];
    var __VLS_224;
    let __VLS_359;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_360 = __VLS_asFunctionalComponent1(__VLS_359, new __VLS_359({}));
    const __VLS_361 = __VLS_360({}, ...__VLS_functionalComponentArgsRest(__VLS_360));
    const { default: __VLS_364 } = __VLS_362.slots;
    let __VLS_365;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_366 = __VLS_asFunctionalComponent1(__VLS_365, new __VLS_365({
        cols: "12",
    }));
    const __VLS_367 = __VLS_366({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_366));
    const { default: __VLS_370 } = __VLS_368.slots;
    let __VLS_371;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_372 = __VLS_asFunctionalComponent1(__VLS_371, new __VLS_371({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }));
    const __VLS_373 = __VLS_372({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface h-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_372));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
    const { default: __VLS_376 } = __VLS_374.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-4 intelligence-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
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
        ...{ class: "d-flex align-center intelligence-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
    let __VLS_377;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_378 = __VLS_asFunctionalComponent1(__VLS_377, new __VLS_377({
        label: true,
        color: "success",
        variant: "tonal",
    }));
    const __VLS_379 = __VLS_378({
        label: true,
        color: "success",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_378));
    const { default: __VLS_382 } = __VLS_380.slots;
    (__VLS_ctx.filteredDailyReports.length);
    // @ts-ignore
    [filteredDailyReports,];
    var __VLS_380;
    let __VLS_383;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_384 = __VLS_asFunctionalComponent1(__VLS_383, new __VLS_383({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('reportes', 'excel')),
    }));
    const __VLS_385 = __VLS_384({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('reportes', 'excel')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_384));
    let __VLS_388;
    const __VLS_389 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('reportes', 'excel');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_390 } = __VLS_386.slots;
    // @ts-ignore
    [];
    var __VLS_386;
    var __VLS_387;
    let __VLS_391;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_392 = __VLS_asFunctionalComponent1(__VLS_391, new __VLS_391({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('reportes', 'pdf')),
    }));
    const __VLS_393 = __VLS_392({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('reportes', 'pdf')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_392));
    let __VLS_396;
    const __VLS_397 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('reportes', 'pdf');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_398 } = __VLS_394.slots;
    // @ts-ignore
    [];
    var __VLS_394;
    var __VLS_395;
    if (__VLS_ctx.loading) {
        const __VLS_399 = LoadingTableState;
        // @ts-ignore
        const __VLS_400 = __VLS_asFunctionalComponent1(__VLS_399, new __VLS_399({
            message: "Cargando reporte diario de operación...",
            rows: (5),
            columns: (3),
        }));
        const __VLS_401 = __VLS_400({
            message: "Cargando reporte diario de operación...",
            rows: (5),
            columns: (3),
        }, ...__VLS_functionalComponentArgsRest(__VLS_400));
    }
    else if (__VLS_ctx.latestDailyReport) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "summary-strip mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        let __VLS_404;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_405 = __VLS_asFunctionalComponent1(__VLS_404, new __VLS_404({
            label: true,
            color: "primary",
            variant: "tonal",
        }));
        const __VLS_406 = __VLS_405({
            label: true,
            color: "primary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_405));
        const { default: __VLS_409 } = __VLS_407.slots;
        (__VLS_ctx.latestDailyReport.codigo);
        // @ts-ignore
        [loading, latestDailyReport, latestDailyReport,];
        var __VLS_407;
        let __VLS_410;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_411 = __VLS_asFunctionalComponent1(__VLS_410, new __VLS_410({
            label: true,
            color: "info",
            variant: "tonal",
        }));
        const __VLS_412 = __VLS_411({
            label: true,
            color: "info",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_411));
        const { default: __VLS_415 } = __VLS_413.slots;
        (__VLS_ctx.latestDailyReport.fecha_reporte);
        // @ts-ignore
        [latestDailyReport,];
        var __VLS_413;
        let __VLS_416;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_417 = __VLS_asFunctionalComponent1(__VLS_416, new __VLS_416({
            label: true,
            color: "secondary",
            variant: "tonal",
        }));
        const __VLS_418 = __VLS_417({
            label: true,
            color: "secondary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_417));
        const { default: __VLS_421 } = __VLS_419.slots;
        (__VLS_ctx.latestDailyReport.turno || "Sin turno");
        // @ts-ignore
        [latestDailyReport,];
        var __VLS_419;
        let __VLS_422;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_423 = __VLS_asFunctionalComponent1(__VLS_422, new __VLS_422({
            label: true,
            color: "success",
            variant: "tonal",
        }));
        const __VLS_424 = __VLS_423({
            label: true,
            color: "success",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_423));
        const { default: __VLS_427 } = __VLS_425.slots;
        (__VLS_ctx.latestDailyReport.unidades?.length ?? 0);
        // @ts-ignore
        [latestDailyReport,];
        var __VLS_425;
        let __VLS_428;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_429 = __VLS_asFunctionalComponent1(__VLS_428, new __VLS_428({
            label: true,
            color: "warning",
            variant: "tonal",
        }));
        const __VLS_430 = __VLS_429({
            label: true,
            color: "warning",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_429));
        const { default: __VLS_433 } = __VLS_431.slots;
        (__VLS_ctx.latestDailyReport.combustibles?.length ?? 0);
        // @ts-ignore
        [latestDailyReport,];
        var __VLS_431;
        let __VLS_434;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_435 = __VLS_asFunctionalComponent1(__VLS_434, new __VLS_434({
            label: true,
            color: "error",
            variant: "tonal",
        }));
        const __VLS_436 = __VLS_435({
            label: true,
            color: "error",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_435));
        const { default: __VLS_439 } = __VLS_437.slots;
        (__VLS_ctx.latestDailyReport.componentes?.length ?? 0);
        // @ts-ignore
        [latestDailyReport,];
        var __VLS_437;
        let __VLS_440;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_441 = __VLS_asFunctionalComponent1(__VLS_440, new __VLS_440({
            label: true,
            color: "primary",
            variant: "tonal",
        }));
        const __VLS_442 = __VLS_441({
            label: true,
            color: "primary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_441));
        const { default: __VLS_445 } = __VLS_443.slots;
        (__VLS_ctx.operationScheduleSummary.days);
        // @ts-ignore
        [operationScheduleSummary,];
        var __VLS_443;
        let __VLS_446;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_447 = __VLS_asFunctionalComponent1(__VLS_446, new __VLS_446({
            label: true,
            color: "secondary",
            variant: "tonal",
        }));
        const __VLS_448 = __VLS_447({
            label: true,
            color: "secondary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_447));
        const { default: __VLS_451 } = __VLS_449.slots;
        (__VLS_ctx.operationScheduleSummary.activities);
        // @ts-ignore
        [operationScheduleSummary,];
        var __VLS_449;
        let __VLS_452;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_453 = __VLS_asFunctionalComponent1(__VLS_452, new __VLS_452({
            label: true,
            color: "info",
            variant: "tonal",
        }));
        const __VLS_454 = __VLS_453({
            label: true,
            color: "info",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_453));
        const { default: __VLS_457 } = __VLS_455.slots;
        (__VLS_ctx.operationScheduleSummary.hoursLabel);
        // @ts-ignore
        [operationScheduleSummary,];
        var __VLS_455;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-mini-bars mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.operationCadenceChartItems))) {
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
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (item.valueLabel);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__track" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__track']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                ...{ class: "dashboard-mini-bars__fill dashboard-mini-bars__fill--success" },
                ...{ style: ({ width: `${item.percent}%` }) },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__fill']} */ ;
            /** @type {__VLS_StyleScopedClasses['dashboard-mini-bars__fill--success']} */ ;
            // @ts-ignore
            [operationCadenceChartItems,];
        }
        if (!__VLS_ctx.operationCadenceChartItems.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-body-2 text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        }
        let __VLS_458;
        /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
        vRow;
        // @ts-ignore
        const __VLS_459 = __VLS_asFunctionalComponent1(__VLS_458, new __VLS_458({
            dense: true,
        }));
        const __VLS_460 = __VLS_459({
            dense: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_459));
        const { default: __VLS_463 } = __VLS_461.slots;
        let __VLS_464;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_465 = __VLS_asFunctionalComponent1(__VLS_464, new __VLS_464({
            cols: "12",
            md: "7",
        }));
        const __VLS_466 = __VLS_465({
            cols: "12",
            md: "7",
        }, ...__VLS_functionalComponentArgsRest(__VLS_465));
        const { default: __VLS_469 } = __VLS_467.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-subtitle-2 font-weight-medium mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_470;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_471 = __VLS_asFunctionalComponent1(__VLS_470, new __VLS_470({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_472 = __VLS_471({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_471));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_475 } = __VLS_473.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [unit] of __VLS_vFor((__VLS_ctx.latestDailyUnits))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (unit.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (unit.equipo_codigo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (unit.horometro_actual ?? "N/A");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (unit.mpg_actual ?? "N/A");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (unit.proximo_mpg ?? "N/A");
            // @ts-ignore
            [operationCadenceChartItems, latestDailyUnits,];
        }
        if (!__VLS_ctx.latestDailyUnits.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "4",
                ...{ class: "text-center text-medium-emphasis py-3" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        }
        // @ts-ignore
        [latestDailyUnits,];
        var __VLS_473;
        // @ts-ignore
        [];
        var __VLS_467;
        let __VLS_476;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_477 = __VLS_asFunctionalComponent1(__VLS_476, new __VLS_476({
            cols: "12",
            md: "5",
        }));
        const __VLS_478 = __VLS_477({
            cols: "12",
            md: "5",
        }, ...__VLS_functionalComponentArgsRest(__VLS_477));
        const { default: __VLS_481 } = __VLS_479.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-subtitle-2 font-weight-medium mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        let __VLS_482;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_483 = __VLS_asFunctionalComponent1(__VLS_482, new __VLS_482({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_484 = __VLS_483({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_483));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_487 } = __VLS_485.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [fuel] of __VLS_vFor((__VLS_ctx.latestDailyFuel))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (fuel.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (fuel.tanque);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (fuel.galones ?? fuel.consumo_galones ?? "N/A");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (fuel.stock_actual ?? "N/A");
            // @ts-ignore
            [latestDailyFuel,];
        }
        if (!__VLS_ctx.latestDailyFuel.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "3",
                ...{ class: "text-center text-medium-emphasis py-3" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        }
        // @ts-ignore
        [latestDailyFuel,];
        var __VLS_485;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-subtitle-2 font-weight-medium mb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-table-shell" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-table-shell']} */ ;
        let __VLS_488;
        /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
        vTable;
        // @ts-ignore
        const __VLS_489 = __VLS_asFunctionalComponent1(__VLS_488, new __VLS_488({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }));
        const __VLS_490 = __VLS_489({
            density: "compact",
            ...{ class: "dashboard-mini-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_489));
        /** @type {__VLS_StyleScopedClasses['dashboard-mini-table']} */ ;
        const { default: __VLS_493 } = __VLS_491.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [component] of __VLS_vFor((__VLS_ctx.latestDailyComponents))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (component.id),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (component.equipo_codigo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (component.tipo_componente);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (component.estado || "Sin estado");
            // @ts-ignore
            [latestDailyComponents,];
        }
        if (!__VLS_ctx.latestDailyComponents.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                colspan: "3",
                ...{ class: "text-center text-medium-emphasis py-3" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        }
        // @ts-ignore
        [latestDailyComponents,];
        var __VLS_491;
        // @ts-ignore
        [];
        var __VLS_479;
        // @ts-ignore
        [];
        var __VLS_461;
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
    var __VLS_374;
    // @ts-ignore
    [];
    var __VLS_368;
    // @ts-ignore
    [];
    var __VLS_362;
    let __VLS_494;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_495 = __VLS_asFunctionalComponent1(__VLS_494, new __VLS_494({}));
    const __VLS_496 = __VLS_495({}, ...__VLS_functionalComponentArgsRest(__VLS_495));
    const { default: __VLS_499 } = __VLS_497.slots;
    let __VLS_500;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_501 = __VLS_asFunctionalComponent1(__VLS_500, new __VLS_500({
        cols: "12",
    }));
    const __VLS_502 = __VLS_501({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_501));
    const { default: __VLS_505 } = __VLS_503.slots;
    let __VLS_506;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_507 = __VLS_asFunctionalComponent1(__VLS_506, new __VLS_506({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface" },
    }));
    const __VLS_508 = __VLS_507({
        rounded: "xl",
        ...{ class: "pa-5 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_507));
    /** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_511 } = __VLS_509.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-4 intelligence-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
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
        ...{ class: "d-flex align-center intelligence-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['intelligence-wrap']} */ ;
    let __VLS_512;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_513 = __VLS_asFunctionalComponent1(__VLS_512, new __VLS_512({
        label: true,
        color: "info",
        variant: "tonal",
    }));
    const __VLS_514 = __VLS_513({
        label: true,
        color: "info",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_513));
    const { default: __VLS_517 } = __VLS_515.slots;
    (__VLS_ctx.filteredSchedules.length);
    // @ts-ignore
    [filteredSchedules,];
    var __VLS_515;
    let __VLS_518;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_519 = __VLS_asFunctionalComponent1(__VLS_518, new __VLS_518({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('cronogramas', 'excel')),
    }));
    const __VLS_520 = __VLS_519({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-excel",
        loading: (__VLS_ctx.isExporting('cronogramas', 'excel')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_519));
    let __VLS_523;
    const __VLS_524 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('cronogramas', 'excel');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_525 } = __VLS_521.slots;
    // @ts-ignore
    [];
    var __VLS_521;
    var __VLS_522;
    let __VLS_526;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_527 = __VLS_asFunctionalComponent1(__VLS_526, new __VLS_526({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('cronogramas', 'pdf')),
    }));
    const __VLS_528 = __VLS_527({
        ...{ 'onClick': {} },
        size: "small",
        variant: "tonal",
        prependIcon: "mdi-file-pdf-box",
        loading: (__VLS_ctx.isExporting('cronogramas', 'pdf')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_527));
    let __VLS_531;
    const __VLS_532 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                if (!!(!__VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.exportModule('cronogramas', 'pdf');
                // @ts-ignore
                [isExporting, exportModule,];
            } });
    const { default: __VLS_533 } = __VLS_529.slots;
    // @ts-ignore
    [];
    var __VLS_529;
    var __VLS_530;
    if (__VLS_ctx.loading) {
        const __VLS_534 = LoadingTableState;
        // @ts-ignore
        const __VLS_535 = __VLS_asFunctionalComponent1(__VLS_534, new __VLS_534({
            message: "Cargando cronograma semanal...",
            rows: (4),
            columns: (2),
        }));
        const __VLS_536 = __VLS_535({
            message: "Cargando cronograma semanal...",
            rows: (4),
            columns: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_535));
    }
    else if (__VLS_ctx.latestSchedule) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "summary-strip mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        let __VLS_539;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_540 = __VLS_asFunctionalComponent1(__VLS_539, new __VLS_539({
            label: true,
            color: "primary",
            variant: "tonal",
        }));
        const __VLS_541 = __VLS_540({
            label: true,
            color: "primary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_540));
        const { default: __VLS_544 } = __VLS_542.slots;
        (__VLS_ctx.latestSchedule.codigo);
        // @ts-ignore
        [loading, latestSchedule, latestSchedule,];
        var __VLS_542;
        let __VLS_545;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_546 = __VLS_asFunctionalComponent1(__VLS_545, new __VLS_545({
            label: true,
            color: "secondary",
            variant: "tonal",
        }));
        const __VLS_547 = __VLS_546({
            label: true,
            color: "secondary",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_546));
        const { default: __VLS_550 } = __VLS_548.slots;
        (__VLS_ctx.latestSchedule.locacion || "Sin locacion");
        // @ts-ignore
        [latestSchedule,];
        var __VLS_548;
        let __VLS_551;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_552 = __VLS_asFunctionalComponent1(__VLS_551, new __VLS_551({
            label: true,
            color: "info",
            variant: "tonal",
        }));
        const __VLS_553 = __VLS_552({
            label: true,
            color: "info",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_552));
        const { default: __VLS_556 } = __VLS_554.slots;
        (__VLS_ctx.latestSchedule.fecha_inicio);
        (__VLS_ctx.latestSchedule.fecha_fin);
        // @ts-ignore
        [latestSchedule, latestSchedule,];
        var __VLS_554;
        let __VLS_557;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_558 = __VLS_asFunctionalComponent1(__VLS_557, new __VLS_557({
            label: true,
            color: "success",
            variant: "tonal",
        }));
        const __VLS_559 = __VLS_558({
            label: true,
            color: "success",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_558));
        const { default: __VLS_562 } = __VLS_560.slots;
        (__VLS_ctx.latestSchedule.detalles?.length ?? 0);
        // @ts-ignore
        [latestSchedule,];
        var __VLS_560;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "schedule-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['schedule-grid']} */ ;
        for (const [day] of __VLS_vFor((__VLS_ctx.scheduleWeek))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (day.key),
                ...{ class: "schedule-day" },
            });
            /** @type {__VLS_StyleScopedClasses['schedule-day']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "font-weight-bold mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            (day.label);
            for (const [activity] of __VLS_vFor((day.items))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (activity.id),
                    ...{ class: "schedule-item" },
                });
                /** @type {__VLS_StyleScopedClasses['schedule-item']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-medium-emphasis" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
                (activity.hora_inicio || "--:--");
                (activity.hora_fin || "--:--");
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-body-2 font-weight-medium" },
                });
                /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
                (activity.actividad);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-medium-emphasis" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
                (activity.tipo_proceso || "Proceso general");
                if (activity.equipo_codigo) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                    (activity.equipo_codigo);
                }
                // @ts-ignore
                [scheduleWeek,];
            }
            if (!day.items.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-medium-emphasis" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            }
            // @ts-ignore
            [];
        }
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
    var __VLS_509;
    // @ts-ignore
    [];
    var __VLS_503;
    // @ts-ignore
    [];
    var __VLS_497;
}
if (__VLS_ctx.canRead && __VLS_ctx.canAccessIntelligenceReports) {
    let __VLS_563;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_564 = __VLS_asFunctionalComponent1(__VLS_563, new __VLS_563({
        modelValue: (__VLS_ctx.dashboardDialog),
        fullscreen: (__VLS_ctx.isDashboardDialogFullscreen),
        maxWidth: (__VLS_ctx.isDashboardDialogFullscreen ? undefined : 1400),
    }));
    const __VLS_565 = __VLS_564({
        modelValue: (__VLS_ctx.dashboardDialog),
        fullscreen: (__VLS_ctx.isDashboardDialogFullscreen),
        maxWidth: (__VLS_ctx.isDashboardDialogFullscreen ? undefined : 1400),
    }, ...__VLS_functionalComponentArgsRest(__VLS_564));
    const { default: __VLS_568 } = __VLS_566.slots;
    let __VLS_569;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_570 = __VLS_asFunctionalComponent1(__VLS_569, new __VLS_569({
        rounded: "xl",
        ...{ class: "enterprise-dialog" },
    }));
    const __VLS_571 = __VLS_570({
        rounded: "xl",
        ...{ class: "enterprise-dialog" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_570));
    /** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
    const { default: __VLS_574 } = __VLS_572.slots;
    let __VLS_575;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_576 = __VLS_asFunctionalComponent1(__VLS_575, new __VLS_575({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }));
    const __VLS_577 = __VLS_576({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_576));
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    const { default: __VLS_580 } = __VLS_578.slots;
    // @ts-ignore
    [canRead, canAccessIntelligenceReports, dashboardDialog, isDashboardDialogFullscreen, isDashboardDialogFullscreen,];
    var __VLS_578;
    let __VLS_581;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_582 = __VLS_asFunctionalComponent1(__VLS_581, new __VLS_581({}));
    const __VLS_583 = __VLS_582({}, ...__VLS_functionalComponentArgsRest(__VLS_582));
    let __VLS_586;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_587 = __VLS_asFunctionalComponent1(__VLS_586, new __VLS_586({
        ...{ class: "pt-4 section-surface" },
    }));
    const __VLS_588 = __VLS_587({
        ...{ class: "pt-4 section-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_587));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['section-surface']} */ ;
    const { default: __VLS_591 } = __VLS_589.slots;
    let __VLS_592;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_593 = __VLS_asFunctionalComponent1(__VLS_592, new __VLS_592({
        dense: true,
        ...{ class: "mb-4" },
    }));
    const __VLS_594 = __VLS_593({
        dense: true,
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_593));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    const { default: __VLS_597 } = __VLS_595.slots;
    let __VLS_598;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_599 = __VLS_asFunctionalComponent1(__VLS_598, new __VLS_598({
        cols: "12",
        md: "4",
    }));
    const __VLS_600 = __VLS_599({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_599));
    const { default: __VLS_603 } = __VLS_601.slots;
    let __VLS_604;
    /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
    vAutocomplete;
    // @ts-ignore
    const __VLS_605 = __VLS_asFunctionalComponent1(__VLS_604, new __VLS_604({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.dashboardSelection),
        items: (__VLS_ctx.lubricantCatalogOptions),
        itemTitle: "label",
        returnObject: true,
        clearable: true,
        label: "Lubricante",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_606 = __VLS_605({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.dashboardSelection),
        items: (__VLS_ctx.lubricantCatalogOptions),
        itemTitle: "label",
        returnObject: true,
        clearable: true,
        label: "Lubricante",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_605));
    let __VLS_609;
    const __VLS_610 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.handleDashboardSelection) });
    var __VLS_607;
    var __VLS_608;
    // @ts-ignore
    [dashboardSelection, lubricantCatalogOptions, handleDashboardSelection,];
    var __VLS_601;
    let __VLS_611;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_612 = __VLS_asFunctionalComponent1(__VLS_611, new __VLS_611({
        cols: "12",
        md: "2",
    }));
    const __VLS_613 = __VLS_612({
        cols: "12",
        md: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_612));
    const { default: __VLS_616 } = __VLS_614.slots;
    let __VLS_617;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_618 = __VLS_asFunctionalComponent1(__VLS_617, new __VLS_617({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.dashboardPeriod),
        items: (__VLS_ctx.dashboardPeriodOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Periodo",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_619 = __VLS_618({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.dashboardPeriod),
        items: (__VLS_ctx.dashboardPeriodOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Periodo",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_618));
    let __VLS_622;
    const __VLS_623 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.reloadDashboard) });
    var __VLS_620;
    var __VLS_621;
    // @ts-ignore
    [dashboardPeriod, dashboardPeriodOptions, reloadDashboard,];
    var __VLS_614;
    let __VLS_624;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_625 = __VLS_asFunctionalComponent1(__VLS_624, new __VLS_624({
        cols: "12",
        md: "2",
    }));
    const __VLS_626 = __VLS_625({
        cols: "12",
        md: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_625));
    const { default: __VLS_629 } = __VLS_627.slots;
    let __VLS_630;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_631 = __VLS_asFunctionalComponent1(__VLS_630, new __VLS_630({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.dashboardFrom),
        type: "date",
        label: "Desde",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_632 = __VLS_631({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.dashboardFrom),
        type: "date",
        label: "Desde",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_631));
    let __VLS_635;
    const __VLS_636 = ({ change: {} },
        { onChange: (__VLS_ctx.reloadDashboard) });
    var __VLS_633;
    var __VLS_634;
    // @ts-ignore
    [reloadDashboard, dashboardFrom,];
    var __VLS_627;
    let __VLS_637;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_638 = __VLS_asFunctionalComponent1(__VLS_637, new __VLS_637({
        cols: "12",
        md: "2",
    }));
    const __VLS_639 = __VLS_638({
        cols: "12",
        md: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_638));
    const { default: __VLS_642 } = __VLS_640.slots;
    let __VLS_643;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_644 = __VLS_asFunctionalComponent1(__VLS_643, new __VLS_643({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.dashboardTo),
        type: "date",
        label: "Hasta",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_645 = __VLS_644({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.dashboardTo),
        type: "date",
        label: "Hasta",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_644));
    let __VLS_648;
    const __VLS_649 = ({ change: {} },
        { onChange: (__VLS_ctx.reloadDashboard) });
    var __VLS_646;
    var __VLS_647;
    // @ts-ignore
    [reloadDashboard, dashboardTo,];
    var __VLS_640;
    let __VLS_650;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_651 = __VLS_asFunctionalComponent1(__VLS_650, new __VLS_650({
        cols: "12",
        md: "2",
    }));
    const __VLS_652 = __VLS_651({
        cols: "12",
        md: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_651));
    const { default: __VLS_655 } = __VLS_653.slots;
    let __VLS_656;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_657 = __VLS_asFunctionalComponent1(__VLS_656, new __VLS_656({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.dashboardCompartimento),
        items: (__VLS_ctx.dashboardCompartimentos),
        clearable: true,
        label: "Compartimento",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_658 = __VLS_657({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.dashboardCompartimento),
        items: (__VLS_ctx.dashboardCompartimentos),
        clearable: true,
        label: "Compartimento",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_657));
    let __VLS_661;
    const __VLS_662 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.reloadDashboard) });
    var __VLS_659;
    var __VLS_660;
    // @ts-ignore
    [reloadDashboard, dashboardCompartimento, dashboardCompartimentos,];
    var __VLS_653;
    // @ts-ignore
    [];
    var __VLS_595;
    const __VLS_663 = LubricantDashboardPanel;
    // @ts-ignore
    const __VLS_664 = __VLS_asFunctionalComponent1(__VLS_663, new __VLS_663({
        dashboard: (__VLS_ctx.lubricantDashboard),
        loading: (__VLS_ctx.lubricantDashboardLoading),
        error: (__VLS_ctx.lubricantDashboardError),
    }));
    const __VLS_665 = __VLS_664({
        dashboard: (__VLS_ctx.lubricantDashboard),
        loading: (__VLS_ctx.lubricantDashboardLoading),
        error: (__VLS_ctx.lubricantDashboardError),
    }, ...__VLS_functionalComponentArgsRest(__VLS_664));
    // @ts-ignore
    [lubricantDashboard, lubricantDashboardLoading, lubricantDashboardError,];
    var __VLS_589;
    let __VLS_668;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_669 = __VLS_asFunctionalComponent1(__VLS_668, new __VLS_668({}));
    const __VLS_670 = __VLS_669({}, ...__VLS_functionalComponentArgsRest(__VLS_669));
    let __VLS_673;
    /** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
    vCardActions;
    // @ts-ignore
    const __VLS_674 = __VLS_asFunctionalComponent1(__VLS_673, new __VLS_673({
        ...{ class: "pa-4" },
    }));
    const __VLS_675 = __VLS_674({
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_674));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_678 } = __VLS_676.slots;
    let __VLS_679;
    /** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
    vSpacer;
    // @ts-ignore
    const __VLS_680 = __VLS_asFunctionalComponent1(__VLS_679, new __VLS_679({}));
    const __VLS_681 = __VLS_680({}, ...__VLS_functionalComponentArgsRest(__VLS_680));
    let __VLS_684;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_685 = __VLS_asFunctionalComponent1(__VLS_684, new __VLS_684({
        ...{ 'onClick': {} },
        variant: "text",
    }));
    const __VLS_686 = __VLS_685({
        ...{ 'onClick': {} },
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_685));
    let __VLS_689;
    const __VLS_690 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!(__VLS_ctx.canRead && __VLS_ctx.canAccessIntelligenceReports))
                    return;
                __VLS_ctx.dashboardDialog = false;
                // @ts-ignore
                [dashboardDialog,];
            } });
    const { default: __VLS_691 } = __VLS_687.slots;
    // @ts-ignore
    [];
    var __VLS_687;
    var __VLS_688;
    // @ts-ignore
    [];
    var __VLS_676;
    // @ts-ignore
    [];
    var __VLS_572;
    // @ts-ignore
    [];
    var __VLS_566;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

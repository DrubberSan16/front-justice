/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { hasReportAccess } from "@/app/config/report-access";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { buildAgendaProgrammingReport, buildMonthlyProgrammingReport, buildWeeklyProgrammingReport, downloadReportExcel, downloadReportPdf, } from "@/app/utils/maintenance-intelligence-reports";
const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, [
    "Programaciones",
    "Programacion",
    "Programación",
]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canAccessProgrammingReports = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "programaciones"));
const activeTab = ref("mensual");
const loadingAll = ref(false);
const agendaLoading = ref(false);
const saving = ref(false);
const savingWeekly = ref(false);
const importingMonthly = ref(false);
const importingWeekly = ref(false);
const error = ref(null);
const exportState = reactive({});
const deleteDialog = ref(false);
const removingProgramacion = ref(false);
const deletingProgramacion = ref(null);
const agendaRows = ref([]);
const monthlyImports = ref([]);
const weeklySchedules = ref([]);
const selectedMonthly = ref(null);
const selectedWeekly = ref(null);
const selectedMonthlyId = ref(null);
const selectedWeeklyId = ref(null);
const selectedMonthlyYear = ref(new Date().getFullYear());
const selectedMonthlyMonth = ref(new Date().getMonth() + 1);
const selectedMonthlyPeriod = ref(null);
const selectedWeeklyYear = ref(new Date().getFullYear());
const selectedWeeklyMonth = ref(new Date().getMonth() + 1);
const selectedWeeklyPeriod = ref(null);
const selectedMonthlyDetail = ref(null);
const monthlyImportFile = ref(null);
const weeklyImportFile = ref(null);
const monthlyWarnings = ref([]);
const weeklyWarnings = ref([]);
const weeklyPlannerAnchorDate = ref(formatDate(new Date()));
const isDialogFullscreen = computed(() => mdAndDown.value);
const isWeeklyEditorFullscreen = computed(() => mdAndDown.value);
const isWeeklyCellFullscreen = computed(() => smAndDown.value);
const dialog = ref(false);
const editingId = ref(null);
const programacionSourceMode = ref("DINAMICA");
const programacionSourceOrigin = ref("MANUAL");
const programacionSourcePayload = ref({});
const programacionSourceDocument = ref(null);
const equipmentOptions = ref([]);
const equipmentCatalog = ref([]);
const procedureOptions = ref([]);
const procedureCatalog = ref([]);
const currentMonth = ref(new Date());
const agendaYear = ref(currentMonth.value.getFullYear());
const agendaMonth = ref(currentMonth.value.getMonth() + 1);
const agendaDayDialog = ref(false);
const agendaSelectedDate = ref("");
const monthlyImportDetailCache = ref({});
const weeklyScheduleDetailCache = ref({});
const weeklyCellPersistDirect = ref(false);
const weeklyEditorDialog = ref(false);
const weeklyCellDialog = ref(false);
const monthlyCellDialog = ref(false);
const monthlyPaletteDialog = ref(false);
const weeklyEditorAnchorDate = ref(formatDate(new Date()));
const weeklyProcessOptions = ["OPERACION", "MPG", "SSA", "MIXTO"];
const weeklyEditor = reactive({
    id: null,
    codigo: "",
    fecha_inicio: "",
    fecha_fin: "",
    locacion: "TPTA",
    referencia_orden: "",
    resumen: "",
    documento_origen: "MANUAL",
});
const weeklyEditorSlots = ref([]);
const weeklyEditorItems = ref([]);
const weeklyCell = reactive({
    local_id: "",
    slot_key: "",
    fecha_actividad: "",
    dia_semana: "",
    actividad: "",
    tipo_proceso: "OPERACION",
    responsable_area: "",
    equipo_codigo: "",
    observacion: "",
});
const monthlyCell = reactive({
    id: null,
    programacion_mensual_id: "",
    equipo_id: "",
    equipo_codigo: "",
    fecha_programada: "",
    valor_crudo: "",
    procedimiento_id: "",
    observacion: "",
});
const savingMonthlyCell = ref(false);
const savingMonthlyPalette = ref(false);
const monthlyPaletteForm = reactive({
    MPG: "#F4DD6B",
    HORAS_PROGRAMADAS: "#F4DD6B",
    MANTENIMIENTO: "#F4DD6B",
    OTRO: "#D7E0EA",
    SEMANAL: "#9EC5FE",
    SINCRONIZADO: "#8ED1A5",
    DEFAULT: "#D7E0EA",
});
const form = reactive({
    equipo_id: "",
    procedimiento_id: "",
    plan_id: "",
    ultima_ejecucion_fecha: "",
    ultima_ejecucion_horas: "",
    proxima_fecha: "",
    proxima_horas: "",
    activo: true,
});
const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const agendaMonthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    title: new Date(2026, index, 1).toLocaleDateString("es-EC", { month: "long" }),
}));
const agendaHeaders = [
    { title: "Equipo", key: "equipo_nombre" },
    { title: "Plantilla MPG", key: "procedimiento_nombre" },
    { title: "Fecha", key: "proxima_fecha" },
    { title: "Modo", key: "modo_programacion" },
    { title: "Estado", key: "estado_programacion" },
    { title: "Acciones", key: "actions", sortable: false },
];
const monthlyDetailHeaders = [
    { title: "Fecha", key: "fecha_programada" },
    { title: "Equipo", key: "equipo_codigo" },
    { title: "Actividad", key: "valor_crudo" },
    { title: "Tipo", key: "tipo_mantenimiento" },
    { title: "Plan", key: "plan_id" },
    { title: "Estado", key: "programacion_id" },
    { title: "Acciones", key: "actions", sortable: false },
];
const weeklyDetailHeaders = [
    { title: "Día", key: "dia_semana" },
    { title: "Fecha", key: "fecha_actividad" },
    { title: "Hora inicio", key: "hora_inicio" },
    { title: "Hora fin", key: "hora_fin" },
    { title: "Tipo", key: "tipo_proceso" },
    { title: "Equipo", key: "equipo_codigo" },
    { title: "Actividad", key: "actividad" },
];
const monthlyPaletteFields = [
    { key: "MPG", label: "MPG" },
    { key: "HORAS_PROGRAMADAS", label: "Horas programadas" },
    { key: "MANTENIMIENTO", label: "Mantenimiento especial" },
    { key: "SEMANAL", label: "Agendado semanal" },
    { key: "SINCRONIZADO", label: "Sincronizado" },
    { key: "DEFAULT", label: "Predeterminado" },
];
const currentRoleName = computed(() => String(auth.user?.role?.nombre || "").trim().toUpperCase());
function currentUserName() {
    return auth.user?.nameUser || "admin";
}
function currentUserEmail() {
    return auth.user?.email || "";
}
function currentUserId() {
    return auth.user?.id || "";
}
function buildAuditPayload(isEditing = false) {
    return {
        actor_user_id: currentUserId() || null,
        actor_username: currentUserName(),
        actor_name: auth.user?.nameSurname || auth.user?.nameUser || null,
        actor_email: currentUserEmail() || null,
        actor_role: auth.user?.role?.nombre || null,
        created_by: isEditing ? undefined : currentUserName(),
        created_by_email: isEditing ? undefined : currentUserEmail() || null,
        updated_by: currentUserName(),
        updated_by_email: currentUserEmail() || null,
    };
}
const canPersistProgramacion = computed(() => (editingId.value ? canEdit.value : canCreate.value));
const canPersistMonthlyCell = computed(() => (monthlyCell.id ? canEdit.value : canCreate.value));
const canPersistWeeklyEditor = computed(() => (weeklyEditor.id ? canEdit.value : canCreate.value));
const canPersistWeeklyCell = computed(() => (weeklyCell.local_id ? canEdit.value : canCreate.value));
const canEditMonthlyColors = computed(() => currentRoleName.value.includes("ADMIN") && canEdit.value);
const deleteTargetLabel = computed(() => {
    const item = deletingProgramacion.value;
    if (!item)
        return "";
    return displayProgramacionName(item);
});
const defaultMonthlyPalette = {
    MPG: "#F4DD6B",
    HORAS_PROGRAMADAS: "#F4DD6B",
    MANTENIMIENTO: "#F4DD6B",
    OTRO: "#D7E0EA",
    SEMANAL: "#9EC5FE",
    SINCRONIZADO: "#8ED1A5",
    DEFAULT: "#D7E0EA",
};
function formatDate(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function startOfCalendarMonth(source) {
    const date = new Date(source.getFullYear(), source.getMonth(), 1);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    return date;
}
function normalizeTimeInput(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    if (/^\d{2}:\d{2}:\d{2}$/.test(raw))
        return raw;
    if (/^\d{2}:\d{2}$/.test(raw))
        return `${raw}:00`;
    return raw;
}
function formatTimeLabel(start, end) {
    const from = String(start || "").slice(0, 5);
    const to = String(end || "").slice(0, 5);
    if (!from && !to)
        return "Sin hora";
    return `${from || "--:--"} - ${to || "--:--"}`;
}
function getWeekRangeFromDate(value) {
    const base = new Date(`${value}T00:00:00`);
    if (Number.isNaN(base.getTime())) {
        return getWeekRangeFromDate(formatDate(new Date()));
    }
    const day = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
        start: formatDate(start),
        end: formatDate(end),
    };
}
function createLocalId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
async function listAll(endpoint) {
    return listAllPages(endpoint);
}
function exportKey(section, format) {
    return `${section}:${format}`;
}
function isExporting(section, format) {
    return Boolean(exportState[exportKey(section, format)]);
}
function normalize(item) {
    const label = item?.nombre ?? item?.title ?? item?.codigo ?? item?.id;
    return { value: item.id, title: `${item?.codigo ? `${item.codigo} - ` : ""}${label}` };
}
async function loadCatalogs() {
    const [equipos, procedimientos] = await Promise.all([
        listAll("/kpi_maintenance/equipos"),
        listAll("/kpi_maintenance/inteligencia/procedimientos"),
    ]);
    equipmentCatalog.value = equipos;
    equipmentOptions.value = equipos.map(normalize);
    procedureCatalog.value = procedimientos;
    procedureOptions.value = procedimientos.map(normalize);
}
async function loadAgendaRows() {
    agendaLoading.value = true;
    try {
        const { data } = await api.get("/kpi_maintenance/programaciones");
        agendaRows.value = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    }
    finally {
        agendaLoading.value = false;
    }
}
async function loadMonthlyImports() {
    const { data } = await api.get("/kpi_maintenance/programaciones/mensuales");
    monthlyImports.value = Array.isArray(data?.data) ? data.data : [];
}
async function loadWeeklySchedules() {
    const { data } = await api.get("/kpi_maintenance/inteligencia/cronogramas-semanales");
    weeklySchedules.value = Array.isArray(data?.data) ? data.data : [];
}
async function loadAll() {
    if (!canRead.value)
        return;
    loadingAll.value = true;
    error.value = null;
    try {
        await Promise.all([loadCatalogs(), loadAgendaRows(), loadMonthlyImports(), loadWeeklySchedules()]);
    }
    catch (e) {
        error.value = e?.response?.data?.message || "No se pudo cargar el módulo de programaciones.";
    }
    finally {
        loadingAll.value = false;
    }
}
async function loadSelectedMonthly(id) {
    selectedMonthly.value = null;
    selectedMonthlyDetail.value = null;
    monthlyWarnings.value = [];
    if (!id)
        return;
    try {
        const { data } = await api.get(`/kpi_maintenance/programaciones/mensuales/${id}`);
        selectedMonthly.value = data?.data ?? null;
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo cargar el calendario mensual.");
    }
}
async function loadSelectedWeekly(id) {
    selectedWeekly.value = null;
    weeklyWarnings.value = [];
    if (!id)
        return;
    try {
        const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${id}`);
        selectedWeekly.value = data?.data ?? null;
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo cargar el cronograma semanal.");
    }
}
watch(selectedMonthlyId, async (value) => {
    await loadSelectedMonthly(value);
});
watch(selectedWeeklyId, async (value) => {
    await loadSelectedWeekly(value);
});
const monthlyAvailablePeriods = computed(() => {
    const periods = [];
    for (const item of monthlyImports.value) {
        const startRaw = String(item?.fecha_inicio || "").slice(0, 10);
        const endRaw = String(item?.fecha_fin || "").slice(0, 10);
        if (!startRaw || !endRaw)
            continue;
        const start = new Date(`${startRaw}T00:00:00`);
        const end = new Date(`${endRaw}T00:00:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
            continue;
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        const limit = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cursor <= limit) {
            const year = cursor.getFullYear();
            const month = cursor.getMonth() + 1;
            const period = `${year}-${String(month).padStart(2, "0")}`;
            periods.push({
                period,
                year,
                month,
                label: cursor.toLocaleDateString("es-EC", {
                    month: "long",
                    year: "numeric",
                }),
                importId: String(item.id || ""),
                importCode: String(item.codigo || ""),
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }
    }
    return periods.sort((a, b) => `${b.period}-${b.importCode}`.localeCompare(`${a.period}-${a.importCode}`));
});
const universalYearRange = Array.from({ length: 101 }, (_, index) => 2000 + index);
const agendaYearOptions = [...universalYearRange].reverse().map((value) => ({ value, title: String(value) }));
const monthlyYearOptions = computed(() => [...universalYearRange].reverse().map((value) => ({ value, title: String(value) })));
const monthlyMonthOptions = computed(() => Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    return {
        value,
        title: new Date(2026, index, 1).toLocaleDateString("es-EC", { month: "long" }),
    };
}));
const weeklyAvailablePeriods = computed(() => {
    if (!selectedWeeklyYear.value || !selectedWeeklyMonth.value)
        return [];
    const year = selectedWeeklyYear.value;
    const monthIndex = selectedWeeklyMonth.value - 1;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const firstWeekStart = getWeekRangeFromDate(formatDate(monthStart)).start;
    const periods = [];
    for (let cursor = new Date(`${firstWeekStart}T00:00:00`); cursor <= monthEnd; cursor.setDate(cursor.getDate() + 7)) {
        const weekStart = formatDate(cursor);
        const range = getWeekRangeFromDate(weekStart);
        const match = weeklySchedules.value.find((item) => String(item?.fecha_inicio || "").slice(0, 10) === range.start &&
            String(item?.fecha_fin || "").slice(0, 10) === range.end);
        periods.push({
            value: range.start,
            scheduleId: match?.id ? String(match.id) : null,
            year,
            month: selectedWeeklyMonth.value,
            weekStart: range.start,
            weekEnd: range.end,
            title: `Semana ${range.start} / ${range.end}${match?.codigo ? ` · ${match.codigo}` : " · Sin cronograma"}`,
        });
    }
    return periods;
});
const weeklyYearOptions = computed(() => [...universalYearRange].reverse().map((value) => ({ value, title: String(value) })));
const weeklyMonthOptions = computed(() => Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    return {
        value,
        title: new Date(2026, index, 1).toLocaleDateString("es-EC", { month: "long" }),
    };
}));
watch([selectedMonthlyYear, selectedMonthlyMonth, monthlyAvailablePeriods], ([year, month]) => {
    if (year == null || month == null) {
        selectedMonthlyPeriod.value = null;
        selectedMonthlyId.value = null;
        return;
    }
    const period = `${year}-${String(month).padStart(2, "0")}`;
    selectedMonthlyPeriod.value = period;
    const match = monthlyAvailablePeriods.value.find((item) => item.period === period);
    selectedMonthlyId.value = match?.importId ?? null;
}, { immediate: true });
watch([selectedWeeklyYear, selectedWeeklyMonth, weeklyAvailablePeriods], ([year, month]) => {
    if (year == null || month == null) {
        selectedWeeklyPeriod.value = null;
        selectedWeeklyId.value = null;
        return;
    }
    const options = weeklyAvailablePeriods.value;
    if (!options.length) {
        selectedWeeklyPeriod.value = null;
        selectedWeeklyId.value = null;
        return;
    }
    if (!options.some((item) => item.value === selectedWeeklyPeriod.value)) {
        selectedWeeklyPeriod.value = options[0]?.value ?? null;
    }
    const match = options.find((item) => item.value === selectedWeeklyPeriod.value);
    selectedWeeklyId.value = match?.scheduleId ?? null;
}, { immediate: true });
watch(selectedWeeklyPeriod, (value) => {
    if (value)
        weeklyPlannerAnchorDate.value = value;
    const match = weeklyAvailablePeriods.value.find((item) => item.value === value);
    selectedWeeklyId.value = match?.scheduleId ?? null;
});
const weeklyPeriodOptions = computed(() => weeklyAvailablePeriods.value
    .filter((item) => item.year === selectedWeeklyYear.value &&
    item.month === selectedWeeklyMonth.value)
    .map((item) => ({
    value: item.value,
    title: item.title,
})));
function applyMonthlySelectionByImportId(importId) {
    const row = monthlyImports.value.find((item) => String(item?.id || "") === String(importId || ""));
    const start = String(row?.fecha_inicio || "").slice(0, 10);
    if (!start)
        return;
    const date = new Date(`${start}T00:00:00`);
    if (Number.isNaN(date.getTime()))
        return;
    selectedMonthlyYear.value = date.getFullYear();
    selectedMonthlyMonth.value = date.getMonth() + 1;
    selectedMonthlyPeriod.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    selectedMonthlyId.value = String(importId || "");
}
function applyWeeklySelectionByScheduleId(scheduleId) {
    const row = weeklySchedules.value.find((item) => String(item?.id || "") === String(scheduleId || ""));
    const start = String(row?.fecha_inicio || "").slice(0, 10);
    if (!start)
        return;
    const date = new Date(`${start}T00:00:00`);
    if (Number.isNaN(date.getTime()))
        return;
    selectedWeeklyYear.value = date.getFullYear();
    selectedWeeklyMonth.value = date.getMonth() + 1;
    selectedWeeklyPeriod.value = start;
    selectedWeeklyId.value = String(scheduleId || "");
}
const monthlyDisplayDetails = computed(() => Array.isArray(selectedMonthly.value?.detalles_consolidados)
    ? selectedMonthly.value.detalles_consolidados
    : Array.isArray(selectedMonthly.value?.detalles)
        ? selectedMonthly.value.detalles
        : []);
const monthlyFilteredDetails = computed(() => {
    const details = monthlyDisplayDetails.value;
    if (!selectedMonthlyPeriod.value)
        return details;
    return details.filter((item) => String(item.fecha_programada || "").startsWith(selectedMonthlyPeriod.value || ""));
});
const equipmentCodeOptions = computed(() => equipmentCatalog.value.map((item) => ({
    value: item.codigo,
    title: `${item.codigo || "SIN CÓDIGO"} - ${item.nombre || "Sin nombre"}`,
})));
const selectedMonthlyColorPalette = computed(() => ({
    ...defaultMonthlyPalette,
    ...(selectedMonthly.value?.color_palette || selectedMonthly.value?.payload_json?.color_palette || {}),
}));
const monthlyDays = computed(() => {
    if (!selectedMonthlyPeriod.value)
        return [];
    const [year, month] = String(selectedMonthlyPeriod.value).split("-").map(Number);
    if (!year || !month)
        return [];
    const lastDay = new Date(year, month, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) => {
        const day = index + 1;
        const date = `${selectedMonthlyPeriod.value}-${String(day).padStart(2, "0")}`;
        const label = new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "short" });
        return { key: date, date, day, label };
    });
});
const monthlyMatrixRows = computed(() => {
    const rows = new Map();
    for (const equipment of equipmentCatalog.value) {
        const key = String(equipment.id || equipment.codigo || "");
        if (!key)
            continue;
        rows.set(key, {
            key,
            equipo_id: equipment.id,
            equipo_codigo: equipment.codigo || "",
            equipo_nombre: equipment.nombre || "Sin nombre",
            horometro_ultimo: null,
            horometro_actual: Number(equipment.horometro_actual || 0) || null,
            cells: {},
        });
    }
    for (const item of monthlyFilteredDetails.value) {
        const key = String(item.equipo_id || item.equipo_codigo || item.id);
        if (!rows.has(key)) {
            rows.set(key, {
                key,
                equipo_id: item.equipo_id || null,
                equipo_codigo: item.equipo_codigo,
                equipo_nombre: item.equipo_nombre,
                horometro_ultimo: item.payload_json?.horometro_ultimo ?? null,
                horometro_actual: item.payload_json?.horometro_actual ?? null,
                cells: {},
            });
        }
        const row = rows.get(key);
        row.horometro_ultimo ??= item.payload_json?.horometro_ultimo ?? null;
        row.horometro_actual ??= item.payload_json?.horometro_actual ?? null;
        row.cells[item.fecha_programada] = row.cells[item.fecha_programada] || [];
        row.cells[item.fecha_programada].push(item);
    }
    return [...rows.values()].sort((a, b) => String(a.equipo_codigo || "").localeCompare(String(b.equipo_codigo || "")));
});
const monthlySummary = computed(() => {
    const details = monthlyFilteredDetails.value;
    return {
        totalEvents: details.length,
        syncedEvents: details.filter((item) => Boolean(item.programacion_id)).length,
        totalEquipments: monthlyMatrixRows.value.length,
    };
});
const monthlyReportMatrixRows = computed(() => monthlyMatrixRows.value.map((row) => {
    const base = {
        equipo_codigo: row.equipo_codigo || "",
        equipo_nombre: row.equipo_nombre || "",
        horometro_ultimo: row.horometro_ultimo ?? "",
        horometro_actual: row.horometro_actual ?? "",
    };
    for (const day of monthlyDays.value) {
        base[`dia_${String(day.day).padStart(2, "0")}`] = (row.cells[day.date] || [])
            .map((item) => item.valor_crudo || item.tipo_mantenimiento || "")
            .filter(Boolean)
            .join(" | ");
    }
    return base;
}));
const weeklyDisplayRange = computed(() => {
    if (selectedWeekly.value?.fecha_inicio && selectedWeekly.value?.fecha_fin) {
        return {
            start: String(selectedWeekly.value.fecha_inicio).slice(0, 10),
            end: String(selectedWeekly.value.fecha_fin).slice(0, 10),
        };
    }
    if (selectedWeeklyPeriod.value) {
        return getWeekRangeFromDate(selectedWeeklyPeriod.value);
    }
    return null;
});
const weeklyDays = computed(() => {
    if (!weeklyDisplayRange.value?.start || !weeklyDisplayRange.value?.end)
        return [];
    const start = new Date(`${weeklyDisplayRange.value.start}T00:00:00`);
    const end = new Date(`${weeklyDisplayRange.value.end}T00:00:00`);
    const days = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const date = formatDate(cursor);
        days.push({
            date,
            title: cursor.toLocaleDateString("es-EC", { weekday: "long" }).replace(/^\w/, (m) => m.toUpperCase()),
        });
    }
    return days;
});
const weeklyTimeSlots = computed(() => {
    const slots = Array.isArray(selectedWeekly.value?.time_slots) ? selectedWeekly.value.time_slots : [];
    if (slots.length)
        return slots;
    const details = Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles : [];
    const dynamicSlots = [...new Set(details.map((item) => `${item.hora_inicio || ""}-${item.hora_fin || ""}`))]
        .filter(Boolean)
        .map((key) => {
        const slotKey = String(key);
        const [hora_inicio = "", hora_fin = ""] = slotKey.split("-");
        return { key: slotKey, label: `${hora_inicio.slice(0, 5)} - ${hora_fin.slice(0, 5)}` };
    });
    return dynamicSlots.length
        ? dynamicSlots
        : [{ key: "07:00:00-08:00:00", label: "07:00 - 08:00" }];
});
const weeklyGrid = computed(() => {
    const grid = {};
    const details = Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles : [];
    for (const item of details) {
        const slotKey = `${item.hora_inicio || ""}-${item.hora_fin || ""}`;
        const dateKey = String(item.fecha_actividad || "");
        if (!grid[slotKey])
            grid[slotKey] = {};
        if (!grid[slotKey][dateKey])
            grid[slotKey][dateKey] = [];
        grid[slotKey][dateKey].push(item);
    }
    return grid;
});
const weeklyDailyHours = computed(() => {
    const source = selectedWeekly.value?.daily_hours || {};
    const rows = Object.entries(source).map(([date, hours]) => ({
        date,
        hours: Number(hours || 0),
        label: new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "short", day: "2-digit" }),
    }));
    if (rows.length)
        return rows;
    return weeklyDays.value.map((day) => ({
        date: day.date,
        hours: 0,
        label: new Date(`${day.date}T00:00:00`).toLocaleDateString("es-EC", {
            weekday: "short",
            day: "2-digit",
        }),
    }));
});
const weeklyEquipmentHours = computed(() => Array.isArray(selectedWeekly.value?.daily_equipment_hours)
    ? selectedWeekly.value.daily_equipment_hours
    : []);
const weeklyReportMatrixRows = computed(() => weeklyTimeSlots.value.map((slot) => {
    const base = {
        bloque_horario: slot.label,
    };
    for (const day of weeklyDays.value) {
        base[day.date] = getWeeklyItems(slot.key, day.date)
            .map((item) => [item.actividad || "", item.equipo_codigo || "", item.tipo_proceso || ""]
            .filter(Boolean)
            .join(" · "))
            .filter(Boolean)
            .join(" | ");
    }
    return base;
}));
const weeklyEditorDays = computed(() => {
    if (!weeklyEditor.fecha_inicio || !weeklyEditor.fecha_fin)
        return [];
    const start = new Date(`${weeklyEditor.fecha_inicio}T00:00:00`);
    const end = new Date(`${weeklyEditor.fecha_fin}T00:00:00`);
    const days = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        days.push({
            date: formatDate(cursor),
            title: cursor.toLocaleDateString("es-EC", { weekday: "long" }).replace(/^\w/, (m) => m.toUpperCase()),
        });
    }
    return days;
});
const weeklyCellSlotLabel = computed(() => {
    const slot = weeklyEditorSlots.value.find((item) => item.key === weeklyCell.slot_key);
    return formatTimeLabel(slot?.hora_inicio, slot?.hora_fin);
});
const monthLabel = computed(() => currentMonth.value.toLocaleDateString("es-EC", { month: "long", year: "numeric" }));
const monthCells = computed(() => {
    const start = startOfCalendarMonth(currentMonth.value);
    const out = [];
    const today = formatDate(new Date());
    for (let i = 0; i < 42; i += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        out.push({
            key: `${date.toISOString()}-${i}`,
            date: formatDate(date),
            day: date.getDate(),
            inCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
            isToday: formatDate(date) === today,
        });
    }
    return out;
});
const agendaMonthPeriod = computed(() => getMonthPeriod(currentMonth.value));
const agendaProgramacionesByDate = computed(() => agendaRows.value.reduce((acc, row) => {
    const key = String(row?.proxima_fecha || "");
    if (!key || !key.startsWith(agendaMonthPeriod.value))
        return acc;
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
}, {}));
const agendaMonthlyDetails = computed(() => {
    const rows = Object.values(monthlyImportDetailCache.value)
        .flatMap((item) => Array.isArray(item?.detalles_consolidados)
        ? item.detalles_consolidados
        : Array.isArray(item?.detalles)
            ? item.detalles
            : [])
        .filter((item) => String(item?.fecha_programada || "").startsWith(agendaMonthPeriod.value));
    return rows;
});
const agendaWeeklyDetails = computed(() => {
    const rows = Object.values(weeklyScheduleDetailCache.value)
        .flatMap((item) => (Array.isArray(item?.detalles) ? item.detalles.map((detail) => ({
        ...detail,
        cronograma_id: item?.id,
        cronograma_codigo: item?.codigo,
        cronograma_resumen: item?.resumen,
    })) : []))
        .filter((item) => String(item?.fecha_actividad || "").startsWith(agendaMonthPeriod.value));
    return rows;
});
function parseAgendaHours(value) {
    if (value === null || value === undefined)
        return 0;
    const raw = String(value).replace(",", ".").replace(/[^0-9.-]/g, "");
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
const agendaMonthlyHoursByDate = computed(() => agendaMonthlyDetails.value.reduce((acc, item) => {
    const key = String(item?.fecha_programada || "");
    if (!key)
        return acc;
    if (!acc[key])
        acc[key] = { totalHours: 0, items: [] };
    acc[key].items.push(item);
    const payloadHours = Number(item?.payload_json?.total_horas_agendadas || 0);
    const sourceHours = payloadHours > 0 ? payloadHours : parseAgendaHours(item?.valor_crudo);
    acc[key].totalHours = Number((acc[key].totalHours + sourceHours).toFixed(2));
    return acc;
}, {}));
const agendaCellItems = computed(() => {
    const out = {};
    for (const [date, rows] of Object.entries(agendaProgramacionesByDate.value)) {
        out[date] = out[date] || [];
        for (const row of rows) {
            out[date].push({
                key: `agenda-${row.id}`,
                type: "agenda",
                title: `${row.equipo_nombre || row.equipo_codigo || "Equipo"} · ${displayProgramacionName(row)}`,
                subtitle: row.estado_programacion || row.modo_programacion || "Programación",
                colorClass: eventClass(row.estado_programacion),
                raw: row,
            });
        }
    }
    for (const [date, summary] of Object.entries(agendaMonthlyHoursByDate.value)) {
        out[date] = out[date] || [];
        const itemCount = summary.items.length;
        out[date].push({
            key: `monthly-${date}`,
            type: "monthly",
            title: summary.totalHours > 0
                ? `Mensual MPG · ${summary.totalHours.toFixed(2)} h`
                : `Mensual MPG · ${itemCount} bloque${itemCount === 1 ? "" : "s"}`,
            subtitle: itemCount === 1
                ? `${summary.items[0]?.equipo_codigo || "Equipo"} · ${summary.items[0]?.valor_crudo || "Sin valor"}`
                : `${itemCount} equipos / bloques programados`,
            colorClass: "calendar-event--monthly",
            raw: summary,
        });
    }
    for (const item of agendaWeeklyDetails.value) {
        const date = String(item?.fecha_actividad || "");
        if (!date)
            continue;
        out[date] = out[date] || [];
        out[date].push({
            key: `weekly-${item.cronograma_id || "manual"}-${item.id || item.actividad}-${item.hora_inicio}-${date}`,
            type: "weekly",
            title: item.actividad || "Actividad semanal",
            subtitle: `${formatTimeLabel(item.hora_inicio, item.hora_fin)}${item.equipo_codigo ? ` · ${item.equipo_codigo}` : ""}`,
            colorClass: "calendar-event--weekly",
            raw: item,
        });
    }
    const orderMap = {
        weekly: 0,
        monthly: 1,
        agenda: 2,
    };
    for (const date of Object.keys(out)) {
        out[date] = [...(out[date] || [])].sort((a, b) => (orderMap[a.type] ?? 99) - (orderMap[b.type] ?? 99));
    }
    return out;
});
const eventsByDate = computed(() => agendaCellItems.value);
const agendaMonthSummary = computed(() => {
    const weeklyActivities = agendaWeeklyDetails.value.length;
    const monthlyHours = Object.values(agendaMonthlyHoursByDate.value).reduce((acc, item) => acc + Number(item.totalHours || 0), 0);
    const monthlyCount = agendaMonthlyDetails.value.length;
    const programaciones = Object.values(agendaProgramacionesByDate.value).reduce((acc, rows) => acc + rows.length, 0);
    return {
        weeklyActivities,
        monthlyHours,
        monthlyCount,
        programaciones,
        monthlyHoursLabel: monthlyHours > 0
            ? `${monthlyHours.toFixed(2)} h mensuales`
            : `${monthlyCount} bloque${monthlyCount === 1 ? "" : "s"} mensuales`,
    };
});
const agendaWeeklyReportRows = computed(() => agendaWeeklyDetails.value.map((item) => ({
    fecha: item?.fecha_actividad || "",
    dia: item?.dia_semana || "",
    hora_inicio: item?.hora_inicio || "",
    hora_fin: item?.hora_fin || "",
    actividad: item?.actividad || "",
    equipo: item?.equipo_codigo || "",
    tipo_proceso: item?.tipo_proceso || "",
    cronograma: item?.cronograma_codigo || "",
})));
const agendaMonthlyReportRows = computed(() => agendaMonthlyDetails.value.map((item) => ({
    fecha: item?.fecha_programada || "",
    equipo: item?.equipo_codigo || item?.equipo_nombre || "",
    valor: item?.valor_crudo || "",
    tipo: item?.tipo_mantenimiento || "",
    horas_agendadas: item?.payload_json?.total_horas_agendadas ?? item?.payload_json?.horometro_programado ?? "",
    plan: item?.plan_id || "",
    estado: item?.programacion_id ? "Sincronizado" : "Solo reporte",
})));
const agendaSelectedDayLabel = computed(() => agendaSelectedDate.value
    ? new Date(`${agendaSelectedDate.value}T00:00:00`).toLocaleDateString("es-EC", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
    })
    : "Sin fecha seleccionada");
const agendaDayWeeklyItems = computed(() => (agendaSelectedDate.value
    ? agendaCellItems.value[agendaSelectedDate.value]?.filter((item) => item.type === "weekly") || []
    : []));
const agendaDayMonthlyItems = computed(() => {
    if (!agendaSelectedDate.value)
        return [];
    const summary = agendaMonthlyHoursByDate.value[agendaSelectedDate.value];
    if (!summary?.items?.length)
        return [];
    return summary.items.map((item, index) => ({
        key: `monthly-day-${item.id || index}-${agendaSelectedDate.value}`,
        type: "monthly",
        title: `${item.equipo_codigo || item.equipo_nombre || "Equipo"} · ${item.valor_crudo || "MPG"}`,
        subtitle: item.procedimiento_codigo || item.procedimiento_nombre || item.tipo_mantenimiento || "Bloque mensual",
        colorClass: "calendar-event--monthly",
        raw: item,
    }));
});
const agendaDayProgramaciones = computed(() => (agendaSelectedDate.value
    ? agendaCellItems.value[agendaSelectedDate.value]?.filter((item) => item.type === "agenda") || []
    : []));
const agendaDayMonthlyHoursLabel = computed(() => {
    if (!agendaSelectedDate.value)
        return "0.00 h mensuales";
    const summary = agendaMonthlyHoursByDate.value[agendaSelectedDate.value];
    if (!summary)
        return "0.00 h mensuales";
    return summary.totalHours > 0
        ? `${summary.totalHours.toFixed(2)} h programadas`
        : `${summary.items.length} bloque${summary.items.length === 1 ? "" : "s"} mensuales`;
});
function chipColor(status) {
    if (status === "VENCIDA")
        return "error";
    if (status === "PROXIMA")
        return "warning";
    return "primary";
}
function eventClass(status) {
    if (status === "VENCIDA")
        return "calendar-event--danger";
    if (status === "PROXIMA")
        return "calendar-event--warning";
    return "calendar-event--normal";
}
function agendaCalendarEventClass(item) {
    return item?.colorClass || "calendar-event--normal";
}
function isMonthlyWeeklyAggregate(item) {
    return String(item?.payload_json?.fuente_programacion || "").toUpperCase() === "SEMANAL";
}
function resolveMonthlyColorKey(item) {
    if (item?.payload_json?.color_key)
        return String(item.payload_json.color_key).toUpperCase();
    if (isMonthlyWeeklyAggregate(item))
        return "SEMANAL";
    if (item?.programacion_id)
        return "SINCRONIZADO";
    return String(item?.tipo_mantenimiento || "DEFAULT").toUpperCase();
}
function monthlyCellColor(item) {
    const explicit = String(item?.payload_json?.color_hex || "").trim();
    if (explicit)
        return explicit;
    const key = resolveMonthlyColorKey(item);
    return String(selectedMonthlyColorPalette.value[key] ||
        selectedMonthlyColorPalette.value.DEFAULT ||
        defaultMonthlyPalette.DEFAULT);
}
function monthlyCellTextColor(item) {
    const hex = monthlyCellColor(item).replace("#", "");
    if (!/^[0-9A-Fa-f]{6}$/.test(hex))
        return "#1f2937";
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    return brightness >= 165 ? "#1f2937" : "#ffffff";
}
function findEquipmentByCode(code) {
    const normalized = String(code || "").replace(/\s+/g, "").toUpperCase();
    return (equipmentCatalog.value.find((item) => String(item.codigo || "")
        .replace(/\s+/g, "")
        .toUpperCase() === normalized) ?? null);
}
function fillMonthlyPaletteForm() {
    const palette = selectedMonthlyColorPalette.value;
    for (const field of monthlyPaletteFields) {
        monthlyPaletteForm[field.key] = String(palette[field.key] || defaultMonthlyPalette[field.key] || defaultMonthlyPalette.DEFAULT);
    }
}
function getMonthPeriod(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function getMonthRange(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        start: formatDate(start),
        end: formatDate(end),
    };
}
function rangesOverlap(startA, endA, startB, endB) {
    return !(endA < startB || startA > endB);
}
async function ensureMonthlyImportDetail(importId) {
    const key = String(importId || "").trim();
    if (!key)
        return null;
    if (monthlyImportDetailCache.value[key])
        return monthlyImportDetailCache.value[key];
    const { data } = await api.get(`/kpi_maintenance/programaciones/mensuales/${key}`);
    const payload = data?.data ?? null;
    if (payload) {
        monthlyImportDetailCache.value = {
            ...monthlyImportDetailCache.value,
            [key]: payload,
        };
    }
    return payload;
}
async function ensureWeeklyScheduleDetail(scheduleId) {
    const key = String(scheduleId || "").trim();
    if (!key)
        return null;
    if (weeklyScheduleDetailCache.value[key])
        return weeklyScheduleDetailCache.value[key];
    const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${key}`);
    const payload = data?.data ?? null;
    if (payload) {
        weeklyScheduleDetailCache.value = {
            ...weeklyScheduleDetailCache.value,
            [key]: payload,
        };
    }
    return payload;
}
async function loadAgendaMonthContext() {
    if (!canRead.value)
        return;
    const range = getMonthRange(currentMonth.value);
    const targetPeriod = getMonthPeriod(currentMonth.value);
    const monthlyMatches = monthlyImports.value.filter((item) => {
        const start = String(item?.fecha_inicio || "").slice(0, 10);
        const end = String(item?.fecha_fin || "").slice(0, 10);
        if (!start || !end)
            return false;
        return rangesOverlap(start, end, range.start, range.end);
    });
    const weeklyMatches = weeklySchedules.value.filter((item) => {
        const start = String(item?.fecha_inicio || "").slice(0, 10);
        const end = String(item?.fecha_fin || "").slice(0, 10);
        if (!start || !end)
            return false;
        return rangesOverlap(start, end, range.start, range.end);
    });
    try {
        await Promise.all([
            ...monthlyMatches
                .map((item) => String(item?.id || "").trim())
                .filter(Boolean)
                .map((id) => ensureMonthlyImportDetail(id)),
            ...weeklyMatches
                .map((item) => String(item?.id || "").trim())
                .filter(Boolean)
                .map((id) => ensureWeeklyScheduleDetail(id)),
        ]);
    }
    catch (e) {
        ui.error(e?.response?.data?.message || `No se pudo cargar el contexto de agenda ${targetPeriod}.`);
    }
}
function getWeeklyItems(slotKey, date) {
    return weeklyGrid.value[slotKey]?.[date] || [];
}
function displayProgramacionName(item) {
    return item?.procedimiento_nombre || item?.plan_nombre || "Sin plantilla";
}
const selectedProcedure = computed(() => procedureCatalog.value.find((item) => String(item.id) === String(form.procedimiento_id || "")) ?? null);
const resolvedPlanLabel = computed(() => {
    if (form.plan_id)
        return form.plan_id;
    if (!selectedProcedure.value)
        return "Se generará al guardar";
    return `Sincronizado desde ${selectedProcedure.value.codigo || selectedProcedure.value.nombre || "plantilla MPG"}`;
});
const selectedProcedureFrequency = computed(() => {
    const frequency = Number(selectedProcedure.value?.frecuencia_horas || 0);
    return frequency > 0 ? `${frequency} horas` : "Según configuración de plantilla";
});
function resetForm() {
    editingId.value = null;
    programacionSourceMode.value = "DINAMICA";
    programacionSourceOrigin.value = "MANUAL";
    programacionSourcePayload.value = {};
    programacionSourceDocument.value = null;
    form.equipo_id = "";
    form.procedimiento_id = "";
    form.plan_id = "";
    form.ultima_ejecucion_fecha = "";
    form.ultima_ejecucion_horas = "";
    form.proxima_fecha = "";
    form.proxima_horas = "";
    form.activo = true;
}
function openCreateForDate(date) {
    if (!canCreate.value)
        return;
    resetForm();
    form.proxima_fecha = date;
    programacionSourceMode.value = "DINAMICA";
    programacionSourceOrigin.value = "MANUAL";
    dialog.value = true;
}
function openCreateFromAgendaDialog() {
    if (!canCreate.value)
        return;
    if (!agendaSelectedDate.value)
        return;
    agendaDayDialog.value = false;
    openCreateForDate(agendaSelectedDate.value);
}
function openMonthlyProgramacionCreate() {
    if (!canCreate.value)
        return;
    openMonthlyCellCreate(selectedMonthlyPeriod.value ? `${selectedMonthlyPeriod.value}-01` : formatDate(new Date()));
}
function onMonthlyRowClick(_event, row) {
    const item = row?.item ?? row;
    handleMonthlyItemClick(item);
}
function resetMonthlyCell() {
    monthlyCell.id = null;
    monthlyCell.programacion_mensual_id = selectedMonthly.value?.id || "";
    monthlyCell.equipo_id = "";
    monthlyCell.equipo_codigo = "";
    monthlyCell.fecha_programada = selectedMonthlyPeriod.value ? `${selectedMonthlyPeriod.value}-01` : formatDate(new Date());
    monthlyCell.valor_crudo = "";
    monthlyCell.procedimiento_id = "";
    monthlyCell.observacion = "";
}
function openMonthlyCellCreate(date, row) {
    if (!canCreate.value)
        return;
    if (!selectedMonthly.value?.id) {
        resetForm();
        form.proxima_fecha = date;
        form.equipo_id = row?.equipo_id || "";
        programacionSourceMode.value = "DINAMICA";
        programacionSourceOrigin.value = "MANUAL";
        dialog.value = true;
        return;
    }
    resetMonthlyCell();
    monthlyCell.fecha_programada = date;
    monthlyCell.programacion_mensual_id = selectedMonthly.value.id;
    if (row?.equipo_id) {
        monthlyCell.equipo_id = row.equipo_id;
    }
    else if (row?.equipo_codigo) {
        const equipment = findEquipmentByCode(row.equipo_codigo);
        monthlyCell.equipo_id = equipment?.id || "";
        monthlyCell.equipo_codigo = row.equipo_codigo;
    }
    monthlyCellDialog.value = true;
}
function openMonthlyCellEdit(item) {
    if (!canEdit.value)
        return;
    resetMonthlyCell();
    monthlyCell.id = item.id;
    monthlyCell.programacion_mensual_id = item.programacion_mensual_id || selectedMonthly.value?.id || "";
    monthlyCell.equipo_id = item.equipo_id || findEquipmentByCode(item.equipo_codigo || "")?.id || "";
    monthlyCell.equipo_codigo = item.equipo_codigo || "";
    monthlyCell.fecha_programada = item.fecha_programada || "";
    monthlyCell.valor_crudo = item.valor_crudo || "";
    monthlyCell.procedimiento_id = item.procedimiento_id || "";
    monthlyCell.observacion = item.observacion || "";
    monthlyCellDialog.value = true;
}
async function openWeeklyEditorEditById(id) {
    if (!canEdit.value)
        return;
    try {
        const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${id}`);
        const payload = data?.data ?? null;
        if (!payload)
            return;
        applyWeeklySelectionByScheduleId(payload.id);
        selectedWeekly.value = payload;
        loadWeeklyEditorFromSchedule(payload);
        weeklyEditorDialog.value = true;
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo abrir el cronograma semanal asociado.");
    }
}
async function openWeeklyAggregateFromMonthly(item) {
    if (!canEdit.value)
        return;
    const cronogramaIds = Array.isArray(item?.payload_json?.cronograma_ids) ? item.payload_json.cronograma_ids : [];
    const targetId = cronogramaIds[0];
    if (!targetId) {
        ui.error("El bloque semanal no tiene un cronograma vinculado para editar.");
        return;
    }
    if (cronogramaIds.length > 1) {
        ui.open("Se abrirá el primer cronograma semanal asociado a ese total diario.", "info");
    }
    await openWeeklyEditorEditById(String(targetId));
}
function handleMonthlyItemClick(item) {
    selectedMonthlyDetail.value = item;
    if (isMonthlyWeeklyAggregate(item)) {
        void openWeeklyAggregateFromMonthly(item);
        return;
    }
    openMonthlyCellEdit(item);
}
async function saveMonthlyCell() {
    if (!canPersistMonthlyCell.value)
        return;
    if (!selectedMonthly.value?.id && !monthlyCell.programacion_mensual_id) {
        ui.error("Selecciona un calendario mensual antes de guardar.");
        return;
    }
    if (!monthlyCell.equipo_id) {
        ui.error("Debes seleccionar un equipo.");
        return;
    }
    if (!monthlyCell.fecha_programada) {
        ui.error("Debes indicar la fecha del bloque mensual.");
        return;
    }
    if (!String(monthlyCell.valor_crudo || "").trim()) {
        ui.error("Debes indicar el valor mensual, por ejemplo 325, 650, 975, R20 o una cantidad de horas.");
        return;
    }
    savingMonthlyCell.value = true;
    try {
        const payload = {
            equipo_id: monthlyCell.equipo_id,
            fecha_programada: monthlyCell.fecha_programada,
            valor_crudo: String(monthlyCell.valor_crudo || "").trim(),
            procedimiento_id: monthlyCell.procedimiento_id || undefined,
            observacion: monthlyCell.observacion || undefined,
            payload_json: {
                ...buildAuditPayload(Boolean(monthlyCell.id)),
            },
        };
        if (monthlyCell.id) {
            await api.patch(`/kpi_maintenance/programaciones/mensuales/detalles/${monthlyCell.id}`, payload);
            ui.success("Bloque mensual actualizado.");
        }
        else {
            await api.post(`/kpi_maintenance/programaciones/mensuales/${monthlyCell.programacion_mensual_id || selectedMonthly.value.id}/detalles`, payload);
            ui.success("Bloque mensual creado.");
        }
        monthlyCellDialog.value = false;
        await Promise.all([
            loadMonthlyImports(),
            selectedMonthlyId.value ? loadSelectedMonthly(selectedMonthlyId.value) : Promise.resolve(),
            loadAgendaRows(),
        ]);
        monthlyImportDetailCache.value = {};
        await loadAgendaMonthContext();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo guardar el bloque mensual.");
    }
    finally {
        savingMonthlyCell.value = false;
    }
}
function openMonthlyPaletteDialog() {
    if (!canEditMonthlyColors.value)
        return;
    fillMonthlyPaletteForm();
    monthlyPaletteDialog.value = true;
}
async function saveMonthlyPalette() {
    if (!canEditMonthlyColors.value)
        return;
    if (!selectedMonthly.value?.id) {
        ui.error("Selecciona un calendario mensual antes de editar colores.");
        return;
    }
    savingMonthlyPalette.value = true;
    try {
        await api.patch(`/kpi_maintenance/programaciones/mensuales/${selectedMonthly.value.id}/config`, {
            color_palette: { ...monthlyPaletteForm },
            payload_json: {
                ...buildAuditPayload(true),
            },
        });
        monthlyPaletteDialog.value = false;
        await loadSelectedMonthly(selectedMonthly.value.id);
        ui.success("Paleta del mensual actualizada.");
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo actualizar la paleta de colores.");
    }
    finally {
        savingMonthlyPalette.value = false;
    }
}
function openCreateFromMonthlyDetail(item) {
    if (!canCreate.value)
        return;
    if (!item)
        return;
    resetForm();
    form.equipo_id = item.equipo_id || "";
    form.procedimiento_id = item.procedimiento_id || "";
    form.plan_id = item.plan_id || "";
    form.proxima_fecha = item.fecha_programada || "";
    form.ultima_ejecucion_horas = item.payload_json?.horometro_ultimo ?? "";
    form.proxima_horas = item.payload_json?.horometro_programado ?? "";
    programacionSourceMode.value = "CALENDARIO";
    programacionSourceOrigin.value = "MENSUAL_IMPORT";
    programacionSourceDocument.value = selectedMonthly.value?.documento_origen || null;
    programacionSourcePayload.value = {
        programacion_mensual_id: item.programacion_mensual_id,
        programacion_mensual_codigo: selectedMonthly.value?.codigo || null,
        valor_crudo: item.valor_crudo,
        valor_normalizado: item.valor_normalizado,
        tipo_mantenimiento: item.tipo_mantenimiento,
        frecuencia_horas: item.frecuencia_horas,
        horometro_ultimo: item.payload_json?.horometro_ultimo ?? null,
        horometro_actual: item.payload_json?.horometro_actual ?? null,
        horometro_programado: item.payload_json?.horometro_programado ?? null,
    };
    dialog.value = true;
}
function openEdit(item) {
    if (!canEdit.value)
        return;
    editingId.value = item.id;
    programacionSourceMode.value = String(item.modo_programacion || "DINAMICA").toUpperCase() === "CALENDARIO" ? "CALENDARIO" : "DINAMICA";
    programacionSourceOrigin.value = String(item.origen_programacion || "MANUAL");
    programacionSourcePayload.value = item.payload_json || {};
    programacionSourceDocument.value = item.documento_origen || null;
    form.equipo_id = item.equipo_id || "";
    form.procedimiento_id = item.procedimiento_id || "";
    form.plan_id = item.plan_id || "";
    form.ultima_ejecucion_fecha = item.ultima_ejecucion_fecha || "";
    form.ultima_ejecucion_horas = item.ultima_ejecucion_horas ?? "";
    form.proxima_fecha = item.proxima_fecha || "";
    form.proxima_horas = item.proxima_horas ?? "";
    form.activo = item.activo !== false;
    dialog.value = true;
}
async function handleAgendaItemClick(item) {
    if (!item)
        return;
    if (item.type === "agenda") {
        agendaDayDialog.value = false;
        openEdit(item.raw);
        return;
    }
    if (item.type === "monthly") {
        agendaDayDialog.value = false;
        const monthlyRaw = item.raw?.items?.[0] || item.raw;
        if (monthlyRaw)
            handleMonthlyItemClick(monthlyRaw);
        return;
    }
    if (item.type === "weekly") {
        agendaDayDialog.value = false;
        if (item.raw?.cronograma_id) {
            await openWeeklyEditorEditById(String(item.raw.cronograma_id));
            openWeeklyCell(`${item.raw?.hora_inicio || ""}-${item.raw?.hora_fin || ""}`, item.raw?.fecha_actividad, {
                local_id: item.raw?.id || item.raw?.local_id || "",
                ...item.raw,
            });
            return;
        }
        await openSelectedWeeklyCell(`${item.raw?.hora_inicio || ""}-${item.raw?.hora_fin || ""}`, item.raw?.fecha_actividad, item.raw);
    }
}
async function openEditProgramacionById(id) {
    if (!canEdit.value)
        return;
    try {
        const { data } = await api.get(`/kpi_maintenance/programaciones/${id}`);
        openEdit(data?.data ?? data);
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo cargar la programación seleccionada.");
    }
}
function buildPayload() {
    const sourcePayload = Object.keys(programacionSourcePayload.value || {}).length
        ? programacionSourcePayload.value
        : {};
    return {
        equipo_id: form.equipo_id,
        procedimiento_id: form.procedimiento_id || undefined,
        plan_id: form.plan_id || undefined,
        ultima_ejecucion_fecha: form.ultima_ejecucion_fecha || undefined,
        ultima_ejecucion_horas: form.ultima_ejecucion_horas !== "" ? Number(form.ultima_ejecucion_horas) : undefined,
        proxima_fecha: form.proxima_fecha || undefined,
        proxima_horas: form.proxima_horas !== "" ? Number(form.proxima_horas) : undefined,
        modo_programacion: programacionSourceMode.value,
        origen_programacion: programacionSourceOrigin.value,
        documento_origen: programacionSourceDocument.value || undefined,
        payload_json: {
            ...sourcePayload,
            ...buildAuditPayload(Boolean(editingId.value)),
        },
        activo: !!form.activo,
    };
}
function resolveSingleFile(value) {
    if (Array.isArray(value))
        return value[0] ?? null;
    return value ?? null;
}
async function save() {
    if (!canPersistProgramacion.value)
        return;
    if (!form.equipo_id || (!form.procedimiento_id && !form.plan_id)) {
        ui.error("Debes seleccionar equipo y plantilla MPG o plan operativo.");
        return;
    }
    saving.value = true;
    try {
        let saved = null;
        if (editingId.value) {
            const { data } = await api.patch(`/kpi_maintenance/programaciones/${editingId.value}`, buildPayload());
            saved = data?.data ?? data;
            ui.success("Programación actualizada.");
        }
        else {
            const { data } = await api.post("/kpi_maintenance/programaciones", buildPayload());
            saved = data?.data ?? data;
            ui.success("Programación creada.");
        }
        form.plan_id = saved?.plan_id || form.plan_id;
        dialog.value = false;
        await Promise.all([loadAgendaRows(), selectedMonthlyId.value ? loadSelectedMonthly(selectedMonthlyId.value) : Promise.resolve()]);
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo guardar la programación.");
    }
    finally {
        saving.value = false;
    }
}
function openDeleteProgramacion(item) {
    if (!canDelete.value || !item?.id)
        return;
    deletingProgramacion.value = item;
    deleteDialog.value = true;
}
function closeDeleteProgramacionDialog() {
    deleteDialog.value = false;
    deletingProgramacion.value = null;
}
async function confirmDeleteProgramacion() {
    const item = deletingProgramacion.value;
    if (!canDelete.value || !item?.id)
        return;
    removingProgramacion.value = true;
    try {
        await api.delete(`/kpi_maintenance/programaciones/${item.id}`);
        ui.success("Programación eliminada.");
        await Promise.all([loadAgendaRows(), selectedMonthlyId.value ? loadSelectedMonthly(selectedMonthlyId.value) : Promise.resolve()]);
        closeDeleteProgramacionDialog();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo eliminar la programación.");
    }
    finally {
        removingProgramacion.value = false;
    }
}
async function importMonthlyWorkbook() {
    if (!canCreate.value)
        return;
    const file = resolveSingleFile(monthlyImportFile.value);
    if (!file) {
        ui.error("Selecciona el archivo Excel mensual.");
        return;
    }
    importingMonthly.value = true;
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("requested_by", currentUserName());
        if (currentUserEmail())
            formData.append("requested_by_email", currentUserEmail());
        if (currentUserId())
            formData.append("requested_user_id", currentUserId());
        const { data } = await api.post("/kpi_maintenance/programaciones/import/mensual/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        monthlyWarnings.value = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
        ui.success("Programación mensual importada.");
        monthlyImportFile.value = null;
        await Promise.all([loadMonthlyImports(), loadAgendaRows()]);
        if (data?.data?.id) {
            applyMonthlySelectionByImportId(data.data.id);
            await loadSelectedMonthly(data.data.id);
        }
        monthlyImportDetailCache.value = {};
        await loadAgendaMonthContext();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo importar el Excel mensual.");
    }
    finally {
        importingMonthly.value = false;
    }
}
async function importWeeklyWorkbook() {
    if (!canCreate.value)
        return;
    const file = resolveSingleFile(weeklyImportFile.value);
    if (!file) {
        ui.error("Selecciona el archivo Excel semanal.");
        return;
    }
    importingWeekly.value = true;
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("requested_by", currentUserName());
        if (currentUserEmail())
            formData.append("requested_by_email", currentUserEmail());
        if (currentUserId())
            formData.append("requested_user_id", currentUserId());
        const { data } = await api.post("/kpi_maintenance/inteligencia/cronogramas-semanales/import/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        weeklyWarnings.value = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
        ui.success("Cronograma semanal importado.");
        weeklyImportFile.value = null;
        await loadWeeklySchedules();
        const cronograma = data?.data?.cronograma;
        if (cronograma?.id) {
            applyWeeklySelectionByScheduleId(cronograma.id);
            selectedWeekly.value = cronograma;
        }
        weeklyScheduleDetailCache.value = {};
        await loadAgendaMonthContext();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo importar el Excel semanal.");
    }
    finally {
        importingWeekly.value = false;
    }
}
function setWeeklyEditorWeek(anchorDate) {
    weeklyEditorAnchorDate.value = anchorDate;
    const range = getWeekRangeFromDate(anchorDate);
    weeklyEditor.fecha_inicio = range.start;
    weeklyEditor.fecha_fin = range.end;
}
function handleWeeklyAnchorChange(value) {
    setWeeklyEditorWeek(value);
}
function resetWeeklyEditor() {
    weeklyEditor.id = null;
    weeklyEditor.codigo = "";
    weeklyEditor.fecha_inicio = "";
    weeklyEditor.fecha_fin = "";
    weeklyEditor.locacion = "TPTA";
    weeklyEditor.referencia_orden = "";
    weeklyEditor.resumen = "";
    weeklyEditor.documento_origen = "MANUAL";
    weeklyEditorSlots.value = [];
    weeklyEditorItems.value = [];
}
function sortWeeklySlots() {
    weeklyEditorSlots.value = [...weeklyEditorSlots.value].sort((a, b) => formatTimeLabel(a.hora_inicio, a.hora_fin).localeCompare(formatTimeLabel(b.hora_inicio, b.hora_fin)));
}
function buildWeeklySlotKey(start, end) {
    return `${normalizeTimeInput(start)}-${normalizeTimeInput(end)}`;
}
function addMinutesToTime(value, minutes) {
    const [hourRaw = "0", minuteRaw = "0"] = String(value || "")
        .slice(0, 5)
        .split(":");
    const totalMinutes = Number.parseInt(hourRaw, 10) * 60 + Number.parseInt(minuteRaw, 10) + minutes;
    const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hours = Math.floor(normalized / 60)
        .toString()
        .padStart(2, "0");
    const mins = (normalized % 60).toString().padStart(2, "0");
    return `${hours}:${mins}`;
}
function getLatestWeeklySlot() {
    if (!weeklyEditorSlots.value.length)
        return null;
    return [...weeklyEditorSlots.value].sort((a, b) => `${a.hora_inicio}-${a.hora_fin}`.localeCompare(`${b.hora_inicio}-${b.hora_fin}`))[weeklyEditorSlots.value.length - 1] ?? null;
}
function resolveUniqueWeeklySlotRange(start, end) {
    let nextStart = String(start || "").slice(0, 5) || "07:00";
    let nextEnd = String(end || "").slice(0, 5) || addMinutesToTime(nextStart, 60);
    let key = buildWeeklySlotKey(nextStart, nextEnd);
    while (weeklyEditorSlots.value.find((item) => item.key === key)) {
        nextStart = addMinutesToTime(nextStart, 60);
        nextEnd = addMinutesToTime(nextEnd, 60);
        key = buildWeeklySlotKey(nextStart, nextEnd);
    }
    return { start: nextStart, end: nextEnd };
}
function ensureWeeklySlot(start, end) {
    const hora_inicio = String(start || "").slice(0, 5);
    const hora_fin = String(end || "").slice(0, 5);
    const key = buildWeeklySlotKey(hora_inicio, hora_fin);
    if (!weeklyEditorSlots.value.find((item) => item.key === key)) {
        weeklyEditorSlots.value.push({ key, hora_inicio, hora_fin });
        sortWeeklySlots();
    }
    return key;
}
async function fetchNextWeeklyCode() {
    const { data } = await api.get("/kpi_maintenance/inteligencia/cronogramas-semanales/next-code");
    return data?.data?.code || data?.code || "";
}
function addWeeklySlot(start = "07:00", end = "08:00") {
    if (!weeklyEditorSlots.value.length) {
        ensureWeeklySlot(start, end);
        return;
    }
    const useProvidedRange = !!String(start || "").trim() && !!String(end || "").trim() &&
        !(start === "07:00" && end === "08:00");
    const baseRange = useProvidedRange
        ? { start: String(start).slice(0, 5), end: String(end).slice(0, 5) }
        : (() => {
            const latest = getLatestWeeklySlot();
            const nextStart = latest?.hora_fin?.slice(0, 5) || "07:00";
            return {
                start: nextStart,
                end: addMinutesToTime(nextStart, 60),
            };
        })();
    const uniqueRange = resolveUniqueWeeklySlotRange(baseRange.start, baseRange.end);
    ensureWeeklySlot(uniqueRange.start, uniqueRange.end);
}
function addWeeklySlotAfter(slotKey) {
    const slot = weeklyEditorSlots.value.find((item) => item.key === slotKey);
    if (!slot) {
        addWeeklySlot();
        return;
    }
    const nextStart = slot.hora_fin?.slice(0, 5) || slot.hora_inicio?.slice(0, 5) || "07:00";
    const uniqueRange = resolveUniqueWeeklySlotRange(nextStart, addMinutesToTime(nextStart, 60));
    ensureWeeklySlot(uniqueRange.start, uniqueRange.end);
}
function updateWeeklySlot(slotKey, field, value) {
    const slot = weeklyEditorSlots.value.find((item) => item.key === slotKey);
    if (!slot)
        return;
    const previousKey = slot.key;
    slot[field] = String(value || "").slice(0, 5);
    slot.key = buildWeeklySlotKey(slot.hora_inicio, slot.hora_fin);
    if (slot.key !== previousKey) {
        weeklyEditorItems.value = weeklyEditorItems.value.map((item) => item.slot_key === previousKey ? { ...item, slot_key: slot.key } : item);
    }
    sortWeeklySlots();
}
function removeWeeklySlot(slotKey) {
    weeklyEditorSlots.value = weeklyEditorSlots.value.filter((item) => item.key !== slotKey);
    weeklyEditorItems.value = weeklyEditorItems.value.filter((item) => item.slot_key !== slotKey);
    if (!weeklyEditorSlots.value.length)
        addWeeklySlot();
}
function resolveWeekDayLabel(date) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "long" }).replace(/^\w/, (m) => m.toUpperCase());
}
function getWeeklyEditorItems(slotKey, date) {
    return weeklyEditorItems.value.filter((item) => item.slot_key === slotKey && item.fecha_actividad === date);
}
function openWeeklyCell(slotKey, date, item) {
    if (item ? !canEdit.value : !canCreate.value)
        return;
    weeklyCell.local_id = item?.local_id || "";
    weeklyCell.slot_key = slotKey;
    weeklyCell.fecha_actividad = date;
    weeklyCell.dia_semana = item?.dia_semana || resolveWeekDayLabel(date);
    weeklyCell.actividad = item?.actividad || "";
    weeklyCell.tipo_proceso = item?.tipo_proceso || "OPERACION";
    weeklyCell.responsable_area = item?.responsable_area || "";
    weeklyCell.equipo_codigo = item?.equipo_codigo || "";
    weeklyCell.observacion = item?.observacion || "";
    weeklyCellDialog.value = true;
}
async function openSelectedWeeklyCell(slotKey, date, item) {
    if (item ? !canEdit.value : !canCreate.value)
        return;
    if (!selectedWeekly.value?.id) {
        weeklyPlannerAnchorDate.value = date;
        await openWeeklyEditorCreate(date);
        if (!weeklyEditorSlots.value.find((entry) => entry.key === slotKey)) {
            const [start = "07:00", end = "08:00"] = slotKey.split("-");
            ensureWeeklySlot(start, end);
        }
        openWeeklyCell(slotKey, date, item);
        return;
    }
    try {
        const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${selectedWeekly.value.id}`);
        const payload = data?.data ?? selectedWeekly.value;
        loadWeeklyEditorFromSchedule(payload);
        weeklyCellPersistDirect.value = true;
        if (!weeklyEditorSlots.value.find((entry) => entry.key === slotKey)) {
            const [start = "07:00", end = "08:00"] = slotKey.split("-");
            ensureWeeklySlot(start, end);
        }
        openWeeklyCell(slotKey, date, item);
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo preparar la edición del cronograma semanal.");
    }
}
async function saveWeeklyCell() {
    if (!canPersistWeeklyCell.value)
        return;
    if (!weeklyCell.actividad.trim()) {
        ui.error("Debes ingresar la actividad del bloque semanal.");
        return;
    }
    const payload = {
        local_id: weeklyCell.local_id || createLocalId(),
        slot_key: weeklyCell.slot_key,
        fecha_actividad: weeklyCell.fecha_actividad,
        dia_semana: weeklyCell.dia_semana || resolveWeekDayLabel(weeklyCell.fecha_actividad),
        actividad: weeklyCell.actividad.trim(),
        tipo_proceso: weeklyCell.tipo_proceso || "OPERACION",
        responsable_area: weeklyCell.responsable_area?.trim() || "",
        equipo_codigo: weeklyCell.equipo_codigo?.trim() || "",
        observacion: weeklyCell.observacion?.trim() || "",
    };
    const index = weeklyEditorItems.value.findIndex((item) => item.local_id === payload.local_id);
    if (index >= 0) {
        weeklyEditorItems.value[index] = { ...weeklyEditorItems.value[index], ...payload };
    }
    else {
        weeklyEditorItems.value.push(payload);
    }
    weeklyCellDialog.value = false;
    if (weeklyCellPersistDirect.value && weeklyEditor.id) {
        await persistWeeklyEditor({ showToast: true });
        weeklyCellPersistDirect.value = false;
    }
}
function removeWeeklyItem(localId) {
    weeklyEditorItems.value = weeklyEditorItems.value.filter((item) => item.local_id !== localId);
}
function computeWeeklyDailyHours(details) {
    return details.reduce((acc, item) => {
        const [startHour = 0, startMinute = 0] = String(item.hora_inicio || "")
            .slice(0, 5)
            .split(":")
            .map(Number);
        const [endHour = 0, endMinute = 0] = String(item.hora_fin || "")
            .slice(0, 5)
            .split(":")
            .map(Number);
        if (!item.fecha_actividad)
            return acc;
        const duration = (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
        acc[item.fecha_actividad] = Number(((acc[item.fecha_actividad] ?? 0) + Math.max(duration, 0)).toFixed(2));
        return acc;
    }, {});
}
async function openWeeklyEditorCreate(anchorDate) {
    if (!canCreate.value)
        return;
    resetWeeklyEditor();
    weeklyCellPersistDirect.value = false;
    setWeeklyEditorWeek(anchorDate || weeklyPlannerAnchorDate.value || formatDate(new Date()));
    try {
        weeklyEditor.codigo = await fetchNextWeeklyCode();
    }
    catch {
        weeklyEditor.codigo = `PCS-${Date.now()}`;
    }
    addWeeklySlot();
    weeklyEditorDialog.value = true;
}
function loadWeeklyEditorFromSchedule(schedule) {
    resetWeeklyEditor();
    weeklyEditor.id = schedule.id;
    weeklyEditor.codigo = schedule.codigo || "";
    weeklyEditor.fecha_inicio = schedule.fecha_inicio || "";
    weeklyEditor.fecha_fin = schedule.fecha_fin || "";
    weeklyEditor.locacion = schedule.locacion || "TPTA";
    weeklyEditor.referencia_orden = schedule.referencia_orden || "";
    weeklyEditor.resumen = schedule.resumen || "";
    weeklyEditor.documento_origen = schedule.documento_origen || "MANUAL";
    weeklyEditorAnchorDate.value = schedule.fecha_inicio || formatDate(new Date());
    for (const detail of Array.isArray(schedule.detalles) ? schedule.detalles : []) {
        const slotKey = ensureWeeklySlot(detail.hora_inicio || "07:00", detail.hora_fin || "08:00");
        weeklyEditorItems.value.push({
            local_id: detail.id || createLocalId(),
            slot_key: slotKey,
            fecha_actividad: detail.fecha_actividad,
            dia_semana: detail.dia_semana,
            actividad: detail.actividad,
            tipo_proceso: detail.tipo_proceso || "OPERACION",
            responsable_area: detail.responsable_area || "",
            equipo_codigo: detail.equipo_codigo || "",
            observacion: detail.observacion || "",
        });
    }
    if (!weeklyEditorSlots.value.length)
        addWeeklySlot();
}
async function openWeeklyEditorEdit(schedule) {
    if (!canEdit.value)
        return;
    try {
        weeklyCellPersistDirect.value = false;
        const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${schedule.id}`);
        loadWeeklyEditorFromSchedule(data?.data ?? schedule);
        weeklyEditorDialog.value = true;
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo cargar el cronograma semanal.");
    }
}
async function saveWeeklyEditor() {
    if (!canPersistWeeklyEditor.value)
        return;
    if (!weeklyEditor.codigo || !weeklyEditor.fecha_inicio || !weeklyEditor.fecha_fin) {
        ui.error("Debes definir código y rango semanal.");
        return;
    }
    const slotMap = new Map(weeklyEditorSlots.value.map((slot) => [slot.key, slot]));
    const detalles = weeklyEditorItems.value.map((item, index) => {
        const slot = slotMap.get(item.slot_key);
        return {
            dia_semana: item.dia_semana || resolveWeekDayLabel(item.fecha_actividad),
            fecha_actividad: item.fecha_actividad,
            hora_inicio: normalizeTimeInput(slot?.hora_inicio || "07:00"),
            hora_fin: normalizeTimeInput(slot?.hora_fin || "08:00"),
            tipo_proceso: item.tipo_proceso || "OPERACION",
            actividad: item.actividad,
            responsable_area: item.responsable_area || undefined,
            equipo_codigo: item.equipo_codigo || undefined,
            observacion: item.observacion || undefined,
            orden: index + 1,
        };
    });
    if (!detalles.length) {
        ui.error("Debes agregar al menos una actividad al cronograma semanal.");
        return;
    }
    savingWeekly.value = true;
    try {
        const payload = {
            codigo: weeklyEditor.codigo,
            fecha_inicio: weeklyEditor.fecha_inicio,
            fecha_fin: weeklyEditor.fecha_fin,
            locacion: weeklyEditor.locacion || undefined,
            referencia_orden: weeklyEditor.referencia_orden || undefined,
            documento_origen: weeklyEditor.documento_origen || "MANUAL",
            resumen: weeklyEditor.resumen || undefined,
            payload_json: {
                editor_source: "MANUAL",
                daily_hours: computeWeeklyDailyHours(detalles),
                ...buildAuditPayload(Boolean(weeklyEditor.id)),
            },
            detalles,
        };
        let savedId = weeklyEditor.id;
        if (weeklyEditor.id) {
            const { data } = await api.patch(`/kpi_maintenance/inteligencia/cronogramas-semanales/${weeklyEditor.id}`, payload);
            savedId = data?.data?.id || weeklyEditor.id;
            ui.success("Cronograma semanal actualizado.");
        }
        else {
            const { data } = await api.post("/kpi_maintenance/inteligencia/cronogramas-semanales", payload);
            savedId = data?.data?.id || null;
            ui.success("Cronograma semanal creado.");
        }
        weeklyEditorDialog.value = false;
        await loadWeeklySchedules();
        if (savedId) {
            applyWeeklySelectionByScheduleId(savedId);
            await loadSelectedWeekly(savedId);
        }
        if (selectedMonthlyId.value) {
            await loadSelectedMonthly(selectedMonthlyId.value);
        }
        weeklyScheduleDetailCache.value = {};
        await loadAgendaMonthContext();
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo guardar el cronograma semanal.");
    }
    finally {
        savingWeekly.value = false;
    }
}
async function persistWeeklyEditor(options) {
    if (!weeklyEditor.codigo || !weeklyEditor.fecha_inicio || !weeklyEditor.fecha_fin) {
        ui.error("Debes definir código y rango semanal.");
        return false;
    }
    const slotMap = new Map(weeklyEditorSlots.value.map((slot) => [slot.key, slot]));
    const detalles = weeklyEditorItems.value.map((item, index) => {
        const slot = slotMap.get(item.slot_key);
        return {
            dia_semana: item.dia_semana || resolveWeekDayLabel(item.fecha_actividad),
            fecha_actividad: item.fecha_actividad,
            hora_inicio: normalizeTimeInput(slot?.hora_inicio || "07:00"),
            hora_fin: normalizeTimeInput(slot?.hora_fin || "08:00"),
            tipo_proceso: item.tipo_proceso || "OPERACION",
            actividad: item.actividad,
            responsable_area: item.responsable_area || undefined,
            equipo_codigo: item.equipo_codigo || undefined,
            observacion: item.observacion || undefined,
            orden: index + 1,
        };
    });
    if (!detalles.length) {
        ui.error("Debes agregar al menos una actividad al cronograma semanal.");
        return false;
    }
    savingWeekly.value = true;
    try {
        const payload = {
            codigo: weeklyEditor.codigo,
            fecha_inicio: weeklyEditor.fecha_inicio,
            fecha_fin: weeklyEditor.fecha_fin,
            locacion: weeklyEditor.locacion || undefined,
            referencia_orden: weeklyEditor.referencia_orden || undefined,
            documento_origen: weeklyEditor.documento_origen || "MANUAL",
            resumen: weeklyEditor.resumen || undefined,
            payload_json: {
                editor_source: "MANUAL",
                daily_hours: computeWeeklyDailyHours(detalles),
                ...buildAuditPayload(Boolean(weeklyEditor.id)),
            },
            detalles,
        };
        let savedId = weeklyEditor.id;
        if (weeklyEditor.id) {
            const { data } = await api.patch(`/kpi_maintenance/inteligencia/cronogramas-semanales/${weeklyEditor.id}`, payload);
            savedId = data?.data?.id || weeklyEditor.id;
            if (options?.showToast !== false)
                ui.success("Cronograma semanal actualizado.");
        }
        else {
            const { data } = await api.post("/kpi_maintenance/inteligencia/cronogramas-semanales", payload);
            savedId = data?.data?.id || null;
            if (options?.showToast !== false)
                ui.success("Cronograma semanal creado.");
        }
        await loadWeeklySchedules();
        if (savedId) {
            applyWeeklySelectionByScheduleId(savedId);
            await loadSelectedWeekly(savedId);
        }
        if (selectedMonthlyId.value) {
            await loadSelectedMonthly(selectedMonthlyId.value);
        }
        weeklyScheduleDetailCache.value = {};
        await loadAgendaMonthContext();
        return true;
    }
    catch (e) {
        ui.error(e?.response?.data?.message || "No se pudo guardar el cronograma semanal.");
        return false;
    }
    finally {
        savingWeekly.value = false;
    }
}
function changeMonth(offset) {
    const next = new Date(currentMonth.value);
    next.setMonth(next.getMonth() + offset);
    currentMonth.value = next;
}
function goToToday() {
    const today = new Date();
    currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
}
function openAgendaDay(date) {
    agendaSelectedDate.value = date;
    agendaDayDialog.value = true;
}
watch(selectedMonthlyPeriod, (period) => {
    if (!period)
        return;
    const target = new Date(`${period}-01T00:00:00`);
    if (Number.isNaN(target.getTime()))
        return;
    currentMonth.value = new Date(target.getFullYear(), target.getMonth(), 1);
});
watch(() => selectedWeekly.value?.fecha_inicio, (value) => {
    if (!value)
        return;
    const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(target.getTime()))
        return;
    currentMonth.value = new Date(target.getFullYear(), target.getMonth(), 1);
    weeklyPlannerAnchorDate.value = formatDate(target);
});
watch(currentMonth, async (value) => {
    agendaYear.value = value.getFullYear();
    agendaMonth.value = value.getMonth() + 1;
    await loadAgendaMonthContext();
}, { immediate: true });
watch([agendaYear, agendaMonth], ([year, month]) => {
    if (!year || !month)
        return;
    const next = new Date(year, month - 1, 1);
    if (next.getFullYear() !== currentMonth.value.getFullYear() ||
        next.getMonth() !== currentMonth.value.getMonth()) {
        currentMonth.value = next;
    }
});
async function runProgramacionExport(section, format, report) {
    const key = exportKey(section, format);
    exportState[key] = true;
    try {
        if (format === "excel") {
            await downloadReportExcel(report);
        }
        else {
            await downloadReportPdf(report);
        }
    }
    catch (e) {
        ui.error(e?.message || "No se pudo generar el reporte de programaciones.");
    }
    finally {
        exportState[key] = false;
    }
}
async function exportMonthly(format) {
    if (!canAccessProgrammingReports.value) {
        ui.error("No tienes permisos para exportar este reporte.");
        return;
    }
    const report = buildMonthlyProgrammingReport({
        periodLabel: selectedMonthlyPeriod.value || "Sin período",
        matrixRows: monthlyReportMatrixRows.value,
        detailRows: monthlyFilteredDetails.value,
        summary: [
            { label: "Eventos", value: monthlySummary.value.totalEvents },
            { label: "Sincronizados", value: monthlySummary.value.syncedEvents },
            { label: "Equipos", value: monthlySummary.value.totalEquipments },
        ],
    });
    await runProgramacionExport("mensual", format, report);
}
async function exportWeekly(format) {
    if (!canAccessProgrammingReports.value) {
        ui.error("No tienes permisos para exportar este reporte.");
        return;
    }
    const report = buildWeeklyProgrammingReport({
        rangeLabel: weeklyDisplayRange.value
            ? `${weeklyDisplayRange.value.start} / ${weeklyDisplayRange.value.end}`
            : "Sin semana seleccionada",
        matrixRows: weeklyReportMatrixRows.value,
        detailRows: Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles : [],
        summary: [
            { label: "Cronograma", value: selectedWeekly.value?.codigo || "Sin cronograma" },
            {
                label: "Actividades",
                value: Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles.length : 0,
            },
            {
                label: "Horas",
                value: weeklyDailyHours.value.reduce((acc, item) => acc + Number(item.hours || 0), 0).toFixed(2),
            },
        ],
    });
    await runProgramacionExport("semanal", format, report);
}
async function exportAgenda(format) {
    if (!canAccessProgrammingReports.value) {
        ui.error("No tienes permisos para exportar este reporte.");
        return;
    }
    const report = buildAgendaProgrammingReport({
        monthLabel: monthLabel.value,
        agendaRows: agendaRows.value.filter((item) => String(item?.proxima_fecha || "").startsWith(agendaMonthPeriod.value)),
        weeklyRows: agendaWeeklyReportRows.value,
        monthlyRows: agendaMonthlyReportRows.value,
        summary: [
            { label: "Programaciones agenda", value: agendaMonthSummary.value.programaciones },
            { label: "Actividades semanales", value: agendaMonthSummary.value.weeklyActivities },
            { label: "Horas mensuales", value: agendaMonthSummary.value.monthlyHours.toFixed(2) },
            { label: "Bloques mensuales", value: agendaMonthSummary.value.monthlyCount },
        ],
    });
    await runProgramacionExport("agenda", format, report);
}
onMounted(async () => {
    if (!canRead.value)
        return;
    setWeeklyEditorWeek(weeklyPlannerAnchorDate.value);
    await loadAll();
    await loadAgendaMonthContext();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-table__sticky-2']} */ ;
/** @type {__VLS_StyleScopedClasses['matrix-cell--weekly']} */ ;
/** @type {__VLS_StyleScopedClasses['programaciones-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['agenda-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['agenda-toolbar__select']} */ ;
/** @type {__VLS_StyleScopedClasses['agenda-toolbar__select--month']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['programaciones-page']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['weekly-activity']} */ ;
/** @type {__VLS_StyleScopedClasses['weekly-slot-inline-add']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "programaciones-page" },
});
/** @type {__VLS_StyleScopedClasses['programaciones-page']} */ ;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "programaciones-page__content" },
    });
    /** @type {__VLS_StyleScopedClasses['programaciones-page__content']} */ ;
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
        ...{ class: "d-flex align-center justify-space-between page-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
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
    let __VLS_12;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        variant: "tonal",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loadingAll),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        variant: "tonal",
        prependIcon: "mdi-refresh",
        loading: (__VLS_ctx.loadingAll),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_17;
    const __VLS_18 = ({ click: {} },
        { onClick: (__VLS_ctx.loadAll) });
    const { default: __VLS_19 } = __VLS_15.slots;
    // @ts-ignore
    [loadingAll, loadAll,];
    var __VLS_15;
    var __VLS_16;
    if (__VLS_ctx.error) {
        let __VLS_20;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
            type: "warning",
            variant: "tonal",
            ...{ class: "mt-4" },
            text: (__VLS_ctx.error),
        }));
        const __VLS_22 = __VLS_21({
            type: "warning",
            variant: "tonal",
            ...{ class: "mt-4" },
            text: (__VLS_ctx.error),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    }
    let __VLS_25;
    /** @ts-ignore @type {typeof __VLS_components.vTabs | typeof __VLS_components.VTabs | typeof __VLS_components.vTabs | typeof __VLS_components.VTabs} */
    vTabs;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "mt-4" },
        color: "primary",
    }));
    const __VLS_27 = __VLS_26({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "mt-4" },
        color: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    const { default: __VLS_30 } = __VLS_28.slots;
    let __VLS_31;
    /** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
    vTab;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
        value: "mensual",
    }));
    const __VLS_33 = __VLS_32({
        value: "mensual",
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    const { default: __VLS_36 } = __VLS_34.slots;
    // @ts-ignore
    [error, error, activeTab,];
    var __VLS_34;
    let __VLS_37;
    /** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
    vTab;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
        value: "semanal",
    }));
    const __VLS_39 = __VLS_38({
        value: "semanal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    const { default: __VLS_42 } = __VLS_40.slots;
    // @ts-ignore
    [];
    var __VLS_40;
    let __VLS_43;
    /** @ts-ignore @type {typeof __VLS_components.vTab | typeof __VLS_components.VTab | typeof __VLS_components.vTab | typeof __VLS_components.VTab} */
    vTab;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
        value: "agenda",
    }));
    const __VLS_45 = __VLS_44({
        value: "agenda",
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    const { default: __VLS_48 } = __VLS_46.slots;
    // @ts-ignore
    [];
    var __VLS_46;
    // @ts-ignore
    [];
    var __VLS_28;
    // @ts-ignore
    [];
    var __VLS_9;
    let __VLS_49;
    /** @ts-ignore @type {typeof __VLS_components.vWindow | typeof __VLS_components.VWindow | typeof __VLS_components.vWindow | typeof __VLS_components.VWindow} */
    vWindow;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "mt-4" },
        touchless: true,
    }));
    const __VLS_51 = __VLS_50({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "mt-4" },
        touchless: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_50));
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    const { default: __VLS_54 } = __VLS_52.slots;
    let __VLS_55;
    /** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
    vWindowItem;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
        value: "mensual",
    }));
    const __VLS_57 = __VLS_56({
        value: "mensual",
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    const { default: __VLS_60 } = __VLS_58.slots;
    let __VLS_61;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_63 = __VLS_62({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_66 } = __VLS_64.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between page-wrap mb-4" },
        ...{ style: {} },
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
        ...{ class: "programaciones-toolbar" },
    });
    /** @type {__VLS_StyleScopedClasses['programaciones-toolbar']} */ ;
    if (__VLS_ctx.canAccessProgrammingReports) {
        let __VLS_67;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('mensual', 'excel')),
        }));
        const __VLS_69 = __VLS_68({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('mensual', 'excel')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        let __VLS_72;
        const __VLS_73 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessProgrammingReports))
                        return;
                    __VLS_ctx.exportMonthly('excel');
                    // @ts-ignore
                    [activeTab, canAccessProgrammingReports, isExporting, exportMonthly,];
                } });
        const { default: __VLS_74 } = __VLS_70.slots;
        // @ts-ignore
        [];
        var __VLS_70;
        var __VLS_71;
    }
    if (__VLS_ctx.canAccessProgrammingReports) {
        let __VLS_75;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('mensual', 'pdf')),
        }));
        const __VLS_77 = __VLS_76({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('mensual', 'pdf')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        let __VLS_80;
        const __VLS_81 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessProgrammingReports))
                        return;
                    __VLS_ctx.exportMonthly('pdf');
                    // @ts-ignore
                    [canAccessProgrammingReports, isExporting, exportMonthly,];
                } });
        const { default: __VLS_82 } = __VLS_78.slots;
        // @ts-ignore
        [];
        var __VLS_78;
        var __VLS_79;
    }
    if (__VLS_ctx.canCreate) {
        let __VLS_83;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-plus",
        }));
        const __VLS_85 = __VLS_84({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-plus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        let __VLS_88;
        const __VLS_89 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canCreate))
                        return;
                    __VLS_ctx.openMonthlyProgramacionCreate();
                    // @ts-ignore
                    [canCreate, openMonthlyProgramacionCreate,];
                } });
        const { default: __VLS_90 } = __VLS_86.slots;
        // @ts-ignore
        [];
        var __VLS_86;
        var __VLS_87;
    }
    if (__VLS_ctx.canCreate) {
        let __VLS_91;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent1(__VLS_91, new __VLS_91({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-calendar-plus",
            disabled: (!__VLS_ctx.selectedMonthlyDetail || !!__VLS_ctx.selectedMonthlyDetail?.programacion_id),
        }));
        const __VLS_93 = __VLS_92({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-calendar-plus",
            disabled: (!__VLS_ctx.selectedMonthlyDetail || !!__VLS_ctx.selectedMonthlyDetail?.programacion_id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        let __VLS_96;
        const __VLS_97 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canCreate))
                        return;
                    __VLS_ctx.selectedMonthlyDetail && __VLS_ctx.openCreateFromMonthlyDetail(__VLS_ctx.selectedMonthlyDetail);
                    // @ts-ignore
                    [canCreate, selectedMonthlyDetail, selectedMonthlyDetail, selectedMonthlyDetail, selectedMonthlyDetail, openCreateFromMonthlyDetail,];
                } });
        const { default: __VLS_98 } = __VLS_94.slots;
        // @ts-ignore
        [];
        var __VLS_94;
        var __VLS_95;
    }
    if (__VLS_ctx.canEdit) {
        let __VLS_99;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-pencil",
            disabled: (!__VLS_ctx.selectedMonthlyDetail?.programacion_id),
        }));
        const __VLS_101 = __VLS_100({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-pencil",
            disabled: (!__VLS_ctx.selectedMonthlyDetail?.programacion_id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        let __VLS_104;
        const __VLS_105 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canEdit))
                        return;
                    __VLS_ctx.selectedMonthlyDetail?.programacion_id && __VLS_ctx.openEditProgramacionById(__VLS_ctx.selectedMonthlyDetail.programacion_id);
                    // @ts-ignore
                    [selectedMonthlyDetail, selectedMonthlyDetail, selectedMonthlyDetail, canEdit, openEditProgramacionById,];
                } });
        const { default: __VLS_106 } = __VLS_102.slots;
        // @ts-ignore
        [];
        var __VLS_102;
        var __VLS_103;
    }
    if (__VLS_ctx.canEditMonthlyColors) {
        let __VLS_107;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-palette",
            disabled: (!__VLS_ctx.selectedMonthly),
        }));
        const __VLS_109 = __VLS_108({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-palette",
            disabled: (!__VLS_ctx.selectedMonthly),
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        let __VLS_112;
        const __VLS_113 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canEditMonthlyColors))
                        return;
                    __VLS_ctx.openMonthlyPaletteDialog();
                    // @ts-ignore
                    [canEditMonthlyColors, selectedMonthly, openMonthlyPaletteDialog,];
                } });
        const { default: __VLS_114 } = __VLS_110.slots;
        // @ts-ignore
        [];
        var __VLS_110;
        var __VLS_111;
    }
    if (__VLS_ctx.canCreate) {
        let __VLS_115;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.importingMonthly),
        }));
        const __VLS_117 = __VLS_116({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.importingMonthly),
        }, ...__VLS_functionalComponentArgsRest(__VLS_116));
        let __VLS_120;
        const __VLS_121 = ({ click: {} },
            { onClick: (__VLS_ctx.importMonthlyWorkbook) });
        const { default: __VLS_122 } = __VLS_118.slots;
        // @ts-ignore
        [canCreate, importingMonthly, importMonthlyWorkbook,];
        var __VLS_118;
        var __VLS_119;
    }
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
        md: "6",
        lg: "6",
    }));
    const __VLS_131 = __VLS_130({
        cols: "12",
        md: "6",
        lg: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_130));
    const { default: __VLS_134 } = __VLS_132.slots;
    let __VLS_135;
    /** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
    vFileInput;
    // @ts-ignore
    const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
        modelValue: (__VLS_ctx.monthlyImportFile),
        accept: ".xlsx,.xls",
        label: "Excel mensual MPG",
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-file-excel",
        showSize: true,
        hideDetails: "auto",
    }));
    const __VLS_137 = __VLS_136({
        modelValue: (__VLS_ctx.monthlyImportFile),
        accept: ".xlsx,.xls",
        label: "Excel mensual MPG",
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-file-excel",
        showSize: true,
        hideDetails: "auto",
    }, ...__VLS_functionalComponentArgsRest(__VLS_136));
    // @ts-ignore
    [monthlyImportFile,];
    var __VLS_132;
    let __VLS_140;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
        cols: "12",
        md: "2",
        lg: "2",
    }));
    const __VLS_142 = __VLS_141({
        cols: "12",
        md: "2",
        lg: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    const { default: __VLS_145 } = __VLS_143.slots;
    let __VLS_146;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
        modelValue: (__VLS_ctx.selectedMonthlyYear),
        items: (__VLS_ctx.monthlyYearOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Año",
        variant: "outlined",
        density: "compact",
        clearable: true,
    }));
    const __VLS_148 = __VLS_147({
        modelValue: (__VLS_ctx.selectedMonthlyYear),
        items: (__VLS_ctx.monthlyYearOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Año",
        variant: "outlined",
        density: "compact",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    // @ts-ignore
    [selectedMonthlyYear, monthlyYearOptions,];
    var __VLS_143;
    let __VLS_151;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
        cols: "12",
        md: "2",
        lg: "2",
    }));
    const __VLS_153 = __VLS_152({
        cols: "12",
        md: "2",
        lg: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
    const { default: __VLS_156 } = __VLS_154.slots;
    let __VLS_157;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_158 = __VLS_asFunctionalComponent1(__VLS_157, new __VLS_157({
        modelValue: (__VLS_ctx.selectedMonthlyMonth),
        items: (__VLS_ctx.monthlyMonthOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Mes",
        variant: "outlined",
        density: "compact",
        clearable: true,
        disabled: (!__VLS_ctx.selectedMonthlyYear),
    }));
    const __VLS_159 = __VLS_158({
        modelValue: (__VLS_ctx.selectedMonthlyMonth),
        items: (__VLS_ctx.monthlyMonthOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Mes",
        variant: "outlined",
        density: "compact",
        clearable: true,
        disabled: (!__VLS_ctx.selectedMonthlyYear),
    }, ...__VLS_functionalComponentArgsRest(__VLS_158));
    // @ts-ignore
    [selectedMonthlyYear, selectedMonthlyMonth, monthlyMonthOptions,];
    var __VLS_154;
    let __VLS_162;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
        cols: "12",
        md: "2",
        lg: "2",
    }));
    const __VLS_164 = __VLS_163({
        cols: "12",
        md: "2",
        lg: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    const { default: __VLS_167 } = __VLS_165.slots;
    let __VLS_168;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
        modelValue: (__VLS_ctx.selectedMonthlyPeriod || ''),
        label: "Periodo",
        variant: "outlined",
        density: "compact",
        readonly: true,
    }));
    const __VLS_170 = __VLS_169({
        modelValue: (__VLS_ctx.selectedMonthlyPeriod || ''),
        label: "Periodo",
        variant: "outlined",
        density: "compact",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    // @ts-ignore
    [selectedMonthlyPeriod,];
    var __VLS_165;
    // @ts-ignore
    [];
    var __VLS_126;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-strip mt-3" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    let __VLS_173;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_174 = __VLS_asFunctionalComponent1(__VLS_173, new __VLS_173({
        color: "primary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_175 = __VLS_174({
        color: "primary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_174));
    const { default: __VLS_178 } = __VLS_176.slots;
    (__VLS_ctx.monthlyImports.length);
    // @ts-ignore
    [monthlyImports,];
    var __VLS_176;
    let __VLS_179;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_180 = __VLS_asFunctionalComponent1(__VLS_179, new __VLS_179({
        color: "secondary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_181 = __VLS_180({
        color: "secondary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_180));
    const { default: __VLS_184 } = __VLS_182.slots;
    (__VLS_ctx.monthlySummary.totalEvents);
    // @ts-ignore
    [monthlySummary,];
    var __VLS_182;
    let __VLS_185;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_186 = __VLS_asFunctionalComponent1(__VLS_185, new __VLS_185({
        color: "success",
        variant: "tonal",
        label: true,
    }));
    const __VLS_187 = __VLS_186({
        color: "success",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_186));
    const { default: __VLS_190 } = __VLS_188.slots;
    (__VLS_ctx.monthlySummary.syncedEvents);
    // @ts-ignore
    [monthlySummary,];
    var __VLS_188;
    let __VLS_191;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent1(__VLS_191, new __VLS_191({
        color: "info",
        variant: "tonal",
        label: true,
    }));
    const __VLS_193 = __VLS_192({
        color: "info",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    const { default: __VLS_196 } = __VLS_194.slots;
    (__VLS_ctx.monthlySummary.totalEquipments);
    // @ts-ignore
    [monthlySummary,];
    var __VLS_194;
    if (__VLS_ctx.monthlyWarnings.length) {
        let __VLS_197;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_198 = __VLS_asFunctionalComponent1(__VLS_197, new __VLS_197({
            ...{ class: "mt-4" },
            type: "warning",
            variant: "tonal",
            text: (__VLS_ctx.monthlyWarnings.join(' · ')),
        }));
        const __VLS_199 = __VLS_198({
            ...{ class: "mt-4" },
            type: "warning",
            variant: "tonal",
            text: (__VLS_ctx.monthlyWarnings.join(' · ')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_198));
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    if (__VLS_ctx.selectedMonthly) {
        (__VLS_ctx.selectedMonthly.codigo);
        (__VLS_ctx.selectedMonthly.nombre_archivo || __VLS_ctx.selectedMonthly.documento_origen || "Sin archivo");
    }
    else {
        (__VLS_ctx.selectedMonthlyPeriod || "Sin periodo");
    }
    if (__VLS_ctx.loadingAll) {
        const __VLS_202 = LoadingTableState;
        // @ts-ignore
        const __VLS_203 = __VLS_asFunctionalComponent1(__VLS_202, new __VLS_202({
            message: "Cargando programación mensual...",
            rows: (5),
            columns: (5),
            ...{ class: "mt-4" },
        }));
        const __VLS_204 = __VLS_203({
            message: "Cargando programación mensual...",
            rows: (5),
            columns: (5),
            ...{ class: "mt-4" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_203));
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "matrix-wrap mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
            ...{ class: "matrix-table matrix-table--monthly" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
        /** @type {__VLS_StyleScopedClasses['matrix-table--monthly']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
            ...{ class: "matrix-table__sticky" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
            ...{ class: "matrix-table__sticky-2" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-table__sticky-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        for (const [day] of __VLS_vFor((__VLS_ctx.monthlyDays))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
                key: (`day-${day.key}`),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            (day.day);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (day.label);
            // @ts-ignore
            [loadingAll, selectedMonthly, selectedMonthly, selectedMonthly, selectedMonthly, selectedMonthlyPeriod, monthlyWarnings, monthlyWarnings, monthlyDays,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [row] of __VLS_vFor((__VLS_ctx.monthlyMatrixRows))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (row.key),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "matrix-table__sticky font-weight-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            (row.equipo_codigo);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "matrix-table__sticky-2" },
            });
            /** @type {__VLS_StyleScopedClasses['matrix-table__sticky-2']} */ ;
            (row.equipo_nombre || "Sin nombre");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (row.horometro_ultimo ?? "N/D");
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (row.horometro_actual ?? "N/D");
            for (const [day] of __VLS_vFor((__VLS_ctx.monthlyDays))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                    key: (`${row.key}-${day.key}`),
                    ...{ class: "monthly-day-cell" },
                });
                /** @type {__VLS_StyleScopedClasses['monthly-day-cell']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "matrix-cell" },
                });
                /** @type {__VLS_StyleScopedClasses['matrix-cell']} */ ;
                if (__VLS_ctx.canEdit) {
                    for (const [item] of __VLS_vFor((row.cells[day.date] || []))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.canRead))
                                        return;
                                    if (!!(__VLS_ctx.loadingAll))
                                        return;
                                    if (!(__VLS_ctx.canEdit))
                                        return;
                                    __VLS_ctx.handleMonthlyItemClick(item);
                                    // @ts-ignore
                                    [canEdit, monthlyDays, monthlyMatrixRows, handleMonthlyItemClick,];
                                } },
                            key: (item.id),
                            type: "button",
                            ...{ class: "matrix-chip-button" },
                        });
                        /** @type {__VLS_StyleScopedClasses['matrix-chip-button']} */ ;
                        let __VLS_207;
                        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
                        vChip;
                        // @ts-ignore
                        const __VLS_208 = __VLS_asFunctionalComponent1(__VLS_207, new __VLS_207({
                            size: "x-small",
                            variant: "flat",
                            ...{ class: "mb-1" },
                            ...{ style: ({ backgroundColor: __VLS_ctx.monthlyCellColor(item), color: __VLS_ctx.monthlyCellTextColor(item) }) },
                        }));
                        const __VLS_209 = __VLS_208({
                            size: "x-small",
                            variant: "flat",
                            ...{ class: "mb-1" },
                            ...{ style: ({ backgroundColor: __VLS_ctx.monthlyCellColor(item), color: __VLS_ctx.monthlyCellTextColor(item) }) },
                        }, ...__VLS_functionalComponentArgsRest(__VLS_208));
                        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                        const { default: __VLS_212 } = __VLS_210.slots;
                        (item.valor_crudo);
                        // @ts-ignore
                        [monthlyCellColor, monthlyCellTextColor,];
                        var __VLS_210;
                        // @ts-ignore
                        [];
                    }
                }
                if (__VLS_ctx.canCreate) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.canRead))
                                    return;
                                if (!!(__VLS_ctx.loadingAll))
                                    return;
                                if (!(__VLS_ctx.canCreate))
                                    return;
                                __VLS_ctx.openMonthlyCellCreate(day.date, row);
                                // @ts-ignore
                                [canCreate, openMonthlyCellCreate,];
                            } },
                        type: "button",
                        ...{ class: "weekly-add-button weekly-add-button--mini" },
                    });
                    /** @type {__VLS_StyleScopedClasses['weekly-add-button']} */ ;
                    /** @type {__VLS_StyleScopedClasses['weekly-add-button--mini']} */ ;
                    let __VLS_213;
                    /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
                    vIcon;
                    // @ts-ignore
                    const __VLS_214 = __VLS_asFunctionalComponent1(__VLS_213, new __VLS_213({
                        icon: "mdi-plus",
                        size: "14",
                    }));
                    const __VLS_215 = __VLS_214({
                        icon: "mdi-plus",
                        size: "14",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_214));
                }
                // @ts-ignore
                [];
            }
            // @ts-ignore
            [];
        }
    }
    let __VLS_218;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_219 = __VLS_asFunctionalComponent1(__VLS_218, new __VLS_218({
        ...{ 'onClick:row': {} },
        ...{ class: "enterprise-table mt-5" },
        headers: (__VLS_ctx.monthlyDetailHeaders),
        items: (__VLS_ctx.monthlyFilteredDetails),
        loading: (__VLS_ctx.loadingAll),
        loadingText: "Obteniendo detalles del mensual...",
        itemsPerPage: (12),
    }));
    const __VLS_220 = __VLS_219({
        ...{ 'onClick:row': {} },
        ...{ class: "enterprise-table mt-5" },
        headers: (__VLS_ctx.monthlyDetailHeaders),
        items: (__VLS_ctx.monthlyFilteredDetails),
        loading: (__VLS_ctx.loadingAll),
        loadingText: "Obteniendo detalles del mensual...",
        itemsPerPage: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_219));
    let __VLS_223;
    const __VLS_224 = ({ 'click:row': {} },
        { 'onClick:row': (__VLS_ctx.onMonthlyRowClick) });
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
    const { default: __VLS_225 } = __VLS_221.slots;
    {
        const { 'item.equipo_codigo': __VLS_226 } = __VLS_221.slots;
        const [{ item }] = __VLS_vSlot(__VLS_226);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (item.equipo_codigo);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (item.equipo_nombre || "Sin nombre");
        // @ts-ignore
        [loadingAll, monthlyDetailHeaders, monthlyFilteredDetails, onMonthlyRowClick,];
    }
    {
        const { 'item.valor_crudo': __VLS_227 } = __VLS_221.slots;
        const [{ item }] = __VLS_vSlot(__VLS_227);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex flex-column" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
        let __VLS_228;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent1(__VLS_228, new __VLS_228({
            size: "small",
            variant: "flat",
            ...{ style: ({ backgroundColor: __VLS_ctx.monthlyCellColor(item), color: __VLS_ctx.monthlyCellTextColor(item) }) },
        }));
        const __VLS_230 = __VLS_229({
            size: "small",
            variant: "flat",
            ...{ style: ({ backgroundColor: __VLS_ctx.monthlyCellColor(item), color: __VLS_ctx.monthlyCellTextColor(item) }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        const { default: __VLS_233 } = __VLS_231.slots;
        (item.valor_crudo);
        // @ts-ignore
        [monthlyCellColor, monthlyCellTextColor,];
        var __VLS_231;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        if (__VLS_ctx.isMonthlyWeeklyAggregate(item)) {
            (item.payload_json?.total_horas_agendadas ?? "0.00");
        }
        else {
            (item.payload_json?.horometro_programado ?? "N/D");
        }
        // @ts-ignore
        [isMonthlyWeeklyAggregate,];
    }
    {
        const { 'item.programacion_id': __VLS_234 } = __VLS_221.slots;
        const [{ item }] = __VLS_vSlot(__VLS_234);
        let __VLS_235;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_236 = __VLS_asFunctionalComponent1(__VLS_235, new __VLS_235({
            size: "small",
            color: (__VLS_ctx.isMonthlyWeeklyAggregate(item) ? 'info' : item.programacion_id ? 'success' : 'secondary'),
            variant: "tonal",
        }));
        const __VLS_237 = __VLS_236({
            size: "small",
            color: (__VLS_ctx.isMonthlyWeeklyAggregate(item) ? 'info' : item.programacion_id ? 'success' : 'secondary'),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_236));
        const { default: __VLS_240 } = __VLS_238.slots;
        (__VLS_ctx.isMonthlyWeeklyAggregate(item)
            ? "Agendado semanal"
            : item.programacion_id
                ? "Sincronizado"
                : "Solo reporte");
        // @ts-ignore
        [isMonthlyWeeklyAggregate, isMonthlyWeeklyAggregate,];
        var __VLS_238;
        // @ts-ignore
        [];
    }
    {
        const { 'item.actions': __VLS_241 } = __VLS_221.slots;
        const [{ item }] = __VLS_vSlot(__VLS_241);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        if (__VLS_ctx.canEdit) {
            let __VLS_242;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_243 = __VLS_asFunctionalComponent1(__VLS_242, new __VLS_242({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
                color: "primary",
            }));
            const __VLS_244 = __VLS_243({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
                color: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_243));
            let __VLS_247;
            const __VLS_248 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.handleMonthlyItemClick(item);
                        // @ts-ignore
                        [canEdit, handleMonthlyItemClick,];
                    } });
            var __VLS_245;
            var __VLS_246;
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_221;
    var __VLS_222;
    // @ts-ignore
    [];
    var __VLS_64;
    // @ts-ignore
    [];
    var __VLS_58;
    let __VLS_249;
    /** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
    vWindowItem;
    // @ts-ignore
    const __VLS_250 = __VLS_asFunctionalComponent1(__VLS_249, new __VLS_249({
        value: "semanal",
    }));
    const __VLS_251 = __VLS_250({
        value: "semanal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_250));
    const { default: __VLS_254 } = __VLS_252.slots;
    let __VLS_255;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_256 = __VLS_asFunctionalComponent1(__VLS_255, new __VLS_255({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_257 = __VLS_256({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_256));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_260 } = __VLS_258.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between page-wrap mb-4" },
        ...{ style: {} },
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
        ...{ class: "programaciones-toolbar" },
    });
    /** @type {__VLS_StyleScopedClasses['programaciones-toolbar']} */ ;
    if (__VLS_ctx.canAccessProgrammingReports) {
        let __VLS_261;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_262 = __VLS_asFunctionalComponent1(__VLS_261, new __VLS_261({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('semanal', 'excel')),
        }));
        const __VLS_263 = __VLS_262({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('semanal', 'excel')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_262));
        let __VLS_266;
        const __VLS_267 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessProgrammingReports))
                        return;
                    __VLS_ctx.exportWeekly('excel');
                    // @ts-ignore
                    [canAccessProgrammingReports, isExporting, exportWeekly,];
                } });
        const { default: __VLS_268 } = __VLS_264.slots;
        // @ts-ignore
        [];
        var __VLS_264;
        var __VLS_265;
    }
    if (__VLS_ctx.canAccessProgrammingReports) {
        let __VLS_269;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_270 = __VLS_asFunctionalComponent1(__VLS_269, new __VLS_269({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('semanal', 'pdf')),
        }));
        const __VLS_271 = __VLS_270({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('semanal', 'pdf')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_270));
        let __VLS_274;
        const __VLS_275 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessProgrammingReports))
                        return;
                    __VLS_ctx.exportWeekly('pdf');
                    // @ts-ignore
                    [canAccessProgrammingReports, isExporting, exportWeekly,];
                } });
        const { default: __VLS_276 } = __VLS_272.slots;
        // @ts-ignore
        [];
        var __VLS_272;
        var __VLS_273;
    }
    if (__VLS_ctx.canCreate) {
        let __VLS_277;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_278 = __VLS_asFunctionalComponent1(__VLS_277, new __VLS_277({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-plus",
        }));
        const __VLS_279 = __VLS_278({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-plus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_278));
        let __VLS_282;
        const __VLS_283 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canCreate))
                        return;
                    __VLS_ctx.openWeeklyEditorCreate();
                    // @ts-ignore
                    [canCreate, openWeeklyEditorCreate,];
                } });
        const { default: __VLS_284 } = __VLS_280.slots;
        // @ts-ignore
        [];
        var __VLS_280;
        var __VLS_281;
    }
    if (__VLS_ctx.canEdit) {
        let __VLS_285;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_286 = __VLS_asFunctionalComponent1(__VLS_285, new __VLS_285({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-pencil",
            disabled: (!__VLS_ctx.selectedWeekly),
        }));
        const __VLS_287 = __VLS_286({
            ...{ 'onClick': {} },
            variant: "tonal",
            color: "secondary",
            prependIcon: "mdi-pencil",
            disabled: (!__VLS_ctx.selectedWeekly),
        }, ...__VLS_functionalComponentArgsRest(__VLS_286));
        let __VLS_290;
        const __VLS_291 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canEdit))
                        return;
                    __VLS_ctx.selectedWeekly && __VLS_ctx.openWeeklyEditorEdit(__VLS_ctx.selectedWeekly);
                    // @ts-ignore
                    [canEdit, selectedWeekly, selectedWeekly, selectedWeekly, openWeeklyEditorEdit,];
                } });
        const { default: __VLS_292 } = __VLS_288.slots;
        // @ts-ignore
        [];
        var __VLS_288;
        var __VLS_289;
    }
    if (__VLS_ctx.canCreate) {
        let __VLS_293;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_294 = __VLS_asFunctionalComponent1(__VLS_293, new __VLS_293({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.importingWeekly),
        }));
        const __VLS_295 = __VLS_294({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.importingWeekly),
        }, ...__VLS_functionalComponentArgsRest(__VLS_294));
        let __VLS_298;
        const __VLS_299 = ({ click: {} },
            { onClick: (__VLS_ctx.importWeeklyWorkbook) });
        const { default: __VLS_300 } = __VLS_296.slots;
        // @ts-ignore
        [canCreate, importingWeekly, importWeeklyWorkbook,];
        var __VLS_296;
        var __VLS_297;
    }
    let __VLS_301;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_302 = __VLS_asFunctionalComponent1(__VLS_301, new __VLS_301({
        dense: true,
    }));
    const __VLS_303 = __VLS_302({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_302));
    const { default: __VLS_306 } = __VLS_304.slots;
    let __VLS_307;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_308 = __VLS_asFunctionalComponent1(__VLS_307, new __VLS_307({
        cols: "12",
        md: "4",
    }));
    const __VLS_309 = __VLS_308({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_308));
    const { default: __VLS_312 } = __VLS_310.slots;
    let __VLS_313;
    /** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
    vFileInput;
    // @ts-ignore
    const __VLS_314 = __VLS_asFunctionalComponent1(__VLS_313, new __VLS_313({
        modelValue: (__VLS_ctx.weeklyImportFile),
        accept: ".xlsx,.xls",
        label: "Excel cronograma semanal",
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-calendar-week",
        showSize: true,
        hideDetails: "auto",
    }));
    const __VLS_315 = __VLS_314({
        modelValue: (__VLS_ctx.weeklyImportFile),
        accept: ".xlsx,.xls",
        label: "Excel cronograma semanal",
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-calendar-week",
        showSize: true,
        hideDetails: "auto",
    }, ...__VLS_functionalComponentArgsRest(__VLS_314));
    // @ts-ignore
    [weeklyImportFile,];
    var __VLS_310;
    let __VLS_318;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_319 = __VLS_asFunctionalComponent1(__VLS_318, new __VLS_318({
        cols: "12",
        md: "2",
    }));
    const __VLS_320 = __VLS_319({
        cols: "12",
        md: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_319));
    const { default: __VLS_323 } = __VLS_321.slots;
    let __VLS_324;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent1(__VLS_324, new __VLS_324({
        modelValue: (__VLS_ctx.selectedWeeklyYear),
        items: (__VLS_ctx.weeklyYearOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Año",
        variant: "outlined",
        density: "compact",
        clearable: true,
    }));
    const __VLS_326 = __VLS_325({
        modelValue: (__VLS_ctx.selectedWeeklyYear),
        items: (__VLS_ctx.weeklyYearOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Año",
        variant: "outlined",
        density: "compact",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    // @ts-ignore
    [selectedWeeklyYear, weeklyYearOptions,];
    var __VLS_321;
    let __VLS_329;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent1(__VLS_329, new __VLS_329({
        cols: "12",
        md: "2",
    }));
    const __VLS_331 = __VLS_330({
        cols: "12",
        md: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
    const { default: __VLS_334 } = __VLS_332.slots;
    let __VLS_335;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_336 = __VLS_asFunctionalComponent1(__VLS_335, new __VLS_335({
        modelValue: (__VLS_ctx.selectedWeeklyMonth),
        items: (__VLS_ctx.weeklyMonthOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Mes",
        variant: "outlined",
        density: "compact",
        clearable: true,
        disabled: (!__VLS_ctx.selectedWeeklyYear),
    }));
    const __VLS_337 = __VLS_336({
        modelValue: (__VLS_ctx.selectedWeeklyMonth),
        items: (__VLS_ctx.weeklyMonthOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Mes",
        variant: "outlined",
        density: "compact",
        clearable: true,
        disabled: (!__VLS_ctx.selectedWeeklyYear),
    }, ...__VLS_functionalComponentArgsRest(__VLS_336));
    // @ts-ignore
    [selectedWeeklyYear, selectedWeeklyMonth, weeklyMonthOptions,];
    var __VLS_332;
    let __VLS_340;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent1(__VLS_340, new __VLS_340({
        cols: "12",
        md: "4",
    }));
    const __VLS_342 = __VLS_341({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    const { default: __VLS_345 } = __VLS_343.slots;
    let __VLS_346;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_347 = __VLS_asFunctionalComponent1(__VLS_346, new __VLS_346({
        modelValue: (__VLS_ctx.selectedWeeklyPeriod),
        items: (__VLS_ctx.weeklyPeriodOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Semana",
        variant: "outlined",
        density: "compact",
        clearable: true,
        disabled: (!__VLS_ctx.selectedWeeklyMonth),
    }));
    const __VLS_348 = __VLS_347({
        modelValue: (__VLS_ctx.selectedWeeklyPeriod),
        items: (__VLS_ctx.weeklyPeriodOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Semana",
        variant: "outlined",
        density: "compact",
        clearable: true,
        disabled: (!__VLS_ctx.selectedWeeklyMonth),
    }, ...__VLS_functionalComponentArgsRest(__VLS_347));
    // @ts-ignore
    [selectedWeeklyMonth, selectedWeeklyPeriod, weeklyPeriodOptions,];
    var __VLS_343;
    let __VLS_351;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_352 = __VLS_asFunctionalComponent1(__VLS_351, new __VLS_351({
        cols: "12",
        md: "4",
    }));
    const __VLS_353 = __VLS_352({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_352));
    const { default: __VLS_356 } = __VLS_354.slots;
    let __VLS_357;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_358 = __VLS_asFunctionalComponent1(__VLS_357, new __VLS_357({
        modelValue: (__VLS_ctx.weeklyDisplayRange ? `${__VLS_ctx.weeklyDisplayRange.start} / ${__VLS_ctx.weeklyDisplayRange.end}` : ''),
        label: "Rango seleccionado",
        variant: "outlined",
        density: "compact",
        hideDetails: "auto",
        readonly: true,
    }));
    const __VLS_359 = __VLS_358({
        modelValue: (__VLS_ctx.weeklyDisplayRange ? `${__VLS_ctx.weeklyDisplayRange.start} / ${__VLS_ctx.weeklyDisplayRange.end}` : ''),
        label: "Rango seleccionado",
        variant: "outlined",
        density: "compact",
        hideDetails: "auto",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_358));
    // @ts-ignore
    [weeklyDisplayRange, weeklyDisplayRange, weeklyDisplayRange,];
    var __VLS_354;
    // @ts-ignore
    [];
    var __VLS_304;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-strip mt-3" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    let __VLS_362;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_363 = __VLS_asFunctionalComponent1(__VLS_362, new __VLS_362({
        color: "primary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_364 = __VLS_363({
        color: "primary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_363));
    const { default: __VLS_367 } = __VLS_365.slots;
    (__VLS_ctx.weeklySchedules.length);
    // @ts-ignore
    [weeklySchedules,];
    var __VLS_365;
    for (const [day] of __VLS_vFor((__VLS_ctx.weeklyDailyHours))) {
        let __VLS_368;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_369 = __VLS_asFunctionalComponent1(__VLS_368, new __VLS_368({
            key: (day.date),
            color: "secondary",
            variant: "tonal",
            label: true,
        }));
        const __VLS_370 = __VLS_369({
            key: (day.date),
            color: "secondary",
            variant: "tonal",
            label: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_369));
        const { default: __VLS_373 } = __VLS_371.slots;
        (day.label);
        (day.hours.toFixed(2));
        // @ts-ignore
        [weeklyDailyHours,];
        var __VLS_371;
        // @ts-ignore
        [];
    }
    if (__VLS_ctx.weeklyEquipmentHours.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "summary-strip mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.weeklyEquipmentHours))) {
            let __VLS_374;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_375 = __VLS_asFunctionalComponent1(__VLS_374, new __VLS_374({
                key: (`${item.fecha_actividad}-${item.equipo_codigo}`),
                color: "info",
                variant: "tonal",
                label: true,
            }));
            const __VLS_376 = __VLS_375({
                key: (`${item.fecha_actividad}-${item.equipo_codigo}`),
                color: "info",
                variant: "tonal",
                label: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_375));
            const { default: __VLS_379 } = __VLS_377.slots;
            (item.fecha_actividad);
            (item.equipo_codigo);
            (item.total_horas.toFixed(2));
            // @ts-ignore
            [weeklyEquipmentHours, weeklyEquipmentHours,];
            var __VLS_377;
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.weeklyWarnings.length) {
        let __VLS_380;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_381 = __VLS_asFunctionalComponent1(__VLS_380, new __VLS_380({
            ...{ class: "mt-4" },
            type: "warning",
            variant: "tonal",
            text: (__VLS_ctx.weeklyWarnings.join(' · ')),
        }));
        const __VLS_382 = __VLS_381({
            ...{ class: "mt-4" },
            type: "warning",
            variant: "tonal",
            text: (__VLS_ctx.weeklyWarnings.join(' · ')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_381));
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    if (__VLS_ctx.selectedWeekly) {
        (__VLS_ctx.selectedWeekly.codigo);
        (__VLS_ctx.selectedWeekly.fecha_inicio);
        (__VLS_ctx.selectedWeekly.fecha_fin);
    }
    else if (__VLS_ctx.weeklyDisplayRange) {
        (__VLS_ctx.weeklyDisplayRange.start);
        (__VLS_ctx.weeklyDisplayRange.end);
    }
    if (__VLS_ctx.loadingAll) {
        const __VLS_385 = LoadingTableState;
        // @ts-ignore
        const __VLS_386 = __VLS_asFunctionalComponent1(__VLS_385, new __VLS_385({
            message: "Cargando cronograma semanal...",
            rows: (5),
            columns: (4),
            ...{ class: "mt-4" },
        }));
        const __VLS_387 = __VLS_386({
            message: "Cargando cronograma semanal...",
            rows: (5),
            columns: (4),
            ...{ class: "mt-4" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_386));
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "matrix-wrap mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
            ...{ class: "matrix-table" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
            ...{ class: "matrix-table__sticky" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
        for (const [day] of __VLS_vFor((__VLS_ctx.weeklyDays))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
                key: (day.date),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            (day.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (day.date);
            // @ts-ignore
            [loadingAll, selectedWeekly, selectedWeekly, selectedWeekly, selectedWeekly, weeklyDisplayRange, weeklyDisplayRange, weeklyDisplayRange, weeklyWarnings, weeklyWarnings, weeklyDays,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [slot] of __VLS_vFor((__VLS_ctx.weeklyTimeSlots))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (slot.key),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                ...{ class: "matrix-table__sticky font-weight-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            (slot.label);
            for (const [day] of __VLS_vFor((__VLS_ctx.weeklyDays))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                    key: (`${slot.key}-${day.date}`),
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "matrix-cell matrix-cell--weekly" },
                });
                /** @type {__VLS_StyleScopedClasses['matrix-cell']} */ ;
                /** @type {__VLS_StyleScopedClasses['matrix-cell--weekly']} */ ;
                for (const [item] of __VLS_vFor((__VLS_ctx.getWeeklyItems(slot.key, day.date)))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.canRead))
                                    return;
                                if (!!(__VLS_ctx.loadingAll))
                                    return;
                                __VLS_ctx.openSelectedWeeklyCell(slot.key, day.date, item);
                                // @ts-ignore
                                [weeklyDays, weeklyTimeSlots, getWeeklyItems, openSelectedWeeklyCell,];
                            } },
                        key: (item.id),
                        type: "button",
                        ...{ class: "weekly-activity weekly-activity--button" },
                    });
                    /** @type {__VLS_StyleScopedClasses['weekly-activity']} */ ;
                    /** @type {__VLS_StyleScopedClasses['weekly-activity--button']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "weekly-activity__title" },
                    });
                    /** @type {__VLS_StyleScopedClasses['weekly-activity__title']} */ ;
                    (item.actividad);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-caption text-medium-emphasis" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
                    (item.tipo_proceso || "OPERACION");
                    if (item.equipo_codigo) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                        (item.equipo_codigo);
                    }
                    // @ts-ignore
                    [];
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.canRead))
                                return;
                            if (!!(__VLS_ctx.loadingAll))
                                return;
                            __VLS_ctx.openSelectedWeeklyCell(slot.key, day.date);
                            // @ts-ignore
                            [openSelectedWeeklyCell,];
                        } },
                    type: "button",
                    ...{ class: "weekly-add-button" },
                });
                /** @type {__VLS_StyleScopedClasses['weekly-add-button']} */ ;
                let __VLS_390;
                /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
                vIcon;
                // @ts-ignore
                const __VLS_391 = __VLS_asFunctionalComponent1(__VLS_390, new __VLS_390({
                    icon: "mdi-plus",
                    size: "16",
                }));
                const __VLS_392 = __VLS_391({
                    icon: "mdi-plus",
                    size: "16",
                }, ...__VLS_functionalComponentArgsRest(__VLS_391));
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                // @ts-ignore
                [];
            }
            // @ts-ignore
            [];
        }
    }
    let __VLS_395;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_396 = __VLS_asFunctionalComponent1(__VLS_395, new __VLS_395({
        ...{ class: "enterprise-table mt-5" },
        headers: (__VLS_ctx.weeklyDetailHeaders),
        items: (__VLS_ctx.selectedWeekly?.detalles || []),
        loading: (__VLS_ctx.loadingAll),
        loadingText: "Obteniendo detalles del cronograma...",
        itemsPerPage: (12),
    }));
    const __VLS_397 = __VLS_396({
        ...{ class: "enterprise-table mt-5" },
        headers: (__VLS_ctx.weeklyDetailHeaders),
        items: (__VLS_ctx.selectedWeekly?.detalles || []),
        loading: (__VLS_ctx.loadingAll),
        loadingText: "Obteniendo detalles del cronograma...",
        itemsPerPage: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_396));
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
    // @ts-ignore
    [loadingAll, selectedWeekly, weeklyDetailHeaders,];
    var __VLS_258;
    // @ts-ignore
    [];
    var __VLS_252;
    let __VLS_400;
    /** @ts-ignore @type {typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem | typeof __VLS_components.vWindowItem | typeof __VLS_components.VWindowItem} */
    vWindowItem;
    // @ts-ignore
    const __VLS_401 = __VLS_asFunctionalComponent1(__VLS_400, new __VLS_400({
        value: "agenda",
    }));
    const __VLS_402 = __VLS_401({
        value: "agenda",
    }, ...__VLS_functionalComponentArgsRest(__VLS_401));
    const { default: __VLS_405 } = __VLS_403.slots;
    let __VLS_406;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_407 = __VLS_asFunctionalComponent1(__VLS_406, new __VLS_406({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_408 = __VLS_407({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_407));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_411 } = __VLS_409.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center justify-space-between mb-3" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center flex-wrap agenda-toolbar" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['agenda-toolbar']} */ ;
    if (__VLS_ctx.canAccessProgrammingReports) {
        let __VLS_412;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_413 = __VLS_asFunctionalComponent1(__VLS_412, new __VLS_412({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('agenda', 'excel')),
        }));
        const __VLS_414 = __VLS_413({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-excel",
            loading: (__VLS_ctx.isExporting('agenda', 'excel')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_413));
        let __VLS_417;
        const __VLS_418 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessProgrammingReports))
                        return;
                    __VLS_ctx.exportAgenda('excel');
                    // @ts-ignore
                    [canAccessProgrammingReports, isExporting, exportAgenda,];
                } });
        const { default: __VLS_419 } = __VLS_415.slots;
        // @ts-ignore
        [];
        var __VLS_415;
        var __VLS_416;
    }
    if (__VLS_ctx.canAccessProgrammingReports) {
        let __VLS_420;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_421 = __VLS_asFunctionalComponent1(__VLS_420, new __VLS_420({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('agenda', 'pdf')),
        }));
        const __VLS_422 = __VLS_421({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-file-pdf-box",
            loading: (__VLS_ctx.isExporting('agenda', 'pdf')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_421));
        let __VLS_425;
        const __VLS_426 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canAccessProgrammingReports))
                        return;
                    __VLS_ctx.exportAgenda('pdf');
                    // @ts-ignore
                    [canAccessProgrammingReports, isExporting, exportAgenda,];
                } });
        const { default: __VLS_427 } = __VLS_423.slots;
        // @ts-ignore
        [];
        var __VLS_423;
        var __VLS_424;
    }
    let __VLS_428;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_429 = __VLS_asFunctionalComponent1(__VLS_428, new __VLS_428({
        ...{ 'onClick': {} },
        icon: "mdi-chevron-left",
        variant: "text",
    }));
    const __VLS_430 = __VLS_429({
        ...{ 'onClick': {} },
        icon: "mdi-chevron-left",
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_429));
    let __VLS_433;
    const __VLS_434 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                __VLS_ctx.changeMonth(-1);
                // @ts-ignore
                [changeMonth,];
            } });
    var __VLS_431;
    var __VLS_432;
    let __VLS_435;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_436 = __VLS_asFunctionalComponent1(__VLS_435, new __VLS_435({
        modelValue: (__VLS_ctx.agendaYear),
        items: (__VLS_ctx.agendaYearOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Año",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        ...{ class: "agenda-toolbar__select" },
    }));
    const __VLS_437 = __VLS_436({
        modelValue: (__VLS_ctx.agendaYear),
        items: (__VLS_ctx.agendaYearOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Año",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        ...{ class: "agenda-toolbar__select" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_436));
    /** @type {__VLS_StyleScopedClasses['agenda-toolbar__select']} */ ;
    let __VLS_440;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_441 = __VLS_asFunctionalComponent1(__VLS_440, new __VLS_440({
        modelValue: (__VLS_ctx.agendaMonth),
        items: (__VLS_ctx.agendaMonthOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Mes",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        ...{ class: "agenda-toolbar__select agenda-toolbar__select--month" },
    }));
    const __VLS_442 = __VLS_441({
        modelValue: (__VLS_ctx.agendaMonth),
        items: (__VLS_ctx.agendaMonthOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Mes",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
        ...{ class: "agenda-toolbar__select agenda-toolbar__select--month" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_441));
    /** @type {__VLS_StyleScopedClasses['agenda-toolbar__select']} */ ;
    /** @type {__VLS_StyleScopedClasses['agenda-toolbar__select--month']} */ ;
    let __VLS_445;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_446 = __VLS_asFunctionalComponent1(__VLS_445, new __VLS_445({
        ...{ 'onClick': {} },
        variant: "tonal",
        size: "small",
    }));
    const __VLS_447 = __VLS_446({
        ...{ 'onClick': {} },
        variant: "tonal",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_446));
    let __VLS_450;
    const __VLS_451 = ({ click: {} },
        { onClick: (__VLS_ctx.goToToday) });
    const { default: __VLS_452 } = __VLS_448.slots;
    // @ts-ignore
    [agendaYear, agendaYearOptions, agendaMonth, agendaMonthOptions, goToToday,];
    var __VLS_448;
    var __VLS_449;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.monthLabel);
    let __VLS_453;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_454 = __VLS_asFunctionalComponent1(__VLS_453, new __VLS_453({
        ...{ 'onClick': {} },
        icon: "mdi-chevron-right",
        variant: "text",
    }));
    const __VLS_455 = __VLS_454({
        ...{ 'onClick': {} },
        icon: "mdi-chevron-right",
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_454));
    let __VLS_458;
    const __VLS_459 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                __VLS_ctx.changeMonth(1);
                // @ts-ignore
                [changeMonth, monthLabel,];
            } });
    var __VLS_456;
    var __VLS_457;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-strip mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-strip']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    let __VLS_460;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_461 = __VLS_asFunctionalComponent1(__VLS_460, new __VLS_460({
        color: "primary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_462 = __VLS_461({
        color: "primary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_461));
    const { default: __VLS_465 } = __VLS_463.slots;
    (__VLS_ctx.agendaMonthSummary.weeklyActivities);
    // @ts-ignore
    [agendaMonthSummary,];
    var __VLS_463;
    let __VLS_466;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_467 = __VLS_asFunctionalComponent1(__VLS_466, new __VLS_466({
        color: "secondary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_468 = __VLS_467({
        color: "secondary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_467));
    const { default: __VLS_471 } = __VLS_469.slots;
    (__VLS_ctx.agendaMonthSummary.monthlyHoursLabel);
    // @ts-ignore
    [agendaMonthSummary,];
    var __VLS_469;
    let __VLS_472;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_473 = __VLS_asFunctionalComponent1(__VLS_472, new __VLS_472({
        color: "info",
        variant: "tonal",
        label: true,
    }));
    const __VLS_474 = __VLS_473({
        color: "info",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_473));
    const { default: __VLS_477 } = __VLS_475.slots;
    (__VLS_ctx.agendaMonthSummary.programaciones);
    // @ts-ignore
    [agendaMonthSummary,];
    var __VLS_475;
    if (__VLS_ctx.agendaLoading) {
        const __VLS_478 = LoadingTableState;
        // @ts-ignore
        const __VLS_479 = __VLS_asFunctionalComponent1(__VLS_478, new __VLS_478({
            message: "Cargando agenda de programaciones...",
            rows: (5),
            columns: (7),
            ...{ class: "mb-4" },
        }));
        const __VLS_480 = __VLS_479({
            message: "Cargando agenda de programaciones...",
            rows: (5),
            columns: (7),
            ...{ class: "mb-4" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_479));
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-grid mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        for (const [day] of __VLS_vFor((__VLS_ctx.weekDays))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (day),
                ...{ class: "calendar-weekday" },
            });
            /** @type {__VLS_StyleScopedClasses['calendar-weekday']} */ ;
            (day);
            // @ts-ignore
            [agendaLoading, weekDays,];
        }
        for (const [cell] of __VLS_vFor((__VLS_ctx.monthCells))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!!(__VLS_ctx.agendaLoading))
                            return;
                        __VLS_ctx.openAgendaDay(cell.date);
                        // @ts-ignore
                        [monthCells, openAgendaDay,];
                    } },
                key: (cell.key),
                ...{ class: "calendar-cell" },
                ...{ class: ({ 'calendar-cell--muted': !cell.inCurrentMonth, 'calendar-cell--today': cell.isToday }) },
            });
            /** @type {__VLS_StyleScopedClasses['calendar-cell']} */ ;
            /** @type {__VLS_StyleScopedClasses['calendar-cell--muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['calendar-cell--today']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "d-flex align-center justify-space-between mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-caption font-weight-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            (cell.day);
            if (__VLS_ctx.agendaCellItems[cell.date]?.length) {
                let __VLS_483;
                /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
                vChip;
                // @ts-ignore
                const __VLS_484 = __VLS_asFunctionalComponent1(__VLS_483, new __VLS_483({
                    size: "x-small",
                    color: "primary",
                    variant: "tonal",
                }));
                const __VLS_485 = __VLS_484({
                    size: "x-small",
                    color: "primary",
                    variant: "tonal",
                }, ...__VLS_functionalComponentArgsRest(__VLS_484));
                const { default: __VLS_488 } = __VLS_486.slots;
                (__VLS_ctx.agendaCellItems[cell.date]?.length ?? 0);
                // @ts-ignore
                [agendaCellItems, agendaCellItems,];
                var __VLS_486;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "calendar-events" },
            });
            /** @type {__VLS_StyleScopedClasses['calendar-events']} */ ;
            for (const [event] of __VLS_vFor(((__VLS_ctx.agendaCellItems[cell.date] || []).slice(0, 3)))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.canRead))
                                return;
                            if (!!(__VLS_ctx.agendaLoading))
                                return;
                            __VLS_ctx.handleAgendaItemClick(event);
                            // @ts-ignore
                            [agendaCellItems, handleAgendaItemClick,];
                        } },
                    key: (event.key),
                    ...{ class: "calendar-event" },
                    ...{ class: (__VLS_ctx.agendaCalendarEventClass(event)) },
                });
                /** @type {__VLS_StyleScopedClasses['calendar-event']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "calendar-event__title" },
                });
                /** @type {__VLS_StyleScopedClasses['calendar-event__title']} */ ;
                (event.title);
                if (event.subtitle) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "calendar-event__subtitle" },
                    });
                    /** @type {__VLS_StyleScopedClasses['calendar-event__subtitle']} */ ;
                    (event.subtitle);
                }
                // @ts-ignore
                [agendaCalendarEventClass,];
            }
            if ((__VLS_ctx.agendaCellItems[cell.date] || []).length > 3) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-medium-emphasis mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                ((__VLS_ctx.eventsByDate[cell.date]?.length ?? 0) - 3);
            }
            // @ts-ignore
            [agendaCellItems, eventsByDate,];
        }
    }
    let __VLS_489;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_490 = __VLS_asFunctionalComponent1(__VLS_489, new __VLS_489({
        ...{ class: "mb-3" },
    }));
    const __VLS_491 = __VLS_490({
        ...{ class: "mb-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_490));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_494;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_495 = __VLS_asFunctionalComponent1(__VLS_494, new __VLS_494({
        headers: (__VLS_ctx.agendaHeaders),
        items: (__VLS_ctx.agendaRows),
        loading: (__VLS_ctx.agendaLoading),
        loadingText: "Obteniendo agenda programada...",
        itemsPerPage: (10),
        ...{ class: "elevation-0 enterprise-table" },
    }));
    const __VLS_496 = __VLS_495({
        headers: (__VLS_ctx.agendaHeaders),
        items: (__VLS_ctx.agendaRows),
        loading: (__VLS_ctx.agendaLoading),
        loadingText: "Obteniendo agenda programada...",
        itemsPerPage: (10),
        ...{ class: "elevation-0 enterprise-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_495));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    const { default: __VLS_499 } = __VLS_497.slots;
    {
        const { 'item.procedimiento_nombre': __VLS_500 } = __VLS_497.slots;
        const [{ item }] = __VLS_vSlot(__VLS_500);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.displayProgramacionName(item));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (item.plan_codigo || item.plan_nombre || "Plan interno");
        // @ts-ignore
        [agendaLoading, agendaHeaders, agendaRows, displayProgramacionName,];
    }
    {
        const { 'item.estado_programacion': __VLS_501 } = __VLS_497.slots;
        const [{ item }] = __VLS_vSlot(__VLS_501);
        let __VLS_502;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_503 = __VLS_asFunctionalComponent1(__VLS_502, new __VLS_502({
            size: "small",
            color: (__VLS_ctx.chipColor(item.estado_programacion)),
            variant: "tonal",
        }));
        const __VLS_504 = __VLS_503({
            size: "small",
            color: (__VLS_ctx.chipColor(item.estado_programacion)),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_503));
        const { default: __VLS_507 } = __VLS_505.slots;
        (item.estado_programacion);
        // @ts-ignore
        [chipColor,];
        var __VLS_505;
        // @ts-ignore
        [];
    }
    {
        const { 'item.actions': __VLS_508 } = __VLS_497.slots;
        const [{ item }] = __VLS_vSlot(__VLS_508);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        if (__VLS_ctx.canEdit) {
            let __VLS_509;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_510 = __VLS_asFunctionalComponent1(__VLS_509, new __VLS_509({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }));
            const __VLS_511 = __VLS_510({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }, ...__VLS_functionalComponentArgsRest(__VLS_510));
            let __VLS_514;
            const __VLS_515 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.openEdit(item);
                        // @ts-ignore
                        [canEdit, openEdit,];
                    } });
            var __VLS_512;
            var __VLS_513;
        }
        if (__VLS_ctx.canDelete) {
            let __VLS_516;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_517 = __VLS_asFunctionalComponent1(__VLS_516, new __VLS_516({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_518 = __VLS_517({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_517));
            let __VLS_521;
            const __VLS_522 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canDelete))
                            return;
                        __VLS_ctx.openDeleteProgramacion(item);
                        // @ts-ignore
                        [canDelete, openDeleteProgramacion,];
                    } });
            var __VLS_519;
            var __VLS_520;
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_497;
    // @ts-ignore
    [];
    var __VLS_409;
    // @ts-ignore
    [];
    var __VLS_403;
    // @ts-ignore
    [];
    var __VLS_52;
    let __VLS_523;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_524 = __VLS_asFunctionalComponent1(__VLS_523, new __VLS_523({
        modelValue: (__VLS_ctx.dialog),
        fullscreen: (__VLS_ctx.isDialogFullscreen),
        maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 760),
    }));
    const __VLS_525 = __VLS_524({
        modelValue: (__VLS_ctx.dialog),
        fullscreen: (__VLS_ctx.isDialogFullscreen),
        maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 760),
    }, ...__VLS_functionalComponentArgsRest(__VLS_524));
    const { default: __VLS_528 } = __VLS_526.slots;
    let __VLS_529;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_530 = __VLS_asFunctionalComponent1(__VLS_529, new __VLS_529({
        rounded: "xl",
    }));
    const __VLS_531 = __VLS_530({
        rounded: "xl",
    }, ...__VLS_functionalComponentArgsRest(__VLS_530));
    const { default: __VLS_534 } = __VLS_532.slots;
    let __VLS_535;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_536 = __VLS_asFunctionalComponent1(__VLS_535, new __VLS_535({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }));
    const __VLS_537 = __VLS_536({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_536));
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    const { default: __VLS_540 } = __VLS_538.slots;
    (__VLS_ctx.editingId ? "Editar programaci?n" : "Nueva programaci?n");
    // @ts-ignore
    [dialog, isDialogFullscreen, isDialogFullscreen, editingId,];
    var __VLS_538;
    let __VLS_541;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_542 = __VLS_asFunctionalComponent1(__VLS_541, new __VLS_541({}));
    const __VLS_543 = __VLS_542({}, ...__VLS_functionalComponentArgsRest(__VLS_542));
    let __VLS_546;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_547 = __VLS_asFunctionalComponent1(__VLS_546, new __VLS_546({
        ...{ class: "pt-4" },
    }));
    const __VLS_548 = __VLS_547({
        ...{ class: "pt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_547));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    const { default: __VLS_551 } = __VLS_549.slots;
    let __VLS_552;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_553 = __VLS_asFunctionalComponent1(__VLS_552, new __VLS_552({
        dense: true,
    }));
    const __VLS_554 = __VLS_553({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_553));
    const { default: __VLS_557 } = __VLS_555.slots;
    let __VLS_558;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_559 = __VLS_asFunctionalComponent1(__VLS_558, new __VLS_558({
        cols: "12",
        md: "6",
    }));
    const __VLS_560 = __VLS_559({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_559));
    const { default: __VLS_563 } = __VLS_561.slots;
    let __VLS_564;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_565 = __VLS_asFunctionalComponent1(__VLS_564, new __VLS_564({
        modelValue: (__VLS_ctx.form.proxima_fecha),
        type: "date",
        label: "Fecha programada",
        variant: "outlined",
    }));
    const __VLS_566 = __VLS_565({
        modelValue: (__VLS_ctx.form.proxima_fecha),
        type: "date",
        label: "Fecha programada",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_565));
    // @ts-ignore
    [form,];
    var __VLS_561;
    let __VLS_569;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_570 = __VLS_asFunctionalComponent1(__VLS_569, new __VLS_569({
        cols: "12",
        md: "6",
    }));
    const __VLS_571 = __VLS_570({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_570));
    const { default: __VLS_574 } = __VLS_572.slots;
    let __VLS_575;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_576 = __VLS_asFunctionalComponent1(__VLS_575, new __VLS_575({
        modelValue: (__VLS_ctx.form.activo),
        label: "Activo",
        hideDetails: true,
    }));
    const __VLS_577 = __VLS_576({
        modelValue: (__VLS_ctx.form.activo),
        label: "Activo",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_576));
    // @ts-ignore
    [form,];
    var __VLS_572;
    let __VLS_580;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_581 = __VLS_asFunctionalComponent1(__VLS_580, new __VLS_580({
        cols: "12",
        md: "6",
    }));
    const __VLS_582 = __VLS_581({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_581));
    const { default: __VLS_585 } = __VLS_583.slots;
    let __VLS_586;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_587 = __VLS_asFunctionalComponent1(__VLS_586, new __VLS_586({
        modelValue: (__VLS_ctx.form.equipo_id),
        items: (__VLS_ctx.equipmentOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Equipo",
        variant: "outlined",
    }));
    const __VLS_588 = __VLS_587({
        modelValue: (__VLS_ctx.form.equipo_id),
        items: (__VLS_ctx.equipmentOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Equipo",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_587));
    // @ts-ignore
    [form, equipmentOptions,];
    var __VLS_583;
    let __VLS_591;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_592 = __VLS_asFunctionalComponent1(__VLS_591, new __VLS_591({
        cols: "12",
        md: "6",
    }));
    const __VLS_593 = __VLS_592({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_592));
    const { default: __VLS_596 } = __VLS_594.slots;
    let __VLS_597;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_598 = __VLS_asFunctionalComponent1(__VLS_597, new __VLS_597({
        modelValue: (__VLS_ctx.form.procedimiento_id),
        items: (__VLS_ctx.procedureOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Plantilla MPG",
        variant: "outlined",
    }));
    const __VLS_599 = __VLS_598({
        modelValue: (__VLS_ctx.form.procedimiento_id),
        items: (__VLS_ctx.procedureOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Plantilla MPG",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_598));
    // @ts-ignore
    [form, procedureOptions,];
    var __VLS_594;
    let __VLS_602;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_603 = __VLS_asFunctionalComponent1(__VLS_602, new __VLS_602({
        cols: "12",
    }));
    const __VLS_604 = __VLS_603({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_603));
    const { default: __VLS_607 } = __VLS_605.slots;
    let __VLS_608;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_609 = __VLS_asFunctionalComponent1(__VLS_608, new __VLS_608({
        type: "info",
        variant: "tonal",
        text: "El sistema sincroniza autom?ticamente un plan interno desde la plantilla MPG seleccionada.",
    }));
    const __VLS_610 = __VLS_609({
        type: "info",
        variant: "tonal",
        text: "El sistema sincroniza autom?ticamente un plan interno desde la plantilla MPG seleccionada.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_609));
    // @ts-ignore
    [];
    var __VLS_605;
    let __VLS_613;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_614 = __VLS_asFunctionalComponent1(__VLS_613, new __VLS_613({
        cols: "12",
        md: "6",
    }));
    const __VLS_615 = __VLS_614({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_614));
    const { default: __VLS_618 } = __VLS_616.slots;
    let __VLS_619;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_620 = __VLS_asFunctionalComponent1(__VLS_619, new __VLS_619({
        modelValue: (__VLS_ctx.resolvedPlanLabel),
        label: "Plan operativo generado",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_621 = __VLS_620({
        modelValue: (__VLS_ctx.resolvedPlanLabel),
        label: "Plan operativo generado",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_620));
    // @ts-ignore
    [resolvedPlanLabel,];
    var __VLS_616;
    let __VLS_624;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_625 = __VLS_asFunctionalComponent1(__VLS_624, new __VLS_624({
        cols: "12",
        md: "6",
    }));
    const __VLS_626 = __VLS_625({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_625));
    const { default: __VLS_629 } = __VLS_627.slots;
    let __VLS_630;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_631 = __VLS_asFunctionalComponent1(__VLS_630, new __VLS_630({
        modelValue: (__VLS_ctx.selectedProcedureFrequency),
        label: "Frecuencia de plantilla",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_632 = __VLS_631({
        modelValue: (__VLS_ctx.selectedProcedureFrequency),
        label: "Frecuencia de plantilla",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_631));
    // @ts-ignore
    [selectedProcedureFrequency,];
    var __VLS_627;
    let __VLS_635;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_636 = __VLS_asFunctionalComponent1(__VLS_635, new __VLS_635({
        cols: "12",
        md: "6",
    }));
    const __VLS_637 = __VLS_636({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_636));
    const { default: __VLS_640 } = __VLS_638.slots;
    let __VLS_641;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_642 = __VLS_asFunctionalComponent1(__VLS_641, new __VLS_641({
        modelValue: (__VLS_ctx.form.ultima_ejecucion_fecha),
        type: "date",
        label: "?ltima ejecuci?n fecha",
        variant: "outlined",
    }));
    const __VLS_643 = __VLS_642({
        modelValue: (__VLS_ctx.form.ultima_ejecucion_fecha),
        type: "date",
        label: "?ltima ejecuci?n fecha",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_642));
    // @ts-ignore
    [form,];
    var __VLS_638;
    let __VLS_646;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_647 = __VLS_asFunctionalComponent1(__VLS_646, new __VLS_646({
        cols: "12",
        md: "6",
    }));
    const __VLS_648 = __VLS_647({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_647));
    const { default: __VLS_651 } = __VLS_649.slots;
    let __VLS_652;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_653 = __VLS_asFunctionalComponent1(__VLS_652, new __VLS_652({
        modelValue: (__VLS_ctx.form.ultima_ejecucion_horas),
        type: "number",
        step: "0.01",
        label: "?ltima ejecuci?n horas",
        variant: "outlined",
    }));
    const __VLS_654 = __VLS_653({
        modelValue: (__VLS_ctx.form.ultima_ejecucion_horas),
        type: "number",
        step: "0.01",
        label: "?ltima ejecuci?n horas",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_653));
    // @ts-ignore
    [form,];
    var __VLS_649;
    let __VLS_657;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_658 = __VLS_asFunctionalComponent1(__VLS_657, new __VLS_657({
        cols: "12",
        md: "6",
    }));
    const __VLS_659 = __VLS_658({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_658));
    const { default: __VLS_662 } = __VLS_660.slots;
    let __VLS_663;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_664 = __VLS_asFunctionalComponent1(__VLS_663, new __VLS_663({
        modelValue: (__VLS_ctx.form.proxima_horas),
        type: "number",
        step: "0.01",
        label: "Hora objetivo",
        variant: "outlined",
    }));
    const __VLS_665 = __VLS_664({
        modelValue: (__VLS_ctx.form.proxima_horas),
        type: "number",
        step: "0.01",
        label: "Hora objetivo",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_664));
    // @ts-ignore
    [form,];
    var __VLS_660;
    let __VLS_668;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_669 = __VLS_asFunctionalComponent1(__VLS_668, new __VLS_668({
        cols: "12",
        md: "6",
    }));
    const __VLS_670 = __VLS_669({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_669));
    const { default: __VLS_673 } = __VLS_671.slots;
    let __VLS_674;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_675 = __VLS_asFunctionalComponent1(__VLS_674, new __VLS_674({
        modelValue: (__VLS_ctx.programacionSourceMode),
        label: "Modo de programaci?n",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_676 = __VLS_675({
        modelValue: (__VLS_ctx.programacionSourceMode),
        label: "Modo de programaci?n",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_675));
    // @ts-ignore
    [programacionSourceMode,];
    var __VLS_671;
    // @ts-ignore
    [];
    var __VLS_555;
    // @ts-ignore
    [];
    var __VLS_549;
    let __VLS_679;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_680 = __VLS_asFunctionalComponent1(__VLS_679, new __VLS_679({}));
    const __VLS_681 = __VLS_680({}, ...__VLS_functionalComponentArgsRest(__VLS_680));
    let __VLS_684;
    /** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
    vCardActions;
    // @ts-ignore
    const __VLS_685 = __VLS_asFunctionalComponent1(__VLS_684, new __VLS_684({
        ...{ class: "pa-4" },
    }));
    const __VLS_686 = __VLS_685({
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_685));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_689 } = __VLS_687.slots;
    let __VLS_690;
    /** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
    vSpacer;
    // @ts-ignore
    const __VLS_691 = __VLS_asFunctionalComponent1(__VLS_690, new __VLS_690({}));
    const __VLS_692 = __VLS_691({}, ...__VLS_functionalComponentArgsRest(__VLS_691));
    let __VLS_695;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_696 = __VLS_asFunctionalComponent1(__VLS_695, new __VLS_695({
        ...{ 'onClick': {} },
        variant: "text",
    }));
    const __VLS_697 = __VLS_696({
        ...{ 'onClick': {} },
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_696));
    let __VLS_700;
    const __VLS_701 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                __VLS_ctx.dialog = false;
                // @ts-ignore
                [dialog,];
            } });
    const { default: __VLS_702 } = __VLS_698.slots;
    // @ts-ignore
    [];
    var __VLS_698;
    var __VLS_699;
    if (__VLS_ctx.canPersistProgramacion) {
        let __VLS_703;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_704 = __VLS_asFunctionalComponent1(__VLS_703, new __VLS_703({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.saving),
        }));
        const __VLS_705 = __VLS_704({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.saving),
        }, ...__VLS_functionalComponentArgsRest(__VLS_704));
        let __VLS_708;
        const __VLS_709 = ({ click: {} },
            { onClick: (__VLS_ctx.save) });
        const { default: __VLS_710 } = __VLS_706.slots;
        // @ts-ignore
        [canPersistProgramacion, saving, save,];
        var __VLS_706;
        var __VLS_707;
    }
    // @ts-ignore
    [];
    var __VLS_687;
    // @ts-ignore
    [];
    var __VLS_532;
    // @ts-ignore
    [];
    var __VLS_526;
    let __VLS_711;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_712 = __VLS_asFunctionalComponent1(__VLS_711, new __VLS_711({
        modelValue: (__VLS_ctx.monthlyCellDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 720),
    }));
    const __VLS_713 = __VLS_712({
        modelValue: (__VLS_ctx.monthlyCellDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 720),
    }, ...__VLS_functionalComponentArgsRest(__VLS_712));
    const { default: __VLS_716 } = __VLS_714.slots;
    let __VLS_717;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_718 = __VLS_asFunctionalComponent1(__VLS_717, new __VLS_717({
        rounded: "xl",
    }));
    const __VLS_719 = __VLS_718({
        rounded: "xl",
    }, ...__VLS_functionalComponentArgsRest(__VLS_718));
    const { default: __VLS_722 } = __VLS_720.slots;
    let __VLS_723;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_724 = __VLS_asFunctionalComponent1(__VLS_723, new __VLS_723({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }));
    const __VLS_725 = __VLS_724({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_724));
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    const { default: __VLS_728 } = __VLS_726.slots;
    (__VLS_ctx.monthlyCell.id ? "Editar bloque mensual" : "Nuevo bloque mensual");
    // @ts-ignore
    [monthlyCellDialog, isWeeklyCellFullscreen, isWeeklyCellFullscreen, monthlyCell,];
    var __VLS_726;
    let __VLS_729;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_730 = __VLS_asFunctionalComponent1(__VLS_729, new __VLS_729({}));
    const __VLS_731 = __VLS_730({}, ...__VLS_functionalComponentArgsRest(__VLS_730));
    let __VLS_734;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_735 = __VLS_asFunctionalComponent1(__VLS_734, new __VLS_734({
        ...{ class: "pt-4" },
    }));
    const __VLS_736 = __VLS_735({
        ...{ class: "pt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_735));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    const { default: __VLS_739 } = __VLS_737.slots;
    let __VLS_740;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_741 = __VLS_asFunctionalComponent1(__VLS_740, new __VLS_740({
        dense: true,
    }));
    const __VLS_742 = __VLS_741({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_741));
    const { default: __VLS_745 } = __VLS_743.slots;
    let __VLS_746;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_747 = __VLS_asFunctionalComponent1(__VLS_746, new __VLS_746({
        cols: "12",
        md: "6",
    }));
    const __VLS_748 = __VLS_747({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_747));
    const { default: __VLS_751 } = __VLS_749.slots;
    let __VLS_752;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_753 = __VLS_asFunctionalComponent1(__VLS_752, new __VLS_752({
        modelValue: (__VLS_ctx.monthlyCell.equipo_id),
        items: (__VLS_ctx.equipmentOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Equipo",
        variant: "outlined",
    }));
    const __VLS_754 = __VLS_753({
        modelValue: (__VLS_ctx.monthlyCell.equipo_id),
        items: (__VLS_ctx.equipmentOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Equipo",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_753));
    // @ts-ignore
    [equipmentOptions, monthlyCell,];
    var __VLS_749;
    let __VLS_757;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_758 = __VLS_asFunctionalComponent1(__VLS_757, new __VLS_757({
        cols: "12",
        md: "6",
    }));
    const __VLS_759 = __VLS_758({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_758));
    const { default: __VLS_762 } = __VLS_760.slots;
    let __VLS_763;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_764 = __VLS_asFunctionalComponent1(__VLS_763, new __VLS_763({
        modelValue: (__VLS_ctx.monthlyCell.fecha_programada),
        type: "date",
        label: "Fecha programada",
        variant: "outlined",
    }));
    const __VLS_765 = __VLS_764({
        modelValue: (__VLS_ctx.monthlyCell.fecha_programada),
        type: "date",
        label: "Fecha programada",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_764));
    // @ts-ignore
    [monthlyCell,];
    var __VLS_760;
    let __VLS_768;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_769 = __VLS_asFunctionalComponent1(__VLS_768, new __VLS_768({
        cols: "12",
        md: "6",
    }));
    const __VLS_770 = __VLS_769({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_769));
    const { default: __VLS_773 } = __VLS_771.slots;
    let __VLS_774;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_775 = __VLS_asFunctionalComponent1(__VLS_774, new __VLS_774({
        modelValue: (__VLS_ctx.monthlyCell.valor_crudo),
        label: "Valor mensual",
        hint: "Usa 325, 650, 975, R20 o una cantidad de horas",
        persistentHint: true,
        variant: "outlined",
    }));
    const __VLS_776 = __VLS_775({
        modelValue: (__VLS_ctx.monthlyCell.valor_crudo),
        label: "Valor mensual",
        hint: "Usa 325, 650, 975, R20 o una cantidad de horas",
        persistentHint: true,
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_775));
    // @ts-ignore
    [monthlyCell,];
    var __VLS_771;
    let __VLS_779;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_780 = __VLS_asFunctionalComponent1(__VLS_779, new __VLS_779({
        cols: "12",
        md: "6",
    }));
    const __VLS_781 = __VLS_780({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_780));
    const { default: __VLS_784 } = __VLS_782.slots;
    let __VLS_785;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_786 = __VLS_asFunctionalComponent1(__VLS_785, new __VLS_785({
        modelValue: (__VLS_ctx.monthlyCell.procedimiento_id),
        items: (__VLS_ctx.procedureOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Plantilla MPG opcional",
        variant: "outlined",
        clearable: true,
    }));
    const __VLS_787 = __VLS_786({
        modelValue: (__VLS_ctx.monthlyCell.procedimiento_id),
        items: (__VLS_ctx.procedureOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Plantilla MPG opcional",
        variant: "outlined",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_786));
    // @ts-ignore
    [procedureOptions, monthlyCell,];
    var __VLS_782;
    let __VLS_790;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_791 = __VLS_asFunctionalComponent1(__VLS_790, new __VLS_790({
        cols: "12",
    }));
    const __VLS_792 = __VLS_791({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_791));
    const { default: __VLS_795 } = __VLS_793.slots;
    let __VLS_796;
    /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
    vTextarea;
    // @ts-ignore
    const __VLS_797 = __VLS_asFunctionalComponent1(__VLS_796, new __VLS_796({
        modelValue: (__VLS_ctx.monthlyCell.observacion),
        rows: "3",
        label: "Observaci?n",
        variant: "outlined",
    }));
    const __VLS_798 = __VLS_797({
        modelValue: (__VLS_ctx.monthlyCell.observacion),
        rows: "3",
        label: "Observaci?n",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_797));
    // @ts-ignore
    [monthlyCell,];
    var __VLS_793;
    // @ts-ignore
    [];
    var __VLS_743;
    // @ts-ignore
    [];
    var __VLS_737;
    let __VLS_801;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_802 = __VLS_asFunctionalComponent1(__VLS_801, new __VLS_801({}));
    const __VLS_803 = __VLS_802({}, ...__VLS_functionalComponentArgsRest(__VLS_802));
    let __VLS_806;
    /** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
    vCardActions;
    // @ts-ignore
    const __VLS_807 = __VLS_asFunctionalComponent1(__VLS_806, new __VLS_806({
        ...{ class: "pa-4" },
    }));
    const __VLS_808 = __VLS_807({
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_807));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_811 } = __VLS_809.slots;
    let __VLS_812;
    /** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
    vSpacer;
    // @ts-ignore
    const __VLS_813 = __VLS_asFunctionalComponent1(__VLS_812, new __VLS_812({}));
    const __VLS_814 = __VLS_813({}, ...__VLS_functionalComponentArgsRest(__VLS_813));
    let __VLS_817;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_818 = __VLS_asFunctionalComponent1(__VLS_817, new __VLS_817({
        ...{ 'onClick': {} },
        variant: "text",
    }));
    const __VLS_819 = __VLS_818({
        ...{ 'onClick': {} },
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_818));
    let __VLS_822;
    const __VLS_823 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                __VLS_ctx.monthlyCellDialog = false;
                // @ts-ignore
                [monthlyCellDialog,];
            } });
    const { default: __VLS_824 } = __VLS_820.slots;
    // @ts-ignore
    [];
    var __VLS_820;
    var __VLS_821;
    if (__VLS_ctx.canPersistMonthlyCell) {
        let __VLS_825;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_826 = __VLS_asFunctionalComponent1(__VLS_825, new __VLS_825({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.savingMonthlyCell),
        }));
        const __VLS_827 = __VLS_826({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.savingMonthlyCell),
        }, ...__VLS_functionalComponentArgsRest(__VLS_826));
        let __VLS_830;
        const __VLS_831 = ({ click: {} },
            { onClick: (__VLS_ctx.saveMonthlyCell) });
        const { default: __VLS_832 } = __VLS_828.slots;
        // @ts-ignore
        [canPersistMonthlyCell, savingMonthlyCell, saveMonthlyCell,];
        var __VLS_828;
        var __VLS_829;
    }
    // @ts-ignore
    [];
    var __VLS_809;
    // @ts-ignore
    [];
    var __VLS_720;
    // @ts-ignore
    [];
    var __VLS_714;
    let __VLS_833;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_834 = __VLS_asFunctionalComponent1(__VLS_833, new __VLS_833({
        modelValue: (__VLS_ctx.monthlyPaletteDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 760),
    }));
    const __VLS_835 = __VLS_834({
        modelValue: (__VLS_ctx.monthlyPaletteDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 760),
    }, ...__VLS_functionalComponentArgsRest(__VLS_834));
    const { default: __VLS_838 } = __VLS_836.slots;
    let __VLS_839;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_840 = __VLS_asFunctionalComponent1(__VLS_839, new __VLS_839({
        rounded: "xl",
    }));
    const __VLS_841 = __VLS_840({
        rounded: "xl",
    }, ...__VLS_functionalComponentArgsRest(__VLS_840));
    const { default: __VLS_844 } = __VLS_842.slots;
    let __VLS_845;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_846 = __VLS_asFunctionalComponent1(__VLS_845, new __VLS_845({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }));
    const __VLS_847 = __VLS_846({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_846));
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    const { default: __VLS_850 } = __VLS_848.slots;
    // @ts-ignore
    [isWeeklyCellFullscreen, isWeeklyCellFullscreen, monthlyPaletteDialog,];
    var __VLS_848;
    let __VLS_851;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_852 = __VLS_asFunctionalComponent1(__VLS_851, new __VLS_851({}));
    const __VLS_853 = __VLS_852({}, ...__VLS_functionalComponentArgsRest(__VLS_852));
    let __VLS_856;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_857 = __VLS_asFunctionalComponent1(__VLS_856, new __VLS_856({
        ...{ class: "pt-4" },
    }));
    const __VLS_858 = __VLS_857({
        ...{ class: "pt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_857));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    const { default: __VLS_861 } = __VLS_859.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "palette-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['palette-grid']} */ ;
    for (const [field] of __VLS_vFor((__VLS_ctx.monthlyPaletteFields))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (field.key),
            ...{ class: "palette-item" },
        });
        /** @type {__VLS_StyleScopedClasses['palette-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (field.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "palette-item__controls" },
        });
        /** @type {__VLS_StyleScopedClasses['palette-item__controls']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "color",
            ...{ class: "palette-color-input" },
        });
        (__VLS_ctx.monthlyPaletteForm[field.key]);
        /** @type {__VLS_StyleScopedClasses['palette-color-input']} */ ;
        let __VLS_862;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_863 = __VLS_asFunctionalComponent1(__VLS_862, new __VLS_862({
            modelValue: (__VLS_ctx.monthlyPaletteForm[field.key]),
            density: "compact",
            hideDetails: true,
            variant: "outlined",
        }));
        const __VLS_864 = __VLS_863({
            modelValue: (__VLS_ctx.monthlyPaletteForm[field.key]),
            density: "compact",
            hideDetails: true,
            variant: "outlined",
        }, ...__VLS_functionalComponentArgsRest(__VLS_863));
        // @ts-ignore
        [monthlyPaletteFields, monthlyPaletteForm, monthlyPaletteForm,];
    }
    // @ts-ignore
    [];
    var __VLS_859;
    let __VLS_867;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_868 = __VLS_asFunctionalComponent1(__VLS_867, new __VLS_867({}));
    const __VLS_869 = __VLS_868({}, ...__VLS_functionalComponentArgsRest(__VLS_868));
    let __VLS_872;
    /** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
    vCardActions;
    // @ts-ignore
    const __VLS_873 = __VLS_asFunctionalComponent1(__VLS_872, new __VLS_872({
        ...{ class: "pa-4" },
    }));
    const __VLS_874 = __VLS_873({
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_873));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_877 } = __VLS_875.slots;
    let __VLS_878;
    /** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
    vSpacer;
    // @ts-ignore
    const __VLS_879 = __VLS_asFunctionalComponent1(__VLS_878, new __VLS_878({}));
    const __VLS_880 = __VLS_879({}, ...__VLS_functionalComponentArgsRest(__VLS_879));
    let __VLS_883;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_884 = __VLS_asFunctionalComponent1(__VLS_883, new __VLS_883({
        ...{ 'onClick': {} },
        variant: "text",
    }));
    const __VLS_885 = __VLS_884({
        ...{ 'onClick': {} },
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_884));
    let __VLS_888;
    const __VLS_889 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                __VLS_ctx.monthlyPaletteDialog = false;
                // @ts-ignore
                [monthlyPaletteDialog,];
            } });
    const { default: __VLS_890 } = __VLS_886.slots;
    // @ts-ignore
    [];
    var __VLS_886;
    var __VLS_887;
    if (__VLS_ctx.canEditMonthlyColors) {
        let __VLS_891;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_892 = __VLS_asFunctionalComponent1(__VLS_891, new __VLS_891({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.savingMonthlyPalette),
        }));
        const __VLS_893 = __VLS_892({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.savingMonthlyPalette),
        }, ...__VLS_functionalComponentArgsRest(__VLS_892));
        let __VLS_896;
        const __VLS_897 = ({ click: {} },
            { onClick: (__VLS_ctx.saveMonthlyPalette) });
        const { default: __VLS_898 } = __VLS_894.slots;
        // @ts-ignore
        [canEditMonthlyColors, savingMonthlyPalette, saveMonthlyPalette,];
        var __VLS_894;
        var __VLS_895;
    }
    // @ts-ignore
    [];
    var __VLS_875;
    // @ts-ignore
    [];
    var __VLS_842;
    // @ts-ignore
    [];
    var __VLS_836;
    let __VLS_899;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_900 = __VLS_asFunctionalComponent1(__VLS_899, new __VLS_899({
        modelValue: (__VLS_ctx.weeklyEditorDialog),
        fullscreen: (__VLS_ctx.isWeeklyEditorFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyEditorFullscreen ? undefined : 1480),
    }));
    const __VLS_901 = __VLS_900({
        modelValue: (__VLS_ctx.weeklyEditorDialog),
        fullscreen: (__VLS_ctx.isWeeklyEditorFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyEditorFullscreen ? undefined : 1480),
    }, ...__VLS_functionalComponentArgsRest(__VLS_900));
    const { default: __VLS_904 } = __VLS_902.slots;
    let __VLS_905;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_906 = __VLS_asFunctionalComponent1(__VLS_905, new __VLS_905({
        rounded: "xl",
    }));
    const __VLS_907 = __VLS_906({
        rounded: "xl",
    }, ...__VLS_functionalComponentArgsRest(__VLS_906));
    const { default: __VLS_910 } = __VLS_908.slots;
    let __VLS_911;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_912 = __VLS_asFunctionalComponent1(__VLS_911, new __VLS_911({
        ...{ class: "d-flex align-center justify-space-between flex-wrap" },
        ...{ style: {} },
    }));
    const __VLS_913 = __VLS_912({
        ...{ class: "d-flex align-center justify-space-between flex-wrap" },
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_912));
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    const { default: __VLS_916 } = __VLS_914.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.weeklyEditor.id ? "Editar cronograma semanal" : "Nuevo cronograma semanal");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    if (__VLS_ctx.canPersistWeeklyEditor) {
        let __VLS_917;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_918 = __VLS_asFunctionalComponent1(__VLS_917, new __VLS_917({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.savingWeekly),
        }));
        const __VLS_919 = __VLS_918({
            ...{ 'onClick': {} },
            color: "primary",
            loading: (__VLS_ctx.savingWeekly),
        }, ...__VLS_functionalComponentArgsRest(__VLS_918));
        let __VLS_922;
        const __VLS_923 = ({ click: {} },
            { onClick: (__VLS_ctx.saveWeeklyEditor) });
        const { default: __VLS_924 } = __VLS_920.slots;
        // @ts-ignore
        [weeklyEditorDialog, isWeeklyEditorFullscreen, isWeeklyEditorFullscreen, weeklyEditor, canPersistWeeklyEditor, savingWeekly, saveWeeklyEditor,];
        var __VLS_920;
        var __VLS_921;
    }
    // @ts-ignore
    [];
    var __VLS_914;
    let __VLS_925;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_926 = __VLS_asFunctionalComponent1(__VLS_925, new __VLS_925({}));
    const __VLS_927 = __VLS_926({}, ...__VLS_functionalComponentArgsRest(__VLS_926));
    let __VLS_930;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_931 = __VLS_asFunctionalComponent1(__VLS_930, new __VLS_930({
        ...{ class: "pt-4" },
    }));
    const __VLS_932 = __VLS_931({
        ...{ class: "pt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_931));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    const { default: __VLS_935 } = __VLS_933.slots;
    let __VLS_936;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_937 = __VLS_asFunctionalComponent1(__VLS_936, new __VLS_936({
        dense: true,
    }));
    const __VLS_938 = __VLS_937({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_937));
    const { default: __VLS_941 } = __VLS_939.slots;
    let __VLS_942;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_943 = __VLS_asFunctionalComponent1(__VLS_942, new __VLS_942({
        cols: "12",
        md: "3",
    }));
    const __VLS_944 = __VLS_943({
        cols: "12",
        md: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_943));
    const { default: __VLS_947 } = __VLS_945.slots;
    let __VLS_948;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_949 = __VLS_asFunctionalComponent1(__VLS_948, new __VLS_948({
        modelValue: (__VLS_ctx.weeklyEditor.codigo),
        label: "C?digo",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_950 = __VLS_949({
        modelValue: (__VLS_ctx.weeklyEditor.codigo),
        label: "C?digo",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_949));
    // @ts-ignore
    [weeklyEditor,];
    var __VLS_945;
    let __VLS_953;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_954 = __VLS_asFunctionalComponent1(__VLS_953, new __VLS_953({
        cols: "12",
        md: "3",
    }));
    const __VLS_955 = __VLS_954({
        cols: "12",
        md: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_954));
    const { default: __VLS_958 } = __VLS_956.slots;
    let __VLS_959;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_960 = __VLS_asFunctionalComponent1(__VLS_959, new __VLS_959({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.weeklyEditorAnchorDate),
        type: "date",
        label: "Semana a programar",
        variant: "outlined",
    }));
    const __VLS_961 = __VLS_960({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.weeklyEditorAnchorDate),
        type: "date",
        label: "Semana a programar",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_960));
    let __VLS_964;
    const __VLS_965 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.handleWeeklyAnchorChange) });
    var __VLS_962;
    var __VLS_963;
    // @ts-ignore
    [weeklyEditorAnchorDate, handleWeeklyAnchorChange,];
    var __VLS_956;
    let __VLS_966;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_967 = __VLS_asFunctionalComponent1(__VLS_966, new __VLS_966({
        cols: "12",
        md: "3",
    }));
    const __VLS_968 = __VLS_967({
        cols: "12",
        md: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_967));
    const { default: __VLS_971 } = __VLS_969.slots;
    let __VLS_972;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_973 = __VLS_asFunctionalComponent1(__VLS_972, new __VLS_972({
        modelValue: (__VLS_ctx.weeklyEditor.fecha_inicio),
        label: "Inicio de semana",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_974 = __VLS_973({
        modelValue: (__VLS_ctx.weeklyEditor.fecha_inicio),
        label: "Inicio de semana",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_973));
    // @ts-ignore
    [weeklyEditor,];
    var __VLS_969;
    let __VLS_977;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_978 = __VLS_asFunctionalComponent1(__VLS_977, new __VLS_977({
        cols: "12",
        md: "3",
    }));
    const __VLS_979 = __VLS_978({
        cols: "12",
        md: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_978));
    const { default: __VLS_982 } = __VLS_980.slots;
    let __VLS_983;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_984 = __VLS_asFunctionalComponent1(__VLS_983, new __VLS_983({
        modelValue: (__VLS_ctx.weeklyEditor.fecha_fin),
        label: "Fin de semana",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_985 = __VLS_984({
        modelValue: (__VLS_ctx.weeklyEditor.fecha_fin),
        label: "Fin de semana",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_984));
    // @ts-ignore
    [weeklyEditor,];
    var __VLS_980;
    let __VLS_988;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_989 = __VLS_asFunctionalComponent1(__VLS_988, new __VLS_988({
        cols: "12",
        md: "4",
    }));
    const __VLS_990 = __VLS_989({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_989));
    const { default: __VLS_993 } = __VLS_991.slots;
    let __VLS_994;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_995 = __VLS_asFunctionalComponent1(__VLS_994, new __VLS_994({
        modelValue: (__VLS_ctx.weeklyEditor.locacion),
        label: "Locaci?n",
        variant: "outlined",
    }));
    const __VLS_996 = __VLS_995({
        modelValue: (__VLS_ctx.weeklyEditor.locacion),
        label: "Locaci?n",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_995));
    // @ts-ignore
    [weeklyEditor,];
    var __VLS_991;
    let __VLS_999;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1000 = __VLS_asFunctionalComponent1(__VLS_999, new __VLS_999({
        cols: "12",
        md: "4",
    }));
    const __VLS_1001 = __VLS_1000({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1000));
    const { default: __VLS_1004 } = __VLS_1002.slots;
    let __VLS_1005;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_1006 = __VLS_asFunctionalComponent1(__VLS_1005, new __VLS_1005({
        modelValue: (__VLS_ctx.weeklyEditor.referencia_orden),
        label: "Referencia de orden",
        variant: "outlined",
    }));
    const __VLS_1007 = __VLS_1006({
        modelValue: (__VLS_ctx.weeklyEditor.referencia_orden),
        label: "Referencia de orden",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1006));
    // @ts-ignore
    [weeklyEditor,];
    var __VLS_1002;
    let __VLS_1010;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1011 = __VLS_asFunctionalComponent1(__VLS_1010, new __VLS_1010({
        cols: "12",
        md: "4",
    }));
    const __VLS_1012 = __VLS_1011({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1011));
    const { default: __VLS_1015 } = __VLS_1013.slots;
    let __VLS_1016;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_1017 = __VLS_asFunctionalComponent1(__VLS_1016, new __VLS_1016({
        modelValue: (__VLS_ctx.weeklyEditor.resumen),
        label: "Resumen",
        variant: "outlined",
    }));
    const __VLS_1018 = __VLS_1017({
        modelValue: (__VLS_ctx.weeklyEditor.resumen),
        label: "Resumen",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1017));
    // @ts-ignore
    [weeklyEditor,];
    var __VLS_1013;
    // @ts-ignore
    [];
    var __VLS_939;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "matrix-wrap mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['matrix-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
        ...{ class: "matrix-table" },
    });
    /** @type {__VLS_StyleScopedClasses['matrix-table']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "matrix-table__sticky" },
    });
    /** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
    for (const [day] of __VLS_vFor((__VLS_ctx.weeklyEditorDays))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
            key: (`editor-${day.date}`),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        (day.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (day.date);
        // @ts-ignore
        [weeklyEditorDays,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [slot] of __VLS_vFor((__VLS_ctx.weeklyEditorSlots))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            key: (slot.key),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
            ...{ class: "matrix-table__sticky" },
        });
        /** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "slot-editor" },
        });
        /** @type {__VLS_StyleScopedClasses['slot-editor']} */ ;
        let __VLS_1021;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_1022 = __VLS_asFunctionalComponent1(__VLS_1021, new __VLS_1021({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (slot.hora_inicio),
            type: "time",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            label: "Inicio",
        }));
        const __VLS_1023 = __VLS_1022({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (slot.hora_inicio),
            type: "time",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            label: "Inicio",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1022));
        let __VLS_1026;
        const __VLS_1027 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    __VLS_ctx.updateWeeklySlot(slot.key, 'hora_inicio', String($event || ''));
                    // @ts-ignore
                    [weeklyEditorSlots, updateWeeklySlot,];
                } });
        var __VLS_1024;
        var __VLS_1025;
        let __VLS_1028;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_1029 = __VLS_asFunctionalComponent1(__VLS_1028, new __VLS_1028({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (slot.hora_fin),
            type: "time",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            label: "Fin",
        }));
        const __VLS_1030 = __VLS_1029({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (slot.hora_fin),
            type: "time",
            density: "compact",
            variant: "outlined",
            hideDetails: true,
            label: "Fin",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1029));
        let __VLS_1033;
        const __VLS_1034 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    __VLS_ctx.updateWeeklySlot(slot.key, 'hora_fin', String($event || ''));
                    // @ts-ignore
                    [updateWeeklySlot,];
                } });
        var __VLS_1031;
        var __VLS_1032;
        if (__VLS_ctx.canEdit) {
            let __VLS_1035;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_1036 = __VLS_asFunctionalComponent1(__VLS_1035, new __VLS_1035({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_1037 = __VLS_1036({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_1036));
            let __VLS_1040;
            const __VLS_1041 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.removeWeeklySlot(slot.key);
                        // @ts-ignore
                        [canEdit, removeWeeklySlot,];
                    } });
            var __VLS_1038;
            var __VLS_1039;
        }
        if (__VLS_ctx.canCreate) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canCreate))
                            return;
                        __VLS_ctx.addWeeklySlotAfter(slot.key);
                        // @ts-ignore
                        [canCreate, addWeeklySlotAfter,];
                    } },
                type: "button",
                ...{ class: "weekly-slot-inline-add" },
            });
            /** @type {__VLS_StyleScopedClasses['weekly-slot-inline-add']} */ ;
            let __VLS_1042;
            /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
            vIcon;
            // @ts-ignore
            const __VLS_1043 = __VLS_asFunctionalComponent1(__VLS_1042, new __VLS_1042({
                icon: "mdi-plus",
                size: "16",
            }));
            const __VLS_1044 = __VLS_1043({
                icon: "mdi-plus",
                size: "16",
            }, ...__VLS_functionalComponentArgsRest(__VLS_1043));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        }
        for (const [day] of __VLS_vFor((__VLS_ctx.weeklyEditorDays))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                key: (`${slot.key}-${day.date}`),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "matrix-cell matrix-cell--weekly" },
            });
            /** @type {__VLS_StyleScopedClasses['matrix-cell']} */ ;
            /** @type {__VLS_StyleScopedClasses['matrix-cell--weekly']} */ ;
            if (__VLS_ctx.canCreate) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.canRead))
                                return;
                            if (!(__VLS_ctx.canCreate))
                                return;
                            __VLS_ctx.openWeeklyCell(slot.key, day.date);
                            // @ts-ignore
                            [canCreate, weeklyEditorDays, openWeeklyCell,];
                        } },
                    type: "button",
                    ...{ class: "weekly-add-button" },
                });
                /** @type {__VLS_StyleScopedClasses['weekly-add-button']} */ ;
                let __VLS_1047;
                /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
                vIcon;
                // @ts-ignore
                const __VLS_1048 = __VLS_asFunctionalComponent1(__VLS_1047, new __VLS_1047({
                    icon: "mdi-plus",
                    size: "16",
                }));
                const __VLS_1049 = __VLS_1048({
                    icon: "mdi-plus",
                    size: "16",
                }, ...__VLS_functionalComponentArgsRest(__VLS_1048));
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            }
            for (const [item] of __VLS_vFor((__VLS_ctx.getWeeklyEditorItems(slot.key, day.date)))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (item.local_id),
                    ...{ class: "weekly-activity weekly-activity--editable" },
                });
                /** @type {__VLS_StyleScopedClasses['weekly-activity']} */ ;
                /** @type {__VLS_StyleScopedClasses['weekly-activity--editable']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "d-flex align-start justify-space-between" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['align-start']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "weekly-activity__title" },
                });
                /** @type {__VLS_StyleScopedClasses['weekly-activity__title']} */ ;
                (item.actividad);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-caption text-medium-emphasis" },
                });
                /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
                (item.tipo_proceso || "OPERACION");
                if (item.equipo_codigo) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                    (item.equipo_codigo);
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "d-flex" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
                if (__VLS_ctx.canEdit) {
                    let __VLS_1052;
                    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
                    vBtn;
                    // @ts-ignore
                    const __VLS_1053 = __VLS_asFunctionalComponent1(__VLS_1052, new __VLS_1052({
                        ...{ 'onClick': {} },
                        icon: "mdi-pencil",
                        size: "x-small",
                        variant: "text",
                    }));
                    const __VLS_1054 = __VLS_1053({
                        ...{ 'onClick': {} },
                        icon: "mdi-pencil",
                        size: "x-small",
                        variant: "text",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_1053));
                    let __VLS_1057;
                    const __VLS_1058 = ({ click: {} },
                        { onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.canRead))
                                    return;
                                if (!(__VLS_ctx.canEdit))
                                    return;
                                __VLS_ctx.openWeeklyCell(slot.key, day.date, item);
                                // @ts-ignore
                                [canEdit, openWeeklyCell, getWeeklyEditorItems,];
                            } });
                    var __VLS_1055;
                    var __VLS_1056;
                }
                if (__VLS_ctx.canEdit) {
                    let __VLS_1059;
                    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
                    vBtn;
                    // @ts-ignore
                    const __VLS_1060 = __VLS_asFunctionalComponent1(__VLS_1059, new __VLS_1059({
                        ...{ 'onClick': {} },
                        icon: "mdi-delete",
                        size: "x-small",
                        variant: "text",
                        color: "error",
                    }));
                    const __VLS_1061 = __VLS_1060({
                        ...{ 'onClick': {} },
                        icon: "mdi-delete",
                        size: "x-small",
                        variant: "text",
                        color: "error",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_1060));
                    let __VLS_1064;
                    const __VLS_1065 = ({ click: {} },
                        { onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.canRead))
                                    return;
                                if (!(__VLS_ctx.canEdit))
                                    return;
                                __VLS_ctx.removeWeeklyItem(item.local_id);
                                // @ts-ignore
                                [canEdit, removeWeeklyItem,];
                            } });
                    var __VLS_1062;
                    var __VLS_1063;
                }
                // @ts-ignore
                [];
            }
            // @ts-ignore
            [];
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "matrix-table__sticky" },
    });
    /** @type {__VLS_StyleScopedClasses['matrix-table__sticky']} */ ;
    if (__VLS_ctx.canCreate) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canCreate))
                        return;
                    __VLS_ctx.addWeeklySlot();
                    // @ts-ignore
                    [canCreate, addWeeklySlot,];
                } },
            type: "button",
            ...{ class: "weekly-slot-inline-add weekly-slot-inline-add--footer" },
        });
        /** @type {__VLS_StyleScopedClasses['weekly-slot-inline-add']} */ ;
        /** @type {__VLS_StyleScopedClasses['weekly-slot-inline-add--footer']} */ ;
        let __VLS_1066;
        /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
        vIcon;
        // @ts-ignore
        const __VLS_1067 = __VLS_asFunctionalComponent1(__VLS_1066, new __VLS_1066({
            icon: "mdi-plus",
            size: "16",
        }));
        const __VLS_1068 = __VLS_1067({
            icon: "mdi-plus",
            size: "16",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1067));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        colspan: (Math.max(__VLS_ctx.weeklyEditorDays.length, 1)),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis py-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "weekly-slot-footer mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['weekly-slot-footer']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    if (__VLS_ctx.canCreate) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canCreate))
                        return;
                    __VLS_ctx.addWeeklySlot();
                    // @ts-ignore
                    [canCreate, weeklyEditorDays, addWeeklySlot,];
                } },
            type: "button",
            ...{ class: "weekly-slot-add-button" },
        });
        /** @type {__VLS_StyleScopedClasses['weekly-slot-add-button']} */ ;
        let __VLS_1071;
        /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
        vIcon;
        // @ts-ignore
        const __VLS_1072 = __VLS_asFunctionalComponent1(__VLS_1071, new __VLS_1071({
            icon: "mdi-plus",
            size: "18",
        }));
        const __VLS_1073 = __VLS_1072({
            icon: "mdi-plus",
            size: "18",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1072));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    // @ts-ignore
    [];
    var __VLS_933;
    // @ts-ignore
    [];
    var __VLS_908;
    // @ts-ignore
    [];
    var __VLS_902;
    let __VLS_1076;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_1077 = __VLS_asFunctionalComponent1(__VLS_1076, new __VLS_1076({
        modelValue: (__VLS_ctx.weeklyCellDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 620),
    }));
    const __VLS_1078 = __VLS_1077({
        modelValue: (__VLS_ctx.weeklyCellDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 620),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1077));
    const { default: __VLS_1081 } = __VLS_1079.slots;
    let __VLS_1082;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_1083 = __VLS_asFunctionalComponent1(__VLS_1082, new __VLS_1082({
        rounded: "xl",
    }));
    const __VLS_1084 = __VLS_1083({
        rounded: "xl",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1083));
    const { default: __VLS_1087 } = __VLS_1085.slots;
    let __VLS_1088;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_1089 = __VLS_asFunctionalComponent1(__VLS_1088, new __VLS_1088({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }));
    const __VLS_1090 = __VLS_1089({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1089));
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    const { default: __VLS_1093 } = __VLS_1091.slots;
    (__VLS_ctx.weeklyCell.local_id ? "Editar actividad semanal" : "Nueva actividad semanal");
    // @ts-ignore
    [isWeeklyCellFullscreen, isWeeklyCellFullscreen, weeklyCellDialog, weeklyCell,];
    var __VLS_1091;
    let __VLS_1094;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_1095 = __VLS_asFunctionalComponent1(__VLS_1094, new __VLS_1094({}));
    const __VLS_1096 = __VLS_1095({}, ...__VLS_functionalComponentArgsRest(__VLS_1095));
    let __VLS_1099;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_1100 = __VLS_asFunctionalComponent1(__VLS_1099, new __VLS_1099({
        ...{ class: "pt-4" },
    }));
    const __VLS_1101 = __VLS_1100({
        ...{ class: "pt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1100));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    const { default: __VLS_1104 } = __VLS_1102.slots;
    let __VLS_1105;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_1106 = __VLS_asFunctionalComponent1(__VLS_1105, new __VLS_1105({
        dense: true,
    }));
    const __VLS_1107 = __VLS_1106({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1106));
    const { default: __VLS_1110 } = __VLS_1108.slots;
    let __VLS_1111;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1112 = __VLS_asFunctionalComponent1(__VLS_1111, new __VLS_1111({
        cols: "12",
        md: "6",
    }));
    const __VLS_1113 = __VLS_1112({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1112));
    const { default: __VLS_1116 } = __VLS_1114.slots;
    let __VLS_1117;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_1118 = __VLS_asFunctionalComponent1(__VLS_1117, new __VLS_1117({
        modelValue: (__VLS_ctx.weeklyCell.fecha_actividad),
        label: "Fecha",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_1119 = __VLS_1118({
        modelValue: (__VLS_ctx.weeklyCell.fecha_actividad),
        label: "Fecha",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1118));
    // @ts-ignore
    [weeklyCell,];
    var __VLS_1114;
    let __VLS_1122;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1123 = __VLS_asFunctionalComponent1(__VLS_1122, new __VLS_1122({
        cols: "12",
        md: "6",
    }));
    const __VLS_1124 = __VLS_1123({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1123));
    const { default: __VLS_1127 } = __VLS_1125.slots;
    let __VLS_1128;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_1129 = __VLS_asFunctionalComponent1(__VLS_1128, new __VLS_1128({
        modelValue: (__VLS_ctx.weeklyCellSlotLabel),
        label: "Bloque horario",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_1130 = __VLS_1129({
        modelValue: (__VLS_ctx.weeklyCellSlotLabel),
        label: "Bloque horario",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1129));
    // @ts-ignore
    [weeklyCellSlotLabel,];
    var __VLS_1125;
    let __VLS_1133;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1134 = __VLS_asFunctionalComponent1(__VLS_1133, new __VLS_1133({
        cols: "12",
    }));
    const __VLS_1135 = __VLS_1134({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1134));
    const { default: __VLS_1138 } = __VLS_1136.slots;
    let __VLS_1139;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_1140 = __VLS_asFunctionalComponent1(__VLS_1139, new __VLS_1139({
        modelValue: (__VLS_ctx.weeklyCell.actividad),
        label: "Actividad",
        variant: "outlined",
    }));
    const __VLS_1141 = __VLS_1140({
        modelValue: (__VLS_ctx.weeklyCell.actividad),
        label: "Actividad",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1140));
    // @ts-ignore
    [weeklyCell,];
    var __VLS_1136;
    let __VLS_1144;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1145 = __VLS_asFunctionalComponent1(__VLS_1144, new __VLS_1144({
        cols: "12",
        md: "6",
    }));
    const __VLS_1146 = __VLS_1145({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1145));
    const { default: __VLS_1149 } = __VLS_1147.slots;
    let __VLS_1150;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_1151 = __VLS_asFunctionalComponent1(__VLS_1150, new __VLS_1150({
        modelValue: (__VLS_ctx.weeklyCell.tipo_proceso),
        items: (__VLS_ctx.weeklyProcessOptions),
        label: "Tipo de proceso",
        variant: "outlined",
    }));
    const __VLS_1152 = __VLS_1151({
        modelValue: (__VLS_ctx.weeklyCell.tipo_proceso),
        items: (__VLS_ctx.weeklyProcessOptions),
        label: "Tipo de proceso",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1151));
    // @ts-ignore
    [weeklyCell, weeklyProcessOptions,];
    var __VLS_1147;
    let __VLS_1155;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1156 = __VLS_asFunctionalComponent1(__VLS_1155, new __VLS_1155({
        cols: "12",
        md: "6",
    }));
    const __VLS_1157 = __VLS_1156({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1156));
    const { default: __VLS_1160 } = __VLS_1158.slots;
    let __VLS_1161;
    /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
    vAutocomplete;
    // @ts-ignore
    const __VLS_1162 = __VLS_asFunctionalComponent1(__VLS_1161, new __VLS_1161({
        modelValue: (__VLS_ctx.weeklyCell.equipo_codigo),
        items: (__VLS_ctx.equipmentCodeOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Equipo",
        variant: "outlined",
        clearable: true,
    }));
    const __VLS_1163 = __VLS_1162({
        modelValue: (__VLS_ctx.weeklyCell.equipo_codigo),
        items: (__VLS_ctx.equipmentCodeOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Equipo",
        variant: "outlined",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1162));
    // @ts-ignore
    [weeklyCell, equipmentCodeOptions,];
    var __VLS_1158;
    let __VLS_1166;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1167 = __VLS_asFunctionalComponent1(__VLS_1166, new __VLS_1166({
        cols: "12",
        md: "6",
    }));
    const __VLS_1168 = __VLS_1167({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1167));
    const { default: __VLS_1171 } = __VLS_1169.slots;
    let __VLS_1172;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_1173 = __VLS_asFunctionalComponent1(__VLS_1172, new __VLS_1172({
        modelValue: (__VLS_ctx.weeklyCell.responsable_area),
        label: "Área responsable",
        variant: "outlined",
    }));
    const __VLS_1174 = __VLS_1173({
        modelValue: (__VLS_ctx.weeklyCell.responsable_area),
        label: "Área responsable",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1173));
    // @ts-ignore
    [weeklyCell,];
    var __VLS_1169;
    let __VLS_1177;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1178 = __VLS_asFunctionalComponent1(__VLS_1177, new __VLS_1177({
        cols: "12",
        md: "6",
    }));
    const __VLS_1179 = __VLS_1178({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1178));
    const { default: __VLS_1182 } = __VLS_1180.slots;
    let __VLS_1183;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_1184 = __VLS_asFunctionalComponent1(__VLS_1183, new __VLS_1183({
        modelValue: (__VLS_ctx.weeklyCell.dia_semana),
        label: "Día",
        variant: "outlined",
        readonly: true,
    }));
    const __VLS_1185 = __VLS_1184({
        modelValue: (__VLS_ctx.weeklyCell.dia_semana),
        label: "Día",
        variant: "outlined",
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1184));
    // @ts-ignore
    [weeklyCell,];
    var __VLS_1180;
    let __VLS_1188;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_1189 = __VLS_asFunctionalComponent1(__VLS_1188, new __VLS_1188({
        cols: "12",
    }));
    const __VLS_1190 = __VLS_1189({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1189));
    const { default: __VLS_1193 } = __VLS_1191.slots;
    let __VLS_1194;
    /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
    vTextarea;
    // @ts-ignore
    const __VLS_1195 = __VLS_asFunctionalComponent1(__VLS_1194, new __VLS_1194({
        modelValue: (__VLS_ctx.weeklyCell.observacion),
        rows: "3",
        label: "Observación",
        variant: "outlined",
    }));
    const __VLS_1196 = __VLS_1195({
        modelValue: (__VLS_ctx.weeklyCell.observacion),
        rows: "3",
        label: "Observación",
        variant: "outlined",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1195));
    // @ts-ignore
    [weeklyCell,];
    var __VLS_1191;
    // @ts-ignore
    [];
    var __VLS_1108;
    // @ts-ignore
    [];
    var __VLS_1102;
    let __VLS_1199;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_1200 = __VLS_asFunctionalComponent1(__VLS_1199, new __VLS_1199({}));
    const __VLS_1201 = __VLS_1200({}, ...__VLS_functionalComponentArgsRest(__VLS_1200));
    let __VLS_1204;
    /** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
    vCardActions;
    // @ts-ignore
    const __VLS_1205 = __VLS_asFunctionalComponent1(__VLS_1204, new __VLS_1204({
        ...{ class: "pa-4" },
    }));
    const __VLS_1206 = __VLS_1205({
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1205));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_1209 } = __VLS_1207.slots;
    let __VLS_1210;
    /** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
    vSpacer;
    // @ts-ignore
    const __VLS_1211 = __VLS_asFunctionalComponent1(__VLS_1210, new __VLS_1210({}));
    const __VLS_1212 = __VLS_1211({}, ...__VLS_functionalComponentArgsRest(__VLS_1211));
    let __VLS_1215;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_1216 = __VLS_asFunctionalComponent1(__VLS_1215, new __VLS_1215({
        ...{ 'onClick': {} },
        variant: "text",
    }));
    const __VLS_1217 = __VLS_1216({
        ...{ 'onClick': {} },
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1216));
    let __VLS_1220;
    const __VLS_1221 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                __VLS_ctx.weeklyCellDialog = false;
                // @ts-ignore
                [weeklyCellDialog,];
            } });
    const { default: __VLS_1222 } = __VLS_1218.slots;
    // @ts-ignore
    [];
    var __VLS_1218;
    var __VLS_1219;
    if (__VLS_ctx.canPersistWeeklyCell) {
        let __VLS_1223;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_1224 = __VLS_asFunctionalComponent1(__VLS_1223, new __VLS_1223({
            ...{ 'onClick': {} },
            color: "primary",
        }));
        const __VLS_1225 = __VLS_1224({
            ...{ 'onClick': {} },
            color: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1224));
        let __VLS_1228;
        const __VLS_1229 = ({ click: {} },
            { onClick: (__VLS_ctx.saveWeeklyCell) });
        const { default: __VLS_1230 } = __VLS_1226.slots;
        // @ts-ignore
        [canPersistWeeklyCell, saveWeeklyCell,];
        var __VLS_1226;
        var __VLS_1227;
    }
    // @ts-ignore
    [];
    var __VLS_1207;
    // @ts-ignore
    [];
    var __VLS_1085;
    // @ts-ignore
    [];
    var __VLS_1079;
    let __VLS_1231;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_1232 = __VLS_asFunctionalComponent1(__VLS_1231, new __VLS_1231({
        modelValue: (__VLS_ctx.deleteDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 520),
    }));
    const __VLS_1233 = __VLS_1232({
        modelValue: (__VLS_ctx.deleteDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 520),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1232));
    const { default: __VLS_1236 } = __VLS_1234.slots;
    let __VLS_1237;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_1238 = __VLS_asFunctionalComponent1(__VLS_1237, new __VLS_1237({
        rounded: "xl",
        ...{ class: "enterprise-dialog" },
    }));
    const __VLS_1239 = __VLS_1238({
        rounded: "xl",
        ...{ class: "enterprise-dialog" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1238));
    /** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
    const { default: __VLS_1242 } = __VLS_1240.slots;
    let __VLS_1243;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_1244 = __VLS_asFunctionalComponent1(__VLS_1243, new __VLS_1243({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }));
    const __VLS_1245 = __VLS_1244({
        ...{ class: "text-subtitle-1 font-weight-bold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1244));
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    const { default: __VLS_1248 } = __VLS_1246.slots;
    // @ts-ignore
    [isWeeklyCellFullscreen, isWeeklyCellFullscreen, deleteDialog,];
    var __VLS_1246;
    let __VLS_1249;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_1250 = __VLS_asFunctionalComponent1(__VLS_1249, new __VLS_1249({}));
    const __VLS_1251 = __VLS_1250({}, ...__VLS_functionalComponentArgsRest(__VLS_1250));
    const { default: __VLS_1254 } = __VLS_1252.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.deleteTargetLabel || "seleccionada");
    // @ts-ignore
    [deleteTargetLabel,];
    var __VLS_1252;
    let __VLS_1255;
    /** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
    vCardActions;
    // @ts-ignore
    const __VLS_1256 = __VLS_asFunctionalComponent1(__VLS_1255, new __VLS_1255({
        ...{ class: "pa-4" },
    }));
    const __VLS_1257 = __VLS_1256({
        ...{ class: "pa-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1256));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    const { default: __VLS_1260 } = __VLS_1258.slots;
    let __VLS_1261;
    /** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
    vSpacer;
    // @ts-ignore
    const __VLS_1262 = __VLS_asFunctionalComponent1(__VLS_1261, new __VLS_1261({}));
    const __VLS_1263 = __VLS_1262({}, ...__VLS_functionalComponentArgsRest(__VLS_1262));
    let __VLS_1266;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_1267 = __VLS_asFunctionalComponent1(__VLS_1266, new __VLS_1266({
        ...{ 'onClick': {} },
        variant: "text",
    }));
    const __VLS_1268 = __VLS_1267({
        ...{ 'onClick': {} },
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1267));
    let __VLS_1271;
    const __VLS_1272 = ({ click: {} },
        { onClick: (__VLS_ctx.closeDeleteProgramacionDialog) });
    const { default: __VLS_1273 } = __VLS_1269.slots;
    // @ts-ignore
    [closeDeleteProgramacionDialog,];
    var __VLS_1269;
    var __VLS_1270;
    let __VLS_1274;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_1275 = __VLS_asFunctionalComponent1(__VLS_1274, new __VLS_1274({
        ...{ 'onClick': {} },
        color: "error",
        loading: (__VLS_ctx.removingProgramacion),
    }));
    const __VLS_1276 = __VLS_1275({
        ...{ 'onClick': {} },
        color: "error",
        loading: (__VLS_ctx.removingProgramacion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1275));
    let __VLS_1279;
    const __VLS_1280 = ({ click: {} },
        { onClick: (__VLS_ctx.confirmDeleteProgramacion) });
    const { default: __VLS_1281 } = __VLS_1277.slots;
    // @ts-ignore
    [removingProgramacion, confirmDeleteProgramacion,];
    var __VLS_1277;
    var __VLS_1278;
    // @ts-ignore
    [];
    var __VLS_1258;
    // @ts-ignore
    [];
    var __VLS_1240;
    // @ts-ignore
    [];
    var __VLS_1234;
    let __VLS_1282;
    /** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
    vDialog;
    // @ts-ignore
    const __VLS_1283 = __VLS_asFunctionalComponent1(__VLS_1282, new __VLS_1282({
        modelValue: (__VLS_ctx.agendaDayDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 920),
    }));
    const __VLS_1284 = __VLS_1283({
        modelValue: (__VLS_ctx.agendaDayDialog),
        fullscreen: (__VLS_ctx.isWeeklyCellFullscreen),
        maxWidth: (__VLS_ctx.isWeeklyCellFullscreen ? undefined : 920),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1283));
    const { default: __VLS_1287 } = __VLS_1285.slots;
    let __VLS_1288;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_1289 = __VLS_asFunctionalComponent1(__VLS_1288, new __VLS_1288({
        rounded: "xl",
        ...{ class: "enterprise-dialog" },
    }));
    const __VLS_1290 = __VLS_1289({
        rounded: "xl",
        ...{ class: "enterprise-dialog" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1289));
    /** @type {__VLS_StyleScopedClasses['enterprise-dialog']} */ ;
    const { default: __VLS_1293 } = __VLS_1291.slots;
    let __VLS_1294;
    /** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
    vCardTitle;
    // @ts-ignore
    const __VLS_1295 = __VLS_asFunctionalComponent1(__VLS_1294, new __VLS_1294({
        ...{ class: "d-flex align-center justify-space-between flex-wrap" },
        ...{ style: {} },
    }));
    const __VLS_1296 = __VLS_1295({
        ...{ class: "d-flex align-center justify-space-between flex-wrap" },
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1295));
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    const { default: __VLS_1299 } = __VLS_1297.slots;
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
    (__VLS_ctx.agendaSelectedDayLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    if (__VLS_ctx.canCreate) {
        let __VLS_1300;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_1301 = __VLS_asFunctionalComponent1(__VLS_1300, new __VLS_1300({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-plus",
        }));
        const __VLS_1302 = __VLS_1301({
            ...{ 'onClick': {} },
            variant: "tonal",
            prependIcon: "mdi-plus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1301));
        let __VLS_1305;
        const __VLS_1306 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.canRead))
                        return;
                    if (!(__VLS_ctx.canCreate))
                        return;
                    __VLS_ctx.agendaSelectedDate && __VLS_ctx.openCreateFromAgendaDialog();
                    // @ts-ignore
                    [canCreate, isWeeklyCellFullscreen, isWeeklyCellFullscreen, agendaDayDialog, agendaSelectedDayLabel, agendaSelectedDate, openCreateFromAgendaDialog,];
                } });
        const { default: __VLS_1307 } = __VLS_1303.slots;
        // @ts-ignore
        [];
        var __VLS_1303;
        var __VLS_1304;
    }
    let __VLS_1308;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_1309 = __VLS_asFunctionalComponent1(__VLS_1308, new __VLS_1308({
        ...{ 'onClick': {} },
        icon: "mdi-close",
        variant: "text",
    }));
    const __VLS_1310 = __VLS_1309({
        ...{ 'onClick': {} },
        icon: "mdi-close",
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1309));
    let __VLS_1313;
    const __VLS_1314 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.canRead))
                    return;
                __VLS_ctx.agendaDayDialog = false;
                // @ts-ignore
                [agendaDayDialog,];
            } });
    var __VLS_1311;
    var __VLS_1312;
    // @ts-ignore
    [];
    var __VLS_1297;
    let __VLS_1315;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_1316 = __VLS_asFunctionalComponent1(__VLS_1315, new __VLS_1315({}));
    const __VLS_1317 = __VLS_1316({}, ...__VLS_functionalComponentArgsRest(__VLS_1316));
    let __VLS_1320;
    /** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
    vCardText;
    // @ts-ignore
    const __VLS_1321 = __VLS_asFunctionalComponent1(__VLS_1320, new __VLS_1320({
        ...{ class: "pt-4" },
    }));
    const __VLS_1322 = __VLS_1321({
        ...{ class: "pt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1321));
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    const { default: __VLS_1325 } = __VLS_1323.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "agenda-day-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['agenda-day-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "agenda-day-section enterprise-surface pa-4" },
    });
    /** @type {__VLS_StyleScopedClasses['agenda-day-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    if (!__VLS_ctx.agendaDayWeeklyItems.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "agenda-day-list" },
        });
        /** @type {__VLS_StyleScopedClasses['agenda-day-list']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.agendaDayWeeklyItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!!(!__VLS_ctx.agendaDayWeeklyItems.length))
                            return;
                        __VLS_ctx.handleAgendaItemClick(item);
                        // @ts-ignore
                        [handleAgendaItemClick, agendaDayWeeklyItems, agendaDayWeeklyItems,];
                    } },
                key: (item.key),
                type: "button",
                ...{ class: "agenda-day-item agenda-day-item--weekly" },
            });
            /** @type {__VLS_StyleScopedClasses['agenda-day-item']} */ ;
            /** @type {__VLS_StyleScopedClasses['agenda-day-item--weekly']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "agenda-day-item__title" },
            });
            /** @type {__VLS_StyleScopedClasses['agenda-day-item__title']} */ ;
            (item.title);
            if (item.subtitle) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "agenda-day-item__subtitle" },
                });
                /** @type {__VLS_StyleScopedClasses['agenda-day-item__subtitle']} */ ;
                (item.subtitle);
            }
            // @ts-ignore
            [];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "agenda-day-section enterprise-surface pa-4" },
    });
    /** @type {__VLS_StyleScopedClasses['agenda-day-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_1326;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_1327 = __VLS_asFunctionalComponent1(__VLS_1326, new __VLS_1326({
        color: "secondary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_1328 = __VLS_1327({
        color: "secondary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1327));
    const { default: __VLS_1331 } = __VLS_1329.slots;
    (__VLS_ctx.agendaDayMonthlyHoursLabel);
    // @ts-ignore
    [agendaDayMonthlyHoursLabel,];
    var __VLS_1329;
    if (!__VLS_ctx.agendaDayMonthlyItems.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "agenda-day-list" },
        });
        /** @type {__VLS_StyleScopedClasses['agenda-day-list']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.agendaDayMonthlyItems))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!!(!__VLS_ctx.agendaDayMonthlyItems.length))
                            return;
                        __VLS_ctx.handleAgendaItemClick(item);
                        // @ts-ignore
                        [handleAgendaItemClick, agendaDayMonthlyItems, agendaDayMonthlyItems,];
                    } },
                key: (item.key),
                type: "button",
                ...{ class: "agenda-day-item agenda-day-item--monthly" },
            });
            /** @type {__VLS_StyleScopedClasses['agenda-day-item']} */ ;
            /** @type {__VLS_StyleScopedClasses['agenda-day-item--monthly']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "agenda-day-item__title" },
            });
            /** @type {__VLS_StyleScopedClasses['agenda-day-item__title']} */ ;
            (item.title);
            if (item.subtitle) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "agenda-day-item__subtitle" },
                });
                /** @type {__VLS_StyleScopedClasses['agenda-day-item__subtitle']} */ ;
                (item.subtitle);
            }
            // @ts-ignore
            [];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "agenda-day-section enterprise-surface pa-4" },
    });
    /** @type {__VLS_StyleScopedClasses['agenda-day-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    if (!__VLS_ctx.agendaDayProgramaciones.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "agenda-day-list" },
        });
        /** @type {__VLS_StyleScopedClasses['agenda-day-list']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.agendaDayProgramaciones))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!!(!__VLS_ctx.agendaDayProgramaciones.length))
                            return;
                        __VLS_ctx.handleAgendaItemClick(item);
                        // @ts-ignore
                        [handleAgendaItemClick, agendaDayProgramaciones, agendaDayProgramaciones,];
                    } },
                key: (item.key),
                type: "button",
                ...{ class: "agenda-day-item agenda-day-item--agenda" },
            });
            /** @type {__VLS_StyleScopedClasses['agenda-day-item']} */ ;
            /** @type {__VLS_StyleScopedClasses['agenda-day-item--agenda']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "agenda-day-item__title" },
            });
            /** @type {__VLS_StyleScopedClasses['agenda-day-item__title']} */ ;
            (item.title);
            if (item.subtitle) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "agenda-day-item__subtitle" },
                });
                /** @type {__VLS_StyleScopedClasses['agenda-day-item__subtitle']} */ ;
                (item.subtitle);
            }
            // @ts-ignore
            [];
        }
    }
    // @ts-ignore
    [];
    var __VLS_1323;
    // @ts-ignore
    [];
    var __VLS_1291;
    // @ts-ignore
    [];
    var __VLS_1285;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

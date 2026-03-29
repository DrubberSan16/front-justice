<template>
  <div class="programaciones-page">
    <v-card rounded="xl" class="pa-4 enterprise-surface">
      <div class="d-flex align-center justify-space-between page-wrap" style="gap: 12px;">
        <div>
          <div class="text-h6 font-weight-bold">Programaciones</div>
          <div class="text-body-2 text-medium-emphasis">
            Consolida programación mensual MPG, cronograma semanal y agenda operativa.
          </div>
        </div>
        <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loadingAll" @click="loadAll">
          Actualizar
        </v-btn>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <v-tabs v-model="activeTab" class="mt-4" color="primary">
        <v-tab value="mensual">Mensual MPG</v-tab>
        <v-tab value="semanal">Semanal</v-tab>
        <v-tab value="agenda">Agenda</v-tab>
      </v-tabs>
    </v-card>

    <v-window v-model="activeTab" class="mt-4" touchless>
      <v-window-item value="mensual">
        <v-card rounded="xl" class="pa-4 enterprise-surface">
          <div class="d-flex align-center justify-space-between page-wrap mb-4" style="gap: 12px;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Calendario mensual importado</div>
              <div class="text-body-2 text-medium-emphasis">
                Carga el Excel mensual MPG y visualiza la matriz por equipo y día.
              </div>
            </div>
            <v-btn color="primary" prepend-icon="mdi-file-excel" :loading="importingMonthly" @click="importMonthlyWorkbook">
              Cargar mensual
            </v-btn>
          </div>

          <v-row dense>
            <v-col cols="12" md="6">
              <v-file-input
                v-model="monthlyImportFile"
                accept=".xlsx,.xls"
                label="Excel mensual MPG"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-file-excel"
                show-size
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedMonthlyId"
                :items="monthlyOptions"
                item-title="title"
                item-value="value"
                label="Calendario importado"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedMonthlyPeriod"
                :items="monthlyPeriodOptions"
                item-title="title"
                item-value="value"
                label="Periodo"
                variant="outlined"
                density="compact"
                clearable
                :disabled="!selectedMonthly"
              />
            </v-col>
          </v-row>

          <div class="summary-strip mt-3">
            <v-chip color="primary" variant="tonal" label>{{ monthlyImports.length }} calendarios</v-chip>
            <v-chip color="secondary" variant="tonal" label>{{ monthlySummary.totalEvents }} eventos</v-chip>
            <v-chip color="success" variant="tonal" label>{{ monthlySummary.syncedEvents }} sincronizados</v-chip>
            <v-chip color="info" variant="tonal" label>{{ monthlySummary.totalEquipments }} equipos</v-chip>
          </div>

          <v-alert
            v-if="monthlyWarnings.length"
            class="mt-4"
            type="warning"
            variant="tonal"
            :text="monthlyWarnings.join(' · ')"
          />

          <div v-if="!selectedMonthly" class="empty-state mt-4">
            <v-icon icon="mdi-calendar-month" size="28" />
            <span>Selecciona un calendario mensual importado para ver la matriz.</span>
          </div>

          <template v-else>
            <div class="text-body-2 text-medium-emphasis mt-4">
              {{ selectedMonthly.codigo }} ·
              {{ selectedMonthly.nombre_archivo || selectedMonthly.documento_origen || "Sin archivo" }}
            </div>

            <div class="matrix-wrap mt-4">
              <table class="matrix-table matrix-table--monthly">
                <thead>
                  <tr>
                    <th class="matrix-table__sticky">Equipo</th>
                    <th class="matrix-table__sticky-2">Nombre</th>
                    <th>Hor. último</th>
                    <th>Hor. actual</th>
                    <th v-for="day in monthlyDays" :key="`day-${day.key}`">
                      <div>{{ day.day }}</div>
                      <div class="text-caption text-medium-emphasis">{{ day.label }}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in monthlyMatrixRows" :key="row.key">
                    <td class="matrix-table__sticky font-weight-bold">{{ row.equipo_codigo }}</td>
                    <td class="matrix-table__sticky-2">{{ row.equipo_nombre || "Sin nombre" }}</td>
                    <td>{{ row.horometro_ultimo ?? "N/D" }}</td>
                    <td>{{ row.horometro_actual ?? "N/D" }}</td>
                    <td v-for="day in monthlyDays" :key="`${row.key}-${day.key}`">
                      <div v-if="row.cells[day.date]?.length" class="matrix-cell">
                        <v-chip
                          v-for="item in row.cells[day.date]"
                          :key="item.id"
                          size="x-small"
                          :color="monthlyCellColor(item)"
                          variant="tonal"
                          class="mb-1"
                        >
                          {{ item.valor_crudo }}
                        </v-chip>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <v-data-table class="enterprise-table mt-5" :headers="monthlyDetailHeaders" :items="monthlyFilteredDetails" :items-per-page="12">
              <template #item.valor_crudo="{ item }">
                <v-chip size="small" :color="monthlyCellColor(item as any)" variant="tonal">
                  {{ (item as any).valor_crudo }}
                </v-chip>
              </template>
              <template #item.programacion_id="{ item }">
                <v-chip size="small" :color="(item as any).programacion_id ? 'success' : 'secondary'" variant="tonal">
                  {{ (item as any).programacion_id ? "Sincronizado" : "Solo reporte" }}
                </v-chip>
              </template>
            </v-data-table>
          </template>
        </v-card>
      </v-window-item>

      <v-window-item value="semanal">
        <v-card rounded="xl" class="pa-4 enterprise-surface">
          <div class="d-flex align-center justify-space-between page-wrap mb-4" style="gap: 12px;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Cronograma semanal</div>
              <div class="text-body-2 text-medium-emphasis">
                Carga el Excel semanal y visualiza la parrilla por día y bloque horario.
              </div>
            </div>
            <v-btn color="primary" prepend-icon="mdi-file-excel" :loading="importingWeekly" @click="importWeeklyWorkbook">
              Cargar semanal
            </v-btn>
          </div>

          <v-row dense>
            <v-col cols="12" md="6">
              <v-file-input
                v-model="weeklyImportFile"
                accept=".xlsx,.xls"
                label="Excel cronograma semanal"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-calendar-week"
                show-size
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="selectedWeeklyId"
                :items="weeklyOptions"
                item-title="title"
                item-value="value"
                label="Cronograma semanal"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
          </v-row>

          <div class="summary-strip mt-3">
            <v-chip color="primary" variant="tonal" label>{{ weeklySchedules.length }} cronogramas</v-chip>
            <v-chip v-for="day in weeklyDailyHours" :key="day.date" color="secondary" variant="tonal" label>
              {{ day.label }}: {{ day.hours.toFixed(2) }} h
            </v-chip>
          </div>

          <v-alert
            v-if="weeklyWarnings.length"
            class="mt-4"
            type="warning"
            variant="tonal"
            :text="weeklyWarnings.join(' · ')"
          />

          <div v-if="!selectedWeekly" class="empty-state mt-4">
            <v-icon icon="mdi-calendar-week" size="28" />
            <span>Selecciona un cronograma semanal para ver su reporte.</span>
          </div>

          <template v-else>
            <div class="text-body-2 text-medium-emphasis mt-4">
              {{ selectedWeekly.codigo }} · {{ selectedWeekly.fecha_inicio }} / {{ selectedWeekly.fecha_fin }}
            </div>

            <div class="matrix-wrap mt-4">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th class="matrix-table__sticky">Hora</th>
                    <th v-for="day in weeklyDays" :key="day.date">
                      <div>{{ day.title }}</div>
                      <div class="text-caption text-medium-emphasis">{{ day.date }}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="slot in weeklyTimeSlots" :key="slot.key">
                    <td class="matrix-table__sticky font-weight-bold">{{ slot.label }}</td>
                    <td v-for="day in weeklyDays" :key="`${slot.key}-${day.date}`">
                      <div v-if="weeklyGrid[slot.key]?.[day.date]?.length" class="matrix-cell matrix-cell--weekly">
                        <div v-for="item in getWeeklyItems(slot.key, day.date)" :key="item.id" class="weekly-activity">
                          <div class="weekly-activity__title">{{ item.actividad }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ item.tipo_proceso || "OPERACION" }}
                            <span v-if="item.equipo_codigo"> · {{ item.equipo_codigo }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <v-data-table class="enterprise-table mt-5" :headers="weeklyDetailHeaders" :items="selectedWeekly.detalles || []" :items-per-page="12" />
          </template>
        </v-card>
      </v-window-item>

      <v-window-item value="agenda">
        <v-card rounded="xl" class="pa-4 enterprise-surface">
          <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
            <div>
              <div class="text-h6 font-weight-bold">Agenda de programaciones</div>
              <div class="text-body-2 text-medium-emphasis">
                Programa manualmente mantenimientos y controla vencimientos por fecha u horas.
              </div>
            </div>
            <div class="d-flex align-center" style="gap: 8px;">
              <v-btn icon="mdi-chevron-left" variant="text" @click="changeMonth(-1)" />
              <div class="text-subtitle-1 font-weight-bold" style="min-width: 220px; text-align: center;">
                {{ monthLabel }}
              </div>
              <v-btn icon="mdi-chevron-right" variant="text" @click="changeMonth(1)" />
            </div>
          </div>

          <div class="calendar-grid mb-4">
            <div v-for="day in weekDays" :key="day" class="calendar-weekday">{{ day }}</div>
            <div
              v-for="cell in monthCells"
              :key="cell.key"
              class="calendar-cell"
              :class="{ 'calendar-cell--muted': !cell.inCurrentMonth, 'calendar-cell--today': cell.isToday }"
              @click="openCreateForDate(cell.date)"
            >
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-caption font-weight-bold">{{ cell.day }}</span>
                <v-chip v-if="eventsByDate[cell.date]?.length" size="x-small" color="primary" variant="tonal">
                  {{ eventsByDate[cell.date]?.length ?? 0 }}
                </v-chip>
              </div>
              <div class="calendar-events">
                <button
                  v-for="event in (eventsByDate[cell.date] || []).slice(0, 3)"
                  :key="event.id"
                  class="calendar-event"
                  :class="eventClass(event.estado_programacion)"
                  @click.stop="openEdit(event)"
                >
                  {{ event.equipo_nombre }} - {{ displayProgramacionName(event) }}
                </button>
                <div v-if="(eventsByDate[cell.date] || []).length > 3" class="text-caption text-medium-emphasis mt-1">
                  +{{ (eventsByDate[cell.date]?.length ?? 0) - 3 }} más
                </div>
              </div>
            </div>
          </div>

          <v-divider class="mb-3" />

          <v-data-table :headers="agendaHeaders" :items="agendaRows" :loading="agendaLoading" :items-per-page="10" class="elevation-0 enterprise-table">
            <template #item.procedimiento_nombre="{ item }">
              <div class="font-weight-medium">{{ displayProgramacionName(item as any) }}</div>
              <div class="text-caption text-medium-emphasis">{{ (item as any).plan_codigo || (item as any).plan_nombre || "Plan interno" }}</div>
            </template>
            <template #item.estado_programacion="{ item }">
              <v-chip size="small" :color="chipColor((item as any).estado_programacion)" variant="tonal">
                {{ (item as any).estado_programacion }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex" style="gap: 4px;">
                <v-btn icon="mdi-pencil" variant="text" @click="openEdit(item as any)" />
                <v-btn icon="mdi-delete" variant="text" color="error" @click="remove(item as any)" />
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <v-dialog v-model="dialog" max-width="760">
      <v-card rounded="xl">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ editingId ? "Editar programación" : "Nueva programación" }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.proxima_fecha" type="date" label="Fecha programada" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-checkbox v-model="form.activo" label="Activo" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.equipo_id" :items="equipmentOptions" item-title="title" item-value="value" label="Equipo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.procedimiento_id"
                :items="procedureOptions"
                item-title="title"
                item-value="value"
                label="Plantilla MPG"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-alert type="info" variant="tonal" text="El sistema sincroniza automáticamente un plan interno desde la plantilla MPG seleccionada." />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="resolvedPlanLabel" label="Plan operativo generado" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="selectedProcedureFrequency" label="Frecuencia de plantilla" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.ultima_ejecucion_fecha" type="date" label="Última ejecución fecha" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.ultima_ejecucion_horas" type="number" step="0.01" label="Última ejecución horas" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.proxima_horas" type="number" step="0.01" label="Próxima ejecución horas" variant="outlined" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";

const ui = useUiStore();

const activeTab = ref("mensual");
const loadingAll = ref(false);
const agendaLoading = ref(false);
const saving = ref(false);
const importingMonthly = ref(false);
const importingWeekly = ref(false);
const error = ref<string | null>(null);

const agendaRows = ref<any[]>([]);
const monthlyImports = ref<any[]>([]);
const weeklySchedules = ref<any[]>([]);
const selectedMonthly = ref<any | null>(null);
const selectedWeekly = ref<any | null>(null);
const selectedMonthlyId = ref<string | null>(null);
const selectedWeeklyId = ref<string | null>(null);
const selectedMonthlyPeriod = ref<string | null>(null);
const monthlyImportFile = ref<File | null>(null);
const weeklyImportFile = ref<File | null>(null);
const monthlyWarnings = ref<string[]>([]);
const weeklyWarnings = ref<string[]>([]);

const dialog = ref(false);
const editingId = ref<string | null>(null);
const equipmentOptions = ref<any[]>([]);
const procedureOptions = ref<any[]>([]);
const procedureCatalog = ref<any[]>([]);
const currentMonth = ref(new Date());

const form = reactive<any>({
  equipo_id: "",
  procedimiento_id: "",
  plan_id: "",
  ultima_ejecucion_fecha: "",
  ultima_ejecucion_horas: "",
  proxima_fecha: "",
  proxima_horas: "",
  activo: true,
});

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
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
  { title: "Nombre", key: "equipo_nombre" },
  { title: "Actividad", key: "valor_crudo" },
  { title: "Tipo", key: "tipo_mantenimiento" },
  { title: "Plan", key: "plan_id" },
  { title: "Estado", key: "programacion_id" },
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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfCalendarMonth(source: Date) {
  const date = new Date(source.getFullYear(), source.getMonth(), 1);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

async function listAll(endpoint: string) {
  const out: any[] = [];
  const limit = 100;
  for (let page = 1; page <= 100; page += 1) {
    const { data } = await api.get(endpoint, { params: { page, limit } });
    const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    out.push(...rows);
    if (rows.length < limit) break;
  }
  return out;
}

function normalize(item: any) {
  const label = item?.nombre ?? item?.title ?? item?.codigo ?? item?.id;
  return { value: item.id, title: `${item?.codigo ? `${item.codigo} - ` : ""}${label}` };
}

async function loadCatalogs() {
  const [equipos, procedimientos] = await Promise.all([
    listAll("/kpi_maintenance/equipos"),
    listAll("/kpi_maintenance/inteligencia/procedimientos"),
  ]);
  equipmentOptions.value = equipos.map(normalize);
  procedureCatalog.value = procedimientos;
  procedureOptions.value = procedimientos.map(normalize);
}

async function loadAgendaRows() {
  agendaLoading.value = true;
  try {
    const { data } = await api.get("/kpi_maintenance/programaciones");
    agendaRows.value = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  } finally {
    agendaLoading.value = false;
  }
}

async function loadMonthlyImports() {
  const { data } = await api.get("/kpi_maintenance/programaciones/mensuales");
  monthlyImports.value = Array.isArray(data?.data) ? data.data : [];
  if (!selectedMonthlyId.value && monthlyImports.value.length) {
    selectedMonthlyId.value = monthlyImports.value[0]?.id ?? null;
  }
}

async function loadWeeklySchedules() {
  const { data } = await api.get("/kpi_maintenance/inteligencia/cronogramas-semanales");
  weeklySchedules.value = Array.isArray(data?.data) ? data.data : [];
  if (!selectedWeeklyId.value && weeklySchedules.value.length) {
    selectedWeeklyId.value = weeklySchedules.value[0]?.id ?? null;
  }
}

async function loadAll() {
  loadingAll.value = true;
  error.value = null;
  try {
    await Promise.all([loadCatalogs(), loadAgendaRows(), loadMonthlyImports(), loadWeeklySchedules()]);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar el módulo de programaciones.";
  } finally {
    loadingAll.value = false;
  }
}

async function loadSelectedMonthly(id: string | null) {
  selectedMonthly.value = null;
  monthlyWarnings.value = [];
  if (!id) return;
  try {
    const { data } = await api.get(`/kpi_maintenance/programaciones/mensuales/${id}`);
    selectedMonthly.value = data?.data ?? null;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo cargar el calendario mensual.");
  }
}

async function loadSelectedWeekly(id: string | null) {
  selectedWeekly.value = null;
  weeklyWarnings.value = [];
  if (!id) return;
  try {
    const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${id}`);
    selectedWeekly.value = data?.data ?? null;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo cargar el cronograma semanal.");
  }
}

watch(selectedMonthlyId, async (value) => {
  await loadSelectedMonthly(value);
});

watch(selectedWeeklyId, async (value) => {
  await loadSelectedWeekly(value);
});

watch(
  () => selectedMonthly.value?.periodos,
  (periods) => {
    const current = selectedMonthlyPeriod.value;
    const available = Array.isArray(periods) ? periods.map((item: any) => item.period) : [];
    if (current && available.includes(current)) return;
    selectedMonthlyPeriod.value = available[available.length - 1] ?? null;
  },
  { immediate: true },
);

const monthlyOptions = computed(() =>
  monthlyImports.value.map((item) => ({
    value: item.id,
    title: `${item.codigo || "Sin código"} · ${item.nombre_archivo || item.documento_origen || "Sin archivo"}`,
  })),
);

const weeklyOptions = computed(() =>
  weeklySchedules.value.map((item) => ({
    value: item.id,
    title: `${item.codigo || "Sin código"} · ${item.fecha_inicio || ""} / ${item.fecha_fin || ""}`,
  })),
);

const monthlyPeriodOptions = computed(() =>
  Array.isArray(selectedMonthly.value?.periodos)
    ? selectedMonthly.value.periodos.map((item: any) => ({
        value: item.period,
        title: `${item.label || item.period} (${item.total})`,
      }))
    : [],
);

const monthlyFilteredDetails = computed(() => {
  const details = Array.isArray(selectedMonthly.value?.detalles) ? selectedMonthly.value.detalles : [];
  if (!selectedMonthlyPeriod.value) return details;
  return details.filter((item: any) => String(item.fecha_programada || "").startsWith(selectedMonthlyPeriod.value || ""));
});

const monthlyDays = computed(() => {
  if (!selectedMonthlyPeriod.value) return [];
  const [year, month] = String(selectedMonthlyPeriod.value).split("-").map(Number);
  if (!year || !month) return [];
  const lastDay = new Date(year, month, 0).getDate();
  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = `${selectedMonthlyPeriod.value}-${String(day).padStart(2, "0")}`;
    const label = new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "short" });
    return { key: date, date, day, label };
  });
});

const monthlyMatrixRows = computed(() => {
  const rows = new Map<string, any>();
  for (const item of monthlyFilteredDetails.value) {
    const key = String(item.equipo_id || item.equipo_codigo || item.id);
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        equipo_codigo: item.equipo_codigo,
        equipo_nombre: item.equipo_nombre,
        horometro_ultimo: item.payload_json?.horometro_ultimo ?? null,
        horometro_actual: item.payload_json?.horometro_actual ?? null,
        cells: {} as Record<string, any[]>,
      });
    }
    const row = rows.get(key);
    row.horometro_ultimo ??= item.payload_json?.horometro_ultimo ?? null;
    row.horometro_actual ??= item.payload_json?.horometro_actual ?? null;
    row.cells[item.fecha_programada] = row.cells[item.fecha_programada] || [];
    row.cells[item.fecha_programada].push(item);
  }
  return [...rows.values()].sort((a, b) =>
    String(a.equipo_codigo || "").localeCompare(String(b.equipo_codigo || "")),
  );
});

const monthlySummary = computed(() => {
  const details = monthlyFilteredDetails.value;
  return {
    totalEvents: details.length,
    syncedEvents: details.filter((item: any) => Boolean(item.programacion_id)).length,
    totalEquipments: new Set(details.map((item: any) => String(item.equipo_codigo || item.equipo_id || ""))).size,
  };
});

const weeklyDays = computed(() => {
  if (!selectedWeekly.value?.fecha_inicio || !selectedWeekly.value?.fecha_fin) return [];
  const start = new Date(`${selectedWeekly.value.fecha_inicio}T00:00:00`);
  const end = new Date(`${selectedWeekly.value.fecha_fin}T00:00:00`);
  const days: Array<{ date: string; title: string }> = [];
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
  if (slots.length) return slots;
  const details = Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles : [];
  return [...new Set(details.map((item: any) => `${item.hora_inicio || ""}-${item.hora_fin || ""}`))]
    .filter(Boolean)
    .map((key) => {
      const slotKey = String(key);
      const [hora_inicio = "", hora_fin = ""] = slotKey.split("-");
      return { key: slotKey, label: `${hora_inicio.slice(0, 5)} - ${hora_fin.slice(0, 5)}` };
    });
});

const weeklyGrid = computed(() => {
  const grid: Record<string, Record<string, any[]>> = {};
  const details = Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles : [];
  for (const item of details) {
    const slotKey = `${item.hora_inicio || ""}-${item.hora_fin || ""}`;
    const dateKey = String(item.fecha_actividad || "");
    if (!grid[slotKey]) grid[slotKey] = {};
    if (!grid[slotKey][dateKey]) grid[slotKey][dateKey] = [];
    grid[slotKey][dateKey].push(item);
  }
  return grid;
});

const weeklyDailyHours = computed(() => {
  const source = selectedWeekly.value?.daily_hours || {};
  return Object.entries(source).map(([date, hours]) => ({
    date,
    hours: Number(hours || 0),
    label: new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "short", day: "2-digit" }),
  }));
});

const monthLabel = computed(() =>
  currentMonth.value.toLocaleDateString("es-EC", { month: "long", year: "numeric" }),
);

const monthCells = computed(() => {
  const start = startOfCalendarMonth(currentMonth.value);
  const out: Array<{ key: string; date: string; day: number; inCurrentMonth: boolean; isToday: boolean }> = [];
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

const eventsByDate = computed(() =>
  agendaRows.value.reduce((acc: Record<string, any[]>, row) => {
    const key = row?.proxima_fecha;
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {}),
);

function chipColor(status: string) {
  if (status === "VENCIDA") return "error";
  if (status === "PROXIMA") return "warning";
  return "primary";
}

function eventClass(status: string) {
  if (status === "VENCIDA") return "calendar-event--danger";
  if (status === "PROXIMA") return "calendar-event--warning";
  return "calendar-event--normal";
}

function monthlyCellColor(item: any) {
  if (item?.programacion_id) return "success";
  if (String(item?.tipo_mantenimiento || "").toUpperCase() === "MPG") return "primary";
  return "secondary";
}

function getWeeklyItems(slotKey: string, date: string) {
  return weeklyGrid.value[slotKey]?.[date] || [];
}

function displayProgramacionName(item: any) {
  return item?.procedimiento_nombre || item?.plan_nombre || "Sin plantilla";
}

const selectedProcedure = computed(() =>
  procedureCatalog.value.find((item) => String(item.id) === String(form.procedimiento_id || "")) ?? null,
);

const resolvedPlanLabel = computed(() => {
  if (form.plan_id) return form.plan_id;
  if (!selectedProcedure.value) return "Se generará al guardar";
  return `Sincronizado desde ${selectedProcedure.value.codigo || selectedProcedure.value.nombre || "plantilla MPG"}`;
});

const selectedProcedureFrequency = computed(() => {
  const frequency = Number(selectedProcedure.value?.frecuencia_horas || 0);
  return frequency > 0 ? `${frequency} horas` : "Según configuración de plantilla";
});

function resetForm() {
  editingId.value = null;
  form.equipo_id = "";
  form.procedimiento_id = "";
  form.plan_id = "";
  form.ultima_ejecucion_fecha = "";
  form.ultima_ejecucion_horas = "";
  form.proxima_fecha = "";
  form.proxima_horas = "";
  form.activo = true;
}

function openCreateForDate(date: string) {
  resetForm();
  form.proxima_fecha = date;
  dialog.value = true;
}

function openEdit(item: any) {
  editingId.value = item.id;
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

function buildPayload() {
  return {
    equipo_id: form.equipo_id,
    procedimiento_id: form.procedimiento_id || undefined,
    ultima_ejecucion_fecha: form.ultima_ejecucion_fecha || undefined,
    ultima_ejecucion_horas: form.ultima_ejecucion_horas !== "" ? Number(form.ultima_ejecucion_horas) : undefined,
    proxima_fecha: form.proxima_fecha || undefined,
    proxima_horas: form.proxima_horas !== "" ? Number(form.proxima_horas) : undefined,
    activo: !!form.activo,
  };
}

function resolveSingleFile(value: File | File[] | null) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function save() {
  if (!form.equipo_id || !form.procedimiento_id) {
    ui.error("Debes seleccionar equipo y plantilla MPG.");
    return;
  }
  saving.value = true;
  try {
    let saved: any = null;
    if (editingId.value) {
      const { data } = await api.patch(`/kpi_maintenance/programaciones/${editingId.value}`, buildPayload());
      saved = data?.data ?? data;
      ui.success("Programación actualizada.");
    } else {
      const { data } = await api.post("/kpi_maintenance/programaciones", buildPayload());
      saved = data?.data ?? data;
      ui.success("Programación creada.");
    }

    form.plan_id = saved?.plan_id || form.plan_id;
    dialog.value = false;
    await loadAgendaRows();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar la programación.");
  } finally {
    saving.value = false;
  }
}

async function remove(item: any) {
  try {
    await api.delete(`/kpi_maintenance/programaciones/${item.id}`);
    ui.success("Programación eliminada.");
    await loadAgendaRows();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar la programación.");
  }
}

async function importMonthlyWorkbook() {
  const file = resolveSingleFile(monthlyImportFile.value as File | File[] | null);
  if (!file) {
    ui.error("Selecciona el archivo Excel mensual.");
    return;
  }
  importingMonthly.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/kpi_maintenance/programaciones/import/mensual/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    monthlyWarnings.value = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
    ui.success("Programación mensual importada.");
    monthlyImportFile.value = null;
    await Promise.all([loadMonthlyImports(), loadAgendaRows()]);
    if (data?.data?.id) {
      selectedMonthlyId.value = data.data.id;
      await loadSelectedMonthly(data.data.id);
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo importar el Excel mensual.");
  } finally {
    importingMonthly.value = false;
  }
}

async function importWeeklyWorkbook() {
  const file = resolveSingleFile(weeklyImportFile.value as File | File[] | null);
  if (!file) {
    ui.error("Selecciona el archivo Excel semanal.");
    return;
  }
  importingWeekly.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/kpi_maintenance/inteligencia/cronogramas-semanales/import/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    weeklyWarnings.value = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
    ui.success("Cronograma semanal importado.");
    weeklyImportFile.value = null;
    await loadWeeklySchedules();
    const cronograma = data?.data?.cronograma;
    if (cronograma?.id) {
      selectedWeeklyId.value = cronograma.id;
      selectedWeekly.value = cronograma;
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo importar el Excel semanal.");
  } finally {
    importingWeekly.value = false;
  }
}

function changeMonth(offset: number) {
  const next = new Date(currentMonth.value);
  next.setMonth(next.getMonth() + offset);
  currentMonth.value = next;
}

onMounted(async () => {
  await loadAll();
});
</script>

<style scoped>
.programaciones-page { display: grid; gap: 20px; }
.page-wrap { flex-wrap: wrap; }
.summary-strip { display: flex; flex-wrap: wrap; gap: 8px; }
.empty-state {
  min-height: 180px; border-radius: 22px; border: 1px dashed var(--surface-border);
  background: rgba(31, 75, 122, 0.05); display: grid; place-items: center;
  gap: 10px; padding: 24px; text-align: center; color: rgba(26, 34, 43, 0.72);
}
.matrix-wrap { overflow: auto; border: 1px solid var(--surface-border); border-radius: 22px; }
.matrix-table { border-collapse: separate; border-spacing: 0; min-width: 1100px; width: max-content; background: white; }
.matrix-table th, .matrix-table td {
  border-right: 1px solid rgba(17, 35, 58, 0.08); border-bottom: 1px solid rgba(17, 35, 58, 0.08);
  padding: 10px; vertical-align: top; min-width: 110px;
}
.matrix-table th { position: sticky; top: 0; z-index: 3; background: #f6f8fb; font-size: 0.82rem; }
.matrix-table__sticky { position: sticky; left: 0; z-index: 2; background: #fbfcfe; min-width: 110px; }
.matrix-table__sticky-2 { position: sticky; left: 110px; z-index: 2; background: #fbfcfe; min-width: 180px; }
.matrix-cell { display: flex; flex-wrap: wrap; gap: 6px; min-height: 44px; }
.matrix-cell--weekly { min-width: 180px; display: grid; gap: 8px; }
.weekly-activity { padding: 8px; border-radius: 12px; background: rgba(31, 75, 122, 0.06); white-space: pre-line; }
.weekly-activity__title { font-size: 0.8rem; font-weight: 600; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.calendar-weekday { font-size: 0.8rem; font-weight: 700; color: rgba(0, 0, 0, 0.65); text-align: center; }
.calendar-cell { min-height: 150px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 18px; padding: 10px; background: white; cursor: pointer; }
.calendar-cell--muted { opacity: 0.55; }
.calendar-cell--today { border-color: rgba(25, 118, 210, 0.45); box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.15); }
.calendar-events { display: flex; flex-direction: column; gap: 6px; }
.calendar-event { width: 100%; text-align: left; border: none; border-radius: 12px; padding: 8px; font-size: 0.75rem; cursor: pointer; }
.calendar-event--normal { background: rgba(25, 118, 210, 0.08); }
.calendar-event--warning { background: rgba(251, 140, 0, 0.12); }
.calendar-event--danger { background: rgba(211, 47, 47, 0.12); }
@media (max-width: 960px) {
  .calendar-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .calendar-weekday { display: none; }
}
</style>

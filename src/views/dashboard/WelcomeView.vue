<template>
  <v-container fluid class="welcome-page">
    <v-row align="stretch" class="mb-4">
      <v-col cols="12" xl="8">
        <v-card rounded="xl" class="welcome-hero enterprise-surface">
          <div class="welcome-hero__aurora welcome-hero__aurora--left" />
          <div class="welcome-hero__aurora welcome-hero__aurora--right" />

          <div class="welcome-hero__content">
            <div class="welcome-hero__copy">
              <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-calendar-week">
                Agenda operativa
              </v-chip>

              <div class="text-h4 font-weight-bold mt-4">
                Bienvenido, {{ displayName }}
              </div>
             

              <div class="welcome-hero__actions">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-refresh"
                  variant="flat"
                  :loading="loading"
                  @click="loadSchedules"
                >
                  Actualizar agenda
                </v-btn>
                <v-btn
                  v-if="canReadProgramming"
                  color="secondary"
                  prepend-icon="mdi-calendar-month-outline"
                  variant="tonal"
                  @click="router.push({ name: 'programaciones' })"
                >
                  Ver programaciones
                </v-btn>
                <v-btn
                  v-if="canReadDashboard"
                  color="secondary"
                  prepend-icon="mdi-view-dashboard-outline"
                  variant="text"
                  @click="router.push({ name: 'dashboard' })"
                >
                  Ir al dashboard
                </v-btn>
              </div>

              <div class="welcome-hero__preview">
                <div class="welcome-hero__preview-label">Resumen inmediato</div>

                <div v-if="heroPreviewDays.length" class="welcome-preview-grid">
                  <button
                    v-for="item in heroPreviewDays"
                    :key="item.date"
                    type="button"
                    class="welcome-preview-card"
                    @click="openDay(item.date)"
                  >
                    <span class="welcome-preview-card__date">{{ item.shortLabel }}</span>
                    <strong class="welcome-preview-card__value">{{ item.count }} actividades</strong>
                    <span class="welcome-preview-card__meta">{{ item.hoursLabel }}</span>
                  </button>
                </div>

                <div v-else class="welcome-hero__empty">
                  No hay dias activos en el periodo seleccionado.
                </div>
              </div>
            </div>

            <div class="welcome-hero__stats">
              <div v-for="card in heroStats" :key="card.key" class="welcome-stat">
                <div class="welcome-stat__label">{{ card.label }}</div>
                <div class="welcome-stat__value">{{ card.value }}</div>
                <div class="welcome-stat__helper">{{ card.helper }}</div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between" style="gap: 12px; flex-wrap: wrap;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Periodo visible</div>
              <div class="text-body-2 text-medium-emphasis">
                Ajusta el calendario para revisar otra agenda.
              </div>
            </div>
            <v-chip color="info" variant="tonal" label>
              {{ selectedPeriodLabel }}
            </v-chip>
          </div>

          <div class="welcome-toolbar mt-4">
            <v-select
              v-model="selectedYear"
              :items="yearOptions"
              label="Anio"
              density="comfortable"
              hide-details
              variant="outlined"
            />
            <v-select
              v-model="selectedMonth"
              :items="monthOptions"
              item-title="title"
              item-value="value"
              label="Mes"
              density="comfortable"
              hide-details
              variant="outlined"
            />
          </div>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 font-weight-bold mb-3" v-if="false">Proximas actividades</div>

          <LoadingTableState
            v-if="loading"
            message="Cargando agenda semanal..."
            :rows="4"
            :columns="2"
          />

          <div v-if="false" class="timeline-list">
            <button
              v-for="item in upcomingActivities"
              :key="item.id"
              type="button"
              class="timeline-item"
              @click="openDay(item.date)"
            >
              <div class="timeline-item__time">
                <span>{{ item.dateLabel }}</span>
                <strong>{{ item.timeLabel }}</strong>
              </div>
              <div class="timeline-item__body">
                <div class="timeline-item__title">{{ item.activity }}</div>
                <div class="timeline-item__meta">
                  {{ item.equipmentLabel }}
                  <span v-if="item.scheduleCode">· {{ item.scheduleCode }}</span>
                </div>
              </div>
            </button>
          </div>

          <div v-if="false" class="welcome-empty welcome-empty--tight">
            <v-icon icon="mdi-calendar-remove-outline" size="26" />
            <div>No hay actividades semanales registradas para este periodo.</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <div v-if="error" class="text-body-2 text-error mb-4">
      {{ error }}
    </div>

    <v-card rounded="xl" class="pa-5 enterprise-surface">
      <div class="d-flex align-center justify-space-between" style="gap: 12px; flex-wrap: wrap;">
        <div>
          <div class="text-h6 font-weight-bold">Calendario de agenda semanal</div>
          <div class="text-body-2 text-medium-emphasis">
            Vista solo lectura de las actividades programadas por dia.
          </div>
        </div>
        <div class="summary-strip">
          <v-chip size="small" color="primary" variant="tonal" label>
            {{ monthSummary.schedules }} cronogramas
          </v-chip>
          <v-chip size="small" color="success" variant="tonal" label>
            {{ monthSummary.activeDays }} dias activos
          </v-chip>
          <v-chip size="small" color="secondary" variant="tonal" label>
            {{ monthSummary.activities }} actividades
          </v-chip>
          <v-chip size="small" color="info" variant="tonal" label>
            {{ monthSummary.hoursLabel }}
          </v-chip>
        </div>
      </div>

      <LoadingTableState
        v-if="loading"
        class="mt-4"
        message="Armando calendario de actividades..."
        :rows="6"
        :columns="7"
      />

      <div v-else class="calendar-shell mt-4">
        <div class="calendar-weekdays">
          <div v-for="day in weekdayHeaders" :key="day" class="calendar-weekday">
            {{ day }}
          </div>
        </div>

        <div class="calendar-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.date"
            type="button"
            class="calendar-cell"
            :class="{
              'calendar-cell--muted': !cell.isCurrentMonth,
              'calendar-cell--today': cell.isToday,
              'calendar-cell--active': cell.summary.count > 0,
            }"
            @click="openDay(cell.date)"
          >
            <div class="calendar-cell__header">
              <span class="calendar-cell__day">{{ cell.dayNumber }}</span>
              <v-chip
                v-if="cell.summary.count"
                size="x-small"
                color="primary"
                variant="tonal"
                label
              >
                {{ cell.summary.count }} act.
              </v-chip>
            </div>

            <div v-if="cell.summary.count" class="calendar-cell__metrics">
              <span>{{ cell.summary.hoursLabel }}</span>
              <span>{{ cell.summary.scheduleCount }} cron.</span>
            </div>

            <div v-if="cell.summary.count" class="calendar-events">
              <div
                v-for="item in cell.summary.activities.slice(0, 3)"
                :key="item.id"
                class="calendar-event"
              >
                <span class="calendar-event__time">{{ item.timeLabel }}</span>
                <span class="calendar-event__title">{{ item.activity }}</span>
                <span class="calendar-event__meta">{{ item.equipmentLabel }}</span>
              </div>
              <div
                v-if="cell.summary.activities.length > 3"
                class="calendar-events__more"
              >
                +{{ cell.summary.activities.length - 3 }} actividades mas
              </div>
            </div>

            <div v-else class="calendar-cell__empty">
              Sin actividades
            </div>
          </button>
        </div>
      </div>
    </v-card>

    <v-dialog v-model="dayDialog" max-width="900">
      <v-card rounded="xl" class="pa-5 enterprise-surface">
        <div class="d-flex align-center justify-space-between" style="gap: 12px; flex-wrap: wrap;">
          <div>
            <div class="text-h6 font-weight-bold">{{ selectedDayTitle }}</div>
            <div class="text-body-2 text-medium-emphasis">
              Detalle de actividades programadas para este dia.
            </div>
          </div>
          <div class="summary-strip">
            <v-chip size="small" color="primary" variant="tonal" label>
              {{ selectedDaySummary?.count || 0 }} actividades
            </v-chip>
            <v-chip size="small" color="info" variant="tonal" label>
              {{ selectedDaySummary?.hoursLabel || "0.0 h" }}
            </v-chip>
          </div>
        </div>

        <div v-if="selectedDaySummary?.activities.length" class="day-detail-list mt-5">
          <div
            v-for="item in selectedDaySummary.activities"
            :key="item.id"
            class="day-detail-card"
          >
            <div class="day-detail-card__time">
              <span>{{ item.timeLabel }}</span>
              <strong>{{ item.durationLabel }}</strong>
            </div>
            <div class="day-detail-card__body">
              <div class="day-detail-card__title">{{ item.activity }}</div>
              <div class="day-detail-card__meta">
                {{ item.equipmentLabel }}
                <span v-if="item.location">· {{ item.location }}</span>
                <span v-if="item.scheduleCode">· {{ item.scheduleCode }}</span>
              </div>
              <div v-if="item.processType || item.observation" class="day-detail-card__extra">
                <span v-if="item.processType">{{ item.processType }}</span>
                <span v-if="item.observation">· {{ item.observation }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="welcome-empty mt-5">
          <v-icon icon="mdi-calendar-blank-outline" size="28" />
          <div>Ese dia no tiene actividades programadas.</div>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { canReadComponent, getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";

type AnyRow = Record<string, any>;
type ActivityItem = {
  id: string;
  date: string;
  dateLabel: string;
  timeLabel: string;
  durationHours: number;
  durationLabel: string;
  activity: string;
  equipmentLabel: string;
  scheduleCode: string;
  location: string;
  processType: string;
  observation: string;
  startMinutes: number | null;
  endMinutes: number | null;
};

const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

const loading = ref(false);
const error = ref<string | null>(null);
const weeklySchedules = ref<AnyRow[]>([]);
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const selectedDate = ref<string>("");
const dayDialog = ref(false);

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

const yearOptions = Array.from({ length: 21 }, (_, index) => now.getFullYear() - 5 + index).map((value) => ({
  value,
  title: String(value),
}));

const weekdayHeaders = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

const canReadProgramming = computed(() =>
  getPermissionsForAnyComponent(menu.tree, ["Programaciones", "Programacion", "Programacion semanal"]).isReaded,
);
const canReadDashboard = computed(() => canReadComponent(menu.tree, "dashboard"));

const displayName = computed(
  () => auth.user?.nameSurname || auth.user?.nameUser || auth.user?.email || "Usuario",
);

const selectedPeriodLabel = computed(
  () =>
    new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(
      new Date(selectedYear.value, selectedMonth.value - 1, 1),
    ),
);

function unwrap<T>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

function parseDateValue(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimeToMinutes(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw.split("T").pop() || "" : raw;
  const clean = normalized.split(".")[0]?.trim() || "";
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(clean);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatTimeLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "Sin hora";
  const normalized = raw.includes("T") ? raw.split("T").pop() || "" : raw;
  const clean = normalized.split(".")[0]?.trim() || "";
  return clean.slice(0, 5) || clean;
}

function formatDateLabel(value: unknown) {
  const parsed = parseDateValue(value);
  if (!parsed) return "Sin fecha";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function overlapsSelectedMonth(fromValue: unknown, toValue: unknown) {
  const start = parseDateValue(fromValue);
  const end = parseDateValue(toValue || fromValue);
  if (!start && !end) return false;
  const monthStart = new Date(selectedYear.value, selectedMonth.value - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(selectedYear.value, selectedMonth.value, 0, 23, 59, 59, 999);
  const safeStart = start ?? end;
  const safeEnd = end ?? start;
  if (!safeStart || !safeEnd) return false;
  return safeStart <= monthEnd && safeEnd >= monthStart;
}

function isInSelectedMonth(value: unknown) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return (
    parsed.getFullYear() === selectedYear.value &&
    parsed.getMonth() + 1 === selectedMonth.value
  );
}

function buildDurationLabel(hours: number) {
  return `${Number(hours || 0).toFixed(1)} h`;
}

function buildActivity(detail: AnyRow, schedule: AnyRow, index: number): ActivityItem | null {
  const date = String(detail?.fecha_actividad || schedule?.fecha_inicio || "").slice(0, 10);
  if (!date || !isInSelectedMonth(date)) return null;

  const startMinutes = parseTimeToMinutes(detail?.hora_inicio);
  const endMinutes = parseTimeToMinutes(detail?.hora_fin);
  const durationHours =
    startMinutes != null && endMinutes != null && endMinutes > startMinutes
      ? Number(((endMinutes - startMinutes) / 60).toFixed(2))
      : 0;

  return {
    id: String(detail?.id || `${schedule?.id || "schedule"}-${date}-${index}`),
    date,
    dateLabel: formatDateLabel(date),
    timeLabel:
      detail?.hora_inicio || detail?.hora_fin
        ? `${formatTimeLabel(detail?.hora_inicio)} - ${formatTimeLabel(detail?.hora_fin)}`
        : "Sin hora definida",
    durationHours,
    durationLabel: buildDurationLabel(durationHours),
    activity: String(detail?.actividad || "Actividad sin nombre"),
    equipmentLabel: String(detail?.equipo_codigo || detail?.equipo_nombre || "Sin equipo"),
    scheduleCode: String(schedule?.codigo || ""),
    location: String(schedule?.locacion || ""),
    processType: String(detail?.tipo_proceso || ""),
    observation: String(detail?.observacion || ""),
    startMinutes,
    endMinutes,
  };
}

const filteredSchedules = computed(() =>
  weeklySchedules.value.filter((item) =>
    overlapsSelectedMonth(item?.fecha_inicio || item?.created_at, item?.fecha_fin || item?.fecha_inicio),
  ),
);

const monthActivities = computed<ActivityItem[]>(() =>
  filteredSchedules.value
    .flatMap((schedule) =>
      (Array.isArray(schedule?.detalles) ? schedule.detalles : [])
        .map((detail: AnyRow, index: number) => buildActivity(detail, schedule, index))
        .filter((item): item is ActivityItem => Boolean(item)),
    )
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.startMinutes ?? 9999) - (b.startMinutes ?? 9999);
    }),
);

const daySummaries = computed(() => {
  const grouped = new Map<
    string,
    {
      date: string;
      count: number;
      taskHours: number;
      startMinutes: number | null;
      endMinutes: number | null;
      activities: ActivityItem[];
      scheduleCodes: string[];
    }
  >();

  for (const item of monthActivities.value) {
    const current = grouped.get(item.date) ?? {
      date: item.date,
      count: 0,
      taskHours: 0,
      startMinutes: null,
      endMinutes: null,
      activities: [],
      scheduleCodes: [],
    };

    current.count += 1;
    current.taskHours += Number(item.durationHours || 0);
    current.activities.push(item);

    if (item.scheduleCode) current.scheduleCodes.push(item.scheduleCode);
    if (item.startMinutes != null && (current.startMinutes == null || item.startMinutes < current.startMinutes)) {
      current.startMinutes = item.startMinutes;
    }
    if (item.endMinutes != null && (current.endMinutes == null || item.endMinutes > current.endMinutes)) {
      current.endMinutes = item.endMinutes;
    }

    grouped.set(item.date, current);
  }

  return new Map(
    [...grouped.entries()].map(([key, value]) => {
      const intervalHours =
        value.startMinutes != null && value.endMinutes != null && value.endMinutes > value.startMinutes
          ? Number(((value.endMinutes - value.startMinutes) / 60).toFixed(2))
          : Number(value.taskHours.toFixed(2));

      return [
        key,
        {
          ...value,
          totalHours: intervalHours,
          hoursLabel: `${intervalHours.toFixed(1)} h`,
          scheduleCount: [...new Set(value.scheduleCodes)].length,
        },
      ];
    }),
  );
});

const monthSummary = computed(() => {
  const summaries = [...daySummaries.value.values()];
  const totalHours = summaries.reduce((acc, item) => acc + Number(item.totalHours || 0), 0);
  return {
    schedules: filteredSchedules.value.length,
    activeDays: summaries.length,
    activities: monthActivities.value.length,
    totalHours,
    hoursLabel: `${totalHours.toFixed(1)} h`,
  };
});

const heroStats = computed(() => [
  {
    key: "cronogramas",
    label: "Cronogramas del mes",
    value: String(monthSummary.value.schedules),
    helper: selectedPeriodLabel.value,
  },
  {
    key: "dias",
    label: "Dias con agenda",
    value: String(monthSummary.value.activeDays),
    helper: "Solo lectura",
  },
  {
    key: "actividades",
    label: "Actividades",
    value: String(monthSummary.value.activities),
    helper: "Semanal consolidado",
  },
  {
    key: "horas",
    label: "Horas visibles",
    value: monthSummary.value.hoursLabel,
    helper: "Desde hora inicio a hora fin",
  },
]);

const upcomingActivities = computed(() => {
  const currentMonthDate = `${String(selectedYear.value).padStart(4, "0")}-${String(selectedMonth.value).padStart(2, "0")}`;
  const reference =
    currentMonthDate === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      ? now
      : new Date(selectedYear.value, selectedMonth.value - 1, 1, 0, 0, 0, 0);

  return monthActivities.value
    .filter((item) => {
      const parsed = parseDateValue(item.date);
      if (!parsed) return false;
      const compareDate = new Date(parsed);
      if (item.startMinutes != null) {
        compareDate.setHours(Math.floor(item.startMinutes / 60), item.startMinutes % 60, 0, 0);
      }
      return compareDate >= reference;
    })
    .slice(0, 6);
});

const heroPreviewDays = computed(() => {
  const currentMonthDate = `${String(selectedYear.value).padStart(4, "0")}-${String(selectedMonth.value).padStart(2, "0")}`;
  const reference =
    currentMonthDate === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(selectedYear.value, selectedMonth.value - 1, 1, 0, 0, 0, 0);

  const ordered = [...daySummaries.value.values()].sort((a, b) => a.date.localeCompare(b.date));
  const futureOrCurrent = ordered.filter((item) => {
    const parsed = parseDateValue(item.date);
    if (!parsed) return false;
    return parsed >= reference;
  });

  return (futureOrCurrent.length ? futureOrCurrent : ordered).slice(0, 3).map((item) => ({
    ...item,
    shortLabel: new Intl.DateTimeFormat("es-EC", {
      day: "2-digit",
      month: "short",
    }).format(parseDateValue(item.date) ?? new Date()),
  }));
});

const calendarCells = computed(() => {
  const start = new Date(selectedYear.value, selectedMonth.value - 1, 1);
  const end = new Date(selectedYear.value, selectedMonth.value, 0);
  const firstVisible = new Date(start);
  firstVisible.setDate(start.getDate() - start.getDay());
  const lastVisible = new Date(end);
  lastVisible.setDate(end.getDate() + (6 - end.getDay()));

  const cells: Array<{
    date: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    summary: {
      count: number;
      totalHours: number;
      hoursLabel: string;
      scheduleCount: number;
      activities: ActivityItem[];
    };
  }> = [];

  for (let cursor = new Date(firstVisible); cursor <= lastVisible; cursor.setDate(cursor.getDate() + 1)) {
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate(),
    ).padStart(2, "0")}`;
    const summary =
      daySummaries.value.get(date) ??
      {
        count: 0,
        totalHours: 0,
        hoursLabel: "0.0 h",
        scheduleCount: 0,
        activities: [],
      };

    cells.push({
      date,
      dayNumber: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() + 1 === selectedMonth.value,
      isToday:
        cursor.getFullYear() === now.getFullYear() &&
        cursor.getMonth() === now.getMonth() &&
        cursor.getDate() === now.getDate(),
      summary,
    });
  }

  return cells;
});

const selectedDaySummary = computed(() => {
  if (!selectedDate.value) return null;
  return (
    daySummaries.value.get(selectedDate.value) ?? {
      count: 0,
      totalHours: 0,
      hoursLabel: "0.0 h",
      scheduleCount: 0,
      activities: [],
    }
  );
});

const selectedDayTitle = computed(() => formatDateLabel(selectedDate.value || new Date()));

function openDay(date: string) {
  selectedDate.value = date;
  dayDialog.value = true;
}

async function loadSchedules() {
  if (!canReadProgramming.value) {
    weeklySchedules.value = [];
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/cronogramas-semanales");
    weeklySchedules.value = unwrap(data, []);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar la agenda semanal.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadSchedules();
});
</script>

<style scoped>
.welcome-page {
  display: grid;
  gap: 20px;
}

.welcome-hero {
  position: relative;
  overflow: hidden;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(83, 172, 255, 0.12), transparent 34%),
    radial-gradient(circle at bottom right, rgba(33, 208, 165, 0.1), transparent 30%),
    linear-gradient(160deg, rgba(26, 48, 74, 0.94), rgba(39, 64, 92, 0.88));
  color: #eef5fb;
}

.welcome-hero__aurora {
  position: absolute;
  inset: auto;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  filter: blur(22px);
  opacity: 0.16;
  pointer-events: none;
}

.welcome-hero__aurora--left {
  top: -90px;
  left: -70px;
  background: rgba(85, 208, 255, 0.7);
}

.welcome-hero__aurora--right {
  right: -60px;
  bottom: -80px;
  background: rgba(88, 236, 192, 0.7);
}

.welcome-hero__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.95fr);
  gap: 22px;
  align-items: start;
}

.welcome-hero__copy {
  display: grid;
  align-content: start;
  gap: 0;
}

.welcome-hero__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.welcome-hero__preview {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}

.welcome-hero__preview-label {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(238, 245, 251, 0.68);
}

.welcome-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.welcome-preview-card {
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.welcome-preview-card:hover {
  transform: translateY(-1px);
  border-color: rgba(135, 205, 255, 0.28);
  background: rgba(255, 255, 255, 0.09);
}

.welcome-preview-card__date {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.74;
}

.welcome-preview-card__value {
  font-size: 1rem;
  line-height: 1.25;
}

.welcome-preview-card__meta {
  font-size: 0.8rem;
  opacity: 0.82;
}

.welcome-hero__empty {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(238, 245, 251, 0.76);
  font-size: 0.86rem;
}

.welcome-hero__stats {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.welcome-stat {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
}

.welcome-stat__label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.74;
}

.welcome-stat__value {
  margin-top: 10px;
  font-size: 1.8rem;
  font-weight: 700;
}

.welcome-stat__helper {
  margin-top: 8px;
  font-size: 0.84rem;
  opacity: 0.8;
}

.welcome-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.timeline-list {
  display: grid;
  gap: 10px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-soft) 82%, transparent);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.timeline-item:hover {
  transform: translateY(-1px);
  border-color: var(--chart-card-hover-border);
}

.timeline-item__time {
  display: grid;
  gap: 4px;
  color: var(--app-muted-text);
  font-size: 0.84rem;
}

.timeline-item__time strong {
  color: var(--app-text);
  font-size: 0.95rem;
}

.timeline-item__body {
  display: grid;
  gap: 5px;
}

.timeline-item__title {
  font-weight: 700;
}

.timeline-item__meta {
  color: var(--app-muted-text);
  font-size: 0.84rem;
}

.summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-shell {
  display: grid;
  gap: 10px;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.calendar-weekday {
  padding: 0 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--app-muted-text);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.calendar-cell {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 180px;
  width: 100%;
  padding: 12px;
  border-radius: 22px;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-soft) 88%, transparent), transparent),
    var(--surface-base);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.calendar-cell:hover {
  transform: translateY(-1px);
  border-color: var(--chart-card-hover-border);
}

.calendar-cell--muted {
  opacity: 0.48;
}

.calendar-cell--today {
  box-shadow: inset 0 0 0 1px rgba(74, 134, 255, 0.28);
}

.calendar-cell--active {
  background:
    linear-gradient(180deg, rgba(62, 124, 255, 0.08), transparent 56%),
    var(--surface-base);
}

.calendar-cell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.calendar-cell__day {
  font-size: 1rem;
  font-weight: 800;
}

.calendar-cell__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.76rem;
  color: var(--app-muted-text);
}

.calendar-events {
  display: grid;
  gap: 8px;
}

.calendar-event {
  display: grid;
  gap: 3px;
  padding: 9px 10px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-soft) 78%, rgba(58, 124, 255, 0.08));
  border: 1px solid rgba(86, 135, 255, 0.12);
}

.calendar-event__time {
  font-size: 0.72rem;
  color: var(--app-muted-text);
}

.calendar-event__title {
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.28;
}

.calendar-event__meta {
  font-size: 0.74rem;
  color: var(--app-muted-text);
}

.calendar-events__more {
  font-size: 0.76rem;
  color: var(--app-muted-text);
}

.calendar-cell__empty {
  margin-top: auto;
  font-size: 0.78rem;
  color: var(--app-muted-text);
}

.welcome-empty {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 180px;
  padding: 24px;
  border-radius: 22px;
  border: 1px dashed var(--surface-border);
  background: color-mix(in srgb, var(--surface-soft) 84%, transparent);
  text-align: center;
  color: var(--app-muted-text);
}

.welcome-empty--tight {
  min-height: 160px;
}

.day-detail-list {
  display: grid;
  gap: 12px;
}

.day-detail-card {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-soft) 86%, transparent);
}

.day-detail-card__time {
  display: grid;
  gap: 4px;
  color: var(--app-muted-text);
  font-size: 0.85rem;
}

.day-detail-card__time strong {
  font-size: 1rem;
  color: var(--app-text);
}

.day-detail-card__body {
  display: grid;
  gap: 5px;
}

.day-detail-card__title {
  font-size: 1rem;
  font-weight: 700;
}

.day-detail-card__meta,
.day-detail-card__extra {
  color: var(--app-muted-text);
  font-size: 0.84rem;
  line-height: 1.45;
}

.h-100 {
  height: 100%;
}

@media (max-width: 1260px) {
  .welcome-hero__content {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 960px) {
  .calendar-weekdays,
  .calendar-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .calendar-weekday {
    display: none;
  }

  .welcome-toolbar,
  .welcome-hero__stats,
  .welcome-preview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .timeline-item,
  .day-detail-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .welcome-hero {
    padding: 22px;
  }
}
</style>

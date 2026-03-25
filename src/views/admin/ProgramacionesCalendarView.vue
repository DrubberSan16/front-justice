<template>
  <v-card rounded="xl" class="pa-4 enterprise-surface">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
      <div>
        <div class="text-h6 font-weight-bold">Programaciones</div>
        <div class="text-body-2 text-medium-emphasis">
          Selecciona una fecha para programar mantenimientos y controlar vencimientos por fecha u horas.
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

    <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>

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
            {{ eventsByDate[cell.date].length }}
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
            {{ event.equipo_nombre }} · {{ event.plan_nombre }}
          </button>
          <div v-if="(eventsByDate[cell.date] || []).length > 3" class="text-caption text-medium-emphasis mt-1">
            +{{ eventsByDate[cell.date].length - 3 }} más
          </div>
        </div>
      </div>
    </div>

    <v-divider class="mb-3" />

    <v-data-table
      :headers="headers"
      :items="rows"
      :loading="loading"
      :items-per-page="10"
      class="elevation-0 enterprise-table"
    >
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

  <v-dialog v-model="dialog" max-width="720">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        {{ editingId ? 'Editar programación' : 'Nueva programación' }}
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
            <v-select
              v-model="form.equipo_id"
              :items="equipmentOptions"
              item-title="title"
              item-value="value"
              label="Equipo"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.plan_id"
              :items="planOptions"
              item-title="title"
              item-value="value"
              label="Plan"
              variant="outlined"
            />
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
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";

const ui = useUiStore();
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const rows = ref<any[]>([]);
const dialog = ref(false);
const editingId = ref<string | null>(null);
const equipmentOptions = ref<any[]>([]);
const planOptions = ref<any[]>([]);
const currentMonth = ref(new Date());

const form = reactive<any>({
  equipo_id: "",
  plan_id: "",
  ultima_ejecucion_fecha: "",
  ultima_ejecucion_horas: "",
  proxima_fecha: "",
  proxima_horas: "",
  activo: true,
});

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const headers = [
  { title: "Equipo", key: "equipo_nombre" },
  { title: "Plan", key: "plan_nombre" },
  { title: "Fecha", key: "proxima_fecha" },
  { title: "Próx. horas", key: "proxima_horas" },
  { title: "Horas restantes", key: "horas_restantes" },
  { title: "Estado", key: "estado_programacion" },
  { title: "Acciones", key: "actions", sortable: false },
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

const eventsByDate = computed(() => {
  return rows.value.reduce((acc: Record<string, any[]>, row) => {
    const key = row?.proxima_fecha;
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
});

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
  const [equipos, planes] = await Promise.all([
    listAll("/kpi_maintenance/equipos"),
    listAll("/kpi_maintenance/planes"),
  ]);
  equipmentOptions.value = equipos.map(normalize);
  planOptions.value = planes.map(normalize);
}

async function loadRows() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/programaciones");
    rows.value = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar las programaciones.";
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  editingId.value = null;
  form.equipo_id = "";
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
    plan_id: form.plan_id,
    ultima_ejecucion_fecha: form.ultima_ejecucion_fecha || undefined,
    ultima_ejecucion_horas: form.ultima_ejecucion_horas !== "" ? Number(form.ultima_ejecucion_horas) : undefined,
    proxima_fecha: form.proxima_fecha || undefined,
    proxima_horas: form.proxima_horas !== "" ? Number(form.proxima_horas) : undefined,
    activo: !!form.activo,
  };
}

async function save() {
  if (!form.equipo_id || !form.plan_id) {
    ui.error("Debes seleccionar equipo y plan.");
    return;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      await api.patch(`/kpi_maintenance/programaciones/${editingId.value}`, buildPayload());
      ui.success("Programación actualizada.");
    } else {
      await api.post("/kpi_maintenance/programaciones", buildPayload());
      ui.success("Programación creada.");
    }
    dialog.value = false;
    await loadRows();
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
    await loadRows();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar la programación.");
  }
}

function changeMonth(offset: number) {
  const next = new Date(currentMonth.value);
  next.setMonth(next.getMonth() + offset);
  currentMonth.value = next;
}

onMounted(async () => {
  await Promise.all([loadCatalogs(), loadRows()]);
});
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}
.calendar-weekday {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.65);
  text-align: center;
}
.calendar-cell {
  min-height: 150px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  padding: 10px;
  background: white;
  cursor: pointer;
}
.calendar-cell--muted {
  opacity: 0.55;
}
.calendar-cell--today {
  border-color: rgba(25, 118, 210, 0.45);
  box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.15);
}
.calendar-events {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.calendar-event {
  width: 100%;
  text-align: left;
  border: none;
  border-radius: 12px;
  padding: 8px;
  font-size: 0.75rem;
  cursor: pointer;
}
.calendar-event--normal {
  background: rgba(25, 118, 210, 0.08);
}
.calendar-event--warning {
  background: rgba(251, 140, 0, 0.12);
}
.calendar-event--danger {
  background: rgba(211, 47, 47, 0.12);
}
@media (max-width: 960px) {
  .calendar-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
  .calendar-weekday {
    display: none;
  }
}
</style>

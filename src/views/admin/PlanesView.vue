<template>
  <v-row dense>
    <v-col cols="12" md="5">
      <v-card rounded="xl" class="pa-4 fill-height">
        <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-h6 font-weight-bold">Planes de mantenimiento</div>
            <div class="text-body-2 text-medium-emphasis">Cabecera del plan (primero se guarda el plan).</div>
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openPlanCreate">Nuevo plan</v-btn>
        </div>

        <v-text-field
          v-model="planSearch"
          label="Buscar plan"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
          class="mb-2"
        />

        <v-data-table
          :headers="planHeaders"
          :items="filteredPlans"
          :loading="loadingPlans"
          item-value="id"
          :items-per-page="10"
          class="elevation-0"
          @click:row="(_event: unknown, row: any) => selectPlan(row.item._raw ?? row.item)"
        >
          <template #item.codigo="{ item }">
            <div class="d-flex align-center" style="gap: 6px;">
              <v-icon v-if="selectedPlanId === (item._raw?.id ?? item.id)" size="16" color="primary">mdi-check-circle</v-icon>
              <span>{{ item.codigo }}</span>
            </div>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex" style="gap: 4px;">
              <v-btn icon="mdi-pencil" variant="text" @click.stop="openPlanEdit(item._raw ?? item)" />
              <v-btn icon="mdi-delete" variant="text" color="error" @click.stop="openDeletePlan(item._raw ?? item)" />
            </div>
          </template>
        </v-data-table>
      </v-card>
    </v-col>

    <v-col cols="12" md="7">
      <v-card rounded="xl" class="pa-4 fill-height">
        <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-h6 font-weight-bold">Detalle de tareas del plan</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedPlanId ? `Plan seleccionado: ${selectedPlanLabel}` : "Selecciona o crea una cabecera para gestionar tareas." }}
            </div>
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus" :disabled="!selectedPlanId" @click="openTaskCreate">Agregar tarea</v-btn>
        </div>

        <v-alert v-if="!selectedPlanId" type="info" variant="tonal" class="mb-2">
          Debes guardar y seleccionar una cabecera del plan para empezar con el detalle.
        </v-alert>

        <v-data-table
          :headers="taskHeaders"
          :items="tasks"
          :loading="loadingTasks"
          :items-per-page="10"
          class="elevation-0"
        >
          <template #item.actions="{ item }">
            <div class="d-flex" style="gap: 4px;">
              <v-btn icon="mdi-pencil" variant="text" :disabled="!selectedPlanId" @click="openTaskEdit(item._raw ?? item)" />
              <v-btn icon="mdi-delete" variant="text" color="error" :disabled="!selectedPlanId" @click="openDeleteTask(item._raw ?? item)" />
            </div>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>

  <v-dialog v-model="planDialog" max-width="760">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ editingPlanId ? "Editar" : "Crear" }} cabecera del plan</v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-row dense>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.codigo" label="Código" variant="outlined" /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.nombre" label="Nombre" variant="outlined" /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.tipo" label="Tipo" variant="outlined" /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.frecuencia_tipo" label="Frecuencia tipo" variant="outlined" /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.frecuencia_valor" type="number" label="Frecuencia valor" variant="outlined" /></v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="planDialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="savePlan">Guardar cabecera</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="taskDialog" max-width="760">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ editingTaskId ? "Editar" : "Crear" }} detalle de tarea</v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-row dense>
          <v-col cols="12" md="4"><v-text-field v-model="taskForm.orden" type="number" label="Orden" variant="outlined" /></v-col>
          <v-col cols="12" md="8"><v-text-field v-model="taskForm.actividad" label="Actividad" variant="outlined" /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="taskForm.field_type" label="Tipo campo" variant="outlined" /></v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="taskDialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="saveTask">Guardar detalle</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" max-width="500">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar</v-card-title>
      <v-card-text>{{ deleteTarget === "plan" ? "¿Eliminar la cabecera y su detalle?" : "¿Eliminar este detalle de tarea?" }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="saving" @click="confirmDelete">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";

const ui = useUiStore();

const plans = ref<any[]>([]);
const tasks = ref<any[]>([]);
const loadingPlans = ref(false);
const loadingTasks = ref(false);
const saving = ref(false);

const planSearch = ref("");
const selectedPlanId = ref<string | null>(null);

const planDialog = ref(false);
const taskDialog = ref(false);
const deleteDialog = ref(false);
const deleteTarget = ref<"plan" | "task">("plan");

const editingPlanId = ref<string | null>(null);
const editingTaskId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

const planForm = reactive({ codigo: "", nombre: "", tipo: "", frecuencia_tipo: "", frecuencia_valor: "0" });
const taskForm = reactive({ orden: "1", actividad: "", field_type: "" });

const planHeaders = [
  { title: "Código", key: "codigo" },
  { title: "Nombre", key: "nombre" },
  { title: "Tipo", key: "tipo" },
  { title: "Acciones", key: "actions", sortable: false },
];

const taskHeaders = [
  { title: "Orden", key: "orden" },
  { title: "Actividad", key: "actividad" },
  { title: "Tipo campo", key: "field_type" },
  { title: "Acciones", key: "actions", sortable: false },
];

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

async function listAll(endpoint: string) {
  const out: any[] = [];
  const limit = 100;
  for (let page = 1; page <= 100; page += 1) {
    const { data } = await api.get(endpoint, { params: { page, limit } });
    const rows = asArray(data);
    out.push(...rows);
    if (rows.length < limit) break;
  }
  return out;
}

const filteredPlans = computed(() => {
  const q = planSearch.value.trim().toLowerCase();
  return plans.value
    .map((plan) => ({ ...plan, _raw: plan, _search: JSON.stringify(plan).toLowerCase() }))
    .filter((plan) => !q || plan._search.includes(q));
});

const selectedPlanLabel = computed(() => {
  const plan = plans.value.find((item) => item.id === selectedPlanId.value);
  if (!plan) return "";
  return `${plan.codigo ?? ""} ${plan.nombre ?? ""}`.trim();
});

async function fetchPlans() {
  loadingPlans.value = true;
  try {
    plans.value = await listAll("/kpi_maintenance/planes");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudieron cargar los planes.");
  } finally {
    loadingPlans.value = false;
  }
}

async function fetchTasks() {
  if (!selectedPlanId.value) {
    tasks.value = [];
    return;
  }
  loadingTasks.value = true;
  try {
    const { data } = await api.get(`/kpi_maintenance/planes/${selectedPlanId.value}/tareas`);
    tasks.value = asArray(data).map((item) => ({ ...item, _raw: item }));
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudieron cargar las tareas.");
  } finally {
    loadingTasks.value = false;
  }
}

function selectPlan(item: any) {
  selectedPlanId.value = item.id;
  fetchTasks();
}

function resetPlanForm() {
  planForm.codigo = "";
  planForm.nombre = "";
  planForm.tipo = "";
  planForm.frecuencia_tipo = "";
  planForm.frecuencia_valor = "0";
}

function resetTaskForm() {
  taskForm.orden = "1";
  taskForm.actividad = "";
  taskForm.field_type = "";
}

function openPlanCreate() {
  editingPlanId.value = null;
  resetPlanForm();
  planDialog.value = true;
}

function openPlanEdit(item: any) {
  editingPlanId.value = item.id;
  planForm.codigo = item.codigo ?? "";
  planForm.nombre = item.nombre ?? "";
  planForm.tipo = item.tipo ?? "";
  planForm.frecuencia_tipo = item.frecuencia_tipo ?? "";
  planForm.frecuencia_valor = String(item.frecuencia_valor ?? "0");
  planDialog.value = true;
}

async function savePlan() {
  if (!planForm.codigo || !planForm.nombre) {
    ui.error("Código y nombre son obligatorios.");
    return;
  }

  saving.value = true;
  const payload = {
    codigo: planForm.codigo,
    nombre: planForm.nombre,
    tipo: planForm.tipo || null,
    frecuencia_tipo: planForm.frecuencia_tipo || null,
    frecuencia_valor: Number(planForm.frecuencia_valor || 0),
  };

  try {
    if (editingPlanId.value) {
      await api.patch(`/kpi_maintenance/planes/${editingPlanId.value}`, payload);
      ui.success("Cabecera del plan actualizada.");
      selectedPlanId.value = editingPlanId.value;
    } else {
      const { data } = await api.post("/kpi_maintenance/planes", payload);
      ui.success("Cabecera del plan creada. Ahora puedes agregar el detalle.");
      selectedPlanId.value = data?.id ?? null;
    }
    planDialog.value = false;
    await fetchPlans();
    if (!selectedPlanId.value) {
      const created = plans.value.find((item) => item.codigo === planForm.codigo && item.nombre === planForm.nombre);
      selectedPlanId.value = created?.id ?? null;
    }
    await fetchTasks();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar la cabecera del plan.");
  } finally {
    saving.value = false;
  }
}

function openTaskCreate() {
  if (!selectedPlanId.value) {
    ui.error("Debes seleccionar una cabecera de plan.");
    return;
  }
  editingTaskId.value = null;
  resetTaskForm();
  taskDialog.value = true;
}

function openTaskEdit(item: any) {
  editingTaskId.value = item.id;
  taskForm.orden = String(item.orden ?? 1);
  taskForm.actividad = item.actividad ?? "";
  taskForm.field_type = item.field_type ?? "";
  taskDialog.value = true;
}

async function saveTask() {
  if (!selectedPlanId.value) return;
  if (!taskForm.orden || !taskForm.actividad) {
    ui.error("Orden y actividad son obligatorios.");
    return;
  }

  saving.value = true;
  const payload = {
    orden: Number(taskForm.orden),
    actividad: taskForm.actividad,
    field_type: taskForm.field_type || null,
  };

  try {
    if (editingTaskId.value) {
      await api.patch(`/kpi_maintenance/planes/tareas/${editingTaskId.value}`, payload);
      ui.success("Detalle de tarea actualizado.");
    } else {
      await api.post(`/kpi_maintenance/planes/${selectedPlanId.value}/tareas`, payload);
      ui.success("Detalle de tarea creado.");
    }
    taskDialog.value = false;
    await fetchTasks();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar el detalle de tarea.");
  } finally {
    saving.value = false;
  }
}

function openDeletePlan(item: any) {
  deleteTarget.value = "plan";
  deletingId.value = item.id;
  deleteDialog.value = true;
}

function openDeleteTask(item: any) {
  deleteTarget.value = "task";
  deletingId.value = item.id;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!deletingId.value) return;
  saving.value = true;
  try {
    if (deleteTarget.value === "plan") {
      await api.delete(`/kpi_maintenance/planes/${deletingId.value}`);
      ui.success("Cabecera de plan eliminada.");
      if (selectedPlanId.value === deletingId.value) {
        selectedPlanId.value = null;
        tasks.value = [];
      }
      await fetchPlans();
    } else {
      await api.delete(`/kpi_maintenance/planes/tareas/${deletingId.value}`);
      ui.success("Detalle de tarea eliminado.");
      await fetchTasks();
    }
    deleteDialog.value = false;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar.");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await fetchPlans();
});
</script>

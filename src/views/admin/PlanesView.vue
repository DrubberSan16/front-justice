<template>
  <v-row dense>
    <v-col cols="12">
      <v-card rounded="xl" class="pa-4 fill-height enterprise-surface">
        <div class="responsive-header mb-3">
          <div>
            <div class="text-h6 font-weight-bold">Planes internos</div>
            <div class="text-body-2 text-medium-emphasis">Vista de soporte generada automaticamente desde Plantillas MPG.</div>
          </div>
          <v-chip color="warning" variant="tonal">Gestionado desde Plantillas MPG</v-chip>
        </div>

        <v-alert
          type="warning"
          variant="tonal"
          class="mb-3"
          text="Este modulo ya no es la fuente de verdad operativa. Configura y actualiza tareas, materiales y checklist desde Plantillas MPG."
        />

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
          class="elevation-0 enterprise-table planes-table"
        >
          <template #item.actions="{ item }">
            <div class="responsive-actions">
              <v-btn icon="mdi-pencil" variant="text" @click.stop="openPlanEdit(item._raw ?? item)" />
              <v-btn icon="mdi-delete" variant="text" color="error" @click.stop="openDeletePlan(item._raw ?? item)" />
            </div>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>

  <v-dialog v-model="planDialog" :fullscreen="isPlanDialogFullscreen" :max-width="isPlanDialogFullscreen ? undefined : 980">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ editingPlanId ? "Editar" : "Crear" }} cabecera del plan</v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-row dense>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.codigo" label="Código" variant="outlined" /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.nombre" label="Nombre" variant="outlined" /></v-col>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.tipo" label="Tipo" variant="outlined" /></v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="planForm.frecuencia_tipo"
              label="Frecuencia tipo"
              variant="outlined"
              readonly
            />
          </v-col>
          <v-col cols="12" md="6"><v-text-field v-model="planForm.frecuencia_valor" type="number" label="Frecuencia valor" variant="outlined" /></v-col>
        </v-row>

        <v-divider class="my-4" />

        <div class="responsive-header mb-3">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Detalle de tareas del plan</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ currentPlanId ? `Plan seleccionado: ${selectedPlanLabel}` : "Completa cabecera y tareas; el guardado se hace en conjunto." }}
            </div>
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="addTaskRow">Agregar tarea</v-btn>
        </div>

        <v-data-table
          :headers="taskHeaders"
          :items="tasks"
          item-value="_rowKey"
          :loading="loadingTasks"
          :items-per-page="5"
          class="elevation-0 enterprise-table plan-task-table"
        >
          <template #item.orden="{ item }">
            <v-text-field
              v-model="resolveTask(item).orden"
              variant="outlined"
              density="compact"
              hide-details
              readonly
              class="order-field"
            />
          </template>
          <template #item.actividad="{ item }">
            <v-text-field
              v-model="resolveTask(item).actividad"
              variant="outlined"
              density="compact"
              hide-details
            />
          </template>
          <template #item.actions="{ item }">
            <div class="responsive-actions">
              <v-btn icon="mdi-delete" variant="text" color="error" @click="removeTaskRow(resolveTask(item))" />
            </div>
          </template>
        </v-data-table>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="planDialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="savePlan">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 500">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar</v-card-title>
      <v-card-text>¿Eliminar la cabecera y su detalle?</v-card-text>
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
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";

const ui = useUiStore();
const { mdAndDown, smAndDown } = useDisplay();

const plans = ref<any[]>([]);
const tasks = ref<any[]>([]);
const loadingPlans = ref(false);
const loadingTasks = ref(false);
const saving = ref(false);

const planSearch = ref("");
const selectedPlanId = ref<string | null>(null);

const planDialog = ref(false);
const deleteDialog = ref(false);
const isPlanDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);

const editingPlanId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const deletedTaskIds = ref<string[]>([]);
const taskRowKey = ref(0);

const planForm = reactive({ codigo: "", nombre: "", tipo: "", frecuencia_tipo: "HORAS", frecuencia_valor: "0" });

const planHeaders = [
  { title: "Código", key: "codigo" },
  { title: "Nombre", key: "nombre" },
  { title: "Tipo", key: "tipo" },
];

const taskHeaders = [
  { title: "Orden", key: "orden" },
  { title: "Actividad", key: "actividad" },
  { title: "Acciones", key: "actions", sortable: false },
];

function makeTaskRow(item: any = {}) {
  taskRowKey.value += 1;
  return {
    ...item,
    orden: String(item.orden ?? ""),
    actividad: item.actividad ?? "",
    field_type: item.field_type || "TEXTO",
    _rowKey: item.id ?? `tmp-${taskRowKey.value}`,
  };
}

function resolveTask(item: any) {
  return item?.raw ?? item?._raw ?? item;
}

function syncTaskOrder() {
  tasks.value = tasks.value.map((task, index) => ({
    ...task,
    orden: String(index + 1),
  }));
}

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

const currentPlanId = computed(() => editingPlanId.value ?? selectedPlanId.value);

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
  if (!currentPlanId.value) {
    tasks.value = [];
    return;
  }
  loadingTasks.value = true;
  try {
    const { data } = await api.get(`/kpi_maintenance/planes/${currentPlanId.value}/tareas`);
    tasks.value = asArray(data).map((item) => makeTaskRow(item));
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudieron cargar las tareas.");
  } finally {
    loadingTasks.value = false;
  }
}

async function openPlanEdit(item: any) {
  editingPlanId.value = item.id;
  selectedPlanId.value = item.id;
  planForm.codigo = item.codigo ?? "";
  planForm.nombre = item.nombre ?? "";
  planForm.tipo = item.tipo ?? "";
  planForm.frecuencia_tipo = "HORAS";
  planForm.frecuencia_valor = String(item.frecuencia_valor ?? "0");
  planDialog.value = true;
  await fetchTasks();
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
    frecuencia_tipo: "HORAS",
    frecuencia_valor: Number(planForm.frecuencia_valor || 0),
  };

  try {
    let activePlanId = editingPlanId.value;
    if (editingPlanId.value) {
      await api.patch(`/kpi_maintenance/planes/${editingPlanId.value}`, payload);
      selectedPlanId.value = editingPlanId.value;
    } else {
      const { data } = await api.post("/kpi_maintenance/planes", payload);
      const createdId = data?.id ?? data?.data?.id ?? data?.item?.id ?? null;
      selectedPlanId.value = createdId;
      editingPlanId.value = createdId;
      activePlanId = createdId;
    }

    if (!activePlanId) {
      throw new Error("No se pudo determinar el plan a guardar.");
    }

    for (const taskId of deletedTaskIds.value) {
      await api.delete(`/kpi_maintenance/planes/tareas/${taskId}`);
    }
    console.log("Tareas eliminadas:", deletedTaskIds.value);
    console.log("Tareas a guardar:", tasks.value);
    for (const [index, task] of tasks.value.entries()) {
      if (!task.actividad?.trim()) {
        ui.error("Todas las tareas deben tener orden y actividad.");
        return;
      }

      const taskPayload = {
        orden: index + 1,
        actividad: task.actividad.trim(),
        field_type: "TEXTO",
      };

      if (task.id) {
        await api.patch(`/kpi_maintenance/planes/tareas/${task.id}`, taskPayload);
      } else {
        await api.post(`/kpi_maintenance/planes/${activePlanId}/tareas`, taskPayload);
      }
    }

    ui.success("Plan y detalle guardados correctamente.");
    await fetchPlans();
    if (!selectedPlanId.value) {
      const created = plans.value.find((item) => item.codigo === planForm.codigo && item.nombre === planForm.nombre);
      selectedPlanId.value = created?.id ?? null;
    }
    await fetchTasks();
  } catch (e: any) {
    console.error(e);
    ui.error(e?.response?.data?.message || "No se pudo guardar el plan y su detalle.");
  } finally {
    saving.value = false;
  }
}

function addTaskRow() {
  tasks.value.push(makeTaskRow({ actividad: "" }));
  syncTaskOrder();
}

function removeTaskRow(item: any) {
  if (item?.id) {
    deletedTaskIds.value.push(item.id);
  }
  tasks.value = tasks.value.filter((task) => task !== item && task.id !== item?.id);
  syncTaskOrder();
}

function openDeletePlan(item: any) {
  deletingId.value = item.id;
  deleteDialog.value = true;
}


async function confirmDelete() {
  if (!deletingId.value) return;
  saving.value = true;
  try {
    await api.delete(`/kpi_maintenance/planes/${deletingId.value}`);
    ui.success("Cabecera de plan eliminada.");
    if (selectedPlanId.value === deletingId.value) {
      selectedPlanId.value = null;
      tasks.value = [];
    }
    await fetchPlans();
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

<style scoped>
.order-field {
  max-width: 92px;
}

.planes-table :deep(.v-data-table-footer),
.plan-task-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 960px) {
  .planes-table :deep(.v-data-table-footer__items-per-page),
  .planes-table :deep(.v-data-table-footer__pagination),
  .plan-task-table :deep(.v-data-table-footer__items-per-page),
  .plan-task-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

<template>
  <v-card rounded="xl" class="pa-4">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
      <div>
        <div class="text-h6 font-weight-bold">Órdenes de trabajo</div>
        <div class="text-body-2 text-medium-emphasis">Cabeceras creadas y gestión de todo el detalle en una sola pantalla.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Nueva OT</v-btn>
    </div>

    <v-row dense class="mb-2">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="Buscar"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2">{{ error }}</v-alert>

    <v-data-table :headers="headers" :items="rows" :loading="loading" :items-per-page="20" class="elevation-0">
      <template #item.actions="{ item }">
        <div class="d-flex" style="gap:4px">
          <v-btn icon="mdi-pencil" variant="text" @click="openEdit(item._raw ?? item)" />
          <v-btn icon="mdi-delete" variant="text" color="error" @click="openDelete(item._raw ?? item)" />
        </div>
      </template>
    </v-data-table>
  </v-card>

  <v-dialog v-model="dialog" fullscreen>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-btn icon="mdi-close" @click="dialog = false" />
        <v-toolbar-title>{{ editingId ? `Editar OT ${editingId}` : "Nueva orden de trabajo" }}</v-toolbar-title>
        <v-spacer />
        <v-btn variant="tonal" :loading="savingHeader" @click="saveHeader">Guardar cabecera</v-btn>
      </v-toolbar>

      <v-card-text class="pt-4">
        <v-alert type="info" variant="tonal" class="mb-3">
          Guarda primero la cabecera y luego completa el detalle en las pestañas.
        </v-alert>

        <v-row dense>
          <v-col cols="12" md="4">
            <v-select v-model="headerForm.equipment_id" :items="equipmentOptions" item-title="title" item-value="value" label="Equipo" variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="headerForm.maintenance_kind" label="Tipo mantenimiento" variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="headerForm.status_workflow" label="Estado workflow" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="headerForm.plan_id" :items="planOptions" item-title="title" item-value="value" label="Plan" clearable variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="headerForm.alerta_id" :items="alertOptions" item-title="title" item-value="value" label="Alerta" clearable variant="outlined" />
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <v-tabs v-model="tab" color="primary">
          <v-tab value="tareas">Tareas ejecutadas</v-tab>
          <v-tab value="adjuntos">Adjuntos</v-tab>
          <v-tab value="consumos">Consumos</v-tab>
          <v-tab value="materiales">Salida de materiales</v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          <v-window-item value="tareas">
            <v-row dense>
              <v-col cols="12" md="4"><v-select v-model="taskForm.plan_id" :items="planOptions" item-title="title" item-value="value" label="Plan" variant="outlined" /></v-col>
              <v-col cols="12" md="4"><v-text-field v-model="taskForm.tarea_id" label="Tarea ID" variant="outlined" /></v-col>
              <v-col cols="12" md="2"><v-checkbox v-model="taskForm.valor_boolean" label="Boolean" hide-details /></v-col>
              <v-col cols="12" md="2"><v-text-field v-model="taskForm.valor_numeric" label="Valor numérico" type="number" variant="outlined" /></v-col>
              <v-col cols="12" md="8"><v-text-field v-model="taskForm.valor_text" label="Valor texto" variant="outlined" /></v-col>
              <v-col cols="12" md="4"><v-text-field v-model="taskForm.observacion" label="Observación" variant="outlined" /></v-col>
            </v-row>
            <div class="d-flex justify-end mb-3"><v-btn color="primary" :disabled="!editingId" @click="createTask">Agregar tarea</v-btn></div>
            <v-data-table :headers="taskHeaders" :items="taskRows" :loading="loadingDetails" class="elevation-0">
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" variant="text" color="error" @click="deleteTask(item._raw ?? item)" />
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="adjuntos">
            <v-row dense>
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.tipo" label="Tipo" variant="outlined" /></v-col>
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.nombre" label="Nombre" variant="outlined" /></v-col>
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.mime_type" label="Mime type" variant="outlined" /></v-col>
              <v-col cols="12" md="3"><v-textarea v-model="attachmentForm.contenido_base64" label="Contenido base64" rows="2" variant="outlined" /></v-col>
            </v-row>
            <div class="d-flex justify-end mb-3"><v-btn color="primary" :disabled="!editingId" @click="createAttachment">Agregar adjunto</v-btn></div>
            <v-data-table :headers="attachmentHeaders" :items="attachmentRows" :loading="loadingDetails" class="elevation-0">
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" variant="text" color="error" @click="deleteAttachment(item._raw ?? item)" />
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="consumos">
            <v-row dense>
              <v-col cols="12" md="4"><v-select v-model="consumoForm.producto_id" :items="productOptions" item-title="title" item-value="value" label="Producto" variant="outlined" /></v-col>
              <v-col cols="12" md="4"><v-select v-model="consumoForm.bodega_id" :items="warehouseOptions" item-title="title" item-value="value" label="Bodega" clearable variant="outlined" /></v-col>
              <v-col cols="12" md="2"><v-text-field v-model="consumoForm.cantidad" label="Cantidad" type="number" variant="outlined" /></v-col>
              <v-col cols="12" md="2"><v-text-field v-model="consumoForm.costo_unitario" label="Costo unitario" type="number" variant="outlined" /></v-col>
              <v-col cols="12" md="12"><v-text-field v-model="consumoForm.observacion" label="Observación" variant="outlined" /></v-col>
            </v-row>
            <div class="d-flex justify-end mb-3"><v-btn color="primary" :disabled="!editingId" @click="createConsumo">Registrar consumo</v-btn></div>
            <v-list density="compact" border rounded>
              <v-list-item v-for="(item, i) in localConsumos" :key="i" :title="`Producto: ${item.producto_id} / Cantidad: ${item.cantidad}`" :subtitle="item.observacion || '-'" />
            </v-list>
          </v-window-item>

          <v-window-item value="materiales">
            <v-row dense>
              <v-col cols="12"><v-textarea v-model="materialsItemsJson" label="Items (JSON)" rows="4" variant="outlined" /></v-col>
              <v-col cols="12"><v-text-field v-model="materialsForm.observacion" label="Observación" variant="outlined" /></v-col>
            </v-row>
            <div class="d-flex justify-end mb-3"><v-btn color="primary" :disabled="!editingId" @click="issueMaterials">Emitir materiales</v-btn></div>
            <v-list density="compact" border rounded>
              <v-list-item v-for="(item, i) in localIssues" :key="i" :title="`Items: ${item.items?.length ?? 0}`" :subtitle="item.observacion || '-'" />
            </v-list>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" max-width="500">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar</v-card-title>
      <v-card-text>¿Deseas eliminar esta orden de trabajo?</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="savingHeader" @click="confirmDelete">Eliminar</v-btn>
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
const loadingDetails = ref(false);
const savingHeader = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const records = ref<any[]>([]);

const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const tab = ref("tareas");

const equipmentOptions = ref<any[]>([]);
const planOptions = ref<any[]>([]);
const alertOptions = ref<any[]>([]);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);

const taskRows = ref<any[]>([]);
const attachmentRows = ref<any[]>([]);
const localConsumos = ref<any[]>([]);
const localIssues = ref<any[]>([]);

const headerForm = reactive<any>({
  equipment_id: "",
  maintenance_kind: "",
  status_workflow: "PENDIENTE",
  plan_id: "",
  alerta_id: "",
});

const taskForm = reactive<any>({
  plan_id: "",
  tarea_id: "",
  valor_boolean: false,
  valor_numeric: "",
  valor_text: "",
  observacion: "",
});

const attachmentForm = reactive<any>({
  tipo: "EVIDENCIA",
  nombre: "",
  contenido_base64: "",
  mime_type: "",
});

const consumoForm = reactive<any>({
  producto_id: "",
  bodega_id: "",
  cantidad: "",
  costo_unitario: "",
  observacion: "",
});

const materialsForm = reactive<any>({ observacion: "" });
const materialsItemsJson = ref("[]");

const headers = [
  { title: "ID", key: "id" },
  { title: "Equipo", key: "equipment_id" },
  { title: "Estado", key: "status_workflow" },
  { title: "Tipo", key: "maintenance_kind" },
  { title: "Acciones", key: "actions", sortable: false },
];

const taskHeaders = [
  { title: "Plan", key: "plan_id" },
  { title: "Tarea", key: "tarea_id" },
  { title: "Obs.", key: "observacion" },
  { title: "Acciones", key: "actions", sortable: false },
];

const attachmentHeaders = [
  { title: "ID", key: "id" },
  { title: "Tipo", key: "tipo" },
  { title: "Nombre", key: "nombre" },
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

function normalize(item: any) {
  const label = item?.nombre ?? item?.codigo ?? item?.id;
  return { value: item.id, title: `${item?.codigo ? `${item.codigo} - ` : ""}${label}` };
}

async function loadCatalogs() {
  const [equipos, planes, alertas, productos, bodegas] = await Promise.all([
    listAll("/kpi_maintenance/equipos"),
    listAll("/kpi_maintenance/planes"),
    listAll("/kpi_maintenance/alertas"),
    listAll("/kpi_inventory/productos"),
    listAll("/kpi_inventory/bodegas"),
  ]);
  equipmentOptions.value = equipos.map(normalize);
  planOptions.value = planes.map(normalize);
  alertOptions.value = alertas.map(normalize);
  productOptions.value = productos.map(normalize);
  warehouseOptions.value = bodegas.map(normalize);
}

async function fetchWorkOrders() {
  loading.value = true;
  error.value = null;
  try {
    records.value = await listAll("/kpi_maintenance/work-orders");
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar las órdenes de trabajo.";
  } finally {
    loading.value = false;
  }
}

async function loadDetailData() {
  if (!editingId.value) return;
  loadingDetails.value = true;
  try {
    const [tasksRes, attachmentsRes] = await Promise.all([
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/tareas`),
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos`),
    ]);
    taskRows.value = asArray(tasksRes.data).map((x) => ({ ...x, _raw: x }));
    attachmentRows.value = asArray(attachmentsRes.data).map((x) => ({ ...x, _raw: x }));
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudieron cargar los detalles de la OT.");
  } finally {
    loadingDetails.value = false;
  }
}

const rows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return records.value
    .map((r) => ({ ...r, _raw: r, _search: JSON.stringify(r).toLowerCase() }))
    .filter((r) => !q || r._search.includes(q));
});

function resetAllForms() {
  headerForm.equipment_id = "";
  headerForm.maintenance_kind = "";
  headerForm.status_workflow = "PENDIENTE";
  headerForm.plan_id = "";
  headerForm.alerta_id = "";

  taskForm.plan_id = "";
  taskForm.tarea_id = "";
  taskForm.valor_boolean = false;
  taskForm.valor_numeric = "";
  taskForm.valor_text = "";
  taskForm.observacion = "";

  attachmentForm.tipo = "EVIDENCIA";
  attachmentForm.nombre = "";
  attachmentForm.contenido_base64 = "";
  attachmentForm.mime_type = "";

  consumoForm.producto_id = "";
  consumoForm.bodega_id = "";
  consumoForm.cantidad = "";
  consumoForm.costo_unitario = "";
  consumoForm.observacion = "";

  materialsItemsJson.value = "[]";
  materialsForm.observacion = "";

  taskRows.value = [];
  attachmentRows.value = [];
  localConsumos.value = [];
  localIssues.value = [];
  tab.value = "tareas";
}

function openCreate() {
  editingId.value = null;
  resetAllForms();
  dialog.value = true;
}

async function openEdit(item: any) {
  editingId.value = item.id;
  resetAllForms();
  headerForm.equipment_id = item.equipment_id ?? "";
  headerForm.maintenance_kind = item.maintenance_kind ?? "";
  headerForm.status_workflow = item.status_workflow ?? "";
  headerForm.plan_id = item.plan_id ?? "";
  headerForm.alerta_id = item.alerta_id ?? "";
  dialog.value = true;
  await loadDetailData();
}

function openDelete(item: any) {
  deletingId.value = item.id;
  deleteDialog.value = true;
}

async function saveHeader() {
  if (!headerForm.equipment_id) {
    ui.error("Equipo es obligatorio.");
    return;
  }

  const payload = {
    equipment_id: headerForm.equipment_id,
    maintenance_kind: headerForm.maintenance_kind || null,
    status_workflow: headerForm.status_workflow || null,
    plan_id: headerForm.plan_id || null,
    alerta_id: headerForm.alerta_id || null,
  };

  savingHeader.value = true;
  try {
    if (editingId.value) {
      await api.patch(`/kpi_maintenance/work-orders/${editingId.value}`, {
        maintenance_kind: payload.maintenance_kind,
        status_workflow: payload.status_workflow,
      });
      ui.success("Cabecera OT actualizada.");
    } else {
      const { data } = await api.post("/kpi_maintenance/work-orders", payload);
      const createdId = data?.id ?? data?.data?.id;
      if (createdId) editingId.value = createdId;
      ui.success("Cabecera OT creada. Ahora puedes registrar detalle.");
    }

    await fetchWorkOrders();
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar la cabecera de OT.");
  } finally {
    savingHeader.value = false;
  }
}

async function createTask() {
  if (!editingId.value) return ui.error("Primero guarda la cabecera.");
  if (!taskForm.plan_id || !taskForm.tarea_id) return ui.error("Plan y Tarea ID son obligatorios.");

  try {
    await api.post(`/kpi_maintenance/work-orders/${editingId.value}/tareas`, {
      plan_id: taskForm.plan_id,
      tarea_id: taskForm.tarea_id,
      valor_boolean: taskForm.valor_boolean,
      valor_numeric: taskForm.valor_numeric === "" ? null : Number(taskForm.valor_numeric),
      valor_text: taskForm.valor_text || null,
      observacion: taskForm.observacion || null,
    });
    ui.success("Tarea agregada.");
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo agregar la tarea.");
  }
}

async function deleteTask(item: any) {
  if (!item?.id) return;
  try {
    await api.delete(`/kpi_maintenance/work-orders/tareas/${item.id}`);
    ui.success("Tarea eliminada.");
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar la tarea.");
  }
}

async function createAttachment() {
  if (!editingId.value) return ui.error("Primero guarda la cabecera.");
  if (!attachmentForm.nombre || !attachmentForm.contenido_base64) return ui.error("Nombre y contenido base64 son obligatorios.");

  try {
    await api.post(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos`, {
      tipo: attachmentForm.tipo || "EVIDENCIA",
      nombre: attachmentForm.nombre,
      contenido_base64: attachmentForm.contenido_base64,
      mime_type: attachmentForm.mime_type || null,
    });
    ui.success("Adjunto agregado.");
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo agregar el adjunto.");
  }
}

async function deleteAttachment(item: any) {
  if (!editingId.value || !item?.id) return;
  try {
    await api.delete(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos/${item.id}`);
    ui.success("Adjunto eliminado.");
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar el adjunto.");
  }
}

async function createConsumo() {
  if (!editingId.value) return ui.error("Primero guarda la cabecera.");
  if (!consumoForm.producto_id || !consumoForm.cantidad || !consumoForm.costo_unitario) {
    return ui.error("Producto, cantidad y costo unitario son obligatorios.");
  }

  const payload = {
    producto_id: consumoForm.producto_id,
    bodega_id: consumoForm.bodega_id || null,
    cantidad: Number(consumoForm.cantidad),
    costo_unitario: Number(consumoForm.costo_unitario),
    observacion: consumoForm.observacion || null,
  };

  try {
    const { data } = await api.post(`/kpi_maintenance/work-orders/${editingId.value}/consumos`, payload);
    localConsumos.value.unshift(data ?? payload);
    ui.success("Consumo registrado.");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo registrar el consumo.");
  }
}

async function issueMaterials() {
  if (!editingId.value) return ui.error("Primero guarda la cabecera.");

  let items: any[] = [];
  try {
    const parsed = JSON.parse(materialsItemsJson.value || "[]");
    if (!Array.isArray(parsed)) throw new Error();
    items = parsed;
  } catch {
    return ui.error("Items debe ser un JSON válido de tipo arreglo.");
  }

  if (!items.length) return ui.error("Debes ingresar al menos un item.");

  const payload = {
    items,
    observacion: materialsForm.observacion || null,
  };

  try {
    const { data } = await api.post(`/kpi_maintenance/work-orders/${editingId.value}/issue-materials`, payload);
    localIssues.value.unshift(data ?? payload);
    ui.success("Salida de materiales registrada.");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo emitir materiales.");
  }
}

async function confirmDelete() {
  if (!deletingId.value) return;
  savingHeader.value = true;
  try {
    await api.delete(`/kpi_maintenance/work-orders/${deletingId.value}`);
    ui.success("Orden de trabajo eliminada.");
    deleteDialog.value = false;
    await fetchWorkOrders();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar la OT.");
  } finally {
    savingHeader.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([fetchWorkOrders(), loadCatalogs()]);
  } catch {
    // errores específicos ya manejados en cada método
  }
});
</script>

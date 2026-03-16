<template>
  <v-card rounded="xl" class="pa-4 work-orders-shell">
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

    <v-data-table :headers="headers" :items="rows" :loading="loading" :items-per-page="20" class="elevation-0 table-enterprise">
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
        <v-chip v-if="editingId" color="white" text-color="primary" class="mr-2" variant="flat">
          {{ currentWorkflowLabel }}
        </v-chip>
        <v-btn
          v-if="editingId && isCreated"
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-play-circle-outline"
          @click="startProcess"
        >
          Completar información
        </v-btn>
        <v-btn
          v-if="editingId && isInProcess"
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-lock-check-outline"
          @click="prepareClose"
        >
          Cerrar OT
        </v-btn>
        <v-btn variant="tonal" :loading="savingHeader" @click="saveAll">Guardar</v-btn>
      </v-toolbar>

      <v-card-text class="pt-4 ot-dialog-content">
        <v-alert
          v-if="editingId"
          type="info"
          variant="tonal"
          class="mb-4"
          :text="workflowHint"
        />

        <v-card variant="flat" rounded="lg" class="pa-4 mb-4 section-card">

          <div class="text-subtitle-2 font-weight-bold mb-3">Cabecera de orden de trabajo</div>
          <v-row dense>
          <v-col cols="12" md="4">
            <v-select v-model="headerForm.equipment_id" :items="equipmentOptions" item-title="title" item-value="value" label="Equipo" variant="outlined" :disabled="isClosed" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="headerForm.maintenance_kind" label="Tipo mantenimiento" variant="outlined" :disabled="isClosed" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="headerForm.status_workflow"
              :items="workflowOptions"
              label="Estado workflow"
              variant="outlined"
              :disabled="isClosed"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="headerForm.plan_id" :items="planOptions" item-title="title" item-value="value" label="Plan" clearable variant="outlined" :disabled="isClosed" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="headerForm.alerta_id" :items="alertOptions" item-title="title" item-value="value" label="Alerta" clearable variant="outlined" :disabled="isClosed" />
          </v-col>
          <v-col cols="12" md="4"><v-textarea v-model="headerForm.causa" label="Causa" variant="outlined" rows="3" auto-grow :disabled="isClosed" /></v-col>
          <v-col cols="12" md="4"><v-textarea v-model="headerForm.accion" label="Acción" variant="outlined" rows="3" auto-grow :disabled="isClosed" /></v-col>
          <v-col cols="12" md="4"><v-textarea v-model="headerForm.prevencion" label="Prevención" variant="outlined" rows="3" auto-grow :disabled="isClosed" /></v-col>
          </v-row>
        </v-card>

        <v-divider class="my-4" />

        <v-tabs v-model="tab" color="primary">
          <v-tab value="tareas">Tareas ejecutadas</v-tab>
          <v-tab value="adjuntos">Adjuntos</v-tab>
          <v-tab v-if="showConsumosTab" value="consumos">Consumos</v-tab>
          <v-tab v-if="showMaterialsTab" value="materiales">Salida de materiales</v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          <v-window-item value="tareas">
            <v-row dense class="pt-2">
              <v-col cols="12" md="4"><v-select v-model="taskForm.plan_id" :items="planOptions" item-title="title" item-value="value" label="Plan" variant="outlined" /></v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="taskForm.tarea_id"
                  :items="taskOptions"
                  item-title="title"
                  item-value="value"
                  label="Tarea ID"
                  variant="outlined"
                  :disabled="!taskForm.plan_id"
                  :loading="loadingTaskOptions"
                  no-data-text="Selecciona un plan para cargar tareas"
                />
              </v-col>
              <v-col cols="12" md="4"><v-text-field v-model="taskForm.observacion" label="Observación" variant="outlined" /></v-col>
            </v-row>
            <div class="d-flex justify-end mb-3"><v-btn color="primary" @click="createTask">Agregar tarea</v-btn></div>
            <v-data-table :headers="taskHeaders" :items="taskRows" :loading="loadingDetails" class="elevation-0">
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" variant="text" color="error" @click="deleteTask(item._raw ?? item)" />
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="adjuntos">
            <v-row dense class="pt-2">
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.tipo" label="Tipo" variant="outlined" /></v-col>
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.nombre" label="Nombre" variant="outlined" /></v-col>
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.mime_type" label="Mime type" variant="outlined" /></v-col>
              <v-col cols="12" md="3">
                <v-file-input
                  label="Archivo"
                  variant="outlined"
                  prepend-icon="mdi-paperclip"
                  show-size
                  @update:model-value="handleAttachmentFileChange"
                />
                <div v-if="attachmentForm.nombre" class="text-caption mt-1">
                  <template v-if="editingId && attachmentPreviewUrl">
                    <a :href="attachmentPreviewUrl" target="_blank" rel="noopener noreferrer">{{ attachmentForm.nombre }}</a>
                  </template>
                  <template v-else>
                    {{ attachmentForm.nombre }}
                  </template>
                </div>
              </v-col>
            </v-row>
            <div class="d-flex justify-end mb-3"><v-btn color="primary" @click="createAttachment">Agregar adjunto</v-btn></div>
            <v-data-table :headers="attachmentHeaders" :items="attachmentRows" :loading="loadingDetails" class="elevation-0">
              <template #item.nombre="{ item }">
                <a v-if="buildAttachmentUrl(item._raw ?? item)" :href="buildAttachmentUrl(item._raw ?? item) || undefined" target="_blank" rel="noopener noreferrer">
                  {{ (item._raw ?? item).nombre }}
                </a>
                <span v-else>{{ (item._raw ?? item).nombre }}</span>
              </template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" variant="text" color="error" @click="deleteAttachment(item._raw ?? item)" />
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="consumos">
            <v-row v-if="!isClosed" dense class="pt-2">
              <v-col cols="12" md="4"><v-select v-model="consumoForm.producto_id" :items="productOptions" item-title="title" item-value="value" label="Producto" variant="outlined" /></v-col>
              <v-col cols="12" md="4"><v-select v-model="consumoForm.bodega_id" :items="warehouseOptions" item-title="title" item-value="value" label="Bodega" clearable variant="outlined" /></v-col>
              <v-col cols="12" md="2"><v-text-field v-model="consumoForm.cantidad" label="Cantidad" type="number" variant="outlined" /></v-col>
              <v-col cols="12" md="2"><v-text-field v-model="consumoForm.costo_unitario" label="Costo unitario" type="number" variant="outlined" /></v-col>
              <v-col cols="12" md="12"><v-text-field v-model="consumoForm.observacion" label="Observación" variant="outlined" /></v-col>
            </v-row>
            <div v-if="!isClosed" class="d-flex justify-end mb-3"><v-btn color="primary" @click="createConsumo">Registrar consumo</v-btn></div>
            <v-alert
              v-else
              type="info"
              variant="tonal"
              class="mb-3"
              text="La OT está cerrada. Los consumos se muestran solo para visualización."
            />
            <v-list density="compact" border rounded>
              <v-list-item v-for="(item, i) in localConsumos" :key="i" :title="`Producto: ${item.producto_id} / Cantidad: ${item.cantidad}`" :subtitle="item.observacion || '-'" />
            </v-list>
          </v-window-item>

          <v-window-item value="materiales">
            <template v-if="!isClosed">
              <v-row dense class="pt-2">
                <v-col cols="12">
                  <div class="d-flex align-center justify-space-between mb-2" style="gap:8px; flex-wrap:wrap;">
                    <div class="text-subtitle-2">Materiales usados</div>
                    <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addMaterialItem">
                      Agregar material
                    </v-btn>
                  </div>

                  <v-row
                    v-for="(item, index) in materialItems"
                    :key="`material-${index}`"
                    dense
                    class="mb-1"
                  >
                    <v-col cols="12" md="5">
                      <v-select
                        v-model="item.bodega_id"
                        :items="warehouseOptions"
                        item-title="title"
                        item-value="value"
                        label="Bodega"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" md="5">
                      <v-select
                        v-model="item.producto_id"
                        :items="productOptions"
                        item-title="title"
                        item-value="value"
                        label="Material"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="10" md="1">
                      <v-text-field
                        v-model="item.cantidad"
                        label="Cant."
                        type="number"
                        min="0"
                        step="any"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="2" md="1" class="d-flex align-center justify-end">
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        color="error"
                        :disabled="materialItems.length === 1"
                        @click="removeMaterialItem(index)"
                      />
                    </v-col>
                  </v-row>
                </v-col>
                <v-col cols="12"><v-text-field v-model="materialsForm.observacion" label="Observación" variant="outlined" /></v-col>
              </v-row>
              <div class="d-flex justify-end mb-3"><v-btn color="primary" @click="issueMaterials">Guardar salida de materiales</v-btn></div>
            </template>
            <v-alert
              v-else
              type="success"
              variant="tonal"
              class="mb-3"
              text="OT cerrada: esta sección está bloqueada y muestra el resultado final de salida de materiales."
            />
            <v-list density="compact" border rounded>
              <v-list-item
                v-for="(item, i) in localIssues"
                :key="i"
                :title="`${item.codigo || 'Sin código'} · Items: ${item.items?.length ?? 0}`"
                :subtitle="item.observacion || '-'"
              />
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
import { computed, onMounted, reactive, ref, watch } from "vue";
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
const closingFlow = ref(false);

const equipmentOptions = ref<any[]>([]);
const planOptions = ref<any[]>([]);
const alertOptions = ref<any[]>([]);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const taskOptions = ref<any[]>([]);
const loadingTaskOptions = ref(false);

const taskRows = ref<any[]>([]);
const attachmentRows = ref<any[]>([]);
const localConsumos = ref<any[]>([]);
const localIssues = ref<any[]>([]);

const headerForm = reactive<any>({
  equipment_id: "",
  maintenance_kind: "",
  status_workflow: "CREADA",
  plan_id: "",
  alerta_id: "",
  causa: "",
  accion: "",
  prevencion: "",
});

const taskForm = reactive<any>({
  plan_id: "",
  tarea_id: "",
  observacion: "",
});

const attachmentForm = reactive<any>({
  tipo: "EVIDENCIA",
  nombre: "",
  contenido_base64: "",
  mime_type: "",
});
const attachmentPreviewUrl = ref<string | null>(null);

const consumoForm = reactive<any>({
  producto_id: "",
  bodega_id: "",
  cantidad: "",
  costo_unitario: "",
  observacion: "",
});

const materialsForm = reactive<any>({ observacion: "" });

type MaterialItemForm = {
  producto_id: string;
  bodega_id: string;
  cantidad: string;
};

function newMaterialItem(): MaterialItemForm {
  return {
    producto_id: "",
    bodega_id: "",
    cantidad: "",
  };
}

const materialItems = ref<MaterialItemForm[]>([newMaterialItem()]);
const workflowOptions = [
  { title: "CREADA", value: "CREADA" },
  { title: "EN PROCESO", value: "EN PROCESO" },
  { title: "CERRADA", value: "CERRADA" },
];

const normalizedWorkflow = computed(() => (headerForm.status_workflow || "").toUpperCase());
const isCreated = computed(() => normalizedWorkflow.value === "CREADA");
const isInProcess = computed(() => normalizedWorkflow.value === "EN PROCESO");
const isClosed = computed(() => normalizedWorkflow.value === "CERRADA");
const showConsumosTab = computed(() => !!editingId.value);
const showMaterialsTab = computed(() => isInProcess.value || isClosed.value);
const currentWorkflowLabel = computed(() => `Estado: ${headerForm.status_workflow || "Sin definir"}`);
const workflowHint = computed(() => {
  if (isCreated.value) return "OT creada. Completa la información en tabs generales y de consumos.";
  if (isInProcess.value) return "OT en proceso. Ya puedes registrar la salida de materiales para cerrar la orden.";
  if (isClosed.value) return "OT cerrada. Los campos y tabs de detalle están en modo solo lectura.";
  return "Selecciona un estado de workflow para continuar el flujo.";
});

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

function parseValorJson(valorJson: unknown) {
  if (!valorJson) return {};
  if (typeof valorJson === "object") return valorJson as Record<string, any>;
  if (typeof valorJson === "string") {
    try {
      const parsed = JSON.parse(valorJson);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

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
  const label = item?.nombre ?? item?.tipo_alerta ?? item?.codigo ?? item?.id;
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

function normalizeTask(item: any) {
  const actividad = item?.actividad ?? item?.nombre ?? item?.id;
  const orden = item?.orden != null ? `${item.orden} - ` : "";
  return { value: item.id, title: `${orden}${actividad}` };
}

async function loadTaskOptionsByPlan(planId: string) {
  if (!planId) {
    taskOptions.value = [];
    return;
  }

  loadingTaskOptions.value = true;
  try {
    const { data } = await api.get(`/kpi_maintenance/planes/${planId}/tareas`);
    taskOptions.value = asArray(data).map(normalizeTask);
  } catch (e: any) {
    taskOptions.value = [];
    ui.error(e?.response?.data?.message || "No se pudieron cargar las tareas del plan.");
  } finally {
    loadingTaskOptions.value = false;
  }
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
    const [tasksRes, attachmentsRes, consumosRes, issuesRes] = await Promise.all([
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/tareas`),
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos`),
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/consumos`),
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/issue-materials`),
    ]);
    taskRows.value = asArray(tasksRes.data).map((x) => ({ ...x, _raw: x }));
    attachmentRows.value = asArray(attachmentsRes.data).map((x) => ({ ...x, _raw: x }));
    localConsumos.value = asArray(consumosRes.data);
    localIssues.value = asArray(issuesRes.data);
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
  headerForm.status_workflow = "CREADA";
  headerForm.plan_id = "";
  headerForm.alerta_id = "";
  headerForm.causa = "";
  headerForm.accion = "";
  headerForm.prevencion = "";

  taskForm.plan_id = "";
  taskForm.tarea_id = "";
  taskForm.observacion = "";

  attachmentForm.tipo = "EVIDENCIA";
  attachmentForm.nombre = "";
  attachmentForm.contenido_base64 = "";
  attachmentForm.mime_type = "";
  attachmentPreviewUrl.value = null;

  consumoForm.producto_id = "";
  consumoForm.bodega_id = "";
  consumoForm.cantidad = "";
  consumoForm.costo_unitario = "";
  consumoForm.observacion = "";

  materialItems.value = [newMaterialItem()];
  materialsForm.observacion = "";

  taskRows.value = [];
  attachmentRows.value = [];
  localConsumos.value = [];
  localIssues.value = [];
  taskOptions.value = [];
  tab.value = "tareas";
}

function openCreate() {
  editingId.value = null;
  closingFlow.value = false;
  resetAllForms();
  dialog.value = true;
}

async function openEdit(item: any) {
  editingId.value = item.id;
  closingFlow.value = false;
  resetAllForms();
  headerForm.equipment_id = item.equipment_id ?? "";
  headerForm.maintenance_kind = item.maintenance_kind ?? "";
  headerForm.status_workflow = item.status_workflow ?? "CREADA";
  headerForm.plan_id = item.plan_id ?? "";
  headerForm.alerta_id = item.alerta_id ?? "";
  const headerValorJson = parseValorJson(item?.valor_json);
  headerForm.causa = headerValorJson?.causa ?? "";
  headerForm.accion = headerValorJson?.accion ?? "";
  headerForm.prevencion = headerValorJson?.prevencion ?? "";
  dialog.value = true;
  await loadDetailData();
  ensureTabVisible();
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? (result.split(",")[1] ?? "") : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function buildAttachmentUrl(item: any) {
  if (!item?.id || !editingId.value) return null;
  return `${api.defaults.baseURL}/kpi_maintenance/work-orders/${editingId.value}/adjuntos/${item.id}`;
}

async function handleAttachmentFileChange(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value;
  if (!file) {
    attachmentForm.nombre = "";
    attachmentForm.mime_type = "";
    attachmentForm.contenido_base64 = "";
    attachmentPreviewUrl.value = null;
    return;
  }

  attachmentForm.nombre = file.name;
  attachmentForm.mime_type = file.type || "application/octet-stream";
  try {
    attachmentForm.contenido_base64 = await fileToBase64(file);
    attachmentPreviewUrl.value = URL.createObjectURL(file);
  } catch (e: any) {
    ui.error(e?.message || "No se pudo procesar el archivo.");
  }
}

function openDelete(item: any) {
  deletingId.value = item.id;
  deleteDialog.value = true;
}

function ensureTabVisible() {
  if (tab.value === "materiales" && !showMaterialsTab.value) {
    tab.value = showConsumosTab.value ? "consumos" : "tareas";
  }
  if (tab.value === "consumos" && !showConsumosTab.value) {
    tab.value = "tareas";
  }
}

async function startProcess() {
  headerForm.status_workflow = "EN PROCESO";
  await saveHeader();
  tab.value = "consumos";
}

async function prepareClose() {
  closingFlow.value = true;
  headerForm.status_workflow = "CERRADA";
  materialItems.value = localConsumos.value.length
    ? localConsumos.value.map((consumo) => ({
        producto_id: consumo.producto_id ?? "",
        bodega_id: consumo.bodega_id ?? "",
        cantidad: consumo.cantidad != null ? String(consumo.cantidad) : "",
      }))
    : [newMaterialItem()];
  tab.value = "materiales";
}

async function saveHeader() {
  if (!headerForm.equipment_id) {
    ui.error("Equipo es obligatorio.");
    return false;
  }

  const payload = {
    equipment_id: headerForm.equipment_id,
    maintenance_kind: headerForm.maintenance_kind || null,
    status_workflow: headerForm.status_workflow || null,
    plan_id: headerForm.plan_id || null,
    alerta_id: headerForm.alerta_id || null,
    valor_json: {
      causa: headerForm.causa || "",
      accion: headerForm.accion || "",
      prevencion: headerForm.prevencion || "",
    },
  };

  savingHeader.value = true;
  try {
    if (editingId.value) {
      await api.patch(`/kpi_maintenance/work-orders/${editingId.value}`, {
        maintenance_kind: payload.maintenance_kind,
        status_workflow: payload.status_workflow,
        plan_id: payload.plan_id,
        alerta_id: payload.alerta_id,
        valor_json: payload.valor_json,
      });
      ui.success("Cabecera OT actualizada.");
    } else {
      const { data } = await api.post("/kpi_maintenance/work-orders", payload);
      const createdId = data?.id ?? data?.data?.id;
      if (createdId) editingId.value = createdId;
      ui.success("Cabecera OT creada.");
    }

    await fetchWorkOrders();
    await loadDetailData();
    return true;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar la cabecera de OT.");
    return false;
  } finally {
    savingHeader.value = false;
  }
}

async function ensureHeaderSaved() {
  if (editingId.value) return true;
  return saveHeader();
}

async function saveAll() {
  const headerSaved = await saveHeader();
  if (!headerSaved || !editingId.value) return;

  const actions: Array<() => Promise<void>> = [];
  if (taskForm.plan_id || taskForm.tarea_id || taskForm.observacion) {
    actions.push(createTask);
  }
  if (attachmentForm.nombre || attachmentForm.contenido_base64) {
    actions.push(createAttachment);
  }
  if (consumoForm.producto_id || consumoForm.cantidad || consumoForm.costo_unitario || consumoForm.observacion) {
    actions.push(createConsumo);
  }
  if (hasMaterialDraft()) {
    actions.push(issueMaterials);
  }

  if (!actions.length) {
    ensureTabVisible();
    return;
  }
  for (const run of actions) {
    await run();
  }

  if (normalizedWorkflow.value === "CERRADA") {
    await saveHeader();
  }
  ensureTabVisible();
}

async function createTask() {
  if (isClosed.value) return ui.error("La OT está cerrada y no permite edición.");
  const headerSaved = await ensureHeaderSaved();
  if (!headerSaved || !editingId.value) return;
  if (!taskForm.plan_id || !taskForm.tarea_id) return ui.error("Plan y Tarea ID son obligatorios.");

  try {
    await api.post(`/kpi_maintenance/work-orders/${editingId.value}/tareas`, {
      plan_id: taskForm.plan_id,
      tarea_id: taskForm.tarea_id,
      valor_boolean: true,
      valor_numeric: 0,
      valor_text: "",
      valor_json: {},
      observacion: taskForm.observacion || null,
    });
    ui.success("Tarea agregada.");
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo agregar la tarea.");
  }
}

async function deleteTask(item: any) {
  if (isClosed.value) return ui.error("La OT está cerrada y no permite edición.");
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
  if (isClosed.value) return ui.error("La OT está cerrada y no permite edición.");
  const headerSaved = await ensureHeaderSaved();
  if (!headerSaved || !editingId.value) return;
  if (!attachmentForm.nombre || !attachmentForm.contenido_base64) return ui.error("Debes seleccionar un archivo.");

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
  if (isClosed.value) return ui.error("La OT está cerrada y no permite edición.");
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
  if (isClosed.value) return ui.error("La OT está cerrada y no permite edición.");
  const headerSaved = await ensureHeaderSaved();
  if (!headerSaved || !editingId.value) return;
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
  if (isClosed.value && !closingFlow.value) return ui.error("La OT está cerrada y no permite edición.");
  const headerSaved = await ensureHeaderSaved();
  if (!headerSaved || !editingId.value) return;

  const items = materialItems.value
    .filter((item) => item.producto_id || item.bodega_id || item.cantidad)
    .map((item) => ({
      producto_id: item.producto_id,
      bodega_id: item.bodega_id,
      cantidad: Number(item.cantidad),
    }));

  if (!items.length) return ui.error("Debes ingresar al menos un item.");

  const hasInvalidItem = items.some((item) => !item.producto_id || !item.bodega_id || !Number.isFinite(item.cantidad) || item.cantidad <= 0);
  if (hasInvalidItem) {
    return ui.error("Cada item debe incluir bodega, material y cantidad mayor a 0.");
  }

  const issueCode = generateIssueMaterialsCode();

  const payload = {
    codigo: issueCode,
    items,
    observacion: materialsForm.observacion || null,
  };

  try {
    const { data } = await api.post(`/kpi_maintenance/work-orders/${editingId.value}/issue-materials`, payload);
    localIssues.value.unshift({ ...(data ?? payload), codigo: data?.codigo || issueCode });
    materialItems.value = [newMaterialItem()];
    materialsForm.observacion = "";
    closingFlow.value = false;
    ui.success("Salida de materiales registrada.");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo emitir materiales.");
  }
}

function addMaterialItem() {
  materialItems.value.push(newMaterialItem());
}

function removeMaterialItem(index: number) {
  if (materialItems.value.length === 1) {
    materialItems.value[0] = newMaterialItem();
    return;
  }
  materialItems.value.splice(index, 1);
}

function hasMaterialDraft() {
  if (materialsForm.observacion) return true;
  return materialItems.value.some((item) => item.producto_id || item.bodega_id || item.cantidad);
}

function generateIssueMaterialsCode() {
  const now = new Date();
  const compact = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
  return `EM-${compact}`;
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

watch(
  () => taskForm.plan_id,
  async (planId, previousPlanId) => {
    if (planId !== previousPlanId) {
      taskForm.tarea_id = "";
    }
    await loadTaskOptionsByPlan(planId);
  },
);
</script>

<style scoped>
.work-orders-shell {
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.table-enterprise {
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.ot-dialog-content {
  background-color: #f8fafc;
}

.section-card {
  background-color: #ffffff;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.section-card :deep(.v-label),
.section-card :deep(.v-field__input),
.section-card :deep(input),
.section-card :deep(textarea),
.section-card :deep(.v-select__selection-text) {
  color: #0f172a !important;
}

</style>

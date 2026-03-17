<template>
  <v-alert v-if="!moduleConfig" type="error" variant="tonal">
    Módulo no configurado.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
      <div>
        <div class="text-h6 font-weight-bold">{{ moduleConfig.title }}</div>
        <div class="text-body-2 text-medium-emphasis">Mantenimiento de {{ moduleConfig.title.toLowerCase() }}.</div>
      </div>
      <v-btn
        v-if="canCreate"
        color="primary"
        prepend-icon="mdi-plus"
        @click="openCreate"
      >
        Nuevo
      </v-btn>
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

    <v-data-table
      :headers="headers"
      :items="rows"
      :loading="loading"
      :items-per-page="20"
      :item-props="getRowProps"
      class="elevation-0 enterprise-table"
    >
      <template #item.tipo_alerta="{ item }">
        <span v-if="showAlertGroupValue(resolveTableItem(item))">{{ resolveTableItem(item).tipo_alerta }}</span>
      </template>

      <template #item.equipo_id="{ item }">
        <span v-if="showAlertGroupValue(resolveTableItem(item))">{{ resolveTableItem(item).equipo_id }}</span>
      </template>

      <template #item.equipo_nombre="{ item }">
        <span v-if="showAlertGroupValue(resolveTableItem(item))">{{ resolveTableItem(item).equipo_nombre }}</span>
      </template>

      <template #item.actions="{ item }">
        <div class="d-flex" style="gap:4px">
          <v-btn
            v-if="canEdit"
            icon="mdi-pencil"
            variant="text"
            @click="openEdit(item._raw ?? item)"
          />
          <v-btn
            v-if="canDelete"
            icon="mdi-delete"
            variant="text"
            color="error"
            @click="openDelete(item._raw ?? item)"
          />
        </div>
      </template>
    </v-data-table>
  </v-card>

  <v-dialog v-model="dialog" max-width="900">
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ editingId ? 'Editar' : 'Crear' }} {{ moduleConfig?.title }}</v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col v-for="field in moduleConfig?.fields ?? []" :key="field.key" cols="12" md="6">
            <v-select
              v-if="field.type === 'select'"
              v-model="form[field.key]"
              :items="getSelectOptions(field)"
              item-title="title"
              item-value="value"
              :label="field.label"
              :hint="field.required ? 'Obligatorio' : ''"
              persistent-hint
              clearable
              variant="outlined"
            />
            <v-checkbox
              v-else-if="field.type === 'boolean'"
              v-model="form[field.key]"
              :label="field.label"
              hide-details
            />
            <v-text-field
              v-else
              v-model="form[field.key]"
              :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
              :label="field.label"
              :hint="field.required ? 'Obligatorio' : ''"
              persistent-hint
              variant="outlined"
            />
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

  <v-dialog v-model="deleteDialog" max-width="500">
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar</v-card-title>
      <v-card-text>¿Deseas eliminar este registro?</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="saving" @click="confirmDelete">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { getMaintenanceModule, type MaintenanceField } from "@/app/config/maintenance-modules";
import { useUiStore } from "@/app/stores/ui.store";

const props = defineProps<{ moduleKey: string }>();
const ui = useUiStore();

const moduleConfig = computed(() => getMaintenanceModule(props.moduleKey));
const canCreate = computed(() => moduleConfig.value?.allowCreate !== false);
const canEdit = computed(() => moduleConfig.value?.allowEdit !== false);
const canDelete = computed(() => moduleConfig.value?.allowDelete !== false);
const records = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const search = ref("");

const relationOptions = ref<Record<string, Array<{ value: any; title: string }>>>({});

const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const form = reactive<Record<string, any>>({});

function resolveEndpoint(template: string, id: string) {
  return template.replace(":id", id);
}

function getPathId(showError = true) {
  const cfg = moduleConfig.value;
  if (!cfg?.pathParam) return null;
  const val = form[cfg.pathParam.key];
  if (!val && showError) {
    ui.error(`Debes seleccionar ${cfg.pathParam.label}.`);
  }
  if (!val) {
    return null;
  }
  return String(val);
}

function getCollectionEndpoint() {
  const cfg = moduleConfig.value;
  if (!cfg) return null;
  if (!cfg.pathParam) return cfg.endpoint;
  const id = getPathId(false);
  if (!id) return null;
  return resolveEndpoint(cfg.endpoint, id);
}

function getItemEndpoint(recordId: string) {
  const cfg = moduleConfig.value;
  if (!cfg) return null;
  if (cfg.itemEndpoint) return resolveEndpoint(cfg.itemEndpoint, recordId);
  return `${cfg.endpoint}/${recordId}`;
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

function normalizeLabel(item: any) {
  return item?.nombre ?? item?.razon_social ?? item?.codigo ?? item?.id;
}

async function loadRelations() {
  relationOptions.value = {};
  if (!moduleConfig.value) return;

  for (const field of moduleConfig.value.fields) {
    if (!field.relation) continue;
    const rows = await listAll(field.relation.endpoint);
    relationOptions.value[field.key] = rows.map((r: any) => ({
      value: r.id,
      title: `${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`,
    }));
  }
}

function normalizeWorkOrderTitle(item: any) {
  return item?.titulo ?? item?.title ?? item?.nombre ?? item?.codigo ?? item?.id ?? "Sin orden";
}

function normalizeTeamName(item: any) {
  return item?.nombre ?? item?.name ?? item?.codigo ?? item?.id ?? "Sin equipo";
}

function getAlertGroupKey(row: any) {
  const equipoId = row?.equipo_id ?? "";
  const tipoAlerta = row?.tipo_alerta ?? "";
  const referencia = row?.referencia ?? row?.reference ?? "";
  return `${equipoId}::${tipoAlerta}::${referencia}`;
}

function resolveTableItem(item: any) {
  return item?.raw ?? item?._raw ?? item;
}

async function enrichAlertsWithRelations(alertRows: any[]) {
  const equipoIds = Array.from(new Set(alertRows.map((row) => row?.equipo_id).filter(Boolean)));
  const workOrderIds = Array.from(new Set(alertRows.map((row) => row?.work_order_id).filter(Boolean)));

  const equipoMap = new Map<string, string>();
  await Promise.all(
    equipoIds.map(async (equipoId) => {
      try {
        const { data } = await api.get(`/kpi_maintenance/equipos/${equipoId}`);
        const item = data?.data ?? data;
        equipoMap.set(String(equipoId), normalizeTeamName(item));
      } catch {
        equipoMap.set(String(equipoId), String(equipoId));
      }
    })
  );

  const workOrderMap = new Map<string, string>();
  await Promise.all(
    workOrderIds.map(async (workOrderId) => {
      try {
        const { data } = await api.get(`/kpi_maintenance/work-orders/${workOrderId}`);
        const item = data?.data ?? data;
        workOrderMap.set(String(workOrderId), normalizeWorkOrderTitle(item));
      } catch {
        workOrderMap.set(String(workOrderId), String(workOrderId));
      }
    })
  );

  return alertRows.map((row) => ({
    ...row,
    equipo_nombre: row?.equipo_id ? equipoMap.get(String(row.equipo_id)) ?? String(row.equipo_id) : "",
    work_order_title: row?.work_order_id ? workOrderMap.get(String(row.work_order_id)) ?? String(row.work_order_id) : "Sin orden",
  }));
}

async function fetchRecords() {
  const endpoint = getCollectionEndpoint();
  if (!endpoint) {
    records.value = [];
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    if (moduleConfig.value?.key === "alertas") {
      await api.post("/kpi_maintenance/alertas/recalcular");
    }
    const rows = await listAll(endpoint);
    records.value = moduleConfig.value?.key === "alertas" ? await enrichAlertsWithRelations(rows) : rows;
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar registros.";
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.keys(form).forEach((k) => delete form[k]);
  for (const field of moduleConfig.value?.fields ?? []) {
    if (field.key === "status") form[field.key] = "ACTIVE";
    else if (field.type === "boolean") form[field.key] = false;
    else if (field.type === "number") form[field.key] = "0";
    else form[field.key] = "";
  }
}

function getSelectOptions(field: MaintenanceField) {
  if (field.options) return field.options;
  return relationOptions.value[field.key] ?? [];
}

const headers = computed(() => {
  const cfg = moduleConfig.value;
  if (!cfg) return [];
  const base = cfg.fields.slice(0, 6).map((f) => ({ title: f.label, key: f.key }));
  if (!canEdit.value && !canDelete.value) return base;
  return [...base, { title: "Acciones", key: "actions", sortable: false }];
});

const rows = computed(() => {
  const cfg = moduleConfig.value;
  if (!cfg) return [];
  const q = search.value.trim().toLowerCase();

  const normalizedRows = records.value
    .map((r) => {
      const out: any = { ...r };
      out._raw = r;
      for (const field of cfg.fields) {
        if (field.type === "select" && field.relation && r[field.key]) {
          const opt = (relationOptions.value[field.key] ?? []).find((x) => x.value === r[field.key]);
          out[field.key] = opt?.title ?? r[field.key];
        }
      }
      out._search = JSON.stringify({ ...r, ...out }).toLowerCase();
      return out;
    })
    .filter((r) => !q || r._search.includes(q));

  if (cfg.key !== "alertas") {
    return normalizedRows;
  }

  const sortedRows = [...normalizedRows].sort((a, b) => {
    const keyA = getAlertGroupKey(a);
    const keyB = getAlertGroupKey(b);
    return keyA.localeCompare(keyB);
  });

  let previousGroup = "";
  let groupIndex = 0;

  return sortedRows.map((row) => {
    const groupKey = getAlertGroupKey(row);
    const isGroupStart = groupKey !== previousGroup;

    if (isGroupStart) {
      groupIndex += 1;
      previousGroup = groupKey;
    }

    return {
      ...row,
      _alertGroupKey: groupKey,
      _alertGroupStart: isGroupStart,
      _alertGroupIndex: groupIndex,
    };
  });
});

function showAlertGroupValue(item: any) {
  if (moduleConfig.value?.key !== "alertas") return true;
  return Boolean(item?._alertGroupStart);
}

function getRowProps({ item }: { item: any }) {
  if (moduleConfig.value?.key !== "alertas") return {};
  const row = resolveTableItem(item);
  const index = row?._alertGroupIndex ?? 0;
  return {
    class: index % 2 === 0 ? "alert-group-row-even" : "alert-group-row-odd",
  };
}

function sanitizePayload() {
  const cfg = moduleConfig.value;
  const payload: Record<string, any> = {};
  if (!cfg) return payload;

  for (const field of cfg.fields) {
    if (field.sendInPayload === false) continue;
    let val = form[field.key];
    if (field.type === "number") {
      val = val === "" || val === null || val === undefined ? "0" : String(val);
    }
    if (field.type === "text") {
      val = val === "" ? null : val;
    }
    if (field.type === "select" && val === "") {
      val = null;
    }
    if (field.key === "items" && typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch {
        ui.error("El campo Items (JSON) debe tener formato JSON válido.");
        return null;
      }
    }
    payload[field.key] = val;
  }

  return payload;
}

function validateForm() {
  const cfg = moduleConfig.value;
  if (!cfg) return false;

  for (const field of cfg.fields) {
    if (!field.required) continue;
    const val = form[field.key];
    if (field.type === "boolean") continue;
    if (val === "" || val === null || val === undefined) {
      ui.error(`El campo ${field.label} es obligatorio.`);
      return false;
    }
  }
  return true;
}

function openCreate() {
  editingId.value = null;
  resetForm();
  dialog.value = true;
}

function openEdit(item: any) {  
  editingId.value = item.id;
  resetForm();
  for (const field of moduleConfig.value?.fields ?? []) {
    form[field.key] = item[field.key] ?? form[field.key];
  }
  dialog.value = true;
}

function openDelete(item: any) {
  deletingId.value = item.id;
  deleteDialog.value = true;
}

async function save() {
  const collectionEndpoint = getCollectionEndpoint();
  if (!moduleConfig.value || !collectionEndpoint) return;
  if (!validateForm()) return;

  saving.value = true;
  try {
    const payload = sanitizePayload();
    if (!payload) return;
    if (editingId.value) {
      const itemEndpoint = getItemEndpoint(editingId.value);
      if (!itemEndpoint) return;
      await api.patch(itemEndpoint, payload);
      ui.success("Registro actualizado correctamente.");
    } else {
      await api.post(collectionEndpoint, payload);
      ui.success("Registro creado correctamente.");
    }

    dialog.value = false;
    await fetchRecords();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar el registro.");
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!moduleConfig.value || !deletingId.value) return;
  saving.value = true;
  try {
    const itemEndpoint = getItemEndpoint(deletingId.value);
    if (!itemEndpoint) return;
    await api.delete(itemEndpoint);
    ui.success("Registro eliminado correctamente.");
    deleteDialog.value = false;
    await fetchRecords();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar el registro.");
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.moduleKey,
  async () => {
    if (!moduleConfig.value) return;
    resetForm();
    await loadRelations();
    await fetchRecords();
  },
  { immediate: true }
);

watch(
  () => (moduleConfig.value?.pathParam?.key ? form[moduleConfig.value.pathParam.key] : null),
  async () => {
    if (!moduleConfig.value?.pathParam) return;
    await fetchRecords();
  }
);

onMounted(async () => {
  if (!moduleConfig.value) return;
  await loadRelations();
});
</script>

<style scoped>
:deep(.alert-group-row-odd td) {
  background-color: rgba(25, 118, 210, 0.04);
}

:deep(.alert-group-row-even td) {
  background-color: transparent;
}
</style>

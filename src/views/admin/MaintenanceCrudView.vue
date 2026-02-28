<template>
  <v-alert v-if="!moduleConfig" type="error" variant="tonal">
    Módulo no configurado.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
      <div>
        <div class="text-h6 font-weight-bold">{{ moduleConfig.title }}</div>
        <div class="text-body-2 text-medium-emphasis">Mantenimiento de {{ moduleConfig.title.toLowerCase() }}.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Nuevo</v-btn>
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

  <v-dialog v-model="dialog" max-width="900">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ editingId ? 'Editar' : 'Crear' }} {{ moduleConfig?.title }}</v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
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
              :type="field.type === 'number' ? 'number' : 'text'"
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
    <v-card rounded="xl">
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

async function fetchRecords() {
  if (!moduleConfig.value) return;
  loading.value = true;
  error.value = null;
  try {
    records.value = await listAll(moduleConfig.value.endpoint);
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
  return [...base, { title: "Acciones", key: "actions", sortable: false }];
});

const rows = computed(() => {
  const cfg = moduleConfig.value;
  if (!cfg) return [];
  const q = search.value.trim().toLowerCase();

  return records.value
    .map((r) => {
      const out: any = { ...r };
      out._raw = r;
      for (const field of cfg.fields) {
        if (field.type === "select" && field.relation && r[field.key]) {
          const opt = (relationOptions.value[field.key] ?? []).find((x) => x.value === r[field.key]);
          out[field.key] = opt?.title ?? r[field.key];
        }
      }
      out._search = JSON.stringify(r).toLowerCase();
      return out;
    })
    .filter((r) => !q || r._search.includes(q));
});

function sanitizePayload() {
  const cfg = moduleConfig.value;
  const payload: Record<string, any> = {};
  if (!cfg) return payload;

  for (const field of cfg.fields) {
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
  if (!moduleConfig.value) return;
  if (!validateForm()) return;

  saving.value = true;
  try {
    const payload = sanitizePayload();
    if (editingId.value) {
      await api.patch(`${moduleConfig.value.endpoint}/${editingId.value}`, payload);
      ui.success("Registro actualizado correctamente.");
    } else {
      await api.post(moduleConfig.value.endpoint, payload);
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
    await api.delete(`${moduleConfig.value.endpoint}/${deletingId.value}`);
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

onMounted(async () => {
  if (!moduleConfig.value) return;
  await loadRelations();
});
</script>

<template>
  <v-alert v-if="!moduleConfig" type="error" variant="tonal">
    Módulo no configurado.
  </v-alert>

  <v-alert v-else-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para consultar este módulo.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-3">
      <div>
        <div class="text-h6 font-weight-bold">{{ moduleConfig.title }}</div>
        <div class="text-body-2 text-medium-emphasis">Inventario de {{ moduleConfig.title.toLowerCase() }}.</div>
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

    <v-data-table :headers="headers" :items="rows" :loading="loading" :items-per-page="20" class="elevation-0 enterprise-table inventory-table">
      <template #item.actions="{ item }">
        <div class="responsive-actions">
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

  <v-dialog v-model="dialog" :fullscreen="isDialogFullscreen" :max-width="isDialogFullscreen ? undefined : 900">
    <v-card rounded="xl" class="enterprise-dialog inventory-dialog-card">
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

  <v-dialog v-model="deleteDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 500">
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
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { getInventoryModule, type MaintenanceField } from "@/app/config/maintenance-modules";
import { useUiStore } from "@/app/stores/ui.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { formatNumberForDisplay } from "@/app/utils/number-format";

const props = defineProps<{ moduleKey: string }>();
const ui = useUiStore();
const menu = useMenuStore();
const route = useRoute();
const { mdAndDown, smAndDown } = useDisplay();

const moduleConfig = computed(() => getInventoryModule(props.moduleKey));
const permissionAliases = computed(() => {
  const singular = props.moduleKey.endsWith("s") ? props.moduleKey.slice(0, -1) : props.moduleKey;
  return [props.moduleKey, singular, String(route.name ?? "")].filter(Boolean);
});
const menuPermissions = computed(() => getPermissionsForAnyComponent(menu.tree, permissionAliases.value));
const canRead = computed(() => menuPermissions.value.isReaded);
const canCreate = computed(() => moduleConfig.value?.allowCreate !== false && menuPermissions.value.isCreated);
const canEdit = computed(() => moduleConfig.value?.allowEdit !== false && menuPermissions.value.isEdited);
const canDelete = computed(() => moduleConfig.value?.allowDelete !== false && menuPermissions.value.permitDeleted);
const records = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const search = ref("");

const relationOptions = ref<Record<string, Array<{ value: any; title: string; bodegaId?: string | null }>>>({});

const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const form = reactive<Record<string, any>>({});
const isDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);

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
      bodegaId: r?.bodega_id ? String(r.bodega_id) : null,
    }));
  }
}

function isWarehouseDependentProductField(field: MaintenanceField) {
  return field.relation?.endpoint === "/kpi_inventory/productos";
}

async function fetchRecords() {
  if (!moduleConfig.value) return;
  if (!canRead.value) return;
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
  const options = relationOptions.value[field.key] ?? [];
  if (!isWarehouseDependentProductField(field)) return options;
  if (!options.some((option) => String(option.bodegaId || "").trim())) return options;

  const warehouseId = String(form.bodega_id || "").trim();
  if (!warehouseId) return [];

  return options.filter((option) => String(option.bodegaId || "") === warehouseId);
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

  return records.value
    .map((r) => {
      const out: any = { ...r };
      out._raw = r;
      for (const field of cfg.fields) {
        if (field.type === "select" && field.relation && r[field.key]) {
          const opt = (relationOptions.value[field.key] ?? []).find((x) => x.value === r[field.key]);
          out[field.key] = opt?.title ?? r[field.key];
        }

        if (field.type === "number") {
          out[field.key] = formatNumberForDisplay(r[field.key]);
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

  if (cfg.key === "productos") {
    payload.registro_sanitario = "";
    payload.por_contenedores = false;
    payload.requiere_lote = false;
    payload.requiere_serie = false;
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
  if (!canRead.value) return;
  if (!validateForm()) return;
  if (!editingId.value && !canCreate.value) {
    ui.error("No tienes permisos para crear en este módulo.");
    return;
  }
  if (editingId.value && !canEdit.value) {
    ui.error("No tienes permisos para editar en este módulo.");
    return;
  }

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
  if (!canDelete.value) {
    ui.error("No tienes permisos para eliminar en este módulo.");
    return;
  }
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

watch(
  () => form.bodega_id,
  () => {
    const cfg = moduleConfig.value;
    if (!cfg) return;
    const productField = cfg.fields.find((field) => field.key === "producto_id");
    if (!productField) return;
    const stillExists = getSelectOptions(productField).some(
      (option) => String(option.value) === String(form.producto_id || ""),
    );
    if (!stillExists) {
      form.producto_id = "";
    }
  },
);

onMounted(async () => {
  if (!moduleConfig.value) return;
  await loadRelations();
});
</script>

<style scoped>
.inventory-dialog-card {
  min-height: 100%;
}

.inventory-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 960px) {
  .inventory-table :deep(.v-data-table-footer__items-per-page),
  .inventory-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

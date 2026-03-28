<template>
  <v-alert v-if="!moduleConfig" type="error" variant="tonal">
    Módulo no configurado.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
      <div>
        <div class="text-h6 font-weight-bold">{{ displayModuleTitle }}</div>
        <div class="text-body-2 text-medium-emphasis">Mantenimiento de {{ displayModuleTitle.toLowerCase() }}.</div>
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
      <template #item.estado="{ item }">
        <template v-if="moduleConfig?.key === 'alertas'">
          <div class="alert-tree-cell">
            <div
              v-if="resolveTableItem(item)._alertGroupHeader"
              class="alert-tree-root"
              @click.stop="toggleAlertGroup(resolveTableItem(item))"
            >
              <span class="alert-tree-toggle">{{ resolveTableItem(item)._alertGroupExpanded ? "▼" : "▶" }}</span>
              {{ resolveAlertReference(resolveTableItem(item)) }}
            </div>
            <div class="alert-tree-node">
              <span class="alert-tree-branch">{{ resolveTableItem(item)._alertChild ? "└─" : (resolveTableItem(item)._alertGroupExpanded ? "├─" : "└─") }}</span>
              <span>{{ resolveTableItem(item).estado }}</span>
            </div>
          </div>
        </template>
        <span v-else>{{ resolveTableItem(item).estado }}</span>
      </template>

      <template #item.tipo_alerta="{ item }">
        <span v-if="showAlertGroupValue(resolveTableItem(item))">{{ resolveTableItem(item).tipo_alerta }}</span>
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
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ editingId ? 'Editar' : 'Crear' }} {{ displayModuleTitle }}</v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col
            v-for="field in visibleFields"
            :key="field.key"
            cols="12"
            :md="field.fullWidth ? 12 : 6"
          >
            <MaintenanceStructuredField
              v-if="field.editor"
              v-model="form[field.key]"
              :field="field"
              :relation-options="relationOptions"
              @patch-form="applyFormPatch"
            />
            <v-select
              v-else-if="field.type === 'select'"
              v-model="form[field.key]"
              :items="getSelectOptions(field)"
              item-title="title"
              item-value="value"
              :label="repairText(field.label)"
              :hint="field.required ? 'Obligatorio' : ''"
              persistent-hint
              clearable
              variant="outlined"
            />
            <v-checkbox
              v-else-if="field.type === 'boolean'"
              v-model="form[field.key]"
              :label="repairText(field.label)"
              hide-details
            />
            <v-textarea
              v-else-if="field.type === 'json'"
              v-model="jsonTextFields[field.key]"
              :label="repairText(field.label)"
              :hint="field.required ? 'Obligatorio. Ingresa un JSON valido.' : 'Ingresa un JSON valido.'"
              persistent-hint
              auto-grow
              rows="4"
              variant="outlined"
            />
            <v-text-field
              v-else
              v-model="form[field.key]"
              :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
              :label="repairText(field.label)"
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
import MaintenanceStructuredField from "@/components/maintenance/MaintenanceStructuredField.vue";
import { getEnhancedMaintenanceModule, type EnhancedMaintenanceField } from "@/app/config/maintenance-module-overrides";
import { useUiStore } from "@/app/stores/ui.store";

const props = defineProps<{ moduleKey: string }>();
const ui = useUiStore();

const moduleConfig = computed(() => getEnhancedMaintenanceModule(props.moduleKey));
const canCreate = computed(() => moduleConfig.value?.allowCreate !== false);
const canEdit = computed(() => moduleConfig.value?.allowEdit !== false);
const canDelete = computed(() => moduleConfig.value?.allowDelete !== false);
const records = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const expandedAlertGroups = ref<Record<string, boolean>>({});

const relationOptions = ref<Record<string, Array<{ value: any; title: string }>>>({});

const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const form = reactive<Record<string, any>>({});
const jsonTextFields = reactive<Record<string, string>>({});

function repairText(value: unknown) {
  const text = String(value ?? "");
  try {
    return decodeURIComponent(escape(text));
  } catch {
    return text;
  }
}

const displayModuleTitle = computed(() => repairText(moduleConfig.value?.title ?? ""));

function defaultJsonValue(field: EnhancedMaintenanceField) {
  return field.jsonMode === "array" ? [] : {};
}

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function serializeJsonValue(value: unknown, field: EnhancedMaintenanceField) {
  if (value === null || value === undefined || value === "") {
    return field.editor ? defaultJsonValue(field) : JSON.stringify(defaultJsonValue(field), null, 2);
  }

  if (field.editor) {
    return cloneValue(value);
  }

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return JSON.stringify(defaultJsonValue(field), null, 2);
  }
}

function parseJsonField(value: unknown, field: EnhancedMaintenanceField) {
  if (field.editor) {
    if (value === null || value === undefined || value === "") {
      return defaultJsonValue(field);
    }
    return cloneValue(value);
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return field.jsonMode === "array" ? [] : {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (field.jsonMode === "array" && !Array.isArray(parsed)) {
      throw new Error(`El campo ${repairText(field.label)} debe ser un arreglo JSON.`);
    }
    if (field.jsonMode === "object" && (!parsed || Array.isArray(parsed) || typeof parsed !== "object")) {
      throw new Error(`El campo ${repairText(field.label)} debe ser un objeto JSON.`);
    }
    return parsed;
  } catch (error: any) {
    ui.error(error?.message || `El campo ${repairText(field.label)} debe tener formato JSON valido.`);
    return null;
  }
}

function resolveEndpoint(template: string, id: string) {
  return template.replace(":id", id);
}

function getPathId(showError = true) {
  const cfg = moduleConfig.value;
  if (!cfg?.pathParam) return null;
  const val = form[cfg.pathParam.key];
  if (!val && showError) {
    ui.error(`Debes seleccionar ${repairText(cfg.pathParam.label)}.`);
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
      title: repairText(`${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`),
    }));
  }

  if (moduleConfig.value.key === "work-order-issue-materials") {
    const [productos, bodegas] = await Promise.all([
      listAll("/kpi_inventory/productos"),
      listAll("/kpi_inventory/bodegas"),
    ]);

    relationOptions.value.producto_id = productos.map((r: any) => ({
      value: r.id,
      title: repairText(`${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`),
    }));

    relationOptions.value.bodega_id = bodegas.map((r: any) => ({
      value: r.id,
      title: repairText(`${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}`),
    }));
  }
}

function normalizeWorkOrderTitle(item: any) {
  return item?.titulo ?? item?.title ?? item?.nombre ?? item?.codigo ?? item?.id ?? "Sin orden";
}

function normalizeTeamName(item: any) {
  return item?.nombre ?? item?.name ?? item?.codigo ?? item?.id ?? "Sin equipo";
}

function isMeaningfulOrderTitle(value: any) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return Boolean(normalized) && normalized !== "sin orden";
}

function getAlertGroupKey(row: any) {
  const referencia = row?.referencia ?? row?.reference ?? "";
  if (referencia) return `referencia::${referencia}`;
  return `row::${row?.id ?? row?.alerta_id ?? row?.work_order_id ?? "sin-id"}`;
}

function extractPlanIdFromReference(reference: any) {
  const value = String(reference ?? "").trim();
  const match = value.match(/^PLAN:\s*(.+)$/i);
  if (!match?.[1]) return null;
  const planId = match[1].trim();
  return planId || null;
}

function resolveAlertReference(row: any) {
  return row?.referencia_resuelta ?? row?.referencia ?? row?.reference ?? "Sin referencia";
}

function resolveTableItem(item: any) {
  if (item?.raw) {
    return { ...item.raw, ...item };
  }
  if (item?._raw) {
    return { ...item._raw, ...item };
  }
  return item;
}

async function enrichAlertsWithRelations(alertRows: any[]) {
  const equipoIds = Array.from(new Set(alertRows.map((row) => row?.equipo_id).filter(Boolean)));
  const workOrderIds = Array.from(new Set(alertRows.map((row) => row?.work_order_id).filter(Boolean)));
  const planIds = Array.from(
    new Set(
      alertRows
        .map((row) => extractPlanIdFromReference(row?.referencia ?? row?.reference))
        .filter(Boolean)
    )
  );

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

  const planMap = new Map<string, string>();
  await Promise.all(
    planIds.map(async (planId) => {
      try {
        const { data } = await api.get(`/kpi_maintenance/planes/${planId}`);
        const item = data?.data ?? data;
        const name = item?.nombre ?? item?.name ?? item?.codigo ?? String(planId);
        planMap.set(String(planId), String(name));
      } catch {
        planMap.set(String(planId), String(planId));
      }
    })
  );

  const enrichedRows = alertRows.map((row) => ({
    ...row,
    referencia_resuelta: (() => {
      const rawReference = row?.referencia ?? row?.reference ?? "";
      const planId = extractPlanIdFromReference(rawReference);
      if (!planId) return rawReference;
      const planName = planMap.get(String(planId)) ?? String(planId);
      return `PLAN: ${planName}`;
    })(),
    equipo_nombre: row?.equipo_id ? equipoMap.get(String(row.equipo_id)) ?? String(row.equipo_id) : "",
    work_order_title: row?.work_order_id ? workOrderMap.get(String(row.work_order_id)) ?? String(row.work_order_id) : "Sin orden",
  }));

  const groupFallbacks = new Map<string, { tipo_alerta: string; equipo_id: string; equipo_nombre: string; work_order_title: string }>();
  for (const row of enrichedRows) {
    const key = getAlertGroupKey(row);
    const existing = groupFallbacks.get(key) ?? { tipo_alerta: "", equipo_id: "", equipo_nombre: "", work_order_title: "" };

    const isEnProceso = String(row?.estado ?? "").toUpperCase() === "EN_PROCESO";
    const preferredOrder = isEnProceso && isMeaningfulOrderTitle(row?.work_order_title);
    const keepExistingOrder = isMeaningfulOrderTitle(existing.work_order_title);

    groupFallbacks.set(key, {
      tipo_alerta: existing.tipo_alerta || row?.tipo_alerta || "",
      equipo_id: existing.equipo_id || row?.equipo_id || "",
      equipo_nombre: existing.equipo_nombre || row?.equipo_nombre || "",
      work_order_title: preferredOrder
        ? row?.work_order_title
        : keepExistingOrder
          ? existing.work_order_title
          : row?.work_order_title || "",

    });
  }

  return enrichedRows.map((row) => {

    const fallback = groupFallbacks.get(getAlertGroupKey(row));
    return {
      ...row,
      tipo_alerta: row?.tipo_alerta || fallback?.tipo_alerta || "",
      equipo_id: row?.equipo_id || fallback?.equipo_id || "",
      equipo_nombre: row?.equipo_nombre || fallback?.equipo_nombre || "",
      work_order_title: isMeaningfulOrderTitle(row?.work_order_title)
        ? row?.work_order_title
        : fallback?.work_order_title || "Sin orden",

          
    };
  });
}

async function fetchRecords() {
  const endpoint = getCollectionEndpoint();
  if (!endpoint) {
    records.value = [];
    expandedAlertGroups.value = {};
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const rows = await listAll(endpoint);
    records.value = moduleConfig.value?.key === "alertas" ? await enrichAlertsWithRelations(rows) : rows;
    if (moduleConfig.value?.key === "alertas") {
      expandedAlertGroups.value = {};
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar registros.";
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.keys(form).forEach((k) => delete form[k]);
  Object.keys(jsonTextFields).forEach((k) => delete jsonTextFields[k]);
  for (const field of moduleConfig.value?.fields ?? []) {
    if (field.key === "status") form[field.key] = "ACTIVE";
    else if (field.type === "boolean") form[field.key] = false;
    else if (field.type === "json") {
      form[field.key] = defaultJsonValue(field);
      if (!field.editor) {
        jsonTextFields[field.key] = JSON.stringify(defaultJsonValue(field), null, 2);
      }
    }
    else if (field.type === "number") form[field.key] = "0";
    else form[field.key] = "";
  }
}

function getSelectOptions(field: EnhancedMaintenanceField) {
  if (field.options) return field.options;
  return relationOptions.value[field.key] ?? [];
}

function applyFormPatch(patch: Record<string, any>) {
  Object.assign(form, patch);
}

const visibleFields = computed(() => (moduleConfig.value?.fields ?? []).filter((field) => !field.hidden));

const headers = computed(() => {
  const cfg = moduleConfig.value;
  if (!cfg) return [];
  const base = visibleFields.value.slice(0, 6).map((f) => ({ title: repairText(f.label), key: f.key }));
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
    const dateA = new Date(a?.fecha_generada ?? 0).getTime();
    const dateB = new Date(b?.fecha_generada ?? 0).getTime();
    if (dateA !== dateB) return dateB - dateA;
    const keyA = getAlertGroupKey(a);
    const keyB = getAlertGroupKey(b);
    return keyA.localeCompare(keyB);
  });

  const groupedRows = new Map<string, any[]>();
  for (const row of sortedRows) {
    const key = getAlertGroupKey(row);
    const group = groupedRows.get(key) ?? [];
    group.push(row);
    groupedRows.set(key, group);
  }

  const groups = Array.from(groupedRows.entries())
    .map(([groupKey, groupRows]) => {
      const groupSorted = [...groupRows].sort((a, b) => new Date(b?.fecha_generada ?? 0).getTime() - new Date(a?.fecha_generada ?? 0).getTime());
      return { groupKey, rows: groupSorted };
    })
    .sort((a, b) => {
      const dateA = new Date(a.rows[0]?.fecha_generada ?? 0).getTime();
      const dateB = new Date(b.rows[0]?.fecha_generada ?? 0).getTime();
      return dateB - dateA;
    });

  return groups.flatMap(({ groupKey, rows: groupRows }, index) => {
    const [header, ...children] = groupRows;
    const expanded = expandedAlertGroups.value[groupKey] ?? true;

    const baseRow = {
      ...header,
      _alertGroupKey: groupKey,
      _alertGroupHeader: true,
      _alertGroupStart: true,
      _alertGroupEnd: !expanded,
      _alertGroupExpanded: expanded,
      _alertGroupIndex: index + 1,
      _alertChild: false,
    };

    if (!expanded) return [baseRow];

    const childRows = children.map((row, childIndex) => ({
      ...row,
      _alertGroupKey: groupKey,
      _alertGroupHeader: false,
      _alertGroupStart: false,
      _alertGroupEnd: childIndex === children.length - 1,
      _alertGroupExpanded: expanded,
      _alertGroupIndex: index + 1,
      _alertChild: true,
    }));

    return [baseRow, ...childRows];
  });
});

function showAlertGroupValue(item: any) {
  if (moduleConfig.value?.key !== "alertas") return true;
  return Boolean(item?._alertGroupHeader || item?._alertChild);
}

function toggleAlertGroup(item: any) {
  if (moduleConfig.value?.key !== "alertas") return;
  if (!item?._alertGroupHeader || !item?._alertGroupKey) return;
  expandedAlertGroups.value[item._alertGroupKey] = !expandedAlertGroups.value[item._alertGroupKey];
}

function getRowProps({ item }: { item: any }) {
  if (moduleConfig.value?.key !== "alertas") return {};
  const row = resolveTableItem(item);
  const index = row?._alertGroupIndex ?? 0;
  return {
    class: index % 2 === 0 ? "alert-group-row-even" : "alert-group-row-odd",
    onClick: () => toggleAlertGroup(row),
    style: row?._alertGroupHeader ? "cursor:pointer;" : "",
  };
}

function sanitizePayload() {
  const cfg = moduleConfig.value;
  const payload: Record<string, any> = {};
  if (!cfg) return payload;

  for (const field of cfg.fields) {
    if (field.sendInPayload === false) continue;
    let val = field.type === "json" && !field.editor && !field.hidden ? jsonTextFields[field.key] : form[field.key];
    if (field.type === "number") {
      val = val === "" || val === null || val === undefined ? "0" : String(val);
    }
    if (field.type === "text") {
      val = val === "" ? null : val;
    }
    if (field.type === "select" && val === "") {
      val = null;
    }
    if (field.type === "json") {
      val = parseJsonField(val, field);
      if (val === null) return null;
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
    const val = field.type === "json" && !field.editor && !field.hidden ? jsonTextFields[field.key] : form[field.key];
    if (field.type === "boolean") continue;

    if (field.editor === "file-upload") {
      if (!form.contenido_base64) {
        ui.error(`Debes seleccionar un archivo en ${repairText(field.label)}.`);
        return false;
      }
      continue;
    }

    if (field.type === "json" && field.jsonMode === "array" && Array.isArray(val) && !val.length) {
      ui.error(`Debes agregar al menos un item en ${repairText(field.label)}.`);
      return false;
    }

    if (val === "" || val === null || val === undefined) {
      ui.error(`El campo ${repairText(field.label)} es obligatorio.`);
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
    if (field.editor === "file-upload") {
      form[field.key] = {
        nombre: item.nombre ?? "",
        mime_type: item.mime_type ?? "",
      };
      continue;
    }

    if (field.type === "json" && !field.editor) {
      const serialized = String(serializeJsonValue(item[field.key], field));
      jsonTextFields[field.key] = serialized;
      form[field.key] = parseJsonField(serialized, field);
      continue;
    }

    form[field.key] = field.type === "json"
      ? serializeJsonValue(item[field.key], field)
      : item[field.key] ?? form[field.key];
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

:deep(.alert-tree-cell) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.alert-tree-root) {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

:deep(.alert-tree-toggle) {
  font-family: monospace;
  font-size: 12px;
}

:deep(.alert-tree-node) {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.alert-tree-branch) {
  font-family: monospace;
  color: rgba(0, 0, 0, 0.6);
}

:deep(.alert-group-row-odd td) {
  background-color: rgba(25, 118, 210, 0.04);
}

:deep(.alert-group-row-even td) {
  background-color: transparent;
}
</style>

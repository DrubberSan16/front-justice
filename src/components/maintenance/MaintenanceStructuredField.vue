<template>
  <div v-if="field.editor === 'string-list'" class="structured-field">
    <div class="text-subtitle-2 font-weight-medium mb-2">{{ repairText(field.label) }}</div>
    <div class="chip-list mb-3">
      <v-chip
        v-for="(item, index) in stringListValue"
        :key="`${field.key}-${index}-${item}`"
        closable
        size="small"
        @click:close="removeStringListItem(index)"
      >
        {{ item }}
      </v-chip>
      <div v-if="!stringListValue.length" class="text-body-2 text-medium-emphasis">Aun no hay items cargados.</div>
    </div>
    <div class="d-flex align-start" style="gap: 8px;">
      <v-text-field
        v-model="drafts[field.key]"
        :label="`Agregar ${repairText(field.label).toLowerCase()}`"
        variant="outlined"
        density="compact"
        hide-details
        @keydown.enter.prevent="addStringListItem"
      />
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addStringListItem">
        Agregar
      </v-btn>
    </div>
  </div>

  <div v-else-if="field.editor === 'procedure-activities'" class="structured-field">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 12px; flex-wrap: wrap;">
      <div>
        <div class="text-subtitle-2 font-weight-medium">{{ repairText(field.label) }}</div>
        <div class="text-body-2 text-medium-emphasis">Checklist, permisos, bloqueos y evidencias requeridas por actividad.</div>
      </div>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addProcedureActivity">
        Agregar actividad
      </v-btn>
    </div>

    <v-card v-for="(item, index) in procedureActivities" :key="`procedure-${index}`" rounded="lg" variant="outlined" class="pa-3 mb-3">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-subtitle-2 font-weight-medium">Actividad {{ index + 1 }}</div>
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeProcedureActivity(index)" />
      </div>

      <v-row dense>
        <v-col cols="12" md="2">
          <v-text-field :model-value="item.orden ?? index + 1" label="Orden" type="number" variant="outlined" density="compact" @update:model-value="updateProcedureActivity(index, 'orden', asNumber($event))" />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field :model-value="item.fase ?? ''" label="Fase" variant="outlined" density="compact" @update:model-value="updateProcedureActivity(index, 'fase', $event)" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field :model-value="item.actividad ?? ''" label="Actividad" variant="outlined" density="compact" @update:model-value="updateProcedureActivity(index, 'actividad', $event)" />
        </v-col>
        <v-col cols="12">
          <v-textarea :model-value="item.detalle ?? ''" label="Detalle operativo" variant="outlined" rows="2" auto-grow density="compact" @update:model-value="updateProcedureActivity(index, 'detalle', $event)" />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            :model-value="procedureFieldType(item)"
            :items="procedureFieldTypeOptions"
            item-title="title"
            item-value="value"
            label="Tipo de captura"
            variant="outlined"
            density="compact"
            @update:model-value="updateProcedureActivityConfig(index, 'field_type', $event)"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-checkbox
            :model-value="procedureRequired(item)"
            label="Registro obligatorio"
            hide-details
            @update:model-value="updateProcedureActivityConfig(index, 'required', $event)"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-checkbox :model-value="Boolean(item.requiere_permiso)" label="Requiere permiso" hide-details @update:model-value="updateProcedureActivity(index, 'requiere_permiso', $event)" />
        </v-col>
        <v-col cols="12" md="3">
          <v-checkbox :model-value="Boolean(item.requiere_epp)" label="Requiere EPP" hide-details @update:model-value="updateProcedureActivity(index, 'requiere_epp', $event)" />
        </v-col>
        <v-col cols="12" md="3">
          <v-checkbox :model-value="Boolean(item.requiere_bloqueo)" label="Requiere bloqueo" hide-details @update:model-value="updateProcedureActivity(index, 'requiere_bloqueo', $event)" />
        </v-col>
        <v-col cols="12" md="3">
          <v-checkbox :model-value="Boolean(item.requiere_evidencia)" label="Requiere evidencia" hide-details @update:model-value="updateProcedureActivity(index, 'requiere_evidencia', $event)" />
        </v-col>
        <v-col cols="12">
          <v-select
            :model-value="procedureEvidenceTypes(item)"
            :items="evidenceTypeOptions"
            item-title="title"
            item-value="value"
            label="Evidencia sugerida"
            variant="outlined"
            density="compact"
            multiple
            chips
            closable-chips
            @update:model-value="updateProcedureEvidence(index, $event)"
          />
        </v-col>
      </v-row>
    </v-card>

    <div v-if="!procedureActivities.length" class="text-body-2 text-medium-emphasis">Aun no hay actividades configuradas.</div>
  </div>

  <div v-else-if="field.editor === 'relation-multi-select'" class="structured-field">
    <div class="text-subtitle-2 font-weight-medium mb-2">{{ repairText(field.label) }}</div>
    <v-select
      :model-value="relationMultiSelectValue"
      :items="filteredRelationMultiSelectOptions"
      item-title="title"
      item-value="value"
      :label="repairText(field.label)"
      variant="outlined"
      density="comfortable"
      multiple
      chips
      closable-chips
      :disabled="requiresWarehouseSelection && !selectedWarehouseId"
      :hint="requiresWarehouseSelection && !selectedWarehouseId ? 'Selecciona primero la bodega.' : ''"
      persistent-hint
      @update:model-value="updateRelationMultiSelect"
    />
    <div v-if="relationMultiSelectValue.length" class="chip-list">
      <v-chip
        v-for="item in relationMultiSelectValue"
        :key="`${field.key}-${item}`"
        size="small"
        closable
        @click:close="removeRelationMultiSelectItem(item)"
      >
        {{ resolveRelationMultiSelectLabel(item) }}
      </v-chip>
    </div>
  </div>

  <div v-else-if="field.editor === 'analysis-details'" class="structured-field">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 12px; flex-wrap: wrap;">
      <div>
        <div class="text-subtitle-2 font-weight-medium">{{ repairText(field.label) }}</div>
        <div class="text-body-2 text-medium-emphasis">Registra cada parametro evaluado por compartimento.</div>
      </div>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addAnalysisDetail">
        Agregar detalle
      </v-btn>
    </div>

    <v-card v-for="(item, index) in analysisDetails" :key="`analysis-${index}`" rounded="lg" variant="outlined" class="pa-3 mb-3">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-subtitle-2 font-weight-medium">Parametro {{ index + 1 }}</div>
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeAnalysisDetail(index)" />
      </div>

      <v-row dense>
        <v-col cols="12" md="3">
          <v-text-field :model-value="item.compartimento ?? ''" label="Compartimento" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'compartimento', $event)" />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field :model-value="item.numero_muestra ?? ''" label="Numero muestra" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'numero_muestra', $event)" />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field :model-value="item.parametro ?? ''" label="Parametro" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'parametro', $event)" />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            :model-value="item.nivel_alerta ?? 'NORMAL'"
            :items="alertLevelOptions"
            item-title="title"
            item-value="value"
            label="Nivel alerta"
            variant="outlined"
            density="compact"
            @update:model-value="updateAnalysisDetail(index, 'nivel_alerta', $event)"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field :model-value="item.resultado_numerico ?? ''" label="Resultado numerico" type="number" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'resultado_numerico', asNullableNumber($event))" />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field :model-value="item.resultado_texto ?? ''" label="Resultado texto" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'resultado_texto', $event)" />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field :model-value="item.unidad ?? ''" label="Unidad" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'unidad', $event)" />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field :model-value="item.linea_base ?? ''" label="Linea base" type="number" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'linea_base', asNullableNumber($event))" />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field :model-value="item.tendencia ?? ''" label="Tendencia" type="number" variant="outlined" density="compact" @update:model-value="updateAnalysisDetail(index, 'tendencia', asNullableNumber($event))" />
        </v-col>
        <v-col cols="12">
          <v-textarea :model-value="item.observacion ?? ''" label="Observacion" variant="outlined" rows="2" auto-grow density="compact" @update:model-value="updateAnalysisDetail(index, 'observacion', $event)" />
        </v-col>
      </v-row>
    </v-card>

    <div v-if="!analysisDetails.length" class="text-body-2 text-medium-emphasis">Aun no hay detalles registrados.</div>
  </div>

  <div v-else-if="field.editor === 'analysis-payload'" class="structured-field">
    <div class="text-subtitle-2 font-weight-medium mb-3">{{ repairText(field.label) }}</div>
    <v-row dense>
      <v-col cols="12" md="4">
        <v-text-field :model-value="analysisPayload.laboratorio ?? ''" label="Laboratorio" variant="outlined" density="compact" @update:model-value="updateAnalysisPayload('laboratorio', $event)" />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field :model-value="analysisPayload.numero_informe ?? ''" label="Numero informe" variant="outlined" density="compact" @update:model-value="updateAnalysisPayload('numero_informe', $event)" />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field :model-value="analysisPayload.tecnico_responsable ?? ''" label="Tecnico responsable" variant="outlined" density="compact" @update:model-value="updateAnalysisPayload('tecnico_responsable', $event)" />
      </v-col>
      <v-col cols="12" md="4">
        <v-checkbox :model-value="Boolean(analysisPayload.requiere_accion)" label="Requiere accion" hide-details @update:model-value="updateAnalysisPayload('requiere_accion', $event)" />
      </v-col>
      <v-col cols="12" md="4">
        <v-select :model-value="analysisPayload.prioridad ?? 'MEDIA'" :items="priorityOptions" item-title="title" item-value="value" label="Prioridad" variant="outlined" density="compact" @update:model-value="updateAnalysisPayload('prioridad', $event)" />
      </v-col>
      <v-col cols="12" md="4">
        <v-file-input
          multiple
          show-size
          label="Adjuntos de referencia"
          variant="outlined"
          density="compact"
          prepend-icon="mdi-paperclip"
          @update:model-value="handleAnalysisAttachments"
        />
      </v-col>
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis mb-2">Banderas operativas</div>
        <div class="chip-list mb-3">
          <v-chip
            v-for="(item, index) in analysisFlags"
            :key="`flag-${index}-${item}`"
            closable
            size="small"
            color="warning"
            variant="tonal"
            @click:close="removeAnalysisFlag(index)"
          >
            {{ item }}
          </v-chip>
          <div v-if="!analysisFlags.length" class="text-body-2 text-medium-emphasis">No hay banderas cargadas.</div>
        </div>
        <div class="d-flex align-start" style="gap: 8px;">
          <v-text-field v-model="drafts[`${field.key}-flag`]" label="Agregar bandera" variant="outlined" density="compact" hide-details @keydown.enter.prevent="addAnalysisFlag" />
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addAnalysisFlag">Agregar</v-btn>
        </div>
      </v-col>
      <v-col cols="12">
        <v-textarea :model-value="analysisPayload.observaciones ?? ''" label="Observaciones auxiliares" variant="outlined" rows="2" auto-grow density="compact" @update:model-value="updateAnalysisPayload('observaciones', $event)" />
      </v-col>
    </v-row>

    <v-list v-if="analysisAttachments.length" density="compact" class="bg-transparent pa-0 mt-2">
      <v-list-item
        v-for="(item, index) in analysisAttachments"
        :key="`attachment-${index}-${item.nombre}`"
        :title="item.nombre"
        :subtitle="`${item.tipo || 'sin tipo'} · ${item.tamano_kb || 0} KB`"
        class="px-0"
      />
    </v-list>
  </div>

  <div v-else-if="field.editor === 'issue-items'" class="structured-field">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 12px; flex-wrap: wrap;">
      <div>
        <div class="text-subtitle-2 font-weight-medium">{{ repairText(field.label) }}</div>
        <div class="text-body-2 text-medium-emphasis">Selecciona material, bodega y cantidad por cada registro.</div>
      </div>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addIssueItem">
        Agregar item
      </v-btn>
    </div>

    <v-row v-for="(item, index) in issueItems" :key="`issue-${index}`" dense class="mb-1">
      <v-col cols="12" md="4">
        <v-select :model-value="item.bodega_id ?? null" :items="relationOptions.bodega_id ?? []" item-title="title" item-value="value" label="Bodega" variant="outlined" density="compact" @update:model-value="updateIssueItem(index, 'bodega_id', $event)" />
      </v-col>
      <v-col cols="12" md="5">
        <v-select :model-value="item.producto_id ?? null" :items="getIssueProductOptions(item.bodega_id)" item-title="title" item-value="value" label="Material" variant="outlined" density="compact" :disabled="!item.bodega_id" @update:model-value="updateIssueItem(index, 'producto_id', $event)" />
      </v-col>
      <v-col cols="10" md="2">
        <v-text-field :model-value="item.cantidad ?? 1" label="Cantidad" type="number" variant="outlined" density="compact" @update:model-value="updateIssueItem(index, 'cantidad', asNumber($event, 1))" />
      </v-col>
      <v-col cols="2" md="1" class="d-flex align-center justify-end">
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeIssueItem(index)" />
      </v-col>
    </v-row>

    <div v-if="!issueItems.length" class="text-body-2 text-medium-emphasis">Aun no hay materiales agregados.</div>
  </div>

  <div v-else-if="field.editor === 'file-upload'" class="structured-field">
    <div class="text-subtitle-2 font-weight-medium mb-2">{{ repairText(field.label) }}</div>
    <v-file-input
      show-size
      variant="outlined"
      density="compact"
      prepend-icon="mdi-paperclip"
      label="Selecciona un documento, imagen o video"
      @update:model-value="handleSingleFileUpload"
    />
    <div v-if="uploadedFileMeta?.nombre" class="text-caption text-medium-emphasis mt-2">
      {{ uploadedFileMeta.nombre }}<span v-if="uploadedFileMeta.mime_type"> · {{ uploadedFileMeta.mime_type }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import type { EnhancedMaintenanceField } from "@/app/config/maintenance-module-overrides";

type SelectOption = { value: any; title: string };
type AnyRow = Record<string, any>;

const props = defineProps<{
  field: EnhancedMaintenanceField;
  modelValue: any;
  relationOptions?: Record<string, SelectOption[]>;
  formState?: Record<string, any>;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: any): void;
  (event: "patch-form", value: Record<string, any>): void;
}>();

const drafts = reactive<Record<string, string>>({});

const evidenceTypeOptions = [
  { value: "DOCUMENTO", title: "Documento" },
  { value: "IMAGEN", title: "Imagen" },
  { value: "VIDEO", title: "Video" },
];

const alertLevelOptions = [
  { value: "NORMAL", title: "Normal" },
  { value: "OBSERVACION", title: "Observacion" },
  { value: "ALERTA", title: "Alerta" },
];

const priorityOptions = [
  { value: "BAJA", title: "Baja" },
  { value: "MEDIA", title: "Media" },
  { value: "ALTA", title: "Alta" },
];

const procedureFieldTypeOptions = [
  { value: "BOOLEAN", title: "Check / Cumple" },
  { value: "TEXT", title: "Texto" },
  { value: "NUMBER", title: "Numero" },
  { value: "JSON", title: "JSON / Evidencia" },
];

function repairText(value: unknown) {
  const text = String(value ?? "");
  try {
    return decodeURIComponent(escape(text));
  } catch {
    return text;
  }
}

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function emitValue(value: any) {
  emit("update:modelValue", cloneValue(value));
}

function asNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asNullableNumber(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

const stringListValue = computed<string[]>(() =>
  Array.isArray(props.modelValue) ? props.modelValue.map((item) => String(item)).filter(Boolean) : [],
);

const relationMultiSelectValue = computed<string[]>(() =>
  Array.isArray(props.modelValue)
    ? props.modelValue.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [],
);

const selectedWarehouseId = computed(() =>
  String(props.formState?.bodega_id ?? "").trim(),
);

const requiresWarehouseSelection = computed(() => props.field.key === "materiales");

const filteredRelationMultiSelectOptions = computed(() => {
  const options = relationOptions.value[props.field.key] ?? [];
  if (!requiresWarehouseSelection.value) return options;
  if (!selectedWarehouseId.value) return [];
  return options.filter(
    (item: AnyRow) => String(item?.bodegaId || "") === selectedWarehouseId.value,
  );
});

function addStringListItem() {
  const draft = String(drafts[props.field.key] ?? "").trim();
  if (!draft) return;
  emitValue([...stringListValue.value, draft]);
  drafts[props.field.key] = "";
}

function removeStringListItem(index: number) {
  emitValue(stringListValue.value.filter((_, currentIndex) => currentIndex !== index));
}

function updateRelationMultiSelect(value: any) {
  emitValue(Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : []);
}

const procedureActivities = computed<AnyRow[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []));

function addProcedureActivity() {
  emitValue([
    ...procedureActivities.value,
    {
      orden: procedureActivities.value.length + 1,
      fase: "",
      actividad: "",
      detalle: "",
      requiere_permiso: false,
      requiere_epp: false,
      requiere_bloqueo: false,
      requiere_evidencia: false,
      meta: { evidencias_requeridas: [], field_type: "BOOLEAN", required: true },
    },
  ]);
}

function updateProcedureActivity(index: number, key: string, value: any) {
  const next = cloneValue(procedureActivities.value);
  next[index] = { ...(next[index] ?? {}), [key]: value };
  emitValue(next);
}

function procedureEvidenceTypes(item: AnyRow) {
  return Array.isArray(item?.meta?.evidencias_requeridas) ? item.meta.evidencias_requeridas : [];
}

function procedureFieldType(item: AnyRow) {
  return String(item?.meta?.field_type || (item?.requiere_evidencia ? "JSON" : "BOOLEAN"));
}

function procedureRequired(item: AnyRow) {
  return typeof item?.meta?.required === "boolean" ? item.meta.required : true;
}

function updateProcedureEvidence(index: number, value: any) {
  const next = cloneValue(procedureActivities.value);
  const current = next[index] ?? {};
  current.meta = {
    ...(current.meta ?? {}),
    evidencias_requeridas: Array.isArray(value) ? value : [],
  };
  next[index] = current;
  emitValue(next);
}

function updateProcedureActivityConfig(index: number, key: string, value: any) {
  const next = cloneValue(procedureActivities.value);
  const current = next[index] ?? {};
  current.meta = {
    ...(current.meta ?? {}),
    [key]: key === "required" ? Boolean(value) : value,
  };
  if (key === "field_type" && String(value || "").toUpperCase() === "JSON") {
    current.requiere_evidencia = true;
  }
  next[index] = current;
  emitValue(next);
}

function removeProcedureActivity(index: number) {
  emitValue(procedureActivities.value.filter((_, currentIndex) => currentIndex !== index));
}

const analysisDetails = computed<AnyRow[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []));

function addAnalysisDetail() {
  emitValue([
    ...analysisDetails.value,
    {
      compartimento: "",
      numero_muestra: "",
      parametro: "",
      resultado_numerico: null,
      resultado_texto: "",
      unidad: "",
      linea_base: null,
      nivel_alerta: "NORMAL",
      tendencia: null,
      observacion: "",
    },
  ]);
}

function updateAnalysisDetail(index: number, key: string, value: any) {
  const next = cloneValue(analysisDetails.value);
  next[index] = { ...(next[index] ?? {}), [key]: value };
  emitValue(next);
}

function removeAnalysisDetail(index: number) {
  emitValue(analysisDetails.value.filter((_, currentIndex) => currentIndex !== index));
}

const analysisPayload = computed<AnyRow>(() => ({
  laboratorio: "",
  numero_informe: "",
  tecnico_responsable: "",
  requiere_accion: false,
  prioridad: "MEDIA",
  observaciones: "",
  banderas: [],
  adjuntos: [],
  ...(props.modelValue && typeof props.modelValue === "object" && !Array.isArray(props.modelValue) ? props.modelValue : {}),
}));

const analysisFlags = computed<string[]>(() =>
  Array.isArray(analysisPayload.value.banderas) ? analysisPayload.value.banderas.map((item) => String(item)).filter(Boolean) : [],
);

const analysisAttachments = computed<AnyRow[]>(() =>
  Array.isArray(analysisPayload.value.adjuntos) ? analysisPayload.value.adjuntos : [],
);

function updateAnalysisPayload(key: string, value: any) {
  emitValue({
    ...analysisPayload.value,
    [key]: value,
  });
}

function addAnalysisFlag() {
  const draft = String(drafts[`${props.field.key}-flag`] ?? "").trim();
  if (!draft) return;
  updateAnalysisPayload("banderas", [...analysisFlags.value, draft]);
  drafts[`${props.field.key}-flag`] = "";
}

function removeAnalysisFlag(index: number) {
  updateAnalysisPayload(
    "banderas",
    analysisFlags.value.filter((_, currentIndex) => currentIndex !== index),
  );
}

function classifyAttachment(type: string) {
  if (type.startsWith("image/")) return "IMAGEN";
  if (type.startsWith("video/")) return "VIDEO";
  return "DOCUMENTO";
}

function handleAnalysisAttachments(value: File[] | File | null) {
  const files = Array.isArray(value) ? value : value ? [value] : [];
  const attachments = files.map((file) => ({
    nombre: file.name,
    tipo: file.type || classifyAttachment(file.type || ""),
    categoria: classifyAttachment(file.type || ""),
    tamano_kb: Math.round(file.size / 1024),
  }));
  updateAnalysisPayload("adjuntos", attachments);
}

const issueItems = computed<AnyRow[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const relationOptions = computed(() => props.relationOptions ?? {});

function resolveRelationMultiSelectLabel(value: unknown) {
  const key = String(value ?? "").trim();
  return (
    filteredRelationMultiSelectOptions.value.find(
      (item) => String(item.value) === key,
    )?.title ||
    relationOptions.value[props.field.key]?.find((item) => String(item.value) === key)?.title ||
    key
  );
}

function removeRelationMultiSelectItem(value: unknown) {
  const key = String(value ?? "").trim();
  emitValue(relationMultiSelectValue.value.filter((item) => item !== key));
}

function addIssueItem() {
  emitValue([...issueItems.value, { producto_id: null, bodega_id: null, cantidad: 1 }]);
}

function updateIssueItem(index: number, key: string, value: any) {
  const next = cloneValue(issueItems.value);
  next[index] = { ...(next[index] ?? {}), [key]: value };
  if (key === "bodega_id") {
    const validForWarehouse = getIssueProductOptions(value).some(
      (option) => String(option.value) === String(next[index]?.producto_id ?? ""),
    );
    if (!validForWarehouse) {
      next[index].producto_id = null;
    }
  }
  emitValue(next);
}

function getIssueProductOptions(bodegaId: unknown) {
  const warehouseId = String(bodegaId ?? "").trim();
  if (!warehouseId) return [];
  return (relationOptions.value.producto_id ?? []).filter(
    (item: AnyRow) => String(item?.bodegaId || "") === warehouseId,
  );
}

function removeIssueItem(index: number) {
  emitValue(issueItems.value.filter((_, currentIndex) => currentIndex !== index));
}

const uploadedFileMeta = computed<AnyRow>(() =>
  props.modelValue && typeof props.modelValue === "object" && !Array.isArray(props.modelValue) ? props.modelValue : {},
);

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] || "" : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function handleSingleFileUpload(value: File[] | File | null) {
  const file = Array.isArray(value) ? value[0] : value;
  if (!file) {
    emitValue({});
    emit("patch-form", {
      nombre: "",
      contenido_base64: "",
      mime_type: "",
      meta: {},
    });
    return;
  }

  const base64 = await fileToBase64(file);
  const metadata = {
    nombre: file.name,
    mime_type: file.type || "",
    tamano_kb: Math.round(file.size / 1024),
  };

  emitValue(metadata);
  emit("patch-form", {
    nombre: file.name,
    contenido_base64: base64,
    mime_type: file.type || "",
    meta: metadata,
  });
}
</script>

<style scoped>
.structured-field {
  display: grid;
  gap: 8px;
}

.chip-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

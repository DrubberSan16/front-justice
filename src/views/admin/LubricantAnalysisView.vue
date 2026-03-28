<template>
  <div class="lubricant-page">
    <v-card rounded="xl" class="pa-5 enterprise-surface">
      <div class="d-flex align-center justify-space-between page-wrap">
        <div>
          <div class="text-h6 font-weight-bold">Analisis de lubricante</div>
          <div class="text-body-2 text-medium-emphasis">
            Registro guiado de muestras, tendencias y dashboard predictivo por lubricante.
          </div>
        </div>
        <div class="d-flex page-wrap" style="gap: 8px;">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
            Nuevo analisis
          </v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="loadAll">
            Actualizar
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <v-row dense class="mt-3">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="tableSearch"
            label="Buscar analisis"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            hint="Busca por codigo, lubricante, marca o compartimento"
            persistent-hint
            clearable
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="statusFilter"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="Estado"
            variant="outlined"
            density="compact"
            clearable
          />
        </v-col>
        <v-col cols="12" md="5">
          <v-autocomplete
            v-model="dashboardSelection"
            :items="catalogOptions"
            item-title="label"
            return-object
            clearable
            label="Dashboard por lubricante"
            variant="outlined"
            density="compact"
            hint="Selecciona un lubricante para abrir su historial tipo excel"
            persistent-hint
            @update:model-value="handleDashboardSelection"
          />
        </v-col>
      </v-row>

      <div class="summary-strip mt-2">
        <v-chip color="primary" variant="tonal" label>
          {{ analyses.length }} analisis
        </v-chip>
        <v-chip color="secondary" variant="tonal" label>
          {{ catalogOptions.length }} lubricantes registrados
        </v-chip>
        <v-chip color="error" variant="tonal" label>
          {{ alertCount }} alertas
        </v-chip>
      </div>
    </v-card>

    <v-card rounded="xl" class="pa-4 enterprise-surface">
      <v-data-table
        :headers="headers"
        :items="filteredAnalyses"
        :loading="loading"
        :items-per-page="15"
        class="enterprise-table"
      >
        <template #item.lubricante="{ item }">
          <div class="font-weight-medium">{{ item.lubricante || "Sin lubricante" }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.marca_lubricante || "Sin marca" }}</div>
        </template>
        <template #item.estado_diagnostico="{ item }">
          <v-chip size="small" :color="conditionColor(item.estado_diagnostico)" variant="tonal">
            {{ item.estado_diagnostico || "NORMAL" }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex" style="gap: 4px;">
            <v-btn icon="mdi-chart-line" variant="text" @click="viewDashboard(item)" />
            <v-btn icon="mdi-pencil" variant="text" @click="openEdit(item)" />
            <v-btn icon="mdi-delete" variant="text" color="error" @click="openDelete(item)" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-card rounded="xl" class="pa-5 enterprise-surface">
      <div class="d-flex align-center justify-space-between page-wrap mb-4">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Dashboard historico</div>
          <div class="text-body-2 text-medium-emphasis">
            Replica operativa del excel con historial de muestras, tablas por bloque y graficos de tendencia.
          </div>
        </div>
        <div class="d-flex page-wrap" style="gap: 8px;">
          <v-select
            v-model="dashboardPeriod"
            :items="periodOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 150px;"
            @update:model-value="reloadDashboard"
          />
          <v-text-field
            v-model="dashboardFrom"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            label="Desde"
            style="min-width: 160px;"
            @change="reloadDashboard"
          />
          <v-text-field
            v-model="dashboardTo"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            label="Hasta"
            style="min-width: 160px;"
            @change="reloadDashboard"
          />
          <v-select
            v-model="dashboardCompartimento"
            :items="compartmentOptions"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            label="Compartimento"
            style="min-width: 220px;"
            @update:model-value="reloadDashboard"
          />
        </div>
      </div>

      <LubricantDashboardPanel
        :dashboard="dashboard"
        :loading="dashboardLoading"
        :error="dashboardError"
      />
    </v-card>

    <v-dialog v-model="dialog" max-width="1400">
      <v-card rounded="xl" class="enterprise-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ editingId ? "Editar" : "Crear" }} analisis de lubricante
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4 section-surface">
          <v-row dense>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.codigo" label="Codigo autogenerado" variant="outlined" readonly :loading="codeLoading" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.cliente" label="Cliente" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.equipo_id"
                :items="equipmentOptions"
                item-title="title"
                item-value="value"
                label="Equipo"
                variant="outlined"
                clearable
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.compartimento_principal"
                :items="compartmentOptions"
                label="Compartimento principal"
                variant="outlined"
                @update:model-value="handleCompartmentChange"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-combobox
                v-model="lubricantSelection"
                v-model:search="lubricantSearch"
                :items="catalogOptions"
                item-title="label"
                return-object
                clearable
                label="Lubricante"
                variant="outlined"
                hint="Escribe el codigo o nombre del lubricante para autocompletar registros previos"
                persistent-hint
                @update:model-value="handleLubricantSelection"
                @update:search="handleLubricantSearch"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.marca_lubricante" label="Marca de lubricante" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.estado_diagnostico"
                :items="statusOptions"
                item-title="title"
                item-value="value"
                label="Estado diagnostico"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold mb-2">Informacion de la muestra</div>
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.numero_muestra" label="Numero de muestra" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_muestra" type="date" label="Fecha de muestra" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_ingreso" type="date" label="Fecha de ingreso" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_reporte" type="date" label="Fecha de reporte" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_informe" type="date" label="Fecha de informe" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model.number="form.horas_equipo" type="number" label="Equipo hrs / km" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model.number="form.horas_lubricante" type="number" label="Aceite hrs / km" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.condicion"
                :items="statusOptions"
                item-title="title"
                item-value="value"
                label="Condicion"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.equipo_marca" label="Marca del equipo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.equipo_serie" label="Serie" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.equipo_modelo" label="Modelo" variant="outlined" />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="form.diagnostico"
                label="Diagnostico de la ultima muestra"
                variant="outlined"
                rows="3"
                auto-grow
              />
            </v-col>

            <v-col cols="12">
              <div class="d-flex align-center justify-space-between mb-2 page-wrap">
                <div class="text-subtitle-2 font-weight-bold">Parametros del reporte</div>
                <div class="d-flex page-wrap" style="gap: 8px;">
                  <v-btn variant="tonal" prepend-icon="mdi-table-refresh" @click="applyDetailTemplate">
                    Cargar plantilla del compartimento
                  </v-btn>
                  <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addDetail">
                    Agregar parametro
                  </v-btn>
                </div>
              </div>

              <v-expansion-panels multiple variant="accordion">
                <v-expansion-panel
                  v-for="group in groupedFormDetails"
                  :key="group.group"
                  :title="group.group"
                >
                  <v-expansion-panel-text>
                    <div class="detail-grid">
                      <div v-for="(detail, index) in group.items" :key="`${group.group}-${index}-${detail.parametro}`" class="detail-card">
                        <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px;">
                          <div class="font-weight-medium">{{ detail.parametro }}</div>
                          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeDetail(detail)" />
                        </div>
                        <v-row dense>
                          <v-col cols="12" md="5">
                            <v-text-field v-model="detail.parametro" label="Parametro" variant="outlined" density="compact" />
                          </v-col>
                          <v-col cols="12" md="2">
                            <v-text-field v-model="detail.unidad" label="Unidad" variant="outlined" density="compact" />
                          </v-col>
                          <v-col cols="12" md="2">
                            <v-text-field v-model.number="detail.linea_base" type="number" label="Linea base" variant="outlined" density="compact" />
                          </v-col>
                          <v-col cols="12" md="3">
                            <v-select
                              v-model="detail.nivel_alerta"
                              :items="statusOptions"
                              item-title="title"
                              item-value="value"
                              label="Estado"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>
                          <v-col cols="12" md="4">
                            <v-text-field v-model.number="detail.resultado_numerico" type="number" label="Resultado numerico" variant="outlined" density="compact" />
                          </v-col>
                          <v-col cols="12" md="4">
                            <v-text-field v-model="detail.resultado_texto" label="Resultado texto" variant="outlined" density="compact" />
                          </v-col>
                          <v-col cols="12" md="4">
                            <v-text-field v-model.number="detail.tendencia" type="number" label="Tendencia" variant="outlined" density="compact" />
                          </v-col>
                          <v-col cols="12">
                            <v-textarea v-model="detail.observacion" label="Observacion" variant="outlined" rows="2" auto-grow density="compact" />
                          </v-col>
                        </v-row>
                      </div>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card rounded="xl" class="enterprise-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar analisis</v-card-title>
        <v-card-text>Se eliminara el analisis seleccionado.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="confirmDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import {
  buildLubricantDetailTemplate,
  groupLubricantDetails,
  lubricantCompartments,
} from "@/app/config/lubricant-analysis";

type AnyRow = Record<string, any>;

const ui = useUiStore();

const loading = ref(false);
const saving = ref(false);
const codeLoading = ref(false);
const dashboardLoading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const error = ref<string | null>(null);
const dashboardError = ref<string | null>(null);
const analyses = ref<AnyRow[]>([]);
const dashboard = ref<AnyRow | null>(null);
const equipments = ref<AnyRow[]>([]);
const catalog = ref<AnyRow[]>([]);
const lubricantSearch = ref("");
const lubricantSelection = ref<any>(null);
const dashboardSelection = ref<any>(null);
const tableSearch = ref("");
const statusFilter = ref<string | null>(null);
const dashboardPeriod = ref("MENSUAL");
const dashboardFrom = ref("");
const dashboardTo = ref("");
const dashboardCompartimento = ref<string | null>(null);

const headers = [
  { title: "Codigo", key: "codigo" },
  { title: "Lubricante", key: "lubricante" },
  { title: "Compartimento", key: "compartimento_principal" },
  { title: "Estado", key: "estado_diagnostico" },
  { title: "Fecha reporte", key: "fecha_reporte" },
  { title: "Acciones", key: "actions", sortable: false },
];

const statusOptions = [
  { value: "NORMAL", title: "Normal" },
  { value: "OBSERVACION", title: "Observacion" },
  { value: "ALERTA", title: "Alerta" },
];

const periodOptions = [
  { value: "SEMANAL", title: "Semanal" },
  { value: "MENSUAL", title: "Mensual" },
  { value: "ANUAL", title: "Anual" },
  { value: "PERSONALIZADO", title: "Personalizado" },
];

const form = reactive({
  codigo: "",
  cliente: "JUSTICE COMPANY",
  equipo_id: null as string | null,
  lubricante: "",
  marca_lubricante: "",
  compartimento_principal: "MOTOR",
  fecha_muestra: "",
  fecha_ingreso: "",
  fecha_reporte: "",
  fecha_informe: "",
  numero_muestra: "",
  horas_equipo: null as number | null,
  horas_lubricante: null as number | null,
  condicion: "NORMAL",
  equipo_marca: "",
  equipo_serie: "",
  equipo_modelo: "",
  diagnostico: "",
  estado_diagnostico: "NORMAL",
  documento_origen: "",
  detalles: [] as AnyRow[],
});

const compartmentOptions = lubricantCompartments;

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

const equipmentOptions = computed(() =>
  equipments.value.map((item) => ({
    value: item.id,
    title: `${item.codigo || "EQ"} - ${item.nombre || "Equipo"}`,
  })),
);

const catalogOptions = computed(() =>
  catalog.value.map((item) => ({
    ...item,
    label: [item.lubricante_codigo, item.lubricante, item.marca_lubricante].filter(Boolean).join(" · "),
  })),
);

const filteredAnalyses = computed(() => {
  const search = String(tableSearch.value || "").trim().toLowerCase();
  return analyses.value.filter((item) => {
    if (statusFilter.value && item.estado_diagnostico !== statusFilter.value) return false;
    if (!search) return true;
    return [
      item.codigo,
      item.lubricante,
      item.marca_lubricante,
      item.compartimento_principal,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
});

const alertCount = computed(
  () => analyses.value.filter((item) => item.estado_diagnostico === "ALERTA").length,
);

const groupedFormDetails = computed(() => groupLubricantDetails(form.detalles));

function conditionColor(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (["ALERTA", "ANORMAL", "CRITICO"].includes(raw)) return "error";
  if (["OBSERVACION", "PRECAUCION", "WARNING"].includes(raw)) return "warning";
  return "success";
}

function resetForm() {
  editingId.value = null;
  lubricantSelection.value = null;
  Object.assign(form, {
    codigo: "",
    cliente: "JUSTICE COMPANY",
    equipo_id: null,
    lubricante: "",
    marca_lubricante: "",
    compartimento_principal: "MOTOR",
    fecha_muestra: "",
    fecha_ingreso: "",
    fecha_reporte: "",
    fecha_informe: "",
    numero_muestra: "",
    horas_equipo: null,
    horas_lubricante: null,
    condicion: "NORMAL",
    equipo_marca: "",
    equipo_serie: "",
    equipo_modelo: "",
    diagnostico: "",
    estado_diagnostico: "NORMAL",
    documento_origen: "",
    detalles: buildLubricantDetailTemplate("MOTOR"),
  });
}

async function loadAnalyses() {
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante");
  analyses.value = unwrap(data, []);
}

async function loadCatalog(search = "") {
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/catalog", {
    params: search ? { search } : undefined,
  });
  catalog.value = unwrap(data, []);
}

async function loadEquipments() {
  const { data } = await api.get("/kpi_maintenance/equipos");
  equipments.value = unwrap(data, []);
}

async function loadAll() {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([loadAnalyses(), loadCatalog(), loadEquipments()]);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar el modulo de lubricantes.";
  } finally {
    loading.value = false;
  }
}

async function assignCode() {
  codeLoading.value = true;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/next-code");
    const resolved = unwrap<any>(data, {});
    form.codigo = resolved?.code || "";
  } finally {
    codeLoading.value = false;
  }
}

function applyDetailTemplate() {
  form.detalles = buildLubricantDetailTemplate(form.compartimento_principal || "GENERAL");
}

function handleCompartmentChange() {
  if (!form.detalles.length) {
    applyDetailTemplate();
  } else {
    form.detalles = form.detalles.map((item) => ({
      ...item,
      compartimento: form.compartimento_principal || "GENERAL",
    }));
  }
}

function addDetail() {
  form.detalles.push({
    compartimento: form.compartimento_principal || "GENERAL",
    parametro: "",
    unidad: "",
    linea_base: null,
    resultado_numerico: null,
    resultado_texto: "",
    nivel_alerta: "NORMAL",
    tendencia: null,
    observacion: "",
    orden: form.detalles.length + 1,
  });
}

function removeDetail(target: AnyRow) {
  form.detalles = form.detalles.filter((item) => item !== target);
}

async function openCreate() {
  resetForm();
  dialog.value = true;
  await assignCode();
}

function fillFormFromAnalysis(item: AnyRow) {
  const sample = item.sample_info ?? {};
  Object.assign(form, {
    codigo: item.codigo || "",
    cliente: item.cliente || "JUSTICE COMPANY",
    equipo_id: item.equipo_id || null,
    lubricante: item.lubricante || "",
    marca_lubricante: item.marca_lubricante || "",
    compartimento_principal: item.compartimento_principal || "MOTOR",
    fecha_muestra: item.fecha_muestra || "",
    fecha_ingreso: sample.fecha_ingreso || "",
    fecha_reporte: item.fecha_reporte || "",
    fecha_informe: sample.fecha_informe || "",
    numero_muestra: sample.numero_muestra || "",
    horas_equipo: sample.horas_equipo ?? null,
    horas_lubricante: sample.horas_lubricante ?? null,
    condicion: sample.condicion || item.estado_diagnostico || "NORMAL",
    equipo_marca: sample.equipo_marca || "",
    equipo_serie: sample.equipo_serie || "",
    equipo_modelo: sample.equipo_modelo || "",
    diagnostico: item.diagnostico || "",
    estado_diagnostico: item.estado_diagnostico || "NORMAL",
    documento_origen: item.documento_origen || "",
    detalles: (item.detalles ?? []).map((detail: AnyRow) => ({ ...detail })),
  });
}

function openEdit(item: AnyRow) {
  editingId.value = item.id;
  fillFormFromAnalysis(item);
  lubricantSelection.value = item.lubricante
    ? {
        lubricante: item.lubricante,
        marca_lubricante: item.marca_lubricante,
        lubricante_codigo: item.lubricante_codigo,
        label: [item.lubricante_codigo, item.lubricante, item.marca_lubricante].filter(Boolean).join(" · "),
      }
    : null;
  dialog.value = true;
}

function openDelete(item: AnyRow) {
  deletingId.value = item.id;
  deleteDialog.value = true;
}

function handleLubricantSelection(value: any) {
  if (!value) {
    form.lubricante = "";
    return;
  }
  if (typeof value === "string") {
    form.lubricante = value;
    lubricantSelection.value = value;
    return;
  }
  form.lubricante = value.lubricante || "";
  form.marca_lubricante = value.marca_lubricante || form.marca_lubricante;
  lubricantSelection.value = value;
}

async function handleLubricantSearch(value: string) {
  lubricantSearch.value = value;
  if (String(value || "").trim().length >= 2) {
    await loadCatalog(value);
  }
}

async function save() {
  saving.value = true;
  try {
    const payload = {
      codigo: form.codigo,
      cliente: form.cliente,
      equipo_id: form.equipo_id,
      lubricante: form.lubricante,
      marca_lubricante: form.marca_lubricante,
      compartimento_principal: form.compartimento_principal,
      fecha_muestra: form.fecha_muestra || null,
      fecha_reporte: form.fecha_reporte || null,
      diagnostico: form.diagnostico,
      estado_diagnostico: form.estado_diagnostico,
      documento_origen: form.documento_origen || null,
      payload_json: {
        sample_info: {
          numero_muestra: form.numero_muestra || null,
          fecha_ingreso: form.fecha_ingreso || null,
          fecha_informe: form.fecha_informe || null,
          horas_equipo: form.horas_equipo,
          horas_lubricante: form.horas_lubricante,
          condicion: form.condicion,
          equipo_marca: form.equipo_marca || null,
          equipo_serie: form.equipo_serie || null,
          equipo_modelo: form.equipo_modelo || null,
        },
      },
      detalles: form.detalles.map((detail) => ({
        compartimento: detail.compartimento || form.compartimento_principal,
        parametro: detail.parametro,
        unidad: detail.unidad || null,
        linea_base: detail.linea_base ?? null,
        resultado_numerico: detail.resultado_numerico ?? null,
        resultado_texto: detail.resultado_texto || null,
        nivel_alerta: detail.nivel_alerta || "NORMAL",
        tendencia: detail.tendencia ?? null,
        observacion: detail.observacion || null,
        orden: detail.orden ?? null,
      })),
    };

    if (editingId.value) {
      await api.patch(`/kpi_maintenance/inteligencia/analisis-lubricante/${editingId.value}`, payload);
      ui.success("Analisis de lubricante actualizado.");
    } else {
      const { data } = await api.post("/kpi_maintenance/inteligencia/analisis-lubricante", payload);
      const created = unwrap<any>(data, {});
      if (created?.code_was_reassigned) {
        ui.open(`El codigo fue reasignado automaticamente a ${created.codigo}.`, "warning");
      } else {
        ui.success("Analisis de lubricante creado.");
      }
    }

    dialog.value = false;
    await loadAll();
    if (form.lubricante) {
      await loadDashboard({ lubricante: form.lubricante });
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar el analisis.");
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!deletingId.value) return;
  saving.value = true;
  try {
    await api.delete(`/kpi_maintenance/inteligencia/analisis-lubricante/${deletingId.value}`);
    ui.success("Analisis de lubricante eliminado.");
    deleteDialog.value = false;
    deletingId.value = null;
    await loadAll();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar el analisis.");
  } finally {
    saving.value = false;
  }
}

async function loadDashboard(overrides?: Record<string, any>) {
  dashboardLoading.value = true;
  dashboardError.value = null;
  try {
    const params = {
      periodo: dashboardPeriod.value,
      from: dashboardFrom.value || undefined,
      to: dashboardTo.value || undefined,
      compartimento: dashboardCompartimento.value || undefined,
      ...(overrides ?? {}),
    };
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", { params });
    dashboard.value = unwrap(data, null);
  } catch (e: any) {
    dashboardError.value = e?.response?.data?.message || "No se pudo generar el dashboard del lubricante.";
  } finally {
    dashboardLoading.value = false;
  }
}

async function handleDashboardSelection(value: any) {
  if (!value) {
    dashboard.value = null;
    return;
  }
  await loadDashboard({
    lubricante: value.lubricante || value.label,
    marca_lubricante: value.marca_lubricante || undefined,
  });
}

async function viewDashboard(item: AnyRow) {
  dashboardSelection.value = {
    lubricante: item.lubricante,
    marca_lubricante: item.marca_lubricante,
    lubricante_codigo: item.lubricante_codigo,
    label: [item.lubricante_codigo, item.lubricante, item.marca_lubricante].filter(Boolean).join(" · "),
  };
  await loadDashboard({ codigo: item.codigo });
}

async function reloadDashboard() {
  if (!dashboardSelection.value && !dashboard.value?.selected?.lubricante) return;
  await loadDashboard({
    lubricante:
      dashboardSelection.value?.lubricante || dashboard.value?.selected?.lubricante,
    marca_lubricante:
      dashboardSelection.value?.marca_lubricante ||
      dashboard.value?.selected?.marca_lubricante,
  });
}

onMounted(async () => {
  await loadAll();
});
</script>

<style scoped>
.lubricant-page {
  display: grid;
  gap: 20px;
}

.page-wrap {
  gap: 12px;
  flex-wrap: wrap;
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  gap: 12px;
}

.detail-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: rgba(255, 255, 255, 0.45);
}
</style>

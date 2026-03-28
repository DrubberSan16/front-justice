<template>
  <div class="lubricant-page">
    <v-card rounded="xl" class="pa-5 enterprise-surface">
      <div class="d-flex align-center justify-space-between page-wrap">
        <div>
          <div class="text-h6 font-weight-bold">Analisis de lubricante</div>
          <div class="text-body-2 text-medium-emphasis">
            Captura operativa alineada al formato del reporte de laboratorio.
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
            :items="conditionOptions"
            item-title="title"
            item-value="value"
            label="Condicion"
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
            hint="Selecciona un lubricante por codigo o nombre para ver su historial"
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
          {{ alertCount }} anormales
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
          <div class="text-caption text-medium-emphasis">
            {{ item.marca_lubricante || "Sin marca del lubricante" }}
          </div>
        </template>
        <template #item.estado_diagnostico="{ item }">
          <v-chip size="small" :color="conditionColor(item.estado_diagnostico)" variant="tonal">
            {{ item.estado_diagnostico || item.sample_info?.condicion || "N/D" }}
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
            Historial, evaluacion de la ultima muestra y tendencias por rango de fechas.
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
              <v-text-field
                v-model="form.codigo"
                label="Codigo autogenerado"
                variant="outlined"
                readonly
                :loading="codeLoading"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.cliente" label="Nombre del cliente" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.compartimento_principal"
                :items="compartmentOptions"
                label="Compartimento"
                variant="outlined"
                @update:model-value="handleCompartmentChange"
              />
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
              <v-text-field v-model="form.equipo_marca" label="Marca" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.equipo_serie" label="Serie" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.equipo_modelo" label="Modelo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.condicion"
                :items="conditionOptions"
                item-title="title"
                item-value="value"
                label="Condicion"
                variant="outlined"
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
            <v-col cols="12" md="6">
              <v-text-field v-model="form.marca_lubricante" label="Marca del lubricante" variant="outlined" />
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold mb-2">Informacion de la muestra</div>
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.numero_muestra" label="Numeracion de muestra" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_muestra" type="date" label="Fecha de muestreo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_ingreso" type="date" label="Fecha de ingreso" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_reporte" type="date" label="Fecha de informe" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model.number="form.horas_equipo" type="number" label="Equipo Hrs/Km" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model.number="form.horas_lubricante" type="number" label="Aceite Hrs/Km" variant="outlined" />
            </v-col>

            <v-col cols="12">
              <div class="d-flex align-center justify-space-between mb-2 page-wrap">
                <div class="text-subtitle-2 font-weight-bold">Parametros del reporte</div>
                <v-btn variant="tonal" prepend-icon="mdi-table-refresh" @click="applyDetailTemplate">
                  Recargar plantilla
                </v-btn>
              </div>

              <v-expansion-panels multiple variant="accordion">
                <v-expansion-panel
                  v-for="group in groupedFormDetails"
                  :key="group.group"
                  :title="group.group"
                >
                  <v-expansion-panel-text>
                    <div class="detail-grid">
                      <div
                        v-for="detail in group.items"
                        :key="`${group.group}-${detail.parametro_key || detail.parametro}`"
                        class="detail-card"
                      >
                        <div class="detail-card__title">
                          <div class="font-weight-medium">{{ detail.parametro }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ detail.unidad || "Resultado" }}
                          </div>
                        </div>

                        <v-select
                          v-if="detail.inputType === 'select'"
                          v-model="detail.resultado_texto"
                          :items="detail.options || humidityValueOptions"
                          label="Resultado"
                          variant="outlined"
                          density="compact"
                        />
                        <v-text-field
                          v-else-if="detail.inputType === 'text'"
                          v-model="detail.resultado_texto"
                          label="Resultado"
                          variant="outlined"
                          density="compact"
                        />
                        <v-text-field
                          v-else
                          v-model.number="detail.resultado_numerico"
                          type="number"
                          label="Resultado"
                          variant="outlined"
                          density="compact"
                        />
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
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import {
  groupLubricantDetails,
  humidityOptions,
  lubricantCompartments,
  lubricantConditionOptions,
  getLubricantParameterTemplate,
  mergeLubricantDetails,
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
const brands = ref<AnyRow[]>([]);
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
  { title: "Condicion", key: "estado_diagnostico" },
  { title: "Fecha informe", key: "fecha_reporte" },
  { title: "Acciones", key: "actions", sortable: false },
];

const conditionOptions = lubricantConditionOptions;
const compartmentOptions = lubricantCompartments;
const humidityValueOptions = humidityOptions.map((item) => item.value);

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
  numero_muestra: "",
  horas_equipo: null as number | null,
  horas_lubricante: null as number | null,
  condicion: "NORMAL",
  equipo_marca: "",
  equipo_serie: "",
  equipo_modelo: "",
  detalles: [] as AnyRow[],
});

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

const brandMap = computed(() => {
  const next = new Map<string, AnyRow>();
  for (const item of brands.value) {
    if (item?.id) next.set(String(item.id), item);
  }
  return next;
});

const equipmentMap = computed(() => {
  const next = new Map<string, AnyRow>();
  for (const item of equipments.value) {
    if (item?.id) next.set(String(item.id), item);
  }
  return next;
});

function resolveEquipmentBrand(item: AnyRow | null | undefined) {
  if (!item) return "";
  return (
    String(item.marca_nombre ?? item.brand_name ?? "").trim() ||
    String(brandMap.value.get(String(item.marca_id))?.nombre ?? "").trim() ||
    ""
  );
}

const equipmentOptions = computed(() =>
  equipments.value.map((item) => ({
    value: item.id,
    title: `${item.codigo || "EQ"} - ${item.nombre || "Equipo"}`,
    marca: resolveEquipmentBrand(item),
  })),
);

const catalogOptions = computed(() =>
  catalog.value.map((item) => ({
    ...item,
    label: [item.ultimo_codigo || item.lubricante_codigo, item.lubricante, item.marca_lubricante]
      .filter(Boolean)
      .join(" · "),
  })),
);

const filteredAnalyses = computed(() => {
  const search = String(tableSearch.value || "").trim().toLowerCase();
  return analyses.value.filter((item) => {
    const condition = item.sample_info?.condicion || item.estado_diagnostico;
    if (statusFilter.value && condition !== statusFilter.value) return false;
    if (!search) return true;
    return [
      item.codigo,
      item.lubricante,
      item.marca_lubricante,
      item.compartimento_principal,
      item.sample_info?.numero_muestra,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
});

const alertCount = computed(
  () =>
    analyses.value.filter(
      (item) => (item.sample_info?.condicion || item.estado_diagnostico) === "ANORMAL",
    ).length,
);

const groupedFormDetails = computed(() => groupLubricantDetails(form.detalles));

function conditionColor(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ANORMAL") return "error";
  if (raw === "PRECAUCION") return "warning";
  if (raw === "N/D" || raw === "ND") return "secondary";
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
    numero_muestra: "",
    horas_equipo: null,
    horas_lubricante: null,
    condicion: "NORMAL",
    equipo_marca: "",
    equipo_serie: "",
    equipo_modelo: "",
    detalles: mergeLubricantDetails("MOTOR"),
  });
}

function applySelectedEquipmentSnapshot() {
  const equipment = form.equipo_id ? equipmentMap.value.get(form.equipo_id) : null;
  if (!equipment) {
    form.equipo_marca = "";
    return;
  }
  form.equipo_marca = resolveEquipmentBrand(equipment);
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
  const { data } = await api.get("/kpi_maintenance/equipos", {
    params: { limit: 500, page: 1 },
  });
  equipments.value = unwrap(data, []);
}

async function loadBrands() {
  const { data } = await api.get("/kpi_inventory/marcas", {
    params: { limit: 500, page: 1 },
  });
  brands.value = unwrap(data, []);
}

async function loadAll() {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([loadAnalyses(), loadCatalog(), loadEquipments(), loadBrands()]);
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
  form.detalles = mergeLubricantDetails(form.compartimento_principal || "GENERAL");
}

function handleCompartmentChange() {
  form.detalles = mergeLubricantDetails(
    form.compartimento_principal || "GENERAL",
    form.detalles,
  );
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
    fecha_reporte: sample.fecha_informe || item.fecha_reporte || "",
    numero_muestra: sample.numero_muestra || "",
    horas_equipo: sample.horas_equipo ?? null,
    horas_lubricante: sample.horas_lubricante ?? null,
    condicion: sample.condicion || item.estado_diagnostico || "NORMAL",
    equipo_marca: sample.equipo_marca || "",
    equipo_serie: sample.equipo_serie || "",
    equipo_modelo: sample.equipo_modelo || "",
    detalles: mergeLubricantDetails(
      item.compartimento_principal || "MOTOR",
      item.detalles ?? [],
    ),
  });
}

function openEdit(item: AnyRow) {
  editingId.value = item.id;
  fillFormFromAnalysis(item);
  lubricantSelection.value = item.lubricante
    ? {
        lubricante: item.lubricante,
        marca_lubricante: item.marca_lubricante,
        ultimo_codigo: item.codigo,
        label: [item.codigo, item.lubricante, item.marca_lubricante].filter(Boolean).join(" · "),
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
    form.marca_lubricante = "";
    lubricantSelection.value = null;
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

function buildDetailPayload(detail: AnyRow) {
  const template = getLubricantParameterTemplate(
    detail.parametro_key || detail.parametro,
  );
  const inputType = template?.inputType || "number";
  const base = {
    compartimento: form.compartimento_principal || "GENERAL",
    parametro: template?.label || detail.parametro,
    orden: template?.order ?? detail.orden ?? null,
  } as AnyRow;

  if (inputType === "select" || inputType === "text") {
    return {
      ...base,
      resultado_texto: String(detail.resultado_texto ?? "").trim() || null,
      resultado_numerico: null,
    };
  }

  return {
    ...base,
    resultado_numerico:
      detail.resultado_numerico == null || detail.resultado_numerico === ""
        ? null
        : Number(detail.resultado_numerico),
    resultado_texto: null,
  };
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
      payload_json: {
        sample_info: {
          numero_muestra: form.numero_muestra || null,
          fecha_ingreso: form.fecha_ingreso || null,
          fecha_informe: form.fecha_reporte || null,
          horas_equipo: form.horas_equipo,
          horas_lubricante: form.horas_lubricante,
          condicion: form.condicion,
          equipo_marca: form.equipo_marca || null,
          equipo_serie: form.equipo_serie || null,
          equipo_modelo: form.equipo_modelo || null,
        },
      },
      detalles: form.detalles.map(buildDetailPayload),
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
    codigo: value.ultimo_codigo || value.codigo || undefined,
    lubricante: value.lubricante || value.label,
    marca_lubricante: value.marca_lubricante || undefined,
  });
}

async function viewDashboard(item: AnyRow) {
  dashboardSelection.value = {
    lubricante: item.lubricante,
    marca_lubricante: item.marca_lubricante,
    codigo: item.codigo,
    label: [item.codigo, item.lubricante, item.marca_lubricante].filter(Boolean).join(" · "),
  };
  await loadDashboard({ codigo: item.codigo });
}

async function reloadDashboard() {
  if (!dashboardSelection.value && !dashboard.value?.selected?.lubricante) return;
  await loadDashboard({
    codigo: dashboardSelection.value?.codigo || dashboardSelection.value?.ultimo_codigo,
    lubricante:
      dashboardSelection.value?.lubricante || dashboard.value?.selected?.lubricante,
    marca_lubricante:
      dashboardSelection.value?.marca_lubricante ||
      dashboard.value?.selected?.marca_lubricante,
  });
}

watch(
  () => form.equipo_id,
  () => {
    applySelectedEquipmentSnapshot();
  },
);

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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.detail-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: rgba(255, 255, 255, 0.45);
}

.detail-card__title {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
</style>

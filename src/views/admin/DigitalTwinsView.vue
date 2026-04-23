<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar el modulo de Gemelos digitales.
  </v-alert>

  <div v-else class="digital-twins-page">
    <v-card rounded="xl" class="pa-5 enterprise-surface">
      <div class="responsive-header page-wrap">
        <div>
          <div class="text-h6 font-weight-bold">Gemelos digitales</div>
          <div class="text-body-2 text-medium-emphasis">
            Monitoreo operativo por equipo con KPI propios, señales del período y análisis con IA.
          </div>
        </div>
        <div class="responsive-actions page-wrap">
          <v-btn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="openCreate">
            Nuevo gemelo
          </v-btn>
          <v-btn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-sync"
            :loading="refreshingAll"
            @click="refreshAll"
          >
            Recalcular KPI
          </v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-refresh"
            :loading="loading"
            @click="loadDashboard"
          >
            Actualizar
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <v-row dense class="mt-3">
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedYear"
            :items="yearOptions"
            label="Año"
            variant="outlined"
            density="compact"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedMonth"
            :items="monthOptions"
            item-title="title"
            item-value="value"
            label="Mes"
            variant="outlined"
            density="compact"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            label="Buscar por código, gemelo, equipo o modelo"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
          />
        </v-col>
      </v-row>

      <v-row dense class="mt-1">
        <v-col v-for="card in dashboard.kpis" :key="card.key" cols="12" sm="6" xl="3">
          <v-card rounded="lg" variant="outlined" class="pa-4 h-100 twin-kpi-card">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 text-medium-emphasis">{{ card.label }}</div>
              <v-icon :icon="card.icon" size="20" />
            </div>
            <div class="text-h4 font-weight-bold">{{ card.value }}</div>
            <div class="text-body-2 text-medium-emphasis mt-2">{{ card.helper }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row dense class="mt-2">
        <v-col cols="12" md="4" v-for="risk in dashboard.risk_breakdown" :key="risk.label">
          <v-card rounded="lg" variant="outlined" class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2">{{ risk.label }}</div>
              <v-chip :color="risk.color" variant="tonal" label>{{ risk.value }}</v-chip>
            </div>
            <v-progress-linear
              :model-value="riskPercent(risk.value)"
              :color="risk.color"
              height="10"
              rounded
            />
          </v-card>
        </v-col>
      </v-row>
    </v-card>

    <v-card rounded="xl" class="pa-4 enterprise-surface mt-4">
      <v-data-table
        :headers="headers"
        :items="dashboardRows"
        :loading="loading"
        loading-text="Obteniendo gemelos digitales..."
        :items-per-page="15"
        class="enterprise-table"
      >
        <template #item.name="{ item }">
          <div class="font-weight-medium">{{ rowData(item).twin?.name || "Sin nombre" }}</div>
          <div class="text-caption text-medium-emphasis">{{ rowData(item).twin?.code || "Sin código" }}</div>
        </template>

        <template #item.equipment="{ item }">
          <div class="font-weight-medium">{{ rowData(item).twin?.equipment_name || "Sin equipo" }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ rowData(item).twin?.equipment_code || "Sin código" }}
            <span v-if="rowData(item).twin?.equipment_model"> · {{ rowData(item).twin?.equipment_model }}</span>
          </div>
        </template>

        <template #item.health_score="{ item }">
          <div class="font-weight-bold">{{ rowData(item).health_score }}%</div>
          <v-progress-linear
            :model-value="Number(rowData(item).health_score || 0)"
            :color="healthColor(rowData(item).health_score)"
            height="8"
            rounded
          />
        </template>

        <template #item.risk_level="{ item }">
          <v-chip :color="riskColor(rowData(item).risk_level)" variant="tonal" label size="small">
            {{ rowData(item).risk_level }}
          </v-chip>
        </template>

        <template #item.operational_status="{ item }">
          <v-chip
            :color="statusColor(rowData(item).operational_status)"
            variant="tonal"
            label
            size="small"
          >
            {{ rowData(item).operational_status }}
          </v-chip>
        </template>

        <template #item.lubricant="{ item }">
          <div class="font-weight-medium">{{ rowData(item).lubricant?.latest_state || "SIN_ANALISIS" }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ rowData(item).lubricant?.latest_report_date || "Sin reporte" }}
          </div>
        </template>

        <template #item.actions="{ item }">
          <div class="responsive-actions justify-end">
            <v-btn icon="mdi-eye" variant="text" @click="openDetail(rowData(item))" />
            <v-btn
              icon="mdi-robot-industrial"
              variant="text"
              color="secondary"
              :loading="analyzingTwinId === rowData(item).twin?.id"
              @click="analyzeTwin(rowData(item))"
            />
            <v-btn
              icon="mdi-sync"
              variant="text"
              color="primary"
              :loading="refreshingTwinId === rowData(item).twin?.id"
              @click="refreshTwin(rowData(item))"
            />
            <v-btn v-if="canEdit" icon="mdi-pencil" variant="text" @click="openEdit(rowData(item).twin?.id)" />
            <v-btn v-if="canDelete" icon="mdi-delete-outline" variant="text" color="error" @click="removeTwin(rowData(item))" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="formDialog" :max-width="920">
      <v-card rounded="xl">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ editingId ? "Editar gemelo digital" : "Nuevo gemelo digital" }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.code" label="Código" variant="outlined" readonly :loading="codeLoading" />
            </v-col>
            <v-col cols="12" md="8">
              <v-text-field v-model="form.name" label="Nombre del gemelo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="form.equipment_id"
                :items="equipmentOptions"
                item-title="label"
                item-value="id"
                label="Equipo asociado"
                variant="outlined"
                clearable
                @update:model-value="handleEquipmentSelected"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.equipment_code" label="Código equipo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.equipment_name" label="Nombre equipo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.equipment_model" label="Modelo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="form.twin_type" :items="twinTypeOptions" label="Tipo de gemelo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="form.process_scope" :items="scopeOptions" label="Alcance" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.status" :items="statusOptions" label="Estado" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-switch v-model="form.ai_enabled" color="primary" inset label="Análisis IA habilitado" />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.configNotes"
                label="Notas operativas / contexto"
                variant="outlined"
                rows="3"
                auto-grow
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="formDialog = false">Cancelar</v-btn>
          <v-btn v-if="canPersistForm" color="primary" :loading="saving" @click="saveTwin">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="detailDialog" :max-width="1200">
      <v-card rounded="xl">
        <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center justify-space-between" style="gap: 8px; flex-wrap: wrap;">
          <span>{{ detail?.twin?.name || "Detalle del gemelo digital" }}</span>
          <div class="responsive-actions">
            <v-btn
              variant="tonal"
              prepend-icon="mdi-sync"
              :loading="refreshingTwinId === detail?.twin?.id"
              @click="detail && refreshTwin(detail.snapshot)"
            >
              Recalcular
            </v-btn>
            <v-btn
              variant="tonal"
              prepend-icon="mdi-robot-industrial"
              :loading="analyzingTwinId === detail?.twin?.id"
              @click="detail && analyzeTwin(detail.snapshot)"
            >
              {{ analyzingTwinId === detail?.twin?.id ? "Buscando modelos recomendados..." : "Analizar IA" }}
            </v-btn>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text v-if="detail" class="pt-4">
          <div
            v-if="analyzingTwinId === detail?.twin?.id"
            class="mb-4 text-body-2 text-medium-emphasis"
          >
            Buscando modelos recomendados...
          </div>
          <div class="summary-strip mb-4">
            <v-chip label color="primary" variant="tonal">{{ detail.period.label }}</v-chip>
            <v-chip label :color="healthColor(detail.snapshot.health_score)" variant="tonal">
              Salud {{ detail.snapshot.health_score }}%
            </v-chip>
            <v-chip label :color="riskColor(detail.snapshot.risk_level)" variant="tonal">
              Riesgo {{ detail.snapshot.risk_level }}
            </v-chip>
            <v-chip label :color="statusColor(detail.snapshot.operational_status)" variant="tonal">
              Estado {{ detail.snapshot.operational_status }}
            </v-chip>
          </div>

          <v-row dense class="mb-2">
            <v-col cols="12" md="4">
              <v-card rounded="lg" variant="outlined" class="pa-4 h-100">
                <div class="text-subtitle-2 font-weight-bold mb-3">Contexto del equipo</div>
                <div class="text-body-2"><strong>Código:</strong> {{ detail.snapshot.equipment?.code || detail.twin?.equipment_code || "No registrado" }}</div>
                <div class="text-body-2 mt-1"><strong>Nombre real:</strong> {{ detail.snapshot.equipment?.display_name || detail.twin?.equipment_name || "No registrado" }}</div>
                <div class="text-body-2 mt-1" v-if="detail.snapshot.equipment?.operational_name && detail.snapshot.equipment?.operational_name !== detail.snapshot.equipment?.display_name">
                  <strong>Nombre operativo:</strong> {{ detail.snapshot.equipment?.operational_name }}
                </div>
                <div class="text-body-2 mt-1"><strong>Modelo:</strong> {{ detail.snapshot.equipment?.model || detail.twin?.equipment_model || "No registrado" }}</div>
                <div class="text-body-2 mt-1"><strong>Marca:</strong> {{ detail.snapshot.equipment?.brand_name || "No registrada" }}</div>
                <div class="text-body-2 mt-1"><strong>Estado:</strong> {{ detail.snapshot.equipment?.estado_operativo || "No registrado" }}</div>
                <div class="text-body-2 mt-1"><strong>Criticidad:</strong> {{ detail.snapshot.equipment?.criticidad || "No registrada" }}</div>
                <div
                  v-if="Array.isArray(detail.snapshot.equipment?.components) && detail.snapshot.equipment?.components.length"
                  class="mt-3"
                >
                  <div class="text-body-2 font-weight-medium mb-2"><strong>Partes oficiales:</strong></div>
                  <div class="d-flex flex-wrap" style="gap: 6px;">
                    <v-chip
                      v-for="component in detail.snapshot.equipment?.components"
                      :key="component.id || `${component.codigo}-${component.nombre_oficial}`"
                      size="small"
                      variant="tonal"
                      color="secondary"
                    >
                      {{ component.codigo ? `${component.codigo} - ` : "" }}{{ component.nombre_oficial || component.nombre }}
                    </v-chip>
                  </div>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card rounded="lg" variant="outlined" class="pa-4 h-100">
                <div class="text-subtitle-2 font-weight-bold mb-3">Lubricación analizada</div>
                <div class="text-body-2 mt-1"><strong>Último analizado:</strong> {{ detail.snapshot.lubricant?.latest_lubricant || "Sin análisis" }}</div>
                <div class="text-body-2 mt-1"><strong>Marca:</strong> {{ detail.snapshot.lubricant?.latest_lubricant_brand || "No registrada" }}</div>
                <div class="text-body-2 mt-1"><strong>Informe:</strong> {{ detail.snapshot.lubricant?.latest_report_code || "Sin código" }}</div>
                <div class="text-body-2 mt-3"><strong>Estado:</strong> {{ detail.snapshot.lubricant?.latest_state || "SIN_ANALISIS" }}</div>
                <div
                  v-if="detail.snapshot.lubricant?.match_status && detail.snapshot.lubricant?.match_status !== 'NO_APLICA'"
                  class="mt-2 d-flex align-center justify-space-between"
                  style="gap: 8px; flex-wrap: wrap;"
                >
                  <div class="text-body-2"><strong>Consistencia:</strong></div>
                  <v-chip
                    :color="lubricantMatchColor(detail.snapshot.lubricant?.match_status)"
                    variant="tonal"
                    size="small"
                    label
                  >
                    {{ detail.snapshot.lubricant?.match_status }}
                  </v-chip>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card rounded="lg" variant="outlined" class="pa-4 h-100">
                <div class="text-subtitle-2 font-weight-bold mb-3">Materiales e inventario</div>
                <div class="text-body-2"><strong>Materiales sugeridos:</strong> {{ detail.snapshot.inventory?.total_materials ?? 0 }}</div>
                <div class="text-body-2 mt-1"><strong>Con stock comprometido:</strong> {{ detail.snapshot.inventory?.low_stock_materials ?? 0 }}</div>
                <div
                  v-if="Array.isArray(detail.snapshot.inventory?.recommended_materials) && detail.snapshot.inventory?.recommended_materials.length"
                  class="mt-3"
                >
                  <div
                    v-for="material in (detail.snapshot.inventory?.recommended_materials || []).slice(0, 3)"
                    :key="material.producto_id || `${material.codigo}-${material.nombre}`"
                    class="mb-2"
                  >
                    <div class="font-weight-medium">{{ material.codigo || "Sin código" }} · {{ material.nombre || "Material" }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Stock {{ material.stock_total ?? 0 }} · {{ material.stock_status || "SIN_STOCK" }}
                      <span v-if="material.bodega_sugerida">
                        · Bodega {{ material.bodega_sugerida.codigo || material.bodega_sugerida.nombre }}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="text-body-2 text-medium-emphasis mt-3"
                >
                  Todavía no hay materiales sugeridos para este equipo.
                </div>
              </v-card>
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" lg="5">
              <v-card rounded="lg" variant="outlined" class="pa-4 h-100">
                <div class="text-subtitle-2 font-weight-bold mb-3">Señales operativas</div>
                <v-table density="compact" class="enterprise-table">
                  <thead>
                    <tr>
                      <th>Señal</th>
                      <th>Valor</th>
                      <th>Severidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="signal in detail.signals" :key="signal.id || signal.signal_key || signal.key">
                      <td>
                        <div class="font-weight-medium">{{ signal.signal_label || signal.label }}</div>
                        <div class="text-caption text-medium-emphasis">{{ signal.signal_category || signal.category }}</div>
                      </td>
                      <td>{{ displaySignalValue(signal) }}</td>
                      <td>
                        <v-chip :color="severityColor(signal.severity)" variant="tonal" size="small">
                          {{ signal.severity }}
                        </v-chip>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>

            <v-col cols="12" lg="7">
              <v-card rounded="lg" variant="outlined" class="pa-4">
                <div class="text-subtitle-2 font-weight-bold mb-3">Insights y recomendaciones</div>
                <div
                  v-if="!detail.insights.length"
                  class="text-body-2 text-medium-emphasis"
                >
                  Todavía no hay análisis IA para este período. Puedes generarlo desde esta ventana.
                </div>
                <v-timeline v-else density="compact" side="end" align="start">
                  <v-timeline-item
                    v-for="insight in detail.insights"
                    :key="insight.id"
                    dot-color="secondary"
                    fill-dot
                  >
                    <div class="font-weight-bold">{{ insight.title }}</div>
                    <div class="text-caption text-medium-emphasis mb-2">
                      {{ insight.source }} · {{ formatDate(insight.created_at) }} · Prioridad {{ insight.priority }}
                    </div>
                    <div class="mb-2">{{ insight.summary }}</div>
                    <div class="text-body-2 text-medium-emphasis">{{ insight.recommendation }}</div>
                    <div v-if="insightNationalModels(insight).length" class="mt-3">
                      <div class="text-caption text-uppercase mb-2">Modelos nacionales recomendados</div>
                      <v-card
                        v-for="(model, modelIndex) in insightNationalModels(insight)"
                        :key="`${insight.id}-national-model-${modelIndex}`"
                        rounded="lg"
                        variant="tonal"
                        color="secondary"
                        class="pa-3 mb-2"
                      >
                        <div class="font-weight-bold">
                          {{ model.model }}
                          <span v-if="model.manufacturer"> · {{ model.manufacturer }}</span>
                        </div>
                        <div class="text-body-2 mt-1" v-if="model.reason">
                          {{ model.reason }}
                        </div>
                        <div class="text-caption text-medium-emphasis mt-1">
                          {{ model.country || "Ecuador" }}
                          <span v-if="model.application"> · {{ model.application }}</span>
                        </div>
                      </v-card>
                    </div>
                    <div v-if="insightImprovementSteps(insight).length" class="mt-3">
                      <div class="text-caption text-uppercase mb-1">Pasos de mejora</div>
                      <ol class="improvement-list">
                        <li v-for="(step, index) in insightImprovementSteps(insight)" :key="`${insight.id}-${index}`">
                          {{ step }}
                        </li>
                      </ol>
                    </div>
                    <div v-if="insightRecommendedMaterials(insight).length" class="mt-3">
                      <div class="text-caption text-uppercase mb-1">Materiales sugeridos</div>
                      <div
                        v-for="material in insightRecommendedMaterials(insight).slice(0, 4)"
                        :key="material.producto_id || `${material.codigo}-${material.nombre}`"
                        class="text-body-2 mb-2"
                      >
                        <div class="font-weight-medium">
                          {{ material.codigo || "Sin código" }} · {{ material.nombre || "Material" }}
                        </div>
                        <div class="text-medium-emphasis">
                          Stock {{ material.stock_total ?? 0 }} · {{ material.stock_status || "SIN_STOCK" }}
                          <span v-if="material.bodega_sugerida">
                            · Bodega {{ material.bodega_sugerida.codigo || material.bodega_sugerida.nombre }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { canAccessDigitalTwins } from "@/app/utils/role-access";
import { formatDateTime } from "@/app/utils/date-time";

type TwinRow = {
  twin?: {
    id?: string;
    code?: string;
    name?: string;
    equipment_id?: string | null;
    equipment_code?: string | null;
    equipment_name?: string | null;
    equipment_model?: string | null;
  };
  health_score?: number;
  risk_level?: string;
  operational_status?: string;
  lubricant?: {
    latest_state?: string;
    latest_report_date?: string | null;
    latest_report_code?: string | null;
    latest_lubricant?: string | null;
    latest_lubricant_brand?: string | null;
    expected_lubricant_code?: string | null;
    match_status?: string | null;
  };
  equipment?: {
    code?: string | null;
    operational_name?: string | null;
    real_name?: string | null;
    display_name?: string | null;
    model?: string | null;
    brand_name?: string | null;
    criticidad?: string | null;
    estado_operativo?: string | null;
    codigo_lubricante?: string | null;
    components?: Array<{
      id?: string | null;
      codigo?: string | null;
      nombre?: string | null;
      nombre_oficial?: string | null;
      categoria?: string | null;
      descripcion?: string | null;
      orden?: number;
    }>;
  };
  inventory?: {
    total_materials?: number;
    low_stock_materials?: number;
    recommended_materials?: Array<Record<string, any>>;
  };
  snapshot?: TwinRow;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const now = new Date();

const loading = ref(false);
const saving = ref(false);
const codeLoading = ref(false);
const refreshingAll = ref(false);
const refreshingTwinId = ref<string | null>(null);
const analyzingTwinId = ref<string | null>(null);
const error = ref<string | null>(null);
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const search = ref("");

const dashboard = ref<any>({ kpis: [], risk_breakdown: [], rows: [] });
const equipmentOptions = ref<any[]>([]);
const formDialog = ref(false);
const detailDialog = ref(false);
const editingId = ref<string | null>(null);
const detail = ref<any | null>(null);

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, ["Gemelos digitales", "Gemelos Digitales"]),
);
const canRead = computed(() => canAccessDigitalTwins(auth.user) && perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canPersistForm = computed(() => (editingId.value ? canEdit.value : canCreate.value));

const form = reactive({
  code: "",
  name: "",
  equipment_id: null as string | null,
  equipment_code: "",
  equipment_name: "",
  equipment_model: "",
  twin_type: "OPERATIVO",
  process_scope: "MANTENIMIENTO",
  ai_enabled: true,
  status: "ACTIVE",
  configNotes: "",
});

const headers = [
  { title: "Gemelo", key: "name" },
  { title: "Equipo", key: "equipment" },
  { title: "Salud", key: "health_score" },
  { title: "Riesgo", key: "risk_level" },
  { title: "Estado", key: "operational_status" },
  { title: "Horas mes", key: "metrics.planned_hours_month" },
  { title: "Actividades", key: "metrics.weekly_activity_count" },
  { title: "Lubricante", key: "lubricant" },
  { title: "Acciones", key: "actions", sortable: false, align: "end" as const },
] as const;

const yearOptions = computed(() => {
  const current = now.getFullYear();
  return Array.from({ length: 12 }, (_, index) => current - 5 + index);
});

const monthOptions = [
  { value: 1, title: "Enero" },
  { value: 2, title: "Febrero" },
  { value: 3, title: "Marzo" },
  { value: 4, title: "Abril" },
  { value: 5, title: "Mayo" },
  { value: 6, title: "Junio" },
  { value: 7, title: "Julio" },
  { value: 8, title: "Agosto" },
  { value: 9, title: "Septiembre" },
  { value: 10, title: "Octubre" },
  { value: 11, title: "Noviembre" },
  { value: 12, title: "Diciembre" },
];

const dashboardRows = computed<TwinRow[]>(() => dashboard.value?.rows ?? []);

const twinTypeOptions = ["OPERATIVO", "MANTENIMIENTO", "LUBRICACION", "ENERGETICO"];
const scopeOptions = ["MANTENIMIENTO", "OPERACION", "PREDICTIVO", "PLANIFICACION"];
const statusOptions = ["ACTIVE", "INACTIVE"];

function rowData(item: unknown): TwinRow {
  return (item ?? {}) as TwinRow;
}

function healthColor(value: number | string | undefined) {
  const numeric = Number(value || 0);
  if (numeric < 50) return "error";
  if (numeric < 75) return "warning";
  return "success";
}

function riskColor(value: string | undefined) {
  if (String(value).toUpperCase() === "ALTO") return "error";
  if (String(value).toUpperCase() === "MEDIO") return "warning";
  return "success";
}

function statusColor(value: string | undefined) {
  if (String(value).toUpperCase() === "CRITICO") return "error";
  if (String(value).toUpperCase() === "EN_OBSERVACION") return "warning";
  return "success";
}

function severityColor(value: string | undefined) {
  if (String(value).toUpperCase() === "CRITICAL") return "error";
  if (String(value).toUpperCase() === "WARNING") return "warning";
  return "info";
}

function riskPercent(value: number) {
  const total = Math.max(Number(dashboardRows.value.length || 1), 1);
  return (Number(value || 0) / total) * 100;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return formatDateTime(value, "Sin fecha");
}

function displaySignalValue(signal: any) {
  const value = signal.signal_value ?? signal.value ?? 0;
  const unit = signal.signal_unit ?? signal.unit ?? "";
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function insightNationalModels(insight: any) {
  const payload = insight?.payload_json;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const models = (payload as Record<string, any>).national_models;
  if (!Array.isArray(models)) return [];
  return models.filter(
    (item) => item && typeof item === "object" && !Array.isArray(item) && String(item.model || "").trim(),
  );
}

function insightImprovementSteps(insight: any) {
  const payload = insight?.payload_json;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const steps = (payload as Record<string, any>).improvement_steps;
  if (!Array.isArray(steps)) return [];
  return steps.filter((step) => typeof step === "string" && step.trim().length > 0);
}

function insightRecommendedMaterials(insight: any) {
  const payload = insight?.payload_json;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const materials = (payload as Record<string, any>).recommended_materials;
  if (!Array.isArray(materials)) return [];
  return materials.filter((item) => item && typeof item === "object");
}

function lubricantMatchColor(value?: string | null) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "NO_COINCIDE") return "error";
  if (normalized === "SIN_REFERENCIA" || normalized === "SIN_ANALISIS") return "warning";
  return "success";
}

async function loadDashboard() {
  if (!canRead.value) {
    dashboard.value = { kpis: [], risk_breakdown: [], rows: [] };
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/kpi_process/digital-twins/dashboard", {
      params: {
        year: selectedYear.value,
        month: selectedMonth.value,
        search: search.value || undefined,
      },
    });
    dashboard.value = data;
  } catch (err: any) {
    error.value =
      err?.response?.data?.message ||
      "No se pudo cargar el dashboard de gemelos digitales.";
  } finally {
    loading.value = false;
  }
}

async function loadEquipmentOptions() {
  const { data } = await api.get("/kpi_process/digital-twins/equipment-options");
  equipmentOptions.value = Array.isArray(data)
    ? data.map((item: any) => ({
        ...item,
        label:
          [
            item.codigo,
            item.nombre_real || item.nombre,
            item.modelo || null,
          ]
            .filter(Boolean)
            .join(" · ") || item.label,
      }))
    : [];
}

async function openCreate() {
  if (!canCreate.value) return;
  editingId.value = null;
  Object.assign(form, {
    code: "",
    name: "",
    equipment_id: null,
    equipment_code: "",
    equipment_name: "",
    equipment_model: "",
    twin_type: "OPERATIVO",
    process_scope: "MANTENIMIENTO",
    ai_enabled: true,
    status: "ACTIVE",
    configNotes: "",
  });
  codeLoading.value = true;
  try {
    await loadEquipmentOptions();
    const { data } = await api.get("/kpi_process/digital-twins/next-code");
    form.code = data.code;
    formDialog.value = true;
  } finally {
    codeLoading.value = false;
  }
}

async function openEdit(id?: string) {
  if (!canEdit.value) return;
  if (!id) return;
  loading.value = true;
  try {
    await loadEquipmentOptions();
    const { data } = await api.get(`/kpi_process/digital-twins/${id}`);
    editingId.value = id;
    Object.assign(form, {
      code: data.code || "",
      name: data.name || "",
      equipment_id: data.equipment_id || null,
      equipment_code: data.equipment_code || "",
      equipment_name: data.equipment_name || "",
      equipment_model: data.equipment_model || "",
      twin_type: data.twin_type || "OPERATIVO",
      process_scope: data.process_scope || "MANTENIMIENTO",
      ai_enabled: Boolean(data.ai_enabled ?? true),
      status: data.status || "ACTIVE",
      configNotes: String(data.config_json?.notes || ""),
    });
    formDialog.value = true;
  } finally {
    loading.value = false;
  }
}

function handleEquipmentSelected(value: string | null) {
  const selected = equipmentOptions.value.find((item) => item.id === value);
  if (!selected) return;
  form.equipment_code = selected.codigo || "";
  form.equipment_name = selected.nombre_real || selected.nombre || "";
  form.equipment_model = selected.modelo || form.equipment_model || "";
  if (!form.name.trim()) {
    form.name = `Gemelo ${selected.codigo || selected.nombre_real || selected.nombre}`;
  }
}

async function saveTwin() {
  if (!canPersistForm.value) return;
  saving.value = true;
  try {
    const payload = {
      code: form.code,
      name: form.name,
      equipment_id: form.equipment_id,
      equipment_code: form.equipment_code,
      equipment_name: form.equipment_name,
      equipment_model: form.equipment_model,
      twin_type: form.twin_type,
      process_scope: form.process_scope,
      ai_enabled: form.ai_enabled,
      status: form.status,
      config_json: { notes: form.configNotes || null },
      updated_by: auth.user?.nameUser || auth.user?.nameSurname || "frontend",
    };

    if (editingId.value) {
      await api.patch(`/kpi_process/digital-twins/${editingId.value}`, payload);
      ui.success("Gemelo digital actualizado.");
    } else {
      await api.post("/kpi_process/digital-twins", payload);
      ui.success("Gemelo digital creado.");
    }

    formDialog.value = false;
    await loadDashboard();
  } catch (err: any) {
    ui.error(err?.response?.data?.message || "No se pudo guardar el gemelo digital.");
  } finally {
    saving.value = false;
  }
}

async function openDetail(row: TwinRow) {
  const id = row?.twin?.id;
  if (!id) return;
  loading.value = true;
  try {
    const { data } = await api.get(`/kpi_process/digital-twins/${id}/detail`, {
      params: { year: selectedYear.value, month: selectedMonth.value },
    });
    detail.value = data;
    detailDialog.value = true;
  } catch (err: any) {
    ui.error(err?.response?.data?.message || "No se pudo cargar el detalle del gemelo digital.");
  } finally {
    loading.value = false;
  }
}

async function refreshTwin(row: TwinRow) {
  const id = row?.twin?.id || row?.snapshot?.twin?.id;
  if (!id) return;
  refreshingTwinId.value = id;
  try {
    await api.post(`/kpi_process/digital-twins/${id}/refresh`, {
      year: selectedYear.value,
      month: selectedMonth.value,
    });
    await loadDashboard();
    if (detail.value?.twin?.id === id) {
      await openDetail({ twin: { id } });
    }
    ui.success("Snapshot del gemelo recalculado.");
  } catch (err: any) {
    ui.error(err?.response?.data?.message || "No se pudo recalcular el gemelo.");
  } finally {
    refreshingTwinId.value = null;
  }
}

async function analyzeTwin(row: TwinRow) {
  const id = row?.twin?.id || row?.snapshot?.twin?.id;
  if (!id) return;
  analyzingTwinId.value = id;
  try {
    await api.post(`/kpi_process/digital-twins/${id}/ai-analysis`, {
      year: selectedYear.value,
      month: selectedMonth.value,
      created_by: auth.user?.nameUser || auth.user?.nameSurname || "frontend",
    });
    if (detail.value?.twin?.id === id) {
      await openDetail({ twin: { id } });
    }
    await loadDashboard();
    ui.success("Análisis del gemelo generado.");
  } catch (err: any) {
    ui.error(err?.response?.data?.message || "No se pudo generar el análisis IA.");
  } finally {
    analyzingTwinId.value = null;
  }
}

async function refreshAll() {
  refreshingAll.value = true;
  try {
    await api.post("/kpi_process/digital-twins/refresh-all", {
      year: selectedYear.value,
      month: selectedMonth.value,
      search: search.value || undefined,
    });
    await loadDashboard();
    ui.success("KPI de gemelos digitales recalculados.");
  } catch (err: any) {
    ui.error(err?.response?.data?.message || "No se pudieron recalcular los KPI.");
  } finally {
    refreshingAll.value = false;
  }
}

async function removeTwin(row: TwinRow) {
  if (!canDelete.value) return;
  const id = row?.twin?.id;
  const label = row?.twin?.name || row?.twin?.code || "este gemelo digital";
  if (!id) return;
  if (!window.confirm(`Se eliminará ${label}. ¿Deseas continuar?`)) return;

  loading.value = true;
  try {
    await api.delete(`/kpi_process/digital-twins/${id}`);
    if (detail.value?.twin?.id === id) {
      detailDialog.value = false;
      detail.value = null;
    }
    ui.success("Gemelo digital eliminado.");
    await loadDashboard();
  } catch (err: any) {
    ui.error(err?.response?.data?.message || "No se pudo eliminar el gemelo digital.");
  } finally {
    loading.value = false;
  }
}

watch([selectedYear, selectedMonth], () => {
  loadDashboard();
});

watch(search, () => {
  loadDashboard();
});

onMounted(() => {
  if (!canRead.value) return;
  loadDashboard();
});
</script>

<style scoped>
.digital-twins-page {
  display: grid;
  gap: 16px;
}

.page-wrap {
  gap: 12px;
  flex-wrap: wrap;
}

.twin-kpi-card {
  min-height: 148px;
}

.improvement-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

@media (max-width: 960px) {
  .twin-kpi-card {
    min-height: auto;
  }
}
</style>


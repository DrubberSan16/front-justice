<template>
  <div class="intelligence-page">
    <v-card rounded="xl" class="pa-5 enterprise-surface intelligence-hero">
      <div class="d-flex align-center justify-space-between intelligence-wrap">
        <div>
          <div class="text-h6 font-weight-bold">Inteligencia operativa de mantenimiento</div>
          <div class="text-body-2 text-medium-emphasis">
            Consolida procedimientos MPG, analisis de lubricante, cronogramas, reportes diarios y eventos KPI con indicadores dinamicos por componente.
          </div>
        </div>
        <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
          <v-chip label color="primary" variant="tonal">
            {{ generatedAtLabel }}
          </v-chip>
          <v-btn color="secondary" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('indicadores', 'excel')" @click="exportModule('indicadores', 'excel')">
            Excel KPI
          </v-btn>
          <v-btn color="secondary" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('indicadores', 'pdf')" @click="exportModule('indicadores', 'pdf')">
            PDF KPI
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadIntelligence">
            Actualizar
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <v-row dense class="mt-3">
        <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="2">
          <v-card
            rounded="lg"
            variant="outlined"
            :class="['pa-4', 'intelligence-kpi', 'h-100', { 'intelligence-kpi--clickable': Boolean(card.routeName || card.key === 'lubricantes-dashboard') }]"
            :role="card.routeName || card.key === 'lubricantes-dashboard' ? 'button' : undefined"
            :tabindex="card.routeName || card.key === 'lubricantes-dashboard' ? 0 : undefined"
            @click="openCard(card)"
            @keydown.enter="openCard(card)"
            @keydown.space.prevent="openCard(card)"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 text-medium-emphasis">{{ card.label }}</div>
              <v-icon :icon="card.icon" size="20" />
            </div>
            <div class="text-h4 font-weight-bold">{{ card.value }}</div>
            <div class="text-body-2 text-medium-emphasis mt-2">{{ card.helper }}</div>
            <div v-if="card.routeName || card.key === 'lubricantes-dashboard'" class="text-caption text-primary mt-3">Abrir detalle</div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>

    <v-row>
      <v-col cols="12" lg="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Indicadores de proceso</div>
              <div class="text-body-2 text-medium-emphasis">Semaforizacion operativa y trazabilidad por proceso.</div>
            </div>
            <v-chip label color="secondary" variant="tonal">{{ processIndicatorRows.length }} indicadores</v-chip>
          </div>

          <div class="indicator-grid">
            <div v-for="item in processIndicatorRows" :key="item.key" class="indicator-tile">
              <div class="text-caption text-medium-emphasis">{{ item.label }}</div>
              <div class="text-h6 font-weight-bold">{{ item.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.helper }}</div>
            </div>
          </div>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 font-weight-medium mb-2">Distribucion por proceso</div>
          <div class="breakdown-grid">
            <div v-for="item in breakdownItems" :key="item.tipo_proceso" class="breakdown-chip">
              <div class="text-caption text-medium-emphasis">{{ prettifyProcess(item.tipo_proceso) }}</div>
              <div class="text-h6 font-weight-bold">{{ item.total }}</div>
            </div>
            <div v-if="!breakdownItems.length" class="text-body-2 text-medium-emphasis">
              Sin eventos documentados.
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Eventos y notificaciones</div>
              <div class="text-body-2 text-medium-emphasis">Cada proceso principal deja traza y dispara el KPI operativo.</div>
            </div>
            <v-chip label color="secondary" variant="tonal">{{ recentEvents.length }} eventos recientes</v-chip>
          </div>

          <v-list density="comfortable" class="bg-transparent pa-0">
            <v-list-item
              v-for="item in recentEvents"
              :key="item.id"
              :title="item.title"
              :subtitle="item.subtitle"
              class="px-0"
            >
              <template #prepend>
                <v-avatar size="34" color="secondary" variant="tonal">
                  <v-icon icon="mdi-bell-ring-outline" size="18" />
                </v-avatar>
              </template>
            </v-list-item>
            <v-list-item
              v-if="!recentEvents.length"
              title="Sin eventos recientes"
              subtitle="Las notificaciones de mantenimiento apareceran aqui."
              class="px-0"
            />
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" xl="6">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Procedimientos y plantillas MPG</div>
              <div class="text-body-2 text-medium-emphasis">Base operativa para mantenimientos preventivos y flujos de trabajo.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="primary" variant="tonal">{{ procedures.length }} plantillas</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('procedimientos', 'excel')" @click="exportModule('procedimientos', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('procedimientos', 'pdf')" @click="exportModule('procedimientos', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <div class="summary-strip mb-4">
            <v-chip label color="secondary" variant="tonal">Actividades: {{ totalProcedureActivities }}</v-chip>
            <v-chip label color="info" variant="tonal">Clases: {{ maintenanceClassesCount }}</v-chip>
            <v-chip label color="success" variant="tonal">Documentos base: {{ procedureDocumentCount }}</v-chip>
          </div>

          <v-table density="compact" class="report-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Plantilla</th>
                <th>Frecuencia</th>
                <th>Actividades</th>
                <th>Documento</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in procedurePreview" :key="item.id">
                <td>{{ item.codigo }}</td>
                <td>
                  <div class="font-weight-medium">{{ item.nombre }}</div>
                  <div class="text-caption text-medium-emphasis">{{ prettifyProcess(item.tipo_proceso) }}</div>
                </td>
                <td>{{ item.frecuencia_horas ? `${item.frecuencia_horas} H` : "N/A" }}</td>
                <td>{{ item.actividades?.length ?? 0 }}</td>
                <td>{{ item.documento_referencia || "Sin referencia" }}</td>
              </tr>
              <tr v-if="!procedurePreview.length">
                <td colspan="5" class="text-center text-medium-emphasis py-4">No hay procedimientos cargados.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>

      <v-col cols="12" xl="6">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Analisis de lubricante</div>
              <div class="text-body-2 text-medium-emphasis">Control predictivo por compartimento, diagnostico y nivel de alerta.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="warning" variant="tonal">{{ analyses.length }} analisis</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('analisis', 'excel')" @click="exportModule('analisis', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('analisis', 'pdf')" @click="exportModule('analisis', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <div class="summary-strip mb-4">
            <v-chip label color="error" variant="tonal">Alerta: {{ analysesInAlert }}</v-chip>
            <v-chip label color="secondary" variant="tonal">Parametros: {{ analysisDetailCount }}</v-chip>
            <v-chip label color="success" variant="tonal">Lubricantes: {{ analysisLubricantCount }}</v-chip>
          </div>

          <v-table density="compact" class="report-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Equipo</th>
                <th>Compartimento</th>
                <th>Estado</th>
                <th>Fecha reporte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in analysisPreview" :key="item.id">
                <td>{{ item.codigo }}</td>
                <td>
                  <div class="font-weight-medium">{{ item.lubricante || item.equipo_codigo || "Sin lubricante" }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.marca_lubricante || item.equipo_nombre || "Sin marca" }}</div>
                </td>
                <td>{{ item.compartimento_principal || "Sin compartimento" }}</td>
                <td>
                  <v-chip size="small" :color="chipColorForStatus(item.estado_diagnostico)" variant="tonal">
                    {{ item.estado_diagnostico || "NORMAL" }}
                  </v-chip>
                </td>
                <td>{{ item.fecha_reporte || "Sin fecha" }}</td>
              </tr>
              <tr v-if="!analysisPreview.length">
                <td colspan="5" class="text-center text-medium-emphasis py-4">No hay analisis cargados.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Reporte diario de operacion</div>
              <div class="text-body-2 text-medium-emphasis">Disponibilidad, MPG, combustible y componente por jornada.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="success" variant="tonal">{{ dailyReports.length }} reportes</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('reportes', 'excel')" @click="exportModule('reportes', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('reportes', 'pdf')" @click="exportModule('reportes', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <div v-if="latestDailyReport">
            <div class="summary-strip mb-4">
              <v-chip label color="primary" variant="tonal">{{ latestDailyReport.codigo }}</v-chip>
              <v-chip label color="info" variant="tonal">{{ latestDailyReport.fecha_reporte }}</v-chip>
              <v-chip label color="secondary" variant="tonal">{{ latestDailyReport.turno || "Sin turno" }}</v-chip>
              <v-chip label color="success" variant="tonal">Unidades: {{ latestDailyReport.unidades?.length ?? 0 }}</v-chip>
              <v-chip label color="warning" variant="tonal">Combustible: {{ latestDailyReport.combustibles?.length ?? 0 }}</v-chip>
              <v-chip label color="error" variant="tonal">Componentes: {{ latestDailyReport.componentes?.length ?? 0 }}</v-chip>
            </div>

            <v-row dense>
              <v-col cols="12" md="7">
                <div class="text-subtitle-2 font-weight-medium mb-2">Unidades registradas</div>
                <v-table density="compact" class="report-table">
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Horometro</th>
                      <th>MPG actual</th>
                      <th>Proximo MPG</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="unit in latestDailyUnits" :key="unit.id">
                      <td>{{ unit.equipo_codigo }}</td>
                      <td>{{ unit.horometro_actual ?? "N/A" }}</td>
                      <td>{{ unit.mpg_actual ?? "N/A" }}</td>
                      <td>{{ unit.proximo_mpg ?? "N/A" }}</td>
                    </tr>
                    <tr v-if="!latestDailyUnits.length">
                      <td colspan="4" class="text-center text-medium-emphasis py-3">Sin unidades asociadas.</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>

              <v-col cols="12" md="5">
                <div class="text-subtitle-2 font-weight-medium mb-2">Combustible</div>
                <v-table density="compact" class="report-table mb-4">
                  <thead>
                    <tr>
                      <th>Tanque</th>
                      <th>Galones</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="fuel in latestDailyFuel" :key="fuel.id">
                      <td>{{ fuel.tanque }}</td>
                      <td>{{ fuel.galones ?? fuel.consumo_galones ?? "N/A" }}</td>
                      <td>{{ fuel.stock_actual ?? "N/A" }}</td>
                    </tr>
                    <tr v-if="!latestDailyFuel.length">
                      <td colspan="3" class="text-center text-medium-emphasis py-3">Sin lecturas de combustible.</td>
                    </tr>
                  </tbody>
                </v-table>

                <div class="text-subtitle-2 font-weight-medium mb-2">Componentes asociados</div>
                <v-table density="compact" class="report-table">
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Componente</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="component in latestDailyComponents" :key="component.id">
                      <td>{{ component.equipo_codigo }}</td>
                      <td>{{ component.tipo_componente }}</td>
                      <td>{{ component.estado || "Sin estado" }}</td>
                    </tr>
                    <tr v-if="!latestDailyComponents.length">
                      <td colspan="3" class="text-center text-medium-emphasis py-3">Sin cambios de componente.</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>
            </v-row>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">Aun no existen reportes diarios para mostrar.</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Cronograma semanal de actividades</div>
              <div class="text-body-2 text-medium-emphasis">Vista operativa semanal para mantenimiento, SSA y actividades de soporte.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="info" variant="tonal">{{ schedules.length }} cronogramas</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('cronogramas', 'excel')" @click="exportModule('cronogramas', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('cronogramas', 'pdf')" @click="exportModule('cronogramas', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <div v-if="latestSchedule">
            <div class="summary-strip mb-4">
              <v-chip label color="primary" variant="tonal">{{ latestSchedule.codigo }}</v-chip>
              <v-chip label color="secondary" variant="tonal">{{ latestSchedule.locacion || "Sin locacion" }}</v-chip>
              <v-chip label color="info" variant="tonal">{{ latestSchedule.fecha_inicio }} / {{ latestSchedule.fecha_fin }}</v-chip>
              <v-chip label color="success" variant="tonal">Actividades: {{ latestSchedule.detalles?.length ?? 0 }}</v-chip>
            </div>

            <div class="schedule-grid">
              <div v-for="day in scheduleWeek" :key="day.key" class="schedule-day">
                <div class="font-weight-bold mb-3">{{ day.label }}</div>
                <div v-for="activity in day.items" :key="activity.id" class="schedule-item">
                  <div class="text-caption text-medium-emphasis">
                    {{ activity.hora_inicio || "--:--" }} - {{ activity.hora_fin || "--:--" }}
                  </div>
                  <div class="text-body-2 font-weight-medium">{{ activity.actividad }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ activity.tipo_proceso || "Proceso general" }}<span v-if="activity.equipo_codigo"> · {{ activity.equipo_codigo }}</span>
                  </div>
                </div>
                <div v-if="!day.items.length" class="text-caption text-medium-emphasis">Sin actividades programadas.</div>
              </div>
            </div>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">Aun no existen cronogramas semanales cargados.</div>
        </v-card>
      </v-col>
    </v-row>
  </div>

  <v-dialog v-model="dashboardDialog" :fullscreen="isDashboardDialogFullscreen" :max-width="isDashboardDialogFullscreen ? undefined : 1400">
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">Dashboard de lubricantes</v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense class="mb-4">
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="dashboardSelection"
              :items="lubricantCatalogOptions"
              item-title="label"
              return-object
              clearable
              label="Lubricante"
              variant="outlined"
              density="compact"
              @update:model-value="handleDashboardSelection"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="dashboardPeriod"
              :items="dashboardPeriodOptions"
              item-title="title"
              item-value="value"
              label="Periodo"
              variant="outlined"
              density="compact"
              @update:model-value="reloadDashboard"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="dashboardFrom"
              type="date"
              label="Desde"
              variant="outlined"
              density="compact"
              @change="reloadDashboard"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="dashboardTo"
              type="date"
              label="Hasta"
              variant="outlined"
              density="compact"
              @change="reloadDashboard"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="dashboardCompartimento"
              :items="dashboardCompartimentos"
              clearable
              label="Compartimento"
              variant="outlined"
              density="compact"
              @update:model-value="reloadDashboard"
            />
          </v-col>
        </v-row>

        <LubricantDashboardPanel
          :dashboard="lubricantDashboard"
          :loading="lubricantDashboardLoading"
          :error="lubricantDashboardError"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="dashboardDialog = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import { lubricantCompartments } from "@/app/config/lubricant-analysis";
import {
  buildDailyReportsReport,
  buildIndicatorsReport,
  buildLubricantReport,
  buildProceduresReport,
  buildWeeklyScheduleReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;
type IntelligenceCard = {
  key: string;
  label: string;
  value: number;
  helper: string;
  icon: string;
  routeName?: string;
};

type SummaryState = {
  generated_at?: string;
  kpis?: Record<string, number>;
  process_breakdown?: Array<{ tipo_proceso: string; total: number }>;
  recent_events?: AnyRow[];
  component_highlights?: AnyRow[];
};

const loading = ref(false);
const error = ref<string | null>(null);
const summary = reactive<SummaryState>({});
const procedures = ref<AnyRow[]>([]);
const analyses = ref<AnyRow[]>([]);
const schedules = ref<AnyRow[]>([]);
const dailyReports = ref<AnyRow[]>([]);
const exportState = reactive<Record<string, boolean>>({});
const router = useRouter();
const { mdAndDown } = useDisplay();
const dashboardDialog = ref(false);
const isDashboardDialogFullscreen = computed(() => mdAndDown.value);
const dashboardSelection = ref<AnyRow | null>(null);
const dashboardPeriod = ref("MENSUAL");
const dashboardFrom = ref("");
const dashboardTo = ref("");
const dashboardCompartimento = ref<string | null>(null);
const lubricantDashboard = ref<AnyRow | null>(null);
const lubricantDashboardLoading = ref(false);
const lubricantDashboardError = ref<string | null>(null);

const dashboardPeriodOptions = [
  { value: "SEMANAL", title: "Semanal" },
  { value: "MENSUAL", title: "Mensual" },
  { value: "ANUAL", title: "Anual" },
  { value: "PERSONALIZADO", title: "Personalizado" },
];

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

function resetState() {
  summary.generated_at = undefined;
  summary.kpis = {};
  summary.process_breakdown = [];
  summary.recent_events = [];
  summary.component_highlights = [];
  procedures.value = [];
  analyses.value = [];
  schedules.value = [];
  dailyReports.value = [];
}

async function loadIntelligence() {
  loading.value = true;
  error.value = null;

  try {
    const [summaryRes, proceduresRes, analysesRes, schedulesRes, reportsRes] = await Promise.all([
      api.get("/kpi_maintenance/inteligencia/summary"),
      api.get("/kpi_maintenance/inteligencia/procedimientos"),
      api.get("/kpi_maintenance/inteligencia/analisis-lubricante"),
      api.get("/kpi_maintenance/inteligencia/cronogramas-semanales"),
      api.get("/kpi_maintenance/inteligencia/reportes-diarios"),
    ]);

    resetState();
    Object.assign(summary, unwrap(summaryRes.data, {}));
    procedures.value = unwrap(proceduresRes.data, []);
    analyses.value = unwrap(analysesRes.data, []);
    schedules.value = unwrap(schedulesRes.data, []);
    dailyReports.value = unwrap(reportsRes.data, []);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar la inteligencia operativa.";
  } finally {
    loading.value = false;
  }
}

function prettifyProcess(value: string) {
  return String(value || "SIN_TIPO")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function chipColorForStatus(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  if (["ALERTA", "CRITICO", "CRITICA", "POR CAMBIO", "VENCIDA"].includes(normalized)) return "error";
  if (["OBSERVACION", "PENDIENTE", "WARNING"].includes(normalized)) return "warning";
  if (["COMPLETED", "CERRADA", "NORMAL", "OPERATIVO"].includes(normalized)) return "success";
  return "secondary";
}

function dayOrder(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  const order = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
  const index = order.indexOf(normalized);
  return index >= 0 ? index : order.length + 1;
}

function moduleReport(moduleKey: string) {
  if (moduleKey === "indicadores") return buildIndicatorsReport(summary);
  if (moduleKey === "procedimientos") return buildProceduresReport(procedures.value);
  if (moduleKey === "analisis") return buildLubricantReport(analyses.value);
  if (moduleKey === "reportes") return buildDailyReportsReport(dailyReports.value);
  return buildWeeklyScheduleReport(schedules.value);
}

function exportKey(moduleKey: string, format: "excel" | "pdf") {
  return `${moduleKey}:${format}`;
}

function isExporting(moduleKey: string, format: "excel" | "pdf") {
  return Boolean(exportState[exportKey(moduleKey, format)]);
}

async function exportModule(moduleKey: string, format: "excel" | "pdf") {
  const key = exportKey(moduleKey, format);
  exportState[key] = true;
  error.value = null;

  try {
    const report = moduleReport(moduleKey);
    if (format === "excel") {
      downloadReportExcel(report);
    } else {
      await downloadReportPdf(report);
    }
  } catch (e: any) {
    error.value = e?.message || "No se pudo generar el reporte solicitado.";
  } finally {
    exportState[key] = false;
  }
}

function openCard(card: IntelligenceCard) {
  if (card.key === "lubricantes-dashboard") {
    dashboardDialog.value = true;
    return;
  }
  if (!card.routeName) return;
  router.push({ name: card.routeName });
}

async function loadLubricantDashboard(params?: Record<string, any>) {
  lubricantDashboardLoading.value = true;
  lubricantDashboardError.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", {
      params,
    });
    lubricantDashboard.value = unwrap(data, null);
  } catch (e: any) {
    lubricantDashboardError.value =
      e?.response?.data?.message || "No se pudo cargar el dashboard de lubricantes.";
  } finally {
    lubricantDashboardLoading.value = false;
  }
}

async function handleDashboardSelection(value: AnyRow | null) {
  if (!value) {
    lubricantDashboard.value = null;
    return;
  }
  await loadLubricantDashboard({
    lubricante: value.lubricante,
    marca_lubricante: value.marca_lubricante,
    periodo: dashboardPeriod.value,
    from: dashboardFrom.value || undefined,
    to: dashboardTo.value || undefined,
    compartimento: dashboardCompartimento.value || undefined,
  });
}

async function reloadDashboard() {
  if (!dashboardSelection.value) return;
  await handleDashboardSelection(dashboardSelection.value);
}

const generatedAtLabel = computed(() => {
  if (!summary.generated_at) return "Sin sincronizar";
  return new Date(summary.generated_at).toLocaleString();
});

const breakdownItems = computed(() => summary.process_breakdown ?? []);

const analysesInAlert = computed(
  () => analyses.value.filter((item) => String(item.estado_diagnostico || "").toUpperCase() === "ALERTA").length,
);

const kpiCards = computed<IntelligenceCard[]>(() => [
  {
    key: "procedimientos",
    label: "Plantillas MPG",
    value: procedures.value.length,
    helper: "Procedimientos y checklist operativos",
    icon: "mdi-file-document-multiple-outline",
    routeName: "inteligencia-procedimientos",
  },
  {
    key: "analisis",
    label: "Analisis lubricante",
    value: analyses.value.length,
    helper: `${analysesInAlert.value} en alerta`,
    icon: "mdi-flask-outline",
    routeName: "inteligencia-analisis-lubricante",
  },
  {
    key: "lubricantes-dashboard",
    label: "Lubricantes registrados",
    value: analysisLubricantCount.value,
    helper: "Abre el dashboard predictivo por lubricante",
    icon: "mdi-oil",
  },
  {
    key: "componentes",
    label: "Componentes criticos",
    value: summary.kpis?.componentes_monitoreados ?? 0,
    helper: "Indicador dinamico desde reporte diario y KPI",
    icon: "mdi-engine-outline",
  },
  {
    key: "reportes",
    label: "Reportes diarios",
    value: dailyReports.value.length,
    helper: "Operacion, combustible y MPG",
    icon: "mdi-text-box-check-outline",
  },
  {
    key: "cronogramas",
    label: "Cronogramas",
    value: schedules.value.length,
    helper: "Planificacion semanal de campo",
    icon: "mdi-calendar-week-outline",
  },
  {
    key: "eventos",
    label: "Eventos KPI",
    value: summary.kpis?.eventos_proceso ?? 0,
    helper: "Notificaciones y trazabilidad",
    icon: "mdi-bell-ring-outline",
  },
]);

const processIndicatorRows = computed(() => [
  {
    key: "vencidas",
    label: "Programaciones vencidas",
    value: summary.kpis?.programaciones_vencidas ?? 0,
    helper: "Planes detectados fuera de ventana",
  },
  {
    key: "ots",
    label: "OT pendientes",
    value: summary.kpis?.work_orders_pendientes ?? 0,
    helper: "Ordenes planificadas o en proceso",
  },
  {
    key: "eventos",
    label: "Eventos de proceso",
    value: summary.kpis?.eventos_proceso ?? 0,
    helper: "Notificaciones emitidas por flujo principal",
  },
  {
    key: "componentes",
    label: "Componentes monitoreados",
    value: summary.kpis?.componentes_monitoreados ?? 0,
    helper: "Turbos, inyectores y conjuntos mayores",
  },
]);

const recentEvents = computed(() =>
  (summary.recent_events ?? []).map((item: AnyRow) => ({
    id: item.id,
    title: `${prettifyProcess(item.tipo_proceso)} · ${item.accion}`,
    subtitle: `${item.referencia_codigo || item.referencia_tabla || "Sin referencia"}${item.fecha_evento ? ` · ${new Date(item.fecha_evento).toLocaleString()}` : ""}`,
  })),
);

const procedurePreview = computed(() => procedures.value.slice(0, 6));
const totalProcedureActivities = computed(() =>
  procedures.value.reduce((acc, item) => acc + Number(item.actividades?.length ?? 0), 0),
);
const maintenanceClassesCount = computed(
  () => new Set(procedures.value.map((item) => item.clase_mantenimiento).filter(Boolean)).size,
);
const procedureDocumentCount = computed(
  () => new Set(procedures.value.map((item) => item.documento_referencia).filter(Boolean)).size,
);

const analysisPreview = computed(() => analyses.value.slice(0, 6));
const analysisDetailCount = computed(() =>
  analyses.value.reduce((acc, item) => acc + Number(item.detalles?.length ?? 0), 0),
);
const analysisLubricantCount = computed(
  () =>
    new Set(
      analyses.value
        .map((item) => item.lubricante || item.equipo_codigo)
        .filter(Boolean),
    ).size,
);
const lubricantCatalogOptions = computed(() =>
  [...new Map(
    analyses.value
      .filter((item) => item.lubricante || item.equipo_codigo)
      .map((item) => {
        const lubricante = item.lubricante || item.equipo_codigo;
        const marca = item.marca_lubricante || item.equipo_nombre || "";
        const codigo = item.lubricante_codigo || "";
        const key = `${codigo}::${lubricante}::${marca}`;
        return [
          key,
          {
            key,
            lubricante,
            marca_lubricante: marca || null,
            lubricante_codigo: codigo || null,
            label: [codigo, lubricante, marca].filter(Boolean).join(" · "),
          },
        ] as const;
      }),
  ).values()],
);
const dashboardCompartimentos = lubricantCompartments;

const latestDailyReport = computed(() => dailyReports.value[0] ?? null);
const latestDailyUnits = computed(() => (latestDailyReport.value?.unidades ?? []).slice(0, 6));
const latestDailyFuel = computed(() => (latestDailyReport.value?.combustibles ?? []).slice(0, 4));
const latestDailyComponents = computed(() => (latestDailyReport.value?.componentes ?? []).slice(0, 4));

const latestSchedule = computed(() => schedules.value[0] ?? null);
const scheduleWeek = computed(() => {
  const base = [
    { key: "LUNES", label: "Lunes", items: [] as AnyRow[] },
    { key: "MARTES", label: "Martes", items: [] as AnyRow[] },
    { key: "MIERCOLES", label: "Miercoles", items: [] as AnyRow[] },
    { key: "JUEVES", label: "Jueves", items: [] as AnyRow[] },
    { key: "VIERNES", label: "Viernes", items: [] as AnyRow[] },
    { key: "SABADO", label: "Sabado", items: [] as AnyRow[] },
    { key: "DOMINGO", label: "Domingo", items: [] as AnyRow[] },
  ];

  const lookup = new Map(base.map((item) => [item.key, item]));
  const details = [...(latestSchedule.value?.detalles ?? [])].sort(
    (a, b) =>
      dayOrder(a.dia_semana) - dayOrder(b.dia_semana) ||
      String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")),
  );

  for (const item of details) {
    const key = String(item.dia_semana || "").trim().toUpperCase();
    const target = lookup.get(key) || base[0]!;
    target.items.push(item);
  }

  return base;
});

onMounted(() => {
  loadIntelligence();
});
</script>

<style scoped>
.intelligence-page {
  display: grid;
  gap: 20px;
}

.intelligence-hero {
  overflow: hidden;
}

.intelligence-kpi {
  border-color: var(--surface-border);
  background: var(--surface-soft);
}

.intelligence-kpi--clickable {
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.intelligence-kpi--clickable:hover,
.intelligence-kpi--clickable:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(31, 75, 122, 0.35);
  box-shadow: 0 14px 28px rgba(31, 75, 122, 0.12);
  outline: none;
}

.intelligence-wrap {
  gap: 12px;
  flex-wrap: wrap;
}

.indicator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.indicator-tile {
  padding: 14px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-soft);
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.breakdown-chip {
  padding: 14px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-soft);
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.report-table {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.35);
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.schedule-day {
  padding: 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-soft);
  min-height: 180px;
}

.schedule-item {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(31, 75, 122, 0.12);
  background: rgba(31, 75, 122, 0.06);
  margin-bottom: 10px;
}

.h-100 {
  height: 100%;
}

@media (max-width: 960px) {
  .intelligence-page {
    gap: 14px;
  }

  .indicator-grid,
  .breakdown-grid,
  .schedule-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .indicator-tile,
  .breakdown-chip,
  .schedule-day {
    padding: 12px;
  }
}
</style>

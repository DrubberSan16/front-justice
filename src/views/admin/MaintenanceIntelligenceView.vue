<template>
  <div class="intelligence-page">
    <v-card rounded="xl" class="pa-5 enterprise-surface intelligence-hero">
      <div class="d-flex align-center justify-space-between intelligence-wrap">
        <div>
          <div class="text-h6 font-weight-bold">Inteligencia operativa de mantenimiento</div>
          <div class="text-body-2 text-medium-emphasis">
            Consolida procedimientos MPG, analisis de lubricante, cronogramas, reportes diarios, componentes criticos y eventos KPI.
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
          <v-card rounded="lg" variant="outlined" class="pa-4 intelligence-kpi h-100">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 text-medium-emphasis">{{ card.label }}</div>
              <v-icon :icon="card.icon" size="20" />
            </div>
            <div class="text-h4 font-weight-bold">{{ card.value }}</div>
            <div class="text-body-2 text-medium-emphasis mt-2">{{ card.helper }}</div>
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
            <v-chip label color="success" variant="tonal">Equipos: {{ analysisEquipmentCount }}</v-chip>
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
                <td>{{ item.equipo_codigo || item.equipo_nombre || "Sin equipo" }}</td>
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
      <v-col cols="12" xl="5">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Control de componentes criticos</div>
              <div class="text-body-2 text-medium-emphasis">Seguimiento de cambios mayores, horas de uso y causas de retiro.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="error" variant="tonal">{{ components.length }} registros</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('componentes', 'excel')" @click="exportModule('componentes', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('componentes', 'pdf')" @click="exportModule('componentes', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <div class="summary-strip mb-4">
            <v-chip label color="warning" variant="tonal">En alerta: {{ componentAlertCount }}</v-chip>
            <v-chip label color="secondary" variant="tonal">Tipos: {{ componentTypeCount }}</v-chip>
            <v-chip label color="info" variant="tonal">Equipos: {{ componentEquipmentCount }}</v-chip>
          </div>

          <v-table density="compact" class="report-table">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Componente</th>
                <th>Estado</th>
                <th>Horas uso</th>
                <th>Reporte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in componentPreview" :key="item.id">
                <td>{{ item.equipo_codigo || "Sin equipo" }}</td>
                <td>
                  <div class="font-weight-medium">{{ item.tipo_componente || "Sin componente" }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.posicion || item.serie || "Sin posicion" }}</div>
                </td>
                <td>
                  <v-chip size="small" :color="chipColorForStatus(item.estado)" variant="tonal">
                    {{ item.estado || "Sin estado" }}
                  </v-chip>
                </td>
                <td>{{ item.horas_uso ?? "N/A" }}</td>
                <td>{{ item.reporte_codigo || item.fecha_reporte || "Sin reporte" }}</td>
              </tr>
              <tr v-if="!componentPreview.length">
                <td colspan="5" class="text-center text-medium-emphasis py-4">No hay componentes registrados.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>

      <v-col cols="12" xl="7">
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
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import {
  buildComponentsReport,
  buildDailyReportsReport,
  buildIndicatorsReport,
  buildLubricantReport,
  buildProceduresReport,
  buildWeeklyScheduleReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;

type SummaryState = {
  generated_at?: string;
  kpis?: Record<string, number>;
  process_breakdown?: Array<{ tipo_proceso: string; total: number }>;
  recent_events?: AnyRow[];
};

const loading = ref(false);
const error = ref<string | null>(null);
const summary = reactive<SummaryState>({});
const procedures = ref<AnyRow[]>([]);
const analyses = ref<AnyRow[]>([]);
const schedules = ref<AnyRow[]>([]);
const dailyReports = ref<AnyRow[]>([]);
const components = ref<AnyRow[]>([]);
const exportState = reactive<Record<string, boolean>>({});

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

function resetState() {
  summary.generated_at = undefined;
  summary.kpis = {};
  summary.process_breakdown = [];
  summary.recent_events = [];
  procedures.value = [];
  analyses.value = [];
  schedules.value = [];
  dailyReports.value = [];
  components.value = [];
}

async function loadIntelligence() {
  loading.value = true;
  error.value = null;

  try {
    const [summaryRes, proceduresRes, analysesRes, schedulesRes, reportsRes, componentsRes] = await Promise.all([
      api.get("/kpi_maintenance/inteligencia/summary"),
      api.get("/kpi_maintenance/inteligencia/procedimientos"),
      api.get("/kpi_maintenance/inteligencia/analisis-lubricante"),
      api.get("/kpi_maintenance/inteligencia/cronogramas-semanales"),
      api.get("/kpi_maintenance/inteligencia/reportes-diarios"),
      api.get("/kpi_maintenance/inteligencia/control-componentes"),
    ]);

    resetState();
    Object.assign(summary, unwrap(summaryRes.data, {}));
    procedures.value = unwrap(proceduresRes.data, []);
    analyses.value = unwrap(analysesRes.data, []);
    schedules.value = unwrap(schedulesRes.data, []);
    dailyReports.value = unwrap(reportsRes.data, []);
    components.value = unwrap(componentsRes.data, []);
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

function isComponentInAlert(item: AnyRow) {
  return ["ALERTA", "CRITICO", "CRITICA", "POR CAMBIO"].includes(String(item.estado || "").toUpperCase());
}

function moduleReport(moduleKey: string) {
  if (moduleKey === "indicadores") return buildIndicatorsReport(summary);
  if (moduleKey === "procedimientos") return buildProceduresReport(procedures.value);
  if (moduleKey === "analisis") return buildLubricantReport(analyses.value);
  if (moduleKey === "componentes") return buildComponentsReport(components.value);
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

const generatedAtLabel = computed(() => {
  if (!summary.generated_at) return "Sin sincronizar";
  return new Date(summary.generated_at).toLocaleString();
});

const breakdownItems = computed(() => summary.process_breakdown ?? []);

const analysesInAlert = computed(
  () => analyses.value.filter((item) => String(item.estado_diagnostico || "").toUpperCase() === "ALERTA").length,
);

const componentAlertCount = computed(() => components.value.filter((item) => isComponentInAlert(item)).length);
const componentTypeCount = computed(
  () => new Set(components.value.map((item) => item.tipo_componente).filter(Boolean)).size,
);
const componentEquipmentCount = computed(
  () => new Set(components.value.map((item) => item.equipo_codigo).filter(Boolean)).size,
);

const kpiCards = computed(() => [
  {
    key: "procedimientos",
    label: "Plantillas MPG",
    value: procedures.value.length,
    helper: "Procedimientos y checklist operativos",
    icon: "mdi-file-document-multiple-outline",
  },
  {
    key: "analisis",
    label: "Analisis lubricante",
    value: analyses.value.length,
    helper: `${analysesInAlert.value} en alerta`,
    icon: "mdi-flask-outline",
  },
  {
    key: "componentes",
    label: "Componentes criticos",
    value: components.value.length,
    helper: `${componentAlertCount.value} con seguimiento prioritario`,
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
const analysisEquipmentCount = computed(
  () => new Set(analyses.value.map((item) => item.equipo_codigo || item.equipo_nombre).filter(Boolean)).size,
);

const componentPreview = computed(() => components.value.slice(0, 7));

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
</style>

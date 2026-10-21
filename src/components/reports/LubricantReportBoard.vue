<template>
  <div :ref="setMotionRoot" class="lub-board">
    <!-- Resumen visual: como el Dashboard Gerencia, todo el reporte cabe en el
         riel sin bajar la página. Cada tarjeta abre su detalle en una ventana,
         y al presionar su gráfico se abre el detalle de ese punto. -->
    <section class="board-section summary-deck" aria-label="Resumen del período">
      <div class="deck-tools">
        <v-btn variant="text" prepend-icon="mdi-book-open-variant" @click="openSection('guide')">
          Cómo leer este reporte
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="tonal"
              prepend-icon="mdi-file-chart-outline"
              append-icon="mdi-menu-down"
              :loading="exporting === 'todo'"
            >
              Exportar
            </v-btn>
          </template>
          <v-list density="compact" min-width="230">
            <v-list-item prepend-icon="mdi-file-pdf-box" title="Vista PDF" subtitle="Resumen y fuera de límite" @click="exportItems('pdf', rangeAnalyses)" />
            <v-list-item prepend-icon="mdi-file-excel" title="Excel" subtitle="Con todos los parámetros" @click="exportItems('excel', rangeAnalyses)" />
          </v-list>
        </v-menu>
      </div>
      <KpiCardRail
        title="Resumen del período"
        :subtitle="`${rangeLabel} · Condición validada contra los límites del laboratorio. Presione un gráfico para ver su detalle.`"
        aria-label="Resumen del período"
        :show-pagination="false"
      >
        <KpiInsightCard
          title="Condición de las muestras"
          subtitle="Cada muestra frente a sus límites"
          icon="mdi-test-tube"
          :accent="statusPaint.warning"
          :value="formatCount(rangeAnalyses.length)"
          value-caption="muestras"
          :helper="labDifferenceHelper"
          variant="donut"
          show-share
          interactive
          :points="sampleLevelPoints"
          empty-text="No hay muestras en este rango."
          action-label="Abrir detalle"
          preview-label="Vista PDF"
          @point="(point) => openSamples({ level: point.key as LubricantLevel })"
          @action="openSamples()"
          @preview="exportItems('pdf', rangeAnalyses)"
        />
        <KpiInsightCard
          title="Condición actual por equipo"
          subtitle="Según la última muestra de cada equipo"
          icon="mdi-engine-outline"
          :accent="seriesColor(0, isDark)"
          :value="formatCount(equipmentGroups.length)"
          value-caption="equipos"
          :helper="equipmentAttentionHelper"
          variant="donut"
          show-share
          interactive
          :points="equipmentLevelPoints"
          empty-text="No hay equipos con muestras en este rango."
          action-label="Abrir detalle"
          preview-label="Vista PDF"
          @point="(point) => openEquipmentList(point.key as LubricantLevel)"
          @action="openEquipmentList()"
          @preview="exportItems('pdf', rangeAnalyses)"
        />
        <KpiInsightCard
          title="Parámetros fuera de límite"
          subtitle="Veces que cada parámetro salió de su límite"
          icon="mdi-flask-outline"
          :accent="statusPaint.critical"
          :value="formatCount(totalFindings)"
          value-caption="resultados"
          helper="Presione una barra para ver cada muestra fuera de límite."
          variant="hbars"
          :chart-height="rankingChartHeight(parameterRankingPoints.length)"
          interactive
          :points="parameterRankingPoints"
          empty-text="Ningún parámetro salió de su límite en este rango."
          action-label="Abrir detalle"
          preview-label="Vista PDF"
          @point="(point) => openParameter(point.key)"
          @action="openParameter()"
          @preview="exportItems('pdf', rangeAnalyses)"
        />
        <KpiInsightCard
          title="Muestras por mes"
          subtitle="Ritmo de muestreo del período"
          icon="mdi-calendar-month-outline"
          :accent="seriesColor(2, isDark)"
          :value="latestSampleDate || 'Sin muestras'"
          value-caption="última muestra"
          :helper="samplingHelper"
          variant="bars"
          interactive
          :points="monthlyPoints"
          empty-text="No hay muestras en este rango."
          action-label="Abrir detalle"
          preview-label="Vista PDF"
          @point="(point) => openSamples({ month: point.key })"
          @action="openSamples()"
          @preview="exportItems('pdf', rangeAnalyses)"
        />
      </KpiCardRail>
    </section>

    <!-- Detalle de una sección (ventana, como el Dashboard Gerencia) -->
    <v-dialog
      v-model="sectionOpen"
      max-width="1680"
      width="calc(100% - 24px)"
      :fullscreen="smAndDown"
      scrollable
    >
      <v-card class="section-workspace" rounded="xl">
        <header class="section-workspace__header">
          <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" aria-label="Regresar al resumen" @click="sectionOpen = false" />
          <div class="section-workspace__heading">
            <span>Detalle del período · {{ rangeLabel }}</span>
            <h2>{{ sectionTitle }}</h2>
          </div>
          <v-spacer />
          <v-menu v-if="section !== 'guide'" location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" variant="tonal" prepend-icon="mdi-file-chart-outline" append-icon="mdi-menu-down" :loading="exporting === 'todo'">
                Exportar lo visible
              </v-btn>
            </template>
            <v-list density="compact" min-width="200">
              <v-list-item prepend-icon="mdi-file-pdf-box" title="Vista PDF" @click="exportItems('pdf', sectionItems)" />
              <v-list-item prepend-icon="mdi-file-excel" title="Excel" @click="exportItems('excel', sectionItems)" />
            </v-list>
          </v-menu>
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle" @click="sectionOpen = false" />
        </header>
        <v-divider />
        <v-card-text class="section-workspace__body">
          <!-- Muestras -->
          <template v-if="section === 'samples'">
            <div class="workspace-filters">
              <div class="level-filter" role="group" aria-label="Filtrar por condición">
                <v-btn
                  v-for="option in sampleLevelOptions"
                  :key="option.key"
                  size="small"
                  :variant="sampleLevel === option.key ? 'flat' : 'tonal'"
                  :color="sampleLevel === option.key ? option.color : undefined"
                  :aria-pressed="sampleLevel === option.key"
                  @click="sampleLevel = option.key"
                >
                  {{ option.title }} · {{ option.count }}
                </v-btn>
              </div>
              <v-select
                v-model="sampleMonth"
                :items="monthOptions"
                item-title="title"
                item-value="value"
                label="Mes"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
              <v-text-field
                v-model="sampleSearch"
                label="Buscar equipo, código o muestra"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-magnify"
                clearable
                hide-details
              />
            </div>
            <p class="workspace-hint">{{ visibleSamples.length }} muestras. Presione una fila para ver la validación del equipo.</p>
            <div v-if="visibleSamples.length" class="lub-list">
              <div class="lub-list__head lub-list__row--samples" aria-hidden="true">
                <span>Fecha informe</span>
                <span>Equipo</span>
                <span>Condición</span>
                <span>Fuera de límite</span>
                <span></span>
              </div>
              <div class="lub-list__scroll">
                <button
                  v-for="sample in visibleSamples"
                  :key="sample.id"
                  type="button"
                  class="lub-list__row lub-list__row--samples"
                  :class="`lub-list__row--${sample.meta.color}`"
                  @click="openEquipmentByKey(sample.groupKey)"
                >
                  <span class="lub-list__cell">
                    <strong>{{ sample.fecha || "Sin fecha" }}</strong>
                    <small>{{ sample.codigo }} · {{ sample.muestra || "Sin número" }}</small>
                  </span>
                  <span class="lub-list__cell">
                    <strong>{{ sample.equipoTitulo }}</strong>
                    <small>{{ sample.lubricante }} · {{ sample.compartimento || "Sin compartimento" }}</small>
                  </span>
                  <span class="lub-list__cell">
                    <v-chip size="small" :color="sample.meta.color" variant="tonal" :prepend-icon="sample.meta.icon">{{ sample.meta.title }}</v-chip>
                    <small v-if="sample.labDiffers">Laboratorio: {{ sample.labMeta.title }}</small>
                  </span>
                  <span class="lub-list__findings">
                    <template v-if="sample.findings.length">
                      <span
                        v-for="finding in sample.findings.slice(0, 3)"
                        :key="finding.key"
                        class="finding-tag"
                        :class="`finding-tag--${finding.nivel === 'ANORMAL' ? 'error' : 'warning'}`"
                      >{{ formatLubricantFinding(finding) }}</span>
                      <small v-if="sample.findings.length > 3">y {{ sample.findings.length - 3 }} más</small>
                    </template>
                    <small v-else>Todos dentro de límite</small>
                  </span>
                  <v-icon icon="mdi-chevron-right" size="20" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div v-else class="compact-empty">No hay muestras con estos filtros.</div>
          </template>

          <!-- Equipos -->
          <template v-else-if="section === 'equipment'">
            <div class="workspace-filters">
              <div class="level-filter" role="group" aria-label="Filtrar por condición actual">
                <v-btn
                  v-for="option in equipmentLevelOptions"
                  :key="option.key"
                  size="small"
                  :variant="equipmentLevel === option.key ? 'flat' : 'tonal'"
                  :color="equipmentLevel === option.key ? option.color : undefined"
                  :aria-pressed="equipmentLevel === option.key"
                  @click="equipmentLevel = option.key"
                >
                  {{ option.title }} · {{ option.count }}
                </v-btn>
              </div>
              <v-text-field
                v-model="equipmentSearch"
                label="Buscar equipo o aceite"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-magnify"
                clearable
                hide-details
              />
            </div>
            <p class="workspace-hint">Última muestra de cada equipo y el parámetro que la dejó fuera de límite. Presione un equipo para ver su validación y sus tendencias.</p>
            <div v-if="visibleEquipmentGroups.length" class="lub-list">
              <div class="lub-list__head lub-list__row--equipment" aria-hidden="true">
                <span>Equipo</span>
                <span>Última muestra</span>
                <span>Condición</span>
                <span>Fuera de límite</span>
                <span>Muestras</span>
                <span></span>
              </div>
              <div class="lub-list__scroll">
                <button
                  v-for="group in visibleEquipmentGroups"
                  :key="group.group_key"
                  type="button"
                  class="lub-list__row lub-list__row--equipment"
                  :class="`lub-list__row--${group.meta.color}`"
                  @click="openEquipment(group)"
                >
                  <span class="lub-list__cell">
                    <strong>{{ group.equipo_titulo }}</strong>
                    <small>{{ group.equipo_detalle }}</small>
                    <small>{{ group.lubricante }} · {{ group.compartimentos.join(", ") || "Sin compartimento" }}</small>
                  </span>
                  <span class="lub-list__cell">
                    <span>{{ group.ultimo_informe || "Sin fecha" }}</span>
                    <small>{{ group.ultimo_numero_muestra || "Sin número" }}</small>
                  </span>
                  <span class="lub-list__cell">
                    <v-chip size="small" :color="group.meta.color" variant="tonal" :prepend-icon="group.meta.icon">{{ group.meta.title }}</v-chip>
                    <small v-if="group.labDiffers">Laboratorio: {{ group.labMeta.title }}</small>
                  </span>
                  <span class="lub-list__findings">
                    <template v-if="group.findings.length">
                      <span
                        v-for="finding in group.findings.slice(0, 3)"
                        :key="finding.key"
                        class="finding-tag"
                        :class="`finding-tag--${finding.nivel === 'ANORMAL' ? 'error' : 'warning'}`"
                      >{{ formatLubricantFinding(finding) }}</span>
                      <small v-if="group.findings.length > 3">y {{ group.findings.length - 3 }} más</small>
                    </template>
                    <small v-else>Todos dentro de límite</small>
                  </span>
                  <span class="lub-list__cell lub-list__cell--num">
                    <span>{{ group.total_analisis }}<span class="lub-list__unit"> {{ group.total_analisis === 1 ? "muestra" : "muestras" }}</span></span>
                    <small v-if="group.historyText">{{ group.historyText }}</small>
                  </span>
                  <v-icon icon="mdi-chevron-right" size="20" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div v-else class="compact-empty">No hay equipos con estos filtros.</div>
          </template>

          <!-- Parámetros -->
          <template v-else-if="section === 'parameters'">
            <div v-if="parameterRanking.length" class="param-layout">
              <nav class="param-list" aria-label="Parámetros fuera de límite">
                <button
                  v-for="entry in parameterRanking"
                  :key="entry.key"
                  type="button"
                  class="param-list__item"
                  :class="{ 'param-list__item--active': entry.key === selectedParameterKey }"
                  :aria-current="entry.key === selectedParameterKey ? 'true' : undefined"
                  @click="selectedParameterKey = entry.key"
                >
                  <span class="param-list__name">{{ entry.label }}</span>
                  <span class="param-list__counts">
                    <span v-if="entry.abnormal" class="finding-tag finding-tag--error">{{ entry.abnormal }} anormal</span>
                    <span v-if="entry.caution" class="finding-tag finding-tag--warning">{{ entry.caution }} precaución</span>
                  </span>
                </button>
              </nav>
              <div class="param-detail">
                <header v-if="selectedParameter" class="param-detail__head">
                  <span class="lub-eyebrow">{{ selectedParameterRows[0]?.grupo || "Parámetro" }}</span>
                  <h3>{{ selectedParameter.label }}</h3>
                  <p v-if="selectedParameterGuide">
                    {{ selectedParameterGuide.what }}
                    <strong>Fuera de límite:</strong> {{ selectedParameterGuide.outOfRange }}
                  </p>
                  <p class="workspace-hint">
                    {{ selectedParameterRows.length }} resultados fuera de límite en el período. Presione una fila para ver el equipo y la tendencia del parámetro.
                  </p>
                </header>
                <div class="lub-list">
                  <div class="lub-list__head lub-list__row--params" aria-hidden="true">
                    <span>Fecha informe</span>
                    <span>Equipo</span>
                    <span>Resultado</span>
                    <span>Límite superado</span>
                    <span>Estado</span>
                    <span></span>
                  </div>
                  <div class="lub-list__scroll">
                    <button
                      v-for="row in selectedParameterRows"
                      :key="row.key"
                      type="button"
                      class="lub-list__row lub-list__row--params"
                      :class="`lub-list__row--${row.meta.color}`"
                      @click="openEquipmentByKey(row.groupKey)"
                    >
                      <span class="lub-list__cell">
                        <strong>{{ row.fecha || "Sin fecha" }}</strong>
                        <small>{{ row.codigo }} · {{ row.muestra || "Sin número" }}</small>
                      </span>
                      <span class="lub-list__cell">
                        <strong>{{ row.equipoTitulo }}</strong>
                        <small>{{ row.equipoDetalle }}</small>
                      </span>
                      <span class="lub-list__cell"><strong>{{ row.valor }}</strong></span>
                      <span class="lub-list__cell">{{ row.limite || "Sin límite informado" }}</span>
                      <span class="lub-list__cell">
                        <v-chip size="small" :color="row.meta.color" variant="tonal" :prepend-icon="row.meta.icon">{{ row.meta.title }}</v-chip>
                      </span>
                      <v-icon icon="mdi-chevron-right" size="20" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="compact-empty">Ningún parámetro salió de su límite en este período.</div>
          </template>

          <!-- Guía -->
          <template v-else>
            <div class="guide-levels">
              <article v-for="level in guideLevels" :key="level.key" class="guide-level" :class="`guide-level--${level.color}`">
                <v-icon :icon="level.icon" size="22" aria-hidden="true" />
                <div>
                  <strong>{{ level.title }}</strong>
                  <p>{{ level.meaning }}</p>
                </div>
              </article>
            </div>
            <div class="guide-notes">
              <p>
                <strong>Los límites.</strong> El laboratorio fija para cada parámetro un límite de precaución y otro
                anormal. «Desde 100 ppm» quiere decir que a partir de 100 ppm el resultado entra en esa condición;
                «por debajo de 12,3 cSt», que preocupa si baja. Los límites pueden cambiar entre informes: cada
                gráfico traza el que regía en cada muestra.
              </p>
              <p>
                <strong>Condición validada y condición del laboratorio.</strong> La condición de este reporte se
                calcula comparando cada resultado con sus límites. El informe del laboratorio trae además su propia
                evaluación; cuando no coinciden, se indica debajo de la condición.
              </p>
            </div>
            <v-expansion-panels variant="accordion" multiple class="guide-glossary">
              <v-expansion-panel v-for="group in guideGroups" :key="group.title">
                <v-expansion-panel-title>
                  <div>
                    <strong>{{ group.title }}</strong>
                    <div class="text-caption text-medium-emphasis">{{ group.description }}</div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <dl class="guide-params">
                    <div v-for="param in group.params" :key="param.key">
                      <dt>{{ param.label }}</dt>
                      <dd>{{ param.what }} <span>{{ param.outOfRange }}</span></dd>
                    </div>
                  </dl>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Detalle del equipo: validación por parámetro y tendencias -->
    <v-dialog
      v-model="equipmentOpen"
      max-width="1680"
      width="calc(100% - 24px)"
      :fullscreen="smAndDown"
      scrollable
    >
      <v-card class="section-workspace" rounded="xl">
        <header class="section-workspace__header">
          <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" aria-label="Regresar" @click="equipmentOpen = false" />
          <div class="section-workspace__heading">
            <span>Análisis del equipo · {{ selectedGroup?.equipo_detalle }} · {{ rangeLabel }}</span>
            <h2>{{ selectedGroup?.equipo_titulo || "Equipo" }}</h2>
          </div>
          <v-spacer />
          <v-menu v-if="selectedGroup" location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" variant="tonal" prepend-icon="mdi-file-chart-outline" append-icon="mdi-menu-down" :loading="exporting === 'equipo'">
                Exportar equipo
              </v-btn>
            </template>
            <v-list density="compact" min-width="200">
              <v-list-item prepend-icon="mdi-file-pdf-box" title="Vista PDF" @click="exportEquipment('pdf')" />
              <v-list-item prepend-icon="mdi-file-excel" title="Excel" @click="exportEquipment('excel')" />
            </v-list>
          </v-menu>
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle" @click="equipmentOpen = false" />
        </header>
        <v-divider />
        <v-card-text class="section-workspace__body">
          <LubricantValidationPanel :dashboard="dashboard" :loading="dashboardLoading" :error="dashboardError" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <ReportPreviewDialogs :preview="reportPreview" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useDisplay, useTheme } from "vuetify";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { resolveMotionElement, useRevealMotion } from "@/app/motion";
import { chartInk, chartStatus, seriesColor } from "@/app/config/chart-theme";
import {
  formatLubricantNumber,
  lubricantGroupGuide,
  lubricantLevelMeta,
  lubricantParameterGuide,
  lubricantParameterGuideFor,
  lubricantParameterTemplates,
  type LubricantLevel,
} from "@/app/config/lubricant-analysis";
import {
  resolveEquipmentBrand,
  resolveEquipmentLocation,
  resolveEquipmentModel,
  resolveEquipmentName,
} from "@/app/utils/equipment-display";
import {
  buildLubricantReport,
  formatLubricantFinding,
  labLubricantLevel,
  lubricantFindings,
  resolveLubricantReportDate,
  validatedLubricantLevel,
  type LubricantFinding,
} from "@/app/utils/lubricant-report";
import type { ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";
import { useReportPreview } from "@/app/utils/report-preview";
import KpiCardRail from "@/components/dashboard/KpiCardRail.vue";
import KpiInsightCard from "@/components/dashboard/KpiInsightCard.vue";
import LubricantValidationPanel from "@/components/reports/LubricantValidationPanel.vue";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";

/**
 * Reporte de análisis de lubricante de Reportería, con la forma del
 * Dashboard Gerencia: el riel resume el período y cada tarjeta abre su
 * detalle en una ventana (al presionar el gráfico, el detalle de ese punto).
 * Cada muestra se valida contra los límites que fija el laboratorio para cada
 * parámetro. Recibe la lista resumida (con `hallazgos`) y el rango del Centro
 * de Informes; los detalles se piden solo al abrir un equipo o al exportar.
 */
type AnyRow = Record<string, any>;
type LevelMeta = (typeof lubricantLevelMeta)[LubricantLevel];
type SectionKey = "samples" | "equipment" | "parameters" | "guide";
type LevelFilter = LubricantLevel | "TODOS";
type EquipmentGroup = {
  group_key: string;
  lubricante: string;
  marca_lubricante: string;
  equipo_id: string | null;
  equipo_codigo: string | null;
  equipo_nombre: string | null;
  equipo_modelo: string | null;
  equipo_titulo: string;
  equipo_detalle: string;
  items: AnyRow[];
  compartimentos: string[];
  total_analisis: number;
  historyText: string;
  ultimo_informe: string;
  ultimo_numero_muestra: string;
  level: LubricantLevel;
  meta: LevelMeta;
  labMeta: LevelMeta;
  labDiffers: boolean;
  findings: LubricantFinding[];
};

const props = defineProps<{ rows: AnyRow[]; startDate: string; endDate: string }>();

const ui = useUiStore();
const theme = useTheme();
const { smAndDown } = useDisplay();
const isDark = computed(() => theme.global.current.value.dark);
const statusPaint = computed(() => chartStatus(isDark.value));
const reportPreview = useReportPreview({ title: "Previsualización del análisis de lubricante" });

const section = ref<SectionKey>("samples");
const sectionOpen = ref(false);
const sampleLevel = ref<LevelFilter>("TODOS");
const sampleMonth = ref<string | null>(null);
const sampleSearch = ref("");
const equipmentLevel = ref<LevelFilter>("TODOS");
const equipmentSearch = ref("");
const selectedParameterKey = ref<string | null>(null);
const equipmentOpen = ref(false);
const selectedGroupKey = ref<string | null>(null);
const dashboard = ref<AnyRow | null>(null);
const dashboardLoading = ref(false);
const dashboardError = ref<string | null>(null);
const exporting = ref<"todo" | "equipo" | null>(null);

const countFormatter = new Intl.NumberFormat("es-EC");
function formatCount(value: number) {
  return countFormatter.format(value);
}

const rangeLabel = computed(() => `Del ${props.startDate || "inicio"} al ${props.endDate || "hoy"}`);

const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function monthLabel(month: string, longYear = false) {
  const [year, monthNumber] = month.split("-").map(Number);
  const yearText = longYear ? String(year) : String(year).slice(2);
  return `${MONTH_NAMES[(monthNumber || 1) - 1]} ${yearText}`;
}

/* ----------------------------- Muestras -------------------------------- */

function isWithinRange(item: AnyRow) {
  const date = resolveLubricantReportDate(item) ?? String(item?.created_at ?? "").slice(0, 10);
  if (!date) return false;
  if (props.startDate && date < props.startDate) return false;
  if (props.endDate && date > props.endDate) return false;
  return true;
}

const rangeAnalyses = computed(() => props.rows.filter(isWithinRange));

function compareByLatestDate(left: AnyRow, right: AnyRow) {
  const leftDate = resolveLubricantReportDate(left) || "";
  const rightDate = resolveLubricantReportDate(right) || "";
  if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
  return String(right?.codigo || "").localeCompare(String(left?.codigo || ""));
}

function sampleModel(item: AnyRow) {
  return String(item?.sample_info?.equipo_modelo || item?.equipo_modelo || "").trim();
}

/** Un equipo con su aceite y modelo: la misma clave agrupa y abre su detalle. */
function groupKeyOf(item: AnyRow) {
  return [item.lubricante, item.marca_lubricante, item.equipo_id, item.equipo_codigo, item.equipo_nombre, sampleModel(item)]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("::");
}

function equipmentTitle(item: AnyRow) {
  return resolveEquipmentName(item) || "Sin equipo";
}

function equipmentDetail(item: AnyRow) {
  return (
    [resolveEquipmentBrand(item), resolveEquipmentModel(item), resolveEquipmentLocation(item)].filter(Boolean).join(" · ") ||
    "Sin marca ni ubicación"
  );
}

const equipmentGroups = computed<EquipmentGroup[]>(() => {
  const groups = new Map<string, AnyRow[]>();
  for (const item of rangeAnalyses.value) {
    const key = groupKeyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([key, items]) => {
      const sorted = [...items].sort(compareByLatestDate);
      const latest = sorted[0] as AnyRow;
      const level = validatedLubricantLevel(latest);
      const lab = labLubricantLevel(latest);
      const abnormal = sorted.filter((item) => validatedLubricantLevel(item) === "ANORMAL").length;
      const caution = sorted.filter((item) => validatedLubricantLevel(item) === "PRECAUCION").length;
      return {
        group_key: key,
        lubricante: latest.lubricante || "Sin lubricante",
        marca_lubricante: latest.marca_lubricante || "",
        equipo_id: latest.equipo_id || null,
        equipo_codigo: latest.equipo_codigo || null,
        equipo_nombre: latest.equipo_nombre || null,
        equipo_modelo: sampleModel(latest) || null,
        equipo_titulo: equipmentTitle(latest),
        equipo_detalle: equipmentDetail(latest),
        items: sorted,
        compartimentos: [
          ...new Set(sorted.map((item) => String(item.compartimento_principal || "").trim()).filter(Boolean)),
        ].sort(),
        total_analisis: sorted.length,
        historyText: [
          abnormal ? `${abnormal} ${abnormal === 1 ? "anormal" : "anormales"}` : "",
          caution ? `${caution} en precaución` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        ultimo_informe: resolveLubricantReportDate(latest) || "",
        ultimo_numero_muestra: String(latest.sample_info?.numero_muestra || "").trim(),
        level,
        meta: lubricantLevelMeta[level],
        labMeta: lubricantLevelMeta[lab],
        labDiffers: lab !== "N/D" && lab !== level,
        findings: lubricantFindings(latest),
      };
    })
    .sort(
      (a, b) =>
        b.meta.severity - a.meta.severity ||
        b.ultimo_informe.localeCompare(a.ultimo_informe) ||
        a.equipo_titulo.localeCompare(b.equipo_titulo),
    );
});

/** Cada muestra del período, con lo que hace falta para leerla en una fila. */
const sampleRows = computed(() =>
  [...rangeAnalyses.value].sort(compareByLatestDate).map((item) => {
    const level = validatedLubricantLevel(item);
    const lab = labLubricantLevel(item);
    return {
      id: String(item.id),
      item,
      groupKey: groupKeyOf(item),
      fecha: resolveLubricantReportDate(item) || "",
      codigo: String(item.codigo || ""),
      muestra: String(item.sample_info?.numero_muestra || ""),
      equipoTitulo: equipmentTitle(item),
      lubricante: String(item.lubricante || "Sin lubricante"),
      compartimento: String(item.compartimento_principal || ""),
      level,
      meta: lubricantLevelMeta[level],
      labMeta: lubricantLevelMeta[lab],
      labDiffers: lab !== "N/D" && lab !== level,
      findings: lubricantFindings(item),
    };
  }),
);

function levelOptions(levels: LubricantLevel[]) {
  const counts = new Map<LubricantLevel, number>();
  for (const level of levels) counts.set(level, (counts.get(level) ?? 0) + 1);
  return [
    { key: "TODOS" as LevelFilter, title: "Todas", count: levels.length, color: "primary" },
    ...(["ANORMAL", "PRECAUCION", "NORMAL", "N/D"] as LubricantLevel[])
      .filter((level) => counts.get(level))
      .map((level) => ({
        key: level as LevelFilter,
        title: lubricantLevelMeta[level].title,
        count: counts.get(level) ?? 0,
        color: lubricantLevelMeta[level].color,
      })),
  ];
}

const sampleLevelOptions = computed(() => levelOptions(sampleRows.value.map((row) => row.level)));
const equipmentLevelOptions = computed(() =>
  levelOptions(equipmentGroups.value.map((group) => group.level)).map((option) =>
    option.key === "TODOS" ? { ...option, title: "Todos" } : option,
  ),
);

const monthOptions = computed(() => {
  const months = new Map<string, number>();
  for (const row of sampleRows.value) {
    if (row.fecha) months.set(row.fecha.slice(0, 7), (months.get(row.fecha.slice(0, 7)) ?? 0) + 1);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, count]) => ({ value: month, title: `${monthLabel(month, true)} · ${count}` }));
});

const visibleSamples = computed(() => {
  const search = String(sampleSearch.value || "").trim().toLowerCase();
  return sampleRows.value.filter((row) => {
    if (sampleLevel.value !== "TODOS" && row.level !== sampleLevel.value) return false;
    if (sampleMonth.value && !row.fecha.startsWith(sampleMonth.value)) return false;
    if (!search) return true;
    return [row.equipoTitulo, row.codigo, row.muestra, row.lubricante].some((value) =>
      value.toLowerCase().includes(search),
    );
  });
});

const visibleEquipmentGroups = computed(() => {
  const search = String(equipmentSearch.value || "").trim().toLowerCase();
  return equipmentGroups.value.filter((group) => {
    if (equipmentLevel.value !== "TODOS" && group.level !== equipmentLevel.value) return false;
    if (!search) return true;
    return [group.equipo_titulo, group.equipo_detalle, group.lubricante].some((value) =>
      value.toLowerCase().includes(search),
    );
  });
});

/* ---------------------------- Indicadores ------------------------------ */

function levelPaint(level: LubricantLevel) {
  if (level === "ANORMAL") return statusPaint.value.critical;
  if (level === "PRECAUCION") return statusPaint.value.warning;
  if (level === "NORMAL") return statusPaint.value.good;
  return chartInk(isDark.value).muted;
}

function levelPoints(levels: LubricantLevel[]) {
  const counts = new Map<LubricantLevel, number>();
  for (const level of levels) counts.set(level, (counts.get(level) ?? 0) + 1);
  return (["ANORMAL", "PRECAUCION", "NORMAL", "N/D"] as LubricantLevel[])
    .filter((level) => counts.get(level))
    .map((level) => ({
      key: level,
      label: lubricantLevelMeta[level].title,
      value: counts.get(level) ?? 0,
      color: levelPaint(level),
    }));
}

const sampleLevelPoints = computed(() => levelPoints(sampleRows.value.map((row) => row.level)));
const equipmentLevelPoints = computed(() => levelPoints(equipmentGroups.value.map((group) => group.level)));

const labDifferenceHelper = computed(() => {
  const differences = sampleRows.value.filter((row) => row.labDiffers).length;
  return differences
    ? `${formatCount(differences)} con una condición distinta a la que escribió el laboratorio.`
    : "Coincide con la evaluación del laboratorio.";
});

const equipmentAttentionHelper = computed(() => {
  const attention = equipmentGroups.value.filter((group) => group.level === "ANORMAL" || group.level === "PRECAUCION").length;
  return attention
    ? `${formatCount(attention)} requieren atención según su última muestra.`
    : "Todos los equipos están dentro de límite.";
});

const parameterRanking = computed(() => {
  const ranking = new Map<string, { label: string; abnormal: number; caution: number }>();
  for (const row of sampleRows.value) {
    for (const finding of row.findings) {
      const entry = ranking.get(finding.key) ?? { label: finding.parametro, abnormal: 0, caution: 0 };
      if (finding.nivel === "ANORMAL") entry.abnormal += 1;
      else entry.caution += 1;
      ranking.set(finding.key, entry);
    }
  }
  return [...ranking.entries()]
    .map(([key, entry]) => ({ key, ...entry, total: entry.abnormal + entry.caution }))
    .sort((a, b) => b.total - a.total);
});

const totalFindings = computed(() => parameterRanking.value.reduce((sum, entry) => sum + entry.total, 0));

const parameterRankingPoints = computed(() =>
  // Seis barras: con ocho la tarjeta crecía y el riel ya no cabía sin bajar
  // la página. El detalle lista todos los parámetros.
  parameterRanking.value.slice(0, 6).map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.total,
    valueLabel: entry.abnormal ? `${entry.total} (${entry.abnormal} anormal)` : `${entry.total}`,
    color: entry.abnormal ? statusPaint.value.critical : statusPaint.value.warning,
  })),
);

function rankingChartHeight(count: number) {
  return `${Math.max(150, Math.min(6, count) * 30 + 20)}px`;
}

const selectedParameter = computed(
  () => parameterRanking.value.find((entry) => entry.key === selectedParameterKey.value) ?? null,
);
const selectedParameterGuide = computed(() =>
  selectedParameterKey.value ? lubricantParameterGuideFor(selectedParameterKey.value) : null,
);

/** Cada resultado fuera de límite del parámetro elegido, del más reciente al más antiguo. */
const selectedParameterRows = computed(() =>
  sampleRows.value.flatMap((row) =>
    row.findings
      .filter((finding) => finding.key === selectedParameterKey.value)
      .map((finding) => ({
        key: `${row.id}-${finding.key}`,
        groupKey: row.groupKey,
        fecha: row.fecha,
        codigo: row.codigo,
        muestra: row.muestra,
        equipoTitulo: row.equipoTitulo,
        equipoDetalle: equipmentDetail(row.item),
        grupo: finding.grupo,
        valor:
          typeof finding.valor === "number"
            ? formatLubricantNumber(finding.valor, finding.unidad || null)
            : String(finding.valor ?? ""),
        limite: finding.limite ? finding.limite.replace(/(\d)\.(\d)/g, "$1,$2") : null,
        meta: lubricantLevelMeta[finding.nivel],
      })),
  ),
);

const monthlyPoints = computed(() => {
  const months = new Map<string, number>();
  for (const row of sampleRows.value) {
    if (row.fecha) months.set(row.fecha.slice(0, 7), (months.get(row.fecha.slice(0, 7)) ?? 0) + 1);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, value]) => ({ key: month, label: monthLabel(month), value }));
});

const latestSampleDate = computed(() => sampleRows.value[0]?.fecha || "");

const samplingHelper = computed(() => {
  const months = monthOptions.value.length;
  if (!months) return "Sin muestras en el período.";
  const average = sampleRows.value.length / months;
  return `${formatCount(months)} meses con muestras · ${average.toLocaleString("es-EC", { maximumFractionDigits: 1 })} por mes. Presione una barra para ver las muestras del mes.`;
});

/* ------------------------------ Guía ----------------------------------- */

const guideLevels = (["NORMAL", "PRECAUCION", "ANORMAL", "N/D"] as LubricantLevel[]).map((level) => ({
  key: level,
  ...lubricantLevelMeta[level],
}));

/** La plantilla del formulario escribe los grupos sin tildes; la guía, con ellas. */
function guideGroupTitle(group: string) {
  const plain = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return Object.keys(lubricantGroupGuide).find((title) => plain(title) === plain(group)) ?? group;
}

const guideGroups = computed(() => {
  const groups = new Map<string, Array<{ key: string; label: string; what: string; outOfRange: string }>>();
  for (const template of lubricantParameterTemplates) {
    const guide = lubricantParameterGuide[template.key];
    if (!guide) continue;
    const title = guideGroupTitle(template.group);
    groups.set(title, [...(groups.get(title) ?? []), { key: template.key, label: template.label, ...guide }]);
  }
  return [...groups.entries()].map(([title, params]) => ({
    title,
    description: lubricantGroupGuide[title] ?? "",
    params,
  }));
});

/* ------------------------------ Secciones ------------------------------ */

const SECTION_TITLES: Record<SectionKey, string> = {
  samples: "Muestras del período",
  equipment: "Condición actual por equipo",
  parameters: "Parámetros fuera de límite",
  guide: "Cómo leer este reporte",
};

const sectionTitle = computed(() => {
  if (section.value === "samples" && sampleMonth.value) return `Muestras de ${monthLabel(sampleMonth.value, true)}`;
  return SECTION_TITLES[section.value];
});

/** Lo que se ve en la ventana abierta: es lo que exporta "Exportar lo visible". */
const sectionItems = computed<AnyRow[]>(() => {
  if (section.value === "samples") return visibleSamples.value.map((row) => row.item);
  if (section.value === "equipment") return visibleEquipmentGroups.value.flatMap((group) => group.items);
  if (section.value === "parameters") {
    const ids = new Set(selectedParameterRows.value.map((row) => row.key.split("-")[0]));
    return rangeAnalyses.value.filter((item) => ids.has(String(item.id)));
  }
  return rangeAnalyses.value;
});

function openSection(key: SectionKey) {
  section.value = key;
  sectionOpen.value = true;
}

function openSamples(filters: { level?: LubricantLevel; month?: string } = {}) {
  sampleLevel.value = filters.level ?? "TODOS";
  sampleMonth.value = filters.month ?? null;
  sampleSearch.value = "";
  openSection("samples");
}

function openEquipmentList(level?: LubricantLevel) {
  equipmentLevel.value = level ?? "TODOS";
  equipmentSearch.value = "";
  openSection("equipment");
}

function openParameter(key?: string) {
  selectedParameterKey.value = key ?? parameterRanking.value[0]?.key ?? null;
  openSection("parameters");
  // El elegido desde el gráfico puede quedar abajo en la lista: se lleva a la vista.
  void nextTick(() =>
    window.setTimeout(
      () => document.querySelector(".param-list__item--active")?.scrollIntoView({ block: "nearest" }),
      250,
    ),
  );
}

/* --------------------------- Detalle del equipo ------------------------ */

const selectedGroup = computed(
  () => equipmentGroups.value.find((group) => group.group_key === selectedGroupKey.value) ?? null,
);

async function loadDashboard(group: EquipmentGroup) {
  dashboardLoading.value = true;
  dashboardError.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", {
      params: {
        periodo: "PERSONALIZADO",
        from: props.startDate || undefined,
        to: props.endDate || undefined,
        lubricante: group.lubricante,
        marca_lubricante: group.marca_lubricante || undefined,
        equipo_id: group.equipo_id || undefined,
        equipo_codigo: group.equipo_codigo || undefined,
        equipo_nombre: group.equipo_nombre || undefined,
        equipo_modelo: group.equipo_modelo || undefined,
      },
    });
    dashboard.value = data?.data ?? data ?? null;
  } catch (e: any) {
    dashboardError.value = e?.response?.data?.message || "No se pudo cargar el análisis del equipo.";
  } finally {
    dashboardLoading.value = false;
  }
}

function openEquipment(group: EquipmentGroup) {
  selectedGroupKey.value = group.group_key;
  dashboard.value = null;
  equipmentOpen.value = true;
  void loadDashboard(group);
}

function openEquipmentByKey(key: string) {
  const group = equipmentGroups.value.find((item) => item.group_key === key);
  if (group) openEquipment(group);
}

/* ------------------------------ Exportes ------------------------------- */

/** La lista llega resumida: los detalles se piden al exportar. */
async function withDetails(items: AnyRow[]): Promise<AnyRow[]> {
  if (items.length === 1) {
    const { data } = await api.get(`/kpi_maintenance/inteligencia/analisis-lubricante/${items[0]?.id}`);
    return [data?.data ?? data ?? items[0]];
  }
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante");
  const full = new Map(((data?.data ?? data ?? []) as AnyRow[]).map((row) => [String(row.id), row]));
  return items.map((item) => full.get(String(item.id)) ?? item);
}

async function buildReport(format: "pdf" | "excel", items: AnyRow[], subtitle: string) {
  return buildLubricantReport(await withDetails(items), {
    format,
    subtitle: `${subtitle}. Condición validada contra los límites del laboratorio.`,
  });
}

async function runExport(kind: "todo" | "equipo", format: "pdf" | "excel", items: AnyRow[], subtitle: string) {
  if (!items.length) {
    ui.open("No hay muestras para exportar con los filtros elegidos.", "warning");
    return;
  }
  exporting.value = kind;
  try {
    await reportPreview.open(format, await buildReport(format, items, subtitle));
  } catch (e: any) {
    ui.error(e?.response?.data?.message || e?.message || "No se pudo generar el reporte de análisis de lubricante.");
  } finally {
    exporting.value = null;
  }
}

function exportItems(format: "pdf" | "excel", items: AnyRow[]) {
  const scope = sectionOpen.value && section.value !== "guide" ? ` · ${sectionTitle.value}` : "";
  void runExport("todo", format, items, `${rangeLabel.value}${scope}`);
}

function exportEquipment(format: "pdf" | "excel") {
  const group = selectedGroup.value;
  if (group) void runExport("equipo", format, group.items, `${group.equipo_titulo} · ${rangeLabel.value}`);
}

/** Para el botón PDF del Centro de Informes. */
function buildModuleReport(): Promise<ReportDefinition> {
  return buildReport("pdf", rangeAnalyses.value, rangeLabel.value);
}

defineExpose({ buildModuleReport });

const motionRoot = useRevealMotion<HTMLElement>(() => props.rows.length);

// Por función y no por cadena, como en el Dashboard Gerencia: así el motor
// recibe el elemento y no una instancia de componente.
function setMotionRoot(el: unknown) {
  motionRoot.value = resolveMotionElement(el);
}
</script>

<style scoped>
.lub-board {
  --manager-blue: 37, 99, 235;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(14px, 1.5vw, 22px);
  min-width: 0;
}

.lub-board > * {
  min-width: 0;
}

.board-section {
  padding: clamp(14px, 1.3vw, 18px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 24px;
  background: rgb(var(--v-theme-surface));
}

/* Mismo ancho que el riel del Dashboard Gerencia: más angosta, la leyenda de
   la dona partía "Anormal" en dos renglones. */
.summary-deck {
  --kpi-rail-card: clamp(380px, 30vw, 460px);
  overflow: hidden;
}

.summary-deck :deep(.kpi-insight) {
  gap: 8px;
  min-height: 366px;
  padding: 16px;
}

.deck-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 4px;
}

.deck-tools .v-btn,
.section-workspace__header .v-btn,
.level-filter .v-btn {
  border-radius: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.lub-eyebrow {
  display: block;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.workspace-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px) minmax(220px, 320px);
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.level-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workspace-hint {
  margin: 0 0 12px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.9rem;
}

/* Listas de la ventana: una fila por registro, columnas alineadas y altura
   acotada, como el informe de equipos del Dashboard Gerencia. */
.lub-list {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.lub-list__head,
.lub-list__row {
  display: grid;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  text-align: left;
}

.lub-list__row--samples {
  grid-template-columns: 150px minmax(0, 1.2fr) 150px minmax(0, 1.8fr) 24px;
}

.lub-list__row--equipment {
  grid-template-columns: minmax(0, 1.5fr) 128px 150px minmax(0, 1.7fr) 132px 24px;
}

.lub-list__row--params {
  grid-template-columns: 150px minmax(0, 1.4fr) 120px minmax(0, 1fr) 130px 24px;
}

.lub-list__head {
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.lub-list__row--equipment.lub-list__head span:nth-child(5) {
  text-align: right;
}

.lub-list__scroll {
  max-height: min(62dvh, 640px);
  overflow-y: auto;
}

.lub-list__row {
  --row-tone: var(--v-theme-success);
  width: 100%;
  min-height: 60px;
  border: 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-left: 4px solid rgb(var(--row-tone));
  background: transparent;
  color: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.lub-list__row--warning {
  --row-tone: var(--v-theme-warning);
}

.lub-list__row--error {
  --row-tone: var(--v-theme-error);
}

.lub-list__row--secondary {
  --row-tone: var(--v-theme-secondary);
}

.lub-list__scroll > .lub-list__row:first-child {
  border-top: 0;
}

.lub-list__row:hover {
  background: rgba(var(--manager-blue), 0.075);
}

.lub-list__row:focus-visible {
  outline: 4px solid rgba(var(--manager-blue), 0.28);
  outline-offset: -4px;
}

.lub-list__cell {
  display: grid;
  gap: 2px;
  min-width: 0;
  justify-items: start;
}

.lub-list__cell strong {
  font-weight: 650;
  overflow-wrap: anywhere;
}

.lub-list__row small {
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.8rem;
}

.lub-list__cell--num {
  justify-items: end;
  font-variant-numeric: tabular-nums;
}

/* Sin la cabecera de columnas (pantallas angostas) el número necesita su palabra. */
.lub-list__unit {
  display: none;
}

.lub-list__findings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.finding-tag {
  padding: 2px 8px;
  border-radius: 8px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.5;
}

.finding-tag--warning {
  background: rgba(var(--v-theme-warning), 0.14);
}

.finding-tag--error {
  background: rgba(var(--v-theme-error), 0.14);
}

.compact-empty {
  padding: 22px;
  border-radius: 14px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  background: rgba(var(--v-theme-on-surface), 0.045);
  text-align: center;
}

.param-layout {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 18px;
  min-width: 0;
}

.param-list {
  display: grid;
  align-content: start;
  gap: 6px;
  max-height: min(70dvh, 720px);
  overflow-y: auto;
}

.param-list__item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 200ms ease, border-color 200ms ease;
}

.param-list__item:hover {
  background: rgba(var(--manager-blue), 0.06);
}

.param-list__item:focus-visible {
  outline: 3px solid rgba(var(--manager-blue), 0.32);
  outline-offset: 2px;
}

.param-list__item--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.param-list__name {
  font-weight: 650;
}

.param-list__counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.param-detail {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
}

.param-detail__head h3 {
  margin: 2px 0 4px;
  font-size: 1.3rem;
}

.param-detail__head p {
  max-width: 90ch;
  margin: 0 0 4px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.guide-levels {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.guide-level {
  --guide-tone: var(--v-theme-success);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--guide-tone), 0.3);
  border-left: 4px solid rgb(var(--guide-tone));
  border-radius: 14px;
  background: rgba(var(--guide-tone), 0.06);
}

.guide-level .v-icon {
  color: rgb(var(--guide-tone));
}

.guide-level--warning {
  --guide-tone: var(--v-theme-warning);
}

.guide-level--error {
  --guide-tone: var(--v-theme-error);
}

.guide-level--secondary {
  --guide-tone: var(--v-theme-secondary);
}

.guide-level p {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.9rem;
}

.guide-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.guide-notes p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.94rem;
  line-height: 1.55;
}

.guide-glossary {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 14px;
  overflow: hidden;
}

.guide-params {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px 20px;
  margin: 0;
}

.guide-params dt {
  font-weight: 700;
}

.guide-params dd {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.9rem;
}

.guide-params dd span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.section-workspace {
  display: flex;
  width: 100%;
  height: min(94dvh, 1080px);
  max-height: calc(100dvh - 24px);
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  background: rgb(var(--v-theme-background));
}

.section-workspace__header {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 18px;
  background: rgb(var(--v-theme-surface));
}

.section-workspace__heading {
  min-width: 0;
}

.section-workspace__heading span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.82rem;
}

.section-workspace__heading h2 {
  margin: 1px 0 0;
  font-size: clamp(1.15rem, 2vw, 1.6rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.section-workspace__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: clamp(14px, 2vw, 26px) !important;
  overflow: auto;
  overscroll-behavior: contain;
}

@media (max-width: 1280px) {
  .guide-levels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .lub-list__head {
    display: none;
  }

  .lub-list__row--samples,
  .lub-list__row--equipment,
  .lub-list__row--params {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 14px;
  }

  .lub-list__findings {
    grid-column: 1 / -1;
  }

  .lub-list__row > .v-icon {
    display: none;
  }

  .lub-list__cell--num {
    justify-items: start;
  }

  .lub-list__unit {
    display: inline;
  }

  .workspace-filters {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .level-filter {
    grid-column: 1 / -1;
  }

  .param-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .param-list {
    max-height: 240px;
  }
}

@media (max-width: 760px) {
  .workspace-filters,
  .guide-notes,
  .guide-levels {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lub-list__row,
  .param-list__item {
    transition: none;
  }
}
</style>

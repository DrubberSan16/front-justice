<template>
  <div :ref="setMotionRoot" class="lub-board">
    <!-- Resumen visual del período: mismo riel que el Dashboard Gerencia -->
    <section class="board-section summary-deck" aria-label="Resumen del período">
      <KpiCardRail
        title="Resumen del período"
        :subtitle="`${rangeLabel} · Condición validada contra los límites del laboratorio.`"
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
          :points="sampleLevelPoints"
          empty-text="No hay muestras en este rango."
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
          :points="equipmentLevelPoints"
          empty-text="No hay equipos con muestras en este rango."
        />
        <KpiInsightCard
          title="Parámetros fuera de límite"
          subtitle="Veces que cada parámetro salió de su límite"
          icon="mdi-flask-outline"
          :accent="statusPaint.critical"
          :value="formatCount(totalFindings)"
          value-caption="resultados"
          helper="Presione una barra para ver qué equipos lo tienen fuera de límite hoy."
          variant="hbars"
          :chart-height="rankingChartHeight(parameterRankingPoints.length)"
          interactive
          :points="parameterRankingPoints"
          empty-text="Ningún parámetro salió de su límite en este rango."
          @point="filterByParameter"
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
          :points="monthlyPoints"
          empty-text="No hay muestras en este rango."
        />
      </KpiCardRail>
    </section>

    <!-- Equipos: última condición y qué la causó -->
    <section class="board-section" aria-labelledby="lub-equipment-title">
      <div class="section-title-row">
        <div>
          <h3 id="lub-equipment-title">Equipos monitoreados</h3>
          <p>
            Última muestra de cada equipo en el período y el parámetro que la dejó fuera de límite.
            Abra un equipo para ver la validación completa y sus tendencias.
          </p>
        </div>
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
            <v-list-item prepend-icon="mdi-file-pdf-box" title="Vista PDF" subtitle="Resumen y fuera de límite" @click="exportVisible('pdf')" />
            <v-list-item prepend-icon="mdi-file-excel" title="Excel" subtitle="Con todos los parámetros" @click="exportVisible('excel')" />
          </v-list>
        </v-menu>
      </div>

      <div class="board-filters">
        <v-text-field
          v-model="tableSearch"
          label="Buscar equipo, aceite o muestra"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
        />
        <v-autocomplete
          v-model="equipmentFilter"
          :items="equipmentFilterOptions"
          item-title="title"
          item-value="value"
          label="Equipo"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
        <v-select
          v-model="conditionFilter"
          :items="conditionFilterOptions"
          item-title="title"
          item-value="value"
          label="Condición actual"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </div>

      <div v-if="parameterFilter" class="active-filter">
        <v-chip closable color="primary" variant="tonal" @click:close="parameterFilter = null">
          Fuera de límite en {{ parameterFilter.label }}
        </v-chip>
      </div>

      <div v-if="visibleEquipmentGroups.length" class="equipment-report">
        <div class="equipment-report__head" aria-hidden="true">
          <span>Equipo</span>
          <span>Última muestra</span>
          <span>Condición</span>
          <span>Fuera de límite</span>
          <span>Muestras</span>
          <span></span>
        </div>
        <div class="equipment-report__scroll">
          <button
            v-for="group in visibleEquipmentGroups"
            :key="group.group_key"
            type="button"
            class="equipment-report__row"
            :class="`equipment-report__row--${group.meta.color}`"
            @click="openEquipment(group)"
          >
            <span class="equipment-report__name">
              <strong>{{ group.equipo_titulo }}</strong>
              <small>{{ group.equipo_detalle }}</small>
              <small>{{ group.lubricante }} · {{ group.compartimentos.join(", ") || "Sin compartimento" }}</small>
            </span>
            <span class="equipment-report__cell">
              <span>{{ group.ultimo_informe || "Sin fecha" }}</span>
              <small>{{ group.ultimo_numero_muestra || "Sin número" }}</small>
            </span>
            <span class="equipment-report__cell">
              <v-chip size="small" :color="group.meta.color" variant="tonal" :prepend-icon="group.meta.icon">
                {{ group.meta.title }}
              </v-chip>
              <small v-if="group.labDiffers">Laboratorio: {{ group.labMeta.title }}</small>
            </span>
            <span class="equipment-report__findings">
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
            <span class="equipment-report__cell equipment-report__cell--num">
              <span>{{ group.total_analisis }}<span class="equipment-report__unit"> {{ group.total_analisis === 1 ? "muestra" : "muestras" }}</span></span>
              <small v-if="group.historyText">{{ group.historyText }}</small>
            </span>
            <v-icon icon="mdi-chevron-right" size="20" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-else class="compact-empty">No hay equipos con muestras para los filtros elegidos.</div>
    </section>

    <!-- Cómo leer el reporte -->
    <section class="board-section" aria-labelledby="lub-guide-title">
      <div class="section-title-row">
        <div>
          <h3 id="lub-guide-title">Cómo leer este reporte</h3>
          <p>Qué significa cada condición, cómo se leen los límites y qué indica cada parámetro.</p>
        </div>
      </div>
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
          «por debajo de 12,3 cSt», que preocupa si baja. Los límites pueden cambiar entre informes: cada gráfico
          traza el que regía en cada muestra.
        </p>
        <p>
          <strong>Condición validada y condición del laboratorio.</strong> La condición de este reporte se calcula
          comparando cada resultado con sus límites. El informe del laboratorio trae además su propia evaluación;
          cuando no coinciden, la tabla lo indica debajo de la condición.
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
    </section>

    <!-- Detalle del equipo -->
    <v-dialog
      v-model="workspaceOpen"
      max-width="1680"
      width="calc(100% - 24px)"
      :fullscreen="smAndDown"
      scrollable
    >
      <v-card class="section-workspace" rounded="xl">
        <header class="section-workspace__header">
          <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" aria-label="Regresar al reporte" @click="workspaceOpen = false" />
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
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle" @click="workspaceOpen = false" />
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
import { computed, ref } from "vue";
import { useDisplay, useTheme } from "vuetify";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { resolveMotionElement, useRevealMotion } from "@/app/motion";
import { chartInk, chartStatus, seriesColor } from "@/app/config/chart-theme";
import {
  lubricantGroupGuide,
  lubricantLevelMeta,
  lubricantParameterGuide,
  lubricantParameterTemplates,
  type LubricantLevel,
} from "@/app/config/lubricant-analysis";
import {
  buildEquipmentDisplayTitle,
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
 * Dashboard Gerencia: cada muestra validada contra los límites que fija el
 * laboratorio para cada parámetro. Recibe la lista resumida (con
 * `hallazgos`) y el rango del Centro de Informes; los detalles se piden solo
 * al abrir un equipo o al exportar.
 */
type AnyRow = Record<string, any>;
type LevelMeta = (typeof lubricantLevelMeta)[LubricantLevel];
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

const tableSearch = ref("");
const equipmentFilter = ref<string | null>(null);
const conditionFilter = ref<LubricantLevel | null>(null);
const parameterFilter = ref<{ key: string; label: string } | null>(null);
const workspaceOpen = ref(false);
const selectedGroupKey = ref<string | null>(null);
const dashboard = ref<AnyRow | null>(null);
const dashboardLoading = ref(false);
const dashboardError = ref<string | null>(null);
const exporting = ref<"todo" | "equipo" | null>(null);

const conditionFilterOptions = (["ANORMAL", "PRECAUCION", "NORMAL", "N/D"] as LubricantLevel[]).map((level) => ({
  value: level,
  title: lubricantLevelMeta[level].title,
}));

const countFormatter = new Intl.NumberFormat("es-EC");
function formatCount(value: number) {
  return countFormatter.format(value);
}

const rangeLabel = computed(() => `Del ${props.startDate || "inicio"} al ${props.endDate || "hoy"}`);

function equipmentLabel(item: AnyRow) {
  return String(item.equipo_nombre || "").trim() ? buildEquipmentDisplayTitle(item) : "Sin equipo";
}

/* ----------------------------- Muestras -------------------------------- */

function isWithinRange(item: AnyRow) {
  const date = resolveLubricantReportDate(item) ?? String(item?.created_at ?? "").slice(0, 10);
  if (!date) return false;
  if (props.startDate && date < props.startDate) return false;
  if (props.endDate && date > props.endDate) return false;
  return true;
}

const rangeAnalyses = computed(() =>
  props.rows.filter(
    (item) => isWithinRange(item) && (!equipmentFilter.value || String(item.equipo_id ?? "") === equipmentFilter.value),
  ),
);

const equipmentFilterOptions = computed(() => {
  const options = new Map<string, string>();
  for (const item of props.rows) {
    if (item.equipo_id && !options.has(String(item.equipo_id))) {
      options.set(String(item.equipo_id), equipmentLabel(item));
    }
  }
  return [...options.entries()].map(([value, title]) => ({ value, title })).sort((a, b) => a.title.localeCompare(b.title));
});

function compareByLatestDate(left: AnyRow, right: AnyRow) {
  const leftDate = resolveLubricantReportDate(left) || "";
  const rightDate = resolveLubricantReportDate(right) || "";
  if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
  return String(right?.codigo || "").localeCompare(String(left?.codigo || ""));
}

function sampleModel(item: AnyRow) {
  return String(item?.sample_info?.equipo_modelo || item?.equipo_modelo || "").trim();
}

/** Un grupo por equipo, aceite y modelo, con su última muestra del período. */
const equipmentGroups = computed<EquipmentGroup[]>(() => {
  const groups = new Map<string, AnyRow[]>();
  for (const item of rangeAnalyses.value) {
    const key = [item.lubricante, item.marca_lubricante, item.equipo_id, item.equipo_codigo, item.equipo_nombre, sampleModel(item)]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .join("::");
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
        // El nombre con que se conoce la unidad en campo va arriba; marca,
        // modelo y central debajo: juntos ocupaban cuatro renglones.
        equipo_titulo: resolveEquipmentName(latest) || "Sin equipo",
        equipo_detalle:
          [resolveEquipmentBrand(latest), resolveEquipmentModel(latest), resolveEquipmentLocation(latest)]
            .filter(Boolean)
            .join(" · ") || "Sin marca ni ubicación",
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

const visibleEquipmentGroups = computed(() => {
  const search = String(tableSearch.value || "").trim().toLowerCase();
  return equipmentGroups.value.filter((group) => {
    if (conditionFilter.value && group.level !== conditionFilter.value) return false;
    if (parameterFilter.value && !group.findings.some((finding) => finding.key === parameterFilter.value?.key)) {
      return false;
    }
    if (!search) return true;
    return [
      group.equipo_titulo,
      group.equipo_detalle,
      group.lubricante,
      ...group.compartimentos,
      ...group.items.flatMap((item) => [item.codigo, item.sample_info?.numero_muestra]),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
});

const selectedGroup = computed(
  () => equipmentGroups.value.find((group) => group.group_key === selectedGroupKey.value) ?? null,
);

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

const sampleLevelPoints = computed(() => levelPoints(rangeAnalyses.value.map(validatedLubricantLevel)));
const equipmentLevelPoints = computed(() => levelPoints(equipmentGroups.value.map((group) => group.level)));

const labDifferenceHelper = computed(() => {
  const differences = rangeAnalyses.value.filter((item) => {
    const lab = labLubricantLevel(item);
    return lab !== "N/D" && lab !== validatedLubricantLevel(item);
  }).length;
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
  for (const item of rangeAnalyses.value) {
    for (const finding of lubricantFindings(item)) {
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
  parameterRanking.value.slice(0, 8).map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.total,
    valueLabel: entry.abnormal ? `${entry.total} (${entry.abnormal} anormal)` : `${entry.total}`,
    color: entry.abnormal ? statusPaint.value.critical : statusPaint.value.warning,
  })),
);

function rankingChartHeight(count: number) {
  return `${Math.max(160, Math.min(8, count) * 34 + 24)}px`;
}

function filterByParameter(point: { key?: string; label: string }) {
  if (!point?.key) return;
  parameterFilter.value = { key: point.key, label: point.label };
  document.getElementById("lub-equipment-title")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const monthlyPoints = computed(() => {
  const months = new Map<string, number>();
  for (const item of rangeAnalyses.value) {
    const date = resolveLubricantReportDate(item);
    if (date) months.set(date.slice(0, 7), (months.get(date.slice(0, 7)) ?? 0) + 1);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, value]) => {
      const [year, monthNumber] = month.split("-").map(Number);
      return { key: month, label: `${MONTH_NAMES[(monthNumber || 1) - 1]} ${String(year).slice(2)}`, value };
    });
});

const latestSampleDate = computed(() =>
  rangeAnalyses.value.reduce((latest, item) => {
    const date = resolveLubricantReportDate(item) || "";
    return date > latest ? date : latest;
  }, ""),
);

const samplingHelper = computed(() => {
  const months = monthlyPoints.value.length;
  if (!months) return "Sin muestras en el período.";
  const average = rangeAnalyses.value.length / months;
  return `${formatCount(months)} meses con muestras · ${average.toLocaleString("es-EC", { maximumFractionDigits: 1 })} por mes en promedio.`;
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

/* --------------------------- Detalle del equipo ------------------------ */

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
  workspaceOpen.value = true;
  void loadDashboard(group);
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

async function buildReport(format: "pdf" | "excel" = "pdf", items: AnyRow[] = rangeAnalyses.value, subtitle = "") {
  return buildLubricantReport(await withDetails(items), {
    format,
    subtitle: `${subtitle || rangeLabel.value}. Condición validada contra los límites del laboratorio.`,
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

function exportVisible(format: "pdf" | "excel") {
  const filtered = Boolean(conditionFilter.value || parameterFilter.value || tableSearch.value);
  const items = filtered ? visibleEquipmentGroups.value.flatMap((group) => group.items) : rangeAnalyses.value;
  const note = conditionFilter.value ? ` · equipos en ${lubricantLevelMeta[conditionFilter.value].title.toLowerCase()}` : "";
  void runExport("todo", format, items, `${rangeLabel.value}${note}`);
}

function exportEquipment(format: "pdf" | "excel") {
  const group = selectedGroup.value;
  if (group) void runExport("equipo", format, group.items, `${group.equipo_titulo} · ${rangeLabel.value}`);
}

/** Para el botón PDF del Centro de Informes. */
function buildModuleReport(): Promise<ReportDefinition> {
  return buildReport("pdf");
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
  padding: clamp(16px, 2vw, 26px);
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
  min-height: 360px;
  padding: 16px;
}

.section-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.section-title-row h3 {
  margin: 0;
  font-size: clamp(1.25rem, 2.2vw, 1.6rem);
  letter-spacing: -0.02em;
}

.section-title-row p {
  max-width: 78ch;
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.section-title-row .v-btn,
.section-workspace__header .v-btn {
  border-radius: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.board-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(2, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.active-filter {
  margin-bottom: 12px;
}

.equipment-report {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.equipment-report__head,
.equipment-report__row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) 128px 150px minmax(0, 1.7fr) 132px 24px;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  text-align: left;
}

.equipment-report__head {
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.equipment-report__head span:nth-child(5) {
  text-align: right;
}

.equipment-report__scroll {
  max-height: 560px;
  overflow-y: auto;
}

.equipment-report__row {
  --row-tone: var(--v-theme-success);
  width: 100%;
  min-height: 64px;
  border: 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-left: 4px solid rgb(var(--row-tone));
  background: transparent;
  color: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.equipment-report__row--warning {
  --row-tone: var(--v-theme-warning);
}

.equipment-report__row--error {
  --row-tone: var(--v-theme-error);
}

.equipment-report__row--secondary {
  --row-tone: var(--v-theme-secondary);
}

.equipment-report__scroll > .equipment-report__row:first-child {
  border-top: 0;
}

.equipment-report__row:hover {
  background: rgba(var(--manager-blue), 0.075);
}

.equipment-report__row:focus-visible {
  outline: 4px solid rgba(var(--manager-blue), 0.28);
  outline-offset: -4px;
}

.equipment-report__name,
.equipment-report__cell {
  display: grid;
  gap: 2px;
  min-width: 0;
  justify-items: start;
}

.equipment-report__name strong {
  font-weight: 650;
  overflow-wrap: anywhere;
}

.equipment-report__row small {
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.8rem;
}

.equipment-report__cell--num {
  justify-items: end;
  font-variant-numeric: tabular-nums;
}

/* Sin la cabecera de columnas (pantallas angostas) el número necesita su palabra. */
.equipment-report__unit {
  display: none;
}

.equipment-report__findings {
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
  .equipment-report__head {
    display: none;
  }

  .equipment-report__row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 14px;
  }

  .equipment-report__name,
  .equipment-report__findings {
    grid-column: 1 / -1;
  }

  .equipment-report__row > .v-icon {
    display: none;
  }

  .equipment-report__cell--num {
    justify-items: start;
  }

  .equipment-report__unit {
    display: inline;
  }
}

@media (max-width: 760px) {
  .board-filters,
  .guide-notes,
  .guide-levels {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-title-row {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .equipment-report__row {
    transition: none;
  }
}
</style>

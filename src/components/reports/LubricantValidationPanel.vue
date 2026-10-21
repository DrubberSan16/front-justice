<template>
  <div class="lub-panel">
    <v-alert v-if="error" type="warning" variant="tonal" :text="error" />

    <div v-else-if="loading" class="lub-panel__state" role="status">
      <v-progress-circular indeterminate color="primary" />
      <span>Cargando el análisis del equipo...</span>
    </div>

    <div v-else-if="!dashboard?.selected" class="lub-panel__state">
      <v-icon icon="mdi-oil" size="28" aria-hidden="true" />
      <span>Selecciona un equipo para ver la validación de su última muestra y sus tendencias.</span>
    </div>

    <template v-else>
      <!-- 1. Quién es y cuántas muestras hay en el rango -->
      <section class="lub-panel__head" aria-label="Equipo y muestras del rango">
        <div class="lub-panel__identity">
          <span class="lub-eyebrow">Equipo y aceite</span>
          <h3>{{ equipmentTitle(latest ?? dashboard.selected) }}</h3>
          <p>
            {{ dashboard.selected.lubricante || "Sin lubricante" }}
            <template v-if="dashboard.selected.marca_lubricante">· {{ dashboard.selected.marca_lubricante }}</template>
            · {{ dashboard.selected.compartimentos?.join(", ") || "Sin compartimento" }}
          </p>
          <p class="lub-muted">{{ rangeLabel }}</p>
        </div>
        <dl class="lub-panel__counts">
          <div class="lub-count">
            <dt>Muestras</dt>
            <dd>{{ sampleCount }}</dd>
          </div>
          <div
            v-for="entry in levelCounts"
            :key="entry.level"
            class="lub-count"
            :class="`lub-count--${entry.color}`"
          >
            <dt>
              <v-icon :icon="entry.icon" size="16" aria-hidden="true" />
              {{ entry.title }}
            </dt>
            <dd>{{ entry.count }}</dd>
          </div>
        </dl>
      </section>

      <!-- 2. Veredicto de la última muestra, con lo que lo causó -->
      <section
        v-if="latest"
        class="lub-verdict"
        :class="`lub-verdict--${latestMeta.color}`"
        aria-labelledby="lub-verdict-title"
      >
        <v-icon :icon="latestMeta.icon" size="30" class="lub-verdict__icon" aria-hidden="true" />
        <div class="lub-verdict__body">
          <span class="lub-eyebrow">
            Última muestra · {{ latestDate || "Sin fecha" }}
            <template v-if="latest.sample_info?.numero_muestra">· {{ latest.sample_info.numero_muestra }}</template>
          </span>
          <h4 id="lub-verdict-title">{{ verdictTitle }}</h4>
          <p>{{ latestMeta.meaning }}</p>
          <ul v-if="findings.length" class="lub-findings">
            <li v-for="finding in findings" :key="finding.key">
              <v-chip size="x-small" :color="finding.meta.color" variant="flat" label>
                {{ finding.meta.title }}
              </v-chip>
              <span>
                <strong>{{ finding.label }}: {{ finding.resultText }}</strong>
                <template v-if="finding.triggerText"> — límite {{ finding.triggerText }}.</template>
                <span v-if="finding.guide" class="lub-muted">{{ " " + finding.guide.outOfRange }}</span>
              </span>
            </li>
          </ul>
        </div>
        <dl class="lub-verdict__hours">
          <div>
            <dt>Horas del equipo</dt>
            <dd>{{ formatHours(latest.sample_info?.horas_equipo) }}</dd>
          </div>
          <div>
            <dt>Horas del aceite</dt>
            <dd>{{ formatHours(latest.sample_info?.horas_lubricante) }}</dd>
          </div>
        </dl>
      </section>

      <!-- 3. Cada resultado contra su límite -->
      <section class="lub-section" aria-labelledby="lub-validation-title">
        <header class="lub-section__head">
          <div>
            <h4 id="lub-validation-title">Validación por parámetro</h4>
            <p>
              Resultado de la última muestra frente a los límites que fijó el laboratorio para ese
              parámetro. «Muestra anterior» ayuda a ver si va subiendo o bajando.
            </p>
          </div>
          <v-switch
            v-model="onlyOutOfRange"
            color="primary"
            density="compact"
            hide-details
            inset
            :label="`Solo fuera de límite (${findings.length})`"
            :disabled="!findings.length"
          />
        </header>

        <div v-if="visibleValidationGroups.length" class="lub-table-wrap">
          <table class="lub-table">
            <thead>
              <tr>
                <th scope="col">Parámetro</th>
                <th scope="col" class="lub-num">Resultado</th>
                <th scope="col">Precaución</th>
                <th scope="col">Anormal</th>
                <th scope="col">Estado</th>
                <th scope="col" class="lub-num">Muestra anterior</th>
              </tr>
            </thead>
            <tbody v-for="group in visibleValidationGroups" :key="group.key">
              <tr class="lub-table__group">
                <th colspan="6" scope="colgroup">
                  {{ group.label }}
                  <span v-if="group.guide">{{ group.guide }}</span>
                </th>
              </tr>
              <tr
                v-for="row in group.rows"
                :key="row.key"
                :class="`lub-table__row--${row.meta.color}`"
              >
                <th scope="row">
                  <span class="lub-param">{{ row.label }}</span>
                  <span v-if="row.guide" class="lub-param__guide">{{ row.guide.what }}</span>
                </th>
                <td class="lub-num">{{ row.resultText }}</td>
                <td>{{ row.warningText || "—" }}</td>
                <td>{{ row.alertText || "—" }}</td>
                <td>
                  <v-chip size="small" :color="row.meta.color" variant="tonal" :prepend-icon="row.meta.icon">
                    {{ row.meta.title }}
                  </v-chip>
                </td>
                <td class="lub-num">
                  {{ row.previousText }}
                  <span v-if="row.deltaText" class="lub-delta">{{ row.deltaText }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="lub-panel__state lub-panel__state--compact">
          La última muestra no trae resultados por parámetro.
        </div>
      </section>

      <!-- 4. Tendencias: cada gráfico con sus líneas de límite -->
      <section class="lub-section" aria-labelledby="lub-trends-title">
        <header class="lub-section__head">
          <div>
            <h4 id="lub-trends-title">Tendencias con sus límites</h4>
            <p>
              Línea azul: resultado de cada muestra. Línea ámbar punteada: límite de precaución. Línea roja:
              límite anormal. Primero van los parámetros que salieron de su límite en el rango.
            </p>
          </div>
        </header>
        <div class="lub-filter" role="group" aria-label="Filtrar gráficos por grupo">
          <v-btn
            v-for="option in chartFilterOptions"
            :key="option.key"
            size="small"
            :variant="chartFilter === option.key ? 'flat' : 'tonal'"
            :color="chartFilter === option.key ? 'primary' : undefined"
            :aria-pressed="chartFilter === option.key"
            @click="chartFilter = option.key"
          >
            {{ option.title }} · {{ option.count }}
          </v-btn>
        </div>
        <div v-if="visibleMetrics.length" class="lub-charts">
          <LubricantTrendChart
            v-for="metric in visibleMetrics"
            :key="metric.key"
            :title="metric.label"
            :subtitle="metricSubtitle(metric)"
            :unit="metric.unit"
            :points="metric.points"
          />
        </div>
        <div v-else class="lub-panel__state lub-panel__state--compact">
          No hay resultados numéricos para graficar en este grupo.
        </div>
      </section>

      <!-- 5. Historial -->
      <section class="lub-section" aria-labelledby="lub-history-title">
        <header class="lub-section__head">
          <div>
            <h4 id="lub-history-title">Historial de muestras</h4>
            <p>{{ sampleCount }} muestras en el rango, de la más reciente a la más antigua.</p>
          </div>
        </header>
        <div class="lub-table-wrap">
          <table class="lub-table">
            <thead>
              <tr>
                <th scope="col">Fecha de informe</th>
                <th scope="col">Código</th>
                <th scope="col">Muestra</th>
                <th scope="col">Compartimento</th>
                <th scope="col">Condición</th>
                <th scope="col" class="lub-num">Horas equipo</th>
                <th scope="col" class="lub-num">Horas aceite</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in timelineDesc" :key="item.id">
                <td>{{ item.fecha_reporte || item.fecha_muestra || "Sin fecha" }}</td>
                <td>{{ item.codigo }}</td>
                <td>{{ item.numero_muestra || "Sin muestra" }}</td>
                <td>{{ item.compartimento_principal || "Sin compartimento" }}</td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="levelMeta(item.condicion).color"
                    variant="tonal"
                    :prepend-icon="levelMeta(item.condicion).icon"
                  >
                    {{ levelMeta(item.condicion).title }}
                  </v-chip>
                </td>
                <td class="lub-num">{{ formatHours(item.horas_equipo) }}</td>
                <td class="lub-num">{{ formatHours(item.horas_lubricante) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LubricantTrendChart from "@/components/maintenance/LubricantTrendChart.vue";
import { buildEquipmentDisplayTitle } from "@/app/utils/equipment-display";
import {
  describeLubricantRule,
  formatLubricantNumber,
  lubricantGroupGuide,
  lubricantLevelMeta,
  lubricantParameterGuideFor,
  normalizeLubricantLevel,
  type LubricantLevel,
} from "@/app/config/lubricant-analysis";

type AnyRow = Record<string, any>;

type ValidationRow = {
  key: string;
  label: string;
  level: LubricantLevel;
  meta: (typeof lubricantLevelMeta)[LubricantLevel];
  resultText: string;
  warningText: string | null;
  alertText: string | null;
  previousText: string;
  deltaText: string;
  guide: { what: string; outOfRange: string } | null;
};

type ValidationGroup = {
  key: string;
  label: string;
  guide: string;
  rows: ValidationRow[];
};

const props = defineProps<{
  dashboard: AnyRow | null;
  loading?: boolean;
  error?: string | null;
}>();

const onlyOutOfRange = ref(false);
const chartFilter = ref("todos");

watch(
  () => props.dashboard?.selected?.equipo_id,
  () => {
    onlyOutOfRange.value = false;
    chartFilter.value = "todos";
  },
);

function equipmentTitle(item: AnyRow | null | undefined) {
  return item?.equipo_nombre || item?.equipment_nombre
    ? buildEquipmentDisplayTitle(item)
    : "Sin equipo";
}

function levelMeta(value: unknown) {
  return lubricantLevelMeta[normalizeLubricantLevel(value)];
}

function formatHours(value: unknown) {
  const text = formatLubricantNumber(value);
  return text || "—";
}

const latest = computed<AnyRow | null>(() => props.dashboard?.latest_analysis ?? null);
const latestLevel = computed<LubricantLevel>(() =>
  normalizeLubricantLevel(latest.value?.estado_diagnostico ?? latest.value?.sample_info?.condicion),
);
const latestMeta = computed(() => lubricantLevelMeta[latestLevel.value]);
const latestDate = computed(
  () =>
    latest.value?.sample_info?.fecha_informe ||
    latest.value?.fecha_reporte ||
    latest.value?.fecha_muestra ||
    "",
);

const sampleCount = computed(() => Number(props.dashboard?.metrics?.analisis_filtrados ?? 0));

const levelCounts = computed(() => {
  const metrics = props.dashboard?.metrics ?? {};
  const anormal = Number(metrics.anormales ?? 0);
  const precaucion = Number(metrics.precauciones ?? 0);
  const sinDato = Number(metrics.sin_dato ?? 0);
  const counts: Record<LubricantLevel, number> = {
    ANORMAL: anormal,
    PRECAUCION: precaucion,
    NORMAL: Math.max(0, sampleCount.value - anormal - precaucion - sinDato),
    "N/D": sinDato,
  };
  return (["ANORMAL", "PRECAUCION", "NORMAL"] as LubricantLevel[]).map((level) => ({
    level,
    count: counts[level],
    ...lubricantLevelMeta[level],
  }));
});

const rangeLabel = computed(() => {
  const filters = props.dashboard?.filters ?? {};
  if (!filters.from && !filters.to) return "Todo el historial";
  return `Del ${filters.from || "inicio"} al ${filters.to || "hoy"}`;
});

/** Series del gráfico por parámetro: de ahí sale el valor de la muestra anterior. */
const metricsByKey = computed(() => {
  const map = new Map<string, AnyRow>();
  for (const section of props.dashboard?.chart_sections ?? []) {
    for (const metric of section.metrics ?? []) {
      if (metric?.key) map.set(String(metric.key), metric);
    }
  }
  return map;
});

function previousPoint(key: string) {
  const points: AnyRow[] = metricsByKey.value.get(key)?.points ?? [];
  const latestId = latest.value?.id;
  const index = points.findIndex((point) => point.analisis_id === latestId);
  if (index > 0) return points[index - 1];
  if (index === -1 && points.length) return points[points.length - 1];
  return null;
}

function resultText(detail: AnyRow) {
  const numeric = detail.resultado_numerico;
  if (numeric !== null && numeric !== undefined && numeric !== "") {
    return formatLubricantNumber(numeric, detail.unidad) || String(numeric);
  }
  return String(detail.resultado_texto ?? "").trim() || "Sin resultado";
}

/** Orden del informe del laboratorio, para leer la tabla junto al informe impreso. */
const GROUP_ORDER = Object.keys(lubricantGroupGuide);

function groupPosition(label: unknown) {
  const index = GROUP_ORDER.indexOf(String(label ?? ""));
  return index === -1 ? GROUP_ORDER.length : index;
}

const validationGroups = computed<ValidationGroup[]>(() =>
  [...(props.dashboard?.detail_groups ?? [])]
    .sort((a: AnyRow, b: AnyRow) => groupPosition(a.label) - groupPosition(b.label))
    .map((group: AnyRow) => ({
    key: String(group.key ?? group.label),
    label: String(group.label ?? "Otros elementos"),
    guide: lubricantGroupGuide[String(group.label ?? "")] ?? "",
    rows: (group.detalles ?? []).map((detail: AnyRow): ValidationRow => {
      const key = String(detail.parametro_key ?? detail.parametro ?? "");
      const level = normalizeLubricantLevel(detail.nivel_alerta);
      const previous = previousPoint(key);
      const current = Number(detail.resultado_numerico);
      const previousValue = previous ? Number(previous.valor) : NaN;
      const delta =
        Number.isFinite(current) && Number.isFinite(previousValue) && detail.resultado_numerico !== null
          ? current - previousValue
          : null;
      return {
        key: `${group.key}-${key}-${detail.id ?? ""}`,
        label: String(detail.parametro_label ?? detail.parametro ?? key),
        level,
        meta: lubricantLevelMeta[level],
        resultText: resultText(detail),
        warningText: describeLubricantRule(detail.rango_precaucion, detail.unidad),
        alertText: describeLubricantRule(detail.rango_anormal, detail.unidad),
        previousText: previous ? formatLubricantNumber(previous.valor, detail.unidad) : "—",
        deltaText:
          delta === null || delta === 0
            ? ""
            : `${delta > 0 ? "+" : "−"}${formatLubricantNumber(Math.abs(delta))}`,
        guide: lubricantParameterGuideFor(key),
      };
    }),
  })),
);

const findings = computed(() =>
  validationGroups.value
    .flatMap((group) => group.rows)
    .filter((row) => row.level === "ANORMAL" || row.level === "PRECAUCION")
    .sort((a, b) => b.meta.severity - a.meta.severity)
    .map((row) => ({
      ...row,
      triggerText: row.level === "ANORMAL" ? row.alertText : row.warningText,
    })),
);

const verdictTitle = computed(() => {
  if (latestLevel.value === "NORMAL") return "Normal: todos los parámetros dentro de su límite";
  if (latestLevel.value === "N/D") return "Sin evaluación";
  const count = findings.value.length;
  const noun = count === 1 ? "parámetro fuera de límite" : "parámetros fuera de límite";
  return `${latestMeta.value.title}: ${count} ${noun}`;
});

const visibleValidationGroups = computed<ValidationGroup[]>(() =>
  validationGroups.value
    .map((group) => ({
      ...group,
      rows: onlyOutOfRange.value
        ? group.rows.filter((row) => row.level === "ANORMAL" || row.level === "PRECAUCION")
        : group.rows,
    }))
    .filter((group) => group.rows.length),
);

const LEVEL_WEIGHT: Record<string, number> = { ANORMAL: 3, PRECAUCION: 2, NORMAL: 1, "N/D": 0 };

/** Primero lo que salió de su límite; dentro de cada grupo, el orden del informe. */
const sortedSections = computed(() =>
  (props.dashboard?.chart_sections ?? []).map((section: AnyRow) => ({
    key: String(section.key),
    title: String(section.title),
    metrics: [...(section.metrics ?? [])].sort(
      (a: AnyRow, b: AnyRow) =>
        Number(b.fuera_de_rango > 0) - Number(a.fuera_de_rango > 0) ||
        (LEVEL_WEIGHT[normalizeLubricantLevel(b.ultimo_nivel)] ?? 0) -
          (LEVEL_WEIGHT[normalizeLubricantLevel(a.ultimo_nivel)] ?? 0),
    ),
  })),
);

const chartFilterOptions = computed(() => {
  const all = sortedSections.value.flatMap((section: AnyRow) => section.metrics);
  return [
    { key: "todos", title: "Todos", count: all.length },
    {
      key: "fuera",
      title: "Fuera de límite",
      count: all.filter((metric: AnyRow) => Number(metric.fuera_de_rango) > 0).length,
    },
    ...sortedSections.value
      .filter((section: AnyRow) => section.metrics.length)
      .map((section: AnyRow) => ({ key: section.key, title: section.title, count: section.metrics.length })),
  ];
});

const visibleMetrics = computed(() => {
  const all = sortedSections.value.flatMap((section: AnyRow) => section.metrics);
  if (chartFilter.value === "todos") {
    return [...all].sort(
      (a: AnyRow, b: AnyRow) => Number(b.fuera_de_rango > 0) - Number(a.fuera_de_rango > 0),
    );
  }
  if (chartFilter.value === "fuera") {
    return all.filter((metric: AnyRow) => Number(metric.fuera_de_rango) > 0);
  }
  return sortedSections.value.find((section: AnyRow) => section.key === chartFilter.value)?.metrics ?? [];
});

function metricSubtitle(metric: AnyRow) {
  const out = Number(metric.fuera_de_rango ?? 0);
  const group = metric.group_label || "";
  if (!out) return `${group} · siempre dentro de límite`;
  return `${group} · ${out} ${out === 1 ? "muestra" : "muestras"} fuera de límite`;
}

const timelineDesc = computed(() => [...(props.dashboard?.timeline ?? [])].reverse());
</script>

<style scoped>
.lub-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  min-width: 0;
}

.lub-panel > * {
  min-width: 0;
}

.lub-panel__state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 200px;
  padding: 24px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 18px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgba(var(--v-theme-on-surface), 0.72);
  text-align: center;
}

.lub-panel__state--compact {
  min-height: 120px;
}

.lub-eyebrow {
  display: block;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.lub-muted {
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.lub-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.lub-panel__identity h3 {
  margin: 4px 0 2px;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.lub-panel__identity p {
  margin: 0;
  font-size: 0.95rem;
}

.lub-panel__counts {
  display: grid;
  grid-template-columns: repeat(4, minmax(92px, 1fr));
  gap: 8px;
  margin: 0;
}

.lub-count {
  padding: 10px 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}

.lub-count dt {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.8rem;
  font-weight: 600;
}

.lub-count dd {
  margin: 2px 0 0;
  font-size: 1.5rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.lub-count--error dt {
  color: rgb(var(--v-theme-error));
}

.lub-count--warning dt {
  color: rgb(var(--v-theme-warning));
}

.lub-count--success dt {
  color: rgb(var(--v-theme-success));
}

.lub-verdict {
  --lub-tone: var(--v-theme-success);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid rgba(var(--lub-tone), 0.35);
  border-left: 6px solid rgb(var(--lub-tone));
  border-radius: 16px;
  background: rgba(var(--lub-tone), 0.07);
}

.lub-verdict--warning {
  --lub-tone: var(--v-theme-warning);
}

.lub-verdict--error {
  --lub-tone: var(--v-theme-error);
}

.lub-verdict--secondary {
  --lub-tone: var(--v-theme-secondary);
}

.lub-verdict__icon {
  color: rgb(var(--lub-tone));
}

.lub-verdict__body h4 {
  margin: 2px 0 4px;
  font-size: 1.15rem;
}

.lub-verdict__body p {
  margin: 0;
}

.lub-findings {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.lub-findings li {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.lub-verdict__hours {
  display: grid;
  gap: 8px;
  margin: 0;
  text-align: right;
}

.lub-verdict__hours dt {
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.78rem;
}

.lub-verdict__hours dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.lub-section {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.lub-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.lub-section__head h4 {
  margin: 0;
  font-size: 1.08rem;
}

.lub-section__head p {
  max-width: 78ch;
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.92rem;
}

.lub-table-wrap {
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}

.lub-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.lub-table th,
.lub-table td {
  padding: 8px 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: left;
  vertical-align: top;
}

.lub-table thead th {
  border-top: 0;
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.lub-table tbody th {
  font-weight: 600;
}

.lub-table__group th {
  background: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-primary));
  font-size: 0.86rem;
  font-weight: 750;
}

.lub-table__group th span {
  margin-left: 8px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-weight: 500;
}

.lub-table__row--warning {
  background: rgba(var(--v-theme-warning), 0.07);
}

.lub-table__row--error {
  background: rgba(var(--v-theme-error), 0.07);
}

.lub-param {
  display: block;
}

.lub-param__guide {
  display: block;
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8rem;
  font-weight: 400;
}

.lub-num {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.lub-delta {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.8rem;
}

.lub-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lub-filter .v-btn {
  border-radius: 10px;
  letter-spacing: 0;
  text-transform: none;
}

.lub-charts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  min-width: 0;
}

@media (max-width: 760px) {
  .lub-panel__counts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .lub-verdict {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .lub-verdict__hours {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    text-align: left;
  }

  .lub-charts {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

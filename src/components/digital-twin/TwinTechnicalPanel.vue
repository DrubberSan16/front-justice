<template>
  <div class="technical-panel">
    <v-alert v-if="!state.technical" type="info" variant="tonal"
      >Esta captura no contiene el cruce técnico por compartición. Consulta el
      estado actual para generarlo.</v-alert
    >
    <template v-else>
      <div>
        <h3 class="text-h6">Ficha y evidencia por compartición</h3>
        <p class="text-body-2 text-medium-emphasis mt-2">
          {{ state.technical.scope }}
        </p>
      </div>
      <div class="technical-metrics">
        <article>
          <small>Comparticiones vinculadas</small
          ><strong>{{ state.technical.component_count }}</strong
          ><span
            >{{ state.technical.component_serial_count }} con serie
            registrada</span
          >
        </article>
        <article>
          <small>Recorrido desde el último MPG</small
          ><strong>{{ number(state.technical.mpg.hours_since) }} h</strong
          ><span>{{
            state.technical.mpg.reliable
              ? state.technical.mpg.code
              : "Referencia por verificar"
          }}</span>
        </article>
        <article>
          <small>Horómetro del último MPG</small
          ><strong>{{ number(state.technical.mpg.horometer) }} h</strong
          ><span>{{ formatDateTime(state.technical.mpg.at) }}</span>
        </article>
      </div>
      <section
        v-if="state.technical.manufacturer?.length"
        class="manufacturer-evidence"
      >
        <h3 class="text-h6">Documentación oficial del fabricante</h3>
        <p class="text-body-2 text-medium-emphasis mt-2">
          El alcance se verifica por modelo y compartición. Completa la
          variante, serie y opciones de placa en Equipos para confirmar su
          aplicación.
        </p>
        <div class="manufacturer-grid mt-5">
          <article
            v-for="document in state.technical.manufacturer"
            :key="document.ref"
            class="manufacturer-card"
          >
            <div class="finding-heading">
              <strong>{{ document.publisher }}</strong
              ><v-chip
                size="small"
                variant="tonal"
                :color="
                  document.status === 'MODELO_COINCIDE' ? 'info' : 'warning'
                "
                >{{
                  document.status === "MODELO_COINCIDE"
                    ? "Coincide el modelo"
                    : "Por confirmar"
                }}</v-chip
              >
            </div>
            <a
              :href="document.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-body-2 d-inline-block mt-4"
              >{{ document.title }}
              <v-icon size="14" aria-hidden="true">mdi-open-in-new</v-icon></a
            >
            <p class="text-caption mt-3">
              {{ document.publication }} ·
              {{
                document.kind === "MANUAL"
                  ? "Manual"
                  : document.kind === "FICHA"
                    ? "Ficha de fabricante"
                    : "Buscador de manuales"
              }}
              · {{ document.pages }}
            </p>
            <p class="text-body-2 mt-3">{{ document.applicability }}</p>
            <p class="text-caption mt-3">
              Compartición:
              {{
                document.scope_refs
                  .map(
                    (ref) =>
                      state.technical?.components.find((c) => c.ref === ref)
                        ?.name,
                  )
                  .join(", ") || "Motor sin vinculación inequívoca"
              }}
            </p>
            <ul v-if="document.criteria.length" class="evidence-gaps mt-4">
              <li v-for="criterion in document.criteria" :key="criterion">
                {{ criterion }}
              </li>
            </ul>
            <ul v-if="document.gaps.length" class="evidence-gaps mt-4">
              <li v-for="gap in document.gaps" :key="gap">{{ gap }}</li>
            </ul>
          </article>
        </div>
      </section>
      <v-expansion-panels
        multiple
        variant="accordion"
        class="component-evidence"
      >
        <v-expansion-panel
          v-for="component in state.technical.components"
          :key="component.ref"
        >
          <v-expansion-panel-title>
            <div class="component-evidence-heading">
              <div>
                <strong>{{ component.name }}</strong>
                <p class="text-caption mt-2">
                  {{ component.category }} · Serie
                  {{ component.serie || "sin registrar" }}
                </p>
              </div>
              <v-chip size="small" variant="tonal"
                >{{ component.closed_orders }} OT cerradas ·
                {{ component.open_orders.length }} pendientes</v-chip
              >
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <p class="text-caption mb-4">
              {{
                component.manufacturer_refs?.length
                  ? "Documentación: " +
                    state.technical.manufacturer
                      .filter((d) =>
                        component.manufacturer_refs.includes(d.ref),
                      )
                      .map((d) => d.publication)
                      .join(" · ")
                  : "Sin manual identificado para esta compartición"
              }}
            </p>
            <p v-if="component.description" class="text-body-2 mb-5">
              {{ component.description }}
            </p>
            <div class="evidence-columns">
              <section>
                <h4 class="text-subtitle-2 mb-3">
                  Última intervención vinculada
                </h4>
                <template v-if="component.last_intervention"
                  ><strong>{{ component.last_intervention.code }}</strong>
                  <p class="text-body-2 mt-2">
                    {{ component.last_intervention.title }}
                  </p>
                  <p class="text-caption mt-2">
                    {{ formatDateTime(component.last_intervention.at) }}
                  </p>
                  <dl class="evidence-facts">
                    <div>
                      <dt>Horómetro al intervenir</dt>
                      <dd>
                        {{ number(component.last_intervention.horometer) }} h
                      </dd>
                    </div>
                    <div>
                      <dt>Recorrido posterior del equipo</dt>
                      <dd>
                        {{ number(component.last_intervention.hours_since) }} h
                      </dd>
                    </div>
                  </dl>
                </template>
                <p v-else class="text-body-2">
                  Sin intervención cerrada vinculada a esta compartición.
                </p>
                <div v-if="component.open_orders.length" class="mt-5">
                  <h4 class="text-subtitle-2 mb-3">Trabajo pendiente</h4>
                  <p
                    v-for="order in component.open_orders"
                    :key="order.code"
                    class="text-body-2 mb-2"
                  >
                    {{ order.code }} · {{ order.title }}
                  </p>
                </div>
              </section>
              <section>
                <h4 class="text-subtitle-2 mb-3">Evidencia de lubricante</h4>
                <template v-if="component.oil"
                  ><strong
                    >{{ component.oil.code }} ·
                    {{ component.oil.condition }}</strong
                  >
                  <p class="text-body-2 mt-2">{{ component.oil.diagnosis }}</p>
                  <p class="text-caption mt-3">
                    Muestra: {{ formatDateTime(component.oil.sampled_at) }} ·
                    {{
                      component.oil.age_days === null
                        ? "Fecha por verificar"
                        : `${component.oil.age_days} días de antigüedad`
                    }}
                  </p>
                  <p class="text-body-2 mt-3">
                    Lubricante: {{ component.oil.lubricant || "Sin registrar" }}
                  </p></template
                >
                <p v-else class="text-body-2">
                  {{
                    component.oil_applicability === "ESPERADA"
                      ? "Sin muestra vinculada de forma inequívoca."
                      : "Aplicabilidad de lubricante sin determinar en la ficha."
                  }}
                </p>
              </section>
            </div>
            <v-table
              v-if="component.oil?.measurements.length"
              class="lab-measurements mt-5"
              ><thead>
                <tr>
                  <th>Parámetro</th>
                  <th>Resultado</th>
                  <th>Referencia registrada</th>
                  <th>Nivel del laboratorio</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(value, index) in component.oil.measurements"
                  :key="index"
                >
                  <td>{{ value.parametro }}</td>
                  <td>
                    {{
                      value.resultado_numerico ?? value.resultado_texto ?? "—"
                    }}
                    {{ value.unidad }}
                  </td>
                  <td>{{ value.linea_base ?? "Sin referencia numérica" }}</td>
                  <td>{{ value.nivel_alerta || "Sin clasificar" }}</td>
                </tr>
              </tbody></v-table
            >
            <ul
              v-if="component.gaps.length"
              class="evidence-gaps text-body-2 mt-5"
            >
              <li v-for="gap in component.gaps" :key="gap">{{ gap }}</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-alert v-if="state.technical.missing.length" type="info" variant="tonal"
        ><strong>Información que falta para una evaluación completa</strong>
        <ul class="evidence-gaps mt-3">
          <li v-for="gap in state.technical.missing" :key="gap">{{ gap }}</li>
        </ul></v-alert
      >
      <section class="gpt-analysis">
        <div class="analysis-heading">
          <div>
            <h3 class="text-h6">Análisis técnico asistido por GPT</h3>
            <p class="text-body-2 text-medium-emphasis mt-2">
              Contrasta ficha, documentación oficial aplicable, horómetro, MPG y
              evidencia propia de cada compartición. Cada observación debe citar
              una fuente verificable.
            </p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-text-box-search-outline"
            :loading="busy"
            :disabled="historical || !analysis?.available"
            @click="$emit('analyze')"
            >{{
              analysis?.report ? "Actualizar análisis GPT" : "Analizar con GPT"
            }}</v-btn
          >
        </div>
        <v-alert v-if="historical" type="info" variant="tonal" class="mt-5"
          >El análisis GPT se genera desde el estado actual del activo.</v-alert
        >
        <p v-else-if="analysis && !analysis.available" class="text-body-2 mt-5">
          El servicio GPT está pendiente de configuración.
        </p>
        <p v-if="busy" class="text-body-2 mt-5" role="status">
          Contrastando evidencia y validando las referencias de cada
          compartición…
        </p>
        <template v-if="analysis?.report">
          <v-alert
            v-if="analysis.stale"
            type="warning"
            variant="tonal"
            class="mt-5"
            >La evidencia o la vigencia del análisis cambió. Actualiza el
            análisis antes de usar sus recomendaciones.</v-alert
          >
          <div class="analysis-summary">
            <p class="text-body-1">{{ analysis.report.result.summary }}</p>
            <p class="text-caption text-medium-emphasis mt-4">
              {{ analysis.report.model }} ·
              {{ formatDateTime(analysis.report.generated_at) }} · Horómetro de
              referencia: {{ number(analysis.report.basis_horometer) }} h
            </p>
          </div>
          <div class="analysis-findings">
            <v-card
              v-for="finding in analysis.report.result.components"
              :key="finding.component_ref"
              variant="outlined"
              rounded="lg"
              class="pa-5"
            >
              <div class="finding-heading">
                <h4 class="text-subtitle-1">
                  {{
                    finding.component_ref === "ACTIVO"
                      ? "Equipo completo"
                      : analysis.report.component_names[finding.component_ref]
                  }}
                </h4>
                <v-chip
                  size="small"
                  variant="tonal"
                  :color="
                    finding.assessment === 'REQUIERE_INSPECCION'
                      ? 'warning'
                      : 'info'
                  "
                  >{{ assessment(finding.assessment) }}</v-chip
                >
              </div>
              <p class="text-body-2 mt-4">{{ finding.observation }}</p>
              <p class="text-body-2 mt-4">
                <strong>Acción recomendada:</strong>
                {{ finding.recommendation }}
              </p>
              <div class="finding-references">
                <span class="text-caption font-weight-medium">Fuentes:</span
                ><span
                  v-for="ref in finding.evidence_refs"
                  :key="ref"
                  class="text-caption"
                  >{{
                    analysis.report.facts.find((f) => f.ref === ref)?.label ||
                    ref
                  }}</span
                >
              </div>
            </v-card>
          </div>
          <p class="text-body-2 text-medium-emphasis mt-5">
            Evaluación de evidencia registrada. La confirmación de desgaste o
            falla requiere inspección y referencias técnicas aplicables al
            equipo y su serie.
          </p>
        </template>
      </section>
    </template>
  </div>
</template>
<script setup lang="ts">
import { formatDateTime } from "@/app/utils/date-time";
import type { TwinState, TwinAnalysis } from "@/app/types/digital-twin.types";
defineProps<{
  state: TwinState;
  analysis: TwinAnalysis | null;
  busy: boolean;
  historical: boolean;
}>();
defineEmits<{ analyze: [] }>();
const number = (v: number | null) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(v);
const assessment = (value: string) =>
  (
    ({
      EVIDENCIA_PARCIAL: "Evidencia parcial",
      REQUIERE_INSPECCION: "Requiere inspección",
      SIN_EVIDENCIA: "Sin evidencia suficiente",
    }) as Record<string, string>
  )[value] || value;
</script>
<style scoped>
.technical-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
}
.technical-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.manufacturer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.manufacturer-card {
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.manufacturer-card a {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 3px;
}
.technical-metrics article {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 20px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.045);
}
.technical-metrics strong {
  font-size: 24px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.technical-metrics small,
.technical-metrics span {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.component-evidence-heading,
.analysis-heading,
.finding-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.component-evidence-heading strong {
  font-size: 15px;
}
.component-evidence :deep(.v-expansion-panel-title) {
  padding: 20px;
  min-height: 88px;
}
.component-evidence :deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 20px 24px;
}
.evidence-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
}
.evidence-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 20px;
}
.evidence-facts dt {
  font-size: 12px;
  margin-bottom: 8px;
}
.evidence-facts dd {
  font-size: 16px;
  font-weight: 600;
}
.evidence-gaps {
  padding-left: 20px;
  font-size: 13px;
}
.evidence-gaps li + li {
  margin-top: 10px;
}
.gpt-analysis {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 28px;
  min-width: 0;
}
.analysis-heading > div {
  flex: 1;
  min-width: min(100%, 260px);
}
.analysis-summary {
  margin: 24px 0;
  padding: 24px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.045);
}
.analysis-findings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.finding-references {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 20px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.lab-measurements {
  max-width: 100%;
}
.lab-measurements :deep(td),
.lab-measurements :deep(th) {
  white-space: normal;
  min-width: 140px;
  padding: 12px !important;
  font-size: 13px;
}
.technical-panel p,
.technical-panel li,
.technical-panel h4 {
  overflow-wrap: anywhere;
}
@media (max-width: 1100px) {
  .analysis-findings {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .manufacturer-grid {
    grid-template-columns: 1fr;
  }
  .technical-metrics,
  .evidence-columns {
    grid-template-columns: 1fr;
  }
  .analysis-heading .v-btn {
    max-width: 100%;
  }
  .component-evidence-heading {
    align-items: flex-start;
  }
}
</style>

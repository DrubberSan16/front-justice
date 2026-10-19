<template>
  <div class="simulation-workspace">
    <div>
      <h3 class="text-h6">Escenario de operación y mantenimiento</h3>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Cruza tiempos de OT cerradas, trabajo pendiente y programación del
        equipo. Los ciclos previstos quedan sujetos a confirmación.
      </p>
    </div>
    <v-card variant="outlined" rounded="lg" class="simulation-form-card">
      <v-form @submit.prevent="run">
        <v-row>
          <v-col cols="12" md="6"
            ><v-select
              v-model="mode"
              label="Ritmo de operación"
              :items="rateOptions"
              variant="outlined"
              hide-details
          /></v-col>
          <v-col cols="12" md="6"
            ><v-text-field
              v-model.number="days"
              label="Horizonte (días)"
              type="number"
              min="1"
              max="365"
              variant="outlined"
              hide-details
          /></v-col>
          <v-col cols="12" md="6"
            ><v-text-field
              v-model.number="hours"
              label="Operación manual (h/día)"
              type="number"
              min="0"
              max="24"
              step="0.5"
              :disabled="mode === 'HISTORICAL'"
              variant="outlined"
              hide-details
          /></v-col>
          <v-col cols="12" md="6"
            ><v-text-field
              v-model.number="downtime"
              label="Parada adicional (horas de operación)"
              type="number"
              min="0"
              :max="days * effectiveRate"
              variant="outlined"
              hide-details
          /></v-col>
        </v-row>
        <p
          class="text-body-2 text-medium-emphasis mt-5"
          v-if="mode === 'HISTORICAL'"
        >
          Ritmo observado: <strong>{{ number(effectiveRate) }} h/día</strong> ·
          {{ state.simulation_basis?.samples }} intervalos válidos ·
          {{ state.simulation_basis?.observed_days }} días observados. Última
          lectura: {{ formatDateTime(state.simulation_basis?.to) }}.
        </p>
        <p class="text-body-2 text-medium-emphasis mt-5" v-else>
          Las horas diarias son un supuesto manual. Las ventanas de parada de
          las OT se incorporan automáticamente; indica aquí solo paradas
          adicionales.
        </p>
        <v-checkbox
          v-model="includePossible"
          label="Incluir ciclos MPG previstos con base en servicios cerrados"
          color="primary"
          hide-details
          class="mt-3"
        />
        <v-alert v-if="!valid" variant="tonal" type="warning" class="mt-4"
          >Usa 1–365 días, 0–24 h/día y una parada adicional que no supere la
          operación prevista.</v-alert
        >
        <v-btn
          type="submit"
          color="primary"
          :disabled="!valid || disabled"
          :loading="busy"
          prepend-icon="mdi-chart-timeline-variant"
          class="mt-5"
          >Simular escenario</v-btn
        >
      </v-form>
    </v-card>
    <div v-if="result" class="simulation-result" aria-live="polite">
      <div class="result-heading">
        <h4 class="text-subtitle-1 font-weight-bold">
          Resultado del escenario
        </h4>
        <span class="text-caption text-medium-emphasis"
          >Base: {{ formatDateTime(result.basis_at) }}</span
        >
      </div>
      <p class="text-body-2 text-medium-emphasis mt-2 mb-5">
        {{ result.assumptions.days }} días ·
        {{ number(result.assumptions.hours_per_day) }} h/día ({{
          result.assumptions.rate_mode === "HISTORICAL"
            ? "ritmo observado"
            : "supuesto manual"
        }}) · {{ number(result.assumptions.downtime_hours) }} h de parada
        adicional.
      </p>
      <div class="simulation-numbers">
        <div>
          <small>Horómetro proyectado</small
          ><strong>{{ number(result.projected_horometer) }} h</strong
          ><span>Inicio: {{ number(result.start) }} h</span>
        </div>
        <div>
          <small>Operación adicional</small
          ><strong>{{ number(result.added_hours) }} h</strong
          ><span
            >{{ number(result.operation_lost_hours) }} h descontadas por
            ventanas de parada</span
          >
        </div>
        <div>
          <small>Intervenciones registradas</small
          ><strong>{{ result.scheduled_count }}</strong
          ><span>OT pendientes y programación</span>
        </div>
        <div>
          <small>Ciclos MPG previstos</small
          ><strong>{{ result.possible_count }}</strong
          ><span>Pendientes de confirmar</span>
        </div>
      </div>
      <svg
        viewBox="0 0 640 205"
        role="img"
        :aria-label="`Proyección del horómetro de ${result.start} a ${result.projected_horometer} horas en ${result.assumptions.days} días`"
        class="simulation-chart"
      >
        <line
          x1="35"
          y1="160"
          x2="610"
          y2="160"
          stroke="currentColor"
          opacity=".2"
        />
        <line
          v-if="targetY !== null"
          x1="35"
          :y1="targetY"
          x2="610"
          :y2="targetY"
          stroke="rgb(var(--v-theme-warning))"
          stroke-dasharray="6 5"
        />
        <polyline
          :points="points"
          fill="none"
          stroke="rgb(var(--v-theme-primary))"
          stroke-width="3"
        />
        <text x="35" y="190" fill="currentColor" font-size="12">Día 0</text>
        <text x="540" y="190" fill="currentColor" font-size="12">
          Día {{ result.assumptions.days }}
        </text>
        <text
          v-if="targetY !== null"
          x="40"
          :y="Math.max(14, targetY - 8)"
          fill="currentColor"
          font-size="12"
        >
          MPG actual: {{ number(result.target) }} h
        </text>
      </svg>
      <v-alert
        v-if="result.target !== null"
        :type="
          !result.target_reliable
            ? 'info'
            : result.target_reached || result.exceeds_target
              ? 'warning'
              : 'info'
        "
        variant="tonal"
        class="mb-6"
      >
        <p>
          Distancia al objetivo MPG actual al final del escenario:
          <strong>{{ number(result.remaining) }} h</strong>.
          {{
            !result.target_reliable
              ? "La referencia del último MPG requiere validación."
              : result.target_reached || result.exceeds_target
                ? "El escenario alcanza o supera el objetivo actual; revisa las intervenciones previstas."
                : "El objetivo actual permanece fuera del horizonte."
          }}
        </p>
        <p
          v-if="
            result.next_target !== null && result.next_target !== result.target
          "
          class="mt-2"
        >
          Tras finalizar los servicios del escenario, siguiente objetivo
          hipotético: {{ number(result.next_target) }} h · restante:
          {{ number(result.remaining_after_services) }} h.
        </p>
      </v-alert>
      <div class="simulation-section">
        <h4 class="text-subtitle-1 font-weight-bold">
          Intervenciones en el horizonte
        </h4>
        <p class="text-body-2 text-medium-emphasis mt-2 mb-4">
          Las OT conservan sus fechas. La programación por horómetro y los
          ciclos MPG usan fechas estimadas según el ritmo del escenario.
        </p>
        <v-table v-if="result.interventions.length" class="simulation-table">
          <thead>
            <tr>
              <th>Intervención / origen</th>
              <th>Fecha prevista</th>
              <th>Tiempo / respaldo</th>
              <th>Efecto en la operación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in result.interventions" :key="item.id">
              <td>
                <v-chip
                  size="small"
                  :color="
                    item.category === 'MPG_PROYECTADO' ? 'warning' : 'primary'
                  "
                  variant="tonal"
                  >{{ category(item.category) }}</v-chip
                ><strong class="cell-title">{{ item.code }}</strong
                ><span>{{ item.title }}</span>
                <p v-if="item.target !== null" class="mt-2">
                  Umbral: {{ number(item.target) }} h
                </p>
              </td>
              <td>
                {{ item.at ? formatDateTime(item.at) : "Fecha por definir" }}
                <p v-if="item.end_at" class="text-caption mt-2">
                  Hasta {{ formatDateTime(item.end_at) }}
                </p>
                <v-chip
                  v-if="item.overdue"
                  color="error"
                  size="small"
                  variant="tonal"
                  class="mt-2"
                  >Vencida al inicio</v-chip
                >
              </td>
              <td>
                <strong>{{
                  item.duration_hours === null
                    ? "Tiempo por definir"
                    : `${number(item.duration_hours)} h`
                }}</strong>
                <p class="mt-2">{{ item.duration_basis }}</p>
                <p class="text-caption mt-2">
                  {{ item.samples }} OT de referencia<span v-if="item.range">
                    · rango {{ number(item.range[0]) }}–{{
                      number(item.range[1])
                    }}
                    h</span
                  >
                </p>
                <p v-if="item.reference_codes.length" class="text-caption mt-2">
                  {{ item.reference_codes.join(" · ") }}
                </p>
              </td>
              <td>
                {{
                  !item.included
                    ? "Sin descuento: faltan datos"
                    : item.requires_stop === true
                      ? "Parada incluida en la proyección"
                      : item.requires_stop === false
                        ? "Intervención sin parada del equipo"
                        : "Requisito de parada por validar"
                }}
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-alert v-else type="info" variant="tonal"
          >No se identificaron intervenciones fechadas o ciclos estimables para
          este horizonte.</v-alert
        >
      </div>
      <v-expansion-panels variant="accordion" class="mt-6"
        ><v-expansion-panel title="Tiempos reales usados como referencia"
          ><v-expansion-panel-text>
            <p class="text-body-2 mb-4">
              {{ result.history.valid_durations }} de
              {{ result.history.closed_orders }} OT cerradas en los últimos
              {{ result.history.window_days }} días tienen tiempos válidos.
              {{ result.history.rejected_durations }} sin duración utilizable.
              Se usa la mediana de trabajos comparables del equipo.
            </p>
            <v-table
              v-if="result.history.recent.length"
              class="simulation-table"
              ><thead>
                <tr>
                  <th>OT</th>
                  <th>Trabajo</th>
                  <th>Tiempo real</th>
                  <th>Fuente</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in result.history.recent" :key="row.code">
                  <td>{{ row.code }}</td>
                  <td>{{ row.title }}</td>
                  <td>{{ number(row.hours) }} h</td>
                  <td>{{ row.basis }}</td>
                </tr>
              </tbody></v-table
            >
            <p v-else class="text-body-2">
              No hay ejecuciones cerradas con tiempo válido para estimar
              duraciones.
            </p>
            <p class="text-caption mt-4">
              Se muestran las últimas 20 referencias. En cebados se excluyen los
              intervalos en revisión; en las demás OT se conserva el tiempo de
              ejecución registrado.
            </p>
          </v-expansion-panel-text></v-expansion-panel
        ></v-expansion-panels
      >
      <v-alert
        v-if="result.warnings.length"
        type="warning"
        variant="tonal"
        class="mt-6"
        ><strong>Datos que requieren revisión</strong>
        <ul class="simulation-warnings">
          <li v-for="warning in result.warnings" :key="warning">
            {{ warning }}
          </li>
        </ul></v-alert
      >
      <p class="text-body-2 text-medium-emphasis mt-6">
        {{ result.explanation }}
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { formatDateTime } from "@/app/utils/date-time";
import type {
  TwinSimulation,
  TwinSimulationInput,
  TwinState,
} from "@/app/types/digital-twin.types";
const props = defineProps<{
  result: TwinSimulation | null;
  busy: boolean;
  disabled: boolean;
  state: TwinState;
}>();
const emit = defineEmits<{ simulate: [input: TwinSimulationInput] }>();
const days = ref(30),
  hours = ref(12),
  downtime = ref(0),
  includePossible = ref(true),
  mode = ref<"MANUAL" | "HISTORICAL">("MANUAL");
const hasRate = computed(
  () => props.state.simulation_basis?.hours_per_day != null,
);
watch(
  () => props.state.identity.id,
  () => {
    mode.value = hasRate.value ? "HISTORICAL" : "MANUAL";
  },
  { immediate: true },
);
const rateOptions = computed(() => [
  {
    title: "Ritmo observado en lecturas",
    value: "HISTORICAL",
    props: { disabled: !hasRate.value },
  },
  { title: "Definir horas de operación", value: "MANUAL" },
]);
const effectiveRate = computed(() =>
  mode.value === "HISTORICAL"
    ? (props.state.simulation_basis?.hours_per_day ?? 0)
    : hours.value,
);
const valid = computed(
  () =>
    [days.value, effectiveRate.value, downtime.value].every(
      (v) => typeof v === "number" && Number.isFinite(v),
    ) &&
    Number.isInteger(days.value) &&
    days.value >= 1 &&
    days.value <= 365 &&
    effectiveRate.value >= 0 &&
    effectiveRate.value <= 24 &&
    downtime.value >= 0 &&
    downtime.value <= days.value * effectiveRate.value &&
    (mode.value !== "HISTORICAL" || hasRate.value),
);
const number = (v: number | null) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(v);
const category = (value: string) =>
  (
    ({
      OT_REGISTRADA: "OT registrada",
      PROGRAMADA: "Programación",
      MPG_PROYECTADO: "MPG previsto",
    }) as Record<string, string>
  )[value] || value;
const bounds = computed(() => {
  const r = props.result;
  if (!r) return [0, 1];
  const values = [
    r.start,
    r.projected_horometer,
    ...(r.target !== null ? [r.target] : []),
  ];
  return [Math.min(...values), Math.max(...values) + 1];
});
const y = (n: number) =>
  160 - ((n - bounds.value[0]!) / (bounds.value[1]! - bounds.value[0]!)) * 130;
const points = computed(
  () =>
    props.result?.points
      .map(
        (p) =>
          `${35 + (p.day / props.result!.assumptions.days) * 575},${y(p.horometer)}`,
      )
      .join(" ") || "",
);
const targetY = computed(() =>
  props.result?.target == null ? null : y(props.result.target),
);
function run() {
  if (valid.value)
    emit("simulate", {
      days: days.value,
      hours_per_day: effectiveRate.value,
      downtime_hours: downtime.value,
      rate_mode: mode.value,
      include_possible: includePossible.value,
    });
}
</script>
<style scoped>
.simulation-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  min-width: 0;
}
.simulation-result,
.simulation-section,
.simulation-table {
  min-width: 0;
  max-width: 100%;
}
.simulation-form-card {
  padding: 24px;
}
.simulation-numbers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.simulation-numbers > div {
  padding: 20px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.045);
  display: grid;
  align-content: start;
  gap: 10px;
}
.simulation-numbers small,
.simulation-numbers span {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.simulation-numbers strong {
  font-size: 24px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.result-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.simulation-chart {
  width: 100%;
  max-height: 280px;
  margin: 24px 0;
  color: rgb(var(--v-theme-on-surface));
}
.simulation-table :deep(td),
.simulation-table :deep(th) {
  white-space: normal;
  min-width: 150px;
  padding: 16px !important;
  font-size: 13px;
  vertical-align: top;
}
.simulation-table :deep(td) {
  overflow-wrap: anywhere;
}
.cell-title {
  display: block;
  margin: 12px 0 8px;
}
.simulation-warnings {
  padding-left: 20px;
  margin-top: 12px;
}
.simulation-warnings li + li {
  margin-top: 10px;
}
@media (max-width: 600px) {
  .simulation-form-card {
    padding: 18px;
  }
  .simulation-numbers {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>

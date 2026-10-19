<template>
  <div>
    <h3 class="text-h6 mb-2">Escenario de operación</h3>
    <p class="text-body-2 mb-5">
      Proyecta el horómetro y su distancia al próximo MPG a partir de los
      registros actuales. Ajusta las horas de uso y la parada total del período.
    </p>
    <v-form @submit.prevent="run">
      <v-row
        ><v-col cols="12" sm="4"
          ><v-text-field
            v-model.number="days"
            label="Horizonte (días)"
            type="number"
            min="1"
            max="365"
            variant="outlined"
        /></v-col>
        <v-col cols="12" sm="4"
          ><v-text-field
            v-model.number="hours"
            label="Operación (h/día)"
            type="number"
            min="0"
            max="24"
            step="0.5"
            variant="outlined"
        /></v-col>
        <v-col cols="12" sm="4"
          ><v-text-field
            v-model.number="downtime"
            label="Parada total (h)"
            type="number"
            min="0"
            :max="days * hours"
            variant="outlined" /></v-col
      ></v-row>
      <v-alert v-if="!valid" variant="tonal" type="warning" class="mb-4"
        >Usa 1–365 días, 0–24 h/día y una parada que no supere las horas de
        operación previstas.</v-alert
      >
      <v-btn
        type="submit"
        color="primary"
        :disabled="!valid || disabled"
        :loading="busy"
        prepend-icon="mdi-chart-timeline-variant"
        >Simular escenario</v-btn
      >
    </v-form>
    <div v-if="result" class="simulation-result mt-6" aria-live="polite">
      <p class="text-caption mb-3">
        Supuestos de este resultado: {{ result.assumptions.days }} días,
        {{ result.assumptions.hours_per_day }} h/día y
        {{ result.assumptions.downtime_hours }} h de parada.
      </p>
      <div class="simulation-numbers">
        <div>
          <small>Horómetro proyectado</small
          ><strong>{{ number(result.projected_horometer) }} h</strong>
        </div>
        <div>
          <small>Horas adicionales</small
          ><strong>{{ number(result.added_hours) }} h</strong>
        </div>
        <div>
          <small>Distancia al MPG</small
          ><strong>{{
            result.remaining === null
              ? "Sin frecuencia por horas"
              : `${number(result.remaining)} h`
          }}</strong>
        </div>
      </div>
      <svg
        viewBox="0 0 640 180"
        role="img"
        :aria-label="`Proyección del horómetro de ${result.start} a ${result.projected_horometer} horas en ${result.assumptions.days} días`"
        class="simulation-chart"
      >
        <line
          x1="30"
          y1="148"
          x2="610"
          y2="148"
          stroke="currentColor"
          opacity=".2"
        />
        <line
          v-if="targetY !== null"
          x1="30"
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
          stroke-width="4"
        />
        <text x="30" y="174" fill="currentColor" font-size="12">Día 0</text>
        <text x="550" y="174" fill="currentColor" font-size="12">
          Día {{ result.assumptions.days }}
        </text>
        <text
          v-if="targetY !== null"
          x="35"
          :y="Math.max(12, targetY - 6)"
          fill="currentColor"
          font-size="11"
        >
          Objetivo MPG {{ number(result.target) }} h
        </text>
      </svg>
      <v-alert
        v-if="result.target !== null"
        :type="
          !result.target_reliable
            ? 'info'
            : result.exceeds_target
              ? 'warning'
              : 'success'
        "
        variant="tonal"
        class="mt-3"
      >
        {{
          !result.target_reliable
            ? "El objetivo MPG utiliza una referencia estimada. Verifica el último servicio antes de planificar."
            : result.exceeds_target
              ? "El escenario supera el objetivo MPG registrado."
              : "El escenario termina antes del objetivo MPG registrado."
        }}
      </v-alert>
      <p class="text-caption mt-4">
        Base consultada: {{ formatDateTime(result.basis_at) }}.
        {{ result.explanation }}
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { formatDateTime } from "@/app/utils/date-time";
import type { TwinSimulation } from "@/app/types/digital-twin.types";
const props = defineProps<{
  result: TwinSimulation | null;
  busy: boolean;
  disabled: boolean;
}>();
const emit = defineEmits<{
  simulate: [
    input: { days: number; hours_per_day: number; downtime_hours: number },
  ];
}>();
const days = ref(30),
  hours = ref(12),
  downtime = ref(0);
const valid = computed(
  () =>
    [days.value, hours.value, downtime.value].every(
      (v) => typeof v === "number" && Number.isFinite(v),
    ) &&
    Number.isInteger(days.value) &&
    days.value >= 1 &&
    days.value <= 365 &&
    hours.value >= 0 &&
    hours.value <= 24 &&
    downtime.value >= 0 &&
    downtime.value <= days.value * hours.value,
);
const number = (v: number | null) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(v);
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
  148 - ((n - bounds.value[0]!) / (bounds.value[1]! - bounds.value[0]!)) * 120;
const points = computed(
  () =>
    props.result?.points
      .map(
        (p) =>
          `${30 + (p.day / props.result!.assumptions.days) * 580},${y(p.horometer)}`,
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
      hours_per_day: hours.value,
      downtime_hours: downtime.value,
    });
}
</script>
<style scoped>
.simulation-numbers {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.simulation-numbers small {
  display: block;
  opacity: 0.7;
  font-size: 12px;
}
.simulation-numbers strong {
  font-size: 22px;
  display: block;
  overflow-wrap: anywhere;
}
.simulation-chart {
  width: 100%;
  max-height: 260px;
  margin-top: 20px;
  color: rgb(var(--v-theme-on-surface));
}
@media (max-width: 600px) {
  .simulation-numbers {
    grid-template-columns: 1fr;
  }
}
</style>

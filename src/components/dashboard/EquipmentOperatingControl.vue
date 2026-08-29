<template>
  <v-card rounded="xl" class="enterprise-surface equipment-panel">
    <div class="equipment-panel__header">
      <div class="equipment-panel__heading">
        <div class="equipment-panel__icon"><v-icon icon="mdi-toggle-switch-outline" size="21" /></div>
        <div>
          <div class="text-subtitle-1 font-weight-bold">Control operativo de equipos</div>
          <div class="text-body-2 text-medium-emphasis">
            Indicador rojo: estado operativo (solo lectura). Palanca verde: estado de funcionamiento.
          </div>
        </div>
      </div>
      <div class="equipment-panel__header-actions">
        <v-chip label color="primary" variant="tonal">{{ equipos.length }} equipos</v-chip>
        <span v-if="canScrollPrev || canScrollNext" class="equipment-panel__scroll-hint">
          <v-icon icon="mdi-gesture-swipe-horizontal" size="14" />
          Desliza o usa la barra
        </span>
        <span v-if="!canEdit" class="equipment-panel__readonly-badge" title="Tu rol no tiene permiso de edición sobre Equipos.">
          <v-icon icon="mdi-lock-outline" size="14" />
          Solo lectura
        </span>
      </div>
    </div>

    <div class="equipment-panel__body">
      <button
        type="button"
        class="equipment-panel__nav equipment-panel__nav--prev"
        aria-label="Ver equipos anteriores"
        :disabled="!canScrollPrev"
        @click="scrollByStep(-1)"
      >
        <v-icon icon="mdi-chevron-left" size="22" />
      </button>

      <div
        ref="scrollerRef"
        class="equipment-panel__track"
        role="region"
        tabindex="0"
        aria-label="Lista de equipos, deslizable horizontalmente. Usa las flechas izquierda y derecha o la barra de desplazamiento."
        @scroll="updateScrollState"
      >
        <template v-if="loading && !equipos.length">
          <div v-for="n in 4" :key="`skeleton-${n}`" class="equipment-card equipment-card--skeleton">
            <div class="equipment-skeleton-line equipment-skeleton-line--sm" />
            <div class="equipment-skeleton-line equipment-skeleton-line--lg" />
            <div class="equipment-skeleton-line" />
            <div class="equipment-skeleton-line" />
          </div>
        </template>

        <template v-else-if="!equipos.length">
          <div class="equipment-panel__empty text-body-2 text-medium-emphasis">
            No hay equipos registrados para mostrar en el panel operativo.
          </div>
        </template>

        <template v-else>
          <article
            v-for="item in equipos"
            :key="item.id"
            class="equipment-card"
            :class="{
              'equipment-card--saving': stateFor(item).saving || stateFor(item).horometerSaving,
            }"
          >
            <header class="equipment-card__head">
              <div class="equipment-card__title" :title="equipmentHeaderLabel(item)">
                <span class="equipment-card__code">{{ item.codigo || "S/C" }}</span>
                <span class="equipment-card__separator">-</span>
                <span class="equipment-card__name">{{ item.nombre || "Equipo sin nombre" }}</span>
                <span v-if="item.modelo" class="equipment-card__model">({{ item.modelo }})</span>
              </div>
            </header>

            <div class="equipment-card__panel">
              <div class="equipment-control">
                <span
                  class="equipment-rocker"
                  :class="{ 'equipment-rocker--on': isOperativo(item) }"
                  aria-hidden="true"
                >
                  <span class="equipment-rocker__lamp" />
                </span>
                <div class="equipment-control__text">
                  <span class="equipment-control__label">Operativo</span>
                  <span class="equipment-control__value">{{ item.estado_operativo || "Sin dato" }}</span>
                </div>
              </div>

              <div class="equipment-control equipment-control--lever">
                <button
                  type="button"
                  class="equipment-lever"
                  :class="{
                    'equipment-lever--on': stateFor(item).value === 'FUNCIONAMIENTO',
                    'equipment-lever--readonly': !canEdit,
                  }"
                  :aria-pressed="stateFor(item).value === 'FUNCIONAMIENTO'"
                  :aria-label="leverAriaLabel(item)"
                  :title="!canEdit ? 'Tu rol no tiene permiso de edición sobre Equipos.' : ''"
                  :disabled="!canEdit || stateFor(item).saving"
                  @click="toggleFuncionamiento(item)"
                >
                  <svg viewBox="0 0 72 96" class="equipment-lever__svg" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="66" height="90" rx="12" class="equipment-lever__plate" />
                    <circle cx="36" cy="17" r="6" class="equipment-lever__pilot" />
                    <circle cx="36" cy="59" r="27" class="equipment-lever__bezel" />
                    <circle cx="36" cy="59" r="22" class="equipment-lever__bezel-inner" />
                    <g class="equipment-lever__handle" :style="{ transform: `rotate(${leverAngle(item)}deg)` }">
                      <rect x="32" y="24" width="8" height="38" rx="4" class="equipment-lever__arm" />
                      <circle cx="36" cy="24" r="7" class="equipment-lever__knob" />
                    </g>
                    <circle cx="36" cy="59" r="5" class="equipment-lever__hub" />
                  </svg>
                  <v-progress-circular
                    v-if="stateFor(item).saving"
                    indeterminate
                    size="16"
                    width="2"
                    class="equipment-lever__spinner"
                  />
                </button>
                <div class="equipment-control__text">
                  <span class="equipment-control__label">Funcionamiento</span>
                  <span class="equipment-control__value equipment-control__value--state">
                    {{ stateFor(item).value === "FUNCIONAMIENTO" ? "Activo" : "Desactive" }}
                  </span>
                </div>
              </div>
            </div>

            <p class="equipment-card__timestamp">
              Último cambio: {{ formatDateTime(stateFor(item).updatedAt, "Sin cambios registrados") }}
            </p>

            <div class="equipment-card__horometer">
              <div class="equipment-card__horometer-control">
                <v-text-field
                  v-model="stateFor(item).horometerInput"
                  label="Horómetro actual"
                  type="number"
                  min="0"
                  step="0.01"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  :disabled="!canEdit || stateFor(item).horometerSaving"
                  :loading="stateFor(item).horometerSaving"
                  :error-messages="stateFor(item).horometerError || undefined"
                  @keydown.enter.prevent="saveHorometer(item)"
                />
                <v-btn
                  icon="mdi-content-save-outline"
                  size="small"
                  color="primary"
                  variant="tonal"
                  title="Guardar horómetro"
                  aria-label="Guardar horómetro actual"
                  :disabled="!canEdit || stateFor(item).horometerSaving"
                  :loading="stateFor(item).horometerSaving"
                  @click="saveHorometer(item)"
                />
              </div>
              <span class="equipment-card__horometer-date">
                Última lectura: {{ formatDateTime(stateFor(item).horometerUpdatedAt, "Sin lectura registrada") }}
              </span>
            </div>

            <p v-if="stateFor(item).error" class="equipment-card__error">{{ stateFor(item).error }}</p>
          </article>
        </template>
      </div>

      <button
        type="button"
        class="equipment-panel__nav equipment-panel__nav--next"
        aria-label="Ver más equipos"
        :disabled="!canScrollNext"
        @click="scrollByStep(1)"
      >
        <v-icon icon="mdi-chevron-right" size="22" />
      </button>
    </div>

    <div class="equipment-panel__sr-live" aria-live="polite">{{ liveMessage }}</div>
  </v-card>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { formatDateTime } from "@/app/utils/date-time";

export type EquipmentControlItem = {
  id: string | number;
  codigo?: string | null;
  nombre?: string | null;
  modelo?: string | null;
  estado_operativo?: string | null;
  estado_funcionamiento?: string | null;
  estado_funcionamiento_actualizado_en?: string | null;
  horometro_actual?: number | string | null;
  fecha_ultima_lectura?: string | null;
};

type CardState = {
  value: "FUNCIONAMIENTO" | "PARADO";
  saving: boolean;
  error: string | null;
  updatedAt: string | null;
  horometerInput: string;
  savedHorometer: number | null;
  horometerSaving: boolean;
  horometerError: string | null;
  horometerUpdatedAt: string | null;
};

const props = withDefaults(
  defineProps<{
    equipos: EquipmentControlItem[];
    canEdit?: boolean;
    loading?: boolean;
  }>(),
  {
    canEdit: false,
    loading: false,
  },
);

const emit = defineEmits<{
  (
    e: "updated",
    payload: {
      id: string | number;
      estado_funcionamiento: "FUNCIONAMIENTO" | "PARADO";
      estado_funcionamiento_actualizado_en: string | null;
    },
  ): void;
  (
    e: "horometer-updated",
    payload: {
      id: string | number;
      horometro_actual: number;
      fecha_ultima_lectura: string | null;
    },
  ): void;
}>();

const states = reactive<Record<string, CardState>>({});
const liveMessage = ref("");
const scrollerRef = ref<HTMLElement | null>(null);
const canScrollPrev = ref(false);
const canScrollNext = ref(false);
let resizeObserver: ResizeObserver | null = null;

function normalizeFuncionamiento(value: unknown): "FUNCIONAMIENTO" | "PARADO" {
  return String(value || "").trim().toUpperCase() === "FUNCIONAMIENTO" ? "FUNCIONAMIENTO" : "PARADO";
}

function parseHorometer(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function formatHorometerInput(value: unknown) {
  const parsed = parseHorometer(value);
  return parsed === null ? "" : String(parsed);
}

function isOperativo(item: EquipmentControlItem) {
  return String(item?.estado_operativo || "").trim().toUpperCase() === "OPERATIVO";
}

function stateFor(item: EquipmentControlItem): CardState {
  const key = String(item.id);
  if (!states[key]) {
    states[key] = {
      value: normalizeFuncionamiento(item.estado_funcionamiento),
      saving: false,
      error: null,
      updatedAt: item.estado_funcionamiento_actualizado_en ?? null,
      horometerInput: formatHorometerInput(item.horometro_actual),
      savedHorometer: parseHorometer(item.horometro_actual),
      horometerSaving: false,
      horometerError: null,
      horometerUpdatedAt: item.fecha_ultima_lectura ?? null,
    };
  }
  return states[key];
}

function leverAngle(item: EquipmentControlItem) {
  return stateFor(item).value === "FUNCIONAMIENTO" ? 32 : -32;
}

function equipmentHeaderLabel(item: EquipmentControlItem) {
  const code = String(item.codigo || "S/C").trim();
  const name = String(item.nombre || "Equipo sin nombre").trim();
  const model = String(item.modelo || "").trim();
  return model ? `${code} - ${name} (${model})` : `${code} - ${name}`;
}

function leverAriaLabel(item: EquipmentControlItem) {
  const name = equipmentHeaderLabel(item);
  const state = stateFor(item);
  const current = state.value === "FUNCIONAMIENTO" ? "Activo" : "Desactive";
  return `Estado de funcionamiento de ${name}: ${current}.${canEditLabel()}`;
}

function canEditLabel() {
  return props.canEdit ? " Presiona para cambiar." : " Solo lectura, sin permiso de edición.";
}

async function toggleFuncionamiento(item: EquipmentControlItem) {
  if (!props.canEdit) return;
  const state = stateFor(item);
  if (state.saving) return;

  const next = state.value === "FUNCIONAMIENTO" ? "PARADO" : "FUNCIONAMIENTO";
  const label = item.codigo || item.nombre || "equipo";
  state.saving = true;
  state.error = null;
  liveMessage.value = `Actualizando estado de funcionamiento de ${label}...`;

  try {
    const { data } = await api.patch(`/kpi_maintenance/equipos/${item.id}/estado-funcionamiento`, {
      estado_funcionamiento: next,
    });
    const updated = data?.data ?? data ?? {};
    const updatedAt: string | null =
      updated?.estado_funcionamiento_actualizado_en || updated?.updated_at || state.updatedAt;
    state.value = next;
    state.updatedAt = updatedAt;
    liveMessage.value = `${label} actualizado a ${next === "FUNCIONAMIENTO" ? "Activo" : "Desactive"}.`;
    emit("updated", { id: item.id, estado_funcionamiento: next, estado_funcionamiento_actualizado_en: updatedAt });
  } catch (e: any) {
    state.error = e?.response?.data?.message || "No se pudo actualizar el estado de funcionamiento.";
    liveMessage.value = `No se pudo actualizar ${label}: ${state.error}`;
  } finally {
    state.saving = false;
  }
}

async function saveHorometer(item: EquipmentControlItem) {
  if (!props.canEdit) return;
  const state = stateFor(item);
  if (state.horometerSaving) return;

  const next = parseHorometer(state.horometerInput);
  const label = item.codigo || item.nombre || "equipo";
  if (next === null || next < 0) {
    state.horometerError = "Ingresa un horómetro válido mayor o igual a cero.";
    return;
  }
  if (state.savedHorometer === next) {
    state.horometerError = null;
    state.horometerInput = formatHorometerInput(next);
    return;
  }

  const previousHorometer = state.savedHorometer;
  const isBackwardCorrection = previousHorometer !== null && next < previousHorometer;

  state.horometerSaving = true;
  state.horometerError = null;
  liveMessage.value = `Actualizando horómetro de ${label}...`;

  try {
    const { data } = await api.patch(`/kpi_maintenance/equipos/${item.id}/horometro`, {
      horometro_actual: next,
    });
    const updated = data?.data ?? data ?? {};
    const savedValue = parseHorometer(updated?.horometro_actual) ?? next;
    const updatedAt: string | null = updated?.fecha_ultima_lectura || state.horometerUpdatedAt;
    state.savedHorometer = savedValue;
    state.horometerInput = formatHorometerInput(savedValue);
    state.horometerUpdatedAt = updatedAt;
    liveMessage.value = isBackwardCorrection
      ? `Horómetro de ${label} corregido de ${previousHorometer} a ${savedValue}.`
      : `Horómetro de ${label} actualizado a ${savedValue}.`;
    emit("horometer-updated", {
      id: item.id,
      horometro_actual: savedValue,
      fecha_ultima_lectura: updatedAt,
    });
  } catch (e: any) {
    state.horometerError = e?.response?.data?.message || "No se pudo actualizar el horómetro.";
    liveMessage.value = `No se pudo actualizar el horómetro de ${label}: ${state.horometerError}`;
  } finally {
    state.horometerSaving = false;
  }
}

function updateScrollState() {
  const el = scrollerRef.value;
  if (!el) return;
  canScrollPrev.value = el.scrollLeft > 4;
  canScrollNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

function scrollByStep(direction: number) {
  const el = scrollerRef.value;
  if (!el) return;
  const step = Math.min(480, el.clientWidth * 0.9) || 320;
  el.scrollBy({ left: direction * step, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

watch(
  () => props.equipos,
  (items) => {
    for (const item of items) {
      const key = String(item.id);
      const current = states[key];
      if (current?.saving || current?.horometerSaving) continue;
      states[key] = {
        value: normalizeFuncionamiento(item.estado_funcionamiento),
        saving: false,
        error: null,
        updatedAt: item.estado_funcionamiento_actualizado_en ?? null,
        horometerInput: formatHorometerInput(item.horometro_actual),
        savedHorometer: parseHorometer(item.horometro_actual),
        horometerSaving: false,
        horometerError: null,
        horometerUpdatedAt: item.fecha_ultima_lectura ?? null,
      };
    }
    nextTick(updateScrollState);
  },
  { immediate: true },
);

function handleResize() {
  updateScrollState();
}

onMounted(() => {
  nextTick(updateScrollState);
  window.addEventListener("resize", handleResize);

  if (typeof ResizeObserver !== "undefined" && scrollerRef.value) {
    resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(scrollerRef.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<style scoped>
.equipment-panel {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 20px;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.05), transparent 46%),
    var(--surface-base);
}

.equipment-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.equipment-panel__heading {
  display: flex;
  align-items: center;
  gap: 11px;
}

.equipment-panel__icon {
  display: grid;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.equipment-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.equipment-panel__readonly-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--app-muted-text);
  font-size: 0.72rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--surface-soft) 78%, transparent);
  border: 1px solid var(--surface-border);
}

.equipment-panel__scroll-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--app-muted-text);
  font-size: 0.72rem;
  font-weight: 600;
}

.equipment-panel__body {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}

.equipment-panel__nav {
  display: grid;
  flex: 0 0 auto;
  width: 36px;
  place-items: center;
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: var(--surface-base);
  cursor: pointer;
  transition: background 150ms ease, opacity 150ms ease;
}

.equipment-panel__nav:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.08);
}

.equipment-panel__nav:disabled {
  opacity: 0.35;
  cursor: default;
}

.equipment-panel__track {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 14px;
  min-height: 260px;
  padding: 4px 2px 14px;
  overflow-x: scroll;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  touch-action: pan-x pan-y;
  scrollbar-gutter: stable;
  scrollbar-width: auto;
  scrollbar-color: rgb(var(--v-theme-primary)) color-mix(in srgb, var(--surface-soft) 60%, transparent);
}

.equipment-panel__track:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-radius: 8px;
}

.equipment-panel__track::-webkit-scrollbar {
  height: 12px;
}

.equipment-panel__track::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--surface-soft) 60%, transparent);
  border-radius: 8px;
}

.equipment-panel__track::-webkit-scrollbar-thumb {
  background-color: rgb(var(--v-theme-primary));
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.equipment-panel__track::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-primary), 0.85);
}

.equipment-panel__empty {
  display: grid;
  width: 100%;
  padding: 22px;
  place-items: center;
  border: 1px dashed var(--surface-border);
  border-radius: 15px;
  background: color-mix(in srgb, var(--surface-soft) 74%, transparent);
  text-align: center;
}

.equipment-card {
  display: grid;
  flex: 0 0 auto;
  align-content: start;
  width: 280px;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-soft) 60%, transparent);
  scroll-snap-align: start;
}

.equipment-card--saving {
  opacity: 0.85;
}

.equipment-card__head {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.equipment-card__title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.equipment-card__code {
  margin-right: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.equipment-card__separator {
  margin-right: 5px;
  color: var(--app-muted-text);
  font-weight: 600;
}

.equipment-card__name {
  margin-right: 5px;
  color: var(--app-text);
  font-size: 0.92rem;
  font-weight: 700;
}

.equipment-card__model {
  color: var(--app-muted-text);
  font-size: 0.82rem;
  font-weight: 600;
}

.equipment-card__panel {
  display: grid;
  gap: 14px;
  padding: 14px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 13px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.78));
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.45);
}

.equipment-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.equipment-control__text {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.equipment-control__label {
  color: rgba(226, 232, 240, 0.62);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.equipment-control__value {
  overflow: hidden;
  color: #e2e8f0;
  font-size: 0.82rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equipment-control__value--state {
  font-size: 0.95rem;
  font-weight: 800;
}

/* Red operational indicator: rocker switch inset in a dark housing, read-only */
.equipment-rocker {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 22px;
  place-items: center;
  border-radius: 5px;
  background: linear-gradient(180deg, #1a1f29, #0c0f14);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
}

.equipment-rocker__lamp {
  width: 20px;
  height: 10px;
  border-radius: 2px;
  background: #3a1414;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.6);
}

.equipment-rocker--on .equipment-rocker__lamp {
  background: rgb(var(--v-theme-error));
  box-shadow: 0 0 6px 1px rgba(var(--v-theme-error), 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.25);
}

/* Green rotary lever: mechanical handle rotating on a bezel, with pilot light */
.equipment-lever {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 72px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.equipment-lever:disabled {
  cursor: default;
}

.equipment-lever:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
  border-radius: 10px;
}

.equipment-lever__svg {
  width: 54px;
  height: 72px;
  overflow: visible;
}

.equipment-lever__plate {
  fill: #232833;
  stroke: rgba(255, 255, 255, 0.14);
  stroke-width: 1;
}

.equipment-lever__pilot {
  fill: #3a1f14;
  stroke: rgba(0, 0, 0, 0.4);
  stroke-width: 1;
}

.equipment-lever--on .equipment-lever__pilot {
  fill: rgb(var(--v-theme-success));
  filter: drop-shadow(0 0 3px rgba(var(--v-theme-success), 0.9));
}

.equipment-lever__bezel {
  fill: #14171d;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1.5;
}

.equipment-lever__bezel-inner {
  fill: none;
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 2;
}

.equipment-lever__handle {
  transform-box: view-box;
  transform-origin: 36px 59px;
  transition: transform 180ms ease;
}

.equipment-lever__arm {
  fill: #cbd2dc;
  stroke: rgba(0, 0, 0, 0.35);
  stroke-width: 1;
}

.equipment-lever--on .equipment-lever__arm {
  fill: rgb(var(--v-theme-success));
}

.equipment-lever__knob {
  fill: #eef1f5;
  stroke: rgba(0, 0, 0, 0.4);
  stroke-width: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.equipment-lever--on .equipment-lever__knob {
  fill: rgb(var(--v-theme-success));
}

.equipment-lever__hub {
  fill: #0c0f14;
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 1;
}

.equipment-lever--readonly {
  opacity: 0.55;
}

.equipment-lever__spinner {
  position: absolute;
  inset: 0;
  margin: auto;
  color: #ffffff;
}

.equipment-card__timestamp {
  margin: 0;
  color: var(--app-muted-text);
  font-size: 0.7rem;
  font-weight: 600;
}

.equipment-card__horometer {
  display: grid;
  gap: 4px;
}

.equipment-card__horometer-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
}

.equipment-card__horometer-date {
  color: var(--app-muted-text);
  font-size: 0.67rem;
  font-weight: 600;
}

.equipment-card__error {
  margin: 0;
  color: rgb(var(--v-theme-error));
  font-size: 0.72rem;
  font-weight: 600;
}

.equipment-skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-soft) 65%, transparent);
}

.equipment-skeleton-line--sm {
  width: 40%;
}

.equipment-skeleton-line--lg {
  width: 80%;
  height: 16px;
}

.equipment-panel__sr-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .equipment-lever__handle {
    transition: none;
  }
}

@media (max-width: 600px) {
  .equipment-panel {
    padding: 16px;
  }

  .equipment-panel__track {
    scroll-snap-type: x mandatory;
  }

  .equipment-card {
    width: auto;
    flex: 0 0 calc(100% - 4px);
  }
}
</style>

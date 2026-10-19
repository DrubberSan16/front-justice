<template>
  <div v-if="allowed" class="twin-workspace">
    <header class="twin-heading">
      <div>
        <div class="eyebrow">INGENIERÍA DE ACTIVOS</div>
        <h1>Gemelo digital</h1>
        <p>Estado del activo, trazabilidad y escenarios de operación.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openForm()"
        >Vincular equipo</v-btn
      >
    </header>
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="error = ''"
      >{{ error }}</v-alert
    >
    <div class="twin-layout">
      <aside class="twin-fleet">
        <div class="fleet-heading">
          <h2>Activos vinculados</h2>
          <span>{{ total }}</span>
        </div>
        <v-text-field
          v-model="search"
          label="Buscar activo"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          @update:model-value="scheduleSearch"
        />
        <v-progress-linear
          v-if="busy"
          indeterminate
          color="primary"
          class="mt-2"
        />
        <nav aria-label="Activos vinculados" class="fleet-list">
          <button
            v-for="asset in assets"
            :key="asset.id"
            type="button"
            class="fleet-item"
            :class="{ 'fleet-item--active': asset.id === selectedId }"
            :aria-current="asset.id === selectedId ? 'true' : undefined"
            @click="
              selectedId = asset.id;
              tab = 'state';
            "
          >
            <small>{{ asset.equipment_code || asset.code }}</small
            ><strong>{{ asset.name }}</strong>
            <span>{{
              asset.equipment_name || "Equipo pendiente de vinculación"
            }}</span>
            <span class="fleet-condition"
              ><i :class="tone(asset.condition?.status)" />{{
                asset.condition
                  ? conditionLabel(asset.condition.status)
                  : "Sin captura"
              }}<small>Última captura</small></span
            >
          </button>
        </nav>
        <p v-if="!busy && !assets.length" class="text-body-2 my-5">
          {{
            search
              ? "No hay activos que coincidan con la búsqueda."
              : "Vincula un equipo para consultar su representación digital."
          }}
        </p>
        <v-pagination
          v-if="pages > 1"
          v-model="page"
          :length="pages"
          :total-visible="3"
          density="compact"
          @update:model-value="loadAssets"
        />
      </aside>
      <main class="twin-content">
        <div v-if="selectedId" class="twin-toolbar">
          <div class="text-caption">
            {{ historical ? "CAPTURA HISTÓRICA" : "CONSULTA ACTUAL"
            }}<span v-if="display"> · {{ formatDateTime(display.as_of) }}</span>
          </div>
          <div class="toolbar-actions">
            <v-btn
              size="small"
              variant="text"
              :loading="reading"
              :disabled="!!historical"
              prepend-icon="mdi-refresh"
              @click="loadState"
              >Actualizar</v-btn
            >
            <v-btn
              size="small"
              variant="tonal"
              :loading="saving"
              :disabled="!!historical || !state"
              prepend-icon="mdi-camera-outline"
              @click="capture"
              >Guardar captura</v-btn
            >
            <v-btn
              size="small"
              variant="text"
              icon="mdi-pencil-outline"
              aria-label="Editar activo vinculado"
              @click="openForm(selected)"
            />
          </div>
        </div>
        <v-alert v-if="historical" type="info" variant="tonal" class="mb-4"
          >Estás consultando una captura guardada.
          <v-btn variant="text" size="small" @click="historical = null"
            >Volver al estado actual</v-btn
          ></v-alert
        >
        <v-skeleton-loader v-if="reading && !display" type="card,article" />
        <template v-else-if="display">
          <section class="asset-identity">
            <div class="asset-symbol" aria-hidden="true">
              <v-icon icon="mdi-engine-outline" size="44" />
            </div>
            <div class="asset-description">
              <div class="eyebrow">
                {{ display.identity.brand || "Marca sin registrar" }} ·
                {{ display.identity.code }}
              </div>
              <h2>
                {{ display.identity.operational_name || display.identity.name }}
              </h2>
              <p>
                {{ display.identity.name }} ·
                {{ display.identity.model || "Modelo sin registrar" }} · Serie
                {{ display.identity.serie || "sin registrar" }}
              </p>
              <p class="text-caption">
                {{ display.identity.location || "Ubicación sin registrar" }} ·
                {{ display.identity.central || "Central sin registrar" }}
              </p>
            </div>
            <v-chip :color="tone(display.condition.status)" variant="tonal">{{
              conditionLabel(display.condition.status)
            }}</v-chip>
          </section>
          <div class="twin-metrics">
            <article>
              <small>Funcionamiento registrado</small
              ><strong>{{
                display.operation.running === "FUNCIONAMIENTO"
                  ? "En marcha"
                  : display.operation.running === "PARADO"
                    ? "Detenido"
                    : "Sin registrar"
              }}</strong
              ><span
                >{{ display.operation.status }} ·
                {{ formatDateTime(display.operation.since) }}</span
              >
            </article>
            <article>
              <small>Horómetro del último MPG</small
              ><strong
                >{{ num(display.technical?.mpg.horometer ?? null) }}
                <em>h</em></strong
              ><span>{{
                display.technical?.mpg.code || "Sin MPG verificable"
              }}</span>
            </article>
            <article>
              <small>Horómetro automático actual</small
              ><strong>{{ num(display.horometer.estimated) }} <em>h</em></strong
              ><span>{{
                display.horometer.calculated
                  ? "Avance automático en funcionamiento"
                  : "Contador detenido o sin reloj activo"
              }}</span>
            </article>
            <article>
              <small>Distancia al próximo MPG</small
              ><strong
                >{{
                  display.maintenance ? num(display.maintenance.remaining) : "—"
                }}
                <em>h</em></strong
              ><span>{{
                display.maintenance
                  ? display.maintenance.reliable
                    ? "Referencia MPG registrada"
                    : "Referencia estimada"
                  : "Sin frecuencia por horas"
              }}</span>
            </article>
          </div>
          <v-tabs
            v-model="tab"
            color="primary"
            class="workspace-tabs"
            show-arrows
            ><v-tab value="state">Estado y fuentes</v-tab
            ><v-tab value="structure">Estructura</v-tab
            ><v-tab value="technical">Análisis técnico</v-tab
            ><v-tab value="events">Eventos</v-tab
            ><v-tab value="history">Capturas</v-tab
            ><v-tab value="simulation">Simulación</v-tab></v-tabs
          >
          <section class="twin-panel">
            <template v-if="tab === 'state'">
              <div class="state-columns">
                <div>
                  <h3 class="panel-title">Condición observada</h3>
                  <p class="text-body-2 mb-4">{{ display.condition.basis }}</p>
                  <v-alert
                    :type="
                      display.condition.status === 'CRITICO'
                        ? 'error'
                        : display.condition.status === 'ATENCION'
                          ? 'warning'
                          : 'info'
                    "
                    variant="tonal"
                    class="mb-4"
                  >
                    <ul
                      v-if="display.condition.reasons.length"
                      class="reason-list"
                    >
                      <li
                        v-for="reason in display.condition.reasons"
                        :key="reason"
                      >
                        {{ reason }}
                      </li>
                    </ul>
                    <span v-else>{{
                      display.condition.status === "SIN_DATOS"
                        ? "La evidencia disponible no permite determinar una condición completa."
                        : "Sin hallazgos en las reglas y fuentes consultadas."
                    }}</span>
                  </v-alert>
                  <h3 class="panel-title">Próximo mantenimiento por horas</h3>
                  <template v-if="display.maintenance"
                    ><dl class="asset-facts">
                      <div>
                        <dt>Objetivo</dt>
                        <dd>{{ num(display.maintenance.target) }} h</dd>
                      </div>
                      <div>
                        <dt>Frecuencia</dt>
                        <dd>{{ num(display.maintenance.interval) }} h</dd>
                      </div>
                      <div>
                        <dt>Servicio de referencia</dt>
                        <dd>
                          {{
                            display.maintenance.service_code ||
                            "Sin servicio válido"
                          }}
                        </dd>
                      </div>
                    </dl>
                    <p class="text-caption mt-3">
                      {{ display.maintenance.explanation }}
                    </p></template
                  >
                  <p v-else class="text-body-2">
                    Configura una frecuencia por horas y verifica el horómetro
                    del equipo para habilitar la proyección MPG.
                  </p>
                  <v-alert
                    v-if="display.horometer.clock_issue"
                    type="warning"
                    variant="tonal"
                    class="mt-4"
                    >{{ display.horometer.clock_issue }}</v-alert
                  >
                  <h3 class="panel-title mt-6">
                    Último análisis de lubricante consultado
                  </h3>
                  <p v-if="display.oil[0]" class="text-body-2">
                    {{ display.oil[0].codigo }} ·
                    {{ display.oil[0].compartimento_principal }} ·
                    {{ display.oil[0].estado_diagnostico }}<br />{{
                      formatDateTime(display.oil[0].fecha_reporte)
                    }}<br />{{ display.oil[0].diagnostico }}
                  </p>
                  <p v-else class="text-body-2">
                    Sin análisis disponibles en la consulta.
                  </p>
                </div>
                <div>
                  <h3 class="panel-title">Origen y vigencia de los datos</h3>
                  <p class="text-body-2 mb-4">
                    Fuentes del activo con cantidades, referencias de
                    mantenimiento y fechas de los eventos o muestras
                    correspondientes.
                  </p>
                  <div
                    v-for="source in display.quality"
                    :key="source.key"
                    class="source-row"
                  >
                    <div>
                      <strong>{{ source.label }}</strong
                      ><span v-if="source.detail">{{ source.detail }}</span>
                      <span v-if="source.latest_at" class="d-block mt-1">{{
                        formatDateTime(source.latest_at)
                      }}</span>
                    </div>
                    <v-chip
                      size="x-small"
                      :color="
                        source.status === 'NO_DISPONIBLE'
                          ? 'error'
                          : source.status === 'INCOMPLETA' || source.stale
                            ? 'warning'
                            : 'secondary'
                      "
                      variant="tonal"
                      >{{
                        source.status === "NO_DISPONIBLE"
                          ? "No disponible"
                          : source.status === "INCOMPLETA"
                            ? "Por completar"
                            : source.stale
                              ? "Revisar vigencia"
                              : source.status === "SIN_REGISTROS"
                                ? "Sin registros"
                                : "Disponible"
                      }}</v-chip
                    >
                  </div>
                  <div class="source-limits">
                    <v-icon icon="mdi-database-outline" size="18" />
                    <div>
                      <strong>{{ display.connection.label }}</strong>
                      <ul>
                        <li v-for="limit in display.limits" :key="limit">
                          {{ limit }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <v-card
                variant="tonal"
                color="primary"
                rounded="lg"
                class="pa-5 mt-6"
              >
                <h3 class="text-subtitle-1">Cruce técnico por compartición</h3>
                <p class="text-body-2 mt-2 mb-4">
                  Ficha del equipo, último MPG, mantenimiento ejecutado y
                  análisis de lubricante vinculados a cada compartición.
                </p>
                <v-btn
                  variant="outlined"
                  prepend-icon="mdi-text-box-search-outline"
                  @click="tab = 'technical'"
                  >Ver análisis técnico</v-btn
                >
              </v-card>
            </template>
            <TwinStructure v-else-if="tab === 'structure'" :state="display" />
            <TwinTechnicalPanel
              v-else-if="tab === 'technical'"
              :state="display"
              :analysis="historical ? null : analysis"
              :busy="analysisBusy"
              :historical="!!historical"
              @analyze="analyze"
            />
            <TwinEventTimeline
              v-else-if="tab === 'events'"
              :events="display.events"
            />
            <template v-else-if="tab === 'history'"
              ><h3 class="panel-title">Capturas conservadas</h3>
              <p class="text-body-2 mb-4">
                Cada captura conserva la identidad, la estructura, el estado y
                las fuentes consultadas en ese momento. Se muestran las últimas
                100.
              </p>
              <p v-if="!history.length" class="text-body-2">
                Todavía no hay capturas. Guarda una desde el estado actual para
                iniciar el seguimiento.
              </p>
              <v-table v-else class="readable-table"
                ><thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Condición</th>
                    <th>Horómetro de referencia</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in history" :key="record.id">
                    <td>{{ formatDateTime(record.recorded_at) }}</td>
                    <td>{{ conditionLabel(record.condition.status) }}</td>
                    <td>{{ num(record.horometer.estimated) }} h</td>
                    <td>
                      <v-btn
                        size="small"
                        variant="text"
                        @click="
                          openCapture(record.id);
                          tab = 'state';
                        "
                        >Consultar captura</v-btn
                      >
                    </td>
                  </tr>
                </tbody></v-table
              >
            </template>
            <TwinSimulation
              v-else-if="tab === 'simulation'"
              :state="display"
              :result="simulation"
              :busy="saving"
              :disabled="!!historical || display.horometer.estimated === null"
              @simulate="simulate"
            />
          </section>
          <footer class="twin-footer">
            {{
              historical
                ? "Vista conservada; no se actualiza automáticamente."
                : "Consulta automática cada 60 segundos mientras la página está visible."
            }}
            · Los escenarios y las capturas no cambian el equipo.
          </footer>
        </template>
        <v-card v-else-if="!reading" variant="flat" class="empty-twin"
          ><v-icon icon="mdi-vector-link" size="54" color="primary" />
          <h2>
            {{ selectedId ? "Estado no disponible" : "Selecciona un activo" }}
          </h2>
          <p>
            {{
              selectedId
                ? "Revisa el mensaje de la consulta o vincula un equipo válido al modelo."
                : "Vincula un equipo para reunir su estado, estructura e historial."
            }}
          </p>
          <v-btn
            v-if="selectedId"
            variant="tonal"
            class="mt-4"
            @click="openForm(selected)"
            >Revisar vínculo</v-btn
          ></v-card
        >
      </main>
    </div>
    <v-dialog v-model="formOpen" max-width="620"
      ><v-card rounded="xl"
        ><v-card-title>{{
          editId ? "Editar vínculo" : "Vincular equipo real"
        }}</v-card-title
        ><v-card-text>
          <v-text-field
            v-model="assetName"
            label="Nombre del modelo"
            maxlength="160"
            variant="outlined"
          />
          <v-autocomplete
            v-model="equipmentId"
            :items="options"
            item-value="id"
            :item-title="equipmentTitle"
            label="Equipo"
            class="equipment-link-selector mt-3"
            hint="Marca · UG / nombre operativo · modelo · código y serie"
            persistent-hint
            :disabled="!!editId && !!selected?.equipment_id"
            variant="outlined"
            :loading="optionsBusy"
            @update:search="searchEquipment"
            no-filter
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" class="py-3">
                <template #title
                  ><div class="text-body-2 font-weight-medium text-wrap">
                    {{ buildEquipmentDisplayTitle(item.raw) }} ·
                    {{ item.raw.codigo }}
                  </div></template
                >
                <template #subtitle
                  ><div class="text-caption text-wrap mt-2">
                    {{ item.raw.nombre_real || "Equipo" }} · Serie
                    {{ item.raw.serie || "sin registrar" }}
                  </div></template
                >
              </v-list-item>
            </template>
          </v-autocomplete>
          <p class="text-caption mt-5">
            La identidad, la serie y las comparticiones se consultan desde
            Equipos. El historial conserva el vínculo con el mismo activo
            físico.
          </p>
          <v-btn
            v-if="editId"
            color="error"
            variant="text"
            class="mt-4"
            @click="archiveOpen = true"
            >Archivar modelo</v-btn
          > </v-card-text
        ><v-card-actions
          ><v-spacer /><v-btn @click="formOpen = false">Cancelar</v-btn
          ><v-btn
            color="primary"
            :disabled="!assetName.trim() || !equipmentId"
            :loading="saving"
            @click="submitForm"
            >Guardar</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
    <v-dialog v-model="archiveOpen" max-width="440"
      ><v-card title="Archivar modelo"
        ><v-card-text
          >El modelo dejará de aparecer en la lista activa. Sus capturas se
          conservan y el equipo sigue disponible en Equipos.</v-card-text
        ><v-card-actions
          ><v-spacer /><v-btn @click="archiveOpen = false">Cancelar</v-btn
          ><v-btn color="error" :loading="saving" @click="confirmArchive"
            >Archivar</v-btn
          ></v-card-actions
        ></v-card
      ></v-dialog
    >
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useAuthStore } from "@/app/stores/auth.store";
import { canAccessDigitalTwins } from "@/app/utils/role-access";
import { formatDateTime } from "@/app/utils/date-time";
import { useDigitalTwin } from "@/app/composables/useDigitalTwin";
import type {
  TwinAsset,
  TwinEquipmentOption,
} from "@/app/types/digital-twin.types";
import TwinStructure from "@/components/digital-twin/TwinStructure.vue";
import TwinSimulation from "@/components/digital-twin/TwinSimulation.vue";
import TwinEventTimeline from "@/components/digital-twin/TwinEventTimeline.vue";
import TwinTechnicalPanel from "@/components/digital-twin/TwinTechnicalPanel.vue";
import { buildEquipmentDisplayTitle } from "@/app/utils/equipment-display";
const auth = useAuthStore(),
  allowed = computed(() => canAccessDigitalTwins(auth.user));
const {
  assets,
  analysis,
  analysisBusy,
  analyze,
  selectedId,
  selected,
  search,
  page,
  pages,
  total,
  state,
  history,
  simulation,
  historical,
  busy,
  reading,
  saving,
  error,
  loadAssets,
  loadState,
  capture,
  openCapture,
  simulate,
  equipmentOptions,
  saveAsset,
  archiveAsset,
} = useDigitalTwin(() => allowed.value);
const display = computed(() => historical.value || state.value),
  tab = ref("state");
const formOpen = ref(false),
  archiveOpen = ref(false),
  editId = ref(""),
  assetName = ref(""),
  equipmentId = ref(""),
  options = ref<TwinEquipmentOption[]>([]),
  optionsBusy = ref(false);
const num = (v: number | null) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(v);
const conditionLabel = (value?: string) =>
  ({
    CRITICO: "Crítico",
    ATENCION: "Requiere atención",
    SIN_HALLAZGOS: "Sin hallazgos",
    SIN_DATOS: "Datos insuficientes",
  })[value || ""] || "Sin evaluar";
const tone = (value?: string) =>
  value === "CRITICO"
    ? "error"
    : value === "ATENCION"
      ? "warning"
      : value === "SIN_HALLAZGOS"
        ? "success"
        : "secondary";
const equipmentTitle = (e: TwinEquipmentOption | string | null) =>
  e && typeof e === "object" && e.codigo
    ? `${buildEquipmentDisplayTitle(e)} · ${e.codigo}${e.serie ? ` · Serie ${e.serie}` : ""}`
    : typeof e === "string"
      ? e
      : "";
let searchTimer: ReturnType<typeof setTimeout>,
  equipmentTimer: ReturnType<typeof setTimeout>,
  optionSequence = 0;
function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void loadAssets();
  }, 300);
}
function searchEquipment(term: string) {
  clearTimeout(equipmentTimer);
  equipmentTimer = setTimeout(() => void loadEquipment(term), 300);
}
async function loadEquipment(term = "") {
  const seq = ++optionSequence;
  optionsBusy.value = true;
  try {
    const rows = await equipmentOptions(term);
    if (seq === optionSequence) options.value = rows;
  } catch {
    error.value = "No se pudo consultar el catálogo de equipos.";
  } finally {
    if (seq === optionSequence) optionsBusy.value = false;
  }
}
async function openForm(asset?: TwinAsset) {
  editId.value = asset?.id || "";
  assetName.value = asset?.name || "";
  equipmentId.value = asset?.equipment_id || "";
  formOpen.value = true;
  await loadEquipment(asset?.equipment_code || "");
}
async function submitForm() {
  if (
    await saveAsset(
      assetName.value,
      equipmentId.value,
      editId.value || undefined,
    )
  )
    formOpen.value = false;
}
async function confirmArchive() {
  if (await archiveAsset()) {
    archiveOpen.value = false;
    formOpen.value = false;
  }
}
onMounted(() => {
  if (allowed.value) void loadAssets();
});
onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  clearTimeout(equipmentTimer);
  optionSequence++;
});
</script>
<style scoped>
.twin-workspace {
  color: rgb(var(--v-theme-on-surface));
  padding: 8px 0 24px;
}
.twin-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 6px;
}
.twin-heading h1 {
  font-size: 28px;
  letter-spacing: -0.7px;
}
.twin-heading p {
  font-size: 14px;
  opacity: 0.7;
  margin-top: 4px;
}
.twin-layout {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.twin-fleet,
.twin-content {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 18px;
  min-width: 0;
}
.twin-fleet {
  padding: 18px;
}
.fleet-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.fleet-heading h2 {
  font-size: 14px;
}
.fleet-heading > span {
  font-size: 12px;
  padding: 3px 9px;
  border-radius: 20px;
  background: rgba(var(--v-theme-primary), 0.08);
}
.fleet-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}
.fleet-item {
  display: grid;
  gap: 5px;
  text-align: left;
  width: 100%;
  padding: 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: inherit;
  overflow-wrap: anywhere;
}
.fleet-item--active {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.055);
}
.fleet-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
.fleet-item:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.fleet-item > small {
  color: rgb(var(--v-theme-primary));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.fleet-item > strong {
  font-size: 14px;
}
.fleet-item > span {
  font-size: 11px;
  opacity: 0.8;
}
.fleet-condition {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.fleet-condition small {
  font-size: 9px;
  width: 100%;
  opacity: 0.7;
  padding-left: 12px;
}
.fleet-condition i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-secondary));
}
.fleet-condition .error {
  background: rgb(var(--v-theme-error));
}
.fleet-condition .warning {
  background: rgb(var(--v-theme-warning));
}
.fleet-condition .success {
  background: rgb(var(--v-theme-success));
}
.twin-content {
  padding: 24px;
}
.twin-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  max-width: 100%;
}
.asset-identity {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 26px;
  flex-wrap: wrap;
}
.asset-symbol {
  background: rgba(var(--v-theme-primary), 0.07);
  color: rgb(var(--v-theme-primary));
  padding: 20px;
  border-radius: 18px;
}
.asset-description {
  flex: 1;
  min-width: 180px;
  overflow-wrap: anywhere;
}
.asset-description h2 {
  font-size: 22px;
  line-height: 1.3;
  margin-bottom: 8px;
}
.asset-description p {
  font-size: 13px;
  opacity: 0.75;
}
.twin-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}
.twin-metrics article {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-wrap: anywhere;
}
.twin-metrics small {
  font-size: 11px;
  opacity: 0.7;
}
.twin-metrics strong {
  font-size: 21px;
  line-height: 1.2;
}
.twin-metrics em {
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}
.twin-metrics span {
  font-size: 10px;
  opacity: 0.7;
}
.workspace-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.twin-panel {
  padding-top: 24px;
  min-height: 350px;
}
.equipment-link-selector :deep(.v-autocomplete__selection),
.equipment-link-selector :deep(.v-autocomplete__selection-text) {
  white-space: normal;
  overflow-wrap: anywhere;
}
.asset-description p + p {
  margin-top: 10px;
}
.state-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 30px;
}
.panel-title {
  font-size: 15px;
  margin-bottom: 12px;
}
.asset-facts {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.asset-facts dt {
  font-size: 11px;
  opacity: 0.7;
}
.asset-facts dd {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.source-row {
  padding: 13px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}
.source-row strong {
  display: block;
  font-size: 12px;
  font-weight: 500;
}
.source-row span {
  font-size: 10px;
  opacity: 0.7;
}
.source-limits {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding: 15px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.04);
}
.source-limits strong {
  font-size: 12px;
}
.source-limits ul,
.reason-list {
  padding-left: 18px;
}
.source-limits li {
  font-size: 11px;
  opacity: 0.75;
  line-height: 1.6;
}
.reason-list li {
  font-size: 13px;
}
.readable-table :deep(td) {
  white-space: normal !important;
  overflow-wrap: anywhere;
  min-width: 100px;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  font-size: 12px;
}
.readable-table :deep(th) {
  font-size: 11px;
}
.twin-footer {
  font-size: 10px;
  opacity: 0.65;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin-top: 28px;
  padding-top: 15px;
}
.empty-twin {
  text-align: center;
  padding: 80px 24px;
}
.empty-twin h2 {
  font-size: 20px;
  margin: 16px 0 8px;
}
.empty-twin p {
  font-size: 14px;
  opacity: 0.7;
}
@media (max-width: 1200px) {
  .twin-layout {
    grid-template-columns: 235px minmax(0, 1fr);
  }
  .twin-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .state-columns {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .twin-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .twin-layout {
    grid-template-columns: 1fr;
  }
  .fleet-list {
    display: flex;
    overflow-x: auto;
    padding-bottom: 8px;
  }
  .fleet-item {
    min-width: 220px;
    max-width: 260px;
  }
  .twin-content {
    padding: 16px;
  }
  .asset-symbol {
    display: none;
  }
  .asset-description h2 {
    font-size: 20px;
  }
  .twin-metrics article {
    padding: 12px;
  }
  .twin-metrics strong {
    font-size: 18px;
  }
}
</style>

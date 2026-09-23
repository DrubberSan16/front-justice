<template>
  <v-btn variant="tonal" prepend-icon="mdi-layers-triple-outline" @click="openDialog">
    Costeo FIFO
  </v-btn>

  <v-dialog v-model="open" max-width="620" scrollable>
    <v-card rounded="xl" class="enterprise-surface">
      <v-card-title class="d-flex align-center justify-space-between pt-4 px-5">
        <div>
          <div class="text-overline text-medium-emphasis">Metodo de costeo</div>
          <div class="text-h6">Costeo FIFO del inventario</div>
        </div>
        <v-btn icon="mdi-close" variant="text" density="comfortable" aria-label="Cerrar" @click="open = false" />
      </v-card-title>

      <v-card-text class="px-5">
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

        <v-alert v-else-if="!status?.activo" type="info" variant="tonal" density="comfortable">
          El costeo FIFO todavia no esta activo en esta base.
        </v-alert>

        <template v-else>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Cada salida consume primero el material mas antiguo de su bodega. Cerrar un mes lo congela: ya no se
            aceptan movimientos con fecha dentro de el y su costo queda definitivo.
          </p>

          <div class="fifo-facts">
            <div class="fifo-fact">
              <span>Vigente desde</span>
              <strong>{{ corteLabel }}</strong>
            </div>
            <div class="fifo-fact">
              <span>Abierto desde</span>
              <strong>{{ openFromLabel }}</strong>
            </div>
            <div class="fifo-fact">
              <span>Materiales por costear</span>
              <strong :class="{ 'text-error': pendingErrors > 0 }">
                {{ status.pendientes }}<template v-if="pendingErrors"> ({{ pendingErrors }} con error)</template>
              </strong>
            </div>
          </div>

          <template v-if="status.total_alertas">
            <div class="text-subtitle-2 mt-5 mb-1">Para revisar ({{ status.total_alertas }})</div>
            <p class="text-body-2 text-medium-emphasis mb-2">
              Salidas que no encontraron capa y se costearon al ultimo costo conocido, o capas que no suman lo mismo
              que el stock. No bloquean la operacion.
            </p>
            <v-table density="compact" class="fifo-alerts">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Bodega</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(alerta, index) in status.alertas" :key="index">
                  <td>{{ alerta.material }}</td>
                  <td>{{ alerta.bodega }}</td>
                  <td>{{ alerta.detalle }}</td>
                </tr>
              </tbody>
            </v-table>
          </template>

          <div class="text-subtitle-2 mt-5 mb-2">Meses cerrados</div>
          <v-table v-if="status.cierres?.length" density="compact">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Cerrado el</th>
                <th>Por</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cierre in status.cierres" :key="cierre.id">
                <td>{{ formatPeriod(cierre.periodo) }}</td>
                <td>{{ formatStamp(cierre.created_at) }}</td>
                <td>{{ cierre.created_by || "-" }}</td>
              </tr>
            </tbody>
          </v-table>
          <div v-else class="text-body-2 text-medium-emphasis">Aun no se ha cerrado ningun mes.</div>

          <v-divider class="my-5" />

          <div class="text-subtitle-2 mb-2">Cerrar un mes</div>
          <div v-if="closableMonths.length" class="d-flex flex-wrap align-center" style="gap: 12px">
            <v-select v-model="selectedPeriod" :items="closableMonths" item-title="title" item-value="value"
              label="Mes" variant="outlined" density="compact" hide-details style="max-width: 240px" />
            <v-btn color="primary" prepend-icon="mdi-lock-outline" :loading="closing" :disabled="!selectedPeriod"
              @click="confirmOpen = true">
              Cerrar mes
            </v-btn>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis">{{ noClosableMessage }}</div>
        </template>
      </v-card-text>

      <v-card-actions class="px-5 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="confirmOpen" max-width="460">
    <v-card rounded="xl">
      <v-card-title class="pt-4 px-5">Cerrar {{ selectedLabel }}</v-card-title>
      <v-card-text class="px-5 text-body-2">
        Desde ahora no se podra registrar ni reactivar ningun movimiento de inventario con fecha de {{ selectedLabel }}
        o anterior. Una anulacion posterior entrara con la fecha del dia en que se haga. Esta accion no se deshace.
      </v-card-text>
      <v-card-actions class="px-5 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="confirmOpen = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="closing" @click="closeMonth">Cerrar el mes</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";

type FifoStatus = {
  activo: boolean;
  corte: { fecha_limite: string; created_at: string } | null;
  cierres: Array<{ id: string; periodo: string; fecha_limite: string; created_at: string; created_by?: string }>;
  pendientes: number;
  pendientes_con_error?: number;
  alertas?: Array<{ tipo: string; detalle: string; material: string; bodega: string }>;
  total_alertas?: number;
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const ui = useUiStore();
const open = ref(false);
const confirmOpen = ref(false);
const loading = ref(false);
const closing = ref(false);
const status = ref<FifoStatus | null>(null);
const selectedPeriod = ref<string | null>(null);

const pendingErrors = computed(() => Number(status.value?.pendientes_con_error ?? 0));

function parseYearMonth(value: string): [number, number] {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

function formatPeriod(periodo?: string | null) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(periodo ?? ""));
  if (!match) return periodo || "-";
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function formatStamp(value?: string | null) {
  // La API entrega "2026-09-23T07:19:06" o "2026-09-23 07:19:06".
  const raw = String(value ?? "").replace("T", " ");
  if (!raw) return "-";
  const [date, time = ""] = raw.split(" ");
  const [year, month, day] = (date ?? "").split("-");
  return `${day}/${month}/${year} ${time.slice(0, 5)}`.trim();
}

// El limite vigente es el primer dia del mes siguiente al ultimo cerrado; con
// solo el corte, es el dia en que empezo a regir.
const currentLimit = computed(() => {
  const limits = [
    status.value?.corte?.fecha_limite,
    ...(status.value?.cierres ?? []).map((row) => row.fecha_limite),
  ].filter((value): value is string => Boolean(value));
  return limits.sort().pop() ?? "";
});

const corteLabel = computed(() => formatStamp(status.value?.corte?.created_at));
const openFromLabel = computed(() => formatStamp(currentLimit.value).slice(0, 10));

const closableMonths = computed(() => {
  if (!currentLimit.value) return [];
  const [limitYear, limitMonth] = parseYearMonth(currentLimit.value);
  if (!limitYear) return [];
  const now = new Date();
  const options: Array<{ title: string; value: string }> = [];
  // Se puede cerrar desde el mes del limite vigente hasta el ultimo mes ya
  // terminado.
  let year = limitYear;
  let month = limitMonth;
  while (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    const value = `${year}-${String(month).padStart(2, "0")}`;
    const nextLimit = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`;
    if (nextLimit > currentLimit.value.slice(0, 10)) options.push({ title: formatPeriod(value), value });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return options;
});

const noClosableMessage = computed(() => {
  if (!currentLimit.value) return "";
  const [year, month] = parseYearMonth(currentLimit.value);
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return `El proximo mes que se podra cerrar es ${formatPeriod(`${year}-${String(month).padStart(2, "0")}`)}, a partir del 01/${next.slice(5)}/${next.slice(0, 4)}.`;
});

const selectedLabel = computed(() => formatPeriod(selectedPeriod.value));

async function loadStatus() {
  loading.value = true;
  try {
    const { data } = await api.get("/kpi_inventory/kardex/fifo/estado");
    status.value = (data?.data ?? data) as FifoStatus;
    selectedPeriod.value = closableMonths.value[0]?.value ?? null;
  } catch (error: any) {
    ui.error(error?.response?.data?.message || error?.message || "No se pudo leer el estado del costeo FIFO.");
  } finally {
    loading.value = false;
  }
}

function openDialog() {
  open.value = true;
  void loadStatus();
}

async function closeMonth() {
  if (!selectedPeriod.value) return;
  closing.value = true;
  try {
    await api.post("/kpi_inventory/kardex/fifo/cierres", { periodo: selectedPeriod.value });
    ui.success(`Inventario de ${selectedLabel.value} cerrado.`);
    confirmOpen.value = false;
    await loadStatus();
  } catch (error: any) {
    ui.error(error?.response?.data?.message || error?.message || "No se pudo cerrar el mes.");
  } finally {
    closing.value = false;
  }
}
</script>

<style scoped>
.fifo-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.fifo-fact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--surface-border);
  border-radius: 12px;
}

.fifo-alerts {
  max-height: 240px;
  overflow-y: auto;
}

.fifo-fact span {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>

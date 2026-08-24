<template>
  <v-row dense>
    <v-col v-if="!canRead" cols="12">
      <v-alert type="warning" variant="tonal">No tienes permisos para visualizar este modulo.</v-alert>
    </v-col>

    <template v-else>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface">
          <div class="d-flex align-start justify-space-between flex-wrap mb-4" style="gap:16px">
            <div>
              <div class="text-h5 font-weight-bold">Reservas de bodega</div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Consulta de solo lectura de las reservas de material por bodega y la orden de trabajo
                asociada. Este módulo no permite crear, editar ni liberar reservas manualmente.
              </div>
            </div>
            <div class="d-flex align-center flex-wrap justify-end" style="gap:8px">
              <v-btn
                variant="tonal"
                prepend-icon="mdi-file-excel"
                :loading="exportingExcel"
                @click="exportReservations('excel')"
              >
                Excel
              </v-btn>
              <v-btn
                variant="tonal"
                prepend-icon="mdi-file-pdf-box"
                :loading="exportingPdf"
                @click="exportReservations('pdf')"
              >
                PDF
              </v-btn>
              <v-btn
                color="primary"
                prepend-icon="mdi-refresh"
                :loading="loading"
                @click="loadReservations"
              >
                Actualizar
              </v-btn>
            </div>
          </div>

          <v-row dense class="mb-3">
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filters.search"
                label="Material, bodega, OT o equipo"
                variant="outlined"
                prepend-inner-icon="mdi-magnify"
                hide-details
                clearable
                @keyup.enter="applyFilters"
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="filters.bodega_id"
                :items="warehouseOptions"
                item-title="title"
                item-value="value"
                label="Bodega"
                variant="outlined"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-autocomplete
                v-model="filters.work_order_id"
                :items="workOrderOptions"
                item-title="title"
                item-value="value"
                label="Orden de trabajo"
                variant="outlined"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6" md="2">
              <v-select
                v-model="filters.estado"
                :items="estadoOptions"
                item-title="title"
                item-value="value"
                label="Estado"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" class="d-flex justify-end" style="gap: 8px; flex-wrap: wrap;">
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-filter-outline"
                :loading="loading"
                @click="applyFilters"
              >
                Aplicar filtros
              </v-btn>
              <v-btn
                variant="text"
                prepend-icon="mdi-filter-off"
                :disabled="!hasActiveFilters"
                @click="resetFilters"
              >
                Limpiar
              </v-btn>
            </v-col>
          </v-row>

          <v-row dense class="mb-4">
            <v-col v-for="card in summaryCards" :key="card.key" cols="6" sm="4" md="2">
              <v-card rounded="lg" variant="tonal" class="pa-3 text-center">
                <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
                <div class="text-h6 font-weight-bold">{{ card.value }}</div>
              </v-card>
            </v-col>
          </v-row>

          <v-progress-linear v-if="loading" indeterminate color="primary" rounded class="mb-4" />
          <v-alert v-else-if="error" type="error" variant="tonal" density="comfortable" class="mb-4">
            {{ error }}
            <template #append>
              <v-btn size="small" variant="tonal" color="error" @click="loadReservations">
                Reintentar
              </v-btn>
            </template>
          </v-alert>
          <v-alert
            v-else-if="!items.length"
            type="info"
            variant="tonal"
            density="comfortable"
            class="mb-4"
          >
            No hay reservas de material para los filtros aplicados.
          </v-alert>

          <v-data-table
            v-if="!loading && !error && items.length"
            :headers="tableHeaders"
            :items="items"
            density="comfortable"
            class="table-enterprise enterprise-table"
            :items-per-page="10"
          >
            <template #item.estado="{ item }">
              <v-chip size="small" :color="estadoColor((item.raw ?? item).estado)" variant="tonal">
                {{ (item.raw ?? item).estado }}
              </v-chip>
            </template>
            <template #item.observacion_menor_uso_reserva="{ item }">
              {{ (item.raw ?? item).observacion_menor_uso_reserva || "-" }}
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </template>
  </v-row>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { formatDateForInput } from "@/app/utils/date-time";
import {
  buildWarehouseReservationsReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";

const ui = useUiStore();
const menuStore = useMenuStore();

const perms = computed(() => getPermissionsForComponent(menuStore.tree, "reservas-bodega"));
const canRead = computed(() => perms.value.isReaded);

const loading = ref(false);
const error = ref<string | null>(null);
const exportingExcel = ref(false);
const exportingPdf = ref(false);

const warehouses = ref<any[]>([]);
const workOrders = ref<any[]>([]);
const items = ref<any[]>([]);
const resumen = ref<Record<string, any>>({});

const ESTADO_ALL = "";
const estadoOptions = [
  { title: "Todos", value: ESTADO_ALL },
  { title: "Reservado", value: "RESERVADO" },
  { title: "Consumido", value: "CONSUMIDO" },
  { title: "Liberado", value: "LIBERADO" },
];

const filters = reactive({
  search: "",
  bodega_id: "",
  work_order_id: "",
  estado: ESTADO_ALL,
});

const warehouseOptions = computed(() =>
  warehouses.value.map((row: any) => ({
    value: row.id,
    title: [row.codigo, row.nombre].filter(Boolean).join(" - "),
  })),
);

const workOrderOptions = computed(() =>
  workOrders.value.map((row: any) => ({
    value: row.id,
    title: [row.code, row.title].filter(Boolean).join(" - "),
  })),
);

const hasActiveFilters = computed(
  () =>
    Boolean(filters.search) ||
    Boolean(filters.bodega_id) ||
    Boolean(filters.work_order_id) ||
    Boolean(filters.estado),
);

const summaryCards = computed(() => [
  { key: "total_registros", label: "Reservas listadas", value: resumen.value.total_registros ?? 0 },
  { key: "total_reservados", label: "Reservadas activas", value: resumen.value.total_reservados ?? 0 },
  { key: "total_consumidos", label: "Consumidas", value: resumen.value.total_consumidos ?? 0 },
  { key: "total_liberados", label: "Liberadas", value: resumen.value.total_liberados ?? 0 },
  {
    key: "total_cantidad_reservada_activa",
    label: "Cantidad reservada activa",
    value: formatNumberForDisplay(resumen.value.total_cantidad_reservada_activa ?? 0),
  },
  {
    key: "total_cantidad_pendiente",
    label: "Cantidad pendiente",
    value: formatNumberForDisplay(resumen.value.total_cantidad_pendiente ?? 0),
  },
]);

const tableHeaders = [
  { title: "Estado", key: "estado" },
  { title: "Bodega", key: "bodega_label" },
  { title: "Material", key: "producto_label" },
  { title: "Orden de trabajo", key: "work_order_label" },
  { title: "Equipo", key: "equipment_label" },
  { title: "Solicitado", key: "cantidad_solicitada" },
  { title: "Entregado", key: "cantidad_entregada" },
  { title: "Reservado activo", key: "cantidad_reservada_activa" },
  { title: "Pendiente", key: "cantidad_pendiente" },
  { title: "Liberado", key: "cantidad_liberada" },
  { title: "Motivo menor uso", key: "observacion_menor_uso_reserva" },
];

function estadoColor(estado: string) {
  if (estado === "RESERVADO") return "primary";
  if (estado === "CONSUMIDO") return "success";
  if (estado === "LIBERADO") return "secondary";
  return "default";
}

async function loadCatalogs() {
  try {
    const [warehouseRows, workOrderRows] = await Promise.all([
      listAllPages("/kpi_inventory/bodegas"),
      listAllPages("/kpi_maintenance/work-orders"),
    ]);
    warehouses.value = warehouseRows;
    workOrders.value = workOrderRows;
  } catch {
    // los catalogos solo alimentan los filtros; si fallan, el listado principal sigue funcionando
  }
}

async function loadReservations() {
  if (!canRead.value) return;
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/work-orders/reservations", {
      params: {
        bodega_id: filters.bodega_id || undefined,
        work_order_id: filters.work_order_id || undefined,
        estado: filters.estado || undefined,
        search: filters.search || undefined,
      },
    });
    const payload = data?.data ?? data ?? {};
    items.value = Array.isArray(payload.items) ? payload.items : [];
    resumen.value = payload.resumen ?? {};
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || "No se pudieron cargar las reservas de bodega.";
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  loadReservations();
}

function resetFilters() {
  filters.search = "";
  filters.bodega_id = "";
  filters.work_order_id = "";
  filters.estado = ESTADO_ALL;
  loadReservations();
}

async function exportReservations(format: "excel" | "pdf") {
  if (!items.value.length) {
    ui.open("No hay reservas con los filtros aplicados para exportar.", "info", 3500);
    return;
  }
  const stateRef = format === "excel" ? exportingExcel : exportingPdf;
  stateRef.value = true;
  try {
    const report = buildWarehouseReservationsReport({
      rows: items.value,
      fileName: `reservas_bodega_${formatDateForInput(new Date())}`,
      summary: [
        { label: "Reservas listadas", value: resumen.value.total_registros ?? 0 },
        { label: "Reservadas activas", value: resumen.value.total_reservados ?? 0 },
        { label: "Consumidas", value: resumen.value.total_consumidos ?? 0 },
        { label: "Liberadas", value: resumen.value.total_liberados ?? 0 },
      ],
    });
    if (format === "excel") await downloadReportExcel(report);
    else await downloadReportPdf(report);
  } catch (e: any) {
    ui.error(e?.message || "No se pudo generar el reporte de reservas de bodega.");
  } finally {
    stateRef.value = false;
  }
}

onMounted(async () => {
  if (!canRead.value) return;
  await Promise.all([loadCatalogs(), loadReservations()]);
});
</script>

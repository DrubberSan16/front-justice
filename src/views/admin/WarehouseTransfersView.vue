<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar este módulo.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Transferencias de bodega</div>
        <div class="text-body-2 text-medium-emphasis">
          Toma órdenes de compra emitidas, precarga sus materiales y genera la salida e ingreso en kardex.
        </div>
      </div>
      <div class="d-flex flex-wrap" style="gap: 8px;">
        <v-chip color="info" variant="tonal">
          {{ pendingOrders.length }} órdenes pendientes por transferir
        </v-chip>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="hydrateView">
          Recargar
        </v-btn>
        <v-btn
          v-if="canCreate"
          color="primary"
          prepend-icon="mdi-swap-horizontal"
          :disabled="!pendingOrders.length"
          @click="openCreate"
        >
          Nueva transferencia
        </v-btn>
      </div>
    </div>

    <v-data-table
      :headers="headers"
      :items="tableRows"
      :loading="loading"
      loading-text="Obteniendo transferencias de bodega..."
      :items-per-page="15"
      class="elevation-0 enterprise-table"
    >
      <template #item.estado="{ item }">
        <v-chip size="small" variant="tonal" color="success">
          {{ item.estado || "COMPLETADA" }}
        </v-chip>
      </template>
      <template #item.fecha_transferencia="{ item }">
        {{ formatDate(item.fecha_transferencia) }}
      </template>
      <template #item.total_cantidad="{ item }">
        {{ formatNumber(item.total_cantidad) }}
      </template>
    </v-data-table>
  </v-card>

  <v-dialog
    v-model="dialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1180"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Nueva transferencia de bodega
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="form.orden_compra_id"
              :items="pendingOrderOptions"
              item-title="title"
              item-value="value"
              label="Orden de compra pendiente"
              variant="outlined"
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.fecha_transferencia"
              type="date"
              label="Fecha de transferencia"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              :model-value="selectedOrder?.proveedor_nombre || ''"
              label="Proveedor"
              variant="outlined"
              readonly
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              :model-value="selectedOrder?.bodega_label || ''"
              label="Bodega origen"
              variant="outlined"
              readonly
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.bodega_destino_id"
              :items="destinationWarehouseOptions"
              item-title="title"
              item-value="value"
              label="Bodega destino"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="form.observacion"
              label="Observación"
              variant="outlined"
              rows="2"
              auto-grow
            />
          </v-col>
        </v-row>

        <v-alert v-if="selectedOrder" type="info" variant="tonal" class="mb-4">
          Esta transferencia tomará los materiales de la orden
          <strong>{{ selectedOrder.codigo }}</strong>, hará la salida de la
          bodega origen y el ingreso en la bodega destino, registrando ambos
          movimientos en kardex.
        </v-alert>

        <div class="text-subtitle-1 font-weight-bold mb-2">Materiales precargados</div>
        <div class="transfer-details-table">
          <table class="details-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Costo unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detail in selectedOrderDetails" :key="detail.id || detail.producto_id">
                <td>{{ detail.codigo_producto || "-" }}</td>
                <td>{{ detail.nombre_producto || "-" }}</td>
                <td class="text-right">{{ formatNumber(detail.cantidad) }}</td>
                <td class="text-right">{{ formatCurrency(detail.costo_unitario) }}</td>
                <td class="text-right">{{ formatCurrency(detail.subtotal) }}</td>
              </tr>
              <tr v-if="!selectedOrderDetails.length">
                <td colspan="5" class="text-center text-medium-emphasis py-4">
                  Selecciona una orden de compra pendiente para precargar sus materiales.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap justify-end mt-4" style="gap: 12px;">
          <v-chip color="info" variant="tonal">
            Ítems: {{ selectedOrderDetails.length }}
          </v-chip>
          <v-chip color="success" variant="tonal">
            Cantidad total: {{ formatNumber(selectedOrderTotalQuantity) }}
          </v-chip>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="saveTransfer">
          Guardar transferencia
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";

type CatalogOption = { value: string; title: string };

type PurchaseOrderDetailRow = {
  id?: string;
  producto_id: string;
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
  costo_unitario?: string | number | null;
  subtotal?: string | number | null;
};

type PurchaseOrderRow = {
  id: string;
  codigo: string;
  proveedor_nombre?: string | null;
  bodega_destino_id?: string | null;
  bodega_label?: string | null;
  detalles?: PurchaseOrderDetailRow[];
};

type TransferRow = {
  id: string;
  codigo: string;
  fecha_transferencia?: string | null;
  orden_compra_codigo?: string | null;
  orden_compra_proveedor?: string | null;
  bodega_origen_label?: string | null;
  bodega_destino_label?: string | null;
  estado?: string | null;
  total_items?: number;
  total_cantidad?: string | number | null;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown } = useDisplay();

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "transferencias-bodega",
    "transferencias de bodega",
    "inventario",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);

const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const transfers = ref<TransferRow[]>([]);
const pendingOrders = ref<PurchaseOrderRow[]>([]);
const warehouses = ref<any[]>([]);

const form = reactive({
  orden_compra_id: "",
  bodega_destino_id: "",
  fecha_transferencia: new Date().toISOString().slice(0, 10),
  observacion: "",
});

const headers = [
  { title: "Código", key: "codigo" },
  { title: "Fecha", key: "fecha_transferencia" },
  { title: "Orden de compra", key: "orden_compra_codigo" },
  { title: "Proveedor", key: "orden_compra_proveedor" },
  { title: "Origen", key: "bodega_origen_label" },
  { title: "Destino", key: "bodega_destino_label" },
  { title: "Items", key: "total_items" },
  { title: "Cantidad total", key: "total_cantidad" },
  { title: "Estado", key: "estado" },
];

const isDialogFullscreen = computed(() => mdAndDown.value);

const selectedOrder = computed(
  () =>
    pendingOrders.value.find((item) => String(item.id) === String(form.orden_compra_id)) ||
    null,
);

const selectedOrderDetails = computed(() => selectedOrder.value?.detalles ?? []);

const selectedOrderTotalQuantity = computed(() =>
  selectedOrderDetails.value.reduce((sum, detail) => sum + toNumber(detail.cantidad), 0),
);

const pendingOrderOptions = computed<CatalogOption[]>(() =>
  pendingOrders.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo} · ${item.proveedor_nombre || "Sin proveedor"} · ${item.bodega_label || "Sin bodega"}`,
  })),
);

const destinationWarehouseOptions = computed<CatalogOption[]>(() => {
  const sourceId = String(selectedOrder.value?.bodega_destino_id || "");
  return warehouses.value
    .filter((item) => String(item.id) !== sourceId)
    .map((item) => ({
      value: String(item.id),
      title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
    }));
});

const tableRows = computed(() => transfers.value);

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-EC");
}

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function resetForm() {
  form.orden_compra_id = "";
  form.bodega_destino_id = "";
  form.fecha_transferencia = new Date().toISOString().slice(0, 10);
  form.observacion = "";
}

async function loadCatalogs() {
  warehouses.value = await listAllPages("/kpi_inventory/bodegas");
}

async function loadTransfers() {
  transfers.value = (await listAllPages("/kpi_inventory/transferencias-bodega")) as TransferRow[];
}

async function loadPendingOrders() {
  const { data } = await api.get("/kpi_inventory/ordenes-compra/pendientes-transferencia");
  const payload = data?.data ?? data;
  pendingOrders.value = Array.isArray(payload) ? payload : [];
}

async function hydrateView() {
  if (!canRead.value) return;
  loading.value = true;
  try {
    await Promise.all([loadCatalogs(), loadTransfers(), loadPendingOrders()]);
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar el módulo de transferencias.",
    );
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  resetForm();
  dialog.value = true;
}

function validateForm() {
  if (!form.orden_compra_id) {
    ui.error("Debes seleccionar una orden de compra pendiente.");
    return false;
  }
  if (!form.bodega_destino_id) {
    ui.error("Debes seleccionar la bodega destino.");
    return false;
  }
  if (!selectedOrderDetails.value.length) {
    ui.error("La orden seleccionada no tiene materiales para transferir.");
    return false;
  }
  return true;
}

async function saveTransfer() {
  if (!validateForm()) return;
  if (!canCreate.value) {
    ui.error("No tienes permisos para registrar transferencias.");
    return;
  }
  saving.value = true;
  try {
    await api.post("/kpi_inventory/transferencias-bodega", {
      orden_compra_id: form.orden_compra_id,
      bodega_destino_id: form.bodega_destino_id,
      fecha_transferencia: form.fecha_transferencia || undefined,
      observacion: form.observacion || undefined,
      created_by: getUserName(),
      updated_by: getUserName(),
      detalles: selectedOrderDetails.value.map((detail) => ({
        orden_compra_det_id: detail.id,
        producto_id: detail.producto_id,
        cantidad: toNumber(detail.cantidad),
      })),
    });
    ui.success("Transferencia registrada correctamente.");
    dialog.value = false;
    await hydrateView();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo guardar la transferencia.",
    );
  } finally {
    saving.value = false;
  }
}

watch(selectedOrder, (order) => {
  if (!order) {
    form.bodega_destino_id = "";
    return;
  }
  const options = destinationWarehouseOptions.value;
  const currentStillValid = options.some(
    (item) => String(item.value) === String(form.bodega_destino_id || ""),
  );
  form.bodega_destino_id = currentStillValid
    ? String(form.bodega_destino_id)
    : String(options[0]?.value || "");
});

onMounted(async () => {
  if (!canRead.value) return;
  await hydrateView();
});
</script>

<style scoped>
.transfer-details-table {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 18px;
}

.details-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.details-table th,
.details-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.details-table th {
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>

<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar este módulo.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Transferencias de bodega</div>
        <div class="text-body-2 text-medium-emphasis">
          Registra transferencias manuales entre bodegas o precarga materiales desde una orden de compra pendiente.
        </div>
      </div>
      <div class="d-flex flex-wrap" style="gap: 8px;">
        <v-chip color="info" variant="tonal">
          {{ pendingOrders.length }} órdenes disponibles para precarga
        </v-chip>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="hydrateView">
          Recargar
        </v-btn>
        <v-btn
          v-if="canCreate"
          color="primary"
          prepend-icon="mdi-swap-horizontal"
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
      <template #item.fecha_transferencia="{ item }">
        {{ formatDate(item.fecha_transferencia) }}
      </template>

      <template #item.orden_compra_codigo="{ item }">
        <v-chip size="small" variant="tonal" :color="item.orden_compra_codigo ? 'info' : 'secondary'">
          {{ item.orden_compra_codigo || "Manual" }}
        </v-chip>
      </template>

      <template #item.estado="{ item }">
        <v-chip size="small" variant="tonal" color="success">
          {{ item.estado || "COMPLETADA" }}
        </v-chip>
      </template>

      <template #item.total_cantidad="{ item }">
        {{ formatNumber(item.total_cantidad) }}
      </template>
    </v-data-table>
  </v-card>

  <v-dialog
    v-model="dialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1440"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Nueva transferencia de bodega
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col cols="12" md="5">
            <v-autocomplete
              v-model="form.orden_compra_id"
              :items="pendingOrderOptions"
              item-title="title"
              item-value="value"
              label="Orden de compra para precarga (opcional)"
              variant="outlined"
              clearable
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="form.fecha_transferencia"
              type="date"
              label="Fecha de transferencia"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-text-field
              :model-value="selectedOrder?.proveedor_nombre || 'Transferencia manual'"
              label="Proveedor / origen de la solicitud"
              variant="outlined"
              readonly
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-if="selectedOrder"
              :model-value="sourceWarehouseLabel"
              label="Bodega origen"
              variant="outlined"
              readonly
            />
            <v-select
              v-else
              v-model="form.bodega_origen_id"
              :items="sourceWarehouseOptions"
              item-title="title"
              item-value="value"
              label="Bodega origen"
              variant="outlined"
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
          La orden <strong>{{ selectedOrder.codigo }}</strong> fue precargada. Al guardar la transferencia esta orden quedará marcada como usada y ya no volverá a salir disponible.
        </v-alert>
        <v-alert v-else type="info" variant="tonal" class="mb-4">
          Estás registrando una transferencia manual. Selecciona la bodega origen, la bodega destino y los materiales a mover.
        </v-alert>

        <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Materiales de la transferencia</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedOrder ? 'Puedes ajustar cantidades o retirar materiales precargados.' : 'Agrega los materiales que se moverán entre bodegas.' }}
            </div>
          </div>
          <v-btn
            v-if="!selectedOrder"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="addDetail"
          >
            Agregar material
          </v-btn>
        </div>

        <div class="transfer-details-table">
          <table class="details-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Stock actual</th>
                <th>Costo ref.</th>
                <th>Subtotal ref.</th>
                <th>Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detail in form.detalles" :key="detail.local_id">
                <td>{{ detail.codigo_producto || "-" }}</td>
                <td>
                  <v-autocomplete
                    v-model="detail.producto_id"
                    :items="productOptions"
                    item-title="title"
                    item-value="value"
                    label="Material"
                    variant="outlined"
                    hide-details
                    :disabled="Boolean(selectedOrder)"
                    @update:model-value="handleDetailProductChange(detail)"
                  />
                </td>
                <td>
                  <div class="quantity-cell">
                    <v-text-field
                      v-model="detail.cantidad"
                      type="number"
                      min="0"
                      step="0.0001"
                      variant="outlined"
                      :error="detailExceedsStock(detail)"
                      hide-details
                    />
                    <div
                      v-if="detailExceedsStock(detail)"
                      class="text-caption text-error mt-1"
                    >
                      Solicitado: {{ formatNumber(getRequestedQuantityForProduct(detail.producto_id)) }}
                      · Disponible: {{ formatNumber(getCurrentStock(detail)) }}
                    </div>
                  </div>
                </td>
                <td>
                  <v-text-field
                    :model-value="formatNumber(getCurrentStock(detail))"
                    label="Stock actual"
                    variant="outlined"
                    readonly
                    hide-details
                  />
                </td>
                <td class="text-right font-weight-medium">
                  {{ formatCurrency(detail.costo_unitario) }}
                </td>
                <td class="text-right font-weight-bold">
                  {{ formatCurrency(detailSubtotal(detail)) }}
                </td>
                <td>
                  <v-text-field
                    v-model="detail.observacion"
                    variant="outlined"
                    hide-details
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click="removeDetail(detail.local_id)"
                  />
                </td>
              </tr>
              <tr v-if="!form.detalles.length">
                <td colspan="8" class="text-center text-medium-emphasis py-4">
                  {{ selectedOrder ? "La orden seleccionada no tiene materiales disponibles." : "Agrega materiales para continuar." }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap justify-end mt-4" style="gap: 12px;">
          <v-chip color="info" variant="tonal">
            Ítems: {{ form.detalles.length }}
          </v-chip>
          <v-chip color="success" variant="tonal">
            Cantidad total: {{ formatNumber(totalQuantity) }}
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

type ProductRow = {
  id: string;
  codigo?: string | null;
  nombre?: string | null;
  costo_promedio?: string | number | null;
  ultimo_costo?: string | number | null;
};

type StockRow = {
  id: string;
  bodega_id: string;
  producto_id: string;
  stock_actual?: string | number | null;
};

type PurchaseOrderDetailRow = {
  id?: string;
  producto_id: string;
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
  costo_unitario?: string | number | null;
  subtotal?: string | number | null;
  observacion?: string | null;
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

type TransferDetailForm = {
  local_id: string;
  orden_compra_det_id: string;
  producto_id: string;
  codigo_producto: string;
  nombre_producto: string;
  cantidad: string;
  costo_unitario: string;
  observacion: string;
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
const products = ref<ProductRow[]>([]);
const stockRows = ref<StockRow[]>([]);

const form = reactive({
  orden_compra_id: "",
  bodega_origen_id: "",
  bodega_destino_id: "",
  fecha_transferencia: new Date().toISOString().slice(0, 10),
  observacion: "",
  detalles: [] as TransferDetailForm[],
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

const sourceWarehouseOptions = computed<CatalogOption[]>(() =>
  warehouses.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
  })),
);

const effectiveSourceWarehouseId = computed(
  () => String(selectedOrder.value?.bodega_destino_id || form.bodega_origen_id || ""),
);

const sourceWarehouseLabel = computed(() => {
  const source = warehouses.value.find(
    (item) => String(item.id) === effectiveSourceWarehouseId.value,
  );
  return source ? `${source.codigo || ""} - ${source.nombre || source.id}`.trim() : "";
});

const destinationWarehouseOptions = computed<CatalogOption[]>(() =>
  warehouses.value
    .filter((item) => String(item.id) !== effectiveSourceWarehouseId.value)
    .map((item) => ({
      value: String(item.id),
      title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
    })),
);

const pendingOrderOptions = computed<CatalogOption[]>(() =>
  pendingOrders.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo} · ${item.proveedor_nombre || "Sin proveedor"} · ${item.bodega_label || "Sin bodega"}`,
  })),
);

const productOptions = computed<CatalogOption[]>(() =>
  products.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
  })),
);

const currentStockByProduct = computed(() => {
  const map = new Map<string, number>();
  const sourceWarehouseId = effectiveSourceWarehouseId.value;
  if (!sourceWarehouseId) return map;
  for (const row of stockRows.value) {
    if (String(row.bodega_id || "") !== sourceWarehouseId) continue;
    map.set(String(row.producto_id || ""), toNumber(row.stock_actual));
  }
  return map;
});

const tableRows = computed(() => transfers.value);

const totalQuantity = computed(() =>
  form.detalles.reduce((sum, detail) => sum + toNumber(detail.cantidad), 0),
);

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

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyDetail(): TransferDetailForm {
  return {
    local_id: createLocalId(),
    orden_compra_det_id: "",
    producto_id: "",
    codigo_producto: "",
    nombre_producto: "",
    cantidad: "1",
    costo_unitario: "0",
    observacion: "",
  };
}

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function detailSubtotal(detail: TransferDetailForm) {
  return toNumber(detail.cantidad) * toNumber(detail.costo_unitario);
}

function getCurrentStock(detail: TransferDetailForm) {
  if (!detail.producto_id) return 0;
  return currentStockByProduct.value.get(String(detail.producto_id || "")) ?? 0;
}

function getRequestedQuantityForProduct(productId: string) {
  return form.detalles
    .filter((detail) => String(detail.producto_id || "") === String(productId || ""))
    .reduce((sum, detail) => sum + toNumber(detail.cantidad), 0);
}

function detailExceedsStock(detail: TransferDetailForm) {
  if (!detail.producto_id) return false;
  return getRequestedQuantityForProduct(detail.producto_id) > getCurrentStock(detail);
}

function resetForm() {
  form.orden_compra_id = "";
  form.bodega_origen_id = "";
  form.bodega_destino_id = "";
  form.fecha_transferencia = new Date().toISOString().slice(0, 10);
  form.observacion = "";
  form.detalles = [createEmptyDetail()];
}

function addDetail() {
  form.detalles.push(createEmptyDetail());
}

function removeDetail(localId: string) {
  form.detalles = form.detalles.filter((detail) => detail.local_id !== localId);
  if (!form.detalles.length) {
    form.detalles = selectedOrder.value ? [] : [createEmptyDetail()];
  }
}

function handleDetailProductChange(detail: TransferDetailForm) {
  const product = products.value.find((item) => String(item.id) === String(detail.producto_id));
  if (!product) return;
  detail.codigo_producto = String(product.codigo || "");
  detail.nombre_producto = String(product.nombre || "");
  detail.costo_unitario = String(product.costo_promedio || product.ultimo_costo || 0);
}

function mapOrderDetails(details: PurchaseOrderDetailRow[] | undefined) {
  return Array.isArray(details)
    ? details.map((detail) => ({
        local_id: createLocalId(),
        orden_compra_det_id: String(detail.id || ""),
        producto_id: String(detail.producto_id || ""),
        codigo_producto: String(detail.codigo_producto || ""),
        nombre_producto: String(detail.nombre_producto || ""),
        cantidad: String(detail.cantidad || "0"),
        costo_unitario: String(detail.costo_unitario || "0"),
        observacion: String(detail.observacion || ""),
      }))
    : [];
}

async function loadCatalogs() {
  const [warehouseRows, productRows, stockRowsPayload] = await Promise.all([
    listAllPages("/kpi_inventory/bodegas"),
    listAllPages("/kpi_inventory/productos"),
    listAllPages("/kpi_inventory/stock-bodega"),
  ]);
  warehouses.value = warehouseRows;
  products.value = productRows as ProductRow[];
  stockRows.value = stockRowsPayload as StockRow[];
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
  if (!effectiveSourceWarehouseId.value) {
    ui.error("Debes seleccionar la bodega origen.");
    return false;
  }
  if (!form.bodega_destino_id) {
    ui.error("Debes seleccionar la bodega destino.");
    return false;
  }
  if (effectiveSourceWarehouseId.value === String(form.bodega_destino_id || "")) {
    ui.error("La bodega destino debe ser distinta a la bodega origen.");
    return false;
  }
  if (!form.detalles.length) {
    ui.error("Debes agregar al menos un material para transferir.");
    return false;
  }
  for (const detail of form.detalles) {
    if (!detail.producto_id) {
      ui.error("Todos los materiales de la transferencia deben estar seleccionados.");
      return false;
    }
    if (!(toNumber(detail.cantidad) > 0)) {
      ui.error("La cantidad de cada material debe ser mayor a cero.");
      return false;
    }
    if (detailExceedsStock(detail)) {
      const materialLabel =
        detail.codigo_producto || detail.nombre_producto || "el material seleccionado";
      ui.error(
        `La cantidad ingresada para ${materialLabel} es mayor a la que hay en la bodega.`,
      );
      return false;
    }
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
      orden_compra_id: form.orden_compra_id || undefined,
      bodega_origen_id: effectiveSourceWarehouseId.value,
      bodega_destino_id: form.bodega_destino_id,
      fecha_transferencia: form.fecha_transferencia || undefined,
      observacion: form.observacion || undefined,
      created_by: getUserName(),
      updated_by: getUserName(),
      detalles: form.detalles.map((detail) => ({
        orden_compra_det_id: detail.orden_compra_det_id || undefined,
        producto_id: detail.producto_id,
        cantidad: toNumber(detail.cantidad),
        observacion: detail.observacion || undefined,
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
  if (order) {
    form.bodega_origen_id = String(order.bodega_destino_id || "");
    form.detalles = mapOrderDetails(order.detalles);
  } else {
    form.detalles = [createEmptyDetail()];
  }
});

watch(
  () => effectiveSourceWarehouseId.value,
  () => {
    const valid = destinationWarehouseOptions.value.some(
      (item) => String(item.value) === String(form.bodega_destino_id || ""),
    );
    form.bodega_destino_id = valid
      ? String(form.bodega_destino_id)
      : String(destinationWarehouseOptions.value[0]?.value || "");
  },
);

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
  min-width: 980px;
  border-collapse: collapse;
}

.details-table th,
.details-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  vertical-align: top;
}

.details-table th {
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.quantity-cell {
  min-width: 180px;
}
</style>

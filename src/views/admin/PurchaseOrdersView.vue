<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar este módulo.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Órdenes de compra</div>
        <div class="text-body-2 text-medium-emphasis">
          Genera órdenes de compra y envía sus materiales por default a la bodega marcada para compras.
        </div>
      </div>
      <div class="d-flex flex-wrap" style="gap: 8px;">
        <v-chip
          v-if="defaultWarehouseLabel"
          color="info"
          variant="tonal"
          prepend-icon="mdi-warehouse"
        >
          {{ defaultWarehouseLabel }}
        </v-chip>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="hydrateView">
          Recargar
        </v-btn>
        <v-btn
          v-if="canCreate"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nueva orden
        </v-btn>
      </div>
    </div>

    <v-row dense class="mb-2">
      <v-col cols="12" md="5">
        <v-text-field
          v-model="search"
          label="Buscar por código, proveedor o referencia"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>
    </v-row>

    <v-data-table-server
      :headers="headers"
      :items="tableRows"
      :items-length="serverTotalItems"
      :loading="loading"
      loading-text="Obteniendo órdenes de compra..."
      :items-per-page="serverItemsPerPage"
      :page="serverPage"
      class="elevation-0 enterprise-table"
      @update:options="handleServerOptionsUpdate"
    >
      <template #item.estado="{ item }">
        <v-chip size="small" variant="tonal" :color="orderStateColor(item.estado)">
          {{ item.estado }}
        </v-chip>
      </template>

      <template #item.total="{ item }">
        {{ formatCurrency(item.total) }}
      </template>

      <template #item.tiene_transferencia="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="item.tiene_transferencia ? 'success' : 'warning'"
        >
          {{ item.tiene_transferencia ? item.transferencia_codigo || "Transferida" : "Pendiente" }}
        </v-chip>
      </template>

      <template #item.actions="{ item }">
        <div class="responsive-actions">
          <v-btn
            icon="mdi-file-pdf-box"
            variant="text"
            color="error"
            :disabled="!canDownloadPdf"
            @click="downloadPdf(item)"
          />
          <v-btn
            v-if="canEdit"
            icon="mdi-pencil"
            variant="text"
            :disabled="item.tiene_transferencia"
            @click="openEdit(item)"
          />
          <v-btn
            v-if="canDelete"
            icon="mdi-delete"
            variant="text"
            color="error"
            :disabled="item.tiene_transferencia"
            @click="openDelete(item)"
          />
        </div>
      </template>
    </v-data-table-server>
  </v-card>

  <v-dialog
    v-model="dialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1440"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        {{ editingId ? "Editar orden de compra" : "Nueva orden de compra" }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.codigo"
              readonly
              label="Código"
              variant="outlined"
              hint="Si lo dejas vacío, el sistema lo genera automáticamente."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.fecha_emision"
              type="date"
              label="Fecha de emisión"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.fecha_requerida"
              type="date"
              label="Fecha requerida"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-autocomplete
              v-model="form.proveedor_id"
              :items="supplierOptions"
              item-title="title"
              item-value="value"
              label="Proveedor"
              variant="outlined"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="form.bodega_destino_id"
              :items="warehouseOptions"
              item-title="title"
              item-value="value"
              label="Bodega destino"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.vendedor"
              label="Vendedor / sede emisora"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.condicion_pago"
              label="Condición de pago"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.referencia"
              readonly
              label="Referencia"
              variant="outlined"
              hint="Referencia autogenerada tipo IB-00000001."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="form.moneda"
              label="Moneda"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="form.tipo_cambio"
              label="Tipo de cambio"
              type="number"
              min="0"
              step="0.0001"
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

        <div class="d-flex align-center justify-space-between mt-4 mb-2" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Materiales de la orden</div>
            <div class="text-body-2 text-medium-emphasis">
              Los materiales se asociarán a la bodega destino seleccionada.
            </div>
          </div>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addDetail">
            Agregar material
          </v-btn>
        </div>

        <div class="order-details-table">
          <table class="details-table">
            <thead>
              <tr>
                <th class="material-column">Material</th>
                <th class="compact-column">Cant.</th>
                <th class="compact-column">Costo unitario</th>
                <th class="compact-column">Desc.</th>
                <th class="compact-column">% Desc.</th>
                <th class="compact-column">IVA %</th>
                <th class="total-column">Total</th>
                <th class="observation-column">Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detail in form.detalles" :key="detail.local_id">
                <td class="material-column">
                  <v-autocomplete
                    v-model="detail.producto_id"
                    :items="productOptions"
                    item-title="title"
                    item-value="value"
                    label="Material"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    @update:model-value="handleDetailProductChange(detail)"
                  />
                </td>
                <td class="compact-column">
                  <v-text-field
                    v-model="detail.cantidad"
                    type="number"
                    min="0"
                    step="0.0001"
                    variant="outlined"
                    hide-details
                  />
                </td>
                <td class="compact-column">
                  <v-text-field
                    v-model="detail.costo_unitario"
                    type="number"
                    min="0"
                    step="0.0001"
                    variant="outlined"
                    hide-details
                  />
                </td>
                <td class="compact-column">
                  <v-text-field
                    v-model="detail.descuento"
                    type="number"
                    min="0"
                    step="0.0001"
                    variant="outlined"
                    hide-details
                  />
                </td>
                <td class="compact-column">
                  <v-text-field
                    v-model="detail.porcentaje_descuento"
                    type="number"
                    min="0"
                    step="0.01"
                    variant="outlined"
                    hide-details
                  />
                </td>
                <td class="compact-column">
                  <v-text-field
                    v-model="detail.iva_porcentaje"
                    type="number"
                    min="0"
                    step="0.01"
                    variant="outlined"
                    hide-details
                  />
                </td>
                <td class="text-right font-weight-bold total-column">
                  {{ formatCurrency(detailGrandTotal(detail)) }}
                </td>
                <td class="observation-column">
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
            </tbody>
          </table>
        </div>

        <v-alert v-if="!form.detalles.length" type="info" variant="tonal" class="mt-3">
          Agrega al menos un material para guardar la orden de compra.
        </v-alert>

        <div class="d-flex flex-wrap justify-end mt-4 purchase-summary" style="gap: 12px;">
          <v-chip color="info" variant="tonal">Subtotal: {{ formatCurrency(orderTotals.subtotal) }}</v-chip>
          <v-chip color="warning" variant="tonal">Descuento: {{ formatCurrency(orderTotals.descuento) }}</v-chip>
          <v-chip color="secondary" variant="tonal">IVA: {{ formatCurrency(orderTotals.iva) }}</v-chip>
          <v-chip color="success" variant="tonal">Total: {{ formatCurrency(orderTotals.total) }}</v-chip>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="saveOrder">
          Guardar orden
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="deleteDialog"
    :fullscreen="smAndDown"
    :max-width="smAndDown ? undefined : 520"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar orden de compra</v-card-title>
      <v-card-text>
        ¿Seguro que deseas eliminar la orden
        <strong>{{ deletingOrder?.codigo || "" }}</strong>?
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="saving" @click="confirmDelete">
          Eliminar
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
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
import { fetchPaginatedResource } from "@/app/utils/paginated-resource";
import { downloadPurchaseOrderPdf } from "@/app/utils/purchase-order-documents";

type CatalogOption = { value: string; title: string };

type OrderDetailForm = {
  local_id: string;
  producto_id: string;
  cantidad: string;
  costo_unitario: string;
  descuento: string;
  porcentaje_descuento: string;
  iva_porcentaje: string;
  observacion: string;
};

type PurchaseOrderRow = {
  id: string;
  codigo: string;
  fecha_emision?: string | null;
  proveedor_nombre?: string | null;
  referencia?: string | null;
  bodega_label?: string | null;
  estado?: string | null;
  total?: string | number | null;
  tiene_transferencia?: boolean;
  transferencia_codigo?: string | null;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "ordenes-compra",
    "ordenes de compra",
    "compras",
    "inventario",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canDownloadPdf = computed(() =>
  hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "inventario"),
);

const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const editingId = ref<string | null>(null);
const search = ref("");
const serverPage = ref(1);
const serverItemsPerPage = ref(15);
const serverTotalItems = ref(0);
let serverFetchTimer: ReturnType<typeof setTimeout> | null = null;
let serverRequestId = 0;
const orders = ref<PurchaseOrderRow[]>([]);
const suppliers = ref<any[]>([]);
const products = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const deletingOrder = ref<PurchaseOrderRow | null>(null);
const suppliersLoaded = ref(false);
const productsLoaded = ref(false);
const warehousesLoaded = ref(false);

const form = reactive({
  codigo: "",
  fecha_emision: new Date().toISOString().slice(0, 10),
  fecha_requerida: "",
  proveedor_id: "",
  bodega_destino_id: "",
  vendedor: "",
  condicion_pago: "CREDITO 90 DIAS",
  referencia: "",
  observacion: "",
  moneda: "USD",
  tipo_cambio: "1",
  detalles: [] as OrderDetailForm[],
});

const headers = [
  { title: "Código", key: "codigo" },
  { title: "Fecha", key: "fecha_emision_label" },
  { title: "Proveedor", key: "proveedor_nombre" },
  { title: "Bodega", key: "bodega_label" },
  { title: "Estado", key: "estado" },
  { title: "Total", key: "total" },
  { title: "Transferencia", key: "tiene_transferencia" },
  { title: "Acciones", key: "actions", sortable: false },
];

const defaultWarehouse = computed(
  () =>
    warehouses.value.find((item) => item.es_default_compra) ||
    warehouses.value.find((item) => item.es_principal) ||
    warehouses.value[0] ||
    null,
);

const defaultWarehouseLabel = computed(() => {
  const warehouse = defaultWarehouse.value;
  if (!warehouse) return "";
  return `Default compras: ${warehouse.codigo || ""} - ${warehouse.nombre || ""}`.trim();
});

const supplierOptions = computed<CatalogOption[]>(() =>
  suppliers.value.map((item) => ({
    value: String(item.id),
    title: `${item.identificacion ? `${item.identificacion} - ` : ""}${item.razon_social || item.nombre_comercial || item.id}`,
  })),
);

const warehouseOptions = computed<CatalogOption[]>(() =>
  warehouses.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
  })),
);

const productOptions = computed<CatalogOption[]>(() =>
  products.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id} · costo ${formatCurrency(item.costo_promedio || item.ultimo_costo || 0)}`,
  })),
);

const tableRows = computed(() => {
  return orders.value
    .map((item) => ({
      ...item,
      fecha_emision_label: formatDate(item.fecha_emision),
    }));
});

const orderTotals = computed(() => {
  return form.detalles.reduce(
    (acc, detail) => {
      const quantity = toNumber(detail.cantidad);
      const unitCost = toNumber(detail.costo_unitario);
      const gross = quantity * unitCost;
      const discount =
        toNumber(detail.descuento) > 0
          ? toNumber(detail.descuento)
          : gross * (toNumber(detail.porcentaje_descuento) / 100);
      const subtotal = Math.max(0, gross - discount);
      const iva = subtotal * (toNumber(detail.iva_porcentaje || 12) / 100);
      acc.subtotal += subtotal;
      acc.descuento += discount;
      acc.iva += iva;
      acc.total += subtotal + iva;
      return acc;
    },
    { subtotal: 0, descuento: 0, iva: 0, total: 0 },
  );
});

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function repairText(value: unknown) {
  const raw = String(value ?? "");
  if (!/[ÃƒÃ‚Ã¢]/.test(raw)) return raw;
  try {
    return decodeURIComponent(escape(raw));
  } catch {
    return raw;
  }
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: form.moneda || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-EC");
}

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function incrementAlphaPrefix(letter: string) {
  const nextCharCode = letter.toUpperCase().charCodeAt(0) + 1;
  if (nextCharCode > 90) return "A";
  return String.fromCharCode(nextCharCode);
}

function nextPurchaseOrderCode(lastCode: string | null) {
  if (!lastCode) return "OC-A00001";
  const match = /^OC-([A-Z])(\d{5})$/i.exec(String(lastCode || "").trim());
  if (!match) return "OC-A00001";
  const currentLetter = (match[1] ?? "A").toUpperCase();
  const currentNumber = Number(match[2] ?? "0");
  if (currentNumber >= 99999) {
    return `OC-${incrementAlphaPrefix(currentLetter)}00001`;
  }
  return `OC-${currentLetter}${String(currentNumber + 1).padStart(5, "0")}`;
}

function getPurchaseOrderCodeRank(code: string) {
  const match = /^OC-([A-Z])(\d{5})$/i.exec(String(code || "").trim());
  if (!match) return -1;
  const letter = (match[1] ?? "A").toUpperCase();
  const number = Number(match[2] ?? "0");
  return (letter.charCodeAt(0) - 64) * 100000 + number;
}

function getHighestPurchaseOrderCode(codes: string[]) {
  const normalized = codes
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .sort((a, b) => getPurchaseOrderCodeRank(b) - getPurchaseOrderCodeRank(a));
  return normalized[0] ?? null;
}

function nextPurchaseOrderReference(lastReference: string | null) {
  const match = /^IB-(\d{8})$/i.exec(String(lastReference || "").trim());
  if (!match) return "IB-00000001";
  const currentNumber = Number(match[1] ?? "0");
  return `IB-${String(currentNumber + 1).padStart(8, "0")}`;
}

function getHighestPurchaseOrderReference(references: string[]) {
  const normalized = references
    .map((item) => String(item || "").trim())
    .filter((item) => /^IB-\d{8}$/i.test(item))
    .sort((a, b) => {
      const aNumber = Number(/^IB-(\d{8})$/i.exec(a)?.[1] ?? "0");
      const bNumber = Number(/^IB-(\d{8})$/i.exec(b)?.[1] ?? "0");
      return bNumber - aNumber;
    });
  return normalized[0] ?? null;
}

function createEmptyDetail(): OrderDetailForm {
  return {
    local_id: createLocalId(),
    producto_id: "",
    cantidad: "1",
    costo_unitario: "0",
    descuento: "0",
    porcentaje_descuento: "0",
    iva_porcentaje: "12",
    observacion: "",
  };
}

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function orderStateColor(value: string | null | undefined) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "TRANSFERIDA") return "success";
  if (normalized === "ANULADA") return "error";
  return "info";
}

function detailGrandTotal(detail: OrderDetailForm) {
  const quantity = toNumber(detail.cantidad);
  const unitCost = toNumber(detail.costo_unitario);
  const gross = quantity * unitCost;
  const discount =
    toNumber(detail.descuento) > 0
      ? toNumber(detail.descuento)
      : gross * (toNumber(detail.porcentaje_descuento) / 100);
  const subtotal = Math.max(0, gross - discount);
  const iva = subtotal * (toNumber(detail.iva_porcentaje || 12) / 100);
  return subtotal + iva;
}

function resetForm() {
  const lastCode = getHighestPurchaseOrderCode(orders.value.map((item) => item?.codigo || ""));
  const lastReference = getHighestPurchaseOrderReference(
    orders.value.map((item) => item?.referencia || ""),
  );
  form.codigo = nextPurchaseOrderCode(lastCode);
  form.fecha_emision = new Date().toISOString().slice(0, 10);
  form.fecha_requerida = "";
  form.proveedor_id = "";
  form.bodega_destino_id = String(defaultWarehouse.value?.id || "");
  form.vendedor = String(defaultWarehouse.value?.nombre || "MATRIZ");
  form.condicion_pago = "CREDITO 90 DIAS";
  form.referencia = nextPurchaseOrderReference(lastReference);
  form.observacion = "";
  form.moneda = "USD";
  form.tipo_cambio = "1";
  form.detalles = [createEmptyDetail()];
}

function addDetail() {
  form.detalles.push(createEmptyDetail());
}

function removeDetail(localId: string) {
  form.detalles = form.detalles.filter((detail) => detail.local_id !== localId);
  if (!form.detalles.length) {
    form.detalles = [createEmptyDetail()];
  }
}

function handleDetailProductChange(detail: OrderDetailForm) {
  const product = products.value.find((item) => String(item.id) === String(detail.producto_id));
  if (!product) return;
  detail.costo_unitario = String(product.costo_promedio || product.ultimo_costo || 0);
  if (!detail.iva_porcentaje) {
    detail.iva_porcentaje = "12";
  }
}

async function loadCatalogs() {
  await Promise.all([
    ensureSuppliersLoaded(),
    ensureProductsLoaded(),
    ensureWarehousesLoaded(),
  ]);
}

async function loadOrders() {
  const requestId = ++serverRequestId;
  const response = await fetchPaginatedResource(
    "/kpi_inventory/ordenes-compra",
    {
      search: repairText(search.value).trim() || undefined,
    },
    {
      page: serverPage.value,
      limit: serverItemsPerPage.value,
    },
  );
  if (requestId !== serverRequestId) return;
  orders.value = response.data as PurchaseOrderRow[];
  serverTotalItems.value = Number(response.pagination.total || 0);
}

async function ensureSuppliersLoaded(force = false) {
  if (suppliersLoaded.value && !force) return;
  suppliers.value = await listAllPages("/kpi_inventory/terceros");
  suppliersLoaded.value = true;
}

async function ensureProductsLoaded(force = false) {
  if (productsLoaded.value && !force) return;
  products.value = await listAllPages("/kpi_inventory/productos");
  productsLoaded.value = true;
}

async function ensureWarehousesLoaded(force = false) {
  if (warehousesLoaded.value && !force) return;
  warehouses.value = await listAllPages("/kpi_inventory/bodegas");
  warehousesLoaded.value = true;
}

async function hydrateView() {
  if (!canRead.value) return;
  loading.value = true;
  try {
    await Promise.all([loadOrders(), ensureWarehousesLoaded(true)]);
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar el módulo de órdenes de compra.",
    );
  } finally {
    loading.value = false;
  }
}

function handleServerOptionsUpdate(options: {
  page?: number;
  itemsPerPage?: number;
}) {
  const nextPage = Number(options?.page || serverPage.value || 1);
  const nextItemsPerPage = Number(
    options?.itemsPerPage || serverItemsPerPage.value || 15,
  );
  const pageChanged = nextPage !== serverPage.value;
  const limitChanged = nextItemsPerPage !== serverItemsPerPage.value;
  if (!pageChanged && !limitChanged) return;

  serverPage.value = nextPage;
  serverItemsPerPage.value = nextItemsPerPage;
  void hydrateView();
}

function scheduleServerFetch() {
  if (serverFetchTimer) {
    clearTimeout(serverFetchTimer);
  }
  loading.value = true;
  serverFetchTimer = setTimeout(() => {
    serverFetchTimer = null;
    serverPage.value = 1;
    void hydrateView();
  }, 350);
}

async function openCreate() {
  editingId.value = null;
  resetForm();
  dialog.value = true;
  await loadCatalogs();
}

async function openEdit(item: PurchaseOrderRow) {
  editingId.value = item.id;
  loading.value = true;
  try {
    await loadCatalogs();
    const { data } = await api.get(`/kpi_inventory/ordenes-compra/${item.id}`);
    const order = (data?.data ?? data) as any;
    form.codigo = String(order.codigo || "");
    form.fecha_emision = String(order.fecha_emision || "").slice(0, 10);
    form.fecha_requerida = String(order.fecha_requerida || "").slice(0, 10);
    form.proveedor_id = String(order.proveedor_id || "");
    form.bodega_destino_id = String(order.bodega_destino_id || defaultWarehouse.value?.id || "");
    form.vendedor = String(order.vendedor || "");
    form.condicion_pago = String(order.condicion_pago || "");
    form.referencia = String(order.referencia || "");
    form.observacion = String(order.observacion || "");
    form.moneda = String(order.moneda || "USD");
    form.tipo_cambio = String(order.tipo_cambio || "1");
    form.detalles = Array.isArray(order.detalles) && order.detalles.length
      ? order.detalles.map((detail: any) => ({
          local_id: createLocalId(),
          producto_id: String(detail.producto_id || ""),
          cantidad: String(detail.cantidad || "1"),
          costo_unitario: String(detail.costo_unitario || "0"),
          descuento: String(detail.descuento || "0"),
          porcentaje_descuento: String(detail.porcentaje_descuento || "0"),
          iva_porcentaje: String(detail.iva_porcentaje || "12"),
          observacion: String(detail.observacion || ""),
        }))
      : [createEmptyDetail()];
    dialog.value = true;
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar la orden de compra.",
    );
  } finally {
    loading.value = false;
  }
}

function openDelete(item: PurchaseOrderRow) {
  deletingOrder.value = item;
  deleteDialog.value = true;
}

function validateForm() {
  if (!form.proveedor_id) {
    ui.error("Debes seleccionar un proveedor.");
    return false;
  }
  if (!form.bodega_destino_id) {
    ui.error("Debes seleccionar la bodega destino.");
    return false;
  }
  if (!form.detalles.length) {
    ui.error("Debes agregar al menos un material.");
    return false;
  }
  for (const detail of form.detalles) {
    if (!detail.producto_id) {
      ui.error("Todos los detalles deben tener un material seleccionado.");
      return false;
    }
    if (!(toNumber(detail.cantidad) > 0)) {
      ui.error("La cantidad de cada material debe ser mayor a cero.");
      return false;
    }
  }
  return true;
}

function buildPayload() {
  return {
    codigo: form.codigo || undefined,
    fecha_emision: form.fecha_emision || undefined,
    fecha_requerida: form.fecha_requerida || undefined,
    proveedor_id: form.proveedor_id || undefined,
    bodega_destino_id: form.bodega_destino_id || undefined,
    vendedor: form.vendedor || undefined,
    condicion_pago: form.condicion_pago || undefined,
    referencia: form.referencia || undefined,
    observacion: form.observacion || undefined,
    moneda: form.moneda || "USD",
    tipo_cambio: toNumber(form.tipo_cambio || 1),
    created_by: getUserName(),
    updated_by: getUserName(),
    detalles: form.detalles.map((detail) => ({
      producto_id: detail.producto_id,
      cantidad: toNumber(detail.cantidad),
      costo_unitario: toNumber(detail.costo_unitario),
      descuento: toNumber(detail.descuento),
      porcentaje_descuento: toNumber(detail.porcentaje_descuento),
      iva_porcentaje: toNumber(detail.iva_porcentaje || 12),
      observacion: detail.observacion || undefined,
    })),
  };
}

async function saveOrder() {
  if (!validateForm()) return;
  if (!editingId.value && !canCreate.value) {
    ui.error("No tienes permisos para crear órdenes de compra.");
    return;
  }
  if (editingId.value && !canEdit.value) {
    ui.error("No tienes permisos para editar órdenes de compra.");
    return;
  }

  saving.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await api.patch(`/kpi_inventory/ordenes-compra/${editingId.value}`, payload);
      ui.success("Orden de compra actualizada correctamente.");
    } else {
      await api.post("/kpi_inventory/ordenes-compra", payload);
      ui.success("Orden de compra generada correctamente.");
    }
    dialog.value = false;
    await loadOrders();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo guardar la orden de compra.",
    );
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!deletingOrder.value) return;
  saving.value = true;
  try {
    await api.delete(`/kpi_inventory/ordenes-compra/${deletingOrder.value.id}`);
    ui.success("Orden de compra eliminada correctamente.");
    deleteDialog.value = false;
    deletingOrder.value = null;
    await loadOrders();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo eliminar la orden de compra.",
    );
  } finally {
    saving.value = false;
  }
}

async function downloadPdf(item: PurchaseOrderRow) {
  if (!canDownloadPdf.value) {
    ui.error("No tienes permisos para descargar este reporte.");
    return;
  }
  try {
    const { data } = await api.get(`/kpi_inventory/ordenes-compra/${item.id}`);
    await downloadPurchaseOrderPdf(data?.data ?? data, getUserName());
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo generar el PDF de la orden de compra.",
    );
  }
}

onMounted(async () => {
  if (!canRead.value) return;
  await hydrateView();
  resetForm();
});

watch(
  () => search.value,
  () => {
    scheduleServerFetch();
  },
);
</script>

<style scoped>
.order-details-table {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 18px;
}

.details-table {
  width: 100%;
  min-width: 1380px;
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

.details-table :deep(.v-field) {
  min-width: 100%;
}

.material-column {
  min-width: 420px;
  width: 420px;
}

.compact-column {
  min-width: 120px;
  width: 120px;
}

.total-column {
  min-width: 140px;
  width: 140px;
}

.observation-column {
  min-width: 220px;
  width: 220px;
}

.purchase-summary :deep(.v-chip__content) {
  font-weight: 600;
}
</style>

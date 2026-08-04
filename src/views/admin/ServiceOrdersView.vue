<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar este módulo.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Órdenes de servicio</div>
       
      </div>
      <div class="d-flex flex-wrap" style="gap: 8px;">
        <v-chip
          color="info"
          variant="tonal"
          prepend-icon="mdi-account-tie"
        >
          De: usuarios activos
        </v-chip>
        <MassPurgeButton
          endpoint="/kpi_inventory/ordenes-servicio/purge-all"
          module-title="Ordenes de servicio"
          @purged="hydrateView"
        />
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
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="Buscar por código, destinatario, emisor o lugar de entrega"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-autocomplete v-model="supplierFilter" :items="supplierOptions" item-title="title" item-value="value" label="Destinatario" variant="outlined" density="compact" clearable />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-autocomplete v-model="emitterFilter" :items="userOptions" item-title="title" item-value="value" label="Emisor" variant="outlined" density="compact" clearable />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select v-model="statusFilter" :items="serviceStatusOptions" label="Estado" variant="outlined" density="compact" clearable />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select v-model="performedFilter" :items="performedFilterOptions" label="Servicio realizado" variant="outlined" density="compact" clearable />
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-text-field v-model="dateFromFilter" type="date" label="Desde" variant="outlined" density="compact" clearable />
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-text-field v-model="dateToFilter" type="date" label="Hasta" variant="outlined" density="compact" clearable />
      </v-col>
      <v-col cols="12" md="2" class="d-flex align-center justify-end" style="gap: 8px; flex-wrap: wrap;">
        <v-btn variant="tonal" prepend-icon="mdi-filter-check" :loading="loading" @click="applyFilters">Aplicar</v-btn>
        <v-btn variant="text" prepend-icon="mdi-filter-off" :disabled="!hasActiveFilters" @click="clearFilters">Limpiar</v-btn>
      </v-col>
    </v-row>

    <v-data-table-server
      :headers="headers"
      :items="tableRows"
      :items-length="serverTotalItems"
      :loading="loading"
      loading-text="Obteniendo órdenes de servicio..."
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

      <template #item.equipos_label="{ item }">
        <div class="d-flex flex-wrap" style="gap: 4px;">
          <v-chip
            v-for="equipment in normalizeEquipmentLabels(item.equipos_label)"
            :key="`${item.id}-${equipment}`"
            size="x-small"
            variant="tonal"
            color="secondary"
          >
            {{ equipment }}
          </v-chip>
          <span v-if="!normalizeEquipmentLabels(item.equipos_label).length" class="text-medium-emphasis">-</span>
        </div>
      </template>

      <template #item.servicio_realizado="{ item }">
        <div class="d-flex align-center justify-center">
          <v-checkbox-btn
            :model-value="Boolean(item.servicio_realizado)"
            color="success"
            :disabled="!canEdit || Boolean(item.servicio_realizado)"
            @update:model-value="toggleServicePerformed(item, $event)"
          />
        </div>
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
            @click="openEdit(item)"
          />
          <v-btn
            v-if="canDelete"
            icon="mdi-delete"
            variant="text"
            color="error"
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
        {{ editingId ? "Editar orden de servicio" : "Nueva orden de servicio" }}
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
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.fecha_emision"
              type="date"
              label="Fecha"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="form.proveedor_id"
              :items="supplierOptions"
              item-title="title"
              item-value="value"
              label="Para"
              variant="outlined"
              clearable
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.emitido_por_user_id"
              :items="userOptions"
              item-title="title"
              item-value="value"
              label="De"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="form.equipo_ids"
              :items="equipmentOptions"
              item-title="title"
              item-value="value"
              label="Equipos atendidos"
              variant="outlined"
              multiple
              chips
              closable-chips
              clearable
              hint="Estos equipos se usan para detener las alertas de mantenimiento por tiempo cuando marques el servicio como realizado."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.lugar_entrega"
              label="Lugar de entrega"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.forma_pago"
              label="Forma de pago"
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
            <div class="text-subtitle-1 font-weight-bold">Detalle de servicios</div>
            <div class="text-body-2 text-medium-emphasis">
              Solo se listan materiales con el check <strong>Es servicio</strong>.
            </div>
          </div>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addDetail">
            Agregar servicio
          </v-btn>
        </div>

        <div class="order-details-table">
          <table class="details-table">
            <thead>
              <tr>
                <th class="material-column">Servicio</th>
                <th class="compact-column">Cant.</th>
                <th class="compact-column">P. unit.</th>
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
                    :items="catalogProductOptions"
                    item-title="title"
                    item-value="value"
                    label="Servicio"
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

        <div class="d-flex flex-wrap justify-end mt-4 purchase-summary" style="gap: 12px;">
          <v-chip color="info" variant="tonal">Subtotal: {{ formatCurrency(orderTotals.subtotal) }}</v-chip>
          <v-chip color="warning" variant="tonal">Descuento: {{ formatCurrency(orderTotals.descuento) }}</v-chip>
          <v-chip color="secondary" variant="tonal">Subtotal con desc.: {{ formatCurrency(orderTotals.subtotalConDescuento) }}</v-chip>
          <v-chip color="primary" variant="tonal">IVA: {{ formatCurrency(orderTotals.iva) }}</v-chip>
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
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar orden de servicio</v-card-title>
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
import { downloadServiceOrderPdf } from "@/app/utils/service-order-documents";
import { formatDateForInput, formatDateOnly } from "@/app/utils/date-time";
import { DEFAULT_CATALOG_CACHE_TTL_MS } from "@/app/utils/request-cache";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import MassPurgeButton from "@/components/common/MassPurgeButton.vue";

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

type ServiceOrderRow = {
  id: string;
  codigo: string;
  fecha_emision?: string | null;
  proveedor_nombre?: string | null;
  emitido_por_nombre?: string | null;
  lugar_entrega?: string | null;
  estado?: string | null;
  total?: string | number | null;
  equipos_label?: string[] | null;
  servicio_realizado?: boolean;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "ordenes-servicio",
    "ordenes de servicio",
    "órdenes de servicio",
    "servicios",
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
const supplierFilter = ref("");
const emitterFilter = ref("");
const statusFilter = ref("");
const performedFilter = ref("");
const dateFromFilter = ref("");
const dateToFilter = ref("");
const serverPage = ref(1);
const serverItemsPerPage = ref(15);
const serverTotalItems = ref(0);
let serverFetchTimer: ReturnType<typeof setTimeout> | null = null;
let serverRequestId = 0;
const SERVICE_ORDER_DEFAULT_IVA = 15;
const orders = ref<ServiceOrderRow[]>([]);
const suppliers = ref<any[]>([]);
const products = ref<any[]>([]);
const users = ref<any[]>([]);
const equipments = ref<any[]>([]);
const deletingOrder = ref<ServiceOrderRow | null>(null);
const suppliersLoaded = ref(false);
const productsLoaded = ref(false);
const usersLoaded = ref(false);
const equipmentsLoaded = ref(false);
const serviceStatusOptions = [
  { title: "Emitida", value: "EMITIDA" },
  { title: "Servicio realizado", value: "SERVICIO_REALIZADO" },
  { title: "Cerrada", value: "CERRADA" },
  { title: "Anulada", value: "ANULADA" },
];
const performedFilterOptions = [
  { title: "Sí", value: "true" },
  { title: "No", value: "false" },
];
const hasActiveFilters = computed(() =>
  [
    search.value,
    supplierFilter.value,
    emitterFilter.value,
    statusFilter.value,
    performedFilter.value,
    dateFromFilter.value,
    dateToFilter.value,
  ].some((value) => String(value || "").trim()),
);

const form = reactive({
  codigo: "",
  fecha_emision: formatDateForInput(),
  proveedor_id: "",
  emitido_por_user_id: "",
  equipo_ids: [] as string[],
  lugar_entrega: "",
  forma_pago: "A CONVENIR",
  observacion: "",
  detalles: [] as OrderDetailForm[],
});

const headers = [
  { title: "Código", key: "codigo" },
  { title: "Fecha", key: "fecha_emision_label" },
  { title: "Para", key: "proveedor_nombre" },
  { title: "De", key: "emitido_por_nombre" },
  { title: "Lugar entrega", key: "lugar_entrega" },
  { title: "Estado", key: "estado" },
  { title: "Equipos", key: "equipos_label", sortable: false },
  { title: "Total", key: "total" },
  { title: "Servicio realizado", key: "servicio_realizado", sortable: false, align: "center" as const },
  { title: "Acciones", key: "actions", sortable: false },
];

const supplierOptions = computed<CatalogOption[]>(() =>
  suppliers.value.map((item) => ({
    value: String(item.id),
    title: `${item.identificacion ? `${item.identificacion} - ` : ""}${item.razon_social || item.nombre_comercial || item.id}`,
  })),
);

const userOptions = computed<CatalogOption[]>(() =>
  users.value.map((item) => ({
    value: String(item.id || item.nameUser || item.email || item.nameSurname || ""),
    title: getActiveUserDisplayName(item),
  })),
);

const equipmentOptions = computed<CatalogOption[]>(() =>
  equipments.value.map((item) => ({
    value: String(item.id),
    title: [item.codigo, item.nombre_real || item.nombre].filter(Boolean).join(" - "),
  })),
);

const serviceProducts = computed(() =>
  products.value.filter((item) => Boolean(item?.es_servicio)),
);

const catalogProductOptions = computed<CatalogOption[]>(() =>
  serviceProducts.value.map((item) => ({
    value: String(item.id),
    title: `${buildProductDisplayTitle(item)} - costo ${formatCurrency(item.costo_promedio || item.ultimo_costo || 0)}`,
  })),
);

const tableRows = computed(() =>
  orders.value.map((item) => ({
    ...item,
    fecha_emision_label: formatDate(item.fecha_emision),
  })),
);

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
      const subtotalConDescuento = Math.max(0, gross - discount);
      const iva =
        subtotalConDescuento *
        (toNumber(detail.iva_porcentaje || SERVICE_ORDER_DEFAULT_IVA) / 100);
      acc.subtotal += gross;
      acc.descuento += discount;
      acc.subtotalConDescuento += subtotalConDescuento;
      acc.iva += iva;
      acc.total += subtotalConDescuento + iva;
      return acc;
    },
    { subtotal: 0, descuento: 0, subtotalConDescuento: 0, iva: 0, total: 0 },
  );
});

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
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
  return formatDateOnly(value, String(value ?? ""));
}

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getServiceOrderCodeRank(code: string) {
  const normalized = String(code || "").trim();
  const currentMatch = /^JCTI-OS(\d+)$/i.exec(normalized);
  if (currentMatch) return Number(currentMatch[1] || "0");
  const legacyMatch = /^RJCTI-\d{4}-([A-Z])(\d{7})$/i.exec(normalized);
  if (!legacyMatch) return -1;
  const letterRank = (legacyMatch[1] || "A").toUpperCase().charCodeAt(0) - 65;
  const number = Number(legacyMatch[2] || "0");
  return letterRank * 9999999 + number;
}

function nextServiceOrderCode(lastCode: string | null) {
  const currentNumber = getServiceOrderCodeRank(lastCode || "");
  return `JCTI-OS${String(Math.max(0, currentNumber) + 1).padStart(6, "0")}`;
}

function getHighestServiceOrderCode(codes: string[]) {
  return codes
    .map((item) => String(item || "").trim())
    .filter((item) => getServiceOrderCodeRank(item) >= 0)
    .sort((a, b) => getServiceOrderCodeRank(b) - getServiceOrderCodeRank(a))[0] ?? null;
}

function createEmptyDetail(): OrderDetailForm {
  return {
    local_id: createLocalId(),
    producto_id: "",
    cantidad: "1",
    costo_unitario: "0",
    descuento: "0",
    porcentaje_descuento: "0",
    iva_porcentaje: String(SERVICE_ORDER_DEFAULT_IVA),
    observacion: "",
  };
}

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function getCurrentUserCatalogId() {
  return String(
    auth.user?.id ||
      auth.user?.nameUser ||
      auth.user?.email ||
      "",
  );
}

function getActiveUserDisplayName(item: any) {
  return String(item?.nameSurname || item?.nameUser || item?.email || item?.id || "").trim();
}

function normalizeEquipmentLabels(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function orderStateColor(value: string | null | undefined) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "ANULADA") return "error";
  if (normalized === "SERVICIO_REALIZADO") return "success";
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
  const iva =
    subtotal *
    (toNumber(detail.iva_porcentaje || SERVICE_ORDER_DEFAULT_IVA) / 100);
  return subtotal + iva;
}

function resetForm() {
  const lastCode = getHighestServiceOrderCode(orders.value.map((item) => item?.codigo || ""));
  form.codigo = nextServiceOrderCode(lastCode);
  form.fecha_emision = formatDateForInput();
  form.proveedor_id = "";
  form.emitido_por_user_id = getCurrentUserCatalogId();
  form.equipo_ids = [];
  form.lugar_entrega = "";
  form.forma_pago = "A CONVENIR";
  form.observacion = "";
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
  const product = serviceProducts.value.find((item) => String(item.id) === String(detail.producto_id));
  if (!product) return;
  detail.costo_unitario = String(product.costo_promedio || product.ultimo_costo || 0);
  if (!detail.iva_porcentaje) {
    detail.iva_porcentaje = String(SERVICE_ORDER_DEFAULT_IVA);
  }
}

async function loadOrders() {
  const requestId = ++serverRequestId;
  const response = await fetchPaginatedResource(
    "/kpi_inventory/ordenes-servicio",
    {
      search: search.value || undefined,
      proveedor_id: supplierFilter.value || undefined,
      emitido_por_user_id: emitterFilter.value || undefined,
      estado: statusFilter.value || undefined,
      servicio_realizado: performedFilter.value || undefined,
      desde: dateFromFilter.value || undefined,
      hasta: dateToFilter.value || undefined,
    },
    {
      page: serverPage.value,
      limit: serverItemsPerPage.value,
    },
  );
  if (requestId !== serverRequestId) return;
  orders.value = response.data as ServiceOrderRow[];
  serverPage.value = response.pagination.page;
  serverItemsPerPage.value = response.pagination.limit;
  serverTotalItems.value = response.pagination.total;
}

async function ensureSuppliersLoaded(force = false) {
  if (suppliersLoaded.value && !force) return;
  suppliers.value = await listAllPages(
    "/kpi_inventory/terceros",
    {},
    { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
  );
  suppliersLoaded.value = true;
}

async function ensureProductsLoaded(force = false) {
  if (productsLoaded.value && !force) return;
  products.value = await listAllPages(
    "/kpi_inventory/productos",
    {},
    { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
  );
  productsLoaded.value = true;
}

async function ensureUsersLoaded(force = false) {
  if (usersLoaded.value && !force) return;
  const rows = await listAllPages(
    "/kpi_security/users",
    { includeDeleted: false },
    { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
  );
  users.value = Array.isArray(rows)
    ? rows.filter(
        (item: any) =>
          !item?.isDeleted &&
          String(item?.status || "ACTIVE").trim().toUpperCase() === "ACTIVE",
      )
    : [];
  usersLoaded.value = true;
}

async function ensureEquipmentsLoaded(force = false) {
  if (equipmentsLoaded.value && !force) return;
  equipments.value = await listAllPages(
    "/kpi_maintenance/equipos",
    {},
    { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
  );
  equipmentsLoaded.value = true;
}

async function loadCatalogs() {
  await Promise.all([
    ensureSuppliersLoaded(),
    ensureProductsLoaded(),
    ensureUsersLoaded(),
    ensureEquipmentsLoaded(),
  ]);
}

async function hydrateView() {
  if (!canRead.value) return;
  loading.value = true;
  try {
    await Promise.all([
      loadOrders(),
      ensureSuppliersLoaded(),
      ensureUsersLoaded(),
    ]);
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar el módulo de órdenes de servicio.",
    );
  } finally {
    loading.value = false;
  }
}

function handleServerOptionsUpdate(options: { page?: number; itemsPerPage?: number }) {
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

function applyFilters() {
  serverPage.value = 1;
  void hydrateView();
}

function clearFilters() {
  search.value = "";
  supplierFilter.value = "";
  emitterFilter.value = "";
  statusFilter.value = "";
  performedFilter.value = "";
  dateFromFilter.value = "";
  dateToFilter.value = "";
  serverPage.value = 1;
}

async function openCreate() {
  editingId.value = null;
  resetForm();
  dialog.value = true;
  await loadCatalogs();
}

async function openEdit(item: ServiceOrderRow) {
  editingId.value = item.id;
  loading.value = true;
  try {
    await loadCatalogs();
    const { data } = await api.get(`/kpi_inventory/ordenes-servicio/${item.id}`);
    const order = (data?.data ?? data) as any;
    form.codigo = String(order.codigo || "");
    form.fecha_emision = String(order.fecha_emision || "").slice(0, 10);
    form.proveedor_id = String(order.proveedor_id || "");
    form.emitido_por_user_id = String(order.emitido_por_user_id || "");
    form.equipo_ids = Array.isArray(order.equipos)
      ? order.equipos
          .map((equipment: any) => String(equipment.equipo_id || equipment.id || ""))
          .filter(Boolean)
      : [];
    form.lugar_entrega = String(order.lugar_entrega || "");
    form.forma_pago = String(order.forma_pago || "");
    form.observacion = String(order.observacion || "");
    form.detalles = Array.isArray(order.detalles) && order.detalles.length
      ? order.detalles.map((detail: any) => ({
          local_id: createLocalId(),
          producto_id: String(detail.producto_id || ""),
          cantidad: String(detail.cantidad || "1"),
          costo_unitario: String(detail.costo_unitario || "0"),
          descuento: String(detail.descuento || "0"),
          porcentaje_descuento: String(detail.porcentaje_descuento || "0"),
          iva_porcentaje: String(
            detail.iva_porcentaje || String(SERVICE_ORDER_DEFAULT_IVA),
          ),
          observacion: String(detail.observacion || ""),
        }))
      : [createEmptyDetail()];
    dialog.value = true;
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar la orden de servicio.",
    );
  } finally {
    loading.value = false;
  }
}

function openDelete(item: ServiceOrderRow) {
  deletingOrder.value = item;
  deleteDialog.value = true;
}

function validateForm() {
  if (!form.proveedor_id) {
    ui.error("Debes seleccionar para quién va la orden.");
    return false;
  }
  if (!form.emitido_por_user_id) {
    ui.error("Debes seleccionar quién emite la orden.");
    return false;
  }
  if (!form.detalles.length) {
    ui.error("Debes agregar al menos un servicio.");
    return false;
  }
  for (const detail of form.detalles) {
    if (!detail.producto_id) {
      ui.error("Todos los detalles deben tener un servicio seleccionado.");
      return false;
    }
    if (!(toNumber(detail.cantidad) > 0)) {
      ui.error("La cantidad de cada servicio debe ser mayor a cero.");
      return false;
    }
  }
  return true;
}

function buildPayload() {
  const emitter = users.value.find(
    (item) => String(item.id || item.nameUser || item.email || "") === String(form.emitido_por_user_id),
  );
  return {
    fecha_emision: form.fecha_emision || undefined,
    proveedor_id: form.proveedor_id || undefined,
    emitido_por_user_id: form.emitido_por_user_id || undefined,
    emitido_por_nombre: emitter ? getActiveUserDisplayName(emitter) : undefined,
    lugar_entrega: form.lugar_entrega || undefined,
    forma_pago: form.forma_pago || undefined,
    observacion: form.observacion || undefined,
    moneda: "USD",
    created_by: getUserName(),
    updated_by: getUserName(),
    equipo_ids: form.equipo_ids,
    detalles: form.detalles.map((detail) => ({
      producto_id: detail.producto_id,
      cantidad: toNumber(detail.cantidad),
      costo_unitario: toNumber(detail.costo_unitario),
      descuento: toNumber(detail.descuento),
      porcentaje_descuento: toNumber(detail.porcentaje_descuento),
      iva_porcentaje: toNumber(
        detail.iva_porcentaje || SERVICE_ORDER_DEFAULT_IVA,
      ),
      observacion: detail.observacion || undefined,
    })),
  };
}

async function saveOrder() {
  if (!validateForm()) return;
  if (!editingId.value && !canCreate.value) {
    ui.error("No tienes permisos para crear órdenes de servicio.");
    return;
  }
  if (editingId.value && !canEdit.value) {
    ui.error("No tienes permisos para editar órdenes de servicio.");
    return;
  }

  saving.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await api.patch(`/kpi_inventory/ordenes-servicio/${editingId.value}`, payload);
      ui.success("Orden de servicio actualizada correctamente.");
    } else {
      await api.post("/kpi_inventory/ordenes-servicio", payload);
      ui.success("Orden de servicio generada correctamente.");
    }
    dialog.value = false;
    await loadOrders();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo guardar la orden de servicio.",
    );
  } finally {
    saving.value = false;
  }
}

async function toggleServicePerformed(item: ServiceOrderRow, value: boolean | null) {
  if (!value || !item?.id || item.servicio_realizado) return;
  if (!canEdit.value) {
    ui.error("No tienes permisos para marcar el servicio realizado.");
    return;
  }

  saving.value = true;
  try {
    await api.patch(`/kpi_inventory/ordenes-servicio/${item.id}/servicio-realizado`, {
      servicio_realizado: true,
    });
    ui.success("La orden de servicio se marco como realizada.");
    await loadOrders();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo marcar la orden como servicio realizado.",
    );
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!deletingOrder.value) return;
  saving.value = true;
  try {
    await api.delete(`/kpi_inventory/ordenes-servicio/${deletingOrder.value.id}`);
    ui.success("Orden de servicio eliminada correctamente.");
    deleteDialog.value = false;
    deletingOrder.value = null;
    await loadOrders();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo eliminar la orden de servicio.",
    );
  } finally {
    saving.value = false;
  }
}

async function downloadPdf(item: ServiceOrderRow) {
  if (!canDownloadPdf.value) {
    ui.error("No tienes permisos para descargar este reporte.");
    return;
  }
  try {
    const { data } = await api.get(`/kpi_inventory/ordenes-servicio/${item.id}`);
    await downloadServiceOrderPdf(data?.data ?? data, getUserName());
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo generar el PDF de la orden de servicio.",
    );
  }
}

onMounted(async () => {
  if (!canRead.value) return;
  await hydrateView();
  resetForm();
});

watch(
  () => [
    search.value,
    supplierFilter.value,
    emitterFilter.value,
    statusFilter.value,
    performedFilter.value,
    dateFromFilter.value,
    dateToFilter.value,
  ],
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

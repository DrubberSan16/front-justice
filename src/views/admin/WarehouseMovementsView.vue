<template>
  <EnterprisePageMotion>
    <v-row dense>
      <v-col cols="12">
        <v-card rounded="xl" class="enterprise-surface pa-4">
          <div class="d-flex align-center justify-space-between flex-wrap mb-4" style="gap:12px">
            <div>
              <div class="text-h6 font-weight-bold">{{ pageTitle }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ pageSubtitle }}</div>
            </div>
            <div class="d-flex align-center flex-wrap" style="gap:8px">
              <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadDocuments()">
                Recargar
              </v-btn>
              <v-btn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="formDialog = true">
                {{ isIncome ? "Nuevo ingreso" : "Nuevo egreso" }}
              </v-btn>
            </div>
          </div>

          <v-row dense>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.desde" type="date" label="Fecha inicio" variant="outlined"
                density="comfortable" hide-details />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.hasta" type="date" label="Fecha fin" variant="outlined"
                density="comfortable" hide-details />
            </v-col>
            <v-col cols="12" md="3">
              <v-autocomplete v-model="filters.bodegaId" :items="warehouseOptions" item-title="title" item-value="value"
                label="Bodega" variant="outlined" density="comfortable" clearable hide-details
                :loading="catalogLoading" />
            </v-col>
            <v-col cols="12" md="3">
              <v-autocomplete v-model="filters.productoId" :items="productOptions" item-title="title" item-value="value"
                label="Material" variant="outlined" density="comfortable" clearable hide-details
                :loading="catalogLoading" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="filters.origen" :items="originOptions" item-title="title" item-value="value"
                label="Tipo de movimiento" variant="outlined" density="comfortable" clearable hide-details />
            </v-col>
            <v-col cols="12" md="3">
              <v-autocomplete v-model="filters.equipoTipoId" :items="equipmentTypeOptions" item-title="title"
                item-value="value" label="Tipo de equipo" variant="outlined" density="comfortable" clearable
                hide-details :loading="catalogLoading" @update:model-value="handleEquipmentTypeChange" />
            </v-col>
            <v-col cols="12" md="3">
              <v-autocomplete v-model="filters.equipmentId" :items="equipmentOptions" item-title="title"
                item-value="value" label="Equipo" variant="outlined" density="comfortable" clearable hide-details
                :disabled="!filters.equipoTipoId" :loading="equipmentLoading"
                no-data-text="Selecciona primero un tipo de equipo" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.search" label="Búsqueda general" variant="outlined" density="comfortable"
                clearable hide-details placeholder="Documento, código, nombre o descripción"
                prepend-inner-icon="mdi-magnify" @keyup.enter="applyFilters" />
            </v-col>
            <v-col cols="12" class="d-flex align-center flex-wrap justify-end" style="gap:8px">
              <v-checkbox v-if="canViewAnnulled" v-model="filters.includeAnnulled" density="compact" hide-details
                label="Ver anulados" @update:model-value="applyFilters" />
              <v-btn variant="tonal" prepend-icon="mdi-filter-check" :loading="loading" @click="applyFilters">
                Aplicar
              </v-btn>
              <v-btn variant="text" prepend-icon="mdi-filter-off" :disabled="!hasActiveFilters" @click="clearFilters">
                Limpiar
              </v-btn>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card rounded="xl" class="enterprise-surface">
          <v-data-table-server :headers="headers" :items="documents" :items-length="pagination.total"
            :loading="loading" :page="pagination.page" :items-per-page="pagination.limit"
            :items-per-page-options="[10, 25, 50, 100]"
            @update:page="changePage" @update:items-per-page="changeLimit">
            <template #item.numero_documento="{ item }">
              <a class="document-link" href="#" @click.prevent="openDetail(item)">
                {{ item.numero_documento || "Sin código" }}
              </a>
              <div v-if="item.anulado" class="text-caption text-error">Anulado</div>
            </template>
            <template #item.fecha_movimiento="{ item }">
              {{ formatDateTime(item.fecha_movimiento, "-") }}
            </template>
            <template #item.total_cantidad="{ item }">
              {{ formatNumberForDisplay(item.total_cantidad) }}
            </template>
            <template #item.actions="{ item }">
              <RowActionsMenu :actions="rowActions(item)" @select="(key) => runRowAction(key, item)" />
            </template>
            <template #no-data>
              <div class="pa-4 text-medium-emphasis">
                No hay documentos con los filtros aplicados.
              </div>
            </template>
          </v-data-table-server>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="detailDialog.open" max-width="1180" scrollable>
      <v-card rounded="xl" class="enterprise-surface">
        <v-card-title class="d-flex align-center justify-space-between flex-wrap" style="gap:12px">
          <div>
            <div class="text-h6 font-weight-bold">
              {{ detailDialog.document?.tipo_documento_label || "Documento de bodega" }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ detailDialog.document?.numero_documento || detailDialog.documentNumber || "-" }}
              · {{ detailDialog.document?.bodega_label || "Sin bodega" }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="detailDialog.open = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div v-if="detailDialog.loading" class="d-flex align-center justify-center pa-8" style="gap:12px">
            <v-progress-circular indeterminate color="primary" />
            <span>Cargando el documento...</span>
          </div>
          <v-alert v-else-if="detailDialog.error" type="warning" variant="tonal" rounded="xl"
            :text="detailDialog.error" />
          <template v-else-if="detailDialog.document">
            <div class="summary-chip-list mb-4">
              <v-chip variant="tonal" color="primary">
                {{ formatDateTime(detailDialog.document.fecha_movimiento, "-") }}
              </v-chip>
              <v-chip variant="tonal">{{ detailDialog.document.total_items || 0 }} ítems</v-chip>
              <v-chip variant="tonal">
                {{ formatNumberForDisplay(detailDialog.document.total_cantidad) }} unidades
              </v-chip>
              <v-chip variant="tonal">{{ detailDialog.document.created_by || "SYSTEM" }}</v-chip>
              <v-chip v-if="detailDialog.document.referencia" variant="tonal">
                Ref. {{ detailDialog.document.referencia }}
              </v-chip>
            </div>
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Código</th>
                  <th>Material</th>
                  <th>Condición</th>
                  <th class="text-right">Cantidad</th>
                  <th v-if="canViewCosts" class="text-right">Costo unitario</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(detail, index) in documentDetails" :key="detail.id || index">
                  <td>{{ index + 1 }}</td>
                  <td>{{ detail.producto_codigo || "-" }}</td>
                  <td>{{ detail.producto_nombre || "-" }}</td>
                  <td>{{ detail.condicion_material || "-" }}</td>
                  <td class="text-right">{{ formatNumberForDisplay(detail.cantidad) }}</td>
                  <td v-if="canViewCosts" class="text-right">
                    {{ formatMoney(detail.costo_unitario) }}
                  </td>
                  <td>{{ detail.observacion || "-" }}</td>
                </tr>
              </tbody>
            </v-table>
          </template>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-5 py-4 d-flex justify-end flex-wrap" style="gap:12px">
          <v-btn v-if="canAnnul && detailDialog.document && !detailDialog.document.anulado" color="error"
            variant="tonal" prepend-icon="mdi-cancel" :loading="annulling" @click="annulDocument">
            Anular movimiento
          </v-btn>
          <v-btn variant="text" @click="detailDialog.open = false">Cerrar</v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-file-excel" :disabled="!detailDialog.document"
            @click="previewDocument('excel')">
            Previsualizar Excel
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-file-pdf-box" :disabled="!detailDialog.document"
            @click="previewDocument('pdf')">
            Previsualizar PDF
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <WarehouseMovementFormDialog v-model="formDialog" :movement-type="movementType" @saved="loadDocuments(1)" />

    <ReportPreviewDialogs :preview="reportPreview" />
  </EnterprisePageMotion>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
import { formatDateTime } from "@/app/utils/date-time";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { buildEquipmentDisplayTitle } from "@/app/utils/equipment-display";
import { DEFAULT_CONTEXT_CACHE_TTL_MS } from "@/app/utils/request-cache";
import {
  canManageAdministrativeOperations,
  canViewAnnulledRecords,
  canViewMaterialCosts,
} from "@/app/utils/role-access";
import { buildWarehouseMovementReport } from "@/app/utils/warehouse-movement-documents";
import { useReportPreview } from "@/app/utils/report-preview";
import type { RowAction } from "@/app/utils/row-actions";
import EnterprisePageMotion from "@/components/ui/EnterprisePageMotion.vue";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";
import RowActionsMenu from "@/components/ui/RowActionsMenu.vue";
import WarehouseMovementFormDialog from "@/components/inventory/WarehouseMovementFormDialog.vue";

/**
 * Ingresos y egresos de bodega como pantalla propia.
 *
 * Eran dos botones dentro del Kardex, que es un reporte de saldos: quien
 * registra mercaderia entrando o saliendo no viene a consultar el saldo,
 * viene a hacer el movimiento y a encontrar el que hizo ayer. La misma vista
 * sirve a los dos casos porque solo cambia el tipo; los filtros, la lista y el
 * documento son identicos.
 */
const props = defineProps<{ movementType: "INGRESO" | "SALIDA" }>();

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const route = useRoute();
const reportPreview = useReportPreview();

const isIncome = computed(() => props.movementType === "INGRESO");
const pageTitle = computed(() =>
  isIncome.value ? "Ingresos de bodega" : "Egresos de bodega",
);
const pageSubtitle = computed(() =>
  isIncome.value
    ? "Mercadería que entra a una bodega, con su documento IB."
    : "Material que sale de una bodega, con su documento EB.",
);

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    isIncome.value ? "ingresos-bodega" : "egresos-bodega",
    "kardex",
    "inventario",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canDelete = computed(() => perms.value.permitDeleted);
const canViewCosts = computed(() => canViewMaterialCosts(auth.user));
const canViewAnnulled = computed(() => canViewAnnulledRecords(auth.user));
const canAnnul = computed(
  () => canDelete.value && canManageAdministrativeOperations(auth.user),
);

const loading = ref(false);
const catalogLoading = ref(false);
const equipmentLoading = ref(false);
const annulling = ref(false);
const formDialog = ref(false);
const documents = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const products = ref<any[]>([]);
const equipmentTypes = ref<any[]>([]);
const equipments = ref<any[]>([]);

const filters = reactive({
  desde: "",
  hasta: "",
  bodegaId: "",
  productoId: "",
  origen: "",
  equipoTipoId: "",
  equipmentId: "",
  search: "",
  includeAnnulled: false,
});

const pagination = reactive({ page: 1, limit: 25, total: 0 });

const detailDialog = reactive({
  open: false,
  loading: false,
  error: "",
  documentNumber: "",
  document: null as any,
});

/**
 * De donde nace el movimiento. Coincide con lo que entiende el backend en el
 * parametro `origen`.
 */
const originOptions = [
  { value: "MANUAL", title: "Manual" },
  { value: "ORDEN_COMPRA", title: "Orden de compra" },
  { value: "TRANSFERENCIA_BODEGA", title: "Transferencia de bodega" },
  { value: "ORDEN_TRABAJO", title: "Orden de trabajo" },
];

const headers = computed(() => [
  { title: "Documento", key: "numero_documento", sortable: false },
  { title: "Fecha", key: "fecha_movimiento", sortable: false },
  { title: "Bodega", key: "bodega_label", sortable: false },
  { title: "Concepto", key: "tipo_documento_label", sortable: false },
  { title: "Referencia", key: "referencia", sortable: false },
  { title: "Ítems", key: "total_items", sortable: false },
  { title: "Cantidad", key: "total_cantidad", sortable: false },
  { title: "Responsable", key: "created_by", sortable: false },
  { title: "Acciones", key: "actions", sortable: false },
]);

const warehouseOptions = computed(() =>
  warehouses.value.map((bodega) => ({
    value: bodega.id,
    title: `${bodega.codigo || ""} - ${bodega.nombre || ""}`.trim(),
  })),
);

const productOptions = computed(() =>
  products.value.map((product) => ({
    value: product.id,
    title: buildProductDisplayTitle(product),
  })),
);

const equipmentTypeOptions = computed(() =>
  equipmentTypes.value.map((type) => ({
    value: type.id,
    title: type.nombre || type.codigo || type.id,
  })),
);

const equipmentOptions = computed(() =>
  equipments.value.map((equipment) => ({
    value: equipment.id,
    title: buildEquipmentDisplayTitle(equipment),
  })),
);

const documentDetails = computed<any[]>(() =>
  Array.isArray(detailDialog.document?.detalles)
    ? detailDialog.document.detalles
    : [],
);

const hasActiveFilters = computed(() =>
  Boolean(
    filters.desde ||
      filters.hasta ||
      filters.bodegaId ||
      filters.productoId ||
      filters.origen ||
      filters.equipoTipoId ||
      filters.equipmentId ||
      filters.search ||
      filters.includeAnnulled,
  ),
);

function formatMoney(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      })
    : "-";
}

function buildRequestParams() {
  return {
    page: pagination.page,
    limit: pagination.limit,
    tipo_movimiento: props.movementType,
    search: filters.search || undefined,
    desde: filters.desde || undefined,
    hasta: filters.hasta || undefined,
    bodega_id: filters.bodegaId || undefined,
    producto_id: filters.productoId || undefined,
    origen: filters.origen || undefined,
    equipo_tipo_id: filters.equipoTipoId || undefined,
    equipment_id: filters.equipmentId || undefined,
    include_annulled: filters.includeAnnulled ? true : undefined,
  };
}

async function loadDocuments(page = pagination.page) {
  if (!canRead.value) return;
  pagination.page = page;
  loading.value = true;
  try {
    const { data } = await api.get("/kpi_inventory/kardex/documentos/lista", {
      params: buildRequestParams(),
    });
    const payload = data?.data ?? data ?? {};
    documents.value = Array.isArray(payload.data) ? payload.data : [];
    pagination.total = Number(payload.pagination?.total ?? documents.value.length);
  } catch (error: any) {
    documents.value = [];
    pagination.total = 0;
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudieron cargar los documentos de bodega.",
    );
  } finally {
    loading.value = false;
  }
}

async function loadCatalogs() {
  catalogLoading.value = true;
  try {
    const [bodegas, productos, tipos] = await Promise.all([
      listAllPages("/kpi_inventory/bodegas", {}, { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS }),
      listAllPages("/kpi_inventory/productos", {}, { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS }),
      listAllPages("/kpi_maintenance/tipo-equipo", {}, { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS }),
    ]);
    warehouses.value = Array.isArray(bodegas) ? bodegas : [];
    products.value = (Array.isArray(productos) ? productos : []).filter(
      (product: any) => !product?.es_servicio,
    );
    equipmentTypes.value = Array.isArray(tipos) ? tipos : [];
  } catch {
    // Sin catalogo los selectores quedan vacios, pero la lista se sigue
    // consultando con los filtros que si estan disponibles.
    warehouses.value = [];
    products.value = [];
    equipmentTypes.value = [];
  } finally {
    catalogLoading.value = false;
  }
}

/**
 * El selector de equipo solo se llena cuando ya hay un tipo elegido: el
 * catalogo completo mezcla flota y planta y obliga a buscar a ciegas.
 */
async function handleEquipmentTypeChange() {
  filters.equipmentId = "";
  equipments.value = [];
  const typeId = String(filters.equipoTipoId || "").trim();
  if (!typeId) return;
  equipmentLoading.value = true;
  try {
    const rows = await listAllPages(
      "/kpi_maintenance/equipos",
      { equipo_tipo_id: typeId },
      { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS },
    );
    equipments.value = Array.isArray(rows) ? rows : [];
  } catch {
    equipments.value = [];
  } finally {
    equipmentLoading.value = false;
  }
}

function applyFilters() {
  void loadDocuments(1);
}

function clearFilters() {
  filters.desde = "";
  filters.hasta = "";
  filters.bodegaId = "";
  filters.productoId = "";
  filters.origen = "";
  filters.equipoTipoId = "";
  filters.equipmentId = "";
  filters.search = "";
  filters.includeAnnulled = false;
  equipments.value = [];
  void loadDocuments(1);
}

function changePage(page: number) {
  void loadDocuments(page);
}

function changeLimit(limit: number) {
  pagination.limit = limit;
  void loadDocuments(1);
}

async function openDetail(item: any, forceAnnulled = false) {
  const documentId = String(item?.id || "").trim();
  if (!documentId) return;
  Object.assign(detailDialog, {
    open: true,
    loading: true,
    error: "",
    documentNumber: item?.numero_documento || "",
    document: null,
  });
  try {
    const { data } = await api.get(
      `/kpi_inventory/kardex/documentos/${documentId}`,
      {
        params: {
          include_annulled:
            forceAnnulled || item?.anulado || filters.includeAnnulled
              ? true
              : undefined,
        },
      },
    );
    detailDialog.document = data?.data ?? data ?? null;
  } catch (error: any) {
    detailDialog.error =
      error?.response?.data?.message ||
      error?.message ||
      "No se pudo cargar el documento de bodega.";
  } finally {
    detailDialog.loading = false;
  }
}

async function previewDocument(format: "pdf" | "excel") {
  if (!detailDialog.document) return;
  await reportPreview.open(
    format,
    buildWarehouseMovementReport(detailDialog.document, {
      includeCosts: canViewCosts.value,
    }),
  );
}

async function annulDocument() {
  const documentId = String(detailDialog.document?.id || "").trim();
  if (!documentId || annulling.value) return;
  if (
    !window.confirm(
      "¿Anular este movimiento? El stock de la bodega se revertirá a su estado anterior.",
    )
  ) {
    return;
  }
  annulling.value = true;
  try {
    await api.patch(`/kpi_inventory/kardex/documentos/${documentId}/anular`);
    ui.success("Movimiento anulado y stock revertido correctamente.");
    detailDialog.open = false;
    await loadDocuments();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo anular el documento de bodega.",
    );
  } finally {
    annulling.value = false;
  }
}

function rowActions(item: any): RowAction[] {
  return [
    { key: "detail", label: "Ver detalle", icon: "mdi-eye", color: "info" },
    {
      key: "pdf",
      label: "Previsualizar PDF",
      icon: "mdi-file-pdf-box",
      hidden: !item?.id,
    },
  ];
}

async function runRowAction(key: string, item: any) {
  if (key === "detail") return void openDetail(item);
  if (key === "pdf") {
    await openDetail(item);
    if (detailDialog.document) await previewDocument("pdf");
  }
}

watch(
  () => props.movementType,
  () => {
    clearFilters();
  },
);

onMounted(async () => {
  if (!canRead.value) return;
  await Promise.all([loadCatalogs(), loadDocuments(1)]);
  // El detalle de stock enlaza aqui con `?documento=`: se abre directo el
  // documento pedido en vez de dejar al usuario buscandolo en la lista.
  const documentoId = String(route.query.documento || "").trim();
  // Se pide incluyendo anulados: un enlace puede apuntar a un documento que
  // se anulo despues, y ahi interesa ver el documento, no un error.
  if (documentoId) await openDetail({ id: documentoId }, true);
});
</script>

<style scoped>
.document-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}

.document-link:hover {
  text-decoration: underline;
}

.summary-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

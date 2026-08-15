<template>
  <v-alert v-if="!moduleConfig" type="error" variant="tonal">
    Módulo no configurado.
  </v-alert>

  <v-alert v-else-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para consultar este módulo.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-3">
      <div>
        <div class="text-h6 font-weight-bold">{{ moduleConfig.title }}</div>
        <div class="text-body-2 text-medium-emphasis">Inventario de {{ moduleConfig.title.toLowerCase() }}.</div>
      </div>
      <div class="d-flex flex-wrap" style="gap: 8px;">
        <v-btn
          variant="text"
          prepend-icon="mdi-refresh"
          :loading="tableLoading"
          @click="refreshRecords"
        >
          Recargar
        </v-btn>
        <v-btn
          v-if="isStockBodegaModule"
          variant="tonal"
          prepend-icon="mdi-file-excel"
          :loading="exportingStock"
          @click="exportStockWarehouseXlsx"
        >
          Descargar XLSX
        </v-btn>
        <v-btn
          v-if="canPurgeModule"
          color="error"
          variant="tonal"
          prepend-icon="mdi-delete-alert"
          @click="openPurgeDialog"
        >
          Eliminacion masiva
        </v-btn>
        <v-btn
          v-if="canCreate"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nuevo
        </v-btn>
      </div>
    </div>

    <v-row dense class="mb-2">
      <v-col cols="12" md="3">
        <v-text-field
          v-model="search"
          :label="isProductModule ? 'Código, nombre, descripción, SKU o barras' : 'Buscar'"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>
      <template v-if="isProductModule">
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="productStatusFilter" :items="recordStatusOptions" label="Estado" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-autocomplete v-model="productLineFilter" :items="relationOptions.linea_id ?? []" item-title="title" item-value="value" label="Línea" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-autocomplete v-model="productCategoryFilter" :items="relationOptions.categoria_id ?? []" item-title="title" item-value="value" label="Categoría" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-autocomplete v-model="productBrandFilter" :items="relationOptions.marca_id ?? []" item-title="title" item-value="value" label="Marca" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-autocomplete v-model="productUnitFilter" :items="relationOptions.unidad_medida_id ?? []" item-title="title" item-value="value" label="Unidad de medida" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="productOilFilter" :items="yesNoFilterOptions" label="Es aceite" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="productServiceFilter" :items="yesNoFilterOptions" label="Tipo de material" variant="outlined" density="compact" clearable />
        </v-col>
      </template>
      <template v-if="isStockBodegaModule">
        <v-col cols="12" sm="6" md="3">
          <v-autocomplete
          v-model="stockWarehouseFilter"
          :items="stockWarehouseOptions"
          item-title="title"
          item-value="value"
          label="Bodega"
          variant="outlined"
          density="compact"
          clearable
        />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-autocomplete v-model="stockProductFilter" :items="relationOptions.producto_id ?? []" item-title="title" item-value="value" label="Material" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="stockUsedFilter" :items="stockConditionFilterOptions" label="Condición" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="stockLevelFilter" :items="stockLevelFilterOptions" label="Nivel de stock" variant="outlined" density="compact" clearable />
        </v-col>
      </template>
      <v-col cols="12" class="d-flex align-center justify-end" style="gap: 8px; flex-wrap: wrap;">
        <v-btn
          variant="tonal"
          prepend-icon="mdi-filter-check"
          :loading="tableLoading"
          @click="applyFilters"
        >
          Aplicar filtros
        </v-btn>
        <v-btn
          variant="text"
          prepend-icon="mdi-filter-off"
          :disabled="!hasActiveTableFilters"
          @click="clearFilters"
        >
          Limpiar
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2">{{ error }}</v-alert>

    <v-data-table-server
      :headers="headers"
      :items="rows"
      :items-length="serverTotalItems"
      :loading="tableLoading"
      loading-text="Obteniendo información del módulo..."
      :items-per-page="serverItemsPerPage"
      :items-per-page-options="[10, 20, 50, 100]"
      :page="serverPage"
      class="elevation-0 enterprise-table inventory-table"
      @update:options="handleServerOptionsUpdate"
    >
      <template #item.actions="{ item }">
        <div class="responsive-actions">
          <v-btn
            v-if="isStockBodegaModule"
            icon="mdi-eye"
            variant="text"
            color="info"
            @click="openReservationDetail(item)"
          />
          <v-btn
            v-if="canEdit && !isAutoManagedWarehouse(item)"
            icon="mdi-pencil"
            variant="text"
            @click="openEdit(item._raw ?? item)"
          />
          <v-btn
            v-if="canDelete && !isAutoManagedWarehouse(item)"
            icon="mdi-delete"
            variant="text"
            color="error"
            @click="openDelete(item._raw ?? item)"
          />
        </div>
      </template>
      <template #no-data>
        <div
          v-if="!tableLoading && !rows.length && !error"
          class="pa-4 text-medium-emphasis"
        >
          No hay registros para los filtros seleccionados.
        </div>
      </template>
    </v-data-table-server>
  </v-card>

  <v-dialog
    v-model="reservationDialog"
    :fullscreen="isDeleteDialogFullscreen"
    :max-width="isDeleteDialogFullscreen ? undefined : 980"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Reservas del material
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <div class="reservation-summary mb-4">
          <div>
            <div class="text-caption text-medium-emphasis">Material</div>
            <div class="text-body-1 font-weight-medium">
              {{ reservationContext.productoLabel || "-" }}
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">Bodega</div>
            <div class="text-body-1 font-weight-medium">
              {{ reservationContext.bodegaLabel || "-" }}
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">Cantidad reservada</div>
            <div class="text-body-1 font-weight-medium">
              {{ formatNumberForDisplay(reservationContext.totalCantidad || 0) }}
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">Reservas activas</div>
            <div class="text-body-1 font-weight-medium">
              {{ reservationContext.activeCount || 0 }}
            </div>
          </div>
        </div>

        <v-alert
          v-if="reservationError"
          type="error"
          variant="tonal"
          class="mb-3"
        >
          {{ reservationError }}
        </v-alert>

        <v-data-table
          :headers="reservationHeaders"
          :items="reservationRows"
          :loading="reservationLoading"
          loading-text="Obteniendo reservas ligadas a órdenes de trabajo..."
          :items-per-page="10"
          class="elevation-0 enterprise-table inventory-table"
        >
          <template #item.estado="{ item }">
            <v-chip
              size="small"
              variant="tonal"
              :color="reservationStateColor(item.estado)"
            >
              {{ item.estado }}
            </v-chip>
          </template>
          <template #item.work_order_status="{ item }">
            <v-chip
              size="small"
              variant="tonal"
              :color="workflowStatusColor(item.work_order_status)"
            >
              {{ item.work_order_status || "Sin estado" }}
            </v-chip>
          </template>
          <template #item.cantidad="{ item }">
            {{ formatNumberForDisplay(item.cantidad || 0) }}
          </template>
          <template #bottom>
            <div
              v-if="!reservationLoading && !reservationRows.length && !reservationError"
              class="pa-4 text-medium-emphasis"
            >
              No hay reservas registradas para este material en esta bodega.
            </div>
          </template>
        </v-data-table>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="reservationDialog = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialog" :fullscreen="isDialogFullscreen" :max-width="isDialogFullscreen ? undefined : 900">
    <v-card rounded="xl" class="enterprise-dialog inventory-dialog-card">
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ editingId ? 'Editar' : 'Crear' }} {{ moduleConfig?.title }}</v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col v-for="field in visibleFormFields" :key="field.key" cols="12" md="6">
            <v-autocomplete
              v-if="field.type === 'select' && isMaterialField(field)"
              v-model="form[field.key]"
              :items="getSelectOptions(field)"
              item-title="title"
              item-value="value"
              :label="field.label"
              :hint="field.required ? 'Obligatorio' : ''"
              persistent-hint
              clearable
              variant="outlined"
              density="comfortable"
              no-data-text="No hay materiales disponibles para este filtro"
            />
            <v-select
              v-else-if="field.type === 'select'"
              v-model="form[field.key]"
              :items="getSelectOptions(field)"
              item-title="title"
              item-value="value"
              :label="field.label"
              :hint="field.required ? 'Obligatorio' : ''"
              persistent-hint
              clearable
              variant="outlined"
            />
            <v-switch
              v-else-if="isStockMaterialConditionField(field)"
              v-model="form[field.key]"
              color="primary"
              inset
              :label="form[field.key] ? 'Maneja material usado' : 'Solo material nuevo'"
              hide-details
            />
            <v-checkbox
              v-else-if="field.type === 'boolean'"
              v-model="form[field.key]"
              :label="field.label"
              hide-details
            />
            <v-text-field
              v-else-if="isThirdPartyIdentificationField(field)"
              v-model="form[field.key]"
              :label="field.label"
              :hint="thirdPartyLookupLoading ? 'Consultando SRI...' : (field.required ? 'Obligatorio · al completar 13 dígitos se consultará el SRI' : 'Al completar 13 dígitos se consultará el SRI')"
              persistent-hint
              variant="outlined"
              :loading="thirdPartyLookupLoading"
            />
            <v-text-field
              v-else
              v-model="form[field.key]"
              :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
              :step="field.type === 'number' ? 'any' : undefined"
              :label="field.label"
              :hint="field.required ? 'Obligatorio' : ''"
              persistent-hint
              variant="outlined"
              :readonly="Boolean(field.readonly)"
            />
          </v-col>
          <v-col v-if="isThirdPartyModule && thirdPartyLookupError" cols="12">
            <v-alert type="warning" variant="tonal">
              {{ thirdPartyLookupError }}
            </v-alert>
          </v-col>
          <v-col v-if="productOilHint" cols="12">
            <v-alert
              :type="productOilHintNeedsAttention ? 'warning' : 'info'"
              variant="tonal"
            >
              {{ productOilHint }}
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 500">
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar</v-card-title>
      <v-card-text>¿Deseas eliminar este registro?</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="saving" @click="confirmDelete">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="purgeDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 560">
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminacion real masiva</v-card-title>
      <v-card-text>
        <v-alert type="error" variant="tonal" class="mb-4">
          Esta accion elimina fisicamente todos los registros de {{ moduleConfig?.title }} y no se puede deshacer.
        </v-alert>
        <v-text-field
          v-model="purgeConfirmation"
          label="Escribe ELIMINAR para confirmar"
          variant="outlined"
          autocomplete="off"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closePurgeDialog">Cancelar</v-btn>
        <v-btn
          color="error"
          :loading="purging"
          :disabled="!isPurgeConfirmationValid"
          @click="confirmPurgeAll"
        >
          Eliminar todo
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { getInventoryModule, type MaintenanceField } from "@/app/config/maintenance-modules";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { isSuperAdministrator } from "@/app/utils/role-access";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { fetchPaginatedResource } from "@/app/utils/paginated-resource";
import { listAllPages } from "@/app/utils/list-all-pages";
import { resolveProductDisplayName } from "@/app/utils/product-display";
import {
  downloadReportExcel,
  type ReportDefinition,
} from "@/app/utils/maintenance-intelligence-reports";

const props = defineProps<{ moduleKey: string }>();
const ui = useUiStore();
const auth = useAuthStore();
const menu = useMenuStore();
const route = useRoute();
const { mdAndDown, smAndDown } = useDisplay();

const moduleConfig = computed(() => getInventoryModule(props.moduleKey));
const permissionAliases = computed(() => {
  const singular = props.moduleKey.endsWith("s") ? props.moduleKey.slice(0, -1) : props.moduleKey;
  return [props.moduleKey, singular, String(route.name ?? "")].filter(Boolean);
});
const menuPermissions = computed(() => getPermissionsForAnyComponent(menu.tree, permissionAliases.value));
const canRead = computed(() => menuPermissions.value.isReaded);
const canCreate = computed(() => moduleConfig.value?.allowCreate !== false && menuPermissions.value.isCreated);
const canEdit = computed(() => moduleConfig.value?.allowEdit !== false && menuPermissions.value.isEdited);
const canDelete = computed(() => moduleConfig.value?.allowDelete !== false && menuPermissions.value.permitDeleted);
const canPurgeModule = computed(() => Boolean(moduleConfig.value) && isSuperAdministrator(auth.user));
const isStockBodegaModule = computed(() => moduleConfig.value?.key === "stock-bodega");
const isWarehouseModule = computed(() => moduleConfig.value?.key === "bodegas");
const isThirdPartyModule = computed(() => moduleConfig.value?.key === "terceros");
const isProductModule = computed(() => moduleConfig.value?.key === "productos");
const records = ref<any[]>([]);
const loading = ref(false);
const initialLoading = ref(false);
const saving = ref(false);
const exportingStock = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const stockWarehouseFilter = ref("");
const stockProductFilter = ref("");
const stockUsedFilter = ref("");
const stockLevelFilter = ref("");
const productStatusFilter = ref("");
const productLineFilter = ref("");
const productCategoryFilter = ref("");
const productBrandFilter = ref("");
const productUnitFilter = ref("");
const productOilFilter = ref("");
const productServiceFilter = ref("");
const serverPage = ref(1);
const serverItemsPerPage = ref(20);
const serverTotalItems = ref(0);
let stockBodegaFetchTimer: ReturnType<typeof setTimeout> | null = null;
let stockBodegaRequestId = 0;

const relationOptions = ref<Record<string, Array<{ value: any; title: string; bodegaId?: string | null }>>>({});
const relationOptionsLoaded = reactive({
  table: false,
  form: false,
});

const dialog = ref(false);
const deleteDialog = ref(false);
const purgeDialog = ref(false);
const reservationDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const purgeConfirmation = ref("");
const purging = ref(false);
const reservationLoading = ref(false);
const reservationError = ref<string | null>(null);
const reservationRows = ref<any[]>([]);
const reservationContext = reactive({
  productoLabel: "",
  bodegaLabel: "",
  totalCantidad: 0,
  activeCount: 0,
});
const form = reactive<Record<string, any>>({});
const thirdPartyLookupLoading = ref(false);
const thirdPartyLookupMessage = ref("");
const thirdPartyLookupError = ref("");
const thirdPartyLookupHydrating = ref(false);
const lastThirdPartyLookupRuc = ref("");
let thirdPartyLookupTimer: ReturnType<typeof setTimeout> | null = null;
const isDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const tableLoading = computed(() => loading.value || initialLoading.value);
const isPurgeConfirmationValid = computed(
  () => purgeConfirmation.value.trim().toUpperCase() === "ELIMINAR",
);
const stockWarehouseOptions = computed(() => relationOptions.value.bodega_id ?? []);
const recordStatusOptions = [
  { title: "Activo", value: "ACTIVE" },
  { title: "Inactivo", value: "INACTIVE" },
];
const yesNoFilterOptions = [
  { title: "Sí", value: "true" },
  { title: "No", value: "false" },
];
const stockConditionFilterOptions = [
  { title: "Con material usado", value: "true" },
  { title: "Solo material nuevo", value: "false" },
];
const stockLevelFilterOptions = [
  { title: "Con stock", value: "CON_STOCK" },
  { title: "Sin stock", value: "SIN_STOCK" },
  { title: "Bajo mínimo", value: "BAJO_MINIMO" },
  { title: "Sobre máximo", value: "SOBRE_MAXIMO" },
];
const hasActiveTableFilters = computed(() =>
  [
    search.value,
    stockWarehouseFilter.value,
    stockProductFilter.value,
    stockUsedFilter.value,
    stockLevelFilter.value,
    productStatusFilter.value,
    productLineFilter.value,
    productCategoryFilter.value,
    productBrandFilter.value,
    productUnitFilter.value,
    productOilFilter.value,
    productServiceFilter.value,
  ].some((value) => String(value ?? "").trim()),
);
const visibleFormFields = computed(() =>
  (moduleConfig.value?.fields ?? []).filter(shouldShowFormField),
);
const reservationHeaders = [
  { title: "Reserva", key: "estado" },
  { title: "Cantidad", key: "cantidad" },
  { title: "OT", key: "work_order_label" },
  { title: "Estado OT", key: "work_order_status" },
  { title: "Equipo", key: "equipment_label" },
];
const productOilHintNeedsAttention = computed(
  () => isProductModule.value && dialog.value && productNameLooksLikeOil() && !Boolean(form.es_aceite),
);
const productOilHint = computed(() => {
  if (!isProductModule.value || !dialog.value) return "";
  if (productOilHintNeedsAttention.value) {
    return "El nombre del material contiene 'aceite'. Marca el check 'Es aceite' para que este material entre en el KPI de Análisis de Aceite.";
  }
  if (Boolean(form.es_aceite)) {
    return "Este material quedará disponible para el KPI de Análisis de Aceite. Si no eliges unidad manualmente, se sugerirá GALONES por default.";
  }
  return "";
});

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

async function listAll(endpoint: string) {
  return listAllPages(endpoint);
}

function normalizeLabel(item: any) {
  if (item && Object.prototype.hasOwnProperty.call(item, "es_aceite")) {
    return resolveProductDisplayName(item);
  }
  return item?.nombre ?? item?.razon_social ?? item?.codigo ?? item?.id;
}

function buildWarehouseOptionTitle(
  warehouse: any,
  branchNameById?: Map<string, string>,
) {
  const code = String(warehouse?.codigo || "").trim();
  const name =
    String(warehouse?.nombre || "").trim() ||
    String(normalizeLabel(warehouse) || "").trim();
  const branchId = String(warehouse?.sucursal_id || "").trim();
  const branchName = String(branchNameById?.get(branchId) || "").trim();
  const parts = [
    code || null,
    branchName ? `(${branchName})` : null,
    name || null,
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : String(warehouse?.id || "");
}

function normalizeLooseText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function productNameLooksLikeOil() {
  return /\baceite\b/.test(normalizeLooseText(form.nombre));
}

function toSafeNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumberFieldForForm(value: unknown) {
  if (value === null || value === undefined || value === "") return "0";
  const formatted = formatNumberForDisplay(value);
  return formatted || "0";
}

function findGallonsUnitOption() {
  return (relationOptions.value.unidad_medida_id ?? []).find((option) =>
    /\bgalones?\b|\bgal\b|\bgl\b/.test(normalizeLooseText(option.title)),
  );
}

function syncProductOilDefaults() {
  if (!isProductModule.value || !dialog.value) return;
  if (!(Boolean(form.es_aceite) || productNameLooksLikeOil())) return;
  if (String(form.unidad_medida_id || "").trim()) return;

  const gallonsOption = findGallonsUnitOption();
  if (gallonsOption) {
    form.unidad_medida_id = gallonsOption.value;
  }
}

function isStockBodegaLabelField(fieldKey: string) {
  return fieldKey === "producto_id" || fieldKey === "bodega_id";
}

function isStockMaterialConditionField(field: MaintenanceField) {
  return isStockBodegaModule.value && field.key === "es_usado";
}

function shouldShowFormField(field: MaintenanceField) {
  if (!isStockBodegaModule.value) return true;
  if (field.key === "stock_usado") return Boolean(form.es_usado);
  return true;
}

function getRelationFields(mode: "table" | "form" = "table") {
  const cfg = moduleConfig.value;
  if (!cfg) return [];
  const sourceFields =
    mode === "form" || cfg.key === "productos"
      ? cfg.fields
      : cfg.fields.slice(0, 6);
  return sourceFields.filter((field) => field.relation);
}

async function loadRelations(mode: "table" | "form" = "table") {
  if (!moduleConfig.value) return;
  if (relationOptionsLoaded[mode]) return;
  const nextRelationOptions =
    mode === "form" ? { ...relationOptions.value } : {};

  if (moduleConfig.value.key === "stock-bodega") {
    const warehouseField = moduleConfig.value.fields.find(
      (field) => field.key === "bodega_id" && field.relation,
    );
    if (warehouseField?.relation?.endpoint) {
      const [rows, branches] = await Promise.all([
        listAll(warehouseField.relation.endpoint),
        listAll("/kpi_inventory/sucursales"),
      ]);
      const branchNameById = new Map(
        branches.map((branch: any) => [
          String(branch?.id || ""),
          String(branch?.nombre || "").trim(),
        ]),
      );
      nextRelationOptions.bodega_id = rows.map((r: any) => ({
        value: r.id,
        title: buildWarehouseOptionTitle(r, branchNameById),
        bodegaId: r?.bodega_id ? String(r.bodega_id) : null,
      }));
    }
    const productField = moduleConfig.value.fields.find(
      (field) => field.key === "producto_id" && field.relation,
    );
    if (productField?.relation?.endpoint) {
      const rows = await listAll(productField.relation.endpoint);
      nextRelationOptions.producto_id = rows.map((r: any) => ({
        value: r.id,
        title: `${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}${r?.descripcion ? ` (${String(r.descripcion).trim()})` : ""}`,
        bodegaId: r?.bodega_id ? String(r.bodega_id) : null,
      }));
    }
    relationOptions.value = nextRelationOptions;
    relationOptionsLoaded[mode] = true;
    return;
  }

  const relationFields = getRelationFields(mode);
  const uniqueEndpoints = [...new Set(relationFields.map((field) => String(field.relation?.endpoint || "")))];
  const endpointRows = new Map<string, any[]>();

  await Promise.all(
    uniqueEndpoints.map(async (endpoint) => {
      endpointRows.set(endpoint, await listAll(endpoint));
    }),
  );

  for (const field of relationFields) {
    const rows = endpointRows.get(String(field.relation?.endpoint || "")) ?? [];
    nextRelationOptions[field.key] = rows.map((r: any) => ({
      value: r.id,
      title: `${r.codigo ? `${r.codigo} - ` : ""}${normalizeLabel(r)}${r?.descripcion ? ` (${String(r.descripcion).trim()})` : ""}`,
      bodegaId: r?.bodega_id ? String(r.bodega_id) : null,
    }));
  }
  relationOptions.value = nextRelationOptions;
  relationOptionsLoaded[mode] = true;
}

function isWarehouseDependentProductField(field: MaintenanceField) {
  return field.relation?.endpoint === "/kpi_inventory/productos";
}

function isMaterialField(field: MaintenanceField) {
  return (
    field.relation?.endpoint === "/kpi_inventory/productos" ||
    ["producto_id", "materiales"].includes(String(field.key || ""))
  );
}

function isThirdPartyIdentificationField(field: MaintenanceField) {
  return isThirdPartyModule.value && field.key === "identificacion";
}

function normalizeRuc(value: unknown) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 13);
}

function clearThirdPartyLookupFeedback() {
  thirdPartyLookupMessage.value = "";
  thirdPartyLookupError.value = "";
}

function clearThirdPartyLookupTimer() {
  if (!thirdPartyLookupTimer) return;
  clearTimeout(thirdPartyLookupTimer);
  thirdPartyLookupTimer = null;
}

function syncStockTotals() {
  if (!isStockBodegaModule.value) return;
  if (!Boolean(form.es_usado)) {
    form.stock_usado = "0";
  }
  const stockTotal =
    toSafeNumber(form.stock_nuevo) +
    (Boolean(form.es_usado) ? toSafeNumber(form.stock_usado) : 0) +
    toSafeNumber(form.stock_critico);
  form.stock_actual = String(Number(stockTotal.toFixed(6)));
  form.diferencia = String(
    Number(
      (toSafeNumber(form.stock_actual) - toSafeNumber(form.stock_fisico)).toFixed(6),
    ),
  );
}

function applyThirdPartySriAutofill(payload: Record<string, any> | null | undefined) {
  if (!payload) return;
  const ruc = normalizeRuc(payload.ruc);
  const razonSocial = String(payload.razon_social || "").trim();
  const nombreComercial = String(
    payload.nombre_comercial || payload.razon_social || "",
  ).trim();
  const direccion = String(
    payload.dir_establecimiento || payload.dir_matriz || "",
  ).trim();

  if (ruc) {
    form.identificacion = ruc;
  }
  if (razonSocial) {
    form.razon_social = razonSocial;
  }
  if (nombreComercial) {
    form.nombre_comercial = nombreComercial;
  }
  if (direccion) {
    form.direccion = direccion;
  }
}

async function lookupThirdPartyByRuc(ruc = form.identificacion, notifyOnError = false) {
  const normalizedRuc = normalizeRuc(ruc);
  if (!isThirdPartyModule.value || thirdPartyLookupHydrating.value) return;
  if (normalizedRuc.length !== 13) return;

  thirdPartyLookupLoading.value = true;
  clearThirdPartyLookupFeedback();
  try {
    const { data } = await api.get("/kpi_inventory/guias-remision-sri/catalogo-contribuyente", {
      params: { ruc: normalizedRuc },
    });
    const payload = (data?.data ?? data) as Record<string, any> | null;
    applyThirdPartySriAutofill(payload);
    lastThirdPartyLookupRuc.value = normalizedRuc;
    thirdPartyLookupMessage.value =
      "Datos del tercero cargados automáticamente desde el SRI.";
  } catch (e: any) {
    lastThirdPartyLookupRuc.value = "";
    thirdPartyLookupError.value =
      e?.response?.data?.message || e?.message || "No se pudo consultar el RUC en el SRI.";
    if (notifyOnError) {
      ui.error(thirdPartyLookupError.value);
    }
  } finally {
    thirdPartyLookupLoading.value = false;
  }
}

function scheduleThirdPartyLookup(force = false) {
  clearThirdPartyLookupTimer();
  const normalizedRuc = normalizeRuc(form.identificacion);
  if (normalizedRuc !== String(form.identificacion || "")) {
    form.identificacion = normalizedRuc;
    return;
  }
  if (normalizedRuc.length < 13) {
    lastThirdPartyLookupRuc.value = "";
    clearThirdPartyLookupFeedback();
    return;
  }
  if (thirdPartyLookupHydrating.value) return;
  if (!force && normalizedRuc === lastThirdPartyLookupRuc.value) return;

  thirdPartyLookupTimer = setTimeout(() => {
    void lookupThirdPartyByRuc(normalizedRuc, force);
  }, 400);
}

async function fetchRecords(skipLoading = false) {
  if (!moduleConfig.value) return;
  if (!canRead.value) return;
  if (!skipLoading) loading.value = true;
  error.value = null;
  try {
    const requestId = ++stockBodegaRequestId;
    const response = await fetchPaginatedResource(
      moduleConfig.value.endpoint,
      {
        search: search.value.trim() || undefined,
        status: isProductModule.value
          ? productStatusFilter.value || undefined
          : undefined,
        linea_id: isProductModule.value
          ? productLineFilter.value || undefined
          : undefined,
        categoria_id: isProductModule.value
          ? productCategoryFilter.value || undefined
          : undefined,
        marca_id: isProductModule.value
          ? productBrandFilter.value || undefined
          : undefined,
        unidad_medida_id: isProductModule.value
          ? productUnitFilter.value || undefined
          : undefined,
        es_aceite: isProductModule.value
          ? productOilFilter.value || undefined
          : undefined,
        es_servicio: isProductModule.value
          ? productServiceFilter.value || undefined
          : undefined,
        bodega_id: isStockBodegaModule.value
          ? stockWarehouseFilter.value || undefined
          : undefined,
        producto_id: isStockBodegaModule.value
          ? stockProductFilter.value || undefined
          : undefined,
        es_usado: isStockBodegaModule.value
          ? stockUsedFilter.value || undefined
          : undefined,
        stock_estado: isStockBodegaModule.value
          ? stockLevelFilter.value || undefined
          : undefined,
      },
      {
        page: serverPage.value,
        limit: serverItemsPerPage.value,
      },
    );
    if (requestId !== stockBodegaRequestId) return;
    records.value = response.data;
    serverTotalItems.value = Number(response.pagination.total || 0);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar registros.";
  } finally {
    if (!skipLoading) loading.value = false;
  }
}

async function hydrateModuleData() {
  if (!moduleConfig.value) return;
  if (!canRead.value) return;
  initialLoading.value = true;
  error.value = null;
  try {
    await Promise.all([loadRelations("table"), fetchRecords(true)]);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar registros.";
  } finally {
    initialLoading.value = false;
  }
}

function resetForm() {
  clearThirdPartyLookupTimer();
  clearThirdPartyLookupFeedback();
  thirdPartyLookupLoading.value = false;
  thirdPartyLookupHydrating.value = false;
  lastThirdPartyLookupRuc.value = "";
  Object.keys(form).forEach((k) => delete form[k]);
  for (const field of moduleConfig.value?.fields ?? []) {
    if (field.key === "status") form[field.key] = "ACTIVE";
    else if (field.type === "boolean") form[field.key] = false;
    else if (field.type === "number") form[field.key] = "0";
    else form[field.key] = "";
  }
  syncStockTotals();
}

function getSelectOptions(field: MaintenanceField) {
  if (field.options) return field.options;
  const options = relationOptions.value[field.key] ?? [];
  if (!isWarehouseDependentProductField(field)) return options;
  if (!options.some((option) => String(option.bodegaId || "").trim())) return options;

  const warehouseId = String(form.bodega_id || "").trim();
  if (!warehouseId) return [];

  return options.filter((option) => String(option.bodegaId || "") === warehouseId);
}

async function ensureFormRelationsLoaded() {
  await loadRelations("form");
}

function getItemEndpoint(recordId: string) {
  const endpoint = String(moduleConfig.value?.endpoint || "").trim();
  const normalizedId = String(recordId || "").trim();
  if (!endpoint || !normalizedId) return null;
  return `${endpoint}/${normalizedId}`;
}

function hydrateFormFromItem(item: Record<string, any> | null | undefined) {
  thirdPartyLookupHydrating.value = true;
  for (const field of moduleConfig.value?.fields ?? []) {
    if (field.type === "number") {
      form[field.key] = formatNumberFieldForForm(item?.[field.key] ?? form[field.key]);
      continue;
    }
    form[field.key] = item?.[field.key] ?? form[field.key];
  }
  lastThirdPartyLookupRuc.value = normalizeRuc(form.identificacion);
  thirdPartyLookupHydrating.value = false;
  if (isStockBodegaModule.value) {
    if (
      toSafeNumber(form.stock_nuevo) === 0 &&
      toSafeNumber(item?.stock_actual) > 0 &&
      toSafeNumber(item?.stock_usado) === 0 &&
      toSafeNumber(item?.stock_critico) === 0
    ) {
      form.stock_nuevo = formatNumberFieldForForm(item?.stock_actual);
    }
    syncStockTotals();
  }
}

function reservationStateColor(value: string) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "RESERVADO") return "warning";
  if (normalized === "CONSUMIDO") return "success";
  if (normalized === "ANULADO") return "error";
  return "info";
}

function workflowStatusColor(value: string) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CLOSED") return "success";
  if (normalized === "IN_PROGRESS") return "warning";
  if (normalized === "PLANNED") return "info";
  if (normalized === "CANCELLED") return "error";
  return "secondary";
}

function isAutoManagedWarehouse(item: any) {
  const row = item?._raw ?? item;
  return isWarehouseModule.value && Boolean(row?.es_chatarra);
}

const headers = computed(() => {
  const cfg = moduleConfig.value;
  if (!cfg) return [];
  const stockTableFieldKeys = [
    "bodega_id",
    "producto_id",
    "stock_min_bodega",
    "stock_max_bodega",
    "stock_critico",
    "stock_nuevo",
    "stock_usado",
    "stock_actual",
    "es_usado",
  ];
  const tableFields = isStockBodegaModule.value
    ? stockTableFieldKeys
        .map((key) => cfg.fields.find((field) => field.key === key))
        .filter((field): field is MaintenanceField => Boolean(field))
    : cfg.fields.slice(0, 6);
  const base = tableFields.map((field) => ({
    title: field.label,
    key: field.key,
  }));
  if (!canEdit.value && !canDelete.value) return base;
  return [...base, { title: "Acciones", key: "actions", sortable: false }];
});

const rows = computed(() => {
  const cfg = moduleConfig.value;
  if (!cfg) return [];

  return records.value
    .map((r) => {
      const out: any = { ...r };
      out._raw = r;
      for (const field of cfg.fields) {
        if (field.type === "select" && field.relation && r[field.key]) {
          const opt = (relationOptions.value[field.key] ?? []).find((x) => x.value === r[field.key]);
          const apiLabel =
            isStockBodegaLabelField(field.key) && moduleConfig.value?.key === "stock-bodega"
              ? r[field.key === "producto_id" ? "producto_label" : "bodega_label"]
              : null;
          out[field.key] = opt?.title ?? apiLabel ?? r[field.key];
        }

        if (field.type === "number") {
          out[field.key] = formatNumberForDisplay(r[field.key]);
        }

      if (field.type === "boolean") {
          out[field.key] =
            cfg.key === "stock-bodega" && field.key === "es_usado"
              ? (r[field.key] ? "Con usado" : "Solo nuevo")
              : (r[field.key] ? "Si" : "No");
        }
      }
      if (cfg.key === "productos") {
        out.nombre = resolveProductDisplayName(r, r?.nombre ?? out.nombre);
      }
      out._search = JSON.stringify({ ...r, ...out }).toLowerCase();
      return out;
    });
});

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function resolveRelationTitle(fieldKey: string, value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return (
    relationOptions.value[fieldKey]?.find((option) => String(option.value) === normalized)?.title ||
    normalized
  );
}

function stockWarehouseLabel(row: any) {
  return (
    row?.bodega_label ||
    [row?.bodega_codigo, row?.bodega_nombre].filter(Boolean).join(" - ") ||
    resolveRelationTitle("bodega_id", row?.bodega_id)
  );
}

function stockProductLabel(row: any) {
  return (
    row?.producto_label ||
    [row?.producto_codigo, row?.producto_nombre].filter(Boolean).join(" - ") ||
    resolveRelationTitle("producto_id", row?.producto_id)
  );
}

function stockExportParams() {
  return {
    search: search.value.trim() || undefined,
    bodega_id: isStockBodegaModule.value
      ? stockWarehouseFilter.value || undefined
      : undefined,
    producto_id: stockProductFilter.value || undefined,
    es_usado: stockUsedFilter.value || undefined,
    stock_estado: stockLevelFilter.value || undefined,
  };
}

async function fetchAllStockWarehouseRows() {
  if (!moduleConfig.value) return [] as any[];
  const limit = 100;
  const params = stockExportParams();
  const firstPage = await fetchPaginatedResource(moduleConfig.value.endpoint, params, {
    page: 1,
    limit,
  });
  const allRows = [...firstPage.data];
  const totalPages = Number(firstPage.pagination.totalPages || 1);
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetchPaginatedResource(moduleConfig.value.endpoint, params, {
      page,
      limit,
    });
    allRows.push(...response.data);
  }
  return allRows;
}

function buildStockWarehouseReport(sourceRows: any[]): ReportDefinition {
  const warehouseFilterLabel = stockWarehouseFilter.value
    ? resolveRelationTitle("bodega_id", stockWarehouseFilter.value)
    : "Todas las bodegas";
  const reportRows = sourceRows.map((row) => ({
    bodega: stockWarehouseLabel(row),
    material: stockProductLabel(row),
    condicion: row?.es_usado ? "Con usado" : "Solo nuevo",
    stock_nuevo: Number(row?.stock_nuevo ?? row?.stock_actual ?? 0),
    stock_usado: Number(row?.stock_usado || 0),
    stock_critico: Number(row?.stock_critico || 0),
    stock_actual: Number(row?.stock_actual || 0),
    stock_minimo: Number(row?.stock_min_bodega || 0),
    stock_maximo: Number(row?.stock_max_bodega || 0),
    stock_fisico: Number(row?.stock_fisico || 0),
    diferencia: Number(row?.diferencia || 0),
    estado: row?.status || "",
  }));
  return {
    fileName: `stock_bodega_${exportDateStamp()}`,
    title: "Stock por bodega",
    subtitle: `Exportacion segun filtros aplicados. Bodega: ${warehouseFilterLabel}.`,
    orientation: "landscape",
    summary: [
      { label: "Bodega", value: warehouseFilterLabel },
      { label: "Busqueda", value: search.value.trim() || "Sin busqueda" },
      { label: "Registros", value: reportRows.length },
      { label: "Stock total", value: reportRows.reduce((acc, item) => acc + Number(item.stock_actual || 0), 0) },
    ],
    sheets: [
      {
        name: "Stock",
        rows: reportRows,
        emptyMessage: "Sin stock para los filtros seleccionados.",
        columns: [
          { key: "bodega", header: "Bodega", width: 28 },
          { key: "material", header: "Material", width: 32 },
          { key: "condicion", header: "Condicion", width: 14 },
          { key: "stock_nuevo", header: "Stock nuevo", width: 14, format: "number" },
          { key: "stock_usado", header: "Stock usado", width: 14, format: "number" },
          { key: "stock_critico", header: "Stock crítico", width: 14, format: "number" },
          { key: "stock_actual", header: "Stock actual total", width: 16, format: "number" },
          { key: "stock_minimo", header: "Stock minimo", width: 14, format: "number" },
          { key: "stock_maximo", header: "Stock maximo", width: 14, format: "number" },
          { key: "stock_fisico", header: "Stock fisico", width: 14, format: "number" },
          { key: "diferencia", header: "Diferencia", width: 14, format: "number" },
          { key: "estado", header: "Estado", width: 12 },
        ],
      },
    ],
  };
}

async function exportStockWarehouseXlsx() {
  if (!isStockBodegaModule.value || !moduleConfig.value) return;
  exportingStock.value = true;
  try {
    await ensureFormRelationsLoaded();
    const exportRows = await fetchAllStockWarehouseRows();
    await downloadReportExcel(buildStockWarehouseReport(exportRows));
    ui.success("Stock por bodega descargado en XLSX.");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || e?.message || "No se pudo descargar el stock por bodega.");
  } finally {
    exportingStock.value = false;
  }
}

function sanitizePayload() {
  const cfg = moduleConfig.value;
  const payload: Record<string, any> = {};
  if (!cfg) return payload;

  for (const field of cfg.fields) {
    if (field.sendInPayload === false) continue;
    let val = form[field.key];
    if (field.type === "number") {
      val = val === "" || val === null || val === undefined ? "0" : String(val);
    }
    if (field.type === "text") {
      val = val === "" ? null : val;
    }
    if (field.type === "select" && val === "") {
      val = null;
    }
    payload[field.key] = val;
  }

  if (cfg.key === "productos") {
    payload.registro_sanitario = "";
    payload.por_contenedores = false;
    payload.requiere_lote = false;
    payload.requiere_serie = false;
  }

  if (cfg.key === "stock-bodega") {
    const stockNuevo = toSafeNumber(payload.stock_nuevo);
    const stockUsado = Boolean(payload.es_usado) ? toSafeNumber(payload.stock_usado) : 0;
    const stockCritico = toSafeNumber(payload.stock_critico);
    payload.stock_usado = String(stockUsado);
    payload.stock_critico = String(stockCritico);
    payload.stock_actual = String(
      Number((stockNuevo + stockUsado + stockCritico).toFixed(6)),
    );
  }

  return payload;
}

function validateForm() {
  const cfg = moduleConfig.value;
  if (!cfg) return false;

  for (const field of cfg.fields) {
    if (field.sendInPayload === false) continue;
    if (!field.required) continue;
    const val = form[field.key];
    if (field.type === "boolean") continue;
    if (val === "" || val === null || val === undefined) {
      ui.error(`El campo ${field.label} es obligatorio.`);
      return false;
    }
  }
  if (cfg.key === "stock-bodega") {
    if (
      toSafeNumber(form.stock_nuevo) < 0 ||
      toSafeNumber(form.stock_usado) < 0 ||
      toSafeNumber(form.stock_critico) < 0
    ) {
      ui.error("El stock nuevo, usado y crítico no pueden ser negativos.");
      return false;
    }
    if (Boolean(form.es_usado) && toSafeNumber(form.stock_usado) <= 0) {
      ui.error("Indica la cantidad de stock usado cuando el material maneja usados.");
      return false;
    }
  }
  return true;
}

function openCreate() {
  editingId.value = null;
  resetForm();
  void ensureFormRelationsLoaded();
  dialog.value = true;
}

async function openEdit(item: any) {
  editingId.value = item.id;
  resetForm();
  try {
    const itemEndpoint = getItemEndpoint(item.id);
    const [detailResponse] = await Promise.all([
      itemEndpoint ? api.get(itemEndpoint) : Promise.resolve({ data: item }),
      ensureFormRelationsLoaded(),
    ]);
    const detail =
      (detailResponse as any)?.data?.data ??
      (detailResponse as any)?.data ??
      item;
    hydrateFormFromItem(detail);
    dialog.value = true;
  } catch (e: any) {
    ui.error(
      e?.response?.data?.message ||
        "No se pudo cargar el registro para editar.",
    );
  }
}

function openDelete(item: any) {
  deletingId.value = item.id;
  deleteDialog.value = true;
}

async function openReservationDetail(item: any) {
  const raw = item?._raw ?? item;
  const productoId = String(raw?.producto_id || "").trim();
  const bodegaId = String(raw?.bodega_id || "").trim();

  if (!productoId || !bodegaId) {
    ui.error("No se pudo determinar el material y la bodega de este stock.");
    return;
  }

  reservationDialog.value = true;
  reservationLoading.value = true;
  reservationError.value = null;
  reservationRows.value = [];
  reservationContext.productoLabel = String(item?.producto_id || raw?.producto_id || "");
  reservationContext.bodegaLabel = String(item?.bodega_id || raw?.bodega_id || "");
  reservationContext.totalCantidad = 0;
  reservationContext.activeCount = 0;

  try {
    const { data } = await api.get("/kpi_maintenance/work-orders/material-reservations", {
      params: {
        producto_id: productoId,
        bodega_id: bodegaId,
      },
    });
    const payload = data?.data ?? data ?? {};
    reservationContext.productoLabel = String(
      payload?.producto_label || reservationContext.productoLabel || "",
    );
    reservationContext.bodegaLabel = String(
      payload?.bodega_label || reservationContext.bodegaLabel || "",
    );
    reservationContext.totalCantidad = Number(payload?.total_cantidad || 0);
    reservationContext.activeCount = Number(payload?.reservas_activas || 0);
    reservationRows.value = asArray(payload?.items).map((row: any) => ({
      ...row,
      cantidad: Number(row?.cantidad || 0),
    }));
  } catch (e: any) {
    reservationError.value =
      e?.response?.data?.message || "No se pudo obtener el detalle de reservas.";
  } finally {
    reservationLoading.value = false;
  }
}

async function save() {
  if (!moduleConfig.value) return;
  if (!canRead.value) return;
  if (!validateForm()) return;
  if (!editingId.value && !canCreate.value) {
    ui.error("No tienes permisos para crear en este módulo.");
    return;
  }
  if (editingId.value && !canEdit.value) {
    ui.error("No tienes permisos para editar en este módulo.");
    return;
  }

  saving.value = true;
  try {
    const payload = sanitizePayload();
    if (editingId.value) {
      await api.patch(`${moduleConfig.value.endpoint}/${editingId.value}`, payload);
      ui.success("Registro actualizado correctamente.");
    } else {
      await api.post(moduleConfig.value.endpoint, payload);
      ui.success("Registro creado correctamente.");
    }

    dialog.value = false;
    await fetchRecords();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar el registro.");
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!moduleConfig.value || !deletingId.value) return;
  if (!canDelete.value) {
    ui.error("No tienes permisos para eliminar en este módulo.");
    return;
  }
  saving.value = true;
  try {
    await api.delete(`${moduleConfig.value.endpoint}/${deletingId.value}`);
    ui.success("Registro eliminado correctamente.");
    deleteDialog.value = false;
    await fetchRecords();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar el registro.");
  } finally {
    saving.value = false;
  }
}

function openPurgeDialog() {
  if (!canPurgeModule.value) {
    ui.error("Solo el Super Administrador puede ejecutar eliminacion real masiva.");
    return;
  }
  purgeConfirmation.value = "";
  purgeDialog.value = true;
}

function closePurgeDialog() {
  if (purging.value) return;
  purgeDialog.value = false;
  purgeConfirmation.value = "";
}

async function confirmPurgeAll() {
  if (!moduleConfig.value || !canPurgeModule.value) {
    ui.error("Solo el Super Administrador puede ejecutar eliminacion real masiva.");
    return;
  }
  if (!isPurgeConfirmationValid.value) {
    ui.error("Debes escribir ELIMINAR para confirmar.");
    return;
  }
  purging.value = true;
  try {
    const { data } = await api.delete(`${moduleConfig.value.endpoint}/purge-all`);
    const affected = Number(data?.affected ?? data?.data?.affected ?? 0);
    ui.success(`Eliminacion real masiva ejecutada. Registros eliminados: ${affected}.`);
    purgeDialog.value = false;
    purgeConfirmation.value = "";
    serverPage.value = 1;
    await fetchRecords();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || e?.message || "No se pudo ejecutar la eliminacion real masiva.");
  } finally {
    purging.value = false;
  }
}

function handleServerOptionsUpdate(options: {
  page?: number;
  itemsPerPage?: number;
}) {
  const nextPage = Number(options?.page || serverPage.value || 1);
  const nextItemsPerPage = Number(
    options?.itemsPerPage || serverItemsPerPage.value || 20,
  );
  const pageChanged = nextPage !== serverPage.value;
  const limitChanged = nextItemsPerPage !== serverItemsPerPage.value;
  if (!pageChanged && !limitChanged) return;

  serverPage.value = nextPage;
  serverItemsPerPage.value = nextItemsPerPage;
  void fetchRecords();
}

function scheduleServerFetch() {
  if (stockBodegaFetchTimer) {
    clearTimeout(stockBodegaFetchTimer);
  }
  loading.value = true;
  stockBodegaFetchTimer = setTimeout(() => {
    stockBodegaFetchTimer = null;
    void fetchRecords();
  }, 350);
}

function applyFilters() {
  serverPage.value = 1;
  void fetchRecords();
}

function clearFilters() {
  search.value = "";
  stockWarehouseFilter.value = "";
  stockProductFilter.value = "";
  stockUsedFilter.value = "";
  stockLevelFilter.value = "";
  productStatusFilter.value = "";
  productLineFilter.value = "";
  productCategoryFilter.value = "";
  productBrandFilter.value = "";
  productUnitFilter.value = "";
  productOilFilter.value = "";
  productServiceFilter.value = "";
  serverPage.value = 1;
}

function refreshRecords() {
  void fetchRecords();
}

watch(
  () => props.moduleKey,
  async () => {
    if (!moduleConfig.value) return;
    if (stockBodegaFetchTimer) {
      clearTimeout(stockBodegaFetchTimer);
      stockBodegaFetchTimer = null;
    }
    stockWarehouseFilter.value = "";
    stockProductFilter.value = "";
    stockUsedFilter.value = "";
    stockLevelFilter.value = "";
    productStatusFilter.value = "";
    productLineFilter.value = "";
    productCategoryFilter.value = "";
    productBrandFilter.value = "";
    productUnitFilter.value = "";
    productOilFilter.value = "";
    productServiceFilter.value = "";
    serverPage.value = 1;
    serverItemsPerPage.value = 20;
    serverTotalItems.value = 0;
    relationOptions.value = {};
    relationOptionsLoaded.table = false;
    relationOptionsLoaded.form = false;
    resetForm();
    await hydrateModuleData();
  },
  { immediate: true }
);

watch(
  () => form.bodega_id,
  () => {
    const cfg = moduleConfig.value;
    if (!cfg) return;
    const productField = cfg.fields.find((field) => field.key === "producto_id");
    if (!productField) return;
    const stillExists = getSelectOptions(productField).some(
      (option) => String(option.value) === String(form.producto_id || ""),
    );
    if (!stillExists) {
      form.producto_id = "";
    }
  },
);

watch(
  () => form.identificacion,
  () => {
    if (!dialog.value || !isThirdPartyModule.value) return;
    scheduleThirdPartyLookup(false);
  },
);

watch(
  () => [dialog.value, form.nombre, form.es_aceite],
  () => {
    syncProductOilDefaults();
  },
);

watch(
  () => relationOptions.value.unidad_medida_id?.length ?? 0,
  () => {
    syncProductOilDefaults();
  },
);

watch(
  () => dialog.value,
  (open) => {
    if (open) return;
    clearThirdPartyLookupTimer();
    thirdPartyLookupLoading.value = false;
  },
);

watch(
  () => [
    search.value,
    stockWarehouseFilter.value,
    stockProductFilter.value,
    stockUsedFilter.value,
    stockLevelFilter.value,
    productStatusFilter.value,
    productLineFilter.value,
    productCategoryFilter.value,
    productBrandFilter.value,
    productUnitFilter.value,
    productOilFilter.value,
    productServiceFilter.value,
  ],
  () => {
    serverPage.value = 1;
    scheduleServerFetch();
  },
);

watch(
  () => [
    dialog.value,
    isStockBodegaModule.value,
    form.stock_nuevo,
    form.stock_usado,
    form.stock_critico,
    form.stock_fisico,
    form.es_usado,
  ],
  () => {
    if (!dialog.value || !isStockBodegaModule.value) return;
    syncStockTotals();
  },
);

onMounted(async () => {
  if (!moduleConfig.value || !canRead.value || records.value.length || initialLoading.value) return;
  await hydrateModuleData();
});
</script>

<style scoped>
.inventory-dialog-card {
  min-height: 100%;
}

.inventory-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

.reservation-summary {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

@media (max-width: 960px) {
  .inventory-table :deep(.v-data-table-footer__items-per-page),
  .inventory-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

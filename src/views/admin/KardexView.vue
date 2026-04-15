<template>
  <v-row dense>
    <v-col v-if="!canRead" cols="12">
      <v-alert type="warning" variant="tonal">
        No tienes permisos para visualizar este módulo.
      </v-alert>
    </v-col>

    <template v-else>
    <v-col cols="12" lg="4">
      <v-card rounded="xl" class="pa-4 h-100 enterprise-surface">
        <div class="text-h6 font-weight-bold mb-2">Movimiento manual</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Selecciona primero la bodega y luego el material para registrar ingresos y salidas con mejor control.
        </div>

        <v-select
          v-model="movementForm.bodegaId"
          :items="warehouseOptions"
          item-title="title"
          item-value="value"
          label="Bodega"
          variant="outlined"
          class="mb-2"
        />

        <v-autocomplete
          v-model="movementForm.productoId"
          :items="productOptions"
          item-title="title"
          item-value="value"
          label="Material"
          variant="outlined"
          class="mb-2"
          :disabled="!movementForm.bodegaId"
          clearable
          no-data-text="Selecciona una bodega para listar materiales"
        />

        <v-select
          v-model="movementForm.tipo"
          :items="movementTypes"
          item-title="title"
          item-value="value"
          label="Tipo de movimiento"
          variant="outlined"
          class="mb-2"
        />

        <v-alert
          v-if="selectedStockRow"
          :type="movementForm.tipo === 'SALIDA' ? 'warning' : 'info'"
          variant="tonal"
          class="mb-3"
        >
          <div class="font-weight-medium">
            Stock actual en bodega: {{ formatNumberForDisplay(selectedStockRow.stock_actual) }}
          </div>
          <div class="text-caption">
            Mínimo: {{ formatNumberForDisplay(selectedStockRow.stock_min_bodega) }} · Máximo:
            {{ formatNumberForDisplay(selectedStockRow.stock_max_bodega) }}
          </div>
        </v-alert>

        <v-text-field
          v-model="movementForm.cantidad"
          type="number"
          min="0"
          label="Cantidad"
          variant="outlined"
          class="mb-2"
        />

        <v-textarea
          v-model="movementForm.observacion"
          label="Observación"
          variant="outlined"
          rows="2"
          auto-grow
          class="mb-2"
        />

        <v-btn
          v-if="canCreate"
          color="primary"
          block
          :loading="savingMovement"
          @click="saveMovement"
        >
          Registrar movimiento
        </v-btn>
      </v-card>
    </v-col>

    <v-col cols="12" lg="8">
      <v-card rounded="xl" class="pa-4 mb-4 enterprise-surface">
        <div class="text-h6 font-weight-bold mb-2">Carga masiva CSV/XLSX</div>
        <div class="text-body-2 text-medium-emphasis mb-3">
          Sube el inventario por CSV o Excel. El sistema creará materiales nuevos, dará de alta catálogos faltantes y ajustará ingresos o salidas por diferencia de stock.
        </div>

        <v-file-input
          v-model="xlsxFile"
          accept=".csv,.xlsx,.xls,text/csv"
          prepend-icon="mdi-file-excel"
          label="Selecciona archivo CSV o XLSX"
          variant="outlined"
          show-size
          class="mb-3"
        />

        <div class="d-flex flex-wrap" style="gap: 8px;">
          <v-btn
            v-if="canCreate"
            color="primary"
            prepend-icon="mdi-upload"
            :loading="uploading"
            @click="processXlsx"
          >
            Procesar carga masiva
          </v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-download" :loading="downloadingTemplate" @click="downloadTemplate">
            Descargar formato
          </v-btn>
          <v-chip v-if="lastBulkSummary" color="success" variant="tonal">
            Procesados: {{ lastBulkSummary.procesados }} · Creados: {{ lastBulkSummary.creados }} ·
            Actualizados: {{ lastBulkSummary.actualizados }} · Ingresos: {{ lastBulkSummary.ingresos }} ·
            Salidas: {{ lastBulkSummary.salidas }}
          </v-chip>
        </div>

        <v-alert
          v-if="activeImportJob"
          type="info"
          variant="tonal"
          class="mt-3"
        >
          <div class="d-flex align-center justify-space-between" style="gap: 12px; flex-wrap: wrap;">
            <div>
              <div class="font-weight-medium">Carga en servidor</div>
              <div class="text-caption">
                {{ activeImportJob.source_file_name || activeImportJob.stored_file_name || "Inventario" }}
              </div>
            </div>
            <v-chip :color="importJobColor(activeImportJob.status)" variant="tonal" label>
              {{ importJobStatusLabel(activeImportJob.status) }}
            </v-chip>
          </div>
          <div class="text-body-2 mt-2">
            {{ activeImportJob.current_step || "Procesando archivo..." }}
          </div>
          <div class="d-flex flex-wrap mt-3" style="gap: 8px;">
            <v-chip size="small" variant="tonal" color="primary" label>
              Total: {{ activeImportTotalRows }}
            </v-chip>
            <v-chip size="small" variant="tonal" color="success" label>
              Procesados: {{ activeImportProcessedRows }}
            </v-chip>
            <v-chip size="small" variant="tonal" color="warning" label>
              Pendientes: {{ activeImportPendingRows }}
            </v-chip>
            <v-chip size="small" variant="tonal" color="secondary" label>
              Avance: {{ activeImportProgress }}%
            </v-chip>
          </div>
          <v-progress-linear
            class="mt-3"
            :model-value="activeImportProgress"
            :color="importJobColor(activeImportJob.status)"
            :indeterminate="activeImportProgress <= 0 || activeImportProgress >= 100 && activeImportJob.status === 'PROCESSING'"
            rounded
            height="10"
          />
          <div class="text-caption mt-2">
            {{ activeImportProcessedRows }} procesadas de {{ activeImportTotalRows }} fila(s). Faltan {{ activeImportPendingRows }}.
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            Si sales de esta pantalla y vuelves a entrar, el progreso seguirá mostrándose automáticamente.
          </div>
          <div v-if="activeImportJob.error_message" class="text-caption text-error mt-2">
            {{ activeImportJob.error_message }}
          </div>
        </v-alert>

        <v-alert
          v-if="lastBulkSummary?.errores?.length"
          type="warning"
          variant="tonal"
          class="mt-3"
        >
          <div class="font-weight-medium mb-2">Errores detectados en la importación</div>
          <div
            v-for="(error, index) in lastBulkSummary.errores.slice(0, 8)"
            :key="`${index}-${error}`"
            class="text-caption"
          >
            {{ error }}
          </div>
          <div v-if="lastBulkSummary.errores.length > 8" class="text-caption mt-1">
            ... y {{ lastBulkSummary.errores.length - 8 }} errores adicionales.
          </div>
        </v-alert>
      </v-card>

      <v-card rounded="xl" class="pa-4 enterprise-surface">
        <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-h6 font-weight-bold">Kardex</div>
            <div class="text-body-2 text-medium-emphasis">
              Historial de movimientos con indicación clara de ingreso o salida.
            </div>
          </div>
          <div class="d-flex align-center flex-wrap" style="gap: 8px;">
            <v-select
              v-model="inventoryGroupBy"
              :items="inventoryGroupingOptions"
              item-title="title"
              item-value="value"
              label="Agrupar inventario por"
              variant="outlined"
              density="compact"
              hide-details
              style="min-width: 220px;"
            />
            <v-btn
              v-if="canAccessInventoryReports"
              variant="tonal"
              prepend-icon="mdi-file-excel"
              :loading="isExporting('excel')"
              @click="exportInventoryReport('excel')"
            >
              Excel
            </v-btn>
            <v-btn
              v-if="canAccessInventoryReports"
              variant="tonal"
              prepend-icon="mdi-file-pdf-box"
              :loading="isExporting('pdf')"
              @click="exportInventoryReport('pdf')"
            >
              PDF
            </v-btn>
            <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loadingKardex" @click="loadKardex">
              Recargar
            </v-btn>
          </div>
        </div>

        <v-data-table
          :headers="kardexHeaders"
          :items="kardexRows"
          :loading="loadingKardex"
          loading-text="Obteniendo movimientos de kardex..."
          :items-per-page="20"
          class="elevation-0 enterprise-table"
        >
          <template #item.tipo="{ item }">
            <v-chip
              size="small"
              variant="tonal"
              :color="item.tipo_movimiento === 'INGRESO' ? 'success' : 'error'"
            >
              {{ item.tipo_movimiento === "INGRESO" ? "Ingreso" : "Salida" }}
            </v-chip>
          </template>

          <template #item.movimiento="{ item }">
            <span
              class="font-weight-bold"
              :class="item.tipo_movimiento === 'INGRESO' ? 'text-success' : 'text-error'"
            >
              {{ item.tipo_movimiento === "INGRESO" ? "+" : "-" }}
              {{ item.tipo_movimiento === "INGRESO"
                ? item.entrada_cantidad
                : item.salida_cantidad }}
            </span>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
    </template>
  </v-row>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { fetchProductsWithStock } from "@/app/services/products-inventory.service";
import { hasReportAccess } from "@/app/config/report-access";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { listAllPages } from "@/app/utils/list-all-pages";
import { formatDateTime } from "@/app/utils/date-time";
import {
  buildInventoryStockReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";

type MovementType = "INGRESO" | "SALIDA";

type StockRow = {
  id: string;
  bodega_id: string;
  producto_id: string;
  stock_actual: string;
  stock_min_bodega: string;
  stock_max_bodega: string;
  stock_min_global: string;
  stock_contenedores: string;
  costo_promedio_bodega: string;
};

type KardexRow = {
  id: string;
  fecha: string;
  tipo_movimiento: string;
  producto_id: string;
  bodega_id: string;
  entrada_cantidad: string;
  salida_cantidad: string;
  saldo_cantidad: string;
  costo_unitario: string;
};

type ImportSummary = {
  procesados: number;
  omitidos: number;
  creados: number;
  actualizados: number;
  ingresos: number;
  salidas: number;
  errores: string[];
};

type ImportJob = {
  id: string;
  status: string;
  progress: number;
  source_file_name?: string | null;
  stored_file_name?: string | null;
  current_step?: string | null;
  current_index?: number;
  total_rows?: number;
  summary?: ImportSummary | null;
  error_message?: string | null;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();

const savingMovement = ref(false);
const uploading = ref(false);
const downloadingTemplate = ref(false);
const loadingKardex = ref(false);
const importJob = ref<ImportJob | null>(null);
const importPollHandle = ref<number | null>(null);
const exportState = reactive<Record<string, boolean>>({});

const xlsxFile = ref<File | null>(null);
const lastBulkSummary = ref<ImportSummary | null>(null);
const inventoryGroupBy = ref("bodega");
const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "Kardex",
    "Movimientos de kardex",
    "Movimiento de kardex",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canAccessInventoryReports = computed(() =>
  hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "inventario"),
);

const KARDEx_IMPORT_JOB_STORAGE_KEY = "kpi_inventory_kardex_import_job_id";

const movementForm = reactive({
  tipo: "INGRESO" as MovementType,
  productoId: "",
  bodegaId: "",
  cantidad: "1",
  observacion: "",
});

const products = ref<any[]>([]);
const bodegas = ref<any[]>([]);
const stocks = ref<StockRow[]>([]);
const kardex = ref<KardexRow[]>([]);
const sucursales = ref<any[]>([]);
const lineas = ref<any[]>([]);
const categorias = ref<any[]>([]);

const movementTypes = [
  { value: "INGRESO", title: "Ingreso de material" },
  { value: "SALIDA", title: "Salida de material" },
];

const inventoryGroupingOptions = [
  { value: "bodega", title: "Bodega" },
  { value: "sucursal", title: "Sucursal" },
  { value: "linea", title: "Línea" },
  { value: "categoria", title: "Categoría" },
  { value: "material", title: "Material" },
];

const warehouseOptions = computed(() =>
  bodegas.value.map((b) => ({
    value: b.id,
    title: `${b.codigo} - ${b.nombre}`,
  }))
);

const warehouseMap = computed(() => new Map(bodegas.value.map((item) => [String(item.id), item])));
const productMap = computed(() => new Map(products.value.map((item) => [String(item.id), item])));
const branchMap = computed(() => new Map(sucursales.value.map((item) => [String(item.id), item])));
const lineMap = computed(() => new Map(lineas.value.map((item) => [String(item.id), item])));
const categoryMap = computed(() => new Map(categorias.value.map((item) => [String(item.id), item])));

const stockByWarehouseProduct = computed(() => {
  const map = new Map<string, StockRow>();
  for (const row of stocks.value) {
    map.set(`${row.bodega_id}:${row.producto_id}`, row);
  }
  return map;
});

const selectedStockRow = computed(() => {
  if (!movementForm.bodegaId || !movementForm.productoId) return null;
  return (
    stockByWarehouseProduct.value.get(
      `${movementForm.bodegaId}:${movementForm.productoId}`,
    ) ?? null
  );
});

const activeImportJob = computed(() => {
  if (!importJob.value) return null;
  const status = String(importJob.value.status || "").toUpperCase();
  return status === "QUEUED" || status === "PROCESSING" ? importJob.value : null;
});

const activeImportProgress = computed(() => {
  const progress = Number(importJob.value?.progress || 0);
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
});

const activeImportTotalRows = computed(() => {
  const total = Number(importJob.value?.total_rows || 0);
  return Number.isFinite(total) && total > 0 ? total : 0;
});

const activeImportProcessedRows = computed(() => {
  const processed = Number(importJob.value?.current_index || 0);
  return Number.isFinite(processed) && processed > 0 ? processed : 0;
});

const activeImportPendingRows = computed(() =>
  Math.max(0, activeImportTotalRows.value - activeImportProcessedRows.value),
);

const productOptions = computed(() => {
  if (!movementForm.bodegaId) return [];

  return products.value
    .filter((product) => {
      const stock = stockByWarehouseProduct.value.get(
        `${movementForm.bodegaId}:${product.id}`,
      );
      if (movementForm.tipo !== "SALIDA") return true;
      return Number(stock?.stock_actual || 0) > 0;
    })
    .map((product) => {
      const stock = stockByWarehouseProduct.value.get(
        `${movementForm.bodegaId}:${product.id}`,
      );
      const stockLabel = stock
        ? ` · stock ${formatNumberForDisplay(stock.stock_actual)}`
        : "";
      return {
        value: product.id,
        title: `${product.codigo} - ${product.nombre}${stockLabel}`,
      };
    });
});

const kardexHeaders = [
  { title: "Fecha", key: "fecha" },
  { title: "Tipo", key: "tipo" },
  { title: "Movimiento", key: "movimiento" },
  { title: "Material", key: "producto" },
  { title: "Bodega", key: "bodega" },
  { title: "Saldo", key: "saldo_cantidad" },
  { title: "Costo unitario", key: "costo_unitario" },
];

const kardexRows = computed(() => {
  const productNameById = new Map(
    products.value.map((p) => [p.id, `${p.codigo} - ${p.nombre}`]),
  );
  const bodegaNameById = new Map(
    bodegas.value.map((b) => [b.id, `${b.codigo} - ${b.nombre}`]),
  );

  return kardex.value.map((row) => ({
    ...row,
    fecha: formatDateTime(row.fecha, String(row.fecha ?? "")),
    producto: productNameById.get(row.producto_id) ?? row.producto_id,
    bodega: bodegaNameById.get(row.bodega_id) ?? row.bodega_id,
    entrada_cantidad: formatNumberForDisplay(row.entrada_cantidad),
    salida_cantidad: formatNumberForDisplay(row.salida_cantidad),
    saldo_cantidad: formatNumberForDisplay(row.saldo_cantidad),
    costo_unitario: formatNumberForDisplay(row.costo_unitario),
  }));
});

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function parsePositiveNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resetMovementForm() {
  movementForm.tipo = "INGRESO";
  movementForm.bodegaId = "";
  movementForm.productoId = "";
  movementForm.cantidad = "";
  movementForm.observacion = "";
}

async function listAll(endpoint: string) {
  return listAllPages(endpoint);
}

async function loadBaseData() {
  if (!canRead.value) return;
  try {
    const inventory = await fetchProductsWithStock();
    products.value = inventory.productos;
    bodegas.value = inventory.bodegas;
    stocks.value = inventory.stocks as StockRow[];
    sucursales.value = inventory.sucursales ?? [];
    lineas.value = inventory.lineas ?? [];
    categorias.value = inventory.categorias ?? [];
  } catch (error: any) {
    products.value = [];
    bodegas.value = [];
    stocks.value = [];
    sucursales.value = [];
    lineas.value = [];
    categorias.value = [];
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudieron cargar los catálogos de inventario.",
    );
  }
}

function exportKey(format: "excel" | "pdf") {
  return `inventory:${format}`;
}

function isExporting(format: "excel" | "pdf") {
  return Boolean(exportState[exportKey(format)]);
}

const inventoryReportRows = computed(() => {
  const rows = stocks.value.map((stock) => {
    const product = productMap.value.get(String(stock.producto_id));
    const warehouse = warehouseMap.value.get(String(stock.bodega_id));
    const branch = branchMap.value.get(String(warehouse?.sucursal_id || ""));
    const line = lineMap.value.get(String(product?.linea_id || ""));
    const category = categoryMap.value.get(String(product?.categoria_id || ""));
    return {
      agrupacion:
        inventoryGroupBy.value === "sucursal"
          ? `${branch?.codigo || ""} - ${branch?.nombre || "Sin sucursal"}`
          : inventoryGroupBy.value === "linea"
            ? `${line?.codigo || ""} - ${line?.nombre || "Sin línea"}`
            : inventoryGroupBy.value === "categoria"
              ? String(category?.nombre || "Sin categoría")
              : inventoryGroupBy.value === "material"
                ? `${product?.codigo || ""} - ${product?.nombre || "Sin material"}`
                : `${warehouse?.codigo || ""} - ${warehouse?.nombre || "Sin bodega"}`,
      sucursal: `${branch?.codigo || ""} - ${branch?.nombre || "Sin sucursal"}`,
      bodega: `${warehouse?.codigo || ""} - ${warehouse?.nombre || "Sin bodega"}`,
      linea: `${line?.codigo || ""} - ${line?.nombre || "Sin línea"}`,
      categoria: String(category?.nombre || "Sin categoría"),
      codigo_material: String(product?.codigo || ""),
      material: String(product?.nombre || stock.producto_id || ""),
      stock_actual: Number(stock.stock_actual || 0),
      stock_minimo: Number(stock.stock_min_bodega || 0),
      stock_maximo: Number(stock.stock_max_bodega || 0),
      costo_promedio_bodega: Number(stock.costo_promedio_bodega || 0),
    };
  });

  return rows.sort((a, b) =>
    `${a.agrupacion}|${a.codigo_material}|${a.material}`.localeCompare(
      `${b.agrupacion}|${b.codigo_material}|${b.material}`,
    ),
  );
});

const inventorySummary = computed(() => [
  { label: "Registros de stock", value: inventoryReportRows.value.length },
  { label: "Bodegas", value: new Set(inventoryReportRows.value.map((item) => item.bodega)).size },
  { label: "Sucursales", value: new Set(inventoryReportRows.value.map((item) => item.sucursal)).size },
  {
    label: "Stock total",
    value: inventoryReportRows.value.reduce((acc, item) => acc + Number(item.stock_actual || 0), 0).toFixed(2),
  },
]);

async function exportInventoryReport(format: "excel" | "pdf") {
  if (!canAccessInventoryReports.value) {
    ui.error("No tienes permisos para exportar este reporte.");
    return;
  }
  const key = exportKey(format);
  exportState[key] = true;
  try {
    const report = buildInventoryStockReport({
      groupLabel: inventoryGroupingOptions.find((item) => item.value === inventoryGroupBy.value)?.title || "Bodega",
      summary: inventorySummary.value,
      rows: inventoryReportRows.value,
      movementRows: kardexRows.value,
    });
    if (format === "excel") {
      await downloadReportExcel(report);
    } else {
      await downloadReportPdf(report);
    }
  } catch (error: any) {
    ui.error(error?.message || "No se pudo generar el reporte de inventario.");
  } finally {
    exportState[key] = false;
  }
}

async function loadKardex() {
  if (!canRead.value) return;
  loadingKardex.value = true;
  try {
    kardex.value = (await listAll("/kpi_inventory/kardex")) as KardexRow[];
  } catch (error: any) {
    ui.error(error?.response?.data?.message || "No se pudo cargar kardex.");
  } finally {
    loadingKardex.value = false;
  }
}

async function saveMovement() {
  if (!canCreate.value) {
    ui.error("No tienes permisos para registrar movimientos.");
    return;
  }
  const cantidad = parsePositiveNumber(movementForm.cantidad);

  if (!movementForm.bodegaId) {
    ui.error("La bodega es obligatoria.");
    return;
  }

  if (!movementForm.productoId) {
    ui.error("El material es obligatorio.");
    return;
  }

  if (!cantidad) {
    ui.error("La cantidad debe ser mayor a cero.");
    return;
  }

  savingMovement.value = true;
  try {
    await api.post("/kpi_inventory/kardex/movimiento-manual", {
      tipo_movimiento: movementForm.tipo,
      bodega_id: movementForm.bodegaId,
      producto_id: movementForm.productoId,
      cantidad,
      observacion: movementForm.observacion || undefined,
      created_by: getUserName(),
      updated_by: getUserName(),
    });

    ui.success(
      `${movementForm.tipo === "INGRESO" ? "Ingreso" : "Salida"} registrado correctamente.`,
    );
    resetMovementForm();
    await Promise.allSettled([loadKardex(), loadBaseData()]);
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo registrar el movimiento.",
    );
  } finally {
    savingMovement.value = false;
  }
}

function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission === "default") {
    void window.Notification.requestPermission().catch(() => undefined);
  }
}

function emitBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;
  try {
    new window.Notification(title, { body, tag });
  } catch {
    // ignore notification failures
  }
}

function notifyImportLifecycle(options: {
  title: string;
  message: string;
  variant?: "success" | "error" | "info" | "warning";
  requestPermission?: boolean;
  tag: string;
}) {
  if (options.requestPermission) requestBrowserNotificationPermission();
  ui.open(options.message, options.variant ?? "info", 5000);
  emitBrowserNotification(options.title, options.message, options.tag);
}

function importJobColor(status: unknown) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "FAILED") return "error";
  if (normalized === "COMPLETED") return "success";
  if (normalized === "PROCESSING") return "warning";
  return "secondary";
}

function importJobStatusLabel(status: unknown) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "FAILED") return "Falló";
  if (normalized === "COMPLETED") return "Completada";
  if (normalized === "PROCESSING") return "Procesando";
  if (normalized === "QUEUED") return "En cola";
  return normalized || "Pendiente";
}

function persistImportJobId(jobId: string | null) {
  if (typeof window === "undefined") return;
  if (jobId) {
    window.localStorage.setItem(KARDEx_IMPORT_JOB_STORAGE_KEY, jobId);
    return;
  }
  window.localStorage.removeItem(KARDEx_IMPORT_JOB_STORAGE_KEY);
}

function getPersistedImportJobId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KARDEx_IMPORT_JOB_STORAGE_KEY);
}

function stopImportPolling() {
  if (importPollHandle.value != null) {
    window.clearInterval(importPollHandle.value);
    importPollHandle.value = null;
  }
}

async function fetchImportJobStatus(jobId: string) {
  const { data } = await api.get(`/kpi_inventory/kardex/import/${jobId}`);
  importJob.value = (data?.data ?? data) as ImportJob | null;

  if (!importJob.value) {
    persistImportJobId(null);
    stopImportPolling();
    return;
  }

  const status = String(importJob.value.status || "").toUpperCase();
  if (status === "COMPLETED") {
    stopImportPolling();
    persistImportJobId(null);
    lastBulkSummary.value = importJob.value.summary ?? null;
    importJob.value = null;
    notifyImportLifecycle({
      title: "Carga de inventario finalizada",
      message: "El archivo de inventario se procesó correctamente.",
      variant: "success",
      tag: "inventory-import-completed",
    });
    await Promise.allSettled([loadBaseData(), loadKardex()]);
    return;
  }

  if (status === "FAILED") {
    stopImportPolling();
    persistImportJobId(null);
    const failureMessage =
      importJob.value.error_message || "La carga de inventario falló.";
    importJob.value = null;
    notifyImportLifecycle({
      title: "Carga de inventario fallida",
      message: failureMessage,
      variant: "error",
      tag: "inventory-import-failed",
    });
  }
}

function startImportPolling(jobId: string) {
  stopImportPolling();
  importPollHandle.value = window.setInterval(() => {
    void fetchImportJobStatus(jobId).catch(() => undefined);
  }, 2500);
}

async function restoreImportJob() {
  const jobId = getPersistedImportJobId();
  if (!jobId) return;
  try {
    await fetchImportJobStatus(jobId);
    if (importJob.value) {
      startImportPolling(jobId);
    }
  } catch {
    persistImportJobId(null);
    importJob.value = null;
  }
}

async function processXlsx() {
  if (!canCreate.value) {
    ui.error("No tienes permisos para procesar cargas masivas.");
    return;
  }
  if (!xlsxFile.value) {
    ui.error("Debes seleccionar un archivo CSV o XLSX.");
    return;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", xlsxFile.value);
    formData.append("requested_by", getUserName());

    const { data } = await api.post("/kpi_inventory/kardex/import/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const job = (data?.data ?? data) as ImportJob | null;
    importJob.value = job;
    lastBulkSummary.value = null;
    xlsxFile.value = null;
    if (job?.id) {
      persistImportJobId(job.id);
      notifyImportLifecycle({
        title: "Carga de inventario iniciada",
        message:
          "Archivo recibido. El sistema lo está procesando en segundo plano.",
        variant: "info",
        requestPermission: true,
        tag: "inventory-import-started",
      });
      startImportPolling(job.id);
      await fetchImportJobStatus(job.id);
    } else {
      ui.open("La carga fue recibida, pero no se pudo identificar el job.", "warning");
    }
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo procesar la carga masiva.",
    );
  } finally {
    uploading.value = false;
  }
}

async function downloadTemplate() {
  downloadingTemplate.value = true;
  try {
    const response = await api.post("/kpi_inventory/kardex/import/template", null, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "FORMATO_CARGA_INVENTARIO.xlsx";
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo descargar el formato.",
    );
  } finally {
    downloadingTemplate.value = false;
  }
}

watch(
  () => movementForm.bodegaId,
  () => {
    movementForm.productoId = "";
  },
);

watch(
  () => movementForm.tipo,
  () => {
    if (!movementForm.productoId) return;
    const stillExists = productOptions.value.some(
      (item) => item.value === movementForm.productoId,
    );
    if (!stillExists) {
      movementForm.productoId = "";
    }
  },
);

onMounted(async () => {
  if (!canRead.value) return;
  await Promise.allSettled([loadBaseData(), loadKardex()]);
  await restoreImportJob();
});

onBeforeUnmount(() => {
  stopImportPolling();
});
</script>

<template>
  <v-row dense>
    <v-col v-if="!canRead" cols="12">
      <v-alert type="warning" variant="tonal">
        No tienes permisos para visualizar este módulo.
      </v-alert>
    </v-col>

    <template v-else>
      <v-col cols="12" xl="5">
        <v-card rounded="xl" class="pa-4 mb-4 enterprise-surface">
          <div class="text-h6 font-weight-bold mb-2">Ingreso / Egreso de Bodega</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Registra una transacción con cabecera y detalle. El sistema generará el código `IB` o `EB`.
          </div>

          <v-row dense>
            <v-col cols="12" md="6">
              <v-select
                v-model="documentForm.tipo"
                :items="movementTypes"
                item-title="title"
                item-value="value"
                label="Tipo de documento"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="documentForm.fecha"
                type="date"
                label="Fecha"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="documentForm.bodegaId"
                :items="warehouseOptions"
                item-title="title"
                item-value="value"
                label="Bodega"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="documentForm.referencia"
                label="Referencia"
                variant="outlined"
                placeholder="Opcional"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="documentForm.tipo === 'INGRESO' ? 'IB-########' : 'EB-########'"
                label="Código generado"
                variant="outlined"
                readonly
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="documentForm.observacion"
                label="Observación general"
                variant="outlined"
                rows="2"
                auto-grow
              />
            </v-col>
          </v-row>

          <div class="d-flex align-center justify-space-between mb-3" style="gap: 12px; flex-wrap: wrap;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Detalle de materiales</div>
              <div class="text-body-2 text-medium-emphasis">
                Agrega todos los materiales de la transacción.
              </div>
            </div>
            <v-btn
              v-if="canCreate"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="addMovementDetail"
            >
              Agregar material
            </v-btn>
          </div>

          <v-alert
            v-if="!documentForm.bodegaId"
            type="info"
            variant="tonal"
            class="mb-3"
          >
            Selecciona una bodega para habilitar el detalle y validar stock.
          </v-alert>

          <div class="movement-detail-list">
            <v-card
              v-for="(detail, index) in movementDetails"
              :key="detail.localId"
              rounded="xl"
              variant="tonal"
              class="pa-3 movement-detail-card"
            >
              <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px;">
                <div class="text-subtitle-2 font-weight-bold">Material {{ index + 1 }}</div>
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  color="error"
                  density="comfortable"
                  :disabled="movementDetails.length === 1"
                  @click="removeMovementDetail(detail.localId)"
                />
              </div>

              <v-row dense>
                <v-col cols="12">
                  <v-autocomplete
                    v-model="detail.productoId"
                    :items="getProductOptions()"
                    item-title="title"
                    item-value="value"
                    label="Material"
                    variant="outlined"
                    :disabled="!documentForm.bodegaId"
                    clearable
                    no-data-text="No hay materiales disponibles para esta bodega"
                  />
                </v-col>
                <v-col cols="12" md="5">
                  <v-text-field
                    :model-value="getDetailStockLabel(detail)"
                    label="Stock actual"
                    variant="outlined"
                    readonly
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="detail.cantidad"
                    type="number"
                    min="0"
                    label="Cantidad"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-chip
                    class="mt-md-2"
                    :color="documentForm.tipo === 'SALIDA' ? 'warning' : 'info'"
                    variant="tonal"
                    label
                  >
                    {{ documentForm.tipo === "SALIDA" ? "Descuenta stock" : "Suma stock" }}
                  </v-chip>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="detail.observacion"
                    label="Observación del detalle"
                    variant="outlined"
                    rows="2"
                    auto-grow
                  />
                </v-col>
              </v-row>

              <v-alert
                v-if="detailExceedsStock(detail)"
                type="error"
                variant="tonal"
                density="comfortable"
              >
                La cantidad supera el stock disponible de
                {{ formatNumberForDisplay(getDetailAvailableStock(detail)) }}.
              </v-alert>
            </v-card>
          </div>

          <div class="d-flex flex-wrap mt-4 mb-4" style="gap: 8px;">
            <v-chip color="primary" variant="tonal">{{ movementDetails.length }} materiales</v-chip>
            <v-chip color="secondary" variant="tonal">
              {{ formatNumberForDisplay(documentTotalQuantity) }} unidades
            </v-chip>
          </div>

          <v-btn
            v-if="canCreate"
            color="primary"
            block
            size="large"
            :loading="savingDocument"
            @click="saveMovementDocument"
          >
            Guardar {{ documentForm.tipo === "INGRESO" ? "Ingreso de Bodega" : "Egreso de Bodega" }}
          </v-btn>
        </v-card>

        <v-card rounded="xl" class="pa-4 enterprise-surface">
          <div class="d-flex align-center justify-space-between mb-3" style="gap: 12px; flex-wrap: wrap;">
            <div>
              <div class="text-h6 font-weight-bold">Documentos recientes</div>
              <div class="text-body-2 text-medium-emphasis">
                Consulta cabeceras `IB/EB` y expande cada documento para revisar el detalle.
              </div>
            </div>
            <v-btn
              variant="tonal"
              prepend-icon="mdi-refresh"
              :loading="documentsLoading"
              @click="loadMovementDocuments()"
            >
              Actualizar
            </v-btn>
          </div>

          <v-row dense class="mb-3">
            <v-col cols="12" md="7">
              <v-text-field
                v-model="documentsSearch"
                label="Buscar por código, referencia, bodega o material"
                variant="outlined"
                prepend-inner-icon="mdi-magnify"
                hide-details
                clearable
                @keyup.enter="loadMovementDocuments(1)"
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-select
                v-model="documentTypeFilter"
                :items="documentTypeFilters"
                item-title="title"
                item-value="value"
                label="Tipo"
                variant="outlined"
                hide-details
                @update:model-value="loadMovementDocuments(1)"
              />
            </v-col>
          </v-row>

          <v-progress-linear
            v-if="documentsLoading"
            indeterminate
            color="primary"
            rounded
            class="mb-4"
          />

          <v-alert
            v-if="!documentsLoading && !movementDocuments.length"
            type="info"
            variant="tonal"
          >
            No hay documentos de bodega registrados para los filtros seleccionados.
          </v-alert>

          <v-expansion-panels
            v-else
            multiple
            variant="accordion"
            class="movement-documents"
          >
            <v-expansion-panel
              v-for="document in movementDocuments"
              :key="document.id"
              rounded="xl"
            >
              <v-expansion-panel-title class="movement-document-title">
                <div class="w-100 d-flex align-center justify-space-between flex-wrap" style="gap: 12px;">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{ document.numero_documento || "SIN CÓDIGO" }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ document.tipo_documento_label || "-" }}
                      · {{ formatDateTime(document.fecha_movimiento, "-") }}
                      · {{ document.bodega_label || "Sin bodega" }}
                    </div>
                  </div>
                  <div class="d-flex flex-wrap justify-end" style="gap: 8px;">
                    <v-chip size="small" color="secondary" variant="tonal">
                      {{ document.total_items || 0 }} ítems
                    </v-chip>
                    <v-chip size="small" color="primary" variant="tonal">
                      {{ formatNumberForDisplay(document.total_cantidad || 0) }} unidades
                    </v-chip>
                    <v-chip size="small" color="info" variant="tonal">
                      Ref. {{ document.referencia || "N/A" }}
                    </v-chip>
                  </div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="text-body-2 text-medium-emphasis mb-3">
                  {{ document.observacion || "Sin observación general." }}
                </div>
                <div class="kardex-detail-table">
                  <table class="kardex-table movement-document-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Unidad</th>
                        <th class="text-right">Cantidad</th>
                        <th>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="detail in document.detalles" :key="detail.id">
                        <td>
                          <div class="font-weight-medium">{{ detail.producto_codigo || "-" }}</div>
                          <div>{{ detail.producto_nombre || "-" }}</div>
                        </td>
                        <td>{{ detail.unidad_label || "-" }}</td>
                        <td class="text-right font-weight-bold">
                          {{ formatNumberForDisplay(detail.cantidad || 0) }}
                        </td>
                        <td>{{ detail.observacion || "-" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <div class="d-flex justify-space-between align-center mt-4" style="gap: 12px; flex-wrap: wrap;">
            <div class="text-body-2 text-medium-emphasis">
              {{ documentsPagination.total }} documento(s) encontrados
            </div>
            <v-pagination
              v-model="documentsPagination.page"
              :length="documentsPagination.totalPages"
              :total-visible="6"
              density="comfortable"
              @update:model-value="loadMovementDocuments"
            />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" xl="7">
        <v-card rounded="xl" class="pa-4 mb-4 enterprise-surface">
          <div class="text-h6 font-weight-bold mb-2">Carga masiva CSV/XLSX</div>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Sube el inventario por CSV o Excel. El sistema creará materiales nuevos y ajustará ingresos o salidas por diferencia de stock.
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
            <v-btn
              variant="outlined"
              prepend-icon="mdi-download"
              :loading="downloadingTemplate"
              @click="downloadTemplate"
            >
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
              <div class="text-h6 font-weight-bold">Kardex agrupado por material</div>
              <div class="text-body-2 text-medium-emphasis">
                Consulta el rango seleccionado y expande cada material para revisar ingresos, egresos y sus referencias `IB / EB`.
              </div>
            </div>
            <div class="d-flex align-center flex-wrap" style="gap: 8px;">
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
              <v-btn color="primary" prepend-icon="mdi-magnify" :loading="loadingKardex" @click="loadKardex">
                Consultar
              </v-btn>
            </div>
          </div>

          <v-row dense class="mb-3">
            <v-col cols="12" md="4">
              <v-text-field
                v-model="kardexFilters.search"
                label="Buscar por material, documento o referencia"
                variant="outlined"
                prepend-inner-icon="mdi-magnify"
                hide-details
                clearable
                @keyup.enter="loadKardex"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="kardexFilters.desde"
                type="date"
                label="Desde"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="kardexFilters.hasta"
                type="date"
                label="Hasta"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-select
                v-model="inventoryGroupBy"
                :items="inventoryGroupingOptions"
                item-title="title"
                item-value="value"
                label="Exportar stock"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>

          <div class="d-flex flex-wrap mb-4" style="gap: 8px;">
            <v-chip color="primary" variant="tonal">{{ kardexRangeLabel }}</v-chip>
            <v-chip color="info" variant="tonal">{{ kardexTotals.materiales }} materiales</v-chip>
            <v-chip color="secondary" variant="tonal">{{ kardexTotals.movimientos }} movimientos</v-chip>
            <v-chip color="success" variant="tonal">
              Entradas {{ formatNumberForDisplay(kardexTotals.entradas) }}
            </v-chip>
            <v-chip color="error" variant="tonal">
              Salidas {{ formatNumberForDisplay(kardexTotals.salidas) }}
            </v-chip>
          </div>

          <v-progress-linear
            v-if="loadingKardex"
            indeterminate
            color="primary"
            rounded
            class="mb-4"
          />

          <v-alert
            v-if="!loadingKardex && !kardexGroups.length"
            type="info"
            variant="tonal"
          >
            No hay movimientos de kardex para el rango seleccionado.
          </v-alert>

          <v-expansion-panels
            v-else
            multiple
            variant="accordion"
            class="kardex-groups"
          >
            <v-expansion-panel
              v-for="group in kardexGroups"
              :key="group.producto_id"
              rounded="xl"
            >
              <v-expansion-panel-title class="kardex-group-title">
                <div class="w-100 d-flex align-center justify-space-between flex-wrap" style="gap: 12px;">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">
                      [{{ group.producto_codigo || "SIN CODIGO" }}] {{ group.producto_nombre }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      Línea: {{ group.linea_label || "Sin línea" }}
                      · Categoría: {{ group.categoria_label || "Sin categoría" }}
                      · Unidad: {{ group.unidad_label || "Sin unidad" }}
                    </div>
                  </div>
                  <div class="d-flex flex-wrap justify-end" style="gap: 8px;">
                    <v-chip size="small" color="info" variant="tonal">
                      Stock inicial {{ formatNumberForDisplay(group.stock_inicial) }}
                    </v-chip>
                    <v-chip size="small" color="success" variant="tonal">
                      Entradas +{{ formatNumberForDisplay(group.entradas) }}
                    </v-chip>
                    <v-chip size="small" color="error" variant="tonal">
                      Salidas -{{ formatNumberForDisplay(group.salidas) }}
                    </v-chip>
                    <v-chip size="small" color="primary" variant="tonal">
                      Stock final {{ formatNumberForDisplay(group.stock_final) }}
                    </v-chip>
                    <v-chip size="small" color="secondary" variant="tonal">
                      {{ group.movimientos_count }} movimientos
                    </v-chip>
                  </div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="kardex-detail-table">
                  <table class="kardex-table">
                    <thead>
                      <tr>
                        <th>Fecha emisión</th>
                        <th>F. creación</th>
                        <th>Documento</th>
                        <th>Referencia</th>
                        <th>Concepto</th>
                        <th>Descripción</th>
                        <th>Bodega</th>
                        <th class="text-right">Entrada</th>
                        <th class="text-right">Salida</th>
                        <th class="text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="movement in group.movimientos"
                        :key="movement.id"
                      >
                        <td>{{ formatDateTime(movement.fecha_emision, "") }}</td>
                        <td>{{ formatDateTime(movement.fecha_creacion, "") }}</td>
                        <td class="font-weight-bold">{{ movement.documento || "-" }}</td>
                        <td>{{ movement.referencia || "-" }}</td>
                        <td>{{ movement.concepto || "-" }}</td>
                        <td>{{ movement.descripcion || "-" }}</td>
                        <td>{{ movement.bodega || "-" }}</td>
                        <td class="text-right text-success font-weight-medium">
                          {{ movement.entrada ? formatNumberForDisplay(movement.entrada) : "" }}
                        </td>
                        <td class="text-right text-error font-weight-medium">
                          {{ movement.salida ? formatNumberForDisplay(movement.salida) : "" }}
                        </td>
                        <td class="text-right font-weight-bold">
                          {{ formatNumberForDisplay(movement.stock) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
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
import { formatDateForInput, formatDateTime } from "@/app/utils/date-time";
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

type KardexMovementRow = {
  id: string;
  fecha_emision: string;
  fecha_creacion: string;
  documento: string;
  referencia: string;
  concepto: string;
  descripcion: string;
  bodega: string;
  entrada: number | string;
  salida: number | string;
  stock: number | string;
};

type KardexMaterialGroup = {
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  linea_label: string;
  categoria_label: string;
  unidad_label: string;
  stock_inicial: number;
  entradas: number;
  salidas: number;
  stock_final: number;
  movimientos_count: number;
  movimientos: KardexMovementRow[];
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

type MovementDocumentDetail = {
  id: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  unidad_label: string;
  cantidad: number | string;
  observacion?: string | null;
};

type MovementDocument = {
  id: string;
  numero_documento: string;
  tipo_movimiento: MovementType;
  tipo_documento_label: string;
  fecha_movimiento: string;
  referencia?: string | null;
  observacion?: string | null;
  bodega_label: string;
  total_items: number;
  total_cantidad: number;
  detalles: MovementDocumentDetail[];
};

type MovementDetailForm = {
  localId: string;
  productoId: string;
  cantidad: string;
  observacion: string;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();

const savingDocument = ref(false);
const uploading = ref(false);
const downloadingTemplate = ref(false);
const loadingKardex = ref(false);
const documentsLoading = ref(false);
const importJob = ref<ImportJob | null>(null);
const importPollHandle = ref<number | null>(null);
const exportState = reactive<Record<string, boolean>>({});

const xlsxFile = ref<File | null>(null);
const lastBulkSummary = ref<ImportSummary | null>(null);
const inventoryGroupBy = ref("bodega");
const documentsSearch = ref("");
const documentTypeFilter = ref<"" | MovementType>("");
const movementDocuments = ref<MovementDocument[]>([]);

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

const documentForm = reactive({
  tipo: "INGRESO" as MovementType,
  fecha: formatDateForInput(),
  bodegaId: "",
  referencia: "",
  observacion: "",
});

const movementDetails = ref<MovementDetailForm[]>([createMovementDetail()]);
const documentsPagination = reactive({
  page: 1,
  limit: 6,
  total: 0,
  totalPages: 1,
});

const products = ref<any[]>([]);
const bodegas = ref<any[]>([]);
const stocks = ref<StockRow[]>([]);
const kardexGroups = ref<KardexMaterialGroup[]>([]);
const sucursales = ref<any[]>([]);
const lineas = ref<any[]>([]);
const categorias = ref<any[]>([]);

const kardexFilters = reactive({
  desde: formatDateForInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  hasta: formatDateForInput(),
  search: "",
});

const kardexTotals = reactive({
  materiales: 0,
  movimientos: 0,
  entradas: 0,
  salidas: 0,
});

const movementTypes = [
  { value: "INGRESO", title: "Ingreso de Bodega" },
  { value: "SALIDA", title: "Egreso de Bodega" },
];

const documentTypeFilters = [{ value: "", title: "Todos" }, ...movementTypes];

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
  })),
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

const kardexRangeLabel = computed(() => {
  const from = String(kardexFilters.desde || "").trim();
  const to = String(kardexFilters.hasta || "").trim();
  if (!from && !to) return "Rango abierto";
  if (!from) return `Hasta ${to}`;
  if (!to) return `Desde ${from}`;
  return `${from} -> ${to}`;
});

const documentTotalQuantity = computed(() =>
  movementDetails.value.reduce((sum, detail) => sum + parsePositiveNumber(detail.cantidad), 0),
);

function createMovementDetail(): MovementDetailForm {
  return {
    localId: `detail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productoId: "",
    cantidad: "",
    observacion: "",
  };
}

function addMovementDetail() {
  movementDetails.value.push(createMovementDetail());
}

function removeMovementDetail(localId: string) {
  if (movementDetails.value.length === 1) {
    movementDetails.value = [createMovementDetail()];
    return;
  }
  movementDetails.value = movementDetails.value.filter((detail) => detail.localId !== localId);
}

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function parsePositiveNumber(value: string | number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resetMovementDocumentForm() {
  documentForm.tipo = "INGRESO";
  documentForm.fecha = formatDateForInput();
  documentForm.bodegaId = "";
  documentForm.referencia = "";
  documentForm.observacion = "";
  movementDetails.value = [createMovementDetail()];
}

function getProductOptions() {
  if (!documentForm.bodegaId) return [];

  return products.value
    .filter((product) => {
      if (documentForm.tipo !== "SALIDA") return true;
      const stock = stockByWarehouseProduct.value.get(`${documentForm.bodegaId}:${product.id}`);
      return Number(stock?.stock_actual || 0) > 0;
    })
    .map((product) => {
      const stock = stockByWarehouseProduct.value.get(`${documentForm.bodegaId}:${product.id}`);
      const stockLabel = stock ? ` · stock ${formatNumberForDisplay(stock.stock_actual)}` : "";
      return {
        value: product.id,
        title: `${product.codigo} - ${product.nombre}${stockLabel}`,
      };
    });
}

function getDetailStockRow(detail: MovementDetailForm) {
  if (!documentForm.bodegaId || !detail.productoId) return null;
  return stockByWarehouseProduct.value.get(`${documentForm.bodegaId}:${detail.productoId}`) ?? null;
}

function getDetailAvailableStock(detail: MovementDetailForm) {
  return Number(getDetailStockRow(detail)?.stock_actual || 0);
}

function getDetailStockLabel(detail: MovementDetailForm) {
  if (!detail.productoId) return "Selecciona un material";
  return formatNumberForDisplay(getDetailAvailableStock(detail));
}

function detailExceedsStock(detail: MovementDetailForm) {
  if (documentForm.tipo !== "SALIDA") return false;
  const qty = parsePositiveNumber(detail.cantidad);
  if (!qty) return false;
  return qty > getDetailAvailableStock(detail);
}

const kardexMovementReportRows = computed(() =>
  kardexGroups.value.flatMap((group) =>
    (group.movimientos || []).map((movement) => ({
      codigo_material: group.producto_codigo || "",
      material: group.producto_nombre || "",
      linea: group.linea_label || "",
      categoria: group.categoria_label || "",
      unidad: group.unidad_label || "",
      fecha_emision: movement.fecha_emision,
      fecha_creacion: movement.fecha_creacion,
      documento: movement.documento || "",
      referencia: movement.referencia || "",
      concepto: movement.concepto || "",
      descripcion: movement.descripcion || "",
      bodega: movement.bodega || "",
      entrada: Number(movement.entrada || 0),
      salida: Number(movement.salida || 0),
      stock: Number(movement.stock || 0),
    })),
  ),
);

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
    value: inventoryReportRows.value
      .reduce((acc, item) => acc + Number(item.stock_actual || 0), 0)
      .toFixed(2),
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
      groupLabel:
        inventoryGroupingOptions.find((item) => item.value === inventoryGroupBy.value)?.title ||
        "Bodega",
      summary: inventorySummary.value,
      rows: inventoryReportRows.value,
      movementRows: kardexMovementReportRows.value,
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
    const { data } = await api.get("/kpi_inventory/kardex/resumen-material", {
      params: {
        desde: kardexFilters.desde || undefined,
        hasta: kardexFilters.hasta || undefined,
        search: kardexFilters.search || undefined,
      },
    });
    const payload = data?.data ?? data ?? {};
    kardexGroups.value = Array.isArray(payload?.groups) ? payload.groups : [];
    kardexTotals.materiales = Number(payload?.totals?.materiales || 0);
    kardexTotals.movimientos = Number(payload?.totals?.movimientos || 0);
    kardexTotals.entradas = Number(payload?.totals?.entradas || 0);
    kardexTotals.salidas = Number(payload?.totals?.salidas || 0);
  } catch (error: any) {
    kardexGroups.value = [];
    kardexTotals.materiales = 0;
    kardexTotals.movimientos = 0;
    kardexTotals.entradas = 0;
    kardexTotals.salidas = 0;
    ui.error(error?.response?.data?.message || "No se pudo cargar kardex.");
  } finally {
    loadingKardex.value = false;
  }
}

async function loadMovementDocuments(page = documentsPagination.page) {
  if (!canRead.value) return;
  documentsLoading.value = true;
  try {
    const { data } = await api.get("/kpi_inventory/kardex/documentos/lista", {
      params: {
        page,
        limit: documentsPagination.limit,
        search: documentsSearch.value || undefined,
        tipo_movimiento: documentTypeFilter.value || undefined,
      },
    });
    const payload = data?.data ?? data ?? {};
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const pagination = payload?.pagination ?? {};
    movementDocuments.value = rows;
    documentsPagination.page = Number(pagination?.page || page || 1);
    documentsPagination.limit = Number(pagination?.limit || documentsPagination.limit || 6);
    documentsPagination.total = Number(pagination?.total || rows.length || 0);
    documentsPagination.totalPages = Math.max(1, Number(pagination?.totalPages || 1));
  } catch (error: any) {
    movementDocuments.value = [];
    documentsPagination.total = 0;
    documentsPagination.totalPages = 1;
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar los documentos de bodega.",
    );
  } finally {
    documentsLoading.value = false;
  }
}

async function saveMovementDocument() {
  if (!canCreate.value) {
    ui.error("No tienes permisos para registrar documentos de bodega.");
    return;
  }
  if (!documentForm.bodegaId) {
    ui.error("La bodega es obligatoria.");
    return;
  }

  const candidateDetails = movementDetails.value.filter(
    (detail) =>
      detail.productoId ||
      String(detail.cantidad || "").trim() ||
      String(detail.observacion || "").trim(),
  );

  if (!candidateDetails.length) {
    ui.error("Debes agregar al menos un material al detalle.");
    return;
  }

  const payloadDetails: Array<{ producto_id: string; cantidad: number; observacion?: string }> = [];

  for (const [index, detail] of candidateDetails.entries()) {
    if (!detail.productoId) {
      ui.error(`Selecciona el material en la fila ${index + 1}.`);
      return;
    }
    const cantidad = parsePositiveNumber(detail.cantidad);
    if (!cantidad) {
      ui.error(`La cantidad de la fila ${index + 1} debe ser mayor a cero.`);
      return;
    }
    if (detailExceedsStock(detail)) {
      ui.error(`La fila ${index + 1} supera el stock disponible de la bodega.`);
      return;
    }
    payloadDetails.push({
      producto_id: detail.productoId,
      cantidad,
      observacion: detail.observacion || undefined,
    });
  }

  savingDocument.value = true;
  try {
    await api.post("/kpi_inventory/kardex/documentos", {
      tipo_movimiento: documentForm.tipo,
      fecha_movimiento: documentForm.fecha || undefined,
      bodega_id: documentForm.bodegaId,
      referencia: documentForm.referencia || undefined,
      observacion: documentForm.observacion || undefined,
      created_by: getUserName(),
      updated_by: getUserName(),
      detalles: payloadDetails,
    });

    ui.success(
      `${documentForm.tipo === "INGRESO" ? "Ingreso" : "Egreso"} de bodega registrado correctamente.`,
    );
    resetMovementDocumentForm();
    await Promise.allSettled([loadBaseData(), loadKardex(), loadMovementDocuments(1)]);
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo registrar el documento de bodega.",
    );
  } finally {
    savingDocument.value = false;
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
    // ignore
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
    await Promise.allSettled([loadBaseData(), loadKardex(), loadMovementDocuments(1)]);
    return;
  }

  if (status === "FAILED") {
    stopImportPolling();
    persistImportJobId(null);
    const failureMessage = importJob.value.error_message || "La carga de inventario falló.";
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
        message: "Archivo recibido. El sistema lo está procesando en segundo plano.",
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
  () => documentForm.tipo,
  () => {
    if (documentForm.tipo !== "SALIDA") return;
    movementDetails.value = movementDetails.value.map((detail) => {
      if (!detail.productoId) return detail;
      if (getDetailAvailableStock(detail) > 0) return detail;
      return { ...detail, productoId: "", cantidad: "" };
    });
  },
);

watch(
  () => documentForm.bodegaId,
  () => {
    if (!documentForm.bodegaId) {
      movementDetails.value = movementDetails.value.map((detail) => ({
        ...detail,
        productoId: "",
        cantidad: "",
      }));
    }
  },
);

onMounted(async () => {
  if (!canRead.value) return;
  await Promise.allSettled([loadBaseData(), loadKardex(), loadMovementDocuments(1)]);
  await restoreImportJob();
});

onBeforeUnmount(() => {
  stopImportPolling();
});
</script>

<style scoped>
.movement-detail-list,
.movement-documents,
.kardex-groups {
  display: grid;
  gap: 12px;
}

.movement-detail-card {
  background: rgba(var(--v-theme-primary), 0.04);
}

.movement-document-title,
.kardex-group-title {
  padding-block: 16px;
}

.kardex-detail-table {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 18px;
}

.kardex-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  background: rgba(var(--v-theme-surface), 0.92);
}

.movement-document-table {
  min-width: 720px;
}

.kardex-table th,
.kardex-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 0.92rem;
  vertical-align: top;
}

.kardex-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(var(--v-theme-primary), 0.08);
  white-space: nowrap;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.kardex-table tbody tr:nth-child(even) {
  background: rgba(var(--v-theme-on-surface), 0.02);
}
</style>

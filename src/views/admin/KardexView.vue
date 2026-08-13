
<template>
  <v-row dense>
    <v-col v-if="!canRead" cols="12">
      <v-alert type="warning" variant="tonal">No tienes permisos para visualizar este modulo.</v-alert>
    </v-col>

    <template v-else>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface kardex-main-card">
          <div class="d-flex align-start justify-space-between flex-wrap mb-4" style="gap:16px">
            <div class="kardex-header-copy">
              <div class="text-h5 font-weight-bold">Kardex agrupado por material</div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Revisa el comportamiento del inventario por material y abre el detalle solo cuando lo necesites.
              </div>
            </div>
            <div class="d-flex align-center flex-wrap justify-end" style="gap:8px">
              <MassPurgeButton endpoint="/kpi_inventory/kardex/purge-all" module-title="Kardex y movimientos de inventario" @purged="handleKardexPurged" />
              <v-btn v-if="canCreate" color="success" prepend-icon="mdi-tray-arrow-down" @click="openMovementDialog('INGRESO')">Ingreso de bodega</v-btn>
              <v-btn v-if="canCreate" color="warning" variant="tonal" prepend-icon="mdi-tray-arrow-up" @click="openMovementDialog('SALIDA')">Egreso de bodega</v-btn>
              <v-btn v-if="canAccessInventoryReports" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('excel')" @click="exportInventoryReport('excel')">Excel</v-btn>
              <v-btn v-if="canAccessInventoryReports" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('pdf')" @click="exportInventoryReport('pdf')">PDF</v-btn>
              <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loadingKardex" @click="loadKardex()">Actualizar</v-btn>
            </div>
          </div>

          <v-row dense class="mb-3">
            <v-col cols="12" md="3"><v-text-field v-model="kardexFilters.search" label="Documento, material o bodega" variant="outlined" prepend-inner-icon="mdi-magnify" hide-details clearable @keyup.enter="applyKardexFilters" /></v-col>
            <v-col cols="12" sm="6" md="3"><v-autocomplete v-model="kardexFilters.bodega_id" :items="warehouseOptions" item-title="title" item-value="value" label="Bodega" variant="outlined" hide-details clearable /></v-col>
            <v-col cols="12" sm="6" md="3"><v-autocomplete v-model="kardexFilters.producto_id" :items="kardexProductOptions" item-title="title" item-value="value" label="Material" variant="outlined" hide-details clearable /></v-col>
            <v-col cols="12" sm="6" md="3"><v-autocomplete v-model="kardexFilters.linea_id" :items="lineFilterOptions" item-title="title" item-value="value" label="Línea" variant="outlined" hide-details clearable /></v-col>
            <v-col cols="12" sm="6" md="3"><v-autocomplete v-model="kardexFilters.categoria_id" :items="categoryFilterOptions" item-title="title" item-value="value" label="Categoría" variant="outlined" hide-details clearable /></v-col>
            <v-col cols="12" sm="6" md="3"><v-text-field v-model="kardexFilters.desde" type="date" label="Desde" variant="outlined" hide-details /></v-col>
            <v-col cols="12" sm="6" md="3"><v-text-field v-model="kardexFilters.hasta" type="date" label="Hasta" variant="outlined" hide-details /></v-col>
            <v-col cols="12" sm="6" md="3"><v-select v-model="inventoryGroupBy" :items="inventoryGroupingOptions" item-title="title" item-value="value" label="Agrupar exportación" variant="outlined" hide-details /></v-col>
            <v-col cols="12" class="d-flex justify-end" style="gap: 8px; flex-wrap: wrap;">
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-filter-outline" :loading="loadingKardex" @click="applyKardexFilters">Aplicar filtros</v-btn>
              <v-btn variant="text" prepend-icon="mdi-filter-off" :disabled="!hasActiveKardexFilters" @click="clearKardexFilters">Limpiar</v-btn>
            </v-col>
          </v-row>

          <div class="summary-chip-list mb-4">
            <v-chip color="primary" variant="tonal">{{ kardexRangeLabel }}</v-chip>
            <v-chip color="info" variant="tonal">{{ kardexTotals.materiales }} materiales</v-chip>
            <v-chip color="secondary" variant="tonal">{{ kardexTotals.movimientos }} movimientos</v-chip>
            <v-chip color="success" variant="tonal">Entradas {{ formatNumberForDisplay(kardexTotals.entradas) }}</v-chip>
            <v-chip color="error" variant="tonal">Salidas {{ formatNumberForDisplay(kardexTotals.salidas) }}</v-chip>
          </div>

          <v-progress-linear v-if="loadingKardex" indeterminate color="primary" rounded class="mb-4" />
          <v-alert v-if="!loadingKardex && !kardexGroups.length" type="info" variant="tonal">No hay movimientos de kardex para el rango seleccionado.</v-alert>

          <v-expansion-panels v-else v-model="expandedMaterials" multiple variant="accordion" class="kardex-groups">
              <v-expansion-panel v-for="group in kardexGroups" :key="group.producto_id" :value="group.producto_id" rounded="xl">
              <v-expansion-panel-title class="kardex-group-title" @click="prefetchMaterialDetail(group.producto_id)">
                <div class="w-100 d-flex align-center justify-space-between flex-wrap" style="gap:12px">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">[{{ group.producto_codigo || 'SIN CODIGO' }}] {{ formatKardexProductName(group.producto_id, group.producto_nombre || 'Sin nombre') }}</div>
                    <div class="text-caption text-medium-emphasis mt-1">Linea: {{ group.linea_label || 'Sin linea' }} · Categoria: {{ group.categoria_label || 'Sin categoria' }} · Unidad: {{ group.unidad_label || 'Sin unidad' }}</div>
                  </div>
                  <div class="d-flex flex-wrap justify-end" style="gap:8px">
                    <v-chip size="small" color="info" variant="tonal">Stock inicial {{ formatNumberForDisplay(group.stock_inicial) }}</v-chip>
                    <v-chip size="small" color="success" variant="tonal">Entradas +{{ formatNumberForDisplay(group.entradas) }}</v-chip>
                    <v-chip size="small" color="error" variant="tonal">Salidas -{{ formatNumberForDisplay(group.salidas) }}</v-chip>
                    <v-chip size="small" color="primary" variant="tonal">Stock final {{ formatNumberForDisplay(group.stock_final) }}</v-chip>
                    <v-chip size="small" color="secondary" variant="tonal">{{ group.movimientos_count }} movimientos</v-chip>
                  </div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div v-if="isMaterialDetailLoading(group.producto_id)" class="detail-loading-state">
                  <div class="w-100">
                    <div class="d-flex align-center justify-space-between flex-wrap mb-2" style="gap:12px">
                      <div class="text-body-2 font-weight-medium">Consultando detalle del material...</div>
                      <div class="text-caption text-medium-emphasis">Esto solo carga el material seleccionado.</div>
                    </div>
                    <v-progress-linear indeterminate color="primary" rounded height="8" />
                  </div>
                </div>
                <v-alert v-else-if="getMaterialDetailError(group.producto_id)" type="error" variant="tonal" density="comfortable">{{ getMaterialDetailError(group.producto_id) }}<template #append><v-btn size="small" variant="tonal" color="error" @click="loadMaterialDetail(group.producto_id, true)">Reintentar</v-btn></template></v-alert>
                <v-alert v-else-if="!getMaterialMovements(group.producto_id).length" type="info" variant="tonal" density="comfortable">No hay movimientos detallados para este material dentro del rango seleccionado.</v-alert>
                <div v-else class="kardex-detail-table">
                  <table class="kardex-table">
                    <thead><tr><th>Fecha emision</th><th>F. creacion</th><th>Documento</th><th>Referencia</th><th>Concepto</th><th>Descripcion</th><th>Bodega</th><th>Tipo</th><th>Usuario</th><th class="text-right">Entrada</th><th class="text-right">Salida</th><th class="text-right">Stock</th></tr></thead>
                    <tbody>
                      <tr v-for="movement in getMaterialMovements(group.producto_id)" :key="movement.id">
                        <td>{{ formatDateTime(movement.fecha_emision, '-') }}</td><td>{{ formatDateTime(movement.fecha_creacion, '-') }}</td><td class="font-weight-bold">{{ movement.documento || '-' }}</td><td>{{ movement.referencia || '-' }}</td><td>{{ movement.concepto || '-' }}</td><td>{{ movement.descripcion || '-' }}</td><td>{{ movement.bodega || '-' }}</td><td>{{ movement.tipo_movimiento || '-' }}</td><td>{{ movement.usuario_responsable || 'SYSTEM' }}</td><td class="text-right text-success font-weight-medium">{{ movement.entrada ? formatNumberForDisplay(movement.entrada) : '' }}</td><td class="text-right text-error font-weight-medium">{{ movement.salida ? formatNumberForDisplay(movement.salida) : '' }}</td><td class="text-right font-weight-bold">{{ formatNumberForDisplay(movement.stock) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="canAccessInventoryReports" class="d-flex justify-end mt-4">
                  <v-btn
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-printer"
                    :loading="kardexPdfPreview.loading && kardexPdfPreview.productoId === String(group.producto_id)"
                    @click="openKardexGroupPdfPreview(group)"
                  >
                    Imprimir movimientos del material
                  </v-btn>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <div v-if="kardexGroups.length" class="kardex-pagination">
            <div class="text-body-2 text-medium-emphasis">
              Mostrando {{ kardexPageFrom }} - {{ kardexPageTo }} de {{ kardexPagination.total }} materiales
            </div>
            <div class="d-flex align-center flex-wrap justify-end" style="gap:12px">
              <v-select
                :model-value="kardexPagination.limit"
                :items="kardexPageSizeOptions"
                label="Items por pagina"
                variant="outlined"
                density="comfortable"
                hide-details
                style="max-width: 160px"
                @update:model-value="updateKardexPageSize"
              />
              <v-pagination
                :model-value="kardexPagination.page"
                :length="kardexPagination.totalPages"
                :total-visible="6"
                density="comfortable"
                @update:model-value="changeKardexPage"
              />
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col v-if="canCreate" cols="12">
        <v-card rounded="xl" class="pa-4 enterprise-surface kardex-upload-card">
          <div class="d-flex align-start justify-space-between flex-wrap mb-4" style="gap:16px">
            <div><div class="text-h6 font-weight-bold">Carga masiva de inventario</div><div class="text-body-2 text-medium-emphasis mt-1">Usa la plantilla actualizada para crear materiales nuevos o ajustar stock por diferencia.</div></div>
            <div class="d-flex flex-wrap" style="gap:8px"><v-btn v-if="canCreate" color="primary" prepend-icon="mdi-upload" :loading="uploading" @click="processXlsx">Procesar carga</v-btn><v-btn variant="outlined" prepend-icon="mdi-download" :loading="downloadingTemplate" @click="downloadTemplate">Descargar formato</v-btn></div>
          </div>
          <v-file-input v-model="xlsxFile" accept=".csv,.xlsx,.xls,text/csv" prepend-icon="mdi-file-excel" label="Selecciona archivo CSV o XLSX" variant="outlined" show-size hide-details />
          <v-alert v-if="activeImportJob" type="info" variant="tonal" class="mt-4">
            <div class="d-flex align-center justify-space-between flex-wrap" style="gap:12px">
              <div><div class="font-weight-medium">Carga en servidor</div><div class="text-caption">{{ activeImportJob.source_file_name || activeImportJob.stored_file_name || 'Inventario' }}</div></div>
              <v-chip :color="importJobColor(activeImportJob.status)" variant="tonal" label>{{ importJobStatusLabel(activeImportJob.status) }}</v-chip>
            </div>
            <div class="text-body-2 mt-2">{{ activeImportJob.current_step || 'Procesando archivo...' }}</div>
            <div class="summary-chip-list mt-3">
              <v-chip size="small" variant="tonal" color="primary" label>Total: {{ activeImportTotalRows }}</v-chip>
              <v-chip size="small" variant="tonal" color="success" label>Procesados: {{ activeImportProcessedRows }}</v-chip>
              <v-chip size="small" variant="tonal" color="warning" label>Pendientes: {{ activeImportPendingRows }}</v-chip>
              <v-chip size="small" variant="tonal" color="secondary" label>Avance: {{ activeImportProgress }}%</v-chip>
            </div>
            <v-progress-linear class="mt-3" :model-value="activeImportProgress" :color="importJobColor(activeImportJob.status)" :indeterminate="activeImportProgress <= 0 || (activeImportProgress >= 100 && activeImportJob.status === 'PROCESSING')" rounded height="10" />
            <div class="text-caption mt-2">{{ activeImportProcessedRows }} procesadas de {{ activeImportTotalRows }} fila(s). Faltan {{ activeImportPendingRows }}.</div>
            <div class="text-caption text-medium-emphasis mt-1">Si sales de esta pantalla y vuelves a entrar, el progreso seguira mostrandose automaticamente.</div>
            <div v-if="activeImportJob.error_message" class="text-caption text-error mt-2">{{ activeImportJob.error_message }}</div>
          </v-alert>

          <div v-if="lastBulkSummary" class="summary-chip-list mt-4">
            <v-chip color="success" variant="tonal">Procesados: {{ lastBulkSummary.procesados }}</v-chip>
            <v-chip color="primary" variant="tonal">Creados: {{ lastBulkSummary.creados }}</v-chip>
            <v-chip color="info" variant="tonal">Actualizados: {{ lastBulkSummary.actualizados }}</v-chip>
            <v-chip color="success" variant="tonal">Ingresos: {{ lastBulkSummary.ingresos }}</v-chip>
            <v-chip color="error" variant="tonal">Salidas: {{ lastBulkSummary.salidas }}</v-chip>
          </div>

          <v-alert v-if="lastBulkSummary?.errores?.length" type="warning" variant="tonal" class="mt-4">
            <div class="font-weight-medium mb-2">Errores detectados en la importacion</div>
            <div v-for="(error, index) in lastBulkSummary.errores.slice(0, 8)" :key="`${index}-${error}`" class="text-caption">{{ error }}</div>
            <div v-if="lastBulkSummary.errores.length > 8" class="text-caption mt-1">... y {{ lastBulkSummary.errores.length - 8 }} errores adicionales.</div>
          </v-alert>
        </v-card>
      </v-col>

      <v-dialog
        :model-value="kardexPdfPreview.open"
        max-width="1480"
        scrollable
        :persistent="kardexPdfPreview.loading"
        @update:model-value="handleKardexPdfPreviewVisibility"
      >
        <v-card rounded="xl" class="enterprise-surface">
          <v-card-title class="d-flex align-center justify-space-between flex-wrap px-5 py-4" style="gap:12px">
            <div>
              <div class="text-h6 font-weight-bold">Previsualización PDF del Kardex</div>
              <div class="text-body-2 text-medium-emphasis">{{ kardexPdfPreview.materialLabel || 'Material seleccionado' }}</div>
            </div>
            <v-btn icon="mdi-close" variant="text" density="comfortable" @click="closeKardexPdfPreview" />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4 kardex-pdf-preview-body">
            <div v-if="kardexPdfPreview.loading" class="kardex-pdf-preview-loading">
              <div class="text-body-2 font-weight-medium mb-3">Generando el documento con los movimientos y su auditoría...</div>
              <v-progress-linear indeterminate color="primary" rounded height="8" />
            </div>
            <v-alert v-else-if="kardexPdfPreview.error" type="error" variant="tonal">{{ kardexPdfPreview.error }}</v-alert>
            <iframe
              v-else-if="kardexPdfPreviewUrl"
              :src="kardexPdfPreviewUrl"
              title="Previsualización PDF del Kardex por material"
              class="kardex-pdf-preview-frame"
            />
          </v-card-text>
          <v-divider />
          <v-card-actions class="justify-end px-5 py-4 flex-wrap" style="gap:8px">
            <v-btn variant="text" @click="closeKardexPdfPreview">Cerrar</v-btn>
            <v-btn
              variant="tonal"
              prepend-icon="mdi-download"
              :disabled="!kardexPdfPreviewUrl || kardexPdfPreview.loading"
              @click="downloadKardexPdfPreview"
            >
              Descargar PDF
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-printer"
              :disabled="!kardexPdfPreviewUrl || kardexPdfPreview.loading"
              @click="openKardexPdfPreviewForPrint"
            >
              Abrir e imprimir
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="movementDialog.open" max-width="1480" scrollable>
        <v-card rounded="xl" class="enterprise-surface">
          <v-card-title class="d-flex align-center justify-space-between flex-wrap" style="gap:12px">
            <div><div class="text-h6 font-weight-bold">{{ movementDialogTitle }}</div><div class="text-body-2 text-medium-emphasis">Registra la cabecera y el detalle del documento. El sistema genera el codigo IB o EB automaticamente.</div></div>
            <v-btn icon="mdi-close" variant="text" density="comfortable" @click="closeMovementDialog" />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <v-progress-linear v-if="movementCatalogLoading" indeterminate color="primary" rounded class="mb-4" />
            <v-row dense>
              <v-col cols="12" md="3"><v-select v-model="documentForm.tipo" :items="movementTypes" item-title="title" item-value="value" label="Tipo de documento" variant="outlined" :disabled="movementCatalogLoading || savingDocument" /></v-col>
              <v-col cols="12" md="3"><v-text-field v-model="documentForm.fecha" type="date" label="Fecha" variant="outlined" :disabled="savingDocument" /></v-col>
              <v-col cols="12" md="3"><v-select v-model="documentForm.bodegaId" :items="warehouseOptions" item-title="title" item-value="value" label="Bodega" variant="outlined" :disabled="movementCatalogLoading || savingDocument" /></v-col>
              <v-col cols="12" md="3"><v-text-field :model-value="documentForm.tipo === 'INGRESO' ? 'IB-########' : 'EB-########'" label="Codigo generado" variant="outlined" readonly /></v-col>
              <v-col cols="12" md="4"><v-text-field v-model="documentForm.referencia" label="Referencia" variant="outlined" placeholder="Opcional" :disabled="savingDocument" /></v-col>
              <v-col cols="12" md="8"><v-textarea v-model="documentForm.observacion" label="Observacion general" variant="outlined" rows="2" auto-grow :disabled="savingDocument" /></v-col>
            </v-row>
            <v-alert v-if="!documentForm.bodegaId" type="info" variant="tonal" class="mb-4">Selecciona una bodega para habilitar el detalle de materiales.</v-alert>
            <div class="d-flex align-center justify-space-between flex-wrap mb-3" style="gap:12px">
              <div>
                <div class="text-subtitle-1 font-weight-bold">Detalle de materiales</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ documentForm.tipo === 'INGRESO'
                    ? 'Puedes seleccionar cualquier material registrado que no sea un servicio.'
                    : 'Solo se muestran materiales con stock disponible en la bodega seleccionada.' }}
                </div>
              </div>
              <div class="d-flex align-center flex-wrap" style="gap: 8px;">
                <v-btn
                  v-if="canCreate"
                  variant="text"
                  prepend-icon="mdi-refresh"
                  :loading="movementCatalogLoading"
                  :disabled="savingDocument"
                  @click="refreshMovementCatalogs"
                >
                  Actualizar materiales
                </v-btn>
                <v-btn v-if="canCreate" color="primary" variant="tonal" prepend-icon="mdi-plus" :disabled="movementCatalogLoading || savingDocument" @click="addMovementDetail">Agregar material</v-btn>
              </div>
            </div>
            <div class="document-editor-table">
              <table class="document-editor-grid">
                <thead><tr><th class="line-col">#</th><th class="material-col">Material</th><th class="stock-col">Stock actual</th><th class="qty-col">Cantidad</th><th class="obs-col">Observacion</th><th class="action-col"></th></tr></thead>
                <tbody>
                  <tr v-for="(detail, index) in movementDetails" :key="detail.localId">
                    <td class="line-col font-weight-bold">{{ index + 1 }}</td>
                    <td class="material-col"><v-autocomplete v-model="detail.productoId" :items="getProductOptions()" item-title="title" item-value="value" label="Material" variant="outlined" density="comfortable" clearable :loading="movementCatalogLoading" :disabled="movementCatalogLoading || !documentForm.bodegaId || savingDocument" :menu-props="{ maxHeight: 320 }" :no-data-text="documentForm.tipo === 'INGRESO' ? 'No hay materiales registrados' : 'No hay materiales con stock disponible en esta bodega'" /></td>
                    <td class="stock-col"><v-text-field :model-value="getDetailStockLabel(detail)" label="Disponible" variant="outlined" density="comfortable" readonly /></td>
                    <td class="qty-col"><v-text-field v-model="detail.cantidad" type="number" min="0" label="Cantidad" variant="outlined" density="comfortable" :disabled="savingDocument" /><div v-if="detailExceedsStock(detail)" class="text-caption text-error mt-1">Supera el disponible de {{ formatNumberForDisplay(getDetailAvailableStock(detail)) }}.</div></td>
                    <td class="obs-col"><v-text-field v-model="detail.observacion" label="Observacion" variant="outlined" density="comfortable" :disabled="savingDocument" /></td>
                    <td class="action-col"><v-btn icon="mdi-delete-outline" variant="text" color="error" density="comfortable" :disabled="movementDetails.length === 1 || savingDocument" @click="removeMovementDetail(detail.localId)" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="summary-chip-list mt-4">
              <v-chip color="primary" variant="tonal">{{ movementDetails.length }} materiales</v-chip>
              <v-chip color="secondary" variant="tonal">{{ formatNumberForDisplay(documentTotalQuantity) }} unidades</v-chip>
              <v-chip :color="documentForm.tipo === 'SALIDA' ? 'warning' : 'info'" variant="tonal">{{ documentForm.tipo === 'SALIDA' ? 'Descuenta stock' : 'Suma stock' }}</v-chip>
            </div>
          </v-card-text>
          <v-divider />
          <v-card-actions class="px-5 py-4 d-flex justify-end flex-wrap" style="gap:12px">
            <v-btn variant="text" :disabled="savingDocument" @click="closeMovementDialog">Cancelar</v-btn>
            <v-btn v-if="canCreate" color="primary" :loading="savingDocument" @click="saveMovementDocument">Guardar {{ documentForm.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso' }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
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
  buildReportPdfBlob,
  downloadReportExcel,
  downloadReportPdf,
  type ReportDefinition,
} from "@/app/utils/maintenance-intelligence-reports";
import {
  appendOilIndicator,
  buildProductDisplayTitle,
} from "@/app/utils/product-display";
import MassPurgeButton from "@/components/common/MassPurgeButton.vue";

type MovementType = "INGRESO" | "SALIDA";
type StockRow = { id: string; bodega_id: string; producto_id: string; stock_actual: string; stock_disponible?: string | number; stock_critico?: string | number; stock_min_bodega: string; stock_max_bodega: string; stock_min_global: string; stock_contenedores: string; costo_promedio_bodega: string; };
type KardexMovementRow = { id: string; fecha_emision: string; fecha_creacion: string; fecha_actualizacion: string; documento: string; referencia: string; concepto: string; descripcion: string; bodega: string; tipo_movimiento: string; usuario_responsable: string; usuario_actualizacion: string; entrada: number | string; salida: number | string; stock: number | string; };
type MovementDetailForm = { localId: string; productoId: string; cantidad: string; observacion: string; };
type KardexFilterState = {
  desde: string;
  hasta: string;
  search: string;
  bodega_id: string;
  producto_id: string;
  linea_id: string;
  categoria_id: string;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const savingDocument = ref(false);
const uploading = ref(false);
const downloadingTemplate = ref(false);
const loadingKardex = ref(false);
const movementCatalogLoading = ref(false);
const inventoryCatalogLoaded = ref(false);
const importJob = ref<any | null>(null);
const importPollHandle = ref<number | null>(null);
const exportState = reactive<Record<string, boolean>>({});
const kardexPdfPreviewUrl = ref("");
const kardexPdfPreview = reactive({
  open: false,
  loading: false,
  error: "",
  productoId: "",
  materialLabel: "",
  fileName: "",
});
let kardexPdfPreviewRequestId = 0;
const xlsxFile = ref<File | File[] | null>(null);
const lastBulkSummary = ref<any | null>(null);
const inventoryGroupBy = ref("bodega");
const expandedMaterials = ref<string[]>([]);
const products = ref<any[]>([]);
const bodegas = ref<any[]>([]);
const stocks = ref<StockRow[]>([]);
const sucursales = ref<any[]>([]);
const lineas = ref<any[]>([]);
const categorias = ref<any[]>([]);
const kardexGroups = ref<any[]>([]);
const kardexPagination = reactive({ page: 1, limit: 10, total: 0, totalPages: 1 });
const materialMovements = reactive<Record<string, KardexMovementRow[]>>({});
const materialDetailLoading = reactive<Record<string, boolean>>({});
const materialDetailLoaded = reactive<Record<string, boolean>>({});
const materialDetailErrors = reactive<Record<string, string>>({});
const movementDialog = reactive({ open: false });
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Kardex", "Movimientos de kardex", "Movimiento de kardex"]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canAccessInventoryReports = computed(() => hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "inventario"));
const KARDEX_IMPORT_JOB_STORAGE_KEY = "kpi_inventory_kardex_import_job_id";
const documentForm = reactive({ tipo: "INGRESO" as MovementType, fecha: formatDateForInput(), bodegaId: "", referencia: "", observacion: "" });
const movementDetails = ref<MovementDetailForm[]>([{ localId: `detail-${Date.now()}`, productoId: "", cantidad: "", observacion: "" }]);
const defaultKardexDateFrom = formatDateForInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const defaultKardexDateTo = formatDateForInput();
const kardexFilters = reactive<KardexFilterState>({
  desde: defaultKardexDateFrom,
  hasta: defaultKardexDateTo,
  search: "",
  bodega_id: "",
  producto_id: "",
  linea_id: "",
  categoria_id: "",
});
const appliedKardexFilters = reactive<KardexFilterState>({ ...kardexFilters });
const kardexTotals = reactive({ materiales: 0, movimientos: 0, entradas: 0, salidas: 0 });
const movementTypes = [{ value: "INGRESO", title: "Ingreso de Bodega" }, { value: "SALIDA", title: "Egreso de Bodega" }];
const kardexPageSizeOptions = [{ title: "10", value: 10 }, { title: "25", value: 25 }, { title: "50", value: 50 }, { title: "100", value: 100 }];
const inventoryGroupingOptions = [{ value: "bodega", title: "Bodega" }, { value: "sucursal", title: "Sucursal" }, { value: "linea", title: "Linea" }, { value: "categoria", title: "Categoria" }, { value: "material", title: "Material" }];
const warehouseOptions = computed(() => bodegas.value.map((bodega) => ({ value: bodega.id, title: `${bodega.codigo} - ${bodega.nombre}` })));
const kardexProductOptions = computed(() =>
  products.value.map((product) => ({
    value: String(product.id),
    title: buildProductDisplayTitle(product),
  })),
);
const lineFilterOptions = computed(() =>
  lineas.value.map((line) => ({
    value: String(line.id),
    title: [line.codigo, line.nombre].filter(Boolean).join(" - "),
  })),
);
const categoryFilterOptions = computed(() =>
  categorias.value.map((category) => ({
    value: String(category.id),
    title: [category.codigo, category.nombre].filter(Boolean).join(" - "),
  })),
);
const hasActiveKardexFilters = computed(() =>
  Boolean(
    kardexFilters.search ||
      kardexFilters.bodega_id ||
      kardexFilters.producto_id ||
      kardexFilters.linea_id ||
      kardexFilters.categoria_id ||
      kardexFilters.desde !== defaultKardexDateFrom ||
      kardexFilters.hasta !== defaultKardexDateTo,
  ),
);
const productMap = computed(() => new Map(products.value.map((item) => [String(item.id), item])));
const stockByWarehouseProduct = computed(() => { const map = new Map<string, StockRow>(); for (const row of stocks.value) map.set(`${row.bodega_id}:${row.producto_id}`, row); return map; });
const activeImportJob = computed(() => { if (!importJob.value) return null; const status = String(importJob.value.status || "").toUpperCase(); return status === "QUEUED" || status === "PROCESSING" ? importJob.value : null; });
const activeImportProgress = computed(() => { const progress = Number(importJob.value?.progress || 0); return Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0; });
const activeImportTotalRows = computed(() => { const total = Number(importJob.value?.total_rows || 0); return Number.isFinite(total) && total > 0 ? total : 0; });
const activeImportProcessedRows = computed(() => { const processed = Number(importJob.value?.current_index || 0); return Number.isFinite(processed) && processed > 0 ? processed : 0; });
const activeImportPendingRows = computed(() => Math.max(0, activeImportTotalRows.value - activeImportProcessedRows.value));
const kardexRangeLabel = computed(() => { const from = String(appliedKardexFilters.desde || "").trim(); const to = String(appliedKardexFilters.hasta || "").trim(); if (!from && !to) return "Rango abierto"; if (!from) return `Hasta ${to}`; if (!to) return `Desde ${from}`; return `${from} -> ${to}`; });
const kardexPageFrom = computed(() => kardexPagination.total > 0 ? (kardexPagination.page - 1) * kardexPagination.limit + 1 : 0);
const kardexPageTo = computed(() => kardexPagination.total > 0 ? Math.min(kardexPagination.total, kardexPagination.page * kardexPagination.limit) : 0);
const documentTotalQuantity = computed(() => movementDetails.value.reduce((sum, detail) => sum + parsePositiveNumber(detail.cantidad), 0));
const movementDialogTitle = computed(() => documentForm.tipo === "INGRESO" ? "Ingreso de bodega" : "Egreso de bodega");
function createMovementDetail(): MovementDetailForm { return { localId: `detail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, productoId: "", cantidad: "", observacion: "" }; }
function parsePositiveNumber(value: string | number) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; }
function getUserName() { return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM"; }
function formatKardexProductName(productId: unknown, fallbackName?: unknown) {
  const product = productMap.value.get(String(productId || ""));
  if (!product) return String(fallbackName || productId || "");
  return appendOilIndicator(
    String(fallbackName || product.nombre || product.codigo || product.id || ""),
    product.es_aceite,
  );
}
function getSelectedImportFile() { return Array.isArray(xlsxFile.value) ? xlsxFile.value[0] ?? null : xlsxFile.value ?? null; }
function clearRecord(record: Record<string, unknown>) { Object.keys(record).forEach((key) => delete record[key]); }
function resetMaterialDetailCache() { expandedMaterials.value = []; clearRecord(materialMovements); clearRecord(materialDetailLoading); clearRecord(materialDetailLoaded); clearRecord(materialDetailErrors); }
function addMovementDetail() { movementDetails.value.push(createMovementDetail()); }
function removeMovementDetail(localId: string) { movementDetails.value = movementDetails.value.length === 1 ? [createMovementDetail()] : movementDetails.value.filter((detail) => detail.localId !== localId); }
function resetMovementDocumentForm() { documentForm.tipo = "INGRESO"; documentForm.fecha = formatDateForInput(); documentForm.bodegaId = ""; documentForm.referencia = ""; documentForm.observacion = ""; movementDetails.value = [createMovementDetail()]; }
function openMovementDialog(type: MovementType) { if (!canCreate.value) { ui.error("No tienes permisos para registrar ingresos o egresos."); return; } documentForm.tipo = type; movementDialog.open = true; }
function closeMovementDialog() { if (!savingDocument.value) movementDialog.open = false; }
async function ensureMovementCatalogsLoaded(force = false) {
  if (inventoryCatalogLoaded.value && !force) return;
  movementCatalogLoading.value = true;
  try {
    const inventory = await fetchProductsWithStock();
    products.value = (inventory.productos ?? []).filter(
      (product: any) => !Boolean(product?.es_servicio),
    );
    bodegas.value = inventory.bodegas;
    stocks.value = inventory.stocks as StockRow[];
    sucursales.value = inventory.sucursales ?? [];
    lineas.value = inventory.lineas ?? [];
    categorias.value = inventory.categorias ?? [];
    inventoryCatalogLoaded.value = true;
  } catch (error: any) {
    inventoryCatalogLoaded.value = false;
    products.value = [];
    bodegas.value = [];
    stocks.value = [];
    sucursales.value = [];
    lineas.value = [];
    categorias.value = [];
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudieron cargar los catalogos de inventario.",
    );
  } finally {
    movementCatalogLoading.value = false;
  }
}

async function refreshMovementCatalogs() {
  await ensureMovementCatalogsLoaded(true);
  if (inventoryCatalogLoaded.value) {
    ui.success("Listado de materiales actualizado.");
  }
}
function getProductOptions() { if (!documentForm.bodegaId) return []; return products.value.filter((product) => documentForm.tipo !== "SALIDA" || Number(stockByWarehouseProduct.value.get(`${documentForm.bodegaId}:${product.id}`)?.stock_disponible ?? stockByWarehouseProduct.value.get(`${documentForm.bodegaId}:${product.id}`)?.stock_actual ?? 0) > 0).map((product) => { const stock = stockByWarehouseProduct.value.get(`${documentForm.bodegaId}:${product.id}`); const available = stock?.stock_disponible ?? stock?.stock_actual; const stockLabel = stock ? ` · stock disponible ${formatNumberForDisplay(available)}` : ""; return { value: product.id, title: `${buildProductDisplayTitle(product)}${stockLabel}` }; }); }
function getDetailStockRow(detail: MovementDetailForm) { return !documentForm.bodegaId || !detail.productoId ? null : stockByWarehouseProduct.value.get(`${documentForm.bodegaId}:${detail.productoId}`) ?? null; }
function getDetailAvailableStock(detail: MovementDetailForm) { const stock = getDetailStockRow(detail); return Number(stock?.stock_disponible ?? stock?.stock_actual ?? 0); }
function getDetailStockLabel(detail: MovementDetailForm) { return detail.productoId ? formatNumberForDisplay(getDetailAvailableStock(detail)) : "Selecciona un material"; }
function detailExceedsStock(detail: MovementDetailForm) { const qty = parsePositiveNumber(detail.cantidad); return documentForm.tipo === "SALIDA" && qty > 0 && qty > getDetailAvailableStock(detail); }
function getMaterialMovements(productoId: string) { return materialMovements[productoId] ?? []; }
function isMaterialDetailLoading(productoId: string) { return Boolean(materialDetailLoading[productoId]); }
function getMaterialDetailError(productoId: string) { return materialDetailErrors[productoId] ?? ""; }
function prefetchMaterialDetail(productoId: string) { void loadMaterialDetail(productoId); }
function buildKardexRequestParams(filters: KardexFilterState) {
  return {
    desde: filters.desde || undefined,
    hasta: filters.hasta || undefined,
    search: filters.search || undefined,
    bodega_id: filters.bodega_id || undefined,
    producto_id: filters.producto_id || undefined,
    linea_id: filters.linea_id || undefined,
    categoria_id: filters.categoria_id || undefined,
  };
}
async function loadMaterialDetail(productoId: string, force = false) { const normalizedId = String(productoId || "").trim(); if (!normalizedId || materialDetailLoading[normalizedId] || (materialDetailLoaded[normalizedId] && !force)) return; materialDetailLoading[normalizedId] = true; materialDetailErrors[normalizedId] = ""; try { const { data } = await api.get(`/kpi_inventory/kardex/resumen-material/${normalizedId}/detalle`, { params: buildKardexRequestParams(appliedKardexFilters) }); const payload = data?.data ?? data ?? {}; materialMovements[normalizedId] = Array.isArray(payload.movements) ? payload.movements : []; materialDetailLoaded[normalizedId] = true; } catch (error: any) { materialMovements[normalizedId] = []; materialDetailErrors[normalizedId] = error?.response?.data?.message || error?.message || "No se pudo cargar el detalle del material."; } finally { materialDetailLoading[normalizedId] = false; } }
async function fetchFilteredKardexGroups(filters: KardexFilterState) {
  const groups: any[] = [];
  let page = 1;
  let totalPages = 1;
  let totals = { materiales: 0, movimientos: 0, entradas: 0, salidas: 0 };
  do {
    const { data } = await api.get("/kpi_inventory/kardex/resumen-material", {
      params: { ...buildKardexRequestParams(filters), page, limit: 100 },
    });
    const payload = data?.data ?? data ?? {};
    if (page === 1) {
      totals = {
        materiales: Number(payload?.totals?.materiales || 0),
        movimientos: Number(payload?.totals?.movimientos || 0),
        entradas: Number(payload?.totals?.entradas || 0),
        salidas: Number(payload?.totals?.salidas || 0),
      };
    }
    groups.push(...(Array.isArray(payload?.groups) ? payload.groups : []));
    totalPages = Math.max(1, Number(payload?.pagination?.totalPages || 1));
    page += 1;
  } while (page <= totalPages);
  return { groups, totals };
}
async function fetchFilteredKardexMovements(groups: any[], filters: KardexFilterState) {
  const movementRows: any[] = [];
  const batchSize = 6;
  for (let index = 0; index < groups.length; index += batchSize) {
    const batch = groups.slice(index, index + batchSize);
    const responses = await Promise.all(
      batch.map(async (group) => {
        const productoId = String(group.producto_id || "");
        const { data } = await api.get(`/kpi_inventory/kardex/resumen-material/${productoId}/detalle`, {
          params: buildKardexRequestParams(filters),
        });
        const payload = data?.data ?? data ?? {};
        const movements = Array.isArray(payload?.movements) ? payload.movements : [];
        return movements.map((movement: any) => ({
          codigo_material: group.producto_codigo || "",
          material: formatKardexProductName(productoId, group.producto_nombre || ""),
          linea: group.linea_label || "",
          categoria: group.categoria_label || "",
          unidad: group.unidad_label || "",
          fecha_emision: movement.fecha_emision,
          fecha_creacion: movement.fecha_creacion,
          fecha_actualizacion: movement.fecha_actualizacion,
          documento: movement.documento || "",
          referencia: movement.referencia || "",
          concepto: movement.concepto || "",
          descripcion: movement.descripcion || "",
          bodega: movement.bodega || "",
          tipo_movimiento: movement.tipo_movimiento || (Number(movement.entrada || 0) > 0 ? "INGRESO" : "SALIDA"),
          usuario_responsable: movement.usuario_responsable || "SYSTEM",
          usuario_actualizacion: movement.usuario_actualizacion || movement.usuario_responsable || "SYSTEM",
          entrada: Number(movement.entrada || 0),
          salida: Number(movement.salida || 0),
          stock: Number(movement.stock || 0),
        }));
      }),
    );
    movementRows.push(...responses.flat());
  }
  return movementRows;
}
function getKardexExportGrouping(group: any, filters: KardexFilterState) {
  if (inventoryGroupBy.value === "linea") return group.linea_label || "Sin linea";
  if (inventoryGroupBy.value === "categoria") return group.categoria_label || "Sin categoria";
  if (inventoryGroupBy.value === "material") return `${group.producto_codigo || ""} - ${group.producto_nombre || ""}`.trim();
  if (inventoryGroupBy.value === "bodega") {
    return warehouseOptions.value.find((item) => item.value === filters.bodega_id)?.title || "Todas las bodegas filtradas";
  }
  return "Sucursales filtradas";
}
function buildKardexFilterDescription(filters: KardexFilterState) {
  const labels = [`Periodo: ${filters.desde || "inicio"} a ${filters.hasta || "actualidad"}`];
  if (filters.search) labels.push(`Busqueda: ${filters.search}`);
  if (filters.bodega_id) labels.push(`Bodega: ${warehouseOptions.value.find((item) => item.value === filters.bodega_id)?.title || filters.bodega_id}`);
  if (filters.producto_id) labels.push(`Material: ${kardexProductOptions.value.find((item) => item.value === filters.producto_id)?.title || filters.producto_id}`);
  if (filters.linea_id) labels.push(`Linea: ${lineFilterOptions.value.find((item) => item.value === filters.linea_id)?.title || filters.linea_id}`);
  if (filters.categoria_id) labels.push(`Categoria: ${categoryFilterOptions.value.find((item) => item.value === filters.categoria_id)?.title || filters.categoria_id}`);
  return labels.join(" | ");
}
function sanitizeKardexPdfFileName(value: unknown) {
  return String(value || "material")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "material";
}
function buildKardexGroupReport(group: any, movementRows: any[], filters: KardexFilterState): ReportDefinition {
  const materialLabel = `[${group.producto_codigo || "SIN CODIGO"}] ${formatKardexProductName(group.producto_id, group.producto_nombre || "Sin nombre")}`;
  const fileName = `kardex_${sanitizeKardexPdfFileName(group.producto_codigo || group.producto_nombre)}_${formatDateForInput()}`;
  return {
    fileName,
    title: "Kardex por material",
    subtitle: `${materialLabel} | ${buildKardexFilterDescription(filters)}`,
    orientation: "landscape",
    summary: [
      { label: "Movimientos", value: movementRows.length },
      { label: "Stock inicial", value: Number(group.stock_inicial || 0) },
      { label: "Entradas", value: Number(group.entradas || 0) },
      { label: "Salidas", value: Number(group.salidas || 0) },
      { label: "Stock final", value: Number(group.stock_final || 0) },
      { label: "Unidad", value: group.unidad_label || "Sin unidad" },
    ],
    sheets: [
      {
        name: "Movimientos del material",
        fitColumnsToPage: true,
        note: "Auditoría: Usuario responsable corresponde al creador del movimiento; última actualización muestra quién y cuándo realizó el cambio más reciente.",
        rows: movementRows.map((movement) => ({
          fecha_emision: movement.fecha_emision || "",
          documento: movement.documento || "",
          tipo_movimiento: movement.tipo_movimiento || "",
          referencia: movement.referencia || "",
          concepto: movement.concepto || "",
          bodega: movement.bodega || "",
          entrada: Number(movement.entrada || 0),
          salida: Number(movement.salida || 0),
          stock: Number(movement.stock || 0),
          usuario_responsable: movement.usuario_responsable || "SYSTEM",
          usuario_actualizacion: movement.usuario_actualizacion || movement.usuario_responsable || "SYSTEM",
          fecha_actualizacion: movement.fecha_actualizacion || movement.fecha_creacion || "",
        })),
        columns: [
          { key: "fecha_emision", header: "Fecha emisión", width: 15, format: "datetime" },
          { key: "documento", header: "Documento", width: 14 },
          { key: "tipo_movimiento", header: "Tipo", width: 10 },
          { key: "referencia", header: "Referencia", width: 14 },
          { key: "concepto", header: "Concepto", width: 14 },
          { key: "bodega", header: "Bodega", width: 18 },
          { key: "entrada", header: "Entrada", width: 10, format: "number" },
          { key: "salida", header: "Salida", width: 10, format: "number" },
          { key: "stock", header: "Stock", width: 10, format: "number" },
          { key: "usuario_responsable", header: "Usuario responsable", width: 16 },
          { key: "usuario_actualizacion", header: "Actualizado por", width: 16 },
          { key: "fecha_actualizacion", header: "Última actualización", width: 16, format: "datetime" },
        ],
      },
    ],
  };
}
function revokeKardexPdfPreviewUrl() {
  if (!kardexPdfPreviewUrl.value) return;
  window.URL.revokeObjectURL(kardexPdfPreviewUrl.value);
  kardexPdfPreviewUrl.value = "";
}
async function openKardexGroupPdfPreview(group: any) {
  const productoId = String(group?.producto_id || "").trim();
  if (!productoId) return;
  const requestId = ++kardexPdfPreviewRequestId;
  revokeKardexPdfPreviewUrl();
  kardexPdfPreview.open = true;
  kardexPdfPreview.loading = true;
  kardexPdfPreview.error = "";
  kardexPdfPreview.productoId = productoId;
  kardexPdfPreview.materialLabel = `[${group.producto_codigo || "SIN CODIGO"}] ${formatKardexProductName(productoId, group.producto_nombre || "Sin nombre")}`;
  kardexPdfPreview.fileName = "";
  try {
    await ensureMovementCatalogsLoaded();
    const filters = { ...appliedKardexFilters };
    const movementRows = await fetchFilteredKardexMovements([group], filters);
    if (!movementRows.length) {
      throw new Error("No hay movimientos de este material con los filtros aplicados.");
    }
    const report = buildKardexGroupReport(group, movementRows, filters);
    const blob = await buildReportPdfBlob(report);
    if (requestId !== kardexPdfPreviewRequestId) return;
    kardexPdfPreview.fileName = `${report.fileName}.pdf`;
    kardexPdfPreviewUrl.value = window.URL.createObjectURL(blob);
  } catch (error: any) {
    if (requestId !== kardexPdfPreviewRequestId) return;
    kardexPdfPreview.error = error?.response?.data?.message || error?.message || "No se pudo generar la previsualización del Kardex.";
  } finally {
    if (requestId === kardexPdfPreviewRequestId) kardexPdfPreview.loading = false;
  }
}
function closeKardexPdfPreview() {
  kardexPdfPreviewRequestId += 1;
  kardexPdfPreview.open = false;
  kardexPdfPreview.loading = false;
  kardexPdfPreview.error = "";
  kardexPdfPreview.productoId = "";
  kardexPdfPreview.materialLabel = "";
  kardexPdfPreview.fileName = "";
  revokeKardexPdfPreviewUrl();
}
function handleKardexPdfPreviewVisibility(open: boolean) {
  if (!open) closeKardexPdfPreview();
}
function downloadKardexPdfPreview() {
  if (!kardexPdfPreviewUrl.value) return;
  const link = document.createElement("a");
  link.href = kardexPdfPreviewUrl.value;
  link.download = kardexPdfPreview.fileName || "kardex_material.pdf";
  link.click();
}
function openKardexPdfPreviewForPrint() {
  if (!kardexPdfPreviewUrl.value) return;
  window.open(kardexPdfPreviewUrl.value, "_blank", "noopener,noreferrer");
}
function exportKey(format: "excel" | "pdf") { return `inventory:${format}`; }
function isExporting(format: "excel" | "pdf") { return Boolean(exportState[exportKey(format)]); }
async function exportInventoryReport(format: "excel" | "pdf") {
  if (!canAccessInventoryReports.value) {
    ui.error("No tienes permisos para exportar este reporte.");
    return;
  }
  const key = exportKey(format);
  exportState[key] = true;
  try {
    await ensureMovementCatalogsLoaded();
    const filters = { ...appliedKardexFilters };
    const { groups } = await fetchFilteredKardexGroups(filters);
    if (!groups.length) {
      ui.open("No hay movimientos con los filtros aplicados para exportar.", "info", 3500);
      return;
    }
    const movementRows = await fetchFilteredKardexMovements(groups, filters);
    const exportedEntries = movementRows.reduce((total, movement) => total + Number(movement.entrada || 0), 0);
    const exportedOutputs = movementRows.reduce((total, movement) => total + Number(movement.salida || 0), 0);
    const rows = groups.map((group) => ({
      agrupacion: getKardexExportGrouping(group, filters),
      codigo_material: group.producto_codigo || "",
      material: formatKardexProductName(group.producto_id, group.producto_nombre || ""),
      linea: group.linea_label || "",
      categoria: group.categoria_label || "",
      unidad: group.unidad_label || "",
      stock_inicial: Number(group.stock_inicial || 0),
      entradas: Number(group.entradas || 0),
      salidas: Number(group.salidas || 0),
      stock_final: Number(group.stock_final || 0),
      movimientos: Number(group.movimientos_count || 0),
    }));
    const report = buildInventoryStockReport({
      groupLabel: inventoryGroupingOptions.find((item) => item.value === inventoryGroupBy.value)?.title || "Material",
      title: "Reporte de Kardex",
      subtitle: buildKardexFilterDescription(filters),
      primarySheetName: "Resumen Kardex",
      primaryNote: "Resumen de materiales calculado exclusivamente con los filtros aplicados.",
      fileName: `kardex_${formatDateForInput()}`,
      summary: [
        { label: "Materiales", value: groups.length },
        { label: "Movimientos", value: movementRows.length },
        { label: "Entradas", value: exportedEntries },
        { label: "Salidas", value: exportedOutputs },
      ],
      rows,
      movementRows,
    });
    if (format === "excel") await downloadReportExcel(report);
    else await downloadReportPdf(report);
  } catch (error: any) {
    ui.error(error?.message || "No se pudo generar el reporte de Kardex.");
  } finally {
    exportState[key] = false;
  }
}
async function loadKardex(page = kardexPagination.page) {
  if (!canRead.value) return;
  const targetPage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  loadingKardex.value = true;
  resetMaterialDetailCache();
  try {
    const { data } = await api.get("/kpi_inventory/kardex/resumen-material", {
      params: {
        ...buildKardexRequestParams(appliedKardexFilters),
        page: targetPage,
        limit: kardexPagination.limit,
      },
    });
    const payload = data?.data ?? data ?? {};
    const pagination = payload?.pagination ?? {};
    kardexGroups.value = Array.isArray(payload?.groups) ? payload.groups : [];
    kardexTotals.materiales = Number(payload?.totals?.materiales || 0);
    kardexTotals.movimientos = Number(payload?.totals?.movimientos || 0);
    kardexTotals.entradas = Number(payload?.totals?.entradas || 0);
    kardexTotals.salidas = Number(payload?.totals?.salidas || 0);
    kardexPagination.page = Number(pagination?.page || targetPage || 1);
    kardexPagination.limit = Number(pagination?.limit || kardexPagination.limit || 10);
    kardexPagination.total = Number(pagination?.total || kardexGroups.value.length || 0);
    kardexPagination.totalPages = Math.max(1, Number(pagination?.totalPages || 1));
  } catch (error: any) {
    kardexGroups.value = [];
    kardexTotals.materiales = 0;
    kardexTotals.movimientos = 0;
    kardexTotals.entradas = 0;
    kardexTotals.salidas = 0;
    kardexPagination.page = targetPage;
    kardexPagination.total = 0;
    kardexPagination.totalPages = 1;
    ui.error(error?.response?.data?.message || "No se pudo cargar kardex.");
  } finally {
    loadingKardex.value = false;
  }
}
async function handleKardexPurged() { resetMaterialDetailCache(); kardexPagination.page = 1; await Promise.allSettled([loadKardex(1), ensureMovementCatalogsLoaded(true)]); }
function applyKardexFilters() {
  Object.assign(appliedKardexFilters, kardexFilters);
  kardexPagination.page = 1;
  void loadKardex(1);
}
function clearKardexFilters() {
  kardexFilters.search = "";
  kardexFilters.bodega_id = "";
  kardexFilters.producto_id = "";
  kardexFilters.linea_id = "";
  kardexFilters.categoria_id = "";
  kardexFilters.desde = defaultKardexDateFrom;
  kardexFilters.hasta = defaultKardexDateTo;
  applyKardexFilters();
}
function changeKardexPage(page: number) {
  if (loadingKardex.value || page === kardexPagination.page) return;
  void loadKardex(page);
}
function updateKardexPageSize(limit: number) {
  const safeLimit = Number(limit);
  if (!Number.isFinite(safeLimit) || safeLimit <= 0 || safeLimit === kardexPagination.limit) return;
  kardexPagination.limit = safeLimit;
  kardexPagination.page = 1;
  void loadKardex(1);
}
async function refreshCatalogsIfLoaded() { if (inventoryCatalogLoaded.value) await ensureMovementCatalogsLoaded(true); }
async function saveMovementDocument() { if (!canCreate.value) return ui.error("No tienes permisos para registrar documentos de bodega."); if (!documentForm.bodegaId) return ui.error("La bodega es obligatoria."); const candidateDetails = movementDetails.value.filter((detail) => detail.productoId || String(detail.cantidad || "").trim() || String(detail.observacion || "").trim()); if (!candidateDetails.length) return ui.error("Debes agregar al menos un material al detalle."); const payloadDetails: Array<{ producto_id: string; cantidad: number; observacion?: string }> = []; for (const [index, detail] of candidateDetails.entries()) { if (!detail.productoId) return ui.error(`Selecciona el material en la fila ${index + 1}.`); const cantidad = parsePositiveNumber(detail.cantidad); if (!cantidad) return ui.error(`La cantidad de la fila ${index + 1} debe ser mayor a cero.`); if (detailExceedsStock(detail)) return ui.error(`La fila ${index + 1} supera el stock disponible de la bodega.`); payloadDetails.push({ producto_id: detail.productoId, cantidad, observacion: detail.observacion || undefined }); } savingDocument.value = true; try { await api.post("/kpi_inventory/kardex/documentos", { tipo_movimiento: documentForm.tipo, fecha_movimiento: documentForm.fecha || undefined, bodega_id: documentForm.bodegaId, referencia: documentForm.referencia || undefined, observacion: documentForm.observacion || undefined, created_by: getUserName(), updated_by: getUserName(), detalles: payloadDetails }); ui.success(`${documentForm.tipo === "INGRESO" ? "Ingreso" : "Egreso"} de bodega registrado correctamente.`); movementDialog.open = false; resetMovementDocumentForm(); await Promise.allSettled([loadKardex(), refreshCatalogsIfLoaded()]); } catch (error: any) { ui.error(error?.response?.data?.message || error?.message || "No se pudo registrar el documento de bodega."); } finally { savingDocument.value = false; } }
function requestBrowserNotificationPermission() { if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "default") void window.Notification.requestPermission().catch(() => undefined); }
function emitBrowserNotification(title: string, body: string, tag: string) { if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") return; try { new window.Notification(title, { body, tag }); } catch {} }
function notifyImportLifecycle(options: { title: string; message: string; variant?: "success" | "error" | "info" | "warning"; requestPermission?: boolean; tag: string; }) { if (options.requestPermission) requestBrowserNotificationPermission(); ui.open(options.message, options.variant ?? "info", 5000); emitBrowserNotification(options.title, options.message, options.tag); }
function importJobColor(status: unknown) { const normalized = String(status || "").toUpperCase(); return normalized === "FAILED" ? "error" : normalized === "COMPLETED" ? "success" : normalized === "PROCESSING" ? "warning" : "secondary"; }
function importJobStatusLabel(status: unknown) { const normalized = String(status || "").toUpperCase(); return normalized === "FAILED" ? "Fallo" : normalized === "COMPLETED" ? "Completada" : normalized === "PROCESSING" ? "Procesando" : normalized === "QUEUED" ? "En cola" : normalized || "Pendiente"; }
function persistImportJobId(jobId: string | null) { if (typeof window === "undefined") return; if (jobId) window.localStorage.setItem(KARDEX_IMPORT_JOB_STORAGE_KEY, jobId); else window.localStorage.removeItem(KARDEX_IMPORT_JOB_STORAGE_KEY); }
function getPersistedImportJobId() { return typeof window === "undefined" ? null : window.localStorage.getItem(KARDEX_IMPORT_JOB_STORAGE_KEY); }
function stopImportPolling() { if (importPollHandle.value != null) { window.clearInterval(importPollHandle.value); importPollHandle.value = null; } }
async function fetchImportJobStatus(jobId: string) { const { data } = await api.get(`/kpi_inventory/kardex/import/${jobId}`); importJob.value = data?.data ?? data; if (!importJob.value) { persistImportJobId(null); stopImportPolling(); return; } const status = String(importJob.value.status || "").toUpperCase(); if (status === "COMPLETED") { stopImportPolling(); persistImportJobId(null); lastBulkSummary.value = importJob.value.summary ?? null; importJob.value = null; notifyImportLifecycle({ title: "Carga de inventario finalizada", message: "El archivo de inventario se proceso correctamente.", variant: "success", tag: "inventory-import-completed" }); await Promise.allSettled([loadKardex(), refreshCatalogsIfLoaded()]); } else if (status === "FAILED") { stopImportPolling(); persistImportJobId(null); const failureMessage = importJob.value.error_message || "La carga de inventario fallo."; importJob.value = null; notifyImportLifecycle({ title: "Carga de inventario fallida", message: failureMessage, variant: "error", tag: "inventory-import-failed" }); } }
function startImportPolling(jobId: string) { stopImportPolling(); importPollHandle.value = window.setInterval(() => { void fetchImportJobStatus(jobId).catch(() => undefined); }, 2500); }
async function restoreImportJob() { const jobId = getPersistedImportJobId(); if (!jobId) return; try { await fetchImportJobStatus(jobId); if (importJob.value) startImportPolling(jobId); } catch { persistImportJobId(null); importJob.value = null; } }
async function processXlsx() { if (!canCreate.value) return ui.error("No tienes permisos para procesar cargas masivas."); const file = getSelectedImportFile(); if (!file) return ui.error("Debes seleccionar un archivo CSV o XLSX."); uploading.value = true; try { const formData = new FormData(); formData.append("file", file); formData.append("requested_by", getUserName()); const { data } = await api.post("/kpi_inventory/kardex/import/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }); const job = data?.data ?? data; importJob.value = job; lastBulkSummary.value = null; xlsxFile.value = null; if (job?.id) { persistImportJobId(job.id); notifyImportLifecycle({ title: "Carga de inventario iniciada", message: "Archivo recibido. El sistema lo esta procesando en segundo plano.", variant: "info", requestPermission: true, tag: "inventory-import-started" }); startImportPolling(job.id); await fetchImportJobStatus(job.id); } else { ui.open("La carga fue recibida, pero no se pudo identificar el job.", "warning"); } } catch (error: any) { ui.error(error?.response?.data?.message || error?.message || "No se pudo procesar la carga masiva."); } finally { uploading.value = false; } }
async function downloadTemplate() { downloadingTemplate.value = true; try { const response = await api.post("/kpi_inventory/kardex/import/template", null, { responseType: "blob" }); const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); const url = window.URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "FORMATO_CARGA_MASIVA_INVENTARIO.xlsx"; link.click(); window.URL.revokeObjectURL(url); } catch (error: any) { ui.error(error?.response?.data?.message || error?.message || "No se pudo descargar el formato."); } finally { downloadingTemplate.value = false; } }
watch(() => movementDialog.open, async (open) => { if (open) await ensureMovementCatalogsLoaded(true); else if (!savingDocument.value) resetMovementDocumentForm(); });
watch(() => documentForm.tipo, () => { if (documentForm.tipo !== "SALIDA") return; movementDetails.value = movementDetails.value.map((detail) => !detail.productoId || getDetailAvailableStock(detail) > 0 ? detail : { ...detail, productoId: "", cantidad: "" }); });
watch(() => documentForm.bodegaId, () => { if (!documentForm.bodegaId) movementDetails.value = movementDetails.value.map((detail) => ({ ...detail, productoId: "", cantidad: "" })); });
watch(expandedMaterials, (current, previous) => { const previousSet = new Set((previous ?? []).map((item) => String(item))); current.map((item) => String(item)).filter((item) => !previousSet.has(item)).forEach((productoId) => void loadMaterialDetail(productoId)); }, { deep: true });
onMounted(async () => { if (!canRead.value) return; await Promise.allSettled([loadKardex(), ensureMovementCatalogsLoaded(), restoreImportJob()]); });
onBeforeUnmount(() => {
  stopImportPolling();
  kardexPdfPreviewRequestId += 1;
  revokeKardexPdfPreviewUrl();
});
</script>

<style scoped>
.kardex-main-card, .kardex-upload-card { border: 1px solid rgba(var(--v-theme-on-surface), 0.08); }
.summary-chip-list { display: flex; flex-wrap: wrap; gap: 8px; }
.kardex-header-copy { max-width: 720px; }
.kardex-groups { display: grid; gap: 12px; }
.kardex-pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 18px; }
.kardex-group-title { padding-block: 16px; }
.detail-loading-state { display: flex; align-items: center; gap: 12px; padding: 12px 4px; color: rgba(var(--v-theme-on-surface), 0.72); min-height: 78px; }
.kardex-pdf-preview-body { min-height: 70vh; background: rgba(var(--v-theme-on-surface), 0.035); }
.kardex-pdf-preview-loading { max-width: 720px; margin: 20vh auto 0; }
.kardex-pdf-preview-frame { display: block; width: 100%; height: 70vh; min-height: 620px; border: 0; border-radius: 14px; background: white; }
.kardex-detail-table, .document-editor-table { overflow-x: auto; border: 1px solid rgba(var(--v-theme-on-surface), 0.08); border-radius: 18px; }
.kardex-table, .document-editor-grid { width: 100%; border-collapse: collapse; background: rgba(var(--v-theme-surface), 0.94); }
.kardex-table { min-width: 1080px; }
.document-editor-grid { min-width: 1280px; }
.kardex-table th, .kardex-table td, .document-editor-grid th, .document-editor-grid td { padding: 12px 14px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08); vertical-align: top; }
.kardex-table th, .document-editor-grid th { position: sticky; top: 0; z-index: 1; white-space: nowrap; font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; background: rgba(var(--v-theme-primary), 0.08); }
.kardex-table tbody tr:nth-child(even), .document-editor-grid tbody tr:nth-child(even) { background: rgba(var(--v-theme-on-surface), 0.02); }
.line-col { width: 56px; min-width: 56px; text-align: center; }
.material-col { min-width: 420px; width: 38%; }
.stock-col { min-width: 180px; width: 14%; }
.qty-col { min-width: 160px; width: 14%; }
.obs-col { min-width: 260px; width: 28%; }
.action-col { width: 64px; min-width: 64px; text-align: center; }
@media (max-width: 960px) { .kardex-main-card, .kardex-upload-card { padding: 20px !important; } }
</style>

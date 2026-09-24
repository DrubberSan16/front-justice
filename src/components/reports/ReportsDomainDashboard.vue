<template>
  <div class="domain-report">
    <section v-if="isWorkOrder" class="domain-stack">
      <div class="metric-grid metric-grid--status">
        <article v-for="card in workOrderStatusCards" :key="card.key" class="metric-card metric-card--interactive" tabindex="0" @click="openStatusOrders(card)" @keydown.enter="openStatusOrders(card)">
          <v-icon :icon="card.icon" :color="card.color" aria-hidden="true" />
          <div><span>{{ card.label }}</span><strong>{{ count(card.rows.length) }}</strong><small>Seleccione para ver las OT</small></div>
          <v-btn icon="mdi-file-pdf-box" size="small" variant="text" :aria-label="`Previsualizar PDF de ${card.label}`" @click.stop="previewStatus(card)" />
        </article>
      </div>

      <div class="report-grid">
        <ReportTableCard title="Horas trabajadas por OT" subtitle="Duración real de la intervención y horas reportadas por responsables." icon="mdi-account-clock-outline" @preview="previewRelationship('hours')">
          <table class="data-table"><thead><tr><th>OT</th><th>Equipo</th><th class="number">Horas responsables</th><th class="number">Duración OT</th><th>Responsables</th></tr></thead><tbody>
            <tr v-for="row in workOrderRows" :key="row.key"><td><button class="entity-link" @click="openWorkOrder(row)">{{ row.label }}</button></td><td>{{ row.relatedEquipment || row.context || '-' }}</td><td class="number">{{ hours(row.hours) }}</td><td class="number">{{ hours(durationForRelationship(row)) }}</td><td><v-btn size="small" variant="tonal" prepend-icon="mdi-account-group-outline" @click="openResponsibles(row)">Ver responsables</v-btn></td></tr>
          </tbody></table>
        </ReportTableCard>
        <ReportTableCard title="Costo de materiales por OT" subtitle="Costo histórico de los materiales efectivamente utilizados." icon="mdi-cash-wrench" @preview="previewRelationship('cost')">
          <table class="data-table"><thead><tr><th>OT</th><th>Equipo</th><th class="number">Unidades</th><th class="number">Costo</th><th>Detalle</th></tr></thead><tbody>
            <tr v-for="row in costRows" :key="row.key"><td><button class="entity-link" @click="openWorkOrder(row)">{{ row.label }}</button></td><td>{{ row.relatedEquipment || row.context || '-' }}</td><td class="number">{{ number(row.consumedQuantity) }}</td><td class="number">{{ currency(row.maintenanceCost) }}</td><td><v-btn size="small" variant="tonal" prepend-icon="mdi-package-variant" @click="openMaterials(row)">Ver materiales</v-btn></td></tr>
          </tbody></table>
        </ReportTableCard>
      </div>

      <ReportTableCard title="Equipos y trazabilidad de horómetro" subtitle="Lectura previa a la primera OT y lectura final guardada al ejecutar la última OT del período." icon="mdi-speedometer" wide @preview="previewEquipmentTrace">
        <table class="data-table"><thead><tr><th>Equipo</th><th class="number">OT trabajadas</th><th class="number">Horómetro inicial</th><th class="number">Horómetro final</th><th>OT vinculadas</th></tr></thead><tbody>
          <tr v-for="row in equipmentTraceRows" :key="row.key"><td><strong>{{ row.label }}</strong></td><td class="number">{{ count(row.orders.length) }}</td><td class="number">{{ horometer(row.initial) }}</td><td class="number">{{ horometer(row.final) }}</td><td><v-btn size="small" variant="tonal" @click="openOrderList(row.orders, row.label)">Ver OT vinculadas</v-btn></td></tr>
        </tbody></table>
      </ReportTableCard>
    </section>

    <section v-else-if="isEquipment" class="domain-stack">
      <div class="metric-grid">
        <MetricCard label="Equipos con actividad" :value="count(equipmentRows.length)" helper="Con OT dentro del período" icon="mdi-engine-outline" @preview="previewEquipmentSummary" />
        <MetricCard label="OT vinculadas" :value="count(totalEquipmentOrders)" helper="Órdenes distintas" icon="mdi-clipboard-check-multiple-outline" @preview="previewEquipmentSummary" />
        <MetricCard label="Horas trabajadas" :value="hours(totalEquipmentHours)" helper="Horas reportadas por responsables" icon="mdi-clock-check-outline" @preview="previewEquipmentSummary" />
        <MetricCard label="Costo de mantenimiento" :value="currency(totalEquipmentCost)" helper="Materiales utilizados" icon="mdi-cash-wrench" @preview="previewEquipmentSummary" />
      </div>
      <div class="report-grid">
        <ReportTableCard title="Horas por equipo" subtitle="Cada fila permite consultar las OT que explican el total." icon="mdi-timer-outline" @preview="previewEquipmentTable('hours')">
          <table class="data-table"><thead><tr><th>Equipo</th><th class="number">OT</th><th class="number">Horas</th><th>Detalle</th></tr></thead><tbody><tr v-for="row in equipmentRows" :key="row.key"><td><strong>{{ row.label }}</strong><small>{{ row.context }}</small></td><td class="number">{{ count(row.workOrders) }}</td><td class="number">{{ hours(row.hours) }}</td><td><v-btn size="small" variant="tonal" @click="openOrderList(linkedOrders(row), row.label)">OT vinculadas</v-btn></td></tr></tbody></table>
        </ReportTableCard>
        <ReportTableCard title="Costo de mantenimiento por equipo" subtitle="Materiales utilizados y OT que originaron el costo." icon="mdi-cash-multiple" @preview="previewEquipmentTable('cost')">
          <table class="data-table"><thead><tr><th>Equipo</th><th class="number">Costo</th><th class="number">Unidades</th><th>Materiales</th></tr></thead><tbody><tr v-for="row in equipmentCostRows" :key="row.key"><td><strong>{{ row.label }}</strong></td><td class="number">{{ currency(row.maintenanceCost) }}</td><td class="number">{{ number(row.consumedQuantity) }}</td><td><v-btn size="small" variant="tonal" @click="openMaterials(row)">Ver materiales</v-btn></td></tr></tbody></table>
        </ReportTableCard>
      </div>
    </section>

    <section v-else-if="isLubricant" class="domain-stack">
      <div class="metric-grid">
        <MetricCard label="Muestras analizadas" :value="count(lubricantRows.length)" helper="Informes dentro del período" icon="mdi-test-tube" @preview="previewLubricant" />
        <MetricCard label="Parámetros normales" :value="count(lubricantTotals.normal)" helper="Resultados sin alerta" icon="mdi-check-circle-outline" @preview="previewLubricant" />
        <MetricCard label="En precaución" :value="count(lubricantTotals.warning)" helper="Parámetros que requieren seguimiento" icon="mdi-alert-outline" @preview="previewLubricant" />
        <MetricCard label="Anormales" :value="count(lubricantTotals.abnormal)" helper="Parámetros fuera de condición" icon="mdi-alert-octagon-outline" @preview="previewLubricant" />
      </div>
      <ReportTableCard title="Diagnóstico por muestra" subtitle="Equipo, compartimento y condición reportada por el laboratorio." icon="mdi-oil-temperature" wide @preview="previewLubricant">
        <table class="data-table"><thead><tr><th>Fecha muestra</th><th>Análisis</th><th>Equipo</th><th>Compartimento</th><th>Diagnóstico</th><th class="number">Normal</th><th class="number">Precaución</th><th class="number">Anormal</th></tr></thead><tbody><tr v-for="row in lubricantRows" :key="String(row.id || row.codigo)"><td>{{ date(row.fecha_muestra) }}</td><td><strong>{{ row.codigo || row.numero_muestra || '-' }}</strong></td><td>{{ row.equipo_nombre || row.equipment_label || '-' }}</td><td>{{ row.compartimento_principal || '-' }}</td><td><v-chip size="small" variant="tonal">{{ row.estado_diagnostico || row.diagnostico || '-' }}</v-chip></td><td class="number">{{ count(summaryNumber(row, 'normal')) }}</td><td class="number">{{ count(summaryNumber(row, 'precaucion')) }}</td><td class="number">{{ count(summaryNumber(row, 'anormal')) }}</td></tr></tbody></table>
      </ReportTableCard>
      <ReportTableCard title="Parámetros que requieren seguimiento" subtitle="Resultados en precaución o anormales, agrupados por muestra." icon="mdi-flask-outline" wide @preview="previewLubricantParameters">
        <table class="data-table"><thead><tr><th>Análisis</th><th>Equipo</th><th>Grupo</th><th>Parámetro</th><th>Resultado</th><th>Nivel</th></tr></thead><tbody><tr v-for="(row,index) in lubricantAlerts" :key="`${row.analysis}-${row.parameter}-${index}`"><td>{{ row.analysis }}</td><td>{{ row.equipment }}</td><td>{{ row.group }}</td><td><strong>{{ row.parameter }}</strong></td><td>{{ row.result }}</td><td><v-chip size="small" :color="/ANORMAL|CRITIC/.test(row.level) ? 'error' : 'warning'" variant="tonal">{{ row.level }}</v-chip></td></tr></tbody></table>
      </ReportTableCard>
    </section>

    <section v-else-if="isMaterials" class="domain-stack">
      <template v-if="materialView === 'informativo'">
        <div class="metric-grid">
          <MetricCard label="Materiales registrados" :value="count(materialProducts.length)" helper="Cantidad de materiales, no unidades" icon="mdi-package-variant-closed" @preview="previewMaterialSummary" />
          <MetricCard label="Repuestos" :value="count(materialTypeCounts.spares)" helper="Clasificados como repuesto" icon="mdi-cog-outline" @preview="previewMaterialSummary" />
          <MetricCard label="Servicios" :value="count(materialTypeCounts.services)" helper="Productos marcados como servicio" icon="mdi-account-hard-hat-outline" @preview="previewMaterialSummary" />
          <MetricCard label="Aceites" :value="count(materialTypeCounts.oils)" helper="Lubricantes y aceites" icon="mdi-oil" @preview="previewMaterialSummary" />
        </div>
        <div class="report-grid">
          <ReportTableCard title="Cantidad de materiales por bodega" subtitle="Cuenta referencias distintas con registro de stock; no suma unidades." icon="mdi-warehouse" @preview="previewWarehouseMaterials">
            <table class="data-table"><thead><tr><th>Bodega</th><th class="number">Materiales distintos</th><th class="number">Costo total estimado</th></tr></thead><tbody><tr v-for="row in warehouseMaterialRows" :key="row.key"><td><strong>{{ row.label }}</strong></td><td class="number">{{ count(row.materials) }}</td><td class="number">{{ currency(row.value) }}</td></tr></tbody></table>
          </ReportTableCard>
          <ReportTableCard title="Materiales con mayor valor" subtitle="Existencia actual valorizada con costo promedio o último costo disponible." icon="mdi-cash-multiple" @preview="previewTopValueMaterials">
            <table class="data-table"><thead><tr><th>Material</th><th class="number">Stock</th><th class="number">Costo unitario</th><th class="number">Valor</th></tr></thead><tbody><tr v-for="row in topValueMaterials" :key="row.key"><td><button class="entity-link" @click="openMaterial(row.id)">{{ row.label }}</button></td><td class="number">{{ number(row.stock) }}</td><td class="number">{{ currency(row.unitCost) }}</td><td class="number">{{ currency(row.value) }}</td></tr></tbody></table>
          </ReportTableCard>
          <ReportTableCard title="Materiales más usados" subtitle="Consumo por OT, con acceso al registro que lo utilizó." icon="mdi-package-down" @preview="previewMostUsedMaterials">
            <table class="data-table"><thead><tr><th>Material</th><th class="number">Cantidad usada</th><th class="number">Costo</th><th>Registro de uso</th></tr></thead><tbody><tr v-for="row in mostUsedMaterials" :key="row.key"><td><button class="entity-link" @click="openMaterial(row.entityId)">{{ row.label }}</button></td><td class="number">{{ number(row.consumedQuantity) }}</td><td class="number">{{ currency(row.consumptionValue) }}</td><td><v-btn size="small" variant="tonal" @click="openOrderList(linkedOrders(row), row.label)">Ver OT solicitantes</v-btn></td></tr></tbody></table>
          </ReportTableCard>
          <ReportTableCard title="Materiales con reserva" subtitle="Reservas solicitadas, entregadas y pendientes por OT." icon="mdi-package-variant" @preview="previewReservations">
            <table class="data-table"><thead><tr><th>Material</th><th>OT</th><th>Bodega</th><th class="number">Solicitado</th><th class="number">Entregado</th><th class="number">Pendiente</th></tr></thead><tbody><tr v-for="row in reservationRows.slice(0,100)" :key="String(row.reserva_id || row.id)"><td>{{ row.label || [row.codigo,row.nombre].filter(Boolean).join(' - ') }}</td><td><button v-if="row.work_order_id" class="entity-link" @click="openWorkOrderId(row.work_order_id)">{{ row.work_order_code || '-' }}</button><span v-else>-</span></td><td>{{ row.bodega_label || '-' }}</td><td class="number">{{ number(row.cantidad_solicitada) }}</td><td class="number">{{ number(row.cantidad_entregada) }}</td><td class="number">{{ number(row.cantidad_pendiente) }}</td></tr></tbody></table>
          </ReportTableCard>
        </div>
      </template>
      <template v-else>
        <div class="material-selector"><v-autocomplete v-model="selectedMaterialId" :items="materialOptions" item-title="title" item-value="value" label="Buscar material para ver su trazabilidad" prepend-inner-icon="mdi-magnify" variant="outlined" clearable hide-details @update:model-value="loadMaterialTimeline" /></div>
        <v-alert v-if="materialDetailError" type="warning" variant="tonal">{{ materialDetailError }}</v-alert>
        <div v-if="materialDetailLoading" class="detail-loading"><v-progress-linear indeterminate color="primary" /></div>
        <template v-else-if="materialMovements.length">
          <ReportTableCard title="Entradas y salidas del material" subtitle="La subida representa ingreso y la bajada representa salida." icon="mdi-chart-line" wide @preview="previewMaterialTimeline">
            <EChart :option="materialChartOption" height="300px" />
          </ReportTableCard>
          <ReportTableCard title="Cronograma de movimientos" subtitle="Stock antes y después de cada transacción, en orden cronológico." icon="mdi-timeline-clock-outline" wide @preview="previewMaterialTimeline">
            <table class="data-table data-table--wide"><thead><tr><th>Fecha</th><th>Material</th><th>Documento</th><th>Referencia</th><th>Descripción</th><th>Bodega</th><th class="number">Stock inicial</th><th class="number">Ingresó</th><th class="number">Salió</th><th class="number">Stock final</th></tr></thead><tbody><tr v-for="row in materialMovements" :key="String(row.id)"><td>{{ dateTime(row.fecha_creacion || row.fecha) }}</td><td>{{ selectedMaterialLabel }}</td><td><button v-if="row.documento_id" class="entity-link" @click="openKardexDocument(row)">{{ row.documento || 'Ver documento' }}</button><span v-else>{{ row.documento || '-' }}</span></td><td><button v-if="isOperationalReference(row.referencia)" class="entity-link" @click="openReferenceCode(row.referencia)">{{ row.referencia }}</button><span v-else>{{ row.referencia || '-' }}</span></td><td>{{ row.descripcion || row.concepto || '-' }}</td><td>{{ row.bodega || '-' }}</td><td class="number">{{ number(row.stock_inicial) }}</td><td class="number positive">{{ row.entrada ? number(row.entrada) : '-' }}</td><td class="number negative">{{ row.salida ? number(row.salida) : '-' }}</td><td class="number"><strong>{{ number(row.stock_final) }}</strong></td></tr></tbody></table>
          </ReportTableCard>
        </template>
        <v-alert v-else type="info" variant="tonal">{{ selectedMaterialId ? 'El material no registra movimientos en el período seleccionado.' : 'Seleccione un material para consultar su cronograma de movimientos.' }}</v-alert>
      </template>
    </section>

    <section v-else-if="isOperationalDocument" class="domain-stack">
      <div class="metric-grid">
        <MetricCard v-for="card in documentMetrics" :key="card.label" :label="card.label" :value="card.value" :helper="card.helper" :icon="card.icon" @preview="previewOperationalDocuments" />
      </div>
      <ReportTableCard :title="documentTableTitle" :subtitle="documentTableSubtitle" icon="mdi-file-document-multiple-outline" wide @preview="previewOperationalDocuments">
        <table class="data-table data-table--wide"><thead><tr v-if="moduleKey === 'warehouse-transfers'"><th>Transferencia</th><th>Fecha</th><th>Origen</th><th>Destino</th><th>Estado</th><th class="number">Ítems</th><th class="number">Cantidad</th><th>Documentos relacionados</th></tr><tr v-else-if="moduleKey === 'warehouse-reservations'"><th>Material</th><th>OT</th><th>Bodega</th><th>Estado</th><th class="number">Solicitado</th><th class="number">Entregado</th><th class="number">Pendiente</th></tr><tr v-else><th>Documento</th><th>Fecha</th><th>Proveedor</th><th>Bodega / lugar</th><th>Estado</th><th class="number">Total</th><th>Relaciones</th></tr></thead><tbody>
          <template v-if="moduleKey === 'warehouse-transfers'"><tr v-for="row in activeDocumentRows" :key="String(row.id)"><td><button class="entity-link" @click="openOperationalDocument(row,'transfer')">{{ row.codigo || '-' }}</button></td><td>{{ date(row.fecha_transferencia) }}</td><td>{{ row.bodega_origen_label || '-' }}</td><td>{{ row.bodega_destino_label || '-' }}</td><td><v-chip size="small" variant="tonal">{{ row.estado || '-' }}</v-chip></td><td class="number">{{ count(row.total_items) }}</td><td class="number">{{ number(row.total_cantidad) }}</td><td><button v-if="row.egreso_bodega_codigo" class="entity-link" @click="openKardexByReference(row.movimiento_salida_id,row.egreso_bodega_codigo)">{{ row.egreso_bodega_codigo }}</button><span> </span><button v-if="row.ingreso_bodega_codigo" class="entity-link" @click="openKardexByReference(row.movimiento_ingreso_id,row.ingreso_bodega_codigo)">{{ row.ingreso_bodega_codigo }}</button></td></tr></template>
          <template v-else-if="moduleKey === 'warehouse-reservations'"><tr v-for="row in activeDocumentRows" :key="String(row.reserva_id || row.id)"><td>{{ row.label || [row.codigo,row.nombre].filter(Boolean).join(' - ') }}</td><td><button v-if="row.work_order_id" class="entity-link" @click="openWorkOrderId(row.work_order_id)">{{ row.work_order_code || '-' }}</button></td><td>{{ row.bodega_label || '-' }}</td><td><v-chip size="small" variant="tonal">{{ row.estado || '-' }}</v-chip></td><td class="number">{{ number(row.cantidad_solicitada) }}</td><td class="number">{{ number(row.cantidad_entregada) }}</td><td class="number">{{ number(row.cantidad_pendiente) }}</td></tr></template>
          <template v-else><tr v-for="row in activeDocumentRows" :key="String(row.id)"><td><button class="entity-link" @click="openOperationalDocument(row,moduleKey === 'purchase-orders' ? 'purchase' : 'service')">{{ row.codigo || row.numero || '-' }}</button></td><td>{{ date(row.fecha_emision) }}</td><td>{{ row.proveedor_nombre || '-' }}</td><td>{{ row.bodega_label || row.lugar_entrega || '-' }}</td><td><v-chip size="small" variant="tonal">{{ row.estado || '-' }}</v-chip></td><td class="number">{{ currency(row.total ?? row.total_final) }}</td><td><button v-if="row.transferencia_id" class="entity-link" @click="openOperationalDocument({id:row.transferencia_id,codigo:row.transferencia_codigo},'transfer')">{{ row.transferencia_codigo || 'Ver TB' }}</button></td></tr></template>
        </tbody></table>
      </ReportTableCard>
    </section>

    <v-dialog v-model="listDialog" max-width="940" scrollable><v-card rounded="xl"><v-card-title class="dialog-title"><div><small>Detalle relacionado</small><h2>{{ listTitle }}</h2></div><v-btn icon="mdi-close" variant="text" @click="listDialog=false" /></v-card-title><v-divider/><v-card-text><table class="data-table"><thead><tr><th>Código</th><th>Descripción / equipo</th><th>Estado</th><th class="number">Horas</th></tr></thead><tbody><tr v-for="row in listRows" :key="String(row.work_order_id || row.work_order_code || row.label)"><td><button v-if="row.work_order_id" class="entity-link" @click="openWorkOrderId(row.work_order_id)">{{ row.work_order_code || row.label }}</button><span v-else>{{ row.work_order_code || row.label }}</span></td><td>{{ row.work_order_title || row.equipment_name || row.context || '-' }}</td><td>{{ row.work_order_status || row.status || '-' }}</td><td class="number">{{ row.hours !== undefined ? hours(row.hours) : '-' }}</td></tr></tbody></table></v-card-text></v-card></v-dialog>

    <v-dialog v-model="responsibleDialog" max-width="680" scrollable><v-card rounded="xl"><v-card-title class="dialog-title"><div><small>Horas realizadas</small><h2>{{ responsibleTitle }}</h2></div><v-btn icon="mdi-close" variant="text" @click="responsibleDialog=false" /></v-card-title><v-divider/><v-card-text><table class="data-table"><thead><tr><th>Responsable</th><th class="number">Horas</th></tr></thead><tbody><tr v-for="row in responsibleRows" :key="String(row.user_id || row.display_name)"><td>{{ row.display_name || row.responsable || '-' }}</td><td class="number">{{ hours(row.horas) }}</td></tr></tbody></table></v-card-text></v-card></v-dialog>

    <v-dialog v-model="materialDetailDialog" max-width="1180" scrollable><v-card rounded="xl"><v-card-title class="dialog-title"><div><small>Trazabilidad del material</small><h2>{{ selectedMaterialLabel }}</h2></div><v-btn icon="mdi-close" variant="text" @click="materialDetailDialog=false" /></v-card-title><v-divider/><v-card-text><v-progress-linear v-if="materialDetailLoading" indeterminate color="primary"/><v-alert v-else-if="materialDetailError" type="warning" variant="tonal">{{ materialDetailError }}</v-alert><template v-else><EChart v-if="materialMovements.length" :option="materialChartOption" height="280px"/><div class="modal-table-viewport"><table class="data-table data-table--wide"><thead><tr><th>Fecha</th><th>Documento</th><th>Referencia</th><th>Descripción</th><th>Bodega</th><th class="number">Inicial</th><th class="number">Ingresó</th><th class="number">Salió</th><th class="number">Final</th></tr></thead><tbody><tr v-for="row in materialMovements" :key="String(row.id)"><td>{{ dateTime(row.fecha_creacion || row.fecha) }}</td><td><button v-if="row.documento_id" class="entity-link" @click="openKardexDocument(row)">{{ row.documento }}</button><span v-else>{{ row.documento || '-' }}</span></td><td><button v-if="isOperationalReference(row.referencia)" class="entity-link" @click="openReferenceCode(row.referencia)">{{ row.referencia }}</button><span v-else>{{ row.referencia || '-' }}</span></td><td>{{ row.descripcion || row.concepto || '-' }}</td><td>{{ row.bodega || '-' }}</td><td class="number">{{ number(row.stock_inicial) }}</td><td class="number positive">{{ row.entrada ? number(row.entrada) : '-' }}</td><td class="number negative">{{ row.salida ? number(row.salida) : '-' }}</td><td class="number"><strong>{{ number(row.stock_final) }}</strong></td></tr></tbody></table></div></template></v-card-text></v-card></v-dialog>

    <WorkOrderDetailDialog v-model="workOrderDialog" :work-order-id="selectedWorkOrderId" />
    <OperationalDocumentDetailDialog v-model="documentDialog" :document-id="selectedDocumentId" :document-type="selectedDocumentType" :document-code="selectedDocumentCode" @open-reference="openReferenceCode" />
    <ReportPreviewDialogs :preview="reportPreview" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useTheme } from "vuetify";
import { api } from "@/app/http/api";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { buildEquipmentDisplayTitle, buildEquipmentManagerLabel } from "@/app/utils/equipment-display";
import { formatDateOnly, formatDateTime } from "@/app/utils/date-time";
import { listAllPages } from "@/app/utils/list-all-pages";
import { DEFAULT_CATALOG_CACHE_TTL_MS } from "@/app/utils/request-cache";
import { chartBase, chartInk, seriesColor } from "@/app/config/chart-theme";
import { buildReportingRelationshipRows, type ReportingRelationshipRow } from "@/app/utils/reporting-relations";
import { useReportPreview } from "@/app/utils/report-preview";
import type { ReportColumn, ReportDefinition } from "@/app/utils/maintenance-intelligence-reports";
import EChart from "@/components/charts/EChart.vue";
import WorkOrderDetailDialog from "@/components/maintenance/WorkOrderDetailDialog.vue";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";
import OperationalDocumentDetailDialog from "@/components/reports/OperationalDocumentDetailDialog.vue";
import MetricCard from "@/components/reports/ReportMetricCard.vue";
import ReportTableCard from "@/components/reports/ReportTableCard.vue";

type AnyRow = Record<string, any>;
type DocumentType = "kardex" | "transfer" | "purchase" | "service";
const props = defineProps<{ moduleKey: string; title: string; rawRows: AnyRow[]; relationshipPayload: AnyRow | null; startDate: string; endDate: string; materialView?: string }>();
const theme = useTheme();
const reportPreview = useReportPreview({ title: "Previsualización del informe" });
const isWorkOrder = computed(() => ["work-orders","project-work-orders"].includes(props.moduleKey));
const isEquipment = computed(() => ["generation-units","equipment"].includes(props.moduleKey));
const isLubricant = computed(() => props.moduleKey === "lubricant-analysis");
const isMaterials = computed(() => props.moduleKey === "materials");
const isOperationalDocument = computed(() => ["warehouse-transfers","warehouse-reservations","purchase-orders","service-orders"].includes(props.moduleKey));
const relationshipRows = computed(() => buildReportingRelationshipRows(props.moduleKey, props.relationshipPayload));
const materialView = computed(() => props.materialView === "detalle" ? "detalle" : "informativo");
const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
const isAnnulled = (row: AnyRow) => /ANUL|CANCEL|VOID/.test(normalize(row.status_workflow || row.estado || row.status));
const count = (value: unknown) => new Intl.NumberFormat("es-EC",{maximumFractionDigits:0}).format(Number(value||0));
const number = (value: unknown) => new Intl.NumberFormat("es-EC",{maximumFractionDigits:2}).format(Number(value||0));
const currency = (value: unknown) => new Intl.NumberFormat("es-EC",{style:"currency",currency:"USD"}).format(Number(value||0));
const hours = (value: unknown) => `${number(value)} h`;
const horometer = (value: unknown) => value === null || value === undefined || value === "" ? "-" : number(value);
const date = (value: unknown) => formatDateOnly(value, "-");
const dateTime = (value: unknown) => formatDateTime(value, "-");

const workOrders = computed(() => props.rawRows.filter((row) => props.moduleKey === "project-work-orders" ? normalize(row.maintenance_kind)==="PROYECTO" : normalize(row.maintenance_kind)!=="PROYECTO"));
function statusGroup(row: AnyRow) { const status=normalize(row.status_workflow||row.estado||row.status); if(/ANUL|CANCEL|VOID/.test(status))return"annulled"; if(/CLOSED|FINALIZ|CERRAD|COMPLET/.test(status))return"closed"; if(/IN.?PROGRESS|PROCES|EJEC/.test(status))return"progress"; return"planned"; }
const workOrderStatusCards = computed(() => [
  {key:"planned",label:"OT planificadas",icon:"mdi-calendar-clock",color:"info",rows:workOrders.value.filter(r=>statusGroup(r)==="planned")},
  {key:"progress",label:"OT en proceso",icon:"mdi-progress-wrench",color:"warning",rows:workOrders.value.filter(r=>statusGroup(r)==="progress")},
  {key:"closed",label:"OT finalizadas",icon:"mdi-check-circle-outline",color:"success",rows:workOrders.value.filter(r=>statusGroup(r)==="closed")},
  {key:"annulled",label:"OT anuladas",icon:"mdi-cancel",color:"error",rows:workOrders.value.filter(r=>statusGroup(r)==="annulled")},
]);
const workOrderRows = computed(() => relationshipRows.value.filter(row=>!/ANUL|CANCEL|VOID/.test(normalize(row.status))).slice().sort((a,b)=>b.hours-a.hours));
const costRows = computed(() => workOrderRows.value.slice().sort((a,b)=>b.maintenanceCost-a.maintenanceCost));
function rawOrderId(row: ReportingRelationshipRow) { for(const source of row.sourceRows as AnyRow[]){ if(source.work_order_id)return String(source.work_order_id); for(const detail of source.detalle_ordenes||[])if(detail.work_order_id)return String(detail.work_order_id); } return row.entityId || ""; }
function dateHours(start: unknown,end: unknown){ if(!start||!end)return 0; const result=(new Date(String(end)).getTime()-new Date(String(start)).getTime())/3600000; return Number.isFinite(result)?Math.max(0,result):0; }
function durationForRelationship(row:ReportingRelationshipRow){ const raw=workOrders.value.find(order=>normalize(order.code||order.codigo)===normalize(row.label)); if(raw){const duration=durationForRawOrder(raw);if(duration>0)return duration;} for(const source of row.sourceRows as AnyRow[]){ if(source.effective_started_at&&source.effective_closed_at)return dateHours(source.effective_started_at,source.effective_closed_at); if(source.started_at&&source.closed_at)return dateHours(source.started_at,source.closed_at); } return row.effectiveHours>0?row.effectiveHours:row.elapsedHours; }
// La OT trae el id y el nombre de campo del equipo (JC - UG09), pero no su marca
// ni su modelo: la etiqueta completa sale del catalogo, igual que la de las
// tablas que arma el servidor en esta misma pantalla.
const equipmentCatalog = ref<AnyRow[]>([]);
const equipmentLabelById = computed(()=>new Map(equipmentCatalog.value.map(row=>[String(row.id),buildEquipmentManagerLabel(row)])));
function workOrderEquipmentLabel(row:AnyRow){ return equipmentLabelById.value.get(String(row.equipment_id||""))||String(row.equipment_nombre||"Sin equipo"); }
async function loadEquipmentCatalog(){ if(!isWorkOrder.value)return; try{ equipmentCatalog.value=await listAllPages("/kpi_maintenance/equipos",{}, {limit:100,maxPages:100,cacheTtlMs:DEFAULT_CATALOG_CACHE_TTL_MS}); }catch{ /* Sin catalogo queda el nombre de campo del equipo. */ } }
const equipmentTraceRows = computed(()=>{ const map=new Map<string,{key:string;label:string;orders:AnyRow[];initial:number|null;final:number|null}>(); for(const row of workOrders.value.filter(r=>!isAnnulled(r))){ const key=String(row.equipment_id||row.equipment_label||row.equipment_name||"SIN_EQUIPO"); const current=map.get(key)||{key,label:workOrderEquipmentLabel(row),orders:[],initial:null,final:null}; current.orders.push({work_order_id:row.id,work_order_code:row.code||row.codigo,work_order_title:row.title,status:row.status_workflow,equipment_name:current.label,hours:durationForRawOrder(row)}); const initial=nullableNumber(row.horometro_anterior??row.horometro_inicial); const final=nullableNumber(row.horometro_actual??row.horometro_final); if(initial!==null)current.initial=current.initial===null?initial:Math.min(current.initial,initial); if(final!==null)current.final=current.final===null?final:Math.max(current.final,final); map.set(key,current); } return [...map.values()].sort((a,b)=>b.orders.length-a.orders.length); });
function durationForRawOrder(row:AnyRow){ return row.hora_inicio&&row.hora_fin?dateHours(row.hora_inicio,row.hora_fin):dateHours(row.started_at,row.closed_at); }
function nullableNumber(value:unknown){ if(value===null||value===undefined||value==="")return null; const parsed=Number(value); return Number.isFinite(parsed)?parsed:null; }

const allowedEquipmentKeys = computed(() => {
  const keys = new Set<string>();
  for (const row of props.rawRows) {
    const label = buildEquipmentDisplayTitle(row);
    if (label) keys.add(normalize(label));
    const operational = buildEquipmentManagerLabel(row);
    if (operational) keys.add(normalize(operational));
    for (const value of [row.id, row.equipment_id, row.equipment_label, row.nombre]) {
      if (value) keys.add(normalize(value));
    }
  }
  return keys;
});
const scopedEquipmentRows = computed(() =>
  relationshipRows.value.filter((row) => {
    if (!allowedEquipmentKeys.value.size) return false;
    if (allowedEquipmentKeys.value.has(normalize(row.entityId))) return true;
    if (allowedEquipmentKeys.value.has(normalize(row.label))) return true;
    return (row.sourceRows as AnyRow[]).some((source) =>
      allowedEquipmentKeys.value.has(normalize(source.equipment_id)) ||
      allowedEquipmentKeys.value.has(normalize(source.equipment_label)),
    );
  }),
);
const equipmentRows = computed(()=>scopedEquipmentRows.value.slice().sort((a,b)=>b.hours-a.hours));
const equipmentCostRows = computed(()=>scopedEquipmentRows.value.slice().sort((a,b)=>b.maintenanceCost-a.maintenanceCost));
const totalEquipmentOrders = computed(()=>equipmentRows.value.reduce((sum,row)=>sum+row.workOrders,0));
const totalEquipmentHours = computed(()=>equipmentRows.value.reduce((sum,row)=>sum+row.hours,0));
const totalEquipmentCost = computed(()=>equipmentRows.value.reduce((sum,row)=>sum+row.maintenanceCost,0));
function linkedOrders(row:ReportingRelationshipRow){ const map=new Map<string,AnyRow>(); for(const source of row.sourceRows as AnyRow[]){ const details=Array.isArray(source.detalle_ordenes)?source.detalle_ordenes:[]; for(const detail of details){const key=String(detail.work_order_code||detail.work_order_id||""); if(key){const current=map.get(key)||{};map.set(key,{...current,...detail,work_order_id:detail.work_order_id||current.work_order_id,hours:detail.total_horas??detail.effective_duration_hours??detail.flow_duration_hours??current.hours});}} if(source.work_order_code){const key=String(source.work_order_code);const current=map.get(key)||{};map.set(key,{...current,...source,work_order_id:source.work_order_id||current.work_order_id,hours:source.total_horas??source.horas??current.hours});} } return [...map.values()]; }

const lubricantRows = computed(()=>props.rawRows.filter(row=>!isAnnulled(row)));
function summaryNumber(row:AnyRow,key:string){ const summary=row.resumen_detalles||{}; return Number(summary[key]??summary[`total_${key}`]??0); }
const lubricantTotals = computed(()=>lubricantRows.value.reduce((sum,row)=>({normal:sum.normal+summaryNumber(row,"normal"),warning:sum.warning+summaryNumber(row,"precaucion"),abnormal:sum.abnormal+summaryNumber(row,"anormal")}),{normal:0,warning:0,abnormal:0}));
const lubricantAlerts = computed(() =>
  lubricantRows.value.flatMap((row) =>
    (row.detalle_grupos || []).flatMap((group: AnyRow) =>
      (group.detalles || group.parametros || [])
        .filter((item: AnyRow) =>
          /PRECAUC|ANORMAL|CRITIC|ALERTA/.test(
            normalize(item.nivel_alerta || item.estado),
          ),
        )
        .map((item: AnyRow) => ({
          analysis: row.codigo || row.numero_muestra || "-",
          equipment: row.equipo_nombre || "-",
          group: group.grupo_label || group.nombre || group.grupo || "-",
          parameter: item.parametro_label || item.parametro || "-",
          result: [item.resultado_numerico ?? item.resultado_texto, item.unidad]
            .filter((value) => value !== null && value !== undefined && value !== "")
            .join(" "),
          level: normalize(item.nivel_alerta || item.estado) || "PRECAUCION",
        })),
    ),
  ),
);

const materialProducts = computed(()=>props.rawRows);
const stocks = ref<AnyRow[]>([]); const reservationRows = ref<AnyRow[]>([]); const materialCategories = ref<AnyRow[]>([]);
const categoryMap = computed(()=>new Map(materialCategories.value.map(row=>[String(row.id),String(row.nombre||row.codigo||"")])));
function materialCategory(row:AnyRow){return String(row.categoria_nombre||row.tipo_material||categoryMap.value.get(String(row.categoria_id||""))||"");}
const materialTypeCounts = computed(()=>({spares:materialProducts.value.filter(r=>/REPUEST/.test(normalize(materialCategory(r)))).length,services:materialProducts.value.filter(r=>r.es_servicio===true).length,oils:materialProducts.value.filter(r=>r.es_aceite===true||/ACEITE|LUBRIC/.test(normalize(materialCategory(r)||r.nombre))).length}));
function productId(row:AnyRow){return String(row.producto_id||row.id||"");}
function productUnitCost(row:AnyRow){return Number(row.costo_promedio||row.ultimo_costo||row.costo_unitario||0);}
const productMap = computed(()=>new Map(materialProducts.value.map(row=>[String(row.id),row])));
const warehouseMaterialRows = computed(()=>{const reported=props.relationshipPayload?.reports?.movimientos_bodega?.rows;if(Array.isArray(reported)&&reported.length)return reported.map((row:AnyRow)=>({key:String(row.bodega_id||row.bodega_label),label:String(row.bodega_label||"Sin bodega"),materials:Number(row.materiales_en_stock||row.total_materiales||0),value:Number(row.costo_inventario_actual||row.total_costo_inventario||0)})).sort((a:AnyRow,b:AnyRow)=>b.materials-a.materials);const map=new Map<string,{key:string;label:string;ids:Set<string>;value:number}>();for(const row of stocks.value){const key=String(row.bodega_id||row.bodega_codigo||row.bodega_nombre||"SIN_BODEGA");const current=map.get(key)||{key,label:String(row.bodega_label||[row.bodega_codigo,row.bodega_nombre].filter(Boolean).join(" - ")||"Sin bodega"),ids:new Set<string>(),value:0};const id=productId(row);if(id)current.ids.add(id);const product=productMap.value.get(id)||{};current.value+=Number(row.stock_actual??row.stock??row.cantidad??0)*Number(row.costo_promedio||row.ultimo_costo||productUnitCost(product));map.set(key,current);}return[...map.values()].map(r=>({...r,materials:r.ids.size})).sort((a,b)=>b.materials-a.materials);});
const topValueMaterials = computed(()=>{const related=relationshipRows.value.filter(row=>row.stockQuantity!==0||row.stockValue!==0).map(row=>({key:row.key,id:row.entityId,label:row.label,stock:row.stockQuantity,unitCost:row.stockQuantity?row.stockValue/row.stockQuantity:0,value:row.stockValue}));if(related.some(row=>row.value>0))return related.sort((a,b)=>b.value-a.value).slice(0,100);const map=new Map<string,{key:string;id:string;label:string;stock:number;unitCost:number;value:number}>();for(const row of stocks.value){const id=productId(row);const product=productMap.value.get(id)||row;const current=map.get(id)||{key:id,id,label:buildProductDisplayTitle(product)||String(row.producto_label||row.producto_nombre||id),stock:0,unitCost:productUnitCost(product),value:0};const stock=Number(row.stock_actual??row.stock??row.cantidad??0);const cost=Number(row.costo_promedio||row.ultimo_costo||current.unitCost);current.stock+=stock;current.unitCost=cost||current.unitCost;current.value+=stock*(cost||current.unitCost);map.set(id,current);}return[...map.values()].sort((a,b)=>b.value-a.value).slice(0,100);});
const mostUsedMaterials = computed(()=>relationshipRows.value.slice().sort((a,b)=>b.consumedQuantity-a.consumedQuantity).slice(0,100));
const materialOptions = computed(()=>materialProducts.value.map(row=>({value:String(row.id),title:buildProductDisplayTitle(row)||String(row.codigo||row.nombre||row.id)})).sort((a,b)=>a.title.localeCompare(b.title,"es")));
const selectedMaterialId=ref("");const materialMovements=ref<AnyRow[]>([]);const materialDetailLoading=ref(false);const materialDetailError=ref("");const materialDetailDialog=ref(false);
const selectedMaterialLabel=computed(()=>materialOptions.value.find(item=>item.value===selectedMaterialId.value)?.title||"Material");
const materialChartOption=computed(()=>{const dark=theme.global.current.value.dark;const base=chartBase(dark);return{...base,aria:{enabled:true,description:`Entradas y salidas de ${selectedMaterialLabel.value}`},xAxis:{...base.xAxis,data:materialMovements.value.map(row=>date(row.fecha_creacion||row.fecha))},yAxis:{...base.yAxis,name:"Cantidad"},legend:{data:["Entradas","Salidas"],textStyle:{color:chartInk(dark).text}},series:[{name:"Entradas",type:"bar",itemStyle:{color:seriesColor(2,dark)},data:materialMovements.value.map(row=>Number(row.entrada||0))},{name:"Salidas",type:"bar",itemStyle:{color:seriesColor(3,dark)},data:materialMovements.value.map(row=>-Number(row.salida||0))}]};});
async function loadMaterialTimeline(){materialMovements.value=[];materialDetailError.value="";if(!selectedMaterialId.value)return;materialDetailLoading.value=true;try{const{data}=await api.get(`/kpi_inventory/kardex/resumen-material/${selectedMaterialId.value}/detalle`,{params:{desde:props.startDate,hasta:props.endDate,include_annulled:false,limit:1000}});const payload=data?.data??data??{};materialMovements.value=Array.isArray(payload.movements)?payload.movements:Array.isArray(payload.movimientos)?payload.movimientos:Array.isArray(payload.items)?payload.items:Array.isArray(payload)?payload:[];}catch(e:any){materialDetailError.value=e?.response?.data?.message||e?.message||"No se pudo consultar el Kardex del material.";}finally{materialDetailLoading.value=false;}}
async function loadMaterialSupport(){
  if(!isMaterials.value)return;
  const [stockResult, categoryResult, reservationResult] = await Promise.allSettled([
    listAllPages("/kpi_inventory/stock-bodega",{}, {limit:100,maxPages:100}),
    listAllPages("/kpi_inventory/categorias",{}, {limit:100,maxPages:100}),
    api.get("/kpi_maintenance/work-orders/reservations"),
  ]);
  stocks.value=stockResult.status==="fulfilled"?stockResult.value:[];
  materialCategories.value=categoryResult.status==="fulfilled"?categoryResult.value:[];
  if(reservationResult.status==="fulfilled"){
    const payload=reservationResult.value.data?.data??reservationResult.value.data??{};
    reservationRows.value=Array.isArray(payload.items)?payload.items:Array.isArray(payload)?payload:[];
  }else{
    reservationRows.value=[];
  }
}

const activeDocumentRows=computed(()=>props.rawRows.filter(row=>!isAnnulled(row)));
const documentMetrics=computed(()=>{const rows=activeDocumentRows.value; if(props.moduleKey==="warehouse-transfers")return[{label:"Transferencias",value:count(rows.length),helper:"Movimientos entre bodegas",icon:"mdi-truck-fast-outline"},{label:"Cantidad transferida",value:number(rows.reduce((s,r)=>s+Number(r.total_cantidad||0),0)),helper:"Unidades trasladadas",icon:"mdi-swap-horizontal-bold"},{label:"Completadas",value:count(rows.filter(r=>/COMPLET|RECIB|FINAL/.test(normalize(r.estado))).length),helper:"Transferencias terminadas",icon:"mdi-check-circle-outline"},{label:"Con guía",value:count(rows.filter(r=>r.guia_remision_numero||r.guia_remision_estado).length),helper:"Documentos de traslado",icon:"mdi-file-sign"}];if(props.moduleKey==="warehouse-reservations")return[{label:"Reservas",value:count(rows.length),helper:"Solicitudes de materiales",icon:"mdi-package-variant"},{label:"Cantidad solicitada",value:number(rows.reduce((s,r)=>s+Number(r.cantidad_solicitada||0),0)),helper:"Total requerido por OT",icon:"mdi-package-up"},{label:"Cantidad entregada",value:number(rows.reduce((s,r)=>s+Number(r.cantidad_entregada||0),0)),helper:"Atendido por bodega",icon:"mdi-package-down"},{label:"Cantidad pendiente",value:number(rows.reduce((s,r)=>s+Number(r.cantidad_pendiente||0),0)),helper:"Aún por despachar",icon:"mdi-clock-alert-outline"}];const total=rows.reduce((s,r)=>s+Number(r.total||r.total_final||0),0);const done=rows.filter(r=>/COMPLET|APROB|EMIT|REALIZ/.test(normalize(r.estado))||r.servicio_realizado===true).length;return[{label:props.moduleKey==="purchase-orders"?"Órdenes de compra":"Órdenes de servicio",value:count(rows.length),helper:"Documentos del período",icon:"mdi-file-document-multiple-outline"},{label:"Valor total",value:currency(total),helper:"Monto gestionado",icon:"mdi-cash-multiple"},{label:"Completadas",value:count(done),helper:"Proceso confirmado",icon:"mdi-check-circle-outline"},{label:"Pendientes",value:count(Math.max(0,rows.length-done)),helper:"Proceso por completar",icon:"mdi-progress-clock"}];});
const documentTableTitle=computed(()=>({"warehouse-transfers":"Transferencias de bodega","warehouse-reservations":"Reservas solicitadas por OT","purchase-orders":"Órdenes de compra","service-orders":"Órdenes de servicio"} as Record<string,string>)[props.moduleKey]||props.title);
const documentTableSubtitle=computed(()=>({"warehouse-transfers":"Origen, destino, cantidad y documentos IB/EB relacionados.","warehouse-reservations":"Material solicitado, entrega de bodega y saldo pendiente.","purchase-orders":"Proveedor, bodega, valor y transferencia relacionada.","service-orders":"Proveedor, lugar de entrega y confirmación del servicio."} as Record<string,string>)[props.moduleKey]||"");

const workOrderDialog=ref(false);const selectedWorkOrderId=ref<string|null>(null);function openWorkOrder(row:ReportingRelationshipRow){openWorkOrderId(rawOrderId(row));}function openWorkOrderId(id:unknown){const value=String(id||"").trim();if(!value)return;selectedWorkOrderId.value=value;workOrderDialog.value=true;}
const listDialog=ref(false);const listTitle=ref("");const listRows=ref<AnyRow[]>([]);function openOrderList(rows:AnyRow[],title:string){listTitle.value=`OT vinculadas · ${title}`;listRows.value=rows;listDialog.value=true;}function openStatusOrders(card:AnyRow){openOrderList(card.rows.map((row:AnyRow)=>({work_order_id:row.id,work_order_code:row.code||row.codigo,work_order_title:row.title||row.descripcion,work_order_status:row.status_workflow||row.estado,equipment_name:workOrderEquipmentLabel(row),hours:durationForRawOrder(row)})),card.label);}
const responsibleDialog=ref(false);const responsibleTitle=ref("");const responsibleRows=ref<AnyRow[]>([]);function openResponsibles(row:ReportingRelationshipRow){responsibleTitle.value=row.label;responsibleRows.value=(row.sourceRows as AnyRow[]).flatMap(source=>Array.isArray(source.responsables_meta)?source.responsables_meta:[]).filter((item,index,array)=>array.findIndex(other=>String(other.user_id||other.display_name)===String(item.user_id||item.display_name))===index);responsibleDialog.value=true;}
function openMaterials(row:ReportingRelationshipRow){const materials=new Set<string>();for(const value of String(row.relatedMaterials||"").split(/\s+\|\s+|\s*;\s*/))if(value.trim())materials.add(value.trim());for(const source of row.sourceRows as AnyRow[]){if(source.material_label)materials.add(String(source.material_label));for(const detail of source.detalle_materiales||[])if(detail.material_label)materials.add(String(detail.material_label));}listTitle.value=`Materiales · ${row.label}`;listRows.value=[...materials].map(label=>({label,context:"Material utilizado"}));listDialog.value=true;}
function openMaterial(id:unknown){const value=String(id||"");if(!value)return;selectedMaterialId.value=value;materialDetailDialog.value=true;void loadMaterialTimeline();}
const documentDialog=ref(false);const selectedDocumentId=ref<string|null>(null);const selectedDocumentCode=ref("");const selectedDocumentType=ref<DocumentType>("kardex");function openOperationalDocument(row:AnyRow,type:DocumentType){selectedDocumentId.value=String(row.id||row.documento_id||"");selectedDocumentCode.value=String(row.codigo||row.numero_documento||row.documento||"");selectedDocumentType.value=type;documentDialog.value=Boolean(selectedDocumentId.value);}function openKardexDocument(row:AnyRow){openOperationalDocument({id:row.documento_id,documento:row.documento},"kardex");}function openKardexByReference(id:unknown,code:unknown){openOperationalDocument({id,codigo:code},"kardex");}
function isOperationalReference(value:unknown){return /^(?:OT-|IB-|EB-|TB-|(?:JCTI-)?OC)/i.test(String(value||""));}
function responseRows(responseData:AnyRow){const payload=responseData?.data??responseData??{};return Array.isArray(payload)?payload:Array.isArray(payload.items)?payload.items:Array.isArray(payload.data)?payload.data:[];}
async function openReferenceCode(reference:unknown){
  const code=String(reference||"").trim();
  if(!isOperationalReference(code))return;
  try{
    if(/^OT-/i.test(code)){
      const{data}=await api.get("/kpi_maintenance/work-orders");
      const row=responseRows(data).find((item:AnyRow)=>normalize(item.code||item.codigo)===normalize(code));
      if(row?.id)openWorkOrderId(row.id);
      return;
    }
    const type:DocumentType=/^TB-/i.test(code)?"transfer":/(?:^|-)OC/i.test(code)?"purchase":"kardex";
    const endpoint=type==="transfer"?"/kpi_inventory/transferencias-bodega":type==="purchase"?"/kpi_inventory/ordenes-compra":"/kpi_inventory/kardex/documentos/lista";
    const{data}=await api.get(endpoint,{params:{search:code,page:1,limit:25}});
    const row=responseRows(data).find((item:AnyRow)=>normalize(item.codigo||item.numero_documento||item.numero)===normalize(code));
    if(row?.id)openOperationalDocument({...row,codigo:row.codigo||row.numero_documento||code},type);
  }catch{/* El detalle actual permanece visible si la referencia ya no está disponible. */}
}

function reportDefinition(title:string,rows:AnyRow[],columns:ReportColumn[],summary:{label:string;value:string|number}[]=[]):ReportDefinition{return{fileName:`reporteria-${props.moduleKey}-${props.startDate}-${props.endDate}`,title,subtitle:`Período: ${date(props.startDate)} - ${date(props.endDate)}`,compactPdf:true,summary,sheets:[{name:"Detalle",rows,columns}]};}
async function preview(title:string,rows:AnyRow[],columns:ReportColumn[],summary:{label:string;value:string|number}[]=[]){await reportPreview.open("pdf",reportDefinition(title,rows,columns,summary));}
function previewStatus(card:AnyRow){return preview(card.label,card.rows.map((r:AnyRow)=>({ot:r.code||r.codigo,equipo:workOrderEquipmentLabel(r),estado:r.status_workflow,responsable:r.created_by_label||r.created_by})),[{key:"ot",header:"OT"},{key:"equipo",header:"Equipo"},{key:"estado",header:"Estado"},{key:"responsable",header:"Registrada por"}],[{label:card.label,value:card.rows.length}]);}
function previewRelationship(type:"hours"|"cost"){const rows=type==="hours"?workOrderRows.value:costRows.value;return preview(type==="hours"?"Horas trabajadas por OT":"Costo de materiales por OT",rows.map(r=>({ot:r.label,equipo:r.relatedEquipment,horas:r.hours,duracion:durationForRelationship(r),unidades:r.consumedQuantity,costo:r.maintenanceCost})),type==="hours"?[{key:"ot",header:"OT"},{key:"equipo",header:"Equipo"},{key:"horas",header:"Horas responsables",format:"hours"},{key:"duracion",header:"Duración OT",format:"hours"}]:[{key:"ot",header:"OT"},{key:"equipo",header:"Equipo"},{key:"unidades",header:"Unidades",format:"number"},{key:"costo",header:"Costo",format:"currency"}]);}
function previewEquipmentTrace(){return preview("Equipos y trazabilidad de horómetro",equipmentTraceRows.value.map(r=>({equipo:r.label,ots:r.orders.length,inicial:r.initial,final:r.final})),[{key:"equipo",header:"Equipo"},{key:"ots",header:"OT",format:"number"},{key:"inicial",header:"Horómetro inicial",format:"horometer"},{key:"final",header:"Horómetro final",format:"horometer"}]);}
function previewEquipmentSummary(){return preview("Consolidado de equipos",equipmentRows.value.map(r=>({equipo:r.label,ots:r.workOrders,horas:r.hours,costo:r.maintenanceCost})),[{key:"equipo",header:"Equipo"},{key:"ots",header:"OT",format:"number"},{key:"horas",header:"Horas",format:"hours"},{key:"costo",header:"Costo",format:"currency"}]);}
function previewEquipmentTable(type:"hours"|"cost"){ void type; return previewEquipmentSummary(); }
function previewLubricant(){return preview("Diagnóstico de análisis de lubricante",lubricantRows.value.map(r=>({fecha:r.fecha_muestra,codigo:r.codigo,equipo:r.equipo_nombre,compartimento:r.compartimento_principal,diagnostico:r.estado_diagnostico||r.diagnostico,normal:summaryNumber(r,"normal"),precaucion:summaryNumber(r,"precaucion"),anormal:summaryNumber(r,"anormal")})),[{key:"fecha",header:"Fecha",format:"date"},{key:"codigo",header:"Análisis"},{key:"equipo",header:"Equipo"},{key:"compartimento",header:"Compartimento"},{key:"diagnostico",header:"Diagnóstico"},{key:"normal",header:"Normal",format:"number"},{key:"precaucion",header:"Precaución",format:"number"},{key:"anormal",header:"Anormal",format:"number"}]);}
function previewLubricantParameters(){return preview("Parámetros de lubricante que requieren seguimiento",lubricantAlerts.value,[{key:"analysis",header:"Análisis"},{key:"equipment",header:"Equipo"},{key:"group",header:"Grupo"},{key:"parameter",header:"Parámetro"},{key:"result",header:"Resultado"},{key:"level",header:"Nivel"}]);}
function previewMaterialSummary(){return preview("Resumen informativo de materiales",materialProducts.value.map(r=>({material:buildProductDisplayTitle(r),categoria:materialCategory(r),tipo:r.es_servicio?"Servicio":r.es_aceite?"Aceite":/REPUEST/.test(normalize(materialCategory(r)))?"Repuesto":"Material",costo:productUnitCost(r)})),[{key:"material",header:"Material"},{key:"categoria",header:"Categoría"},{key:"tipo",header:"Tipo"},{key:"costo",header:"Costo",format:"currency"}]);}
function previewWarehouseMaterials(){return preview("Cantidad de materiales por bodega",warehouseMaterialRows.value,[{key:"label",header:"Bodega"},{key:"materials",header:"Materiales distintos",format:"number"},{key:"value",header:"Costo total",format:"currency"}]);}
function previewTopValueMaterials(){return preview("Materiales con mayor valor",topValueMaterials.value,[{key:"label",header:"Material"},{key:"stock",header:"Stock",format:"number"},{key:"unitCost",header:"Costo unitario",format:"currency"},{key:"value",header:"Valor",format:"currency"}]);}
function previewMostUsedMaterials(){return preview("Materiales más usados",mostUsedMaterials.value.map(r=>({material:r.label,cantidad:r.consumedQuantity,costo:r.consumptionValue,ots:r.workOrders})),[{key:"material",header:"Material"},{key:"cantidad",header:"Cantidad usada",format:"number"},{key:"costo",header:"Costo",format:"currency"},{key:"ots",header:"OT",format:"number"}]);}
function previewReservations(){return preview("Materiales con reserva",reservationRows.value.map(r=>({material:r.label||[r.codigo,r.nombre].filter(Boolean).join(" - "),ot:r.work_order_code,bodega:r.bodega_label,solicitado:r.cantidad_solicitada,entregado:r.cantidad_entregada,pendiente:r.cantidad_pendiente})),[{key:"material",header:"Material"},{key:"ot",header:"OT"},{key:"bodega",header:"Bodega"},{key:"solicitado",header:"Solicitado",format:"number"},{key:"entregado",header:"Entregado",format:"number"},{key:"pendiente",header:"Pendiente",format:"number"}]);}
function previewMaterialTimeline(){return preview(`Cronograma de ${selectedMaterialLabel.value}`,materialMovements.value.map(r=>({fecha:r.fecha_creacion||r.fecha,documento:r.documento,referencia:r.referencia,descripcion:r.descripcion||r.concepto,bodega:r.bodega,inicial:r.stock_inicial,entrada:r.entrada,salida:r.salida,final:r.stock_final})),[{key:"fecha",header:"Fecha",format:"datetime"},{key:"documento",header:"Documento"},{key:"referencia",header:"Referencia"},{key:"descripcion",header:"Descripción"},{key:"bodega",header:"Bodega"},{key:"inicial",header:"Stock inicial",format:"number"},{key:"entrada",header:"Ingresó",format:"number"},{key:"salida",header:"Salió",format:"number"},{key:"final",header:"Stock final",format:"number"}]);}
function previewOperationalDocuments(){
  if(props.moduleKey==="warehouse-transfers")return preview(documentTableTitle.value,activeDocumentRows.value.map(r=>({codigo:r.codigo,fecha:r.fecha_transferencia,origen:r.bodega_origen_label,destino:r.bodega_destino_label,estado:r.estado,items:r.total_items,cantidad:r.total_cantidad,egreso:r.egreso_bodega_codigo,ingreso:r.ingreso_bodega_codigo})),[{key:"codigo",header:"TB"},{key:"fecha",header:"Fecha",format:"date"},{key:"origen",header:"Origen"},{key:"destino",header:"Destino"},{key:"estado",header:"Estado"},{key:"items",header:"Ítems",format:"number"},{key:"cantidad",header:"Cantidad",format:"number"},{key:"egreso",header:"EB"},{key:"ingreso",header:"IB"}]);
  if(props.moduleKey==="warehouse-reservations")return preview(documentTableTitle.value,activeDocumentRows.value.map(r=>({material:r.label||[r.codigo,r.nombre].filter(Boolean).join(" - "),ot:r.work_order_code,bodega:r.bodega_label,estado:r.estado,solicitado:r.cantidad_solicitada,entregado:r.cantidad_entregada,pendiente:r.cantidad_pendiente})),[{key:"material",header:"Material"},{key:"ot",header:"OT"},{key:"bodega",header:"Bodega"},{key:"estado",header:"Estado"},{key:"solicitado",header:"Solicitado",format:"number"},{key:"entregado",header:"Entregado",format:"number"},{key:"pendiente",header:"Pendiente",format:"number"}]);
  return preview(documentTableTitle.value,activeDocumentRows.value.map(r=>({codigo:r.codigo||r.numero,fecha:r.fecha_emision,proveedor:r.proveedor_nombre,bodega:r.bodega_label||r.lugar_entrega,estado:r.estado,total:r.total??r.total_final,transferencia:r.transferencia_codigo})),[{key:"codigo",header:"Documento"},{key:"fecha",header:"Fecha",format:"date"},{key:"proveedor",header:"Proveedor"},{key:"bodega",header:"Bodega / lugar"},{key:"estado",header:"Estado"},{key:"total",header:"Total",format:"currency"},{key:"transferencia",header:"TB relacionada"}]);
}

watch(()=>[props.moduleKey,props.startDate,props.endDate],()=>{selectedMaterialId.value="";materialMovements.value=[];void loadMaterialSupport();void loadEquipmentCatalog();});onMounted(()=>{void loadMaterialSupport();void loadEquipmentCatalog();});
</script>

<style scoped>
.domain-report,.domain-stack{display:grid;gap:16px}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric-card{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:12px;min-height:118px;padding:16px;border:1px solid rgba(var(--v-theme-on-surface),.12);border-radius:16px;background:rgb(var(--v-theme-surface))}.metric-card--interactive{cursor:pointer}.metric-card--interactive:focus-visible,.entity-link:focus-visible{outline:3px solid rgba(var(--v-theme-primary),.38);outline-offset:2px}.metric-card>div{display:grid;gap:3px}.metric-card span{color:rgba(var(--v-theme-on-surface),.66);font-size:.76rem;font-weight:750}.metric-card strong{font-size:1.45rem;font-variant-numeric:tabular-nums}.metric-card small{color:rgba(var(--v-theme-on-surface),.62)}.report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.data-table{width:100%;border-collapse:collapse;font-size:.84rem}.data-table th,.data-table td{padding:10px 12px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.08);text-align:left;vertical-align:middle}.data-table th{position:sticky;top:0;z-index:1;color:rgba(var(--v-theme-on-surface),.67);background:rgb(var(--v-theme-surface));font-size:.69rem;text-transform:uppercase;letter-spacing:.035em}.data-table td small{display:block;color:rgba(var(--v-theme-on-surface),.6)}.number{text-align:right!important;font-variant-numeric:tabular-nums}.positive{color:rgb(var(--v-theme-success))}.negative{color:rgb(var(--v-theme-error))}.entity-link{border:0;padding:2px 0;color:rgb(var(--v-theme-primary));background:transparent;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.material-selector{position:sticky;top:76px;z-index:8;padding:12px;border:1px solid rgba(var(--v-theme-on-surface),.12);border-radius:14px;background:rgb(var(--v-theme-surface));box-shadow:0 8px 22px rgba(0,0,0,.08)}.detail-loading{padding:24px}.dialog-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px}.dialog-title small{color:rgb(var(--v-theme-primary));font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.dialog-title h2{margin:2px 0;font-size:1.2rem}.modal-table-viewport{max-height:360px;overflow:auto;margin-top:12px;border:1px solid rgba(var(--v-theme-on-surface),.1);border-radius:12px}@media(max-width:1100px){.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.report-grid{grid-template-columns:1fr}}@media(max-width:640px){.metric-grid{grid-template-columns:1fr}.data-table--wide{min-width:920px}}
</style>

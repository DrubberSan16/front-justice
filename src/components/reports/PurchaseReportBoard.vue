<template>
  <section class="purchase-board">
    <div class="purchase-heading"><div><h2>Compras</h2><p>Del total por categoría a las órdenes y sus artículos. Importes con IVA.</p></div>
      <v-autocomplete v-model="categoryId" :items="categoryOptions" label="Categoría de repuestos / materiales" clearable variant="outlined" hide-details class="category-filter" />
    </div>
    <div class="purchase-metrics">
      <ReportMetricCard label="Total compras" :value="currency(totals.total)" helper="Artículos de la selección" icon="mdi-cash-multiple" @preview="previewReport" />
      <ReportMetricCard label="Órdenes de compra" :value="String(totals.orders)" helper="Con artículos seleccionados" icon="mdi-cart-outline" @preview="previewSheet(1)" />
      <ReportMetricCard label="Artículos" :value="String(totals.products)" helper="Productos distintos" icon="mdi-package-variant" @preview="previewSheet(2)" />
      <ReportMetricCard label="IVA" :value="currency(totals.tax)" helper="Impuesto de la selección" icon="mdi-calculator" @preview="previewReport" />
    </div>
    <v-alert v-if="!lines.length" type="info" variant="tonal">No hay compras para el período y categoría seleccionados.</v-alert>
    <ReportTableCard title="Compras por categoría" subtitle="Selecciona una categoría para consultar sus órdenes y artículos." icon="mdi-shape-outline" @preview="previewSheet(0)">
      <table><thead><tr><th>Categoría</th><th>OC</th><th>Artículos</th><th>Subtotal</th><th>Descuento</th><th>IVA</th><th>Total</th></tr></thead>
        <tbody><tr v-for="row in categories" :key="row.id"><td><button class="entity-link" @click="categoryId = row.categoryId">{{ row.category }}</button></td><td>{{ row.orders }}</td><td>{{ row.products }}</td><td>{{ currency(row.subtotal) }}</td><td>{{ currency(row.discount) }}</td><td>{{ currency(row.tax) }}</td><td>{{ currency(row.total) }}</td></tr></tbody>
        <tfoot><tr><th>Total</th><td>{{ totals.orders }}</td><td>{{ totals.products }}</td><td>{{ currency(totals.subtotal) }}</td><td>{{ currency(totals.discount) }}</td><td>{{ currency(totals.tax) }}</td><td>{{ currency(totals.total) }}</td></tr></tfoot>
      </table>
    </ReportTableCard>
    <ReportTableCard title="Órdenes de compra" subtitle="Los valores incluyen solo los artículos de la categoría seleccionada. Abre la OC para ver el documento completo." icon="mdi-file-document-outline" @preview="previewSheet(1)">
      <table><thead><tr><th>OC</th><th>Fecha</th><th>Proveedor</th><th>Subtotal</th><th>Descuento</th><th>IVA</th><th>Total</th></tr></thead>
        <tbody><tr v-for="row in orders" :key="row.id"><td><button class="entity-link" @click="openOrder(row.orderId, row.order)">{{ row.order }}</button></td><td>{{ formatDateOnly(row.date) }}</td><td>{{ row.supplier }}</td><td>{{ currency(row.subtotal) }}</td><td>{{ currency(row.discount) }}</td><td>{{ currency(row.tax) }}</td><td>{{ currency(row.total) }}</td></tr></tbody>
        <tfoot><tr><th colspan="3">Total · {{ totals.orders }} OC</th><td>{{ currency(totals.subtotal) }}</td><td>{{ currency(totals.discount) }}</td><td>{{ currency(totals.tax) }}</td><td>{{ currency(totals.total) }}</td></tr></tfoot>
      </table>
    </ReportTableCard>
    <ReportTableCard title="Artículos comprados por OC" subtitle="Detalle de cantidades, costos e impuestos de cada repuesto o material." icon="mdi-package-variant" @preview="previewSheet(2)">
      <table><thead><tr><th>OC</th><th>Categoría</th><th>Artículo</th><th>Cantidad</th><th>Costo unitario</th><th>Descuento</th><th>IVA</th><th>Total</th></tr></thead>
        <tbody><tr v-for="row in lines" :key="row.id"><td><button class="entity-link" @click="openOrder(row.orderId, row.order)">{{ row.order }}</button></td><td>{{ row.category }}</td><td>{{ row.code }} · {{ row.product }}</td><td>{{ number(row.quantity) }}</td><td>{{ currency(row.unitCost) }}</td><td>{{ currency(row.discount) }}</td><td>{{ currency(row.tax) }}</td><td>{{ currency(row.total) }}</td></tr></tbody>
        <tfoot><tr><th colspan="5">Total</th><td>{{ currency(totals.discount) }}</td><td>{{ currency(totals.tax) }}</td><td>{{ currency(totals.total) }}</td></tr></tfoot>
      </table>
    </ReportTableCard>
    <ReportPreviewDialogs :preview="preview" />
    <OperationalDocumentDetailDialog v-model="documentOpen" :document-id="documentId" :document-code="documentCode" document-type="purchase" />
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { buildPurchaseReport, groupPurchases, purchaseLines, purchaseTotals } from "@/app/utils/purchase-report";
import { selectReportSection } from "@/app/utils/report-section-selection";
import { useReportPreview } from "@/app/utils/report-preview";
import { formatDateOnly } from "@/app/utils/date-time";
import ReportTableCard from "./ReportTableCard.vue";
import ReportMetricCard from "./ReportMetricCard.vue";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";
import OperationalDocumentDetailDialog from "./OperationalDocumentDetailDialog.vue";
const props = defineProps<{ rows: Record<string, any>[]; startDate: string; endDate: string }>();
const categoryId = ref<string | null>(null);
const allLines = computed(() => purchaseLines(props.rows));
const categoryOptions = computed(() => [...new Map(allLines.value.map(row => [row.categoryId, { value: row.categoryId, title: row.category }])).values()].sort((a, b) => a.title.localeCompare(b.title)));
const lines = computed(() => allLines.value.filter(row => !categoryId.value || row.categoryId === categoryId.value));
const totals = computed(() => purchaseTotals(lines.value));
const categories = computed(() => groupPurchases(lines.value, "categoryId"));
const orders = computed(() => groupPurchases(lines.value, "orderId"));
const currency = (value: number) => new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(value);
const number = (value: number) => new Intl.NumberFormat("es-EC", { maximumFractionDigits: 4 }).format(value);
const preview = useReportPreview();
const documentOpen = ref(false);
const documentId = ref<string | null>(null);
const documentCode = ref("");
function openOrder(id: string, code: string) { documentId.value = id; documentCode.value = code; documentOpen.value = true; }
function buildModuleReport() { return buildPurchaseReport(props.rows, categoryId.value, `${formatDateOnly(props.startDate)} - ${formatDateOnly(props.endDate)}`); }
function previewSheet(index: number) { return preview.open("pdf", selectReportSection(buildModuleReport(), index)); }
function previewReport() { return preview.open("pdf", buildModuleReport()); }
watch(() => [props.startDate, props.endDate], () => { categoryId.value = null; });
defineExpose({ buildModuleReport });
</script>
<style scoped>
.purchase-board{display:grid;gap:18px;min-width:0}.purchase-heading{display:flex;align-items:center;gap:20px;flex-wrap:wrap}.purchase-heading h2{font-size:1.25rem}.purchase-heading p{color:rgba(var(--v-theme-on-surface),.7);font-size:.9rem}.category-filter{min-width:240px;max-width:440px}.purchase-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}table{width:100%;border-collapse:collapse;font-size:.85rem}th,td{padding:10px 12px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.1);text-align:right;font-variant-numeric:tabular-nums}th:first-child,td:first-child{text-align:left}thead th,tfoot th,tfoot td{background:rgb(var(--v-theme-surface));font-weight:700}tfoot th,tfoot td{border-top:2px solid rgba(var(--v-theme-on-surface),.2)}.entity-link{color:rgb(var(--v-theme-primary));text-decoration:underline;text-underline-offset:3px;text-align:left;min-height:32px}.entity-link:focus-visible{outline:2px solid rgb(var(--v-theme-primary));outline-offset:3px}@media(max-width:1000px){.purchase-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.purchase-metrics{grid-template-columns:1fr}.category-filter{max-width:none;width:100%}.purchase-heading{align-items:stretch}table{min-width:740px}}
</style>

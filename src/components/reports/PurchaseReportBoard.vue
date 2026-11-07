<template>
  <section class="purchase-board">
    <div class="purchase-filters">
      <v-autocomplete v-model="categoryId" :items="categoryOptions" label="Categoría de compra (incluye repuestos)" variant="outlined" density="compact" clearable hide-details />
      <v-btn variant="outlined" prepend-icon="mdi-filter-remove-outline" @click="resetScope">Ver total de compras</v-btn>
    </div>
    <v-alert v-if="lines.some(line => line.missingDetail)" type="warning" variant="tonal" density="compact">Hay órdenes sin detalle disponible. Su importe aparece en «Sin detalle disponible».</v-alert>
    <div class="purchase-metrics">
      <article><span>Órdenes distintas</span><strong>{{ count(orders.length) }}</strong></article>
      <article><span>Subtotal neto</span><strong>{{ currency(totals.subtotal) }}</strong></article>
      <article><span>IVA</span><strong>{{ currency(totals.tax) }}</strong></article>
      <article><span>Total con IVA</span><strong>{{ currency(totals.total) }}</strong></article>
    </div>
    <ReportTableCard title="Compras por categoría" subtitle="Seleccione una categoría para consultar sus órdenes. Los importes corresponden a las líneas de compra; el subtotal es neto de descuentos." icon="mdi-cart-outline" wide @preview="preview(undefined, 0)">
      <table><thead><tr><th>Categoría</th><th>Órdenes distintas</th><th>Subtotal neto</th><th>IVA</th><th>Total con IVA</th></tr></thead><tbody>
        <tr v-for="group in categories" :key="group.key"><td><button class="entity-link" @click="categoryId = group.key; selectedOrderId = null">{{ group.label }}</button></td><td class="number">{{ count(group.orders) }}</td><td class="number">{{ currency(group.subtotal) }}</td><td class="number">{{ currency(group.tax) }}</td><td class="number">{{ currency(group.total) }}</td></tr>
        <tr v-if="!categories.length"><td colspan="5">No hay compras en el período y categoría seleccionados.</td></tr>
      </tbody><tfoot><tr><th>Total filtrado</th><td class="number">{{ count(orders.length) }}</td><td class="number">{{ currency(totals.subtotal) }}</td><td class="number">{{ currency(totals.tax) }}</td><td class="number">{{ currency(totals.total) }}</td></tr></tfoot></table>
    </ReportTableCard>
    <ReportTableCard title="Órdenes de compra" :subtitle="`Ámbito: ${scopeLabel}. Seleccione una orden para ver sus líneas.`" icon="mdi-file-document-multiple-outline" wide @preview="preview(undefined, 1)">
      <div class="purchase-pagination"><span>{{ count(orders.length) }} órdenes · página {{ orderPage }} de {{ orderPages }} · totales de todo el filtro</span><v-pagination v-model="orderPage" :length="orderPages" :total-visible="4" density="comfortable" size="small" aria-label="Páginas de órdenes de compra" /></div>
      <table><thead><tr><th>Orden</th><th>Fecha</th><th>Proveedor</th><th>Estado</th><th>Subtotal neto</th><th>IVA</th><th>Total con IVA</th><th>Acciones</th></tr></thead><tbody>
        <tr v-for="group in visibleOrders" :key="group.key"><td><button class="entity-link" @click="selectedOrderId = group.key">{{ group.label }}</button></td><td>{{ date(group.rows[0]?.date) }}</td><td>{{ group.rows[0]?.supplier }}</td><td>{{ group.rows[0]?.status }}</td><td class="number">{{ currency(group.subtotal) }}</td><td class="number">{{ currency(group.tax) }}</td><td class="number">{{ currency(group.total) }}</td><td><v-btn size="small" variant="text" prepend-icon="mdi-printer-outline" :aria-label="`Imprimir ${group.label}`" @click="preview(group.key)">Imprimir</v-btn><v-btn size="small" variant="text" @click="emit('openOrder', group.key)">Documento</v-btn></td></tr>
      </tbody><tfoot><tr><th colspan="4">Total filtrado</th><td class="number">{{ currency(totals.subtotal) }}</td><td class="number">{{ currency(totals.tax) }}</td><td class="number">{{ currency(totals.total) }}</td><td /></tr></tfoot></table>
    </ReportTableCard>
    <ReportTableCard v-if="selectedOrder" :title="`Líneas de ${selectedOrder.label}`" :subtitle="`Ámbito: ${scopeLabel}. Importes de las líneas seleccionadas.`" icon="mdi-format-list-bulleted" wide @preview="preview(selectedOrder.key, 2)">
      <div class="purchase-pagination"><span>{{ count(selectedOrder.rows.length) }} líneas · página {{ linePage }} de {{ linePages }}</span><v-pagination v-model="linePage" :length="linePages" :total-visible="4" density="comfortable" size="small" aria-label="Páginas de líneas de compra" /></div>
      <table><thead><tr><th>Material</th><th>Categoría</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal neto</th><th>IVA</th><th>Total con IVA</th></tr></thead><tbody>
        <tr v-for="line in visibleLines" :key="line.key"><td>{{ line.material }}</td><td>{{ line.category }}</td><td class="number">{{ number(line.quantity) }}</td><td class="number">{{ currency(line.unitCost) }}</td><td class="number">{{ currency(line.subtotal) }}</td><td class="number">{{ currency(line.tax) }}</td><td class="number">{{ currency(line.total) }}</td></tr>
      </tbody><tfoot><tr><th colspan="4">Total de líneas seleccionadas</th><td class="number">{{ currency(selectedOrder.subtotal) }}</td><td class="number">{{ currency(selectedOrder.tax) }}</td><td class="number">{{ currency(selectedOrder.total) }}</td></tr></tfoot></table>
    </ReportTableCard>
    <ReportPreviewDialogs :preview="reportPreview" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { formatCurrencyForDisplay as currency, formatNumberForDisplay as number, formatCountForDisplay as count } from "@/app/utils/number-format";
import { formatDateOnly as date } from "@/app/utils/date-time";
import { buildPurchaseReport, groupPurchaseLines, purchaseLines, purchaseTotals } from "@/app/utils/purchase-report";
import { useReportPreview } from "@/app/utils/report-preview";
import ReportTableCard from "@/components/reports/ReportTableCard.vue";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";
const props = defineProps<{ rows: Record<string, any>[]; startDate: string; endDate: string }>();
const emit = defineEmits<{ (event: "openOrder", id: string): void }>();
const categoryId = ref<string | null>(null);
const selectedOrderId = ref<string | null>(null);
const orderPage = ref(1);
const linePage = ref(1);
const pageSize = 20;
const lines = computed(() => purchaseLines(props.rows));
const categoryOptions = computed(() => groupPurchaseLines(lines.value, "categoryId").map(group => ({ value: group.key, title: group.label })));
const filtered = computed(() => lines.value.filter(line => !categoryId.value || line.categoryId === categoryId.value));
const categories = computed(() => groupPurchaseLines(filtered.value, "categoryId"));
const orders = computed(() => groupPurchaseLines(filtered.value, "orderId"));
const orderPages = computed(() => Math.max(1, Math.ceil(orders.value.length / pageSize)));
const visibleOrders = computed(() => orders.value.slice((orderPage.value - 1) * pageSize, orderPage.value * pageSize));
const totals = computed(() => purchaseTotals(filtered.value));
const selectedOrder = computed(() => orders.value.find(group => group.key === selectedOrderId.value));
const linePages = computed(() => Math.max(1, Math.ceil((selectedOrder.value?.rows.length || 0) / pageSize)));
const visibleLines = computed(() => selectedOrder.value?.rows.slice((linePage.value - 1) * pageSize, linePage.value * pageSize) || []);
const scopeLabel = computed(() => categoryOptions.value.find(option => option.value === categoryId.value)?.title || "Todas las categorías");
const reportPreview = useReportPreview({ title: "Informe de compras" });
function resetScope() { categoryId.value = null; selectedOrderId.value = null; }
function buildModuleReport(orderId?: string) {
  return buildPurchaseReport(filtered.value.filter(line => !orderId || line.orderId === orderId), `${date(props.startDate)} - ${date(props.endDate)}`, orderId ? `Compra ${orders.value.find(group => group.key === orderId)?.label || ""}` : "Compras", scopeLabel.value);
}
function preview(orderId?: string, sheetIndex?: number) {
  const report = buildModuleReport(orderId);
  if (sheetIndex !== undefined) {
    report.sheets = [report.sheets[sheetIndex]!];
    report.title = report.sheets[0]!.name;
  }
  return reportPreview.open("pdf", report);
}
watch(categoryId, () => { selectedOrderId.value = null; orderPage.value = 1; });
watch(selectedOrderId, () => { linePage.value = 1; });
watch(orderPages, value => { orderPage.value = Math.min(orderPage.value, value); });
watch(linePages, value => { linePage.value = Math.min(linePage.value, value); });
watch(categoryOptions, options => { if (categoryId.value && !options.some(option => option.value === categoryId.value)) categoryId.value = null; });
defineExpose({ buildModuleReport });
</script>

<style scoped>
.purchase-pagination{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 12px;font-size:.78rem}.purchase-board{display:grid;grid-template-columns:minmax(0,1fr);min-width:0;gap:16px}.purchase-filters{display:flex;align-items:center;gap:12px}.purchase-filters>.v-autocomplete{min-width:0}.purchase-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.purchase-metrics article{display:grid;gap:5px;padding:16px;border:1px solid rgba(var(--v-theme-on-surface),.12);border-radius:14px;background:rgb(var(--v-theme-surface))}.purchase-metrics span{font-size:.78rem;color:rgba(var(--v-theme-on-surface),.68)}.purchase-metrics strong{font-size:1.4rem;overflow-wrap:anywhere}table{width:100%;min-width:760px;border-collapse:separate;border-spacing:0;font-size:.84rem}th,td{padding:10px 12px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.1);text-align:left}th{font-size:.72rem}th:first-child,td:first-child{position:sticky;left:0;background:rgb(var(--v-theme-surface));z-index:1}.number{text-align:right;font-variant-numeric:tabular-nums}tfoot{font-weight:800}.entity-link{border:0;background:transparent;color:rgb(var(--v-theme-primary));font:inherit;font-weight:800;text-decoration:underline;cursor:pointer;min-height:44px}.entity-link:focus-visible{outline:2px solid rgb(var(--v-theme-primary));outline-offset:2px}@media(max-width:900px){.purchase-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.purchase-filters{align-items:stretch;flex-direction:column}.purchase-metrics{grid-template-columns:minmax(0,1fr)}}
</style>

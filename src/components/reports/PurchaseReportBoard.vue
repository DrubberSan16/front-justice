<template>
  <section class="purchase-board">
    <div class="purchase-filters">
      <v-autocomplete v-model="categoryId" :items="categoryOptions" label="Categoría de compra" variant="outlined" density="compact" clearable hide-details />
      <v-autocomplete
        v-if="categoryId === SPARE_PARTS_CATEGORY.value"
        v-model="selectedBrand"
        :items="brandOptions"
        :disabled="!brandOptions.length"
        label="Marca del repuesto"
        variant="outlined"
        density="compact"
        return-object
        clearable
        hide-details
      />
      <v-btn variant="outlined" prepend-icon="mdi-filter-remove-outline" @click="resetScope">Ver todas las categorías</v-btn>
    </div>
    <v-alert v-if="lines.some(line => line.missingDetail)" type="warning" variant="tonal" density="compact">Hay órdenes sin detalle disponible. Su importe aparece en «Sin detalle disponible».</v-alert>
    <div class="purchase-metrics">
      <article><span>Órdenes distintas</span><strong>{{ count(orders.length) }}</strong></article>
      <article><span>Subtotal neto</span><strong>{{ totals.subtotal }}</strong></article>
      <article><span>IVA</span><strong>{{ totals.tax }}</strong></article>
      <article><span>Total con IVA</span><strong>{{ totals.total }}</strong></article>
    </div>
    <ReportTableCard
      class="purchase-categories"
      title="Compras por categoría"
      subtitle="Abre una categoría para ver sus ítems comprados. El subtotal es neto de descuentos."
      icon="mdi-cart-outline"
      wide
      @preview="preview(undefined, 0)"
    >
      <v-expansion-panels v-if="categories.length" v-model="expandedCategories" multiple variant="accordion">
        <v-expansion-panel v-for="group in categories" :key="group.key" :value="group.key">
          <v-expansion-panel-title>
            <div class="purchase-category-heading">
              <strong>{{ group.label }}</strong>
              <div class="purchase-category-metrics">
                <span>Órdenes distintas <b>{{ count(group.orders) }}</b></span>
                <span>Subtotal neto <b>{{ group.amounts.subtotal }}</b></span>
                <span>IVA <b>{{ group.amounts.tax }}</b></span>
                <span>Total con IVA <b>{{ group.amounts.total }}</b></span>
              </div>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-if="group.brands.length" class="purchase-brand-summary">
              <table aria-label="Totales de repuestos por marca">
                <thead>
                  <tr>
                    <th scope="col">Marca del repuesto</th>
                    <th scope="col" class="number">Órdenes distintas</th>
                    <th scope="col" class="number">Subtotal neto</th>
                    <th scope="col" class="number">IVA</th>
                    <th scope="col" class="number">Total con IVA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="brand in group.brands" :key="brand.key">
                    <th scope="row">
                      <button v-if="!selectedBrand" type="button" class="entity-link" @click="selectBrand(brand.key, brand.label)">{{ brand.label }}</button>
                      <span v-else>{{ brand.label }}</span>
                    </th>
                    <td class="number">{{ count(brand.orders) }}</td>
                    <td class="number">{{ brand.amounts.subtotal }}</td>
                    <td class="number">{{ brand.amounts.tax }}</td>
                    <td class="number">{{ brand.amounts.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="purchase-category-detail">
              <table :aria-label="`Ítems comprados en ${group.label}`">
                <thead>
                  <tr>
                    <th scope="col">Material</th>
                    <th v-if="group.brands.length" scope="col">Marca</th>
                    <th scope="col">Orden</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">Proveedor</th>
                    <th scope="col" class="number">Cantidad</th>
                    <th scope="col" class="number">Precio unitario</th>
                    <th scope="col" class="number">Subtotal neto</th>
                    <th scope="col" class="number">IVA</th>
                    <th scope="col" class="number">Total con IVA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in group.rows" :key="line.key">
                    <td>{{ line.material }}</td>
                    <td v-if="group.brands.length">{{ line.brand }}</td>
                    <td><button type="button" class="entity-link" @click="emit('openOrder', line.orderId)">{{ line.code }}</button></td>
                    <td>{{ date(line.date) }}</td>
                    <td>{{ line.supplier }}</td>
                    <td class="number">{{ number(line.quantity) }}</td>
                    <td class="number">{{ currency(line.unitCost, line.currency) }}</td>
                    <td class="number">{{ currency(line.subtotal, line.currency) }}</td>
                    <td class="number">{{ currency(line.tax, line.currency) }}</td>
                    <td class="number">{{ currency(line.total, line.currency) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <p v-else class="ma-4" role="status">{{ categoryId === SPARE_PARTS_CATEGORY.value ? "No hay compras de repuestos para los filtros aplicados." : "No hay compras para los filtros aplicados." }}</p>
      <footer class="purchase-category-heading purchase-category-total">
        <strong>{{ selectedBrand ? `Total · ${selectedBrand.title}` : categoryId ? "Total de la categoría" : supplierId ? "Total del proveedor" : "Total general" }}</strong>
        <div class="purchase-category-metrics">
          <span>Órdenes distintas <b>{{ count(orders.length) }}</b></span>
          <span>Subtotal neto <b>{{ totals.subtotal }}</b></span>
          <span>IVA <b>{{ totals.tax }}</b></span>
          <span>Total con IVA <b>{{ totals.total }}</b></span>
        </div>
      </footer>
    </ReportTableCard>
    <ReportTableCard title="Órdenes de compra" :subtitle="`Ámbito: ${scopeLabel}. Seleccione una orden para ver sus líneas.`" icon="mdi-file-document-multiple-outline" wide @preview="preview(undefined, 1)">
      <div class="purchase-pagination"><span>{{ count(orders.length) }} órdenes · página {{ orderPage }} de {{ orderPages }} · totales de todo el filtro</span><v-pagination v-model="orderPage" :length="orderPages" :total-visible="4" density="comfortable" size="small" aria-label="Páginas de órdenes de compra" /></div>
      <table><thead><tr><th>Orden</th><th>Fecha</th><th>Proveedor</th><th>Estado</th><th>Subtotal neto</th><th>IVA</th><th>Total con IVA</th><th>Acciones</th></tr></thead><tbody>
        <tr v-for="group in visibleOrders" :key="group.key"><td><button class="entity-link" :aria-pressed="selectedOrderId === group.key" @click="selectedOrderId = group.key">{{ group.label }}</button></td><td>{{ date(group.rows[0]?.date) }}</td><td>{{ group.rows[0]?.supplier }}</td><td>{{ group.rows[0]?.status }}</td><td class="number">{{ currency(group.subtotal, group.rows[0]?.currency) }}</td><td class="number">{{ currency(group.tax, group.rows[0]?.currency) }}</td><td class="number">{{ currency(group.total, group.rows[0]?.currency) }}</td><td><v-btn size="small" variant="text" prepend-icon="mdi-printer-outline" :aria-label="`Imprimir ${group.label}`" @click="preview(group.key)">Imprimir</v-btn><v-btn size="small" variant="text" @click="emit('openOrder', group.key)">Documento</v-btn></td></tr>
      </tbody><tfoot><tr><th colspan="4">Total filtrado</th><td class="number">{{ totals.subtotal }}</td><td class="number">{{ totals.tax }}</td><td class="number">{{ totals.total }}</td><td /></tr></tfoot></table>
    </ReportTableCard>
    <ReportTableCard
      :title="selectedOrder ? `Líneas de ${selectedOrder.label}` : 'Líneas de compra'"
      :subtitle="`Emisión de OC: ${periodLabel} · ${scopeLabel}`"
      icon="mdi-format-list-bulleted"
      wide
      @preview="preview(selectedOrder?.key, 2)"
    >
      <div class="purchase-pagination">
        <span>{{ count(detailLines.length) }} líneas · página {{ linePage }} de {{ linePages }}</span>
        <v-btn v-if="selectedOrder" size="small" variant="text" @click="selectedOrderId = null">Ver todas las líneas</v-btn>
        <v-pagination v-if="linePages > 1" v-model="linePage" :length="linePages" :total-visible="4" density="comfortable" size="small" aria-label="Páginas de líneas de compra" />
      </div>
      <table>
        <thead>
          <tr><th>Orden</th><th>Emisión de OC</th><th>Proveedor</th><th>Material</th><th>Categoría</th><th v-if="detailHasSpareParts">Marca del repuesto</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal neto</th><th>IVA</th><th>Total con IVA</th></tr>
        </thead>
        <tbody>
          <tr v-for="line in visibleLines" :key="line.key">
            <td>{{ line.code }}</td><td>{{ date(line.date) }}</td><td>{{ line.supplier }}</td><td>{{ line.material }}</td><td>{{ line.category }}</td>
            <td v-if="detailHasSpareParts">{{ line.brand }}</td>
            <td class="number">{{ number(line.quantity) }}</td><td class="number">{{ currency(line.unitCost, line.currency) }}</td>
            <td class="number">{{ currency(line.subtotal, line.currency) }}</td><td class="number">{{ currency(line.tax, line.currency) }}</td><td class="number">{{ currency(line.total, line.currency) }}</td>
          </tr>
          <tr v-if="!detailLines.length"><td colspan="10">No hay líneas de compra para los filtros aplicados.</td></tr>
        </tbody>
        <tfoot>
          <tr><th :colspan="detailHasSpareParts ? 8 : 7">Total de líneas</th><td class="number">{{ detailTotals.subtotal }}</td><td class="number">{{ detailTotals.tax }}</td><td class="number">{{ detailTotals.total }}</td></tr>
        </tfoot>
      </table>
    </ReportTableCard>
    <ReportPreviewDialogs :preview="reportPreview" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { formatNumberForDisplay as number, formatCountForDisplay as count } from "@/app/utils/number-format";
import { formatDateOnly as date } from "@/app/utils/date-time";
import { buildPurchaseCharts, buildPurchaseReport, filterPurchaseLines, formatPurchaseAmount as currency, groupPurchaseLines, groupSparePartsByBrand, purchaseLines, purchaseTotalsDisplay, SPARE_PARTS_CATEGORY } from "@/app/utils/purchase-report";
import { useReportPreview } from "@/app/utils/report-preview";
import ReportTableCard from "@/components/reports/ReportTableCard.vue";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";
const props = defineProps<{ rows: Record<string, any>[]; startDate: string; endDate: string; supplierId?: string | null; supplierLabel?: string }>();
const emit = defineEmits<{ (event: "openOrder", id: string): void }>();
const categoryId = ref<string | null>(null);
const selectedBrand = ref<{ value: string; title: string } | null>(null);
const expandedCategories = ref<string[]>([]);
const selectedOrderId = ref<string | null>(null);
const orderPage = ref(1);
const linePage = ref(1);
const pageSize = 20;
const lines = computed(() => filterPurchaseLines(purchaseLines(props.rows), props.startDate, props.endDate, props.supplierId ?? null));
const categoryOptions = computed(() => [
  SPARE_PARTS_CATEGORY,
  ...groupPurchaseLines(lines.value, "categoryId")
    .filter(group => group.key !== SPARE_PARTS_CATEGORY.value)
    .map(group => ({ value: group.key, title: group.label })),
]);
const brandOptions = computed(() => {
  const options = groupSparePartsByBrand(lines.value).map(group => ({ value: group.key, title: group.label }));
  const selected = selectedBrand.value;
  if (selected && !options.some(option => option.value === selected.value)) options.unshift(selected);
  return options;
});
const filtered = computed(() => lines.value.filter(line =>
  (!categoryId.value || line.categoryId === categoryId.value) &&
  (categoryId.value !== SPARE_PARTS_CATEGORY.value || !selectedBrand.value || line.brandId === selectedBrand.value.value),
));
const categories = computed(() => groupPurchaseLines(filtered.value, "categoryId").map(group => ({
  ...group,
  amounts: purchaseTotalsDisplay(group.rows),
  brands: groupSparePartsByBrand(group.rows).map(brand => ({ ...brand, amounts: purchaseTotalsDisplay(brand.rows) })),
})));
const orders = computed(() => groupPurchaseLines(filtered.value, "orderId"));
const orderPages = computed(() => Math.max(1, Math.ceil(orders.value.length / pageSize)));
const visibleOrders = computed(() => orders.value.slice((orderPage.value - 1) * pageSize, orderPage.value * pageSize));
const totals = computed(() => purchaseTotalsDisplay(filtered.value));
const selectedOrder = computed(() => orders.value.find(group => group.key === selectedOrderId.value));
const detailLines = computed(() => selectedOrder.value?.rows ?? filtered.value);
const detailHasSpareParts = computed(() => detailLines.value.some(line => line.categoryId === SPARE_PARTS_CATEGORY.value));
const detailTotals = computed(() => selectedOrder.value ? purchaseTotalsDisplay(detailLines.value) : totals.value);
const linePages = computed(() => Math.max(1, Math.ceil(detailLines.value.length / pageSize)));
const visibleLines = computed(() => detailLines.value.slice((linePage.value - 1) * pageSize, linePage.value * pageSize));
const periodLabel = computed(() => `${date(props.startDate)} - ${date(props.endDate)}`);
const scopeLabel = computed(() => [
  categoryOptions.value.find(option => option.value === categoryId.value)?.title || "Todas las categorías",
  selectedBrand.value?.title,
  props.supplierLabel || "Todos los proveedores",
].filter(Boolean).join(" · "));
const reportPreview = useReportPreview({ title: "Informe de compras" });
function resetScope() { categoryId.value = null; selectedBrand.value = null; selectedOrderId.value = null; }
function selectBrand(value: string, title: string) {
  categoryId.value = SPARE_PARTS_CATEGORY.value;
  selectedBrand.value = { value, title };
}
function buildModuleReport(orderId?: string, includeCharts = !orderId) {
  const rows = orderId ? filtered.value.filter(line => line.orderId === orderId) : filtered.value;
  const report = buildPurchaseReport(rows, periodLabel.value, orderId ? `Compra ${orders.value.find(group => group.key === orderId)?.label || ""}` : "Compras", scopeLabel.value);
  if (includeCharts) report.charts = buildPurchaseCharts(rows);
  return report;
}
function preview(orderId?: string, sheetIndex?: number) {
  const report = buildModuleReport(orderId, !orderId && sheetIndex === undefined);
  if (sheetIndex !== undefined) {
    report.sheets = [report.sheets[sheetIndex]!];
    report.title = report.sheets[0]!.name;
  }
  return reportPreview.open("pdf", report);
}
watch(categoryId, value => {
  expandedCategories.value = value ? [value] : [];
  if (value !== SPARE_PARTS_CATEGORY.value) selectedBrand.value = null;
});
watch([categoryId, selectedBrand, () => props.startDate, () => props.endDate, () => props.supplierId], () => {
  selectedOrderId.value = null;
  orderPage.value = 1;
  linePage.value = 1;
});
watch(selectedOrderId, () => { linePage.value = 1; });
watch(orderPages, value => { orderPage.value = Math.min(orderPage.value, value); });
watch(linePages, value => { linePage.value = Math.min(linePage.value, value); });
watch(categoryOptions, options => { if (categoryId.value && !options.some(option => option.value === categoryId.value)) categoryId.value = null; });
defineExpose({ buildModuleReport });
</script>

<style scoped>
.purchase-categories :deep(.table-card__viewport) {
  max-height: none;
  scrollbar-gutter: auto;
}

.purchase-category-heading {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding-inline-end: 12px;
  overflow-wrap: anywhere;
}

.purchase-category-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  font-size: .78rem;
  line-height: 1.4;
}

.purchase-category-metrics span {
  display: grid;
  gap: 3px;
}

.purchase-category-total {
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), .12);
  background: rgba(var(--v-theme-primary), .08);
}

.purchase-category-detail {
  max-height: 340px;
  overflow: auto;
}

.purchase-brand-summary {
  max-width: 100%;
  overflow-x: auto;
  margin-bottom: 16px;
}

.purchase-brand-summary table {
  min-width: 500px;
}

.purchase-category-detail table {
  min-width: 900px;
}

.purchase-category-detail th:first-child,
.purchase-category-detail td:first-child {
  position: static;
}

.purchase-category-detail thead {
  position: sticky;
  top: 0;
  background: rgb(var(--v-theme-surface));
  z-index: 1;
}

.purchase-category-detail .number {
  white-space: nowrap;
}

.purchase-pagination{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 12px;font-size:.78rem}.purchase-board{display:grid;grid-template-columns:minmax(0,1fr);min-width:0;gap:16px}.purchase-filters{display:flex;align-items:center;gap:12px}.purchase-filters>.v-autocomplete{min-width:0}.purchase-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.purchase-metrics article{display:grid;gap:5px;padding:16px;border:1px solid rgba(var(--v-theme-on-surface),.12);border-radius:14px;background:rgb(var(--v-theme-surface))}.purchase-metrics span{font-size:.78rem;color:rgba(var(--v-theme-on-surface),.68)}.purchase-metrics strong{font-size:1.4rem;overflow-wrap:anywhere}table{width:100%;min-width:760px;border-collapse:separate;border-spacing:0;font-size:.84rem}th,td{padding:10px 12px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.1);text-align:left}th{font-size:.72rem}th:first-child,td:first-child{position:sticky;left:0;background:rgb(var(--v-theme-surface));z-index:1}.number{text-align:right;font-variant-numeric:tabular-nums}tfoot{font-weight:800}.entity-link{border:0;background:transparent;color:rgb(var(--v-theme-primary));font:inherit;font-weight:800;text-decoration:underline;cursor:pointer;min-height:44px}.entity-link:focus-visible{outline:2px solid rgb(var(--v-theme-primary));outline-offset:2px}@media(max-width:900px){.purchase-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.purchase-filters{align-items:stretch;flex-direction:column}.purchase-metrics{grid-template-columns:minmax(0,1fr)}}
</style>

<template>
  <v-dialog :model-value="modelValue" max-width="1040" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card rounded="xl">
      <v-card-title class="document-title">
        <div>
          <small>Detalle del documento</small>
          <h2>{{ displayCode }}</h2>
          <p>{{ typeLabel }}</p>
        </div>
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle" @click="emit('update:modelValue', false)" />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div v-if="loading" class="document-loading"><v-progress-circular indeterminate color="primary" /> Consultando documento...</div>
        <v-alert v-else-if="error" type="warning" variant="tonal">{{ error }}</v-alert>
        <template v-else>
          <div class="document-facts">
            <article v-for="fact in facts" :key="fact.label"><span>{{ fact.label }}</span><button v-if="fact.reference" class="reference-link" @click="emit('openReference', fact.value)">{{ fact.value }}</button><strong v-else>{{ fact.value }}</strong></article>
          </div>
          <div v-if="items.length" class="document-table-wrap">
            <table>
              <thead><tr><th>Material o detalle</th><th class="number">Cantidad</th><th class="number">Costo unitario</th><th class="number">Total</th></tr></thead>
              <tbody><tr v-for="(item, index) in items" :key="String(item.id || index)"><td>{{ itemLabel(item) }}</td><td class="number">{{ number(item.cantidad ?? item.quantity) }}</td><td class="number">{{ currency(item.costo_unitario ?? item.precio_unitario ?? item.precio) }}</td><td class="number">{{ currency(item.subtotal ?? item.total ?? Number(item.cantidad || 0) * Number(item.costo_unitario || item.precio_unitario || 0)) }}</td></tr></tbody>
            </table>
          </div>
          <v-alert v-else type="info" variant="tonal">El documento no registra líneas de detalle visibles.</v-alert>
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions class="px-5 py-4"><v-spacer /><v-btn color="primary" @click="emit('update:modelValue', false)">Cerrar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { formatDateTime } from "@/app/utils/date-time";

type DocumentType = "kardex" | "transfer" | "purchase" | "service";
const props = defineProps<{ modelValue: boolean; documentId: string | null; documentType: DocumentType; documentCode?: string }>();
const emit = defineEmits<{ (event: "update:modelValue", value: boolean): void; (event: "openReference", value: string): void }>();
const loading = ref(false);
const error = ref("");
const document = ref<Record<string, any>>({});

const endpoints: Record<DocumentType, string> = {
  kardex: "/kpi_inventory/kardex/documentos",
  transfer: "/kpi_inventory/transferencias-bodega",
  purchase: "/kpi_inventory/ordenes-compra",
  service: "/kpi_inventory/ordenes-servicio",
};
const typeLabel = computed(() => ({ kardex: "Movimiento de bodega", transfer: "Transferencia de bodega", purchase: "Orden de compra", service: "Orden de servicio" })[props.documentType]);
const displayCode = computed(() => String(props.documentCode || document.value.codigo || document.value.numero_documento || document.value.numero || "Documento"));
const items = computed(() => {
  const row = document.value;
  for (const key of ["detalles", "items", "detalle", "productos", "lineas"]) if (Array.isArray(row?.[key])) return row[key];
  return [];
});
const facts = computed(() => {
  const row = document.value;
  return [
    { label: "Estado", value: row.estado || row.status || "-" },
    { label: "Fecha", value: formatDateTime(row.fecha || row.fecha_movimiento || row.fecha_emision || row.fecha_transferencia || row.created_at, "-") },
    { label: "Bodega origen", value: row.bodega_origen_label || row.bodega_origen_nombre || row.bodega_label || row.bodega_nombre || "-" },
    { label: "Bodega destino", value: row.bodega_destino_label || row.bodega_destino_nombre || "-" },
    { label: "Proveedor", value: row.proveedor_nombre || "-" },
    { label: "Referencia", value: row.referencia || row.concepto || "-", reference: /^(?:OT-|IB-|EB-|TB-|(?:JCTI-)?OC)/i.test(String(row.referencia || "")) },
    { label: "Registrado por", value: row.created_by_label || row.emitido_por_nombre || row.created_by || row.usuario || "-" },
    { label: "Total", value: currency(row.total ?? row.total_final ?? row.costo_total) },
  ].filter((fact) => fact.value !== "-");
});

function itemLabel(item: Record<string, any>) {
  return buildProductDisplayTitle({
    codigo: item.producto_codigo || item.codigo_producto || item.codigo,
    nombre: item.producto_nombre || item.nombre_producto || item.nombre,
    descripcion: item.producto_descripcion || item.descripcion_producto || item.descripcion,
  }) || String(item.descripcion_producto || item.descripcion || item.concepto || item.producto_label || "Detalle");
}
function number(value: unknown) { return new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(Number(value || 0)); }
function currency(value: unknown) { return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(value || 0)); }
async function load() {
  if (!props.documentId) return;
  loading.value = true; error.value = ""; document.value = {};
  try {
    const { data } = await api.get(`${endpoints[props.documentType]}/${props.documentId}`);
    document.value = data?.data ?? data ?? {};
  } catch (requestError: any) {
    error.value = requestError?.response?.data?.message || requestError?.message || "No se pudo consultar el documento.";
  } finally { loading.value = false; }
}
watch(() => [props.modelValue, props.documentId, props.documentType] as const, ([open]) => { if (open) void load(); }, { immediate: true });
</script>

<style scoped>
.document-title { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:20px 24px; }
.document-title small { color:rgb(var(--v-theme-primary)); font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
.document-title h2 { margin:2px 0 0; font-size:1.25rem; }
.document-title p { margin:2px 0 0; color:rgba(var(--v-theme-on-surface),.68); font-size:.85rem; }
.document-loading { display:flex; align-items:center; justify-content:center; gap:12px; min-height:180px; }
.document-facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin-bottom:18px; }
.document-facts article { display:grid; gap:3px; padding:10px 12px; border:1px solid rgba(var(--v-theme-on-surface),.12); border-radius:12px; }
.document-facts span { color:rgba(var(--v-theme-on-surface),.65); font-size:.72rem; text-transform:uppercase; }
.reference-link { width:max-content; padding:0; border:0; background:transparent; color:rgb(var(--v-theme-primary)); font:inherit; font-weight:800; text-align:left; text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
.document-table-wrap { overflow-x:auto; border:1px solid rgba(var(--v-theme-on-surface),.12); border-radius:12px; }
table { width:100%; min-width:660px; border-collapse:collapse; }
th,td { padding:10px 12px; border-bottom:1px solid rgba(var(--v-theme-on-surface),.08); text-align:left; }
th { color:rgba(var(--v-theme-on-surface),.68); font-size:.72rem; text-transform:uppercase; }
.number { text-align:right; font-variant-numeric:tabular-nums; }
</style>

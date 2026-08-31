<template>
  <div class="detailed-report">
    <v-alert v-if="!canAccess" type="warning" variant="tonal" rounded="xl">
      Este reporte está disponible para Gerencia General y Super Administración.
    </v-alert>

    <template v-else>
      <section class="report-heading" aria-labelledby="detailed-report-title">
        <div>
          <div class="report-heading__eyebrow">Vista gerencial</div>
          <h1 id="detailed-report-title">Reporte detallado</h1>
          <p>Órdenes, aceite e inventario en una vista simple.</p>
        </div>
        <div class="report-heading__actions">
          <v-text-field
            v-model="selectedDate"
            type="date"
            label="Fecha"
            variant="outlined"
            density="comfortable"
            hide-details
            aria-label="Fecha del reporte"
          />
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-refresh"
            :loading="loading"
            @click="loadReport"
          >
            Actualizar
          </v-btn>
        </div>
      </section>

      <v-alert v-if="error" type="warning" variant="tonal" rounded="xl" :text="error" />

      <section aria-labelledby="orders-title">
        <div class="section-title-row">
          <div>
            <h2 id="orders-title">Órdenes de trabajo</h2>
            <p>Seleccione un estado y luego una orden.</p>
          </div>
          <v-text-field
            v-model="orderSearch"
            label="Buscar orden o equipo"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            class="order-search"
          />
        </div>

        <div class="status-grid" role="tablist" aria-label="Estados de órdenes de trabajo">
          <button
            v-for="status in statusCards"
            :key="status.key"
            type="button"
            role="tab"
            :aria-selected="activeStatus === status.key"
            :class="['status-button', `status-button--${status.tone}`, { 'status-button--active': activeStatus === status.key }]"
            @click="activeStatus = status.key"
          >
            <v-icon :icon="status.icon" size="34" aria-hidden="true" />
            <span class="status-button__copy">
              <strong>{{ status.label }}</strong>
              <span>{{ status.helper }}</span>
            </span>
            <span class="status-button__count">{{ status.count }}</span>
          </button>
        </div>

        <div v-if="loading" class="orders-loading">
          <v-skeleton-loader v-for="index in 3" :key="index" type="article" />
        </div>
        <div v-else-if="!visibleOrders.length" class="empty-panel">
          <v-icon icon="mdi-clipboard-text-off-outline" size="42" />
          <strong>No hay órdenes en este estado</strong>
        </div>
        <div v-else class="orders-list">
          <button
            v-for="order in visibleOrders"
            :key="order.id"
            type="button"
            class="order-card"
            @click="openOrderDetail(order)"
          >
            <div class="order-card__main">
              <div class="order-card__code">{{ order.code || "Sin código" }}</div>
              <div class="order-card__title">{{ order.title || "Orden sin título" }}</div>
              <div class="order-card__equipment">{{ equipmentLabel(order) }}</div>
            </div>
            <div class="order-card__facts">
              <span><small>Apertura</small>{{ formatTime(order.started_at || order.created_at) }}</span>
              <span><small>Finalización</small>{{ formatTime(order.closed_at) }}</span>
              <span><small>Horómetro anterior</small>{{ formatHours(order.horometro_anterior) }}</span>
              <span><small>Horómetro actual</small>{{ formatHours(order.horometro_actual) }}</span>
            </div>
            <div class="order-card__action">
              Ver detalle
              <v-icon icon="mdi-chevron-right" aria-hidden="true" />
            </div>
          </button>
        </div>
      </section>

      <section class="simple-section" aria-labelledby="oil-title">
        <div class="section-title-row">
          <div>
            <h2 id="oil-title">Consumo de aceite del mes</h2>
            <p>Galones usados y costo registrado.</p>
          </div>
          <v-select
            v-model="selectedOilProductId"
            :items="oilCatalog"
            :item-title="materialLabel"
            item-value="id"
            label="Aceite"
            variant="outlined"
            density="comfortable"
            hide-details
            class="oil-select"
            @update:model-value="loadOilReport"
          />
        </div>

        <div class="metric-grid">
          <article class="metric-card">
            <span>Total usado</span>
            <strong>{{ formatNumber(oilTotals.total_cantidad) }} gal</strong>
          </article>
          <article class="metric-card">
            <span>Mayor consumo por equipo</span>
            <strong>{{ topOilEquipment ? equipmentLabel(topOilEquipment) : "Sin consumo" }}</strong>
            <small v-if="topOilEquipment">{{ formatNumber(topOilEquipment.total_cantidad) }} gal</small>
          </article>
          <article class="metric-card">
            <span>Mayor consumo por orden</span>
            <strong>{{ topOilOrder?.work_order_code || "Sin consumo" }}</strong>
            <small v-if="topOilOrder">{{ formatNumber(topOilOrder.cantidad) }} gal</small>
          </article>
          <article class="metric-card">
            <span>Costo de aceite</span>
            <strong>{{ formatCurrency(oilTotals.total_costo) }}</strong>
          </article>
        </div>
      </section>

      <section class="simple-section" aria-labelledby="inventory-title">
        <div class="section-title-row">
          <div>
            <h2 id="inventory-title">Inventario mensual</h2>
            <p>{{ monthLabel }}</p>
          </div>
          <v-text-field
            v-model="inventorySearch"
            label="Buscar material"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            class="order-search"
          />
        </div>

        <v-data-table
          :headers="inventoryHeaders"
          :items="visibleInventory"
          :loading="inventoryLoading"
          :items-per-page="10"
          density="comfortable"
          class="manager-table"
        >
          <template #item.material_label="{ item }">
            <strong>{{ materialLabel(item) }}</strong>
          </template>
          <template #item.inventario_inicial="{ item }">{{ formatNumber(item.inventario_inicial) }}</template>
          <template #item.ingresos="{ item }"><span class="value-positive">+{{ formatNumber(item.ingresos) }}</span></template>
          <template #item.salidas="{ item }"><span class="value-negative">-{{ formatNumber(item.salidas) }}</span></template>
          <template #item.inventario_actual="{ item }"><strong>{{ formatNumber(item.inventario_actual) }}</strong></template>
          <template #no-data>
            <div class="empty-table">No hay movimientos de inventario para este mes.</div>
          </template>
        </v-data-table>
      </section>
    </template>

    <v-dialog v-model="detailDialog" max-width="1080" scrollable>
      <v-card rounded="xl" class="detail-dialog">
        <v-card-title class="detail-dialog__header">
          <div>
            <span>{{ selectedOrder?.code || "Orden de trabajo" }}</span>
            <strong>{{ selectedOrder?.title || "Detalle" }}</strong>
            <small>{{ equipmentLabel(selectedOrder || {}) }}</small>
          </div>
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle" @click="detailDialog = false" />
        </v-card-title>

        <v-divider />
        <v-card-text class="detail-dialog__body">
          <div v-if="detailLoading" class="detail-loading">
            <v-progress-circular indeterminate color="primary" />
            Cargando detalle de la orden...
          </div>

          <template v-else>
            <v-alert v-if="detailError" type="warning" variant="tonal" rounded="xl" :text="detailError" />

            <div class="detail-summary">
              <article><span>Abierta</span><strong>{{ formatDateTime(detailHeader.started_at || detailHeader.created_at) }}</strong></article>
              <article><span>Finalizada</span><strong>{{ formatDateTime(detailHeader.closed_at) }}</strong></article>
              <article><span>Horómetro anterior</span><strong>{{ formatHours(detailHeader.horometro_anterior) }}</strong></article>
              <article><span>Horómetro actual</span><strong>{{ formatHours(detailHeader.horometro_actual) }}</strong></article>
              <article><span>Horas de trabajo</span><strong>{{ formatNumber(totalResponsibleHours) }} h</strong></article>
              <article><span>Costo de materiales</span><strong>{{ formatCurrency(materialCost) }}</strong></article>
            </div>

            <div class="detail-block">
              <h3>Responsables</h3>
              <div v-if="responsibleRows.length" class="responsible-list">
                <div v-for="row in responsibleRows" :key="row.key">
                  <span>{{ row.label }}</span><strong>{{ formatNumber(row.hours) }} h</strong>
                </div>
              </div>
              <p v-else class="muted-empty">No hay horas registradas.</p>
            </div>

            <div class="detail-block">
              <h3>Materiales cambiados</h3>
              <div v-if="materialRows.length" class="material-list">
                <div v-for="row in materialRows" :key="row.key" class="material-row">
                  <strong>{{ row.label }}</strong>
                  <span>Nuevo entregado: <b>{{ formatNumber(row.delivered) }}</b></span>
                  <span>Viejo a chatarra: <b>{{ formatNumber(row.scrapped) }}</b></span>
                  <v-chip :color="row.delivered > 0 && row.scrapped > 0 ? 'success' : 'warning'" variant="tonal" size="small">
                    {{ row.delivered > 0 && row.scrapped > 0 ? "Flujo completo" : "Revisar" }}
                  </v-chip>
                </div>
              </div>
              <p v-else class="muted-empty">No hay materiales registrados.</p>
            </div>

            <div class="detail-block">
              <h3>Aceite</h3>
              <div class="oil-detail">
                <article><span>Usado en esta orden</span><strong>{{ formatNumber(orderOilQuantity) }} gal</strong></article>
                <article><span>Entregado por bodega</span><strong>{{ oilDelivered ? "Sí" : "No registrado" }}</strong></article>
                <article><span>Costo</span><strong>{{ formatCurrency(orderOilCost) }}</strong></article>
              </div>
            </div>

            <div class="detail-block">
              <h3>Registro de la orden</h3>
              <div class="audit-grid">
                <span>Creada por<strong>{{ detailHeader.created_by_label || detailHeader.created_by || "Sin registro" }}</strong></span>
                <span>Iniciada o procesada por<strong>{{ detailHeader.processed_by_label || firstHistoryActor || "Sin registro" }}</strong></span>
                <span>Última edición por<strong>{{ detailHeader.updated_by || lastHistoryActor || "Sin registro" }}</strong></span>
              </div>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { currentDateInputValue, formatDateTime as formatAppDateTime } from "@/app/utils/date-time";
import { isGeneralManager, isSuperAdministrator } from "@/app/utils/role-access";

type AnyRow = Record<string, any>;
type StatusKey = "planned" | "open" | "closed";

const auth = useAuthStore();
const canAccess = computed(() => isGeneralManager(auth.user) || isSuperAdministrator(auth.user));
const selectedDate = ref(currentDateInputValue());
const loading = ref(false);
const inventoryLoading = ref(false);
const error = ref<string | null>(null);
const orders = ref<AnyRow[]>([]);
const activeStatus = ref<StatusKey>("open");
const orderSearch = ref("");
const inventorySearch = ref("");
const inventoryRows = ref<AnyRow[]>([]);
const oilReport = ref<AnyRow | null>(null);
const selectedOilProductId = ref<string | null>(null);
const equipmentCatalog = ref<AnyRow[]>([]);

const detailDialog = ref(false);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);
const selectedOrder = ref<AnyRow | null>(null);
const detailHeader = ref<AnyRow>({});
const detailTasks = ref<AnyRow[]>([]);
const detailConsumptions = ref<AnyRow[]>([]);
const detailIssues = ref<AnyRow[]>([]);
const detailScraps = ref<AnyRow[]>([]);
const detailHistory = ref<AnyRow[]>([]);

const inventoryHeaders = [
  { title: "Material", key: "material_label" },
  { title: "Inicio de mes", key: "inventario_inicial", align: "end" as const },
  { title: "Ingresó", key: "ingresos", align: "end" as const },
  { title: "Salió", key: "salidas", align: "end" as const },
  { title: "Inventario actual", key: "inventario_actual", align: "end" as const },
];

function unwrap(payload: any): any {
  return payload?.data?.data ?? payload?.data ?? payload ?? null;
}

function asArray(payload: any): AnyRow[] {
  const value = unwrap(payload);
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function orderStatus(order: AnyRow): StatusKey {
  const status = normalizeStatus(order.status_workflow || order.status);
  if (["CLOSED", "CERRADA", "CERRADO", "COMPLETED", "FINALIZADA", "FINALIZADO"].includes(status)) return "closed";
  if (["PLANNED", "PLANIFICADA", "PLANIFICADO", "SCHEDULED", "PROGRAMADA", "PROGRAMADO"].includes(status)) return "planned";
  return "open";
}

const groupedOrders = computed<Record<StatusKey, AnyRow[]>>(() => ({
  planned: orders.value.filter((row) => orderStatus(row) === "planned"),
  open: orders.value.filter((row) => orderStatus(row) === "open"),
  closed: orders.value.filter((row) => orderStatus(row) === "closed"),
}));

const statusCards = computed(() => [
  { key: "planned" as const, label: "Órdenes planificadas", helper: "Trabajo por iniciar", icon: "mdi-calendar-clock", tone: "planned", count: groupedOrders.value.planned.length },
  { key: "open" as const, label: "Órdenes abiertas", helper: "Trabajo en proceso", icon: "mdi-progress-wrench", tone: "open", count: groupedOrders.value.open.length },
  { key: "closed" as const, label: "Órdenes cerradas", helper: "Trabajo finalizado", icon: "mdi-clipboard-check-outline", tone: "closed", count: groupedOrders.value.closed.length },
]);

const visibleOrders = computed(() => {
  const search = String(orderSearch.value || "").trim().toLocaleLowerCase("es");
  const rows = groupedOrders.value[activeStatus.value];
  if (!search) return rows;
  return rows.filter((row) =>
    [row.code, row.title, equipmentLabel(row)].some((value) =>
      String(value || "").toLocaleLowerCase("es").includes(search),
    ),
  );
});

const oilCatalog = computed<AnyRow[]>(() => Array.isArray(oilReport.value?.catalog) ? oilReport.value.catalog : []);
const oilTotals = computed<AnyRow>(() => oilReport.value?.totals ?? {});
const topOilEquipment = computed<AnyRow | null>(() => oilReport.value?.by_equipment?.[0] ?? null);
const topOilOrder = computed<AnyRow | null>(() =>
  [...(Array.isArray(oilReport.value?.work_orders) ? oilReport.value.work_orders : [])]
    .sort((a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0))[0] ?? null,
);

const visibleInventory = computed(() => {
  const search = String(inventorySearch.value || "").trim().toLocaleLowerCase("es");
  if (!search) return inventoryRows.value;
  return inventoryRows.value.filter((row) => materialLabel(row).toLocaleLowerCase("es").includes(search));
});

const monthLabel = computed(() => {
  const date = new Date(`${selectedDate.value || currentDateInputValue()}T12:00:00`);
  return new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(date);
});

function equipmentLabel(item: AnyRow) {
  const equipmentId = String(item?.equipment_id || item?.equipo_id || "").trim();
  const directCode = String(item?.equipment_codigo || item?.equipo_codigo || item?.equipment_code || item?.codigo || "").trim();
  const catalogItem = equipmentCatalog.value.find((row) => {
    const rowId = String(row?.id || "").trim();
    const rowCode = String(row?.codigo || "").trim();
    return (equipmentId && rowId === equipmentId) || (directCode && rowCode.toUpperCase() === directCode.toUpperCase());
  });
  const code = String(catalogItem?.codigo || directCode).trim();
  const name = String(catalogItem?.nombre || item?.equipment_nombre || item?.equipo_nombre || item?.equipment_name || item?.nombre || "").trim();
  const model = String(catalogItem?.modelo || item?.equipment_modelo || item?.equipo_modelo || item?.equipment_model || item?.modelo || "").trim();
  if (!code && !name) return String(item?.equipment_label || equipmentId || "Sin equipo");
  if (!code) return model ? `${name} (${model})` : name;
  if (!name) return code;
  return model ? `${code} - ${name} (${model})` : `${code} - ${name}`;
}

function materialLabel(item: AnyRow) {
  const code = String(item?.producto_codigo || item?.codigo || "").trim();
  const name = String(item?.producto_nombre || item?.nombre || "Material sin nombre").trim();
  const description = String(item?.producto_descripcion || item?.descripcion || "").trim();
  const base = [code, name].filter(Boolean).join(" - ") || String(item?.material_label || "Material sin nombre");
  return description ? `${base} (${description})` : base;
}

function formatNumber(value: unknown, digits = 2) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("es-EC", { maximumFractionDigits: digits }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatCurrency(value: unknown) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatHours(value: unknown) {
  if (value === null || value === undefined || value === "") return "Sin registro";
  return `${formatNumber(value)} h`;
}

function formatTime(value: unknown) {
  if (!value) return "Sin registro";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatDateTime(value: unknown) {
  return value ? formatAppDateTime(value, "Sin registro") : "Sin registro";
}

async function loadWorkOrders() {
  const { data } = await api.get("/kpi_maintenance/work-orders", {
    params: { fecha_desde: selectedDate.value, fecha_hasta: selectedDate.value },
  });
  orders.value = asArray(data);
}

async function loadEquipmentCatalog() {
  const { data } = await api.get("/kpi_maintenance/equipos");
  equipmentCatalog.value = asArray(data);
}

async function loadMonthlyInventory() {
  inventoryLoading.value = true;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/inventario-mensual", {
      params: { fecha: selectedDate.value },
    });
    const payload = unwrap(data);
    inventoryRows.value = Array.isArray(payload?.inventory) ? payload.inventory : [];
  } finally {
    inventoryLoading.value = false;
  }
}

async function loadOilReport() {
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-aceite/kpi", {
    params: {
      periodo: "MENSUAL",
      reference_date: selectedDate.value,
      producto_id: selectedOilProductId.value || undefined,
    },
  });
  oilReport.value = unwrap(data);
  if (!selectedOilProductId.value && oilReport.value?.selected_product_id) {
    selectedOilProductId.value = String(oilReport.value.selected_product_id);
  }
}

async function loadReport() {
  if (!canAccess.value) return;
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([loadEquipmentCatalog(), loadWorkOrders(), loadMonthlyInventory(), loadOilReport()]);
  } catch (requestError: any) {
    error.value = requestError?.response?.data?.message || "No se pudo cargar el reporte detallado.";
  } finally {
    loading.value = false;
  }
}

function detailLines(rows: AnyRow[]) {
  return rows.flatMap((header) => {
    const details = header?.detalles || header?.details || header?.items || [];
    if (!Array.isArray(details) || !details.length) return [header];
    return details.map((detail: AnyRow) => ({ ...header, ...detail }));
  });
}

const responsibleRows = computed(() => {
  const rows = new Map<string, { key: string; label: string; hours: number }>();
  for (const task of detailTasks.value) {
    const responsibles = Array.isArray(task?.responsables) ? task.responsables : [];
    for (const responsible of responsibles) {
      const key = String(responsible?.user_id || responsible?.id || responsible?.username || responsible?.display_name || "SIN_USUARIO");
      const current = rows.get(key) ?? {
        key,
        label: String(responsible?.display_name || responsible?.nameSurname || responsible?.username || "Responsable"),
        hours: 0,
      };
      current.hours += Number(responsible?.horas || 0);
      rows.set(key, current);
    }
  }
  return [...rows.values()].sort((a, b) => b.hours - a.hours);
});

const totalResponsibleHours = computed(() => responsibleRows.value.reduce((sum, row) => sum + row.hours, 0));
const materialCost = computed(() => detailConsumptions.value.reduce((sum, row) => sum + Number(row?.subtotal || row?.subtotal_costo || 0), 0));

function isOil(row: AnyRow) {
  if (row?.es_aceite === true || row?.producto_es_aceite === true) return true;
  return /ACEITE|LUBRICANTE/.test(materialLabel(row).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase());
}

const oilConsumptionRows = computed(() => detailConsumptions.value.filter(isOil));
const orderOilQuantity = computed(() => oilConsumptionRows.value.reduce((sum, row) => sum + Number(row?.cantidad || 0), 0));
const orderOilCost = computed(() => oilConsumptionRows.value.reduce((sum, row) => sum + Number(row?.subtotal || row?.subtotal_costo || 0), 0));
const oilDelivered = computed(() => {
  const oilProductIds = new Set(oilConsumptionRows.value.map((row) => String(row?.producto_id || "")).filter(Boolean));
  return detailLines(detailIssues.value).some((row) => oilProductIds.has(String(row?.producto_id || "")) && Number(row?.cantidad || 0) > 0);
});

const materialRows = computed(() => {
  const rows = new Map<string, { key: string; label: string; delivered: number; scrapped: number }>();
  for (const item of detailLines(detailIssues.value)) {
    const key = String(item?.producto_id || materialLabel(item));
    const current = rows.get(key) ?? { key, label: materialLabel(item), delivered: 0, scrapped: 0 };
    current.delivered += Number(item?.cantidad || 0);
    rows.set(key, current);
  }
  for (const item of detailLines(detailScraps.value)) {
    const key = String(item?.producto_id || materialLabel(item));
    const current = rows.get(key) ?? { key, label: materialLabel(item), delivered: 0, scrapped: 0 };
    current.scrapped += Number(item?.cantidad || 0);
    rows.set(key, current);
  }
  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
});

const firstHistoryActor = computed(() => detailHistory.value[0]?.changed_by || null);
const lastHistoryActor = computed(() =>
  detailHistory.value[detailHistory.value.length - 1]?.changed_by || null,
);

async function safeGetList(url: string) {
  try {
    const { data } = await api.get(url);
    return asArray(data);
  } catch {
    return [];
  }
}

async function openOrderDetail(order: AnyRow) {
  selectedOrder.value = order;
  detailDialog.value = true;
  detailLoading.value = true;
  detailError.value = null;
  const id = String(order?.id || order?.work_order_id || "").trim();
  try {
    const [headerResponse, tasks, consumptions, issues, scraps, history] = await Promise.all([
      api.get(`/kpi_maintenance/work-orders/${id}`),
      safeGetList(`/kpi_maintenance/work-orders/${id}/tareas`),
      safeGetList(`/kpi_maintenance/work-orders/${id}/consumos`),
      safeGetList(`/kpi_maintenance/work-orders/${id}/issue-materials`),
      safeGetList(`/kpi_maintenance/work-orders/${id}/scrap-materials`),
      safeGetList(`/kpi_maintenance/work-orders/${id}/history`),
    ]);
    detailHeader.value = { ...order, ...(unwrap(headerResponse.data) || {}) };
    detailTasks.value = tasks;
    detailConsumptions.value = consumptions;
    detailIssues.value = issues;
    detailScraps.value = scraps;
    detailHistory.value = history;
  } catch (requestError: any) {
    detailError.value = requestError?.response?.data?.message || "No se pudo cargar el detalle de la orden.";
  } finally {
    detailLoading.value = false;
  }
}

onMounted(loadReport);
</script>

<style scoped>
.detailed-report {
  --manager-blue: 37, 99, 235;
  --manager-amber: 217, 119, 6;
  --manager-green: 22, 163, 74;
  display: grid;
  gap: 28px;
  max-width: 1500px;
  margin: 0 auto;
  color: rgb(var(--v-theme-on-surface));
}

.report-heading,
.simple-section,
.order-card,
.empty-panel {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background: rgb(var(--v-theme-surface));
}

.report-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(24px, 4vw, 40px);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(var(--manager-blue), 0.11), transparent 58%), rgb(var(--v-theme-surface));
}

.report-heading__eyebrow {
  margin-bottom: 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.report-heading h1,
.section-title-row h2 {
  margin: 0;
  letter-spacing: -0.025em;
}

.report-heading h1 { font-size: clamp(2rem, 4vw, 3rem); }
.report-heading p,
.section-title-row p { margin: 7px 0 0; color: rgba(var(--v-theme-on-surface), 0.68); font-size: 1rem; }

.report-heading__actions { display: flex; align-items: center; gap: 12px; }
.report-heading__actions :deep(.v-input) { min-width: 210px; }
.report-heading__actions .v-btn { min-height: 52px; }

.section-title-row { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
.section-title-row h2 { font-size: clamp(1.4rem, 2.5vw, 1.9rem); }
.order-search,
.oil-select { max-width: 360px; }

.status-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.status-button {
  --status-color: var(--manager-blue);
  display: grid;
  min-height: 132px;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border: 2px solid rgba(var(--status-color), 0.17);
  border-radius: 22px;
  color: rgb(var(--v-theme-on-surface));
  background: linear-gradient(145deg, rgba(var(--status-color), 0.09), transparent 72%), rgb(var(--v-theme-surface));
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.status-button:hover { transform: translateY(-2px); border-color: rgba(var(--status-color), 0.5); }
.status-button:focus-visible { outline: 4px solid rgba(var(--status-color), 0.25); outline-offset: 3px; }
.status-button--active { border-color: rgb(var(--status-color)); box-shadow: 0 12px 32px rgba(var(--status-color), 0.16); }
.status-button--planned { --status-color: var(--manager-blue); }
.status-button--open { --status-color: var(--manager-amber); }
.status-button--closed { --status-color: var(--manager-green); }
.status-button__copy { display: grid; gap: 5px; }
.status-button__copy strong { font-size: clamp(1rem, 2vw, 1.25rem); }
.status-button__copy span { color: rgba(var(--v-theme-on-surface), 0.62); font-size: 0.92rem; }
.status-button__count { font-size: clamp(2rem, 4vw, 3rem); font-weight: 850; }

.orders-list,
.orders-loading { display: grid; gap: 12px; margin-top: 16px; }
.order-card {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) minmax(420px, 2fr) auto;
  align-items: center;
  gap: 24px;
  width: 100%;
  min-height: 112px;
  padding: 20px 22px;
  border-radius: 18px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}
.order-card:hover,
.order-card:focus-visible { border-color: rgba(var(--manager-blue), 0.5); box-shadow: 0 10px 28px rgba(15, 23, 42, 0.09); outline: none; }
.order-card__code { color: rgb(var(--v-theme-primary)); font-size: 1rem; font-weight: 850; }
.order-card__title { margin-top: 3px; font-size: 1.08rem; font-weight: 750; }
.order-card__equipment { margin-top: 7px; color: rgba(var(--v-theme-on-surface), 0.7); font-size: 0.94rem; }
.order-card__facts { display: grid; grid-template-columns: repeat(4, minmax(92px, 1fr)); gap: 14px; }
.order-card__facts span { font-weight: 750; }
.order-card__facts small { display: block; margin-bottom: 4px; color: rgba(var(--v-theme-on-surface), 0.56); font-size: 0.75rem; font-weight: 650; }
.order-card__action { display: flex; align-items: center; gap: 4px; color: rgb(var(--v-theme-primary)); font-weight: 800; white-space: nowrap; }

.empty-panel { display: grid; min-height: 180px; place-items: center; align-content: center; gap: 10px; margin-top: 16px; border-radius: 20px; color: rgba(var(--v-theme-on-surface), 0.58); }
.simple-section { padding: clamp(22px, 3vw, 32px); border-radius: 24px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.metric-card { display: grid; align-content: start; min-height: 132px; padding: 20px; border: 1px solid rgba(var(--v-theme-on-surface), 0.09); border-radius: 18px; background: rgba(var(--manager-blue), 0.045); }
.metric-card span { color: rgba(var(--v-theme-on-surface), 0.62); font-weight: 650; }
.metric-card strong { margin-top: 10px; font-size: 1.25rem; line-height: 1.3; }
.metric-card small { margin-top: 7px; color: rgb(var(--v-theme-primary)); font-size: 0.9rem; font-weight: 750; }

.manager-table { overflow: hidden; border: 1px solid rgba(var(--v-theme-on-surface), 0.09); border-radius: 18px; }
.manager-table :deep(th) { height: 56px !important; font-size: 0.86rem !important; }
.manager-table :deep(td) { height: 58px !important; font-size: 0.95rem !important; }
.value-positive { color: rgb(var(--manager-green)); font-weight: 800; }
.value-negative { color: rgb(var(--manager-amber)); font-weight: 800; }
.empty-table { padding: 48px 16px; color: rgba(var(--v-theme-on-surface), 0.58); }

.detail-dialog { max-height: 90vh; }
.detail-dialog__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 24px 26px; white-space: normal; }
.detail-dialog__header > div { display: grid; gap: 3px; }
.detail-dialog__header span { color: rgb(var(--v-theme-primary)); font-size: 0.92rem; font-weight: 850; }
.detail-dialog__header strong { font-size: 1.35rem; }
.detail-dialog__header small { color: rgba(var(--v-theme-on-surface), 0.65); font-size: 0.92rem; }
.detail-dialog__body { display: grid; gap: 20px; padding: 24px 26px 30px; }
.detail-loading { display: flex; min-height: 260px; align-items: center; justify-content: center; gap: 14px; }
.detail-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.detail-summary article,
.oil-detail article { display: grid; gap: 7px; min-height: 92px; padding: 16px; border-radius: 16px; background: rgba(var(--manager-blue), 0.055); }
.detail-summary span,
.oil-detail span { color: rgba(var(--v-theme-on-surface), 0.62); font-size: 0.82rem; font-weight: 650; }
.detail-summary strong,
.oil-detail strong { font-size: 1.03rem; }
.detail-block { padding: 20px; border: 1px solid rgba(var(--v-theme-on-surface), 0.09); border-radius: 18px; }
.detail-block h3 { margin: 0 0 14px; font-size: 1.08rem; }
.responsible-list { display: grid; gap: 8px; }
.responsible-list > div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; border-radius: 12px; background: rgba(var(--v-theme-on-surface), 0.035); }
.material-list { display: grid; gap: 10px; }
.material-row { display: grid; grid-template-columns: minmax(260px, 1.5fr) 1fr 1fr auto; align-items: center; gap: 14px; padding: 14px; border-radius: 14px; background: rgba(var(--v-theme-on-surface), 0.035); }
.oil-detail { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.audit-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.audit-grid span { display: grid; gap: 5px; color: rgba(var(--v-theme-on-surface), 0.62); font-size: 0.82rem; }
.audit-grid strong { color: rgb(var(--v-theme-on-surface)); font-size: 0.96rem; }
.muted-empty { margin: 0; color: rgba(var(--v-theme-on-surface), 0.58); }

@media (prefers-reduced-motion: reduce) {
  .status-button,
  .order-card { transition: none; }
}

@media (max-width: 1100px) {
  .order-card { grid-template-columns: 1fr; gap: 16px; }
  .order-card__facts { grid-template-columns: repeat(4, 1fr); }
  .order-card__action { justify-self: end; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 760px) {
  .report-heading,
  .section-title-row { align-items: stretch; flex-direction: column; }
  .report-heading__actions { align-items: stretch; flex-direction: column; }
  .status-grid,
  .metric-grid,
  .detail-summary,
  .oil-detail,
  .audit-grid { grid-template-columns: 1fr; }
  .status-button { min-height: 116px; }
  .order-search,
  .oil-select { max-width: none; }
  .order-card__facts { grid-template-columns: repeat(2, 1fr); }
  .material-row { grid-template-columns: 1fr; }
}
</style>

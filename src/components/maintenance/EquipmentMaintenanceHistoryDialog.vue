<template>
  <v-dialog v-model="open" max-width="760" scrollable aria-labelledby="equipment-history-title">
    <v-card rounded="xl" class="enterprise-surface">
      <v-card-title id="equipment-history-title" class="text-wrap">
        Historial de mantenimiento
      </v-card-title>
      <v-card-subtitle class="text-wrap pb-3">{{ equipmentLabel }}</v-card-subtitle>

      <v-card-text>
        <section aria-labelledby="equipment-history-linked">
          <h3 id="equipment-history-linked" class="text-subtitle-1 font-weight-bold">
            Órdenes vinculadas a esta alerta
          </h3>
          <p v-if="!linkedOrders.length" class="text-body-2 text-medium-emphasis mt-1">
            La alerta no tiene una orden de trabajo vinculada.
          </p>
          <ul v-else class="order-list">
            <li v-for="order in linkedOrders" :key="order.id">
              <div>
                <div class="font-weight-bold">{{ order.code || order.label || "Orden de trabajo" }}</div>
                <div class="text-body-2">{{ statusLabel(order) }}</div>
                <div v-if="order.closed_at" class="text-body-2 text-medium-emphasis">
                  Cierre {{ formatDateOnly(order.closed_at) }}
                </div>
              </div>
              <v-btn
                color="primary"
                variant="tonal"
                size="small"
                :aria-label="`Ver orden vinculada ${order.code || order.label || ''}`"
                @click="openOrder(order.id)"
              >
                Ver orden
              </v-btn>
            </li>
          </ul>
        </section>

        <v-divider class="my-5" />

        <section aria-labelledby="equipment-history-orders">
          <h3 id="equipment-history-orders" class="text-subtitle-1 font-weight-bold">
            Mantenimientos del equipo
          </h3>
          <p v-if="loading" role="status" class="text-body-2 mt-3">Cargando mantenimientos…</p>
          <v-alert v-else-if="error" type="error" variant="tonal" class="mt-3">
            No se pudo cargar el historial del equipo.
            <v-btn variant="text" size="small" @click="reload++">Reintentar</v-btn>
          </v-alert>
          <p v-else-if="!history.length" class="text-body-2 text-medium-emphasis mt-1">
            No hay órdenes de mantenimiento registradas para este equipo.
          </p>
          <ul v-else class="order-list">
            <li v-for="order in visibleOrders" :key="order.id">
              <div>
                <div class="font-weight-bold">{{ order.code || "Orden de trabajo" }}</div>
                <div v-if="order.title" class="text-body-2">{{ order.title }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ kindLabel(order) }} · {{ statusLabel(order) }}
                  <template v-if="order.closed_at"> · Cierre {{ formatDateOnly(order.closed_at) }}</template>
                  <template v-else-if="order.started_at"> · Inicio {{ formatDateOnly(order.started_at) }}</template>
                  <template v-else-if="order.created_at"> · Creada {{ formatDateOnly(order.created_at) }}</template>
                </div>
              </div>
              <v-btn
                color="primary"
                variant="text"
                size="small"
                :aria-label="`Ver orden ${order.code || ''}`"
                @click="openOrder(order.id)"
              >
                Ver orden
              </v-btn>
            </li>
          </ul>
          <v-pagination
            v-if="pageCount > 1"
            v-model="page"
            :length="pageCount"
            :total-visible="4"
            density="comfortable"
            aria-label="Páginas del historial de mantenimiento"
          />
        </section>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="open = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <WorkOrderDetailDialog v-model="orderOpen" :work-order-id="orderId" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { useBranchScopeStore } from "@/app/stores/branch-scope.store";
import { formatDateOnly, parseAppDate } from "@/app/utils/date-time";
import WorkOrderDetailDialog from "@/components/maintenance/WorkOrderDetailDialog.vue";

type Order = {
  id: string;
  code?: string | null;
  title?: string | null;
  label?: string | null;
  status?: string | null;
  status_workflow?: string | null;
  maintenance_kind?: string | null;
  closed_at?: string | null;
  started_at?: string | null;
  created_at?: string | null;
  valor_json?: { annulment?: unknown; approval_action?: string };
};

const props = defineProps<{
  equipmentId: string;
  equipmentLabel: string;
  linked: Order[];
}>();
const open = defineModel<boolean>({ required: true });
const branchScope = useBranchScopeStore();
const orders = ref<Order[]>([]);
const loading = ref(false);
const error = ref(false);
const reload = ref(0);
const page = ref(1);
const pageSize = 8;
const orderOpen = ref(false);
const orderId = ref<string | null>(null);

const workflowLabels: Record<string, string> = {
  OPEN: "Abierta",
  PLANNED: "Planificada",
  IN_PROGRESS: "En proceso",
  REVIEW: "En revisión",
  BLOCKED: "Bloqueada",
  CLOSED: "Finalizada",
};

function statusLabel(order: Order) {
  const states = [order.status, order.status_workflow, order.valor_json?.approval_action];
  if (order.valor_json?.annulment || states.some(state => /^(ANULAD[AO]|CANCELAD[AO]|CANCELL?ED|VOID(ED)?)$/i.test(state || ""))) {
    return "Anulada";
  }
  return workflowLabels[order.status_workflow || ""] || "Sin estado";
}

function kindLabel(order: Order) {
  const kind = order.maintenance_kind?.trim();
  if (!kind) return "Tipo sin registrar";
  if (kind.toUpperCase() === "INSPECCION") return "Inspección";
  return kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase();
}

function orderDate(order: Order) {
  return parseAppDate(order.closed_at || order.started_at || order.created_at)?.getTime() ?? 0;
}

const linkedOrders = computed(() => {
  const ordersById = new Map(orders.value.map(order => [order.id, order]));
  return props.linked.map(link => ({ ...link, ...ordersById.get(link.id) }));
});

const history = computed(() => orders.value
  .filter(order => !["CEBADO", "SSA", "PROYECTO"].includes(order.maintenance_kind?.trim().toUpperCase() || ""))
  .sort((a, b) => orderDate(b) - orderDate(a)));
const pageCount = computed(() => Math.ceil(history.value.length / pageSize));
const visibleOrders = computed(() => history.value.slice((page.value - 1) * pageSize, page.value * pageSize));

function openOrder(id: string) {
  orderId.value = id;
  orderOpen.value = true;
}

watch(() => branchScope.selectedSucursalId, () => {
  orderOpen.value = false;
  open.value = false;
});

watch(
  [open, () => props.equipmentId, reload],
  async ([isOpen, equipmentId], _, onCleanup) => {
    orders.value = [];
    page.value = 1;
    error.value = false;
    loading.value = false;
    if (!isOpen || !equipmentId) return;

    const controller = new AbortController();
    onCleanup(() => controller.abort());
    loading.value = true;
    try {
      const { data } = await api.get("/kpi_maintenance/work-orders", {
        params: { equipo_id: equipmentId },
        signal: controller.signal,
      });
      if (!controller.signal.aborted) orders.value = data.data;
    } catch {
      if (!controller.signal.aborted) error.value = true;
    } finally {
      if (!controller.signal.aborted) loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.order-list {
  list-style: none;
  padding: 0;
}

.order-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.order-list li > div {
  flex: 1 1 220px;
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>

<template>
  <div class="alerts-page">
    <v-card rounded="xl" class="alerts-hero enterprise-surface">
      <div class="alerts-hero__glow alerts-hero__glow--one" />
      <div class="alerts-hero__glow alerts-hero__glow--two" />

      <div class="alerts-hero__content">
        <div class="alerts-hero__copy">
          <div class="alerts-hero__eyebrow">
            <span class="alerts-hero__pulse" />
            Centro de monitoreo operativo
          </div>
          <h1 class="alerts-hero__title">Alertas operativas</h1>
          <p class="alerts-hero__description">
            Prioriza novedades de mantenimiento, operación e inventario desde una sola bandeja.
          </p>
          <div class="alerts-hero__meta">
            <span>
              <v-icon icon="mdi-clock-outline" size="16" />
              {{ summaryUpdatedLabel }}
            </span>
            <span>
              <v-icon icon="mdi-filter-variant" size="16" />
              {{ filteredAlerts.length }} visibles
            </span>
          </div>
        </div>

        <div class="alerts-hero__actions">
          <v-chip
            label
            size="large"
            color="warning"
            variant="flat"
            prepend-icon="mdi-bell-ring-outline"
            class="alerts-hero__open-chip"
          >
            {{ summary.totals?.abiertas ?? 0 }} abiertas
          </v-chip>
          <v-btn
            color="primary"
            prepend-icon="mdi-refresh"
            :loading="refreshing"
            class="alerts-hero__refresh"
            @click="refreshData()"
          >
            Actualizar
          </v-btn>
        </div>
      </div>
    </v-card>

    <v-row dense class="alerts-kpi-grid">
      <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="3">
        <v-card
          rounded="xl"
          :class="[
            'alert-kpi-card',
            `alert-kpi-card--${card.tone}`,
            { 'alert-kpi-card--active': isKpiActive(card.key) },
          ]"
          role="button"
          tabindex="0"
          :aria-pressed="isKpiActive(card.key)"
          @click="applyKpiFilter(card.key)"
          @keydown.enter.prevent="applyKpiFilter(card.key)"
          @keydown.space.prevent="applyKpiFilter(card.key)"
        >
          <div class="alert-kpi-card__top">
            <div :class="['alert-kpi-card__icon', `alert-kpi-card__icon--${card.tone}`]">
              <v-icon :icon="card.icon" size="23" />
            </div>
            <v-icon
              :icon="isKpiActive(card.key) ? 'mdi-filter-check' : 'mdi-arrow-top-right'"
              size="19"
              class="alert-kpi-card__arrow"
            />
          </div>
          <div class="alert-kpi-card__value">{{ card.value }}</div>
          <div class="alert-kpi-card__label">{{ card.label }}</div>
          <div class="alert-kpi-card__helper">{{ card.helper }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="xl" class="alerts-toolbar enterprise-surface">
      <div class="alerts-toolbar__heading">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Filtrar bandeja</div>
          <div class="text-caption text-medium-emphasis">
            Combina los criterios para encontrar una alerta específica.
          </div>
        </div>
        <div class="alerts-toolbar__heading-actions">
          <v-chip v-if="activeFilterCount" size="small" color="primary" variant="tonal" label>
            {{ activeFilterCount }} {{ activeFilterCount === 1 ? "filtro activo" : "filtros activos" }}
          </v-chip>
          <v-btn
            v-if="activeFilterCount"
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-filter-off-outline"
            @click="clearFilters"
          >
            Limpiar
          </v-btn>
        </div>
      </div>

      <div class="alerts-filter-grid">
        <v-text-field
          v-model="filters.search"
          label="Buscar alerta"
          placeholder="Material, equipo, referencia u OT"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          class="alerts-filter-grid__search"
        />
        <v-select
          v-model="filters.estado"
          :items="stateOptions"
          label="Estado"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <v-select
          v-model="filters.nivel"
          :items="levelOptions"
          label="Prioridad"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <v-select
          v-model="filters.categoria"
          :items="categoryOptions"
          label="Categoría"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <v-select
          v-model="filters.origen"
          :items="originOptions"
          label="Origen"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </div>
    </v-card>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      rounded="lg"
      class="mb-4"
      :text="error"
    />

    <v-row dense class="alerts-content-grid">
      <v-col cols="12" xl="9">
        <section class="alerts-feed" aria-labelledby="alerts-feed-title">
          <div class="alerts-feed__header">
            <div>
              <h2 id="alerts-feed-title" class="alerts-feed__title">Bandeja de alertas</h2>
              <p class="alerts-feed__subtitle">
                {{ resultsLabel }}
              </p>
            </div>
            <v-select
              v-model="itemsPerPage"
              :items="pageSizeOptions"
              label="Por página"
              variant="outlined"
              density="compact"
              hide-details
              class="alerts-feed__page-size"
            />
          </div>

          <v-progress-linear
            v-if="loading"
            indeterminate
            color="primary"
            rounded
            class="mb-3"
          />

          <div v-if="loading" class="alerts-list">
            <v-skeleton-loader
              v-for="index in 4"
              :key="index"
              type="article, actions"
              class="alert-skeleton"
            />
          </div>

          <div v-else-if="paginatedAlerts.length" class="alerts-list">
            <article
              v-for="(alert, index) in paginatedAlerts"
              :key="alertKey(alert, index)"
              :class="['alert-card', `alert-card--${levelTone(alert.nivel)}`]"
            >
              <div class="alert-card__accent" />
              <div class="alert-card__body">
                <div class="alert-card__header">
                  <div :class="['alert-card__severity-icon', `alert-card__severity-icon--${levelTone(alert.nivel)}`]">
                    <v-icon :icon="levelIcon(alert.nivel)" size="25" />
                  </div>

                  <div class="alert-card__headline">
                    <div class="alert-card__overline">
                      <span>{{ formatTaxonomy(alert.categoria, "Sin categoría") }}</span>
                      <span class="alert-card__overline-dot" />
                      <span>{{ formatTaxonomy(alert.origen, "Sistema") }}</span>
                    </div>
                    <h3 class="alert-card__title">{{ alertTitle(alert) }}</h3>
                    <p class="alert-card__summary">{{ alertSummary(alert) }}</p>
                  </div>

                  <div class="alert-card__badges">
                    <v-chip
                      size="small"
                      label
                      :color="levelColor(alert.nivel)"
                      variant="tonal"
                      :prepend-icon="levelIcon(alert.nivel)"
                    >
                      {{ levelLabel(alert.nivel) }}
                    </v-chip>
                    <v-chip
                      size="small"
                      label
                      :color="stateColor(alert.estado)"
                      variant="tonal"
                    >
                      {{ stateLabel(alert.estado) }}
                    </v-chip>
                  </div>
                </div>

                <div class="alert-card__facts">
                  <div class="alert-fact">
                    <v-icon icon="mdi-map-marker-radius-outline" size="19" />
                    <div>
                      <span class="alert-fact__label">Ámbito</span>
                      <strong>{{ alertScope(alert) }}</strong>
                    </div>
                  </div>
                  <div class="alert-fact">
                    <v-icon icon="mdi-link-variant" size="19" />
                    <div>
                      <span class="alert-fact__label">Referencia</span>
                      <strong>{{ displayText(alert.referencia_resuelta, "Sin referencia") }}</strong>
                    </div>
                  </div>
                  <div class="alert-fact">
                    <v-icon icon="mdi-calendar-clock-outline" size="19" />
                    <div>
                      <span class="alert-fact__label">Generada</span>
                      <strong>{{ formatDate(alert.fecha_generada) }}</strong>
                      <span class="alert-fact__secondary">{{ formatRelativeDate(alert.fecha_generada) }}</span>
                    </div>
                  </div>
                  <div class="alert-fact">
                    <v-icon icon="mdi-clipboard-text-clock-outline" size="19" />
                    <div>
                      <span class="alert-fact__label">Orden de trabajo</span>
                      <strong>{{ workOrderSummary(alert) }}</strong>
                      <span v-if="alert.work_order_status" class="alert-fact__secondary">
                        {{ formatTaxonomy(alert.work_order_status, "Sin estado") }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="alert.accion_sugerida" class="alert-card__recommendation">
                  <div class="alert-card__recommendation-icon">
                    <v-icon icon="mdi-lightbulb-on-outline" size="20" />
                  </div>
                  <div>
                    <span>Acción recomendada</span>
                    <p>{{ displayText(alert.accion_sugerida) }}</p>
                  </div>
                </div>

                <v-expand-transition>
                  <div v-if="isAlertExpanded(alert, index)" class="alert-card__details">
                    <div v-if="workOrderItems(alert).length" class="alert-detail-section">
                      <div class="alert-detail-section__heading">
                        <v-icon icon="mdi-clipboard-check-outline" size="20" />
                        <div>
                          <strong>Órdenes de trabajo vinculadas</strong>
                          <span>{{ workOrderItems(alert).length }} en esta alerta</span>
                        </div>
                      </div>
                      <div class="alert-work-orders">
                        <div
                          v-for="workOrder in workOrderItems(alert)"
                          :key="workOrder.id || workOrder.label"
                          class="alert-work-order"
                        >
                          <v-icon icon="mdi-wrench-clock-outline" size="18" />
                          <div>
                            <strong>{{ displayText(workOrder.label, "Orden de trabajo") }}</strong>
                            <span>{{ formatTaxonomy(workOrder.status_workflow, "Sin estado") }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="inventoryAlertItems(alert).length" class="alert-detail-section">
                      <div class="alert-detail-section__heading">
                        <v-icon icon="mdi-package-variant-closed-alert" size="20" />
                        <div>
                          <strong>Materiales con stock comprometido</strong>
                          <span>{{ inventoryAlertItems(alert).length }} materiales detectados</span>
                        </div>
                      </div>
                      <div class="inventory-alert-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Material</th>
                              <th>Bodega</th>
                              <th class="text-right">Total</th>
                              <th class="text-right">Crítico</th>
                              <th class="text-right">Disponible</th>
                              <th class="text-right">Mínimo</th>
                              <th>Observación</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="inventoryItem in inventoryAlertItems(alert)"
                              :key="String(inventoryItem.stock_id || inventoryItem.producto_id || inventoryItem.producto_label)"
                            >
                              <td>
                                <strong>{{ displayText(inventoryItem.producto_label, "-") }}</strong>
                              </td>
                              <td>{{ displayText(inventoryItem.bodega_label, "-") }}</td>
                              <td class="text-right">{{ formatInventoryNumber(inventoryItem.stock_actual) }}</td>
                              <td class="text-right">{{ formatInventoryNumber(inventoryItem.stock_critico) }}</td>
                              <td class="text-right font-weight-bold">
                                {{ formatInventoryNumber(inventoryAvailableStock(inventoryItem)) }}
                              </td>
                              <td class="text-right">{{ formatInventoryNumber(inventoryItem.stock_min_bodega) }}</td>
                              <td>{{ displayText(inventoryItem.observacion, "-") }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div v-if="alert.detalle" class="alert-detail-section alert-detail-section--plain">
                      <span class="alert-detail-section__plain-label">Detalle registrado</span>
                      <p>{{ displayText(alert.detalle) }}</p>
                    </div>
                  </div>
                </v-expand-transition>

                <div class="alert-card__footer">
                  <div class="alert-card__identity">
                    <v-icon icon="mdi-identifier" size="17" />
                    {{ shortAlertId(alert) }}
                  </div>
                  <v-btn
                    v-if="hasAlertDetails(alert)"
                    variant="text"
                    color="primary"
                    size="small"
                    :append-icon="isAlertExpanded(alert, index) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    @click="toggleAlertDetails(alert, index)"
                  >
                    {{ isAlertExpanded(alert, index) ? "Ocultar detalle" : "Ver detalle" }}
                  </v-btn>
                </div>
              </div>
            </article>
          </div>

          <v-card v-else rounded="xl" variant="outlined" class="alerts-empty">
            <div class="alerts-empty__icon">
              <v-icon :icon="activeFilterCount ? 'mdi-filter-check-outline' : 'mdi-bell-check-outline'" size="36" />
            </div>
            <div class="text-h6 font-weight-bold">
              {{ activeFilterCount ? "Sin coincidencias" : "Todo está bajo control" }}
            </div>
            <p class="text-body-2 text-medium-emphasis">
              {{
                activeFilterCount
                  ? "No hay alertas que coincidan con los filtros seleccionados."
                  : "No hay alertas operativas registradas en este momento."
              }}
            </p>
            <v-btn
              v-if="activeFilterCount"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-filter-off-outline"
              @click="clearFilters"
            >
              Limpiar filtros
            </v-btn>
          </v-card>

          <div v-if="!loading && filteredAlerts.length" class="alerts-pagination">
            <div class="text-caption text-medium-emphasis">
              Mostrando {{ visibleRangeStart }}-{{ visibleRangeEnd }} de {{ filteredAlerts.length }} alertas
            </div>
            <v-pagination
              v-if="totalPages > 1"
              v-model="currentPage"
              :length="totalPages"
              :total-visible="6"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </section>
      </v-col>

      <v-col cols="12" xl="3">
        <aside class="alerts-insights">
          <v-card rounded="xl" class="alerts-insight-card enterprise-surface">
            <div class="alerts-insight-card__header">
              <div class="alerts-insight-card__icon">
                <v-icon icon="mdi-shape-outline" size="21" />
              </div>
              <div>
                <div class="text-subtitle-2 font-weight-bold">Por categoría</div>
                <div class="text-caption text-medium-emphasis">Distribución operativa</div>
              </div>
            </div>

            <button
              v-for="item in summary.by_category ?? []"
              :key="item.categoria"
              type="button"
              :class="[
                'alert-bucket',
                { 'alert-bucket--active': filters.categoria === String(item.categoria) },
              ]"
              @click="toggleBucketFilter('categoria', String(item.categoria))"
            >
              <span class="alert-bucket__row">
                <span>{{ formatTaxonomy(item.categoria, "Sin categoría") }}</span>
                <strong>{{ item.total }}</strong>
              </span>
              <span class="alert-bucket__track">
                <span
                  class="alert-bucket__fill"
                  :style="{ width: `${bucketPercentage(item.total)}%` }"
                />
              </span>
            </button>

            <div v-if="!(summary.by_category ?? []).length" class="alerts-insight-card__empty">
              Sin datos por categoría.
            </div>
          </v-card>

          <v-card rounded="xl" class="alerts-insight-card enterprise-surface">
            <div class="alerts-insight-card__header">
              <div class="alerts-insight-card__icon alerts-insight-card__icon--secondary">
                <v-icon icon="mdi-source-branch" size="21" />
              </div>
              <div>
                <div class="text-subtitle-2 font-weight-bold">Por origen</div>
                <div class="text-caption text-medium-emphasis">Fuente de generación</div>
              </div>
            </div>

            <button
              v-for="item in summary.by_origin ?? []"
              :key="item.origen"
              type="button"
              :class="[
                'alert-bucket',
                'alert-bucket--secondary',
                { 'alert-bucket--active': filters.origen === String(item.origen) },
              ]"
              @click="toggleBucketFilter('origen', String(item.origen))"
            >
              <span class="alert-bucket__row">
                <span>{{ formatTaxonomy(item.origen, "Sistema") }}</span>
                <strong>{{ item.total }}</strong>
              </span>
              <span class="alert-bucket__track">
                <span
                  class="alert-bucket__fill"
                  :style="{ width: `${bucketPercentage(item.total)}%` }"
                />
              </span>
            </button>

            <div v-if="!(summary.by_origin ?? []).length" class="alerts-insight-card__empty">
              Sin datos por origen.
            </div>
          </v-card>

          <v-card rounded="xl" class="alerts-insight-card alerts-insight-card--management enterprise-surface">
            <div class="alerts-insight-card__header">
              <div class="alerts-insight-card__icon alerts-insight-card__icon--neutral">
                <v-icon icon="mdi-shield-check-outline" size="21" />
              </div>
              <div>
                <div class="text-subtitle-2 font-weight-bold">Gestión de alertas</div>
                <div class="text-caption text-medium-emphasis">Acciones administrativas</div>
              </div>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-3">
              La eliminación masiva borra el historial completo y requiere confirmación.
            </p>
            <MassPurgeButton
              endpoint="/kpi_maintenance/alertas/purge-all"
              module-title="Alertas operativas"
              @purged="refreshData"
            />
          </v-card>
        </aside>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { formatDateTime } from "@/app/utils/date-time";
import MassPurgeButton from "@/components/common/MassPurgeButton.vue";

type AlertRow = Record<string, any>;
type SelectOption = { title: string; value: string };
type BucketFilter = "categoria" | "origen";

const ALL_FILTER = "TODOS";
const ui = useUiStore();

const loading = ref(false);
const refreshing = ref(false);
const error = ref<string | null>(null);
const alerts = ref<AlertRow[]>([]);
const currentPage = ref(1);
const itemsPerPage = ref(10);
const expandedAlertKeys = ref<string[]>([]);
const summary = ref<Record<string, any>>({
  generated_at: null,
  totals: {
    total: 0,
    abiertas: 0,
    en_proceso: 0,
    resueltas: 0,
    cerradas: 0,
    critical: 0,
    warning: 0,
    info: 0,
  },
  by_category: [],
  by_origin: [],
});

const filters = reactive({
  search: "",
  estado: ALL_FILTER,
  nivel: ALL_FILTER,
  categoria: ALL_FILTER,
  origen: ALL_FILTER,
});

const stateOptions: SelectOption[] = [
  { title: "Todos los estados", value: ALL_FILTER },
  { title: "Abierta", value: "ABIERTA" },
  { title: "En proceso", value: "EN_PROCESO" },
  { title: "Resuelta", value: "RESUELTA" },
  { title: "Cerrada", value: "CERRADA" },
  { title: "Resueltas y cerradas", value: "ATENDIDAS" },
];

const levelOptions: SelectOption[] = [
  { title: "Todas las prioridades", value: ALL_FILTER },
  { title: "Crítica", value: "CRITICAL" },
  { title: "Preventiva", value: "WARNING" },
  { title: "Informativa", value: "INFO" },
];

const pageSizeOptions = [10, 20, 30];

function normalizeBucketOptions(items: any[], key: string, allLabel: string) {
  const options: SelectOption[] = [{ title: allLabel, value: ALL_FILTER }];
  for (const item of items) {
    const value = String(item?.[key] || "").trim();
    if (!value || options.some((option) => option.value === value)) continue;
    options.push({ title: formatTaxonomy(value), value });
  }
  return options;
}

const categoryOptions = computed(() =>
  normalizeBucketOptions(summary.value.by_category ?? [], "categoria", "Todas las categorías"),
);

const originOptions = computed(() =>
  normalizeBucketOptions(summary.value.by_origin ?? [], "origen", "Todos los orígenes"),
);

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function displayText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã/g, "Á")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Í")
    .replace(/Ã“/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã‘/g, "Ñ")
    .replace(/Â·/g, "·")
    .replace(/\s+\?\s+/g, " · ");
}

function formatTaxonomy(value: unknown, fallback = "") {
  const text = displayText(value, fallback).replace(/_/g, " ").toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : fallback;
}

function inventoryAlertItems(item: any) {
  const payload = item?.payload_json;
  return Array.isArray(payload?.inventory_items) ? payload.inventory_items : [];
}

function workOrderItems(item: any) {
  if (Array.isArray(item?.work_orders) && item.work_orders.length) return item.work_orders;
  if (!item?.work_order_title) return [];
  return [
    {
      id: item.work_order_id || item.work_order_title,
      label: item.work_order_title,
      status_workflow: item.work_order_status,
    },
  ];
}

function inventoryAvailableStock(item: any) {
  const explicit = Number(item?.stock_disponible_minimo);
  if (Number.isFinite(explicit)) return explicit;
  return Math.max(Number(item?.stock_actual || 0) - Number(item?.stock_critico || 0), 0);
}

function normalizeValue(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function levelTone(level: unknown) {
  const normalized = normalizeValue(level);
  if (normalized === "CRITICAL") return "critical";
  if (normalized === "WARNING") return "warning";
  return "info";
}

function levelColor(level: unknown) {
  const normalized = normalizeValue(level);
  if (normalized === "CRITICAL") return "error";
  if (normalized === "WARNING") return "warning";
  return "info";
}

function levelIcon(level: unknown) {
  const normalized = normalizeValue(level);
  if (normalized === "CRITICAL") return "mdi-alert-octagon-outline";
  if (normalized === "WARNING") return "mdi-alert-outline";
  return "mdi-information-outline";
}

function levelLabel(level: unknown) {
  const normalized = normalizeValue(level);
  if (normalized === "CRITICAL") return "Crítica";
  if (normalized === "WARNING") return "Preventiva";
  return "Informativa";
}

function stateColor(state: unknown) {
  const normalized = normalizeValue(state);
  if (normalized === "ABIERTA") return "error";
  if (normalized === "EN_PROCESO") return "warning";
  if (normalized === "RESUELTA" || normalized === "CERRADA") return "success";
  return "secondary";
}

function stateLabel(state: unknown) {
  return formatTaxonomy(state, "Sin estado");
}

function alertTitle(item: AlertRow) {
  return displayText(item?.title || item?.tipo_alerta, "Alerta operativa");
}

function alertSummary(item: AlertRow) {
  return displayText(item?.subtitle || item?.detalle, "Revisa la información asociada a esta alerta.");
}

function alertScope(item: AlertRow) {
  return displayText(item?.equipo_label || item?.referencia_resuelta, "Ámbito general");
}

function workOrderSummary(item: AlertRow) {
  const count = Number(item?.work_order_count || workOrderItems(item).length || 0);
  if (count > 1) return `${count} órdenes vinculadas`;
  return displayText(item?.work_order_title, count === 1 ? "1 orden vinculada" : "Sin OT vinculada");
}

function shortAlertId(item: AlertRow) {
  const id = String(item?.id || item?.alerta_id || "").trim();
  return id ? `Alerta ${id.slice(0, 8).toUpperCase()}` : "Alerta operativa";
}

function alertKey(item: AlertRow, index: number) {
  return String(item?.id || item?.alerta_id || `${item?.tipo_alerta || "alerta"}-${index}`);
}

function hasAlertDetails(item: AlertRow) {
  return Boolean(inventoryAlertItems(item).length || workOrderItems(item).length || item?.detalle);
}

function isAlertExpanded(item: AlertRow, index: number) {
  return expandedAlertKeys.value.includes(alertKey(item, index));
}

function toggleAlertDetails(item: AlertRow, index: number) {
  const key = alertKey(item, index);
  expandedAlertKeys.value = expandedAlertKeys.value.includes(key)
    ? expandedAlertKeys.value.filter((itemKey) => itemKey !== key)
    : [...expandedAlertKeys.value, key];
}

function formatDate(value: unknown) {
  if (!value) return "Sin fecha";
  return formatDateTime(value, "Sin fecha");
}

function formatRelativeDate(value: unknown) {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return "";
  const difference = Date.now() - parsed.getTime();
  const minutes = Math.max(Math.floor(difference / 60000), 0);
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  return "Histórica";
}

function formatInventoryNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(parsed)
    : "0";
}

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const [alertsRes, summaryRes] = await Promise.all([
      listAllPages("/kpi_maintenance/alertas"),
      api.get("/kpi_maintenance/alertas/summary"),
    ]);
    alerts.value = asArray(alertsRes);
    summary.value = (summaryRes.data?.data ?? summaryRes.data ?? summary.value) as Record<string, any>;
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar las alertas operativas.";
  } finally {
    loading.value = false;
  }
}

async function refreshData() {
  refreshing.value = true;
  try {
    await loadData();
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo actualizar la vista de alertas.";
    ui.error(error.value ?? "No se pudo actualizar la vista de alertas.");
  } finally {
    refreshing.value = false;
  }
}

const filteredAlerts = computed(() => {
  const search = filters.search.trim().toLowerCase();

  return alerts.value.filter((item) => {
    const estado = normalizeValue(item?.estado);
    const nivel = normalizeValue(item?.nivel);
    const categoria = normalizeValue(item?.categoria);
    const origen = normalizeValue(item?.origen);
    const matchesSearch = !search || JSON.stringify(item).toLowerCase().includes(search);
    const matchesState =
      filters.estado === ALL_FILTER ||
      estado === filters.estado ||
      (filters.estado === "ATENDIDAS" && ["RESUELTA", "CERRADA"].includes(estado));

    return (
      matchesSearch &&
      matchesState &&
      (filters.nivel === ALL_FILTER || nivel === filters.nivel) &&
      (filters.categoria === ALL_FILTER || categoria === normalizeValue(filters.categoria)) &&
      (filters.origen === ALL_FILTER || origen === normalizeValue(filters.origen))
    );
  });
});

const totalPages = computed(() => Math.max(Math.ceil(filteredAlerts.value.length / itemsPerPage.value), 1));

const paginatedAlerts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredAlerts.value.slice(start, start + itemsPerPage.value);
});

const visibleRangeStart = computed(() =>
  filteredAlerts.value.length ? (currentPage.value - 1) * itemsPerPage.value + 1 : 0,
);

const visibleRangeEnd = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, filteredAlerts.value.length),
);

const activeFilterCount = computed(
  () =>
    Number(Boolean(filters.search.trim())) +
    [filters.estado, filters.nivel, filters.categoria, filters.origen].filter(
      (value) => value !== ALL_FILTER,
    ).length,
);

const resultsLabel = computed(() => {
  const count = filteredAlerts.value.length;
  if (!count) return "No hay alertas para los criterios seleccionados.";
  return `${count} ${count === 1 ? "alerta encontrada" : "alertas encontradas"}, ordenadas por prioridad.`;
});

const summaryUpdatedLabel = computed(() => {
  if (!summary.value.generated_at) return "Resumen pendiente de actualización";
  return `Actualizado ${formatRelativeDate(summary.value.generated_at).toLowerCase()}`;
});

const kpiCards = computed(() => [
  {
    key: "open",
    label: "Abiertas",
    value: summary.value.totals?.abiertas ?? 0,
    helper: "Requieren atención inmediata",
    icon: "mdi-bell-alert-outline",
    tone: "danger",
  },
  {
    key: "critical",
    label: "Críticas",
    value: summary.value.totals?.critical ?? 0,
    helper: "Riesgo alto para la operación",
    icon: "mdi-alert-octagon-outline",
    tone: "critical",
  },
  {
    key: "inprogress",
    label: "En proceso",
    value: summary.value.totals?.en_proceso ?? 0,
    helper: "Ya cuentan con seguimiento",
    icon: "mdi-progress-wrench",
    tone: "warning",
  },
  {
    key: "resolved",
    label: "Atendidas",
    value: (summary.value.totals?.resueltas ?? 0) + (summary.value.totals?.cerradas ?? 0),
    helper: "Resueltas o cerradas",
    icon: "mdi-check-decagram-outline",
    tone: "success",
  },
]);

function isKpiActive(key: string) {
  if (key === "open") return filters.estado === "ABIERTA";
  if (key === "critical") return filters.nivel === "CRITICAL";
  if (key === "inprogress") return filters.estado === "EN_PROCESO";
  if (key === "resolved") return filters.estado === "ATENDIDAS";
  return false;
}

function applyKpiFilter(key: string) {
  const wasActive = isKpiActive(key);
  filters.estado = ALL_FILTER;
  filters.nivel = ALL_FILTER;
  if (wasActive) return;
  if (key === "open") filters.estado = "ABIERTA";
  if (key === "critical") filters.nivel = "CRITICAL";
  if (key === "inprogress") filters.estado = "EN_PROCESO";
  if (key === "resolved") filters.estado = "ATENDIDAS";
}

function clearFilters() {
  filters.search = "";
  filters.estado = ALL_FILTER;
  filters.nivel = ALL_FILTER;
  filters.categoria = ALL_FILTER;
  filters.origen = ALL_FILTER;
}

function toggleBucketFilter(key: BucketFilter, value: string) {
  filters[key] = filters[key] === value ? ALL_FILTER : value;
}

function bucketPercentage(value: unknown) {
  const total = Math.max(Number(summary.value.totals?.total || 0), 1);
  return Math.max(Math.min((Number(value || 0) / total) * 100, 100), 4);
}

watch(
  [
    () => filters.search,
    () => filters.estado,
    () => filters.nivel,
    () => filters.categoria,
    () => filters.origen,
    itemsPerPage,
  ],
  () => {
    currentPage.value = 1;
    expandedAlertKeys.value = [];
  },
);

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages;
});

onMounted(async () => {
  await refreshData();
});
</script>

<style scoped>
.alerts-page {
  --alert-danger: 211, 69, 69;
  --alert-critical: 191, 52, 80;
  --alert-warning: 224, 151, 39;
  --alert-success: 40, 151, 103;
  --alert-info: 52, 126, 191;
  display: grid;
  gap: 16px;
}

.alerts-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 188px;
  padding: 30px;
  background:
    linear-gradient(118deg, color-mix(in srgb, rgb(var(--v-theme-primary)) 17%, var(--surface-base)), var(--surface-base) 68%),
    var(--surface-base);
}

.alerts-hero::after {
  position: absolute;
  z-index: -1;
  right: -46px;
  bottom: -86px;
  width: 260px;
  height: 260px;
  border: 44px solid rgba(var(--v-theme-primary), 0.07);
  border-radius: 50%;
  content: "";
}

.alerts-hero__glow {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  filter: blur(2px);
  pointer-events: none;
}

.alerts-hero__glow--one {
  top: -110px;
  left: 32%;
  width: 270px;
  height: 270px;
  background: rgba(var(--v-theme-primary), 0.12);
}

.alerts-hero__glow--two {
  right: 12%;
  bottom: -115px;
  width: 230px;
  height: 230px;
  background: rgba(var(--v-theme-secondary), 0.1);
}

.alerts-hero__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  min-height: 126px;
}

.alerts-hero__copy {
  max-width: 720px;
}

.alerts-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.alerts-hero__pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
  box-shadow: 0 0 0 6px rgba(var(--v-theme-success), 0.13);
  animation: alert-pulse 2.2s ease-out infinite;
}

.alerts-hero__title {
  margin: 0;
  font-size: clamp(1.7rem, 3vw, 2.45rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.alerts-hero__description {
  max-width: 650px;
  margin: 10px 0 14px;
  color: var(--app-muted-text);
  font-size: 0.98rem;
}

.alerts-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  color: var(--app-muted-text);
  font-size: 0.78rem;
}

.alerts-hero__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.alerts-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.alerts-hero__open-chip {
  box-shadow: 0 8px 22px rgba(var(--alert-warning), 0.2);
}

.alerts-hero__refresh {
  min-height: 42px;
  box-shadow: 0 10px 24px rgba(var(--v-theme-primary), 0.2);
}

.alerts-kpi-grid {
  margin-top: -4px;
}

.alert-kpi-card {
  position: relative;
  overflow: hidden;
  height: 100%;
  min-height: 168px;
  padding: 19px;
  border: 1px solid var(--surface-border);
  background: var(--surface-base);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.alert-kpi-card::after {
  position: absolute;
  right: -34px;
  bottom: -42px;
  width: 126px;
  height: 126px;
  border-radius: 50%;
  background: rgba(var(--kpi-color), 0.08);
  content: "";
}

.alert-kpi-card:hover,
.alert-kpi-card:focus-visible,
.alert-kpi-card--active {
  transform: translateY(-3px);
  border-color: rgba(var(--kpi-color), 0.42);
  box-shadow: 0 17px 34px rgba(var(--kpi-color), 0.13);
  outline: none;
}

.alert-kpi-card--active {
  background:
    linear-gradient(145deg, rgba(var(--kpi-color), 0.13), transparent 74%),
    var(--surface-base);
}

.alert-kpi-card--danger { --kpi-color: var(--alert-danger); }
.alert-kpi-card--critical { --kpi-color: var(--alert-critical); }
.alert-kpi-card--warning { --kpi-color: var(--alert-warning); }
.alert-kpi-card--success { --kpi-color: var(--alert-success); }

.alert-kpi-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.alert-kpi-card__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  color: rgb(var(--kpi-color));
  background: rgba(var(--kpi-color), 0.12);
}

.alert-kpi-card__arrow {
  color: rgba(var(--v-theme-on-surface), 0.42);
}

.alert-kpi-card__value {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
}

.alert-kpi-card__label {
  position: relative;
  z-index: 1;
  margin-top: 7px;
  font-size: 0.94rem;
  font-weight: 750;
}

.alert-kpi-card__helper {
  position: relative;
  z-index: 1;
  margin-top: 3px;
  color: var(--app-muted-text);
  font-size: 0.76rem;
}

.alerts-toolbar {
  padding: 20px;
}

.alerts-toolbar__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.alerts-toolbar__heading-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.alerts-filter-grid {
  display: grid;
  grid-template-columns: minmax(280px, 1.7fr) repeat(4, minmax(150px, 1fr));
  gap: 12px;
}

.alerts-content-grid {
  align-items: start;
}

.alerts-feed {
  min-width: 0;
}

.alerts-feed__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 2px 2px 14px;
}

.alerts-feed__title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
}

.alerts-feed__subtitle {
  margin: 3px 0 0;
  color: var(--app-muted-text);
  font-size: 0.8rem;
}

.alerts-feed__page-size {
  max-width: 140px;
}

.alerts-list {
  display: grid;
  gap: 13px;
}

.alert-skeleton {
  overflow: hidden;
  border: 1px solid var(--surface-border);
  border-radius: 20px;
  background: var(--surface-base);
}

.alert-card {
  --level-color: var(--alert-info);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--surface-border);
  border-radius: 20px;
  background:
    linear-gradient(112deg, rgba(var(--level-color), 0.055), transparent 32%),
    var(--surface-base);
  box-shadow: 0 10px 27px rgba(15, 23, 42, 0.07);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.alert-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--level-color), 0.28);
  box-shadow: 0 15px 34px rgba(15, 23, 42, 0.1);
}

.alert-card--critical { --level-color: var(--alert-critical); }
.alert-card--warning { --level-color: var(--alert-warning); }
.alert-card--info { --level-color: var(--alert-info); }

.alert-card__accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: rgb(var(--level-color));
}

.alert-card__body {
  padding: 20px 20px 13px 24px;
}

.alert-card__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
}

.alert-card__severity-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 15px;
  color: rgb(var(--level-color));
  background: rgba(var(--level-color), 0.11);
}

.alert-card__headline {
  min-width: 0;
}

.alert-card__overline {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  color: rgb(var(--level-color));
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.alert-card__overline-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.65;
}

.alert-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.35;
}

.alert-card__summary {
  margin: 5px 0 0;
  color: var(--app-muted-text);
  font-size: 0.82rem;
  line-height: 1.48;
}

.alert-card__badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
}

.alert-card__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  margin-top: 17px;
}

.alert-fact {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
  padding: 11px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.075);
  border-radius: 13px;
  background: color-mix(in srgb, var(--surface-soft) 76%, transparent);
}

.alert-fact > .v-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: rgb(var(--v-theme-primary));
}

.alert-fact > div {
  display: grid;
  min-width: 0;
}

.alert-fact__label,
.alert-fact__secondary {
  color: var(--app-muted-text);
  font-size: 0.67rem;
}

.alert-fact strong {
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1.35;
  text-overflow: ellipsis;
}

.alert-card__recommendation {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 11px;
  padding: 11px 13px;
  border: 1px solid rgba(var(--v-theme-primary), 0.13);
  border-radius: 13px;
  background: rgba(var(--v-theme-primary), 0.055);
}

.alert-card__recommendation-icon {
  display: grid;
  flex: 0 0 auto;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 10px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.11);
}

.alert-card__recommendation span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.alert-card__recommendation p {
  margin: 1px 0 0;
  font-size: 0.77rem;
  line-height: 1.45;
}

.alert-card__details {
  display: grid;
  gap: 12px;
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px dashed rgba(var(--v-theme-on-surface), 0.12);
}

.alert-detail-section {
  padding: 13px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-soft) 82%, transparent);
}

.alert-detail-section__heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
  color: rgb(var(--v-theme-primary));
}

.alert-detail-section__heading > div {
  display: grid;
}

.alert-detail-section__heading strong {
  color: var(--app-text);
  font-size: 0.8rem;
}

.alert-detail-section__heading span {
  color: var(--app-muted-text);
  font-size: 0.68rem;
}

.alert-work-orders {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.alert-work-order {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 11px;
  background: rgba(var(--v-theme-primary), 0.055);
}

.alert-work-order .v-icon {
  color: rgb(var(--v-theme-primary));
}

.alert-work-order > div {
  display: grid;
}

.alert-work-order strong {
  font-size: 0.75rem;
}

.alert-work-order span {
  color: var(--app-muted-text);
  font-size: 0.68rem;
}

.alert-detail-section--plain {
  color: var(--app-muted-text);
  font-size: 0.78rem;
}

.alert-detail-section__plain-label {
  display: block;
  margin-bottom: 4px;
  color: var(--app-text);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.alert-detail-section--plain p {
  margin: 0;
}

.alert-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 35px;
  margin-top: 8px;
}

.alert-card__identity {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--app-muted-text);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.inventory-alert-table {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 12px;
  background: var(--surface-base);
  -webkit-overflow-scrolling: touch;
}

.inventory-alert-table table {
  width: 100%;
  min-width: 790px;
  border-collapse: collapse;
  font-size: 0.72rem;
}

.inventory-alert-table th,
.inventory-alert-table td {
  padding: 9px 11px;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.075);
  vertical-align: top;
}

.inventory-alert-table tbody tr:last-child td {
  border-bottom: 0;
}

.inventory-alert-table th {
  white-space: nowrap;
  color: var(--app-muted-text);
  background: color-mix(in srgb, var(--surface-soft) 90%, transparent);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.alerts-empty {
  display: grid;
  justify-items: center;
  min-height: 320px;
  padding: 48px 24px;
  text-align: center;
  background: color-mix(in srgb, var(--surface-soft) 70%, transparent);
}

.alerts-empty__icon {
  display: grid;
  width: 74px;
  height: 74px;
  margin-bottom: 16px;
  place-items: center;
  border-radius: 22px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.alerts-empty p {
  max-width: 430px;
  margin: 7px 0 17px;
}

.alerts-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 15px;
  padding: 3px 4px 0;
}

.alerts-insights {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 13px;
}

.alerts-insight-card {
  padding: 18px;
}

.alerts-insight-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.alerts-insight-card__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.alerts-insight-card__icon--secondary {
  color: rgb(var(--v-theme-secondary));
  background: rgba(var(--v-theme-secondary), 0.1);
}

.alerts-insight-card__icon--neutral {
  color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.1);
}

.alert-bucket {
  display: grid;
  width: 100%;
  gap: 6px;
  margin: 0;
  padding: 9px 8px;
  border: 0;
  border-radius: 11px;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease;
}

.alert-bucket:hover,
.alert-bucket:focus-visible,
.alert-bucket--active {
  background: rgba(var(--v-theme-primary), 0.075);
  outline: none;
}

.alert-bucket:hover {
  transform: translateX(2px);
}

.alert-bucket--secondary:hover,
.alert-bucket--secondary:focus-visible,
.alert-bucket--secondary.alert-bucket--active {
  background: rgba(var(--v-theme-secondary), 0.075);
}

.alert-bucket__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.75rem;
}

.alert-bucket__row strong {
  font-size: 0.72rem;
}

.alert-bucket__track {
  display: block;
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.09);
}

.alert-bucket__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.72), rgb(var(--v-theme-primary)));
  transition: width 320ms ease;
}

.alert-bucket--secondary .alert-bucket__track {
  background: rgba(var(--v-theme-secondary), 0.09);
}

.alert-bucket--secondary .alert-bucket__fill {
  background: linear-gradient(90deg, rgba(var(--v-theme-secondary), 0.72), rgb(var(--v-theme-secondary)));
}

.alerts-insight-card__empty {
  padding: 14px 0;
  color: var(--app-muted-text);
  font-size: 0.78rem;
  text-align: center;
}

.alerts-insight-card--management {
  background:
    linear-gradient(145deg, rgba(var(--v-theme-success), 0.055), transparent 64%),
    var(--surface-base);
}

@keyframes alert-pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0.34); }
  65% { box-shadow: 0 0 0 8px rgba(var(--v-theme-success), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0); }
}

@media (prefers-reduced-motion: reduce) {
  .alerts-hero__pulse {
    animation: none;
  }

  .alert-kpi-card,
  .alert-card,
  .alert-bucket,
  .alert-bucket__fill {
    transition: none;
  }
}

@media (max-width: 1400px) {
  .alerts-filter-grid {
    grid-template-columns: minmax(260px, 2fr) repeat(2, minmax(170px, 1fr));
  }

  .alerts-filter-grid__search {
    grid-row: span 2;
  }

  .alert-card__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1279px) {
  .alerts-insights {
    position: static;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .alerts-hero {
    padding: 24px;
  }

  .alerts-hero__content {
    align-items: flex-start;
    flex-direction: column;
  }

  .alerts-hero__actions {
    justify-content: flex-start;
  }

  .alerts-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .alerts-filter-grid__search {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .alert-card__header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .alert-card__badges {
    grid-column: 2;
    justify-content: flex-start;
  }

  .alerts-insights {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .alerts-page {
    gap: 12px;
  }

  .alerts-hero,
  .alerts-toolbar,
  .alerts-insight-card {
    padding: 17px;
  }

  .alerts-hero {
    min-height: auto;
  }

  .alerts-hero__content {
    min-height: 0;
    gap: 20px;
  }

  .alerts-hero__description {
    font-size: 0.88rem;
  }

  .alerts-hero__actions,
  .alerts-hero__actions > * {
    width: 100%;
  }

  .alerts-toolbar__heading,
  .alerts-feed__header,
  .alerts-pagination {
    align-items: flex-start;
    flex-direction: column;
  }

  .alerts-toolbar__heading-actions {
    width: 100%;
    justify-content: space-between;
  }

  .alerts-filter-grid {
    grid-template-columns: 1fr;
  }

  .alerts-filter-grid__search {
    grid-column: auto;
  }

  .alerts-feed__page-size {
    width: 100%;
    max-width: none;
  }

  .alert-card__body {
    padding: 17px 15px 11px 19px;
  }

  .alert-card__header {
    grid-template-columns: 1fr;
  }

  .alert-card__severity-icon {
    width: 42px;
    height: 42px;
  }

  .alert-card__badges {
    grid-column: auto;
  }

  .alert-card__facts,
  .alert-work-orders {
    grid-template-columns: 1fr;
  }

  .alert-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .alerts-pagination :deep(.v-pagination__list) {
    justify-content: flex-start;
  }
}
</style>

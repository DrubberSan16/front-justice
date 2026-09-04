<template>
  <div class="detailed-report">
    <v-alert v-if="!canAccess" type="warning" variant="tonal" rounded="xl">
      Este reporte está disponible para Gerencia General y Super Administración.
    </v-alert>

    <template v-else>
      <section class="report-heading" aria-labelledby="detailed-report-title">
        <div>
          <div class="report-heading__eyebrow">Vista gerencial</div>
          <h1 id="detailed-report-title">Dashboard Gerencia</h1>
          <p>
            Órdenes, aceite, inventario y reportes del sistema en un solo
            tablero.
          </p>
        </div>
        <div class="report-heading__actions" aria-label="Rango del reporte">
          <v-text-field
            v-model="startDate"
            type="date"
            label="Fecha de inicio"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-text-field
            v-model="endDate"
            type="date"
            label="Fecha de fin"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-filter-check-outline"
            :loading="loading"
            :disabled="invalidDateRange"
            @click="loadReport"
            >Mostrar</v-btn
          >
        </div>
      </section>

      <v-alert
        v-if="invalidDateRange"
        type="warning"
        variant="tonal"
        rounded="xl"
        >La fecha de inicio no puede ser posterior a la fecha de fin.</v-alert
      >
      <v-alert
        v-else-if="error"
        type="warning"
        variant="tonal"
        rounded="xl"
        :text="error"
      />

      <section aria-labelledby="orders-title">
        <div class="section-title-row">
          <div>
            <h2 id="orders-title">Órdenes de trabajo</h2>
            <p>{{ rangeLabel }} · Presione una tarjeta para ver las órdenes.</p>
          </div>
        </div>
        <div class="status-grid" aria-label="Estados de órdenes de trabajo">
          <button
            v-for="status in statusCards"
            :key="status.key"
            type="button"
            :class="['status-button', `status-button--${status.tone}`]"
            :aria-label="`${status.label}: ${status.count}. Abrir listado`"
            @click="openOrdersModal(status.key)"
          >
            <v-icon :icon="status.icon" size="34" aria-hidden="true" />
            <span class="status-button__copy"
              ><strong>{{ status.label }}</strong
              ><span>{{ status.helper }}</span></span
            >
            <span class="status-button__count">{{ status.count }}</span>
            <span class="status-button__action"
              >Ver órdenes <v-icon icon="mdi-arrow-right" size="18"
            /></span>
          </button>
        </div>
      </section>

      <section class="simple-section" aria-labelledby="oil-title">
        <div class="section-title-row">
          <div>
            <h2 id="oil-title">Consumo de aceite</h2>
            <p>{{ rangeLabel }} · Galones y costo registrados.</p>
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
            <span>Total usado</span
            ><strong>{{ formatNumber(oilTotals.total_cantidad) }} gal</strong>
          </article>
          <button
            type="button"
            class="metric-card metric-card--button"
            :disabled="!topOilEquipment"
            @click="topOilEquipment && openEquipmentDetail(topOilEquipment)"
          >
            <span>Mayor consumo por equipo</span
            ><strong>{{
              topOilEquipment ? equipmentLabel(topOilEquipment) : "Sin consumo"
            }}</strong
            ><small v-if="topOilEquipment"
              >{{ formatNumber(topOilEquipment.total_cantidad) }} gal · Ver
              detalle</small
            >
          </button>
          <article class="metric-card">
            <span>Mayor consumo por orden</span
            ><strong>{{ topOilOrder?.work_order_code || "Sin consumo" }}</strong
            ><small v-if="topOilOrder"
              >{{ formatNumber(topOilOrder.cantidad) }} gal</small
            >
          </article>
          <article v-if="muestraCostos" class="metric-card">
            <span>Costo de aceite</span
            ><strong>{{ formatCurrency(oilTotals.total_costo) }}</strong>
          </article>
        </div>
        <div class="equipment-heading">
          <h3>Consumo por equipo</h3>
          <span>{{ equipmentRows.length }} equipos con consumo</span>
        </div>
        <div v-if="equipmentRows.length" class="equipment-grid">
          <button
            v-for="equipment in equipmentRows"
            :key="equipmentKey(equipment)"
            type="button"
            class="equipment-card"
            @click="openEquipmentDetail(equipment)"
          >
            <v-icon icon="mdi-engine-outline" size="26" aria-hidden="true" />
            <span
              ><strong>{{ equipmentLabel(equipment) }}</strong
              ><small
                >{{ formatNumber(equipment.total_cantidad) }} gal<template
                  v-if="muestraCostos"
                >
                  · {{ formatCurrency(equipment.total_costo) }}</template
                ></small
              ></span
            >
            <v-icon icon="mdi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <div v-else class="compact-empty">
          No hay consumo de aceite en este rango.
        </div>
      </section>

      <section class="simple-section" aria-labelledby="priming-title">
        <div class="section-title-row">
          <div>
            <h2 id="priming-title">Control de cebado y consumo de aceite</h2>
            <p>
              Galones por máquina, acumulado semanal y mensual, con nivel por
              orden.
            </p>
          </div>
          <v-icon icon="mdi-oil" size="34" color="primary" aria-hidden="true" />
        </div>
        <div class="priming-legend" aria-label="Niveles de consumo por orden">
          <span
            ><i class="priming-dot priming-dot--green" />0 a 5 gal ·
            normal</span
          >
          <span
            ><i class="priming-dot priming-dot--amber" />Más de 5 y menos de 10
            gal · seguimiento</span
          >
          <span
            ><i class="priming-dot priming-dot--red" />10 gal o más ·
            crítico</span
          >
        </div>
        <v-data-table
          :headers="primingHeaders"
          :items="primingRows"
          :loading="primingLoading"
          :items-per-page="10"
          density="comfortable"
          class="manager-table"
          no-data-text="Sin consumo de aceite registrado en cebado"
        >
          <template #item.equipo_nombre="{ item }">
            <strong>{{ equipmentLabel(item) }}</strong>
            <div v-if="item.equipo_descripcion" class="material-attrs">
              {{ item.equipo_descripcion }}
            </div>
          </template>
          <template #item.galones_periodo="{ item }"
            >{{ formatNumber(item.galones_periodo) }} gal</template
          >
          <template #item.galones_semana="{ item }"
            >{{ formatNumber(item.galones_semana) }} gal</template
          >
          <template #item.galones_mes="{ item }"
            >{{ formatNumber(item.galones_mes) }} gal</template
          >
          <template #item.galones_max_orden="{ item }"
            >{{ formatNumber(item.galones_max_orden) }} gal</template
          >
          <template #item.niveles="{ item }">
            <div class="priming-levels">
              <span
                v-if="item.ots_criticas"
                class="priming-chip priming-chip--red"
                >{{ item.ots_criticas }} crítica(s)</span
              >
              <span
                v-if="item.ots_seguimiento"
                class="priming-chip priming-chip--amber"
                >{{ item.ots_seguimiento }} seguimiento</span
              >
              <span
                v-if="!item.ots_criticas && !item.ots_seguimiento"
                class="priming-chip priming-chip--green"
                >Todas normales</span
              >
            </div>
          </template>
          <template #item.acciones="{ item }">
            <v-btn
              icon="mdi-magnify-expand"
              size="small"
              variant="text"
              color="primary"
              :aria-label="`Ver detalle de ${equipmentLabel(item)}`"
              @click="openPrimingDetail(item)"
            />
          </template>
        </v-data-table>
      </section>

      <section class="simple-section" aria-labelledby="inventory-title">
        <div class="section-title-row">
          <div>
            <h2 id="inventory-title">Inventario del período</h2>
            <p>{{ rangeLabel }} · Resumen compacto basado en el Kardex.</p>
          </div>
          <div class="inventory-searches">
            <v-text-field
              v-model="inventorySearch"
              label="Buscar material"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
              @update:model-value="scheduleInventoryReload"
            />
            <v-autocomplete
              v-model="inventoryEquipmentId"
              :items="generationEquipmentOptions"
              item-title="title"
              item-value="value"
              label="Unidad de generación"
              prepend-inner-icon="mdi-engine-outline"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
              no-data-text="No hay unidades de generación"
              @update:model-value="applyInventoryEquipmentFilter"
            />
          </div>
        </div>

        <v-data-table-server
          v-model:page="inventoryPage"
          v-model:items-per-page="inventoryItemsPerPage"
          :headers="inventoryHeaders"
          :items="inventoryRows"
          :items-length="inventoryTotalItems"
          :loading="inventoryLoading"
          :items-per-page-options="[10, 25, 50]"
          density="comfortable"
          class="manager-table"
          @update:options="loadInventoryReport"
        >
          <template #item.material_label="{ item }">
            <strong>{{ materialLabel(item) }}</strong>
            <div v-if="item.unidad_label" class="material-attrs">
              {{ item.unidad_label }}
            </div>
          </template>
          <template #item.stock_inicial="{ item }">{{
            formatNumber(item.stock_inicial)
          }}</template>
          <template #item.entradas="{ item }"
            ><span class="value-positive"
              >+{{ formatNumber(item.entradas) }}</span
            ></template
          >
          <template #item.salidas="{ item }"
            ><span class="value-negative"
              >-{{ formatNumber(item.salidas) }}</span
            ></template
          >
          <template #item.stock_final="{ item }"
            ><strong>{{ formatNumber(item.stock_final) }}</strong></template
          >
          <template v-if="canViewCosts" #item.costo_unitario="{ item }">
            <strong>{{ formatCurrency(item.costo_unitario) }}</strong>
          </template>
          <template #no-data
            ><div class="empty-table">
              No hay movimientos de inventario en este rango.
            </div></template
          >
        </v-data-table-server>
        <div
          class="inventory-totals"
          aria-label="Totales del inventario del período"
        >
          <article>
            <span>Ingresó</span>
            <strong class="value-positive"
              >+{{ formatNumber(inventoryTotals.entradas) }}</strong
            >
            <small v-if="canViewCosts"
              >{{ formatCurrency(inventoryTotals.costo_entradas) }} en
              material</small
            >
          </article>
          <article>
            <span>Salió</span>
            <strong class="value-negative"
              >-{{ formatNumber(inventoryTotals.salidas) }}</strong
            >
            <small v-if="canViewCosts"
              >{{ formatCurrency(inventoryTotals.costo_salidas) }} en
              material</small
            >
          </article>
          <article v-if="canViewCosts" class="inventory-totals__grand">
            <span
              >Gasto total<template v-if="selectedInventoryEquipmentLabel">
                · {{ selectedInventoryEquipmentLabel }}</template
              ></span
            >
            <strong>{{ formatCurrency(inventoryTotals.costo_total) }}</strong>
            <small
              >{{ formatNumber(inventoryTotals.movimientos, 0) }} movimientos ·
              {{
                formatNumber(inventoryTotals.materiales, 0)
              }}
              materiales</small
            >
          </article>
        </div>
      </section>

      <section class="simple-section" aria-labelledby="system-reports-title">
        <div class="section-title-row">
          <div>
            <h2 id="system-reports-title">Reportes del sistema</h2>
            <p>
              Horas, costos, responsables e inventario del rango seleccionado.
            </p>
          </div>
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-refresh"
            :loading="systemLoading"
            @click="loadSystemReports"
            >Actualizar</v-btn
          >
        </div>

        <div class="system-filters">
          <v-select
            v-model="systemGroupBy"
            :items="systemGroupOptions"
            item-title="title"
            item-value="value"
            label="Agrupar por"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="loadSystemReports"
          />
          <v-select
            v-model="systemEquipmentId"
            :items="systemEquipmentOptions"
            item-title="label"
            item-value="id"
            label="Equipo"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            @update:model-value="loadSystemReports"
          />
          <v-select
            v-model="systemWarehouseId"
            :items="systemWarehouseOptions"
            item-title="label"
            item-value="id"
            label="Bodega"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            @update:model-value="loadSystemReports"
          />
        </div>

        <v-alert
          v-if="systemError"
          type="warning"
          variant="tonal"
          rounded="xl"
          class="mb-3"
          :text="systemError"
        />

        <v-tabs v-model="systemTab" color="primary" show-arrows>
          <v-tab
            v-for="section in systemSections"
            :key="section.key"
            :value="section.key"
            :prepend-icon="section.icon"
            >{{ section.title }} ({{ section.count }})</v-tab
          >
        </v-tabs>

        <v-window v-model="systemTab">
          <v-window-item
            v-for="section in systemSections"
            :key="section.key"
            :value="section.key"
          >
            <div class="system-section-head">
              <div>
                <strong>{{ section.title }}</strong>
                <span>{{ section.subtitle }}</span>
              </div>
              <v-chip label color="secondary" variant="tonal" size="small">{{
                section.groupLabel
              }}</v-chip>
            </div>

            <v-data-table
              :headers="section.headers"
              :items="section.rows"
              :loading="systemLoading"
              :items-per-page="10"
              density="comfortable"
              class="manager-table system-table"
            >
              <template #item.work_order_code="{ item }">
                <button
                  v-if="systemRawRow(item).work_order_id"
                  type="button"
                  class="order-link"
                  @click="openOrderFromSystemRow(item)"
                >
                  {{ systemRow(item).work_order_code }}
                </button>
                <span v-else>{{ systemRow(item).work_order_code }}</span>
              </template>
              <template #item.equipment_name="{ item }">
                <span class="system-cell system-cell--equipment">{{ systemRow(item).equipment_name }}</span>
              </template>
              <template #item.equipment_label="{ item }">
                <span class="system-cell system-cell--equipment">{{ systemRow(item).equipment_label }}</span>
              </template>
              <template #item.plan_name="{ item }">
                <span class="system-cell system-cell--plan">{{ systemRow(item).plan_name }}</span>
              </template>
              <template
                v-for="listKey in LIST_CELL_KEYS"
                :key="listKey"
                #[`item.${listKey}`]="{ item }"
              >
                <v-btn
                  v-if="listCellItems(item, listKey).length"
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-format-list-bulleted"
                  @click="openListCell(item, listKey)"
                >
                  Ver
                  {{ (LIST_CELL_LABELS[listKey] || listKey).toLowerCase() }} ({{
                    listCellItems(item, listKey).length
                  }})
                </v-btn>
                <span v-else class="list-cell-empty">Sin datos</span>
              </template>
              <template #item.detalle_ordenes="{ item }">
                <v-btn
                  v-if="ordenDetalleRows(item).length"
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-file-document-outline"
                  @click="openOrdenesDetalle(item)"
                >
                  Ver detalle ({{ ordenDetalleRows(item).length }})
                </v-btn>
                <span v-else class="list-cell-empty">Sin órdenes</span>
              </template>
              <template #item.responsables="{ item }">
                <v-btn
                  v-if="rowResponsables(item).length"
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-account-group-outline"
                  @click="openResponsablesFromRow(item)"
                  >Ver responsables</v-btn
                >
                <span v-else class="muted-empty">Sin responsables</span>
              </template>
              <template #no-data
                ><div class="empty-table">
                  No hay datos para este reporte con los filtros actuales.
                </div></template
              >
            </v-data-table>
          </v-window-item>
        </v-window>
      </section>

      <section v-if="canViewCosts" class="simple-section" aria-labelledby="maintenance-cost-title">
        <div class="section-title-row">
          <div>
            <h2 id="maintenance-cost-title">Costo de mantenimiento</h2>
            <p>
              Valor de los materiales usados en órdenes de mantenimiento,
              separado por tipo de equipo.
            </p>
          </div>
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-refresh"
            :loading="maintenanceCostLoading"
            :disabled="invalidMaintenanceCostRange"
            @click="loadMaintenanceCostReport"
            >Actualizar</v-btn
          >
        </div>

        <div class="system-filters">
          <v-text-field
            v-model="maintenanceCostStart"
            type="date"
            label="Fecha de inicio"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-text-field
            v-model="maintenanceCostEnd"
            type="date"
            label="Fecha de fin"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="maintenanceCostWarehouseId"
            :items="maintenanceCostWarehouseOptions"
            item-title="label"
            item-value="id"
            label="Bodega"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            @update:model-value="loadMaintenanceCostReport"
          />
        </div>

        <v-alert
          v-if="invalidMaintenanceCostRange"
          type="warning"
          variant="tonal"
          rounded="xl"
          class="mb-3"
          >La fecha de inicio no puede ser posterior a la fecha de fin.</v-alert
        >
        <v-alert
          v-else-if="maintenanceCostError"
          type="warning"
          variant="tonal"
          rounded="xl"
          class="mb-3"
          :text="maintenanceCostError"
        />

        <v-tabs v-model="maintenanceCostTab" color="primary" show-arrows>
          <v-tab
            v-for="tab in maintenanceCostTabs"
            :key="tab.key"
            :value="tab.key"
            :prepend-icon="tab.icon"
            >{{ tab.title }} ({{ tab.rows.length }})</v-tab
          >
        </v-tabs>

        <v-window v-model="maintenanceCostTab">
          <v-window-item
            v-for="tab in maintenanceCostTabs"
            :key="tab.key"
            :value="tab.key"
          >
            <div class="system-section-head">
              <div>
                <strong>{{ tab.title }}</strong>
                <span>{{ tab.subtitle }}</span>
              </div>
              <v-chip label color="secondary" variant="tonal" size="small">{{
                maintenanceCostRangeLabel
              }}</v-chip>
            </div>

            <v-data-table
              :headers="maintenanceCostHeaders"
              :items="tab.rows"
              :loading="maintenanceCostLoading"
              :items-per-page="10"
              density="comfortable"
              class="manager-table system-table"
            >
              <template #item.work_order_code="{ item }">
                <button
                  v-if="systemRawRow(item).work_order_id"
                  type="button"
                  class="order-link"
                  @click="openOrderFromSystemRow(item)"
                >
                  {{ systemRow(item).work_order_code }}
                </button>
                <span v-else>{{ systemRow(item).work_order_code }}</span>
              </template>
              <template #item.equipment_name="{ item }">
                <span class="system-cell system-cell--equipment">{{ systemRow(item).equipment_name }}</span>
              </template>
              <template #item.equipment_label="{ item }">
                <span class="system-cell system-cell--equipment">{{ systemRow(item).equipment_label }}</span>
              </template>
              <template #item.plan_name="{ item }">
                <span class="system-cell system-cell--plan">{{ systemRow(item).plan_name }}</span>
              </template>
              <template #item.materiales="{ item }">
                <v-btn
                  v-if="listCellItems(item, 'materiales').length"
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-format-list-bulleted"
                  @click="openListCell(item, 'materiales')"
                >
                  Ver materiales ({{
                    listCellItems(item, "materiales").length
                  }})
                </v-btn>
                <span v-else class="list-cell-empty">Sin datos</span>
              </template>
              <template #body.append>
                <tr v-if="tab.rows.length" class="totals-row">
                  <td
                    v-for="(header, index) in maintenanceCostHeaders"
                    :key="`total-${header.key}`"
                  >
                    <template v-if="index === 0">Total del tab</template>
                    <template v-else-if="header.key === 'total_costo'">{{
                      formatCurrency(tab.totalCosto)
                    }}</template>
                    <template v-else-if="header.key === 'total_cantidad'">{{
                      formatNumber(tab.totalCantidad, 4)
                    }}</template>
                  </td>
                </tr>
              </template>
              <template #no-data
                ><div class="empty-table">
                  No hay costos de mantenimiento para este tipo de equipo con
                  los filtros actuales.
                </div></template
              >
            </v-data-table>
          </v-window-item>
        </v-window>
      </section>
    </template>

    <v-dialog v-model="primingDetailDialog" max-width="1080" scrollable>
      <v-card rounded="xl" class="detail-dialog">
        <v-card-title class="dialog-header priming-dialog-header">
          <div>
            <span>Detalle de cebado y aceite</span>
            <strong>{{ equipmentLabel(primingDetailEquipment || {}) }}</strong>
            <small>{{ primingDetailEquipment?.equipo_descripcion }}</small>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Cerrar detalle de cebado"
            @click="primingDetailDialog = false"
          />
        </v-card-title>
        <v-card-text class="detail-dialog__body">
          <v-alert type="info" variant="tonal" density="comfortable">
            Cada fila corresponde a una orden de cebado. La tendencia compara su
            consumo con la orden anterior del mismo equipo.
          </v-alert>
          <div v-if="primingDetailLoading" class="detail-loading">
            <v-progress-circular indeterminate size="30" />
            <span>Cargando detalle…</span>
          </div>
          <template v-else>
            <EChart
              v-if="primingChartOption"
              :option="primingChartOption"
              height="clamp(150px, 24vh, 280px)"
            />
            <v-data-table
              :headers="primingDetailHeaders"
              :items="primingDetailRows"
              :items-per-page="10"
              density="comfortable"
              class="manager-table"
              no-data-text="Sin órdenes de cebado en este período"
            >
              <template #item.fecha="{ item }">{{
                formatShortDate(item.fecha)
              }}</template>
              <template #item.galones="{ item }"
                >{{ formatNumber(item.galones) }} gal</template
              >
              <template #item.tendencia="{ item }">
                <span
                  v-if="item.tendencia && item.tendencia !== 'SIN_REFERENCIA'"
                  class="priming-trend"
                >
                  <v-icon :icon="primingTrendIcon(item.tendencia)" size="16" />
                  {{ primingTrendLabel(item.tendencia) }}
                </span>
                <span v-else class="text-medium-emphasis">Primera orden</span>
              </template>
              <template #item.semaforo="{ item }">
                <span
                  v-if="item.semaforo"
                  :class="[
                    'priming-chip',
                    `priming-chip--${String(item.semaforo.nivel || '').toLowerCase()}`,
                  ]"
                  >{{ item.semaforo.etiqueta }}</span
                >
              </template>
              <template #item.costo="{ item }">{{
                formatCurrency(item.costo)
              }}</template>
              <template #body.append>
                <tr v-if="primingDetailRows.length" class="totals-row">
                  <td
                    v-for="(header, index) in primingDetailHeaders"
                    :key="`total-${header.key}`"
                    :class="header.align === 'end' ? 'text-end' : ''"
                  >
                    <template v-if="index === 0">Total del equipo</template>
                    <template v-else-if="header.key === 'galones'"
                      >{{ formatNumber(primingDetailTotals.galones) }} gal</template
                    >
                    <template v-else-if="header.key === 'costo'">{{
                      formatCurrency(primingDetailTotals.costo)
                    }}</template>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="ordersDialog" max-width="1240" scrollable>
      <v-card rounded="xl" class="list-dialog">
        <v-card-title class="dialog-header">
          <v-btn
            v-if="canGoBackModal"
            icon="mdi-arrow-left"
            variant="text"
            class="dialog-header__nav"
            aria-label="Volver a la pantalla anterior"
            @click="goBackModal('orders')"
          />
          <div class="dialog-header__copy">
            <span>Órdenes de trabajo</span
            ><strong>{{ selectedStatusCard?.label || "Órdenes" }}</strong
            ><small>{{ rangeLabel }}</small>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            class="dialog-header__nav"
            aria-label="Cerrar listado"
            @click="closeModal('orders')"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="list-dialog__body">
          <v-text-field
            v-model="orderSearch"
            label="Buscar orden o equipo"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            autofocus
          />
          <div v-if="loading" class="orders-loading">
            <v-skeleton-loader v-for="index in 3" :key="index" type="article" />
          </div>
          <div v-else-if="!visibleOrders.length" class="empty-panel">
            <v-icon icon="mdi-clipboard-text-off-outline" size="42" /><strong
              >No hay órdenes para mostrar</strong
            >
          </div>
          <div v-else class="orders-list">
            <button
              v-for="order in visibleOrders"
              :key="orderKey(order)"
              type="button"
              class="order-card"
              @click="openOrderFromList(order)"
            >
              <div class="order-card__main">
                <div class="order-card__code">{{ orderCode(order) }}</div>
                <div class="order-card__title">{{ orderTitle(order) }}</div>
                <div class="order-card__equipment">
                  {{ equipmentLabel(order) }}
                </div>
              </div>
              <div class="order-card__facts">
                <span
                  ><small>Apertura</small
                  >{{ formatTime(order.started_at || order.created_at) }}</span
                ><span
                  ><small>Finalización</small
                  >{{ formatTime(order.closed_at) }}</span
                ><span
                  ><small>Horómetro anterior</small
                  >{{ formatHours(order.horometro_anterior) }}</span
                ><span
                  ><small>Horómetro actual</small
                  >{{ formatHours(order.horometro_actual) }}</span
                >
              </div>
              <div class="order-card__action">
                Ver detalle <v-icon icon="mdi-chevron-right" />
              </div>
            </button>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="equipmentDialog" max-width="920" scrollable>
      <v-card rounded="xl" class="list-dialog">
        <v-card-title class="dialog-header">
          <v-btn
            v-if="canGoBackModal"
            icon="mdi-arrow-left"
            variant="text"
            class="dialog-header__nav"
            aria-label="Volver a la pantalla anterior"
            @click="goBackModal('equipment')"
          />
          <div class="dialog-header__copy">
            <span>Consumo del equipo</span
            ><strong>{{ equipmentLabel(selectedEquipment || {}) }}</strong
            ><small>{{ rangeLabel }}</small>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            class="dialog-header__nav"
            aria-label="Cerrar detalle del equipo"
            @click="closeModal('equipment')"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="list-dialog__body">
          <div class="equipment-summary">
            <article>
              <span>Galones usados</span
              ><strong
                >{{
                  formatNumber(selectedEquipment?.total_cantidad)
                }}
                gal</strong
              >
            </article>
            <article v-if="muestraCostos">
              <span>Costo</span
              ><strong>{{
                formatCurrency(selectedEquipment?.total_costo)
              }}</strong>
            </article>
            <article>
              <span>Órdenes</span
              ><strong>{{ selectedEquipmentOrders.length }}</strong>
            </article>
          </div>
          <div class="equipment-orders-title">Órdenes donde se usó aceite</div>
          <div
            v-if="selectedEquipmentOrders.length"
            class="equipment-order-list"
          >
            <button
              v-for="order in selectedEquipmentOrders"
              :key="orderKey(order)"
              type="button"
              @click="openOrderFromEquipment(order)"
            >
              <span
                ><strong>{{ orderCode(order) }}</strong
                ><small>{{
                  formatDateTime(order.fecha || order.created_at)
                }}</small></span
              >
              <span class="equipment-order-list__amount"
                >{{ formatNumber(order.cantidad) }} gal<small v-if="muestraCostos">{{
                  formatCurrency(order.subtotal || order.total_costo)
                }}</small></span
              ><v-icon icon="mdi-chevron-right" />
            </button>
          </div>
          <div v-else class="compact-empty">
            No hay órdenes asociadas para este equipo.
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="detailDialog" max-width="1080" scrollable>
      <v-card rounded="xl" class="detail-dialog">
        <v-card-title class="dialog-header">
          <v-btn
            v-if="canGoBackModal"
            icon="mdi-arrow-left"
            variant="text"
            class="dialog-header__nav"
            aria-label="Volver a la pantalla anterior"
            @click="goBackModal('detail')"
          />
          <div class="dialog-header__copy">
            <span>{{ orderCode(selectedOrder || {}) }}</span
            ><strong>{{ orderTitle(selectedOrder || {}) }}</strong
            ><small>{{ equipmentLabel(selectedOrder || {}) }}</small>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            class="dialog-header__nav"
            aria-label="Cerrar detalle"
            @click="closeModal('detail')"
          />
          <div class="dialog-header__cta">
            <v-btn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-file-pdf-box"
              :disabled="detailLoading"
              @click="openPdfPreview"
              >Previsualizar PDF</v-btn
            >
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="detail-dialog__body">
          <div v-if="detailLoading" class="detail-loading">
            <v-progress-circular indeterminate color="primary" />Cargando
            detalle de la orden...
          </div>
          <template v-else>
            <v-alert
              v-if="detailError"
              type="warning"
              variant="tonal"
              rounded="xl"
              :text="detailError"
            />
            <div class="detail-summary">
              <article>
                <span>Abierta</span
                ><strong>{{
                  formatDateTime(
                    detailHeader.started_at || detailHeader.created_at,
                  )
                }}</strong>
              </article>
              <article>
                <span>Finalizada</span
                ><strong>{{ formatDateTime(detailHeader.closed_at) }}</strong>
              </article>
              <article>
                <span>Horómetro anterior</span
                ><strong>{{
                  formatHours(detailHeader.horometro_anterior)
                }}</strong>
              </article>
              <article>
                <span>Horómetro actual</span
                ><strong>{{
                  formatHours(detailHeader.horometro_actual)
                }}</strong>
              </article>
              <article>
                <span>Horas de trabajo</span
                ><strong>{{ formatNumber(totalResponsibleHours) }} h</strong>
              </article>
              <article v-if="muestraCostos">
                <span>Costo total</span
                ><strong>{{ formatCurrency(totalWorkCost) }}</strong>
              </article>
            </div>
            <div class="detail-block">
              <h3>Responsables</h3>
              <div v-if="responsibleRows.length" class="responsible-list">
                <div v-for="row in responsibleRows" :key="row.key">
                  <span>{{ row.label }}</span
                  ><strong>{{ formatNumber(row.hours) }} h</strong>
                </div>
              </div>
              <p v-else class="muted-empty">No hay horas registradas.</p>
            </div>
            <div class="detail-block">
              <h3>Materiales cambiados</h3>
              <div v-if="materialRows.length" class="material-list">
                <div
                  v-for="row in materialRows"
                  :key="row.key"
                  class="material-row"
                >
                  <strong>{{ row.label }}</strong
                  ><span
                    >Nuevo entregado:
                    <b>{{ formatNumber(row.delivered) }}</b></span
                  ><span
                    >Viejo a chatarra:
                    <b>{{ formatNumber(row.scrapped) }}</b></span
                  ><v-chip
                    :color="
                      row.delivered > 0 && row.scrapped > 0
                        ? 'success'
                        : 'warning'
                    "
                    variant="tonal"
                    size="small"
                    >{{
                      row.delivered > 0 && row.scrapped > 0
                        ? "Flujo completo"
                        : "Revisar"
                    }}</v-chip
                  >
                </div>
              </div>
              <p v-else class="muted-empty">No hay materiales registrados.</p>
            </div>
            <div class="detail-block">
              <h3>Aceite</h3>
              <div class="oil-detail">
                <article>
                  <span>Usado en esta orden</span
                  ><strong>{{ formatNumber(orderOilQuantity) }} gal</strong>
                </article>
                <article>
                  <span>Entregado por bodega</span
                  ><strong>{{ oilDelivered ? "Sí" : "No registrado" }}</strong>
                </article>
                <article v-if="muestraCostos">
                  <span>Costo</span
                  ><strong>{{ formatCurrency(orderOilCost) }}</strong>
                </article>
              </div>
            </div>
            <div class="detail-block">
              <h3>Registro de la orden</h3>
              <div class="audit-grid">
                <span
                  >Creada por<strong>{{
                    detailHeader.created_by_label ||
                    detailHeader.created_by ||
                    "Sin registro"
                  }}</strong></span
                ><span
                  >Iniciada o procesada por<strong>{{
                    detailHeader.processed_by_label ||
                    firstHistoryActor ||
                    "Sin registro"
                  }}</strong></span
                ><span
                  >Última edición por<strong>{{
                    detailHeader.updated_by ||
                    lastHistoryActor ||
                    "Sin registro"
                  }}</strong></span
                >
              </div>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="responsablesDialog" max-width="520" scrollable>
      <v-card rounded="xl" class="list-dialog">
        <v-card-title class="dialog-header">
          <v-btn
            v-if="canGoBackModal"
            icon="mdi-arrow-left"
            variant="text"
            class="dialog-header__nav"
            aria-label="Volver a la pantalla anterior"
            @click="goBackModal('responsables')"
          />
          <div class="dialog-header__copy">
            <span>Responsables</span><strong>{{ responsablesOrder }}</strong
            ><small>Horas registradas por cada persona</small>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            class="dialog-header__nav"
            aria-label="Cerrar responsables"
            @click="closeModal('responsables')"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="list-dialog__body">
          <div v-if="responsablesRows.length" class="responsible-list">
            <div v-for="row in responsablesRows" :key="row.label">
              <span>{{ row.label }}</span
              ><strong>{{ formatNumber(row.hours) }} h</strong>
            </div>
          </div>
          <p v-else class="muted-empty">
            No hay horas registradas para esta orden.
          </p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="listaDialog" max-width="560" scrollable>
      <v-card rounded="xl" class="list-dialog">
        <v-card-title class="dialog-header">
          <v-btn
            v-if="canGoBackModal"
            icon="mdi-arrow-left"
            variant="text"
            class="dialog-header__nav"
            aria-label="Volver a la pantalla anterior"
            @click="goBackModal('lista')"
          />
          <div class="dialog-header__copy">
            <span>{{ listaTitulo }}</span
            ><strong>{{ listaSubtitulo || listaTitulo }}</strong
            ><small>{{ listaItems.length }} registros</small>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            class="dialog-header__nav"
            aria-label="Cerrar listado"
            @click="closeModal('lista')"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="list-dialog__body">
          <div v-if="listaItems.length" class="responsible-list">
            <div
              v-for="(entry, index) in listaItems"
              :key="`${entry}-${index}`"
            >
              <span>{{ entry }}</span>
            </div>
          </div>
          <p v-else class="muted-empty">No hay registros para mostrar.</p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="ordenesDialog" max-width="780" scrollable>
      <v-card rounded="xl" class="list-dialog">
        <v-card-title class="dialog-header">
          <v-btn
            v-if="canGoBackModal"
            icon="mdi-arrow-left"
            variant="text"
            class="dialog-header__nav"
            aria-label="Volver a la pantalla anterior"
            @click="goBackModal('ordenes')"
          />
          <div class="dialog-header__copy">
            <span>Órdenes de trabajo</span
            ><strong>{{ ordenesSubtitulo }}</strong
            ><small
              >{{ ordenesRows.length }} órdenes · toca el número para ver el
              informe</small
            >
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            class="dialog-header__nav"
            aria-label="Cerrar listado"
            @click="closeModal('ordenes')"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="list-dialog__body">
          <v-table
            v-if="ordenesRows.length"
            density="compact"
            class="ordenes-table"
          >
            <thead>
              <tr>
                <th>N.º de orden</th>
                <th>Equipo</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(orden, index) in ordenesRows"
                :key="`${orden.work_order_code}-${index}`"
              >
                <td>
                  <button
                    v-if="orden.work_order_id"
                    type="button"
                    class="order-link"
                    @click="openOrderFromDetalle(orden)"
                  >
                    {{ orden.work_order_code || "Sin código" }}
                  </button>
                  <span v-else>{{
                    orden.work_order_code || "Sin código"
                  }}</span>
                </td>
                <td>{{ orden.equipment_name || "Sin equipo" }}</td>
                <td>{{ orden.maintenance_kind_label || "Sin definir" }}</td>
              </tr>
            </tbody>
          </v-table>
          <p v-else class="muted-empty">No hay órdenes para mostrar.</p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="pdfDialog" max-width="1000" scrollable>
      <v-card rounded="xl" class="list-dialog">
        <v-card-title class="dialog-header">
          <div class="dialog-header__copy">
            <span>Informe en PDF</span
            ><strong>{{ orderCode(selectedOrder || {}) }}</strong
            ><small>Revisa el informe antes de descargarlo</small>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            class="dialog-header__nav"
            aria-label="Cerrar previsualización"
            @click="closePdfPreview"
          />
          <div class="dialog-header__cta">
            <v-btn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-download"
              :disabled="pdfLoading"
              @click="downloadOrderReport"
              >Descargar</v-btn
            >
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pdf-preview__body">
          <div v-if="pdfLoading" class="detail-loading">
            <v-progress-circular indeterminate color="primary" />Generando el
            informe...
          </div>
          <v-alert
            v-else-if="pdfError"
            type="warning"
            variant="tonal"
            rounded="xl"
            :text="pdfError"
          />
          <iframe
            v-else-if="pdfUrl"
            :src="pdfUrl"
            title="Informe de la orden de trabajo"
            class="pdf-preview__frame"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useTheme } from "vuetify";
import { api } from "@/app/http/api";
import EChart from "@/components/charts/EChart.vue";
import { chartBase, seriesColor } from "@/app/config/chart-theme";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import {
  currentDateInputValue,
  formatDateOnly as formatAppDateOnly,
  formatDateTime as formatAppDateTime,
} from "@/app/utils/date-time";
import {
  resolveEquipmentBrand,
  resolveEquipmentModel,
} from "@/app/utils/equipment-display";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
import { DEFAULT_CONTEXT_CACHE_TTL_MS } from "@/app/utils/request-cache";
import {
  buildWorkOrderReportPdfBlob,
  downloadWorkOrderReportPdf,
  type WorkOrderReportData,
} from "@/app/utils/work-order-report-documents";
import {
  canViewMaterialCosts,
  isGeneralManager,
  isSuperAdministrator,
} from "@/app/utils/role-access";

type AnyRow = Record<string, any>;
type StatusKey = "planned" | "open" | "closed";
const auth = useAuthStore();
const canViewCosts = computed(() => canViewMaterialCosts(auth.user));
const menuStore = useMenuStore();
const theme = useTheme();

/**
 * Este tablero absorbio "Reportes del sistema", que vivia en un modulo aparte y
 * llego a tener dos entradas de menu distintas ("Reporte Gerencial" y "Reporte
 * Sistema") apuntando ambas a `reportes-sistema`.
 *
 * La busqueda es por `urlComponent`, nunca por el nombre visible del menu, asi
 * que aqui solo tienen sentido los dos componentes. Los permisos ya se
 * consolidaron sobre `dashboard-gerencia`; `reportes-sistema` queda como red de
 * seguridad por si alguna asignacion vieja sobrevive.
 */
const managerPerms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "dashboard-gerencia",
    "reportes-sistema",
  ]),
);
const canAccess = computed(
  () =>
    managerPerms.value.isReaded ||
    isGeneralManager(auth.user) ||
    isSuperAdministrator(auth.user),
);
const today = currentDateInputValue();
const startDate = ref(`${today.slice(0, 7)}-01`);
const endDate = ref(today);
const loading = ref(false);
const inventoryLoading = ref(false);
const error = ref<string | null>(null);
const orders = ref<AnyRow[]>([]);
const activeStatus = ref<StatusKey>("open");
const orderSearch = ref("");
const inventorySearch = ref("");
const inventoryRows = ref<AnyRow[]>([]);
const inventoryPage = ref(1);
const inventoryItemsPerPage = ref(10);
const inventoryTotalItems = ref(0);
const inventoryEquipmentId = ref<string | null>(null);
const inventoryTotals = ref<AnyRow>({
  materiales: 0,
  movimientos: 0,
  entradas: 0,
  salidas: 0,
  costo_entradas: 0,
  costo_salidas: 0,
  costo_total: 0,
});
const generationEquipments = ref<AnyRow[]>([]);
const primingRows = ref<AnyRow[]>([]);
const primingLoading = ref(false);
const primingDetailDialog = ref(false);
const primingDetailLoading = ref(false);
const primingDetailEquipment = ref<AnyRow | null>(null);
const primingDetailRows = ref<AnyRow[]>([]);
const oilReport = ref<AnyRow | null>(null);
const selectedOilProductId = ref<string | null>(null);
const equipmentCatalog = ref<AnyRow[]>([]);
const ordersDialog = ref(false);
const equipmentDialog = ref(false);
const selectedEquipment = ref<AnyRow | null>(null);
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

const inventoryHeaders = computed(() => [
  { title: "Material", key: "material_label" },
  {
    title: "Inicio del rango",
    key: "stock_inicial",
    align: "end" as const,
  },
  { title: "Ingresó", key: "entradas", align: "end" as const },
  { title: "Salió", key: "salidas", align: "end" as const },
  {
    title: "Finalizó",
    key: "stock_final",
    align: "end" as const,
  },
  ...(canViewCosts.value
    ? [{ title: "Costo por ítem", key: "costo_unitario", align: "end" as const }]
    : []),
]);

const primingHeaders = [
  { title: "Equipo", key: "equipo_nombre" },
  { title: "Cebados", key: "ots_cebado", align: "end" as const },
  { title: "Galones período", key: "galones_periodo", align: "end" as const },
  { title: "Semana", key: "galones_semana", align: "end" as const },
  { title: "Mes", key: "galones_mes", align: "end" as const },
  { title: "Mayor orden", key: "galones_max_orden", align: "end" as const },
  { title: "Órdenes por nivel", key: "niveles", sortable: false },
  { title: "", key: "acciones", sortable: false, align: "end" as const },
];

const primingDetailHeaders = computed(() => {
  const headers: AnyRow[] = [
    { title: "Orden", key: "orden" },
    { title: "Fecha", key: "fecha" },
    { title: "Producto", key: "producto" },
    { title: "Galones", key: "galones", align: "end" as const },
    { title: "Tendencia", key: "tendencia" },
    { title: "Nivel", key: "semaforo" },
  ];
  if (canViewCosts.value && primingDetailRows.value.some((item) => "costo" in item)) {
    headers.push({ title: "Costo", key: "costo", align: "end" as const });
  }
  return headers;
});

/**
 * Suma de lo que muestra la modal, no solo de la pagina visible de la tabla.
 * La pregunta que se hace quien la abre es cuanto aceite lleva ese equipo en el
 * periodo, y esa cifra no puede depender de en que pagina de la tabla este.
 */
const primingDetailTotals = computed(() => ({
  galones: primingDetailRows.value.reduce(
    (acc, row) => acc + Number(row?.galones || 0),
    0,
  ),
  costo: primingDetailRows.value.reduce(
    (acc, row) => acc + Number(row?.costo || 0),
    0,
  ),
}));

const primingChartOption = computed(() => {
  if (!primingDetailRows.value.length) return null;
  const base = chartBase(theme.global.current.value.dark);
  return {
    ...base,
    tooltip: { ...base.tooltip, trigger: "item" as const },
    xAxis: {
      ...base.xAxis,
      data: primingDetailRows.value.map((item) => item.orden),
    },
    yAxis: { ...base.yAxis, name: "Galones" },
    series: [
      {
        name: "Galones",
        type: "bar" as const,
        barMaxWidth: 26,
        itemStyle: {
          color: seriesColor(0, theme.global.current.value.dark),
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: "top" as const,
          color: base.textStyle.color,
          fontSize: 11,
        },
        data: primingDetailRows.value.map((item) => Number(item.galones || 0)),
      },
    ],
  };
});

function unwrap(payload: any): any {
  return payload?.data?.data ?? payload?.data ?? payload ?? null;
}
function asArray(payload: any): AnyRow[] {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  for (const key of ["items", "rows", "results", "work_orders"])
    if (Array.isArray(value?.[key])) return value[key];
  return [];
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
  if (
    [
      "CLOSED",
      "CERRADA",
      "CERRADO",
      "COMPLETED",
      "FINALIZADA",
      "FINALIZADO",
    ].includes(status)
  )
    return "closed";
  if (
    [
      "PLANNED",
      "PLANIFICADA",
      "PLANIFICADO",
      "SCHEDULED",
      "PROGRAMADA",
      "PROGRAMADO",
    ].includes(status)
  )
    return "planned";
  return "open";
}

const invalidDateRange = computed(
  () => !startDate.value || !endDate.value || startDate.value > endDate.value,
);
const rangeLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const from = new Date(`${startDate.value}T12:00:00`);
  const to = new Date(`${endDate.value}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return "Rango sin definir";
  return `${formatter.format(from)} al ${formatter.format(to)}`;
});
const groupedOrders = computed<Record<StatusKey, AnyRow[]>>(() => ({
  planned: orders.value.filter((row) => orderStatus(row) === "planned"),
  open: orders.value.filter((row) => orderStatus(row) === "open"),
  closed: orders.value.filter((row) => orderStatus(row) === "closed"),
}));
const statusCards = computed(() => [
  {
    key: "planned" as const,
    label: "Órdenes planificadas",
    helper: "Trabajo por iniciar",
    icon: "mdi-calendar-clock",
    tone: "planned",
    count: groupedOrders.value.planned.length,
  },
  {
    key: "open" as const,
    label: "Órdenes abiertas",
    helper: "Trabajo en proceso",
    icon: "mdi-progress-wrench",
    tone: "open",
    count: groupedOrders.value.open.length,
  },
  {
    key: "closed" as const,
    label: "Órdenes cerradas",
    helper: "Trabajo finalizado",
    icon: "mdi-clipboard-check-outline",
    tone: "closed",
    count: groupedOrders.value.closed.length,
  },
]);
const selectedStatusCard = computed(() =>
  statusCards.value.find((status) => status.key === activeStatus.value),
);
const visibleOrders = computed(() => {
  const search = orderSearch.value.trim().toLocaleLowerCase("es");
  const rows = groupedOrders.value[activeStatus.value];
  if (!search) return rows;
  return rows.filter((row) =>
    [orderCode(row), orderTitle(row), equipmentLabel(row)].some((value) =>
      value.toLocaleLowerCase("es").includes(search),
    ),
  );
});
const oilCatalog = computed<AnyRow[]>(() =>
  Array.isArray(oilReport.value?.catalog) ? oilReport.value.catalog : [],
);
const oilTotals = computed<AnyRow>(() => oilReport.value?.totals ?? {});
const equipmentRows = computed<AnyRow[]>(() =>
  Array.isArray(oilReport.value?.by_equipment)
    ? oilReport.value.by_equipment
    : [],
);
const oilWorkOrders = computed<AnyRow[]>(() =>
  Array.isArray(oilReport.value?.work_orders)
    ? oilReport.value.work_orders
    : [],
);
const topOilEquipment = computed<AnyRow | null>(
  () => equipmentRows.value[0] ?? null,
);
const topOilOrder = computed<AnyRow | null>(
  () =>
    [...oilWorkOrders.value].sort(
      (a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0),
    )[0] ?? null,
);
const selectedEquipmentOrders = computed(() => {
  if (!selectedEquipment.value) return [];
  const selectedId = String(
    selectedEquipment.value.equipment_id ||
      selectedEquipment.value.equipo_id ||
      "",
  );
  const selectedLabel = equipmentLabel(selectedEquipment.value);
  return oilWorkOrders.value.filter((row) => {
    const rowId = String(row.equipment_id || row.equipo_id || "");
    return (
      (selectedId && rowId === selectedId) ||
      equipmentLabel(row) === selectedLabel
    );
  });
});
const generationEquipmentOptions = computed(() =>
  generationEquipments.value
    .map((equipment) => ({
      value: String(equipment.id),
      title: equipmentLabel(equipment),
    }))
    .sort((left, right) => left.title.localeCompare(right.title, "es")),
);

const selectedInventoryEquipmentLabel = computed(
  () =>
    generationEquipmentOptions.value.find(
      (item) => item.value === inventoryEquipmentId.value,
    )?.title || "",
);

function isGenerationEquipmentType(type: AnyRow) {
  const normalized = String(type?.nombre || type?.codigo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return normalized.includes("GENERACION") || normalized.includes("GENERADOR");
}

function equipmentLabel(item: AnyRow) {
  const equipmentId = String(
    item?.equipment_id || item?.equipo_id || "",
  ).trim();
  const directCode = String(
    item?.equipment_codigo ||
      item?.equipo_codigo ||
      item?.equipment_code ||
      item?.codigo ||
      "",
  ).trim();
  const catalogItem = equipmentCatalog.value.find((row) => {
    const rowId = String(row?.id || "").trim();
    const rowCode = String(row?.codigo || "").trim();
    return (
      (equipmentId && rowId === equipmentId) ||
      (directCode && rowCode.toUpperCase() === directCode.toUpperCase())
    );
  });
  const name = String(
    catalogItem?.nombre ||
      item?.equipment_nombre ||
      item?.equipo_nombre ||
      item?.equipment_name ||
      item?.nombre ||
      "",
  ).trim();
  if (!name)
    return String(item?.equipment_label || equipmentId || "Sin equipo");
  const source = { ...item, ...catalogItem, nombre: name };
  // Misma identidad que muestran las tablas del reporte:
  // `marca | nombre - modelo (nombre real)`.
  const brand = resolveEquipmentBrand(source);
  const model = resolveEquipmentModel(source);
  const realName = String(
    catalogItem?.nombre_real || item?.equipment_nombre_real || "",
  ).trim();
  const identity = [name, model].filter(Boolean).join(" - ");
  const withBrand = brand ? `${brand} | ${identity}` : identity;
  return realName ? `${withBrand} (${realName})` : withBrand;
}
function materialLabel(item: AnyRow) {
  const code = String(item?.producto_codigo || item?.codigo || "").trim();
  const name = String(
    item?.producto_nombre || item?.nombre || "Material sin nombre",
  ).trim();
  const description = String(
    item?.producto_descripcion || item?.descripcion || "",
  ).trim();
  const base =
    [code, name].filter(Boolean).join(" - ") ||
    String(item?.material_label || "Material sin nombre");
  return description ? `${base} (${description})` : base;
}
function orderCode(order: AnyRow) {
  return String(
    order?.code || order?.codigo || order?.work_order_code || "Sin código",
  );
}
function orderTitle(order: AnyRow) {
  return String(
    order?.title || order?.titulo || order?.nombre || "Orden sin título",
  );
}
function orderKey(order: AnyRow) {
  return String(
    order?.id ||
      order?.work_order_id ||
      `${orderCode(order)}-${order?.fecha || ""}`,
  );
}
function equipmentKey(equipment: AnyRow) {
  return String(
    equipment?.equipment_id ||
      equipment?.equipo_id ||
      equipmentLabel(equipment),
  );
}
function formatNumber(value: unknown, digits = 2) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}
function formatShortDate(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function primingTrendIcon(value: string) {
  if (value === "AL_ALZA") return "mdi-trending-up";
  if (value === "A_LA_BAJA") return "mdi-trending-down";
  return "mdi-trending-neutral";
}
function primingTrendLabel(value: string) {
  if (value === "AL_ALZA") return "Al alza";
  if (value === "A_LA_BAJA") return "A la baja";
  return "Estable";
}
/**
 * Si esta sesion recibe importes de materiales.
 *
 * No se pregunta por el rol: se mira si el servidor mando el campo. El backend
 * ya decide quien puede verlos, y comprobar el dato mantiene ambas partes
 * sincronizadas sin duplicar la regla. Importa porque `formatCurrency` de un
 * campo ausente imprime "$0,00", y un cero inventado desinforma mas que un
 * hueco.
 */
const muestraCostos = computed(() => {
  if (!canViewCosts.value) return false;
  const totales = oilReport.value?.totals;
  if (totales && typeof totales === "object") {
    return Object.prototype.hasOwnProperty.call(totales, "total_costo");
  }
  return true;
});

function formatCurrency(value: unknown) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}
function formatHours(value: unknown) {
  return value === null || value === undefined || value === ""
    ? "Sin registro"
    : `${formatNumber(value)} h`;
}
function formatTime(value: unknown) {
  if (!value) return "Sin registro";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Sin registro"
    : new Intl.DateTimeFormat("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
}
function formatDateTime(value: unknown) {
  return value ? formatAppDateTime(value, "Sin registro") : "Sin registro";
}
function openOrdersModal(status: StatusKey) {
  activeStatus.value = status;
  orderSearch.value = "";
  modalTrail.value = [];
  ordersDialog.value = true;
}
function openEquipmentDetail(equipment: AnyRow) {
  selectedEquipment.value = equipment;
  modalTrail.value = [];
  equipmentDialog.value = true;
}
function openOrderFromList(order: AnyRow) {
  navigateModal("orders", "detail");
  void openOrderDetail(order);
}
function openOrderFromEquipment(order: AnyRow) {
  navigateModal("equipment", "detail");
  void openOrderDetail(order);
}

async function loadWorkOrders() {
  const { data } = await api.get("/kpi_maintenance/work-orders", {
    params: { fecha_desde: startDate.value, fecha_hasta: endDate.value },
  });
  orders.value = asArray(data);
}
async function loadEquipmentCatalog() {
  // Sin recorrer las paginas solo llegaban los 10 primeros equipos, y al resto
  // no se le resolvia la marca: aparecian como "Sin marca" pese a tenerla.
  const rows = await listAllPages(
    "/kpi_maintenance/equipos",
    {},
    { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS },
  );
  equipmentCatalog.value = Array.isArray(rows) ? rows : [];
}
async function loadGenerationEquipments() {
  try {
    const types = await listAllPages(
      "/kpi_maintenance/tipo-equipo",
      {},
      { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS },
    );
    const typeIds = (Array.isArray(types) ? types : [])
      .filter(isGenerationEquipmentType)
      .map((type) => String(type?.id || "").trim())
      .filter(Boolean);
    const pages = await Promise.all(
      typeIds.map((equipmentTypeId) =>
        listAllPages(
          "/kpi_maintenance/equipos",
          { equipo_tipo_id: equipmentTypeId },
          { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS },
        ),
      ),
    );
    const byId = new Map<string, AnyRow>();
    for (const equipment of pages.flat()) {
      const id = String(equipment?.id || "").trim();
      if (id) byId.set(id, equipment);
    }
    generationEquipments.value = [...byId.values()];
  } catch {
    generationEquipments.value = [];
  }
}
async function loadInventoryReport(options?: {
  page?: number;
  itemsPerPage?: number;
}) {
  if (invalidDateRange.value) return;
  if (options?.page) inventoryPage.value = options.page;
  if (options?.itemsPerPage) inventoryItemsPerPage.value = options.itemsPerPage;
  inventoryLoading.value = true;
  try {
    const { data } = await api.get("/kpi_inventory/kardex/resumen-material", {
      params: {
        desde: startDate.value,
        hasta: endDate.value,
        search: inventorySearch.value.trim() || undefined,
        equipment_id: inventoryEquipmentId.value || undefined,
        page: inventoryPage.value,
        limit: inventoryItemsPerPage.value,
      },
    });
    const payload = unwrap(data);
    inventoryRows.value = Array.isArray(payload?.groups) ? payload.groups : [];
    inventoryTotals.value = payload?.totals || {};
    inventoryTotalItems.value = Number(payload?.pagination?.total || 0);
  } finally {
    inventoryLoading.value = false;
  }
}
let inventoryReloadTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleInventoryReload() {
  if (inventoryReloadTimer) clearTimeout(inventoryReloadTimer);
  inventoryPage.value = 1;
  inventoryReloadTimer = setTimeout(() => void loadInventoryReport(), 350);
}
function applyInventoryEquipmentFilter() {
  inventoryPage.value = 1;
  void loadInventoryReport();
}
async function loadPrimingReport() {
  if (invalidDateRange.value) return;
  primingLoading.value = true;
  try {
    const { data } = await api.get(
      "/kpi_maintenance/dashboard-administracion/cebado",
      { params: { desde: startDate.value, hasta: endDate.value } },
    );
    const payload = unwrap(data);
    primingRows.value = Array.isArray(payload?.cebado) ? payload.cebado : [];
  } finally {
    primingLoading.value = false;
  }
}
async function openPrimingDetail(equipment: AnyRow) {
  primingDetailEquipment.value = equipment;
  primingDetailRows.value = [];
  primingDetailDialog.value = true;
  primingDetailLoading.value = true;
  try {
    const { data } = await api.get(
      "/kpi_maintenance/dashboard-administracion/detalle",
      {
        params: {
          bloque: "cebado",
          equipo_id: equipment?.equipo_id,
          desde: startDate.value,
          hasta: endDate.value,
        },
      },
    );
    const payload = unwrap(data);
    primingDetailRows.value = Array.isArray(payload?.filas)
      ? payload.filas
      : [];
  } finally {
    primingDetailLoading.value = false;
  }
}
async function loadOilReport() {
  if (invalidDateRange.value) return;
  const { data } = await api.get(
    "/kpi_maintenance/inteligencia/analisis-aceite/kpi",
    {
      params: {
        periodo: "PERSONALIZADO",
        from: startDate.value,
        to: endDate.value,
        producto_id: selectedOilProductId.value || undefined,
      },
    },
  );
  oilReport.value = unwrap(data);
  if (!selectedOilProductId.value && oilReport.value?.selected_product_id)
    selectedOilProductId.value = String(oilReport.value.selected_product_id);
}
async function loadReport() {
  if (!canAccess.value || invalidDateRange.value) return;
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([
      loadEquipmentCatalog(),
      loadGenerationEquipments(),
      loadWorkOrders(),
      loadInventoryReport(),
      loadOilReport(),
      loadPrimingReport(),
    ]);
  } catch (requestError: any) {
    const message = requestError?.response?.data?.message;
    error.value = Array.isArray(message)
      ? message.join(". ")
      : message || "No se pudo cargar el reporte detallado para este rango.";
  } finally {
    loading.value = false;
  }
}

function detailLines(rows: AnyRow[]) {
  return rows.flatMap((header) => {
    const details = header?.detalles || header?.details || header?.items || [];
    return Array.isArray(details) && details.length
      ? details.map((detail: AnyRow) => ({ ...header, ...detail }))
      : [header];
  });
}
const responsibleRows = computed(() => {
  const rows = new Map<string, { key: string; label: string; hours: number }>();
  for (const task of detailTasks.value)
    for (const responsible of Array.isArray(task?.responsables)
      ? task.responsables
      : []) {
      const key = String(
        responsible?.user_id ||
          responsible?.id ||
          responsible?.username ||
          responsible?.display_name ||
          "SIN_USUARIO",
      );
      const current = rows.get(key) ?? {
        key,
        label: String(
          responsible?.display_name ||
            responsible?.nameSurname ||
            responsible?.username ||
            "Responsable",
        ),
        hours: 0,
      };
      current.hours += Number(responsible?.horas || 0);
      rows.set(key, current);
    }
  return [...rows.values()].sort((a, b) => b.hours - a.hours);
});
const totalResponsibleHours = computed(() =>
  responsibleRows.value.reduce((sum, row) => sum + row.hours, 0),
);
const materialCost = computed(() =>
  detailConsumptions.value.reduce(
    (sum, row) => sum + Number(row?.subtotal || row?.subtotal_costo || 0),
    0,
  ),
);
const laborCost = computed(() =>
  detailTasks.value.reduce(
    (sum, row) =>
      sum +
      Number(row?.costo_mano_obra || row?.costo_total || row?.subtotal || 0),
    0,
  ),
);
const totalWorkCost = computed(() => materialCost.value + laborCost.value);
function isOil(row: AnyRow) {
  return (
    row?.es_aceite === true ||
    row?.producto_es_aceite === true ||
    /ACEITE|LUBRICANTE/.test(
      materialLabel(row)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase(),
    )
  );
}
const oilConsumptionRows = computed(() =>
  detailConsumptions.value.filter(isOil),
);
const orderOilQuantity = computed(() =>
  oilConsumptionRows.value.reduce(
    (sum, row) => sum + Number(row?.cantidad || 0),
    0,
  ),
);
const orderOilCost = computed(() =>
  oilConsumptionRows.value.reduce(
    (sum, row) => sum + Number(row?.subtotal || row?.subtotal_costo || 0),
    0,
  ),
);
const oilDelivered = computed(() => {
  const ids = new Set(
    oilConsumptionRows.value
      .map((row) => String(row?.producto_id || ""))
      .filter(Boolean),
  );
  return detailLines(detailIssues.value).some(
    (row) =>
      ids.has(String(row?.producto_id || "")) && Number(row?.cantidad || 0) > 0,
  );
});
const materialRows = computed(() => {
  const rows = new Map<
    string,
    { key: string; label: string; delivered: number; scrapped: number }
  >();
  for (const item of detailLines(detailIssues.value)) {
    const key = String(item?.producto_id || materialLabel(item));
    const current = rows.get(key) ?? {
      key,
      label: materialLabel(item),
      delivered: 0,
      scrapped: 0,
    };
    current.delivered += Number(item?.cantidad || 0);
    rows.set(key, current);
  }
  for (const item of detailLines(detailScraps.value)) {
    const key = String(item?.producto_id || materialLabel(item));
    const current = rows.get(key) ?? {
      key,
      label: materialLabel(item),
      delivered: 0,
      scrapped: 0,
    };
    current.scrapped += Number(item?.cantidad || 0);
    rows.set(key, current);
  }
  return [...rows.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  );
});
const firstHistoryActor = computed(
  () => detailHistory.value[0]?.changed_by || null,
);
const lastHistoryActor = computed(
  () => detailHistory.value[detailHistory.value.length - 1]?.changed_by || null,
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
  detailHeader.value = { ...order };
  detailError.value = null;
  const id = String(order?.id || order?.work_order_id || "").trim();
  try {
    const [headerResponse, tasks, consumptions, issues, scraps, history] =
      await Promise.all([
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
    detailError.value =
      requestError?.response?.data?.message ||
      "No se pudo cargar el detalle de la orden.";
  } finally {
    detailLoading.value = false;
  }
}
/* ------------------------------------------------------------------------
 * Reportes del sistema (antes un modulo aparte)
 * --------------------------------------------------------------------- */

const systemPayload = ref<AnyRow | null>(null);
const systemLoading = ref(false);
const systemError = ref<string | null>(null);
const systemTab = ref("horas_trabajadas");
const systemGroupBy = ref("OT");
const systemWarehouseId = ref<string | null>(null);
const systemEquipmentId = ref<string | null>(null);
const userCatalogRows = ref<AnyRow[]>([]);

const systemGroupOptions = [
  { title: "OT", value: "OT" },
  { title: "Bodega", value: "BODEGA" },
  { title: "Equipo", value: "EQUIPO" },
  { title: "Responsable", value: "RESPONSABLE" },
  { title: "Material", value: "MATERIAL" },
  { title: "Mes", value: "MES" },
];

const SYSTEM_SECTION_DEFS = [
  {
    key: "horas_trabajadas",
    title: "Horas trabajadas",
    subtitle:
      "Horas registradas por OT, responsable o agrupacion seleccionada.",
    icon: "mdi-timer-outline",
  },
  {
    key: "responsables_ot",
    title: "Quienes trabajaron",
    subtitle: "Responsables con horas registradas por orden de trabajo.",
    icon: "mdi-account-hard-hat-outline",
  },
  {
    key: "costo_inventario",
    title: "Costo del inventario",
    subtitle: "Inventario valorizado por bodega o material.",
    icon: "mdi-warehouse",
  },
  {
    key: "repuestos_cambiados",
    title: "Repuestos cambiados",
    subtitle:
      "Solo reemplazos con flujo completo: salio el repuesto nuevo de bodega y el viejo entro a chatarra.",
    icon: "mdi-cog-transfer-outline",
  },
  {
    key: "inventario_consumido",
    title: "Inventario consumido",
    subtitle: "Materiales usados en las ordenes segun la agrupacion activa.",
    icon: "mdi-package-variant-minus",
  },
  {
    key: "top_materiales_utilizados",
    title: "Top 10 materiales",
    subtitle: "Materiales mas usados en el rango consultado.",
    icon: "mdi-podium-gold",
  },
];

/**
 * `total_horas` son las horas que realmente reportaron los responsables y
 * `horas_a_realizar_ot` la hora pactada en la OT. Las etiquetas estaban al
 * reves, que es justo el par que se presta a confusion.
 */
const SYSTEM_FIELD_LABELS: Record<string, string> = {
  fecha_referencia: "Fecha",
  periodo: "Periodo",
  work_order_code: "Codigo OT",
  work_order_title: "Titulo OT",
  work_order_status: "Estado OT",
  maintenance_kind_label: "Tipo",
  equipment_label: "Equipo",
  equipment_name: "Equipo",
  plan_name: "Plan",
  procedure_label: "Plantilla",
  consumo_bodegas: "Bodegas consumo",
  horometro_actual_ot: "Horometro actual",
  horas_a_realizar_ot: "Horas",
  responsable: "Responsable",
  responsables: "Responsables",
  ordenes_trabajo: "Ordenes trabajo",
  equipos: "Equipos",
  bodegas: "Bodegas",
  material_label: "Material",
  detalle_ordenes: "Detalle",
  total_horas: "Horas - hombre",
  total_responsables: "Cantidad responsables",
  total_ordenes: "OT",
  total_items: "Registros",
  total_materiales: "Materiales",
  materiales: "Materiales",
  total_cantidad: "Cantidad",
  total_costo: "Costo total",
  total_stock: "Stock actual",
  costo_unitario: "Costo unitario",
  costo_unitario_promedio: "Costo unitario promedio",
  total_costo_inventario: "Costo inventario",
};

const SYSTEM_OT_COLUMNS = [
  "work_order_code",
  "work_order_status",
  "maintenance_kind_label",
  "fecha_referencia",
  "equipment_name",
  "plan_name",
  "horometro_actual_ot",
  "horas_a_realizar_ot",
];

const SYSTEM_COLUMN_OVERRIDES: Record<string, Record<string, string[]>> = {
  horas_trabajadas: {
    OT: [
      ...SYSTEM_OT_COLUMNS,
      "total_horas",
      "total_responsables",
      "responsables",
    ],
  },
  costo_mantenimiento: {
    OT: [...SYSTEM_OT_COLUMNS, "total_costo", "total_cantidad", "materiales"],
  },
  responsables_ot: {
    OT: [
      ...SYSTEM_OT_COLUMNS,
      "total_horas",
      "total_responsables",
      "responsables",
    ],
  },
  repuestos_cambiados: {
    OT: [
      ...SYSTEM_OT_COLUMNS,
      "material_label",
      "total_cantidad",
      "total_costo",
    ],
  },
  inventario_consumido: {
    OT: [
      ...SYSTEM_OT_COLUMNS,
      "material_label",
      "total_cantidad",
      "total_costo",
    ],
  },
};

/**
 * Campos que nunca son columna: identificadores internos y duplicados.
 *
 * La bodega se retira de la vista por OT (no aporta al leer y competia por el
 * ancho con el equipo y el material), pero NO se oculta globalmente: al agrupar
 * por bodega es justo la columna que identifica la fila. Lo mismo vale para
 * `equipment_label` al agrupar por equipo. Quitarlas de aqui y dejar que la
 * lista de columnas por OT decida es lo que mantiene ambas vistas legibles.
 */
const SYSTEM_HIDDEN_FIELDS = new Set([
  "work_order_id",
  "equipos",
  "equipos_lista",
  "bodegas",
  "consumo_bodegas",
  "ordenes_trabajo",
  "equipment_id",
  "equipment_code",
  "plan_id",
  "plan_code",
  "procedure_id",
  "procedure_code",
  "procedure_name",
  "bodega_id",
  "producto_id",
  "user_id",
  "work_order_type",
  "maintenance_kind",
  "is_maintenance",
  "responsables_meta",
  "equipos_lista",
  "period_key",
  // El tipo de equipo solo lo usa la seccion de costo de mantenimiento, que
  // arma sus pestanas con el; como columna repetiria lo que ya dice el equipo.
  "equipment_type_id",
  "equipment_type_label",
  "_raw",
]);

const systemWarehouseOptions = computed<AnyRow[]>(() =>
  Array.isArray(systemPayload.value?.catalogs?.bodegas)
    ? systemPayload.value.catalogs.bodegas
    : [],
);
const systemEquipmentOptions = computed<AnyRow[]>(() =>
  Array.isArray(systemPayload.value?.catalogs?.equipos)
    ? systemPayload.value.catalogs.equipos
    : [],
);

const userCatalogMap = computed(
  () =>
    new Map(
      userCatalogRows.value.map(
        (item) => [String(item?.id || "").trim(), item] as const,
      ),
    ),
);

function isUuidLike(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    ) || /^[0-9a-f]{32}$/i.test(normalized)
  );
}

function buildUserDisplayName(user: AnyRow | null | undefined) {
  const label = String(
    user?.nameSurname || user?.nameUser || user?.email || "",
  ).trim();
  if (label) return label;
  const fallbackId = String(user?.id || "").trim();
  return fallbackId && !isUuidLike(fallbackId)
    ? fallbackId
    : "Usuario asignado";
}

function resolveResponsibleLabel(value: unknown, userId?: unknown) {
  const normalizedUserId = String(userId ?? "").trim();
  if (normalizedUserId) {
    const catalogUser = userCatalogMap.value.get(normalizedUserId);
    if (catalogUser) return buildUserDisplayName(catalogUser);
  }
  const raw = String(value ?? "").trim();
  if (raw && !isUuidLike(raw)) return raw;
  if (raw) {
    const catalogUser = userCatalogMap.value.get(raw);
    if (catalogUser) return buildUserDisplayName(catalogUser);
  }
  return "Usuario asignado";
}

function looksLikeDate(value: unknown) {
  return /^\d{4}-\d{2}-\d{2}/.test(String(value ?? "").trim());
}

const SYSTEM_STATUS_LABELS: Record<string, string> = {
  REVIEW: "EN REVISIÓN",
  IN_REVIEW: "EN REVISIÓN",
  CLOSED: "CERRADA",
  COMPLETED: "FINALIZADA",
  PLANNED: "PLANIFICADA",
  SCHEDULED: "PROGRAMADA",
  OPEN: "ABIERTA",
  IN_PROGRESS: "EN PROGRESO",
  BLOCKED: "BLOQUEADA",
  CANCELLED: "CANCELADA",
  CANCELED: "CANCELADA",
  VOIDED: "ANULADA",
  ANNULLED: "ANULADA",
};

function formatSystemStatus(value: unknown) {
  const normalized = normalizeStatus(value).replace(/[\s-]+/g, "_");
  return SYSTEM_STATUS_LABELS[normalized] || String(value || "");
}

function formatSystemCell(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.join(" | ");
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (/status|estado/i.test(key)) return formatSystemStatus(value);
  if (looksLikeDate(value) && /fecha|date|(?:^|_)at$|inicio|fin|periodo/i.test(key))
    return formatAppDateOnly(value, String(value));
  const numeric = Number(value);
  if (Number.isFinite(numeric) && String(value).trim() !== "") {
    if (/costo|valor/i.test(key)) return formatCurrency(numeric);
    if (/hora/i.test(key)) return `${formatNumber(numeric)} h`;
    return formatNumber(
      numeric,
      /ordenes|items|materiales|responsables/i.test(key) ? 0 : 4,
    );
  }
  return String(value);
}

function systemVisibleKeys(rows: AnyRow[], preferred?: string[]) {
  const keys = new Set<string>();
  for (const row of rows)
    for (const key of Object.keys(row || {}))
      if (!SYSTEM_HIDDEN_FIELDS.has(key)) keys.add(key);
  return preferred?.length
    ? preferred.filter((key) => keys.has(key))
    : [...keys];
}

const systemSections = computed(() =>
  SYSTEM_SECTION_DEFS.filter(
    (section) => canViewCosts.value || section.key !== "costo_inventario",
  ).map((section) => {
    const source = systemPayload.value?.reports?.[section.key] ?? {};
    const rawRows: AnyRow[] = Array.isArray(source?.rows) ? source.rows : [];
    const groupBy = String(
      source?.group_by || systemPayload.value?.filters?.group_by || "OT",
    )
      .trim()
      .toUpperCase();
    const keys = systemVisibleKeys(
      rawRows,
      SYSTEM_COLUMN_OVERRIDES[section.key]?.[groupBy],
    );
    return {
      ...section,
      count: rawRows.length,
      groupLabel: `Agrupado por ${groupBy}`,
      headers: keys.map((key) => ({
        title: SYSTEM_FIELD_LABELS[key] ?? key,
        key,
      })),
      // Se guarda la fila cruda junto a la formateada: el enlace de la OT y el
      // boton de responsables necesitan los identificadores que la tabla oculta.
      rows: rawRows.map((row) => ({
        ...Object.fromEntries(
          keys.map((key) => [key, formatSystemCell(key, row?.[key])]),
        ),
        _raw: row,
      })),
    };
  }),
);

function systemRow(item: AnyRow): AnyRow {
  return (item?.raw ?? item) as AnyRow;
}

function systemRawRow(item: AnyRow): AnyRow {
  return (systemRow(item)?._raw ?? systemRow(item)) as AnyRow;
}

function rowResponsables(item: AnyRow) {
  const raw = systemRawRow(item);
  const meta = Array.isArray(raw?.responsables_meta)
    ? raw.responsables_meta
    : [];
  if (meta.length) {
    return meta.map((entry: AnyRow) => ({
      label: resolveResponsibleLabel(
        entry?.display_name ??
          entry?.nameSurname ??
          entry?.username ??
          entry?.user_id,
        entry?.user_id,
      ),
      hours: Number(entry?.horas || 0),
    }));
  }
  return String(raw?.responsables || "")
    .split("|")
    .map((chunk) => String(chunk || "").trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/^(.*?)\s*\(([\d.,]+)\s*h\)$/);
      return match
        ? {
            label: resolveResponsibleLabel(match[1]),
            hours: Number(String(match[2]).replace(",", ".")) || 0,
          }
        : { label: resolveResponsibleLabel(chunk), hours: 0 };
    });
}

async function loadSystemReports() {
  if (!canAccess.value || invalidDateRange.value) return;
  systemLoading.value = true;
  systemError.value = null;
  try {
    const { data } = await api.get(
      "/kpi_maintenance/inteligencia/reportes-sistema",
      {
        params: {
          from: startDate.value,
          to: endDate.value,
          bodega_id: systemWarehouseId.value || undefined,
          equipment_id: systemEquipmentId.value || undefined,
          group_by: systemGroupBy.value || undefined,
        },
      },
    );
    systemPayload.value = unwrap(data);
  } catch (requestError: any) {
    systemError.value =
      requestError?.response?.data?.message ||
      "No se pudieron generar los reportes del sistema.";
  } finally {
    systemLoading.value = false;
  }
}

async function loadUserCatalog() {
  try {
    const rows = await listAllPages(
      "/kpi_security/users",
      { includeDeleted: false },
      { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS },
    );
    userCatalogRows.value = Array.isArray(rows) ? rows : [];
  } catch {
    userCatalogRows.value = [];
  }
}

/* ------------------------------------------------------------------------
 * Costo de mantenimiento
 *
 * Vive en su propia seccion, no como una pestana mas de "Reportes del
 * sistema": se lee por tipo de equipo (una pestana por tipo y una totalizada
 * al final) y responde a su propio rango de fechas y bodega, porque el costo
 * casi nunca se revisa con el mismo recorte que el resto del tablero.
 * --------------------------------------------------------------------- */

const MAINTENANCE_COST_TOTAL_TAB = "__TOTALIZADO__";
const MAINTENANCE_COST_NO_TYPE_TAB = "__SIN_TIPO__";

const maintenanceCostPayload = ref<AnyRow | null>(null);
const maintenanceCostLoading = ref(false);
const maintenanceCostError = ref<string | null>(null);
const maintenanceCostStart = ref(startDate.value);
const maintenanceCostEnd = ref(endDate.value);
const maintenanceCostWarehouseId = ref<string | null>(null);
const maintenanceCostTab = ref(MAINTENANCE_COST_TOTAL_TAB);

const invalidMaintenanceCostRange = computed(
  () =>
    !maintenanceCostStart.value ||
    !maintenanceCostEnd.value ||
    maintenanceCostStart.value > maintenanceCostEnd.value,
);

const maintenanceCostRangeLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const from = new Date(`${maintenanceCostStart.value}T12:00:00`);
  const to = new Date(`${maintenanceCostEnd.value}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return "Rango sin definir";
  return `${formatter.format(from)} al ${formatter.format(to)}`;
});

/**
 * Las bodegas llegan dentro del propio reporte. Mientras no haya respuesta se
 * reutilizan las del bloque de sistema para que el selector no aparezca vacio.
 */
const maintenanceCostWarehouseOptions = computed<AnyRow[]>(() => {
  const own = maintenanceCostPayload.value?.catalogs?.bodegas;
  if (Array.isArray(own) && own.length) return own;
  return systemWarehouseOptions.value;
});

const maintenanceCostRawRows = computed<AnyRow[]>(() => {
  const rows = maintenanceCostPayload.value?.reports?.costo_mantenimiento?.rows;
  return Array.isArray(rows) ? rows : [];
});

const maintenanceCostHeaders = computed(() => {
  const keys = systemVisibleKeys(
    maintenanceCostRawRows.value,
    SYSTEM_COLUMN_OVERRIDES.costo_mantenimiento?.OT,
  );
  return keys.map((key) => ({
    title: SYSTEM_FIELD_LABELS[key] ?? key,
    key,
  }));
});

function buildMaintenanceCostRow(row: AnyRow) {
  return {
    ...Object.fromEntries(
      maintenanceCostHeaders.value.map((header) => [
        header.key,
        formatSystemCell(header.key, row?.[header.key]),
      ]),
    ),
    _raw: row,
  };
}

function sumMaintenanceCost(rows: AnyRow[], key: string) {
  return rows.reduce((acc, row) => acc + Number(row?.[key] || 0), 0);
}

/**
 * Catalogo de tipos de equipo: manda el, no los datos.
 *
 * Las pestanas se abrian desde las filas del reporte, asi que un tipo sin costo
 * en el rango simplemente no existia y uno recien creado no aparecia hasta que
 * alguien le cargara una OT. Ahora cada tipo del catalogo tiene su pestana,
 * aunque salga vacia, y el tablero sigue al maestro de tipos de equipo.
 */
const maintenanceCostTypeCatalog = computed<AnyRow[]>(() => {
  const rows = maintenanceCostPayload.value?.catalogs?.tipos_equipo;
  return Array.isArray(rows) ? rows : [];
});

function buildMaintenanceCostTab(
  key: string,
  title: string,
  subtitle: string,
  icon: string,
  rows: AnyRow[],
) {
  return {
    key,
    title,
    subtitle,
    icon,
    rows: rows.map(buildMaintenanceCostRow),
    totalCosto: sumMaintenanceCost(rows, "total_costo"),
    totalCantidad: sumMaintenanceCost(rows, "total_cantidad"),
  };
}

const maintenanceCostTabs = computed(() => {
  const byTypeId = new Map<string, AnyRow[]>();
  const withoutType: AnyRow[] = [];
  for (const row of maintenanceCostRawRows.value) {
    const typeId = String(row?.equipment_type_id || "").trim();
    if (!typeId) {
      withoutType.push(row);
      continue;
    }
    const current = byTypeId.get(typeId) ?? [];
    current.push(row);
    byTypeId.set(typeId, current);
  }

  const catalogTabs = maintenanceCostTypeCatalog.value.map((type) => {
    const typeId = String(type?.id || "").trim();
    const label =
      String(type?.label || type?.nombre || type?.codigo || "").trim() ||
      "Tipo sin nombre";
    return buildMaintenanceCostTab(
      typeId || label,
      label,
      `Órdenes de mantenimiento de equipos del tipo ${label}.`,
      "mdi-engine-outline",
      byTypeId.get(typeId) ?? [],
    );
  });

  // Solo si de verdad hay costo sin tipo: una pestana vacia "Sin tipo" seria
  // ruido en un catalogo que si los tiene todos.
  const orphanTabs = withoutType.length
    ? [
        buildMaintenanceCostTab(
          MAINTENANCE_COST_NO_TYPE_TAB,
          "Sin tipo de equipo",
          "Órdenes cuyo equipo no tiene tipo asignado.",
          "mdi-help-rhombus-outline",
          withoutType,
        ),
      ]
    : [];

  return [
    ...catalogTabs,
    ...orphanTabs,
    buildMaintenanceCostTab(
      MAINTENANCE_COST_TOTAL_TAB,
      "Totalizado",
      "Todos los tipos de equipo sumados en un solo listado.",
      "mdi-sigma",
      maintenanceCostRawRows.value,
    ),
  ];
});

async function loadMaintenanceCostReport() {
  if (!canAccess.value || invalidMaintenanceCostRange.value) return;
  maintenanceCostLoading.value = true;
  maintenanceCostError.value = null;
  try {
    const { data } = await api.get(
      "/kpi_maintenance/inteligencia/reportes-sistema",
      {
        params: {
          from: maintenanceCostStart.value,
          to: maintenanceCostEnd.value,
          bodega_id: maintenanceCostWarehouseId.value || undefined,
          // Siempre por OT: las pestanas ya separan por tipo de equipo y el
          // totalizado suma esas mismas filas.
          group_by: "OT",
        },
      },
    );
    maintenanceCostPayload.value = unwrap(data);
  } catch (requestError: any) {
    maintenanceCostError.value =
      requestError?.response?.data?.message ||
      "No se pudo generar el costo de mantenimiento.";
  } finally {
    maintenanceCostLoading.value = false;
  }
}

/* ------------------------------------------------------------------------
 * Navegacion entre modales
 * --------------------------------------------------------------------- */

type ModalName =
  "orders" | "equipment" | "detail" | "responsables" | "lista" | "ordenes";

/**
 * Rastro de modales visitadas para poder volver atras.
 *
 * Encadenar modales cerrando la anterior perdia el hilo: quien entraba a una
 * orden desde la lista no tenia forma de regresar a la lista. El rastro guarda
 * de donde se vino; el estado de cada modal vive en sus propios refs, asi que
 * volver es simplemente reabrir la bandera correspondiente.
 */
const modalTrail = ref<ModalName[]>([]);
const responsablesDialog = ref(false);
const responsablesRows = ref<Array<{ label: string; hours: number }>>([]);
const responsablesOrder = ref<string>("");

/**
 * Celdas que traen una lista unida por "|" (equipos, materiales, ordenes).
 *
 * Puestas en linea desbordaban la tabla: un solo material podia arrastrar la
 * lista de una decena de unidades y estirar la pantalla entera. Se resumen con
 * un boton y el contenido se lee en una modal.
 */
const listaDialog = ref(false);
const listaTitulo = ref("");
const listaSubtitulo = ref("");
const listaItems = ref<string[]>([]);

/**
 * Celdas que siguen siendo una lista simple.
 *
 * Equipos, ordenes y bodegas se retiraron como columnas propias: eran tres
 * botones seguidos diciendo casi lo mismo. Ahora una sola columna de detalle
 * lleva las ordenes con su equipo y su tipo, que es lo que explica la fila.
 */
const LIST_CELL_LABELS: Record<string, string> = {
  materiales: "Materiales",
};

const LIST_CELL_KEYS = Object.keys(LIST_CELL_LABELS);

/**
 * Ordenes que explican una fila resumida, con su equipo y su tipo.
 *
 * El numero de orden queda enlazado al informe: desde aqui se entra al detalle
 * y la flecha de volver devuelve a esta lista.
 */
type OrdenDetalle = {
  work_order_id?: string | null;
  work_order_code?: string | null;
  equipment_name?: string | null;
  maintenance_kind_label?: string | null;
};

const ordenesDialog = ref(false);
const ordenesRows = ref<OrdenDetalle[]>([]);
const ordenesSubtitulo = ref("");

function ordenDetalleRows(item: AnyRow): OrdenDetalle[] {
  const raw = systemRawRow(item)?.detalle_ordenes;
  return Array.isArray(raw) ? (raw as OrdenDetalle[]) : [];
}

function openOrdenesDetalle(item: AnyRow) {
  const raw = systemRawRow(item);
  ordenesRows.value = ordenDetalleRows(item);
  ordenesSubtitulo.value = String(
    raw?.material_label ||
      raw?.responsable ||
      raw?.equipment_name ||
      raw?.bodega_label ||
      raw?.periodo ||
      "Resumen",
  );
  modalTrail.value = [];
  navigateModal(null, "ordenes");
}

async function openOrderFromDetalle(orden: OrdenDetalle) {
  const id = String(orden?.work_order_id || "").trim();
  if (!id) return;
  navigateModal("ordenes", "detail");
  await openOrderDetail({
    id,
    code: orden.work_order_code,
    equipment_label: orden.equipment_name,
  });
}

function splitListCell(value: unknown) {
  return String(value ?? "")
    .split("|")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

/**
 * La lista real de una celda agregada.
 *
 * Se prefiere el arreglo `<campo>_lista` cuando el backend lo manda: la
 * etiqueta del equipo contiene " | " (marca | nombre), asi que partir la
 * cadena unida por ese mismo separador trocearia cada nombre en dos.
 */
function listCellItems(item: AnyRow, key: string) {
  const raw = systemRawRow(item);
  const lista = raw?.[`${key}_lista`];
  if (Array.isArray(lista)) {
    return lista.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  return splitListCell(raw?.[key]);
}

function openListCell(item: AnyRow, key: string) {
  const raw = systemRawRow(item);
  listaItems.value = listCellItems(item, key);
  listaTitulo.value = LIST_CELL_LABELS[key] ?? key;
  listaSubtitulo.value = String(
    raw?.material_label || raw?.work_order_code || raw?.equipment_name || "",
  );
  modalTrail.value = [];
  navigateModal(null, "lista");
}

function setModal(name: ModalName, open: boolean) {
  if (name === "orders") ordersDialog.value = open;
  else if (name === "equipment") equipmentDialog.value = open;
  else if (name === "detail") detailDialog.value = open;
  else if (name === "lista") listaDialog.value = open;
  else if (name === "ordenes") ordenesDialog.value = open;
  else responsablesDialog.value = open;
}

function navigateModal(from: ModalName | null, to: ModalName) {
  if (from) {
    modalTrail.value.push(from);
    setModal(from, false);
  }
  setModal(to, true);
}

const canGoBackModal = computed(() => modalTrail.value.length > 0);

function goBackModal(current: ModalName) {
  const previous = modalTrail.value.pop();
  if (!previous) return;
  setModal(current, false);
  setModal(previous, true);
}

function closeModal(current: ModalName) {
  setModal(current, false);
  modalTrail.value = [];
}

function openResponsablesFromRow(item: AnyRow) {
  const raw = systemRawRow(item);
  responsablesRows.value = rowResponsables(item);
  responsablesOrder.value = String(raw?.work_order_code || "Orden");
  modalTrail.value = [];
  navigateModal(null, "responsables");
}

async function openOrderFromSystemRow(item: AnyRow) {
  const raw = systemRawRow(item);
  const id = String(raw?.work_order_id || "").trim();
  if (!id) return;
  modalTrail.value = [];
  navigateModal(null, "detail");
  await openOrderDetail({
    id,
    code: raw?.work_order_code,
    title: raw?.work_order_title,
    equipment_label: raw?.equipment_name,
  });
}

/* ------------------------------------------------------------------------
 * Previsualizacion del informe en PDF
 * --------------------------------------------------------------------- */

const pdfDialog = ref(false);
const pdfLoading = ref(false);
const pdfError = ref<string | null>(null);
const pdfUrl = ref<string | null>(null);

function buildWorkOrderReportData(): WorkOrderReportData {
  return {
    code: orderCode(selectedOrder.value || detailHeader.value || {}),
    title: orderTitle(selectedOrder.value || detailHeader.value || {}),
    equipmentLabel: equipmentLabel(
      detailHeader.value || selectedOrder.value || {},
    ),
    statusLabel: String(
      detailHeader.value?.status_workflow || detailHeader.value?.status || "",
    ),
    maintenanceKindLabel: String(
      detailHeader.value?.maintenance_kind_label ||
        detailHeader.value?.maintenance_kind ||
        "",
    ),
    openedAt: formatDateTime(
      detailHeader.value?.started_at || detailHeader.value?.created_at,
    ),
    closedAt: formatDateTime(detailHeader.value?.closed_at),
    horometroAnterior: formatHours(detailHeader.value?.horometro_anterior),
    horometroActual: formatHours(detailHeader.value?.horometro_actual),
    totalHours: totalResponsibleHours.value,
    totalCost: formatCurrency(totalWorkCost.value),
    responsables: responsibleRows.value.map((row) => ({
      label: row.label,
      hours: row.hours,
    })),
    materiales: materialRows.value.map((row) => ({
      label: row.label,
      delivered: row.delivered,
      scrapped: row.scrapped,
    })),
    oilQuantity: orderOilQuantity.value,
    oilCost: formatCurrency(orderOilCost.value),
    oilDelivered: oilDelivered.value,
    createdBy: String(
      detailHeader.value?.created_by_label ||
        detailHeader.value?.created_by ||
        "",
    ),
    processedBy: String(
      detailHeader.value?.processed_by_label || firstHistoryActor.value || "",
    ),
    updatedBy: String(
      detailHeader.value?.updated_by || lastHistoryActor.value || "",
    ),
  };
}

function releasePdfUrl() {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
  pdfUrl.value = null;
}

/**
 * La previsualizacion se superpone al detalle a proposito: quien mira el PDF
 * sigue teniendo debajo la orden de la que salio.
 */
async function openPdfPreview() {
  pdfDialog.value = true;
  pdfLoading.value = true;
  pdfError.value = null;
  releasePdfUrl();
  try {
    const blob = await buildWorkOrderReportPdfBlob(buildWorkOrderReportData());
    pdfUrl.value = URL.createObjectURL(blob);
  } catch (requestError: any) {
    pdfError.value =
      requestError?.message || "No se pudo generar el informe en PDF.";
  } finally {
    pdfLoading.value = false;
  }
}

function closePdfPreview() {
  pdfDialog.value = false;
  releasePdfUrl();
}

async function downloadOrderReport() {
  try {
    await downloadWorkOrderReportPdf(buildWorkOrderReportData());
  } catch (requestError: any) {
    pdfError.value =
      requestError?.message || "No se pudo descargar el informe en PDF.";
  }
}

onBeforeUnmount(() => {
  releasePdfUrl();
  if (inventoryReloadTimer) clearTimeout(inventoryReloadTimer);
});

onMounted(() => {
  void loadReport();
  void loadUserCatalog();
  void loadSystemReports();
  void loadMaintenanceCostReport();
});
</script>

<style scoped>
.system-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.inventory-searches {
  display: grid;
  width: min(720px, 100%);
  grid-template-columns: repeat(2, minmax(240px, 1fr));
  gap: 12px;
}

.inventory-totals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin-top: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.11);
}

.inventory-totals article {
  display: grid;
  gap: 5px;
  min-height: 104px;
  align-content: center;
  padding: 16px 20px;
  background: rgb(var(--v-theme-surface));
}

.inventory-totals span,
.inventory-totals small {
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.inventory-totals strong {
  font-size: 1.28rem;
  font-variant-numeric: tabular-nums;
}

.inventory-totals__grand {
  background: rgba(var(--manager-blue), 0.07) !important;
}

.priming-legend,
.priming-levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.priming-legend {
  margin-bottom: 16px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.86rem;
}

.priming-legend span,
.priming-trend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.priming-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.priming-dot--green,
.priming-chip--verde,
.priming-chip--green {
  --priming-color: 21, 128, 61;
}

.priming-dot--amber,
.priming-chip--amarillo,
.priming-chip--amber {
  --priming-color: 180, 83, 9;
}

.priming-dot--red,
.priming-chip--rojo,
.priming-chip--red {
  --priming-color: 185, 28, 28;
}

.priming-dot {
  background: rgb(var(--priming-color));
}

.priming-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid rgba(var(--priming-color), 0.35);
  border-radius: 999px;
  color: rgb(var(--priming-color));
  background: rgba(var(--priming-color), 0.1);
  font-size: 0.76rem;
  font-weight: 800;
}

.priming-dialog-header {
  grid-template-columns: minmax(0, 1fr) auto;
}

.system-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 2px 10px;
}

.system-section-head strong {
  display: block;
  font-size: 0.98rem;
}

.system-section-head span {
  display: block;
  font-size: 0.82rem;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}

/* Atributos del material bajo su nombre: explican por que una fila sobrevive
   a los filtros de marca, categoria, unidad o aceite. */
.material-attrs {
  font-size: 0.76rem;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}

/* La sumatoria cierra la tabla: se despega del zebra con un borde superior y
   se lee en negrita para no confundirla con un registro mas. */
.totals-row td {
  font-weight: 700;
  border-top: 2px solid rgb(var(--v-theme-primary, 47 108 171));
  background: rgba(var(--v-theme-primary, 47 108 171), 0.06);
  font-variant-numeric: tabular-nums;
}

/* El codigo de OT es el punto de entrada al informe: se ve como enlace pero
   sigue siendo un boton, que es lo que de verdad hace. */
.order-link {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.order-link:hover,
.order-link:focus-visible {
  text-decoration-thickness: 2px;
}

.pdf-preview__body {
  padding: 0;
  min-height: 60vh;
}

.pdf-preview__frame {
  width: 100%;
  height: 70vh;
  border: 0;
  display: block;
}

/* Solo las columnas cortas evitan el salto de linea. Aplicarlo a todas hacia
   la tabla desmesuradamente ancha por culpa de las celdas de texto largo. */
.system-table :deep(th) {
  white-space: nowrap;
}

.system-table :deep(td) {
  white-space: normal;
  word-break: break-word;
}

.system-table :deep(table) {
  min-width: 1120px;
}

.system-cell {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.system-cell--equipment {
  min-width: 260px;
}

.system-cell--plan {
  min-width: 210px;
}

.system-table :deep(td:first-child),
.system-table :deep(td:nth-child(2)),
.system-table :deep(td:nth-child(3)),
.system-table :deep(td:nth-child(4)) {
  white-space: nowrap;
}

.ordenes-table {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
  border-radius: 14px;
  overflow: hidden;
}

.ordenes-table :deep(td),
.ordenes-table :deep(th) {
  white-space: normal;
}

.list-cell-empty {
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.detailed-report {
  --manager-blue: 37, 99, 235;
  --manager-amber: 180, 83, 9;
  --manager-green: 21, 128, 61;
  display: grid;
  /* Sin columna declarada, la pista implicita se dimensiona al contenido mas
     ancho: una tabla larga estiraba TODAS las secciones (incluida la cabecera)
     y la pantalla perdia el lado derecho. `minmax(0, 1fr)` fija el ancho al
     contenedor y `min-width: 0` permite que cada seccion encoja; lo que no
     quepa se desplaza dentro de su propia caja, no empujando la pagina. */
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
  max-width: 1500px;
  margin: 0 auto;
  color: rgb(var(--v-theme-on-surface));
}

.detailed-report > * {
  min-width: 0;
}
.report-heading,
.simple-section,
.order-card,
.empty-panel,
.equipment-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
}
.report-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(24px, 4vw, 40px);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(var(--manager-blue), 0.11), transparent 58%),
    rgb(var(--v-theme-surface));
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
.report-heading h1 {
  font-size: clamp(2rem, 4vw, 3rem);
}
.report-heading p,
.section-title-row p {
  margin: 7px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 1rem;
}
.report-heading__actions {
  display: grid;
  min-width: min(650px, 52vw);
  grid-template-columns: repeat(2, minmax(180px, 1fr)) auto;
  align-items: center;
  gap: 12px;
}
.report-heading__actions .v-btn {
  min-height: 52px;
}
.section-title-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}
.section-title-row h2 {
  font-size: clamp(1.4rem, 2.5vw, 1.9rem);
}
.order-search,
.oil-select {
  max-width: 380px;
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.status-button {
  --status-color: var(--manager-blue);
  display: grid;
  min-height: 150px;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border: 2px solid rgba(var(--status-color), 0.2);
  border-radius: 22px;
  color: rgb(var(--v-theme-on-surface));
  background:
    linear-gradient(145deg, rgba(var(--status-color), 0.1), transparent 72%),
    rgb(var(--v-theme-surface));
  text-align: left;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}
.status-button:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--status-color), 0.58);
  box-shadow: 0 12px 30px rgba(var(--status-color), 0.12);
}
.status-button:focus-visible,
.equipment-card:focus-visible,
.metric-card--button:focus-visible,
.order-card:focus-visible,
.equipment-order-list button:focus-visible {
  outline: 4px solid rgba(var(--manager-blue), 0.28);
  outline-offset: 3px;
}
.status-button--planned {
  --status-color: var(--manager-blue);
}
.status-button--open {
  --status-color: var(--manager-amber);
}
.status-button--closed {
  --status-color: var(--manager-green);
}
.status-button__copy {
  display: grid;
  gap: 5px;
}
.status-button__copy strong {
  font-size: clamp(1rem, 2vw, 1.25rem);
}
.status-button__copy span {
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.92rem;
}
.status-button__count {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}
.status-button__action {
  grid-column: 2 / 4;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.85rem;
  font-weight: 800;
}
.simple-section {
  padding: clamp(22px, 3vw, 32px);
  border-radius: 24px;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.metric-card {
  display: grid;
  align-content: start;
  min-height: 132px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
  border-radius: 18px;
  color: inherit;
  background: rgba(var(--manager-blue), 0.055);
  text-align: left;
}
.metric-card span {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-weight: 650;
}
.metric-card strong {
  margin-top: 10px;
  font-size: 1.25rem;
  line-height: 1.3;
}
.metric-card small {
  margin-top: 7px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.9rem;
  font-weight: 750;
}
.metric-card--button {
  cursor: pointer;
}
.metric-card--button:not(:disabled):hover {
  border-color: rgba(var(--manager-blue), 0.5);
}
.metric-card--button:disabled {
  cursor: default;
}
.equipment-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 26px 0 12px;
}
.equipment-heading h3 {
  margin: 0;
  font-size: 1.08rem;
}
.equipment-heading span {
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.88rem;
}
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.equipment-card {
  display: grid;
  min-height: 76px;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 13px;
  padding: 14px 16px;
  border-radius: 15px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.equipment-card:hover {
  border-color: rgba(var(--manager-blue), 0.48);
  background: rgba(var(--manager-blue), 0.045);
}
.equipment-card > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.equipment-card strong {
  overflow-wrap: anywhere;
  font-size: 0.94rem;
}
.equipment-card small {
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.82rem;
}
.compact-empty {
  padding: 22px;
  border-radius: 14px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  background: rgba(var(--v-theme-on-surface), 0.045);
  text-align: center;
}
.manager-table {
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
  border-radius: 18px;
}

/* El desplazamiento horizontal vive aqui dentro: la tabla ancha se recorre
   sola en vez de arrastrar el resto de la pantalla. */
.manager-table :deep(.v-table__wrapper) {
  overflow-x: auto;
}
.manager-table :deep(th) {
  height: 56px !important;
  font-size: 0.86rem !important;
}
.manager-table :deep(td) {
  height: 58px !important;
  font-size: 0.95rem !important;
}
.value-positive {
  color: rgb(var(--manager-green));
  font-weight: 800;
}
.value-negative {
  color: rgb(var(--manager-amber));
  font-weight: 800;
}
.empty-table {
  padding: 48px 16px;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.list-dialog,
/* El cuerpo del detalle es quien desplaza, no la pagina.
   Con la tarjeta a `max-height` pero sin columna flexible, al reducir el alto
   util (zoom al 100% o mas, o una pantalla mas baja) el contenido se recortaba
   sin barra: se veia la cabecera de la tabla y las filas quedaban fuera. */
.detail-dialog {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
/* Volver a la izquierda, titulo al centro y cerrar a la derecha; la accion
   principal (previsualizar, descargar) va en su propia fila centrada.
   Antes iban las tres en un contenedor que heredaba `display: grid` de la
   regla de abajo y quedaban una encima de otra. */
.dialog-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px 14px;
  padding: 24px 26px;
  white-space: normal;
}
.dialog-header > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.dialog-header__nav {
  align-self: start;
  flex: 0 0 auto;
}
.dialog-header > .dialog-header__cta {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
}
.dialog-header span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.92rem;
  font-weight: 850;
}
.dialog-header strong {
  font-size: 1.35rem;
}
.dialog-header small {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.92rem;
}
/* Un grid sin `grid-template-columns` se dimensiona al contenido mas ancho:
   una tabla larga estiraba la modal entera. La columna explicita y el
   `min-width: 0` de los hijos la mantienen dentro de su caja. */
.list-dialog__body,
.detail-dialog__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  padding: 24px 26px 30px;
}

.list-dialog__body > *,
.detail-dialog__body > * {
  min-width: 0;
}

.detail-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
.orders-list,
.orders-loading {
  display: grid;
  gap: 12px;
}
.order-card {
  display: grid;
  grid-template-columns: minmax(240px, 1.3fr) minmax(410px, 2fr) auto;
  align-items: center;
  gap: 22px;
  width: 100%;
  min-height: 112px;
  padding: 20px 22px;
  border-radius: 18px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.order-card:hover {
  border-color: rgba(var(--manager-blue), 0.5);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.09);
}
.order-card__code {
  color: rgb(var(--v-theme-primary));
  font-size: 1rem;
  font-weight: 850;
}
.order-card__title {
  margin-top: 3px;
  font-size: 1.08rem;
  font-weight: 750;
}
.order-card__equipment {
  margin-top: 7px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.94rem;
}
.order-card__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(92px, 1fr));
  gap: 14px;
}
.order-card__facts span {
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}
.order-card__facts small {
  display: block;
  margin-bottom: 4px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  font-weight: 650;
}
.order-card__action {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
  white-space: nowrap;
}
.empty-panel {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 10px;
  border-radius: 20px;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.equipment-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.equipment-summary article {
  display: grid;
  gap: 7px;
  padding: 17px;
  border-radius: 16px;
  background: rgba(var(--manager-blue), 0.06);
}
.equipment-summary span {
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.82rem;
}
.equipment-summary strong {
  font-size: 1.2rem;
}
.equipment-orders-title {
  font-size: 1.02rem;
  font-weight: 800;
}
.equipment-order-list {
  display: grid;
  gap: 9px;
}
.equipment-order-list button {
  display: grid;
  min-height: 68px;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
  border-radius: 14px;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.equipment-order-list button:hover {
  border-color: rgba(var(--manager-blue), 0.48);
  background: rgba(var(--manager-blue), 0.04);
}
.equipment-order-list span {
  display: grid;
  gap: 3px;
}
.equipment-order-list small {
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.equipment-order-list__amount {
  justify-items: end;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.detail-loading {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.detail-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.detail-summary article,
.oil-detail article {
  display: grid;
  gap: 7px;
  min-height: 92px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(var(--manager-blue), 0.06);
}
.detail-summary span,
.oil-detail span {
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.82rem;
  font-weight: 650;
}
.detail-summary strong,
.oil-detail strong {
  font-size: 1.03rem;
}
.detail-block {
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
  border-radius: 18px;
}
.detail-block h3 {
  margin: 0 0 14px;
  font-size: 1.08rem;
}
.responsible-list {
  display: grid;
  gap: 8px;
}
.responsible-list > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.045);
}
.material-list {
  display: grid;
  gap: 10px;
}
.material-row {
  display: grid;
  grid-template-columns: minmax(260px, 1.5fr) 1fr 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.045);
}
.oil-detail {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.audit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.audit-grid span {
  display: grid;
  gap: 5px;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.82rem;
}
.audit-grid strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.96rem;
}
.muted-empty {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
@media (prefers-reduced-motion: reduce) {
  .status-button {
    transition: none;
  }
}
@media (max-width: 1180px) {
  .report-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .report-heading__actions {
    width: 100%;
    min-width: 0;
  }
  .order-card {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .order-card__action {
    justify-self: end;
  }
  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 760px) {
  .report-heading__actions {
    grid-template-columns: 1fr;
  }
  .section-title-row {
    align-items: stretch;
    flex-direction: column;
  }
  .status-grid,
  .metric-grid,
  .equipment-grid,
  .inventory-searches,
  .inventory-totals,
  .detail-summary,
  .oil-detail,
  .audit-grid,
  .equipment-summary {
    grid-template-columns: 1fr;
  }
  .status-button {
    min-height: 132px;
  }
  .order-search,
  .oil-select {
    max-width: none;
  }
  .order-card__facts {
    grid-template-columns: repeat(2, 1fr);
  }
  .material-row {
    grid-template-columns: 1fr;
  }
  .dialog-header,
  .list-dialog__body,
  .detail-dialog__body {
    padding-inline: 18px;
  }
}
</style>

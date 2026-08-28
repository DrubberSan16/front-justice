<template>
  <div class="intelligence-page">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar este módulo.
    </v-alert>

    <v-alert v-else-if="!canAccessIntelligenceReports" type="warning" variant="tonal">
      No tienes permisos para acceder a este reporte.
    </v-alert>

    <div v-else class="intelligence-page__content">
    <v-card rounded="xl" class="enterprise-surface intelligence-hero">
      <div class="intelligence-hero__glow intelligence-hero__glow--one" />
      <div class="intelligence-hero__glow intelligence-hero__glow--two" />

      <div class="intelligence-hero__header">
        <div class="intelligence-hero__copy">
          <div class="intelligence-hero__eyebrow">
            <span class="intelligence-hero__pulse" />
            Analítica y mantenimiento predictivo
          </div>
          <h1 class="intelligence-hero__title">Inteligencia operativa</h1>
          <p class="intelligence-hero__description">
            Convierte procedimientos MPG, lubricantes, cronogramas y eventos en decisiones operativas claras.
          </p>
          <div class="intelligence-hero__meta">
            <span><v-icon icon="mdi-database-sync-outline" size="16" />{{ generatedAtLabel }}</span>
            <span><v-icon icon="mdi-calendar-range-outline" size="16" />{{ selectedPeriodLabel }}</span>
          </div>
        </div>

        <div class="intelligence-hero__actions">
          <v-btn color="secondary" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('indicadores', 'excel')" @click="exportModule('indicadores', 'excel')">
            Exportar Excel
          </v-btn>
          <v-btn color="secondary" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('indicadores', 'pdf')" @click="exportModule('indicadores', 'pdf')">
            Exportar PDF
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadIntelligence">
            Actualizar
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <div class="intelligence-filter-toolbar">
        <div class="intelligence-filter-toolbar__intro">
          <div class="intelligence-filter-toolbar__icon"><v-icon icon="mdi-tune-variant" size="21" /></div>
          <div>
            <strong>Ventana de análisis</strong>
            <span>Selecciona el período para recalcular todos los indicadores.</span>
          </div>
        </div>
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          label="Año"
          density="comfortable"
          hide-details
          variant="outlined"
          class="intelligence-filter-toolbar__select"
        />
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          label="Mes"
          density="comfortable"
          hide-details
          variant="outlined"
          class="intelligence-filter-toolbar__select intelligence-filter-toolbar__select--month"
        />
        <v-chip label color="secondary" variant="tonal">
          {{ selectedPeriodLabel }}
        </v-chip>
      </div>

      <div class="intelligence-kpi-grid">
          <v-card
            v-for="card in kpiCards"
            :key="card.key"
            rounded="lg"
            :class="['kpi-card', 'h-100', { 'intelligence-kpi--clickable': Boolean(card.routeName || card.key === 'lubricantes-dashboard') }]"
            :style="{ '--kpi-accent': card.accent }"
            :role="card.routeName || card.key === 'lubricantes-dashboard' ? 'button' : undefined"
            :tabindex="card.routeName || card.key === 'lubricantes-dashboard' ? 0 : undefined"
            @click="openCard(card)"
            @keydown.enter="openCard(card)"
            @keydown.space.prevent="openCard(card)"
          >
            <div class="kpi-card__top">
              <div class="kpi-card__icon"><v-icon :icon="card.icon" size="22" /></div>
              <v-icon
                :icon="card.routeName || card.key === 'lubricantes-dashboard' ? 'mdi-arrow-top-right' : 'mdi-chart-box-outline'"
                size="18"
                class="kpi-card__arrow"
              />
            </div>
            <div class="kpi-card__value-row">
              <div class="kpi-card__value">{{ card.value }}</div>
            </div>
            <div class="kpi-card__label">{{ card.label }}</div>
            <div class="kpi-card__helper">{{ card.helper }}</div>
            <div v-if="card.routeName || card.key === 'lubricantes-dashboard'" class="kpi-card__link">Explorar módulo</div>
          </v-card>
      </div>
    </v-card>

    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Reporte consumo de aceite</div>
              <div class="text-body-2 text-medium-emphasis">
                Compara el consumo de materiales marcados como aceite por OT, equipo y rango de fechas.
              </div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="secondary" variant="tonal">
                {{ oilKpi?.filters?.label || "Sin periodo" }}
              </v-chip>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-file-excel"
                :loading="isExporting('aceites', 'excel')"
                :disabled="!oilKpi || oilKpiLoading"
                @click="exportOilReport('excel')"
              >
                Excel
              </v-btn>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-file-pdf-box"
                :loading="isExporting('aceites', 'pdf')"
                :disabled="!oilKpi || oilKpiLoading"
                @click="exportOilReport('pdf')"
              >
                PDF
              </v-btn>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-chart-box-outline"
                :disabled="!oilKpi"
                @click="openOilDetailDialog"
              >
                Ver detalle
              </v-btn>
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-refresh"
                :loading="oilKpiLoading"
                @click="loadOilKpi"
              >
                Actualizar reporte
              </v-btn>
            </div>
          </div>

          <v-row dense class="mb-4">
            <v-col cols="12" lg="5">
              <v-autocomplete
                v-model="oilSelectedProductId"
                :items="oilCatalogOptions"
                item-title="label"
                item-value="id"
                clearable
                label="Aceite"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" lg="2">
              <v-select
                v-model="oilPeriod"
                :items="oilPeriodOptions"
                item-title="title"
                item-value="value"
                label="Periodo"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col v-if="oilNeedsReferenceDate" cols="12" sm="6" lg="2">
              <v-text-field
                v-model="oilReferenceDate"
                type="date"
                label="Fecha de referencia"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col v-if="oilUsesCustomRange" cols="12" sm="6" lg="2">
              <v-text-field
                v-model="oilCustomFrom"
                type="date"
                label="Desde"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col v-if="oilUsesCustomRange" cols="12" sm="6" lg="2">
              <v-text-field
                v-model="oilCustomTo"
                type="date"
                label="Hasta"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" lg="2">
              <v-checkbox
                v-model="oilOnlyCebado"
                label="Solo OT de cebado"
                color="primary"
                density="comfortable"
                hide-details
                @update:model-value="loadOilKpi"
              />
            </v-col>
            <v-col cols="12" lg="3">
              <div class="text-caption text-medium-emphasis mb-1">Referencia del filtro</div>
              <div class="oil-kpi-filter-hint">
                <span v-if="oilPeriod === 'DIARIO'">Usa la fecha de referencia para concentrar el análisis del día.</span>
                <span v-else-if="oilPeriod === 'MENSUAL'">Usa el año y mes superiores: {{ selectedPeriodLabel }}</span>
                <span v-else-if="oilPeriod === 'ANUAL'">Usa el año superior: {{ selectedYear }}</span>
                <span v-else-if="oilPeriod === 'SEMANAL'">Semana operacional desde la fecha elegida.</span>
                <span v-else>Rango exacto definido manualmente.</span>
              </div>
            </v-col>
          </v-row>

          <v-alert
            v-if="oilKpiError"
            type="warning"
            variant="tonal"
            class="mb-4"
            :text="oilKpiError"
          />

          <LoadingTableState
            v-if="oilKpiLoading"
            message="Cargando reporte de consumo de aceite..."
            :rows="6"
            :columns="4"
          />

          <template v-else>
            <v-sheet
              class="oil-summary-card mb-4"
              role="button"
              tabindex="0"
              @click="openOilDetailDialog"
              @keydown.enter="openOilDetailDialog"
              @keydown.space.prevent="openOilDetailDialog"
            >
              <div class="summary-strip">
              <v-chip label color="primary" variant="tonal">
                {{ oilKpi?.selected_product?.label || "Sin aceite seleccionado" }}
              </v-chip>
              <v-chip label color="success" variant="tonal">
                Total: {{ formatDetailedNumber(oilKpi?.totals?.total_cantidad) }} {{ oilQuantityUnitLabel }}
              </v-chip>
              <v-chip label color="info" variant="tonal">
                Órdenes: {{ oilKpi?.totals?.total_ordenes ?? 0 }}
              </v-chip>
              <v-chip label color="secondary" variant="tonal">
                Equipos: {{ oilKpi?.totals?.total_equipos ?? 0 }}
              </v-chip>
              <v-chip label color="warning" variant="tonal">
                Promedio OT: {{ formatDetailedNumber(oilKpi?.totals?.promedio_por_orden) }} {{ oilQuantityUnitLabel }}
              </v-chip>
              <v-chip v-if="oilKpi?.filters?.solo_cebado" label color="deep-orange" variant="tonal">
                Solo cebado
              </v-chip>
              </div>
              <div class="text-caption text-primary mt-3">Presiona para abrir el detalle completo, gráficos ampliados y el reporte relacionado.</div>
            </v-sheet>

            <div class="indicator-grid mb-4">
              <div
                class="indicator-tile indicator-tile--interactive"
                role="button"
                tabindex="0"
                aria-haspopup="dialog"
                @click="openOilDetailDialog"
                @keydown.enter="openOilDetailDialog"
                @keydown.space.prevent="openOilDetailDialog"
              >
                <div class="text-caption text-medium-emphasis">Consumo total</div>
                <div class="text-h6 font-weight-bold">{{ formatDetailedNumber(oilKpi?.totals?.total_cantidad) }}</div>
                <div class="text-caption text-medium-emphasis">Consumo total del rango</div>
              </div>
              <div
                class="indicator-tile indicator-tile--interactive"
                role="button"
                tabindex="0"
                aria-haspopup="dialog"
                @click="openOilDetailDialog"
                @keydown.enter="openOilDetailDialog"
                @keydown.space.prevent="openOilDetailDialog"
              >
                <div class="text-caption text-medium-emphasis">Promedio por equipo</div>
                <div class="text-h6 font-weight-bold">{{ formatDetailedNumber(oilKpi?.totals?.promedio_por_equipo) }}</div>
                <div class="text-caption text-medium-emphasis">Promedio por equipo visible</div>
              </div>
              <div
                class="indicator-tile indicator-tile--interactive"
                role="button"
                tabindex="0"
                aria-haspopup="dialog"
                @click="openOilDetailDialog"
                @keydown.enter="openOilDetailDialog"
                @keydown.space.prevent="openOilDetailDialog"
              >
                <div class="text-caption text-medium-emphasis">Órdenes analizadas</div>
                <div class="text-h6 font-weight-bold">{{ oilWorkOrderRows.length }}</div>
                <div class="text-caption text-medium-emphasis">Órdenes con uso registrado del aceite</div>
              </div>
            </div>

            <v-row dense class="mb-2">
              <v-col cols="12" lg="5">
                <LubricantTrendChart
                  title="Consumo por rango"
                  subtitle="Evolución del aceite seleccionado según el periodo filtrado"
                  :unit="oilQuantityUnitLabel"
                  :points="oilTrendChartPoints"
                />
              </v-col>
              <v-col cols="12" lg="7">
                <LubricantTrendChart
                  title="Consumo por equipo"
                  subtitle="Equipos que más aceite registraron en órdenes de trabajo"
                  :unit="oilQuantityUnitLabel"
                  :points="oilEquipmentChartPoints"
                />
              </v-col>
              <v-col cols="12" lg="12">
                <LubricantTrendChart
                  title="Consumo por OT ejecutada"
                  subtitle="Ordenes de trabajo del rango con su total consumido del aceite seleccionado"
                  :unit="oilQuantityUnitLabel"
                  :points="oilWorkOrderChartPoints"
                />
              </v-col>
            </v-row>

            <v-row dense class="mb-2">
              <v-col cols="12" lg="6">
                <LubricantTrendChart
                  title="Costo por rango"
                  subtitle="Evolución del costo del aceite según el periodo filtrado"
                  unit="USD"
                  :points="oilCostTrendChartPoints"
                />
              </v-col>
              <v-col cols="12" lg="6">
                <LubricantTrendChart
                  title="Picos diarios de consumo"
                  subtitle="Dias con mayor uso del aceite para detectar jornadas de alto consumo"
                  :unit="oilQuantityUnitLabel"
                  :points="oilDailyUsageChartPoints"
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" lg="8">
                <div class="text-subtitle-2 font-weight-medium mb-2">Detalle por orden de trabajo</div>
                <div class="dashboard-table-shell oil-kpi-table-shell">
                  <v-table density="compact" class="dashboard-mini-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>OT</th>
                        <th>Tipo mtto</th>
                        <th>Equipo</th>
                        <th>{{ oilQuantityUnitLabel }}</th>
                        <th>Dif. anterior</th>
                        <th>Bodega</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in oilWorkOrderRows"
                        :key="item.work_order_id"
                        class="clickable-row"
                        tabindex="0"
                        role="button"
                        aria-haspopup="dialog"
                        @click="openOilWorkOrderRowDetail(item)"
                        @keydown.enter="openOilWorkOrderRowDetail(item)"
                        @keydown.space.prevent="openOilWorkOrderRowDetail(item)"
                      >
                        <td>{{ item.fecha_referencia_label }}</td>
                        <td>
                          <div class="font-weight-medium">{{ item.work_order_code }}</div>
                          <div class="text-caption text-medium-emphasis">{{ item.work_order_title }}</div>
                        </td>
                        <td>{{ item.maintenance_kind_label || maintenanceKindLabel(item.maintenance_kind) }}</td>
                        <td>{{ item.equipment_label }}</td>
                        <td class="font-weight-medium">{{ formatDetailedNumber(item.cantidad) }}</td>
                        <td>
                          <span v-if="item.diferencia_vs_anterior == null" class="text-medium-emphasis">Base</span>
                          <span v-else :class="item.diferencia_vs_anterior >= 0 ? 'text-success' : 'text-error'">
                            {{ item.diferencia_vs_anterior > 0 ? "+" : "" }}{{ formatDetailedNumber(item.diferencia_vs_anterior) }}
                          </span>
                        </td>
                        <td>{{ item.bodega_label }}</td>
                      </tr>
                      <tr v-if="!oilWorkOrderRows.length">
                        <td colspan="7" class="text-center text-medium-emphasis py-4">
                          No existen órdenes de trabajo con consumo de este aceite en el rango consultado.
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-col>

              <v-col cols="12" lg="4">
                <div class="text-subtitle-2 font-weight-medium mb-2">Detalle del día pico</div>
                <div class="dashboard-table-shell oil-kpi-table-shell mb-4">
                  <v-table density="compact" class="dashboard-mini-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>OT</th>
                        <th>Tipo</th>
                        <th>{{ oilQuantityUnitLabel }}</th>
                        <th>Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in oilPeakDayDetailRows"
                        :key="`${item.work_order_id}-${item.fecha_referencia}`"
                        class="clickable-row"
                        tabindex="0"
                        role="button"
                        aria-haspopup="dialog"
                        @click="openOilWorkOrderRowDetail(item)"
                        @keydown.enter="openOilWorkOrderRowDetail(item)"
                        @keydown.space.prevent="openOilWorkOrderRowDetail(item)"
                      >
                        <td>{{ item.fecha_referencia_label }}</td>
                        <td>
                          <div class="font-weight-medium">{{ item.work_order_code }}</div>
                          <div class="text-caption text-medium-emphasis">{{ item.equipment_label }}</div>
                        </td>
                        <td>{{ item.maintenance_kind_label || maintenanceKindLabel(item.maintenance_kind) }}</td>
                        <td class="font-weight-medium">{{ formatDetailedNumber(item.cantidad) }}</td>
                        <td>${{ formatDetailedNumber(item.subtotal, 2) }}</td>
                      </tr>
                      <tr v-if="!oilPeakDayDetailRows.length">
                        <td colspan="5" class="text-center text-medium-emphasis py-4">
                          No existe un día pico identificado para este aceite.
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <div class="text-subtitle-2 font-weight-medium mb-2">Agrupado por equipo</div>
                <div class="dashboard-table-shell oil-kpi-table-shell">
                  <v-table density="compact" class="dashboard-mini-table">
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Órdenes</th>
                        <th>{{ oilQuantityUnitLabel }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in oilEquipmentRows"
                        :key="item.equipment_id || item.equipment_label"
                        class="clickable-row"
                        tabindex="0"
                        role="button"
                        aria-haspopup="dialog"
                        @click="openOilEquipmentRowDetail(item)"
                        @keydown.enter="openOilEquipmentRowDetail(item)"
                        @keydown.space.prevent="openOilEquipmentRowDetail(item)"
                      >
                        <td>{{ item.equipment_label }}</td>
                        <td>{{ item.total_ordenes }}</td>
                        <td class="font-weight-medium">{{ formatDetailedNumber(item.total_cantidad) }}</td>
                      </tr>
                      <tr v-if="!oilEquipmentRows.length">
                        <td colspan="3" class="text-center text-medium-emphasis py-4">
                          Sin consumo agrupado por equipo.
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-col>
            </v-row>
          </template>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-1">
      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Distribucion por proceso"
          subtitle="Peso de cada frente operativo dentro del periodo"
          :chip-label="`${breakdownItems.length} procesos`"
          chip-color="primary"
          :items="breakdownChartItems"
          empty-text="Sin eventos documentados para graficar."
        />
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Presion operativa"
          subtitle="Backlog y eventos operativos"
          :chip-label="`${processIndicatorRows.length} KPI`"
          chip-color="warning"
          :items="processPressureChartItems"
          empty-text="No hay indicadores operativos para comparar."
        />
      </v-col>

      <v-col cols="12" xl="4">
        <DashboardBarChartCard
          title="Cadencia operativa"
          subtitle="Horas programadas por dia en OPERACION y MPG"
          :chip-label="operationScheduleSummary.hoursLabel"
          chip-color="success"
          :items="operationCadenceChartItems"
          empty-text="No hay actividades OPERACION/MPG para el periodo seleccionado."
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Indicadores de proceso</div>
              <div class="text-body-2 text-medium-emphasis">Semaforizacion operativa y trazabilidad por proceso.</div>
            </div>
            <v-chip label color="secondary" variant="tonal">{{ processIndicatorRows.length }} indicadores</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando indicadores de proceso..." :rows="4" :columns="2" />
          <div v-else class="indicator-grid">
            <div v-for="item in processIndicatorRows" :key="item.key" class="indicator-tile">
              <div class="text-caption text-medium-emphasis">{{ item.label }}</div>
              <div class="text-h6 font-weight-bold">{{ item.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.helper }}</div>
            </div>
          </div>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 font-weight-medium mb-2">Distribucion por proceso</div>
          <LoadingTableState v-if="loading" message="Cargando distribución por proceso..." :rows="3" :columns="2" />
          <div v-else class="breakdown-grid">
            <div v-for="item in breakdownItems" :key="item.tipo_proceso" class="breakdown-chip">
              <div class="text-caption text-medium-emphasis">{{ prettifyProcess(item.tipo_proceso) }}</div>
              <div class="text-h6 font-weight-bold">{{ item.total }}</div>
            </div>
            <div v-if="!breakdownItems.length" class="text-body-2 text-medium-emphasis">
              Sin eventos documentados.
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Eventos y notificaciones</div>
              <div class="text-body-2 text-medium-emphasis">Cada proceso principal deja traza y dispara el KPI operativo.</div>
            </div>
            <v-chip label color="secondary" variant="tonal">{{ recentEvents.length }} eventos recientes</v-chip>
          </div>

          <div class="summary-strip mb-3">
            <v-chip size="small" label color="secondary" variant="tonal">
              {{ recentEvents.length }} eventos visibles
            </v-chip>
            <v-chip size="small" label color="info" variant="tonal">
              {{ breakdownItems.length }} procesos activos
            </v-chip>
            <v-chip size="small" label color="success" variant="tonal">
              {{ generatedAtLabel }}
            </v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando eventos recientes..." :rows="5" :columns="4" />
          <div v-else class="dashboard-table-shell">
            <v-table density="compact" class="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Proceso</th>
                  <th>Accion</th>
                  <th>Referencia</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in recentEventsTableRows" :key="item.id">
                  <td class="font-weight-medium">{{ item.proceso }}</td>
                  <td>{{ item.accion }}</td>
                  <td>{{ item.referencia }}</td>
                  <td class="text-medium-emphasis">{{ item.fecha }}</td>
                </tr>
                <tr v-if="!recentEventsTableRows.length">
                  <td colspan="4" class="text-center text-medium-emphasis py-4">
                    Las notificaciones de mantenimiento apareceran aqui.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" xl="6">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Procedimientos y plantillas</div>
              <div class="text-body-2 text-medium-emphasis">Base operativa para mantenimientos preventivos y flujos de trabajo.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="primary" variant="tonal">{{ procedures.length }} plantillas</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('procedimientos', 'excel')" @click="exportModule('procedimientos', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('procedimientos', 'pdf')" @click="exportModule('procedimientos', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <div class="summary-strip mb-4">
            <v-chip label color="secondary" variant="tonal">Actividades: {{ totalProcedureActivities }}</v-chip>
            <v-chip label color="info" variant="tonal">Clases: {{ maintenanceClassesCount }}</v-chip>
            <v-chip label color="success" variant="tonal">Documentos base: {{ procedureDocumentCount }}</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando plantillas..." :rows="5" :columns="5" />
          <div v-else class="dashboard-table-shell">
            <v-table density="compact" class="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Plantilla</th>
                  <th>Frecuencia</th>
                  <th>Actividades</th>
                  <th>Documento</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in procedurePreview" :key="item.id">
                  <td>{{ item.codigo }}</td>
                  <td>
                    <div class="font-weight-medium">{{ item.nombre }}</div>
                    <div class="text-caption text-medium-emphasis">{{ prettifyProcess(item.tipo_proceso) }}</div>
                  </td>
                  <td>{{ item.frecuencia_horas ? `${item.frecuencia_horas} H` : "N/A" }}</td>
                  <td>{{ item.actividades?.length ?? 0 }}</td>
                  <td>{{ item.documento_referencia || "Sin referencia" }}</td>
                </tr>
                <tr v-if="!procedurePreview.length">
                  <td colspan="5" class="text-center text-medium-emphasis py-4">No hay procedimientos cargados.</td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" xl="6">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Analisis de lubricante</div>
              <div class="text-body-2 text-medium-emphasis">Control predictivo por compartimento, diagnostico y nivel de alerta.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="warning" variant="tonal">{{ filteredAnalyses.length }} analisis</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('analisis', 'excel')" @click="exportModule('analisis', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('analisis', 'pdf')" @click="exportModule('analisis', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <div class="summary-strip mb-4">
            <v-chip label color="error" variant="tonal">Alerta: {{ analysesInAlert }}</v-chip>
            <v-chip label color="secondary" variant="tonal">Parametros: {{ analysisDetailCount }}</v-chip>
            <v-chip label color="success" variant="tonal">Lubricantes: {{ analysisLubricantCount }}</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando análisis de lubricante..." :rows="5" :columns="5" />
          <div v-else class="dashboard-table-shell">
            <v-table density="compact" class="dashboard-mini-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Equipo</th>
                <th>Compartimento</th>
                <th>Estado</th>
                <th>Fecha reporte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in analysisPreview" :key="item.id">
                <td>{{ item.codigo }}</td>
                <td>
                  <div class="font-weight-medium">{{ item.lubricante || item.equipo_codigo || "Sin lubricante" }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.marca_lubricante || item.equipo_nombre || "Sin marca" }}</div>
                </td>
                <td>{{ item.compartimento_principal || "Sin compartimento" }}</td>
                <td>
                  <v-chip size="small" :color="chipColorForStatus(item.estado_diagnostico)" variant="tonal">
                    {{ item.estado_diagnostico || "NORMAL" }}
                  </v-chip>
                </td>
                <td>{{ item.fecha_reporte || "Sin fecha" }}</td>
              </tr>
              <tr v-if="!analysisPreview.length">
                <td colspan="5" class="text-center text-medium-emphasis py-4">No hay analisis cargados.</td>
              </tr>
            </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>
    </v-row>

    

    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Reporte diario de operacion</div>
              <div class="text-body-2 text-medium-emphasis">Disponibilidad, MPG y combustible por jornada.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="success" variant="tonal">{{ filteredDailyReports.length }} reportes</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('reportes', 'excel')" @click="exportModule('reportes', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('reportes', 'pdf')" @click="exportModule('reportes', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <LoadingTableState v-if="loading" message="Cargando reporte diario de operación..." :rows="5" :columns="3" />
          <div v-else-if="latestDailyReport">
            <div class="summary-strip mb-4">
              <v-chip label color="primary" variant="tonal">{{ latestDailyReport.codigo }}</v-chip>
              <v-chip label color="info" variant="tonal">{{ latestDailyReport.fecha_reporte }}</v-chip>
              <v-chip label color="secondary" variant="tonal">{{ latestDailyReport.turno || "Sin turno" }}</v-chip>
              <v-chip label color="success" variant="tonal">Unidades: {{ latestDailyReport.unidades?.length ?? 0 }}</v-chip>
              <v-chip label color="warning" variant="tonal">Combustible: {{ latestDailyReport.combustibles?.length ?? 0 }}</v-chip>
              <v-chip label color="primary" variant="tonal">Programado: {{ operationScheduleSummary.days }} días</v-chip>
              <v-chip label color="secondary" variant="tonal">Actividades: {{ operationScheduleSummary.activities }}</v-chip>
              <v-chip label color="info" variant="tonal">Horas: {{ operationScheduleSummary.hoursLabel }}</v-chip>
            </div>

            <div class="dashboard-mini-bars mb-4">
              <div v-for="item in operationCadenceChartItems" :key="item.key" class="dashboard-mini-bars__row">
                <div class="dashboard-mini-bars__meta">
                  <span>{{ item.label }}</span>
                  <span class="font-weight-medium">{{ item.valueLabel }}</span>
                </div>
                <div class="dashboard-mini-bars__track">
                  <div class="dashboard-mini-bars__fill dashboard-mini-bars__fill--success" :style="{ width: `${item.percent}%` }" />
                </div>
              </div>
              <div v-if="!operationCadenceChartItems.length" class="text-body-2 text-medium-emphasis">
                No hay horas OPERACION/MPG para el periodo seleccionado.
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" md="7">
                <div class="text-subtitle-2 font-weight-medium mb-2">Unidades registradas</div>
                <div class="dashboard-table-shell">
                  <v-table density="compact" class="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Horometro</th>
                      <th>MPG actual</th>
                      <th>Proximo MPG</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="unit in latestDailyUnits" :key="unit.id">
                      <td>{{ unit.equipo_codigo }}</td>
                      <td>{{ unit.horometro_actual ?? "N/A" }}</td>
                      <td>{{ unit.mpg_actual ?? "N/A" }}</td>
                      <td>{{ unit.proximo_mpg ?? "N/A" }}</td>
                    </tr>
                    <tr v-if="!latestDailyUnits.length">
                      <td colspan="4" class="text-center text-medium-emphasis py-3">Sin unidades asociadas.</td>
                    </tr>
                  </tbody>
                  </v-table>
                </div>
              </v-col>

              <v-col cols="12" md="5">
                <div class="text-subtitle-2 font-weight-medium mb-2">Combustible</div>
                <div class="dashboard-table-shell mb-4">
                  <v-table density="compact" class="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Tanque</th>
                      <th>Galones</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="fuel in latestDailyFuel" :key="fuel.id">
                      <td>{{ fuel.tanque }}</td>
                      <td>{{ fuel.galones ?? fuel.consumo_galones ?? "N/A" }}</td>
                      <td>{{ fuel.stock_actual ?? "N/A" }}</td>
                    </tr>
                    <tr v-if="!latestDailyFuel.length">
                      <td colspan="3" class="text-center text-medium-emphasis py-3">Sin lecturas de combustible.</td>
                    </tr>
                  </tbody>
                  </v-table>
                </div>

              </v-col>
            </v-row>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">Aun no existen reportes diarios para mostrar.</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Cronograma semanal de actividades</div>
              <div class="text-body-2 text-medium-emphasis">Vista operativa semanal para mantenimiento, SSA y actividades de soporte.</div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="info" variant="tonal">{{ filteredSchedules.length }} cronogramas</v-chip>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('cronogramas', 'excel')" @click="exportModule('cronogramas', 'excel')">Excel</v-btn>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('cronogramas', 'pdf')" @click="exportModule('cronogramas', 'pdf')">PDF</v-btn>
            </div>
          </div>

          <LoadingTableState v-if="loading" message="Cargando cronograma semanal..." :rows="4" :columns="2" />
          <div v-else-if="latestSchedule">
            <div class="summary-strip mb-4">
              <v-chip label color="primary" variant="tonal">{{ latestSchedule.codigo }}</v-chip>
              <v-chip label color="secondary" variant="tonal">{{ latestSchedule.locacion || "Sin locacion" }}</v-chip>
              <v-chip label color="info" variant="tonal">{{ latestSchedule.fecha_inicio }} / {{ latestSchedule.fecha_fin }}</v-chip>
              <v-chip label color="success" variant="tonal">Actividades: {{ latestSchedule.detalles?.length ?? 0 }}</v-chip>
            </div>

            <div class="schedule-grid">
              <div v-for="day in scheduleWeek" :key="day.key" class="schedule-day">
                <div class="font-weight-bold mb-3">{{ day.label }}</div>
                <div v-for="activity in day.items" :key="activity.id" class="schedule-item">
                  <div class="text-caption text-medium-emphasis">
                    {{ activity.hora_inicio || "--:--" }} - {{ activity.hora_fin || "--:--" }}
                  </div>
                  <div class="text-body-2 font-weight-medium">{{ activity.actividad }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ activity.tipo_proceso || "Proceso general" }}<span v-if="activity.equipo_codigo"> · {{ activity.equipo_codigo }}</span>
                  </div>
                </div>
                <div v-if="!day.items.length" class="text-caption text-medium-emphasis">Sin actividades programadas.</div>
              </div>
            </div>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">Aun no existen cronogramas semanales cargados.</div>
        </v-card>
      </v-col>
    </v-row>
  </div>

  <v-dialog
    v-if="canRead && canAccessIntelligenceReports"
    v-model="dashboardDialog"
    :fullscreen="isDashboardDialogFullscreen"
    :max-width="isDashboardDialogFullscreen ? undefined : 1400"
  >
    <v-card rounded="xl" class="enterprise-dialog intelligence-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">Dashboard de lubricantes</v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense class="mb-4">
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="dashboardSelection"
              :items="lubricantCatalogOptions"
              item-title="label"
              return-object
              clearable
              label="Lubricante"
              variant="outlined"
              density="compact"
              @update:model-value="handleDashboardSelection"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="dashboardPeriod"
              :items="dashboardPeriodOptions"
              item-title="title"
              item-value="value"
              label="Periodo"
              variant="outlined"
              density="compact"
              @update:model-value="reloadDashboard"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="dashboardFrom"
              type="date"
              label="Desde"
              variant="outlined"
              density="compact"
              @change="reloadDashboard"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="dashboardTo"
              type="date"
              label="Hasta"
              variant="outlined"
              density="compact"
              @change="reloadDashboard"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="dashboardCompartimento"
              :items="dashboardCompartimentos"
              clearable
              label="Compartimento"
              variant="outlined"
              density="compact"
              @update:model-value="reloadDashboard"
            />
          </v-col>
        </v-row>

        <LubricantDashboardPanel
          :dashboard="lubricantDashboard"
          :loading="lubricantDashboardLoading"
          :error="lubricantDashboardError"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="dashboardDialog = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-if="canRead && canAccessIntelligenceReports"
    v-model="oilDetailDialog"
    :fullscreen="isDashboardDialogFullscreen"
    :max-width="isDashboardDialogFullscreen ? undefined : 1500"
  >
    <v-card rounded="xl" class="enterprise-dialog intelligence-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">Detalle reporte consumo de aceite</v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-alert
          v-if="oilKpiError"
          type="warning"
          variant="tonal"
          class="mb-4"
          :text="oilKpiError"
        />

        <LoadingTableState
          v-if="oilKpiLoading"
          message="Cargando detalle de consumo de aceite..."
          :rows="8"
          :columns="4"
        />

        <template v-else>
          <div class="d-flex align-start justify-space-between intelligence-wrap mb-4">
            <div>
              <div class="text-h6 font-weight-bold">
                {{ oilKpi?.selected_product?.label || "Sin aceite seleccionado" }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ oilKpi?.filters?.label || "Sin periodo" }}
              </div>
            </div>
            <div class="summary-strip">
              <v-chip label color="success" variant="tonal">
                {{ formatDetailedNumber(oilKpi?.totals?.total_cantidad) }} {{ oilQuantityUnitLabel }}
              </v-chip>
              <v-chip label color="info" variant="tonal">
                {{ oilKpi?.totals?.total_ordenes ?? 0 }} OT
              </v-chip>
              <v-chip label color="secondary" variant="tonal">
                {{ oilKpi?.totals?.total_equipos ?? 0 }} equipos
              </v-chip>
              <v-chip label color="warning" variant="tonal">
                ${{ formatDetailedNumber(oilKpi?.totals?.total_costo, 2) }}
              </v-chip>
              <v-chip v-if="oilKpi?.filters?.solo_cebado" label color="deep-orange" variant="tonal">
                Solo cebado
              </v-chip>
            </div>
          </div>

          <div class="indicator-grid mb-4">
            <div class="indicator-tile">
              <div class="text-caption text-medium-emphasis">Movimientos acumulados</div>
              <div class="text-h6 font-weight-bold">{{ oilTotalMovements }}</div>
              <div class="text-caption text-medium-emphasis">Registros de consumo consolidados</div>
            </div>
            <div class="indicator-tile">
              <div class="text-caption text-medium-emphasis">Costo promedio por {{ oilQuantityUnitLabel }}</div>
              <div class="text-h6 font-weight-bold">${{ formatDetailedNumber(oilAverageCostPerUnit, 2) }}</div>
              <div class="text-caption text-medium-emphasis">Costo unitario promedio del rango</div>
            </div>
            <div class="indicator-tile">
              <div class="text-caption text-medium-emphasis">OT de mayor consumo</div>
              <div class="text-h6 font-weight-bold">{{ oilPeakWorkOrder?.work_order_code || "Sin OT" }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ oilPeakWorkOrder ? `${formatDetailedNumber(oilPeakWorkOrder.cantidad)} ${oilQuantityUnitLabel}` : "Sin información" }}
              </div>
            </div>
            <div class="indicator-tile">
              <div class="text-caption text-medium-emphasis">Bodegas impactadas</div>
              <div class="text-h6 font-weight-bold">{{ oilWarehouseRows.length }}</div>
              <div class="text-caption text-medium-emphasis">Bodegas con consumos visibles</div>
            </div>
          </div>

          <v-row dense class="mb-2">
            <v-col cols="12" lg="6">
              <LubricantTrendChart
                title="Consumo por rango"
                subtitle="Evolución del aceite seleccionado según el periodo filtrado"
                :unit="oilQuantityUnitLabel"
                :points="oilTrendChartPoints"
              />
            </v-col>
            <v-col cols="12" lg="6">
              <DashboardBarChartCard
                title="Consumo por equipo"
                subtitle="Equipos que más aceite registraron en órdenes de trabajo"
                :chip-label="`${oilEquipmentChartItems.length} equipos`"
                chip-color="primary"
                :items="oilEquipmentChartItems"
                empty-text="No existen equipos con consumo de aceite en este rango."
              />
            </v-col>
            <v-col cols="12" lg="6">
              <DashboardBarChartCard
                title="Consumo por bodega"
                subtitle="Distribución del aceite según la bodega origen del consumo"
                :chip-label="`${oilWarehouseChartItems.length} bodegas`"
                chip-color="warning"
                :items="oilWarehouseChartItems"
                empty-text="No existen bodegas asociadas al consumo visible."
              />
            </v-col>
            <v-col cols="12" lg="6">
              <DashboardBarChartCard
                title="Consumo por estado OT"
                subtitle="Cómo se reparte el consumo según el estado de la orden"
                :chip-label="`${oilStatusChartItems.length} estados`"
                chip-color="secondary"
                :items="oilStatusChartItems"
                empty-text="No existen estados de OT asociados al aceite."
              />
            </v-col>
            <v-col cols="12" lg="6">
              <LubricantTrendChart
                title="Costo por rango"
                subtitle="Comportamiento del costo del aceite según el periodo filtrado"
                unit="USD"
                :points="oilCostTrendChartPoints"
              />
            </v-col>
            <v-col cols="12" lg="6">
              <LubricantTrendChart
                title="Picos diarios de consumo"
                subtitle="Dias donde el aceite registró su mayor salida para identificar picos de uso"
                :unit="oilQuantityUnitLabel"
                :points="oilDailyUsageChartPoints"
              />
            </v-col>
          </v-row>

          <v-row dense class="mb-4">
            <v-col cols="12" lg="8">
              <div class="text-subtitle-2 font-weight-medium mb-2">Órdenes de trabajo con detalle ampliado</div>
              <div class="dashboard-table-shell oil-kpi-table-shell oil-kpi-table-shell--tall">
                <v-table density="compact" class="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>OT</th>
                      <th>Tipo mtto</th>
                      <th>Equipo</th>
                      <th>{{ oilQuantityUnitLabel }}</th>
                      <th>Costo</th>
                      <th>Mov.</th>
                      <th>Estado</th>
                      <th>Bodega</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in oilWorkOrderRows" :key="`${item.work_order_id}-${item.producto_id}`">
                      <td>{{ item.fecha_referencia_label }}</td>
                      <td>
                        <div class="font-weight-medium">{{ item.work_order_code }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.work_order_title }}</div>
                      </td>
                      <td>{{ item.maintenance_kind_label || maintenanceKindLabel(item.maintenance_kind) }}</td>
                      <td>{{ item.equipment_label }}</td>
                      <td class="font-weight-medium">{{ formatDetailedNumber(item.cantidad) }}</td>
                      <td>${{ formatDetailedNumber(item.subtotal, 2) }}</td>
                      <td>{{ item.movimientos ?? 0 }}</td>
                      <td>{{ item.work_order_status || "Sin estado" }}</td>
                      <td>{{ item.bodega_label }}</td>
                    </tr>
                    <tr v-if="!oilWorkOrderRows.length">
                      <td colspan="9" class="text-center text-medium-emphasis py-4">
                        No existen órdenes de trabajo con consumo de este aceite en el rango consultado.
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-col>

            <v-col cols="12" lg="4">
              <div class="text-subtitle-2 font-weight-medium mb-2">Detalle del día pico</div>
              <div class="dashboard-table-shell oil-kpi-table-shell oil-kpi-table-shell--tall mb-4">
                <v-table density="compact" class="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>OT</th>
                      <th>Tipo</th>
                      <th>{{ oilQuantityUnitLabel }}</th>
                      <th>Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in oilPeakDayDetailRows" :key="`${item.work_order_id}-${item.fecha_referencia}-detail`">
                      <td>{{ item.fecha_referencia_label }}</td>
                      <td>
                        <div class="font-weight-medium">{{ item.work_order_code }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.equipment_label }}</div>
                      </td>
                      <td>{{ item.maintenance_kind_label || maintenanceKindLabel(item.maintenance_kind) }}</td>
                      <td class="font-weight-medium">{{ formatDetailedNumber(item.cantidad) }}</td>
                      <td>${{ formatDetailedNumber(item.subtotal, 2) }}</td>
                    </tr>
                    <tr v-if="!oilPeakDayDetailRows.length">
                      <td colspan="5" class="text-center text-medium-emphasis py-4">
                        No existe un día pico identificado para este aceite.
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <div class="text-subtitle-2 font-weight-medium mb-2">Resumen por bodega</div>
              <div class="dashboard-table-shell oil-kpi-table-shell oil-kpi-table-shell--tall">
                <v-table density="compact" class="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Bodega</th>
                      <th>OT</th>
                      <th>{{ oilQuantityUnitLabel }}</th>
                      <th>Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in oilWarehouseRows" :key="item.bodega_label">
                      <td>{{ item.bodega_label }}</td>
                      <td>{{ item.total_ordenes }}</td>
                      <td class="font-weight-medium">{{ formatDetailedNumber(item.total_cantidad) }}</td>
                      <td>${{ formatDetailedNumber(item.total_costo, 2) }}</td>
                    </tr>
                    <tr v-if="!oilWarehouseRows.length">
                      <td colspan="4" class="text-center text-medium-emphasis py-4">
                        Sin consumo agrupado por bodega.
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <div class="d-flex align-start justify-space-between intelligence-wrap mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Reporte de lubricante relacionado</div>
              <div class="text-body-2 text-medium-emphasis">
                Si existe un análisis de lubricante asociado al aceite seleccionado, lo mostramos aquí con su reporte completo.
              </div>
            </div>
            <div style="min-width: min(420px, 100%);">
              <v-autocomplete
                v-model="oilRelatedLubricantSelection"
                :items="lubricantCatalogOptions"
                item-title="label"
                return-object
                clearable
                label="Lubricante relacionado"
                variant="outlined"
                density="comfortable"
                hide-details
                @update:model-value="handleOilLubricantSelection"
              />
            </div>
          </div>

          <LubricantDashboardPanel
            :dashboard="oilRelatedDashboard"
            :loading="oilRelatedDashboardLoading"
            :error="oilRelatedDashboardError"
          />
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="oilDetailDialog = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ReadonlyDetailDialog
    v-model="oilRowDetailDialog"
    :title="oilRowDetailTitle"
    :subtitle="oilRowDetailSubtitle"
    :columns="oilRowDetailColumns"
    :rows="oilRowDetailRows"
  />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import LubricantTrendChart from "@/components/maintenance/LubricantTrendChart.vue";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import ReadonlyDetailDialog from "@/components/ui/ReadonlyDetailDialog.vue";
import { lubricantCompartments } from "@/app/config/lubricant-analysis";
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { formatDateForInput, formatDateTime } from "@/app/utils/date-time";
import {
  buildDailyReportsReport,
  buildIndicatorsReport,
  buildLubricantReport,
  buildOilConsumptionReport,
  buildProceduresReport,
  buildWeeklyScheduleReport,
  downloadReportExcel,
  downloadReportPdf,
  type ReportChart,
} from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;
type IntelligenceCard = {
  key: string;
  label: string;
  value: number;
  helper: string;
  icon: string;
  accent: string;
  routeName?: string;
};

type DashboardChartItem = {
  key: string;
  label: string;
  value: number;
  valueLabel?: string;
  helper?: string;
  color?: string;
};

type TrendChartPoint = {
  codigo?: string | null;
  fecha?: string | null;
  valor?: number | null;
  nivel_alerta?: string | null;
};

type SummaryState = {
  generated_at?: string;
  kpis?: Record<string, number>;
  process_breakdown?: Array<{ tipo_proceso: string; total: number }>;
  recent_events?: AnyRow[];
};

const loading = ref(false);
const error = ref<string | null>(null);
const summary = reactive<SummaryState>({});
const procedures = ref<AnyRow[]>([]);
const analyses = ref<AnyRow[]>([]);
const schedules = ref<AnyRow[]>([]);
const dailyReports = ref<AnyRow[]>([]);
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const exportState = reactive<Record<string, boolean>>({});
const router = useRouter();
const { mdAndDown } = useDisplay();
const auth = useAuthStore();
const menuStore = useMenuStore();
const dashboardDialog = ref(false);
const isDashboardDialogFullscreen = computed(() => mdAndDown.value);
const oilDetailDialog = ref(false);
const dashboardSelection = ref<AnyRow | null>(null);
const dashboardPeriod = ref("MENSUAL");
const dashboardFrom = ref("");
const dashboardTo = ref("");
const dashboardCompartimento = ref<string | null>(null);
const lubricantDashboard = ref<AnyRow | null>(null);
const lubricantDashboardLoading = ref(false);
const lubricantDashboardError = ref<string | null>(null);
const oilKpi = ref<AnyRow | null>(null);
const oilKpiLoading = ref(false);
const oilKpiError = ref<string | null>(null);
const oilSelectedProductId = ref<string | undefined>(undefined);
const oilPeriod = ref("MENSUAL");
const oilReferenceDate = ref(formatDateForInput());
const oilCustomFrom = ref("");
const oilCustomTo = ref("");
const oilOnlyCebado = ref(false);
const oilRelatedLubricantSelection = ref<AnyRow | null>(null);
const oilRelatedDashboard = ref<AnyRow | null>(null);
const oilRelatedDashboardLoading = ref(false);
const oilRelatedDashboardError = ref<string | null>(null);
const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "Inteligencia operativa",
    "Inteligencia operativa de mantenimiento",
    "Inteligencia mantenimiento",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canAccessIntelligenceReports = computed(() =>
  hasReportAccess(
    auth.user?.effectiveReportes ?? auth.user?.reportes,
    "inteligencia_operativa",
  ),
);

const dashboardPeriodOptions = [
  { value: "SEMANAL", title: "Semanal" },
  { value: "MENSUAL", title: "Mensual" },
  { value: "ANUAL", title: "Anual" },
  { value: "PERSONALIZADO", title: "Personalizado" },
];
const oilPeriodOptions = [
  { value: "DIARIO", title: "Diario" },
  ...dashboardPeriodOptions,
];

const monthOptions = [
  { value: 1, title: "Enero" },
  { value: 2, title: "Febrero" },
  { value: 3, title: "Marzo" },
  { value: 4, title: "Abril" },
  { value: 5, title: "Mayo" },
  { value: 6, title: "Junio" },
  { value: 7, title: "Julio" },
  { value: 8, title: "Agosto" },
  { value: 9, title: "Septiembre" },
  { value: 10, title: "Octubre" },
  { value: 11, title: "Noviembre" },
  { value: 12, title: "Diciembre" },
];

const yearOptions = Array.from({ length: 101 }, (_, index) => 2000 + index)
  .reverse()
  .map((value) => ({ value, title: String(value) }));

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

function buildMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function parseDateValue(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeLooseToken(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isInSelectedPeriod(value: unknown) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return parsed >= selectedPeriodRange.value.start && parsed <= selectedPeriodRange.value.end;
}

function overlapsSelectedPeriod(fromValue: unknown, toValue: unknown) {
  const from = parseDateValue(fromValue);
  const to = parseDateValue(toValue || fromValue);
  if (!from && !to) return false;
  const start = from ?? to;
  const end = to ?? from;
  if (!start || !end) return false;
  return start <= selectedPeriodRange.value.end && end >= selectedPeriodRange.value.start;
}

function normalizeProcessType(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function parseDurationHours(startValue: unknown, endValue: unknown) {
  const start = String(startValue || "").trim();
  const end = String(endValue || "").trim();
  const startMatch = /^(\d{1,2}):(\d{2})$/.exec(start);
  const endMatch = /^(\d{1,2}):(\d{2})$/.exec(end);
  if (!startMatch || !endMatch) return 0;
  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) return 0;
  return (endMinutes - startMinutes) / 60;
}

const selectedPeriodRange = computed(() => buildMonthRange(selectedYear.value, selectedMonth.value));
const selectedPeriodLabel = computed(() =>
  new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(
    new Date(selectedYear.value, selectedMonth.value - 1, 1),
  ),
);

function resetState() {
  summary.generated_at = undefined;
  summary.kpis = {};
  summary.process_breakdown = [];
  summary.recent_events = [];
  procedures.value = [];
  analyses.value = [];
  schedules.value = [];
  dailyReports.value = [];
}

async function loadIntelligence() {
  if (!canRead.value || !canAccessIntelligenceReports.value) {
    resetState();
    return;
  }
  loading.value = true;
  error.value = null;

  try {
    const [summaryRes, proceduresRes, analysesRes, schedulesRes, reportsRes] = await Promise.all([
      api.get("/kpi_maintenance/inteligencia/summary", {
        params: { year: selectedYear.value, month: selectedMonth.value },
      }),
      api.get("/kpi_maintenance/inteligencia/procedimientos"),
      api.get("/kpi_maintenance/inteligencia/analisis-lubricante"),
      api.get("/kpi_maintenance/inteligencia/cronogramas-semanales"),
      api.get("/kpi_maintenance/inteligencia/reportes-diarios"),
    ]);

    resetState();
    Object.assign(summary, unwrap(summaryRes.data, {}));
    procedures.value = unwrap(proceduresRes.data, []);
    analyses.value = unwrap(analysesRes.data, []);
    schedules.value = unwrap(schedulesRes.data, []);
    dailyReports.value = unwrap(reportsRes.data, []);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar la inteligencia operativa.";
  } finally {
    loading.value = false;
  }
}

async function loadOilKpi() {
  if (!canRead.value || !canAccessIntelligenceReports.value) {
    oilKpi.value = null;
    oilKpiError.value = null;
    return;
  }

  oilKpiLoading.value = true;
  oilKpiError.value = null;

  try {
    const params: Record<string, any> = {
      producto_id: oilSelectedProductId.value || undefined,
      periodo: oilPeriod.value,
      year: selectedYear.value,
      month: selectedMonth.value,
      reference_date: oilNeedsReferenceDate.value
        ? oilReferenceDate.value || undefined
        : undefined,
      from: oilUsesCustomRange.value ? oilCustomFrom.value || undefined : undefined,
      to: oilUsesCustomRange.value ? oilCustomTo.value || undefined : undefined,
      solo_cebado: oilOnlyCebado.value || undefined,
    };
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-aceite/kpi", {
      params,
    });
    const payload = unwrap<AnyRow | null>(data, null);
    oilKpi.value = payload;
    if (!oilSelectedProductId.value && payload?.selected_product_id) {
      oilSelectedProductId.value = payload.selected_product_id;
    }
  } catch (e: any) {
    oilKpiError.value =
      e?.response?.data?.message || "No se pudo cargar el reporte consumo de aceite.";
  } finally {
    oilKpiLoading.value = false;
  }
}

function prettifyProcess(value: string) {
  return String(value || "SIN_TIPO")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function chipColorForStatus(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  if (["ALERTA", "CRITICO", "CRITICA", "POR CAMBIO", "VENCIDA"].includes(normalized)) return "error";
  if (["OBSERVACION", "PENDIENTE", "WARNING"].includes(normalized)) return "warning";
  if (["COMPLETED", "CERRADA", "NORMAL", "OPERATIVO"].includes(normalized)) return "success";
  return "secondary";
}

function maintenanceKindLabel(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CORRECTIVO") return "Correctivo";
  if (normalized === "PREVENTIVO") return "Preventivo";
  if (normalized === "PREDICTIVO") return "Predictivo";
  if (normalized === "CEBADO") return "Cebado";
  if (normalized === "INSPECCION") return "Inspeccion";
  return normalized || "Sin definir";
}

function formatCompactNumber(value: unknown) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  if (Math.abs(numeric) >= 1000) {
    return new Intl.NumberFormat("es-EC", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numeric);
  }
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: numeric % 1 === 0 ? 0 : 1,
  }).format(numeric);
}

function formatDetailedNumber(value: unknown, digits = 4) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(numeric);
}

function dayOrder(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  const order = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
  const index = order.indexOf(normalized);
  return index >= 0 ? index : order.length + 1;
}

const filteredAnalyses = computed(() =>
  analyses.value.filter((item) => isInSelectedPeriod(item.fecha_reporte || item.fecha_muestra || item.created_at)),
);

const filteredSchedules = computed(() =>
  schedules.value.filter((item) =>
    overlapsSelectedPeriod(item.fecha_inicio || item.created_at, item.fecha_fin || item.fecha_inicio || item.created_at),
  ),
);

const filteredDailyReports = computed(() =>
  dailyReports.value.filter((item) => isInSelectedPeriod(item.fecha_reporte || item.created_at)),
);

const oilUsesCustomRange = computed(() => oilPeriod.value === "PERSONALIZADO");
const oilNeedsReferenceDate = computed(() =>
  oilPeriod.value === "DIARIO" || oilPeriod.value === "SEMANAL",
);
const oilCatalogOptions = computed<AnyRow[]>(() =>
  unwrap<AnyRow[]>(oilKpi.value?.catalog, []),
);
const oilSelectedProduct = computed<AnyRow | null>(() =>
  unwrap<AnyRow | null>(oilKpi.value?.selected_product, null),
);
const oilQuantityUnitLabel = computed(() => {
  return "gal";
});
const ANNULLED_WORK_ORDER_STATUS_TOKENS = ["ANULADA", "ANULADO", "CANCELLED", "CANCELED", "VOID", "VOIDED"];

function isAnnulledOilWorkOrderRow(item: AnyRow) {
  const raw = String(item?.work_order_status ?? item?.status_workflow ?? item?.status ?? "")
    .trim()
    .toUpperCase();
  return ANNULLED_WORK_ORDER_STATUS_TOKENS.includes(raw);
}

const oilWorkOrderRows = computed<AnyRow[]>(() =>
  unwrap<AnyRow[]>(oilKpi.value?.work_orders, []).filter((item) => !isAnnulledOilWorkOrderRow(item)),
);
const oilEquipmentRows = computed<AnyRow[]>(() =>
  unwrap<AnyRow[]>(oilKpi.value?.by_equipment, []),
);

function resolveOilTrendLevel(value: number, average: number) {
  if (!Number.isFinite(value) || !Number.isFinite(average) || average <= 0) return "NORMAL";
  if (value >= average * 1.5) return "ANORMAL";
  if (value >= average * 1.15) return "PRECAUCION";
  return "NORMAL";
}

function resolveOilTrendDate(item: AnyRow, index: number) {
  return String(
    item.label ||
      item.fecha_referencia_label ||
      item.fecha_referencia ||
      item.equipment_label ||
      item.work_order_code ||
      item.key ||
      `P${index + 1}`,
  );
}

function resolveOilTrendCode(item: AnyRow, index: number) {
  if (item.work_order_code) return String(item.work_order_code);
  const orders = item.total_ordenes ?? item.ordenes;
  const movements = item.total_movimientos ?? item.movimientos;
  if (orders != null) return `${orders} OT`;
  if (movements != null) return `${movements} mov.`;
  return item.key ? String(item.key) : `P${index + 1}`;
}

function buildOilTrendPoints(rows: AnyRow[], valueField: string): TrendChartPoint[] {
  const numericRows = rows
    .map((item, index) => ({
      item,
      index,
      value: Number(item?.[valueField] || 0),
    }))
    .filter((item) => Number.isFinite(item.value));
  const average =
    numericRows.length > 0
      ? numericRows.reduce((total, item) => total + item.value, 0) / numericRows.length
      : 0;

  return numericRows.map(({ item, index, value }) => ({
    codigo: resolveOilTrendCode(item, index),
    fecha: resolveOilTrendDate(item, index),
    valor: value,
    nivel_alerta: resolveOilTrendLevel(value, average),
  }));
}

const oilTrendChartPoints = computed<TrendChartPoint[]>(() =>
  buildOilTrendPoints(unwrap<AnyRow[]>(oilKpi.value?.trend, []), "cantidad"),
);
const oilCostTrendChartPoints = computed<TrendChartPoint[]>(() =>
  buildOilTrendPoints(unwrap<AnyRow[]>(oilKpi.value?.statistics?.cost_trend, []), "costo"),
);
const oilDailyUsageRows = computed<AnyRow[]>(() => {
  const grouped = new Map<string, AnyRow>();
  for (const item of oilWorkOrderRows.value) {
    const key = String(item.fecha_referencia || "").slice(0, 10);
    if (!key) continue;
    const current = grouped.get(key) ?? {
      key,
      fecha_referencia: key,
      fecha_referencia_label: item.fecha_referencia_label || key,
      total_cantidad: 0,
      total_costo: 0,
      total_movimientos: 0,
      total_ordenes: 0,
      work_order_ids: new Set<string>(),
      details: [] as AnyRow[],
    };
    current.total_cantidad += Number(item.cantidad || 0);
    current.total_costo += Number(item.subtotal || 0);
    current.total_movimientos += Number(item.movimientos || 0);
    current.work_order_ids.add(String(item.work_order_id || ""));
    current.total_ordenes = current.work_order_ids.size;
    current.details.push(item);
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((item: AnyRow) => ({
      ...item,
      total_cantidad: Number(item.total_cantidad.toFixed(4)),
      total_costo: Number(item.total_costo.toFixed(2)),
    }))
    .sort((a: AnyRow, b: AnyRow) => b.total_cantidad - a.total_cantidad || String(a.key).localeCompare(String(b.key)));
});
const oilDailyUsageChartPoints = computed<TrendChartPoint[]>(() =>
  buildOilTrendPoints(
    [...oilDailyUsageRows.value].sort((a: AnyRow, b: AnyRow) => String(a.key).localeCompare(String(b.key))),
    "total_cantidad",
  ),
);
const oilEquipmentChartPoints = computed<TrendChartPoint[]>(() =>
  buildOilTrendPoints(
    oilEquipmentRows.value
      .slice()
      .sort((left, right) => Number(right.total_cantidad || 0) - Number(left.total_cantidad || 0)),
    "total_cantidad",
  ),
);
const oilWorkOrderChartPoints = computed<TrendChartPoint[]>(() =>
  buildOilTrendPoints(
    oilWorkOrderRows.value
      .slice()
      .sort((left, right) => {
        const leftDate = String(left.fecha_referencia || left.fecha_referencia_label || "");
        const rightDate = String(right.fecha_referencia || right.fecha_referencia_label || "");
        return leftDate.localeCompare(rightDate) || String(left.work_order_code || "").localeCompare(String(right.work_order_code || ""));
      }),
    "cantidad",
  ),
);
const oilPeakDay = computed<AnyRow | null>(() => oilDailyUsageRows.value[0] ?? null);
const oilPeakDayDetailRows = computed<AnyRow[]>(() =>
  oilPeakDay.value?.details
    ? [...oilPeakDay.value.details].sort((a: AnyRow, b: AnyRow) => Number(b.cantidad || 0) - Number(a.cantidad || 0))
    : [],
);
const oilEquipmentChartItems = computed<DashboardChartItem[]>(() =>
  oilEquipmentRows.value.slice(0, 6).map((item: AnyRow) => ({
    key: item.equipment_id || item.equipment_label,
    label: item.equipment_label || "Sin equipo",
    value: Number(item.total_cantidad || 0),
    valueLabel: `${formatDetailedNumber(item.total_cantidad)} ${oilQuantityUnitLabel.value}`,
    helper: `${item.total_ordenes ?? 0} OT`,
  })),
);
const oilWarehouseRows = computed<AnyRow[]>(() => {
  const grouped = new Map<string, AnyRow>();
  for (const item of oilWorkOrderRows.value) {
    const key = String(item.bodega_label || "Sin bodega");
    const current = grouped.get(key) ?? {
      bodega_label: key,
      total_cantidad: 0,
      total_costo: 0,
      total_ordenes: 0,
      work_order_ids: new Set<string>(),
    };
    current.total_cantidad += Number(item.cantidad || 0);
    current.total_costo += Number(item.subtotal || 0);
    current.work_order_ids.add(String(item.work_order_id || ""));
    current.total_ordenes = current.work_order_ids.size;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((item) => ({
      ...item,
      total_cantidad: Number(item.total_cantidad.toFixed(4)),
      total_costo: Number(item.total_costo.toFixed(2)),
    }))
    .sort((a, b) => b.total_cantidad - a.total_cantidad);
});
const oilWarehouseChartItems = computed<DashboardChartItem[]>(() =>
  oilWarehouseRows.value.slice(0, 6).map((item: AnyRow) => ({
    key: item.bodega_label,
    label: item.bodega_label || "Sin bodega",
    value: Number(item.total_cantidad || 0),
    valueLabel: `${formatDetailedNumber(item.total_cantidad)} ${oilQuantityUnitLabel.value}`,
    helper: `${item.total_ordenes ?? 0} OT`,
  })),
);
const oilStatusRows = computed<AnyRow[]>(() => {
  const grouped = new Map<string, AnyRow>();
  for (const item of oilWorkOrderRows.value) {
    const key = String(item.work_order_status || "Sin estado");
    const current = grouped.get(key) ?? {
      status: key,
      total_cantidad: 0,
      total_ordenes: 0,
      work_order_ids: new Set<string>(),
    };
    current.total_cantidad += Number(item.cantidad || 0);
    current.work_order_ids.add(String(item.work_order_id || ""));
    current.total_ordenes = current.work_order_ids.size;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((item) => ({
      ...item,
      total_cantidad: Number(item.total_cantidad.toFixed(4)),
    }))
    .sort((a, b) => b.total_cantidad - a.total_cantidad);
});
const oilStatusChartItems = computed<DashboardChartItem[]>(() =>
  oilStatusRows.value.map((item: AnyRow) => ({
    key: item.status,
    label: item.status || "Sin estado",
    value: Number(item.total_cantidad || 0),
    valueLabel: `${formatDetailedNumber(item.total_cantidad)} ${oilQuantityUnitLabel.value}`,
    helper: `${item.total_ordenes ?? 0} OT`,
  })),
);
const oilTotalMovements = computed(() =>
  oilWorkOrderRows.value.reduce((acc, item) => acc + Number(item.movimientos || 0), 0),
);
const oilAverageCostPerUnit = computed(() => {
  const quantity = Number(oilKpi.value?.totals?.total_cantidad || 0);
  const totalCost = Number(oilKpi.value?.totals?.total_costo || 0);
  return quantity > 0 ? totalCost / quantity : 0;
});
const oilPeakWorkOrder = computed<AnyRow | null>(() =>
  oilWorkOrderRows.value
    .slice()
    .sort((a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0))[0] ?? null,
);
const oilLinkedLubricantCandidate = computed<AnyRow | null>(() => {
  const product = oilSelectedProduct.value;
  if (!product) return null;

  const productCode = normalizeLooseToken(product.codigo);
  const productName = normalizeLooseToken(product.nombre);
  if (!productCode && !productName) return null;

  return (
    lubricantCatalogOptions.value.find(
      (item) =>
        productCode &&
        normalizeLooseToken(item.lubricante_codigo) === productCode,
    ) ??
    lubricantCatalogOptions.value.find(
      (item) => productName && normalizeLooseToken(item.lubricante) === productName,
    ) ??
    lubricantCatalogOptions.value.find((item) => {
      const label = normalizeLooseToken(item.label);
      return Boolean(productCode && label.includes(productCode)) || Boolean(productName && label.includes(productName));
    }) ??
    null
  );
});

const operationalScheduleItems = computed(() =>
  filteredSchedules.value
    .flatMap((schedule) =>
      (schedule?.detalles ?? [])
        .filter((detail: AnyRow) => {
          const process = normalizeProcessType(detail?.tipo_proceso);
          return ["OPERACION", "MPG"].includes(process) && isInSelectedPeriod(detail?.fecha_actividad || schedule?.fecha_inicio);
        })
        .map((detail: AnyRow) => ({
          ...detail,
          cronograma_codigo: schedule?.codigo || null,
          fecha_resuelta: detail?.fecha_actividad || schedule?.fecha_inicio || null,
          duracion_horas: parseDurationHours(detail?.hora_inicio, detail?.hora_fin),
        })),
    )
    .sort(
      (a, b) =>
        (parseDateValue(a?.fecha_resuelta)?.getTime() ?? 0) -
          (parseDateValue(b?.fecha_resuelta)?.getTime() ?? 0) ||
        String(a?.hora_inicio || "").localeCompare(String(b?.hora_inicio || "")),
    ),
);

const operationScheduleSummary = computed(() => {
  const totalHours = operationalScheduleItems.value.reduce((acc, item) => acc + Number(item?.duracion_horas || 0), 0);
  const uniqueDays = new Set(
    operationalScheduleItems.value.map((item) => String(item?.fecha_resuelta || "").slice(0, 10)).filter(Boolean),
  );
  return {
    days: uniqueDays.size,
    activities: operationalScheduleItems.value.length,
    totalHours,
    hoursLabel: `${totalHours.toFixed(1)} h`,
  };
});

const breakdownChartItems = computed(() => {
  const total = Math.max(
    1,
    breakdownItems.value.reduce((acc, item) => acc + Number(item?.total || 0), 0),
  );
  return breakdownItems.value.map((item, index) => {
    const rawValue = Number(item?.total || 0);
    return {
      key: String(item?.tipo_proceso || index),
      label: prettifyProcess(item?.tipo_proceso || "Sin tipo"),
      value: rawValue,
      valueLabel: formatCompactNumber(rawValue),
      helper: `${((rawValue / total) * 100).toFixed(1)}% del periodo`,
    };
  });
});

const processPressureChartItems = computed(() => {
  const source = processIndicatorRows.value;
  const maxValue = Math.max(...source.map((item) => Number(item?.value || 0)), 1);
  return source.map((item) => ({
    key: item.key,
    label: item.label,
    value: Number(item.value || 0),
    valueLabel: formatCompactNumber(item.value),
    helper: item.helper,
    percent: Math.max(6, Math.min(100, (Number(item.value || 0) / maxValue) * 100)),
  }));
});

const operationCadenceChartItems = computed(() => {
  const grouped = new Map<string, { label: string; hours: number; activities: number }>();
  for (const item of operationalScheduleItems.value) {
    const dateKey = String(item?.fecha_resuelta || "").slice(0, 10);
    if (!dateKey) continue;
    const current = grouped.get(dateKey) ?? {
      label: new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short" }).format(
        parseDateValue(dateKey) ?? new Date(),
      ),
      hours: 0,
      activities: 0,
    };
    current.hours += Number(item?.duracion_horas || 0);
    current.activities += 1;
    grouped.set(dateKey, current);
  }

  const items = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, value]) => ({
      key,
      label: value.label,
      value: value.hours,
      valueLabel: `${value.hours.toFixed(1)} h`,
      helper: `${value.activities} actividad(es)`,
    }));

  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  return items.map((item) => ({
    ...item,
    percent: Math.max(8, Math.min(100, (Number(item.value || 0) / maxValue) * 100)),
  }));
});

function moduleReport(moduleKey: string) {
  if (moduleKey === "indicadores") return buildIndicatorsReport(summary);
  if (moduleKey === "procedimientos") return buildProceduresReport(procedures.value);
  if (moduleKey === "analisis") return buildLubricantReport(filteredAnalyses.value);
  if (moduleKey === "reportes") return buildDailyReportsReport(filteredDailyReports.value);
  return buildWeeklyScheduleReport(filteredSchedules.value);
}

function exportKey(moduleKey: string, format: "excel" | "pdf") {
  return `${moduleKey}:${format}`;
}

function isExporting(moduleKey: string, format: "excel" | "pdf") {
  return Boolean(exportState[exportKey(moduleKey, format)]);
}

async function exportModule(moduleKey: string, format: "excel" | "pdf") {
  if (!canAccessIntelligenceReports.value) {
    error.value = "No tienes permisos para exportar este reporte.";
    return;
  }
  const key = exportKey(moduleKey, format);
  exportState[key] = true;
  error.value = null;

  try {
    const report = moduleReport(moduleKey);
    if (format === "excel") {
      await downloadReportExcel(report);
    } else {
      await downloadReportPdf(report);
    }
  } catch (e: any) {
    error.value = e?.message || "No se pudo generar el reporte solicitado.";
  } finally {
    exportState[key] = false;
  }
}

async function exportOilReport(format: "excel" | "pdf") {
  if (!canAccessIntelligenceReports.value || !oilKpi.value) {
    oilKpiError.value = "No hay un análisis de aceite cargado para exportar.";
    return;
  }
  const key = exportKey("aceites", format);
  exportState[key] = true;
  oilKpiError.value = null;

  try {
    const chartPointLabel = (point: TrendChartPoint, fallback: string) =>
      String(point.fecha || point.codigo || fallback);
    const reportCharts: ReportChart[] = [
      {
        title: "Consumo por rango",
        subtitle: "Evolución del consumo en el período filtrado",
        type: "line",
        unit: oilQuantityUnitLabel.value,
        points: oilTrendChartPoints.value.slice(-12).map((point, index) => ({
          label: chartPointLabel(point, `P${index + 1}`),
          value: Number(point.valor || 0),
        })),
      },
      {
        title: "Consumo por equipo",
        subtitle: "Equipos con mayor consumo",
        type: "bar",
        unit: oilQuantityUnitLabel.value,
        points: oilEquipmentRows.value.slice(0, 10).map((item: AnyRow) => ({
          label: String(item.equipment_label || "Sin equipo"),
          value: Number(item.total_cantidad || 0),
        })),
      },
      {
        title: "Consumo por OT ejecutada",
        subtitle: "Órdenes del período en secuencia cronológica",
        type: "bar",
        unit: oilQuantityUnitLabel.value,
        points: oilWorkOrderRows.value
          .slice()
          .sort((left: AnyRow, right: AnyRow) =>
            String(left.fecha_referencia || "").localeCompare(String(right.fecha_referencia || "")),
          )
          .slice(-12)
          .map((item: AnyRow) => ({
            label: String(item.work_order_code || "Sin OT"),
            value: Number(item.cantidad || 0),
          })),
      },
      {
        title: "Costo por rango",
        subtitle: "Evolución del costo del aceite consumido",
        type: "line",
        unit: "USD",
        points: oilCostTrendChartPoints.value.slice(-12).map((point, index) => ({
          label: chartPointLabel(point, `P${index + 1}`),
          value: Number(point.valor || 0),
        })),
      },
      {
        title: "Picos diarios de consumo",
        subtitle: "Consumo agregado por día",
        type: "bar",
        unit: oilQuantityUnitLabel.value,
        points: oilDailyUsageRows.value
          .slice()
          .sort((left: AnyRow, right: AnyRow) => String(left.key || "").localeCompare(String(right.key || "")))
          .slice(-12)
          .map((item: AnyRow) => ({
            label: String(item.fecha_referencia_label || item.key || "Sin fecha"),
            value: Number(item.total_cantidad || 0),
          })),
      },
      {
        title: "Consumo por bodega",
        subtitle: "Distribución del consumo entre bodegas",
        type: "bar",
        unit: oilQuantityUnitLabel.value,
        points: oilWarehouseChartItems.value.slice(0, 10).map((item) => ({
          label: item.label,
          value: Number(item.value || 0),
        })),
      },
      {
        title: "Consumo por estado OT",
        subtitle: "Distribución según el estado de la orden",
        type: "bar",
        unit: oilQuantityUnitLabel.value,
        points: oilStatusChartItems.value.map((item) => ({
          label: item.label,
          value: Number(item.value || 0),
        })),
      },
    ];
    const report = buildOilConsumptionReport({
      kpi: oilKpi.value,
      workOrders: oilWorkOrderRows.value,
      equipmentRows: oilEquipmentRows.value,
      dailyRows: oilDailyUsageRows.value,
      warehouseRows: oilWarehouseRows.value,
      statusRows: oilStatusRows.value,
      unitLabel: oilQuantityUnitLabel.value,
      charts: reportCharts,
    });
    if (format === "excel") {
      await downloadReportExcel(report);
    } else {
      await downloadReportPdf(report);
    }
  } catch (e: any) {
    oilKpiError.value = e?.message || "No se pudo generar el reporte de consumo de aceite.";
  } finally {
    exportState[key] = false;
  }
}

function openCard(card: IntelligenceCard) {
  if (card.key === "lubricantes-dashboard") {
    dashboardDialog.value = true;
    return;
  }
  if (!card.routeName) return;
  router.push({ name: card.routeName });
}

function openOilDetailDialog() {
  oilDetailDialog.value = true;
  const candidate = oilLinkedLubricantCandidate.value;
  if (candidate) {
    oilRelatedLubricantSelection.value = candidate;
    void handleOilLubricantSelection(candidate);
    return;
  }
  if (oilRelatedLubricantSelection.value) {
    void handleOilLubricantSelection(oilRelatedLubricantSelection.value);
  }
}

const oilRowDetailDialog = ref(false);
const oilRowDetailTitle = ref("");
const oilRowDetailSubtitle = ref("");
const oilRowDetailColumns = ref<{ key: string; label: string }[]>([]);
const oilRowDetailRows = ref<AnyRow[]>([]);

function openOilRowDetail(
  title: string,
  columns: { key: string; label: string }[],
  row: AnyRow,
  subtitle?: string,
) {
  oilRowDetailTitle.value = title;
  oilRowDetailSubtitle.value = subtitle || "";
  oilRowDetailColumns.value = columns;
  oilRowDetailRows.value = [row];
  oilRowDetailDialog.value = true;
}

const OIL_WORK_ORDER_ROW_COLUMNS = [
  { key: "fecha_referencia_label", label: "Fecha" },
  { key: "work_order_code", label: "OT" },
  { key: "work_order_title", label: "Título" },
  { key: "maintenance_kind_label", label: "Tipo mtto" },
  { key: "equipment_label", label: "Equipo" },
  { key: "cantidad", label: "Cantidad" },
  { key: "diferencia_vs_anterior", label: "Dif. anterior" },
  { key: "bodega_label", label: "Bodega" },
];

function openOilWorkOrderRowDetail(item: AnyRow) {
  openOilRowDetail("Consumo de aceite - Orden de trabajo", OIL_WORK_ORDER_ROW_COLUMNS, {
    ...item,
    maintenance_kind_label: item.maintenance_kind_label || maintenanceKindLabel(item.maintenance_kind),
    cantidad: formatDetailedNumber(item.cantidad),
    diferencia_vs_anterior:
      item.diferencia_vs_anterior == null ? "Base" : formatDetailedNumber(item.diferencia_vs_anterior),
  });
}

const OIL_EQUIPMENT_ROW_COLUMNS = [
  { key: "equipment_label", label: "Equipo" },
  { key: "total_ordenes", label: "Órdenes" },
  { key: "total_cantidad", label: "Cantidad" },
];

function openOilEquipmentRowDetail(item: AnyRow) {
  openOilRowDetail("Consumo de aceite - Equipo", OIL_EQUIPMENT_ROW_COLUMNS, {
    ...item,
    total_cantidad: formatDetailedNumber(item.total_cantidad),
  });
}

async function loadLubricantDashboardInto(
  targetDashboard: typeof lubricantDashboard,
  targetLoading: typeof lubricantDashboardLoading,
  targetError: typeof lubricantDashboardError,
  params?: Record<string, any>,
) {
  targetLoading.value = true;
  targetError.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", {
      params,
    });
    targetDashboard.value = unwrap(data, null);
  } catch (e: any) {
    targetError.value =
      e?.response?.data?.message || "No se pudo cargar el dashboard de lubricantes.";
  } finally {
    targetLoading.value = false;
  }
}

async function loadLubricantDashboard(params?: Record<string, any>) {
  await loadLubricantDashboardInto(
    lubricantDashboard,
    lubricantDashboardLoading,
    lubricantDashboardError,
    params,
  );
}

async function handleDashboardSelection(value: AnyRow | null) {
  if (!value) {
    lubricantDashboard.value = null;
    return;
  }
  await loadLubricantDashboard({
    lubricante: value.lubricante,
    marca_lubricante: value.marca_lubricante,
    periodo: dashboardPeriod.value,
    from: dashboardFrom.value || undefined,
    to: dashboardTo.value || undefined,
    compartimento: dashboardCompartimento.value || undefined,
  });
}

async function reloadDashboard() {
  if (!dashboardSelection.value) return;
  await handleDashboardSelection(dashboardSelection.value);
}

async function handleOilLubricantSelection(value: AnyRow | null) {
  if (!value) {
    oilRelatedDashboard.value = null;
    oilRelatedDashboardError.value = null;
    return;
  }
  await loadLubricantDashboardInto(
    oilRelatedDashboard,
    oilRelatedDashboardLoading,
    oilRelatedDashboardError,
    {
      lubricante: value.lubricante,
      marca_lubricante: value.marca_lubricante,
      periodo: "PERSONALIZADO",
      from: oilKpi.value?.filters?.from || undefined,
      to: oilKpi.value?.filters?.to || undefined,
    },
  );
}

const generatedAtLabel = computed(() => {
  if (!summary.generated_at) return "Sin sincronizar";
  return formatDateTime(summary.generated_at, "Sin sincronizar");
});

const breakdownItems = computed(() => summary.process_breakdown ?? []);

const analysesInAlert = computed(
  () => filteredAnalyses.value.filter((item) => String(item.estado_diagnostico || "").toUpperCase() === "ALERTA").length,
);

const kpiCards = computed<IntelligenceCard[]>(() => [
  {
    key: "procedimientos",
    label: "Plantillas",
    value: procedures.value.length,
    helper: "Procedimientos y checklist operativos",
    icon: "mdi-file-document-multiple-outline",
    accent: "linear-gradient(135deg, rgba(47,108,171,0.18), rgba(122,184,255,0.06))",
    routeName: "inteligencia-procedimientos",
  },
  {
    key: "analisis",
    label: "Analisis lubricante",
    value: filteredAnalyses.value.length,
    helper: `${analysesInAlert.value} en alerta`,
    icon: "mdi-flask-outline",
    accent: "linear-gradient(135deg, rgba(226,79,95,0.18), rgba(255,154,165,0.06))",
    routeName: "inteligencia-analisis-lubricante",
  },
  {
    key: "lubricantes-dashboard",
    label: "Lubricantes registrados",
    value: analysisLubricantCount.value,
    helper: "Abre el dashboard predictivo por lubricante",
    icon: "mdi-oil",
    accent: "linear-gradient(135deg, rgba(162,69,216,0.18), rgba(221,156,255,0.06))",
  },
  {
    key: "reportes",
    label: "Reportes diarios",
    value: operationScheduleSummary.value.days,
    helper: `${operationScheduleSummary.value.activities} actividades OPERACION/MPG`,
    icon: "mdi-text-box-check-outline",
    accent: "linear-gradient(135deg, rgba(15,143,114,0.18), rgba(109,227,191,0.06))",
  },
  {
    key: "cronogramas",
    label: "Cronogramas",
    value: filteredSchedules.value.length,
    helper: "Planificacion semanal de campo",
    icon: "mdi-calendar-week-outline",
    accent: "linear-gradient(135deg, rgba(69,88,216,0.18), rgba(157,176,255,0.06))",
  },
  {
    key: "reportes-sistema",
    label: "Reportes sistema",
    value: 6,
    helper: "Horas, costos, responsables e inventario en una sola vista",
    icon: "mdi-chart-box-multiple-outline",
    accent: "linear-gradient(135deg, rgba(18,160,123,0.18), rgba(127,232,196,0.06))",
    routeName: "reportes-sistema",
  },
  {
    key: "eventos",
    label: "Eventos KPI",
    value: summary.kpis?.eventos_proceso ?? 0,
    helper: "Notificaciones y trazabilidad",
    icon: "mdi-bell-ring-outline",
    accent: "linear-gradient(135deg, rgba(244,177,131,0.22), rgba(252,228,214,0.08))",
  },
]);

const processIndicatorRows = computed(() => [
  {
    key: "vencidas",
    label: "Programaciones vencidas",
    value: summary.kpis?.programaciones_vencidas ?? 0,
    helper: "Planes detectados fuera de ventana",
  },
  {
    key: "ots",
    label: "OT pendientes",
    value: summary.kpis?.work_orders_pendientes ?? 0,
    helper: "Ordenes planificadas o en proceso",
  },
  {
    key: "eventos",
    label: "Eventos de proceso",
    value: summary.kpis?.eventos_proceso ?? 0,
    helper: "Notificaciones emitidas por flujo principal",
  },
]);

const recentEvents = computed(() =>
  (summary.recent_events ?? []).map((item: AnyRow) => ({
    id: item.id,
    title: `${prettifyProcess(item.tipo_proceso)} · ${item.accion}`,
    subtitle: `${item.referencia_codigo || item.referencia_tabla || "Sin referencia"}${item.fecha_evento ? ` · ${formatDateTime(item.fecha_evento, "")}` : ""}`,
  })),
);

const recentEventsTableRows = computed(() =>
  (summary.recent_events ?? []).slice(0, 8).map((item: AnyRow) => ({
    id: item.id,
    proceso: prettifyProcess(item.tipo_proceso),
    accion: item.accion || "Sin accion",
    referencia: item.referencia_codigo || item.referencia_tabla || "Sin referencia",
    fecha: item.fecha_evento ? formatDateTime(item.fecha_evento, "Sin fecha") : "Sin fecha",
  })),
);

const procedurePreview = computed(() => procedures.value.slice(0, 6));
const totalProcedureActivities = computed(() =>
  procedures.value.reduce((acc, item) => acc + Number(item.actividades?.length ?? 0), 0),
);
const maintenanceClassesCount = computed(
  () => new Set(procedures.value.map((item) => item.clase_mantenimiento).filter(Boolean)).size,
);
const procedureDocumentCount = computed(
  () => new Set(procedures.value.map((item) => item.documento_referencia).filter(Boolean)).size,
);

const analysisDetailCount = computed(() =>
  filteredAnalyses.value.reduce((acc, item) => acc + Number(item.detalles?.length ?? 0), 0),
);
const analysisLubricantCount = computed(
  () =>
    new Set(
      filteredAnalyses.value
        .map((item) => item.lubricante || item.equipo_codigo)
        .filter(Boolean),
    ).size,
);
const lubricantCatalogOptions = computed(() =>
  [...new Map(
    filteredAnalyses.value
      .filter((item) => item.lubricante || item.equipo_codigo)
      .map((item) => {
        const lubricante = item.lubricante || item.equipo_codigo;
        const marca = item.marca_lubricante || item.equipo_nombre || "";
        const codigo = item.lubricante_codigo || "";
        const key = `${codigo}::${lubricante}::${marca}`;
        return [
          key,
          {
            key,
            lubricante,
            marca_lubricante: marca || null,
            lubricante_codigo: codigo || null,
            label: [codigo, lubricante, marca].filter(Boolean).join(" · "),
          },
        ] as const;
      }),
  ).values()],
);
const dashboardCompartimentos = lubricantCompartments;

const analysisPreview = computed(() => filteredAnalyses.value.slice(0, 6));

const latestDailyReport = computed(() => filteredDailyReports.value[0] ?? null);
const latestDailyUnits = computed(() => (latestDailyReport.value?.unidades ?? []).slice(0, 6));
const latestDailyFuel = computed(() => (latestDailyReport.value?.combustibles ?? []).slice(0, 4));

const latestSchedule = computed(() => filteredSchedules.value[0] ?? null);
const scheduleWeek = computed(() => {
  const base = [
    { key: "LUNES", label: "Lunes", items: [] as AnyRow[] },
    { key: "MARTES", label: "Martes", items: [] as AnyRow[] },
    { key: "MIERCOLES", label: "Miercoles", items: [] as AnyRow[] },
    { key: "JUEVES", label: "Jueves", items: [] as AnyRow[] },
    { key: "VIERNES", label: "Viernes", items: [] as AnyRow[] },
    { key: "SABADO", label: "Sabado", items: [] as AnyRow[] },
    { key: "DOMINGO", label: "Domingo", items: [] as AnyRow[] },
  ];

  const lookup = new Map(base.map((item) => [item.key, item]));
  const details = [...(latestSchedule.value?.detalles ?? [])].sort(
    (a, b) =>
      dayOrder(a.dia_semana) - dayOrder(b.dia_semana) ||
      String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")),
  );

  for (const item of details) {
    const key = String(item.dia_semana || "").trim().toUpperCase();
    const target = lookup.get(key) || base[0]!;
    target.items.push(item);
  }

  return base;
});

onMounted(() => {
  oilCustomFrom.value = formatDateForInput(selectedPeriodRange.value.start);
  oilCustomTo.value = formatDateForInput(selectedPeriodRange.value.end);
  oilReferenceDate.value = formatDateForInput(selectedPeriodRange.value.end);
  loadIntelligence();
  loadOilKpi();
});

watch([selectedYear, selectedMonth], () => {
  oilCustomFrom.value = formatDateForInput(selectedPeriodRange.value.start);
  oilCustomTo.value = formatDateForInput(selectedPeriodRange.value.end);
  oilReferenceDate.value = formatDateForInput(selectedPeriodRange.value.end);
  loadIntelligence();
  if (oilPeriod.value === "MENSUAL" || oilPeriod.value === "ANUAL") {
    loadOilKpi();
  }
});

watch(
  () => [
    oilDetailDialog.value,
    oilKpi.value?.filters?.from,
    oilKpi.value?.filters?.to,
    oilKpi.value?.selected_product_id,
  ],
  ([open]) => {
    if (!open) return;
    const candidate = oilLinkedLubricantCandidate.value;
    if (candidate) {
      oilRelatedLubricantSelection.value = candidate;
      void handleOilLubricantSelection(candidate);
      return;
    }
    if (oilRelatedLubricantSelection.value) {
      void handleOilLubricantSelection(oilRelatedLubricantSelection.value);
      return;
    }
    oilRelatedDashboard.value = null;
    oilRelatedDashboardError.value = null;
  },
);
</script>

<style scoped>
.intelligence-page {
  --intelligence-blue: 47, 108, 171;
  --intelligence-purple: 132, 81, 201;
  --intelligence-green: 15, 143, 114;
  --intelligence-orange: 225, 122, 0;
  display: grid;
  gap: 16px;
}

.intelligence-page__content {
  display: grid;
  gap: 4px;
}

.intelligence-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 29px;
  background:
    linear-gradient(118deg, color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, var(--surface-base)), var(--surface-base) 66%),
    var(--surface-base);
}

.intelligence-hero::after {
  position: absolute;
  z-index: -1;
  right: -78px;
  bottom: -118px;
  width: 330px;
  height: 330px;
  border: 48px solid rgba(var(--v-theme-primary), 0.055);
  border-radius: 50%;
  content: "";
}

.intelligence-hero__glow {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;
}

.intelligence-hero__glow--one {
  top: -150px;
  left: 30%;
  width: 330px;
  height: 330px;
  background: rgba(var(--v-theme-primary), 0.1);
}

.intelligence-hero__glow--two {
  right: 9%;
  bottom: -135px;
  width: 270px;
  height: 270px;
  background: rgba(var(--v-theme-secondary), 0.085);
}

.intelligence-hero__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 26px;
}

.intelligence-hero__copy {
  max-width: 760px;
}

.intelligence-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.105em;
  text-transform: uppercase;
}

.intelligence-hero__pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
  box-shadow: 0 0 0 6px rgba(var(--v-theme-success), 0.12);
  animation: intelligence-pulse 2.2s ease-out infinite;
}

.intelligence-hero__title {
  margin: 0;
  font-size: clamp(1.7rem, 2.8vw, 2.45rem);
  font-weight: 800;
  letter-spacing: -0.037em;
  line-height: 1.12;
}

.intelligence-hero__description {
  max-width: 700px;
  margin: 9px 0 13px;
  color: var(--app-muted-text);
  font-size: 0.95rem;
}

.intelligence-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 9px 18px;
  color: var(--app-muted-text);
  font-size: 0.75rem;
}

.intelligence-hero__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.intelligence-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.intelligence-kpi-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(145px, 1fr));
  gap: 9px;
  margin-top: 14px;
}

.kpi-card {
  position: relative;
  overflow: hidden;
  min-height: 174px;
  padding: 16px;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-soft) 96%, white 4%),
      color-mix(in srgb, var(--surface-soft) 82%, transparent)
    ),
    var(--kpi-accent, linear-gradient(135deg, rgba(47,108,171,0.16), rgba(122,184,255,0.05)));
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.055);
}

.kpi-card::after {
  position: absolute;
  right: -38px;
  bottom: -46px;
  width: 126px;
  height: 126px;
  border: 24px solid rgba(var(--v-theme-primary), 0.04);
  border-radius: 50%;
  content: "";
}

.kpi-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-card__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 0.56);
}

.kpi-card__arrow {
  color: rgba(var(--v-theme-on-surface), 0.42);
}

.kpi-card__value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kpi-card__value {
  position: relative;
  z-index: 1;
  margin-top: 13px;
  font-size: 1.72rem;
  font-weight: 800;
  line-height: 1;
}

.kpi-card__label {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  font-size: 0.79rem;
  font-weight: 750;
}

.kpi-card__helper {
  position: relative;
  z-index: 1;
  margin-top: 3px;
  color: var(--app-muted-text);
  font-size: 0.67rem;
  line-height: 1.35;
}

.kpi-card__link {
  position: relative;
  z-index: 1;
  margin-top: 9px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.65rem;
  font-weight: 750;
}

.intelligence-kpi--clickable {
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.intelligence-kpi--clickable:hover,
.intelligence-kpi--clickable:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 14px 28px rgba(var(--v-theme-primary), 0.12);
  outline: none;
}

.intelligence-wrap {
  gap: 12px;
  flex-wrap: wrap;
}

.intelligence-filter-toolbar {
  display: grid;
  grid-template-columns: minmax(250px, 1fr) minmax(120px, 0.35fr) minmax(180px, 0.48fr) auto;
  align-items: center;
  gap: 10px;
  margin-top: 21px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 17px;
  background: color-mix(in srgb, var(--surface-soft) 80%, transparent);
}

.intelligence-filter-toolbar__intro {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.intelligence-filter-toolbar__intro > div:last-child {
  display: grid;
  min-width: 0;
}

.intelligence-filter-toolbar__intro strong {
  font-size: 0.78rem;
}

.intelligence-filter-toolbar__intro span {
  overflow: hidden;
  color: var(--app-muted-text);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intelligence-filter-toolbar__icon {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.intelligence-filter-toolbar__select {
  min-width: 120px;
}

.intelligence-filter-toolbar__select--month {
  min-width: 180px;
}

.indicator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.indicator-tile {
  position: relative;
  overflow: hidden;
  min-height: 105px;
  padding: 15px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background:
    linear-gradient(140deg, rgba(var(--v-theme-primary), 0.065), transparent 68%),
    var(--surface-soft);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.indicator-tile::after {
  position: absolute;
  right: -22px;
  bottom: -28px;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.045);
  content: "";
}

.indicator-tile:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.22);
  box-shadow: 0 12px 25px rgba(var(--v-theme-primary), 0.08);
}

.indicator-tile--interactive,
.clickable-row {
  cursor: pointer;
}

.indicator-tile--interactive:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.clickable-row:hover {
  background: rgba(var(--v-theme-primary), 0.045);
}

.clickable-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.breakdown-chip {
  padding: 15px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background:
    linear-gradient(140deg, rgba(var(--v-theme-secondary), 0.065), transparent 72%),
    var(--surface-soft);
  transition: transform 160ms ease, border-color 160ms ease;
}

.breakdown-chip:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-secondary), 0.22);
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.oil-summary-card {
  position: relative;
  overflow: hidden;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.095), rgba(var(--v-theme-secondary), 0.035)),
    color-mix(in srgb, var(--surface-soft) 82%, transparent);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.oil-summary-card:hover,
.oil-summary-card:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 14px 28px rgba(var(--v-theme-primary), 0.1);
  outline: none;
}

.dashboard-table-shell {
  position: relative;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: auto;
  max-height: 430px;
  background: color-mix(in srgb, var(--surface-base) 91%, transparent);
  box-shadow: inset 0 1px 0 rgba(var(--v-theme-on-surface), 0.035);
  scrollbar-color: rgba(var(--v-theme-primary), 0.3) transparent;
  scrollbar-width: thin;
}

.dashboard-mini-table {
  background: transparent;
}

.dashboard-mini-table :deep(table) {
  min-width: 680px;
  border-collapse: separate;
  border-spacing: 0;
}

.dashboard-mini-table :deep(th) {
  position: sticky;
  z-index: 1;
  top: 0;
  height: 45px;
  padding: 11px 13px;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.13);
  font-size: 0.69rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.065em;
  color: var(--app-muted-text);
  white-space: nowrap;
  background:
    linear-gradient(180deg, rgba(var(--v-theme-primary), 0.075), rgba(var(--v-theme-primary), 0.025)),
    color-mix(in srgb, var(--surface-soft) 96%, transparent);
}

.dashboard-mini-table :deep(td) {
  max-width: 280px;
  min-height: 48px;
  padding: 12px 13px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.065);
  color: color-mix(in srgb, var(--app-text) 91%, transparent);
  font-size: 0.78rem;
  line-height: 1.45;
  vertical-align: middle;
}

.dashboard-mini-table :deep(tbody tr) {
  background: transparent;
  transition: background 140ms ease, box-shadow 140ms ease;
}

.dashboard-mini-table :deep(tbody tr:nth-child(even)) {
  background: rgba(var(--v-theme-primary), 0.018);
}

.dashboard-mini-table :deep(tbody tr:hover) {
  background: rgba(var(--v-theme-primary), 0.065);
  box-shadow: inset 3px 0 0 rgba(var(--v-theme-primary), 0.72);
}

.dashboard-mini-table :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

.dashboard-mini-table :deep(th:first-child),
.dashboard-mini-table :deep(td:first-child) {
  padding-left: 17px;
}

.dashboard-mini-table :deep(th:last-child),
.dashboard-mini-table :deep(td:last-child) {
  padding-right: 17px;
}

.dashboard-mini-bars {
  display: grid;
  gap: 10px;
}

.dashboard-mini-bars__row {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  transition: background 140ms ease;
}

.dashboard-mini-bars__row:hover {
  background: rgba(var(--v-theme-primary), 0.045);
}

.dashboard-mini-bars__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.86rem;
}

.dashboard-mini-bars__track {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-soft) 76%, transparent);
  border: 1px solid var(--surface-border);
}

.dashboard-mini-bars__fill {
  height: 100%;
  border-radius: 999px;
}

.dashboard-mini-bars__fill--success {
  background: linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%);
}

.report-table {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: hidden;
  background: var(--chart-card-bg);
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.schedule-day {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background:
    linear-gradient(150deg, rgba(var(--v-theme-primary), 0.055), transparent 48%),
    var(--surface-soft);
  min-height: 180px;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.schedule-day:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 13px 27px rgba(15, 23, 42, 0.075);
}

.schedule-item {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--chart-guide);
  background: var(--chart-empty-bg);
  margin-bottom: 10px;
  transition: background 140ms ease, border-color 140ms ease;
}

.schedule-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.2);
  background: rgba(var(--v-theme-primary), 0.075);
}

.oil-kpi-filter-hint {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px dashed var(--surface-border);
  background: color-mix(in srgb, var(--surface-soft) 82%, transparent);
  color: var(--app-muted-text);
  font-size: 0.82rem;
}

.intelligence-page__content > .v-row .enterprise-surface {
  position: relative;
  border-color: var(--surface-border);
  background:
    linear-gradient(180deg, rgba(var(--v-theme-surface), 0.18), transparent 44%),
    var(--surface-base);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.intelligence-page__content > .v-row .enterprise-surface:hover {
  border-color: rgba(var(--v-theme-primary), 0.18);
  box-shadow: 0 19px 38px rgba(15, 23, 42, 0.105);
}

.intelligence-page__content > .v-row .enterprise-surface :deep(.text-subtitle-1.font-weight-bold) {
  letter-spacing: -0.015em;
}

.intelligence-page__content :deep(.v-chip) {
  font-weight: 650;
}

.intelligence-dialog :deep(.v-card-title) {
  padding: 20px 22px;
  background:
    linear-gradient(105deg, rgba(var(--v-theme-primary), 0.1), transparent 55%),
    var(--surface-base);
}

.oil-kpi-table-shell {
  max-height: 360px;
  overflow: auto;
}

.oil-kpi-table-shell--tall {
  max-height: 520px;
}

.h-100 {
  height: 100%;
}

@keyframes intelligence-pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0.32); }
  65% { box-shadow: 0 0 0 8px rgba(var(--v-theme-success), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0); }
}

@media (prefers-reduced-motion: reduce) {
  .intelligence-hero__pulse {
    animation: none;
  }

  .intelligence-kpi--clickable,
  .indicator-tile,
  .breakdown-chip,
  .oil-summary-card,
  .schedule-day,
  .schedule-item,
  .dashboard-mini-bars__row {
    transition: none;
  }
}

@media (max-width: 1700px) {
  .intelligence-kpi-grid {
    grid-template-columns: repeat(4, minmax(155px, 1fr));
  }
}

@media (max-width: 1280px) {
  .intelligence-hero__header {
    flex-direction: column;
  }

  .intelligence-hero__actions {
    justify-content: flex-start;
  }

  .intelligence-filter-toolbar {
    grid-template-columns: minmax(220px, 1fr) minmax(110px, 0.4fr) minmax(170px, 0.55fr);
  }

  .intelligence-filter-toolbar > .v-chip {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .intelligence-kpi-grid {
    grid-template-columns: repeat(3, minmax(155px, 1fr));
  }
}

@media (max-width: 960px) {
  .intelligence-page {
    gap: 14px;
  }

  .intelligence-kpi-grid {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }

  .indicator-grid,
  .breakdown-grid,
  .schedule-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .intelligence-hero {
    padding: 19px;
  }

  .intelligence-hero__actions,
  .intelligence-hero__actions > .v-btn {
    width: 100%;
  }

  .intelligence-filter-toolbar,
  .intelligence-kpi-grid {
    grid-template-columns: 1fr;
  }

  .intelligence-filter-toolbar > .v-chip {
    grid-column: auto;
    justify-self: stretch;
  }

  .indicator-tile,
  .breakdown-chip,
  .schedule-day {
    padding: 12px;
  }

  .dashboard-table-shell,
  .report-table {
    border-radius: 14px;
  }
}

@media (max-width: 768px) {
  .intelligence-filter-toolbar__select,
  .intelligence-filter-toolbar__select--month {
    min-width: 100%;
  }
}
</style>

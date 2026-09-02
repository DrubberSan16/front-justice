<template>
  <EnterprisePageMotion class="dashboard-page">
    <v-alert v-if="!canAccessDashboardReports" type="warning" variant="tonal">
      No tienes permisos para acceder a este reporte.
    </v-alert>

    <div v-else :ref="setMotionRoot" class="dashboard-content">
    <v-row class="mb-4 dashboard-hero-grid" align="stretch">
      <v-col cols="12" lg="8">
        <v-card rounded="xl" class="dashboard-hero enterprise-surface h-100">
          <div class="dashboard-hero__header">
            <div class="dashboard-hero__copy">
              <div class="dashboard-hero__eyebrow">
                <span class="dashboard-hero__pulse" />
                Centro de control ejecutivo
              </div>
              <h1 class="dashboard-hero__title">Panel ejecutivo KPI</h1>
              <p class="dashboard-hero__description">
                Una lectura consolidada de mantenimiento, inventario, seguridad y operación.
              </p>
              <div class="dashboard-hero__identity">
                <span><v-icon icon="mdi-account-circle-outline" size="16" />{{ auth.user?.nameUser || "Usuario" }}</span>
                <span><v-icon icon="mdi-shield-account-outline" size="16" />{{ auth.user?.role?.nombre || "Sin rol" }}</span>
              </div>
            </div>

            <div class="dashboard-hero__actions">
              <v-btn
                v-if="canAccessDashboardReports"
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-file-excel"
                :loading="isExporting('excel')"
                @click="exportDashboard('excel')"
              >
                Exportar Excel
              </v-btn>
              <v-btn
                v-if="canAccessDashboardReports"
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-file-pdf-box"
                :loading="isExporting('pdf')"
                @click="exportDashboard('pdf')"
              >
                Exportar PDF
              </v-btn>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-chart-timeline-variant"
                :disabled="!canAccessIntelligenceView"
                @click="router.push({ name: 'inteligencia-mantenimiento' })"
              >
                Ver inteligencia
              </v-btn>
              <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadDashboard">
                Actualizar
              </v-btn>
            </div>
          </div>

          <v-alert v-if="error" type="warning" variant="tonal" class="mb-3" :text="error" />

          <div class="period-toolbar">
            <div class="period-toolbar__intro">
              <div class="period-toolbar__icon"><v-icon icon="mdi-calendar-filter-outline" size="21" /></div>
              <div>
                <strong>Período de análisis</strong>
                <span>Los indicadores se actualizan automáticamente.</span>
              </div>
            </div>
            <v-select
              v-model="selectedYear"
              :items="yearOptions"
              label="Año"
              density="comfortable"
              hide-details
              variant="outlined"
              class="period-toolbar__select"
            />
            <v-select
              v-model="selectedMonth"
              :items="monthOptions"
              label="Mes"
              density="comfortable"
              hide-details
              variant="outlined"
              class="period-toolbar__select period-toolbar__select--month"
            />
            <v-chip label color="primary" variant="tonal">
              {{ selectedPeriodLabel }}
            </v-chip>
          </div>

          <v-row dense class="dashboard-kpi-grid js-stagger">
            <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="3">
              <v-card
                rounded="xl"
                class="kpi-card kpi-card--interactive h-100 js-stagger-item js-hover-card"
                :style="{ '--kpi-accent': card.accent }"
                role="button"
                tabindex="0"
                aria-haspopup="dialog"
                @click="openKpiDetail(card.key)"
                @keydown.enter="openKpiDetail(card.key)"
                @keydown.space.prevent="openKpiDetail(card.key)"
              >
                <div class="kpi-card__top">
                  <div class="kpi-card__icon"><v-icon :icon="card.icon" size="22" /></div>
                  <span class="kpi-card__index">KPI</span>
                </div>
                <div class="kpi-card__value-row">
                  <div class="kpi-card__value">{{ card.value }}</div>
                </div>
                <div class="kpi-card__label">{{ card.label }}</div>
                <div class="kpi-card__helper">{{ card.helper }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card rounded="xl" class="dashboard-status-card enterprise-surface h-100">
          <div class="dashboard-status-card__header">
            <div class="dashboard-status-card__title-icon"><v-icon icon="mdi-pulse" size="22" /></div>
            <div>
              <div class="text-subtitle-1 font-weight-bold">Estado operativo</div>
              <div class="text-caption text-medium-emphasis">Avance de órdenes del período</div>
            </div>
          </div>

          <div
            v-for="status in workOrderStatusCards"
            :key="status.key"
            :class="['status-row', `status-row--${status.tone}`, 'status-row--interactive']"
            role="button"
            tabindex="0"
            aria-haspopup="dialog"
            @click="openWorkOrderStatusDetail(status.key)"
            @keydown.enter="openWorkOrderStatusDetail(status.key)"
            @keydown.space.prevent="openWorkOrderStatusDetail(status.key)"
          >
            <div class="status-row__main">
              <div class="status-row__icon"><v-icon :icon="status.icon" size="19" /></div>
              <div>
                <div class="text-body-2 font-weight-bold">{{ status.label }}</div>
                <div class="text-caption text-medium-emphasis">Órdenes de trabajo</div>
              </div>
            </div>
            <strong class="status-row__value">{{ status.value }}</strong>
            <div class="status-row__track">
              <div
                class="status-row__fill"
                :style="{ width: `${status.value ? Math.max(5, (status.value / Math.max(filteredWorkOrders.length, 1)) * 100) : 0}%` }"
              />
            </div>
          </div>

          <div class="dashboard-status-card__footer">
            <div class="dashboard-status-meta">
              <v-icon icon="mdi-view-grid-outline" size="19" />
              <div>
                <span>Módulos principales</span>
                <strong>{{ menu.tree.length }}</strong>
              </div>
            </div>
            <div class="dashboard-status-meta">
              <v-icon icon="mdi-clock-check-outline" size="19" />
              <div>
                <span>Última actualización</span>
                <strong>{{ lastUpdatedLabel }}</strong>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-1">
      <v-col cols="12" class="equipment-panel-col">
        <EquipmentOperatingControl
          :equipos="equipmentControlItems"
          :can-edit="canEditEquiposFuncionamiento"
          :loading="loading"
          @updated="handleEquipmentFuncionamientoUpdated"
          @horometer-updated="handleEquipmentHorometerUpdated"
        />
      </v-col>
    </v-row>

    <v-row v-if="isSuperAdmin" class="mb-1">
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface super-admin-alerts-card">
          <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Equipos y alertas activas</div>
              <div class="text-caption text-medium-emphasis">
                Visible solo para Super Administrador · ejecución manual del correo de alerta
              </div>
            </div>
            <v-chip label color="warning" variant="tonal">{{ openAlertsCount }} alertas activas</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando equipos y alertas..." :rows="6" :columns="2" />
          <div v-else class="super-admin-alerts-shell">
            <div
              v-for="equipo in superAdminEquipmentAlerts"
              :key="equipo.id"
              class="super-admin-alerts-equipo"
            >
              <div class="super-admin-alerts-equipo__header">
                <div class="super-admin-alerts-equipo__title">
                  <strong>{{ equipo.label }}</strong>
                </div>
                <v-chip
                  size="small"
                  label
                  :color="equipo.alerts.length ? 'warning' : 'success'"
                  variant="tonal"
                >
                  {{ equipo.alerts.length }} alerta{{ equipo.alerts.length === 1 ? "" : "s" }} activa{{
                    equipo.alerts.length === 1 ? "" : "s"
                  }}
                </v-chip>
              </div>

              <div v-if="!equipo.alerts.length" class="super-admin-alerts-equipo__empty">
                Sin alertas activas para este equipo.
              </div>

              <div v-else class="super-admin-alerts-equipo__alerts">
                <div v-for="alert in equipo.alerts" :key="alert.id" class="super-admin-alerts-alert">
                  <div class="super-admin-alerts-alert__info">
                    <div class="font-weight-medium">{{ alert.tipo }}</div>
                    <div class="text-caption text-medium-emphasis">{{ alert.detalle }}</div>
                    <div class="super-admin-alerts-alert__meta">
                      <v-chip size="x-small" label color="warning" variant="tonal">{{ alert.estado }}</v-chip>
                      <v-chip size="x-small" label color="secondary" variant="tonal">{{ alert.nivel }}</v-chip>
                      <span class="text-caption text-medium-emphasis">{{ alert.fecha }}</span>
                    </div>
                  </div>
                  <v-btn
                    size="small"
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-email-fast-outline"
                    :loading="manualAlertLoadingId === alert.id"
                    @click="executeAlertManually(alert.id)"
                  >
                    Enviar correo
                  </v-btn>
                </div>
              </div>
            </div>

            <div v-if="!superAdminEquipmentAlerts.length" class="text-center text-medium-emphasis py-4">
              No hay equipos registrados.
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-1">
      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Distribución de órdenes"
          subtitle="Balance del flujo de trabajo en el período"
          :chip-label="`${filteredWorkOrders.length} OT`"
          chip-color="primary"
          :items="workOrderStatusChartItems"
          interactive
          @item-click="(item) => openWorkOrderStatusDetail(item.key)"
        />
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Severidad de alertas"
          subtitle="Cómo viene la presión operativa del mes"
          :chip-label="`${openAlertsCount} abiertas`"
          chip-color="warning"
          :items="alertSeverityChartItems"
          interactive
          @item-click="(item) => openAlertSeverityDetail(item.key)"
        />
      </v-col>

      <v-col cols="12" xl="4">
        <DashboardBarChartCard
          title="Cadencia operativa"
          subtitle="Horas programadas por día desde el cronograma semanal"
          :chip-label="operationScheduleSummary.hoursLabel"
          chip-color="success"
          :items="operationCadenceChartItems"
          empty-text="No hay programación semanal OPERACION/MPG para graficar en este período."
          interactive
          @item-click="(item) => openOperationDayDetail(item.key)"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Alertas recientes</div>
            <v-chip label color="warning" variant="tonal">{{ openAlertsCount }} abiertas</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando alertas recientes..." :rows="5" :columns="4" />
          <div v-else class="dashboard-table-shell">
            <v-table density="compact" class="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="alert in recentAlertsTableRows"
                  :key="alert.id"
                  class="clickable-row"
                  tabindex="0"
                  role="button"
                  aria-haspopup="dialog"
                  @click="openAlertRowDetail(alert)"
                  @keydown.enter="openAlertRowDetail(alert)"
                  @keydown.space.prevent="openAlertRowDetail(alert)"
                >
                  <td class="font-weight-medium">{{ alert.tipo }}</td>
                  <td>{{ alert.equipo }}</td>
                  <td>
                    <v-chip size="x-small" label color="warning" variant="tonal">{{ alert.estado }}</v-chip>
                  </td>
                  <td class="text-medium-emphasis">{{ alert.detalle }}</td>
                </tr>
                <tr v-if="!recentAlertsTableRows.length">
                  <td colspan="4" class="text-center text-medium-emphasis py-4">
                    Sin alertas recientes para el período seleccionado.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Órdenes de trabajo recientes</div>
            <v-chip label color="primary" variant="tonal">{{ filteredWorkOrders.length }} totales</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando órdenes de trabajo..." :rows="5" :columns="4" />
          <div v-else class="dashboard-table-shell">
            <v-table density="compact" class="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in recentWorkOrdersTableRows"
                  :key="order.id"
                  class="clickable-row"
                  tabindex="0"
                  role="button"
                  aria-haspopup="dialog"
                  @click="openWorkOrderRowDetail(order)"
                  @keydown.enter="openWorkOrderRowDetail(order)"
                  @keydown.space.prevent="openWorkOrderRowDetail(order)"
                >
                  <td class="font-weight-medium">{{ order.codigo }}</td>
                  <td>{{ order.titulo }}</td>
                  <td>{{ order.equipo }}</td>
                  <td>
                    <v-chip size="x-small" label color="primary" variant="tonal">{{ order.estado }}</v-chip>
                  </td>
                </tr>
                <tr v-if="!recentWorkOrdersTableRows.length">
                  <td colspan="4" class="text-center text-medium-emphasis py-4">
                    Sin órdenes de trabajo registradas para este período.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Inventario crítico</div>
            <v-chip label color="error" variant="tonal">{{ lowStockItems.length }} bajo mínimo</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando inventario crítico..." :rows="6" :columns="3" />
          <div v-else class="dashboard-stack">
            <div class="summary-strip">
              <v-chip size="small" label color="error" variant="tonal">
                {{ lowStockByWarehouse.length }} bodegas impactadas
              </v-chip>
              <v-chip size="small" label color="secondary" variant="tonal">
                {{ criticalInventoryRows.length }} materiales visibles
              </v-chip>
            </div>

            <div class="dashboard-mini-bars">
              <div
                v-for="item in lowStockByWarehouse"
                :key="item.key"
                class="dashboard-mini-bars__row dashboard-mini-bars__row--interactive"
                tabindex="0"
                role="button"
                aria-haspopup="dialog"
                @click="openLowStockWarehouseDetail(item.key, item.label)"
                @keydown.enter="openLowStockWarehouseDetail(item.key, item.label)"
                @keydown.space.prevent="openLowStockWarehouseDetail(item.key, item.label)"
              >
                <div class="dashboard-mini-bars__meta">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.valueLabel }}</strong>
                </div>
                <div class="dashboard-mini-bars__track">
                  <div
                    class="dashboard-mini-bars__fill dashboard-mini-bars__fill--danger"
                    :style="{ width: `${Math.max(8, (item.value / Math.max(...lowStockByWarehouse.map((row) => row.value), 1)) * 100)}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Bodega</th>
                    <th>Disponible</th>
                    <th>Mín.</th>
                    <th>Déficit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in criticalInventoryRows"
                    :key="item.id"
                    class="clickable-row"
                    tabindex="0"
                    role="button"
                    aria-haspopup="dialog"
                    @click="openInventoryRowDetail(item)"
                    @keydown.enter="openInventoryRowDetail(item)"
                    @keydown.space.prevent="openInventoryRowDetail(item)"
                  >
                    <td class="font-weight-medium">{{ item.producto }}</td>
                    <td>{{ item.bodega }}</td>
                    <td>{{ item.stock }}</td>
                    <td>{{ item.min }}</td>
                    <td>
                      <v-chip size="x-small" label color="error" variant="tonal">{{ item.deficit }}</v-chip>
                    </td>
                  </tr>
                  <tr v-if="!criticalInventoryRows.length">
                    <td colspan="5" class="text-center text-medium-emphasis py-4">
                      No hay productos por debajo del mínimo configurado.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" xl="4">
        <DashboardBarChartCard
          title="Indicadores de proceso"
          subtitle="Seguimiento documental y operativo"
          :chip-label="`${processIndicatorCards.length} KPI`"
          chip-color="secondary"
          :items="processIndicatorCards.map((item) => ({
            key: item.key,
            label: item.label,
            value: Number(item.value || 0),
            valueLabel: formatCompactNumber(item.value),
            helper: item.helper,
            color: 'linear-gradient(90deg, #3f62d8 0%, #9eaefc 100%)',
          }))"
          interactive
          @item-click="(item) => openProcessIndicatorDetail(item.key)"
        />
      </v-col>

      <v-col cols="12" md="6" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Reporte diario de operacion</div>
            <v-chip label color="success" variant="tonal">{{ operationScheduleSummary.days }} días programados</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando reporte diario de operación..." :rows="6" :columns="3" />
          <div v-else-if="operationScheduleDays.length" class="dashboard-stack">
            <div class="summary-strip">
              <v-chip size="small" label color="primary" variant="tonal">Actividades: {{ operationScheduleSummary.activities }}</v-chip>
              <v-chip size="small" label color="secondary" variant="tonal">Horas: {{ operationScheduleSummary.hoursLabel }}</v-chip>
              <v-chip size="small" label color="info" variant="tonal">Reportes reales: {{ filteredDailyReports.length }}</v-chip>
            </div>

            <div class="dashboard-mini-bars">
              <div
                v-for="item in operationScheduleDays.slice(0, 7)"
                :key="item.date"
                class="dashboard-mini-bars__row dashboard-mini-bars__row--interactive"
                tabindex="0"
                role="button"
                aria-haspopup="dialog"
                @click="openOperationDayDetail(item.date)"
                @keydown.enter="openOperationDayDetail(item.date)"
                @keydown.space.prevent="openOperationDayDetail(item.date)"
              >
                <div class="dashboard-mini-bars__meta">
                  <span>{{ item.title }}</span>
                  <strong>{{ Number(item.totalHours || 0).toFixed(1) }} h</strong>
                </div>
                <div class="dashboard-mini-bars__track">
                  <div
                    class="dashboard-mini-bars__fill dashboard-mini-bars__fill--success"
                    :style="{ width: `${Math.max(8, (Number(item.totalHours || 0) / Math.max(...operationScheduleDays.map((row) => Number(row.totalHours || 0)), 1)) * 100)}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Actividades</th>
                    <th>Horas</th>
                    <th>Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in operationScheduleDays.slice(0, 7)"
                    :key="item.date"
                    class="clickable-row"
                    tabindex="0"
                    role="button"
                    aria-haspopup="dialog"
                    @click="openOperationDayDetail(item.date)"
                    @keydown.enter="openOperationDayDetail(item.date)"
                    @keydown.space.prevent="openOperationDayDetail(item.date)"
                  >
                    <td class="font-weight-medium">{{ item.title }}</td>
                    <td>{{ item.count }}</td>
                    <td>{{ Number(item.totalHours || 0).toFixed(1) }}</td>
                    <td class="text-medium-emphasis">{{ item.subtitle }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>

          <div v-else-if="latestDailyReport" class="dashboard-stack">
            <div class="summary-strip">
              <v-chip size="small" label color="primary" variant="tonal">Unidades: {{ latestDailyUnits.length }}</v-chip>
              <v-chip size="small" label color="warning" variant="tonal">Combustible: {{ latestDailyFuel.length }}</v-chip>
            </div>
            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Horómetro</th>
                    <th>MPG</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="unit in latestDailyUnits"
                    :key="unit.id"
                    class="clickable-row"
                    tabindex="0"
                    role="button"
                    aria-haspopup="dialog"
                    @click="openDailyUnitDetail(unit)"
                    @keydown.enter="openDailyUnitDetail(unit)"
                    @keydown.space.prevent="openDailyUnitDetail(unit)"
                  >
                    <td class="font-weight-medium">{{ resolveEquipmentLabel(unit) }}</td>
                    <td>{{ unit.horometro_actual ?? "N/A" }}</td>
                    <td>{{ unit.mpg_actual ?? "N/A" }}</td>
                  </tr>
                  <tr v-if="!latestDailyUnits.length">
                    <td colspan="3" class="text-center text-medium-emphasis py-4">
                      El reporte diario aún no tiene unidades asociadas.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">No hay programación semanal OPERACION/MPG ni reportes diarios para el período seleccionado.</div>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Cronograma semanal</div>
            <v-chip label color="info" variant="tonal">{{ latestWeeklySchedule?.codigo || "Sin cronograma" }}</v-chip>
          </div>

          <LoadingTableState v-if="loading" message="Cargando cronograma semanal..." :rows="6" :columns="5" />
          <div v-else-if="latestWeeklySchedule" class="dashboard-stack">
            <div class="text-body-2 text-medium-emphasis">
              {{ latestWeeklySchedule.fecha_inicio || "Sin fecha" }} / {{ latestWeeklySchedule.fecha_fin || "Sin fecha" }}<span v-if="latestWeeklySchedule.locacion"> · {{ latestWeeklySchedule.locacion }}</span>
            </div>

            <div class="dashboard-table-shell">
              <v-table density="compact" class="dashboard-mini-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Día</th>
                    <th>Hora</th>
                    <th>Equipo</th>
                    <th>Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="activity in latestWeeklyActivities"
                    :key="activity.id"
                    class="clickable-row"
                    tabindex="0"
                    role="button"
                    aria-haspopup="dialog"
                    @click="openWeeklyActivityDetail(activity)"
                    @keydown.enter="openWeeklyActivityDetail(activity)"
                    @keydown.space.prevent="openWeeklyActivityDetail(activity)"
                  >
                    <td>{{ activity.fecha_label || activity.fecha_actividad || "Sin fecha" }}</td>
                    <td class="font-weight-medium">{{ normalizeDayLabel(activity.dia_semana) }}</td>
                    <td>
                      {{
                        activity.hora_inicio && activity.hora_fin
                          ? `${activity.hora_inicio} - ${activity.hora_fin}`
                          : activity.hora_inicio || activity.hora_fin || "Sin hora"
                      }}
                    </td>
                    <td>{{ resolveEquipmentLabel(activity) }}</td>
                    <td class="text-medium-emphasis">{{ activity.actividad || "Actividad sin nombre" }}</td>
                  </tr>
                  <tr v-if="!latestWeeklyActivities.length">
                    <td colspan="5" class="text-center text-medium-emphasis py-4">
                      El cronograma aún no tiene actividades registradas.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">Aun no existen cronogramas semanales cargados.</div>
        </v-card>
      </v-col>
    </v-row>
    </div>

    <ReadonlyDetailDialog
      v-model="detailDialogOpen"
      :title="detailDialogTitle"
      :subtitle="detailDialogSubtitle"
      :columns="detailDialogColumns"
      :rows="detailDialogRows"
      :empty-text="detailDialogEmptyText"
    />
  </EnterprisePageMotion>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import EnterprisePageMotion from "@/components/ui/EnterprisePageMotion.vue";
import { useRevealMotion } from "@/app/motion";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { hasReportAccess } from "@/app/config/report-access";
import { isSuperAdministrator } from "@/app/utils/role-access";
import { canReadComponent, getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import DashboardBarChartCard from "@/components/dashboard/DashboardBarChartCard.vue";
import EquipmentOperatingControl, {
  type EquipmentControlItem,
} from "@/components/dashboard/EquipmentOperatingControl.vue";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import ReadonlyDetailDialog from "@/components/ui/ReadonlyDetailDialog.vue";
import { listAllPages } from "@/app/utils/list-all-pages";
import { formatDateTime } from "@/app/utils/date-time";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { buildEquipmentDisplayTitle } from "@/app/utils/equipment-display";
import {
  buildExecutiveDashboardReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;

const auth = useAuthStore();
const menu = useMenuStore();
const ui = useUiStore();
const router = useRouter();

const loading = ref(false);
const error = ref<string | null>(null);
const lastUpdatedAt = ref<Date | null>(null);
const exportState = ref<Record<string, boolean>>({});
const manualAlertLoadingId = ref<string | null>(null);
const canAccessDashboardReports = computed(() =>
  hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "dashboard_ejecutivo"),
);
const isSuperAdmin = computed(() => isSuperAdministrator(auth.user));
const canAccessIntelligenceView = computed(() =>
  canReadComponent(menu.tree, "inteligencia-mantenimiento"),
);
const canEditEquiposFuncionamiento = computed(
  () => getPermissionsForAnyComponent(menu.tree, ["Equipos", "Equipo"]).isEdited,
);

const users = ref<AnyRow[]>([]);
const roles = ref<AnyRow[]>([]);
const equipos = ref<AnyRow[]>([]);
const planes = ref<AnyRow[]>([]);
const bodegas = ref<AnyRow[]>([]);
const alertas = ref<AnyRow[]>([]);
const workOrders = ref<AnyRow[]>([]);
const productos = ref<AnyRow[]>([]);
const stockRows = ref<AnyRow[]>([]);
const intelligenceSummary = ref<AnyRow>({});
const weeklySchedules = ref<AnyRow[]>([]);
const dailyReports = ref<AnyRow[]>([]);
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);

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

function normalizeWorkflowStatus(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (["PLANNED", "PLANIFICADA", "PLANIFICADO", "CREADA", "CREADO"].includes(raw)) return "PLANNED";
  if (["IN_PROGRESS", "IN PROGRESS", "EN PROCESO", "EN_PROCESO", "PROCESSING"].includes(raw)) return "IN_PROGRESS";
  if (["CLOSED", "CERRADA", "CERRADO", "DONE", "COMPLETED"].includes(raw)) return "CLOSED";
  return raw || "PLANNED";
}

function parseValorJson(valorJson: unknown) {
  if (!valorJson) return {};
  if (typeof valorJson === "object") return valorJson as Record<string, any>;
  if (typeof valorJson === "string") {
    try {
      const parsed = JSON.parse(valorJson);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function isAnnulledWorkOrder(item: AnyRow) {
  const payload = parseValorJson(item?.valor_json);
  const annulledValues = new Set([
    "ANULADA",
    "ANULADO",
    "CANCELADA",
    "CANCELADO",
    "CANCELLED",
    "CANCELED",
    "VOID",
    "VOIDED",
  ]);
  return Boolean(
    (payload?.annulment && typeof payload.annulment === "object") ||
      [item?.approval_action, payload?.approval_action, item?.status].some((value) =>
        annulledValues.has(String(value || "").trim().toUpperCase()),
      ),
  );
}

function normalizeFuncionamiento(value: unknown) {
  return String(value || "").trim().toUpperCase() === "FUNCIONAMIENTO" ? "FUNCIONAMIENTO" : "PARADO";
}

function workflowLabel(value: unknown) {
  const normalized = normalizeWorkflowStatus(value);
  if (normalized === "PLANNED") return "Planificada";
  if (normalized === "IN_PROGRESS") return "En proceso";
  if (normalized === "CLOSED") return "Cerrada";
  return normalized;
}

function normalizeDayLabel(value: unknown) {
  return String(value || "Sin dia")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeProcessType(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizeAlertSeverity(value: unknown) {
  const raw = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (!raw) return "INFO";
  if (["CRITICAL", "CRITICA", "CRITICO", "ALTA", "HIGH"].includes(raw)) return "CRITICA";
  if (["WARNING", "WARN", "MEDIA", "MEDIO", "ALERTA"].includes(raw)) return "ADVERTENCIA";
  return "INFO";
}

function formatCompactNumber(value: unknown) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("es-EC", {
    notation: numeric >= 1000 ? "compact" : "standard",
    maximumFractionDigits: numeric >= 1000 ? 1 : 0,
  }).format(numeric);
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

function parseDurationHours(startValue: unknown, endValue: unknown) {
  const startMinutes = parseTimeToMinutes(startValue);
  const endMinutes = parseTimeToMinutes(endValue);
  if (startMinutes == null || endMinutes == null) return 0;
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) return 0;
  return (endMinutes - startMinutes) / 60;
}

function parseTimeToMinutes(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const rawSegments = raw.split("T");
  const timeToken = raw.includes("T") ? rawSegments[rawSegments.length - 1] || "" : raw;
  const normalized = timeToken.split(".")[0]?.trim() || "";
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatTimeLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const rawSegments = raw.split("T");
  const normalized = raw.includes("T") ? rawSegments[rawSegments.length - 1] || "" : raw;
  return normalized.split(".")[0]?.slice(0, 5) || normalized;
}

const selectedPeriodRange = computed(() => buildMonthRange(selectedYear.value, selectedMonth.value));
const selectedPeriodLabel = computed(() =>
  new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(
    new Date(selectedYear.value, selectedMonth.value - 1, 1),
  ),
);

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

function resolveWorkOrderDate(row: AnyRow) {
  return row?.scheduled_start || row?.created_at || row?.updated_at || row?.closed_at || null;
}

async function listAll(endpoint: string, params: Record<string, any> = {}) {
  return listAllPages(endpoint, params);
}

function exportKey(format: "excel" | "pdf") {
  return `dashboard:${format}`;
}

function isExporting(format: "excel" | "pdf") {
  return Boolean(exportState.value[exportKey(format)]);
}

async function loadDashboard() {
  if (!canAccessDashboardReports.value) return;
  loading.value = true;
  error.value = null;

  try {
    const [
      usersRows,
      rolesRows,
      equiposRows,
      planesRows,
      bodegasRows,
      alertasRows,
      workOrdersRows,
      productosRows,
      stockRowsResult,
      intelligenceSummaryRes,
      weeklySchedulesRes,
      dailyReportsRes,
    ] = await Promise.all([
      listAll("/kpi_security/users", { includeDeleted: false }),
      listAll("/kpi_security/roles", { includeDeleted: false }),
      listAll("/kpi_maintenance/equipos"),
      listAll("/kpi_maintenance/planes"),
      listAll("/kpi_inventory/bodegas"),
      listAll("/kpi_maintenance/alertas"),
      listAll("/kpi_maintenance/work-orders"),
      listAll("/kpi_inventory/productos"),
      listAll("/kpi_inventory/stock-bodega"),
      api.get("/kpi_maintenance/inteligencia/summary", {
        params: { year: selectedYear.value, month: selectedMonth.value },
      }),
      api.get("/kpi_maintenance/inteligencia/cronogramas-semanales"),
      api.get("/kpi_maintenance/inteligencia/reportes-diarios"),
    ]);

    users.value = usersRows;
    roles.value = rolesRows;
    equipos.value = equiposRows;
    planes.value = planesRows;
    bodegas.value = bodegasRows;
    alertas.value = alertasRows;
    workOrders.value = workOrdersRows;
    productos.value = productosRows;
    stockRows.value = stockRowsResult;
    intelligenceSummary.value = unwrap(intelligenceSummaryRes.data, {});
    weeklySchedules.value = unwrap(weeklySchedulesRes.data, []);
    dailyReports.value = unwrap(dailyReportsRes.data, []);
    lastUpdatedAt.value = new Date();
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar el dashboard con las APIs disponibles.";
  } finally {
    loading.value = false;
  }
}

const openAlerts = computed(() =>
  alertas.value.filter((item) => {
    const status = String(item?.estado || "").toUpperCase();
    return !["CERRADA", "RESUELTA", "CLOSED"].includes(status);
  }).filter((item) => isInSelectedPeriod(item?.fecha_generada || item?.created_at || item?.updated_at)),
);

const openAlertsCount = computed(() => openAlerts.value.length);

function isActiveAlertState(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  return raw === "ABIERTA" || raw === "EN_PROCESO";
}

const superAdminEquipmentAlerts = computed(() => {
  const alertsByEquipo = new Map<string, AnyRow[]>();
  for (const alert of alertas.value) {
    if (alert?.is_deleted) continue;
    if (!isActiveAlertState(alert?.estado)) continue;
    const equipoId = String(alert?.equipo_id || "").trim();
    if (!equipoId) continue;
    const list = alertsByEquipo.get(equipoId) ?? [];
    list.push(alert);
    alertsByEquipo.set(equipoId, list);
  }

  return equipos.value
    .filter((item) => !item?.is_deleted)
    .slice()
    .sort(
      (a, b) =>
        String(a?.codigo || "").localeCompare(String(b?.codigo || "")) ||
        String(a?.nombre || "").localeCompare(String(b?.nombre || "")),
    )
    .map((equipo) => {
      const equipoId = String(equipo?.id || "").trim();
      const equipoAlerts = [...(alertsByEquipo.get(equipoId) ?? [])].sort(
        (a, b) => new Date(b?.fecha_generada || 0).getTime() - new Date(a?.fecha_generada || 0).getTime(),
      );
      return {
        id: equipoId,
        codigo: equipo?.codigo || "Sin código",
        nombre: equipo?.nombre || "Sin nombre",
        modelo: equipo?.modelo || "",
        marca_nombre: equipo?.marca_nombre || "",
        label: buildEquipmentDisplayTitle(equipo),
        alerts: equipoAlerts.map((alert) => ({
          id: alert.id,
          tipo: alert?.tipo_alerta || "Alerta",
          nivel: alert?.nivel || alert?.severidad || "INFO",
          estado: alert?.estado || "Sin estado",
          detalle: alert?.detalle || "Sin detalle",
          fecha: alert?.fecha_generada ? formatDateTime(alert.fecha_generada) : "Sin fecha",
        })),
      };
    });
});

async function executeAlertManually(alertId: string) {
  if (!isSuperAdmin.value || manualAlertLoadingId.value) return;
  manualAlertLoadingId.value = alertId;
  try {
    const response = await api.post(`/kpi_maintenance/alertas/${alertId}/ejecutar-manual`, {
      source: "dashboard-super-admin",
    });
    const data = unwrap<AnyRow>(response.data, {});
    const sentCount = Number(data?.sent_count || 0);
    if (sentCount > 0) {
      ui.success(`Correo de alerta enviado a ${sentCount} destinatario${sentCount === 1 ? "" : "s"}.`);
    } else {
      ui.open(
        data?.skipped_reason || "La alerta se ejecutó pero no se envió ningún correo.",
        "warning",
      );
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo ejecutar la alerta manualmente.");
  } finally {
    manualAlertLoadingId.value = null;
  }
}
const filteredWorkOrders = computed(() =>
  workOrders.value.filter(
    (item) => !isAnnulledWorkOrder(item) && isInSelectedPeriod(resolveWorkOrderDate(item)),
  ),
);
const filteredDailyReports = computed(() =>
  dailyReports.value.filter((item) => isInSelectedPeriod(item?.fecha_reporte || item?.created_at)),
);
const filteredWeeklySchedules = computed(() =>
  weeklySchedules.value.filter((item) =>
    overlapsSelectedPeriod(
      item?.fecha_inicio || item?.created_at,
      item?.fecha_fin || item?.fecha_inicio || item?.created_at,
    ),
  ),
);
const activeEquipmentCount = computed(
  () => equipos.value.filter((item) => normalizeFuncionamiento(item?.estado_funcionamiento) === "FUNCIONAMIENTO").length,
);

const equipmentControlItems = computed<EquipmentControlItem[]>(() =>
  equipos.value.map((item) => ({
    id: item.id,
    codigo: item?.codigo || null,
    nombre: item?.nombre || null,
    modelo: item?.modelo || null,
    marca_nombre: item?.marca_nombre || null,
    estado_operativo: item?.estado_operativo || null,
    estado_funcionamiento: item?.estado_funcionamiento || null,
    estado_funcionamiento_actualizado_en: item?.estado_funcionamiento_actualizado_en || null,
    horometro_actual: item?.horometro_actual ?? null,
    fecha_ultima_lectura: item?.fecha_ultima_lectura || null,
  })),
);

function handleEquipmentFuncionamientoUpdated(payload: {
  id: string | number;
  estado_funcionamiento: string;
  estado_funcionamiento_actualizado_en: string | null;
}) {
  const target = equipos.value.find((item) => String(item.id) === String(payload.id));
  if (target) {
    target.estado_funcionamiento = payload.estado_funcionamiento;
    target.estado_funcionamiento_actualizado_en = payload.estado_funcionamiento_actualizado_en;
  }
}

function handleEquipmentHorometerUpdated(payload: {
  id: string | number;
  horometro_actual: number;
  fecha_ultima_lectura: string | null;
}) {
  const target = equipos.value.find((item) => String(item.id) === String(payload.id));
  if (target) {
    target.horometro_actual = payload.horometro_actual;
    target.fecha_ultima_lectura = payload.fecha_ultima_lectura;
  }
}

const workOrdersByStatus = computed(() => {
  const summary = {
    PLANNED: 0,
    IN_PROGRESS: 0,
    CLOSED: 0,
  };

  for (const item of filteredWorkOrders.value) {
    const key = normalizeWorkflowStatus(item?.status_workflow);
    if (key in summary) summary[key as keyof typeof summary] += 1;
  }

  return summary;
});

const kpiCards = computed(() => [
  {
    key: "equipos",
    label: "Equipos",
    value: activeEquipmentCount.value,
    helper: "En funcionamiento actualmente",
    icon: "mdi-cog-outline",
    accent: "var(--dashboard-blue)",
  },
  {
    key: "ots",
    label: "Órdenes de trabajo",
    value: filteredWorkOrders.value.length,
    helper: `${workOrdersByStatus.value.IN_PROGRESS} en proceso`,
    icon: "mdi-clipboard-text-outline",
    accent: "var(--dashboard-green)",
  },
  {
    key: "inventario",
    label: "Productos inventario",
    value: productos.value.length,
    helper: `${lowStockItems.value.length} bajo stock`,
    icon: "mdi-package-variant-closed",
    accent: "var(--dashboard-orange)",
  },
  {
    key: "seguridad",
    label: "Usuarios activos",
    value: users.value.filter((item) => String(item?.status || "ACTIVE").toUpperCase() === "ACTIVE").length,
    helper: `${roles.value.length} roles configurados`,
    icon: "mdi-account-group-outline",
    accent: "var(--dashboard-purple)",
  },
]);

const workOrderStatusCards = computed(() => [
  {
    key: "PLANNED",
    label: "Planificadas",
    value: workOrdersByStatus.value.PLANNED,
    tone: "planned",
    icon: "mdi-calendar-clock-outline",
  },
  {
    key: "IN_PROGRESS",
    label: "En proceso",
    value: workOrdersByStatus.value.IN_PROGRESS,
    tone: "progress",
    icon: "mdi-progress-wrench",
  },
  {
    key: "CLOSED",
    label: "Cerradas",
    value: workOrdersByStatus.value.CLOSED,
    tone: "closed",
    icon: "mdi-check-decagram-outline",
  },
]);

function inventoryAvailableForMinimum(item: AnyRow) {
  return Math.max(
    Number(item?.stock_actual || 0) - Number(item?.stock_critico || 0),
    0,
  );
}

const lowStockItems = computed(() =>
  stockRows.value.filter((item) => {
    const stock = inventoryAvailableForMinimum(item);
    const min = Number(item?.stock_min_bodega || 0);
    return min > 0 && stock <= min;
  }),
);

const equipmentNameMap = computed(() =>
  equipos.value.reduce((acc: Record<string, string>, item) => {
    const id = String(item?.id || "").trim();
    const code = String(item?.codigo || "").trim();
    const label = buildEquipmentDisplayTitle(item);
    if (id) acc[id] = label;
    if (code) acc[code.toUpperCase()] = label;
    return acc;
  }, {}),
);

function resolveEquipmentLabel(item: AnyRow) {
  const equipmentId = String(item?.equipment_id || item?.equipo_id || "").trim();
  const code = String(item?.equipment_codigo || item?.equipo_codigo || "").trim();
  const hasDirectEquipment = Boolean(
    item?.equipment_nombre ||
      item?.equipo_nombre ||
      item?.equipment_name ||
      item?.nombre,
  );
  const directLabel = hasDirectEquipment
    ? buildEquipmentDisplayTitle(item)
    : "";
  return (
    equipmentNameMap.value[equipmentId] ||
    equipmentNameMap.value[code.toUpperCase()] ||
    directLabel ||
    item?.equipment_label ||
    equipmentId ||
    "Sin equipo"
  );
}

function resolveWorkOrderEquipmentLabel(item: AnyRow) {
  return resolveEquipmentLabel(item);
}

const productNameMap = computed(() =>
  productos.value.reduce((acc: Record<string, string>, item) => {
    acc[String(item.id)] = buildProductDisplayTitle(item);
    return acc;
  }, {}),
);

const warehouseNameMap = computed(() =>
  bodegas.value.reduce((acc: Record<string, string>, item) => {
    const id = String(item?.id || "").trim();
    if (!id) return acc;
    const code = String(item?.codigo || "").trim();
    const name = String(item?.nombre || "").trim();
    acc[id] = [code, name].filter(Boolean).join(" - ") || id;
    return acc;
  }, {}),
);

function resolveWarehouseLabel(item: AnyRow) {
  const warehouseId = String(item?.bodega_id || "").trim();
  const warehouseCode = String(item?.bodega_codigo || "").trim();
  const warehouseName = String(item?.bodega_nombre || "").trim();
  return (
    warehouseNameMap.value[warehouseId] ||
    [warehouseCode, warehouseName].filter(Boolean).join(" - ") ||
    warehouseCode ||
    warehouseName ||
    warehouseId ||
    "Sin bodega"
  );
}

function resolveWarehouseKey(item: AnyRow) {
  return String(item?.bodega_id || "").trim() || resolveWarehouseLabel(item);
}

const workOrderStatusChartItems = computed(() => [
  {
    key: "planned",
    label: "Planificadas",
    value: workOrdersByStatus.value.PLANNED,
    valueLabel: formatCompactNumber(workOrdersByStatus.value.PLANNED),
    helper: "Pendientes de ejecución",
    color: "linear-gradient(90deg, #2f6cab 0%, #78b7ff 100%)",
  },
  {
    key: "in_progress",
    label: "En proceso",
    value: workOrdersByStatus.value.IN_PROGRESS,
    valueLabel: formatCompactNumber(workOrdersByStatus.value.IN_PROGRESS),
    helper: "OT trabajando en campo",
    color: "linear-gradient(90deg, #e17a00 0%, #ffce73 100%)",
  },
  {
    key: "closed",
    label: "Cerradas",
    value: workOrdersByStatus.value.CLOSED,
    valueLabel: formatCompactNumber(workOrdersByStatus.value.CLOSED),
    helper: "Órdenes culminadas",
    color: "linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%)",
  },
]);

const alertSeverityChartItems = computed(() => {
  const summary = {
    CRITICA: 0,
    ADVERTENCIA: 0,
    INFO: 0,
  };

  for (const item of openAlerts.value) {
    const severity = normalizeAlertSeverity(item?.nivel || item?.severidad || item?.categoria);
    summary[severity as keyof typeof summary] += 1;
  }

  return [
    {
      key: "critical",
      label: "Críticas",
      value: summary.CRITICA,
      valueLabel: formatCompactNumber(summary.CRITICA),
      helper: "Atención inmediata",
      color: "linear-gradient(90deg, #d53d57 0%, #ff96a6 100%)",
    },
    {
      key: "warning",
      label: "Advertencia",
      value: summary.ADVERTENCIA,
      valueLabel: formatCompactNumber(summary.ADVERTENCIA),
      helper: "Seguimiento prioritario",
      color: "linear-gradient(90deg, #e17a00 0%, #ffce73 100%)",
    },
    {
      key: "info",
      label: "Informativas",
      value: summary.INFO,
      valueLabel: formatCompactNumber(summary.INFO),
      helper: "Contexto operativo",
      color: "linear-gradient(90deg, #3f62d8 0%, #9eaefc 100%)",
    },
  ];
});

const operationCadenceChartItems = computed(() =>
  operationScheduleDays.value.slice(0, 7).map((item) => ({
    key: item.date,
    label: item.title,
    value: Number(item.totalHours || 0),
    valueLabel: `${Number(item.totalHours || 0).toFixed(1)} h`,
    helper: `${item.count} actividades`,
    color: "linear-gradient(90deg, #0f8f72 0%, #7be8c4 100%)",
  })),
);

const lowStockByWarehouse = computed(() => {
  const grouped = new Map<string, { key: string; label: string; value: number }>();
  for (const item of lowStockItems.value) {
    const key = resolveWarehouseKey(item);
    const label = resolveWarehouseLabel(item);
    const current = grouped.get(key) ?? { key, label, value: 0 };
    current.value += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 6)
    .map((item) => ({
      ...item,
      valueLabel: `${item.value} materiales`,
      helper: "Bodega con stock comprometido",
      color: "linear-gradient(90deg, #e24f5f 0%, #ff9aa5 100%)",
    }));
});

const recentAlertsTableRows = computed(() =>
  [...openAlerts.value]
    .sort((a, b) => new Date(b?.fecha_generada || 0).getTime() - new Date(a?.fecha_generada || 0).getTime())
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      tipo: item?.tipo_alerta || "Alerta",
      equipo: resolveEquipmentLabel(item),
      estado: item?.estado || "Sin estado",
      detalle: item?.detalle || "Sin detalle",
    })),
);

const recentWorkOrdersTableRows = computed(() =>
  [...filteredWorkOrders.value]
    .sort((a, b) => String(b?.code || "").localeCompare(String(a?.code || "")))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      codigo: item?.code || "Sin código",
      titulo: item?.title || item?.titulo || "Sin título",
      equipo: resolveWorkOrderEquipmentLabel(item),
      estado: workflowLabel(item?.status_workflow),
    })),
);

function buildInventoryRow(item: AnyRow) {
  const stock = inventoryAvailableForMinimum(item);
  const min = Number(item?.stock_min_bodega || 0);
  return {
    id: item.id,
    producto: productNameMap.value[String(item?.producto_id)] || String(item?.producto_id || "Producto"),
    bodega: resolveWarehouseLabel(item),
    stock,
    min,
    deficit: Math.max(0, min - stock),
  };
}

const criticalInventoryRows = computed(() =>
  [...lowStockItems.value]
    .map((item) => buildInventoryRow(item))
    .sort((a, b) => b.deficit - a.deficit || a.producto.localeCompare(b.producto))
    .slice(0, 8),
);

const processIndicatorCards = computed(() => [
  {
    key: "programaciones_vencidas",
    label: "Programaciones vencidas",
    value: intelligenceSummary.value?.kpis?.programaciones_vencidas ?? 0,
    helper: "Control preventivo fuera de ventana",
  },
  {
    key: "work_orders_pendientes",
    label: "OT pendientes",
    value: intelligenceSummary.value?.kpis?.work_orders_pendientes ?? 0,
    helper: "Ordenes pendientes o en proceso",
  },
  {
    key: "eventos_proceso",
    label: "Eventos KPI",
    value: intelligenceSummary.value?.kpis?.eventos_proceso ?? 0,
    helper: "Notificaciones por proceso principal",
  },
]);

const latestDailyReport = computed(() => filteredDailyReports.value[0] ?? null);
const latestDailyUnits = computed(() => (latestDailyReport.value?.unidades ?? []).slice(0, 4));
const latestDailyFuel = computed(() => (latestDailyReport.value?.combustibles ?? []).slice(0, 3));

const latestWeeklySchedule = computed(() => filteredWeeklySchedules.value[0] ?? null);
const latestWeeklyActivities = computed(() =>
  [...(latestWeeklySchedule.value?.detalles ?? [])]
    .sort(
      (a, b) =>
        (parseDateValue(a?.fecha_actividad)?.getTime() ?? 0) -
          (parseDateValue(b?.fecha_actividad)?.getTime() ?? 0) ||
        String(a?.hora_inicio || "").localeCompare(String(b?.hora_inicio || "")),
    )
    .map((item) => ({
      ...item,
      hora_inicio: formatTimeLabel(item?.hora_inicio),
      hora_fin: formatTimeLabel(item?.hora_fin),
      fecha_label: item?.fecha_actividad
        ? new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
            parseDateValue(item.fecha_actividad) ?? new Date(),
          )
        : "",
    })),
);

const operationScheduleItems = computed(() =>
  filteredWeeklySchedules.value
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

const operationScheduleDays = computed(() => {
  const grouped = new Map<
    string,
    {
      date: string;
      count: number;
      totalHours: number;
      taskHours: number;
      startMinutes: number | null;
      endMinutes: number | null;
      startLabel: string;
      endLabel: string;
      activities: string[];
      equipments: string[];
    }
  >();

  for (const item of operationScheduleItems.value) {
    const date = String(item?.fecha_resuelta || "").slice(0, 10);
    if (!date) continue;
    const startMinutes = parseTimeToMinutes(item?.hora_inicio);
    const endMinutes = parseTimeToMinutes(item?.hora_fin);
    const startLabel = formatTimeLabel(item?.hora_inicio);
    const endLabel = formatTimeLabel(item?.hora_fin);
    const current = grouped.get(date) ?? {
      date,
      count: 0,
      totalHours: 0,
      taskHours: 0,
      startMinutes: null,
      endMinutes: null,
      startLabel: "",
      endLabel: "",
      activities: [],
      equipments: [],
    };
    current.count += 1;
    current.taskHours += Number(item?.duracion_horas || 0);
    if (startMinutes != null && (current.startMinutes == null || startMinutes < current.startMinutes)) {
      current.startMinutes = startMinutes;
      current.startLabel = startLabel;
    }
    if (endMinutes != null && (current.endMinutes == null || endMinutes > current.endMinutes)) {
      current.endMinutes = endMinutes;
      current.endLabel = endLabel;
    }
    if (item?.actividad) current.activities.push(String(item.actividad));
    const equipmentLabel = resolveEquipmentLabel(item);
    if (equipmentLabel !== "Sin equipo") current.equipments.push(equipmentLabel);
    grouped.set(date, current);
  }

  return [...grouped.values()]
    .sort((a, b) => (parseDateValue(a.date)?.getTime() ?? 0) - (parseDateValue(b.date)?.getTime() ?? 0))
    .map((item) => ({
      ...item,
      totalHours:
        item.startMinutes != null && item.endMinutes != null && item.endMinutes > item.startMinutes
          ? Number(((item.endMinutes - item.startMinutes) / 60).toFixed(2))
          : Number(item.taskHours.toFixed(2)),
      title: new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "long", year: "numeric" }).format(
        parseDateValue(item.date) ?? new Date(),
      ),
      subtitle: `${item.count} actividades${
        item.startLabel && item.endLabel ? ` · ${item.startLabel} - ${item.endLabel}` : ""
      } · ${
        (
          item.startMinutes != null &&
          item.endMinutes != null &&
          item.endMinutes > item.startMinutes
            ? Number(((item.endMinutes - item.startMinutes) / 60).toFixed(2))
            : Number(item.taskHours.toFixed(2))
        ).toFixed(1)
      } h${
        item.equipments.length ? ` · ${[...new Set(item.equipments)].slice(0, 3).join(", ")}` : ""
      }`,
    }));
});

const operationScheduleSummary = computed(() => {
  const totalHours = operationScheduleDays.value.reduce((acc, item) => acc + Number(item?.totalHours || 0), 0);
  return {
    days: operationScheduleDays.value.length,
    activities: operationScheduleItems.value.length,
    totalHours,
    hoursLabel: `${totalHours.toFixed(1)} h`,
  };
});

type DetailColumn = { key: string; label: string; align?: "start" | "center" | "end" };

const detailDialogOpen = ref(false);
const detailDialogTitle = ref("");
const detailDialogSubtitle = ref("");
const detailDialogColumns = ref<DetailColumn[]>([]);
const detailDialogRows = ref<AnyRow[]>([]);
const detailDialogEmptyText = ref("No hay datos disponibles para este detalle.");

function openDetailDialog(options: {
  title: string;
  subtitle?: string;
  columns: DetailColumn[];
  rows: AnyRow[];
  emptyText?: string;
}) {
  detailDialogTitle.value = options.title;
  detailDialogSubtitle.value = options.subtitle || "";
  detailDialogColumns.value = options.columns;
  detailDialogRows.value = options.rows;
  detailDialogEmptyText.value = options.emptyText || "No hay datos disponibles para este detalle.";
  detailDialogOpen.value = true;
}

function openSingleRowDetail(title: string, columns: DetailColumn[], row: AnyRow, subtitle?: string) {
  openDetailDialog({ title, subtitle, columns, rows: [row] });
}

const WORK_ORDER_DETAIL_COLUMNS: DetailColumn[] = [
  { key: "codigo", label: "Código" },
  { key: "titulo", label: "Título" },
  { key: "equipo", label: "Equipo" },
  { key: "estado", label: "Estado" },
];

function buildWorkOrderDetailRow(item: AnyRow) {
  return {
    id: item.id,
    codigo: item?.code || "Sin código",
    titulo: item?.title || item?.titulo || "Sin título",
    equipo: resolveWorkOrderEquipmentLabel(item),
    estado: workflowLabel(item?.status_workflow),
  };
}

function openWorkOrderStatusDetail(statusKey: string) {
  const normalized = normalizeWorkflowStatus(statusKey);
  const rows = filteredWorkOrders.value
    .filter((item) => normalizeWorkflowStatus(item?.status_workflow) === normalized)
    .map(buildWorkOrderDetailRow);
  openDetailDialog({
    title: `Órdenes de trabajo - ${workflowLabel(normalized)}`,
    subtitle: selectedPeriodLabel.value,
    columns: WORK_ORDER_DETAIL_COLUMNS,
    rows,
    emptyText: "No hay órdenes de trabajo en este estado para el período seleccionado.",
  });
}

function openWorkOrderRowDetail(order: AnyRow) {
  openSingleRowDetail("Orden de trabajo", WORK_ORDER_DETAIL_COLUMNS, order, selectedPeriodLabel.value);
}

const ALERT_DETAIL_COLUMNS: DetailColumn[] = [
  { key: "tipo", label: "Tipo" },
  { key: "equipo", label: "Equipo" },
  { key: "estado", label: "Estado" },
  { key: "detalle", label: "Detalle" },
];

function buildAlertDetailRow(item: AnyRow) {
  return {
    id: item.id,
    tipo: item?.tipo_alerta || "Alerta",
    equipo: resolveEquipmentLabel(item),
    estado: item?.estado || "Sin estado",
    detalle: item?.detalle || "Sin detalle",
  };
}

const ALERT_SEVERITY_LABELS: Record<string, string> = {
  CRITICA: "Críticas",
  ADVERTENCIA: "Advertencia",
  INFO: "Informativas",
};

function openAlertSeverityDetail(severityKey: string) {
  const normalized = normalizeAlertSeverity(severityKey);
  const rows = openAlerts.value
    .filter((item) => normalizeAlertSeverity(item?.nivel || item?.severidad || item?.categoria) === normalized)
    .map(buildAlertDetailRow);
  openDetailDialog({
    title: `Alertas - ${ALERT_SEVERITY_LABELS[normalized] || normalized}`,
    subtitle: selectedPeriodLabel.value,
    columns: ALERT_DETAIL_COLUMNS,
    rows,
    emptyText: "No hay alertas abiertas con esta severidad para el período seleccionado.",
  });
}

function openAlertRowDetail(alert: AnyRow) {
  openSingleRowDetail("Alerta", ALERT_DETAIL_COLUMNS, alert, selectedPeriodLabel.value);
}

function openKpiDetail(key: string) {
  if (key === "equipos") {
    const rows = equipos.value
      .filter((item) => normalizeFuncionamiento(item?.estado_funcionamiento) === "FUNCIONAMIENTO")
      .map((item) => ({
        id: item.id,
        codigo: item?.codigo || "Sin código",
        nombre: item?.nombre || "Sin nombre",
        modelo: item?.modelo || "Sin modelo",
        estado: "En funcionamiento",
      }));
    openDetailDialog({
      title: "Equipos en funcionamiento",
      subtitle: "Estado actual · no depende del período seleccionado",
      columns: [
        { key: "codigo", label: "Código" },
        { key: "nombre", label: "Nombre" },
        { key: "modelo", label: "Modelo" },
        { key: "estado", label: "Estado" },
      ],
      rows,
      emptyText: "No hay equipos en funcionamiento actualmente.",
    });
    return;
  }

  if (key === "ots") {
    openDetailDialog({
      title: "Órdenes de trabajo reportables",
      subtitle: selectedPeriodLabel.value,
      columns: WORK_ORDER_DETAIL_COLUMNS,
      rows: filteredWorkOrders.value.map(buildWorkOrderDetailRow),
      emptyText: "No hay órdenes de trabajo para el período seleccionado.",
    });
    return;
  }

  if (key === "inventario") {
    const lowStockProductIds = new Set(
      lowStockItems.value.map((item) => String(item?.producto_id || "")).filter(Boolean),
    );
    const rows = productos.value.map((item) => ({
      id: item.id,
      producto: productNameMap.value[String(item.id)] || String(item?.nombre || item.id),
      bajoStock: lowStockProductIds.has(String(item.id)) ? "Sí" : "No",
    }));
    openDetailDialog({
      title: "Productos de inventario",
      columns: [
        { key: "producto", label: "Producto" },
        { key: "bajoStock", label: "Bajo stock" },
      ],
      rows,
      emptyText: "No hay productos registrados en el inventario.",
    });
    return;
  }

  if (key === "seguridad") {
    const rows = users.value
      .filter((item) => String(item?.status || "ACTIVE").toUpperCase() === "ACTIVE")
      .map((item) => ({
        id: item.id,
        nombre: item?.nameUser || item?.nombre || "Sin nombre",
        rol: item?.role?.nombre || "Sin rol",
        estado: "Activo",
      }));
    openDetailDialog({
      title: "Usuarios activos",
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "rol", label: "Rol" },
        { key: "estado", label: "Estado" },
      ],
      rows,
      emptyText: "No hay usuarios activos registrados.",
    });
  }
}

const INVENTORY_DETAIL_COLUMNS: DetailColumn[] = [
  { key: "producto", label: "Producto" },
  { key: "bodega", label: "Bodega" },
  { key: "stock", label: "Disponible" },
  { key: "min", label: "Mín." },
  { key: "deficit", label: "Déficit" },
];

function openInventoryRowDetail(row: AnyRow) {
  openSingleRowDetail("Producto bajo stock mínimo", INVENTORY_DETAIL_COLUMNS, row);
}

function openLowStockWarehouseDetail(warehouseKey: string, warehouseLabel: string) {
  const rows = lowStockItems.value
    .filter((item) => resolveWarehouseKey(item) === warehouseKey)
    .map((item) => buildInventoryRow(item))
    .sort((a, b) => b.deficit - a.deficit);
  openDetailDialog({
    title: `Inventario crítico - ${warehouseLabel}`,
    columns: INVENTORY_DETAIL_COLUMNS,
    rows,
    emptyText: "No hay materiales bajo el mínimo para esta bodega.",
  });
}

const OPERATION_ACTIVITY_DETAIL_COLUMNS: DetailColumn[] = [
  { key: "actividad", label: "Actividad" },
  { key: "equipo", label: "Equipo" },
  { key: "horaInicio", label: "Hora inicio" },
  { key: "horaFin", label: "Hora fin" },
  { key: "tipoProceso", label: "Tipo proceso" },
];

function openOperationDayDetail(dateKey: string) {
  const rows = operationScheduleItems.value
    .filter((item) => String(item?.fecha_resuelta || "").slice(0, 10) === dateKey)
    .map((item, index) => ({
      id: item?.id || `${dateKey}-${index}`,
      actividad: item?.actividad || "Actividad sin nombre",
      equipo: resolveEquipmentLabel(item),
      horaInicio: formatTimeLabel(item?.hora_inicio) || "Sin hora",
      horaFin: formatTimeLabel(item?.hora_fin) || "Sin hora",
      tipoProceso: item?.tipo_proceso || "Sin proceso",
    }));
  const dayLabel = operationScheduleDays.value.find((day) => day.date === dateKey)?.title || dateKey;
  openDetailDialog({
    title: `Actividades programadas - ${dayLabel}`,
    columns: OPERATION_ACTIVITY_DETAIL_COLUMNS,
    rows,
    emptyText: "No hay actividades registradas para este día.",
  });
}

function openDailyUnitDetail(unit: AnyRow) {
  openSingleRowDetail("Unidad del reporte diario", [
    { key: "equipo", label: "Equipo" },
    { key: "horometro", label: "Horómetro" },
    { key: "mpg", label: "MPG" },
  ], {
    equipo: resolveEquipmentLabel(unit),
    horometro: unit?.horometro_actual ?? "N/A",
    mpg: unit?.mpg_actual ?? "N/A",
  });
}

function openWeeklyActivityDetail(activity: AnyRow) {
  openSingleRowDetail("Actividad del cronograma", [
    { key: "fecha", label: "Fecha" },
    { key: "dia", label: "Día" },
    { key: "hora", label: "Hora" },
    { key: "equipo", label: "Equipo" },
    { key: "actividad", label: "Actividad" },
  ], {
    fecha: activity?.fecha_label || activity?.fecha_actividad || "Sin fecha",
    dia: normalizeDayLabel(activity?.dia_semana),
    hora:
      activity?.hora_inicio && activity?.hora_fin
        ? `${activity.hora_inicio} - ${activity.hora_fin}`
        : activity?.hora_inicio || activity?.hora_fin || "Sin hora",
    equipo: resolveEquipmentLabel(activity),
    actividad: activity?.actividad || "Actividad sin nombre",
  });
}

function openProcessIndicatorDetail(key: string) {
  const card = processIndicatorCards.value.find((item) => item.key === key);
  if (!card) return;
  openSingleRowDetail(card.label, [
    { key: "indicador", label: "Indicador" },
    { key: "valor", label: "Valor" },
    { key: "detalle", label: "Detalle" },
  ], {
    indicador: card.label,
    valor: card.value,
    detalle: card.helper,
  });
}

const dashboardReportDefinition = computed(() =>
  buildExecutiveDashboardReport({
    periodLabel: selectedPeriodLabel.value,
    kpis: kpiCards.value.map((card) => ({
      label: card.label,
      value: card.value,
    })),
    alerts: openAlerts.value.map((item) => ({
      tipo_alerta: item?.tipo_alerta || "Alerta",
      estado: item?.estado || "",
      severidad: item?.severidad || item?.nivel || "",
      referencia: item?.referencia_codigo || item?.referencia || item?.tabla_referencia || "",
      detalle: item?.detalle || "",
      fecha_generada: item?.fecha_generada || item?.created_at || "",
    })),
    workOrders: filteredWorkOrders.value.map((item) => ({
      codigo: item?.code || item?.codigo || "",
      titulo: item?.title || item?.titulo || "",
      equipo: resolveWorkOrderEquipmentLabel(item),
      compartimiento: item?.equipment_component_label || item?.equipo_componente_nombre_oficial || "",
      estado_workflow: workflowLabel(item?.status_workflow),
      tipo_mantenimiento: item?.maintenance_kind || "",
      fecha: resolveWorkOrderDate(item) || "",
    })),
    inventory: lowStockItems.value.map((item) => ({
      producto: productNameMap.value[String(item?.producto_id)] || String(item?.producto_id || ""),
      bodega: resolveWarehouseLabel(item),
      stock_actual: inventoryAvailableForMinimum(item),
      stock_total: item?.stock_actual || 0,
      stock_critico: item?.stock_critico || 0,
      stock_minimo: item?.stock_min_bodega || 0,
      observacion: "Bajo stock mínimo",
    })),
    processIndicators: processIndicatorCards.value.map((item) => ({
      indicador: item.label,
      valor: item.value,
      detalle: item.helper,
    })),
    operationDays: operationScheduleDays.value.map((item) => ({
      fecha: item.date,
      resumen: item.title,
      detalle: item.subtitle,
      actividades: item.count,
      horas: item.totalHours,
    })),
    weeklyActivities: latestWeeklyActivities.value.map((item) => ({
      actividad: item?.actividad || "",
      dia_semana: normalizeDayLabel(item?.dia_semana),
      hora_inicio: item?.hora_inicio || "",
      hora_fin: item?.hora_fin || "",
      equipo_codigo: resolveEquipmentLabel(item),
      tipo_proceso: item?.tipo_proceso || "",
      observacion: item?.observacion || "",
    })),
  }),
);

async function exportDashboard(format: "excel" | "pdf") {
  if (!canAccessDashboardReports.value) {
    error.value = "No tienes permisos para generar reportes del dashboard.";
    return;
  }
  const key = exportKey(format);
  exportState.value = { ...exportState.value, [key]: true };
  error.value = null;
  try {
    if (format === "excel") {
      await downloadReportExcel(dashboardReportDefinition.value);
    } else {
      await downloadReportPdf(dashboardReportDefinition.value);
    }
  } catch (e: any) {
    error.value = e?.message || "No se pudo generar el reporte del dashboard.";
  } finally {
    exportState.value = { ...exportState.value, [key]: false };
  }
}

const lastUpdatedLabel = computed(() => {
  if (!lastUpdatedAt.value) return "Sin datos";
  return formatDateTime(lastUpdatedAt.value, "Sin datos");
});

onMounted(() => {
  loadDashboard();
});

watch([selectedYear, selectedMonth], () => {
  loadDashboard();
});
/**
 * Motor de revelado del design system sobre el subarbol de la vista.
 *
 * Se declara al final del `<script setup>` a proposito: `useRevealMotion` monta
 * un watch que evalua su getter de inmediato, y la clave de reenganche lee un
 * computed cuyas dependencias se declaran mas abajo en el archivo. Situarlo
 * antes provocaba un ReferenceError por TDZ que dejaba la vista en blanco.
 *
 * Se enlaza con `:ref` y no con `ref="..."` porque `noUnusedLocals` esta activo
 * y con la forma de cadena la variable quedaria marcada como no usada.
 */
const motionRoot = useRevealMotion<HTMLDivElement>(() => kpiCards.value.length);

function setMotionRoot(el: unknown) {
  motionRoot.value = (el as HTMLDivElement | null) ?? null;
}
</script>

<style scoped>
/* Escala de densidad del design system (Density 8/10 — Dense / Dashboard).
 * Ver design-system/kpi-justice/MASTER.md. Se declara aquí para no depender de
 * números sueltos en cada regla. */
.dashboard-page {
  --dashboard-blue: 47, 108, 171;
  --dashboard-cyan: 39, 164, 190;
  --dashboard-green: 15, 143, 114;
  --dashboard-orange: 225, 122, 0;
  --dashboard-purple: 132, 81, 201;
  --space-md: 8px;
  --space-lg: 12px;
  --space-xl: 16px;
  --space-2xl: 24px;
  width: 100%;
  min-width: 0;
  padding: 0;
}

.dashboard-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-xl);
}

.equipment-panel-col {
  min-width: 0;
}

.dashboard-hero,
.dashboard-status-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

/* Estilo Swiss: superficie plana y una regla superior de acento como único
 * elemento gráfico. Se retiraron el degradado y los tres círculos decorativos
 * (dos `__glow` y el anillo `::after`): el MASTER.md marca el ornamento como
 * anti-patrón explícito. */
.dashboard-hero {
  padding: var(--space-2xl);
  border-top: 3px solid rgb(var(--v-theme-primary));
  background: var(--surface-base);
}

.dashboard-hero__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 26px;
}

.dashboard-hero__copy {
  max-width: 690px;
}

.dashboard-hero__eyebrow {
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

.dashboard-hero__pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
  box-shadow: 0 0 0 6px rgba(var(--v-theme-success), 0.12);
  animation: dashboard-pulse 2.2s ease-out infinite;
}

.dashboard-hero__title {
  margin: 0;
  font-size: clamp(1.65rem, 2.7vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.12;
}

.dashboard-hero__description {
  max-width: 620px;
  margin: 9px 0 13px;
  color: var(--app-muted-text);
  font-size: 0.94rem;
}

.dashboard-hero__identity {
  display: flex;
  flex-wrap: wrap;
  gap: 9px 18px;
  color: var(--app-muted-text);
  font-size: 0.75rem;
}

.dashboard-hero__identity span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dashboard-hero__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.period-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(120px, 0.4fr) minmax(170px, 0.55fr) auto;
  align-items: center;
  gap: 10px;
  margin: 21px 0 15px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 17px;
  background: color-mix(in srgb, var(--surface-soft) 80%, transparent);
}

.period-toolbar__intro {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.period-toolbar__intro > div:last-child {
  display: grid;
  min-width: 0;
}

.period-toolbar__intro strong {
  font-size: 0.78rem;
}

.period-toolbar__intro span {
  overflow: hidden;
  color: var(--app-muted-text);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.period-toolbar__icon {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.period-toolbar__select {
  min-width: 120px;
}

.period-toolbar__select--month {
  min-width: 180px;
}

/* Tarjeta KPI en clave Swiss: superficie plana, jerarquía por tipografía y una
 * barra de acento sólida. `--kpi-accent` llega como triplete RGB desde
 * `kpiCards`, reutilizando los tokens `--dashboard-*` de esta vista en vez de
 * rgba sueltos. */
.kpi-card {
  position: relative;
  overflow: hidden;
  min-height: 152px;
  padding: var(--space-xl);
  border: 1px solid var(--surface-border);
  border-left: 3px solid rgb(var(--kpi-accent, var(--dashboard-blue)));
  background: var(--surface-base);
  /* El transform lo gobierna el motor de movimiento (`js-hover-card`); aquí solo
   * viajan color y sombra, que siguen dando respuesta con movimiento reducido. */
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.kpi-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.28);
  border-left-color: rgb(var(--kpi-accent, var(--dashboard-blue)));
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.kpi-card--interactive {
  cursor: pointer;
}

.kpi-card--interactive:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
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
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(var(--kpi-accent, var(--dashboard-blue)), 0.22);
  border-radius: 10px;
  color: rgb(var(--kpi-accent, var(--dashboard-blue)));
  background: rgba(var(--kpi-accent, var(--dashboard-blue)), 0.08);
}

.kpi-card__index {
  color: var(--app-muted-text);
  font-size: 0.61rem;
  font-weight: 800;
  letter-spacing: 0.12em;
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
  margin-top: 12px;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
}

.kpi-card__label {
  position: relative;
  z-index: 1;
  margin-top: 7px;
  font-size: 0.82rem;
  font-weight: 750;
}

.kpi-card__helper {
  position: relative;
  z-index: 1;
  margin-top: 3px;
  color: var(--app-muted-text);
  font-size: 0.69rem;
  line-height: 1.35;
}

.dashboard-status-card {
  padding: 24px;
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.075), transparent 58%),
    var(--surface-base);
}

.dashboard-status-card__header {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 15px;
}

.dashboard-status-card__title-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.105);
}

.status-row {
  --status-color: var(--dashboard-blue);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px 12px;
  padding: 11px 0;
}

.status-row--planned { --status-color: var(--dashboard-blue); }
.status-row--progress { --status-color: var(--dashboard-orange); }
.status-row--closed { --status-color: var(--dashboard-green); }

.status-row--interactive {
  cursor: pointer;
  border-radius: 10px;
  transition: background 150ms ease;
}

.status-row--interactive:hover {
  background: rgba(var(--status-color), 0.06);
}

.status-row--interactive:focus-visible {
  outline: 2px solid rgb(var(--status-color));
  outline-offset: 2px;
}

.status-row__main {
  display: flex;
  align-items: center;
  gap: 9px;
}

.status-row__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 11px;
  color: rgb(var(--status-color));
  background: rgba(var(--status-color), 0.1);
}

.status-row__value {
  font-size: 1.05rem;
}

.status-row__track {
  grid-column: 1 / -1;
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: rgba(var(--status-color), 0.09);
}

.status-row__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(var(--status-color), 0.64), rgb(var(--status-color)));
  transition: width 320ms ease;
}

.dashboard-status-card__footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 13px;
  padding-top: 14px;
  border-top: 1px solid var(--surface-border);
}

.dashboard-status-meta {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-width: 0;
  padding: 9px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface-soft) 78%, transparent);
}

.dashboard-status-meta > .v-icon {
  flex: 0 0 auto;
  color: rgb(var(--v-theme-primary));
}

.dashboard-status-meta > div {
  display: grid;
  min-width: 0;
}

.dashboard-status-meta span {
  color: var(--app-muted-text);
  font-size: 0.61rem;
}

.dashboard-status-meta strong {
  overflow: hidden;
  font-size: 0.68rem;
  text-overflow: ellipsis;
}

.process-indicator-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.process-indicator-item {
  position: relative;
  overflow: hidden;
  padding: 15px;
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.06), transparent 68%),
    var(--surface-soft);
  transition: transform 160ms ease, border-color 160ms ease;
}

.process-indicator-item:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.22);
}

.dashboard-stack {
  display: grid;
  gap: 12px;
}

.dashboard-table-shell {
  position: relative;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: auto;
  max-height: 410px;
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

.dashboard-mini-bars__row--interactive {
  cursor: pointer;
}

.dashboard-mini-bars__row--interactive:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
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

.dashboard-mini-bars__fill--danger {
  background: linear-gradient(90deg, #e24f5f 0%, #ff9aa5 100%);
}

.dashboard-mini-bars__fill--success {
  background: linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%);
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.super-admin-alerts-shell {
  display: grid;
  gap: 14px;
  max-height: 460px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-color: rgba(var(--v-theme-primary), 0.3) transparent;
  scrollbar-width: thin;
}

.super-admin-alerts-equipo {
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--surface-base) 91%, transparent);
}

.super-admin-alerts-equipo__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.super-admin-alerts-equipo__title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.super-admin-alerts-equipo__empty {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--app-muted-text);
}

.super-admin-alerts-equipo__alerts {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.super-admin-alerts-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.065);
  background: color-mix(in srgb, var(--surface-soft) 96%, transparent);
}

.super-admin-alerts-alert__info {
  display: grid;
  gap: 4px;
  min-width: 220px;
}

.super-admin-alerts-alert__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.dashboard-content > .v-row:not(.dashboard-hero-grid) .enterprise-surface {
  position: relative;
  border-color: var(--surface-border);
  background:
    linear-gradient(180deg, rgba(var(--v-theme-surface), 0.18), transparent 44%),
    var(--surface-base);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.dashboard-content > .v-row:not(.dashboard-hero-grid) .enterprise-surface:hover {
  border-color: rgba(var(--v-theme-primary), 0.18);
  box-shadow: 0 19px 38px rgba(15, 23, 42, 0.105);
}

.dashboard-content > .v-row:not(.dashboard-hero-grid) .enterprise-surface :deep(.text-subtitle-1.font-weight-bold) {
  letter-spacing: -0.015em;
}

.dashboard-content :deep(.v-chip) {
  font-weight: 650;
}

.h-100 {
  height: 100%;
}

@keyframes dashboard-pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0.32); }
  65% { box-shadow: 0 0 0 8px rgba(var(--v-theme-success), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0); }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-hero__pulse {
    animation: none;
  }

  .kpi-card,
  .process-indicator-item,
  .dashboard-mini-bars__row,
  .status-row__fill {
    transition: none;
  }
}

@media (max-width: 1280px) {
  .dashboard-hero__header {
    flex-direction: column;
  }

  .dashboard-hero__actions {
    justify-content: flex-start;
  }

  .period-toolbar {
    grid-template-columns: minmax(200px, 1fr) minmax(110px, 0.45fr) minmax(160px, 0.6fr);
  }

  .period-toolbar > .v-chip {
    grid-column: 1 / -1;
    justify-self: start;
  }
}

@media (max-width: 768px) {
  .dashboard-hero,
  .dashboard-status-card {
    padding: 20px;
  }

  .dashboard-hero__actions,
  .dashboard-hero__actions > .v-btn {
    width: 100%;
  }

  .period-toolbar {
    grid-template-columns: 1fr;
  }

  .period-toolbar > .v-chip {
    grid-column: auto;
    justify-self: stretch;
  }

  .period-toolbar__select,
  .period-toolbar__select--month {
    min-width: 100%;
  }

  .dashboard-status-card__footer,
  .process-indicator-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 500px) {
  .dashboard-hero__identity {
    flex-direction: column;
  }

  .dashboard-table-shell {
    border-radius: 14px;
  }
}
</style>

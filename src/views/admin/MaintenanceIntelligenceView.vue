<template>
  <div class="intelligence-page">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar este módulo.
    </v-alert>

    <v-alert v-else-if="!canAccessIntelligenceReports" type="warning" variant="tonal">
      No tienes permisos para acceder a este reporte.
    </v-alert>

    <div v-else class="intelligence-page__content">
    <v-card rounded="xl" class="pa-5 enterprise-surface intelligence-hero">
      <div class="d-flex align-center justify-space-between intelligence-wrap">
        <div>
          <div class="text-h6 font-weight-bold">Inteligencia operativa de mantenimiento</div>
          <div class="text-body-2 text-medium-emphasis">
            Consolida procedimientos MPG, analisis de lubricante, cronogramas, reportes diarios y eventos KPI con indicadores dinamicos por componente.
          </div>
        </div>
        <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
          <v-chip label color="primary" variant="tonal">
            {{ generatedAtLabel }}
          </v-chip>
          <v-btn color="secondary" variant="tonal" prepend-icon="mdi-file-excel" :loading="isExporting('indicadores', 'excel')" @click="exportModule('indicadores', 'excel')">
            Excel KPI
          </v-btn>
          <v-btn color="secondary" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="isExporting('indicadores', 'pdf')" @click="exportModule('indicadores', 'pdf')">
            PDF KPI
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadIntelligence">
            Actualizar
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <div class="d-flex align-center flex-wrap intelligence-filter-toolbar mt-4">
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

      <v-row dense class="mt-3">
        <v-col v-for="card in kpiCards" :key="card.key" cols="12" sm="6" xl="2">
          <v-card
            rounded="lg"
            variant="outlined"
            :class="['pa-4', 'kpi-card', 'h-100', { 'intelligence-kpi--clickable': Boolean(card.routeName || card.key === 'lubricantes-dashboard') }]"
            :style="{ '--kpi-accent': card.accent }"
            :role="card.routeName || card.key === 'lubricantes-dashboard' ? 'button' : undefined"
            :tabindex="card.routeName || card.key === 'lubricantes-dashboard' ? 0 : undefined"
            @click="openCard(card)"
            @keydown.enter="openCard(card)"
            @keydown.space.prevent="openCard(card)"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 text-medium-emphasis">{{ card.label }}</div>
              <v-icon :icon="card.icon" size="20" />
            </div>
            <div class="kpi-card__value-row">
              <div class="text-h4 font-weight-bold">{{ card.value }}</div>
              <div class="kpi-card__orb" />
            </div>
            <div class="text-body-2 text-medium-emphasis mt-2">{{ card.helper }}</div>
            <div v-if="card.routeName || card.key === 'lubricantes-dashboard'" class="text-caption text-primary mt-3">Abrir detalle</div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>

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
          subtitle="Backlog, eventos y monitoreo critico"
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
              <div class="text-subtitle-1 font-weight-bold">Procedimientos y plantillas MPG</div>
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

          <LoadingTableState v-if="loading" message="Cargando plantillas MPG..." :rows="5" :columns="5" />
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
        <v-card rounded="xl" class="pa-5 enterprise-surface">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">KPI de análisis de aceite</div>
              <div class="text-body-2 text-medium-emphasis">
                Compara el consumo de aceites en galones por OT, equipo y rango de fechas.
              </div>
            </div>
            <div class="d-flex align-center intelligence-wrap" style="gap: 8px;">
              <v-chip label color="secondary" variant="tonal">
                {{ oilKpi?.filters?.label || "Sin periodo" }}
              </v-chip>
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-refresh"
                :loading="oilKpiLoading"
                @click="loadOilKpi"
              >
                Actualizar KPI
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
            <v-col cols="12" lg="3">
              <div class="text-caption text-medium-emphasis mb-1">Referencia del filtro</div>
              <div class="oil-kpi-filter-hint">
                <span v-if="oilPeriod === 'MENSUAL'">Usa el año y mes superiores: {{ selectedPeriodLabel }}</span>
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
            message="Cargando KPI de aceite..."
            :rows="6"
            :columns="4"
          />

          <template v-else>
            <div class="summary-strip mb-4">
              <v-chip label color="primary" variant="tonal">
                {{ oilKpi?.selected_product?.label || "Sin aceite seleccionado" }}
              </v-chip>
              <v-chip label color="success" variant="tonal">
                Total: {{ formatDetailedNumber(oilKpi?.totals?.total_cantidad) }} gal
              </v-chip>
              <v-chip label color="info" variant="tonal">
                Órdenes: {{ oilKpi?.totals?.total_ordenes ?? 0 }}
              </v-chip>
              <v-chip label color="secondary" variant="tonal">
                Equipos: {{ oilKpi?.totals?.total_equipos ?? 0 }}
              </v-chip>
              <v-chip label color="warning" variant="tonal">
                Promedio OT: {{ formatDetailedNumber(oilKpi?.totals?.promedio_por_orden) }} gal
              </v-chip>
            </div>

            <div class="indicator-grid mb-4">
              <div class="indicator-tile">
                <div class="text-caption text-medium-emphasis">Galones consumidos</div>
                <div class="text-h6 font-weight-bold">{{ formatDetailedNumber(oilKpi?.totals?.total_cantidad) }}</div>
                <div class="text-caption text-medium-emphasis">Consumo total del rango</div>
              </div>
              <div class="indicator-tile">
                <div class="text-caption text-medium-emphasis">Costo asociado</div>
                <div class="text-h6 font-weight-bold">${{ formatDetailedNumber(oilKpi?.totals?.total_costo, 2) }}</div>
                <div class="text-caption text-medium-emphasis">Subtotal acumulado en consumos</div>
              </div>
              <div class="indicator-tile">
                <div class="text-caption text-medium-emphasis">Promedio por equipo</div>
                <div class="text-h6 font-weight-bold">{{ formatDetailedNumber(oilKpi?.totals?.promedio_por_equipo) }}</div>
                <div class="text-caption text-medium-emphasis">Galones promedio por equipo visible</div>
              </div>
              <div class="indicator-tile">
                <div class="text-caption text-medium-emphasis">Órdenes analizadas</div>
                <div class="text-h6 font-weight-bold">{{ oilKpi?.work_orders?.length ?? 0 }}</div>
                <div class="text-caption text-medium-emphasis">Órdenes con uso registrado del aceite</div>
              </div>
            </div>

            <v-row dense class="mb-2">
              <v-col cols="12" lg="5">
                <DashboardBarChartCard
                  title="Consumo por rango"
                  subtitle="Evolución del aceite seleccionado según el periodo filtrado"
                  :chip-label="`${oilTrendChartItems.length} puntos`"
                  chip-color="success"
                  :items="oilTrendChartItems"
                  empty-text="No hay consumos del aceite seleccionado dentro del rango."
                />
              </v-col>
              <v-col cols="12" lg="7">
                <DashboardBarChartCard
                  title="Consumo por equipo"
                  subtitle="Equipos que más aceite registraron en órdenes de trabajo"
                  :chip-label="`${oilEquipmentChartItems.length} equipos`"
                  chip-color="primary"
                  :items="oilEquipmentChartItems"
                  empty-text="No existen equipos con consumo de aceite en este rango."
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
                        <th>Equipo</th>
                        <th>Galones</th>
                        <th>Dif. anterior</th>
                        <th>Bodega</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in oilWorkOrderRows" :key="item.work_order_id">
                        <td>{{ item.fecha_referencia_label }}</td>
                        <td>
                          <div class="font-weight-medium">{{ item.work_order_code }}</div>
                          <div class="text-caption text-medium-emphasis">{{ item.work_order_title }}</div>
                        </td>
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
                        <td colspan="6" class="text-center text-medium-emphasis py-4">
                          No existen órdenes de trabajo con consumo de este aceite en el rango consultado.
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-col>

              <v-col cols="12" lg="4">
                <div class="text-subtitle-2 font-weight-medium mb-2">Agrupado por equipo</div>
                <div class="dashboard-table-shell oil-kpi-table-shell">
                  <v-table density="compact" class="dashboard-mini-table">
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Órdenes</th>
                        <th>Galones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in oilEquipmentRows" :key="item.equipment_id || item.equipment_label">
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

    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" class="pa-5 enterprise-surface h-100">
          <div class="d-flex align-center justify-space-between mb-4 intelligence-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Reporte diario de operacion</div>
              <div class="text-body-2 text-medium-emphasis">Disponibilidad, MPG, combustible y componente por jornada.</div>
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
              <v-chip label color="error" variant="tonal">Componentes: {{ latestDailyReport.componentes?.length ?? 0 }}</v-chip>
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

                <div class="text-subtitle-2 font-weight-medium mb-2">Componentes asociados</div>
                <div class="dashboard-table-shell">
                  <v-table density="compact" class="dashboard-mini-table">
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Componente</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="component in latestDailyComponents" :key="component.id">
                      <td>{{ component.equipo_codigo }}</td>
                      <td>{{ component.tipo_componente }}</td>
                      <td>{{ component.estado || "Sin estado" }}</td>
                    </tr>
                    <tr v-if="!latestDailyComponents.length">
                      <td colspan="3" class="text-center text-medium-emphasis py-3">Sin cambios de componente.</td>
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
    <v-card rounded="xl" class="enterprise-dialog">
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
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { lubricantCompartments } from "@/app/config/lubricant-analysis";
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import {
  buildDailyReportsReport,
  buildIndicatorsReport,
  buildLubricantReport,
  buildProceduresReport,
  buildWeeklyScheduleReport,
  downloadReportExcel,
  downloadReportPdf,
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

type SummaryState = {
  generated_at?: string;
  kpis?: Record<string, number>;
  process_breakdown?: Array<{ tipo_proceso: string; total: number }>;
  recent_events?: AnyRow[];
  component_highlights?: AnyRow[];
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
const oilReferenceDate = ref(new Date().toISOString().slice(0, 10));
const oilCustomFrom = ref("");
const oilCustomTo = ref("");
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
const oilPeriodOptions = dashboardPeriodOptions;

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
  summary.component_highlights = [];
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
      e?.response?.data?.message || "No se pudo cargar el KPI de análisis de aceite.";
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
const oilNeedsReferenceDate = computed(() => oilPeriod.value === "SEMANAL");
const oilCatalogOptions = computed<AnyRow[]>(() =>
  unwrap<AnyRow[]>(oilKpi.value?.catalog, []),
);
const oilWorkOrderRows = computed<AnyRow[]>(() =>
  unwrap<AnyRow[]>(oilKpi.value?.work_orders, []),
);
const oilEquipmentRows = computed<AnyRow[]>(() =>
  unwrap<AnyRow[]>(oilKpi.value?.by_equipment, []),
);
const oilTrendChartItems = computed<DashboardChartItem[]>(() =>
  unwrap<AnyRow[]>(oilKpi.value?.trend, []).map((item: AnyRow) => ({
    key: item.key,
    label: item.label,
    value: Number(item.cantidad || 0),
    valueLabel: `${formatDetailedNumber(item.cantidad)} gal`,
    helper: `${item.total_ordenes ?? 0} OT`,
  })),
);
const oilEquipmentChartItems = computed<DashboardChartItem[]>(() =>
  oilEquipmentRows.value.slice(0, 6).map((item: AnyRow) => ({
    key: item.equipment_id || item.equipment_label,
    label: item.equipment_label || "Sin equipo",
    value: Number(item.total_cantidad || 0),
    valueLabel: `${formatDetailedNumber(item.total_cantidad)} gal`,
    helper: `${item.total_ordenes ?? 0} OT`,
  })),
);

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

function openCard(card: IntelligenceCard) {
  if (card.key === "lubricantes-dashboard") {
    dashboardDialog.value = true;
    return;
  }
  if (!card.routeName) return;
  router.push({ name: card.routeName });
}

async function loadLubricantDashboard(params?: Record<string, any>) {
  lubricantDashboardLoading.value = true;
  lubricantDashboardError.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", {
      params,
    });
    lubricantDashboard.value = unwrap(data, null);
  } catch (e: any) {
    lubricantDashboardError.value =
      e?.response?.data?.message || "No se pudo cargar el dashboard de lubricantes.";
  } finally {
    lubricantDashboardLoading.value = false;
  }
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

const generatedAtLabel = computed(() => {
  if (!summary.generated_at) return "Sin sincronizar";
  return new Date(summary.generated_at).toLocaleString();
});

const breakdownItems = computed(() => summary.process_breakdown ?? []);

const analysesInAlert = computed(
  () => filteredAnalyses.value.filter((item) => String(item.estado_diagnostico || "").toUpperCase() === "ALERTA").length,
);

const kpiCards = computed<IntelligenceCard[]>(() => [
  {
    key: "procedimientos",
    label: "Plantillas MPG",
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
    key: "componentes",
    label: "Componentes criticos",
    value: summary.kpis?.componentes_monitoreados ?? 0,
    helper: "Indicador dinamico desde reporte diario y KPI",
    icon: "mdi-engine-outline",
    accent: "linear-gradient(135deg, rgba(225,122,0,0.18), rgba(255,202,106,0.06))",
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
  {
    key: "componentes",
    label: "Componentes monitoreados",
    value: summary.kpis?.componentes_monitoreados ?? 0,
    helper: "Turbos, inyectores y conjuntos mayores",
  },
]);

const recentEvents = computed(() =>
  (summary.recent_events ?? []).map((item: AnyRow) => ({
    id: item.id,
    title: `${prettifyProcess(item.tipo_proceso)} · ${item.accion}`,
    subtitle: `${item.referencia_codigo || item.referencia_tabla || "Sin referencia"}${item.fecha_evento ? ` · ${new Date(item.fecha_evento).toLocaleString()}` : ""}`,
  })),
);

const recentEventsTableRows = computed(() =>
  (summary.recent_events ?? []).slice(0, 8).map((item: AnyRow) => ({
    id: item.id,
    proceso: prettifyProcess(item.tipo_proceso),
    accion: item.accion || "Sin accion",
    referencia: item.referencia_codigo || item.referencia_tabla || "Sin referencia",
    fecha: item.fecha_evento ? new Date(item.fecha_evento).toLocaleString() : "Sin fecha",
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
const latestDailyComponents = computed(() => (latestDailyReport.value?.componentes ?? []).slice(0, 4));

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
  oilCustomFrom.value = selectedPeriodRange.value.start.toISOString().slice(0, 10);
  oilCustomTo.value = selectedPeriodRange.value.end.toISOString().slice(0, 10);
  oilReferenceDate.value = selectedPeriodRange.value.end.toISOString().slice(0, 10);
  loadIntelligence();
  loadOilKpi();
});

watch([selectedYear, selectedMonth], () => {
  oilCustomFrom.value = selectedPeriodRange.value.start.toISOString().slice(0, 10);
  oilCustomTo.value = selectedPeriodRange.value.end.toISOString().slice(0, 10);
  oilReferenceDate.value = selectedPeriodRange.value.end.toISOString().slice(0, 10);
  loadIntelligence();
  if (oilPeriod.value === "MENSUAL" || oilPeriod.value === "ANUAL") {
    loadOilKpi();
  }
});
</script>

<style scoped>
.intelligence-page {
  display: grid;
  gap: 20px;
}

.intelligence-hero {
  overflow: hidden;
}

.kpi-card {
  border-color: rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    var(--kpi-accent, linear-gradient(135deg, rgba(47,108,171,0.16), rgba(122,184,255,0.05)));
  overflow: hidden;
  position: relative;
}

.kpi-card__value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kpi-card__orb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.12);
}

.intelligence-kpi--clickable {
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.intelligence-kpi--clickable:hover,
.intelligence-kpi--clickable:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(31, 75, 122, 0.35);
  box-shadow: 0 14px 28px rgba(31, 75, 122, 0.12);
  outline: none;
}

.intelligence-wrap {
  gap: 12px;
  flex-wrap: wrap;
}

.intelligence-filter-toolbar {
  gap: 12px;
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
  padding: 14px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-soft);
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.breakdown-chip {
  padding: 14px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-soft);
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dashboard-table-shell {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-soft) 82%, transparent);
}

.dashboard-mini-table {
  background: transparent;
}

.dashboard-mini-table :deep(th) {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--app-muted-text);
  white-space: nowrap;
}

.dashboard-mini-table :deep(td) {
  max-width: 280px;
  vertical-align: top;
}

.dashboard-mini-bars {
  display: grid;
  gap: 10px;
}

.dashboard-mini-bars__row {
  display: grid;
  gap: 6px;
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
  padding: 16px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-soft);
  min-height: 180px;
}

.schedule-item {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--chart-guide);
  background: var(--chart-empty-bg);
  margin-bottom: 10px;
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

.oil-kpi-table-shell {
  max-height: 360px;
  overflow: auto;
}

.h-100 {
  height: 100%;
}

@media (max-width: 960px) {
  .intelligence-page {
    gap: 14px;
  }

  .indicator-grid,
  .breakdown-grid,
  .schedule-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .indicator-tile,
  .breakdown-chip,
  .schedule-day {
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .intelligence-filter-toolbar__select,
  .intelligence-filter-toolbar__select--month {
    min-width: 100%;
  }
}
</style>

<template>
  <div class="programaciones-page">
    <v-card rounded="xl" class="pa-4 enterprise-surface">
      <div class="d-flex align-center justify-space-between page-wrap" style="gap: 12px;">
        <div>
          <div class="text-h6 font-weight-bold">Programaciones</div>
          <div class="text-body-2 text-medium-emphasis">
            Consolida programación mensual MPG, cronograma semanal y agenda operativa.
          </div>
        </div>
        <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loadingAll" @click="loadAll">
          Actualizar
        </v-btn>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <v-tabs v-model="activeTab" class="mt-4" color="primary">
        <v-tab value="mensual">Mensual MPG</v-tab>
        <v-tab value="semanal">Semanal</v-tab>
        <v-tab value="agenda">Agenda</v-tab>
      </v-tabs>
    </v-card>

    <v-window v-model="activeTab" class="mt-4" touchless>
      <v-window-item value="mensual">
        <v-card rounded="xl" class="pa-4 enterprise-surface">
          <div class="d-flex align-center justify-space-between page-wrap mb-4" style="gap: 12px;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Calendario mensual importado</div>
              <div class="text-body-2 text-medium-emphasis">
                Carga el Excel mensual MPG, calcula la hora objetivo y crea o ajusta programaciones desde la matriz.
              </div>
            </div>
            <div class="d-flex align-center flex-wrap" style="gap: 8px;">
              <v-btn variant="tonal" prepend-icon="mdi-plus" @click="openMonthlyProgramacionCreate()">
                Nueva programación
              </v-btn>
              <v-btn
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-calendar-plus"
                :disabled="!selectedMonthlyDetail || !!selectedMonthlyDetail?.programacion_id"
                @click="selectedMonthlyDetail && openCreateFromMonthlyDetail(selectedMonthlyDetail)"
              >
                Crear desde selección
              </v-btn>
              <v-btn
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-pencil"
                :disabled="!selectedMonthlyDetail?.programacion_id"
                @click="selectedMonthlyDetail?.programacion_id && openEditProgramacionById(selectedMonthlyDetail.programacion_id)"
              >
                Editar selección
              </v-btn>
              <v-btn color="primary" prepend-icon="mdi-file-excel" :loading="importingMonthly" @click="importMonthlyWorkbook">
                Cargar mensual
              </v-btn>
            </div>
          </div>

          <v-row dense>
            <v-col cols="12" md="6">
              <v-file-input
                v-model="monthlyImportFile"
                accept=".xlsx,.xls"
                label="Excel mensual MPG"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-file-excel"
                show-size
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedMonthlyId"
                :items="monthlyOptions"
                item-title="title"
                item-value="value"
                label="Calendario importado"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedMonthlyPeriod"
                :items="monthlyPeriodOptions"
                item-title="title"
                item-value="value"
                label="Periodo"
                variant="outlined"
                density="compact"
                clearable
                :disabled="!selectedMonthly"
              />
            </v-col>
          </v-row>

          <div class="summary-strip mt-3">
            <v-chip color="primary" variant="tonal" label>{{ monthlyImports.length }} calendarios</v-chip>
            <v-chip color="secondary" variant="tonal" label>{{ monthlySummary.totalEvents }} eventos</v-chip>
            <v-chip color="success" variant="tonal" label>{{ monthlySummary.syncedEvents }} sincronizados</v-chip>
            <v-chip color="info" variant="tonal" label>{{ monthlySummary.totalEquipments }} equipos</v-chip>
          </div>

          <v-alert
            v-if="monthlyWarnings.length"
            class="mt-4"
            type="warning"
            variant="tonal"
            :text="monthlyWarnings.join(' · ')"
          />

          <div v-if="!selectedMonthly" class="empty-state mt-4">
            <v-icon icon="mdi-calendar-month" size="28" />
            <span>Selecciona un calendario mensual importado para ver la matriz.</span>
          </div>

          <template v-else>
            <div class="text-body-2 text-medium-emphasis mt-4">
              {{ selectedMonthly.codigo }} ·
              {{ selectedMonthly.nombre_archivo || selectedMonthly.documento_origen || "Sin archivo" }}
            </div>

            <div class="matrix-wrap mt-4">
              <table class="matrix-table matrix-table--monthly">
                <thead>
                  <tr>
                    <th class="matrix-table__sticky">Equipo</th>
                    <th class="matrix-table__sticky-2">Nombre</th>
                    <th>Hor. último</th>
                    <th>Hor. actual</th>
                    <th v-for="day in monthlyDays" :key="`day-${day.key}`">
                      <div>{{ day.day }}</div>
                      <div class="text-caption text-medium-emphasis">{{ day.label }}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in monthlyMatrixRows" :key="row.key">
                    <td class="matrix-table__sticky font-weight-bold">{{ row.equipo_codigo }}</td>
                    <td class="matrix-table__sticky-2">{{ row.equipo_nombre || "Sin nombre" }}</td>
                    <td>{{ row.horometro_ultimo ?? "N/D" }}</td>
                    <td>{{ row.horometro_actual ?? "N/D" }}</td>
                    <td v-for="day in monthlyDays" :key="`${row.key}-${day.key}`" class="monthly-day-cell">
                      <div v-if="row.cells[day.date]?.length" class="matrix-cell">
                        <button
                          v-for="item in row.cells[day.date]"
                          :key="item.id"
                          type="button"
                          class="matrix-chip-button"
                          @click="selectMonthlyDetail(item)"
                        >
                          <v-chip
                            size="x-small"
                            :color="monthlyCellColor(item)"
                            variant="tonal"
                            class="mb-1"
                          >
                            {{ item.valor_crudo }}
                          </v-chip>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <v-data-table
              class="enterprise-table mt-5"
              :headers="monthlyDetailHeaders"
              :items="monthlyFilteredDetails"
              :items-per-page="12"
              @click:row="onMonthlyRowClick"
            >
              <template #item.equipo_codigo="{ item }">
                <div class="font-weight-medium">{{ (item as any).equipo_codigo }}</div>
                <div class="text-caption text-medium-emphasis">{{ (item as any).equipo_nombre || "Sin nombre" }}</div>
              </template>
              <template #item.valor_crudo="{ item }">
                <div class="d-flex flex-column" style="gap: 4px;">
                  <v-chip size="small" :color="monthlyCellColor(item as any)" variant="tonal">
                    {{ (item as any).valor_crudo }}
                  </v-chip>
                  <span class="text-caption text-medium-emphasis">
                    Hora objetivo: {{ (item as any).payload_json?.horometro_programado ?? "N/D" }}
                  </span>
                </div>
              </template>
              <template #item.programacion_id="{ item }">
                <v-chip size="small" :color="(item as any).programacion_id ? 'success' : 'secondary'" variant="tonal">
                  {{ (item as any).programacion_id ? "Sincronizado" : "Solo reporte" }}
                </v-chip>
              </template>
              <template #item.actions="{ item }">
                <div class="d-flex" style="gap: 4px;">
                  <v-btn
                    v-if="!(item as any).programacion_id"
                    icon="mdi-calendar-plus"
                    variant="text"
                    color="secondary"
                    @click.stop="openCreateFromMonthlyDetail(item as any)"
                  />
                  <v-btn
                    v-else
                    icon="mdi-pencil"
                    variant="text"
                    color="primary"
                    @click.stop="openEditProgramacionById((item as any).programacion_id)"
                  />
                </div>
              </template>
            </v-data-table>
          </template>
        </v-card>
      </v-window-item>

      <v-window-item value="semanal">
        <v-card rounded="xl" class="pa-4 enterprise-surface">
          <div class="d-flex align-center justify-space-between page-wrap mb-4" style="gap: 12px;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Cronograma semanal</div>
              <div class="text-body-2 text-medium-emphasis">
                Carga el Excel semanal o arma la programación en una parrilla editable por día y bloque horario.
              </div>
            </div>
            <div class="d-flex align-center flex-wrap" style="gap: 8px;">
              <v-btn variant="tonal" prepend-icon="mdi-plus" @click="openWeeklyEditorCreate()">
                Nuevo semanal
              </v-btn>
              <v-btn
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-pencil"
                :disabled="!selectedWeekly"
                @click="selectedWeekly && openWeeklyEditorEdit(selectedWeekly)"
              >
                Editar semanal
              </v-btn>
              <v-btn color="primary" prepend-icon="mdi-file-excel" :loading="importingWeekly" @click="importWeeklyWorkbook">
                Cargar semanal
              </v-btn>
            </div>
          </div>

          <v-row dense>
            <v-col cols="12" md="4">
              <v-file-input
                v-model="weeklyImportFile"
                accept=".xlsx,.xls"
                label="Excel cronograma semanal"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-calendar-week"
                show-size
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="selectedWeeklyId"
                :items="weeklyOptions"
                item-title="title"
                item-value="value"
                label="Cronograma semanal"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="weeklyPlannerAnchorDate"
                type="date"
                label="Semana a programar"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
            </v-col>
          </v-row>

          <div class="summary-strip mt-3">
            <v-chip color="primary" variant="tonal" label>{{ weeklySchedules.length }} cronogramas</v-chip>
            <v-chip v-for="day in weeklyDailyHours" :key="day.date" color="secondary" variant="tonal" label>
              {{ day.label }}: {{ day.hours.toFixed(2) }} h
            </v-chip>
          </div>

          <v-alert
            v-if="weeklyWarnings.length"
            class="mt-4"
            type="warning"
            variant="tonal"
            :text="weeklyWarnings.join(' · ')"
          />

          <div v-if="!selectedWeekly" class="empty-state mt-4">
            <v-icon icon="mdi-calendar-week" size="28" />
            <span>Selecciona un cronograma semanal para ver su reporte.</span>
          </div>

          <template v-else>
            <div class="text-body-2 text-medium-emphasis mt-4">
              {{ selectedWeekly.codigo }} · {{ selectedWeekly.fecha_inicio }} / {{ selectedWeekly.fecha_fin }}
            </div>

            <div class="matrix-wrap mt-4">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th class="matrix-table__sticky">Hora</th>
                    <th v-for="day in weeklyDays" :key="day.date">
                      <div>{{ day.title }}</div>
                      <div class="text-caption text-medium-emphasis">{{ day.date }}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="slot in weeklyTimeSlots" :key="slot.key">
                    <td class="matrix-table__sticky font-weight-bold">{{ slot.label }}</td>
                    <td v-for="day in weeklyDays" :key="`${slot.key}-${day.date}`">
                      <div v-if="weeklyGrid[slot.key]?.[day.date]?.length" class="matrix-cell matrix-cell--weekly">
                        <div v-for="item in getWeeklyItems(slot.key, day.date)" :key="item.id" class="weekly-activity">
                          <div class="weekly-activity__title">{{ item.actividad }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ item.tipo_proceso || "OPERACION" }}
                            <span v-if="item.equipo_codigo"> · {{ item.equipo_codigo }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <v-data-table class="enterprise-table mt-5" :headers="weeklyDetailHeaders" :items="selectedWeekly.detalles || []" :items-per-page="12" />
          </template>
        </v-card>
      </v-window-item>

      <v-window-item value="agenda">
        <v-card rounded="xl" class="pa-4 enterprise-surface">
          <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
            <div>
              <div class="text-h6 font-weight-bold">Agenda de programaciones</div>
              <div class="text-body-2 text-medium-emphasis">
                Programa manualmente mantenimientos y controla vencimientos por fecha u horas.
              </div>
            </div>
            <div class="d-flex align-center" style="gap: 8px;">
              <v-btn icon="mdi-chevron-left" variant="text" @click="changeMonth(-1)" />
              <div class="text-subtitle-1 font-weight-bold" style="min-width: 220px; text-align: center;">
                {{ monthLabel }}
              </div>
              <v-btn icon="mdi-chevron-right" variant="text" @click="changeMonth(1)" />
            </div>
          </div>

          <div class="calendar-grid mb-4">
            <div v-for="day in weekDays" :key="day" class="calendar-weekday">{{ day }}</div>
            <div
              v-for="cell in monthCells"
              :key="cell.key"
              class="calendar-cell"
              :class="{ 'calendar-cell--muted': !cell.inCurrentMonth, 'calendar-cell--today': cell.isToday }"
              @click="openCreateForDate(cell.date)"
            >
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-caption font-weight-bold">{{ cell.day }}</span>
                <v-chip v-if="eventsByDate[cell.date]?.length" size="x-small" color="primary" variant="tonal">
                  {{ eventsByDate[cell.date]?.length ?? 0 }}
                </v-chip>
              </div>
              <div class="calendar-events">
                <button
                  v-for="event in (eventsByDate[cell.date] || []).slice(0, 3)"
                  :key="event.id"
                  class="calendar-event"
                  :class="eventClass(event.estado_programacion)"
                  @click.stop="openEdit(event)"
                >
                  {{ event.equipo_nombre }} - {{ displayProgramacionName(event) }}
                </button>
                <div v-if="(eventsByDate[cell.date] || []).length > 3" class="text-caption text-medium-emphasis mt-1">
                  +{{ (eventsByDate[cell.date]?.length ?? 0) - 3 }} más
                </div>
              </div>
            </div>
          </div>

          <v-divider class="mb-3" />

          <v-data-table :headers="agendaHeaders" :items="agendaRows" :loading="agendaLoading" :items-per-page="10" class="elevation-0 enterprise-table">
            <template #item.procedimiento_nombre="{ item }">
              <div class="font-weight-medium">{{ displayProgramacionName(item as any) }}</div>
              <div class="text-caption text-medium-emphasis">{{ (item as any).plan_codigo || (item as any).plan_nombre || "Plan interno" }}</div>
            </template>
            <template #item.estado_programacion="{ item }">
              <v-chip size="small" :color="chipColor((item as any).estado_programacion)" variant="tonal">
                {{ (item as any).estado_programacion }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex" style="gap: 4px;">
                <v-btn icon="mdi-pencil" variant="text" @click="openEdit(item as any)" />
                <v-btn icon="mdi-delete" variant="text" color="error" @click="remove(item as any)" />
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <v-dialog v-model="dialog" :fullscreen="isDialogFullscreen" :max-width="isDialogFullscreen ? undefined : 760">
      <v-card rounded="xl">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ editingId ? "Editar programación" : "Nueva programación" }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.proxima_fecha" type="date" label="Fecha programada" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-checkbox v-model="form.activo" label="Activo" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.equipo_id" :items="equipmentOptions" item-title="title" item-value="value" label="Equipo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.procedimiento_id"
                :items="procedureOptions"
                item-title="title"
                item-value="value"
                label="Plantilla MPG"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-alert type="info" variant="tonal" text="El sistema sincroniza automáticamente un plan interno desde la plantilla MPG seleccionada." />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="resolvedPlanLabel" label="Plan operativo generado" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="selectedProcedureFrequency" label="Frecuencia de plantilla" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.ultima_ejecucion_fecha" type="date" label="Última ejecución fecha" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.ultima_ejecucion_horas" type="number" step="0.01" label="Última ejecución horas" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.proxima_horas" type="number" step="0.01" label="Hora objetivo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="programacionSourceMode" label="Modo de programación" variant="outlined" readonly />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="weeklyEditorDialog" :fullscreen="isWeeklyEditorFullscreen" :max-width="isWeeklyEditorFullscreen ? undefined : 1480">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between flex-wrap" style="gap: 12px;">
          <span class="text-subtitle-1 font-weight-bold">
            {{ weeklyEditor.id ? "Editar cronograma semanal" : "Nuevo cronograma semanal" }}
          </span>
          <div class="d-flex align-center flex-wrap" style="gap: 8px;">
            <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addWeeklySlot()">
              Agregar hora
            </v-btn>
            <v-btn color="primary" :loading="savingWeekly" @click="saveWeeklyEditor">
              Guardar cronograma
            </v-btn>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="3">
              <v-text-field v-model="weeklyEditor.codigo" label="Código" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="weeklyEditorAnchorDate"
                type="date"
                label="Semana a programar"
                variant="outlined"
                @update:model-value="handleWeeklyAnchorChange"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="weeklyEditor.fecha_inicio" label="Inicio de semana" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="weeklyEditor.fecha_fin" label="Fin de semana" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="weeklyEditor.locacion" label="Locación" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="weeklyEditor.referencia_orden" label="Referencia de orden" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="weeklyEditor.resumen" label="Resumen" variant="outlined" />
            </v-col>
          </v-row>

          <div class="matrix-wrap mt-4">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="matrix-table__sticky">Hora editable</th>
                  <th v-for="day in weeklyEditorDays" :key="`editor-${day.date}`">
                    <div>{{ day.title }}</div>
                    <div class="text-caption text-medium-emphasis">{{ day.date }}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="slot in weeklyEditorSlots" :key="slot.key">
                  <td class="matrix-table__sticky">
                    <div class="slot-editor">
                      <v-text-field
                        :model-value="slot.hora_inicio"
                        type="time"
                        density="compact"
                        variant="outlined"
                        hide-details
                        label="Inicio"
                        @update:model-value="updateWeeklySlot(slot.key, 'hora_inicio', String($event || ''))"
                      />
                      <v-text-field
                        :model-value="slot.hora_fin"
                        type="time"
                        density="compact"
                        variant="outlined"
                        hide-details
                        label="Fin"
                        @update:model-value="updateWeeklySlot(slot.key, 'hora_fin', String($event || ''))"
                      />
                      <v-btn icon="mdi-delete" variant="text" color="error" @click="removeWeeklySlot(slot.key)" />
                    </div>
                  </td>
                  <td v-for="day in weeklyEditorDays" :key="`${slot.key}-${day.date}`">
                    <div class="matrix-cell matrix-cell--weekly">
                      <button type="button" class="weekly-add-button" @click="openWeeklyCell(slot.key, day.date)">
                        <v-icon icon="mdi-plus" size="16" />
                        <span>Agregar</span>
                      </button>
                      <div
                        v-for="item in getWeeklyEditorItems(slot.key, day.date)"
                        :key="item.local_id"
                        class="weekly-activity weekly-activity--editable"
                      >
                        <div class="d-flex align-start justify-space-between" style="gap: 8px;">
                          <div>
                            <div class="weekly-activity__title">{{ item.actividad }}</div>
                            <div class="text-caption text-medium-emphasis">
                              {{ item.tipo_proceso || "OPERACION" }}
                              <span v-if="item.equipo_codigo"> · {{ item.equipo_codigo }}</span>
                            </div>
                          </div>
                          <div class="d-flex" style="gap: 2px;">
                            <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="openWeeklyCell(slot.key, day.date, item)" />
                            <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeWeeklyItem(item.local_id)" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="weeklyCellDialog" :fullscreen="isWeeklyCellFullscreen" :max-width="isWeeklyCellFullscreen ? undefined : 620">
      <v-card rounded="xl">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ weeklyCell.local_id ? "Editar actividad semanal" : "Nueva actividad semanal" }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field :model-value="weeklyCell.fecha_actividad" label="Fecha" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="weeklyCellSlotLabel" label="Bloque horario" variant="outlined" readonly />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="weeklyCell.actividad" label="Actividad" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="weeklyCell.tipo_proceso" :items="weeklyProcessOptions" label="Tipo de proceso" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="weeklyCell.equipo_codigo" label="Equipo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="weeklyCell.responsable_area" label="Área responsable" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="weeklyCell.dia_semana" label="Día" variant="outlined" readonly />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="weeklyCell.observacion" rows="3" label="Observación" variant="outlined" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="weeklyCellDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveWeeklyCell">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";

const ui = useUiStore();
const { mdAndDown, smAndDown } = useDisplay();

const activeTab = ref("mensual");
const loadingAll = ref(false);
const agendaLoading = ref(false);
const saving = ref(false);
const savingWeekly = ref(false);
const importingMonthly = ref(false);
const importingWeekly = ref(false);
const error = ref<string | null>(null);

const agendaRows = ref<any[]>([]);
const monthlyImports = ref<any[]>([]);
const weeklySchedules = ref<any[]>([]);
const selectedMonthly = ref<any | null>(null);
const selectedWeekly = ref<any | null>(null);
const selectedMonthlyId = ref<string | null>(null);
const selectedWeeklyId = ref<string | null>(null);
const selectedMonthlyPeriod = ref<string | null>(null);
const selectedMonthlyDetail = ref<any | null>(null);
const monthlyImportFile = ref<File | null>(null);
const weeklyImportFile = ref<File | null>(null);
const monthlyWarnings = ref<string[]>([]);
const weeklyWarnings = ref<string[]>([]);
const weeklyPlannerAnchorDate = ref(formatDate(new Date()));
const isDialogFullscreen = computed(() => mdAndDown.value);
const isWeeklyEditorFullscreen = computed(() => mdAndDown.value);
const isWeeklyCellFullscreen = computed(() => smAndDown.value);

const dialog = ref(false);
const editingId = ref<string | null>(null);
const programacionSourceMode = ref<"DINAMICA" | "CALENDARIO">("DINAMICA");
const programacionSourceOrigin = ref("MANUAL");
const programacionSourcePayload = ref<Record<string, unknown>>({});
const programacionSourceDocument = ref<string | null>(null);
const equipmentOptions = ref<any[]>([]);
const procedureOptions = ref<any[]>([]);
const procedureCatalog = ref<any[]>([]);
const currentMonth = ref(new Date());

const weeklyEditorDialog = ref(false);
const weeklyCellDialog = ref(false);
const weeklyEditorAnchorDate = ref(formatDate(new Date()));
const weeklyProcessOptions = ["OPERACION", "MPG", "SSA", "MIXTO"];
const weeklyEditor = reactive<any>({
  id: null,
  codigo: "",
  fecha_inicio: "",
  fecha_fin: "",
  locacion: "TPTA",
  referencia_orden: "",
  resumen: "",
  documento_origen: "MANUAL",
});
const weeklyEditorSlots = ref<Array<{ key: string; hora_inicio: string; hora_fin: string }>>([]);
const weeklyEditorItems = ref<any[]>([]);
const weeklyCell = reactive<any>({
  local_id: "",
  slot_key: "",
  fecha_actividad: "",
  dia_semana: "",
  actividad: "",
  tipo_proceso: "OPERACION",
  responsable_area: "",
  equipo_codigo: "",
  observacion: "",
});

const form = reactive<any>({
  equipo_id: "",
  procedimiento_id: "",
  plan_id: "",
  ultima_ejecucion_fecha: "",
  ultima_ejecucion_horas: "",
  proxima_fecha: "",
  proxima_horas: "",
  activo: true,
});

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const agendaHeaders = [
  { title: "Equipo", key: "equipo_nombre" },
  { title: "Plantilla MPG", key: "procedimiento_nombre" },
  { title: "Fecha", key: "proxima_fecha" },
  { title: "Modo", key: "modo_programacion" },
  { title: "Estado", key: "estado_programacion" },
  { title: "Acciones", key: "actions", sortable: false },
];
const monthlyDetailHeaders = [
  { title: "Fecha", key: "fecha_programada" },
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Actividad", key: "valor_crudo" },
  { title: "Tipo", key: "tipo_mantenimiento" },
  { title: "Plan", key: "plan_id" },
  { title: "Estado", key: "programacion_id" },
  { title: "Acciones", key: "actions", sortable: false },
];
const weeklyDetailHeaders = [
  { title: "Día", key: "dia_semana" },
  { title: "Fecha", key: "fecha_actividad" },
  { title: "Hora inicio", key: "hora_inicio" },
  { title: "Hora fin", key: "hora_fin" },
  { title: "Tipo", key: "tipo_proceso" },
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Actividad", key: "actividad" },
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfCalendarMonth(source: Date) {
  const date = new Date(source.getFullYear(), source.getMonth(), 1);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

function normalizeTimeInput(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
}

function formatTimeLabel(start?: string | null, end?: string | null) {
  const from = String(start || "").slice(0, 5);
  const to = String(end || "").slice(0, 5);
  if (!from && !to) return "Sin hora";
  return `${from || "--:--"} - ${to || "--:--"}`;
}

function getWeekRangeFromDate(value: string) {
  const base = new Date(`${value}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return getWeekRangeFromDate(formatDate(new Date()));
  }
  const day = (base.getDay() + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function listAll(endpoint: string) {
  const out: any[] = [];
  const limit = 100;
  for (let page = 1; page <= 100; page += 1) {
    const { data } = await api.get(endpoint, { params: { page, limit } });
    const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    out.push(...rows);
    if (rows.length < limit) break;
  }
  return out;
}

function normalize(item: any) {
  const label = item?.nombre ?? item?.title ?? item?.codigo ?? item?.id;
  return { value: item.id, title: `${item?.codigo ? `${item.codigo} - ` : ""}${label}` };
}

async function loadCatalogs() {
  const [equipos, procedimientos] = await Promise.all([
    listAll("/kpi_maintenance/equipos"),
    listAll("/kpi_maintenance/inteligencia/procedimientos"),
  ]);
  equipmentOptions.value = equipos.map(normalize);
  procedureCatalog.value = procedimientos;
  procedureOptions.value = procedimientos.map(normalize);
}

async function loadAgendaRows() {
  agendaLoading.value = true;
  try {
    const { data } = await api.get("/kpi_maintenance/programaciones");
    agendaRows.value = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  } finally {
    agendaLoading.value = false;
  }
}

async function loadMonthlyImports() {
  const { data } = await api.get("/kpi_maintenance/programaciones/mensuales");
  monthlyImports.value = Array.isArray(data?.data) ? data.data : [];
  if (!selectedMonthlyId.value && monthlyImports.value.length) {
    selectedMonthlyId.value = monthlyImports.value[0]?.id ?? null;
  }
}

async function loadWeeklySchedules() {
  const { data } = await api.get("/kpi_maintenance/inteligencia/cronogramas-semanales");
  weeklySchedules.value = Array.isArray(data?.data) ? data.data : [];
  if (!selectedWeeklyId.value && weeklySchedules.value.length) {
    selectedWeeklyId.value = weeklySchedules.value[0]?.id ?? null;
  }
}

async function loadAll() {
  loadingAll.value = true;
  error.value = null;
  try {
    await Promise.all([loadCatalogs(), loadAgendaRows(), loadMonthlyImports(), loadWeeklySchedules()]);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar el módulo de programaciones.";
  } finally {
    loadingAll.value = false;
  }
}

async function loadSelectedMonthly(id: string | null) {
  selectedMonthly.value = null;
  selectedMonthlyDetail.value = null;
  monthlyWarnings.value = [];
  if (!id) return;
  try {
    const { data } = await api.get(`/kpi_maintenance/programaciones/mensuales/${id}`);
    selectedMonthly.value = data?.data ?? null;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo cargar el calendario mensual.");
  }
}

async function loadSelectedWeekly(id: string | null) {
  selectedWeekly.value = null;
  weeklyWarnings.value = [];
  if (!id) return;
  try {
    const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${id}`);
    selectedWeekly.value = data?.data ?? null;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo cargar el cronograma semanal.");
  }
}

watch(selectedMonthlyId, async (value) => {
  await loadSelectedMonthly(value);
});

watch(selectedWeeklyId, async (value) => {
  await loadSelectedWeekly(value);
});

watch(
  () => selectedMonthly.value?.periodos,
  (periods) => {
    const current = selectedMonthlyPeriod.value;
    const available = Array.isArray(periods) ? periods.map((item: any) => item.period) : [];
    if (current && available.includes(current)) return;
    selectedMonthlyPeriod.value = available[available.length - 1] ?? null;
  },
  { immediate: true },
);

const monthlyOptions = computed(() =>
  monthlyImports.value.map((item) => ({
    value: item.id,
    title: `${item.codigo || "Sin código"} · ${item.nombre_archivo || item.documento_origen || "Sin archivo"}`,
  })),
);

const weeklyOptions = computed(() =>
  weeklySchedules.value.map((item) => ({
    value: item.id,
    title: `${item.codigo || "Sin código"} · ${item.fecha_inicio || ""} / ${item.fecha_fin || ""}`,
  })),
);

const monthlyPeriodOptions = computed(() =>
  Array.isArray(selectedMonthly.value?.periodos)
    ? selectedMonthly.value.periodos.map((item: any) => ({
        value: item.period,
        title: `${item.label || item.period} (${item.total})`,
      }))
    : [],
);

const monthlyFilteredDetails = computed(() => {
  const details = Array.isArray(selectedMonthly.value?.detalles) ? selectedMonthly.value.detalles : [];
  if (!selectedMonthlyPeriod.value) return details;
  return details.filter((item: any) => String(item.fecha_programada || "").startsWith(selectedMonthlyPeriod.value || ""));
});

const monthlyDays = computed(() => {
  if (!selectedMonthlyPeriod.value) return [];
  const [year, month] = String(selectedMonthlyPeriod.value).split("-").map(Number);
  if (!year || !month) return [];
  const lastDay = new Date(year, month, 0).getDate();
  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = `${selectedMonthlyPeriod.value}-${String(day).padStart(2, "0")}`;
    const label = new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "short" });
    return { key: date, date, day, label };
  });
});

const monthlyMatrixRows = computed(() => {
  const rows = new Map<string, any>();
  for (const item of monthlyFilteredDetails.value) {
    const key = String(item.equipo_id || item.equipo_codigo || item.id);
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        equipo_codigo: item.equipo_codigo,
        equipo_nombre: item.equipo_nombre,
        horometro_ultimo: item.payload_json?.horometro_ultimo ?? null,
        horometro_actual: item.payload_json?.horometro_actual ?? null,
        cells: {} as Record<string, any[]>,
      });
    }
    const row = rows.get(key);
    row.horometro_ultimo ??= item.payload_json?.horometro_ultimo ?? null;
    row.horometro_actual ??= item.payload_json?.horometro_actual ?? null;
    row.cells[item.fecha_programada] = row.cells[item.fecha_programada] || [];
    row.cells[item.fecha_programada].push(item);
  }
  return [...rows.values()].sort((a, b) =>
    String(a.equipo_codigo || "").localeCompare(String(b.equipo_codigo || "")),
  );
});

const monthlySummary = computed(() => {
  const details = monthlyFilteredDetails.value;
  return {
    totalEvents: details.length,
    syncedEvents: details.filter((item: any) => Boolean(item.programacion_id)).length,
    totalEquipments: new Set(details.map((item: any) => String(item.equipo_codigo || item.equipo_id || ""))).size,
  };
});

const weeklyDays = computed(() => {
  if (!selectedWeekly.value?.fecha_inicio || !selectedWeekly.value?.fecha_fin) return [];
  const start = new Date(`${selectedWeekly.value.fecha_inicio}T00:00:00`);
  const end = new Date(`${selectedWeekly.value.fecha_fin}T00:00:00`);
  const days: Array<{ date: string; title: string }> = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = formatDate(cursor);
    days.push({
      date,
      title: cursor.toLocaleDateString("es-EC", { weekday: "long" }).replace(/^\w/, (m) => m.toUpperCase()),
    });
  }
  return days;
});

const weeklyTimeSlots = computed(() => {
  const slots = Array.isArray(selectedWeekly.value?.time_slots) ? selectedWeekly.value.time_slots : [];
  if (slots.length) return slots;
  const details = Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles : [];
  return [...new Set(details.map((item: any) => `${item.hora_inicio || ""}-${item.hora_fin || ""}`))]
    .filter(Boolean)
    .map((key) => {
      const slotKey = String(key);
      const [hora_inicio = "", hora_fin = ""] = slotKey.split("-");
      return { key: slotKey, label: `${hora_inicio.slice(0, 5)} - ${hora_fin.slice(0, 5)}` };
    });
});

const weeklyGrid = computed(() => {
  const grid: Record<string, Record<string, any[]>> = {};
  const details = Array.isArray(selectedWeekly.value?.detalles) ? selectedWeekly.value.detalles : [];
  for (const item of details) {
    const slotKey = `${item.hora_inicio || ""}-${item.hora_fin || ""}`;
    const dateKey = String(item.fecha_actividad || "");
    if (!grid[slotKey]) grid[slotKey] = {};
    if (!grid[slotKey][dateKey]) grid[slotKey][dateKey] = [];
    grid[slotKey][dateKey].push(item);
  }
  return grid;
});

const weeklyDailyHours = computed(() => {
  const source = selectedWeekly.value?.daily_hours || {};
  return Object.entries(source).map(([date, hours]) => ({
    date,
    hours: Number(hours || 0),
    label: new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "short", day: "2-digit" }),
  }));
});

const weeklyEditorDays = computed(() => {
  if (!weeklyEditor.fecha_inicio || !weeklyEditor.fecha_fin) return [];
  const start = new Date(`${weeklyEditor.fecha_inicio}T00:00:00`);
  const end = new Date(`${weeklyEditor.fecha_fin}T00:00:00`);
  const days: Array<{ date: string; title: string }> = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    days.push({
      date: formatDate(cursor),
      title: cursor.toLocaleDateString("es-EC", { weekday: "long" }).replace(/^\w/, (m) => m.toUpperCase()),
    });
  }
  return days;
});

const weeklyCellSlotLabel = computed(() => {
  const slot = weeklyEditorSlots.value.find((item) => item.key === weeklyCell.slot_key);
  return formatTimeLabel(slot?.hora_inicio, slot?.hora_fin);
});

const monthLabel = computed(() =>
  currentMonth.value.toLocaleDateString("es-EC", { month: "long", year: "numeric" }),
);

const monthCells = computed(() => {
  const start = startOfCalendarMonth(currentMonth.value);
  const out: Array<{ key: string; date: string; day: number; inCurrentMonth: boolean; isToday: boolean }> = [];
  const today = formatDate(new Date());
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    out.push({
      key: `${date.toISOString()}-${i}`,
      date: formatDate(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: formatDate(date) === today,
    });
  }
  return out;
});

const eventsByDate = computed(() =>
  agendaRows.value.reduce((acc: Record<string, any[]>, row) => {
    const key = row?.proxima_fecha;
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {}),
);

function chipColor(status: string) {
  if (status === "VENCIDA") return "error";
  if (status === "PROXIMA") return "warning";
  return "primary";
}

function eventClass(status: string) {
  if (status === "VENCIDA") return "calendar-event--danger";
  if (status === "PROXIMA") return "calendar-event--warning";
  return "calendar-event--normal";
}

function monthlyCellColor(item: any) {
  if (item?.programacion_id) return "success";
  if (String(item?.tipo_mantenimiento || "").toUpperCase() === "MPG") return "primary";
  if (String(item?.tipo_mantenimiento || "").toUpperCase() === "HORAS_PROGRAMADAS") return "info";
  return "secondary";
}

function getWeeklyItems(slotKey: string, date: string) {
  return weeklyGrid.value[slotKey]?.[date] || [];
}

function displayProgramacionName(item: any) {
  return item?.procedimiento_nombre || item?.plan_nombre || "Sin plantilla";
}

const selectedProcedure = computed(() =>
  procedureCatalog.value.find((item) => String(item.id) === String(form.procedimiento_id || "")) ?? null,
);

const resolvedPlanLabel = computed(() => {
  if (form.plan_id) return form.plan_id;
  if (!selectedProcedure.value) return "Se generará al guardar";
  return `Sincronizado desde ${selectedProcedure.value.codigo || selectedProcedure.value.nombre || "plantilla MPG"}`;
});

const selectedProcedureFrequency = computed(() => {
  const frequency = Number(selectedProcedure.value?.frecuencia_horas || 0);
  return frequency > 0 ? `${frequency} horas` : "Según configuración de plantilla";
});

function resetForm() {
  editingId.value = null;
  programacionSourceMode.value = "DINAMICA";
  programacionSourceOrigin.value = "MANUAL";
  programacionSourcePayload.value = {};
  programacionSourceDocument.value = null;
  form.equipo_id = "";
  form.procedimiento_id = "";
  form.plan_id = "";
  form.ultima_ejecucion_fecha = "";
  form.ultima_ejecucion_horas = "";
  form.proxima_fecha = "";
  form.proxima_horas = "";
  form.activo = true;
}

function openCreateForDate(date: string) {
  resetForm();
  form.proxima_fecha = date;
  programacionSourceMode.value = "DINAMICA";
  programacionSourceOrigin.value = "MANUAL";
  dialog.value = true;
}

function openMonthlyProgramacionCreate() {
  resetForm();
  form.proxima_fecha = selectedMonthlyPeriod.value ? `${selectedMonthlyPeriod.value}-01` : formatDate(new Date());
  programacionSourceMode.value = "CALENDARIO";
  programacionSourceOrigin.value = "MENSUAL_MANUAL";
  dialog.value = true;
}

function selectMonthlyDetail(item: any) {
  selectedMonthlyDetail.value = item;
}

function onMonthlyRowClick(_event: unknown, row: any) {
  selectedMonthlyDetail.value = row?.item ?? row;
}

function openCreateFromMonthlyDetail(item: any) {
  if (!item) return;
  resetForm();
  form.equipo_id = item.equipo_id || "";
  form.procedimiento_id = item.procedimiento_id || "";
  form.plan_id = item.plan_id || "";
  form.proxima_fecha = item.fecha_programada || "";
  form.ultima_ejecucion_horas = item.payload_json?.horometro_ultimo ?? "";
  form.proxima_horas = item.payload_json?.horometro_programado ?? "";
  programacionSourceMode.value = "CALENDARIO";
  programacionSourceOrigin.value = "MENSUAL_IMPORT";
  programacionSourceDocument.value = selectedMonthly.value?.documento_origen || null;
  programacionSourcePayload.value = {
    programacion_mensual_id: item.programacion_mensual_id,
    programacion_mensual_codigo: selectedMonthly.value?.codigo || null,
    valor_crudo: item.valor_crudo,
    valor_normalizado: item.valor_normalizado,
    tipo_mantenimiento: item.tipo_mantenimiento,
    frecuencia_horas: item.frecuencia_horas,
    horometro_ultimo: item.payload_json?.horometro_ultimo ?? null,
    horometro_actual: item.payload_json?.horometro_actual ?? null,
    horometro_programado: item.payload_json?.horometro_programado ?? null,
  };
  dialog.value = true;
}

function openEdit(item: any) {
  editingId.value = item.id;
  programacionSourceMode.value = String(item.modo_programacion || "DINAMICA").toUpperCase() === "CALENDARIO" ? "CALENDARIO" : "DINAMICA";
  programacionSourceOrigin.value = String(item.origen_programacion || "MANUAL");
  programacionSourcePayload.value = item.payload_json || {};
  programacionSourceDocument.value = item.documento_origen || null;
  form.equipo_id = item.equipo_id || "";
  form.procedimiento_id = item.procedimiento_id || "";
  form.plan_id = item.plan_id || "";
  form.ultima_ejecucion_fecha = item.ultima_ejecucion_fecha || "";
  form.ultima_ejecucion_horas = item.ultima_ejecucion_horas ?? "";
  form.proxima_fecha = item.proxima_fecha || "";
  form.proxima_horas = item.proxima_horas ?? "";
  form.activo = item.activo !== false;
  dialog.value = true;
}

async function openEditProgramacionById(id: string) {
  try {
    const { data } = await api.get(`/kpi_maintenance/programaciones/${id}`);
    openEdit(data?.data ?? data);
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo cargar la programación seleccionada.");
  }
}

function buildPayload() {
  return {
    equipo_id: form.equipo_id,
    procedimiento_id: form.procedimiento_id || undefined,
    plan_id: form.plan_id || undefined,
    ultima_ejecucion_fecha: form.ultima_ejecucion_fecha || undefined,
    ultima_ejecucion_horas: form.ultima_ejecucion_horas !== "" ? Number(form.ultima_ejecucion_horas) : undefined,
    proxima_fecha: form.proxima_fecha || undefined,
    proxima_horas: form.proxima_horas !== "" ? Number(form.proxima_horas) : undefined,
    modo_programacion: programacionSourceMode.value,
    origen_programacion: programacionSourceOrigin.value,
    documento_origen: programacionSourceDocument.value || undefined,
    payload_json: Object.keys(programacionSourcePayload.value || {}).length ? programacionSourcePayload.value : undefined,
    activo: !!form.activo,
  };
}

function resolveSingleFile(value: File | File[] | null) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function save() {
  if (!form.equipo_id || (!form.procedimiento_id && !form.plan_id)) {
    ui.error("Debes seleccionar equipo y plantilla MPG o plan operativo.");
    return;
  }
  saving.value = true;
  try {
    let saved: any = null;
    if (editingId.value) {
      const { data } = await api.patch(`/kpi_maintenance/programaciones/${editingId.value}`, buildPayload());
      saved = data?.data ?? data;
      ui.success("Programación actualizada.");
    } else {
      const { data } = await api.post("/kpi_maintenance/programaciones", buildPayload());
      saved = data?.data ?? data;
      ui.success("Programación creada.");
    }

    form.plan_id = saved?.plan_id || form.plan_id;
    dialog.value = false;
    await Promise.all([loadAgendaRows(), selectedMonthlyId.value ? loadSelectedMonthly(selectedMonthlyId.value) : Promise.resolve()]);
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar la programación.");
  } finally {
    saving.value = false;
  }
}

async function remove(item: any) {
  try {
    await api.delete(`/kpi_maintenance/programaciones/${item.id}`);
    ui.success("Programación eliminada.");
    await Promise.all([loadAgendaRows(), selectedMonthlyId.value ? loadSelectedMonthly(selectedMonthlyId.value) : Promise.resolve()]);
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar la programación.");
  }
}

async function importMonthlyWorkbook() {
  const file = resolveSingleFile(monthlyImportFile.value as File | File[] | null);
  if (!file) {
    ui.error("Selecciona el archivo Excel mensual.");
    return;
  }
  importingMonthly.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/kpi_maintenance/programaciones/import/mensual/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    monthlyWarnings.value = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
    ui.success("Programación mensual importada.");
    monthlyImportFile.value = null;
    await Promise.all([loadMonthlyImports(), loadAgendaRows()]);
    if (data?.data?.id) {
      selectedMonthlyId.value = data.data.id;
      await loadSelectedMonthly(data.data.id);
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo importar el Excel mensual.");
  } finally {
    importingMonthly.value = false;
  }
}

async function importWeeklyWorkbook() {
  const file = resolveSingleFile(weeklyImportFile.value as File | File[] | null);
  if (!file) {
    ui.error("Selecciona el archivo Excel semanal.");
    return;
  }
  importingWeekly.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/kpi_maintenance/inteligencia/cronogramas-semanales/import/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    weeklyWarnings.value = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
    ui.success("Cronograma semanal importado.");
    weeklyImportFile.value = null;
    await loadWeeklySchedules();
    const cronograma = data?.data?.cronograma;
    if (cronograma?.id) {
      selectedWeeklyId.value = cronograma.id;
      selectedWeekly.value = cronograma;
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo importar el Excel semanal.");
  } finally {
    importingWeekly.value = false;
  }
}

function setWeeklyEditorWeek(anchorDate: string) {
  weeklyEditorAnchorDate.value = anchorDate;
  const range = getWeekRangeFromDate(anchorDate);
  weeklyEditor.fecha_inicio = range.start;
  weeklyEditor.fecha_fin = range.end;
}

function handleWeeklyAnchorChange(value: string) {
  setWeeklyEditorWeek(value);
}

function resetWeeklyEditor() {
  weeklyEditor.id = null;
  weeklyEditor.codigo = "";
  weeklyEditor.fecha_inicio = "";
  weeklyEditor.fecha_fin = "";
  weeklyEditor.locacion = "TPTA";
  weeklyEditor.referencia_orden = "";
  weeklyEditor.resumen = "";
  weeklyEditor.documento_origen = "MANUAL";
  weeklyEditorSlots.value = [];
  weeklyEditorItems.value = [];
}

function sortWeeklySlots() {
  weeklyEditorSlots.value = [...weeklyEditorSlots.value].sort((a, b) =>
    formatTimeLabel(a.hora_inicio, a.hora_fin).localeCompare(formatTimeLabel(b.hora_inicio, b.hora_fin)),
  );
}

function buildWeeklySlotKey(start: string, end: string) {
  return `${normalizeTimeInput(start)}-${normalizeTimeInput(end)}`;
}

function ensureWeeklySlot(start: string, end: string) {
  const hora_inicio = String(start || "").slice(0, 5);
  const hora_fin = String(end || "").slice(0, 5);
  const key = buildWeeklySlotKey(hora_inicio, hora_fin);
  if (!weeklyEditorSlots.value.find((item) => item.key === key)) {
    weeklyEditorSlots.value.push({ key, hora_inicio, hora_fin });
    sortWeeklySlots();
  }
  return key;
}

async function fetchNextWeeklyCode() {
  const { data } = await api.get("/kpi_maintenance/inteligencia/cronogramas-semanales/next-code");
  return data?.data?.code || data?.code || "";
}

function addWeeklySlot(start = "07:00", end = "08:00") {
  ensureWeeklySlot(start, end);
}

function updateWeeklySlot(slotKey: string, field: "hora_inicio" | "hora_fin", value: string) {
  const slot = weeklyEditorSlots.value.find((item) => item.key === slotKey);
  if (!slot) return;
  const previousKey = slot.key;
  slot[field] = String(value || "").slice(0, 5);
  slot.key = buildWeeklySlotKey(slot.hora_inicio, slot.hora_fin);
  if (slot.key !== previousKey) {
    weeklyEditorItems.value = weeklyEditorItems.value.map((item) =>
      item.slot_key === previousKey ? { ...item, slot_key: slot.key } : item,
    );
  }
  sortWeeklySlots();
}

function removeWeeklySlot(slotKey: string) {
  weeklyEditorSlots.value = weeklyEditorSlots.value.filter((item) => item.key !== slotKey);
  weeklyEditorItems.value = weeklyEditorItems.value.filter((item) => item.slot_key !== slotKey);
  if (!weeklyEditorSlots.value.length) addWeeklySlot();
}

function resolveWeekDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-EC", { weekday: "long" }).replace(/^\w/, (m) => m.toUpperCase());
}

function getWeeklyEditorItems(slotKey: string, date: string) {
  return weeklyEditorItems.value.filter((item) => item.slot_key === slotKey && item.fecha_actividad === date);
}

function openWeeklyCell(slotKey: string, date: string, item?: any) {
  weeklyCell.local_id = item?.local_id || "";
  weeklyCell.slot_key = slotKey;
  weeklyCell.fecha_actividad = date;
  weeklyCell.dia_semana = item?.dia_semana || resolveWeekDayLabel(date);
  weeklyCell.actividad = item?.actividad || "";
  weeklyCell.tipo_proceso = item?.tipo_proceso || "OPERACION";
  weeklyCell.responsable_area = item?.responsable_area || "";
  weeklyCell.equipo_codigo = item?.equipo_codigo || "";
  weeklyCell.observacion = item?.observacion || "";
  weeklyCellDialog.value = true;
}

function saveWeeklyCell() {
  if (!weeklyCell.actividad.trim()) {
    ui.error("Debes ingresar la actividad del bloque semanal.");
    return;
  }
  const payload = {
    local_id: weeklyCell.local_id || createLocalId(),
    slot_key: weeklyCell.slot_key,
    fecha_actividad: weeklyCell.fecha_actividad,
    dia_semana: weeklyCell.dia_semana || resolveWeekDayLabel(weeklyCell.fecha_actividad),
    actividad: weeklyCell.actividad.trim(),
    tipo_proceso: weeklyCell.tipo_proceso || "OPERACION",
    responsable_area: weeklyCell.responsable_area?.trim() || "",
    equipo_codigo: weeklyCell.equipo_codigo?.trim() || "",
    observacion: weeklyCell.observacion?.trim() || "",
  };
  const index = weeklyEditorItems.value.findIndex((item) => item.local_id === payload.local_id);
  if (index >= 0) {
    weeklyEditorItems.value[index] = { ...weeklyEditorItems.value[index], ...payload };
  } else {
    weeklyEditorItems.value.push(payload);
  }
  weeklyCellDialog.value = false;
}

function removeWeeklyItem(localId: string) {
  weeklyEditorItems.value = weeklyEditorItems.value.filter((item) => item.local_id !== localId);
}

function computeWeeklyDailyHours(details: any[]) {
  return details.reduce((acc: Record<string, number>, item) => {
    const [startHour = 0, startMinute = 0] = String(item.hora_inicio || "")
      .slice(0, 5)
      .split(":")
      .map(Number);
    const [endHour = 0, endMinute = 0] = String(item.hora_fin || "")
      .slice(0, 5)
      .split(":")
      .map(Number);
    if (!item.fecha_actividad) return acc;
    const duration = (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
    acc[item.fecha_actividad] = Number(((acc[item.fecha_actividad] ?? 0) + Math.max(duration, 0)).toFixed(2));
    return acc;
  }, {});
}

async function openWeeklyEditorCreate() {
  resetWeeklyEditor();
  setWeeklyEditorWeek(weeklyPlannerAnchorDate.value || formatDate(new Date()));
  try {
    weeklyEditor.codigo = await fetchNextWeeklyCode();
  } catch {
    weeklyEditor.codigo = `PCS-${Date.now()}`;
  }
  addWeeklySlot();
  weeklyEditorDialog.value = true;
}

function loadWeeklyEditorFromSchedule(schedule: any) {
  resetWeeklyEditor();
  weeklyEditor.id = schedule.id;
  weeklyEditor.codigo = schedule.codigo || "";
  weeklyEditor.fecha_inicio = schedule.fecha_inicio || "";
  weeklyEditor.fecha_fin = schedule.fecha_fin || "";
  weeklyEditor.locacion = schedule.locacion || "TPTA";
  weeklyEditor.referencia_orden = schedule.referencia_orden || "";
  weeklyEditor.resumen = schedule.resumen || "";
  weeklyEditor.documento_origen = schedule.documento_origen || "MANUAL";
  weeklyEditorAnchorDate.value = schedule.fecha_inicio || formatDate(new Date());
  for (const detail of Array.isArray(schedule.detalles) ? schedule.detalles : []) {
    const slotKey = ensureWeeklySlot(detail.hora_inicio || "07:00", detail.hora_fin || "08:00");
    weeklyEditorItems.value.push({
      local_id: detail.id || createLocalId(),
      slot_key: slotKey,
      fecha_actividad: detail.fecha_actividad,
      dia_semana: detail.dia_semana,
      actividad: detail.actividad,
      tipo_proceso: detail.tipo_proceso || "OPERACION",
      responsable_area: detail.responsable_area || "",
      equipo_codigo: detail.equipo_codigo || "",
      observacion: detail.observacion || "",
    });
  }
  if (!weeklyEditorSlots.value.length) addWeeklySlot();
}

async function openWeeklyEditorEdit(schedule: any) {
  try {
    const { data } = await api.get(`/kpi_maintenance/inteligencia/cronogramas-semanales/${schedule.id}`);
    loadWeeklyEditorFromSchedule(data?.data ?? schedule);
    weeklyEditorDialog.value = true;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo cargar el cronograma semanal.");
  }
}

async function saveWeeklyEditor() {
  if (!weeklyEditor.codigo || !weeklyEditor.fecha_inicio || !weeklyEditor.fecha_fin) {
    ui.error("Debes definir código y rango semanal.");
    return;
  }
  const slotMap = new Map(weeklyEditorSlots.value.map((slot) => [slot.key, slot]));
  const detalles = weeklyEditorItems.value.map((item, index) => {
    const slot = slotMap.get(item.slot_key);
    return {
      dia_semana: item.dia_semana || resolveWeekDayLabel(item.fecha_actividad),
      fecha_actividad: item.fecha_actividad,
      hora_inicio: normalizeTimeInput(slot?.hora_inicio || "07:00"),
      hora_fin: normalizeTimeInput(slot?.hora_fin || "08:00"),
      tipo_proceso: item.tipo_proceso || "OPERACION",
      actividad: item.actividad,
      responsable_area: item.responsable_area || undefined,
      equipo_codigo: item.equipo_codigo || undefined,
      observacion: item.observacion || undefined,
      orden: index + 1,
    };
  });
  if (!detalles.length) {
    ui.error("Debes agregar al menos una actividad al cronograma semanal.");
    return;
  }
  savingWeekly.value = true;
  try {
    const payload = {
      codigo: weeklyEditor.codigo,
      fecha_inicio: weeklyEditor.fecha_inicio,
      fecha_fin: weeklyEditor.fecha_fin,
      locacion: weeklyEditor.locacion || undefined,
      referencia_orden: weeklyEditor.referencia_orden || undefined,
      documento_origen: weeklyEditor.documento_origen || "MANUAL",
      resumen: weeklyEditor.resumen || undefined,
      payload_json: {
        editor_source: "MANUAL",
        daily_hours: computeWeeklyDailyHours(detalles),
      },
      detalles,
    };
    let savedId = weeklyEditor.id as string | null;
    if (weeklyEditor.id) {
      const { data } = await api.patch(`/kpi_maintenance/inteligencia/cronogramas-semanales/${weeklyEditor.id}`, payload);
      savedId = data?.data?.id || weeklyEditor.id;
      ui.success("Cronograma semanal actualizado.");
    } else {
      const { data } = await api.post("/kpi_maintenance/inteligencia/cronogramas-semanales", payload);
      savedId = data?.data?.id || null;
      ui.success("Cronograma semanal creado.");
    }
    weeklyEditorDialog.value = false;
    await loadWeeklySchedules();
    if (savedId) {
      selectedWeeklyId.value = savedId;
      await loadSelectedWeekly(savedId);
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar el cronograma semanal.");
  } finally {
    savingWeekly.value = false;
  }
}

function changeMonth(offset: number) {
  const next = new Date(currentMonth.value);
  next.setMonth(next.getMonth() + offset);
  currentMonth.value = next;
}

onMounted(async () => {
  setWeeklyEditorWeek(weeklyPlannerAnchorDate.value);
  await loadAll();
});
</script>

<style scoped>
.programaciones-page { display: grid; gap: 20px; }
.page-wrap { flex-wrap: wrap; }
.summary-strip { display: flex; flex-wrap: wrap; gap: 8px; }
.empty-state {
  min-height: 180px; border-radius: 22px; border: 1px dashed var(--surface-border);
  background: rgba(31, 75, 122, 0.05); display: grid; place-items: center;
  gap: 10px; padding: 24px; text-align: center; color: rgba(26, 34, 43, 0.72);
}
.matrix-wrap { overflow: auto; border: 1px solid var(--surface-border); border-radius: 22px; }
.matrix-table { border-collapse: separate; border-spacing: 0; min-width: 1100px; width: max-content; background: white; }
.matrix-table th, .matrix-table td {
  border-right: 1px solid rgba(17, 35, 58, 0.08); border-bottom: 1px solid rgba(17, 35, 58, 0.08);
  padding: 10px; vertical-align: top; min-width: 110px;
}
.matrix-table th { position: sticky; top: 0; z-index: 3; background: #f6f8fb; font-size: 0.82rem; }
.matrix-table__sticky { position: sticky; left: 0; z-index: 2; background: #fbfcfe; min-width: 110px; }
.matrix-table__sticky-2 { position: sticky; left: 110px; z-index: 2; background: #fbfcfe; min-width: 180px; }
.matrix-cell { display: flex; flex-wrap: wrap; gap: 6px; min-height: 44px; }
.matrix-cell--weekly { min-width: 220px; display: grid; gap: 8px; }
.monthly-day-cell { min-width: 120px; }
.matrix-chip-button { border: none; background: transparent; padding: 0; cursor: pointer; }
.weekly-activity { padding: 8px; border-radius: 12px; background: rgba(31, 75, 122, 0.06); white-space: pre-line; }
.weekly-activity__title { font-size: 0.8rem; font-weight: 600; }
.weekly-activity--editable { border: 1px solid rgba(31, 75, 122, 0.08); }
.weekly-add-button {
  display: flex; align-items: center; gap: 6px; border: 1px dashed rgba(31, 75, 122, 0.24);
  border-radius: 12px; padding: 8px 10px; background: rgba(31, 75, 122, 0.03); cursor: pointer; font-size: 0.8rem;
}
.slot-editor { display: grid; gap: 8px; min-width: 200px; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.calendar-weekday { font-size: 0.8rem; font-weight: 700; color: rgba(0, 0, 0, 0.65); text-align: center; }
.calendar-cell { min-height: 150px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 18px; padding: 10px; background: white; cursor: pointer; }
.calendar-cell--muted { opacity: 0.55; }
.calendar-cell--today { border-color: rgba(25, 118, 210, 0.45); box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.15); }
.calendar-events { display: flex; flex-direction: column; gap: 6px; }
.calendar-event { width: 100%; text-align: left; border: none; border-radius: 12px; padding: 8px; font-size: 0.75rem; cursor: pointer; }
.calendar-event--normal { background: rgba(25, 118, 210, 0.08); }
.calendar-event--warning { background: rgba(251, 140, 0, 0.12); }
.calendar-event--danger { background: rgba(211, 47, 47, 0.12); }
@media (max-width: 960px) {
  .matrix-table { min-width: 880px; }
  .matrix-table th, .matrix-table td { min-width: 90px; padding: 8px; }
  .matrix-table__sticky { min-width: 96px; }
  .matrix-table__sticky-2 { left: 96px; min-width: 156px; }
  .matrix-cell--weekly { min-width: 190px; }
  .calendar-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .calendar-weekday { display: none; }
}

@media (max-width: 600px) {
  .programaciones-page { gap: 14px; }
  .empty-state { min-height: 140px; padding: 18px; }
  .slot-editor { min-width: 100%; }
  .weekly-activity { padding: 7px; }
}
</style>

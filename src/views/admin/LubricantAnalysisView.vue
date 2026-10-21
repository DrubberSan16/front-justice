<template>
  <div :ref="setMotionRoot" class="lub-report">
    <!-- Encabezado: mismo patrón que el Dashboard Gerencia (rango, atajos y filtros) -->
    <section class="report-heading js-hero-reveal" aria-labelledby="lub-report-title">
      <div class="report-heading__copy">
        <div class="report-heading__eyebrow">Mantenimiento predictivo</div>
        <h1 id="lub-report-title">Análisis de lubricante</h1>
        <p>
          Resultados del laboratorio validados contra los límites de cada parámetro: qué equipo está
          fuera de rango, por qué y cómo viene evolucionando.
        </p>
        <div class="report-heading__tools">
          <v-btn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="openCreate">
            Nuevo análisis
          </v-btn>
          <v-btn
            v-if="canCreate"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-file-excel"
            :aria-expanded="showImport"
            @click="toggleImport"
          >
            Cargar informe
          </v-btn>
          <v-menu v-if="canAccessLubricantReports" location="bottom start">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                variant="tonal"
                prepend-icon="mdi-file-chart-outline"
                append-icon="mdi-menu-down"
                :loading="isExporting('excel') || isExporting('pdf')"
              >
                Exportar
              </v-btn>
            </template>
            <v-list density="compact" min-width="220">
              <v-list-item prepend-icon="mdi-file-pdf-box" title="Vista PDF" subtitle="Resumen y fuera de límite" @click="exportAnalyses('pdf')" />
              <v-list-item prepend-icon="mdi-file-excel" title="Excel" subtitle="Con todos los parámetros" @click="exportAnalyses('excel')" />
            </v-list>
          </v-menu>
          <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadAll">
            Actualizar
          </v-btn>
          <v-menu v-if="canCreate || canPurgeAnalyses" location="bottom start">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" variant="text" icon="mdi-dots-vertical" aria-label="Más acciones" />
            </template>
            <v-list density="compact" min-width="240">
              <v-list-item
                v-if="canCreate"
                prepend-icon="mdi-download"
                title="Descargar formato de carga"
                :disabled="downloadingTemplate"
                @click="downloadImportTemplate"
              />
              <v-list-item
                v-if="canPurgeAnalyses"
                prepend-icon="mdi-delete-alert"
                title="Eliminar toda la información"
                base-color="error"
                @click="openPurgeDialog"
              />
            </v-list>
          </v-menu>
        </div>
      </div>

      <div class="report-heading__actions" aria-label="Rango y filtros del reporte">
        <div class="report-heading__dates">
          <v-text-field v-model="rangeFrom" type="date" label="Desde" variant="outlined" density="comfortable" hide-details />
          <v-text-field v-model="rangeTo" type="date" label="Hasta" variant="outlined" density="comfortable" hide-details />
        </div>
        <div class="range-presets" role="group" aria-label="Rangos rápidos">
          <v-btn
            v-for="preset in rangePresets"
            :key="preset.key"
            class="range-presets__btn"
            :variant="preset.active ? 'flat' : 'tonal'"
            :color="preset.active ? 'primary' : undefined"
            :aria-pressed="preset.active"
            @click="applyRangePreset(preset)"
          >
            {{ preset.label }}
          </v-btn>
        </div>
        <div class="report-heading__filters">
          <v-autocomplete
            v-model="equipmentFilter"
            :items="equipmentFilterOptions"
            item-title="title"
            item-value="value"
            label="Equipo"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
          <v-select
            v-model="conditionFilter"
            :items="conditionFilterOptions"
            item-title="title"
            item-value="value"
            label="Condición actual"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
        </div>
      </div>
    </section>

    <v-alert v-if="invalidRange" type="warning" variant="tonal" rounded="xl">
      La fecha «Desde» no puede ser posterior a «Hasta».
    </v-alert>
    <v-alert v-else-if="error" type="warning" variant="tonal" rounded="xl" :text="error" />

    <!-- Carga del informe del laboratorio -->
    <v-expand-transition>
      <section
        v-if="canCreate && (showImport || importJob)"
        class="simple-section import-panel"
        aria-labelledby="lub-import-title"
      >
        <div class="section-title-row">
          <div>
            <h2 id="lub-import-title">Cargar informe del laboratorio</h2>
            <p>Excel del laboratorio por etiquetas (VEN-FOR-006A). Cada muestra queda con los límites que trae el informe.</p>
          </div>
          <v-btn v-if="!importJob" variant="text" icon="mdi-close" aria-label="Cerrar carga" @click="showImport = false" />
        </div>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-autocomplete
              v-model="importProductId"
              :items="oilProductOptions"
              item-title="title"
              item-value="value"
              label="Aceite de los análisis *"
              variant="outlined"
              density="compact"
              clearable
              hide-details="auto"
              :loading="catalogsLoading"
              :disabled="Boolean(importJob && !isTerminalImportStatus(importJob.status))"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-autocomplete
              v-model="importEquipmentId"
              :items="equipmentOptions"
              item-title="title"
              item-value="value"
              label="Equipo de los análisis *"
              variant="outlined"
              density="compact"
              clearable
              hide-details="auto"
              :loading="catalogsLoading"
              :disabled="Boolean(importJob && !isTerminalImportStatus(importJob.status))"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-file-input
              v-model="importFile"
              accept=".xlsx,.xls"
              prepend-icon="mdi-file-excel"
              label="Archivo Excel del laboratorio"
              variant="outlined"
              density="compact"
              show-size
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-start">
            <v-btn
              color="primary"
              prepend-icon="mdi-upload"
              :loading="importing"
              :disabled="Boolean(importJob && !isTerminalImportStatus(importJob.status))"
              block
              height="40"
              @click="processWorkbookImport"
            >
              Cargar
            </v-btn>
          </v-col>
          <v-col v-if="lastImportSummary" cols="12" class="pt-0">
            <v-chip color="success" variant="tonal" label>
              Creados: {{ lastImportSummary.created }} · Actualizados: {{ lastImportSummary.updated }} · Errores: {{ lastImportSummary.errors.length }}
            </v-chip>
          </v-col>
        </v-row>

        <v-card v-if="importJob" class="mt-4" rounded="lg" variant="tonal">
          <v-card-text>
            <div class="import-head">
              <div>
                <div class="text-subtitle-2 font-weight-bold">Carga en servidor</div>
                <div class="text-caption text-medium-emphasis">
                  {{ importJob.source_file_name || importJob.stored_file_name || "Archivo Excel" }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  Aceite: {{ importJob.producto_label || resolveOilProductLabel(importJob.producto_id) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  Equipo: {{ importJob.equipo_label || resolveEquipmentLabel(importJob) }}
                </div>
              </div>
              <v-chip :color="importStatusColor(importJob.status)" variant="tonal" label>
                {{ importJob.status || "QUEUED" }}
              </v-chip>
            </div>

            <v-progress-linear
              :model-value="importProgress"
              :color="importStatusColor(importJob.status)"
              height="12"
              rounded
              class="mt-2"
            />

            <div class="import-head mt-2">
              <div class="text-body-2">{{ importJob.current_step || "En espera" }}</div>
              <div class="text-caption text-medium-emphasis">{{ importProgress }}%</div>
            </div>

            <div class="text-caption text-medium-emphasis mt-2">
              {{ importJob.current_index || 0 }} / {{ importJob.total_steps || 0 }} muestras procesadas
            </div>

            <v-alert
              v-if="importJob.error_message"
              class="mt-3"
              type="error"
              variant="tonal"
              :text="importJob.error_message"
            />

            <div v-if="Array.isArray(importJob.errors) && importJob.errors.length" class="mt-3">
              <div class="text-caption font-weight-bold mb-1">Errores detectados</div>
              <div class="import-log">
                <div v-for="(item, index) in importJob.errors" :key="`error-${index}`" class="import-log__line">
                  <span class="font-weight-medium">Fila {{ Number(item.index ?? 0) + 1 }}</span>
                  <span>{{ item.message }}</span>
                </div>
              </div>
            </div>

            <div v-if="importLogs.length" class="mt-3">
              <div class="text-caption font-weight-bold mb-1">Log transaccional</div>
              <div class="import-log">
                <div v-for="(log, index) in importLogs" :key="`${log.at}-${index}`" class="import-log__line">
                  <span class="font-weight-medium">{{ log.level }}</span>
                  <span>{{ log.at }}</span>
                  <span>{{ log.message }}</span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </section>
    </v-expand-transition>

    <!-- Resumen visual del período -->
    <section v-if="!invalidRange" class="simple-section summary-deck" aria-label="Resumen del período">
      <KpiCardRail
        title="Resumen del período"
        :subtitle="`${rangeLabel} · Condición validada contra los límites del laboratorio.`"
        aria-label="Resumen del período"
        :show-pagination="false"
      >
        <KpiInsightCard
          title="Condición de las muestras"
          subtitle="Cada muestra frente a sus límites"
          icon="mdi-test-tube"
          :accent="statusPaint.warning"
          :value="formatCount(rangeAnalyses.length)"
          value-caption="muestras"
          :helper="labDifferenceHelper"
          variant="donut"
          show-share
          :points="sampleLevelPoints"
          :loading="loading"
          empty-text="No hay muestras en este rango."
        />
        <KpiInsightCard
          title="Condición actual por equipo"
          subtitle="Según la última muestra de cada equipo"
          icon="mdi-engine-outline"
          :accent="seriesColor(0, isDark)"
          :value="formatCount(equipmentGroups.length)"
          value-caption="equipos"
          :helper="equipmentAttentionHelper"
          variant="donut"
          show-share
          :points="equipmentLevelPoints"
          :loading="loading"
          empty-text="No hay equipos con muestras en este rango."
        />
        <KpiInsightCard
          title="Parámetros fuera de límite"
          subtitle="Veces que cada parámetro salió de su límite"
          icon="mdi-flask-outline"
          :accent="statusPaint.critical"
          :value="formatCount(totalFindings)"
          value-caption="resultados"
          helper="Presione una barra para ver qué equipos lo tienen fuera de límite hoy."
          variant="hbars"
          :chart-height="rankingChartHeight(parameterRankingPoints.length)"
          interactive
          :points="parameterRankingPoints"
          :loading="loading"
          empty-text="Ningún parámetro salió de su límite en este rango."
          @point="filterByParameter"
        />
        <KpiInsightCard
          title="Muestras por mes"
          subtitle="Ritmo de muestreo del período"
          icon="mdi-calendar-month-outline"
          :accent="seriesColor(2, isDark)"
          :value="latestSampleDate || 'Sin muestras'"
          value-caption="última muestra"
          :helper="samplingHelper"
          variant="bars"
          :points="monthlyPoints"
          :loading="loading"
          empty-text="No hay muestras en este rango."
        />
      </KpiCardRail>
    </section>

    <!-- Equipos: última condición y qué la causó -->
    <section v-if="!invalidRange" class="simple-section" aria-labelledby="lub-equipment-title">
      <div class="section-title-row">
        <div>
          <h2 id="lub-equipment-title">Equipos monitoreados</h2>
          <p>Última muestra de cada equipo en el rango y el parámetro que la dejó fuera de límite. Abra un equipo para ver la validación completa y sus tendencias.</p>
        </div>
        <v-text-field
          v-model="tableSearch"
          class="equipment-search"
          label="Buscar equipo, aceite o muestra"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
        />
      </div>

      <div v-if="parameterFilter" class="active-filter">
        <v-chip closable color="primary" variant="tonal" @click:close="parameterFilter = null">
          Fuera de límite en {{ parameterFilter.label }}
        </v-chip>
      </div>

      <div v-if="loading" class="compact-empty">Cargando análisis de lubricante...</div>
      <div v-else-if="visibleEquipmentGroups.length" class="equipment-report">
        <div class="equipment-report__head" aria-hidden="true">
          <span>Equipo</span>
          <span>Última muestra</span>
          <span>Condición</span>
          <span>Fuera de límite</span>
          <span>Muestras</span>
          <span></span>
        </div>
        <div class="equipment-report__scroll">
          <button
            v-for="group in visibleEquipmentGroups"
            :key="group.group_key"
            type="button"
            class="equipment-report__row"
            :class="`equipment-report__row--${group.meta.color}`"
            @click="openEquipment(group)"
          >
            <span class="equipment-report__name">
              <strong>{{ group.equipo_titulo }}</strong>
              <small>{{ group.equipo_detalle }}</small>
              <small>{{ group.lubricante }} · {{ group.compartimentos.join(", ") || "Sin compartimento" }}</small>
            </span>
            <span class="equipment-report__cell">
              <span>{{ group.ultimo_informe || "Sin fecha" }}</span>
              <small>{{ group.ultimo_numero_muestra || "Sin número" }}</small>
            </span>
            <span class="equipment-report__cell">
              <v-chip size="small" :color="group.meta.color" variant="tonal" :prepend-icon="group.meta.icon">
                {{ group.meta.title }}
              </v-chip>
              <small v-if="group.labDiffers">Laboratorio: {{ group.labMeta.title }}</small>
            </span>
            <span class="equipment-report__findings">
              <template v-if="group.findings.length">
                <span
                  v-for="finding in group.findings.slice(0, 3)"
                  :key="finding.key"
                  class="finding-tag"
                  :class="`finding-tag--${finding.nivel === 'ANORMAL' ? 'error' : 'warning'}`"
                >{{ formatLubricantFinding(finding) }}</span>
                <small v-if="group.findings.length > 3">y {{ group.findings.length - 3 }} más</small>
              </template>
              <small v-else>Todos dentro de límite</small>
            </span>
            <span class="equipment-report__cell equipment-report__cell--num">
              <span>{{ group.total_analisis }}<span class="equipment-report__unit"> {{ group.total_analisis === 1 ? "muestra" : "muestras" }}</span></span>
              <small v-if="group.historyText">{{ group.historyText }}</small>
            </span>
            <v-icon icon="mdi-chevron-right" size="20" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-else class="compact-empty">
        No hay equipos con muestras para los filtros elegidos.
      </div>
    </section>

    <!-- Cómo leer el reporte -->
    <section class="simple-section" aria-labelledby="lub-guide-title">
      <div class="section-title-row">
        <div>
          <h2 id="lub-guide-title">Cómo leer este reporte</h2>
          <p>Qué significa cada condición, cómo se leen los límites y qué indica cada parámetro.</p>
        </div>
      </div>
      <div class="guide-levels">
        <article
          v-for="level in guideLevels"
          :key="level.key"
          class="guide-level"
          :class="`guide-level--${level.color}`"
        >
          <v-icon :icon="level.icon" size="22" aria-hidden="true" />
          <div>
            <strong>{{ level.title }}</strong>
            <p>{{ level.meaning }}</p>
          </div>
        </article>
      </div>
      <div class="guide-notes">
        <p>
          <strong>Los límites.</strong> El laboratorio fija para cada parámetro un límite de precaución y otro
          anormal. «Desde 100 ppm» quiere decir que a partir de 100 ppm el resultado entra en esa condición;
          «por debajo de 12,3 cSt», que preocupa si baja. Los límites pueden cambiar entre informes: cada gráfico
          traza el que regía en cada muestra.
        </p>
        <p>
          <strong>Condición validada y condición del laboratorio.</strong> La condición de esta pantalla se calcula
          comparando cada resultado con sus límites. El informe del laboratorio trae además su propia evaluación;
          cuando no coinciden, la tabla lo indica debajo de la condición.
        </p>
      </div>
      <v-expansion-panels variant="accordion" multiple class="guide-glossary">
        <v-expansion-panel v-for="group in guideGroups" :key="group.title">
          <v-expansion-panel-title>
            <div>
              <strong>{{ group.title }}</strong>
              <div class="text-caption text-medium-emphasis">{{ group.description }}</div>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <dl class="guide-params">
              <div v-for="param in group.params" :key="param.key">
                <dt>{{ param.label }}</dt>
                <dd>{{ param.what }} <span>{{ param.outOfRange }}</span></dd>
              </div>
            </dl>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </section>

    <!-- Detalle del equipo -->
    <v-dialog
      v-model="workspaceOpen"
      class="section-workspace-overlay"
      max-width="1680"
      width="calc(100% - 24px)"
      :fullscreen="smAndDown"
      scrollable
    >
      <v-card class="section-workspace" rounded="xl">
        <header class="section-workspace__header">
          <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" aria-label="Regresar al reporte" @click="workspaceOpen = false" />
          <div class="section-workspace__heading">
            <span>Análisis del equipo · {{ selectedGroup?.equipo_detalle }} · {{ rangeLabel }}</span>
            <h2>{{ selectedGroup?.equipo_titulo || "Equipo" }}</h2>
          </div>
          <v-spacer />
          <div class="section-workspace__tools">
            <v-btn
              v-if="selectedGroup && (canEdit || canDelete)"
              variant="tonal"
              prepend-icon="mdi-format-list-bulleted"
              @click="groupDetailDialog = true"
            >
              Gestionar muestras
            </v-btn>
            <v-menu v-if="canAccessLubricantReports && selectedGroup" location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="tonal" prepend-icon="mdi-file-chart-outline" append-icon="mdi-menu-down" :loading="isExporting('equipo')">
                  Exportar equipo
                </v-btn>
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item prepend-icon="mdi-file-pdf-box" title="Vista PDF" @click="exportEquipment('pdf')" />
                <v-list-item prepend-icon="mdi-file-excel" title="Excel" @click="exportEquipment('excel')" />
              </v-list>
            </v-menu>
          </div>
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar detalle" @click="workspaceOpen = false" />
        </header>
        <v-divider />
        <v-card-text class="section-workspace__body">
          <LubricantDashboardPanel :dashboard="dashboard" :loading="dashboardLoading" :error="dashboardError" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialog" :fullscreen="isFormDialogFullscreen" :max-width="isFormDialogFullscreen ? undefined : 1400">
      <v-card rounded="xl" class="enterprise-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ editingId ? "Editar" : "Crear" }} analisis de lubricante
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4 section-surface">
          <v-row dense>
            <v-col cols="12">
              <v-autocomplete
                v-model="form.producto_id"
                :items="oilProductOptions"
                item-title="title"
                item-value="value"
                label="Aceite analizado *"
                variant="outlined"
                clearable
                :loading="catalogsLoading"
                :rules="[(value) => Boolean(value) || 'Debes seleccionar el aceite analizado.']"
                hint="Solo se listan productos activos configurados como aceite en inventario"
                persistent-hint
                @update:model-value="applySelectedOilSnapshot"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="form.codigo"
                label="Codigo autogenerado"
                variant="outlined"
                readonly
                :loading="codeLoading"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.cliente" label="Nombre del cliente" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.compartimento_principal"
                :items="compartmentOptions"
                label="Compartimento"
                variant="outlined"
                @update:model-value="handleCompartmentChange"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.equipo_id"
                :items="equipmentOptions"
                item-title="title"
                item-value="value"
                label="Equipo *"
                variant="outlined"
                clearable
                :loading="catalogsLoading"
                :rules="[(value) => Boolean(value) || 'El equipo es obligatorio']"
              />
            </v-col>

            <v-col cols="12" md="3">
              <v-text-field v-model="form.equipo_marca" label="Marca" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.equipo_serie" label="Serie" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.equipo_modelo" label="Modelo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.condicion"
                :items="conditionOptions"
                item-title="title"
                item-value="value"
                label="Condicion"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.lubricante"
                label="Aceite seleccionado"
                variant="outlined"
                readonly
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.marca_lubricante" label="Marca del aceite" variant="outlined" readonly />
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 font-weight-bold mb-2">Informacion de la muestra</div>
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.numero_muestra" label="Numeracion de muestra" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_muestra" type="date" label="Fecha de muestreo" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_ingreso" type="date" label="Fecha de ingreso" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.fecha_reporte" type="date" label="Fecha de informe" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model.number="form.horas_equipo" type="number" label="Equipo Hrs/Km" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model.number="form.horas_lubricante" type="number" label="Aceite Hrs/Km" variant="outlined" />
            </v-col>

            <v-col cols="12">
              <div class="import-head mb-2">
                <div class="text-subtitle-2 font-weight-bold">Parametros del reporte</div>
                <v-btn variant="tonal" prepend-icon="mdi-table-refresh" @click="applyDetailTemplate">
                  Recargar plantilla
                </v-btn>
              </div>

              <v-expansion-panels multiple variant="accordion">
                <v-expansion-panel
                  v-for="group in groupedFormDetails"
                  :key="group.group"
                  :title="group.group"
                >
                  <v-expansion-panel-text>
                    <div class="detail-grid">
                      <div
                        v-for="detail in group.items"
                        :key="`${group.group}-${detail.parametro_key || detail.parametro}`"
                        class="detail-card"
                      >
                        <div class="detail-card__title">
                          <div class="font-weight-medium">{{ detail.parametro }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ detail.unidad || "Resultado" }}
                          </div>
                        </div>

                        <v-select
                          v-if="detail.inputType === 'select'"
                          v-model="detail.resultado_texto"
                          :items="detail.options || humidityValueOptions"
                          label="Resultado"
                          variant="outlined"
                          density="compact"
                        />
                        <v-text-field
                          v-else-if="detail.inputType === 'text'"
                          v-model="detail.resultado_texto"
                          label="Resultado"
                          variant="outlined"
                          density="compact"
                        />
                        <v-text-field
                          v-else
                          v-model.number="detail.resultado_numerico"
                          type="number"
                          label="Resultado"
                          variant="outlined"
                          density="compact"
                        />
                      </div>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn v-if="canPersistForm" color="primary" :loading="saving" @click="save">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 420">
      <v-card rounded="xl" class="enterprise-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar analisis</v-card-title>
        <v-card-text>Se eliminara el analisis seleccionado.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="confirmDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="groupDetailDialog" :fullscreen="isGroupDialogFullscreen" :max-width="isGroupDialogFullscreen ? undefined : 1320">
      <v-card rounded="xl" class="enterprise-dialog">
        <v-card-title class="import-head">
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              Muestras de {{ selectedGroup?.equipo_label || "Sin equipo" }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedGroup?.lubricante || "Lubricante" }} · {{ selectedGroup?.marca_lubricante || "Sin marca del lubricante" }}
            </div>
          </div>
          <v-chip color="primary" variant="tonal" label>
            {{ selectedGroupItems.length }} analisis
          </v-chip>
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-table density="compact" class="enterprise-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Muestra</th>
                <th>Compartimento</th>
                <th>Condición</th>
                <th>Fecha informe</th>
                <th>Equipo Hrs/Km</th>
                <th>Aceite Hrs/Km</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedGroupItems" :key="item.id">
                <td>{{ item.codigo || "Sin codigo" }}</td>
                <td>{{ item.sample_info?.numero_muestra || "Sin muestra" }}</td>
                <td>{{ item.compartimento_principal || "Sin compartimento" }}</td>
                <td>
                  <v-chip size="x-small" :color="levelMetaFor(item).color" variant="tonal">
                    {{ levelMetaFor(item).title }}
                  </v-chip>
                </td>
                <td>{{ resolveLubricantReportDate(item) || "Sin fecha" }}</td>
                <td>{{ item.sample_info?.horas_equipo ?? "N/A" }}</td>
                <td>{{ item.sample_info?.horas_lubricante ?? "N/A" }}</td>
                <td>
                  <div class="d-flex justify-end flex-wrap" style="gap: 4px;">
                    <v-btn v-if="canEdit" icon="mdi-pencil" variant="text" aria-label="Editar análisis" @click="openEditFromGroup(item)" />
                    <v-btn v-if="canDelete" icon="mdi-delete" variant="text" color="error" aria-label="Eliminar análisis" @click="openDeleteFromGroup(item)" />
                  </div>
                </td>
              </tr>
              <tr v-if="!selectedGroupItems.length">
                <td colspan="8" class="text-center text-medium-emphasis py-6">
                  No hay analisis para este equipo en el rango.
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="groupDetailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="purgeDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 560">
      <v-card rounded="xl" class="enterprise-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Eliminar toda la informacion de analisis de lubricante
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="text-body-2 mb-3">
            Esta acción realizará un borrado real del módulo: análisis, detalles, alertas derivadas,
            eventos de proceso y archivos de importación guardados en servidor.
          </div>
          <div class="text-body-2 mb-3">
            Solo debe ejecutarse si estás completamente seguro. Para continuar, escribe
            <b>ELIMINAR TODO</b>.
          </div>
          <v-text-field
            v-model="purgeConfirmation"
            label="Confirmación"
            placeholder="ELIMINAR TODO"
            variant="outlined"
            autofocus
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closePurgeDialog">Cancelar</v-btn>
          <v-btn
            color="error"
            :loading="purging"
            :disabled="!canConfirmPurge"
            @click="confirmPurge"
          >
            Eliminar todo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

  <ReportPreviewDialogs :preview="reportPreview" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useDisplay, useTheme } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import {
  canManageLubricantAnalyses,
  canPurgeLubricantAnalyses,
} from "@/app/utils/role-access";
import { hasReportAccess } from "@/app/config/report-access";
import { DEFAULT_CATALOG_CACHE_TTL_MS } from "@/app/utils/request-cache";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import {
  buildEquipmentDisplayTitle,
  resolveEquipmentBrand as equipmentBrandOf,
  resolveEquipmentLocation as equipmentLocationOf,
  resolveEquipmentModel as equipmentModelOf,
  resolveEquipmentName as equipmentNameOf,
} from "@/app/utils/equipment-display";
import { formatDateForInput } from "@/app/utils/date-time";
import { resolveMotionElement, useRevealMotion } from "@/app/motion";
import { chartInk, chartStatus, seriesColor } from "@/app/config/chart-theme";
import KpiCardRail from "@/components/dashboard/KpiCardRail.vue";
import KpiInsightCard from "@/components/dashboard/KpiInsightCard.vue";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import {
  buildLubricantReport,
  formatLubricantFinding,
  labLubricantLevel,
  lubricantFindings,
  resolveLubricantReportDate,
  validatedLubricantLevel,
  type LubricantFinding,
} from "@/app/utils/lubricant-report";
import { useReportPreview } from "@/app/utils/report-preview";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";
import {
  groupLubricantDetails,
  humidityOptions,
  lubricantCompartments,
  lubricantConditionOptions,
  getLubricantParameterTemplate,
  lubricantGroupGuide,
  lubricantLevelMeta,
  lubricantParameterGuide,
  lubricantParameterTemplates,
  mergeLubricantDetails,
  type LubricantLevel,
} from "@/app/config/lubricant-analysis";

const reportPreview = useReportPreview({
  title: "Previsualización del análisis de lubricante",
});

type AnyRow = Record<string, any>;
type LubricantGroupRow = {
  group_key: string;
  lubricante: string;
  marca_lubricante: string;
  equipo_id: string | null;
  equipo_codigo: string | null;
  equipo_nombre: string | null;
  equipo_label: string | null;
  equipo_titulo: string;
  equipo_detalle: string;
  equipo_modelo: string | null;
  items: AnyRow[];
  compartimentos: string[];
  total_analisis: number;
  anormales: number;
  precauciones: number;
  historyText: string;
  ultimo_informe: string;
  ultimo_numero_muestra: string;
  latest_item: AnyRow;
  level: LubricantLevel;
  meta: (typeof lubricantLevelMeta)[LubricantLevel];
  labMeta: (typeof lubricantLevelMeta)[LubricantLevel];
  labDiffers: boolean;
  findings: LubricantFinding[];
};

const ACTIVE_IMPORT_STORAGE_KEY = "kpi-justice:lubricant-import:active-job";

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();
const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);
const statusPaint = computed(() => chartStatus(isDark.value));

const loading = ref(false);
const saving = ref(false);
const codeLoading = ref(false);
const dashboardLoading = ref(false);
const importing = ref(false);
const downloadingTemplate = ref(false);
const purging = ref(false);
const catalogsLoading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const groupDetailDialog = ref(false);
const workspaceOpen = ref(false);
const showImport = ref(false);

/**
 * Los permisos se buscan por `url_component`, NUNCA por el nombre visible del
 * menu. Esta lista traia solo los nombres ("Analisis de lubricante"), que no
 * coinciden con nada y caian en silencio a "sin permiso": por eso un
 * supervisor con crear y editar concedidos no veia ni el boton de nuevo
 * analisis ni la carga masiva ni el formato de carga. Solo funcionaba para
 * administradores, porque a ellos los habilita el rol.
 */
const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "inteligencia-analisis-lubricante",
    "analisis-lubricante",
  ]),
);
const hasAdministrativeAccess = computed(() => canManageLubricantAnalyses(auth.user));
const canCreate = computed(() => perms.value.isCreated || hasAdministrativeAccess.value);
const canEdit = computed(() => perms.value.isEdited || hasAdministrativeAccess.value);
const canDelete = computed(() => perms.value.permitDeleted || hasAdministrativeAccess.value);
const canPersistForm = computed(() => (editingId.value ? canEdit.value : canCreate.value));
const canAccessLubricantReports = computed(() =>
  hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "analisis_lubricante"),
);
const purgeDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const selectedGroupKey = ref<string | null>(null);
const error = ref<string | null>(null);
const dashboardError = ref<string | null>(null);
const analyses = ref<AnyRow[]>([]);
const dashboard = ref<AnyRow | null>(null);
const equipments = ref<AnyRow[]>([]);
const brands = ref<AnyRow[]>([]);
const oilProducts = ref<AnyRow[]>([]);
const catalogsLoaded = ref(false);
const importFile = ref<File | null>(null);
const importProductId = ref<string | null>(null);
const importEquipmentId = ref<string | null>(null);
const lastImportSummary = ref<AnyRow | null>(null);
const importJob = ref<AnyRow | null>(null);
const importPollHandle = ref<number | null>(null);
const importDismissHandle = ref<number | null>(null);
const purgeConfirmation = ref("");
const tableSearch = ref("");
const equipmentFilter = ref<string | null>(null);
const conditionFilter = ref<LubricantLevel | null>(null);
const parameterFilter = ref<{ key: string; label: string } | null>(null);
const exportState = reactive<Record<string, boolean>>({});
const isFormDialogFullscreen = computed(() => mdAndDown.value);
const isGroupDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);

const conditionOptions = lubricantConditionOptions;
const compartmentOptions = lubricantCompartments;
const humidityValueOptions = humidityOptions.map((item) => item.value);

const conditionFilterOptions = (["ANORMAL", "PRECAUCION", "NORMAL", "N/D"] as LubricantLevel[]).map(
  (level) => ({ value: level, title: lubricantLevelMeta[level].title }),
);

const form = reactive({
  codigo: "",
  producto_id: null as string | null,
  cliente: "JUSTICE COMPANY",
  equipo_id: null as string | null,
  lubricante: "",
  marca_lubricante: "",
  compartimento_principal: "MOTOR",
  fecha_muestra: "",
  fecha_ingreso: "",
  fecha_reporte: "",
  numero_muestra: "",
  horas_equipo: null as number | null,
  horas_lubricante: null as number | null,
  condicion: "NORMAL",
  equipo_marca: "",
  equipo_serie: "",
  equipo_modelo: "",
  detalles: [] as AnyRow[],
});

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

/* ------------------------------ Rango ---------------------------------- */

function monthsAgo(months: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setMonth(date.getMonth() - months);
  return formatDateForInput(date);
}

// Las muestras de aceite se toman cada mes o dos: un año deja ver la
// tendencia sin cargar el historial desde 2021.
const rangeFrom = ref(monthsAgo(12));
const rangeTo = ref(formatDateForInput());

const rangePresets = computed(() => {
  const today = formatDateForInput();
  return [
    { key: "3m", label: "Últimos 3 meses", from: monthsAgo(3), to: today },
    { key: "6m", label: "Últimos 6 meses", from: monthsAgo(6), to: today },
    { key: "12m", label: "Último año", from: monthsAgo(12), to: today },
    { key: "todo", label: "Todo el historial", from: "", to: "" },
  ].map((preset) => ({
    ...preset,
    active: preset.from === rangeFrom.value && preset.to === rangeTo.value,
  }));
});

function applyRangePreset(preset: { from: string; to: string }) {
  rangeFrom.value = preset.from;
  rangeTo.value = preset.to;
}

const invalidRange = computed(
  () => Boolean(rangeFrom.value && rangeTo.value && rangeFrom.value > rangeTo.value),
);

const rangeLabel = computed(() => {
  if (!rangeFrom.value && !rangeTo.value) return "Todo el historial";
  return `Del ${rangeFrom.value || "inicio"} al ${rangeTo.value || "hoy"}`;
});

function isWithinRange(item: AnyRow) {
  const date = resolveLubricantReportDate(item) ?? String(item?.created_at ?? "").slice(0, 10);
  if (!date) return !rangeFrom.value;
  if (rangeFrom.value && date < rangeFrom.value) return false;
  if (rangeTo.value && date > rangeTo.value) return false;
  return true;
}

/* --------------------------- Catálogos --------------------------------- */

const brandMap = computed(() => {
  const next = new Map<string, AnyRow>();
  for (const item of brands.value) {
    if (item?.id) next.set(String(item.id), item);
  }
  return next;
});

const equipmentMap = computed(() => {
  const next = new Map<string, AnyRow>();
  for (const item of equipments.value) {
    if (item?.id) next.set(String(item.id), item);
  }
  return next;
});

function resolveEquipmentBrand(item: AnyRow | null | undefined) {
  if (!item) return "";
  return (
    String(item.marca_nombre ?? item.brand_name ?? "").trim() ||
    String(brandMap.value.get(String(item.marca_id))?.nombre ?? "").trim() ||
    ""
  );
}

const equipmentOptions = computed(() =>
  equipments.value.map((item) => ({
    value: item.id,
    title: buildEquipmentDisplayTitle({
      ...item,
      marca_nombre: resolveEquipmentBrand(item),
    }),
    marca: resolveEquipmentBrand(item),
  })),
);

const oilProductMap = computed(() => {
  const next = new Map<string, AnyRow>();
  for (const item of oilProducts.value) {
    if (item?.id) next.set(String(item.id), item);
  }
  return next;
});

const oilProductOptions = computed(() =>
  oilProducts.value
    .filter((item) => Boolean(item?.es_aceite) && !Boolean(item?.is_deleted))
    .map((item) => ({
      value: String(item.id),
      title: buildProductDisplayTitle(item),
    }))
    .sort((a, b) => a.title.localeCompare(b.title)),
);

function resolveOilProductLabel(productId: unknown) {
  const product = oilProductMap.value.get(String(productId || ""));
  return product ? buildProductDisplayTitle(product) : "Sin aceite seleccionado";
}

function applySelectedOilSnapshot(productId: unknown = form.producto_id) {
  const normalizedId = String(productId || "").trim();
  form.producto_id = normalizedId || null;
  const product = normalizedId ? oilProductMap.value.get(normalizedId) : null;
  if (!product) {
    form.lubricante = "";
    form.marca_lubricante = "";
    return;
  }
  form.lubricante = String(product?.nombre || "").trim();
  form.marca_lubricante = String(
    product?.marca_nombre || brandMap.value.get(String(product?.marca_id || ""))?.nombre || "",
  ).trim();
}

/**
 * Equipos, marcas y aceites solo los usan el formulario y la carga de Excel:
 * se piden al abrirlos, no al entrar a la pantalla. Quien solo consulta el
 * reporte carga una única lista.
 */
async function ensureFormCatalogs() {
  if (catalogsLoaded.value || catalogsLoading.value) return;
  catalogsLoading.value = true;
  try {
    const [equipmentRows, brandRows, oilRows] = await Promise.all([
      listAllPages("/kpi_maintenance/equipos", {}, { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS }),
      listAllPages("/kpi_inventory/marcas", {}, { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS }),
      listAllPages("/kpi_inventory/productos", { es_aceite: true }, { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS }),
    ]);
    equipments.value = equipmentRows;
    brands.value = brandRows;
    oilProducts.value = oilRows;
    catalogsLoaded.value = true;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudieron cargar equipos y aceites.");
  } finally {
    catalogsLoading.value = false;
  }
}

/* ------------------------- Muestras del rango -------------------------- */

function resolveEquipmentLabel(item: AnyRow | null | undefined) {
  if (!item) return "";
  const equipoNombre = String(item.equipo_nombre || item.sample_info?.equipo_nombre || "").trim();
  if (!equipoNombre) return "";
  return buildEquipmentDisplayTitle(item);
}

function resolveEquipmentModel(item: AnyRow | null | undefined) {
  return String(item?.sample_info?.equipo_modelo || item?.equipo_modelo || "").trim();
}

function buildLubricantGroupKey(
  lubricante: unknown,
  marcaLubricante: unknown,
  equipoId?: unknown,
  equipoCodigo?: unknown,
  equipoNombre?: unknown,
  equipoModelo?: unknown,
) {
  return [lubricante, marcaLubricante, equipoId, equipoCodigo, equipoNombre, equipoModelo]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("::");
}

function compareAnalysisByLatestDate(left: AnyRow, right: AnyRow) {
  const leftDate = resolveLubricantReportDate(left) || "";
  const rightDate = resolveLubricantReportDate(right) || "";
  if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
  return String(right?.codigo || "").localeCompare(String(left?.codigo || ""));
}

function levelMetaFor(item: AnyRow) {
  return lubricantLevelMeta[validatedLubricantLevel(item)];
}

const rangeAnalyses = computed(() =>
  analyses.value.filter(
    (item) =>
      isWithinRange(item) &&
      (!equipmentFilter.value || String(item.equipo_id ?? "") === equipmentFilter.value),
  ),
);

/** Los equipos del filtro salen de las propias muestras: solo los que tienen análisis. */
const equipmentFilterOptions = computed(() => {
  const options = new Map<string, string>();
  for (const item of analyses.value) {
    if (item.equipo_id && !options.has(String(item.equipo_id))) {
      options.set(String(item.equipo_id), resolveEquipmentLabel(item) || "Sin equipo");
    }
  }
  return [...options.entries()]
    .map(([value, title]) => ({ value, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

const equipmentGroups = computed<LubricantGroupRow[]>(() => {
  const groups = new Map<string, { items: AnyRow[]; key: string }>();
  for (const item of rangeAnalyses.value) {
    const key = buildLubricantGroupKey(
      item.lubricante,
      item.marca_lubricante,
      item.equipo_id,
      item.equipo_codigo,
      item.equipo_nombre,
      resolveEquipmentModel(item) || null,
    );
    const group = groups.get(key) ?? { items: [], key };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ items, key }) => {
      const sortedItems = [...items].sort(compareAnalysisByLatestDate);
      // Un grupo nace con su primera muestra: nunca esta vacio.
      const latest = sortedItems[0] as AnyRow;
      const level = validatedLubricantLevel(latest);
      const lab = labLubricantLevel(latest);
      const anormales = sortedItems.filter((item) => validatedLubricantLevel(item) === "ANORMAL").length;
      const precauciones = sortedItems.filter((item) => validatedLubricantLevel(item) === "PRECAUCION").length;
      return {
        group_key: key,
        lubricante: latest.lubricante || "Sin lubricante",
        marca_lubricante: latest.marca_lubricante || "Sin marca del lubricante",
        equipo_id: latest.equipo_id || null,
        equipo_codigo: latest.equipo_codigo || null,
        equipo_nombre: latest.equipo_nombre || null,
        equipo_label: resolveEquipmentLabel(latest) || null,
        // En la fila, el nombre con que se conoce la unidad en campo va arriba
        // y marca, modelo y central debajo: juntos ocupaban cuatro renglones.
        equipo_titulo: equipmentNameOf(latest) || "Sin equipo",
        equipo_detalle:
          [equipmentBrandOf(latest), equipmentModelOf(latest), equipmentLocationOf(latest)]
            .filter(Boolean)
            .join(" · ") || "Sin marca ni ubicación",
        equipo_modelo: resolveEquipmentModel(latest) || null,
        items: sortedItems,
        compartimentos: [
          ...new Set(sortedItems.map((item) => String(item.compartimento_principal || "").trim()).filter(Boolean)),
        ].sort(),
        total_analisis: sortedItems.length,
        anormales,
        precauciones,
        historyText: [
          anormales ? `${anormales} ${anormales === 1 ? "anormal" : "anormales"}` : "",
          precauciones ? `${precauciones} en precaución` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        ultimo_informe: resolveLubricantReportDate(latest) || "",
        ultimo_numero_muestra: String(latest.sample_info?.numero_muestra || "").trim(),
        latest_item: latest,
        level,
        meta: lubricantLevelMeta[level],
        labMeta: lubricantLevelMeta[lab],
        labDiffers: lab !== "N/D" && lab !== level,
        findings: lubricantFindings(latest),
      };
    })
    .sort(
      (a, b) =>
        b.meta.severity - a.meta.severity ||
        String(b.ultimo_informe).localeCompare(String(a.ultimo_informe)) ||
        String(a.equipo_label || "").localeCompare(String(b.equipo_label || "")),
    );
});

const visibleEquipmentGroups = computed(() => {
  const search = String(tableSearch.value || "").trim().toLowerCase();
  return equipmentGroups.value.filter((group) => {
    if (conditionFilter.value && group.level !== conditionFilter.value) return false;
    if (parameterFilter.value && !group.findings.some((finding) => finding.key === parameterFilter.value?.key)) {
      return false;
    }
    if (!search) return true;
    return [
      group.equipo_label,
      group.lubricante,
      group.marca_lubricante,
      group.equipo_modelo,
      ...group.compartimentos,
      ...group.items.flatMap((item) => [item.codigo, item.sample_info?.numero_muestra]),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
});

const selectedGroup = computed(
  () => equipmentGroups.value.find((group) => group.group_key === selectedGroupKey.value) ?? null,
);
const selectedGroupItems = computed<AnyRow[]>(() => selectedGroup.value?.items ?? []);

/* ---------------------------- Indicadores ------------------------------ */

const countFormatter = new Intl.NumberFormat("es-EC");
function formatCount(value: number) {
  return countFormatter.format(value);
}

function levelPaint(level: LubricantLevel) {
  if (level === "ANORMAL") return statusPaint.value.critical;
  if (level === "PRECAUCION") return statusPaint.value.warning;
  if (level === "NORMAL") return statusPaint.value.good;
  return chartInk(isDark.value).muted;
}

function levelPoints(levels: LubricantLevel[]) {
  const counts = new Map<LubricantLevel, number>();
  for (const level of levels) counts.set(level, (counts.get(level) ?? 0) + 1);
  return (["ANORMAL", "PRECAUCION", "NORMAL", "N/D"] as LubricantLevel[])
    .filter((level) => counts.get(level))
    .map((level) => ({
      key: level,
      label: lubricantLevelMeta[level].title,
      value: counts.get(level) ?? 0,
      color: levelPaint(level),
    }));
}

const sampleLevelPoints = computed(() => levelPoints(rangeAnalyses.value.map(validatedLubricantLevel)));
const equipmentLevelPoints = computed(() => levelPoints(equipmentGroups.value.map((group) => group.level)));

const labDifferences = computed(
  () =>
    rangeAnalyses.value.filter((item) => {
      const lab = labLubricantLevel(item);
      return lab !== "N/D" && lab !== validatedLubricantLevel(item);
    }).length,
);

const labDifferenceHelper = computed(() =>
  labDifferences.value
    ? `${formatCount(labDifferences.value)} con una condición distinta a la que escribió el laboratorio.`
    : "Coincide con la evaluación del laboratorio.",
);

const equipmentAttentionHelper = computed(() => {
  const attention = equipmentGroups.value.filter((group) => group.level === "ANORMAL" || group.level === "PRECAUCION").length;
  return attention
    ? `${formatCount(attention)} requieren atención según su última muestra.`
    : "Todos los equipos están dentro de límite.";
});

const parameterRanking = computed(() => {
  const ranking = new Map<string, { label: string; abnormal: number; caution: number }>();
  for (const item of rangeAnalyses.value) {
    for (const finding of lubricantFindings(item)) {
      const entry = ranking.get(finding.key) ?? { label: finding.parametro, abnormal: 0, caution: 0 };
      if (finding.nivel === "ANORMAL") entry.abnormal += 1;
      else entry.caution += 1;
      ranking.set(finding.key, entry);
    }
  }
  return [...ranking.entries()]
    .map(([key, entry]) => ({ key, ...entry, total: entry.abnormal + entry.caution }))
    .sort((a, b) => b.total - a.total);
});

const totalFindings = computed(() => parameterRanking.value.reduce((sum, entry) => sum + entry.total, 0));

const parameterRankingPoints = computed(() =>
  parameterRanking.value.slice(0, 8).map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.total,
    valueLabel: entry.abnormal
      ? `${entry.total} (${entry.abnormal} anormal)`
      : `${entry.total}`,
    color: entry.abnormal ? statusPaint.value.critical : statusPaint.value.warning,
  })),
);

function rankingChartHeight(count: number) {
  return `${Math.max(160, Math.min(8, count) * 34 + 24)}px`;
}

function filterByParameter(point: { key?: string; label: string }) {
  if (!point?.key) return;
  parameterFilter.value = { key: point.key, label: point.label };
  document.getElementById("lub-equipment-title")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const monthlyPoints = computed(() => {
  const months = new Map<string, number>();
  for (const item of rangeAnalyses.value) {
    const date = resolveLubricantReportDate(item);
    if (!date) continue;
    const month = date.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, value]) => {
      const [year, monthNumber] = month.split("-").map(Number);
      return { key: month, label: `${MONTH_NAMES[(monthNumber || 1) - 1]} ${String(year).slice(2)}`, value };
    });
});

const latestSampleDate = computed(() =>
  rangeAnalyses.value.reduce((latest, item) => {
    const date = resolveLubricantReportDate(item) || "";
    return date > latest ? date : latest;
  }, ""),
);

const samplingHelper = computed(() => {
  const months = monthlyPoints.value.length;
  if (!months) return "Sin muestras en el rango.";
  const average = rangeAnalyses.value.length / months;
  return `${formatCount(months)} meses con muestras · ${average.toLocaleString("es-EC", { maximumFractionDigits: 1 })} por mes en promedio.`;
});

/* ------------------------------ Guía ----------------------------------- */

const guideLevels = (["NORMAL", "PRECAUCION", "ANORMAL", "N/D"] as LubricantLevel[]).map((level) => ({
  key: level,
  ...lubricantLevelMeta[level],
}));

const guideGroups = computed(() => {
  const groups = new Map<string, Array<{ key: string; label: string; what: string; outOfRange: string }>>();
  for (const template of lubricantParameterTemplates) {
    const guide = lubricantParameterGuide[template.key];
    if (!guide) continue;
    const title = normalizeGroupTitle(template.group);
    const list = groups.get(title) ?? [];
    list.push({ key: template.key, label: template.label, ...guide });
    groups.set(title, list);
  }
  return [...groups.entries()].map(([title, params]) => ({
    title,
    description: lubricantGroupGuide[title] ?? "",
    params,
  }));
});

/** La plantilla del formulario escribe los grupos sin tildes; la guía, con ellas. */
function normalizeGroupTitle(group: string) {
  const plain = group.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return (
    Object.keys(lubricantGroupGuide).find(
      (title) => title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase() === plain,
    ) ?? group
  );
}

/* --------------------------- Detalle de equipo ------------------------- */

async function loadDashboard(group: LubricantGroupRow) {
  dashboardLoading.value = true;
  dashboardError.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", {
      params: {
        periodo: "PERSONALIZADO",
        from: rangeFrom.value || undefined,
        to: rangeTo.value || undefined,
        lubricante: group.lubricante,
        marca_lubricante: group.marca_lubricante,
        equipo_id: group.equipo_id || undefined,
        equipo_codigo: group.equipo_codigo || undefined,
        equipo_nombre: group.equipo_nombre || undefined,
        equipo_modelo: group.equipo_modelo || undefined,
      },
    });
    dashboard.value = unwrap(data, null);
  } catch (e: any) {
    dashboardError.value = e?.response?.data?.message || "No se pudo cargar el análisis del equipo.";
  } finally {
    dashboardLoading.value = false;
  }
}

function openEquipment(group: LubricantGroupRow) {
  selectedGroupKey.value = group.group_key;
  dashboard.value = null;
  workspaceOpen.value = true;
  void loadDashboard(group);
}

function openEditFromGroup(item: AnyRow) {
  groupDetailDialog.value = false;
  void openEdit(item);
}

function openDeleteFromGroup(item: AnyRow) {
  groupDetailDialog.value = false;
  openDelete(item);
}

async function refreshOpenWorkspace() {
  if (!workspaceOpen.value) return;
  const group = selectedGroup.value;
  if (group) await loadDashboard(group);
  else workspaceOpen.value = false;
}

/* ------------------------------ Exportes ------------------------------- */

function isExporting(key: string) {
  return Boolean(exportState[`lubricant:${key}`]);
}

// La lista llega sin detalles (`resumen`): con ellos pesaba ~70 KB por
// analisis y tardaba varios segundos. Los detalles se piden al editar un
// analisis y al exportar, que son los unicos que los usan.
async function loadAnalyses() {
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante", {
    params: { resumen: true },
  });
  analyses.value = unwrap(data, []);
}

async function loadAnalysisWithDetails(item: AnyRow): Promise<AnyRow> {
  if (Array.isArray(item?.detalles)) return item;
  const { data } = await api.get(`/kpi_maintenance/inteligencia/analisis-lubricante/${item.id}`);
  return unwrap(data, item);
}

async function loadAnalysesWithDetails(items: AnyRow[]): Promise<AnyRow[]> {
  if (items.every((item) => Array.isArray(item?.detalles))) return items;
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante");
  const fullById = new Map(
    unwrap<AnyRow[]>(data, []).map((row) => [String(row.id), row]),
  );
  return items.map((item) => fullById.get(String(item.id)) ?? item);
}

async function runExport(key: string, format: "excel" | "pdf", items: AnyRow[], subtitle: string) {
  if (!canAccessLubricantReports.value) {
    ui.error("No tienes permisos para generar reportes de análisis de lubricante.");
    return;
  }
  if (!items.length) {
    ui.open("No hay muestras para exportar con los filtros elegidos.", "warning");
    return;
  }
  exportState[`lubricant:${key}`] = true;
  error.value = null;
  try {
    // Una sola muestra se pide por su id; varias, en la lista completa.
    const detailed =
      items.length === 1 ? [await loadAnalysisWithDetails(items[0] as AnyRow)] : await loadAnalysesWithDetails(items);
    const report = buildLubricantReport(detailed, { subtitle, format });
    await reportPreview.open(format, report);
  } catch (e: any) {
    error.value = e?.message || "No se pudo generar el reporte de análisis de lubricante.";
  } finally {
    exportState[`lubricant:${key}`] = false;
  }
}

async function exportAnalyses(format: "excel" | "pdf") {
  const conditionText = conditionFilter.value
    ? ` · equipos en ${lubricantLevelMeta[conditionFilter.value].title.toLowerCase()}`
    : "";
  const allowedGroups = conditionFilter.value || parameterFilter.value || tableSearch.value
    ? new Set(visibleEquipmentGroups.value.map((group) => group.group_key))
    : null;
  const items = allowedGroups
    ? equipmentGroups.value.filter((group) => allowedGroups.has(group.group_key)).flatMap((group) => group.items)
    : rangeAnalyses.value;
  await runExport(format, format, items, `${rangeLabel.value}${conditionText}. Condición validada contra los límites del laboratorio.`);
}

async function exportEquipment(format: "excel" | "pdf") {
  const group = selectedGroup.value;
  if (!group) return;
  await runExport("equipo", format, group.items, `${group.equipo_label || "Equipo"} · ${rangeLabel.value}.`);
}

/* ---------------------------- Carga inicial ---------------------------- */

async function loadAll() {
  loading.value = true;
  error.value = null;
  try {
    await loadAnalyses();
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar el modulo de lubricantes.";
  } finally {
    loading.value = false;
  }
}

function toggleImport() {
  showImport.value = !showImport.value;
  if (showImport.value) void ensureFormCatalogs();
}

function currentUserName() {
  return auth.user?.nameUser || "admin";
}

function currentUserEmail() {
  return auth.user?.email || "";
}

function currentUserId() {
  return auth.user?.id || "";
}

function getSelectedImportFile() {
  if (Array.isArray(importFile.value)) {
    return (importFile.value[0] as File) || null;
  }
  return importFile.value;
}

function isTerminalImportStatus(status: unknown) {
  const raw = String(status ?? "").toUpperCase();
  return raw === "COMPLETED" || raw === "FAILED";
}

function persistActiveImportJob(job: AnyRow | null | undefined) {
  if (typeof window === "undefined") return;
  const jobId = String(job?.id ?? "").trim();
  const status = String(job?.status ?? "").toUpperCase();
  try {
    if (!jobId || isTerminalImportStatus(status)) {
      window.localStorage.removeItem(ACTIVE_IMPORT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      ACTIVE_IMPORT_STORAGE_KEY,
      JSON.stringify({
        id: jobId,
        status,
        source_file_name: job?.source_file_name || job?.stored_file_name || null,
      }),
    );
  } catch {
    // Sin almacenamiento local solo se pierde la reanudacion de la carga.
  }
}

function getPersistedImportJobId() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_IMPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string | null };
    return String(parsed?.id ?? "").trim() || null;
  } catch {
    persistActiveImportJob(null);
    return null;
  }
}

function clearImportDismissTimer() {
  if (importDismissHandle.value != null) {
    window.clearTimeout(importDismissHandle.value);
    importDismissHandle.value = null;
  }
}

function dismissImportCardNow() {
  clearImportDismissTimer();
  importJob.value = null;
}

function scheduleImportCardDismiss(delayMs = 1800) {
  clearImportDismissTimer();
  importDismissHandle.value = window.setTimeout(() => {
    importJob.value = null;
    importDismissHandle.value = null;
  }, delayMs);
}

async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission === "default") {
    try {
      await window.Notification.requestPermission();
    } catch {
      // ignore permission errors
    }
  }
}

function emitBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;
  try {
    new window.Notification(title, {
      body,
      tag,
    });
  } catch {
    // ignore browser notification errors
  }
}

async function notifyImportLifecycle(options: {
  title: string;
  message: string;
  variant?: "success" | "error" | "info" | "warning";
  requestPermission?: boolean;
  tag: string;
}) {
  if (options.requestPermission) {
    await requestBrowserNotificationPermission();
  }
  ui.open(options.message, options.variant ?? "info", 5000);
  emitBrowserNotification(options.title, options.message, options.tag);
}

function stopImportPolling() {
  if (importPollHandle.value != null) {
    window.clearInterval(importPollHandle.value);
    importPollHandle.value = null;
  }
}

function startImportPolling(jobId: string) {
  stopImportPolling();
  importPollHandle.value = window.setInterval(() => {
    void fetchImportJobStatus(jobId);
  }, 2000);
}

function importStatusColor(status: unknown) {
  const raw = String(status ?? "").toUpperCase();
  if (raw === "FAILED") return "error";
  if (raw === "COMPLETED") return "success";
  if (raw === "PROCESSING" || raw === "PARSING") return "warning";
  return "secondary";
}

async function fetchImportJobStatus(jobId: string) {
  const { data } = await api.get(`/kpi_maintenance/inteligencia/analisis-lubricante/import/${jobId}`);
  importJob.value = unwrap<AnyRow | null>(data, null);
  if (importJob.value?.producto_id) {
    importProductId.value = String(importJob.value.producto_id);
  }
  if (importJob.value?.equipo_id) {
    importEquipmentId.value = String(importJob.value.equipo_id);
  }

  if (!importJob.value) {
    stopImportPolling();
    persistActiveImportJob(null);
    dismissImportCardNow();
    return;
  }

  clearImportDismissTimer();
  persistActiveImportJob(importJob.value);

  const status = String(importJob.value?.status ?? "").toUpperCase();
  if (!isTerminalImportStatus(status)) {
    return;
  }

  stopImportPolling();
  persistActiveImportJob(null);
  lastImportSummary.value = importJob.value?.summary ?? null;
  await loadAll();

  if (status === "COMPLETED") {
    const errors = Number(importJob.value?.errors?.length ?? 0);
    if (errors > 0) {
      await notifyImportLifecycle({
        title: "Carga de analisis de lubricante finalizada",
        message: `Importacion finalizada con ${errors} error(es). Revisa el log transaccional.`,
        variant: "warning",
        tag: "lubricant-import-completed",
      });
    } else {
      await notifyImportLifecycle({
        title: "Carga de analisis de lubricante finalizada",
        message: "Excel de lubricante importado correctamente.",
        variant: "success",
        tag: "lubricant-import-completed",
      });
    }
  } else {
    await notifyImportLifecycle({
      title: "Carga de analisis de lubricante fallida",
      message: importJob.value?.error_message || "La importacion del Excel fallo.",
      variant: "error",
      tag: "lubricant-import-failed",
    });
  }

  scheduleImportCardDismiss();
}

async function processWorkbookImport() {
  if (!canCreate.value) {
    ui.error("No tienes permisos para importar análisis de lubricante.");
    return;
  }
  if (!importProductId.value) {
    ui.error("Debes seleccionar el aceite que se asignará a los análisis del Excel.");
    return;
  }
  if (!importEquipmentId.value) {
    ui.error("Debes seleccionar el equipo que se asignará a los análisis del Excel.");
    return;
  }
  const file = getSelectedImportFile();
  if (!file) {
    ui.error("Debes seleccionar un archivo Excel para importar.");
    return;
  }

  importing.value = true;
  try {
    stopImportPolling();
    clearImportDismissTimer();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("producto_id", importProductId.value);
    formData.append("equipo_id", importEquipmentId.value);
    formData.append("upsert_existing", "true");
    formData.append("requested_by", currentUserName());
    if (currentUserEmail()) formData.append("requested_by_email", currentUserEmail());
    if (currentUserId()) formData.append("requested_user_id", currentUserId());

    const { data } = await api.post(
      "/kpi_maintenance/inteligencia/analisis-lubricante/import/upload",
      formData,
    );

    importJob.value = unwrap<AnyRow | null>(data, null);
    lastImportSummary.value = null;
    persistActiveImportJob(importJob.value);
    await notifyImportLifecycle({
      title: "Carga de analisis de lubricante iniciada",
      message: "Archivo subido. La importacion se esta ejecutando en segundo plano.",
      variant: "info",
      requestPermission: true,
      tag: "lubricant-import-started",
    });

    if (importJob.value?.id) {
      startImportPolling(String(importJob.value.id));
      await fetchImportJobStatus(String(importJob.value.id));
    }
  } catch (e: any) {
    ui.error(e?.response?.data?.message || e?.message || "No se pudo importar el Excel de lubricante.");
  } finally {
    importing.value = false;
  }
}

async function restoreActiveImportJob() {
  const jobId = getPersistedImportJobId();
  if (!jobId) return;
  try {
    void ensureFormCatalogs();
    await fetchImportJobStatus(jobId);
    if (importJob.value && !isTerminalImportStatus(importJob.value.status)) {
      startImportPolling(jobId);
    }
  } catch {
    persistActiveImportJob(null);
    dismissImportCardNow();
  }
}

async function downloadImportTemplate() {
  downloadingTemplate.value = true;
  try {
    const response = await api.get(
      "/kpi_maintenance/inteligencia/analisis-lubricante/import/template",
      {
        responseType: "blob",
      },
    );
    const blob = response.data as Blob;
    const disposition = String(response.headers?.["content-disposition"] || "");
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const fileName = match?.[1] || "FORMATO_CARGA_ANALISIS_LUBRICANTE.xlsx";
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    ui.error(
      e?.response?.data?.message ||
        "No se pudo descargar el formato de carga del análisis de lubricante.",
    );
  } finally {
    downloadingTemplate.value = false;
  }
}

/* --------------------------- Formulario -------------------------------- */

const groupedFormDetails = computed(() => groupLubricantDetails(form.detalles));
const importProgress = computed(() => Number(importJob.value?.progress ?? 0));
const importLogs = computed(() => (Array.isArray(importJob.value?.logs) ? importJob.value.logs : []));
const canPurgeAnalyses = computed(() => canPurgeLubricantAnalyses(auth.user));
const canConfirmPurge = computed(
  () => purgeConfirmation.value.trim().toUpperCase() === "ELIMINAR TODO",
);

function resetForm() {
  editingId.value = null;
  Object.assign(form, {
    codigo: "",
    producto_id: null,
    cliente: "JUSTICE COMPANY",
    equipo_id: null,
    lubricante: "",
    marca_lubricante: "",
    compartimento_principal: "MOTOR",
    fecha_muestra: "",
    fecha_ingreso: "",
    fecha_reporte: "",
    numero_muestra: "",
    horas_equipo: null,
    horas_lubricante: null,
    condicion: "NORMAL",
    equipo_marca: "",
    equipo_serie: "",
    equipo_modelo: "",
    detalles: mergeLubricantDetails("MOTOR"),
  });
}

function openPurgeDialog() {
  purgeConfirmation.value = "";
  purgeDialog.value = true;
}

function closePurgeDialog() {
  purgeDialog.value = false;
  purgeConfirmation.value = "";
}

function applySelectedEquipmentSnapshot() {
  const equipment = form.equipo_id ? equipmentMap.value.get(form.equipo_id) : null;
  if (!equipment) {
    form.equipo_marca = "";
    return;
  }
  form.equipo_marca = resolveEquipmentBrand(equipment);
}

async function assignCode() {
  codeLoading.value = true;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/next-code");
    const resolved = unwrap<any>(data, {});
    form.codigo = resolved?.code || "";
  } finally {
    codeLoading.value = false;
  }
}

function applyDetailTemplate() {
  form.detalles = mergeLubricantDetails(form.compartimento_principal || "GENERAL");
}

function handleCompartmentChange() {
  form.detalles = mergeLubricantDetails(
    form.compartimento_principal || "GENERAL",
    form.detalles,
  );
}

async function openCreate() {
  if (!canCreate.value) return;
  resetForm();
  dialog.value = true;
  void ensureFormCatalogs();
  await assignCode();
}

function fillFormFromAnalysis(item: AnyRow) {
  const sample = item.sample_info ?? {};
  Object.assign(form, {
    codigo: item.codigo || "",
    producto_id: item.producto_id || null,
    cliente: item.cliente || "JUSTICE COMPANY",
    equipo_id: item.equipo_id || null,
    lubricante: item.lubricante || "",
    marca_lubricante: item.marca_lubricante || "",
    compartimento_principal: item.compartimento_principal || "MOTOR",
    fecha_muestra: item.fecha_muestra || "",
    fecha_ingreso: sample.fecha_ingreso || "",
    fecha_reporte: sample.fecha_informe || item.fecha_reporte || "",
    numero_muestra: sample.numero_muestra || "",
    horas_equipo: sample.horas_equipo ?? null,
    horas_lubricante: sample.horas_lubricante ?? null,
    condicion: sample.condicion || item.estado_diagnostico || "NORMAL",
    equipo_marca: sample.equipo_marca || "",
    equipo_serie: sample.equipo_serie || "",
    equipo_modelo: sample.equipo_modelo || "",
    detalles: mergeLubricantDetails(
      item.compartimento_principal || "MOTOR",
      item.detalles ?? [],
    ),
  });
}

async function openEdit(item: AnyRow) {
  if (!canEdit.value) return;
  let analysis: AnyRow;
  try {
    const [loaded] = await Promise.all([loadAnalysisWithDetails(item), ensureFormCatalogs()]);
    analysis = loaded;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo cargar el detalle del análisis.");
    return;
  }
  editingId.value = analysis.id;
  fillFormFromAnalysis(analysis);
  if (form.producto_id) applySelectedOilSnapshot(form.producto_id);
  dialog.value = true;
}

function openDelete(item: AnyRow) {
  if (!canDelete.value) return;
  deletingId.value = item.id;
  deleteDialog.value = true;
}

function buildDetailPayload(detail: AnyRow) {
  const template = getLubricantParameterTemplate(
    detail.parametro_key || detail.parametro,
  );
  const inputType = template?.inputType || "number";
  const base = {
    compartimento: form.compartimento_principal || "GENERAL",
    parametro: template?.label || detail.parametro,
    orden: template?.order ?? detail.orden ?? null,
  } as AnyRow;

  if (inputType === "select" || inputType === "text") {
    return {
      ...base,
      resultado_texto: String(detail.resultado_texto ?? "").trim() || null,
      resultado_numerico: null,
    };
  }

  return {
    ...base,
    resultado_numerico:
      detail.resultado_numerico == null || detail.resultado_numerico === ""
        ? null
        : Number(detail.resultado_numerico),
    resultado_texto: null,
  };
}

async function save() {
  if (!canPersistForm.value) return;
  if (!form.producto_id) {
    ui.error("Debes seleccionar el aceite analizado.");
    return;
  }
  if (!form.equipo_id) {
    ui.error("Debes seleccionar el equipo analizado.");
    return;
  }
  saving.value = true;
  try {
    const payload = {
      codigo: form.codigo,
      producto_id: form.producto_id,
      cliente: form.cliente,
      equipo_id: form.equipo_id,
      lubricante: form.lubricante,
      marca_lubricante: form.marca_lubricante,
      compartimento_principal: form.compartimento_principal,
      fecha_muestra: form.fecha_muestra || null,
      fecha_reporte: form.fecha_reporte || null,
      payload_json: {
        sample_info: {
          numero_muestra: form.numero_muestra || null,
          fecha_ingreso: form.fecha_ingreso || null,
          fecha_informe: form.fecha_reporte || null,
          horas_equipo: form.horas_equipo,
          horas_lubricante: form.horas_lubricante,
          condicion: form.condicion,
          equipo_marca: form.equipo_marca || null,
          equipo_serie: form.equipo_serie || null,
          equipo_modelo: form.equipo_modelo || null,
        },
        actor_user_id: currentUserId() || null,
        actor_username: currentUserName(),
        actor_name: auth.user?.nameSurname || auth.user?.nameUser || null,
        actor_email: currentUserEmail() || null,
        actor_role: auth.user?.role?.nombre || null,
        created_by: editingId.value ? undefined : currentUserName(),
        created_by_email: editingId.value ? undefined : currentUserEmail() || null,
        updated_by: currentUserName(),
        updated_by_email: currentUserEmail() || null,
      },
      detalles: form.detalles.map(buildDetailPayload),
    };

    if (editingId.value) {
      await api.patch(`/kpi_maintenance/inteligencia/analisis-lubricante/${editingId.value}`, payload);
      ui.success("Analisis de lubricante actualizado.");
    } else {
      const { data } = await api.post("/kpi_maintenance/inteligencia/analisis-lubricante", payload);
      const created = unwrap<any>(data, {});
      if (created?.code_was_reassigned) {
        ui.open(`El codigo fue reasignado automaticamente a ${created.codigo}.`, "warning");
      } else {
        ui.success("Analisis de lubricante creado.");
      }
    }

    dialog.value = false;
    await loadAll();
    await refreshOpenWorkspace();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar el analisis.");
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!deletingId.value) return;
  saving.value = true;
  try {
    await api.delete(`/kpi_maintenance/inteligencia/analisis-lubricante/${deletingId.value}`);
    ui.success("Analisis de lubricante eliminado.");
    deleteDialog.value = false;
    deletingId.value = null;
    await loadAll();
    await refreshOpenWorkspace();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar el analisis.");
  } finally {
    saving.value = false;
  }
}

async function confirmPurge() {
  if (!canPurgeAnalyses.value) {
    ui.error("Solo el Super Administrador puede eliminar toda la informacion de lubricantes.");
    return;
  }
  if (!canConfirmPurge.value) {
    ui.error("Debes escribir exactamente ELIMINAR TODO para continuar.");
    return;
  }

  purging.value = true;
  try {
    stopImportPolling();
    const { data } = await api.post("/kpi_maintenance/inteligencia/analisis-lubricante/purge", {
      confirmation: purgeConfirmation.value.trim(),
      requested_by: currentUserName(),
      purge_import_jobs: true,
    });
    const summary = unwrap<AnyRow>(data, {});

    analyses.value = [];
    dashboard.value = null;
    selectedGroupKey.value = null;
    groupDetailDialog.value = false;
    workspaceOpen.value = false;
    persistActiveImportJob(null);
    dismissImportCardNow();
    importJob.value = null;
    lastImportSummary.value = null;
    importFile.value = null;
    importProductId.value = null;
    importEquipmentId.value = null;
    tableSearch.value = "";
    conditionFilter.value = null;
    parameterFilter.value = null;
    closePurgeDialog();

    await loadAll();

    ui.success(
      `Información eliminada. Analisis: ${Number(summary.deleted_analyses ?? 0)}, detalles: ${Number(summary.deleted_details ?? 0)}, alertas: ${Number(summary.deleted_alerts ?? 0)}.`,
    );
  } catch (e: any) {
    ui.error(
      e?.response?.data?.message ||
        "No se pudo eliminar toda la informacion del modulo de lubricantes.",
    );
  } finally {
    purging.value = false;
  }
}

watch(
  () => form.equipo_id,
  () => {
    applySelectedEquipmentSnapshot();
  },
);

const motionRoot = useRevealMotion<HTMLElement>(() => loading.value);

// Por funcion y no por cadena, como en el Dashboard Gerencia: asi el motor
// recibe el elemento y no una instancia de componente.
function setMotionRoot(el: unknown) {
  motionRoot.value = resolveMotionElement(el);
}

onMounted(async () => {
  await loadAll();
  if (canCreate.value) await restoreActiveImportJob();
});

onUnmounted(() => {
  stopImportPolling();
  clearImportDismissTimer();
});
</script>

<style scoped>
.lub-report {
  --manager-blue: 37, 99, 235;
  display: grid;
  /* Sin columna declarada la pista se dimensiona a la tabla mas ancha y la
     pantalla pierde el lado derecho (mismo arreglo que el Dashboard Gerencia). */
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(14px, 1.5vw, 22px);
  color: rgb(var(--v-theme-on-surface));
}

.lub-report > * {
  min-width: 0;
}

.report-heading,
.simple-section {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
}

.report-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(16px, 1.5vw, 22px);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(var(--manager-blue), 0.11), transparent 58%),
    rgb(var(--v-theme-surface));
}

.report-heading__copy {
  min-width: 0;
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
  font-size: clamp(1.85rem, 3vw, 2.65rem);
}

.report-heading p,
.section-title-row p {
  max-width: 72ch;
  margin: 7px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 1rem;
}

.report-heading__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.report-heading__tools .v-btn,
.range-presets__btn.v-btn {
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.report-heading__actions {
  display: grid;
  gap: 12px;
  min-width: min(560px, 46vw);
}

.report-heading__dates,
.report-heading__filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 12px;
}

.range-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.section-title-row h2 {
  font-size: clamp(1.4rem, 2.5vw, 1.9rem);
}

.simple-section {
  padding: clamp(18px, 2.4vw, 28px);
  border-radius: 24px;
}

.summary-deck {
  --kpi-rail-card: clamp(340px, 26vw, 440px);
  overflow: hidden;
}

.summary-deck :deep(.kpi-insight) {
  gap: 8px;
  min-height: 360px;
  padding: 16px;
}

.equipment-search {
  max-width: 340px;
  min-width: 240px;
}

.active-filter {
  margin-bottom: 12px;
}

.equipment-report {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.equipment-report__head,
.equipment-report__row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) 128px 150px minmax(0, 1.7fr) 132px 24px;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  text-align: left;
}

.equipment-report__head {
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.equipment-report__head span:nth-child(5) {
  text-align: right;
}

.equipment-report__scroll {
  max-height: 560px;
  overflow-y: auto;
}

.equipment-report__row {
  --row-tone: var(--v-theme-success);
  width: 100%;
  min-height: 64px;
  border: 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-left: 4px solid rgb(var(--row-tone));
  background: transparent;
  color: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.equipment-report__row--warning {
  --row-tone: var(--v-theme-warning);
}

.equipment-report__row--error {
  --row-tone: var(--v-theme-error);
}

.equipment-report__row--secondary {
  --row-tone: var(--v-theme-secondary);
}

.equipment-report__scroll > .equipment-report__row:first-child {
  border-top: 0;
}

.equipment-report__row:hover {
  background: rgba(var(--manager-blue), 0.075);
}

.equipment-report__row:focus-visible {
  outline: 4px solid rgba(var(--manager-blue), 0.28);
  outline-offset: -4px;
}

.equipment-report__name,
.equipment-report__cell {
  display: grid;
  gap: 2px;
  min-width: 0;
  justify-items: start;
}

.equipment-report__name strong {
  font-weight: 650;
  overflow-wrap: anywhere;
}

.equipment-report__row small {
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.8rem;
}

.equipment-report__cell--num {
  justify-items: end;
  font-variant-numeric: tabular-nums;
}

/* Sin la cabecera de columnas (pantallas angostas) el número necesita su palabra. */
.equipment-report__unit {
  display: none;
}

.equipment-report__findings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.finding-tag {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.5;
}

.finding-tag--warning {
  background: rgba(var(--v-theme-warning), 0.14);
  color: rgb(var(--v-theme-on-surface));
}

.finding-tag--error {
  background: rgba(var(--v-theme-error), 0.14);
  color: rgb(var(--v-theme-on-surface));
}

.compact-empty {
  padding: 22px;
  border-radius: 14px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  background: rgba(var(--v-theme-on-surface), 0.045);
  text-align: center;
}

.guide-levels {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.guide-level {
  --guide-tone: var(--v-theme-success);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--guide-tone), 0.3);
  border-left: 4px solid rgb(var(--guide-tone));
  border-radius: 14px;
  background: rgba(var(--guide-tone), 0.06);
}

.guide-level .v-icon {
  color: rgb(var(--guide-tone));
}

.guide-level--warning {
  --guide-tone: var(--v-theme-warning);
}

.guide-level--error {
  --guide-tone: var(--v-theme-error);
}

.guide-level--secondary {
  --guide-tone: var(--v-theme-secondary);
}

.guide-level p {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.9rem;
}

.guide-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.guide-notes p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.94rem;
  line-height: 1.55;
}

.guide-glossary {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 14px;
  overflow: hidden;
}

.guide-params {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px 20px;
  margin: 0;
}

.guide-params dt {
  font-weight: 700;
}

.guide-params dd {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.9rem;
}

.guide-params dd span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.section-workspace {
  display: flex;
  width: 100%;
  height: min(94dvh, 1080px);
  max-height: calc(100dvh - 24px);
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  background: rgb(var(--v-theme-background));
}

.section-workspace__header {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 18px;
  background: rgb(var(--v-theme-surface));
}

.section-workspace__heading {
  min-width: 0;
}

.section-workspace__heading span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.82rem;
}

.section-workspace__heading h2 {
  margin: 1px 0 0;
  font-size: clamp(1.15rem, 2vw, 1.6rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.section-workspace__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-workspace__tools .v-btn {
  border-radius: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.section-workspace__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: clamp(14px, 2vw, 26px) !important;
  overflow: auto;
  overscroll-behavior: contain;
}

.import-panel {
  min-width: 0;
}

.import-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.import-log {
  display: grid;
  gap: 6px;
  max-height: 180px;
  overflow: auto;
  padding: 10px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.import-log__line {
  display: grid;
  gap: 4px;
  font-size: 12px;
}

.detail-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.detail-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: rgba(var(--v-theme-surface), 0.45);
}

.detail-card__title {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

@media (max-width: 1280px) {
  .report-heading {
    flex-direction: column;
  }

  .report-heading__actions {
    width: 100%;
    min-width: 0;
  }

  .guide-levels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .equipment-report__head {
    display: none;
  }

  .equipment-report__row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 14px;
  }

  .equipment-report__name,
  .equipment-report__findings {
    grid-column: 1 / -1;
  }

  .equipment-report__row > .v-icon {
    display: none;
  }

  .equipment-report__cell--num {
    justify-items: start;
  }

  .equipment-report__unit {
    display: inline;
  }
}

@media (max-width: 760px) {
  .report-heading__dates,
  .report-heading__filters,
  .guide-notes,
  .guide-levels {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .equipment-search {
    max-width: none;
    min-width: 0;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .equipment-report__row {
    transition: none;
  }
}
</style>

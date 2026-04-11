<template>
  <div class="lubricant-page">
    <v-card rounded="xl" class="pa-5 enterprise-surface">
      <div class="responsive-header page-wrap">
        <div>
          <div class="text-h6 font-weight-bold">Analisis de lubricante</div>
          <div class="text-body-2 text-medium-emphasis">
            Captura operativa alineada al formato del reporte de laboratorio.
          </div>
        </div>
        <div class="responsive-actions page-wrap">
          <v-btn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="openCreate">
            Nuevo analisis
          </v-btn>
          <v-btn
            v-if="canAccessLubricantReports"
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-file-excel"
            :loading="isExporting('excel')"
            @click="exportAnalyses('excel')"
          >
            Excel reporte
          </v-btn>
          <v-btn
            v-if="canAccessLubricantReports"
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-file-pdf-box"
            :loading="isExporting('pdf')"
            @click="exportAnalyses('pdf')"
          >
            PDF reporte
          </v-btn>
          <v-btn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-file-excel"
            :loading="importing"
            @click="processWorkbookImport"
          >
            Cargar Excel
          </v-btn>
          <v-btn
            color="secondary"
            variant="text"
            prepend-icon="mdi-download"
            :loading="downloadingTemplate"
            @click="downloadImportTemplate"
          >
            Descargar formato
          </v-btn>
          <v-btn
            v-if="canPurgeAnalyses"
            color="error"
            variant="tonal"
            prepend-icon="mdi-delete-alert"
            @click="openPurgeDialog"
          >
            Eliminar todo
          </v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="loadAll">
            Actualizar
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

      <v-row dense class="mt-3">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="tableSearch"
            label="Buscar lubricantes agrupados"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            hint="Busca por codigo, lubricante, marca, equipo, modelo o compartimento"
            persistent-hint
            clearable
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="statusFilter"
            :items="conditionOptions"
            item-title="title"
            item-value="value"
            label="Condicion"
            variant="outlined"
            density="compact"
            clearable
          />
        </v-col>
        <v-col cols="12" md="5">
          <v-autocomplete
            v-model="dashboardSelection"
            :items="catalogOptions"
            item-title="label"
            return-object
            clearable
            label="Dashboard por lubricante"
            variant="outlined"
            density="compact"
            hint="Selecciona un lubricante por codigo, nombre, equipo o modelo para ver su historial"
            persistent-hint
            @update:model-value="handleDashboardSelection"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="reportFrom"
            type="date"
            label="Reporte desde"
            variant="outlined"
            density="compact"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="reportTo"
            type="date"
            label="Reporte hasta"
            variant="outlined"
            density="compact"
          />
        </v-col>
      </v-row>

      <div class="summary-strip mt-2">
        <v-chip color="primary" variant="tonal" label>
          {{ analyses.length }} analisis
        </v-chip>
        <v-chip color="secondary" variant="tonal" label>
          {{ catalogOptions.length }} grupos registrados
        </v-chip>
        <v-chip color="error" variant="tonal" label>
          {{ alertCount }} anormales
        </v-chip>
      </div>

      <v-row dense class="mt-3">
        <v-col cols="12" md="8">
          <v-file-input
            v-model="importFile"
            accept=".xlsx,.xls"
            prepend-icon="mdi-file-excel"
            label="Selecciona el archivo Excel de lubricante"
            variant="outlined"
            density="compact"
            show-size
            hide-details="auto"
          />
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center">
          <v-chip v-if="lastImportSummary" color="success" variant="tonal" label>
            Creados: {{ lastImportSummary.created }} · Actualizados: {{ lastImportSummary.updated }} · Errores: {{ lastImportSummary.errors.length }}
          </v-chip>
        </v-col>
      </v-row>

      <v-card v-if="importJob" class="mt-4" rounded="lg" variant="tonal">
        <v-card-text>
          <div class="responsive-header page-wrap mb-2">
            <div>
              <div class="text-subtitle-2 font-weight-bold">Carga en servidor</div>
              <div class="text-caption text-medium-emphasis">
                {{ importJob.source_file_name || importJob.stored_file_name || "Archivo Excel" }}
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
          />

          <div class="responsive-header page-wrap mt-2">
            <div class="text-body-2">
              {{ importJob.current_step || "En espera" }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ importProgress }}%
            </div>
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
              <div
                v-for="(item, index) in importJob.errors"
                :key="`error-${index}`"
                class="import-log__line"
              >
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
    </v-card>

    <v-card rounded="xl" class="pa-4 enterprise-surface">
      <v-data-table
        :headers="groupHeaders"
        :items="filteredLubricantGroups"
        :loading="loading"
        loading-text="Obteniendo análisis de lubricante..."
        :items-per-page="15"
        class="enterprise-table lubricant-groups-table"
      >
        <template #item.lubricante_group="{ item }">
          <div class="font-weight-medium">{{ item.lubricante || "Sin lubricante" }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ item.marca_lubricante || "Sin marca del lubricante" }}
          </div>
        </template>
        <template #item.equipo_group="{ item }">
          <div class="font-weight-medium">{{ item.equipo_label || "Sin equipo" }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ item.equipo_codigo || item.equipo_nombre || "Sin referencia" }}
          </div>
        </template>
        <template #item.equipo_modelo="{ item }">
          <span>{{ item.equipo_modelo || "Sin modelo" }}</span>
        </template>
        <template #item.ultimo_codigo="{ item }">
          <div class="font-weight-medium">{{ item.ultimo_codigo || "Sin codigo" }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ item.total_analisis }} analisis registrados
          </div>
        </template>
        <template #item.compartimentos="{ item }">
          <div class="group-compartments">
            <v-chip
              v-for="compartimento in item.compartimentos"
              :key="`${item.group_key}-${compartimento}`"
              size="x-small"
              variant="tonal"
              color="secondary"
            >
              {{ compartimento }}
            </v-chip>
            <span v-if="!item.compartimentos?.length" class="text-medium-emphasis">Sin compartimentos</span>
          </div>
        </template>
        <template #item.ultimo_informe="{ item }">
          <div class="font-weight-medium">{{ item.ultimo_informe || "Sin fecha" }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ item.ultimo_numero_muestra || "Sin muestra" }}
          </div>
        </template>
        <template #item.estado_resumen="{ item }">
          <div class="d-flex flex-wrap" style="gap: 6px;">
            <v-chip size="small" :color="conditionColor(item.ultimo_estado)" variant="tonal">
              {{ item.ultimo_estado || "N/D" }}
            </v-chip>
            <v-chip v-if="item.anormales > 0" size="small" color="error" variant="tonal">
              {{ item.anormales }} anormales
            </v-chip>
          </div>
        </template>
        <template #item.actions="{ item }">
          <div class="responsive-actions justify-end">
            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-chart-line"
              @click="viewDashboardGroup(item)"
            >
              Dashboard
            </v-btn>
            <v-btn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-file-document-search"
              @click="openGroupDetail(item)"
            >
              Ver detalle
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-card rounded="xl" class="pa-5 enterprise-surface">
      <div class="d-flex align-center justify-space-between page-wrap mb-4">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Dashboard historico</div>
          <div class="text-body-2 text-medium-emphasis">
            Historial, evaluacion de la ultima muestra y tendencias por rango de fechas.
          </div>
        </div>
        <div class="d-flex page-wrap" style="gap: 8px;">
          <v-select
            v-model="dashboardPeriod"
            :items="periodOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 150px;"
            @update:model-value="reloadDashboard"
          />
          <v-text-field
            v-model="dashboardFrom"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            label="Desde"
            style="min-width: 160px;"
            @change="reloadDashboard"
          />
          <v-text-field
            v-model="dashboardTo"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            label="Hasta"
            style="min-width: 160px;"
            @change="reloadDashboard"
          />
          <v-select
            v-model="dashboardCompartimento"
            :items="compartmentOptions"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            label="Compartimento"
            style="min-width: 220px;"
            @update:model-value="reloadDashboard"
          />
        </div>
      </div>

      <LubricantDashboardPanel
        :dashboard="dashboard"
        :loading="dashboardLoading"
        :error="dashboardError"
      />
    </v-card>

    <v-dialog v-model="dialog" :fullscreen="isFormDialogFullscreen" :max-width="isFormDialogFullscreen ? undefined : 1400">
      <v-card rounded="xl" class="enterprise-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ editingId ? "Editar" : "Crear" }} analisis de lubricante
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4 section-surface">
          <v-row dense>
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
                label="Equipo"
                variant="outlined"
                clearable
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
              <v-combobox
                v-model="lubricantSelection"
                v-model:search="lubricantSearch"
                :items="catalogOptions"
                item-title="label"
                return-object
                clearable
                label="Lubricante"
                variant="outlined"
                hint="Escribe el codigo o nombre del lubricante para autocompletar registros previos"
                persistent-hint
                @update:model-value="handleLubricantSelection"
                @update:search="handleLubricantSearch"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.marca_lubricante" label="Marca del lubricante" variant="outlined" />
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
              <div class="responsive-header mb-2 page-wrap">
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
        <v-card-title class="responsive-header page-wrap">
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              {{ selectedGroup?.lubricante || "Lubricante" }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedGroup?.marca_lubricante || "Sin marca del lubricante" }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ selectedGroup?.equipo_label || "Sin equipo" }} · {{ selectedGroup?.equipo_modelo || "Sin modelo" }}
            </div>
          </div>
          <div class="d-flex flex-wrap" style="gap: 8px;">
            <v-chip color="primary" variant="tonal" label>
              {{ selectedGroup?.total_analisis ?? 0 }} analisis
            </v-chip>
            <v-chip color="secondary" variant="tonal" label>
              Ultimo informe: {{ selectedGroup?.ultimo_informe || "Sin fecha" }}
            </v-chip>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <div class="responsive-header page-wrap mb-4">
            <div class="text-body-2 text-medium-emphasis">
              Revisa todos los analisis que pertenecen a este mismo lubricante, marca, equipo y modelo.
            </div>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-chart-line"
              :disabled="!selectedGroup"
              @click="selectedGroup && viewDashboardGroup(selectedGroup)"
            >
              Ver dashboard del grupo
            </v-btn>
          </div>

          <v-table density="compact" class="enterprise-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Muestra</th>
                <th>Compartimento</th>
                <th>Condicion</th>
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
                  <v-chip size="x-small" :color="conditionColor(item.sample_info?.condicion || item.estado_diagnostico)" variant="tonal">
                    {{ item.sample_info?.condicion || item.estado_diagnostico || "N/D" }}
                  </v-chip>
                </td>
                <td>{{ resolveAnalysisReportDate(item) || "Sin fecha" }}</td>
                <td>{{ item.sample_info?.horas_equipo ?? "N/A" }}</td>
                <td>{{ item.sample_info?.horas_lubricante ?? "N/A" }}</td>
                <td>
                  <div class="d-flex justify-end flex-wrap" style="gap: 4px;">
                    <v-btn v-if="canEdit" icon="mdi-pencil" variant="text" @click="openEditFromGroup(item)" />
                    <v-btn v-if="canDelete" icon="mdi-delete" variant="text" color="error" @click="openDeleteFromGroup(item)" />
                  </div>
                </td>
              </tr>
              <tr v-if="!selectedGroupItems.length">
                <td colspan="8" class="text-center text-medium-emphasis py-6">
                  No hay analisis para este grupo.
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
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { canPurgeLubricantAnalyses } from "@/app/utils/role-access";
import { hasReportAccess } from "@/app/config/report-access";
import LubricantDashboardPanel from "@/components/maintenance/LubricantDashboardPanel.vue";
import {
  buildLubricantReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";
import {
  groupLubricantDetails,
  humidityOptions,
  lubricantCompartments,
  lubricantConditionOptions,
  getLubricantParameterTemplate,
  mergeLubricantDetails,
} from "@/app/config/lubricant-analysis";

type AnyRow = Record<string, any>;
type LubricantGroupRow = {
  group_key: string;
  lubricante: string;
  marca_lubricante: string;
  equipo_id: string | null;
  equipo_codigo: string | null;
  equipo_nombre: string | null;
  equipo_label: string | null;
  equipo_modelo: string | null;
  items: AnyRow[];
  compartimentos: string[];
  compartimentos_set: Set<string>;
  total_analisis: number;
  anormales: number;
  ultimo_codigo: string;
  ultimo_informe: string;
  ultimo_numero_muestra: string;
  ultimo_estado: string;
  latest_item: AnyRow | null;
};

const ACTIVE_IMPORT_STORAGE_KEY = "kpi-justice:lubricant-import:active-job";

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown, smAndDown } = useDisplay();

const loading = ref(false);
const saving = ref(false);
const codeLoading = ref(false);
const dashboardLoading = ref(false);
const importing = ref(false);
const downloadingTemplate = ref(false);
const purging = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const groupDetailDialog = ref(false);

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, ["Analisis de lubricante", "Análisis de lubricante"]),
);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
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
const catalog = ref<AnyRow[]>([]);
const lubricantSearch = ref("");
const lubricantSelection = ref<any>(null);
const dashboardSelection = ref<any>(null);
const importFile = ref<File | null>(null);
const lastImportSummary = ref<AnyRow | null>(null);
const importJob = ref<AnyRow | null>(null);
const importPollHandle = ref<number | null>(null);
const importDismissHandle = ref<number | null>(null);
const purgeConfirmation = ref("");
const tableSearch = ref("");
const statusFilter = ref<string | null>(null);
const dashboardPeriod = ref("MENSUAL");
const dashboardFrom = ref("");
const dashboardTo = ref("");
const dashboardCompartimento = ref<string | null>(null);
const reportFrom = ref("");
const reportTo = ref("");
const exportState = reactive<Record<string, boolean>>({});
const isFormDialogFullscreen = computed(() => mdAndDown.value);
const isGroupDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);

const groupHeaders = [
  { title: "Ultimo codigo", key: "ultimo_codigo" },
  { title: "Lubricante", key: "lubricante_group" },
  { title: "Equipo", key: "equipo_group" },
  { title: "Modelo", key: "equipo_modelo" },
  { title: "Compartimentos", key: "compartimentos", sortable: false },
  { title: "Ultimo informe", key: "ultimo_informe" },
  { title: "Estado", key: "estado_resumen", sortable: false },
  { title: "Acciones", key: "actions", sortable: false },
];

const conditionOptions = lubricantConditionOptions;
const compartmentOptions = lubricantCompartments;
const humidityValueOptions = humidityOptions.map((item) => item.value);

const periodOptions = [
  { value: "SEMANAL", title: "Semanal" },
  { value: "MENSUAL", title: "Mensual" },
  { value: "ANUAL", title: "Anual" },
  { value: "PERSONALIZADO", title: "Personalizado" },
];

const form = reactive({
  codigo: "",
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
    title: `${item.codigo || "EQ"} - ${item.nombre || "Equipo"}`,
    marca: resolveEquipmentBrand(item),
  })),
);

const catalogOptions = computed(() =>
  catalog.value.map((item) => ({
    ...item,
    label: [
      item.ultimo_codigo || item.lubricante_codigo,
      item.lubricante,
      item.marca_lubricante,
      item.equipo_label || item.equipo_codigo || item.equipo_nombre,
      item.equipo_modelo,
    ]
      .filter(Boolean)
      .join(" · "),
  })),
);

function resolveEquipmentLabel(item: AnyRow | null | undefined) {
  if (!item) return "";
  const equipoCodigo = String(item.equipo_codigo || item.sample_info?.equipo_codigo || "").trim();
  const equipoNombre = String(item.equipo_nombre || item.sample_info?.equipo_nombre || "").trim();
  if (equipoCodigo && equipoNombre && equipoCodigo !== equipoNombre) {
    return `${equipoCodigo} - ${equipoNombre}`;
  }
  return equipoCodigo || equipoNombre || "";
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

function resolveAnalysisReportDate(item: AnyRow) {
  return (
    String(
      item?.sample_info?.fecha_informe ||
        item?.fecha_reporte ||
        item?.sample_info?.fecha_ingreso ||
        item?.fecha_muestra ||
        "",
    ).trim() || null
  );
}

function resolveAnalysisCondition(item: AnyRow) {
  return (
    String(item?.sample_info?.condicion || item?.estado_diagnostico || "N/D").trim() ||
    "N/D"
  );
}

function compareAnalysisByLatestDate(left: AnyRow, right: AnyRow) {
  const leftDate = resolveAnalysisReportDate(left) || "";
  const rightDate = resolveAnalysisReportDate(right) || "";
  if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
  return String(right?.codigo || "").localeCompare(String(left?.codigo || ""));
}

function parseReportDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinReportRange(item: AnyRow) {
  const reportDate = parseReportDate(resolveAnalysisReportDate(item) || item?.fecha_muestra || item?.created_at);
  if (!reportDate) return false;
  const from = reportFrom.value ? parseReportDate(reportFrom.value) : null;
  const to = reportTo.value ? parseReportDate(reportTo.value) : null;
  if (from && reportDate < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (reportDate > end) return false;
  }
  return true;
}

function analysisMatchesSearch(item: AnyRow, search: string) {
  if (!search) return true;
  return [
    item.codigo,
    item.lubricante,
    item.marca_lubricante,
    item.equipo_codigo,
    item.equipo_nombre,
    item.sample_info?.equipo_modelo,
    item.compartimento_principal,
    item.sample_info?.numero_muestra,
    item.sample_info?.fecha_informe,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(search));
}

const groupedAnalyses = computed<LubricantGroupRow[]>(() => {
  const groups = new Map<string, LubricantGroupRow>();

  for (const item of analyses.value) {
    const equipmentLabel = resolveEquipmentLabel(item);
    const equipmentModel = resolveEquipmentModel(item) || null;
    const groupKey = buildLubricantGroupKey(
      item.lubricante,
      item.marca_lubricante,
      item.equipo_id,
      item.equipo_codigo,
      item.equipo_nombre,
      equipmentModel,
    );
    const group =
      groups.get(groupKey) ??
      {
        group_key: groupKey,
        lubricante: item.lubricante || "Sin lubricante",
        marca_lubricante: item.marca_lubricante || "Sin marca del lubricante",
        equipo_id: item.equipo_id || null,
        equipo_codigo: item.equipo_codigo || null,
        equipo_nombre: item.equipo_nombre || null,
        equipo_label: equipmentLabel || null,
        equipo_modelo: equipmentModel,
        items: [] as AnyRow[],
        compartimentos: [] as string[],
        compartimentos_set: new Set<string>(),
        total_analisis: 0,
        anormales: 0,
        ultimo_codigo: "",
        ultimo_informe: "",
        ultimo_numero_muestra: "",
        ultimo_estado: "N/D",
        latest_item: null as AnyRow | null,
      };

    group.items.push(item);
    group.total_analisis += 1;

    const compartimento = String(item.compartimento_principal || "").trim();
    if (compartimento && !group.compartimentos_set.has(compartimento)) {
      group.compartimentos_set.add(compartimento);
      group.compartimentos.push(compartimento);
    }

    if (resolveAnalysisCondition(item) === "ANORMAL") {
      group.anormales += 1;
    }

    if (!group.latest_item || compareAnalysisByLatestDate(item, group.latest_item) < 0) {
      group.latest_item = item;
      group.ultimo_codigo = String(item.codigo || "").trim();
      group.ultimo_informe = resolveAnalysisReportDate(item) || "";
      group.ultimo_numero_muestra = String(item.sample_info?.numero_muestra || "").trim();
      group.ultimo_estado = resolveAnalysisCondition(item);
    }

    groups.set(groupKey, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort(compareAnalysisByLatestDate),
      compartimentos: [...group.compartimentos].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const dateCompare = String(b.ultimo_informe || "").localeCompare(String(a.ultimo_informe || ""));
      if (dateCompare !== 0) return dateCompare;
      const lubricanteCompare = String(a.lubricante || "").localeCompare(String(b.lubricante || ""));
      if (lubricanteCompare !== 0) return lubricanteCompare;
      const equipoCompare = String(a.equipo_label || "").localeCompare(String(b.equipo_label || ""));
      if (equipoCompare !== 0) return equipoCompare;
      return String(a.equipo_modelo || "").localeCompare(String(b.equipo_modelo || ""));
    });
});

const filteredLubricantGroups = computed<LubricantGroupRow[]>(() => {
  const search = String(tableSearch.value || "").trim().toLowerCase();
  return groupedAnalyses.value.filter((group) =>
    group.items.some((item: AnyRow) => {
      const condition = resolveAnalysisCondition(item);
      if (statusFilter.value && condition !== statusFilter.value) return false;
      return analysisMatchesSearch(item, search);
    }),
  );
});

const reportAnalyses = computed(() =>
  analyses.value
    .filter((item) => isWithinReportRange(item))
    .filter((item) => !statusFilter.value || resolveAnalysisCondition(item) === statusFilter.value),
);

function exportKey(format: "excel" | "pdf") {
  return `lubricant:${format}`;
}

function isExporting(format: "excel" | "pdf") {
  return Boolean(exportState[exportKey(format)]);
}

async function exportAnalyses(format: "excel" | "pdf") {
  if (!canAccessLubricantReports.value) {
    ui.error("No tienes permisos para generar reportes de análisis de lubricante.");
    return;
  }
  const key = exportKey(format);
  exportState[key] = true;
  error.value = null;
  try {
    const report = buildLubricantReport(reportAnalyses.value);
    report.subtitle = `Resultados filtrados${
      reportFrom.value || reportTo.value
        ? ` del ${reportFrom.value || "..."} al ${reportTo.value || "..."}`
        : " sin restricción de fechas"
    }.`;
    if (format === "excel") {
      await downloadReportExcel(report);
    } else {
      await downloadReportPdf(report);
    }
  } catch (e: any) {
    error.value = e?.message || "No se pudo generar el reporte de análisis de lubricante.";
  } finally {
    exportState[key] = false;
  }
}

const selectedGroup = computed<LubricantGroupRow | null>(
  () =>
    groupedAnalyses.value.find((group) => group.group_key === selectedGroupKey.value) ??
    null,
);

const selectedGroupItems = computed<AnyRow[]>(() => selectedGroup.value?.items ?? []);

const alertCount = computed(
  () =>
    analyses.value.filter(
      (item) => (item.sample_info?.condicion || item.estado_diagnostico) === "ANORMAL",
    ).length,
);

const groupedFormDetails = computed(() => groupLubricantDetails(form.detalles));
const importProgress = computed(() => Number(importJob.value?.progress ?? 0));
const importLogs = computed(() => (Array.isArray(importJob.value?.logs) ? importJob.value.logs : []));
const canPurgeAnalyses = computed(() => canPurgeLubricantAnalyses(auth.user));
const canConfirmPurge = computed(
  () => purgeConfirmation.value.trim().toUpperCase() === "ELIMINAR TODO",
);

function conditionColor(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ANORMAL") return "error";
  if (raw === "PRECAUCION") return "warning";
  if (raw === "N/D" || raw === "ND") return "secondary";
  return "success";
}

function resetForm() {
  editingId.value = null;
  lubricantSelection.value = null;
  Object.assign(form, {
    codigo: "",
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

async function loadAnalyses() {
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante");
  analyses.value = unwrap(data, []);
}

async function loadCatalog(search = "") {
  const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/catalog", {
    params: search ? { search } : undefined,
  });
  catalog.value = unwrap(data, []);
}

async function loadEquipments() {
  equipments.value = await listAllPages("/kpi_maintenance/equipos");
}

async function loadBrands() {
  brands.value = await listAllPages("/kpi_inventory/marcas");
}

async function loadAll() {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([loadAnalyses(), loadCatalog(), loadEquipments(), loadBrands()]);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo cargar el modulo de lubricantes.";
  } finally {
    loading.value = false;
  }
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
}

function getPersistedImportJobId() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ACTIVE_IMPORT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: string | null };
    return String(parsed?.id ?? "").trim() || null;
  } catch {
    window.localStorage.removeItem(ACTIVE_IMPORT_STORAGE_KEY);
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
    formData.append("upsert_existing", "true");
    formData.append("requested_by", currentUserName());
    if (currentUserEmail()) formData.append("requested_by_email", currentUserEmail());
    if (currentUserId()) formData.append("requested_user_id", currentUserId());

    /*
      ui.open(parsed.warnings[0] || "El archivo contiene advertencias de importacion.", "warning");
    }

    if (!parsed.analyses.length) {
      ui.error("El archivo no contiene muestras válidas para importar.");
      return;
    }
    */
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
  await assignCode();
}

function fillFormFromAnalysis(item: AnyRow) {
  const sample = item.sample_info ?? {};
  Object.assign(form, {
    codigo: item.codigo || "",
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

function openEdit(item: AnyRow) {
  if (!canEdit.value) return;
  editingId.value = item.id;
  fillFormFromAnalysis(item);
  lubricantSelection.value = item.lubricante
    ? {
        lubricante: item.lubricante,
        marca_lubricante: item.marca_lubricante,
        ultimo_codigo: item.codigo,
        label: [item.codigo, item.lubricante, item.marca_lubricante, resolveEquipmentLabel(item), item.sample_info?.equipo_modelo].filter(Boolean).join(" · "),
      }
    : null;
  dialog.value = true;
}

function openDelete(item: AnyRow) {
  if (!canDelete.value) return;
  deletingId.value = item.id;
  deleteDialog.value = true;
}

function handleLubricantSelection(value: any) {
  if (!value) {
    form.lubricante = "";
    form.marca_lubricante = "";
    lubricantSelection.value = null;
    return;
  }
  if (typeof value === "string") {
    form.lubricante = value;
    lubricantSelection.value = value;
    return;
  }
  form.lubricante = value.lubricante || "";
  form.marca_lubricante = value.marca_lubricante || form.marca_lubricante;
  lubricantSelection.value = value;
}

async function handleLubricantSearch(value: string) {
  lubricantSearch.value = value;
  if (String(value || "").trim().length >= 2) {
    await loadCatalog(value);
  }
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
  saving.value = true;
  try {
    const payload = {
      codigo: form.codigo,
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
    if (form.lubricante) {
      await loadDashboard({ lubricante: form.lubricante });
    }
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
      requested_role: auth.user?.role?.nombre || null,
      purge_import_jobs: true,
    });
    const summary = unwrap<AnyRow>(data, {});

    analyses.value = [];
    catalog.value = [];
    dashboard.value = null;
    selectedGroupKey.value = null;
    groupDetailDialog.value = false;
    persistActiveImportJob(null);
    dismissImportCardNow();
    importJob.value = null;
    lastImportSummary.value = null;
    importFile.value = null;
    dashboardSelection.value = null;
    lubricantSelection.value = null;
    tableSearch.value = "";
    statusFilter.value = null;
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

async function loadDashboard(overrides?: Record<string, any>) {
  dashboardLoading.value = true;
  dashboardError.value = null;
  try {
    const params = {
      periodo: dashboardPeriod.value,
      from: dashboardFrom.value || undefined,
      to: dashboardTo.value || undefined,
      compartimento: dashboardCompartimento.value || undefined,
      ...(overrides ?? {}),
    };
    const { data } = await api.get("/kpi_maintenance/inteligencia/analisis-lubricante/dashboard", { params });
    dashboard.value = unwrap(data, null);
  } catch (e: any) {
    dashboardError.value = e?.response?.data?.message || "No se pudo generar el dashboard del lubricante.";
  } finally {
    dashboardLoading.value = false;
  }
}

async function handleDashboardSelection(value: any) {
  if (!value) {
    dashboard.value = null;
    return;
  }
  await loadDashboard({
    codigo: value.group_only ? undefined : value.ultimo_codigo || value.codigo || undefined,
    lubricante: value.lubricante || value.label,
    marca_lubricante: value.marca_lubricante || undefined,
    equipo_id: value.equipo_id || undefined,
    equipo_codigo: value.equipo_codigo || undefined,
    equipo_nombre: value.equipo_nombre || undefined,
    equipo_modelo: value.equipo_modelo || undefined,
  });
}

async function viewDashboard(item: AnyRow) {
  dashboardSelection.value = {
    lubricante: item.lubricante,
    marca_lubricante: item.marca_lubricante,
    codigo: item.codigo,
    equipo_id: item.equipo_id || undefined,
    equipo_codigo: item.equipo_codigo || undefined,
    equipo_nombre: item.equipo_nombre || undefined,
    equipo_modelo: item.sample_info?.equipo_modelo || undefined,
    label: [
      item.codigo,
      item.lubricante,
      item.marca_lubricante,
      resolveEquipmentLabel(item),
      item.sample_info?.equipo_modelo,
    ].filter(Boolean).join(" · "),
  };
  await loadDashboard({
    codigo: item.codigo,
    equipo_id: item.equipo_id || undefined,
    equipo_codigo: item.equipo_codigo || undefined,
    equipo_nombre: item.equipo_nombre || undefined,
    equipo_modelo: item.sample_info?.equipo_modelo || undefined,
  });
}

void viewDashboard;

async function viewDashboardGroup(group: AnyRow) {
  groupDetailDialog.value = false;
  dashboardSelection.value = {
    lubricante: group.lubricante,
    marca_lubricante: group.marca_lubricante,
    equipo_id: group.equipo_id || undefined,
    equipo_codigo: group.equipo_codigo || undefined,
    equipo_nombre: group.equipo_nombre || undefined,
    equipo_modelo: group.equipo_modelo || undefined,
    ultimo_codigo: group.ultimo_codigo,
    group_only: true,
    label: [group.lubricante, group.marca_lubricante, group.equipo_label, group.equipo_modelo].filter(Boolean).join(" · "),
  };
  await loadDashboard({
    lubricante: group.lubricante,
    marca_lubricante: group.marca_lubricante,
    equipo_id: group.equipo_id || undefined,
    equipo_codigo: group.equipo_codigo || undefined,
    equipo_nombre: group.equipo_nombre || undefined,
    equipo_modelo: group.equipo_modelo || undefined,
  });
}

function openGroupDetail(group: AnyRow) {
  selectedGroupKey.value = group.group_key;
  groupDetailDialog.value = true;
}

function openEditFromGroup(item: AnyRow) {
  groupDetailDialog.value = false;
  openEdit(item);
}

function openDeleteFromGroup(item: AnyRow) {
  groupDetailDialog.value = false;
  openDelete(item);
}

async function reloadDashboard() {
  if (!dashboardSelection.value && !dashboard.value?.selected?.lubricante) return;
  await loadDashboard({
    codigo: dashboardSelection.value?.group_only
      ? undefined
      : dashboardSelection.value?.codigo || dashboardSelection.value?.ultimo_codigo,
    lubricante:
      dashboardSelection.value?.lubricante || dashboard.value?.selected?.lubricante,
    marca_lubricante:
      dashboardSelection.value?.marca_lubricante ||
      dashboard.value?.selected?.marca_lubricante,
    equipo_id:
      dashboardSelection.value?.equipo_id ||
      dashboard.value?.selected?.equipo_id,
    equipo_codigo:
      dashboardSelection.value?.equipo_codigo ||
      dashboard.value?.selected?.equipo_codigo,
    equipo_nombre:
      dashboardSelection.value?.equipo_nombre ||
      dashboard.value?.selected?.equipo_nombre,
    equipo_modelo:
      dashboardSelection.value?.equipo_modelo ||
      dashboard.value?.selected?.equipo_modelo,
  });
}

watch(
  () => form.equipo_id,
  () => {
    applySelectedEquipmentSnapshot();
  },
);

onMounted(async () => {
  await loadAll();
  await restoreActiveImportJob();
});

onUnmounted(() => {
  stopImportPolling();
  clearImportDismissTimer();
});
</script>

<style scoped>
.lubricant-page {
  display: grid;
  gap: 20px;
}

.page-wrap {
  gap: 12px;
  flex-wrap: wrap;
}

.summary-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.group-compartments {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.import-log {
  display: grid;
  gap: 6px;
  max-height: 180px;
  overflow: auto;
  padding: 10px;
  border-radius: 12px;
  background: rgba(17, 24, 39, 0.04);
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
  background: rgba(255, 255, 255, 0.45);
}

.detail-card__title {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.lubricant-groups-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 960px) {
  .lubricant-page {
    gap: 14px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .import-log {
    max-height: 240px;
  }

  .lubricant-groups-table :deep(.v-data-table-footer__items-per-page),
  .lubricant-groups-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 600px) {
  .detail-card {
    padding: 12px;
  }

  .detail-card__title {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

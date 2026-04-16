<template>
  <v-card rounded="xl" class="pa-4 work-orders-shell enterprise-surface">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
      <div>
        <div class="text-h6 font-weight-bold">Órdenes de trabajo</div>
        <div class="text-body-2 text-medium-emphasis">Cabeceras creadas y gestión de todo el detalle en una sola pantalla.</div>
      </div>
      <v-btn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="openCreate">Nueva OT</v-btn>
    </div>

    <v-row dense class="mb-2">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="Buscar"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2">{{ error }}</v-alert>

    <v-data-table
      :headers="headers"
      :items="rows"
      :loading="loading"
      loading-text="Obteniendo órdenes de trabajo..."
      :items-per-page="20"
      class="elevation-0 table-enterprise enterprise-table"
    >
      <template #item.actions="{ item }">
        <div class="d-flex" style="gap:4px">
          <v-btn v-if="canEdit" icon="mdi-pencil" variant="text" @click="openEdit(item._raw ?? item)" />
          <v-btn
            v-if="canDelete && canCloseOrVoidWorkOrder(item._raw ?? item)"
            icon="mdi-delete"
            variant="text"
            color="error"
            @click="openDelete(item._raw ?? item)"
          />
        </div>
      </template>
    </v-data-table>
  </v-card>

  <v-dialog v-model="dialog" fullscreen>
    <v-card class="work-order-dialog-card">
      <v-toolbar color="primary" class="work-orders-toolbar">
        <v-btn icon="mdi-close" @click="dialog = false" />
        <v-toolbar-title>{{ editingId ? `Editar OT ${headerForm.code || editingId}` : "Nueva orden de trabajo" }}</v-toolbar-title>
        <v-spacer />
        <v-chip v-if="editingId" color="accent" class="mr-2 workflow-chip" variant="flat">
          {{ currentWorkflowLabel }}
        </v-chip>
        <v-btn
          v-if="editingId && canAccessWorkOrderReports"
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-eye-outline"
          @click="reportPreviewDialog = true"
        >
          Ver reporte
        </v-btn>
        <v-btn
          v-if="editingId && canAccessWorkOrderReports"
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-file-excel"
          :loading="isExporting('excel')"
          @click="exportWorkOrder('excel')"
        >
          Excel
        </v-btn>
        <v-btn
          v-if="editingId && canAccessWorkOrderReports"
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-file-pdf-box"
          :loading="isExporting('pdf')"
          @click="exportWorkOrder('pdf')"
        >
          PDF
        </v-btn>
        <v-btn
          v-if="editingId && isCreated && canEdit"
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-play-circle-outline"
          @click="startProcess"
        >
          Completar información
        </v-btn>
        <v-btn
          v-if="editingId && isInProcess && canEdit && canCloseOrVoidCurrent"
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-lock-check-outline"
          @click="prepareClose"
        >
          Cerrar OT
        </v-btn>
        <v-btn
          v-if="canPersistHeader"
          variant="tonal"
          :loading="savingHeader"
          :disabled="savingHeader || loadingCatalogs"
          @click="saveAll"
        >
          Guardar
        </v-btn>
      </v-toolbar>

      <v-card-text class="pt-4 ot-dialog-content">
        <v-alert
          v-if="loadingCatalogs"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <div class="d-flex flex-column" style="gap: 8px;">
            <div class="font-weight-medium">Cargando información base de la orden de trabajo.</div>
            <div class="text-body-2">Estamos obteniendo catálogos y referencias para que puedas continuar.</div>
            <v-progress-linear indeterminate color="primary" rounded />
          </div>
        </v-alert>
        <v-alert
          v-if="detailNoticeText"
          type="warning"
          variant="tonal"
          class="mb-4"
          :text="detailNoticeText"
        />
        <v-alert
          v-if="isBlocked"
          type="info"
          variant="tonal"
          class="mb-4"
          :text="blockingAlertText"
        />
        <v-alert
          v-if="closeRestrictionText"
          type="warning"
          variant="tonal"
          class="mb-4"
          :text="closeRestrictionText"
        />

        <v-card variant="flat" rounded="lg" class="pa-4 mb-4 section-card">

          <div class="text-subtitle-2 font-weight-bold mb-3">Cabecera de orden de trabajo</div>
          <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field v-model="headerForm.code" label="Code" variant="outlined" readonly />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="headerForm.equipment_id" :items="equipmentOptions" item-title="title" item-value="value" label="Equipo" variant="outlined" :disabled="isReadOnlyWorkflow || isEditingLockedFields" />
          </v-col>
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="headerForm.equipo_componente_id"
              :items="equipmentComponentOptions"
              item-title="title"
              item-value="value"
              label="Compartimiento / parte"
              variant="outlined"
              clearable
              :loading="loadingEquipmentComponents"
              :disabled="isReadOnlyWorkflow || !headerForm.equipment_id"
              hint="Parte real u oficial del equipo vinculada a la OT."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="headerForm.maintenance_kind" :items="maintenanceKindOptions" item-title="title" item-value="value" label="Tipo mantenimiento" variant="outlined" :disabled="isReadOnlyWorkflow" />
          </v-col>
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="headerForm.blocked_by_work_order_id"
              :items="blockingWorkOrderOptions"
              item-title="title"
              item-value="value"
              label="OT anexada / bloqueante"
              variant="outlined"
              clearable
              :disabled="isReadOnlyWorkflow"
              hint="Si esta OT depende de otra, se bloquea hasta que la anexada culmine."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="headerForm.blocked_reason"
              label="Motivo de bloqueo"
              variant="outlined"
              :disabled="isReadOnlyWorkflow"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="headerForm.status_workflow"
              :items="workflowOptionsForCurrent"
              item-title="title"
              item-value="value"
              label="Estado workflow"
              variant="outlined"
              :disabled="isReadOnlyWorkflow"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="headerForm.procedimiento_id"
              :items="procedureOptions"
              item-title="title"
              item-value="value"
              label="Plantilla MPG"
              clearable
              variant="outlined"
              :disabled="isReadOnlyWorkflow || isEditingLockedFields"
              hint="La plantilla define el checklist y requisitos de la OT."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              :model-value="resolvedOperationalPlanLabel"
              label="Plan operativo"
              variant="outlined"
              readonly
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="headerForm.alerta_id" :items="alertOptions" item-title="title" item-value="value" label="Alerta" clearable variant="outlined" :disabled="isReadOnlyWorkflow || isEditingLockedFields" />
          </v-col>
          <v-col cols="12" md="4"><v-textarea v-model="headerForm.causa" label="Causa" variant="outlined" rows="3" auto-grow :disabled="isReadOnlyWorkflow" /></v-col>
          <v-col cols="12" md="4"><v-textarea v-model="headerForm.accion" label="Acción" variant="outlined" rows="3" auto-grow :disabled="isReadOnlyWorkflow" /></v-col>
          <v-col cols="12" md="4"><v-textarea v-model="headerForm.prevencion" label="Prevención" variant="outlined" rows="3" auto-grow :disabled="isReadOnlyWorkflow" /></v-col>
          </v-row>
        </v-card>

        <v-divider class="my-4" />

        <v-tabs v-model="tab" color="primary">
          <v-tab value="tareas">Tareas ejecutadas</v-tab>
          <v-tab value="adjuntos">Adjuntos</v-tab>
          <v-tab v-if="showConsumosTab" value="consumos">Consumos</v-tab>
          <v-tab v-if="showMaterialsTab" value="materiales">Salida de materiales</v-tab>
          <v-tab v-if="editingId" value="history">Histórico</v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          <v-window-item value="tareas">
            <v-row dense class="pt-2">
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="selectedProcedureLabel"
                  label="Plantilla MPG"
                  variant="outlined"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="resolvedOperationalPlanLabel"
                  label="Plan operativo"
                  variant="outlined"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center justify-end">
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-sync"
                  :disabled="!headerForm.plan_id || isReadOnlyWorkflow"
                  :loading="loadingTaskOptions"
                  @click="syncChecklistFromTemplate"
                >
                  Sincronizar checklist
                </v-btn>
              </v-col>
            </v-row>
            <v-alert
              type="info"
              variant="tonal"
              class="mb-3"
              text="Las tareas se cargan automaticamente desde la plantilla MPG seleccionada y muestran sus requisitos operativos."
            />
            <v-data-table
              :headers="taskHeaders"
              :items="taskRows"
              :loading="loadingDetails"
              loading-text="Obteniendo tareas de la orden..."
              class="elevation-0 enterprise-table"
            >
              <template #item.plan_id="{ item }">
                {{ getPlanLabelForTask(item._raw ?? item) }}
              </template>
              <template #item.tarea_id="{ item }">
                <div class="font-weight-medium">{{ getTaskLabelForTask(item._raw ?? item) }}</div>
                <div v-if="getTaskRequirementChips(item._raw ?? item).length" class="d-flex flex-wrap mt-1" style="gap: 4px;">
                  <v-chip
                    v-for="chip in getTaskRequirementChips(item._raw ?? item)"
                    :key="`${(item._raw ?? item).id}-${chip}`"
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                  >
                    {{ chip }}
                  </v-chip>
                </div>
                <div v-if="getTaskDetailText(item._raw ?? item)" class="text-caption text-medium-emphasis mt-1">
                  {{ getTaskDetailText(item._raw ?? item) }}
                </div>
              </template>
              <template #item.captura="{ item }">
                <div class="capture-cell">
                  <v-switch
                    v-if="getTaskFieldType(item._raw ?? item) === 'BOOLEAN'"
                    :model-value="Boolean((item._raw ?? item).valor_boolean)"
                    color="primary"
                    hide-details
                    inset
                    :disabled="isReadOnlyWorkflow"
                    @update:model-value="setTaskBooleanValue(item._raw ?? item, $event)"
                  />
                  <v-text-field
                    v-else-if="getTaskFieldType(item._raw ?? item) === 'NUMBER'"
                    :model-value="(item._raw ?? item).valor_numeric ?? ''"
                    label="Valor"
                    type="number"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :disabled="isReadOnlyWorkflow"
                    @update:model-value="setTaskNumericValue(item._raw ?? item, $event)"
                  />
                  <v-text-field
                    v-else-if="getTaskFieldType(item._raw ?? item) === 'TEXT'"
                    :model-value="(item._raw ?? item).valor_text ?? ''"
                    label="Valor"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :disabled="isReadOnlyWorkflow"
                    @update:model-value="setTaskTextValue(item._raw ?? item, $event)"
                  />
                  <template v-else-if="isTaskEvidenceField(item._raw ?? item)">
                    <div class="task-evidence-stack">
                      <div
                        v-for="requirement in getTaskEvidenceRequirements(item._raw ?? item)"
                        :key="`${(item._raw ?? item).id}-${requirement}`"
                        class="task-evidence-group"
                      >
                        <div class="text-caption font-weight-medium mb-1">
                          {{ getTaskEvidenceRequirementLabel(requirement) }}
                        </div>
                        <v-file-input
                          :key="getTaskEvidenceInputKey(item._raw ?? item, requirement)"
                          :label="`Subir ${getTaskEvidenceRequirementLabel(requirement).toLowerCase()}`"
                          density="compact"
                          variant="outlined"
                          hide-details
                          multiple
                          prepend-icon="mdi-paperclip"
                          :accept="getTaskEvidenceAccept(requirement)"
                          :disabled="isReadOnlyWorkflow"
                          @update:model-value="handleTaskEvidenceFiles(item._raw ?? item, requirement, $event)"
                        />
                        <div
                          v-if="getTaskEvidenceEntries(item._raw ?? item, requirement).length"
                          class="d-flex flex-wrap mt-2"
                          style="gap: 6px;"
                        >
                          <v-chip
                            v-for="attachment in getTaskEvidenceEntries(item._raw ?? item, requirement)"
                            :key="getTaskEvidenceEntryKey(attachment)"
                            size="small"
                            color="secondary"
                            variant="tonal"
                            closable
                            @click="openTaskEvidenceAttachment(attachment)"
                            @click:close="removeTaskEvidenceAttachment(item._raw ?? item, attachment)"
                          >
                            {{ attachment.nombre || attachment.name || attachment.attachment_id || "Adjunto" }}
                          </v-chip>
                        </div>
                      </div>
                    </div>
                  </template>
                  <v-textarea
                    v-else
                    :model-value="getTaskJsonText(item._raw ?? item)"
                    label="JSON / evidencia"
                    rows="2"
                    auto-grow
                    density="compact"
                    variant="outlined"
                    hide-details
                    :disabled="isReadOnlyWorkflow"
                    @update:model-value="setTaskJsonValue(item._raw ?? item, $event)"
                  />
                  <div
                    v-if="isTaskRequired(item._raw ?? item)"
                    class="text-caption text-medium-emphasis mt-1"
                  >
                    Campo obligatorio
                  </div>
                </div>
              </template>
              <template #item.observacion="{ item }">
                <v-text-field
                  :model-value="(item._raw ?? item).observacion ?? ''"
                  label="Observacion"
                  density="compact"
                  variant="outlined"
                  hide-details
                  :disabled="isReadOnlyWorkflow"
                  @update:model-value="setTaskObservation(item._raw ?? item, $event)"
                />
              </template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" variant="text" color="error" @click="deleteTask(item._raw ?? item)" />
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="adjuntos">
            <v-row dense class="pt-2">
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.tipo" label="Tipo" variant="outlined" /></v-col>
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.nombre" label="Nombre" variant="outlined" /></v-col>
              <v-col cols="12" md="3"><v-text-field v-model="attachmentForm.mime_type" label="Mime type" variant="outlined" /></v-col>
              <v-col cols="12" md="3">
                <v-file-input
                  label="Archivo"
                  variant="outlined"
                  prepend-icon="mdi-paperclip"
                  show-size
                  @update:model-value="handleAttachmentFileChange"
                />
                <div v-if="attachmentForm.nombre" class="text-caption mt-1">
                  <template v-if="editingId && attachmentPreviewUrl">
                    <a :href="attachmentPreviewUrl" target="_blank" rel="noopener noreferrer">{{ attachmentForm.nombre }}</a>
                  </template>
                  <template v-else>
                    {{ attachmentForm.nombre }}
                  </template>
                </div>
              </v-col>
            </v-row>
            <div class="d-flex justify-end mb-3"><v-btn color="primary" :disabled="isReadOnlyWorkflow" @click="createAttachment">Agregar</v-btn></div>
            <v-data-table
              :headers="attachmentHeaders"
              :items="attachmentRows"
              :loading="loadingDetails"
              loading-text="Obteniendo adjuntos de la orden..."
              class="elevation-0 enterprise-table"
            >
              <template #item.origen="{ item }">
                {{ getAttachmentOriginLabel(item._raw ?? item) }}
              </template>
              <template #item.nombre="{ item }">
                <a
                  href="#"
                  @click.prevent="openAttachment(item._raw ?? item)"
                >
                  {{ (item._raw ?? item).nombre }}
                </a>
              </template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" variant="text" color="error" @click="deleteAttachment(item._raw ?? item)" />
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="consumos">
            <v-row v-if="!isReadOnlyWorkflow" dense class="pt-2">
              <v-col cols="12" md="4"><v-select v-model="consumoForm.bodega_id" :items="warehouseOptions" item-title="title" item-value="value" label="Bodega" clearable variant="outlined" :disabled="loadingCatalogs" /></v-col>
              <v-col cols="12" md="4">
                <v-autocomplete
                  v-model="consumoForm.producto_id"
                  v-model:search="consumoProductSearch"
                  :items="consumoProductOptions"
                  item-title="title"
                  item-value="value"
                  label="Material"
                  variant="outlined"
                  clearable
                  no-filter
                  :disabled="!consumoForm.bodega_id || loadingCatalogs"
                  :loading="loadingConsumoProducts"
                  hint="Se cargan materiales por bodega a medida que los necesites."
                  persistent-hint
                />
                <div
                  v-if="consumoForm.bodega_id"
                  class="d-flex align-center justify-space-between mt-1 px-1"
                  style="gap: 8px; flex-wrap: wrap;"
                >
                  <div class="text-caption text-medium-emphasis">
                    {{ consumoProductOptions.length }} de {{ consumoProductsTotal || 0 }} materiales cargados
                  </div>
                  <v-btn
                    v-if="consumoProductsPage < consumoProductsTotalPages"
                    size="x-small"
                    variant="text"
                    prepend-icon="mdi-chevron-down"
                    :loading="loadingConsumoProducts"
                    @click="loadMoreConsumoProducts"
                  >
                    Cargar más
                  </v-btn>
                </div>
              </v-col>
              <v-col cols="12" md="2"><v-text-field v-model="consumoForm.cantidad" label="Cantidad" type="number" variant="outlined" /></v-col>
              <v-col v-if="canViewCosts" cols="12" md="2"><v-text-field v-model="consumoForm.costo_unitario" label="Costo unitario" type="number" variant="outlined" readonly /></v-col>
              <v-col cols="12" md="12"><v-text-field v-model="consumoForm.observacion" label="Observación" variant="outlined" /></v-col>
            </v-row>
            <div v-if="!isReadOnlyWorkflow" class="d-flex justify-end mb-3"><v-btn color="primary" @click="createConsumo">Registrar consumo</v-btn></div>
            <v-alert
              v-else
              type="info"
              variant="tonal"
              class="mb-3"
              text="La OT está cerrada. Los consumos se muestran solo para visualización."
            />
            <v-data-table
              :headers="consumoHeaders"
              :items="consumoRows"
              :loading="loadingDetails"
              loading-text="Obteniendo consumos de la orden..."
              density="comfortable"
              class="table-enterprise enterprise-table"
              :items-per-page="5"
            >
              <template #bottom />
              <template #item.costo_unitario="{ item }">{{ Number((item.raw ?? item).costo_unitario || 0).toFixed(2) }}</template>
              <template #item.subtotal="{ item }">{{ Number((item.raw ?? item).subtotal || 0).toFixed(2) }}</template>
              <template #no-data>
                <div class="pa-4 text-medium-emphasis">No hay consumos disponibles para esta orden de trabajo.</div>
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="materiales">
            <template v-if="!isReadOnlyWorkflow">
              <v-row dense class="pt-2">
                <v-col cols="12">
                  <div class="d-flex align-center justify-space-between mb-2" style="gap:8px; flex-wrap:wrap;">
                    <div class="text-subtitle-2">Materiales usados</div>
                    <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addMaterialItem">
                      Agregar material
                    </v-btn>
                  </div>

                  <v-row
                    v-for="(item, index) in materialItems"
                    :key="`material-${index}`"
                    dense
                    class="mb-1"
                  >
                    <v-col cols="12" md="5">
                      <v-select
                        v-model="item.bodega_id"
                        :items="warehouseOptions"
                        item-title="title"
                        item-value="value"
                        label="Bodega"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" md="5">
                      <v-select
                        v-model="item.producto_id"
                        :items="getWarehouseReservedProductOptions(item.bodega_id)"
                        item-title="title"
                        item-value="value"
                        label="Material"
                        :disabled="!item.bodega_id"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="10" md="1">
                      <v-text-field
                        v-model="item.cantidad"
                        label="Cant."
                        type="number"
                        min="0"
                        step="any"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="2" md="1" class="d-flex align-center justify-end">
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        color="error"
                        :disabled="materialItems.length === 1"
                        @click="removeMaterialItem(index)"
                      />
                    </v-col>
                  </v-row>
                </v-col>
                <v-col cols="12"><v-text-field v-model="materialsForm.observacion" label="Observación" variant="outlined" /></v-col>
              </v-row>
              <div class="d-flex justify-end mb-3">
                <v-btn
                  color="primary"
                  :loading="issuingMaterials"
                  :disabled="issuingMaterials"
                  @click="issueMaterials"
                >
                  Guardar salida de materiales
                </v-btn>
              </div>
            </template>
            <v-alert
              v-if="isReadOnlyWorkflow"
              type="success"
              variant="tonal"
              class="mb-3"
              text="OT cerrada: esta sección está bloqueada y muestra el resultado final de salida de materiales."
            />
            <v-alert
              v-else
              type="info"
              variant="tonal"
              class="mb-3"
              text="La emisión de materiales se valida contra lo reservado en Consumos para esta OT. El selector prioriza materiales con cantidad pendiente por emitir."
            />
            <v-data-table
              :headers="issueHeaders"
              :items="issueRows"
              :loading="loadingDetails"
              loading-text="Obteniendo salidas de materiales..."
              density="comfortable"
              class="table-enterprise enterprise-table"
              :items-per-page="5"
            >
              <template #bottom />
              <template #item.costo_unitario="{ item }">{{ Number((item.raw ?? item).costo_unitario || 0).toFixed(2) }}</template>
              <template #item.subtotal="{ item }">{{ Number((item.raw ?? item).subtotal || 0).toFixed(2) }}</template>
              <template #no-data>
                <div class="pa-4 text-medium-emphasis">No hay emisiones disponibles para esta orden de trabajo.</div>
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="history">
            <v-list density="compact" border rounded>
              <v-list-item
                v-for="(item, i) in localHistory"
                :key="i"
                :title="`${workflowLabel(item.to_status)}${item.from_status ? ` · desde ${workflowLabel(item.from_status)}` : ''}`"
                :subtitle="`${item.note || 'Sin detalle'}${item.changed_at ? ` · ${formatDateTime(item.changed_at, '')}` : ''}`"
              />
              <v-list-item v-if="!localHistory.length" title="Sin historial" subtitle="No hay movimientos registrados para esta orden." />
            </v-list>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 500">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar</v-card-title>
      <v-card-text>¿Deseas eliminar esta orden de trabajo?</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="savingHeader" @click="confirmDelete">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="reportPreviewDialog"
    :fullscreen="isReportPreviewFullscreen"
    :max-width="isReportPreviewFullscreen ? undefined : 1360"
    scrollable
  >
    <v-card rounded="xl" class="report-preview-dialog">
      <v-toolbar color="primary" density="comfortable">
        <v-btn icon="mdi-close" @click="reportPreviewDialog = false" />
        <v-toolbar-title>Reporte de orden de trabajo</v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="tonal"
          class="mr-2"
          prepend-icon="mdi-file-excel"
          :loading="isExporting('excel')"
          @click="exportWorkOrder('excel')"
        >
          Excel
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-file-pdf-box"
          :loading="isExporting('pdf')"
          @click="exportWorkOrder('pdf')"
        >
          PDF
        </v-btn>
      </v-toolbar>

      <v-card-text class="report-preview-body">
        <div class="d-flex align-center justify-space-between flex-wrap mb-4" style="gap: 12px;">
          <div>
            <div class="text-h6 font-weight-bold">{{ headerForm.code || "Orden de trabajo" }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ [selectedEquipmentLabel, selectedEquipmentComponentLabel, headerForm.maintenance_kind].filter(Boolean).join(" · ") || "Sin contexto operativo" }}
            </div>
          </div>
          <div class="d-flex flex-wrap" style="gap: 8px;">
            <v-chip
              v-for="item in workOrderPreviewSummary"
              :key="item.label"
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ item.label }}: {{ item.value }}
            </v-chip>
          </div>
        </div>

        <v-row dense class="mb-4">
          <v-col cols="12" md="7">
            <v-card rounded="lg" class="section-card h-100 pa-4">
              <div class="text-subtitle-1 font-weight-bold mb-3">Datos principales</div>
              <div class="report-preview-grid">
                <div v-for="item in workOrderPreviewMainInfo" :key="item.label" class="report-preview-field">
                  <span class="report-preview-field__label">{{ item.label }}</span>
                  <strong class="report-preview-field__value">{{ item.value || "Sin dato" }}</strong>
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="5">
            <v-card rounded="lg" class="section-card h-100 pa-4">
              <div class="text-subtitle-1 font-weight-bold mb-3">Trazabilidad</div>
              <div class="report-preview-grid report-preview-grid--trace">
                <div v-for="item in workOrderPreviewTraceability" :key="item.label" class="report-preview-field">
                  <span class="report-preview-field__label">{{ item.label }}</span>
                  <strong class="report-preview-field__value">{{ item.value || "Sin dato" }}</strong>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-expansion-panels multiple variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>Tareas ejecutadas ({{ taskRows.length }})</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-data-table
                :headers="reportPreviewTaskHeaders"
                :items="reportPreviewTasks"
                density="compact"
                class="table-enterprise enterprise-table"
                :items-per-page="10"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-title>Adjuntos ({{ attachmentRows.length }})</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-data-table
                :headers="reportPreviewAttachmentHeaders"
                :items="reportPreviewAttachments"
                density="compact"
                class="table-enterprise enterprise-table"
                :items-per-page="10"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-title>Consumos ({{ consumoRows.length }})</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-data-table
                :headers="reportPreviewConsumoHeaders"
                :items="consumoRows"
                density="compact"
                class="table-enterprise enterprise-table"
                :items-per-page="10"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-title>Salidas de material ({{ issueRows.length }})</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-data-table
                :headers="reportPreviewIssueHeaders"
                :items="issueRows"
                density="compact"
                class="table-enterprise enterprise-table"
                :items-per-page="10"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-title>Histórico ({{ localHistory.length }})</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-data-table
                :headers="reportPreviewHistoryHeaders"
                :items="reportPreviewHistory"
                density="compact"
                class="table-enterprise enterprise-table"
                :items-per-page="10"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { listAllPages } from "@/app/utils/list-all-pages";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { hasReportAccess } from "@/app/config/report-access";
import {
  buildWorkOrderReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";
import { formatDateTime } from "@/app/utils/date-time";

const ui = useUiStore();
const { smAndDown } = useDisplay();
const auth = useAuthStore();
const menuStore = useMenuStore();
const loading = ref(false);
const loadingDetails = ref(false);
const loadingCatalogs = ref(false);
const savingHeader = ref(false);
const issuingMaterials = ref(false);
const exportState = reactive<Record<string, boolean>>({});
const error = ref<string | null>(null);
const search = ref("");
const records = ref<any[]>([]);

const dialog = ref(false);
const deleteDialog = ref(false);
const reportPreviewDialog = ref(false);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const isReportPreviewFullscreen = computed(() => smAndDown.value);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const tab = ref("tareas");
const closingFlow = ref(false);
const unsupportedDetailMessages = ref<string[]>([]);
const currentWorkOrderRecord = ref<any | null>(null);

const equipmentOptions = ref<any[]>([]);
const equipmentComponentOptions = ref<any[]>([]);
const planOptions = ref<any[]>([]);
const procedureOptions = ref<any[]>([]);
const alertOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const productCatalogRows = ref<any[]>([]);
const warehouseCatalogRows = ref<any[]>([]);
const workOrderCatalogRows = ref<any[]>([]);
const catalogsLoaded = ref(false);
const consumoProductOptions = ref<any[]>([]);
const consumoProductSearch = ref("");
const loadingConsumoProducts = ref(false);
const consumoProductsPage = ref(1);
const consumoProductsTotalPages = ref(1);
const consumoProductsTotal = ref(0);
const taskOptions = ref<any[]>([]);
const loadingTaskOptions = ref(false);
const loadingEquipmentComponents = ref(false);

const taskLabelCacheByPlan = ref<Record<string, Record<string, string>>>({});
const planTaskCatalogByPlan = ref<Record<string, any[]>>({});
const procedureCatalog = ref<any[]>([]);
const taskEvidenceInputKeys = ref<Record<string, number>>({});
let catalogsPromise: Promise<void> | null = null;
let consumoSearchTimer: ReturnType<typeof setTimeout> | null = null;
let consumoProductsRequestId = 0;

const taskRows = ref<any[]>([]);
const attachmentRows = ref<any[]>([]);
const localConsumos = ref<any[]>([]);
const localIssues = ref<any[]>([]);
const localHistory = ref<any[]>([]);

const headerForm = reactive<any>({
  code: "",
  type: "MANTENIMIENTO",
  title: "",
  equipment_id: "",
  equipo_componente_id: "",
  maintenance_kind: "CORRECTIVO",
  status_workflow: "PLANNED",
  procedimiento_id: "",
  plan_id: "",
  alerta_id: "",
  blocked_by_work_order_id: "",
  blocked_reason: "",
  causa: "",
  accion: "",
  prevencion: "",
});

const taskForm = reactive<any>({
  plan_id: "",
  tarea_id: "",
  observacion: "",
});

const attachmentForm = reactive<any>({
  tipo: "EVIDENCIA",
  nombre: "",
  contenido_base64: "",
  mime_type: "",
});
const attachmentPreviewUrl = ref<string | null>(null);

const consumoForm = reactive<any>({
  producto_id: "",
  bodega_id: "",
  cantidad: "",
  costo_unitario: "",
  observacion: "",
});

const materialsForm = reactive<any>({ observacion: "" });

type MaterialItemForm = {
  producto_id: string;
  bodega_id: string;
  cantidad: string;
};

function newMaterialItem(): MaterialItemForm {
  return {
    producto_id: "",
    bodega_id: "",
    cantidad: "",
  };
}

const materialItems = ref<MaterialItemForm[]>([newMaterialItem()]);
const workflowOptions = [
  { title: "Planificada", value: "PLANNED" },
  { title: "En proceso", value: "IN_PROGRESS" },
  { title: "Bloqueada", value: "BLOCKED" },
  { title: "Cerrada", value: "CLOSED" },
];

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, ["Work Orders", "Ordenes de trabajo", "Órdenes de trabajo", "OT"]),
);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canPersistHeader = computed(() => (editingId.value ? canEdit.value : canCreate.value));
const canAccessWorkOrderReports = computed(() =>
  hasReportAccess(auth.user?.effectiveReportes ?? auth.user?.reportes, "ordenes_trabajo"),
);

const maintenanceKindOptions = [
  { title: "Correctivo", value: "CORRECTIVO" },
  { title: "Preventivo", value: "PREVENTIVO" },
  { title: "Predictivo", value: "PREDICTIVO" },
  { title: "Inspección", value: "INSPECCION" },
];

function normalizeWorkflowStatus(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (["PLANNED", "PLANIFICADA", "PLANIFICADO", "CREADA", "CREADO"].includes(raw)) return "PLANNED";
  if (["IN_PROGRESS", "IN PROGRESS", "EN PROCESO", "EN_PROCESO", "PROCESSING"].includes(raw)) return "IN_PROGRESS";
  if (["BLOCKED", "BLOQUEADA", "BLOQUEADO", "DETENIDA", "DETENIDO", "ON_HOLD"].includes(raw)) return "BLOCKED";
  if (["CLOSED", "CERRADA", "CERRADO", "DONE", "COMPLETED"].includes(raw)) return "CLOSED";
  return raw || "PLANNED";
}

function workflowLabel(value: unknown) {
  const normalized = normalizeWorkflowStatus(value);
  return workflowOptions.find((item) => item.value === normalized)?.title || normalized || "Sin definir";
}

function exportKey(format: "excel" | "pdf") {
  return `work-order:${format}`;
}

function isExporting(format: "excel" | "pdf") {
  return Boolean(exportState[exportKey(format)]);
}

const normalizedWorkflow = computed(() => normalizeWorkflowStatus(headerForm.status_workflow));
const isCreated = computed(() => normalizedWorkflow.value === "PLANNED");
const isInProcess = computed(() => normalizedWorkflow.value === "IN_PROGRESS");
const isBlocked = computed(() => normalizedWorkflow.value === "BLOCKED");
const isClosed = computed(() => normalizedWorkflow.value === "CLOSED");
function currentUserId() {
  return String(auth.user?.id || auth.userId || "").trim();
}

function currentUserName() {
  return String(auth.user?.nameUser || (auth.user as any)?.username || "")
    .trim()
    .toLowerCase();
}

function normalizeOwnerName(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function canCloseOrVoidWorkOrder(item: any) {
  const row = item?._raw ?? item;
  if (!row) return false;
  if (typeof row?.can_close_or_void === "boolean") {
    return row.can_close_or_void;
  }
  const userId = currentUserId();
  const userName = currentUserName();
  const ownerIds = [String(row?.requested_by || "").trim()].filter(Boolean);
  const ownerNames = [
    normalizeOwnerName(row?.created_by),
    normalizeOwnerName(row?.linked_programacion_owner),
  ].filter(Boolean);
  return (!!userId && ownerIds.includes(userId)) || (!!userName && ownerNames.includes(userName));
}

const canCloseOrVoidCurrent = computed(() =>
  editingId.value ? canCloseOrVoidWorkOrder(currentWorkOrderRecord.value) : true,
);
const isReadOnlyWorkflow = computed(() => isClosed.value && !closingFlow.value);
const showConsumosTab = computed(() => !!editingId.value && (isInProcess.value || isClosed.value));
const showMaterialsTab = computed(() => !!editingId.value && (isInProcess.value || isClosed.value));
const isEditingLockedFields = computed(() => !!editingId.value);
const workflowOptionsForCurrent = computed(() => {
  if (!editingId.value || canCloseOrVoidCurrent.value || isClosed.value) {
    return workflowOptions;
  }
  return workflowOptions.filter((item) => item.value !== "CLOSED");
});
const currentWorkflowLabel = computed(() => `Estado: ${workflowLabel(headerForm.status_workflow)}`);
const detailNoticeText = computed(() => unsupportedDetailMessages.value.join(" "));
const blockingWorkOrderOptions = computed(() =>
  workOrderCatalogRows.value
    .filter((item: any) => String(item?.id || "") !== String(editingId.value || ""))
    .map((item: any) => ({
      value: item.id,
      title: [
        item?.code || item?.codigo || item?.id,
        item?.title || item?.titulo || item?.nombre || null,
        workflowLabel(item?.status_workflow),
      ]
        .filter(Boolean)
        .join(" · "),
    })),
);
const blockingAlertText = computed(() => {
  if (!isBlocked.value) return "";
  const selected = blockingWorkOrderOptions.value.find(
    (item: any) => String(item?.value || "") === String(headerForm.blocked_by_work_order_id || ""),
  );
  const blockerLabel = selected?.title || "la OT anexada seleccionada";
  return `${headerForm.code || "Esta OT"} esta bloqueada hasta culminar ${blockerLabel}${headerForm.blocked_reason ? ` · Motivo: ${headerForm.blocked_reason}` : ""}.`;
});
const currentRoleName = computed(() => String(auth.user?.role?.nombre || "").trim().toUpperCase());
const canViewCosts = computed(() => ["GERENTE", "ADMINISTRADOR"].includes(currentRoleName.value));
const closeRestrictionText = computed(() => {
  if (!editingId.value || canCloseOrVoidCurrent.value) return "";
  const owner =
    String(
      currentWorkOrderRecord.value?.linked_programacion_owner ||
        currentWorkOrderRecord.value?.created_by ||
        "",
    ).trim() || "el usuario que creó o planificó la orden";
  return `Solo ${owner} puede cerrar o anular esta orden de trabajo.`;
});

const headers = [
  { title: "Code", key: "code" },
  { title: "Type", key: "type" },
  { title: "Title", key: "title" },
  { title: "ID", key: "id" },
  { title: "Equipo", key: "equipment_label" },
  { title: "Compartimiento", key: "equipment_component_label" },
  { title: "Estado", key: "status_workflow" },
  { title: "Tipo", key: "maintenance_kind" },
  { title: "Acciones", key: "actions", sortable: false },
];

const taskHeaders = [
  { title: "Plan", key: "plan_id" },
  { title: "Tarea", key: "tarea_id" },
  { title: "Captura", key: "captura", sortable: false },
  { title: "Obs.", key: "observacion" },
  { title: "Acciones", key: "actions", sortable: false },
];

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

const attachmentHeaders = [
  { title: "ID", key: "id" },
  { title: "Tipo", key: "tipo" },
  { title: "Origen", key: "origen", sortable: false },
  { title: "Nombre", key: "nombre" },
  { title: "Acciones", key: "actions", sortable: false },
];

const consumoHeaders = computed(() => {
  const base = [
    { title: "Bodega", key: "bodega_label" },
    { title: "Material", key: "producto_label" },
    { title: "Reservado", key: "cantidad_reservada" },
    { title: "Emitido", key: "cantidad_emitida" },
    { title: "Pendiente", key: "cantidad_pendiente" },
  ];
  if (canViewCosts.value) {
    base.push(
      { title: "Costo unitario", key: "costo_unitario" } as any,
      { title: "Subtotal", key: "subtotal" } as any,
    );
  }
  base.push({ title: "Observación", key: "observacion" } as any);
  return base;
});

const issueHeaders = computed(() => {
  const base = [
    { title: "Salida", key: "entrega_code" },
    { title: "Fecha", key: "fecha_label" },
    { title: "Bodega", key: "bodega_label" },
    { title: "Material", key: "producto_label" },
    { title: "Cantidad", key: "cantidad" },
  ];
  if (canViewCosts.value) {
    base.push(
      { title: "Costo unitario", key: "costo_unitario" } as any,
      { title: "Subtotal", key: "subtotal" } as any,
    );
  }
  base.push({ title: "Observación", key: "observacion" } as any);
  return base;
});

const currentWorkOrderAudit = computed(() => currentWorkOrderRecord.value?._raw ?? currentWorkOrderRecord.value ?? {});
const workOrderPreviewSummary = computed(() => [
  { label: "Estado", value: workflowLabel(headerForm.status_workflow) },
  { label: "Tareas", value: taskRows.value.length },
  { label: "Adjuntos", value: attachmentRows.value.length },
  { label: "Consumos", value: consumoRows.value.length },
  { label: "Salidas", value: issueRows.value.length },
]);
const workOrderPreviewMainInfo = computed(() => [
  { label: "Código", value: headerForm.code },
  { label: "Equipo", value: selectedEquipmentLabel.value },
  { label: "Compartimiento", value: selectedEquipmentComponentLabel.value },
  { label: "Tipo de mantenimiento", value: headerForm.maintenance_kind },
  { label: "Procedimiento", value: selectedProcedureLabel.value },
  { label: "Plan operativo", value: resolvedOperationalPlanLabel.value },
  { label: "Alerta", value: selectedAlertLabel.value },
  { label: "Causa", value: headerForm.causa },
  { label: "Acción", value: headerForm.accion },
  { label: "Prevención", value: headerForm.prevencion },
]);
const workOrderPreviewTraceability = computed(() => [
  { label: "Creado por", value: currentWorkOrderAudit.value?.created_by_label || currentWorkOrderAudit.value?.created_by || "" },
  { label: "Fecha creación", value: currentWorkOrderAudit.value?.created_at || "" },
  { label: "Realizado por", value: currentWorkOrderAudit.value?.processed_by_label || currentWorkOrderAudit.value?.updated_by || "" },
  { label: "Fecha realización", value: currentWorkOrderAudit.value?.processed_at || currentWorkOrderAudit.value?.updated_at || "" },
  { label: "Aprobado por", value: currentWorkOrderAudit.value?.approved_by_label || "" },
  { label: "Fecha aprobación", value: currentWorkOrderAudit.value?.approved_at || "" },
  { label: "Acción final", value: currentWorkOrderAudit.value?.approval_action || "" },
  { label: "OT bloqueante", value: selectedBlockingOrderLabel.value },
  { label: "Motivo bloqueo", value: headerForm.blocked_reason || "" },
]);
const reportPreviewTaskHeaders = [
  { title: "Plan", key: "plan" },
  { title: "Tarea", key: "tarea" },
  { title: "Tipo captura", key: "tipo_captura" },
  { title: "Valor registrado", key: "valor_registrado" },
  { title: "Observación", key: "observacion" },
  { title: "Requisitos", key: "requisitos" },
];
const reportPreviewAttachmentHeaders = [
  { title: "Tipo archivo", key: "tipo_archivo" },
  { title: "Origen", key: "origen" },
  { title: "Nombre", key: "nombre" },
  { title: "Visualizacion", key: "visualizacion" },
];
const reportPreviewConsumoHeaders = computed(() => {
  const base = [
    { title: "Bodega", key: "bodega_label" },
    { title: "Material", key: "producto_label" },
    { title: "Reservado", key: "cantidad_reservada" },
    { title: "Emitido", key: "cantidad_emitida" },
    { title: "Pendiente", key: "cantidad_pendiente" },
  ];
  if (canViewCosts.value) {
    base.push({ title: "Costo", key: "costo_unitario" } as any);
    base.push({ title: "Subtotal", key: "subtotal" } as any);
  }
  return base;
});
const reportPreviewIssueHeaders = computed(() => {
  const base = [
    { title: "Salida", key: "entrega_code" },
    { title: "Fecha", key: "fecha_label" },
    { title: "Bodega", key: "bodega_label" },
    { title: "Material", key: "producto_label" },
    { title: "Cantidad", key: "cantidad" },
  ];
  if (canViewCosts.value) {
    base.push({ title: "Costo", key: "costo_unitario" } as any);
    base.push({ title: "Subtotal", key: "subtotal" } as any);
  }
  return base;
});
const reportPreviewHistoryHeaders = [
  { title: "Desde", key: "from" },
  { title: "Hacia", key: "to" },
  { title: "Usuario", key: "user" },
  { title: "Fecha", key: "date" },
  { title: "Nota", key: "note" },
];
const reportPreviewTasks = computed(() =>
  taskRows.value.map((item: any) => ({
    plan: getPlanLabelForTask(item),
    tarea: getTaskLabelForTask(item),
    tipo_captura: getFriendlyTaskCaptureType(item),
    valor_registrado: getTaskReportValue(item),
    captura: [
      item?.valor_boolean != null ? (item.valor_boolean ? "Sí" : "No") : "",
      item?.valor_numeric ?? "",
      item?.valor_text ?? "",
    ].filter(Boolean).join(" · "),
    observacion: item?.observacion || "",
    requisitos: getTaskRequirementChips(item).join(" · "),
  })),
);
const reportPreviewAttachments = computed(() =>
  attachmentRows.value.map((item: any) => ({
    tipo: item?.tipo || "",
    tipo_archivo: getFriendlyAttachmentType(item),
    origen: getAttachmentOriginLabel(item),
    nombre: item?.nombre || "",
    visualizacion: isAttachmentImage(item)
      ? "Imagen adjunta"
      : getAttachmentReportUrl(item) || "Sin enlace",
  })),
);
const reportPreviewHistory = computed(() =>
  localHistory.value.map((item: any) => ({
    from: workflowLabel(item?.from_status),
    to: workflowLabel(item?.to_status),
    user: item?.changed_by || "",
    date: item?.changed_at ? formatDateTime(item.changed_at, "") : "",
    note: item?.note || "",
  })),
);

const workOrderReportDefinition = computed(() =>
  buildWorkOrderReport({
    header: {
      code: headerForm.code,
      status_workflow: workflowLabel(headerForm.status_workflow),
      equipment_label: selectedEquipmentLabel.value,
      equipment_component_label: selectedEquipmentComponentLabel.value,
      maintenance_kind: headerForm.maintenance_kind,
      procedimiento: selectedProcedureLabel.value,
      plan_operativo: resolvedOperationalPlanLabel.value,
      alerta: selectedAlertLabel.value,
      blocked_by: selectedBlockingOrderLabel.value,
      blocked_reason: headerForm.blocked_reason,
      causa: headerForm.causa,
      accion: headerForm.accion,
      prevencion: headerForm.prevencion,
      creado_por: currentWorkOrderAudit.value?.created_by_label || currentWorkOrderAudit.value?.created_by || "",
      fecha_creacion: currentWorkOrderAudit.value?.created_at || "",
      realizado_por: currentWorkOrderAudit.value?.processed_by_label || currentWorkOrderAudit.value?.updated_by || "",
      fecha_realizacion: currentWorkOrderAudit.value?.processed_at || currentWorkOrderAudit.value?.updated_at || "",
      aprobado_por: currentWorkOrderAudit.value?.approved_by_label || "",
      fecha_aprobacion: currentWorkOrderAudit.value?.approved_at || "",
      accion_aprobacion: currentWorkOrderAudit.value?.approval_action || "",
    },
    tasks: taskRows.value.map((item: any) => ({
      plan: getPlanLabelForTask(item),
      tarea: getTaskLabelForTask(item),
      tipo_captura: getFriendlyTaskCaptureType(item),
      valor_registrado: getTaskReportValue(item),
      observacion: item?.observacion ?? "",
      requisitos: getTaskRequirementChips(item).join(" | "),
    })),
    attachments: attachmentRows.value.map((item: any) => buildWorkOrderAttachmentReportRow(item)),
    consumos: consumoRows.value.map((item: any) => ({
      bodega: item?.bodega_label || "",
      material: item?.producto_label || "",
      reservado: item?.cantidad_reservada || 0,
      emitido: item?.cantidad_emitida || 0,
      pendiente: item?.cantidad_pendiente || 0,
      costo_unitario: item?.costo_unitario || 0,
      subtotal: item?.subtotal || 0,
      observacion: item?.observacion || "",
    })),
    issues: issueRows.value.map((item: any) => ({
      salida: item?.entrega_code || "",
      fecha: item?.fecha_label || "",
      bodega: item?.bodega_label || "",
      material: item?.producto_label || "",
      cantidad: item?.cantidad || 0,
      costo_unitario: item?.costo_unitario || 0,
      subtotal: item?.subtotal || 0,
      observacion: item?.observacion || "",
    })),
    history: localHistory.value.map((item: any) => ({
      desde: workflowLabel(item?.from_status),
      hacia: workflowLabel(item?.to_status),
      usuario: item?.changed_by || "",
      nota: item?.note || "",
      fecha: item?.changed_at || "",
    })),
  }),
);

async function exportWorkOrder(format: "excel" | "pdf") {
  if (!canAccessWorkOrderReports.value) {
    ui.error("No tienes permisos para generar reportes de órdenes de trabajo.");
    return;
  }
  const key = exportKey(format);
  exportState[key] = true;
  error.value = null;
  try {
    if (format === "excel") {
      await downloadReportExcel(workOrderReportDefinition.value);
    } else {
      await downloadReportPdf(workOrderReportDefinition.value);
    }
  } catch (e: any) {
    error.value = e?.message || "No se pudo generar el reporte de la orden de trabajo.";
  } finally {
    exportState[key] = false;
  }
}

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

async function listAll(endpoint: string) {
  return listAllPages(endpoint);
}

function normalize(item: any) {
  const label = item?.nombre ?? item?.title ?? item?.tipo_alerta ?? item?.codigo ?? item?.id;
  return { value: item.id, title: `${item?.codigo ? `${item.codigo} - ` : ""}${label}` };
}

function normalizeEquipmentComponent(item: any) {
  const officialName = String(item?.nombre_oficial || item?.nombre || "").trim();
  const shortName = String(item?.nombre || "").trim();
  const category = String(item?.categoria || "").trim();
  return {
    value: item.id,
    title: [item?.codigo || null, officialName || shortName || item?.id, category || null]
      .filter(Boolean)
      .join(" - "),
  };
}

const productNameMap = computed(() => {
  const out: Record<string, string> = {};
  for (const item of productCatalogRows.value) {
    const key = String(item?.id || "");
    if (!key) continue;
    out[key] = normalize(item).title;
  }
  for (const item of consumoProductOptions.value) {
    const key = String(item?.value || "");
    if (!key || out[key]) continue;
    out[key] = String(item?.label || item?.title || key);
  }
  for (const row of localConsumos.value) {
    const key = String(row?.producto_id || "");
    if (!key || out[key]) continue;
    out[key] = String(row?.producto_label || row?.producto_nombre || key);
  }
  for (const issue of localIssues.value) {
    const details = Array.isArray(issue?.items) ? issue.items : [];
    for (const row of details) {
      const key = String(row?.producto_id || "");
      if (!key || out[key]) continue;
      out[key] = String(row?.producto_label || row?.producto_nombre || key);
    }
  }
  return out;
});

const warehouseNameMap = computed(() => warehouseCatalogRows.value.reduce((acc: Record<string, string>, item: any) => {
  const key = String(item?.id || "");
  if (!key) return acc;
  acc[key] = normalize(item).title;
  return acc;
}, {}));

function toPositiveNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStockProductOption(row: any) {
  const productId = String(row?.producto_id || row?.id || "");
  const productLabel =
    row?.producto_label ||
    row?.producto_nombre ||
    productNameMap.value[productId] ||
    productId;
  const stock = toPositiveNumber(row?.stock_actual);
  return {
    value: productId,
    title: `${productLabel} - Stock: ${stock}`,
    label: String(productLabel || productId),
    stock_actual: stock,
  };
}

async function loadConsumoProducts(options?: { reset?: boolean; search?: string }) {
  const warehouseId = String(consumoForm.bodega_id || "").trim();
  if (!warehouseId) {
    consumoProductOptions.value = [];
    consumoProductsPage.value = 1;
    consumoProductsTotalPages.value = 1;
    consumoProductsTotal.value = 0;
    return;
  }

  const searchValue = String(options?.search ?? consumoProductSearch.value ?? "").trim();
  const reset = Boolean(options?.reset);
  const pageToLoad = reset ? 1 : consumoProductsPage.value;
  const requestId = ++consumoProductsRequestId;

  loadingConsumoProducts.value = true;
  try {
    const { data } = await api.get("/kpi_inventory/stock-bodega", {
      params: {
        bodega_id: warehouseId,
        search: searchValue || undefined,
        page: pageToLoad,
        limit: 50,
      },
    });

    if (requestId !== consumoProductsRequestId) return;

    const rows = asArray(data).map(normalizeStockProductOption).filter((item: any) => item.value);
    const pagination = data?.pagination ?? {};
    const nextItems = reset ? [] : [...consumoProductOptions.value];
    const seen = new Set(nextItems.map((item: any) => String(item?.value || "")));
    for (const row of rows) {
      const key = String(row?.value || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      nextItems.push(row);
    }

    consumoProductOptions.value = nextItems;
    consumoProductsPage.value = Number(pagination?.page || pageToLoad || 1);
    consumoProductsTotalPages.value = Number(pagination?.totalPages || 1);
    consumoProductsTotal.value = Number(pagination?.total || nextItems.length);
  } catch (e: any) {
    if (requestId === consumoProductsRequestId) {
      consumoProductOptions.value = [];
      consumoProductsPage.value = 1;
      consumoProductsTotalPages.value = 1;
      consumoProductsTotal.value = 0;
      ui.error(e?.response?.data?.message || "No se pudieron cargar los materiales de la bodega.");
    }
  } finally {
    if (requestId === consumoProductsRequestId) {
      loadingConsumoProducts.value = false;
    }
  }
}

async function loadMoreConsumoProducts() {
  if (loadingConsumoProducts.value) return;
  if (consumoProductsPage.value >= consumoProductsTotalPages.value) return;
  consumoProductsPage.value += 1;
  await loadConsumoProducts();
}

function getWarehouseReservedProductOptions(warehouseId: string) {
  const warehouseKey = String(warehouseId || "");
  const grouped = new Map<string, { value: string; title: string; pending: number }>();
  for (const row of consumoRows.value) {
    if (String(row?.bodega_id || "") !== warehouseKey) continue;
    const productKey = String(row?.producto_id || "");
    if (!productKey) continue;
    const current = grouped.get(productKey) ?? {
      value: productKey,
      title: String(row?.producto_label || row?.producto_nombre || productNameMap.value[productKey] || productKey),
      pending: 0,
    };
    current.pending += toPositiveNumber(row?.cantidad_pendiente);
    grouped.set(productKey, current);
  }
  const reservedOptions = [...grouped.values()]
    .filter((item) => item.pending > 0)
    .map((item) => ({
      value: item.value,
      title: `${item.title} - Reservado pendiente: ${item.pending}`,
    }))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  return reservedOptions;
}

const consumoRows = computed(() => localConsumos.value.map((item: any) => ({
  ...item,
  producto_label: item?.producto_label || item?.producto_nombre || productNameMap.value[String(item?.producto_id || "")] || item?.producto_id || "-",
  bodega_label: item?.bodega_label || item?.bodega_nombre || warehouseNameMap.value[String(item?.bodega_id || "")] || item?.bodega_id || "-",
  cantidad: toPositiveNumber(item?.cantidad),
  cantidad_reservada: toPositiveNumber(item?.cantidad_reservada ?? item?.cantidad),
  cantidad_emitida: toPositiveNumber(item?.cantidad_emitida),
  cantidad_pendiente: toPositiveNumber(item?.cantidad_pendiente ?? item?.cantidad),
  costo_unitario: toPositiveNumber(item?.costo_unitario),
  subtotal: toPositiveNumber(item?.subtotal ?? (toPositiveNumber(item?.cantidad) * toPositiveNumber(item?.costo_unitario))),
  observacion: item?.observacion || "-",
})));

const issueRows = computed(() => localIssues.value.flatMap((issue: any) => {
  const rawItems = Array.isArray(issue?.items) ? issue.items : [];
  return rawItems.map((detail: any, index: number) => ({
    id: `${issue?.id || issue?.entrega_id || 'issue'}-${detail?.id || index}`,
    entrega_code: issue?.code || issue?.codigo || "Sin código",
    fecha_label: issue?.fecha ? formatDateTime(issue.fecha, "-") : "-",
    producto_label: detail?.producto_label || detail?.producto_nombre || productNameMap.value[String(detail?.producto_id || "")] || detail?.producto_id || "-",
    bodega_label: detail?.bodega_label || detail?.bodega_nombre || warehouseNameMap.value[String(detail?.bodega_id || "")] || detail?.bodega_id || "-",
    cantidad: toPositiveNumber(detail?.cantidad),
    costo_unitario: toPositiveNumber(detail?.costo_unitario),
    subtotal: toPositiveNumber(detail?.cantidad) * toPositiveNumber(detail?.costo_unitario),
    observacion: issue?.observacion || "-",
  }));
}));

function resetConsumoProductIfInvalid() {
  if (!consumoForm.bodega_id) {
    consumoForm.producto_id = "";
    return;
  }
  const exists = consumoProductOptions.value.some((option: any) => String(option.value) === String(consumoForm.producto_id || ""));
  if (!exists) consumoForm.producto_id = "";
}

function resetMaterialProductIfInvalid(index: number) {
  const current = materialItems.value[index];
  if (!current) return;
  if (!current.bodega_id) {
    current.producto_id = "";
    return;
  }
  const exists = getWarehouseReservedProductOptions(String(current.bodega_id)).some((option: any) => String(option.value) === String(current.producto_id || ""));
  if (!exists) current.producto_id = "";
}

async function syncConsumoUnitCost() {
  if (!consumoForm.producto_id || !consumoForm.bodega_id) {
    consumoForm.costo_unitario = "";
    return;
  }
  try {
    const { data } = await api.get("/kpi_maintenance/inventory/cost-reference", {
      params: {
        producto_id: consumoForm.producto_id,
        bodega_id: consumoForm.bodega_id,
      },
    });
    const resolved = unwrapData(data);
    const nextCost = Number(
      resolved?.costo_unitario
      ?? resolved?.saldo_costo_promedio
      ?? resolved?.ultimo_costo
      ?? 0,
    );
    consumoForm.costo_unitario = nextCost > 0 ? String(nextCost) : "";
  } catch {
    consumoForm.costo_unitario = "";
  }
}
function getEquipmentLabel(item: any) {
  if (!item) return "";
  return (
    item?.equipment_nombre
    || item?.equipo_nombre
    || equipmentOptions.value.find((option) => String(option.value) === String(item.equipment_id))?.title
    || item?.equipment_id
    || ""
  );
}


async function loadCatalogs() {
  loadingCatalogs.value = true;
  try {
    const [equipos, planes, procedimientos, alertas, bodegas] = await Promise.all([
    listAll("/kpi_maintenance/equipos"),
    listAll("/kpi_maintenance/planes"),
    listAll("/kpi_maintenance/inteligencia/procedimientos"),
    listAll("/kpi_maintenance/alertas"),
      listAll("/kpi_inventory/bodegas"),
    ]);
    equipmentOptions.value = equipos.map(normalize);
    planOptions.value = planes.map(normalize);
    procedureCatalog.value = procedimientos;
    procedureOptions.value = procedimientos.map(normalize);
    workOrderCatalogRows.value = records.value;
    alertOptions.value = alertas.map((item: any) => ({
    value: item.id,
    title: [
      item?.title || item?.tipo_alerta || item?.nombre || item?.codigo || item?.id,
      item?.equipo_label || item?.equipo_nombre || null,
      Number(item?.work_order_count || 0) > 0
        ? `${item.work_order_count} OT${Number(item?.work_order_count || 0) === 1 ? "" : "s"}`
        : "Sin OT",
    ]
      .filter(Boolean)
      .join(" · "),
    }));
    productCatalogRows.value = [];
    warehouseCatalogRows.value = bodegas;
    warehouseOptions.value = bodegas.map(normalize);
    catalogsLoaded.value = true;
  } finally {
    loadingCatalogs.value = false;
  }
}

async function ensureCatalogsLoaded(force = false) {
  if (catalogsLoaded.value && !force) return;
  if (catalogsPromise && !force) {
    await catalogsPromise;
    return;
  }
  catalogsPromise = loadCatalogs();
  try {
    await catalogsPromise;
  } finally {
    catalogsPromise = null;
  }
}

async function loadEquipmentComponents(equipmentId: string) {
  const normalized = String(equipmentId || "").trim();
  if (!normalized) {
    equipmentComponentOptions.value = [];
    return;
  }
  loadingEquipmentComponents.value = true;
  try {
    const { data } = await api.get("/kpi_maintenance/componentes", {
      params: { equipo_id: normalized },
    });
    equipmentComponentOptions.value = asArray(data).map(normalizeEquipmentComponent);
  } catch (e: any) {
    equipmentComponentOptions.value = [];
    ui.error(e?.response?.data?.message || "No se pudieron cargar los compartimientos del equipo.");
  } finally {
    loadingEquipmentComponents.value = false;
  }
}

function getSuggestedProcedureComponentId(procedure: any) {
  const referenceCode = String(procedure?.compartimiento_codigo_referencia || "")
    .trim()
    .toUpperCase();
  const officialName = String(procedure?.compartimiento_nombre_oficial || "")
    .trim()
    .toUpperCase();
  if (!referenceCode && !officialName) return "";
  const match = equipmentComponentOptions.value.find((option: any) => {
    const title = String(option?.title || "").toUpperCase();
    return (
      (referenceCode && title.includes(referenceCode)) ||
      (officialName && title.includes(officialName))
    );
  });
  return String(match?.value || "");
}

function getEquipmentComponentLabel(item: any) {
  const selected = equipmentComponentOptions.value.find(
    (option: any) => String(option?.value || "") === String(item?.equipo_componente_id || ""),
  );
  return (
    item?.equipo_componente_nombre_oficial
    || item?.equipo_componente_nombre
    || selected?.title
    || ""
  );
}

function getSelectedPlanLabel(planId: string) {
  if (!planId) return "Sin plan";
  const selectedPlan = planOptions.value.find((plan) => String(plan.value) === String(planId));
  if (selectedPlan?.title) return selectedPlan.title;
  const fromProcedure = procedureCatalog.value.find((item: any) => String(item?.plan_id || "") === String(planId));
  if (fromProcedure?.plan_codigo || fromProcedure?.plan_nombre) {
    return [fromProcedure.plan_codigo, fromProcedure.plan_nombre].filter(Boolean).join(" - ");
  }
  return planId;
}

function getSelectedTaskLabel(planId: string, taskId: string) {
  if (!taskId) return "Sin tarea";
  const planKey = String(planId || "");
  const taskKey = String(taskId);
  const planCache = taskLabelCacheByPlan.value[planKey] || {};
  return planCache[taskKey] || taskId;
}

function getPlanLabelForTask(task: any) {
  return task?.plan_label || task?.plan_nombre || getSelectedPlanLabel(task?.plan_id);
}

function getTaskLabelForTask(task: any) {
  return (
    task?.tarea_label
    || task?.tarea_nombre
    || task?.tarea?.nombre
    || task?.task_name
    || getSelectedTaskLabel(task?.plan_id, task?.tarea_id)
  );
}

function getTaskDefinition(planId: string, taskId: string) {
  const planKey = String(planId || "");
  const taskKey = String(taskId || "");
  return (planTaskCatalogByPlan.value[planKey] ?? []).find(
    (item: any) => String(item?.id || "") === taskKey,
  );
}

function getTaskDetailText(task: any) {
  const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
  const meta = definition?.meta ?? task?.task_meta ?? {};
  const detail = String(meta?.detalle || "").trim();
  const fase = String(meta?.fase || "").trim();
  return [fase, detail].filter(Boolean).join(" - ");
}

function getTaskRequirementChips(task: any) {
  const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
  const meta = definition?.meta ?? task?.task_meta ?? {};
  const chips: string[] = [];
  if (definition?.required || meta?.required) chips.push("Obligatoria");
  if (meta?.requiere_permiso) chips.push("Permiso");
  if (meta?.requiere_epp) chips.push("EPP");
  if (meta?.requiere_bloqueo) chips.push("Bloqueo");
  if (meta?.requiere_evidencia) chips.push("Evidencia");
  const evidencias = Array.isArray(meta?.evidencias_requeridas)
    ? meta.evidencias_requeridas
    : [];
  for (const evidencia of evidencias) {
    const label = String(evidencia || "").trim();
    if (label) chips.push(label);
  }
  return chips;
}

function normalizeTaskFieldType(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (["BOOLEAN", "BOOL", "CHECKBOX"].includes(raw)) return "BOOLEAN";
  if (["NUMBER", "NUMERIC", "DECIMAL", "INTEGER"].includes(raw)) return "NUMBER";
  if (["JSON", "OBJECT", "OBJETO", "EVIDENCIA"].includes(raw)) return "JSON";
  if (["TEXT", "TEXTO", "STRING"].includes(raw)) return "TEXT";
  return "BOOLEAN";
}

function normalizeEvidenceKind(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (["IMAGEN", "IMAGE", "FOTO", "PHOTO"].includes(raw)) return "IMAGEN";
  if (["DOCUMENTO", "DOCUMENT", "DOC", "PDF"].includes(raw)) return "DOCUMENTO";
  if (["VIDEO"].includes(raw)) return "VIDEO";
  return raw || "ARCHIVO";
}

function getTaskEvidenceRequirements(task: any): string[] {
  const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
  const meta = definition?.meta ?? task?.task_meta ?? {};
  const evidencias: string[] = Array.isArray(meta?.evidencias_requeridas)
    ? meta.evidencias_requeridas
      .map((value: unknown) => normalizeEvidenceKind(value))
      .filter((value: string) => Boolean(value))
    : [];
  if (evidencias.length) return [...new Set(evidencias)];
  if (meta?.requiere_evidencia) return ["ARCHIVO"];
  return [];
}

function getTaskEvidenceRequirementLabel(requirement: string) {
  const normalized = normalizeEvidenceKind(requirement);
  if (normalized === "IMAGEN") return "Imagen";
  if (normalized === "DOCUMENTO") return "Documento";
  if (normalized === "VIDEO") return "Video";
  return "Archivo";
}

function getTaskEvidenceAccept(requirement: string) {
  const normalized = normalizeEvidenceKind(requirement);
  if (normalized === "IMAGEN") return "image/*";
  if (normalized === "DOCUMENTO") {
    return [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
      ".csv",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ].join(",");
  }
  if (normalized === "VIDEO") return "video/*";
  return undefined;
}

function getTaskJsonObject(task: any): Record<string, any> {
  if (task?.valor_json && typeof task.valor_json === "object" && !Array.isArray(task.valor_json)) {
    return { ...(task.valor_json as Record<string, any>) };
  }
  const raw = typeof task?._json_text === "string" ? task._json_text.trim() : "";
  if (!raw) {
    return {
      evidencias_requeridas: getTaskEvidenceRequirements(task),
      adjuntos: [],
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        ...(parsed as Record<string, any>),
        evidencias_requeridas: getTaskEvidenceRequirements(task),
      };
    }
  } catch {
    // fallback handled by JSON validation elsewhere
  }
  return {
    evidencias_requeridas: getTaskEvidenceRequirements(task),
    adjuntos: [],
  };
}

function setTaskJsonObject(task: any, value: Record<string, unknown>) {
  task.valor_json = value;
  task._json_text = JSON.stringify(value, null, 2);
  markTaskDirty(task);
}

function isTaskEvidenceField(task: any) {
  return getTaskFieldType(task) === "JSON" && getTaskEvidenceRequirements(task).length > 0;
}

function getTaskEvidenceEntries(task: any, requirement?: string): any[] {
  const payload = getTaskJsonObject(task);
  const legacyEvidence = (payload as any)?.evidencia;
  const adjuntos: any[] = Array.isArray(payload?.adjuntos)
    ? payload.adjuntos
    : legacyEvidence
      ? [legacyEvidence]
      : [];
  const normalizedRequirement = requirement ? normalizeEvidenceKind(requirement) : "";
  return adjuntos.filter((entry: any) => {
    if (!normalizedRequirement) return true;
    return normalizeEvidenceKind(entry?.evidence_kind || entry?.tipo) === normalizedRequirement;
  });
}

function getTaskEvidenceEntryKey(entry: any) {
  return String(entry?.draft_attachment_id || entry?.attachment_id || entry?.nombre || Math.random());
}

function getTaskEvidenceInputKey(task: any, requirement: string) {
  const baseKey = `${String(task?.id || task?.tarea_id || "task")}:${normalizeEvidenceKind(requirement)}`;
  return `${baseKey}:${taskEvidenceInputKeys.value[baseKey] ?? 0}`;
}

function bumpTaskEvidenceInputKey(task: any, requirement: string) {
  const baseKey = `${String(task?.id || task?.tarea_id || "task")}:${normalizeEvidenceKind(requirement)}`;
  taskEvidenceInputKeys.value[baseKey] = (taskEvidenceInputKeys.value[baseKey] ?? 0) + 1;
}

function getTaskFieldType(task: any) {
  const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
  return normalizeTaskFieldType(
    definition?.field_type ?? definition?.meta?.field_type ?? task?.field_type ?? task?.task_meta?.field_type,
  );
}

function getFriendlyTaskCaptureType(task: any) {
  const fieldType = getTaskFieldType(task);
  if (fieldType === "BOOLEAN") return "CHECK";
  if (fieldType === "NUMBER") return "NUMERO";
  if (fieldType === "TEXT") return "TEXTO";
  if (fieldType === "JSON") {
    return isTaskEvidenceField(task) || getTaskEvidenceEntries(task).length > 0 ? "ARCHIVOS" : "FORMULARIO";
  }
  return "CAMPO";
}

function getTaskReportValue(task: any) {
  const fieldType = getTaskFieldType(task);
  if (fieldType === "BOOLEAN") {
    return task?.valor_boolean == null ? "" : task.valor_boolean ? "Si" : "No";
  }
  if (fieldType === "NUMBER") {
    return task?.valor_numeric ?? "";
  }
  if (fieldType === "TEXT") {
    return String(task?.valor_text ?? "").trim();
  }
  if (fieldType === "JSON") {
    if (isTaskEvidenceField(task) || getTaskEvidenceEntries(task).length > 0) {
      return getTaskEvidenceEntries(task)
        .map((entry: any) => {
          const fileName = String(entry?.nombre || "Adjunto").trim();
          const evidenceLabel = getTaskEvidenceRequirementLabel(entry?.evidence_kind || entry?.tipo);
          return evidenceLabel === "Archivo" ? fileName : `${evidenceLabel}: ${fileName}`;
        })
        .filter(Boolean)
        .join(" | ");
    }
    return String(getTaskJsonText(task) ?? "").trim() ? "Formulario registrado" : "";
  }
  return "";
}

function getAttachmentMimeType(attachment: any) {
  return String(attachment?.mime_type || attachment?.meta?.mime_type || "").trim().toLowerCase();
}

function isAttachmentImage(attachment: any) {
  const mimeType = getAttachmentMimeType(attachment);
  if (mimeType.startsWith("image/")) return true;
  return normalizeEvidenceKind(attachment?.meta?.evidence_kind || attachment?.tipo) === "IMAGEN";
}

function isAttachmentVideo(attachment: any) {
  const mimeType = getAttachmentMimeType(attachment);
  if (mimeType.startsWith("video/")) return true;
  return normalizeEvidenceKind(attachment?.meta?.evidence_kind || attachment?.tipo) === "VIDEO";
}

function getFriendlyAttachmentType(attachment: any) {
  if (isAttachmentImage(attachment)) return "IMAGEN";
  if (isAttachmentVideo(attachment)) return "VIDEO";
  return "DOCUMENTO";
}

function getAttachmentReportUrl(attachment: any) {
  const rawUrl = String(attachment?.view_url || attachment?.preview_url || "").trim();
  if (!rawUrl) return "";
  if (/^(https?:|blob:|data:)/i.test(rawUrl)) return rawUrl;
  const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `https://justicecompany-ec.com${normalizedPath}`;
}

function buildWorkOrderAttachmentReportRow(attachment: any, compact = false) {
  const isImage = isAttachmentImage(attachment);
  const url = getAttachmentReportUrl(attachment);
  return {
    tipo_archivo: getFriendlyAttachmentType(attachment),
    origen: getAttachmentOriginLabel(attachment),
    nombre: attachment?.nombre || "",
    visualizacion: compact ? (isImage ? "Imagen adjunta" : url || "Sin enlace") : undefined,
    vista_previa: isImage ? "Imagen adjunta" : "",
    url_visualizacion: url,
    media_url: isImage ? url : "",
  };
}

function isTaskRequired(task: any) {
  const definition = getTaskDefinition(task?.plan_id, task?.tarea_id);
  if (typeof definition?.required === "boolean") return definition.required;
  if (typeof definition?.meta?.required === "boolean") return definition.meta.required;
  if (typeof task?.task_meta?.required === "boolean") return task.task_meta.required;
  return false;
}

function markTaskDirty(task: any) {
  task._dirty = true;
}

function getTaskJsonText(task: any) {
  if (!isTaskEvidenceField(task) && typeof task?._json_text === "string" && task._json_text.trim()) {
    return task._json_text;
  }
  return JSON.stringify(getTaskJsonObject(task), null, 2);
}

function setTaskBooleanValue(task: any, value: unknown) {
  task.valor_boolean = Boolean(value);
  markTaskDirty(task);
}

function setTaskNumericValue(task: any, value: unknown) {
  const raw = String(value ?? "").trim();
  task.valor_numeric = raw === "" ? null : Number(raw);
  markTaskDirty(task);
}

function setTaskTextValue(task: any, value: unknown) {
  task.valor_text = String(value ?? "");
  markTaskDirty(task);
}

function setTaskObservation(task: any, value: unknown) {
  task.observacion = String(value ?? "");
  markTaskDirty(task);
}

function setTaskJsonValue(task: any, value: unknown) {
  task._json_text = String(value ?? "");
  try {
    const parsed = JSON.parse(task._json_text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      task.valor_json = parsed;
    }
  } catch {
    // keep raw text so validation can surface the issue on save
  }
  markTaskDirty(task);
}

function getAttachmentOriginLabel(attachment: any) {
  const meta = attachment?.meta ?? {};
  const source = String(meta?.source || "").trim().toUpperCase();
  if (source === "TASK_EVIDENCE") {
    const taskLabel = String(meta?.task_label || meta?.tarea_label || "").trim();
    const evidenceKind = String(meta?.evidence_kind || "").trim();
    return [taskLabel || "Tarea", evidenceKind ? `· ${getTaskEvidenceRequirementLabel(evidenceKind)}` : ""]
      .join(" ")
      .trim();
  }
  return "OT general";
}

function buildTaskEvidenceAttachmentMeta(task: any, requirement: string) {
  return {
    source: "TASK_EVIDENCE",
    plan_id: task?.plan_id || null,
    tarea_id: task?.tarea_id || null,
    task_label: getTaskLabelForTask(task),
    plan_label: getPlanLabelForTask(task),
    evidence_kind: normalizeEvidenceKind(requirement),
  };
}

function buildTaskEvidenceAttachmentRef(draftAttachment: any, requirement: string) {
  return {
    draft_attachment_id: draftAttachment.id,
    attachment_id: null,
    evidence_kind: normalizeEvidenceKind(requirement),
    nombre: draftAttachment.nombre,
    mime_type: draftAttachment.mime_type || null,
    tipo: draftAttachment.tipo || "EVIDENCIA",
  };
}

async function handleTaskEvidenceFiles(task: any, requirement: string, value: File | File[] | null) {
  if (isReadOnlyWorkflow.value) {
    ui.error("La OT está cerrada y no permite edición.");
    return;
  }

  const files = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  if (!files.length) return;

  const payload = getTaskJsonObject(task);
  const attachments: any[] = Array.isArray(payload.adjuntos) ? [...payload.adjuntos] : [];

  for (const file of files) {
    const base64 = await fileToBase64(file);
    const draftId = `draft-task-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draftAttachment = {
      id: draftId,
      tipo: "EVIDENCIA",
      nombre: file.name,
      contenido_base64: base64,
      mime_type: file.type || "application/octet-stream",
      preview_url: URL.createObjectURL(file),
      meta: buildTaskEvidenceAttachmentMeta(task, requirement),
      _isDraft: true,
      _raw: null,
    };
    attachmentRows.value.unshift(draftAttachment);
    attachments.push(buildTaskEvidenceAttachmentRef(draftAttachment, requirement));
  }

  setTaskJsonObject(task, {
    ...payload,
    evidencias_requeridas: getTaskEvidenceRequirements(task),
    adjuntos: attachments,
  });
  bumpTaskEvidenceInputKey(task, requirement);
  ui.success("Evidencia agregada a la tarea.");
}

function openTaskEvidenceAttachment(attachment: any) {
  const draftAttachmentId = String(attachment?.draft_attachment_id || "").trim();
  if (draftAttachmentId) {
    const draft = attachmentRows.value.find((row) => String(row?.id || "") === draftAttachmentId);
    if (draft) {
      openAttachment(draft);
      return;
    }
  }

  const attachmentId = String(attachment?.attachment_id || "").trim();
  if (!attachmentId || !editingId.value) return;
  const persisted = attachmentRows.value.find((row) => String(row?.id || "") === attachmentId);
  if (persisted) {
    openAttachment(persisted);
  }
}

function removeDraftAttachmentIfUnreferenced(draftAttachmentId: string) {
  const isStillReferenced = taskRows.value.some((row) =>
    getTaskEvidenceEntries(row).some(
      (attachment: any) => String(attachment?.draft_attachment_id || "") === draftAttachmentId,
    ),
  );
  if (!isStillReferenced) {
    attachmentRows.value = attachmentRows.value.filter((row) => String(row?.id || "") !== draftAttachmentId);
  }
}

function unlinkAttachmentFromTaskEvidence(attachmentId?: string | null, draftAttachmentId?: string | null) {
  for (const task of taskRows.value) {
    const payload = getTaskJsonObject(task);
    const currentEntries = getTaskEvidenceEntries(task);
    const adjuntos = currentEntries.filter((entry: any) => {
      const matchesAttachment = attachmentId && String(entry?.attachment_id || "") === String(attachmentId);
      const matchesDraft = draftAttachmentId && String(entry?.draft_attachment_id || "") === String(draftAttachmentId);
      return !matchesAttachment && !matchesDraft;
    });
    if (adjuntos.length !== currentEntries.length) {
      setTaskJsonObject(task, {
        ...payload,
        evidencias_requeridas: getTaskEvidenceRequirements(task),
        adjuntos,
      });
    }
  }
}

function removeTaskEvidenceAttachment(task: any, attachment: any) {
  if (isReadOnlyWorkflow.value) {
    ui.error("La OT está cerrada y no permite edición.");
    return;
  }
  const payload = getTaskJsonObject(task);
  const attachmentKey = getTaskEvidenceEntryKey(attachment);
  const adjuntos = getTaskEvidenceEntries(task).filter(
    (entry: any) => getTaskEvidenceEntryKey(entry) !== attachmentKey,
  );
  setTaskJsonObject(task, {
    ...payload,
    evidencias_requeridas: getTaskEvidenceRequirements(task),
    adjuntos,
  });

  const draftAttachmentId = String(attachment?.draft_attachment_id || "").trim();
  if (draftAttachmentId) {
    removeDraftAttachmentIfUnreferenced(draftAttachmentId);
  }
}

function validateTaskValue(task: any) {
  const fieldType = getTaskFieldType(task);
  if (fieldType === "NUMBER") {
    return task.valor_numeric !== null && task.valor_numeric !== undefined && Number.isFinite(Number(task.valor_numeric));
  }
  if (fieldType === "TEXT") {
    return String(task.valor_text ?? "").trim().length > 0;
  }
  if (fieldType === "JSON") {
    if (isTaskEvidenceField(task)) {
      const requiredKinds = getTaskEvidenceRequirements(task);
      const entries = getTaskEvidenceEntries(task);
      if (!entries.length) return false;
      return requiredKinds.every((kind) =>
        entries.some((entry: any) => normalizeEvidenceKind(entry?.evidence_kind) === normalizeEvidenceKind(kind)),
      );
    }
    const raw = String(getTaskJsonText(task) ?? "").trim();
    if (!raw) return false;
    try {
      JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

function buildTaskPersistencePayload(task: any) {
  const fieldType = getTaskFieldType(task);
  let valor_boolean: boolean | null = null;
  let valor_numeric: number | null = null;
  let valor_text: string | null = null;
  let valor_json: Record<string, unknown> | null = null;

  if (fieldType === "BOOLEAN") {
    valor_boolean = Boolean(task.valor_boolean);
  } else if (fieldType === "NUMBER") {
    valor_numeric =
      task.valor_numeric === null || task.valor_numeric === undefined || task.valor_numeric === ""
        ? null
        : Number(task.valor_numeric);
  } else if (fieldType === "TEXT") {
    valor_text = String(task.valor_text ?? "").trim() || null;
  } else {
    if (isTaskEvidenceField(task)) {
      const payload = getTaskJsonObject(task);
      valor_json = {
        ...payload,
        evidencias_requeridas: getTaskEvidenceRequirements(task),
        adjuntos: getTaskEvidenceEntries(task).map((attachment: any) => ({
          attachment_id: attachment?.attachment_id || null,
          evidence_kind: normalizeEvidenceKind(attachment?.evidence_kind),
          nombre: attachment?.nombre || null,
          mime_type: attachment?.mime_type || null,
          tipo: attachment?.tipo || "EVIDENCIA",
        })),
      };
    } else {
      const raw = String(getTaskJsonText(task) ?? "").trim();
      if (raw) {
        try {
          valor_json = JSON.parse(raw);
        } catch {
          throw new Error(`La tarea ${getTaskLabelForTask(task)} requiere un JSON válido.`);
        }
      }
    }
  }

  if (isTaskRequired(task) && !validateTaskValue(task)) {
    throw new Error(`Completa la captura obligatoria de la tarea ${getTaskLabelForTask(task)}.`);
  }

  return {
    plan_id: task.plan_id,
    tarea_id: task.tarea_id,
    valor_boolean,
    valor_numeric,
    valor_text,
    valor_json,
    observacion: String(task.observacion ?? "").trim() || null,
  };
}

function validateTaskRowsForSave() {
  for (const row of taskRows.value) {
    try {
      buildTaskPersistencePayload(row);
    } catch (error: any) {
      ui.error(error?.message || "Revisa la captura de tareas antes de guardar.");
      return false;
    }
  }
  return true;
}

async function syncChecklistFromTemplate(showToast = true) {
  const selectedProcedurePlanId = String(selectedProcedure.value?.plan_id || "");
  const planId = String(headerForm.plan_id || taskForm.plan_id || selectedProcedurePlanId || "");
  if (!planId) return;

  headerForm.plan_id = planId;
  taskForm.plan_id = planId;
  await loadTaskOptionsByPlan(planId);
  const definitions = planTaskCatalogByPlan.value[planId] ?? [];
  if (!definitions.length) return;

  const existingTaskIds = new Set(
    taskRows.value.map((row: any) => String(row?.tarea_id || "")).filter(Boolean),
  );

  const drafts = definitions
    .filter((definition: any) => !existingTaskIds.has(String(definition?.id || "")))
    .map((definition: any) => ({
      id: `draft-task-${Date.now()}-${String(definition?.id || "").slice(0, 8)}`,
      plan_id: planId,
      tarea_id: definition.id,
      field_type: definition.field_type,
      required: definition.required,
      observacion: taskForm.observacion || null,
      plan_label: getSelectedPlanLabel(planId),
      tarea_label: normalizeTask(definition).title,
      task_meta: definition.meta ?? {},
      valor_boolean: normalizeTaskFieldType(definition.field_type) === "BOOLEAN" ? false : null,
      valor_numeric: null,
      valor_text: "",
      valor_json:
        normalizeTaskFieldType(definition.field_type) === "JSON"
          ? {
              evidencias_requeridas: Array.isArray(definition?.meta?.evidencias_requeridas)
                ? definition.meta.evidencias_requeridas.map((value: unknown) => normalizeEvidenceKind(value))
                : [],
              adjuntos: [],
            }
          : null,
      _json_text:
        normalizeTaskFieldType(definition.field_type) === "JSON"
          ? JSON.stringify(
              {
                adjuntos: [],
                evidencias_requeridas: Array.isArray(definition?.meta?.evidencias_requeridas)
                  ? definition.meta.evidencias_requeridas.map((value: unknown) => normalizeEvidenceKind(value))
                  : [],
              },
              null,
              2,
            )
          : "",
      _isDraft: true,
      _raw: null,
    }));

  if (drafts.length) {
    taskRows.value = [...drafts, ...taskRows.value];
    taskForm.observacion = "";
    if (showToast) ui.success("Checklist sincronizado desde la plantilla MPG.");
  } else if (showToast) {
    ui.open("El checklist de la plantilla ya estaba cargado.", "info", 3500);
  }
}

const selectedProcedure = computed(
  () =>
    procedureCatalog.value.find(
      (item: any) => String(item?.id || "") === String(headerForm.procedimiento_id || ""),
    ) ?? null,
);

const selectedProcedureLabel = computed(
  () =>
    selectedProcedure.value?.codigo
      ? `${selectedProcedure.value.codigo} - ${selectedProcedure.value.nombre || selectedProcedure.value.codigo}`
      : selectedProcedure.value?.nombre || "Sin plantilla MPG",
);

const selectedEquipmentLabel = computed(() => {
  const selected = equipmentOptions.value.find(
    (item: any) => String(item?.value || "") === String(headerForm.equipment_id || ""),
  );
  return selected?.title || String(headerForm.equipment_id || "Sin equipo");
});

const selectedEquipmentComponentLabel = computed(() => {
  const selected = equipmentComponentOptions.value.find(
    (item: any) => String(item?.value || "") === String(headerForm.equipo_componente_id || ""),
  );
  return selected?.title || String(headerForm.equipo_componente_id || "Sin compartimiento");
});

const selectedAlertLabel = computed(() => {
  const selected = alertOptions.value.find(
    (item: any) => String(item?.value || "") === String(headerForm.alerta_id || ""),
  );
  return selected?.title || String(headerForm.alerta_id || "");
});

const selectedBlockingOrderLabel = computed(() => {
  const selected = blockingWorkOrderOptions.value.find(
    (item: any) => String(item?.value || "") === String(headerForm.blocked_by_work_order_id || ""),
  );
  return selected?.title || String(headerForm.blocked_by_work_order_id || "");
});

const resolvedOperationalPlanLabel = computed(() => {
  if (headerForm.plan_id) return getSelectedPlanLabel(headerForm.plan_id);
  if (!headerForm.procedimiento_id) return "Se generara al guardar";
  if (selectedProcedure.value?.plan_id) {
    return getSelectedPlanLabel(String(selectedProcedure.value.plan_id));
  }
  return `Se sincroniza desde ${selectedProcedureLabel.value}`;
});

function buildAutoHeaderValues() {
  const referenceLabel = headerForm.procedimiento_id
    ? selectedProcedureLabel.value
    : getSelectedPlanLabel(headerForm.plan_id);
  const generatedTitle = `Orden (${referenceLabel})`;
  const generatedType = headerForm.type || "MANTENIMIENTO";
  return { generatedTitle, generatedType };
}

function unwrapData<T = any>(payload: T): any {
  if (payload && typeof payload === "object" && "data" in (payload as any)) {
    return (payload as any).data;
  }
  return payload;
}

function hasApiNotImplemented(error: any) {
  const status = Number(error?.response?.status || 0);
  return status === 404 || status === 405 || status === 501;
}

async function safeGetList(url: string, fallbackMessage: string) {
  try {
    const { data } = await api.get(url);
    return asArray(data);
  } catch (e: any) {
    if (hasApiNotImplemented(e)) {
      if (!unsupportedDetailMessages.value.includes(fallbackMessage)) {
        unsupportedDetailMessages.value.push(fallbackMessage);
      }
      return [];
    }
    throw e;
  }
}

function normalizeTask(item: any) {
  const actividad = item?.actividad ?? item?.nombre ?? item?.id;
  const orden = item?.orden != null ? `${item.orden} - ` : "";
  return { value: item.id, title: `${orden}${actividad}` };
}

async function loadTaskOptionsByPlan(planId: string) {
  if (!planId) {
    taskOptions.value = [];
  equipmentComponentOptions.value = [];
    return;
  }

  loadingTaskOptions.value = true;
  try {
    const { data } = await api.get(`/kpi_maintenance/planes/${planId}/tareas`);
    const rows = asArray(data);
    planTaskCatalogByPlan.value[String(planId)] = rows;
    taskOptions.value = rows.map(normalizeTask);
    taskLabelCacheByPlan.value[String(planId)] = taskOptions.value.reduce((acc: Record<string, string>, task: any) => {
      acc[String(task.value)] = task.title;
      return acc;
    }, {});
  } catch (e: any) {
    taskOptions.value = [];
    ui.error(e?.response?.data?.message || "No se pudieron cargar las tareas del plan.");
  } finally {
    loadingTaskOptions.value = false;
  }
}

async function ensureTaskLabelCacheForRows(rows: any[]) {
  const planIds = [...new Set(rows.map((row) => String(row?.plan_id || "")).filter(Boolean))];
  const pendingPlanIds = planIds.filter((planId) => !taskLabelCacheByPlan.value[planId]);
  await Promise.all(pendingPlanIds.map((planId) => loadTaskOptionsByPlan(planId)));
}

async function fetchWorkOrders() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/work-orders");
    records.value = asArray(data);
    workOrderCatalogRows.value = records.value;
    if (editingId.value) {
      const refreshed = records.value.find((item: any) => String(item?.id || "") === String(editingId.value || ""));
      if (refreshed) {
        currentWorkOrderRecord.value = refreshed;
      }
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudieron cargar las órdenes de trabajo.";
  } finally {
    loading.value = false;
  }
}

async function loadDetailData() {
  if (!editingId.value) return;
  loadingDetails.value = true;
  unsupportedDetailMessages.value = [];
  try {
    const [headerRes, tasksRes, attachmentsRes, consumosRows, issuesRows, historyRes] = await Promise.all([
      api.get(`/kpi_maintenance/work-orders/${editingId.value}`),
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/tareas`),
      api.get(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos`),
      safeGetList(`/kpi_maintenance/work-orders/${editingId.value}/consumos`, "El backend actual no expone un listado de consumos por OT; los consumos nuevos sí se registran correctamente, pero al reabrir la OT no podrán consultarse desde esta pantalla."),
      safeGetList(`/kpi_maintenance/work-orders/${editingId.value}/issue-materials`, "El backend actual no expone un listado de salidas de materiales por OT; las emisiones nuevas dependen de la reserva de stock del backend."),
      safeGetList(`/kpi_maintenance/work-orders/${editingId.value}/history`, "No se pudo cargar el historial de la orden de trabajo."),
    ]);
    currentWorkOrderRecord.value = unwrapData(headerRes.data);
    taskRows.value = asArray(tasksRes.data).map((x) => ({
      ...x,
      _json_text:
        x?.valor_json && typeof x.valor_json === "object"
          ? JSON.stringify(x.valor_json, null, 2)
          : "",
      _dirty: false,
      _raw: null,
    }));
    await ensureTaskLabelCacheForRows(taskRows.value);
    attachmentRows.value = asArray(attachmentsRes.data).map((x) => ({ ...x, _raw: x }));
    localConsumos.value = consumosRows.map((x) => ({ ...x, _raw: x }));
    localIssues.value = issuesRows.map((x) => ({ ...x, total: x.total ?? x.items?.reduce?.((acc: number, it: any) => acc + Number(it.costo_unitario || 0) * Number(it.cantidad || 0), 0) ?? null, _raw: x }));
    localHistory.value = historyRes.map((x) => ({ ...x, _raw: x }));
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudieron cargar los detalles principales de la OT.");
  } finally {
    loadingDetails.value = false;
  }
}

const rows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return records.value
    .map((r) => ({
      ...r,
      equipment_label: getEquipmentLabel(r),
      equipment_component_label: getEquipmentComponentLabel(r),
      _raw: r,
      _search: JSON.stringify({ ...r, equipment_label: getEquipmentLabel(r), equipment_component_label: getEquipmentComponentLabel(r) }).toLowerCase(),
    }))
    .filter((r) => !q || r._search.includes(q));
});

function resetAllForms() {
  currentWorkOrderRecord.value = null;
  headerForm.code = "";
  headerForm.type = "MANTENIMIENTO";
  headerForm.title = "";
  headerForm.equipment_id = "";
  headerForm.equipo_componente_id = "";
  headerForm.maintenance_kind = "CORRECTIVO";
  headerForm.status_workflow = "PLANNED";
  headerForm.procedimiento_id = "";
  headerForm.plan_id = "";
  headerForm.alerta_id = "";
  headerForm.blocked_by_work_order_id = "";
  headerForm.blocked_reason = "";
  headerForm.causa = "";
  headerForm.accion = "";
  headerForm.prevencion = "";

  taskForm.plan_id = "";
  taskForm.tarea_id = "";
  taskForm.observacion = "";

  attachmentForm.tipo = "EVIDENCIA";
  attachmentForm.nombre = "";
  attachmentForm.contenido_base64 = "";
  attachmentForm.mime_type = "";
  attachmentPreviewUrl.value = null;

  consumoForm.producto_id = "";
  consumoForm.bodega_id = "";
  consumoForm.cantidad = "";
  consumoForm.costo_unitario = "";
  consumoForm.observacion = "";
  consumoProductSearch.value = "";
  consumoProductOptions.value = [];
  consumoProductsPage.value = 1;
  consumoProductsTotalPages.value = 1;
  consumoProductsTotal.value = 0;

  materialItems.value = [newMaterialItem()];
  materialsForm.observacion = "";

  taskRows.value = [];
  attachmentRows.value = [];
  localConsumos.value = [];
  localIssues.value = [];
  localHistory.value = [];
  taskOptions.value = [];
  unsupportedDetailMessages.value = [];
  tab.value = "tareas";
}

async function openCreate() {
  if (!canCreate.value) return;
  editingId.value = null;
  currentWorkOrderRecord.value = null;
  closingFlow.value = false;
  resetAllForms();
  dialog.value = true;
  await ensureCatalogsLoaded();
  await assignNextWorkOrderCode();
}

async function openEdit(item: any) {
  if (!canEdit.value) return;
  editingId.value = item.id;
  currentWorkOrderRecord.value = item?._raw ?? item;
  closingFlow.value = false;
  resetAllForms();
  headerForm.code = item.code ?? item.codigo ?? "";
  headerForm.type = item.type ?? item.tipo ?? "";
  headerForm.title = item.title ?? item.titulo ?? "";
  headerForm.equipment_id = item.equipment_id ?? "";
  headerForm.equipo_componente_id = item.equipo_componente_id ?? "";
  headerForm.maintenance_kind = item.maintenance_kind ?? "CORRECTIVO";
  const initialWorkflow = normalizeWorkflowStatus(item.status_workflow);
  headerForm.status_workflow = initialWorkflow;
  headerForm.procedimiento_id = item.procedimiento_id ?? "";
  headerForm.plan_id = item.plan_id ?? "";
  taskForm.plan_id = headerForm.plan_id || "";
  headerForm.alerta_id = item.alerta_id ?? "";
  headerForm.blocked_by_work_order_id = item.blocked_by_work_order_id ?? "";
  headerForm.blocked_reason = item.blocked_reason ?? "";
  const headerValorJson = parseValorJson(item?.valor_json);
  headerForm.causa = headerValorJson?.causa ?? "";
  headerForm.accion = headerValorJson?.accion ?? "";
  headerForm.prevencion = headerValorJson?.prevencion ?? "";
  dialog.value = true;
  await ensureCatalogsLoaded();
  await loadEquipmentComponents(String(headerForm.equipment_id || ""));
  await loadDetailData();
  if (!isReadOnlyWorkflow.value) {
    await syncChecklistFromTemplate(false);
  }
  ensureTabVisible();
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? (result.split(",")[1] ?? "") : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function openAttachment(item: any) {
  if (item?._isDraft) {
    const draftUrl = item?.preview_url;
    if (draftUrl) {
      window.open(draftUrl, "_blank", "noopener,noreferrer");
    }
    return;
  }
  if (!editingId.value || !item?.id) return;
  try {
    const directUrl = item?.view_url;
    if (directUrl) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const { data } = await api.get(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos/${item.id}`);
    const resolved = unwrapData(data);
    const target = resolved?.view_url || resolved?.data_url;
    if (!target) {
      ui.error("No fue posible generar la vista del adjunto.");
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo abrir el adjunto.");
  }
}

async function handleAttachmentFileChange(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value;
  if (!file) {
    attachmentForm.nombre = "";
    attachmentForm.mime_type = "";
    attachmentForm.contenido_base64 = "";
    attachmentPreviewUrl.value = null;
    return;
  }

  attachmentForm.nombre = file.name;
  attachmentForm.mime_type = file.type || "application/octet-stream";
  try {
    attachmentForm.contenido_base64 = await fileToBase64(file);
    attachmentPreviewUrl.value = URL.createObjectURL(file);
  } catch (e: any) {
    ui.error(e?.message || "No se pudo procesar el archivo.");
  }
}

function openDelete(item: any) {
  if (!canDelete.value || !canCloseOrVoidWorkOrder(item)) {
    ui.error("Solo el usuario que creó o planificó la OT puede anularla.");
    return;
  }
  deletingId.value = item.id;
  currentWorkOrderRecord.value = item?._raw ?? item;
  deleteDialog.value = true;
}

function ensureTabVisible() {
  if (tab.value === "materiales" && !showMaterialsTab.value) {
    tab.value = showConsumosTab.value ? "consumos" : "tareas";
  }
  if (tab.value === "consumos" && !showConsumosTab.value) {
    tab.value = "tareas";
  }
}

async function startProcess() {
  headerForm.status_workflow = "IN_PROGRESS";
  tab.value = "consumos";
}

async function prepareClose() {
  if (!canCloseOrVoidCurrent.value) {
    ui.error(closeRestrictionText.value || "No tienes permiso para cerrar esta orden de trabajo.");
    return;
  }
  closingFlow.value = true;
  headerForm.status_workflow = "CLOSED";
  if (!materialItems.value.length) {
    materialItems.value = [newMaterialItem()];
  }
  tab.value = showMaterialsTab.value ? "materiales" : "consumos";
}

async function saveHeader(manageLoading = true, refreshAfterSave = true) {
  if (!canPersistHeader.value) return false;
  if (
    editingId.value &&
    normalizedWorkflow.value === "CLOSED" &&
    !canCloseOrVoidCurrent.value &&
    !isClosed.value
  ) {
    ui.error(closeRestrictionText.value || "No tienes permiso para cerrar esta orden de trabajo.");
    return false;
  }
  if (!headerForm.equipment_id) {
    ui.error("Equipo es obligatorio.");
    return false;
  }
  if (!headerForm.procedimiento_id && !headerForm.plan_id) {
    ui.error("Debes seleccionar una plantilla MPG para la OT.");
    return false;
  }
  if (!headerForm.maintenance_kind) {
    ui.error("Tipo mantenimiento es obligatorio.");
    return false;
  }

  if (!editingId.value && !headerForm.code) {
    await assignNextWorkOrderCode();
  }

  const { generatedTitle, generatedType } = buildAutoHeaderValues();

  const createPayload = {
    code: headerForm.code || null,
    type: generatedType,
    title: generatedTitle,
    equipment_id: headerForm.equipment_id,
    equipo_componente_id: headerForm.equipo_componente_id || null,
    maintenance_kind: headerForm.maintenance_kind || null,
    status_workflow: normalizedWorkflow.value,
    plan_id: headerForm.plan_id || null,
    procedimiento_id: headerForm.procedimiento_id || null,
    alerta_id: headerForm.alerta_id || null,
    blocked_by_work_order_id: headerForm.blocked_by_work_order_id || null,
    blocked_reason: headerForm.blocked_reason || null,
    valor_json: {
      causa: headerForm.causa || "",
      accion: headerForm.accion || "",
      prevencion: headerForm.prevencion || "",
    },
  };

  const updatePayload = {
    maintenance_kind: headerForm.maintenance_kind || null,
    status_workflow: normalizedWorkflow.value,
    procedimiento_id: headerForm.procedimiento_id || null,
    equipo_componente_id: headerForm.equipo_componente_id || null,
    blocked_by_work_order_id: headerForm.blocked_by_work_order_id || null,
    blocked_reason: headerForm.blocked_reason || null,
    valor_json: createPayload.valor_json,
  };

  if (manageLoading) savingHeader.value = true;
  try {
    let savedHeader: any = null;
    if (editingId.value) {
      const { data } = await api.patch(`/kpi_maintenance/work-orders/${editingId.value}`, updatePayload);
      savedHeader = unwrapData(data);
      ui.success("Cabecera OT actualizada.");
    } else {
      const requestedCode = String(headerForm.code || "").trim();
      const { data } = await api.post("/kpi_maintenance/work-orders", createPayload);
      const created = unwrapData(data);
      savedHeader = created;
      const createdId = created?.id ?? data?.id ?? data?.data?.id;
      const assignedCode = String((created?.code ?? data?.code ?? data?.data?.code ?? requestedCode) || "").trim();
      const codeWasReassigned = Boolean(created?.code_was_reassigned) || (!!assignedCode && !!requestedCode && assignedCode !== requestedCode);
      if (assignedCode) {
        headerForm.code = assignedCode;
      }
      if (createdId) editingId.value = createdId;
      if (codeWasReassigned && assignedCode) {
        ui.open(`Su número de orden fue actualizado a ${assignedCode}.`, "warning", 5500);
      } else {
        ui.success("Cabecera OT creada.");
      }
    }

    if (savedHeader) {
      currentWorkOrderRecord.value = savedHeader;
      headerForm.plan_id = savedHeader.plan_id ?? headerForm.plan_id;
      headerForm.procedimiento_id = savedHeader.procedimiento_id ?? headerForm.procedimiento_id;
      headerForm.equipo_componente_id = savedHeader.equipo_componente_id ?? headerForm.equipo_componente_id;
      headerForm.blocked_by_work_order_id = savedHeader.blocked_by_work_order_id ?? headerForm.blocked_by_work_order_id;
      headerForm.blocked_reason = savedHeader.blocked_reason ?? headerForm.blocked_reason;
      taskForm.plan_id = headerForm.plan_id || "";
      if (headerForm.plan_id) {
        await loadTaskOptionsByPlan(String(headerForm.plan_id));
      }
    }

    if (refreshAfterSave) {
      await fetchWorkOrders();
      await loadDetailData();
    }
    return true;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo guardar la cabecera de OT.");
    return false;
  } finally {
    if (manageLoading) savingHeader.value = false;
  }
}


async function saveAll() {
  if (savingHeader.value) return;
  savingHeader.value = true;
  try {
    const headerSaved = await saveHeader(false, false);
    if (!headerSaved || !editingId.value) return;

    const actions: Array<() => Promise<void>> = [];
    await syncChecklistFromTemplate(false);
    if (!validateTaskRowsForSave()) {
      return;
    }

    const hasCompleteAttachment = !!(attachmentForm.nombre && attachmentForm.contenido_base64);
    const hasAttachmentDraft = !!(attachmentForm.nombre || attachmentForm.contenido_base64 || attachmentForm.mime_type);
    if (hasAttachmentDraft && !hasCompleteAttachment) {
      ui.error("Para guardar un adjunto debes seleccionar un archivo válido.");
      return;
    }
    if (hasCompleteAttachment) {
      await createAttachment(false);
    }

    const hasCompleteConsumo = !!(consumoForm.bodega_id && consumoForm.producto_id && consumoForm.cantidad);
    const hasConsumoDraft = !!(consumoForm.producto_id || consumoForm.bodega_id || consumoForm.cantidad || consumoForm.costo_unitario || consumoForm.observacion);
    if (hasConsumoDraft && !hasCompleteConsumo) {
      ui.error("Para registrar un consumo debes completar bodega, material y cantidad.");
      return;
    }
    if (hasCompleteConsumo) {
      actions.push(createConsumo);
    }

    const validMaterialItems = materialItems.value
      .filter((item) => item.producto_id && item.bodega_id && item.cantidad && Number(item.cantidad) > 0);
    const hasMaterialFields = hasMaterialDraft();
    if (hasMaterialFields && !validMaterialItems.length && !materialsForm.observacion) {
      ui.error("La salida de materiales requiere al menos un item completo con bodega, material y cantidad.");
      return;
    }
    if (validMaterialItems.length) {
      actions.push(issueMaterials);
    }

    for (const run of actions) {
      await run();
    }

    await persistDraftAttachments();
    await persistEditedTasks(false);
    await persistDraftTasks(false);

    await fetchWorkOrders();
    await loadDetailData();
    if (normalizedWorkflow.value === "CLOSED") {
      closingFlow.value = false;
    }
    ensureTabVisible();
  } finally {
    savingHeader.value = false;
  }
}

async function persistDraftTasks(refreshAfterSave = true) {
  if (!editingId.value) return;
  const drafts = taskRows.value.filter((row) => row?._isDraft);
  for (const draft of drafts) {
    try {
      await api.post(
        `/kpi_maintenance/work-orders/${editingId.value}/tareas`,
        buildTaskPersistencePayload(draft),
      );
    } catch (e: any) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : e?.response?.data?.message || `No se pudo guardar la tarea ${draft.tarea_id}.`;
      ui.error(errorMessage);
    }
  }
  if (refreshAfterSave && drafts.length) {
    await loadDetailData();
  }
}

async function persistEditedTasks(refreshAfterSave = true) {
  const editedRows = taskRows.value.filter((row) => !row?._isDraft && row?._dirty);
  for (const row of editedRows) {
    try {
      await api.patch(
        `/kpi_maintenance/work-orders/tareas/${row.id}`,
        buildTaskPersistencePayload(row),
      );
      row._dirty = false;
    } catch (e: any) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : e?.response?.data?.message || `No se pudo actualizar la tarea ${row.id}.`;
      ui.error(errorMessage);
    }
  }
  if (refreshAfterSave && editedRows.length) {
    await loadDetailData();
  }
}

async function persistDraftAttachments() {
  if (!editingId.value) return;
  const drafts = attachmentRows.value.filter((row) => row?._isDraft);
  for (const draft of drafts) {
    try {
      const { data } = await api.post(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos`, {
        tipo: draft.tipo || "EVIDENCIA",
        nombre: draft.nombre,
        contenido_base64: draft.contenido_base64,
        mime_type: draft.mime_type || null,
        meta: draft.meta || null,
      });
      const savedAttachment = unwrapData(data);
      attachmentRows.value = attachmentRows.value.map((row) =>
        String(row?.id || "") === String(draft.id)
          ? {
              ...savedAttachment,
              meta: savedAttachment?.meta || draft.meta || {},
              _raw: savedAttachment,
            }
          : row,
      );
      replaceDraftAttachmentReferencesInTasks(String(draft.id), savedAttachment);
    } catch (e: any) {
      ui.error(e?.response?.data?.message || `No se pudo guardar el adjunto ${draft.nombre}.`);
    }
  }
}

function replaceDraftAttachmentReferencesInTasks(draftAttachmentId: string, savedAttachment: any) {
  for (const task of taskRows.value) {
    const payload = getTaskJsonObject(task);
    const adjuntos = getTaskEvidenceEntries(task).map((attachment: any) => {
      if (String(attachment?.draft_attachment_id || "") !== draftAttachmentId) return attachment;
      return {
        attachment_id: savedAttachment?.id || null,
        draft_attachment_id: null,
        evidence_kind: normalizeEvidenceKind(
          attachment?.evidence_kind || savedAttachment?.meta?.evidence_kind,
        ),
        nombre: savedAttachment?.nombre || attachment?.nombre || null,
        mime_type: savedAttachment?.meta?.mime_type || attachment?.mime_type || null,
        tipo: savedAttachment?.tipo || attachment?.tipo || "EVIDENCIA",
      };
    });
    const changed = adjuntos.some((attachment: any) => String(attachment?.attachment_id || "") === String(savedAttachment?.id || ""));
    if (changed) {
      setTaskJsonObject(task, {
        ...payload,
        evidencias_requeridas: getTaskEvidenceRequirements(task),
        adjuntos,
      });
    }
  }
}

async function deleteTask(item: any) {
  if (isReadOnlyWorkflow.value) return ui.error("La OT está cerrada y no permite edición.");
  if (item?._isDraft) {
    taskRows.value = taskRows.value.filter((row) => row.id !== item.id);
    return;
  }
  if (!item?.id) return;
  try {
    await api.delete(`/kpi_maintenance/work-orders/tareas/${item.id}`);
    ui.success("Tarea eliminada.");
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar la tarea.");
  }
}

async function createAttachment(showToast = true) {
  if (isReadOnlyWorkflow.value) return ui.error("La OT está cerrada y no permite edición.");
  if (!attachmentForm.nombre || !attachmentForm.contenido_base64) return ui.error("Debes seleccionar un archivo.");

  const draftId = `draft-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Borrador local: el detalle solo se persiste cuando el usuario guarda la OT completa.
  attachmentRows.value.unshift({
    id: draftId,
    tipo: attachmentForm.tipo || "EVIDENCIA",
    nombre: attachmentForm.nombre,
    contenido_base64: attachmentForm.contenido_base64,
    mime_type: attachmentForm.mime_type || null,
    preview_url: attachmentPreviewUrl.value,
    meta: {
      source: "OT_GENERAL",
    },
    _isDraft: true,
    _raw: null,
  });
  attachmentForm.tipo = "EVIDENCIA";
  attachmentForm.nombre = "";
  attachmentForm.contenido_base64 = "";
  attachmentForm.mime_type = "";
  attachmentPreviewUrl.value = null;
  if (showToast) ui.success("Adjunto agregado.");
}

async function deleteAttachment(item: any) {
  if (isReadOnlyWorkflow.value) return ui.error("La OT está cerrada y no permite edición.");
  if (item?._isDraft) {
    unlinkAttachmentFromTaskEvidence(null, String(item?.id || ""));
    attachmentRows.value = attachmentRows.value.filter((row) => row.id !== item.id);
    return;
  }
  if (!editingId.value || !item?.id) return;
  try {
    await api.delete(`/kpi_maintenance/work-orders/${editingId.value}/adjuntos/${item.id}`);
    unlinkAttachmentFromTaskEvidence(String(item.id), null);
    ui.success("Adjunto eliminado.");
    await loadDetailData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar el adjunto.");
  }
}

async function createConsumo() {
  if (isReadOnlyWorkflow.value) return ui.error("La OT está cerrada y no permite edición.");
  if (!editingId.value) return ui.error("Guarda primero la cabecera de la OT para registrar consumos.");
  if (!consumoForm.bodega_id || !consumoForm.producto_id || !consumoForm.cantidad) {
    return ui.error("Bodega, material y cantidad son obligatorios.");
  }

  const payload = {
    producto_id: consumoForm.producto_id,
    bodega_id: consumoForm.bodega_id,
    cantidad: Number(consumoForm.cantidad),
    ...(consumoForm.costo_unitario ? { costo_unitario: Number(consumoForm.costo_unitario) } : {}),
    observacion: consumoForm.observacion || null,
  };

  try {
    await api.post(`/kpi_maintenance/work-orders/${editingId.value}/consumos`, payload);
    consumoForm.producto_id = "";
    consumoForm.bodega_id = "";
    consumoForm.cantidad = "";
    consumoForm.costo_unitario = "";
    consumoForm.observacion = "";
    await loadDetailData();
    ui.success("Consumo registrado.");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo registrar el consumo.");
  }
}

async function issueMaterials() {
  if (issuingMaterials.value) return;
  if (isReadOnlyWorkflow.value) return ui.error("La OT está cerrada y no permite edición.");
  if (!editingId.value) return ui.error("Guarda primero la cabecera de la OT para registrar salida de materiales.");

  const items = materialItems.value
    .filter((item) => item.producto_id || item.bodega_id || item.cantidad)
    .map((item) => ({
      producto_id: item.producto_id,
      bodega_id: item.bodega_id,
      cantidad: Number(item.cantidad),
    }));

  if (!items.length) return ui.error("Debes ingresar al menos un item.");

  const hasInvalidItem = items.some((item) => !item.producto_id || !item.bodega_id || !Number.isFinite(item.cantidad) || item.cantidad <= 0);
  if (hasInvalidItem) {
    return ui.error("Cada item debe incluir bodega, material y cantidad mayor a 0.");
  }

  const payload = {
    items,
    observacion: materialsForm.observacion || null,
  };

  try {
    issuingMaterials.value = true;
    await api.post(`/kpi_maintenance/work-orders/${editingId.value}/issue-materials`, payload);
    materialItems.value = [newMaterialItem()];
    materialsForm.observacion = "";
    closingFlow.value = false;
    await loadDetailData();
    ui.success("Salida de materiales registrada.");
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo emitir materiales.");
  } finally {
    issuingMaterials.value = false;
  }
}

function addMaterialItem() {
  materialItems.value.push(newMaterialItem());
}

function removeMaterialItem(index: number) {
  if (materialItems.value.length === 1) {
    materialItems.value[0] = newMaterialItem();
    return;
  }
  materialItems.value.splice(index, 1);
}

function hasMaterialDraft() {
  if (materialsForm.observacion) return true;
  return materialItems.value.some((item) => item.producto_id || item.bodega_id || item.cantidad);
}


async function confirmDelete() {
  if (!deletingId.value) return;
  if (!canCloseOrVoidCurrent.value) {
    ui.error(closeRestrictionText.value || "No tienes permiso para anular esta orden de trabajo.");
    return;
  }
  savingHeader.value = true;
  try {
    await api.delete(`/kpi_maintenance/work-orders/${deletingId.value}`);
    ui.success("Orden de trabajo eliminada.");
    deleteDialog.value = false;
    await fetchWorkOrders();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudo eliminar la OT.");
  } finally {
    savingHeader.value = false;
  }
}

onMounted(async () => {
  try {
    await fetchWorkOrders();
  } catch {
    // errores específicos ya manejados en cada método
  }
});

function incrementAlphaPrefix(letter: string) {
  const nextCharCode = letter.toUpperCase().charCodeAt(0) + 1;
  if (nextCharCode > 90) return "A";
  return String.fromCharCode(nextCharCode);
}

function nextWorkOrderCode(lastCode: string | null) {
  if (!lastCode) return "OT-A00001";
  const match = /^OT-([A-Z])(\d{5})$/i.exec(lastCode.trim());
  if (!match) return "OT-A00001";
  const currentLetter = (match[1] ?? "A").toUpperCase();
  const currentNumber = Number(match[2] ?? "0");
  if (currentNumber >= 99999) {
    return `OT-${incrementAlphaPrefix(currentLetter)}00001`;
  }
  return `OT-${currentLetter}${String(currentNumber + 1).padStart(5, "0")}`;
}

function getWorkOrderCodeRank(code: string) {
  const match = /^OT-([A-Z])(\d{5})$/i.exec(String(code || "").trim());
  if (!match) return -1;
  const letter = (match[1] ?? "A").toUpperCase();
  const number = Number(match[2] ?? "0");
  return (letter.charCodeAt(0) - 64) * 100000 + number;
}

function getHighestWorkOrderCode(codes: string[]) {
  const normalized = codes
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .sort((a, b) => getWorkOrderCodeRank(b) - getWorkOrderCodeRank(a));
  return normalized[0] ?? null;
}

async function assignNextWorkOrderCode() {
  try {
    const { data } = await api.get("/kpi_maintenance/work-orders/next-code");
    const resolved = unwrapData(data);
    const nextCode = resolved?.code ?? data?.code ?? data?.data?.code;
    if (nextCode) {
      headerForm.code = String(nextCode);
      return;
    }
  } catch {
    // fallback local
  }

  try {
    const rows = records.value.length ? records.value : await listAll("/kpi_maintenance/work-orders");
    const lastCode = getHighestWorkOrderCode(rows.map((row: any) => row?.code ?? row?.codigo ?? ""));
    headerForm.code = nextWorkOrderCode(lastCode);
  } catch {
    headerForm.code = "OT-A00001";
  }
}

watch(
  () => editingId.value,
  async (id) => {
    if (!id && dialog.value && !headerForm.code) {
      await assignNextWorkOrderCode();
    }
  },
);


watch(
  () => headerForm.procedimiento_id,
  async (procedimientoId, previousProcedimientoId) => {
    if (String(procedimientoId || "") === String(previousProcedimientoId || "")) return;
    const selected = procedureCatalog.value.find(
      (item: any) => String(item?.id || "") === String(procedimientoId || ""),
    );
    const suggestedComponentId = getSuggestedProcedureComponentId(selected);
    if (suggestedComponentId && !headerForm.equipo_componente_id) {
      headerForm.equipo_componente_id = suggestedComponentId;
    }
    if (editingId.value) return;
    headerForm.plan_id = selected?.plan_id ? String(selected.plan_id) : "";
    taskForm.plan_id = headerForm.plan_id || "";
    taskForm.tarea_id = "";
    taskRows.value = [];
    if (headerForm.plan_id) {
      await loadTaskOptionsByPlan(headerForm.plan_id);
      await syncChecklistFromTemplate(false);
    }
  },
);

watch(
  () => headerForm.equipment_id,
  async (equipmentId, previousEquipmentId) => {
    const nextEquipmentId = String(equipmentId || "");
    const previous = String(previousEquipmentId || "");
    if (nextEquipmentId === previous) return;
    await loadEquipmentComponents(nextEquipmentId);
    if (
      headerForm.equipo_componente_id &&
      !equipmentComponentOptions.value.some(
        (item: any) => String(item?.value || "") === String(headerForm.equipo_componente_id || ""),
      )
    ) {
      headerForm.equipo_componente_id = "";
    }
    if (!headerForm.equipo_componente_id) {
      const selected = procedureCatalog.value.find(
        (item: any) => String(item?.id || "") === String(headerForm.procedimiento_id || ""),
      );
      const suggestedComponentId = getSuggestedProcedureComponentId(selected);
      if (suggestedComponentId) {
        headerForm.equipo_componente_id = suggestedComponentId;
      }
    }
  },
);

watch(
  () => headerForm.plan_id,
  async (planId, previousPlanId) => {
    const nextPlan = String(planId || "");
    const prevPlan = String(previousPlanId || "");
    taskForm.plan_id = nextPlan;
    if (nextPlan !== prevPlan) {
      taskForm.tarea_id = "";
    }
    await loadTaskOptionsByPlan(nextPlan);
  },
);

watch(
  () => consumoForm.bodega_id,
  async () => {
    consumoForm.producto_id = "";
    consumoProductSearch.value = "";
    await loadConsumoProducts({ reset: true, search: "" });
    resetConsumoProductIfInvalid();
    await syncConsumoUnitCost();
  },
);

watch(
  () => consumoForm.producto_id,
  async () => {
    await syncConsumoUnitCost();
  },
);

watch(
  () => consumoProductSearch.value,
  (value) => {
    if (!consumoForm.bodega_id) return;
    if (consumoSearchTimer) clearTimeout(consumoSearchTimer);
    consumoSearchTimer = setTimeout(() => {
      void loadConsumoProducts({ reset: true, search: value });
    }, 300);
  },
);

watch(
  () => materialItems.value.map((item) => `${item.bodega_id}|${item.producto_id}`).join(';'),
  () => {
    materialItems.value.forEach((_, index) => resetMaterialProductIfInvalid(index));
  },
);
</script>

<style scoped>
.work-orders-shell {
  overflow: hidden;
}

.table-enterprise {
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  overflow: hidden;
  background: var(--surface-base);
}

.work-order-dialog-card,
.ot-dialog-content {
  background: var(--app-main-background);
  color: var(--app-text);
}

.work-orders-toolbar {
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
}

.workflow-chip {
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.section-card {
  background: var(--surface-base);
  color: var(--app-text);
  border: 1px solid var(--surface-border);
}

.section-card :deep(.v-label),
.section-card :deep(.v-field),
.section-card :deep(.v-field__input),
.section-card :deep(input),
.section-card :deep(textarea),
.section-card :deep(.v-select__selection-text) {
  color: var(--app-text) !important;
}

.section-card :deep(.v-field) {
  background: var(--field-background);
}

.report-preview-dialog {
  background: var(--app-main-background);
  color: var(--app-text);
}

.report-preview-body {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--v-theme-primary) 10%, transparent), transparent 32%),
    var(--app-main-background);
}

.report-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.report-preview-grid--trace {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.report-preview-field {
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-base) 92%, transparent);
  padding: 12px 14px;
  min-height: 86px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.report-preview-field__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.report-preview-field__value {
  font-size: 0.95rem;
  line-height: 1.35;
  color: var(--app-text);
  word-break: break-word;
}

.capture-cell {
  min-width: 220px;
}

.task-evidence-stack {
  display: grid;
  gap: 10px;
}

.task-evidence-group {
  padding: 10px;
  border: 1px dashed var(--surface-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface-base) 86%, transparent);
}

@media (max-width: 960px) {
  .ot-dialog-content {
    padding-inline: 12px;
  }

  .capture-cell {
    min-width: 180px;
  }
}

@media (max-width: 600px) {
  .work-orders-toolbar :deep(.v-toolbar__content) {
    height: auto;
    min-height: 64px;
    padding-block: 8px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .workflow-chip {
    margin-inline-end: 0 !important;
  }

  .section-card {
    padding: 12px !important;
  }

  .capture-cell {
    min-width: 150px;
  }
}
</style>

<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar este módulo.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Transferencias de bodega</div>
        <div class="text-body-2 text-medium-emphasis">
          Registra transferencias manuales entre bodegas o precarga materiales desde una orden de compra pendiente.
        </div>
      </div>
      <div class="d-flex flex-wrap" style="gap: 8px;">
        <v-chip color="info" variant="tonal">
          {{ pendingOrders.length }} órdenes disponibles para precarga
        </v-chip>
        <v-btn
          variant="text"
          prepend-icon="mdi-cog"
          :loading="sriConfigLoading"
          @click="openSriConfigDialog"
        >
          Configuración SRI
        </v-btn>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="hydrateView">
          Recargar
        </v-btn>
        <v-btn
          v-if="canCreate"
          color="primary"
          prepend-icon="mdi-swap-horizontal"
          @click="openCreate"
        >
          Nueva transferencia
        </v-btn>
      </div>
    </div>

    <v-data-table-server
      :headers="headers"
      :items="tableRows"
      :items-length="serverTotalItems"
      :loading="loading"
      loading-text="Obteniendo transferencias de bodega..."
      :items-per-page="serverItemsPerPage"
      :page="serverPage"
      class="elevation-0 enterprise-table"
      @update:options="handleServerOptionsUpdate"
    >
      <template #item.fecha_transferencia="{ item }">
        {{ formatDate(item.fecha_transferencia) }}
      </template>

      <template #item.orden_compra_codigo="{ item }">
        <v-chip size="small" variant="tonal" :color="item.orden_compra_codigo ? 'info' : 'secondary'">
          {{ item.orden_compra_codigo || "Manual" }}
        </v-chip>
      </template>

      <template #item.estado="{ item }">
        <v-chip size="small" variant="tonal" color="success">
          {{ item.estado || "COMPLETADA" }}
        </v-chip>
      </template>

      <template #item.total_cantidad="{ item }">
        {{ formatNumber(item.total_cantidad) }}
      </template>

      <template #item.egreso_bodega_codigo="{ item }">
        <v-chip size="small" variant="tonal" color="error">
          {{ item.egreso_bodega_codigo || "-" }}
        </v-chip>
      </template>

      <template #item.ingreso_bodega_codigo="{ item }">
        <v-chip size="small" variant="tonal" color="success">
          {{ item.ingreso_bodega_codigo || "-" }}
        </v-chip>
      </template>

      <template #item.guia_remision="{ item }">
        <div class="d-flex flex-column" style="gap: 4px; min-width: 180px;">
          <v-chip
            v-if="item.guia_remision_numero"
            size="small"
            variant="tonal"
            :color="guideStateColor(item.guia_remision_estado)"
          >
            {{ item.guia_remision_numero }}
          </v-chip>
          <v-chip
            v-if="item.guia_remision_sri_estado"
            size="small"
            variant="outlined"
            :color="guideSriStateColor(item.guia_remision_sri_estado)"
          >
            {{ item.guia_remision_sri_estado }}
          </v-chip>
          <span v-if="!item.guia_remision_numero" class="text-caption text-medium-emphasis">
            Sin guía
          </span>
        </div>
      </template>

      <template #item.acciones="{ item }">
        <div class="d-flex flex-wrap" style="gap: 8px; min-width: 270px;">
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-file-document-plus-outline"
            :disabled="!canGenerateGuide(item)"
            @click="openGuideDialog(item)"
          >
            {{ item.guia_remision_id ? 'Regenerar guía' : 'Generar guía' }}
          </v-btn>
          <v-btn
            v-if="item.guia_remision_id"
            size="small"
            variant="text"
            prepend-icon="mdi-cloud-search-outline"
            :loading="consultingGuideId === item.guia_remision_id"
            @click="consultGuide(item)"
          >
            Consultar SRI
          </v-btn>
          <v-btn
            v-if="item.guia_remision_id"
            size="small"
            variant="text"
            prepend-icon="mdi-download"
            @click="downloadGuideXml(item, 'signed')"
          >
            XML firmado
          </v-btn>
        </div>
      </template>
    </v-data-table-server>
  </v-card>

  <v-dialog
    v-model="dialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1440"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Nueva transferencia de bodega
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col cols="12" md="5">
            <v-autocomplete
              v-model="form.orden_compra_id"
              :items="pendingOrderOptions"
              item-title="title"
              item-value="value"
              label="Orden de compra para precarga (opcional)"
              variant="outlined"
              clearable
              :loading="orderLoading"
              :disabled="saving"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="form.fecha_transferencia"
              type="date"
              label="Fecha de transferencia"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-text-field
              :model-value="selectedOrder?.proveedor_nombre || 'Transferencia manual'"
              label="Proveedor / origen de la solicitud"
              variant="outlined"
              readonly
            />
          </v-col>

          <v-col cols="12" md="5">
            <v-text-field
              v-if="selectedOrder"
              :model-value="sourceWarehouseLabel"
              label="Bodega origen"
              variant="outlined"
              readonly
            />
            <v-select
              v-else
              v-model="form.bodega_origen_id"
              :items="sourceWarehouseOptions"
              item-title="title"
              item-value="value"
              label="Bodega origen"
              variant="outlined"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="form.bodega_destino_id"
              :items="destinationWarehouseOptions"
              item-title="title"
              item-value="value"
              label="Bodega destino"
              variant="outlined"
            />
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="form.observacion"
              label="Observación"
              variant="outlined"
              rows="2"
              auto-grow
            />
          </v-col>
        </v-row>

        <v-progress-linear
          v-if="orderLoading"
          indeterminate
          color="primary"
          rounded
          class="mb-4"
        />

        <v-alert v-if="selectedOrder" type="info" variant="tonal" class="mb-4">
          La orden <strong>{{ selectedOrder.codigo }}</strong> fue precargada con saldo preaprobado. Al guardar la transferencia se registrará el ingreso de compra, la salida desde la bodega origen y el ingreso en la bodega destino; luego la orden quedará marcada como usada.
        </v-alert>
        <v-alert v-else type="info" variant="tonal" class="mb-4">
          Estás registrando una transferencia manual. Selecciona la bodega origen, la bodega destino y los materiales a mover.
        </v-alert>

        <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Materiales de la transferencia</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedOrder ? 'Puedes ajustar cantidades o retirar materiales precargados.' : 'Agrega los materiales que se moverán entre bodegas.' }}
            </div>
          </div>
          <v-btn
            v-if="!selectedOrder"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="addDetail"
          >
            Agregar material
          </v-btn>
        </div>

        <div class="transfer-details-table">
          <table class="details-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Disponible</th>
                <th>Costo ref.</th>
                <th>Subtotal ref.</th>
                <th>Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detail in form.detalles" :key="detail.local_id">
                <td>{{ detail.codigo_producto || "-" }}</td>
                <td>
                  <v-autocomplete
                    v-model="detail.producto_id"
                    :items="productOptions"
                    item-title="title"
                    item-value="value"
                    label="Material"
                    variant="outlined"
                    hide-details
                    :disabled="Boolean(selectedOrder)"
                    @update:model-value="handleDetailProductChange(detail)"
                  />
                </td>
                <td>
                  <div class="quantity-cell">
                    <v-text-field
                      v-model="detail.cantidad"
                      type="number"
                      min="0"
                      step="0.0001"
                      variant="outlined"
                      :readonly="Boolean(selectedOrder)"
                      :disabled="Boolean(selectedOrder) || orderLoading"
                      :error="detailExceedsStock(detail)"
                      hide-details
                    />
                    <div
                      v-if="detailExceedsStock(detail)"
                      class="text-caption text-error mt-1"
                    >
                      Solicitado: {{ formatNumber(getRequestedQuantity(detail)) }}
                      · Disponible: {{ formatNumber(getCurrentStock(detail)) }}
                    </div>
                  </div>
                </td>
                <td>
                  <v-text-field
                    :model-value="formatNumber(getCurrentStock(detail))"
                    :label="selectedOrder ? 'Saldo preaprobado' : 'Stock actual'"
                    variant="outlined"
                    readonly
                    :disabled="Boolean(selectedOrder) || orderLoading"
                    class="available-stock-field"
                    hide-details
                  />
                </td>
                <td class="text-right font-weight-medium">
                  {{ formatCurrency(detail.costo_unitario) }}
                </td>
                <td class="text-right font-weight-bold">
                  {{ formatCurrency(detailSubtotal(detail)) }}
                </td>
                <td>
                  <v-text-field
                    v-model="detail.observacion"
                    variant="outlined"
                    hide-details
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click="removeDetail(detail.local_id)"
                  />
                </td>
              </tr>
              <tr v-if="!form.detalles.length">
                <td colspan="8" class="text-center text-medium-emphasis py-4">
                  No hay materiales cargados para esta transferencia.
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="text-right font-weight-bold">Total referencial</td>
                <td class="text-right font-weight-bold">{{ formatCurrency(totalReferentialAmount) }}</td>
                <td colspan="2" class="text-right font-weight-bold">Cantidad total: {{ formatNumber(totalQuantity) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end pa-4">
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="orderLoading" @click="saveTransfer">
          Guardar transferencia
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="sriConfigDialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1100"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Configuración SRI por sucursal
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-row dense>
          <v-col cols="12" md="5">
            <v-select
              v-model="sriConfigForm.sucursal_id"
              :items="sucursalOptions"
              item-title="title"
              item-value="value"
              label="Sucursal"
              variant="outlined"
              :loading="sriConfigLoading"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="sriConfigForm.ambiente_default"
              :items="environmentOptions"
              label="Ambiente por defecto"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="sriConfigForm.estab" label="Estab" variant="outlined" maxlength="3" />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="sriConfigForm.pto_emi" label="Punto emisor" variant="outlined" maxlength="3" />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model="sriConfigForm.ruc"
              label="RUC emisor"
              variant="outlined"
              maxlength="13"
              :loading="sriTaxpayerLookupLoading"
              hint="Al completar los 13 dígitos se consultará el SRI automáticamente."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              model-value="Automático por cada documento"
              label="Código numérico"
              variant="outlined"
              readonly
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="sriConfigForm.obligado_contabilidad" :items="yesNoOptions" label="Obligado a llevar contabilidad" variant="outlined" />
          </v-col>

          <v-col cols="12" v-if="sriTaxpayerLookupError">
            <v-alert type="warning" variant="tonal">
              {{ sriTaxpayerLookupError }}
            </v-alert>
          </v-col>
          <v-col cols="12" v-else-if="sriTaxpayerLookupMessage">
            <v-alert type="info" variant="tonal">
              {{ sriTaxpayerLookupMessage }}
            </v-alert>
          </v-col>

          <v-col cols="12" md="5">
            <v-text-field v-model="sriConfigForm.razon_social" label="Razón social" variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="sriConfigForm.nombre_comercial" label="Nombre comercial" variant="outlined" />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field v-model="sriConfigForm.dir_matriz" label="Dirección matriz" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="sriConfigForm.dir_establecimiento" label="Dirección establecimiento" variant="outlined" />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field v-model="sriConfigForm.contribuyente_especial" label="Contribuyente especial" variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="sriConfigForm.info_adicional_email" label="Email adicional" variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="sriConfigForm.info_adicional_telefono" label="Teléfono adicional" variant="outlined" />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field v-model="sriConfigForm.dir_partida_default" label="Dirección partida por defecto" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-alert type="info" variant="tonal" class="h-100 d-flex align-center">
              Los datos del conductor y del vehículo se piden en cada guía de remisión. Aquí solo se guarda la configuración tributaria del emisor.
            </v-alert>
          </v-col>
        </v-row>

        <template v-if="canManageSriSignature">
          <v-divider class="my-4" />

        <div class="text-subtitle-2 font-weight-bold mb-2">Firma electrónica global del sistema (.p12)</div>
        <v-alert type="info" variant="tonal" class="mb-4">
          Esta firma se carga una sola vez y se reutiliza para todas las sucursales, bodegas y guías del sistema. Solo el Super Administrador puede actualizarla.
        </v-alert>

        <v-row dense>
          <v-col cols="12" md="5">
            <v-file-input
              v-model="sriCertificateFile"
              label="Archivo .p12 global"
              variant="outlined"
              accept=".p12"
              prepend-icon="mdi-lock-outline"
              show-size
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="sriCertificatePassword"
              label="Clave del certificado"
              variant="outlined"
              type="password"
            />
          </v-col>
          <v-col cols="12" md="3" class="d-flex align-center">
            <v-btn
              color="primary"
              block
              prepend-icon="mdi-content-save"
              :loading="sriSignatureSaving"
              @click="saveGlobalSriSignature"
            >
              Guardar firma global
            </v-btn>
          </v-col>
        </v-row>

        <v-alert v-if="sriConfigMeta.cert_subject || sriConfigMeta.cert_valid_to" type="success" variant="tonal" class="mt-2">
          Firma global cargada:
          <strong>{{ sriConfigMeta.certificate_filename || 'certificado.p12' }}</strong>
          <span v-if="sriConfigMeta.cert_subject"> · {{ sriConfigMeta.cert_subject }}</span>
          <span v-if="sriConfigMeta.cert_valid_to"> · Vigencia hasta {{ formatDate(sriConfigMeta.cert_valid_to) }}</span>
        </v-alert>
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end pa-4">
        <v-btn variant="text" @click="sriConfigDialog = false">Cerrar</v-btn>
        <v-btn color="primary" :loading="sriConfigSaving" @click="saveSriConfig">
          Guardar configuración
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="guideDialog"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1250"
    :persistent="guideSaving || guideAuthorizing || guidePreviewLoading"
  >
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Generar guía de remisión electrónica
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4 section-surface">
        <v-alert type="info" variant="tonal" class="mb-4">
          Primero genera la guía y revisa su vista previa en PDF. Cuando confirmes el documento, usa el botón de autorizar para enviarlo al SRI.
        </v-alert>

        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field :model-value="guideContext.transferencia?.codigo || ''" label="Transferencia" variant="outlined" readonly />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field :model-value="guideContext.sucursal?.nombre || ''" label="Sucursal emisora" variant="outlined" readonly />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field :model-value="guideContext.transferencia?.bodega_origen_label || ''" label="Bodega origen" variant="outlined" readonly />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field :model-value="guideContext.transferencia?.bodega_destino_label || ''" label="Bodega destino" variant="outlined" readonly />
          </v-col>

          <v-col cols="12" md="3">
            <v-select v-model="guideForm.ambiente" :items="environmentOptions" label="Ambiente SRI" variant="outlined" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="guideForm.fecha_emision" type="date" label="Fecha emisión" variant="outlined" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="guideForm.fecha_ini_transporte" type="date" label="Fecha inicio transporte" variant="outlined" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="guideForm.fecha_fin_transporte" type="date" label="Fecha fin transporte" variant="outlined" />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field v-model="guideForm.dir_partida" label="Dirección partida" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="guideForm.dir_destinatario" label="Dirección destinatario" variant="outlined" />
          </v-col>
          <v-col v-if="hasGuideSupplierFromOrder" cols="12">
            <v-alert type="info" variant="tonal">
              <div class="font-weight-bold mb-1">Proveedor detectado desde la orden de compra</div>
              <div>
                {{ guideContext.proveedor?.razon_social || "Sin nombre" }}
                <span v-if="guideContext.proveedor?.identificacion">
                  · {{ guideContext.proveedor?.identificacion }}
                </span>
              </div>
              <div v-if="guideContext.proveedor?.direccion" class="text-body-2 mt-1">
                Origen sugerido: {{ guideContext.proveedor?.direccion }}
              </div>
            </v-alert>
          </v-col>
          <template v-else>
            <v-col cols="12">
              <v-alert type="info" variant="tonal">
                Completa el proveedor que origina el traslado. Si ingresas un RUC de 13 dígitos, el sistema consultará automáticamente el SRI para cargar nombre comercial y direcciones.
              </v-alert>
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="guideForm.proveedor_identificacion"
                label="RUC proveedor"
                variant="outlined"
                :loading="guideProviderLookupLoading"
                hint="Al completar 13 dígitos se consultará el SRI."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="guideForm.proveedor_razon_social"
                label="Razón social proveedor"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="guideForm.proveedor_nombre_comercial"
                label="Nombre comercial proveedor"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="guideForm.proveedor_direccion"
                label="Dirección proveedor"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" v-if="guideProviderLookupError">
              <v-alert type="warning" variant="tonal">
                {{ guideProviderLookupError }}
              </v-alert>
            </v-col>
            <v-col cols="12" v-else-if="guideProviderLookupMessage">
              <v-alert type="info" variant="tonal">
                {{ guideProviderLookupMessage }}
              </v-alert>
            </v-col>
          </template>

          <v-col cols="12" md="6">
            <v-text-field v-model="guideForm.razon_social_transportista" label="Razón social transportista" variant="outlined" />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="guideForm.tipo_identificacion_transportista" :items="transportIdTypeOptions" label="Tipo ID transportista" variant="outlined" />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="guideForm.identificacion_transportista"
              label="RUC/Cédula transportista"
              variant="outlined"
              hint="Si coincide con destinatario, proveedor o emisor se completará automáticamente."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="guideForm.placa" label="Placa" variant="outlined" />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model="guideForm.identificacion_destinatario"
              label="Identificación destinatario"
              variant="outlined"
              :loading="guideRecipientLookupLoading"
              hint="Si ingresas un RUC de 13 dígitos se consultará el SRI."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="guideForm.razon_social_destinatario" label="Razón social destinatario" variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="guideForm.cod_estab_destino" label="Código estab. destino" variant="outlined" />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field v-model="guideForm.motivo_traslado" label="Motivo de traslado" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-alert type="info" variant="tonal">
              Ruta y establecimiento destino se completan automáticamente.
            </v-alert>
          </v-col>

          <v-col cols="12" v-if="guideRecipientLookupError">
            <v-alert type="warning" variant="tonal">
              {{ guideRecipientLookupError }}
            </v-alert>
          </v-col>
          <v-col cols="12" v-else-if="guideRecipientLookupMessage">
            <v-alert type="info" variant="tonal">
              {{ guideRecipientLookupMessage }}
            </v-alert>
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field v-model="guideForm.info_adicional_email" label="Info adicional: email" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="guideForm.info_adicional_telefono" label="Info adicional: teléfono" variant="outlined" />
          </v-col>
        </v-row>

        <div class="d-flex align-center justify-space-between mt-4 mb-2" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Detalle incluido en la guía</div>
            <div class="text-body-2 text-medium-emphasis">
              Se toma directamente de la transferencia registrada en inventario.
            </div>
          </div>
        </div>

        <div class="transfer-details-table">
          <table class="details-table compact-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detail in guideContext.transferencia?.detalles || []" :key="detail.id || detail.producto_id">
                <td>{{ detail.codigo_producto || '-' }}</td>
                <td>{{ detail.nombre_producto || '-' }}</td>
                <td>{{ formatNumber(detail.cantidad) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <v-alert
          v-if="generatedGuide"
          :type="guideStatusVariant"
          variant="tonal"
          class="mt-4"
        >
          Guía <strong>{{ generatedGuide.numero_guia || generatedGuide.clave_acceso || "generada" }}</strong>
          lista para revisión.
          <span v-if="generatedGuide.estado_emision"> Estado: {{ generatedGuide.estado_emision }}.</span>
          <span v-if="generatedGuide.sri_estado"> SRI: {{ generatedGuide.sri_estado }}.</span>
          <div
            v-for="(message, index) in summarizeGuideSriMessages(generatedGuide)"
            :key="`${generatedGuide.id}-sri-${index}`"
            class="text-body-2 mt-1"
          >
            {{ message }}
          </div>
        </v-alert>

        <div v-if="guidePreviewLoading" class="guide-preview-loading mt-4">
          <div class="text-body-2 font-weight-medium mb-2">Generando vista previa del PDF...</div>
          <v-progress-linear indeterminate color="primary" rounded height="8" />
        </div>

        <v-card
          v-else-if="guidePreviewUrl"
          variant="outlined"
          rounded="xl"
          class="mt-4 guide-preview-card"
        >
          <div class="d-flex align-center justify-space-between flex-wrap px-4 pt-4" style="gap: 8px;">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Vista previa PDF</div>
              <div class="text-body-2 text-medium-emphasis">
                Revisa la guía generada antes de autorizarla en el SRI.
              </div>
            </div>
            <v-btn
              variant="tonal"
              prepend-icon="mdi-open-in-new"
              @click="openGuidePreviewInNewTab"
            >
              Abrir PDF
            </v-btn>
          </div>
          <div class="guide-preview-frame-wrapper">
            <iframe :src="guidePreviewUrl" title="Vista previa de guía de remisión" class="guide-preview-frame" />
          </div>
        </v-card>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end pa-4">
        <v-btn variant="text" @click="closeGuideDialog">Cerrar</v-btn>
        <v-btn color="primary" :loading="guideSaving" @click="generateGuide">
          {{ generatedGuide?.id ? "Regenerar guía" : "Generar guía" }}
        </v-btn>
        <v-btn
          color="success"
          variant="tonal"
          :disabled="!canAuthorizeCurrentGuide"
          :loading="guideAuthorizing"
          @click="authorizeGuide"
        >
          Autorizar en SRI
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
import { fetchPaginatedResource } from "@/app/utils/paginated-resource";
import { formatDateForInput, formatDateTime } from "@/app/utils/date-time";
import { buildGuideRemisionPdfBlob } from "@/app/utils/guia-remision-documents";
import { isSuperAdministrator } from "@/app/utils/role-access";

type CatalogOption = { value: string; title: string };

type ProductRow = {
  id: string;
  codigo?: string | null;
  nombre?: string | null;
  costo_promedio?: string | number | null;
  ultimo_costo?: string | number | null;
};

type StockRow = {
  id: string;
  bodega_id: string;
  producto_id: string;
  stock_actual?: string | number | null;
};

type PurchaseOrderDetailRow = {
  id?: string;
  producto_id: string;
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
  cantidad_preaprobada?: string | number | null;
  cantidad_transferida?: string | number | null;
  cantidad_preaprobada_disponible?: string | number | null;
  costo_unitario?: string | number | null;
  subtotal?: string | number | null;
  observacion?: string | null;
};

type PurchaseOrderRow = {
  id: string;
  codigo: string;
  proveedor_nombre?: string | null;
  bodega_destino_id?: string | null;
  bodega_label?: string | null;
  detalles?: PurchaseOrderDetailRow[];
};

type TransferGuideSummary = {
  guia_remision_id?: string | null;
  guia_remision_estado?: string | null;
  guia_remision_sri_estado?: string | null;
  guia_remision_clave_acceso?: string | null;
  guia_remision_numero?: string | null;
  guia_remision_numero_autorizacion?: string | null;
};

type TransferRow = TransferGuideSummary & {
  id: string;
  codigo: string;
  fecha_transferencia?: string | null;
  orden_compra_codigo?: string | null;
  orden_compra_proveedor?: string | null;
  bodega_origen_label?: string | null;
  bodega_destino_label?: string | null;
  egreso_bodega_codigo?: string | null;
  ingreso_bodega_codigo?: string | null;
  estado?: string | null;
  total_items?: number;
  total_cantidad?: string | number | null;
};

type TransferDetailForm = {
  local_id: string;
  orden_compra_det_id: string;
  producto_id: string;
  codigo_producto: string;
  nombre_producto: string;
  cantidad: string;
  costo_unitario: string;
  observacion: string;
};

type SucursalRow = {
  id: string;
  codigo?: string | null;
  nombre?: string | null;
};

type SriConfigMeta = {
  certificate_filename?: string | null;
  cert_subject?: string | null;
  cert_valid_to?: string | null;
};

type GuideDetailRow = {
  id?: string;
  producto_id?: string;
  codigo_producto?: string | null;
  nombre_producto?: string | null;
  cantidad?: string | number | null;
};

type GuideContext = {
  transferencia?: {
    id: string;
    codigo?: string | null;
    fecha_transferencia?: string | null;
    bodega_origen_label?: string | null;
    bodega_destino_label?: string | null;
    detalles?: GuideDetailRow[];
  };
  sucursal?: SucursalRow;
  proveedor?: {
    id?: string | null;
    identificacion?: string | null;
    razon_social?: string | null;
    nombre_comercial?: string | null;
    direccion?: string | null;
    origen?: string | null;
  } | null;
  config?: Record<string, unknown> | null;
  draft?: Record<string, unknown> | null;
  guia_existente?: Record<string, unknown> | null;
};

type GuideResponse = {
  id: string;
  numero_guia?: string | null;
  clave_acceso?: string | null;
  estado_emision?: string | null;
  sri_estado?: string | null;
  numero_autorizacion?: string | null;
  fecha_autorizacion?: string | null;
  ambiente?: string | null;
  fecha_emision?: string | null;
  fecha_ini_transporte?: string | null;
  fecha_fin_transporte?: string | null;
  dir_partida?: string | null;
  razon_social_transportista?: string | null;
  tipo_identificacion_transportista?: string | null;
  identificacion_transportista?: string | null;
  placa?: string | null;
  identificacion_destinatario?: string | null;
  razon_social_destinatario?: string | null;
  dir_destinatario?: string | null;
  motivo_traslado?: string | null;
  cod_estab_destino?: string | null;
  ruta?: string | null;
  detalle_snapshot?: GuideDetailRow[] | null;
  info_adicional?: Record<string, unknown> | null;
  sri_messages?: Array<{
    identificador?: string | null;
    mensaje?: string | null;
    informacionAdicional?: string | null;
    tipo?: string | null;
  }> | null;
};

const ui = useUiStore();
const auth = useAuthStore();
const menuStore = useMenuStore();
const { mdAndDown } = useDisplay();

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "transferencias-bodega",
    "transferencias de bodega",
    "inventario",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canManageSriSignature = computed(() => isSuperAdministrator(auth.user));

const loading = ref(false);
const saving = ref(false);
const orderLoading = ref(false);
const dialog = ref(false);
const sriConfigDialog = ref(false);
const guideDialog = ref(false);
const guideSaving = ref(false);
const guideAuthorizing = ref(false);
const guidePreviewLoading = ref(false);
const sriConfigLoading = ref(false);
const sriConfigSaving = ref(false);
const sriSignatureSaving = ref(false);
const sriTaxpayerLookupLoading = ref(false);
const sriTaxpayerLookupMessage = ref("");
const sriTaxpayerLookupError = ref("");
const sriConfigHydrating = ref(false);
const lastSriLookedUpRuc = ref("");
const sriTaxpayerLookupTimer = ref<number | null>(null);
const guideRecipientLookupLoading = ref(false);
const guideRecipientLookupMessage = ref("");
const guideRecipientLookupError = ref("");
const lastGuideRecipientLookedUpRuc = ref("");
const guideRecipientLookupTimer = ref<number | null>(null);
const guideRecipientLookupHydrating = ref(false);
const guideProviderLookupLoading = ref(false);
const guideProviderLookupMessage = ref("");
const guideProviderLookupError = ref("");
const lastGuideProviderLookedUpRuc = ref("");
const guideProviderLookupTimer = ref<number | null>(null);
const guideProviderLookupHydrating = ref(false);
const consultingGuideId = ref("");
const serverPage = ref(1);
const serverItemsPerPage = ref(15);
const serverTotalItems = ref(0);
const transfers = ref<TransferRow[]>([]);
const pendingOrders = ref<PurchaseOrderRow[]>([]);
const warehouses = ref<any[]>([]);
const sucursales = ref<SucursalRow[]>([]);
const products = ref<ProductRow[]>([]);
const stockRows = ref<StockRow[]>([]);
const warehousesLoaded = ref(false);
const productsLoaded = ref(false);
const pendingOrdersLoaded = ref(false);
const stockRowsLoaded = ref(false);
const stockRowsLoading = ref(false);
const sucursalesLoaded = ref(false);
const selectedTransfer = ref<TransferRow | null>(null);
const sriCertificateFile = ref<File | null>(null);
const sriCertificatePassword = ref("");
const guideContext = ref<GuideContext>({});
const generatedGuide = ref<GuideResponse | null>(null);
const guidePreviewUrl = ref("");
const sriConfigMeta = reactive<SriConfigMeta>({});

const form = reactive({
  orden_compra_id: "",
  bodega_origen_id: "",
  bodega_destino_id: "",
  fecha_transferencia: formatDateForInput(),
  observacion: "",
  detalles: [] as TransferDetailForm[],
});

const sriConfigForm = reactive({
  sucursal_id: "",
  ambiente_default: "PRUEBAS",
  ruc: "",
  razon_social: "",
  nombre_comercial: "",
  dir_matriz: "",
  dir_establecimiento: "",
  estab: "001",
  pto_emi: "001",
  contribuyente_especial: "",
  obligado_contabilidad: "NO",
  dir_partida_default: "",
  info_adicional_email: "",
  info_adicional_telefono: "",
});

const guideForm = reactive({
  ambiente: "PRUEBAS",
  fecha_emision: formatDateForInput(),
  fecha_ini_transporte: formatDateForInput(),
  fecha_fin_transporte: formatDateForInput(),
  dir_partida: "",
  proveedor_identificacion: "",
  proveedor_razon_social: "",
  proveedor_nombre_comercial: "",
  proveedor_direccion: "",
  razon_social_transportista: "",
  tipo_identificacion_transportista: "04",
  identificacion_transportista: "",
  placa: "",
  identificacion_destinatario: "",
  razon_social_destinatario: "",
  dir_destinatario: "",
  motivo_traslado: "",
  cod_estab_destino: "",
  ruta: "",
  info_adicional_email: "",
  info_adicional_telefono: "",
  forzar_regeneracion: true,
});

const headers = [
  { title: "Código", key: "codigo" },
  { title: "Fecha", key: "fecha_transferencia" },
  { title: "Orden de compra", key: "orden_compra_codigo" },
  { title: "Proveedor", key: "orden_compra_proveedor" },
  { title: "Origen", key: "bodega_origen_label" },
  { title: "Destino", key: "bodega_destino_label" },
  { title: "EB", key: "egreso_bodega_codigo" },
  { title: "IB", key: "ingreso_bodega_codigo" },
  { title: "Items", key: "total_items" },
  { title: "Cantidad total", key: "total_cantidad" },
  { title: "Estado", key: "estado" },
  { title: "Guía SRI", key: "guia_remision", sortable: false },
  { title: "Acciones", key: "acciones", sortable: false },
];

const environmentOptions = ["PRUEBAS", "PRODUCCION"];
const yesNoOptions = ["SI", "NO"];
const transportIdTypeOptions = [
  { title: "RUC (04)", value: "04" },
  { title: "Cédula (05)", value: "05" },
  { title: "Pasaporte (06)", value: "06" },
  { title: "Consumidor final (07)", value: "07" },
];

const isDialogFullscreen = computed(() => mdAndDown.value);
const hasGuideSupplierFromOrder = computed(() => {
  const origin = String(guideContext.value.proveedor?.origen || "")
    .trim()
    .toUpperCase();
  return ["ORDEN_COMPRA", "ORDEN_COMPRA_LOCAL", "SRI_ORDEN_COMPRA"].includes(origin);
});
const guideStatusVariant = computed(() => {
  const emission = String(generatedGuide.value?.estado_emision || "")
    .trim()
    .toUpperCase();
  const sri = String(generatedGuide.value?.sri_estado || "")
    .trim()
    .toUpperCase();
  const status = sri || emission;
  if (status === "AUTORIZADO" || emission === "AUTORIZADA") return "success";
  if (status === "RECIBIDA" || emission === "RECIBIDA") return "info";
  if (status === "DEVUELTA" || emission === "DEVUELTA") return "warning";
  if (
    status === "NO AUTORIZADO" ||
    status === "RECHAZADO" ||
    emission === "NO_AUTORIZADA"
  ) return "error";
  return "info";
});
const selectedOrder = ref<PurchaseOrderRow | null>(null);

const sourceWarehouseOptions = computed<CatalogOption[]>(() =>
  warehouses.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
  })),
);

const sucursalOptions = computed<CatalogOption[]>(() =>
  sucursales.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
  })),
);

const effectiveSourceWarehouseId = computed(
  () => String(selectedOrder.value?.bodega_destino_id || form.bodega_origen_id || ""),
);

const sourceWarehouseLabel = computed(() => {
  const source = warehouses.value.find(
    (item) => String(item.id) === effectiveSourceWarehouseId.value,
  );
  return source ? `${source.codigo || ""} - ${source.nombre || source.id}`.trim() : "";
});

const destinationWarehouseOptions = computed<CatalogOption[]>(() =>
  warehouses.value
    .filter((item) => String(item.id) !== effectiveSourceWarehouseId.value)
    .map((item) => ({
      value: String(item.id),
      title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
    })),
);

const pendingOrderOptions = computed<CatalogOption[]>(() =>
  pendingOrders.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo} · ${item.proveedor_nombre || "Sin proveedor"} · ${item.bodega_label || "Sin bodega"}`,
  })),
);

const productOptions = computed<CatalogOption[]>(() =>
  products.value.map((item) => ({
    value: String(item.id),
    title: `${item.codigo || ""} - ${item.nombre || item.id}`.trim(),
  })),
);

const currentStockByProduct = computed(() => {
  const map = new Map<string, number>();
  const sourceWarehouseId = effectiveSourceWarehouseId.value;
  if (!sourceWarehouseId) return map;
  for (const row of stockRows.value) {
    if (String(row.bodega_id || "") !== sourceWarehouseId) continue;
    map.set(String(row.producto_id || ""), toNumber(row.stock_actual));
  }
  return map;
});

const orderDetailAvailabilityMap = computed(() => {
  const map = new Map<string, number>();
  for (const detail of selectedOrder.value?.detalles ?? []) {
    const detailId = String(detail?.id || "").trim();
    if (!detailId) continue;
    map.set(
      detailId,
      toNumber(
        detail?.cantidad_preaprobada_disponible ??
          (toNumber(detail?.cantidad_preaprobada) - toNumber(detail?.cantidad_transferida)),
      ),
    );
  }
  return map;
});

const tableRows = computed(() => transfers.value);

const totalQuantity = computed(() =>
  form.detalles.reduce((sum, detail) => sum + toNumber(detail.cantidad), 0),
);

const totalReferentialAmount = computed(() =>
  form.detalles.reduce((sum, detail) => sum + detailSubtotal(detail), 0),
);

const canAuthorizeCurrentGuide = computed(() => {
  if (!generatedGuide.value?.id || guideSaving.value || guidePreviewLoading.value) {
    return false;
  }
  const emissionState = String(generatedGuide.value.estado_emision || "").trim().toUpperCase();
  const sriState = String(generatedGuide.value.sri_estado || "").trim().toUpperCase();
  return emissionState !== "AUTORIZADA" && sriState !== "AUTORIZADO";
});

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function summarizeGuideSriMessages(guide?: GuideResponse | null) {
  const messages = Array.isArray(guide?.sri_messages) ? guide?.sri_messages : [];
  return messages
    .map((item) => {
      const parts = [
        String(item?.identificador || "").trim(),
        String(item?.mensaje || "").trim(),
        String(item?.informacionAdicional || "").trim(),
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .filter(Boolean);
}

function getGuideUiFeedbackVariant(guide?: GuideResponse | null) {
  const emission = String(guide?.estado_emision || "").trim().toUpperCase();
  const sri = String(guide?.sri_estado || "").trim().toUpperCase();
  const status = sri || emission;
  if (status === "AUTORIZADO" || emission === "AUTORIZADA") return "success";
  if (status === "RECIBIDA" || emission === "RECIBIDA") return "info";
  if (status === "DEVUELTA" || emission === "DEVUELTA") return "warning";
  if (
    status === "NO AUTORIZADO" ||
    status === "RECHAZADO" ||
    emission === "NO_AUTORIZADA"
  ) return "error";
  return "info";
}

function notifyGuideSriResult(
  apiMessage: string,
  guide?: GuideResponse | null,
) {
  const lines = summarizeGuideSriMessages(guide);
  const detail = lines[0] ? ` ${lines[0]}` : "";
  const text = `${apiMessage}${detail}`.trim();
  const variant = getGuideUiFeedbackVariant(guide);

  if (variant === "success") {
    ui.success(text);
    return;
  }
  if (variant === "warning") {
    ui.open(text, "warning", 7000);
    return;
  }
  if (variant === "error") {
    ui.error(text);
    return;
  }
  ui.open(text, "info", 5000);
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  if (!value) return "";
  return formatDateTime(value, String(value ?? ""));
}

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyDetail(): TransferDetailForm {
  return {
    local_id: createLocalId(),
    orden_compra_det_id: "",
    producto_id: "",
    codigo_producto: "",
    nombre_producto: "",
    cantidad: "1",
    costo_unitario: "0",
    observacion: "",
  };
}

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function normalizeRuc(value: unknown) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 13);
}

function normalizeComparableText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function inferGuideTransportIdentification() {
  const current = String(guideForm.identificacion_transportista || "").trim();
  if (current) return current;

  const transportName = normalizeComparableText(
    guideForm.razon_social_transportista,
  );
  if (!transportName) return "";

  const candidatePairs = [
    {
      name: guideForm.razon_social_destinatario,
      identification: guideForm.identificacion_destinatario,
    },
    {
      name: guideForm.proveedor_razon_social || guideContext.value.proveedor?.razon_social,
      identification:
        guideForm.proveedor_identificacion ||
        guideContext.value.proveedor?.identificacion,
    },
    {
      name:
        guideForm.proveedor_nombre_comercial ||
        guideContext.value.proveedor?.nombre_comercial,
      identification:
        guideForm.proveedor_identificacion ||
        guideContext.value.proveedor?.identificacion,
    },
    {
      name: String((guideContext.value.config as Record<string, unknown> | null)?.razon_social || ""),
      identification: String((guideContext.value.config as Record<string, unknown> | null)?.ruc || ""),
    },
    {
      name: String((guideContext.value.config as Record<string, unknown> | null)?.nombre_comercial || ""),
      identification: String((guideContext.value.config as Record<string, unknown> | null)?.ruc || ""),
    },
  ];

  for (const pair of candidatePairs) {
    const candidateId = String(pair.identification || "").trim();
    if (
      candidateId &&
      normalizeComparableText(pair.name) === transportName
    ) {
      return candidateId;
    }
  }

  return "";
}

function applyGuideTransportInference() {
  const inferred = inferGuideTransportIdentification();
  if (inferred && !String(guideForm.identificacion_transportista || "").trim()) {
    guideForm.identificacion_transportista = inferred;
  }
}

function clearSriTaxpayerLookupTimer() {
  if (sriTaxpayerLookupTimer.value == null) return;
  window.clearTimeout(sriTaxpayerLookupTimer.value);
  sriTaxpayerLookupTimer.value = null;
}

function clearSriTaxpayerLookupFeedback() {
  sriTaxpayerLookupMessage.value = "";
  sriTaxpayerLookupError.value = "";
}

function clearGuideRecipientLookupTimer() {
  if (guideRecipientLookupTimer.value == null) return;
  window.clearTimeout(guideRecipientLookupTimer.value);
  guideRecipientLookupTimer.value = null;
}

function clearGuideRecipientLookupFeedback() {
  guideRecipientLookupMessage.value = "";
  guideRecipientLookupError.value = "";
}

function clearGuideProviderLookupTimer() {
  if (guideProviderLookupTimer.value == null) return;
  window.clearTimeout(guideProviderLookupTimer.value);
  guideProviderLookupTimer.value = null;
}

function clearGuideProviderLookupFeedback() {
  guideProviderLookupMessage.value = "";
  guideProviderLookupError.value = "";
}

function clearSriSignatureMeta() {
  sriConfigMeta.certificate_filename = "";
  sriConfigMeta.cert_subject = "";
  sriConfigMeta.cert_valid_to = "";
}

function resetSriSignatureUploadForm() {
  sriCertificateFile.value = null;
  sriCertificatePassword.value = "";
}

function applySriTaxpayerAutofill(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return;
  const ruc = normalizeRuc(payload.ruc);
  const razonSocial = String(payload.razon_social || "").trim();
  const nombreComercial = String(
    payload.nombre_comercial || payload.razon_social || "",
  ).trim();
  const obligadoContabilidad = String(
    payload.obligado_contabilidad || "NO",
  ).trim();
  const contribuyenteEspecial = String(
    payload.contribuyente_especial || "",
  ).trim();

  if (ruc) {
    sriConfigForm.ruc = ruc;
  }
  if (razonSocial) {
    sriConfigForm.razon_social = razonSocial;
  }
  if (nombreComercial) {
    sriConfigForm.nombre_comercial = nombreComercial;
  }
  sriConfigForm.obligado_contabilidad = obligadoContabilidad || "NO";
  sriConfigForm.contribuyente_especial = contribuyenteEspecial;
  sriConfigForm.dir_matriz = String(payload.dir_matriz || sriConfigForm.dir_matriz || "");
  sriConfigForm.dir_establecimiento = String(
    payload.dir_establecimiento || sriConfigForm.dir_establecimiento || sriConfigForm.dir_matriz || "",
  );
  sriConfigForm.estab = String(payload.estab || sriConfigForm.estab || "001");
}

async function lookupSriTaxpayerByRuc(
  ruc = sriConfigForm.ruc,
  notifyOnError = false,
) {
  const normalizedRuc = normalizeRuc(ruc);
  if (normalizedRuc.length !== 13 || sriConfigHydrating.value) return;

  sriTaxpayerLookupLoading.value = true;
  clearSriTaxpayerLookupFeedback();

  try {
    const { data } = await api.get(
      "/kpi_inventory/guias-remision-sri/catalogo-contribuyente",
      {
        params: { ruc: normalizedRuc },
      },
    );
    const payload = (data?.data ?? data) as Record<string, unknown> | null;
    applySriTaxpayerAutofill(payload);
    lastSriLookedUpRuc.value = normalizedRuc;
    sriTaxpayerLookupMessage.value =
      "Datos tributarios y direcciones cargados desde el SRI.";
  } catch (error: any) {
    lastSriLookedUpRuc.value = "";
    sriTaxpayerLookupError.value =
      error?.response?.data?.message ||
      error?.message ||
      "No se pudo consultar el RUC en el SRI.";
    if (notifyOnError) {
      ui.error(sriTaxpayerLookupError.value);
    }
  } finally {
    sriTaxpayerLookupLoading.value = false;
  }
}

function scheduleSriTaxpayerLookup(force = false) {
  clearSriTaxpayerLookupTimer();
  const normalizedRuc = normalizeRuc(sriConfigForm.ruc);
  if (normalizedRuc !== sriConfigForm.ruc) {
    sriConfigForm.ruc = normalizedRuc;
    return;
  }

  if (normalizedRuc.length < 13) {
    lastSriLookedUpRuc.value = "";
    clearSriTaxpayerLookupFeedback();
    return;
  }

  if (sriConfigHydrating.value) return;
  if (!force && normalizedRuc === lastSriLookedUpRuc.value) return;

  sriTaxpayerLookupTimer.value = window.setTimeout(() => {
    void lookupSriTaxpayerByRuc(normalizedRuc, force);
  }, 450);
}

function getGuideProviderSnapshot() {
  const provider = {
    identificacion: normalizeRuc(guideForm.proveedor_identificacion),
    razon_social: String(guideForm.proveedor_razon_social || "").trim(),
    nombre_comercial: String(guideForm.proveedor_nombre_comercial || "").trim(),
    direccion: String(guideForm.proveedor_direccion || "").trim(),
    origen: "MANUAL",
  };
  if (
    !provider.identificacion &&
    !provider.razon_social &&
    !provider.nombre_comercial &&
    !provider.direccion
  ) {
    return null;
  }
  return provider;
}

function getGuidePreviewProvider() {
  if (hasGuideSupplierFromOrder.value) {
    return guideContext.value.proveedor ?? null;
  }
  return getGuideProviderSnapshot() ?? guideContext.value.proveedor ?? null;
}

function syncManualGuideProviderContext() {
  if (hasGuideSupplierFromOrder.value) return;
  const snapshot = getGuideProviderSnapshot();
  guideContext.value = {
    ...guideContext.value,
    proveedor: snapshot,
  };
}

function applyGuideProviderAutofill(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return;
  const ruc = normalizeRuc(payload.ruc);
  const razonSocial = String(payload.razon_social || "").trim();
  const nombreComercial = String(
    payload.nombre_comercial || payload.razon_social || "",
  ).trim();
  const direccion = String(
    payload.dir_establecimiento || payload.dir_matriz || "",
  ).trim();

  if (ruc) {
    guideForm.proveedor_identificacion = ruc;
  }
  if (razonSocial) {
    guideForm.proveedor_razon_social = razonSocial;
  }
  if (nombreComercial) {
    guideForm.proveedor_nombre_comercial = nombreComercial;
  }
  if (direccion) {
    guideForm.proveedor_direccion = direccion;
    if (!String(guideForm.dir_partida || "").trim()) {
      guideForm.dir_partida = direccion;
    }
  }
  syncManualGuideProviderContext();
}

async function lookupGuideProviderByRuc(
  ruc = guideForm.proveedor_identificacion,
  notifyOnError = false,
) {
  const normalizedRuc = normalizeRuc(ruc);
  if (
    normalizedRuc.length !== 13 ||
    !guideDialog.value ||
    guideProviderLookupHydrating.value ||
    hasGuideSupplierFromOrder.value
  ) return;

  guideProviderLookupLoading.value = true;
  clearGuideProviderLookupFeedback();

  try {
    const { data } = await api.get(
      "/kpi_inventory/guias-remision-sri/catalogo-contribuyente",
      {
        params: { ruc: normalizedRuc },
      },
    );
    const payload = (data?.data ?? data) as Record<string, unknown> | null;
    applyGuideProviderAutofill(payload);
    lastGuideProviderLookedUpRuc.value = normalizedRuc;
    guideProviderLookupMessage.value =
      "Proveedor completado automáticamente desde el SRI.";
  } catch (error: any) {
    lastGuideProviderLookedUpRuc.value = "";
    guideProviderLookupError.value =
      error?.response?.data?.message ||
      error?.message ||
      "No se pudo consultar el proveedor en el SRI.";
    if (notifyOnError) {
      ui.error(guideProviderLookupError.value);
    }
  } finally {
    guideProviderLookupLoading.value = false;
  }
}

function scheduleGuideProviderLookup(force = false) {
  clearGuideProviderLookupTimer();
  const normalizedRuc = normalizeRuc(guideForm.proveedor_identificacion);
  if (normalizedRuc !== guideForm.proveedor_identificacion) {
    guideForm.proveedor_identificacion = normalizedRuc;
    return;
  }

  if (normalizedRuc.length < 13) {
    lastGuideProviderLookedUpRuc.value = "";
    clearGuideProviderLookupFeedback();
    syncManualGuideProviderContext();
    return;
  }

  if (
    !guideDialog.value ||
    guideProviderLookupHydrating.value ||
    hasGuideSupplierFromOrder.value
  ) return;
  if (!force && normalizedRuc === lastGuideProviderLookedUpRuc.value) return;

  guideProviderLookupTimer.value = window.setTimeout(() => {
    void lookupGuideProviderByRuc(normalizedRuc, force);
  }, 450);
}

function applyGuideRecipientAutofill(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return;
  const ruc = normalizeRuc(payload.ruc);
  const razonSocial = String(payload.razon_social || "").trim();
  const direccion = String(
    payload.dir_establecimiento || payload.dir_matriz || "",
  ).trim();

  if (ruc) {
    guideForm.identificacion_destinatario = ruc;
  }
  if (razonSocial) {
    guideForm.razon_social_destinatario = razonSocial;
  }
  if (direccion && !String(guideForm.dir_destinatario || "").trim()) {
    guideForm.dir_destinatario = direccion;
  }
}

async function lookupGuideRecipientByRuc(
  ruc = guideForm.identificacion_destinatario,
  notifyOnError = false,
) {
  const normalizedRuc = normalizeRuc(ruc);
  if (normalizedRuc.length !== 13 || !guideDialog.value || guideRecipientLookupHydrating.value) return;

  guideRecipientLookupLoading.value = true;
  clearGuideRecipientLookupFeedback();

  try {
    const { data } = await api.get(
      "/kpi_inventory/guias-remision-sri/catalogo-contribuyente",
      {
        params: { ruc: normalizedRuc },
      },
    );
    const payload = (data?.data ?? data) as Record<string, unknown> | null;
    applyGuideRecipientAutofill(payload);
    lastGuideRecipientLookedUpRuc.value = normalizedRuc;
    guideRecipientLookupMessage.value =
      "Destinatario completado automáticamente desde el SRI.";
  } catch (error: any) {
    lastGuideRecipientLookedUpRuc.value = "";
    guideRecipientLookupError.value =
      error?.response?.data?.message ||
      error?.message ||
      "No se pudo consultar el destinatario en el SRI.";
    if (notifyOnError) {
      ui.error(guideRecipientLookupError.value);
    }
  } finally {
    guideRecipientLookupLoading.value = false;
  }
}

function scheduleGuideRecipientLookup(force = false) {
  clearGuideRecipientLookupTimer();
  const normalizedRuc = normalizeRuc(guideForm.identificacion_destinatario);
  if (normalizedRuc !== guideForm.identificacion_destinatario) {
    guideForm.identificacion_destinatario = normalizedRuc;
    return;
  }

  if (normalizedRuc.length < 13) {
    lastGuideRecipientLookedUpRuc.value = "";
    clearGuideRecipientLookupFeedback();
    return;
  }

  if (!guideDialog.value || guideRecipientLookupHydrating.value) return;
  if (!force && normalizedRuc === lastGuideRecipientLookedUpRuc.value) return;

  guideRecipientLookupTimer.value = window.setTimeout(() => {
    void lookupGuideRecipientByRuc(normalizedRuc, force);
  }, 450);
}

function detailSubtotal(detail: TransferDetailForm) {
  return toNumber(detail.cantidad) * toNumber(detail.costo_unitario);
}

function getOrderDetailAvailable(detail: TransferDetailForm) {
  const detailId = String(detail.orden_compra_det_id || "").trim();
  if (!detailId) return 0;
  return orderDetailAvailabilityMap.value.get(detailId) ?? 0;
}

function getCurrentStock(detail: TransferDetailForm) {
  if (selectedOrder.value) {
    return getOrderDetailAvailable(detail);
  }
  if (!detail.producto_id) return 0;
  return currentStockByProduct.value.get(String(detail.producto_id || "")) ?? 0;
}

function getRequestedQuantity(detail: TransferDetailForm) {
  if (selectedOrder.value && detail.orden_compra_det_id) {
    return form.detalles
      .filter(
        (row) =>
          String(row.orden_compra_det_id || "") ===
          String(detail.orden_compra_det_id || ""),
      )
      .reduce((sum, row) => sum + toNumber(row.cantidad), 0);
  }

  return form.detalles
    .filter((row) => String(row.producto_id || "") === String(detail.producto_id || ""))
    .reduce((sum, row) => sum + toNumber(row.cantidad), 0);
}

function detailExceedsStock(detail: TransferDetailForm) {
  if (!detail.producto_id) return false;
  return getRequestedQuantity(detail) > getCurrentStock(detail);
}

function resetForm() {
  selectedOrder.value = null;
  form.orden_compra_id = "";
  form.bodega_origen_id = "";
  form.bodega_destino_id = "";
  form.fecha_transferencia = formatDateForInput();
  form.observacion = "";
  form.detalles = [createEmptyDetail()];
}

function resetSriConfigForm() {
  clearSriTaxpayerLookupTimer();
  clearSriTaxpayerLookupFeedback();
  sriTaxpayerLookupLoading.value = false;
  sriConfigHydrating.value = false;
  lastSriLookedUpRuc.value = "";
  sriConfigForm.ambiente_default = "PRUEBAS";
  sriConfigForm.ruc = "";
  sriConfigForm.razon_social = "";
  sriConfigForm.nombre_comercial = "";
  sriConfigForm.dir_matriz = "";
  sriConfigForm.dir_establecimiento = "";
  sriConfigForm.estab = "001";
  sriConfigForm.pto_emi = "001";
  sriConfigForm.contribuyente_especial = "";
  sriConfigForm.obligado_contabilidad = "NO";
  sriConfigForm.dir_partida_default = "";
  sriConfigForm.info_adicional_email = "";
  sriConfigForm.info_adicional_telefono = "";
}

function resetGuideForm() {
  clearGuideRecipientLookupTimer();
  clearGuideProviderLookupTimer();
  guideForm.ambiente = "PRUEBAS";
  guideForm.fecha_emision = formatDateForInput();
  guideForm.fecha_ini_transporte = formatDateForInput();
  guideForm.fecha_fin_transporte = formatDateForInput();
  guideForm.dir_partida = "";
  guideForm.proveedor_identificacion = "";
  guideForm.proveedor_razon_social = "";
  guideForm.proveedor_nombre_comercial = "";
  guideForm.proveedor_direccion = "";
  guideForm.razon_social_transportista = "";
  guideForm.tipo_identificacion_transportista = "04";
  guideForm.identificacion_transportista = "";
  guideForm.placa = "";
  guideForm.identificacion_destinatario = "";
  guideForm.razon_social_destinatario = "";
  guideForm.dir_destinatario = "";
  guideForm.motivo_traslado = "";
  guideForm.cod_estab_destino = "";
  guideForm.ruta = "";
  guideForm.info_adicional_email = "";
  guideForm.info_adicional_telefono = "";
  guideForm.forzar_regeneracion = true;
  guideRecipientLookupLoading.value = false;
  guideRecipientLookupHydrating.value = false;
  guideProviderLookupLoading.value = false;
  guideProviderLookupHydrating.value = false;
  clearGuideRecipientLookupFeedback();
  clearGuideProviderLookupFeedback();
  lastGuideRecipientLookedUpRuc.value = "";
  lastGuideProviderLookedUpRuc.value = "";
}

function revokeGuidePreviewUrl() {
  if (!guidePreviewUrl.value) return;
  window.URL.revokeObjectURL(guidePreviewUrl.value);
  guidePreviewUrl.value = "";
}

function resetGuidePreview() {
  generatedGuide.value = null;
  guidePreviewLoading.value = false;
  guideAuthorizing.value = false;
  revokeGuidePreviewUrl();
}

function closeGuideDialog() {
  if (guideSaving.value || guideAuthorizing.value) return;
  guideDialog.value = false;
  resetGuideForm();
  resetGuidePreview();
  guideContext.value = {};
  selectedTransfer.value = null;
}

async function buildGuidePreview(guide: GuideResponse) {
  if (!guide?.id) return;
  guidePreviewLoading.value = true;
  revokeGuidePreviewUrl();
  try {
    const blob = await buildGuideRemisionPdfBlob({
      guide,
      transfer: guideContext.value.transferencia,
      sucursal: guideContext.value.sucursal,
      config: (guideContext.value.config ?? null) as any,
      provider: getGuidePreviewProvider(),
      generatedBy: getUserName(),
    });
    guidePreviewUrl.value = window.URL.createObjectURL(blob);
  } catch (error: any) {
    ui.error(error?.message || "No se pudo generar la vista previa del PDF.");
  } finally {
    guidePreviewLoading.value = false;
  }
}

async function loadGuidePreviewByTransfer(transferId: string) {
  if (!String(transferId || "").trim()) return;
  try {
    const { data } = await api.get(`/kpi_inventory/guias-remision-sri/transfer/${transferId}`);
    const payload = (data?.data ?? data) as GuideResponse | null;
    if (!payload?.id) {
      resetGuidePreview();
      return;
    }
    generatedGuide.value = payload;
    await buildGuidePreview(payload);
  } catch (error: any) {
    resetGuidePreview();
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar la guía generada.",
    );
  }
}

function openGuidePreviewInNewTab() {
  if (!guidePreviewUrl.value) return;
  window.open(guidePreviewUrl.value, "_blank", "noopener,noreferrer");
}

function addDetail() {
  form.detalles.push(createEmptyDetail());
}

function removeDetail(localId: string) {
  form.detalles = form.detalles.filter((detail) => detail.local_id !== localId);
  if (!form.detalles.length) {
    form.detalles = selectedOrder.value ? [] : [createEmptyDetail()];
  }
}

function handleDetailProductChange(detail: TransferDetailForm) {
  const product = products.value.find((item) => String(item.id) === String(detail.producto_id));
  if (!product) return;
  detail.codigo_producto = String(product.codigo || "");
  detail.nombre_producto = String(product.nombre || "");
  detail.costo_unitario = String(product.costo_promedio || product.ultimo_costo || 0);
}

function mapOrderDetails(details: PurchaseOrderDetailRow[] | undefined) {
  return Array.isArray(details)
    ? details.map((detail) => ({
        local_id: createLocalId(),
        orden_compra_det_id: String(detail.id || ""),
        producto_id: String(detail.producto_id || ""),
        codigo_producto: String(detail.codigo_producto || ""),
        nombre_producto: String(detail.nombre_producto || ""),
        cantidad: String(
          detail.cantidad_preaprobada_disponible ??
            detail.cantidad_preaprobada ??
            detail.cantidad ??
            "0",
        ),
        costo_unitario: String(detail.costo_unitario || "0"),
        observacion: String(detail.observacion || ""),
      }))
    : [];
}

function guideStateColor(state?: string | null) {
  const normalized = String(state || "").toUpperCase();
  if (normalized.includes("AUTORIZ")) return "success";
  if (normalized.includes("DEVUEL") || normalized.includes("NO AUTORIZ")) return "error";
  if (normalized.includes("RECIB")) return "info";
  return "secondary";
}

function guideSriStateColor(state?: string | null) {
  return guideStateColor(state);
}

function canGenerateGuide(item: TransferRow) {
  const normalized = String(item.estado || "COMPLETADA").toUpperCase();
  return ["COMPLETADA", "COMPLETADO", "FINALIZADA", "FINALIZADO", "APROBADA", "APROBADO"].includes(normalized);
}

async function loadTransfers() {
  const response = await fetchPaginatedResource(
    "/kpi_inventory/transferencias-bodega",
    {},
    {
      page: serverPage.value,
      limit: serverItemsPerPage.value,
    },
  );
  transfers.value = response.data as TransferRow[];
  serverTotalItems.value = Number(response.pagination.total || 0);
}

async function loadPendingOrders() {
  const { data } = await api.get("/kpi_inventory/ordenes-compra/pendientes-transferencia");
  const payload = data?.data ?? data;
  pendingOrders.value = Array.isArray(payload) ? payload : [];
}

async function ensureWarehousesLoaded(force = false) {
  if (warehousesLoaded.value && !force) return;
  warehouses.value = await listAllPages("/kpi_inventory/bodegas");
  warehousesLoaded.value = true;
}

async function ensureSucursalesLoaded(force = false) {
  if (sucursalesLoaded.value && !force) return;
  sucursales.value = (await listAllPages("/kpi_inventory/sucursales")) as SucursalRow[];
  sucursalesLoaded.value = true;
  if (!sriConfigForm.sucursal_id) {
    sriConfigForm.sucursal_id = String(sucursales.value[0]?.id || "");
  }
}

async function ensurePendingOrdersLoaded(force = false) {
  if (pendingOrdersLoaded.value && !force) return;
  await loadPendingOrders();
  pendingOrdersLoaded.value = true;
}

async function ensureProductsLoaded(force = false) {
  if (productsLoaded.value && !force) return;
  products.value = (await listAllPages("/kpi_inventory/productos")) as ProductRow[];
  productsLoaded.value = true;
}

async function ensureStockRowsLoaded(force = false) {
  if (selectedOrder.value) return;
  if (stockRowsLoaded.value && !force) return;
  if (stockRowsLoading.value) return;
  stockRowsLoading.value = true;
  try {
    stockRows.value = (await listAllPages("/kpi_inventory/stock-bodega")) as StockRow[];
    stockRowsLoaded.value = true;
  } finally {
    stockRowsLoading.value = false;
  }
}

async function hydrateView() {
  if (!canRead.value) return;
  loading.value = true;
  try {
    await Promise.all([
      loadTransfers(),
      ensureWarehousesLoaded(true),
      ensurePendingOrdersLoaded(true),
    ]);
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar el módulo de transferencias.",
    );
  } finally {
    loading.value = false;
  }
}

function handleServerOptionsUpdate(options: { page?: number; itemsPerPage?: number }) {
  const nextPage = Number(options?.page || serverPage.value || 1);
  const nextItemsPerPage = Number(options?.itemsPerPage || serverItemsPerPage.value || 15);
  const pageChanged = nextPage !== serverPage.value;
  const limitChanged = nextItemsPerPage !== serverItemsPerPage.value;
  if (!pageChanged && !limitChanged) return;

  serverPage.value = nextPage;
  serverItemsPerPage.value = nextItemsPerPage;
  void hydrateView();
}

async function openCreate() {
  resetForm();
  dialog.value = true;
  await Promise.all([
    ensureWarehousesLoaded(),
    ensurePendingOrdersLoaded(),
    ensureProductsLoaded(),
  ]);
}

async function openSriConfigDialog() {
  sriConfigDialog.value = true;
  sriConfigLoading.value = true;
  resetSriSignatureUploadForm();
  clearSriSignatureMeta();
  try {
    await ensureSucursalesLoaded();
    await Promise.all([
      sriConfigForm.sucursal_id
        ? loadConfigForSucursal(sriConfigForm.sucursal_id)
        : Promise.resolve(),
      canManageSriSignature.value
        ? loadGlobalSriSignature()
        : Promise.resolve(),
    ]);
  } catch (error: any) {
    ui.error(error?.response?.data?.message || error?.message || "No se pudo cargar la configuración SRI.");
  } finally {
    sriConfigLoading.value = false;
  }
}

async function loadGlobalSriSignature() {
  clearSriSignatureMeta();
  const { data } = await api.get("/kpi_inventory/guias-remision-sri/config/firma-global");
  const payload = data?.data ?? data;
  if (!payload) return;
  sriConfigMeta.certificate_filename = String(payload.certificate_filename || "");
  sriConfigMeta.cert_subject = String(payload.cert_subject || "");
  sriConfigMeta.cert_valid_to = String(payload.cert_valid_to || "");
}

async function loadConfigForSucursal(sucursalId: string) {
  resetSriConfigForm();
  sriConfigForm.sucursal_id = sucursalId;
  if (!sucursalId) return;
  sriConfigHydrating.value = true;
  try {
    const { data } = await api.get(`/kpi_inventory/guias-remision-sri/config/sucursal/${sucursalId}`);
    const payload = data?.data ?? data;
    if (!payload) return;
    sriConfigForm.ambiente_default = String(payload.ambiente_default || "PRUEBAS");
    sriConfigForm.ruc = String(payload.ruc || "");
    sriConfigForm.razon_social = String(payload.razon_social || "");
    sriConfigForm.nombre_comercial = String(payload.nombre_comercial || "");
    sriConfigForm.dir_matriz = String(payload.dir_matriz || "");
    sriConfigForm.dir_establecimiento = String(payload.dir_establecimiento || "");
    sriConfigForm.estab = String(payload.estab || "001");
    sriConfigForm.pto_emi = String(payload.pto_emi || "001");
    sriConfigForm.contribuyente_especial = String(payload.contribuyente_especial || "");
    sriConfigForm.obligado_contabilidad = String(payload.obligado_contabilidad || "NO");
    sriConfigForm.dir_partida_default = String(payload.dir_partida_default || "");
    sriConfigForm.info_adicional_email = String(payload.info_adicional_email || "");
    sriConfigForm.info_adicional_telefono = String(payload.info_adicional_telefono || "");
    lastSriLookedUpRuc.value = normalizeRuc(payload.ruc);
    clearSriTaxpayerLookupFeedback();
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      throw error;
    }
  } finally {
    sriConfigHydrating.value = false;
  }
}

async function saveSriConfig() {
  if (!sriConfigForm.sucursal_id) {
    ui.error("Debes seleccionar una sucursal para la configuración SRI.");
    return;
  }
  if (!sriConfigForm.ruc || !sriConfigForm.razon_social || !sriConfigForm.dir_matriz) {
    ui.error("Completa al menos RUC, razón social y dirección matriz.");
    return;
  }
  sriConfigSaving.value = true;
  try {
    await api.post("/kpi_inventory/guias-remision-sri/config", {
      ...sriConfigForm,
      created_by: getUserName(),
      updated_by: getUserName(),
    });

    await loadConfigForSucursal(sriConfigForm.sucursal_id);
    ui.success("Configuración SRI guardada correctamente.");
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo guardar la configuración SRI.",
    );
  } finally {
    sriConfigSaving.value = false;
  }
}

async function saveGlobalSriSignature() {
  if (!canManageSriSignature.value) {
    ui.error("Solo el Super Administrador puede actualizar la firma global SRI.");
    return;
  }
  if (!sriCertificateFile.value || !sriCertificatePassword.value) {
    ui.error("Debes seleccionar el archivo .p12 y su clave para actualizar la firma global.");
    return;
  }

  sriSignatureSaving.value = true;
  try {
    const formData = new FormData();
    formData.append("password", sriCertificatePassword.value);
    formData.append("updated_by", getUserName());
    formData.append("file", sriCertificateFile.value);
    await api.post(
      "/kpi_inventory/guias-remision-sri/config/firma-global/certificate",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    await loadGlobalSriSignature();
    resetSriSignatureUploadForm();
    ui.success("Firma global SRI actualizada correctamente.");
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo actualizar la firma global SRI.",
    );
  } finally {
    sriSignatureSaving.value = false;
  }
}

async function openGuideDialog(item: TransferRow) {
  if (!canGenerateGuide(item)) {
    ui.error("La guía solo puede generarse cuando la transferencia esté aprobada, completada o finalizada.");
    return;
  }
  guideDialog.value = true;
  guideSaving.value = false;
  guideAuthorizing.value = false;
  selectedTransfer.value = item;
  resetGuideForm();
  resetGuidePreview();
  try {
    const { data } = await api.get(`/kpi_inventory/guias-remision-sri/prepare/${item.id}`);
    const payload = (data?.data ?? data) as GuideContext;
    guideContext.value = payload || {};
    const draft = (payload?.draft ?? {}) as Record<string, unknown>;
    guideRecipientLookupHydrating.value = true;
    guideProviderLookupHydrating.value = true;
    guideForm.ambiente = String(draft.ambiente || "PRUEBAS");
    guideForm.fecha_emision = String(draft.fecha_emision || formatDateForInput());
    guideForm.fecha_ini_transporte = String(draft.fecha_ini_transporte || guideForm.fecha_emision);
    guideForm.fecha_fin_transporte = String(draft.fecha_fin_transporte || guideForm.fecha_ini_transporte);
    guideForm.dir_partida = String(draft.dir_partida || "");
    guideForm.proveedor_identificacion = String(payload?.proveedor?.identificacion || "");
    guideForm.proveedor_razon_social = String(payload?.proveedor?.razon_social || "");
    guideForm.proveedor_nombre_comercial = String(payload?.proveedor?.nombre_comercial || "");
    guideForm.proveedor_direccion = String(payload?.proveedor?.direccion || "");
    guideForm.razon_social_transportista = String(draft.razon_social_transportista || "");
    guideForm.tipo_identificacion_transportista = String(draft.tipo_identificacion_transportista || "04");
    guideForm.identificacion_transportista = String(draft.identificacion_transportista || "");
    guideForm.placa = String(draft.placa || "");
    guideForm.identificacion_destinatario = String(draft.identificacion_destinatario || "");
    guideForm.razon_social_destinatario = String(draft.razon_social_destinatario || "");
    guideForm.dir_destinatario = String(draft.dir_destinatario || "");
    guideForm.motivo_traslado = String(draft.motivo_traslado || "");
    guideForm.cod_estab_destino = String(draft.cod_estab_destino || "");
    guideForm.ruta = String(draft.ruta || "");
    guideForm.info_adicional_email = String(draft.info_adicional_email || "");
    guideForm.info_adicional_telefono = String(draft.info_adicional_telefono || "");
    lastGuideRecipientLookedUpRuc.value = normalizeRuc(
      draft.identificacion_destinatario,
    );
    lastGuideProviderLookedUpRuc.value = normalizeRuc(
      payload?.proveedor?.identificacion,
    );
    clearGuideRecipientLookupFeedback();
    clearGuideProviderLookupFeedback();
    guideRecipientLookupHydrating.value = false;
    guideProviderLookupHydrating.value = false;
    applyGuideTransportInference();
    guideForm.forzar_regeneracion = Boolean(payload?.guia_existente);
    if (payload?.guia_existente) {
      await loadGuidePreviewByTransfer(item.id);
    }
  } catch (error: any) {
    closeGuideDialog();
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo preparar la guía de remisión.",
    );
  }
}

async function generateGuide() {
  if (!selectedTransfer.value?.id) {
    ui.error("No se encontró la transferencia seleccionada.");
    return;
  }
  applyGuideTransportInference();
  if (!guideForm.razon_social_transportista || !guideForm.placa) {
    ui.error("Completa al menos el nombre del transportista y la placa.");
    return;
  }
  if (!guideForm.identificacion_transportista) {
    ui.error("Completa el RUC o cédula del transportista para generar la guía.");
    return;
  }
  if (!guideForm.identificacion_destinatario || !guideForm.razon_social_destinatario || !guideForm.dir_destinatario) {
    ui.error("Completa los datos del destinatario de la guía.");
    return;
  }
  if (
    !hasGuideSupplierFromOrder.value &&
    (!guideForm.proveedor_identificacion || !guideForm.proveedor_razon_social)
  ) {
    ui.error("Completa el RUC y la razón social del proveedor para generar la guía.");
    return;
  }
  guideSaving.value = true;
  try {
    const { data } = await api.post(`/kpi_inventory/guias-remision-sri/transfer/${selectedTransfer.value.id}/generate`, {
      ...guideForm,
      proveedor_identificacion: guideForm.proveedor_identificacion,
      proveedor_razon_social: guideForm.proveedor_razon_social,
      proveedor_nombre_comercial: guideForm.proveedor_nombre_comercial,
      proveedor_direccion: guideForm.proveedor_direccion,
      emitir_y_enviar: false,
      created_by: getUserName(),
      updated_by: getUserName(),
    });
    const payload = (data?.data ?? data) as GuideResponse;
    generatedGuide.value = payload;
    guideForm.forzar_regeneracion = true;
    await buildGuidePreview(payload);
    ui.success("Guía generada correctamente. Revisa la vista previa y luego autorízala en el SRI.");
    await loadTransfers();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo generar la guía de remisión.",
    );
  } finally {
    guideSaving.value = false;
  }
}

async function authorizeGuide() {
  if (!generatedGuide.value?.id) {
    ui.error("Primero debes generar la guía antes de autorizarla.");
    return;
  }
  guideAuthorizing.value = true;
  try {
    const response = await api.post(
      `/kpi_inventory/guias-remision-sri/${generatedGuide.value.id}/autorizar`,
      {
        updated_by: getUserName(),
      },
    );
    const payload = (response.data?.data ?? response.data) as GuideResponse;
    generatedGuide.value = payload;
    await buildGuidePreview(payload);
    notifyGuideSriResult(
      String(response.data?.message || "Estado SRI actualizado."),
      payload,
    );
    await loadTransfers();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo autorizar la guía en el SRI.",
    );
  } finally {
    guideAuthorizing.value = false;
  }
}

async function consultGuide(item: TransferRow) {
  if (!item.guia_remision_id) return;
  consultingGuideId.value = item.guia_remision_id;
  try {
    const response = await api.post(`/kpi_inventory/guias-remision-sri/${item.guia_remision_id}/consultar-autorizacion`, {
      updated_by: getUserName(),
    });
    const payload = (response.data?.data ?? response.data) as GuideResponse;
    notifyGuideSriResult(
      String(response.data?.message || "Consulta de autorización ejecutada."),
      payload,
    );
    await hydrateView();
  } catch (error: any) {
    ui.error(error?.response?.data?.message || error?.message || "No se pudo consultar el estado en SRI.");
  } finally {
    consultingGuideId.value = "";
  }
}

async function downloadGuideXml(item: TransferRow, kind: "unsigned" | "signed") {
  if (!item.guia_remision_id) return;
  try {
    const response = await api.get(`/kpi_inventory/guias-remision-sri/${item.guia_remision_id}/xml`, {
      params: { kind },
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/xml" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.guia_remision_numero || item.codigo || 'guia'}-${kind}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    ui.error(error?.response?.data?.message || error?.message || "No se pudo descargar el XML.");
  }
}

async function loadSelectedOrder(orderId: string) {
  const normalizedId = String(orderId || "").trim();
  if (!normalizedId) {
    selectedOrder.value = null;
    form.bodega_origen_id = "";
    form.detalles = [createEmptyDetail()];
    if (dialog.value) {
      void ensureProductsLoaded();
      if (form.bodega_origen_id) {
        void ensureStockRowsLoaded();
      }
    }
    return;
  }

  orderLoading.value = true;
  try {
    await ensurePendingOrdersLoaded();
    const fallback =
      pendingOrders.value.find((item) => String(item.id) === normalizedId) || null;
    if (fallback) {
      selectedOrder.value = fallback;
      form.bodega_origen_id = String(fallback.bodega_destino_id || "");
      form.detalles = mapOrderDetails(fallback.detalles);
    }

    const { data } = await api.get(`/kpi_inventory/ordenes-compra/${normalizedId}`);
    const order = (data?.data ?? data) as PurchaseOrderRow;
    selectedOrder.value = order;
    form.bodega_origen_id = String(order?.bodega_destino_id || "");
    form.detalles = mapOrderDetails(order?.detalles);
  } catch (error: any) {
    selectedOrder.value = null;
    form.bodega_origen_id = "";
    form.detalles = [createEmptyDetail()];
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar la orden de compra seleccionada.",
    );
  } finally {
    orderLoading.value = false;
  }
}

function validateForm() {
  if (!effectiveSourceWarehouseId.value) {
    ui.error("Debes seleccionar la bodega origen.");
    return false;
  }
  if (!form.bodega_destino_id) {
    ui.error("Debes seleccionar la bodega destino.");
    return false;
  }
  if (effectiveSourceWarehouseId.value === String(form.bodega_destino_id || "")) {
    ui.error("La bodega destino debe ser distinta a la bodega origen.");
    return false;
  }
  if (!form.detalles.length) {
    ui.error("Debes agregar al menos un material para transferir.");
    return false;
  }
  for (const detail of form.detalles) {
    if (!detail.producto_id) {
      ui.error("Todos los materiales de la transferencia deben estar seleccionados.");
      return false;
    }
    if (!(toNumber(detail.cantidad) > 0)) {
      ui.error("La cantidad de cada material debe ser mayor a cero.");
      return false;
    }
    if (detailExceedsStock(detail)) {
      const materialLabel =
        detail.codigo_producto || detail.nombre_producto || "el material seleccionado";
      ui.error(
        `La cantidad ingresada para ${materialLabel} es mayor a la que hay en la bodega.`,
      );
      return false;
    }
  }
  return true;
}

async function saveTransfer() {
  if (orderLoading.value) return;
  if (!validateForm()) return;
  if (!canCreate.value) {
    ui.error("No tienes permisos para registrar transferencias.");
    return;
  }
  saving.value = true;
  try {
    await api.post("/kpi_inventory/transferencias-bodega", {
      orden_compra_id: form.orden_compra_id || undefined,
      bodega_origen_id: effectiveSourceWarehouseId.value,
      bodega_destino_id: form.bodega_destino_id,
      fecha_transferencia: form.fecha_transferencia || undefined,
      observacion: form.observacion || undefined,
      created_by: getUserName(),
      updated_by: getUserName(),
      detalles: form.detalles.map((detail) => ({
        orden_compra_det_id: detail.orden_compra_det_id || undefined,
        producto_id: detail.producto_id,
        cantidad: toNumber(detail.cantidad),
        observacion: detail.observacion || undefined,
      })),
    });
    ui.success("Transferencia registrada correctamente.");
    dialog.value = false;
    await hydrateView();
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo guardar la transferencia.",
    );
  } finally {
    saving.value = false;
  }
}

watch(
  () => form.orden_compra_id,
  (orderId) => {
    void loadSelectedOrder(String(orderId || ""));
  },
);

watch(
  () => effectiveSourceWarehouseId.value,
  () => {
    if (dialog.value && !selectedOrder.value && effectiveSourceWarehouseId.value) {
      void ensureStockRowsLoaded();
    }
    const valid = destinationWarehouseOptions.value.some(
      (item) => String(item.value) === String(form.bodega_destino_id || ""),
    );
    form.bodega_destino_id = valid
      ? String(form.bodega_destino_id)
      : String(destinationWarehouseOptions.value[0]?.value || "");
  },
);

watch(
  () => sriConfigForm.sucursal_id,
  (sucursalId, prev) => {
    if (!sucursalId || sucursalId === prev || !sriConfigDialog.value) return;
    void loadConfigForSucursal(String(sucursalId));
  },
);

watch(
  () => sriConfigForm.ruc,
  (value) => {
    if (!sriConfigDialog.value) return;
    const normalizedRuc = normalizeRuc(value);
    if (normalizedRuc !== value) {
      sriConfigForm.ruc = normalizedRuc;
      return;
    }
    scheduleSriTaxpayerLookup(false);
  },
);

watch(
  () => guideForm.identificacion_destinatario,
  (value) => {
    if (!guideDialog.value) return;
    const normalizedRuc = normalizeRuc(value);
    if (normalizedRuc !== value) {
      guideForm.identificacion_destinatario = normalizedRuc;
      return;
    }
    scheduleGuideRecipientLookup(false);
  },
);

watch(
  () => guideForm.proveedor_identificacion,
  (value) => {
    if (!guideDialog.value || hasGuideSupplierFromOrder.value) return;
    const normalizedRuc = normalizeRuc(value);
    if (normalizedRuc !== value) {
      guideForm.proveedor_identificacion = normalizedRuc;
      return;
    }
    scheduleGuideProviderLookup(false);
  },
);

watch(
  () => [
    guideForm.proveedor_identificacion,
    guideForm.proveedor_razon_social,
    guideForm.proveedor_nombre_comercial,
    guideForm.proveedor_direccion,
  ],
  () => {
    if (!guideDialog.value || hasGuideSupplierFromOrder.value) return;
    syncManualGuideProviderContext();
  },
  { deep: true },
);

watch(
  () => [
    guideForm.razon_social_transportista,
    guideForm.razon_social_destinatario,
    guideForm.identificacion_destinatario,
    guideForm.proveedor_razon_social,
    guideForm.proveedor_identificacion,
  ],
  () => {
    if (!guideDialog.value) return;
    applyGuideTransportInference();
  },
  { deep: true },
);

watch(
  () => guideDialog.value,
  (open, previous) => {
    if (open || !previous) return;
    resetGuideForm();
    resetGuidePreview();
    guideContext.value = {};
    selectedTransfer.value = null;
  },
);

onMounted(async () => {
  if (!canRead.value) return;
  await hydrateView();
});

onBeforeUnmount(() => {
  clearSriTaxpayerLookupTimer();
  clearGuideRecipientLookupTimer();
  clearGuideProviderLookupTimer();
  revokeGuidePreviewUrl();
});
</script>

<style scoped>
.transfer-details-table {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 18px;
}

.details-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.details-table th,
.details-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  vertical-align: top;
}

.details-table th {
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.compact-table {
  min-width: 600px;
}

.quantity-cell {
  min-width: 180px;
}

.available-stock-field {
  min-width: 260px;
}

.guide-preview-loading {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 18px;
  padding: 18px;
  background: rgba(var(--v-theme-surface), 0.75);
}

.guide-preview-card {
  overflow: hidden;
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.guide-preview-frame-wrapper {
  padding: 16px;
}

.guide-preview-frame {
  width: 100%;
  min-height: 720px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 16px;
  background: white;
}
</style>

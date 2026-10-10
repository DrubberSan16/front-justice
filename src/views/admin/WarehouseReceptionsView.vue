<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">No tienes permisos para visualizar este módulo.</v-alert>
  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-4">
      <div>
        <h1 class="text-h6 font-weight-bold">Recepción de bodega</h1>
        <div class="text-body-2 text-medium-emphasis">Revisa los materiales recibidos y aprueba las cantidades que ingresarán a la bodega destino.</div>
      </div>
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadTransfers">Recargar</v-btn>
    </div>
    <v-alert type="info" variant="tonal" class="mb-4">
      Guardar una revisión conserva observaciones y adjuntos. El inventario y el Kardex cambian al aprobar la recepción; lo que no llegó continúa pendiente.
    </v-alert>
    <v-row dense>
      <v-col cols="12" md="4"><v-text-field v-model="search" label="Código u observación" prepend-inner-icon="mdi-magnify" clearable density="compact" variant="outlined" @keyup.enter="applyFilters" /></v-col>
      <v-col cols="12" sm="6" md="4"><v-autocomplete v-model="warehouseId" :items="warehouses" item-title="title" item-value="value" label="Bodega destino" clearable density="compact" variant="outlined" /></v-col>
      <v-col cols="12" sm="6" md="4"><v-select v-model="state" :items="states" label="Estado" clearable density="compact" variant="outlined" /></v-col>
    </v-row>
    <div class="d-flex justify-end mb-3" style="gap: 8px">
      <v-btn variant="text" @click="clearFilters">Limpiar</v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-filter-check" :loading="loading" @click="applyFilters">Aplicar</v-btn>
    </div>
    <v-alert v-if="listError" type="error" variant="tonal" class="mb-3">{{ listError }}</v-alert>
    <v-data-table-server :headers="headers" :items="rows" :items-length="total" :loading="loading" :page="page" :items-per-page="pageSize" loading-text="Obteniendo recepciones de bodega..." no-data-text="No hay transferencias para los filtros seleccionados." class="enterprise-table" @update:options="onTableOptions">
      <template #item.fecha_transferencia="{ item }">{{ formatDateOnly(item.fecha_transferencia, '-') }}</template>
      <template #item.estado="{ item }"><v-chip size="small" :color="transferStateColor(item.estado)" variant="tonal">{{ transferStateLabel(item.estado) }}</v-chip></template>
      <template #item.acciones="{ item }"><v-btn variant="tonal" color="primary" size="small" prepend-icon="mdi-clipboard-check-outline" :aria-label="`Revisar recepción de ${item.codigo}`" @click="openTransfer(item.id)">Ver recepción</v-btn></template>
    </v-data-table-server>
  </v-card>

  <v-dialog :model-value="dialog" :fullscreen="mdAndDown" :max-width="mdAndDown ? undefined : 1480" scrollable persistent>
    <v-card rounded="xl" class="enterprise-dialog">
      <v-card-title class="d-flex justify-space-between align-center flex-wrap pa-5" style="gap: 12px">
        <div class="reception-dialog-heading"><div class="text-h6 font-weight-bold">Recepción · {{ transfer?.codigo || 'Cargando' }}</div><div class="text-body-2 text-medium-emphasis">{{ transfer?.bodega_origen_label || 'Origen' }} → {{ transfer?.bodega_destino_label || 'Destino' }}</div></div>
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar recepción" :disabled="busy" @click="requestClose" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-5">
        <v-progress-linear v-if="detailLoading" indeterminate color="primary" />
        <v-alert v-if="detailError" type="error" variant="tonal" class="mb-4">{{ detailError }}</v-alert>
        <template v-if="transfer && !detailLoading">
          <div class="d-flex flex-wrap align-center mb-4" style="gap: 12px">
            <v-chip :color="transferStateColor(transfer.estado)" variant="tonal">{{ transferStateLabel(transfer.estado) }}</v-chip>
            <span class="text-body-2">Fecha: {{ formatDateOnly(transfer.fecha_transferencia, '-') }}</span>
            <span v-if="transfer.orden_compra_codigo" class="text-body-2">Compra: {{ transfer.orden_compra_codigo }}</span>
            <v-btn variant="text" size="small" :disabled="dirty || busy" :to="{ name: 'transferencias-bodega' }" prepend-icon="mdi-swap-horizontal">Ir a transferencias</v-btn>
          </div>
          <v-alert v-if="transfer.observacion" type="info" variant="tonal" class="mb-4">{{ transfer.observacion }}</v-alert>
          <div v-if="!isReviewing" class="reception-table-scroll mb-5" role="region" aria-label="Cantidades de la transferencia" tabindex="0">
            <v-table class="reception-table transfer-summary-table" density="comfortable">
              <thead><tr><th scope="col" class="material-column">Material</th><th scope="col" class="text-right">Enviado</th><th scope="col" class="text-right">Aprobado</th><th scope="col" class="text-right">Pendiente</th></tr></thead>
              <tbody><tr v-for="detail in transfer.detalles || []" :key="detail.id"><th scope="row" class="material-column"><div class="material-code">{{ detail.codigo_producto }}</div><div class="material-name">{{ detail.nombre_producto }}</div><v-chip size="x-small" variant="tonal" class="mt-1">{{ detail.condicion_material || 'NUEVO' }}</v-chip></th><td class="quantity-cell">{{ quantity(detail.cantidad) }}</td><td class="quantity-cell text-success">{{ quantity(detail.cantidad_recibida ?? (transfer.estado === 'COMPLETADA' ? detail.cantidad : 0)) }}</td><td class="quantity-cell">{{ quantity(detail.cantidad_pendiente ?? (transfer.estado === 'COMPLETADA' ? 0 : receptionNumber(detail.cantidad) - receptionNumber(detail.cantidad_recibida))) }}</td></tr></tbody>
            </v-table>
          </div>
          <template v-if="draft">
            <v-alert type="warning" variant="tonal" class="mb-4">Existe una revisión guardada pendiente de aprobación. Revisa su detalle abajo antes de aprobar. Para corregirla, descártala y registra una nueva revisión.</v-alert>
            <div class="d-flex flex-wrap justify-end mb-5" style="gap: 8px">
              <v-btn v-if="canEdit" color="error" variant="text" :disabled="busy" @click="cancelDialog = true">Descartar revisión</v-btn>
              <v-btn v-if="canApprove" color="primary" prepend-icon="mdi-check-decagram-outline" :disabled="busy || isClosed" @click="approvalDialog = true">Aprobar recepción</v-btn>
            </div>
          </template>
          <template v-else-if="isReviewing">
            <div class="review-toolbar">
              <div><h2 class="text-subtitle-1 font-weight-bold">Nueva revisión de materiales pendientes</h2><p class="text-body-2 text-medium-emphasis mt-1">Marca una opción por fila. Si llegó parcialmente, ajusta la cantidad recibida.</p></div>
              <v-chip :color="reviewedCount === lines.length ? 'success' : 'warning'" variant="tonal" prepend-icon="mdi-clipboard-check-outline">{{ reviewedCount }} de {{ lines.length }} revisados</v-chip>
            </div>
            <div class="review-summary text-body-2">
              <span><strong>{{ lines.length }}</strong> materiales pendientes</span>
              <span><strong>{{ receivedCount }}</strong> recibidos</span>
              <span><strong>{{ notReceivedCount }}</strong> no recibidos</span>
              <span class="text-medium-emphasis">Las cantidades se transferirán al aprobar.</span>
            </div>
            <p v-if="mdAndDown" class="table-scroll-hint text-body-2 text-medium-emphasis"><v-icon size="small" aria-hidden="true">mdi-arrow-left-right</v-icon> Desliza la tabla para ver cantidades, observaciones y adjuntos.</p>
            <div class="reception-table-scroll" role="region" aria-label="Revisión editable de materiales pendientes" tabindex="0">
              <v-table class="reception-table review-table" density="comfortable">
                <caption class="sr-only">Revisa cada material y marca Recibido o No recibido. Puedes ajustar la cantidad recibida, escribir observaciones y adjuntar evidencia en su fila.</caption>
                <thead><tr><th scope="col" class="material-column">Material</th><th scope="col" class="text-right">Enviado</th><th scope="col" class="text-right">Aprobado</th><th scope="col" class="text-right">Pendiente</th><th scope="col" class="text-right received-column">Recibido <span class="column-note">Esta entrega</span></th><th scope="col" class="arrival-column">Recepción <span class="column-note">Marca sí o no</span></th><th scope="col" class="observation-column">Observación</th><th scope="col" class="attachments-column">Adjuntos <span class="column-note">Opcionales</span></th></tr></thead>
                <tbody>
                  <tr v-for="line in lines" :key="line.transferencia_detalle_id" :class="{ 'unreviewed-row': line.llego === null }">
                    <th scope="row" class="material-column"><div class="material-code">{{ line.codigo_producto }}</div><div class="material-name">{{ line.nombre_producto }}</div><v-chip size="x-small" variant="tonal" class="mt-2">{{ line.condicion_material }}</v-chip></th>
                    <td class="quantity-cell">{{ quantity(line.cantidad_enviada) }}</td>
                    <td class="quantity-cell text-success">{{ quantity(line.cantidad_aprobada) }}</td>
                    <td class="quantity-cell pending-quantity">{{ quantity(line.cantidad_pendiente) }}</td>
                    <td class="received-column"><v-text-field v-model="line.cantidad_recibida" label="Cantidad" :aria-label="`Cantidad recibida: ${line.codigo_producto || line.nombre_producto}`" type="number" inputmode="decimal" min="0" :max="line.cantidad_pendiente" step="any" variant="outlined" density="compact" hide-details="auto" class="quantity-field" :disabled="line.llego !== true || busy" :rules="line.llego ? [value => validQuantity(value, line.cantidad_pendiente)] : []" /></td>
                    <td class="arrival-column"><div class="arrival-options" role="group" :aria-label="`Resultado de recepción: ${line.codigo_producto || line.nombre_producto}`"><v-checkbox :model-value="line.llego === true" label="Recibido" :aria-label="`Recibido: ${line.codigo_producto || line.nombre_producto}`" color="success" density="compact" hide-details :disabled="busy" @update:model-value="value => setArrival(line, value ? true : null)" /><v-checkbox :model-value="line.llego === false" label="No recibido" :aria-label="`No recibido: ${line.codigo_producto || line.nombre_producto}`" color="warning" density="compact" hide-details :disabled="busy" @update:model-value="value => setArrival(line, value ? false : null)" /></div><div v-if="line.llego === null" class="arrival-hint text-medium-emphasis">Sin revisar</div></td>
                    <td class="observation-column"><v-textarea v-model="line.observacion" label="Observación" :aria-label="`Observación: ${line.codigo_producto || line.nombre_producto}`" rows="1" auto-grow max-rows="3" variant="outlined" density="compact" hide-details :disabled="busy" maxlength="2000" /></td>
                    <td class="attachments-column"><v-file-input :key="`${line.transferencia_detalle_id}-${fileInputVersion}`" label="Adjuntar" :aria-label="`Adjuntar evidencia: ${line.codigo_producto || line.nombre_producto}`" accept="application/pdf,image/jpeg,image/png" multiple show-size variant="outlined" density="compact" hide-details :disabled="busy || fileReading" @update:model-value="files => addFiles(line, files)" /><div v-if="line.adjuntos.length" class="attachment-list mt-2"><v-chip v-for="(file, index) in line.adjuntos" :key="`${file.nombre}-${index}`" size="small" variant="tonal" closable class="attachment-chip" :title="file.nombre" :disabled="busy || fileReading" :aria-label="`Quitar adjunto ${file.nombre}`" @click:close="removeFile(line, index)"><span class="attachment-name">{{ file.nombre }}</span></v-chip></div></td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <p class="text-body-2 text-medium-emphasis mt-3">Adjuntos: hasta 5 PDF, JPG o PNG por material; 5 MB por archivo y 20 MB en total. Lo no recibido conserva su reserva.</p>
            <v-textarea v-model="observation" label="Observación general de la recepción" rows="2" variant="outlined" density="compact" hide-details :disabled="busy" maxlength="2000" class="mt-4 mb-4" />
            <v-alert v-if="formError" type="error" variant="tonal" class="mb-4">{{ formError }}</v-alert>
          </template>
          <v-alert v-else-if="!isClosed && !canCreate" type="info" variant="tonal" class="mb-4">Puedes consultar el historial. El registro de una recepción requiere permiso de creación.</v-alert>

          <h2 class="text-subtitle-1 font-weight-bold mt-5 mb-3">Historial de recepciones</h2>
          <v-alert v-if="!receipts.length" type="info" variant="tonal">Todavía no se ha registrado una recepción de esta transferencia.</v-alert>
          <v-expansion-panels v-else variant="accordion" :model-value="draft ? 0 : undefined">
            <v-expansion-panel v-for="receipt in receipts" :key="receipt.id">
              <v-expansion-panel-title><div class="d-flex flex-wrap align-center" style="gap: 12px"><v-chip size="small" :color="transferStateColor(receipt.estado)" variant="tonal">{{ transferStateLabel(receipt.estado) }}</v-chip><span>{{ formatDateTime(receipt.created_at, '-') }} · {{ receipt.created_by || 'Usuario' }}</span></div></v-expansion-panel-title>
              <v-expansion-panel-text>
                <p v-if="receipt.observacion" class="mb-3">{{ receipt.observacion }}</p>
                <p v-if="receipt.estado === 'APROBADA'" class="text-body-2 mb-3">Aprobada por {{ receipt.aprobado_por || 'Usuario' }} · {{ formatDateTime(receipt.aprobado_at, '-') }}</p>
                <div class="reception-table-scroll" role="region" :aria-label="`Materiales de la revisión ${formatDateTime(receipt.created_at, '-')}`" tabindex="0">
                  <v-table class="reception-table history-table" density="comfortable">
                    <thead><tr><th scope="col" class="material-column">Material</th><th scope="col" class="text-right">Enviado</th><th scope="col" class="text-right">Recibido <span class="column-note">Esta revisión</span></th><th scope="col">Resultado</th><th scope="col" class="observation-column">Observación</th><th scope="col" class="attachments-column">Adjuntos</th></tr></thead>
                    <tbody><tr v-for="detail in receipt.detalles || []" :key="detail.id"><th scope="row" class="material-column"><div class="material-code">{{ receiptTransferDetail(detail.transferencia_detalle_id).codigo_producto }}</div><div class="material-name">{{ receiptTransferDetail(detail.transferencia_detalle_id).nombre_producto || 'Material de la transferencia' }}</div><v-chip size="x-small" variant="tonal" class="mt-1">{{ receiptTransferDetail(detail.transferencia_detalle_id).condicion_material || 'NUEVO' }}</v-chip></th><td class="quantity-cell">{{ quantity(receiptTransferDetail(detail.transferencia_detalle_id).cantidad) }}</td><td class="quantity-cell">{{ quantity(detail.cantidad_recibida) }}</td><td><v-chip size="small" :color="detail.llego ? 'success' : 'warning'" variant="tonal" :prepend-icon="detail.llego ? 'mdi-check' : 'mdi-close'">{{ detail.llego ? 'Recibido' : 'No recibido' }}</v-chip></td><td class="history-observation">{{ detail.observacion || '—' }}</td><td><div v-if="detail.adjuntos?.length" class="attachment-list"><v-btn v-for="file in detail.adjuntos" :key="file.id" size="small" variant="tonal" prepend-icon="mdi-paperclip" class="history-attachment" :title="file.nombre" :aria-label="`Descargar adjunto ${file.nombre}`" :loading="downloadingId === file.id" @click="downloadFile(receipt, file)"><span class="attachment-name">{{ file.nombre }}</span></v-btn></div><span v-else class="text-medium-emphasis">—</span></td></tr></tbody>
                  </v-table>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4 justify-end flex-wrap" style="gap: 8px"><v-btn variant="text" :disabled="busy" @click="requestClose">Cerrar</v-btn><v-btn v-if="transfer && !draft && !isClosed && canCreate && lines.length" color="primary" prepend-icon="mdi-content-save-outline" :loading="saving" :disabled="busy || fileReading" @click="saveReview">Guardar revisión</v-btn></v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="approvalDialog" max-width="540" persistent><v-card rounded="xl"><v-card-title class="pa-5">Aprobar recepción</v-card-title><v-card-text>
    Se transferirán las cantidades recibidas de esta revisión al destino y se generarán sus movimientos de inventario y Kardex. Los materiales que no llegaron permanecerán pendientes.
    <v-alert v-if="draftQuantity === 0" type="info" variant="tonal" class="mt-3">Todos los materiales están marcados como no recibidos. Se conservará la evidencia sin mover inventario.</v-alert>
    <div class="text-subtitle-2 mt-4">Cantidad a aprobar: {{ quantity(draftQuantity) }}</div>
  </v-card-text><v-card-actions class="pa-4 justify-end"><v-btn variant="text" :disabled="approving" @click="approvalDialog = false">Volver</v-btn><v-btn color="primary" :loading="approving" @click="approveReview">Confirmar aprobación</v-btn></v-card-actions></v-card></v-dialog>
  <v-dialog v-model="cancelDialog" max-width="500" persistent><v-card rounded="xl"><v-card-title class="pa-5">Descartar revisión</v-card-title><v-card-text>Esta revisión quedará en el historial como descartada. La transferencia y la reserva siguen pendientes; podrás registrar una nueva revisión con los datos correctos.</v-card-text><v-card-actions class="pa-4 justify-end"><v-btn variant="text" :disabled="cancelling" @click="cancelDialog = false">Volver</v-btn><v-btn color="error" :loading="cancelling" @click="cancelReview">Descartar revisión</v-btn></v-card-actions></v-card></v-dialog>
  <v-dialog v-model="leaveDialog" max-width="480"><v-card rounded="xl"><v-card-title class="pa-5">Cerrar sin guardar</v-card-title><v-card-text>Los cambios de esta revisión todavía no están guardados.</v-card-text><v-card-actions class="pa-4 justify-end"><v-btn variant="text" @click="leaveDialog = false">Seguir revisando</v-btn><v-btn color="error" variant="tonal" @click="closeTransfer">Cerrar sin guardar</v-btn></v-card-actions></v-card></v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import { api } from "@/app/http/api";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { getPermissionsForComponent } from "@/app/utils/menu-permissions";
import { fetchPaginatedResource } from "@/app/utils/paginated-resource";
import { listAllPages } from "@/app/utils/list-all-pages";
import { formatDateOnly, formatDateTime } from "@/app/utils/date-time";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { makeReceptionLines, receptionNumber, receptionPayload, validateReception, transferStateLabel, transferStateColor, RECEPTION_FILE_LIMIT, RECEPTION_TOTAL_FILE_LIMIT, RECEPTION_FILES_PER_MATERIAL, RECEPTION_MIME_TYPES, type ReceptionLine } from "@/app/utils/warehouse-reception";

const endpoint = "/kpi_inventory/transferencias-bodega";
const menu = useMenuStore();
const ui = useUiStore();
const route = useRoute();
const { mdAndDown } = useDisplay();
const permissions = computed(() => getPermissionsForComponent(menu.tree, "recepciones-bodega"));
const canRead = computed(() => permissions.value.isReaded);
const canCreate = computed(() => permissions.value.isCreated);
const canEdit = computed(() => permissions.value.isEdited);
const canApprove = canEdit;
const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const search = ref("");
const warehouseId = ref("");
const state = ref("");
const warehouses = ref<{ value: string; title: string }[]>([]);
const loading = ref(false);
const listError = ref("");
const dialog = ref(false);
const detailLoading = ref(false);
const detailError = ref("");
const transfer = ref<any>(null);
const lines = ref<ReceptionLine[]>([]);
const observation = ref("");
const formError = ref("");
const saving = ref(false);
const approving = ref(false);
const cancelling = ref(false);
const fileReading = ref(false);
const approvalDialog = ref(false);
const cancelDialog = ref(false);
const leaveDialog = ref(false);
const downloadingId = ref("");
const fileInputVersion = ref(0);
let idempotencyKey = "";
let listRequest = 0;
let detailRequest = 0;
const busy = computed(() => saving.value || approving.value || cancelling.value || detailLoading.value);
const receipts = computed<any[]>(() => [...(transfer.value?.recepciones ?? [])].sort((a, b) => (a.estado === 'BORRADOR' ? -1 : b.estado === 'BORRADOR' ? 1 : String(b.created_at).localeCompare(String(a.created_at)))));
const draft = computed(() => receipts.value.find(receipt => receipt.estado === "BORRADOR"));
const draftQuantity = computed(() => (draft.value?.detalles ?? []).reduce((sum: number, detail: any) => sum + receptionNumber(detail.cantidad_recibida), 0));
const isClosed = computed(() => ["COMPLETADA", "ANULADA"].includes(String(transfer.value?.estado).toUpperCase()));
const isReviewing = computed(() => !draft.value && !isClosed.value && canCreate.value && lines.value.length > 0);
const reviewedCount = computed(() => lines.value.filter(line => line.llego !== null).length);
const receivedCount = computed(() => lines.value.filter(line => line.llego === true).length);
const notReceivedCount = computed(() => lines.value.filter(line => line.llego === false).length);
const dirty = computed(() => Boolean(observation.value.trim()) || lines.value.some(line => line.llego !== null || line.observacion.trim() || line.adjuntos.length));
const states = [{ title: "Pendientes y parciales", value: "" }, { title: "Pendiente de recepción", value: "PENDIENTE_RECEPCION" }, { title: "Recepción parcial", value: "PARCIALMENTE_RECIBIDA" }, { title: "Completada", value: "COMPLETADA" }];
const headers = [{ title: "Transferencia", key: "codigo" }, { title: "Fecha", key: "fecha_transferencia" }, { title: "Origen", key: "bodega_origen_label" }, { title: "Destino", key: "bodega_destino_label" }, { title: "Estado", key: "estado" }, { title: "Recepción", key: "acciones", sortable: false }];
const quantity = (value: unknown) => formatNumberForDisplay(receptionNumber(value));
function errorMessage(error: any, fallback: string) { const message = error?.response?.data?.message || error?.message; return Array.isArray(message) ? message.join(". ") : String(message || fallback); }
function validQuantity(value: unknown, pending: number) { return String(value ?? "").trim() && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= pending ? true : `Ingresa una cantidad mayor a cero y hasta ${quantity(pending)}.`; }
function setArrival(line: ReceptionLine, value: boolean | null) { line.llego = value; line.cantidad_recibida = value ? String(line.cantidad_pendiente) : "0"; }

async function loadTransfers() {
  if (!canRead.value) return;
  const request = ++listRequest;
  loading.value = true; listError.value = "";
  try {
    const result = await fetchPaginatedResource(`${endpoint}/recepciones`, { search: search.value.trim() || undefined, bodega_destino_id: warehouseId.value || undefined, estado: state.value || undefined }, { page: page.value, limit: pageSize.value });
    if (request !== listRequest) return;
    rows.value = result.data; total.value = result.pagination.total;
  } catch (error) { if (request === listRequest) { rows.value = []; total.value = 0; listError.value = errorMessage(error, "No se pudo cargar la bandeja de recepción."); } }
  finally { if (request === listRequest) loading.value = false; }
}
function applyFilters() { page.value = 1; void loadTransfers(); }
function clearFilters() { search.value = ""; warehouseId.value = ""; state.value = ""; applyFilters(); }
function onTableOptions(options: any) { const changed = page.value !== options.page || pageSize.value !== options.itemsPerPage; page.value = options.page; pageSize.value = options.itemsPerPage > 0 ? options.itemsPerPage : 100; if (changed) void loadTransfers(); }

async function openTransfer(id: string) {
  if (!canRead.value) return;
  const request = ++detailRequest;
  dialog.value = true; detailLoading.value = true; detailError.value = ""; transfer.value = null;
  lines.value = []; observation.value = ""; formError.value = ""; idempotencyKey = crypto.randomUUID();
  try {
    const { data } = await api.get(`${endpoint}/${encodeURIComponent(id)}`);
    if (request !== detailRequest) return;
    transfer.value = data;
    lines.value = makeReceptionLines(data.detalles ?? []);
  } catch (error) { if (request === detailRequest) detailError.value = errorMessage(error, "No se pudo cargar la transferencia."); }
  finally { if (request === detailRequest) detailLoading.value = false; }
}
function requestClose() { if (busy.value || fileReading.value) return; if (!draft.value && dirty.value) leaveDialog.value = true; else closeTransfer(); }
function closeTransfer() { ++detailRequest; dialog.value = false; leaveDialog.value = false; transfer.value = null; lines.value = []; observation.value = ""; }

async function saveReview() {
  if (busy.value || fileReading.value || !canCreate.value || !transfer.value || draft.value) return;
  formError.value = validateReception(lines.value);
  if (formError.value) return;
  saving.value = true;
  const id = transfer.value.id;
  try {
    await api.post(`${endpoint}/${id}/recepciones`, receptionPayload(lines.value, idempotencyKey, observation.value), { timeout: 120_000 });
    ui.success("Revisión guardada. El inventario se actualizará cuando apruebes la recepción.");
    await openTransfer(id); await loadTransfers();
  } catch (error) { formError.value = errorMessage(error, "No se pudo guardar la revisión."); }
  finally { saving.value = false; }
}
async function approveReview() {
  if (busy.value || !canApprove.value || !draft.value || !transfer.value) return;
  approving.value = true; const id = transfer.value.id; const receiptId = draft.value.id;
  try {
    await api.patch(`${endpoint}/${id}/recepciones/${receiptId}/aprobar`, {}, { timeout: 120_000 });
    approvalDialog.value = false; ui.success("Recepción aprobada. Solo las cantidades recibidas fueron transferidas.");
    await openTransfer(id); await loadTransfers();
  } catch (error) { approvalDialog.value = false; detailError.value = errorMessage(error, "No se pudo aprobar la recepción."); }
  finally { approving.value = false; }
}
async function cancelReview() {
  if (busy.value || !canEdit.value || !draft.value || !transfer.value) return;
  cancelling.value = true; const id = transfer.value.id;
  try {
    await api.patch(`${endpoint}/${id}/recepciones/${draft.value.id}/cancelar`);
    cancelDialog.value = false; ui.success("Revisión descartada. Puedes registrar una nueva recepción."); await openTransfer(id);
  } catch (error) { cancelDialog.value = false; detailError.value = errorMessage(error, "No se pudo descartar la revisión."); }
  finally { cancelling.value = false; }
}
function receiptTransferDetail(detailId: string) { return transfer.value?.detalles?.find((item: any) => item.id === detailId) ?? {}; }
async function addFiles(line: ReceptionLine, selected: File | File[] | null) {
  const files = Array.isArray(selected) ? selected : selected ? [selected] : [];
  if (!files.length || fileReading.value || busy.value) return;
  fileReading.value = true; formError.value = "";
  try {
    if (line.adjuntos.length + files.length > RECEPTION_FILES_PER_MATERIAL) throw new Error("Puedes adjuntar hasta cinco archivos por material.");
    const currentBytes = lines.value.reduce((sum, item) => sum + item.adjuntos.reduce((bytes, file) => bytes + file.tamano, 0), 0);
    if (currentBytes + files.reduce((sum, file) => sum + file.size, 0) > RECEPTION_TOTAL_FILE_LIMIT) throw new Error("Los adjuntos de la recepción no pueden superar 20 MB en total.");
    for (const file of files) {
      if (!RECEPTION_MIME_TYPES.includes(file.type) || file.size > RECEPTION_FILE_LIMIT || file.size === 0) throw new Error(`${file.name}: utiliza PDF, JPG o PNG de hasta 5 MB.`);
      if (file.name.length > 200) throw new Error("El nombre de cada adjunto debe tener hasta 200 caracteres.");
    }
    const attachments = await Promise.all(files.map(async file => {
      const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`)); reader.readAsDataURL(file); });
      return { nombre: file.name, mime_type: file.type, contenido_base64: encoded, tamano: file.size };
    }));
    line.adjuntos.push(...attachments);
  } catch (error) { formError.value = errorMessage(error, "No se pudo leer el adjunto."); ui.error(formError.value); }
  finally { fileReading.value = false; fileInputVersion.value += 1; }
}
function removeFile(line: ReceptionLine, index: number) { line.adjuntos.splice(index, 1); }
async function downloadFile(receipt: any, file: any) {
  if (!transfer.value || downloadingId.value) return;
  downloadingId.value = file.id;
  try { const { data } = await api.get(`${endpoint}/${transfer.value.id}/recepciones/${receipt.id}/adjuntos/${file.id}`, { responseType: "blob" }); const url = URL.createObjectURL(data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.nombre || "adjunto"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  catch (error) { ui.error(errorMessage(error, "No se pudo descargar el adjunto.")); }
  finally { downloadingId.value = ""; }
}
onMounted(async () => {
  if (!canRead.value) return;
  const results = await Promise.allSettled([loadTransfers(), listAllPages("/kpi_inventory/bodegas")]);
  const catalog = results[1];
  if (catalog?.status === "fulfilled") warehouses.value = catalog.value.map((item: any) => ({ value: String(item.id), title: item.nombre || item.codigo || item.id }));
  if (route.query.transferencia) await openTransfer(String(route.query.transferencia));
});
</script>

<style scoped>
.responsive-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.reception-dialog-heading { flex: 1; min-width: 0; white-space: normal; overflow-wrap: anywhere; }
.review-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.review-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 24px; padding: 12px 16px; margin-bottom: 16px; border-radius: 8px; background: rgba(var(--v-theme-primary), 0.05); }
.table-scroll-hint { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.reception-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 10px; scroll-padding-inline-start: 248px; }
.reception-table-scroll:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 3px; }
.reception-table :deep(.v-table__wrapper) { overflow: visible; }
.reception-table :deep(table) { table-layout: fixed; border-collapse: separate; border-spacing: 0; }
.review-table :deep(table) { min-width: 1280px; }
.transfer-summary-table :deep(table) { min-width: 560px; }
.history-table :deep(table) { min-width: 980px; }
.reception-table :deep(thead th) { height: 60px; background: rgb(var(--v-theme-surface-variant)); color: rgb(var(--v-theme-on-surface-variant)); font-size: 0.8125rem; font-weight: 700; white-space: nowrap; border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.reception-table :deep(tbody th), .reception-table :deep(tbody td) { padding: 14px 12px; vertical-align: top; border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); background: rgb(var(--v-theme-surface)); }
.reception-table :deep(tbody tr:nth-child(even) > *) { background: color-mix(in srgb, rgb(var(--v-theme-primary)) 3%, rgb(var(--v-theme-surface))); }
.reception-table :deep(tbody tr:hover > *) { background: color-mix(in srgb, rgb(var(--v-theme-primary)) 7%, rgb(var(--v-theme-surface))); }
.reception-table :deep(tbody tr:last-child > *) { border-bottom: 0; }
.reception-table :deep(.material-column) { position: sticky; left: 0; z-index: 1; width: 236px; min-width: 236px; text-align: left; border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.reception-table :deep(thead .material-column) { z-index: 2; }
.material-code { font-size: 0.75rem; font-weight: 500; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); overflow-wrap: anywhere; }
.material-name { font-size: 0.875rem; font-weight: 600; line-height: 1.4; margin-top: 3px; overflow-wrap: anywhere; }
.quantity-cell { text-align: right; font-size: 0.875rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.reception-table :deep(.quantity-cell) { padding-top: 22px; }
.pending-quantity { font-weight: 700; }
.reception-table :deep(.received-column) { width: 132px; }
.reception-table :deep(.arrival-column) { width: 180px; }
.reception-table :deep(.observation-column) { width: 220px; }
.reception-table :deep(.attachments-column) { width: 206px; }
.column-note { display: block; font-size: 0.75rem; font-weight: 400; margin-top: 2px; }
.quantity-field :deep(input) { text-align: right; font-variant-numeric: tabular-nums; }
.quantity-field :deep(.v-field__input) { padding-inline: 10px; }
.arrival-options { display: flex; flex-direction: column; }
.arrival-options :deep(.v-selection-control) { min-height: 36px; }
.arrival-options :deep(.v-label) { font-size: 0.8125rem; opacity: 1; }
.arrival-hint { font-size: 0.75rem; margin-left: 36px; }
.unreviewed-row .material-column { box-shadow: inset 3px 0 0 rgba(var(--v-theme-warning), 0.65); }
.attachment-list { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 6px; }
.attachment-chip, .history-attachment { max-width: 100%; }
.attachment-chip :deep(.v-chip__content), .history-attachment :deep(.v-btn__content) { min-width: 0; }
.attachment-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-observation { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.875rem; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 600px) {
  .reception-table :deep(.material-column) { width: 140px; min-width: 140px; }
  .reception-table :deep(.observation-column), .reception-table :deep(.attachments-column) { width: 180px; }
  .reception-table-scroll { scroll-padding-inline-start: 152px; }
  .review-summary { gap: 8px 16px; padding: 10px 12px; }
}
</style>

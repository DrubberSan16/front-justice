<template>
  <v-dialog
    :model-value="modelValue"
    max-width="960"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="xl" class="enterprise-surface">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap" style="gap:12px">
        <div>
          <div class="text-h6 font-weight-bold">
            Orden {{ header.code || header.codigo || "-" }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ header.title || header.titulo || "Sin título" }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="comfortable"
          aria-label="Cerrar detalle de la orden"
          @click="emit('update:modelValue', false)"
        />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-5">
        <div v-if="loading" class="d-flex align-center justify-center pa-8" style="gap:12px">
          <v-progress-circular indeterminate color="primary" />
          <span>Cargando la orden...</span>
        </div>
        <v-alert v-else-if="error" type="warning" variant="tonal" rounded="xl" :text="error" />
        <template v-else>
          <div class="wo-facts">
            <article v-for="fact in facts" :key="fact.label">
              <span>{{ fact.label }}</span>
              <strong>{{ fact.value }}</strong>
            </article>
          </div>

          <div v-if="responsables.length" class="wo-block">
            <h4>Responsables</h4>
            <div v-for="row in responsables" :key="row.label" class="wo-line">
              <span>{{ row.label }}</span>
              <strong>{{ formatNumber(row.hours) }} h</strong>
            </div>
          </div>

          <div v-if="materiales.length" class="wo-block">
            <h4>Materiales</h4>
            <div v-for="row in materiales" :key="row.label" class="wo-line wo-line--material">
              <span>{{ row.label }}</span>
              <span>Entregado: <strong>{{ formatNumber(row.delivered) }}</strong></span>
              <span>Condición: <strong>{{ conditionLabel(row) }}</strong></span>
              <span>A chatarra: <strong>{{ formatNumber(row.scrapped) }}</strong></span>
            </div>
          </div>

          <p v-if="!responsables.length && !materiales.length" class="text-medium-emphasis">
            La orden todavía no registra horas ni materiales.
          </p>
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions class="px-5 py-4 d-flex justify-end flex-wrap" style="gap:12px">
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cerrar</v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-file-pdf-box"
          :disabled="loading || !header.code"
          @click="previewPdf"
        >
          Previsualizar PDF
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <PdfPreviewDialog
    :state="pdfPreview.state"
    :url="pdfPreview.url.value"
    @close="pdfPreview.close"
    @download="pdfPreview.download"
    @print="pdfPreview.openInNewTab"
    @update:visible="pdfPreview.handleVisibility"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useAuthStore } from "@/app/stores/auth.store";
import { buildEquipmentDisplayTitle } from "@/app/utils/equipment-display";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { formatDateTime } from "@/app/utils/date-time";
import { usePdfPreview } from "@/app/utils/pdf-preview";
import { canViewMaterialCosts } from "@/app/utils/role-access";
import {
  buildMaterialSummary,
  buildResponsibleHours,
  buildWorkOrderReportPayload,
  fetchWorkOrderDetail,
  materialConditionLabel,
  type WorkOrderDetailPayload,
} from "@/app/utils/work-order-detail";
import {
  buildWorkOrderReportPdfBlob,
  workOrderReportFileName,
} from "@/app/utils/work-order-report-documents";
import PdfPreviewDialog from "@/components/ui/PdfPreviewDialog.vue";
import { formatCurrencyForDisplay, formatNumberForDisplay } from "@/app/utils/number-format";

/**
 * Detalle de una orden de trabajo, para abrirlo desde cualquier tablero.
 *
 * Los tableros listaban ordenes sin dejar abrirlas: para ver que se hizo habia
 * que salir del tablero, entrar a Ordenes de trabajo y buscar el codigo. Aqui
 * se muestra lo esencial -- equipo, estado, fechas, horometro, horas y
 * materiales -- y desde el mismo sitio se previsualiza el informe completo.
 */
const props = defineProps<{ modelValue: boolean; workOrderId: string | null }>();
const emit = defineEmits<{ (event: "update:modelValue", value: boolean): void }>();

const auth = useAuthStore();
const pdfPreview = usePdfPreview({ title: "Informe de la orden de trabajo" });

const loading = ref(false);
const error = ref("");
const detail = ref<WorkOrderDetailPayload>({
  header: null,
  tasks: [],
  consumptions: [],
  issues: [],
  scraps: [],
  history: [],
});

const showCosts = computed(() => canViewMaterialCosts(auth.user));
const header = computed<Record<string, any>>(() => detail.value.header ?? {});
const responsables = computed(() => buildResponsibleHours(detail.value.tasks));
const materiales = computed(() =>
  buildMaterialSummary(detail.value.issues, detail.value.scraps, materialLabel),
);

const facts = computed(() => {
  const row = header.value;
  const base = [
    { label: "Equipo", value: equipmentLabel.value },
    { label: "Estado", value: statusLabel.value },
    { label: "Tipo", value: maintenanceKindLabel.value },
    { label: "Inicio", value: formatDate(row?.hora_inicio || row?.created_at) },
    { label: "Cierre", value: formatDate(row?.hora_fin || row?.closed_at) },
    {
      label: "Horómetro",
      value: [row?.horometro_anterior, row?.horometro_actual]
        .map((value) => (value == null || value === "" ? "-" : String(value)))
        .join("  →  "),
    },
    {
      label: "Horas registradas",
      value: `${formatNumber(
        responsables.value.reduce((sum, item) => sum + item.hours, 0),
      )} h`,
    },
    { label: "Creada por", value: String(row?.created_by || "-") },
  ];
  if (!showCosts.value) return base;
  return [
    ...base,
    { label: "Costo de materiales", value: formatCurrency(totalMaterialCost.value) },
  ];
});

const totalMaterialCost = computed(() =>
  detail.value.issues
    .flatMap((row: any) => (Array.isArray(row?.items) ? row.items : [row]))
    .reduce(
      (sum: number, row: any) =>
        sum + Number(row?.costo_unitario || 0) * Number(row?.cantidad || 0),
      0,
    ),
);

const equipmentLabel = computed(() => {
  const row = header.value;
  return (
    buildEquipmentDisplayTitle({
      codigo: row?.equipment_codigo,
      nombre: row?.equipment_label || row?.equipment_name,
      nombre_real: row?.equipment_nombre_real,
      modelo: row?.equipment_modelo,
    }) ||
    String(row?.equipment_label || row?.equipment_name || "Sin equipo")
  );
});

const statusLabel = computed(() =>
  String(header.value?.status_workflow_label || header.value?.status_workflow || "-"),
);

const maintenanceKindLabel = computed(() =>
  String(header.value?.maintenance_kind_label || header.value?.maintenance_kind || "-"),
);

function materialLabel(row: Record<string, any>) {
  return (
    buildProductDisplayTitle({
      codigo: row?.producto_codigo,
      nombre: row?.producto_nombre,
      descripcion: row?.producto_descripcion,
    }) ||
    String(row?.producto_label || row?.producto_nombre || row?.producto_id || "Material")
  );
}

function conditionLabel(row: { deliveredNuevo: number; deliveredUsado: number }) {
  return materialConditionLabel(row);
}

function formatNumber(value: unknown) {
  return formatNumberForDisplay(Number(value ?? 0));
}

function formatCurrency(value: unknown) {
  return formatCurrencyForDisplay(value);
}

function formatDate(value: unknown) {
  return formatDateTime(value, "-");
}

async function load(workOrderId: string) {
  loading.value = true;
  error.value = "";
  try {
    detail.value = await fetchWorkOrderDetail(workOrderId);
    if (!detail.value.header) {
      error.value = "No se encontró la orden de trabajo.";
    }
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo cargar el detalle de la orden.";
  } finally {
    loading.value = false;
  }
}

async function previewPdf() {
  const payload = buildWorkOrderReportPayload(detail.value, {
    equipmentLabel: equipmentLabel.value,
    statusLabel: statusLabel.value,
    maintenanceKindLabel: maintenanceKindLabel.value,
    materialLabel,
    formatDate,
    formatCurrency,
    showCosts: showCosts.value,
  });
  await pdfPreview.open({
    title: `Orden ${payload.code}`,
    subtitle: payload.title,
    fileName: workOrderReportFileName(payload),
    build: () => buildWorkOrderReportPdfBlob(payload),
  });
}

watch(
  () => [props.modelValue, props.workOrderId] as const,
  ([open, workOrderId]) => {
    if (!open || !workOrderId) return;
    void load(String(workOrderId));
  },
  { immediate: true },
);
</script>

<style scoped>
.wo-facts {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-bottom: 20px;
}

.wo-facts article {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.wo-facts span {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.wo-facts strong {
  font-size: 0.98rem;
  overflow-wrap: anywhere;
}

.wo-block {
  margin-top: 18px;
}

.wo-block h4 {
  margin: 0 0 8px;
  font-size: 0.98rem;
}

.wo-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 0.92rem;
}

.wo-line--material {
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 18px;
}

.wo-line--material > span:first-child {
  flex: 1 1 240px;
  font-weight: 600;
}
</style>

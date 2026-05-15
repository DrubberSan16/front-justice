<template>
  <div class="system-reports-page">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar este mÃ³dulo.
    </v-alert>

    <v-alert v-else-if="!canAccessSystemReports" type="warning" variant="tonal">
      No tienes permisos para acceder a este reporte.
    </v-alert>

    <template v-else>
      <v-card rounded="xl" class="pa-5 enterprise-surface hero-card">
        <div class="d-flex align-center justify-space-between hero-wrap">
          <div>
            <div class="text-h6 font-weight-bold">Reportes del sistema</div>
            <div class="text-body-2 text-medium-emphasis">
              Consolida horas trabajadas, costos de mantenimiento, responsables, stock valorizado e inventario consumido en una sola vista.
            </div>
          </div>
          <div class="d-flex align-center hero-actions">
            <v-chip label color="primary" variant="tonal">
              {{ generatedAtLabel }}
            </v-chip>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-file-excel"
              :loading="isExporting('excel')"
              :disabled="!reportPayload"
              @click="exportReports('excel')"
            >
              Excel
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-file-pdf-box"
              :loading="isExporting('pdf')"
              :disabled="!reportPayload"
              @click="exportReports('pdf')"
            >
              PDF
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadReports">
              Actualizar
            </v-btn>
          </div>
        </div>

        <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

        <v-row dense class="mt-4">
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.from"
              type="date"
              label="Desde"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.to"
              type="date"
              label="Hasta"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.bodega_id"
              :items="warehouseOptions"
              item-title="label"
              item-value="id"
              label="Bodega"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.equipment_id"
              :items="equipmentOptions"
              item-title="label"
              item-value="id"
              label="Equipo"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.group_by"
              :items="groupOptions"
              item-title="title"
              item-value="value"
              label="Agrupar por"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
        </v-row>

        <div class="d-flex align-center filter-actions mt-4">
          <v-btn color="primary" prepend-icon="mdi-filter-outline" :loading="loading" @click="loadReports">
            Aplicar filtros
          </v-btn>
          <v-btn variant="text" @click="clearFilters">
            Limpiar
          </v-btn>
        </div>
      </v-card>

      <v-row dense class="mt-2">
        <v-col v-for="card in summaryCards" :key="card.label" cols="12" sm="6" xl="2">
          <v-card rounded="lg" variant="outlined" class="pa-4 summary-card h-100">
            <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
            <div class="text-h5 font-weight-bold mt-2">{{ card.valueLabel }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-card rounded="xl" class="pa-5 enterprise-surface mt-4">
        <LoadingTableState
          v-if="loading"
          message="Generando reportes del sistema..."
          :rows="6"
          :columns="6"
        />

        <template v-else>
          <v-tabs v-model="activeTab" color="primary" class="system-tabs">
            <v-tab v-for="section in reportSections" :key="section.key" :value="section.key">
              {{ section.title }} ({{ section.rawRows.length }})
            </v-tab>
          </v-tabs>

          <v-window v-model="activeTab" class="mt-4">
            <v-window-item v-for="section in reportSections" :key="section.key" :value="section.key">
              <div class="d-flex align-center justify-space-between section-head">
                <div>
                  <div class="text-subtitle-1 font-weight-bold">{{ section.title }}</div>
                  <div class="text-body-2 text-medium-emphasis">{{ section.subtitle }}</div>
                </div>
                <v-chip label color="secondary" variant="tonal">
                  {{ section.groupLabel }}
                </v-chip>
              </div>

              <v-alert
                v-if="!section.rawRows.length"
                type="info"
                variant="tonal"
                class="mt-4"
              >
                No hay datos para este reporte con los filtros actuales.
              </v-alert>

              <v-data-table
                v-else
                :headers="section.headers"
                :items="section.displayRows"
                density="compact"
                :items-per-page="10"
                class="table-enterprise enterprise-table mt-4"
              >
                <template #item.responsables="{ item }">
                  <div class="responsibles-inline-table">
                    <template v-if="getReportResponsablesLines(resolveDataTableRow(item)).length">
                      <div
                        v-for="(line, index) in getReportResponsablesLines(resolveDataTableRow(item))"
                        :key="`${resolveDataTableRow(item).work_order_code || 'row'}-${index}`"
                        class="responsibles-inline-row"
                      >
                        {{ line }}
                      </div>
                    </template>
                    <span v-else>
                      {{ resolveDataTableRow(item).responsables || "" }}
                    </span>
                  </div>
                </template>
              </v-data-table>
            </v-window-item>
          </v-window>
        </template>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import LoadingTableState from "@/components/ui/LoadingTableState.vue";
import { hasReportAccess } from "@/app/config/report-access";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { listAllPages } from "@/app/utils/list-all-pages";
import { DEFAULT_CONTEXT_CACHE_TTL_MS } from "@/app/utils/request-cache";
import {
  currentDateInputValue,
  formatDateForInput,
  formatDateTime,
} from "@/app/utils/date-time";
import {
  buildSystemReportsReport,
  downloadReportExcel,
  downloadReportPdf,
} from "@/app/utils/maintenance-intelligence-reports";

type AnyRow = Record<string, any>;

const auth = useAuthStore();
const menuStore = useMenuStore();
const loading = ref(false);
const error = ref<string | null>(null);
const reportPayload = ref<AnyRow | null>(null);
const userCatalogRows = ref<AnyRow[]>([]);
const userCatalogLoaded = ref(false);
const exportState = reactive<Record<string, boolean>>({});
const activeTab = ref("horas_trabajadas");

function startOfMonthInput() {
  const now = new Date();
  return formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

const filters = reactive({
  from: startOfMonthInput(),
  to: currentDateInputValue(),
  bodega_id: "",
  equipment_id: "",
  group_by: "OT",
});

const groupOptions = [
  { title: "OT", value: "OT" },
  { title: "Bodega", value: "BODEGA" },
  { title: "Equipo", value: "EQUIPO" },
  { title: "Responsable", value: "RESPONSABLE" },
  { title: "Material", value: "MATERIAL" },
  { title: "Mes", value: "MES" },
];

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, [
    "Reportes del sistema",
    "Reportes sistema",
    "Reportes globales",
    "Sistema reportes",
  ]),
);
const canRead = computed(() => perms.value.isReaded);
const canAccessSystemReports = computed(() => {
  const allowedReports = auth.user?.effectiveReportes ?? auth.user?.reportes;
  return (
    hasReportAccess(allowedReports, "reportes_sistema") ||
    hasReportAccess(allowedReports, "inteligencia_operativa")
  );
});

function unwrap<T = any>(payload: any, fallback: T): T {
  return (payload?.data ?? payload ?? fallback) as T;
}

const userCatalogMap = computed(
  () =>
    new Map(
      userCatalogRows.value.map((item) => [String(item?.id || "").trim(), item] as const),
    ),
);

const warehouseOptions = computed<AnyRow[]>(() =>
  Array.isArray(reportPayload.value?.catalogs?.bodegas)
    ? reportPayload.value.catalogs.bodegas
    : [],
);

const equipmentOptions = computed<AnyRow[]>(() =>
  Array.isArray(reportPayload.value?.catalogs?.equipos)
    ? reportPayload.value.catalogs.equipos
    : [],
);

const generatedAtLabel = computed(() =>
  reportPayload.value?.generated_at
    ? formatDateTime(reportPayload.value.generated_at, "Sin sincronizar")
    : "Sin sincronizar",
);

function formatNumber(value: unknown, digits = 2) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(numeric);
}

function isUuidLike(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    ) || /^[0-9a-f]{32}$/i.test(normalized)
  );
}

function buildUserDisplayName(user: AnyRow | null | undefined) {
  const label = String(user?.nameSurname || user?.nameUser || user?.email || "").trim();
  if (label) return label;
  const fallbackId = String(user?.id || "").trim();
  return fallbackId && !isUuidLike(fallbackId) ? fallbackId : "Usuario asignado";
}

function resolveResponsibleLabel(value: unknown, userId?: unknown) {
  const normalizedUserId = String(userId ?? "").trim();
  if (normalizedUserId) {
    const catalogUser = userCatalogMap.value.get(normalizedUserId);
    if (catalogUser) return buildUserDisplayName(catalogUser);
  }

  const raw = String(value ?? "").trim();
  if (raw && !isUuidLike(raw)) return raw;

  if (raw) {
    const catalogUser = userCatalogMap.value.get(raw);
    if (catalogUser) return buildUserDisplayName(catalogUser);
  }

  return "Usuario asignado";
}

function formatResponsibleMetaItem(item: AnyRow) {
  const label = resolveResponsibleLabel(
    item?.display_name ?? item?.nameSurname ?? item?.username ?? item?.user_id,
    item?.user_id,
  );
  const hours = Number(item?.horas);
  return Number.isFinite(hours) ? `${label} (${formatNumber(hours, 2)} h)` : label;
}

function buildResponsablesLines(row: AnyRow, value: unknown) {
  const meta = Array.isArray(row?.responsables_meta) ? row.responsables_meta : [];
  if (meta.length) {
    return meta.map((item: AnyRow) => formatResponsibleMetaItem(item)).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item && typeof item === "object"
          ? formatResponsibleMetaItem(item as AnyRow)
          : resolveResponsibleLabel(item),
      )
      .filter(Boolean);
  }
  const normalizedText = normalizeResponsablesText(value);
  return normalizedText
    .split("|")
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);
}

function normalizeResponsablesText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .split("|")
    .map((segment) => {
      const chunk = String(segment || "").trim();
      if (!chunk) return "";
      const match = chunk.match(/^(.*?)(\s*\([^()]+\))$/);
      const labelSegment = match?.[1] ? match[1].trim() : chunk;
      const suffix = match?.[2] ?? "";
      const label = resolveResponsibleLabel(labelSegment);
      return `${label}${suffix}`;
    })
    .filter(Boolean)
    .join(" | ");
}

function normalizeResponsablesValue(row: AnyRow, value: unknown) {
  return buildResponsablesLines(row, value).join(" | ");
}

function normalizeResponsableValue(row: AnyRow, value: unknown) {
  if (value && typeof value === "object") {
    return formatResponsibleMetaItem(value as AnyRow);
  }
  return resolveResponsibleLabel(value, row?.user_id);
}

function normalizeReportRow(row: AnyRow) {
  const normalized = { ...(row || {}) };
  if (Object.prototype.hasOwnProperty.call(normalized, "responsables")) {
    normalized._responsables_lines = buildResponsablesLines(normalized, normalized.responsables);
    normalized.responsables = normalizeResponsablesValue(normalized, normalized.responsables);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, "responsable")) {
    normalized.responsable = normalizeResponsableValue(normalized, normalized.responsable);
  }
  delete normalized.responsables_meta;
  delete normalized.user_id;
  return normalized;
}

function resolveDataTableRow(item: AnyRow) {
  return (item?.raw ?? item?._raw ?? item) as AnyRow;
}

function getReportResponsablesLines(item: AnyRow) {
  return Array.isArray(item?._responsables_lines)
    ? item._responsables_lines
        .map((line) => String(line || "").trim())
        .filter(Boolean)
    : [];
}

function formatSummaryValue(label: string, value: unknown) {
  const normalizedLabel = String(label || "").toLowerCase();
  if (normalizedLabel.includes("costo")) {
    return `$${formatNumber(value, 2)}`;
  }
  if (normalizedLabel.includes("hora")) {
    return `${formatNumber(value, 2)} h`;
  }
  return formatNumber(value, 4);
}

const summaryCards = computed(() =>
  (Array.isArray(reportPayload.value?.summary) ? reportPayload.value?.summary : []).map(
    (item: AnyRow) => ({
      label: String(item?.label || "Indicador"),
      valueLabel: formatSummaryValue(String(item?.label || ""), item?.value),
    }),
  ),
);

const normalizedReportPayload = computed<AnyRow | null>(() => {
  if (!reportPayload.value) return null;
  const reports = Object.fromEntries(
    Object.entries(reportPayload.value?.reports ?? {}).map(([key, section]) => {
      const rawRows = Array.isArray((section as AnyRow)?.rows) ? (section as AnyRow).rows : [];
      return [
        key,
        {
          ...(section as AnyRow),
          rows: rawRows.map((row: AnyRow) => normalizeReportRow(row)),
        },
      ];
    }),
  );
  return {
    ...reportPayload.value,
    reports,
  };
});

const SECTION_DEFS = [
  {
    key: "horas_trabajadas",
    title: "Horas trabajadas",
    subtitle: "Cantidad de horas registradas por OT, responsable o agrupación seleccionada.",
  },
  {
    key: "costo_mantenimiento",
    title: "Costo de mantenimiento",
    subtitle: "Valor total de materiales utilizados en órdenes de trabajo tipo mantenimiento.",
  },
  {
    key: "responsables_ot",
    title: "Quiénes trabajaron",
    subtitle: "Responsables con horas registradas por orden de trabajo.",
  },
  {
    key: "costo_inventario",
    title: "Costo del inventario",
    subtitle: "Snapshot actual del inventario valorizado por bodega o material.",
  },
  {
    key: "repuestos_cambiados",
    title: "Repuestos cambiados",
    subtitle: "Materiales utilizados en equipos para cada OT de mantenimiento.",
  },
  {
    key: "inventario_consumido",
    title: "Inventario consumido",
    subtitle: "Materiales usados en todas las órdenes de trabajo según la agrupación activa.",
  },
  {
    key: "top_materiales_utilizados",
    title: "Top 10 materiales",
    subtitle: "Materiales más usados en las órdenes del rango consultado.",
  },
];

const FIELD_LABELS: Record<string, string> = {
  fecha_referencia: "Fecha",
  periodo: "Periodo",
  work_order_code: "Código OT",
  work_order_title: "Titulo OT",
  work_order_status: "Estado OT",
  work_order_type: "Tipo OT",
  maintenance_kind: "Clase mtto",
  equipment_label: "Equipo",
  equipment_name: "Nombre equipo",
  plan_name: "Plan Name",
  procedure_label: "Plantilla",
  bodega_label: "Bodega",
  consumo_bodegas: "Bodegas consumo",
  horometro_actual_ot: "Horometro actual",
  horas_a_realizar_ot: "Horas a realizar",
  horometro_proyectado_ot: "Horometro proyectado",
  responsable: "Responsable",
  responsables: "Responsables",
  ordenes_trabajo: "Ordenes trabajo",
  equipos: "Equipos",
  bodegas: "Bodegas",
  material_label: "Material",
  total_horas: "Horas",
  total_responsables: "Cantidad responsables",
  total_ordenes: "OT",
  total_items: "Registros",
  total_materiales: "Materiales",
  materiales: "Materiales",
  total_cantidad: "Cantidad",
  total_costo: "Costo total",
  total_stock: "Stock actual",
  costo_unitario: "Costo unitario",
  costo_unitario_promedio: "Costo unitario promedio",
  total_costo_inventario: "Costo inventario",
};

const SECTION_COLUMN_OVERRIDES: Record<string, Record<string, string[]>> = {
  horas_trabajadas: {
    OT: [
      "work_order_code",
      "work_order_status",
      "work_order_type",
      "fecha_referencia",
      "equipment_name",
      "plan_name",
      "bodega_label",
      "horometro_actual_ot",
      "horas_a_realizar_ot",
      "horometro_proyectado_ot",
      "total_horas",
      "total_responsables",
      "responsables",
    ],
  },
  costo_mantenimiento: {
    OT: [
      "work_order_code",
      "work_order_status",
      "work_order_type",
      "fecha_referencia",
      "equipment_name",
      "plan_name",
      "bodega_label",
      "horometro_actual_ot",
      "horas_a_realizar_ot",
      "horometro_proyectado_ot",
      "total_costo",
      "total_cantidad",
      "materiales",
    ],
  },
  responsables_ot: {
    OT: [
      "work_order_code",
      "work_order_status",
      "work_order_type",
      "fecha_referencia",
      "equipment_name",
      "plan_name",
      "bodega_label",
      "horometro_actual_ot",
      "horas_a_realizar_ot",
      "horometro_proyectado_ot",
      "total_horas",
      "total_responsables",
      "responsables",
    ],
  },
  repuestos_cambiados: {
    OT: [
      "work_order_code",
      "work_order_status",
      "work_order_type",
      "fecha_referencia",
      "equipment_name",
      "plan_name",
      "bodega_label",
      "horometro_actual_ot",
      "horas_a_realizar_ot",
      "horometro_proyectado_ot",
      "material_label",
      "total_cantidad",
      "total_costo",
    ],
  },
  inventario_consumido: {
    OT: [
      "work_order_code",
      "work_order_status",
      "work_order_type",
      "fecha_referencia",
      "equipment_name",
      "plan_name",
      "bodega_label",
      "horometro_actual_ot",
      "horas_a_realizar_ot",
      "horometro_proyectado_ot",
      "material_label",
      "total_cantidad",
      "total_costo",
    ],
  },
};

const HIDDEN_FIELDS = new Set([
  "work_order_id",
  "equipment_id",
  "plan_id",
  "procedure_id",
  "bodega_id",
  "producto_id",
  "user_id",
  "responsables_meta",
  "_responsables_lines",
  "period_key",
  "is_maintenance",
]);

function prettifyKey(key: string) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function looksLikeDate(value: unknown) {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw);
}

function formatCellValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.join(" | ");
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (looksLikeDate(value) && /fecha/i.test(key)) {
    const raw = String(value);
    return raw.includes("T") ? formatDateTime(raw, raw) : raw.slice(0, 10);
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && String(value).trim() !== "") {
    if (/costo|valor/i.test(key)) return `$${formatNumber(numeric, 2)}`;
    if (/hora/i.test(key)) return `${formatNumber(numeric, 2)} h`;
    return formatNumber(
      numeric,
      /ordenes|items|materiales|responsables/i.test(key) ? 0 : 4,
    );
  }
  return String(value);
}

function buildVisibleKeys(rows: AnyRow[], preferredKeys?: string[]) {
  const keySet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (!HIDDEN_FIELDS.has(key)) keySet.add(key);
    }
  }
  if (preferredKeys?.length) {
    return preferredKeys.filter((key) => keySet.has(key));
  }
  return Array.from(keySet);
}

function buildHeaders(rows: AnyRow[], preferredKeys?: string[]) {
  const keys = buildVisibleKeys(rows, preferredKeys);
  return keys.map((key) => ({
    title: FIELD_LABELS[key] ?? prettifyKey(key),
    key,
  }));
}

function buildDisplayRows(rows: AnyRow[], preferredKeys?: string[]) {
  const keys = buildVisibleKeys(rows, preferredKeys);
  return rows.map((row) =>
    Object.fromEntries(
      keys.map((key) => [key, formatCellValue(key, (row || {})[key])]),
    ),
  );
}

const reportSections = computed(() =>
  SECTION_DEFS.map((section) => {
    const source = normalizedReportPayload.value?.reports?.[section.key] ?? {};
    const rawRows = Array.isArray(source?.rows) ? source.rows : [];
    const groupBy = String(
      source?.group_by || normalizedReportPayload.value?.filters?.group_by || "OT",
    )
      .trim()
      .toUpperCase();
    const preferredKeys = SECTION_COLUMN_OVERRIDES[section.key]?.[groupBy];
    return {
      ...section,
      rawRows,
      displayRows: buildDisplayRows(rawRows, preferredKeys),
      headers: buildHeaders(rawRows, preferredKeys),
      groupLabel: `Agrupado por ${groupBy}`,
    };
  }),
);

async function loadReports() {
  if (!canRead.value || !canAccessSystemReports.value) {
    reportPayload.value = null;
    return;
  }
  if (filters.from && filters.to && filters.from > filters.to) {
    error.value = "La fecha desde no puede ser mayor que la fecha hasta.";
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/kpi_maintenance/inteligencia/reportes-sistema", {
      params: {
        from: filters.from || undefined,
        to: filters.to || undefined,
        bodega_id: filters.bodega_id || undefined,
        equipment_id: filters.equipment_id || undefined,
        group_by: filters.group_by || undefined,
      },
    });
    reportPayload.value = unwrap<AnyRow | null>(data, null);
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || "No se pudieron generar los reportes del sistema.";
  } finally {
    loading.value = false;
  }
}

async function loadUserCatalog(force = false) {
  if (userCatalogLoaded.value && !force) return;
  try {
    const rows = await listAllPages(
      "/kpi_security/users",
      { includeDeleted: false },
      { cacheTtlMs: DEFAULT_CONTEXT_CACHE_TTL_MS },
    );
    userCatalogRows.value = Array.isArray(rows)
      ? rows.filter(
          (item: AnyRow) =>
            !item?.isDeleted &&
            String(item?.status || "ACTIVE").trim().toUpperCase() === "ACTIVE",
        )
      : [];
    userCatalogLoaded.value = true;
  } catch {
    userCatalogRows.value = [];
  }
}

function clearFilters() {
  filters.from = startOfMonthInput();
  filters.to = currentDateInputValue();
  filters.bodega_id = "";
  filters.equipment_id = "";
  filters.group_by = "OT";
  void loadReports();
}

function exportKey(format: "excel" | "pdf") {
  return `system-reports:${format}`;
}

function isExporting(format: "excel" | "pdf") {
  return Boolean(exportState[exportKey(format)]);
}

async function exportReports(format: "excel" | "pdf") {
  if (!normalizedReportPayload.value) return;
  const key = exportKey(format);
  exportState[key] = true;
  error.value = null;
  try {
    if (!userCatalogLoaded.value) {
      await loadUserCatalog();
    }
    const report = buildSystemReportsReport(normalizedReportPayload.value);
    if (format === "excel") {
      await downloadReportExcel(report);
    } else {
      await downloadReportPdf(report);
    }
  } catch (e: any) {
    error.value = e?.message || "No se pudo exportar el reporte.";
  } finally {
    exportState[key] = false;
  }
}

onMounted(() => {
  void Promise.allSettled([loadUserCatalog(), loadReports()]);
});
</script>

<style scoped>
.system-reports-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(73, 141, 255, 0.18), transparent 30%),
    linear-gradient(135deg, rgba(14, 24, 39, 0.98), rgba(12, 18, 30, 0.98));
}

.hero-wrap {
  gap: 16px;
  flex-wrap: wrap;
}

.hero-actions {
  gap: 8px;
  flex-wrap: wrap;
}

.filter-actions {
  gap: 8px;
  flex-wrap: wrap;
}

.summary-card {
  border-color: rgba(115, 149, 202, 0.22);
  background:
    linear-gradient(180deg, rgba(21, 30, 47, 0.95), rgba(14, 22, 36, 0.95));
}

.section-head {
  gap: 16px;
  flex-wrap: wrap;
}

.system-tabs {
  border-bottom: 1px solid rgba(115, 149, 202, 0.14);
}

.responsibles-inline-table {
  min-width: 220px;
  display: grid;
  gap: 4px;
}

.responsibles-inline-row {
  padding: 6px 8px;
  border: 1px solid rgba(115, 149, 202, 0.22);
  border-radius: 8px;
  background: rgba(19, 29, 45, 0.88);
  line-height: 1.3;
  white-space: normal;
}
</style>

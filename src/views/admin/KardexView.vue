<template>
  <v-row dense>
    <v-col cols="12" lg="4">
      <v-card rounded="xl" class="pa-4 h-100">
        <div class="text-h6 font-weight-bold mb-2">Movimiento manual</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Registra entradas y salidas (compra / venta) y genera Kardex automáticamente.
        </div>

        <v-select
          v-model="movementForm.tipo"
          :items="movementTypes"
          item-title="title"
          item-value="value"
          label="Tipo de movimiento"
          variant="outlined"
          class="mb-2"
        />

        <v-select
          v-model="movementForm.productoId"
          :items="productOptions"
          item-title="title"
          item-value="value"
          label="Producto"
          variant="outlined"
          class="mb-2"
        />

        <v-select
          v-model="movementForm.bodegaId"
          :items="warehouseOptions"
          item-title="title"
          item-value="value"
          label="Bodega"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="movementForm.cantidad"
          type="number"
          min="0"
          label="Cantidad"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="movementForm.costoUnitario"
          type="number"
          min="0"
          label="Costo unitario"
          variant="outlined"
          class="mb-2"
        />

        <v-textarea
          v-model="movementForm.observacion"
          label="Observación"
          variant="outlined"
          rows="2"
          auto-grow
          class="mb-2"
        />

        <v-btn color="primary" block :loading="savingMovement" @click="saveMovement">
          Registrar movimiento
        </v-btn>
      </v-card>
    </v-col>

    <v-col cols="12" lg="8">
      <v-card rounded="xl" class="pa-4 mb-4">
        <div class="text-h6 font-weight-bold mb-2">Carga masiva XLSX</div>
        <div class="text-body-2 text-medium-emphasis mb-3">
          Formato esperado: Cod. Sucursal, Sucursal, Cod. Bodega, Bodega, Línea, Categoría,
          Cod. Ítem, Ítem, Costo promedio, Precio, % UTILIDAD, Tipo de unidad, Por contenedores,
          Stock, Stock mín. bodega, Stock máx. bodega, Stock contenedores, Stock mínimo.
        </div>

        <v-file-input
          v-model="xlsxFile"
          accept=".xlsx,.xls"
          prepend-icon="mdi-file-excel"
          label="Selecciona archivo XLSX"
          variant="outlined"
          show-size
          class="mb-3"
        />

        <div class="d-flex" style="gap: 8px; flex-wrap: wrap;">
          <v-btn color="primary" :loading="uploading" @click="processXlsx">
            Procesar carga masiva
          </v-btn>
          <v-chip v-if="lastBulkSummary" color="success" variant="tonal">
            Creados: {{ lastBulkSummary.creados }} · Actualizados: {{ lastBulkSummary.actualizados }} ·
            Ingresos: {{ lastBulkSummary.ingresos }} · Salidas: {{ lastBulkSummary.salidas }}
          </v-chip>
        </div>
      </v-card>

      <v-card rounded="xl" class="pa-4">
        <div class="d-flex align-center justify-space-between mb-2" style="gap: 8px; flex-wrap: wrap;">
          <div>
            <div class="text-h6 font-weight-bold">Kardex</div>
            <div class="text-body-2 text-medium-emphasis">Historial de entradas y salidas.</div>
          </div>
          <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loadingKardex" @click="loadKardex">
            Recargar
          </v-btn>
        </div>

        <v-data-table
          :headers="kardexHeaders"
          :items="kardexRows"
          :loading="loadingKardex"
          :items-per-page="20"
          class="elevation-0"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as XLSX from "xlsx";
import { api } from "@/app/http/api";
import { bulkUpsertFromRows, fetchProductsWithStock, performManualMovement } from "@/app/services/products-inventory.service";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { formatNumberForDisplay } from "@/app/utils/number-format";

type MovementType = "INGRESO" | "SALIDA";

type KardexRow = {
  id: string;
  fecha: string;
  tipo_movimiento: string;
  producto_id: string;
  bodega_id: string;
  entrada_cantidad: string;
  salida_cantidad: string;
  saldo_cantidad: string;
  costo_unitario: string;
};

const ui = useUiStore();
const auth = useAuthStore();

const savingMovement = ref(false);
const uploading = ref(false);
const loadingKardex = ref(false);

const xlsxFile = ref<File | null>(null);
const lastBulkSummary = ref<{ creados: number; actualizados: number; ingresos: number; salidas: number } | null>(null);

const movementForm = reactive({
  tipo: "INGRESO" as MovementType,
  productoId: "",
  bodegaId: "",
  cantidad: "1",
  costoUnitario: "0",
  observacion: "",
});

const products = ref<any[]>([]);
const bodegas = ref<any[]>([]);
const kardex = ref<KardexRow[]>([]);

const movementTypes = [
  { value: "INGRESO", title: "Ingreso (compra)" },
  { value: "SALIDA", title: "Salida (venta)" },
];

const productOptions = computed(() =>
  products.value.map((p) => ({
    value: p.id,
    title: `${p.codigo} - ${p.nombre}`,
  }))
);

const warehouseOptions = computed(() =>
  bodegas.value.map((b) => ({
    value: b.id,
    title: `${b.codigo} - ${b.nombre}`,
  }))
);

const kardexHeaders = [
  { title: "Fecha", key: "fecha" },
  { title: "Tipo", key: "tipo_movimiento" },
  { title: "Producto", key: "producto" },
  { title: "Bodega", key: "bodega" },
  { title: "Entrada", key: "entrada_cantidad" },
  { title: "Salida", key: "salida_cantidad" },
  { title: "Saldo", key: "saldo_cantidad" },
  { title: "Costo unitario", key: "costo_unitario" },
];

const kardexRows = computed(() => {
  const productNameById = new Map(products.value.map((p) => [p.id, `${p.codigo} - ${p.nombre}`]));
  const bodegaNameById = new Map(bodegas.value.map((b) => [b.id, `${b.codigo} - ${b.nombre}`]));

  return kardex.value.map((r) => ({
    ...r,
    fecha: new Date(r.fecha).toLocaleString(),
    producto: productNameById.get(r.producto_id) ?? r.producto_id,
    bodega: bodegaNameById.get(r.bodega_id) ?? r.bodega_id,
    entrada_cantidad: formatNumberForDisplay(r.entrada_cantidad),
    salida_cantidad: formatNumberForDisplay(r.salida_cantidad),
    saldo_cantidad: formatNumberForDisplay(r.saldo_cantidad),
    costo_unitario: formatNumberForDisplay(r.costo_unitario),
  }));
});

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function parsePositiveNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
  const limit = 100;
  const out: any[] = [];

  for (let page = 1; page <= 100; page += 1) {
    const { data } = await api.get(endpoint, { params: { page, limit } });
    const rows = asArray(data);
    out.push(...rows);
    if (rows.length < limit) break;
  }

  return out;
}

async function loadBaseData() {
  const inventory = await fetchProductsWithStock();
  products.value = inventory.productos;
  bodegas.value = inventory.bodegas;
}

async function loadKardex() {
  loadingKardex.value = true;
  try {
    kardex.value = (await listAll("/kpi_inventory/kardex")) as KardexRow[];
  } catch (error: any) {
    ui.error(error?.response?.data?.message || "No se pudo cargar kardex.");
  } finally {
    loadingKardex.value = false;
  }
}

async function saveMovement() {
  const cantidad = parsePositiveNumber(movementForm.cantidad);
  const costoUnitario = Number(movementForm.costoUnitario);

  if (!movementForm.productoId || !movementForm.bodegaId) {
    ui.error("Producto y bodega son obligatorios.");
    return;
  }

  if (!cantidad) {
    ui.error("La cantidad debe ser mayor a cero.");
    return;
  }

  if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
    ui.error("El costo unitario no es válido.");
    return;
  }

  savingMovement.value = true;
  try {
    await performManualMovement({
      tipo: movementForm.tipo,
      productoId: movementForm.productoId,
      bodegaId: movementForm.bodegaId,
      cantidad,
      costoUnitario,
      observacion: movementForm.observacion || undefined,
      userName: getUserName(),
    });

    ui.success("Movimiento registrado correctamente.");
    movementForm.observacion = "";
    await loadKardex();
    await loadBaseData();
  } catch (error: any) {
    ui.error(error?.response?.data?.message || error?.message || "No se pudo registrar el movimiento.");
  } finally {
    savingMovement.value = false;
  }
}

async function processXlsx() {
  if (!xlsxFile.value) {
    ui.error("Debes seleccionar un archivo XLSX.");
    return;
  }

  uploading.value = true;
  try {
    const buffer = await xlsxFile.value.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const [firstSheetName] = workbook.SheetNames;
    if (!firstSheetName) {
      ui.error("El archivo XLSX no contiene hojas válidas.");
      return;
    }

    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      ui.error("No se pudo leer la hoja del archivo XLSX.");
      return;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    if (!rows.length) {
      ui.error("El archivo no contiene filas de datos.");
      return;
    }

    const summary = await bulkUpsertFromRows(rows, getUserName());
    lastBulkSummary.value = summary;
    ui.success("Carga masiva procesada correctamente.");

    await loadBaseData();
    await loadKardex();
  } catch (error: any) {
    ui.error(error?.response?.data?.message || error?.message || "No se pudo procesar la carga masiva.");
  } finally {
    uploading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadBaseData(), loadKardex()]);
});
</script>

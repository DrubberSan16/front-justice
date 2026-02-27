<template>
  <v-card rounded="xl" class="pa-4">
    <div class="d-flex flex-wrap align-center justify-space-between mb-3" style="gap: 8px">
      <div>
        <div class="text-h6 font-weight-bold">Productos e inventario</div>
        <div class="text-body-2 text-medium-emphasis">
          Registra ingresos/salidas, genera kardex y soporta carga masiva por XLSX.
        </div>
      </div>

      <div class="d-flex" style="gap: 8px">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openMovement('INGRESO')">Ingreso</v-btn>
        <v-btn color="warning" prepend-icon="mdi-minus" @click="openMovement('SALIDA')">Salida</v-btn>
        <v-btn color="secondary" prepend-icon="mdi-file-excel" @click="pickXlsx">Carga XLSX</v-btn>
        <input ref="xlsxInput" type="file" accept=".xlsx,.xls" class="d-none" @change="onXlsxSelected" />
      </div>
    </div>

    <v-row dense class="mb-2">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="Buscar por código o nombre"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="rows"
      :loading="loading"
      :items-per-page="20"
      class="elevation-0"
    />
  </v-card>

  <v-dialog v-model="dialog" max-width="700">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ dialogTitle }}</v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-row dense>
          <v-col cols="12">
            <v-select
              v-model="form.productoId"
              :items="productOptions"
              item-title="label"
              item-value="value"
              label="Producto"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.bodegaId"
              :items="bodegaOptions"
              item-title="label"
              item-value="value"
              label="Bodega"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="form.cantidad"
              label="Cantidad"
              variant="outlined"
              type="number"
              min="0"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="form.costoUnitario"
              label="Costo unitario"
              variant="outlined"
              type="number"
              min="0"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea v-model="form.observacion" label="Observación" variant="outlined" rows="2" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="saveMovement">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import * as XLSX from "xlsx";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import {
  bulkUpsertFromRows,
  fetchProductsWithStock,
  performManualMovement,
  type ProductRow,
} from "@/app/services/products-inventory.service";

const ui = useUiStore();
const auth = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const search = ref("");
const products = ref<ProductRow[]>([]);
const stockByProduct = ref<Map<string, number>>(new Map());
const bodegas = ref<any[]>([]);

const headers = [
  { title: "Código", key: "codigo" },
  { title: "Producto", key: "nombre" },
  { title: "Stock total", key: "stock" },
  { title: "Costo promedio", key: "costo" },
  { title: "Precio", key: "precio" },
];

const rows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return products.value
    .map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      stock: stockByProduct.value.get(p.id) ?? 0,
      costo: p.costo_promedio,
      precio: p.precio_venta,
      _search: `${p.codigo} ${p.nombre}`.toLowerCase(),
    }))
    .filter((r) => !q || r._search.includes(q));
});

const dialog = ref(false);
const movementType = ref<"INGRESO" | "SALIDA">("INGRESO");
const form = ref({
  productoId: "",
  bodegaId: "",
  cantidad: 1,
  costoUnitario: 0,
  observacion: "",
});

const productOptions = computed(() =>
  products.value.map((p) => ({ value: p.id, label: `${p.codigo} - ${p.nombre}` }))
);
const bodegaOptions = computed(() =>
  bodegas.value.map((b) => ({ value: b.id, label: `${b.codigo} - ${b.nombre}` }))
);

const dialogTitle = computed(() =>
  movementType.value === "INGRESO" ? "Registrar ingreso de producto" : "Registrar salida de producto"
);

async function loadData() {
  loading.value = true;
  try {
    const res = await fetchProductsWithStock();
    products.value = res.productos;
    stockByProduct.value = res.stockByProduct;
    bodegas.value = res.bodegas;
  } catch (e: any) {
    ui.error(e?.response?.data?.message || "No se pudieron cargar los productos.");
  } finally {
    loading.value = false;
  }
}

function openMovement(tipo: "INGRESO" | "SALIDA") {
  movementType.value = tipo;
  form.value = {
    productoId: "",
    bodegaId: bodegaOptions.value[0]?.value ?? "",
    cantidad: 1,
    costoUnitario: 0,
    observacion: "",
  };
  dialog.value = true;
}

async function saveMovement() {
  if (!form.value.productoId || !form.value.bodegaId) {
    ui.error("Debes seleccionar producto y bodega.");
    return;
  }

  if (Number(form.value.cantidad) <= 0) {
    ui.error("La cantidad debe ser mayor a 0.");
    return;
  }

  saving.value = true;
  try {
    await performManualMovement({
      productoId: form.value.productoId,
      bodegaId: form.value.bodegaId,
      cantidad: Number(form.value.cantidad),
      costoUnitario: Number(form.value.costoUnitario || 0),
      tipo: movementType.value,
      observacion: form.value.observacion,
      userName: auth.user?.nameUser || "admin",
    });
    ui.success(`Movimiento de ${movementType.value.toLowerCase()} registrado correctamente.`);
    dialog.value = false;
    await loadData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || e?.message || "No se pudo registrar el movimiento.");
  } finally {
    saving.value = false;
  }
}

const xlsxInput = ref<HTMLInputElement | null>(null);
function pickXlsx() {
  xlsxInput.value?.click();
}

async function onXlsxSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  loading.value = true;
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstName = workbook.SheetNames[0];
    if (!firstName) throw new Error("El archivo XLSX no contiene hojas.");
    const firstSheet = workbook.Sheets[firstName];
    if (!firstSheet) throw new Error("No se pudo leer la hoja principal del XLSX.");
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

    const result = await bulkUpsertFromRows(rows, auth.user?.nameUser || "admin");
    ui.success(
      `Carga completada. Productos creados: ${result.creados}, actualizados: ${result.actualizados}, ingresos: ${result.ingresos}, salidas: ${result.salidas}.`
    );
    await loadData();
  } catch (e: any) {
    ui.error(e?.response?.data?.message || e?.message || "No se pudo procesar el XLSX.");
  } finally {
    input.value = "";
    loading.value = false;
  }
}

onMounted(loadData);
</script>

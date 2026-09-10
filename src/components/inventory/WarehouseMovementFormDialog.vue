<template>
  <v-dialog :model-value="modelValue" max-width="1480" scrollable @update:model-value="handleVisibility">
    <v-card rounded="xl" class="enterprise-surface">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap" style="gap:12px">
        <div>
          <div class="text-h6 font-weight-bold">{{ dialogTitle }}</div>
          <div class="text-body-2 text-medium-emphasis">
            Registra la cabecera y el detalle del documento. El sistema genera
            el código {{ isIncome ? "IB" : "EB" }} automáticamente.
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" density="comfortable" @click="close" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-5">
        <v-progress-linear v-if="catalogLoading" indeterminate color="primary" rounded class="mb-4" />
        <v-row dense>
          <v-col cols="12" md="3">
            <v-text-field v-model="form.fecha" type="date" label="Fecha" variant="outlined" :disabled="saving" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="form.bodegaId" :items="warehouseOptions" item-title="title" item-value="value"
              label="Bodega" variant="outlined" :disabled="catalogLoading || saving" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field :model-value="isIncome ? 'IB-########' : 'EB-########'" label="Código generado"
              variant="outlined" readonly />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="form.referencia" label="Referencia" variant="outlined" placeholder="Opcional"
              :disabled="saving" />
          </v-col>
          <v-col cols="12">
            <v-textarea v-model="form.observacion" label="Observación general" variant="outlined" rows="2" auto-grow
              :disabled="saving" />
          </v-col>
        </v-row>
        <v-alert v-if="!form.bodegaId" type="info" variant="tonal" class="mb-4">
          Selecciona una bodega para habilitar el detalle de materiales.
        </v-alert>
        <div class="d-flex align-center justify-space-between flex-wrap mb-3" style="gap:12px">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Detalle de materiales</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ isIncome
                ? "Puedes seleccionar cualquier material registrado que no sea un servicio."
                : "Solo se muestran materiales con stock disponible en la bodega seleccionada." }}
            </div>
          </div>
          <div class="d-flex align-center flex-wrap" style="gap: 8px;">
            <v-btn variant="text" prepend-icon="mdi-refresh" :loading="catalogLoading" :disabled="saving"
              @click="refreshCatalogs">
              Actualizar materiales
            </v-btn>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" :disabled="catalogLoading || saving"
              @click="addDetail">Agregar material</v-btn>
          </div>
        </div>
        <div class="document-editor-table">
          <table class="document-editor-grid">
            <thead>
              <tr>
                <th class="line-col">#</th>
                <th class="material-col">Material</th>
                <th class="condition-col">Condición</th>
                <th class="stock-col">Disponible</th>
                <th class="qty-col">Cantidad</th>
                <th v-if="showUnitCost" class="price-col">Precio unitario</th>
                <th v-if="showUnitCost" class="discount-col">Desc.</th>
                <th v-if="showUnitCost" class="discount-col">% Desc.</th>
                <th v-if="showUnitCost" class="discount-col">IVA %</th>
                <th v-if="showUnitCost" class="line-total-col">Total</th>
                <th class="obs-col">{{ isIncome ? "Observación" : "Responsable" }}</th>
                <th class="action-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(detail, index) in details" :key="detail.localId">
                <td class="line-col font-weight-bold">{{ index + 1 }}</td>
                <td class="material-col">
                  <v-autocomplete v-model="detail.productoId" :items="productOptions" item-title="title"
                    item-value="value" label="Material" variant="outlined" density="comfortable" clearable
                    :loading="catalogLoading" :disabled="catalogLoading || !form.bodegaId || saving"
                    :menu-props="{ maxHeight: 320 }"
                    :no-data-text="isIncome ? 'No hay materiales registrados' : 'No hay materiales con stock disponible en esta bodega'"
                    @update:model-value="syncDetailCondition(detail)" />
                </td>
                <td class="condition-col">
                  <v-select v-model="detail.condicionMaterial" :items="conditionOptions(detail)" item-title="title"
                    item-value="value" label="Condición" variant="outlined" density="comfortable"
                    :disabled="saving || !detail.productoId || conditionOptions(detail).length <= 1"
                    @update:model-value="syncDetailCondition(detail)" />
                </td>
                <td class="stock-col">
                  <v-text-field :model-value="stockLabel(detail)"
                    :label="isIncome ? 'Stock condición' : 'Transferible'" variant="outlined" density="comfortable"
                    readonly />
                  <div v-if="detail.productoId && stockRow(detail)" class="text-caption text-medium-emphasis mt-1">
                    {{ stockCaption(detail) }}
                  </div>
                </td>
                <td class="qty-col">
                  <v-text-field v-model="detail.cantidad" type="number" min="0" label="Cantidad" variant="outlined"
                    density="comfortable" :disabled="saving" />
                  <div v-if="detailExceedsStock(detail)" class="text-caption text-error mt-1">
                    Supera el disponible de {{ formatNumberForDisplay(availableStock(detail)) }}.
                  </div>
                </td>
                <td v-if="showUnitCost" class="price-col">
                  <v-text-field v-model="detail.costoUnitario" type="number" min="0" step="0.0001"
                    label="Precio unitario" prefix="$" variant="outlined" density="comfortable" :disabled="saving" />
                </td>
                <td v-if="showUnitCost" class="discount-col">
                  <v-text-field v-model="detail.descuento" type="number" min="0" step="0.0001" label="Descuento"
                    prefix="$" variant="outlined" density="comfortable" :disabled="saving"
                    @update:model-value="clearDetailDiscountPercentage(detail)" />
                </td>
                <td v-if="showUnitCost" class="discount-col">
                  <v-text-field v-model="detail.porcentajeDescuento" type="number" min="0" max="100" step="0.01"
                    label="% descuento" suffix="%" variant="outlined" density="comfortable"
                    :disabled="saving || parsePositive(detail.descuento) > 0" />
                </td>
                <td v-if="showUnitCost" class="discount-col">
                  <v-text-field v-model="detail.ivaPorcentaje" type="number" min="0" max="100" step="0.01"
                    label="IVA" suffix="%" variant="outlined" density="comfortable" :disabled="saving" />
                </td>
                <td v-if="showUnitCost" class="line-total-col text-right font-weight-bold">
                  {{ formatCurrency(lineAmounts(detail).total) }}
                </td>
                <td class="obs-col">
                  <v-text-field v-model="detail.observacion" :label="isIncome ? 'Observación' : 'Responsable'"
                    variant="outlined" density="comfortable" :disabled="saving" />
                </td>
                <td class="action-col">
                  <v-btn icon="mdi-delete-outline" variant="text" color="error" density="comfortable"
                    :disabled="details.length === 1 || saving" @click="removeDetail(detail.localId)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex align-center justify-space-between flex-wrap mt-4" style="gap:12px">
          <div class="summary-chip-list">
            <v-chip color="primary" variant="tonal">{{ details.length }} materiales</v-chip>
            <v-chip color="secondary" variant="tonal">
              {{ formatNumberForDisplay(totalQuantity) }} unidades
            </v-chip>
            <v-chip :color="isIncome ? 'info' : 'warning'" variant="tonal">
              {{ isIncome ? "Suma stock" : "Descuenta stock" }}
            </v-chip>
          </div>
          <div v-if="showUnitCost" class="summary-chip-list justify-end">
            <v-chip color="info" variant="tonal">Subtotal: {{ formatCurrency(documentTotals.bruto) }}</v-chip>
            <v-chip color="warning" variant="tonal">Descuento: {{ formatCurrency(documentTotals.descuento) }}</v-chip>
            <v-chip color="secondary" variant="tonal">IVA: {{ formatCurrency(documentTotals.iva) }}</v-chip>
            <v-chip color="success" variant="tonal">Total: {{ formatCurrency(documentTotals.total) }}</v-chip>
          </div>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="px-5 py-4 d-flex justify-end flex-wrap" style="gap:12px">
        <v-btn variant="text" :disabled="saving" @click="close">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">
          Guardar {{ isIncome ? "Ingreso" : "Egreso" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useUiStore } from "@/app/stores/ui.store";
import { fetchProductsWithStock } from "@/app/services/products-inventory.service";
import { formatDateForInput } from "@/app/utils/date-time";
import { formatNumberForDisplay } from "@/app/utils/number-format";
import { buildProductDisplayTitle } from "@/app/utils/product-display";
import { canSetIncomeUnitCost } from "@/app/utils/role-access";

/**
 * Alta de un ingreso o un egreso de bodega.
 *
 * Vivia dentro del Kardex, que es una pantalla de consulta: registrar el
 * movimiento y leer el saldo son dos trabajos distintos y el formulario le
 * pertenece a quien mueve el material. Aqui queda autocontenido para que las
 * pantallas de ingresos y de egresos lo monten sin arrastrar el resto del
 * Kardex.
 */
type MovementType = "INGRESO" | "SALIDA";
type StockCondition = "NUEVO" | "USADO" | "CRITICO";

type StockRow = {
  bodega_id: string;
  producto_id: string;
  stock_actual?: string | number | null;
  stock_nuevo?: string | number | null;
  stock_usado?: string | number | null;
  stock_critico?: string | number | null;
  stock_disponible?: string | number | null;
  cantidad_reservada_activa?: string | number | null;
  es_usado?: boolean;
};

type DetailForm = {
  localId: string;
  productoId: string;
  condicionMaterial: StockCondition;
  cantidad: string;
  costoUnitario: string;
  descuento: string;
  porcentajeDescuento: string;
  ivaPorcentaje: string;
  observacion: string;
};

/**
 * El IVA que propone el formulario, el mismo de la orden de compra. Se puede
 * cambiar linea por linea; en la base el valor por defecto es cero, para no
 * inventarle impuesto a los documentos que se registraron sin el.
 */
const DEFAULT_IVA_PERCENTAGE = 15;

const props = defineProps<{ modelValue: boolean; movementType: MovementType }>();
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "saved"): void;
}>();

const ui = useUiStore();
const auth = useAuthStore();

const catalogLoading = ref(false);
const catalogLoaded = ref(false);
const saving = ref(false);
const products = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const stocks = ref<StockRow[]>([]);

const form = reactive({
  fecha: formatDateForInput(),
  bodegaId: "",
  referencia: "",
  observacion: "",
});
const details = ref<DetailForm[]>([createDetail()]);

const isIncome = computed(() => props.movementType === "INGRESO");
const dialogTitle = computed(() =>
  isIncome.value ? "Ingreso de bodega" : "Egreso de bodega",
);
// El precio solo se teclea al ingresar: en un egreso el material ya tiene el
// suyo y volver a pedirlo invitaria a inventarlo.
const showUnitCost = computed(
  () => isIncome.value && canSetIncomeUnitCost(auth.user),
);

const warehouseOptions = computed(() =>
  warehouses.value.map((bodega) => ({
    value: bodega.id,
    title: `${bodega.codigo} - ${bodega.nombre}`,
  })),
);

const stockByWarehouseProduct = computed(() => {
  const map = new Map<string, StockRow>();
  for (const row of stocks.value) {
    map.set(`${row.bodega_id}:${row.producto_id}`, row);
  }
  return map;
});

const productOptions = computed(() => {
  if (!form.bodegaId) return [];
  return products.value
    .filter((product) => {
      if (isIncome.value) return true;
      const stock = stockByWarehouseProduct.value.get(
        `${form.bodegaId}:${product.id}`,
      );
      return toStockNumber(stock?.stock_disponible ?? stock?.stock_actual) > 0;
    })
    .map((product) => {
      const stock = stockByWarehouseProduct.value.get(
        `${form.bodegaId}:${product.id}`,
      );
      const available = stock?.stock_disponible ?? stock?.stock_actual;
      const stockLabelText = stock
        ? ` · transferible ${formatNumberForDisplay(available)}`
        : "";
      return {
        value: product.id,
        title: `${buildProductDisplayTitle(product)}${stockLabelText}`,
      };
    });
});

const totalQuantity = computed(() =>
  details.value.reduce((sum, detail) => sum + parsePositive(detail.cantidad), 0),
);

/**
 * Economia de una linea, con el mismo desglose que una orden de compra.
 *
 * Se repite aqui el calculo que hace el backend para que quien teclea vea el
 * total mientras lo escribe; el importe que se guarda lo vuelve a calcular el
 * servicio, que es el que manda.
 */
function lineAmounts(detail: DetailForm) {
  const cantidad = parsePositive(detail.cantidad);
  const precio = parsePositive(detail.costoUnitario);
  const bruto = cantidad * precio;
  const importe = parsePositive(detail.descuento);
  const porcentaje = Math.min(parsePositive(detail.porcentajeDescuento), 100);
  const solicitado = importe > 0 ? importe : (bruto * porcentaje) / 100;
  const descuento = Math.min(Math.max(solicitado, 0), bruto);
  const subtotal = Math.max(bruto - descuento, 0);
  const ivaPorcentaje = Math.min(parsePositive(detail.ivaPorcentaje), 100);
  const iva = (subtotal * ivaPorcentaje) / 100;
  return { bruto, descuento, subtotal, iva, total: subtotal + iva };
}

const documentTotals = computed(() =>
  details.value.reduce(
    (acc, detail) => {
      const linea = lineAmounts(detail);
      acc.bruto += linea.bruto;
      acc.descuento += linea.descuento;
      acc.subtotal += linea.subtotal;
      acc.iva += linea.iva;
      acc.total += linea.total;
      return acc;
    },
    { bruto: 0, descuento: 0, subtotal: 0, iva: 0, total: 0 },
  ),
);

/**
 * El importe y el porcentaje son dos formas de decir lo mismo, asi que solo
 * puede haber una viva: al teclear un importe se limpia el porcentaje para que
 * nadie tenga que adivinar cual gano.
 */
function clearDetailDiscountPercentage(detail: DetailForm) {
  if (parsePositive(detail.descuento) > 0) detail.porcentajeDescuento = "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);
}

function createDetail(): DetailForm {
  return {
    localId: `detail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productoId: "",
    condicionMaterial: "NUEVO",
    cantidad: "",
    costoUnitario: "",
    descuento: "",
    porcentajeDescuento: "",
    ivaPorcentaje: String(DEFAULT_IVA_PERCENTAGE),
    observacion: "",
  };
}

function parsePositive(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toStockNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function getUserName() {
  return auth.user?.nameUser || auth.user?.nameSurname || "SYSTEM";
}

function addDetail() {
  details.value.push(createDetail());
}

function removeDetail(localId: string) {
  details.value =
    details.value.length === 1
      ? [createDetail()]
      : details.value.filter((detail) => detail.localId !== localId);
}

function resetForm() {
  form.fecha = formatDateForInput();
  form.bodegaId = "";
  form.referencia = "";
  form.observacion = "";
  details.value = [createDetail()];
}

function close() {
  if (saving.value) return;
  emit("update:modelValue", false);
}

function handleVisibility(value: boolean) {
  emit("update:modelValue", value);
}

async function loadCatalogs(force = false) {
  if (catalogLoaded.value && !force) return;
  catalogLoading.value = true;
  try {
    const inventory = await fetchProductsWithStock();
    products.value = (inventory.productos ?? []).filter(
      (product: any) => !product?.es_servicio,
    );
    warehouses.value = inventory.bodegas ?? [];
    stocks.value = (inventory.stocks ?? []) as StockRow[];
    catalogLoaded.value = true;
  } catch (error: any) {
    catalogLoaded.value = false;
    products.value = [];
    warehouses.value = [];
    stocks.value = [];
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudieron cargar los catálogos de inventario.",
    );
  } finally {
    catalogLoading.value = false;
  }
}

async function refreshCatalogs() {
  await loadCatalogs(true);
  if (catalogLoaded.value) ui.success("Listado de materiales actualizado.");
}

function stockRow(detail: DetailForm) {
  if (!form.bodegaId || !detail.productoId) return null;
  return (
    stockByWarehouseProduct.value.get(
      `${form.bodegaId}:${detail.productoId}`,
    ) ?? null
  );
}

function normalizeCondition(value: unknown): StockCondition {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "USADO") return "USADO";
  if (normalized === "CRITICO") return "CRITICO";
  return "NUEVO";
}

/**
 * Cuando en la bodega solo queda material critico, la salida no puede fingir
 * que hay nuevo o usado: la unica condicion posible es la critica.
 */
function usesCriticalFallback(stock?: StockRow | null) {
  if (!stock) return false;
  return (
    toStockNumber(stock.stock_nuevo) <= 0 &&
    toStockNumber(stock.stock_usado) <= 0 &&
    toStockNumber(stock.stock_critico) > 0
  );
}

function conditionOptions(detail: DetailForm) {
  const stock = stockRow(detail);
  if (!isIncome.value && usesCriticalFallback(stock)) {
    return [{ title: "Crítico (automático)", value: "CRITICO" as StockCondition }];
  }
  if (isIncome.value) {
    return [
      { title: "Nuevo", value: "NUEVO" as StockCondition },
      { title: "Usado", value: "USADO" as StockCondition },
    ];
  }
  const options: Array<{ title: string; value: StockCondition }> = [
    { title: "Nuevo", value: "NUEVO" },
  ];
  if (stock?.es_usado) options.push({ title: "Usado", value: "USADO" });
  return options;
}

function syncDetailCondition(detail: DetailForm) {
  const options = conditionOptions(detail);
  const current = normalizeCondition(detail.condicionMaterial);
  detail.condicionMaterial = options.some((item) => item.value === current)
    ? current
    : options[0]?.value ?? "NUEVO";
}

function conditionStock(stock: StockRow | null, condition: StockCondition) {
  if (!stock) return 0;
  if (condition === "USADO") return toStockNumber(stock.stock_usado);
  if (condition === "CRITICO") return toStockNumber(stock.stock_critico);
  if (stock.stock_nuevo !== null && stock.stock_nuevo !== undefined) {
    return toStockNumber(stock.stock_nuevo);
  }
  return Math.max(
    toStockNumber(stock.stock_actual) -
      toStockNumber(stock.stock_usado) -
      toStockNumber(stock.stock_critico),
    0,
  );
}

function availableStock(detail: DetailForm) {
  const stock = stockRow(detail);
  if (!stock) return 0;
  const condition = normalizeCondition(detail.condicionMaterial);
  const byCondition = conditionStock(stock, condition);
  if (isIncome.value) return byCondition;
  const transferable = toStockNumber(stock.stock_disponible ?? stock.stock_actual);
  return Math.max(Math.min(byCondition, transferable), 0);
}

function stockLabel(detail: DetailForm) {
  return detail.productoId
    ? formatNumberForDisplay(availableStock(detail))
    : "Selecciona un material";
}

function stockCaption(detail: DetailForm) {
  const stock = stockRow(detail);
  if (!stock) return "Sin stock registrado en esta bodega";
  return [
    `Total ${formatNumberForDisplay(toStockNumber(stock.stock_actual))}`,
    `Nuevo ${formatNumberForDisplay(conditionStock(stock, "NUEVO"))}`,
    `Usado ${formatNumberForDisplay(toStockNumber(stock.stock_usado))}`,
    `Crítico ${formatNumberForDisplay(toStockNumber(stock.stock_critico))}`,
    `Reservado OT ${formatNumberForDisplay(toStockNumber(stock.cantidad_reservada_activa))}`,
  ].join(" · ");
}

/**
 * Un mismo material puede repetirse en varias lineas: lo que importa no es lo
 * que pide cada una sino la suma, tanto por condicion como en total.
 */
function requestedByCondition(detail: DetailForm) {
  const condition = normalizeCondition(detail.condicionMaterial);
  return details.value
    .filter(
      (row) =>
        row.productoId === detail.productoId &&
        normalizeCondition(row.condicionMaterial) === condition,
    )
    .reduce((sum, row) => sum + parsePositive(row.cantidad), 0);
}

function requestedByProduct(detail: DetailForm) {
  return details.value
    .filter((row) => row.productoId === detail.productoId)
    .reduce((sum, row) => sum + parsePositive(row.cantidad), 0);
}

function totalTransferable(detail: DetailForm) {
  const stock = stockRow(detail);
  return stock ? toStockNumber(stock.stock_disponible ?? stock.stock_actual) : 0;
}

function detailExceedsStock(detail: DetailForm) {
  if (isIncome.value || !detail.productoId) return false;
  return (
    requestedByCondition(detail) > availableStock(detail) ||
    requestedByProduct(detail) > totalTransferable(detail)
  );
}

async function save() {
  if (!form.bodegaId) return ui.error("La bodega es obligatoria.");
  const candidates = details.value.filter(
    (detail) =>
      detail.productoId ||
      String(detail.cantidad || "").trim() ||
      String(detail.observacion || "").trim(),
  );
  if (!candidates.length) {
    return ui.error("Debes agregar al menos un material al detalle.");
  }

  const payloadDetails: Array<{
    producto_id: string;
    cantidad: number;
    condicion_material: StockCondition;
    costo_unitario?: number;
    descuento?: number;
    porcentaje_descuento?: number;
    iva_porcentaje?: number;
    observacion?: string;
  }> = [];

  for (const [index, detail] of candidates.entries()) {
    if (!detail.productoId) {
      return ui.error(`Selecciona el material en la fila ${index + 1}.`);
    }
    syncDetailCondition(detail);
    const cantidad = parsePositive(detail.cantidad);
    if (!cantidad) {
      return ui.error(`La cantidad de la fila ${index + 1} debe ser mayor a cero.`);
    }
    if (detailExceedsStock(detail)) {
      return ui.error(
        `La fila ${index + 1} supera el stock transferible de la condición seleccionada.`,
      );
    }
    const precio = showUnitCost.value ? parsePositive(detail.costoUnitario) : 0;
    if (
      showUnitCost.value &&
      String(detail.costoUnitario || "").trim() &&
      !precio
    ) {
      return ui.error(
        `El precio unitario de la fila ${index + 1} debe ser mayor a cero.`,
      );
    }
    const descuento = showUnitCost.value ? parsePositive(detail.descuento) : 0;
    const porcentajeDescuento = showUnitCost.value
      ? parsePositive(detail.porcentajeDescuento)
      : 0;
    if (porcentajeDescuento > 100) {
      return ui.error(
        `El descuento de la fila ${index + 1} no puede pasar del 100 %.`,
      );
    }
    if (descuento > 0 && descuento > lineAmounts(detail).bruto) {
      return ui.error(
        `El descuento de la fila ${index + 1} supera el total de la línea.`,
      );
    }
    const ivaPorcentaje = showUnitCost.value
      ? parsePositive(detail.ivaPorcentaje)
      : 0;
    if (ivaPorcentaje > 100) {
      return ui.error(
        `El IVA de la fila ${index + 1} no puede pasar del 100 %.`,
      );
    }
    payloadDetails.push({
      producto_id: detail.productoId,
      cantidad,
      condicion_material: detail.condicionMaterial,
      // Sin precio el backend sigue valorizando con la regla de siempre.
      costo_unitario: precio || undefined,
      descuento: descuento || undefined,
      porcentaje_descuento: porcentajeDescuento || undefined,
      iva_porcentaje: ivaPorcentaje || undefined,
      observacion: detail.observacion || undefined,
    });
  }

  saving.value = true;
  try {
    await api.post("/kpi_inventory/kardex/documentos", {
      tipo_movimiento: props.movementType,
      fecha_movimiento: form.fecha || undefined,
      bodega_id: form.bodegaId,
      referencia: form.referencia || undefined,
      observacion: form.observacion || undefined,
      created_by: getUserName(),
      updated_by: getUserName(),
      detalles: payloadDetails,
    });
    ui.success(
      `${isIncome.value ? "Ingreso" : "Egreso"} de bodega registrado correctamente.`,
    );
    emit("update:modelValue", false);
    resetForm();
    catalogLoaded.value = false;
    emit("saved");
  } catch (error: any) {
    ui.error(
      error?.response?.data?.message ||
        error?.message ||
        "No se pudo registrar el documento de bodega.",
    );
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) await loadCatalogs(true);
    else if (!saving.value) resetForm();
  },
);
</script>

<style scoped>
.document-editor-table {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color, 100 116 139), 0.2);
  border-radius: 12px;
}

.document-editor-grid {
  width: 100%;
  /* Con precio, descuento, IVA y total el documento pide mas ancho; el
     contenedor ya desplaza en horizontal. */
  min-width: 1320px;
  border-collapse: collapse;
}

.document-editor-grid th,
.document-editor-grid td {
  padding: 8px 10px;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color, 100 116 139), 0.14);
}

.document-editor-grid th {
  text-align: left;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
}

.line-col {
  width: 46px;
}

.material-col {
  min-width: 300px;
}

.condition-col,
.stock-col,
.qty-col,
.price-col {
  min-width: 150px;
}

.discount-col {
  min-width: 128px;
}

.line-total-col {
  min-width: 120px;
  white-space: nowrap;
}

.obs-col {
  min-width: 200px;
}

.action-col {
  width: 60px;
}

.summary-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

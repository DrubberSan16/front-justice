<template>
  <v-dialog
    v-model="model"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 780"
  >
    <v-card rounded="xl" class="employee-form-card">
      <v-card-title class="responsive-header">
        <div class="text-subtitle-1 font-weight-bold">
          {{ isEdit ? "Editar empleado" : "Nuevo empleado" }}
        </div>
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <v-form ref="formRef" @submit.prevent="submit">
          <v-row dense>
            <v-col cols="12">
              <v-autocomplete
                v-model="form.userId"
                :items="userItems"
                item-title="title"
                item-value="value"
                label="Usuario del sistema (si tiene)"
                variant="outlined"
                clearable
                prepend-inner-icon="mdi-account-key-outline"
                :loading="usersLoading"
                no-data-text="No hay usuarios disponibles"
                hint="Si el empleado ya tiene usuario, selecciónalo y se completan sus datos. Si no lo tiene, déjalo vacío y llena los datos completos."
                persistent-hint
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :subtitle="item.raw.subtitle" />
                </template>
              </v-autocomplete>
            </v-col>

            <v-col cols="12" md="8">
              <v-text-field
                v-model="form.name"
                label="Nombres y apellidos"
                variant="outlined"
                maxlength="200"
                autocomplete="off"
                :rules="[rules.name]"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.cedula"
                label="Cédula"
                variant="outlined"
                inputmode="numeric"
                maxlength="10"
                counter="10"
                autocomplete="off"
                :rules="[rules.cedula]"
                :messages="cedulaWarning ? [cedulaWarning] : []"
                :class="{ 'employee-form__warning': !!cedulaWarning }"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.salary"
                label="Sueldo mensual"
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                variant="outlined"
                inputmode="decimal"
                :rules="[rules.salary]"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                :model-value="hourlyText"
                label="Valor por hora"
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                variant="outlined"
                inputmode="decimal"
                :rules="[rules.hourly]"
                :messages="[hourlyHint]"
                @update:model-value="onHourlyInput"
              >
                <template v-if="hourlyManual" #append-inner>
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    prepend-icon="mdi-calculator-variant"
                    @click="resetHourly"
                  >
                    Recalcular
                  </v-btn>
                </template>
              </v-text-field>
            </v-col>

            <v-col cols="12" md="8">
              <v-combobox
                v-model="form.position"
                :items="positionItems"
                :custom-filter="positionFilter"
                label="Cargo"
                variant="outlined"
                clearable
                hide-no-data
                autocomplete="off"
                maxlength="150"
                :rules="[rules.position]"
                hint="Escribe o elige uno ya registrado. Si es nuevo, se guarda y queda disponible en la lista."
                persistent-hint
                @update:search="onPositionSearch"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.status"
                :items="statusItems"
                item-title="title"
                item-value="value"
                label="Estado"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-alert v-if="error" type="error" variant="tonal" class="mt-2">
            {{ error }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close">Cancelar</v-btn>
        <v-btn :loading="loading" color="primary" @click="submit">
          {{ isEdit ? "Guardar cambios" : "Crear" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import type { User } from "@/app/types/users.types";
import type { Employee, EmployeePayload } from "@/app/services/employees.service";
import {
  CEDULA_CHECK_DIGIT_WARNING,
  calculateHourlyRate,
  collapseSpaces,
  isCedulaCheckDigitValid,
  isCedulaFormat,
  normalizeCedula,
  parseMoneyInput,
  roundHalfUp,
  textKey,
  DECIMALES_VALOR_HORA,
} from "@/app/utils/employee-pay";
import {
  formatCurrencyForDisplay,
  formatNumberForInput,
} from "@/app/utils/number-format";

const props = defineProps<{
  modelValue: boolean;
  employee?: Employee | null;
  /** Usuarios del sistema; el formulario ofrece los activos que no tengan empleado. */
  users: User[];
  usersLoading?: boolean;
  /** Usuarios ya vinculados a un empleado (el que se edita cuenta como libre). */
  takenUserIds: string[];
  /** Cargos ya registrados. */
  positions: string[];
  loading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "submit", payload: EmployeePayload): void;
}>();

const { mdAndDown } = useDisplay();
const model = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const isEdit = computed(() => !!props.employee?.id);
const isDialogFullscreen = computed(() => mdAndDown.value);

const statusItems = [
  { title: "ACTIVE", value: "ACTIVE" },
  { title: "INACTIVE", value: "INACTIVE" },
];

const formRef = ref<{ validate: () => Promise<{ valid: boolean }>; resetValidation: () => void } | null>(null);

const form = reactive({
  userId: null as string | null,
  name: "",
  cedula: "",
  salary: "",
  position: null as string | null,
  status: "ACTIVE" as string,
});

// El valor por hora sigue al sueldo mientras nadie lo toque. Si alguien lo
// escribe, queda "fijado a mano" y ya no se recalcula hasta pulsar Recalcular.
const hourlyManual = ref(false);
const hourlyText = ref("");
let hydrating = false;
let lastAutofilledName = "";

// ------------------------------------------------------------- usuario

const takenByOthers = computed(() => {
  const own = props.employee?.user_id ?? null;
  return new Set(props.takenUserIds.filter((id) => id && id !== own));
});

const userItems = computed(() =>
  props.users
    .filter((user) => {
      if (user.isDeleted || takenByOthers.value.has(user.id)) return false;
      // Un usuario inactivo solo se ofrece si ya es el del empleado que se edita.
      return user.status === "ACTIVE" || user.id === props.employee?.user_id;
    })
    .map((user) => ({
      title: collapseSpaces(user.nameSurname) || user.nameUser,
      value: user.id,
      subtitle: [user.nameUser, user.role?.nombre].filter(Boolean).join(" · "),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" })),
);

watch(
  () => form.userId,
  (userId) => {
    if (hydrating || !userId) return;
    const user = props.users.find((item) => item.id === userId);
    if (!user) return;
    // Se llena lo que falta; lo que la persona ya escribió no se pisa.
    const name = collapseSpaces(user.nameSurname);
    if (name && (!collapseSpaces(form.name) || form.name === lastAutofilledName)) {
      form.name = name;
      lastAutofilledName = name;
    }
    const cedula = normalizeCedula(user.identificacion);
    if (!form.cedula && isCedulaFormat(cedula)) form.cedula = cedula;
  },
);

// ------------------------------------------------------------- valor por hora

const salaryNumber = computed(() => parseMoneyInput(form.salary));
const calculatedRate = computed(() =>
  salaryNumber.value !== null && salaryNumber.value > 0
    ? calculateHourlyRate(salaryNumber.value)
    : null,
);

watch(calculatedRate, (rate) => {
  if (hydrating || hourlyManual.value) return;
  hourlyText.value = rate === null ? "" : formatNumberForInput(rate);
});

function onHourlyInput(value: unknown) {
  hourlyText.value = String(value ?? "");
  const typed = parseMoneyInput(value);
  // Escribir justo el valor calculado no es fijarlo a mano.
  hourlyManual.value = !(
    typed !== null &&
    calculatedRate.value !== null &&
    roundHalfUp(typed, DECIMALES_VALOR_HORA) === calculatedRate.value
  );
}

function resetHourly() {
  hourlyManual.value = false;
  hourlyText.value =
    calculatedRate.value === null ? "" : formatNumberForInput(calculatedRate.value);
}

const hourlyHint = computed(() => {
  if (calculatedRate.value === null) {
    return "Se calcula con el sueldo: sueldo ÷ 240 horas (30 días × 8 h).";
  }
  const calculated = formatCurrencyForDisplay(calculatedRate.value);
  return hourlyManual.value
    ? `Fijado a mano. Calculado con el sueldo: ${calculated}.`
    : "Calculado con el sueldo: sueldo ÷ 240 horas (30 días × 8 h). Puedes cambiarlo.";
});

// ------------------------------------------------------------- cargo

const positionItems = computed(() => {
  const seen = new Set<string>();
  return props.positions.filter((position) => {
    const key = textKey(position);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});

function positionFilter(value: unknown, query: string) {
  return textKey(value).includes(textKey(query));
}

// Lo que se teclea en un combo es el cargo aunque no se pulse Enter ni se
// elija de la lista: si no, el texto libre se perdería al guardar.
function onPositionSearch(search: string) {
  if (hydrating) return;
  // Vacío es `null`: con "" el combo cree que ya tiene un valor y ofrece borrarlo.
  form.position = search ? search : null;
}

// ------------------------------------------------------------- validación

const cedulaWarning = computed(() => {
  const cedula = form.cedula;
  return isCedulaFormat(cedula) && !isCedulaCheckDigitValid(cedula)
    ? CEDULA_CHECK_DIGIT_WARNING
    : "";
});

const rules = {
  name: (value: string) =>
    !!collapseSpaces(value) || "Ingresa los nombres y apellidos.",
  cedula: (value: string) =>
    isCedulaFormat(value) || "La cédula debe tener 10 dígitos.",
  salary: (value: string) => {
    const parsed = parseMoneyInput(value);
    return (parsed !== null && parsed > 0) || "Ingresa un sueldo mayor que cero.";
  },
  // Mientras siga al sueldo no hay nada que validar: se calcula al guardar.
  hourly: (value: string) => {
    if (!hourlyManual.value) return true;
    const parsed = parseMoneyInput(value);
    return (parsed !== null && parsed >= 0) || "Ingresa el valor por hora o pulsa Recalcular.";
  },
  position: (value: string | null) =>
    !!collapseSpaces(value) || "Ingresa el cargo.",
};

watch(
  () => form.cedula,
  (value) => {
    // Solo dígitos, hasta diez: la cédula no lleva guiones ni espacios.
    const digits = String(value ?? "").replace(/\D/g, "").slice(0, 10);
    if (digits !== value) form.cedula = digits;
  },
);

// ------------------------------------------------------------- abrir / guardar

/** Un valor fijado a mano puede traer hasta cuatro decimales; se muestran sin ceros de más. */
function rateForInput(value: number) {
  return String(roundHalfUp(Number(value), DECIMALES_VALOR_HORA));
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    hydrating = true;
    const employee = props.employee;
    lastAutofilledName = "";
    if (employee) {
      form.userId = employee.user_id ?? null;
      form.name = employee.nombres_apellidos ?? "";
      form.cedula = employee.cedula ?? "";
      form.salary = formatNumberForInput(employee.sueldo);
      form.position = employee.cargo || null;
      form.status = employee.status || "ACTIVE";
      hourlyManual.value = employee.valor_hora_manual === true;
      hourlyText.value = hourlyManual.value
        ? rateForInput(employee.valor_hora)
        : formatNumberForInput(employee.valor_hora);
    } else {
      form.userId = null;
      form.name = "";
      form.cedula = "";
      form.salary = "";
      form.position = null;
      form.status = "ACTIVE";
      hourlyManual.value = false;
      hourlyText.value = "";
    }
    // El watcher de `calculatedRate` no debe pisar lo que acaba de cargarse.
    queueMicrotask(() => {
      hydrating = false;
      formRef.value?.resetValidation();
    });
  },
  { immediate: true },
);

function close() {
  model.value = false;
}

async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;

  const salary = parseMoneyInput(form.salary) as number;
  const hourly = parseMoneyInput(hourlyText.value);
  emit("submit", {
    user_id: form.userId || null,
    nombres_apellidos: collapseSpaces(form.name),
    cedula: form.cedula,
    sueldo: roundHalfUp(salary, 2),
    // `null` pide al servidor el cálculo; un número lo fija a mano.
    valor_hora: hourlyManual.value && hourly !== null ? hourly : null,
    cargo: collapseSpaces(form.position),
    status: form.status || "ACTIVE",
  });
}
</script>

<style scoped>
.employee-form-card {
  min-height: 100%;
}

/* El aviso de cédula usa el color de advertencia del tema, no el de error:
   el dato se puede guardar. */
.employee-form__warning :deep(.v-messages__message) {
  color: rgb(var(--v-theme-warning));
}
</style>

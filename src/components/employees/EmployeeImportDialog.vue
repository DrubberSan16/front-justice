<template>
  <v-dialog
    v-model="model"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 1180"
    :persistent="importing"
  >
    <v-card rounded="xl" class="employee-import-card">
      <v-card-title class="responsive-header">
        <div class="text-subtitle-1 font-weight-bold">Importar empleados desde Excel</div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Cerrar"
          :disabled="importing"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <!-- 1. Elegir el archivo -->
        <template v-if="phase === 'pick'">
          <p class="text-body-2 mb-3">
            Sube un Excel con las columnas
            <strong>NOMBRES, CEDULA, SUELDO y CARGO</strong>. El
            <strong>valor por hora</strong> no hace falta ponerlo: se calcula solo con el
            sueldo (sueldo ÷ 240 horas). Antes de guardar verás cómo quedaría cada fila.
          </p>
          <ul class="text-body-2 text-medium-emphasis mb-4 employee-import__notes">
            <li>Si la cédula ya está registrada, se actualizan su nombre, sueldo y cargo.</li>
            <li>
              A quien ya tenga un valor por hora fijado a mano no se le cambia, aunque
              cambie el sueldo.
            </li>
            <li>
              Excel suele quitar el cero inicial de la cédula (0604621326 queda como
              604621326): aquí se repone solo.
            </li>
          </ul>

          <v-file-input
            v-model="pickedFile"
            label="Archivo de Excel (.xlsx o .xls)"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            variant="outlined"
            prepend-icon=""
            prepend-inner-icon="mdi-file-excel-outline"
            show-size
            clearable
            :loading="reading"
            @update:model-value="onFilePicked"
          />

          <v-alert v-if="readError" type="error" variant="tonal" class="mt-2">
            {{ readError }}
          </v-alert>

          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-download"
            class="mt-2 px-0"
            :loading="downloadingTemplate"
            @click="downloadTemplate"
          >
            Descargar el formato en blanco
          </v-btn>
        </template>

        <!-- 2. Revisar antes de guardar -->
        <template v-else-if="phase === 'preview'">
          <div class="d-flex flex-wrap align-center mb-3" style="gap: 8px">
            <v-chip size="small" variant="tonal" prepend-icon="mdi-file-excel-outline">
              {{ fileName }} · hoja «{{ sheetName }}»
            </v-chip>
            <v-chip size="small" color="success" variant="tonal">
              {{ counts.new }} nuevos
            </v-chip>
            <v-chip size="small" color="info" variant="tonal">
              {{ counts.update }} se actualizan
            </v-chip>
            <v-chip v-if="counts.same" size="small" variant="tonal">
              {{ counts.same }} sin cambios
            </v-chip>
            <v-chip v-if="counts.error" size="small" color="error" variant="tonal">
              {{ counts.error }} con error (no se importan)
            </v-chip>
            <v-chip v-if="counts.warning" size="small" color="warning" variant="tonal">
              {{ counts.warning }} para revisar
            </v-chip>
          </div>

          <v-checkbox
            v-model="linkUsers"
            color="primary"
            density="compact"
            hide-details
            class="mb-2"
            :label="`Vincular con el usuario del sistema cuando el nombre coincide (${counts.linked} encontrados)`"
          />

          <v-data-table
            :headers="headers"
            :items="previewRows"
            item-value="row"
            density="compact"
            height="400"
            fixed-header
            :items-per-page="-1"
            hide-default-footer
            class="elevation-0 enterprise-table employee-import__table"
          >
            <template #item.salary="{ item }">
              {{ item.salary === null ? "—" : formatCurrencyForDisplay(item.salary) }}
            </template>
            <template #item.hourlyRate="{ item }">
              <span :title="item.hourlyRate === null ? '' : `Exacto: ${item.hourlyRate}`">
                {{ item.hourlyRate === null ? "—" : formatCurrencyForDisplay(item.hourlyRate) }}
              </span>
              <v-chip
                v-if="item.manualKept"
                size="x-small"
                color="warning"
                variant="tonal"
                class="ml-1"
                title="Fijado a mano: no cambia con el sueldo"
              >
                Manual
              </v-chip>
            </template>
            <template #item.user="{ item }">
              <span v-if="item.userLabel">{{ item.userLabel }}</span>
              <span v-else class="text-medium-emphasis">—</span>
            </template>
            <template #item.status="{ item }">
              <div class="employee-import__status">
                <v-chip
                  size="x-small"
                  :color="OUTCOME_COLOR[item.outcome]"
                  variant="tonal"
                >
                  {{ OUTCOME_LABEL[item.outcome] }}
                </v-chip>
                <div
                  v-for="message in item.errors"
                  :key="message"
                  class="text-caption text-error"
                >
                  {{ message }}
                </div>
                <div
                  v-for="message in item.warnings"
                  :key="message"
                  class="text-caption employee-import__warning"
                >
                  {{ message }}
                </div>
              </div>
            </template>
          </v-data-table>

          <v-alert v-if="importError" type="error" variant="tonal" class="mt-3">
            {{ importError }}
          </v-alert>
        </template>

        <!-- 3. Resultado -->
        <template v-else>
          <v-alert
            :type="result && result.omitidos ? 'warning' : 'success'"
            variant="tonal"
            class="mb-3"
          >
            <div class="font-weight-bold mb-1">Importación terminada</div>
            <div>
              {{ result?.creados ?? 0 }} creados ·
              {{ result?.actualizados ?? 0 }} actualizados ·
              {{ result?.sin_cambios ?? 0 }} sin cambios ·
              {{ result?.omitidos ?? 0 }} omitidos
            </div>
          </v-alert>

          <template v-if="result?.errores?.length">
            <div class="text-subtitle-2 mb-2">Filas que no se guardaron</div>
            <v-table density="compact" class="employee-import__errors">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="failure in result.errores" :key="`${failure.fila}-${failure.cedula}`">
                  <td>{{ failure.fila }}</td>
                  <td>{{ failure.nombres_apellidos || "—" }}</td>
                  <td>{{ failure.cedula || "—" }}</td>
                  <td class="text-error">{{ failure.mensaje }}</td>
                </tr>
              </tbody>
            </v-table>
          </template>
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          v-if="phase === 'preview'"
          variant="text"
          prepend-icon="mdi-arrow-left"
          :disabled="importing"
          @click="backToPick"
        >
          Cambiar archivo
        </v-btn>
        <v-spacer />
        <v-btn v-if="phase !== 'done'" variant="text" :disabled="importing" @click="close">
          Cancelar
        </v-btn>
        <v-btn
          v-if="phase === 'preview'"
          color="primary"
          :loading="importing"
          :disabled="!importable.length"
          prepend-icon="mdi-database-import-outline"
          @click="runImport"
        >
          Importar {{ importable.length }} {{ importable.length === 1 ? "empleado" : "empleados" }}
        </v-btn>
        <v-btn v-if="phase === 'done'" color="primary" @click="close">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import type { User } from "@/app/types/users.types";
import {
  fetchAllEmployees,
  importEmployees,
  employeeErrorMessage,
  type Employee,
  type EmployeeImportResult,
} from "@/app/services/employees.service";
import {
  EmployeeImportError,
  buildEmployeeTemplateBlob,
  classifyImportRow,
  createPositionResolver,
  findSimilarPositions,
  parseEmployeeWorkbook,
  suggestUserForPerson,
  type ImportOutcome,
  type ImportRow,
  type UserCandidate,
} from "@/app/utils/employee-import";
import { textKey } from "@/app/utils/employee-pay";
import { formatCurrencyForDisplay } from "@/app/utils/number-format";

const props = defineProps<{
  modelValue: boolean;
  /** Usuarios del sistema, para proponer el vínculo por nombre. */
  users: User[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "imported"): void;
}>();

const { mdAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);
const model = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const OUTCOME_LABEL: Record<ImportOutcome, string> = {
  new: "Nuevo",
  update: "Actualiza",
  same: "Sin cambios",
  error: "Error",
};
const OUTCOME_COLOR: Record<ImportOutcome, string> = {
  new: "success",
  update: "info",
  same: "default",
  error: "error",
};

const headers = [
  { title: "Fila", key: "row", width: 64, sortable: false },
  { title: "Nombres y apellidos", key: "name", sortable: false },
  { title: "Cédula", key: "cedula", sortable: false },
  { title: "Sueldo", key: "salary", align: "end" as const, sortable: false },
  { title: "Valor por hora", key: "hourlyRate", align: "end" as const, sortable: false },
  { title: "Cargo", key: "position", sortable: false },
  { title: "Usuario", key: "user", sortable: false },
  { title: "Estado", key: "status", sortable: false },
];

type Phase = "pick" | "preview" | "done";
const phase = ref<Phase>("pick");
const pickedFile = ref<File | File[] | null>(null);
const fileName = ref("");
const sheetName = ref("");
const reading = ref(false);
const readError = ref("");
const downloadingTemplate = ref(false);
const importing = ref(false);
const importError = ref("");
const result = ref<EmployeeImportResult | null>(null);
const parsedRows = ref<ImportRow[]>([]);
const existing = ref<Employee[]>([]);
const linkUsers = ref(true);

type PreviewRow = ImportRow & {
  outcome: ImportOutcome;
  userId: string | null;
  userLabel: string;
  /** El empleado tiene el valor por hora fijado a mano: la importación no lo toca. */
  manualKept: boolean;
};

const existingByCedula = computed(
  () => new Map(existing.value.map((employee) => [employee.cedula, employee])),
);

/** Usuarios que se pueden proponer: activos y sin empleado. */
const candidateUsers = computed<UserCandidate[]>(() => {
  const taken = new Set(existing.value.map((e) => e.user_id).filter(Boolean) as string[]);
  return props.users
    .filter((user) => !user.isDeleted && user.status === "ACTIVE" && !taken.has(user.id))
    .map((user) => ({
      id: user.id,
      name_user: user.nameUser,
      name_surname: user.nameSurname,
      identificacion: user.identificacion ?? null,
    }));
});

const previewRows = computed<PreviewRow[]>(() => {
  const claimed = new Set<string>();
  const existingPositions = existing.value.map((e) => e.cargo);
  const resolvePosition = createPositionResolver(existingPositions);
  const finalPositions = parsedRows.value.map((row) =>
    row.errors.length ? row.position : resolvePosition(row.position),
  );
  // Un cargo casi igual a otro más usado suele ser un error de tipeo del archivo.
  const similar = findSimilarPositions(
    finalPositions.filter((_, index) => !parsedRows.value[index]?.errors.length),
    existingPositions,
  );
  return parsedRows.value.map((original, index) => {
    const current = existingByCedula.value.get(original.cedula);
    const valid = !original.errors.length;
    // Lo que se ve es lo que se guarda: el cargo con la escritura ya registrada y el
    // valor por hora fijado a mano, que la importación respeta.
    const manualKept = valid && current?.valor_hora_manual === true;
    const position = finalPositions[index] ?? original.position;
    const likeness = valid ? similar.get(textKey(position)) : undefined;
    const row: ImportRow = {
      ...original,
      position,
      hourlyRate: manualKept ? Number(current?.valor_hora) : original.hourlyRate,
      warnings: likeness
        ? [...original.warnings, `Cargo parecido a «${likeness}»: revisa si es el mismo.`]
        : original.warnings,
    };
    const outcome = classifyImportRow(row, current);
    let userId: string | null = null;
    let userLabel = current?.usuario ? current.usuario.name_user : "";
    if (!row.errors.length && !current?.user_id && linkUsers.value) {
      const suggestion = suggestUserForPerson(
        { name: row.name, cedula: row.cedula },
        candidateUsers.value.filter((user) => !claimed.has(user.id)),
      );
      if (suggestion) {
        claimed.add(suggestion.id);
        userId = suggestion.id;
        userLabel = suggestion.name_user;
      }
    }
    return { ...row, outcome, userId, userLabel, manualKept };
  });
});

const counts = computed(() => ({
  new: previewRows.value.filter((row) => row.outcome === "new").length,
  update: previewRows.value.filter((row) => row.outcome === "update").length,
  same: previewRows.value.filter((row) => row.outcome === "same").length,
  error: previewRows.value.filter((row) => row.outcome === "error").length,
  warning: previewRows.value.filter((row) => !row.errors.length && row.warnings.length).length,
  linked: previewRows.value.filter((row) => row.userId).length,
}));

const importable = computed(() => previewRows.value.filter((row) => !row.errors.length));

// ------------------------------------------------------------- flujo

function resetState() {
  phase.value = "pick";
  pickedFile.value = null;
  fileName.value = "";
  sheetName.value = "";
  readError.value = "";
  importError.value = "";
  result.value = null;
  parsedRows.value = [];
  linkUsers.value = true;
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    resetState();
    // Para saber quién ya está registrado (nuevo o actualización) y qué usuarios están tomados.
    try {
      existing.value = await fetchAllEmployees();
    } catch {
      existing.value = [];
    }
  },
  { immediate: true },
);

async function onFilePicked(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value;
  readError.value = "";
  if (!file) return;
  reading.value = true;
  try {
    const parsed = parseEmployeeWorkbook(await file.arrayBuffer());
    parsedRows.value = parsed.rows;
    sheetName.value = parsed.sheetName;
    fileName.value = file.name;
    phase.value = "preview";
  } catch (error) {
    readError.value =
      error instanceof EmployeeImportError
        ? error.message
        : "No pude leer el archivo. Comprueba que sea un Excel válido.";
  } finally {
    reading.value = false;
  }
}

function backToPick() {
  resetState();
}

async function runImport() {
  if (importing.value || !importable.value.length) return;
  importing.value = true;
  importError.value = "";
  try {
    result.value = await importEmployees(
      importable.value.map((row) => ({
        fila: row.row,
        nombres_apellidos: row.name,
        cedula: row.cedula,
        sueldo: row.salary as number,
        cargo: row.position,
        user_id: row.userId,
      })),
    );
    phase.value = "done";
    emit("imported");
  } catch (error) {
    importError.value = employeeErrorMessage(error, "No se pudo importar el archivo.");
  } finally {
    importing.value = false;
  }
}

async function downloadTemplate() {
  downloadingTemplate.value = true;
  try {
    const blob = await buildEmployeeTemplateBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "formato_personal.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    readError.value = "No se pudo generar el formato.";
  } finally {
    downloadingTemplate.value = false;
  }
}

function close() {
  if (importing.value) return;
  model.value = false;
}
</script>

<style scoped>
.employee-import-card {
  min-height: 100%;
}

.employee-import__notes {
  padding-left: 1.25rem;
}

.employee-import__status {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding-block: 4px;
}

.employee-import__warning {
  color: rgb(var(--v-theme-warning));
}

.employee-import__errors {
  max-height: 320px;
  overflow: auto;
}
</style>

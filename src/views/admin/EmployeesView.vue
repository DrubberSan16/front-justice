<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar el módulo de Empleados.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-3">
      <div>
        <div class="text-h6 font-weight-bold">Empleados</div>
        <div class="text-body-2 text-medium-emphasis">
          Personal de la empresa con su cargo, sueldo y valor por hora.
        </div>
      </div>

      <div class="d-flex flex-wrap justify-end" style="gap: 8px">
        <v-btn
          v-if="canCreate"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-file-excel-outline"
          @click="openImport"
        >
          Importar Excel
        </v-btn>
        <v-btn
          v-if="canCreate"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nuevo empleado
        </v-btn>
      </div>
    </div>

    <v-row class="mb-2" dense>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
          label="Buscar (nombre, cédula, cargo)"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          @update:model-value="scheduleLoad"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="statusFilter"
          :items="statusItems"
          item-title="title"
          item-value="value"
          label="Estado"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="applyFilters"
        />
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-3">
      {{ error }}
    </v-alert>

    <v-data-table-server
      :headers="headers"
      :items="rows"
      :items-length="total"
      :loading="loading"
      loading-text="Obteniendo empleados..."
      :items-per-page="itemsPerPage"
      :items-per-page-options="[10, 20, 50, 100]"
      :page="page"
      class="elevation-0 enterprise-table employees-table"
      @update:options="onOptionsUpdate"
    >
      <template #item.sueldo="{ item }">
        {{ formatCurrencyForDisplay(item.sueldo) }}
      </template>

      <template #item.valor_hora="{ item }">
        <div class="d-inline-flex align-center" style="gap: 6px">
          <span>{{ formatCurrencyForDisplay(item.valor_hora) }}</span>
          <v-chip
            v-if="item.valor_hora_manual"
            size="x-small"
            color="warning"
            variant="tonal"
            title="Fijado a mano: no sigue al sueldo"
          >
            Manual
          </v-chip>
        </div>
      </template>

      <template #item.usuario="{ item }">
        <span v-if="item.usuario">{{ item.usuario.name_user }}</span>
        <span v-else class="text-medium-emphasis">Sin usuario</span>
      </template>

      <template #item.status="{ item }">
        <v-chip
          size="small"
          :color="item.status === 'ACTIVE' ? 'green' : 'grey'"
          variant="tonal"
        >
          {{ item.status }}
        </v-chip>
      </template>

      <template #item.actions="{ item }">
        <RowActionsMenu :actions="rowActions()" @select="(key) => runRowAction(key, item)" />
      </template>

      <template #no-data>
        <div class="py-6 text-center text-medium-emphasis">
          <template v-if="search || statusFilter !== 'ALL'">
            Ningún empleado coincide con la búsqueda.
          </template>
          <template v-else>
            Aún no hay empleados registrados.
            <span v-if="canCreate">
              Crea uno con «Nuevo empleado» o carga el Excel del personal con «Importar Excel».
            </span>
          </template>
        </div>
      </template>
    </v-data-table-server>
  </v-card>

  <EmployeeFormDialog
    v-model="formDialog"
    :employee="selected"
    :users="usersStore.items"
    :users-loading="usersStore.loading"
    :taken-user-ids="takenUserIds"
    :positions="positions"
    :loading="saving"
    :error="formError"
    @submit="onSubmit"
  />

  <EmployeeImportDialog
    v-model="importDialog"
    :users="usersStore.items"
    @imported="onImported"
  />

  <v-dialog v-model="deleteDialog" max-width="460">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar empleado</v-card-title>
      <v-card-text>
        ¿Eliminar a <strong>{{ selected?.nombres_apellidos }}</strong>? Su cédula y su usuario
        quedan libres para volver a registrarse.
        <v-alert v-if="deleteError" type="error" variant="tonal" class="mt-3">
          {{ deleteError }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="saving" @click="confirmDelete">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { useUsersStore } from "@/app/stores/users.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { formatCurrencyForDisplay } from "@/app/utils/number-format";
import type { RowAction } from "@/app/utils/row-actions";
import {
  createEmployee,
  deleteEmployee,
  employeeErrorMessage,
  fetchAllEmployees,
  fetchEmployeePositions,
  fetchEmployees,
  updateEmployee,
  type Employee,
  type EmployeePayload,
} from "@/app/services/employees.service";
import RowActionsMenu from "@/components/ui/RowActionsMenu.vue";
import EmployeeFormDialog from "@/components/employees/EmployeeFormDialog.vue";
import EmployeeImportDialog from "@/components/employees/EmployeeImportDialog.vue";

const menuStore = useMenuStore();
const ui = useUiStore();
const usersStore = useUsersStore();

const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["empleados"]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);

const statusItems = [
  { title: "Todos", value: "ALL" },
  { title: "ACTIVE", value: "ACTIVE" },
  { title: "INACTIVE", value: "INACTIVE" },
];

const headers = computed(() => [
  { title: "Nombres y apellidos", key: "nombres_apellidos", sortable: false },
  { title: "Cédula", key: "cedula", sortable: false },
  { title: "Cargo", key: "cargo", sortable: false },
  { title: "Sueldo", key: "sueldo", align: "end" as const, sortable: false },
  { title: "Valor por hora", key: "valor_hora", align: "end" as const, sortable: false },
  { title: "Usuario", key: "usuario", sortable: false },
  { title: "Estado", key: "status", sortable: false },
  ...(canEdit.value || canDelete.value
    ? [{ title: "Acciones", key: "actions", sortable: false }]
    : []),
]);

// ------------------------------------------------------------- lista

const rows = ref<Employee[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const statusFilter = ref<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
const page = ref(1);
const itemsPerPage = ref(20);
let requestId = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function loadRows() {
  const current = ++requestId;
  loading.value = true;
  error.value = null;
  try {
    const response = await fetchEmployees(
      { search: search.value, status: statusFilter.value },
      page.value,
      itemsPerPage.value,
    );
    // Una respuesta lenta de una búsqueda anterior no pisa a la última.
    if (current !== requestId) return;
    rows.value = response.data;
    total.value = response.total;
  } catch (e) {
    if (current !== requestId) return;
    error.value = employeeErrorMessage(e, "No se pudieron cargar los empleados.");
  } finally {
    if (current === requestId) loading.value = false;
  }
}

function scheduleLoad() {
  if (searchTimer) clearTimeout(searchTimer);
  loading.value = true;
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    void loadRows();
  }, 350);
}

function applyFilters() {
  page.value = 1;
  void loadRows();
}

function onOptionsUpdate(options: { page?: number; itemsPerPage?: number }) {
  const nextPage = Number(options?.page || page.value || 1);
  const nextLimit = Number(options?.itemsPerPage || itemsPerPage.value || 20);
  if (nextPage === page.value && nextLimit === itemsPerPage.value) return;
  page.value = nextPage;
  itemsPerPage.value = nextLimit;
  void loadRows();
}

// ------------------------------------------------------------- datos de los diálogos

const positions = ref<string[]>([]);
const linkedUserIds = ref<string[]>([]);
const takenUserIds = computed(() => linkedUserIds.value);

async function loadPositions() {
  try {
    positions.value = await fetchEmployeePositions();
  } catch {
    positions.value = [];
  }
}

/** Qué usuarios ya tienen empleado, para no ofrecerlos otra vez. */
async function loadLinkedUsers() {
  try {
    const all = await fetchAllEmployees();
    linkedUserIds.value = all.map((employee) => employee.user_id).filter(Boolean) as string[];
  } catch {
    linkedUserIds.value = [];
  }
}

async function loadDialogData() {
  await Promise.allSettled([usersStore.fetchAll(), loadPositions(), loadLinkedUsers()]);
}

// ------------------------------------------------------------- crear / editar

const formDialog = ref(false);
const importDialog = ref(false);
const deleteDialog = ref(false);
const selected = ref<Employee | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const deleteError = ref<string | null>(null);

function openCreate() {
  selected.value = null;
  formError.value = null;
  formDialog.value = true;
  void loadDialogData();
}

function openEdit(employee: Employee) {
  selected.value = employee;
  formError.value = null;
  formDialog.value = true;
  void loadDialogData();
}

function openImport() {
  importDialog.value = true;
  // El diálogo propone vínculos con usuarios: necesita la lista al día.
  void usersStore.fetchAll().catch(() => undefined);
}

async function onSubmit(payload: EmployeePayload) {
  if (saving.value) return;
  saving.value = true;
  formError.value = null;
  try {
    if (selected.value) await updateEmployee(selected.value.id, payload);
    else await createEmployee(payload);
    formDialog.value = false;
    ui.success("Guardado con exito");
    await Promise.all([loadRows(), loadPositions()]);
  } catch (e) {
    formError.value = employeeErrorMessage(e, "No se pudo guardar el empleado.");
  } finally {
    saving.value = false;
  }
}

async function onImported() {
  await Promise.all([loadRows(), loadPositions()]);
}

// ------------------------------------------------------------- eliminar

function openDelete(employee: Employee) {
  selected.value = employee;
  deleteError.value = null;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!selected.value || saving.value) return;
  saving.value = true;
  deleteError.value = null;
  try {
    await deleteEmployee(selected.value.id);
    deleteDialog.value = false;
    ui.success("Eliminado con exito");
    await Promise.all([loadRows(), loadPositions()]);
  } catch (e) {
    deleteError.value = employeeErrorMessage(e, "No se pudo eliminar el empleado.");
  } finally {
    saving.value = false;
  }
}

// ------------------------------------------------------------- acciones de fila

function rowActions(): RowAction[] {
  return [
    { key: "edit", label: "Editar", icon: "mdi-pencil", hidden: !canEdit.value },
    {
      key: "delete",
      label: "Eliminar",
      icon: "mdi-delete",
      color: "error",
      divider: true,
      hidden: !canDelete.value,
    },
  ];
}

function runRowAction(key: string, employee: Employee) {
  if (key === "edit") openEdit(employee);
  else if (key === "delete") openDelete(employee);
}

onMounted(() => {
  if (!canRead.value) return;
  void loadRows();
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.employees-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}
</style>

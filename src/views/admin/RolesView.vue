<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar el módulo de Roles.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-3">
      <div>
        <div class="text-h6 font-weight-bold">Roles</div>
        <div class="text-body-2 text-medium-emphasis">
          Administración de roles y perfilería por menú.
        </div>
      </div>

      <v-btn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="openCreate">
        Nuevo rol
      </v-btn>
    </div>

    <!-- FILTROS -->
    <v-row class="mb-2" dense>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="roles.search"
          label="Buscar (nombre, descripción)"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-select
          v-model="roles.statusFilter"
          :items="statusItems"
          item-title="title"
          item-value="value"
          label="Estado"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-select
          v-model="itemsPerPage"
          :items="[5,10,20,50]"
          label="Por página"
          variant="outlined"
          density="compact"
        />
      </v-col>
    </v-row>

    <v-alert v-if="roles.error" type="error" variant="tonal" class="mb-3">
      {{ roles.error }}
    </v-alert>

    <v-data-table
      :headers="headers"
      :items="roles.filtered"
      :loading="roles.loading"
      loading-text="Obteniendo roles..."
      :items-per-page="itemsPerPage"
      class="elevation-0 enterprise-table roles-table"
    >
      <template #item.status="{ item }">
        <v-chip size="small" :color="item.status === 'ACTIVE' ? 'green' : 'grey'" variant="tonal">
          {{ item.status }}
        </v-chip>
      </template>

      <!-- ACCIONES: OCULTAR por permisos -->
      <template #item.actions="{ item }">
        <div class="responsive-actions">
          <v-btn
            v-if="canEdit"
            icon="mdi-pencil"
            variant="text"
            @click="openEdit(item)"
          />
          <v-btn
            v-if="canDelete"
            icon="mdi-delete"
            variant="text"
            color="error"
            @click="openDelete(item)"
          />
        </div>
      </template>
    </v-data-table>
  </v-card>

  <!-- MODALES -->
  <RoleFormDialog
    v-model="formDialog"
    :role="selectedRole"
    :loading="busy"
    :error="formError"
    @submit="onSubmitRole"
  />

  <RoleDeleteDialog
    v-model="deleteDialog"
    :role="selectedRole"
    :loading="busy"
    :error="formError"
    @confirm="onConfirmDelete"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { useRolesStore } from "@/app/stores/roles.store";
import { useMenuRolesStore } from "@/app/stores/menu-roles.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useUiStore } from "@/app/stores/ui.store";

import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { createLogTransact } from "@/app/services/log-transacts.service";

import type { Role } from "@/app/types/roles.types";
import RoleFormDialog from "@/components/roles/RoleFormDialog.vue";
import RoleDeleteDialog from "@/components/roles/RoleDeleteDialog.vue";

const roles = useRolesStore();
const menuRoles = useMenuRolesStore();

const menuStore = useMenuStore();   // menú del usuario (tree/by-user)
const auth = useAuthStore();
const ui = useUiStore();

const itemsPerPage = ref(10);

const headers = computed(() => [
  { title: "Nombre", key: "nombre" },
  { title: "Descripción", key: "descripcion" },
  { title: "Estado", key: "status" },
  ...(canEdit.value || canDelete.value
    ? [{ title: "Acciones", key: "actions", sortable: false }]
    : []),
]);

const statusItems = [
  { title: "Todos", value: "ALL" },
  { title: "ACTIVE", value: "ACTIVE" },
  { title: "INACTIVE", value: "INACTIVE" },
];

// permisos del módulo Roles (acepta alias de urlComponent)
const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, ["Rol", "Roles"])
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);

const formDialog = ref(false);
const deleteDialog = ref(false);
const selectedRole = ref<Role | null>(null);

const busy = ref(false);
const formError = ref<string | null>(null);

onMounted(async () => {
  if (!canRead.value) return;
  await roles.fetchAll(false);
});

function openCreate() {
  selectedRole.value = null;
  formError.value = null;
  formDialog.value = true;
}

async function openEdit(r: Role) {
  selectedRole.value = r;
  formError.value = null;
  // el RoleFormDialog al abrir carga menuRoles.fetchByRole(r.id)
  formDialog.value = true;
}

function openDelete(r: Role) {
  selectedRole.value = r;
  formError.value = null;
  deleteDialog.value = true;
}

function currentUserName() {
  return auth.user?.nameUser || "admin";
}

async function logAndShowTechnicalError(typeLog: string, description: string) {
  const ticket = await createLogTransact({
    moduleMicroservice: "kpi_security",
    status: "ACTIVE",
    typeLog,
    description,
    createdBy: currentUserName(),
  });

  ui.error(
    ticket
      ? `Error técnico, información enviada al equipo técnico TICKET: ${ticket}`
      : "Error técnico, información enviada al equipo técnico"
  );
}

async function onSubmitRole(payload: any) {
  if (busy.value) return;
  busy.value = true;
  formError.value = null;

  try {
    let roleId: string;

    if (!selectedRole.value) {
      const created = await roles.createRole({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        status: payload.status,
        reportes: payload.reportes,
      });

      roleId = created.id;
    } else {
      roleId = selectedRole.value.id;

      await roles.updateRole(roleId, {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        status: payload.status,
        reportes: payload.reportes,
        createdBy: currentUserName(),
      });
    }

    // 🔥 SINCRONIZACIÓN UNA SOLA VEZ
    await menuRoles.sync(roleId, currentUserName());

    ui.success("Guardado con éxito");

    formDialog.value = false;

    // refrescar listado una sola vez
    await roles.fetchAll(false);

  } catch (e: any) {
    const details =
      `Roles module error\n` +
      `action=${selectedRole.value ? "UPDATE" : "CREATE"}\n` +
      `roleId=${selectedRole.value?.id ?? "new"}\n` +
      `payload=${JSON.stringify(payload)}\n` +
      `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;

    await logAndShowTechnicalError(
      selectedRole.value ? "ROLE_UPDATE" : "ROLE_CREATE",
      details
    );
  } finally {
    busy.value = false;
  }
}

async function onConfirmDelete() {
  if (!selectedRole.value) return;

  busy.value = true;
  formError.value = null;

  try {
    await roles.deleteRole(selectedRole.value.id);
    ui.success("Eliminado con éxito");
    deleteDialog.value = false;
    // NOTA: el store de roles al eliminar hace un fetchAll() para refrescar la lista
    await roles.fetchAll(false);
  } catch (e: any) {
    const details =
      `Roles module error\n` +
      `action=DELETE\n` +
      `roleId=${selectedRole.value.id}\n` +
      `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;

    await logAndShowTechnicalError("ROLE_DELETE", details);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.roles-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 960px) {
  .roles-table :deep(.v-data-table-footer__items-per-page),
  .roles-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

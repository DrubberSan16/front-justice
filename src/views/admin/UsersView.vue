<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar el modulo de Usuarios.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4 enterprise-surface">
    <div class="responsive-header mb-3">
      <div>
        <div class="text-h6 font-weight-bold">Usuarios</div>
        <div class="text-body-2 text-medium-emphasis">
          Lista de usuarios con sus roles, reportes y sucursales habilitadas.
        </div>
      </div>

      <v-btn
        v-if="canCreate"
        color="primary"
        prepend-icon="mdi-plus"
        @click="openCreate"
      >
        Nuevo usuario
      </v-btn>
    </div>

    <v-row class="mb-2" dense>
      <v-col cols="12" md="5">
        <v-text-field
          v-model="users.search"
          label="Buscar (usuario, nombre, email, rol)"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-select
          v-model="users.statusFilter"
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
          v-model="users.roleFilter"
          :items="roleItems"
          item-title="title"
          item-value="value"
          label="Rol"
          variant="outlined"
          density="compact"
          :loading="roles.loading"
        />
      </v-col>

      <v-col v-if="canManageDeleted" cols="12" md="1" class="d-flex align-center">
        <v-checkbox
          v-model="users.includeDeleted"
          label="Eliminados"
          density="compact"
        />
      </v-col>
    </v-row>

    <v-alert v-if="users.error" type="error" variant="tonal" class="mb-3">
      {{ users.error }}
    </v-alert>

    <v-data-table
      :headers="headers"
      :items="users.filtered"
      :loading="users.loading"
      loading-text="Obteniendo usuarios..."
      :items-per-page="itemsPerPage"
      class="elevation-0 enterprise-table users-table"
    >
      <template #item.status="{ item }">
        <v-chip
          size="small"
          :color="item.status === 'ACTIVE' ? 'green' : 'grey'"
          variant="tonal"
        >
          {{ item.status }}
        </v-chip>
      </template>

      <template #item.isDeleted="{ item }">
        <v-chip size="small" :color="item.isDeleted ? 'red' : 'green'" variant="tonal">
          {{ item.isDeleted ? "Si" : "No" }}
        </v-chip>
      </template>

      <template #item.role="{ item }">
        {{ roles.getRoleName(item.roleId) }}
      </template>

      <template #item.sucursales="{ item }">
        {{
          item.allSucursales
            ? "Todas"
            : formatSucursales(item.effectiveSucursales)
        }}
      </template>

      <template #item.actions="{ item }">
        <div class="responsive-actions">
          <v-btn
            v-if="canEdit && !item.isDeleted"
            icon="mdi-pencil"
            variant="text"
            @click="openEdit(item)"
          />
          <v-btn
            v-if="canDelete && !item.isDeleted"
            icon="mdi-delete"
            variant="text"
            color="error"
            @click="openDelete(item)"
          />
        </div>
      </template>

      <template #bottom>
        <div class="responsive-header px-2 py-2">
          <div class="text-caption text-medium-emphasis">
            Total: {{ users.filtered.length }}
          </div>

          <div class="responsive-actions">
            <v-select
              v-model="itemsPerPage"
              :items="[5, 10, 20, 50]"
              label="Por pagina"
              variant="outlined"
              density="compact"
              style="max-width: 140px;"
            />
          </div>
        </div>
      </template>
    </v-data-table>
  </v-card>

  <UserFormDialog
    v-model="formDialog"
    :user="selectedUser"
    :loading="busy"
    :error="users.error"
    @submit="onSubmitForm"
  />

  <UserDeleteDialog
    v-model="deleteDialog"
    :user="selectedUser"
    :loading="busy"
    :error="users.error"
    @confirm="onConfirmDelete"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { useUsersStore } from "@/app/stores/users.store";
import { useRolesStore } from "@/app/stores/roles.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useUiStore } from "@/app/stores/ui.store";
import { useMenuUsersProfileStore } from "@/app/stores/menu-users-profile.store";

import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { canManageDeletedRecords } from "@/app/utils/role-access";
import { createLogTransact } from "@/app/services/log-transacts.service";

import type { User } from "@/app/types/users.types";
import UserFormDialog from "@/components/users/UserFormDialog.vue";
import UserDeleteDialog from "@/components/users/UserDeleteDialog.vue";

const users = useUsersStore();
const roles = useRolesStore();
const menuStore = useMenuStore();
const auth = useAuthStore();
const ui = useUiStore();
const menuUsersProfile = useMenuUsersProfileStore();

const itemsPerPage = ref(10);

const headers = computed(() => [
  { title: "Usuario", key: "nameUser" },
  { title: "Nombre", key: "nameSurname" },
  { title: "Email", key: "email" },
  { title: "Rol", key: "role" },
  { title: "Sucursales", key: "sucursales" },
  { title: "Estado", key: "status" },
  ...(canManageDeleted.value ? [{ title: "Eliminado", key: "isDeleted" }] : []),
  ...(canEdit.value || canDelete.value
    ? [{ title: "Acciones", key: "actions", sortable: false }]
    : []),
]);

const statusItems = [
  { title: "Todos", value: "ALL" },
  { title: "ACTIVE", value: "ACTIVE" },
  { title: "INACTIVE", value: "INACTIVE" },
];

const roleItems = computed(() => {
  const base = [{ title: "Todos", value: "ALL" }];
  const list = roles.items.map((r) => ({ title: r.nombre, value: r.id }));
  return base.concat(list);
});

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, ["Usuarios", "Usuario"]),
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canManageDeleted = computed(() => canManageDeletedRecords(auth.user));

const formDialog = ref(false);
const deleteDialog = ref(false);
const selectedUser = ref<User | null>(null);
const busy = ref(false);

onMounted(async () => {
  if (!canRead.value) return;
  if (!canManageDeleted.value) {
    users.includeDeleted = false;
  }

  await Promise.allSettled([roles.fetchAll(false), users.fetchAll()]);
});

watch(
  () => users.includeDeleted,
  async (value, previous) => {
    if (!canManageDeleted.value) {
      if (value) users.includeDeleted = false;
      return;
    }
    if (value === previous || !canRead.value) return;
    await users.fetchAll();
  },
);

function formatSucursales(
  rows?: Array<{ id: string; codigo: string; nombre: string }>,
) {
  const text = (rows ?? [])
    .map((branch) => `${branch.codigo || ""} - ${branch.nombre || ""}`.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean)
    .join(", ");
  return text || "Sin asignar";
}

function openCreate() {
  selectedUser.value = null;
  formDialog.value = true;
}

function openEdit(user: User) {
  selectedUser.value = user;
  formDialog.value = true;
}

function openDelete(user: User) {
  selectedUser.value = user;
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
      ? `Error tecnico, informacion enviada al equipo de soporte TICKET: ${ticket}`
      : "Error tecnico, enviar detalles al equipo de soporte",
  );
}

async function onSubmitForm(payload: any) {
  if (busy.value) return;
  busy.value = true;

  try {
    if (!selectedUser.value) {
      const created = await users.createUser({
        nameUser: payload.nameUser,
        passUser: payload.passUser,
        nameSurname: payload.nameSurname,
        roleId: payload.roleId,
        email: payload.email,
        status: payload.status,
        dateBirthday: payload.dateBirthday,
        reportes: payload.reportes,
        sucursales: payload.sucursales,
      });

      await menuUsersProfile.createProfileForUser(created.id, currentUserName());
      ui.success("Guardado con exito");
    } else {
      const updatePayload: any = {
        nameUser: payload.nameUser,
        nameSurname: payload.nameSurname,
        roleId: payload.roleId,
        email: payload.email,
        status: payload.status,
        dateBirthday: payload.dateBirthday,
        reportes: payload.reportes,
        sucursales: payload.sucursales,
      };

      if (payload.passUser?.trim()) {
        updatePayload.passUser = payload.passUser;
      }

      await users.updateUser(selectedUser.value.id, updatePayload);
      await menuUsersProfile.sync(selectedUser.value.id, currentUserName());
      ui.success("Guardado con exito");
    }

    formDialog.value = false;
    await users.fetchAll();
  } catch (e: any) {
    const details =
      `Users module error\n` +
      `action=${selectedUser.value ? "UPDATE" : "CREATE"}\n` +
      `userId=${selectedUser.value?.id ?? "new"}\n` +
      `payload=${JSON.stringify({
        ...payload,
        passUser: payload.passUser ? "***" : "",
      })}\n` +
      `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;

    await logAndShowTechnicalError(
      selectedUser.value ? "USER_UPDATE" : "USER_CREATE",
      details,
    );
  } finally {
    busy.value = false;
  }
}

async function onConfirmDelete() {
  if (!selectedUser.value || busy.value) return;
  busy.value = true;

  try {
    await users.deleteUser(selectedUser.value.id);
    deleteDialog.value = false;
    ui.success("Eliminado con exito");
  } catch (e: any) {
    const details =
      `Users module error\n` +
      `action=DELETE\n` +
      `userId=${selectedUser.value.id}\n` +
      `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;

    await logAndShowTechnicalError("USER_DELETE", details);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.users-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 960px) {
  .users-table :deep(.v-data-table-footer__items-per-page),
  .users-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

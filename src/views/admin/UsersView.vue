<template>
  <v-card rounded="xl" class="pa-4">
    <div class="d-flex align-center justify-space-between mb-3">
      <div>
        <div class="text-h6 font-weight-bold">Usuarios</div>
        <div class="text-body-2 text-medium-emphasis">
          Lista de usuarios (filtros y paginación en el front).
        </div>
      </div>

      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        Nuevo usuario
      </v-btn>
    </div>

    <!-- FILTROS -->
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

      <v-col cols="12" md="1" class="d-flex align-center">
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
      :items-per-page="itemsPerPage"
      class="elevation-0"
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
          {{ item.isDeleted ? "Sí" : "No" }}
        </v-chip>
      </template>

      <template #item.role="{ item }">
        {{ roles.getRoleName(item.roleId) }}
      </template>

      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" variant="text" color="error" @click="openDelete(item)" />
      </template>

      <template #bottom>
        <div class="d-flex align-center justify-space-between px-2 py-2">
          <div class="text-caption text-medium-emphasis">
            Total: {{ users.filtered.length }}
          </div>

          <div class="d-flex align-center" style="gap: 12px;">
            <v-select
              v-model="itemsPerPage"
              :items="[5,10,20,50]"
              label="Por página"
              variant="outlined"
              density="compact"
              style="max-width: 140px;"
            />
          </div>
        </div>
      </template>
    </v-data-table>
  </v-card>

  <!-- MODALES -->
  <UserFormDialog
    v-model="formDialog"
    :user="selectedUser"
    :loading="users.loading"
    :error="users.error"
    @submit="onSubmitForm"
  />

  <UserDeleteDialog
    v-model="deleteDialog"
    :user="selectedUser"
    :loading="users.loading"
    :error="users.error"
    @confirm="onConfirmDelete"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useUsersStore } from "@/app/stores/users.store";
import { useRolesStore } from "@/app/stores/roles.store";
import type { User } from "@/app/types/users.types";
import UserFormDialog from "@/components/users/UserFormDialog.vue";
import UserDeleteDialog from "@/components/users/UserDeleteDialog.vue";

const users = useUsersStore();
const roles = useRolesStore();

const itemsPerPage = ref(10);

const headers = [
  { title: "Usuario", key: "nameUser" },
  { title: "Nombre", key: "nameSurname" },
  { title: "Email", key: "email" },
  { title: "Rol", key: "role" },
  { title: "Estado", key: "status" },
  { title: "Eliminado", key: "isDeleted" },
  { title: "Acciones", key: "actions", sortable: false },
];

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

const formDialog = ref(false);
const deleteDialog = ref(false);
const selectedUser = ref<User | null>(null);

onMounted(async () => {
  // carga roles y usuarios
  if (!roles.items.length) {
    try {
      await roles.fetchAll(false);
    } catch {}
  }
  if (!users.items.length) {
    await users.fetchAll();
  }
});

function openCreate() {
  selectedUser.value = null;
  formDialog.value = true;
}

function openEdit(u: User) {
  selectedUser.value = u;
  formDialog.value = true;
}

function openDelete(u: User) {
  selectedUser.value = u;
  deleteDialog.value = true;
}

async function onSubmitForm(payload: any) {
  try {
    if (!selectedUser.value) {
      await users.createUser({
        nameUser: payload.nameUser,
        passUser: payload.passUser,
        nameSurname: payload.nameSurname,
        roleId: payload.roleId,
        email: payload.email,
        status: payload.status,
        dateBirthday: payload.dateBirthday,
      });
    } else {
      const updatePayload: any = {
        nameUser: payload.nameUser,
        nameSurname: payload.nameSurname,
        roleId: payload.roleId,
        email: payload.email,
        status: payload.status,
        dateBirthday: payload.dateBirthday,
      };
      if (payload.passUser?.trim()) updatePayload.passUser = payload.passUser;

      await users.updateUser(selectedUser.value.id, updatePayload);
    }
    formDialog.value = false;
  } catch {
    // error queda en store
  }
}

async function onConfirmDelete() {
  if (!selectedUser.value) return;
  try {
    await users.deleteUser(selectedUser.value.id);
    deleteDialog.value = false;
  } catch {
    // error queda en store
  }
}
</script>
<template>
  <v-dialog v-model="model" max-width="980">
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="text-subtitle-1 font-weight-bold">
          {{ isEdit ? "Editar usuario" : "Crear usuario" }}
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <v-form @submit.prevent="submit">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.nameUser" label="Usuario" variant="outlined" required />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field v-model="form.email" label="Email" type="email" variant="outlined" required />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field v-model="form.nameSurname" label="Nombres y Apellidos" variant="outlined" required />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field v-model="form.dateBirthday" label="Fecha nacimiento" type="date" variant="outlined" required />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="form.status"
                :items="statusItems"
                item-title="title"
                item-value="value"
                label="Estado"
                variant="outlined"
                required
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="form.roleId"
                :items="roleItems"
                item-title="title"
                item-value="value"
                label="Rol"
                variant="outlined"
                required
                :loading="rolesLoading"
              />
              <div class="text-caption text-medium-emphasis mt-1" v-if="rolesError">
                {{ rolesError }}
              </div>

              <!-- Solo para CREATE: feedback de precarga desde rol -->
              <div v-if="!isEdit" class="text-caption text-medium-emphasis mt-1">
                Al crear, se copiarán por defecto los menús/permisos del rol seleccionado.
              </div>

              <div v-if="!isEdit && roleProfileLoading" class="mt-2">
                <v-progress-linear indeterminate />
              </div>
              <div v-if="!isEdit && roleProfileError" class="text-caption text-error mt-1">
                {{ roleProfileError }}
              </div>
            </v-col>

            <v-col cols="12" v-if="!isEdit">
              <v-text-field
                v-model="form.passUser"
                label="Contraseña"
                type="password"
                variant="outlined"
                required
              />
            </v-col>

            <v-col cols="12" v-else>
              <v-text-field
                v-model="form.passUser"
                label="Contraseña (opcional)"
                type="password"
                variant="outlined"
                hint="Déjala vacía si no quieres cambiarla"
                persistent-hint
              />
            </v-col>
          </v-row>

          <!-- PERFILERÍA SOLO EN EDICIÓN -->
          <div v-if="isEdit" class="mt-6">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 font-weight-bold">Permisos por menú (usuario)</div>
              <v-chip size="small" variant="tonal">
                UserId: {{ props.user?.id }}
              </v-chip>
            </div>

            <v-alert v-if="menuUsersProfile.error" type="error" variant="tonal" class="mb-3">
              {{ menuUsersProfile.error }}
            </v-alert>

            <MenuPermissionsCascade
              :tree="menusFull.tree"
              :menus-loading="menusFull.loading || menuUsersProfile.loading"
              :menus-error="menusFull.error"
              :get-draft="menuUsersProfile.getDraft"
            />
          </div>

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
import { computed, reactive, watch, ref } from "vue";
import type { User } from "@/app/types/users.types";

import { useRolesStore } from "@/app/stores/roles.store";
import { useMenusFullStore } from "@/app/stores/menus-full.store";
import { useMenuUsersProfileStore } from "@/app/stores/menu-users-profile.store";

import { fetchMenuRolesByRole } from "@/app/services/menu-roles.service";
import MenuPermissionsCascade from "@/components/roles/MenuPermissionsCascade.vue";

type FormModel = {
  nameUser: string;
  passUser: string;
  nameSurname: string;
  roleId: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  dateBirthday: string;
};

const props = defineProps<{
  modelValue: boolean;
  user?: User | null;
  loading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "submit", payload: FormModel): void;
}>();

const rolesStore = useRolesStore();
const menusFull = useMenusFullStore();
const menuUsersProfile = useMenuUsersProfileStore();

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const isEdit = computed(() => !!props.user?.id);

const statusItems = [
  { title: "ACTIVE", value: "ACTIVE" },
  { title: "INACTIVE", value: "INACTIVE" },
];

const roleItems = computed(() =>
  rolesStore.items.map((r) => ({ title: r.nombre, value: r.id }))
);

const rolesLoading = computed(() => rolesStore.loading);
const rolesError = computed(() => rolesStore.error);

const loading = computed(() => props.loading ?? false);
const error = computed(() => props.error ?? null);

const roleProfileLoading = ref(false);
const roleProfileError = ref<string | null>(null);

const form = reactive<FormModel>({
  nameUser: "",
  passUser: "",
  nameSurname: "",
  roleId: "",
  email: "",
  status: "ACTIVE",
  dateBirthday: "",
});

/** Precarga menú/permiso desde rol (solo CREATE) */
async function preloadFromRole(roleId: string) {
  if (!roleId || isEdit.value) return;

  roleProfileLoading.value = true;
  roleProfileError.value = null;

  try {
    const menuRoles = await fetchMenuRolesByRole(roleId);
    menuUsersProfile.setDraftsFromRoleMenus(menuRoles);
  } catch (e: any) {
    roleProfileError.value =
      e?.response?.data?.message || "No se pudo cargar la perfilería del rol.";
  } finally {
    roleProfileLoading.value = false;
  }
}

/** Al abrir modal */
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;

    // 1) Roles
    if (rolesStore.items.length === 0) {
      try { await rolesStore.fetchAll(false); } catch {}
    }

    // 2) Menú completo (se usa para el cascade)
    try { await menusFull.fetchAll(true); } catch {}

    // 3) Reset drafts
    menuUsersProfile.reset();

    // 4) Cargar form
    if (props.user) {
      // EDIT
      form.nameUser = props.user.nameUser ?? "";
      form.passUser = "";
      form.nameSurname = props.user.nameSurname ?? "";
      form.roleId = props.user.roleId ?? "";
      form.email = props.user.email ?? "";
      form.status = (props.user.status as any) || "ACTIVE";
      form.dateBirthday = props.user.dateBirthday ?? "";

      // cargar perfilería del usuario (para mostrar permisos)
      try {
        await menuUsersProfile.loadByUser(props.user.id);
      } catch {
        // error queda en store, se muestra arriba
      }
    } else {
      // CREATE
      form.nameUser = "";
      form.passUser = "";
      form.nameSurname = "";
      form.roleId = rolesStore.items?.[0]?.id ?? "";
      form.email = "";
      form.status = "ACTIVE";
      form.dateBirthday = "";

      // IMPORTANT: precarga por rol al abrir (no esperes a que cambie el select)
      await preloadFromRole(form.roleId);
    }
  },
  { immediate: true }
);

/** CREATE: si cambia el rol, recargar perfilería del rol */
watch(
  () => form.roleId,
  async (roleId, prev) => {
    if (isEdit.value) return;
    if (!roleId || roleId === prev) return;
    await preloadFromRole(roleId);
  }
);

function close() {
  model.value = false;
}

function submit() {
  emit("submit", { ...form });
}
</script>
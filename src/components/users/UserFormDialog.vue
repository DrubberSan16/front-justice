<template>
  <v-dialog
    v-model="model"
    :fullscreen="isDialogFullscreen"
    :max-width="isDialogFullscreen ? undefined : 980"
  >
    <v-card rounded="xl" class="user-form-dialog-card">
      <v-card-title class="responsive-header">
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
              <v-text-field
                v-model="form.nameUser"
                label="Usuario"
                variant="outlined"
                required
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.email"
                label="Email"
                type="email"
                variant="outlined"
                required
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.nameSurname"
                label="Nombres y Apellidos"
                variant="outlined"
                required
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.dateBirthday"
                label="Fecha nacimiento"
                type="date"
                variant="outlined"
                required
              />
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

            <v-col cols="12" md="6" class="d-flex align-center">
              <v-checkbox
                v-model="form.esDestinatario"
                label="Es destinatario"
                color="primary"
                hide-details
              />
            </v-col>

            <v-col v-if="form.esDestinatario" cols="12" md="6">
              <v-text-field
                v-model="form.identificacion"
                label="Cédula o RUC"
                variant="outlined"
                inputmode="numeric"
                maxlength="13"
                counter="13"
                required
                hint="Ingresa 10 dígitos para cédula o 13 dígitos para RUC."
                persistent-hint
                :error-messages="
                  recipientIdentificationError
                    ? [recipientIdentificationError]
                    : []
                "
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
              <div
                class="text-caption text-medium-emphasis mt-1"
                v-if="rolesError"
              >
                {{ rolesError }}
              </div>

              <!-- Solo para CREATE: feedback de precarga desde rol -->
              <div class="text-caption text-medium-emphasis mt-1">
                Al crear, se copiarán por defecto los menús/permisos del rol
                seleccionado.
              </div>

              <div v-if="roleProfileLoading" class="mt-2">
                <v-progress-linear indeterminate />
              </div>
              <div v-if="roleProfileError" class="text-caption text-error mt-1">
                {{ roleProfileError }}
              </div>
            </v-col>

            <v-col cols="12">
              <v-autocomplete
                v-model="form.reportes"
                :items="reportAccessOptions"
                item-title="title"
                item-value="value"
                label="Reportes habilitados"
                variant="outlined"
                multiple
                chips
                closable-chips
                clearable
                hint="Si lo dejas vacío, el usuario tendrá acceso a todos los reportes."
                persistent-hint
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item
                    v-bind="itemProps"
                    :subtitle="item.raw.description"
                  />
                </template>
              </v-autocomplete>
            </v-col>

            <v-col cols="12">
              <v-autocomplete
                v-model="form.sucursales"
                :items="branchOptions"
                item-title="title"
                item-value="value"
                label="Sucursales habilitadas"
                variant="outlined"
                multiple
                chips
                closable-chips
                clearable
                :loading="branchLoading"
                hint="Si lo dejas vacío, el usuario podrá trabajar con todas las sucursales activas."
                persistent-hint
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item
                    v-bind="itemProps"
                    :subtitle="item.raw.subtitle"
                  />
                </template>
              </v-autocomplete>
              <div
                class="text-caption text-medium-emphasis mt-1"
                v-if="branchError"
              >
                {{ branchError }}
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
            <div class="responsive-header mb-2">
              <div class="text-subtitle-2 font-weight-bold">
                Permisos por menú (usuario)
              </div>
              <v-chip size="small" variant="tonal">
                UserId: {{ props.user?.id }}
              </v-chip>
            </div>

            <v-alert
              v-if="menuUsersProfile.error"
              type="error"
              variant="tonal"
              class="mb-3"
            >
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
import { useDisplay } from "vuetify";
import type { User } from "@/app/types/users.types";

import { useAuthStore } from "@/app/stores/auth.store";
import { useRolesStore } from "@/app/stores/roles.store";
import { useMenusFullStore } from "@/app/stores/menus-full.store";
import { useMenuUsersProfileStore } from "@/app/stores/menu-users-profile.store";
import {
  getReportAccessOptionsForUser,
  normalizeReportAccess,
} from "@/app/config/report-access";
import {
  cachedGet,
  DEFAULT_CATALOG_CACHE_TTL_MS,
} from "@/app/utils/request-cache";

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
  esDestinatario: boolean;
  identificacion: string;
  reportes: string[];
  sucursales: string[];
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
const auth = useAuthStore();
const { mdAndDown } = useDisplay();

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const isEdit = computed(() => !!props.user?.id);
const isDialogFullscreen = computed(() => mdAndDown.value);

const statusItems = [
  { title: "ACTIVE", value: "ACTIVE" },
  { title: "INACTIVE", value: "INACTIVE" },
];

const roleItems = computed(() =>
  rolesStore.items.map((r) => ({ title: r.nombre, value: r.id })),
);

const rolesLoading = computed(() => rolesStore.loading);
const rolesError = computed(() => rolesStore.error);

const loading = computed(() => props.loading ?? false);
const error = computed(() => props.error ?? null);
const reportAccessOptions = computed(() =>
  getReportAccessOptionsForUser(auth.user),
);
const allowedReportKeys = computed(
  () => new Set(reportAccessOptions.value.map((item) => item.value)),
);

const roleProfileLoading = ref(false);
const roleProfileError = ref<string | null>(null);
const hydratingForm = ref(false);
const branchOptions = ref<
  Array<{ title: string; value: string; subtitle: string }>
>([]);
const branchLoading = ref(false);
const branchError = ref<string | null>(null);

const form = reactive<FormModel>({
  nameUser: "",
  passUser: "",
  nameSurname: "",
  roleId: "",
  email: "",
  status: "ACTIVE",
  dateBirthday: "",
  esDestinatario: false,
  identificacion: "",
  reportes: [],
  sucursales: [],
});

const recipientIdentificationError = computed(() => {
  if (!form.esDestinatario) return "";
  if (!form.identificacion)
    return "La cédula o RUC es obligatorio para un destinatario.";
  if (!/^(?:\d{10}|\d{13})$/.test(form.identificacion)) {
    return "Ingresa una cédula de 10 dígitos o un RUC de 13 dígitos.";
  }
  return "";
});

function collectVisibleMenuIds(
  nodes: Array<{ id: string; children?: any[] }> = [],
): string[] {
  return nodes.flatMap((node) => [
    node.id,
    ...collectVisibleMenuIds(node.children ?? []),
  ]);
}

function roleDefaultReportes(roleId: string) {
  const role = rolesStore.items.find((item) => item.id === roleId);
  return normalizeReportAccess(role?.reportes).filter((item) =>
    allowedReportKeys.value.has(item),
  );
}

/** Precarga menú/permiso desde rol */
async function preloadFromRole(
  roleId: string,
  options?: { preserveOriginal?: boolean },
) {
  if (!roleId) return;

  roleProfileLoading.value = true;
  roleProfileError.value = null;

  try {
    const menuRoles = await fetchMenuRolesByRole(roleId);
    menuUsersProfile.setDraftsFromRoleMenus(menuRoles, {
      preserveOriginal: options?.preserveOriginal === true,
    });
  } catch (e: any) {
    roleProfileError.value =
      e?.response?.data?.message || "No se pudo cargar la perfilería del rol.";
  } finally {
    roleProfileLoading.value = false;
  }
}

async function loadBranches() {
  branchLoading.value = true;
  branchError.value = null;
  try {
    const { data } = await cachedGet<
      Array<{ id: string; codigo: string; nombre: string }>
    >(
      "/kpi_security/users/sucursales/catalogo",
      {},
      { ttlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
    );
    branchOptions.value = (data ?? []).map((item) => ({
      title: `${item.codigo || ""} - ${item.nombre || ""}`
        .replace(/^\s*-\s*/, "")
        .trim(),
      value: item.id,
      subtitle: item.codigo || "",
    }));
  } catch (e: any) {
    branchOptions.value = [];
    branchError.value =
      e?.response?.data?.message ||
      "No se pudo cargar el catálogo de sucursales.";
  } finally {
    branchLoading.value = false;
  }
}

/** Al abrir modal */
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    hydratingForm.value = true;

    // Precargas compartidas del modal
    await Promise.allSettled([
      rolesStore.fetchAll(false),
      branchLoading.value ? Promise.resolve() : loadBranches(),
      menusFull.fetchAll(true),
    ]);

    // 2) Menú completo (se usa para el cascade)
    const visibleMenuIds = collectVisibleMenuIds(menusFull.tree);

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
      form.esDestinatario = props.user.esDestinatario === true;
      form.identificacion = String(props.user.identificacion ?? "")
        .replace(/\D/g, "")
        .slice(0, 13);
      form.reportes = normalizeReportAccess(props.user.reportes).filter(
        (item) => allowedReportKeys.value.has(item),
      );
      form.sucursales = [...(props.user.sucursales ?? [])];

      // cargar perfilería del usuario (para mostrar permisos)
      try {
        await menuUsersProfile.loadByUser(props.user.id);
        menuUsersProfile.restrictToMenuIds(visibleMenuIds);
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
      form.esDestinatario = false;
      form.identificacion = "";
      form.reportes = roleDefaultReportes(form.roleId);
      form.sucursales = [];

      // IMPORTANT: precarga por rol al abrir (no esperes a que cambie el select)
      await preloadFromRole(form.roleId);
      menuUsersProfile.restrictToMenuIds(visibleMenuIds);
    }
    hydratingForm.value = false;
  },
  { immediate: true },
);

/** Si cambia el rol, recargar perfilería del rol */
watch(
  () => form.roleId,
  async (roleId, prev) => {
    if (hydratingForm.value) return;
    if (!roleId || roleId === prev) return;
    form.reportes = roleDefaultReportes(roleId);
    await preloadFromRole(roleId, {
      preserveOriginal: isEdit.value,
    });
    menuUsersProfile.restrictToMenuIds(collectVisibleMenuIds(menusFull.tree));
  },
);

watch(
  () => form.identificacion,
  (value) => {
    const normalized = String(value ?? "")
      .replace(/\D/g, "")
      .slice(0, 13);
    if (normalized !== value) form.identificacion = normalized;
  },
);

watch(
  () => form.esDestinatario,
  (enabled) => {
    if (!enabled) form.identificacion = "";
  },
);

function close() {
  model.value = false;
}

function submit() {
  if (recipientIdentificationError.value) return;
  emit("submit", { ...form });
}
</script>

<style scoped>
.user-form-dialog-card {
  min-height: 100%;
}
</style>

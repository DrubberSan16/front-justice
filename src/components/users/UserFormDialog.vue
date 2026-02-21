<template>
  <v-dialog v-model="model" max-width="720">
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
import { computed, reactive, watch } from "vue";
import type { User } from "@/app/types/users.types";
import { useRolesStore } from "@/app/stores/roles.store";

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
  rolesStore.items.map((r) => ({
    title: r.nombre,
    value: r.id,
  }))
);

const rolesLoading = computed(() => rolesStore.loading);
const rolesError = computed(() => rolesStore.error);

const form = reactive<FormModel>({
  nameUser: "",
  passUser: "",
  nameSurname: "",
  roleId: "",
  email: "",
  status: "ACTIVE",
  dateBirthday: "",
});

watch(
  () => props.user,
  (u) => {
    if (!u) {
      form.nameUser = "";
      form.passUser = "";
      form.nameSurname = "";
      form.roleId = rolesStore.items?.[0]?.id ?? "";
      form.email = "";
      form.status = "ACTIVE";
      form.dateBirthday = "";
      return;
    }

    form.nameUser = u.nameUser ?? "";
    form.passUser = "";
    form.nameSurname = u.nameSurname ?? "";
    form.roleId = u.roleId ?? "";
    form.email = u.email ?? "";
    form.status = (u.status as any) || "ACTIVE";
    form.dateBirthday = u.dateBirthday ?? "";
  },
  { immediate: true }
);

// Al abrir modal: aseguramos roles cargados
watch(
  () => props.modelValue,
  async (open) => {
    if (open && rolesStore.items.length === 0) {
      try {
        await rolesStore.fetchAll(false);
      } catch {
        // error ya está en store
      }
    }
    // si es creación y no hay roleId seteado aún, intenta setear primero disponible
    if (open && !props.user?.id && !form.roleId && rolesStore.items.length) {
      form.roleId = rolesStore.items[0]!.id;
    }
  },
  { immediate: true }
);

const loading = computed(() => props.loading ?? false);
const error = computed(() => props.error ?? null);

function close() {
  model.value = false;
}

function submit() {
  emit("submit", { ...form });
}
</script>
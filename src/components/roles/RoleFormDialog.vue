<template>
  <v-dialog v-model="dialog" :fullscreen="isDialogFullscreen" :max-width="isDialogFullscreen ? undefined : 900">
    <v-card rounded="xl" class="role-form-dialog-card">
      <v-card-title class="text-h6">
        {{ isEdit ? "Editar Rol" : "Crear Rol" }}
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="submit">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.nombre"
                label="Nombre"
                required
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="form.status"
                :items="['ACTIVE','INACTIVE']"
                label="Estado"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="form.descripcion"
                label="Descripción"
              />
            </v-col>
          </v-row>

          <MenuPermissionsCascade
            :tree="menus.tree"
            :get-draft="menuRoles.getDraft"
            :menus-loading="menus.loading"
          />

          <v-card-actions class="justify-end mt-4">
            <v-btn variant="text" @click="dialog = false">
              Cancelar
            </v-btn>

            <!-- SOLO submit -->
            <v-btn
              color="primary"
              type="submit"
              :loading="loading"
              :disabled="loading"
            >
              Guardar
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useDisplay } from "vuetify";
import { useMenuRolesStore } from "@/app/stores/menu-roles.store";
import { useMenusFullStore } from "@/app/stores/menus-full.store";

import MenuPermissionsCascade from "@/components/roles/MenuPermissionsCascade.vue";

const props = defineProps<{
  modelValue: boolean;
  role?: any | null;
  loading?: boolean;
}>();

const emit = defineEmits(["update:modelValue","submit"]);

const dialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});

const isEdit = computed(() => !!props.role);

const menus = useMenusFullStore();
const menuRoles = useMenuRolesStore();
const { mdAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);

const form = ref({
  nombre: "",
  descripcion: "",
  status: "ACTIVE",
});

watch(
  () => props.modelValue,
  async (v) => {
    if (!v) return;

    await menus.fetchAll(true);

    if (props.role) {
      form.value = {
        nombre: props.role.nombre,
        descripcion: props.role.descripcion,
        status: props.role.status,
      };

      await menuRoles.loadByRole(props.role.id);
    } else {
      menuRoles.reset();
      form.value = {
        nombre: "",
        descripcion: "",
        status: "ACTIVE",
      };
    }
  }
);

const loading = computed(() => props.loading ?? false);

function submit() {
  emit("submit", { ...form.value });
}
</script>

<style scoped>
.role-form-dialog-card {
  min-height: 100%;
}
</style>

<template>
  <v-dialog v-model="dialog" max-width="900">
    <v-card rounded="xl">
      <v-card-title class="text-h6">
        {{ isEdit ? "Editar Rol" : "Crear Rol" }}
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="6">
            <v-text-field v-model="form.nombre" label="Nombre" />
          </v-col>

          <v-col cols="6">
            <v-select
              v-model="form.status"
              :items="['ACTIVE','INACTIVE']"
              label="Estado"
            />
          </v-col>

          <v-col cols="12">
            <v-textarea v-model="form.descripcion" label="Descripción" />
          </v-col>
        </v-row>

        <MenuPermissionsCascade
          :tree="menus.tree"
          :get-draft="menuRoles.getDraft"
          :menus-loading="menus.loading"
        />
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="dialog = false">
          Cancelar
        </v-btn>

        <v-btn color="primary" :loading="saving" @click="save">
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRolesStore } from "@/app/stores/roles.store";
import { useMenuRolesStore } from "@/app/stores/menu-roles.store";
import { useMenusFullStore } from "@/app/stores/menus-full.store";
import { useAuthStore } from "@/app/stores/auth.store";

import MenuPermissionsCascade from "@/components/roles/MenuPermissionsCascade.vue";


const props = defineProps<{
  modelValue: boolean;
  role?: any | null;
}>();

const emit = defineEmits(["update:modelValue","submit"]);

const dialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});




const roles = useRolesStore();
const menuRoles = useMenuRolesStore();
const menus = useMenusFullStore();
const auth = useAuthStore();

const isEdit = computed(() => !!props.role);

const saving = ref(false);

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

async function save() {
  saving.value = true;

  try {
    let roleId: string;

    if (isEdit.value) {
      roleId = props.role!.id;

      await roles.updateRole(roleId, {
        nombre: form.value.nombre,
        descripcion: form.value.descripcion,
        status: form.value.status,
        createdBy: auth.user?.nameUser || "admin",
      });

    } else {
      const created = await roles.createRole({
        nombre: form.value.nombre,
        descripcion: form.value.descripcion,
        status: form.value.status,
      });

      roleId = created.id;
    }

    // 🔹 sincroniza permisos menu-role
    await menuRoles.sync(roleId, auth.user?.nameUser || "admin");

    emit("submit", form.value);
    dialog.value = false;

  } finally {
    saving.value = false;
  }
}
</script>
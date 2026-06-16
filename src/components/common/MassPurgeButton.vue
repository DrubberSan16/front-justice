<template>
  <v-btn
    v-if="canPurge"
    color="error"
    variant="tonal"
    prepend-icon="mdi-delete-alert"
    :disabled="disabled || purging"
    :loading="purging"
    @click="openDialog"
  >
    Eliminacion masiva
  </v-btn>

  <v-dialog
    v-model="dialog"
    :fullscreen="smAndDown"
    :max-width="smAndDown ? undefined : 540"
  >
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Eliminacion real masiva
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-alert type="error" variant="tonal" class="mb-4">
          Esta accion elimina fisicamente todos los registros de {{ moduleTitle }} y no se puede deshacer.
        </v-alert>
        <v-text-field
          v-model="confirmation"
          label="Escribe ELIMINAR para confirmar"
          variant="outlined"
          autocomplete="off"
          hide-details="auto"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="purging" @click="closeDialog">
          Cancelar
        </v-btn>
        <v-btn
          color="error"
          :disabled="!isConfirmationValid"
          :loading="purging"
          @click="confirmPurge"
        >
          Eliminar todo
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useDisplay } from "vuetify";

import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useUiStore } from "@/app/stores/ui.store";
import { invalidateRequestCache } from "@/app/utils/request-cache";
import { isSuperAdministrator } from "@/app/utils/role-access";

const props = defineProps<{
  endpoint: string;
  moduleTitle: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  purged: [payload: unknown];
}>();

const auth = useAuthStore();
const ui = useUiStore();
const { smAndDown } = useDisplay();

const dialog = ref(false);
const confirmation = ref("");
const purging = ref(false);

const canPurge = computed(() => isSuperAdministrator(auth.user));
const isConfirmationValid = computed(
  () => confirmation.value.trim().toUpperCase() === "ELIMINAR",
);

function openDialog() {
  if (!canPurge.value) {
    ui.error("Solo el Super Administrador puede ejecutar eliminacion real masiva.");
    return;
  }
  confirmation.value = "";
  dialog.value = true;
}

function closeDialog() {
  if (purging.value) return;
  dialog.value = false;
  confirmation.value = "";
}

async function confirmPurge() {
  if (!canPurge.value) {
    ui.error("Solo el Super Administrador puede ejecutar eliminacion real masiva.");
    return;
  }
  if (!isConfirmationValid.value) {
    ui.error("Debes escribir exactamente ELIMINAR para continuar.");
    return;
  }

  purging.value = true;
  try {
    const { data } = await api.delete(props.endpoint);
    const affected = Number(
      data?.affected ?? data?.data?.affected ?? data?.summary?.affected ?? 0,
    );
    invalidateRequestCache(props.endpoint.replace(/\/purge-all$/, ""));
    ui.success(`Eliminacion real masiva ejecutada. Registros eliminados: ${affected}.`);
    emit("purged", data);
    dialog.value = false;
    confirmation.value = "";
  } catch (e: any) {
    ui.error(
      e?.response?.data?.message ||
        e?.message ||
        "No se pudo ejecutar la eliminacion real masiva.",
    );
  } finally {
    purging.value = false;
  }
}
</script>

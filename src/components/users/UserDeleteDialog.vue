<template>
  <v-dialog v-model="model" max-width="520">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Confirmar eliminación
      </v-card-title>

      <v-card-text>
        <div class="mb-2">
          ¿Seguro que deseas eliminar al usuario:
          <b>{{ user?.nameUser }}</b> ({{ user?.email }})?
        </div>

        <v-alert v-if="error" type="error" variant="tonal">
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close">Cancelar</v-btn>
        <v-btn :loading="loading" color="error" @click="confirm">
          Eliminar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { User } from "@/app/types/users.types";

const props = defineProps<{
  modelValue: boolean;
  user: User | null;
  loading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "confirm"): void;
}>();

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const user = computed(() => props.user);
const loading = computed(() => props.loading ?? false);
const error = computed(() => props.error ?? null);

function close() {
  model.value = false;
}
function confirm() {
  emit("confirm");
}
</script>
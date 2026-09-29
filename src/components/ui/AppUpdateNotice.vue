<template>
  <v-snackbar
    :model-value="updateAvailable"
    :timeout="-1"
    location="bottom"
    multi-line
    class="app-update-notice"
  >
    <strong>Hay una versión nueva de la aplicación.</strong>
    Guarda lo que estés haciendo y actualiza la página: una pantalla vieja puede
    enviar datos que la versión actual ya no acepta.
    <template #actions>
      <v-btn variant="text" @click="dismiss">Después</v-btn>
      <v-btn color="primary" variant="flat" @click="reload">Actualizar</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { useAppUpdateCheck } from "@/app/utils/app-update-check";

const { updateAvailable, dismiss, reload } = useAppUpdateCheck();
</script>

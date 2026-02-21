<template>
  <v-snackbar
    v-model="ui.show"
    :timeout="ui.timeout"
    location="top right"
    :color="color"
    rounded="lg"
  >
    {{ ui.text }}

    <template #actions>
      <v-btn variant="text" @click="ui.close">Cerrar</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useUiStore } from "@/app/stores/ui.store";

const ui = useUiStore();

const color = computed(() => {
  switch (ui.variant) {
    case "success": return "green";
    case "error": return "red";
    case "warning": return "orange";
    default: return "blue";
  }
});
</script>
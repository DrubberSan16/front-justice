<template>
  <v-dialog v-model="ui.show" max-width="560" persistent>
    <v-card rounded="xl" class="app-message-dialog">
      <v-card-item>
        <template #prepend>
          <v-avatar :color="color" size="42" variant="tonal">
            <v-icon :icon="icon" />
          </v-avatar>
        </template>
        <v-card-title>{{ ui.title }}</v-card-title>
      </v-card-item>

      <v-card-text class="text-body-1">
        {{ ui.text }}
      </v-card-text>

      <v-card-actions class="justify-end px-6 pb-5">
        <v-btn :color="color" variant="flat" @click="ui.close">Aceptar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useUiStore } from "@/app/stores/ui.store";

const ui = useUiStore();

const color = computed(() => {
  switch (ui.variant) {
    case "success": return "success";
    case "error": return "error";
    case "warning": return "warning";
    default: return "info";
  }
});

const icon = computed(() => {
  switch (ui.variant) {
    case "success": return "mdi-check-circle";
    case "error": return "mdi-alert-circle";
    case "warning": return "mdi-alert";
    default: return "mdi-information";
  }
});
</script>

<style scoped>
.app-message-dialog {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 38%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.94));
}
</style>

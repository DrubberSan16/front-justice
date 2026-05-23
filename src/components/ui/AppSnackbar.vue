<template>
  <v-dialog v-model="ui.show" max-width="560" persistent>
    <v-card rounded="xl" class="app-message-dialog enterprise-dialog">
      <v-card-item>
        <template #prepend>
          <v-avatar :color="color" size="42" variant="tonal">
            <v-icon :icon="icon" />
          </v-avatar>
        </template>
        <v-card-title class="app-message-dialog__title">{{ ui.title }}</v-card-title>
      </v-card-item>

      <v-card-text class="text-body-1 app-message-dialog__text">
        {{ ui.text }}
      </v-card-text>

      <v-card-actions class="justify-end px-6 pb-5 app-message-dialog__actions">
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
  color: var(--app-text);
  background:
    radial-gradient(
      circle at top left,
      color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent),
      transparent 38%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-base) 94%, rgba(255, 255, 255, 0.35)),
      color-mix(in srgb, var(--surface-soft) 96%, transparent)
    );
  box-shadow: var(--surface-shadow);
  backdrop-filter: blur(20px);
}

.app-message-dialog__title {
  color: var(--app-text);
  font-weight: 700;
}

.app-message-dialog__text {
  color: var(--app-text);
}

.app-message-dialog__actions {
  border-top: 1px solid var(--surface-border);
}
</style>

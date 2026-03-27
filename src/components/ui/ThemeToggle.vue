<template>
  <v-btn
    class="theme-toggle"
    :class="{ 'theme-toggle--compact': compact }"
    :variant="compact ? 'text' : 'tonal'"
    color="primary"
    rounded="xl"
    :aria-label="buttonLabel"
    @click="ui.toggleTheme"
  >
    <v-icon :icon="buttonIcon" :start="!compact" />
    <span v-if="!compact">Modo {{ nextThemeLabel }}</span>

    <v-tooltip activator="parent" location="bottom">
      Cambiar a modo {{ nextThemeLabel }}
    </v-tooltip>
  </v-btn>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useUiStore } from "@/app/stores/ui.store";

withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);

const ui = useUiStore();

const buttonIcon = computed(() =>
  ui.darkMode ? "mdi-weather-sunny" : "mdi-weather-night",
);

const nextThemeLabel = computed(() => (ui.darkMode ? "claro" : "oscuro"));
const buttonLabel = computed(() => `Cambiar a modo ${nextThemeLabel.value}`);
</script>

<style scoped>
.theme-toggle {
  min-width: auto;
  letter-spacing: 0;
}

.theme-toggle--compact {
  padding-inline: 0;
}
</style>

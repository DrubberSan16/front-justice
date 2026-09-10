<template>
  <span v-if="!visibleActions.length" class="row-actions__empty">—</span>
  <v-menu v-else location="bottom end" :close-on-content-click="true">
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        :size="size"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-dots-horizontal"
        append-icon="mdi-menu-down"
        class="row-actions__trigger"
        :aria-label="label"
      >
        {{ label }}
      </v-btn>
    </template>
    <v-list density="compact" min-width="212" class="row-actions__list">
      <template v-for="(action, index) in visibleActions" :key="action.key">
        <v-divider v-if="action.divider && index > 0" class="my-1" />
        <v-list-item
          :disabled="action.disabled === true"
          :base-color="action.color"
          @click="emit('select', action.key)"
        >
          <template #prepend>
            <v-icon :icon="action.icon || 'mdi-circle-small'" size="small" />
          </template>
          <v-list-item-title>{{ action.label }}</v-list-item-title>
          <v-list-item-subtitle v-if="action.hint">
            {{ action.hint }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { visibleRowActions, type RowAction } from "@/app/utils/row-actions";

/**
 * Menu de acciones de una fila.
 *
 * Las tablas venian mostrando una hilera de botones que crecia con cada
 * permiso nuevo y que en pantallas angostas empujaba las columnas de datos.
 * Aqui todas las acciones caben en un solo control y la fila deja de cambiar
 * de ancho segun quien la mire.
 */
const props = withDefaults(
  defineProps<{
    actions: RowAction[];
    label?: string;
    size?: string;
  }>(),
  { label: "Acciones", size: "small" },
);

const emit = defineEmits<{ (event: "select", key: string): void }>();

const visibleActions = computed(() => visibleRowActions(props.actions));
</script>

<style scoped>
.row-actions__trigger {
  white-space: nowrap;
}

.row-actions__empty {
  color: rgb(var(--v-theme-on-surface-variant, 100 116 139));
  font-size: 0.8rem;
}

.row-actions__list :deep(.v-list-item-subtitle) {
  font-size: 0.72rem;
}
</style>

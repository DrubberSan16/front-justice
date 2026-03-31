<template>
  <div class="loading-table-state">
    <div class="loading-table-state__header">
      <v-progress-circular indeterminate color="primary" size="22" width="3" />
      <span>{{ message }}</span>
    </div>

    <div class="loading-table-state__body">
      <div v-for="row in safeRows" :key="row" class="loading-table-state__row">
        <v-skeleton-loader
          v-for="column in safeColumns"
          :key="`${row}-${column}`"
          type="text"
          class="loading-table-state__cell"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    message?: string;
    rows?: number;
    columns?: number;
  }>(),
  {
    message: "Cargando información, espera un momento...",
    rows: 4,
    columns: 3,
  },
);

const safeRows = computed(() => Math.max(1, Number(props.rows || 1)));
const safeColumns = computed(() => Math.max(1, Number(props.columns || 1)));
</script>

<style scoped>
.loading-table-state {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px dashed var(--surface-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
}

.loading-table-state__header {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 0.92rem;
  font-weight: 500;
}

.loading-table-state__body {
  display: grid;
  gap: 12px;
}

.loading-table-state__row {
  display: grid;
  grid-template-columns: repeat(var(--loading-columns, 3), minmax(0, 1fr));
  gap: 12px;
}

.loading-table-state__cell {
  width: 100%;
}

.loading-table-state__row {
  --loading-columns: v-bind(safeColumns);
}

@media (max-width: 768px) {
  .loading-table-state__row {
    --loading-columns: 1;
  }
}
</style>

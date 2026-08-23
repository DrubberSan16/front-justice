<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="mobile"
    :max-width="mobile ? undefined : 860"
    scrollable
    @update:model-value="(value) => emit('update:modelValue', Boolean(value))"
  >
    <v-card rounded="xl" class="readonly-detail-dialog">
      <div class="readonly-detail-dialog__header">
        <div class="readonly-detail-dialog__heading">
          <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
          <div v-if="subtitle" class="text-body-2 text-medium-emphasis">{{ subtitle }}</div>
        </div>
        <div class="readonly-detail-dialog__actions">
          <v-chip size="small" label color="primary" variant="tonal">
            {{ rowCount }} registro{{ rowCount === 1 ? "" : "s" }}
          </v-chip>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            aria-label="Cerrar detalle"
            @click="close"
          />
        </div>
      </div>

      <v-divider />

      <v-card-text class="readonly-detail-dialog__body">
        <div v-if="rowCount" class="dashboard-table-shell">
          <v-table density="compact" class="dashboard-mini-table">
            <thead>
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  :class="column.align ? `text-${column.align}` : ''"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in rows" :key="row?.id ?? index">
                <td
                  v-for="column in columns"
                  :key="column.key"
                  :class="column.align ? `text-${column.align}` : ''"
                >
                  {{ formatCellValue(row?.[column.key]) }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <div v-else class="readonly-detail-dialog__empty text-body-2 text-medium-emphasis">
          {{ emptyText }}
        </div>
      </v-card-text>

      <v-card-actions class="readonly-detail-dialog__footer">
        <v-spacer />
        <v-btn variant="text" @click="close">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDisplay } from "vuetify";

export type ReadonlyDetailColumn = {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    subtitle?: string;
    columns: ReadonlyDetailColumn[];
    rows: Record<string, any>[];
    emptyText?: string;
  }>(),
  {
    subtitle: "",
    emptyText: "No hay datos disponibles para este detalle.",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();

const { mobile } = useDisplay();

const rowCount = computed(() => props.rows?.length || 0);

function close() {
  emit("update:modelValue", false);
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) {
    return value.length ? value.map((entry) => formatCellValue(entry)).join(", ") : "-";
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
</script>

<style scoped>
.readonly-detail-dialog {
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.readonly-detail-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.readonly-detail-dialog__heading {
  min-width: 0;
}

.readonly-detail-dialog__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.readonly-detail-dialog__body {
  padding: 18px 20px;
}

.readonly-detail-dialog__empty {
  display: grid;
  min-height: 120px;
  padding: 22px;
  place-items: center;
  border: 1px dashed var(--surface-border);
  border-radius: 15px;
  background: color-mix(in srgb, var(--surface-soft) 74%, transparent);
  text-align: center;
}

.readonly-detail-dialog__footer {
  padding: 10px 16px 16px;
}

@media (prefers-reduced-motion: reduce) {
  .readonly-detail-dialog * {
    transition: none !important;
    animation: none !important;
  }
}
</style>

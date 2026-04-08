<template>
  <v-card rounded="xl" class="pa-5 enterprise-surface h-100 dashboard-chart-card">
    <div class="d-flex align-center justify-space-between mb-3" style="gap: 12px; flex-wrap: wrap;">
      <div>
        <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
        <div v-if="subtitle" class="text-body-2 text-medium-emphasis">{{ subtitle }}</div>
      </div>
      <v-chip v-if="chipLabel" label :color="chipColor" variant="tonal">{{ chipLabel }}</v-chip>
    </div>

    <div v-if="normalizedItems.length" class="dashboard-bar-chart">
      <div
        v-for="item in normalizedItems"
        :key="item.key"
        class="dashboard-bar-chart__row"
      >
        <div class="dashboard-bar-chart__meta">
          <div class="dashboard-bar-chart__label">{{ item.label }}</div>
          <div class="dashboard-bar-chart__value">{{ item.valueLabel }}</div>
        </div>
        <div class="dashboard-bar-chart__track">
          <div
            class="dashboard-bar-chart__fill"
            :style="{
              width: `${item.percent}%`,
              background: item.color,
            }"
          />
        </div>
        <div v-if="item.helper" class="dashboard-bar-chart__helper">{{ item.helper }}</div>
      </div>
    </div>

    <v-alert
      v-else
      type="info"
      variant="tonal"
      density="compact"
      :text="emptyText"
    />
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";

type ChartItem = {
  key: string;
  label: string;
  value: number;
  valueLabel?: string;
  color?: string;
  helper?: string;
};

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    chipLabel?: string;
    chipColor?: string;
    emptyText?: string;
    items: ChartItem[];
  }>(),
  {
    subtitle: "",
    chipLabel: "",
    chipColor: "primary",
    emptyText: "No hay datos suficientes para graficar.",
  },
);

const palette = [
  "linear-gradient(90deg, #2f6cab 0%, #7ab8ff 100%)",
  "linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%)",
  "linear-gradient(90deg, #e17a00 0%, #ffca6a 100%)",
  "linear-gradient(90deg, #a245d8 0%, #dd9cff 100%)",
  "linear-gradient(90deg, #e24f5f 0%, #ff9aa5 100%)",
  "linear-gradient(90deg, #4558d8 0%, #9db0ff 100%)",
];

const normalizedItems = computed(() => {
  const source = Array.isArray(props.items) ? props.items : [];
  const maxValue = Math.max(
    ...source.map((item) => Number(item?.value || 0)),
    1,
  );

  return source.map((item, index) => {
    const rawValue = Number(item?.value || 0);
    return {
      key: item.key,
      label: item.label,
      value: rawValue,
      valueLabel: item.valueLabel || String(rawValue),
      helper: item.helper || "",
      color: item.color || palette[index % palette.length],
      percent: Math.max(6, Math.min(100, (rawValue / maxValue) * 100)),
    };
  });
});
</script>

<style scoped>
.dashboard-chart-card {
  border: 1px solid var(--surface-border);
}

.dashboard-bar-chart {
  display: grid;
  gap: 14px;
}

.dashboard-bar-chart__row {
  display: grid;
  gap: 6px;
}

.dashboard-bar-chart__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.dashboard-bar-chart__label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--app-text);
}

.dashboard-bar-chart__value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--app-text);
}

.dashboard-bar-chart__track {
  position: relative;
  height: 10px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-soft) 78%, transparent);
  border: 1px solid var(--surface-border);
}

.dashboard-bar-chart__fill {
  height: 100%;
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(19, 33, 53, 0.18);
}

.dashboard-bar-chart__helper {
  font-size: 0.78rem;
  color: var(--app-muted-text);
}
</style>

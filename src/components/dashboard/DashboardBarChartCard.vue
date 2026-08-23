<template>
  <v-card rounded="xl" class="enterprise-surface h-100 dashboard-chart-card">
    <div class="dashboard-chart-card__header">
      <div class="dashboard-chart-card__heading">
        <div class="dashboard-chart-card__icon">
          <v-icon icon="mdi-chart-bar-stacked" size="21" />
        </div>
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
          <div v-if="subtitle" class="text-body-2 text-medium-emphasis">{{ subtitle }}</div>
        </div>
      </div>
      <v-chip v-if="chipLabel" label :color="chipColor" variant="tonal">{{ chipLabel }}</v-chip>
    </div>

    <div v-if="normalizedItems.length" class="dashboard-bar-chart">
      <div
        v-for="item in normalizedItems"
        :key="item.key"
        :class="['dashboard-bar-chart__row', { 'dashboard-bar-chart__row--interactive': interactive }]"
        :role="interactive ? 'button' : undefined"
        :tabindex="interactive ? 0 : undefined"
        :aria-haspopup="interactive ? 'dialog' : undefined"
        @click="handleItemClick(item)"
        @keydown.enter="handleItemClick(item)"
        @keydown.space.prevent="handleItemClick(item)"
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

    <div
      v-else
      class="dashboard-bar-chart__empty text-body-2 text-medium-emphasis"
    >
      {{ emptyText }}
    </div>
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
    interactive?: boolean;
  }>(),
  {
    subtitle: "",
    chipLabel: "",
    chipColor: "primary",
    emptyText: "No hay datos suficientes para graficar.",
    interactive: false,
  },
);

const emit = defineEmits<{
  (event: "item-click", item: ChartItem & { valueLabel: string; percent: number }): void;
}>();

function handleItemClick(item: ChartItem & { valueLabel: string; percent: number }) {
  if (!props.interactive) return;
  emit("item-click", item);
}

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
  position: relative;
  overflow: hidden;
  padding: 20px;
  border: 1px solid var(--surface-border);
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.055), transparent 46%),
    var(--surface-base);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.dashboard-chart-card::after {
  position: absolute;
  right: -55px;
  bottom: -70px;
  width: 180px;
  height: 180px;
  border: 32px solid rgba(var(--v-theme-primary), 0.04);
  border-radius: 50%;
  content: "";
  pointer-events: none;
}

.dashboard-chart-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.1);
}

.dashboard-chart-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 17px;
  flex-wrap: wrap;
}

.dashboard-chart-card__heading {
  display: flex;
  align-items: center;
  gap: 11px;
}

.dashboard-chart-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.dashboard-bar-chart {
  display: grid;
  gap: 14px;
}

.dashboard-bar-chart__row {
  display: grid;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 13px;
  transition: background 150ms ease, transform 150ms ease;
}

.dashboard-bar-chart__row:hover {
  transform: translateX(2px);
  background: rgba(var(--v-theme-primary), 0.045);
}

.dashboard-bar-chart__row--interactive {
  cursor: pointer;
}

.dashboard-bar-chart__row--interactive:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.dashboard-bar-chart__row--interactive:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
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
  height: 9px;
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
  transition: width 360ms ease;
}

.dashboard-bar-chart__helper {
  font-size: 0.78rem;
  color: var(--app-muted-text);
}

.dashboard-bar-chart__empty {
  display: grid;
  min-height: 126px;
  padding: 22px;
  place-items: center;
  border: 1px dashed var(--surface-border);
  border-radius: 15px;
  background: color-mix(in srgb, var(--surface-soft) 74%, transparent);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-chart-card,
  .dashboard-bar-chart__row,
  .dashboard-bar-chart__fill {
    transition: none;
  }
}

@media (max-width: 600px) {
  .dashboard-chart-card {
    padding: 16px;
  }

  .dashboard-chart-card__header {
    align-items: flex-start;
  }
}
</style>

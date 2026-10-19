<template>
  <div class="equipment-chart-detail" role="region" :aria-label="title" tabindex="0">
    <table :aria-label="title">
      <thead>
        <tr>
          <th scope="col">Marca</th>
          <th scope="col">Unidad Generación</th>
          <th scope="col">Ubicación</th>
          <th scope="col">Central (Sucursal)</th>
          <th scope="col" class="number">{{ valueLabel }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in tableRows" :key="item.row.key">
          <td>{{ item.brand }}</td>
          <td>
            <button type="button" :aria-label="`Ver detalle de ${item.row.label}`" @click="emit('select', item.row)">
              {{ item.unit }}
            </button>
          </td>
          <td>{{ item.location }}</td>
          <td>{{ item.central }}</td>
          <td class="number">{{ formatValue(item.row) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { splitEquipmentReportLabel } from "@/app/utils/equipment-display";
import type { ReportingRelationshipRow } from "@/app/utils/reporting-relations";

const props = defineProps<{
  rows: ReportingRelationshipRow[];
  title: string;
  valueLabel: string;
  formatValue: (row: ReportingRelationshipRow) => string;
}>();
const emit = defineEmits<{ select: [row: ReportingRelationshipRow] }>();
const tableRows = computed(() => props.rows.map(row => ({ row, ...splitEquipmentReportLabel(row.label) })));
</script>

<style scoped>
.equipment-chart-detail {
  max-width: 100%;
  overflow-x: auto;
  border-top: 1px solid var(--report-border);
}
table { width: 100%; min-width: 580px; border-collapse: collapse; table-layout: fixed; font-size: 0.8125rem; line-height: 1.5; }
th, td { padding: 10px 8px; text-align: left; vertical-align: top; white-space: normal; overflow-wrap: anywhere; }
th { color: rgb(var(--v-theme-on-surface)); background: rgba(var(--v-theme-primary), 0.06); font-weight: 700; }
th:nth-child(1) { width: 19%; }
th:nth-child(2) { width: 31%; }
th:nth-child(3) { width: 17%; }
th:nth-child(4) { width: 19%; }
th:nth-child(5) { width: 14%; }
tbody tr + tr { border-top: 1px solid var(--report-border); }
tbody tr:hover { background: rgba(var(--v-theme-primary), 0.04); }
.number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
button { display: block; width: 100%; min-height: 24px; color: rgb(var(--v-theme-primary)); font: inherit; font-weight: 600; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
button:hover { text-decoration: underline; }
button:focus-visible, .equipment-chart-detail:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
</style>

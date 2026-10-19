<template>
  <div class="equipment-location-timeline">
    <p class="text-caption mb-4">
      Ubicación y sucursal conservadas en cada permanencia. La referencia
      inicial indica el comienzo del seguimiento; no acredita una fecha de
      llegada anterior. Últimas 100 permanencias.
    </p>
    <p v-if="!entries.length" class="text-body-2">
      Sin historial de ubicaciones registrado.
    </p>
    <ol v-else class="location-timeline">
      <li v-for="entry in entries" :key="entry.id">
        <div class="location-period">
          <strong>{{ formatDateTime(entry.valid_from) }}</strong
          ><span>{{
            entry.valid_to
              ? `Hasta ${formatDateTime(entry.valid_to)}`
              : "Ubicación actual"
          }}</span>
        </div>
        <div>
          <strong>{{
            [entry.location_codigo, entry.location_nombre]
              .filter(Boolean)
              .join(" · ") || "Sin ubicación"
          }}</strong>
          <p>
            Sucursal:
            {{
              [entry.sucursal_codigo, entry.sucursal_nombre]
                .filter(Boolean)
                .join(" · ") || "Sin sucursal"
            }}
          </p>
          <small>{{
            entry.source === "BASELINE_OBSERVED"
              ? "Referencia inicial observada"
              : entry.source === "EQUIPMENT_CREATED"
                ? "Alta de equipo"
                : entry.source === "EQUIPMENT_MOVED"
                  ? "Traslado del equipo"
                  : "Cambio en ubicación o sucursal"
          }}</small>
        </div>
      </li>
    </ol>
  </div>
</template>
<script setup lang="ts">
import { formatDateTime } from "@/app/utils/date-time";
import type { EquipmentLocationEntry } from "@/app/utils/equipment-location-history";
defineProps<{ entries: EquipmentLocationEntry[] }>();
</script>
<style scoped>
.location-timeline {
  list-style: none;
  padding: 0;
}
.location-timeline li {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 22px;
  margin-left: 6px;
  padding: 0 0 28px 22px;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.25);
  position: relative;
}
.location-timeline li:before {
  content: "";
  position: absolute;
  left: -6px;
  top: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
}
.location-timeline strong {
  display: block;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.location-timeline p {
  font-size: 13px;
  margin-top: 5px;
}
.location-period strong,
.location-timeline small {
  font-size: 11px;
}
.location-period span {
  font-size: 11px;
  opacity: 0.7;
}
.location-timeline small {
  display: block;
  margin-top: 7px;
  color: rgb(var(--v-theme-primary));
}
@media (max-width: 600px) {
  .location-timeline li {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>

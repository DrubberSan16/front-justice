<template>
  <div>
    <p class="text-body-2 mb-4">
      Identidad física y relaciones registradas. Selecciona una compartición
      para revisar su contexto.
    </p>
    <v-alert v-if="!state.components.length" type="info" variant="tonal"
      >El equipo no tiene comparticiones registradas.</v-alert
    >
    <div class="structure-grid">
      <button
        v-for="component in state.components"
        :key="component.id"
        type="button"
        class="structure-node"
        :class="{ 'structure-node--selected': selected === component.id }"
        :aria-pressed="selected === component.id"
        @click="selected = component.id"
      >
        <v-icon icon="mdi-cube-outline" color="primary" /><span
          ><small>{{ component.categoria || "Compartición" }}</small>
          <strong>{{ component.nombre_oficial || component.nombre }}</strong
          ><span>Serie: {{ component.serie || "Sin registrar" }}</span></span
        >
      </button>
    </div>
    <v-card v-if="active" class="mt-6 pa-5" variant="outlined" rounded="lg">
      <h3 class="text-subtitle-1">
        {{ active.nombre_oficial || active.nombre }}
      </h3>
      <dl class="component-facts">
        <div>
          <dt>Código</dt>
          <dd>{{ active.codigo || "—" }}</dd>
        </div>
        <div>
          <dt>Serie</dt>
          <dd>{{ active.serie || "Sin registrar" }}</dd>
        </div>
        <div>
          <dt>Componente padre</dt>
          <dd>{{ parentName }}</dd>
        </div>
      </dl>
      <p class="text-body-2 mt-3">
        {{ active.descripcion || "Sin descripción registrada." }}
      </p>
      <h4 class="text-subtitle-2 mt-4">
        Órdenes relacionadas en los registros consultados
      </h4>
      <p v-if="!orders.length" class="text-body-2 mt-2">
        Sin OT asociadas a esta compartición en los últimos 100 registros.
      </p>
      <div
        v-for="order in orders"
        :key="order.id"
        class="component-order text-body-2"
      >
        <strong>{{ order.code }}</strong
        ><span>{{ order.title }}</span
        ><v-chip size="small" variant="tonal">{{
          order.status_workflow
        }}</v-chip>
      </div>
    </v-card>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { TwinState } from "@/app/types/digital-twin.types";
const props = defineProps<{ state: TwinState }>();
const selected = ref("");
watch(
  () => props.state.identity.id,
  () => {
    selected.value = "";
  },
);
const active = computed(() =>
  props.state.components.find((c) => c.id === selected.value),
);
const parentName = computed(
  () =>
    props.state.components.find((c) => c.id === active.value?.parent_id)
      ?.nombre_oficial ||
    (active.value?.parent_id
      ? "Relación sin componente disponible"
      : props.state.identity.operational_name || props.state.identity.name),
);
const orders = computed(() =>
  props.state.orders.filter((o) => o.equipo_componente_id === selected.value),
);
</script>
<style scoped>
.structure-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 24px;
  margin-top: 24px;
}
.structure-node {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  min-height: 140px;
  text-align: left;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 24px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  min-width: 0;
}
.structure-node > span {
  display: grid;
  gap: 12px;
  overflow-wrap: anywhere;
}
.structure-node small {
  color: rgb(var(--v-theme-primary));
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 12px;
}
.structure-node strong {
  font-size: 16px;
  line-height: 1.5;
}
.structure-node span span {
  font-size: 13px;
  opacity: 0.75;
}
.structure-node:hover,
.structure-node--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}
.structure-node:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.component-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr));
  gap: 24px;
  margin-top: 24px;
}
.component-facts dt {
  font-size: 12px;
  opacity: 0.7;
}
.component-facts dd {
  font-size: 14px;
  overflow-wrap: anywhere;
  margin-top: 8px;
}
.component-order {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.component-order span {
  flex: 1;
  min-width: 150px;
}
</style>

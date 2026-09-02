<template>
  <EnterprisePageMotion class="placeholder-page">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar este módulo.
    </v-alert>

    <v-card v-else rounded="xl" class="placeholder-card enterprise-surface">
      <div class="placeholder-card__icon">
        <v-icon icon="mdi-progress-wrench" size="34" />
      </div>

      <div class="placeholder-card__eyebrow">{{ titulo }}</div>
      <h1 class="placeholder-card__title">Pantalla en desarrollo</h1>
      <p class="placeholder-card__lead">
        Este tablero todavía no tiene indicadores definidos. Cuando se acuerde su
        contenido se publicará aquí, sin cambiar la ruta ni el permiso ya asignado.
      </p>

      <div class="placeholder-card__meta">
        <v-icon icon="mdi-shield-check-outline" size="16" />
        El acceso ya está configurado: quien tenga este permiso aterrizará aquí al ingresar.
      </div>
    </v-card>
  </EnterprisePageMotion>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import EnterprisePageMotion from "@/components/ui/EnterprisePageMotion.vue";
import { useMenuStore } from "@/app/stores/menu.store";
import { canReadComponent } from "@/app/utils/menu-permissions";

/**
 * Marcador para los tableros aún sin contenido definido.
 *
 * Una sola vista sirve a todos: el título y el componente de permiso salen del
 * `meta` de la ruta, así que añadir otro tablero pendiente no exige un archivo
 * nuevo. La ruta y el permiso quedan operativos desde ya, de modo que se puede
 * asignar el acceso antes de que exista el contenido.
 */
const route = useRoute();
const menuStore = useMenuStore();

const titulo = computed(() => String(route.meta?.title ?? "Tablero"));
const componente = computed(() => String(route.meta?.permissionComponent ?? route.path));
const canRead = computed(() => canReadComponent(menuStore.tree, componente.value));
</script>

<style scoped>
.placeholder-page {
  width: 100%;
  min-width: 0;
}

/* Estilo Swiss: superficie plana con regla de acento, sin ornamento. */
.placeholder-card {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 56px 24px;
  border-top: 3px solid rgb(var(--v-theme-primary));
  background: var(--surface-base);
  text-align: center;
}

.placeholder-card__icon {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 18px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.07);
}

.placeholder-card__eyebrow {
  margin-top: 6px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.placeholder-card__title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.2;
}

.placeholder-card__lead {
  margin: 0;
  max-width: 56ch;
  color: var(--app-muted-text);
  font-size: 0.92rem;
  line-height: 1.6;
}

.placeholder-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 7px 13px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.07);
  color: var(--app-muted-text);
  font-size: 0.78rem;
}
</style>

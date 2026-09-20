<template>
  <nav class="reports-sidebar" aria-label="Navegación de reportería">
    <v-list density="comfortable" nav class="reports-sidebar__list">
      <v-list-item
        title="Volver al menú principal"
        prepend-icon="mdi-arrow-left"
        rounded="xl"
        class="reports-sidebar__back"
        @click="leaveReports"
      />
    </v-list>

    <div v-if="!collapsed" class="reports-sidebar__search">
      <v-text-field
        v-model="search"
        label="Buscar informe"
        prepend-inner-icon="mdi-magnify"
        variant="solo-filled"
        density="compact"
        clearable
        hide-details
      />
    </div>

    <div v-if="!collapsed" class="reports-sidebar__intro">
      <span>Menú exclusivo</span>
      <strong>Reportería</strong>
      <small>Seleccione un informe para cruzar su información con los demás procesos.</small>
    </div>

    <div v-for="group in visibleGroups" :key="group.name" class="reports-sidebar__group">
      <div v-if="!collapsed" class="reports-sidebar__label">{{ group.name }}</div>
      <v-list density="comfortable" nav class="reports-sidebar__list">
        <v-tooltip
          v-for="module in group.modules"
          :key="module.key"
          :text="module.title"
          location="end"
          :disabled="!collapsed"
        >
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              :title="module.shortTitle"
              :prepend-icon="module.icon"
              :active="module.key === activeModuleKey"
              rounded="xl"
              class="reports-sidebar__item"
              @click="selectModule(module.key)"
            />
          </template>
        </v-tooltip>
      </v-list>
    </div>

    <div v-if="!collapsed && search && !visibleModuleCount" class="reports-sidebar__empty">
      <v-icon icon="mdi-magnify-close" />
      Sin informes coincidentes
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  REPORTING_MODULE_GROUPS,
  REPORTING_MODULES,
} from "@/app/config/reporting-modules";

defineProps<{ collapsed?: boolean }>();

const route = useRoute();
const router = useRouter();
const search = ref("");

const activeModuleKey = computed(() => String(route.query.modulo || REPORTING_MODULES[0]?.key || ""));
const visibleGroups = computed(() => {
  const term = search.value.trim().toLocaleLowerCase("es-EC");
  return REPORTING_MODULE_GROUPS.map((name) => ({
    name,
    modules: REPORTING_MODULES.filter((module) => {
      if (module.group !== name) return false;
      if (!term) return true;
      return `${module.title} ${module.shortTitle} ${module.description}`
        .toLocaleLowerCase("es-EC")
        .includes(term);
    }),
  })).filter((group) => group.modules.length > 0);
});
const visibleModuleCount = computed(() =>
  visibleGroups.value.reduce((total, group) => total + group.modules.length, 0),
);

function selectModule(moduleKey: string) {
  if (moduleKey === activeModuleKey.value) return;
  void router.push({
    name: "reporteria",
    query: {
      ...route.query,
      modulo: moduleKey,
    },
  });
}

function leaveReports() {
  void router.push({ name: "dashboard" });
}
</script>

<style scoped>
.reports-sidebar { padding: 4px 10px 18px; }
.reports-sidebar__list { color: var(--nav-text); background: transparent; }
.reports-sidebar__back { min-height: 48px; margin-bottom: 10px; color: var(--nav-text); border: 1px solid var(--nav-border); background: var(--nav-surface); font-weight: 760; }
.reports-sidebar__back:hover { background: var(--nav-hover); }
.reports-sidebar__search { padding: 0 4px 12px; }
.reports-sidebar__search :deep(.v-field) { min-height: 44px; border: 1px solid var(--nav-border); border-radius: 14px; color: var(--nav-text); background: var(--nav-surface); box-shadow: none; }
.reports-sidebar__search :deep(.v-label),
.reports-sidebar__search :deep(.v-icon) { color: var(--nav-muted); }
.reports-sidebar__intro { display: grid; gap: 3px; margin: 0 4px 12px; padding: 13px 14px; border: 1px solid color-mix(in srgb, var(--nav-accent) 30%, var(--nav-border)); border-radius: 15px; background: color-mix(in srgb, var(--nav-accent) 8%, var(--nav-surface)); }
.reports-sidebar__intro span,
.reports-sidebar__label { color: var(--nav-muted); font-size: 0.66rem; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; }
.reports-sidebar__intro strong { color: var(--nav-text); font-size: 0.98rem; }
.reports-sidebar__intro small { color: var(--nav-muted); line-height: 1.35; }
.reports-sidebar__group { margin-top: 8px; }
.reports-sidebar__label { padding: 7px 12px 3px; }
.reports-sidebar__item { min-height: 46px; margin-block: 3px; color: var(--nav-text); font-size: 0.86rem; font-weight: 650; transition: color 160ms ease, background-color 160ms ease, transform 160ms ease; }
.reports-sidebar__item:hover { background: var(--nav-hover); transform: translateX(2px); }
.reports-sidebar__item:focus-visible,
.reports-sidebar__back:focus-visible { outline: 3px solid rgba(122, 190, 230, 0.42); outline-offset: 1px; }
.reports-sidebar__item.v-list-item--active { color: var(--nav-text); background: var(--nav-active); box-shadow: inset 3px 0 var(--nav-accent); }
.reports-sidebar__empty { display: grid; min-height: 110px; place-items: center; align-content: center; gap: 8px; color: var(--nav-muted); font-size: 0.82rem; }
@media (prefers-reduced-motion: reduce) { .reports-sidebar__item { transition: none; } }
</style>

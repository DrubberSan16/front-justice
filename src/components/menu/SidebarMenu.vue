<template>
  <nav class="sidebar-menu" aria-label="Navegación principal">
    <v-progress-linear v-if="menu.loading" indeterminate rounded color="primary" class="mb-2" />

    <div v-if="!collapsed" class="sidebar-menu__search">
      <v-text-field
        v-model="search"
        label="Buscar en el menú"
        prepend-inner-icon="mdi-magnify"
        variant="solo-filled"
        density="compact"
        clearable
        hide-details
      />
    </div>

    <div v-if="!collapsed" class="sidebar-menu__label">Navegación</div>
    <v-list density="comfortable" nav class="sidebar-menu__list">
      <SidebarMenuItem v-for="node in filteredTree" :key="node.id" :node="node" />
    </v-list>

    <div v-if="!collapsed && search && !filteredTree.length" class="sidebar-menu__empty">
      <v-icon icon="mdi-magnify-close" />
      Sin coincidencias
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useMenuStore } from "@/app/stores/menu.store";
import type { MenuNode } from "@/app/types/menu.types";
import SidebarMenuItem from "@/components/menu/SidebarMenuItem.vue";

defineProps<{ collapsed?: boolean }>();
const menu = useMenuStore();
const search = ref("");

function filterNodes(nodes: MenuNode[], term: string): MenuNode[] {
  return nodes.flatMap((node) => {
    const children = filterNodes(node.children ?? [], term);
    const haystack = `${node.nombre || ""} ${node.descripcion || ""}`.toLocaleLowerCase("es");
    if (haystack.includes(term) || children.length) return [{ ...node, children }];
    return [];
  });
}

const filteredTree = computed(() => {
  const term = search.value.trim().toLocaleLowerCase("es");
  return term ? filterNodes(menu.tree, term) : menu.tree;
});
</script>

<style scoped>
.sidebar-menu { padding: 4px 10px 14px; }
.sidebar-menu__search { padding: 0 4px 12px; }
.sidebar-menu__search :deep(.v-field) { min-height: 44px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; color: #eef6fb; background: rgba(255, 255, 255, 0.07); box-shadow: none; }
.sidebar-menu__search :deep(.v-label),
.sidebar-menu__search :deep(.v-icon) { color: rgba(238, 246, 251, 0.65); }
.sidebar-menu__label { padding: 7px 12px; color: rgba(232, 243, 250, 0.46); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase; }
.sidebar-menu__list { color: #eef6fb; background: transparent; }
.sidebar-menu__empty { display: grid; min-height: 120px; place-items: center; align-content: center; gap: 8px; color: rgba(232, 243, 250, 0.52); font-size: 0.82rem; }
</style>

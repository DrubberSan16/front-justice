<template>
  <v-list-group v-if="hasChildren" :value="node.nombre" class="sidebar-group">
    <template #activator="{ props: activatorProps }">
      <v-list-item
        v-bind="activatorProps"
        :title="node.nombre"
        :active="isActive"
        rounded="xl"
        class="sidebar-item"
      >
        <template #prepend><span class="sidebar-item__icon"><v-icon :icon="icon" /></span></template>
      </v-list-item>
    </template>
    <SidebarMenuItem v-for="child in node.children" :key="child.id" :node="child" :module-scope="moduleScope" />
  </v-list-group>

  <v-list-item
    v-else
    :title="node.nombre"
    :active="isActive"
    rounded="xl"
    class="sidebar-item"
    @click="goToComponent(node.urlComponent)"
  >
    <template #prepend><span class="sidebar-item__icon"><v-icon :icon="icon" /></span></template>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { MenuNode } from "@/app/types/menu.types";
import { resolveIcon } from "@/app/config/icons";
import { resolveMenuRouteLocation } from "@/app/utils/menu-route-catalog";

const props = defineProps<{ node: MenuNode; moduleScope?: string }>();
const router = useRouter();
const route = useRoute();
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0);
const icon = computed(() => resolveIcon(props.node.icon));
const moduleScope = computed(() => props.moduleScope ?? props.node.nombre);

function nodeMatchesRoute(node: MenuNode): boolean {
  const target = resolveMenuRouteLocation(router, node.urlComponent);
  const targetName = target && typeof target === "object" && "name" in target ? target.name : null;
  return targetName === route.name || (node.children ?? []).some(nodeMatchesRoute);
}

const isActive = computed(() => nodeMatchesRoute(props.node));

function goToComponent(urlComponent: string) {
  const target = resolveMenuRouteLocation(router, urlComponent);
  if (target) router.push(target);
}
</script>

<style scoped>
.sidebar-item { min-height: 48px; margin-block: 3px; color: rgba(238, 246, 251, 0.78); font-size: 0.88rem; font-weight: 650; transition: color 160ms ease, background-color 160ms ease, transform 160ms ease; }
.sidebar-item:hover { color: #fff; background: rgba(255, 255, 255, 0.075); transform: translateX(2px); }
.sidebar-item:focus-visible { outline: 3px solid rgba(122, 190, 230, 0.36); outline-offset: 1px; }
.sidebar-item.v-list-item--active { color: #fff; background: linear-gradient(100deg, rgba(45, 128, 176, 0.34), rgba(45, 128, 176, 0.13)); box-shadow: inset 3px 0 #d7ad70; }
.sidebar-item__icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px; color: rgba(238, 246, 251, 0.72); background: rgba(255, 255, 255, 0.055); }
.sidebar-item.v-list-item--active .sidebar-item__icon { color: #d7ad70; background: rgba(215, 173, 112, 0.12); }
.sidebar-group :deep(.v-list-group__items) { padding-left: 10px; }
@media (prefers-reduced-motion: reduce) { .sidebar-item { transition: none; } }
</style>

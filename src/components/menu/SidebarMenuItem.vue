<template>
  <v-list-group v-if="hasChildren" :value="node.nombre">
    <template #activator="{ props }">
      <v-list-item v-bind="props" :title="node.nombre" :subtitle="node.descripcion">
        <template #prepend>
          <v-icon :icon="icon" :color="iconColor" />
        </template>
      </v-list-item>
    </template>

    <SidebarMenuItem
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :module-scope="moduleScope"
    />
  </v-list-group>

  <v-list-item
    v-else
    :title="node.nombre"
    :subtitle="node.descripcion"
    @click="goToComponent(node.urlComponent)"
  >
    <template #prepend>
      <v-icon :icon="icon" :color="iconColor" />
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { MenuNode } from "@/app/types/menu.types";
import { resolveIcon, resolveModuleIconColor } from "@/app/config/icons";
import { resolveMenuRouteLocation } from "@/app/utils/menu-route-catalog";

const props = defineProps<{ node: MenuNode; moduleScope?: string }>();
const router = useRouter();

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0);
const icon = computed(() => resolveIcon(props.node.icon));
const moduleScope = computed(() => props.moduleScope ?? props.node.nombre);
const iconColor = computed(() => resolveModuleIconColor(moduleScope.value));

function goToComponent(urlComponent: string) {
  const target = resolveMenuRouteLocation(router, urlComponent);
  if (target) router.push(target);
}
</script>

<template>
  <v-list-group v-if="hasChildren" :value="node.nombre">
    <template #activator="{ props }">
      <v-list-item v-bind="props" :title="node.nombre" :subtitle="node.descripcion">
        <template #prepend>
          <v-icon :icon="icon" />
        </template>
      </v-list-item>
    </template>

    <SidebarMenuItem
      v-for="child in node.children"
      :key="child.id"
      :node="child"
    />
  </v-list-group>

  <v-list-item
    v-else
    :title="node.nombre"
    :subtitle="node.descripcion"
    @click="goToComponent(node.urlComponent)"
  >
    <template #prepend>
      <v-icon :icon="icon" />
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { MenuNode } from "@/app/types/menu.types";
import { resolveIcon } from "@/app/config/icons";

const props = defineProps<{ node: MenuNode }>();
const router = useRouter();

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0);
const icon = computed(() => resolveIcon(props.node.icon));

function goToComponent(urlComponent: string) {
  // Backend trae cosas como "Dashboard", "Usuarios" o "/"
  // Aquí defines tu mapping rápido hacia rutas reales.
  const map: Record<string, { name: string }> = {
    Dashboard: { name: "dashboard" },
    Usuarios: { name: "usuarios" },
    Usuario: { name: "usuarios" },
    Menu: { name: "menu" },    
    Rol: { name: "roles" },    
  };

  const target = map[urlComponent];
  if (target) router.push(target);
}
</script>

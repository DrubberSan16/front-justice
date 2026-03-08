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

const props = defineProps<{ node: MenuNode; moduleScope?: string }>();
const router = useRouter();

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0);
const icon = computed(() => resolveIcon(props.node.icon));
const moduleScope = computed(() => props.moduleScope ?? props.node.nombre);
const iconColor = computed(() => resolveModuleIconColor(moduleScope.value));

function normalizeRouteKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/^app\//, "")
    .replace(/[\s_]+/g, "-");
}

function goToComponent(urlComponent: string) {
  const key = normalizeRouteKey(urlComponent);

  const map: Record<string, { name: string }> = {
    dashboard: { name: "dashboard" },
    usuarios: { name: "usuarios" },
    usuario: { name: "usuarios" },
    menu: { name: "menu" },
    menus: { name: "menu" },
    rol: { name: "roles" },
    roles: { name: "roles" },

    productos: { name: "productos" },
    producto: { name: "productos" },

    sucursales: { name: "sucursales" },
    sucursal: { name: "sucursales" },

    bodegas: { name: "bodegas" },
    bodega: { name: "bodegas" },

    lineas: { name: "lineas" },
    linea: { name: "lineas" },

    categorias: { name: "categorias" },
    categoria: { name: "categorias" },

    marcas: { name: "marcas" },
    marca: { name: "marcas" },

    "unidades-medida": { name: "unidades-medida" },
    "unidad-medida": { name: "unidades-medida" },
    unidades: { name: "unidades-medida" },

    "stock-bodega": { name: "stock-bodega" },
    stock: { name: "stock-bodega" },

    terceros: { name: "terceros" },
    tercero: { name: "terceros" },

    equipos: { name: "equipos" },
    equipo: { name: "equipos" },

    "tipo-equipos": { name: "tipo-equipos" },
    "tipo-equipo": { name: "tipo-equipos" },
    
    planes: { name: "planes" },
    plan: { name: "planes" },

    programaciones: { name: "programaciones" },
    programacion: { name: "programaciones" },

    alertas: { name: "alertas" },
    alerta: { name: "alertas" },

    "work-orders": { name: "work-orders" },
    "work-order": { name: "work-orders" },
    ots: { name: "work-orders" },

    kardex: { name: "kardex" },
  };

  const target = map[key];
  if (target) {
    router.push(target);
    return;
  }

  const directByName = router.getRoutes().find((r) => r.name === urlComponent);
  if (directByName?.name) {
    router.push({ name: directByName.name as string });
    return;
  }

  const directByPath = router.getRoutes().find((r) => r.path.replace(/^\//, "") === key);
  if (directByPath?.name) {
    router.push({ name: directByPath.name as string });
  }
}
</script>

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
    :class="['sidebar-item', { 'sidebar-item--virtual': node.virtual }]"
    @click="goToNode(node)"
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
  // Los nodos virtuales comparten ruta entre si (todos los tipos de equipo van
  // a `equipos`), asi que el nombre de ruta no basta para saber cual esta
  // activo: hay que mirar tambien el parametro que los diferencia.
  if (node.routeLocation && typeof node.routeLocation === "object") {
    const target = node.routeLocation as Record<string, any>;
    if (target.name !== route.name) return false;
    const expected = target.query ?? {};
    return Object.entries(expected).every(
      ([key, value]) => String(route.query[key] ?? "") === String(value ?? ""),
    );
  }
  const target = resolveMenuRouteLocation(router, node.urlComponent);
  const targetName = target && typeof target === "object" && "name" in target ? target.name : null;
  // Un padre real no debe quedar activo solo porque uno de sus hijos virtuales
  // lo este: el hijo ya se resalta por su cuenta.
  const childMatches = (node.children ?? []).some(
    (child) => !child.virtual && nodeMatchesRoute(child),
  );
  return targetName === route.name || childMatches;
}

const isActive = computed(() => nodeMatchesRoute(props.node));

function goToNode(node: MenuNode) {
  if (node.routeLocation) {
    void router.push(node.routeLocation);
    return;
  }
  const target = resolveMenuRouteLocation(router, node.urlComponent);
  if (target) void router.push(target);
}
</script>

<style scoped>
.sidebar-item { min-height: 48px; margin-block: 3px; color: var(--nav-text); font-size: 0.88rem; font-weight: 650; transition: color 160ms ease, background-color 160ms ease, transform 160ms ease; }
.sidebar-item:hover { color: var(--nav-text); background: var(--nav-hover); transform: translateX(2px); }
.sidebar-item:focus-visible { outline: 3px solid rgba(122, 190, 230, 0.36); outline-offset: 1px; }
.sidebar-item.v-list-item--active { color: var(--nav-text); background: var(--nav-active); box-shadow: inset 3px 0 var(--nav-accent); }
.sidebar-item__icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px; color: var(--nav-muted); background: var(--nav-surface); }
.sidebar-item.v-list-item--active .sidebar-item__icon { color: var(--nav-accent); background: color-mix(in srgb, var(--nav-accent) 14%, transparent); }
.sidebar-group :deep(.v-list-group__items) { padding-left: 10px; }
/* Los hijos calculados (tipos de equipo) pesan menos que una entrada del menu
   real: son un filtro sobre la misma pantalla, no otro modulo. */
.sidebar-item--virtual { min-height: 40px; font-size: 0.8rem; font-weight: 550; }

/* El nombre del tipo tiene que leerse entero.
   Vuetify recorta el titulo con puntos suspensivos, y en este nivel el ancho
   util cae a 95 px (dos indentaciones de grupo mas el hueco del icono) cuando
   los nombres piden entre 100 y 162 px: los diez salian cortados y dos tipos
   distintos quedaban identicos en pantalla ("EQUIPO DE FI..." para CPT y para
   TPTA). Se deja que el texto fluya a varias lineas en vez de recortarlo. */
.sidebar-item--virtual :deep(.v-list-item-title) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.25;
  padding-block: 3px;
}

/* El icono repetido en cada tipo se comia ancho justo donde falta; un punto
   marca la jerarquia igual de bien y devuelve esos pixeles al nombre. */
.sidebar-item--virtual .sidebar-item__icon {
  width: 16px;
  height: 16px;
  background: none;
}
.sidebar-item--virtual :deep(.v-list-item__prepend) { width: 22px; min-width: 22px; }
.sidebar-item--virtual :deep(.v-list-item__spacer) { width: 6px; }
@media (prefers-reduced-motion: reduce) { .sidebar-item { transition: none; } }
</style>

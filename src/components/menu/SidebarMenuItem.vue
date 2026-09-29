<template>
  <v-list-subheader v-if="node.header" class="sidebar-subheader">{{ node.nombre }}</v-list-subheader>

  <v-list-group v-else-if="hasChildren" :value="node.nombre" class="sidebar-group">
    <template #activator="{ props: activatorProps, isOpen }">
      <v-list-item
        v-bind="withoutToggle(activatorProps)"
        :title="node.nombre"
        :active="isActive"
        rounded="xl"
        :class="itemClasses"
        @click="onGroupClick($event, activatorProps.onClick, isOpen)"
      >
        <template #prepend><span class="sidebar-item__icon"><v-icon :icon="icon" /></span></template>
      </v-list-item>
    </template>
    <SidebarMenuItem
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :module-scope="moduleScope"
      :depth="depth + 1"
    />
  </v-list-group>

  <v-list-item
    v-else
    :title="node.nombre"
    :active="isActive"
    rounded="xl"
    :class="itemClasses"
    @click="goToNode(node)"
  >
    <template #prepend><span class="sidebar-item__icon"><v-icon :icon="icon" /></span></template>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import type { MenuNode } from "@/app/types/menu.types";
import { resolveIcon } from "@/app/config/icons";
import { resolveMenuRouteLocation } from "@/app/utils/menu-route-catalog";

const props = withDefaults(
  defineProps<{ node: MenuNode; moduleScope?: string; depth?: number }>(),
  { depth: 0 },
);
const router = useRouter();
const route = useRoute();
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0);
const icon = computed(() => resolveIcon(props.node.icon));
const moduleScope = computed(() => props.moduleScope ?? props.node.nombre);
const itemClasses = computed(() => [
  "sidebar-item",
  {
    "sidebar-item--virtual": props.node.virtual,
    // Del tercer nivel en adelante (Inventario > Materiales > Kardex) el ancho
    // util ya no alcanza para el estilo completo.
    "sidebar-item--deep": props.depth >= 2,
  },
]);

/** Ruta a la que lleva el nodo por si mismo, o `null` si solo agrupa. */
function ownTarget(node: MenuNode): RouteLocationRaw | null {
  return node.routeLocation ?? resolveMenuRouteLocation(router, node.urlComponent);
}

function matchesOwnRoute(node: MenuNode): boolean {
  // Los nodos virtuales comparten ruta entre si (todos los informes van a
  // `reporteria`), asi que el nombre de ruta no basta para saber cual esta
  // activo: hay que mirar tambien el parametro que los diferencia.
  if (node.routeLocation && typeof node.routeLocation === "object") {
    const target = node.routeLocation as Record<string, any>;
    if (target.name !== route.name) return false;
    const expected = target.query ?? {};
    return Object.entries(expected).every(([key, value]) => {
      const current = route.query[key];
      const missing = current === undefined || current === null || current === "";
      if (missing && node.defaultWhenMissing?.includes(key)) return true;
      return String(current ?? "") === String(value ?? "");
    });
  }
  const target = resolveMenuRouteLocation(router, node.urlComponent);
  const targetName = target && typeof target === "object" && "name" in target ? target.name : null;
  return targetName === route.name;
}

function nodeMatchesRoute(node: MenuNode): boolean {
  if (node.routeLocation && typeof node.routeLocation === "object") {
    return matchesOwnRoute(node);
  }
  // Un padre real no debe quedar activo solo porque uno de sus hijos virtuales
  // lo este: el hijo ya se resalta por su cuenta.
  const childMatches = (node.children ?? []).some(
    (child) => !child.virtual && nodeMatchesRoute(child),
  );
  return matchesOwnRoute(node) || childMatches;
}

const isActive = computed(() => nodeMatchesRoute(props.node));

/** El destino con los parametros de la URL actual que el nodo pide conservar. */
function resolveTarget(node: MenuNode): RouteLocationRaw | null {
  const base = ownTarget(node);
  const keep = node.preserveQuery ?? [];
  if (!base || !keep.length || typeof base !== "object") return base;
  const carried = Object.fromEntries(
    keep
      .filter((key) => route.query[key] !== undefined)
      .map((key) => [key, route.query[key]]),
  );
  return { ...(base as Record<string, any>), query: { ...carried, ...((base as any).query ?? {}) } };
}

function goToNode(node: MenuNode) {
  const target = resolveTarget(node);
  if (target) void router.push(target);
}

// Vuetify trae el pliegue/despliegue en el `onClick` del activador. Aqui se
// decide a mano, porque una opcion con hijos puede ser tambien una pantalla.
function withoutToggle(activatorProps: Record<string, any>) {
  const { onClick: _toggle, ...rest } = activatorProps;
  return rest;
}

/**
 * Clic en una opcion que tiene hijos.
 *
 * Una seccion (Inventario) solo se pliega o se despliega. Una opcion que es a la
 * vez pantalla (Materiales) abre su pantalla Y despliega sus hijos; si ya se
 * esta en ella, el clic solo pliega o despliega, para poder cerrarla. Sin
 * permiso de lectura no hay pantalla que abrir: se comporta como una seccion.
 */
function onGroupClick(event: Event, toggleHandler: unknown, isOpen: boolean) {
  // El activador de Vuetify entrega su `onClick` sin tipo concreto.
  const toggle = toggleHandler as (event: Event) => void;
  const canOpenScreen = Boolean(props.node.permissions?.isReaded);
  const target = canOpenScreen ? resolveTarget(props.node) : null;
  if (!target || matchesOwnRoute(props.node)) {
    toggle(event);
    return;
  }
  void router.push(target);
  if (!isOpen) toggle(event);
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
/* Un grupo dentro de otro (Inventario > Materiales, Informes > Reporteria) suma
   solo un escalon corto de sangria. Vuetify suma por nivel el ancho del icono
   (40 px) mas 16 px: en el tercer nivel eran 120 px de relleno y al titulo le
   quedaban 99 px, asi que "Transferencia Bodega" se partia en dos lineas. */
.sidebar-group .sidebar-group { --list-indent-size: 2px; --prepend-width: 10px; }
/* Rotulo de grupo dentro de un submenu (Mantenimiento / Inventario en Reporteria). */
.sidebar-subheader { min-height: 30px; padding-inline: 12px; color: var(--nav-muted); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
/* Los hijos calculados (informes de Reporteria) y los de tercer nivel pesan
   menos que una entrada del menu real: son una vista dentro de un modulo, no
   otro modulo, y a esta profundidad falta ancho. */
.sidebar-item--virtual,
.sidebar-item--deep { min-height: 40px; font-size: 0.8rem; font-weight: 550; }

/* El nombre tiene que leerse entero.
   Vuetify recorta el titulo con puntos suspensivos, y en este nivel el ancho
   util cae a 95 px (dos indentaciones de grupo mas el hueco del icono) cuando
   los nombres piden entre 100 y 162 px: salian cortados y dos entradas
   distintas quedaban identicas en pantalla. Se deja que el texto fluya a
   varias lineas en vez de recortarlo. */
.sidebar-item--virtual :deep(.v-list-item-title),
.sidebar-item--deep :deep(.v-list-item-title) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.25;
  padding-block: 3px;
}

/* El icono repetido en cada entrada se comia ancho justo donde falta; un punto
   marca la jerarquia igual de bien y devuelve esos pixeles al nombre. */
.sidebar-item--virtual .sidebar-item__icon,
.sidebar-item--deep .sidebar-item__icon {
  width: 16px;
  height: 16px;
  background: none;
}
.sidebar-item--virtual :deep(.v-list-item__prepend),
.sidebar-item--deep :deep(.v-list-item__prepend) { width: 22px; min-width: 22px; }
.sidebar-item--virtual :deep(.v-list-item__spacer),
.sidebar-item--deep :deep(.v-list-item__spacer) { width: 6px; }
@media (prefers-reduced-motion: reduce) { .sidebar-item { transition: none; } }
</style>

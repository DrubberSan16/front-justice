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
import { computed, onMounted, ref, watch } from "vue";
import { useMenuStore } from "@/app/stores/menu.store";
import type { MenuNode } from "@/app/types/menu.types";
import { listAllPages } from "@/app/utils/list-all-pages";
import { normalizeMenuRouteKey } from "@/app/utils/menu-route-catalog";
import { DEFAULT_CATALOG_CACHE_TTL_MS } from "@/app/utils/request-cache";
import SidebarMenuItem from "@/components/menu/SidebarMenuItem.vue";

defineProps<{ collapsed?: boolean }>();
const menu = useMenuStore();
const search = ref("");

/**
 * Tipos de equipo colgados del nodo "Equipos".
 *
 * No se dan de alta en `tb_menu`: se calculan desde el catalogo, asi que un
 * tipo nuevo aparece en el menu sin tocar la base ni el codigo, y uno retirado
 * desaparece solo. Cada hijo lleva a la misma pantalla de equipos, filtrada por
 * su tipo.
 */
const equipmentTypes = ref<Array<Record<string, any>>>([]);

function isEquipmentNode(node: MenuNode) {
  return normalizeMenuRouteKey(node.urlComponent) === "equipos";
}

function findEquipmentNode(nodes: MenuNode[]): MenuNode | null {
  for (const node of nodes) {
    if (isEquipmentNode(node)) return node;
    const found = findEquipmentNode(node.children ?? []);
    if (found) return found;
  }
  return null;
}

async function loadEquipmentTypes() {
  const node = findEquipmentNode(menu.tree);
  // Sin permiso de lectura sobre Equipos el nodo no esta en el arbol y no hay
  // nada que colgar: tampoco se pide el catalogo.
  if (!node || !node.permissions?.isReaded) {
    equipmentTypes.value = [];
    return;
  }
  try {
    const rows = await listAllPages(
      "/kpi_maintenance/tipo-equipo",
      {},
      { cacheTtlMs: DEFAULT_CATALOG_CACHE_TTL_MS },
    );
    equipmentTypes.value = Array.isArray(rows) ? rows : [];
  } catch {
    // El menu no se rompe por esto: sin catalogo, "Equipos" sigue siendo una
    // entrada normal que abre la lista completa.
    equipmentTypes.value = [];
  }
}

function buildEquipmentTypeChildren(node: MenuNode): MenuNode[] {
  // Al colgarle hijos, "Equipos" pasa a ser un grupo desplegable y su activador
  // ya solo abre y cierra: se perdia el acceso directo a la lista completa que
  // habia antes. Este primer hijo lo devuelve.
  const todos: MenuNode = {
    id: "equipos-todos",
    parentId: node.id,
    nombre: "Todos los equipos",
    descripcion: "Listado completo, sin filtrar por tipo",
    icon: "$mdiFormatListBulleted",
    urlComponent: node.urlComponent,
    menuPosition: "",
    status: "ACTIVE",
    permissions: node.permissions,
    children: [],
    virtual: true,
    routeLocation: { name: "equipos" },
  };
  const tipos = equipmentTypes.value
    .map((type) => ({
      id: `equipos-tipo-${type?.id}`,
      parentId: node.id,
      nombre:
        String(type?.nombre || type?.codigo || "").trim() || "Sin nombre",
      descripcion: String(type?.descripcion || "").trim(),
      icon: "$mdiEngineOutline",
      urlComponent: node.urlComponent,
      menuPosition: String(type?.codigo || ""),
      status: "ACTIVE",
      permissions: node.permissions,
      children: [],
      virtual: true,
      routeLocation: {
        name: "equipos",
        query: { tipo: String(type?.id || "") },
      },
    }))
    .sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));
  return [todos, ...tipos];
}

function withEquipmentTypes(nodes: MenuNode[]): MenuNode[] {
  return nodes.map((node) => {
    if (isEquipmentNode(node) && equipmentTypes.value.length) {
      return {
        ...node,
        children: [...(node.children ?? []), ...buildEquipmentTypeChildren(node)],
      };
    }
    const children = node.children ?? [];
    return children.length
      ? { ...node, children: withEquipmentTypes(children) }
      : node;
  });
}

const augmentedTree = computed(() => withEquipmentTypes(menu.tree));

onMounted(loadEquipmentTypes);
watch(() => menu.tree, loadEquipmentTypes, { deep: false });

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
  return term ? filterNodes(augmentedTree.value, term) : augmentedTree.value;
});
</script>

<style scoped>
.sidebar-menu { padding: 4px 10px 14px; }
.sidebar-menu__search { padding: 0 4px 12px; }
.sidebar-menu__search :deep(.v-field) { min-height: 44px; border: 1px solid var(--nav-border); border-radius: 14px; color: var(--nav-text); background: var(--nav-surface); box-shadow: none; }
.sidebar-menu__search :deep(.v-label),
.sidebar-menu__search :deep(.v-icon) { color: var(--nav-muted); }
.sidebar-menu__label { padding: 7px 12px; color: var(--nav-muted); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase; }
.sidebar-menu__list { color: var(--nav-text); background: transparent; }
.sidebar-menu__empty { display: grid; min-height: 120px; place-items: center; align-content: center; gap: 8px; color: var(--nav-muted); font-size: 0.82rem; }
</style>

<template>
  <div class="menus-page" :ref="setMotionRoot">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar el módulo de menú.
    </v-alert>

    <template v-else>
      <motion.section
        v-if="canCreate && unassignedModules.length"
        class="modules-panel enterprise-surface"
        :initial="motionInitial"
        :animate="{ opacity: 1, y: 0 }"
        :transition="motionTransition"
      >
      <div class="panel-heading">
        <div class="panel-heading__icon panel-heading__icon--modules">
          <v-icon icon="mdi-view-grid-plus-outline" size="28" />
        </div>
        <div>
          <div class="panel-heading__eyebrow">Disponibles para agregar</div>
          <h2>Módulos nuevos detectados</h2>
          <p>Seleccione únicamente los módulos que desea mostrar en la navegación.</p>
        </div>
        <v-chip color="primary" variant="tonal" size="large" class="panel-heading__count">
          {{ unassignedModules.length }} disponibles
        </v-chip>
      </div>

      <div class="modules-grid">
        <article
          v-for="item in unassignedModules"
          :key="item.value"
          class="module-card js-hover-card"
        >
          <div class="module-card__top">
            <span class="module-card__icon"><v-icon icon="mdi-puzzle-plus-outline" /></span>
            <v-chip size="x-small" color="warning" variant="tonal">Sin asignar</v-chip>
          </div>
          <div class="module-card__copy">
            <strong>{{ item.title }}</strong>
            <span>{{ item.routePath }}</span>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            size="large"
            block
            @click="openCreateFromRoute(item)"
          >
            Agregar al menú
          </v-btn>
        </article>
      </div>
      </motion.section>

      <motion.section
        class="menu-panel enterprise-surface"
        :initial="motionInitial"
        :animate="{ opacity: 1, y: 0 }"
        :transition="motionTransitionDelayed"
      >
      <div class="menu-hero">
        <div class="menu-hero__title">
          <div class="panel-heading__icon"><v-icon icon="mdi-sitemap-outline" size="28" /></div>
          <div>
            <div class="panel-heading__eyebrow">Administración</div>
            <h1>Menús del sistema</h1>
            <p>Organice menús principales y submenús desde un solo lugar.</p>
          </div>
        </div>

        <div class="menu-hero__actions">
          <MassPurgeButton
            endpoint="/kpi_security/menus/purge-all"
            module-title="Menu"
            @purged="handleMenusPurged"
          />
          <v-btn
            v-if="canCreate"
            color="primary"
            size="large"
            prepend-icon="mdi-plus"
            @click="openCreateParent"
          >
            Crear menú principal
          </v-btn>
        </div>
      </div>

      <div class="menu-stats" aria-label="Resumen de menús">
        <article><span>Total</span><strong>{{ allRows.length }}</strong></article>
        <article><span>Principales</span><strong>{{ rootMenuCount }}</strong></article>
        <article><span>Submenús</span><strong>{{ childMenuCount }}</strong></article>
        <article><span>Activos</span><strong>{{ activeMenuCount }}</strong></article>
      </div>

      <div class="menu-toolbar">
        <v-text-field
          v-model="menus.search"
          label="Buscar menú"
          placeholder="Nombre, descripción o ruta"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          class="menu-toolbar__search"
        />
        <div v-if="canManageDeleted" class="menu-toolbar__deleted">
          <v-switch
            v-model="menus.includeDeleted"
            label="Mostrar eliminados"
            color="primary"
            density="comfortable"
            hide-details
          />
        </div>
      </div>

      <v-alert v-if="menus.error" type="error" variant="tonal" class="mb-4">
        {{ menus.error }}
      </v-alert>

      <v-data-table
        :headers="headers"
        :items="rows"
        :loading="menus.loading"
        loading-text="Obteniendo menús..."
        :items-per-page="20"
        class="elevation-0 enterprise-table menus-table"
      >
        <template #item.nombre="{ item }">
          <div class="menu-name" :style="`--menu-depth: ${item.depth}`">
            <span v-if="item.depth > 0" class="menu-name__branch" aria-hidden="true" />
            <span class="menu-name__icon"><v-icon :icon="resolveIcon(item.icon ?? undefined)" /></span>
            <span class="menu-name__copy">
              <strong>{{ item.nombre }}</strong>
              <small>{{ item.depth > 0 ? "Submenú" : "Menú principal" }}</small>
            </span>
          </div>
        </template>

        <template #item.descripcion="{ item }">
          <span class="table-muted">{{ item.descripcion || "Sin descripción" }}</span>
        </template>

        <template #item.urlComponent="{ item }">
          <code class="route-pill">{{ item.urlComponent || "Sin vista" }}</code>
        </template>

        <template #item.menuPosition="{ item }">
          <span class="position-badge">{{ item.menuPosition }}</span>
        </template>

        <template #item.status="{ item }">
          <v-chip size="small" :color="item.status === 'ACTIVE' ? 'success' : 'secondary'" variant="tonal" :prepend-icon="item.status === 'ACTIVE' ? 'mdi-check-circle-outline' : 'mdi-pause-circle-outline'">
            {{ item.status === "ACTIVE" ? "Activo" : "Inactivo" }}
          </v-chip>
        </template>

        <template #item.isDeleted="{ item }">
          <v-chip size="small" :color="item.isDeleted ? 'error' : 'success'" variant="tonal">
            {{ item.isDeleted ? "Eliminado" : "Vigente" }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <div class="menu-actions">
            <v-btn v-if="canCreate && !item.isDeleted" icon="mdi-plus" variant="tonal" color="primary" size="small" title="Crear submenú" aria-label="Crear submenú" @click="openCreateChild(item)" />
            <v-btn v-if="canEdit && !item.isDeleted" icon="mdi-pencil-outline" variant="tonal" size="small" title="Editar menú" aria-label="Editar menú" @click="openEdit(item)" />
            <v-btn v-if="canDelete && !item.isDeleted" icon="mdi-delete-outline" variant="tonal" color="error" size="small" title="Eliminar menú" aria-label="Eliminar menú" @click="openDelete(item)" />
          </div>
        </template>
      </v-data-table>
      </motion.section>
    </template>

  <v-dialog v-model="formDialog" :fullscreen="isDialogFullscreen" :max-width="isDialogFullscreen ? undefined : 720">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        {{ isEditing ? "Editar menu" : (isCreatingChild ? "Crear menu hijo" : "Crear menu padre") }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.nombre" label="Nombre" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.menuPosition"
              label="Posicion"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.status"
              :items="['ACTIVE', 'INACTIVE']"
              label="Estado"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.icon" label="Icono" variant="outlined">
              <template #prepend-inner>
                <v-icon :icon="resolveIcon(form.icon)" />
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.urlComponent"
              :items="componentOptions"
              item-title="title"
              item-value="value"
              label="Vista del front"
              variant="outlined"
              clearable
              no-data-text="No hay vistas disponibles"
              :hint="selectedComponentHint"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              :model-value="parentName"
              label="Menu padre"
              variant="outlined"
              readonly
              hint="Vacio = menu padre"
              persistent-hint
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="form.descripcion"
              label="Descripcion"
              variant="outlined"
              rows="2"
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="formDialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="busy" @click="onSubmitForm">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" :fullscreen="isDeleteDialogFullscreen" :max-width="isDeleteDialogFullscreen ? undefined : 500">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar menu</v-card-title>
      <v-card-text>
        Seguro que deseas eliminar <strong>{{ selected?.nombre }}</strong>?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" :loading="busy" @click="onConfirmDelete">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { resolveMotionElement, useRevealMotion } from "@/app/motion";
import { motion, useReducedMotion } from "motion-v";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useMenusStore } from "@/app/stores/menus.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { canAccessDigitalTwins, canManageDeletedRecords } from "@/app/utils/role-access";
import {
  coerceMenuComponentValue,
  getMenuRouteCatalog,
  type MenuRouteCatalogItem,
} from "@/app/utils/menu-route-catalog";
import { createLogTransact } from "@/app/services/log-transacts.service";
import {
  buildRequestContext,
  type LogTransactRequestContext,
} from "@/app/http/request-context";
import { resolveIcon } from "@/app/config/icons";
import MassPurgeButton from "@/components/common/MassPurgeButton.vue";

import type { MenuNodeFull } from "@/app/types/menus-full.types";

type MenuRow = MenuNodeFull & { depth: number };

const router = useRouter();
const menus = useMenusStore();
const menuStore = useMenuStore();
const ui = useUiStore();
const auth = useAuthStore();
const { mdAndDown, smAndDown } = useDisplay();
const shouldReduceMotion = useReducedMotion();
const motionInitial = computed(() => ({
  opacity: 0,
  y: shouldReduceMotion.value ? 0 : 18,
}));
const motionTransition = computed(() => ({
  duration: shouldReduceMotion.value ? 0 : 0.34,
  ease: "easeOut",
}));
const motionTransitionDelayed = computed(() => ({
  duration: shouldReduceMotion.value ? 0 : 0.38,
  delay: shouldReduceMotion.value ? 0 : 0.06,
  ease: "easeOut",
}));

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, ["Menu", "Menú", "Menus"])
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const canManageDeleted = computed(() => canManageDeletedRecords(auth.user));

const routeCatalog = computed(() =>
  getMenuRouteCatalog(router).filter((item) =>
    canAccessDigitalTwins(auth.user) ? true : item.value !== "gemelos-digitales"
  )
);

const headers = computed(() => [
  { title: "Menú", key: "nombre", minWidth: "250px" },
  { title: "Descripción", key: "descripcion", minWidth: "220px" },
  { title: "Vista", key: "urlComponent", minWidth: "160px" },
  { title: "Posición", key: "menuPosition", align: "center" as const },
  { title: "Estado", key: "status" },
  ...(canManageDeleted.value ? [{ title: "Eliminado", key: "isDeleted" }] : []),
  ...(canCreate.value || canEdit.value || canDelete.value
    ? [{ title: "Acciones", key: "actions", sortable: false, align: "end" as const }]
    : []),
]);

function flattenNodes(nodes: MenuNodeFull[], depth = 0): MenuRow[] {
  const out: MenuRow[] = [];
  const sorted = [...(nodes ?? [])].sort(
    (a, b) => Number(a.menuPosition) - Number(b.menuPosition)
  );

  for (const node of sorted) {
    out.push({ ...node, depth });
    if (node.children?.length) {
      out.push(...flattenNodes(node.children, depth + 1));
    }
  }

  return out;
}

function normalizeMenuValue(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/^app\//, "")
    .replace(/[\s_]+/g, "-");
}

function isRestrictedMenuNode(item: MenuNodeFull | MenuRow) {
  if (canAccessDigitalTwins(auth.user)) return false;
  const component = normalizeMenuValue(coerceMenuComponentValue(router, item.urlComponent ?? ""));
  const name = normalizeMenuValue(item.nombre);
  return component === "gemelos-digitales" || name === "gemelos-digitales";
}

const rows = computed(() => flattenNodes(menus.filteredTree).filter((item) => !isRestrictedMenuNode(item)));
const allRows = computed(() => flattenNodes(menus.tree).filter((item) => !isRestrictedMenuNode(item)));
const rootMenuCount = computed(() => allRows.value.filter((item) => !item.parentId).length);
const childMenuCount = computed(() => allRows.value.filter((item) => Boolean(item.parentId)).length);
const activeMenuCount = computed(() =>
  allRows.value.filter((item) => item.status === "ACTIVE" && !item.isDeleted).length
);

const assignedRoutes = computed(() => {
  const used = new Set<string>();
  for (const item of allRows.value) {
    const value = coerceMenuComponentValue(router, item.urlComponent ?? "");
    if (value) used.add(value);
  }
  return used;
});

const unassignedModules = computed(() =>
  routeCatalog.value.filter((item) => !assignedRoutes.value.has(item.value))
);

const formDialog = ref(false);
const deleteDialog = ref(false);
const busy = ref(false);
const selected = ref<MenuRow | null>(null);
const isCreatingChild = ref(false);
const isDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);

const form = reactive({
  nombre: "",
  descripcion: "",
  menuId: null as string | null,
  urlComponent: "",
  menuPosition: "0",
  status: "ACTIVE",
  icon: "",
});

const componentOptions = computed(() => {
  const base = routeCatalog.value.map((item) => ({
    title: item.label,
    value: item.value,
    routePath: item.routePath,
    viewName: item.viewName,
  }));

  if (!form.urlComponent || base.some((item) => item.value === form.urlComponent)) {
    return base;
  }

  return [
    {
      title: `${form.urlComponent} · valor heredado`,
      value: form.urlComponent,
      routePath: "Sin ruta detectada",
      viewName: "",
    },
    ...base,
  ];
});

const selectedComponentHint = computed(() => {
  if (!form.urlComponent) {
    return "Opcional para menus contenedores. Si eliges una vista se guardara el name de la ruta.";
  }

  const current = componentOptions.value.find((item) => item.value === form.urlComponent);
  if (!current) return "Valor actual no asociado a una ruta detectada.";

  return current.viewName
    ? `${current.routePath} · ${current.viewName}`
    : current.routePath;
});

const isEditing = computed(() => !!selected.value && !isCreatingChild.value);
const parentName = computed(() => {
  if (!form.menuId) return "";
  const parent = allRows.value.find((item) => item.id === form.menuId);
  return parent?.nombre ?? form.menuId;
});

onMounted(async () => {
  if (!canRead.value) return;
  if (!canManageDeleted.value) {
    menus.includeDeleted = false;
  }
  await menus.fetchAll();
});

watch(
  () => menus.includeDeleted,
  async (value, previous) => {
    if (!canManageDeleted.value) {
      if (value) menus.includeDeleted = false;
      return;
    }
    if (value === previous || !canRead.value) return;
    await menus.fetchAll();
  },
);

function nextRootPosition(): string {
  const roots = menus.tree ?? [];
  const maxPosition = roots.reduce((max, item) => {
    const value = Number(item.menuPosition);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, -1);

  return String(maxPosition + 1);
}

function resetForm() {
  form.nombre = "";
  form.descripcion = "";
  form.menuId = null;
  form.urlComponent = "";
  form.menuPosition = "0";
  form.status = "ACTIVE";
  form.icon = "";
}

function openCreateParent() {
  selected.value = null;
  isCreatingChild.value = false;
  resetForm();
  form.menuId = null;
  form.menuPosition = nextRootPosition();
  formDialog.value = true;
}

function openCreateFromRoute(item: MenuRouteCatalogItem) {
  selected.value = null;
  isCreatingChild.value = false;
  resetForm();
  form.nombre = item.title;
  form.descripcion = item.routePath;
  form.menuId = null;
  form.urlComponent = item.value;
  form.menuPosition = nextRootPosition();
  formDialog.value = true;
}

function openCreateChild(item: MenuRow) {
  selected.value = item;
  isCreatingChild.value = true;
  resetForm();
  form.menuId = item.id;
  form.menuPosition = String((Number(item.menuPosition) || 0) + 1);
  formDialog.value = true;
}

function openEdit(item: MenuRow) {
  selected.value = item;
  isCreatingChild.value = false;
  form.nombre = item.nombre;
  form.descripcion = item.descripcion ?? "";
  form.menuId = item.parentId;
  form.urlComponent = coerceMenuComponentValue(router, item.urlComponent ?? "");
  form.menuPosition = String(item.menuPosition ?? "0");
  form.status = item.status;
  form.icon = item.icon ?? "";
  formDialog.value = true;
}

function openDelete(item: MenuRow) {
  selected.value = item;
  deleteDialog.value = true;
}

async function handleMenusPurged() {
  await menus.fetchAll();
}

function currentUserName() {
  return auth.user?.nameUser || "admin";
}

async function logAndShowTechnicalError(
  typeLog: string,
  description: string,
  context: LogTransactRequestContext = {},
) {
  const ticket = await createLogTransact({
    moduleMicroservice: "kpi_security",
    status: "ACTIVE",
    typeLog,
    description,
    createdBy: currentUserName(),
    ...context,
  });

  ui.error(
    ticket
      ? `Error tecnico, informacion enviada al equipo de soporte. TICKET: ${ticket}`
      : "Error tecnico, enviar detalles al equipo de soporte"
  );
}

async function onSubmitForm() {
  if (busy.value) return;
  busy.value = true;

  try {
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      menuId: form.menuId,
      urlComponent: form.urlComponent,
      menuPosition: form.menuPosition,
      status: form.status,
      icon: form.icon,
    };

    if (isEditing.value && selected.value) {
      await menus.updateMenu(selected.value.id, payload);
    } else {
      await menus.createMenu(payload);
    }

    ui.success("Guardado con exito");
    formDialog.value = false;
  } catch (e: any) {
    const details =
      `Menus module error\n` +
      `action=${isEditing.value ? "UPDATE" : "CREATE"}\n` +
      `menuId=${selected.value?.id ?? "new"}\n` +
      `payload=${JSON.stringify(form)}\n` +
      `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;

    await logAndShowTechnicalError(
      isEditing.value ? "MENU_UPDATE" : "MENU_CREATE",
      details,
      buildRequestContext(e, { ...form })
    );
  } finally {
    busy.value = false;
  }
}

async function onConfirmDelete() {
  if (!selected.value || busy.value) return;
  busy.value = true;
  try {
    await menus.deleteMenu(selected.value.id);
    deleteDialog.value = false;
    ui.success("Eliminado con exito");
  } catch (e: any) {
    const details =
      `Menus module error\n` +
      `action=DELETE\n` +
      `menuId=${selected.value.id}\n` +
      `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;

    await logAndShowTechnicalError(
      "MENU_DELETE",
      details,
      buildRequestContext(e, { id: selected.value?.id ?? null })
    );
  } finally {
    busy.value = false;
  }
}
/**
 * Motor de movimiento del design system, solo para el hover de tarjetas
 * (`js-hover-card`).
 *
 * Se declara al final del `<script setup>` y sin clave de reenganche a
 * proposito: `useRevealMotion` evalua su getter al instante, y una clave que
 * lea un computed puede alcanzar variables aun en zona muerta. Sin clave no hay
 * watch, asi que no hay TDZ posible.
 *
 * Al no usar clases de revelado, el peor caso si el motor no engancha es
 * quedarse sin animacion de hover, nunca con contenido invisible.
 */
const motionRoot = useRevealMotion<HTMLElement>();

function setMotionRoot(el: unknown) {
  motionRoot.value = resolveMotionElement(el);
}
</script>

<style scoped>
.menus-page {
  display: grid;
  width: 100%;
  gap: 20px;
}

.modules-panel,
.menu-panel {
  width: 100%;
  padding: clamp(20px, 2vw, 30px);
  border-radius: 24px;
}

.panel-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}

.panel-heading__icon {
  display: grid;
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
  border-radius: 16px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.panel-heading__icon--modules {
  color: rgb(var(--v-theme-warning));
  border-color: rgba(var(--v-theme-warning), 0.22);
  background: rgba(var(--v-theme-warning), 0.1);
}

.panel-heading__eyebrow {
  margin-bottom: 3px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.74rem;
  font-weight: 850;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.panel-heading h2,
.menu-hero h1 {
  margin: 0;
  letter-spacing: -0.025em;
}

.panel-heading h2 { font-size: clamp(1.35rem, 2vw, 1.7rem); }
.menu-hero h1 { font-size: clamp(1.6rem, 2.5vw, 2.15rem); }
.panel-heading p,
.menu-hero p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  line-height: 1.5;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 14px;
}

.module-card {
  display: grid;
  min-width: 0;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
  border-radius: 18px;
  background: color-mix(in srgb, rgb(var(--v-theme-surface)) 88%, transparent);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.module-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.34);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
  /* El desplazamiento lo gobierna el motor via js-hover-card. */
}

.module-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.module-card__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.module-card__copy {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 5px;
}

.module-card__copy strong {
  font-size: 1rem;
  line-height: 1.35;
}

.module-card__copy span {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-panel {
  display: grid;
  gap: 20px;
}

.menu-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.menu-hero__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.menu-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.menu-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.menu-stats article {
  display: flex;
  min-height: 74px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 15px;
  background: rgba(var(--v-theme-primary), 0.045);
}

.menu-stats span {
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.82rem;
  font-weight: 700;
}

.menu-stats strong {
  font-size: 1.55rem;
  font-variant-numeric: tabular-nums;
}

.menu-toolbar {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 17px;
  background: rgba(var(--v-theme-on-surface), 0.025);
}

.menu-toolbar__search { width: 100%; }
.menu-toolbar__deleted {
  display: flex;
  min-height: 52px;
  align-items: center;
  padding: 0 14px;
  border-radius: 13px;
  background: rgba(var(--v-theme-on-surface), 0.045);
}

.menus-table {
  box-shadow: none;
}

.menus-table :deep(th) {
  height: 54px !important;
  color: rgba(var(--v-theme-on-surface), 0.68) !important;
  font-size: 0.78rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.menus-table :deep(td) {
  min-height: 68px;
  padding-block: 10px !important;
}

.menus-table :deep(tbody tr) {
  transition: background-color 160ms ease;
}

.menus-table :deep(tbody tr:hover) {
  background: rgba(var(--v-theme-primary), 0.045) !important;
}

.menu-name {
  display: flex;
  min-width: 220px;
  align-items: center;
  gap: 11px;
  padding-left: calc(var(--menu-depth) * 18px);
}

.menu-name__branch {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.35);
  border-left: 2px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 0 0 0 6px;
  transform: translateY(-4px);
}

.menu-name__icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.menu-name__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.menu-name__copy strong { font-size: 0.92rem; }
.menu-name__copy small,
.table-muted {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.79rem;
}

.route-pill {
  display: inline-flex;
  max-width: 230px;
  padding: 5px 9px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 8px;
  color: rgba(var(--v-theme-on-surface), 0.78);
  background: rgba(var(--v-theme-on-surface), 0.045);
  font-family: inherit;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.position-badge {
  display: inline-grid;
  min-width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.menu-actions {
  display: flex;
  min-width: 128px;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.menus-table :deep(.v-data-table-footer) {
  flex-wrap: wrap;
  gap: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .module-card,
  .menus-table :deep(tbody tr) { transition: none; }
}

@media (max-width: 1100px) {
  .menu-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .menu-hero__actions { justify-content: flex-start; }
  .menu-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 960px) {
  .menus-table :deep(.v-data-table-footer__items-per-page),
  .menus-table :deep(.v-data-table-footer__pagination) {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 700px) {
  .modules-panel,
  .menu-panel {
    padding: 16px;
    border-radius: 20px;
  }

  .panel-heading {
    grid-template-columns: auto 1fr;
    align-items: start;
  }

  .panel-heading__count { grid-column: 1 / -1; justify-self: stretch; }
  .panel-heading__count :deep(.v-chip__content) { width: 100%; justify-content: center; }
  .menu-hero__title { align-items: flex-start; }
  .menu-hero__actions { display: grid; grid-template-columns: 1fr; }
  .menu-hero__actions :deep(.v-btn) { width: 100%; }
  .menu-stats { grid-template-columns: 1fr 1fr; }
  .menu-toolbar { grid-template-columns: 1fr; }
  .menu-toolbar__deleted { width: 100%; }
}

@media (max-width: 430px) {
  .panel-heading__icon { width: 46px; height: 46px; border-radius: 14px; }
  .menu-stats { grid-template-columns: 1fr; }
  .menu-stats article { min-height: 62px; }
}
</style>

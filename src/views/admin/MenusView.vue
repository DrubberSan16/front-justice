<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar el modulo de menu.
  </v-alert>

  <template v-else>
    <v-card
      v-if="canCreate && unassignedModules.length"
      rounded="xl"
      class="pa-4 mb-3 enterprise-surface"
    >
      <div class="d-flex align-center justify-space-between mb-3" style="gap: 8px; flex-wrap: wrap;">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Modulos nuevos detectados</div>
          <div class="text-body-2 text-medium-emphasis">
            Estas vistas ya existen en el front y aun no estan asignadas dentro del menu.
          </div>
        </div>
      </div>

      <v-row dense>
        <v-col
          v-for="item in unassignedModules"
          :key="item.value"
          cols="12"
          md="6"
          xl="4"
        >
          <v-sheet rounded="lg" border class="pa-3 h-100">
            <div class="text-body-1 font-weight-medium">{{ item.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.viewName }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.routePath }}</div>
            <v-btn
              class="mt-3"
              size="small"
              color="primary"
              variant="tonal"
              @click="openCreateFromRoute(item)"
            >
              Agregar al menu
            </v-btn>
          </v-sheet>
        </v-col>
      </v-row>
    </v-card>

    <v-card rounded="xl" class="pa-4 enterprise-surface">
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <div class="text-h6 font-weight-bold">Menu</div>
          <div class="text-body-2 text-medium-emphasis">
            Administracion de menus padres e hijos.
          </div>
        </div>

        <v-btn
          v-if="canCreate"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreateParent"
        >
          Crear menu padre
        </v-btn>
      </div>

      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="menus.search"
            label="Buscar (nombre, descripcion, ruta, icono)"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
          />
        </v-col>
        <v-col cols="12" md="3" class="d-flex align-center">
          <v-checkbox
            v-model="menus.includeDeleted"
            label="Incluir eliminados"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>

      <v-alert v-if="menus.error" type="error" variant="tonal" class="mb-3">
        {{ menus.error }}
      </v-alert>

      <v-data-table
        :headers="headers"
        :items="rows"
        :loading="menus.loading"
        :items-per-page="20"
        class="elevation-0 enterprise-table"
      >
        <template #item.icon="{ item }">
          <v-icon :icon="resolveIcon(item.icon ?? undefined)" />
        </template>

        <template #item.nombre="{ item }">
          <div
            :style="`padding-left: ${item.depth * 18}px`"
            class="d-flex align-center"
            style="gap: 8px;"
          >
            <v-icon
              v-if="item.depth > 0"
              size="16"
              icon="mdi-subdirectory-arrow-right"
            />
            <span>{{ item.nombre }}</span>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-chip
            size="small"
            :color="item.status === 'ACTIVE' ? 'green' : 'grey'"
            variant="tonal"
          >
            {{ item.status }}
          </v-chip>
        </template>

        <template #item.isDeleted="{ item }">
          <v-chip
            size="small"
            :color="item.isDeleted ? 'red' : 'green'"
            variant="tonal"
          >
            {{ item.isDeleted ? "Si" : "No" }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex align-center" style="gap: 4px;">
            <v-btn
              v-if="canCreate && !item.isDeleted"
              icon="mdi-plus"
              variant="text"
              color="primary"
              title="Crear hijo"
              @click="openCreateChild(item)"
            />
            <v-btn
              v-if="canEdit && !item.isDeleted"
              icon="mdi-pencil"
              variant="text"
              @click="openEdit(item)"
            />
            <v-btn
              v-if="canDelete && !item.isDeleted"
              icon="mdi-delete"
              variant="text"
              color="error"
              @click="openDelete(item)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>
  </template>

  <v-dialog v-model="formDialog" max-width="720">
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

  <v-dialog v-model="deleteDialog" max-width="500">
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
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useMenusStore } from "@/app/stores/menus.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import {
  coerceMenuComponentValue,
  getMenuRouteCatalog,
  type MenuRouteCatalogItem,
} from "@/app/utils/menu-route-catalog";
import { createLogTransact } from "@/app/services/log-transacts.service";
import { resolveIcon } from "@/app/config/icons";

import type { MenuNodeFull } from "@/app/types/menus-full.types";

type MenuRow = MenuNodeFull & { depth: number };

const router = useRouter();
const menus = useMenusStore();
const menuStore = useMenuStore();
const ui = useUiStore();
const auth = useAuthStore();

const perms = computed(() =>
  getPermissionsForAnyComponent(menuStore.tree, ["Menu", "Menú", "Menus"])
);
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);

const routeCatalog = computed(() => getMenuRouteCatalog(router));

const headers = computed(() => [
  { title: "Nombre", key: "nombre" },
  { title: "Descripcion", key: "descripcion" },
  { title: "Icono", key: "icon" },
  { title: "Ruta", key: "urlComponent" },
  { title: "Posicion", key: "menuPosition" },
  { title: "Estado", key: "status" },
  { title: "Eliminado", key: "isDeleted" },
  ...(canCreate.value || canEdit.value || canDelete.value
    ? [{ title: "Acciones", key: "actions", sortable: false }]
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

const rows = computed(() => flattenNodes(menus.filteredTree));
const allRows = computed(() => flattenNodes(menus.tree));

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
  await menus.fetchAll();
});

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

function currentUserName() {
  return auth.user?.nameUser || "admin";
}

async function logAndShowTechnicalError(typeLog: string, description: string) {
  const ticket = await createLogTransact({
    moduleMicroservice: "kpi_security",
    status: "ACTIVE",
    typeLog,
    description,
    createdBy: currentUserName(),
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
      details
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

    await logAndShowTechnicalError("MENU_DELETE", details);
  } finally {
    busy.value = false;
  }
}
</script>

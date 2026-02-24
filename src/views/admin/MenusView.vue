<template>
  <v-alert v-if="!canRead" type="warning" variant="tonal">
    No tienes permisos para visualizar el módulo de Menú.
  </v-alert>

  <v-card v-else rounded="xl" class="pa-4">
    <div class="d-flex align-center justify-space-between mb-3">
      <div>
        <div class="text-h6 font-weight-bold">Menú</div>
        <div class="text-body-2 text-medium-emphasis">
          Administración de menús padres e hijos.
        </div>
      </div>

      <v-btn
        v-if="canCreate"
        color="primary"
        prepend-icon="mdi-plus"
        @click="openCreateParent"
      >
        Crear menú padre
      </v-btn>
    </div>

    <v-row dense class="mb-2">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="menus.search"
          label="Buscar (nombre, descripción, url, icono)"
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
      class="elevation-0"
    >
      <template #item.nombre="{ item }">
        <div :style="`padding-left: ${item.depth * 18}px`" class="d-flex align-center" style="gap:8px;">
          <v-icon v-if="item.depth > 0" size="16" icon="mdi-subdirectory-arrow-right" />
          <span>{{ item.nombre }}</span>
        </div>
      </template>

      <template #item.status="{ item }">
        <v-chip size="small" :color="item.status === 'ACTIVE' ? 'green' : 'grey'" variant="tonal">
          {{ item.status }}
        </v-chip>
      </template>

      <template #item.isDeleted="{ item }">
        <v-chip size="small" :color="item.isDeleted ? 'red' : 'green'" variant="tonal">
          {{ item.isDeleted ? "Sí" : "No" }}
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

  <v-dialog v-model="formDialog" max-width="720">
    <v-card rounded="xl">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        {{ isEditing ? "Editar menú" : (isCreatingChild ? "Crear menú hijo" : "Crear menú padre") }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.nombre" label="Nombre" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.menuPosition" label="Posición" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.status"
              :items="['ACTIVE','INACTIVE']"
              label="Estado"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.icon" label="Icon" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.urlComponent" label="Url Component" variant="outlined" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              :model-value="parentName"
              label="Menú padre"
              variant="outlined"
              readonly
              hint="Vacío = menú padre"
              persistent-hint
            />
          </v-col>
          <v-col cols="12">
            <v-textarea v-model="form.descripcion" label="Descripción" variant="outlined" rows="2" />
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
      <v-card-title class="text-subtitle-1 font-weight-bold">Eliminar menú</v-card-title>
      <v-card-text>
        ¿Seguro que deseas eliminar <strong>{{ selected?.nombre }}</strong>?
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
import { useMenusStore } from "@/app/stores/menus.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { createLogTransact } from "@/app/services/log-transacts.service";
import type { MenuNodeFull } from "@/app/types/menus-full.types";

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

const headers = computed(() => [
  { title: "Nombre", key: "nombre" },
  { title: "Descripción", key: "descripcion" },
  { title: "Url Component", key: "urlComponent" },
  { title: "Posición", key: "menuPosition" },
  { title: "Estado", key: "status" },
  { title: "Eliminado", key: "isDeleted" },
  ...(canCreate.value || canEdit.value || canDelete.value
    ? [{ title: "Acciones", key: "actions", sortable: false }]
    : []),
]);

const rows = computed(() => {
  const out: Array<MenuNodeFull & { depth: number }> = [];
  const walk = (nodes: MenuNodeFull[], depth: number) => {
    const sorted = [...(nodes ?? [])].sort(
      (a, b) => Number(a.menuPosition) - Number(b.menuPosition)
    );
    for (const node of sorted) {
      out.push({ ...node, depth });
      if (node.children?.length) walk(node.children, depth + 1);
    }
  };
  walk(menus.filteredTree, 0);
  return out;
});

const formDialog = ref(false);
const deleteDialog = ref(false);
const busy = ref(false);
const selected = ref<(MenuNodeFull & { depth: number }) | null>(null);
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

const isEditing = computed(() => !!selected.value && !isCreatingChild.value);
const parentName = computed(() => {
  if (!form.menuId) return "";
  const parent = rows.value.find((x) => x.id === form.menuId);
  return parent?.nombre ?? form.menuId;
});

onMounted(async () => {
  if (!canRead.value) return;
  await menus.fetchAll();
});

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
  formDialog.value = true;
}

function openCreateChild(item: MenuNodeFull & { depth: number }) {
  selected.value = item;
  isCreatingChild.value = true;
  resetForm();
  form.menuId = item.id;
  form.menuPosition = String((Number(item.menuPosition) || 0) + 1);
  formDialog.value = true;
}

function openEdit(item: MenuNodeFull & { depth: number }) {
  selected.value = item;
  isCreatingChild.value = false;
  form.nombre = item.nombre;
  form.descripcion = item.descripcion ?? "";
  form.menuId = item.parentId;
  form.urlComponent = item.urlComponent;
  form.menuPosition = String(item.menuPosition ?? "0");
  form.status = item.status;
  form.icon = item.icon ?? "";
  formDialog.value = true;
}

function openDelete(item: MenuNodeFull & { depth: number }) {
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
      ? `Error técnico, información enviada al equipo de soporte TICKET: ${ticket}`
      : "Error técnico, enviar detalles al equipo de soporte"
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

    ui.success("Guardado con éxito");
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
    ui.success("Eliminado con éxito");
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

<template>
  <div class="mb-2">
    <div class="d-flex align-center justify-space-between" :style="padStyle">
      <div class="d-flex align-center" style="gap:10px;">
        <v-btn
          v-if="node.children && node.children.length"
          :icon="open ? 'mdi-chevron-down' : 'mdi-chevron-right'"
          variant="text"
          size="small"
          @click="open = !open"
        />
        <div v-else style="width:36px;"></div>

        <v-checkbox
          density="compact"
          hide-details
          :model-value="draft.enabled"
          @update:model-value="toggleEnabled"
          :label="node.nombre"
        />
      </div>

      <div
        class="d-flex align-center flex-wrap"
        style="gap:10px;"
        v-if="draft.enabled"
      >
        <v-checkbox density="compact" hide-details v-model="draft.isReaded" label="Leer" />
        <v-checkbox density="compact" hide-details v-model="draft.isCreated" label="Crear" />
        <v-checkbox density="compact" hide-details v-model="draft.isEdited" label="Editar" />
        <v-checkbox density="compact" hide-details v-model="draft.permitDeleted" label="Eliminar" />
        <v-checkbox density="compact" hide-details v-model="draft.isReports" label="Reportes" />
      </div>
    </div>

    <div v-if="open && node.children?.length" class="mt-1">
      <MenuNodeRow
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :get-draft="getDraft"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { MenuNodeFull } from "@/app/types/menus-full.types";
import type { PermissionDraft } from "@/app/stores/menu-roles.store";

defineOptions({
  name: "MenuNodeRow",
});

const props = defineProps<{
  node: MenuNodeFull;
  depth: number;
  getDraft: (menuId: string) => PermissionDraft;
}>();

const open = ref(true);

const draft = computed(() => props.getDraft(props.node.id));
const padStyle = computed(() => `padding-left:${props.depth * 16}px;`);

function toggleEnabled(value: boolean | null) {
  const v = value === true; // null -> false
  draft.value.enabled = v;

  if (v) {
    const none =
      !draft.value.isReaded &&
      !draft.value.isCreated &&
      !draft.value.isEdited &&
      !draft.value.permitDeleted &&
      !draft.value.isReports;

    if (none) draft.value.isReaded = true;
  } else {
    draft.value.isReaded = false;
    draft.value.isCreated = false;
    draft.value.isEdited = false;
    draft.value.permitDeleted = false;
    draft.value.isReports = false;
    draft.value.reportsPermit = "{}";
  }
}
</script>
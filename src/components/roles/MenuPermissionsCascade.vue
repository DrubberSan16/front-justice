<template>
  <div class="menu-tree">
    <div class="text-subtitle-2 font-weight-bold mb-2">
      Permisos por menú
    </div>

    <v-alert v-if="menusError" type="error" variant="tonal" class="mb-3">
      {{ menusError }}
    </v-alert>

    <div v-if="menusLoading" class="py-3">
      <v-progress-linear indeterminate />
    </div>

    <div v-else>
      <MenuNodeRow
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :depth="0"
        :get-draft="getDraft"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import MenuNodeRow from "./MenuNodeRow.vue";
import type { MenuNodeFull } from "@/app/types/menus-full.types";
import type { PermissionDraft } from "@/app/stores/menu-roles.store";

const props = defineProps<{
  tree: MenuNodeFull[];
  menusLoading?: boolean;
  menusError?: string | null;
  getDraft: (menuId: string) => PermissionDraft;
}>();

const tree = computed(() => props.tree ?? []);
const menusLoading = computed(() => props.menusLoading ?? false);
const menusError = computed(() => props.menusError ?? null);
const getDraft = props.getDraft;
</script>

<style scoped>
.menu-tree {
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  padding: 14px;
}
</style>
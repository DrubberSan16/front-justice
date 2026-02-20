<template>
  <div class="px-2">
    <v-progress-linear
      v-if="menu.loading"
      indeterminate
      rounded
      class="mb-2"
    />

    <v-list density="comfortable" nav>
      <SidebarMenuItem
        v-for="node in menu.tree"
        :key="node.id"
        :node="node"
      />
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { useMenuStore } from "@/app/stores/menu.store";
import SidebarMenuItem from "@/components/menu/SidebarMenuItem.vue";

const menu = useMenuStore();
</script>

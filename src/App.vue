<template>
  <v-app>
    <AppSnackbar />
    <div v-show="ui.globalLoading" class="app-global-loader">
      <v-progress-linear indeterminate color="primary" height="4" />
    </div>
    <AppBootLoader v-if="booting" />
    <component v-else :is="layout">
      <router-view />
    </component>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useTheme } from "vuetify";
import { useAuthStore } from "@/app/stores/auth.store";
import { useBranchScopeStore } from "@/app/stores/branch-scope.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";

import AppSnackbar from "@/components/ui/AppSnackbar.vue";
import AppBootLoader from "@/components/loading/AppBootLoader.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
import AppLayout from "@/layouts/AppLayout.vue";

const route = useRoute();
const auth = useAuthStore();
const branchScope = useBranchScopeStore();
const menu = useMenuStore();
const ui = useUiStore();
const theme = useTheme();
const booting = ref(true);

const layout = computed(() => (route.meta.layout === "app" ? AppLayout : AuthLayout));

watch(
  () => ui.currentTheme,
  (value) => {
    theme.global.name.value = value;
    ui.syncThemeWithDocument();
  },
  { immediate: true },
);

watch(
  () => auth.user?.id,
  (userId) => {
    if (userId && auth.user && auth.isAuthenticated) {
      branchScope.syncFromUser(auth.user);
      return;
    }
    branchScope.clear();
    menu.clear();
  },
  { immediate: true },
);

onMounted(async () => {
  auth.bootstrapFromStorage();
  booting.value = false;
});
</script>

<style scoped>
.app-global-loader {
  position: fixed;
  inset: 0 0 auto;
  z-index: 2500;
  pointer-events: none;
}
</style>

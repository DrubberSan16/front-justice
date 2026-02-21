<template>
  <v-app>
    <AppSnackbar />
    <AppBootLoader v-if="booting" />
    <component v-else :is="layout">
      <router-view />
    </component>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";

import AppSnackbar from "@/components/ui/AppSnackbar.vue";
import AppBootLoader from "@/components/loading/AppBootLoader.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
import AppLayout from "@/layouts/AppLayout.vue";

const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();
const booting = ref(true);

const layout = computed(() => (route.meta.layout === "app" ? AppLayout : AuthLayout));

onMounted(async () => {
  auth.bootstrapFromStorage();

  if (auth.isAuthenticated && auth.userId) {
    await menu.loadMenuTree(auth.userId);
  }

  setTimeout(() => (booting.value = false), 250);
});
</script>

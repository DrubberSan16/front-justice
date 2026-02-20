<template>
  <!-- Loading inicial ANTES del login -->
  <AppBootLoader v-if="booting" />

  <component v-else :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";

import AppBootLoader from "@/components/loading/AppBootLoader.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
import AppLayout from "@/layouts/AppLayout.vue";

const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();

const booting = ref(true);

const layout = computed(() => {
  const l = route.meta.layout;
  return l === "app" ? AppLayout : AuthLayout;
});

onMounted(async () => {
  auth.bootstrapFromStorage();

  // Simula carga de componentes/estado inicial (lo que pediste como loading antes del login)
  // + si hay sesión válida, carga menú.
  if (auth.isAuthenticated && auth.userId) {
    await menu.loadMenuTree(auth.userId);
  }

  // Pequeño delay opcional para que el loading se “note” y no parpadee
  setTimeout(() => (booting.value = false), 400);
});
</script>

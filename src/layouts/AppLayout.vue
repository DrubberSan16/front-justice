<template>
  <v-layout class="app-layout">
    <!-- SIDEBAR -->
    <v-navigation-drawer
      v-model="drawer"
      :temporary="isMobile"
      :width="300"
      elevation="1"
    >
      <div class="px-4 pt-4 pb-2">
        <div class="text-subtitle-1 font-weight-bold">KPI Security</div>
        <div class="text-caption text-medium-emphasis">
          {{ auth.user?.nameSurname }}
        </div>
      </div>

      <v-divider class="mb-2" />

      <SidebarMenu />

      <template #append>
        <v-divider />
        <div class="pa-3">
          <v-btn block variant="tonal" @click="onLogout">Salir</v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- TOP BAR -->
    <v-app-bar elevation="0" border>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>Dashboard</v-app-bar-title>
      <v-spacer />
      <div class="text-caption text-medium-emphasis pr-4">
        {{ auth.user?.email }}
      </div>
    </v-app-bar>

    <!-- MAIN CONTENT -->
    <v-main class="bg-grey-lighten-5">
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import SidebarMenu from "@/components/menu/SidebarMenu.vue";

const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

const { mdAndDown } = useDisplay();
const isMobile = computed(() => mdAndDown.value);

// en desktop abierto por defecto; en mobile cerrado por defecto
const drawer = ref(!isMobile.value);

function onLogout() {
  auth.logout();
  menu.clear();
  router.push({ name: "login" });
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}
</style>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" width="300">
      <div class="px-4 pt-4 pb-2">
        <div class="text-subtitle-1 font-weight-bold">KPI Security</div>
        <div class="text-caption text-medium-emphasis">{{ auth.user?.nameSurname }}</div>
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

    <v-app-bar flat>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>Dashboard</v-app-bar-title>
      <v-spacer />
      <div class="text-caption text-medium-emphasis pr-4">
        {{ auth.user?.email }}
      </div>
    </v-app-bar>

    <v-main class="pa-4">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import SidebarMenu from "@/components/menu/SidebarMenu.vue";

const drawer = ref(true);
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

function onLogout() {
  auth.logout();
  menu.clear();
  router.push({ name: "login" });
}
</script>

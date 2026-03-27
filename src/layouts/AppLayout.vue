<template>
  <v-layout class="app-layout">
    <v-navigation-drawer
      v-model="drawer"
      :temporary="isMobile"
      :width="304"
      elevation="0"
      class="app-drawer"
    >
      <div class="app-drawer__header">
        <div class="app-drawer__brand">
          <v-avatar size="48" rounded="xl" class="app-drawer__brand-mark">
            <v-img :src="logo" alt="KPI Justice" cover />
          </v-avatar>
          <div>
            <div class="app-drawer__title">KPI Justice</div>
            <div class="app-drawer__subtitle">{{ userDisplay }}</div>
          </div>
        </div>

        <v-sheet class="app-drawer__status" rounded="xl">
          <div class="app-drawer__status-label">Cuenta activa</div>
          <div class="app-drawer__status-value">{{ userEmail }}</div>
        </v-sheet>
      </div>

      <v-divider class="mb-2" />

      <SidebarMenu />

      <template #append>
        <v-divider />
        <div class="app-drawer__footer">
          <v-btn block variant="tonal" color="error" rounded="xl" @click="onLogout">
            Salir
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar elevation="0" border class="app-topbar">
      <v-app-bar-nav-icon @click="drawer = !drawer" />

      <div class="app-topbar__heading">
        <div class="app-topbar__eyebrow">Panel operativo</div>
        <v-app-bar-title>{{ pageTitle }}</v-app-bar-title>
      </div>

      <v-spacer />

      <div class="app-topbar__actions">
        <ThemeToggle :compact="isMobile" />
        <NotificationBell />
        <v-chip
          v-if="!isMobile"
          class="app-topbar__chip"
          color="primary"
          variant="tonal"
          rounded="xl"
          prepend-icon="mdi-account-circle-outline"
        >
          {{ userDisplay }}
        </v-chip>
      </div>
    </v-app-bar>

    <v-main class="app-main">
      <v-container fluid class="app-container">
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import logo from "@/assets/logo-justice.png";
import SidebarMenu from "@/components/menu/SidebarMenu.vue";
import NotificationBell from "@/components/ui/NotificationBell.vue";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import { useNotificationsStore } from "@/app/stores/notifications.store";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const notifications = useNotificationsStore();

const { mdAndDown } = useDisplay();
const isMobile = computed(() => mdAndDown.value);
const pageTitle = computed(() => String(route.meta.title ?? "Dashboard"));
const userDisplay = computed(() => auth.user?.nameSurname || auth.user?.email || "Sesion activa");
const userEmail = computed(() => auth.user?.email || "Sin correo registrado");

const drawer = ref(!isMobile.value);

watch(
  isMobile,
  (value) => {
    drawer.value = !value;
  },
  { immediate: true },
);

watch(
  () => auth.userId,
  (userId) => {
    if (userId) {
      void notifications.start(userId);
    } else {
      notifications.stop();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  notifications.stop();
});

function onLogout() {
  notifications.stop();
  auth.logout();
  menu.clear();
  router.push({ name: "login" });
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-drawer {
  border-right: 1px solid var(--surface-border);
  background: var(--surface-base);
  backdrop-filter: blur(18px);
}

.app-drawer__header {
  display: grid;
  gap: 18px;
  padding: 20px 18px 16px;
}

.app-drawer__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.app-drawer__brand-mark {
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
}

.app-drawer__title {
  font-size: 1rem;
  font-weight: 700;
}

.app-drawer__subtitle {
  color: var(--app-muted-text);
  line-height: 1.5;
}

.app-drawer__status {
  padding: 14px 16px;
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
}

.app-drawer__status-label {
  margin-bottom: 4px;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--app-muted-text);
}

.app-drawer__status-value {
  font-weight: 600;
  line-height: 1.5;
}

.app-drawer__footer {
  padding: 16px;
}

.app-topbar {
  background: var(--surface-base);
  backdrop-filter: blur(18px);
}

.app-topbar__heading {
  display: grid;
}

.app-topbar__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-muted-text);
}

.app-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 16px;
}

.app-topbar__chip {
  max-width: 280px;
}

.app-main {
  background: var(--app-main-background);
}

.app-container {
  padding: 24px;
}

@media (max-width: 960px) {
  .app-topbar__actions {
    gap: 6px;
    padding-right: 8px;
  }

  .app-container {
    padding: 16px;
  }
}
</style>

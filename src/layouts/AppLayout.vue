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

      <div v-if="branchScope.visible" class="app-topbar__branch">
        <v-select
          :model-value="branchScope.selectedSucursalId"
          :items="branchScope.selectItems"
          label="Sucursal activa"
          variant="outlined"
          density="compact"
          hide-details
          class="app-topbar__branch-select"
          @update:model-value="handleSucursalChange"
        />
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
import { useBranchScopeStore } from "@/app/stores/branch-scope.store";
import { useMenuStore } from "@/app/stores/menu.store";
import logo from "@/assets/logo-justice.png";
import SidebarMenu from "@/components/menu/SidebarMenu.vue";
import NotificationBell from "@/components/ui/NotificationBell.vue";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import { useNotificationsStore } from "@/app/stores/notifications.store";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const branchScope = useBranchScopeStore();
const menu = useMenuStore();
const notifications = useNotificationsStore();

const { mdAndDown } = useDisplay();
const isMobile = computed(() => mdAndDown.value);
const pageTitle = computed(() => String(route.meta.title ?? "Dashboard"));
const userDisplay = computed(() => auth.user?.nameSurname || auth.user?.email || "Sesion activa");
const userEmail = computed(() => auth.user?.email || "Sin correo registrado");
const notificationRecipients = computed(() =>
  [auth.user?.id, auth.user?.nameUser, auth.user?.email]
    .map((item) => String(item || "").trim())
    .filter(Boolean),
);

const drawer = ref(!isMobile.value);

watch(
  isMobile,
  (value) => {
    drawer.value = !value;
  },
  { immediate: true },
);

watch(
  notificationRecipients,
  (recipients) => {
    if (recipients.length) {
      void notifications.start(recipients);
    } else {
      notifications.stop();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  notifications.stop();
});

function handleSucursalChange(value: string | null) {
  branchScope.setSelectedSucursal(value);
  window.location.reload();
}

function onLogout() {
  notifications.stop();
  auth.logout();
  branchScope.clear();
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
  min-width: 0;
}

.app-topbar__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-muted-text);
}

.app-topbar__branch {
  width: min(340px, 32vw);
  min-width: 220px;
  padding-inline: 16px 8px;
}

.app-topbar__branch-select :deep(.v-field) {
  border-radius: 16px;
  background: var(--surface-soft);
}

.app-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
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

@media (max-width: 1280px) {
  .app-container {
    padding: 20px;
  }
}

@media (max-width: 960px) {
  .app-drawer {
    max-width: min(304px, 88vw);
  }

  .app-topbar {
    padding-inline-end: 6px;
  }

  .app-topbar__branch {
    min-width: 0;
    width: min(220px, 34vw);
    padding-inline: 8px 4px;
  }

  .app-topbar__heading :deep(.v-toolbar-title__placeholder) {
    white-space: normal;
    line-height: 1.2;
  }
}
</style>

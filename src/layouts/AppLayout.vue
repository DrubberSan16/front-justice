<template>
  <v-layout class="app-layout">
    <v-navigation-drawer
      v-model="drawer"
      :temporary="isMobile"
      :rail="!isMobile && rail"
      :width="320"
      :rail-width="84"
      elevation="0"
      class="app-drawer"
    >
      <header class="app-drawer__header">
        <div class="app-brand">
          <div :class="['app-brand__mark', { 'app-brand__mark--wide': !rail || isMobile }]">
            <v-img
              :src="rail && !isMobile ? compactLogo : companyLogo"
              alt="Justice Técnica Industrial S.A."
              contain
            />
          </div>
          <div v-if="!rail || isMobile" class="app-brand__copy">
            <strong>KPI Justice</strong>
            <span>Centro de operaciones</span>
          </div>
        </div>
        <v-btn
          v-if="!isMobile"
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          size="small"
          variant="text"
          class="app-drawer__collapse"
          :aria-label="rail ? 'Expandir menú' : 'Contraer menú'"
          @click="rail = !rail"
        />
      </header>

      <div v-if="!rail || isMobile" class="app-drawer__context">
        <v-icon icon="mdi-office-building-cog-outline" size="18" />
        <div><span>Panel empresarial</span><strong>{{ pageTitle }}</strong></div>
      </div>

      <SidebarMenu :collapsed="rail && !isMobile" />

      <template #append>
        <div class="app-account" :class="{ 'app-account--compact': rail && !isMobile }">
          <v-avatar color="primary" variant="tonal" size="42">{{ userInitials }}</v-avatar>
          <div v-if="!rail || isMobile" class="app-account__copy">
            <strong>{{ userDisplay }}</strong>
            <span>{{ userEmail }}</span>
          </div>
          <v-btn icon="mdi-logout" variant="text" size="small" color="error" aria-label="Cerrar sesión" @click="onLogout" />
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar elevation="0" class="app-topbar">
      <v-btn
        :icon="isMobile ? 'mdi-menu' : rail ? 'mdi-menu-open' : 'mdi-menu'"
        variant="text"
        class="app-topbar__menu"
        aria-label="Abrir o cerrar navegación"
        @click="toggleNavigation"
      />

      <div class="app-topbar__heading">
        <div class="app-topbar__eyebrow">KPI Justice</div>
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
      </div>
    </v-app-bar>

    <v-main class="app-main">
      <v-container fluid class="app-container">
        <router-view :key="viewRefreshKey" />
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
import compactLogo from "@/assets/logo-justice.png";
import companyLogo from "@/assets/logo-emp.png";
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
const pageTitle = computed(() => String(route.meta.title ?? "Panel principal"));
const userDisplay = computed(() => auth.user?.nameSurname || auth.user?.email || "Sesión activa");
const userEmail = computed(() => auth.user?.email || "Sin correo registrado");
const userInitials = computed(() =>
  userDisplay.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "KJ",
);
const viewRefreshKey = computed(() => `${route.fullPath}:${branchScope.selectedSucursalId ?? "ALL"}`);
const notificationRecipients = computed(() =>
  [auth.user?.id, auth.user?.nameUser, auth.user?.email]
    .map((item) => String(item || "").trim())
    .filter(Boolean),
);

const drawer = ref(!isMobile.value);
const rail = ref(localStorage.getItem("kpi-navigation-compact") === "true");

watch(isMobile, (value) => { drawer.value = !value; }, { immediate: true });
watch(rail, (value) => localStorage.setItem("kpi-navigation-compact", String(value)));
watch(notificationRecipients, (recipients) => {
  if (recipients.length) void notifications.start(recipients);
  else notifications.stop();
}, { immediate: true });

onBeforeUnmount(() => notifications.stop());

function toggleNavigation() {
  if (isMobile.value) drawer.value = !drawer.value;
  else rail.value = !rail.value;
}

function handleSucursalChange(value: string | null) {
  branchScope.setSelectedSucursal(value);
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
/* El armazon ocupa exactamente la ventana y no crece con el contenido: asi el
   menu y la barra superior quedan siempre a la vista y solo se desplaza el
   area central. Antes la pagina entera crecia y habia que volver arriba para
   cambiar de pantalla. */
.app-layout { height: 100vh; min-height: 100vh; overflow: hidden; }
.app-drawer { --nav-text: #153246; --nav-muted: #526b7b; --nav-border: rgba(16, 68, 97, 0.15); --nav-surface: rgba(255, 255, 255, 0.7); --nav-hover: rgba(19, 93, 134, 0.1); --nav-active: rgba(35, 113, 158, 0.16); --nav-accent: #966016; border-right: 0 !important; color: var(--nav-text); background: radial-gradient(circle at 0 0, rgba(45, 128, 176, 0.16), transparent 32%), linear-gradient(180deg, #f6fbfd 0%, #edf5f8 58%, #e5f0f4 100%); box-shadow: 12px 0 38px rgba(4, 18, 31, 0.1); }
:global(:root[data-theme="dark"] .app-drawer) { --nav-text: #eef6fb; --nav-muted: #b7cbd8; --nav-border: rgba(255, 255, 255, 0.1); --nav-surface: rgba(255, 255, 255, 0.055); --nav-hover: rgba(255, 255, 255, 0.075); --nav-active: rgba(45, 128, 176, 0.27); --nav-accent: #e0b46f; background: radial-gradient(circle at 0 0, rgba(45, 128, 176, 0.2), transparent 32%), linear-gradient(180deg, #071a2c 0%, #0a263d 58%, #0d3048 100%); }
.app-drawer :deep(.v-navigation-drawer__content) { overflow-y: auto; scrollbar-color: var(--nav-border) transparent; }
.app-drawer__header { position: relative; display: flex; min-height: 84px; align-items: center; justify-content: space-between; gap: 12px; padding: 18px; }
.app-brand { display: flex; min-width: 0; align-items: center; gap: 13px; }
.app-brand__mark { flex: 0 0 auto; width: 48px; height: 48px; padding: 5px; overflow: hidden; border: 1px solid rgba(20, 75, 104, 0.15); border-radius: 13px; background: #fff; box-shadow: 0 8px 22px rgba(7, 32, 50, 0.1); }
.app-brand__mark--wide { width: 118px; padding: 6px 8px; }
.app-brand__copy { display: grid; min-width: 0; gap: 2px; }
.app-brand__copy strong { font-size: 1.05rem; }
.app-brand__copy span { overflow: hidden; color: var(--nav-muted); font-size: 0.8rem; text-overflow: ellipsis; white-space: nowrap; }
.app-drawer__collapse { flex: 0 0 auto; color: var(--nav-muted); }
.app-drawer__context { display: flex; align-items: center; gap: 11px; margin: 0 14px 10px; padding: 13px 14px; border: 1px solid var(--nav-border); border-radius: 15px; background: var(--nav-surface); }
.app-drawer__context .v-icon { color: var(--nav-accent); }
.app-drawer__context div { display: grid; min-width: 0; gap: 2px; }
.app-drawer__context span { color: var(--nav-muted); font-size: 0.7rem; letter-spacing: 0.07em; text-transform: uppercase; }
.app-drawer__context strong { overflow: hidden; font-size: 0.85rem; text-overflow: ellipsis; white-space: nowrap; }
.app-account { display: flex; align-items: center; gap: 11px; margin: 12px; padding: 12px; border: 1px solid var(--nav-border); border-radius: 17px; background: var(--nav-surface); }
.app-account--compact { justify-content: center; padding: 9px 4px; }
.app-account--compact .v-btn { display: none; }
.app-account__copy { display: grid; min-width: 0; flex: 1; gap: 2px; }
.app-account__copy strong,
.app-account__copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-account__copy strong { font-size: 0.82rem; }
.app-account__copy span { color: var(--nav-muted); font-size: 0.7rem; }
.app-topbar { border-bottom: 1px solid var(--surface-border); background: color-mix(in srgb, var(--surface-base) 92%, transparent); backdrop-filter: blur(18px); }
.app-topbar__menu { margin-left: 8px; }
.app-topbar__heading { display: grid; gap: 1px; margin-left: 6px; }
.app-topbar__eyebrow { color: rgb(var(--v-theme-primary)); font-size: 0.67rem; font-weight: 850; letter-spacing: 0.09em; text-transform: uppercase; }
.app-topbar :deep(.v-toolbar-title) { font-size: 1rem; font-weight: 760; }
.app-topbar__branch { width: min(310px, 30vw); margin-left: 24px; }
.app-topbar__branch-select :deep(.v-field) { border-radius: 13px; background: var(--field-background); }
.app-topbar__actions { display: flex; align-items: center; gap: 6px; padding-right: 14px; }
/* El desplazamiento vive aqui. `overscroll-behavior` evita que al llegar al
   final el gesto arrastre la pagina de fondo. */
.app-main { min-width: 0; background: var(--app-page-background); overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; }
.app-container { width: 100%; max-width: none; margin: 0; padding: clamp(16px, 2.2vw, 32px); }
@media (max-width: 959px) { .app-topbar__branch { width: min(260px, 38vw); margin-left: 12px; } }
@media (max-width: 700px) { .app-topbar__eyebrow { display: none; } .app-topbar__branch { display: none; } .app-container { padding: 14px 12px 24px; } }
</style>

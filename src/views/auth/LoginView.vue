<template>
  <v-card class="login-card" rounded="xl" elevation="0">
    <div class="login-card__icon" aria-hidden="true"><v-icon icon="mdi-shield-account-outline" size="28" /></div>
    <header class="login-card__header">
      <span>Bienvenido</span>
      <h1>Acceso seguro</h1>
      <p>Ingrese sus credenciales para continuar.</p>
    </header>

    <v-form class="login-form" @submit.prevent="onSubmit">
      <v-text-field v-model="nameUser" class="login-field" label="Usuario" prepend-inner-icon="mdi-account-outline" variant="outlined" density="comfortable" autocomplete="username" :disabled="loading" autofocus clearable required />
      <v-text-field v-model="passUser" class="login-field" label="Contraseña" :type="showPassword ? 'text' : 'password'" prepend-inner-icon="mdi-lock-outline" :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" variant="outlined" density="comfortable" autocomplete="current-password" :disabled="loading" @click:append-inner="showPassword = !showPassword" required />
      <v-alert v-if="error" type="error" variant="tonal" rounded="lg" class="mb-1">{{ error }}</v-alert>
      <v-btn :loading="loading" type="submit" block size="large" class="login-submit" color="primary" append-icon="mdi-arrow-right">Ingresar</v-btn>
    </v-form>

    <footer class="login-card__footer">
      <v-icon icon="mdi-information-outline" size="16" />
      Use el usuario asignado por el administrador del sistema.
    </footer>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import type { LoginRequest, LoginResponse } from "@/app/types/auth.types";
import { resolveAuthenticatedHomeRoute } from "@/app/utils/menu-permissions";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();
const nameUser = ref("");
const passUser = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  error.value = null;
  loading.value = true;
  try {
    const payload: LoginRequest = { nameUser: nameUser.value.trim(), passUser: passUser.value };
    const { data } = await api.post<LoginResponse>("/kpi_security/users/login", payload);
    auth.setSession(data);
    if (auth.userId) await menu.loadMenuTree(auth.userId);
    // La pantalla de inicio depende del tablero asignado al usuario. Se resuelve
    // por nombre de ruta, que coincide con el `url_component` del menu.
    const homeRoute = resolveAuthenticatedHomeRoute(menu.tree);
    const fallbackRedirect = `/app/${homeRoute}`;
    const requestedRedirect = String(route.query.redirect || "").trim();
    // Solo se respeta el destino pedido si no es un tablero al que este usuario
    // no aterriza: asi un enlace guardado a otro dashboard no lo saca de su sitio.
    const requestedEsOtroTablero =
      requestedRedirect.startsWith("/app/dashboard") &&
      requestedRedirect !== fallbackRedirect;
    const redirect =
      requestedRedirect && !requestedEsOtroTablero ? requestedRedirect : fallbackRedirect;
    router.replace(redirect);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Credenciales inválidas o error de conexión.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-card { position: relative; display: grid; gap: 22px; padding: clamp(26px, 4vw, 40px); border: 1px solid rgba(var(--v-theme-on-surface), 0.1); background: color-mix(in srgb, rgb(var(--v-theme-surface)) 96%, transparent); box-shadow: 0 26px 72px rgba(0, 0, 0, 0.2); backdrop-filter: blur(22px); }
.login-card__icon { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 17px; color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), 0.1); }
.login-card__header span { color: rgb(var(--v-theme-primary)); font-size: 0.78rem; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; }
.login-card__header h1 { margin: 7px 0 5px; font-size: clamp(2rem, 4vw, 2.7rem); letter-spacing: -0.045em; line-height: 1.05; }
.login-card__header p { margin: 0; color: var(--app-muted-text); font-size: 1rem; }
.login-form { display: grid; gap: 15px; }
.login-field :deep(.v-field) { min-height: 58px; border-radius: 16px; background: var(--field-background); }
.login-field :deep(.v-label) { font-size: 0.98rem; }
.login-submit { min-height: 56px; border-radius: 15px; font-size: 1rem; font-weight: 800; letter-spacing: 0.01em; box-shadow: 0 12px 26px rgba(var(--v-theme-primary), 0.22); }
.login-card__footer { display: flex; align-items: center; gap: 7px; padding-top: 2px; color: var(--app-muted-text); font-size: 0.8rem; line-height: 1.45; }
</style>

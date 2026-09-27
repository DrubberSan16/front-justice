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
import { isAxiosError } from "axios";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import type { LoginRequest, LoginResponse } from "@/app/types/auth.types";
import { resolveAuthenticatedHomeRoute } from "@/app/utils/menu-permissions";

// Cada fallo dice lo que paso de verdad. El 2026-09-25 un TypeError posterior a
// un login correcto se mostro como "Credenciales invalidas", y con los servidores
// sanos se busco el problema en la contrasena.
const MSG_SIN_CONEXION = "No hubo respuesta del servidor. Revise su conexión e intente de nuevo.";
const MSG_SISTEMA_NO_ABRE =
  "Se inició sesión, pero no se pudo abrir el sistema. Recargue la página e ingrese de nuevo; si vuelve a ocurrir, avise a soporte.";
const MSG_SESION_CERRADA =
  "Su sesión se cerró porque no se pudo abrir el sistema. Ingrese de nuevo; si vuelve a ocurrir, avise a soporte.";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();
// El boton de limpiar del campo deja el modelo en null, no en "".
const nameUser = ref<string | null>("");
const passUser = ref("");
const showPassword = ref(false);
const loading = ref(false);
// El guard del router vuelve aqui con ?aviso=sesion cuando no pudo abrir el
// sistema con la sesion guardada y la cerro.
const error = ref<string | null>(route.query.aviso === "sesion" ? MSG_SESION_CERRADA : null);

function mensajeDeFallo(e: any, loginAceptado: boolean): string {
  // Sin respuesta HTTP: red caida, servidor inalcanzable o tiempo de espera agotado.
  if (isAxiosError(e) && !e.response) return MSG_SIN_CONEXION;
  // Con las credenciales ya aceptadas, lo que fallo fue cargar el menu o abrir la
  // pantalla de inicio: no es un problema de usuario ni de contrasena.
  if (loginAceptado) return MSG_SISTEMA_NO_ABRE;
  const status = e?.response?.status;
  if (status) {
    // Un 401 trae "Credenciales inválidas" o "Usuario inactivo"; un 5xx, el
    // ticket de soporte que arma el interceptor de api.ts.
    const mensaje = e.response.data?.message;
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
    return `No se pudo iniciar sesión: el servidor respondió con el error ${status}. Intente de nuevo; si vuelve a ocurrir, avise a soporte.`;
  }
  return "No se pudo iniciar sesión por un error inesperado. Recargue la página e intente de nuevo; si vuelve a ocurrir, avise a soporte.";
}

async function onSubmit() {
  const usuario = (nameUser.value ?? "").trim();
  if (!usuario || !passUser.value) {
    error.value = "Ingrese usuario y contraseña.";
    return;
  }
  error.value = null;
  loading.value = true;
  let loginAceptado = false;
  try {
    const payload: LoginRequest = { nameUser: usuario, passUser: passUser.value };
    const { data } = await api.post<LoginResponse>("/kpi_security/users/login", payload);
    loginAceptado = true;
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
    // Se espera la navegacion para que su fallo (el chunk de la pantalla que no
    // carga, por ejemplo) llegue a este catch en vez de perderse.
    await router.replace(redirect);
    // Si el guard no logra abrir el sistema, cierra la sesion y deja al usuario en
    // el login; sin esto el formulario volveria sin ninguna explicacion.
    if (!auth.isAuthenticated) error.value = MSG_SISTEMA_NO_ABRE;
  } catch (e: any) {
    if (loginAceptado) {
      console.error("[Login] El servidor aceptó el login, pero no se pudo abrir el sistema:", e);
      // El token ya quedo guardado: si no se cierra la sesion, al recargar el guard
      // vuelve a fallar con el mismo menu y deja la pantalla en blanco.
      auth.logout();
      menu.clear();
    } else if (!isAxiosError(e)) {
      console.error("[Login] Error inesperado al enviar el login:", e);
    }
    error.value = mensajeDeFallo(e, loginAceptado);
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

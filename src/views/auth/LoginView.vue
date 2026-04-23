<template>
  <v-card class="login-card enterprise-surface" rounded="xl" elevation="0">
    <div class="login-card__header">
      <div class="text-h4 font-weight-bold mb-2">Bienvenido de nuevo</div>
      <p class="login-card__copy">
        Inicia sesion para continuar tu operacion en el sistema.
      </p>
    </div>

    <v-form class="login-form" @submit.prevent="onSubmit">
      <v-text-field
        v-model="nameUser"
        class="login-field"
        label="Usuario"
        prepend-inner-icon="mdi-account-circle-outline"
        variant="outlined"
        density="comfortable"
        autocomplete="username"
        :disabled="loading"
        autofocus
        clearable
        required
      />

      <v-text-field
        v-model="passUser"
        class="login-field"
        label="Contrasena"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
        variant="outlined"
        density="comfortable"
        autocomplete="current-password"
        :disabled="loading"
        @click:append-inner="showPassword = !showPassword"
        required
      />

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-btn
        :loading="loading"
        type="submit"
        block
        size="large"
        class="login-submit"
        color="primary"
        prepend-icon="mdi-login"
      >
        Entrar al sistema
      </v-btn>
    </v-form>
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
    const payload: LoginRequest = {
      nameUser: nameUser.value.trim(),
      passUser: passUser.value,
    };

    const { data } = await api.post<LoginResponse>("/kpi_security/users/login", payload);

    auth.setSession(data);

    if (auth.userId) await menu.loadMenuTree(auth.userId);

    const homeRoute = resolveAuthenticatedHomeRoute(menu.tree);
    const fallbackRedirect = homeRoute === "dashboard" ? "/app/dashboard" : "/app/bienvenida";
    const requestedRedirect = String(route.query.redirect || "").trim();
    const redirect =
      requestedRedirect && !(requestedRedirect === "/app/dashboard" && homeRoute !== "dashboard")
        ? requestedRedirect
        : fallbackRedirect;

    router.replace(redirect);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Credenciales invalidas o error de conexion.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-card {
  display: grid;
  gap: 24px;
  padding: 28px;
}

.login-card__header {
  display: grid;
  gap: 10px;
}

.login-card__copy {
  margin: 0;
  color: var(--app-muted-text);
  line-height: 1.7;
}

.login-form {
  display: grid;
  gap: 16px;
}

.login-field :deep(.v-field) {
  border-radius: 18px;
  background: var(--field-background);
}

.login-submit {
  min-height: 54px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
@media (max-width: 600px) {
  .login-card {
    padding: 22px;
  }
}
</style>

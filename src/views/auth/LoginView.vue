<template>
  <v-card class="pa-8" rounded="xl" elevation="10">
    <div class="text-h6 font-weight-bold mb-1">Iniciar sesión</div>
    <div class="text-body-2 text-medium-emphasis mb-6">
      Accede para ver tu dashboard y tus módulos.
    </div>

    <v-form @submit.prevent="onSubmit">
      <v-text-field
        v-model="nameUser"
        label="Usuario"
        variant="outlined"
        density="comfortable"
        autocomplete="username"
        :disabled="loading"
        required
      />

      <v-text-field
        v-model="passUser"
        label="Contraseña"
        type="password"
        variant="outlined"
        density="comfortable"
        autocomplete="current-password"
        :disabled="loading"
        required
      />

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-btn :loading="loading" type="submit" block size="large" class="mt-2">
        Entrar
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

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();

const nameUser = ref("");
const passUser = ref("");
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

    const redirect = (route.query.redirect as string) || "/app/dashboard";
    router.replace(redirect);
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Credenciales inválidas o error de conexión.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="pa-5" rounded="xl">
          <div class="text-h6 font-weight-bold">Bienvenido</div>
          <div class="text-body-2 text-medium-emphasis">
            Aquí va tu resumen de métricas y accesos rápidos.
          </div>

          <v-divider class="my-4" />

          <v-chip class="mr-2" label>Usuario: {{ auth.user?.nameUser }}</v-chip>
          <v-chip label>Rol: {{ auth.user?.role?.nombre }}</v-chip>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="pa-5" rounded="xl" variant="tonal">
          <div class="text-subtitle-1 font-weight-bold mb-2">Menú cargado</div>
          <div class="text-body-2 text-medium-emphasis">
            Items principales: {{ menu.tree.length }}
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";

const auth = useAuthStore();
const menu = useMenuStore();
</script>

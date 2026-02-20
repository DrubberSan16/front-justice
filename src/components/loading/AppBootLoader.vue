<template>
  <div class="boot-loader">
    <v-card class="pa-6" rounded="xl" elevation="8" width="420">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-h6 font-weight-bold">Cargando componentes…</div>
        <v-progress-circular indeterminate />
      </div>
      <div class="text-body-2 text-medium-emphasis">
        Preparando la sesión y la interfaz.
      </div>
      <v-progress-linear indeterminate class="mt-5" rounded />
    </v-card>
  </div>
</template>

<style scoped>
.boot-loader{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background: radial-gradient(1200px circle at 20% 10%, rgba(99,102,241,.25), transparent 45%),
              radial-gradient(1000px circle at 90% 30%, rgba(34,197,94,.20), transparent 45%),
              linear-gradient(180deg, #0b1220, #0f172a);
}
</style>

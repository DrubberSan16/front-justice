<template>
  <div class="auth-page">
    <div class="auth-card">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-page{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  background:#ffffff;
}

.auth-card{
  width:100%;
  max-width:460px;
}
</style>

<template>
  <div class="auth-bg">
    <div class="auth-container">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-bg{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  background: radial-gradient(1200px circle at 20% 10%, rgba(99,102,241,.25), transparent 45%),
              radial-gradient(1000px circle at 90% 30%, rgba(34,197,94,.20), transparent 45%),
              linear-gradient(180deg, #0b1220, #0f172a);
}
.auth-container{
  width:100%;
  max-width:460px;
}
</style>

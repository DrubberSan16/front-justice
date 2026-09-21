<template>
  <article class="table-card" :class="{'table-card--wide':wide}">
    <header><div class="table-card__identity"><v-icon :icon="icon" color="primary" aria-hidden="true"/><div><h3>{{ title }}</h3><p>{{ subtitle }}</p></div></div><v-btn size="small" variant="tonal" prepend-icon="mdi-file-pdf-box" @click="emit('preview')">Previsualizar PDF</v-btn></header>
    <div class="table-card__viewport"><slot/></div>
  </article>
</template>
<script setup lang="ts">
withDefaults(defineProps<{title:string;subtitle:string;icon:string;wide?:boolean}>(),{wide:false});
const emit=defineEmits<{(event:"preview"):void}>();
</script>
<style scoped>
.table-card{min-width:0;border:1px solid rgba(var(--v-theme-on-surface),.12);border-radius:18px;background:rgb(var(--v-theme-surface));overflow:hidden}.table-card--wide{grid-column:1/-1}.table-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.1)}.table-card__identity{display:flex;gap:10px;align-items:flex-start}.table-card h3{margin:0;font-size:1rem}.table-card p{margin:3px 0 0;color:rgba(var(--v-theme-on-surface),.65);font-size:.8rem;line-height:1.35}.table-card__viewport{max-height:342px;overflow:auto;scrollbar-gutter:stable}@media(max-width:640px){.table-card header{align-items:stretch;flex-direction:column}.table-card header>.v-btn{align-self:flex-start}}
</style>

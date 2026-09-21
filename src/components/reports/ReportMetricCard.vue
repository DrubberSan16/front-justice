<template>
  <article class="metric-card">
    <v-icon :icon="icon" color="primary" aria-hidden="true" />
    <div><span>{{ label }}</span><strong>{{ value }}</strong><small>{{ helper }}</small></div>
    <v-btn icon="mdi-file-pdf-box" size="small" variant="text" :aria-label="`Previsualizar PDF de ${label}`" @click="emit('preview')" />
  </article>
</template>
<script setup lang="ts">
defineProps<{ label:string; value:string; helper:string; icon:string }>();
const emit=defineEmits<{(event:"preview"):void}>();
</script>
<style scoped>
.metric-card{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:12px;min-height:118px;padding:16px;border:1px solid rgba(var(--v-theme-on-surface),.12);border-radius:16px;background:rgb(var(--v-theme-surface))}.metric-card>div{display:grid;gap:3px}.metric-card span{color:rgba(var(--v-theme-on-surface),.66);font-size:.76rem;font-weight:750}.metric-card strong{font-size:1.45rem;font-variant-numeric:tabular-nums}.metric-card small{color:rgba(var(--v-theme-on-surface),.62)}
</style>

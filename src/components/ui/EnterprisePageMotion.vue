<template>
  <motion.main
    v-bind="$attrs"
    class="enterprise-page-motion"
    :initial="initialState"
    :animate="{ opacity: 1, y: 0 }"
    :transition="transitionState"
  >
    <slot />
  </motion.main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { motion, useReducedMotion } from "motion-v";
import { MOTION } from "@/app/motion";

/**
 * Envoltura de entrada a nivel de pagina.
 *
 * Los valores salen de @/app/motion/tokens.ts (dial Motion 3/10 del
 * design system), no de constantes locales: asi una sola edicion recalibra
 * el movimiento de toda la plataforma.
 */

defineOptions({ inheritAttrs: false });

const shouldReduceMotion = useReducedMotion();
const initialState = computed(() => ({
  opacity: 0,
  y: shouldReduceMotion.value ? 0 : MOTION.hero.distance,
}));
const transitionState = computed(() => ({
  duration: shouldReduceMotion.value ? 0 : MOTION.hero.duration,
  ease: "easeOut",
}));
</script>

<style scoped>
.enterprise-page-motion {
  width: 100%;
  min-width: 0;
}

.enterprise-page-motion :deep(.v-btn:focus-visible),
.enterprise-page-motion :deep(button:focus-visible),
.enterprise-page-motion :deep([role="button"]:focus-visible) {
  outline: 3px solid rgba(var(--v-theme-primary), 0.34);
  outline-offset: 3px;
}
</style>

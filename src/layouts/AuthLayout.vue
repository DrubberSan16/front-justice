<template>
  <main class="auth-shell">
    <div class="auth-shell__grid" aria-hidden="true" />
    <div class="auth-shell__halo auth-shell__halo--one" aria-hidden="true" />
    <div class="auth-shell__halo auth-shell__halo--two" aria-hidden="true" />

    <div class="auth-shell__content">
      <motion.section
        class="auth-showcase"
        :initial="showcaseInitial"
        :animate="{ opacity: 1, x: 0 }"
        :transition="motionTransition"
      >
        <div class="auth-brand">
          <v-avatar size="58" rounded="xl" class="auth-brand__mark">
            <v-img :src="logo" alt="KPI Justice" cover />
          </v-avatar>
          <div>
            <strong>KPI Justice</strong>
            <span>Gestión empresarial</span>
          </div>
        </div>

        <div class="auth-showcase__copy">
          <div class="auth-showcase__eyebrow">
            <span />
            Mantenimiento, equipos e inventario
          </div>
          <h1>Decisiones claras.<br />Operación bajo control.</h1>
          <p>
            Información confiable para planificar trabajos, controlar materiales y mantener
            cada equipo disponible.
          </p>
        </div>

        <div class="operations-board" aria-label="Áreas principales del sistema">
          <article>
            <v-icon icon="mdi-progress-wrench" size="26" />
            <div><strong>Órdenes de trabajo</strong><span>Planificación y seguimiento</span></div>
          </article>
          <article>
            <v-icon icon="mdi-package-variant-closed" size="26" />
            <div><strong>Inventario</strong><span>Entradas, salidas y existencias</span></div>
          </article>
          <article>
            <v-icon icon="mdi-engine-outline" size="26" />
            <div><strong>Equipos</strong><span>Estado, horómetro y mantenimiento</span></div>
          </article>
        </div>

        <div class="auth-showcase__footer">
          <v-icon icon="mdi-shield-check-outline" />
          Acceso protegido según el perfil de cada usuario
        </div>
      </motion.section>

      <motion.aside
        class="auth-panel"
        :initial="panelInitial"
        :animate="{ opacity: 1, x: 0 }"
        :transition="motionTransition"
      >
        <div class="auth-panel__toolbar">
          <div>
            <span>Portal empresarial</span>
            <strong>KPI Justice</strong>
          </div>
          <ThemeToggle />
        </div>
        <div class="auth-panel__card">
          <slot />
        </div>
        <div class="auth-panel__support">
          <v-icon icon="mdi-lock-outline" size="16" />
          Sesión segura y acceso por permisos
        </div>
      </motion.aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { motion, useReducedMotion } from "motion-v";
import logo from "@/assets/logo-justice.png";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";

const shouldReduceMotion = useReducedMotion();
const showcaseInitial = computed(() => ({ opacity: 0, x: shouldReduceMotion.value ? 0 : -28 }));
const panelInitial = computed(() => ({ opacity: 0, x: shouldReduceMotion.value ? 0 : 28 }));
const motionTransition = computed(() => ({ duration: shouldReduceMotion.value ? 0 : 0.48, ease: "easeOut" }));
</script>

<style scoped>
.auth-shell { position: relative; min-height: 100vh; overflow: hidden; padding: clamp(18px, 3vw, 34px); background: radial-gradient(circle at 14% 12%, rgba(45, 128, 176, 0.28), transparent 28%), radial-gradient(circle at 88% 86%, rgba(211, 152, 67, 0.18), transparent 28%), linear-gradient(138deg, #061525 0%, #0a2940 48%, #10384e 100%); }
.auth-shell__grid { position: absolute; inset: 0; opacity: 0.22; background-image: linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom right, black, transparent 74%); }
.auth-shell__halo { position: absolute; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 50%; pointer-events: none; }
.auth-shell__halo--one { top: -190px; right: 24%; width: 520px; height: 520px; }
.auth-shell__halo--two { bottom: -310px; left: -90px; width: 660px; height: 660px; }
.auth-shell__content { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(390px, 500px); gap: clamp(24px, 4vw, 54px); align-items: stretch; width: min(1380px, 100%); min-height: calc(100vh - clamp(36px, 6vw, 68px)); margin: 0 auto; }
.auth-showcase { display: flex; min-height: 660px; flex-direction: column; justify-content: space-between; padding: clamp(26px, 4vw, 54px); border: 1px solid rgba(255, 255, 255, 0.13); border-radius: 30px; color: #f7fbff; background: linear-gradient(155deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 28px 80px rgba(0, 0, 0, 0.2); backdrop-filter: blur(18px); }
.auth-brand { display: flex; align-items: center; gap: 14px; }
.auth-brand__mark { border: 1px solid rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.1); }
.auth-brand > div { display: grid; gap: 2px; }
.auth-brand strong { font-size: 1.12rem; }
.auth-brand span { color: rgba(235, 244, 251, 0.68); font-size: 0.88rem; }
.auth-showcase__copy { max-width: 760px; margin-block: clamp(36px, 8vh, 84px) 32px; }
.auth-showcase__eyebrow { display: flex; align-items: center; gap: 9px; color: #d7ad70; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.auth-showcase__eyebrow span { width: 26px; height: 2px; background: currentColor; }
.auth-showcase h1 { max-width: 12ch; margin: 18px 0; font-size: clamp(2.7rem, 5vw, 5rem); font-weight: 820; letter-spacing: -0.055em; line-height: 0.98; }
.auth-showcase__copy p { max-width: 650px; margin: 0; color: rgba(235, 244, 251, 0.76); font-size: clamp(1rem, 1.5vw, 1.14rem); line-height: 1.75; }
.operations-board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.operations-board article { display: flex; min-height: 112px; align-items: flex-start; gap: 13px; padding: 18px; border: 1px solid rgba(255, 255, 255, 0.11); border-radius: 18px; background: rgba(255, 255, 255, 0.065); }
.operations-board .v-icon { flex: 0 0 auto; color: #d7ad70; }
.operations-board article div { display: grid; gap: 6px; }
.operations-board strong { font-size: 0.95rem; }
.operations-board span { color: rgba(235, 244, 251, 0.64); font-size: 0.8rem; line-height: 1.45; }
.auth-showcase__footer { display: flex; align-items: center; gap: 9px; margin-top: 22px; color: rgba(235, 244, 251, 0.66); font-size: 0.86rem; }
.auth-panel { display: flex; flex-direction: column; justify-content: center; gap: 18px; padding-block: 10px; }
.auth-panel__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-inline: 4px; color: #f7fbff; }
.auth-panel__toolbar > div:first-child { display: grid; gap: 2px; }
.auth-panel__toolbar span { color: rgba(235, 244, 251, 0.64); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }
.auth-panel__toolbar strong { font-size: 1.08rem; }
.auth-panel__card { width: 100%; }
.auth-panel__support { display: flex; justify-content: center; align-items: center; gap: 7px; color: rgba(235, 244, 251, 0.62); font-size: 0.8rem; }
@media (max-width: 1040px) { .auth-shell__content { grid-template-columns: 1fr; } .auth-showcase { min-height: auto; } .auth-panel { order: -1; max-width: 580px; width: 100%; margin: 0 auto; } .auth-showcase h1 { max-width: 100%; } }
@media (max-width: 700px) { .auth-shell { padding: 14px; } .auth-showcase { padding: 24px 20px; border-radius: 24px; } .operations-board { grid-template-columns: 1fr; } .operations-board article { min-height: auto; } .auth-showcase h1 { font-size: clamp(2.35rem, 12vw, 3.6rem); } }
</style>

<template>
  <div class="auth-shell">
    <div class="auth-shell__backdrop"></div>
    <div class="auth-shell__glow auth-shell__glow--one"></div>
    <div class="auth-shell__glow auth-shell__glow--two"></div>

    <div class="auth-shell__content">
      <section class="auth-shell__showcase enterprise-surface">
        <div class="auth-shell__tag">
          <v-chip color="accent" variant="flat" size="small">Operacion centralizada</v-chip>
          <span class="auth-shell__tagline">Panel empresarial preparado para trabajo diario</span>
        </div>

        <div class="auth-shell__headline">
          Supervisa inventario, mantenimiento y permisos desde una sola experiencia.
        </div>

        <p class="auth-shell__copy">
          Un acceso mas claro, adaptable y seguro para que tu equipo encuentre rapido lo
          que necesita en cualquier dispositivo.
        </p>

        <div class="auth-shell__stats">
          <div class="auth-stat">
            <strong>24/7</strong>
            <span>Disponibilidad operativa</span>
          </div>
          <div class="auth-stat">
            <strong>Dark mode</strong>
            <span>Cambio de tema inmediato</span>
          </div>
          <div class="auth-stat">
            <strong>Responsive</strong>
            <span>Navegacion clara en movil y desktop</span>
          </div>
        </div>

        <div class="auth-shell__points">
          <div class="auth-point">
            <v-icon icon="mdi-shield-lock-outline" />
            <span>Ingreso protegido y acceso centralizado por perfil.</span>
          </div>
          <div class="auth-point">
            <v-icon icon="mdi-view-dashboard-outline" />
            <span>Jerarquia visual limpia para acelerar tareas frecuentes.</span>
          </div>
          <div class="auth-point">
            <v-icon icon="mdi-cellphone-link" />
            <span>Interfaz adaptable para sesiones rapidas desde cualquier pantalla.</span>
          </div>
        </div>
      </section>

      <section class="auth-shell__panel">
        <div class="auth-shell__toolbar">
          <div class="auth-shell__brand">
            <v-avatar size="54" rounded="xl" class="auth-shell__brand-mark">
              <v-img :src="logo" alt="KPI Justice" cover />
            </v-avatar>

            <div>
              <div class="auth-shell__brand-title">KPI Justice</div>
              <div class="auth-shell__brand-subtitle">Acceso empresarial</div>
            </div>
          </div>

          <ThemeToggle />
        </div>

        <div class="auth-shell__card">
          <slot />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import logo from "@/assets/logo-justice.png";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
</script>

<style scoped>
.auth-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 28px;
}

.auth-shell__backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(140deg, rgba(10, 34, 58, 0.92) 0%, rgba(21, 59, 96, 0.84) 38%, rgba(205, 147, 67, 0.3) 100%);
}

.auth-shell__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(12px);
  opacity: 0.85;
}

.auth-shell__glow--one {
  top: -80px;
  right: -40px;
  width: 280px;
  height: 280px;
  background: rgba(236, 190, 120, 0.28);
}

.auth-shell__glow--two {
  bottom: -120px;
  left: -40px;
  width: 320px;
  height: 320px;
  background: rgba(90, 188, 215, 0.18);
}

.auth-shell__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 440px);
  gap: 28px;
  align-items: stretch;
  max-width: 1240px;
  min-height: calc(100vh - 56px);
  margin: 0 auto;
}

.auth-shell__showcase,
.auth-shell__panel {
  min-height: 100%;
}

.auth-shell__showcase {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  padding: 40px;
  color: #f8fbff;
  background:
    linear-gradient(180deg, rgba(8, 25, 42, 0.34) 0%, rgba(8, 25, 42, 0.12) 100%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-color: rgba(255, 255, 255, 0.14);
}

.auth-shell__tag {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.auth-shell__tagline {
  font-size: 0.95rem;
  color: rgba(232, 241, 252, 0.8);
}

.auth-shell__headline {
  max-width: 10ch;
  font-size: clamp(2.5rem, 5vw, 4.4rem);
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.auth-shell__copy {
  max-width: 560px;
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.75;
  color: rgba(233, 241, 250, 0.78);
}

.auth-shell__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.auth-stat {
  display: grid;
  gap: 6px;
  padding: 18px 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.auth-stat strong {
  font-size: 1.1rem;
}

.auth-stat span {
  color: rgba(233, 241, 250, 0.72);
}

.auth-shell__points {
  display: grid;
  gap: 16px;
}

.auth-point {
  display: flex;
  gap: 14px;
  align-items: center;
  color: rgba(245, 249, 255, 0.92);
}

.auth-point :deep(.v-icon) {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
}

.auth-shell__panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  padding: 6px 0;
}

.auth-shell__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.auth-shell__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #f9fbff;
}

.auth-shell__brand-mark {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.1);
}

.auth-shell__brand-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.1;
}

.auth-shell__brand-subtitle {
  color: rgba(233, 241, 250, 0.72);
}

.auth-shell__card {
  width: 100%;
}

@media (max-width: 1100px) {
  .auth-shell__content {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }

  .auth-shell__panel {
    order: -1;
  }

  .auth-shell__headline {
    max-width: 100%;
  }
}

@media (max-width: 720px) {
  .auth-shell {
    padding: 16px;
  }

  .auth-shell__showcase,
  .auth-shell__panel {
    padding: 0;
  }

  .auth-shell__showcase {
    padding: 24px;
  }

  .auth-shell__toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .auth-shell__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 520px) {
  .auth-shell__headline {
    font-size: clamp(2rem, 11vw, 2.9rem);
  }
}
</style>

<template>
  <section class="kpi-rail" :aria-label="ariaLabel">
    <header v-if="title || subtitle || showNav" class="kpi-rail__bar">
      <div class="kpi-rail__heading">
        <h3 v-if="title" class="kpi-rail__title">{{ title }}</h3>
        <p v-if="subtitle" class="kpi-rail__subtitle">{{ subtitle }}</p>
      </div>

      <div v-if="showNav" class="kpi-rail__nav">
        <!-- Sin `aria-live`: el contador cambia en cada fotograma del scroll y
             como region viva seria un martilleo para el lector de pantalla. La
             posicion ya la anuncian los puntos con `aria-current`. -->
        <span class="kpi-rail__counter" aria-hidden="true"
          >Tarjeta {{ activeIndex + 1 }} de {{ itemCount }}</span
        >
        <v-btn
          class="kpi-rail__arrow"
          icon="mdi-chevron-left"
          variant="flat"
          color="primary"
          :disabled="!canPrev"
          aria-label="Ver la tarjeta anterior"
          @click="step(-1)"
        />
        <v-btn
          class="kpi-rail__arrow"
          icon="mdi-chevron-right"
          variant="flat"
          color="primary"
          :disabled="!canNext"
          aria-label="Ver la tarjeta siguiente"
          @click="step(1)"
        />
      </div>
    </header>

    <div
      class="kpi-rail__viewport"
      :class="{
        'kpi-rail__viewport--at-start': !canPrev,
        'kpi-rail__viewport--at-end': !canNext,
      }"
    >
      <div
        ref="track"
        class="kpi-rail__track js-stagger"
        :class="{ 'kpi-rail__track--seeking': seeking }"
        role="group"
        tabindex="0"
        :aria-label="`${ariaLabel}. Use las flechas izquierda y derecha del teclado para recorrer las tarjetas.`"
        @keydown="onKeydown"
        @scroll.passive="syncPosition"
      >
        <slot />
      </div>
    </div>

    <div
      v-if="showNav"
      class="kpi-rail__dots"
      role="group"
      aria-label="Ir directamente a una tarjeta"
    >
      <button
        v-for="index in itemCount"
        :key="index"
        type="button"
        class="kpi-rail__dot"
        :class="{ 'kpi-rail__dot--active': index - 1 === activeIndex }"
        :aria-label="`Ir a la tarjeta ${index} de ${itemCount}`"
        :aria-current="index - 1 === activeIndex ? 'true' : undefined"
        @click="goTo(index - 1)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { animate } from "framer-motion/dom";
import { EASE_OUT, MOTION, prefersReducedMotion } from "@/app/motion";

/**
 * Riel horizontal de tarjetas.
 *
 * Patron base: *carousel / scroll area* de 21st.dev, traducido a Vuetify con los
 * tokens de este repo (nada de Tailwind ni de JSX copiado).
 *
 * Por que existe: el Dashboard Gerencia lo lee a diario alguien que no quiere
 * desplazar la pantalla hacia abajo. Apilar tarjetas en vertical obliga a hacer
 * justo eso; en un riel la misma informacion se recorre de izquierda a derecha,
 * que es un gesto mas corto y reversible.
 *
 * Decisiones de accesibilidad, todas deliberadas:
 * - El desplazamiento es scroll nativo: el dedo, el trackpad y la rueda con
 *   Shift funcionan sin JavaScript. No hay arrastre con el raton a proposito,
 *   porque capturar `pointermove` sobre el contenedor pelea con los tooltips de
 *   los lienzos de ECharts que viven dentro de las tarjetas.
 * - Cada pulsacion avanza UNA tarjeta, no una pagina: es predecible.
 * - Flechas grandes (56px), contador "Tarjeta N de M" y puntos con area de
 *   pulsacion de 44px, que es el minimo del checklist del design system.
 * - Con `prefers-reduced-motion: reduce` el salto es instantaneo.
 */
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    ariaLabel?: string;
  }>(),
  {
    title: "",
    subtitle: "",
    ariaLabel: "Tarjetas desplazables",
  },
);

const track = ref<HTMLElement | null>(null);
const itemCount = ref(0);
const maxScroll = ref(0);
const scrollLeft = ref(0);
const activeIndex = ref(0);
/**
 * Verdadero mientras corre la animacion de desplazamiento.
 *
 * Con `scroll-snap-type: mandatory`, cada asignacion a `scrollLeft` cuenta para
 * el navegador como un desplazamiento terminado y vuelve a imantar al punto mas
 * cercano. Contra una animacion que escribe `scrollLeft` en cada fotograma eso
 * es un tiron por fotograma. Se suelta el iman mientras dura el tramo y se
 * vuelve a poner al final, que es cuando de verdad tiene que imantar.
 */
const seeking = ref(false);

let ro: ResizeObserver | null = null;
let mo: MutationObserver | null = null;
let controls: { stop?: () => void } | null = null;

/** Umbral en pixeles para no dar por distinto lo que solo es redondeo del scroll. */
const EPSILON = 2;

const showNav = computed(() => maxScroll.value > EPSILON);
const canPrev = computed(() => scrollLeft.value > EPSILON);
const canNext = computed(() => scrollLeft.value < maxScroll.value - EPSILON);

function itemsOf(el: HTMLElement): HTMLElement[] {
  return Array.from(el.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

/**
 * El `offsetLeft` de un hijo incluye el relleno del riel. Se descuenta para que
 * la primera tarjeta corresponda a `scrollLeft = 0`.
 */
function padLeft(el: HTMLElement): number {
  return Number.parseFloat(window.getComputedStyle(el).paddingLeft) || 0;
}

function syncPosition() {
  const el = track.value;
  if (!el) return;
  scrollLeft.value = el.scrollLeft;
  maxScroll.value = Math.max(0, el.scrollWidth - el.clientWidth);

  const list = itemsOf(el);
  itemCount.value = list.length;
  if (!list.length) return;

  const pad = padLeft(el);
  let nearest = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  list.forEach((child, index) => {
    const distance = Math.abs(child.offsetLeft - pad - el.scrollLeft);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = index;
    }
  });
  activeIndex.value = nearest;
}

function animateTo(target: number) {
  const el = track.value;
  if (!el) return;
  controls?.stop?.();

  const clamped = Math.max(
    0,
    Math.min(target, Math.max(0, el.scrollWidth - el.clientWidth)),
  );

  if (prefersReducedMotion()) {
    el.scrollLeft = clamped;
    syncPosition();
    return;
  }

  seeking.value = true;
  controls = animate(el.scrollLeft, clamped, {
    duration: MOTION.reveal.duration + 0.08,
    ease: EASE_OUT,
    onUpdate: (value: number) => {
      el.scrollLeft = value;
    },
    onComplete: () => {
      seeking.value = false;
      syncPosition();
    },
  });
}

function step(direction: 1 | -1) {
  const el = track.value;
  if (!el) return;
  const list = itemsOf(el);
  if (!list.length) return;

  const pad = padLeft(el);
  const current = el.scrollLeft;

  if (direction === 1) {
    const next = list.find((child) => child.offsetLeft - pad > current + EPSILON);
    animateTo(next ? next.offsetLeft - pad : el.scrollWidth);
    return;
  }

  const previous = [...list]
    .reverse()
    .find((child) => child.offsetLeft - pad < current - EPSILON);
  animateTo(previous ? previous.offsetLeft - pad : 0);
}

function goTo(index: number) {
  const el = track.value;
  if (!el) return;
  const target = itemsOf(el)[index];
  if (!target) return;
  animateTo(target.offsetLeft - padLeft(el));
}

function onKeydown(event: KeyboardEvent) {
  const el = track.value;
  if (!el) return;
  // Solo se atiende el teclado cuando el foco esta en el riel, no cuando esta
  // dentro de un control de la tarjeta: ahi las flechas son suyas.
  if (event.target !== el) return;

  const actions: Record<string, () => void> = {
    ArrowRight: () => step(1),
    ArrowLeft: () => step(-1),
    Home: () => animateTo(0),
    End: () => animateTo(el.scrollWidth),
  };
  const action = actions[event.key];
  if (!action) return;
  event.preventDefault();
  action();
}

/**
 * Se vigilan tambien los hijos: los graficos se dibujan despues del montaje y
 * cambian el ancho util del riel. Sin esto, las flechas aparecian deshabilitadas
 * en la primera carga aunque hubiera tarjetas fuera de pantalla.
 */
function observeChildren() {
  const el = track.value;
  if (!el || !ro) return;
  ro.disconnect();
  ro.observe(el);
  itemsOf(el).forEach((child) => ro?.observe(child));
  syncPosition();
}

onMounted(() => {
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => syncPosition());
  }
  if (typeof MutationObserver !== "undefined" && track.value) {
    mo = new MutationObserver(() => observeChildren());
    mo.observe(track.value, { childList: true });
  }
  observeChildren();
});

onBeforeUnmount(() => {
  controls?.stop?.();
  controls = null;
  ro?.disconnect();
  ro = null;
  mo?.disconnect();
  mo = null;
});

defineExpose({ goTo, step });
</script>

<style scoped>
.kpi-rail {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.kpi-rail__bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.kpi-rail__heading {
  min-width: 0;
}

.kpi-rail__title {
  margin: 0;
  font-size: clamp(1.15rem, 2vw, 1.4rem);
  letter-spacing: -0.02em;
}

.kpi-rail__subtitle {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.95rem;
}

.kpi-rail__nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kpi-rail__counter {
  color: rgba(var(--v-theme-on-surface), 0.74);
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Objetivo de pulsacion holgado: el lector habitual de este tablero no apunta
   fino. 56px queda por encima del minimo de 44px del checklist. */
.kpi-rail__arrow.v-btn {
  width: 56px;
  height: 56px;
  border-radius: 18px;
}

.kpi-rail__arrow.v-btn :deep(.v-icon) {
  font-size: 30px;
}

.kpi-rail__viewport {
  /* Color al que se funden los bordes. Por defecto la superficie de la tarjeta
     contenedora; un contenedor con otro fondo solo tiene que redefinirlo. */
  --kpi-rail-fade: rgb(var(--v-theme-surface));
  position: relative;
  min-width: 0;
}

/* Sombra de borde: indica que hay mas tarjetas hacia ese lado. */
.kpi-rail__viewport::before,
.kpi-rail__viewport::after {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  width: 44px;
  content: "";
  pointer-events: none;
  opacity: 1;
  transition: opacity 200ms ease;
}

.kpi-rail__viewport::before {
  left: 0;
  background: linear-gradient(to right, var(--kpi-rail-fade), transparent);
}

.kpi-rail__viewport::after {
  right: 0;
  background: linear-gradient(to left, var(--kpi-rail-fade), transparent);
}

.kpi-rail__viewport--at-start::before,
.kpi-rail__viewport--at-end::after {
  opacity: 0;
}

.kpi-rail__track {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--kpi-rail-card, clamp(268px, 30vw, 372px));
  gap: 16px;
  padding: 6px 4px 12px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-left: 4px;
  /* El desplazamiento suave lo pone `animate()` de framer-motion; dejarlo
     tambien en CSS encadenaria dos suavizados y el riel se sentiria elastico. */
  scroll-behavior: auto;
}

.kpi-rail__track--seeking {
  scroll-snap-type: none;
}

.kpi-rail__track > :deep(*) {
  min-width: 0;
  scroll-snap-align: start;
}

.kpi-rail__track:focus-visible {
  outline: 4px solid rgba(var(--v-theme-primary), 0.32);
  outline-offset: 2px;
  border-radius: 20px;
}

/* Barra visible a proposito: es la pista de que el contenido sigue al costado. */
.kpi-rail__track::-webkit-scrollbar {
  height: 10px;
}

.kpi-rail__track::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
}

.kpi-rail__track::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.42);
}

.kpi-rail__dots {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.kpi-rail__dot {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.kpi-rail__dot::after {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.26);
  content: "";
  transition:
    width 200ms ease,
    background-color 200ms ease;
}

.kpi-rail__dot--active::after {
  width: 34px;
  background: rgb(var(--v-theme-primary));
}

.kpi-rail__dot:focus-visible {
  outline: 3px solid rgba(var(--v-theme-primary), 0.4);
  outline-offset: -4px;
  border-radius: 14px;
}

@media (max-width: 600px) {
  .kpi-rail__track {
    grid-auto-columns: min(84vw, 320px);
  }

  .kpi-rail__counter {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kpi-rail__viewport::before,
  .kpi-rail__viewport::after,
  .kpi-rail__dot::after {
    transition: none;
  }
}
</style>

import type { Directive } from "vue";
import { revealElement, type RevealCleanup } from "./engine";

const cleanups = new WeakMap<HTMLElement, RevealCleanup>();

/**
 * Directiva `v-reveal`: revela el elemento al entrar en viewport.
 *
 * Pensada para el markup Vuetify que ya existe, sin envolverlo en componentes
 * extra:  <v-card v-reveal>  ·  <v-col v-reveal="0.06">  (el valor es el delay
 * en segundos, util para escalonar una fila de tarjetas).
 *
 * Respeta `prefers-reduced-motion` porque delega en revealElement().
 */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    cleanups.set(el, revealElement(el, binding.value ?? 0));
  },
  unmounted(el) {
    cleanups.get(el)?.();
    cleanups.delete(el);
  },
};

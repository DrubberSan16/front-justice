import type { Directive } from "vue";
import { hoverElement, type RevealCleanup } from "./engine";

const cleanups = new WeakMap<HTMLElement, RevealCleanup>();

/**
 * Directiva `v-hover-card`: elevacion en hover segun el contrato del fleet.
 *
 *   <v-card v-hover-card>…</v-card>
 *
 * Equivale a la clase `js-hover-card`, pero se engancha en el montaje del
 * elemento en vez de depender de un recorrido del DOM al montar la vista. Eso
 * la hace la opcion correcta para tarjetas que se renderizan cuando llegan los
 * datos, donde el recorrido por clases no llega a verlas.
 *
 * Respeta `prefers-reduced-motion` porque delega en hoverElement().
 */
export const vHoverCard: Directive<HTMLElement> = {
  mounted(el) {
    cleanups.set(el, hoverElement(el));
  },
  unmounted(el) {
    cleanups.get(el)?.();
    cleanups.delete(el);
  },
};

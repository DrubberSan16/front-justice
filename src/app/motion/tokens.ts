/**
 * Tokens de movimiento del fleet.
 *
 * Fuente: design-system/kpi-justice/MASTER.md
 *   Design Dials -> Motion 3/10 (Subtle) | Variance 3/10 | Density 8/10
 *   Estilo: Minimalism & Swiss Style
 *
 * Contexto institucional y pantallas densas de operacion: el movimiento debe
 * leerse como un fundido, no como un desplazamiento. De ahi las distancias
 * cortas (8-16px) y la ausencia total de overshoot.
 *
 * Nota: los colores no se declaran aqui. La paleta viva de la app son los temas
 * Vuetify de src/app/config/theme.ts mas las variables de src/style.css; la
 * paleta del MASTER.md queda como referencia de contraste.
 */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const MOTION = {
  intensity: 3,
  hero: { duration: 0.4, distance: 12, stagger: 0.04 },
  reveal: { duration: 0.34, distance: 12, stagger: 0.04 },
  hover: { duration: 0.16, lift: -2, scale: 1.004 },
  exit: { duration: 0.14 },
} as const;

export const SELECTORS = {
  hero: ".js-hero-reveal",
  reveal: ".js-reveal",
  staggerGroup: ".js-stagger",
  staggerItem: ".js-stagger-item",
  hover: ".js-hover-card",
} as const;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

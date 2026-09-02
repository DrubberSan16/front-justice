import { animate, hover, inView, stagger } from "framer-motion/dom";
import { EASE_OUT, MOTION, SELECTORS, prefersReducedMotion } from "./tokens";

export type RevealCleanup = () => void;

type Stoppable = { stop?: () => void };

/**
 * Motor imperativo de revelado. Recorre `root` buscando las clases-gancho de
 * SELECTORS y les aplica el contrato de movimiento del design system.
 *
 * Es la misma implementacion que corre en las plataformas React del fleet: el
 * vocabulario de clases es identico y solo cambian los valores de MOTION.
 *
 * Bajo `prefers-reduced-motion: reduce` no anima y deja el estado final visible.
 */
export function initRevealMotion(root: HTMLElement | null | undefined): RevealCleanup {
  if (!root) return () => {};

  if (prefersReducedMotion()) {
    root.dataset.motion = "reduced";
    return () => {};
  }

  root.dataset.motion = "ready";
  const cleanups: RevealCleanup[] = [];
  const controls: Stoppable[] = [];

  const heroItems = root.querySelectorAll<HTMLElement>(SELECTORS.hero);
  if (heroItems.length) {
    controls.push(
      animate(
        heroItems,
        { opacity: [0, 1], y: [MOTION.hero.distance, 0] },
        { duration: MOTION.hero.duration, delay: stagger(MOTION.hero.stagger), ease: EASE_OUT },
      ),
    );
  }

  root.querySelectorAll<HTMLElement>(SELECTORS.reveal).forEach((element) => {
    animate(element, { opacity: 0, y: MOTION.reveal.distance }, { duration: 0 });
    cleanups.push(
      inView(
        element,
        () => {
          controls.push(
            animate(element, { opacity: 1, y: 0 }, { duration: MOTION.reveal.duration, ease: EASE_OUT }),
          );
        },
        { margin: "0px 0px -10% 0px", amount: 0.15 },
      ),
    );
  });

  root.querySelectorAll<HTMLElement>(SELECTORS.staggerGroup).forEach((group) => {
    const items = group.querySelectorAll<HTMLElement>(SELECTORS.staggerItem);
    if (!items.length) return;
    animate(items, { opacity: 0, y: MOTION.reveal.distance }, { duration: 0 });
    cleanups.push(
      inView(
        group,
        () => {
          controls.push(
            animate(
              items,
              { opacity: 1, y: 0 },
              { duration: MOTION.reveal.duration, delay: stagger(MOTION.reveal.stagger), ease: EASE_OUT },
            ),
          );
        },
        { amount: 0.12 },
      ),
    );
  });

  root.querySelectorAll<HTMLElement>(SELECTORS.hover).forEach((element) => {
    cleanups.push(
      hover(element, () => {
        controls.push(
          animate(
            element,
            { y: MOTION.hover.lift, scale: MOTION.hover.scale },
            { duration: MOTION.hover.duration, ease: EASE_OUT },
          ),
        );
        return () => {
          controls.push(
            animate(element, { y: 0, scale: 1 }, { duration: MOTION.exit.duration, ease: EASE_OUT }),
          );
        };
      }),
    );
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup?.());
    controls.forEach((control) => control?.stop?.());
  };
}

/**
 * Aplica el hover del design system a un unico elemento. Base de la directiva
 * `v-hover-card`.
 *
 * A diferencia del recorrido por clases de `initRevealMotion`, esto se engancha
 * en el montaje del propio elemento, asi que funciona con listas que se
 * renderizan cuando llegan los datos: no depende de que el elemento exista
 * cuando se monta la vista.
 */
export function hoverElement(element: HTMLElement): RevealCleanup {
  if (prefersReducedMotion()) return () => {};

  return hover(element, () => {
    animate(
      element,
      { y: MOTION.hover.lift, scale: MOTION.hover.scale },
      { duration: MOTION.hover.duration, ease: EASE_OUT },
    );
    return () => {
      animate(
        element,
        { y: 0, scale: 1 },
        { duration: MOTION.exit.duration, ease: EASE_OUT },
      );
    };
  });
}

/** Revela un unico elemento cuando entra en viewport. Base de la directiva `v-reveal`. */
export function revealElement(element: HTMLElement, delay = 0): RevealCleanup {
  if (prefersReducedMotion()) return () => {};

  animate(element, { opacity: 0, y: MOTION.reveal.distance }, { duration: 0 });
  return inView(
    element,
    () => {
      animate(
        element,
        { opacity: 1, y: 0 },
        { duration: MOTION.reveal.duration, ease: EASE_OUT, delay },
      );
    },
    { margin: "0px 0px -10% 0px", amount: 0.15 },
  );
}

/**
 * Resuelve el nodo DOM de un template ref.
 *
 * En este repo la mayoria de contenedores son componentes Vuetify (`v-row`,
 * `v-card`) o envoltorios propios como `EnterprisePageMotion`, y ahi un `ref`
 * devuelve la instancia del componente, no el elemento. Pasar esa instancia al
 * motor lo dejaba sin raiz y sin efecto, en silencio.
 */
export function resolveMotionElement(target: unknown): HTMLElement | null {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  const el = (target as { $el?: unknown }).$el;
  return el instanceof HTMLElement ? el : null;
}

import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import { initRevealMotion, type RevealCleanup } from "./engine";

/**
 * Conecta el motor de revelado a un subarbol del DOM.
 *
 *   <script setup lang="ts">
 *   const root = useRevealMotion(() => rows.value.length);
 *   </script>
 *   <template><div ref="root" class="js-stagger">...</div></template>
 *
 * `resetKey` es opcional: cuando su valor cambia (datos cargados, filtro, pagina)
 * el motor se vuelve a enganchar sobre el markup nuevo.
 */
export function useRevealMotion<T extends HTMLElement = HTMLElement>(
  resetKey?: () => unknown,
): Ref<T | null> {
  const root = ref<T | null>(null) as Ref<T | null>;
  let cleanup: RevealCleanup = () => {};

  const attach = () => {
    cleanup();
    cleanup = initRevealMotion(root.value);
  };

  onMounted(attach);
  onBeforeUnmount(() => cleanup());

  if (resetKey) {
    watch(resetKey, () => attach(), { flush: "post" });
  }

  return root;
}

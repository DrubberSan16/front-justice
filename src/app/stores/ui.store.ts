import { defineStore } from "pinia";
import { ref } from "vue";

type SnackbarVariant = "success" | "error" | "info" | "warning";

export const useUiStore = defineStore("ui", () => {
  const show = ref(false);
  const text = ref("");
  const variant = ref<SnackbarVariant>("info");
  const timeout = ref(3500);

  function open(message: string, v: SnackbarVariant = "info", t = 3500) {
    text.value = message;
    variant.value = v;
    timeout.value = t;
    show.value = true;
  }

  function success(message: string) {
    open(message, "success");
  }

  function error(message: string) {
    open(message, "error", 6000);
  }

  function close() {
    show.value = false;
  }

  return { show, text, variant, timeout, open, success, error, close };
});
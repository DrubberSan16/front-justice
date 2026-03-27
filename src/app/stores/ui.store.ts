import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  applyThemeDataset,
  isDarkTheme,
  persistTheme,
  resolveInitialTheme,
  type ThemeMode,
} from "@/app/config/theme";

type SnackbarVariant = "success" | "error" | "info" | "warning";

export const useUiStore = defineStore("ui", () => {
  const show = ref(false);
  const text = ref("");
  const variant = ref<SnackbarVariant>("info");
  const timeout = ref(3500);
  const currentTheme = ref<ThemeMode>(resolveInitialTheme());
  const darkMode = computed(() => isDarkTheme(currentTheme.value));

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

  function syncThemeWithDocument() {
    applyThemeDataset(currentTheme.value);
  }

  function setTheme(theme: ThemeMode) {
    currentTheme.value = theme;
    persistTheme(theme);
    syncThemeWithDocument();
  }

  function toggleTheme() {
    setTheme(darkMode.value ? "corporateLight" : "corporateDark");
  }

  return {
    show,
    text,
    variant,
    timeout,
    currentTheme,
    darkMode,
    open,
    success,
    error,
    close,
    setTheme,
    toggleTheme,
    syncThemeWithDocument,
  };
});

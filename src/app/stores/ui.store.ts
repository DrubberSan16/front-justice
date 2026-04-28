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
  const pendingHttpRequests = ref(0);
  const routeNavigating = ref(false);
  const networkLoadingVisible = ref(false);
  let showLoadingTimer: ReturnType<typeof setTimeout> | null = null;
  let hideLoadingTimer: ReturnType<typeof setTimeout> | null = null;

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

  function syncGlobalLoadingVisibility() {
    if (pendingHttpRequests.value > 0) {
      if (hideLoadingTimer) {
        clearTimeout(hideLoadingTimer);
        hideLoadingTimer = null;
      }

      if (networkLoadingVisible.value || showLoadingTimer) return;

      showLoadingTimer = setTimeout(() => {
        showLoadingTimer = null;
        if (pendingHttpRequests.value > 0) {
          networkLoadingVisible.value = true;
        }
      }, 150);
      return;
    }

    if (showLoadingTimer) {
      clearTimeout(showLoadingTimer);
      showLoadingTimer = null;
    }

    if (!networkLoadingVisible.value || hideLoadingTimer) return;

    hideLoadingTimer = setTimeout(() => {
      hideLoadingTimer = null;
      if (pendingHttpRequests.value === 0) {
        networkLoadingVisible.value = false;
      }
    }, 120);
  }

  function beginHttpRequest() {
    pendingHttpRequests.value += 1;
    syncGlobalLoadingVisibility();
  }

  function endHttpRequest() {
    pendingHttpRequests.value = Math.max(0, pendingHttpRequests.value - 1);
    syncGlobalLoadingVisibility();
  }

  function startRouteNavigation() {
    routeNavigating.value = true;
  }

  function endRouteNavigation() {
    routeNavigating.value = false;
  }

  const globalLoading = computed(
    () => routeNavigating.value || networkLoadingVisible.value,
  );

  return {
    show,
    text,
    variant,
    timeout,
    currentTheme,
    darkMode,
    pendingHttpRequests,
    routeNavigating,
    globalLoading,
    open,
    success,
    error,
    close,
    setTheme,
    toggleTheme,
    syncThemeWithDocument,
    beginHttpRequest,
    endHttpRequest,
    startRouteNavigation,
    endRouteNavigation,
  };
});

export const THEME_STORAGE_KEY = "kpi_ui_theme_v1";
export const DEFAULT_THEME = "corporateLight";
export function isDarkTheme(theme) {
    return theme === "corporateDark";
}
export function resolveInitialTheme() {
    if (typeof window === "undefined") {
        return DEFAULT_THEME;
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "corporateLight" || stored === "corporateDark") {
        return stored;
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "corporateDark"
        : DEFAULT_THEME;
}
export function persistTheme(theme) {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
export function applyThemeDataset(theme) {
    if (typeof document === "undefined") {
        return;
    }
    document.documentElement.dataset.theme = isDarkTheme(theme) ? "dark" : "light";
    document.documentElement.style.colorScheme = isDarkTheme(theme) ? "dark" : "light";
}
const corporateLightTheme = {
    dark: false,
    colors: {
        background: "#eef3f8",
        surface: "#ffffff",
        primary: "#1f4b7a",
        secondary: "#2d6e92",
        accent: "#d3963d",
        success: "#15803d",
        warning: "#b45309",
        error: "#b42318",
        info: "#2563eb",
        "on-background": "#102033",
        "on-surface": "#102033",
        "surface-variant": "#edf3f9",
        "on-surface-variant": "#526173",
    },
};
const corporateDarkTheme = {
    dark: true,
    colors: {
        background: "#07111d",
        surface: "#0d1b2b",
        primary: "#77aef2",
        secondary: "#58c2c7",
        accent: "#efb35d",
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
        "on-background": "#edf4ff",
        "on-surface": "#edf4ff",
        "surface-variant": "#13263b",
        "on-surface-variant": "#9fb1c6",
    },
};
export const appThemes = {
    corporateLight: corporateLightTheme,
    corporateDark: corporateDarkTheme,
};

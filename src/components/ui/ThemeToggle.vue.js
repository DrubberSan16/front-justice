/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
import { useUiStore } from "@/app/stores/ui.store";
const __VLS_props = withDefaults(defineProps(), {
    compact: false,
});
const ui = useUiStore();
const buttonIcon = computed(() => ui.darkMode ? "mdi-weather-sunny" : "mdi-weather-night");
const nextThemeLabel = computed(() => (ui.darkMode ? "claro" : "oscuro"));
const buttonLabel = computed(() => `Cambiar a modo ${nextThemeLabel.value}`);
const __VLS_defaults = {
    compact: false,
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: "theme-toggle" },
    ...{ class: ({ 'theme-toggle--compact': __VLS_ctx.compact }) },
    variant: (__VLS_ctx.compact ? 'text' : 'tonal'),
    color: "primary",
    rounded: "xl",
    'aria-label': (__VLS_ctx.buttonLabel),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: "theme-toggle" },
    ...{ class: ({ 'theme-toggle--compact': __VLS_ctx.compact }) },
    variant: (__VLS_ctx.compact ? 'text' : 'tonal'),
    color: "primary",
    rounded: "xl",
    'aria-label': (__VLS_ctx.buttonLabel),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ click: {} },
    { onClick: (__VLS_ctx.ui.toggleTheme) });
var __VLS_7 = {};
/** @type {__VLS_StyleScopedClasses['theme-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle--compact']} */ ;
const { default: __VLS_8 } = __VLS_3.slots;
let __VLS_9;
/** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
vIcon;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent1(__VLS_9, new __VLS_9({
    icon: (__VLS_ctx.buttonIcon),
    start: (!__VLS_ctx.compact),
}));
const __VLS_11 = __VLS_10({
    icon: (__VLS_ctx.buttonIcon),
    start: (!__VLS_ctx.compact),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
if (!__VLS_ctx.compact) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.nextThemeLabel);
}
let __VLS_14;
/** @ts-ignore @type {typeof __VLS_components.vTooltip | typeof __VLS_components.VTooltip | typeof __VLS_components.vTooltip | typeof __VLS_components.VTooltip} */
vTooltip;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
    activator: "parent",
    location: "bottom",
}));
const __VLS_16 = __VLS_15({
    activator: "parent",
    location: "bottom",
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
const { default: __VLS_19 } = __VLS_17.slots;
(__VLS_ctx.nextThemeLabel);
// @ts-ignore
[compact, compact, compact, compact, buttonLabel, ui, buttonIcon, nextThemeLabel, nextThemeLabel,];
var __VLS_17;
// @ts-ignore
[];
var __VLS_3;
var __VLS_4;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};

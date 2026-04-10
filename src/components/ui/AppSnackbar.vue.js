/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
import { useUiStore } from "@/app/stores/ui.store";
const ui = useUiStore();
const color = computed(() => {
    switch (ui.variant) {
        case "success": return "green";
        case "error": return "red";
        case "warning": return "orange";
        default: return "blue";
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vSnackbar | typeof __VLS_components.VSnackbar | typeof __VLS_components.vSnackbar | typeof __VLS_components.VSnackbar} */
vSnackbar;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.ui.show),
    timeout: (__VLS_ctx.ui.timeout),
    location: "top right",
    color: (__VLS_ctx.color),
    rounded: "lg",
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.ui.show),
    timeout: (__VLS_ctx.ui.timeout),
    location: "top right",
    color: (__VLS_ctx.color),
    rounded: "lg",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
(__VLS_ctx.ui.text);
{
    const { actions: __VLS_7 } = __VLS_3.slots;
    let __VLS_8;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        variant: "text",
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_13;
    const __VLS_14 = ({ click: {} },
        { onClick: (__VLS_ctx.ui.close) });
    const { default: __VLS_15 } = __VLS_11.slots;
    // @ts-ignore
    [ui, ui, ui, ui, color,];
    var __VLS_11;
    var __VLS_12;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

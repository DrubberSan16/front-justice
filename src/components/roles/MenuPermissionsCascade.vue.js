/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
import MenuNodeRow from "./MenuNodeRow.vue";
const props = defineProps();
const tree = computed(() => props.tree ?? []);
const menusLoading = computed(() => props.menusLoading ?? false);
const menusError = computed(() => props.menusError ?? null);
const getDraft = props.getDraft;
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "menu-tree" },
});
/** @type {__VLS_StyleScopedClasses['menu-tree']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-2 font-weight-bold mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
if (__VLS_ctx.menusError) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-3" },
    }));
    const __VLS_2 = __VLS_1({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    (__VLS_ctx.menusError);
    // @ts-ignore
    [menusError, menusError,];
    var __VLS_3;
}
if (__VLS_ctx.menusLoading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "py-3" },
    });
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vProgressLinear | typeof __VLS_components.VProgressLinear} */
    vProgressLinear;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        indeterminate: true,
    }));
    const __VLS_8 = __VLS_7({
        indeterminate: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    for (const [node] of __VLS_vFor((__VLS_ctx.tree))) {
        const __VLS_11 = MenuNodeRow;
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
            key: (node.id),
            node: (node),
            depth: (0),
            getDraft: (__VLS_ctx.getDraft),
        }));
        const __VLS_13 = __VLS_12({
            key: (node.id),
            node: (node),
            depth: (0),
            getDraft: (__VLS_ctx.getDraft),
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
        // @ts-ignore
        [menusLoading, tree, getDraft,];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

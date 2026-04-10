/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useMenuStore } from "@/app/stores/menu.store";
import SidebarMenuItem from "@/components/menu/SidebarMenuItem.vue";
const menu = useMenuStore();
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "px-2" },
});
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
if (__VLS_ctx.menu.loading) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vProgressLinear | typeof __VLS_components.VProgressLinear} */
    vProgressLinear;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        indeterminate: true,
        rounded: true,
        ...{ class: "mb-2" },
    }));
    const __VLS_2 = __VLS_1({
        indeterminate: true,
        rounded: true,
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
}
let __VLS_5;
/** @ts-ignore @type {typeof __VLS_components.vList | typeof __VLS_components.VList | typeof __VLS_components.vList | typeof __VLS_components.VList} */
vList;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    density: "comfortable",
    nav: true,
}));
const __VLS_7 = __VLS_6({
    density: "comfortable",
    nav: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
const { default: __VLS_10 } = __VLS_8.slots;
for (const [node] of __VLS_vFor((__VLS_ctx.menu.tree))) {
    const __VLS_11 = SidebarMenuItem;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
        key: (node.id),
        node: (node),
    }));
    const __VLS_13 = __VLS_12({
        key: (node.id),
        node: (node),
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    // @ts-ignore
    [menu, menu,];
}
// @ts-ignore
[];
var __VLS_8;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = withDefaults(defineProps(), {
    message: "Cargando información, espera un momento...",
    rows: 4,
    columns: 3,
});
const safeRows = computed(() => Math.max(1, Number(props.rows || 1)));
const safeColumns = computed(() => Math.max(1, Number(props.columns || 1)));
const __VLS_defaults = {
    message: "Cargando información, espera un momento...",
    rows: 4,
    columns: 3,
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
/** @type {__VLS_StyleScopedClasses['loading-table-state__row']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-table-state__row']} */ ;
(__VLS_ctx.safeColumns);
// @ts-ignore
[safeColumns,];
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "loading-table-state" },
});
/** @type {__VLS_StyleScopedClasses['loading-table-state']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "loading-table-state__header" },
});
/** @type {__VLS_StyleScopedClasses['loading-table-state__header']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vProgressCircular | typeof __VLS_components.VProgressCircular} */
vProgressCircular;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    indeterminate: true,
    color: "primary",
    size: "22",
    width: "3",
}));
const __VLS_2 = __VLS_1({
    indeterminate: true,
    color: "primary",
    size: "22",
    width: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.message);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "loading-table-state__body" },
});
/** @type {__VLS_StyleScopedClasses['loading-table-state__body']} */ ;
for (const [row] of __VLS_vFor((__VLS_ctx.safeRows))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (row),
        ...{ class: "loading-table-state__row" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-table-state__row']} */ ;
    for (const [column] of __VLS_vFor((__VLS_ctx.safeColumns))) {
        let __VLS_5;
        /** @ts-ignore @type {typeof __VLS_components.vSkeletonLoader | typeof __VLS_components.VSkeletonLoader} */
        vSkeletonLoader;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
            key: (`${row}-${column}`),
            type: "text",
            ...{ class: "loading-table-state__cell" },
        }));
        const __VLS_7 = __VLS_6({
            key: (`${row}-${column}`),
            type: "text",
            ...{ class: "loading-table-state__cell" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
        /** @type {__VLS_StyleScopedClasses['loading-table-state__cell']} */ ;
        // @ts-ignore
        [message, safeRows, safeColumns,];
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};

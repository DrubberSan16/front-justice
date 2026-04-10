/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from "vue";
defineOptions({
    name: "MenuNodeRow",
});
const props = defineProps();
const open = ref(true);
const draft = computed(() => props.getDraft(props.node.id));
const padStyle = computed(() => `padding-left:${props.depth * 16}px;`);
function toggleEnabled(value) {
    const v = value === true; // null -> false
    draft.value.enabled = v;
    if (v) {
        const none = !draft.value.isReaded &&
            !draft.value.isCreated &&
            !draft.value.isEdited &&
            !draft.value.permitDeleted &&
            !draft.value.isReports;
        if (none)
            draft.value.isReaded = true;
    }
    else {
        draft.value.isReaded = false;
        draft.value.isCreated = false;
        draft.value.isEdited = false;
        draft.value.permitDeleted = false;
        draft.value.isReports = false;
        draft.value.reportsPermit = "{}";
    }
}
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
    ...{ class: "mb-2" },
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between" },
    ...{ style: (__VLS_ctx.padStyle) },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
if (__VLS_ctx.node.children && __VLS_ctx.node.children.length) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.open ? 'mdi-chevron-down' : 'mdi-chevron-right'),
        variant: "text",
        size: "small",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.open ? 'mdi-chevron-down' : 'mdi-chevron-right'),
        variant: "text",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!(__VLS_ctx.node.children && __VLS_ctx.node.children.length))
                    return;
                __VLS_ctx.open = !__VLS_ctx.open;
                // @ts-ignore
                [padStyle, node, node, open, open, open,];
            } });
    var __VLS_3;
    var __VLS_4;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
}
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
vCheckbox;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    ...{ 'onUpdate:modelValue': {} },
    density: "compact",
    hideDetails: true,
    modelValue: (__VLS_ctx.draft.enabled),
    label: (__VLS_ctx.node.nombre),
}));
const __VLS_9 = __VLS_8({
    ...{ 'onUpdate:modelValue': {} },
    density: "compact",
    hideDetails: true,
    modelValue: (__VLS_ctx.draft.enabled),
    label: (__VLS_ctx.node.nombre),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
let __VLS_12;
const __VLS_13 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.toggleEnabled) });
var __VLS_10;
var __VLS_11;
if (__VLS_ctx.draft.enabled) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-center flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    let __VLS_14;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isReaded),
        label: "Leer",
    }));
    const __VLS_16 = __VLS_15({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isReaded),
        label: "Leer",
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    let __VLS_19;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isCreated),
        label: "Crear",
    }));
    const __VLS_21 = __VLS_20({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isCreated),
        label: "Crear",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isEdited),
        label: "Editar",
    }));
    const __VLS_26 = __VLS_25({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isEdited),
        label: "Editar",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_29;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.permitDeleted),
        label: "Eliminar",
    }));
    const __VLS_31 = __VLS_30({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.permitDeleted),
        label: "Eliminar",
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    let __VLS_34;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isReports),
        label: "Reportes",
    }));
    const __VLS_36 = __VLS_35({
        density: "compact",
        hideDetails: true,
        modelValue: (__VLS_ctx.draft.isReports),
        label: "Reportes",
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
}
if (__VLS_ctx.open && __VLS_ctx.node.children?.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    for (const [child] of __VLS_vFor((__VLS_ctx.node.children))) {
        let __VLS_39;
        /** @ts-ignore @type {typeof __VLS_components.MenuNodeRow} */
        MenuNodeRow;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
            key: (child.id),
            node: (child),
            depth: (__VLS_ctx.depth + 1),
            getDraft: (__VLS_ctx.getDraft),
        }));
        const __VLS_41 = __VLS_40({
            key: (child.id),
            node: (child),
            depth: (__VLS_ctx.depth + 1),
            getDraft: (__VLS_ctx.getDraft),
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        // @ts-ignore
        [node, node, node, open, draft, draft, draft, draft, draft, draft, draft, toggleEnabled, depth, getDraft,];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

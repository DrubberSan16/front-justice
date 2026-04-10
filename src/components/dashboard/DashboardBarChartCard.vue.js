/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = withDefaults(defineProps(), {
    subtitle: "",
    chipLabel: "",
    chipColor: "primary",
    emptyText: "No hay datos suficientes para graficar.",
});
const palette = [
    "linear-gradient(90deg, #2f6cab 0%, #7ab8ff 100%)",
    "linear-gradient(90deg, #0f8f72 0%, #6de3bf 100%)",
    "linear-gradient(90deg, #e17a00 0%, #ffca6a 100%)",
    "linear-gradient(90deg, #a245d8 0%, #dd9cff 100%)",
    "linear-gradient(90deg, #e24f5f 0%, #ff9aa5 100%)",
    "linear-gradient(90deg, #4558d8 0%, #9db0ff 100%)",
];
const normalizedItems = computed(() => {
    const source = Array.isArray(props.items) ? props.items : [];
    const maxValue = Math.max(...source.map((item) => Number(item?.value || 0)), 1);
    return source.map((item, index) => {
        const rawValue = Number(item?.value || 0);
        return {
            key: item.key,
            label: item.label,
            value: rawValue,
            valueLabel: item.valueLabel || String(rawValue),
            helper: item.helper || "",
            color: item.color || palette[index % palette.length],
            percent: Math.max(6, Math.min(100, (rawValue / maxValue) * 100)),
        };
    });
});
const __VLS_defaults = {
    subtitle: "",
    chipLabel: "",
    chipColor: "primary",
    emptyText: "No hay datos suficientes para graficar.",
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
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    rounded: "xl",
    ...{ class: "pa-5 enterprise-surface h-100 dashboard-chart-card" },
}));
const __VLS_2 = __VLS_1({
    rounded: "xl",
    ...{ class: "pa-5 enterprise-surface h-100 dashboard-chart-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['pa-5']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-chart-card']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between mb-3" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
(__VLS_ctx.title);
if (__VLS_ctx.subtitle) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.subtitle);
}
if (__VLS_ctx.chipLabel) {
    let __VLS_7;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
        label: true,
        color: (__VLS_ctx.chipColor),
        variant: "tonal",
    }));
    const __VLS_9 = __VLS_8({
        label: true,
        color: (__VLS_ctx.chipColor),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    const { default: __VLS_12 } = __VLS_10.slots;
    (__VLS_ctx.chipLabel);
    // @ts-ignore
    [title, subtitle, subtitle, chipLabel, chipLabel, chipColor,];
    var __VLS_10;
}
if (__VLS_ctx.normalizedItems.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-bar-chart" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.normalizedItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (item.key),
            ...{ class: "dashboard-bar-chart__row" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart__row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-bar-chart__meta" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart__meta']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-bar-chart__label" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart__label']} */ ;
        (item.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-bar-chart__value" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart__value']} */ ;
        (item.valueLabel);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "dashboard-bar-chart__track" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart__track']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "dashboard-bar-chart__fill" },
            ...{ style: ({
                    width: `${item.percent}%`,
                    background: item.color,
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart__fill']} */ ;
        if (item.helper) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dashboard-bar-chart__helper" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-bar-chart__helper']} */ ;
            (item.helper);
        }
        // @ts-ignore
        [normalizedItems, normalizedItems,];
    }
}
else {
    let __VLS_13;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        type: "info",
        variant: "tonal",
        density: "compact",
        text: (__VLS_ctx.emptyText),
    }));
    const __VLS_15 = __VLS_14({
        type: "info",
        variant: "tonal",
        density: "compact",
        text: (__VLS_ctx.emptyText),
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
}
// @ts-ignore
[emptyText,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};

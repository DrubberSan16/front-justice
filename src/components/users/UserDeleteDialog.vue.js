/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = defineProps();
const emit = defineEmits();
const model = computed({
    get: () => props.modelValue,
    set: (v) => emit("update:modelValue", v),
});
const user = computed(() => props.user);
const loading = computed(() => props.loading ?? false);
const error = computed(() => props.error ?? null);
function close() {
    model.value = false;
}
function confirm() {
    emit("confirm");
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.model),
    maxWidth: "520",
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.model),
    maxWidth: "520",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    rounded: "xl",
}));
const __VLS_9 = __VLS_8({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
const { default: __VLS_12 } = __VLS_10.slots;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_15 = __VLS_14({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_18 } = __VLS_16.slots;
// @ts-ignore
[model,];
var __VLS_16;
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({}));
const __VLS_21 = __VLS_20({}, ...__VLS_functionalComponentArgsRest(__VLS_20));
const { default: __VLS_24 } = __VLS_22.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-2" },
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.user?.nameUser);
(__VLS_ctx.user?.email);
if (__VLS_ctx.error) {
    let __VLS_25;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        type: "error",
        variant: "tonal",
    }));
    const __VLS_27 = __VLS_26({
        type: "error",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    const { default: __VLS_30 } = __VLS_28.slots;
    (__VLS_ctx.error);
    // @ts-ignore
    [user, user, error, error,];
    var __VLS_28;
}
// @ts-ignore
[];
var __VLS_22;
let __VLS_31;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
    ...{ class: "pa-4" },
}));
const __VLS_33 = __VLS_32({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_36 } = __VLS_34.slots;
let __VLS_37;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({}));
const __VLS_39 = __VLS_38({}, ...__VLS_functionalComponentArgsRest(__VLS_38));
let __VLS_42;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_44 = __VLS_43({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
let __VLS_47;
const __VLS_48 = ({ click: {} },
    { onClick: (__VLS_ctx.close) });
const { default: __VLS_49 } = __VLS_45.slots;
// @ts-ignore
[close,];
var __VLS_45;
var __VLS_46;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
    color: "error",
}));
const __VLS_52 = __VLS_51({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
    color: "error",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
let __VLS_55;
const __VLS_56 = ({ click: {} },
    { onClick: (__VLS_ctx.confirm) });
const { default: __VLS_57 } = __VLS_53.slots;
// @ts-ignore
[loading, confirm,];
var __VLS_53;
var __VLS_54;
// @ts-ignore
[];
var __VLS_34;
// @ts-ignore
[];
var __VLS_10;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};

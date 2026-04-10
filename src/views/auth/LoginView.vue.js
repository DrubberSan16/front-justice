/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "@/app/http/api";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();
const nameUser = ref("");
const passUser = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref(null);
async function onSubmit() {
    error.value = null;
    loading.value = true;
    try {
        const payload = {
            nameUser: nameUser.value.trim(),
            passUser: passUser.value,
        };
        const { data } = await api.post("/kpi_security/users/login", payload);
        auth.setSession(data);
        if (auth.userId)
            await menu.loadMenuTree(auth.userId);
        const redirect = route.query.redirect || "/app/dashboard";
        router.replace(redirect);
    }
    catch (e) {
        error.value = e?.response?.data?.message || "Credenciales invalidas o error de conexion.";
    }
    finally {
        loading.value = false;
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['login-highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['login-highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__footer']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "login-card enterprise-surface" },
    rounded: "xl",
    elevation: "0",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "login-card enterprise-surface" },
    rounded: "xl",
    elevation: "0",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-card__eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['login-card__eyebrow']} */ ;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    size: "small",
    color: "primary",
    variant: "tonal",
}));
const __VLS_9 = __VLS_8({
    size: "small",
    color: "primary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
const { default: __VLS_12 } = __VLS_10.slots;
var __VLS_10;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "login-card__status" },
});
/** @type {__VLS_StyleScopedClasses['login-card__status']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-card__header" },
});
/** @type {__VLS_StyleScopedClasses['login-card__header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-h4 font-weight-bold mb-2" },
});
/** @type {__VLS_StyleScopedClasses['text-h4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "login-card__copy" },
});
/** @type {__VLS_StyleScopedClasses['login-card__copy']} */ ;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.vForm | typeof __VLS_components.VForm | typeof __VLS_components.vForm | typeof __VLS_components.VForm} */
vForm;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ 'onSubmit': {} },
    ...{ class: "login-form" },
}));
const __VLS_15 = __VLS_14({
    ...{ 'onSubmit': {} },
    ...{ class: "login-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = ({ submit: {} },
    { onSubmit: (__VLS_ctx.onSubmit) });
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
const { default: __VLS_20 } = __VLS_16.slots;
let __VLS_21;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
    modelValue: (__VLS_ctx.nameUser),
    ...{ class: "login-field" },
    label: "Usuario",
    prependInnerIcon: "mdi-account-circle-outline",
    variant: "outlined",
    density: "comfortable",
    autocomplete: "username",
    disabled: (__VLS_ctx.loading),
    autofocus: true,
    clearable: true,
    required: true,
}));
const __VLS_23 = __VLS_22({
    modelValue: (__VLS_ctx.nameUser),
    ...{ class: "login-field" },
    label: "Usuario",
    prependInnerIcon: "mdi-account-circle-outline",
    variant: "outlined",
    density: "comfortable",
    autocomplete: "username",
    disabled: (__VLS_ctx.loading),
    autofocus: true,
    clearable: true,
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
/** @type {__VLS_StyleScopedClasses['login-field']} */ ;
let __VLS_26;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
    ...{ 'onClick:appendInner': {} },
    modelValue: (__VLS_ctx.passUser),
    ...{ class: "login-field" },
    label: "Contrasena",
    type: (__VLS_ctx.showPassword ? 'text' : 'password'),
    prependInnerIcon: "mdi-lock-outline",
    appendInnerIcon: (__VLS_ctx.showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'),
    variant: "outlined",
    density: "comfortable",
    autocomplete: "current-password",
    disabled: (__VLS_ctx.loading),
    required: true,
}));
const __VLS_28 = __VLS_27({
    ...{ 'onClick:appendInner': {} },
    modelValue: (__VLS_ctx.passUser),
    ...{ class: "login-field" },
    label: "Contrasena",
    type: (__VLS_ctx.showPassword ? 'text' : 'password'),
    prependInnerIcon: "mdi-lock-outline",
    appendInnerIcon: (__VLS_ctx.showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'),
    variant: "outlined",
    density: "comfortable",
    autocomplete: "current-password",
    disabled: (__VLS_ctx.loading),
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_31;
const __VLS_32 = ({ 'click:appendInner': {} },
    { 'onClick:appendInner': (...[$event]) => {
            __VLS_ctx.showPassword = !__VLS_ctx.showPassword;
            // @ts-ignore
            [onSubmit, nameUser, loading, loading, passUser, showPassword, showPassword, showPassword, showPassword,];
        } });
/** @type {__VLS_StyleScopedClasses['login-field']} */ ;
var __VLS_29;
var __VLS_30;
if (__VLS_ctx.error) {
    let __VLS_33;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-4" },
    }));
    const __VLS_35 = __VLS_34({
        type: "error",
        variant: "tonal",
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    const { default: __VLS_38 } = __VLS_36.slots;
    (__VLS_ctx.error);
    // @ts-ignore
    [error, error,];
    var __VLS_36;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-form__helper" },
});
/** @type {__VLS_StyleScopedClasses['login-form__helper']} */ ;
let __VLS_39;
/** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
vIcon;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
    icon: "mdi-shield-check-outline",
    size: "18",
}));
const __VLS_41 = __VLS_40({
    icon: "mdi-shield-check-outline",
    size: "18",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
let __VLS_44;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
    loading: (__VLS_ctx.loading),
    type: "submit",
    block: true,
    size: "large",
    ...{ class: "login-submit" },
    color: "primary",
    prependIcon: "mdi-login",
}));
const __VLS_46 = __VLS_45({
    loading: (__VLS_ctx.loading),
    type: "submit",
    block: true,
    size: "large",
    ...{ class: "login-submit" },
    color: "primary",
    prependIcon: "mdi-login",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
/** @type {__VLS_StyleScopedClasses['login-submit']} */ ;
const { default: __VLS_49 } = __VLS_47.slots;
// @ts-ignore
[loading,];
var __VLS_47;
// @ts-ignore
[];
var __VLS_16;
var __VLS_17;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-card__footer" },
});
/** @type {__VLS_StyleScopedClasses['login-card__footer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-highlight" },
});
/** @type {__VLS_StyleScopedClasses['login-highlight']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-highlight" },
});
/** @type {__VLS_StyleScopedClasses['login-highlight']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useTheme } from "vuetify";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import AppSnackbar from "@/components/ui/AppSnackbar.vue";
import AppBootLoader from "@/components/loading/AppBootLoader.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
import AppLayout from "@/layouts/AppLayout.vue";
const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();
const ui = useUiStore();
const theme = useTheme();
const booting = ref(true);
const layout = computed(() => (route.meta.layout === "app" ? AppLayout : AuthLayout));
watch(() => ui.currentTheme, (value) => {
    theme.global.name.value = value;
    ui.syncThemeWithDocument();
}, { immediate: true });
onMounted(async () => {
    auth.bootstrapFromStorage();
    if (auth.isAuthenticated && auth.userId) {
        await menu.loadMenuTree(auth.userId);
    }
    setTimeout(() => (booting.value = false), 250);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vApp | typeof __VLS_components.VApp | typeof __VLS_components.vApp | typeof __VLS_components.VApp} */
vApp;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
const __VLS_7 = AppSnackbar;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({}));
const __VLS_9 = __VLS_8({}, ...__VLS_functionalComponentArgsRest(__VLS_8));
if (__VLS_ctx.booting) {
    const __VLS_12 = AppBootLoader;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
else {
    const __VLS_17 = (__VLS_ctx.layout);
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({}));
    const __VLS_19 = __VLS_18({}, ...__VLS_functionalComponentArgsRest(__VLS_18));
    const { default: __VLS_22 } = __VLS_20.slots;
    let __VLS_23;
    /** @ts-ignore @type {typeof __VLS_components.routerView | typeof __VLS_components.RouterView} */
    routerView;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({}));
    const __VLS_25 = __VLS_24({}, ...__VLS_functionalComponentArgsRest(__VLS_24));
    // @ts-ignore
    [booting, layout,];
    var __VLS_20;
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

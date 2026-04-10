/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import logo from "@/assets/logo-justice.png";
import SidebarMenu from "@/components/menu/SidebarMenu.vue";
import NotificationBell from "@/components/ui/NotificationBell.vue";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import { useNotificationsStore } from "@/app/stores/notifications.store";
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const notifications = useNotificationsStore();
const { mdAndDown } = useDisplay();
const isMobile = computed(() => mdAndDown.value);
const pageTitle = computed(() => String(route.meta.title ?? "Dashboard"));
const userDisplay = computed(() => auth.user?.nameSurname || auth.user?.email || "Sesion activa");
const userEmail = computed(() => auth.user?.email || "Sin correo registrado");
const notificationRecipients = computed(() => [
    auth.user?.id,
    auth.user?.nameUser,
    auth.user?.email,
]
    .map((item) => String(item || "").trim())
    .filter(Boolean));
const drawer = ref(!isMobile.value);
watch(isMobile, (value) => {
    drawer.value = !value;
}, { immediate: true });
watch(notificationRecipients, (recipients) => {
    if (recipients.length) {
        void notifications.start(recipients);
    }
    else {
        notifications.stop();
    }
}, { immediate: true });
onBeforeUnmount(() => {
    notifications.stop();
});
function onLogout() {
    notifications.stop();
    auth.logout();
    menu.clear();
    router.push({ name: "login" });
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
/** @type {__VLS_StyleScopedClasses['app-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['app-topbar__heading']} */ ;
/** @type {__VLS_StyleScopedClasses['app-topbar__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
/** @type {__VLS_StyleScopedClasses['app-drawer__header']} */ ;
/** @type {__VLS_StyleScopedClasses['app-drawer__brand']} */ ;
/** @type {__VLS_StyleScopedClasses['app-topbar__heading']} */ ;
/** @type {__VLS_StyleScopedClasses['app-topbar__eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['app-topbar__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vLayout | typeof __VLS_components.VLayout | typeof __VLS_components.vLayout | typeof __VLS_components.VLayout} */
vLayout;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "app-layout" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "app-layout" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['app-layout']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.vNavigationDrawer | typeof __VLS_components.VNavigationDrawer | typeof __VLS_components.vNavigationDrawer | typeof __VLS_components.VNavigationDrawer} */
vNavigationDrawer;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    modelValue: (__VLS_ctx.drawer),
    temporary: (__VLS_ctx.isMobile),
    width: (304),
    elevation: "0",
    ...{ class: "app-drawer" },
}));
const __VLS_9 = __VLS_8({
    modelValue: (__VLS_ctx.drawer),
    temporary: (__VLS_ctx.isMobile),
    width: (304),
    elevation: "0",
    ...{ class: "app-drawer" },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
/** @type {__VLS_StyleScopedClasses['app-drawer']} */ ;
const { default: __VLS_12 } = __VLS_10.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-drawer__header" },
});
/** @type {__VLS_StyleScopedClasses['app-drawer__header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-drawer__brand" },
});
/** @type {__VLS_StyleScopedClasses['app-drawer__brand']} */ ;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.vAvatar | typeof __VLS_components.VAvatar | typeof __VLS_components.vAvatar | typeof __VLS_components.VAvatar} */
vAvatar;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    size: "48",
    rounded: "xl",
    ...{ class: "app-drawer__brand-mark" },
}));
const __VLS_15 = __VLS_14({
    size: "48",
    rounded: "xl",
    ...{ class: "app-drawer__brand-mark" },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
/** @type {__VLS_StyleScopedClasses['app-drawer__brand-mark']} */ ;
const { default: __VLS_18 } = __VLS_16.slots;
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.vImg | typeof __VLS_components.VImg} */
vImg;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    src: (__VLS_ctx.logo),
    alt: "KPI Justice",
    cover: true,
}));
const __VLS_21 = __VLS_20({
    src: (__VLS_ctx.logo),
    alt: "KPI Justice",
    cover: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
// @ts-ignore
[drawer, isMobile, logo,];
var __VLS_16;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-drawer__title" },
});
/** @type {__VLS_StyleScopedClasses['app-drawer__title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-drawer__subtitle" },
});
/** @type {__VLS_StyleScopedClasses['app-drawer__subtitle']} */ ;
(__VLS_ctx.userDisplay);
let __VLS_24;
/** @ts-ignore @type {typeof __VLS_components.vSheet | typeof __VLS_components.VSheet | typeof __VLS_components.vSheet | typeof __VLS_components.VSheet} */
vSheet;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
    ...{ class: "app-drawer__status" },
    rounded: "xl",
}));
const __VLS_26 = __VLS_25({
    ...{ class: "app-drawer__status" },
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
/** @type {__VLS_StyleScopedClasses['app-drawer__status']} */ ;
const { default: __VLS_29 } = __VLS_27.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-drawer__status-label" },
});
/** @type {__VLS_StyleScopedClasses['app-drawer__status-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-drawer__status-value" },
});
/** @type {__VLS_StyleScopedClasses['app-drawer__status-value']} */ ;
(__VLS_ctx.userEmail);
// @ts-ignore
[userDisplay, userEmail,];
var __VLS_27;
let __VLS_30;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    ...{ class: "mb-2" },
}));
const __VLS_32 = __VLS_31({
    ...{ class: "mb-2" },
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
const __VLS_35 = SidebarMenu;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({}));
const __VLS_37 = __VLS_36({}, ...__VLS_functionalComponentArgsRest(__VLS_36));
{
    const { append: __VLS_40 } = __VLS_10.slots;
    let __VLS_41;
    /** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
    vDivider;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({}));
    const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "app-drawer__footer" },
    });
    /** @type {__VLS_StyleScopedClasses['app-drawer__footer']} */ ;
    let __VLS_46;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        ...{ 'onClick': {} },
        block: true,
        variant: "tonal",
        color: "error",
        rounded: "xl",
    }));
    const __VLS_48 = __VLS_47({
        ...{ 'onClick': {} },
        block: true,
        variant: "tonal",
        color: "error",
        rounded: "xl",
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    let __VLS_51;
    const __VLS_52 = ({ click: {} },
        { onClick: (__VLS_ctx.onLogout) });
    const { default: __VLS_53 } = __VLS_49.slots;
    // @ts-ignore
    [onLogout,];
    var __VLS_49;
    var __VLS_50;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_10;
let __VLS_54;
/** @ts-ignore @type {typeof __VLS_components.vAppBar | typeof __VLS_components.VAppBar | typeof __VLS_components.vAppBar | typeof __VLS_components.VAppBar} */
vAppBar;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
    elevation: "0",
    border: true,
    ...{ class: "app-topbar" },
}));
const __VLS_56 = __VLS_55({
    elevation: "0",
    border: true,
    ...{ class: "app-topbar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
/** @type {__VLS_StyleScopedClasses['app-topbar']} */ ;
const { default: __VLS_59 } = __VLS_57.slots;
let __VLS_60;
/** @ts-ignore @type {typeof __VLS_components.vAppBarNavIcon | typeof __VLS_components.VAppBarNavIcon} */
vAppBarNavIcon;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
    ...{ 'onClick': {} },
}));
const __VLS_62 = __VLS_61({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
let __VLS_65;
const __VLS_66 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.drawer = !__VLS_ctx.drawer;
            // @ts-ignore
            [drawer, drawer,];
        } });
var __VLS_63;
var __VLS_64;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-topbar__heading" },
});
/** @type {__VLS_StyleScopedClasses['app-topbar__heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-topbar__eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['app-topbar__eyebrow']} */ ;
let __VLS_67;
/** @ts-ignore @type {typeof __VLS_components.vAppBarTitle | typeof __VLS_components.VAppBarTitle | typeof __VLS_components.vAppBarTitle | typeof __VLS_components.VAppBarTitle} */
vAppBarTitle;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({}));
const __VLS_69 = __VLS_68({}, ...__VLS_functionalComponentArgsRest(__VLS_68));
const { default: __VLS_72 } = __VLS_70.slots;
(__VLS_ctx.pageTitle);
// @ts-ignore
[pageTitle,];
var __VLS_70;
let __VLS_73;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({}));
const __VLS_75 = __VLS_74({}, ...__VLS_functionalComponentArgsRest(__VLS_74));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-topbar__actions" },
});
/** @type {__VLS_StyleScopedClasses['app-topbar__actions']} */ ;
const __VLS_78 = ThemeToggle;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent1(__VLS_78, new __VLS_78({
    compact: (__VLS_ctx.isMobile),
}));
const __VLS_80 = __VLS_79({
    compact: (__VLS_ctx.isMobile),
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
const __VLS_83 = NotificationBell;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({}));
const __VLS_85 = __VLS_84({}, ...__VLS_functionalComponentArgsRest(__VLS_84));
if (!__VLS_ctx.isMobile) {
    let __VLS_88;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent1(__VLS_88, new __VLS_88({
        ...{ class: "app-topbar__chip" },
        color: "primary",
        variant: "tonal",
        rounded: "xl",
        prependIcon: "mdi-account-circle-outline",
    }));
    const __VLS_90 = __VLS_89({
        ...{ class: "app-topbar__chip" },
        color: "primary",
        variant: "tonal",
        rounded: "xl",
        prependIcon: "mdi-account-circle-outline",
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    /** @type {__VLS_StyleScopedClasses['app-topbar__chip']} */ ;
    const { default: __VLS_93 } = __VLS_91.slots;
    (__VLS_ctx.userDisplay);
    // @ts-ignore
    [isMobile, isMobile, userDisplay,];
    var __VLS_91;
}
// @ts-ignore
[];
var __VLS_57;
let __VLS_94;
/** @ts-ignore @type {typeof __VLS_components.vMain | typeof __VLS_components.VMain | typeof __VLS_components.vMain | typeof __VLS_components.VMain} */
vMain;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({
    ...{ class: "app-main" },
}));
const __VLS_96 = __VLS_95({
    ...{ class: "app-main" },
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
const { default: __VLS_99 } = __VLS_97.slots;
let __VLS_100;
/** @ts-ignore @type {typeof __VLS_components.vContainer | typeof __VLS_components.VContainer | typeof __VLS_components.vContainer | typeof __VLS_components.VContainer} */
vContainer;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
    fluid: true,
    ...{ class: "app-container" },
}));
const __VLS_102 = __VLS_101({
    fluid: true,
    ...{ class: "app-container" },
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
const { default: __VLS_105 } = __VLS_103.slots;
let __VLS_106;
/** @ts-ignore @type {typeof __VLS_components.routerView | typeof __VLS_components.RouterView} */
routerView;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent1(__VLS_106, new __VLS_106({}));
const __VLS_108 = __VLS_107({}, ...__VLS_functionalComponentArgsRest(__VLS_107));
// @ts-ignore
[];
var __VLS_103;
// @ts-ignore
[];
var __VLS_97;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

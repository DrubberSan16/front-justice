/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useAuthStore } from "@/app/stores/auth.store";
import { useNotificationsStore } from "@/app/stores/notifications.store";
const auth = useAuthStore();
const store = useNotificationsStore();
function buildSubtitle(item) {
    const timestamp = item?.created_at ? new Date(item.created_at).toLocaleString() : "";
    const moduleLabel = item?.module ? ` · ${item.module}` : "";
    return `${item?.body || ""}${moduleLabel}${timestamp ? ` · ${timestamp}` : ""}`;
}
function markRead(id) {
    if (!id)
        return;
    void store.markAsRead(id);
}
function markAll() {
    void store.markAllAsRead([auth.user?.id, auth.user?.nameUser, auth.user?.email].filter((value) => typeof value === "string" && value.trim().length > 0));
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vMenu | typeof __VLS_components.VMenu | typeof __VLS_components.vMenu | typeof __VLS_components.VMenu} */
vMenu;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    location: "bottom end",
    closeOnContentClick: (false),
    width: "420",
}));
const __VLS_2 = __VLS_1({
    location: "bottom end",
    closeOnContentClick: (false),
    width: "420",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
{
    const { activator: __VLS_7 } = __VLS_3.slots;
    const [{ props }] = __VLS_vSlot(__VLS_7);
    let __VLS_8;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        icon: true,
        ...(props),
        variant: "text",
    }));
    const __VLS_10 = __VLS_9({
        icon: true,
        ...(props),
        variant: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    const { default: __VLS_13 } = __VLS_11.slots;
    let __VLS_14;
    /** @ts-ignore @type {typeof __VLS_components.vBadge | typeof __VLS_components.VBadge | typeof __VLS_components.vBadge | typeof __VLS_components.VBadge} */
    vBadge;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        content: (__VLS_ctx.store.unreadCount),
        modelValue: (__VLS_ctx.store.unreadCount > 0),
        color: "error",
    }));
    const __VLS_16 = __VLS_15({
        content: (__VLS_ctx.store.unreadCount),
        modelValue: (__VLS_ctx.store.unreadCount > 0),
        color: "error",
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    const { default: __VLS_19 } = __VLS_17.slots;
    let __VLS_20;
    /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon | typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
    vIcon;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({}));
    const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    const { default: __VLS_25 } = __VLS_23.slots;
    // @ts-ignore
    [store, store,];
    var __VLS_23;
    // @ts-ignore
    [];
    var __VLS_17;
    // @ts-ignore
    [];
    var __VLS_11;
    // @ts-ignore
    [];
}
let __VLS_26;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
    rounded: "xl",
}));
const __VLS_28 = __VLS_27({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
const { default: __VLS_31 } = __VLS_29.slots;
let __VLS_32;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
    ...{ class: "d-flex align-center justify-space-between" },
}));
const __VLS_34 = __VLS_33({
    ...{ class: "d-flex align-center justify-space-between" },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
const { default: __VLS_37 } = __VLS_35.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
let __VLS_38;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
    size: "small",
    color: (__VLS_ctx.store.connected ? 'success' : 'warning'),
    variant: "tonal",
}));
const __VLS_40 = __VLS_39({
    size: "small",
    color: (__VLS_ctx.store.connected ? 'success' : 'warning'),
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
const { default: __VLS_43 } = __VLS_41.slots;
(__VLS_ctx.store.connected ? 'En línea' : 'Sincronizando');
// @ts-ignore
[store, store,];
var __VLS_41;
// @ts-ignore
[];
var __VLS_35;
let __VLS_44;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({}));
const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
let __VLS_49;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
    ...{ class: "pa-0" },
}));
const __VLS_51 = __VLS_50({
    ...{ class: "pa-0" },
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
/** @type {__VLS_StyleScopedClasses['pa-0']} */ ;
const { default: __VLS_54 } = __VLS_52.slots;
let __VLS_55;
/** @ts-ignore @type {typeof __VLS_components.vList | typeof __VLS_components.VList | typeof __VLS_components.vList | typeof __VLS_components.VList} */
vList;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
    density: "compact",
    lines: "two",
    ...{ style: {} },
}));
const __VLS_57 = __VLS_56({
    density: "compact",
    lines: "two",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
const { default: __VLS_60 } = __VLS_58.slots;
for (const [item] of __VLS_vFor((__VLS_ctx.store.items))) {
    let __VLS_61;
    /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem | typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
    vListItem;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
        ...{ 'onClick': {} },
        key: (item.id),
        title: (item.title),
        subtitle: (__VLS_ctx.buildSubtitle(item)),
    }));
    const __VLS_63 = __VLS_62({
        ...{ 'onClick': {} },
        key: (item.id),
        title: (item.title),
        subtitle: (__VLS_ctx.buildSubtitle(item)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
    let __VLS_66;
    const __VLS_67 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.markRead(item.id);
                // @ts-ignore
                [store, buildSubtitle, markRead,];
            } });
    const { default: __VLS_68 } = __VLS_64.slots;
    {
        const { prepend: __VLS_69 } = __VLS_64.slots;
        let __VLS_70;
        /** @ts-ignore @type {typeof __VLS_components.vAvatar | typeof __VLS_components.VAvatar | typeof __VLS_components.vAvatar | typeof __VLS_components.VAvatar} */
        vAvatar;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
            size: "28",
            color: (item.status === 'READ' ? 'grey-lighten-2' : 'primary'),
        }));
        const __VLS_72 = __VLS_71({
            size: "28",
            color: (item.status === 'READ' ? 'grey-lighten-2' : 'primary'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
        const { default: __VLS_75 } = __VLS_73.slots;
        let __VLS_76;
        /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon | typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
        vIcon;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
            size: "18",
        }));
        const __VLS_78 = __VLS_77({
            size: "18",
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        const { default: __VLS_81 } = __VLS_79.slots;
        // @ts-ignore
        [];
        var __VLS_79;
        // @ts-ignore
        [];
        var __VLS_73;
        // @ts-ignore
        [];
    }
    {
        const { append: __VLS_82 } = __VLS_64.slots;
        let __VLS_83;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
            size: "x-small",
            variant: "tonal",
            color: (item.status === 'READ' ? 'default' : 'primary'),
        }));
        const __VLS_85 = __VLS_84({
            size: "x-small",
            variant: "tonal",
            color: (item.status === 'READ' ? 'default' : 'primary'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        const { default: __VLS_88 } = __VLS_86.slots;
        (item.status === 'READ' ? 'Leída' : 'Nueva');
        // @ts-ignore
        [];
        var __VLS_86;
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_64;
    var __VLS_65;
    // @ts-ignore
    [];
}
if (!__VLS_ctx.store.items.length && !__VLS_ctx.store.loading) {
    let __VLS_89;
    /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
    vListItem;
    // @ts-ignore
    const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
        title: "Sin notificaciones",
        subtitle: "Todavía no hay eventos recientes.",
    }));
    const __VLS_91 = __VLS_90({
        title: "Sin notificaciones",
        subtitle: "Todavía no hay eventos recientes.",
    }, ...__VLS_functionalComponentArgsRest(__VLS_90));
}
// @ts-ignore
[store, store,];
var __VLS_58;
// @ts-ignore
[];
var __VLS_52;
let __VLS_94;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent1(__VLS_94, new __VLS_94({}));
const __VLS_96 = __VLS_95({}, ...__VLS_functionalComponentArgsRest(__VLS_95));
let __VLS_99;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({}));
const __VLS_101 = __VLS_100({}, ...__VLS_functionalComponentArgsRest(__VLS_100));
const { default: __VLS_104 } = __VLS_102.slots;
let __VLS_105;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({}));
const __VLS_107 = __VLS_106({}, ...__VLS_functionalComponentArgsRest(__VLS_106));
let __VLS_110;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent1(__VLS_110, new __VLS_110({
    ...{ 'onClick': {} },
    variant: "text",
    disabled: (!__VLS_ctx.store.unreadCount),
}));
const __VLS_112 = __VLS_111({
    ...{ 'onClick': {} },
    variant: "text",
    disabled: (!__VLS_ctx.store.unreadCount),
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
let __VLS_115;
const __VLS_116 = ({ click: {} },
    { onClick: (__VLS_ctx.markAll) });
const { default: __VLS_117 } = __VLS_113.slots;
// @ts-ignore
[store, markAll,];
var __VLS_113;
var __VLS_114;
// @ts-ignore
[];
var __VLS_102;
// @ts-ignore
[];
var __VLS_29;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

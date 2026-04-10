/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
import { useRouter } from "vue-router";
import { resolveIcon, resolveModuleIconColor } from "@/app/config/icons";
import { resolveMenuRouteLocation } from "@/app/utils/menu-route-catalog";
const props = defineProps();
const router = useRouter();
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0);
const icon = computed(() => resolveIcon(props.node.icon));
const moduleScope = computed(() => props.moduleScope ?? props.node.nombre);
const iconColor = computed(() => resolveModuleIconColor(moduleScope.value));
function goToComponent(urlComponent) {
    const target = resolveMenuRouteLocation(router, urlComponent);
    if (target)
        router.push(target);
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
if (__VLS_ctx.hasChildren) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vListGroup | typeof __VLS_components.VListGroup | typeof __VLS_components.vListGroup | typeof __VLS_components.VListGroup} */
    vListGroup;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        value: (__VLS_ctx.node.nombre),
    }));
    const __VLS_2 = __VLS_1({
        value: (__VLS_ctx.node.nombre),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    var __VLS_5 = {};
    const { default: __VLS_6 } = __VLS_3.slots;
    {
        const { activator: __VLS_7 } = __VLS_3.slots;
        const [{ props }] = __VLS_vSlot(__VLS_7);
        let __VLS_8;
        /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem | typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
        vListItem;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
            ...(props),
            title: (__VLS_ctx.node.nombre),
            subtitle: (__VLS_ctx.node.descripcion),
        }));
        const __VLS_10 = __VLS_9({
            ...(props),
            title: (__VLS_ctx.node.nombre),
            subtitle: (__VLS_ctx.node.descripcion),
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        const { default: __VLS_13 } = __VLS_11.slots;
        {
            const { prepend: __VLS_14 } = __VLS_11.slots;
            let __VLS_15;
            /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
            vIcon;
            // @ts-ignore
            const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
                icon: (__VLS_ctx.icon),
                color: (__VLS_ctx.iconColor),
            }));
            const __VLS_17 = __VLS_16({
                icon: (__VLS_ctx.icon),
                color: (__VLS_ctx.iconColor),
            }, ...__VLS_functionalComponentArgsRest(__VLS_16));
            // @ts-ignore
            [hasChildren, node, node, node, icon, iconColor,];
        }
        // @ts-ignore
        [];
        var __VLS_11;
        // @ts-ignore
        [];
    }
    for (const [child] of __VLS_vFor((__VLS_ctx.node.children))) {
        let __VLS_20;
        /** @ts-ignore @type {typeof __VLS_components.SidebarMenuItem} */
        SidebarMenuItem;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
            key: (child.id),
            node: (child),
            moduleScope: (__VLS_ctx.moduleScope),
        }));
        const __VLS_22 = __VLS_21({
            key: (child.id),
            node: (child),
            moduleScope: (__VLS_ctx.moduleScope),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        // @ts-ignore
        [node, moduleScope,];
    }
    // @ts-ignore
    [];
    var __VLS_3;
}
else {
    let __VLS_25;
    /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem | typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
    vListItem;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
        ...{ 'onClick': {} },
        title: (__VLS_ctx.node.nombre),
        subtitle: (__VLS_ctx.node.descripcion),
    }));
    const __VLS_27 = __VLS_26({
        ...{ 'onClick': {} },
        title: (__VLS_ctx.node.nombre),
        subtitle: (__VLS_ctx.node.descripcion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    let __VLS_30;
    const __VLS_31 = ({ click: {} },
        { onClick: (...[$event]) => {
                if (!!(__VLS_ctx.hasChildren))
                    return;
                __VLS_ctx.goToComponent(__VLS_ctx.node.urlComponent);
                // @ts-ignore
                [node, node, node, goToComponent,];
            } });
    var __VLS_32 = {};
    const { default: __VLS_33 } = __VLS_28.slots;
    {
        const { prepend: __VLS_34 } = __VLS_28.slots;
        let __VLS_35;
        /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
        vIcon;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({
            icon: (__VLS_ctx.icon),
            color: (__VLS_ctx.iconColor),
        }));
        const __VLS_37 = __VLS_36({
            icon: (__VLS_ctx.icon),
            color: (__VLS_ctx.iconColor),
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        // @ts-ignore
        [icon, iconColor,];
    }
    // @ts-ignore
    [];
    var __VLS_28;
    var __VLS_29;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

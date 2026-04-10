/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useMenusStore } from "@/app/stores/menus.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { coerceMenuComponentValue, getMenuRouteCatalog, } from "@/app/utils/menu-route-catalog";
import { createLogTransact } from "@/app/services/log-transacts.service";
import { resolveIcon } from "@/app/config/icons";
const router = useRouter();
const menus = useMenusStore();
const menuStore = useMenuStore();
const ui = useUiStore();
const auth = useAuthStore();
const { mdAndDown, smAndDown } = useDisplay();
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Menu", "Menú", "Menus"]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const routeCatalog = computed(() => getMenuRouteCatalog(router));
const headers = computed(() => [
    { title: "Nombre", key: "nombre" },
    { title: "Descripcion", key: "descripcion" },
    { title: "Icono", key: "icon" },
    { title: "Ruta", key: "urlComponent" },
    { title: "Posicion", key: "menuPosition" },
    { title: "Estado", key: "status" },
    { title: "Eliminado", key: "isDeleted" },
    ...(canCreate.value || canEdit.value || canDelete.value
        ? [{ title: "Acciones", key: "actions", sortable: false }]
        : []),
]);
function flattenNodes(nodes, depth = 0) {
    const out = [];
    const sorted = [...(nodes ?? [])].sort((a, b) => Number(a.menuPosition) - Number(b.menuPosition));
    for (const node of sorted) {
        out.push({ ...node, depth });
        if (node.children?.length) {
            out.push(...flattenNodes(node.children, depth + 1));
        }
    }
    return out;
}
const rows = computed(() => flattenNodes(menus.filteredTree));
const allRows = computed(() => flattenNodes(menus.tree));
const assignedRoutes = computed(() => {
    const used = new Set();
    for (const item of allRows.value) {
        const value = coerceMenuComponentValue(router, item.urlComponent ?? "");
        if (value)
            used.add(value);
    }
    return used;
});
const unassignedModules = computed(() => routeCatalog.value.filter((item) => !assignedRoutes.value.has(item.value)));
const formDialog = ref(false);
const deleteDialog = ref(false);
const busy = ref(false);
const selected = ref(null);
const isCreatingChild = ref(false);
const isDialogFullscreen = computed(() => mdAndDown.value);
const isDeleteDialogFullscreen = computed(() => smAndDown.value);
const form = reactive({
    nombre: "",
    descripcion: "",
    menuId: null,
    urlComponent: "",
    menuPosition: "0",
    status: "ACTIVE",
    icon: "",
});
const componentOptions = computed(() => {
    const base = routeCatalog.value.map((item) => ({
        title: item.label,
        value: item.value,
        routePath: item.routePath,
        viewName: item.viewName,
    }));
    if (!form.urlComponent || base.some((item) => item.value === form.urlComponent)) {
        return base;
    }
    return [
        {
            title: `${form.urlComponent} · valor heredado`,
            value: form.urlComponent,
            routePath: "Sin ruta detectada",
            viewName: "",
        },
        ...base,
    ];
});
const selectedComponentHint = computed(() => {
    if (!form.urlComponent) {
        return "Opcional para menus contenedores. Si eliges una vista se guardara el name de la ruta.";
    }
    const current = componentOptions.value.find((item) => item.value === form.urlComponent);
    if (!current)
        return "Valor actual no asociado a una ruta detectada.";
    return current.viewName
        ? `${current.routePath} · ${current.viewName}`
        : current.routePath;
});
const isEditing = computed(() => !!selected.value && !isCreatingChild.value);
const parentName = computed(() => {
    if (!form.menuId)
        return "";
    const parent = allRows.value.find((item) => item.id === form.menuId);
    return parent?.nombre ?? form.menuId;
});
onMounted(async () => {
    if (!canRead.value)
        return;
    await menus.fetchAll();
});
function nextRootPosition() {
    const roots = menus.tree ?? [];
    const maxPosition = roots.reduce((max, item) => {
        const value = Number(item.menuPosition);
        return Number.isFinite(value) ? Math.max(max, value) : max;
    }, -1);
    return String(maxPosition + 1);
}
function resetForm() {
    form.nombre = "";
    form.descripcion = "";
    form.menuId = null;
    form.urlComponent = "";
    form.menuPosition = "0";
    form.status = "ACTIVE";
    form.icon = "";
}
function openCreateParent() {
    selected.value = null;
    isCreatingChild.value = false;
    resetForm();
    form.menuId = null;
    form.menuPosition = nextRootPosition();
    formDialog.value = true;
}
function openCreateFromRoute(item) {
    selected.value = null;
    isCreatingChild.value = false;
    resetForm();
    form.nombre = item.title;
    form.descripcion = item.routePath;
    form.menuId = null;
    form.urlComponent = item.value;
    form.menuPosition = nextRootPosition();
    formDialog.value = true;
}
function openCreateChild(item) {
    selected.value = item;
    isCreatingChild.value = true;
    resetForm();
    form.menuId = item.id;
    form.menuPosition = String((Number(item.menuPosition) || 0) + 1);
    formDialog.value = true;
}
function openEdit(item) {
    selected.value = item;
    isCreatingChild.value = false;
    form.nombre = item.nombre;
    form.descripcion = item.descripcion ?? "";
    form.menuId = item.parentId;
    form.urlComponent = coerceMenuComponentValue(router, item.urlComponent ?? "");
    form.menuPosition = String(item.menuPosition ?? "0");
    form.status = item.status;
    form.icon = item.icon ?? "";
    formDialog.value = true;
}
function openDelete(item) {
    selected.value = item;
    deleteDialog.value = true;
}
function currentUserName() {
    return auth.user?.nameUser || "admin";
}
async function logAndShowTechnicalError(typeLog, description) {
    const ticket = await createLogTransact({
        moduleMicroservice: "kpi_security",
        status: "ACTIVE",
        typeLog,
        description,
        createdBy: currentUserName(),
    });
    ui.error(ticket
        ? `Error tecnico, informacion enviada al equipo de soporte. TICKET: ${ticket}`
        : "Error tecnico, enviar detalles al equipo de soporte");
}
async function onSubmitForm() {
    if (busy.value)
        return;
    busy.value = true;
    try {
        const payload = {
            nombre: form.nombre,
            descripcion: form.descripcion,
            menuId: form.menuId,
            urlComponent: form.urlComponent,
            menuPosition: form.menuPosition,
            status: form.status,
            icon: form.icon,
        };
        if (isEditing.value && selected.value) {
            await menus.updateMenu(selected.value.id, payload);
        }
        else {
            await menus.createMenu(payload);
        }
        ui.success("Guardado con exito");
        formDialog.value = false;
    }
    catch (e) {
        const details = `Menus module error\n` +
            `action=${isEditing.value ? "UPDATE" : "CREATE"}\n` +
            `menuId=${selected.value?.id ?? "new"}\n` +
            `payload=${JSON.stringify(form)}\n` +
            `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;
        await logAndShowTechnicalError(isEditing.value ? "MENU_UPDATE" : "MENU_CREATE", details);
    }
    finally {
        busy.value = false;
    }
}
async function onConfirmDelete() {
    if (!selected.value || busy.value)
        return;
    busy.value = true;
    try {
        await menus.deleteMenu(selected.value.id);
        deleteDialog.value = false;
        ui.success("Eliminado con exito");
    }
    catch (e) {
        const details = `Menus module error\n` +
            `action=DELETE\n` +
            `menuId=${selected.value.id}\n` +
            `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;
        await logAndShowTechnicalError("MENU_DELETE", details);
    }
    finally {
        busy.value = false;
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['menus-table']} */ ;
/** @type {__VLS_StyleScopedClasses['menus-table']} */ ;
if (!__VLS_ctx.canRead) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        type: "warning",
        variant: "tonal",
    }));
    const __VLS_2 = __VLS_1({
        type: "warning",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    // @ts-ignore
    [canRead,];
    var __VLS_3;
}
else {
    if (__VLS_ctx.canCreate && __VLS_ctx.unassignedModules.length) {
        let __VLS_6;
        /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
        vCard;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
            rounded: "xl",
            ...{ class: "pa-4 mb-3 enterprise-surface" },
        }));
        const __VLS_8 = __VLS_7({
            rounded: "xl",
            ...{ class: "pa-4 mb-3 enterprise-surface" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
        const { default: __VLS_11 } = __VLS_9.slots;
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        let __VLS_12;
        /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
        vRow;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
            dense: true,
        }));
        const __VLS_14 = __VLS_13({
            dense: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        const { default: __VLS_17 } = __VLS_15.slots;
        for (const [item] of __VLS_vFor((__VLS_ctx.unassignedModules))) {
            let __VLS_18;
            /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
            vCol;
            // @ts-ignore
            const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
                key: (item.value),
                cols: "12",
                md: "6",
                xl: "4",
            }));
            const __VLS_20 = __VLS_19({
                key: (item.value),
                cols: "12",
                md: "6",
                xl: "4",
            }, ...__VLS_functionalComponentArgsRest(__VLS_19));
            const { default: __VLS_23 } = __VLS_21.slots;
            let __VLS_24;
            /** @ts-ignore @type {typeof __VLS_components.vSheet | typeof __VLS_components.VSheet | typeof __VLS_components.vSheet | typeof __VLS_components.VSheet} */
            vSheet;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
                rounded: "lg",
                border: true,
                ...{ class: "pa-3 h-100" },
            }));
            const __VLS_26 = __VLS_25({
                rounded: "lg",
                border: true,
                ...{ class: "pa-3 h-100" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
            /** @type {__VLS_StyleScopedClasses['pa-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-100']} */ ;
            const { default: __VLS_29 } = __VLS_27.slots;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-body-1 font-weight-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
            (item.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (item.viewName);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-caption text-medium-emphasis" },
            });
            /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
            (item.routePath);
            let __VLS_30;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
                ...{ 'onClick': {} },
                ...{ class: "mt-3" },
                size: "small",
                color: "primary",
                variant: "tonal",
            }));
            const __VLS_32 = __VLS_31({
                ...{ 'onClick': {} },
                ...{ class: "mt-3" },
                size: "small",
                color: "primary",
                variant: "tonal",
            }, ...__VLS_functionalComponentArgsRest(__VLS_31));
            let __VLS_35;
            const __VLS_36 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canCreate && __VLS_ctx.unassignedModules.length))
                            return;
                        __VLS_ctx.openCreateFromRoute(item);
                        // @ts-ignore
                        [canCreate, unassignedModules, unassignedModules, openCreateFromRoute,];
                    } });
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            const { default: __VLS_37 } = __VLS_33.slots;
            // @ts-ignore
            [];
            var __VLS_33;
            var __VLS_34;
            // @ts-ignore
            [];
            var __VLS_27;
            // @ts-ignore
            [];
            var __VLS_21;
            // @ts-ignore
            [];
        }
        // @ts-ignore
        [];
        var __VLS_15;
        // @ts-ignore
        [];
        var __VLS_9;
    }
    let __VLS_38;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_40 = __VLS_39({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_43 } = __VLS_41.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-header mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h6 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    if (__VLS_ctx.canCreate) {
        let __VLS_44;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-plus",
        }));
        const __VLS_46 = __VLS_45({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-plus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        let __VLS_49;
        const __VLS_50 = ({ click: {} },
            { onClick: (__VLS_ctx.openCreateParent) });
        const { default: __VLS_51 } = __VLS_47.slots;
        // @ts-ignore
        [canCreate, openCreateParent,];
        var __VLS_47;
        var __VLS_48;
    }
    let __VLS_52;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent1(__VLS_52, new __VLS_52({
        dense: true,
        ...{ class: "mb-2" },
    }));
    const __VLS_54 = __VLS_53({
        dense: true,
        ...{ class: "mb-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    const { default: __VLS_57 } = __VLS_55.slots;
    let __VLS_58;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
        cols: "12",
        md: "6",
    }));
    const __VLS_60 = __VLS_59({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    const { default: __VLS_63 } = __VLS_61.slots;
    let __VLS_64;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent1(__VLS_64, new __VLS_64({
        modelValue: (__VLS_ctx.menus.search),
        label: "Buscar (nombre, descripcion, ruta, icono)",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }));
    const __VLS_66 = __VLS_65({
        modelValue: (__VLS_ctx.menus.search),
        label: "Buscar (nombre, descripcion, ruta, icono)",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    // @ts-ignore
    [menus,];
    var __VLS_61;
    let __VLS_69;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
        cols: "12",
        md: "3",
        ...{ class: "d-flex align-center" },
    }));
    const __VLS_71 = __VLS_70({
        cols: "12",
        md: "3",
        ...{ class: "d-flex align-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_70));
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    const { default: __VLS_74 } = __VLS_72.slots;
    let __VLS_75;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
        modelValue: (__VLS_ctx.menus.includeDeleted),
        label: "Incluir eliminados",
        density: "compact",
        hideDetails: true,
    }));
    const __VLS_77 = __VLS_76({
        modelValue: (__VLS_ctx.menus.includeDeleted),
        label: "Incluir eliminados",
        density: "compact",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    // @ts-ignore
    [menus,];
    var __VLS_72;
    // @ts-ignore
    [];
    var __VLS_55;
    if (__VLS_ctx.menus.error) {
        let __VLS_80;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }));
        const __VLS_82 = __VLS_81({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_85 } = __VLS_83.slots;
        (__VLS_ctx.menus.error);
        // @ts-ignore
        [menus, menus,];
        var __VLS_83;
    }
    let __VLS_86;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.rows),
        loading: (__VLS_ctx.menus.loading),
        loadingText: "Obteniendo menúes...",
        itemsPerPage: (20),
        ...{ class: "elevation-0 enterprise-table menus-table" },
    }));
    const __VLS_88 = __VLS_87({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.rows),
        loading: (__VLS_ctx.menus.loading),
        loadingText: "Obteniendo menúes...",
        itemsPerPage: (20),
        ...{ class: "elevation-0 enterprise-table menus-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_87));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['menus-table']} */ ;
    const { default: __VLS_91 } = __VLS_89.slots;
    {
        const { 'item.icon': __VLS_92 } = __VLS_89.slots;
        const [{ item }] = __VLS_vSlot(__VLS_92);
        let __VLS_93;
        /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
        vIcon;
        // @ts-ignore
        const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
            icon: (__VLS_ctx.resolveIcon(item.icon ?? undefined)),
        }));
        const __VLS_95 = __VLS_94({
            icon: (__VLS_ctx.resolveIcon(item.icon ?? undefined)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_94));
        // @ts-ignore
        [menus, headers, rows, resolveIcon,];
    }
    {
        const { 'item.nombre': __VLS_98 } = __VLS_89.slots;
        const [{ item }] = __VLS_vSlot(__VLS_98);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ style: (`padding-left: ${item.depth * 18}px`) },
            ...{ class: "d-flex align-center" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        if (item.depth > 0) {
            let __VLS_99;
            /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
            vIcon;
            // @ts-ignore
            const __VLS_100 = __VLS_asFunctionalComponent1(__VLS_99, new __VLS_99({
                size: "16",
                icon: "mdi-subdirectory-arrow-right",
            }));
            const __VLS_101 = __VLS_100({
                size: "16",
                icon: "mdi-subdirectory-arrow-right",
            }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (item.nombre);
        // @ts-ignore
        [];
    }
    {
        const { 'item.status': __VLS_104 } = __VLS_89.slots;
        const [{ item }] = __VLS_vSlot(__VLS_104);
        let __VLS_105;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
            size: "small",
            color: (item.status === 'ACTIVE' ? 'green' : 'grey'),
            variant: "tonal",
        }));
        const __VLS_107 = __VLS_106({
            size: "small",
            color: (item.status === 'ACTIVE' ? 'green' : 'grey'),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_106));
        const { default: __VLS_110 } = __VLS_108.slots;
        (item.status);
        // @ts-ignore
        [];
        var __VLS_108;
        // @ts-ignore
        [];
    }
    {
        const { 'item.isDeleted': __VLS_111 } = __VLS_89.slots;
        const [{ item }] = __VLS_vSlot(__VLS_111);
        let __VLS_112;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent1(__VLS_112, new __VLS_112({
            size: "small",
            color: (item.isDeleted ? 'red' : 'green'),
            variant: "tonal",
        }));
        const __VLS_114 = __VLS_113({
            size: "small",
            color: (item.isDeleted ? 'red' : 'green'),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        const { default: __VLS_117 } = __VLS_115.slots;
        (item.isDeleted ? "Si" : "No");
        // @ts-ignore
        [];
        var __VLS_115;
        // @ts-ignore
        [];
    }
    {
        const { 'item.actions': __VLS_118 } = __VLS_89.slots;
        const [{ item }] = __VLS_vSlot(__VLS_118);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        if (__VLS_ctx.canCreate && !item.isDeleted) {
            let __VLS_119;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({
                ...{ 'onClick': {} },
                icon: "mdi-plus",
                variant: "text",
                color: "primary",
                title: "Crear hijo",
            }));
            const __VLS_121 = __VLS_120({
                ...{ 'onClick': {} },
                icon: "mdi-plus",
                variant: "text",
                color: "primary",
                title: "Crear hijo",
            }, ...__VLS_functionalComponentArgsRest(__VLS_120));
            let __VLS_124;
            const __VLS_125 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canCreate && !item.isDeleted))
                            return;
                        __VLS_ctx.openCreateChild(item);
                        // @ts-ignore
                        [canCreate, openCreateChild,];
                    } });
            var __VLS_122;
            var __VLS_123;
        }
        if (__VLS_ctx.canEdit && !item.isDeleted) {
            let __VLS_126;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_127 = __VLS_asFunctionalComponent1(__VLS_126, new __VLS_126({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }));
            const __VLS_128 = __VLS_127({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }, ...__VLS_functionalComponentArgsRest(__VLS_127));
            let __VLS_131;
            const __VLS_132 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit && !item.isDeleted))
                            return;
                        __VLS_ctx.openEdit(item);
                        // @ts-ignore
                        [canEdit, openEdit,];
                    } });
            var __VLS_129;
            var __VLS_130;
        }
        if (__VLS_ctx.canDelete && !item.isDeleted) {
            let __VLS_133;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_135 = __VLS_134({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_134));
            let __VLS_138;
            const __VLS_139 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canDelete && !item.isDeleted))
                            return;
                        __VLS_ctx.openDelete(item);
                        // @ts-ignore
                        [canDelete, openDelete,];
                    } });
            var __VLS_136;
            var __VLS_137;
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_89;
    // @ts-ignore
    [];
    var __VLS_41;
}
let __VLS_140;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
    modelValue: (__VLS_ctx.formDialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 720),
}));
const __VLS_142 = __VLS_141({
    modelValue: (__VLS_ctx.formDialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 720),
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
const { default: __VLS_145 } = __VLS_143.slots;
let __VLS_146;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
    rounded: "xl",
}));
const __VLS_148 = __VLS_147({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
const { default: __VLS_151 } = __VLS_149.slots;
let __VLS_152;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent1(__VLS_152, new __VLS_152({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_154 = __VLS_153({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_157 } = __VLS_155.slots;
(__VLS_ctx.isEditing ? "Editar menu" : (__VLS_ctx.isCreatingChild ? "Crear menu hijo" : "Crear menu padre"));
// @ts-ignore
[formDialog, isDialogFullscreen, isDialogFullscreen, isEditing, isCreatingChild,];
var __VLS_155;
let __VLS_158;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent1(__VLS_158, new __VLS_158({}));
const __VLS_160 = __VLS_159({}, ...__VLS_functionalComponentArgsRest(__VLS_159));
let __VLS_163;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_164 = __VLS_asFunctionalComponent1(__VLS_163, new __VLS_163({
    ...{ class: "pt-4" },
}));
const __VLS_165 = __VLS_164({
    ...{ class: "pt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_164));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
const { default: __VLS_168 } = __VLS_166.slots;
let __VLS_169;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent1(__VLS_169, new __VLS_169({
    dense: true,
}));
const __VLS_171 = __VLS_170({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
const { default: __VLS_174 } = __VLS_172.slots;
let __VLS_175;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_176 = __VLS_asFunctionalComponent1(__VLS_175, new __VLS_175({
    cols: "12",
    md: "6",
}));
const __VLS_177 = __VLS_176({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_176));
const { default: __VLS_180 } = __VLS_178.slots;
let __VLS_181;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_182 = __VLS_asFunctionalComponent1(__VLS_181, new __VLS_181({
    modelValue: (__VLS_ctx.form.nombre),
    label: "Nombre",
    variant: "outlined",
}));
const __VLS_183 = __VLS_182({
    modelValue: (__VLS_ctx.form.nombre),
    label: "Nombre",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_182));
// @ts-ignore
[form,];
var __VLS_178;
let __VLS_186;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent1(__VLS_186, new __VLS_186({
    cols: "12",
    md: "6",
}));
const __VLS_188 = __VLS_187({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
const { default: __VLS_191 } = __VLS_189.slots;
let __VLS_192;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent1(__VLS_192, new __VLS_192({
    modelValue: (__VLS_ctx.form.menuPosition),
    label: "Posicion",
    variant: "outlined",
}));
const __VLS_194 = __VLS_193({
    modelValue: (__VLS_ctx.form.menuPosition),
    label: "Posicion",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
// @ts-ignore
[form,];
var __VLS_189;
let __VLS_197;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent1(__VLS_197, new __VLS_197({
    cols: "12",
    md: "6",
}));
const __VLS_199 = __VLS_198({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
const { default: __VLS_202 } = __VLS_200.slots;
let __VLS_203;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_204 = __VLS_asFunctionalComponent1(__VLS_203, new __VLS_203({
    modelValue: (__VLS_ctx.form.status),
    items: (['ACTIVE', 'INACTIVE']),
    label: "Estado",
    variant: "outlined",
}));
const __VLS_205 = __VLS_204({
    modelValue: (__VLS_ctx.form.status),
    items: (['ACTIVE', 'INACTIVE']),
    label: "Estado",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_204));
// @ts-ignore
[form,];
var __VLS_200;
let __VLS_208;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent1(__VLS_208, new __VLS_208({
    cols: "12",
    md: "6",
}));
const __VLS_210 = __VLS_209({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_209));
const { default: __VLS_213 } = __VLS_211.slots;
let __VLS_214;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField | typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_215 = __VLS_asFunctionalComponent1(__VLS_214, new __VLS_214({
    modelValue: (__VLS_ctx.form.icon),
    label: "Icono",
    variant: "outlined",
}));
const __VLS_216 = __VLS_215({
    modelValue: (__VLS_ctx.form.icon),
    label: "Icono",
    variant: "outlined",
}, ...__VLS_functionalComponentArgsRest(__VLS_215));
const { default: __VLS_219 } = __VLS_217.slots;
{
    const { 'prepend-inner': __VLS_220 } = __VLS_217.slots;
    let __VLS_221;
    /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
    vIcon;
    // @ts-ignore
    const __VLS_222 = __VLS_asFunctionalComponent1(__VLS_221, new __VLS_221({
        icon: (__VLS_ctx.resolveIcon(__VLS_ctx.form.icon)),
    }));
    const __VLS_223 = __VLS_222({
        icon: (__VLS_ctx.resolveIcon(__VLS_ctx.form.icon)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_222));
    // @ts-ignore
    [resolveIcon, form, form,];
}
// @ts-ignore
[];
var __VLS_217;
// @ts-ignore
[];
var __VLS_211;
let __VLS_226;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent1(__VLS_226, new __VLS_226({
    cols: "12",
    md: "6",
}));
const __VLS_228 = __VLS_227({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
const { default: __VLS_231 } = __VLS_229.slots;
let __VLS_232;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent1(__VLS_232, new __VLS_232({
    modelValue: (__VLS_ctx.form.urlComponent),
    items: (__VLS_ctx.componentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Vista del front",
    variant: "outlined",
    clearable: true,
    noDataText: "No hay vistas disponibles",
    hint: (__VLS_ctx.selectedComponentHint),
    persistentHint: true,
}));
const __VLS_234 = __VLS_233({
    modelValue: (__VLS_ctx.form.urlComponent),
    items: (__VLS_ctx.componentOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Vista del front",
    variant: "outlined",
    clearable: true,
    noDataText: "No hay vistas disponibles",
    hint: (__VLS_ctx.selectedComponentHint),
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
// @ts-ignore
[form, componentOptions, selectedComponentHint,];
var __VLS_229;
let __VLS_237;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent1(__VLS_237, new __VLS_237({
    cols: "12",
    md: "6",
}));
const __VLS_239 = __VLS_238({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
const { default: __VLS_242 } = __VLS_240.slots;
let __VLS_243;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent1(__VLS_243, new __VLS_243({
    modelValue: (__VLS_ctx.parentName),
    label: "Menu padre",
    variant: "outlined",
    readonly: true,
    hint: "Vacio = menu padre",
    persistentHint: true,
}));
const __VLS_245 = __VLS_244({
    modelValue: (__VLS_ctx.parentName),
    label: "Menu padre",
    variant: "outlined",
    readonly: true,
    hint: "Vacio = menu padre",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
// @ts-ignore
[parentName,];
var __VLS_240;
let __VLS_248;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent1(__VLS_248, new __VLS_248({
    cols: "12",
}));
const __VLS_250 = __VLS_249({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
const { default: __VLS_253 } = __VLS_251.slots;
let __VLS_254;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_255 = __VLS_asFunctionalComponent1(__VLS_254, new __VLS_254({
    modelValue: (__VLS_ctx.form.descripcion),
    label: "Descripcion",
    variant: "outlined",
    rows: "2",
}));
const __VLS_256 = __VLS_255({
    modelValue: (__VLS_ctx.form.descripcion),
    label: "Descripcion",
    variant: "outlined",
    rows: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_255));
// @ts-ignore
[form,];
var __VLS_251;
// @ts-ignore
[];
var __VLS_172;
// @ts-ignore
[];
var __VLS_166;
let __VLS_259;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_260 = __VLS_asFunctionalComponent1(__VLS_259, new __VLS_259({}));
const __VLS_261 = __VLS_260({}, ...__VLS_functionalComponentArgsRest(__VLS_260));
let __VLS_264;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent1(__VLS_264, new __VLS_264({
    ...{ class: "pa-4" },
}));
const __VLS_266 = __VLS_265({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_269 } = __VLS_267.slots;
let __VLS_270;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_271 = __VLS_asFunctionalComponent1(__VLS_270, new __VLS_270({}));
const __VLS_272 = __VLS_271({}, ...__VLS_functionalComponentArgsRest(__VLS_271));
let __VLS_275;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_277 = __VLS_276({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_276));
let __VLS_280;
const __VLS_281 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.formDialog = false;
            // @ts-ignore
            [formDialog,];
        } });
const { default: __VLS_282 } = __VLS_278.slots;
// @ts-ignore
[];
var __VLS_278;
var __VLS_279;
let __VLS_283;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_284 = __VLS_asFunctionalComponent1(__VLS_283, new __VLS_283({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.busy),
}));
const __VLS_285 = __VLS_284({
    ...{ 'onClick': {} },
    color: "primary",
    loading: (__VLS_ctx.busy),
}, ...__VLS_functionalComponentArgsRest(__VLS_284));
let __VLS_288;
const __VLS_289 = ({ click: {} },
    { onClick: (__VLS_ctx.onSubmitForm) });
const { default: __VLS_290 } = __VLS_286.slots;
// @ts-ignore
[busy, onSubmitForm,];
var __VLS_286;
var __VLS_287;
// @ts-ignore
[];
var __VLS_267;
// @ts-ignore
[];
var __VLS_149;
// @ts-ignore
[];
var __VLS_143;
let __VLS_291;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_292 = __VLS_asFunctionalComponent1(__VLS_291, new __VLS_291({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}));
const __VLS_293 = __VLS_292({
    modelValue: (__VLS_ctx.deleteDialog),
    fullscreen: (__VLS_ctx.isDeleteDialogFullscreen),
    maxWidth: (__VLS_ctx.isDeleteDialogFullscreen ? undefined : 500),
}, ...__VLS_functionalComponentArgsRest(__VLS_292));
const { default: __VLS_296 } = __VLS_294.slots;
let __VLS_297;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent1(__VLS_297, new __VLS_297({
    rounded: "xl",
}));
const __VLS_299 = __VLS_298({
    rounded: "xl",
}, ...__VLS_functionalComponentArgsRest(__VLS_298));
const { default: __VLS_302 } = __VLS_300.slots;
let __VLS_303;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_304 = __VLS_asFunctionalComponent1(__VLS_303, new __VLS_303({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}));
const __VLS_305 = __VLS_304({
    ...{ class: "text-subtitle-1 font-weight-bold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_304));
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
const { default: __VLS_308 } = __VLS_306.slots;
// @ts-ignore
[deleteDialog, isDeleteDialogFullscreen, isDeleteDialogFullscreen,];
var __VLS_306;
let __VLS_309;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_310 = __VLS_asFunctionalComponent1(__VLS_309, new __VLS_309({}));
const __VLS_311 = __VLS_310({}, ...__VLS_functionalComponentArgsRest(__VLS_310));
const { default: __VLS_314 } = __VLS_312.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.selected?.nombre);
// @ts-ignore
[selected,];
var __VLS_312;
let __VLS_315;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_316 = __VLS_asFunctionalComponent1(__VLS_315, new __VLS_315({}));
const __VLS_317 = __VLS_316({}, ...__VLS_functionalComponentArgsRest(__VLS_316));
const { default: __VLS_320 } = __VLS_318.slots;
let __VLS_321;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent1(__VLS_321, new __VLS_321({}));
const __VLS_323 = __VLS_322({}, ...__VLS_functionalComponentArgsRest(__VLS_322));
let __VLS_326;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_327 = __VLS_asFunctionalComponent1(__VLS_326, new __VLS_326({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_328 = __VLS_327({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_327));
let __VLS_331;
const __VLS_332 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.deleteDialog = false;
            // @ts-ignore
            [deleteDialog,];
        } });
const { default: __VLS_333 } = __VLS_329.slots;
// @ts-ignore
[];
var __VLS_329;
var __VLS_330;
let __VLS_334;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_335 = __VLS_asFunctionalComponent1(__VLS_334, new __VLS_334({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.busy),
}));
const __VLS_336 = __VLS_335({
    ...{ 'onClick': {} },
    color: "error",
    loading: (__VLS_ctx.busy),
}, ...__VLS_functionalComponentArgsRest(__VLS_335));
let __VLS_339;
const __VLS_340 = ({ click: {} },
    { onClick: (__VLS_ctx.onConfirmDelete) });
const { default: __VLS_341 } = __VLS_337.slots;
// @ts-ignore
[busy, onConfirmDelete,];
var __VLS_337;
var __VLS_338;
// @ts-ignore
[];
var __VLS_318;
// @ts-ignore
[];
var __VLS_300;
// @ts-ignore
[];
var __VLS_294;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref } from "vue";
import { useRolesStore } from "@/app/stores/roles.store";
import { useMenuRolesStore } from "@/app/stores/menu-roles.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useUiStore } from "@/app/stores/ui.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { createLogTransact } from "@/app/services/log-transacts.service";
import RoleFormDialog from "@/components/roles/RoleFormDialog.vue";
import RoleDeleteDialog from "@/components/roles/RoleDeleteDialog.vue";
const roles = useRolesStore();
const menuRoles = useMenuRolesStore();
const menuStore = useMenuStore(); // menú del usuario (tree/by-user)
const auth = useAuthStore();
const ui = useUiStore();
const itemsPerPage = ref(10);
const headers = computed(() => [
    { title: "Nombre", key: "nombre" },
    { title: "Descripción", key: "descripcion" },
    { title: "Estado", key: "status" },
    ...(canEdit.value || canDelete.value
        ? [{ title: "Acciones", key: "actions", sortable: false }]
        : []),
]);
const statusItems = [
    { title: "Todos", value: "ALL" },
    { title: "ACTIVE", value: "ACTIVE" },
    { title: "INACTIVE", value: "INACTIVE" },
];
// permisos del módulo Roles (acepta alias de urlComponent)
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Rol", "Roles"]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const formDialog = ref(false);
const deleteDialog = ref(false);
const selectedRole = ref(null);
const busy = ref(false);
const formError = ref(null);
onMounted(async () => {
    if (!canRead.value)
        return;
    await roles.fetchAll(false);
});
function openCreate() {
    selectedRole.value = null;
    formError.value = null;
    formDialog.value = true;
}
async function openEdit(r) {
    selectedRole.value = r;
    formError.value = null;
    // el RoleFormDialog al abrir carga menuRoles.fetchByRole(r.id)
    formDialog.value = true;
}
function openDelete(r) {
    selectedRole.value = r;
    formError.value = null;
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
        ? `Error técnico, información enviada al equipo técnico TICKET: ${ticket}`
        : "Error técnico, información enviada al equipo técnico");
}
async function onSubmitRole(payload) {
    if (busy.value)
        return;
    busy.value = true;
    formError.value = null;
    try {
        let roleId;
        if (!selectedRole.value) {
            const created = await roles.createRole({
                nombre: payload.nombre,
                descripcion: payload.descripcion,
                status: payload.status,
                reportes: payload.reportes,
            });
            roleId = created.id;
        }
        else {
            roleId = selectedRole.value.id;
            await roles.updateRole(roleId, {
                nombre: payload.nombre,
                descripcion: payload.descripcion,
                status: payload.status,
                reportes: payload.reportes,
                createdBy: currentUserName(),
            });
        }
        // 🔥 SINCRONIZACIÓN UNA SOLA VEZ
        await menuRoles.sync(roleId, currentUserName());
        ui.success("Guardado con éxito");
        formDialog.value = false;
        // refrescar listado una sola vez
        await roles.fetchAll(false);
    }
    catch (e) {
        const details = `Roles module error\n` +
            `action=${selectedRole.value ? "UPDATE" : "CREATE"}\n` +
            `roleId=${selectedRole.value?.id ?? "new"}\n` +
            `payload=${JSON.stringify(payload)}\n` +
            `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;
        await logAndShowTechnicalError(selectedRole.value ? "ROLE_UPDATE" : "ROLE_CREATE", details);
    }
    finally {
        busy.value = false;
    }
}
async function onConfirmDelete() {
    if (!selectedRole.value)
        return;
    busy.value = true;
    formError.value = null;
    try {
        await roles.deleteRole(selectedRole.value.id);
        ui.success("Eliminado con éxito");
        deleteDialog.value = false;
        // NOTA: el store de roles al eliminar hace un fetchAll() para refrescar la lista
        await roles.fetchAll(false);
    }
    catch (e) {
        const details = `Roles module error\n` +
            `action=DELETE\n` +
            `roleId=${selectedRole.value.id}\n` +
            `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;
        await logAndShowTechnicalError("ROLE_DELETE", details);
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
/** @type {__VLS_StyleScopedClasses['roles-table']} */ ;
/** @type {__VLS_StyleScopedClasses['roles-table']} */ ;
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
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_8 = __VLS_7({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_11 } = __VLS_9.slots;
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
        let __VLS_12;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-plus",
        }));
        const __VLS_14 = __VLS_13({
            ...{ 'onClick': {} },
            color: "primary",
            prependIcon: "mdi-plus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        let __VLS_17;
        const __VLS_18 = ({ click: {} },
            { onClick: (__VLS_ctx.openCreate) });
        const { default: __VLS_19 } = __VLS_15.slots;
        // @ts-ignore
        [canCreate, openCreate,];
        var __VLS_15;
        var __VLS_16;
    }
    let __VLS_20;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
        ...{ class: "mb-2" },
        dense: true,
    }));
    const __VLS_22 = __VLS_21({
        ...{ class: "mb-2" },
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    const { default: __VLS_25 } = __VLS_23.slots;
    let __VLS_26;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
        cols: "12",
        md: "6",
    }));
    const __VLS_28 = __VLS_27({
        cols: "12",
        md: "6",
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    const { default: __VLS_31 } = __VLS_29.slots;
    let __VLS_32;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
        modelValue: (__VLS_ctx.roles.search),
        label: "Buscar (nombre, descripción)",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }));
    const __VLS_34 = __VLS_33({
        modelValue: (__VLS_ctx.roles.search),
        label: "Buscar (nombre, descripción)",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    // @ts-ignore
    [roles,];
    var __VLS_29;
    let __VLS_37;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
        cols: "12",
        md: "3",
    }));
    const __VLS_39 = __VLS_38({
        cols: "12",
        md: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    const { default: __VLS_42 } = __VLS_40.slots;
    let __VLS_43;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
        modelValue: (__VLS_ctx.roles.statusFilter),
        items: (__VLS_ctx.statusItems),
        itemTitle: "title",
        itemValue: "value",
        label: "Estado",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_45 = __VLS_44({
        modelValue: (__VLS_ctx.roles.statusFilter),
        items: (__VLS_ctx.statusItems),
        itemTitle: "title",
        itemValue: "value",
        label: "Estado",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    // @ts-ignore
    [roles, statusItems,];
    var __VLS_40;
    let __VLS_48;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
        cols: "12",
        md: "3",
    }));
    const __VLS_50 = __VLS_49({
        cols: "12",
        md: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    const { default: __VLS_53 } = __VLS_51.slots;
    let __VLS_54;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
        modelValue: (__VLS_ctx.itemsPerPage),
        items: ([5, 10, 20, 50]),
        label: "Por página",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_56 = __VLS_55({
        modelValue: (__VLS_ctx.itemsPerPage),
        items: ([5, 10, 20, 50]),
        label: "Por página",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    // @ts-ignore
    [itemsPerPage,];
    var __VLS_51;
    // @ts-ignore
    [];
    var __VLS_23;
    if (__VLS_ctx.roles.error) {
        let __VLS_59;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }));
        const __VLS_61 = __VLS_60({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_64 } = __VLS_62.slots;
        (__VLS_ctx.roles.error);
        // @ts-ignore
        [roles, roles,];
        var __VLS_62;
    }
    let __VLS_65;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.roles.filtered),
        loading: (__VLS_ctx.roles.loading),
        loadingText: "Obteniendo roles...",
        itemsPerPage: (__VLS_ctx.itemsPerPage),
        ...{ class: "elevation-0 enterprise-table roles-table" },
    }));
    const __VLS_67 = __VLS_66({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.roles.filtered),
        loading: (__VLS_ctx.roles.loading),
        loadingText: "Obteniendo roles...",
        itemsPerPage: (__VLS_ctx.itemsPerPage),
        ...{ class: "elevation-0 enterprise-table roles-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['roles-table']} */ ;
    const { default: __VLS_70 } = __VLS_68.slots;
    {
        const { 'item.status': __VLS_71 } = __VLS_68.slots;
        const [{ item }] = __VLS_vSlot(__VLS_71);
        let __VLS_72;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
            size: "small",
            color: (item.status === 'ACTIVE' ? 'green' : 'grey'),
            variant: "tonal",
        }));
        const __VLS_74 = __VLS_73({
            size: "small",
            color: (item.status === 'ACTIVE' ? 'green' : 'grey'),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        const { default: __VLS_77 } = __VLS_75.slots;
        (item.status);
        // @ts-ignore
        [roles, roles, itemsPerPage, headers,];
        var __VLS_75;
        // @ts-ignore
        [];
    }
    {
        const { 'item.actions': __VLS_78 } = __VLS_68.slots;
        const [{ item }] = __VLS_vSlot(__VLS_78);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        if (__VLS_ctx.canEdit) {
            let __VLS_79;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }));
            const __VLS_81 = __VLS_80({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }, ...__VLS_functionalComponentArgsRest(__VLS_80));
            let __VLS_84;
            const __VLS_85 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit))
                            return;
                        __VLS_ctx.openEdit(item);
                        // @ts-ignore
                        [canEdit, openEdit,];
                    } });
            var __VLS_82;
            var __VLS_83;
        }
        if (__VLS_ctx.canDelete) {
            let __VLS_86;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_88 = __VLS_87({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_87));
            let __VLS_91;
            const __VLS_92 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canDelete))
                            return;
                        __VLS_ctx.openDelete(item);
                        // @ts-ignore
                        [canDelete, openDelete,];
                    } });
            var __VLS_89;
            var __VLS_90;
        }
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_68;
    // @ts-ignore
    [];
    var __VLS_9;
}
const __VLS_93 = RoleFormDialog;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
    ...{ 'onSubmit': {} },
    modelValue: (__VLS_ctx.formDialog),
    role: (__VLS_ctx.selectedRole),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.formError),
}));
const __VLS_95 = __VLS_94({
    ...{ 'onSubmit': {} },
    modelValue: (__VLS_ctx.formDialog),
    role: (__VLS_ctx.selectedRole),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.formError),
}, ...__VLS_functionalComponentArgsRest(__VLS_94));
let __VLS_98;
const __VLS_99 = ({ submit: {} },
    { onSubmit: (__VLS_ctx.onSubmitRole) });
var __VLS_96;
var __VLS_97;
const __VLS_100 = RoleDeleteDialog;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent1(__VLS_100, new __VLS_100({
    ...{ 'onConfirm': {} },
    modelValue: (__VLS_ctx.deleteDialog),
    role: (__VLS_ctx.selectedRole),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.formError),
}));
const __VLS_102 = __VLS_101({
    ...{ 'onConfirm': {} },
    modelValue: (__VLS_ctx.deleteDialog),
    role: (__VLS_ctx.selectedRole),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.formError),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
let __VLS_105;
const __VLS_106 = ({ confirm: {} },
    { onConfirm: (__VLS_ctx.onConfirmDelete) });
var __VLS_103;
var __VLS_104;
// @ts-ignore
[formDialog, selectedRole, selectedRole, busy, busy, formError, formError, onSubmitRole, deleteDialog, onConfirmDelete,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

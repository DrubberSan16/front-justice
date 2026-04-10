/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref } from "vue";
import { useUsersStore } from "@/app/stores/users.store";
import { useRolesStore } from "@/app/stores/roles.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useAuthStore } from "@/app/stores/auth.store";
import { useUiStore } from "@/app/stores/ui.store";
import { useMenuUsersProfileStore } from "@/app/stores/menu-users-profile.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";
import { createLogTransact } from "@/app/services/log-transacts.service";
import UserFormDialog from "@/components/users/UserFormDialog.vue";
import UserDeleteDialog from "@/components/users/UserDeleteDialog.vue";
const users = useUsersStore();
const roles = useRolesStore();
const menuStore = useMenuStore();
const auth = useAuthStore();
const ui = useUiStore();
const menuUsersProfile = useMenuUsersProfileStore();
const itemsPerPage = ref(10);
const headers = computed(() => [
    { title: "Usuario", key: "nameUser" },
    { title: "Nombre", key: "nameSurname" },
    { title: "Email", key: "email" },
    { title: "Rol", key: "role" },
    { title: "Estado", key: "status" },
    { title: "Eliminado", key: "isDeleted" },
    ...(canEdit.value || canDelete.value
        ? [{ title: "Acciones", key: "actions", sortable: false }]
        : []),
]);
const statusItems = [
    { title: "Todos", value: "ALL" },
    { title: "ACTIVE", value: "ACTIVE" },
    { title: "INACTIVE", value: "INACTIVE" },
];
const roleItems = computed(() => {
    const base = [{ title: "Todos", value: "ALL" }];
    const list = roles.items.map((r) => ({ title: r.nombre, value: r.id }));
    return base.concat(list);
});
// PERMISOS según menú (acepta alias de urlComponent)
const perms = computed(() => getPermissionsForAnyComponent(menuStore.tree, ["Usuarios", "Usuario"]));
const canRead = computed(() => perms.value.isReaded);
const canCreate = computed(() => perms.value.isCreated);
const canEdit = computed(() => perms.value.isEdited);
const canDelete = computed(() => perms.value.permitDeleted);
const formDialog = ref(false);
const deleteDialog = ref(false);
const selectedUser = ref(null);
const busy = ref(false);
onMounted(async () => {
    if (!canRead.value)
        return;
    if (!roles.items.length) {
        try {
            await roles.fetchAll(false);
        }
        catch { }
    }
    if (!users.items.length) {
        await users.fetchAll();
    }
});
function openCreate() {
    selectedUser.value = null;
    formDialog.value = true;
}
function openEdit(u) {
    selectedUser.value = u;
    formDialog.value = true;
}
function openDelete(u) {
    selectedUser.value = u;
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
        ? `Error técnico, información enviada al equipo de soporte TICKET: ${ticket}`
        : "Error técnico, enviar detalles al equipo de soporte");
}
async function onSubmitForm(payload) {
    if (busy.value)
        return;
    busy.value = true;
    try {
        if (!selectedUser.value) {
            // =========================
            // CREATE USER
            // =========================
            const created = await users.createUser({
                nameUser: payload.nameUser,
                passUser: payload.passUser,
                nameSurname: payload.nameSurname,
                roleId: payload.roleId,
                email: payload.email,
                status: payload.status,
                dateBirthday: payload.dateBirthday,
                reportes: payload.reportes,
            });
            // 🔥 IMPORTANTE:
            // Crear perfil menu-users desde los drafts precargados (rol)
            await menuUsersProfile.createProfileForUser(created.id, currentUserName());
            ui.success("Guardado con éxito");
        }
        else {
            // =========================
            // UPDATE USER
            // =========================
            const updatePayload = {
                nameUser: payload.nameUser,
                nameSurname: payload.nameSurname,
                roleId: payload.roleId,
                email: payload.email,
                status: payload.status,
                dateBirthday: payload.dateBirthday,
                reportes: payload.reportes,
            };
            if (payload.passUser?.trim()) {
                updatePayload.passUser = payload.passUser;
            }
            await users.updateUser(selectedUser.value.id, updatePayload);
            // 🔥🔥🔥 AQUI ESTABA EL PROBLEMA
            // Sincronizar menu-users (POST/PATCH/INACTIVE según cambios)
            await menuUsersProfile.sync(selectedUser.value.id, currentUserName());
            ui.success("Guardado con éxito");
        }
        formDialog.value = false;
        // refrescar lista
        await users.fetchAll();
    }
    catch (e) {
        const details = `Users module error\n` +
            `action=${selectedUser.value ? "UPDATE" : "CREATE"}\n` +
            `userId=${selectedUser.value?.id ?? "new"}\n` +
            `payload=${JSON.stringify({
                ...payload,
                passUser: payload.passUser ? "***" : "",
            })}\n` +
            `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;
        await logAndShowTechnicalError(selectedUser.value ? "USER_UPDATE" : "USER_CREATE", details);
    }
    finally {
        busy.value = false;
    }
}
async function onConfirmDelete() {
    if (!selectedUser.value)
        return;
    if (busy.value)
        return;
    busy.value = true;
    try {
        await users.deleteUser(selectedUser.value.id);
        deleteDialog.value = false;
        ui.success("Eliminado con éxito");
    }
    catch (e) {
        const details = `Users module error\n` +
            `action=DELETE\n` +
            `userId=${selectedUser.value.id}\n` +
            `apiError=${e?.response?.data?.message || e?.message || "unknown"}`;
        await logAndShowTechnicalError("USER_DELETE", details);
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
/** @type {__VLS_StyleScopedClasses['users-table']} */ ;
/** @type {__VLS_StyleScopedClasses['users-table']} */ ;
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
        md: "5",
    }));
    const __VLS_28 = __VLS_27({
        cols: "12",
        md: "5",
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    const { default: __VLS_31 } = __VLS_29.slots;
    let __VLS_32;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
        modelValue: (__VLS_ctx.users.search),
        label: "Buscar (usuario, nombre, email, rol)",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }));
    const __VLS_34 = __VLS_33({
        modelValue: (__VLS_ctx.users.search),
        label: "Buscar (usuario, nombre, email, rol)",
        variant: "outlined",
        density: "compact",
        prependInnerIcon: "mdi-magnify",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    // @ts-ignore
    [users,];
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
        modelValue: (__VLS_ctx.users.statusFilter),
        items: (__VLS_ctx.statusItems),
        itemTitle: "title",
        itemValue: "value",
        label: "Estado",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_45 = __VLS_44({
        modelValue: (__VLS_ctx.users.statusFilter),
        items: (__VLS_ctx.statusItems),
        itemTitle: "title",
        itemValue: "value",
        label: "Estado",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    // @ts-ignore
    [users, statusItems,];
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
        modelValue: (__VLS_ctx.users.roleFilter),
        items: (__VLS_ctx.roleItems),
        itemTitle: "title",
        itemValue: "value",
        label: "Rol",
        variant: "outlined",
        density: "compact",
        loading: (__VLS_ctx.roles.loading),
    }));
    const __VLS_56 = __VLS_55({
        modelValue: (__VLS_ctx.users.roleFilter),
        items: (__VLS_ctx.roleItems),
        itemTitle: "title",
        itemValue: "value",
        label: "Rol",
        variant: "outlined",
        density: "compact",
        loading: (__VLS_ctx.roles.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    // @ts-ignore
    [users, roleItems, roles,];
    var __VLS_51;
    let __VLS_59;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
        cols: "12",
        md: "1",
        ...{ class: "d-flex align-center" },
    }));
    const __VLS_61 = __VLS_60({
        cols: "12",
        md: "1",
        ...{ class: "d-flex align-center" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
    const { default: __VLS_64 } = __VLS_62.slots;
    let __VLS_65;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
        modelValue: (__VLS_ctx.users.includeDeleted),
        label: "Eliminados",
        density: "compact",
    }));
    const __VLS_67 = __VLS_66({
        modelValue: (__VLS_ctx.users.includeDeleted),
        label: "Eliminados",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
    // @ts-ignore
    [users,];
    var __VLS_62;
    // @ts-ignore
    [];
    var __VLS_23;
    if (__VLS_ctx.users.error) {
        let __VLS_70;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }));
        const __VLS_72 = __VLS_71({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_75 } = __VLS_73.slots;
        (__VLS_ctx.users.error);
        // @ts-ignore
        [users, users,];
        var __VLS_73;
    }
    let __VLS_76;
    /** @ts-ignore @type {typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable | typeof __VLS_components.vDataTable | typeof __VLS_components.VDataTable} */
    vDataTable;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.users.filtered),
        loading: (__VLS_ctx.users.loading),
        loadingText: "Obteniendo usuarios...",
        itemsPerPage: (__VLS_ctx.itemsPerPage),
        ...{ class: "elevation-0 enterprise-table users-table" },
    }));
    const __VLS_78 = __VLS_77({
        headers: (__VLS_ctx.headers),
        items: (__VLS_ctx.users.filtered),
        loading: (__VLS_ctx.users.loading),
        loadingText: "Obteniendo usuarios...",
        itemsPerPage: (__VLS_ctx.itemsPerPage),
        ...{ class: "elevation-0 enterprise-table users-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    /** @type {__VLS_StyleScopedClasses['elevation-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-table']} */ ;
    /** @type {__VLS_StyleScopedClasses['users-table']} */ ;
    const { default: __VLS_81 } = __VLS_79.slots;
    {
        const { 'item.status': __VLS_82 } = __VLS_79.slots;
        const [{ item }] = __VLS_vSlot(__VLS_82);
        let __VLS_83;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
            size: "small",
            color: (item.status === 'ACTIVE' ? 'green' : 'grey'),
            variant: "tonal",
        }));
        const __VLS_85 = __VLS_84({
            size: "small",
            color: (item.status === 'ACTIVE' ? 'green' : 'grey'),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        const { default: __VLS_88 } = __VLS_86.slots;
        (item.status);
        // @ts-ignore
        [users, users, headers, itemsPerPage,];
        var __VLS_86;
        // @ts-ignore
        [];
    }
    {
        const { 'item.isDeleted': __VLS_89 } = __VLS_79.slots;
        const [{ item }] = __VLS_vSlot(__VLS_89);
        let __VLS_90;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
            size: "small",
            color: (item.isDeleted ? 'red' : 'green'),
            variant: "tonal",
        }));
        const __VLS_92 = __VLS_91({
            size: "small",
            color: (item.isDeleted ? 'red' : 'green'),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        const { default: __VLS_95 } = __VLS_93.slots;
        (item.isDeleted ? "Sí" : "No");
        // @ts-ignore
        [];
        var __VLS_93;
        // @ts-ignore
        [];
    }
    {
        const { 'item.role': __VLS_96 } = __VLS_79.slots;
        const [{ item }] = __VLS_vSlot(__VLS_96);
        (__VLS_ctx.roles.getRoleName(item.roleId));
        // @ts-ignore
        [roles,];
    }
    {
        const { 'item.actions': __VLS_97 } = __VLS_79.slots;
        const [{ item }] = __VLS_vSlot(__VLS_97);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        if (__VLS_ctx.canEdit && !item.isDeleted) {
            let __VLS_98;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_99 = __VLS_asFunctionalComponent1(__VLS_98, new __VLS_98({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }));
            const __VLS_100 = __VLS_99({
                ...{ 'onClick': {} },
                icon: "mdi-pencil",
                variant: "text",
            }, ...__VLS_functionalComponentArgsRest(__VLS_99));
            let __VLS_103;
            const __VLS_104 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canEdit && !item.isDeleted))
                            return;
                        __VLS_ctx.openEdit(item);
                        // @ts-ignore
                        [canEdit, openEdit,];
                    } });
            var __VLS_101;
            var __VLS_102;
        }
        if (__VLS_ctx.canDelete && !item.isDeleted) {
            let __VLS_105;
            /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
            vBtn;
            // @ts-ignore
            const __VLS_106 = __VLS_asFunctionalComponent1(__VLS_105, new __VLS_105({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }));
            const __VLS_107 = __VLS_106({
                ...{ 'onClick': {} },
                icon: "mdi-delete",
                variant: "text",
                color: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_106));
            let __VLS_110;
            const __VLS_111 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.canRead))
                            return;
                        if (!(__VLS_ctx.canDelete && !item.isDeleted))
                            return;
                        __VLS_ctx.openDelete(item);
                        // @ts-ignore
                        [canDelete, openDelete,];
                    } });
            var __VLS_108;
            var __VLS_109;
        }
        // @ts-ignore
        [];
    }
    {
        const { bottom: __VLS_112 } = __VLS_79.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-header px-2 py-2" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        (__VLS_ctx.users.filtered.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "responsive-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['responsive-actions']} */ ;
        let __VLS_113;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
            modelValue: (__VLS_ctx.itemsPerPage),
            items: ([5, 10, 20, 50]),
            label: "Por página",
            variant: "outlined",
            density: "compact",
            ...{ style: {} },
        }));
        const __VLS_115 = __VLS_114({
            modelValue: (__VLS_ctx.itemsPerPage),
            items: ([5, 10, 20, 50]),
            label: "Por página",
            variant: "outlined",
            density: "compact",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_114));
        // @ts-ignore
        [users, itemsPerPage,];
    }
    // @ts-ignore
    [];
    var __VLS_79;
    // @ts-ignore
    [];
    var __VLS_9;
}
const __VLS_118 = UserFormDialog;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent1(__VLS_118, new __VLS_118({
    ...{ 'onSubmit': {} },
    modelValue: (__VLS_ctx.formDialog),
    user: (__VLS_ctx.selectedUser),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.users.error),
}));
const __VLS_120 = __VLS_119({
    ...{ 'onSubmit': {} },
    modelValue: (__VLS_ctx.formDialog),
    user: (__VLS_ctx.selectedUser),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.users.error),
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
let __VLS_123;
const __VLS_124 = ({ submit: {} },
    { onSubmit: (__VLS_ctx.onSubmitForm) });
var __VLS_121;
var __VLS_122;
const __VLS_125 = UserDeleteDialog;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent1(__VLS_125, new __VLS_125({
    ...{ 'onConfirm': {} },
    modelValue: (__VLS_ctx.deleteDialog),
    user: (__VLS_ctx.selectedUser),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.users.error),
}));
const __VLS_127 = __VLS_126({
    ...{ 'onConfirm': {} },
    modelValue: (__VLS_ctx.deleteDialog),
    user: (__VLS_ctx.selectedUser),
    loading: (__VLS_ctx.busy),
    error: (__VLS_ctx.users.error),
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
let __VLS_130;
const __VLS_131 = ({ confirm: {} },
    { onConfirm: (__VLS_ctx.onConfirmDelete) });
var __VLS_128;
var __VLS_129;
// @ts-ignore
[users, users, formDialog, selectedUser, selectedUser, busy, busy, onSubmitForm, deleteDialog, onConfirmDelete,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

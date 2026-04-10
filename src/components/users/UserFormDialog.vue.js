/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, reactive, watch, ref } from "vue";
import { useDisplay } from "vuetify";
import { useRolesStore } from "@/app/stores/roles.store";
import { useMenusFullStore } from "@/app/stores/menus-full.store";
import { useMenuUsersProfileStore } from "@/app/stores/menu-users-profile.store";
import { REPORT_ACCESS_OPTIONS, normalizeReportAccess } from "@/app/config/report-access";
import { fetchMenuRolesByRole } from "@/app/services/menu-roles.service";
import MenuPermissionsCascade from "@/components/roles/MenuPermissionsCascade.vue";
const props = defineProps();
const emit = defineEmits();
const rolesStore = useRolesStore();
const menusFull = useMenusFullStore();
const menuUsersProfile = useMenuUsersProfileStore();
const { mdAndDown } = useDisplay();
const model = computed({
    get: () => props.modelValue,
    set: (v) => emit("update:modelValue", v),
});
const isEdit = computed(() => !!props.user?.id);
const isDialogFullscreen = computed(() => mdAndDown.value);
const statusItems = [
    { title: "ACTIVE", value: "ACTIVE" },
    { title: "INACTIVE", value: "INACTIVE" },
];
const roleItems = computed(() => rolesStore.items.map((r) => ({ title: r.nombre, value: r.id })));
const rolesLoading = computed(() => rolesStore.loading);
const rolesError = computed(() => rolesStore.error);
const loading = computed(() => props.loading ?? false);
const error = computed(() => props.error ?? null);
const reportAccessOptions = REPORT_ACCESS_OPTIONS;
const roleProfileLoading = ref(false);
const roleProfileError = ref(null);
const form = reactive({
    nameUser: "",
    passUser: "",
    nameSurname: "",
    roleId: "",
    email: "",
    status: "ACTIVE",
    dateBirthday: "",
    reportes: [],
});
function roleDefaultReportes(roleId) {
    const role = rolesStore.items.find((item) => item.id === roleId);
    return normalizeReportAccess(role?.reportes);
}
/** Precarga menú/permiso desde rol (solo CREATE) */
async function preloadFromRole(roleId) {
    if (!roleId || isEdit.value)
        return;
    roleProfileLoading.value = true;
    roleProfileError.value = null;
    try {
        const menuRoles = await fetchMenuRolesByRole(roleId);
        menuUsersProfile.setDraftsFromRoleMenus(menuRoles);
    }
    catch (e) {
        roleProfileError.value =
            e?.response?.data?.message || "No se pudo cargar la perfilería del rol.";
    }
    finally {
        roleProfileLoading.value = false;
    }
}
/** Al abrir modal */
watch(() => props.modelValue, async (open) => {
    if (!open)
        return;
    // 1) Roles
    if (rolesStore.items.length === 0) {
        try {
            await rolesStore.fetchAll(false);
        }
        catch { }
    }
    // 2) Menú completo (se usa para el cascade)
    try {
        await menusFull.fetchAll(true);
    }
    catch { }
    // 3) Reset drafts
    menuUsersProfile.reset();
    // 4) Cargar form
    if (props.user) {
        // EDIT
        form.nameUser = props.user.nameUser ?? "";
        form.passUser = "";
        form.nameSurname = props.user.nameSurname ?? "";
        form.roleId = props.user.roleId ?? "";
        form.email = props.user.email ?? "";
        form.status = props.user.status || "ACTIVE";
        form.dateBirthday = props.user.dateBirthday ?? "";
        form.reportes = normalizeReportAccess(props.user.reportes);
        // cargar perfilería del usuario (para mostrar permisos)
        try {
            await menuUsersProfile.loadByUser(props.user.id);
        }
        catch {
            // error queda en store, se muestra arriba
        }
    }
    else {
        // CREATE
        form.nameUser = "";
        form.passUser = "";
        form.nameSurname = "";
        form.roleId = rolesStore.items?.[0]?.id ?? "";
        form.email = "";
        form.status = "ACTIVE";
        form.dateBirthday = "";
        form.reportes = roleDefaultReportes(form.roleId);
        // IMPORTANT: precarga por rol al abrir (no esperes a que cambie el select)
        await preloadFromRole(form.roleId);
    }
}, { immediate: true });
/** CREATE: si cambia el rol, recargar perfilería del rol */
watch(() => form.roleId, async (roleId, prev) => {
    if (isEdit.value)
        return;
    if (!roleId || roleId === prev)
        return;
    form.reportes = roleDefaultReportes(roleId);
    await preloadFromRole(roleId);
});
function close() {
    model.value = false;
}
function submit() {
    emit("submit", { ...form });
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
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 980),
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.model),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 980),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    rounded: "xl",
    ...{ class: "user-form-dialog-card" },
}));
const __VLS_9 = __VLS_8({
    rounded: "xl",
    ...{ class: "user-form-dialog-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
/** @type {__VLS_StyleScopedClasses['user-form-dialog-card']} */ ;
const { default: __VLS_12 } = __VLS_10.slots;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ class: "responsive-header" },
}));
const __VLS_15 = __VLS_14({
    ...{ class: "responsive-header" },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
/** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
const { default: __VLS_18 } = __VLS_16.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
(__VLS_ctx.isEdit ? "Editar usuario" : "Crear usuario");
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    ...{ 'onClick': {} },
    icon: "mdi-close",
    variant: "text",
}));
const __VLS_21 = __VLS_20({
    ...{ 'onClick': {} },
    icon: "mdi-close",
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
let __VLS_24;
const __VLS_25 = ({ click: {} },
    { onClick: (__VLS_ctx.close) });
var __VLS_22;
var __VLS_23;
// @ts-ignore
[model, isDialogFullscreen, isDialogFullscreen, isEdit, close,];
var __VLS_16;
let __VLS_26;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({}));
const __VLS_28 = __VLS_27({}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_31;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
    ...{ class: "pt-4" },
}));
const __VLS_33 = __VLS_32({
    ...{ class: "pt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
const { default: __VLS_36 } = __VLS_34.slots;
let __VLS_37;
/** @ts-ignore @type {typeof __VLS_components.vForm | typeof __VLS_components.VForm | typeof __VLS_components.vForm | typeof __VLS_components.VForm} */
vForm;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
    ...{ 'onSubmit': {} },
}));
const __VLS_39 = __VLS_38({
    ...{ 'onSubmit': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
let __VLS_42;
const __VLS_43 = ({ submit: {} },
    { onSubmit: (__VLS_ctx.submit) });
const { default: __VLS_44 } = __VLS_40.slots;
let __VLS_45;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
    dense: true,
}));
const __VLS_47 = __VLS_46({
    dense: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
const { default: __VLS_50 } = __VLS_48.slots;
let __VLS_51;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
    cols: "12",
    md: "6",
}));
const __VLS_53 = __VLS_52({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_52));
const { default: __VLS_56 } = __VLS_54.slots;
let __VLS_57;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({
    modelValue: (__VLS_ctx.form.nameUser),
    label: "Usuario",
    variant: "outlined",
    required: true,
}));
const __VLS_59 = __VLS_58({
    modelValue: (__VLS_ctx.form.nameUser),
    label: "Usuario",
    variant: "outlined",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
// @ts-ignore
[submit, form,];
var __VLS_54;
let __VLS_62;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
    cols: "12",
    md: "6",
}));
const __VLS_64 = __VLS_63({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
const { default: __VLS_67 } = __VLS_65.slots;
let __VLS_68;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
    modelValue: (__VLS_ctx.form.email),
    label: "Email",
    type: "email",
    variant: "outlined",
    required: true,
}));
const __VLS_70 = __VLS_69({
    modelValue: (__VLS_ctx.form.email),
    label: "Email",
    type: "email",
    variant: "outlined",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
// @ts-ignore
[form,];
var __VLS_65;
let __VLS_73;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
    cols: "12",
    md: "6",
}));
const __VLS_75 = __VLS_74({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
const { default: __VLS_78 } = __VLS_76.slots;
let __VLS_79;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({
    modelValue: (__VLS_ctx.form.nameSurname),
    label: "Nombres y Apellidos",
    variant: "outlined",
    required: true,
}));
const __VLS_81 = __VLS_80({
    modelValue: (__VLS_ctx.form.nameSurname),
    label: "Nombres y Apellidos",
    variant: "outlined",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
// @ts-ignore
[form,];
var __VLS_76;
let __VLS_84;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
    cols: "12",
    md: "6",
}));
const __VLS_86 = __VLS_85({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const { default: __VLS_89 } = __VLS_87.slots;
let __VLS_90;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
    modelValue: (__VLS_ctx.form.dateBirthday),
    label: "Fecha nacimiento",
    type: "date",
    variant: "outlined",
    required: true,
}));
const __VLS_92 = __VLS_91({
    modelValue: (__VLS_ctx.form.dateBirthday),
    label: "Fecha nacimiento",
    type: "date",
    variant: "outlined",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
// @ts-ignore
[form,];
var __VLS_87;
let __VLS_95;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
    cols: "12",
    md: "6",
}));
const __VLS_97 = __VLS_96({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_96));
const { default: __VLS_100 } = __VLS_98.slots;
let __VLS_101;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_102 = __VLS_asFunctionalComponent1(__VLS_101, new __VLS_101({
    modelValue: (__VLS_ctx.form.status),
    items: (__VLS_ctx.statusItems),
    itemTitle: "title",
    itemValue: "value",
    label: "Estado",
    variant: "outlined",
    required: true,
}));
const __VLS_103 = __VLS_102({
    modelValue: (__VLS_ctx.form.status),
    items: (__VLS_ctx.statusItems),
    itemTitle: "title",
    itemValue: "value",
    label: "Estado",
    variant: "outlined",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_102));
// @ts-ignore
[form, statusItems,];
var __VLS_98;
let __VLS_106;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent1(__VLS_106, new __VLS_106({
    cols: "12",
    md: "6",
}));
const __VLS_108 = __VLS_107({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
const { default: __VLS_111 } = __VLS_109.slots;
let __VLS_112;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent1(__VLS_112, new __VLS_112({
    modelValue: (__VLS_ctx.form.roleId),
    items: (__VLS_ctx.roleItems),
    itemTitle: "title",
    itemValue: "value",
    label: "Rol",
    variant: "outlined",
    required: true,
    loading: (__VLS_ctx.rolesLoading),
}));
const __VLS_114 = __VLS_113({
    modelValue: (__VLS_ctx.form.roleId),
    items: (__VLS_ctx.roleItems),
    itemTitle: "title",
    itemValue: "value",
    label: "Rol",
    variant: "outlined",
    required: true,
    loading: (__VLS_ctx.rolesLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
if (__VLS_ctx.rolesError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    (__VLS_ctx.rolesError);
}
if (!__VLS_ctx.isEdit) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
}
if (!__VLS_ctx.isEdit && __VLS_ctx.roleProfileLoading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    let __VLS_117;
    /** @ts-ignore @type {typeof __VLS_components.vProgressLinear | typeof __VLS_components.VProgressLinear} */
    vProgressLinear;
    // @ts-ignore
    const __VLS_118 = __VLS_asFunctionalComponent1(__VLS_117, new __VLS_117({
        indeterminate: true,
    }));
    const __VLS_119 = __VLS_118({
        indeterminate: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_118));
}
if (!__VLS_ctx.isEdit && __VLS_ctx.roleProfileError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-error mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-error']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    (__VLS_ctx.roleProfileError);
}
// @ts-ignore
[isEdit, isEdit, isEdit, form, roleItems, rolesLoading, rolesError, rolesError, roleProfileLoading, roleProfileError, roleProfileError,];
var __VLS_109;
let __VLS_122;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent1(__VLS_122, new __VLS_122({
    cols: "12",
}));
const __VLS_124 = __VLS_123({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
const { default: __VLS_127 } = __VLS_125.slots;
let __VLS_128;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete | typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
    modelValue: (__VLS_ctx.form.reportes),
    items: (__VLS_ctx.reportAccessOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Reportes habilitados",
    variant: "outlined",
    multiple: true,
    chips: true,
    closableChips: true,
    clearable: true,
    hint: "Si lo dejas vacío, el usuario tendrá acceso a todos los reportes.",
    persistentHint: true,
}));
const __VLS_130 = __VLS_129({
    modelValue: (__VLS_ctx.form.reportes),
    items: (__VLS_ctx.reportAccessOptions),
    itemTitle: "title",
    itemValue: "value",
    label: "Reportes habilitados",
    variant: "outlined",
    multiple: true,
    chips: true,
    closableChips: true,
    clearable: true,
    hint: "Si lo dejas vacío, el usuario tendrá acceso a todos los reportes.",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
const { default: __VLS_133 } = __VLS_131.slots;
{
    const { item: __VLS_134 } = __VLS_131.slots;
    const [{ props: itemProps, item }] = __VLS_vSlot(__VLS_134);
    let __VLS_135;
    /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
    vListItem;
    // @ts-ignore
    const __VLS_136 = __VLS_asFunctionalComponent1(__VLS_135, new __VLS_135({
        ...(itemProps),
        subtitle: (item.raw.description),
    }));
    const __VLS_137 = __VLS_136({
        ...(itemProps),
        subtitle: (item.raw.description),
    }, ...__VLS_functionalComponentArgsRest(__VLS_136));
    // @ts-ignore
    [form, reportAccessOptions,];
}
// @ts-ignore
[];
var __VLS_131;
// @ts-ignore
[];
var __VLS_125;
if (!__VLS_ctx.isEdit) {
    let __VLS_140;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent1(__VLS_140, new __VLS_140({
        cols: "12",
    }));
    const __VLS_142 = __VLS_141({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    const { default: __VLS_145 } = __VLS_143.slots;
    let __VLS_146;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
        modelValue: (__VLS_ctx.form.passUser),
        label: "Contraseña",
        type: "password",
        variant: "outlined",
        required: true,
    }));
    const __VLS_148 = __VLS_147({
        modelValue: (__VLS_ctx.form.passUser),
        label: "Contraseña",
        type: "password",
        variant: "outlined",
        required: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    // @ts-ignore
    [isEdit, form,];
    var __VLS_143;
}
else {
    let __VLS_151;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
        cols: "12",
    }));
    const __VLS_153 = __VLS_152({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
    const { default: __VLS_156 } = __VLS_154.slots;
    let __VLS_157;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_158 = __VLS_asFunctionalComponent1(__VLS_157, new __VLS_157({
        modelValue: (__VLS_ctx.form.passUser),
        label: "Contraseña (opcional)",
        type: "password",
        variant: "outlined",
        hint: "Déjala vacía si no quieres cambiarla",
        persistentHint: true,
    }));
    const __VLS_159 = __VLS_158({
        modelValue: (__VLS_ctx.form.passUser),
        label: "Contraseña (opcional)",
        type: "password",
        variant: "outlined",
        hint: "Déjala vacía si no quieres cambiarla",
        persistentHint: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_158));
    // @ts-ignore
    [form,];
    var __VLS_154;
}
// @ts-ignore
[];
var __VLS_48;
if (__VLS_ctx.isEdit) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-6" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "responsive-header mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['responsive-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    let __VLS_162;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_163 = __VLS_asFunctionalComponent1(__VLS_162, new __VLS_162({
        size: "small",
        variant: "tonal",
    }));
    const __VLS_164 = __VLS_163({
        size: "small",
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    const { default: __VLS_167 } = __VLS_165.slots;
    (props.user?.id);
    // @ts-ignore
    [isEdit,];
    var __VLS_165;
    if (__VLS_ctx.menuUsersProfile.error) {
        let __VLS_168;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent1(__VLS_168, new __VLS_168({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }));
        const __VLS_170 = __VLS_169({
            type: "error",
            variant: "tonal",
            ...{ class: "mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_173 } = __VLS_171.slots;
        (__VLS_ctx.menuUsersProfile.error);
        // @ts-ignore
        [menuUsersProfile, menuUsersProfile,];
        var __VLS_171;
    }
    const __VLS_174 = MenuPermissionsCascade;
    // @ts-ignore
    const __VLS_175 = __VLS_asFunctionalComponent1(__VLS_174, new __VLS_174({
        tree: (__VLS_ctx.menusFull.tree),
        menusLoading: (__VLS_ctx.menusFull.loading || __VLS_ctx.menuUsersProfile.loading),
        menusError: (__VLS_ctx.menusFull.error),
        getDraft: (__VLS_ctx.menuUsersProfile.getDraft),
    }));
    const __VLS_176 = __VLS_175({
        tree: (__VLS_ctx.menusFull.tree),
        menusLoading: (__VLS_ctx.menusFull.loading || __VLS_ctx.menuUsersProfile.loading),
        menusError: (__VLS_ctx.menusFull.error),
        getDraft: (__VLS_ctx.menuUsersProfile.getDraft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_175));
}
if (__VLS_ctx.error) {
    let __VLS_179;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert | typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_180 = __VLS_asFunctionalComponent1(__VLS_179, new __VLS_179({
        type: "error",
        variant: "tonal",
        ...{ class: "mt-2" },
    }));
    const __VLS_181 = __VLS_180({
        type: "error",
        variant: "tonal",
        ...{ class: "mt-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_180));
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    const { default: __VLS_184 } = __VLS_182.slots;
    (__VLS_ctx.error);
    // @ts-ignore
    [menuUsersProfile, menuUsersProfile, menusFull, menusFull, menusFull, error, error,];
    var __VLS_182;
}
// @ts-ignore
[];
var __VLS_40;
var __VLS_41;
// @ts-ignore
[];
var __VLS_34;
let __VLS_185;
/** @ts-ignore @type {typeof __VLS_components.vDivider | typeof __VLS_components.VDivider} */
vDivider;
// @ts-ignore
const __VLS_186 = __VLS_asFunctionalComponent1(__VLS_185, new __VLS_185({}));
const __VLS_187 = __VLS_186({}, ...__VLS_functionalComponentArgsRest(__VLS_186));
let __VLS_190;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_191 = __VLS_asFunctionalComponent1(__VLS_190, new __VLS_190({
    ...{ class: "pa-4" },
}));
const __VLS_192 = __VLS_191({
    ...{ class: "pa-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_191));
/** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
const { default: __VLS_195 } = __VLS_193.slots;
let __VLS_196;
/** @ts-ignore @type {typeof __VLS_components.vSpacer | typeof __VLS_components.VSpacer} */
vSpacer;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent1(__VLS_196, new __VLS_196({}));
const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
let __VLS_201;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent1(__VLS_201, new __VLS_201({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_203 = __VLS_202({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
let __VLS_206;
const __VLS_207 = ({ click: {} },
    { onClick: (__VLS_ctx.close) });
const { default: __VLS_208 } = __VLS_204.slots;
// @ts-ignore
[close,];
var __VLS_204;
var __VLS_205;
let __VLS_209;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent1(__VLS_209, new __VLS_209({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
    color: "primary",
}));
const __VLS_211 = __VLS_210({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
    color: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
let __VLS_214;
const __VLS_215 = ({ click: {} },
    { onClick: (__VLS_ctx.submit) });
const { default: __VLS_216 } = __VLS_212.slots;
(__VLS_ctx.isEdit ? "Guardar cambios" : "Crear");
// @ts-ignore
[isEdit, submit, loading,];
var __VLS_212;
var __VLS_213;
// @ts-ignore
[];
var __VLS_193;
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

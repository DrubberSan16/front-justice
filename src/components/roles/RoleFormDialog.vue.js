/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, watch, computed } from "vue";
import { useDisplay } from "vuetify";
import { useMenuRolesStore } from "@/app/stores/menu-roles.store";
import { useMenusFullStore } from "@/app/stores/menus-full.store";
import { REPORT_ACCESS_OPTIONS, normalizeReportAccess } from "@/app/config/report-access";
import MenuPermissionsCascade from "@/components/roles/MenuPermissionsCascade.vue";
const props = defineProps();
const emit = defineEmits(["update:modelValue", "submit"]);
const dialog = computed({
    get: () => props.modelValue,
    set: (val) => emit("update:modelValue", val),
});
const isEdit = computed(() => !!props.role);
const menus = useMenusFullStore();
const menuRoles = useMenuRolesStore();
const { mdAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);
const form = ref({
    nombre: "",
    descripcion: "",
    status: "ACTIVE",
    reportes: [],
});
const reportAccessOptions = REPORT_ACCESS_OPTIONS;
watch(() => props.modelValue, async (v) => {
    if (!v)
        return;
    await menus.fetchAll(true);
    if (props.role) {
        form.value = {
            nombre: props.role.nombre,
            descripcion: props.role.descripcion,
            status: props.role.status,
            reportes: normalizeReportAccess(props.role.reportes),
        };
        await menuRoles.loadByRole(props.role.id);
    }
    else {
        menuRoles.reset();
        form.value = {
            nombre: "",
            descripcion: "",
            status: "ACTIVE",
            reportes: [],
        };
    }
});
const loading = computed(() => props.loading ?? false);
function submit() {
    emit("submit", { ...form.value });
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
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 900),
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 900),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    rounded: "xl",
    ...{ class: "role-form-dialog-card" },
}));
const __VLS_9 = __VLS_8({
    rounded: "xl",
    ...{ class: "role-form-dialog-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
/** @type {__VLS_StyleScopedClasses['role-form-dialog-card']} */ ;
const { default: __VLS_12 } = __VLS_10.slots;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle | typeof __VLS_components.vCardTitle | typeof __VLS_components.VCardTitle} */
vCardTitle;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ class: "text-h6" },
}));
const __VLS_15 = __VLS_14({
    ...{ class: "text-h6" },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
/** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
const { default: __VLS_18 } = __VLS_16.slots;
(__VLS_ctx.isEdit ? "Editar Rol" : "Crear Rol");
// @ts-ignore
[dialog, isDialogFullscreen, isDialogFullscreen, isEdit,];
var __VLS_16;
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.vCardText | typeof __VLS_components.VCardText | typeof __VLS_components.vCardText | typeof __VLS_components.VCardText} */
vCardText;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({}));
const __VLS_21 = __VLS_20({}, ...__VLS_functionalComponentArgsRest(__VLS_20));
const { default: __VLS_24 } = __VLS_22.slots;
let __VLS_25;
/** @ts-ignore @type {typeof __VLS_components.vForm | typeof __VLS_components.VForm | typeof __VLS_components.vForm | typeof __VLS_components.VForm} */
vForm;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
    ...{ 'onSubmit': {} },
}));
const __VLS_27 = __VLS_26({
    ...{ 'onSubmit': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_30;
const __VLS_31 = ({ submit: {} },
    { onSubmit: (__VLS_ctx.submit) });
const { default: __VLS_32 } = __VLS_28.slots;
let __VLS_33;
/** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
vRow;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({}));
const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
const { default: __VLS_38 } = __VLS_36.slots;
let __VLS_39;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
    cols: "12",
    md: "6",
}));
const __VLS_41 = __VLS_40({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
const { default: __VLS_44 } = __VLS_42.slots;
let __VLS_45;
/** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
vTextField;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
    modelValue: (__VLS_ctx.form.nombre),
    label: "Nombre",
    required: true,
}));
const __VLS_47 = __VLS_46({
    modelValue: (__VLS_ctx.form.nombre),
    label: "Nombre",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
// @ts-ignore
[submit, form,];
var __VLS_42;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    cols: "12",
    md: "6",
}));
const __VLS_52 = __VLS_51({
    cols: "12",
    md: "6",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
const { default: __VLS_55 } = __VLS_53.slots;
let __VLS_56;
/** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
vSelect;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.form.status),
    items: (['ACTIVE', 'INACTIVE']),
    label: "Estado",
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.form.status),
    items: (['ACTIVE', 'INACTIVE']),
    label: "Estado",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
// @ts-ignore
[form,];
var __VLS_53;
let __VLS_61;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
    cols: "12",
}));
const __VLS_63 = __VLS_62({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
const { default: __VLS_66 } = __VLS_64.slots;
let __VLS_67;
/** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
vTextarea;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
    modelValue: (__VLS_ctx.form.descripcion),
    label: "Descripción",
}));
const __VLS_69 = __VLS_68({
    modelValue: (__VLS_ctx.form.descripcion),
    label: "Descripción",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
// @ts-ignore
[form,];
var __VLS_64;
let __VLS_72;
/** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
vCol;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
    cols: "12",
}));
const __VLS_74 = __VLS_73({
    cols: "12",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
const { default: __VLS_77 } = __VLS_75.slots;
let __VLS_78;
/** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete | typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
vAutocomplete;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent1(__VLS_78, new __VLS_78({
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
    hint: "Si lo dejas vacío, el rol tendrá acceso a todos los reportes.",
    persistentHint: true,
}));
const __VLS_80 = __VLS_79({
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
    hint: "Si lo dejas vacío, el rol tendrá acceso a todos los reportes.",
    persistentHint: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
const { default: __VLS_83 } = __VLS_81.slots;
{
    const { item: __VLS_84 } = __VLS_81.slots;
    const [{ props: itemProps, item }] = __VLS_vSlot(__VLS_84);
    let __VLS_85;
    /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
    vListItem;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
        ...(itemProps),
        subtitle: (item.raw.description),
    }));
    const __VLS_87 = __VLS_86({
        ...(itemProps),
        subtitle: (item.raw.description),
    }, ...__VLS_functionalComponentArgsRest(__VLS_86));
    // @ts-ignore
    [form, reportAccessOptions,];
}
// @ts-ignore
[];
var __VLS_81;
// @ts-ignore
[];
var __VLS_75;
// @ts-ignore
[];
var __VLS_36;
const __VLS_90 = MenuPermissionsCascade;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent1(__VLS_90, new __VLS_90({
    tree: (__VLS_ctx.menus.tree),
    getDraft: (__VLS_ctx.menuRoles.getDraft),
    menusLoading: (__VLS_ctx.menus.loading),
}));
const __VLS_92 = __VLS_91({
    tree: (__VLS_ctx.menus.tree),
    getDraft: (__VLS_ctx.menuRoles.getDraft),
    menusLoading: (__VLS_ctx.menus.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
let __VLS_95;
/** @ts-ignore @type {typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions | typeof __VLS_components.vCardActions | typeof __VLS_components.VCardActions} */
vCardActions;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
    ...{ class: "justify-end mt-4" },
}));
const __VLS_97 = __VLS_96({
    ...{ class: "justify-end mt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_96));
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
const { default: __VLS_100 } = __VLS_98.slots;
let __VLS_101;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_102 = __VLS_asFunctionalComponent1(__VLS_101, new __VLS_101({
    ...{ 'onClick': {} },
    variant: "text",
}));
const __VLS_103 = __VLS_102({
    ...{ 'onClick': {} },
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_102));
let __VLS_106;
const __VLS_107 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog, menus, menus, menuRoles,];
        } });
const { default: __VLS_108 } = __VLS_104.slots;
// @ts-ignore
[];
var __VLS_104;
var __VLS_105;
let __VLS_109;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent1(__VLS_109, new __VLS_109({
    color: "primary",
    type: "submit",
    loading: (__VLS_ctx.loading),
    disabled: (__VLS_ctx.loading),
}));
const __VLS_111 = __VLS_110({
    color: "primary",
    type: "submit",
    loading: (__VLS_ctx.loading),
    disabled: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
const { default: __VLS_114 } = __VLS_112.slots;
// @ts-ignore
[loading, loading,];
var __VLS_112;
// @ts-ignore
[];
var __VLS_98;
// @ts-ignore
[];
var __VLS_28;
var __VLS_29;
// @ts-ignore
[];
var __VLS_22;
// @ts-ignore
[];
var __VLS_10;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    emits: {},
    __typeProps: {},
});
export default {};

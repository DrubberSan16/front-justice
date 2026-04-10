/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, reactive } from "vue";
const props = defineProps();
const emit = defineEmits();
const drafts = reactive({});
const evidenceTypeOptions = [
    { value: "DOCUMENTO", title: "Documento" },
    { value: "IMAGEN", title: "Imagen" },
    { value: "VIDEO", title: "Video" },
];
const alertLevelOptions = [
    { value: "NORMAL", title: "Normal" },
    { value: "OBSERVACION", title: "Observacion" },
    { value: "ALERTA", title: "Alerta" },
];
const priorityOptions = [
    { value: "BAJA", title: "Baja" },
    { value: "MEDIA", title: "Media" },
    { value: "ALTA", title: "Alta" },
];
const procedureFieldTypeOptions = [
    { value: "BOOLEAN", title: "Check / Cumple" },
    { value: "TEXT", title: "Texto" },
    { value: "NUMBER", title: "Numero" },
    { value: "JSON", title: "JSON / Evidencia" },
];
function repairText(value) {
    const text = String(value ?? "");
    try {
        return decodeURIComponent(escape(text));
    }
    catch {
        return text;
    }
}
function cloneValue(value) {
    if (value === null || value === undefined)
        return value;
    return JSON.parse(JSON.stringify(value));
}
function emitValue(value) {
    emit("update:modelValue", cloneValue(value));
}
function asNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}
function asNullableNumber(value) {
    const raw = String(value ?? "").trim();
    if (!raw)
        return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
}
const stringListValue = computed(() => Array.isArray(props.modelValue) ? props.modelValue.map((item) => String(item)).filter(Boolean) : []);
const relationMultiSelectValue = computed(() => Array.isArray(props.modelValue)
    ? props.modelValue.map((item) => String(item ?? "").trim()).filter(Boolean)
    : []);
const selectedWarehouseId = computed(() => String(props.formState?.bodega_id ?? "").trim());
const requiresWarehouseSelection = computed(() => props.field.key === "materiales");
const filteredRelationMultiSelectOptions = computed(() => {
    const options = relationOptions.value[props.field.key] ?? [];
    if (!requiresWarehouseSelection.value)
        return options;
    if (!selectedWarehouseId.value)
        return [];
    return options.filter((item) => String(item?.bodegaId || "") === selectedWarehouseId.value);
});
function addStringListItem() {
    const draft = String(drafts[props.field.key] ?? "").trim();
    if (!draft)
        return;
    emitValue([...stringListValue.value, draft]);
    drafts[props.field.key] = "";
}
function removeStringListItem(index) {
    emitValue(stringListValue.value.filter((_, currentIndex) => currentIndex !== index));
}
function updateRelationMultiSelect(value) {
    emitValue(Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : []);
}
const procedureActivities = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
function addProcedureActivity() {
    emitValue([
        ...procedureActivities.value,
        {
            orden: procedureActivities.value.length + 1,
            fase: "",
            actividad: "",
            detalle: "",
            requiere_permiso: false,
            requiere_epp: false,
            requiere_bloqueo: false,
            requiere_evidencia: false,
            meta: { evidencias_requeridas: [], field_type: "BOOLEAN", required: true },
        },
    ]);
}
function updateProcedureActivity(index, key, value) {
    const next = cloneValue(procedureActivities.value);
    next[index] = { ...(next[index] ?? {}), [key]: value };
    emitValue(next);
}
function procedureEvidenceTypes(item) {
    return Array.isArray(item?.meta?.evidencias_requeridas) ? item.meta.evidencias_requeridas : [];
}
function procedureFieldType(item) {
    return String(item?.meta?.field_type || (item?.requiere_evidencia ? "JSON" : "BOOLEAN"));
}
function procedureRequired(item) {
    return typeof item?.meta?.required === "boolean" ? item.meta.required : true;
}
function updateProcedureEvidence(index, value) {
    const next = cloneValue(procedureActivities.value);
    const current = next[index] ?? {};
    current.meta = {
        ...(current.meta ?? {}),
        evidencias_requeridas: Array.isArray(value) ? value : [],
    };
    next[index] = current;
    emitValue(next);
}
function updateProcedureActivityConfig(index, key, value) {
    const next = cloneValue(procedureActivities.value);
    const current = next[index] ?? {};
    current.meta = {
        ...(current.meta ?? {}),
        [key]: key === "required" ? Boolean(value) : value,
    };
    if (key === "field_type" && String(value || "").toUpperCase() === "JSON") {
        current.requiere_evidencia = true;
    }
    next[index] = current;
    emitValue(next);
}
function removeProcedureActivity(index) {
    emitValue(procedureActivities.value.filter((_, currentIndex) => currentIndex !== index));
}
const analysisDetails = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
function addAnalysisDetail() {
    emitValue([
        ...analysisDetails.value,
        {
            compartimento: "",
            numero_muestra: "",
            parametro: "",
            resultado_numerico: null,
            resultado_texto: "",
            unidad: "",
            linea_base: null,
            nivel_alerta: "NORMAL",
            tendencia: null,
            observacion: "",
        },
    ]);
}
function updateAnalysisDetail(index, key, value) {
    const next = cloneValue(analysisDetails.value);
    next[index] = { ...(next[index] ?? {}), [key]: value };
    emitValue(next);
}
function removeAnalysisDetail(index) {
    emitValue(analysisDetails.value.filter((_, currentIndex) => currentIndex !== index));
}
const analysisPayload = computed(() => ({
    laboratorio: "",
    numero_informe: "",
    tecnico_responsable: "",
    requiere_accion: false,
    prioridad: "MEDIA",
    observaciones: "",
    banderas: [],
    adjuntos: [],
    ...(props.modelValue && typeof props.modelValue === "object" && !Array.isArray(props.modelValue) ? props.modelValue : {}),
}));
const analysisFlags = computed(() => Array.isArray(analysisPayload.value.banderas) ? analysisPayload.value.banderas.map((item) => String(item)).filter(Boolean) : []);
const analysisAttachments = computed(() => Array.isArray(analysisPayload.value.adjuntos) ? analysisPayload.value.adjuntos : []);
function updateAnalysisPayload(key, value) {
    emitValue({
        ...analysisPayload.value,
        [key]: value,
    });
}
function addAnalysisFlag() {
    const draft = String(drafts[`${props.field.key}-flag`] ?? "").trim();
    if (!draft)
        return;
    updateAnalysisPayload("banderas", [...analysisFlags.value, draft]);
    drafts[`${props.field.key}-flag`] = "";
}
function removeAnalysisFlag(index) {
    updateAnalysisPayload("banderas", analysisFlags.value.filter((_, currentIndex) => currentIndex !== index));
}
function classifyAttachment(type) {
    if (type.startsWith("image/"))
        return "IMAGEN";
    if (type.startsWith("video/"))
        return "VIDEO";
    return "DOCUMENTO";
}
function handleAnalysisAttachments(value) {
    const files = Array.isArray(value) ? value : value ? [value] : [];
    const attachments = files.map((file) => ({
        nombre: file.name,
        tipo: file.type || classifyAttachment(file.type || ""),
        categoria: classifyAttachment(file.type || ""),
        tamano_kb: Math.round(file.size / 1024),
    }));
    updateAnalysisPayload("adjuntos", attachments);
}
const issueItems = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const relationOptions = computed(() => props.relationOptions ?? {});
function resolveRelationMultiSelectLabel(value) {
    const key = String(value ?? "").trim();
    return (filteredRelationMultiSelectOptions.value.find((item) => String(item.value) === key)?.title ||
        relationOptions.value[props.field.key]?.find((item) => String(item.value) === key)?.title ||
        key);
}
function removeRelationMultiSelectItem(value) {
    const key = String(value ?? "").trim();
    emitValue(relationMultiSelectValue.value.filter((item) => item !== key));
}
function addIssueItem() {
    emitValue([...issueItems.value, { producto_id: null, bodega_id: null, cantidad: 1 }]);
}
function updateIssueItem(index, key, value) {
    const next = cloneValue(issueItems.value);
    next[index] = { ...(next[index] ?? {}), [key]: value };
    if (key === "bodega_id") {
        const validForWarehouse = getIssueProductOptions(value).some((option) => String(option.value) === String(next[index]?.producto_id ?? ""));
        if (!validForWarehouse) {
            next[index].producto_id = null;
        }
    }
    emitValue(next);
}
function getIssueProductOptions(bodegaId) {
    const warehouseId = String(bodegaId ?? "").trim();
    if (!warehouseId)
        return [];
    return (relationOptions.value.producto_id ?? []).filter((item) => String(item?.bodegaId || "") === warehouseId);
}
function removeIssueItem(index) {
    emitValue(issueItems.value.filter((_, currentIndex) => currentIndex !== index));
}
const uploadedFileMeta = computed(() => props.modelValue && typeof props.modelValue === "object" && !Array.isArray(props.modelValue) ? props.modelValue : {});
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            resolve(result.includes(",") ? result.split(",")[1] || "" : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo."));
        reader.readAsDataURL(file);
    });
}
async function handleSingleFileUpload(value) {
    const file = Array.isArray(value) ? value[0] : value;
    if (!file) {
        emitValue({});
        emit("patch-form", {
            nombre: "",
            contenido_base64: "",
            mime_type: "",
            meta: {},
        });
        return;
    }
    const base64 = await fileToBase64(file);
    const metadata = {
        nombre: file.name,
        mime_type: file.type || "",
        tamano_kb: Math.round(file.size / 1024),
    };
    emitValue(metadata);
    emit("patch-form", {
        nombre: file.name,
        contenido_base64: base64,
        mime_type: file.type || "",
        meta: metadata,
    });
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
if (__VLS_ctx.field.editor === 'string-list') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "structured-field" },
    });
    /** @type {__VLS_StyleScopedClasses['structured-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-medium mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.repairText(__VLS_ctx.field.label));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chip-list mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['chip-list']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [item, index] of __VLS_vFor((__VLS_ctx.stringListValue))) {
        let __VLS_0;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            ...{ 'onClick:close': {} },
            key: (`${__VLS_ctx.field.key}-${index}-${item}`),
            closable: true,
            size: "small",
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick:close': {} },
            key: (`${__VLS_ctx.field.key}-${index}-${item}`),
            closable: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_5;
        const __VLS_6 = ({ 'click:close': {} },
            { 'onClick:close': (...[$event]) => {
                    if (!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    __VLS_ctx.removeStringListItem(index);
                    // @ts-ignore
                    [field, field, field, repairText, stringListValue, removeStringListItem,];
                } });
        const { default: __VLS_7 } = __VLS_3.slots;
        (item);
        // @ts-ignore
        [];
        var __VLS_3;
        var __VLS_4;
        // @ts-ignore
        [];
    }
    if (!__VLS_ctx.stringListValue.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-start" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-start']} */ ;
    let __VLS_8;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        ...{ 'onKeydown': {} },
        modelValue: (__VLS_ctx.drafts[__VLS_ctx.field.key]),
        label: (`Agregar ${__VLS_ctx.repairText(__VLS_ctx.field.label).toLowerCase()}`),
        variant: "outlined",
        density: "compact",
        hideDetails: true,
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onKeydown': {} },
        modelValue: (__VLS_ctx.drafts[__VLS_ctx.field.key]),
        label: (`Agregar ${__VLS_ctx.repairText(__VLS_ctx.field.label).toLowerCase()}`),
        variant: "outlined",
        density: "compact",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_13;
    const __VLS_14 = ({ keydown: {} },
        { onKeydown: (__VLS_ctx.addStringListItem) });
    var __VLS_11;
    var __VLS_12;
    let __VLS_15;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_17 = __VLS_16({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    let __VLS_20;
    const __VLS_21 = ({ click: {} },
        { onClick: (__VLS_ctx.addStringListItem) });
    const { default: __VLS_22 } = __VLS_18.slots;
    // @ts-ignore
    [field, field, repairText, stringListValue, drafts, addStringListItem, addStringListItem,];
    var __VLS_18;
    var __VLS_19;
}
else if (__VLS_ctx.field.editor === 'procedure-activities') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "structured-field" },
    });
    /** @type {__VLS_StyleScopedClasses['structured-field']} */ ;
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
        ...{ class: "text-subtitle-2 font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.repairText(__VLS_ctx.field.label));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    let __VLS_23;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_25 = __VLS_24({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    let __VLS_28;
    const __VLS_29 = ({ click: {} },
        { onClick: (__VLS_ctx.addProcedureActivity) });
    const { default: __VLS_30 } = __VLS_26.slots;
    // @ts-ignore
    [field, field, repairText, addProcedureActivity,];
    var __VLS_26;
    var __VLS_27;
    for (const [item, index] of __VLS_vFor((__VLS_ctx.procedureActivities))) {
        let __VLS_31;
        /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
        vCard;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
            key: (`procedure-${index}`),
            rounded: "lg",
            variant: "outlined",
            ...{ class: "pa-3 mb-3" },
        }));
        const __VLS_33 = __VLS_32({
            key: (`procedure-${index}`),
            rounded: "lg",
            variant: "outlined",
            ...{ class: "pa-3 mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        /** @type {__VLS_StyleScopedClasses['pa-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_36 } = __VLS_34.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex align-center justify-space-between mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-subtitle-2 font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (index + 1);
        let __VLS_37;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }));
        const __VLS_39 = __VLS_38({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        let __VLS_42;
        const __VLS_43 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.removeProcedureActivity(index);
                    // @ts-ignore
                    [procedureActivities, removeProcedureActivity,];
                } });
        var __VLS_40;
        var __VLS_41;
        let __VLS_44;
        /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
        vRow;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
            dense: true,
        }));
        const __VLS_46 = __VLS_45({
            dense: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        const { default: __VLS_49 } = __VLS_47.slots;
        let __VLS_50;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
            cols: "12",
            md: "2",
        }));
        const __VLS_52 = __VLS_51({
            cols: "12",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        const { default: __VLS_55 } = __VLS_53.slots;
        let __VLS_56;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.orden ?? index + 1),
            label: "Orden",
            type: "number",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_58 = __VLS_57({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.orden ?? index + 1),
            label: "Orden",
            type: "number",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        let __VLS_61;
        const __VLS_62 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'orden', __VLS_ctx.asNumber($event));
                    // @ts-ignore
                    [updateProcedureActivity, asNumber,];
                } });
        var __VLS_59;
        var __VLS_60;
        // @ts-ignore
        [];
        var __VLS_53;
        let __VLS_63;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
            cols: "12",
            md: "4",
        }));
        const __VLS_65 = __VLS_64({
            cols: "12",
            md: "4",
        }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        const { default: __VLS_68 } = __VLS_66.slots;
        let __VLS_69;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.fase ?? ''),
            label: "Fase",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_71 = __VLS_70({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.fase ?? ''),
            label: "Fase",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_70));
        let __VLS_74;
        const __VLS_75 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'fase', $event);
                    // @ts-ignore
                    [updateProcedureActivity,];
                } });
        var __VLS_72;
        var __VLS_73;
        // @ts-ignore
        [];
        var __VLS_66;
        let __VLS_76;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
            cols: "12",
            md: "6",
        }));
        const __VLS_78 = __VLS_77({
            cols: "12",
            md: "6",
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        const { default: __VLS_81 } = __VLS_79.slots;
        let __VLS_82;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.actividad ?? ''),
            label: "Actividad",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_84 = __VLS_83({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.actividad ?? ''),
            label: "Actividad",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_83));
        let __VLS_87;
        const __VLS_88 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'actividad', $event);
                    // @ts-ignore
                    [updateProcedureActivity,];
                } });
        var __VLS_85;
        var __VLS_86;
        // @ts-ignore
        [];
        var __VLS_79;
        let __VLS_89;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
            cols: "12",
        }));
        const __VLS_91 = __VLS_90({
            cols: "12",
        }, ...__VLS_functionalComponentArgsRest(__VLS_90));
        const { default: __VLS_94 } = __VLS_92.slots;
        let __VLS_95;
        /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
        vTextarea;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.detalle ?? ''),
            label: "Detalle operativo",
            variant: "outlined",
            rows: "2",
            autoGrow: true,
            density: "compact",
        }));
        const __VLS_97 = __VLS_96({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.detalle ?? ''),
            label: "Detalle operativo",
            variant: "outlined",
            rows: "2",
            autoGrow: true,
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
        let __VLS_100;
        const __VLS_101 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'detalle', $event);
                    // @ts-ignore
                    [updateProcedureActivity,];
                } });
        var __VLS_98;
        var __VLS_99;
        // @ts-ignore
        [];
        var __VLS_92;
        let __VLS_102;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({
            cols: "12",
            md: "4",
        }));
        const __VLS_104 = __VLS_103({
            cols: "12",
            md: "4",
        }, ...__VLS_functionalComponentArgsRest(__VLS_103));
        const { default: __VLS_107 } = __VLS_105.slots;
        let __VLS_108;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.procedureFieldType(item)),
            items: (__VLS_ctx.procedureFieldTypeOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Tipo de captura",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_110 = __VLS_109({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.procedureFieldType(item)),
            items: (__VLS_ctx.procedureFieldTypeOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Tipo de captura",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        let __VLS_113;
        const __VLS_114 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivityConfig(index, 'field_type', $event);
                    // @ts-ignore
                    [procedureFieldType, procedureFieldTypeOptions, updateProcedureActivityConfig,];
                } });
        var __VLS_111;
        var __VLS_112;
        // @ts-ignore
        [];
        var __VLS_105;
        let __VLS_115;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_116 = __VLS_asFunctionalComponent1(__VLS_115, new __VLS_115({
            cols: "12",
            md: "4",
        }));
        const __VLS_117 = __VLS_116({
            cols: "12",
            md: "4",
        }, ...__VLS_functionalComponentArgsRest(__VLS_116));
        const { default: __VLS_120 } = __VLS_118.slots;
        let __VLS_121;
        /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
        vCheckbox;
        // @ts-ignore
        const __VLS_122 = __VLS_asFunctionalComponent1(__VLS_121, new __VLS_121({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.procedureRequired(item)),
            label: "Registro obligatorio",
            hideDetails: true,
        }));
        const __VLS_123 = __VLS_122({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.procedureRequired(item)),
            label: "Registro obligatorio",
            hideDetails: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_122));
        let __VLS_126;
        const __VLS_127 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivityConfig(index, 'required', $event);
                    // @ts-ignore
                    [updateProcedureActivityConfig, procedureRequired,];
                } });
        var __VLS_124;
        var __VLS_125;
        // @ts-ignore
        [];
        var __VLS_118;
        let __VLS_128;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
            cols: "12",
            md: "3",
        }));
        const __VLS_130 = __VLS_129({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        const { default: __VLS_133 } = __VLS_131.slots;
        let __VLS_134;
        /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
        vCheckbox;
        // @ts-ignore
        const __VLS_135 = __VLS_asFunctionalComponent1(__VLS_134, new __VLS_134({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_permiso)),
            label: "Requiere permiso",
            hideDetails: true,
        }));
        const __VLS_136 = __VLS_135({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_permiso)),
            label: "Requiere permiso",
            hideDetails: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_135));
        let __VLS_139;
        const __VLS_140 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'requiere_permiso', $event);
                    // @ts-ignore
                    [updateProcedureActivity,];
                } });
        var __VLS_137;
        var __VLS_138;
        // @ts-ignore
        [];
        var __VLS_131;
        let __VLS_141;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({
            cols: "12",
            md: "3",
        }));
        const __VLS_143 = __VLS_142({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_142));
        const { default: __VLS_146 } = __VLS_144.slots;
        let __VLS_147;
        /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
        vCheckbox;
        // @ts-ignore
        const __VLS_148 = __VLS_asFunctionalComponent1(__VLS_147, new __VLS_147({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_epp)),
            label: "Requiere EPP",
            hideDetails: true,
        }));
        const __VLS_149 = __VLS_148({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_epp)),
            label: "Requiere EPP",
            hideDetails: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_148));
        let __VLS_152;
        const __VLS_153 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'requiere_epp', $event);
                    // @ts-ignore
                    [updateProcedureActivity,];
                } });
        var __VLS_150;
        var __VLS_151;
        // @ts-ignore
        [];
        var __VLS_144;
        let __VLS_154;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_155 = __VLS_asFunctionalComponent1(__VLS_154, new __VLS_154({
            cols: "12",
            md: "3",
        }));
        const __VLS_156 = __VLS_155({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_155));
        const { default: __VLS_159 } = __VLS_157.slots;
        let __VLS_160;
        /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
        vCheckbox;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent1(__VLS_160, new __VLS_160({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_bloqueo)),
            label: "Requiere bloqueo",
            hideDetails: true,
        }));
        const __VLS_162 = __VLS_161({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_bloqueo)),
            label: "Requiere bloqueo",
            hideDetails: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
        let __VLS_165;
        const __VLS_166 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'requiere_bloqueo', $event);
                    // @ts-ignore
                    [updateProcedureActivity,];
                } });
        var __VLS_163;
        var __VLS_164;
        // @ts-ignore
        [];
        var __VLS_157;
        let __VLS_167;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_168 = __VLS_asFunctionalComponent1(__VLS_167, new __VLS_167({
            cols: "12",
            md: "3",
        }));
        const __VLS_169 = __VLS_168({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_168));
        const { default: __VLS_172 } = __VLS_170.slots;
        let __VLS_173;
        /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
        vCheckbox;
        // @ts-ignore
        const __VLS_174 = __VLS_asFunctionalComponent1(__VLS_173, new __VLS_173({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_evidencia)),
            label: "Requiere evidencia",
            hideDetails: true,
        }));
        const __VLS_175 = __VLS_174({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (Boolean(item.requiere_evidencia)),
            label: "Requiere evidencia",
            hideDetails: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_174));
        let __VLS_178;
        const __VLS_179 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureActivity(index, 'requiere_evidencia', $event);
                    // @ts-ignore
                    [updateProcedureActivity,];
                } });
        var __VLS_176;
        var __VLS_177;
        // @ts-ignore
        [];
        var __VLS_170;
        let __VLS_180;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent1(__VLS_180, new __VLS_180({
            cols: "12",
        }));
        const __VLS_182 = __VLS_181({
            cols: "12",
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        const { default: __VLS_185 } = __VLS_183.slots;
        let __VLS_186;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_187 = __VLS_asFunctionalComponent1(__VLS_186, new __VLS_186({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.procedureEvidenceTypes(item)),
            items: (__VLS_ctx.evidenceTypeOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Evidencia sugerida",
            variant: "outlined",
            density: "compact",
            multiple: true,
            chips: true,
            closableChips: true,
        }));
        const __VLS_188 = __VLS_187({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.procedureEvidenceTypes(item)),
            items: (__VLS_ctx.evidenceTypeOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Evidencia sugerida",
            variant: "outlined",
            density: "compact",
            multiple: true,
            chips: true,
            closableChips: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_187));
        let __VLS_191;
        const __VLS_192 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    __VLS_ctx.updateProcedureEvidence(index, $event);
                    // @ts-ignore
                    [procedureEvidenceTypes, evidenceTypeOptions, updateProcedureEvidence,];
                } });
        var __VLS_189;
        var __VLS_190;
        // @ts-ignore
        [];
        var __VLS_183;
        // @ts-ignore
        [];
        var __VLS_47;
        // @ts-ignore
        [];
        var __VLS_34;
        // @ts-ignore
        [];
    }
    if (!__VLS_ctx.procedureActivities.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
}
else if (__VLS_ctx.field.editor === 'relation-multi-select') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "structured-field" },
    });
    /** @type {__VLS_StyleScopedClasses['structured-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-medium mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.repairText(__VLS_ctx.field.label));
    let __VLS_193;
    /** @ts-ignore @type {typeof __VLS_components.vAutocomplete | typeof __VLS_components.VAutocomplete} */
    vAutocomplete;
    // @ts-ignore
    const __VLS_194 = __VLS_asFunctionalComponent1(__VLS_193, new __VLS_193({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.relationMultiSelectValue),
        items: (__VLS_ctx.filteredRelationMultiSelectOptions),
        itemTitle: "title",
        itemValue: "value",
        label: (__VLS_ctx.repairText(__VLS_ctx.field.label)),
        variant: "outlined",
        density: "comfortable",
        multiple: true,
        chips: true,
        closableChips: true,
        disabled: (__VLS_ctx.requiresWarehouseSelection && !__VLS_ctx.selectedWarehouseId),
        hint: (__VLS_ctx.requiresWarehouseSelection && !__VLS_ctx.selectedWarehouseId ? 'Selecciona primero la bodega.' : ''),
        persistentHint: true,
        noDataText: "No hay materiales disponibles para este filtro",
    }));
    const __VLS_195 = __VLS_194({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.relationMultiSelectValue),
        items: (__VLS_ctx.filteredRelationMultiSelectOptions),
        itemTitle: "title",
        itemValue: "value",
        label: (__VLS_ctx.repairText(__VLS_ctx.field.label)),
        variant: "outlined",
        density: "comfortable",
        multiple: true,
        chips: true,
        closableChips: true,
        disabled: (__VLS_ctx.requiresWarehouseSelection && !__VLS_ctx.selectedWarehouseId),
        hint: (__VLS_ctx.requiresWarehouseSelection && !__VLS_ctx.selectedWarehouseId ? 'Selecciona primero la bodega.' : ''),
        persistentHint: true,
        noDataText: "No hay materiales disponibles para este filtro",
    }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    let __VLS_198;
    const __VLS_199 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.updateRelationMultiSelect) });
    var __VLS_196;
    var __VLS_197;
    if (__VLS_ctx.relationMultiSelectValue.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chip-list" },
        });
        /** @type {__VLS_StyleScopedClasses['chip-list']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.relationMultiSelectValue))) {
            let __VLS_200;
            /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
            vChip;
            // @ts-ignore
            const __VLS_201 = __VLS_asFunctionalComponent1(__VLS_200, new __VLS_200({
                ...{ 'onClick:close': {} },
                key: (`${__VLS_ctx.field.key}-${item}`),
                size: "small",
                closable: true,
            }));
            const __VLS_202 = __VLS_201({
                ...{ 'onClick:close': {} },
                key: (`${__VLS_ctx.field.key}-${item}`),
                size: "small",
                closable: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_201));
            let __VLS_205;
            const __VLS_206 = ({ 'click:close': {} },
                { 'onClick:close': (...[$event]) => {
                        if (!!(__VLS_ctx.field.editor === 'string-list'))
                            return;
                        if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                            return;
                        if (!(__VLS_ctx.field.editor === 'relation-multi-select'))
                            return;
                        if (!(__VLS_ctx.relationMultiSelectValue.length))
                            return;
                        __VLS_ctx.removeRelationMultiSelectItem(item);
                        // @ts-ignore
                        [field, field, field, field, repairText, repairText, procedureActivities, relationMultiSelectValue, relationMultiSelectValue, relationMultiSelectValue, filteredRelationMultiSelectOptions, requiresWarehouseSelection, requiresWarehouseSelection, selectedWarehouseId, selectedWarehouseId, updateRelationMultiSelect, removeRelationMultiSelectItem,];
                    } });
            const { default: __VLS_207 } = __VLS_203.slots;
            (__VLS_ctx.resolveRelationMultiSelectLabel(item));
            // @ts-ignore
            [resolveRelationMultiSelectLabel,];
            var __VLS_203;
            var __VLS_204;
            // @ts-ignore
            [];
        }
    }
}
else if (__VLS_ctx.field.editor === 'analysis-details') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "structured-field" },
    });
    /** @type {__VLS_StyleScopedClasses['structured-field']} */ ;
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
        ...{ class: "text-subtitle-2 font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.repairText(__VLS_ctx.field.label));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    let __VLS_208;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent1(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_213;
    const __VLS_214 = ({ click: {} },
        { onClick: (__VLS_ctx.addAnalysisDetail) });
    const { default: __VLS_215 } = __VLS_211.slots;
    // @ts-ignore
    [field, field, repairText, addAnalysisDetail,];
    var __VLS_211;
    var __VLS_212;
    for (const [item, index] of __VLS_vFor((__VLS_ctx.analysisDetails))) {
        let __VLS_216;
        /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
        vCard;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent1(__VLS_216, new __VLS_216({
            key: (`analysis-${index}`),
            rounded: "lg",
            variant: "outlined",
            ...{ class: "pa-3 mb-3" },
        }));
        const __VLS_218 = __VLS_217({
            key: (`analysis-${index}`),
            rounded: "lg",
            variant: "outlined",
            ...{ class: "pa-3 mb-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_217));
        /** @type {__VLS_StyleScopedClasses['pa-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        const { default: __VLS_221 } = __VLS_219.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "d-flex align-center justify-space-between mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-subtitle-2 font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (index + 1);
        let __VLS_222;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_223 = __VLS_asFunctionalComponent1(__VLS_222, new __VLS_222({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }));
        const __VLS_224 = __VLS_223({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_223));
        let __VLS_227;
        const __VLS_228 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.removeAnalysisDetail(index);
                    // @ts-ignore
                    [analysisDetails, removeAnalysisDetail,];
                } });
        var __VLS_225;
        var __VLS_226;
        let __VLS_229;
        /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
        vRow;
        // @ts-ignore
        const __VLS_230 = __VLS_asFunctionalComponent1(__VLS_229, new __VLS_229({
            dense: true,
        }));
        const __VLS_231 = __VLS_230({
            dense: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_230));
        const { default: __VLS_234 } = __VLS_232.slots;
        let __VLS_235;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_236 = __VLS_asFunctionalComponent1(__VLS_235, new __VLS_235({
            cols: "12",
            md: "3",
        }));
        const __VLS_237 = __VLS_236({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_236));
        const { default: __VLS_240 } = __VLS_238.slots;
        let __VLS_241;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_242 = __VLS_asFunctionalComponent1(__VLS_241, new __VLS_241({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.compartimento ?? ''),
            label: "Compartimento",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_243 = __VLS_242({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.compartimento ?? ''),
            label: "Compartimento",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_242));
        let __VLS_246;
        const __VLS_247 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'compartimento', $event);
                    // @ts-ignore
                    [updateAnalysisDetail,];
                } });
        var __VLS_244;
        var __VLS_245;
        // @ts-ignore
        [];
        var __VLS_238;
        let __VLS_248;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_249 = __VLS_asFunctionalComponent1(__VLS_248, new __VLS_248({
            cols: "12",
            md: "3",
        }));
        const __VLS_250 = __VLS_249({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_249));
        const { default: __VLS_253 } = __VLS_251.slots;
        let __VLS_254;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_255 = __VLS_asFunctionalComponent1(__VLS_254, new __VLS_254({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.numero_muestra ?? ''),
            label: "Numero muestra",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_256 = __VLS_255({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.numero_muestra ?? ''),
            label: "Numero muestra",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_255));
        let __VLS_259;
        const __VLS_260 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'numero_muestra', $event);
                    // @ts-ignore
                    [updateAnalysisDetail,];
                } });
        var __VLS_257;
        var __VLS_258;
        // @ts-ignore
        [];
        var __VLS_251;
        let __VLS_261;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_262 = __VLS_asFunctionalComponent1(__VLS_261, new __VLS_261({
            cols: "12",
            md: "3",
        }));
        const __VLS_263 = __VLS_262({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_262));
        const { default: __VLS_266 } = __VLS_264.slots;
        let __VLS_267;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_268 = __VLS_asFunctionalComponent1(__VLS_267, new __VLS_267({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.parametro ?? ''),
            label: "Parametro",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_269 = __VLS_268({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.parametro ?? ''),
            label: "Parametro",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_268));
        let __VLS_272;
        const __VLS_273 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'parametro', $event);
                    // @ts-ignore
                    [updateAnalysisDetail,];
                } });
        var __VLS_270;
        var __VLS_271;
        // @ts-ignore
        [];
        var __VLS_264;
        let __VLS_274;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_275 = __VLS_asFunctionalComponent1(__VLS_274, new __VLS_274({
            cols: "12",
            md: "3",
        }));
        const __VLS_276 = __VLS_275({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_275));
        const { default: __VLS_279 } = __VLS_277.slots;
        let __VLS_280;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_281 = __VLS_asFunctionalComponent1(__VLS_280, new __VLS_280({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.nivel_alerta ?? 'NORMAL'),
            items: (__VLS_ctx.alertLevelOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Nivel alerta",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_282 = __VLS_281({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.nivel_alerta ?? 'NORMAL'),
            items: (__VLS_ctx.alertLevelOptions),
            itemTitle: "title",
            itemValue: "value",
            label: "Nivel alerta",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_281));
        let __VLS_285;
        const __VLS_286 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'nivel_alerta', $event);
                    // @ts-ignore
                    [updateAnalysisDetail, alertLevelOptions,];
                } });
        var __VLS_283;
        var __VLS_284;
        // @ts-ignore
        [];
        var __VLS_277;
        let __VLS_287;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_288 = __VLS_asFunctionalComponent1(__VLS_287, new __VLS_287({
            cols: "12",
            md: "3",
        }));
        const __VLS_289 = __VLS_288({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_288));
        const { default: __VLS_292 } = __VLS_290.slots;
        let __VLS_293;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_294 = __VLS_asFunctionalComponent1(__VLS_293, new __VLS_293({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.resultado_numerico ?? ''),
            label: "Resultado numerico",
            type: "number",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_295 = __VLS_294({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.resultado_numerico ?? ''),
            label: "Resultado numerico",
            type: "number",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_294));
        let __VLS_298;
        const __VLS_299 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'resultado_numerico', __VLS_ctx.asNullableNumber($event));
                    // @ts-ignore
                    [updateAnalysisDetail, asNullableNumber,];
                } });
        var __VLS_296;
        var __VLS_297;
        // @ts-ignore
        [];
        var __VLS_290;
        let __VLS_300;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_301 = __VLS_asFunctionalComponent1(__VLS_300, new __VLS_300({
            cols: "12",
            md: "3",
        }));
        const __VLS_302 = __VLS_301({
            cols: "12",
            md: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_301));
        const { default: __VLS_305 } = __VLS_303.slots;
        let __VLS_306;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_307 = __VLS_asFunctionalComponent1(__VLS_306, new __VLS_306({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.resultado_texto ?? ''),
            label: "Resultado texto",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_308 = __VLS_307({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.resultado_texto ?? ''),
            label: "Resultado texto",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_307));
        let __VLS_311;
        const __VLS_312 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'resultado_texto', $event);
                    // @ts-ignore
                    [updateAnalysisDetail,];
                } });
        var __VLS_309;
        var __VLS_310;
        // @ts-ignore
        [];
        var __VLS_303;
        let __VLS_313;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_314 = __VLS_asFunctionalComponent1(__VLS_313, new __VLS_313({
            cols: "12",
            md: "2",
        }));
        const __VLS_315 = __VLS_314({
            cols: "12",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_314));
        const { default: __VLS_318 } = __VLS_316.slots;
        let __VLS_319;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_320 = __VLS_asFunctionalComponent1(__VLS_319, new __VLS_319({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.unidad ?? ''),
            label: "Unidad",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_321 = __VLS_320({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.unidad ?? ''),
            label: "Unidad",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_320));
        let __VLS_324;
        const __VLS_325 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'unidad', $event);
                    // @ts-ignore
                    [updateAnalysisDetail,];
                } });
        var __VLS_322;
        var __VLS_323;
        // @ts-ignore
        [];
        var __VLS_316;
        let __VLS_326;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_327 = __VLS_asFunctionalComponent1(__VLS_326, new __VLS_326({
            cols: "12",
            md: "2",
        }));
        const __VLS_328 = __VLS_327({
            cols: "12",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_327));
        const { default: __VLS_331 } = __VLS_329.slots;
        let __VLS_332;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_333 = __VLS_asFunctionalComponent1(__VLS_332, new __VLS_332({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.linea_base ?? ''),
            label: "Linea base",
            type: "number",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_334 = __VLS_333({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.linea_base ?? ''),
            label: "Linea base",
            type: "number",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_333));
        let __VLS_337;
        const __VLS_338 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'linea_base', __VLS_ctx.asNullableNumber($event));
                    // @ts-ignore
                    [updateAnalysisDetail, asNullableNumber,];
                } });
        var __VLS_335;
        var __VLS_336;
        // @ts-ignore
        [];
        var __VLS_329;
        let __VLS_339;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_340 = __VLS_asFunctionalComponent1(__VLS_339, new __VLS_339({
            cols: "12",
            md: "2",
        }));
        const __VLS_341 = __VLS_340({
            cols: "12",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_340));
        const { default: __VLS_344 } = __VLS_342.slots;
        let __VLS_345;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_346 = __VLS_asFunctionalComponent1(__VLS_345, new __VLS_345({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.tendencia ?? ''),
            label: "Tendencia",
            type: "number",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_347 = __VLS_346({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.tendencia ?? ''),
            label: "Tendencia",
            type: "number",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_346));
        let __VLS_350;
        const __VLS_351 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'tendencia', __VLS_ctx.asNullableNumber($event));
                    // @ts-ignore
                    [updateAnalysisDetail, asNullableNumber,];
                } });
        var __VLS_348;
        var __VLS_349;
        // @ts-ignore
        [];
        var __VLS_342;
        let __VLS_352;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_353 = __VLS_asFunctionalComponent1(__VLS_352, new __VLS_352({
            cols: "12",
        }));
        const __VLS_354 = __VLS_353({
            cols: "12",
        }, ...__VLS_functionalComponentArgsRest(__VLS_353));
        const { default: __VLS_357 } = __VLS_355.slots;
        let __VLS_358;
        /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
        vTextarea;
        // @ts-ignore
        const __VLS_359 = __VLS_asFunctionalComponent1(__VLS_358, new __VLS_358({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.observacion ?? ''),
            label: "Observacion",
            variant: "outlined",
            rows: "2",
            autoGrow: true,
            density: "compact",
        }));
        const __VLS_360 = __VLS_359({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.observacion ?? ''),
            label: "Observacion",
            variant: "outlined",
            rows: "2",
            autoGrow: true,
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_359));
        let __VLS_363;
        const __VLS_364 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    __VLS_ctx.updateAnalysisDetail(index, 'observacion', $event);
                    // @ts-ignore
                    [updateAnalysisDetail,];
                } });
        var __VLS_361;
        var __VLS_362;
        // @ts-ignore
        [];
        var __VLS_355;
        // @ts-ignore
        [];
        var __VLS_232;
        // @ts-ignore
        [];
        var __VLS_219;
        // @ts-ignore
        [];
    }
    if (!__VLS_ctx.analysisDetails.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
}
else if (__VLS_ctx.field.editor === 'analysis-payload') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "structured-field" },
    });
    /** @type {__VLS_StyleScopedClasses['structured-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-medium mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    (__VLS_ctx.repairText(__VLS_ctx.field.label));
    let __VLS_365;
    /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
    vRow;
    // @ts-ignore
    const __VLS_366 = __VLS_asFunctionalComponent1(__VLS_365, new __VLS_365({
        dense: true,
    }));
    const __VLS_367 = __VLS_366({
        dense: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_366));
    const { default: __VLS_370 } = __VLS_368.slots;
    let __VLS_371;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_372 = __VLS_asFunctionalComponent1(__VLS_371, new __VLS_371({
        cols: "12",
        md: "4",
    }));
    const __VLS_373 = __VLS_372({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_372));
    const { default: __VLS_376 } = __VLS_374.slots;
    let __VLS_377;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_378 = __VLS_asFunctionalComponent1(__VLS_377, new __VLS_377({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.laboratorio ?? ''),
        label: "Laboratorio",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_379 = __VLS_378({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.laboratorio ?? ''),
        label: "Laboratorio",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_378));
    let __VLS_382;
    const __VLS_383 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                if (!!(__VLS_ctx.field.editor === 'string-list'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                    return;
                if (!(__VLS_ctx.field.editor === 'analysis-payload'))
                    return;
                __VLS_ctx.updateAnalysisPayload('laboratorio', $event);
                // @ts-ignore
                [field, field, repairText, analysisDetails, analysisPayload, updateAnalysisPayload,];
            } });
    var __VLS_380;
    var __VLS_381;
    // @ts-ignore
    [];
    var __VLS_374;
    let __VLS_384;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_385 = __VLS_asFunctionalComponent1(__VLS_384, new __VLS_384({
        cols: "12",
        md: "4",
    }));
    const __VLS_386 = __VLS_385({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_385));
    const { default: __VLS_389 } = __VLS_387.slots;
    let __VLS_390;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_391 = __VLS_asFunctionalComponent1(__VLS_390, new __VLS_390({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.numero_informe ?? ''),
        label: "Numero informe",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_392 = __VLS_391({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.numero_informe ?? ''),
        label: "Numero informe",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_391));
    let __VLS_395;
    const __VLS_396 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                if (!!(__VLS_ctx.field.editor === 'string-list'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                    return;
                if (!(__VLS_ctx.field.editor === 'analysis-payload'))
                    return;
                __VLS_ctx.updateAnalysisPayload('numero_informe', $event);
                // @ts-ignore
                [analysisPayload, updateAnalysisPayload,];
            } });
    var __VLS_393;
    var __VLS_394;
    // @ts-ignore
    [];
    var __VLS_387;
    let __VLS_397;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_398 = __VLS_asFunctionalComponent1(__VLS_397, new __VLS_397({
        cols: "12",
        md: "4",
    }));
    const __VLS_399 = __VLS_398({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_398));
    const { default: __VLS_402 } = __VLS_400.slots;
    let __VLS_403;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_404 = __VLS_asFunctionalComponent1(__VLS_403, new __VLS_403({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.tecnico_responsable ?? ''),
        label: "Tecnico responsable",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_405 = __VLS_404({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.tecnico_responsable ?? ''),
        label: "Tecnico responsable",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_404));
    let __VLS_408;
    const __VLS_409 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                if (!!(__VLS_ctx.field.editor === 'string-list'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                    return;
                if (!(__VLS_ctx.field.editor === 'analysis-payload'))
                    return;
                __VLS_ctx.updateAnalysisPayload('tecnico_responsable', $event);
                // @ts-ignore
                [analysisPayload, updateAnalysisPayload,];
            } });
    var __VLS_406;
    var __VLS_407;
    // @ts-ignore
    [];
    var __VLS_400;
    let __VLS_410;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_411 = __VLS_asFunctionalComponent1(__VLS_410, new __VLS_410({
        cols: "12",
        md: "4",
    }));
    const __VLS_412 = __VLS_411({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_411));
    const { default: __VLS_415 } = __VLS_413.slots;
    let __VLS_416;
    /** @ts-ignore @type {typeof __VLS_components.vCheckbox | typeof __VLS_components.VCheckbox} */
    vCheckbox;
    // @ts-ignore
    const __VLS_417 = __VLS_asFunctionalComponent1(__VLS_416, new __VLS_416({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (Boolean(__VLS_ctx.analysisPayload.requiere_accion)),
        label: "Requiere accion",
        hideDetails: true,
    }));
    const __VLS_418 = __VLS_417({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (Boolean(__VLS_ctx.analysisPayload.requiere_accion)),
        label: "Requiere accion",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_417));
    let __VLS_421;
    const __VLS_422 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                if (!!(__VLS_ctx.field.editor === 'string-list'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                    return;
                if (!(__VLS_ctx.field.editor === 'analysis-payload'))
                    return;
                __VLS_ctx.updateAnalysisPayload('requiere_accion', $event);
                // @ts-ignore
                [analysisPayload, updateAnalysisPayload,];
            } });
    var __VLS_419;
    var __VLS_420;
    // @ts-ignore
    [];
    var __VLS_413;
    let __VLS_423;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_424 = __VLS_asFunctionalComponent1(__VLS_423, new __VLS_423({
        cols: "12",
        md: "4",
    }));
    const __VLS_425 = __VLS_424({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_424));
    const { default: __VLS_428 } = __VLS_426.slots;
    let __VLS_429;
    /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
    vSelect;
    // @ts-ignore
    const __VLS_430 = __VLS_asFunctionalComponent1(__VLS_429, new __VLS_429({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.prioridad ?? 'MEDIA'),
        items: (__VLS_ctx.priorityOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Prioridad",
        variant: "outlined",
        density: "compact",
    }));
    const __VLS_431 = __VLS_430({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.prioridad ?? 'MEDIA'),
        items: (__VLS_ctx.priorityOptions),
        itemTitle: "title",
        itemValue: "value",
        label: "Prioridad",
        variant: "outlined",
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_430));
    let __VLS_434;
    const __VLS_435 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                if (!!(__VLS_ctx.field.editor === 'string-list'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                    return;
                if (!(__VLS_ctx.field.editor === 'analysis-payload'))
                    return;
                __VLS_ctx.updateAnalysisPayload('prioridad', $event);
                // @ts-ignore
                [analysisPayload, updateAnalysisPayload, priorityOptions,];
            } });
    var __VLS_432;
    var __VLS_433;
    // @ts-ignore
    [];
    var __VLS_426;
    let __VLS_436;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_437 = __VLS_asFunctionalComponent1(__VLS_436, new __VLS_436({
        cols: "12",
        md: "4",
    }));
    const __VLS_438 = __VLS_437({
        cols: "12",
        md: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_437));
    const { default: __VLS_441 } = __VLS_439.slots;
    let __VLS_442;
    /** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
    vFileInput;
    // @ts-ignore
    const __VLS_443 = __VLS_asFunctionalComponent1(__VLS_442, new __VLS_442({
        ...{ 'onUpdate:modelValue': {} },
        multiple: true,
        showSize: true,
        label: "Adjuntos de referencia",
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-paperclip",
    }));
    const __VLS_444 = __VLS_443({
        ...{ 'onUpdate:modelValue': {} },
        multiple: true,
        showSize: true,
        label: "Adjuntos de referencia",
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-paperclip",
    }, ...__VLS_functionalComponentArgsRest(__VLS_443));
    let __VLS_447;
    const __VLS_448 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.handleAnalysisAttachments) });
    var __VLS_445;
    var __VLS_446;
    // @ts-ignore
    [handleAnalysisAttachments,];
    var __VLS_439;
    let __VLS_449;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_450 = __VLS_asFunctionalComponent1(__VLS_449, new __VLS_449({
        cols: "12",
    }));
    const __VLS_451 = __VLS_450({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_450));
    const { default: __VLS_454 } = __VLS_452.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chip-list mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['chip-list']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [item, index] of __VLS_vFor((__VLS_ctx.analysisFlags))) {
        let __VLS_455;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_456 = __VLS_asFunctionalComponent1(__VLS_455, new __VLS_455({
            ...{ 'onClick:close': {} },
            key: (`flag-${index}-${item}`),
            closable: true,
            size: "small",
            color: "warning",
            variant: "tonal",
        }));
        const __VLS_457 = __VLS_456({
            ...{ 'onClick:close': {} },
            key: (`flag-${index}-${item}`),
            closable: true,
            size: "small",
            color: "warning",
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_456));
        let __VLS_460;
        const __VLS_461 = ({ 'click:close': {} },
            { 'onClick:close': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'analysis-payload'))
                        return;
                    __VLS_ctx.removeAnalysisFlag(index);
                    // @ts-ignore
                    [analysisFlags, removeAnalysisFlag,];
                } });
        const { default: __VLS_462 } = __VLS_458.slots;
        (item);
        // @ts-ignore
        [];
        var __VLS_458;
        var __VLS_459;
        // @ts-ignore
        [];
    }
    if (!__VLS_ctx.analysisFlags.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-start" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-start']} */ ;
    let __VLS_463;
    /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
    vTextField;
    // @ts-ignore
    const __VLS_464 = __VLS_asFunctionalComponent1(__VLS_463, new __VLS_463({
        ...{ 'onKeydown': {} },
        modelValue: (__VLS_ctx.drafts[`${__VLS_ctx.field.key}-flag`]),
        label: "Agregar bandera",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
    }));
    const __VLS_465 = __VLS_464({
        ...{ 'onKeydown': {} },
        modelValue: (__VLS_ctx.drafts[`${__VLS_ctx.field.key}-flag`]),
        label: "Agregar bandera",
        variant: "outlined",
        density: "compact",
        hideDetails: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_464));
    let __VLS_468;
    const __VLS_469 = ({ keydown: {} },
        { onKeydown: (__VLS_ctx.addAnalysisFlag) });
    var __VLS_466;
    var __VLS_467;
    let __VLS_470;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_471 = __VLS_asFunctionalComponent1(__VLS_470, new __VLS_470({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_472 = __VLS_471({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_471));
    let __VLS_475;
    const __VLS_476 = ({ click: {} },
        { onClick: (__VLS_ctx.addAnalysisFlag) });
    const { default: __VLS_477 } = __VLS_473.slots;
    // @ts-ignore
    [field, drafts, analysisFlags, addAnalysisFlag, addAnalysisFlag,];
    var __VLS_473;
    var __VLS_474;
    // @ts-ignore
    [];
    var __VLS_452;
    let __VLS_478;
    /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
    vCol;
    // @ts-ignore
    const __VLS_479 = __VLS_asFunctionalComponent1(__VLS_478, new __VLS_478({
        cols: "12",
    }));
    const __VLS_480 = __VLS_479({
        cols: "12",
    }, ...__VLS_functionalComponentArgsRest(__VLS_479));
    const { default: __VLS_483 } = __VLS_481.slots;
    let __VLS_484;
    /** @ts-ignore @type {typeof __VLS_components.vTextarea | typeof __VLS_components.VTextarea} */
    vTextarea;
    // @ts-ignore
    const __VLS_485 = __VLS_asFunctionalComponent1(__VLS_484, new __VLS_484({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.observaciones ?? ''),
        label: "Observaciones auxiliares",
        variant: "outlined",
        rows: "2",
        autoGrow: true,
        density: "compact",
    }));
    const __VLS_486 = __VLS_485({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.analysisPayload.observaciones ?? ''),
        label: "Observaciones auxiliares",
        variant: "outlined",
        rows: "2",
        autoGrow: true,
        density: "compact",
    }, ...__VLS_functionalComponentArgsRest(__VLS_485));
    let __VLS_489;
    const __VLS_490 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (...[$event]) => {
                if (!!(__VLS_ctx.field.editor === 'string-list'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                    return;
                if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                    return;
                if (!(__VLS_ctx.field.editor === 'analysis-payload'))
                    return;
                __VLS_ctx.updateAnalysisPayload('observaciones', $event);
                // @ts-ignore
                [analysisPayload, updateAnalysisPayload,];
            } });
    var __VLS_487;
    var __VLS_488;
    // @ts-ignore
    [];
    var __VLS_481;
    // @ts-ignore
    [];
    var __VLS_368;
    if (__VLS_ctx.analysisAttachments.length) {
        let __VLS_491;
        /** @ts-ignore @type {typeof __VLS_components.vList | typeof __VLS_components.VList | typeof __VLS_components.vList | typeof __VLS_components.VList} */
        vList;
        // @ts-ignore
        const __VLS_492 = __VLS_asFunctionalComponent1(__VLS_491, new __VLS_491({
            density: "compact",
            ...{ class: "bg-transparent pa-0 mt-2" },
        }));
        const __VLS_493 = __VLS_492({
            density: "compact",
            ...{ class: "bg-transparent pa-0 mt-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_492));
        /** @type {__VLS_StyleScopedClasses['bg-transparent']} */ ;
        /** @type {__VLS_StyleScopedClasses['pa-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        const { default: __VLS_496 } = __VLS_494.slots;
        for (const [item, index] of __VLS_vFor((__VLS_ctx.analysisAttachments))) {
            let __VLS_497;
            /** @ts-ignore @type {typeof __VLS_components.vListItem | typeof __VLS_components.VListItem} */
            vListItem;
            // @ts-ignore
            const __VLS_498 = __VLS_asFunctionalComponent1(__VLS_497, new __VLS_497({
                key: (`attachment-${index}-${item.nombre}`),
                title: (item.nombre),
                subtitle: (`${item.tipo || 'sin tipo'} · ${item.tamano_kb || 0} KB`),
                ...{ class: "px-0" },
            }));
            const __VLS_499 = __VLS_498({
                key: (`attachment-${index}-${item.nombre}`),
                title: (item.nombre),
                subtitle: (`${item.tipo || 'sin tipo'} · ${item.tamano_kb || 0} KB`),
                ...{ class: "px-0" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_498));
            /** @type {__VLS_StyleScopedClasses['px-0']} */ ;
            // @ts-ignore
            [analysisAttachments, analysisAttachments,];
        }
        // @ts-ignore
        [];
        var __VLS_494;
    }
}
else if (__VLS_ctx.field.editor === 'issue-items') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "structured-field" },
    });
    /** @type {__VLS_StyleScopedClasses['structured-field']} */ ;
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
        ...{ class: "text-subtitle-2 font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.repairText(__VLS_ctx.field.label));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    let __VLS_502;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn | typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_503 = __VLS_asFunctionalComponent1(__VLS_502, new __VLS_502({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }));
    const __VLS_504 = __VLS_503({
        ...{ 'onClick': {} },
        color: "primary",
        variant: "tonal",
        prependIcon: "mdi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_503));
    let __VLS_507;
    const __VLS_508 = ({ click: {} },
        { onClick: (__VLS_ctx.addIssueItem) });
    const { default: __VLS_509 } = __VLS_505.slots;
    // @ts-ignore
    [field, field, repairText, addIssueItem,];
    var __VLS_505;
    var __VLS_506;
    for (const [item, index] of __VLS_vFor((__VLS_ctx.issueItems))) {
        let __VLS_510;
        /** @ts-ignore @type {typeof __VLS_components.vRow | typeof __VLS_components.VRow | typeof __VLS_components.vRow | typeof __VLS_components.VRow} */
        vRow;
        // @ts-ignore
        const __VLS_511 = __VLS_asFunctionalComponent1(__VLS_510, new __VLS_510({
            key: (`issue-${index}`),
            dense: true,
            ...{ class: "mb-1" },
        }));
        const __VLS_512 = __VLS_511({
            key: (`issue-${index}`),
            dense: true,
            ...{ class: "mb-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_511));
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        const { default: __VLS_515 } = __VLS_513.slots;
        let __VLS_516;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_517 = __VLS_asFunctionalComponent1(__VLS_516, new __VLS_516({
            cols: "12",
            md: "4",
        }));
        const __VLS_518 = __VLS_517({
            cols: "12",
            md: "4",
        }, ...__VLS_functionalComponentArgsRest(__VLS_517));
        const { default: __VLS_521 } = __VLS_519.slots;
        let __VLS_522;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_523 = __VLS_asFunctionalComponent1(__VLS_522, new __VLS_522({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.bodega_id ?? null),
            items: (__VLS_ctx.relationOptions.bodega_id ?? []),
            itemTitle: "title",
            itemValue: "value",
            label: "Bodega",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_524 = __VLS_523({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.bodega_id ?? null),
            items: (__VLS_ctx.relationOptions.bodega_id ?? []),
            itemTitle: "title",
            itemValue: "value",
            label: "Bodega",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_523));
        let __VLS_527;
        const __VLS_528 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-payload'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'issue-items'))
                        return;
                    __VLS_ctx.updateIssueItem(index, 'bodega_id', $event);
                    // @ts-ignore
                    [issueItems, relationOptions, updateIssueItem,];
                } });
        var __VLS_525;
        var __VLS_526;
        // @ts-ignore
        [];
        var __VLS_519;
        let __VLS_529;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_530 = __VLS_asFunctionalComponent1(__VLS_529, new __VLS_529({
            cols: "12",
            md: "5",
        }));
        const __VLS_531 = __VLS_530({
            cols: "12",
            md: "5",
        }, ...__VLS_functionalComponentArgsRest(__VLS_530));
        const { default: __VLS_534 } = __VLS_532.slots;
        let __VLS_535;
        /** @ts-ignore @type {typeof __VLS_components.vSelect | typeof __VLS_components.VSelect} */
        vSelect;
        // @ts-ignore
        const __VLS_536 = __VLS_asFunctionalComponent1(__VLS_535, new __VLS_535({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.producto_id ?? null),
            items: (__VLS_ctx.getIssueProductOptions(item.bodega_id)),
            itemTitle: "title",
            itemValue: "value",
            label: "Material",
            variant: "outlined",
            density: "compact",
            disabled: (!item.bodega_id),
        }));
        const __VLS_537 = __VLS_536({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.producto_id ?? null),
            items: (__VLS_ctx.getIssueProductOptions(item.bodega_id)),
            itemTitle: "title",
            itemValue: "value",
            label: "Material",
            variant: "outlined",
            density: "compact",
            disabled: (!item.bodega_id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_536));
        let __VLS_540;
        const __VLS_541 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-payload'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'issue-items'))
                        return;
                    __VLS_ctx.updateIssueItem(index, 'producto_id', $event);
                    // @ts-ignore
                    [updateIssueItem, getIssueProductOptions,];
                } });
        var __VLS_538;
        var __VLS_539;
        // @ts-ignore
        [];
        var __VLS_532;
        let __VLS_542;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_543 = __VLS_asFunctionalComponent1(__VLS_542, new __VLS_542({
            cols: "10",
            md: "2",
        }));
        const __VLS_544 = __VLS_543({
            cols: "10",
            md: "2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_543));
        const { default: __VLS_547 } = __VLS_545.slots;
        let __VLS_548;
        /** @ts-ignore @type {typeof __VLS_components.vTextField | typeof __VLS_components.VTextField} */
        vTextField;
        // @ts-ignore
        const __VLS_549 = __VLS_asFunctionalComponent1(__VLS_548, new __VLS_548({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.cantidad ?? 1),
            label: "Cantidad",
            type: "number",
            variant: "outlined",
            density: "compact",
        }));
        const __VLS_550 = __VLS_549({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (item.cantidad ?? 1),
            label: "Cantidad",
            type: "number",
            variant: "outlined",
            density: "compact",
        }, ...__VLS_functionalComponentArgsRest(__VLS_549));
        let __VLS_553;
        const __VLS_554 = ({ 'update:modelValue': {} },
            { 'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-payload'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'issue-items'))
                        return;
                    __VLS_ctx.updateIssueItem(index, 'cantidad', __VLS_ctx.asNumber($event, 1));
                    // @ts-ignore
                    [asNumber, updateIssueItem,];
                } });
        var __VLS_551;
        var __VLS_552;
        // @ts-ignore
        [];
        var __VLS_545;
        let __VLS_555;
        /** @ts-ignore @type {typeof __VLS_components.vCol | typeof __VLS_components.VCol | typeof __VLS_components.vCol | typeof __VLS_components.VCol} */
        vCol;
        // @ts-ignore
        const __VLS_556 = __VLS_asFunctionalComponent1(__VLS_555, new __VLS_555({
            cols: "2",
            md: "1",
            ...{ class: "d-flex align-center justify-end" },
        }));
        const __VLS_557 = __VLS_556({
            cols: "2",
            md: "1",
            ...{ class: "d-flex align-center justify-end" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_556));
        /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
        const { default: __VLS_560 } = __VLS_558.slots;
        let __VLS_561;
        /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
        vBtn;
        // @ts-ignore
        const __VLS_562 = __VLS_asFunctionalComponent1(__VLS_561, new __VLS_561({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }));
        const __VLS_563 = __VLS_562({
            ...{ 'onClick': {} },
            icon: "mdi-delete",
            size: "small",
            variant: "text",
            color: "error",
        }, ...__VLS_functionalComponentArgsRest(__VLS_562));
        let __VLS_566;
        const __VLS_567 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.field.editor === 'string-list'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'procedure-activities'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'relation-multi-select'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-details'))
                        return;
                    if (!!(__VLS_ctx.field.editor === 'analysis-payload'))
                        return;
                    if (!(__VLS_ctx.field.editor === 'issue-items'))
                        return;
                    __VLS_ctx.removeIssueItem(index);
                    // @ts-ignore
                    [removeIssueItem,];
                } });
        var __VLS_564;
        var __VLS_565;
        // @ts-ignore
        [];
        var __VLS_558;
        // @ts-ignore
        [];
        var __VLS_513;
        // @ts-ignore
        [];
    }
    if (!__VLS_ctx.issueItems.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-body-2 text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    }
}
else if (__VLS_ctx.field.editor === 'file-upload') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "structured-field" },
    });
    /** @type {__VLS_StyleScopedClasses['structured-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-2 font-weight-medium mb-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    (__VLS_ctx.repairText(__VLS_ctx.field.label));
    let __VLS_568;
    /** @ts-ignore @type {typeof __VLS_components.vFileInput | typeof __VLS_components.VFileInput} */
    vFileInput;
    // @ts-ignore
    const __VLS_569 = __VLS_asFunctionalComponent1(__VLS_568, new __VLS_568({
        ...{ 'onUpdate:modelValue': {} },
        showSize: true,
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-paperclip",
        label: "Selecciona un documento, imagen o video",
    }));
    const __VLS_570 = __VLS_569({
        ...{ 'onUpdate:modelValue': {} },
        showSize: true,
        variant: "outlined",
        density: "compact",
        prependIcon: "mdi-paperclip",
        label: "Selecciona un documento, imagen o video",
    }, ...__VLS_functionalComponentArgsRest(__VLS_569));
    let __VLS_573;
    const __VLS_574 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.handleSingleFileUpload) });
    var __VLS_571;
    var __VLS_572;
    if (__VLS_ctx.uploadedFileMeta?.nombre) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        (__VLS_ctx.uploadedFileMeta.nombre);
        if (__VLS_ctx.uploadedFileMeta.mime_type) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.uploadedFileMeta.mime_type);
        }
    }
}
// @ts-ignore
[field, field, repairText, issueItems, handleSingleFileUpload, uploadedFileMeta, uploadedFileMeta, uploadedFileMeta, uploadedFileMeta,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};

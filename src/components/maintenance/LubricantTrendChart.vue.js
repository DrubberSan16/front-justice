/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
const props = defineProps();
const dialog = ref(false);
const { mdAndDown } = useDisplay();
const isDialogFullscreen = computed(() => mdAndDown.value);
const selectedPointKey = ref(null);
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const zoomLevel = ref(1);
const miniPadding = {
    left: 44,
    right: 24,
    top: 16,
    bottom: 28,
};
const detailPadding = {
    left: 86,
    right: 34,
    top: 24,
    bottom: 84,
};
function toLevel(value) {
    const raw = String(value ?? "").trim().toUpperCase();
    if (["ALERTA", "ANORMAL", "CRITICO", "CRITICAL"].includes(raw))
        return "alert";
    if (["OBSERVACION", "PRECAUCION", "WARNING"].includes(raw))
        return "warning";
    return "normal";
}
function formatValue(value) {
    const formatted = Number(value).toLocaleString("es-EC", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
    return props.unit ? `${formatted} ${props.unit}` : formatted;
}
function levelColor(level) {
    if (level === "alert")
        return "error";
    if (level === "warning")
        return "warning";
    return "success";
}
function levelTitle(level) {
    if (level === "alert")
        return "ANORMAL";
    if (level === "warning")
        return "PRECAUCION";
    return "NORMAL";
}
const numericPoints = computed(() => props.points
    .map((item, index) => ({
    key: `${item.codigo || item.fecha || "item"}-${index}`,
    codigo: item.codigo ? String(item.codigo) : null,
    label: item.codigo || item.fecha || `P${index + 1}`,
    fecha: item.fecha || null,
    value: Number(item.valor),
    valueLabel: formatValue(Number(item.valor)),
    level: toLevel(item.nivel_alerta),
    index,
}))
    .filter((item) => Number.isFinite(item.value)));
const hasPoints = computed(() => numericPoints.value.length > 0);
const minValue = computed(() => numericPoints.value.length
    ? Math.min(...numericPoints.value.map((item) => item.value))
    : 0);
const maxValue = computed(() => numericPoints.value.length
    ? Math.max(...numericPoints.value.map((item) => item.value))
    : 100);
const safeRange = computed(() => {
    const diff = maxValue.value - minValue.value;
    return diff === 0 ? Math.max(Math.abs(maxValue.value), 1) : diff;
});
function buildChartModel(width, height, padding) {
    const chartWidth = Math.max(width - padding.left - padding.right, 1);
    const chartHeight = Math.max(height - padding.top - padding.bottom, 1);
    const chartBottom = height - padding.bottom;
    const points = numericPoints.value.map((item, index) => {
        const x = numericPoints.value.length === 1
            ? padding.left + chartWidth / 2
            : padding.left + (chartWidth * index) / Math.max(numericPoints.value.length - 1, 1);
        const y = chartBottom - ((item.value - minValue.value) / safeRange.value) * chartHeight;
        return {
            ...item,
            x,
            y,
        };
    });
    const guides = Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        const y = padding.top + chartHeight * ratio;
        const value = maxValue.value - safeRange.value * ratio;
        return {
            key: index,
            y,
            label: formatValue(value),
        };
    });
    return {
        width,
        height,
        padding,
        chartBottom,
        points,
        guides,
        polyline: points.map((item) => `${item.x},${item.y}`).join(" "),
        yMinLabel: formatValue(minValue.value),
        yMaxLabel: formatValue(maxValue.value),
        xStartLabel: points[0]?.fecha || points[0]?.label || "",
        xEndLabel: points[points.length - 1]?.fecha || points[points.length - 1]?.label || "",
    };
}
const miniChart = computed(() => buildChartModel(420, 180, miniPadding));
const detailChartWidth = computed(() => Math.round(Math.max(1080, 180 + numericPoints.value.length * 88) * zoomLevel.value));
const detailChartHeight = computed(() => Math.round(Math.max(430, 430 * Math.min(zoomLevel.value, 2))));
const detailChart = computed(() => buildChartModel(detailChartWidth.value, detailChartHeight.value, detailPadding));
const selectedPoint = computed(() => {
    if (!detailChart.value.points.length)
        return null;
    return (detailChart.value.points.find((item) => item.key === selectedPointKey.value) ||
        detailChart.value.points[detailChart.value.points.length - 1] ||
        null);
});
watch(numericPoints, (points) => {
    if (!points.length) {
        selectedPointKey.value = null;
        dialog.value = false;
        return;
    }
    if (!points.some((item) => item.key === selectedPointKey.value)) {
        selectedPointKey.value = points[points.length - 1]?.key || null;
    }
}, { immediate: true });
const detailLabelStep = computed(() => {
    if (zoomLevel.value >= 1.6 || detailChart.value.points.length <= 8)
        return 1;
    return Math.max(1, Math.ceil(detailChart.value.points.length / 6));
});
function clampZoom(next) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2))));
}
function zoomIn() {
    zoomLevel.value = clampZoom(zoomLevel.value + ZOOM_STEP);
}
function zoomOut() {
    zoomLevel.value = clampZoom(zoomLevel.value - ZOOM_STEP);
}
function resetZoom() {
    zoomLevel.value = 1;
}
function shouldRenderPointLabel(point) {
    return (selectedPointKey.value === point.key ||
        zoomLevel.value >= 1.9 ||
        detailChart.value.points.length <= 6);
}
function shouldRenderXAxisLabel(point) {
    if (zoomLevel.value >= 1.4 || detailChart.value.points.length <= 8)
        return true;
    return (point.index % detailLabelStep.value === 0 ||
        selectedPointKey.value === point.key ||
        point.index === detailChart.value.points.length - 1);
}
function selectPoint(key) {
    selectedPointKey.value = key;
}
function openDialog() {
    if (!hasPoints.value)
        return;
    if (!selectedPointKey.value) {
        selectedPointKey.value = numericPoints.value[numericPoints.value.length - 1]?.key || null;
    }
    zoomLevel.value = 1;
    dialog.value = true;
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
/** @type {__VLS_StyleScopedClasses['chart-card--interactive']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card--interactive']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dot--normal']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dot--warning']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dot--alert']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-point-value']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-table']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dialog-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dialog-side']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dialog-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dialog-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dialog-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-point-detail']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.openDialog) },
    ...{ onKeydown: (__VLS_ctx.openDialog) },
    ...{ onKeydown: (__VLS_ctx.openDialog) },
    ...{ class: (['chart-card', { 'chart-card--interactive': __VLS_ctx.hasPoints }]) },
    role: (__VLS_ctx.hasPoints ? 'button' : undefined),
    tabindex: (__VLS_ctx.hasPoints ? 0 : undefined),
});
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card--interactive']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center justify-space-between mb-2" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-2 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
(__VLS_ctx.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-caption text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
(__VLS_ctx.subtitle);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: "small",
    variant: "tonal",
    color: "primary",
}));
const __VLS_2 = __VLS_1({
    size: "small",
    variant: "tonal",
    color: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
(__VLS_ctx.points.length);
// @ts-ignore
[openDialog, openDialog, openDialog, hasPoints, hasPoints, hasPoints, title, subtitle, points,];
var __VLS_3;
if (__VLS_ctx.hasPoints) {
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
    vBtn;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        ...{ 'onClick': {} },
        icon: "mdi-arrow-expand-all",
        size: "small",
        variant: "text",
        color: "primary",
    }));
    const __VLS_8 = __VLS_7({
        ...{ 'onClick': {} },
        icon: "mdi-arrow-expand-all",
        size: "small",
        variant: "text",
        color: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    let __VLS_11;
    const __VLS_12 = ({ click: {} },
        { onClick: (__VLS_ctx.openDialog) });
    var __VLS_9;
    var __VLS_10;
}
if (!__VLS_ctx.hasPoints) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-empty']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-shell" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-shell']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: (`0 0 ${__VLS_ctx.miniChart.width} ${__VLS_ctx.miniChart.height}`),
        ...{ class: "chart-svg" },
        preserveAspectRatio: "none",
    });
    /** @type {__VLS_StyleScopedClasses['chart-svg']} */ ;
    for (const [guide] of __VLS_vFor((__VLS_ctx.miniChart.guides))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
            key: (`mini-guide-${guide.key}`),
            x1: (__VLS_ctx.miniChart.padding.left),
            x2: (__VLS_ctx.miniChart.width - __VLS_ctx.miniChart.padding.right),
            y1: (guide.y),
            y2: (guide.y),
            ...{ class: "chart-guide" },
        });
        /** @type {__VLS_StyleScopedClasses['chart-guide']} */ ;
        // @ts-ignore
        [openDialog, hasPoints, hasPoints, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: (__VLS_ctx.miniChart.padding.left),
        y1: (__VLS_ctx.miniChart.padding.top),
        x2: (__VLS_ctx.miniChart.padding.left),
        y2: (__VLS_ctx.miniChart.chartBottom),
        ...{ class: "chart-axis" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-axis']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: (__VLS_ctx.miniChart.padding.left),
        y1: (__VLS_ctx.miniChart.chartBottom),
        x2: (__VLS_ctx.miniChart.width - __VLS_ctx.miniChart.padding.right),
        y2: (__VLS_ctx.miniChart.chartBottom),
        ...{ class: "chart-axis" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-axis']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
        points: (__VLS_ctx.miniChart.polyline),
        ...{ class: "chart-line" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-line']} */ ;
    for (const [point] of __VLS_vFor((__VLS_ctx.miniChart.points))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
            key: (point.key),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            cx: (point.x),
            cy: (point.y),
            r: "4.5",
            ...{ class: (['chart-dot', `chart-dot--${point.level}`]) },
        });
        /** @type {__VLS_StyleScopedClasses['chart-dot']} */ ;
        // @ts-ignore
        [miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-range" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-range']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.miniChart.yMinLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.miniChart.yMaxLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-labels" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-labels']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.miniChart.xStartLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.miniChart.xEndLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-hint" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-hint']} */ ;
}
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1480),
}));
const __VLS_15 = __VLS_14({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1480),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
const { default: __VLS_18 } = __VLS_16.slots;
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    rounded: "xl",
    ...{ class: "chart-dialog-card" },
}));
const __VLS_21 = __VLS_20({
    rounded: "xl",
    ...{ class: "chart-dialog-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
/** @type {__VLS_StyleScopedClasses['chart-dialog-card']} */ ;
const { default: __VLS_24 } = __VLS_22.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-dialog-header" },
});
/** @type {__VLS_StyleScopedClasses['chart-dialog-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-h6 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
(__VLS_ctx.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-body-2 text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
(__VLS_ctx.subtitle || "Serie historica de resultados");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center flex-wrap" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
let __VLS_25;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
    size: "small",
    color: "primary",
    variant: "tonal",
}));
const __VLS_27 = __VLS_26({
    size: "small",
    color: "primary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
const { default: __VLS_30 } = __VLS_28.slots;
(__VLS_ctx.numericPoints.length);
// @ts-ignore
[title, subtitle, miniChart, miniChart, miniChart, miniChart, dialog, isDialogFullscreen, isDialogFullscreen, numericPoints,];
var __VLS_28;
let __VLS_31;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
    size: "small",
    color: "secondary",
    variant: "tonal",
}));
const __VLS_33 = __VLS_32({
    size: "small",
    color: "secondary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
const { default: __VLS_36 } = __VLS_34.slots;
(__VLS_ctx.detailChart.yMinLabel);
(__VLS_ctx.detailChart.yMaxLabel);
// @ts-ignore
[detailChart, detailChart,];
var __VLS_34;
let __VLS_37;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-minus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel <= __VLS_ctx.MIN_ZOOM),
}));
const __VLS_39 = __VLS_38({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-minus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel <= __VLS_ctx.MIN_ZOOM),
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
let __VLS_42;
const __VLS_43 = ({ click: {} },
    { onClick: (__VLS_ctx.zoomOut) });
var __VLS_40;
var __VLS_41;
let __VLS_44;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
    size: "small",
    color: "info",
    variant: "tonal",
}));
const __VLS_46 = __VLS_45({
    size: "small",
    color: "info",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const { default: __VLS_49 } = __VLS_47.slots;
(Math.round(__VLS_ctx.zoomLevel * 100));
// @ts-ignore
[zoomLevel, zoomLevel, MIN_ZOOM, zoomOut,];
var __VLS_47;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    ...{ 'onClick': {} },
    icon: "mdi-fit-to-page-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel === 1),
}));
const __VLS_52 = __VLS_51({
    ...{ 'onClick': {} },
    icon: "mdi-fit-to-page-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel === 1),
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
let __VLS_55;
const __VLS_56 = ({ click: {} },
    { onClick: (__VLS_ctx.resetZoom) });
var __VLS_53;
var __VLS_54;
let __VLS_57;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-plus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel >= __VLS_ctx.MAX_ZOOM),
}));
const __VLS_59 = __VLS_58({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-plus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel >= __VLS_ctx.MAX_ZOOM),
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
let __VLS_62;
const __VLS_63 = ({ click: {} },
    { onClick: (__VLS_ctx.zoomIn) });
var __VLS_60;
var __VLS_61;
let __VLS_64;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent1(__VLS_64, new __VLS_64({
    ...{ 'onClick': {} },
    icon: "mdi-close",
    variant: "text",
}));
const __VLS_66 = __VLS_65({
    ...{ 'onClick': {} },
    icon: "mdi-close",
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
let __VLS_69;
const __VLS_70 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog, zoomLevel, zoomLevel, resetZoom, MAX_ZOOM, zoomIn,];
        } });
var __VLS_67;
var __VLS_68;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-dialog-layout" },
});
/** @type {__VLS_StyleScopedClasses['chart-dialog-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-dialog-main" },
});
/** @type {__VLS_StyleScopedClasses['chart-dialog-main']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-dialog-shell" },
});
/** @type {__VLS_StyleScopedClasses['chart-dialog-shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: (`0 0 ${__VLS_ctx.detailChart.width} ${__VLS_ctx.detailChart.height}`),
    ...{ class: "chart-svg chart-svg--detail" },
    ...{ style: ({ width: `${__VLS_ctx.detailChart.width}px`, height: `${__VLS_ctx.detailChart.height}px` }) },
    preserveAspectRatio: "xMidYMid meet",
});
/** @type {__VLS_StyleScopedClasses['chart-svg']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-svg--detail']} */ ;
for (const [guide] of __VLS_vFor((__VLS_ctx.detailChart.guides))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        key: (`detail-guide-${guide.key}`),
        x1: (__VLS_ctx.detailChart.padding.left),
        x2: (__VLS_ctx.detailChart.width - __VLS_ctx.detailChart.padding.right),
        y1: (guide.y),
        y2: (guide.y),
        ...{ class: "chart-guide" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-guide']} */ ;
    // @ts-ignore
    [detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart,];
}
for (const [guide] of __VLS_vFor((__VLS_ctx.detailChart.guides))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
        key: (`detail-guide-label-${guide.key}`),
        x: (__VLS_ctx.detailChart.padding.left - 12),
        y: (guide.y + 4),
        ...{ class: "chart-y-label" },
        'text-anchor': "end",
    });
    /** @type {__VLS_StyleScopedClasses['chart-y-label']} */ ;
    (guide.label);
    // @ts-ignore
    [detailChart, detailChart,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: (__VLS_ctx.detailChart.padding.left),
    y1: (__VLS_ctx.detailChart.padding.top),
    x2: (__VLS_ctx.detailChart.padding.left),
    y2: (__VLS_ctx.detailChart.chartBottom),
    ...{ class: "chart-axis" },
});
/** @type {__VLS_StyleScopedClasses['chart-axis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: (__VLS_ctx.detailChart.padding.left),
    y1: (__VLS_ctx.detailChart.chartBottom),
    x2: (__VLS_ctx.detailChart.width - __VLS_ctx.detailChart.padding.right),
    y2: (__VLS_ctx.detailChart.chartBottom),
    ...{ class: "chart-axis" },
});
/** @type {__VLS_StyleScopedClasses['chart-axis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
    points: (__VLS_ctx.detailChart.polyline),
    ...{ class: "chart-line" },
});
/** @type {__VLS_StyleScopedClasses['chart-line']} */ ;
for (const [point] of __VLS_vFor((__VLS_ctx.detailChart.points))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
        key: (`detail-point-${point.key}`),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: (point.x),
        x2: (point.x),
        y1: (point.y),
        y2: (__VLS_ctx.detailChart.chartBottom),
        ...{ class: "chart-drop" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-drop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        ...{ onMouseenter: (...[$event]) => {
                __VLS_ctx.selectPoint(point.key);
                // @ts-ignore
                [detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, selectPoint,];
            } },
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectPoint(point.key);
                // @ts-ignore
                [selectPoint,];
            } },
        cx: (point.x),
        cy: (point.y),
        r: (__VLS_ctx.selectedPoint?.key === point.key ? 8 : 6),
        ...{ class: (['chart-dot', 'chart-dot--detail', `chart-dot--${point.level}`]) },
    });
    /** @type {__VLS_StyleScopedClasses['chart-dot']} */ ;
    /** @type {__VLS_StyleScopedClasses['chart-dot--detail']} */ ;
    if (__VLS_ctx.shouldRenderPointLabel(point)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
            x: (point.x),
            y: (point.y - 14),
            ...{ class: "chart-point-value" },
            'text-anchor': "middle",
        });
        /** @type {__VLS_StyleScopedClasses['chart-point-value']} */ ;
        (point.valueLabel);
    }
    if (__VLS_ctx.shouldRenderXAxisLabel(point)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
            x: (point.x),
            y: (__VLS_ctx.detailChart.chartBottom + 20),
            ...{ class: "chart-x-label" },
            'text-anchor': "end",
            transform: (`rotate(-35 ${point.x} ${__VLS_ctx.detailChart.chartBottom + 20})`),
        });
        /** @type {__VLS_StyleScopedClasses['chart-x-label']} */ ;
        (point.fecha || point.label);
    }
    // @ts-ignore
    [detailChart, detailChart, selectedPoint, shouldRenderPointLabel, shouldRenderXAxisLabel,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-legend" },
});
/** @type {__VLS_StyleScopedClasses['chart-legend']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-legend-item" },
});
/** @type {__VLS_StyleScopedClasses['chart-legend-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span)({
    ...{ class: "chart-legend-dot chart-dot--normal" },
});
/** @type {__VLS_StyleScopedClasses['chart-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dot--normal']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-legend-item" },
});
/** @type {__VLS_StyleScopedClasses['chart-legend-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span)({
    ...{ class: "chart-legend-dot chart-dot--warning" },
});
/** @type {__VLS_StyleScopedClasses['chart-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dot--warning']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-legend-item" },
});
/** @type {__VLS_StyleScopedClasses['chart-legend-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span)({
    ...{ class: "chart-legend-dot chart-dot--alert" },
});
/** @type {__VLS_StyleScopedClasses['chart-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-dot--alert']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "chart-dialog-side" },
});
/** @type {__VLS_StyleScopedClasses['chart-dialog-side']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
if (__VLS_ctx.selectedPoint) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-point-detail" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-point-detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-value']} */ ;
    (__VLS_ctx.selectedPoint.codigo || __VLS_ctx.selectedPoint.label);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-point-detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-value']} */ ;
    (__VLS_ctx.selectedPoint.fecha || "Sin fecha");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-point-detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-value']} */ ;
    (__VLS_ctx.selectedPoint.valueLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-point-detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-label']} */ ;
    let __VLS_71;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
        size: "small",
        color: (__VLS_ctx.levelColor(__VLS_ctx.selectedPoint.level)),
        variant: "tonal",
    }));
    const __VLS_73 = __VLS_72({
        size: "small",
        color: (__VLS_ctx.levelColor(__VLS_ctx.selectedPoint.level)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    const { default: __VLS_76 } = __VLS_74.slots;
    (__VLS_ctx.levelTitle(__VLS_ctx.selectedPoint.level));
    // @ts-ignore
    [selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, levelColor, levelTitle,];
    var __VLS_74;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-point-detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "chart-point-detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-detail-value']} */ ;
    (__VLS_ctx.selectedPoint.index + 1);
    (__VLS_ctx.detailChart.points.length);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-point-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-point-empty']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-table-wrap" },
});
/** @type {__VLS_StyleScopedClasses['chart-table-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_77;
/** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
vTable;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({
    density: "compact",
    ...{ class: "chart-table" },
}));
const __VLS_79 = __VLS_78({
    density: "compact",
    ...{ class: "chart-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_78));
/** @type {__VLS_StyleScopedClasses['chart-table']} */ ;
const { default: __VLS_82 } = __VLS_80.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [point] of __VLS_vFor((__VLS_ctx.detailChart.points))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectPoint(point.key);
                // @ts-ignore
                [detailChart, detailChart, selectPoint, selectedPoint,];
            } },
        key: (`row-${point.key}`),
        ...{ class: ({ 'chart-table-row--active': __VLS_ctx.selectedPoint?.key === point.key }) },
    });
    /** @type {__VLS_StyleScopedClasses['chart-table-row--active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.index + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.codigo || point.label);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.fecha || "Sin fecha");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.valueLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    let __VLS_83;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
        size: "x-small",
        color: (__VLS_ctx.levelColor(point.level)),
        variant: "tonal",
    }));
    const __VLS_85 = __VLS_84({
        size: "x-small",
        color: (__VLS_ctx.levelColor(point.level)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    const { default: __VLS_88 } = __VLS_86.slots;
    (__VLS_ctx.levelTitle(point.level));
    // @ts-ignore
    [selectedPoint, levelColor, levelTitle,];
    var __VLS_86;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_80;
// @ts-ignore
[];
var __VLS_22;
// @ts-ignore
[];
var __VLS_16;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

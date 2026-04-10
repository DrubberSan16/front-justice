/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
const props = withDefaults(defineProps(), {
    metrics: () => [],
    curveMode: "linear",
});
const COLORS = [
    "#1f4b7a",
    "#ba4a00",
    "#1f7a4b",
    "#8e44ad",
    "#d35400",
    "#00695c",
    "#b03a2e",
    "#2e86c1",
    "#7d6608",
    "#5b2c6f",
];
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
    top: 18,
    bottom: 28,
};
const detailPadding = {
    left: 72,
    right: 30,
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
function formatActualValue(value, unit) {
    const formatted = Number(value).toLocaleString("es-EC", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
    return unit ? `${formatted} ${unit}` : formatted;
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
function buildCategoryKey(point, fallback) {
    const parts = [point.fecha, point.codigo, point.numero_muestra].filter(Boolean);
    return parts.length ? parts.join("::") : fallback;
}
const chartData = computed(() => {
    const categoryMap = new Map();
    const nextSeries = (props.metrics || [])
        .map((metric, metricIndex) => {
        const numericPoints = (metric.points || [])
            .map((point, pointIndex) => ({
            point,
            pointIndex,
            numericValue: Number(point.valor),
        }))
            .filter((item) => Number.isFinite(item.numericValue));
        if (!numericPoints.length)
            return null;
        const values = numericPoints.map((item) => item.numericValue);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = maxValue - minValue || 1;
        const color = COLORS[metricIndex % COLORS.length] || "#1f4b7a";
        const points = numericPoints.map((item, order) => {
            const categoryKey = buildCategoryKey(item.point, `${metric.key}-${item.pointIndex}`);
            if (!categoryMap.has(categoryKey)) {
                categoryMap.set(categoryKey, {
                    key: categoryKey,
                    label: item.point.fecha || item.point.codigo || item.point.numero_muestra || `P${order + 1}`,
                    order: categoryMap.size,
                });
            }
            const normalizedValue = maxValue === minValue
                ? 50
                : ((item.numericValue - minValue) / range) * 100;
            return {
                key: `${metric.key}-${categoryKey}`,
                seriesKey: String(metric.key || `serie-${metricIndex}`),
                seriesLabel: String(metric.label || metric.key || `Serie ${metricIndex + 1}`),
                color,
                codigo: item.point.codigo ? String(item.point.codigo) : null,
                fecha: item.point.fecha ? String(item.point.fecha) : null,
                categoryKey,
                categoryLabel: categoryMap.get(categoryKey)?.label || `P${order + 1}`,
                value: item.numericValue,
                valueLabel: formatActualValue(item.numericValue, metric.unit),
                normalizedValue,
                normalizedLabel: `${normalizedValue.toFixed(1)}%`,
                level: toLevel(item.point.nivel_alerta),
                order,
            };
        });
        return {
            key: String(metric.key || `serie-${metricIndex}`),
            label: String(metric.label || metric.key || `Serie ${metricIndex + 1}`),
            color,
            points,
        };
    })
        .filter(Boolean);
    return {
        categories: [...categoryMap.values()].sort((a, b) => a.order - b.order),
        series: nextSeries,
    };
});
const chartSeries = computed(() => chartData.value.series);
const chartCategories = computed(() => chartData.value.categories);
const hasSeries = computed(() => chartSeries.value.length > 0);
function buildLinearPath(points) {
    if (!points.length)
        return "";
    return points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");
}
function buildSmoothPath(points) {
    if (!points.length)
        return "";
    if (points.length < 3)
        return buildLinearPath(points);
    const firstPoint = points[0];
    if (!firstPoint)
        return "";
    const segments = [`M ${firstPoint.x} ${firstPoint.y}`];
    for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        if (!current || !next)
            continue;
        const controlX = (current.x + next.x) / 2;
        segments.push(`Q ${controlX} ${current.y} ${next.x} ${next.y}`);
    }
    return segments.join(" ");
}
function buildChartModel(width, height, padding) {
    const chartWidth = Math.max(width - padding.left - padding.right, 1);
    const chartHeight = Math.max(height - padding.top - padding.bottom, 1);
    const chartBottom = height - padding.bottom;
    const categoryIndex = new Map(chartCategories.value.map((item, index) => [item.key, index]));
    const categories = chartCategories.value.map((category, index) => ({
        ...category,
        x: chartCategories.value.length === 1
            ? padding.left + chartWidth / 2
            : padding.left +
                (chartWidth * index) / Math.max(chartCategories.value.length - 1, 1),
    }));
    const series = chartSeries.value.map((series) => {
        const points = series.points
            .map((point) => {
            const index = categoryIndex.get(point.categoryKey) ?? 0;
            const x = chartCategories.value.length === 1
                ? padding.left + chartWidth / 2
                : padding.left +
                    (chartWidth * index) / Math.max(chartCategories.value.length - 1, 1);
            const y = chartBottom - (point.normalizedValue / 100) * chartHeight;
            return {
                ...point,
                x,
                y,
            };
        })
            .sort((a, b) => {
            const indexA = categoryIndex.get(a.categoryKey) ?? 0;
            const indexB = categoryIndex.get(b.categoryKey) ?? 0;
            return indexA - indexB;
        });
        return {
            key: series.key,
            label: series.label,
            color: series.color,
            points,
            path: props.curveMode === "smooth"
                ? buildSmoothPath(points)
                : buildLinearPath(points),
        };
    });
    const guides = [0, 25, 50, 75, 100].map((value, index) => ({
        key: index,
        y: chartBottom - (value / 100) * chartHeight,
        label: `${value}%`,
    }));
    return {
        width,
        height,
        padding,
        chartBottom,
        categories,
        series,
        guides,
        xStartLabel: categories[0]?.label || "",
        xEndLabel: categories[categories.length - 1]?.label || "",
    };
}
const miniChart = computed(() => buildChartModel(440, 200, miniPadding));
const detailWidth = computed(() => Math.round(Math.max(1180, 180 + chartCategories.value.length * 92) * zoomLevel.value));
const detailHeight = computed(() => Math.round(Math.max(460, 460 * Math.min(zoomLevel.value, 2))));
const detailChart = computed(() => buildChartModel(detailWidth.value, detailHeight.value, detailPadding));
const allPoints = computed(() => detailChart.value.series.flatMap((series) => series.points));
const selectedPoint = computed(() => {
    if (!allPoints.value.length)
        return null;
    return (allPoints.value.find((point) => point.key === selectedPointKey.value) ||
        allPoints.value[allPoints.value.length - 1] ||
        null);
});
const tableRows = computed(() => [...allPoints.value].sort((a, b) => {
    if ((a.fecha || "") !== (b.fecha || "")) {
        return String(a.fecha || "").localeCompare(String(b.fecha || ""));
    }
    return a.seriesLabel.localeCompare(b.seriesLabel);
}));
watch(allPoints, (points) => {
    if (!points.length) {
        selectedPointKey.value = null;
        dialog.value = false;
        return;
    }
    if (!points.some((point) => point.key === selectedPointKey.value)) {
        selectedPointKey.value = points[points.length - 1]?.key || null;
    }
}, { immediate: true });
const categoryLabelStep = computed(() => {
    if (zoomLevel.value >= 1.5 || detailChart.value.categories.length <= 8)
        return 1;
    return Math.max(1, Math.ceil(detailChart.value.categories.length / 6));
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
function shouldRenderPointValue(point) {
    return (selectedPointKey.value === point.key ||
        zoomLevel.value >= 2.1 ||
        (chartSeries.value.length <= 3 && detailChart.value.categories.length <= 8));
}
function shouldRenderCategoryLabel(categoryKey) {
    if (zoomLevel.value >= 1.5 || detailChart.value.categories.length <= 8)
        return true;
    const index = detailChart.value.categories.findIndex((category) => category.key === categoryKey);
    if (index === -1)
        return false;
    const selected = selectedPoint.value?.categoryKey;
    return (index % categoryLabelStep.value === 0 ||
        index === detailChart.value.categories.length - 1 ||
        selected === categoryKey);
}
function selectPoint(key) {
    selectedPointKey.value = key;
}
function openDialog() {
    if (!hasSeries.value)
        return;
    if (!selectedPointKey.value) {
        selectedPointKey.value = allPoints.value[allPoints.value.length - 1]?.key || null;
    }
    zoomLevel.value = 1;
    dialog.value = true;
}
const __VLS_defaults = {
    metrics: () => [],
    curveMode: "linear",
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['comparison-chart--interactive']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart--interactive']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__point-value']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__table']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-header']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__detail-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.openDialog) },
    ...{ onKeydown: (__VLS_ctx.openDialog) },
    ...{ onKeydown: (__VLS_ctx.openDialog) },
    ...{ class: (['comparison-chart', { 'comparison-chart--interactive': __VLS_ctx.hasSeries }]) },
    role: (__VLS_ctx.hasSeries ? 'button' : undefined),
    tabindex: (__VLS_ctx.hasSeries ? 0 : undefined),
});
/** @type {__VLS_StyleScopedClasses['comparison-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart--interactive']} */ ;
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
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
(__VLS_ctx.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-caption text-medium-emphasis" },
});
/** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
/** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
(__VLS_ctx.subtitle || "Comparativa normalizada de tendencias");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center flex-wrap" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    size: "small",
    color: "primary",
    variant: "tonal",
}));
const __VLS_2 = __VLS_1({
    size: "small",
    color: "primary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
(__VLS_ctx.chartSeries.length);
// @ts-ignore
[openDialog, openDialog, openDialog, hasSeries, hasSeries, hasSeries, title, subtitle, chartSeries,];
var __VLS_3;
let __VLS_6;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    size: "small",
    color: "secondary",
    variant: "tonal",
}));
const __VLS_8 = __VLS_7({
    size: "small",
    color: "secondary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const { default: __VLS_11 } = __VLS_9.slots;
(__VLS_ctx.chartCategories.length);
// @ts-ignore
[chartCategories,];
var __VLS_9;
if (!__VLS_ctx.hasSeries) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__empty" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__empty']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__shell" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__shell']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: (`0 0 ${__VLS_ctx.miniChart.width} ${__VLS_ctx.miniChart.height}`),
        ...{ class: "comparison-chart__svg" },
        preserveAspectRatio: "none",
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__svg']} */ ;
    for (const [guide] of __VLS_vFor((__VLS_ctx.miniChart.guides))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
            key: (`guide-${guide.key}`),
            x1: (__VLS_ctx.miniChart.padding.left),
            x2: (__VLS_ctx.miniChart.width - __VLS_ctx.miniChart.padding.right),
            y1: (guide.y),
            y2: (guide.y),
            ...{ class: "comparison-chart__guide" },
        });
        /** @type {__VLS_StyleScopedClasses['comparison-chart__guide']} */ ;
        // @ts-ignore
        [hasSeries, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: (__VLS_ctx.miniChart.padding.left),
        y1: (__VLS_ctx.miniChart.padding.top),
        x2: (__VLS_ctx.miniChart.padding.left),
        y2: (__VLS_ctx.miniChart.chartBottom),
        ...{ class: "comparison-chart__axis" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__axis']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: (__VLS_ctx.miniChart.padding.left),
        y1: (__VLS_ctx.miniChart.chartBottom),
        x2: (__VLS_ctx.miniChart.width - __VLS_ctx.miniChart.padding.right),
        y2: (__VLS_ctx.miniChart.chartBottom),
        ...{ class: "comparison-chart__axis" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__axis']} */ ;
    for (const [series] of __VLS_vFor((__VLS_ctx.miniChart.series))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
            key: (series.key),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: (series.path),
            ...{ class: "comparison-chart__line" },
            ...{ style: ({ stroke: series.color }) },
        });
        /** @type {__VLS_StyleScopedClasses['comparison-chart__line']} */ ;
        for (const [point] of __VLS_vFor((series.points))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
                key: (point.key),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                cx: (point.x),
                cy: (point.y),
                r: "4.2",
                ...{ class: (['comparison-chart__dot', `comparison-chart__dot--${point.level}`]) },
                ...{ style: ({ stroke: series.color }) },
            });
            /** @type {__VLS_StyleScopedClasses['comparison-chart__dot']} */ ;
            // @ts-ignore
            [miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart, miniChart,];
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__scale" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__scale']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__labels" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__labels']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.miniChart.xStartLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.miniChart.xEndLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__legend" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__legend']} */ ;
    for (const [series] of __VLS_vFor((__VLS_ctx.chartSeries))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (`mini-legend-${series.key}`),
            ...{ class: "comparison-chart__legend-item" },
        });
        /** @type {__VLS_StyleScopedClasses['comparison-chart__legend-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
            ...{ class: "comparison-chart__legend-line" },
            ...{ style: ({ backgroundColor: series.color }) },
        });
        /** @type {__VLS_StyleScopedClasses['comparison-chart__legend-line']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (series.label);
        // @ts-ignore
        [chartSeries, miniChart, miniChart,];
    }
}
let __VLS_12;
/** @ts-ignore @type {typeof __VLS_components.vDialog | typeof __VLS_components.VDialog | typeof __VLS_components.vDialog | typeof __VLS_components.VDialog} */
vDialog;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1540),
}));
const __VLS_14 = __VLS_13({
    modelValue: (__VLS_ctx.dialog),
    fullscreen: (__VLS_ctx.isDialogFullscreen),
    maxWidth: (__VLS_ctx.isDialogFullscreen ? undefined : 1540),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const { default: __VLS_17 } = __VLS_15.slots;
let __VLS_18;
/** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
vCard;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
    rounded: "xl",
    ...{ class: "comparison-chart__dialog" },
}));
const __VLS_20 = __VLS_19({
    rounded: "xl",
    ...{ class: "comparison-chart__dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog']} */ ;
const { default: __VLS_23 } = __VLS_21.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "comparison-chart__dialog-header" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-header']} */ ;
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
(__VLS_ctx.subtitle || "Comparativa normalizada de tendencias");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "d-flex align-center flex-wrap" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-center']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
let __VLS_24;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
    size: "small",
    color: "primary",
    variant: "tonal",
}));
const __VLS_26 = __VLS_25({
    size: "small",
    color: "primary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
const { default: __VLS_29 } = __VLS_27.slots;
(__VLS_ctx.chartSeries.length);
// @ts-ignore
[title, subtitle, chartSeries, dialog, isDialogFullscreen, isDialogFullscreen,];
var __VLS_27;
let __VLS_30;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    size: "small",
    color: "secondary",
    variant: "tonal",
}));
const __VLS_32 = __VLS_31({
    size: "small",
    color: "secondary",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
const { default: __VLS_35 } = __VLS_33.slots;
// @ts-ignore
[];
var __VLS_33;
let __VLS_36;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-minus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel <= __VLS_ctx.MIN_ZOOM),
}));
const __VLS_38 = __VLS_37({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-minus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel <= __VLS_ctx.MIN_ZOOM),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_41;
const __VLS_42 = ({ click: {} },
    { onClick: (__VLS_ctx.zoomOut) });
var __VLS_39;
var __VLS_40;
let __VLS_43;
/** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
vChip;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
    size: "small",
    color: "info",
    variant: "tonal",
}));
const __VLS_45 = __VLS_44({
    size: "small",
    color: "info",
    variant: "tonal",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
const { default: __VLS_48 } = __VLS_46.slots;
(Math.round(__VLS_ctx.zoomLevel * 100));
// @ts-ignore
[zoomLevel, zoomLevel, MIN_ZOOM, zoomOut,];
var __VLS_46;
let __VLS_49;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
    ...{ 'onClick': {} },
    icon: "mdi-fit-to-page-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel === 1),
}));
const __VLS_51 = __VLS_50({
    ...{ 'onClick': {} },
    icon: "mdi-fit-to-page-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel === 1),
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
let __VLS_54;
const __VLS_55 = ({ click: {} },
    { onClick: (__VLS_ctx.resetZoom) });
var __VLS_52;
var __VLS_53;
let __VLS_56;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-plus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel >= __VLS_ctx.MAX_ZOOM),
}));
const __VLS_58 = __VLS_57({
    ...{ 'onClick': {} },
    icon: "mdi-magnify-plus-outline",
    variant: "text",
    disabled: (__VLS_ctx.zoomLevel >= __VLS_ctx.MAX_ZOOM),
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_61;
const __VLS_62 = ({ click: {} },
    { onClick: (__VLS_ctx.zoomIn) });
var __VLS_59;
var __VLS_60;
let __VLS_63;
/** @ts-ignore @type {typeof __VLS_components.vBtn | typeof __VLS_components.VBtn} */
vBtn;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
    ...{ 'onClick': {} },
    icon: "mdi-close",
    variant: "text",
}));
const __VLS_65 = __VLS_64({
    ...{ 'onClick': {} },
    icon: "mdi-close",
    variant: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
let __VLS_68;
const __VLS_69 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.dialog = false;
            // @ts-ignore
            [dialog, zoomLevel, zoomLevel, resetZoom, MAX_ZOOM, zoomIn,];
        } });
var __VLS_66;
var __VLS_67;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "comparison-chart__dialog-layout" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "comparison-chart__dialog-main" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-main']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "comparison-chart__dialog-shell" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: (`0 0 ${__VLS_ctx.detailChart.width} ${__VLS_ctx.detailChart.height}`),
    ...{ class: "comparison-chart__svg comparison-chart__svg--detail" },
    ...{ style: ({ width: `${__VLS_ctx.detailChart.width}px`, height: `${__VLS_ctx.detailChart.height}px` }) },
    preserveAspectRatio: "xMidYMid meet",
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__svg']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__svg--detail']} */ ;
for (const [guide] of __VLS_vFor((__VLS_ctx.detailChart.guides))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        key: (`detail-guide-${guide.key}`),
        x1: (__VLS_ctx.detailChart.padding.left),
        x2: (__VLS_ctx.detailChart.width - __VLS_ctx.detailChart.padding.right),
        y1: (guide.y),
        y2: (guide.y),
        ...{ class: "comparison-chart__guide" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__guide']} */ ;
    // @ts-ignore
    [detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart,];
}
for (const [guide] of __VLS_vFor((__VLS_ctx.detailChart.guides))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
        key: (`detail-guide-label-${guide.key}`),
        x: (__VLS_ctx.detailChart.padding.left - 12),
        y: (guide.y + 4),
        ...{ class: "comparison-chart__y-label" },
        'text-anchor': "end",
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__y-label']} */ ;
    (guide.label);
    // @ts-ignore
    [detailChart, detailChart,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: (__VLS_ctx.detailChart.padding.left),
    y1: (__VLS_ctx.detailChart.padding.top),
    x2: (__VLS_ctx.detailChart.padding.left),
    y2: (__VLS_ctx.detailChart.chartBottom),
    ...{ class: "comparison-chart__axis" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__axis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: (__VLS_ctx.detailChart.padding.left),
    y1: (__VLS_ctx.detailChart.chartBottom),
    x2: (__VLS_ctx.detailChart.width - __VLS_ctx.detailChart.padding.right),
    y2: (__VLS_ctx.detailChart.chartBottom),
    ...{ class: "comparison-chart__axis" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__axis']} */ ;
for (const [series] of __VLS_vFor((__VLS_ctx.detailChart.series))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
        key: (`detail-series-${series.key}`),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: (series.path),
        ...{ class: "comparison-chart__line" },
        ...{ style: ({ stroke: series.color }) },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__line']} */ ;
    for (const [point] of __VLS_vFor((series.points))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
            key: (point.key),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
            x1: (point.x),
            x2: (point.x),
            y1: (point.y),
            y2: (__VLS_ctx.detailChart.chartBottom),
            ...{ class: "comparison-chart__drop" },
        });
        /** @type {__VLS_StyleScopedClasses['comparison-chart__drop']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            ...{ onMouseenter: (...[$event]) => {
                    __VLS_ctx.selectPoint(point.key);
                    // @ts-ignore
                    [detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, detailChart, selectPoint,];
                } },
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.selectPoint(point.key);
                    // @ts-ignore
                    [selectPoint,];
                } },
            cx: (point.x),
            cy: (point.y),
            r: (__VLS_ctx.selectedPoint?.key === point.key ? 8 : 6),
            ...{ class: (['comparison-chart__dot', 'comparison-chart__dot--detail', `comparison-chart__dot--${point.level}`]) },
            ...{ style: ({ stroke: series.color }) },
        });
        /** @type {__VLS_StyleScopedClasses['comparison-chart__dot']} */ ;
        /** @type {__VLS_StyleScopedClasses['comparison-chart__dot--detail']} */ ;
        if (__VLS_ctx.shouldRenderPointValue(point)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
                x: (point.x),
                y: (point.y - 14),
                ...{ class: "comparison-chart__point-value" },
                'text-anchor': "middle",
            });
            /** @type {__VLS_StyleScopedClasses['comparison-chart__point-value']} */ ;
            (point.valueLabel);
        }
        // @ts-ignore
        [selectedPoint, shouldRenderPointValue,];
    }
    // @ts-ignore
    [];
}
for (const [category] of __VLS_vFor((__VLS_ctx.detailChart.categories))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
        key: (`category-${category.key}`),
        x: (category.x),
        y: (__VLS_ctx.detailChart.chartBottom + 22),
        ...{ class: "comparison-chart__x-label" },
        'text-anchor': "end",
        transform: (`rotate(-35 ${category.x} ${__VLS_ctx.detailChart.chartBottom + 22})`),
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.shouldRenderCategoryLabel(category.key)) }, null, null);
    /** @type {__VLS_StyleScopedClasses['comparison-chart__x-label']} */ ;
    (category.label);
    // @ts-ignore
    [detailChart, detailChart, detailChart, shouldRenderCategoryLabel,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "comparison-chart__legend comparison-chart__legend--detail" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__legend']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-chart__legend--detail']} */ ;
for (const [series] of __VLS_vFor((__VLS_ctx.chartSeries))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (`detail-legend-${series.key}`),
        ...{ class: "comparison-chart__legend-item" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__legend-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "comparison-chart__legend-line" },
        ...{ style: ({ backgroundColor: series.color }) },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__legend-line']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (series.label);
    // @ts-ignore
    [chartSeries,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "comparison-chart__dialog-side" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__dialog-side']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
if (__VLS_ctx.selectedPoint) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-card" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-value']} */ ;
    (__VLS_ctx.selectedPoint.seriesLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-value']} */ ;
    (__VLS_ctx.selectedPoint.fecha || "Sin fecha");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-value']} */ ;
    (__VLS_ctx.selectedPoint.codigo || __VLS_ctx.selectedPoint.categoryLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-value']} */ ;
    (__VLS_ctx.selectedPoint.valueLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-value" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-value']} */ ;
    (__VLS_ctx.selectedPoint.normalizedLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-row" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "comparison-chart__detail-label" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-label']} */ ;
    let __VLS_70;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({
        size: "small",
        color: (__VLS_ctx.levelColor(__VLS_ctx.selectedPoint.level)),
        variant: "tonal",
    }));
    const __VLS_72 = __VLS_71({
        size: "small",
        color: (__VLS_ctx.levelColor(__VLS_ctx.selectedPoint.level)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_71));
    const { default: __VLS_75 } = __VLS_73.slots;
    (__VLS_ctx.levelTitle(__VLS_ctx.selectedPoint.level));
    // @ts-ignore
    [selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, selectedPoint, levelColor, levelTitle,];
    var __VLS_73;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "comparison-chart__detail-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__detail-empty']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "comparison-chart__table-wrap" },
});
/** @type {__VLS_StyleScopedClasses['comparison-chart__table-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-subtitle-1 font-weight-bold mb-3" },
});
/** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
let __VLS_76;
/** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
vTable;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
    density: "compact",
    ...{ class: "comparison-chart__table" },
}));
const __VLS_78 = __VLS_77({
    density: "compact",
    ...{ class: "comparison-chart__table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
/** @type {__VLS_StyleScopedClasses['comparison-chart__table']} */ ;
const { default: __VLS_81 } = __VLS_79.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [point, index] of __VLS_vFor((__VLS_ctx.tableRows))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectPoint(point.key);
                // @ts-ignore
                [selectPoint, tableRows,];
            } },
        key: (`table-${point.key}`),
        ...{ class: ({ 'comparison-chart__table-row--active': __VLS_ctx.selectedPoint?.key === point.key }) },
    });
    /** @type {__VLS_StyleScopedClasses['comparison-chart__table-row--active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (index + 1);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.seriesLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.codigo || point.categoryLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.fecha || "Sin fecha");
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.valueLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (point.normalizedLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    let __VLS_82;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent1(__VLS_82, new __VLS_82({
        size: "x-small",
        color: (__VLS_ctx.levelColor(point.level)),
        variant: "tonal",
    }));
    const __VLS_84 = __VLS_83({
        size: "x-small",
        color: (__VLS_ctx.levelColor(point.level)),
        variant: "tonal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    const { default: __VLS_87 } = __VLS_85.slots;
    (__VLS_ctx.levelTitle(point.level));
    // @ts-ignore
    [selectedPoint, levelColor, levelTitle,];
    var __VLS_85;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_79;
// @ts-ignore
[];
var __VLS_21;
// @ts-ignore
[];
var __VLS_15;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};

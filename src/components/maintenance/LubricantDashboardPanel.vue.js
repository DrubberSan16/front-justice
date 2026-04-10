/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/Drubber Sanchez/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
import LubricantComparisonChart from "@/components/maintenance/LubricantComparisonChart.vue";
import LubricantTrendChart from "@/components/maintenance/LubricantTrendChart.vue";
const props = defineProps();
const comparisonCharts = computed(() => {
    const sections = Array.isArray(props.dashboard?.chart_sections)
        ? props.dashboard.chart_sections
        : [];
    const findMetrics = (key) => (sections.find((section) => section.key === key)?.metrics || []);
    return {
        desgaste: findMetrics("desgaste"),
        contaminacion: findMetrics("contaminacion"),
        estado: findMetrics("estado"),
    };
});
function conditionColor(value) {
    const raw = String(value ?? "").trim().toUpperCase();
    if (raw === "ANORMAL")
        return "error";
    if (raw === "PRECAUCION")
        return "warning";
    if (raw === "N/D" || raw === "ND")
        return "secondary";
    return "success";
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
/** @type {__VLS_StyleScopedClasses['dashboard-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['charts-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['report-header-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-kpi']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-state']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-grid-inner']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dashboard-panel" },
});
/** @type {__VLS_StyleScopedClasses['dashboard-panel']} */ ;
if (__VLS_ctx.error) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
    vAlert;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        type: "warning",
        variant: "tonal",
        text: (__VLS_ctx.error),
    }));
    const __VLS_2 = __VLS_1({
        type: "warning",
        variant: "tonal",
        text: (__VLS_ctx.error),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-state" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-state']} */ ;
    let __VLS_5;
    /** @ts-ignore @type {typeof __VLS_components.vProgressCircular | typeof __VLS_components.VProgressCircular} */
    vProgressCircular;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        indeterminate: true,
        color: "primary",
    }));
    const __VLS_7 = __VLS_6({
        indeterminate: true,
        color: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else if (!__VLS_ctx.dashboard?.selected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-state" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-state']} */ ;
    let __VLS_10;
    /** @ts-ignore @type {typeof __VLS_components.vIcon | typeof __VLS_components.VIcon} */
    vIcon;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        icon: "mdi-oil",
        size: "28",
    }));
    const __VLS_12 = __VLS_11({
        icon: "mdi-oil",
        size: "28",
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
    let __VLS_15;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_17 = __VLS_16({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_20 } = __VLS_18.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex align-start justify-space-between" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-start']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-space-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h6 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h6']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.dashboard.selected.lubricante);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    (__VLS_ctx.dashboard.selected.marca_lubricante || "Marca sin registrar");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-2 text-medium-emphasis mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    (__VLS_ctx.dashboard.selected.equipo_label || __VLS_ctx.dashboard.selected.equipo_codigo || __VLS_ctx.dashboard.selected.equipo_nombre || "Sin equipo");
    if (__VLS_ctx.dashboard.selected.equipo_modelo) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.dashboard.selected.equipo_modelo);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis mt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    (__VLS_ctx.dashboard.selected.compartimentos?.join(" · ") || "Sin compartimentos");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "d-flex flex-wrap" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    let __VLS_21;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        color: "primary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_23 = __VLS_22({
        color: "primary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    const { default: __VLS_26 } = __VLS_24.slots;
    (__VLS_ctx.dashboard.metrics?.analisis_filtrados ?? 0);
    // @ts-ignore
    [error, error, loading, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard,];
    var __VLS_24;
    let __VLS_27;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
        color: "warning",
        variant: "tonal",
        label: true,
    }));
    const __VLS_29 = __VLS_28({
        color: "warning",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    const { default: __VLS_32 } = __VLS_30.slots;
    (__VLS_ctx.dashboard.metrics?.precauciones ?? 0);
    // @ts-ignore
    [dashboard,];
    var __VLS_30;
    let __VLS_33;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
        color: "error",
        variant: "tonal",
        label: true,
    }));
    const __VLS_35 = __VLS_34({
        color: "error",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    const { default: __VLS_38 } = __VLS_36.slots;
    (__VLS_ctx.dashboard.metrics?.anormales ?? 0);
    // @ts-ignore
    [dashboard,];
    var __VLS_36;
    let __VLS_39;
    /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
    vChip;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
        color: "secondary",
        variant: "tonal",
        label: true,
    }));
    const __VLS_41 = __VLS_40({
        color: "secondary",
        variant: "tonal",
        label: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    const { default: __VLS_44 } = __VLS_42.slots;
    (__VLS_ctx.dashboard.metrics?.sin_dato ?? 0);
    // @ts-ignore
    [dashboard,];
    var __VLS_42;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-kpis mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-kpis']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-kpi" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-kpi']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h5 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.dashboard.metrics?.lubricantes_registrados ?? 0);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-kpi" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-kpi']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-h5 font-weight-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-h5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    (__VLS_ctx.dashboard.metrics?.compartimentos_monitoreados ?? 0);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-kpi" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-kpi']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-1 font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.dashboard.filters?.periodo || "GLOBAL");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dashboard-kpi" },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard-kpi']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-caption text-medium-emphasis" },
    });
    /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-body-1 font-weight-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-body-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
    (__VLS_ctx.dashboard.filters?.from || "Inicio");
    (__VLS_ctx.dashboard.filters?.to || "Actual");
    // @ts-ignore
    [dashboard, dashboard, dashboard, dashboard, dashboard,];
    var __VLS_18;
    let __VLS_45;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_47 = __VLS_46({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_50 } = __VLS_48.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    let __VLS_51;
    /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
    vTable;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
        density: "compact",
        ...{ class: "report-table" },
    }));
    const __VLS_53 = __VLS_52({
        density: "compact",
        ...{ class: "report-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    /** @type {__VLS_StyleScopedClasses['report-table']} */ ;
    const { default: __VLS_56 } = __VLS_54.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [item] of __VLS_vFor((__VLS_ctx.dashboard.timeline ?? []))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            key: (item.id),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.codigo);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.numero_muestra || "Sin muestra");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.fecha_reporte || item.fecha_muestra || "Sin fecha");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.equipo_nombre || item.equipo_codigo || "Sin equipo");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.equipo_modelo || "Sin modelo");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.compartimento_principal || "Sin compartimento");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        let __VLS_57;
        /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
        vChip;
        // @ts-ignore
        const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({
            size: "x-small",
            color: (__VLS_ctx.conditionColor(item.condicion)),
            variant: "tonal",
        }));
        const __VLS_59 = __VLS_58({
            size: "x-small",
            color: (__VLS_ctx.conditionColor(item.condicion)),
            variant: "tonal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_58));
        const { default: __VLS_62 } = __VLS_60.slots;
        (item.condicion || "N/D");
        // @ts-ignore
        [dashboard, conditionColor,];
        var __VLS_60;
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.horas_equipo ?? "N/A");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.horas_lubricante ?? "N/A");
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_54;
    // @ts-ignore
    [];
    var __VLS_48;
    let __VLS_63;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_65 = __VLS_64({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_68 } = __VLS_66.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    if (__VLS_ctx.dashboard.latest_analysis) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "report-layout" },
        });
        /** @type {__VLS_StyleScopedClasses['report-layout']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "report-header-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['report-header-grid']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.cliente || "Sin cliente");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.compartimento_principal || "Sin compartimento");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.equipo_nombre || __VLS_ctx.dashboard.latest_analysis.equipo_codigo || "Sin equipo");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.equipo_marca || "Sin marca");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.equipo_serie || "Sin serie");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.equipo_modelo || "Sin modelo");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.lubricante || "Sin lubricante");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.marca_lubricante || "Sin marca");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.numero_muestra || "Sin numero");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.fecha_muestra || "Sin fecha");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.fecha_ingreso || "Sin fecha");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.fecha_informe || __VLS_ctx.dashboard.latest_analysis.fecha_reporte || "Sin fecha");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.horas_equipo ?? "N/A");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.horas_lubricante ?? "N/A");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.sample_info?.condicion || __VLS_ctx.dashboard.latest_analysis.estado_diagnostico || "N/D");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-caption text-medium-emphasis" },
        });
        /** @type {__VLS_StyleScopedClasses['text-caption']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-medium-emphasis']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "font-weight-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['font-weight-medium']} */ ;
        (__VLS_ctx.dashboard.latest_analysis.evaluacion_ultima_muestra || __VLS_ctx.dashboard.latest_analysis.diagnostico || "Sin evaluacion");
        let __VLS_69;
        /** @ts-ignore @type {typeof __VLS_components.vAlert | typeof __VLS_components.VAlert} */
        vAlert;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
            ...{ class: "mt-4" },
            color: (__VLS_ctx.conditionColor(__VLS_ctx.dashboard.latest_analysis.estado_diagnostico)),
            variant: "tonal",
            text: (__VLS_ctx.dashboard.latest_analysis.diagnostico || 'Sin evaluacion para la ultima muestra.'),
        }));
        const __VLS_71 = __VLS_70({
            ...{ class: "mt-4" },
            color: (__VLS_ctx.conditionColor(__VLS_ctx.dashboard.latest_analysis.estado_diagnostico)),
            variant: "tonal",
            text: (__VLS_ctx.dashboard.latest_analysis.diagnostico || 'Sin evaluacion para la ultima muestra.'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_70));
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        for (const [group] of __VLS_vFor((__VLS_ctx.dashboard.detail_groups ?? []))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-4" },
                key: (group.key),
            });
            /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-subtitle-2 font-weight-bold mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-subtitle-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            (group.label);
            let __VLS_74;
            /** @ts-ignore @type {typeof __VLS_components.vTable | typeof __VLS_components.VTable | typeof __VLS_components.vTable | typeof __VLS_components.VTable} */
            vTable;
            // @ts-ignore
            const __VLS_75 = __VLS_asFunctionalComponent1(__VLS_74, new __VLS_74({
                density: "compact",
                ...{ class: "report-table mb-4" },
            }));
            const __VLS_76 = __VLS_75({
                density: "compact",
                ...{ class: "report-table mb-4" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_75));
            /** @type {__VLS_StyleScopedClasses['report-table']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            const { default: __VLS_79 } = __VLS_77.slots;
            __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
            for (const [detail] of __VLS_vFor((group.detalles))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                    key: (detail.id),
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
                (detail.parametro_label || detail.parametro);
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
                (detail.resultado_numerico ?? detail.resultado_texto ?? "N/D");
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
                (detail.unidad || "-");
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
                (detail.linea_base_resuelta ?? detail.linea_base ?? "N/D");
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
                (detail.delta_valor ?? detail.tendencia ?? "N/D");
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
                let __VLS_80;
                /** @ts-ignore @type {typeof __VLS_components.vChip | typeof __VLS_components.VChip | typeof __VLS_components.vChip | typeof __VLS_components.VChip} */
                vChip;
                // @ts-ignore
                const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
                    size: "x-small",
                    color: (__VLS_ctx.conditionColor(detail.nivel_alerta)),
                    variant: "tonal",
                }));
                const __VLS_82 = __VLS_81({
                    size: "x-small",
                    color: (__VLS_ctx.conditionColor(detail.nivel_alerta)),
                    variant: "tonal",
                }, ...__VLS_functionalComponentArgsRest(__VLS_81));
                const { default: __VLS_85 } = __VLS_83.slots;
                (detail.nivel_alerta || "N/D");
                // @ts-ignore
                [dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, dashboard, conditionColor, conditionColor,];
                var __VLS_83;
                // @ts-ignore
                [];
            }
            // @ts-ignore
            [];
            var __VLS_77;
            // @ts-ignore
            [];
        }
    }
    // @ts-ignore
    [];
    var __VLS_66;
    let __VLS_86;
    /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
    vCard;
    // @ts-ignore
    const __VLS_87 = __VLS_asFunctionalComponent1(__VLS_86, new __VLS_86({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }));
    const __VLS_88 = __VLS_87({
        rounded: "xl",
        ...{ class: "pa-4 enterprise-surface" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_87));
    /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
    const { default: __VLS_91 } = __VLS_89.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-subtitle-1 font-weight-bold mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-grid-inner" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-grid-inner']} */ ;
    const __VLS_92 = LubricantComparisonChart;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent1(__VLS_92, new __VLS_92({
        title: "Desgaste del equipo",
        subtitle: "Comparativa de todas las líneas de desgaste del equipo",
        metrics: (__VLS_ctx.comparisonCharts.desgaste),
    }));
    const __VLS_94 = __VLS_93({
        title: "Desgaste del equipo",
        subtitle: "Comparativa de todas las líneas de desgaste del equipo",
        metrics: (__VLS_ctx.comparisonCharts.desgaste),
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    const __VLS_97 = LubricantComparisonChart;
    // @ts-ignore
    const __VLS_98 = __VLS_asFunctionalComponent1(__VLS_97, new __VLS_97({
        title: "Contaminación del lubricante",
        subtitle: "Comparativa parabólica de contaminantes y elementos de ingreso",
        metrics: (__VLS_ctx.comparisonCharts.contaminacion),
        curveMode: "smooth",
    }));
    const __VLS_99 = __VLS_98({
        title: "Contaminación del lubricante",
        subtitle: "Comparativa parabólica de contaminantes y elementos de ingreso",
        metrics: (__VLS_ctx.comparisonCharts.contaminacion),
        curveMode: "smooth",
    }, ...__VLS_functionalComponentArgsRest(__VLS_98));
    const __VLS_102 = LubricantComparisonChart;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({
        title: "Estado del lubricante",
        subtitle: "Comparativa de viscosidad, TBN y variables de condición",
        metrics: (__VLS_ctx.comparisonCharts.estado),
    }));
    const __VLS_104 = __VLS_103({
        title: "Estado del lubricante",
        subtitle: "Comparativa de viscosidad, TBN y variables de condición",
        metrics: (__VLS_ctx.comparisonCharts.estado),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    // @ts-ignore
    [comparisonCharts, comparisonCharts, comparisonCharts,];
    var __VLS_89;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "charts-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['charts-grid']} */ ;
    for (const [section] of __VLS_vFor((__VLS_ctx.dashboard.chart_sections ?? []))) {
        let __VLS_107;
        /** @ts-ignore @type {typeof __VLS_components.vCard | typeof __VLS_components.VCard | typeof __VLS_components.vCard | typeof __VLS_components.VCard} */
        vCard;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
            key: (section.key),
            rounded: "xl",
            ...{ class: "pa-4 enterprise-surface" },
        }));
        const __VLS_109 = __VLS_108({
            key: (section.key),
            rounded: "xl",
            ...{ class: "pa-4 enterprise-surface" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        /** @type {__VLS_StyleScopedClasses['pa-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['enterprise-surface']} */ ;
        const { default: __VLS_112 } = __VLS_110.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-subtitle-1 font-weight-bold mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-subtitle-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        (section.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chart-grid-inner" },
        });
        /** @type {__VLS_StyleScopedClasses['chart-grid-inner']} */ ;
        for (const [metric] of __VLS_vFor((section.metrics))) {
            const __VLS_113 = LubricantTrendChart;
            // @ts-ignore
            const __VLS_114 = __VLS_asFunctionalComponent1(__VLS_113, new __VLS_113({
                key: (metric.key),
                title: (metric.label),
                subtitle: (metric.group_label),
                unit: (metric.unit),
                points: (metric.points),
            }));
            const __VLS_115 = __VLS_114({
                key: (metric.key),
                title: (metric.label),
                subtitle: (metric.group_label),
                unit: (metric.unit),
                points: (metric.points),
            }, ...__VLS_functionalComponentArgsRest(__VLS_114));
            // @ts-ignore
            [dashboard,];
        }
        if (!section.metrics?.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dashboard-state dashboard-state--compact" },
            });
            /** @type {__VLS_StyleScopedClasses['dashboard-state']} */ ;
            /** @type {__VLS_StyleScopedClasses['dashboard-state--compact']} */ ;
        }
        // @ts-ignore
        [];
        var __VLS_110;
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

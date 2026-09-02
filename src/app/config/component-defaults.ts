/**
 * Estándar de componentes de KPI Justice.
 *
 * Fuente: design-system/kpi-justice/MASTER.md — Minimalism & Swiss Style,
 * dials Variance 3 / Motion 3 / Density 8.
 *
 * Este es el punto único donde se decide cómo se ve cada componente de la
 * plataforma. Vuetify aplica estos valores a **todas** las pantallas que usen
 * el componente, así que un cambio aquí se propaga solo: no hay que tocar cada
 * vista ni existe riesgo de que dos módulos diverjan.
 *
 * Criterio para elegir los valores: se codifica la práctica que ya era
 * mayoritaria en el repo (447 `variant="outlined"` en inputs, 436 `tonal` en
 * botones y chips, 139 `rounded="xl"` en tarjetas). Así el estándar unifica sin
 * cambiar de golpe el aspecto de pantallas que ya estaban bien, y las props
 * repetidas en cada vista pasan a ser redundantes y se pueden ir quitando.
 *
 * Lo que una vista escriba explícitamente sigue ganando sobre estos valores.
 *
 * Deliberadamente NO se fija `variant` en VBtn: el repo usa `tonal`, `text` y
 * `elevated` con intención semántica distinta (acción principal, secundaria y
 * de barra). Imponer una sola variante cambiaría el peso visual de cientos de
 * botones sin que nadie lo haya pedido.
 */
export const componentDefaults = {
  // --- Formularios -----------------------------------------------------------
  // Un solo lenguaje para todo lo que el usuario rellena o selecciona.
  // `hideDetails: "auto"` reserva el hueco del mensaje solo cuando hay error,
  // lo que evita el salto de layout al validar.
  VTextField: { variant: "outlined", density: "comfortable", hideDetails: "auto" },
  VTextarea: { variant: "outlined", density: "comfortable", hideDetails: "auto" },
  VSelect: {
    variant: "outlined",
    density: "comfortable",
    hideDetails: "auto",
    menuProps: { rounded: "lg" },
  },
  VAutocomplete: {
    variant: "outlined",
    density: "comfortable",
    hideDetails: "auto",
    menuProps: { rounded: "lg" },
  },
  VCombobox: {
    variant: "outlined",
    density: "comfortable",
    hideDetails: "auto",
    menuProps: { rounded: "lg" },
  },
  VFileInput: { variant: "outlined", density: "comfortable", hideDetails: "auto" },
  VCheckbox: { density: "comfortable", hideDetails: "auto", color: "primary" },
  VSwitch: { density: "comfortable", hideDetails: "auto", color: "primary" },
  VRadioGroup: { density: "comfortable", hideDetails: "auto" },

  // --- Acciones --------------------------------------------------------------
  VBtn: { rounded: "lg" },

  // --- Superficies -----------------------------------------------------------
  VCard: { rounded: "xl" },
  VDialog: { scrollable: true },
  VMenu: { rounded: "lg" },
  VTooltip: { location: "top" },

  // --- Señalización ----------------------------------------------------------
  // `label` da al chip la forma rectangular redondeada del estilo Swiss, en vez
  // de la píldora por defecto.
  VChip: { variant: "tonal", label: true },
  VAlert: { variant: "tonal", rounded: "lg", border: "start" },

  // --- Datos -----------------------------------------------------------------
  // Density 8/10: las tablas son el grueso de esta plataforma y deben caber.
  VDataTable: { density: "compact", hover: true },
  VDataTableServer: { density: "compact", hover: true },
  VSkeletonLoader: { boilerplate: false },
  VProgressLinear: { color: "primary", height: 4, rounded: true },
} as const;

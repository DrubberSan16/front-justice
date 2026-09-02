# KPI Justice — puente de diseño

Cómo se traduce el design system a código en esta plataforma. `MASTER.md` manda
sobre la identidad; este archivo dice **con qué se implementa**.

| | |
|---|---|
| **Giro** | KPIs operativos del sector justicia: inventario, mantenimiento, seguridad, notificaciones |
| **Categoría (ui-ux-pro-max)** | Analytics Dashboard |
| **Estilo** | Minimalism & Swiss Style |
| **Dials** | Variance 3 · Motion 3 · Density 8 |
| **Stack** | Vue 3 · TypeScript · Vite · Vuetify 3 · motion-v |

## Identidad — y qué manda sobre qué

La paleta viva de la app **no** es la del `MASTER.md`. Ya existe una identidad
implantada y coherente:

- Temas Vuetify en [`src/app/config/theme.ts`](../../src/app/config/theme.ts)
  (claro y oscuro).
- Variables CSS de superficie en [`src/style.css`](../../src/style.css):
  `--surface-base`, `--surface-border`, `--chart-*`, con acentos acero
  (`#1f4b7a`) sobre tinta `#102033`.

La paleta azul/ámbar del `MASTER.md` queda como **referencia de contraste y de
jerarquía**, no como algo que haya que sustituir. Lo que sí se adopta:

- Densidad 8/10: padding compacto, tablas y tarjetas de KPI.
- Estilo Swiss: rejilla, jerarquía tipográfica clara, cero ornamento.
- La lista de anti-patrones y el checklist previo a entrega.

Contexto institucional: el listón de sobriedad es más alto que en el resto del
fleet. Ante la duda, menos.

## Capa de movimiento

Dos herramientas que conviven, cada una para lo suyo:

**`motion-v`** — componentes declarativos de Vue. Ya en uso en
[`AuthLayout.vue`](../../src/layouts/AuthLayout.vue) y `MenusView.vue`. Sigue
siendo la opción para transiciones con estado (paneles, entradas orquestadas).

**[`src/app/motion/`](../../src/app/motion)** — el contrato compartido del
fleet, sobre `framer-motion/dom`. Mismo vocabulario de clases que las
plataformas React, con los valores del dial Motion 3/10.

### Directiva `v-reveal` — el modo por defecto aquí

Registrada global en [`src/main.ts`](../../src/main.ts). Es la vía natural para
el markup Vuetify que ya existe: no hay que envolver nada.

```vue
<v-card v-reveal>…</v-card>
<v-col v-reveal="0.06">…</v-col>   <!-- el valor es el delay en segundos -->
```

### `EnterprisePageMotion` — entrada de página

[`src/components/ui/EnterprisePageMotion.vue`](../../src/components/ui/EnterprisePageMotion.vue)
envuelve el `<main>` de una vista y le da la entrada estándar. Ya existía en el
repo; ahora lee sus valores de `@/app/motion/tokens.ts` en vez de tenerlos
hardcodeados. Estaba sin usar — es el envoltorio recomendado para las vistas de
`src/views/`.

### Composable — para una vista entera

```vue
<script setup lang="ts">
import { useRevealMotion } from "@/app/motion";
const root = useRevealMotion(() => rows.value.length);
</script>

<template>
  <div ref="root">
    <header class="js-hero-reveal">…</header>
    <div class="js-stagger">
      <v-card class="js-stagger-item">…</v-card>
    </div>
  </div>
</template>
```

El argumento opcional re-engancha el motor cuando cambian los datos (filtro,
página, carga). Duraciones centralizadas en
[`src/app/motion/tokens.ts`](../../src/app/motion/tokens.ts).

Con `prefers-reduced-motion: reduce` no se anima nada y el estado final queda
visible; `style.css` ahora incluye además el bloque global que faltaba.

## Catálogo 21st.dev para este giro

Base de patrones: <https://21st.dev/community/components/popular>.

⚠️ Los componentes de 21st.dev son **React + Tailwind + shadcn**. Aquí **no se
copian**: se traducen. Procedimiento completo con ejemplo trabajado en
`~/.claude/REACT-TO-VUE.md`. Lo mínimo para este repo:

| En el original React | Aquí |
|---|---|
| `<Button>` `<Card>` `<Dialog>` `<DropdownMenu>` | `v-btn` `v-card` `v-dialog` `v-menu` |
| `<Table>` `<Skeleton>` `<Progress>` `<Badge>` | `VDataTable` `v-skeleton-loader` `v-progress-linear` `v-chip` |
| `lucide-react` | `@mdi/js` + `<v-icon>` |
| clases Tailwind | Vuetify + variables de `style.css` — **no hay Tailwind aquí** |
| `useState` / `useEffect` / `useMemo` | `ref` / `onMounted` / `computed` |
| duraciones y distancias del autor | `MOTION.*` de `@/app/motion` |

Y las dos trampas de `motion-v` que fallan **en silencio**:

- `viewport={{…}}` de React se llama **`:in-view-options`** aquí. Copiado tal
  cual, la prop se ignora y el elemento nunca revela.
- `useReducedMotion()` devuelve un **`Ref`**, no un booleano. En el `<script>`
  hay que usar `.value`; leerlo directo es siempre `true`. Envolver las props de
  animación en `computed`, como ya hace `AuthLayout.vue`.

Regla práctica: si el componente solo hace fade-in al scroll o elevación en
hover, **tira su código de animación** y usa `v-reveal` / `js-hover-card`. Solo
merece `<motion.div>` cuando hay estado real (`exit`, variants orquestadas,
`layoutId`, drag).

| Necesidad | Patrón 21st.dev | Equivalente aquí |
|---|---|---|
| Navegación de módulos | *Stacking Navbar* · *Dropdown Menu* | `v-navigation-drawer` + `v-menu` |
| Estado de OT / alertas | *Progress Indicator* | `v-progress-linear` + etiqueta de texto |
| Carga de listados | *Animated Loader* / skeletons | `v-skeleton-loader` |
| Tablas de operación | *Data table* | `VDataTable` con alto reservado |
| Tarjetas de KPI | Bento cards | `v-card` + `js-stagger-item` |

**Evitar en este giro**: cualquier componente decorativo del catálogo —
*Smoke Effect*, *Magnetize Button*, *Text Rewind*, *Glitch*, *Canvas*. En una
plataforma institucional de operación leen como ruido y contradicen el estilo
Swiss. Iconos: MDI, que ya es el set del proyecto. Nunca emojis.

## Antes de entregar

La lista completa está al final del `MASTER.md`. Los que más se escapan aquí:
estado nunca solo por color (añadir icono o texto), foco visible por teclado en
las tablas densas, y objetivos táctiles de 44×44 en las acciones de fila.

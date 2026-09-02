<template>
  <EnterprisePageMotion :ref="setMotionRoot" class="admin-dashboard-page">
    <v-alert v-if="!canRead" type="warning" variant="tonal">
      No tienes permisos para visualizar este módulo.
    </v-alert>

    <div v-else class="admin-dashboard-content">
      <v-card rounded="xl" class="admin-hero enterprise-surface">
        <div class="admin-hero__copy">
          <div class="admin-hero__eyebrow">Dashboard Administración</div>
          <h1 class="admin-hero__title">KPI de mantenimiento</h1>
          <p class="admin-hero__lead">
            Disponibilidad, confiabilidad, consumos y proyección de mantenimientos por equipo.
          </p>
        </div>

        <div class="admin-hero__filters">
          <v-text-field v-model="desde" label="Desde" type="date" class="admin-hero__field" />
          <v-text-field v-model="hasta" label="Hasta" type="date" class="admin-hero__field" />
          <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="load">
            Actualizar
          </v-btn>
        </div>
      </v-card>

      <v-alert v-if="error" type="error" variant="tonal" :text="error" />

      <!-- Cabecera de indicadores ------------------------------------------->
      <v-row dense class="js-stagger">
        <v-col v-for="card in resumenCards" :key="card.key" cols="12" sm="6" xl="3">
          <v-card
            rounded="xl"
            class="kpi-tile h-100 js-stagger-item js-hover-card"
            :style="{ '--kpi-accent': card.accent }"
          >
            <div class="kpi-tile__icon"><v-icon :icon="card.icon" size="20" /></div>
            <div class="kpi-tile__value">{{ card.value }}</div>
            <div class="kpi-tile__label">{{ card.label }}</div>
            <div class="kpi-tile__helper">{{ card.helper }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-skeleton-loader v-if="loading" type="table" class="mt-2" />

      <template v-else>
        <!-- 1. Disponibilidad ---------------------------------------------->
        <SectionCard
          icon="mdi-gauge"
          title="1 · Disponibilidad por equipo"
          subtitle="Horas disponibles, fuera de servicio y porcentaje sobre el período."
        >
          <v-data-table
            :headers="headersDisponibilidad"
            :items="data.disponibilidad"
            :items-per-page="10"
            class="enterprise-table"
          >
            <template #item.porcentaje_disponibilidad="{ item }">
              <StatusChip
                v-if="row(item).porcentaje_disponibilidad != null"
                :nivel="disponibilidadNivel(row(item).porcentaje_disponibilidad)"
                :texto="`${row(item).porcentaje_disponibilidad}%`"
              />
              <span v-else class="text-medium-emphasis">Sin registro</span>
            </template>
          </v-data-table>
        </SectionCard>

        <!-- 2. Correctivos y reincidencia ---------------------------------->
        <SectionCard
          icon="mdi-wrench-clock"
          title="2 · Correctivos y reincidencia de fallas"
          subtitle="Intervenciones por equipo y fallas repetidas sobre el mismo compartimiento."
        >
          <div class="split-grid">
            <div>
              <h3 class="split-grid__title">Correctivos por equipo</h3>
              <v-data-table
                :headers="headersCorrectivos"
                :items="data.correctivos.por_equipo"
                :items-per-page="5"
                class="enterprise-table"
              />
            </div>
            <div>
              <h3 class="split-grid__title">Fallas repetitivas</h3>
              <v-data-table
                :headers="headersReincidencia"
                :items="data.correctivos.reincidencias"
                :items-per-page="5"
                class="enterprise-table"
                no-data-text="Sin fallas repetidas en el período"
              >
                <template #item.veces="{ item }">
                  <StatusChip nivel="ROJO" :texto="`${row(item).veces} veces`" />
                </template>
              </v-data-table>
            </div>
          </div>
        </SectionCard>

        <!-- 3. Cebado y aceite --------------------------------------------->
        <SectionCard
          icon="mdi-oil"
          title="3 · Control de cebado y consumo de aceite"
          subtitle="Galones por máquina con semaforización, acumulado semanal y mensual, y tendencia."
        >
          <div class="legend">
            <span><i class="legend__dot legend__dot--verde" /> 0 a 5 gal · normal</span>
            <span><i class="legend__dot legend__dot--amarillo" /> &gt;5 y &lt;10 gal · seguimiento</span>
            <span><i class="legend__dot legend__dot--rojo" /> 10 gal o más · consumo anormal</span>
          </div>
          <v-data-table
            :headers="headersCebado"
            :items="data.cebado"
            :items-per-page="10"
            class="enterprise-table"
            no-data-text="Sin consumo de aceite registrado en cebado"
          >
            <template #item.semaforo="{ item }">
              <StatusChip :nivel="row(item).semaforo.nivel" :texto="row(item).semaforo.etiqueta" />
            </template>
            <template #item.tendencia="{ item }">
              <span class="trend" :class="`trend--${row(item).tendencia.toLowerCase()}`">
                <v-icon :icon="trendIcon(row(item).tendencia)" size="16" />
                {{ trendLabel(row(item).tendencia) }}
              </span>
            </template>
          </v-data-table>
        </SectionCard>

        <!-- 4. Repuestos ---------------------------------------------------->
        <SectionCard
          icon="mdi-cog-outline"
          title="4 · Consumo de repuestos"
          subtitle="Cantidad y costo por equipo en el período, con las OT implicadas."
        >
          <v-data-table
            :headers="headersRepuestos"
            :items="data.repuestos"
            :items-per-page="10"
            class="enterprise-table"
          >
            <template #item.costo="{ item }">{{ money(row(item).costo) }}</template>
          </v-data-table>
        </SectionCard>

        <!-- 5, 6 y 7. Frecuencia, alertas anticipadas y proyección ---------->
        <SectionCard
          icon="mdi-calendar-clock"
          title="5-7 · Frecuencia por horómetro y proyección"
          subtitle="Objetivo del próximo mantenimiento, horas restantes y semáforo con los márgenes de cada equipo."
        >
          <v-data-table
            :headers="headersProyeccion"
            :items="proyeccionAplicable"
            :items-per-page="15"
            class="enterprise-table"
          >
            <template #item.semaforo="{ item }">
              <StatusChip :nivel="row(item).semaforo.nivel" :texto="row(item).semaforo.etiqueta" />
            </template>
            <template #item.horas_restantes="{ item }">
              <span :class="row(item).horas_restantes < 0 ? 'text-error font-weight-bold' : ''">
                {{ row(item).horas_restantes < 0
                  ? `${Math.abs(row(item).horas_restantes)} h excedidas`
                  : `${row(item).horas_restantes} h` }}
              </span>
            </template>
          </v-data-table>
          <v-alert
            v-if="proyeccionSinFrecuencia.length"
            type="info"
            variant="tonal"
            class="mt-3"
            :text="`${proyeccionSinFrecuencia.length} equipo(s) sin frecuencia configurada quedan fuera de la proyección: ${proyeccionSinFrecuencia.map((e: any) => e.equipo_codigo).join(', ')}`"
          />
        </SectionCard>

        <!-- 8. MTBF / MTTR --------------------------------------------------->
        <SectionCard
          icon="mdi-chart-timeline-variant"
          title="8 · Confiabilidad: MTBF y MTTR"
          subtitle="Tiempo medio entre fallas y tiempo medio de reparación, sobre intervenciones correctivas."
        >
          <v-data-table
            :headers="headersConfiabilidad"
            :items="data.confiabilidad"
            :items-per-page="10"
            class="enterprise-table"
            no-data-text="Sin correctivos con hora de inicio y fin en el período"
          >
            <template #item.mtbf_horas="{ item }">
              <span v-if="row(item).mtbf_horas != null">{{ row(item).mtbf_horas }} h</span>
              <span v-else class="text-medium-emphasis">Requiere 2+ fallas</span>
            </template>
            <template #item.mttr_horas="{ item }">{{ row(item).mttr_horas }} h</template>
          </v-data-table>
        </SectionCard>
      </template>
    </div>
  </EnterprisePageMotion>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { VIcon } from "vuetify/components";
import EnterprisePageMotion from "@/components/ui/EnterprisePageMotion.vue";
import { resolveMotionElement, useRevealMotion } from "@/app/motion";
import { api } from "@/app/http/api";
import { useMenuStore } from "@/app/stores/menu.store";
import { getPermissionsForAnyComponent } from "@/app/utils/menu-permissions";

const menuStore = useMenuStore();
const canRead = computed(
  () =>
    getPermissionsForAnyComponent(menuStore.tree, [
      "Dashboard Administración",
      "Dashboard Administracion",
      "dashboard-administracion",
    ]).isReaded,
);

/**
 * Tarjeta de sección. Se declara aquí y no como archivo aparte porque solo la
 * usa esta pantalla; si otra vista la necesita, se extrae a components/ui.
 */
const SectionCard = (props: any, { slots }: any) =>
  h(
    "section",
    { class: "section-card" },
    [
      h("header", { class: "section-card__head" }, [
        h("div", { class: "section-card__icon" }, [
          // Se usa VIcon y no <i class="mdi ...">: la clase suelta no arrastra la
          // familia tipografica de Material Design Icons dentro del estilo
          // scoped y el glifo salia como caja.
          h(VIcon, { icon: props.icon, size: 20 }),
        ]),
        h("div", {}, [
          h("h2", { class: "section-card__title" }, props.title),
          h("p", { class: "section-card__subtitle" }, props.subtitle),
        ]),
      ]),
      h("div", { class: "section-card__body" }, slots.default?.()),
    ],
  );

/** Distintivo de estado: color + texto, nunca color a solas. */
const StatusChip = (props: { nivel: string; texto: string }) =>
  h(
    "span",
    { class: ["status-chip", `status-chip--${String(props.nivel).toLowerCase()}`] },
    props.texto,
  );

const hoy = new Date();
const hace30 = new Date(hoy.getTime() - 30 * 24 * 3600 * 1000);
const iso = (d: Date) => d.toISOString().slice(0, 10);

const desde = ref(iso(hace30));
const hasta = ref(iso(hoy));
const loading = ref(false);
const error = ref<string | null>(null);

const data = ref<any>({
  periodo: {},
  disponibilidad: [],
  correctivos: { por_equipo: [], reincidencias: [] },
  cebado: [],
  repuestos: [],
  proyeccion: [],
  confiabilidad: [],
  resumen: {},
});

const headersDisponibilidad = [
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Nombre", key: "equipo_nombre" },
  { title: "Horas disponibles", key: "horas_disponibles", align: "end" as const },
  { title: "Horas fuera de servicio", key: "horas_fuera_servicio", align: "end" as const },
  { title: "Disponibilidad", key: "porcentaje_disponibilidad", align: "end" as const },
];
const headersCorrectivos = [
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Correctivos", key: "total_correctivos", align: "end" as const },
  { title: "Horas intervención", key: "horas_intervencion", align: "end" as const },
  { title: "Última", key: "ultima_intervencion" },
];
const headersReincidencia = [
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Compartimiento", key: "componente" },
  { title: "Repeticiones", key: "veces", align: "end" as const },
  { title: "Última vez", key: "ultima_vez" },
];
const headersCebado = [
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Nombre", key: "equipo_nombre" },
  { title: "Galones período", key: "galones_periodo", align: "end" as const },
  { title: "Semana", key: "galones_semana", align: "end" as const },
  { title: "Mes", key: "galones_mes", align: "end" as const },
  { title: "Tendencia", key: "tendencia" },
  { title: "Estado", key: "semaforo" },
];
const headersRepuestos = [
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Nombre", key: "equipo_nombre" },
  { title: "OT", key: "ots", align: "end" as const },
  { title: "Cantidad", key: "cantidad", align: "end" as const },
  { title: "Costo", key: "costo", align: "end" as const },
];
const headersProyeccion = [
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Marca", key: "marca" },
  { title: "Horómetro actual", key: "horometro_actual", align: "end" as const },
  { title: "Último mant.", key: "horometro_ultimo_mantenimiento", align: "end" as const },
  { title: "Frecuencia", key: "frecuencia", align: "end" as const },
  { title: "Próximo objetivo", key: "horometro_proximo_mantenimiento", align: "end" as const },
  { title: "Restantes", key: "horas_restantes", align: "end" as const },
  { title: "Estado", key: "semaforo" },
];
const headersConfiabilidad = [
  { title: "Equipo", key: "equipo_codigo" },
  { title: "Nombre", key: "equipo_nombre" },
  { title: "Intervenciones", key: "intervenciones", align: "end" as const },
  { title: "MTBF", key: "mtbf_horas", align: "end" as const },
  { title: "MTTR", key: "mttr_horas", align: "end" as const },
];

const proyeccionAplicable = computed(() =>
  (data.value.proyeccion ?? []).filter((row: any) => row.aplica),
);
const proyeccionSinFrecuencia = computed(() =>
  (data.value.proyeccion ?? []).filter((row: any) => !row.aplica),
);

const resumenCards = computed(() => {
  const r = data.value.resumen ?? {};
  return [
    {
      key: "disponibilidad",
      label: "Disponibilidad media",
      value: r.disponibilidad_media != null ? `${r.disponibilidad_media}%` : "—",
      helper: `${r.equipos_evaluados ?? 0} equipos evaluados`,
      icon: "mdi-gauge",
      accent: "var(--kpi-blue)",
    },
    {
      key: "correctivos",
      label: "Correctivos",
      value: r.total_correctivos ?? 0,
      helper: `${r.equipos_con_reincidencia ?? 0} con falla repetida`,
      icon: "mdi-wrench-clock",
      accent: "var(--kpi-orange)",
    },
    {
      key: "cebado",
      label: "Galones de cebado",
      value: r.galones_cebado ?? 0,
      helper: `${r.equipos_cebado_rojo ?? 0} en consumo anormal`,
      icon: "mdi-oil",
      accent: "var(--kpi-purple)",
    },
    {
      key: "mantenimientos",
      label: "Mantenimientos vencidos",
      value: r.mantenimientos_vencidos ?? 0,
      helper: `${r.mantenimientos_proximos ?? 0} próximos`,
      icon: "mdi-calendar-alert",
      accent: "var(--kpi-red)",
    },
  ];
});

/**
 * Los slots de VDataTable tipan `item` como `unknown`. Este helper centraliza la
 * conversion en un solo punto, en vez de repetir asserts por cada plantilla.
 */
function row(item: unknown): any {
  return item as any;
}

function disponibilidadNivel(pct: number) {
  if (pct >= 85) return "VERDE";
  if (pct >= 60) return "AMARILLO";
  return "ROJO";
}
function trendIcon(t: string) {
  if (t === "AL_ALZA") return "mdi-trending-up";
  if (t === "A_LA_BAJA") return "mdi-trending-down";
  return "mdi-trending-neutral";
}
function trendLabel(t: string) {
  if (t === "AL_ALZA") return "Al alza";
  if (t === "A_LA_BAJA") return "A la baja";
  return "Estable";
}
function money(value: unknown) {
  const n = Number(value ?? 0);
  return n.toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

async function load() {
  if (!canRead.value) return;
  loading.value = true;
  error.value = null;
  try {
    const { data: payload } = await api.get(
      "/kpi_maintenance/dashboard-administracion",
      { params: { desde: desde.value, hasta: hasta.value } },
    );
    data.value = payload?.data ?? payload;
  } catch (e: any) {
    // Se conserva el detalle del backend cuando existe; si el fallo no es HTTP
    // se deja rastro en consola para poder diagnosticarlo.
    error.value =
      e?.response?.data?.message || "No se pudo cargar el dashboard de administración.";
    if (!e?.response) console.error("[DashboardAdministracion]", e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const motionRoot = useRevealMotion<HTMLElement>();
function setMotionRoot(el: unknown) {
  motionRoot.value = resolveMotionElement(el);
}
</script>

<style scoped>
/* Escala de densidad 8/10 del MASTER.md. */
.admin-dashboard-page {
  --space-lg: 12px;
  --space-xl: 16px;
  --space-2xl: 24px;
  --kpi-blue: 47, 108, 171;
  --kpi-orange: 225, 122, 0;
  --kpi-purple: 132, 81, 201;
  --kpi-red: 198, 40, 40;
  width: 100%;
  min-width: 0;
}

.admin-dashboard-content {
  display: grid;
  gap: var(--space-xl);
}

/* Estilo Swiss: superficie plana y una regla de acento como único adorno. */
.admin-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-xl);
  padding: var(--space-2xl);
  border-top: 3px solid rgb(var(--v-theme-primary));
  background: var(--surface-base);
}

.admin-hero__eyebrow {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.admin-hero__title {
  margin: 6px 0 4px;
  font-size: 1.6rem;
  line-height: 1.2;
}

.admin-hero__lead {
  margin: 0;
  max-width: 60ch;
  color: var(--app-muted-text);
  font-size: 0.92rem;
}

.admin-hero__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-lg);
}

.admin-hero__field {
  min-width: 160px;
  max-width: 190px;
}

.kpi-tile {
  padding: var(--space-xl);
  border: 1px solid var(--surface-border);
  border-left: 3px solid rgb(var(--kpi-accent));
  background: var(--surface-base);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.kpi-tile:hover {
  border-color: rgba(var(--kpi-accent), 0.5);
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.kpi-tile__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(var(--kpi-accent), 0.22);
  border-radius: 10px;
  color: rgb(var(--kpi-accent));
  background: rgba(var(--kpi-accent), 0.08);
}

.kpi-tile__value {
  margin-top: var(--space-lg);
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.1;
}

.kpi-tile__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.kpi-tile__helper {
  color: var(--app-muted-text);
  font-size: 0.78rem;
}

.section-card {
  padding: var(--space-2xl);
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-base);
}

.section-card__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.section-card__icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 10px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.09);
  font-size: 20px;
}

.section-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.section-card__subtitle {
  margin: 2px 0 0;
  color: var(--app-muted-text);
  font-size: 0.83rem;
}

.split-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: var(--space-xl);
}

.split-grid__title {
  margin: 0 0 var(--space-md, 8px);
  font-size: 0.86rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--app-muted-text);
}

/* El estado nunca se comunica solo con color: siempre lleva texto. */
.status-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-chip--verde {
  color: rgb(15, 143, 114);
  background: rgba(15, 143, 114, 0.14);
}

.status-chip--amarillo {
  color: rgb(176, 98, 0);
  background: rgba(225, 122, 0, 0.16);
}

.status-chip--rojo {
  color: rgb(198, 40, 40);
  background: rgba(198, 40, 40, 0.14);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xl);
  margin-bottom: var(--space-lg);
  color: var(--app-muted-text);
  font-size: 0.8rem;
}

.legend__dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 6px;
  border-radius: 50%;
}

.legend__dot--verde { background: rgb(15, 143, 114); }
.legend__dot--amarillo { background: rgb(225, 122, 0); }
.legend__dot--rojo { background: rgb(198, 40, 40); }

.trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.trend--al_alza { color: rgb(198, 40, 40); }
.trend--a_la_baja { color: rgb(15, 143, 114); }
.trend--estable { color: var(--app-muted-text); }

@media (max-width: 860px) {
  .admin-hero {
    align-items: stretch;
  }

  .admin-hero__field {
    max-width: none;
    flex: 1 1 140px;
  }
}
</style>

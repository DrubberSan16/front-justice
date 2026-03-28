<template>
  <div class="dashboard-panel">
    <v-alert v-if="error" type="warning" variant="tonal" :text="error" />

    <div v-else-if="loading" class="dashboard-state">
      <v-progress-circular indeterminate color="primary" />
      <span>Cargando dashboard de lubricante...</span>
    </div>

    <div v-else-if="!dashboard?.selected" class="dashboard-state">
      <v-icon icon="mdi-oil" size="28" />
      <span>Selecciona un lubricante para ver su historial, tendencias y reporte.</span>
    </div>

    <div v-else class="dashboard-grid">
      <v-card rounded="xl" class="pa-4 enterprise-surface">
        <div class="d-flex align-start justify-space-between" style="gap: 12px; flex-wrap: wrap;">
          <div>
            <div class="text-h6 font-weight-bold">{{ dashboard.selected.lubricante }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ dashboard.selected.marca_lubricante || "Marca sin registrar" }}
            </div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              {{ dashboard.selected.equipo_label || dashboard.selected.equipo_codigo || dashboard.selected.equipo_nombre || "Sin equipo" }}
              <span v-if="dashboard.selected.equipo_modelo">
                · {{ dashboard.selected.equipo_modelo }}
              </span>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ dashboard.selected.compartimentos?.join(" · ") || "Sin compartimentos" }}
            </div>
          </div>
          <div class="d-flex flex-wrap" style="gap: 8px;">
            <v-chip color="primary" variant="tonal" label>
              {{ dashboard.metrics?.analisis_filtrados ?? 0 }} analisis
            </v-chip>
            <v-chip color="warning" variant="tonal" label>
              {{ dashboard.metrics?.precauciones ?? 0 }} precauciones
            </v-chip>
            <v-chip color="error" variant="tonal" label>
              {{ dashboard.metrics?.anormales ?? 0 }} anormales
            </v-chip>
            <v-chip color="secondary" variant="tonal" label>
              {{ dashboard.metrics?.sin_dato ?? 0 }} sin dato
            </v-chip>
          </div>
        </div>

        <div class="dashboard-kpis mt-4">
          <div class="dashboard-kpi">
            <div class="text-caption text-medium-emphasis">Lubricantes registrados</div>
            <div class="text-h5 font-weight-bold">{{ dashboard.metrics?.lubricantes_registrados ?? 0 }}</div>
          </div>
          <div class="dashboard-kpi">
            <div class="text-caption text-medium-emphasis">Compartimentos monitoreados</div>
            <div class="text-h5 font-weight-bold">{{ dashboard.metrics?.compartimentos_monitoreados ?? 0 }}</div>
          </div>
          <div class="dashboard-kpi">
            <div class="text-caption text-medium-emphasis">Periodo</div>
            <div class="text-body-1 font-weight-medium">
              {{ dashboard.filters?.periodo || "GLOBAL" }}
            </div>
          </div>
          <div class="dashboard-kpi">
            <div class="text-caption text-medium-emphasis">Rango</div>
            <div class="text-body-1 font-weight-medium">
              {{ dashboard.filters?.from || "Inicio" }} / {{ dashboard.filters?.to || "Actual" }}
            </div>
          </div>
        </div>
      </v-card>

      <v-card rounded="xl" class="pa-4 enterprise-surface">
        <div class="text-subtitle-1 font-weight-bold mb-3">Historial de muestras</div>
        <v-table density="compact" class="report-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Muestra</th>
              <th>Fecha informe</th>
              <th>Equipo</th>
              <th>Modelo</th>
              <th>Compartimento</th>
              <th>Condicion</th>
              <th>Equipo Hrs/Km</th>
              <th>Aceite Hrs/Km</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in dashboard.timeline ?? []" :key="item.id">
              <td>{{ item.codigo }}</td>
              <td>{{ item.numero_muestra || "Sin muestra" }}</td>
              <td>{{ item.fecha_reporte || item.fecha_muestra || "Sin fecha" }}</td>
              <td>{{ item.equipo_nombre || item.equipo_codigo || "Sin equipo" }}</td>
              <td>{{ item.equipo_modelo || "Sin modelo" }}</td>
              <td>{{ item.compartimento_principal || "Sin compartimento" }}</td>
              <td>
                <v-chip size="x-small" :color="conditionColor(item.condicion)" variant="tonal">
                  {{ item.condicion || "N/D" }}
                </v-chip>
              </td>
              <td>{{ item.horas_equipo ?? "N/A" }}</td>
              <td>{{ item.horas_lubricante ?? "N/A" }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card rounded="xl" class="pa-4 enterprise-surface">
        <div class="text-subtitle-1 font-weight-bold mb-3">Ultimo reporte tipo excel</div>
        <div v-if="dashboard.latest_analysis" class="report-layout">
          <div class="report-header-grid">
            <div>
              <div class="text-caption text-medium-emphasis">Cliente</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.cliente || "Sin cliente" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Compartimento</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.compartimento_principal || "Sin compartimento" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Equipo</div>
              <div class="font-weight-medium">
                {{ dashboard.latest_analysis.equipo_nombre || dashboard.latest_analysis.equipo_codigo || "Sin equipo" }}
              </div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Marca</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.equipo_marca || "Sin marca" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Serie</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.equipo_serie || "Sin serie" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Modelo</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.equipo_modelo || "Sin modelo" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Lubricante</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.lubricante || "Sin lubricante" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Marca del lubricante</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.marca_lubricante || "Sin marca" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Numero de muestra</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.numero_muestra || "Sin numero" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Fecha de muestreo</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.fecha_muestra || "Sin fecha" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Fecha de ingreso</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.fecha_ingreso || "Sin fecha" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Fecha de informe</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.fecha_informe || dashboard.latest_analysis.fecha_reporte || "Sin fecha" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Equipo Hrs/Km</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.horas_equipo ?? "N/A" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Aceite Hrs/Km</div>
              <div class="font-weight-medium">{{ dashboard.latest_analysis.sample_info?.horas_lubricante ?? "N/A" }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Condicion</div>
              <div class="font-weight-medium">
                {{ dashboard.latest_analysis.sample_info?.condicion || dashboard.latest_analysis.estado_diagnostico || "N/D" }}
              </div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Evaluacion</div>
              <div class="font-weight-medium">
                {{ dashboard.latest_analysis.evaluacion_ultima_muestra || dashboard.latest_analysis.diagnostico || "Sin evaluacion" }}
              </div>
            </div>
          </div>

          <v-alert
            class="mt-4"
            :color="conditionColor(dashboard.latest_analysis.estado_diagnostico)"
            variant="tonal"
            :text="dashboard.latest_analysis.diagnostico || 'Sin evaluacion para la ultima muestra.'"
          />

          <div class="mt-4" v-for="group in dashboard.detail_groups ?? []" :key="group.key">
            <div class="text-subtitle-2 font-weight-bold mb-2">{{ group.label }}</div>
            <v-table density="compact" class="report-table mb-4">
              <thead>
                <tr>
                  <th>Parametro</th>
                  <th>Resultado</th>
                  <th>Unidad</th>
                  <th>Linea base</th>
                  <th>Tendencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="detail in group.detalles" :key="detail.id">
                  <td>{{ detail.parametro_label || detail.parametro }}</td>
                  <td>{{ detail.resultado_numerico ?? detail.resultado_texto ?? "N/D" }}</td>
                  <td>{{ detail.unidad || "-" }}</td>
                  <td>{{ detail.linea_base_resuelta ?? detail.linea_base ?? "N/D" }}</td>
                  <td>{{ detail.delta_valor ?? detail.tendencia ?? "N/D" }}</td>
                  <td>
                    <v-chip size="x-small" :color="conditionColor(detail.nivel_alerta)" variant="tonal">
                      {{ detail.nivel_alerta || "N/D" }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>
      </v-card>

      <div class="charts-grid">
        <v-card
          v-for="section in dashboard.chart_sections ?? []"
          :key="section.key"
          rounded="xl"
          class="pa-4 enterprise-surface"
        >
          <div class="text-subtitle-1 font-weight-bold mb-3">{{ section.title }}</div>
          <div class="chart-grid-inner">
            <LubricantTrendChart
              v-for="metric in section.metrics"
              :key="metric.key"
              :title="metric.label"
              :subtitle="metric.group_label"
              :unit="metric.unit"
              :points="metric.points"
            />
            <div v-if="!section.metrics?.length" class="dashboard-state dashboard-state--compact">
              Sin metricas para este bloque.
            </div>
          </div>
        </v-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LubricantTrendChart from "@/components/maintenance/LubricantTrendChart.vue";

defineProps<{
  dashboard: Record<string, any> | null;
  loading?: boolean;
  error?: string | null;
}>();

function conditionColor(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ANORMAL") return "error";
  if (raw === "PRECAUCION") return "warning";
  if (raw === "N/D" || raw === "ND") return "secondary";
  return "success";
}
</script>

<style scoped>
.dashboard-panel {
  display: grid;
  gap: 20px;
}

.dashboard-grid {
  display: grid;
  gap: 20px;
}

.dashboard-state {
  min-height: 220px;
  border-radius: 24px;
  border: 1px dashed var(--surface-border);
  background: rgba(31, 75, 122, 0.05);
  display: grid;
  place-items: center;
  text-align: center;
  gap: 12px;
  padding: 24px;
  color: rgba(26, 34, 43, 0.72);
}

.dashboard-state--compact {
  min-height: 160px;
}

.dashboard-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.dashboard-kpi {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: rgba(255, 255, 255, 0.45);
}

.report-table {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  overflow: hidden;
}

.report-layout {
  display: grid;
  gap: 16px;
}

.report-header-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.charts-grid {
  display: grid;
  gap: 20px;
}

.chart-grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
</style>
